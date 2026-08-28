import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { File } from "node:buffer";
import { FakeDOMParser, FakeXMLSerializer } from "./xlsx-test-utils.mjs";

const context = vm.createContext({ window: {}, globalThis: null, TextEncoder, TextDecoder, DOMParser: FakeDOMParser, XMLSerializer: FakeXMLSerializer, File, Blob, console });
context.globalThis = context;
for (const file of ["xlsx-codec.js", "runner-core.js", "resume-core.js", "text-output-core.js", "bridge-core.js", "bridge-proposal-core.js"]) {
  vm.runInContext(fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), context, { filename: file });
}

const xlsx = context.window.DacXlsx;
const runner = context.window.DacRunnerCore;
const textOutput = context.window.DacTextOutputCore;
const resume = context.window.DacResumeCore;
const bridge = context.window.DacBridgeCore;
const proposal = context.window.DacBridgeProposalCore;

async function executeTextRun({ workbook, job, contentCallback, persistCheckpoint }) {
  const result = await contentCallback();
  const transition = await textOutput.verifiedTextTransition({
    result,
    hashText: async () => "sha256:abcdefghijklmnopqrstuvwxyz_123456789",
    onLedger: async ({ ledger }) => xlsx.updateJob(workbook, job, { ...ledger, status: "RUNNING", attempt_phase: "OUTPUT_SAVED" }),
    persistCheckpoint,
    onVerified: async () => xlsx.updateJob(workbook, job, { persistence_verified: "true" })
  });
  xlsx.updateJob(workbook, job, { status: "SUCCESS", attempt_phase: "SUCCESS" });
  return transition;
}

const exactResponse = "Kết luận dòng 1\n\nLập luận dòng 2 — giữ nguyên Unicode ✓";
const captured = textOutput.capture({ type: "text", text: exactResponse });
assert.equal(captured.response_text, exactResponse, "text capture preserves exact Unicode and newlines");
assert.equal(captured.response_char_count, exactResponse.length);
assert.throws(() => textOutput.capture({ type: "text", text: "x".repeat(32768) }), /TEXT_RESPONSE_TOO_LARGE/);
assert.throws(() => textOutput.capture({ type: "image", text: "wrong mode" }), /TEXT_RESPONSE_MISSING/);

/* Pass B F-2 (2026-08-28). An XML parser rewrites \r\n and a lone \r to \n when
   it reads a text node, and checkpointWorkbook() re-parses on every checkpoint.
   A stored \r therefore made response_char_count unsatisfiable after the first
   reopen, so resume classified a good answer AMBIGUOUS_SUBMITTED and offered to
   ask ChatGPT the same question again. Normalising at capture is what keeps the
   counted/hashed value equal to the value that survives the round trip.
   NOTE: the suite's FakeXMLSerializer does NOT normalise, so a round-trip
   assertion could not have caught this -- the guard has to be pinned here. */
const carriageReturn = textOutput.capture({ type: "text", text: "dòng 1\r\ndòng 2\rdòng 3" });
assert.equal(carriageReturn.response_text.includes("\r"), false, "no carriage return survives capture");
assert.equal(carriageReturn.response_text, "dòng 1\ndòng 2\ndòng 3");
assert.equal(carriageReturn.response_char_count, carriageReturn.response_text.length, "the recorded count matches the value actually stored");
assert.equal(textOutput.ledgerFields(carriageReturn, "sha256:abcdefghijklmnopqrstuvwxyz_123456789").response_text, carriageReturn.response_text, "the ledger stores the normalised value, not the raw one");
assert.equal(textOutput.capture({ type: "text", text: `${"x".repeat(32766)}\r\n` }).response_char_count, 32767, "\\r\\n counts as the single character it becomes");

const responseHash = "sha256:abcdefghijklmnopqrstuvwxyz_123456789";
const fields = textOutput.ledgerFields(captured, responseHash);
assert.equal(fields.output_type, "text");
assert.equal(fields.response_text, exactResponse);
assert.equal(fields.result_file, "", "text output never masquerades as an image file");
assert.equal(fields.image_count, "", "text output carries no image attribution fields");
assert.equal(fields.persistence_verified, false, "text output is not called persisted until the Result checkpoint returns verified");
const audit = textOutput.auditFields(captured, responseHash);
assert.equal(Object.hasOwn(audit, "response_text"), false, "full response is absent from technical audit fields");

