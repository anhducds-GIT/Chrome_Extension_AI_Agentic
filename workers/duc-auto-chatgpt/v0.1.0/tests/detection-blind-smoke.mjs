/* A dead selector must cost ONE attempt, not the whole queue's quota.

   2026-08-26, live: the runner sent six prompts, ChatGPT generated six real
   images, and detection reported NO_NEW_IMAGE every single time because the
   page held no element matching the assistant-message selector. Classified as
   POST_SUBMIT_UNCERTAIN, that is a RETRYABLE code -- so the runner resubmitted
   two more times per job and paid for six generations to learn nothing.

   The distinguishing fact is available at the moment of the timeout: ChatGPT
   always renders an assistant turn once a prompt is accepted, so ZERO
   assistant messages after a full timeout is not "the image is slow" -- it is
   "this runner cannot see". That is DETECTION_BLIND, and it halts. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const read = (name) => fs.readFileSync(new URL(name, root), "utf8");
const content = read("content.js");

function load(name, globalName) {
  const context = {};
  vm.runInNewContext(read(name), context);
  return context[globalName];
}
const runner = load("runner-core.js", "DacRunnerCore");
const guide = load("halt-instructions-core.js", "DacHaltInstructions");

// --- the code exists and halts ----------------------------------------
assert.ok(runner.FAILURE_TYPES.has("DETECTION_BLIND"), "DETECTION_BLIND is a canonical failure type");
assert.ok(runner.HARD_STOP_FAILURE_TYPES.has("DETECTION_BLIND"), "a blind detector halts the batch");

// --- it is never retried ------------------------------------------------
// This is the whole point: retrying spends real image quota per attempt.
const item = { retry_count: 0, settings: { max_retries: 2 } };
assert.equal(runner.canRetry(item, "DETECTION_BLIND"), false, "DETECTION_BLIND must never be retried");


// --- classification beats the generic timeout rule ---------------------
// A blind detector ALSO looks like a timeout. If the timeout rule matched
// first, the code would fall back to POST_SUBMIT_UNCERTAIN and retry -- the
// exact bug this file exists to prevent.
const blindMessage = "DETECTION_BLIND: no assistant message exists on https://chatgpt.com/ after the full timeout — either the page structure changed or this tab is not on a ChatGPT conversation. Nothing was detected, so retrying would only spend more quota.";
for (const phase of ["PRE_SUBMIT", "SUBMITTED", "OUTPUT_DETECTED", "OUTPUT_SAVED", "CHAT_READY"]) {
  assert.equal(runner.classifyFailure(new Error(blindMessage), phase), "DETECTION_BLIND", `classified from ${phase}`);
}
// The ordinary detection timeout keeps its old classification, and both of
// the codes it can land on stay retryable -- only the blind case is new.
assert.equal(
  runner.classifyFailure(new Error("OUTPUT_DETECTION_TIMEOUT: NO_NEW_IMAGE; stop_visible=false."), "SUBMITTED"),
  "TIMEOUT_AFTER_SUBMIT",
  "a normal detection timeout is unchanged"
);
for (const retryable of ["TIMEOUT_AFTER_SUBMIT", "POST_SUBMIT_UNCERTAIN"]) {
  assert.equal(runner.canRetry({ retry_count: 0, settings: { max_retries: 2 } }, retryable), true, `${retryable} still retries`);
}
// A prompt that merely mentions the phrase cannot forge the code: the rule is
// anchored to the start of the message the runner itself produced.
assert.notEqual(runner.classifyFailure(new Error("the user asked about DETECTION_BLIND: handling"), "SUBMITTED"), "DETECTION_BLIND");

// --- content.js only claims blindness on real evidence -----------------
const timeoutBlock = content.slice(content.indexOf("recordDetection(attempt, { ...lastDetection, timed_out: true });"));
assert.match(timeoutBlock, /const blind = expectImage && assistantMessages\(\)\.length === 0;/, "blindness is decided by a live count, not by the last cached telemetry");
assert.match(timeoutBlock, /DETECTION_BLIND: no assistant message exists on \$\{location\.href\}/, "the error names the page it was blind on");
assert.match(timeoutBlock, /detection_blind: blind/, "the ledger's detection diagnostics record which of the two timeouts fired");
// Text-only jobs never produce an image and legitimately end other ways;
// blindness is only meaningful when an image was expected.
assert.ok(timeoutBlock.includes("expectImage &&"), "a text-only job is never called blind");

// --- the operator is told what to do -----------------------------------
const instruction = guide.findInstruction("DETECTION_BLIND");
assert.notEqual(instruction, guide.UNKNOWN_INSTRUCTION, "DETECTION_BLIND has real guidance, not the fallback");
assert.match(instruction.retry, /^No -- hard stop/);
assert.ok([...guide.coveredFailureCodes()].includes("DETECTION_BLIND"), "the taxonomy covers it");

console.log("detection blind smoke tests: PASS");
