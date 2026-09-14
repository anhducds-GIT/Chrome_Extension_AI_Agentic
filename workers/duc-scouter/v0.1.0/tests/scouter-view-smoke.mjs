/* scouter-view-smoke.mjs — `T25` (`scout.view`) và `T27` (chụp toàn cảnh).
 *
 * Hai thứ này ghim chung một file vì chúng cùng đứng trên MỘT câu hỏi: *Scouter đang nhìn phần
 * nào của trang?* — và cùng một lượt gọi CDP (`Page.getLayoutMetrics`).
 *
 * ══ CHỖ ĐÁNG GHIM NHẤT, VÀ NÓ KHÔNG PHẢI "ĐỌC ĐÚNG SỐ" ══
 *
 * ⑴ **Đơn vị.** `Page.getLayoutMetrics` trả về HAI bộ số: `layoutViewport` (điểm ảnh thiết bị)
 *    và `cssLayoutViewport` (điểm ảnh CSS). Trên màn hình thường hai bộ trùng nhau, nên lấy
 *    nhầm bộ thì **mọi phép ghim vẫn xanh** và lỗi chỉ hiện trên màn hình HiDPI — nơi không ai
 *    chạy test. Đó là lý do khối ② dựng hai bộ số KHÁC NHAU: chỉ khi chúng khác nhau thì câu
 *    hỏi "lấy bộ nào" mới có câu trả lời quan sát được.
 *
 * ⑵ **`conLai`** — còn bao nhiêu để cuộn nữa. Đây là con số người gọi THẬT SỰ dùng, vì
 *    `scout.scroll` chỉ hứa *đã bắn sự kiện*. Kẹp ở 0 là bắt buộc: trang ngắn hơn khung nhìn
 *    thì phép trừ ra số âm, và một số âm ở đây đọc như "cuộn ngược lên được".
 *
 * ⑶ **Trần điểm ảnh của lượt chụp toàn cảnh.** `dom.snapshot` đã bị bỏ ngày 08/09 vì nó giết
 *    service worker trên trang lớn. `full_page` đi đúng vào vùng đó, nên cái trần phải chặn
 *    TRƯỚC khi dựng ảnh, không phải sau khi đã dựng xong rồi mới đo byte.
 */
import assert from "node:assert/strict";

const { runProbe, createReadOnlySender, ProbeError, PROBE_NAMES, READ_ONLY_CDP_METHODS, CDP_HAN_MS } =
  await import("../scripts/scouter-probes.mjs");

/* Trang giả: trả về số đo bố cục, và GHI LẠI mọi lệnh — test đọc được cả "gửi gì" lẫn "gửi mấy
 * lần". Hai bộ số cố ý LỆCH NHAU (css = một nửa thiết bị) để phân biệt được lấy nhầm bộ. */
function trangGia(tuyChon = {}) {
  const sent = [];
  const soDo = tuyChon.soDo === undefined ? {
    layoutViewport: { pageX: 200, pageY: 1000, clientWidth: 2560, clientHeight: 1440 },
    cssLayoutViewport: { pageX: 100, pageY: 500, clientWidth: 1280, clientHeight: 720 },
    visualViewport: { offsetX: 0, offsetY: 0, scale: 1, zoom: 1 },
    cssVisualViewport: { offsetX: 0, offsetY: 0, scale: 1.5, zoom: 0.8 },
    contentSize: { x: 0, y: 0, width: 2560, height: 8000 },
    cssContentSize: { x: 0, y: 0, width: 1280, height: 4000 }
  } : tuyChon.soDo;

  return {
    sent,
    goi: (method) => sent.filter((e) => e.method === method),
    async sendRaw(method, params) {
      sent.push({ method, params });
      if (method === "Page.getLayoutMetrics") return soDo;
      if (method === "Page.captureScreenshot") {
        /* Base64 dài theo diện tích khung chụp, để trần BYTE có thứ thật mà chặn. Trang giả
         * không dựng ảnh thật, nhưng nó phải phản ứng theo cỡ — một trang giả trả về cùng một
         * chuỗi cho mọi khung chụp thì trần byte không bao giờ có cơ hội đỏ. */
        const c = params?.clip;
        const diem = c ? Math.round(c.width * c.scale) * Math.round(c.height * c.scale) : 1280 * 720;
        return { data: "A".repeat(Math.min(diem, tuyChon.byteAnh ?? 4000)) };
      }
      return {};
    }
  };
}

