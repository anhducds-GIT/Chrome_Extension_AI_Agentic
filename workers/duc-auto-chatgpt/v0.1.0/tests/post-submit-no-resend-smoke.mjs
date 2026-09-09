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
 * ĐỌC LẠI 2026-09-09 (ADR-0052) — HAI LOẠI "KHẲNG ĐỊNH", VÀ CON SỐ 0 CHỈ NÓI
 * VỀ LOẠI THỨ HAI. Câu "0 nguồn khẳng định" ở trên đúng, nhưng gọn tới mức
 * lệch: `B-41` đã dặn *"ai nối một nguồn khẳng định mới vào vòng chạy thì test
 * đỏ và phép đo phải làm lại"*, và 09/09 CÓ một nguồn mới được nối vào — mà
 * file này vẫn xanh. Không phải nó mù; hai loại khác nhau:
 *
 *   KHẲNG ĐỊNH DƯƠNG — "kết quả CÓ trên trang" → chốt SUCCESS, KHÔNG mở cửa
 *     gửi lại. Nay có HAI nguồn: ảnh (`reconcileSubmittedAttempt`) và chữ
 *     (`reconcileSubmittedText`, thêm 09/09 theo ADR-0052).
 *   KHẲNG ĐỊNH ÂM — "lượt gửi đó KHÔNG tạo ra gì" → đây là loại DUY NHẤT mở
 *     được cửa gửi lại theo chữ ADR-0047, và nó vẫn là 0.
 *
 * Luật của Đức xoay quanh loại ÂM, nên nó còn nguyên. Phần 4 dưới đây ĐẾM cả
 * hai con số thay cho một câu 0 trơn — vì một con số đọc được thì kiểm được,
 * còn một câu văn thì phiên sau phải tin.
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

function runShipped(item, failureType, { continue_on_error = true, repair = { ok: false, note: "sân khấu: không chữa được" }, repairsUsed = {}, stopRequested = false } = {}) {
  const calls = { retried: 0, interrupted: 0, failed: 0, slept: 0, lastFailure: null, repairAttempts: 0, repairsUsed };
  const sandbox = {
    window: { DacRunnerCore: runner },
    state: { stopRequested, repairsUsed },
    // ADR-0050 ⒝: cửa tự chữa. Stub ĐẾM lượt gọi chứ không rỗng — nhờ vậy khẳng định ở
    // dưới phân biệt được "chữa xong nên chạy tiếp" với "không chữa gì mà vẫn chạy tiếp",
    // hai thứ trông giống hệt nhau nếu chỉ nhìn outcome.
    repairWorkspaceSurface: async () => { calls.repairAttempts += 1; return repair; },
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
    // B-39: hai cửa settle cuối cùng nay ghi lại lượt kết thúc có lỗi gần nhất, để
    // `run.status` một mình đủ lái vòng chạy. Stub GHI LẠI chứ không rỗng — nhờ vậy
    // khẳng định ở dưới đo được là cửa nào ghi và ghi gì, thay vì chỉ cho hàm chạy qua.
    noteLastFailure: (item, status, failureType) => { calls.lastFailure = { job_id: item.job.id, status, failure_type: failureType }; },
    markInterrupted: () => { calls.interrupted += 1; }
  };
  vm.createContext(sandbox);
  vm.runInContext(`var resolveJobFailure;${shipped}resolveJobFailure`, sandbox);
  return sandbox.resolveJobFailure(item, failureType, "đo", { continue_on_error }).then((outcome) => ({ outcome, calls, item }));
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
  // B-39: cửa FAILED phải GHI mốc lỗi. Thiếu nó thì `run.status` trả `IDLE` trơn và
  // một AI lái từ xa không phân biệt được "xong sạch" với "chết vì hết lượt thử".
  assert.deepEqual(
    calls.lastFailure,
    { job_id: "Q001", status: "FAILED", failure_type: "TIMEOUT_PRE_SUBMIT" },
    "settle FAILED phải ghi mốc lỗi gần nhất, kèm đúng mã lỗi"
  );
  assert.equal(calls.interrupted, 0);
  assertOutcome(outcome, { completed: true, halted: false });
}

