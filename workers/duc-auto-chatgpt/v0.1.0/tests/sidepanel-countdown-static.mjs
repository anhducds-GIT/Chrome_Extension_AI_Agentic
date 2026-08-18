import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../sidepanel.html", import.meta.url), "utf8");
const source = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");

assert.match(html, /id="nextTaskCountdown"/);
assert.match(source, /function nextTask/);
assert.match(source, /countdownValues\(seconds\)/);
assert.ok(source.indexOf("nextTask(item, `Starts in") > source.indexOf("async function countdown"));
assert.ok(!/progress\(`Next job in/.test(source), "countdown must not overwrite Progress detail");
assert.match(source, /INPUT_IMAGE_FALSE_POSITIVE: output URL matches a selected reference image/);
console.log("sidepanel countdown static checks: PASS");
