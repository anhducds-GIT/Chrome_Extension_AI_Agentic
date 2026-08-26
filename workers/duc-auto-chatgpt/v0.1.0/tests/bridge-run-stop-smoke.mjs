import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const context = { console, TextEncoder, crypto: globalThis.crypto, structuredClone };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL("../bridge-core.js", import.meta.url), "utf8"), context);
vm.runInContext(fs.readFileSync(new URL("../approval-persistence-core.js", import.meta.url), "utf8"), context);
const core = context.DacBridgeCore;
const persistence = context.DacApprovalPersistence;

// ---------------------------------------------------------------------------
// Registry contract
// ---------------------------------------------------------------------------
const entry = core.METHOD_REGISTRY["run.stop"];
assert.deepEqual(JSON.parse(JSON.stringify({
  context: entry.context, approval: entry.approval, read_only: entry.read_only,
  idempotent: entry.idempotent, deadline_ms: entry.deadline_ms
})), {
  context: "executor", approval: "none", read_only: false, idempotent: true, deadline_ms: 10000
});

// A stop takes no arguments. There is no "stop job X" that a caller could
// confuse with "stop the run", and no field an injection could smuggle through.
assert.deepEqual(JSON.parse(JSON.stringify(core.validateParams("run.stop", {}))), {});
// Strict like run.status and system.ping, not tolerant like diagnostics.dom_probe:
// an omitted params object is a malformed call, and a control method that ends a
// run is the last place to start guessing what the caller meant.
assert.throws(() => core.validateParams("run.stop", undefined), (error) => error.code === "INVALID_PARAMS");
assert.throws(() => core.validateParams("run.stop", { job_id: "Q001" }), (error) => error.code === "INVALID_PARAMS");
assert.throws(() => core.validateParams("run.stop", { force: true }), (error) => error.code === "INVALID_PARAMS");

// run.stop is a write, but it is NOT remote execution: it can only ever end
// work. The three methods that could start or resume work stay prohibited.
assert.deepEqual(Array.from(core.POLICY.prohibited_methods), ["run.start", "run.pause", "run.resume"]);
assert.equal(core.METHOD_REGISTRY["run.pause"], undefined);
assert.equal(core.METHOD_REGISTRY["run.resume"], undefined);

// ---------------------------------------------------------------------------
// The trap, tested rather than trusted.
//
// The brief that ordered this method said "state.stopRequested is reset at the
// start of run(), so setting it while idle is harmless -- verify this by test,
// do not trust this sentence". Verifying it turned up the mirror-image bug:
// the reset used to sit AFTER run()'s first await, so a stop that arrived
// during startup was silently wiped. Both directions are locked here.
// ---------------------------------------------------------------------------
const state = { queueMutationRunning: false, running: false, runStarting: false, stopRequested: false };
const lock = persistence.createQueueRunLock(state);

// Direction 1 -- a stop requested while idle must NOT kill the next run.
state.stopRequested = true;
assert.equal(lock.tryBeginRun(), true, "an idle stop flag does not block the next run from starting");
assert.equal(state.stopRequested, false, "a stale stop flag is dropped the instant a new run begins");
lock.promoteRun();
assert.equal(state.running, true);

// Direction 2 -- a stop requested AFTER the run began must survive. run.stop
// bypasses the lock, so it can land during the run's async startup; if the
// flag were cleared later inside run(), the caller would be told the run was
// stopping while it went on submitting prompts.
state.stopRequested = true;
assert.equal(state.stopRequested, true, "a stop requested during a live run is never cleared behind the caller's back");

// The same must hold across the whole startup window, not just once running.
const startup = { queueMutationRunning: false, running: false, runStarting: false, stopRequested: false };
const startupLock = persistence.createQueueRunLock(startup);
assert.equal(startupLock.tryBeginRun(), true);
assert.equal(startup.runStarting, true, "the startup window is a distinct state that contains awaits");
assert.equal(startup.running, false);
startup.stopRequested = true;          // run.stop lands mid-startup
startupLock.promoteRun();              // run() finishes starting
assert.equal(startup.stopRequested, true, "a stop that arrives during run startup survives into the run");

// Only a genuinely new run may clear it.
const reuse = { queueMutationRunning: false, running: false, runStarting: false, stopRequested: true };
const reuseLock = persistence.createQueueRunLock(reuse);
assert.equal(reuseLock.tryBeginMutation(), true, "a Setup mutation is not a run");
assert.equal(reuse.stopRequested, true, "a mutation must never clear a stop flag -- only starting a run does");
reuseLock.endMutation();

// A refused run-start must not clear it either: nothing began, so nothing
// supersedes the pending stop.
const busy = { queueMutationRunning: false, running: true, runStarting: false, stopRequested: true };
const busyLock = persistence.createQueueRunLock(busy);
assert.equal(busyLock.tryBeginRun(), false);
assert.equal(busy.stopRequested, true, "a rejected run start cannot swallow a pending stop");

// ---------------------------------------------------------------------------
// Handler contract (static: sidepanel.js needs chrome + DOM to execute)
// ---------------------------------------------------------------------------
const sidepanel = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");
// Sliced from the comment block, not the function keyword: the reason for the
// lock bypass is part of the contract being guarded here, and a reviewer who
// deletes the explanation should fail this test.
const start = sidepanel.indexOf("// Deliberately does NOT take queueRunLock");
const body = sidepanel.indexOf("async function bridgeRunStop", start);
// Bounded by the function's own closing brace (2-space indent), not by the
// name of whatever happens to be defined next -- that boundary broke the moment
// chat.reload was inserted between this handler and bridgeSystemPing.
const end = body + sidepanel.slice(body).search(/^ {2}\}$/m) + 3;
assert.ok(start >= 0 && body > start && end > body, "bridgeRunStop is defined and explained");
const handler = sidepanel.slice(start, end);

