import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const context = {};
vm.runInNewContext(fs.readFileSync(new URL("../chat-readiness-core.js", import.meta.url), "utf8"), context);
const readiness = context.DacChatReadiness;
const sidePanelSource = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");
const contentSource = fs.readFileSync(new URL("../content.js", import.meta.url), "utf8");

const idleEmptyComposer = { composerFound: true, sendUsable: false, generating: false, securityBlocker: null, outputVerified: true };
assert.equal(readiness.evaluate(idleEmptyComposer, { requireSendUsable: false }), "READY", "an idle empty composer is ready before prompt insertion");
assert.equal(readiness.evaluate({ ...idleEmptyComposer, generating: true }, { requireSendUsable: false }), "GENERATING", "generation blocks pre-submit readiness");
assert.equal(readiness.evaluate({ ...idleEmptyComposer, securityBlocker: "CAPTCHA" }, { requireSendUsable: false }), "HARD_STOP", "security blockers remain hard stops");
assert.equal(readiness.evaluate(idleEmptyComposer), "OUTPUT_READY", "post-output CHAT_READY still requires a usable Send button");
assert.equal(readiness.evaluate({ ...idleEmptyComposer, sendUsable: true }), "READY", "post-output readiness succeeds only once Send is usable");
assert.match(sidePanelSource, /async function gateNextJob[\s\S]*?waitForChatReady\(item, \{ requireSendUsable: false \}\)/, "only the pre-submit gate opts out of Send usability");
assert.match(sidePanelSource, /async function finishDetectedOutput[\s\S]*?await waitForChatReady\(item\);/, "post-output CHAT_READY retains the strict default");
assert.match(contentSource, /requireSendUsable: message\.requireSendUsable !== false/, "content receiver accepts the explicit pre-submit readiness policy");

console.log("chat readiness core smoke tests: PASS");
