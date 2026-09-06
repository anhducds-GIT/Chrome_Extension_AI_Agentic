// Test ghim: "Extension mù thì DỪNG CỨNG, không thử lại."
//
// Vì sao lớp này tồn tại. Ngày 2026-08-26 một lượt chạy thật ở nhánh ChatGPT
// gửi SÁU prompt và đốt SÁU lượt tạo ảnh thật, lần nào cũng báo NO_NEW_IMAGE.
// Trang không hề có lấy một câu trả lời nào — hoặc selector đã mục, hoặc tab
// không ở trong hội thoại. Không điều kiện nào trong hai cái đó khá lên nhờ
// thử lại, mà mỗi lần thử lại tốn quota thật của Đức. Nhánh Gemini không có
// lớp này cho tới 2026-09-06; cùng cái bẫy, còn nguyên.
//
// File này có HAI NỬA, và nửa nào cũng cần:
//
//   NỬA HÀNH VI — nạp `runner-core.js` THẬT vào sandbox rồi CHẠY
//   `classifyFailure()` với ĐÚNG câu mà `content.js` ném ra. Câu đó được ĐỌC
//   TỪ `content.js`, không gõ lại ở đây: sửa lời văn câu báo lỗi LÀ sửa hành
//   vi runtime (bộ phân loại dò từ khoá trên toàn bộ câu), nên một phép ghim
//   gõ lại câu văn sẽ vẫn xanh trong khi bản thật đã tuột nhãn.
//
//   NỬA NGUỒN — `content.js` không chạy được ngoài trình duyệt, nên chỗ ném
//   được ghim ở mức nguồn.
//
// Cái bẫy chính, và là lý do thứ tự trong `classifyFailure` là load-bearing:
// câu DETECTION_BLIND TỰ NÓ chứa chữ "timeout" ("after the full timeout").
// Luật `/timed out|timeout/` đứng sau nhưng bắt rất rộng, nên nếu luật tiền tố
// không đứng trên nó thì câu này bị quy thành TIMEOUT — mà TIMEOUT thì ĐƯỢC
// THỬ LẠI, tức cả lớp bảo vệ này im lặng không chạy. Khai mã lỗi mà quên luật
// phân loại là đúng cái lỗi đã đo được ở nhánh ChatGPT ngày 2026-09-02.

import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const contentSource = fs.readFileSync(new URL("content.js", root), "utf8");
const context = vm.createContext({ console });
vm.runInContext(fs.readFileSync(new URL("runner-core.js", root), "utf8"), context);
const runner = context.DacRunnerCore;

/* ---- NỬA NGUỒN: chỗ ném trong content.js ---------------------------------- */

assert.match(
  contentSource,
  /const blind = expectImage && assistantMessages\(\)\.length === 0;/,
  "content.js phân biệt 'mù' bằng việc KHÔNG CÓ MỘT khối phản hồi nào, chứ không phải bằng việc thiếu ảnh"
);
assert.match(
  contentSource,
  /error\.detection = \{ \.\.\.lastDetection, timed_out: true, detection_blind: blind \};/,
  "sổ cái ghi lại lượt đó có mù hay không — không ghi thì Đức không có cách nào biết vì sao batch dừng"
);

/* Câu thật, đọc thẳng từ nguồn. Không gõ lại. */
const throwLine = /new Error\(`(DETECTION_BLIND: [^`]*)`\)/.exec(contentSource);
assert.ok(throwLine, "content.js còn ném một câu mở đầu bằng tiền tố DETECTION_BLIND:");
const realMessage = throwLine[1]
  .replace(/\$\{location\.href\}/g, "https://gemini.google.com/app/abc123");

/* Chốt hạ của cả file: câu thật CÓ chứa chữ 'timeout'. Nếu một ngày nó không
   còn chứa nữa thì phép ghim dưới đây hết răng mà vẫn xanh — nên hỏi thẳng. */
assert.match(realMessage, /timeout/i, "câu thật vẫn chứa chữ 'timeout', nên luật tiền tố vẫn là thứ đang giữ nhãn");

/* ---- NỬA HÀNH VI: chạy bộ phân loại thật ---------------------------------- */

for (const phase of ["PRE_SUBMIT", "SUBMITTED", "OUTPUT_DETECTED", "OUTPUT_SAVED", "CHAT_READY"]) {
  assert.equal(
    runner.classifyFailure(new Error(realMessage), phase),
    "DETECTION_BLIND",
    `mù vẫn là mù ở pha ${phase} — không pha nào được lái nó sang TIMEOUT`
  );
}

assert.ok(runner.FAILURE_TYPES.has("DETECTION_BLIND"), "DETECTION_BLIND là một Failure Type chính danh");
assert.ok(runner.HARD_STOP_FAILURE_TYPES.has("DETECTION_BLIND"), "DETECTION_BLIND dừng cứng cả batch");

/* Khai mã vào bảng mà quên nối vào canRetry là lỗ im lặng — hỏi thẳng hàm. */
const item = { retry_count: 0, settings: { max_retries: 3 } };
assert.equal(runner.canRetry(item, "DETECTION_BLIND"), false, "mù thì KHÔNG thử lại, dù còn thừa lượt retry");
assert.equal(runner.canRetry(item, "TIMEOUT_AFTER_SUBMIT"), true, "phép so sánh: hết giờ bình thường thì vẫn thử lại");

/* ---- Lỗ cùng loại, đóng cùng lượt: RECEIVER_LOST -------------------------- */
//
// `tab-lock-core.js` ném `RECEIVER_LOST: <câu>` và tiền tố đó là CỐ Ý. Nhưng
// tới 2026-09-06 không gì ở đây đọc tiền tố — nhãn cưỡi trên chữ "receiver"
// nằm đâu đó trong câu, mà luật timeout đứng trên và bắt rộng hơn. Câu đó
// nhúng origin, nên một origin mang đúng chữ "timeout" là âm thầm hạ một cú
// dừng cứng xuống thành một cú được thử lại.
const lockSource = fs.readFileSync(new URL("tab-lock-core.js", root), "utf8");
assert.match(lockSource, /new Error\(`RECEIVER_LOST: \$\{message\}`\)/, "khoá tab vẫn ném kèm tiền tố RECEIVER_LOST:");
assert.equal(
  runner.classifyFailure(new Error("RECEIVER_LOST: bound tab left https://timeout.example.com"), "SUBMITTED"),
  "RECEIVER_LOST",
  "tiền tố thắng, kể cả khi origin trong câu mang đúng chữ 'timeout'"
);
assert.equal(runner.canRetry(item, "RECEIVER_LOST"), false, "mất receiver thì dừng cứng");

/* ---- Sổ tay operator phải giải thích được mã này -------------------------- */

vm.runInContext(fs.readFileSync(new URL("halt-instructions-core.js", root), "utf8"), context);
const guide = context.DacHaltInstructions;
const entry = guide.findInstruction("DETECTION_BLIND");
assert.notEqual(entry, guide.UNKNOWN_INSTRUCTION, "Đức bấm vào mã lỗi phải ra hướng dẫn thật, không ra câu chung chung");
assert.match(entry.retry, /hard stop/i, "hướng dẫn nói thẳng đây là dừng cứng");
for (const field of ["meaning", "action"]) {
  assert.match(entry[field], /[àáâãèéêìíòóôõùúýăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i,
    `phần ${field} có tiếng Việt có dấu — Đức đọc câu này, không đọc mã`);
}

console.log("detection blind hard stop: PASS");
