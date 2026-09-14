/* scouter-dilai-smoke.mjs — NHÓM "ĐI LẠI": `T26` cuộn · `T28` rê chuột + bấm phải/đúp · `T30`
 * lùi/tiến. Đức uỷ quyền 14/09, [ADR-0007].
 *
 * ══ BA CHỖ ĐÁNG GHIM, VÀ KHÔNG CÁI NÀO LÀ "CÓ CHẠY KHÔNG" ══
 *
 * ⑴ **Lượt bấm cũ phải KHÔNG ĐỔI.** `button` và `click_count` thêm vào `input.click` — mọi
 *    lượt gọi đã viết từ trước phải bắn ra ĐÚNG chuỗi sự kiện cũ, từng trường một. Đây là
 *    phép ghim đắt nhất của file, vì `scout.click` là lệnh chạy nhiều nhất của cả gói.
 *
 * ⑵ **Chỉ số lịch sử tính Ở TRONG.** `Page.navigateToHistoryEntry` nhảy được tới BẤT KỲ mục
 *    nào trong lịch sử của tab. Người gọi ở đây chỉ nói `"back"`/`"forward"`, và khối ⑦ ghim
 *    đúng điều đó: không có đường nào để một con số từ ngoài thành một `entryId`.
 *
 * ⑶ **Hết đường thì ĐỎ.** `navigateToHistoryEntry` với chỉ số ngoài khoảng không báo lỗi ở
 *    nhiều phiên bản Chrome — nên một lượt "lùi" ở trang đầu tiên trông y hệt một lượt lùi
 *    thành công. Im lặng ở đây là nói dối.
 */
import assert from "node:assert/strict";

const { runAction, ACTION_NAMES, MOUSE_BUTTON_NAMES, SCROLL_DIRECTION_NAMES } =
  await import("../scripts/scouter-actions-core.mjs");

const BTN = "#btn";

/* Trang giả — cùng khuôn với `scouter-actions-smoke.mjs`, và cố ý chép chứ không import: hai
 * file ghim hai thứ khác nhau, và một trang giả dùng chung là chỗ sửa cho file này làm đỏ file
 * kia rồi ai đó "sửa" bằng cách nới nó ra. */
function trangGia(tuyChon = {}) {
  const sent = [];
  const nutTrungDiem = tuyChon.nutTrungDiem === undefined ? 100 : tuyChon.nutTrungDiem;
  const lichSu = tuyChon.lichSu === undefined
    ? { currentIndex: 1, entries: [{ id: 11, url: "https://a.test/" }, { id: 22, url: "https://b.test/" }, { id: 33, url: "https://c.test/" }] }
    : tuyChon.lichSu;
  let url = tuyChon.urlDau === undefined ? "https://b.test/" : tuyChon.urlDau;
  let tept = 500;

  return {
    sent,
    goi: (method) => sent.filter((e) => e.method === method),
    async sendRaw(method, params) {
      sent.push({ method, params });
      if (method === "DOM.getDocument") return { root: { nodeId: 1, backendNodeId: tept } };
      if (method === "DOM.querySelectorAll" && params?.selector === ":root") return { nodeIds: [50] };
      if (method === "DOM.getBoxModel" && params?.nodeId === 50) {
        return { model: { margin: [0, 0, 1000, 0, 1000, 3000, 0, 3000] } };
      }
      if (method === "DOM.querySelectorAll") {
        if (params?.nodeId !== 1) return { nodeIds: [201, 202] };
        return { nodeIds: [100] };
      }
      if (method === "DOM.getBoxModel") return { model: { content: [10, 20, 110, 20, 110, 60, 10, 60] } };  // tâm (60, 40)
      if (method === "DOM.getNodeForLocation") {
        return nutTrungDiem === null ? {} : { nodeId: nutTrungDiem, backendNodeId: 9000 + nutTrungDiem };
      }
      if (method === "Page.getNavigationHistory") return lichSu;
      if (method === "Page.navigateToHistoryEntry") {
        const muc = (lichSu.entries || []).find((e) => e.id === params?.entryId);
        if (muc) { url = muc.url; tept += 1; }
        return {};
      }
      if (method === "Target.getTargetInfo") return { targetInfo: { url } };
      return {};
    }
  };
}

const ctx = { now: () => Date.now(), cho: async () => {} };
const chay = (ten, page, params) => runAction(ten, { sendRaw: page.sendRaw, ...ctx }, params);

