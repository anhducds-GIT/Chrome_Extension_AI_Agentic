/**
 * GHIM CHO B-19 — sau khi đã gửi thì KHÔNG gửi lại, trừ khi đối soát khẳng
 * định được là lượt gửi đó không tạo ra kết quả nào.
 *
 * Luật Đức chốt 2026-09-06, nguyên văn: "Sau khi đã gửi, chỉ được gửi lại khi
 * đối soát khẳng định được là lượt gửi đó không tạo ra kết quả nào. Không
 * khẳng định được thì DỪNG và hỏi người."
 *
 * ĐO TRƯỚC KHI VÁ (bắt buộc, vì luật xoay quanh chữ "khẳng định được"):
 * lớp đối soát trong run là `reconcileSubmittedAttempt()` → `DAC_RECONCILE_
 * IMAGE_JOB` → `reconcileImageAttempt()` → `waitForCompletion()` lần hai.
 * Nó có ĐÚNG MỘT phán quyết dương — "có ảnh quy được về attempt này" — và
 * phán quyết đó rẽ sang `finishDetectedOutput()`, không bao giờ tới đường thử
 * lại. Ba lối ra còn lại đều là "KHÔNG chứng minh được":
 *   1. `send()` ném  → đối soát KHÔNG CHẠY  → POST_SUBMIT_UNCERTAIN
 *   2. lệch danh tính → đối soát TỪ CHỐI chạy → ATTEMPT_ID_MISMATCH
 *   3. hết giờ, không thấy gì                → POST_SUBMIT_UNCERTAIN
 * Không lối nào là "khẳng định lượt gửi đó KHÔNG tạo ra kết quả".
 * Số ca đối soát khẳng định được điều đó: 0.
 * `verifyExistingOutput()` — hàm DUY NHẤT trong gói có thể phán "ảnh này
 * thuộc lượt gửi kia" — có 0 chỗ gọi trên đường chạy tự động; nó chỉ chạy khi
 * người vận hành bấm nút (`DAC_MANUAL_RECONCILE_EXISTING_OUTPUT`). Phần 3 của
 * file này ĐẾM lại con số 0 đó, để hôm nào có người nối nó vào vòng chạy thì
 * test đỏ và luật được đọc lại, chứ không im lặng lệch.
 * Vì đo ra 0, luật của Đức thu về đúng "chặn hẳn sau khi đã gửi" — brief đã
 * ghi sẵn tình huống này nên không phải hỏi lại.
 *
 * Không grep mã: phần 2 CẮT chính hàm `resolveJobFailure()` đã ship ra khỏi
 * `sidepanel.js` rồi CHẠY nó trong `node:vm`. Một bản vá còn nguyên chữ mà
 * chết về hành vi (ví dụ đảo thứ tự hai nhánh, hay bỏ cờ trong vòng chạy) vẫn
 * phải làm test đỏ.
 *
 * Mỏ neo được ĐẾM. Ra 0 là công cụ hỏng, không phải "không có gì phải sửa".
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (name) => fs.readFileSync(path.join(here, "..", name), "utf8").split("\r\n").join("\n");

const context = {};
vm.runInNewContext(read("runner-core.js"), context);
const runner = context.DacRunnerCore;

/* ---- phần 1: hợp đồng thuần của canRetry ------------------------------- */

// Mọi loại lỗi KHÔNG phải hard stop và không phải USER_STOP — tức đúng tập
// hôm qua vẫn được thử lại. Sau khi đã gửi, không cái nào còn được thử lại.
const RETRYABLE_BEFORE = [...runner.FAILURE_TYPES].filter(
  (type) => !runner.HARD_STOP_FAILURE_TYPES.has(type) && type !== "USER_STOP"
);
assert.ok(RETRYABLE_BEFORE.length >= 10, `mỏ neo hỏng: chỉ thấy ${RETRYABLE_BEFORE.length} loại lỗi thử-lại-được`);

const POST_SUBMIT = ["SUBMITTED", "OUTPUT_DETECTED", "OUTPUT_SAVED", "CHAT_READY"];
let blocked = 0;
for (const phase of POST_SUBMIT) {
  for (const failureType of RETRYABLE_BEFORE) {
    assert.equal(
      runner.canRetry({ phase, retry_count: 0, settings: { max_retries: 5 } }, failureType),
      false,
      `${failureType} ở phase ${phase}: prompt đã bay, không được gửi lại`
    );
    blocked += 1;
  }
}
assert.equal(blocked, POST_SUBMIT.length * RETRYABLE_BEFORE.length);