// (d) hard stop: KHÔNG loại nào được gửi lại. Từ ADR-0050 ⒝ (Đức chốt 08/09) hai loại
// được thử CHỮA trước — chữa hạ tầng, không gửi gì — nhưng chữa hỏng thì rơi về đúng
// đường cũ. Sân khấu mặc định là "không chữa được", nên vòng này đo đúng đường cũ.
for (const hardStop of runner.HARD_STOP_FAILURE_TYPES) {
  const { outcome, calls } = await runShipped({ ...baseItem(), phase: "PRE_SUBMIT" }, hardStop);
  assert.equal(calls.retried, 0, `${hardStop} vẫn không thử lại`);
  assert.equal(calls.interrupted, 1, `${hardStop} chữa không được thì vẫn INTERRUPTED`);
  assertOutcome(outcome, { completed: true, halted: true });
  assert.equal(
    calls.repairAttempts,
    runner.REPAIRABLE_FAILURE_TYPES.has(hardStop) ? 1 : 0,
    `${hardStop}: chỉ hai loại ADR-0050 ⒝ nêu mới được đụng vào trình duyệt của Đức. ` +
    "Chữa một hard stop khác là F5 hoặc điều hướng khi CAPTCHA đang hiện, hoặc khi hạn " +
    "mức đã hết — đâm vào tường, hoặc làm tình hình xấu đi."
  );
}

/* ---- phần 2b: ADR-0050 ⒝ — tự chữa, và cái nắp chặn nó thành vòng lặp ---- */

// Chỉ đúng hai loại. Đây là danh sách Đức chốt, không phải "mọi hard stop nghe có vẻ
// hạ tầng": DETECTION_BLIND cố ý KHÔNG có trong đó (ADR-0050 ⒞ — nó xảy ra SAU khi gửi,
// nên chữa xong phải ĐỐI SOÁT chứ không được chạy tiếp; đó là việc riêng của B-41 ⑵).
assert.deepEqual([...runner.REPAIRABLE_FAILURE_TYPES].sort(), ["RECEIVER_LOST", "WRONG_SURFACE"]);
for (const type of runner.REPAIRABLE_FAILURE_TYPES) {
  assert.ok(runner.HARD_STOP_FAILURE_TYPES.has(type), `${type} vẫn phải là hard stop khi không chữa được`);
}
assert.ok(runner.MAX_REPAIRS_PER_RUN > 0 && Number.isInteger(runner.MAX_REPAIRS_PER_RUN), "nắp phải là một số nguyên dương thật");

// Hợp đồng thuần của cửa chữa, ba điều kiện, mỗi cái một mép ngược.
assert.equal(runner.mayRepair({ phase: "PRE_SUBMIT" }, "RECEIVER_LOST", 0), true);
assert.equal(runner.mayRepair({ phase: "PRE_SUBMIT" }, "DETECTION_BLIND", 0), false, "ADR-0050 ⒞ tách DETECTION_BLIND ra: nó phải đối soát trước, không được chạy tiếp");
assert.equal(runner.mayRepair({ phase: "PRE_SUBMIT" }, "SECURITY_HARD_STOP", 0), false, "CAPTCHA thì tự chữa là đâm vào tường");
assert.equal(runner.mayRepair({ phase: "PRE_SUBMIT" }, "GENERATION_LIMIT_REACHED", 0), false, "hết hạn mức thì F5 bao nhiêu lần cũng thế");
// Mép quan trọng nhất của cả mục này. ADR-0050 ⒝ viết hai loại đó "xảy ra trước khi
// gửi", nhưng `activeTab()` ném RECEIVER_LOST ở BẤT KỲ đâu, kể cả sau khi prompt đã bay.
// Chữa lúc ấy là F5 đè lên một lượt đang chạy — đúng cái `chat.reload` từ chối làm, và
// nó có thể làm prompt được gửi lần hai.
assert.equal(runner.mayRepair({ phase: "SUBMITTED" }, "RECEIVER_LOST", 0), false, "đã gửi rồi thì tuyệt đối không chữa: F5 lúc đó có thể làm prompt bay lần hai");
assert.equal(runner.mayRepair({ phase: "PRE_SUBMIT", submission_uncertain: true }, "RECEIVER_LOST", 0), false, "không khẳng định được là chưa gửi thì cũng không chữa");
assert.equal(runner.mayRepair({ phase: "PRE_SUBMIT" }, "RECEIVER_LOST", runner.MAX_REPAIRS_PER_RUN), false, "hết nắp thì thôi");
assert.equal(runner.mayRepair({ phase: "PRE_SUBMIT" }, "RECEIVER_LOST", runner.MAX_REPAIRS_PER_RUN - 1), true, "còn một lần thì vẫn được chữa — nắp không được lệch một đơn vị");

