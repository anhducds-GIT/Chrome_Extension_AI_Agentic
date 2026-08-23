/* Feature request: the Continue Run control raised the question of whether
   a Pause is also possible. Pause is deliberately a different mechanism from
   Stop: exact-once submission means an in-flight attempt can never be safely
   suspended mid-generation, so Pause only ever holds the queue at the one
   boundary that is already safe -- after the current job reaches a terminal
   state and before the next one is gated/submitted. Stop abandons the run
   (no auto-resume, operator must press Run again); Pause holds the same
   in-memory run so Resume continues it with no re-checkpoint and no re-gate. */
import assert from "node:assert/strict";
import fs from "node:fs";

const sidepanel = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../sidepanel.html", import.meta.url), "utf8");

assert.match(sidepanel, /pauseRequested: false,\s*\n\s*paused: false,/, "pause has its own state, distinct from stopRequested");

const toggleSegment = sidepanel.slice(sidepanel.indexOf("function togglePause()"), sidepanel.indexOf("async function waitWhilePaused()"));
assert.ok(toggleSegment.length > 0, "togglePause() is present");
assert.match(toggleSegment, /state\.pauseRequested = !state\.pauseRequested;/, "pause is a toggle the operator can also cancel before it takes effect");

const waitSegment = sidepanel.slice(sidepanel.indexOf("async function waitWhilePaused()"), sidepanel.indexOf("function showScreen(id)"));
assert.ok(waitSegment.length > 0, "waitWhilePaused() is present");
assert.match(waitSegment, /while \(state\.pauseRequested && !state\.stopRequested\) await sleep\(250\);/, "Stop can always break out of a pause without needing Resume first");
assert.match(waitSegment, /audit\("RUN_PAUSED", null, \{\}\);/, "pausing is recorded in the audit trail like every other run transition");
assert.match(waitSegment, /audit\("RUN_RESUMED", null, \{\}\);/, "resuming is recorded too");

// The run loop only checks pause at the two safe boundaries: before a job is
// gated/submitted, and right after a job's terminal status is recorded --
// never in the middle of an attempt.
const runSegment = sidepanel.slice(sidepanel.indexOf('async function run(mode = "all")'), sidepanel.indexOf("chrome.runtime.onMessage.addListener"));
const pauseCheckCount = [...runSegment.matchAll(/await waitWhilePaused\(\);/g)].length;
assert.equal(pauseCheckCount, 2, "pause is checked exactly at the pre-job and post-job boundaries, not mid-attempt");
assert.match(runSegment, /if \(state\.stopRequested\) break;\s*\n\s*await waitWhilePaused\(\);\s*\n\s*if \(state\.stopRequested\) break;\s*\n\s*let completed = false;/, "pause is checked before a job starts, and Stop still wins if requested while paused");
assert.match(runSegment, /state\.terminal \+= 1; renderQueue\(\);\s*\n\s*if \(halted\) break;\s*\n\s*await waitWhilePaused\(\);\s*\n\s*if \(state\.stopRequested\) break;\s*\n\s*const nextItem/, "pause is checked immediately after the current job finishes, before the inter-job delay");
assert.match(runSegment, /state\.pauseRequested = false; state\.paused = false;/, "starting a run clears any pause state left over from a previous one");

// The label must flip the instant the operator clicks it (on
// state.pauseRequested, the intent), not wait for state.paused (the
// physical hold, which only starts once the in-flight job finishes). A
// label that waits read as "did my click even register?" and led the
// operator to press Stop instead of the correctly-working but
// not-yet-visibly-changed Resume.
assert.match(sidepanel, /els\.pauseResumeBtn\.textContent = state\.pauseRequested \? "▶ Tiếp tục" : "⏸ Tạm dừng";/, "the label reflects pause intent immediately, not only once the hold has physically taken effect");
assert.doesNotMatch(sidepanel, /pauseResumeBtn\.textContent = state\.paused \?/, "the label must not gate on state.paused, which can lag behind the click by as long as the current job takes to finish");
assert.match(sidepanel, /els\.pauseResumeBtn\.disabled = !state\.running;/, "the control stays usable for the entire run, whether actively running or paused");
assert.match(sidepanel, /els\.pauseResumeBtn\?\.addEventListener\("click", togglePause\);/, "the button is wired to the toggle");

assert.match(html, /id="pauseResumeBtn"/, "the Pause/Resume control exists in the Run screen");
assert.match(html, /id="pauseResumeBtn"[^>]*title="[^"]*không đóng side panel[^"]*"/i, "the button explains that a pause is a same-session hold, not durable across closing the panel");

console.log("pause/resume static tests: PASS");
