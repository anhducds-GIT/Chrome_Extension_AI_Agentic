import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const context = vm.createContext({ console });
for (const file of ["checkpoint-core.js", "resume-core.js", "reconciliation-core.js"]) vm.runInContext(fs.readFileSync(new URL(file, root), "utf8"), context);
const reconcile = context.DacReconciliationCore;
const resume = context.DacResumeCore;

const generated = { source: "https://cdn.example/P05-B.png", source_id: "p05b-source", node_id: "p05b-node", visible: true, ready: true, input: false, role: "unknown" };
const baseline = [{ source: "https://cdn.example/P05-A.png", source_id: "p05a-source", visible: true, ready: true, input: false, role: "unknown" }];
const p05b = {
  id: "P05-B", prompt: "B", status: "STOPPED", attempt_phase: "SUBMITTED", attempt_id: "attempt-p05-b-1", submitted_at: "2026-08-21T03:15:31.450Z",
  detection_diagnostics: JSON.stringify({ baseline_source_ids: ["p05a-source"], chosen_attribution: "new_visible_fallback", decision: { fresh: { eligible: 1 }, chosen: { source_id: "p05b-source", role: "unknown", input: false } } })
};

// Ambiguous submitted work remains non-runnable until a distinct manual proof passes.
assert.equal(resume.classify(p05b).state, "AMBIGUOUS_SUBMITTED");
const proofResult = reconcile.proofFromRecordedAttempt({ run_id: "pilot-05-run", job: p05b });
assert.equal(proofResult.ok, true, "historical attempt evidence creates a proof");
assert.equal(reconcile.verifyExistingOutput({ proof: proofResult.proof, candidates: [...baseline, generated] }).ok, true, "correct historical attempt plus one post-boundary image passes");
assert.equal(reconcile.matchesRequest(proofResult.proof, { ...proofResult.proof, run_id: "other-run" }).ok, false, "wrong run ID fails");
assert.equal(reconcile.matchesRequest(proofResult.proof, { ...proofResult.proof, job_id: "P05-C" }).ok, false, "wrong job ID fails");
assert.equal(reconcile.matchesRequest(proofResult.proof, { ...proofResult.proof, attempt_id: "attempt-other" }).ok, false, "wrong attempt ID fails");

const priorProof = { ...proofResult.proof, baseline_source_ids: ["p05a-source", "p05b-source"] };
assert.equal(reconcile.verifyExistingOutput({ proof: priorProof, candidates: [...baseline, generated] }).ok, false, "candidate already in the immutable boundary fails");
const second = { ...generated, source: "https://cdn.example/unrelated.png", source_id: "unrelated" };
assert.equal(reconcile.verifyExistingOutput({ proof: proofResult.proof, candidates: [...baseline, generated, second] }).ok, false, "multiple eligible candidates fail");
assert.equal(reconcile.verifyExistingOutput({ proof: proofResult.proof, candidates: [...baseline, { ...generated, input: true }] }).ok, false, "input/reference image fails");
assert.equal(reconcile.verifyExistingOutput({ proof: proofResult.proof, candidates: [...baseline, { ...generated, ready: false }] }).ok, false, "unloaded image fails");

assert.equal(reconcile.safeComplete({ attribution: { ok: true }, imagePersisted: true, checkpointPersisted: true }), true, "verified existing image and checkpoint may become safe complete");
assert.equal(reconcile.safeComplete({ attribution: { ok: true }, imagePersisted: true, checkpointPersisted: false }), false, "checkpoint persistence failure remains blocked");
assert.equal(context.DacCheckpointCore.nextVersion(1), 2, "successful reconciliation advances v001 to v002");

const before = [
  { id: "P05-A", status: "SUCCESS", persistence_verified: "true", result_file: "P05-A.png", requested_file: "P05-A.png" },
  p05b,
  { id: "P05-C", prompt: "C", status: "PENDING" }, { id: "P05-D", prompt: "D", status: "PENDING" }, { id: "P05-E", prompt: "E", status: "PENDING" }
];
assert.equal(resume.plan({ fileName: "pilot__results__v001.xlsx", config: { run_id: "pilot-05-run" }, jobs: before }).ready, false, "P05-B prevents continuation before reconciliation");
const after = before.map((job) => job.id === "P05-B" ? { ...job, status: "SUCCESS", attempt_phase: "SUCCESS", persistence_verified: "true", result_file: "P05-B.png", requested_file: "P05-B.png" } : job);
const recovered = resume.plan({ fileName: "pilot__results__v002.xlsx", config: { run_id: "pilot-05-run" }, jobs: after });
assert.equal(recovered.ready, true, "P05-B safe complete unlocks continuation");
assert.equal(recovered.next_eligible_job, "P05-C", "C/D/E become eligible after P05-B reconciliation only");

const content = fs.readFileSync(new URL("content.js", root), "utf8");
const endpoint = content.slice(content.indexOf('message.type === "DAC_MANUAL_RECONCILE_EXISTING_OUTPUT"'));
assert.match(endpoint, /inspectPersistedImage/);
assert.doesNotMatch(endpoint.slice(0, endpoint.indexOf("return false;")), /runPrompt|sendButton\.click|attachReferenceImages/, "manual reconciliation never submits P05-B");

console.log("manual reconciliation core smoke tests: PASS");
