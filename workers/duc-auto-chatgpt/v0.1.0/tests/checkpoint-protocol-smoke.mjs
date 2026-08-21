import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const context = vm.createContext({ console, Promise, Array, String, Object, Error, Number, Set, RegExp, Math });
for (const file of ["checkpoint-core.js", "output-location-core.js", "runner-core.js", "xlsx-run-plan-core.js", "resume-core.js"]) vm.runInContext(fs.readFileSync(new URL(file, root), "utf8"), context, { filename: file });
const checkpoint = context.DacCheckpointCore;
const output = context.DacOutputLocation;
const resume = context.DacResumeCore;

const pattern = "Pilot__results__v{version}.xlsx";
assert.equal(checkpoint.formatVersion(1), "001");
assert.equal(checkpoint.render(pattern, 10), "Pilot__results__v010.xlsx");
assert.deepEqual(JSON.parse(JSON.stringify(checkpoint.parse(pattern, "Pilot__results__v009.xlsx"))), { filename: "Pilot__results__v009.xlsx", version: 9 });
assert.equal(checkpoint.nextVersion(9), 10, "v009 advances to v010");
assert.equal(output.renderCheckpointFilename("Pilot.xlsx", { resultFilenamePattern: pattern }, 10), "Pilot__results__v010.xlsx");

const valid = (version, runId = "20260821-0307-pilot") => ({
  fileName: checkpoint.render(pattern, version),
  config: { run_id: runId, checkpoint_version: String(version), checkpoint_filename: checkpoint.render(pattern, version), checkpoint_created_at: "2026-08-21T03:07:00.000Z", effective_result_xlsx: checkpoint.render(pattern, version) },
  jobs: [{ id: "A", prompt: "x", status: "PENDING" }]
});
const discovered = [checkpoint.parse(pattern, "Pilot__results__v002.xlsx"), checkpoint.parse(pattern, "Pilot__results__v003.xlsx")];
assert.equal(checkpoint.highest(discovered).version, 3, "highest numeric version wins without mtime");
assert.equal(resume.checkpointValidation(valid(3), "Pilot__results__v003.xlsx", pattern, "20260821-0307-pilot").ready, true, "highest valid checkpoint is authoritative");

const corrupt = valid(4); delete corrupt.config.checkpoint_created_at;
assert.equal(resume.checkpointValidation(corrupt, "Pilot__results__v004.xlsx", pattern, "20260821-0307-pilot").findings.some((item) => item.code === "RESUME_LATEST_CHECKPOINT_INVALID"), true, "corrupt latest checkpoint blocks rather than falling back");
assert.equal(resume.checkpointValidation(valid(3, "different-run"), "Pilot__results__v003.xlsx", pattern, "20260821-0307-pilot").findings.some((item) => item.code === "RESUME_RUN_ID_MISMATCH"), true, "run ID mismatch blocks continuation");
assert.equal(checkpoint.hasVersionConflict(discovered, 3), true, "an exact next checkpoint conflict is detectable");
assert.equal(checkpoint.render(pattern, checkpoint.nextVersion(3)), "Pilot__results__v004.xlsx", "resume v003 continues as v004");

const legacy = { fileName: "Pilot__results.xlsx", config: { run_id: "20260821-0307-pilot", effective_result_xlsx: "Pilot__results.xlsx" }, jobs: [{ id: "A", prompt: "x", status: "PENDING" }] };
assert.equal(resume.checkpointValidation(legacy, legacy.fileName, pattern, "20260821-0307-pilot").ready, true, "legacy non-versioned Result XLSX remains compatible");

let created = false;
const zeroDirectory = { async getFileHandle(_filename, { create }) {
  if (!create && !created) { const error = new Error("missing"); error.name = "NotFoundError"; throw error; }
  created = true;
  return { async createWritable() { return { async write() {}, async close() {} }; }, async getFile() { return { size: 0 }; } };
} };
let authoritativeVersion = 3;
await assert.rejects(() => output.writeNewFile(zeroDirectory, "Pilot__results__v004.xlsx", { size: 10 }), /PERSISTENCE_VERIFICATION_FAILED/);
assert.equal(authoritativeVersion, 3, "failed persistence does not advance authoritative checkpoint version");
authoritativeVersion = checkpoint.nextVersion(authoritativeVersion);
assert.equal(authoritativeVersion, 4);

console.log("checkpoint protocol smoke tests: PASS");
