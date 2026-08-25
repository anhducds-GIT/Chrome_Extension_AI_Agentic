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
assert.throws(() => core.validateParams("run.trial", { job_ids: ["J-1", "J-2", "J-3"] }), /expected 1-2/);
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
assert.ok(handler.indexOf("queueRunLock.tryBeginRun()") < handler.indexOf("await chrome.storage.local.get"), "reservation latch must be acquired before the first await");
assert.match(handler, /selectQueue\(state\.prepared\.queue, "selected", state\.runSelection\)/);
assert.match(handler, /eligibleIds\.length !== params\.job_ids\.length/);
assert.match(handler, /BRIDGE_TRIAL_MIN_INTERVAL_MS/);
assert.match(handler, /capTrialTimeouts\(state\.prepared\.settings, runQueue, 90\)/);
assert.match(handler, /state\.prepared\.settings = trialTimeoutPlan\.prepared_settings/, "persisted effective settings must use the same 90-second cap");
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
const preparedSettings = { timeout_sec: 180, max_retries: 2 };
const runQueue = [{ settings: { timeout_sec: 240 } }, { settings: { timeout_sec: 60 } }];
const timeoutPlan = core.capTrialTimeouts(preparedSettings, runQueue, 90);
assert.equal(timeoutPlan.prepared_settings.timeout_sec, 90, "persisted global effective timeout is capped");
assert.deepEqual(runQueue.map((item) => item.settings.timeout_sec), [90, 60], "actual per-job budgets are capped without increasing shorter timeouts");
const prepared = { settings: timeoutPlan.prepared_settings };
core.restoreTrialTimeouts(prepared, timeoutPlan);
assert.equal(prepared.settings, preparedSettings, "owner prepared settings object is restored");
assert.deepEqual(runQueue.map((item) => item.settings.timeout_sec), [240, 60], "owner per-job settings are restored");
assert.deepEqual(Array.from(core.POLICY.prohibited_methods), ["run.start", "run.pause", "run.resume"]);
assert.equal(Object.values(core.METHOD_REGISTRY).some((item) => /dev.*mode/i.test(item.name)), false, "no Bridge method may flip the panel toggle");

const html = fs.readFileSync(new URL("../sidepanel.html", import.meta.url), "utf8");
assert.match(html, /id="bridgeDevModeToggle"/);
assert.match(html, /Chế độ phát triển/);
assert.match(html, /id="bridgeDevModeBadge"/);

console.log("bridge run.trial smoke tests: PASS");
