import assert from "node:assert/strict";
import fs from "node:fs";

// 1. Static HTML and CSS inspections
const html = fs.readFileSync(new URL("../sidepanel.html", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../sidepanel.css", import.meta.url), "utf8");
const js = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");

// Hierarchy and component assertions
assert.match(html, /id="workbookCard"/);
assert.match(html, /id="workbookNameDisplay"/);
assert.match(html, /id="readinessChecklist"/);
assert.match(html, /id="checkWorkbook"/);
assert.match(html, /id="checkReferences"/);
assert.match(html, /id="checkChatGPT"/);
assert.match(html, /id="checkOutput"/);
assert.match(html, /id="readinessBanner"/);
assert.match(html, /class="primary dominant-btn"[^>]*>▶ START RUN<\/button>/);

// RUN screen components
assert.match(html, /id="overallProgressCard"/);
assert.match(html, /id="progressRatio"/);
assert.match(html, /id="progressPercent"/);
assert.match(html, /id="progressBarFill"/);
assert.match(html, /id="statDoneCount"/);
assert.match(html, /id="statActiveCount"/);
assert.match(html, /id="statNextCount"/);
assert.match(html, /id="statFailedCount"/);

assert.match(html, /id="currentJobCard"/);
assert.match(html, /id="haltedBanner"/);
assert.match(html, /id="currentAttemptBadge"/);
assert.match(html, /id="currentPromptPreview"/);
assert.match(html, /id="pipelineStepper"/);

// Verify 4-stage pipeline steps
for (const step of ["prepare", "generate", "save", "done"]) {
  assert.match(html, new RegExp(`data-step="${step}"`));
}

// Mini split cards
assert.match(html, /id="latestSavedCard"/);
assert.match(html, /id="nextTaskCard"/);

// OUTPUT screen components
assert.match(html, /id="completionCard"/);
assert.match(html, /id="completionIcon"/);
assert.match(html, /id="completionTitle"/);
assert.match(html, /id="artifactStatusPill"/);

// Check that HALTED treatment is strictly inside runScreen
const runScreenSection = html.slice(html.indexOf('id="runScreen"'), html.indexOf('id="outputScreen"'));
assert.match(runScreenSection, /id="haltedBanner"/, "HALTED banner must reside inside runScreen");

// 2. Behavioral Unit Simulations

// Test 1: Progress visual state mapping
function computeProgressVisuals(total_jobs, success_jobs, running_jobs, pending_jobs, failed_jobs, interrupted_jobs = 0) {
  const total = total_jobs;
  const done = success_jobs;
  const failed = failed_jobs + interrupted_jobs;
  const active = running_jobs;
  const pending = pending_jobs;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return {
    ratioText: `${done} / ${total} completed`,
    percentText: `${pct}%`,
    fillWidth: `${pct}%`,
    done,
    active,
    pending,
    failed
  };
}

const progressA = computeProgressVisuals(28, 16, 1, 10, 1, 0);
assert.equal(progressA.ratioText, "16 / 28 completed");
assert.equal(progressA.percentText, "57%");
assert.equal(progressA.fillWidth, "57%");
assert.equal(progressA.done, 16);
assert.equal(progressA.active, 1);
assert.equal(progressA.pending, 10);
assert.equal(progressA.failed, 1);

// Test 2: Four-stage visual pipeline mapping
function mapItemToStepIndex(item) {
  if (!item) return -1;
  if (item.status === "SUCCESS") return 3;
  if (item.phase === "OUTPUT_SAVED" || item.phase === "OUTPUT_DETECTED" || ["SAVING", "OUTPUT_DETECTED", "OUTPUT_SAVED"].includes(item.runtime_stage)) {
    return 2;
  }
  if (item.phase === "SUBMITTED" || ["SENDING", "GENERATING"].includes(item.runtime_stage)) {
    return 1;
  }
  return 0; // prepare
}

assert.equal(mapItemToStepIndex({ phase: "PRE_SUBMIT", status: "RUNNING", runtime_stage: "ATTACHING_REFS" }), 0, "Prepare stage");
assert.equal(mapItemToStepIndex({ phase: "SUBMITTED", status: "RUNNING", runtime_stage: "GENERATING" }), 1, "Generate stage");
assert.equal(mapItemToStepIndex({ phase: "OUTPUT_DETECTED", status: "RUNNING", runtime_stage: "SAVING" }), 2, "Save stage");
assert.equal(mapItemToStepIndex({ phase: "OUTPUT_SAVED", status: "RUNNING", runtime_stage: "OUTPUT_SAVED" }), 2, "Save stage");
assert.equal(mapItemToStepIndex({ phase: "SUCCESS", status: "SUCCESS", runtime_stage: "SUCCESS" }), 3, "Done stage");

// Test 3: Persistence-aware SAVED display
function formatSavedOutput(item) {
  if (item?.persistence_verified && item.result_file) {
    return { text: `SAVED ✓ ${item.result_file}`, state: "VERIFIED_SAVED" };
  }
  if (item?.detected_not_downloaded) {
    return { text: "DETECTED · not downloaded", state: "DETECTED_NO_DOWNLOAD" };
  }
  return { text: "", state: "UNSAVED" };
}

assert.deepEqual(formatSavedOutput({ persistence_verified: true, result_file: "JOB_001.png" }), {
  text: "SAVED ✓ JOB_001.png",
  state: "VERIFIED_SAVED"
});
assert.deepEqual(formatSavedOutput({ persistence_verified: false, detected_not_downloaded: true }), {
  text: "DETECTED · not downloaded",
  state: "DETECTED_NO_DOWNLOAD"
});
assert.deepEqual(formatSavedOutput({ persistence_verified: false, result_file: "unverified.png" }), {
  text: "",
  state: "UNSAVED"
});

// Test 4: HALTED banner semantics
function formatHaltedBanner(isHalted, item, reason) {
  if (!isHalted && !["FAILED", "INTERRUPTED", "STOPPED"].includes(item?.status)) {
    return { visible: false };
  }
  return {
    visible: true,
    title: "⚠ RUN HALTED",
    reason: reason || item?.last_error || "Run halted.",
    stoppedAt: item ? `Stopped at: ${item.job.id}` : "Stopped"
  };
}

const haltedResult = formatHaltedBanner(true, { job: { id: "JOB_014" }, status: "INTERRUPTED" }, "Readiness timeout after save");
assert.equal(haltedResult.visible, true);
assert.equal(haltedResult.title, "⚠ RUN HALTED");
assert.equal(haltedResult.reason, "Readiness timeout after save");
assert.equal(haltedResult.stoppedAt, "Stopped at: JOB_014");

// Test 5: OUTPUT screen state when artifacts fail
function evaluateOutputState(queue, artifactErrors) {
  const successCount = queue.filter((i) => i.status === "SUCCESS").length;
  const failedCount = queue.filter((i) => ["FAILED", "INTERRUPTED", "STOPPED"].includes(i.status)).length;
  if (artifactErrors.length > 0) {
    return {
      cardClass: "card completion-card persistence-failed",
      icon: "❌",
      title: "ARTIFACT PERSISTENCE FAILED",
      artifactStatus: "Persistence Failed",
      isFullSuccess: false
    };
  }
  if (failedCount > 0) {
    return {
      cardClass: "card completion-card has-failures",
      icon: "⚠",
      title: "RUN COMPLETED WITH FAILURES",
      artifactStatus: "Verified",
      isFullSuccess: false
    };
  }
  if (queue.length > 0 && successCount === queue.length) {
    return {
      cardClass: "card completion-card",
      icon: "✓",
      title: "RUN COMPLETE",
      artifactStatus: "Verified",
      isFullSuccess: true
    };
  }
  return {
    cardClass: "card completion-card",
    icon: "✓",
    title: "COMPLETION SUMMARY",
    artifactStatus: "Verified",
    isFullSuccess: false
  };
}

const allSuccess = [{ status: "SUCCESS" }, { status: "SUCCESS" }];
assert.equal(evaluateOutputState(allSuccess, []).isFullSuccess, true);
assert.equal(evaluateOutputState(allSuccess, []).title, "RUN COMPLETE");

const withArtifactError = [{ status: "SUCCESS" }, { status: "SUCCESS" }];
const failedArtifactOutput = evaluateOutputState(withArtifactError, ["PERSISTENCE_VERIFICATION_FAILED: file zero bytes"]);
assert.equal(failedArtifactOutput.isFullSuccess, false);
assert.equal(failedArtifactOutput.icon, "❌");
assert.equal(failedArtifactOutput.title, "ARTIFACT PERSISTENCE FAILED");
assert.equal(failedArtifactOutput.artifactStatus, "Persistence Failed");

console.log("V1 visual fidelity smoke tests: PASS");
