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
assert.equal(checkpoint.formatVersion(1), "01");
assert.equal(checkpoint.render(pattern, 10), "Pilot__results__v10.xlsx");
assert.deepEqual(JSON.parse(JSON.stringify(checkpoint.parse(pattern, "Pilot__results__v09.xlsx"))), { filename: "Pilot__results__v09.xlsx", version: 9 });
assert.equal(checkpoint.nextVersion(9), 10, "v09 advances to v10");
assert.equal(output.renderCheckpointFilename("Pilot.xlsx", { resultFilenamePattern: pattern }, 10), "Pilot__results__v10.xlsx");

const valid = (version, runId = "20260821-0307-pilot") => ({
  fileName: checkpoint.render(pattern, version),
  config: { run_id: runId, checkpoint_version: String(version), checkpoint_filename: checkpoint.render(pattern, version), checkpoint_created_at: "2026-08-21T03:07:00.000Z", effective_result_xlsx: checkpoint.render(pattern, version) },
  jobs: [{ id: "A", prompt: "x", status: "PENDING" }]
});
const discovered = [checkpoint.parse(pattern, "Pilot__results__v02.xlsx"), checkpoint.parse(pattern, "Pilot__results__v03.xlsx")];
assert.equal(checkpoint.highest(discovered).version, 3, "highest numeric version wins without mtime");
assert.equal(resume.checkpointValidation(valid(3), "Pilot__results__v03.xlsx", pattern, "20260821-0307-pilot").ready, true, "highest valid checkpoint is authoritative");

const corrupt = valid(4); delete corrupt.config.checkpoint_created_at;
assert.equal(resume.checkpointValidation(corrupt, "Pilot__results__v04.xlsx", pattern, "20260821-0307-pilot").findings.some((item) => item.code === "RESUME_LATEST_CHECKPOINT_INVALID"), true, "corrupt latest checkpoint blocks rather than falling back");
assert.equal(resume.checkpointValidation(valid(3, "different-run"), "Pilot__results__v03.xlsx", pattern, "20260821-0307-pilot").findings.some((item) => item.code === "RESUME_RUN_ID_MISMATCH"), true, "run ID mismatch blocks continuation");
assert.equal(checkpoint.hasVersionConflict(discovered, 3), true, "an exact next checkpoint conflict is detectable");
assert.equal(checkpoint.render(pattern, checkpoint.nextVersion(3)), "Pilot__results__v04.xlsx", "resume v03 continues as v04");

// Naming convention is two digits. Three-digit checkpoints written under the
// earlier convention must still parse and resume rather than being unreadable.
assert.equal(checkpoint.formatVersion(12), "12");
assert.equal(checkpoint.formatVersion(120), "120", "a version past 99 widens instead of truncating");
assert.equal(checkpoint.render(pattern, 1), "Pilot__results__v01.xlsx");
assert.equal(checkpoint.parse(pattern, "Pilot__results__v01.xlsx").version, 1);
assert.equal(checkpoint.parse(pattern, "Pilot__results__v001.xlsx").version, 1, "legacy three-digit checkpoints remain readable");
assert.equal(checkpoint.parse(pattern, "Pilot__results__v1.xlsx"), null, "a single digit is not a checkpoint name");
assert.equal(checkpoint.render(pattern, checkpoint.nextVersion(checkpoint.parse(pattern, "Pilot__results__v001.xlsx").version)), "Pilot__results__v02.xlsx", "a legacy v001 continues as v02");

// A folder that mixes naming widths can hold two files meaning the same
// version. highest() would break that tie on filename and silently prefer the
// alphabetically-first one -- which can be the OLDER checkpoint. Reproduced in
// pilot-06: v002 (written 08:42) and v02 (written 08:50) both parse to 2, and
// highest() picked v002. Collisions must be surfaced, never resolved silently.
// Values cross the vm boundary, so compare structure rather than prototype.
const plain = (value) => JSON.parse(JSON.stringify(value));
const mixed = ["Pilot__results__v001.xlsx", "Pilot__results__v002.xlsx", "Pilot__results__v02.xlsx"].map((name) => checkpoint.parse(pattern, name));
assert.deepEqual(plain(mixed.map((item) => item.version)), [1, 2, 2], "both naming widths parse to the same version number");
const collisions = plain(checkpoint.versionCollisions(mixed));
assert.equal(collisions.length, 1, "the duplicated version is reported");
assert.equal(collisions[0].version, 2);
assert.deepEqual(collisions[0].filenames, ["Pilot__results__v002.xlsx", "Pilot__results__v02.xlsx"]);
assert.equal(checkpoint.hasVersionConflict(mixed, 2), true, "writing version 2 into this folder must be refused");
assert.deepEqual(plain(checkpoint.versionCollisions([checkpoint.parse(pattern, "Pilot__results__v01.xlsx"), checkpoint.parse(pattern, "Pilot__results__v02.xlsx")])), [], "a consistently named folder has no collisions");
assert.deepEqual(plain(checkpoint.versionCollisions([])), []);

