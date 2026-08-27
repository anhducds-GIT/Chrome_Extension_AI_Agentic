import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const context = { Promise, Array, String, Object, Error, Number, Set, RegExp, Math };
vm.runInNewContext(fs.readFileSync(new URL("../output-location-core.js", import.meta.url), "utf8"), context);
const output = context.DacOutputLocation;

function fakeDirectory(mode = "persist") {
  const files = new Map();
  return {
    files,
    async getFileHandle(filename, { create }) {
      if (!create && !files.has(filename)) { const error = new Error("missing after close"); error.name = "NotFoundError"; throw error; }
      let entry = files.get(filename);
      if (!entry) {
        entry = {
          async getFile() { return { name: filename, size: entry.size ?? 0 }; },
          async createWritable() {
            return {
              async write(blob) { entry.size = Number(blob?.size) || 0; },
              async close() {
                if (mode === "missing") files.delete(filename);
                else { if (mode === "zero") entry.size = 0; files.set(filename, entry); }
              }
            };
          }
        };
        if (create) files.set(filename, entry);
      }
      return entry;
    }
  };
}

await assert.rejects(
  () => output.writeFileWithPolicy(fakeDirectory("missing"), "generated.png", { size: 12, type: "image/png" }, "fail"),
  /PERSISTENCE_VERIFICATION_FAILED.*generated\.png.*not readable/i,
  "close without a readable persisted image must fail closed"
);
await assert.rejects(
  () => output.writeFileWithPolicy(fakeDirectory("zero"), "results.xlsx", { size: 44, type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }, "fail"),
  /PERSISTENCE_VERIFICATION_FAILED.*zero bytes/i,
  "zero-byte persisted XLSX must fail closed"
);

// A short write is a silent truncation. "Non-empty" is not proof of
// persistence when the caller knows how many bytes it handed to the stream.
function truncatingDirectory(writtenSize) {
  const files = new Map();
  return {
    files,
    async getFileHandle(filename, { create }) {
      if (!create && !files.has(filename)) { const error = new Error("missing"); error.name = "NotFoundError"; throw error; }
      let entry = files.get(filename);
      if (!entry) {
        entry = {
          async getFile() { return { name: filename, size: entry.size ?? 0 }; },
          async createWritable() { return { async write() { entry.size = writtenSize; }, async close() { files.set(filename, entry); } }; }
        };
        if (create) files.set(filename, entry);
      }
      return entry;
    }
  };
}

await assert.rejects(
  () => output.writeFileWithPolicy(truncatingDirectory(40), "results.xlsx", { size: 4096 }, "fail"),
  /PERSISTENCE_VERIFICATION_FAILED.*40 bytes but 4096 bytes were written/,
  "a truncated write must never be reported as saved"
);
await assert.rejects(
  () => output.writeFileWithPolicy(truncatingDirectory(40), "generated.png", { size: 4096 }, "overwrite"),
  /PERSISTENCE_VERIFICATION_FAILED.*bytes were written/,
  "the overwrite policy verifies the persisted byte count too"
);

const valid = fakeDirectory();
for (const [filename, blob] of [["generated.png", { size: 12, type: "image/png" }], ["results.xlsx", { size: 44, type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }], ["audit.jsonl", { size: 19, type: "application/jsonl" }]]) {
  const written = await output.writeFileWithPolicy(valid, filename, blob, "fail");
  assert.equal(written.filename, filename);
  assert.ok(written.size > 0, `${filename} has verified non-zero persistence`);
  const verified = await output.verifyPersistedFile(valid, filename);
  assert.ok(verified.size > 0, `${filename} can be reopened after close`);
}

console.log("P1 persistence verification core: PASS");
