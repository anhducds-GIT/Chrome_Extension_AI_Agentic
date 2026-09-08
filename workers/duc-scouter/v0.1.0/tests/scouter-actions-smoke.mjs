/* Phép ghim cho BA HÀNH ĐỘNG GHI — `scripts/scouter-actions-core.mjs`.
 *
 * Đề bài: `S-01`. Đây là lượt Scouter thôi làm người quan sát và thành kẻ hành động
 * (ADR-0009), nên phép ghim ở đây gánh nhiều hơn mọi phép ghim khác của gói: nó là thứ duy
 * nhất đứng giữa "bấm đúng một nút đã chỉ đích danh" và "bấm bất kỳ đâu trên màn hình".
 *
 * Luật ghim của repo (MULTIFLOW.md mục 5): ghim HÀNH VI, và ghim CẢ HAI CHIỀU — một bản
 * "luôn từ chối" phải ĐỎ y như một bản "luôn cho qua".
 *
 * Hai danh sách dưới đây KHAI LẠI TẠI ĐÂY, cố ý không import. Import là để cái được ghim tự
 * chấm điểm cho chính nó: ai nới danh sách trong module thì test cũng nới theo, và phép ghim
 * im lặng mất tác dụng.
 */

import assert from "node:assert/strict";

const { runAction, createWriteSender, ActionError, ACTION_NAMES, NAMED_KEY_NAMES } =
  await import("../scripts/scouter-actions-core.mjs");
const readOnly = await import("../scripts/observer-probes.mjs");

/* Bản khai ĐỘC LẬP của test. Đừng đồng bộ nó với module — lệch nhau là tín hiệu, không phải lỗi. */
const WRITE_EXPECTED = new Set([
  "DOM.enable",
  "DOM.getDocument",
  "DOM.querySelectorAll",
  "DOM.scrollIntoViewIfNeeded",
  "DOM.getBoxModel",
  "DOM.focus",
  "Input.dispatchMouseEvent",
  "Input.dispatchKeyEvent"
]);

/* Method KHÔNG được lọt qua cổng ghi, kể cả khi chúng cũng là lệnh "ghi". Mỗi cái một lý do:
 * `Runtime.*` chạy mã · `DOM.set*` sửa trang thẳng tay · `Network.setCookie` đụng phiên
 * đăng nhập · `Input.insertText` là lệnh THỬ NGHIỆM.
 *
 * `Page.navigate` ĐÃ RỜI danh sách này ngày 08/09 — Đức chốt mở, để Scouter đi được từ trang
 * danh mục sang trang chi tiết. Ghi rõ ở đây thay vì xoá lặng lẽ: một dòng biến mất khỏi danh
 * sách cấm mà không ai giải thích thì lượt sau không biết nó rơi ra hay bị gỡ.
 * `Page.reload` thì Ở LẠI: nạp lại trang không phải đi đâu cả, và Scouter đã có `scout.reload`
 * cho việc nạp lại chính nó. */
const BANNED = [
  "Runtime.evaluate",
  "Runtime.callFunctionOn",
  "DOM.setOuterHTML",
  "DOM.setAttributeValue",
  "DOM.removeNode",
  "DOMStorage.setDOMStorageItem",
  "Page.reload",
  "Network.setCookie",
  "Input.insertText",
  "Input.dispatchTouchEvent",
  "Emulation.setScriptExecutionDisabled"
];

const POISON = "'); doSomething(); ('";
const BTN = "#btn";

/* ---- Trang giả lập -------------------------------------------------------
 * Trả lời đúng bộ lệnh mà lõi được phép gửi, và GHI LẠI mọi lệnh — nên test đọc được cả
 * "đã gửi gì" lẫn "gửi theo thứ tự nào". */
