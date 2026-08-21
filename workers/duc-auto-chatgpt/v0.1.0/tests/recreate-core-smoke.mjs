import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const context = vm.createContext({ console });
for (const file of ["runner-core.js", "resume-core.js", "recreate-core.js"]) vm.runInContext(fs.readFileSync(new URL(file, root), "utf8"), context);
const runner = context.DacRunnerCore;
const resume = context.DacResumeCore;
const recreate = context.DacRecreateCore;

const ambiguous = { id: "P05-B", prompt: "B", status: "STOPPED", attempt_phase: "SUBMITTED", attempt_id: "attempt-old-b", submitted_at: "2026-08-21T03:15:31.450Z", detection_diagnostics: "{\"chosen\":\"old\"}", failure_type: "USER_STOP" };
const prior = { id: "P05-A", prompt: "A", status: "SUCCESS", persistence_verified: "true", result_file: "P05-A.png", requested_file: "P05-A.png" };
const pending = [{ id: "P05-C", prompt: "C", status: "PENDING" }, { id: "P05-D", prompt: "D", status: "PENDING" }, { id: "P05-E", prompt: "E", status: "PENDING" }];

assert.equal(resume.plan({ fileName: "pilot__results__v001.xlsx", config: { run_id: "pilot-05" }, jobs: [prior, ambiguous, ...pending] }).ready, false, "ambiguous submission blocks normal Continue");
const approval = recreate.approval({ job: ambiguous, recoveryState: "AMBIGUOUS_SUBMITTED", now: "2026-08-21T04:00:00.000Z" });
assert.equal(approval.ok, true, "explicit confirmed recreate creates approval fields");
assert.equal(approval.fields.attempt_id, "", "recreate always starts a new attempt ID");
assert.equal(approval.fields.recreate_origin_attempt_id, "attempt-old-b", "old ambiguous attempt is preserved");
assert.match(approval.fields.recreate_history_json, /attempt-old-b/, "old evidence remains in provenance history");
assert.equal(Object.keys(recreate.cancelled().fields).length, 0, "Cancel has no mutation payload");
assert.equal(recreate.approval({ job: ambiguous, recoveryState: "SAFE_PENDING" }).ok, false, "non-ambiguous jobs cannot use recreate");

const approvedJob = { ...ambiguous, ...approval.fields };
const approvedPlan = resume.plan({ fileName: "pilot__results__v002.xlsx", config: { run_id: "pilot-05" }, jobs: [prior, approvedJob, ...pending] });
assert.equal(approvedPlan.ready, false, "approval alone does not unlock Continue");
assert.equal(approvedPlan.findings.some((finding) => finding.code === "RESUME_RECREATE_INCOMPLETE"), true, "incomplete recreate remains fail-closed");
const prepared = runner.prepare({ config: {}, jobs: [prior, approvedJob, ...pending] }, []);
resume.applyToQueue(prepared.queue, approvedPlan.jobs);
const recreateItem = prepared.queue.find((item) => item.job.id === "P05-B");
assert.equal(recreateItem.operator_recreate, true, "approved recreation is a distinct deliberate queue item");
assert.equal(runner.selectQueue(prepared.queue, "recreate").map((item) => item.job.id).join(","), "P05-B", "only the approved job enters recreate mode");
assert.equal(runner.selectQueue(prepared.queue, "all").some((item) => item.job.id === "P05-B"), true, "approval is explicit; no hidden replacement job exists");

const completedB = { ...approvedJob, status: "SUCCESS", attempt_phase: "SUCCESS", persistence_verified: "true", requested_file: "P05-B.png", result_file: "P05-B.png", recreate_status: "SUCCESS", recreate_attempt_id: "attempt-new-b" };
const completedPlan = resume.plan({ fileName: "pilot__results__v003.xlsx", config: { run_id: "pilot-05" }, jobs: [prior, completedB, ...pending] });
assert.equal(completedPlan.ready, true, "queue unlocks only after successful recreate");
assert.equal(completedPlan.next_eligible_job, "P05-C", "C/D/E are eligible only after P05-B success");

const sidepanel = fs.readFileSync(new URL("sidepanel.js", root), "utf8");
const html = fs.readFileSync(new URL("sidepanel.html", root), "utf8");
assert.match(sidepanel, /Recreate Image/, "ambiguous blocker renders a recreate action");
assert.match(html, /Prior submitted output could not be safely attributed\. Recreating may produce a duplicate image\./, "confirmation dialog explains duplicate risk");
assert.match(sidepanel, /Recreate \$\{jobId\}/, "confirmation names the exact job");
const openSegment = sidepanel.slice(sidepanel.indexOf("function openRecreateDialog"), sidepanel.indexOf("function closeRecreateDialog"));
assert.doesNotMatch(openSegment, /run\(|DAC_RUN_IMAGE_JOB|send\(/, "opening confirmation never silently resubmits");
const confirmSegment = sidepanel.slice(sidepanel.indexOf("async function confirmRecreate"), sidepanel.indexOf("async function resolveExistingOutput"));
assert.match(confirmSegment, /await run\("recreate"\)/, "only confirmed recreate starts the deliberate new attempt");

console.log("explicit recreate smoke tests: PASS");
