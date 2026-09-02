// Vài chuỗi báo lỗi CHỊU TẢI phân loại — đổi chữ là đổi hành vi.
//
// Bối cảnh (F-20, và nợ rebrand F-06): gói này fork từ nhánh Gemini nên còn
// nhiều chữ "Gemini" trên một trang Google Flow. Đổi chúng nghe như việc sửa
// chính tả. KHÔNG PHẢI: `classifyFailure` (runner-core.js) quyết một thất bại
// được thử lại hay dừng cứng bằng cách **dò từ khoá trên toàn bộ câu**.
//
// Đo thật 02/09, trước khi đổi:
//
//   "Gemini image generation limit reached for now."  -> GENERATION_LIMIT_REACHED
//   "Flow video generation limit reached for now."    -> OTHER          (!!)
//
// Tức là đổi đúng câu đó cho "hợp trang Flow" sẽ **mất cú dừng cứng khi hết
// credit**, và job sẽ được thử lại trên một tài khoản đã cạn. Đây là lý do phép
// kiểm này tồn tại: nó không bảo vệ CHỮ, nó bảo vệ PHÁN QUYẾT.
//
// Cách dùng khi làm tiếp F-06: đổi chữ xong thì chạy file này. Đỏ nghĩa là câu
// vừa đổi đã tuột khỏi nhánh phân loại cũ — sửa lại lời văn cho giữ được từ
// khoá, đừng sửa phép kiểm.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function load(name, globalName) {
  const context = {};
  vm.runInNewContext(fs.readFileSync(new URL(`../${name}`, import.meta.url), "utf8"), context);
  return context[globalName];
}
const CORE = load("runner-core.js", "DacRunnerCore");
const content = fs.readFileSync(new URL("../content.js", import.meta.url), "utf8");
const panel = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");
const sources = content + "\n" + panel;

// Mỗi dòng: chuỗi phải CÓ MẶT trong nguồn, và phải phân loại đúng như ghi.
// Chuỗi nào đã đổi Gemini -> Flow ngày 02/09 thì ghi ở dạng MỚI.
// [chuỗi, phase, phán quyết bắt buộc, SỐ LẦN xuất hiện trong nguồn].
// Số lần là bắt buộc, không phải trang trí: câu hết-credit nằm ở HAI chỗ
// (`content.js` chỗ khai matcher, và chỗ ném kèm tiền tố `LIMIT_STOP:`). Bản
// đầu của phép kiểm này chỉ hỏi "chuỗi có tồn tại đâu đó không", nên một đột
// biến đổi ĐÚNG MỘT trong hai chỗ vẫn lọt lưới — chỗ còn lại giữ cho câu hỏi
// đó vẫn đúng. Đây là lần thứ ba trong ngày cùng một gốc bệnh: hỏi "có tồn
// tại" thay vì hỏi "còn nguyên".
const PINNED = [
  ["Gemini image generation limit reached for now.", "PRE_SUBMIT", "GENERATION_LIMIT_REACHED", 2],
  ["HARD_STOP: Flow receiver unavailable. Reload the Flow tab once.", "PRE_SUBMIT", "SECURITY_HARD_STOP", 1],
  ["Timed out waiting for an idle Flow composer.", "PRE_SUBMIT", "TIMEOUT_PRE_SUBMIT", 1],
  ["Flow composer is not available.", "PRE_SUBMIT", "RECEIVER_LOST", 1],
  ["Attempt identity mismatch from Flow content receiver.", "PRE_SUBMIT", "RECEIVER_LOST", 1],
  ["Flow did not become ready for the next job.", "PRE_SUBMIT", "OTHER", 1],
];

const countOf = (haystack, needle) => haystack.split(needle).length - 1;

for (const [text, phase, expected, times] of PINNED) {
  const seen = countOf(sources, text);
  assert.equal(seen, times, `chuỗi phải xuất hiện đúng ${times} lần trong nguồn, đang thấy ${seen} — nếu đã đổi lời văn thì cập nhật cả phán quyết lẫn số lần: "${text}"`);
  const verdict = CORE.classifyFailure(new Error(text), phase);
  assert.equal(verdict, expected, `"${text}" nay phân loại thành ${verdict}, không còn là ${expected} — lời văn vừa đổi đã đổi luôn hành vi`);
}

// Cái mìn, ghim riêng vì nó là thứ dễ "sửa cho hợp trang Flow" nhất: câu hết
// credit BẮT BUỘC giữ cụm "image generation limit". Bỏ chữ `image` là mất
// GENERATION_LIMIT_REACHED, và một job hết credit sẽ được thử lại.
assert.equal(CORE.classifyFailure(new Error("Flow video generation limit reached for now."), "PRE_SUBMIT"), "OTHER",
  "phép kiểm này phải chứng minh được cái bẫy nó đang canh: bỏ chữ 'image' thì tuột khỏi nhánh hết-credit");
assert.ok(CORE.HARD_STOP_FAILURE_TYPES.has("GENERATION_LIMIT_REACHED"), "hết credit phải là dừng cứng, không được thử lại");

console.log(`load-bearing error strings keep their verdicts (${PINNED.length}): PASS`);
