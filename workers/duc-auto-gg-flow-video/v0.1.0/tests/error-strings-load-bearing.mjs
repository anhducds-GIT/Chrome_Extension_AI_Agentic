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

// ---------------------------------------------------------------------------
// F-06 NỬA SAU (05/09): danh từ đầu ra là "video", không phải "ảnh".
//
// Gói này sinh VIDEO từ ẢNH MẪU. Nên chữ "ảnh" **không** sai ở mọi chỗ: ảnh
// tham chiếu người dùng đính vào vẫn đúng là ảnh. Chỉ chỗ nói về **đầu ra**
// mới phải là "video". Vì thế phép kiểm này KHÔNG cấm chữ "ảnh" — nó cấm chữ
// "ảnh" ở mọi chỗ TRỪ một danh sách cụm đầu-vào khai tường minh dưới đây.
//
// Hướng hỏng là hướng đúng: thêm một câu operator mới có chữ "ảnh" thì phép
// kiểm ĐỎ, và người viết phải tự quyết định đó là đầu vào (khai vào danh sách,
// kèm lý do) hay đầu ra (đổi thành "video"). Im lặng trôi qua là thứ đã để lọt
// 46 chuỗi lần trước.
//
// RANH GIỚI, nói thẳng để không ai tưởng nó rộng hơn thực tế: phép quét-cấm
// dưới đây phủ BA TỪ ĐIỂN + `sidepanel.html` — những chỗ đọc được giá trị thật,
// không cần đoán đâu là chuỗi đâu là chú thích. `sidepanel.js` và `content.js`
// KHÔNG nằm trong vùng quét-cấm: hai file đó trộn chú thích tiếng Việt (có chữ
// "ảnh" đúng chỗ, vì đó là lịch sử nhánh) với chuỗi, và bộ tách chuỗi bằng
// regex ở trên có điểm mù thật — một chuỗi backtick nhiều dòng nuốt luôn vùng
// sau nó. Nên chữ đã đổi ở hai file đó được giữ bằng bảng ghim ĐẾM SỐ ở cuối
// file này, từng câu một. Nợ còn lại: câu MỚI thêm vào hai file đó không bị
// canh — ghi ở F-06 của `BACKLOG.md`.

// Cụm được phép giữ chữ "ảnh" — mỗi dòng phải là chuyện ĐẦU VÀO.
const CUM_DAU_VAO_GIU_CHU_ANH = [
  "ảnh tham chiếu",            // reference image người dùng đính kèm
  "Ảnh tham chiếu",            // cùng nghĩa, đầu câu
  "ảnh input/reference",       // bảng hướng dẫn dừng, đối chiếu output với input
  "các file ảnh mà workbook yêu cầu",
  "cùng một ảnh",              // một job gọi lặp cùng một file tham chiếu
  "Mỗi ảnh cần một alias riêng",
  "Có ảnh không được dùng",
];

// `\b` của JS KHÔNG khớp cạnh chữ tiếng Việt, nên biên trái phải tự viết:
// "ảnh" đứng riêng, không phải phần đuôi của "cảnh" / "khoảnh" / "mảnh".
const TU_ANH = /(?<![A-Za-zÀ-ỹĐđ])[Ảả]nh/;
const demKhop = new Map(CUM_DAU_VAO_GIU_CHU_ANH.map((cum) => [cum, 0]));
function conSotChuAnh(text) {
  let rest = text;
  for (const cum of CUM_DAU_VAO_GIU_CHU_ANH) {
    const parts = rest.split(cum);
    if (parts.length > 1) demKhop.set(cum, demKhop.get(cum) + parts.length - 1);
    rest = parts.join(" ");
  }
  return TU_ANH.test(rest);
}

// Ba từ điển chữ operator được đọc từ GIÁ TRỊ THẬT sau khi nạp module, không
// qua bộ tách chuỗi bằng regex. Bộ tách ở trên có thật một điểm mù (một chuỗi
// backtick nhiều dòng nuốt luôn vùng sau nó), nên với nửa này thì đọc thẳng
// dữ liệu — không có gì để nuốt.
function moiChuoi(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const item of value) moiChuoi(item, out);
  else if (value && typeof value === "object") for (const item of Object.values(value)) moiChuoi(item, out);
  return out;
}
const TU_DIEN = [
  ["operator-messages-core.js", "DacOperatorMessages"],
  ["halt-instructions-core.js", "DacHaltInstructions"],
  ["operator-glossary-core.js", "DacOperatorGlossary"],
];
let chuoiTuDien = 0;
for (const [file, globalName] of TU_DIEN) {
  for (const chuoi of moiChuoi(load(file, globalName))) {
    chuoiTuDien += 1;
    assert.ok(!conSotChuAnh(chuoi),
      `${file} còn nói "ảnh" ở một chỗ nói về ĐẦU RA — gói này sinh video. Nếu đây thật sự là ảnh đầu vào thì khai cụm đó vào CUM_DAU_VAO_GIU_CHU_ANH kèm lý do.\n  ${chuoi}`);
  }
}
assert.ok(chuoiTuDien > 100, `chỉ đọc được ${chuoiTuDien} chuỗi từ ba từ điển — module không nạp được thì phép kiểm này xanh một cách vô nghĩa`);

