import { assert, load, pass } from "./test-helpers.mjs";
const Runtime = await load(new URL("../runtime-core.js", import.meta.url), "DagRuntimeCore");
const Runner = await load(new URL("../run-core.js", import.meta.url), "DagRunCore");

// Reproduces the Pilot-01 DAG-1 failure: every response was rejected as ATTEMPT_ID_MISMATCH
// because Runner.prepare() queue items carry no run_id, so identity(expected).run_id was always "".
const RUN_ID = "20260824070319-abc123";
const plan = Runner.prepare({ config: {}, jobs: [{ id: "DAG-1", prompt: "Create a simple layout inspired by the selected reference." }] }, []);
const item = { ...plan.queue[0] };
item.attempt_id = Runner.nextAttemptId(RUN_ID, "DAG-1", 7);

assert.ok(!Object.prototype.hasOwnProperty.call(plan.queue[0], "run_id"), "Runner.prepare() items intentionally carry no run_id");
assert.equal(Runtime.identity(item).run_id, "", "a bare queue item can never satisfy the run_id half of matchesAttempt");

// The side panel must compare against a complete identity sourced from the live state.runId.
const expectedIdentity = (value) => ({ run_id: RUN_ID, job_id: value?.job?.id || value?.job_id || "", attempt_id: value?.attempt_id || "" });
const contentAttempt = { run_id: RUN_ID, job_id: "DAG-1", attempt_id: item.attempt_id, phase: "OUTPUT_DETECTED" };

assert.equal(Runtime.matchesAttempt(contentAttempt, item), false, "the regression: a bare item rejects its own attempt");
assert.equal(Runtime.matchesAttempt(contentAttempt, expectedIdentity(item)), true, "the fix: a run_id-complete expected identity accepts its own attempt");

const success = Runtime.responseOutcome({ ok: true, attempt: contentAttempt, output: { url: "https://example.invalid/gen.png", source_id: "abc" } }, expectedIdentity(item));
assert.equal(success.ok, true, "a real generation is no longer discarded as ATTEMPT_ID_MISMATCH");
assert.equal(success.phase, "OUTPUT_DETECTED");
assert.equal(success.output.url, "https://example.invalid/gen.png");

// A genuine pre-submit failure must surface its own failure_type, not be masked by the identity check.
const attachFailure = Runtime.responseOutcome({ ok: false, error: "ATTACHMENT_NOT_READY", attempt: { ...contentAttempt, phase: "FAILED_PRE_SUBMIT", failure_type: "ATTACHMENT_NOT_READY" } }, expectedIdentity(item));
assert.equal(attachFailure.failure_type, "ATTACHMENT_NOT_READY", "the identity check must not mask the real pre-submit failure");
assert.equal(attachFailure.phase, "FAILED_PRE_SUBMIT", "a pre-submit failure stays retryable instead of hard-stopping the batch as OWNER_REVIEW");

// The fix must not weaken cross-run, cross-job or cross-attempt isolation.
assert.equal(Runtime.matchesAttempt({ ...contentAttempt, run_id: "other-run" }, expectedIdentity(item)), false, "a response from another run is still rejected");
assert.equal(Runtime.matchesAttempt({ ...contentAttempt, job_id: "DAG-M" }, expectedIdentity(item)), false, "a response for another job is still rejected");
assert.equal(Runtime.matchesAttempt({ ...contentAttempt, attempt_id: `${RUN_ID}:DAG-1:a006` }, expectedIdentity(item)), false, "a stale earlier attempt is still rejected");
assert.equal(Runtime.responseOutcome({ ok: true, attempt: { ...contentAttempt, run_id: "other-run" } }, expectedIdentity(item)).failure_type, "ATTEMPT_ID_MISMATCH");

// A restored checkpoint item exposes job_id instead of job.id; both shapes must resolve identically.
const restored = Runner.restore(plan.queue, { schema: "dag.checkpoint.v1", queue: [{ job_id: "DAG-1", phase: "FAILED_PRE_SUBMIT", retry_count: 1, attempt_id: item.attempt_id }] })[0];
assert.equal(Runtime.matchesAttempt(contentAttempt, expectedIdentity(restored)), true, "a checkpoint-restored item resolves the same identity");

pass("attempt identity: run_id-complete expected identity accepts real responses and still rejects foreign ones");
