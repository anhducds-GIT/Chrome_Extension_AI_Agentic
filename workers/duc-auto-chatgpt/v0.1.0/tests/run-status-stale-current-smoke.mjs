/**
 * Ghim B-10: `run.status` KHÔNG được khai một job đang chạy khi run đã kết thúc.
 *
 * Bắt được tận tay 26/08 sau khi `run.stop` dừng `trial-09c93cd4`: cùng một thời điểm,
 * `run.status` trả `state: "IDLE"` mà vẫn kèm
 * `current: {job_id: "Q001", phase: "SUBMITTED", runtime_stage: "GENERATING"}`.
 * Gốc bệnh: `setCurrent(null, …)` được gọi lúc nạp workbook và lúc nạp resume, nhưng
 * KHÔNG BAO GIỜ lúc run kết thúc — nên giữa hai run `state.currentItem` vẫn trỏ vào job
 * cuối của run TRƯỚC. Trường `state` đọc `state.running` nên nói đúng; trường `current`
 * đọc `state.currentItem` nên nói sai. Một agent đọc `current` sẽ kết luận có job đang
 * sinh trong khi panel đang rảnh.
 *
 * KHÔNG grep chữ: cắt chính khối đã ship ra khỏi `sidepanel.js` và CHẠY `bridgeRunStatus`
 * trong `node:vm`. Grep chỉ thấy chuỗi `state.running` có mặt; nó không phân biệt được
 * "có chốt" với "chốt đặt sai nhánh".
 *
 * Ghim CẢ BỐN mép, vì ba trong bốn là chỗ một bản vá quá tay sẽ làm hỏng:
 *   ⑴ rảnh mà còn `currentItem` cũ  → `current` phải `null`  (chính con bug)
 *   ⑵ đang chạy                      → `current` phải CÓ     (chống vá quá tay thành mù hẳn)
 *   ⑶ đang tạm dừng                  → `current` phải CÓ     (`paused` vẫn là run đang sống)
 *   ⑷ HALTED, không chạy             → `current` phải `null` **và** `halt.job_id` phải nêu
 *      tên job bị chặn. Mép này tồn tại vì chốt ở ⑴ làm MẤT danh tính job trong ca halt:
 *      trước lượt vá, `halt` không hề mang `job_id`. Sửa một trường đúng mà đánh rơi một
 *      trường khác thì không phải sửa.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const sidepanel = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");

const start = sidepanel.indexOf("  function elapsedSecSince(startedAt) {");
const end = sidepanel.indexOf("  function renderBridgeDevMode()", start);
assert.ok(start >= 0, "MỎ NEO KHÔNG KHỚP: không thấy elapsedSecSince trong sidepanel.js");
assert.ok(end > start, "MỎ NEO KHÔNG KHỚP: không thấy mép cuối của khối run.status");
const source = sidepanel.slice(start, end);
assert.match(source, /function bridgeRunStatus\(\)/, "MỎ NEO KHÔNG KHỚP: khối cắt ra không chứa bridgeRunStatus");

const now = Date.now();

/** Dựng lại panel ở một trạng thái, rồi CHẠY `bridgeRunStatus` đã ship. */
function runStatusWith({ running, paused = false, queue = [], currentItem = null, lastFailure = null }) {
  const state = {
    running,
    paused,
    pauseRequested: false,
    artifactErrors: [],
    bridgeTrialId: null,
    bridgeRunOrigin: null,
    currentStartedAt: now - 300000,
    stageStartedAt: now - 42000,
    stageBudgetSec: 900,
    currentItem,
    lastFailure,
    prepared: { queue }
  };
  const context = {
    console, Date, Math, String, Object,
    state,
    requireBridgeWorkbook: () => ({ config: {} }),
    checkpointSummary: () => null,
    window: {
      DacXlsx: { activeJobs: () => [] },
      DacRunnerCore: { HARD_STOP_FAILURE_TYPES: new Set(["SECURITY_HARD_STOP"]) },
      DacHaltInstructions: { findInstruction: () => "Mở lại tab ChatGPT rồi chạy lại." }
    }
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(`${source}\nglobalThis.__runStatus = bridgeRunStatus;`, context);
  return context.__runStatus();
}

/* Job cuối của run TRƯỚC — đúng hình dạng đã đo live 26/08. */
const jobCuaRunTruoc = {
  job: { id: "Q001" },
  attempt_id: "att-1",
  phase: "SUBMITTED",
  runtime_stage: "GENERATING",
  settings: { timeout_sec: 900 }
};

/* ⑴ Chính con bug: run đã xong, `currentItem` chưa ai xoá. */
{
  const r = runStatusWith({
    running: false,
    currentItem: jobCuaRunTruoc,
    queue: [{ job: { id: "Q001" }, status: "SUCCESS", phase: "SUBMITTED", failure_type: "" }]
  });
  assert.equal(r.state, "IDLE", "run đã xong thì state phải IDLE");
  assert.equal(
    r.current,
    null,
    "B-10: rảnh mà `current` vẫn nêu tên một job là nói sai — đúng cái đã đo live 26/08 " +
    "(`state: IDLE` kèm `current: {job_id: Q001, runtime_stage: GENERATING}`)"
  );
}

/* ⑵ Mép ngược: đang chạy thì KHÔNG được mù. Thiếu mép này thì `current: null`
   vô điều kiện cũng làm ⑴ xanh, mà đó là bỏ hẳn tính năng báo tiến độ. */
{
  const r = runStatusWith({
    running: true,
    currentItem: jobCuaRunTruoc,
    queue: [{ job: { id: "Q001" }, status: "RUNNING", phase: "SUBMITTED", failure_type: "" }]
  });
  assert.equal(r.state, "RUNNING");
  assert.ok(r.current, "đang chạy thì `current` phải có — chốt không được bịt luôn đường báo tiến độ");
  assert.equal(r.current.job_id, "Q001");
  assert.equal(r.current.runtime_stage, "GENERATING");
  assert.equal(r.current.stage_elapsed_sec, 42, "và đồng hồ chặng vẫn phải chạy (ADR-0015 vế ②)");
}

/* ⑶ Tạm dừng vẫn là run đang sống: `running` vẫn true, nên `current` vẫn phải có.
   Một bản vá gate theo `!paused` thay vì `running` sẽ đỏ ở đây. */
{
  const r = runStatusWith({
    running: true,
    paused: true,
    currentItem: jobCuaRunTruoc,
    queue: [{ job: { id: "Q001" }, status: "RUNNING", phase: "SUBMITTED", failure_type: "" }]
  });
  assert.equal(r.state, "PAUSED");
  assert.ok(r.current, "tạm dừng KHÔNG phải kết thúc — job vẫn đang giữ chỗ");
  assert.equal(r.current.job_id, "Q001");
}

/* ⑷ HALTED: chốt ở ⑴ làm `current` null, nên danh tính job bị chặn phải ra bằng
   đường khác. Trước lượt vá B-10, `halt` KHÔNG mang `job_id` — nên nếu ai gỡ
   trường đó đi, agent mất hẳn cách biết job nào đang chặn cả hàng đợi. */
{
  const r = runStatusWith({
    running: false,
    currentItem: jobCuaRunTruoc,
    queue: [{ job: { id: "Q007" }, status: "FAILED", phase: "SUBMITTED", failure_type: "SECURITY_HARD_STOP" }]
  });
  assert.equal(r.state, "HALTED", "có job hard-stop thì state phải HALTED, không phải IDLE");
  assert.equal(r.current, null, "halt không chạy, nên `current` vẫn phải null");
  assert.ok(r.halt, "phải có khối halt");
  assert.equal(
    r.halt.job_id,
    "Q007",
    "halt phải nêu ĐÚNG job bị chặn — và phải lấy từ hàng đợi, không phải từ `currentItem` " +
    "(hai cái khác nhau: ở đây currentItem là Q001, job bị chặn là Q007)"
  );
  assert.equal(r.halt.failure_type, "SECURITY_HARD_STOP");
}

/* ⑸ B-39: `run.status` phải TRẢ RA mốc lỗi gần nhất. Thử phá lộ ra phép ghim cũ không canh
   chỗ này: gõ cứng `last_failure: null` trong payload thì mọi test vẫn xanh — tức trường này
   có thể bị bịt mà không ai biết. Đây là cửa DUY NHẤT một AI lái từ xa nhìn thấy lý do run
   chết, nên bịt nó là quay lại đúng B-39. */
{
  const moc = {
    job_id: "Q009", attempt_id: "att-9", status: "INTERRUPTED", phase: "SUBMITTED",
    failure_type: "POST_SUBMIT_UNCERTAIN", message: "khong quy duoc ket qua", retry_count: 0,
    run_id: "run-9", at: "2026-09-08T15:00:00.000Z"
  };
  const r = runStatusWith({ running: false, lastFailure: moc, queue: [] });
  assert.equal(r.state, "IDLE");
  assert.equal(r.current, null, "vẫn phải giữ B-10: rảnh thì current null");
  assert.deepEqual(
    r.last_failure,
    moc,
    "B-39: run.status phải trả nguyên mốc lỗi gần nhất — thiếu nó thì `IDLE` + `current: null` " +
    "không phân biệt được 'chạy xong sạch' với 'chết vì không quy được kết quả'"
  );
}

/* ⑹ Mép ngược: chưa có lỗi nào thì phải là `null`, không phải một object rỗng hay `undefined`.
   Một trường luôn có mặt với nội dung vô nghĩa đọc y như im lặng. */
{
  const r = runStatusWith({ running: true, currentItem: jobCuaRunTruoc, queue: [] });
  assert.equal(r.last_failure, null, "chưa có lỗi nào thì last_failure phải là null");
}
/* ---------- DÂY NỐI của B-39, không chỉ cái trường ----------
   Thử phá 08/09 lộ ra: xoá hẳn lời gọi `noteLastFailure` trong `markInterrupted` thì mọi test
   vẫn xanh. Trường có, hàm ghi có, mà không ai gọi — và `INTERRUPTED` mới đúng là kết cục hay
   gặp nhất của một lượt chạy qua Bridge (cả ba job đo live 08/09 đều kết thúc như thế). */
{
  const dauMI = sidepanel.indexOf("  function noteLastFailure(item, status, failureType, message) {");
  assert.ok(dauMI >= 0, "MỎ NEO KHÔNG KHỚP: không thấy noteLastFailure");
  const cuoiMI = sidepanel.indexOf("\n  function retriesExhausted(", dauMI);
  assert.ok(cuoiMI > dauMI, "MỎ NEO KHÔNG KHỚP: không thấy mép cuối của khối markInterrupted");
  const khoi = sidepanel.slice(dauMI, cuoiMI);
  assert.match(khoi, /function markInterrupted\(/, "MỎ NEO KHÔNG KHỚP: khối cắt ra phải chứa markInterrupted");

  const state = { lastFailure: null, runId: "run-7" };
  const ctx = {
    console, Date, String, Object,
    state,
    update: () => {}, audit: () => {}, log: () => {}, setCurrent: () => {},
    renderQueue: () => {}, progress: () => {}
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(`${khoi}\nglobalThis.__mi = markInterrupted;`, ctx);

  const item = { job: { id: "Q005" }, attempt_id: "att-5", phase: "SUBMITTED", retry_count: 1, attempt_count: 2 };
  ctx.__mi(item, "POST_SUBMIT_UNCERTAIN", "khong quy duoc ket qua");

  assert.ok(state.lastFailure, "markInterrupted PHẢI ghi mốc lỗi — đây là kết cục hay gặp nhất của một lượt chạy qua Bridge");
  assert.equal(state.lastFailure.job_id, "Q005");
  assert.equal(state.lastFailure.status, "INTERRUPTED", "phải ghi đúng INTERRUPTED, không phải FAILED — hai cái đó dẫn tới hai cách xử khác nhau ở resume");
  assert.equal(state.lastFailure.failure_type, "POST_SUBMIT_UNCERTAIN");
  assert.equal(state.lastFailure.run_id, "run-7", "phải kèm run_id, để agent biết mốc này thuộc lượt chạy nào");
  assert.match(state.lastFailure.at, /^\d{4}-\d{2}-\d{2}T/, "phải kèm mốc thời gian ISO");
}

/* Lượt XOÁ lúc bắt đầu run mới. TĨNH, và nói rõ là tĩnh: dòng này nằm giữa thân `run()` dài,
   không cắt ra chạy riêng được mà không kéo theo nửa panel. Khẳng định tĩnh vẫn bắt được cái
   nó cần bắt — ai xoá dòng này thì mốc lỗi của run TRƯỚC sống sang run SAU, và agent đọc một
   lỗi cũ rồi tưởng lượt chạy vừa rồi hỏng. */
{
  const dong = sidepanel.split("\n").find((l) => l.includes("state.pauseRequested = false") && l.includes("state.retryResumeAt = null"));
  assert.ok(dong, "MỎ NEO KHÔNG KHỚP: không thấy dòng reset đầu run");
  assert.match(
    dong,
    /state\.lastFailure = null;/,
    "bắt đầu một run mới phải XOÁ mốc lỗi cũ — giữ lại là để agent đọc lỗi của run trước rồi " +
    "kết luận nhầm cho run này"
  );
}

console.log("B-10 run.status không khai job cũ khi rảnh (8 mép, gồm dây nối B-39): PASS");