const legacy = { fileName: "Pilot__results.xlsx", config: { run_id: "20260821-0307-pilot", effective_result_xlsx: "Pilot__results.xlsx" }, jobs: [{ id: "A", prompt: "x", status: "PENDING" }] };
assert.equal(resume.checkpointValidation(legacy, legacy.fileName, pattern, "20260821-0307-pilot").ready, true, "legacy non-versioned Result XLSX remains compatible");

let created = false;
const zeroDirectory = { async getFileHandle(_filename, { create }) {
  if (!create && !created) { const error = new Error("missing"); error.name = "NotFoundError"; throw error; }
  created = true;
  return { async createWritable() { return { async write() {}, async close() {} }; }, async getFile() { return { size: 0 }; } };
} };
let authoritativeVersion = 3;
await assert.rejects(() => output.writeNewFile(zeroDirectory, "Pilot__results__v04.xlsx", { size: 10 }), /PERSISTENCE_VERIFICATION_FAILED/);
assert.equal(authoritativeVersion, 3, "failed persistence does not advance authoritative checkpoint version");
authoritativeVersion = checkpoint.nextVersion(authoritativeVersion);
assert.equal(authoritativeVersion, 4);

const files = new Map([["Pilot__results__v04.xlsx.partial-v04", { size: 10 }]]);
const fakeDirectory = {
  async getFileHandle(filename, { create }) {
    if (!files.has(filename)) {
      if (!create) { const error = new Error("missing"); error.name = "NotFoundError"; throw error; }
      files.set(filename, { size: 0 });
    }
    return {
      async move(target) {
        const value = files.get(filename);
        files.delete(filename);
        files.set(target, value);
      }
    };
  }
};
const fakeExists = async (_directory, filename) => files.has(filename);
const abandoned = [];
let persistenceAttempts = 0;
const writeCheckpoint = async (_directory, filename) => {
  persistenceAttempts += 1;
  files.set(filename, { size: persistenceAttempts === 1 ? 0 : 10 });
  if (persistenceAttempts === 1) throw new Error(`PERSISTENCE_VERIFICATION_FAILED: '${filename}' was zero bytes.`);
  return filename;
};
await assert.rejects(() => checkpoint.persistDirectoryCheckpoint({
  directoryHandle: fakeDirectory,
  filename: "Pilot__results__v04.xlsx",
  version: 4,
  blob: { size: 10 },
  writeNewFile: writeCheckpoint,
  fileExists: fakeExists,
  onAbandoned: async (record) => abandoned.push(record)
}), /PERSISTENCE_VERIFICATION_FAILED/);
assert.equal(files.has("Pilot__results__v04.xlsx"), false, "failed checkpoint name is freed for a same-version retry");
assert.equal(files.has("Pilot__results__v04.xlsx.partial-v04-01"), true, "partial collision is probed without overwrite");
assert.equal(files.get("Pilot__results__v04.xlsx.partial-v04").size, 10, "pre-existing partial evidence is untouched");
assert.equal(abandoned[0].abandoned_filename, "Pilot__results__v04.xlsx.partial-v04-01");
assert.equal(abandoned[0].version, 4, "audit callback receives the abandoned version");
assert.equal(checkpoint.parse(pattern, abandoned[0].abandoned_filename), null, "partial filename is never recognized as a checkpoint");
const retried = await checkpoint.persistDirectoryCheckpoint({
  directoryHandle: fakeDirectory,
  filename: "Pilot__results__v04.xlsx",
  version: 4,
  blob: { size: 10 },
  writeNewFile: writeCheckpoint,
  fileExists: fakeExists
});
assert.equal(retried, "Pilot__results__v04.xlsx", "retry succeeds at the same checkpoint version");
const resumeCandidates = [...files.keys()].map((name) => checkpoint.parse(pattern, name)).filter(Boolean);
assert.deepEqual(plain(resumeCandidates.map((item) => item.filename)), ["Pilot__results__v04.xlsx"], "resume scan ignores quarantined partial files");

