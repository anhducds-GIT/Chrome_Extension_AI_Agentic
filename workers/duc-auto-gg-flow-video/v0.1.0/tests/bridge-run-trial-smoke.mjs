import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
await import(pathToFileURL(path.join(here, "..", "bridge-core.js")));
await import(pathToFileURL(path.join(here, "..", "runner-core.js")));
await import(pathToFileURL(path.join(here, "..", "dev-trial-core.js")));
const bridge = globalThis.DacBridgeCore;
const devTrial = globalThis.DacDevTrialCore;
const sidepanel = fs.readFileSync(path.join(here, "..", "sidepanel.js"), "utf8");
const html = fs.readFileSync(path.join(here, "..", "sidepanel.html"), "utf8");

// --- registry: run.trial exists as an executor method; prohibitions hold ---
const entry = bridge.METHOD_REGISTRY["run.trial"];
assert.ok(entry, "run.trial is registered");
assert.equal(entry.context, "executor");
assert.equal(entry.requires_executor, true);
assert.equal(entry.read_only, false);
assert.equal(entry.approval, "none");
assert.equal(entry.idempotent, false);
assert.equal(entry.deadline_ms, 30000);
assert.match(entry.capability_description, /at most 3 runnable video jobs/, "registry description cannot drift from the owner cap");
assert.equal(entry.params_schema.job_ids, "job_id[1..3]");
assert.deepEqual(bridge.POLICY.prohibited_methods, ["run.start", "run.pause", "run.resume"], "the prohibited list is EXACTLY unchanged");
for (const prohibited of ["run.start", "run.pause", "run.resume"]) {
  assert.equal(bridge.METHOD_REGISTRY[prohibited], undefined, `${prohibited} stays unregistered`);
  assert.throws(() => bridge.requireMethod(prohibited), (error) => error.code === "METHOD_NOT_FOUND");
}

// --- capabilities advertise run.trial without touching the policy surface ---
const capabilities = bridge.capabilities();
assert.deepEqual(capabilities.prohibited_methods, ["run.start", "run.pause", "run.resume"]);
assert.equal(capabilities.auto_execute, false);
const advertised = capabilities.methods.find((method) => method.name === "run.trial");
assert.ok(advertised, "system.capabilities lists run.trial");
assert.equal(advertised.context, "executor");
assert.equal(advertised.requires_executor, true);

// --- typed refusal codes are registered and fail-closed (retryable:false) ---
for (const code of ["DEV_MODE_OFF", "JOB_NOT_RUNNABLE", "TRIAL_RATE_LIMIT"]) {
  assert.equal(bridge.ERROR_DEFINITIONS[code].retryable, false, `${code} is a non-retryable typed refusal`);
}
assert.equal(bridge.ERROR_DEFINITIONS.RUN_ACTIVE.retryable, true, "RUN_ACTIVE keeps its registered v1 retry policy");

// --- param validation ---
const normalized = bridge.validateParams("run.trial", { job_ids: ["P09-01"] });
assert.deepEqual(normalized, { job_ids: ["P09-01"], timeout_sec: 90, delay_sec: 25 }, "defaults are timeout 90s and delay 25s");
assert.deepEqual(
  bridge.validateParams("run.trial", { job_ids: ["P09-01", "P09-02"], timeout_sec: 15, delay_sec: 20 }),
  { job_ids: ["P09-01", "P09-02"], timeout_sec: 15, delay_sec: 20 }
);
// Owner decision 2026-08-27: 3 videos x 15 credits is the whole free budget.
assert.equal(devTrial.MAX_TRIAL_JOBS, 3, "trial chain cap is 3 videos (owner decision 2026-08-27)");
assert.deepEqual(
  bridge.validateParams("run.trial", { job_ids: ["a", "b", "c"] }).job_ids,
  ["a", "b", "c"],
  "a 3-video continuous chain is the largest valid trial"
);
const invalidTrialParams = [
  { job_ids: [] },
  { job_ids: ["J1", "J2", "J3", "J4"] },
  { job_ids: ["P09-01"], timeout_sec: 120 },
  { job_ids: ["P09-01"], timeout_sec: 14 },
  { job_ids: ["P09-01"], delay_sec: 10 },
  { job_ids: ["P09-01"], delay_sec: 31 },
  { job_ids: ["P09-01", "p09-01"] },
  { job_ids: ["P09-01"], start_production_run: true },
  { job_ids: ["../escape"] }
];
for (const params of invalidTrialParams) {
  assert.throws(() => bridge.validateParams("run.trial", params), (error) => error.code === "INVALID_PARAMS", `run.trial rejects ${JSON.stringify(params)}`);
}

