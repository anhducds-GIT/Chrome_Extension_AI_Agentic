import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
await import(pathToFileURL(path.join(here, "..", "approval-persistence-core.js")));
const persistence = globalThis.DacApprovalPersistence;

const order = [];
const result = await persistence.execute({
  snapshot: async () => { order.push("snapshot"); return { before: true }; },
  apply: async (snapshot) => { order.push("apply"); assert.equal(snapshot.before, true); return { candidate: true }; },
  persist_audit: async () => { order.push("audit"); return "audit.jsonl"; },
  persist_checkpoint: async (_applied, audit) => { order.push("checkpoint"); assert.equal(audit, "audit.jsonl"); return "result-v002.xlsx"; },
  commit: async (_applied, audit, checkpoint) => { order.push("commit"); return { audit, checkpoint }; },
  rollback: async () => { order.push("rollback"); }
});
assert.deepEqual(order, ["snapshot", "apply", "audit", "checkpoint", "commit"], "approval always persists audit before the immutable checkpoint and commits last");
assert.equal(result.ok, true);
assert.equal(result.checkpoint, "result-v002.xlsx");

const failureOrder = [];
await assert.rejects(() => persistence.execute({
  snapshot: async () => ({ workbook: "original" }),
  apply: async () => { failureOrder.push("apply"); return { workbook: "candidate" }; },
  persist_audit: async () => { failureOrder.push("audit"); return "audit.jsonl"; },
  persist_checkpoint: async () => { failureOrder.push("checkpoint"); throw new Error("disk full private detail"); },
  commit: async () => { failureOrder.push("commit"); },
  rollback: async (context) => {
    failureOrder.push("rollback");
    assert.equal(context.snapshot.workbook, "original");
    assert.equal(context.applied.workbook, "candidate");
    assert.equal(context.audit, "audit.jsonl");
    assert.equal(context.checkpoint, undefined);
  }
}), /disk full private detail/);
assert.deepEqual(failureOrder, ["apply", "audit", "checkpoint", "rollback"], "checkpoint failure rolls back and never commits");

const recovered = { workbook: "original", checkpoint: null, status: "APPROVING", recoveryEvents: [] };
await assert.rejects(() => persistence.execute({
  snapshot: async () => ({ workbook: recovered.workbook }),
  apply: async () => ({ workbook: "candidate", added_ids: ["Q001"] }),
  persist_audit: async () => "audit.jsonl",
  persist_checkpoint: async () => ({ workbook: "checkpoint-workbook", filename: "result-v002.xlsx", verified: true }),
  commit: async () => { throw new Error("post-checkpoint prepare failed"); },
  rollback: async ({ checkpoint, applied }) => {
    assert.equal(checkpoint.verified, true, "rollback knows immutable disk truth already exists");
    recovered.workbook = checkpoint.workbook;
    recovered.checkpoint = checkpoint.filename;
    recovered.status = "APPROVED_CHECKPOINTED";
    recovered.recoveryEvents.push({ event: "POST_CHECKPOINT_RECOVERED", job_ids: applied.added_ids });
  }
}), /post-checkpoint prepare failed/);
assert.deepEqual(recovered, {
  workbook: "checkpoint-workbook",
  checkpoint: "result-v002.xlsx",
  status: "APPROVED_CHECKPOINTED",
  recoveryEvents: [{ event: "POST_CHECKPOINT_RECOVERED", job_ids: ["Q001"] }]
}, "post-checkpoint commit failure recovers forward to disk truth and records terminal approval");

const lockState = { queueMutationRunning: false, runStarting: false, running: false };
const lock = persistence.createQueueRunLock(lockState);
let releaseApproval;
const approvalHeld = new Promise((resolve) => { releaseApproval = resolve; });
let approvalApplied = 0;
const approval = (async () => {
  assert.equal(lock.tryBeginMutation(), true, "approval acquires the mutation lock synchronously before its first await");
  try { await approvalHeld; approvalApplied += 1; } finally { lock.endMutation(); }
})();
await Promise.resolve();
let directMutationApplied = 0;
if (lock.tryBeginMutation()) { directMutationApplied += 1; lock.endMutation(); }
assert.equal(directMutationApplied, 0, "a direct mutation interleaved while approval awaits is refused");
releaseApproval();
await approval;
assert.equal(approvalApplied, 1);

assert.equal(lock.tryBeginRun(), true, "run-start latch is acquired before validation awaits");
if (lock.tryBeginMutation()) { directMutationApplied += 1; lock.endMutation(); }
assert.equal(directMutationApplied, 0, "a direct mutation interleaved during run validation is refused");
lock.endRunStart();
assert.equal(lock.tryBeginMutation(), true);
assert.equal(lock.tryBeginRun(), false, "run entry is refused while a mutation owns the lock");
lock.endMutation();

for (const missing of ["snapshot", "apply", "persist_audit", "persist_checkpoint", "commit", "rollback"]) {
  const steps = Object.fromEntries(["snapshot", "apply", "persist_audit", "persist_checkpoint", "commit", "rollback"].map((name) => [name, async () => {}]));
  delete steps[missing];
  await assert.rejects(() => persistence.execute(steps), new RegExp(missing));
}

console.log("bridge approval persistence smoke tests: PASS");