/* Bounded checkpoint retention — Đức 2026-08-28, after a live trial left 10
   Result checkpoints behind for 3 jobs (a 66-job pilot would leave ~200).
   Deleting an operator's file is normally forbidden, so every rule that keeps
   this bounded AND safe is pinned here rather than trusted to review. */
const versions = (list) => Array.from(list, (item) => item.version);
const cp = (version) => ({ version, filename: checkpoint.render(pattern, version) });
const ten = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(cp);

// The newest is the recoverable ledger: scanProfileCheckpoints() opens exactly
// highest() and nothing else. It must never appear in a prune list.
assert.deepEqual(versions(checkpoint.prunable(ten, { keep: 2 })), [8, 7, 6, 5, 4, 3, 2, 1], "everything below the newest two is prunable");
assert.equal(Array.from(checkpoint.prunable(ten, { keep: 2 })).some((item) => item.version === 10), false, "the newest checkpoint is never prunable");
assert.equal(Array.from(checkpoint.prunable(ten, { keep: 1 })).some((item) => item.version === 10), false, "the newest survives even at the minimum retention");
assert.deepEqual(versions(checkpoint.prunable(ten, { keep: 1 })), [9, 8, 7, 6, 5, 4, 3, 2, 1]);

// Disk must never pass through a moment holding nothing.
assert.deepEqual(versions(checkpoint.prunable([], { keep: 2 })), [], "an empty folder prunes nothing");
assert.deepEqual(versions(checkpoint.prunable([cp(1)], { keep: 2 })), [], "a lone checkpoint is never deleted");
assert.deepEqual(versions(checkpoint.prunable([cp(1), cp(2)], { keep: 2 })), [], "exactly the retained count prunes nothing");
assert.deepEqual(versions(checkpoint.prunable([cp(1), cp(2), cp(3)], { keep: 2 })), [1], "the first surplus prunes the oldest only");

// Retention below 1 would delete the authoritative ledger. Clamp, never obey.
for (const bad of [0, -5, "0", null, undefined, NaN, "abc"]) {
  assert.equal(Array.from(checkpoint.prunable(ten, { keep: bad })).some((item) => item.version === 10), false, `keep=${String(bad)} must not endanger the newest checkpoint`);
}
assert.deepEqual(versions(checkpoint.prunable(ten, {})), [8, 7, 6, 5, 4, 3, 2, 1], "the default retention is 2");

// Order of discovery is a filesystem accident and must not decide what dies.
assert.deepEqual(versions(checkpoint.prunable([cp(3), cp(10), cp(1)], { keep: 2 })), [1], "shuffled input still prunes by version, not by listing order");

/* The one case where deleting is genuinely unsafe. 'v2' and 'v02' both parse to
   version 2, so which file is newest is ambiguous; highest() tie-breaks on
   filename and can pick the OLDER one. A wrong delete here is unrecoverable,
   so prune must refuse entirely and let the existing resume blocker speak. */
const ambiguous = [...ten, { version: 10, filename: "Pilot__results__v010.xlsx" }];
assert.ok(checkpoint.versionCollisions(ambiguous).length, "the fixture really is ambiguous");
assert.deepEqual(versions(checkpoint.prunable(ambiguous, { keep: 2 })), [], "an ambiguous version set is never pruned at all");

// Malformed rows are ignored rather than deleted on a guess.
assert.deepEqual(versions(checkpoint.prunable([cp(1), cp(2), cp(3), { version: 0, filename: "x" }, { filename: "no-version" }, null], { keep: 2 })), [1]);

/* Recovering this run's checkpoints from Chrome's download records after a
   side-panel reopen. The regex decides what a cleanup is allowed to touch, so
   what it must NOT match matters more than what it does. */
