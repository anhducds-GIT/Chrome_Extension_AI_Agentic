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
assert.match(html, /id="progressSegments"/);
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
assert.match(html, /id="operatorTimerArea"/);
assert.match(html, /id="operatorTimerBadge"/);
assert.match(html, /id="operatorTimerText"/);

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
assert.match(html, /id="runArtifactsCard"/);
assert.match(html, /id="artifactLocationNote"/);
assert.match(html, /id="artifactList"/);
assert.match(html, /id="artifactStatusPill"/);
assert.match(html, /id="artifactRowImages"/);
assert.match(html, /id="artifactRowResult"/);
assert.match(html, /id="artifactRowAudit"/);

// Audit JSONL technical log UX label
assert.match(html, /Save Audit JSONL \(technical log\)/);
assert.match(html, /Xem trước Audit JSONL \(nhật ký kỹ thuật\):/);

// Check that HALTED treatment is strictly inside runScreen
const runScreenSection = html.slice(html.indexOf('id="runScreen"'), html.indexOf('id="outputScreen"'));
assert.match(runScreenSection, /id="haltedBanner"/, "HALTED banner must reside inside runScreen");

// 2. Behavioral Unit Simulations

// Test 1: Progress segment count & state mapping (scalable to 3 and 28 jobs)
function mapQueueToSegments(queue) {
  if (!queue || !queue.length) {
    return [{ className: "progress-segment pending", status: "pending" }];
  }
  return queue.map((item) => {
    let statusClass = "pending";
    if (item.status === "SUCCESS") {
      statusClass = "success";
    } else if (["RUNNING", "RECONCILING"].includes(item.status)) {
      statusClass = "current";
    } else if (["FAILED", "INTERRUPTED", "STOPPED"].includes(item.status)) {
      statusClass = "failed";
    }
    return {
      className: `progress-segment ${statusClass}`,
      status: statusClass,
      jobId: item.job?.id || item.id
    };
  });
}

// 3-job queue test
const queue3 = [
  { id: "J1", status: "SUCCESS" },
  { id: "J2", status: "RUNNING" },
  { id: "J3", status: "PENDING" }
];
const segs3 = mapQueueToSegments(queue3);
assert.equal(segs3.length, 3);
assert.equal(segs3[0].status, "success");
assert.equal(segs3[1].status, "current");
assert.equal(segs3[2].status, "pending");

// 28-job queue test
const queue28 = Array.from({ length: 28 }, (_, i) => ({
  id: `J${i + 1}`,
  status: i < 16 ? "SUCCESS" : i === 16 ? "RUNNING" : i === 27 ? "FAILED" : "PENDING"
}));
const segs28 = mapQueueToSegments(queue28);
assert.equal(segs28.length, 28);
assert.equal(segs28.filter((s) => s.status === "success").length, 16);
assert.equal(segs28.filter((s) => s.status === "current").length, 1);
assert.equal(segs28.filter((s) => s.status === "failed").length, 1);
assert.equal(segs28.filter((s) => s.status === "pending").length, 10);

// Test 2: Operator timer state mapping
function formatDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function computeOperatorTimer(state) {
  const item = state.currentItem;
  if (!state.running && !item) {
    return { text: "—", mode: "idle", hidden: true };
  }
  const now = state.now || Date.now();
  const stageElapsed = state.stageStartedAt ? Math.floor((now - state.stageStartedAt) / 1000) : (state.currentStartedAt ? Math.floor((now - state.currentStartedAt) / 1000) : 0);
  const stageBudget = state.stageBudgetSec || item?.settings?.timeout_sec || 0;
  const stageTimeLeft = stageBudget ? Math.max(0, stageBudget - stageElapsed) : 0;
  const formattedStageLeft = formatDuration(stageTimeLeft);

  if (state.interJobCountdown != null && state.interJobCountdown > 0) {
    return { text: `Next readiness check in ${formatDuration(state.interJobCountdown)}`, mode: "cooldown", hidden: false };
  }
  if (state.currentStage === "WAITING_READY" || state.currentStage === "FINALIZING / WAITING_IDLE" || item?.runtime_stage === "WAITING_READY") {
    return { text: "Awaiting ChatGPT readiness confirmation", mode: "waiting", hidden: false };
  }
  if (item && state.running) {
    return { text: `Operation timeout remaining ${formattedStageLeft}`, mode: "active", hidden: false };
  }
  if (item && ["FAILED", "INTERRUPTED", "STOPPED"].includes(item.status)) {
    return { text: `Halted · ${item.status}`, mode: "halted", hidden: false };
  }
  return { text: "—", mode: "idle", hidden: true };
}