function makeFakePage(options = {}) {
  const sent = [];
  const matchCount = options.matchCount === undefined ? 1 : options.matchCount;
  const box = options.box === undefined
    ? { content: [10, 20, 110, 20, 110, 60, 10, 60] }   // tâm = (60, 40)
    : options.box;

  return {
    sent,
    calls: (method) => sent.filter((entry) => entry.method === method),
    async sendRaw(method, params) {
      sent.push({ method, params });
      if (method === "DOM.getDocument") return { root: { nodeId: 1 } };
      if (method === "DOM.querySelectorAll") {
        if (options.selectorThrows) throw new Error("DOM Error while querying");
        return { nodeIds: Array.from({ length: matchCount }, (_value, index) => 100 + index) };
      }
      if (method === "DOM.getBoxModel") return box === null ? {} : { model: box };
      return {};
    }
  };
}

/* ---- ① Từ vựng CỐ ĐỊNH -------------------------------------------------- */
{
  assert.deepEqual([...ACTION_NAMES], ["input.click", "input.type", "input.key", "input.navigate"]);

  for (const bogus of ["input.drag", "input.scroll", "dom.query", "Input.dispatchMouseEvent", ""]) {
    const page = makeFakePage();
    const result = await runAction(bogus, { sendRaw: page.sendRaw }, { selector: BTN });
    assert.equal(result.ok, false, `tên lạ phải bị từ chối: ${bogus}`);
    assert.equal(result.code, "ACTION_UNKNOWN");
    assert.deepEqual(page.sent, [], "tên lạ không được gửi một lệnh CDP nào");
  }
}

/* ---- ② Chốt ⑵: cổng method CDP, và nó chặn cả lệnh ghi khác ------------- */
{
  const send = createWriteSender(async () => ({}), []);
  for (const method of BANNED) {
    await assert.rejects(
      () => send(method, {}),
      (error) => error instanceof ActionError && error.code === "CDP_METHOD_NOT_ALLOWED",
      `method ghi ngoài danh sách lọt qua: ${method}`
    );
  }
  /* Chiều NGƯỢC LẠI: method trong danh sách phải đi qua được, nếu không cổng này chặn oan tất cả. */
  for (const method of WRITE_EXPECTED) {
    assert.deepEqual(await send(method, {}), {}, `method hợp lệ bị chặn oan: ${method}`);
  }
}

/* ---- ③ Chốt ⑶: TOẠ ĐỘ không bao giờ nhận từ ngoài ----------------------- */
{
  for (const key of ["x", "y", "coordinate", "coordinates", "point", "position", "clientX", "clientY", "nodeId"]) {
    const page = makeFakePage();
    const result = await runAction("input.click", { sendRaw: page.sendRaw }, { selector: BTN, [key]: 999 });
    assert.equal(result.ok, false, `tham số chở toạ độ lọt qua: ${key}`);
    assert.equal(result.code, "COORDINATE_NOT_ACCEPTED");
    assert.deepEqual(page.sent, [], `${key}: một yêu cầu mang toạ độ không được gửi lệnh nào cả`);
  }
}

/* ---- ④ Chốt ⑷: selector phải khớp ĐÚNG MỘT ------------------------------ */
{
  for (const [matchCount, code] of [[0, "SELECTOR_NO_MATCH"], [2, "SELECTOR_AMBIGUOUS"], [7, "SELECTOR_AMBIGUOUS"]]) {
    const page = makeFakePage({ matchCount });
    const result = await runAction("input.click", { sendRaw: page.sendRaw }, { selector: BTN });
    assert.equal(result.ok, false, `khớp ${matchCount} mà vẫn bấm`);
    assert.equal(result.code, code);
    assert.deepEqual(page.calls("Input.dispatchMouseEvent"), [],
      `khớp ${matchCount}: không một khung chuột nào được phép rời đi`);
  }
}

