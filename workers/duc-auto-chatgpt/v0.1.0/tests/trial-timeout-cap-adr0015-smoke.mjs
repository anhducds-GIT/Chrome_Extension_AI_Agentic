/* Ghim ADR-0015 — trần `run.trial` = 900 giây, `run.start` VẪN CẤM.
 *
 * Hai vế, và vế thứ hai mới là vế bảo vệ:
 *   ⑴ 900 được nhận  →  nếu chỉ ghim vế này thì bản vá "bỏ trần" cũng xanh.
 *   ⑵ 901 bị TỪ CHỐI →  đây là chỗ phân biệt "nới trần" với "bỏ trần".
 *
 * Cộng hai điều kiện đi kèm mà ADR ghi rõ là PHẦN CỦA QUYẾT ĐỊNH:
 *   ① trần khai ở ĐÚNG MỘT CHỖ (`LIMITS.trial_timeout_cap_sec`), không con số
 *      nào được gõ lại ở chỗ gọi — bốn bản sao của một luật là bốn cơ hội để
 *      chúng nói khác nhau, và repo này đã trả giá cho đúng chuyện đó;
 *   ② `run.status` phải trả ĐỒNG HỒ, không chỉ trả tên chặng — một đường 900
 *      giây im lặng thì không phân biệt được "đang chạy" với "đã treo".
 *
 * Vế ② không grep chữ: cắt `elapsedSecSince` + `bridgeRunStatus` đã ship ra
 * khỏi `sidepanel.js` và CHẠY chúng trong `node:vm`, với đồng hồ do harness
 * cầm. Có chữ mà số không bò lên thì vẫn là im lặng.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const CAP = 900;

/* ---------- lõi: bridge-core.js thật, chạy trong vm ---------- */
const context = { console, TextEncoder, crypto: globalThis.crypto, structuredClone };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL("../bridge-core.js", import.meta.url), "utf8"), context);
const core = context.DacBridgeCore;

/* ⑴ Con số Đức chốt, đọc từ chỗ khai duy nhất. */
assert.equal(core.LIMITS.trial_timeout_cap_sec, CAP, "ADR-0015 chốt 900 — đây là timeout của chính workbook Pilot-08, không phải số tròn chọn cho đẹp");

const freshQueue = () => [{ settings: { timeout_sec: 2400 } }, { settings: { timeout_sec: 60 } }];

/* ⑴ 900 được nhận, và nó thật sự nới tới 900 chứ không âm thầm cắt về 90. */
{
  const prepared = { timeout_sec: 2000 };
  const queue = freshQueue();
  const plan = core.capTrialTimeouts(prepared, queue, CAP);
  assert.equal(plan.cap_sec, CAP);
  assert.equal(plan.prepared_settings.timeout_sec, CAP, "trần mới phải thật sự cho phép 900");
  assert.deepEqual(queue.map((item) => item.settings.timeout_sec), [CAP, 60], "cắt xuống trần, và KHÔNG kéo dài job vốn ngắn hơn");
}

/* ⑵ VẾ BẢO VỆ: trên trần vẫn bị từ chối. Không có dòng này thì đây là bản vá
   "bỏ trần", và ADR-0015 nói thẳng bỏ trần là bỏ luôn thứ chặn một vòng lặp
   hỏng chạy vô hạn. */
assert.throws(() => core.capTrialTimeouts({ timeout_sec: 60 }, freshQueue(), CAP + 1), /15-900 second cap/, "901 phải bị từ chối — nới trần, không phải bỏ trần");
assert.throws(() => core.capTrialTimeouts({ timeout_sec: 60 }, freshQueue(), 3600), /15-900 second cap/);
assert.throws(() => core.capTrialTimeouts({ timeout_sec: 60 }, freshQueue(), Number.MAX_SAFE_INTEGER), /15-900 second cap/);

/* Lớp bảo vệ CŨ không được yếu đi cùng lượt nới: sàn 15 giây, và mọi thứ
   không phải số nguyên. */
assert.throws(() => core.capTrialTimeouts({ timeout_sec: 60 }, freshQueue(), 14), /15-900 second cap/, "sàn 15 giây vẫn còn");
assert.throws(() => core.capTrialTimeouts({ timeout_sec: 60 }, freshQueue(), 900.5), /15-900 second cap/);
assert.throws(() => core.capTrialTimeouts({ timeout_sec: 60 }, freshQueue(), "900"), /15-900 second cap/);
assert.throws(() => core.capTrialTimeouts({ timeout_sec: 60 }, freshQueue(), Infinity), /15-900 second cap/);
assert.throws(() => core.capTrialTimeouts(null, freshQueue(), CAP), /prepared settings/);
assert.throws(() => core.capTrialTimeouts({ timeout_sec: 60 }, "not-a-queue", CAP), /run queue/);