// Chữa xong thì chạy tiếp, KHÔNG dừng, KHÔNG ăn một lượt max_retries.
for (const type of runner.REPAIRABLE_FAILURE_TYPES) {
  const repairsUsed = {};
  const { outcome, calls, item } = await runShipped({ ...baseItem(), phase: "PRE_SUBMIT" }, type, { repair: { ok: true, note: "đã chữa" }, repairsUsed });
  assert.equal(calls.repairAttempts, 1, `${type}: phải thật sự gọi cửa chữa`);
  assert.equal(calls.interrupted, 0, `${type}: chữa xong rồi thì không được dừng batch`);
  assertOutcome(outcome, { completed: false, halted: false }, `${type}: chữa xong thì trả về vòng chạy để thử lại từ cổng`);
  assert.equal(item.retry_count, 0, "chữa hạ tầng không gửi gì, nên nó KHÔNG được tiêu một lượt max_retries của lỗi khác");
  assert.equal(calls.slept, 0, "không chờ cooldown thử lại: đây không phải một lượt thử lại");
  assert.equal(repairsUsed[type], 1, "phải ĐẾM lượt chữa vào nắp — không đếm thì nắp không tồn tại");
}

// Nắp: hết lần thì rơi về đúng hành vi cũ, dù cửa chữa vẫn sẽ thành công.
// Thiếu mép này thì một bản bỏ nắp vẫn xanh, và đó là vòng lặp vô hạn ADR-0050 cảnh báo.
for (const type of runner.REPAIRABLE_FAILURE_TYPES) {
  const repairsUsed = { [type]: runner.MAX_REPAIRS_PER_RUN };
  const { outcome, calls } = await runShipped({ ...baseItem(), phase: "PRE_SUBMIT" }, type, { repair: { ok: true, note: "vẫn chữa được" }, repairsUsed });
  assert.equal(calls.repairAttempts, 0, `${type}: hết nắp thì không được đụng vào tab nữa`);
  assert.equal(calls.interrupted, 1, `${type}: hết nắp thì dừng hẳn như trước ADR-0050`);
  assertOutcome(outcome, { completed: true, halted: true });
  assert.equal(repairsUsed[type], runner.MAX_REPAIRS_PER_RUN, "hết nắp rồi thì đừng đếm thêm");
}

// Nắp đếm RIÊNG từng loại: dùng hết nắp của loại này không được khoá loại kia.
{
  const repairsUsed = { RECEIVER_LOST: runner.MAX_REPAIRS_PER_RUN };
  const { outcome, calls } = await runShipped({ ...baseItem(), phase: "PRE_SUBMIT" }, "WRONG_SURFACE", { repair: { ok: true, note: "đã chữa" }, repairsUsed });
  assert.equal(calls.repairAttempts, 1, "nắp là của TỪNG loại, không phải một nắp chung");
  assertOutcome(outcome, { completed: false, halted: false });
}

// Người vận hành bấm Dừng thì thôi chữa. Nếu không, một lệnh dừng có thể rơi vào giữa
// tối đa 20 giây chờ trang trả lời, và Đức thấy tab vẫn tự nạp lại sau khi đã bấm Dừng.
{
  const { outcome, calls } = await runShipped({ ...baseItem(), phase: "PRE_SUBMIT" }, "RECEIVER_LOST", { repair: { ok: true, note: "đã chữa" }, stopRequested: true });
  assert.equal(calls.repairAttempts, 0, "đã bấm Dừng thì không tự chữa nữa");
  assert.equal(calls.interrupted, 1);
  assertOutcome(outcome, { completed: true, halted: true });
}

// Cửa chữa phải đứng TRƯỚC canRetry(), và canRetry() phải giữ nguyên hình. Sửa thẳng
// vào canRetry để cho hai loại này qua là bỏ mất cái đảo-mặc-định ADR-0047 dựng.
for (const type of runner.REPAIRABLE_FAILURE_TYPES) {
  assert.equal(runner.canRetry({ phase: "PRE_SUBMIT", retry_count: 0, settings: { max_retries: 5 } }, type), false, `${type} vẫn KHÔNG được canRetry nới cho qua`);
}
// Bỏ chú giải trước khi soi thứ tự: chính khối chú giải của bản vá này nhắc tên
// `canRetry()` để giải thích, và đọc cả chú giải thì thứ tự đo được là thứ tự của VĂN,
// không phải của MÃ.
const shippedCode = shipped.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
const gate = shippedCode.indexOf("mayRepair(");
const retryGate = shippedCode.indexOf("canRetry(");
assert.ok(gate > 0 && retryGate > 0 && gate < retryGate, "cửa đối soát/chữa phải đứng TRƯỚC canRetry() trong hàm đã ship");

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

