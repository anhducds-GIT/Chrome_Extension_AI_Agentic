import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../content.js", import.meta.url), "utf8");

assert.match(source, /if \(expectImage\) \{/);
assert.match(source, /const evaluated = imageDecision\(boundary, inputEvidence\)/);
assert.match(source, /completionForImage\(decision, \{ generationControlVisible: Boolean\(stopButton\) \}\)/);
assert.match(source, /if \(imageCompletion\.ok\)/);
assert.match(source, /stop_visible: Boolean\(stopButton\)/);
assert.match(source, /OUTPUT_DETECTION_TIMEOUT/);
assert.match(source, /captureBoundary\(inputEvidence\)/);
assert.match(source, /boundary: attempt\.boundary/);
assert.match(source, /attemptSnapshot\(STATE\.activeAttempt\)/, "reconciliation returns the owned active attempt telemetry");
assert.ok(
  source.indexOf("if (expectImage)") < source.indexOf("if (text === stableText)"),
  "image-only completion must precede the text-stability condition"
);
assert.match(source, /reason: imageCompletion\.reason/);
assert.match(source, /DAC_WAIT_CHAT_READY/, "next-job readiness remains independent after image persistence");
assert.match(source, /data:image\\\//);
assert.match(source, /HARD_STOP: \$\{blocker\}/);
assert.match(source, /if \(text === stableText\) \{/);
assert.match(source, /type: "text"/);
assert.match(source, /async function waitForReferenceImagesReady/);
assert.match(source, /previewsReady && !uploadIsPending\(\)/);
assert.doesNotMatch(source, /await sleep\(750\)/);
assert.match(source, /runPrompt\(prompt, timeoutMs\)/);
assert.match(source, /DAC_WAIT_CHAT_READY/);
assert.match(source, /MutationObserver/);
assert.match(source, /waitForChatReady/);
assert.match(source, /activeAttempt/);
assert.match(source, /phase = "SUBMITTED"/);
assert.match(source, /DAC_RECONCILE_IMAGE_JOB/);
assert.match(source, /reconcileImageAttempt/);
assert.match(source, /DacAttemptIdentity\.create/);
assert.match(source, /ATTEMPT_ID_MISMATCH/);
assert.match(source, /attemptSnapshot\(requestAttempt\)/);

console.log("content image static checks: PASS");
