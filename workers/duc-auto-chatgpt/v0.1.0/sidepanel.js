(() => {
  "use strict";
  const ids = [
    "workbookInput", "referencesInput", "validateBtn", "runBtn", "runFailedBtn", "stopBtn", "statusChip",
    "workbookText", "referenceText", "referenceGallery", "progressText", "progressDetail", "failedJobsText",
    "currentJobId", "currentStage", "currentTiming", "currentSaved", "nextTaskCard", "nextTaskId", "nextTaskCountdown",
    "queueSummary", "queueList", "logList", "clearLogsBtn", "imageOutputText", "resultOutputText", "auditOutputText",
    "outputPermissionText", "imageOutputFolderInput", "resultLocationMode", "resultDownloadsFolderInput",
    "resultDownloadsFolderLabel", "imagePatternInput", "resultFilenameInput", "auditFilenameInput",
    "collisionPolicyInput", "saveImagesInput", "saveResultXlsxInput", "saveAuditJsonlInput",
    "chooseImageFolderBtn", "useSourceFolderBtn", "changeImageFolderBtn", "chooseResultFolderBtn",
    "runPlanList", "timeoutSecInput", "maxRetriesInput", "safetyCooldownInput", "maxInputImagesInput",
    "continueOnErrorInput", "rerunDoneInput", "outputSummaryText", "outputList", "artifactList",
    "openOutputFolderBtn", "loadNewWorkbookBtn", "viewQueueBtn", "viewOutputsBtn",
    "changeWorkbookBtn", "addReferencesBtn", "workbookNameDisplay", "readinessChecklist",
    "checkWorkbook", "statusWorkbook", "checkReferences", "statusReferences",
    "checkChatGPT", "statusChatGPT", "checkOutput", "statusOutput", "readinessBanner",
    "progressRatio", "progressPercent", "progressBarFill", "progressSegments", "statDoneCount", "statActiveCount",
    "statNextCount", "statFailedCount", "haltedBanner", "haltedTime", "haltedReason", "haltedJob",
    "currentAttemptBadge", "currentPromptPreview", "pipelineStepper", "operatorTimerArea",
    "operatorTimerBadge", "operatorTimerText", "latestSavedCard", "latestSavedThumb",
    "latestSavedName", "latestSavedStatus", "completionCard", "completionIcon", "completionTitle",
    "artifactStatusPill", "runArtifactsCard", "artifactLocationNote", "artifactRowImages",
    "artifactImagesDetail", "artifactImagesStatus", "artifactRowResult", "artifactResultDetail",
    "artifactResultStatus", "artifactRowAudit", "artifactAuditDetail", "artifactAuditStatus"
  ];
  const els = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
  const state = {
    workbook: null,
    files: [],
    prepared: null,
    outputSettings: null,
    runtimeOverrides: {},
    selectedJobId: null,
    running: false,
    validated: false,
    stopRequested: false,
    terminal: 0,
    runId: null,
    attemptSerial: 0,
    auditEvents: [],
    auditFile: "",
    resultFile: "",
    verifiedImageFiles: [],
    artifactErrors: [],
    sessionThumbnails: new Map(),
    interJobCountdown: null,
    currentItem: null,
    currentStage: "—",
    currentReason: "No run in progress.",
    currentStartedAt: null,
    stageStartedAt: null,
    stageBudgetSec: null,
    runtimeTicker: null,
    queueExpanded: false,
    outputsExpanded: false
  };
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function setStatus(status, label = status) { els.statusChip.className = `chip ${status.toLowerCase()}`; els.statusChip.textContent = label; }
  function log(text, kind = "") { const li = document.createElement("li"); li.className = kind; li.textContent = `${new Date().toLocaleTimeString()} · ${text}`; els.logList.prepend(li); }

  function renderProgressSegments() {
    if (!els.progressSegments) return;
    const queue = state.prepared?.queue || [];
    els.progressSegments.textContent = "";
    if (!queue.length) {
      const seg = document.createElement("div");
      seg.className = "progress-segment pending";
      seg.style.flex = "1";
      els.progressSegments.appendChild(seg);
      return;
    }
    for (const item of queue) {
      const seg = document.createElement("div");
      let statusClass = "pending";
      if (item.status === "SUCCESS") {
        statusClass = "success";
      } else if (["RUNNING", "RECONCILING"].includes(item.status)) {
        statusClass = "current";
      } else if (["FAILED", "INTERRUPTED", "STOPPED"].includes(item.status)) {
        statusClass = "failed";
      }
      seg.className = `progress-segment ${statusClass}`;
      seg.style.flex = "1";
      seg.title = `${item.job.id}: ${item.status}`;
      els.progressSegments.appendChild(seg);
    }
  }

  function updateProgressVisuals(plan) {
    const total = plan ? plan.total_jobs : (state.prepared?.queue?.length || 0);
    const done = plan ? plan.success_jobs : 0;
    const failed = plan ? (plan.failed_jobs + (plan.interrupted_jobs || 0)) : 0;
    const active = plan ? plan.running_jobs : (state.running ? 1 : 0);
    const pending = plan ? plan.pending_jobs : total;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    if (els.progressRatio) els.progressRatio.textContent = `${done} / ${total} completed`;
    if (els.progressPercent) els.progressPercent.textContent = `${pct}%`;
    if (els.progressBarFill) els.progressBarFill.style.width = `${pct}%`;
    if (els.statDoneCount) els.statDoneCount.textContent = String(done);
    if (els.statActiveCount) els.statActiveCount.textContent = String(active);
    if (els.statNextCount) els.statNextCount.textContent = String(pending);
    if (els.statFailedCount) els.statFailedCount.textContent = String(failed);
    renderProgressSegments();
  }

  function progress(detail) {
    const plan = state.prepared ? window.DacRunnerCore.planSummary(state.prepared.queue, state.prepared.settings) : null;
    const finalizing = state.prepared ? state.prepared.queue.filter((item) => item.result_file && !["SUCCESS", "FAILED", "INTERRUPTED", "STOPPED"].includes(item.status)).length : 0;
    els.progressText.textContent = plan ? `Success ${plan.success_jobs}/${plan.total_jobs} · Saved/finalizing ${finalizing} · Running ${plan.running_jobs} · Pending ${plan.pending_jobs} · Failed ${plan.failed_jobs}${plan.interrupted_jobs ? ` · Interrupted ${plan.interrupted_jobs}` : ""}` : "0 / 0";
    els.progressDetail.textContent = detail;
    updateProgressVisuals(plan);
  }
  function promptFingerprint(prompt) {
    let hash = 2166136261;
    for (const character of String(prompt || "")) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); }
    return `${(hash >>> 0).toString(16).padStart(8, "0")}:${String(prompt || "").length}`;
  }
  function nextAttemptId() {
    state.attemptSerial += 1;
    return `attempt-${Date.now().toString(36)}-${state.attemptSerial.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
  function audit(event, item = null, values = {}) {
    if (!state.runId) return;
    const telemetry = globalThis.DacAttemptTelemetry?.auditFields(item) || {};
    const output = state.outputSettings ? window.DacOutputLocation.effective(state.outputSettings) : null;
    state.auditEvents.push({ timestamp: new Date().toISOString(), run_id: state.runId, job_id: item?.job?.id || null, attempt_id: item?.attempt_id || null, event, attempt: item?.attempt_count ?? null, phase: item?.phase || null, status: item?.status || null, failure_type: item?.failure_type || null, message: values.message || null, elapsed_ms: values.elapsed_ms ?? null, references: item ? item.references.map((file) => file.alias || file.fileName || file.name) : [], requested_filename: item?.requested_file || null, result_file: item?.result_file || null, result_download_id: item?.result_download_id || null, persistence_verified: Boolean(item?.persistence_verified), write_outcome: item?.write_outcome || null, detected_not_downloaded: Boolean(item?.detected_not_downloaded), collision_policy: output?.collisionPolicy || null, prompt_fingerprint: item ? promptFingerprint(item.job.prompt) : null, target_url: values.target_url || null, submitted_at: telemetry.submitted_at || null, detection: telemetry.detection || null });
  }
  function nextTask(item = null, detail = "—") { els.nextTaskCard.hidden = false; els.nextTaskId.textContent = item?.job?.id || "—"; els.nextTaskCountdown.textContent = detail; }
  function nextEligible(currentId = state.currentItem?.job?.id || null) { return window.DacRunState.nextEligible(state.prepared?.queue || [], currentId); }

  function updatePipelineStepper(item) {
    if (!els.pipelineStepper) return;
    const steps = els.pipelineStepper.querySelectorAll(".step-item");
    const lines = els.pipelineStepper.querySelectorAll(".step-line");
    if (!item) {
      steps.forEach((s) => { s.className = "step-item"; });
      lines.forEach((l) => { l.className = "step-line"; });
      return;
    }
    const isFailed = ["FAILED", "INTERRUPTED", "STOPPED"].includes(item.status);
    const isDone = item.status === "SUCCESS";

    let currentStepIndex = 0;
    if (isDone) {
      currentStepIndex = 3;
    } else if (item.phase === "OUTPUT_SAVED" || item.phase === "OUTPUT_DETECTED" || ["SAVING", "OUTPUT_DETECTED", "OUTPUT_SAVED"].includes(item.runtime_stage)) {
      currentStepIndex = 2;
    } else if (item.phase === "SUBMITTED" || ["SENDING", "GENERATING"].includes(item.runtime_stage)) {
      currentStepIndex = 1;
    } else {
      currentStepIndex = 0;
    }

    steps.forEach((s, idx) => {
      s.className = "step-item";
      if (idx < currentStepIndex || (isDone && idx <= currentStepIndex)) {
        s.classList.add("completed");
      } else if (idx === currentStepIndex) {
        s.classList.add(isFailed ? "danger" : "active");
      }
    });

    lines.forEach((l, idx) => {
      l.className = "step-line";
      if (idx < currentStepIndex) {
        l.classList.add("completed");
      }
    });
  }

  function updateOperatorTimer() {
    if (!els.operatorTimerBadge || !els.operatorTimerText) return;
    const item = state.currentItem;
    if (!state.running && !item) {
      if (els.operatorTimerArea) els.operatorTimerArea.hidden = true;
      els.operatorTimerText.textContent = "—";
      return;
    }
    if (els.operatorTimerArea) els.operatorTimerArea.hidden = false;
    const now = Date.now();
    const stageElapsed = state.stageStartedAt ? Math.floor((now - state.stageStartedAt) / 1000) : 0;
    const stageBudget = state.stageBudgetSec || item?.settings?.timeout_sec || 0;
    const stageTimeLeft = stageBudget ? Math.max(0, stageBudget - stageElapsed) : 0;
    const formattedStageLeft = window.DacRunState.formatDuration(stageTimeLeft);

    if (state.interJobCountdown != null && state.interJobCountdown > 0) {
      els.operatorTimerText.textContent = `Next readiness check in ${window.DacRunState.formatDuration(state.interJobCountdown)}`;
      els.operatorTimerBadge.className = "timer-badge cooldown";
    } else if (state.currentStage === "WAITING_READY" || state.currentStage === "FINALIZING / WAITING_IDLE" || item?.runtime_stage === "WAITING_READY") {
      els.operatorTimerText.textContent = `Waiting for ChatGPT ready · ${formattedStageLeft} max`;
      els.operatorTimerBadge.className = "timer-badge waiting";
    } else if (item && state.running) {
      els.operatorTimerText.textContent = `Timeout left ${formattedStageLeft}`;
      els.operatorTimerBadge.className = "timer-badge active";
    } else if (item && ["FAILED", "INTERRUPTED", "STOPPED"].includes(item.status)) {
      els.operatorTimerText.textContent = `Halted · ${item.status}`;
      els.operatorTimerBadge.className = "timer-badge halted";
    } else {
      els.operatorTimerText.textContent = "—";
      els.operatorTimerBadge.className = "timer-badge";
    }
  }

  function updateHaltedBanner(isHalted, item, reason = "") {
    if (!els.haltedBanner) return;
    if (isHalted || ["FAILED", "INTERRUPTED", "STOPPED"].includes(item?.status) || state.currentStage === "HALTED") {
      els.haltedBanner.hidden = false;
      if (els.haltedReason) els.haltedReason.textContent = reason || item?.last_error || state.currentReason || "Run halted.";
      if (els.haltedJob) els.haltedJob.textContent = item ? `Stopped at: ${item.job.id}` : "Stopped";
      if (els.haltedTime && (!els.haltedTime.textContent || els.haltedTime.textContent === "—")) {
        els.haltedTime.textContent = new Date().toLocaleTimeString();
      }
    } else {
      els.haltedBanner.hidden = true;
    }
  }

  function renderRuntime() {
    const item = state.currentItem;
    els.currentJobId.textContent = item ? item.job.id : "—";
    els.currentStage.textContent = item ? state.currentStage || window.DacRunState.stageFor(item) : "—";
    const now = Date.now();
    const jobElapsed = state.currentStartedAt ? Math.floor((now - state.currentStartedAt) / 1000) : 0;
    const stageElapsed = state.stageStartedAt ? Math.floor((now - state.stageStartedAt) / 1000) : 0;
    const stageBudget = state.stageBudgetSec || item?.settings?.timeout_sec || 0;
    const stageTimeLeft = stageBudget ? Math.max(0, stageBudget - stageElapsed) : 0;
    const formattedJobElapsed = window.DacRunState.formatDuration(jobElapsed);
    const formattedStageLeft = window.DacRunState.formatDuration(stageTimeLeft);

    let attemptText = "";
    let attemptBadgeText = "Attempt —";
    if (item) {
      const isRetryEligible = item.status === "RUNNING" && item.phase === "PRE_SUBMIT";
      const attemptLabel = isRetryEligible
        ? `Attempt ${item.attempt_count}/${1 + item.settings.max_retries}`
        : `Attempt ${item.attempt_count}`;
      const flags = [];
      if (!isRetryEligible && (item.phase !== "PRE_SUBMIT" || ["FAILED", "INTERRUPTED", "STOPPED"].includes(item.status))) {
        flags.push("Auto-retry: No");
      }
      if (item.protected_checkpoint) {
        flags.push("Output checkpoint protected");
      }
      const flagsText = flags.length ? ` · ${flags.join(" · ")}` : "";
      attemptText = `${attemptLabel}${flagsText}`;
      attemptBadgeText = attemptText;
    }
    if (els.currentAttemptBadge) els.currentAttemptBadge.textContent = attemptBadgeText;
    if (els.currentPromptPreview) {
      if (item?.job?.prompt) {
        els.currentPromptPreview.hidden = false;
        els.currentPromptPreview.textContent = `“${item.job.prompt.slice(0, 85)}${item.job.prompt.length > 85 ? "…" : ""}”`;
      } else {
        els.currentPromptPreview.hidden = true;
      }
    }

    if (item) {
      const timingParts = [attemptText, `Elapsed ${formattedJobElapsed}`];
      if (stageBudget) {
        timingParts.push(`Stage budget ${formattedStageLeft} remaining`);
      }
      if (state.currentReason) {
        timingParts.push(state.currentReason);
      }
      els.currentTiming.textContent = timingParts.join(" · ");
    } else {
      els.currentTiming.textContent = state.currentReason;
    }

    const saved = item?.persistence_verified ? item.result_file || "" : "";
    els.currentSaved.hidden = !saved && !item?.detected_not_downloaded;
    els.currentSaved.textContent = saved ? `SAVED ✓ ${saved}` : item?.detected_not_downloaded ? "DETECTED · not downloaded" : "";

    updatePipelineStepper(item);
    updateOperatorTimer();

    const isHalted = ["INTERRUPTED", "STOPPED"].includes(item?.status) || state.currentStage === "HALTED";
    updateHaltedBanner(isHalted, item, state.currentReason);

    const lastSavedItem = (state.prepared?.queue || []).slice().reverse().find((i) => i.persistence_verified && i.result_file) || (state.prepared?.queue || []).slice().reverse().find((i) => i.detected_not_downloaded);
    if (els.latestSavedName) {
      if (lastSavedItem) {
        els.latestSavedName.textContent = lastSavedItem.result_file ? window.DacRunnerCore.basename(lastSavedItem.result_file) : "Detected (no download)";
        els.latestSavedStatus.textContent = lastSavedItem.persistence_verified ? `Saved ✓ (${lastSavedItem.job.id})` : "Detected · not downloaded";
        if (els.latestSavedThumb) {
          const thumbUrl = lastSavedItem.thumbnailUrl || state.sessionThumbnails.get(lastSavedItem.job.id);
          if (thumbUrl) {
            els.latestSavedThumb.innerHTML = `<img src="${thumbUrl}" alt="${lastSavedItem.job.id}" class="mini-thumb-img" />`;
          } else {
            els.latestSavedThumb.textContent = "🖼";
          }
        }
      } else {
        els.latestSavedName.textContent = "None yet";
        els.latestSavedStatus.textContent = "—";
        if (els.latestSavedThumb) els.latestSavedThumb.textContent = "🖼";
      }
    }
  }

  function setCurrent(item, stage, reason = "", stageBudgetSec = null) {
    const now = Date.now();
    if (item && state.currentItem !== item) {
      state.currentStartedAt = now;
    }
    if (!item) {
      state.currentStartedAt = null;
      state.stageStartedAt = null;
      state.stageBudgetSec = null;
    } else if (state.currentStage !== stage || state.currentItem !== item || stageBudgetSec != null) {
      state.stageStartedAt = now;
      state.stageBudgetSec = stageBudgetSec || item.settings?.timeout_sec || null;
    }
    state.currentItem = item || null;
    state.currentStage = stage || (item ? window.DacRunState.stageFor(item) : "—");
    state.currentReason = reason || "";
    renderRuntime();
  }
  function startRuntimeTicker() { clearInterval(state.runtimeTicker); state.runtimeTicker = setInterval(renderRuntime, 1000); }
  function stopRuntimeTicker() { clearInterval(state.runtimeTicker); state.runtimeTicker = null; renderRuntime(); }

  function updateReadinessChecklist() {
    if (!els.readinessChecklist) return;
    const hasWorkbook = Boolean(state.workbook && state.prepared);
    const jobsCount = state.prepared?.queue?.length || 0;
    if (els.checkWorkbook) {
      els.checkWorkbook.classList.toggle("ready", hasWorkbook);
      const icon = els.checkWorkbook.querySelector(".check-icon");
      if (icon) icon.textContent = hasWorkbook ? "✓" : "○";
      if (els.statusWorkbook) els.statusWorkbook.textContent = hasWorkbook ? `${jobsCount} job${jobsCount === 1 ? "" : "s"}` : "Not loaded";
    }
    if (els.checkReferences) {
      const refsCount = state.files.length;
      els.checkReferences.classList.add("ready");
      const icon = els.checkReferences.querySelector(".check-icon");
      if (icon) icon.textContent = "✓";
      if (els.statusReferences) els.statusReferences.textContent = refsCount ? `${refsCount} image${refsCount === 1 ? "" : "s"}` : "0 (optional)";
    }
    if (els.checkOutput) {
      const hasOutput = Boolean(state.outputSettings);
      els.checkOutput.classList.toggle("ready", hasOutput);
      const icon = els.checkOutput.querySelector(".check-icon");
      if (icon) icon.textContent = hasOutput ? "✓" : "○";
      if (els.statusOutput) els.statusOutput.textContent = hasOutput ? "Ready" : "Not set";
    }
    if (els.checkChatGPT) {
      getActiveChatGPTTab().then((tab) => {
        const connected = Boolean(tab?.id);
        els.checkChatGPT.classList.toggle("ready", connected);
        const icon = els.checkChatGPT.querySelector(".check-icon");
        if (icon) icon.textContent = connected ? "✓" : "○";
        if (els.statusChatGPT) els.statusChatGPT.textContent = connected ? "Connected" : "Open tab";
      }).catch(() => {});
    }
    if (els.readinessBanner) {
      if (state.validated) {
        els.readinessBanner.className = "readiness-banner ready";
        els.readinessBanner.textContent = "READY TO RUN";
      } else {
        els.readinessBanner.className = "readiness-banner not-ready";
        els.readinessBanner.textContent = state.workbook ? "CHECK PLAN BEFORE RUN" : "LOAD WORKBOOK TO BEGIN";
      }
    }
    if (els.workbookNameDisplay) {
      els.workbookNameDisplay.textContent = state.workbook ? state.workbook.fileName : "No workbook loaded";
    }
  }

  function controls() {
    const ready = Boolean(state.workbook && state.prepared && state.outputSettings && state.validated);
    const outputLocked = !state.workbook || state.running;
    els.validateBtn.disabled = !state.workbook || state.running;
    els.runBtn.disabled = !ready || state.running;
    const eligibleFailed = (state.prepared?.queue || []).some((item) => item.status === "FAILED" && !item.protected_checkpoint);
    els.runFailedBtn.disabled = !ready || state.running || !eligibleFailed;
    els.stopBtn.disabled = !state.running;
    els.workbookInput.disabled = state.running;
    els.referencesInput.disabled = state.running;
    if (els.changeWorkbookBtn) els.changeWorkbookBtn.disabled = state.running;
    if (els.addReferencesBtn) els.addReferencesBtn.disabled = state.running;
    for (const element of [els.imageOutputFolderInput, els.resultLocationMode, els.resultDownloadsFolderInput, els.imagePatternInput, els.resultFilenameInput, els.auditFilenameInput, els.collisionPolicyInput, els.saveImagesInput, els.saveResultXlsxInput, els.saveAuditJsonlInput, els.chooseImageFolderBtn, els.useSourceFolderBtn, els.changeImageFolderBtn, els.chooseResultFolderBtn, els.timeoutSecInput, els.maxRetriesInput, els.safetyCooldownInput, els.maxInputImagesInput, els.continueOnErrorInput, els.rerunDoneInput]) element.disabled = outputLocked;
    if (state.outputSettings?.image?.kind === "directory") els.imageOutputFolderInput.disabled = true;
    if (state.outputSettings?.result?.kind !== "downloads") els.resultDownloadsFolderInput.disabled = true;
    document.querySelectorAll(".workflow-tab").forEach((tab) => {
      if (tab.dataset.screen === "outputScreen") {
        tab.disabled = state.running;
      }
    });
    updateReadinessChecklist();
  }

  function renderQueue() {
    const queue = state.prepared?.queue || [];
    renderProgressSegments();
    els.queueList.textContent = "";
    els.queueSummary.textContent = `${queue.length} job${queue.length === 1 ? "" : "s"}`;
    for (const item of (state.queueExpanded ? queue : queue.slice(0, 6))) {
      const li = document.createElement("li");
      li.className = ["RUNNING", "RECONCILING"].includes(item.status) ? "current" : item.status.toLowerCase();
      const isRetryEligible = item.status === "RUNNING" && item.phase === "PRE_SUBMIT";
      const retryLabel = isRetryEligible
        ? `attempt ${item.attempt_count}/${1 + item.settings.max_retries}`
        : `attempt ${item.attempt_count}${!isRetryEligible && (item.phase !== "PRE_SUBMIT" || ["FAILED", "INTERRUPTED", "STOPPED"].includes(item.status)) ? " · Auto-retry: No" : ""}`;
      const outputText = item.persistence_verified && item.result_file ? ` · SAVED ✓ ${item.result_file}` : item.result_file ? ` · recorded output (not re-verified): ${item.result_file}` : item.detected_not_downloaded ? " · detected_not_downloaded" : "";
      li.textContent = `#${item.number} ${item.job.id}${item.references.length ? ` · refs: ${item.references.map((file) => file.alias || window.DacRunnerCore.basename(file.fileName)).join(", ")}` : " · refs: none"} · ${item.status} · ${window.DacRunState.stageFor(item)} · ${retryLabel}${outputText}${item.protected_checkpoint ? " · Output checkpoint protected" : ""}${item.failure_type ? ` · ${item.failure_type}` : ""}`;
      li.addEventListener("click", () => { state.selectedJobId = item.job.id; renderQueue(); controls(); });
      if (state.selectedJobId === item.job.id) {
        const details = document.createElement("details"); details.open = true;
        const summary = document.createElement("summary"); summary.textContent = "Prompt / effective settings";
        const body = document.createElement("div"); body.textContent = `${item.job.prompt}\nReferences: ${item.references.map((file) => file.alias || file.fileName).join(", ") || "none"}\nTimeout: ${item.settings.timeout_sec}s · Retries: ${item.settings.max_retries} · Cooldown: ${item.settings.safety_cooldown_sec}s\nLast error: ${item.last_error || "—"}`;
        details.append(summary, body); li.appendChild(details);
      }
      els.queueList.appendChild(li);
    }
    const failures = queue.filter((item) => ["FAILED", "INTERRUPTED"].includes(item.status));
    els.failedJobsText.textContent = `Failed / Interrupted: ${failures.length}${failures.length ? ` · ${failures.map((item) => `${item.job.id}: ${item.failure_type || item.last_error || "OTHER"}`).join("; ")}` : ""}`;
    els.viewQueueBtn.textContent = state.queueExpanded ? "Collapse queue" : `View full queue${queue.length > 6 ? ` (${queue.length})` : ""}`;
    renderOutputScreen();
  }

  function renderOutputScreen() {
    if (!els.outputList) return;
    const queue = state.prepared?.queue || [];
    const count = (status) => queue.filter((item) => item.status === status).length;
    const interrupted = count("INTERRUPTED") + count("STOPPED");
    const successCount = count("SUCCESS");
    const failedCount = count("FAILED") + interrupted;
    const hasCompletedRun = Boolean(state.runId || (queue.length > 0 && (successCount > 0 || failedCount > 0)));

    els.outputSummaryText.textContent = hasCompletedRun
      ? (queue.length ? `Total ${queue.length} · Success ${successCount} · Failed ${count("FAILED")}${interrupted ? ` · Interrupted ${interrupted}` : ""}` : "No completed run.")
      : "Complete a run to view results and artifacts.";
    els.outputList.textContent = "";
    for (const item of (state.outputsExpanded ? queue : queue.slice(0, 8))) {
      const li = document.createElement("li");
      li.className = `output-item ${item.status.toLowerCase()}`;
      const thumbUrl = item.thumbnailUrl || state.sessionThumbnails.get(item.job.id);
      const thumbHtml = thumbUrl
        ? `<img src="${thumbUrl}" class="output-thumb-img" alt="${item.job.id}" />`
        : `<span class="output-thumb-placeholder">🖼</span>`;
      const isSaved = Boolean(item.persistence_verified && item.result_file);
      const statusBadge = isSaved
        ? `<span class="output-status-pill success">✓ Saved</span>`
        : item.detected_not_downloaded
          ? `<span class="output-status-pill warning">Detected</span>`
          : `<span class="output-status-pill ${item.status.toLowerCase()}">${item.status}</span>`;
      const fileText = item.result_file ? ` · <span class="output-filename">${item.result_file}</span>` : "";
      li.innerHTML = `${thumbHtml}<div class="output-item-info"><strong>${item.job.id}</strong>${fileText}</div>${statusBadge}`;
      els.outputList.appendChild(li);
    }
    els.viewOutputsBtn.textContent = state.outputsExpanded ? "Collapse outputs" : `View all outputs${queue.length > 8 ? ` (${queue.length})` : ""}`;
    const values = state.outputSettings ? window.DacOutputLocation.effective(state.outputSettings) : null;

    if (els.artifactLocationNote) {
      els.artifactLocationNote.textContent = values ? `Location: ${window.DacOutputLocation.locationLabel(values.image)}` : "Location: Not configured";
    }

    // Row 1: Images
    const imagesSaved = state.verifiedImageFiles.length;
    let imagesStatus = "Disabled";
    let imagesDetail = "Disabled in settings";
    let imagesStatusClass = "disabled";
    if (values?.saveImages) {
      if (imagesSaved > 0) {
        imagesStatus = "Verified";
        imagesDetail = `${imagesSaved} verified file${imagesSaved > 1 ? "s" : ""}`;
        imagesStatusClass = "verified";
      } else if (state.artifactErrors.some((e) => /image/i.test(e))) {
        imagesStatus = "Failed";
        imagesDetail = "Image persistence failed";
        imagesStatusClass = "failed";
      } else {
        imagesStatus = "0 verified";
        imagesDetail = "0 verified";
        imagesStatusClass = "muted";
      }
    }
    if (els.artifactImagesDetail) els.artifactImagesDetail.textContent = imagesDetail;
    if (els.artifactImagesStatus) {
      els.artifactImagesStatus.textContent = imagesStatus;
      els.artifactImagesStatus.className = `artifact-badge ${imagesStatusClass}`;
    }

    // Row 2: Result XLSX
    let resultStatus = "Disabled";
    let resultDetail = "Disabled in settings";
    let resultStatusClass = "disabled";
    if (values?.saveResultXlsx) {
      if (state.resultFile) {
        resultStatus = "Verified";
        resultDetail = state.resultFile;
        resultStatusClass = "verified";
      } else if (state.artifactErrors.some((e) => /xlsx/i.test(e))) {
        resultStatus = "Failed";
        resultDetail = "XLSX persistence failed";
        resultStatusClass = "failed";
      } else {
        resultStatus = "Not saved";
        resultDetail = "—";
        resultStatusClass = "muted";
      }
    }
    if (els.artifactResultDetail) els.artifactResultDetail.textContent = resultDetail;
    if (els.artifactResultStatus) {
      els.artifactResultStatus.textContent = resultStatus;
      els.artifactResultStatus.className = `artifact-badge ${resultStatusClass}`;
    }

    // Row 3: Audit JSONL (technical log)
    let auditStatus = "Disabled";
    let auditDetail = "Disabled in settings";
    let auditStatusClass = "disabled";
    if (values?.saveAuditJsonl) {
      if (state.auditFile) {
        auditStatus = "Verified";
        auditDetail = state.auditFile;
        auditStatusClass = "verified";
      } else if (state.artifactErrors.some((e) => /audit|jsonl/i.test(e))) {
        auditStatus = "Failed";
        auditDetail = "Audit JSONL persistence failed";
        auditStatusClass = "failed";
      } else {
        auditStatus = "Not saved";
        auditDetail = "—";
        auditStatusClass = "muted";
      }
    }
    if (els.artifactAuditDetail) els.artifactAuditDetail.textContent = auditDetail;
    if (els.artifactAuditStatus) {
      els.artifactAuditStatus.textContent = auditStatus;
      els.artifactAuditStatus.className = `artifact-badge ${auditStatusClass}`;
    }

    els.openOutputFolderBtn.disabled = !values || values.image.kind !== "downloads";

    if (els.completionCard) {
      if (!hasCompletedRun) {
        els.completionCard.className = "card completion-card empty-state";
        if (els.completionIcon) els.completionIcon.textContent = "📊";
        if (els.completionTitle) els.completionTitle.textContent = "No completed run yet";
        if (els.outputSummaryText) els.outputSummaryText.textContent = "Complete a run to view results and artifacts.";
        if (els.failedJobsText) els.failedJobsText.textContent = "";
        if (els.artifactStatusPill) {
          els.artifactStatusPill.className = "artifact-status-pill empty";
          els.artifactStatusPill.textContent = "Pending Run";
        }
      } else if (state.artifactErrors.length > 0) {
        els.completionCard.className = "card completion-card persistence-failed";
        if (els.completionIcon) els.completionIcon.textContent = "❌";
        if (els.completionTitle) els.completionTitle.textContent = "ARTIFACT PERSISTENCE FAILED";
        if (els.artifactStatusPill) {
          els.artifactStatusPill.className = "artifact-status-pill failed";
          els.artifactStatusPill.textContent = "Persistence Failed";
        }
      } else if (failedCount > 0) {
        els.completionCard.className = "card completion-card has-failures";
        if (els.completionIcon) els.completionIcon.textContent = "⚠";
        if (els.completionTitle) els.completionTitle.textContent = "RUN COMPLETED WITH FAILURES";
        if (els.artifactStatusPill) {
          els.artifactStatusPill.className = "artifact-status-pill verified";
          els.artifactStatusPill.textContent = "Verified";
        }
      } else if (queue.length > 0 && successCount === queue.length) {
        els.completionCard.className = "card completion-card";
        if (els.completionIcon) els.completionIcon.textContent = "✓";
        if (els.completionTitle) els.completionTitle.textContent = "RUN COMPLETE";
        if (els.artifactStatusPill) {
          els.artifactStatusPill.className = "artifact-status-pill verified";
          els.artifactStatusPill.textContent = "Verified";
        }
      } else {
        els.completionCard.className = "card completion-card";
        if (els.completionIcon) els.completionIcon.textContent = "✓";
        if (els.completionTitle) els.completionTitle.textContent = "RUN COMPLETE";
        if (els.artifactStatusPill) {
          els.artifactStatusPill.className = "artifact-status-pill verified";
          els.artifactStatusPill.textContent = "Verified";
        }
      }
    }
  }

  function renderReferenceGallery() {
    els.referenceGallery.textContent = "";
    for (const [index, file] of state.files.entries()) {
      const row = document.createElement("div"); row.className = "reference-item";
      const image = document.createElement("img"); image.src = file.dataUrl; image.alt = file.fileName;
      const label = document.createElement("label"); label.textContent = file.fileName;
      const alias = document.createElement("input"); alias.value = file.alias || ""; alias.placeholder = "Alias (optional)";
      alias.addEventListener("change", async () => { file.alias = alias.value.trim(); try { await prepare(); } catch (_) { /* prepare renders error */ } });
      const remove = document.createElement("button"); remove.className = "secondary small"; remove.type = "button"; remove.textContent = "Remove";
      remove.addEventListener("click", async () => { state.files.splice(index, 1); await prepare(); renderReferenceGallery(); });
      label.appendChild(alias); row.append(image, label, remove); els.referenceGallery.appendChild(row);
    }
  }

  function outputPlan() { return window.DacOutputLocation.runPlan(state.workbook?.fileName, state.outputSettings); }

  function invalidateValidation(reason = "Configuration changed; validate again before Run.") {
    if (!state.workbook || state.running) return;
    state.validated = false;
    setStatus("IDLE", "NOT VALIDATED");
    progress(reason);
  }

  function renderPlan() {
    els.runPlanList.textContent = "";
    if (!state.workbook || !state.outputSettings) {
      const empty = document.createElement("dd"); empty.textContent = "Open an XLSX to view the run plan."; els.runPlanList.appendChild(empty); return;
    }
    try {
      const plan = outputPlan();
      const execution = state.prepared ? window.DacRunnerCore.planSummary(state.prepared.queue, state.prepared.settings) : null;
      const values = window.DacOutputLocation.effective(state.outputSettings);
      const sample = state.prepared?.queue?.[0];
      const imagePreview = window.DacOutputLocation.renderImageFilename(values.imagePattern, { job_id: sample?.job?.id || "JOB_001", attempt: 1, index: sample?.number || 1 }, "png");
      const rows = [["Source workbook", plan.sourceWorkbook], ["Generated images", `${plan.imageDestination}/${imagePreview}`], ["Result XLSX", plan.resultDestination], ["Audit JSONL", window.DacOutputLocation.fileLabel(values.result, values.auditFilename)], ["Collision", values.collisionPolicy], ["Saves", `images: ${values.saveImages ? "on" : "off"} · XLSX: ${values.saveResultXlsx ? "on" : "off"} · audit: ${values.saveAuditJsonl ? "on" : "off"}`], ["Naming", plan.namingPattern], ["Jobs", execution ? `${execution.total_jobs} total · ${execution.eligible_jobs} eligible · ${execution.skipped_done} skipped DONE · ${execution.failed_jobs} failed · ${execution.pending_jobs} pending` : "—"], ["Attempts", execution ? `${execution.total_max_attempts} maximum total · retry allowance ${execution.retry_allowance}` : "—"], ["Effective settings", state.prepared ? `timeout ${state.prepared.settings.timeout_sec}s · cooldown ${state.prepared.settings.safety_cooldown_sec}s · max refs ${state.prepared.settings.max_input_images}` : "—"]];
      for (const [label, value] of rows) {
        const dt = document.createElement("dt"); dt.textContent = label;
        const dd = document.createElement("dd"); dd.textContent = value;
        els.runPlanList.append(dt, dd);
      }
    } catch (error) {
      const empty = document.createElement("dd"); empty.textContent = error.message; els.runPlanList.appendChild(empty);
    }
  }

  function renderOutput() {
    if (!state.outputSettings || !state.workbook) {
      els.imageOutputText.textContent = "—"; els.resultOutputText.textContent = "—"; els.auditOutputText.textContent = "—"; els.outputPermissionText.textContent = "Open an XLSX to set locations."; renderPlan(); controls(); return;
    }
    try {
      const values = window.DacOutputLocation.effective(state.outputSettings);
      els.imageOutputText.textContent = window.DacOutputLocation.locationLabel(values.image);
      els.resultOutputText.textContent = window.DacOutputLocation.fileLabel(values.result, values.resultFilename);
      els.auditOutputText.textContent = window.DacOutputLocation.fileLabel(values.result, values.auditFilename);
      els.imageOutputFolderInput.value = values.image.kind === "downloads" ? values.image.folder : "";
      els.resultLocationMode.value = state.outputSettings.result?.kind || "same_as_image";
      els.resultDownloadsFolderInput.value = values.result.kind === "downloads" ? values.result.folder : "";
      els.resultDownloadsFolderLabel.hidden = state.outputSettings.result?.kind !== "downloads";
      els.resultFilenameInput.value = values.resultFilename;
      els.imagePatternInput.value = values.imagePattern;
      els.auditFilenameInput.value = values.auditFilename;
      els.collisionPolicyInput.value = values.collisionPolicy;
      els.saveImagesInput.checked = values.saveImages;
      els.saveResultXlsxInput.checked = values.saveResultXlsx;
      els.saveAuditJsonlInput.checked = values.saveAuditJsonl;
      els.outputPermissionText.textContent = values.image.kind === "directory" || values.result.kind === "directory" ? "Custom folder authorization will be checked before Run." : "Explicit Chrome Downloads location.";
    } catch (error) {
      els.outputPermissionText.textContent = error.message;
    }
    renderPlan(); controls();
  }

  async function activeTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/^https:\/\/(chatgpt\.com|chat\.openai\.com)\//i.test(tab.url || "")) throw new Error("Open a normal ChatGPT conversation in the active tab.");
    return tab;
  }

  async function send(message) {
    const tab = await activeTab();
    try { return await chrome.tabs.sendMessage(tab.id, message); }
    catch (_) { throw new Error("HARD_STOP: ChatGPT receiver unavailable. Reload the ChatGPT tab once."); }
  }

  function dataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ fileName: file.name, dataUrl: reader.result });
      reader.onerror = () => reject(reader.error || new Error("Could not read reference image."));
      reader.readAsDataURL(file);
    });
  }

  async function loadFiles() {
    state.files = [];
    for (const file of Array.from(els.referencesInput.files || [])) if (file.type.startsWith("image/")) state.files.push({ ...(await dataUrl(file)), alias: "" });
    els.referenceText.textContent = state.files.length ? `${state.files.length} local reference image(s) selected.` : "No local references selected.";
    renderReferenceGallery();
    await prepare();
  }

  async function openWorkbook() {
    state.workbook = null; state.prepared = null; state.outputSettings = null; state.runtimeOverrides = {}; state.validated = false; state.terminal = 0; renderOutput();
    try {
      state.workbook = await window.DacXlsx.open(els.workbookInput.files?.[0]);
      state.outputSettings = window.DacOutputLocation.fromWorkbook(state.workbook.config, state.workbook.fileName);
      setCurrent(null, "—", "Review the Run Plan before starting.");
      await prepare();
      log(`Opened ${state.workbook.fileName}.`);
    } catch (error) {
      setStatus("ERROR"); els.workbookText.textContent = error.message; log(error.message, "error"); controls();
    }
  }

  async function prepare() {
    if (!state.workbook) return;
    try {
      state.prepared = window.DacRunnerCore.prepare(state.workbook, state.files, state.runtimeOverrides);
      state.terminal = state.prepared.queue.filter((item) => item.status === "SUCCESS" || item.status === "DONE").length;
      const settings = state.prepared.settings;
      els.workbookText.textContent = `${state.workbook.fileName} · ${state.prepared.queue.length} jobs · ${settings.delay_min_sec}-${settings.delay_max_sec}s delay`;
      els.timeoutSecInput.value = settings.timeout_sec; els.maxRetriesInput.value = settings.max_retries; els.safetyCooldownInput.value = settings.safety_cooldown_sec; els.maxInputImagesInput.value = settings.max_input_images; els.continueOnErrorInput.value = String(settings.continue_on_error); els.rerunDoneInput.value = String(settings.rerun_done);
      invalidateValidation(); renderQueue(); renderOutput();
    } catch (error) {
      state.prepared = null; setStatus("ERROR"); progress(error.message); log(error.message, "error"); controls();
    }
  }

  async function chooseDirectory(prompt, target) {
    if (typeof window.showDirectoryPicker !== "function") throw new Error("This Chrome build cannot authorize a folder. Use the explicit Chrome Downloads location or update Chrome.");
    const handle = await window.showDirectoryPicker({ mode: "readwrite" });
    const location = window.DacOutputLocation.directoryLocation(handle, handle.name);
    state.outputSettings[target] = location;
    invalidateValidation();
    els.outputPermissionText.textContent = `${prompt}: ${location.label}.`;
    renderOutput();
  }

  async function useSourceFolder() {
    if (!state.workbook) throw new Error("Open the source XLSX first.");
    if (typeof window.showDirectoryPicker !== "function") throw new Error("This Chrome build cannot authorize the source folder. Use the explicit Chrome Downloads location or update Chrome.");
    const handle = await window.showDirectoryPicker({ mode: "readwrite" });
    const location = window.DacOutputLocation.directoryLocation(handle, handle.name);
    state.outputSettings.image = location;
    state.outputSettings.result = { kind: "same_as_image" };
    invalidateValidation();
    els.outputPermissionText.textContent = `Selected output handle: ${location.label}. Chrome does not expose the workbook's absolute folder path; choose the intended folder explicitly.`;
    renderOutput();
  }

  function setImageDownloadsFolder() {
    try {
      state.outputSettings.image = window.DacOutputLocation.downloadsLocation(els.imageOutputFolderInput.value);
      invalidateValidation();
      els.outputPermissionText.textContent = "Using the explicit Chrome Downloads location.";
      renderOutput();
    } catch (error) { els.outputPermissionText.textContent = error.message; log(error.message, "error"); }
  }

  function setResultLocation() {
    try {
      const mode = els.resultLocationMode.value;
      if (mode === "same_as_image") state.outputSettings.result = { kind: "same_as_image" };
      else if (mode === "downloads") state.outputSettings.result = window.DacOutputLocation.downloadsLocation(els.resultDownloadsFolderInput.value || state.outputSettings.image?.folder || "Duc Auto ChatGPT");
      else state.outputSettings.result = { kind: "directory", handle: null, label: "No authorized result folder selected" };
      invalidateValidation();
      renderOutput();
    } catch (error) { els.outputPermissionText.textContent = error.message; log(error.message, "error"); }
  }

  function setResultDownloadsFolder() {
    if (state.outputSettings.result?.kind !== "downloads") return;
    try { state.outputSettings.result = window.DacOutputLocation.downloadsLocation(els.resultDownloadsFolderInput.value); invalidateValidation(); renderOutput(); }
    catch (error) { els.outputPermissionText.textContent = error.message; log(error.message, "error"); }
  }

  function setResultFilename() {
    try { state.outputSettings.resultFilename = window.DacOutputLocation.safeFilename(els.resultFilenameInput.value, window.DacOutputLocation.baseResultName(state.workbook.fileName)); invalidateValidation(); renderOutput(); }
    catch (error) { els.outputPermissionText.textContent = error.message; log(error.message, "error"); }
  }

  function setArtifactNaming() {
    try {
      state.outputSettings.imagePattern = window.DacOutputLocation.validateImagePattern(els.imagePatternInput.value);
      state.outputSettings.resultFilename = window.DacOutputLocation.safeFilename(els.resultFilenameInput.value, window.DacOutputLocation.baseResultName(state.workbook.fileName));
      state.outputSettings.auditFilename = window.DacOutputLocation.safeFilename(els.auditFilenameInput.value, window.DacOutputLocation.baseAuditName(state.workbook.fileName));
      state.outputSettings.collisionPolicy = window.DacOutputLocation.collisionPolicy(els.collisionPolicyInput.value);
      state.outputSettings.saveImages = els.saveImagesInput.checked;
      state.outputSettings.saveResultXlsx = els.saveResultXlsxInput.checked;
      state.outputSettings.saveAuditJsonl = els.saveAuditJsonlInput.checked;
      invalidateValidation(); renderOutput(); renderOutputScreen();
    } catch (error) { els.outputPermissionText.textContent = error.message; log(error.message, "error"); }
  }

  async function updateRuntimeOverrides() {
    if (!state.workbook) return;
    state.runtimeOverrides = {
      timeout_sec: els.timeoutSecInput.value,
      max_retries: els.maxRetriesInput.value,
      safety_cooldown_sec: els.safetyCooldownInput.value,
      max_input_images: els.maxInputImagesInput.value,
      continue_on_error: els.continueOnErrorInput.value,
      rerun_done: els.rerunDoneInput.value
    };
    invalidateValidation();
    await prepare();
  }

  async function authoritativeValidate() {
    if (!state.workbook) throw new Error("Open an XLSX workbook first.");
    state.prepared = window.DacRunnerCore.prepare(state.workbook, state.files, state.runtimeOverrides);
    const locationPreflight = await window.DacOutputLocation.preflight(state.outputSettings);
    if (!locationPreflight.ok) throw new Error(`OUTPUT_LOCATION: ${locationPreflight.error}`);
    const ping = await send({ type: "DAC_PING" });
    if (!ping?.composerFound || ping.generating || ping.busy || ping.securityBlocker) throw new Error(ping.securityBlocker ? `HARD_STOP: ${ping.securityBlocker}` : "ChatGPT must be reachable, idle, and show its composer.");
    els.outputPermissionText.textContent = "Output-location preflight passed.";
    return locationPreflight.effective;
  }

  async function validate() {
    try { await authoritativeValidate(); state.validated = true; setStatus("DONE", "READY TO RUN"); progress("Validation passed. Ready to run."); renderQueue(); log("Validation passed, including output write permission.", "done"); }
    catch (error) { setStatus("ERROR"); progress(error.message); log(error.message, "error"); }
    controls();
  }

  function imageExtensionFromUrl(url) {
    const dataMime = /^data:image\/(avif|gif|jpe?g|png|webp)/i.exec(url || "")?.[1];
    if (dataMime) return dataMime.toLowerCase().replace("jpeg", "jpg");
    try {
      const parsed = new URL(url);
      const fromPath = /\.(avif|gif|jpe?g|png|webp)$/i.exec(parsed.pathname)?.[1];
      const fromQuery = parsed.searchParams.get("format") || parsed.searchParams.get("fm");
      return String(fromPath || fromQuery || "png").toLowerCase().replace("jpeg", "jpg");
    } catch (_) { return "png"; }
  }

  function download(url, jobId, outputFolder, filename, collisionPolicy) {
    return new Promise((resolve) => chrome.runtime.sendMessage({ type: "DAC_DOWNLOAD_IMAGE", url, jobId, outputFolder, filename, collisionPolicy }, resolve));
  }

  async function saveGeneratedImage(url, item, location) {
    const values = window.DacOutputLocation.effective(state.outputSettings);
    const extension = imageExtensionFromUrl(url);
    const requested = window.DacOutputLocation.renderImageFilename(values.imagePattern, { job_id: item.job.id, attempt: item.attempt_count, index: item.number }, extension);
    if (location.kind === "downloads") return download(url, item.job.id, location.folder, `${location.folder}/${requested}`, values.collisionPolicy);
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) throw new Error(`Could not fetch the generated image for the selected folder (${response.status}).`);
    const blob = await response.blob();
    if (!blob.size) throw new Error("Generated image download was empty.");
    const actual = await window.DacOutputLocation.writeFileWithPolicy(location.handle, window.DacOutputLocation.renderImageFilename(values.imagePattern, { job_id: item.job.id, attempt: item.attempt_count, index: item.number }, window.DacOutputLocation.actualExtension(blob, extension)), blob, values.collisionPolicy);
    return { ok: true, filename: window.DacOutputLocation.fileLabel(location, actual.filename), download_id: null, storage: "directory", write_outcome: actual.outcome };
  }

  function update(item, values) {
    if (Object.hasOwn(values, "status")) item.status = values.status;
    if (Object.hasOwn(values, "attempt_phase")) item.phase = values.attempt_phase;
    if (Object.hasOwn(values, "result_file")) item.result_file = values.result_file;
    if (Object.hasOwn(values, "result_download_id")) item.result_download_id = values.result_download_id;
    if (Object.hasOwn(values, "persistence_verified")) item.persistence_verified = Boolean(values.persistence_verified);
    if (Object.hasOwn(values, "requested_file")) item.requested_file = values.requested_file;
    if (Object.hasOwn(values, "write_outcome")) item.write_outcome = values.write_outcome;
    if (Object.hasOwn(values, "detected_not_downloaded")) item.detected_not_downloaded = Boolean(values.detected_not_downloaded);
    if (Object.hasOwn(values, "failure_type")) item.failure_type = values.failure_type;
    if (Object.hasOwn(values, "last_error")) item.last_error = values.last_error;
    if (Object.hasOwn(values, "submitted_at")) item.submitted_at = values.submitted_at || "";
    if (Object.hasOwn(values, "detection_diagnostics")) item.detection_diagnostics = values.detection_diagnostics || "";
    window.DacXlsx.updateJob(state.workbook, item.job, values);
  }

  function applyAttemptTelemetry(item, attempt) {
    const fields = globalThis.DacAttemptTelemetry?.fieldsFromAttempt(attempt) || {};
    if (Object.keys(fields).length) update(item, fields);
  }

  function snapshotOutputSettings(actualResultFilename = null, actualAuditFilename = state.auditFile || null) {
    const plan = outputPlan();
    const settings = state.prepared.settings;
    const effectiveResult = window.DacOutputLocation.effective(state.outputSettings).result;
    const actual = String(actualResultFilename || "");
    const resultDestination = actual ? (/^(?:[A-Za-z]:[\\/]|\/)/.test(actual) || actual.startsWith(window.DacOutputLocation.locationLabel(effectiveResult)) ? actual : window.DacOutputLocation.fileLabel(effectiveResult, actual)) : plan.resultDestination;
    const output = window.DacOutputLocation.effective(state.outputSettings);
    const snapshot = { effective_source_workbook: plan.sourceWorkbook, effective_image_output: plan.imageDestination, effective_result_xlsx: resultDestination, effective_image_naming: output.imagePattern, effective_collision_policy: output.collisionPolicy, effective_save_images: output.saveImages, effective_save_result_xlsx: output.saveResultXlsx, effective_save_audit_jsonl: output.saveAuditJsonl, effective_audit_log: actualAuditFilename || "", effective_timeout_sec: settings.timeout_sec, effective_max_retries: settings.max_retries, effective_safety_cooldown_sec: settings.safety_cooldown_sec, effective_max_input_images: settings.max_input_images, effective_continue_on_error: settings.continue_on_error, effective_rerun_done: settings.rerun_done };
    window.DacXlsx.updateConfigSnapshot(state.workbook, snapshot);
    for (const item of state.prepared.queue) update(item, snapshot);
  }

  async function saveLedger(location) {
    const values = window.DacOutputLocation.effective(state.outputSettings);
    if (!values.saveResultXlsx) return "";
    let filename = values.resultFilename;
    if (location.kind === "directory") {
      const blob = window.DacXlsx.downloadBlob(state.workbook);
      const written = await window.DacOutputLocation.writeFileWithPolicy(location.handle, filename, blob, values.collisionPolicy);
      snapshotOutputSettings(written.filename); const actual = window.DacOutputLocation.fileLabel(location, written.filename);
      log(`Result ledger ${written.outcome}: ${actual}.`, "done"); return actual;
    }
    const blob = window.DacXlsx.downloadBlob(state.workbook);
    const objectUrl = URL.createObjectURL(blob);
    try {
      await assertDownloadCollisionPolicy(location, filename, values.collisionPolicy);
      const downloadId = await chrome.downloads.download({ url: objectUrl, filename: `${location.folder}/${filename}`, conflictAction: values.collisionPolicy === "fail" ? "uniquify" : values.collisionPolicy, saveAs: false });
      const item = await waitForCompletedDownload(downloadId);
      snapshotOutputSettings(item.filename);
      log(`Result ledger downloaded: ${item.filename}.`, "done");
      return item.filename;
    } finally { setTimeout(() => URL.revokeObjectURL(objectUrl), 1000); }
  }

  async function saveAuditLog(location) {
    const values = window.DacOutputLocation.effective(state.outputSettings);
    if (!values.saveAuditJsonl) return "";
    const payload = state.auditEvents.map((event) => JSON.stringify(event)).join("\n") + (state.auditEvents.length ? "\n" : "");
    const blob = new Blob([payload], { type: "application/jsonl" });
    const requested = values.auditFilename;
    if (location.kind === "directory") {
      const written = await window.DacOutputLocation.writeFileWithPolicy(location.handle, requested, blob, values.collisionPolicy);
      return window.DacOutputLocation.fileLabel(location, written.filename);
    }
    const objectUrl = URL.createObjectURL(blob);
    try {
      await assertDownloadCollisionPolicy(location, requested, values.collisionPolicy);
      const downloadId = await chrome.downloads.download({ url: objectUrl, filename: `${location.folder}/${requested}`, conflictAction: values.collisionPolicy === "fail" ? "uniquify" : values.collisionPolicy, saveAs: false });
      const item = await waitForCompletedDownload(downloadId);
      return item.filename;
    } finally { setTimeout(() => URL.revokeObjectURL(objectUrl), 1000); }
  }

  async function assertDownloadCollisionPolicy(location, filename, policy) {
    if (policy !== "fail") return;
    const requested = `${location.folder}/${filename}`.replace(/\//g, "\\").toLowerCase();
    const matches = await chrome.downloads.search({ filename: `${location.folder}/${filename}` });
    if (matches.some((item) => item.state === "complete" && String(item.filename || "").toLowerCase().endsWith(requested))) throw new Error(`COLLISION: Output already exists: ${filename}`);
  }

  async function waitForCompletedDownload(downloadId, timeoutMs = 120000) {
    const lookup = async () => (await chrome.downloads.search({ id: downloadId }))?.[0] || null;
    const current = await lookup();
    if (current?.state === "complete" && current.filename) return current;
    if (current?.state === "interrupted") throw new Error(`Result XLSX download failed: ${current.error || "interrupted"}.`);
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (callback, value) => { if (!settled) { settled = true; clearTimeout(timer); chrome.downloads.onChanged.removeListener?.(listener); callback(value); } };
      const listener = async (delta) => {
        if (delta?.id !== downloadId || (!delta.state && !delta.filename)) return;
        try {
          const item = await lookup();
          if (item?.state === "complete" && item.filename) finish(resolve, item);
          else if (item?.state === "interrupted") finish(reject, new Error(`Result XLSX download failed: ${item.error || "interrupted"}.`));
        } catch (error) { finish(reject, error); }
      };
      const timer = setTimeout(() => finish(reject, new Error("Timed out waiting for the final result-XLSX filename.")), timeoutMs);
      chrome.downloads.onChanged.addListener(listener);
      lookup().then((item) => {
        if (item?.state === "complete" && item.filename) finish(resolve, item);
        else if (item?.state === "interrupted") finish(reject, new Error(`Result XLSX download failed: ${item.error || "interrupted"}.`));
      }).catch((error) => finish(reject, error));
    });
  }

  async function countdown(seconds, item) {
    for (const remaining of window.DacRunnerCore.countdownValues(seconds)) {
      if (state.stopRequested) break;
      state.interJobCountdown = remaining;
      const targetTime = new Date(Date.now() + remaining * 1000).toLocaleTimeString();
      nextTask(item, `Inter-job delay · Earliest next prompt: ${targetTime} · readiness check in ${window.DacRunState.formatDuration(remaining)}`);
      renderRuntime();
      await sleep(1000);
    }
    state.interJobCountdown = null;
    renderRuntime();
  }

  async function waitForChatReady(item) {
    const response = await send({ type: "DAC_WAIT_CHAT_READY", timeoutMs: item.settings.timeout_sec * 1000, safetyCooldownSec: item.settings.safety_cooldown_sec, outputVerified: true });
    if (!response?.ok) throw new Error(response?.error || "ChatGPT did not become ready for the next job.");
  }

  function imageLocationFor(item, effectiveOutput) {
    return effectiveOutput.image.kind === "downloads" ? window.DacOutputLocation.downloadsLocation(item.settings.output_folder) : effectiveOutput.image;
  }

  function messageOf(error) { return error?.message || String(error); }
  function persistenceFailureType(error) { return /^PERSISTENCE_VERIFICATION_FAILED:/.test(messageOf(error)) ? "PERSISTENCE_VERIFICATION_FAILED" : window.DacRunnerCore.classifyFailure(error, state.currentItem?.phase); }
  function matchesAttempt(response, item) { return Boolean(response?.attempt && response.attempt.job_id === item.job.id && response.attempt.attempt_id === item.attempt_id); }

  function markInterrupted(item, failureType, message) {
    const now = new Date().toISOString();
    update(item, { status: "INTERRUPTED", attempt_phase: item.phase, attempt_count: item.attempt_count, retry_count: item.retry_count, failure_type: failureType, last_error: message, error: message, completed_at: now });
    audit("FAILURE", item, { message }); audit("JOB_INTERRUPTED", item, { message });
    log(`${item.job.id} interrupted: ${failureType}: ${message}`, "error");
    setCurrent(item, "INTERRUPTED", failureType);
    renderQueue(); progress(`${item.job.id} interrupted after ${item.phase}.`);
  }

  async function finishDetectedOutput(item, result, effectiveOutput) {
    item.phase = "OUTPUT_DETECTED";
    item.runtime_stage = "OUTPUT_DETECTED"; setCurrent(item, item.runtime_stage, "Attributable generated image found.", item.settings.timeout_sec);
    audit("OUTPUT_DETECTED", item);
    update(item, { status: "RUNNING", attempt_phase: item.phase, attempt_count: item.attempt_count, retry_count: item.retry_count });
    if (result?.image_url) {
      item.thumbnailUrl = result.image_url;
      state.sessionThumbnails.set(item.job.id, result.image_url);
    }
    try {
      item.runtime_stage = "SAVING"; setCurrent(item, item.runtime_stage, "Writing generated image to the configured output.", item.settings.timeout_sec);
      if (!result?.image_url) throw new Error("No attributable generated image was found.");
      if (item.references.some((reference) => reference.dataUrl === result.image_url)) throw new Error("INPUT_IMAGE_FALSE_POSITIVE: output URL matches a selected reference image.");
      if (!effectiveOutput.saveImages) {
        item.phase = "OUTPUT_SAVED";
        item.detected_not_downloaded = true;
        update(item, { status: "RUNNING", attempt_phase: item.phase, requested_file: window.DacOutputLocation.renderImageFilename(effectiveOutput.imagePattern, { job_id: item.job.id, attempt: item.attempt_count, index: item.number }, imageExtensionFromUrl(result.image_url)), persistence_verified: false, detected_not_downloaded: true, result_file: "", result_download_id: "", write_outcome: "detected_not_downloaded", detection_diagnostics: JSON.stringify(result?.detection || {}) });
        audit("DETECTED_NOT_DOWNLOADED", item, { message: "Attributable image detected; generated-image download is disabled." });
        item.runtime_stage = "OUTPUT_SAVED"; setCurrent(item, item.runtime_stage, "Image detected; download disabled.");
        renderQueue(); progress(`${item.job.id} detected; image download disabled.`);
      } else {
        const accepted = await saveGeneratedImage(result.image_url, item, imageLocationFor(item, effectiveOutput));
        if (!accepted?.ok) throw new Error(accepted?.message || accepted?.error || "Image output was not accepted.");
        item.phase = "OUTPUT_SAVED";
        const outputSavedAt = new Date().toISOString();
        update(item, { status: "RUNNING", attempt_phase: item.phase, requested_file: window.DacOutputLocation.renderImageFilename(effectiveOutput.imagePattern, { job_id: item.job.id, attempt: item.attempt_count, index: item.number }, imageExtensionFromUrl(result.image_url)), persistence_verified: true, detected_not_downloaded: false, result_file: accepted.filename, result_download_id: accepted.download_id ?? "", output_saved_at: outputSavedAt, write_outcome: accepted.write_outcome || "written", attempt_count: item.attempt_count, retry_count: item.retry_count, failure_type: "", last_error: "", error: "" });
        state.verifiedImageFiles.push(accepted.filename);
        audit("OUTPUT_SAVED", item, { message: `write_outcome=${accepted.write_outcome || "written"}` });
        item.runtime_stage = "OUTPUT_SAVED"; setCurrent(item, item.runtime_stage, "Image checkpoint recorded; waiting for ChatGPT to become idle.");
        renderQueue(); progress(`SAVED ✓ ${accepted.filename}`);
      }
    } catch (error) {
      markInterrupted(item, persistenceFailureType(error), messageOf(error));
      return { completed: true, halted: true };
    }
    try {
      item.runtime_stage = "FINALIZING / WAITING_IDLE"; setCurrent(item, item.runtime_stage, "No new prompt can start until ChatGPT is idle.", item.settings.timeout_sec);
      await waitForChatReady(item);
      item.phase = "CHAT_READY"; audit("CHAT_READY", item);
      item.phase = "SUCCESS";
      item.runtime_stage = "SUCCESS"; setCurrent(item, item.runtime_stage, "Saved image and idle readiness confirmed.");
      update(item, { status: "SUCCESS", attempt_phase: item.phase, result_file: item.result_file, result_download_id: item.result_download_id, attempt_count: item.attempt_count, retry_count: item.retry_count, failure_type: "", last_error: "", error: "", completed_at: new Date().toISOString() });
      audit("JOB_SUCCESS", item); log(`${item.job.id} success after CHAT_READY.`, "done"); renderQueue(); progress(`${item.job.id} complete; saved output is checkpointed.`);
      return { completed: true, halted: false };
    } catch (error) {
      markInterrupted(item, window.DacRunnerCore.classifyFailure(error, "OUTPUT_SAVED"), messageOf(error));
      return { completed: true, halted: true };
    }
  }

  async function reconcileSubmittedAttempt(item, effectiveOutput, message) {
    item.status = "RECONCILING"; item.phase = "SUBMITTED";
    update(item, { status: "RECONCILING", attempt_phase: item.phase, attempt_count: item.attempt_count, retry_count: item.retry_count, failure_type: "", last_error: "", error: "" });
    audit("RECONCILE_START", item, { message }); renderQueue(); progress(`Reconciling ${item.job.id}; it will not be resubmitted.`);
    let response;
    try { response = await send({ type: "DAC_RECONCILE_IMAGE_JOB", job_id: item.job.id, attempt_id: item.attempt_id, timeoutMs: Math.min(item.settings.timeout_sec * 1000, 60000) }); }
    catch (error) { markInterrupted(item, "POST_SUBMIT_UNCERTAIN", messageOf(error)); return { completed: true, halted: true }; }
    if (!matchesAttempt(response, item)) { markInterrupted(item, "ATTEMPT_ID_MISMATCH", "Attempt identity mismatch during reconciliation."); return { completed: true, halted: true }; }
    applyAttemptTelemetry(item, response.attempt);
    if (response?.ok && response.result?.image_url) {
      audit("RECONCILE_RESULT", item, { message: "Late attributable output found." });
      return finishDetectedOutput(item, response.result, effectiveOutput);
    }
    const failureType = window.DacRunnerCore.classifyFailure(response?.error || message || "Post-submit output remained uncertain.", "SUBMITTED");
    audit("RECONCILE_RESULT", item, { message: response?.error || message || "No attributable output found." });
    markInterrupted(item, failureType === "TIMEOUT_AFTER_SUBMIT" ? "POST_SUBMIT_UNCERTAIN" : failureType, response?.error || message || "Post-submit output remained uncertain.");
    return { completed: true, halted: true };
  }

  async function gateNextJob(item) {
    item.status = "RECONCILING"; item.phase = "PRE_SUBMIT";
    item.runtime_stage = "WAITING_READY";
    setCurrent(item, item.runtime_stage, "Checking ChatGPT readiness before prompt submission.", item.settings.timeout_sec);
    nextTask(nextEligible(item.job.id), "Awaiting ChatGPT readiness confirmation.");
    update(item, { status: "RECONCILING", attempt_phase: item.phase, failure_type: "", last_error: "", error: "" });
    audit("RECONCILE_START", item, { message: "Pre-submit ChatGPT readiness gate." }); renderQueue();
    try {
      await waitForChatReady(item);
      audit("RECONCILE_RESULT", item, { message: "ChatGPT is idle and ready." });
      return true;
    } catch (error) {
      markInterrupted(item, window.DacRunnerCore.classifyFailure(error, "PRE_SUBMIT"), messageOf(error));
      return false;
    }
  }

  async function run(mode = "all") {
    let effectiveOutput;
    try { effectiveOutput = await authoritativeValidate(); }
    catch (error) { setStatus("ERROR"); progress(messageOf(error)); log(messageOf(error), "error"); controls(); return; }
    const runQueue = window.DacRunnerCore.selectQueue(state.prepared.queue, mode, state.selectedJobId);
    if (!runQueue.length) { setStatus("ERROR", "NOT READY"); progress(`No ${mode} jobs are eligible.`); controls(); return; }
    state.running = true; state.stopRequested = false; state.terminal = state.prepared.queue.filter((item) => item.status === "SUCCESS").length;
    showScreen("runScreen");
    state.runId = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`; state.attemptSerial = 0; state.auditEvents = []; state.auditFile = ""; state.resultFile = ""; state.verifiedImageFiles = []; state.artifactErrors = [];
    els.logList.textContent = "";
    startRuntimeTicker();
    const target = await activeTab().catch(() => null);
    audit("RUN_START", null, { target_url: target?.url || null }); log("Run started; visible log is scoped to this run.");
    setStatus("RUNNING"); renderQueue(); controls();
    const settings = state.prepared.settings; let halted = false;
    try {
      snapshotOutputSettings();
      for (let runIndex = 0; runIndex < runQueue.length; runIndex += 1) {
        const item = runQueue[runIndex];
        if (state.stopRequested) break;
        let completed = false;
        while (!completed && !state.stopRequested) {
          if (!(await gateNextJob(item))) { halted = true; completed = true; break; }
          item.status = "RUNNING"; item.phase = "PRE_SUBMIT"; item.attempt_count += 1;
          item.runtime_stage = item.references.length ? "ATTACHING_REFS" : "SENDING";
          item.attempt_id = nextAttemptId();
          const rerunReset = item.deliberate_rerun ? { result_file: "", result_download_id: "", output_saved_at: "" } : {};
          update(item, { ...rerunReset, status: "RUNNING", attempt_id: item.attempt_id, attempt_phase: item.phase, attempt_count: item.attempt_count, retry_count: item.retry_count, failure_type: "", last_error: "", error: "" });
          item.deliberate_rerun = false;
          audit("JOB_START", item); setCurrent(item, item.runtime_stage, item.references.length ? `Preparing ${item.references.length} reference image(s).` : "Preparing prompt submission."); renderQueue(); nextTask(nextEligible(item.job.id), "Waiting for current job to finish."); progress(`Running ${item.job.id}…`);
          let response;
          try { response = await send({ type: "DAC_RUN_IMAGE_JOB", job_id: item.job.id, attempt_id: item.attempt_id, prompt: item.job.prompt, timeoutMs: item.settings.timeout_sec * 1000, referenceImages: item.references }); }
          catch (error) { response = { ok: false, error: messageOf(error), attempt: { job_id: item.job.id, attempt_id: item.attempt_id, phase: "PRE_SUBMIT", submittedAt: null } }; }
          if (!matchesAttempt(response, item)) { markInterrupted(item, "ATTEMPT_ID_MISMATCH", "Attempt identity mismatch from ChatGPT content receiver."); completed = true; halted = true; break; }
          applyAttemptTelemetry(item, response.attempt);
          if (response?.attempt?.submittedAt || response?.attempt?.phase === "SUBMITTED" || response?.attempt?.phase === "OUTPUT_DETECTED") {
            item.phase = "SUBMITTED";
            if (item.references.length) audit("ATTACHMENTS_READY", item);
            audit("PROMPT_SUBMITTED", item, { target_url: target?.url || null });
          }
          if (response?.ok && response.result?.image_url) {
            const outcome = await finishDetectedOutput(item, response.result, effectiveOutput);
            completed = outcome.completed; halted ||= outcome.halted;
            continue;
          }
          const failureType = state.stopRequested ? "USER_STOP" : window.DacRunnerCore.classifyFailure(response?.error || "No attributable generated image was found.", item.phase);
          if (state.stopRequested) {
            update(item, { status: "STOPPED", attempt_phase: item.phase, attempt_count: item.attempt_count, retry_count: item.retry_count, failure_type: failureType, last_error: response?.error || "Stopped by user.", error: response?.error || "Stopped by user.", completed_at: new Date().toISOString() });
            audit("FAILURE", item, { message: response?.error || "Stopped by user." }); completed = true; break;
          }
          if (window.DacRunnerCore.needsReconciliation(item.phase)) {
            const outcome = await reconcileSubmittedAttempt(item, effectiveOutput, response?.error || failureType);
            completed = outcome.completed; halted ||= outcome.halted;
            continue;
          }
          if (window.DacRunnerCore.canRetry(item, failureType)) {
            item.retry_count += 1;
            update(item, { status: "PENDING", attempt_phase: "PRE_SUBMIT", attempt_count: item.attempt_count, retry_count: item.retry_count, failure_type: failureType, last_error: response?.error || failureType, error: response?.error || failureType });
            audit("FAILURE", item, { message: response?.error || failureType }); log(`${item.job.id} ${failureType}; retry ${item.retry_count}/${item.settings.max_retries} before any submission.`, "error"); renderQueue();
            await sleep(window.DacRunnerCore.retryCooldown(item.settings, item.retry_count) * 1000); continue;
          }
          update(item, { status: "FAILED", attempt_phase: "PRE_SUBMIT", attempt_count: item.attempt_count, retry_count: item.retry_count, failure_type: failureType, last_error: response?.error || failureType, error: response?.error || failureType, completed_at: new Date().toISOString() });
          audit("FAILURE", item, { message: response?.error || failureType }); log(`${item.job.id} failed: ${failureType}: ${response?.error || failureType}`, "error"); completed = true;
          if (failureType === "SECURITY_HARD_STOP" || failureType === "RECEIVER_LOST" || !settings.continue_on_error) halted = true;
        }
        state.terminal += 1; renderQueue();
        if (halted) break;
        const nextItem = runQueue[runIndex + 1] || null;
        if (!state.stopRequested && item.status === "SUCCESS" && nextItem) {
          const delay = window.DacRunnerCore.delaySeconds(settings);
          nextTask(nextItem, `Inter-job delay · ${delay}s before readiness check.`);
          await countdown(delay, nextItem);
        }
      }
      nextTask(null, "—"); setStatus(state.stopRequested ? "IDLE" : halted ? "ERROR" : "DONE", state.stopRequested ? "STOPPED" : halted ? "HALTED" : "DONE"); progress(state.stopRequested ? "Stopped. No later jobs were submitted." : halted ? "Batch halted after a protected terminal state." : "Queue complete.");
    } finally {
      audit("RUN_END", null, { message: state.stopRequested ? "STOPPED" : halted ? "HALTED" : "COMPLETE" });
      let artifactPersistenceFailed = false;
      try { state.auditFile = await saveAuditLog(effectiveOutput.result); snapshotOutputSettings(null, state.auditFile); if (state.auditFile) log(`Audit log verified: ${state.auditFile}.`, "done"); }
      catch (error) { artifactPersistenceFailed = true; state.artifactErrors.push(`Audit JSONL persistence verification failed: ${messageOf(error)}`); log(`Audit log failed: ${messageOf(error)}`, "error"); }
      try { state.resultFile = await saveLedger(effectiveOutput.result); }
      catch (error) { artifactPersistenceFailed = true; state.artifactErrors.push(`Result XLSX persistence verification failed: ${messageOf(error)}`); log(`Result XLSX failed: ${messageOf(error)}`, "error"); }
      if (artifactPersistenceFailed) {
        setStatus("ERROR", "OUTPUT PERSISTENCE FAILED");
        progress("Output persistence verification failed; no unverified artifact is reported as saved.");
        audit("ARTIFACT_PERSISTENCE_FAILED", null, { message: state.artifactErrors.join(" | ") });
      }
      const completedNaturally = !state.stopRequested && !halted;
      state.running = false; state.stopRequested = false; renderQueue(); renderOutputScreen(); controls();
      stopRuntimeTicker();
      if (completedNaturally) {
        showScreen("outputScreen");
      }
    }
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type !== "DAC_IMAGE_RUN_STAGE") return false;
    const item = state.currentItem;
    if (!item || message.job_id !== item.job.id || message.attempt_id !== item.attempt_id) return false;
    item.runtime_stage = message.stage;
    setCurrent(item, message.stage, message.stage === "GENERATING" ? "ChatGPT is generating; no next prompt will be sent." : "Live stage update from the ChatGPT receiver.", item.settings.timeout_sec);
    renderQueue(); progress(`${item.job.id}: ${message.stage}.`);
    return false;
  });

  async function stop() { state.stopRequested = true; progress("Stopping current operation…"); try { await send({ type: "DAC_ABORT" }); } catch (_) { /* local stop prevents further jobs */ } }

  function showScreen(id) {
    if (state.running && id === "outputScreen") return;
    document.querySelectorAll(".workflow-screen").forEach((screen) => screen.classList.toggle("active", screen.id === id));
    document.querySelectorAll(".workflow-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.screen === id));
  }

  els.workbookInput.addEventListener("change", openWorkbook);
  els.referencesInput.addEventListener("change", () => loadFiles().catch((error) => log(error.message, "error")));
  els.imageOutputFolderInput.addEventListener("change", setImageDownloadsFolder);
  els.resultLocationMode.addEventListener("change", setResultLocation);
  els.resultDownloadsFolderInput.addEventListener("change", setResultDownloadsFolder);
  els.resultFilenameInput.addEventListener("change", setResultFilename);
  for (const element of [els.imagePatternInput, els.auditFilenameInput, els.collisionPolicyInput, els.saveImagesInput, els.saveResultXlsxInput, els.saveAuditJsonlInput]) element.addEventListener("change", setArtifactNaming);
  for (const element of [els.timeoutSecInput, els.maxRetriesInput, els.safetyCooldownInput, els.maxInputImagesInput, els.continueOnErrorInput, els.rerunDoneInput]) element.addEventListener("change", () => updateRuntimeOverrides().catch((error) => log(error.message, "error")));
  els.chooseImageFolderBtn.addEventListener("click", () => chooseDirectory("Image folder selected", "image").catch((error) => { if (error.name !== "AbortError") { els.outputPermissionText.textContent = error.message; log(error.message, "error"); } }));
  els.changeImageFolderBtn.addEventListener("click", () => chooseDirectory("Image folder changed", "image").catch((error) => { if (error.name !== "AbortError") { els.outputPermissionText.textContent = error.message; log(error.message, "error"); } }));
  els.useSourceFolderBtn.addEventListener("click", () => useSourceFolder().catch((error) => { if (error.name !== "AbortError") { els.outputPermissionText.textContent = error.message; log(error.message, "error"); } }));
  els.chooseResultFolderBtn.addEventListener("click", () => chooseDirectory("Result XLSX folder selected", "result").then(() => { els.resultLocationMode.value = "directory"; renderOutput(); }).catch((error) => { if (error.name !== "AbortError") { els.outputPermissionText.textContent = error.message; log(error.message, "error"); } }));
  const ZOOM_LEVELS = [0.8, 0.9, 1.0];
  const ZOOM_EPSILON = 0.015;

  function isChatGPTUrl(url) {
    return Boolean(url && /^https:\/\/(chatgpt\.com|chat\.openai\.com)\//i.test(url));
  }

  function matchesZoomLevel(actualZoom, targetLevel, epsilon = ZOOM_EPSILON) {
    if (!Number.isFinite(actualZoom) || !Number.isFinite(targetLevel)) return false;
    return Math.abs(actualZoom - targetLevel) <= epsilon;
  }

  async function getActiveChatGPTTab() {
    if (typeof chrome === "undefined" || !chrome.tabs?.query) return null;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id && isChatGPTUrl(tab.url)) return tab;
    } catch (_) {}
    return null;
  }

  // Zoom action is initiated from the active ChatGPT tab; Chrome default zoom behavior
  // applies and may persist across the same ChatGPT origin.
  async function syncZoomState() {
    const zoomButtons = document.querySelectorAll(".zoom-btn");
    if (!zoomButtons.length) return;
    const tab = await getActiveChatGPTTab();
    if (!tab?.id) {
      zoomButtons.forEach((btn) => {
        btn.disabled = true;
        btn.classList.remove("active");
      });
      return;
    }
    try {
      const currentZoom = await chrome.tabs.getZoom(tab.id);
      zoomButtons.forEach((btn) => {
        btn.disabled = false;
        const targetZoom = Number(btn.dataset.zoom);
        btn.classList.toggle("active", matchesZoomLevel(currentZoom, targetZoom));
      });
    } catch (_) {
      zoomButtons.forEach((btn) => {
        btn.disabled = true;
        btn.classList.remove("active");
      });
    }
  }

  async function setChatZoom(targetLevel) {
    const tab = await getActiveChatGPTTab();
    if (!tab?.id) return;
    try {
      await chrome.tabs.setZoom(tab.id, targetLevel);
      await syncZoomState();
    } catch (_) {}
  }

  document.querySelectorAll(".zoom-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const level = Number(btn.dataset.zoom);
      if (level) setChatZoom(level).catch(() => {});
    });
  });

  if (typeof chrome !== "undefined" && chrome.tabs) {
    chrome.tabs.onActivated?.addListener(() => { syncZoomState().catch(() => {}); });
    chrome.tabs.onUpdated?.addListener((_tabId, changeInfo) => {
      if (changeInfo.url || changeInfo.status === "complete") {
        syncZoomState().catch(() => {});
      }
    });
    chrome.tabs.onZoomChange?.addListener(() => {
      syncZoomState().catch(() => {});
    });
  }

  els.changeWorkbookBtn?.addEventListener("click", () => els.workbookInput.click());
  els.addReferencesBtn?.addEventListener("click", () => els.referencesInput.click());
  els.validateBtn.addEventListener("click", validate);
  els.runBtn.addEventListener("click", () => run("all"));
  els.runFailedBtn.addEventListener("click", () => run("failed"));
  els.stopBtn.addEventListener("click", stop);
  els.clearLogsBtn.addEventListener("click", () => { els.logList.textContent = ""; });
  els.viewQueueBtn.addEventListener("click", () => { state.queueExpanded = !state.queueExpanded; renderQueue(); });
  els.viewOutputsBtn.addEventListener("click", () => { state.outputsExpanded = !state.outputsExpanded; renderOutputScreen(); });
  els.loadNewWorkbookBtn.addEventListener("click", () => { showScreen("setupScreen"); els.workbookInput.click(); });
  els.openOutputFolderBtn.addEventListener("click", () => chrome.downloads.showDefaultFolder?.());
  document.querySelectorAll(".workflow-tab").forEach((tab) => tab.addEventListener("click", () => showScreen(tab.dataset.screen)));
  renderOutput(); renderRuntime(); renderOutputScreen(); controls(); syncZoomState().catch(() => {});

  (typeof window !== "undefined" ? window : globalThis).DacChatZoom = {
    isChatGPTUrl,
    matchesZoomLevel,
    ZOOM_LEVELS,
    ZOOM_EPSILON,
    syncZoomState,
    setChatZoom
  };

  (typeof window !== "undefined" ? window : globalThis).DacVisualMapping = {
    updatePipelineStepper,
    updateProgressVisuals,
    updateHaltedBanner,
    updateOperatorTimer,
    renderProgressSegments
  };
})();