const view = (page) => runProbe("page.view", { sendRaw: page.sendRaw }, {});
const shot = (page, params) => runProbe("page.shot", { sendRaw: page.sendRaw }, params || {});

/* ---- ① Cửa vào: tên phép dò và cửa CDP phải được KHAI --------------------
 * Khai lại ở đây, cố ý không import danh sách rồi so với chính nó. `Page.getLayoutMetrics` là
 * cửa CDP thứ tám của đường đọc, và mỗi cửa mở ra phải là một dòng ai đó GÕ, không phải một
 * dòng trôi vào. */
{
  assert.ok(PROBE_NAMES.includes("page.view"), "`page.view` phải có trong từ vựng phép dò");
  assert.ok(READ_ONLY_CDP_METHODS.includes("Page.getLayoutMetrics"),
    "đường đọc phải TỰ khai `Page.getLayoutMetrics`");
  /* Và nó KHÔNG được kéo theo hai anh em nguy hiểm cùng miền `Page`. Cùng một miền không có
   * nghĩa cùng một quyền — đó là chỗ một lượt "mở miền Page" sẽ đi qua nếu không ai canh. */
  for (const cam of ["Page.navigate", "Page.setDeviceMetricsOverride", "Page.reload",
    "Emulation.setDeviceMetricsOverride", "Emulation.setPageScaleFactor"]) {
    assert.ok(!READ_ONLY_CDP_METHODS.includes(cam), `đường đọc KHÔNG được có \`${cam}\``);
  }
}

/* ---- ② Đọc đúng bộ số CSS, và nói ra đã đọc bộ nào ---------------------- */
{
  const page = trangGia();
  const k = await view(page);
  assert.equal(k.ok, true, JSON.stringify(k));
  const d = k.data;

  assert.deepEqual(d.scroll, { x: 100, y: 500 }, "phải lấy bộ CSS, không lấy bộ thiết bị");
  assert.deepEqual(d.viewport, { width: 1280, height: 720 });
  assert.deepEqual(d.document, { width: 1280, height: 4000 });
  assert.equal(d.donVi, "css");
  /* `zoom` và `scale` là HAI thứ khác nhau — thu phóng của trình duyệt và thu phóng chụm hai
   * ngón. Gộp chúng là mất một trong hai, và người gọi không có cách nào biết mất cái nào. */
  assert.equal(d.zoom, 0.8);
  assert.equal(d.scale, 1.5);
  /* Đúng MỘT lượt gọi CDP, và đúng cái tên đó. Một phép dò "chỉ đọc" mà gọi thêm thứ khác là
   * chỗ bề mặt lặng lẽ rộng ra. */
  assert.deepEqual(page.sent.map((e) => e.method), ["Page.getLayoutMetrics"]);
}

/* ---- ③ `conLai` — con số người gọi thật sự dùng ------------------------- */
{
  const page = trangGia();
  const d = (await view(page)).data;
  /* 4000 cao − 720 khung − 500 đã cuộn = 2780 còn lại; ngang thì trang vừa bằng khung → 0. */
  assert.deepEqual(d.conLai, { x: 0, y: 2780 });
}
{
  /* Trang NGẮN HƠN khung nhìn: phép trừ ra số âm, và số âm ở đây đọc như "cuộn ngược lên
   * được". Kẹp ở 0. */
  const page = trangGia({ soDo: {
    cssLayoutViewport: { pageX: 0, pageY: 0, clientWidth: 1280, clientHeight: 720 },
    cssVisualViewport: { scale: 1, zoom: 1 },
    cssContentSize: { width: 600, height: 300 }
  } });
  const d = (await view(page)).data;
  assert.deepEqual(d.conLai, { x: 0, y: 0 }, "trang ngắn hơn khung nhìn thì `conLai` phải là 0, không âm");
}