/* ---- phần 4: ĐẾM SỐ NGUỒN ĐỐI SOÁT, đọc thẳng từ mã đã ship -------------
   B-41 dặn: "viết lại để nó ĐẾM SỐ NGUỒN và ghim rằng mỗi nguồn đi qua đúng một
   cửa đối soát — đừng nới nó cho xanh." Đây là chỗ đó.

   Hai con số, hai ý nghĩa khác hẳn nhau:
     DƯƠNG (kết quả CÓ) → chốt SUCCESS, không mở cửa gửi lại
     ÂM   (không tạo ra gì) → loại DUY NHẤT mở được cửa gửi lại theo ADR-0047

   Đếm bằng cách đọc mã đã ship, không gõ tay một con số — gõ tay là ghim một
   bản sao, và bản sao thì lệch được ở một bên mà bên kia vẫn xanh. */
{
  const sp = read("sidepanel.js");
  const khongChuThich = sp.split("\n").filter((d) => !/^\s*(\/\/|\*|\/\*)/.test(d)).join("\n");

  const cuaDuong = [...khongChuThich.matchAll(/async function (reconcileSubmitted\w+)\(/g)].map((m) => m[1]);
  assert.deepEqual(
    cuaDuong.sort(), ["reconcileSubmittedAttempt", "reconcileSubmittedText"],
    "hai nguồn khẳng định DƯƠNG: ảnh và chữ. Thêm nguồn thứ ba thì ĐỌC LẠI luật trước, đừng nới mép này cho xanh"
  );

  /* Mỗi cửa dương phải rẽ về ĐÚNG MỘT lượt chốt, và tuyệt đối không gọi gì gửi
     prompt. Đây là vế biến "hai nguồn" thành an toàn, không phải con số 2. */
  for (const ten of cuaDuong) {
    const dau = khongChuThich.indexOf(`async function ${ten}(`);
    const sau = khongChuThich.indexOf("\n  async function ", dau + 10);
    const than = khongChuThich.slice(dau, sau > dau ? sau : undefined);
    assert.ok(!/DAC_RUN_TEXT_JOB|DAC_RUN_IMAGE_JOB|setContentEditableValue/.test(than),
      `${ten}: cửa đối soát KHÔNG được gọi bất cứ thứ gì gửi prompt — nó chỉ ĐỌC`);
    assert.match(than, /finishTextOutput\(|finishDetectedOutput\(/,
      `${ten}: phải rẽ về đường chốt CŨ, đừng đẻ ra cửa chốt thứ hai`);
  }

  /* KHẲNG ĐỊNH ÂM vẫn là 0. `verifyExistingOutput()` là hàm duy nhất phán được
     "ảnh này thuộc lượt gửi kia", và nó chỉ chạy khi NGƯỜI bấm nút. Ngày nào nó
     xuất hiện trên đường chạy tự động thì mép này đỏ, và luật phải đọc lại
     TRƯỚC khi nới — đó đúng là việc B-41 ⑵⑶ sẽ làm. */
  const goiTuDong = [...khongChuThich.matchAll(/verifyExistingOutput\(/g)].length;
  const goiTayNguoi = [...khongChuThich.matchAll(/DAC_MANUAL_RECONCILE_EXISTING_OUTPUT/g)].length;
  assert.ok(goiTayNguoi > 0, "mỏ neo hỏng: không thấy đường đối soát bấm tay của người");
  assert.equal(goiTuDong, 0,
    `KHẲNG ĐỊNH ÂM phải là 0 nguồn: thấy ${goiTuDong} chỗ gọi verifyExistingOutput() trong sidepanel. ` +
    "Đó là loại DUY NHẤT mở được cửa gửi lại, nên nối nó vào vòng chạy là đổi LUẬT của Đức, không phải sửa mã."
  );
}

console.log("B-19 post-submit no-resend smoke tests: PASS");
