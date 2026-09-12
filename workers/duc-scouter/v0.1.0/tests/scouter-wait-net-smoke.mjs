/* Phép ghim cho HAI NĂNG LỰC MỞ NGÀY 12/09 — `dom.wait` và `network.watch`.
 *
 * VÌ SAO CÓ MẺ NÀY. Cả hai sinh ra để dựng chuỗi thiết kế trên một trang sinh ảnh: gõ lời
 * nhắc → đợi ảnh xong → lấy ảnh → lặp. Chỗ thiếu là **đợi**: hôm nay AI chỉ biết "xong chưa"
 * bằng cách hỏi đi hỏi lại qua Bridge, mỗi câu hỏi một vòng đi-về trọn vẹn.
 *
 * CON ĐẮT NHẤT Ở ĐÂY LÀ `W6`, và nó là lý do mẻ này tồn tại chứ không phải chỉ là thủ tục:
 * gói sự kiện Chrome đưa sang CHỞ `request.headers` — cookie phiên và token đăng nhập của
 * Đức. `W6` nhét một token giả vào đúng chỗ đó rồi soi TOÀN BỘ chuỗi JSON của kết quả để
 * chắc rằng nó không lọt ra. Một phép ghim chỉ đếm số dòng trả về sẽ xanh trọn trong khi
 * công cụ quan sát lặng lẽ biến thành máy hút token.
 *
 * Đồng hồ được TIÊM, không chờ thật: một lượt `dom.wait` 30 giây mà chờ thật thì suite của
 * gói dài thêm vài phút, và cái gì chạy lâu thì sẽ có người bỏ chạy nó.
 *
 * Mẻ này KHÔNG ghim: lượt gắn debugger thật, lượt lọc sự kiện theo tab (nằm ở
 * `observer-engine.js`, và nó là lớp nối dây nên `A1..A4` canh ở biên `chrome`), và hành vi
 * trên trang thật.
 */

import assert from "node:assert/strict";
import { runProbe, READ_ONLY_CDP_METHODS, PROBE_NAMES } from "../scripts/observer-probes.mjs";

const ket = [];
async function ghim(ten, chay) {
  try { await chay(); ket.push(`PASS  ${ten}`); }
  catch (loi) { ket.push(`FAIL  ${ten}\n      ${String(loi?.message || loi).split("\n")[0]}`); process.exitCode = 1; }
}

/* Đồng hồ giả: `sleep` không chờ gì cả, chỉ cộng dồn vào một cái đồng hồ ảo mà `Date.now`
 * đọc được. Không tiêm được thời gian thì mọi phép ghim về TRẦN CHỜ đều phải chờ thật. */
function lamDongHo() {
  const that = Date.now;
  let lech = 0;
  Date.now = () => that.call(Date) + lech;
  return {
    sleep: async (ms) => { lech += ms; },
    tong: () => lech,
    tra: () => { Date.now = that; }
  };
}

/* Máy CDP giả. `kichBan` quyết định `DOM.querySelectorAll` trả về mấy nút ở lượt hỏi thứ mấy. */
function lamSend(kichBan) {
  const goi = [];
  let luot = 0;
  return {
    goi,
    sendRaw: async (method, params) => {
      goi.push({ method, params });
      if (method === "DOM.enable" || method === "Network.enable" || method === "Network.disable") return {};
      if (method === "DOM.getDocument") return { root: { nodeId: 1 } };
      if (method === "DOM.querySelectorAll") {
        luot += 1;
        const so = typeof kichBan === "function" ? kichBan(luot) : 0;
        return { nodeIds: Array.from({ length: so }, (_v, i) => 100 + i) };
      }
      if (method === "DOM.describeNode") {
        return { node: { nodeId: params.nodeId, nodeType: 1, nodeName: "IMG", localName: "img", attributes: ["src", "https://cdn.thu/anh.png?token=BIMAT"] } };
      }
      throw new Error(`máy giả không biết method ${method}`);
    }
  };
}

