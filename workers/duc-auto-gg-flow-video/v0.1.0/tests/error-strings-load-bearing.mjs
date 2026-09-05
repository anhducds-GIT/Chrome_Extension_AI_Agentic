// Vài chuỗi báo lỗi CHỊU TẢI phân loại — đổi chữ là đổi hành vi.
//
// Bối cảnh (F-20, và nợ rebrand F-06): gói này fork từ nhánh Gemini nên còn
// nhiều chữ "Gemini" trên một trang Google Flow. Đổi chúng nghe như việc sửa
// chính tả. KHÔNG PHẢI: `classifyFailure` (runner-core.js) quyết một thất bại
// được thử lại hay dừng cứng bằng cách **dò từ khoá trên toàn bộ câu**.
//
// Đo thật, và cả hai lần đo đều nằm đây vì lần sau sửa lại lần trước:
//
//   02/09  "Gemini image generation limit reached for now."  -> GENERATION_LIMIT_REACHED
//          "Flow video generation limit reached for now."    -> OTHER          (!!)
//   05/09  đọc lại TỪNG chỗ ném: cả 8 đường đều gắn tiền tố `LIMIT_STOP:`, và
//          `LIMIT_STOP` là nhánh ĐẦU TIÊN của `classifyFailure`. Chuỗi trần
//          chưa bao giờ tới bộ phân loại một mình, nên cụm `image generation
//          limit` KHÔNG phải thứ chịu tải — **tiền tố mới là.**
//
// Bài học: phép kiểm cũ canh đúng chỗ nguy hiểm nhưng canh nhầm thứ. Nó bảo vệ
// một TỪ, trong khi thứ giữ phán quyết là một TIỀN TỐ ở tám chỗ khác nhau.
//
// Cách dùng khi đổi chữ báo lỗi: đổi xong thì chạy file này. Đỏ nghĩa là câu vừa
// đổi đã tuột khỏi nhánh phân loại cũ — sửa lại lời văn, đừng sửa phép kiểm.
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
//
// F-06 (05/09) — CÂU HẾT-CREDIT ĐÃ ĐỔI, VÀ ĐÂY LÀ CHỖ PHẢI ĐỌC KỸ.
// Bản trước ghim chuỗi TRẦN `"Gemini image generation limit reached for now."`
// và tin rằng cụm `image generation limit` là thứ giữ phán quyết. Đọc lại từng
// chỗ ném thì KHÔNG PHẢI: **mọi** đường ném đều gắn tiền tố `LIMIT_STOP:`
// (content.js ×7 · sidepanel.js ×1), và `LIMIT_STOP` là nhánh ĐẦU TIÊN của
// `classifyFailure`. Chuỗi trần chưa bao giờ tới được bộ phân loại một mình.
// Nên bản này ghim ĐÚNG THỨ CHẠY THẬT — dạng có tiền tố — cộng một phép kiểm
// cấu trúc bên dưới đòi mọi chỗ ném phải mang tiền tố đó. Chặt hơn bản cũ:
// bản cũ chỉ canh một từ, bản này canh cả tám đường.
const PINNED = [
  ["LIMIT_STOP: Flow video generation limit reached for now.", "PRE_SUBMIT", "GENERATION_LIMIT_REACHED", 1],
  ["LIMIT_STOP: Flow video generation quota reached (freemium quota disclaimer present).", "PRE_SUBMIT", "GENERATION_LIMIT_REACHED", 1],
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

// Cái mìn, ghim riêng: câu hết-credit KHÔNG còn chữ `image` nào, nên nếu ai gỡ
// tiền tố `LIMIT_STOP:` ở một chỗ ném thì câu đó rơi thẳng xuống `OTHER` — job
// hết credit sẽ được THỬ LẠI trên một tài khoản đã cạn. Khẳng định này chứng
// minh cái bẫy có thật trước khi phép kiểm dưới canh nó.
assert.equal(CORE.classifyFailure(new Error("Flow video generation limit reached for now."), "PRE_SUBMIT"), "OTHER",
  "câu hết-credit không mang tiền tố thì phải rơi xuống OTHER — đó chính là lý do tiền tố là thứ chịu tải");
assert.ok(CORE.HARD_STOP_FAILURE_TYPES.has("GENERATION_LIMIT_REACHED"), "hết credit phải là dừng cứng, không được thử lại");

// PHÉP KIỂM CẤU TRÚC — thay cho phép kiểm theo-từ của bản cũ.
// Mọi chỗ ném một chẩn đoán hết-credit PHẢI mang tiền tố `LIMIT_STOP:`. Đây là
// thứ duy nhất giữ phán quyết, nên nó phải được canh ở TỪNG chỗ ném, không phải
// canh một câu mẫu. Đếm số chỗ luôn: thêm một đường ném mới thì phải sửa con số
// này một cách có ý thức, không được lặng lẽ trôi qua.
const limitThrows = [...sources.matchAll(/throw new Error\(([^\n]*?(?:[Ll]imitBlocker|settledQuota|generationLimitBlocker|quota reached)[^\n]*?)\);/g)]
  .map((match) => match[1]);
assert.equal(limitThrows.length, 8,
  `đang thấy ${limitThrows.length} chỗ ném chẩn đoán hết-credit, chờ 8. Thêm/bớt một đường ném thì phải sửa con số này và đọc lại từng câu.`);
for (const expr of limitThrows) {
  assert.ok(expr.includes("LIMIT_STOP:"),
    `một chỗ ném chẩn đoán hết-credit không mang tiền tố LIMIT_STOP: — nó sẽ bị phân loại là OTHER và job hết credit sẽ được thử lại.\n  ${expr}`);
}

// Và không câu operator nào trên đường chạy thật được nói "Gemini" nữa (F-06):
// gói này chạy trên labs.google/fx/tools/flow, nên chữ đó gửi người đọc đi tìm
// nhầm trang. Chỉ soi CHUỖI, không soi chú thích — chú thích nhắc lịch sử nhánh
// Gemini là đúng chỗ của nó.
//
// Quét CHUỖI ở mọi file mang chữ operator, không riêng hai file trên: bảng lời
// nhắn (`operator-messages-core`), bảng hướng dẫn dừng (`halt-instructions-core`),
// từ điển (`operator-glossary-core`) và ba chỗ sinh chẩn đoán. Thiếu một file là
// để lại đúng một chỗ cho chữ cũ mọc lại.
const CHU_OPERATOR = [
  "content.js", "sidepanel.js", "sidepanel-ui-semantics.js",
  "operator-messages-core.js", "halt-instructions-core.js", "operator-glossary-core.js",
  "plan-diagnostics-core.js", "resume-core.js", "orchestrator-review-core.js", "bridge-core.js",
];
let daQuet = 0;
for (const name of CHU_OPERATOR) {
  const text = fs.readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
  for (const literal of text.match(/"[^"\\\n]*"|'[^'\\\n]*'|`[^`\\]*`/g) || []) {
    assert.ok(!literal.includes("Gemini"), `${name} còn một chuỗi nói "Gemini" trên nhánh Flow: ${literal}`);
    daQuet += 1;
  }
}
assert.ok(daQuet > 500, `chỉ quét được ${daQuet} chuỗi — bộ tách chuỗi hỏng thì phép kiểm này xanh một cách vô nghĩa`);

// `sidepanel.html` là chữ thẳng trên giao diện, không nằm trong chuỗi JS, nên
// quét cả file.
const html = fs.readFileSync(new URL("../sidepanel.html", import.meta.url), "utf8");
assert.ok(!html.includes("Gemini"), "sidepanel.html còn nói 'Gemini' — đây là chữ Đức nhìn thấy trực tiếp");

console.log(`load-bearing error strings keep their verdicts (${PINNED.length}): PASS`);
