/* Ghim: HALT SAU KHI ĐÃ LƯU XONG thì CHẠY TIẾP ĐƯỢC, và không gửi lại.
 * Đức chốt 14/09, sau khi một task suy luận 10-15 phút của anh bị chặn đúng kiểu này.
 *
 * CHUYỆN ĐÃ XẢY RA: job text gửi đi, ChatGPT trả lời, chữ được ghi vào Result XLSX và
 * XÁC MINH xong. Rồi ô soạn của ChatGPT không kịp rảnh → `READINESS_TIMEOUT_AFTER_SAVE`
 * → `markInterrupted()` ghi `status: INTERRUPTED` → `classify()` xếp vào
 * `AMBIGUOUS_SUBMITTED` = BLOCKER → **Continue Run bị chặn hẳn**. Lối ra còn lại là
 * Recreate, mà Recreate GỬI LẠI PROMPT — đốt thêm 10-15 phút cho câu trả lời đã nằm
 * trên đĩa. Luật cũ ĐẨY người về phía gửi lại.
 *
 * SAFE_COMPLETE ở đây KHÔNG phải nới exact-once, nó SIẾT: nghĩa của nó là BỎ QUA.
 *
 * Mỗi phép ghim dưới đây phải PHÂN BIỆT ĐƯỢC hai nhánh — nhận đúng ca của Đức mà không
 * từ chối ba ca hàng xóm thì bản vá "bỏ hết chốt chặn" cũng xanh.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const context = { console, TextEncoder, crypto: globalThis.crypto, structuredClone };
context.window = context;
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL("../resume-core.js", import.meta.url), "utf8"), context);
const resume = context.DacResumeCore;

/* Một hàng text ĐÃ LƯU XONG rồi mới halt — đúng hình dạng sổ mà markInterrupted() để lại. */
const CHU = "Câu trả lời đã xong và đã ghi vào Result XLSX.";
const daLuu = (thua = {}) => ({
  id: "Q001",
  status: "INTERRUPTED",
  failure_type: "READINESS_TIMEOUT_AFTER_SAVE",
  attempt_phase: "OUTPUT_SAVED",
  task_type: "text_reasoning",
  output_type: "text",
  persistence_verified: "true",
  response_text: CHU,
  response_char_count: String(CHU.length),
  response_sha256: "sha256:abcdefghijklmnopqrstuvwxyz0123456789",
  ...thua
});

/* ⑴ CA CỦA ĐỨC: nhận, và nhận với nghĩa BỎ QUA. */
const chinh = resume.classify(daLuu(), true);
assert.equal(chinh.state, "SAFE_COMPLETE", "job đã lưu xong rồi mới halt thì Continue Run phải chạy tiếp được");
assert.equal(chinh.code, "", "không mã chặn nào — mã chặn là thứ làm plan().ready thành false");
assert.match(chinh.message, /skipped|not resubmitted/i, "lời giải thích phải nói rõ là BỎ QUA, không phải gửi lại");

/* Và phải THẬT SỰ mở được cổng: plan().ready là thứ nút Continue Run đọc. */
const ke = resume.plan({ fileName: "R__results.xlsx", jobs: [daLuu()], config: { effective_result_xlsx: "R__results.xlsx" } });
assert.equal(ke.ready, true, "plan phải ready — đây là cổng thật, không phải nhãn hiển thị");
assert.equal(ke.summary.completed, 1);
assert.equal(ke.summary.ambiguous_submitted, 0);

/* Và hàng đợi phải được đánh dấu BỎ QUA, chứ không phải xếp lại để chạy. */
const hang = resume.applyToQueue([{ job: { id: "Q001" } }], ke.jobs);
assert.equal(hang[0].skipped, true, "SAFE_COMPLETE mà vẫn chạy lại thì cả bản vá là trang trí");
assert.equal(hang[0].protected_checkpoint, true);

/* ⑵ BA CHỐT CHẶN, mỗi cái gỡ riêng một cái và phải RỚT RIÊNG — nếu gỡ một cái mà vẫn
   SAFE_COMPLETE thì chốt đó không gánh gì. */
assert.notEqual(resume.classify(daLuu({ response_sha256: "" }), true).state, "SAFE_COMPLETE",
  "thiếu dấu vân tay → không được nhận (validSavedAttribution)");
assert.notEqual(resume.classify(daLuu({ persistence_verified: "false" }), true).state, "SAFE_COMPLETE",
  "chưa xác minh ghi đĩa → không được nhận");
assert.equal(resume.classify(daLuu(), false).state, "AMBIGUOUS_SUBMITTED",
  "BĂM LẠI LỆCH → vẫn chặn: ô câu trả lời bị sửa tay không được đi cửa này");
assert.equal(resume.classify(daLuu(), false).code, "RESUME_RESPONSE_HASH_MISMATCH",
  "và phải rớt đúng vào mã lệch-vân-tay, không phải một mã mơ hồ chung chung");

/* ⑶ CỐ Ý HẸP — ba ca hàng xóm KHÔNG được đi nhờ cửa này. */
assert.equal(resume.classify(daLuu({ failure_type: "POST_SUBMIT_UNCERTAIN" }), true).state, "AMBIGUOUS_SUBMITTED",
  "mã lỗi KHÁC thì vẫn chặn — cửa này chỉ mở cho ca hỏng SAU khi đã lưu");
assert.equal(resume.classify(daLuu({ failure_type: "" }), true).state, "AMBIGUOUS_SUBMITTED",
  "không có mã lỗi thì cũng vẫn chặn");
assert.equal(resume.classify(daLuu({ status: "PENDING", attempt_phase: "PRE_SUBMIT" }), true).state, "SAFE_PENDING",
  "job đang chờ THỬ LẠI (đường ảnh) giữ nguyên hành vi cũ — bản vá chỉ đụng ca ĐÃ DỪNG HẲN");
assert.equal(resume.classify(daLuu({ recreate_operator_approved: "true" }), true).state, "AMBIGUOUS_SUBMITTED",
  "đường Recreate do người duyệt vẫn đi luật riêng của nó, không bị cửa mới nuốt mất");

/* ⑷ Bảng Halt Đức đọc phải nói ĐÚNG hành vi mới. Một bảng nói "gửi lại prompt" trong khi
   mã đã bỏ qua thì chính bảng ấy là thứ làm người dùng bấm nhầm. */
const hi = new URL("../halt-instructions-core.js", import.meta.url);
const ctx2 = { console };
ctx2.window = ctx2; ctx2.globalThis = ctx2;
vm.createContext(ctx2);
vm.runInContext(fs.readFileSync(hi, "utf8"), ctx2);
const chiDan = ctx2.DacHaltInstructions.findInstruction("READINESS_TIMEOUT_AFTER_SAVE");
assert.match(chiDan.action, /SAFE_COMPLETE/, "bảng phải gọi đúng tên trạng thái mã thật dùng");
assert.match(chiDan.action, /response_sha256/, "và phải nói ra điều kiện băm lại, vì đó là thứ có thể từ chối anh");
assert.doesNotMatch(chiDan.retry, /^Yes,/, "dòng 'Tự động thử lại' cũ nói Yes — nay không còn đúng cho ca đã dừng hẳn");
assert.doesNotMatch(chiDan.action, /say so and this can be special-cased/i, "lời mời cũ đã được Đức trả lời 14/09; để lại là nói dối người đọc");

console.log("Chạy tiếp sau halt-đã-lưu (Đức chốt 14/09): PASS");
