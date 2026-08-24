/* Bug report: pilot-06 had P06-D.png and P06-E.png already on disk (from an
   earlier session's continuation), and the ledger itself records both jobs
   as persistence_verified with a result_file. Loading that ledger fresh
   still showed the Output tab's Images row as "0 verified" -- because it
   read `state.verifiedImageFiles`, an array populated only by writes made
   during THIS session's own run. Any loaded/resumed ledger whose jobs are
   already verified showed as undetected, every time, regardless of which
   specific file was loaded. Guards that the count instead comes from the
   queue's own recorded proof, which is correct whether it came from this
   session's writes or from a loaded ledger. */
import assert from "node:assert/strict";
import fs from "node:fs";

const sidepanel = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");

const outputScreenSegment = sidepanel.slice(sidepanel.indexOf("function renderOutputScreen()"), sidepanel.indexOf("function saveGeneratedImage"));
assert.ok(outputScreenSegment.length > 0, "renderOutputScreen() is present");
assert.match(outputScreenSegment, /const imagesSaved = queue\.filter\(\(item\) => item\.persistence_verified && item\.result_file\)\.length;/, "the Images row counts the queue's own recorded persistence proof, not a session-only write log");
assert.doesNotMatch(outputScreenSegment, /const imagesSaved = state\.verifiedImageFiles\.length;/, "the old session-only count must not come back");

console.log("output images verified static tests: PASS");