/* ---- ① Từ vựng: ba hành động mới, và ba BẢNG ĐÓNG ---------------------- */
{
  for (const ten of ["input.scroll", "input.hover", "input.history"]) {
    assert.ok(ACTION_NAMES.includes(ten), `\`${ten}\` phải có trong từ vựng hành động`);
  }
  /* Bảng đóng, không phải gợi ý. Nhận một chuỗi bất kỳ rồi chuyển thẳng xuống CDP là mở lại
   * đúng cái cửa mà chốt ⑴ của lõi ghi đóng. */
  assert.deepEqual([...MOUSE_BUTTON_NAMES], ["left", "right", "middle"]);
  assert.deepEqual([...SCROLL_DIRECTION_NAMES].sort(), ["down", "left", "right", "up"]);
}

/* ---- ② LƯỢT BẤM CŨ KHÔNG ĐỔI — phép ghim đắt nhất của file ------------- */
{
  const page = trangGia();
  const k = await chay("input.click", page, { selector: BTN });
  assert.equal(k.ok, true, JSON.stringify(k));
  assert.deepEqual(page.goi("Input.dispatchMouseEvent").map((e) => e.params), [
    { type: "mouseMoved", x: 60, y: 40, button: "none", buttons: 0 },
    { type: "mousePressed", x: 60, y: 40, button: "left", buttons: 1, clickCount: 1 },
    { type: "mouseReleased", x: 60, y: 40, button: "left", buttons: 0, clickCount: 1 }
  ], "không khai `button`/`click_count` thì chuỗi sự kiện phải Y HỆT bản trước 14/09");
  assert.equal(k.data.button, "left");
  assert.equal(k.data.clickCount, 1);
}

/* ---- ③ Bấm PHẢI: cả `button` lẫn mặt nạ `buttons` phải đổi ------------
 * Đổi một trong hai thôi là gửi cho trang một sự kiện TỰ MÂU THUẪN — "nút phải, mà mặt nạ nói
 * nút trái" — và trang xử lý nó theo kiểu không ai đoán nổi. */
{
  const page = trangGia();
  const k = await chay("input.click", page, { selector: BTN, button: "right" });
  assert.equal(k.ok, true);
  const su = page.goi("Input.dispatchMouseEvent").map((e) => e.params);
  assert.equal(su[1].button, "right");
  assert.equal(su[1].buttons, 2, "mặt nạ `buttons` phải khớp với tên nút");
  assert.equal(su[2].button, "right");
  assert.equal(k.data.button, "right");
}

/* ---- ④ Bấm ĐÚP: `clickCount` TĂNG DẦN qua từng cặp nhấn-nhả ----------
 * Đó là hình dạng trình duyệt thật sinh ra. Một cặp duy nhất mang `clickCount: 2` là sự kiện
 * không trình duyệt nào tạo ra, và trang nào nghe `dblclick` sẽ không nghe thấy gì. */
{
  const page = trangGia();
  const k = await chay("input.click", page, { selector: BTN, click_count: 2 });
  assert.equal(k.ok, true);
  const su = page.goi("Input.dispatchMouseEvent").map((e) => e.params);
  assert.equal(su.length, 5, "một lượt rê + hai cặp nhấn-nhả");
  assert.deepEqual(su.slice(1).map((e) => [e.type, e.clickCount]), [
    ["mousePressed", 1], ["mouseReleased", 1], ["mousePressed", 2], ["mouseReleased", 2]
  ]);
  assert.equal(k.data.clickCount, 2);
}

/* ---- ⑤ Giá trị ngoài bảng thì TỪ CHỐI, và không gửi một lệnh CDP nào --- */
{
  for (const xau of ["Left", "LEFT", "back", "", 1, {}]) {
    const page = trangGia();
    const k = await chay("input.click", page, { selector: BTN, button: xau });
    assert.equal(k.ok, false, `button ${JSON.stringify(xau)} phải bị từ chối`);
    assert.equal(k.code, "BUTTON_NOT_ALLOWED");
    assert.deepEqual(page.goi("Input.dispatchMouseEvent"), [], "từ chối rồi thì không được bắn gì");
  }
  for (const xau of [0, 4, -1, 1.5, "2"]) {
    const page = trangGia();
    const k = await chay("input.click", page, { selector: BTN, click_count: xau });
    assert.equal(k.ok, false, `click_count ${JSON.stringify(xau)} phải bị từ chối`);
    assert.equal(k.code, "CLICK_COUNT_INVALID");
  }
}