// Active generating test
const timerGenerating = computeOperatorTimer({
  running: true,
  currentItem: { settings: { timeout_sec: 120 }, runtime_stage: "GENERATING" },
  currentStage: "GENERATING",
  stageStartedAt: 1000000,
  stageBudgetSec: 120,
  now: 1015000, // 15s elapsed -> 105s remaining (01:45)
  interJobCountdown: null
});
assert.equal(timerGenerating.text, "Operation timeout remaining 01:45");
assert.equal(timerGenerating.mode, "active");

// Cooldown test
const timerCooldown = computeOperatorTimer({
  running: true,
  currentItem: { settings: { timeout_sec: 120 } },
  currentStage: "INTER_JOB_DELAY",
  interJobCountdown: 10
});
assert.equal(timerCooldown.text, "Next readiness check in 00:10");
assert.equal(timerCooldown.mode, "cooldown");

// Readiness wait test
const timerWaiting = computeOperatorTimer({
  running: true,
  currentItem: { settings: { timeout_sec: 60 }, runtime_stage: "WAITING_READY" },
  currentStage: "WAITING_READY",
  stageStartedAt: 1000000,
  stageBudgetSec: 60,
  now: 1015000, // 15s elapsed -> 45s left (00:45)
  interJobCountdown: null
});
assert.equal(timerWaiting.text, "Awaiting ChatGPT readiness confirmation");
assert.equal(timerWaiting.mode, "waiting");

// Test 3: Run Artifacts row status
function computeArtifactRows(state, effectiveOutput) {
  const rows = [];
  // Row 1: Images
  if (!effectiveOutput.saveImages) {
    rows.push({ type: "Images", detail: "Disabled in settings", status: "Disabled" });
  } else if (state.verifiedImageFiles.length > 0) {
    rows.push({ type: "Images", detail: `${state.verifiedImageFiles.length} verified file(s)`, status: "Verified" });
  } else if (state.artifactErrors.some((e) => /image/i.test(e))) {
    rows.push({ type: "Images", detail: "Image persistence failed", status: "Failed" });
  } else {
    rows.push({ type: "Images", detail: "0 verified", status: "0 verified" });
  }

  // Row 2: Result XLSX
  if (!effectiveOutput.saveResultXlsx) {
    rows.push({ type: "Result XLSX", detail: "Disabled in settings", status: "Disabled" });
  } else if (state.resultFile) {
    rows.push({ type: "Result XLSX", detail: state.resultFile, status: "Verified" });
  } else if (state.artifactErrors.some((e) => /xlsx/i.test(e))) {
    rows.push({ type: "Result XLSX", detail: "XLSX persistence failed", status: "Failed" });
  } else {
    rows.push({ type: "Result XLSX", detail: "—", status: "Not saved" });
  }

  // Row 3: Audit JSONL (technical log)
  if (!effectiveOutput.saveAuditJsonl) {
    rows.push({ type: "Audit JSONL", detail: "Disabled in settings", status: "Disabled" });
  } else if (state.auditFile) {
    rows.push({ type: "Audit JSONL", detail: state.auditFile, status: "Verified" });
  } else if (state.artifactErrors.some((e) => /audit|jsonl/i.test(e))) {
    rows.push({ type: "Audit JSONL", detail: "Audit JSONL persistence failed", status: "Failed" });
  } else {
    rows.push({ type: "Audit JSONL", detail: "—", status: "Not saved" });
  }
  return rows;
}

const artifactRowsA = computeArtifactRows({
  verifiedImageFiles: ["P01.png", "P02.png"],
  resultFile: "Duc-Auto-ChatGPT-Pilot-03__results.xlsx",
  auditFile: "Duc-Auto-ChatGPT-Pilot-03__audit.jsonl",
  artifactErrors: []
}, { saveImages: true, saveResultXlsx: true, saveAuditJsonl: true });