// Mép ngược — KHÔNG được chặn quá tay. Trước lúc gửi thì thử lại vẫn đúng:
// không có prompt nào bay, và đó là phần lớn lượt thử lại thật (cổng sẵn sàng,
// đính ảnh tham chiếu hỏng).
for (const failureType of RETRYABLE_BEFORE) {
  assert.equal(
    runner.canRetry({ phase: "PRE_SUBMIT", retry_count: 0, settings: { max_retries: 2 } }, failureType),
    true,
    `${failureType} trước lúc gửi vẫn phải thử lại được — chặn cả chỗ này là làm hỏng tính năng, không phải siết an toàn`
  );
}
assert.equal(runner.canRetry({ phase: "PRE_SUBMIT", retry_count: 2, settings: { max_retries: 2 } }, "TIMEOUT_PRE_SUBMIT"), false, "trần max_retries còn nguyên");

// Cờ "không khẳng định được là chưa gửi": phase còn nói PRE_SUBMIT (receiver
// chưa kịp trả lời, hoặc trả lời về một attempt khác) mà cờ đã bật thì vẫn là
// DỪNG. Đây chính là chỗ đảo mặc định: không biết → không gửi lại.
assert.equal(runner.submissionMayExist({ phase: "PRE_SUBMIT", submission_uncertain: true }), true);
assert.equal(runner.submissionMayExist({ phase: "PRE_SUBMIT" }), false);
assert.equal(runner.submissionMayExist({ phase: "SUBMITTED" }), true);
assert.equal(
  runner.canRetry({ phase: "PRE_SUBMIT", submission_uncertain: true, retry_count: 0, settings: { max_retries: 2 } }, "ATTEMPT_ID_MISMATCH"),
  false,
  "không khẳng định được là chưa gửi thì cũng không được gửi lại"
);

// Hard stop giữ nguyên là hard stop — bản vá này chỉ được SIẾT, không được nới.
for (const hardStop of runner.HARD_STOP_FAILURE_TYPES) {
  assert.equal(runner.canRetry({ phase: "PRE_SUBMIT", retry_count: 0, settings: { max_retries: 5 } }, hardStop), false, `${hardStop} vẫn không bao giờ thử lại`);
}
assert.equal(runner.canRetry({ phase: "PRE_SUBMIT", retry_count: 0, settings: { max_retries: 5 } }, "USER_STOP"), false);

// Một lượt sau-khi-gửi chưa giải quyết được phải là INTERRUPTED (chặn Resume,
// bắt người nhìn), không phải FAILED (resume-core xếp FAILED là SAFE_FAILED =
// "bỏ qua an toàn" — mà một prompt đã bay thì chưa an toàn để bỏ qua).
assert.equal(runner.interruptedStatus("SUBMITTED", "POST_SUBMIT_UNCERTAIN"), "INTERRUPTED");
assert.equal(runner.interruptedStatus("OUTPUT_SAVED", "READINESS_TIMEOUT_AFTER_SAVE"), "INTERRUPTED");
assert.equal(runner.interruptedStatus("SUBMITTED", "RECEIVER_LOST"), "INTERRUPTED");
assert.equal(runner.interruptedStatus("PRE_SUBMIT", "TIMEOUT_PRE_SUBMIT"), "FAILED", "lỗi trước lúc gửi hết lượt thử vẫn là FAILED bỏ qua được");

/* ---- phần 2: chạy chính hàm resolveJobFailure() đã ship ---------------- */

const source = read("sidepanel.js");
const START = "\n  async function resolveJobFailure(item, failureType, message, settings) {\n";
const starts = source.split(START).length - 1;
assert.equal(starts, 1, "cắt được ĐÚNG một hàm resolveJobFailure() — 0 nghĩa là mỏ neo hỏng, không phải 'không có gì phải sửa'");
const from = source.indexOf(START) + 1;
const END = "\n  }\n";
const to = source.indexOf(END, from);
assert.ok(to > from, "không tìm thấy chỗ đóng hàm resolveJobFailure()");
const shipped = source.slice(from, to + END.length);
assert.ok(shipped.includes("markInterrupted"), "cắt nhầm khối: resolveJobFailure() phải chứa nhánh markInterrupted");

