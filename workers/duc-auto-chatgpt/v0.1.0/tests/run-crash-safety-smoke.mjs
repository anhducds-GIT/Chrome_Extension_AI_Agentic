import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// A session whose Setup mutations already wrote artifacts (audit file /
// checkpoints) must CONTINUE that chain when Run starts — resetting collided
// with the session's own files (live halt, first run.trial 2026-08-25).
{
  const panelSource = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "sidepanel.js"), "utf8");
  const anchor = panelSource.indexOf("const continuingSessionArtifacts");
  assert.ok(anchor > 0, "run() must detect an existing session artifact chain");
  const region = panelSource.slice(anchor, anchor + 400);
  assert.match(region, /state\.auditFile \|\| state\.checkpointVersion/, "continuation must key on existing audit file or checkpoint version");
  assert.match(region, /!state\.resumeMode && !continuingSessionArtifacts/, "only a genuinely fresh session may reset the artifact chain");
  assert.match(region, /state\.auditPersistedPayload = ""/, "the Downloads append-emulation payload resets only with the chain");
}
import vm from "node:vm";
import { File } from "node:buffer";
import { FakeDOMParser, FakeXMLSerializer } from "./xlsx-test-utils.mjs";

const context = vm.createContext({ window: {}, TextEncoder, TextDecoder, DOMParser: FakeDOMParser, XMLSerializer: FakeXMLSerializer, File, Blob, console });
for (const file of ["xlsx-codec.js", "runner-core.js", "resume-core.js"]) {
  vm.runInContext(fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), context, { filename: file });
}
const xlsx = context.window.DacXlsx;
const runner = context.window.DacRunnerCore;
const resume = context.window.DacResumeCore;

const workbook = xlsx.createWorkbook("Crash-safe.xlsx", [
  { id: "JOB-1", prompt: "first" },
  { id: "JOB-2", prompt: "second" }
]);
const prepared = runner.prepare(workbook, []);
const oldJob2Row = prepared.queue[1].job._row;

xlsx.updateJob(workbook, prepared.queue[0].job, {
  status: "SUCCESS", attempt_phase: "SUCCESS", persistence_verified: "true",
  requested_file: "JOB-1.png", result_file: "JOB-1.png", completed_at: "2026-08-25T09:00:00.000Z"
});
prepared.queue[1].attempt_id = "attempt-job-2";
const reservation = runner.submissionReservation(prepared.queue[1], new Date("2026-08-25T09:01:00.000Z"));
xlsx.updateJob(workbook, prepared.queue[1].job, { ...reservation, attempt_id: prepared.queue[1].attempt_id });

const flushedCheckpoint = await xlsx.cloneWorkbook(workbook, "Crash-safe__results__v01.xlsx");
runner.rebindQueueRows(prepared.queue, flushedCheckpoint, xlsx.activeJobs);
assert.notEqual(prepared.queue[1].job._row, oldJob2Row, "remaining job is rebound to the reparsed checkpoint row");
xlsx.updateJob(flushedCheckpoint, prepared.queue[1].job, { last_error: "loop killed after durable reservation" });
const reopened = await xlsx.cloneWorkbook(flushedCheckpoint, "Crash-safe__results__v01.xlsx");

const recovery = resume.plan(reopened);
assert.equal(recovery.jobs.find((job) => job.job_id === "JOB-1").state, "SAFE_COMPLETE", "job 1 terminal state survives the mid-run checkpoint");
assert.equal(recovery.jobs.find((job) => job.job_id === "JOB-2").state, "AMBIGUOUS_SUBMITTED", "reserved unresolved job 2 fails closed after a killed loop");
assert.equal(reopened.jobs.find((job) => job.id === "JOB-2").last_error, "loop killed after durable reservation", "post-checkpoint update writes through the rebound row, not the orphaned document");

const resumed = runner.prepare(reopened, []);
resume.applyToQueue(resumed.queue, recovery.jobs);
const automaticSubmissions = runner.selectQueue(resumed.queue, "all").map((item) => item.job.id);
assert.equal(automaticSubmissions.includes("JOB-2"), false, "no automatic path re-submits the unresolved reserved job");
assert.equal(runner.shouldCheckpoint(1, runner.config({}).checkpoint_interval_jobs), true, "default completion interval checkpoints every job");
assert.equal(runner.config({ checkpoint_interval_jobs: "3" }).checkpoint_interval_jobs, 3);

async function attemptSendAfterCheckpoint(auditFile, resultFile) {
  let sendCount = 0;
  let ledgerCalls = 0;
  let blocker = null;
  try {
    await runner.verifiedRunCheckpoint({
      persistAudit: async () => auditFile,
      persistLedger: async () => { ledgerCalls += 1; return resultFile; }
    });
    sendCount += 1;
  } catch (error) { blocker = String(error?.message || error); }
  return { sendCount, ledgerCalls, blocker };
}

const auditDisabled = await attemptSendAfterCheckpoint("", "Crash-safe__results__v01.xlsx");
assert.equal(auditDisabled.sendCount, 0, "save_audit_jsonl=false cannot cross the prompt-send boundary");
assert.equal(auditDisabled.ledgerCalls, 0, "the barrier stops immediately when audit persistence is unavailable");
assert.match(auditDisabled.blocker, /^PERSISTENCE_VERIFICATION_FAILED:/);

const resultDisabled = await attemptSendAfterCheckpoint("Crash-safe__audit.jsonl", "");
assert.equal(resultDisabled.sendCount, 0, "save_result_xlsx=false cannot cross the prompt-send boundary");
assert.equal(resultDisabled.ledgerCalls, 1, "the missing Result artifact is detected at its real persistence step");
assert.match(resultDisabled.blocker, /^PERSISTENCE_VERIFICATION_FAILED:/);

const bothVerified = await attemptSendAfterCheckpoint("Crash-safe__audit.jsonl", "Crash-safe__results__v01.xlsx");
assert.equal(bothVerified.sendCount, 1, "the send boundary opens only after both safety artifacts verify");

const sidepanel = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");
const runSegment = sidepanel.slice(sidepanel.indexOf("async function run("), sidepanel.indexOf("chrome.runtime.onMessage.addListener", sidepanel.indexOf("async function run(")));
assert.ok(runSegment.indexOf("submissionReservation(item)") < runSegment.indexOf('send({ type: "DAC_RUN_IMAGE_JOB"'), "durable reservation is created before the send boundary");
assert.ok(runSegment.indexOf("flushRunCheckpoint(effectiveOutput.result") < runSegment.indexOf('send({ type: "DAC_RUN_IMAGE_JOB"'), "verified audit/checkpoint flush completes before the send boundary");

console.log("run crash-safety smoke tests: PASS");
