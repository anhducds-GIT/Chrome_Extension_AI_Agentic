/* Issue A (NEXT-SESSION-BRIEF): reproduced with pilot-06/v02 as the ledger --
   every job SAFE_COMPLETE, Run showed green "READY TO RUN" and did nothing
   when pressed, because controls() only checked that the workbook/settings
   were prepared and validated, never whether selectQueue("all") actually
   returned any job. Guards that Run now reflects real eligibility instead of
   a static prepared/validated flag, and that a Vietnamese reason is shown
   rather than a silent no-op after a green button. */
import assert from "node:assert/strict";
import fs from "node:fs";

const sidepanel = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../sidepanel.html", import.meta.url), "utf8");

const controlsSegment = sidepanel.slice(sidepanel.indexOf("function controls()"), sidepanel.indexOf("function renderQueue()"));
assert.ok(controlsSegment.length > 0, "controls() is present");
assert.match(controlsSegment, /const eligibleAll = ready \? window\.DacRunnerCore\.selectQueue\(state\.prepared\.queue, "all"\)\.length : 0;/, "Run's eligibility is computed from the real queue, not assumed from prepared/validated");
assert.match(controlsSegment, /els\.runBtn\.disabled = !ready \|\| operatorLocked \|\| eligibleAll === 0;/, "Run is disabled when zero jobs are actually eligible, even while ready");
assert.match(controlsSegment, /els\.runFromRunTabBtn\.disabled = !ready \|\| operatorLocked \|\| eligibleAll === 0;/, "the Run-tab button shares the exact same eligibility gate");
assert.match(sidepanel, /els\.runFromRunTabBtn\?\.addEventListener\("click", \(\) => run\("all"\)\)/, "the Run-tab button invokes the same run path as Setup");
assert.match(controlsSegment, /els\.runEligibilityHint/, "an eligibility hint element is driven by controls()");

// The hint must actually be Vietnamese operator-facing copy, not a raw error code.
const hintMatch = controlsSegment.match(/els\.runEligibilityHint\.textContent = "([^"]+)"/);
assert.ok(hintMatch, "the eligibility hint has literal Vietnamese copy, not a code");
assert.match(hintMatch[1], /[ơưăâêôđ]/i, "the hint reads as Vietnamese operator guidance");

assert.match(html, /id="runEligibilityHint"/, "the eligibility hint has a place to render");
assert.match(html, /id="runScreen"[\s\S]*?id="runFromRunTabBtn"/, "Run exposes a direct start control without returning to Setup");

console.log("run eligibility static tests: PASS");