/* ---- W1 · Thấy ngay thì trả lời ngay, không ngủ oan một nhịp ------------- */
await ghim("W1 điều kiện đã đúng sẵn thì hỏi ĐÚNG MỘT lần", async () => {
  const dh = lamDongHo();
  try {
    const may = lamSend(() => 1);
    const r = await runProbe("dom.wait", { sendRaw: may.sendRaw, sleep: dh.sleep }, { selector: "img.ket-qua" });
    assert.equal(r.ok, true);
    assert.equal(r.data.satisfied, true);
    assert.equal(r.data.polls, 1, "hỏi trước rồi mới ngủ — thấy ngay thì không được ngủ lần nào");
    assert.equal(dh.tong(), 0, "không được tốn một nhịp chờ nào");
    assert.equal(r.data.matchCount, 1);
  } finally { dh.tra(); }
});

/* ---- W2 · Chưa thấy thì chờ, thấy thì thôi ------------------------------- */
await ghim("W2 chờ tới lượt hỏi thứ tư rồi dừng", async () => {
  const dh = lamDongHo();
  try {
    const may = lamSend((luot) => (luot >= 4 ? 2 : 0));
    const r = await runProbe("dom.wait", { sendRaw: may.sendRaw, sleep: dh.sleep },
      { selector: "img", timeoutMs: 20000, pollMs: 500 });
    assert.equal(r.data.satisfied, true);
    assert.equal(r.data.polls, 4);
    assert.equal(dh.tong(), 1500, "ba nhịp chờ giữa bốn lượt hỏi");
    assert.equal(r.data.items.length, 1, "mô tả đúng số phần tử tối thiểu đang chờ, không phải cả trang");
  } finally { dh.tra(); }
});

/* ---- W3 · HẾT GIỜ LÀ CÂU TRẢ LỜI, KHÔNG PHẢI SỰ CỐ -----------------------
 * Đảo chốt này lại thì "sau 30 giây vẫn chưa thấy" tới tay người gọi dưới dạng một lỗi, và
 * sớm muộn có người đọc nó thành "Scouter hỏng" rồi đi sửa nhầm chỗ. */
await ghim("W3 hết giờ trả satisfied:false, ok vẫn true", async () => {
  const dh = lamDongHo();
  try {
    const may = lamSend(() => 0);
    const r = await runProbe("dom.wait", { sendRaw: may.sendRaw, sleep: dh.sleep },
      { selector: "img", timeoutMs: 2000, pollMs: 500 });
    assert.equal(r.ok, true, "hết giờ KHÔNG được là một phép dò thất bại");
    assert.equal(r.data.satisfied, false);
    assert.ok(r.data.waitedMs <= 2000, `chờ ${r.data.waitedMs}ms, vượt trần đã khai 2000ms`);
    assert.equal(r.data.items.length, 0);
  } finally { dh.tra(); }
});

/* ---- W4 · Trần chờ nằm DƯỚI ngưỡng bỏ cuộc của máy chủ -------------------
 * Máy chủ Bridge cắt một lượt chuyển tiếp ở 35.000ms. Trần chờ lớn hơn thế nghĩa là dựng
 * một cái hẹn không bao giờ tới lượt: máy chủ đã trả `REQUEST_TIMEOUT` cho người gọi trong
 * khi extension vẫn đang chờ tiếp — hai đầu tin hai chuyện khác nhau. */
await ghim("W4 xin chờ quá trần thì bị từ chối ngay", async () => {
  const may = lamSend(() => 0);
  const r = await runProbe("dom.wait", { sendRaw: may.sendRaw, sleep: async () => {} },
    { selector: "img", timeoutMs: 90000 });
  assert.equal(r.ok, false);
  assert.equal(r.code, "PARAM_INVALID");
  assert.match(r.detail, /30000/, "câu lỗi phải nói ra trần thật, đừng bắt người gọi đoán");
});

