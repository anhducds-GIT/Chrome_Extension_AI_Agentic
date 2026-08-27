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
const type = run.indexOf("typeIntoFlowComposer(composer, prompt)");
const enabled = run.indexOf("waitForSendButtonReady()");
const click = run.indexOf("DECISIONS.clickSend(");
assert.ok(type > -1 && type < enabled && enabled < capture && capture < click, "typing -> enabled Create -> immediate boundary -> one guarded click");
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