/* ① Mặc định của hàm phải LÀ chính con số cấu hình, không phải một bản sao
   viết tay tình cờ bằng nhau. */
{
  const queue = freshQueue();
  const plan = core.capTrialTimeouts({ timeout_sec: 2000 }, queue);
  assert.equal(plan.cap_sec, core.LIMITS.trial_timeout_cap_sec, "tham số mặc định phải đọc từ LIMITS, không gõ lại con số");
}

/* ⑵ `run.start` VẪN CẤM. Đức nói rõ lúc chốt: nới đường thử cho khớp việc
   thật, KHÔNG trao cho AI khả năng tự tiêu credit. */
assert.deepEqual(Array.from(core.POLICY.prohibited_methods), ["run.start", "run.pause", "run.resume"], "ADR-0015 không mở run.start — gỡ nó khỏi danh sách cấm là việc không ai được làm");
assert.equal(core.POLICY.auto_execute, false);
assert.equal(core.POLICY.executor_model, "side_panel_only");
for (const forbidden of ["run.start", "run.pause", "run.resume"]) {
  assert.equal(Object.hasOwn(core.METHOD_REGISTRY, forbidden), false, `${forbidden} không được có mặt trong registry`);
}
/* Và cửa dev-mode vẫn là cửa: trần rộng hơn không có nghĩa là cửa mở sẵn. */
assert.throws(() => core.assertTrialDevMode(false), /DEV_MODE_OFF/);
assert.throws(() => core.assertTrialDevMode(undefined), /DEV_MODE_OFF/);
assert.equal(core.assertTrialDevMode(true), true);

/* ---------- ① một chỗ khai: soi chỗ gọi trong sidepanel.js ---------- */
const sidepanel = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");

const callSites = sidepanel.match(/capTrialTimeouts\([^)]*\)/g) || [];
assert.ok(callSites.length > 0, "MỎ NEO KHÔNG KHỚP: không tìm thấy lời gọi capTrialTimeouts nào trong sidepanel.js — công cụ đo hỏng, không phải 'không có gì phải sửa'");
for (const site of callSites) {
  assert.match(site, /LIMITS\.trial_timeout_cap_sec/, `chỗ gọi phải đọc trần từ cấu hình, thấy: ${site}`);
  assert.ok(!/\d/.test(site), `chỗ gọi không được gõ con số nào, thấy: ${site}`);
}

/* Hai trường nữa từng chứa bản sao của con số: nhãn audit và reservation trả
   về. Cả hai phải dẫn xuất, không gõ. */
const capFields = sidepanel.match(/(?:bridge_trial_timeout_cap_sec|timeout_cap_sec):[^,}]*/g) || [];
assert.equal(capFields.length, 2, `phải còn đúng 2 trường công bố trần (audit + reservation), thấy ${capFields.length}`);
for (const field of capFields) {
  assert.ok(!/\d/.test(field), `trường công bố trần không được gõ con số, thấy: ${field}`);
  assert.match(field, /LIMITS\.trial_timeout_cap_sec|trialTimeoutPlan\.cap_sec/, `trường công bố trần phải dẫn xuất, thấy: ${field}`);
}

/* ---------- ② đồng hồ tiến độ: CHẠY hàm đã ship ---------- */
const statusStart = sidepanel.indexOf("  function elapsedSecSince(startedAt) {");
const statusEnd = sidepanel.indexOf("  function renderBridgeDevMode()", statusStart);
assert.ok(statusStart >= 0, "MỎ NEO KHÔNG KHỚP: không thấy elapsedSecSince trong sidepanel.js");
assert.ok(statusEnd > statusStart, "MỎ NEO KHÔNG KHỚP: không thấy mép cuối của khối run.status");
const statusSource = sidepanel.slice(statusStart, statusEnd);
assert.match(statusSource, /function bridgeRunStatus\(\)/, "MỎ NEO KHÔNG KHỚP: khối cắt ra không chứa bridgeRunStatus");