function runShipped(item, failureType, { continue_on_error = true } = {}) {
  const calls = { retried: 0, interrupted: 0, failed: 0, slept: 0 };
  const sandbox = {
    window: { DacRunnerCore: runner },
    state: {},
    Date,
    console,
    update: (_item, values) => { if (values.status === "PENDING") calls.retried += 1; if (values.status === "FAILED") calls.failed += 1; },
    audit: () => {},
    log: () => {},
    renderQueue: () => {},
    progress: () => {},
    setCurrent: () => {},
    renderRuntime: () => {},
    sleep: async (ms) => { calls.slept += ms; },
    // B-28: cooldown thử lại nay chờ qua `waitRetryCooldown()` (mốc thời gian thật, miễn
    // nhiễm với việc Chrome bóp hẹn giờ) chứ không qua `sleep()` trần. Ghi vào CÙNG bộ đếm
    // và cùng đơn vị, để khẳng định "vẫn phải chờ cooldown" ở dưới vẫn đo đúng cái nó đo:
    // ai bỏ hẳn lượt chờ thì `slept` về 0 và test đỏ, y như trước.
    waitRetryCooldown: async (seconds) => { calls.slept += seconds * 1000; },
    markInterrupted: () => { calls.interrupted += 1; }
  };
  vm.createContext(sandbox);
  vm.runInContext(`var resolveJobFailure;${shipped}resolveJobFailure`, sandbox);
  return sandbox.resolveJobFailure(item, failureType, "đo", { continue_on_error }).then((outcome) => ({ outcome, calls }));
}

const assertOutcome = (outcome, expected, note) => assert.deepEqual({ completed: outcome.completed, halted: outcome.halted }, expected, note);

const baseItem = () => ({ job: { id: "Q001" }, retry_count: 0, attempt_count: 1, settings: { max_retries: 2, safety_cooldown_sec: 1 } });

// (a) sau khi gửi, đối soát không khẳng định được → DỪNG và hỏi người.
for (const [phase, failureType] of [
  ["SUBMITTED", "POST_SUBMIT_UNCERTAIN"],
  ["SUBMITTED", "TIMEOUT_AFTER_SUBMIT"],
  ["SUBMITTED", "ATTEMPT_ID_MISMATCH"],
  ["SUBMITTED", "OUTPUT_AMBIGUOUS"],
  ["OUTPUT_DETECTED", "DOWNLOAD_FAILED"],
  ["OUTPUT_SAVED", "PERSISTENCE_VERIFICATION_FAILED"],
  ["OUTPUT_SAVED", "READINESS_TIMEOUT_AFTER_SAVE"]
]) {
  const { outcome, calls } = await runShipped({ ...baseItem(), phase }, failureType);
  assert.equal(calls.retried, 0, `${failureType} ở ${phase}: không được đặt lại PENDING (đặt lại = prompt bay lần nữa)`);
  assert.equal(calls.failed, 0, `${failureType} ở ${phase}: không được settle FAILED — FAILED là "bỏ qua an toàn" trong resume-core`);
  assert.equal(calls.interrupted, 1, `${failureType} ở ${phase}: phải INTERRUPTED để người vận hành nhìn`);
  assertOutcome(outcome, { completed: true, halted: true }, `${failureType} ở ${phase}: phải dừng cả batch`);
}

// (b) không khẳng định được là CHƯA gửi (receiver không trả lời khớp danh
// tính) — cũng DỪNG, dù phase còn nói PRE_SUBMIT.
{
  const { outcome, calls } = await runShipped({ ...baseItem(), phase: "PRE_SUBMIT", submission_uncertain: true }, "ATTEMPT_ID_MISMATCH");
  assert.equal(calls.retried, 0, "không biết đã gửi hay chưa thì mặc định là DỪNG, không phải gửi lại");
  assert.equal(calls.interrupted, 1);
  assertOutcome(outcome, { completed: true, halted: true });
}

// (c) mép ngược: trước lúc gửi vẫn thử lại bình thường, và hết lượt thì FAILED
// bỏ qua được — bản vá không được nuốt đường thử lại hợp lệ.
{
  const { outcome, calls } = await runShipped({ ...baseItem(), phase: "PRE_SUBMIT" }, "TIMEOUT_PRE_SUBMIT");
  assert.equal(calls.retried, 1, "lỗi trước lúc gửi vẫn phải thử lại");
  assert.equal(calls.interrupted, 0);
  assert.ok(calls.slept > 0, "vẫn phải chờ cooldown trước lượt thử lại");
  assertOutcome(outcome, { completed: false, halted: false });
}
{
  const { outcome, calls } = await runShipped({ ...baseItem(), phase: "PRE_SUBMIT", retry_count: 2 }, "TIMEOUT_PRE_SUBMIT");
  assert.equal(calls.retried, 0);
  assert.equal(calls.failed, 1, "hết lượt thử trước lúc gửi vẫn settle FAILED, hàng đợi chạy tiếp");
  assert.equal(calls.interrupted, 0);
  assertOutcome(outcome, { completed: true, halted: false });
}