/* ---- W5 · Lấy lại document MỖI lượt hỏi ---------------------------------
 * Trang kiểu React dựng lại cây liên tục và CDP làm `nodeId` cũ hết hiệu lực. Giữ `nodeId`
 * gốc từ lượt đầu thì phép dò báo "chưa thấy" mãi mãi trên đúng loại trang nó sinh ra để
 * phục vụ — hỏng câm, và câm là kiểu hỏng đắt nhất. */
await ghim("W5 mỗi lượt hỏi có một lượt DOM.getDocument đi kèm", async () => {
  const dh = lamDongHo();
  try {
    const may = lamSend((luot) => (luot >= 3 ? 1 : 0));
    await runProbe("dom.wait", { sendRaw: may.sendRaw, sleep: dh.sleep }, { selector: "img", pollMs: 100 });
    const soDoc = may.goi.filter((g) => g.method === "DOM.getDocument").length;
    const soHoi = may.goi.filter((g) => g.method === "DOM.querySelectorAll").length;
    assert.equal(soHoi, 3);
    assert.equal(soDoc, soHoi, "lấy document một lần rồi dùng lại là chỗ hỏng câm trên trang động");
  } finally { dh.tra(); }
});

/* ================= network.watch ================= */

/* Máy CDP giả CÓ KÊNH SỰ KIỆN. `kich` là danh sách sự kiện sẽ được bắn ra trong lúc "ngủ". */
/* ---- `usable` — *dùng được*, không phải *có mặt* (`S-18`, 12/09) ---------
 *
 * Máy giả thứ hai, và nó phải trả lời được câu mà máy giả ở trên KHÔNG trả lời được: *điểm
 * giữa của phần tử này thuộc về ai*. `cheToiLuot` = từ lượt hỏi thứ mấy thì tấm chắn BIẾN
 * MẤT; đặt `Infinity` là chắn mãi.
 *
 * `trungDiemLaCon` dựng ca nút-có-icon: điểm giữa rơi vào `<path>` bên trong nút. Không có
 * ca này thì một bản vá "chỉ nhận đúng phần tử" sẽ XANH trọn, rồi ngoài đời mọi nút có icon
 * bị báo là không dùng được. */
function lamSendChe({ cheToiLuot = Infinity, trungDiemLaCon = false, hoiHong = false } = {}) {
  const goi = [];
  let luot = 0;
  return {
    goi,
    sendRaw: async (method, params) => {
      goi.push({ method, params });
      if (method === "DOM.enable") return {};
      if (method === "DOM.getDocument") return { root: { nodeId: 1 } };
      if (method === "DOM.querySelectorAll") {
        /* Hỏi từ gốc = tìm phần tử. Hỏi từ phần tử = tìm con cháu nó. */
        if (params?.nodeId === 1) { luot += 1; return { nodeIds: [100] }; }
        return { nodeIds: [201] };
      }
      if (method === "DOM.getBoxModel") return { model: { content: [10, 20, 110, 20, 110, 60, 10, 60] } };
      if (method === "DOM.getNodeForLocation") {
        /* Chrome ném thật, đo được 12/09 trên một tab không đang được vẽ:
         * `-32000 No node found at given location`. */
        if (hoiHong) throw new Error("No node found at given location");
        if (luot < cheToiLuot) return { nodeId: 777 };          // tấm chắn đang phủ
        return { nodeId: trungDiemLaCon ? 201 : 100 };
      }
      if (method === "DOM.describeNode") {
        return { node: { nodeId: params.nodeId, nodeType: 1, nodeName: "BUTTON", localName: "button", attributes: [] } };
      }
      throw new Error(`máy giả không biết method ${method}`);
    }
  };
}