// `sidepanel.html` là chữ thẳng trên giao diện: quét cả file.
assert.ok(!conSotChuAnh(html),
  "sidepanel.html còn nói 'ảnh' ở một chỗ nói về đầu ra — đây là chữ Đức nhìn thấy trực tiếp trên panel");

// Mọi cụm trong danh sách miễn phải THẬT SỰ còn được dùng. Một dòng miễn đã
// chết là một lỗ mở sẵn cho chữ cũ mọc lại mà không ai để ý.
for (const [cum, so] of demKhop) {
  assert.ok(so > 0, `cụm "${cum}" không còn khớp chỗ nào — bỏ nó khỏi CUM_DAU_VAO_GIU_CHU_ANH, đừng để dòng miễn chết nằm lại`);
}

// Các câu đã đổi sang "video" nằm ngoài ba từ điển: ghim từng câu kèm SỐ LẦN,
// đúng kiểu bảng PINNED ở trên. Số lần là bắt buộc — hỏi "có tồn tại" thay vì
// "còn nguyên" đã để lọt một đột biến trong gói này rồi.
const CAU_VIDEO = [
  [sources, "RECONCILE_BLOB_UNSUPPORTED: video trên trang đang là blob:", 1],
  [sources, "Đã lưu video tạo lại · Queue vẫn bị chặn", 1],
  [sources, "Fixture kiểm tra: tạo một video minh hoạ đơn giản.", 1],
  [sources, "chưa có video đã lưu được xác minh. Tạo lại sẽ gửi một yêu cầu mới và có thể tạo video trùng.", 1],
  [sources, "đang kiểm tra điều kiện trước khi tạo video mới.", 1],
  [sources, "chưa có video đã xác minh lưu thành công.", 1],
  [sources, "RERUN_PERSISTENCE_REQUIRED: phải bật lưu video và lưu Result XLSX.", 1],
  [sources, "bắt đầu tạo video mới.", 1],
  [sources, "đã tạo video mới và lưu xong.", 1],
  [sources, "Chọn thư mục lưu video được tạo", 1],
  [sources, "video is not saved", 1],
  [sources, "Video của ${jobId} chưa được lưu và xác minh", 1],
  [fs.readFileSync(new URL("../orchestrator-review-core.js", import.meta.url), "utf8"), " — sẽ ĐÈ LÊN file video cũ trùng tên", 1],
  [fs.readFileSync(new URL("../plan-diagnostics-core.js", import.meta.url), "utf8"), "nếu muốn giữ video cũ", 1],
];
for (const [haystack, text, times] of CAU_VIDEO) {
  assert.equal(countOf(haystack, text), times,
    `câu đầu ra phải xuất hiện đúng ${times} lần, đang thấy ${countOf(haystack, text)} — nếu đổi lời văn thì sửa cả dòng ghim này: "${text}"`);
}

// Hai câu trong bảng trên là câu NÉM THẬT, nên chúng đi qua `classifyFailure`.
// Đổi lời văn mà rơi sang nhánh khác là đổi hành vi retry (F-20).
for (const [text, phase, expected] of [
  ["RECONCILE_BLOB_UNSUPPORTED: video trên trang đang là blob: nên đường đối chiếu thủ công chưa tải được.", "PRE_SUBMIT", "OTHER"],
  ["RERUN_PERSISTENCE_REQUIRED: phải bật lưu video và lưu Result XLSX.", "PRE_SUBMIT", "OTHER"],
  ["RERUN_CONFIRM_NOT_COMPLETE: Q001 chưa có video đã xác minh lưu thành công.", "PRE_SUBMIT", "OTHER"],
]) {
  assert.equal(CORE.classifyFailure(new Error(text), phase), expected,
    `"${text}" đổi lời văn xong đã tuột khỏi nhánh ${expected} — sửa lại lời văn, đừng sửa phép kiểm`);
}

console.log(`load-bearing error strings keep their verdicts (${PINNED.length}) · output noun stays "video" (${CAU_VIDEO.length} câu, ${chuoiTuDien} chuỗi từ điển): PASS`);