/* ---- ④ Chrome cũ: ngã về bộ số thiết bị, và NÓI RA ---------------------- */
{
  const page = trangGia({ soDo: {
    layoutViewport: { pageX: 7, pageY: 9, clientWidth: 800, clientHeight: 600 },
    visualViewport: { scale: 1, zoom: 1 },
    contentSize: { width: 800, height: 2000 }
  } });
  const d = (await view(page)).data;
  assert.deepEqual(d.scroll, { x: 7, y: 9 });
  assert.equal(d.donVi, "thiet-bi",
    "ngã về bộ cũ thì PHẢI nói ra — một con số không biết mình đo bằng gì thì không đối chiếu được với gì");
}

/* ---- ⑤ Không đọc được thì ĐỎ, không trả về số 0 ------------------------- */
{
  const page = trangGia({ soDo: {} });
  const k = await view(page);
  assert.equal(k.ok, false);
  assert.equal(k.code, "NO_LAYOUT_METRICS",
    "không có số đo mà trả về 0 là báo 'trang đang ở đỉnh' cho một lượt không đọc được gì");
}

/* ---- ⑥ `scout.shot` KHÔNG khai gì thì cư xử Y HỆT NHƯ TRƯỚC ------------
 * Phép ghim quan trọng nhất của nửa `T27`: `full_page` và `scale` là thêm vào, không phải đổi.
 * Mọi lượt gọi đã viết từ trước phải đi đúng con đường cũ — kể cả việc KHÔNG hỏi số đo bố cục. */
{
  const page = trangGia();
  const k = await shot(page, { format: "jpeg", quality: 60 });
  assert.equal(k.ok, true);
  assert.deepEqual(page.sent.map((e) => e.method), ["Page.captureScreenshot"],
    "lượt chụp thường KHÔNG được hỏi thêm số đo bố cục");
  const p = page.goi("Page.captureScreenshot")[0].params;
  assert.equal(p.captureBeyondViewport, false);
  assert.equal(p.clip, undefined, "không khai gì thì KHÔNG được cắt khung");
  assert.equal(k.data.fullPage, false);
  assert.equal(k.data.scale, 1);
  assert.equal(k.data.clip, null);
}

/* ---- ⑦ `full_page` — chụp cả TÀI LIỆU, không chỉ phần đang thấy --------- */
{
  const page = trangGia({ byteAnh: 4000 });
  const k = await shot(page, { full_page: true, scale: 0.5 });
  assert.equal(k.ok, true, JSON.stringify(k));
  const p = page.goi("Page.captureScreenshot")[0].params;
  assert.equal(p.captureBeyondViewport, true, "chụp cả trang thì phải chụp QUÁ khung nhìn");
  assert.deepEqual(p.clip, { x: 0, y: 0, width: 1280, height: 4000, scale: 0.5 },
    "khung chụp phải là cỡ TÀI LIỆU theo đơn vị CSS, bắt đầu từ gốc trang");
  assert.equal(k.data.fullPage, true);
  assert.deepEqual(k.data.clip, { x: 0, y: 0, width: 1280, height: 4000 });
}

/* ---- ⑧ `scale` một mình — thu nhỏ ĐÚNG PHẦN ĐANG THẤY ------------------
 * Khác ⑦ ở chỗ dễ lẫn nhất: khung chụp bắt đầu ở CHỖ ĐANG CUỘN TỚI, không ở gốc trang. Lấy
 * nhầm gốc thì ảnh trả về là đầu trang trong khi người gọi đang nhìn giữa trang — và họ sẽ đi
 * tìm bug ở chỗ không có bug. */
{
  const page = trangGia();
  const k = await shot(page, { scale: 0.5 });
  assert.equal(k.ok, true);
  const p = page.goi("Page.captureScreenshot")[0].params;
  assert.equal(p.captureBeyondViewport, false);
  assert.deepEqual(p.clip, { x: 100, y: 500, width: 1280, height: 720, scale: 0.5 });
}

