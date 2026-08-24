import { assert, load, pass } from "./test-helpers.mjs";
const Batch = await load(new URL("../batch-core.js", import.meta.url), "DagBatchCore");
const hardCases = [
  { phase: "OWNER_REVIEW", failure_type: "OUTPUT_AMBIGUOUS" },
  { phase: "FAILED_PRE_SUBMIT", failure_type: "SECURITY_BLOCKER" },
  { phase: "FAILED_PRE_SUBMIT", failure_type: "QUOTA_LIMIT" },
  { phase: "FAILED_PRE_SUBMIT", failure_type: "POLICY_BLOCK" },
  { phase: "INTERRUPTED", failure_type: "ABORTED_BY_OPERATOR" },
  { phase: "FAILED_PRE_SUBMIT", failure_type: "ATTEMPT_ID_MISMATCH" },
  { phase: "FAILED_PRE_SUBMIT", failure_type: "BOUND_TAB_LEFT_IMAGES_SURFACE" },
  { phase: "FAILED_PRE_SUBMIT", failure_type: "GLOBAL_ACTIVE_ATTEMPT_EXISTS" }
];
for (const outcome of hardCases) {
  const jobs = [{ id: "A", phase: "PENDING", failure_type: "" }, { id: "B", phase: "PENDING", failure_type: "" }]; let calls = 0; const stops = [];
  const result = await Batch.run(jobs, async (item) => { calls += 1; if (item.id === "A") Object.assign(item, outcome); else item.phase = "SUCCESS"; }, { continueOnError: true, onHardStop: (decision) => stops.push(decision.reason) });
  assert.equal(calls, 1, `${outcome.failure_type} must not invoke job B`); assert.equal(jobs[1].phase, "PENDING"); assert.equal(result.hard_stop, true); assert.equal(stops.length, 1);
}
const ordinary = [{ id: "A", phase: "PENDING" }, { id: "B", phase: "PENDING" }]; let ordinaryCalls = 0;
const ordinaryResult = await Batch.run(ordinary, async (item) => { ordinaryCalls += 1; if (item.id === "A") Object.assign(item, { phase: "FAILED_PRE_SUBMIT", failure_type: "COMPOSER_NOT_READY" }); else item.phase = "SUCCESS"; }, { continueOnError: true });
assert.equal(ordinaryCalls, 2, "ordinary exhausted pre-submit failure may continue when configured"); assert.equal(ordinaryResult.reason, "QUEUE_COMPLETE");
const strict = [{ id: "A", phase: "PENDING" }, { id: "B", phase: "PENDING" }]; let strictCalls = 0;
await Batch.run(strict, async (item) => { strictCalls += 1; item.phase = "FAILED_PRE_SUBMIT"; item.failure_type = "COMPOSER_NOT_READY"; }, { continueOnError: false });
assert.equal(strictCalls, 1);
pass("batch runtime: ambiguity, blockers, interruption and identity failures hard-stop before job B");