const searchExpression = checkpoint.filenameRegex(pattern);
const matches = (name) => new RegExp(searchExpression, "i").test(name);
assert.ok(matches("C:\\Users\\x\\Downloads\\Duc Auto ChatGPT\\Pilot__results__v07.xlsx"), "matches this run's checkpoint at any folder depth");
assert.ok(matches("Pilot__results__v007.xlsx"), "legacy three-digit checkpoints are still reachable for cleanup");
assert.equal(matches("Pilot__audit.jsonl"), false, "the audit log is never a cleanup target");
assert.equal(matches("Pilot.xlsx"), false, "the operator's source workbook is never a cleanup target");
assert.equal(matches("OtherRun__results__v07.xlsx"), false, "another run's checkpoints are out of reach");
assert.equal(matches("Pilot__results__v07.xlsx.partial-v07"), false, "quarantined partial evidence is never deleted");
assert.equal(matches("Pilot__results__v7.xlsx"), false, "a single digit is not a checkpoint name");
assert.equal(checkpoint.filenameRegex("no-version-token.xlsx"), "", "a pattern without {version} yields no search at all");

// A workbook name may legally contain regex metacharacters, and this string is
// handed to chrome.downloads.search() where everything it matches becomes a
// deletion candidate. Unescaped, '.' would act as a wildcard and '(1)' as a
// capture group, widening the search well past the intended file.
const metaPattern = "Pilot (1).v{version}.xlsx";
const metaRegex = new RegExp(checkpoint.filenameRegex(metaPattern), "i");
assert.ok(metaRegex.test("Pilot (1).v03.xlsx"), "the real name still matches");
assert.equal(metaRegex.test("Pilot X1YvZ03Wxlsx"), false, "a metacharacter must never act as a wildcard");
assert.equal(metaRegex.test("Pilot (1)Xv03Yxlsx"), false, "dots are literal, not any-character");

/* Independent audit 2026-08-28 returned REJECT on the first retention build.
   Each assertion below is one confirmed data-loss scenario it found. */

// AUDIT F-2. versionCollisions() de-duplicates by filename, so two IDENTICAL
// entries reported no ambiguity at all. The duplicates then inflated the count
// past `keep` and pushed the newest file into the delete list: three copies of
// a lone checkpoint deleted the only ledger on disk.
const triple = [cp(5), cp(5), cp(5)];
assert.equal(Array.from(checkpoint.versionCollisions(triple)).length, 0, "identical entries are not a version collision");
assert.deepEqual(versions(checkpoint.prunable(triple, { keep: 2 })), [], "duplicate entries can never delete the only checkpoint");
assert.deepEqual(versions(checkpoint.prunable([cp(5), cp(5), cp(5), cp(4)], { keep: 2 })), [], "de-duplication happens before the retention count");
assert.deepEqual(versions(checkpoint.prunable([cp(3), cp(3), cp(2), cp(1)], { keep: 2 })), [1], "duplicates collapse to one and only genuine surplus is pruned");

// AUDIT F-5. The old hostile-`keep` loop passed by luck: with 10 candidates an
// unclamped slice(-5) happens to spare the newest. Magnitudes that actually
// reach past the end are what prove the clamp is load-bearing.
for (const bad of [-10, -20, -1e9, -(ten.length)]) {
  assert.equal(Array.from(checkpoint.prunable(ten, { keep: bad })).some((item) => item.version === 10), false, `keep=${bad} must not reach the newest checkpoint`);
}
// Surviving is not enough: a negative `keep` must be CLAMPED to 1, not passed
// to slice() where it silently counts from the end. Unclamped, keep=-3 prunes
// three files instead of nine, so the count is what pins the clamp itself.
assert.deepEqual(versions(checkpoint.prunable(ten, { keep: -3 })), [9, 8, 7, 6, 5, 4, 3, 2, 1], "a negative retention clamps to 1, it does not slice from the end");

// AUDIT F-8. prunable() is exported as a general helper and its output goes
// straight to a delete call, so it must refuse anything carrying a path.
// Each hostile row needs its OWN version: give two of them the same version and
// the ambiguity guard refuses everything, so the path filter is never reached
// and the test proves nothing. That mistake made this assertion vacuous once.
const hostile = [cp(5), cp(4), { version: 3, filename: "../../boom.xlsx" }, { version: 2, filename: "sub/dir/x.xlsx" }, cp(1), { version: 6, filename: 0 }, { version: 7, filename: "   " }, { version: 8, filename: ".." }, { version: 9, filename: "." }];
assert.equal(Array.from(checkpoint.versionCollisions(hostile)).length, 0, "the hostile fixture must not be swallowed by the ambiguity guard");
const hostileTargets = Array.from(checkpoint.prunable(hostile, { keep: 1 }), (item) => item.filename);
assert.deepEqual(hostileTargets, ["Pilot__results__v04.xlsx", "Pilot__results__v01.xlsx"], "only real bare-leaf checkpoints are ever deletion targets");
for (const name of hostileTargets) {
  assert.equal(/[\\/]/.test(name), false, `a deletion target may never contain a path separator: ${name}`);
  assert.equal(typeof name === "string" && name.trim().length > 0, true, "a deletion target is always a non-empty string");
}

