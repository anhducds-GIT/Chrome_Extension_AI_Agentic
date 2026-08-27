/* Issue B (NEXT-SESSION-BRIEF): Đức wants to regenerate an image he is
   unhappy with and let a new attempt replace it. runner-core.prepare()
   already honours rerun_done, but resume-core.applyToQueue() unconditionally
   protects every SAFE_COMPLETE job -- "completed verified outputs stay
   skipped forever" by design -- so there was no path to deliberately rerun a
   completed job. This reuses the existing Recreate approval/checkpoint
   mechanism (recreate_* ledger fields, persistRecreateApproval) for a
   verified-completed job instead of inventing a parallel one, per the
   recommended shape: per-job explicit approval, a confirmation naming the
   job, the previous file preserved by default, and the supersession
   recorded rather than silently overwritten. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const context = vm.createContext({ console });
for (const file of ["runner-core.js", "resume-core.js", "recreate-core.js"]) vm.runInContext(fs.readFileSync(new URL(file, root), "utf8"), context);
const runner = context.DacRunnerCore;
const resume = context.DacResumeCore;
const recreate = context.DacRecreateCore;

const completed = {
  id: "P06-D", prompt: "d", status: "SUCCESS", attempt_phase: "SUCCESS",
  attempt_id: "attempt-d1", submitted_at: "2026-08-22T03:00:00.000Z",
  persistence_verified: "true", requested_file: "P06-D.png", result_file: "P06-D.png",
  write_outcome: "written", output_saved_at: "2026-08-22T03:00:05.000Z"
};
const other = [{ id: "P06-E", prompt: "e", status: "PENDING" }];

// A non-ambiguous, non-completed job still cannot use recreate/rerun.
assert.equal(recreate.approval({ job: completed, recoveryState: "SAFE_PENDING" }).ok, false, "an ordinary pending job cannot be recreated or rerun");

// A verified completed job CAN be approved for a deliberate rerun.
const approval = recreate.approval({ job: completed, recoveryState: "SAFE_COMPLETE", now: "2026-08-22T05:00:00.000Z" });
assert.equal(approval.ok, true, "a completed job with a verified saved output can be approved for deliberate rerun");
assert.equal(approval.fields.attempt_id, "", "the rerun starts a fresh attempt id");
assert.equal(approval.fields.result_file, "", "the live result_file column is cleared for the new attempt");

// The superseded file's identity must survive in provenance -- otherwise the
// ledger and audit would claim a history the folder no longer matches.
assert.equal(approval.fields.recreate_origin_result_file, "P06-D.png", "the previous verified output is preserved in provenance, not silently dropped");
assert.equal(approval.fields.recreate_origin_persistence_verified, "true", "the previous verification state is preserved");
assert.equal(approval.fields.recreate_origin_write_outcome, "written", "the previous write outcome is preserved");
assert.equal(approval.fields.recreate_origin_output_saved_at, "2026-08-22T03:00:05.000Z", "when the previous file was saved is preserved");
assert.match(approval.fields.recreate_history_json, /P06-D\.png/, "the superseded file's identity also lives in the forensic history, not only the origin fields");

// Once approved, the job is no longer SAFE_COMPLETE -- the same mechanism
// that protects a normal completed job now protects THIS one from being
// silently resubmitted a second time, and only the explicit approval unlocks it.
const approvedJob = { ...completed, ...approval.fields };
const plan = resume.plan({ fileName: "pilot__results__v001.xlsx", config: { run_id: "pilot" }, jobs: [approvedJob, ...other] });
assert.equal(plan.jobs.find((item) => item.job_id === "P06-D").state, "AMBIGUOUS_SUBMITTED", "an approved-but-not-yet-verified rerun is not silently treated as still complete");
const prepared = runner.prepare({ config: {}, jobs: [approvedJob, ...other] }, []);
resume.applyToQueue(prepared.queue, plan.jobs);
const item = prepared.queue.find((entry) => entry.job.id === "P06-D");
assert.equal(item.operator_recreate, true, "the rerun is a distinct deliberate queue item, same as an ambiguous recreate");
assert.deepEqual(runner.selectQueue(prepared.queue, "recreate").map((entry) => entry.job.id), ["P06-D"], "only the approved job enters the deliberate run");
assert.equal(runner.selectQueue(prepared.queue, "all").some((entry) => entry.job.id === "P06-D"), true, "approval is explicit; selectQueue('all') does not hide it either");

// A job never approved stays fully protected -- no accidental unlock of
// every SAFE_COMPLETE job just because one of them was approved.
const untouchedPlan = resume.plan({ fileName: "pilot__results__v001.xlsx", config: { run_id: "pilot" }, jobs: [completed, ...other] });
const untouchedPrepared = runner.prepare({ config: {}, jobs: [completed, ...other] }, []);
resume.applyToQueue(untouchedPrepared.queue, untouchedPlan.jobs);
assert.equal(untouchedPrepared.queue[0].skipped, true, "an unapproved completed job remains protected");
assert.equal(runner.selectQueue(untouchedPrepared.queue, "recreate").length, 0, "no job silently qualifies for the deliberate run without its own approval");

// --- side panel wiring -----------------------------------------------------
const sidepanel = fs.readFileSync(new URL("sidepanel.js", root), "utf8");
const html = fs.readFileSync(new URL("sidepanel.html", root), "utf8");

assert.match(sidepanel, /function openRerunDialog\(jobId\)/, "a rerun action exists");
const openSegment = sidepanel.slice(sidepanel.indexOf("function openRerunDialog"), sidepanel.indexOf("function closeRerunDialog"));
assert.match(openSegment, /item\.status !== "SUCCESS" \|\| !item\.persistence_verified/, "rerun is only offered for a job with a verified saved output");
assert.doesNotMatch(openSegment, /run\(|DAC_RUN_IMAGE_JOB|send\(/, "opening the confirmation never silently resubmits");

const confirmSegment = sidepanel.slice(sidepanel.indexOf("async function confirmRerun"), sidepanel.indexOf("function restoreReconciliationItem"));
assert.match(confirmSegment, /recoveryState: "SAFE_COMPLETE"/, "confirmRerun reuses the recreate approval mechanism rather than a parallel one");
assert.match(confirmSegment, /await run\("recreate"\)/, "confirmed rerun starts exactly one deliberate attempt");
assert.doesNotMatch(confirmSegment, /await run\("all"\)/, "unlike confirmRecreate, a completed-job rerun never auto-continues into unrelated jobs");
assert.match(confirmSegment, /rerun_collision_policy: overwrite \? "overwrite" : "uniquify"/, "the operator's collision choice is recorded per-job, defaulting to preserving the old file");

// The default radio must be "keep the old file" -- destroying the only copy
// of a verified artifact is a decision, never a default.
assert.match(html, /id="rerunKeepPolicyRadio" value="uniquify" checked/, "keeping the previous image is the pre-selected default");
assert.match(html, /id="rerunOverwritePolicyRadio" value="overwrite"/, "overwriting the previous image is an explicit, non-default choice");

const saveSegment = sidepanel.slice(sidepanel.indexOf("async function saveGeneratedImage"), sidepanel.indexOf("function update(item, values)"));
assert.match(saveSegment, /item\.job\.rerun_collision_policy \? window\.DacOutputLocation\.collisionPolicy\(item\.job\.rerun_collision_policy\) : values\.collisionPolicy/, "a per-job rerun collision choice overrides the run's global default only for that job's write");

const successSegment = sidepanel.slice(sidepanel.indexOf("async function finishDetectedOutput"), sidepanel.indexOf("async function reconcileSubmittedAttempt"));
assert.match(successSegment, /recreate_origin_result_file/, "the completion audit records which file the new attempt superseded");

console.log("deliberate rerun smoke tests: PASS");