// --- executor refusal matrix through the real pure gate ---
const queue = [
  { job: { id: "P09-01" }, status: "PENDING", phase: "PRE_SUBMIT", protected_checkpoint: false, skipped: false },
  { job: { id: "P09-02" }, status: "PENDING", phase: "PRE_SUBMIT", protected_checkpoint: false, skipped: false },
  { job: { id: "P09-03" }, status: "SUCCESS", phase: "SUCCESS", protected_checkpoint: true, skipped: true },
  { job: { id: "P09-04" }, status: "FAILED", phase: "PRE_SUBMIT", protected_checkpoint: false, skipped: false }
];
const nowMs = Date.parse("2026-08-25T10:00:00.000Z");
const open = { dev_mode: true, running: false, paused: false, queue, job_ids: ["P09-01", "P09-02"], last_started_at_ms: null, now_ms: nowMs };

assert.equal(devTrial.trialRefusal(open), null, "a clean trial request is accepted");

const devOff = devTrial.trialRefusal({ ...open, dev_mode: false });
assert.equal(devOff.code, "DEV_MODE_OFF");
const devOffEvenWhenRateLimited = devTrial.trialRefusal({ ...open, dev_mode: false, last_started_at_ms: nowMs - 1000 });
assert.equal(devOffEvenWhenRateLimited.code, "DEV_MODE_OFF", "the owner toggle is checked before anything else");

assert.equal(devTrial.trialRefusal({ ...open, running: true }).code, "RUN_ACTIVE");
assert.equal(devTrial.trialRefusal({ ...open, paused: true }).code, "RUN_ACTIVE");

const unknownJob = devTrial.trialRefusal({ ...open, job_ids: ["P09-01", "P09-99"] });
assert.equal(unknownJob.code, "JOB_NOT_RUNNABLE");
assert.deepEqual(unknownJob.details.job_ids, ["P09-99"], "only the blocked ids are reported");
assert.equal(devTrial.trialRefusal({ ...open, job_ids: ["P09-03"] }).code, "JOB_NOT_RUNNABLE", "a protected SUCCESS job is never trial-runnable");
assert.equal(devTrial.trialRefusal({ ...open, job_ids: ["P09-04"] }).code, "JOB_NOT_RUNNABLE", "a FAILED job is not PENDING, so a trial refuses it");

// Rate cap: a trial may start only >=300s after the previous trial started.
const tooSoon = devTrial.trialRefusal({ ...open, last_started_at_ms: nowMs - 100000 });
assert.equal(tooSoon.code, "TRIAL_RATE_LIMIT");
assert.equal(tooSoon.details.min_interval_sec, 300);
assert.equal(tooSoon.details.retry_after_sec, 200);
assert.match(tooSoon.message, /200s/, "the refusal message states the remaining wait seconds");
assert.equal(devTrial.trialRefusal({ ...open, last_started_at_ms: nowMs - 299000 }).code, "TRIAL_RATE_LIMIT", "299s is still too soon");
assert.equal(devTrial.trialRefusal({ ...open, last_started_at_ms: nowMs - 300000 }), null, "exactly 300s satisfies the interval");
assert.equal(devTrial.trialRefusal({ ...open, last_started_at_ms: nowMs - 301000 }), null);

// Trial refusals surface as real typed bridge errors.
for (const values of [{ ...open, dev_mode: false }, { ...open, running: true }, { ...open, job_ids: ["nope"] }, { ...open, last_started_at_ms: nowMs - 1000 }]) {
  const refused = devTrial.trialRefusal(values);
  const error = new bridge.BridgeProtocolError(refused.code, refused.message, refused.details);
  assert.equal(error.code, refused.code);
  const response = bridge.failureResponse("run-trial-refusal-01", error);
  assert.equal(response.ok, false);
  assert.equal(response.error.code, refused.code);
  assert.doesNotThrow(() => bridge.parseResponse(response), "typed refusals round-trip the v1 response envelope");
}

// --- history record shape (chrome.storage.local key dac.dev_trial_history.v1) ---
assert.equal(devTrial.DEV_MODE_STORAGE_KEY, "dac.dev_mode.v1");
assert.equal(devTrial.TRIAL_HISTORY_STORAGE_KEY, "dac.dev_trial_history.v1");
const record = devTrial.historyRecord(nowMs);
assert.deepEqual(record, { schema_version: 1, last_started_at: nowMs });
assert.equal(devTrial.lastStartedAtMs(record), nowMs);
assert.equal(devTrial.lastStartedAtMs(undefined), null);
assert.equal(devTrial.lastStartedAtMs({ last_started_at: "corrupt" }), null);
assert.equal(devTrial.lastStartedAtMs([nowMs - 5000, nowMs]), nowMs, "a legacy timestamp array still yields its newest entry");
assert.throws(() => devTrial.historyRecord(Number.NaN), TypeError);