// AUDIT F-4. Without a leading anchor the search regex matched a DIFFERENT
// workbook whose name merely ends with this one, and files in other folders.
assert.equal(matches("Final-Pilot__results__v07.xlsx"), false, "a workbook whose name merely ends with ours is out of reach");
assert.equal(matches("xPilot__results__v07.xlsx"), false, "a longer sibling name is out of reach");
assert.ok(matches("Downloads/Duc Auto ChatGPT/Pilot__results__v07.xlsx"), "our own file is still reachable behind a folder");
assert.ok(matches("Pilot__results__v07.xlsx"), "our own file is reachable with no folder at all");

/* RE-AUDIT 2026-08-28 (N-1). The folder scoping was a string-suffix test, and
   it survived TWO reviews because it lived inside sidepanel.js's IIFE where no
   test could reach it. It accepted a folder whose name merely ends with ours,
   and a NESTED folder of the same name -- deleting another run's only ledger.
   Both the broken version and the reviewer's proposed one-line fix pass the
   first case below and fail the third, which is why this is now a pure
   function with a table instead of a line of reasoning. */
const anchor = "C:\\Users\\x\\Downloads\\Duc Auto ChatGPT\\Pilot__results__v11.xlsx";
assert.equal(checkpoint.sameFolder(anchor, "C:\\Users\\x\\Downloads\\Duc Auto ChatGPT\\Pilot__results__v03.xlsx"), true, "our own folder is in scope");
assert.equal(checkpoint.sameFolder(anchor, "C:/Users/x/Downloads/Duc Auto ChatGPT/Pilot__results__v03.xlsx"), true, "separator style does not change identity");
assert.equal(checkpoint.sameFolder(anchor, "C:\\Users\\x\\Downloads\\duc auto chatgpt\\Pilot__results__v03.xlsx"), true, "Windows paths are case-insensitive, so cleanup must not silently stop");
assert.equal(checkpoint.sameFolder("C:\\D\\ChatGPT\\a__results__v11.xlsx", "C:\\D\\Duc Auto ChatGPT\\a__results__v03.xlsx"), false, "a folder whose name merely ends with ours is out of scope");
assert.equal(checkpoint.sameFolder("C:\\D\\Reports\\a__results__v11.xlsx", "C:\\D\\Archive\\Reports\\a__results__v03.xlsx"), false, "a nested folder of the same name is out of scope");
assert.equal(checkpoint.sameFolder("C:\\D\\Reports\\a__results__v11.xlsx", "C:\\D\\MyReports\\a__results__v03.xlsx"), false, "a glued-on prefix is out of scope");
assert.equal(checkpoint.sameFolder(anchor, "C:\\Users\\x\\Downloads\\Other\\Pilot__results__v03.xlsx"), false, "an unrelated folder is out of scope");
assert.equal(checkpoint.sameFolder("", "C:\\D\\x\\a.xlsx"), false, "no anchor means nothing is in scope");
assert.equal(checkpoint.sameFolder("bare-leaf.xlsx", "bare-leaf.xlsx"), false, "an anchor with no directory can never authorise a delete");

/* RE-AUDIT: the "may I delete at all?" guard, now pure. This is the rule that
   stops a rerun into an occupied folder from deleting the checkpoint it just
   wrote and verified. */
