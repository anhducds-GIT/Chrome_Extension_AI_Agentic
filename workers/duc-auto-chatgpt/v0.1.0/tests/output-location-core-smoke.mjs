import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const context = { Promise, Array, String, Object, Error };
vm.runInNewContext(fs.readFileSync(new URL("../checkpoint-core.js", import.meta.url), "utf8"), context);
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
      const file = { async getFile() { return { name: filename, size: file.blob?.size || 0 }; }, async createWritable() { return { async write(blob) { file.blob = blob; }, async close() {} }; } };
      files.set(filename, file);
      return file;
    }
  };
}

const settings = output.fromWorkbook({ output_folder: "Workbook Images" }, "brief.xlsx");
assert.equal(output.locationLabel(settings.image), "Downloads/Workbook Images", "XLSX output_folder is displayed as the initial effective location");
assert.equal(output.runPlan("brief.xlsx", settings).resultDestination, "Downloads/Workbook Images/brief__results__v{version}.xlsx");

const configuredResult = "Duc-Auto-ChatGPT-Pilot-04__results.xlsx";
const configuredAudit = "Duc-Auto-ChatGPT-Pilot-04__audit.jsonl";
const resultDownload = output.downloadArtifactRequest(settings.image, configuredResult, "uniquify");
const auditDownload = output.downloadArtifactRequest(settings.image, configuredAudit, "uniquify");
assert.equal(resultDownload.filename, `Workbook Images/${configuredResult}`, "configured Result XLSX filename is the actual Downloads request leaf");
assert.equal(auditDownload.filename, `Workbook Images/${configuredAudit}`, "configured Audit JSONL filename is the actual Downloads request leaf");
assert.equal(output.verifyDownloadedFilename(resultDownload, `C:\\Downloads\\Workbook Images\\${configuredResult}`).leaf, configuredResult, "completed Result XLSX retains configured physical filename");
assert.equal(output.verifyDownloadedFilename(auditDownload, `C:\\Downloads\\Workbook Images\\${configuredAudit}`).leaf, configuredAudit, "completed Audit JSONL retains configured physical filename");
assert.throws(() => output.verifyDownloadedFilename(resultDownload, "C:\\Downloads\\2b39dd04-2a56-471f-9bc0-4a2b8d369bbc.xlsx"), /PERSISTENCE_FILENAME_MISMATCH/, "a browser-reported UUID cannot be accepted as the configured Result XLSX");
assert.equal(output.verifyDownloadedFilename(output.downloadArtifactRequest(settings.image, configuredResult, "uniquify"), `C:\\Downloads\\Workbook Images\\Duc-Auto-ChatGPT-Pilot-04__results (1).xlsx`).leaf, "Duc-Auto-ChatGPT-Pilot-04__results (1).xlsx", "uniquify accepts Chrome's numbered physical filename");

const selected = directory("Selected Images");
settings.image = output.directoryLocation(selected, selected.name);
assert.equal(output.locationLabel(output.effective(settings).image), "Authorized folder handle: Selected Images (absolute path unavailable)", "changing image folder updates the effective handle display without inventing a path");
assert.equal((await output.preflight(settings)).ok, true, "authorized selected folder passes preflight");

const source = directory("Source Workbook Folder");
settings.image = output.directoryLocation(source, source.name);
settings.result = { kind: "same_as_image" };
const sourcePlan = output.runPlan("brief.xlsx", settings);
assert.equal(sourcePlan.imageDestination, "Authorized folder handle: Source Workbook Folder (absolute path unavailable)", "Use Source Folder retains the selected-handle semantics");
assert.equal(sourcePlan.resultDestination, "Authorized folder handle: Source Workbook Folder (absolute path unavailable)/brief__results__v{version}.xlsx");

const revoked = directory("Revoked", "denied");
settings.image = output.directoryLocation(revoked, revoked.name);
const denied = await output.preflight(settings);
assert.equal(denied.ok, false, "revoked permission fails preflight");
assert.match(denied.error, /permission is denied/i);
assert.equal(denied.effective.image.kind, "directory", "permission failure never silently changes the destination to Downloads");
settings.result = output.downloadsLocation("Text Results");
const textOnly = await output.preflight(settings, { requireImage: false });
assert.equal(textOnly.ok, true, "text-only jobs require the Result destination but do not require an unused image folder permission");
assert.equal(textOnly.checks.length, 1);

const names = output.imageCandidates("job:001", "webp");
assert.deepEqual(Array.from(names.slice(0, 3)), ["job_001.webp", "job_001__attempt-01.webp", "job_001__attempt-02.webp"]);
assert.equal(output.actualExtension({ type: "image/webp" }, "png"), "webp");

const writable = directory("Intended Folder");
writable.files.set("job_001.webp", { existing: true });
const saved = await output.writeUniqueFile(writable, output.imageCandidates("job:001", "webp"), { size: 10, type: "image/webp" });
assert.equal(saved, "job_001__attempt-01.webp", "an existing image is never silently overwritten");
assert.equal(writable.files.get(saved).blob.size, 10, "generated image is written to the selected directory handle");

const resultFolder = directory("Result Folder");
resultFolder.files.set("brief__results.xlsx", { existing: true });
const finalResultName = await output.findAvailableFilename(resultFolder, output.fileCandidates("brief__results.xlsx"));
assert.equal(finalResultName, "brief__results__attempt-01.xlsx", "custom-directory result collision selects the actual final filename before serialization");
assert.equal(output.fileLabel(output.directoryLocation(resultFolder, resultFolder.name), finalResultName), "Authorized folder handle: Result Folder (absolute path unavailable)/brief__results__attempt-01.xlsx", "result provenance records the selected handle and actual leaf without inventing a path");
await output.writeNewFile(resultFolder, finalResultName, { size: 22, type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
assert.equal(resultFolder.files.get(finalResultName).blob.size, 22);
await assert.rejects(() => output.writeNewFile(resultFolder, finalResultName, { size: 23 }), /Refusing to overwrite/, "custom-directory no-overwrite behavior remains enforced");

console.log("output location core smoke tests: PASS");