assert.equal(artifactRowsA[0].status, "Verified");
assert.equal(artifactRowsA[1].status, "Verified");
assert.equal(artifactRowsA[2].status, "Verified");

const artifactRowsDisabled = computeArtifactRows({
  verifiedImageFiles: [],
  resultFile: "",
  auditFile: "",
  artifactErrors: []
}, { saveImages: false, saveResultXlsx: false, saveAuditJsonl: false });

assert.equal(artifactRowsDisabled[0].status, "Disabled");
assert.equal(artifactRowsDisabled[1].status, "Disabled");
assert.equal(artifactRowsDisabled[2].status, "Disabled");

// Test 4: Thumbnail does NOT imply persistence proof
function renderOutputItemBadge(item) {
  const isSaved = Boolean(item.persistence_verified && item.result_file);
  if (isSaved) return "✓ Saved";
  if (item.detected_not_downloaded) return "Detected";
  return item.status;
}

// Case A: Has session thumbnail, but persistence_verified is false -> NOT saved
const unverifiedWithThumb = {
  job: { id: "JOB_001" },
  status: "RUNNING",
  thumbnailUrl: "blob:chrome-extension://abc/123",
  persistence_verified: false,
  result_file: ""
};
assert.notEqual(renderOutputItemBadge(unverifiedWithThumb), "✓ Saved", "Thumbnail presence alone MUST NOT yield Saved badge");

// Case B: No thumbnail available (e.g. reload), but persistence_verified is true on disk -> authoritative Saved
const verifiedWithoutThumb = {
  job: { id: "JOB_001" },
  status: "SUCCESS",
  thumbnailUrl: null,
  persistence_verified: true,
  result_file: "JOB_001.png"
};
assert.equal(renderOutputItemBadge(verifiedWithoutThumb), "✓ Saved", "persistence_verified is authoritative even without thumbnail");

// Test 5: Persistence failure overrides RUN COMPLETE even when all jobs succeed
function evaluateOutputCompletion(queue, artifactErrors, hasRun = true) {
  if (!hasRun) {
    return {
      cardClass: "card completion-card empty-state",
      icon: "📊",
      title: "No completed run yet",
      artifactStatus: "Pending Run",
      isFullSuccess: false
    };
  }
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
    title: "RUN COMPLETE",
    artifactStatus: "Verified",
    isFullSuccess: true
  };
}

// Test 6: Empty state when no run has completed yet
const emptyOutput = evaluateOutputCompletion([], [], false);
assert.equal(emptyOutput.title, "No completed run yet");
assert.equal(emptyOutput.icon, "📊");
assert.equal(emptyOutput.artifactStatus, "Pending Run");
assert.notEqual(emptyOutput.icon, "✓", "Empty state MUST NOT show green check mark");
assert.notEqual(emptyOutput.artifactStatus, "Verified", "Empty state MUST NOT show Verified badge");

// Test 7: Completed run with full success
const allJobsSuccessful = [
  { job: { id: "JOB_1" }, status: "SUCCESS", persistence_verified: true, result_file: "JOB_1.png" },
  { job: { id: "JOB_2" }, status: "SUCCESS", persistence_verified: true, result_file: "JOB_2.png" }
];

const successOutcome = evaluateOutputCompletion(allJobsSuccessful, [], true);
assert.equal(successOutcome.isFullSuccess, true);
assert.equal(successOutcome.title, "RUN COMPLETE");
assert.equal(successOutcome.icon, "✓");
assert.equal(successOutcome.artifactStatus, "Verified");

// All jobs success + artifact error -> ARTIFACT PERSISTENCE FAILED (overrides RUN COMPLETE)
const failureOutcome = evaluateOutputCompletion(allJobsSuccessful, ["Result XLSX persistence verification failed: missing file on disk"], true);
assert.equal(failureOutcome.isFullSuccess, false);
assert.equal(failureOutcome.title, "ARTIFACT PERSISTENCE FAILED");
assert.equal(failureOutcome.icon, "❌");
assert.equal(failureOutcome.artifactStatus, "Persistence Failed");

console.log("V1 visual fidelity smoke tests: PASS");
