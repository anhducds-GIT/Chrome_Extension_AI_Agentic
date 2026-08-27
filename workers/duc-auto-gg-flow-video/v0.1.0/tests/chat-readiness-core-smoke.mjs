import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const context = {};
vm.runInNewContext(fs.readFileSync(new URL("../chat-readiness-core.js", import.meta.url), "utf8"), context);
const readiness = context.DacChatReadiness;
const sidePanelSource = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");
const contentSource = fs.readFileSync(new URL("../content.js", import.meta.url), "utf8");

const idleEmptyComposer = { composerFound: true, sendUsable: false, generating: false, securityBlocker: null, outputVerified: true };
assert.equal(readiness.evaluate(idleEmptyComposer), "READY", "an idle empty composer is ready before prompt insertion");
assert.equal(readiness.evaluate({ ...idleEmptyComposer, generating: true }), "GENERATING", "generation blocks pre-submit readiness");
assert.equal(readiness.evaluate({ ...idleEmptyComposer, securityBlocker: "CAPTCHA" }), "HARD_STOP", "security blockers remain hard stops");
assert.equal(readiness.evaluate({ ...idleEmptyComposer, attachmentPending: true }), "WAITING_UPLOAD", "unresolved attachment upload blocks idle readiness");
assert.equal(readiness.evaluate(idleEmptyComposer), "READY", "post-output idle readiness accepts an empty composer without Send usability");
assert.match(sidePanelSource, /async function gateNextJob[\s\S]*?await waitForChatReady\(item\);/, "pre-submit gate uses the shared idle-ready policy");
assert.match(sidePanelSource, /async function finishDetectedOutput[\s\S]*?await waitForChatReady\(item\);/, "post-output finalization uses the same idle-ready policy");
assert.match(contentSource, /attachmentPending: uploadIsPending\(\)/, "content readiness blocks an unresolved upload");

console.log("chat readiness core smoke tests: PASS");
