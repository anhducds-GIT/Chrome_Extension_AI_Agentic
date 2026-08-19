import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const context = { Promise, Array, String, Object, Error };
vm.runInNewContext(fs.readFileSync(new URL("../output-location-core.js", import.meta.url), "utf8"), context);
const output = context.DacOutputLocation;

function directory(name, permission = "granted") {
  const files = new Map();
  return {
    name,
    files,
    queryPermission: async () => permission,
    async getFileHandle(filename, { create }) {
      if (!create && !files.has(filename)) { const error = new Error("missing"); error.name = "NotFoundError"; throw error; }
      if (!create) return files.get(filename);
      const file = { async createWritable() { return { async write(blob) { file.blob = blob; }, async close() {} }; } };
      files.set(filename, file);
      return file;
    }
  };
}

const settings = output.fromWorkbook({ output_folder: "Workbook Images" }, "brief.xlsx");
assert.equal(output.locationLabel(settings.image), "Downloads/Workbook Images", "XLSX output_folder is displayed as the initial effective location");
assert.equal(output.runPlan("brief.xlsx", settings).resultDestination, "Downloads/Workbook Images/brief-result.xlsx");

const selected = directory("Selected Images");
settings.image = output.directoryLocation(selected, selected.name);
assert.equal(output.locationLabel(output.effective(settings).image), "Authorized folder: Selected Images", "changing image folder updates the effective display");
assert.equal((await output.preflight(settings)).ok, true, "authorized selected folder passes preflight");

const source = directory("Source Workbook Folder");
settings.image = output.directoryLocation(source, source.name);
settings.result = { kind: "same_as_image" };
const sourcePlan = output.runPlan("brief.xlsx", settings);
assert.equal(sourcePlan.imageDestination, "Authorized folder: Source Workbook Folder", "Use Source Folder has the same authorized-folder semantics");
assert.equal(sourcePlan.resultDestination, "Authorized folder: Source Workbook Folder/brief-result.xlsx");

const revoked = directory("Revoked", "denied");
settings.image = output.directoryLocation(revoked, revoked.name);
const denied = await output.preflight(settings);
assert.equal(denied.ok, false, "revoked permission fails preflight");
assert.match(denied.error, /permission is denied/i);
assert.equal(denied.effective.image.kind, "directory", "permission failure never silently changes the destination to Downloads");

const names = output.imageCandidates("job:001", "webp");
assert.deepEqual(Array.from(names.slice(0, 3)), ["job_001.webp", "job_001__attempt-01.webp", "job_001__attempt-02.webp"]);
assert.equal(output.actualExtension({ type: "image/webp" }, "png"), "webp");

const writable = directory("Intended Folder");
writable.files.set("job_001.webp", { existing: true });
const saved = await output.writeUniqueFile(writable, output.imageCandidates("job:001", "webp"), { size: 10, type: "image/webp" });
assert.equal(saved, "job_001__attempt-01.webp", "an existing image is never silently overwritten");
assert.equal(writable.files.get(saved).blob.size, 10, "generated image is written to the selected directory handle");

const resultFolder = directory("Result Folder");
resultFolder.files.set("brief-result.xlsx", { existing: true });
const finalResultName = await output.findAvailableFilename(resultFolder, output.fileCandidates("brief-result.xlsx"));
assert.equal(finalResultName, "brief-result__attempt-01.xlsx", "custom-directory result collision selects the actual final filename before serialization");
assert.equal(output.fileLabel(output.directoryLocation(resultFolder, resultFolder.name), finalResultName), "Authorized folder: Result Folder/brief-result__attempt-01.xlsx", "result provenance can record the actual selected custom-folder path");
await output.writeNewFile(resultFolder, finalResultName, { size: 22, type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
assert.equal(resultFolder.files.get(finalResultName).blob.size, 22);
await assert.rejects(() => output.writeNewFile(resultFolder, finalResultName, { size: 23 }), /Refusing to overwrite/, "custom-directory no-overwrite behavior remains enforced");

console.log("output location core smoke tests: PASS");
