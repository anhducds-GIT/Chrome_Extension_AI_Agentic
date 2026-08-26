/* Two defects found by the FIRST full autonomous trial (trial-6e73dad2,
   2026-08-26, 2/2 SUCCESS). Both are about the gap between what the runner
   says it did with a file and what actually happened on disk.

   B-13a -- the images ignored the configured folder.
     output.configure {output_downloads_subfolder: "…/Pilot-11_BoundTab"}
     steered the checkpoints and the audit correctly, and the IMAGES went to
     Downloads\Duc Auto ChatGPT\ instead. imageLocationFor() overrode the
     correctly-built effectiveOutput.image with item.settings.output_folder,
     which carries the runner DEFAULT when nobody asked for anything. That
     silently defeats the agent-settable output location -- the whole reason
     the folder click was taken out of the autonomous loop.

   B-13b -- every Downloads image was reported as "uniquified".
     background.js compared Chrome's ABSOLUTE item.filename against the
     Downloads-RELATIVE requestedFilename. Those can never be equal, so the
     "written" branch was unreachable and the ledger told the operator that a
     file of that name already existed and theirs had been renamed around it.
     On Pilot-11, Q001.png sat on disk under exactly the requested name while
     the ledger said uniquified. Under the default uniquify policy this
     distinction is the entire answer to "did anything of mine get shadowed?",
     so it has to be true. */
import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("../", import.meta.url);
const read = (name) => fs.readFileSync(new URL(name, root), "utf8");
const sidepanel = read("sidepanel.js");
const background = read("background.js");

/* ---- B-13b: the two questions, kept apart, executed -------------------- */

const helpers = background.slice(background.indexOf("function downloadLeaf"), background.indexOf("async function downloadGeneratedImage"));
const downloadLeaf = new Function(`${helpers}; return downloadLeaf;`)();
const pathTailMatches = new Function(`${helpers}; return pathTailMatches;`)();

const BS = String.fromCharCode(92);
const win = (...parts) => parts.join(BS);
// Mirrors background.js exactly. "overwritten" is not reachable on this path.
const outcome = (actual, requested) => downloadLeaf(actual) === downloadLeaf(requested) ? "written" : "uniquified";

/* write_outcome answers ONE question: was the file renamed to dodge a
   collision? chrome.downloads' conflictAction only ever alters the LEAF, so
   the leaf is the whole signal. */

// The exact shape seen live on 2026-08-26 (Pilot-11): a Windows absolute path
// against a Downloads-relative request. This used to be unreachable.
assert.equal(outcome(win("C:", "Users", "MAYTEST_12", "Downloads", "Duc Auto ChatGPT", "Q001.png"), "Duc Auto ChatGPT/Q001.png"), "written");
assert.equal(outcome(win("C:", "U", "Downloads", "P", "Q001 (1).png"), "P/Q001.png"), "uniquified", "Chrome's (1) rename shape");
assert.equal(outcome(win("C:", "U", "Downloads", "P", "Q001__attempt-01.png"), "P/Q001.png"), "uniquified", "the uniquify suffix shape");
assert.equal(outcome("/home/x/Downloads/P/Q001.png", "P/Q001.png"), "written", "POSIX separators");
// A folder with spaces must not confuse the split.
assert.equal(downloadLeaf(win("C:", "U", "Downloads", "Duc Auto ChatGPT", "Q001.png")), "Q001.png");
assert.equal(downloadLeaf(""), "");
assert.equal(downloadLeaf(null), "");
// Compared EXACTLY, including case: any difference at all is reported as the
// conservative answer rather than claiming a clean write we did not observe.
assert.equal(outcome(win("C:", "D", "P", "q001.PNG"), "P/Q001.png"), "uniquified");
// A different FOLDER is not a collision -- conflictAction cannot move a file.
// That fact belongs to landed_as_requested, below, not to write_outcome.
assert.equal(outcome(win("C:", "U", "Downloads", "Elsewhere", "Q001.png"), "P/Q001.png"), "written");

/* landed_as_requested answers the OTHER question: did it go where we asked?
   Declared as a textual tail check, because chrome.downloads gives no
   Downloads-root oracle -- so it claims exactly what it measures. */

