/* Guards the artifact-truthfulness and operator-safety defects found in the
   Pilot-05 and Pilot-06 evidence:
   1. artifact filenames were lower-cased into recorded provenance,
   2. already-persisted audit events were written a second time,
   3. chatgpt.com-sourced URLs reached the side panel through innerHTML,
   4. two checkpoints could claim one version and resume silently took the
      older one,
   5. the folder picker must stay inside the click that opens it. */
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
assert.match(sidepanel, /state\.auditEvents = audit \? \[\] : snapshot\.auditEvents/, "bridge approval rollback does not re-buffer events that a verified audit write already persisted");
assert.match(sidepanel, /state\.auditEvents = auditPersisted \? \[\] : snapshot\.auditEvents/, "Recreate rollback uses the same no-duplicate audit rule");

/* ---- 3. no markup sinks in the side panel ------------------------------- */

for (const file of ["sidepanel.js", "background.js", "content.js", "provider-adapter.js", "bridge-core.js", "bridge-pairing-core.js", "bridge-router-core.js", "bridge-transport-loopback.js", "bridge-proposal-core.js", "approval-persistence-core.js"]) {
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

/* ---- 4. checkpoint version collisions are refused, not resolved ---------- */

// A free filename is not a free version. Reproduced in pilot-06: v002 and v02
// both mean version 2, highest() tie-broke on filename and returned the OLDER
// file. Both the write path and the resume scan must refuse.
const ledgerSegment = sidepanel.slice(sidepanel.indexOf("async function assertCheckpointVersionAvailable"), sidepanel.indexOf("async function saveAuditLog"));
assert.match(ledgerSegment, /hasVersionConflict/, "the pre-write check compares versions, not only the exact filename");
assert.match(ledgerSegment, /CHECKPOINT_VERSION_CONFLICT/, "a taken version is refused with the documented code");
assert.match(sidepanel, /assertCheckpointVersionAvailable\(location, filename, values\.checkpointFilenamePattern, version\)/, "saveLedger passes the pattern and version so the conflict check can run");

const scanSegment = sidepanel.slice(sidepanel.indexOf("async function scanProfileCheckpoints"), sidepanel.indexOf("async function verifyResumeDirectoryLedger"));
assert.match(scanSegment, /versionCollisions/, "the resume scan detects two checkpoints claiming one version");
assert.match(scanSegment, /RESUME_CHECKPOINT_VERSION_AMBIGUOUS/, "an ambiguous checkpoint set blocks rather than picking one");
assert.ok(scanSegment.indexOf("versionCollisions") < scanSegment.indexOf("DacCheckpointCore.highest"), "collisions are checked before highest() is allowed to choose");

/* ---- 4b. resolving a collision renames, never deletes or overwrites ------ */

// Assert on executable code only; prose in comments must not decide a test.
const codeOnlyEarly = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const collisionSegment = codeOnlyEarly(sidepanel.slice(sidepanel.indexOf("async function confirmCheckpointCollision"), sidepanel.indexOf("function diagnosticGuidanceAction")));
assert.ok(collisionSegment.length > 0, "confirmCheckpointCollision is present");
assert.doesNotMatch(collisionSegment, /removeEntry|\bdelete\b/, "a superseded checkpoint is never deleted");
assert.match(collisionSegment, /handle\.move\(target\)/, "the losing file is renamed");
assert.match(collisionSegment, /supersededName\(directoryHandle, filename, suffix\)/, "the rename uses the operator-chosen suffix and a checked-free name");
assert.match(collisionSegment, /await validate\(\)/, "resume state is re-derived from disk after the rename");

const namingSegment = sidepanel.slice(sidepanel.indexOf("async function supersededName"), sidepanel.indexOf("async function confirmCheckpointCollision"));
assert.match(namingSegment, /fileExists\(directoryHandle, candidate\)/, "the rename never overwrites an existing file");

// The operator picks how the other file is renamed. Both suffixes must stop
// the name parsing as a checkpoint, otherwise the collision would survive.
const naming = new Function(`${namingSegment.replace("async function supersededName", "return async function supersededName")}`)();
const taken = new Set();
const fakeDir = {};
globalThis.window = { DacOutputLocation: { fileExists: async (_dir, name) => taken.has(name) } };
const checkpointSource = fs.readFileSync(new URL("checkpoint-core.js", root), "utf8");
const checkpointContext = vm.createContext({});
vm.runInContext(checkpointSource, checkpointContext);
const pattern = "Run__results__v{version}.xlsx";
for (const suffix of ["__superseded", " (1)"]) {
  taken.clear();
  const first = await naming(fakeDir, "Run__results__v002.xlsx", suffix);
  taken.add(first);
  const second = await naming(fakeDir, "Run__results__v002.xlsx", suffix);
  assert.notEqual(first, second, `${suffix} never reuses a name that already exists`);
  for (const name of [first, second]) {
    assert.equal(checkpointContext.DacCheckpointCore.parse(pattern, name), null, `${name} no longer parses as a checkpoint, so the ambiguity is cleared`);
    assert.match(name, /\.xlsx$/, "the extension is preserved");
  }
}
delete globalThis.window;
assert.match(sidepanel, /COLLISION_SUFFIXES = \["__superseded", " \(1\)"\]/, "both rename styles are offered");

// The finding must carry the filenames, otherwise the row renders without its
// resolve button -- the exact defect reported after the first Vietnamese pass.
assert.match(sidepanel, /files: collisions\.flatMap/, "the collision finding carries the colliding filenames");
assert.match(sidepanel, /function addResumeFinding\(code, message, guidance, extra = \{\}\)/, "resume findings preserve the fields their action needs");
assert.match(sidepanel, /addResumeFinding\(code, message, guidance, extra\)/, "addCheckpointFindings forwards those fields");

// Findings are copied into state.diagnostics by validate(); rendering them in
// both panels printed every blocker twice.
assert.match(sidepanel, /const visibleFindings = state\.diagnostics \? \[\] : plan\.findings\.filter/, "the resume panel stops duplicating rows once Check Plan renders them");

/* ---- 5. the folder-pick dialog keeps the picker inside a user gesture ---- */

const html = fs.readFileSync(new URL("sidepanel.html", root), "utf8");
for (const id of ["folderPickDialog", "folderPickTitle", "folderPickPath", "folderPickCopyBtn", "folderPickStatus", "folderPickCancelBtn", "folderPickOpenBtn"]) {
  assert.match(html, new RegExp(`id="${id}"`), `${id} exists in the markup`);
}

const codeOnly = codeOnlyEarly;
const confirmSegment = codeOnly(sidepanel.slice(sidepanel.indexOf("function confirmFolderPick"), sidepanel.indexOf("async function chooseResultDestination")));
assert.ok(confirmSegment.length > 0, "confirmFolderPick is present");
// showDirectoryPicker() is only permitted while a user gesture is active, so
// nothing may suspend between the click and the picker call.
assert.doesNotMatch(confirmSegment, /\bawait\b|setTimeout|queueMicrotask|requestAnimationFrame|\.then\(/, "the picker is reached synchronously from the click");
assert.match(confirmSegment, /folderPickRunner\(target\)\(\)/, "the confirm button opens the picker for the chosen target");

const openSegment = codeOnly(sidepanel.slice(sidepanel.indexOf("function openFolderPickDialog"), sidepanel.indexOf("function closeFolderPickDialog")));
assert.match(openSegment, /if \(!hint \|\| !els\.folderPickDialog\) \{ folderPickRunner\(target\)\(\); return; \}/, "with no recorded hint the dialog is skipped rather than adding a dead click");
assert.doesNotMatch(openSegment, /showDirectoryPicker/, "opening the dialog must not open the picker");

assert.match(sidepanel, /els\.destinationFolderBtn\.addEventListener\("click", \(\) => openFolderPickDialog\("image"\)\)/, "the setup folder button shows the path first");
assert.match(sidepanel, /els\.chooseResultFolderBtn\.addEventListener\("click", \(\) => openFolderPickDialog\("result"\)\)/, "the result folder button shows the path first");
// Assert the wiring, not the button caption: captions are operator-facing text
// and are translated, so they must not be what a safety test depends on.
const actionSegment = codeOnly(sidepanel.slice(sidepanel.indexOf("function diagnosticGuidanceAction"), sidepanel.indexOf("async function validate")));
assert.match(actionSegment, /OUTPUT_PERMISSION_REQUIRED[\s\S]*?handler: \(\) => openFolderPickDialog\("image"\)/, "the Check Plan inline folder action uses the same dialog");
assert.doesNotMatch(actionSegment, /showDirectoryPicker/, "no inline action opens the picker without the dialog");

console.log("artifact integrity smoke tests: PASS");
