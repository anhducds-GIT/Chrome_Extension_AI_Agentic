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
// This used to assert `countdownValues(seconds)` -- i.e. it pinned the very
// implementation that made a 12s gap take 11 minutes in a hidden panel. It now
// pins the replacement instead, and the replacement is a strictly stronger
// claim: the gap is waited on a wall-clock deadline with a throttle-immune
// chrome.alarms wake-up. Behaviour is pinned in interjob-delay-core-smoke.mjs.
assert.match(source, /window\.DacInterJobDelay\.waitBetweenJobs\(/, "the inter-job gap runs on the throttle-immune wait");
assert.match(source, /alarms: chrome\.alarms/, "the wait is handed the real chrome.alarms API");
assert.ok(source.indexOf("nextTask(item, `${runtimeInfo.nextTransition} · ${runtimeInfo.interJobDelay}`)") > source.indexOf("async function countdown"), "countdown identifies the real next job and exposes only the readiness-check transition");
assert.ok(!/progress\(`Next job in/.test(source), "countdown must not overwrite Progress detail");
assert.doesNotMatch(source.slice(source.indexOf("async function countdown"), source.indexOf("async function waitForChatReady")), /Earliest next readiness check/, "countdown must not promise a wall-clock prompt time before readiness authority");
assert.match(source, /const selectedSafetyCooldownSec = window\.DacRunnerCore\.safetyCooldownSeconds\(item\.settings\);/, "each readiness gate selects one cooldown from the configured fixed value or range");
assert.match(source, /safetyCooldownSec: selectedSafetyCooldownSec/, "the selected scalar cooldown is sent to the ChatGPT readiness check");
const successIndex = source.indexOf('update(item, { status: "SUCCESS"');
const delayIndex = source.indexOf("const delay = window.DacRunnerCore.delaySeconds(settings)");
const countdownIndex = source.indexOf("await countdown(delay, nextItem)");
assert.ok(successIndex >= 0 && delayIndex > successIndex && countdownIndex > delayIndex, "inter-job delay begins only after the prior job reaches SUCCESS and before the next readiness gate");
assert.match(source, /INPUT_IMAGE_FALSE_POSITIVE: output URL matches a selected reference image/);
console.log("sidepanel countdown static checks: PASS");