assert.equal(pathTailMatches(win("C:", "U", "Downloads", "DucAuto_GPT-Output", "Pilot-11_BoundTab", "Q001.png"), "DucAuto_GPT-Output/Pilot-11_BoundTab/Q001.png"), true, "a nested configured subfolder matches");
assert.equal(pathTailMatches(win("C:", "U", "Downloads", "Duc Auto ChatGPT", "Q001.png"), "DucAuto_GPT-Output/Pilot-11_BoundTab/Q001.png"), false, "the Pilot-11 defect: right leaf, wrong folder");
assert.equal(pathTailMatches(win("C:", "Downloads", "NotP", "Q001.png"), "P/Q001.png"), false, "a folder that merely ends with the requested name is not it");
assert.equal(pathTailMatches("/home/x/Downloads/P/Q001.png", "P/Q001.png"), true);
// Case-folded on purpose: this extension runs on Windows.
assert.equal(pathTailMatches(win("C:", "U", "Downloads", "DUC AUTO CHATGPT", "q001.PNG"), "Duc Auto ChatGPT/Q001.png"), true);
// Empty inputs never claim success.
assert.equal(pathTailMatches("", "P/Q001.png"), false);
assert.equal(pathTailMatches(win("C:", "D", "Q001.png"), ""), false);
assert.equal(pathTailMatches(null, null), false);

/* The two facts stay separate, and neither overclaims. */

const outcomeExpr = background.slice(background.indexOf("const writeOutcome ="), background.indexOf("function safeRequestedFilename"));
// "overwritten" must not be manufactured. A completed download under
// conflictAction:"overwrite" proves Chrome was ALLOWED to replace a file, not
// that one existed to replace -- reporting a first-ever write as having
// destroyed prior operator evidence is the same lie pointed the other way.
// The directory writer probes before writing and may say "overwritten"; this
// path cannot probe, so it never says it.
assert.doesNotMatch(outcomeExpr, /"overwritten"/, "the Downloads path never claims an overwrite it cannot prove");
assert.match(outcomeExpr, /downloadLeaf\(item\.filename\) === downloadLeaf\(requestedFilename\)/, "write_outcome is decided by the leaf alone");
assert.match(outcomeExpr, /landed_as_requested: pathTailMatches\(item\.filename, requestedFilename\)/, "routing is reported as its own field");
assert.match(background, /collision_policy: collisionPolicy/, "what was ASKED FOR stays visible separately from what happened");
assert.doesNotMatch(background, /item\.filename === requestedFilename/, "the unreachable whole-path comparison is gone");
// The side panel actually surfaces it, or the field would be dead weight.
assert.match(sidepanel, /landedAsRequested\.push\(/);
assert.match(sidepanel, /landed_as_requested=\$\{landedAsRequested\.join\(" \| "\)\}/, "the audit row carries it next to write_outcome");

/* ---- B-13a: images follow the run's configured location ---------------- */

const fn = sidepanel.slice(sidepanel.indexOf("function imageLocationFor(item, effectiveOutput)"), sidepanel.indexOf("function messageOf(error)"));
assert.ok(fn.length > 100 && fn.length < 1200, "imageLocationFor is where this test expects it");

// A non-Downloads destination (an authorised directory handle) is untouched.
assert.match(fn, /if \(effectiveOutput\.image\.kind !== "downloads"\) return effectiveOutput\.image;/);
// The per-job override is read from the RAW ROW, because only the row can tell
// "this job asked for a folder" apart from "this job inherited the default".
assert.match(sidepanel, /function jobSetItsOwnFolder\(item\)/);
// Mirrors runner-core perJobSettings() exactly so the two cannot drift apart
// about what counts as an override.
assert.match(sidepanel, /return value !== undefined && value !== "";/);
assert.match(fn, /if \(!jobSetItsOwnFolder\(item\)\) return effectiveOutput\.image;/, "no per-job folder means the run's configured location wins");
// A job that DID name its own folder still gets it -- runner-core treats
// output_folder as a per-job override and that feature must keep working.
assert.match(fn, /return window\.DacOutputLocation\.downloadsLocation\(item\.settings\.output_folder\);/);
// The old unconditional override must not come back.
assert.doesNotMatch(
  fn,
  /return effectiveOutput\.image\.kind === "downloads" \? window\.DacOutputLocation\.downloadsLocation/,
  "the unconditional override is what sent Pilot-11's images to the wrong folder"
);
// Order matters: the early return for "no per-job folder" has to come before
// the override, or the fix is inert.
assert.ok(
  fn.indexOf("if (!jobSetItsOwnFolder(item)) return effectiveOutput.image;") < fn.indexOf("downloadsLocation(item.settings.output_folder)"),
  "the configured location is returned before the per-job override is considered"
);

console.log("output routing static checks: PASS");
