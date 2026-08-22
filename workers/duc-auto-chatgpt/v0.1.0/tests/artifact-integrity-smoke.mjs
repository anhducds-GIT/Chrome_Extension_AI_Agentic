/* Guards three artifact-truthfulness defects found in the Pilot-05 evidence:
   1. artifact filenames were lower-cased into recorded provenance,
   2. already-persisted audit events were written a second time,
   3. chatgpt.com-sourced URLs reached the side panel through innerHTML. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const context = vm.createContext({ console });
for (const file of ["runner-core.js", "checkpoint-core.js", "output-location-core.js"]) {
  vm.runInContext(fs.readFileSync(new URL(file, root), "utf8"), context);
}
const output = context.DacOutputLocation;
const runner = context.DacRunnerCore;
const sidepanel = fs.readFileSync(new URL("sidepanel.js", root), "utf8");

/* ---- 1. artifact filename case ------------------------------------------ */

assert.equal(
  output.artifactLeaf("Authorized folder handle: pilot-05 (absolute path unavailable)/Duc-Auto-ChatGPT-Pilot-05__audit.jsonl"),
  "Duc-Auto-ChatGPT-Pilot-05__audit.jsonl",
  "an audit filename keeps its exact case when taken out of a location label"
);
assert.equal(output.artifactLeaf("Duc-Auto-ChatGPT-Pilot-05__results__v004.xlsx"), "Duc-Auto-ChatGPT-Pilot-05__results__v004.xlsx");
assert.equal(output.artifactLeaf("C:\\Users\\Duc\\Downloads\\Pilot\\Run__results__v002.xlsx"), "Run__results__v002.xlsx", "Windows download paths reduce to their leaf");
assert.equal(output.artifactLeaf("Run__audit.png"), "Run__audit.png", "an artifact leaf never has an image extension stripped");
assert.equal(output.artifactLeaf("", "Fallback__audit.jsonl"), "Fallback__audit.jsonl");

// The reference-matching helper must keep its lossy behavior; it is simply
// never allowed near an artifact filename again.
assert.equal(runner.basename("meo.png"), "meo", "reference matching still normalises image tokens");
assert.equal(runner.basename("Duc-Auto__results__v004.xlsx"), "duc-auto__results__v004.xlsx", "basename is lossy by design");

for (const [label, snippet] of [
  ["prior audit lookup", "function recordedPriorAuditFilename"],
  ["audit gap segment", "const segmentFilename ="],
  ["resume checkpoint name", "state.checkpointFilename = window.DacOutputLocation.artifactLeaf"],
  ["previous checkpoint provenance", "const previous = state.checkpointFilename ||"]
]) assert.ok(sidepanel.includes(snippet), `${label} site is present`);

assert.doesNotMatch(
  sidepanel,
  /DacRunnerCore\.basename\((?:state\.workbook|state\.resultFile|state\.auditFile|lastSavedItem\.result_file|item\.result_file)/,
  "no artifact filename may be routed through the lossy reference-matching basename()"
);

/* ---- 2. audit buffer is emptied after a verified append ------------------ */

const saveAuditSegment = sidepanel.slice(sidepanel.indexOf("async function saveAuditLog"), sidepanel.indexOf("async function assertDownloadCollisionPolicy"));
assert.ok(saveAuditSegment.length > 0, "saveAuditLog is present");
const writeIndex = saveAuditSegment.indexOf("writeFileWithPolicy(location.handle, requested, mergedBlob, policy)");
const clearIndex = saveAuditSegment.indexOf("state.auditEvents = []");
assert.ok(writeIndex > -1, "the directory append path performs a verified write");
assert.ok(clearIndex > writeIndex, "the audit buffer is cleared only after the verified write, so no event is re-emitted on the next flush");
assert.doesNotMatch(
  saveAuditSegment.slice(0, writeIndex),
  /state\.auditEvents = \[\]/,
  "the buffer must never be cleared before the write is verified"
);

/* ---- 3. no markup sinks in the side panel ------------------------------- */

for (const file of ["sidepanel.js", "background.js", "content.js"]) {
  assert.doesNotMatch(fs.readFileSync(new URL(file, root), "utf8"), /\.innerHTML\s*=/, `${file} must not assign innerHTML`);
}
assert.doesNotMatch(sidepanel, /insertAdjacentHTML|outerHTML\s*=|document\.write/, "no alternate markup sink is used");

const safeImageSource = new Function(`${sidepanel.slice(sidepanel.indexOf("function safeImageSource"), sidepanel.indexOf("function thumbnailImage"))} return safeImageSource;`)();
assert.equal(safeImageSource("https://cdn.oaiusercontent.com/a.png"), "https://cdn.oaiusercontent.com/a.png");
assert.equal(safeImageSource("data:image/png;base64,AAAA"), "data:image/png;base64,AAAA");
for (const hostile of [
  '"><img src=https://attacker.example/beacon>',
  "javascript:alert(1)",
  "http://attacker.example/a.png",
  "data:text/html,<script>fetch('https://attacker.example')</script>",
  "",
  null
]) assert.equal(safeImageSource(hostile), "", `rejected non-image source: ${String(hostile).slice(0, 40)}`);

console.log("artifact integrity smoke tests: PASS");