/* ---- ⑥ RÊ CHUỘT: vẫn hỏi-điểm trước, và KHÔNG bấm --------------------
 * Hai vế, và vế thứ hai dễ mất nhất: một lượt rê chuột lỡ bắn thêm `mousePressed` là một lượt
 * bấm mà không ai gọi. */
{
  const page = trangGia();
  const k = await chay("input.hover", page, { selector: BTN });
  assert.equal(k.ok, true, JSON.stringify(k));
  assert.equal(page.goi("DOM.getNodeForLocation").length, 1, "rê chuột cũng phải hỏi-điểm trước");
  assert.deepEqual(page.goi("Input.dispatchMouseEvent").map((e) => e.params), [
    { type: "mouseMoved", x: 60, y: 40, button: "none", buttons: 0 }
  ], "rê chuột chỉ được bắn ĐÚNG một sự kiện di chuyển — không nhấn, không nhả");
  assert.deepEqual(k.data.hoveredAt, { x: 60, y: 40 });
  assert.equal(k.data.hit.relation, "self");
}
{
  /* Bị che thì TỪ CHỐI, y như lượt bấm: sự kiện sẽ tới CÁI CHE, còn ta thì báo thành công —
   * đúng lỗi `S-17`, chỉ đổi loại sự kiện. */
  const page = trangGia({ nutTrungDiem: 777 });
  const k = await chay("input.hover", page, { selector: BTN });
  assert.equal(k.ok, false);
  assert.deepEqual(page.goi("Input.dispatchMouseEvent"), [], "bị che thì không được bắn gì");
}

/* ---- ⑦ CUỘN: bốn hướng có tên, và toạ độ suy từ phần tử đã khớp ------- */
{
  const page = trangGia();
  const k = await chay("input.scroll", page, { selector: "body", direction: "down" });
  assert.equal(k.ok, true, JSON.stringify(k));
  assert.deepEqual(page.goi("Input.dispatchMouseEvent").map((e) => e.params), [
    { type: "mouseWheel", x: 60, y: 40, button: "none", buttons: 0, deltaX: 0, deltaY: 600 }
  ]);
  assert.equal(k.data.amount, 600, "không khai `amount` thì dùng mặc định, và NÓI RA nó là bao nhiêu");
}
{
  const page = trangGia();
  await chay("input.scroll", page, { selector: "body", direction: "up", amount: 150 });
  assert.deepEqual(page.goi("Input.dispatchMouseEvent")[0].params.deltaY, -150);
  const p2 = trangGia();
  await chay("input.scroll", p2, { selector: "body", direction: "right", amount: 80 });
  assert.deepEqual(
    [p2.goi("Input.dispatchMouseEvent")[0].params.deltaX, p2.goi("Input.dispatchMouseEvent")[0].params.deltaY],
    [80, 0], "cuộn ngang không được động tới trục dọc");
}
{
  /* CỐ Ý không hỏi-điểm: cuộn thứ đang nằm trên cùng tại điểm đó là ĐÚNG Ý — một lớp phủ cuộn
   * được thì cuộn nó mới là việc người gọi cần. Ghim để lượt sau không "sửa" nó thành giống
   * `input.click` vì trông có vẻ nhất quán hơn. */
  const page = trangGia({ nutTrungDiem: 777 });
  const k = await chay("input.scroll", page, { selector: "body", direction: "down" });
  assert.equal(k.ok, true, "cuộn KHÔNG hỏi-điểm — thứ nằm trên cùng chính là thứ cần cuộn");
  assert.deepEqual(page.goi("DOM.getNodeForLocation"), []);
}
{
  for (const xau of ["Down", "downward", "", "up down", 1]) {
    const page = trangGia();
    const k = await chay("input.scroll", page, { selector: "body", direction: xau });
    assert.equal(k.ok, false, `hướng ${JSON.stringify(xau)} phải bị từ chối`);
    assert.equal(k.code, "DIRECTION_NOT_ALLOWED");
  }
  for (const xau of [0, 5001, -100, 1.5, "600"]) {
    const page = trangGia();
    const k = await chay("input.scroll", page, { selector: "body", direction: "down", amount: xau });
    assert.equal(k.ok, false, `amount ${JSON.stringify(xau)} phải bị từ chối`);
    assert.equal(k.code, "SCROLL_AMOUNT_INVALID");
  }
  /* Hai đầu khoảng phải QUA — một cái trần chặn cả đường đúng sẽ bị gỡ. */
  for (const tot of [1, 5000]) {
    const page = trangGia();
    assert.equal((await chay("input.scroll", page, { selector: "body", direction: "down", amount: tot })).ok, true);
  }
}