/* ---- ⑤ Chiều NGƯỢC LẠI: khớp đúng một thì BẤM THẬT, đúng chuỗi đã đo ---- */
{
  const page = makeFakePage();
  const result = await runAction("input.click", { sendRaw: page.sendRaw }, { selector: BTN });
  assert.equal(result.ok, true, `bấm hợp lệ bị chặn: ${result.detail}`);
  assert.deepEqual(result.data.clickedAt, { x: 60, y: 40 }, "toạ độ phải là TÂM hộp của phần tử");

  const mouse = page.calls("Input.dispatchMouseEvent");
  assert.equal(mouse.length, 3, "phải đủ ba khung: mouseMoved, mousePressed, mouseReleased");
  assert.deepEqual(mouse.map((entry) => entry.params.type), ["mouseMoved", "mousePressed", "mouseReleased"],
    "thứ tự ba khung là thứ tự ĐÃ ĐO — đổi nó là đổi sang một chuỗi CHƯA ĐO");
  for (const frame of mouse) {
    assert.equal(frame.params.x, 60);
    assert.equal(frame.params.y, 40);
  }
  assert.equal(mouse[1].params.button, "left");
  assert.equal(mouse[1].params.clickCount, 1);

  /* Và không lệnh nào ngoài danh sách rời khỏi lõi. */
  for (const entry of page.sent) assert.ok(WRITE_EXPECTED.has(entry.method), `lệnh lạ: ${entry.method}`);
}

/* ---- ⑥ Phần tử không nhìn thấy thì KHÔNG bấm ---------------------------- */
{
  for (const box of [null, { content: [] }, { content: [1, 2, 3] }, { content: [NaN, 0, 1, 0, 1, 1, 0, 1] }]) {
    const page = makeFakePage({ box });
    const result = await runAction("input.click", { sendRaw: page.sendRaw }, { selector: BTN });
    assert.equal(result.ok, false, `hộp ${JSON.stringify(box)} mà vẫn bấm`);
    assert.equal(result.code, "ELEMENT_NOT_VISIBLE");
    assert.deepEqual(page.calls("Input.dispatchMouseEvent"), [], "không nhìn thấy thì không một khung nào rời đi");
  }
}

/* ---- ⑦ Gõ chữ: từng phím một, và cấm ký tự điều khiển ------------------- */
{
  const page = makeFakePage();
  const result = await runAction("input.type", { sendRaw: page.sendRaw }, { selector: "#txt", text: "aB9 z" });
  assert.equal(result.ok, true, result.detail);
  assert.equal(result.data.typed, 5);

  assert.equal(page.calls("DOM.focus").length, 1, "phải đặt tiêu điểm trước khi gõ");
  const keys = page.calls("Input.dispatchKeyEvent");
  assert.equal(keys.length, 10, "mỗi ký tự hai khung: keyDown và keyUp");
  assert.deepEqual(keys.slice(0, 2).map((entry) => entry.params.type), ["keyDown", "keyUp"]);
  assert.equal(keys[0].params.text, "a", "khung keyDown phải chở `text` — đó là thứ làm nên việc chèn");
  assert.equal(keys[0].params.unmodifiedText, "a");
  assert.equal(keys[0].params.code, "KeyA");
  assert.equal(keys[0].params.windowsVirtualKeyCode, 65);
  assert.equal(keys[2].params.code, "KeyB", "chữ hoa vẫn ra mã phím của chữ cái đó");
  assert.equal(keys[4].params.code, "Digit9");
  assert.equal(keys[6].params.code, "Space");

  /* Ky tu dieu khien dung String.fromCharCode, KHONG go tho vao nguon.
   * Truoc 08/09 hai byte 0x00 va 0x7f nam THO trong dong nay, va git coi CA FILE la binary —
   * diff cua no vo hinh vinh vien, nen khong ai review duoc mot thay doi nao trong file nay. */
  const DIEU_KHIEN = ["a\nb", "\t", "x" + String.fromCharCode(0), String.fromCharCode(127)];
  for (const bad of DIEU_KHIEN) {
    const page2 = makeFakePage();
    const result2 = await runAction("input.type", { sendRaw: page2.sendRaw }, { selector: "#txt", text: bad });
    assert.equal(result2.ok, false, `ký tự điều khiển lọt qua: ${JSON.stringify(bad)}`);
    assert.equal(result2.code, "TEXT_HAS_CONTROL_CHAR");
    assert.deepEqual(page2.calls("Input.dispatchKeyEvent"), []);
  }

  const empty = await runAction("input.type", { sendRaw: makeFakePage().sendRaw }, { selector: "#txt", text: "" });
  assert.equal(empty.code, "TEXT_REQUIRED");
  const tooLong = await runAction("input.type", { sendRaw: makeFakePage().sendRaw }, { selector: "#txt", text: "x".repeat(2001) });
  assert.equal(tooLong.code, "TEXT_TOO_LONG");
}

