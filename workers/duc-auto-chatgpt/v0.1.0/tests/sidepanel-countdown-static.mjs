import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../sidepanel.html", import.meta.url), "utf8");
const source = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");

assert.match(html, /id="nextTaskCountdown"/);
for (const id of ["runScreen", "currentJobId", "currentStage", "currentTiming", "currentSaved"]) assert.match(html, new RegExp(`id="${id}"`));
assert.match(source, /function nextTask/);
assert.match(source, /function setCurrent/);
assert.match(source, /SAVED ✓/);
assert.match(source, /els\.logList\.textContent = "";/, "a new run clears stale visible log entries");
assert.match(source, /countdownValues\(seconds\)/);
assert.ok(source.indexOf("nextTask(item, `${runtimeInfo.nextTransition} · ${runtimeInfo.interJobDelay}`)") > source.indexOf("async function countdown"), "countdown identifies the real next job and exposes only the readiness-check transition");
assert.ok(!/progress\(`Next job in/.test(source), "countdown must not overwrite Progress detail");
assert.doesNotMatch(source.slice(source.indexOf("async function countdown"), source.indexOf("async function waitForChatReady")), /Earliest next readiness check/, "countdown must not promise a wall-clock prompt time before readiness authority");
assert.match(source, /INPUT_IMAGE_FALSE_POSITIVE: output URL matches a selected reference image/);
console.log("sidepanel countdown static checks: PASS");