/* ---- ⑨ Trần ĐIỂM ẢNH chặn TRƯỚC khi dựng ảnh --------------------------- */
{
  /* 20.000 × 20.000 ở tỉ lệ 1 = 400 triệu điểm ảnh. Đây là hình dạng đã giết service worker
   * một lần rồi (`dom.snapshot`, 08/09) — nên nó phải chết ở đây, không phải ở Chrome. */
  const page = trangGia({ soDo: {
    cssLayoutViewport: { pageX: 0, pageY: 0, clientWidth: 1280, clientHeight: 720 },
    cssVisualViewport: { scale: 1, zoom: 1 },
    cssContentSize: { width: 20000, height: 20000 }
  } });
  const k = await shot(page, { full_page: true });
  assert.equal(k.ok, false);
  assert.equal(k.code, "SHOT_TOO_LARGE");
  assert.match(k.detail, /scale/, "câu từ chối phải nói ra ĐƯỜNG RA, không chỉ nói không");
  assert.deepEqual(page.goi("Page.captureScreenshot"), [],
    "phải từ chối TRƯỚC khi bảo Chrome dựng ảnh — chặn sau khi dựng xong là chặn nhầm chỗ");

  /* Và hạ tỉ lệ xuống thì phải QUA: một cái trần chặn cả đường đúng sẽ bị người ta gỡ. */
  const k2 = await shot(page, { full_page: true, scale: 0.2 });
  assert.equal(k2.ok, true, JSON.stringify(k2).slice(0, 200));
}

/* ---- ⑩ `scale` ngoài khoảng thì TỪ CHỐI, không tự kẹp ------------------
 * Tự kẹp là im lặng đổi ý người gọi. Phóng to (`scale > 1`) đặc biệt vô nghĩa: nó không thêm
 * một điểm ảnh thông tin nào, chỉ thêm byte cho một phong bì vốn đã chật. */
{
  for (const xau of [0, -1, 2, 1.5, "0.5", NaN, Infinity]) {
    const page = trangGia();
    const k = await shot(page, { scale: xau });
    assert.equal(k.ok, false, `scale ${String(xau)} phải bị từ chối`);
    assert.equal(k.code, "PARAM_INVALID");
  }
  /* Hai đầu khoảng thì phải QUA. */
  for (const tot of [0.1, 1]) {
    const page = trangGia();
    assert.equal((await shot(page, { scale: tot })).ok, true, `scale ${tot} phải chạy`);
  }
}

/* ---- ⑪ HẠN CHO MỖI LỆNH CDP — đường ĐỌC khai hạn của RIÊNG nó ----------
 * Con bệnh lộ ra ở đường GHI (`G-72`: `mouseWheel` không trả lời, giữ debugger cắm vào tab, khoá
 * mọi lệnh sau suốt 120 giây). Nhưng nó là bệnh của **mọi** lệnh CDP, không của riêng lệnh ấy:
 * một `Page.captureScreenshot` treo cũng khoá tab hệt thế. Hai lõi khai riêng — luật gói số 6 —
 * nên chỗ này phải có phép ghim của chính nó, không dựa vào phép ghim của đường ghi.
 *
 * Chú ý chỗ dễ nhầm: hạn là của MỘT LỆNH, không của cả phép dò. `dom.wait` chờ tới 30 giây bằng
 * cách hỏi đi hỏi lại, mỗi lượt hỏi vẫn nhanh — nên nó không đụng hạn này. */
{
  assert.equal(CDP_HAN_MS, 20000, "hạn phải nằm DƯỚI ngưỡng 35s của máy chủ Bridge");
  const send = createReadOnlySender(() => new Promise(() => {}), [], 40);
  const t0 = Date.now();
  await assert.rejects(() => send("DOM.enable", {}), (e) => {
    assert.ok(e instanceof ProbeError);
    assert.equal(e.code, "CDP_TIMEOUT");
    assert.match(e.message, /DOM\.enable/, "câu lỗi phải nói ra lệnh nào treo");
    return true;
  });
  assert.ok(Date.now() - t0 < 2000, "phải bỏ cuộc theo hạn, không chờ mãi");
  const send2 = createReadOnlySender(async () => ({ ok: 1 }), [], 40);
  assert.deepEqual(await send2("DOM.enable", {}), { ok: 1 }, "lệnh trả lời bình thường không được đụng tới");
}

console.log("scouter-view-smoke: PASS (11 khoi)");
