// Chữ báo lỗi ở cổng gửi KHÔNG được đổi cách phân loại thất bại.
//
// Vì sao ghim — đây là một defect THẬT, do chính phiên 02/09 gây ra và bị audit
// độc lập bắt trước khi push:
//
//   `classifyFailure` (runner-core.js) dò TỪ KHOÁ trên TOÀN BỘ chữ báo lỗi, chứ
//   không phải trên tiền tố. Bản đầu viết "The Flow composer may never have
//   accepted the prompt" và `composer_len` trong phần chú thích. Chữ `composer`
//   khớp nhánh `RECEIVER_LOST`; `RECEIVER_LOST` nằm trong HARD_STOP_FAILURE_TYPES;
//   `canRetry` vì thế trả về false và **cả mẻ job bị dừng**. Một thay đổi được
//   khai là "thuần bằng chứng, không đụng hành vi" đã lặng lẽ biến một thất bại
//   PRE_SUBMIT có thể thử lại thành một cú dừng cứng toàn mẻ.
//
// Bộ đột biến của phiên đó (8/8 xanh) KHÔNG bắt được, vì không mutation nào chạm
// tới bộ phân loại — đúng bài học "mutation-test cái DÂY NỐI, không chỉ cái luật".
// Nên phép kiểm này cố ý KHÔNG ghim chữ. Nó ĐỌC chữ thật ra khỏi `content.js`,
// dựng lại đúng câu mà runtime sẽ ném, rồi chạy qua `classifyFailure` THẬT. Ai
// sửa lời văn mà vô tình gieo lại một từ khoá thì phép kiểm đỏ ngay, dù từ khoá
// đó là từ nào trong danh sách — kể cả từ khoá được thêm vào sau này.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

// Cùng cách nạp với các test core khác trong thư mục này (xem v02-core-smoke.mjs):
// runner-core.js là script IIFE của trình duyệt, không phải ES module.
function load(name, globalName) {
  const context = {};
  vm.runInNewContext(fs.readFileSync(new URL(`../${name}`, import.meta.url), "utf8"), context);
  return context[globalName];
}

const content = fs.readFileSync(new URL("../content.js", import.meta.url), "utf8");
const CORE = load("runner-core.js", "DacRunnerCore");
assert.ok(CORE?.classifyFailure && CORE?.canRetry, "runner-core phải nạp được");

// 1. Lấy chữ THẬT ra khỏi nguồn, không chép tay. Đòi ĐÚNG MỘT chỗ khớp: có bản
//    thứ hai (một dòng chết, một bản chép sang chỗ khác) thì regex sẽ lấy bản
//    đầu và phép kiểm âm thầm canh nhầm câu.
const thrownAll = [...content.matchAll(/throw new Error\(`(Send button did not become ready[^`]*)`\);/g)];
assert.equal(thrownAll.length, 1, `phải có ĐÚNG 1 câu ném ở cổng gửi, đang thấy ${thrownAll.length}`);
const noteAll = [...content.matchAll(/waitForSendButtonReady\(undefined, `([^`]*)`\)/g)];
assert.equal(noteAll.length, 1, `phải có ĐÚNG 1 lời gọi cổng gửi kèm chú thích, đang thấy ${noteAll.length}`);
const thrown = thrownAll[0];
const note = noteAll[0];

// 2. Dựng lại câu runtime sẽ ném, với giá trị XẤU NHẤT có thật. `render` NÉM khi
//    gặp ô nội suy lạ, thay vì lặng lẽ thay bằng chữ vô hại: nếu mai này có ai
//    nhét một trường động mới vào câu, phép kiểm phải đỏ và bắt người ta khai
//    giá trị mẫu, chứ không được tự trung hoà nó rồi báo xanh.
function render(template, values) {
  return template.replace(/\$\{([^}]*)\}/g, (slot, expression) => {
    const key = expression.trim();
    if (!(key in values)) throw new Error(`ô nội suy chưa khai giá trị mẫu: \${${key}} — thêm nó vào bảng values rồi chạy lại`);
    return String(values[key]);
  });
}
// Cả năm nhánh `typingPath` mà typeIntoFlowComposer trả về được (content.js),
// gồm `native_setter` — audit vòng 2 chỉ ra bản đầu bỏ sót nhánh này.
const cases = ["execCommand", "input_events", "paste_event", "native_setter", "all_failed", "threw", "none"];
for (const typingPath of cases) {
  const renderedNote = render(note[1], { "typing.path": typingPath, "typing.ok": false, "composerLenBeforeTyping": 27, "composerTextLength(activeComposer)": 172, "prompt.length": 145 });
  const message = render(thrown[1], { "typingNote": renderedNote });

  // 3. Phán quyết phải y như trước bản vá: PRE_SUBMIT hỏng ở cổng gửi là OTHER,
  //    và OTHER thì được thử lại. Đây là hành vi CŨ, phải giữ nguyên.
  const verdict = CORE.classifyFailure(new Error(message), "PRE_SUBMIT");
  assert.equal(verdict, "OTHER", `chữ báo lỗi (typing_path=${typingPath}) bị phân loại thành ${verdict}, không còn là OTHER — câu chữ đã lén đổi hành vi runtime. Câu đang xét: ${message}`);
  assert.ok(!CORE.HARD_STOP_FAILURE_TYPES.has(verdict), "phán quyết không được nằm trong nhóm dừng cứng");

  const item = { retry_count: 0, settings: { max_retries: 2 } };
  assert.equal(CORE.canRetry(item, verdict), true, `chữ báo lỗi (typing_path=${typingPath}) làm mất quyền thử lại`);
}

// 4. Bản CŨ phải bị phép kiểm này bắt — nếu không thì nó chẳng chứng minh được gì.
//    Đây là câu thật đã suýt được push.
const regressed = "Send button did not become ready (typing_path=paste_event, typing_ok=false, composer_len 27->172, prompt_len=145). The Flow composer may never have accepted the prompt, or the Flow DOM changed.";
assert.equal(CORE.classifyFailure(new Error(regressed), "PRE_SUBMIT"), "RECEIVER_LOST", "phép kiểm này phải bắt được đúng bản đã hỏng, nếu không nó vô dụng");
assert.equal(CORE.canRetry({ retry_count: 0, settings: { max_retries: 2 } }, "RECEIVER_LOST"), false, "RECEIVER_LOST phải là mất quyền thử lại — đó là lý do bản cũ nguy hiểm");

console.log("send gate error keeps its failure classification: PASS");