// (d) hard stop giữ nguyên đường cũ — DETECTION_BLIND/WRONG_SURFACE tồn tại
// để chặn retry mù, bản vá này không được làm chúng yếu đi hay đổi hình.
for (const hardStop of runner.HARD_STOP_FAILURE_TYPES) {
  const { outcome, calls } = await runShipped({ ...baseItem(), phase: "PRE_SUBMIT" }, hardStop);
  assert.equal(calls.retried, 0, `${hardStop} vẫn không thử lại`);
  assert.equal(calls.interrupted, 1, `${hardStop} vẫn INTERRUPTED`);
  assertOutcome(outcome, { completed: true, halted: true });
}

/* ---- phần 3: vòng chạy phải BẬT/TẮT cờ đúng chỗ ------------------------ */

// Cờ phải được bật ở mốc đặt chỗ gửi — cùng chỗ với dấu rủi ro đã ghi vào sổ,
// tức TRƯỚC khi prompt có thể bay. Bật muộn hơn (sau khi có câu trả lời) là để
// hở đúng cửa "send() ném, không biết prompt đã bay chưa".
const reservation = source.indexOf("const reservation = window.DacRunnerCore.submissionReservation(item);");
assert.ok(reservation > 0, "mỏ neo hỏng: không thấy chỗ đặt chỗ gửi trong vòng chạy");
const sendCall = source.indexOf("DAC_RUN_TEXT_JOB", reservation);
assert.ok(sendCall > reservation, "mỏ neo hỏng: không thấy lời gọi gửi prompt sau chỗ đặt chỗ");
const raise = source.indexOf("item.submission_uncertain = true;");
assert.ok(raise > reservation && raise < sendCall, "cờ 'có thể đã gửi' phải bật GIỮA mốc đặt chỗ và lời gọi gửi prompt");

// Và chỉ được tắt bằng một câu trả lời KHỚP danh tính attempt: chỗ tắt phải
// nằm sau `applyAttemptTelemetry`, tức sau cửa `matchesAttempt`.
const telemetry = source.indexOf("applyAttemptTelemetry(item, response.attempt);", sendCall);
assert.ok(telemetry > sendCall, "mỏ neo hỏng: không thấy chỗ nạp telemetry của câu trả lời");
const lower = source.indexOf("item.submission_uncertain = false", telemetry);
assert.ok(lower > telemetry && lower - telemetry < 1200, "cờ chỉ được tắt ngay sau khi câu trả lời đã qua cửa khớp danh tính");
// Đọc ĐÚNG dòng tắt cờ, không đọc cả vùng quanh nó: một dòng tắt VÔ ĐIỀU KIỆN
// vẫn nằm cạnh những dòng có chữ "submittedAt", nên kiểm theo vùng là kiểm hụt
// (đột biến M7 lọt lưới đúng kiểu đó ở vòng thử phá đầu).
const lowerLine = source.slice(source.lastIndexOf("\n", lower) + 1, source.indexOf("\n", lower));
assert.ok(lowerLine.includes("if ("), "tắt cờ phải có điều kiện — tắt vô điều kiện là xoá luôn lớp bảo vệ");
assert.ok(lowerLine.includes("submittedAt"), "điều kiện tắt cờ phải đọc submittedAt của receiver");
assert.ok(lowerLine.includes("response.attempt"), "bằng chứng phải đến từ câu trả lời đã qua cửa khớp danh tính, không từ chỗ khác");

// Đường đối soát tự động không có phán quyết "khẳng định không có kết quả".
// Nếu con số này khác 0 thì ai đó đã nối `verifyExistingOutput` vào vòng chạy
// và phép đo ở đầu file phải được làm lại trước khi nới luật.
const autoProof = source.split("DAC_MANUAL_RECONCILE_EXISTING_OUTPUT").length - 1;
assert.equal(autoProof, 1, "verifyExistingOutput vẫn chỉ đi qua đúng một cửa, và cửa đó do người vận hành bấm");

console.log("B-19 post-submit no-resend smoke tests: PASS");
