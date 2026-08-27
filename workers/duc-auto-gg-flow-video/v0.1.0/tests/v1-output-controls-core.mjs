import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const context = { Promise, Array, String, Object, Error, Number, Set, RegExp, Math };
vm.runInNewContext(fs.readFileSync(new URL("../checkpoint-core.js", import.meta.url), "utf8"), context);
vm.runInNewContext(fs.readFileSync(new URL("../output-location-core.js", import.meta.url), "utf8"), context);
const output = context.DacOutputLocation;

function directory(name) {
  const files = new Map();
  return { name, files, async getFileHandle(filename, { create }) {
    if (!create && !files.has(filename)) { const error = new Error("missing"); error.name = "NotFoundError"; throw error; }
    if (!create) return files.get(filename);
    const file = files.get(filename) || { async getFile() { return { name: filename, size: file.blob?.size || 0 }; }, async createWritable() { return { async write(blob) { file.blob = blob; }, async close() {} }; } };
    files.set(filename, file); return file;
  } };
}

assert.equal(output.renderImageFilename("{job_id}", { job_id: "JOB:001", attempt: 2, index: 3 }, "webp"), "JOB_001.webp", "default image pattern preserves actual extension");
assert.equal(output.renderImageFilename("{job_id}__a{attempt}__{index}", { job_id: "job", attempt: 2, index: 3 }, "png"), "job__a02__003.png", "all supported tokens render deterministically");
for (const invalid of ["../escape", "{unknown}", "{job_id", "folder/{job_id}", "bad:name"]) assert.throws(() => output.validateImagePattern(invalid), /pattern|token|unsafe/i, invalid);
assert.equal(output.baseResultName("pilot.xlsx"), "pilot__results.xlsx");
assert.equal(output.baseResultFilenamePattern("pilot.xlsx"), "pilot__results__v{version}.xlsx");
assert.equal(output.baseAuditName("pilot.xlsx"), "pilot__audit.jsonl");

const defaults = output.fromWorkbook({}, "pilot.xlsx");
assert.deepEqual(JSON.parse(JSON.stringify(output.artifactNames("pilot.xlsx", defaults))), { resultFilenamePattern: "pilot__results__v{version}.xlsx", resultFilename: "pilot__results__v{version}.xlsx", auditFilename: "pilot__audit.jsonl", imagePattern: "{job_id}" });
for (const images of [false, true]) for (const xlsx of [false, true]) for (const audit of [false, true]) {
  const values = output.effective({ ...defaults, saveImages: images, saveResultXlsx: xlsx, saveAuditJsonl: audit });
  assert.equal(values.saveImages, images); assert.equal(values.saveResultXlsx, xlsx); assert.equal(values.saveAuditJsonl, audit);
}

const folder = directory("Policy");
await output.writeFileWithPolicy(folder, "same.png", { size: 1 }, "fail");
await assert.rejects(() => output.writeFileWithPolicy(folder, "same.png", { size: 2 }, "fail"), /Refusing to overwrite/);
const unique = await output.writeFileWithPolicy(folder, "same.png", { size: 3 }, "uniquify");
assert.equal(unique.filename, "same__attempt-01.png"); assert.equal(unique.outcome, "uniquified");
const overwrite = await output.writeFileWithPolicy(folder, "same.png", { size: 4 }, "overwrite");
assert.equal(overwrite.outcome, "overwritten"); assert.equal(folder.files.get("same.png").blob.size, 4);
// A first write under the overwrite policy destroyed nothing; recording it as
// "overwritten" told the ledger and audit that prior evidence was replaced.
const fresh = await output.writeFileWithPolicy(directory("Fresh"), "brand-new.png", { size: 7 }, "overwrite");
assert.equal(fresh.outcome, "written", "overwrite policy reports a first write as written, not overwritten");
assert.equal(fresh.size, 7, "the verified persisted byte count is reported");
const safeFolder = output.safeRelativeFolder('Pilot*"05');
assert.equal(safeFolder, "Pilot__05", "characters Chrome Downloads rejects are sanitised at validation time");
assert.deepEqual(Array.from(output.candidatesForPolicy("same.png", "fail")), ["same.png"]);
assert.equal(output.candidatesForPolicy("same.png", "uniquify")[1], "same__attempt-01.png");
assert.throws(() => output.collisionPolicy("ask"), /Collision policy/);

console.log("V1 output controls core: PASS");
