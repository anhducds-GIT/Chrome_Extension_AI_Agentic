// Test ghim cho `readTurns` — lõi của lệnh Bridge `chat.read`, thứ cho AI vận
// hành ĐỌC được nội dung hội thoại Gemini thay vì phải nhờ mắt Đức.
//
// Hàm đó CỐ Ý thuần: nhận `doc` và hai selector, không đọc một biến ngoài nào.
// Nhờ vậy phép kiểm này chạy CHÍNH đoạn mã đang chạy trên trang thật, trích
// thẳng từ `content.js`, chứ không chạy một bản chép.
//
// Ba trạng thái trả về PHẢI phân biệt được, và đó là điểm đáng canh nhất:
//   OK                  · có lượt, có chữ
//   MATCHED_BUT_NO_TEXT · khung thật, trang chưa có chữ
//   NO_TURNS_MATCHED    · SELECTOR ĐÃ CHẾT
// Gộp hai cái sau lại là bắt người đọc phân biệt "hội thoại trống" với "selector
// chết" — hai kết luận chỉ về hai hướng ngược nhau. Một cái bảo chờ thêm, một
// cái bảo đi sửa selector.

import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("../", import.meta.url);
const source = fs.readFileSync(new URL("content.js", root), "utf8");

const than = /function readTurns\(doc, assistantSel, userSel, limit, maxChars\) \{[\s\S]*?\n  \}/.exec(source);
assert.ok(than, "trích được readTurns ra khỏi content.js — neo hỏng thì phép kiểm này vô nghĩa, nên nó phải nổ");
const readTurns = new Function(`${than[0]}\nreturn readTurns;`)();

/* ---- DOM giả, đủ đúng để hàm thật chạy ----------------------------------- */

const tach = (sel) => String(sel).split(",").map((part) => part.trim()).filter(Boolean);

function el(tag, text, { id = "", attrs = {} } = {}) {
  return {
    tag,
    id,
    innerText: text,
    textContent: text,
    attributes: Object.keys(attrs).map((name) => ({ name })),
    matches: (sel) => tach(sel).includes(tag),
    getAttribute: (name) => (Object.hasOwn(attrs, name) ? attrs[name] : null),
  };
}

const doc = (elements) => ({
  querySelectorAll: (sel) => (sel === "*" ? elements : elements.filter((e) => tach(sel).includes(e.tag))),
});

// Tên thẻ THẬT của Gemini, đọc từ `provider-adapter.js` chứ không gõ tay ở đây:
// selector nào đổi thì phép kiểm phải đi theo, không được đứng yên nói dối.
const adapter = fs.readFileSync(new URL("provider-adapter.js", root), "utf8");
const ASSISTANT = /responseContainer: Object\.freeze\(\["([^"]+)"\]\)/.exec(adapter)[1];
const USER = /userQueryContainer: "([^"]+)"/.exec(adapter)[1];
assert.equal(ASSISTANT, "model-response");
assert.equal(USER, "user-query");

/* ---- Đường tốt ----------------------------------------------------------- */
{
  const trang = doc([
    el(USER, "câu hỏi một"),
    el(ASSISTANT, "trả lời một", { id: "r1" }),
    el(USER, "câu hỏi hai"),
    el(ASSISTANT, "trả lời hai", { attrs: { "data-message-id": "m2" } }),
  ]);
  const ket = readTurns(trang, ASSISTANT, USER, 10, 8000);
  assert.equal(ket.status, "OK");
  assert.equal(ket.matched, 4);
  assert.equal(ket.returned, 4);
  assert.equal(ket.with_text, 4);
  assert.deepEqual(ket.turns.map((t) => t.role), ["user", "assistant", "user", "assistant"], "vai đọc từ chính selector, không đoán theo thứ tự");
  assert.equal(ket.turns[1].id, "r1", "lấy id của phần tử khi có");
  assert.equal(ket.turns[3].id, "m2", "ngã về data-message-id khi không có id");
  assert.equal(ket.turns[0].id, null, "không có cái nào thì khai null, không bịa");
  assert.deepEqual(ket.attribute_names, [], "đường thành công vẫn GIỮ trường này — hình dạng payload ổn định thì phía đọc không phải xử lý hai kiểu");
}