const workbook = xlsx.createWorkbook("Mixed.xlsx", [
  { id: "LEGACY-IMAGE", prompt: "legacy row" },
  { id: "TEXT-1", prompt: "reason", task_type: "text_reasoning" }
]);
const prepared = runner.prepare(workbook, []);
assert.equal(prepared.queue[0].task_type, "image_generation", "legacy rows default to image generation");
assert.equal(prepared.queue[1].task_type, "text_reasoning");
assert.equal(workbook.headers.includes("task_type"), true, "typed quick workbook persists task_type");
xlsx.updateJob(workbook, workbook.jobs[1], { ...fields, persistence_verified: "true", status: "SUCCESS", attempt_phase: "SUCCESS" });
const reopened = await xlsx.cloneWorkbook(workbook, "Mixed__results__v01.xlsx");
assert.equal(resume.classify(reopened.jobs[1]).state, "SAFE_COMPLETE", "a verified text response remains complete after XLSX reopen");

let successfulSendCount = 0;
const successWorkbook = xlsx.createWorkbook("Behavioral-success.xlsx", [{ id: "TEXT-SUCCESS", prompt: "reason", task_type: "text_reasoning" }]);
const successJob = successWorkbook.jobs[0];
await executeTextRun({
  workbook: successWorkbook,
  job: successJob,
  contentCallback: async () => { successfulSendCount += 1; return { type: "text", text: exactResponse }; },
  persistCheckpoint: async () => {
    const persisted = await xlsx.cloneWorkbook(successWorkbook, "Behavioral-success__results__v01.xlsx");
    assert.equal(persisted.jobs[0].response_text, exactResponse, "checkpoint reopen preserves the exact response before verification is granted");
    return persisted.fileName;
  }
});
const successReopen = await xlsx.cloneWorkbook(successWorkbook, "Behavioral-success__results__v02.xlsx");
assert.equal(successfulSendCount, 1, "a successful text transition submits exactly once");
assert.equal(resume.classify(successReopen.jobs[0]).state, "SAFE_COMPLETE", "verified behavioral transition reopens as SAFE_COMPLETE");

let failedSendCount = 0;
let verifiedHookCount = 0;
const failureWorkbook = xlsx.createWorkbook("Behavioral-failure.xlsx", [{ id: "TEXT-FAIL", prompt: "reason", task_type: "text_reasoning" }]);
const failureJob = failureWorkbook.jobs[0];
await assert.rejects(
  () => textOutput.verifiedTextTransition({
    result: (() => { failedSendCount += 1; return { type: "text", text: exactResponse }; })(),
    hashText: async () => responseHash,
    onLedger: async ({ ledger }) => xlsx.updateJob(failureWorkbook, failureJob, { ...ledger, status: "RUNNING", attempt_phase: "OUTPUT_SAVED" }),
    persistCheckpoint: async () => { throw new Error("PERSISTENCE_VERIFICATION_FAILED: simulated reopen failure"); },
    onVerified: async () => { verifiedHookCount += 1; xlsx.updateJob(failureWorkbook, failureJob, { persistence_verified: "true" }); }
  }),
  /PERSISTENCE_VERIFICATION_FAILED/
);
assert.equal(failedSendCount, 1, "checkpoint failure does not resubmit an already received text response");
assert.equal(verifiedHookCount, 0, "failed persistence never reaches the verification hook");
const failureReopen = await xlsx.cloneWorkbook(failureWorkbook, "Behavioral-failure__results__v01.xlsx");
assert.equal(failureReopen.jobs[0].persistence_verified, "false", "failed checkpoint leaves persistence unverified after reopen");
assert.notEqual(resume.classify(failureReopen.jobs[0]).state, "SAFE_COMPLETE", "unverified text output cannot resume as complete");

assert.equal(bridge.validateParams("jobs.add", { jobs: [{ prompt: "reason", task_type: "text_reasoning" }] }).jobs[0].task_type, "text_reasoning");
assert.equal(bridge.validateParams("jobs.add", { jobs: [{ prompt: "legacy" }] }).jobs[0].task_type, "image_generation");
assert.equal(bridge.validateParams("jobs.update", { job_id: "TEXT-1", task_type: "image_generation" }).task_type, "image_generation");
assert.equal(bridge.validateParams("queue.propose", { if_ledger_etag: "etag", jobs: [{ client_job_id: "c1", prompt: "reason", task_type: "text_reasoning" }] }).jobs[0].task_type, "text_reasoning");
assert.throws(() => bridge.validateParams("jobs.add", { jobs: [{ prompt: "bad", task_type: "video" }] }), /Invalid params/);

