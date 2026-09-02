/* Pins F-02: Flow submit/completion path and URL-only video persistence. */
import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("../", import.meta.url);
const content = fs.readFileSync(new URL("content.js", root), "utf8");
const panel = fs.readFileSync(new URL("sidepanel.js", root), "utf8");

assert.match(content, /ADAPTER\.resultKind === "video"/);
assert.match(content, /function captureVideoBoundary\(\)/);
assert.match(content, /document\.querySelectorAll\(ADAPTER\.SELECTORS\.videoSelector\)/);
assert.match(content, /ADAPTER\.videoIdFromSrc\(source\)/);
assert.match(content, /fresh\.length > 1 \? "OUTPUT_AMBIGUOUS"/);
assert.match(content, /candidate_video_ids: fresh\.map/, "all post-boundary candidates are recorded");
assert.match(content, /if \(fresh\.length > 1\)/, "multiple new ids fail instead of guessing");
assert.match(content, /video_id: fresh\[0\]\.id, video_url: fresh\[0\]\.source/, "exactly one new id is claimable");

const runStart = content.indexOf("async function runPrompt(");
const runEnd = content.indexOf("function attemptSnapshot", runStart);
const run = content.slice(runStart, runEnd);
const capture = run.indexOf("captureVideoBoundary()");
const stage = run.indexOf("const staged = await stageReferences(referenceImages);");
const resolve = run.indexOf("const activeComposer = findComposer();");
const type = run.indexOf("typeIntoFlowComposer(activeComposer, prompt)");
// Audit round 3: the composer reference must be taken AFTER every DOM-mutating
// step (mode switch, reference staging) and immediately before typing. Taking
// it earlier can leave it detached across a React remount, which types into
// nothing and then clicks the new form's Create with an empty prompt.
assert.ok(stage > -1 && stage < resolve && resolve < type, "the composer is resolved after staging and immediately before typing");
// Dò theo `waitForSendButtonReady(` chứ không phải `waitForSendButtonReady()`:
// điều được ghim ở đây là THỨ TỰ, không phải chữ ký hàm. Bản ghim cũ dò cặp
// ngoặc rỗng nên vỡ ngay khi lời gọi được thêm chữ báo lỗi (F-18, 02/09) —
// vỡ vì một lý do chẳng liên quan gì tới thứ tự nó đang bảo vệ.
const enabled = run.indexOf("waitForSendButtonReady(");
const click = run.indexOf("DECISIONS.clickSend(");
assert.ok(type > -1 && type < enabled && enabled < capture && capture < click, "typing -> enabled Create -> immediate boundary -> one guarded click");
// Audit round 3: quota threw here but security was only fed into sendReady(),
// so a CAPTCHA arriving after typing timed out as the generic "Send button did
// not become ready" -- a string that classifies as OTHER, and OTHER is
// RETRYABLE. Both blockers must raise their own hard stop, symmetrically.
const sendWait = content.slice(content.indexOf("async function waitForSendButtonReady"), content.indexOf("// Magic-byte sniff"));
assert.ok(sendWait.length > 0, "the readiness wait is locatable");
assert.match(sendWait, /if \(security\) throw new Error\(`HARD_STOP: \$\{security\}`\);/, "the readiness wait raises its own security hard stop");
// Quota still raises its own hard stop from the readiness wait, but only AFTER
// the budget is spent: once the prompt is typed, a not-yet-mounted Create is
// indistinguishable from the credit wall in a single snapshot, and deciding on
// the first one would hard-stop healthy jobs with no retry.
assert.match(sendWait, /const settledQuota = generationLimitText\(\);/, "the quota verdict is taken once, after the wait");
assert.match(sendWait, /if \(settledQuota\) throw new Error\(`LIMIT_STOP: \$\{settledQuota\}`\);/, "quota keeps its hard stop");
// The loop can expire during its own sleep, so both blockers are re-read once
// after it. Security must be re-read FIRST and unconditionally: a CAPTCHA that
// mounts in that last gap must not be downgraded to a quota verdict or to the
// generic message, which classifies as OTHER and is retryable.
const settledSecurityAt = sendWait.indexOf("const settledSecurity = securityBlockerText();");
const settledQuotaAt = sendWait.indexOf("const settledQuota");
assert.ok(settledSecurityAt > -1, "security is re-read after the wait expires");
assert.ok(settledSecurityAt < settledQuotaAt, "the settled security check precedes the quota verdict");
assert.match(sendWait, /if \(settledSecurity\) throw new Error\(`HARD_STOP: \$\{settledSecurity\}`\);/, "a blocker found after the wait is still a hard stop");
const loopBody = sendWait.slice(0, settledQuotaAt);
assert.doesNotMatch(loopBody, /throw new Error\(`LIMIT_STOP/, "no quota verdict may be taken inside the poll loop");

assert.match(run, /postSendSettleMs/);
assert.match(run, /waitForVideoCompletion/);
assert.match(run, /result\?\.image_url \|\| result\?\.video_url/);

const videoWait = content.slice(content.indexOf("async function waitForVideoCompletion"), content.indexOf("function newAssistantMessages"));
assert.match(videoWait, /if \(STATE\.abortRequested\)/, "DAC_ABORT remains an interrupt point during completion polling");
assert.match(videoWait, /HARD_STOP: \$\{blocker\}/, "security blocker remains fail-closed during polling");
assert.match(videoWait, /ADAPTER\.TIMING\.completionPollMs/);
assert.match(videoWait, /OUTPUT_DETECTION_TIMEOUT: NO_NEW_VIDEO/, "timeout reuses the existing output-detection taxonomy");
assert.doesNotMatch(videoWait, /progressbar|findStopButton|generatingSignal/, "video completion never depends on nonexistent progress/stop state");

assert.match(content, /Number\(message\.timeoutMs\) \|\| ADAPTER\.TIMING\.perJobTimeoutMs/, "content default comes from the 300s adapter timing");
assert.match(content, /attempt\.resultKind === "video"[\s\S]*?waitForVideoCompletion/, "post-submit reconciliation polls the owned video boundary without resubmitting");

const videoPanel = panel.slice(panel.indexOf("if (videoUrl) {"), panel.indexOf("} else try {", panel.indexOf("if (videoUrl) {")));
assert.match(videoPanel, /result_file: videoUrl/);
assert.match(videoPanel, /write_outcome: "url_recorded"/);
assert.match(videoPanel, /video_id: result\.video_id, video_url: videoUrl, detected_at: result\.detected_at/);
assert.doesNotMatch(videoPanel, /saveGeneratedImage|fetch\(|chrome\.downloads|download\(/, "video branch records URL metadata and never fetches bytes");
assert.equal([...panel.matchAll(/response\.result\?\.image_url \|\| response\.result\?\.video_url/g)].length, 2, "normal run and reconciliation both accept a video result");

console.log("flow video job static: PASS");
