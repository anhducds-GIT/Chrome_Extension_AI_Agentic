/* Pins the Gemini content-script run flow: same DAC_* contract the side panel
   already speaks, ChatGPT-proven detection cores untouched, plus the ported
   v0.1.0 Gemini mechanics (stage/confirm attachment split, addedSince arrival
   model, transient file input, synthetic-drop fallback, blob->dataURL guard). */
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../content.js", import.meta.url), "utf8");

/* ---- image completion still runs through the shared evidence core -------- */
assert.match(source, /if \(expectImage\) \{/);
assert.match(source, /const evaluated = imageDecision\(boundary, inputEvidence\)/);
assert.match(source, /completionForImage\(decision, \{ generationControlVisible: generating \}\)/);
// Gemini pin: completion requires the attributable image AND every generating
// signal (stop button, chat-window busy, thinking animation) to have cleared.
assert.match(source, /if \(imageCompletion\.ok && !generating\)/);
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

/* ---- new-turn attribution uses model-response container identity ---------- */
assert.match(source, /assistant_keys: assistants\.map\(responseKey\)/, "the boundary records container keys");
assert.match(source, /const known = new Set\(boundary\?\.assistant_keys \|\| \[\]\)/, "new turns are container-identity, not fingerprint, based (the container appears before its image)");
assert.match(source, /outputCandidates\(document, inputEvidence\)/, "output attribution only ever sees verified generated-image candidates");
assert.match(source, /candidate\.generated\)/, "candidates are filtered to the generated-image acceptance rule");