const sanitized = proposal.sanitizeLedgerJob({ id: "TEXT-1", response_text: exactResponse, response_char_count: String(exactResponse.length), response_sha256: responseHash });
assert.equal(Object.hasOwn(sanitized, "response_text"), false, "Bridge ledger reads never expose the full response");
assert.equal(sanitized.response_char_count, String(exactResponse.length));

const sidepanel = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");
const content = fs.readFileSync(new URL("../content.js", import.meta.url), "utf8");
assert.match(content, /message\.type === "DAC_RUN_TEXT_JOB"/);
assert.match(content, /runPrompt\(prompt, timeoutMs, [\s\S]*?, false, requestAttempt, 1\)/);
assert.match(sidepanel, /textReasoning \? "DAC_RUN_TEXT_JOB" : "DAC_RUN_IMAGE_JOB"/);
assert.match(sidepanel, /async function finishTextOutput/);
assert.match(sidepanel, /verifiedTextTransition\(\{/);

/* Pass B F-3 (2026-08-28). AC-SAFETY used to rest entirely on a regex over
   sidepanel.js source, so renaming a variable or swapping two `if` blocks kept
   the suite green while a text job fell into image persistence. The routing is
   now a pure function, exercised here for real; the run loop is pinned to it by
   the two assertions below. */
const actions = textOutput.DISPATCH_ACTIONS;
const decide = (overrides) => textOutput.dispatchOutcome({ task: "text_reasoning", ok: false, result: null, stopRequested: false, postSubmit: false, ...overrides });

// A text answer may legitimately contain a picture. The job's declared type,
// not the presence of an image, is what decides where the reply goes.
assert.equal(decide({ ok: true, result: { type: "text", text: "answer", image_url: "blob:inline-picture" } }).action, actions.TEXT_OUTPUT, "an inline image cannot divert a text job into image persistence");
assert.equal(decide({ task: "image_generation", ok: true, result: { type: "image", image_url: "blob:generated" } }).action, actions.IMAGE_OUTPUT);
assert.equal(decide({ task: "", ok: true, result: { type: "image", image_url: "blob:generated" } }).action, actions.IMAGE_OUTPUT, "a legacy row with no task_type still routes to the image path");
assert.equal(decide({ task: "image_generation", ok: true, result: { type: "text", text: "no image yet" } }).action, actions.FAILURE, "a text-only reply never counts as a saved image");

// A received answer is never thrown away by a concurrent Stop: it is persisted
// first, and the queue stops afterwards.
assert.equal(decide({ ok: true, result: { type: "text", text: "answer" }, stopRequested: true }).action, actions.TEXT_OUTPUT, "a delivered text response outranks a pending stop");
assert.equal(decide({ stopRequested: true, postSubmit: true }).action, actions.USER_STOP);

// The no-resend guarantee, in the place a test can actually reach it.
const halted = decide({ postSubmit: true });
assert.equal(halted.action, actions.TEXT_HALT_NO_RESEND, "an unresolved submitted text prompt halts instead of reconciling");
assert.equal(halted.completed, true, "the halt ends the attempt loop");
assert.equal(halted.halted, true, "the halt stops the batch rather than retrying the prompt");
assert.equal(decide({ task: "image_generation", postSubmit: true }).action, actions.IMAGE_RECONCILE, "the image path keeps its bounded reconciliation");
assert.equal(decide({}).action, actions.FAILURE, "a pre-submit failure stays retryable");
assert.throws(() => decide({ task: "video_generation" }), /INVALID_TASK_TYPE/);

// The pure decision is worthless if the loop stops calling it, or wires an
// action to the wrong handler. Pass B refresh (N-1) demonstrated the second
// hole is real: swapping finishTextOutput for finishDetectedOutput inside the
// TEXT_OUTPUT branch -- a text job sent straight into image download and
// attribution -- left all 94 worker tests green. Structural, like F-4/F-5,
// because sidepanel.js is one IIFE the suite cannot instantiate.
assert.match(sidepanel, /window\.DacTextOutputCore\.dispatchOutcome\(\{/, "the run loop routes through the tested decision");
assert.match(sidepanel, /postSubmit: window\.DacRunnerCore\.needsReconciliation\(item\.phase\)/, "the dispatch is fed the attempt phase, not a cheaper proxy");
assert.doesNotMatch(sidepanel, /if \(!textReasoning && response\?\.ok && response\.result\?\.image_url\)/, "the untested inline routing is gone");

const branch = (from, to) => sidepanel.slice(sidepanel.indexOf(`actions.${from}`), sidepanel.indexOf(`actions.${to}`));
const imageBranch = branch("IMAGE_OUTPUT", "TEXT_OUTPUT");
const textBranch = branch("TEXT_OUTPUT", "USER_STOP");
const stopBranch = branch("USER_STOP", "TEXT_HALT_NO_RESEND");
const haltBranch = branch("TEXT_HALT_NO_RESEND", "IMAGE_RECONCILE");
assert.match(imageBranch, /finishDetectedOutput\(/, "the image action still reaches the image finisher");
assert.match(textBranch, /finishTextOutput\(/, "the text action reaches the text finisher");
assert.doesNotMatch(textBranch, /finishDetectedOutput|saveGeneratedImage|DAC_RECONCILE_IMAGE_JOB/, "the text action can never reach image download, attribution or reconciliation");
assert.match(stopBranch, /completed = dispatch\.completed; break;/, "a user stop leaves the attempt loop instead of continuing it");
assert.doesNotMatch(stopBranch, /halted = /, "a user stop never clears a halt raised earlier in the run");
assert.match(haltBranch, /markInterrupted\(/, "an unresolved submitted text prompt is marked interrupted");
assert.match(haltBranch, /completed = dispatch\.completed; halted = dispatch\.halted;/, "the halt verdict comes from the tested decision, not a local literal");
assert.doesNotMatch(haltBranch, /resolveJobFailure|reconcileSubmittedAttempt/, "an unresolved submitted text prompt is never retried or reconciled");
assert.doesNotMatch(sidepanel.slice(sidepanel.indexOf("async function finishTextOutput"), sidepanel.indexOf("async function reconcileSubmittedAttempt")), /DAC_RECONCILE_IMAGE_JOB|saveGeneratedImage/);

/* Pass B F-4 and F-5 (2026-08-28). Both fixes live inside sidepanel.js's single
   IIFE, which this suite cannot instantiate, so they are pinned STRUCTURALLY on
   purpose -- weaker than the behavioural checks above, and recorded as such in
   HANDOFF.md rather than being passed off as equivalent.
   F-4: the recreate dialog was task-aware but the recreate ACTION was not, so a
   text-only session was offered "Recreate text response" and then refused for a
   generated-image requirement it could never satisfy.
   F-5: with no workbook loaded, nothing proves the session is text-only, so the
   readiness checklist must not drop the image destination from its check. */
const confirmRecreate = sidepanel.slice(sidepanel.indexOf("RECREATE_CONFIRM_NOT_AMBIGUOUS"), sidepanel.indexOf("RECREATE_START_BLOCKED"));
assert.match(confirmRecreate, /preflight\(state\.outputSettings, \{ requireImage: !recreateTextReasoning \}\)/, "recreating a text response does not demand an image destination");
assert.match(confirmRecreate, /\(!recreateTextReasoning && !effectiveOutput\.saveImages\) \|\| !effectiveOutput\.saveResultXlsx/, "text recreate requires only the Result XLSX");
assert.doesNotMatch(confirmRecreate, /was not checkpointed as a verified saved image\./, "the recreate outcome message is task-accurate");
assert.match(sidepanel, /if \(!state\.workbook && !extra\.length\) return true;/, "an unknown session keeps the strict image-destination check");

const outputLocation = fs.readFileSync(new URL("../output-location-core.js", import.meta.url), "utf8");
vm.runInContext(outputLocation, context, { filename: "output-location-core.js" });
const location = context.window.DacOutputLocation;
const downloadsOnly = location.fromWorkbook({}, "Text-only.xlsx");
const textOnlyCheck = await location.preflight(downloadsOnly, { requireImage: false });
assert.equal(textOnlyCheck.ok, true, "a text-only run preflights without the unused image destination");
assert.equal(textOnlyCheck.checks.length, 1, "a text-only run checks exactly one destination");
assert.equal((await location.preflight(downloadsOnly)).checks.length, 1, "an image run with a shared destination still checks it once");

console.log("text reasoning mode smoke tests: PASS");
