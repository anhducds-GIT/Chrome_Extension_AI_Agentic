import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const context = { console, TextEncoder, crypto: globalThis.crypto, structuredClone };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL("../bridge-core.js", import.meta.url), "utf8"), context);
const core = context.DacBridgeCore;

const entry = core.METHOD_REGISTRY["run.trial"];
assert.deepEqual(JSON.parse(JSON.stringify({ context: entry.context, approval: entry.approval, read_only: entry.read_only, idempotent: entry.idempotent, deadline_ms: entry.deadline_ms })), {
  context: "executor", approval: "none", read_only: false, idempotent: true, deadline_ms: 30000
});
assert.deepEqual(JSON.parse(JSON.stringify(core.validateParams("run.trial", { job_ids: ["J-1", "J-2"] }))), { job_ids: ["J-1", "J-2"] });
// Owner amendment 2026-08-25: one trial is a chain of up to 30 jobs.
const thirty = Array.from({ length: 30 }, (_unused, index) => `J-${index + 1}`);
assert.deepEqual(JSON.parse(JSON.stringify(core.validateParams("run.trial", { job_ids: thirty }))), { job_ids: thirty });
assert.throws(() => core.validateParams("run.trial", { job_ids: [...thirty, "J-31"] }), /expected 1-30/);
assert.throws(() => core.validateParams("run.trial", { job_ids: [] }), /expected 1-30/);
assert.throws(() => core.validateParams("run.trial", { job_ids: ["J-1", "J-1"] }), /duplicate/);

const dispatcher = core.createDispatcher({
  handlers: { "run.trial": () => core.assertTrialDevMode(false) },
  replay_store: core.createMemoryReplayStore()
});
const response = await dispatcher({
  protocol: core.PROTOCOL, version: 1, kind: "request", request_id: "trial-off-1",
  method: "run.trial", sent_at: new Date().toISOString(),
  client: { client_id: "trial-test", name: "Trial test", version: "1" },
  params: { job_ids: ["J-1"] }
});
assert.equal(response.ok, false);
assert.equal(response.error.code, "VALIDATION_FAILED");
assert.equal(response.error.retryable, false);
assert.match(response.error.message, /DEV_MODE_OFF/);

const sidepanel = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");
const start = sidepanel.indexOf("async function bridgeRunTrial");
const end = sidepanel.indexOf("function connectBridgeExecutor", start);
const handler = sidepanel.slice(start, end);
assert.ok(start >= 0 && end > start);
// Đo cái await ĐẦU TIÊN, không đo một await CÓ TÊN. Bản cũ neo vào
// "await chrome.storage.local.get" và vỡ ngay khi B-42 tách phép kiểm nắp chờ ra một hàm
// dùng chung — tính chất (latch phải giữ trước await đầu tiên) không đổi một chữ, chỉ cách
// đo là sai. Neo vào một await có tên cũng dễ đọc thành PASS khi chuỗi đó biến mất: -1 nhỏ
// hơn mọi vị trí, nên phép so ">" sẽ xanh oan ở chiều ngược lại.
const awaitDau = handler.indexOf("await ");
assert.ok(awaitDau > 0, "mỏ neo hỏng: bridgeRunTrial() phải có ít nhất một await");
assert.ok(handler.indexOf("queueRunLock.tryBeginRun()") < awaitDau, "reservation latch must be acquired before the first await");
assert.match(handler, /selectQueue\(state\.prepared\.queue, "selected", state\.runSelection\)/);
assert.match(handler, /eligibleIds\.length !== params\.job_ids\.length/);
// Nắp chờ nay là MỘT hàm dùng chung với chat.say (B-42) — hằng nằm trong đó, không
// trong handler. Ghim chỗ GỌI, và ghim rằng nó gọi TRƯỚC mọi việc thật; đường "một ngân
// sách, mọi cửa" được ghim ở trial-cooldown-adr0050-smoke.mjs.
assert.ok(handler.includes("await assertBridgeSubmitCooldown();"), "run.trial phải đi qua nắp chờ DÙNG CHUNG, không một bản sao riêng");
assert.ok(handler.indexOf("await assertBridgeSubmitCooldown();") < handler.indexOf("authoritativeValidate"), "nắp chờ phải chặn TRƯỚC khi làm việc thật");
// ADR-0015: the cap is READ FROM CONFIG, never typed here. Asserting the
// literal 90 was itself a second copy of the number.
assert.match(handler, /capTrialTimeouts\(state\.prepared\.settings, runQueue, window\.DacBridgeCore\.LIMITS\.trial_timeout_cap_sec\)/);
assert.match(handler, /state\.prepared\.settings = trialTimeoutPlan\.prepared_settings/, "persisted effective settings must use the same configured cap");
assert.ok(handler.indexOf("await chrome.storage.local.set") < handler.indexOf("capTrialTimeouts("), "a rejected timestamp write must occur before and therefore cannot leak timeout mutations");
assert.ok(handler.indexOf("capTrialTimeouts(") < handler.indexOf('void run("selected")'), "timeout cap must be installed before the existing runner starts");
assert.ok(handler.indexOf("chrome.storage.local.set") < handler.indexOf('void run("selected")'), "accepted timestamp must persist before async run begins");
assert.match(handler, /input_origin.*bridge_dev|bridgeRunOrigin = "bridge_dev"/s);
const restoreStart = sidepanel.indexOf("function restoreRunOptions");
const runStart = sidepanel.indexOf('async function run(mode = "all")', restoreStart);
const restore = sidepanel.slice(restoreStart, runStart);
assert.match(restore, /restoreTrialTimeouts\(state\.prepared, options\.trialTimeoutPlan\)/, "owner effective settings must be restored after trial");
const snapshot = sidepanel.slice(sidepanel.indexOf("function snapshotOutputSettings"), sidepanel.indexOf("async function saveAuditLog"));
assert.match(snapshot, /effective_timeout_sec: settings\.timeout_sec/, "persisted provenance reads the temporarily capped prepared settings");
const preparedSettings = { timeout_sec: 1800, max_retries: 2 };
const runQueue = [{ settings: { timeout_sec: 2400 } }, { settings: { timeout_sec: 60 } }];
const cap = core.LIMITS.trial_timeout_cap_sec;
const timeoutPlan = core.capTrialTimeouts(preparedSettings, runQueue, cap);
assert.equal(timeoutPlan.prepared_settings.timeout_sec, cap, "persisted global effective timeout is capped");
assert.deepEqual(runQueue.map((item) => item.settings.timeout_sec), [cap, 60], "actual per-job budgets are capped without increasing shorter timeouts");
const prepared = { settings: timeoutPlan.prepared_settings };
core.restoreTrialTimeouts(prepared, timeoutPlan);
assert.equal(prepared.settings, preparedSettings, "owner prepared settings object is restored");
assert.deepEqual(runQueue.map((item) => item.settings.timeout_sec), [2400, 60], "owner per-job settings are restored");
assert.deepEqual(Array.from(core.POLICY.prohibited_methods), ["run.start", "run.pause", "run.resume"]);
assert.equal(Object.values(core.METHOD_REGISTRY).some((item) => /dev.*mode/i.test(item.name)), false, "no Bridge method may flip the panel toggle");

const html = fs.readFileSync(new URL("../sidepanel.html", import.meta.url), "utf8");
assert.match(html, /id="bridgeDevModeToggle"/);
assert.match(html, /Chế độ phát triển/);
assert.match(html, /id="bridgeDevModeBadge"/);

console.log("bridge run.trial smoke tests: PASS");
