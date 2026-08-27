import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");
const stopStart = source.indexOf("async function stop()");
const stopEnd = source.indexOf("function togglePause", stopStart);
assert.notEqual(stopStart, -1);
const stop = source.slice(stopStart, stopEnd);
assert.match(stop, /state\.running \? state\.currentItem : null/);
assert.match(stop, /scoped = current\?\.attempt_id \? \{ job_id: current\.job\.id, attempt_id: current\.attempt_id \} : \{\}/);
assert.match(stop, /send\(\{ type: "DAC_ABORT", \.\.\.scoped \}\)/, "DAC_ABORT carries the active job and attempt identity");

const gate = source.indexOf("const gate = await gateNextJob(item);");
const dispatch = source.indexOf('type: "DAC_RUN_IMAGE_JOB"', gate);
const between = source.slice(gate, dispatch);
assert.match(between, /if \(state\.stopRequested\) \{/);
assert.match(between, /failure_type: "USER_STOP"/);
assert.match(between, /Stopped by user before submission\./);
assert.ok(between.indexOf("if (state.stopRequested)") < between.indexOf("nextAttemptId()"));

console.log("sidepanel stop-before-submit static: PASS");