/* ---- W11 · HAI CÂU TRẢ LỜI KHÁC NHAU TRÊN CÙNG MỘT TRANG ------------------
 * Đây là phép ghim trung tâm của `S-18`, và là thứ duy nhất chứng minh `usable` không phải
 * một cái tên khác của `present`. Đo thật 12/09 trên trang Optic: chờ `textarea.agent-textarea`
 * trả `satisfied` sau 36ms trong khi một tấm chắn phủ kín ứng dụng — cả cây DOM nằm nguyên
 * bên dưới nên mọi selector vẫn khớp. Câu trả lời đúng về mặt chữ, vô dụng về mặt việc. */
await ghim("W11 cùng một trang: present THOẢ, usable KHÔNG thoả", async () => {
  const dh = lamDongHo();
  try {
    const co = await runProbe("dom.wait", { sendRaw: lamSendChe({ cheToiLuot: Infinity }).sendRaw, sleep: dh.sleep },
      { selector: "button.gui", state: "present", timeoutMs: 5000, pollMs: 500 });
    assert.equal(co.data.satisfied, true, "present phải thoả: phần tử CÓ trong cây DOM");
    assert.equal(co.data.usableCount, null, "không đếm thì phải là null, không phải 0");

    const dung = await runProbe("dom.wait", { sendRaw: lamSendChe({ cheToiLuot: Infinity }).sendRaw, sleep: dh.sleep },
      { selector: "button.gui", state: "usable", timeoutMs: 5000, pollMs: 500 });
    assert.equal(dung.ok, true, "bị chắn là một CÂU TRẢ LỜI, không phải sự cố");
    assert.equal(dung.data.satisfied, false, "usable KHÔNG được thoả khi có tấm chắn phủ lên");
    assert.equal(dung.data.matchCount, 1, "vẫn phải nói thật là selector CÓ khớp");
    assert.equal(dung.data.usableCount, 0, "…nhưng không cái nào dùng được — đây là tin giá trị nhất");
    assert.deepEqual(dung.data.items, [], "chưa dùng được thì không mô tả như thể đã sẵn sàng");
  } finally { dh.tra(); }
});

/* ---- W12 · Tấm chắn biến mất thì `usable` thoả ---------------------------
 * Chiều NGƯỢC LẠI của W11. Thiếu con này thì một bản "usable LUÔN trả false" vẫn xanh trọn,
 * và `scout.wait` thành một phép chờ không bao giờ xong. */
await ghim("W12 chắn tan ở lượt thứ ba thì usable thoả đúng lúc đó", async () => {
  const dh = lamDongHo();
  try {
    const may = lamSendChe({ cheToiLuot: 3 });
    const r = await runProbe("dom.wait", { sendRaw: may.sendRaw, sleep: dh.sleep },
      { selector: "button.gui", state: "usable", timeoutMs: 20000, pollMs: 500 });
    assert.equal(r.data.satisfied, true);
    assert.equal(r.data.polls, 3, "phải chờ đúng tới nhịp tấm chắn tan, không sớm hơn");
    assert.equal(r.data.usableCount, 1);
    assert.equal(r.data.items.length, 1, "dùng được rồi thì mô tả thứ đang chờ");
  } finally { dh.tra(); }
});

/* ---- W13 · Nút CÓ ICON không bị báo oan là không dùng được ---------------
 * `<button><svg><path>` — tâm hộp rơi vào `<path>`. Đây là hình dạng của gần như mọi nút
 * biểu tượng ngoài đời, nên một chốt từ chối nó sẽ bị người sau gỡ bỏ vì "nó chặn việc thật". */
await ghim("W13 điểm giữa rơi vào con cháu vẫn tính là dùng được", async () => {
  const dh = lamDongHo();
  try {
    const r = await runProbe("dom.wait", { sendRaw: lamSendChe({ cheToiLuot: 0, trungDiemLaCon: true }).sendRaw, sleep: dh.sleep },
      { selector: "button.icon", state: "usable", timeoutMs: 5000, pollMs: 500 });
    assert.equal(r.data.satisfied, true, "nút có icon bị từ chối oan");
    assert.equal(r.data.usableCount, 1);
  } finally { dh.tra(); }
});

