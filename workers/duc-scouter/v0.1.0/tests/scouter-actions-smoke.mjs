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
  /* Thêm 12/09 cùng chốt ⑸ (`S-17`), Đức chốt D1. Khai lại ở đây là một LỜI KHAI có chủ ý,
   * không phải đồng bộ máy móc: dòng này nói "test biết đường ghi vừa mở thêm đúng một cửa,
   * và cửa đó tên là gì". */
  "DOM.getNodeForLocation",
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
  /* Con cháu của phần tử đã khớp (nodeId 100). Nút thật hay là `<button><svg><path>`, nên
   * trang giả cũng phải có con cháu — không thì phép ghim "nút có icon" không dựng được. */
  const conChau = options.conChau === undefined ? [201, 202] : options.conChau;
  /* Phần tử nằm TRÊN CÙNG tại điểm sắp bấm. Mặc định là chính phần tử đã khớp: trang bình
   * thường thì không có gì chắn. `null` = Chrome không trả lời được. */
  const nutTrungDiem = options.nutTrungDiem === undefined ? 100 : options.nutTrungDiem;

  return {
    sent,
    calls: (method) => sent.filter((entry) => entry.method === method),
    async sendRaw(method, params) {
      sent.push({ method, params });
      if (method === "DOM.getDocument") return { root: { nodeId: 1 } };
      if (method === "DOM.querySelectorAll") {
        if (options.selectorThrows) throw new Error("DOM Error while querying");
        /* Hỏi từ GỐC tài liệu là đi tìm phần tử; hỏi từ một phần tử là đi tìm con cháu nó.
         * Trang giả phải phân biệt hai lượt hỏi đó, không thì phép ghim "lớp phủ chắn ngang"
         * tự thoả oan vì lớp phủ có mặt trong chính danh sách khớp. */
        if (params?.nodeId !== 1) {
          if (options.conChauThrows) throw new Error("DOM Error while listing children");
          return { nodeIds: conChau };
        }
        return { nodeIds: Array.from({ length: matchCount }, (_value, index) => 100 + index) };
      }
      if (method === "DOM.getBoxModel") return box === null ? {} : { model: box };
      if (method === "DOM.getNodeForLocation") {
        /* Chrome ném thật, đo được 12/09 trên một tab nó KHÔNG ĐANG VẼ. Cùng trang, cùng toạ
         * độ, vài phút trước thì trả lời bình thường. */
        if (options.hoiHong) throw new Error("{\"code\":-32000,\"message\":\"No node found at given location\"}");
        return nutTrungDiem === null ? {} : { nodeId: nutTrungDiem, backendNodeId: 9000 + nutTrungDiem };
      }
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

  /* Vế NGƯỢC LẠI của việc dùng chung: hai getter dưới đây nằm trong CẢ HAI danh sách, và
   * chúng phải nằm trong cả hai bằng HAI DÒNG KHAI RIÊNG. Con này ĐỎ đúng lúc ai đó "dọn
   * trùng lặp" bằng cách cho một lõi import danh sách của lõi kia — lúc đó hai lõi chung một
   * danh sách, và nới cho bên này là nới luôn cho bên kia, một lượt, không ai thấy. */
  for (const method of ["DOM.getBoxModel", "DOM.getNodeForLocation"]) {
    assert.ok(WRITE_EXPECTED.has(method), `đường ghi phải TỰ khai "${method}"`);
    assert.ok(readOnly.READ_ONLY_CDP_METHODS.includes(method), `đường đọc phải TỰ khai "${method}"`);
  }
  for (const method of ["Input.dispatchMouseEvent", "Page.navigate"]) {
    assert.ok(!readOnly.READ_ONLY_CDP_METHODS.includes(method),
      `hai danh sách vừa bị gộp làm một: "${method}" của đường ghi đã có mặt bên đường đọc`);
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

/* ---- ⑥b Chốt ⑸ (`S-17`): điểm sắp bấm phải thuộc về phần tử đã khớp ------
 *
 * Đây là phép ghim cho kiểu hỏng ĐẮT NHẤT của gói: lượt bấm NÓI DỐI. Trước 12/09, một lớp
 * phủ chắn ngang thì chuột trúng lớp phủ và `input.click` vẫn trả `ok: true`. Ghim CẢ HAI
 * CHIỀU — một bản "luôn từ chối" phải ĐỎ y như một bản "luôn cho qua". */
{
  /* ⓐ Có lớp phủ: TỪ CHỐI, và không một khung chuột nào được rời đi. */
  const che = makeFakePage({ nutTrungDiem: 777 });
  const rChe = await runAction("input.click", { sendRaw: che.sendRaw }, { selector: BTN });
  assert.equal(rChe.ok, false, "có lớp phủ chắn ngang mà vẫn bấm — đúng chỗ hỏng S-17");
  assert.equal(rChe.code, "CLICK_OBSCURED", "lớp phủ phải có mã lỗi RIÊNG, không gộp vào ACTION_FAILED");
  assert.deepEqual(che.calls("Input.dispatchMouseEvent"), [],
    "bị chắn thì không một khung chuột nào được rời đi");

  /* ⓑ Chiều NGƯỢC LẠI — nút có icon KHÔNG được từ chối oan. Nút thật hay là
   * `<button><svg><path>`, tâm hộp rơi vào `<path>`; chỉ nhận đúng nút thì mọi nút có icon
   * chết oan, và chốt này sẽ bị ai đó gỡ vì "nó chặn việc thật". */
  const icon = makeFakePage({ nutTrungDiem: 202, conChau: [201, 202] });
  const rIcon = await runAction("input.click", { sendRaw: icon.sendRaw }, { selector: BTN });
  assert.equal(rIcon.ok, true, `nút có icon bị từ chối oan: ${rIcon.detail}`);
  assert.equal(rIcon.data.hit.relation, "descendant");
  assert.equal(icon.calls("Input.dispatchMouseEvent").length, 3, "nút có icon vẫn phải đủ ba khung");

  /* ⓒ Trang bình thường: điểm trúng chính phần tử đã khớp. */
  const thang = makeFakePage();
  const rThang = await runAction("input.click", { sendRaw: thang.sendRaw }, { selector: BTN });
  assert.equal(rThang.ok, true, rThang.detail);
  assert.deepEqual(rThang.data.hit, { relation: "self", hitNodeId: 100 });

  /* ⓓ Chrome không trả lời được: HỎNG THÌ ĐÓNG, và bằng một mã lỗi KHÁC. "Có thứ chắn" và
   * "không kiểm được" dẫn tới hai cách sửa khác nhau. */
  for (const [nutTrungDiem, conChauThrows] of [[null, false], [777, true]]) {
    const mu = makeFakePage({ nutTrungDiem, conChauThrows });
    const rMu = await runAction("input.click", { sendRaw: mu.sendRaw }, { selector: BTN });
    assert.equal(rMu.ok, false, "không kiểm được mà vẫn bấm");
    assert.equal(rMu.code, "CLICK_HIT_TEST_FAILED");
    assert.deepEqual(mu.calls("Input.dispatchMouseEvent"), [], "không kiểm được thì không bấm");
  }

  /* ⓓ2 Chrome NÉM chứ không trả lời: cũng phải thành `CLICK_HIT_TEST_FAILED`, và câu tiếng
   * Anh thô của CDP KHÔNG được đi thẳng ra ngoài dây một mình. Người đọc "No node found at
   * given location" sẽ đi sửa selector, trong khi nguyên nhân đo được là tab không đang được
   * vẽ — một quãng đường dài đi sai hướng. */
  {
    const nem = makeFakePage({ hoiHong: true });
    const rNem = await runAction("input.click", { sendRaw: nem.sendRaw }, { selector: BTN });
    assert.equal(rNem.ok, false);
    assert.equal(rNem.code, "CLICK_HIT_TEST_FAILED", "lỗi CDP thô đang lọt ra ngoài dưới mã ACTION_FAILED");
    assert.match(rNem.detail, /S-21/, "câu báo lỗi phải trỏ tới mục sổ nợ đang theo dõi ca này, không chỉ chép lại lỗi CDP");
    assert.ok(rNem.detail.includes("No node found at given location"),
      "…và vẫn phải giữ NGUYÊN VĂN lời Chrome nói, đừng nuốt mất bằng chứng");
    /* Nguyên nhân CHƯA BIẾT, nên câu báo lỗi không được nói như thể đã biết. Con này ĐỎ đúng
     * lúc ai đó "cho gọn" bằng một chẩn đoán nghe có thẩm quyền mà chưa ai đo. */
    assert.ok(/[Cc]hưa biết vì sao/.test(rNem.detail),
      "đừng khẳng định nguyên nhân khi chưa đo được nó");
    assert.deepEqual(nem.calls("Input.dispatchMouseEvent"), []);
  }

  /* ⓔ HỎI VỀ ĐÚNG CÁI ĐIỂM SẼ BẤM. Hỏi một điểm rồi bấm một điểm khác thì chốt ⑸ chỉ còn là
   * đồ trang trí — và nửa pixel là đủ để lệch, vì hai đầu làm tròn theo hai kiểu. */
  const diem = makeFakePage({ box: { content: [10, 20, 111, 20, 111, 61, 10, 61] } });
  const rDiem = await runAction("input.click", { sendRaw: diem.sendRaw }, { selector: BTN });
  assert.equal(rDiem.ok, true, rDiem.detail);
  const hoi = diem.calls("DOM.getNodeForLocation");
  assert.equal(hoi.length, 1, "hỏi đúng một lần mỗi lượt bấm");
  for (const khung of diem.calls("Input.dispatchMouseEvent")) {
    assert.equal(khung.params.x, hoi[0].params.x, "bấm vào x khác với x đã hỏi");
    assert.equal(khung.params.y, hoi[0].params.y, "bấm vào y khác với y đã hỏi");
  }
  assert.ok(Number.isInteger(hoi[0].params.x) && Number.isInteger(hoi[0].params.y),
    "DOM.getNodeForLocation chỉ nhận số nguyên");

  /* ⓕ THỨ TỰ: hỏi TRƯỚC khi bắn. Hỏi sau thì chuột đã đi rồi và câu trả lời chỉ còn là lời
   * phân trần — bản vá vẫn "chạy đúng" trên mọi phép ghim chỉ nhìn kết quả cuối. */
  const ten = thang.sent.map((entry) => entry.method);
  assert.ok(ten.indexOf("DOM.getNodeForLocation") < ten.indexOf("Input.dispatchMouseEvent"),
    "phải hỏi điểm TRƯỚC khi bắn khung chuột đầu tiên");
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
  /* Danh sách này từng có `DOM.getBoxModel`, và ngày 12/09 nó RỜI ĐI — Đức chốt, để lõi đọc
   * làm được `dom.wait state:"usable"` (`S-18`). Ghi rõ chỗ này thay vì xoá lặng lẽ.
   *
   * Vì sao rời đi được, trong khi năm cái còn lại thì KHÔNG: bảng cũ trộn hai loại vào một
   * danh sách — "lệnh mà đường ghi dùng" và "lệnh THẬT SỰ ghi". `DOM.getBoxModel` thuộc loại
   * thứ nhất: nó hỏi hộp của phần tử nằm ở đâu, và không đổi một thứ gì trên trang. Đúng
   * hạng với `DOM.querySelectorAll`, thứ đã nằm trong CẢ HAI danh sách từ đầu mà không ai
   * thấy lạ.
   *
   * Năm cái còn lại ĐỔI TRẠNG THÁI, và đó là ranh giới thật, không phải thói quen:
   *   · `Input.*`                    — sinh ra sự kiện chuột và phím
   *   · `DOM.focus`                  — chuyển tiêu điểm sang phần tử khác
   *   · `DOM.scrollIntoViewIfNeeded` — xê dịch trang. Một phép dò không được tự ý xê dịch
   *     thứ nó đang quan sát, và lõi đọc CỐ Ý không có nó — kể cả sau lượt 12/09. */
  for (const method of ["Input.dispatchMouseEvent", "Input.dispatchKeyEvent", "Input.insertText", "DOM.focus", "DOM.scrollIntoViewIfNeeded"]) {
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
    /* CỐ Ý KHÔNG có `backendNodeId`: trang giả này dựng một Chrome KHÔNG cho biết danh tính
     * tài liệu. Nhờ vậy cả khối ⑨ bên dưới ghim đúng một thứ — đường lùi về hành vi cũ, chỉ
     * còn dấu hiệu url. Ca danh tính tài liệu có trang giả riêng ở khối ⑨b. */
    if (method === "DOM.getDocument") return { root: { nodeId: 1 } };
    throw new Error("trang giả không hiểu " + method);
  };
  return { sendRaw, sent };
}

/* Trang giả thứ hai: Chrome CÓ cho biết danh tính tài liệu (`S-19`, 12/09).
 * `doiTaiLieuTuLuot` = từ lượt hỏi thứ mấy thì tài liệu được thay mới; `Infinity` = không
 * bao giờ (trang chết hẳn, không tải lại gì). `urlLuon` giữ NGUYÊN một url suốt lượt — đó
 * chính là ca F5 mà bản cũ không làm được. */
function trangCoDanhTinh({ urlLuon = "https://a.test/1", doiTaiLieuTuLuot = 2, urlDoiTuLuot = Infinity, urlMoi = "https://a.test/khac", docHongToiLuot = 0 } = {}) {
  const sent = [];
  let hoiUrl = 0;
  let hoiDoc = 0;
  const sendRaw = async (method, params = {}) => {
    sent.push({ method, params });
    if (method === "Page.navigate") return { frameId: "F1" };
    if (method === "Target.getTargetInfo") {
      hoiUrl += 1;
      return { targetInfo: { url: hoiUrl > urlDoiTuLuot ? urlMoi : urlLuon, type: "page" } };
    }
    if (method === "DOM.getDocument") {
      hoiDoc += 1;
      if (hoiDoc <= docHongToiLuot) throw new Error("Inspector protocol error: document not available");
      return { root: { nodeId: 1, backendNodeId: hoiDoc > doiTaiLieuTuLuot ? 555 : 111 } };
    }
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

/* ---- ⑨b `S-19` — NẠP LẠI cùng một URL (vá 12/09) ------------------------
 *
 * Bản cũ chỉ chờ url đổi, nên đi tới đúng url đang đứng là treo hết 15 giây rồi trả
 * `NAVIGATE_TIMEOUT` — **một câu sai nguyên nhân**, trong khi trang đã tải lại thật. Đo hai
 * lần ngoài đời 12/09: trên Udin, rồi lại trên một trang tự dựng. */
{
  /* ⓐ F5: url Y HỆT từ đầu tới cuối, tài liệu được thay mới → phải XONG, không được treo. */
  const f5 = trangCoDanhTinh({ doiTaiLieuTuLuot: 2 });
  const r = await runAction("input.navigate", { sendRaw: f5.sendRaw, ...DONG_HO() },
    { url: "https://a.test/1", timeout_ms: 5000 });
  assert.equal(r.ok, true, `nạp lại cùng URL vẫn treo — đúng chỗ hỏng S-19: ${r.detail}`);
  assert.equal(r.data.url, "https://a.test/1");
  assert.equal(r.data.from, "https://a.test/1");
  assert.equal(r.data.reloaded, true, "url đi và đến giống nhau thì phải khai là một lượt NẠP LẠI");
  assert.equal(r.data.arrivedBy, "new_document", "biết đã tới nơi nhờ tài liệu mới, không nhờ url");
  assert.equal(r.data.redirected, false);

  /* ⓑ Chiều NGƯỢC LẠI: tài liệu KHÔNG bao giờ được thay mới và url cũng không đổi → phải ĐỎ.
   * Thiếu vế này thì một bản "cứ có tài liệu là xong" vẫn xanh trọn, và `input.navigate`
   * thành một lệnh luôn báo thành công. */
  const chet = trangCoDanhTinh({ doiTaiLieuTuLuot: Infinity });
  const rChet = await runAction("input.navigate", { sendRaw: chet.sendRaw, ...DONG_HO() },
    { url: "https://a.test/1", timeout_ms: 1000 });
  assert.equal(rChet.ok, false, "không tải lại gì mà vẫn báo đã tới nơi");
  assert.equal(rChet.code, "NAVIGATE_TIMEOUT");
  /* Và câu lỗi phải nói ĐÚNG hai điều đã quan sát được — đây mới là chỗ đắt của S-19: không
   * phải treo, mà là treo RỒI NÓI SAI NGUYÊN NHÂN. */
  assert.match(rChet.detail, /url KHÔNG đổi/, "phải nói rõ trục url");
  assert.match(rChet.detail, /KHÔNG phải một tài liệu mới/, "phải nói rõ trục tài liệu");

  /* ⓒ Điều hướng TRONG CÙNG tài liệu (kiểu `#muc-2`): url đổi, tài liệu KHÔNG đổi → vẫn phải
   * XONG. Đây là ca mà dấu hiệu "tài liệu mới" MỘT MÌNH sẽ treo oan. */
  const neo = trangCoDanhTinh({ doiTaiLieuTuLuot: Infinity, urlDoiTuLuot: 1, urlMoi: "https://a.test/1#muc-2" });
  const rNeo = await runAction("input.navigate", { sendRaw: neo.sendRaw, ...DONG_HO() },
    { url: "https://a.test/1#muc-2", timeout_ms: 5000 });
  assert.equal(rNeo.ok, true, `điều hướng trong cùng tài liệu bị treo oan: ${rNeo.detail}`);
  assert.equal(rNeo.data.arrivedBy, "url_change", "ca này biết nhờ url, không nhờ tài liệu");
  assert.equal(rNeo.data.reloaded, false);

  /* ⓓ0 KHÔNG đọc được tài liệu TRƯỚC lúc đi → danh tính cũ là KHÔNG BIẾT, không phải "khác
   * mọi con số". Bỏ chốt này thì lượt điều hướng nào cũng xong ngay nhịp đầu: nhịp đó so một
   * con số thật với `undefined`, thấy khác nhau, và gọi đó là "tài liệu mới".
   *
   * Con đột biến `HN4` SỐNG SÓT lúc mới thêm — tức là chốt này từng chỉ là một dòng bình
   * luận. Phép ghim dưới đây là thứ giết được nó. */
  const muDau = trangCoDanhTinh({ docHongToiLuot: 1, doiTaiLieuTuLuot: Infinity });
  const rMuDau = await runAction("input.navigate", { sendRaw: muDau.sendRaw, ...DONG_HO() },
    { url: "https://a.test/1", timeout_ms: 1000 });
  assert.equal(rMuDau.ok, false,
    "không biết tài liệu CŨ là gì mà vẫn kết luận có tài liệu MỚI — đó là so với `undefined`");
  assert.equal(rMuDau.code, "NAVIGATE_TIMEOUT");
  assert.match(rMuDau.detail, /không cho biết danh tính tài liệu/,
    "không đọc được tài liệu trước lúc đi thì cũng phải khai là đang thiếu một trục đo");

  /* ⓓ Chrome KHÔNG cho biết danh tính tài liệu → lùi về đúng hành vi cũ, và NÓI RA là nó đang
   * thiếu một trục. Thoái lui êm thì được; thoái lui im lặng thì không. */
  const mu = trangDiDuoc({ buocDoi: 99999 });
  const rMu = await runAction("input.navigate", { sendRaw: mu.sendRaw, ...DONG_HO() },
    { url: "https://a.test/2", timeout_ms: 1000 });
  assert.equal(rMu.ok, false);
  assert.equal(rMu.code, "NAVIGATE_TIMEOUT");
  assert.match(rMu.detail, /không cho biết danh tính tài liệu/,
    "thiếu một trục đo mà không nói ra là để người đọc tin vào một phép kiểm không hề chạy");
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
  /* Trần HẠ TỪ 60000 XUỐNG 30000 ngày 12/09 (`S-16`) — đổi có chủ ý, không phải chỉnh cho
   * xanh: máy chủ Bridge cắt lượt chuyển tiếp ở 35 giây, nên một hạn chờ 60 giây chỉ mua được
   * một lời nói dối. `60000` chuyển từ danh sách HỢP LỆ sang danh sách VÔ LÝ ở ngay dưới. */
  for (const t of [1000, 15000, 30000]) {
    const kq = await runAction("input.navigate", { sendRaw: trangDiDuoc().sendRaw, ...DONG_HO() },
      { url: "https://a.test/2", timeout_ms: t });
    assert.equal(kq.ok, true, `timeout_ms hợp lệ bị chặn oan: ${t}`);
  }
  for (const t of [0, 999, 30001, 60000, 1.5, "5000", null]) {
    const kq = await runAction("input.navigate", { sendRaw: trangDiDuoc().sendRaw, ...DONG_HO() },
      { url: "https://a.test/2", timeout_ms: t });
    if (t === null) { assert.equal(kq.ok, true, "null = không khai, phải dùng mặc định"); continue; }
    assert.equal(kq.ok, false, `timeout_ms vô lý vẫn lọt: ${t}`);
    assert.equal(kq.code, "TIMEOUT_INVALID");
  }
}

console.log("scouter-actions smoke tests: PASS");
