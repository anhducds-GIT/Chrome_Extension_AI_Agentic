import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function load(relativePath, name) {
  const context = {};
  vm.runInNewContext(fs.readFileSync(new URL(relativePath, import.meta.url), "utf8"), context);
  return context[name];
}

const readiness = load("../chat-readiness-core.js", "DacChatReadiness");
const runner = load("../runner-core.js", "DacRunnerCore");
const runState = load("../run-state-core.js", "DacRunState");
const idleEmptyComposer = { composerFound: true, sendUsable: false, generating: false, securityBlocker: null, attachmentPending: false, outputVerified: true };

function settleIdle(frames, events, label) {
  for (const signal of frames) {
    const result = readiness.evaluate(signal);
    events.push(`${label}:${result}`);
    if (result === "HARD_STOP") return result;
    if (result === "READY") return result;
  }
  throw new Error(`${label} never became idle-ready`);
}

function simulateSequentialJobs(jobs, frames) {
  const events = []; const submissions = []; const saves = []; const statuses = new Map();
  for (const job of jobs) {
    const frame = frames[job.id];
    const pre = settleIdle(frame.pre, events, `${job.id}:PRE`);
    if (pre === "HARD_STOP") { statuses.set(job.id, "HALTED"); break; }
    assert.equal(frame.sendUsable, true, `${job.id} reaches Send usability only after prompt insertion`);
    submissions.push(job.id); events.push(`${job.id}:SUBMIT`);
    saves.push(job.id); events.push(`${job.id}:OUTPUT_SAVED`);
    const post = settleIdle(frame.post, events, `${job.id}:POST`);
    if (post === "HARD_STOP") { statuses.set(job.id, "INTERRUPTED"); break; }
    statuses.set(job.id, "SUCCESS"); events.push(`${job.id}:SUCCESS`);
  }
  return { events, submissions, saves, statuses };
}

const simulation = simulateSequentialJobs([{ id: "P03-A" }, { id: "P03-B" }, { id: "P03-C" }], {
  "P03-A": { pre: [idleEmptyComposer], sendUsable: true, post: [{ ...idleEmptyComposer, generating: true }, idleEmptyComposer] },
  "P03-B": { pre: [idleEmptyComposer], sendUsable: true, post: [idleEmptyComposer] },
  "P03-C": { pre: [idleEmptyComposer], sendUsable: true, post: [idleEmptyComposer] }
});
assert.deepEqual(simulation.submissions, ["P03-A", "P03-B", "P03-C"], "three sequential jobs each submit exactly once");
assert.deepEqual(simulation.saves, ["P03-A", "P03-B", "P03-C"], "three sequential jobs each save exactly once");
assert.equal(simulation.statuses.get("P03-C"), "SUCCESS", "empty idle composer after OUTPUT_SAVED finalizes all jobs");
assert.ok(simulation.events.indexOf("P03-A:OUTPUT_SAVED") < simulation.events.indexOf("P03-A:SUCCESS"), "output checkpoint precedes completion");
assert.ok(simulation.events.indexOf("P03-A:SUCCESS") < simulation.events.indexOf("P03-B:SUBMIT"), "A completes before B submits");
assert.ok(simulation.events.indexOf("P03-B:SUCCESS") < simulation.events.indexOf("P03-C:SUBMIT"), "B completes before C submits");
assert.ok(simulation.events.includes("P03-A:POST:GENERATING"), "post-save generation waits and does not submit the next job");

const blocked = simulateSequentialJobs([{ id: "P03-A" }, { id: "P03-B" }], {
  "P03-A": { pre: [{ ...idleEmptyComposer, securityBlocker: "CAPTCHA" }], sendUsable: true, post: [idleEmptyComposer] },
  "P03-B": { pre: [idleEmptyComposer], sendUsable: true, post: [idleEmptyComposer] }
});
assert.deepEqual(blocked.submissions, [], "security hard stop prevents the current and all later submissions");

const recovered = runner.prepare({ config: {}, jobs: [{ id: "saved", prompt: "x", status: "SUCCESS", result_file: "P03-A__attempt-01.png", attempt_phase: "SUCCESS" }] }, [], {});
assert.equal(runner.selectQueue(recovered.queue, "all").length, 0, "saved checkpoint recovery never resubmits automatically");
assert.equal(runState.stageFor({ status: "RECONCILING", phase: "PRE_SUBMIT" }), "WAITING_READY", "current-job mapping exposes pre-submit waiting");
assert.equal(runState.stageFor({ status: "RUNNING", phase: "OUTPUT_SAVED" }), "FINALIZING / WAITING_IDLE", "current-job mapping exposes output finalization");
assert.equal(runState.nextEligible([{ job: { id: "A" }, status: "RUNNING" }, { job: { id: "B" }, status: "PENDING" }], "A").job.id, "B", "next-task mapping never displays the current job");

console.log("V1 stabilization integration simulation: PASS");