const now = Date.now();
const panelState = {
  running: true,
  paused: false,
  pauseRequested: false,
  runId: "run-1",
  artifactErrors: [],
  bridgeTrialId: "trial-adr15",
  bridgeRunOrigin: "bridge_dev",
  currentStartedAt: now - 300000,
  stageStartedAt: now - 42000,
  stageBudgetSec: CAP,
  currentItem: { job: { id: "Q001" }, attempt_id: "att-1", phase: "SUBMITTED", runtime_stage: "GENERATING", settings: { timeout_sec: CAP } },
  prepared: { queue: [{ job: { id: "Q001" }, status: "RUNNING", phase: "SUBMITTED", failure_type: "" }] }
};
const statusContext = {
  console,
  Date,
  Math,
  String,
  Object,
  state: panelState,
  requireBridgeWorkbook: () => ({ config: { run_id: "run-1" } }),
  checkpointSummary: () => null,
  window: {
    DacXlsx: { activeJobs: () => [] },
    DacRunnerCore: { HARD_STOP_FAILURE_TYPES: new Set(["SECURITY_HARD_STOP"]) },
    DacHaltInstructions: { findInstruction: () => null }
  }
};
statusContext.globalThis = statusContext;
vm.createContext(statusContext);
vm.runInContext(`${statusSource}\nglobalThis.__runStatus = bridgeRunStatus;`, statusContext);
const runStatus = statusContext.__runStatus;

{
  const first = runStatus();
  assert.equal(first.state, "RUNNING");
  assert.equal(first.current.runtime_stage, "GENERATING");
  /* Đây là toàn bộ điểm của vế ②: có ĐỒNG HỒ, không chỉ có tên chặng. */
  assert.equal(first.current.stage_elapsed_sec, 42, "run.status phải nói chặng hiện tại đã chạy bao lâu");
  assert.equal(first.current.job_elapsed_sec, 300, "và job này đã chạy bao lâu");
  assert.equal(first.current.stage_budget_sec, CAP, "cộng hạn của chặng, để so được elapsed với budget");

  /* Hỏi lại 7 giây sau: con số phải BÒ LÊN. Một trường đứng yên vĩnh viễn
     (hằng số, hoặc mốc chụp một lần lúc bind) đọc y như im lặng. */
  panelState.stageStartedAt = now - 49000;
  panelState.currentStartedAt = now - 307000;
  const second = runStatus();
  assert.ok(second.current.stage_elapsed_sec > first.current.stage_elapsed_sec, "hai lần hỏi liên tiếp phải phân biệt được: đồng hồ chặng phải bò lên");
  assert.ok(second.current.job_elapsed_sec > first.current.job_elapsed_sec, "đồng hồ job phải bò lên");

  /* Vượt hạn phải ĐỌC RA ĐƯỢC từ payload, không cần đoán. */
  panelState.stageStartedAt = now - (CAP + 30) * 1000;
  const overdue = runStatus();
  assert.ok(overdue.current.stage_elapsed_sec > overdue.current.stage_budget_sec, "quá hạn phải suy được từ chính payload");
}

/* Mép ngược: không có job nào đang chạy thì đồng hồ là null, không phải 0.
   0 giây đọc như "vừa mới bắt đầu" — đúng câu trả lời sai lúc không có gì
   đang chạy cả. */
{
  panelState.currentItem = null;
  panelState.currentStartedAt = null;
  panelState.stageStartedAt = null;
  panelState.stageBudgetSec = null;
  panelState.running = false;
  const idle = runStatus();
  assert.equal(idle.current, null);
  assert.equal(idle.state, "IDLE");
}

/* Và mép cuối: `run.trial` trả về NGAY rồi chỉ sang đường hỏi lại — nếu nó
   chờ tới lúc job xong thì mọi đồng hồ ở trên là vô nghĩa. */
const trialEntry = core.METHOD_REGISTRY["run.trial"];
assert.ok(trialEntry.deadline_ms <= 30000, "run.trial phải trả reservation ngay, không giữ dây 900 giây");
const handlerStart = sidepanel.indexOf("async function bridgeRunTrial");
const handlerEnd = sidepanel.indexOf("function connectBridgeExecutor", handlerStart);
assert.ok(handlerStart >= 0 && handlerEnd > handlerStart, "MỎ NEO KHÔNG KHỚP: không cắt được bridgeRunTrial");
assert.match(sidepanel.slice(handlerStart, handlerEnd), /poll_method: "run\.status"/, "reservation phải chỉ đúng sang đường hỏi tiến độ");

console.log("ADR-0015 trial timeout cap (900s) + run.start still prohibited: PASS");
