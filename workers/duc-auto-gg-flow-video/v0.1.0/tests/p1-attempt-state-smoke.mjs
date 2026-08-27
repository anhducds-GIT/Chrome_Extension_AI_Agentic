import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const context = {};
vm.runInNewContext(fs.readFileSync(new URL("../runner-core.js", import.meta.url), "utf8"), context);
const runner = context.DacRunnerCore;
const sidePanelSource = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");

assert.match(sidePanelSource, /function nextAttemptId\(\)/, "side panel generates an opaque attempt token");
assert.doesNotMatch(sidePanelSource, /\$\{state\.runId\}:\$\{item\.job\.id\}/, "attempt IDs never embed arbitrary XLSX job IDs");

const retryablePreSubmit = { phase: "PRE_SUBMIT", retry_count: 0, settings: { max_retries: 2 } };
assert.equal(runner.canRetry(retryablePreSubmit, "TIMEOUT_PRE_SUBMIT"), true, "a confirmed pre-submit timeout may retry");

const submitted = { phase: "SUBMITTED", retry_count: 0, settings: { max_retries: 2 } };
assert.equal(runner.canRetry(submitted, "TIMEOUT_AFTER_SUBMIT"), false, "video post-submit timeout never spends credits on an automatic retry");
assert.equal(runner.needsReconciliation("SUBMITTED"), true, "post-submit timeout must reconcile");
assert.equal(runner.interruptedStatus("SUBMITTED", "POST_SUBMIT_UNCERTAIN"), "INTERRUPTED", "uncertain video output is parked for owner decision");
assert.equal(runner.interruptedStatus("SUBMITTED", "RECEIVER_LOST"), "INTERRUPTED", "a genuine hard stop mid-job is still INTERRUPTED and still blocks Resume until resolved");

const outputSaved = { phase: "OUTPUT_SAVED", retry_count: 0, settings: { max_retries: 2 } };
assert.equal(runner.classifyFailure("Timed out waiting for ChatGPT readiness", outputSaved.phase), "READINESS_TIMEOUT_AFTER_SAVE");
assert.equal(runner.canRetry(outputSaved, "READINESS_TIMEOUT_AFTER_SAVE"), true, "a saved output can still be retried -- see resolveJobFailure's note about a successful retry replacing the tracked result_file");
assert.equal(runner.selectQueue([{ job: { id: "saved" }, status: "INTERRUPTED", phase: "OUTPUT_SAVED" }], "selected", "saved").length, 0, "manual Retry Selected cannot bypass the saved-output checkpoint");

let p03ASends = 0;
p03ASends += 1;
assert.equal(runner.canRetry({ phase: "SUBMITTED", retry_count: 0, settings: { max_retries: 2 } }, "TIMEOUT_AFTER_SUBMIT"), false);
assert.equal(p03ASends, 1, "P03-A style post-submit timeout starts from exactly one prompt submission before any retry");

let p03BSends = 0;
p03BSends += 1;
assert.equal(runner.needsReconciliation("SUBMITTED"), true);
assert.equal(runner.canRetry({ phase: "SUBMITTED", retry_count: 0, settings: { max_retries: 2 } }, "POST_SUBMIT_UNCERTAIN"), false);
assert.equal(p03BSends, 1, "P03-B style ambiguity starts from exactly one prompt submission before any retry");

const queue = ["SUCCESS", "RUNNING", "PENDING", "INTERRUPTED"].map((status) => ({ status, skipped: false, settings: { max_retries: 2 }, references: [], job: { id: status } }));
const summary = runner.planSummary(queue, { max_retries: 2 });
assert.deepEqual({ success: summary.success_jobs, running: summary.running_jobs, pending: summary.pending_jobs, interrupted: summary.interrupted_jobs }, { success: 1, running: 1, pending: 1, interrupted: 1 }, "queue progress derives from actual states");
assert.equal(runner.canStartNextJob({ generating: true, outputVerified: true, composerFound: true, sendUsable: true }, queue), false, "next job cannot start while ChatGPT is generating");

const orderedEvents = [
  { job_id: "P03-A", attempt: 1, phase: "PRE_SUBMIT" },
  { job_id: "P03-A", attempt: 1, phase: "SUBMITTED" },
  { job_id: "P03-A", attempt: 1, phase: "OUTPUT_DETECTED" },
  { job_id: "P03-A", attempt: 1, phase: "OUTPUT_SAVED" },
  { job_id: "P03-A", attempt: 1, phase: "CHAT_READY" },
  { job_id: "P03-A", attempt: 1, phase: "SUCCESS" }
];
assert.equal(runner.auditOrderValid(orderedEvents), true, "audit event phase ordering is monotonic");
assert.equal(runner.auditOrderValid([...orderedEvents, { job_id: "P03-A", attempt: 1, phase: "SUBMITTED" }]), false, "audit ordering rejects phase regression");

console.log("P1 attempt-state smoke tests: PASS");
