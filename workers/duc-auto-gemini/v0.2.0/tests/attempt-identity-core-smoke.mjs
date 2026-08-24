import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const context = {};
vm.runInNewContext(fs.readFileSync(new URL("../attempt-identity-core.js", import.meta.url), "utf8"), context);
const attempts = context.DacAttemptIdentity;

const jobA = attempts.create({ job_id: "P03-A", attempt_id: "run-1:P03-A:1" });
jobA.phase = "SUBMITTED";
jobA.submittedAt = "2026-08-19T15:00:00.000Z";

const jobB = attempts.create({ job_id: "P03-B", attempt_id: "run-1:P03-B:1" });
assert.equal(JSON.stringify(attempts.snapshot(jobB)), JSON.stringify({ job_id: "P03-B", attempt_id: "run-1:P03-B:1", phase: "PRE_SUBMIT", submittedAt: null, beforeCount: null, expectImage: true }), "Job B pre-submit failure returns its own empty attempt context, never Job A");
assert.equal(attempts.same(jobA, jobB), false, "Job B cannot reconcile Job A");

const activeBeforeBusyReject = attempts.snapshot(jobA);
const rejectedBusyB = attempts.create({ job_id: "P03-B", attempt_id: "run-1:P03-B:2" });
assert.equal(attempts.submitted(jobA), true, "busy rejection does not replace the active submitted attempt");
assert.equal(JSON.stringify(attempts.snapshot(jobA)), JSON.stringify(activeBeforeBusyReject), "active Job A remains untouched");
assert.equal(attempts.snapshot(rejectedBusyB).phase, "PRE_SUBMIT");

const staleReconcile = attempts.create({ job_id: "P03-A", attempt_id: "run-1:P03-A:stale" });
assert.equal(attempts.same(jobA, staleReconcile), false, "stale reconcile attempt ID is rejected");
const correctReconcile = attempts.create({ job_id: "P03-A", attempt_id: "run-1:P03-A:1" });
assert.equal(attempts.same(jobA, correctReconcile) && attempts.submitted(jobA), true, "correct submitted attempt ID may reconcile");
assert.equal(attempts.validContext(correctReconcile), true);
assert.equal(attempts.validContext(attempts.create({ job_id: "P03-A", attempt_id: "" })), false);

const unicodeJob = attempts.create({ job_id: "Ảnh mẫu 01 / Job C", attempt_id: "attempt-m45f-1-opaque" });
assert.equal(attempts.validContext(unicodeJob), true, "existing XLSX job IDs may include spaces and Unicode while attempt IDs stay opaque tokens");
assert.equal(attempts.same(unicodeJob, attempts.create({ job_id: "Ảnh mẫu 01 / Job C", attempt_id: "attempt-m45f-1-opaque" })), true);
assert.equal(attempts.validContext(attempts.create({ job_id: "Ảnh mẫu 01 / Job C", attempt_id: "raw job id is not a safe attempt token" })), false, "only generated attempt IDs use the token grammar");

console.log("attempt identity core smoke tests: PASS");