/* ---- ⑧ Phím có tên: bảng CỐ ĐỊNH, người gọi không bao giờ đưa mã phím --- */
{
  assert.deepEqual([...NAMED_KEY_NAMES].sort(),
    ["ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp", "Backspace", "Delete", "End", "Enter", "Escape", "Home", "Tab"]);

  for (const bad of ["F5", "a", "Meta", "ctrl+a", "", 13, null]) {
    const page = makeFakePage();
    const result = await runAction("input.key", { sendRaw: page.sendRaw }, { selector: BTN, key: bad });
    assert.equal(result.ok, false, `phím ngoài bảng lọt qua: ${JSON.stringify(bad)}`);
    assert.equal(result.code, "KEY_NOT_ALLOWED");
    assert.deepEqual(page.calls("Input.dispatchKeyEvent"), []);
  }

  /* Chiều ngược lại: mọi phím TRONG bảng phải gõ được. */
  for (const name of NAMED_KEY_NAMES) {
    const page = makeFakePage();
    const result = await runAction("input.key", { sendRaw: page.sendRaw }, { selector: BTN, key: name });
    assert.equal(result.ok, true, `phím hợp lệ bị chặn oan: ${name} — ${result.detail}`);
    const keys = page.calls("Input.dispatchKeyEvent");
    assert.equal(keys.length, 2, `${name}: phải đủ keyDown và keyUp`);
    assert.equal(keys[0].params.key, name);
    assert.ok(Number.isInteger(keys[0].params.windowsVirtualKeyCode) && keys[0].params.windowsVirtualKeyCode > 0,
      `${name}: mã phím phải do BẢNG cấp, không phải do người gọi`);
  }
  /* Enter chở `text` (nó chèn xuống dòng); các phím điều hướng thì không. */
  const enter = makeFakePage();
  await runAction("input.key", { sendRaw: enter.sendRaw }, { selector: BTN, key: "Enter" });
  assert.equal(enter.calls("Input.dispatchKeyEvent")[0].params.text, "\r");
  const arrow = makeFakePage();
  await runAction("input.key", { sendRaw: arrow.sendRaw }, { selector: BTN, key: "ArrowUp" });
  assert.equal(arrow.calls("Input.dispatchKeyEvent")[0].params.text, undefined);
}

/* ---- ⑨ Selector là DỮ LIỆU: nó đi làm tham số giao thức, không thành mã -- */
{
  const page = makeFakePage();
  await runAction("input.click", { sendRaw: page.sendRaw }, { selector: POISON });
  const query = page.calls("DOM.querySelectorAll")[0];
  assert.equal(query.params.selector, POISON, "selector bị sửa trên đường đi");
  for (const entry of page.sent) {
    assert.ok(!String(entry.method).startsWith("Runtime."), "không có đường nào chạy JS trên trang");
  }

  /* Selector sai cú pháp dừng lại dưới dạng LỖI CSS, không phải một lượt bấm bừa. */
  const broken = makeFakePage({ selectorThrows: true });
  const result = await runAction("input.click", { sendRaw: broken.sendRaw }, { selector: "((" });
  assert.equal(result.code, "SELECTOR_INVALID");
  assert.deepEqual(broken.calls("Input.dispatchMouseEvent"), []);

  for (const bad of [undefined, "", "   ", 42, "x".repeat(1025)]) {
    const page2 = makeFakePage();
    const result2 = await runAction("input.click", { sendRaw: page2.sendRaw }, { selector: bad });
    assert.equal(result2.ok, false, `selector hỏng lọt qua: ${JSON.stringify(bad)}`);
    assert.deepEqual(page2.sent, []);
  }
}