const occupied = [cp(9), cp(10), cp(1)];
assert.equal(checkpoint.pruneTargets(occupied, cp(1), { keep: 2 }).ok, false, "a rerun restarting at v01 beside an older run deletes nothing");
assert.deepEqual(versions(checkpoint.pruneTargets(occupied, cp(1), { keep: 2 }).stale), [], "and returns no targets at all");
assert.equal(checkpoint.pruneTargets(occupied, cp(10), { keep: 2 }).ok, true, "the run that owns the newest checkpoint may prune");
assert.deepEqual(versions(checkpoint.pruneTargets(occupied, cp(10), { keep: 2 }).stale), [1], "and prunes only the genuine surplus");
assert.equal(checkpoint.pruneTargets(ten, null, { keep: 2 }).ok, false, "no just-written checkpoint means no deletion");
assert.equal(checkpoint.pruneTargets([], cp(1), { keep: 2 }).ok, false, "an empty destination deletes nothing");
assert.equal(checkpoint.pruneTargets(ten, { version: 10, filename: "Someone-Else__results__v10.xlsx" }, { keep: 2 }).ok, false, "matching only the version number is not identity");
// Mixed-width debris at the top version must stop this before prunable is even
// consulted: highest() returns v010, which is not what we wrote.
assert.equal(checkpoint.pruneTargets([...ten, { version: 10, filename: "Pilot__results__v010.xlsx" }], cp(10), { keep: 2 }).ok, false, "ambiguity at the newest version blocks the whole decision");

/* PILOT-15, 2026-08-28, LIVE FAILURE. This is the scenario that deleted a real
   file on Đức's machine, reproduced exactly.

   The run wrote v01 to folder A, then output.configure moved the destination to
   folder B, where v02..v05 were written. History carried only filenames, so the
   two folders became indistinguishable and pruning reached back into folder A.

   Three passes of static audit called this "inside the contract" and I wrote
   that into HANDOFF.md. It is not: deletion reached a folder that was not the
   configured destination, and the audit trail never said so. Scoping therefore
   happens at DELETE time, against the checkpoint just written -- never against
   whatever the destination was when the history was first built. */
const folderA = "C:\\Users\\x\\Downloads\\Phai sinh\\Duc Auto ChatGPT\\";
const folderB = "C:\\Users\\x\\Downloads\\Phai sinh\\DucAuto_GPT-Output\\Pilot-15\\";
const at = (folder, version) => ({ version, filename: checkpoint.render(pattern, version), path: folder + checkpoint.render(pattern, version) });
const mixedHistory = [at(folderA, 1), at(folderB, 2), at(folderB, 3), at(folderB, 4), at(folderB, 5)];
const justWrittenB = at(folderB, 5);

const inScope = checkpoint.scopedTo(mixedHistory, justWrittenB.path);
assert.deepEqual(versions(inScope), [2, 3, 4, 5], "only the folder just written to is in scope");
assert.equal(Array.from(inScope).some((item) => item.path.startsWith(folderA)), false, "the previous destination is never a deletion candidate");

const live = checkpoint.pruneTargets(inScope, justWrittenB, { keep: 2 });
assert.equal(live.ok, true, "the run may still prune its own current folder");
assert.deepEqual(versions(live.stale), [3, 2], "it prunes only its own older checkpoints in that folder");
assert.equal(Array.from(live.stale).some((item) => item.version === 1), false, "the file in the other folder survives -- this is the exact live failure");

// Scoping must be the thing that decides, not the ordering or the count.
assert.deepEqual(versions(checkpoint.scopedTo(mixedHistory, at(folderA, 1).path)), [1], "anchoring on folder A scopes to folder A alone");
assert.deepEqual(versions(checkpoint.scopedTo(mixedHistory, "")), [], "no anchor means nothing may be deleted");
assert.deepEqual(versions(checkpoint.scopedTo([{ version: 1, filename: "x__results__v01.xlsx" }], folderB + "y.xlsx")), [], "an entry with no recorded path is out of scope, never a guess");
assert.deepEqual(versions(checkpoint.scopedTo([null, undefined, { version: 2 }], folderB + "y.xlsx")), [], "malformed rows are dropped rather than deleted");

// AUDIT: `checkpoint_retention` was referenced nowhere in tests/, so its
// default, its range, and its acceptance as an XLSX config key were all
// unpinned. A retention that silently defaulted to 0 or accepted a stray value
// is the one config mistake that deletes files.
const runner = context.DacRunnerCore;
assert.equal(runner.config({}).checkpoint_retention, 2, "retention defaults to keeping two checkpoints");
assert.equal(runner.config({ checkpoint_retention: "5" }).checkpoint_retention, 5, "a numeric string from XLSX is accepted");
assert.equal(runner.config({ checkpoint_retention: 1 }).checkpoint_retention, 1, "the minimum keeps the newest only");
for (const bad of [0, -1, 1001, 1.5, "abc"]) {
  assert.throws(() => runner.config({ checkpoint_retention: bad }), /checkpoint_retention/, `retention '${bad}' must be rejected, never coerced`);
}

console.log("checkpoint protocol smoke tests: PASS");
