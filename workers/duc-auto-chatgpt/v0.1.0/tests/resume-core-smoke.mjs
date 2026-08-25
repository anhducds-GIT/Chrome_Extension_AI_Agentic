import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const context = vm.createContext({ console });
for (const file of ["checkpoint-core.js", "output-location-core.js", "runner-core.js", "xlsx-run-plan-core.js", "resume-core.js"]) vm.runInContext(fs.readFileSync(new URL(file, root), "utf8"), context);
const resume = context.DacResumeCore;
const output = context.DacOutputLocation;
const planConfig = context.DacXlsxRunPlan;

const jobs = [
  { id: "COMPLETE", prompt: "a", status: "SUCCESS", persistence_verified: "true", result_file: "COMPLETE.png", requested_file: "COMPLETE.png" },
  { id: "PENDING", prompt: "b", status: "PENDING" },
  { id: "PRE", prompt: "c", status: "FAILED", attempt_phase: "PRE_SUBMIT", failure_type: "TIMEOUT_PRE_SUBMIT" },
  { id: "AMBIG", prompt: "d", status: "INTERRUPTED", attempt_phase: "SUBMITTED", submitted_at: "2026-08-21T00:00:00Z" }
];

// Folder hints are declarative only: they import, appear in effective output, and never become a handle.
const imported = planConfig.validate({ output_destination_mode: "profile", output_profile_id: "pilot-04", output_folder_hint: "C:\\Users\\MAYTEST_12\\Downloads\\Duc Auto ChatGPT\\Pilot04" }, jobs, context.DacRunnerCore, output);
assert.equal(imported.effective.output.folderHint.endsWith("Pilot04"), true);
const location = output.fromWorkbook(imported.raw, "pilot-04.xlsx");
assert.equal(location.folderHint.endsWith("Pilot04"), true);
assert.equal(location.image.handle, null, "a folder hint never authorizes filesystem access");

// New identity is durable and an existing identity wins on reopen; old ledgers receive a marked deterministic legacy ID.
assert.equal(resume.createRunId("Pilot04.xlsx", new Date("2026-08-21T03:07:00Z")), "20260821-0307-pilot04");
const persisted = resume.identity({ fileName: "Pilot04__results.xlsx", config: { run_id: "20260821-0307-pilot04" }, jobs });
assert.equal(persisted.run_id, "20260821-0307-pilot04");
assert.equal(persisted.provenance, "persisted");
const legacy = resume.identity({ fileName: "Pilot04__results.xlsx", config: {}, jobs });
assert.equal(legacy.provenance, "legacy");
assert.match(legacy.run_id, /^legacy-pilot04-/);

// Recovery is exact-once conservative: verified outputs skip; only provably pre-submit work remains eligible.
assert.equal(resume.classify(jobs[0]).state, "SAFE_COMPLETE");
assert.equal(resume.classify(jobs[1]).state, "SAFE_PENDING");
assert.equal(resume.classify(jobs[2]).state, "SAFE_FAILED");
assert.equal(resume.classify(jobs[3]).state, "AMBIGUOUS_SUBMITTED");
const recovery = resume.plan({ fileName: "Pilot04__results.xlsx", config: { run_id: "20260821-0307-pilot04" }, jobs });
assert.equal(recovery.summary.completed, 1);
assert.equal(recovery.summary.safe_pending, 1);
assert.equal(recovery.summary.failed, 1);
assert.equal(recovery.summary.ambiguous_submitted, 1);
assert.equal(recovery.next_eligible_job, "PENDING");
assert.equal(recovery.ready, false, "an ambiguous submitted job blocks automatic continuation");
assert.equal(recovery.findings.some((item) => item.code === "RESUME_AMBIGUOUS_SUBMISSION"), true);

const withRemoved = resume.plan({ fileName: "Pilot04__results.xlsx", config: { run_id: "20260821-0307-pilot04" }, jobs: [
  { id: "REMOVED", prompt: "old", queue_removed: "true", queue_position: "" },
  { id: "SECOND", prompt: "second", queue_position: "2" },
  { id: "FIRST", prompt: "first", queue_position: "1" }
] });
assert.equal(withRemoved.summary.total, 2, "Resume counts only active Queue jobs while retaining tombstones in the ledger");
assert.equal(withRemoved.jobs.map((item) => item.job_id).join(","), "FIRST,SECOND", "Resume honors the persisted logical Queue order");

const queue = jobs.map((job) => ({ job, status: "PENDING", phase: "PRE_SUBMIT", skipped: false, protected_checkpoint: false }));
resume.applyToQueue(queue, recovery.jobs);
assert.equal(queue[0].skipped, true, "completed job is never auto-resubmitted");
assert.equal(queue[1].status, "PENDING", "continuation starts at the first safe pending job");
assert.equal(queue[2].status, "FAILED", "pre-submit failure remains under existing failed-job rules");
assert.equal(queue[3].protected_checkpoint, true, "ambiguous submitted work remains protected");

const duplicate = resume.plan({ fileName: "bad__results.xlsx", config: {}, jobs: [{ id: "A", prompt: "x" }, { id: "a", prompt: "y" }] });
assert.equal(duplicate.findings.some((item) => item.code === "RESUME_LEDGER_INVALID"), true, "duplicate IDs fail closed");
const mismatched = resume.plan({ fileName: "other__results.xlsx", config: { effective_result_xlsx: "Pilot04__results.xlsx" }, jobs: [{ id: "A", prompt: "x" }] });
assert.equal(mismatched.findings.some((item) => item.code === "RESUME_RUN_ID_MISMATCH"), true, "a different ledger filename blocks recovery");
const names = output.artifactNames("Pilot04.xlsx");
assert.equal(names.resultFilename, "Pilot04__results__v{version}.xlsx");
assert.equal(names.auditFilename, "Pilot04__audit.jsonl");
assert.equal(names.imagePattern, "{job_id}");
assert.equal(output.collisionError({ filename: "Duc Auto ChatGPT/Pilot04/Pilot04__results.xlsx" }).message, "COLLISION: Output already exists: Duc Auto ChatGPT/Pilot04/Pilot04__results.xlsx", "collision fail path uses the canonical requested path without ReferenceError");

const sidepanel = fs.readFileSync(new URL("sidepanel.js", root), "utf8");
assert.match(sidepanel, /RESUME_AUDIT_APPEND_UNAVAILABLE/);
assert.match(sidepanel, /CHECKPOINT_VERSION_CONFLICT/, "Result checkpoint version conflicts fail closed");
assert.match(sidepanel, /DacCheckpointCore\.persistDirectoryCheckpoint\(\{[\s\S]*?writeNewFile: window\.DacOutputLocation\.writeNewFile/, "checkpoint persistence keeps the exact new-file writer while adding failed-write quarantine");
assert.match(sidepanel, /priorHandle = await location\.handle\.getFileHandle\(previous, \{ create: false \}\)/, "continued audit persistence reads the existing authorized audit before append");

console.log("resume core smoke tests: PASS");