/* ---- W14 · `present` VẪN LÀ MẶC ĐỊNH, và tên trạng thái vẫn đóng ---------
 * Vế này canh chỗ dễ hỏng nhất khi thêm một giá trị: đổi luôn mặc định. Làm thế là làm hỏng
 * mọi lượt gọi đã viết, ở khắp nơi, cùng lúc — và hỏng LẶNG LẼ, vì lượt gọi cũ vẫn chạy. */
await ghim("W14 mặc định vẫn là present, và tên trạng thái lạ vẫn bị từ chối", async () => {
  const dh = lamDongHo();
  try {
    const r = await runProbe("dom.wait", { sendRaw: lamSendChe({ cheToiLuot: Infinity }).sendRaw, sleep: dh.sleep },
      { selector: "button.gui" });
    assert.equal(r.data.state, "present", "bỏ trống `state` phải vẫn là present");
    assert.equal(r.data.satisfied, true, "mặc định vừa bị đổi sang usable — mọi lượt gọi cũ đổi nghĩa");

    for (const xau of ["visible", "clickable", "USABLE", "", 1, true]) {
      const x = await runProbe("dom.wait", { sendRaw: lamSendChe().sendRaw, sleep: dh.sleep },
        { selector: "button.gui", state: xau });
      assert.equal(x.ok, false, `trạng thái lạ lọt qua: ${JSON.stringify(xau)}`);
      assert.equal(x.code, "WAIT_STATE_INVALID");
    }
  } finally { dh.tra(); }
});

/* ---- W15 · "BỊ CHẮN" khác "KHÔNG HỎI ĐƯỢC", và phải nói ra là cái nào ----
 * Đo thật 12/09: cùng trang, cùng toạ độ, vài phút trước trả lời bình thường, rồi Chrome ném
 * `-32000 No node found at given location` cho một tab nó KHÔNG ĐANG VẼ. Cả hai ca đều cho
 * `satisfied: false, usableCount: 0` — và gộp chúng lại là đẩy người đọc đi tìm một hộp thoại
 * không hề tồn tại. Chính tôi đã mất một lượt đo vì đúng chuyện này. */
await ghim("W15 nói ra VÌ SAO chưa dùng được: covered hay no_hit_test", async () => {
  const dh = lamDongHo();
  try {
    const che = await runProbe("dom.wait", { sendRaw: lamSendChe({ cheToiLuot: Infinity }).sendRaw, sleep: dh.sleep },
      { selector: "button.gui", state: "usable", timeoutMs: 1500, pollMs: 500 });
    assert.equal(che.data.satisfied, false);
    assert.equal(che.data.usableBlockedBy, "covered", "có thứ chắn lên thì phải nói là bị chắn");

    const hong = await runProbe("dom.wait", { sendRaw: lamSendChe({ hoiHong: true }).sendRaw, sleep: dh.sleep },
      { selector: "button.gui", state: "usable", timeoutMs: 1500, pollMs: 500 });
    assert.equal(hong.data.satisfied, false);
    assert.equal(hong.data.usableBlockedBy, "no_hit_test",
      "Chrome không trả lời được KHÔNG phải 'bị chắn' — hai nguyên nhân, hai việc phải làm");

    /* Và khi thoả thì không được bịa ra một lý do vướng. */
    const xong = await runProbe("dom.wait", { sendRaw: lamSendChe({ cheToiLuot: 0 }).sendRaw, sleep: dh.sleep },
      { selector: "button.gui", state: "usable", timeoutMs: 1500, pollMs: 500 });
    assert.equal(xong.data.satisfied, true);
    assert.equal(xong.data.usableBlockedBy, null);
  } finally { dh.tra(); }
});