/* ---- attachment flow: stage -> type -> confirm -> send (order pinned) ----- */
assert.match(source, /async function stageReferences/);
assert.match(source, /async function confirmReferences/);
assert.match(source, /DECISIONS\.exposeFileInput\(/, "the transient-input state machine is the ported v0.1.0 core");
assert.match(source, /DECISIONS\.addedSince\(staged\.before, attachmentNodes\(scope\)\)/, "attachment arrival counts unique NEW nodes, never summed selector totals");
assert.match(source, /DECISIONS\.attachmentReady\(0, staged\.expected/, "confirmation uses the ported attachmentReady rule");
assert.match(source, /ATTACHMENT_NOT_READY \$\{JSON\.stringify\(attachmentFingerprint\(/, "a failed confirm carries the DOM-shape fingerprint diagnostic");
assert.match(source, /ATTACH_TARGET_MISSING \$\{JSON\.stringify\(attachmentFingerprint\(/, "the drop fallback is instrumented with the same fingerprint diagnostic");
assert.match(source, /SYNTHETIC_DROP/, "the synthetic DataTransfer drop fallback exists");
assert.match(source, /FILE_INPUT_NOT_EXPOSED/, "the 3s transient-input wait budget can hand over to the fallback");
assert.match(source, /dispatchSyntheticDrop\(target, transfer\)/);
assert.match(source, /closeUploadMenu\(\)/, "the CDK overlay menu is closed (Escape) before typing continues");
assert.match(source, /new KeyboardEvent\("keydown", init\)/);
const stageAt = source.indexOf("const staged = await stageReferences(referenceImages);");
const typeAt = source.indexOf("setComposerText(composer, prompt);");
const confirmAt = source.indexOf("await confirmReferences(staged);");
const sendAt = source.indexOf("await DECISIONS.clickSend(");
for (const [label, index] of [["stage", stageAt], ["type", typeAt], ["confirm", confirmAt], ["send", sendAt]]) {
  assert.ok(index > -1, `runPrompt contains the ${label} step`);
}
assert.ok(stageAt < typeAt && typeAt < confirmAt && confirmAt < sendAt, "order pinned: attach-stage -> type prompt -> confirm attachment -> send");
assert.ok(confirmAt < source.indexOf("const boundary = captureBoundary(inputEvidence);"), "the pre-send boundary is captured only after the attachment is confirmed");

/* ---- submit-once: exactly one guarded Send click --------------------------- */
assert.equal([...source.matchAll(/sendButton\.click\(\)/g)].length, 1, "exactly one Send click site exists");
assert.match(source, /await DECISIONS\.clickSend\(\{ snapshot: blockerSnapshot, click: \(\) => sendButton\.click\(\) \}\)/, "the one Send click is blocker-guarded (fail-closed)");
assert.match(source, /STATE\.submittedInThisTab = true/, "the post-submit surface rule flips only after the real click");

/* ---- Quill composer typing (ported v0.1.0 setComposerText) ---------------- */
assert.match(source, /document\.execCommand\("insertText", false, text\)/);
assert.match(source, /target\.textContent = text/, "the textContent+InputEvent fallback survives");
assert.doesNotMatch(source, /await sleep\(750\)/);

/* ---- blob->dataURL guard ---------------------------------------------------- */
assert.match(source, /async function downloadableUrl/);
assert.match(source, /startsWith\("blob:"\)/, "blob: results are converted before background download (input previews ARE blob:)");
assert.match(source, /readAsDataURL\(blob\)/);
assert.match(source, /image_url: await downloadableUrl\(decision\.candidate\.source\)/);

/* ---- DAC contract endpoints stay byte-compatible --------------------------- */
assert.match(source, /runPrompt\(prompt, timeoutMs\)/);
assert.match(source, /MutationObserver/);
assert.match(source, /waitForChatReady/);
assert.match(source, /activeAttempt/);
assert.match(source, /phase = "SUBMITTED"/);
assert.match(source, /DAC_RECONCILE_IMAGE_JOB/);
assert.match(source, /DAC_MANUAL_RECONCILE_EXISTING_OUTPUT/);
assert.match(source, /inspectPersistedImage/);
assert.match(source, /matchesRequest\(proof, message\)/);
assert.match(source, /reconcileImageAttempt/);
assert.match(source, /DacAttemptIdentity\.create/);
assert.match(source, /ATTEMPT_ID_MISMATCH/);
assert.match(source, /attemptSnapshot\(requestAttempt\)/);
assert.match(source, /assistantCount: assistantMessages\(\)\.length/, "DAC_PING assistantCount is the model-response count");
assert.match(source, /sendButtonFound: Boolean\(sendButton\)/, "DAC_PING still reports sendButtonFound (false on an empty composer is normal on Gemini)");

/* ---- surface rule wired into readiness and runPrompt ------------------------ */
assert.match(source, /ADAPTER\.surfaceAllowed\(location\.href, \{ submittedInThisTab: STATE\.submittedInThisTab \}\)/);
assert.match(source, /WRONG_SURFACE/, "a wrong surface fails closed before any DOM interaction");
assert.equal([...source.matchAll(/surfaceAllowedNow\(\)/g)].length >= 3, true, "runPrompt and both waitForChatReady readiness reads check the surface rule");

console.log("content image static checks: PASS");

// Review F1/F3/F6 pins (adversarial pre-pilot review, 2026-08-25).
assert.match(source, /composerFound: Boolean\(composer\) && surfaceAllowedNow\(\)/, "F1: DAC_PING composerFound is gated on the surface rule so Check Plan cannot pass on an unsubmitted /app tab");
const closeMenuBody = source.slice(source.indexOf("function closeUploadMenu()"), source.indexOf("async function buildTransfer"));
assert.match(closeMenuBody, /document\.body \|\| document\.documentElement/, "F3: Escape is dispatched on document.body where the CDK OverlayKeyboardDispatcher listens");
assert.ok(!/target\s*=\s*document\s*;/.test(closeMenuBody) && closeMenuBody.includes("target.dispatchEvent"), "F3: the dispatch target is body, not document");
assert.match(source, /findMenuItem: \(\) => null/, "F6: the menu-item click step is disabled — clicking the Files row opens a native OS picker automation cannot dismiss");
console.log("content F-fix pins: PASS");

// Pilot G2-0 regression (2026-08-25): the freemium quota disclaimer exists as
// an empty hidden placeholder in the /app DOM after any generation — mere
// existence must never be treated as a quota wall.
const quotaFn = source.slice(source.indexOf("function quotaAnchorPresent()"), source.indexOf("function generationLimitText()"));
assert.match(quotaFn, /text\.length > 0/, "quota anchor requires non-empty text (placeholder-proof)");
assert.match(quotaFn, /isVisible\(anchor\)/, "quota anchor requires visibility (placeholder-proof)");
assert.ok(!/return Boolean\(document\.querySelector\(ADAPTER\.SELECTORS\.quotaExceededAnchor\)\);/.test(source), "the bare-existence quota check must not return");
console.log("quota placeholder pins: PASS");
