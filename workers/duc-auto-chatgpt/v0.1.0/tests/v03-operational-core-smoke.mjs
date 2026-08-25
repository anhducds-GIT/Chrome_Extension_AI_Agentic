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
assert.deepEqual(Array.from(prepared.queue.map((item) => item.status)), ["SUCCESS", "FAILED", "PENDING"]);
assert.equal(prepared.queue[1].settings.timeout_sec, 60, "per-job timeout overrides current-run settings");
assert.equal(prepared.queue[1].settings.max_retries, 1, "per-job retry cap overrides current-run settings");
assert.equal(prepared.plan.skipped_done, 1);
assert.equal(runner.selectQueue(prepared.queue, "pending").length, 1);
assert.equal(runner.selectQueue(prepared.queue, "failed").length, 1);
assert.equal(runner.selectQueue(prepared.queue, "selected", "failed").length, 1);

const recovered = runner.prepare({ config: {}, jobs: [
  { id: "P03 success", prompt: "x", status: "SUCCESS", attempt_phase: "SUCCESS", result_file: "Duc Auto ChatGPT/P03 success.png", result_download_id: "download-1" },
  { id: "legacy done", prompt: "x", status: "DONE", result_file: "Duc Auto ChatGPT/legacy.png" },
  { id: "checkpoint", prompt: "x", status: "INTERRUPTED", attempt_phase: "OUTPUT_SAVED", result_file: "Duc Auto ChatGPT/checkpoint.png", failure_type: "READINESS_TIMEOUT_AFTER_SAVE" }
] }, [], {});
assert.deepEqual(Array.from(recovered.queue.map((item) => item.status)), ["SUCCESS", "SUCCESS", "INTERRUPTED"], "SUCCESS and legacy DONE recover as terminal success while an interrupted checkpoint retains its failure state");
assert.equal(recovered.queue[0].result_download_id, "download-1", "result provenance survives recovery");
assert.equal(recovered.queue[2].phase, "OUTPUT_SAVED", "saved-output phase survives recovery");
assert.equal(runner.selectQueue(recovered.queue, "all").length, 0, "Run All cannot re-submit recovered output checkpoints");
assert.equal(runner.selectQueue(recovered.queue, "pending").length, 0, "Run Pending skips terminal success and output checkpoints");
assert.equal(runner.selectQueue(recovered.queue, "failed").length, 0, "Run Failed skips output checkpoints");
assert.equal(runner.selectQueue(recovered.queue, "selected", "checkpoint").length, 0, "Retry Selected skips an interrupted saved output");

const deliberateRerun = runner.prepare({ config: { rerun_done: true }, jobs: [
  { id: "done rerun", prompt: "x", status: "DONE", attempt_phase: "SUCCESS", result_file: "Duc Auto ChatGPT/done.png" },
  { id: "saved interrupted", prompt: "x", status: "INTERRUPTED", attempt_phase: "OUTPUT_SAVED", result_file: "Duc Auto ChatGPT/interrupted.png" }
] }, [], {});
assert.equal(deliberateRerun.queue[0].deliberate_rerun, true, "rerun_done deliberately enables a terminal success rerun");
assert.deepEqual({ status: deliberateRerun.queue[0].status, phase: deliberateRerun.queue[0].phase }, { status: "PENDING", phase: "PRE_SUBMIT" }, "deliberate rerun starts fresh before submission");
assert.equal(runner.selectQueue(deliberateRerun.queue, "all").length, 1, "only completed success is eligible for deliberate rerun");
assert.equal(deliberateRerun.queue[1].skipped, true, "rerun_done never unlocks interrupted saved output");

assert.equal(runner.classifyFailure("Timed out waiting for ChatGPT", "PRE_SUBMIT"), "TIMEOUT_PRE_SUBMIT");
assert.equal(runner.classifyFailure("Timed out waiting for ChatGPT", "SUBMITTED"), "TIMEOUT_AFTER_SUBMIT");
assert.equal(runner.classifyFailure("Timed out waiting for ChatGPT", "OUTPUT_SAVED"), "READINESS_TIMEOUT_AFTER_SAVE");
assert.equal(runner.classifyFailure("HARD_STOP: ChatGPT security/interstitial blocker detected."), "SECURITY_HARD_STOP");
assert.equal(runner.classifyFailure("RECEIVER_LOST: ChatGPT receiver unavailable. Reload the ChatGPT tab once."), "RECEIVER_LOST");
const retryItem = { phase: "PRE_SUBMIT", retry_count: 0, settings: { max_retries: 2, safety_cooldown_sec: 1 } };
assert.equal(runner.canRetry(retryItem, "TIMEOUT_PRE_SUBMIT"), true);
assert.equal(runner.canRetry({ ...retryItem, phase: "SUBMITTED" }, "TIMEOUT_AFTER_SUBMIT"), true, "post-submit failure auto-retries too -- only the three hard stops (SECURITY_HARD_STOP, GENERATION_LIMIT_REACHED, RECEIVER_LOST) never retry");
retryItem.retry_count = 2;
assert.equal(runner.canRetry(retryItem, "TIMEOUT_PRE_SUBMIT"), false, "max two retries means at most three attempts");
assert.equal(runner.canRetry({ retry_count: 0, settings: { max_retries: 2 } }, "SECURITY_HARD_STOP"), false);
assert.equal(runner.retryCooldown({ safety_cooldown_sec: 2 }, 2), 4);
assert.equal(runner.readinessState({ generating: true, outputVerified: true, composerFound: true, sendUsable: true }), "GENERATING");
assert.equal(runner.readinessState({ generating: false, outputVerified: true, composerFound: true, sendUsable: true }), "CHAT_READY");
assert.equal(runner.canStartNextJob({ generating: false, outputVerified: true, composerFound: true, sendUsable: true }, [{ status: "PENDING" }]), true);
assert.equal(runner.canStartNextJob({ generating: true, outputVerified: true, composerFound: true, sendUsable: true }, [{ status: "PENDING" }]), false, "next job cannot begin while ChatGPT is generating");

console.log("v0.3 operational core smoke tests: PASS");