function lamMang(kich) {
  const goi = [];
  let nghe = null;
  return {
    goi,
    deps: {
      sendRaw: async (method, params) => { goi.push({ method, params }); return {}; },
      subscribe: (handler) => { nghe = handler; return () => { nghe = null; }; },
      sleep: async () => { for (const [m, e] of kich) if (nghe) nghe(m, e); }
    },
    dangNghe: () => nghe !== null
  };
}

/* ---- W6 · KHÔNG MỘT BÍ MẬT NÀO LỌT RA — con đắt nhất của mẻ này ---------- */
await ghim("W6 header, cookie và nội dung gửi lên không lọt vào kết quả", async () => {
  /* HAI CHUỖI NÀY NÓI THẲNG BẰNG TỪ "fake" — và đó là một yêu cầu, không phải thẩm mỹ.
   * Bản đầu viết "TOKEN-GIA": đúng nghĩa với người Việt, nhưng bộ dò secret của cổng chỉ biết
   * một danh sách dấu-hàng-giả bằng tiếng Anh ("fake", "test", "dummy"…), nên nó ĐỎ mỗi lượt
   * chạy với câu "nghi có token thật". Một cảnh báo phải soi bằng mắt mỗi phiên là một cảnh
   * báo sẽ bị lướt qua theo thói quen — và ngày nó đúng thì không ai đọc.
   * Cách chữa là làm chuỗi tự khai, KHÔNG phải thêm "gia" vào danh sách của bộ dò: "gia" là
   * ba chữ cái rơi ngẫu nhiên vào vô số token thật, và nới nó là làm mù bộ dò ở mọi repo.
   * Cùng cách mà `bridge-cli-mutation-key-smoke.mjs` đã chọn ngày 12/09. */
  const TOKEN = "Bearer fake-token-khong-duoc-lot-ra-ngoai-day";
  const COOKIE = "session=fake-cookie-khong-duoc-lot-ra-ngoai-day";
  const may = lamMang([
    ["Network.requestWillBeSent", {
      requestId: "r1", type: "XHR", timestamp: 1,
      request: {
        url: "https://may-chu.thu/v1/sinh-anh?api_key=KHOA-GIA-KHONG-DUOC-LOT-RA",
        method: "POST",
        /* Đây chính là chỗ Chrome đưa bí mật sang. Một bản `network.watch` trải gói gốc sẽ
         * đẩy nguyên khối này ra ngoài dây. */
        headers: { authorization: TOKEN, cookie: COOKIE },
        postData: "{\"prompt\":\"NOI-DUNG-GIA-KHONG-DUOC-LOT-RA\"}"
      }
    }],
    ["Network.responseReceived", {
      requestId: "r1", response: { status: 200, mimeType: "application/json", headers: { "set-cookie": COOKIE } }
    }],
    ["Network.loadingFinished", { requestId: "r1", encodedDataLength: 4096, timestamp: 3.5 }]
  ]);
  const r = await runProbe("network.watch", may.deps, { durationMs: 1000 });
  assert.equal(r.ok, true);

  const chuoi = JSON.stringify(r);
  for (const bimat of [TOKEN, COOKIE, "KHOA-GIA", "NOI-DUNG-GIA", "authorization", "set-cookie", "postData"]) {
    assert.equal(chuoi.includes(bimat), false, `BÍ MẬT LỌT RA NGOÀI DÂY: "${bimat}" có mặt trong kết quả`);
  }

  /* Và vẫn phải TRẢ VỀ ĐƯỢC VIỆC — một hàm che sạch bằng cách không trả gì thì cũng xanh
   * ở khối trên, nên khối này ghim phần công dụng. */
  const m = r.data.items[0];
  assert.equal(m.method, "POST");
  assert.equal(m.url, "https://may-chu.thu/v1/sinh-anh…", "query string bị cắt, đường dẫn giữ lại");
  assert.equal(m.status, 200);
  assert.equal(m.mimeType, "application/json");
  assert.equal(m.encodedDataLength, 4096);
  assert.equal(m.durationMs, 2500);
});