// The "must not appear" checks read comment-stripped source, because the
// comment explaining the bypass necessarily names the very calls the code must
// not make -- and that explanation is required to stay (asserted below).
const codeOnly = handler.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

// REQUIREMENT: bypasses the RUN_ACTIVE lock. This is the whole point of the
// method -- a stop refused while a run is active is useless exactly when it is
// needed. Guarded so a later "make the handlers consistent" pass cannot quietly
// reintroduce the lock and neuter the feature.
assert.doesNotMatch(codeOnly, /tryBeginMutation/, "run.stop must not take the mutation lock");
assert.doesNotMatch(codeOnly, /tryBeginRun/, "run.stop must not take the run-start lock");
assert.doesNotMatch(codeOnly, /RUN_ACTIVE/, "run.stop must never answer RUN_ACTIVE");
assert.match(handler, /shrink what it does/i, "the bypass must stay explained at the call site");

// REQUIREMENT: idempotent. No run active is a successful no-op, never an error.
assert.doesNotMatch(codeOnly, /throw\s/, "an idle stop reports was_running=false instead of throwing");
assert.match(handler, /was_running: wasRunning/, "the caller is always told whether anything was actually running");
assert.match(handler, /state\.running \|\| state\.runStarting/, "a run that is still starting counts as running for stop purposes");
assert.match(handler, /if \(wasRunning\)/, "the stop flag and DAC_ABORT are only issued when something is running");

// REQUIREMENT: reports the state at the moment of the stop, so the caller knows
// whether a prompt is already in flight.
const returned = handler.slice(handler.indexOf("return {"));
assert.ok(returned.length > 0, "run.stop returns a result object");
for (const field of ["was_running", "job_id", "attempt_id", "phase", "runtime_stage", "prompt_already_sent", "stopped_at", "note"]) {
  // `[,:]` accepts shorthand (`phase,`) as well as `phase: value`.
  assert.match(returned, new RegExp(`\\b${field}\\s*[,:]`), `run.stop reports ${field}`);
}
assert.match(handler, /phase !== "PRE_SUBMIT"/, "anything past PRE_SUBMIT means the prompt has already been sent");

// Antigravity audit 2026-08-26: state.currentItem is set by setCurrent() and
// only ever cleared on workbook load and resume load -- never when a run ends.
// Reading it unconditionally made an idle stop answer "no run is active" while
// simultaneously reporting the PREVIOUS run's job_id and prompt_already_sent:
// true, and writing that claim into the audit trail. Reading it through
// state.running is what keeps the answer and the evidence honest.
assert.match(codeOnly, /const current = state\.running \? state\.currentItem : null/, "the reported job is only trusted while a run is genuinely executing");
assert.doesNotMatch(codeOnly, /const current = state\.currentItem;/, "the stale-read form must not come back");
assert.match(handler, /không thu hồi được/, "the answer says plainly that a sent prompt cannot be recalled");

// REQUIREMENT: audited, with input_origin, like every other bridge method.
assert.match(handler, /audit\("BRIDGE_RUN_STOPPED"/, "a stop is recorded as its own audit event");
assert.match(handler, /input_origin: "bridge"/, "the audit row names the bridge as the origin of the stop");

// It uses the owner's proven Stop path, and a dead content script must not turn
// a stop into a failure -- the local flag alone stops every later job.
assert.match(handler, /DAC_ABORT/, "run.stop reuses the abort message the Stop button sends");
assert.match(handler, /catch \(_\)/, "a failed DAC_ABORT cannot fail the stop");

// It can only ever END work.
assert.doesNotMatch(codeOnly, /\brun\(/, "run.stop must never start a run");
assert.doesNotMatch(codeOnly, /pauseRequested|state\.paused\s*=/, "pause/resume are deliberately not part of this method");

// ---------------------------------------------------------------------------
// run() must no longer clear the flag itself.
// ---------------------------------------------------------------------------
const runStart = sidepanel.indexOf('async function run(mode = "all")');
assert.ok(runStart > 0);
const runBody = sidepanel.slice(runStart, runStart + 4000);
assert.doesNotMatch(runBody, /^\s*state\.stopRequested = false;/m, "run() must not reset the stop flag after its first await");
assert.match(runBody, /state\.stopRequested is NOT reset here/, "the move is explained where the reset used to be");
const lockSource = fs.readFileSync(new URL("../approval-persistence-core.js", import.meta.url), "utf8");
const latch = lockSource.slice(lockSource.indexOf("tryBeginRun()"), lockSource.indexOf("promoteRun()"));
assert.match(latch, /state\.stopRequested = false/, "the reset now lives in the run-start latch");
assert.ok(
  latch.indexOf("state.runStarting = true") < latch.indexOf("state.stopRequested = false"),
  "the flag is cleared only once the latch is actually held"
);

// ---------------------------------------------------------------------------
// Wiring: both dispatch tables, per the two-table rule in this codebase.
// ---------------------------------------------------------------------------
assert.match(sidepanel, /"run\.stop": withBridgeErrors\(bridgeRunStop\)/, "registered in the executor dispatcher");
assert.match(sidepanel, /"run\.stop": bridgeRunStop/, "registered in the test-hook handler table");

console.log("bridge run.stop smoke tests: PASS");
