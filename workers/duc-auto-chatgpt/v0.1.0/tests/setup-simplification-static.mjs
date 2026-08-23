/* Feedback: the SETUP screen felt overwhelming for a normal (non-technical)
   operator. Moved the rarely-touched, technical fields behind collapsed
   "advanced" <details> blocks -- timeout/retries/inter-job delay/cooldown
   (workbook config or defaults already cover these for almost every run),
   Save Audit JSONL (a "technical log" toggle, by its own label), the
   AI-review packet export (a dev/reviewer tool, not an operator control),
   and the RUN screen's six-field runtime-information grid (the pipeline
   stepper, timer badge and one-line timing status already cover
   at-a-glance progress). No element was removed -- only re-parented under
   a <summary>, so every id/handler from before still exists and works when
   expanded; this only changes what's visible by default.

   Explicitly NOT hidden: the image filename pattern and collision policy
   stay in the always-visible Naming section. v1-ui-ux-closure-static.mjs
   already protects that as a deliberate prior decision ("Naming is visible
   and no longer hidden inside advanced output details") -- collision
   policy in particular was just made MORE visible (a Check Plan warning)
   after an operator was bitten by a silent overwrite, so folding it back
   into a collapsed section would undo that fix. */
import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../sidepanel.html", import.meta.url), "utf8");

function detailsBlock(marker) {
  const summaryStart = html.indexOf(marker);
  assert.ok(summaryStart > -1, `${marker} exists`);
  const start = html.lastIndexOf("<details", summaryStart);
  const end = html.indexOf("</details>", summaryStart);
  return html.slice(start, end);
}

// Run Settings: the whole numeric grid now lives inside one collapsed block.
const runSettings = detailsBlock("Tuỳ chỉnh nâng cao (timeout, retry, thời gian chờ…)");
for (const id of ["timeoutSecInput", "maxRetriesInput", "delayMinSecInput", "delayMaxSecInput", "safetyCooldownInput", "maxInputImagesInput", "continueOnErrorInput", "rerunDoneInput"]) {
  assert.match(runSettings, new RegExp(`id="${id}"`), `${id} is collapsed into Run Settings advanced`);
}
assert.ok(html.indexOf('id="runtimeSettingsCard"') < html.indexOf("Tuỳ chỉnh nâng cao"), "the card header itself stays outside the collapsed block");

// Save Audit JSONL moved next to its own filename field in the existing
// advanced output/naming block, out of the always-visible save-toggles row.
const outputAdvancedStart = html.indexOf('<details class="secondary-details" id="outputAdvancedDetails">');
const outputAdvancedEnd = html.indexOf("</details>", outputAdvancedStart);
const outputAdvanced = html.slice(outputAdvancedStart, outputAdvancedEnd);
assert.match(outputAdvanced, /id="saveAuditJsonlInput"/, "Save Audit JSONL now lives in the advanced output section");
const saveToggles = html.slice(html.indexOf('class="settings-grid save-toggles"'), html.indexOf('class="settings-grid save-toggles"') + 400);
assert.doesNotMatch(saveToggles, /saveAuditJsonlInput/, "the always-visible save-toggles row no longer carries the technical-log checkbox");

// Naming stays visible -- must NOT regress into the advanced block.
assert.ok(html.indexOf('id="imagePatternInput"') < outputAdvancedStart, "image filename pattern remains in the primary, always-visible Naming section");
assert.ok(html.indexOf('id="collisionPolicyInput"') < outputAdvancedStart, "collision policy remains visible -- it was deliberately made MORE prominent after a silent-overwrite bug, not less");

// Copy for AI Review is a reviewer/dev tool, tucked behind its own advanced toggle.
const reviewPacket = detailsBlock("Nâng cao");
assert.match(reviewPacket, /id="copyReviewPacketBtn"/, "the AI-review packet export is collapsed by default");

// RUN screen: the six-field runtime grid is collapsed; the pipeline stepper,
// timer badge and one-line timing status stay visible outside it.
const runtimeGrid = detailsBlock("Chi tiết vận hành");
for (const id of ["runtimeJobElapsed", "runtimeCurrentOperation", "runtimeTimeoutRemaining", "runtimeRetryState", "runtimeInterJobDelay", "runtimeNextTransition"]) {
  assert.match(runtimeGrid, new RegExp(`id="${id}"`), `${id} is collapsed into Run screen operational details`);
}
assert.ok(html.indexOf('id="pipelineStepper"') < html.indexOf("Chi tiết vận hành"), "the pipeline stepper stays visible outside the collapsed block");
assert.ok(html.indexOf('id="currentTiming"') < html.indexOf("Chi tiết vận hành"), "the one-line timing status stays visible outside the collapsed block");

console.log("setup simplification static tests: PASS");
