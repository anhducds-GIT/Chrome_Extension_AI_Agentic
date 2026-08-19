import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const context = {};
vm.runInNewContext(fs.readFileSync(new URL("../runner-core.js", import.meta.url), "utf8"), context);
const runner = context.DacRunnerCore;

assert.equal(runner.DEFAULTS.max_input_images, 5, "V0.3 default reference capacity is five");
const files = ["one.png", "two.png", "three.png", "four.png", "five.png", "six.png"].map((fileName, index) => ({ fileName, alias: index === 0 ? "hero" : "" }));
assert.equal(runner.resolveReferences({ id: "five", reference_images: "hero|two|three|four|five" }, files, 5).length, 5);
assert.equal(runner.resolveReferences({ id: "six", reference_images: "one|two|three|four|five|six" }, files, 6).length, 6, "six references are allowed when configured");
assert.throws(() => runner.resolveReferences({ id: "too-many", reference_images: "one|two|three|four|five|six" }, files, 5), /MAX_INPUT_IMAGES/);
assert.throws(() => runner.aliases([{ fileName: "a.png", alias: "same" }, { fileName: "b.png", alias: "SAME" }]), /DUPLICATE_ALIAS/);

const prepared = runner.prepare({ config: {}, jobs: [{ id: "done", prompt: "x", status: "DONE" }, { id: "failed", prompt: "x", status: "FAILED", timeout_sec: "60", max_retries: "1", safety_cooldown_sec: "2" }, { id: "pending", prompt: "x" }] }, files, { max_retries: "2", max_input_images: "5" });
assert.deepEqual(Array.from(prepared.queue.map((item) => item.status)), ["DONE", "FAILED", "PENDING"]);
assert.equal(prepared.queue[1].settings.timeout_sec, 60, "per-job timeout overrides current-run settings");
assert.equal(prepared.queue[1].settings.max_retries, 1, "per-job retry cap overrides current-run settings");
assert.equal(prepared.plan.skipped_done, 1);
assert.equal(runner.selectQueue(prepared.queue, "pending").length, 1);
assert.equal(runner.selectQueue(prepared.queue, "failed").length, 1);
assert.equal(runner.selectQueue(prepared.queue, "selected", "failed").length, 1);

assert.equal(runner.classifyFailure("Timed out waiting for ChatGPT"), "TIMEOUT");
assert.equal(runner.classifyFailure("HARD_STOP: ChatGPT security/interstitial blocker detected."), "SECURITY_HARD_STOP");
const retryItem = { retry_count: 0, settings: { max_retries: 2, safety_cooldown_sec: 1 } };
assert.equal(runner.canRetry(retryItem, "TIMEOUT"), true);
retryItem.retry_count = 2;
assert.equal(runner.canRetry(retryItem, "TIMEOUT"), false, "max two retries means at most three attempts");
assert.equal(runner.canRetry({ retry_count: 0, settings: { max_retries: 2 } }, "SECURITY_HARD_STOP"), false);
assert.equal(runner.retryCooldown({ safety_cooldown_sec: 2 }, 2), 4);
assert.equal(runner.readinessState({ generating: true, outputVerified: true, composerFound: true, sendUsable: true }), "GENERATING");
assert.equal(runner.readinessState({ generating: false, outputVerified: true, composerFound: true, sendUsable: true }), "CHAT_READY");

console.log("v0.3 operational core smoke tests: PASS");
