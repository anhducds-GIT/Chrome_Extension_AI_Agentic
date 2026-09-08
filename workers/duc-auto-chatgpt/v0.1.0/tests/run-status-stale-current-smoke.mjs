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
function runStatusWith({ running, paused = false, queue = [], currentItem = null }) {
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

console.log("B-10 run.status không khai job cũ khi rảnh (4 mép): PASS");