/* ---- W7 · Tắt tai trong FINALLY ----------------------------------------- */
await ghim("W7 nghe xong thì gỡ hàm nghe và gọi Network.disable", async () => {
  const may = lamMang([]);
  await runProbe("network.watch", may.deps, { durationMs: 500 });
  assert.equal(may.dangNghe(), false, "bỏ quên một cái tai đang mở là bỏ quên một lượt quan sát không ai xin phép");
  const ten = may.goi.map((g) => g.method);
  assert.deepEqual(ten, ["Network.enable", "Network.disable"]);
  assert.equal(may.goi[0].params.maxPostDataSize, 0,
    "phải bảo Chrome ĐỪNG GỬI nội dung người dùng gõ, chứ không phải gửi rồi ta bỏ");
});

/* ---- W8 · Không nghe được thì NÓI RA, đừng trả danh sách rỗng ------------
 * Danh sách rỗng trông y hệt "trang chẳng gọi máy chủ lần nào" — một câu trả lời sai mà nghe
 * rất giống câu đúng, và nó sẽ dẫn người đọc tới kết luận ngược hẳn. */
await ghim("W8 thiếu kênh sự kiện thì hỏng thành tiếng", async () => {
  const r = await runProbe("network.watch", { sendRaw: async () => ({}), sleep: async () => {} }, {});
  assert.equal(r.ok, false);
  assert.equal(r.code, "DEPS_MISSING");
});

/* ---- W9 · Lọc theo chuỗi con, và nửa sau của một lượt gọi không tự mọc ra - */
await ghim("W9 urlContains lọc đúng, và sự kiện mồ côi không tạo dòng mới", async () => {
  const may = lamMang([
    ["Network.requestWillBeSent", { requestId: "a", request: { url: "https://x.thu/sinh-anh", method: "POST" }, timestamp: 1 }],
    ["Network.requestWillBeSent", { requestId: "b", request: { url: "https://x.thu/phong-chu.woff", method: "GET" }, timestamp: 1 }],
    /* `c` chưa từng có lượt bắt đầu — nó bắt đầu TRƯỚC khi ta bật tai. Một bản ghi không biết
     * mình gọi URL nào thì vô dụng, và tệ hơn: nó lọt qua được cái lọc. */
    ["Network.loadingFinished", { requestId: "c", encodedDataLength: 9 }]
  ]);
  const r = await runProbe("network.watch", may.deps, { durationMs: 500, urlContains: "sinh-anh" });
  assert.equal(r.data.total, 1);
  assert.equal(r.data.items[0].url, "https://x.thu/sinh-anh");
});

/* ---- W10 · Hai cửa `Network` mở, và ĐÚNG hai ---------------------------- */
await ghim("W10 không method Network nguy hiểm nào lọt vào danh sách read-only", async () => {
  const mang = READ_ONLY_CDP_METHODS.filter((m) => m.startsWith("Network."));
  assert.deepEqual([...mang].sort(), ["Network.disable", "Network.enable"]);
  for (const cam of ["Network.getCookies", "Network.setCookie", "Network.getResponseBody",
    "Network.getRequestPostData", "Network.setExtraHTTPHeaders", "Network.setRequestInterception"]) {
    assert.equal(READ_ONLY_CDP_METHODS.includes(cam), false, `${cam} KHÔNG được nằm trong bộ read-only`);
  }
  /* Và lõi đọc vẫn không có đường chạy mã — thứ mà hai năng lực mới không được phép làm suy yếu. */
  assert.equal(READ_ONLY_CDP_METHODS.some((m) => m.startsWith("Runtime.") || m.startsWith("Input.")), false);
  assert.ok(PROBE_NAMES.includes("dom.wait") && PROBE_NAMES.includes("network.watch"));
});

for (const dong of ket) console.log(dong);
console.log(`\n${ket.filter((d) => d.startsWith("PASS")).length}/${ket.length} phép ghim CHỜ và NGHE MẠNG`);
