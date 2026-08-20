import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const context = vm.createContext({ console });
for (const file of ["runner-core.js", "output-location-core.js", "plan-diagnostics-core.js", "orchestrator-review-core.js"]) {
  vm.runInContext(fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), context, { filename: file });
}
const { DacRunnerCore: runner, DacOutputLocation: output, DacPlanDiagnostics: diagnostics, DacOrchestratorReview: review } = context;
const workbook = { fileName: "pilot-03.xlsx", config: { output_folder: "Duc Auto ChatGPT/Pilot03" }, jobs: [{ id: "P03-A", prompt: "a" }, { id: "P03-B", prompt: "b", reference_images: "ref-01.png" }] };
const outputSettings = output.fromWorkbook(workbook.config, workbook.fileName);
const missing = diagnostics.analyze({ workbook, files: [], outputCheck: { ok: true, settings: outputSettings }, chatCheck: { ok: false, code: "CHATGPT_NOT_CONNECTED", message: "No normal ChatGPT tab." }, runner, output });
const missingChecklist = review.checklist({ workbook, prepared: null, diagnostics: missing, outputSettings, output, settings: runner.runtimeConfig(workbook.config) });
assert.deepEqual([...missingChecklist.map((item) => item.id)], ["workbook", "jobs", "references", "output", "save_modes", "naming", "settings", "chatgpt"]);
assert.equal(missingChecklist.find((item) => item.id === "references").severity, "BLOCKER");
assert.equal(missingChecklist.find((item) => item.id === "chatgpt").severity, "BLOCKER");

const files = [{ fileName: "ref-01.png" }];
const prepared = runner.prepare(workbook, files);
const ready = diagnostics.analyze({ workbook, files, outputCheck: { ok: true, settings: outputSettings }, chatCheck: { ok: true }, runner, output });
const readyChecklist = review.checklist({ workbook, prepared, diagnostics: ready, outputSettings, output, settings: prepared.settings });
assert.equal(readyChecklist.every((item) => item.severity === "OK"), true);

const before = review.packet({ workbook, prepared, diagnostics: ready, outputSettings, output, settings: prepared.settings });
assert.equal(before.protocol, "DAC_ORCHESTRATOR_REVIEW_V1");
assert.equal(before.workbook.name, "pilot-03.xlsx");
assert.equal(before.jobs.total, 2);
assert.equal(before.jobs.eligible, 2);
assert.equal(before.references.resolved_requirements, 1);
assert.equal(before.output.destination, "downloads");
assert.equal(before.output.label, "Duc Auto ChatGPT/Pilot03");
assert.equal(before.blockers.length, 0);
assert.equal(before.timing.inter_job_delay_mode, "fixed");

const changedOutput = { ...outputSettings, image: output.downloadsLocation("Duc Auto ChatGPT/Pilot03-revised"), collisionPolicy: "fail", saveAuditJsonl: false };
const after = review.packet({ workbook, prepared, diagnostics: ready, outputSettings: changedOutput, output, settings: prepared.settings });
assert.equal(after.output.label, "Duc Auto ChatGPT/Pilot03-revised");
assert.equal(after.output.save_audit_jsonl, false);
assert.equal(after.naming.collision, "fail");
const staleAfterConfigChange = review.packet({ workbook, prepared, diagnostics: null, outputSettings: changedOutput, output, settings: prepared.settings });
assert.equal(staleAfterConfigChange.output.label, "Duc Auto ChatGPT/Pilot03-revised");
assert.equal(staleAfterConfigChange.warnings.some((item) => item.code === "PLAN_CHECK_REQUIRED"), true);
const provenance = review.packet({ workbook, prepared, diagnostics: ready, outputSettings, output, settings: prepared.settings, importedConfig: { effective: { output: { profileId: "pilot-04" } } }, localOverrides: ["timeout_sec"], outputProfileState: { state: "authorized" } });
assert.equal(provenance.configuration.source, "xlsx_with_local_overrides");
assert.deepEqual([...provenance.configuration.overrides], ["timeout_sec"]);
assert.equal(provenance.output.profile_id, "pilot-04");
assert.equal(provenance.output.permission, "authorized");

const payload = review.copyPayload({ workbook, prepared, diagnostics: ready, outputSettings: changedOutput, output, settings: prepared.settings });
assert.match(payload, /^DAC Orchestrator review request:/);
assert.match(payload, /return GO or FIX/);
assert.match(payload, /Do not invent facts not present in the packet/);
const packetJson = JSON.parse(payload.slice(payload.indexOf("\n\n") + 2));
assert.equal(packetJson.protocol, "DAC_ORCHESTRATOR_REVIEW_V1");
assert.equal(packetJson.output.save_audit_jsonl, false);

console.log("orchestrator review core smoke: PASS");