// --- side panel wiring: the trial reuses the human Run Selected path ---
const handler = sidepanel.slice(sidepanel.indexOf("async function bridgeRunTrial"), sidepanel.indexOf("function appendBridgeMeta"));
assert.match(handler, /DacDevTrialCore\.trialRefusal/, "the executor consults the pure fail-closed gate");
assert.match(handler, /BridgeProtocolError\(refusal\.code, refusal\.message, refusal\.details\)/, "refusals are thrown as typed bridge errors");
assert.match(handler, /chrome\.storage\.local\.set\(\{ \[window\.DacDevTrialCore\.TRIAL_HISTORY_STORAGE_KEY\]: window\.DacDevTrialCore\.historyRecord\(nowMs\) \}\)/, "the trial start is persisted before the run launches");
assert.match(handler, /state\.runSelection = new Set\(params\.job_ids\)/, "trial jobs enter the same runSelection the owner's button uses");
assert.match(handler, /run\("selected"\)/, "the trial goes through the existing selected-jobs runner, not a fork");
assert.doesNotMatch(handler, /DAC_RUN_IMAGE_JOB|gateNextJob|finishDetectedOutput/, "run.trial never reimplements the runner loop");
assert.match(handler, /state\.runtimeOverrides = \{ \.\.\.previousOverrides, timeout_sec: params\.timeout_sec, delay_min_sec: params\.delay_sec, delay_max_sec: params\.delay_sec \}/, "trial timeout/delay are run-scoped overrides");
assert.match(handler, /\.finally\(\(\) => \{ state\.runtimeOverrides = previousOverrides; state\.devTrialContext = null; \}\)/, "overrides are restored when the trial run ends");
assert.match(handler, /return \{ accepted: true, job_ids: \[\.\.\.params\.job_ids\], run_id: runId/, "the response returns accepted/job_ids/run_id immediately");
assert.match(sidepanel, /"run\.trial": withBridgeErrors\(bridgeRunTrial\)/, "run.trial is dispatched like every other executor method");
assert.match(sidepanel, /event: "BRIDGE_DEV_TRIAL_RUN_START"[\s\S]*?input_origin: "bridge_dev"[\s\S]*?trial_job_ids:[\s\S]*?trial_timeout_sec:[\s\S]*?trial_delay_sec:/, "the accepted trial audits its run start as bridge_dev with the trial params");

// --- panel UI: owner toggle, amber banner, RUN-screen badge ---
assert.match(sidepanel, /async function setDevMode/, "the toggle persists through a dedicated setter");
assert.match(sidepanel, /devModeToggle\?\.addEventListener\("change"/, "the BRIDGE-card toggle is wired");
assert.match(html, /id="devModeToggle" type="checkbox"(?![^>]*checked)/, "the toggle defaults to OFF");
assert.match(html, /Chế độ phát triển/, "the toggle uses the Vietnamese operator label");
assert.match(html, /id="devModeBanner"[^>]*hidden>DEV MODE — AI được phép chạy trial ≤3 video</, "the amber banner is explicit about the 3-video cap");
assert.match(sidepanel, /Chế độ phát triển BẬT — AI được phép chạy trial một chuỗi ≤3 job qua Bridge/, "the operator log uses the video cap of 3");
assert.doesNotMatch(sidepanel, /≤30 job/, "stale Gemini trial cap is absent from operator text");
assert.match(html, /id="runDevModeBadge"[^>]*hidden>DEV MODE</, "the RUN screen carries a small DEV MODE badge");
const bridgeScreenHtml = html.slice(html.indexOf('<section id="bridgeScreen"'), html.indexOf("<footer>"));
assert.match(bridgeScreenHtml, /id="devModeToggle"/, "the toggle lives on the BRIDGE screen card");
const runScreenHtml = html.slice(html.indexOf('<section id="runScreen"'), html.indexOf('<section id="outputScreen"'));
assert.match(runScreenHtml, /id="runDevModeBadge"/, "the badge lives on the RUN screen");
assert.ok(html.indexOf('src="dev-trial-core.js"') > -1 && html.indexOf('src="dev-trial-core.js"') < html.indexOf('src="sidepanel.js"'), "dev-trial-core loads before the side panel");
assert.doesNotMatch(fs.readFileSync(path.join(here, "..", "dev-trial-core.js"), "utf8"), /innerHTML|outerHTML|insertAdjacentHTML/);

console.log("bridge run.trial smoke tests: PASS");