/* ---- ⑧ LÙI / TIẾN: chỉ số tính Ở TRONG, đi đúng MỘT bước ------------- */
{
  const page = trangGia();
  const k = await chay("input.history", page, { direction: "back" });
  assert.equal(k.ok, true, JSON.stringify(k));
  /* Đang ở mục 1 (0-based) → lùi về mục 0, `entryId` 11. Một con số từ ngoài không có đường
   * nào tới đây: tham số duy nhất là chữ "back". */
  assert.deepEqual(page.goi("Page.navigateToHistoryEntry").map((e) => e.params), [{ entryId: 11 }]);
  assert.equal(k.data.url, "https://a.test/");
  assert.equal(k.data.from, "https://b.test/");
  assert.equal(k.data.entry, 1);
  assert.equal(k.data.entries, 3);
}
{
  const page = trangGia();
  const k = await chay("input.history", page, { direction: "forward" });
  assert.equal(k.ok, true);
  assert.deepEqual(page.goi("Page.navigateToHistoryEntry").map((e) => e.params), [{ entryId: 33 }]);
}

/* ---- ⑨ HẾT ĐƯỜNG THÌ ĐỎ, và KHÔNG gọi CDP -------------------------- */
{
  const dauDay = { currentIndex: 0, entries: [{ id: 11, url: "https://a.test/" }] };
  for (const huong of ["back", "forward"]) {
    const page = trangGia({ lichSu: dauDay, urlDau: "https://a.test/" });
    const k = await chay("input.history", page, { direction: huong });
    assert.equal(k.ok, false, `${huong} ở một lịch sử một mục phải ĐỎ`);
    assert.equal(k.code, "HISTORY_AT_END");
    assert.deepEqual(page.goi("Page.navigateToHistoryEntry"), [],
      "Chrome KHÔNG báo lỗi cho chỉ số ngoài khoảng — nên chỗ chặn phải là ở đây");
  }
}
{
  /* Đọc không ra lịch sử thì cũng ĐỎ: "không biết lùi sẽ đi đâu" phải xử như "không đi". */
  for (const xau of [{}, { currentIndex: 0, entries: [] }, { currentIndex: 9, entries: [{ id: 1 }] }, { currentIndex: -1, entries: [{ id: 1 }] }]) {
    const page = trangGia({ lichSu: xau });
    const k = await chay("input.history", page, { direction: "back" });
    assert.equal(k.ok, false, `lịch sử ${JSON.stringify(xau)} phải ĐỎ`);
    assert.equal(k.code, "HISTORY_UNREADABLE");
    assert.deepEqual(page.goi("Page.navigateToHistoryEntry"), []);
  }
}
{
  for (const xau of ["Back", "backward", "", "left", 1]) {
    const page = trangGia();
    const k = await chay("input.history", page, { direction: xau });
    assert.equal(k.ok, false, `hướng ${JSON.stringify(xau)} phải bị từ chối`);
    assert.equal(k.code, "DIRECTION_NOT_ALLOWED");
  }
}

/* ---- ⑩ Không có đường nào đưa toạ độ hay `entryId` từ NGOÀI vào ------
 * Chốt ⑶ của lõi ghi chặn theo HÌNH DẠNG tham số, nên nó còn sống sau khi ai đó thêm một hành
 * động mới. Ba hành động mới phải nằm dưới cùng cái chặn ấy — kể cả `input.history`, nơi cái
 * đáng sợ không phải toạ độ mà là một con trỏ tự do vào lịch sử duyệt web của Đức. */
{
  const doc = [
    ["input.scroll", { selector: "body", direction: "down" }],
    ["input.hover", { selector: BTN }],
    ["input.history", { direction: "back" }]
  ];
  for (const [ten, hop] of doc) {
    for (const doc1 of [{ x: 5 }, { y: 5 }, { nodeId: 3 }, { coordinate: [1, 2] }, { position: {} }]) {
      const page = trangGia();
      const k = await chay(ten, page, { ...hop, ...doc1 });
      assert.equal(k.ok, false, `${ten} nhận ${JSON.stringify(doc1)} — chốt ⑶ đã thủng`);
    }
    /* `entryId` cũng không phải một trường người gọi đặt được. */
    const page = trangGia();
    const k = await chay(ten, page, { ...hop, entryId: 33 });
    assert.equal(k.ok, true, `${ten}: trường lạ đi qua lõi thì bị LỜ, không được dùng`);
    if (ten === "input.history") {
      assert.deepEqual(page.goi("Page.navigateToHistoryEntry").map((e) => e.params), [{ entryId: 11 }],
        "một `entryId` từ ngoài KHÔNG được thắng chỉ số tính ở trong");
    }
  }
}

console.log("scouter-dilai-smoke: PASS (10 khoi)");