/* ---- ĐUÔI, không phải ĐẦU. Đây là ca sai-lặng-lẽ nguy hiểm nhất ---------- */
//
// `slice(0, limit)` trả về phần MỞ ĐẦU của hội thoại và bỏ mất đúng câu trả lời
// vừa tới. Payload vẫn trông đầy đủ — đủ trường, đủ số lượt, không lỗi — nên
// không có cách nào phát hiện ngoài phép kiểm này.
{
  const trang = doc([
    el(ASSISTANT, "lượt cũ nhất"),
    el(ASSISTANT, "lượt giữa"),
    el(ASSISTANT, "lượt MỚI NHẤT"),
  ]);
  const ket = readTurns(trang, ASSISTANT, USER, 2, 8000);
  assert.equal(ket.matched, 3, "vẫn khai có bao nhiêu lượt trên trang");
  assert.equal(ket.returned, 2, "chỉ trả về đúng số đã xin");
  assert.deepEqual(
    ket.turns.map((t) => t.text),
    ["lượt giữa", "lượt MỚI NHẤT"],
    "phải là ĐUÔI: một cuộc trao đổi cần lượt mới nhất. Lấy đầu là bỏ mất đúng câu vừa tới, mà payload vẫn trông đầy đủ"
  );
}

/* ---- Nắp số ký tự -------------------------------------------------------- */
{
  const dai = "x".repeat(500);
  const ket = readTurns(doc([el(ASSISTANT, dai)]), ASSISTANT, USER, 10, 200);
  assert.equal(ket.turns[0].chars, 500, "khai độ dài THẬT, không khai độ dài sau khi cắt");
  assert.equal(ket.turns[0].truncated, true, "nói rõ là đã bị cắt");
  assert.equal(ket.turns[0].text.length, 200, "chữ trả về đúng bằng nắp");
  const vua = readTurns(doc([el(ASSISTANT, "x".repeat(200))]), ASSISTANT, USER, 10, 200);
  assert.equal(vua.turns[0].truncated, false, "đúng bằng nắp thì KHÔNG phải là bị cắt");
}

/* ---- Khung thật, chưa có chữ -------------------------------------------- */
{
  const ket = readTurns(doc([el(ASSISTANT, "   "), el(ASSISTANT, "")]), ASSISTANT, USER, 10, 8000);
  assert.equal(ket.status, "MATCHED_BUT_NO_TEXT", "có khung mà chưa có chữ là trang đang stream — KHÁC hẳn selector chết");
  assert.equal(ket.matched, 2, "vẫn thấy khung");
  assert.equal(ket.with_text, 0);
}

/* ---- Selector chết ------------------------------------------------------- */
{
  const trang = doc([
    el("div-la", "chữ gì đó", { attrs: { "data-khung-moi": "1", "aria-label": "bo qua" } }),
    el("div-la-2", "chữ khác", { attrs: { "data-luot-moi": "2" } }),
  ]);
  const ket = readTurns(trang, ASSISTANT, USER, 10, 8000);
  assert.equal(ket.status, "NO_TURNS_MATCHED", "không khớp lượt nào = selector đã chết, KHÔNG phải hội thoại trống");
  assert.equal(ket.matched, 0);
  assert.deepEqual(ket.turns, []);
  assert.deepEqual(
    ket.attribute_names.sort(), ["data-khung-moi", "data-luot-moi"],
    "trả về tên thuộc tính ĐANG CÓ THẬT trên trang — không có nó thì phiên sau phải ĐOÁN selector mới, mà đoán selector là đúng thứ luật vàng 1 cấm"
  );
  assert.equal(ket.attribute_names.includes("aria-label"), false, "chỉ nhặt thuộc tính data-*, không nhặt bừa");
  assert.match(ket.selector, /model-response/, "khai luôn selector đã dùng, để người sửa biết cái gì vừa chết");
}

/* ---- Trang trống hẳn ----------------------------------------------------- */
{
  const ket = readTurns(doc([]), ASSISTANT, USER, 10, 8000);
  assert.equal(ket.status, "NO_TURNS_MATCHED");
  assert.deepEqual(ket.attribute_names, [], "trang rỗng thì không có thuộc tính nào để nhặt — vẫn phải trả mảng, không trả undefined");
}

console.log("chat read turns: PASS");