/* ---- ⑩ LÕI ĐỌC VẪN LÀ LÕI ĐỌC — đây là vế quan trọng nhất của cả lượt ----
 * S-01 mở một đường ghi. Cái phải KHÔNG đổi là bất biến của lõi đọc: sau lượt này
 * `observer-probes.mjs` vẫn không có một lệnh ghi nào trong danh sách của nó. Ghim ở đây,
 * trong file của đường ghi, để ai mở đường ghi rộng thêm sẽ đọc thấy ngay vế này. */
{
  for (const method of ["Input.dispatchMouseEvent", "Input.dispatchKeyEvent", "Input.insertText", "DOM.focus", "DOM.getBoxModel", "DOM.scrollIntoViewIfNeeded"]) {
    assert.ok(!readOnly.READ_ONLY_CDP_METHODS.includes(method),
      `lệnh ghi "${method}" đã lọt vào danh sách READ-ONLY — bất biến của ADR-0007 vừa chết`);
  }
  const roSend = readOnly.createReadOnlySender(async () => ({}), []);
  await assert.rejects(
    () => roSend("Input.dispatchMouseEvent", {}),
    (error) => error.code === "CDP_METHOD_NOT_ALLOWED",
    "cổng read-only phải vẫn từ chối chuột, kể cả sau khi đường ghi đã mở ở file khác"
  );
}

/* ---- ⑨ input.navigate — ĐI SANG TRANG KHÁC (mở 08/09, Đức chốt) --------
 *
 * Đồng hồ và giấc ngủ đều TIÊM VÀO, nên phép ghim không chờ thật một giây nào. Một phép ghim
 * chờ thật là một phép ghim sẽ bị ai đó tắt đi.
 */
function trangDiDuoc({ urlDau = "https://a.test/1", buocDoi = 1, urlSau = "https://a.test/2", loi = null } = {}) {
  const sent = [];
  let lan = 0;
  const sendRaw = async (method, params = {}) => {
    sent.push({ method, params });
    if (method === "Page.navigate") return loi ? { errorText: loi } : { frameId: "F1" };
    if (method === "Target.getTargetInfo") {
      lan += 1;
      return { targetInfo: { url: lan > buocDoi ? urlSau : urlDau, type: "page" } };
    }
    if (method === "DOM.getDocument") return { root: { nodeId: 1 } };
    throw new Error("trang giả không hiểu " + method);
  };
  return { sendRaw, sent };
}

const DONG_HO = () => { let t = 0; return { now: () => (t += 100), cho: async () => {} }; };

{
  /* ⑴ Đường ĐÚNG: gửi Page.navigate, đợi url đổi, và chỉ xong khi ĐỌC ĐƯỢC tài liệu. */
  const trang = trangDiDuoc();
  const dh = DONG_HO();
  const kq = await runAction("input.navigate", { sendRaw: trang.sendRaw, ...dh }, { url: "https://a.test/2" });
  assert.equal(kq.ok, true, kq.detail);
  assert.equal(kq.data.url, "https://a.test/2");
  assert.equal(kq.data.from, "https://a.test/1", "phải nói rõ đi TỪ đâu");
  assert.equal(kq.data.redirected, false);
  assert.ok(trang.sent.some((c) => c.method === "Page.navigate" && c.params.url === "https://a.test/2"));
  assert.ok(trang.sent.some((c) => c.method === "DOM.getDocument"),
    "không đọc tài liệu thì 'tới nơi' chỉ là url đổi, và lượt scout.page ngay sau sẽ đọc trang rỗng");

  /* ⑵ Chuyển hướng KHÔNG phải lỗi — nhưng phải được KHAI ra, không im lặng. */
  const ch = trangDiDuoc({ urlSau: "https://a.test/da-chuyen-huong" });
  const kq2 = await runAction("input.navigate", { sendRaw: ch.sendRaw, ...DONG_HO() }, { url: "https://a.test/2" });
  assert.equal(kq2.ok, true);
  assert.equal(kq2.data.redirected, true, "tới một url khác mà không khai là nói dối người gọi");
  assert.equal(kq2.data.url, "https://a.test/da-chuyen-huong");
  assert.equal(kq2.data.requested, "https://a.test/2", "phải giữ cả url đã XIN để đối chiếu được");

  /* ⑶ Chrome từ chối đi: Page.navigate trả 200 KÈM errorText. Bỏ qua trường đó là báo thành
   * công cho một lượt chưa bao giờ rời trang cũ. */
  const tuChoi = trangDiDuoc({ loi: "net::ERR_BLOCKED_BY_CLIENT" });
  const kq3 = await runAction("input.navigate", { sendRaw: tuChoi.sendRaw, ...DONG_HO() }, { url: "https://a.test/2" });
  assert.equal(kq3.ok, false);
  assert.equal(kq3.code, "NAVIGATE_REFUSED");
  assert.ok(kq3.detail.includes("ERR_BLOCKED_BY_CLIENT"), "phải chở nguyên văn lý do của Chrome");

  /* ⑷ Không bao giờ tới nơi thì phải ĐỎ, không được treo im lặng. */
  const treo = trangDiDuoc({ buocDoi: 99999 });
  const kq4 = await runAction("input.navigate", { sendRaw: treo.sendRaw, ...DONG_HO() },
    { url: "https://a.test/2", timeout_ms: 1000 });
  assert.equal(kq4.ok, false);
  assert.equal(kq4.code, "NAVIGATE_TIMEOUT");
  assert.ok(kq4.detail.includes("a.test/1"), "câu lỗi phải nói ĐANG Ở ĐÂU, không chỉ nói hết giờ");
}

{
  /* ⑸ Chỉ http(s). Ba lối thoát khác nhau ra khỏi 'đi tới một trang web'. */
  const xau = [
    "javascript:alert(1)",
    "file:///C:/Windows/win.ini",
    "chrome-extension://abcdefghijklmnopabcdefghijklmnop/x.html",
    "data:text/html,<b>x",
    "khong-phai-url",
    ""
  ];
  for (const url of xau) {
    const trang = trangDiDuoc();
    const kq = await runAction("input.navigate", { sendRaw: trang.sendRaw, ...DONG_HO() }, { url });
    assert.equal(kq.ok, false, `url xấu vẫn lọt: ${JSON.stringify(url)}`);
    assert.equal(kq.code, "URL_INVALID", `mã sai cho ${JSON.stringify(url)}`);
    assert.deepEqual(trang.sent, [], `${JSON.stringify(url)}: đã bị từ chối mà vẫn gửi lệnh CDP`);
  }

  /* ⑹ Chiều ngược lại: hạn chờ hợp lệ phải đi lọt, hạn chờ vô lý phải đỏ. Thiếu vế đầu thì
   * một bản 'từ chối tất cả' vẫn xanh. */
  for (const t of [1000, 15000, 60000]) {
    const kq = await runAction("input.navigate", { sendRaw: trangDiDuoc().sendRaw, ...DONG_HO() },
      { url: "https://a.test/2", timeout_ms: t });
    assert.equal(kq.ok, true, `timeout_ms hợp lệ bị chặn oan: ${t}`);
  }
  for (const t of [0, 999, 60001, 1.5, "5000", null]) {
    const kq = await runAction("input.navigate", { sendRaw: trangDiDuoc().sendRaw, ...DONG_HO() },
      { url: "https://a.test/2", timeout_ms: t });
    if (t === null) { assert.equal(kq.ok, true, "null = không khai, phải dùng mặc định"); continue; }
    assert.equal(kq.ok, false, `timeout_ms vô lý vẫn lọt: ${t}`);
    assert.equal(kq.code, "TIMEOUT_INVALID");
  }
}

console.log("scouter-actions smoke tests: PASS");
