(() => {
  "use strict";
  const ids = [
    "workbookInput", "resumeWorkbookInput", "continueExistingRunBtn", "referencesInput", "validateBtn", "runBtn", "runFromRunTabBtn", "runFailedBtn", "runSelectedBtn", "runEligibilityHint", "stopBtn", "pauseResumeBtn", "statusChip", "statusChipTranslation",
    "quickPromptInput", "quickPromptCheckBtn", "quickPromptStatus", "quickPromptSessionText",
    "workbookText", "referenceText", "referenceGallery", "progressText", "progressDetail", "failedJobsText",
    "currentJobId", "currentStage", "currentTiming", "currentSaved", "runtimeJobElapsed", "runtimeCurrentOperation", "runtimeTimeoutRemaining", "runtimeRetryState", "runtimeInterJobDelay", "runtimeNextTransition", "nextTaskCard", "nextTaskId", "nextTaskCountdown",
    "queueSummary", "queueList", "logList", "clearLogsBtn", "imageOutputText", "resultOutputText", "auditOutputText",
    "outputPermissionText", "outputDestinationMode", "imageOutputFolderInput", "downloadsDestinationControls", "namingProvenance",
    "authorizedDestinationControls", "destinationHandleText", "outputProfileText", "outputProfilePermission", "folderHintText", "copyFolderHintBtn", "destinationFolderBtn", "outputAdvancedDetails",
    "separateResultDestinationInput", "separateResultDestinationControls", "resultLocationMode", "resultDownloadsFolderInput",
    "resultDownloadsFolderLabel", "resultAuthorizedControls", "resultHandleText", "imagePatternInput", "resultFilenameInput", "auditFilenameInput",
    "collisionPolicyInput", "saveImagesInput", "saveResultXlsxInput", "saveAuditJsonlInput", "runIdText", "checkpointVersionText", "checkpointFilenameText",
    "chooseResultFolderBtn", "checkpointCollisionDialog", "checkpointCollisionList", "checkpointCollisionSuffix", "checkpointCollisionStatus", "checkpointCollisionCancelBtn", "checkpointCollisionConfirmBtn", "folderPickDialog", "folderPickTitle", "folderPickPath", "folderPickCopyBtn", "folderPickStatus", "folderPickCancelBtn", "folderPickOpenBtn",
    "copyReviewPacketBtn", "copyReviewPacketStatus", "runtimeSettingsCard", "timeoutSecInput", "maxRetriesInput", "delayMinSecInput", "delayMaxSecInput", "safetyCooldownInput", "maxInputImagesInput",
    "continueOnErrorInput", "rerunDoneInput", "outputSummaryText", "outputList", "artifactList", "outputGlossary", "completionTranslation", "failedJobsTranslation",
    "openOutputFolderBtn", "loadNewWorkbookBtn", "viewQueueBtn", "selectAllQueueBtn", "clearQueueSelectionBtn", "viewOutputsBtn",
    "changeWorkbookBtn", "addReferencesBtn", "workbookNameDisplay", "readinessChecklist",
    "checkWorkbook", "statusWorkbook", "checkJobs", "statusJobs", "checkReferences", "statusReferences",
    "checkChatGPT", "statusChatGPT", "checkOutput", "statusOutput", "checkSaveModes", "statusSaveModes", "checkNaming", "statusNaming", "checkSettings", "statusSettings", "readinessBanner", "planCheckSummary", "validationGuidance", "resumePlanDiagnostics", "resumeSourceSummary", "configProvenance", "helpBtn", "helpDrawer", "closeHelpBtn", "helpGlossary", "recreateConfirmDialog", "recreateConfirmTitle", "recreateConfirmMessage", "recreateCancelBtn", "recreateConfirmBtn", "auditGapConfirmDialog", "auditGapCancelBtn", "auditGapConfirmBtn",
    "rerunConfirmDialog", "rerunConfirmTitle", "rerunConfirmTitleVi", "rerunConfirmMessage", "rerunConfirmMessageVi", "rerunKeepPolicyRadio", "rerunOverwritePolicyRadio", "rerunCancelBtn", "rerunConfirmBtn", "queueRemoveDialog", "queueRemoveMessage", "queueRemoveMessageVi", "queueRemoveCancelBtn", "queueRemoveConfirmBtn",
    "progressRatio", "progressPercent", "progressBarFill", "progressSegments", "statDoneCount", "statActiveCount",
    "statNextCount", "statFailedCount", "haltedBanner", "haltedTime", "haltedReason", "haltedRetry", "haltedJob", "haltedCause", "haltedDetailRow", "haltedDetail", "haltedAction", "haltInstructionsBtn", "haltInstructionsDialog", "haltInstructionsCount", "haltInstructionsList", "haltSpecialStatus", "haltNonHaltList", "haltInstructionsCloseBtn",
    "currentAttemptBadge", "continuedRunLabel", "currentJobContent", "currentPromptPreview", "currentReferenceColumn", "currentReferenceGallery", "pipelineStepper", "operatorTimerArea",
    "operatorTimerBadge", "operatorTimerText", "latestSavedCard", "latestSavedThumb",
    "latestSavedName", "latestSavedStatus", "completionCard", "completionIcon", "completionTitle",
    "artifactStatusPill", "runArtifactsCard", "artifactLocationNote", "artifactRowImages", "recreateConfirmTitleVi", "recreateConfirmMessageVi", "folderPickTitleVi", "folderPickStatusVi", "checkpointCollisionStatusVi",
    "artifactImagesDetail", "artifactImagesStatus", "artifactRowResult", "artifactResultDetail",
    "artifactResultStatus", "artifactRowAudit", "artifactAuditDetail", "artifactAuditStatus", "runDashboardSplit", "runWidthSplitter",
    "bridgeProposalCard", "bridgeProposalCount", "bridgeProposalStatus", "bridgeProposalMeta", "bridgeProposalList", "bridgeProposalNotice", "bridgeProposalLockReason", "bridgeProposalFixtureBtn", "bridgeProposalRejectBtn", "bridgeProposalApproveBtn",
    "bridgePairingCard", "bridgeTransportStatus", "bridgeTransportDetail", "bridgePairingBtn", "bridgeUnpairBtn", "bridgePairingInput",
    "bridgeHostReachable", "bridgePairingState", "bridgeLastActivity", "bridgeActivityList", "bridgeActivityEmpty",
    "bridgeAttentionCard", "bridgeAttentionList", "bridgeAttentionCount", "bridgeTabAttentionBadge", "bridgeAttentionRestoreBtn"
  ];
  const els = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
  // Output Profile mode is normally driven by output_profile_id / result_output_profile_id
  // in the imported XLSX config. A Quick Prompt session (and any workbook opened
  // without that config key) has no such id, so switching Destination mode to
  // "Output Profile" and pressing Choose Folder had nothing to bind to and threw
  // instead of opening the picker -- Chrome Downloads was the only mode that worked.
  // These are the fallback ids used whenever no configured id exists, so the picker
  // always opens; they stay distinct so binding a result folder never overwrites the
  // image profile's saved folder handle.
  const DEFAULT_IMAGE_PROFILE_ID = "default-output";
  const DEFAULT_RESULT_PROFILE_ID = "default-result-output";
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
    pauseRequested: false,
    paused: false,
    terminal: 0,
    runId: null,
    attemptSerial: 0,
    auditEvents: [],
    auditPersistedPayload: "",
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
    outputsExpanded: false,
    diagnostics: null,
    destinationMode: "downloads",
    separateResultDestination: false,
    importedConfig: null,
    configFindings: [],
    localOverrides: new Set(),
    outputProfileState: null,
    selectedInterJobDelay: null,
    retryResumeAt: null,
    resumeMode: false,
    resumePlan: null,
    resumeLedgerFile: "",
    checkpointVersion: 0,
    checkpointFilename: "",
    checkpointCreatedAt: "",
    resumeCheckpointFindings: [],
    manualReconciliationRunning: false,
    pendingFolderPick: null,
    checkpointCollision: null,
    recreateRunning: false,
    pendingRecreateJobId: null,
    pendingRerunJobId: null,
    runSelection: new Set(),
    quickPromptCounter: 0,
    queueMutationRunning: false,
    runStarting: false,
    pendingQueueRemovalId: null,
    draggedQueueJobId: null,
    auditGapRunning: false,
    auditChain: { ok: true, applicable: false, gapAcknowledged: false, segmentStarted: false, previousFilename: "" },
    bridgeProposals: [],
    bridgeExecutorEpoch: null,
    bridgePort: null,
    bridgeTransportStatus: null,
    bridgeLastActivityAt: null,
    bridgeActivity: [],
    bridgeAttention: []
  };
  const queueRunLock = window.DacApprovalPersistence.createQueueRunLock(state);
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const STATUS_TRANSLATIONS = Object.freeze({
    IDLE: "Đang chờ", ERROR: "Có lỗi", RUNNING: "Đang chạy", DONE: "Hoàn tất", PAUSED: "Đã tạm dừng", STOPPED: "Đã dừng", HALTED: "Dừng bảo vệ",
    "NOT VALIDATED": "Chưa được kiểm tra", "NEEDS INPUT": "Cần thêm thông tin", WARNING: "Có cảnh báo", "READY TO RUN": "Sẵn sàng chạy", "NOT READY": "Chưa sẵn sàng",
    "AUDIT GAP CHECKPOINTING": "Đang ghi checkpoint cho khoảng trống audit", "AUDIT GAP BLOCKED": "Khoảng trống audit đang chặn tiến trình",
    "RECREATE CHECKPOINTING": "Đang ghi checkpoint cho lần tạo lại", "RECREATE SAVED · QUEUE BLOCKED": "Đã lưu ảnh tạo lại · Queue vẫn bị chặn", "RECREATE BLOCKED": "Lần tạo lại đang bị chặn",
    "RERUN CHECKPOINTING": "Đang ghi checkpoint cho lần chạy lại", "RERUN BLOCKED": "Lần chạy lại đang bị chặn", "RESUME BLOCKED": "Tiếp tục lần chạy đang bị chặn",
    "OUTPUT PERSISTENCE FAILED": "Lưu hoặc xác minh artifact thất bại"
  });
  function setStatus(status, label = status) {
    els.statusChip.className = `chip ${status.toLowerCase()}`;
    els.statusChip.textContent = label;
    if (els.statusChipTranslation) els.statusChipTranslation.textContent = STATUS_TRANSLATIONS[label] || STATUS_TRANSLATIONS[status] || "Xem chi tiết bên dưới";
  }
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
    const bridge = item?.job?.input_origin === "bridge" ? {
      input_origin: "bridge",
      bridge_proposal_id: item.job.bridge_proposal_id || null,
      bridge_request_id: item.job.bridge_request_id || null,
      bridge_client_id: item.job.bridge_client_id || null,
      bridge_client_job_id: item.job.bridge_client_job_id || null,
      bridge_approved_at: item.job.bridge_approved_at || null,
      bridge_payload_sha256: item.job.bridge_payload_sha256 || null
    } : {};
    state.auditEvents.push({ timestamp: new Date().toISOString(), run_id: state.runId, job_id: item?.job?.id || null, attempt_id: item?.attempt_id || null, event, attempt: item?.attempt_count ?? null, phase: item?.phase || null, status: item?.status || null, failure_type: item?.failure_type || null, message: values.message || null, elapsed_ms: values.elapsed_ms ?? null, references: item ? item.references.map((file) => file.alias || file.fileName || file.name) : [], requested_filename: item?.requested_file || null, result_file: item?.result_file || null, result_download_id: item?.result_download_id || null, persistence_verified: Boolean(item?.persistence_verified), write_outcome: item?.write_outcome || null, detected_not_downloaded: Boolean(item?.detected_not_downloaded), collision_policy: output?.collisionPolicy || null, prompt_fingerprint: item ? promptFingerprint(item.job.prompt) : null, target_url: values.target_url || null, submitted_at: telemetry.submitted_at || null, detection: telemetry.detection || null, ...bridge });
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

  function currentRuntimeInfo(now = Date.now()) {
    return window.DacSidepanelUiSemantics.runtimeInfo({
      currentItem: state.currentItem,
      currentStage: state.currentStage,
      currentStartedAt: state.currentStartedAt,
      stageStartedAt: state.stageStartedAt,
      stageBudgetSec: state.stageBudgetSec,
      interJobCountdown: state.interJobCountdown,
      selectedInterJobDelay: state.selectedInterJobDelay,
      retryResumeAt: state.retryResumeAt,
      settings: state.prepared?.settings,
      running: state.running
    }, now, window.DacRunState.formatDuration);
  }

  function updateOperatorTimer(info = currentRuntimeInfo()) {
    if (!els.operatorTimerBadge || !els.operatorTimerText) return;
    if (info.timerHidden) {
      if (els.operatorTimerArea) els.operatorTimerArea.hidden = true;
      els.operatorTimerText.textContent = "—";
      return;
    }
    if (els.operatorTimerArea) els.operatorTimerArea.hidden = false;
    els.operatorTimerText.textContent = info.timerText;
    els.operatorTimerBadge.className = `timer-badge ${info.timerMode}`;
  }

  function updateHaltedBanner(isHalted, item, reason = "") {
    if (!els.haltedBanner) return;
    if (isHalted || ["FAILED", "INTERRUPTED", "STOPPED"].includes(item?.status) || state.currentStage === "HALTED") {
      const explicitCode = item?.failure_type || (item?.status === "STOPPED" ? "USER_STOP" : "");
      const reasonCode = String(reason || "").trim().toUpperCase();
      const reasonInstruction = window.DacHaltInstructions?.findInstruction(reasonCode);
      const code = String(explicitCode || (reasonInstruction && reasonInstruction !== window.DacHaltInstructions?.UNKNOWN_INSTRUCTION ? reasonCode : "HALT_UNKNOWN")).trim().toUpperCase();
      const instruction = window.DacHaltInstructions?.findInstruction(code) || {
        code: "HALT_UNKNOWN",
        retry: "Không xác định",
        meaning: "Extension đã dừng nhưng chưa xác định được nhóm nguyên nhân.",
        action: "Giữ nguyên tab ChatGPT, không gửi lại job và mở Technical details để kiểm tra prompt/output trước khi tiếp tục."
      };
      const visibleCode = instruction === window.DacHaltInstructions?.UNKNOWN_INSTRUCTION ? (code || instruction.code) : code;
      const technicalDetail = String(item?.last_error || item?.error || reason || "").trim();
      const showTechnicalDetail = technicalDetail && technicalDetail.toUpperCase() !== visibleCode;
      els.haltedBanner.hidden = false;
      if (els.haltedReason) els.haltedReason.textContent = visibleCode || "HALT_UNKNOWN";
      if (els.haltedRetry) els.haltedRetry.textContent = `Tự động thử lại: ${instruction.retry || "Không xác định"}`;
      if (els.haltedCause) els.haltedCause.textContent = instruction.meaning;
      if (els.haltedDetailRow) els.haltedDetailRow.hidden = !showTechnicalDetail;
      if (els.haltedDetail) els.haltedDetail.textContent = showTechnicalDetail ? technicalDetail : "—";
      if (els.haltedAction) els.haltedAction.textContent = instruction.action;
      if (els.haltedJob) els.haltedJob.textContent = item?.job?.id ? `Dừng tại: ${item.job.id}` : "Run đã dừng";
      if (els.haltedTime && (!els.haltedTime.textContent || els.haltedTime.textContent === "—")) {
        els.haltedTime.textContent = new Date().toLocaleTimeString();
      }
    } else {
      els.haltedBanner.hidden = true;
    }
  }

  // Thumbnail URLs are read out of the chatgpt.com DOM, and job IDs/prompts
  // arrive from an imported workbook.  Both are untrusted here: this panel
  // holds downloads and tabs permissions, and MV3's default CSP does not
  // restrict img-src, so an injected element could still reach the network.
  // Every renderer below builds nodes and assigns text, never markup.
  function safeImageSource(url) {
    const value = String(url || "");
    return /^(https:\/\/|data:image\/)/i.test(value) ? value : "";
  }

  function thumbnailImage(url, label, className) {
    const source = safeImageSource(url);
    if (!source) return null;
    const image = document.createElement("img");
    image.className = className;
    image.alt = String(label || "");
    image.src = source;
    return image;
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }

  function labelledLine(label, value) {
    const fragment = document.createDocumentFragment();
    fragment.append(element("strong", "", label), ` ${value}`);
    return fragment;
  }

  function promptBrief(value, maxLength = 140) {
    const compact = String(value || "").replace(/\s+/g, " ").trim();
    if (!compact) return "Không có nội dung prompt.";
    if (compact.length <= maxLength) return compact;
    return `${compact.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
  }

  const BRIDGE_PROPOSAL_STORAGE_KEY = "dac.bridge.proposals.v1";
  const BRIDGE_EXECUTOR_PORT = "dac.bridge.executor.v1";
  const serializeBridgeProposalStore = window.DacBridgeProposalCore.createSerialExecutor();
  const BRIDGE_STATUS_LABELS = Object.freeze({
    AWAITING_OWNER_APPROVAL: "Đang chờ Đức xem xét",
    NEEDS_REVIEW: "Ledger đã thay đổi — cần xem lại danh sách mới",
    APPROVING: "Đang ghi audit và checkpoint",
    APPROVED_CHECKPOINTED: "Đã duyệt và xác minh checkpoint",
    REJECTED: "Đã từ chối",
    EXPIRED: "Đề xuất đã hết hạn",
    APPROVAL_FAILED: "Duyệt thất bại — Queue chưa được checkpoint"
  });

  const BRIDGE_TRANSPORT_LABELS = Object.freeze({
    unpaired: "Chưa pairing",
    connecting: "Đang kết nối host",
    connected: "Đã kết nối",
    disconnected: "Mất kết nối host",
    pairing_invalid: "Tệp pairing không hợp lệ"
  });

  const BRIDGE_DIRECT_EVENT_TYPES = Object.freeze(new Set([
    "BRIDGE_JOB_ADDED_DIRECT",
    "BRIDGE_JOB_UPDATED",
    "BRIDGE_JOB_REMOVED",
    "BRIDGE_JOB_REORDERED",
    "BRIDGE_OUTPUT_CONFIGURED",
    "BRIDGE_RUN_SETTINGS_CONFIGURED"
  ]));

  function renderBridgeTransportStatus(status = state.bridgeTransportStatus) {
    if (!els.bridgeTransportStatus || !els.bridgeTransportDetail) return;
    const current = status && typeof status === "object" ? status : { state: "unpaired", paired: false, endpoint: null };
    state.bridgeTransportStatus = current;
    const code = BRIDGE_TRANSPORT_LABELS[current.state] ? current.state : "disconnected";
    els.bridgeTransportStatus.className = `bridge-transport-status ${code}`;
    els.bridgeTransportStatus.textContent = BRIDGE_TRANSPORT_LABELS[code];
    const endpoint = current.endpoint?.host && current.endpoint?.port ? `${current.endpoint.host}:${current.endpoint.port}` : null;
    const executor = current.executor?.available ? "Side panel executor đang sẵn sàng." : "Side panel executor chưa sẵn sàng.";
    els.bridgeTransportDetail.textContent = endpoint
      ? `${endpoint} · ${executor} Token không xuất hiện trong log, workbook hoặc audit.`
      : "Chọn tệp pairing do bộ cài Bridge V1 tạo. Token chỉ được lưu cục bộ trong extension.";
    els.bridgeUnpairBtn.hidden = !current.paired;
    if (els.bridgeHostReachable) els.bridgeHostReachable.textContent = current.state === "connected" ? "C\u00f3" : "Kh\u00f4ng";
    if (els.bridgePairingState) els.bridgePairingState.textContent = current.paired ? "\u0110\u00e3 pairing" : "Ch\u01b0a pairing";
  }

  async function refreshBridgeTransportStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ type: "DAC_BRIDGE_STATUS_GET" });
      if (response?.ok) renderBridgeTransportStatus(response.status);
      else renderBridgeTransportStatus({ state: "disconnected", paired: false });
    } catch (_) { renderBridgeTransportStatus({ state: "disconnected", paired: false }); }
  }

  async function pairAgentBridgeFile(file) {
    if (!file) return;
    let pairing;
    try { pairing = window.DacBridgePairingCore.parse(await file.text()); }
    catch (error) {
      renderBridgeTransportStatus({ state: "pairing_invalid", paired: false });
      log(messageOf(error), "error");
      return;
    }
    const response = await chrome.runtime.sendMessage({ type: "DAC_BRIDGE_PAIRING_SET", pairing });
    if (!response?.ok) throw new Error("PAIRING_FILE_INVALID: background router từ chối tệp pairing.");
    renderBridgeTransportStatus(response.status);
    log(`Đã lưu pairing Agent Bridge cho 127.0.0.1:${pairing.port}; đang kết nối host.`, "done");
  }

  async function unpairAgentBridge() {
    const response = await chrome.runtime.sendMessage({ type: "DAC_BRIDGE_PAIRING_REMOVE" });
    if (!response?.ok) throw new Error("Không thể xoá pairing Agent Bridge.");
    renderBridgeTransportStatus(response.status);
    log("Đã ngắt pairing Agent Bridge; workbook và lượt chạy hiện tại không thay đổi.", "done");
  }

  async function readBridgeProposalStoreUnlocked() {
    const stored = await chrome.storage.local.get(BRIDGE_PROPOSAL_STORAGE_KEY);
    const raw = stored?.[BRIDGE_PROPOSAL_STORAGE_KEY];
    const store = raw && typeof raw === "object"
      ? { schema_version: 1, records: Array.isArray(raw.records) ? raw.records : [], replays: raw.replays && typeof raw.replays === "object" ? raw.replays : {} }
      : { schema_version: 1, records: [], replays: {} };
    store.records = window.DacBridgeProposalCore.maintainRecords(store.records);
    for (const record of store.records) {
      if (window.DacBridgeProposalCore.TERMINAL_STATUSES.has(record.status)) delete store.replays[record.idempotency_key];
    }
    await chrome.storage.local.set({ [BRIDGE_PROPOSAL_STORAGE_KEY]: store });
    state.bridgeProposals = store.records;
    return store;
  }

  async function writeBridgeProposalStoreUnlocked(store) {
    const normalized = {
      schema_version: 1,
      records: window.DacBridgeProposalCore.maintainRecords(store.records || []),
      replays: store.replays && typeof store.replays === "object" ? store.replays : {}
    };
    await chrome.storage.local.set({ [BRIDGE_PROPOSAL_STORAGE_KEY]: normalized });
    state.bridgeProposals = normalized.records;
    return normalized;
  }

  function readBridgeProposalStore() {
    return serializeBridgeProposalStore(() => readBridgeProposalStoreUnlocked());
  }

  function createBridgeReplayStore() {
    return Object.freeze({
      async get(key) {
        const store = await readBridgeProposalStore();
        return Object.hasOwn(store.replays, key) ? store.replays[key] : null;
      },
      async put(key, record) {
        await serializeBridgeProposalStore(async () => {
          const store = await readBridgeProposalStoreUnlocked();
          store.replays[key] = record;
          const keys = Object.keys(store.replays);
          for (const stale of keys.slice(0, Math.max(0, keys.length - 500))) delete store.replays[stale];
          await writeBridgeProposalStoreUnlocked(store);
        });
      }
    });
  }

  function bridgeError(error) {
    if (error instanceof window.DacBridgeCore.BridgeProtocolError) return error;
    if (error instanceof window.DacBridgeProposalCore.ProposalError && Object.hasOwn(window.DacBridgeCore.ERROR_DEFINITIONS, error.code)) {
      return new window.DacBridgeCore.BridgeProtocolError(error.code, error.message, error.details);
    }
    return error;
  }

  function requireBridgeWorkbook() {
    if (!state.workbook) throw new window.DacBridgeCore.BridgeProtocolError("WORKBOOK_NOT_LOADED");
    clearBridgeAttention(["WORKBOOK_NEEDED"]);
    return state.workbook;
  }

  async function currentLedgerEtag(workbook = requireBridgeWorkbook()) {
    return window.DacBridgeProposalCore.ledgerEtag(workbook, window.DacBridgeCore.hashCanonical);
  }

  function checkpointSummary() {
    return {
      version: Number(state.checkpointVersion || state.workbook?.config?.checkpoint_version) || 0,
      filename: state.checkpointFilename || window.DacOutputLocation.artifactLeaf(state.workbook?.config?.checkpoint_filename || "") || null
    };
  }

  function bridgeRuntimeSettings() {
    return state.prepared?.settings || window.DacRunnerCore.runtimeConfig(requireBridgeWorkbook().config, state.runtimeOverrides);
  }

  async function bridgeQueueList(params) {
    const workbook = requireBridgeWorkbook();
    const preparedById = new Map(Array.from(state.prepared?.queue || [], (item) => [item.job.id, item]));
    const queue = window.DacXlsx.activeJobs(workbook).map((job, index) => {
      const item = preparedById.get(job.id);
      return {
        job,
        number: index + 1,
        references: item?.references || window.DacRunnerCore.referenceTokens(job).map((token) => ({ alias: token })),
        status: item?.status || String(job.status || "PENDING").toUpperCase(),
        phase: item?.phase || String(job.attempt_phase || "PRE_SUBMIT").toUpperCase(),
        failure_type: item?.failure_type || job.failure_type || ""
      };
    });
    const filtered = params.statuses.length ? queue.filter((item) => params.statuses.includes(item.status)) : queue;
    const paged = window.DacBridgeProposalCore.page(filtered, params.cursor, params.limit);
    const jobs = [];
    for (const item of paged.values) {
      jobs.push({
        job_id: item.job.id,
        queue_position: item.number,
        status: item.status,
        attempt_phase: item.phase,
        failure_type: item.failure_type || "",
        reference_images: item.references.map((file) => file.alias || file.fileName || file.name),
        prompt_fingerprint: await window.DacBridgeCore.hashText(item.job.prompt || ""),
        prompt: params.include_prompt ? item.job.prompt || "" : null,
        origin: item.job.input_origin || "workbook",
        bridge_proposal_id: item.job.bridge_proposal_id || null
      });
    }
    return { ledger_etag: await currentLedgerEtag(workbook), run_id: state.runId || workbook.config.run_id || null, checkpoint: checkpointSummary(), jobs, next_cursor: paged.next_cursor };
  }

  function bridgeRunStatus() {
    const workbook = requireBridgeWorkbook();
    const queue = state.prepared?.queue || window.DacXlsx.activeJobs(workbook).map((job) => ({
      job,
      status: String(job.status || "PENDING").toUpperCase(),
      phase: String(job.attempt_phase || "PRE_SUBMIT").toUpperCase(),
      failure_type: job.failure_type || ""
    }));
    const count = (status) => queue.filter((item) => status.includes(item.status)).length;
    const halted = queue.find((item) => window.DacRunnerCore.HARD_STOP_FAILURE_TYPES.has(item.failure_type));
    return {
      state: state.running ? state.paused ? "PAUSED" : "RUNNING" : halted ? "HALTED" : "IDLE",
      paused: state.paused,
      pause_requested: state.pauseRequested,
      current: state.currentItem ? { job_id: state.currentItem.job.id, attempt_id: state.currentItem.attempt_id || null, phase: state.currentItem.phase, runtime_stage: state.currentItem.runtime_stage || null } : null,
      counts: { total: queue.length, pending: count(["PENDING"]), running: count(["RUNNING", "RECONCILING"]), success: count(["SUCCESS", "DONE"]), failed: count(["FAILED"]), interrupted: count(["INTERRUPTED", "STOPPED"]) },
      halt: halted ? { failure_type: halted.failure_type, instruction: window.DacHaltInstructions?.findInstruction?.(halted.failure_type) || null } : null,
      artifact_persistence_failed: state.artifactErrors.length > 0,
      checkpoint: checkpointSummary()
    };
  }

  async function bridgeSystemPing() {
    const workbook = state.workbook;
    let chatgpt = { state: "HARD_STOP", failure_type: "RECEIVER_LOST", composer_found: false, generating: false };
    try {
      const tab = await activeTab();
      const ping = await chrome.tabs.sendMessage(tab.id, { type: "DAC_PING" });
      let failureType = null;
      if (ping?.securityBlocker) failureType = "SECURITY_HARD_STOP";
      else if (ping?.generationLimitBlocker) failureType = "GENERATION_LIMIT_REACHED";
      else if (!ping?.composerFound) failureType = "RECEIVER_LOST";
      chatgpt = {
        state: failureType ? "HARD_STOP" : ping.generating || ping.busy ? "BUSY" : "READY",
        failure_type: failureType,
        composer_found: Boolean(ping?.composerFound),
        generating: Boolean(ping?.generating || ping?.busy),
        halt_instruction: failureType ? window.DacHaltInstructions?.findInstruction?.(failureType) || null : null
      };
    } catch (_) {
      chatgpt.halt_instruction = window.DacHaltInstructions?.findInstruction?.("RECEIVER_LOST") || null;
    }
    return {
      extension: "online",
      executor: "available",
      bridge: {
        host_reachable: state.bridgeTransportStatus?.state === "connected",
        extension_paired: Boolean(state.bridgeTransportStatus?.paired),
        last_activity_at: state.bridgeLastActivityAt
      },
      chatgpt,
      workbook: { loaded: Boolean(workbook), file_name: workbook?.fileName || null, run_id: state.runId || workbook?.config?.run_id || null }
    };
  }

  // BRIDGE tab is the single home for AI↔owner interaction (Đức's request,
  // 2026-08-24): whenever a Bridge call fails because only a human gesture can
  // unblock it, the block surfaces here as an actionable row instead of the
  // operator hunting through SETUP/RUN. Rows clear automatically when a later
  // Bridge call proves the block is gone.
  const BRIDGE_ATTENTION_DEFS = Object.freeze({
    FOLDER_REAUTH_NEEDED: {
      title: "Chọn lại folder output — Chrome đã thu hồi quyền",
      guidance: "Sau mỗi lần reload extension, Chrome bắt cấp lại quyền thư mục. Bấm nút bên dưới và chọn đúng folder cũ (đường dẫn gợi ý sẽ hiện kèm nút Copy).",
      action: "folder", actionLabel: "Chọn lại folder output"
    },
    FOLDER_BIND_NEEDED: {
      title: "Cần bind folder output lần đầu",
      guidance: "AI không thể tự mở hộp chọn thư mục — giới hạn bảo mật của Chrome, không phải lỗi. Chọn folder một lần là AI dùng lại được.",
      action: "folder", actionLabel: "Chọn folder output"
    },
    WORKBOOK_NEEDED: {
      title: "Cần nạp workbook / bắt đầu phiên",
      guidance: "Bấm một nút bên dưới để chọn file ngay tại đây (không cần mở SETUP). Nếu AI sẽ tự tạo phiên mới bằng jobs.add thì anh không cần làm gì.",
      action: "workbook", actionLabel: "Tiếp tục run có sẵn (Result XLSX)"
    },
    PERSISTENCE_TOGGLES_OFF: {
      title: "Cần bật lưu Audit JSONL + Result XLSX",
      guidance: "Mọi thay đổi từ AI đều phải ghi được bằng chứng trước khi có hiệu lực. Mở SETUP và bật 2 công tắc lưu.",
      action: "setup", actionLabel: "Mở SETUP"
    },
    CHECKPOINT_CONFLICT: {
      title: "Nạp Result checkpoint mới nhất — phiên đang mở từ file gốc",
      guidance: "Folder output đã có checkpoint mà phiên hiện tại không biết (mở từ workbook gốc thay vì Result XLSX), nên hệ thống từ chối ghi đè — đúng thiết kế bảo vệ bằng chứng. Bấm nút và chọn file __results__ có số v cao nhất trong folder.",
      action: "workbook", actionLabel: "Tiếp tục run có sẵn (Result XLSX)"
    }
  });

  function renderBridgeAttention() {
    if (!els.bridgeAttentionList) return;
    const items = state.bridgeAttention;
    // "Ẩn" only hides a row (dismissed flag) — it never deletes, and the
    // restore button below the list brings hidden rows back. A row is truly
    // removed only by clearBridgeAttention(), i.e. when the block is resolved.
    const visible = items.filter((item) => !item.dismissed);
    const dismissedCount = items.length - visible.length;
    if (els.bridgeAttentionCard) els.bridgeAttentionCard.hidden = items.length === 0;
    if (els.bridgeAttentionCount) els.bridgeAttentionCount.textContent = `${visible.length} việc`;
    if (els.bridgeTabAttentionBadge) {
      els.bridgeTabAttentionBadge.hidden = visible.length === 0;
      els.bridgeTabAttentionBadge.textContent = String(visible.length);
    }
    if (els.bridgeAttentionRestoreBtn) {
      els.bridgeAttentionRestoreBtn.hidden = dismissedCount === 0;
      els.bridgeAttentionRestoreBtn.textContent = `Hiện lại ${dismissedCount} việc đã ẩn`;
    }
    els.bridgeAttentionList.replaceChildren();
    for (const item of visible) {
      const def = BRIDGE_ATTENTION_DEFS[item.code];
      const row = element("li", "bridge-attention-item");
      row.append(
        element("div", "bridge-attention-item-title", def ? def.title : item.code),
        element("div", "bridge-attention-item-guidance", def ? def.guidance : "")
      );
      if (item.detail) row.append(element("div", "bridge-attention-item-detail", item.detail));
      // The AI names the exact target path(s) it is working against — Đức
      // copies with one click and pastes into the picker, no thinking needed.
      // One row + one Copy button PER path: a multi-path blob behind a single
      // button would paste as garbage into a folder picker (Codex finding).
      if (item.suggestion) {
        for (const line of String(item.suggestion).split("\n").map((value) => value.trim()).filter(Boolean)) {
          const suggestion = element("div", "bridge-attention-suggestion");
          const pathNode = element("code", "bridge-attention-suggestion-path", line);
          pathNode.title = line;
          const copied = element("span", "bridge-attention-suggestion-status", "");
          const copyBtn = element("button", "secondary small", "Copy đường dẫn");
          copyBtn.type = "button";
          copyBtn.addEventListener("click", async () => {
            try {
              if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
              await navigator.clipboard.writeText(line);
              copied.textContent = "Đã copy — dán vào thanh địa chỉ của hộp chọn.";
            } catch (_) {
              copied.textContent = "Không tự copy được — bấm vào đường dẫn rồi nhấn Ctrl+C.";
            }
          });
          suggestion.append(pathNode, copyBtn, copied);
          row.append(suggestion);
        }
      }
      const actions = element("div", "bridge-attention-item-actions");
      // "AI là bộ não, người là cánh tay" (Đức, 2026-08-24): every row carries
      // the exact one-click action pre-wired — the operator never navigates or
      // decides. Pickers launched here keep their user gesture (this click).
      if (def?.action === "folder") {
        const btn = element("button", "secondary small", def.actionLabel);
        btn.type = "button";
        btn.addEventListener("click", () => openFolderPickDialog());
        actions.append(btn);
      } else if (def?.action === "workbook") {
        const resumeBtn = element("button", "secondary small", def.actionLabel);
        resumeBtn.type = "button";
        resumeBtn.addEventListener("click", () => els.resumeWorkbookInput?.click());
        const freshBtn = element("button", "secondary small", "Mở workbook mới (.xlsx)");
        freshBtn.type = "button";
        freshBtn.addEventListener("click", () => els.workbookInput?.click());
        actions.append(resumeBtn, freshBtn);
      } else if (def?.action === "setup") {
        const btn = element("button", "secondary small", def.actionLabel);
        btn.type = "button";
        btn.addEventListener("click", () => showScreen("setupScreen"));
        actions.append(btn);
      }
      const dismiss = element("button", "secondary small", "Ẩn");
      dismiss.type = "button";
      dismiss.addEventListener("click", () => { item.dismissed = true; renderBridgeAttention(); });
      actions.append(dismiss);
      row.append(actions);
      els.bridgeAttentionList.appendChild(row);
    }
  }

  function raiseBridgeAttention(code, detail, suggestion) {
    if (!BRIDGE_ATTENTION_DEFS[code]) return;
    const existing = state.bridgeAttention.find((item) => item.code === code);
    if (existing) {
      // A re-raise of the same code must not undo the operator's "Ẩn" — the
      // proposal renderer re-raises on every paint, and fighting the user's
      // dismissal would make the button meaningless. Restore is explicit only.
      existing.detail = detail || existing.detail;
      existing.suggestion = suggestion || existing.suggestion;
    } else {
      state.bridgeAttention.push({ code, detail: detail || "", suggestion: suggestion || "", raised_at: new Date().toISOString() });
    }
    renderBridgeAttention();
  }

  function clearBridgeAttention(codes) {
    const before = state.bridgeAttention.length;
    state.bridgeAttention = codes
      ? state.bridgeAttention.filter((item) => !codes.includes(item.code))
      : [];
    if (state.bridgeAttention.length !== before) renderBridgeAttention();
  }

  // Best available description of the folder the AI is targeting. The full
  // path only exists when a workbook carried output_folder_hint; the File
  // System Access API never exposes absolute paths, so after a fresh reload
  // the bound profile's folder NAME is the strongest identity we can show.
  function bridgeTargetFolderSuggestion() {
    const hint = String(state.outputSettings?.folderHint || "").trim();
    if (hint) return hint;
    const name = String(state.outputSettings?.image?.handleName || "").trim();
    return name ? `Tên folder đã bind: ${name}` : "";
  }

  // Proactive probe: after an extension reload Chrome silently revokes the
  // bound folder's write permission, but no attention row would appear until
  // an agent call fails. Opening the BRIDGE tab (and finishing a folder pick)
  // re-checks the real permission state via queryPermission — no prompt, no
  // gesture needed — so the "Chọn lại folder output" row shows up by itself.
  async function probeBridgePersistence() {
    const settings = state.outputSettings;
    let hasDirectory = false;
    if (settings) {
      try {
        const output = window.DacOutputLocation.effective(settings);
        hasDirectory = output.image?.kind === "directory" || output.result?.kind === "directory";
      } catch (_) { hasDirectory = false; }
    }
    if (hasDirectory) {
      try {
        const preflight = await window.DacOutputLocation.preflight(settings);
        if (preflight.ok) clearBridgeAttention(["FOLDER_REAUTH_NEEDED"]);
        else raiseBridgeAttention("FOLDER_REAUTH_NEEDED", preflight.error, bridgeTargetFolderSuggestion());
      } catch (error) {
        raiseBridgeAttention("FOLDER_REAUTH_NEEDED", messageOf(error), bridgeTargetFolderSuggestion());
      }
      return;
    }
    // Fresh reload with no workbook: state.outputSettings does not exist yet
    // (it is only built on workbook load — the root cause of the "row never
    // appears" bug Đức hit live). The bound profiles persisted in IndexedDB
    // are still the AI's write targets, so probe THEM directly.
    try {
      const profiles = await window.DacOutputProfiles.list();
      if (!profiles?.length) return;
      // Every revoked profile is reported — one authorized profile must not
      // silence another profile's revocation (Codex cross-audit finding #1:
      // that suppression reproduces the owner-visible "no change" symptom).
      const blocked = [];
      for (const profile of profiles) {
        const resolved = await window.DacOutputProfiles.resolve(profile.profile_id);
        if (resolved.state !== "authorized") blocked.push(resolved.profile || profile);
      }
      if (blocked.length) {
        // Prefer the persisted real path (copy-paste straight into the picker);
        // fall back to the folder name only when no workbook ever recorded one.
        const lines = blocked.map((profile) => profile.last_known_folder_hint
          || `${profile.last_known_handle_name || profile.profile_id} — chưa có đường dẫn ghi nhận (sẽ có sau lần nạp workbook của pilot đó)`);
        raiseBridgeAttention("FOLDER_REAUTH_NEEDED", "Chrome đã thu hồi quyền folder sau khi reload extension.", lines.join("\n"));
      } else clearBridgeAttention(["FOLDER_REAUTH_NEEDED"]);
    } catch (_) {}
  }

  function bridgeAttentionFromError(error) {
    const code = error?.code;
    const message = messageOf(error);
    const folderHint = bridgeTargetFolderSuggestion();
    if (code === "PERSISTENCE_VERIFICATION_FAILED" && /CHECKPOINT_VERSION_CONFLICT/.test(message)) raiseBridgeAttention("CHECKPOINT_CONFLICT", message, folderHint);
    else if (code === "PERSISTENCE_VERIFICATION_FAILED") raiseBridgeAttention("FOLDER_REAUTH_NEEDED", message, folderHint);
    else if (code === "WORKBOOK_NOT_LOADED") raiseBridgeAttention("WORKBOOK_NEEDED", message, folderHint);
    else if (code === "VALIDATION_FAILED" && /OUTPUT_PROFILE_UNBOUND/.test(message)) raiseBridgeAttention("FOLDER_BIND_NEEDED", message, folderHint);
    else if (code === "RUN_ACTIVE" && /bật lưu audit/i.test(message)) raiseBridgeAttention("PERSISTENCE_TOGGLES_OFF", message);
  }

  function renderBridgeActivityFeed() {
    if (!els.bridgeActivityList) return;
    els.bridgeActivityList.replaceChildren();
    const events = state.bridgeActivity.filter((event) => BRIDGE_DIRECT_EVENT_TYPES.has(event.event)).slice().reverse();
    if (els.bridgeActivityEmpty) els.bridgeActivityEmpty.hidden = events.length > 0;
    for (const event of events) {
      const item = element("li", "bridge-activity-item");
      item.append(
        element("strong", "bridge-activity-event", event.event),
        element("span", "bridge-activity-time", new Date(event.timestamp).toLocaleString()),
        element("span", "bridge-activity-detail", event.message || "Bridge Setup mutation checkpointed.")
      );
      els.bridgeActivityList.appendChild(item);
    }
  }

  function recordBridgeActivity(event) {
    if (!event || !BRIDGE_DIRECT_EVENT_TYPES.has(event.event)) return;
    state.bridgeActivity.push({ event: event.event, timestamp: event.timestamp, message: event.message || "" });
    if (state.bridgeActivity.length > 100) state.bridgeActivity.splice(0, state.bridgeActivity.length - 100);
    renderBridgeActivityFeed();
  }

  async function refreshBridgeScreen() {
    // Attention first: it must render even when the status ping below throws
    // (Codex cross-audit finding #2 — a rejected ping used to skip the probe).
    await probeBridgePersistence().catch(() => {});
    renderBridgeAttention();
    const ping = await bridgeSystemPing();
    if (els.bridgeHostReachable) els.bridgeHostReachable.textContent = ping.bridge.host_reachable ? "C\u00f3" : "Kh\u00f4ng";
    if (els.bridgePairingState) els.bridgePairingState.textContent = ping.bridge.extension_paired ? "\u0110\u00e3 pairing" : "Ch\u01b0a pairing";
    if (els.bridgeLastActivity) els.bridgeLastActivity.textContent = ping.bridge.last_activity_at ? new Date(ping.bridge.last_activity_at).toLocaleString() : "Ch\u01b0a c\u00f3";
    renderBridgeActivityFeed();
    return ping;
  }

  async function bridgeLedgerRead(params) {
    const workbook = requireBridgeWorkbook();
    const rows = workbook.jobs.filter((job) => params.include_removed || !/^(true|1|yes)$/i.test(String(job.queue_removed || "")));
    const paged = window.DacBridgeProposalCore.page(rows, params.cursor, params.limit);
    const jobs = [];
    for (const job of paged.values) {
      const clean = window.DacBridgeProposalCore.sanitizeLedgerJob(job);
      if (!params.include_prompt) {
        clean.prompt_fingerprint = await window.DacBridgeCore.hashText(clean.prompt || "");
        delete clean.prompt;
      }
      jobs.push(clean);
    }
    return { ledger_etag: await currentLedgerEtag(workbook), run_id: state.runId || workbook.config.run_id || null, checkpoint: checkpointSummary(), jobs, next_cursor: paged.next_cursor };
  }

  function proposalInputFromRecord(record, ledgerEtag) {
    return {
      if_ledger_etag: ledgerEtag,
      proposal_label: record.proposal_label || "",
      jobs: record.jobs.map((job) => ({
        client_job_id: job.client_job_id,
        requested_job_id: job.requested_job_id,
        prompt: job.prompt,
        reference_images: job.reference_images,
        settings: job.settings
      }))
    };
  }

  function buildBridgeProposalPreview(params, ledgerEtag) {
    try {
      const settings = bridgeRuntimeSettings();
      return window.DacBridgeProposalCore.buildPreview({
        params,
        ledger_etag: ledgerEtag,
        existing_jobs: requireBridgeWorkbook().jobs,
        available_references: state.files,
        default_settings: settings,
        max_input_images: settings.max_input_images
      });
    } catch (error) {
      if (error instanceof window.DacBridgeProposalCore.ProposalError) throw error;
      throw new window.DacBridgeCore.BridgeProtocolError("VALIDATION_FAILED", messageOf(error));
    }
  }

  async function bridgeQueuePropose(params, call) {
    requireBridgeWorkbook();
    return serializeBridgeProposalStore(async () => {
      const store = await readBridgeProposalStoreUnlocked();
      const existing = window.DacBridgeProposalCore.findByIdempotency(store.records, call.request.client.client_id, call.request.request_id);
      const payloadHash = await window.DacBridgeCore.hashCanonical({ method: call.request.method, params });
      if (existing) {
        if (existing.payload_hash !== payloadHash) throw new window.DacBridgeCore.BridgeProtocolError("REQUEST_ID_REUSED", undefined, { method: call.request.method });
        return window.DacBridgeProposalCore.publicRecord(existing);
      }
      window.DacBridgeProposalCore.assertCapacity(store.records, params.jobs.length);
      const ledgerEtag = await currentLedgerEtag();
      const preview = buildBridgeProposalPreview(params, ledgerEtag);
      const record = await window.DacBridgeProposalCore.createRecord({
        params, preview, request: call.request, ledger_etag: ledgerEtag,
        hash_canonical: window.DacBridgeCore.hashCanonical,
        hash_text: window.DacBridgeCore.hashText
      });
      store.records.push(record);
      await writeBridgeProposalStoreUnlocked(store);
      renderBridgeProposals();
      log(`Agent Bridge staged ${record.proposal_id} with ${record.jobs.length} job(s); owner review required.`, "info");
      return window.DacBridgeProposalCore.publicRecord(record);
    });
  }

  async function bridgeProposalGet(params) {
    const store = await readBridgeProposalStore();
    const record = store.records.find((item) => item.proposal_id === params.proposal_id);
    if (!record) throw new window.DacBridgeCore.BridgeProtocolError("PROPOSAL_NOT_FOUND", undefined, { proposal_id: params.proposal_id });
    return window.DacBridgeProposalCore.publicRecord(record);
  }

  function withBridgeErrors(handler) {
    return async (...args) => {
      state.bridgeLastActivityAt = new Date().toISOString();
      if (els.bridgeLastActivity) els.bridgeLastActivity.textContent = new Date(state.bridgeLastActivityAt).toLocaleString();
      try { return await handler(...args); }
      catch (error) {
        const wrapped = bridgeError(error);
        bridgeAttentionFromError(wrapped);
        throw wrapped;
      }
    };
  }

  const bridgeExecutorDispatch = window.DacBridgeCore.createDispatcher({
    replay_store: createBridgeReplayStore(),
    handlers: {
      "system.ping": withBridgeErrors(bridgeSystemPing),
      "queue.list": withBridgeErrors(bridgeQueueList),
      "run.status": withBridgeErrors(async () => bridgeRunStatus()),
      "ledger.read": withBridgeErrors(bridgeLedgerRead),
      "jobs.add": withBridgeErrors(bridgeJobsAdd),
      "jobs.update": withBridgeErrors(bridgeJobsUpdate),
      "jobs.remove": withBridgeErrors(bridgeJobsRemove),
      "jobs.reorder": withBridgeErrors(bridgeJobsReorder),
      "output.configure": withBridgeErrors(bridgeOutputConfigure),
      "output.set_folder_hint": withBridgeErrors(bridgeOutputSetFolderHint),
      "run_settings.configure": withBridgeErrors(bridgeRunSettingsConfigure),
      "queue.propose": withBridgeErrors(bridgeQueuePropose),
      "queue.proposal.get": withBridgeErrors(bridgeProposalGet)
    }
  });

  function connectBridgeExecutor() {
    if (!chrome.runtime?.connect || state.bridgePort) return;
    state.bridgeExecutorEpoch ||= crypto.randomUUID();
    const port = chrome.runtime.connect({ name: BRIDGE_EXECUTOR_PORT });
    state.bridgePort = port;
    port.postMessage({ type: "DAC_BRIDGE_EXECUTOR_READY", protocol: window.DacBridgeCore.PROTOCOL, version: 1, executor_epoch: state.bridgeExecutorEpoch });
    port.onMessage.addListener((message) => {
      const wrapped = message?.type === "DAC_BRIDGE_RPC" && typeof message.route_id === "string";
      const envelope = wrapped ? message.envelope : message;
      bridgeExecutorDispatch(envelope, { executor_epoch: state.bridgeExecutorEpoch })
        .then((response) => port.postMessage(wrapped ? { type: "DAC_BRIDGE_RPC_RESPONSE", route_id: message.route_id, envelope: response } : response))
        .catch(() => {
          const response = window.DacBridgeCore.failureResponse(envelope?.request_id, "INTERNAL_ERROR");
          port.postMessage(wrapped ? { type: "DAC_BRIDGE_RPC_RESPONSE", route_id: message.route_id, envelope: response } : response);
        });
    });
    port.onDisconnect.addListener(() => {
      if (state.bridgePort === port) {
        state.bridgePort = null;
        setTimeout(() => connectBridgeExecutor(), 1000);
      }
    });
  }

  function selectedBridgeProposal() {
    const visible = state.bridgeProposals
      .filter((record) => window.DacBridgeProposalCore.PENDING_STATUSES.has(record.status))
      .sort((left, right) => String(left.received_at).localeCompare(String(right.received_at)));
    return visible[0] || null;
  }

  function bridgeApprovalLockReason({ workbookRequired = true, persistenceRequired = true } = {}) {
    let persistenceMissing = !state.outputSettings;
    if (state.outputSettings) {
      try {
        const output = window.DacOutputLocation.effective(state.outputSettings);
        persistenceMissing = !output.saveAuditJsonl || !output.saveResultXlsx;
      } catch (_) { persistenceMissing = true; }
    }
    return window.DacBridgeProposalCore.approvalLockReason({
      running: state.running || state.runStarting,
      reconciliation: state.manualReconciliationRunning,
      recreate: state.recreateRunning || Boolean(state.pendingRecreateJobId) || Boolean(state.pendingRerunJobId),
      audit_gap: state.auditGapRunning || state.auditChain?.code === "RESUME_AUDIT_CHAIN_MISSING",
      queue_mutation: state.queueMutationRunning,
      workbook_missing: workbookRequired && !state.workbook,
      persistence_missing: persistenceRequired && persistenceMissing
    });
  }

  function cloneBridgeOutputSettings(settings) {
    if (!settings) return null;
    return {
      ...settings,
      image: settings.image && typeof settings.image === "object" ? { ...settings.image } : settings.image,
      result: settings.result && typeof settings.result === "object" ? { ...settings.result } : settings.result
    };
  }

  function bridgeDirectSnapshot() {
    return {
      workbook: state.workbook,
      prepared: state.prepared,
      outputSettings: cloneBridgeOutputSettings(state.outputSettings),
      runtimeOverrides: { ...state.runtimeOverrides },
      importedConfig: state.importedConfig,
      configFindings: [...state.configFindings],
      localOverrides: new Set(state.localOverrides),
      outputProfileState: state.outputProfileState,
      destinationMode: state.destinationMode,
      separateResultDestination: state.separateResultDestination,
      runId: state.runId,
      auditEvents: [...state.auditEvents],
      auditFile: state.auditFile,
      resultFile: state.resultFile,
      resumeLedgerFile: state.resumeLedgerFile,
      checkpointVersion: state.checkpointVersion,
      checkpointFilename: state.checkpointFilename,
      checkpointCreatedAt: state.checkpointCreatedAt,
      runSelection: new Set(state.runSelection),
      selectedJobId: state.selectedJobId,
      quickPromptCounter: state.quickPromptCounter,
      validated: state.validated
    };
  }

  function restoreBridgeDirectSnapshot(snapshot, auditPersisted = false) {
    const persistedAuditFile = state.auditFile;
    state.workbook = snapshot.workbook;
    state.prepared = snapshot.prepared;
    state.outputSettings = snapshot.outputSettings;
    state.runtimeOverrides = snapshot.runtimeOverrides;
    state.importedConfig = snapshot.importedConfig;
    state.configFindings = snapshot.configFindings;
    state.localOverrides = snapshot.localOverrides;
    state.outputProfileState = snapshot.outputProfileState;
    state.destinationMode = snapshot.destinationMode;
    state.separateResultDestination = snapshot.separateResultDestination;
    state.runId = snapshot.runId;
    state.auditEvents = auditPersisted ? [] : snapshot.auditEvents;
    state.auditFile = auditPersisted ? persistedAuditFile : snapshot.auditFile;
    state.resultFile = snapshot.resultFile;
    state.resumeLedgerFile = snapshot.resumeLedgerFile;
    state.checkpointVersion = snapshot.checkpointVersion;
    state.checkpointFilename = snapshot.checkpointFilename;
    state.checkpointCreatedAt = snapshot.checkpointCreatedAt;
    state.runSelection = snapshot.runSelection;
    state.selectedJobId = snapshot.selectedJobId;
    state.quickPromptCounter = snapshot.quickPromptCounter;
    state.validated = snapshot.validated;
  }

  function bridgeDirectAuditEvent(event, method, mutation) {
    const output = window.DacOutputLocation.effective(state.outputSettings);
    return {
      timestamp: new Date().toISOString(), run_id: state.runId, job_id: mutation.job_id || null, attempt_id: null,
      event, attempt: null, phase: "PRE_SUBMIT", status: "PENDING", failure_type: null,
      message: mutation.message || `${method} changed Setup state; immutable checkpoint verification is pending.`,
      elapsed_ms: null, references: [], requested_filename: null, result_file: null, result_download_id: null,
      persistence_verified: false, write_outcome: null, detected_not_downloaded: false,
      collision_policy: output.collisionPolicy, prompt_fingerprint: null, target_url: null, submitted_at: null, detection: null,
      input_origin: "bridge_direct", bridge_method: method,
      bridge_job_ids: mutation.job_ids || (mutation.job_id ? [mutation.job_id] : []),
      bridge_changed_fields: mutation.changed_fields || [], checkpoint_verified: false
    };
  }

  function bridgeDirectLock({ workbookRequired = true, persistenceRequired = true } = {}) {
    const reason = bridgeApprovalLockReason({ workbookRequired, persistenceRequired });
    if (reason) throw new window.DacBridgeCore.BridgeProtocolError("RUN_ACTIVE", reason, { lock_reason: reason });
  }

  async function assertBridgeOutputBound() {
    const settings = state.outputSettings;
    if (!settings) throw new window.DacBridgeCore.BridgeProtocolError("VALIDATION_FAILED", "OUTPUT_PROFILE_UNBOUND: Ch\u01b0a c\u00f3 Output Profile trong phi\u00ean hi\u1ec7n t\u1ea1i.");
    let output;
    try { output = window.DacOutputLocation.effective(settings); }
    catch (error) { throw new window.DacBridgeCore.BridgeProtocolError("VALIDATION_FAILED", messageOf(error)); }
    if (output.image?.kind !== "directory" || !output.image.handle || output.result?.kind !== "directory" || !output.result.handle) {
      throw new window.DacBridgeCore.BridgeProtocolError("VALIDATION_FAILED", "OUTPUT_PROFILE_UNBOUND: output.configure ch\u1ec9 \u0111\u01b0\u1ee3c thay \u0111\u1ed5i profile/folder \u0111\u00e3 do \u0110\u1ee9c bind tr\u01b0\u1edbc \u0111\u00f3.");
    }
    const preflight = await window.DacOutputLocation.preflight(settings);
    if (!preflight.ok) throw new window.DacBridgeCore.BridgeProtocolError("PERSISTENCE_VERIFICATION_FAILED", preflight.error);
    return preflight.effective;
  }

  async function executeBridgeDirectMutation({ method, event, workbookRequired = true, persistenceRequired = true, mutate }) {
    if (workbookRequired) requireBridgeWorkbook();
    bridgeDirectLock({ workbookRequired: false, persistenceRequired });
    if (!queueRunLock.tryBeginMutation()) throw new window.DacBridgeCore.BridgeProtocolError("RUN_ACTIVE");
    controls();
    let recoveredForward = null;
    try {
      const outcome = await window.DacApprovalPersistence.execute({
        snapshot: async () => bridgeDirectSnapshot(),
        apply: async () => {
          if (state.workbook) state.workbook = await window.DacXlsx.cloneWorkbook(state.workbook);
          const mutation = await mutate();
          if (!state.workbook) throw new window.DacBridgeCore.BridgeProtocolError("WORKBOOK_NOT_LOADED");
          state.runId = state.runId || window.DacResumeCore.createRunId(state.workbook.fileName);
          state.prepared = window.DacRunnerCore.prepare(state.workbook, state.files, state.runtimeOverrides);
          const preflight = await window.DacOutputLocation.preflight(state.outputSettings);
          if (!preflight.ok) throw new window.DacBridgeCore.BridgeProtocolError("PERSISTENCE_VERIFICATION_FAILED", preflight.error);
          const auditEvent = bridgeDirectAuditEvent(event, method, mutation);
          state.auditEvents.push(auditEvent);
          return { mutation, candidate: state.workbook, auditEvent, output: preflight.effective };
        },
        persist_audit: async (applied) => {
          state.auditFile = await saveAuditLog(applied.output.result, { appendExisting: true, force: true });
          if (!state.auditFile) throw new window.DacBridgeCore.BridgeProtocolError("PERSISTENCE_VERIFICATION_FAILED", "BRIDGE_DIRECT_AUDIT_PERSISTENCE_FAILED: Audit JSONL was not verified.");
          return state.auditFile;
        },
        persist_checkpoint: async (applied, auditFile) => {
          const checkpoint = await persistLedgerCandidate(applied.candidate, applied.output.result, auditFile, { force: true });
          if (!checkpoint) throw new window.DacBridgeCore.BridgeProtocolError("PERSISTENCE_VERIFICATION_FAILED", "BRIDGE_DIRECT_CHECKPOINT_FAILED: Result checkpoint was not verified.");
          return checkpoint;
        },
        commit: async (applied, auditFile, checkpoint) => {
          state.workbook = checkpoint.workbook;
          state.auditFile = auditFile;
          state.resultFile = checkpoint.actual;
          state.resumeLedgerFile = checkpoint.filename;
          state.checkpointVersion = checkpoint.version;
          state.checkpointFilename = checkpoint.filename;
          state.checkpointCreatedAt = checkpoint.checkpoint.checkpoint_created_at;
          if (state.resumeMode) state.resumePlan = window.DacResumeCore.plan(state.workbook);
          await refreshQueueAfterMutation(applied.mutation.message);
          if (state.resumeMode && state.prepared) window.DacResumeCore.applyToQueue(state.prepared.queue, state.resumePlan.jobs);
          renderCheckpointMeta();
          recordBridgeActivity(applied.auditEvent);
          // A verified direct mutation proves workbook, persistence, and folder
          // authorization are all unblocked — retire every attention row.
          clearBridgeAttention();
          refreshBridgeScreen().catch(() => {});
          return { ...applied.mutation, audit_event: event, checkpoint: { version: checkpoint.version, filename: checkpoint.filename, verified: true } };
        },
        rollback: async ({ snapshot, applied, audit, checkpoint, error }) => {
          if (checkpoint) {
            state.workbook = checkpoint.workbook;
            state.auditFile = audit || state.auditFile;
            state.resultFile = checkpoint.actual;
            state.resumeLedgerFile = checkpoint.filename;
            state.checkpointVersion = checkpoint.version;
            state.checkpointFilename = checkpoint.filename;
            state.checkpointCreatedAt = checkpoint.checkpoint.checkpoint_created_at;
            try { await prepare({ diagnostic: true }); } catch (_) { state.prepared = null; }
            recoveredForward = { applied, checkpoint, error };
            return;
          }
          restoreBridgeDirectSnapshot(snapshot, Boolean(audit));
        }
      });
      return outcome.result;
    } catch (error) {
      if (recoveredForward) {
        recordBridgeActivity(recoveredForward.applied.auditEvent);
        return {
          ...recoveredForward.applied.mutation,
          audit_event: event,
          checkpoint: { version: recoveredForward.checkpoint.version, filename: recoveredForward.checkpoint.filename, verified: true },
          recovered_forward: true
        };
      }
      // A version conflict is a plain Error from the checkpoint writer; left
      // unmapped it launders to a meaningless INTERNAL_ERROR (hit live
      // 2026-08-25: session opened from the SOURCE workbook while the folder
      // already held v01). Map it so the agent gets a clear retryable code and
      // the attention hub can point Đức at "load the latest Result checkpoint".
      if (!(error instanceof window.DacBridgeCore.BridgeProtocolError) && /CHECKPOINT_VERSION_CONFLICT/.test(messageOf(error))) {
        throw new window.DacBridgeCore.BridgeProtocolError("PERSISTENCE_VERIFICATION_FAILED", `${messageOf(error)} Phiên đang mở từ workbook gốc — nạp Result checkpoint mới nhất (Tiếp tục run có sẵn) rồi gọi lại.`);
      }
      throw error;
    } finally {
      queueRunLock.endMutation();
      renderBridgeProposals(); renderQueue(); renderOutput(); controls();
    }
  }

  async function bridgeJobsAdd(params) {
    const bootstrap = !state.workbook;
    return executeBridgeDirectMutation({
      method: "jobs.add", event: "BRIDGE_JOB_ADDED_DIRECT", workbookRequired: false, persistenceRequired: !bootstrap,
      mutate: async () => applyBridgeJobsAdd(params.jobs)
    });
  }

  async function bridgeJobsUpdate(params) {
    return executeBridgeDirectMutation({
      method: "jobs.update", event: "BRIDGE_JOB_UPDATED",
      mutate: async () => applyQueueJobUpdate(params.job_id, params)
    });
  }

  async function bridgeJobsRemove(params) {
    return executeBridgeDirectMutation({
      method: "jobs.remove", event: "BRIDGE_JOB_REMOVED",
      mutate: async () => applyQueueJobRemoval(params.job_id)
    });
  }

  async function bridgeJobsReorder(params) {
    return executeBridgeDirectMutation({
      method: "jobs.reorder", event: "BRIDGE_JOB_REORDERED",
      mutate: async () => applyQueueJobPosition(params.job_id, params.position)
    });
  }

  async function bridgeOutputConfigure(params) {
    requireBridgeWorkbook();
    await assertBridgeOutputBound();
    return executeBridgeDirectMutation({
      method: "output.configure", event: "BRIDGE_OUTPUT_CONFIGURED", persistenceRequired: false,
      mutate: async () => applyArtifactNamingValues(params)
    });
  }

  async function bridgeRunSettingsConfigure(params) {
    return executeBridgeDirectMutation({
      method: "run_settings.configure", event: "BRIDGE_RUN_SETTINGS_CONFIGURED",
      mutate: async () => applyRuntimeOverrideValues(params)
    });
  }

  // "AI là bộ não, người là cánh tay": the agent that prepared a task package
  // already knows every folder path it created, so it records the path here
  // and the attention rows / pick dialog serve it back to Đức one-click-copy.
  // DISPLAY METADATA ONLY — deliberately not routed through
  // executeBridgeDirectMutation: it writes no workbook data and no checkpoint,
  // and it must keep working precisely when persistence is unavailable
  // (revoked folder after a reload is its main use case).
  async function bridgeOutputSetFolderHint(params) {
    let profileId = params.profile_id || "";
    const stored = await window.DacOutputProfiles.list();
    if (!profileId) {
      if (!stored.length) throw new window.DacBridgeCore.BridgeProtocolError("VALIDATION_FAILED", "NO_OUTPUT_PROFILE: Chưa có output profile nào được bind — Đức phải chọn folder một lần trước.");
      if (stored.length > 1) throw new window.DacBridgeCore.BridgeProtocolError("VALIDATION_FAILED", `PROFILE_AMBIGUOUS: Nhiều profile đang tồn tại (${stored.map((profile) => profile.profile_id).join(", ")}) — truyền profile_id.`);
      profileId = stored[0].profile_id;
    }
    const updated = await window.DacOutputProfiles.setHint(profileId, params.folder_hint);
    if (!updated) throw new window.DacBridgeCore.BridgeProtocolError("VALIDATION_FAILED", `PROFILE_NOT_FOUND: Không có profile '${profileId}'.`);
    if (!state.outputSettings) state.outputSettings = window.DacOutputLocation.fromWorkbook({}, "phien-chua-mo-workbook.xlsx");
    state.outputSettings.folderHint = params.folder_hint;
    await probeBridgePersistence().catch(() => {});
    renderBridgeAttention();
    return { profile_id: profileId, folder_hint: params.folder_hint };
  }

  function appendBridgeMeta(label, value) {
    els.bridgeProposalMeta.append(element("dt", "", label), element("dd", "", value || "—"));
  }

  function renderBridgeProposals() {
    if (!els.bridgeProposalCard) return;
    const record = selectedBridgeProposal();
    els.bridgeProposalCard.hidden = false;
    els.bridgeProposalMeta.replaceChildren();
    els.bridgeProposalList.replaceChildren();
    if (!record) {
      els.bridgeProposalCount.textContent = "0 job";
      els.bridgeProposalStatus.textContent = "Chưa có đề xuất đang chờ";
      // The approval-explainer paragraph only makes sense while a proposal is
      // showing — leaving it visible in the empty state reads as "the top says
      // 0 job but the bottom still talks about approving these jobs" (Đức's
      // live report, 2026-08-25).
      if (els.bridgeProposalNotice) els.bridgeProposalNotice.hidden = true;
      els.bridgeProposalLockReason.textContent = state.workbook ? "Có thể nạp một fixture 1 job để kiểm tra giao diện; fixture chỉ vào vùng cách ly." : "Mở workbook trước khi nạp fixture kiểm tra.";
      els.bridgeProposalFixtureBtn.hidden = false;
      els.bridgeProposalFixtureBtn.disabled = !state.workbook;
      els.bridgeProposalRejectBtn.hidden = true;
      els.bridgeProposalApproveBtn.hidden = true;
      return;
    }
    if (els.bridgeProposalNotice) els.bridgeProposalNotice.hidden = false;
    els.bridgeProposalFixtureBtn.hidden = true;
    els.bridgeProposalRejectBtn.hidden = false;
    els.bridgeProposalApproveBtn.hidden = false;
    els.bridgeProposalCount.textContent = `${record.jobs.length} job`;
    els.bridgeProposalStatus.textContent = BRIDGE_STATUS_LABELS[record.status] || record.status;
    appendBridgeMeta("Agent", `${record.client?.name || "—"} (${record.client?.client_id || "—"})`);
    appendBridgeMeta("Nhãn", record.proposal_label || "Không có nhãn");
    appendBridgeMeta("Nhận lúc", new Date(record.received_at).toLocaleString());
    appendBridgeMeta("Proposal ID", record.proposal_id);
    for (const job of record.jobs) {
      const item = element("li", "bridge-proposal-job");
      item.appendChild(element("div", "bridge-proposal-job-title", `${job.job_id} · ${job.client_job_id}`));
      const prompt = element("div", "bridge-proposal-field");
      prompt.append(element("strong", "", "Prompt đầy đủ"), element("div", "bridge-proposal-prompt", job.prompt || "Prompt đã được xoá khỏi vùng cách ly."));
      const references = element("div", "bridge-proposal-field");
      references.append(element("strong", "", "Reference aliases / filenames"), element("div", "bridge-proposal-values", job.reference_images?.join(", ") || "Không có"));
      const settings = element("div", "bridge-proposal-field");
      settings.append(
        element("strong", "", "Thiết lập hiệu lực"),
        element("div", "bridge-proposal-values", `Timeout ${job.settings.timeout_sec}s · Retry ${job.settings.max_retries} · Cooldown ${job.settings.safety_cooldown_sec}s · Output ${job.settings.output_folder}`)
      );
      item.append(prompt, references, settings);
      els.bridgeProposalList.appendChild(item);
    }
    const lockReason = bridgeApprovalLockReason();
    els.bridgeProposalLockReason.textContent = lockReason || (record.failure?.message ? `Lý do: ${record.failure.message}` : "");
    // A pending proposal blocked on a human-only precondition must surface in
    // the attention hub on its own — the agent may never retry, so waiting for
    // a failed call would leave the hub silent exactly when Đức is needed.
    if (lockReason) {
      if (!state.workbook) raiseBridgeAttention("WORKBOOK_NEEDED", "Đề xuất từ Agent đang chờ duyệt nhưng chưa có workbook/ledger đang mở.", bridgeTargetFolderSuggestion());
      else if (/bật lưu audit/i.test(lockReason)) raiseBridgeAttention("PERSISTENCE_TOGGLES_OFF", lockReason);
    }
    const deciding = record.status === "APPROVING";
    els.bridgeProposalApproveBtn.disabled = Boolean(lockReason) || deciding;
    els.bridgeProposalRejectBtn.disabled = deciding || state.queueMutationRunning;
  }

  async function stageBridgeFixture() {
    if (!state.workbook) { renderBridgeProposals(); return; }
    const ledgerEtag = await currentLedgerEtag();
    const response = await bridgeExecutorDispatch({
      protocol: window.DacBridgeCore.PROTOCOL,
      version: 1,
      kind: "request",
      request_id: `fixture-${crypto.randomUUID()}`,
      method: "queue.propose",
      sent_at: new Date().toISOString(),
      client: { client_id: "duc-sidepanel-fixture", name: "Fixture kiểm tra", version: "1.0.0" },
      params: {
        if_ledger_etag: ledgerEtag,
        proposal_label: "Kiểm tra giao diện WP-2",
        jobs: [{ client_job_id: "fixture-001", requested_job_id: null, prompt: "Fixture kiểm tra: tạo một ảnh minh hoạ đơn giản. Đây chỉ là đề xuất; không tự chạy.", reference_images: [], settings: {} }]
      }
    }, { executor_epoch: state.bridgeExecutorEpoch, source: "built_in_fixture" });
    if (!response.ok) throw new Error(`${response.error.code}: ${response.error.message}`);
    await readBridgeProposalStore();
    renderBridgeProposals();
    log(`Đã nạp fixture ${response.result.proposal_id}; chưa thay đổi Queue và chưa chạy.`, "info");
  }

  async function replaceBridgeRecord(next, { clearReplay = false } = {}) {
    await serializeBridgeProposalStore(async () => {
      const store = await readBridgeProposalStoreUnlocked();
      const index = store.records.findIndex((record) => record.proposal_id === next.proposal_id);
      if (index < 0) throw new window.DacBridgeCore.BridgeProtocolError("PROPOSAL_NOT_FOUND");
      store.records[index] = next;
      if (clearReplay) delete store.replays[next.idempotency_key];
      await writeBridgeProposalStoreUnlocked(store);
    });
    renderBridgeProposals();
    return next;
  }

  async function rejectBridgeProposal() {
    const record = selectedBridgeProposal();
    if (!record || record.status === "APPROVING") return;
    const rejected = window.DacBridgeProposalCore.transition(record, "REJECTED", { rejected_at: new Date().toISOString() });
    await replaceBridgeRecord(rejected, { clearReplay: true });
    log(`Đã từ chối đề xuất Agent ${record.proposal_id}; workbook và Queue không thay đổi.`, "done");
  }

  async function revalidatedBridgeRecord(record, ledgerEtag) {
    const params = proposalInputFromRecord(record, ledgerEtag);
    const preview = buildBridgeProposalPreview(params, ledgerEtag);
    const jobs = [];
    for (const job of preview) {
      jobs.push({
        ...job,
        bridge_prompt_sha256: await window.DacBridgeCore.hashText(job.prompt),
        bridge_payload_sha256: await window.DacBridgeCore.hashCanonical({ job_id: job.job_id, client_job_id: job.client_job_id, prompt: job.prompt, reference_images: job.reference_images, settings: job.settings })
      });
    }
    return { ...record, base_ledger_etag: ledgerEtag, jobs };
  }

  function bridgeAuditEvent(event, record, job, approvedAt, message) {
    return {
      timestamp: new Date().toISOString(), run_id: state.runId, job_id: job?.job_id || null, attempt_id: null,
      event, attempt: null, phase: "PRE_SUBMIT", status: "PENDING", failure_type: null, message,
      elapsed_ms: null, references: job?.reference_images || [], requested_filename: null, result_file: null,
      result_download_id: null, persistence_verified: false, write_outcome: null, detected_not_downloaded: false,
      collision_policy: window.DacOutputLocation.effective(state.outputSettings).collisionPolicy,
      prompt_fingerprint: job?.bridge_prompt_sha256 || null, target_url: null, submitted_at: null, detection: null,
      input_origin: "bridge", bridge_proposal_id: record.proposal_id, bridge_request_id: record.request_id,
      bridge_client_id: record.client.client_id, bridge_client_job_id: job?.client_job_id || null,
      bridge_approved_at: approvedAt, bridge_payload_sha256: job?.bridge_payload_sha256 || null,
      checkpoint_verified: false
    };
  }

  function adoptBridgeCheckpoint(applied, auditFile, checkpoint) {
    state.workbook = checkpoint.workbook;
    state.prepared = null;
    state.auditFile = auditFile;
    state.resultFile = checkpoint.actual;
    state.checkpointVersion = checkpoint.version;
    state.checkpointFilename = checkpoint.filename;
    state.checkpointCreatedAt = checkpoint.checkpoint.checkpoint_created_at;
    state.resumeLedgerFile = checkpoint.filename;
    state.runSelection = new Set(applied.added_ids);
    state.queueExpanded = true;
    state.validated = false;
  }

  function replaceBridgeRecordInMemory(next) {
    const index = state.bridgeProposals.findIndex((item) => item.proposal_id === next.proposal_id);
    if (index >= 0) {
      const records = [...state.bridgeProposals];
      records[index] = next;
      state.bridgeProposals = records;
    }
  }

  async function markBridgeApprovalFailed(record, error, values = {}) {
    const failed = window.DacBridgeProposalCore.transition(record, "APPROVAL_FAILED", {
      failure: { code: "APPROVAL_FAILED", message: messageOf(error), original_code: error?.code || null, ...values }
    });
    await replaceBridgeRecord(failed, { clearReplay: true });
    setStatus("ERROR");
    progress(`Duyệt đề xuất Agent thất bại; Queue chưa được checkpoint: ${messageOf(error)}`);
    log(`Bridge proposal ${record.proposal_id} approval failed: ${messageOf(error)}`, "error");
    return failed;
  }

  async function approveBridgeProposal() {
    let record = selectedBridgeProposal();
    if (!record || record.status === "APPROVING") return;
    const initialLock = bridgeApprovalLockReason();
    if (initialLock) { renderBridgeProposals(); return; }
    if (!queueRunLock.tryBeginMutation()) { renderBridgeProposals(); return; }
    controls(); renderBridgeProposals();
    try {
    let ledgerEtag;
    let revalidated;
    try {
      ledgerEtag = await currentLedgerEtag();
      revalidated = await revalidatedBridgeRecord(record, ledgerEtag);
    } catch (error) {
      await markBridgeApprovalFailed(record, error);
      return;
    }
    const exactChanged = record.base_ledger_etag !== ledgerEtag || window.DacBridgeCore.canonicalJson(record.jobs) !== window.DacBridgeCore.canonicalJson(revalidated.jobs);
    if (exactChanged) {
      record = window.DacBridgeProposalCore.transition(revalidated, "NEEDS_REVIEW", { failure: { code: "PROPOSAL_CONFLICT", message: "Ledger hoặc ID đã đổi. Kiểm tra lại danh sách chính xác rồi bấm duyệt thêm một lần." } });
      await replaceBridgeRecord(record, { clearReplay: true });
      return;
    }

    let effectiveOutput;
    try {
      const outputCheck = await window.DacOutputLocation.preflight(state.outputSettings);
      if (!outputCheck.ok) throw new window.DacBridgeCore.BridgeProtocolError("PERSISTENCE_VERIFICATION_FAILED", outputCheck.error);
      effectiveOutput = outputCheck.effective;
      if (!effectiveOutput.saveAuditJsonl || !effectiveOutput.saveResultXlsx) {
        throw new window.DacBridgeCore.BridgeProtocolError("PERSISTENCE_VERIFICATION_FAILED", "Bridge approval requires both audit JSONL and Result XLSX persistence.");
      }
    } catch (error) {
      await markBridgeApprovalFailed(record, error);
      return;
    }
    const approvedAt = new Date().toISOString();
    record = window.DacBridgeProposalCore.transition(record, "APPROVING", { approved_at: approvedAt, failure: null });
    await replaceBridgeRecord(record, { clearReplay: true });
    let approvalFailureRecorded = false;
    let postCheckpointRecovery = null;
    try {
      await window.DacApprovalPersistence.execute({
        snapshot: async () => ({
          workbook: state.workbook, prepared: state.prepared, runId: state.runId, auditEvents: [...state.auditEvents],
          auditFile: state.auditFile, resultFile: state.resultFile, resumeLedgerFile: state.resumeLedgerFile,
          checkpointVersion: state.checkpointVersion, checkpointFilename: state.checkpointFilename, checkpointCreatedAt: state.checkpointCreatedAt,
          runSelection: new Set(state.runSelection), validated: state.validated
        }),
        apply: async () => {
          state.runId = state.runId || window.DacResumeCore.createRunId(state.workbook.fileName);
          const candidate = await window.DacXlsx.cloneWorkbook(state.workbook);
          const activeCount = window.DacXlsx.activeJobs(candidate).length;
          const rows = record.jobs.map((job, index) => ({
            id: job.job_id,
            prompt: job.prompt,
            reference_images: job.reference_images.join("|"),
            timeout_sec: job.settings.timeout_sec,
            max_retries: job.settings.max_retries,
            safety_cooldown_sec: job.settings.safety_cooldown_sec,
            output_folder: job.settings.output_folder,
            queue_position: activeCount + index + 1,
            queue_removed: "false",
            ...window.DacBridgeProposalCore.bridgeFields(record, job, approvedAt)
          }));
          const added = window.DacXlsx.addJobsBatch(candidate, rows);
          state.auditEvents.push(bridgeAuditEvent("BRIDGE_PROPOSAL_APPROVED", record, null, approvedAt, "Owner approved the exact proposal; checkpoint verification is pending."));
          for (const job of record.jobs) state.auditEvents.push(bridgeAuditEvent("BRIDGE_JOB_ADDED", record, job, approvedAt, "Candidate row added; it is not eligible until the Result checkpoint is verified."));
          return { candidate, added_ids: added.map((job) => job.id) };
        },
        persist_audit: async () => {
          state.auditFile = await saveAuditLog(effectiveOutput.result, { appendExisting: true });
          if (!state.auditFile) throw new Error("BRIDGE_AUDIT_PERSISTENCE_FAILED: Audit JSONL was not verified.");
          return state.auditFile;
        },
        persist_checkpoint: async (applied, auditFile) => {
          const persisted = await persistLedgerCandidate(applied.candidate, effectiveOutput.result, auditFile);
          if (!persisted) throw new Error("BRIDGE_APPROVAL_CHECKPOINT_FAILED: Result checkpoint was not verified.");
          return persisted;
        },
        commit: async (applied, auditFile, checkpoint) => {
          // The verified immutable checkpoint is now authoritative.  Adopt it
          // before any fallible derived-view or proposal-store work so a later
          // error can never roll memory back behind disk truth.
          adoptBridgeCheckpoint(applied, auditFile, checkpoint);
          if (state.resumeMode) state.resumePlan = window.DacResumeCore.plan(state.workbook);
          const newEtag = await currentLedgerEtag();
          const approved = window.DacBridgeProposalCore.transition(record, "APPROVED_CHECKPOINTED", {
            approved_at: approvedAt,
            checkpoint: { version: checkpoint.version, filename: checkpoint.filename, verified: true },
            ledger_etag: newEtag,
            final_job_ids: applied.added_ids,
            failure: null
          });
          await replaceBridgeRecord(approved, { clearReplay: true });
          await prepare({ diagnostic: true });
          if (state.resumeMode && state.prepared) window.DacResumeCore.applyToQueue(state.prepared.queue, state.resumePlan.jobs);
          renderCheckpointMeta(); renderQueue(); renderOutput(); controls();
          showScreen("runScreen");
          progress(`Đã thêm ${applied.added_ids.length} job (${applied.added_ids.join(", ")}) vào Queue và xác minh checkpoint ${checkpoint.filename} — chưa chạy.`);
          log(`Bridge proposal ${record.proposal_id} checkpointed as ${checkpoint.filename}; no run was started.`, "done");
          return approved;
        },
        rollback: async ({ snapshot, applied, audit, checkpoint, error }) => {
          const persistedRunId = state.runId;
          const persistedAuditFile = state.auditFile;
          if (checkpoint) {
            // A verified Result XLSX cannot be rolled back.  Recover forward:
            // keep it authoritative, persist terminal proposal state when
            // possible, and record a checkpoint-verified recovery event.
            adoptBridgeCheckpoint(applied, audit, checkpoint);
            let newEtag = null;
            try { newEtag = await currentLedgerEtag(checkpoint.workbook); } catch (_) { /* The checkpoint remains the source of truth. */ }
            const approved = window.DacBridgeProposalCore.transition(record, "APPROVED_CHECKPOINTED", {
              approved_at: approvedAt,
              checkpoint: { version: checkpoint.version, filename: checkpoint.filename, verified: true },
              ledger_etag: newEtag,
              final_job_ids: applied.added_ids,
              failure: null
            });
            replaceBridgeRecordInMemory(approved);
            let proposalRecorded = false;
            try { await replaceBridgeRecord(approved, { clearReplay: true }); proposalRecorded = true; } catch (_) { /* In-memory terminal state prevents a second click in this document. */ }
            try {
              const recoveryEvent = bridgeAuditEvent("BRIDGE_PROPOSAL_POST_CHECKPOINT_RECOVERED", record, null, approvedAt, `Verified checkpoint ${checkpoint.filename} remains authoritative after post-checkpoint failure.`);
              recoveryEvent.checkpoint_verified = true;
              recoveryEvent.result_file = checkpoint.filename;
              recoveryEvent.write_outcome = "RECOVERED_FORWARD";
              state.auditEvents = [recoveryEvent];
              await saveAuditLog(effectiveOutput.result, { appendExisting: true });
              approvalFailureRecorded = true;
            } catch (_) { state.auditEvents = []; }
            try {
              if (state.resumeMode) state.resumePlan = window.DacResumeCore.plan(state.workbook);
              await prepare({ diagnostic: true });
              if (state.resumeMode && state.prepared) window.DacResumeCore.applyToQueue(state.prepared.queue, state.resumePlan.jobs);
            } catch (_) { state.prepared = null; }
            postCheckpointRecovery = { checkpoint, approved, proposalRecorded, error };
            return;
          }
          if (audit) {
            try {
              state.auditEvents = [bridgeAuditEvent("BRIDGE_PROPOSAL_APPROVAL_FAILED", record, null, approvedAt, "Approval failed before a verified Result checkpoint; no proposed row became eligible.")];
              await saveAuditLog(effectiveOutput.result, { appendExisting: true });
              approvalFailureRecorded = true;
            } catch (_) { /* Failure evidence remains visible in proposal storage. */ }
          }
          state.workbook = snapshot.workbook; state.prepared = snapshot.prepared; state.runId = audit ? persistedRunId : snapshot.runId;
          state.auditEvents = audit ? [] : snapshot.auditEvents; state.auditFile = audit ? persistedAuditFile : snapshot.auditFile; state.resultFile = snapshot.resultFile;
          state.resumeLedgerFile = snapshot.resumeLedgerFile; state.checkpointVersion = snapshot.checkpointVersion;
          state.checkpointFilename = snapshot.checkpointFilename; state.checkpointCreatedAt = snapshot.checkpointCreatedAt;
          state.runSelection = snapshot.runSelection; state.validated = snapshot.validated;
        }
      });
    } catch (error) {
      if (postCheckpointRecovery) {
        setStatus("READY");
        progress(`Checkpoint ${postCheckpointRecovery.checkpoint.filename} đã được xác minh và vẫn là nguồn chuẩn; lỗi hậu xử lý đã được phục hồi tiến, không chạy job.`);
        log(`Bridge proposal ${record.proposal_id} recovered forward after checkpoint: ${messageOf(error)}`, "warn");
      } else {
        await markBridgeApprovalFailed(record, error, { audit_recorded: approvalFailureRecorded });
      }
    }
    } finally {
      queueRunLock.endMutation(); renderBridgeProposals(); renderQueue(); controls();
    }
  }

  function renderCurrentJobReferences(item) {
    if (els.currentJobContent) els.currentJobContent.hidden = !item;
    if (!els.currentReferenceColumn || !els.currentReferenceGallery) return;
    const references = (item?.references || []).filter((reference) => reference?.dataUrl);
    els.currentReferenceColumn.hidden = references.length === 0;
    els.currentReferenceGallery.replaceChildren();
    for (const reference of references) {
      const image = document.createElement("img");
      const label = reference.alias || reference.fileName || "Attached reference image";
      image.className = "current-reference-thumb";
      image.src = reference.dataUrl;
      image.alt = label;
      image.title = label;
      els.currentReferenceGallery.appendChild(image);
    }
  }

  function renderRuntime() {
    if (els.continuedRunLabel) els.continuedRunLabel.hidden = !state.resumeMode;
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
    const runtimeInfo = currentRuntimeInfo(now);

    let attemptText = "";
    let attemptBadgeText = "Attempt —";
    if (item) {
      const isRetryEligible = item.status === "RUNNING" && item.phase === "PRE_SUBMIT";
      const attemptLabel = isRetryEligible
        ? `Attempt ${item.attempt_count}/${1 + item.settings.max_retries}`
        : `Attempt ${item.attempt_count}`;
      const flags = [];
      if (!isRetryEligible && ["FAILED", "INTERRUPTED", "STOPPED"].includes(item.status) && retriesExhausted(item)) {
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
    renderCurrentJobReferences(item);

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
      els.currentTiming.textContent = state.currentReason || "Waiting…";
    }

    if (els.runtimeJobElapsed) els.runtimeJobElapsed.textContent = runtimeInfo.jobElapsed;
    if (els.runtimeCurrentOperation) els.runtimeCurrentOperation.textContent = runtimeInfo.currentOperation;
    if (els.runtimeTimeoutRemaining) els.runtimeTimeoutRemaining.textContent = runtimeInfo.operationTimeoutRemaining;
    if (els.runtimeRetryState) els.runtimeRetryState.textContent = runtimeInfo.retryState;
    if (els.runtimeInterJobDelay) els.runtimeInterJobDelay.textContent = runtimeInfo.interJobDelay;
    if (els.runtimeNextTransition) els.runtimeNextTransition.textContent = runtimeInfo.nextTransition;

    const saved = item?.persistence_verified ? item.result_file || "" : "";
    els.currentSaved.hidden = !saved && !item?.detected_not_downloaded;
    els.currentSaved.textContent = saved ? `SAVED ✓ ${saved}` : item?.detected_not_downloaded ? "DETECTED · not downloaded" : "";

    updatePipelineStepper(item);
    updateOperatorTimer(runtimeInfo);

    const isHalted = ["INTERRUPTED", "STOPPED"].includes(item?.status) || state.currentStage === "HALTED";
    updateHaltedBanner(isHalted, item, state.currentReason);

    const lastSavedItem = (state.prepared?.queue || []).slice().reverse().find((i) => i.persistence_verified && i.result_file) || (state.prepared?.queue || []).slice().reverse().find((i) => i.detected_not_downloaded);
    if (els.latestSavedName) {
      if (lastSavedItem) {
        els.latestSavedName.textContent = lastSavedItem.result_file ? window.DacOutputLocation.artifactLeaf(lastSavedItem.result_file) : "Detected (no download)";
        els.latestSavedStatus.textContent = lastSavedItem.persistence_verified ? `Saved ✓ (${lastSavedItem.job.id})` : "Detected · not downloaded";
        if (els.latestSavedThumb) {
          const thumb = thumbnailImage(lastSavedItem.thumbnailUrl || state.sessionThumbnails.get(lastSavedItem.job.id), lastSavedItem.job.id, "mini-thumb-img");
          if (thumb) els.latestSavedThumb.replaceChildren(thumb);
          else els.latestSavedThumb.textContent = "🖼";
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
    const diagnostics = state.diagnostics;
    let settings = state.prepared?.settings || null;
    if (!settings && state.workbook) {
      try { settings = window.DacRunnerCore.runtimeConfig(state.workbook.config, state.runtimeOverrides); } catch (_) { /* The diagnostic row carries the invalid setting finding. */ }
    }
    const sections = window.DacOrchestratorReview.checklist({ workbook: state.workbook, prepared: state.prepared, diagnostics, outputSettings: state.outputSettings, output: window.DacOutputLocation, settings });
    const targets = {
      workbook: [els.checkWorkbook, els.statusWorkbook], jobs: [els.checkJobs, els.statusJobs], references: [els.checkReferences, els.statusReferences],
      output: [els.checkOutput, els.statusOutput], save_modes: [els.checkSaveModes, els.statusSaveModes], naming: [els.checkNaming, els.statusNaming],
      settings: [els.checkSettings, els.statusSettings], chatgpt: [els.checkChatGPT, els.statusChatGPT]
    };
    const setItem = (element, statusElement, section) => {
      if (!element) return;
      const severity = section.severity;
      element.classList.toggle("ready", severity === "OK");
      element.classList.toggle("warning", severity === "WARNING" || severity === "BLOCKER");
      const icon = element.querySelector(".check-icon");
      if (icon) icon.textContent = severity === "OK" ? "✓" : severity ? "⚠" : "○";
      if (statusElement) statusElement.textContent = section.detail;
    };
    for (const section of sections) setItem(...(targets[section.id] || []), section);
    if (els.readinessBanner) {
      if (state.validated) {
        els.readinessBanner.className = "readiness-banner ready";
        els.readinessBanner.textContent = "READY TO RUN";
      } else if (diagnostics?.summary?.blockers) {
        els.readinessBanner.className = "readiness-banner not-ready";
        els.readinessBanner.textContent = "NEEDS INPUT";
      } else if (diagnostics?.summary?.warnings) {
        els.readinessBanner.className = "readiness-banner warning";
        els.readinessBanner.textContent = "WARNING";
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
    const operatorLocked = state.running || state.manualReconciliationRunning || state.recreateRunning || state.auditGapRunning || state.queueMutationRunning;
    const outputLocked = !state.workbook || operatorLocked;
    els.validateBtn.disabled = !state.workbook || operatorLocked;
    if (els.quickPromptCheckBtn) els.quickPromptCheckBtn.disabled = operatorLocked;
    // A green "ready" chip that cannot act is the exact lie this project
    // rejects: prepared/validated only means the workbook is well-formed, not
    // that any job is actually eligible (every job may already be
    // SAFE_COMPLETE / protected). Run must reflect real eligibility.
    const eligibleAll = ready ? window.DacRunnerCore.selectQueue(state.prepared.queue, "all").length : 0;
    els.runBtn.disabled = !ready || operatorLocked || eligibleAll === 0;
    els.runBtn.textContent = state.resumeMode ? "▶ CONTINUE RUN" : "▶ START RUN";
    if (els.runFromRunTabBtn) {
      els.runFromRunTabBtn.disabled = !ready || operatorLocked || eligibleAll === 0;
      els.runFromRunTabBtn.textContent = state.resumeMode ? "▶ CONTINUE RUN" : "▶ START RUN";
    }
    if (els.runEligibilityHint) {
      const showHint = ready && !operatorLocked && eligibleAll === 0;
      els.runEligibilityHint.hidden = !showHint;
      if (showHint) els.runEligibilityHint.textContent = "Mọi job trong ledger đã hoàn tất — chọn job muốn chạy lại bên dưới (mục QUEUE), hoặc dùng \"Chạy job đã chọn\".";
    }
    const eligibleFailed = (state.prepared?.queue || []).some((item) => item.status === "FAILED" && !item.protected_checkpoint);
    els.runFailedBtn.disabled = !ready || operatorLocked || !eligibleFailed;
    if (els.runSelectedBtn) {
      const selectedEligible = ready ? window.DacRunnerCore.selectQueue(state.prepared.queue, "selected", state.runSelection).length : 0;
      els.runSelectedBtn.disabled = !ready || operatorLocked || selectedEligible === 0;
      els.runSelectedBtn.textContent = selectedEligible ? `▶ Chạy ${selectedEligible} job đã chọn` : "▶ Chạy job đã chọn";
    }
    const selectableQueue = (state.prepared?.queue || []).filter(isQueueSelectable);
    const selectedSelectable = selectableQueue.filter((item) => state.runSelection.has(item.job.id)).length;
    if (els.selectAllQueueBtn) {
      els.selectAllQueueBtn.disabled = operatorLocked || !selectableQueue.length || selectedSelectable === selectableQueue.length;
      els.selectAllQueueBtn.textContent = selectableQueue.length ? `Tick tất cả (${selectableQueue.length})` : "Tick tất cả";
    }
    if (els.clearQueueSelectionBtn) els.clearQueueSelectionBtn.disabled = operatorLocked || state.runSelection.size === 0;
    els.stopBtn.disabled = !state.running;
    if (els.pauseResumeBtn) {
      // The button must flip the instant the operator clicks it, not only
      // once the pause has physically taken hold (after the in-flight job
      // finishes) -- a delayed flip read as "did my click even register?"
      // and led the operator to press Stop instead of the (correctly
      // working, just not yet visible) Resume. state.pauseRequested is the
      // operator's intent; state.paused is only whether that intent has
      // physically taken effect yet. The label follows intent; the status
      // chip ("PAUSED") and the running/paused distinction elsewhere still
      // say when the hold is actually in effect.
      els.pauseResumeBtn.disabled = !state.running;
      els.pauseResumeBtn.textContent = state.pauseRequested ? "▶ Tiếp tục" : "⏸ Tạm dừng";
    }
    els.workbookInput.disabled = operatorLocked;
    if (els.resumeWorkbookInput) els.resumeWorkbookInput.disabled = operatorLocked;
    if (els.continueExistingRunBtn) els.continueExistingRunBtn.disabled = operatorLocked;
    els.referencesInput.disabled = operatorLocked;
    if (els.changeWorkbookBtn) els.changeWorkbookBtn.disabled = operatorLocked;
    if (els.addReferencesBtn) els.addReferencesBtn.disabled = operatorLocked;
    for (const element of [els.outputDestinationMode, els.imageOutputFolderInput, els.destinationFolderBtn, els.separateResultDestinationInput, els.resultLocationMode, els.resultDownloadsFolderInput, els.imagePatternInput, els.resultFilenameInput, els.auditFilenameInput, els.collisionPolicyInput, els.saveImagesInput, els.saveResultXlsxInput, els.saveAuditJsonlInput, els.chooseResultFolderBtn, els.timeoutSecInput, els.maxRetriesInput, els.delayMinSecInput, els.delayMaxSecInput, els.safetyCooldownInput, els.maxInputImagesInput, els.continueOnErrorInput, els.rerunDoneInput]) if (element) element.disabled = outputLocked;
    if (state.outputSettings?.image?.kind === "directory") els.imageOutputFolderInput.disabled = true;
    if (state.outputSettings?.result?.kind !== "downloads") els.resultDownloadsFolderInput.disabled = true;
    document.querySelectorAll(".workflow-tab").forEach((tab) => {
      if (tab.dataset.screen === "outputScreen") {
        tab.disabled = state.running;
      }
    });
    updateReadinessChecklist();
    updateReviewPacketControl();
    renderBridgeProposals();
  }

  function renderQueue() {
    const queue = state.prepared?.queue || [];
    renderProgressSegments();
    els.queueList.textContent = "";
    els.queueSummary.textContent = `${queue.length} job${queue.length === 1 ? "" : "s"}`;
    const visibleQueue = state.queueExpanded ? queue : queue.slice(0, 6);
    for (const [queueIndex, item] of visibleQueue.entries()) {
      const li = document.createElement("li");
      const isCurrent = ["RUNNING", "RECONCILING"].includes(item.status);
      const isSuccess = item.status === "SUCCESS";
      const isFailed = ["FAILED", "INTERRUPTED", "STOPPED"].includes(item.status);
      const isRetryEligible = item.status === "RUNNING" && item.phase === "PRE_SUBMIT";
      const retryLabel = isRetryEligible
        ? `attempt ${item.attempt_count}/${1 + item.settings.max_retries}`
        : `attempt ${item.attempt_count}${!isRetryEligible && ["FAILED", "INTERRUPTED", "STOPPED"].includes(item.status) && retriesExhausted(item) ? " · Auto-retry: No" : ""}`;
      const outputText = item.persistence_verified && item.result_file ? ` · SAVED ✓ ${item.result_file}` : item.result_file ? ` · recorded output (not re-verified): ${item.result_file}` : item.detected_not_downloaded ? " · detected_not_downloaded" : "";

      li.className = `queue-row ${isCurrent ? "current" : item.status.toLowerCase()}`;
      const icon = isSuccess ? "✓" : isFailed ? "⛔" : isCurrent ? "●" : "○";
      const iconClass = isSuccess ? "status-success" : isFailed ? "status-danger" : isCurrent ? "status-active" : "status-pending";
      const statusLabel = isSuccess ? (item.persistence_verified ? "Saved" : "Detected") : isFailed ? (item.status === "INTERRUPTED" ? "Halted" : "Failed") : isCurrent ? "Running" : "Pending";
      const elapsed = window.DacSidepanelUiSemantics.queueElapsed(item, { currentItem: state.currentItem, currentStartedAt: state.currentStartedAt }, Date.now(), window.DacRunState.formatDuration);
      const statusWithElapsed = `${statusLabel} · ${elapsed}`;
      const timeOrDetail = item.output_saved_at
        ? new Date(item.output_saved_at).toLocaleTimeString()
        : item.completed_at
          ? new Date(item.completed_at).toLocaleTimeString()
          : isCurrent
            ? window.DacRunState.stageFor(item)
            : "—";

      const operatorLocked = state.running || state.manualReconciliationRunning || state.recreateRunning || state.auditGapRunning || state.queueMutationRunning;
      const isExpanded = state.selectedJobId === item.job.id;
      const promptDetailsId = `queue-prompt-details-${queueIndex}`;
      const togglePrompt = () => {
        state.selectedJobId = isExpanded ? null : item.job.id;
        renderQueue();
        controls();
      };
      const eligibleForSelection = isQueueSelectable(item);
      const selectCheckbox = document.createElement("input");
      selectCheckbox.type = "checkbox"; selectCheckbox.className = "queue-row-select";
      selectCheckbox.setAttribute("aria-label", `Chọn ${item.job.id} để chạy`);
      selectCheckbox.checked = state.runSelection.has(item.job.id);
      selectCheckbox.disabled = !eligibleForSelection || operatorLocked;
      selectCheckbox.addEventListener("click", (event) => event.stopPropagation());
      selectCheckbox.addEventListener("change", () => {
        if (selectCheckbox.checked) state.runSelection.add(item.job.id); else state.runSelection.delete(item.job.id);
        controls();
      });
      const dragHandle = element("span", "queue-drag-handle", "⠿");
      const editableForDrag = isQueueEditable(item) && !operatorLocked;
      dragHandle.draggable = editableForDrag;
      dragHandle.tabIndex = editableForDrag ? 0 : -1;
      dragHandle.setAttribute("aria-label", `Kéo ${item.job.id} để sắp xếp Queue`);
      dragHandle.setAttribute("aria-disabled", String(!editableForDrag));
      dragHandle.title = editableForDrag ? `Kéo ${item.job.id}, rồi thả trước hoặc sau job khác.` : "Chỉ job chưa submit mới được kéo.";
      dragHandle.addEventListener("dragstart", (event) => {
        if (!editableForDrag || queueMutationLocked()) { event.preventDefault(); return; }
        state.draggedQueueJobId = item.job.id;
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", item.job.id);
        }
        li.classList.add("queue-dragging");
      });
      dragHandle.addEventListener("dragend", () => {
        state.draggedQueueJobId = null;
        clearQueueDropIndicators();
      });
      li.addEventListener("dragover", (event) => {
        if (!state.draggedQueueJobId || state.draggedQueueJobId === item.job.id || queueMutationLocked()) return;
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
        const bounds = li.getBoundingClientRect();
        const placement = event.clientY < bounds.top + bounds.height / 2 ? "before" : "after";
        clearQueueDropIndicators();
        li.classList.add(placement === "before" ? "queue-drop-before" : "queue-drop-after");
        li.dataset.queueDropPlacement = placement;
      });
      li.addEventListener("dragleave", (event) => {
        if (!li.contains(event.relatedTarget)) {
          li.classList.remove("queue-drop-before", "queue-drop-after");
          delete li.dataset.queueDropPlacement;
        }
      });
      li.addEventListener("drop", (event) => {
        event.preventDefault();
        const sourceId = state.draggedQueueJobId || event.dataTransfer?.getData("text/plain");
        const placement = li.dataset.queueDropPlacement || "before";
        state.draggedQueueJobId = null;
        clearQueueDropIndicators();
        if (sourceId && sourceId !== item.job.id) placeQueueJob(sourceId, item.job.id, placement).catch(() => controls());
      });
      const left = element("div", "queue-row-left");
      left.append(dragHandle, selectCheckbox, element("span", `queue-icon ${iconClass}`, icon), element("span", "queue-job-id", item.job.id));
      li.append(left, element("div", `queue-row-status ${statusLabel.toLowerCase()}`, statusWithElapsed), element("div", "queue-row-right", timeOrDetail));
      const promptPreview = element("div", "queue-prompt-preview");
      const promptActions = element("span", "queue-prompt-actions");
      const duplicateBtn = document.createElement("button");
      duplicateBtn.type = "button";
      duplicateBtn.className = "secondary queue-duplicate-btn";
      duplicateBtn.textContent = "⧉ Nhân bản";
      duplicateBtn.title = `Tạo một job mới từ input của ${item.job.id}; không sao chép kết quả hay lịch sử chạy.`;
      duplicateBtn.disabled = operatorLocked;
      duplicateBtn.addEventListener("click", (event) => { event.stopPropagation(); duplicateQueueJob(item.job.id).catch(() => controls()); });
      const promptToggle = document.createElement("button");
      promptToggle.type = "button";
      promptToggle.className = "queue-prompt-toggle";
      promptToggle.textContent = isExpanded ? "Thu gọn" : "Xem đầy đủ";
      promptToggle.setAttribute("aria-expanded", String(isExpanded));
      promptToggle.setAttribute("aria-controls", promptDetailsId);
      promptToggle.addEventListener("click", (event) => { event.stopPropagation(); togglePrompt(); });
      promptActions.append(duplicateBtn, promptToggle);
      promptPreview.append(element("span", "queue-prompt-label", "Prompt:"), element("div", "queue-prompt-brief", promptBrief(item.job.prompt)), promptActions);
      li.appendChild(promptPreview);

      const details = element("div", "queue-row-details");
      details.id = promptDetailsId;
      details.hidden = !isExpanded;
      const fullPrompt = element("div", "queue-prompt-full");
      fullPrompt.append(element("strong", "", "Prompt đầy đủ:"), element("div", "queue-prompt-full-text", item.job.prompt || "—"));
        const settingsText = `Timeout: ${item.settings.timeout_sec}s · Retries: ${item.settings.max_retries} · Cooldown: ${item.settings.safety_cooldown_sec}s · ${retryLabel}${outputText}${item.protected_checkpoint ? " · Output checkpoint protected" : ""}${item.failure_type ? ` · ${item.failure_type}` : ""}`;
        details.append(
          fullPrompt,
          element("br"),
          labelledLine("References:", item.references.map((file) => file.alias || file.fileName).join(", ") || "none"),
          element("br"),
          labelledLine("Settings:", settingsText)
        );
        if (item.last_error) {
          const errorLabel = element("strong", "queue-row-error-label", "Error:");
          details.append(element("br"), errorLabel, ` ${item.last_error}`);
        }
        if (isSuccess && item.persistence_verified) {
          const rerunRow = element("div", "queue-row-rerun");
          const rerunBtn = document.createElement("button");
          rerunBtn.type = "button"; rerunBtn.className = "secondary small warning"; rerunBtn.textContent = `↻ Chạy lại ${item.job.id}`;
          rerunBtn.disabled = operatorLocked;
          rerunBtn.addEventListener("click", (event) => { event.stopPropagation(); openRerunDialog(item.job.id); });
          rerunRow.appendChild(rerunBtn);
          details.append(element("br"), rerunRow);
        }
        const editActions = element("div", "queue-edit-actions");
        const activeIndex = queue.findIndex((entry) => entry.job === item.job);
        const editable = isQueueEditable(item);
        const previousEditable = activeIndex > 0 && isQueueEditable(queue[activeIndex - 1]);
        const nextEditable = activeIndex >= 0 && activeIndex < queue.length - 1 && isQueueEditable(queue[activeIndex + 1]);
        const moveUpBtn = document.createElement("button");
        moveUpBtn.type = "button"; moveUpBtn.className = "secondary"; moveUpBtn.textContent = "↑ Lên";
        moveUpBtn.disabled = operatorLocked || !editable || !previousEditable;
        moveUpBtn.addEventListener("click", (event) => { event.stopPropagation(); moveQueueJob(item.job.id, -1).catch(() => controls()); });
        const moveDownBtn = document.createElement("button");
        moveDownBtn.type = "button"; moveDownBtn.className = "secondary"; moveDownBtn.textContent = "↓ Xuống";
        moveDownBtn.disabled = operatorLocked || !editable || !nextEditable;
        moveDownBtn.addEventListener("click", (event) => { event.stopPropagation(); moveQueueJob(item.job.id, 1).catch(() => controls()); });
        const removeBtn = document.createElement("button");
        removeBtn.type = "button"; removeBtn.className = "secondary queue-remove-btn"; removeBtn.textContent = "Bỏ khỏi Queue";
        removeBtn.disabled = operatorLocked || !editable;
        removeBtn.addEventListener("click", (event) => { event.stopPropagation(); openQueueRemoveDialog(item.job.id); });
        editActions.append(moveUpBtn, moveDownBtn);
        if (!editable) editActions.appendChild(element("span", "queue-edit-note", "Job đã qua ranh giới gửi được khoá thứ tự/xoá."));
        editActions.appendChild(removeBtn);
        details.appendChild(editActions);
      li.appendChild(details);
      els.queueList.appendChild(li);
    }
    const failures = queue.filter((item) => ["FAILED", "INTERRUPTED"].includes(item.status));
    els.failedJobsText.textContent = failures.length ? `${failures.length} failed / interrupted` : "";
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

    if (els.completionCard) {
      if (!hasCompletedRun) {
        els.completionCard.className = "card completion-card empty-state";
        if (els.completionIcon) els.completionIcon.textContent = "📊";
        if (els.completionTitle) els.completionTitle.textContent = "No completed run yet";
        if (els.completionTranslation) els.completionTranslation.textContent = "Chưa có lần chạy hoàn tất";
        if (els.outputSummaryText) els.outputSummaryText.textContent = "Complete a run to view results and artifacts.";
        if (els.failedJobsText) els.failedJobsText.textContent = "";
        if (els.failedJobsTranslation) els.failedJobsTranslation.textContent = "Hoàn tất một lần chạy để xem kết quả và các artifact.";
      } else if (state.artifactErrors && state.artifactErrors.length > 0) {
        els.completionCard.className = "card completion-card persistence-failed";
        if (els.completionIcon) els.completionIcon.textContent = "⚠";
        if (els.completionTitle) els.completionTitle.textContent = "ARTIFACT PERSISTENCE FAILED";
        if (els.completionTranslation) els.completionTranslation.textContent = "LƯU HOẶC XÁC MINH ARTIFACT THẤT BẠI";
        if (els.outputSummaryText) els.outputSummaryText.textContent = `${successCount} / ${queue.length} completed`;
        if (els.failedJobsText) els.failedJobsText.textContent = "Artifact persistence verification failed.";
        if (els.failedJobsTranslation) els.failedJobsTranslation.textContent = "Các job render đã hoàn tất, nhưng ít nhất một tệp đầu ra không lưu được hoặc không vượt qua bước xác minh sau khi lưu.";
      } else if (failedCount > 0) {
        els.completionCard.className = "card completion-card has-failures";
        if (els.completionIcon) els.completionIcon.textContent = "⚠";
        if (els.completionTitle) els.completionTitle.textContent = "RUN COMPLETE WITH ISSUES";
        if (els.completionTranslation) els.completionTranslation.textContent = "LẦN CHẠY HOÀN TẤT NHƯNG CÓ SỰ CỐ";
        if (els.outputSummaryText) els.outputSummaryText.textContent = `${successCount} / ${queue.length} completed`;
        if (els.failedJobsText) els.failedJobsText.textContent = `${failedCount} failed / interrupted`;
        if (els.failedJobsTranslation) els.failedJobsTranslation.textContent = `${failedCount} job bị lỗi hoặc gián đoạn.`;
      } else {
        els.completionCard.className = "card completion-card success";
        if (els.completionIcon) els.completionIcon.textContent = "✓";
        if (els.completionTitle) els.completionTitle.textContent = "RUN COMPLETE";
        if (els.completionTranslation) els.completionTranslation.textContent = "LẦN CHẠY ĐÃ HOÀN TẤT";
        if (els.outputSummaryText) els.outputSummaryText.textContent = `${successCount} / ${queue.length} completed`;
        if (els.failedJobsText) els.failedJobsText.textContent = "";
        if (els.failedJobsTranslation) els.failedJobsTranslation.textContent = "Tất cả job và artifact được cấu hình đã hoàn tất kiểm tra.";
      }
    }

    els.outputList.textContent = "";
    for (const item of (state.outputsExpanded ? queue : queue.slice(0, 8))) {
      const li = element("li", `output-item ${item.status.toLowerCase()}`);
      const thumb = thumbnailImage(item.thumbnailUrl || state.sessionThumbnails.get(item.job.id), item.job.id, "output-thumb-img");
      li.appendChild(thumb || element("span", "output-thumb-placeholder", "🖼"));
      const info = element("div", "output-item-info");
      info.appendChild(element("strong", "", item.job.id));
      if (item.result_file) info.append(" · ", element("span", "output-filename", window.DacOutputLocation.artifactLeaf(item.result_file)));
      li.appendChild(info);
      const isSaved = Boolean(item.persistence_verified && item.result_file);
      li.appendChild(isSaved
        ? element("span", "output-status-pill success", "✓ Saved")
        : item.detected_not_downloaded
          ? element("span", "output-status-pill warning", "Detected")
          : element("span", `output-status-pill ${item.status.toLowerCase()}`, item.status));
      els.outputList.appendChild(li);
    }
    els.viewOutputsBtn.textContent = state.outputsExpanded ? "Collapse outputs" : `View all outputs${queue.length > 8 ? ` (${queue.length})` : ""}`;
    const values = state.outputSettings ? window.DacOutputLocation.effective(state.outputSettings) : null;
    updateOpenOutputFolderControl(values?.image || null);

    if (els.artifactLocationNote) {
      els.artifactLocationNote.textContent = values ? `Location: ${window.DacOutputLocation.locationLabel(values.image)}` : "Location: Not configured";
    }

    // Row 1: Images
    // state.verifiedImageFiles only records writes made during THIS session's
    // own run. Loading/resuming an existing ledger never repopulates it, so a
    // ledger whose jobs are already persistence_verified (from an earlier
    // session) showed "0 verified" here even though the files are on disk and
    // the ledger already proves it -- read the queue's own recorded proof
    // instead, which is correct whether it came from this session's writes or
    // from a loaded ledger.
    const imagesSaved = queue.filter((item) => item.persistence_verified && item.result_file).length;
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
        resultDetail = window.DacOutputLocation.artifactLeaf(state.resultFile);
        resultStatusClass = "verified";
      } else if (state.artifactErrors.some((e) => /Result XLSX/i.test(e))) {
        resultStatus = "Failed";
        resultDetail = "Result XLSX persistence failed";
        resultStatusClass = "failed";
      } else {
        resultStatus = "Pending";
        resultDetail = values.resultFilename || "—";
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
        auditDetail = window.DacOutputLocation.artifactLeaf(state.auditFile);
        auditStatusClass = "verified";
      } else if (state.artifactErrors.some((e) => /Audit JSONL/i.test(e))) {
        auditStatus = "Failed";
        auditDetail = "Audit JSONL persistence failed";
        auditStatusClass = "failed";
      } else {
        auditStatus = "Pending";
        auditDetail = values.auditFilename || "—";
        auditStatusClass = "muted";
      }
    }
    if (els.artifactAuditDetail) els.artifactAuditDetail.textContent = auditDetail;
    if (els.artifactAuditStatus) {
      els.artifactAuditStatus.textContent = auditStatus;
      els.artifactAuditStatus.className = `artifact-badge ${auditStatusClass}`;
    }

    if (els.artifactStatusPill) {
      if (!hasCompletedRun) {
        els.artifactStatusPill.className = "artifact-status-pill empty";
        els.artifactStatusPill.textContent = "Pending Run";
      } else if (state.artifactErrors && state.artifactErrors.length > 0) {
        els.artifactStatusPill.className = "artifact-status-pill failed";
        els.artifactStatusPill.textContent = "Failed";
      } else {
        els.artifactStatusPill.className = "artifact-status-pill verified";
        els.artifactStatusPill.textContent = "Verified";
      }
    }
  }

  function updateOpenOutputFolderControl(location) {
    if (!els.openOutputFolderBtn) return;
    const action = window.DacSidepanelUiSemantics.outputFolderAction(location);
    els.openOutputFolderBtn.disabled = !action.enabled;
    els.openOutputFolderBtn.textContent = action.label;
    els.openOutputFolderBtn.title = action.note;
  }

  function openOutputFolder() {
    const values = state.outputSettings ? window.DacOutputLocation.effective(state.outputSettings) : null;
    const action = window.DacSidepanelUiSemantics.outputFolderAction(values?.image || null);
    if (!action.enabled) {
      if (els.artifactLocationNote) els.artifactLocationNote.textContent = action.note;
      return;
    }
    if (typeof chrome === "undefined" || typeof chrome.downloads?.showDefaultFolder !== "function") {
      if (els.artifactLocationNote) els.artifactLocationNote.textContent = "Chrome does not expose an action to open Downloads in this build.";
      return;
    }
    chrome.downloads.showDefaultFolder();
    if (els.artifactLocationNote) els.artifactLocationNote.textContent = action.note;
  }

  function renderReferenceGallery() {
    if (!els.referenceGallery) return;
    els.referenceGallery.textContent = "";
    for (const [index, file] of state.files.entries()) {
      const card = document.createElement("div");
      card.className = "reference-card";
      card.title = `${file.fileName}${file.alias ? ` (${file.alias})` : ""}`;
      const image = document.createElement("img");
      image.src = file.dataUrl;
      image.alt = file.fileName;
      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-ref-btn";
      removeBtn.type = "button";
      removeBtn.textContent = "×";
      removeBtn.title = "Remove reference image";
      removeBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        state.files.splice(index, 1);
        invalidateValidation("Reference inputs changed; check plan again before Run.");
        await prepare();
        renderReferenceGallery();
        updateReadinessChecklist();
      });
      card.append(image, removeBtn);
      els.referenceGallery.appendChild(card);
    }
    if (els.referenceText) {
      els.referenceText.textContent = `${state.files.length} image${state.files.length === 1 ? "" : "s"} selected`;
    }
  }

  function outputPlan() { return window.DacOutputLocation.runPlan(state.workbook?.fileName, state.outputSettings); }

  function recordedPriorAuditFilename(values) {
    return window.DacOutputLocation.artifactLeaf(state.workbook?.config?.effective_audit_log || state.workbook?.config?.audit_chain_missing_filename || state.auditFile || values.auditFilename);
  }

  function auditGapAcknowledged() {
    return window.DacAuditChainCore.gapAcknowledged(state.workbook?.config || {});
  }

  async function auditChainPreflight(values) {
    const previousFilename = recordedPriorAuditFilename(values);
    const gapAcknowledged = auditGapAcknowledged();
    if (!state.resumeMode || !values.saveAuditJsonl || values.result?.kind !== "directory") return window.DacAuditChainCore.inspect({ resumeMode: state.resumeMode, saveAuditJsonl: values.saveAuditJsonl, locationKind: values.result?.kind, previousFilename, gapAcknowledged });
    if (gapAcknowledged) {
      const segmentFilename = window.DacOutputLocation.artifactLeaf(state.workbook?.config?.audit_chain_segment_filename || values.auditFilename);
      try {
        const segmentHandle = await values.result.handle.getFileHandle(segmentFilename, { create: false });
        const segmentFile = await segmentHandle.getFile();
        if (!segmentFile || Number(segmentFile.size) <= 0) throw new Error("empty segment");
      } catch (_) { return window.DacAuditChainCore.segmentMissing(segmentFilename); }
      return { ...window.DacAuditChainCore.inspect({ resumeMode: true, saveAuditJsonl: true, locationKind: "directory", previousFilename, gapAcknowledged: true }), segmentStarted: true };
    }
    let prior = { exists: false, size: 0 };
    try {
      const handle = await values.result.handle.getFileHandle(previousFilename, { create: false });
      const file = await handle.getFile();
      prior = { exists: Boolean(file), size: Number(file?.size) || 0 };
    } catch (_) { /* Missing files are converted to a DAC diagnostic below. */ }
    return window.DacAuditChainCore.inspect({ resumeMode: true, saveAuditJsonl: true, locationKind: "directory", previousFilename, prior, gapAcknowledged: false });
  }

  function invalidateValidation(reason = "Configuration changed; validate again before Run.") {
    if (!state.workbook || state.running) return;
    state.validated = false;
    state.diagnostics = null;
    setStatus("IDLE", "NOT VALIDATED");
    progress(reason);
    renderDiagnosticGuidance();
  }

  function markLocalOverride(key, reason = "Configuration changed; validate again before Run.") {
    if (state.workbook) state.localOverrides.add(key);
    invalidateValidation(reason);
    renderConfigProvenance();
    renderNamingProvenance();
  }

  function renderConfigProvenance() {
    if (!els.configProvenance) return;
    const source = state.importedConfig ? (state.localOverrides.size ? "XLSX + local overrides" : "From XLSX") : "Configuration: defaults";
    els.configProvenance.textContent = `${source}${state.localOverrides.size ? ` (${[...state.localOverrides].join(", ")})` : ""}`;
  }

  function renderNamingProvenance() {
    if (!els.namingProvenance) return;
    const namingOverride = ["output_naming", "result_filename", "result_filename_pattern"].some((key) => state.localOverrides.has(key));
    els.namingProvenance.textContent = state.importedConfig
      ? namingOverride ? "XLSX + chỉnh tại App" : "Từ XLSX"
      : "Giá trị mặc định";
  }

  function renderCheckpointMeta() {
    if (els.runIdText) els.runIdText.textContent = state.runId || "—";
    if (els.checkpointVersionText) els.checkpointVersionText.textContent = state.checkpointVersion ? `v${window.DacCheckpointCore.formatVersion(state.checkpointVersion)}` : "—";
    if (els.checkpointFilenameText) {
      els.checkpointFilenameText.textContent = state.checkpointFilename || "—";
      els.checkpointFilenameText.title = state.checkpointFilename || "";
    }
  }

  async function resolveOutputProfile(profileId) {
    if (!profileId) { state.outputProfileState = { state: "unbound", profile: null, profile_id: "" }; return state.outputProfileState; }
    // Snapshot the hint BEFORE any await: profileId and folderHint both come
    // from the same just-applied workbook config, and reading global state
    // after the await could stamp another workbook's hint onto this profile
    // (Codex cross-audit finding).
    const folderHint = String(state.outputSettings?.folderHint || "").trim();
    try { state.outputProfileState = await window.DacOutputProfiles.resolve(profileId); }
    catch (error) { state.outputProfileState = { state: "unavailable", profile: null, error: error.message, profile_id: profileId }; }
    const resolved = state.outputProfileState;
    resolved.profile_id = profileId;
    // Remember the workbook's authored full path on the profile so post-reload
    // attention rows can offer a copyable real path, not just a folder name.
    // Best-effort by design: a hint failure must never block workbook load.
    if (folderHint && resolved.profile) window.DacOutputProfiles.setHint(profileId, folderHint).catch(() => {});
    if (resolved.state === "authorized" && resolved.profile?.directory_handle) {
      state.outputSettings.image = window.DacOutputLocation.directoryLocation(resolved.profile.directory_handle, resolved.profile.last_known_handle_name);
      state.outputSettings.image.profileId = profileId;
    }
    return resolved;
  }

  async function resolveResultProfile(profileId) {
    if (!profileId) return null;
    try {
      const resolved = await window.DacOutputProfiles.resolve(profileId);
      if (resolved.state === "authorized" && resolved.profile?.directory_handle) {
        state.outputSettings.result = window.DacOutputLocation.directoryLocation(resolved.profile.directory_handle, resolved.profile.last_known_handle_name);
        state.outputSettings.result.profileId = profileId;
      }
      return resolved;
    } catch (_) { return null; }
  }

  function applyWorkbookConfig() {
    const imported = window.DacXlsxRunPlan.validate(state.workbook.config, state.workbook.jobs, window.DacRunnerCore, window.DacOutputLocation);
    state.importedConfig = imported;
    state.configFindings = imported.findings;
    state.runtimeOverrides = {};
    state.localOverrides.clear();
    try { state.outputSettings = window.DacOutputLocation.fromWorkbook(state.workbook.config, state.workbook.fileName); }
    catch (_) { state.outputSettings = window.DacOutputLocation.fromWorkbook({}, state.workbook.fileName); }
    state.destinationMode = imported.effective.output.mode;
    state.separateResultDestination = imported.effective.output.separateResultDestination;
    renderConfigProvenance();
    return imported;
  }

  function reviewContext() {
    let settings = state.prepared?.settings || null;
    if (!settings && state.workbook) {
      try { settings = window.DacRunnerCore.runtimeConfig(state.workbook.config, state.runtimeOverrides); } catch (_) { /* Check Plan publishes the invalid-setting finding. */ }
    }
    return { workbook: state.workbook, prepared: state.prepared, diagnostics: state.diagnostics, outputSettings: state.outputSettings, output: window.DacOutputLocation, settings, importedConfig: state.importedConfig, localOverrides: [...state.localOverrides], outputProfileState: state.destinationMode === "profile" ? state.outputProfileState : null };
  }

  function updateReviewPacketControl() {
    if (!els.copyReviewPacketBtn || !els.copyReviewPacketStatus) return;
    els.copyReviewPacketBtn.disabled = !state.workbook || state.running;
    els.copyReviewPacketStatus.textContent = state.diagnostics
      ? "Packet reflects the current local Check Plan; AI review cannot override blockers."
      : state.workbook ? "Packet reflects current configuration; run Check Plan for local findings." : "Check Plan to create a review packet.";
  }

  function renderOutput() {
    if (!state.outputSettings || !state.workbook) {
      els.imageOutputText.textContent = "—"; els.resultOutputText.textContent = "—"; els.auditOutputText.textContent = "—"; els.outputPermissionText.textContent = "Open an XLSX to set locations."; updateReviewPacketControl(); controls(); return;
    }
    try {
      const values = window.DacOutputLocation.effective(state.outputSettings);
      els.imageOutputText.textContent = window.DacOutputLocation.locationLabel(values.image);
      els.resultOutputText.textContent = window.DacOutputLocation.fileLabel(values.result, values.resultFilename);
      els.auditOutputText.textContent = window.DacOutputLocation.fileLabel(values.result, values.auditFilename);
      state.destinationMode = values.image.kind === "directory" ? "profile" : "downloads";
      els.outputDestinationMode.value = state.destinationMode;
      els.imageOutputFolderInput.value = values.image.kind === "downloads" ? values.image.folder : "";
      const visibility = window.DacSidepanelUiSemantics.destinationVisibility(state.destinationMode);
      els.downloadsDestinationControls.hidden = !visibility.showDownloads;
      els.authorizedDestinationControls.hidden = !visibility.showProfile;
      els.outputProfileText.textContent = values.image.kind === "directory" ? (values.image.profileId || state.importedConfig?.effective.output.profileId || "Not configured") : "Not used";
      els.destinationHandleText.textContent = values.image.kind === "directory" ? window.DacOutputLocation.locationLabel(values.image) : "No folder selected";
      const permission = state.outputProfileState?.state;
      els.outputProfilePermission.textContent = values.image.kind !== "directory" ? "Not required" : permission === "authorized" ? "Authorized" : permission === "permission_required" ? "Permission required" : permission === "unavailable" ? "Unavailable" : "Not bound";
      if (els.folderHintText) {
        els.folderHintText.textContent = values.folderHint || "—";
        els.folderHintText.title = values.folderHint || "";
      }
      if (els.copyFolderHintBtn) els.copyFolderHintBtn.disabled = !values.folderHint || values.image.kind !== "directory";
      els.destinationFolderBtn.textContent = permission === "permission_required" ? "Re-authorize" : values.image.kind === "directory" && values.image.handle ? "Change Folder" : "Choose Folder";
      state.separateResultDestination = state.outputSettings.result?.kind !== "same_as_image";
      els.separateResultDestinationInput.checked = state.separateResultDestination;
      els.separateResultDestinationControls.hidden = !state.separateResultDestination;
      els.resultLocationMode.value = state.outputSettings.result?.kind === "directory" ? "profile" : "downloads";
      els.resultDownloadsFolderInput.value = values.result.kind === "downloads" ? values.result.folder : "";
      els.resultDownloadsFolderLabel.hidden = !state.separateResultDestination || state.outputSettings.result?.kind !== "downloads";
      els.resultAuthorizedControls.hidden = !state.separateResultDestination || state.outputSettings.result?.kind !== "directory";
      els.resultHandleText.textContent = values.result.kind === "directory" ? window.DacOutputLocation.locationLabel(values.result) : "No folder selected";
      els.resultFilenameInput.value = values.checkpointFilenamePattern;
      els.imagePatternInput.value = values.imagePattern;
      els.auditFilenameInput.value = values.auditFilename;
      els.collisionPolicyInput.value = values.collisionPolicy;
      els.saveImagesInput.checked = values.saveImages;
      els.saveResultXlsxInput.checked = values.saveResultXlsx;
      els.saveAuditJsonlInput.checked = values.saveAuditJsonl;
      els.outputPermissionText.textContent = values.image.kind === "directory" || values.result.kind === "directory"
        ? (!values.image.handle && values.folderHint ? "Copy the expected folder path, choose that folder, then Check Plan again." : "Profile folder authorization will be checked before Run.")
        : "Relative to Chrome Downloads · no folder authorization required.";
    } catch (error) {
      els.outputPermissionText.textContent = error.message;
    }
    renderConfigProvenance(); renderNamingProvenance(); renderCheckpointMeta(); updateReviewPacketControl(); controls();
  }

  async function activeTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/^https:\/\/(chatgpt\.com|chat\.openai\.com)\//i.test(tab.url || "")) throw new Error("Open a normal ChatGPT conversation in the active tab.");
    return tab;
  }

  async function send(message) {
    const tab = await activeTab();
    try { return await chrome.tabs.sendMessage(tab.id, message); }
    catch (_) { throw new Error("RECEIVER_LOST: ChatGPT receiver unavailable. Reload the ChatGPT tab once."); }
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
    invalidateValidation("Reference inputs changed; check plan again before Run.");
    els.referenceText.textContent = state.files.length ? `${state.files.length} local reference image(s) selected.` : "No local references selected.";
    renderReferenceGallery();
    await prepare();
  }

  async function openWorkbook() {
    state.workbook = null; state.prepared = null; state.outputSettings = null; state.runtimeOverrides = {}; state.validated = false; state.terminal = 0; state.importedConfig = null; state.configFindings = []; state.localOverrides.clear(); state.outputProfileState = null; state.resumeMode = false; state.resumePlan = null; state.resumeLedgerFile = ""; state.runId = null; state.checkpointVersion = 0; state.checkpointFilename = ""; state.checkpointCreatedAt = ""; state.resumeCheckpointFindings = []; state.runSelection.clear(); state.quickPromptCounter = 0; renderResumePlan(); renderOutput();
    try {
      state.workbook = await window.DacXlsx.open(els.workbookInput.files?.[0]);
      const imported = applyWorkbookConfig();
      if (imported.effective.output.mode === "profile") await resolveOutputProfile(imported.effective.output.profileId);
      if (imported.effective.output.separateResultDestination && imported.effective.output.resultMode === "profile") await resolveResultProfile(imported.effective.output.resultProfileId);
      setCurrent(null, "—", "Workbook loaded. Check Plan to see all input requirements.");
      await prepare({ diagnostic: true });
      if (!state.prepared) {
        let settings = null;
        try { settings = window.DacRunnerCore.runtimeConfig(state.workbook.config, state.runtimeOverrides); } catch (_) { /* Check Plan reports invalid settings without discarding a parsed workbook. */ }
        els.workbookText.textContent = `${state.workbook.fileName} · ${state.workbook.jobs?.length || 0} jobs · ${settings ? "references need review" : "run settings need review"}`;
        if (settings) {
          els.timeoutSecInput.value = settings.timeout_sec; els.maxRetriesInput.value = settings.max_retries; els.delayMinSecInput.value = settings.delay_min_sec; els.delayMaxSecInput.value = settings.delay_max_sec; els.safetyCooldownInput.value = settings.safety_cooldown_sec; els.maxInputImagesInput.value = settings.max_input_images; els.continueOnErrorInput.value = String(settings.continue_on_error); els.rerunDoneInput.value = String(settings.rerun_done);
        }
        setStatus("IDLE", "NEEDS INPUT");
        progress("Workbook loaded. Check Plan collects all missing inputs without starting a run.");
        renderOutput();
      }
      log(`Opened ${state.workbook.fileName}.`);
    } catch (error) {
      setStatus("ERROR"); els.workbookText.textContent = error.message; log(error.message, "error"); controls();
    }
  }

  function nextQuickPromptId() {
    const existing = new Set((state.workbook?.jobs || []).map((job) => String(job.id)));
    let candidate = (state.quickPromptCounter || 0) + 1;
    while (existing.has(`Q${String(candidate).padStart(3, "0")}`)) candidate += 1;
    state.quickPromptCounter = candidate;
    return `Q${String(candidate).padStart(3, "0")}`;
  }

  function isQueueSelectable(item) {
    return Boolean(item && item.phase === "PRE_SUBMIT" && !item.protected_checkpoint && !["SUCCESS", "DONE", "INTERRUPTED", "STOPPED"].includes(item.status));
  }

  function isQueueEditable(item) {
    return Boolean(isQueueSelectable(item) && !String(item.submitted_at || item.job?.submitted_at || "").trim());
  }

  function queueMutationLocked() {
    return state.running || state.manualReconciliationRunning || state.recreateRunning || state.auditGapRunning || state.queueMutationRunning;
  }

  function clearQueueDropIndicators() {
    document.querySelectorAll(".queue-row.queue-dragging, .queue-row.queue-drop-before, .queue-row.queue-drop-after").forEach((row) => {
      row.classList.remove("queue-dragging", "queue-drop-before", "queue-drop-after");
      delete row.dataset.queueDropPlacement;
    });
  }

  function nextDuplicateJobId(sourceId) {
    const existing = new Set((state.workbook?.jobs || []).map((job) => String(job.id || "").toLowerCase()));
    if (/^q\d+$/i.test(String(sourceId || ""))) return nextQuickPromptId();
    const base = `${String(sourceId || "job").slice(0, 87)}-copy`;
    for (let number = 1; number <= 999; number += 1) {
      const candidate = number === 1 ? base : `${base}-${String(number).padStart(2, "0")}`;
      if (!existing.has(candidate.toLowerCase())) return candidate;
    }
    throw new Error(`Không tìm được ID mới để nhân bản ${sourceId}.`);
  }

  function bridgeMutationValidation(message, details = {}) {
    throw new window.DacBridgeCore.BridgeProtocolError("VALIDATION_FAILED", message, details);
  }

  function mutationQueueItem(jobId) {
    if (!state.workbook) throw new window.DacBridgeCore.BridgeProtocolError("WORKBOOK_NOT_LOADED");
    const prepared = window.DacRunnerCore.prepare(state.workbook, state.files, state.runtimeOverrides);
    state.prepared = prepared;
    const item = prepared.queue.find((entry) => String(entry.job.id) === String(jobId));
    if (!item) bridgeMutationValidation(`JOB_NOT_FOUND: Kh\u00f4ng t\u00ecm th\u1ea5y job ${jobId}.`, { job_id: jobId });
    if (!isQueueEditable(item)) bridgeMutationValidation(`JOB_NOT_PRE_SUBMIT: Job ${jobId} \u0111\u00e3 qua ranh gi\u1edbi PRE_SUBMIT v\u00e0 kh\u00f4ng th\u1ec3 thay \u0111\u1ed5i.`, { job_id: jobId, status: item.status, phase: item.phase });
    return item;
  }

  function directJobValues(job) {
    const values = { prompt: job.prompt, reference_images: (job.reference_images || []).join("|") };
    for (const [key, value] of Object.entries(job.settings || {})) values[key] = value;
    return values;
  }

  async function applyBridgeJobsAdd(jobs) {
    const assigned = [];
    if (!state.workbook) {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
      state.quickPromptCounter = 0;
      const rows = jobs.map((job, index) => ({ id: `Q${String(index + 1).padStart(3, "0")}`, prompt: job.prompt }));
      state.quickPromptCounter = rows.length;
      state.workbook = window.DacXlsx.createWorkbook(`Bridge-${stamp}.xlsx`, rows);
      applyWorkbookConfig();
      rows.forEach((row, index) => {
        const workbookJob = state.workbook.jobs[index];
        const values = directJobValues(jobs[index]);
        window.DacXlsx.updateJob(state.workbook, workbookJob, values);
        Object.assign(workbookJob, Object.fromEntries(Object.entries(values).map(([key, value]) => [key, String(value ?? "")])));
        assigned.push(row.id);
      });
    } else {
      const rows = [];
      for (const job of jobs) rows.push({ id: nextQuickPromptId(), ...directJobValues(job), queue_removed: "false" });
      const added = window.DacXlsx.addJobsBatch(state.workbook, rows);
      assigned.push(...added.map((job) => job.id));
    }
    state.runSelection = new Set(assigned);
    state.queueExpanded = true;
    return {
      job_ids: assigned,
      changed_fields: ["prompt", "reference_images", "settings"],
      message: `Agent Bridge \u0111\u00e3 th\u00eam ${assigned.length} job (${assigned.join(", ")}) v\u00e0o Setup; ch\u01b0a ch\u1ea1y.`
    };
  }

  function applyQueueJobUpdate(jobId, params) {
    const item = mutationQueueItem(jobId);
    const values = {};
    if (Object.hasOwn(params, "prompt")) values.prompt = params.prompt;
    if (Object.hasOwn(params, "reference_images")) values.reference_images = params.reference_images.join("|");
    for (const [key, value] of Object.entries(params.settings || {})) values[key] = value;
    window.DacXlsx.updateJob(state.workbook, item.job, values);
    Object.assign(item.job, Object.fromEntries(Object.entries(values).map(([key, value]) => [key, String(value ?? "")])));
    return {
      job_id: jobId,
      changed_fields: Object.keys(values),
      message: `Agent Bridge \u0111\u00e3 c\u1eadp nh\u1eadt job ${jobId}; job v\u1eabn \u1edf PRE_SUBMIT v\u00e0 ch\u01b0a ch\u1ea1y.`
    };
  }

  function applyQueueJobRemoval(jobId) {
    const item = mutationQueueItem(jobId);
    window.DacXlsx.removeFromQueue(state.workbook, item.job);
    state.runSelection.delete(jobId);
    if (state.selectedJobId === jobId) state.selectedJobId = null;
    return {
      job_id: jobId,
      changed_fields: ["queue_removed", "queue_removed_at", "queue_position"],
      message: `Agent Bridge \u0111\u00e3 b\u1ecf ${jobId} kh\u1ecfi Queue b\u1eb1ng tombstone; d\u00f2ng ledger v\u1eabn \u0111\u01b0\u1ee3c gi\u1eef.`
    };
  }

  function applyQueueJobPosition(jobId, position) {
    const item = mutationQueueItem(jobId);
    const ordered = window.DacXlsx.activeJobs(state.workbook);
    const currentIndex = ordered.indexOf(item.job);
    if (!Number.isInteger(position) || position < 1 || position > ordered.length) {
      bridgeMutationValidation(`QUEUE_POSITION_INVALID: position ph\u1ea3i n\u1eb1m trong kho\u1ea3ng 1-${ordered.length}.`, { job_id: jobId, position });
    }
    ordered.splice(currentIndex, 1);
    ordered.splice(position - 1, 0, item.job);
    window.DacXlsx.setQueueOrder(state.workbook, ordered);
    return {
      job_id: jobId,
      position,
      changed_fields: ["queue_position"],
      message: `Agent Bridge \u0111\u00e3 chuy\u1ec3n ${jobId} t\u1edbi v\u1ecb tr\u00ed ${position} trong Queue.`
    };
  }

  async function refreshQueueAfterMutation(message) {
    invalidateValidation(message);
    if (state.resumeMode) state.resumePlan = window.DacResumeCore.plan(state.workbook);
    await prepare({ diagnostic: true });
    if (state.resumeMode && state.prepared) window.DacResumeCore.applyToQueue(state.prepared.queue, state.resumePlan.jobs);
    await validate();
    renderResumePlan(); renderQueue(); renderOutput(); controls();
  }

  async function duplicateQueueJob(sourceId) {
    if (!state.workbook || queueMutationLocked()) return;
    const source = state.workbook.jobs.find((job) => String(job.id) === String(sourceId));
    if (!source) throw new Error(`Không tìm thấy job ${sourceId}.`);
    state.queueMutationRunning = true; controls();
    try {
      const id = nextDuplicateJobId(sourceId);
      const copiedInputs = {};
      for (const key of ["prompt", "reference_images", "reference_image", "timeout_sec", "max_retries", "safety_cooldown_sec", "output_folder"]) {
        if (source[key] !== undefined && source[key] !== "") copiedInputs[key] = source[key];
      }
      if (source.input_origin === "bridge") {
        copiedInputs.input_origin = "operator_duplicate";
        copiedInputs.source_bridge_proposal_id = source.bridge_proposal_id || "";
      }
      const ordered = window.DacXlsx.activeJobs(state.workbook);
      const sourceIndex = ordered.indexOf(source);
      const duplicate = window.DacXlsx.addJob(state.workbook, { id, ...copiedInputs, duplicate_of: source.id, queue_removed: "false" });
      ordered.splice(sourceIndex >= 0 ? sourceIndex + 1 : ordered.length, 0, duplicate);
      window.DacXlsx.setQueueOrder(state.workbook, ordered);
      state.runSelection.add(id);
      state.queueExpanded = true;
      await refreshQueueAfterMutation(`Đã nhân bản ${sourceId} thành ${id}; Check Plan đã được chạy lại.`);
      log(`Đã nhân bản ${sourceId} thành ${id}; chỉ sao chép input, không sao chép kết quả/lịch sử.`, "done");
    } catch (error) {
      log(`Không thể nhân bản ${sourceId}: ${messageOf(error)}`, "error");
      throw error;
    } finally {
      state.queueMutationRunning = false; renderQueue(); controls();
    }
  }

  async function moveQueueJob(jobId, direction) {
    if (!state.workbook || queueMutationLocked()) return;
    const queue = state.prepared?.queue || [];
    const index = queue.findIndex((item) => item.job.id === jobId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= queue.length || !isQueueEditable(queue[index]) || !isQueueEditable(queue[targetIndex])) return;
    state.queueMutationRunning = true; controls();
    try {
      applyQueueJobPosition(jobId, targetIndex + 1);
      await refreshQueueAfterMutation(`Đã đổi vị trí ${jobId}; Check Plan đã được chạy lại.`);
      log(`Đã chuyển ${jobId} ${direction < 0 ? "lên" : "xuống"} một vị trí trong Queue.`, "done");
    } catch (error) {
      log(`Không thể đổi vị trí ${jobId}: ${messageOf(error)}`, "error");
      throw error;
    } finally {
      state.queueMutationRunning = false; renderQueue(); controls();
    }
  }

  async function placeQueueJob(jobId, targetId, placement) {
    if (!state.workbook || queueMutationLocked()) return;
    const queue = state.prepared?.queue || [];
    const sourceItem = queue.find((item) => item.job.id === jobId);
    const targetItem = queue.find((item) => item.job.id === targetId);
    if (!isQueueEditable(sourceItem) || !targetItem || sourceItem === targetItem) return;
    state.queueMutationRunning = true; controls();
    try {
      window.DacXlsx.placeQueueJob(state.workbook, sourceItem.job, targetItem.job, placement);
      await refreshQueueAfterMutation(`Đã kéo ${jobId} ${placement === "after" ? "sau" : "trước"} ${targetId}; Check Plan đã được chạy lại.`);
      log(`Đã kéo ${jobId} ${placement === "after" ? "sau" : "trước"} ${targetId} trong Queue.`, "done");
    } catch (error) {
      log(`Không thể kéo ${jobId}: ${messageOf(error)}`, "error");
      throw error;
    } finally {
      state.queueMutationRunning = false; state.draggedQueueJobId = null; clearQueueDropIndicators(); renderQueue(); controls();
    }
  }

  function openQueueRemoveDialog(jobId) {
    if (queueMutationLocked()) return;
    const item = state.prepared?.queue?.find((entry) => entry.job.id === jobId);
    if (!isQueueEditable(item)) return;
    state.pendingQueueRemovalId = jobId;
    if (els.queueRemoveMessage) els.queueRemoveMessage.textContent = `${jobId} will no longer run. Its row remains in Result XLSX to preserve history.`;
    if (els.queueRemoveMessageVi) els.queueRemoveMessageVi.textContent = `${jobId} sẽ không còn được chạy. Dòng dữ liệu vẫn được giữ trong Result XLSX để bảo toàn lịch sử.`;
    if (typeof els.queueRemoveDialog?.showModal === "function") els.queueRemoveDialog.showModal();
    else els.queueRemoveDialog?.setAttribute("open", "");
  }

  function closeQueueRemoveDialog() {
    state.pendingQueueRemovalId = null;
    if (typeof els.queueRemoveDialog?.close === "function") els.queueRemoveDialog.close();
    else els.queueRemoveDialog?.removeAttribute("open");
  }

  async function confirmQueueRemoval() {
    const jobId = state.pendingQueueRemovalId;
    if (!jobId || !state.workbook || queueMutationLocked()) return;
    const item = state.prepared?.queue?.find((entry) => entry.job.id === jobId);
    if (!isQueueEditable(item)) { closeQueueRemoveDialog(); return; }
    state.queueMutationRunning = true; controls();
    try {
      applyQueueJobRemoval(jobId);
      closeQueueRemoveDialog();
      await refreshQueueAfterMutation(`Đã bỏ ${jobId} khỏi Queue; dữ liệu ledger vẫn được giữ.`);
      log(`Đã bỏ ${jobId} khỏi Queue; dòng XLSX được giữ với queue_removed=true.`, "done");
    } catch (error) {
      log(`Không thể bỏ ${jobId} khỏi Queue: ${messageOf(error)}`, "error");
      throw error;
    } finally {
      state.queueMutationRunning = false; renderQueue(); controls();
    }
  }

  function selectAllQueueJobs() {
    for (const item of state.prepared?.queue || []) if (isQueueSelectable(item)) state.runSelection.add(item.job.id);
    renderQueue(); controls();
  }

  function clearQueueSelection() {
    state.runSelection.clear(); renderQueue(); controls();
  }

  // Prompts are separated by a BLANK line, same convention as the reference
  // extension Đức pointed to -- a single prompt may still span several
  // ordinary lines (a single \n never splits it), only a blank-line gap
  // starts a new one.
  function splitQuickPromptText(text) {
    return String(text || "").split(/\r?\n[ \t]*\r?\n+/).map((block) => block.trim()).filter(Boolean);
  }

  // "Nhập prompt nhanh": the real workflow this serves is GPT's own
  // Orchestrator skill generating ideas and concepts, where the operator's
  // entire manual step per image is typing "OK, render" -- forcing an Excel
  // workbook for that is the wrong shape of tool. The first prompt builds a
  // session workbook entirely in memory (DacXlsx.createWorkbook); every
  // later prompt in the same sitting appends into that SAME session
  // (DacXlsx.addJob) rather than starting a new file each time. From the
  // moment it exists, this is an ordinary workbook to every other module --
  // same Check Plan, same checkpoint protocol, same collision policy, same
  // audit trail as one opened from disk.
  //
  // This deliberately only STAGES jobs -- it never starts a run. Đức could
  // not tell from the old single "add & run" button whether pressing it
  // would just preview or immediately submit to ChatGPT; "Kiểm tra" turns
  // every pasted prompt into a concrete queue row (visible on the RUN tab,
  // pre-selected) and leaves the actual run to the existing Run controls
  // (Start Run / "Chạy job đã chọn"), same as any workbook-sourced queue.
  async function checkQuickPrompt() {
    const prompts = splitQuickPromptText(els.quickPromptInput?.value);
    if (!prompts.length) { if (els.quickPromptStatus) els.quickPromptStatus.textContent = "Nhập ít nhất 1 prompt trước khi kiểm tra."; return; }
    if (state.running || state.manualReconciliationRunning || state.recreateRunning || state.auditGapRunning) { if (els.quickPromptStatus) els.quickPromptStatus.textContent = "Đợi tiến trình hiện tại xong đã."; return; }
    if (els.quickPromptCheckBtn) els.quickPromptCheckBtn.disabled = true;
    try {
      const addedIds = [];
      for (const prompt of prompts) {
        let job;
        if (!state.workbook) {
          const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
          state.quickPromptCounter = 0;
          state.workbook = window.DacXlsx.createWorkbook(`Quick-${stamp}.xlsx`, [{ id: nextQuickPromptId(), prompt }]);
          const imported = applyWorkbookConfig();
          if (imported.effective.output.mode === "profile") await resolveOutputProfile(imported.effective.output.profileId);
          if (imported.effective.output.separateResultDestination && imported.effective.output.resultMode === "profile") await resolveResultProfile(imported.effective.output.resultProfileId);
          job = state.workbook.jobs[state.workbook.jobs.length - 1];
          log(`Bắt đầu phiên nhanh: ${state.workbook.fileName}.`, "done");
        } else {
          job = window.DacXlsx.addJob(state.workbook, { id: nextQuickPromptId(), prompt });
        }
        addedIds.push(job.id);
      }
      els.quickPromptInput.value = "";
      if (els.quickPromptSessionText) els.quickPromptSessionText.textContent = `Phiên hiện tại: ${state.workbook.jobs.length} job · ${state.workbook.fileName}`;
      await prepare({ diagnostic: true });
      await validate();
      // Replaces, not merges with, any prior selection -- what "Kiểm tra"
      // just staged is what the operator is looking at right now.
      state.runSelection = new Set(addedIds);
      state.queueExpanded = true;
      renderQueue(); renderOutput(); controls();
      showScreen("runScreen");
      if (els.quickPromptStatus) els.quickPromptStatus.textContent = `Đã thêm ${addedIds.length} job (${addedIds.join(", ")}) vào hàng đợi — chưa chạy. Đã tick sẵn ở tab RUN; bấm "Chạy job đã chọn" khi bạn sẵn sàng.`;
    } catch (error) {
      const reason = messageOf(error);
      if (els.quickPromptStatus) els.quickPromptStatus.textContent = reason;
      log(reason, "error");
    } finally {
      controls();
    }
  }

  // `extra` carries fields an inline action needs -- for example the colliding
  // filenames. Dropping them left the row without its resolve button.
  function addResumeFinding(code, message, guidance, extra = {}) {
    if (!state.resumePlan) return;
    if (!state.resumePlan.findings.some((item) => item.code === code)) state.resumePlan.findings.push({ code, severity: "BLOCKER", scope: "resume", message, guidance, ...extra });
    state.resumePlan.ready = false;
  }

  function addCheckpointFindings(check) {
    for (const finding of check.findings || []) {
      if (!state.resumeCheckpointFindings.some((item) => item.code === finding.code && item.message === finding.message)) state.resumeCheckpointFindings.push(finding);
      const { code, message, guidance, severity, scope, ...extra } = finding;
      addResumeFinding(code, message, guidance, extra);
    }
  }

  async function scanProfileCheckpoints({ loadHighest = false } = {}) {
    const values = window.DacOutputLocation.effective(state.outputSettings);
    const location = values.result;
    if (!state.resumeMode || location?.kind !== "directory" || !location.handle) return null;
    try {
      const candidates = await discoverCheckpoints(location.handle, values.checkpointFilenamePattern);
      // Two files can parse to one version when a folder mixes naming widths.
      // highest() would break that tie on filename and could hand back the
      // OLDER checkpoint. Block and name both files rather than choose.
      const collisions = window.DacCheckpointCore.versionCollisions(candidates);
      if (collisions.length) {
        const detail = collisions.map((item) => `v${window.DacCheckpointCore.formatVersion(item.version)}: ${item.filenames.join(" · ")}`).join("; ");
        // `files` lets the inline action copy the exact names instead of
        // re-parsing them back out of the message prose.
        addCheckpointFindings({ findings: [{ code: "RESUME_CHECKPOINT_VERSION_AMBIGUOUS", severity: "BLOCKER", scope: "resume", files: collisions.flatMap((item) => item.filenames), message: detail, guidance: "Keep exactly one file per checkpoint version. Rename or move the superseded file out of this folder, then Check Plan again. Do not delete a checkpoint that may still be the authoritative one." }] });
        return null;
      }
      const latest = window.DacCheckpointCore.highest(candidates);
      if (!latest) return null;
      const fileHandle = await location.handle.getFileHandle(latest.filename, { create: false });
      const file = await fileHandle.getFile();
      if (!file || Number(file.size) <= 0) throw new Error("latest checkpoint is missing or zero bytes");
      const workbook = await window.DacXlsx.open(file);
      const check = window.DacResumeCore.checkpointValidation(workbook, latest.filename, values.checkpointFilenamePattern, state.runId);
      if (!check.ready) { addCheckpointFindings(check); return { latest, workbook, check }; }
      if (loadHighest) {
        state.workbook = workbook;
        state.resumeLedgerFile = latest.filename;
        state.checkpointVersion = latest.version;
        state.checkpointFilename = latest.filename;
        state.checkpointCreatedAt = String(workbook.config.checkpoint_created_at || "");
      }
      return { latest, workbook, check };
    } catch (error) {
      const code = /RESUME_RUN_ID_MISMATCH/.test(error?.message || "") ? "RESUME_RUN_ID_MISMATCH" : "RESUME_LATEST_CHECKPOINT_INVALID";
      addCheckpointFindings({ findings: [{ code, severity: "BLOCKER", scope: "resume", message: "Latest Result checkpoint could not be validated.", guidance: `Do not fall back to an older checkpoint. Repair or restore the latest checkpoint. (${error?.message || String(error)})` }] });
      return null;
    }
  }

  async function verifyResumeDirectoryLedger() {
    const values = state.outputSettings ? window.DacOutputLocation.effective(state.outputSettings) : null;
    if (!state.resumeMode || values?.result?.kind !== "directory" || !values.result.handle || !state.resumeLedgerFile) return;
    const discovered = await scanProfileCheckpoints();
    if (discovered) return;
    try {
      const handle = await values.result.handle.getFileHandle(state.resumeLedgerFile, { create: false });
      const file = await handle.getFile();
      if (!file || Number(file.size) <= 0) throw new Error("ledger file is missing or zero bytes");
      const folderWorkbook = await window.DacXlsx.open(file);
      const check = window.DacResumeCore.checkpointValidation(folderWorkbook, state.resumeLedgerFile, values.checkpointFilenamePattern, state.runId);
      addCheckpointFindings(check);
      if (!check.ready) return;
    } catch (error) {
      addResumeFinding("RESUME_OUTPUT_MISMATCH", `Selected folder does not contain the matching Result XLSX '${state.resumeLedgerFile}'.`, `Choose the authorized run folder that contains this ledger, then Check Plan again. (${error.message || String(error)})`);
    }
  }

  function renderResumePlan() {
    if (!els.resumeSourceSummary || !els.resumePlanDiagnostics) return;
    if (!state.resumeMode || !state.resumePlan) {
      els.resumeSourceSummary.hidden = true; els.resumePlanDiagnostics.hidden = true; return;
    }
    const plan = state.resumePlan;
    els.resumeSourceSummary.hidden = false;
    els.resumeSourceSummary.textContent = `Continued run · ${plan.run.run_id}${plan.run.provenance === "legacy" ? " (legacy identity)" : ""} · ${window.DacResumeCore.summaryText(plan.summary)}${plan.next_eligible_job ? ` · Next: ${plan.next_eligible_job}` : ""}`;
    const auditGapBlocked = state.auditChain?.code === "RESUME_AUDIT_CHAIN_MISSING";
    const recoveryFindings = plan.findings.filter((item) => item.code === "RESUME_RECREATE_INCOMPLETE" || item.code === "RESUME_AMBIGUOUS_SUBMISSION");
    // validate() copies every resume finding into state.diagnostics, and the
    // Check Plan panel renders those with the same rows. Showing them here too
    // printed each blocker twice, so once Check Plan has run this panel keeps
    // only what is unique to it: the summary and the operator recovery actions.
    const visibleFindings = state.diagnostics ? [] : plan.findings.filter((item) => !recoveryFindings.includes(item));
    els.resumePlanDiagnostics.hidden = !visibleFindings.length && !recoveryFindings.length && !auditGapBlocked;
    els.resumePlanDiagnostics.className = `resume-diagnostics${visibleFindings.length || recoveryFindings.length || auditGapBlocked ? " blocked" : ""}`;
    els.resumePlanDiagnostics.replaceChildren();
    // One readable row per finding, same Vietnamese presentation as the Check
    // Plan panel. This used to be a single run-on line of raw English codes,
    // messages and guidance concatenated together.
    for (const item of visibleFindings) {
      const text = window.DacOperatorMessages.present(item);
      const row = document.createElement("div");
      row.className = `guidance-row ${String(item.severity || "blocker").toLowerCase()}`;
      row.append(element("strong", "", text.label), element("span", "", text.guidance));
      if (text.detail) row.appendChild(element("span", "guidance-technical", text.detail));
      const action = diagnosticGuidanceAction(item);
      if (action) {
        const button = element("button", "secondary setup-action guidance-action", action.label);
        button.type = "button";
        button.disabled = state.running || state.manualReconciliationRunning || state.recreateRunning || state.auditGapRunning;
        button.addEventListener("click", action.handler);
        row.appendChild(button);
      }
      els.resumePlanDiagnostics.appendChild(row);
    }
    if (state.auditChain?.code === "RESUME_AUDIT_CHAIN_MISSING") {
      const action = document.createElement("div");
      action.className = "resume-reconcile-action";
      const label = document.createElement("span");
      label.textContent = `${state.auditChain.previousFilename}: previous technical audit is unavailable. Result XLSX remains authoritative.`;
      const button = document.createElement("button");
      button.type = "button"; button.className = "secondary small warning"; button.textContent = "Continue with new audit segment"; button.disabled = state.running || state.manualReconciliationRunning || state.recreateRunning || state.auditGapRunning;
      button.addEventListener("click", openAuditGapDialog);
      action.append(label, button);
      els.resumePlanDiagnostics.appendChild(action);
    }
    for (const recovery of plan.jobs.filter((item) => item.state === "AMBIGUOUS_SUBMITTED")) {
      const action = document.createElement("div");
      action.className = "resume-reconcile-action";
      const job = state.workbook?.jobs?.find((entry) => entry.id === recovery.job_id);
      const queuedApproval = window.DacRecreateCore.isQueuedApproval(job || {});
      const recoveryAvailable = !window.DacRecreateCore.isApproved(job || {}) || window.DacRecreateCore.requiresNewApproval(job || {});
      const label = document.createElement("span");
      label.textContent = queuedApproval
        ? `${recovery.job_id}: creating a replacement image now.`
        : window.DacRecreateCore.requiresNewApproval(job || {})
          ? `${recovery.job_id}: the last recreate did not finish. Still no verified saved image. Create it again?`
          : `${recovery.job_id}: no verified saved image. Create it again?`;
      action.appendChild(label);
      if (recoveryAvailable) {
        const recreate = document.createElement("button");
        recreate.type = "button"; recreate.className = "secondary small warning"; recreate.textContent = `Recreate ${recovery.job_id}`; recreate.disabled = state.running || state.manualReconciliationRunning || state.recreateRunning;
        recreate.addEventListener("click", () => openRecreateDialog(recovery.job_id));
        action.appendChild(recreate);
      }
      els.resumePlanDiagnostics.appendChild(action);
    }
  }

  function reconciliationProof(item) {
    return window.DacReconciliationCore.proofFromRecordedAttempt({ run_id: state.runId, job: item?.job });
  }

  function openRecreateDialog(jobId) {
    if (state.running || state.manualReconciliationRunning || state.recreateRunning || !state.resumePlan) return;
    const recovery = state.resumePlan.jobs.find((entry) => entry.job_id === jobId);
    const job = state.workbook?.jobs?.find((entry) => entry.id === jobId);
    if (!recovery || recovery.state !== "AMBIGUOUS_SUBMITTED" || !job || (!window.DacRecreateCore.requiresNewApproval(job) && window.DacRecreateCore.isApproved(job))) return;
    state.pendingRecreateJobId = jobId;
    if (els.recreateConfirmTitle) els.recreateConfirmTitle.textContent = `${jobId} image is not saved`;
    if (els.recreateConfirmTitleVi) els.recreateConfirmTitleVi.textContent = `Ảnh của ${jobId} chưa được lưu và xác minh`;
    if (els.recreateConfirmMessage) els.recreateConfirmMessage.textContent = `${jobId} has no verified saved image. Create it again? This sends one new request and may produce a duplicate image.`;
    if (els.recreateConfirmMessageVi) els.recreateConfirmMessageVi.textContent = `${jobId} chưa có ảnh đã lưu được xác minh. Tạo lại sẽ gửi một yêu cầu mới và có thể tạo ảnh trùng.`;
    els.recreateConfirmBtn.textContent = `Recreate ${jobId}`;
    if (typeof els.recreateConfirmDialog.showModal === "function") els.recreateConfirmDialog.showModal();
    else els.recreateConfirmDialog.setAttribute("open", "");
    renderBridgeProposals();
  }

  function closeRecreateDialog() {
    state.pendingRecreateJobId = null;
    if (typeof els.recreateConfirmDialog.close === "function") els.recreateConfirmDialog.close();
    else els.recreateConfirmDialog.removeAttribute("open");
    renderBridgeProposals();
  }

  function cancelRecreate() {
    window.DacRecreateCore.cancelled();
    closeRecreateDialog();
  }

  // A deliberate rerun of an already-completed job reuses the same approval
  // and checkpoint mechanism as Recreate (see DacRecreateCore.approval with
  // recoveryState "SAFE_COMPLETE"), but it is a distinct operator decision:
  // the job did not fail or go ambiguous, it just was not the image Đức
  // wanted. Kept as its own dialog/confirm pair so the copy stays honest
  // about what is actually happening, and so confirming it never auto-
  // continues into unrelated jobs the way confirmRecreate deliberately does.
  function openRerunDialog(jobId) {
    if (state.running || state.manualReconciliationRunning || state.recreateRunning || state.auditGapRunning) return;
    const item = state.prepared?.queue?.find((entry) => entry.job.id === jobId);
    if (!item || item.status !== "SUCCESS" || !item.persistence_verified) return;
    state.pendingRerunJobId = jobId;
    if (els.rerunConfirmTitle) els.rerunConfirmTitle.textContent = `Run ${jobId} again?`;
    if (els.rerunConfirmTitleVi) els.rerunConfirmTitleVi.textContent = `Chạy lại ${jobId}?`;
    if (els.rerunConfirmMessage) els.rerunConfirmMessage.textContent = `${jobId} already has a verified saved image (${item.result_file || "unknown filename"}). Running it again sends a new request to ChatGPT and creates another image for this job.`;
    if (els.rerunConfirmMessageVi) els.rerunConfirmMessageVi.textContent = `${jobId} đã có ảnh được lưu và xác minh (${item.result_file || "không rõ tên file"}). Chạy lại sẽ gửi một yêu cầu mới tới ChatGPT và tạo một ảnh khác cho job này.`;
    if (els.rerunKeepPolicyRadio) els.rerunKeepPolicyRadio.checked = true;
    els.rerunConfirmBtn.textContent = `Chạy lại ${jobId}`;
    if (typeof els.rerunConfirmDialog.showModal === "function") els.rerunConfirmDialog.showModal();
    else els.rerunConfirmDialog.setAttribute("open", "");
    renderBridgeProposals();
  }

  function closeRerunDialog() {
    state.pendingRerunJobId = null;
    if (typeof els.rerunConfirmDialog.close === "function") els.rerunConfirmDialog.close();
    else els.rerunConfirmDialog.removeAttribute("open");
    renderBridgeProposals();
  }

  function cancelRerun() {
    closeRerunDialog();
  }

  function openAuditGapDialog() {
    if (state.running || state.manualReconciliationRunning || state.recreateRunning || state.auditGapRunning || state.auditChain?.code !== "RESUME_AUDIT_CHAIN_MISSING") return;
    if (typeof els.auditGapConfirmDialog.showModal === "function") els.auditGapConfirmDialog.showModal();
    else els.auditGapConfirmDialog.setAttribute("open", "");
    renderBridgeProposals();
  }

  function closeAuditGapDialog() {
    if (typeof els.auditGapConfirmDialog.close === "function") els.auditGapConfirmDialog.close();
    else els.auditGapConfirmDialog.removeAttribute("open");
    renderBridgeProposals();
  }

  async function confirmAuditGap() {
    progress("Audit-gap confirmation received; verifying the missing prior audit before creating a new segment.");
    log("Audit-gap confirmation received.", "info");
    closeAuditGapDialog();
    const previousChain = state.auditChain;
    const originalConfig = { audit_chain_status: state.workbook?.config?.audit_chain_status || "", audit_chain_missing_filename: state.workbook?.config?.audit_chain_missing_filename || "", audit_chain_acknowledged_at: state.workbook?.config?.audit_chain_acknowledged_at || "", audit_chain_segment_filename: state.workbook?.config?.audit_chain_segment_filename || "" };
    try {
      if (!state.resumeMode || !state.workbook || !state.prepared) throw new Error("AUDIT_GAP_CONFIRM_CONTEXT_MISSING: Reopen the continued run and Check Plan before creating an audit segment.");
      const outputCheck = await window.DacOutputLocation.preflight(state.outputSettings);
      if (!outputCheck.ok) throw new Error(`OUTPUT_LOCATION: ${outputCheck.error}`);
      const effectiveOutput = outputCheck.effective;
      const chain = await auditChainPreflight(effectiveOutput);
      if (chain.ok) throw new Error("AUDIT_GAP_CONFIRM_NOT_REQUIRED: The recorded prior audit is now available; run Check Plan again to retain normal append behavior.");
      if (chain.code !== "RESUME_AUDIT_CHAIN_MISSING") throw new Error(`${chain.code || "AUDIT_GAP_CONFIRM_BLOCKED"}: ${chain.message || "Audit continuity cannot be verified."}`);
      if (!state.runId) throw new Error("AUDIT_GAP_RUN_ID_MISSING: The Result XLSX run identity is required before recording an audit gap.");
      state.auditGapRunning = true;
      setStatus("RUNNING", "AUDIT GAP CHECKPOINTING");
      const approval = window.DacAuditChainCore.approveGap({ previousFilename: chain.previousFilename, auditFilename: effectiveOutput.auditFilename });
      window.DacXlsx.updateConfigSnapshot(state.workbook, approval.fields);
      state.auditChain = { ...chain, ...approval.fields, gapAcknowledged: true, segmentStarted: false };
      state.auditEvents = [];
      audit(approval.event.event, null, { message: approval.event.message });
      state.auditFile = await saveAuditLog(effectiveOutput.result);
      snapshotOutputSettings(null, state.auditFile);
      const checkpoint = await saveLedger(effectiveOutput.result);
      if (!checkpoint) throw new Error("AUDIT_GAP_CHECKPOINT_FAILED: Result checkpoint was not verified.");
      state.resultFile = checkpoint;
      state.resumeLedgerFile = state.checkpointFilename;
      state.resumePlan = window.DacResumeCore.plan(state.workbook);
      await prepare({ diagnostic: true });
      window.DacResumeCore.applyToQueue(state.prepared.queue, state.resumePlan.jobs);
      await validate();
      progress(`Audit gap acknowledged and checkpointed as ${checkpoint}. Recreate Image can now continue with the new audit segment.`);
      log(`Audit continuity gap recorded; new segment ${state.auditFile} verified.`, "done");
    } catch (error) {
      window.DacXlsx.updateConfigSnapshot(state.workbook, originalConfig);
      state.auditChain = previousChain;
      const reason = messageOf(error);
      setStatus("ERROR", "AUDIT GAP BLOCKED");
      progress(`New audit segment blocked: ${reason}`);
      log(`New audit segment blocked: ${reason}`, "error");
      throw error;
    } finally {
      state.auditGapRunning = false;
      renderResumePlan(); controls();
    }
  }

  async function persistRecreateApproval(item, approval, effectiveOutput) {
    const original = Object.fromEntries(Object.keys(approval.fields).map((key) => [key, item.job[key] || ""]));
    const outcome = await window.DacApprovalPersistence.execute({
      snapshot: async () => ({
        workbook: state.workbook, auditEvents: [...state.auditEvents], auditFile: state.auditFile,
        resultFile: state.resultFile, resumeLedgerFile: state.resumeLedgerFile,
        checkpointVersion: state.checkpointVersion, checkpointFilename: state.checkpointFilename,
        checkpointCreatedAt: state.checkpointCreatedAt
      }),
      apply: async () => {
        audit("RECREATE_APPROVED", item, { message: `Operator approved a deliberate new attempt; prior attempt ${approval.prior.attempt_id} remains preserved.` });
        update(item, approval.fields);
        item.status = "PENDING"; item.phase = "PRE_SUBMIT"; item.operator_recreate = true; item.attempt_id = ""; item.retry_count = 0;
        return item;
      },
      persist_audit: async () => {
        if (effectiveOutput.saveAuditJsonl) {
          state.auditFile = await saveAuditLog(effectiveOutput.result);
          snapshotOutputSettings(null, state.auditFile);
        }
        return state.auditFile;
      },
      persist_checkpoint: async () => {
        const checkpoint = await saveLedger(effectiveOutput.result);
        if (!checkpoint) throw new Error("RECREATE_APPROVAL_CHECKPOINT_FAILED: Result checkpoint was not verified.");
        return checkpoint;
      },
      commit: async (_applied, _auditFile, checkpoint) => {
        state.resultFile = checkpoint;
        state.resumeLedgerFile = state.checkpointFilename;
        state.resumePlan = window.DacResumeCore.plan(state.workbook);
        await prepare({ diagnostic: true });
        window.DacResumeCore.applyToQueue(state.prepared.queue, state.resumePlan.jobs);
        return checkpoint;
      },
      rollback: async ({ snapshot, audit }) => {
        const auditPersisted = Boolean(effectiveOutput.saveAuditJsonl && audit);
        const persistedAuditFile = state.auditFile;
        state.workbook = snapshot.workbook; state.auditEvents = auditPersisted ? [] : snapshot.auditEvents; state.auditFile = auditPersisted ? persistedAuditFile : snapshot.auditFile;
        state.resultFile = snapshot.resultFile; state.resumeLedgerFile = snapshot.resumeLedgerFile;
        state.checkpointVersion = snapshot.checkpointVersion; state.checkpointFilename = snapshot.checkpointFilename;
        state.checkpointCreatedAt = snapshot.checkpointCreatedAt;
        update(item, original);
        item.status = original.status || "INTERRUPTED"; item.phase = original.attempt_phase || "SUBMITTED"; item.operator_recreate = false; item.attempt_id = original.attempt_id || "";
        state.resumePlan = window.DacResumeCore.plan(state.workbook);
        await prepare({ diagnostic: true });
        window.DacResumeCore.applyToQueue(state.prepared.queue, state.resumePlan.jobs);
      }
    });
    return outcome.checkpoint;
  }

  async function confirmRecreate() {
    const jobId = state.pendingRecreateJobId;
    const actionName = jobId ? `Recreate ${jobId}` : "Recreate image";
    progress(`${actionName}: confirmation received; checking approval and persistence prerequisites.`);
    log(`${actionName}: confirmation received.`, "info");
    closeRecreateDialog();
    try {
      if (!jobId) throw new Error("RECREATE_CONFIRM_MISSING_JOB: Select Recreate Image again from the blocked job.");
      if (state.running || state.manualReconciliationRunning || state.recreateRunning) throw new Error("RECREATE_CONFIRM_BUSY: Another run or operator recovery is active.");
      if (!state.resumePlan) throw new Error("RECREATE_CONFIRM_RESUME_PLAN_MISSING: Reopen the continued run and review its Resume Plan.");
      if (!state.prepared) throw new Error("RECREATE_CONFIRM_QUEUE_MISSING: Check Plan again before confirming recreate.");
      const recovery = state.resumePlan.jobs.find((entry) => entry.job_id === jobId);
      const item = state.prepared.queue.find((entry) => entry.job.id === jobId);
      if (!recovery || recovery.state !== "AMBIGUOUS_SUBMITTED") throw new Error(`RECREATE_CONFIRM_NOT_AMBIGUOUS: ${jobId} is no longer an ambiguous submitted job.`);
      if (!item) throw new Error(`RECREATE_CONFIRM_JOB_MISSING: ${jobId} is absent from the prepared queue.`);
      const approval = window.DacRecreateCore.approval({ job: item.job, recoveryState: recovery.state });
      if (!approval.ok) throw new Error(`${approval.code}: ${approval.message}`);
      const outputCheck = await window.DacOutputLocation.preflight(state.outputSettings);
      if (!outputCheck.ok) throw new Error(`OUTPUT_LOCATION: ${outputCheck.error}`);
      const effectiveOutput = outputCheck.effective;
      const auditChain = await auditChainPreflight(effectiveOutput);
      state.auditChain = auditChain;
      if (!auditChain.ok) { renderResumePlan(); throw new Error(`${auditChain.code}: ${auditChain.message}`); }
      if (!effectiveOutput.saveImages || !effectiveOutput.saveResultXlsx) throw new Error("RECREATE_PERSISTENCE_REQUIRED: generated-image and Result XLSX saving must both be enabled.");
      state.recreateRunning = true;
      setStatus("RUNNING", "RECREATE CHECKPOINTING");
      progress(`${jobId}: saving the operator-approved recreate checkpoint.`);
      const checkpoint = await persistRecreateApproval(item, approval, effectiveOutput);
      progress(`${jobId}: recreate approval checkpoint ${checkpoint} verified; starting one deliberate new attempt.`);
      log(`${jobId}: recreate approval checkpoint verified; starting recreate run.`, "done");
      renderResumePlan(); renderQueue(); renderOutput(); controls();
      const outcome = await run("recreate");
      if (!outcome?.ok) throw new Error(`RECREATE_START_BLOCKED: ${outcome?.reason || "The recreate run did not enter RUNNING state."}`);
      const completed = state.resumePlan?.jobs?.find((entry) => entry.job_id === jobId)?.state === "SAFE_COMPLETE";
      if (!completed) throw new Error(`RECREATE_COMPLETION_UNVERIFIED: ${jobId} was not checkpointed as a verified saved image.`);
      const remaining = window.DacRunnerCore.selectQueue(state.prepared?.queue || [], "all");
      if (!remaining.length) return outcome;
      progress(`${jobId}: image saved and checkpointed. Continuing with ${remaining[0].job.id}.`);
      log(`${jobId}: verified recreate complete; continuing the remaining queue.`, "done");
      const continuation = await run("all");
      if (!continuation?.ok) {
        // The recreated image is verified and checkpointed by this point.
        // Reporting "RECREATE BLOCKED" here would invert what actually
        // happened and invite a needless second recreate confirmation, so the
        // continuation blocker is surfaced as its own distinct status.
        const blockedReason = continuation?.reason || "The remaining queue did not enter RUNNING state.";
        setStatus("IDLE", "RECREATE SAVED · QUEUE BLOCKED");
        progress(`${jobId}: recreated image is saved and checkpointed. The remaining queue did not start: ${blockedReason}`);
        log(`${jobId}: recreate verified and checkpointed; remaining queue blocked: ${blockedReason}`, "error");
        return outcome;
      }
      return continuation;
    } catch (error) {
      const reason = messageOf(error);
      setStatus("ERROR", "RECREATE BLOCKED");
      progress(`${actionName} blocked: ${reason}`);
      log(`${actionName} blocked: ${reason}`, "error");
      throw error;
    } finally {
      state.recreateRunning = false;
      renderResumePlan(); controls();
    }
  }

  // Unlike confirmRecreate (which exists to unblock a stuck continuation and
  // so deliberately continues into the remaining queue once verified), this
  // does exactly one thing: replace one job's already-saved image. It never
  // auto-continues into other jobs the operator did not ask to touch.
  async function confirmRerun() {
    const jobId = state.pendingRerunJobId;
    const actionName = jobId ? `Chạy lại ${jobId}` : "Chạy lại job";
    const overwrite = Boolean(els.rerunOverwritePolicyRadio?.checked);
    progress(`${actionName}: đã nhận xác nhận, đang kiểm tra điều kiện trước khi tạo ảnh mới.`);
    log(`${actionName}: đã nhận xác nhận.`, "info");
    closeRerunDialog();
    try {
      if (!jobId) throw new Error("RERUN_CONFIRM_MISSING_JOB: Chọn Chạy lại từ job đã hoàn tất.");
      if (state.running || state.manualReconciliationRunning || state.recreateRunning || state.auditGapRunning) throw new Error("RERUN_CONFIRM_BUSY: Một tiến trình khác đang chạy.");
      if (!state.prepared) throw new Error("RERUN_CONFIRM_QUEUE_MISSING: Check Plan lại trước khi xác nhận chạy lại.");
      const item = state.prepared.queue.find((entry) => entry.job.id === jobId);
      if (!item) throw new Error(`RERUN_CONFIRM_JOB_MISSING: ${jobId} không có trong hàng đợi hiện tại.`);
      if (item.status !== "SUCCESS" || !item.persistence_verified) throw new Error(`RERUN_CONFIRM_NOT_COMPLETE: ${jobId} chưa có ảnh đã xác minh lưu thành công.`);
      const approval = window.DacRecreateCore.approval({ job: item.job, recoveryState: "SAFE_COMPLETE" });
      if (!approval.ok) throw new Error(`${approval.code}: ${approval.message}`);
      const outputCheck = await window.DacOutputLocation.preflight(state.outputSettings);
      if (!outputCheck.ok) throw new Error(`OUTPUT_LOCATION: ${outputCheck.error}`);
      const effectiveOutput = outputCheck.effective;
      if (state.resumeMode) {
        const auditChain = await auditChainPreflight(effectiveOutput);
        state.auditChain = auditChain;
        if (!auditChain.ok) { renderResumePlan(); throw new Error(`${auditChain.code}: ${auditChain.message}`); }
      }
      if (!effectiveOutput.saveImages || !effectiveOutput.saveResultXlsx) throw new Error("RERUN_PERSISTENCE_REQUIRED: phải bật lưu ảnh và lưu Result XLSX.");
      state.recreateRunning = true;
      setStatus("RUNNING", "RERUN CHECKPOINTING");
      progress(`${jobId}: đang lưu checkpoint xác nhận chạy lại.`);
      // The global collision policy stays whatever the operator configured
      // for the whole run; this one field overrides it for this one job's
      // write only, so "giữ ảnh cũ" here can never be defeated by an
      // unrelated global "overwrite" setting, and vice versa.
      const approvalWithPolicy = { ...approval, fields: { ...approval.fields, rerun_collision_policy: overwrite ? "overwrite" : "uniquify" } };
      const checkpoint = await persistRecreateApproval(item, approvalWithPolicy, effectiveOutput);
      progress(`${jobId}: checkpoint đã xác minh ${checkpoint}; bắt đầu tạo ảnh mới.`);
      log(`${jobId}: checkpoint xác nhận chạy lại đã xác minh; bắt đầu chạy lại.`, "done");
      renderResumePlan(); renderQueue(); renderOutput(); controls();
      const outcome = await run("recreate");
      if (!outcome?.ok) throw new Error(`RERUN_START_BLOCKED: ${outcome?.reason || "Không vào được trạng thái RUNNING."}`);
      progress(`${jobId}: đã tạo ảnh mới và lưu xong.`);
      log(`${jobId}: chạy lại hoàn tất.`, "done");
      return outcome;
    } catch (error) {
      const reason = messageOf(error);
      setStatus("ERROR", "RERUN BLOCKED");
      progress(`${actionName} bị chặn: ${reason}`);
      log(`${actionName} bị chặn: ${reason}`, "error");
      throw error;
    } finally {
      state.recreateRunning = false;
      renderResumePlan(); renderQueue(); renderOutput(); controls();
    }
  }

  function restoreReconciliationItem(item, values) {
    update(item, values);
    item.status = values.status;
    item.phase = values.attempt_phase;
    item.result_file = values.result_file || "";
    item.result_download_id = values.result_download_id || "";
    item.persistence_verified = String(values.persistence_verified).toLowerCase() === "true" || values.persistence_verified === true;
    item.requested_file = values.requested_file || "";
    item.write_outcome = values.write_outcome || "";
  }

  async function resolveExistingOutput(jobId) {
    if (!state.resumeMode || state.running || state.manualReconciliationRunning || !state.resumePlan || !state.prepared) return;
    const recovery = state.resumePlan.jobs.find((entry) => entry.job_id === jobId);
    const item = state.prepared.queue.find((entry) => entry.job.id === jobId);
    if (!recovery || recovery.state !== "AMBIGUOUS_SUBMITTED" || !item) throw new Error("RESUME_AMBIGUOUS_SUBMISSION: this job is not eligible for manual reconciliation.");
    const proofResult = reconciliationProof(item);
    if (!proofResult.ok) throw new Error(`${proofResult.code}: ${proofResult.message}`);
    const outputCheck = await window.DacOutputLocation.preflight(state.outputSettings);
    if (!outputCheck.ok) throw new Error(`OUTPUT_LOCATION: ${outputCheck.error}`);
    const effectiveOutput = outputCheck.effective;
    if (!effectiveOutput.saveImages || !effectiveOutput.saveResultXlsx) throw new Error("RECONCILIATION_PERSISTENCE_REQUIRED: generated-image and Result XLSX saving must both be enabled to mark an ambiguous submission safe complete.");

    state.manualReconciliationRunning = true;
    renderResumePlan(); controls();

    const original = {
      status: item.job.status || "",
      attempt_phase: item.job.attempt_phase || "",
      requested_file: item.job.requested_file || "",
      result_file: item.job.result_file || "",
      result_download_id: item.job.result_download_id || "",
      persistence_verified: item.job.persistence_verified || "",
      detected_not_downloaded: item.job.detected_not_downloaded || "",
      write_outcome: item.job.write_outcome || "",
      output_saved_at: item.job.output_saved_at || "",
      completed_at: item.job.completed_at || "",
      failure_type: item.job.failure_type || "",
      last_error: item.job.last_error || "",
      error: item.job.error || ""
    };
    audit("RECONCILIATION_STARTED", item, { message: "Operator requested read-only verification of existing output." });
    setCurrent(item, "RECONCILING", "Inspecting the existing ChatGPT image; no prompt will be sent.", item.settings.timeout_sec);
    renderQueue();
    let response;
    try {
      response = await send({ type: "DAC_MANUAL_RECONCILE_EXISTING_OUTPUT", run_id: state.runId, job_id: item.job.id, attempt_id: proofResult.proof.attempt_id, submitted_at: proofResult.proof.submitted_at, proof: proofResult.proof });
      if (!response?.ok || !matchesAttempt(response, { ...item, attempt_id: proofResult.proof.attempt_id })) throw new Error(response?.error || "ATTRIBUTION_NOT_PROVEN: existing output did not match the recorded attempt.");
      audit("RECONCILIATION_ATTRIBUTED", item, { message: "Existing image matches the recorded attempt boundary and selected candidate." });
      const accepted = await saveGeneratedImage(response.result.image_url, item, imageLocationFor(item, effectiveOutput));
      if (!accepted?.ok) throw new Error(accepted?.message || accepted?.error || "Existing image was not accepted for persistence.");
      const requested = window.DacOutputLocation.renderImageFilename(effectiveOutput.imagePattern, { job_id: item.job.id, attempt: item.attempt_count, index: item.number }, imageExtensionFromUrl(response.result.image_url));
      audit("RECONCILIATION_PERSISTED", item, { message: `Verified existing image persisted as ${accepted.filename}.` });
      if (effectiveOutput.saveAuditJsonl) {
        state.auditFile = await saveAuditLog(effectiveOutput.result);
        snapshotOutputSettings(null, state.auditFile);
      }
      const completedAt = new Date().toISOString();
      update(item, { status: "SUCCESS", attempt_phase: "SUCCESS", requested_file: requested, result_file: accepted.filename, result_download_id: accepted.download_id ?? "", persistence_verified: true, detected_not_downloaded: false, write_outcome: accepted.write_outcome || "written", output_saved_at: completedAt, completed_at: completedAt, failure_type: "", last_error: "", error: "" });
      item.phase = "SUCCESS"; item.runtime_stage = "SUCCESS"; item.result_file = accepted.filename; item.persistence_verified = true; item.write_outcome = accepted.write_outcome || "written";
      const checkpoint = await saveLedger(effectiveOutput.result);
      if (!window.DacReconciliationCore.safeComplete({ attribution: { ok: true }, imagePersisted: true, checkpointPersisted: Boolean(checkpoint) })) throw new Error("RECONCILIATION_CHECKPOINT_FAILED: Result checkpoint was not verified.");
      state.resultFile = checkpoint;
      state.verifiedImageFiles.push(accepted.filename);
      state.sessionThumbnails.set(item.job.id, response.result.image_url);
      state.resumeLedgerFile = state.checkpointFilename;
      state.resumePlan = window.DacResumeCore.plan(state.workbook);
      await prepare({ diagnostic: true });
      window.DacResumeCore.applyToQueue(state.prepared.queue, state.resumePlan.jobs);
      audit("JOB_SUCCESS", item, { message: "Manual reconciliation completed after verified image and Result checkpoint persistence." });
      setCurrent(item, "SUCCESS", "Verified existing output persisted and checkpointed; this job will not be resubmitted.", item.settings.timeout_sec);
      progress(`${item.job.id}: VERIFIED EXISTING OUTPUT · checkpoint ${state.checkpointFilename}.`);
      renderResumePlan(); renderQueue(); renderOutput();
      await validate();
    } catch (error) {
      restoreReconciliationItem(item, original);
      audit("RECONCILIATION_FAILED", item, { message: messageOf(error) });
      state.resumePlan = window.DacResumeCore.plan(state.workbook);
      await prepare({ diagnostic: true });
      window.DacResumeCore.applyToQueue(state.prepared.queue, state.resumePlan.jobs);
      setCurrent(item, "INTERRUPTED", "ATTRIBUTION NOT PROVEN or persistence failed; job remains blocked.", item.settings.timeout_sec);
      progress(`${item.job.id}: ATTRIBUTION NOT PROVEN — remains blocked.`);
      renderResumePlan(); renderQueue(); renderOutput(); controls();
      throw error;
    } finally {
      state.manualReconciliationRunning = false;
      renderResumePlan(); controls();
    }
  }

  async function openExistingRun() {
    const file = els.resumeWorkbookInput?.files?.[0];
    if (!file) return;
    state.workbook = null; state.prepared = null; state.outputSettings = null; state.runtimeOverrides = {}; state.validated = false; state.terminal = 0; state.importedConfig = null; state.configFindings = []; state.localOverrides.clear(); state.outputProfileState = null; state.resumeMode = true; state.resumePlan = null; state.resumeLedgerFile = file.name; state.auditEvents = []; state.artifactErrors = []; state.verifiedImageFiles = []; state.checkpointVersion = 0; state.checkpointFilename = ""; state.checkpointCreatedAt = ""; state.resumeCheckpointFindings = []; state.runSelection.clear(); state.quickPromptCounter = 0;
    try {
      state.workbook = await window.DacXlsx.open(file);
      const imported = applyWorkbookConfig();
      state.resumePlan = window.DacResumeCore.plan(state.workbook);
      state.runId = state.resumePlan.run.run_id;
      const recordedResult = window.DacOutputLocation.artifactLeaf(state.workbook.config.effective_result_xlsx || "");
      const recordedAudit = window.DacOutputLocation.artifactLeaf(state.workbook.config.effective_audit_log || "");
      if (recordedResult && !state.workbook.config.result_filename_pattern) state.outputSettings.resultFilename = state.outputSettings.resultFilenamePattern = window.DacOutputLocation.baseResultFilenamePattern(state.workbook.fileName);
      if (recordedAudit) state.outputSettings.auditFilename = window.DacOutputLocation.safeFileLeaf(recordedAudit, state.outputSettings.auditFilename);
      if (imported.effective.output.mode === "profile") await resolveOutputProfile(imported.effective.output.profileId);
      if (imported.effective.output.separateResultDestination && imported.effective.output.resultMode === "profile") await resolveResultProfile(imported.effective.output.resultProfileId);
      await scanProfileCheckpoints({ loadHighest: true });
      state.resumePlan = window.DacResumeCore.plan(state.workbook);
      addCheckpointFindings({ findings: state.resumeCheckpointFindings });
      state.runId = state.resumePlan.run.run_id;
      if (!state.checkpointVersion) {
        state.checkpointVersion = Number(state.workbook.config.checkpoint_version) || 0;
        state.checkpointFilename = window.DacOutputLocation.artifactLeaf(state.workbook.config.checkpoint_filename || state.resumeLedgerFile);
        state.checkpointCreatedAt = String(state.workbook.config.checkpoint_created_at || "");
      }
      const resumeOutput = window.DacOutputLocation.effective(state.outputSettings);
      if (resumeOutput.saveAuditJsonl && resumeOutput.result.kind === "downloads") addResumeFinding("RESUME_AUDIT_APPEND_UNAVAILABLE", "Chrome Downloads cannot read and append the prior audit log.", "Choose the authorized run folder configured for this run, then Check Plan again.");
      await prepare({ diagnostic: true });
      if (state.prepared) window.DacResumeCore.applyToQueue(state.prepared.queue, state.resumePlan.jobs);
      state.resultFile = file.name;
      state.auditFile = String(state.workbook.config.effective_audit_log || "");
      await verifyResumeDirectoryLedger();
      setCurrent(null, "—", "Existing Result XLSX loaded. Check Plan before continuing.");
      progress(window.DacResumeCore.summaryText(state.resumePlan.summary));
      renderResumePlan(); renderQueue(); renderOutput(); controls();
      log(`Opened existing run ledger ${file.name}; run ${state.runId}.`, "done");
    } catch (error) {
      state.resumePlan = { findings: [{ code: "RESUME_LEDGER_INVALID", severity: "BLOCKER", message: error.message, guidance: "Select a supported Result XLSX." }], ready: false, run: { run_id: "—", provenance: "invalid" }, summary: { completed: 0, safe_pending: 0, failed: 0, ambiguous_submitted: 0 }, next_eligible_job: null };
      setStatus("ERROR", "RESUME BLOCKED"); renderResumePlan(); log(error.message, "error"); controls();
    }
  }

  async function prepare({ diagnostic = false } = {}) {
    if (!state.workbook) return;
    try {
      state.prepared = window.DacRunnerCore.prepare(state.workbook, state.files, state.runtimeOverrides);
      state.terminal = state.prepared.queue.filter((item) => item.status === "SUCCESS" || item.status === "DONE").length;
      const settings = state.prepared.settings;
      els.workbookText.textContent = `${state.workbook.fileName} · ${state.prepared.queue.length} jobs · ${settings.delay_min_sec}-${settings.delay_max_sec}s delay`;
      els.timeoutSecInput.value = settings.timeout_sec; els.maxRetriesInput.value = settings.max_retries; els.delayMinSecInput.value = settings.delay_min_sec; els.delayMaxSecInput.value = settings.delay_max_sec; els.safetyCooldownInput.value = settings.safety_cooldown_sec; els.maxInputImagesInput.value = settings.max_input_images; els.continueOnErrorInput.value = String(settings.continue_on_error); els.rerunDoneInput.value = String(settings.rerun_done);
      invalidateValidation(); renderQueue(); renderOutput();
    } catch (error) {
      state.prepared = null;
      if (!diagnostic) { progress(error.message); log(error.message, "error"); }
      controls();
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

  function setOutputDestinationMode() {
    try {
      const mode = els.outputDestinationMode.value;
      state.destinationMode = mode;
      if (mode === "downloads") { state.outputSettings.image = window.DacOutputLocation.downloadsLocation(els.imageOutputFolderInput.value || "Duc Auto ChatGPT"); state.outputProfileState = null; }
      else { const profileId = state.importedConfig?.effective.output.profileId || DEFAULT_IMAGE_PROFILE_ID; state.outputSettings.image = { kind: "directory", handle: null, profileId, label: "Output profile not bound" }; state.outputProfileState = { state: "unbound", profile: null }; }
      if (!state.separateResultDestination) state.outputSettings.result = { kind: "same_as_image" };
      markLocalOverride("output_destination_mode");
      renderOutput();
    } catch (error) { els.outputPermissionText.textContent = error.message; log(error.message, "error"); }
  }

  async function choosePrimaryDestination() {
    if (typeof window.showDirectoryPicker !== "function") throw new Error("This Chrome build cannot authorize a folder. Use Chrome Downloads or update Chrome.");
    // The picker must run first: it needs the click's user gesture, and every
    // await below it (IndexedDB lookups) would risk expiring that activation.
    const handle = await window.showDirectoryPicker({ mode: "readwrite" });
    let profileId = state.outputSettings?.image?.profileId || state.importedConfig?.effective?.output?.profileId || "";
    if (!profileId) {
      // No session context (fresh reload, no workbook): rebinding onto the sole
      // stored profile keeps the id the next workbook's config will ask for.
      try {
        const stored = await window.DacOutputProfiles.list();
        if (stored?.length === 1) profileId = stored[0].profile_id;
      } catch (_) {}
    }
    if (!profileId) profileId = DEFAULT_IMAGE_PROFILE_ID;
    const profile = await window.DacOutputProfiles.bind(profileId, handle, profileId);
    // Deliberately NO setHint here: the picker cannot prove the user chose the
    // hinted folder, and stamping the workbook's path onto a different picked
    // folder would persist a FALSE path (Codex cross-audit finding). Hints are
    // written only on workbook resolution, where path and profile share one
    // config source.
    // Re-authorizing from the BRIDGE tab can happen before any workbook is
    // open — outputSettings may not exist yet. Build a default (Downloads)
    // settings object first; the workbook load rebuilds it from config later.
    if (!state.outputSettings) state.outputSettings = window.DacOutputLocation.fromWorkbook({}, "phien-chua-mo-workbook.xlsx");
    state.outputSettings.image = window.DacOutputLocation.directoryLocation(handle, profile.last_known_handle_name);
    state.outputSettings.image.profileId = profileId;
    state.outputProfileState = { state: "authorized", profile, permission: "granted" };
    state.destinationMode = "profile";
    if (!state.separateResultDestination) state.outputSettings.result = { kind: "same_as_image" };
    markLocalOverride("output_profile_binding", "Output profile binding changed; check plan again before Run.");
    renderOutput();
  }

  function choosePrimaryDestinationFromUserGesture() {
    choosePrimaryDestination().then(() => probeBridgePersistence()).catch((error) => {
      if (error.name !== "AbortError") {
        els.outputPermissionText.textContent = error.message;
        log(error.message, "error");
      }
    });
  }

  function chooseResultDestinationFromUserGesture() {
    chooseResultDestination().then(() => probeBridgePersistence()).catch((error) => {
      if (error.name !== "AbortError") {
        els.outputPermissionText.textContent = error.message;
        log(error.message, "error");
      }
    });
  }

  // Chrome's directory picker cannot be pre-filled or pre-navigated, and the
  // expected-folder hint lived in a card the operator had to scroll to find.
  // Surface the path and its Copy control at the moment the folder is actually
  // being chosen instead.
  function folderPickRunner(target) {
    return target === "result" ? chooseResultDestinationFromUserGesture : choosePrimaryDestinationFromUserGesture;
  }

  function openFolderPickDialog(target) {
    const hint = String(state.outputSettings?.folderHint || "").trim();
    // With no recorded hint the dialog would add a click and offer nothing, so
    // go straight to the picker.
    if (!hint || !els.folderPickDialog) { folderPickRunner(target)(); return; }
    state.pendingFolderPick = target;
    if (els.folderPickTitle) els.folderPickTitle.textContent = target === "result" ? "Choose the Result XLSX folder" : "Choose the generated-image folder";
    if (els.folderPickTitleVi) els.folderPickTitleVi.textContent = target === "result" ? "Chọn thư mục lưu Result XLSX" : "Chọn thư mục lưu ảnh được tạo";
    if (els.folderPickPath) { els.folderPickPath.textContent = hint; els.folderPickPath.title = hint; }
    if (els.folderPickStatus) els.folderPickStatus.textContent = "";
    if (els.folderPickStatusVi) els.folderPickStatusVi.textContent = "";
    if (typeof els.folderPickDialog.showModal === "function") els.folderPickDialog.showModal();
    else els.folderPickDialog.setAttribute("open", "");
  }

  function closeFolderPickDialog() {
    state.pendingFolderPick = null;
    if (!els.folderPickDialog) return;
    if (typeof els.folderPickDialog.close === "function") els.folderPickDialog.close();
    else els.folderPickDialog.removeAttribute("open");
  }

  async function copyFolderPickPath() {
    const hint = String(state.outputSettings?.folderHint || "").trim();
    if (!hint || !els.folderPickStatus) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(hint);
      els.folderPickStatus.textContent = "Path copied. Paste it into the picker's address bar.";
      if (els.folderPickStatusVi) els.folderPickStatusVi.textContent = "Đã sao chép đường dẫn. Hãy dán vào thanh địa chỉ của hộp chọn thư mục.";
    } catch (_) {
      els.folderPickStatus.textContent = "Could not copy automatically. Click the path to select it, then press Ctrl+C.";
      if (els.folderPickStatusVi) els.folderPickStatusVi.textContent = "Không thể tự sao chép. Hãy bấm vào đường dẫn để chọn rồi nhấn Ctrl+C.";
    }
  }

  function confirmFolderPick() {
    const target = state.pendingFolderPick;
    closeFolderPickDialog();
    // showDirectoryPicker() needs the user gesture from this click. Closing the
    // dialog above is synchronous and nothing is awaited before the picker
    // call, so the gesture is still live here.
    folderPickRunner(target)();
  }

  async function chooseResultDestination() {
    const profileId = state.outputSettings.result?.profileId || state.importedConfig?.effective.output.resultProfileId || DEFAULT_RESULT_PROFILE_ID;
    if (typeof window.showDirectoryPicker !== "function") throw new Error("This Chrome build cannot authorize a folder. Use Chrome Downloads or update Chrome.");
    const handle = await window.showDirectoryPicker({ mode: "readwrite" });
    const profile = await window.DacOutputProfiles.bind(profileId, handle, profileId);
    state.outputSettings.result = window.DacOutputLocation.directoryLocation(handle, profile.last_known_handle_name);
    state.outputSettings.result.profileId = profileId;
    markLocalOverride("result_output_profile_binding", "Result output profile binding changed; check plan again before Run.");
    renderOutput();
  }

  function setImageDownloadsFolder() {
    try {
      state.outputSettings.image = window.DacOutputLocation.downloadsLocation(els.imageOutputFolderInput.value);
      markLocalOverride("output_downloads_subfolder");
      els.outputPermissionText.textContent = "Using the explicit Chrome Downloads location.";
      renderOutput();
    } catch (error) { els.outputPermissionText.textContent = error.message; log(error.message, "error"); }
  }

  function setResultLocation() {
    try {
      const mode = els.resultLocationMode.value;
      if (mode === "downloads") state.outputSettings.result = window.DacOutputLocation.downloadsLocation(els.resultDownloadsFolderInput.value || state.outputSettings.image?.folder || "Duc Auto ChatGPT");
      else state.outputSettings.result = { kind: "directory", handle: null, profileId: state.importedConfig?.effective.output.resultProfileId || DEFAULT_RESULT_PROFILE_ID, label: "Result output profile not bound" };
      markLocalOverride("result_destination_mode");
      renderOutput();
    } catch (error) { els.outputPermissionText.textContent = error.message; log(error.message, "error"); }
  }

  function setSeparateResultDestination() {
    state.separateResultDestination = els.separateResultDestinationInput.checked;
    if (!state.separateResultDestination) state.outputSettings.result = { kind: "same_as_image" };
    else state.outputSettings.result = window.DacOutputLocation.downloadsLocation(state.outputSettings.image?.folder || "Duc Auto ChatGPT");
    markLocalOverride("separate_result_destination");
    renderOutput();
  }

  function setResultDownloadsFolder() {
    if (state.outputSettings.result?.kind !== "downloads") return;
    try { state.outputSettings.result = window.DacOutputLocation.downloadsLocation(els.resultDownloadsFolderInput.value); markLocalOverride("result_downloads_subfolder"); renderOutput(); }
    catch (error) { els.outputPermissionText.textContent = error.message; log(error.message, "error"); }
  }

  function setResultFilename() {
    try { state.outputSettings.resultFilenamePattern = window.DacOutputLocation.validateResultFilenamePattern(els.resultFilenameInput.value, window.DacOutputLocation.baseResultFilenamePattern(state.workbook.fileName)); state.outputSettings.resultFilename = state.outputSettings.resultFilenamePattern; markLocalOverride("result_filename_pattern"); renderOutput(); }
    catch (error) { els.outputPermissionText.textContent = error.message; log(error.message, "error"); }
  }

  function applyArtifactNamingValues(values = null) {
    const current = window.DacOutputLocation.effective(state.outputSettings);
    const source = values || {
      image_pattern: els.imagePatternInput.value,
      result_filename_pattern: els.resultFilenameInput.value,
      audit_filename: els.auditFilenameInput.value,
      collision_policy: els.collisionPolicyInput.value,
      save_images: els.saveImagesInput.checked,
      save_result_xlsx: els.saveResultXlsxInput.checked,
      save_audit_jsonl: els.saveAuditJsonlInput.checked
    };
    const imagePattern = Object.hasOwn(source, "image_pattern") ? source.image_pattern : current.imagePattern;
    const resultPattern = Object.hasOwn(source, "result_filename_pattern") ? source.result_filename_pattern : current.checkpointFilenamePattern;
    const auditFilename = Object.hasOwn(source, "audit_filename") ? source.audit_filename : current.auditFilename;
    const collisionPolicy = Object.hasOwn(source, "collision_policy") ? source.collision_policy : current.collisionPolicy;
    state.outputSettings.imagePattern = window.DacOutputLocation.validateImagePattern(imagePattern);
    state.outputSettings.resultFilenamePattern = window.DacOutputLocation.validateResultFilenamePattern(resultPattern, window.DacOutputLocation.baseResultFilenamePattern(state.workbook.fileName));
      state.outputSettings.resultFilename = state.outputSettings.resultFilenamePattern;
    state.outputSettings.auditFilename = window.DacOutputLocation.safeFileLeaf(auditFilename, window.DacOutputLocation.baseAuditName(state.workbook.fileName));
    state.outputSettings.collisionPolicy = window.DacOutputLocation.collisionPolicy(collisionPolicy);
    state.outputSettings.saveImages = Object.hasOwn(source, "save_images") ? source.save_images : current.saveImages;
    state.outputSettings.saveResultXlsx = Object.hasOwn(source, "save_result_xlsx") ? source.save_result_xlsx : current.saveResultXlsx;
    state.outputSettings.saveAuditJsonl = Object.hasOwn(source, "save_audit_jsonl") ? source.save_audit_jsonl : current.saveAuditJsonl;
    markLocalOverride("output_naming"); renderOutput(); renderOutputScreen();
    const changedFields = Object.keys(source);
    return { changed_fields: changedFields, message: `Agent Bridge \u0111\u00e3 c\u1ea5u h\u00ecnh Output (${changedFields.join(", ")}); ch\u01b0a ch\u1ea1y.` };
  }

  function setArtifactNaming() {
    try { return applyArtifactNamingValues(); }
    catch (error) { els.outputPermissionText.textContent = error.message; log(error.message, "error"); return null; }
  }

  async function applyRuntimeOverrideValues(values) {
    if (!state.workbook) return;
    const next = { ...state.runtimeOverrides, ...values };
    window.DacRunnerCore.runtimeConfig(state.workbook.config, next);
    state.runtimeOverrides = next;
    markLocalOverride("run_settings");
    await prepare();
    const changedFields = Object.keys(values);
    return { changed_fields: changedFields, message: `Agent Bridge \u0111\u00e3 c\u1ea5u h\u00ecnh Run Settings (${changedFields.join(", ")}); ch\u01b0a ch\u1ea1y.` };
  }

  async function updateRuntimeOverrides() {
    if (!state.workbook) return;
    return applyRuntimeOverrideValues({
      timeout_sec: els.timeoutSecInput.value,
      max_retries: els.maxRetriesInput.value,
      delay_min_sec: els.delayMinSecInput.value,
      delay_max_sec: els.delayMaxSecInput.value,
      safety_cooldown_sec: els.safetyCooldownInput.value,
      max_input_images: els.maxInputImagesInput.value,
      continue_on_error: els.continueOnErrorInput.value,
      rerun_done: els.rerunDoneInput.value
    });
  }

  function approvedRecreateIsOnlyResumeBlocker() {
    const plan = state.resumePlan;
    const blockers = plan?.findings?.filter((finding) => finding.severity === "BLOCKER") || [];
    const ambiguous = plan?.jobs?.filter((entry) => entry.state === "AMBIGUOUS_SUBMITTED") || [];
    return Boolean(blockers.length && ambiguous.length && blockers.every((finding) => finding.code === "RESUME_RECREATE_INCOMPLETE") && ambiguous.every((entry) => window.DacRecreateCore.isQueuedApproval(state.workbook?.jobs?.find((job) => job.id === entry.job_id) || {})));
  }

  async function authoritativeValidate({ allowRecreate = false } = {}) {
    if (!state.workbook) throw new Error("Open an XLSX workbook first.");
    state.prepared = window.DacRunnerCore.prepare(state.workbook, state.files, state.runtimeOverrides);
    if (state.resumeMode && state.resumePlan) {
      await verifyResumeDirectoryLedger();
      if ((!state.resumePlan.ready || state.resumePlan.findings.some((item) => item.severity === "BLOCKER")) && !(allowRecreate && approvedRecreateIsOnlyResumeBlocker())) throw new Error("RESUME_BLOCKED: Resolve the Resume Plan diagnostics before continuing.");
      window.DacResumeCore.applyToQueue(state.prepared.queue, state.resumePlan.jobs);
    }
    const locationPreflight = await window.DacOutputLocation.preflight(state.outputSettings);
    if (!locationPreflight.ok) throw new Error(`OUTPUT_LOCATION: ${locationPreflight.error}`);
    const auditChain = await auditChainPreflight(locationPreflight.effective);
    state.auditChain = auditChain;
    if (!auditChain.ok) throw new Error(`${auditChain.code}: ${auditChain.message}`);
    const ping = await send({ type: "DAC_PING" });
    if (!ping?.composerFound || ping.generating || ping.busy || ping.securityBlocker || ping.generationLimitBlocker) throw new Error(ping.generationLimitBlocker ? `LIMIT_STOP: ${ping.generationLimitBlocker}` : ping.securityBlocker ? `HARD_STOP: ${ping.securityBlocker}` : "ChatGPT must be reachable, idle, and show its composer.");
    els.outputPermissionText.textContent = "Output-location preflight passed.";
    return locationPreflight.effective;
  }

  async function diagnosticChatCheck() {
    try {
      const tab = await activeTab();
      let ping;
      try { ping = await chrome.tabs.sendMessage(tab.id, { type: "DAC_PING" }); }
      catch (_) { return { ok: false, code: "CHATGPT_RECEIVER_UNAVAILABLE", message: "ChatGPT receiver is unavailable.", guidance: "Reload the active normal ChatGPT conversation, then retry Check Plan." }; }
      if (ping?.securityBlocker) return { ok: false, code: "CHATGPT_SECURITY_BLOCKER", message: `Security blocker: ${ping.securityBlocker}`, guidance: "Resolve the security warning in ChatGPT before running." };
      if (ping?.generationLimitBlocker) return { ok: false, code: "CHATGPT_GENERATION_LIMIT", message: `Generation limit: ${ping.generationLimitBlocker}`, guidance: "ChatGPT has stopped generating images for now. Wait for the limit to reset (or upgrade/switch account), then retry Check Plan." };
      if (!ping?.composerFound) return { ok: false, code: "CHATGPT_COMPOSER_UNAVAILABLE", message: "ChatGPT composer is not available.", guidance: "Open a normal conversation with a visible composer, then retry Check Plan." };
      if (ping.generating || ping.busy) return { ok: false, code: "CHATGPT_BUSY", message: "ChatGPT is generating or busy.", guidance: "Wait until ChatGPT is idle, then retry Check Plan." };
      return { ok: true, tabId: tab.id };
    } catch (error) {
      return { ok: false, code: "CHATGPT_NOT_CONNECTED", message: error.message, guidance: "Open or activate a normal ChatGPT conversation, then retry Check Plan." };
    }
  }

  async function diagnosticOutputCheck() {
    if (!state.outputSettings) return null;
    let values;
    try { values = window.DacOutputLocation.effective(state.outputSettings); }
    catch (error) { return { ok: false, error: error.message, settings: state.outputSettings, namingInvalid: true }; }
    try {
      const check = await window.DacOutputLocation.preflight(state.outputSettings);
      values = check.effective || values;
      const locations = values.image === values.result ? [values.image] : [values.image, values.result];
      const auditChain = await auditChainPreflight(values);
      state.auditChain = auditChain;
      return { ...check, settings: state.outputSettings, auditChain, missingDestination: locations.some((location) => location?.kind === "directory" && !location.handle) };
    } catch (error) {
      return { ok: false, error: error.message, settings: state.outputSettings };
    }
  }

  function renderDiagnosticGuidance() {
    if (!els.validationGuidance || !els.planCheckSummary) return;
    els.validationGuidance.textContent = "";
    const diagnostics = state.diagnostics;
    if (!diagnostics) {
      els.planCheckSummary.textContent = state.workbook ? "Workbook loaded. Check Plan to inspect every requirement." : "Load an XLSX, then Check Plan.";
      return;
    }
    const { blockers, warnings } = diagnostics.summary;
    els.planCheckSummary.textContent = blockers ? `${blockers} blocker${blockers === 1 ? "" : "s"} · ${warnings} warning${warnings === 1 ? "" : "s"}` : warnings ? `No blockers · ${warnings} warning${warnings === 1 ? "" : "s"}` : "No blockers · plan is ready to run.";
    // Passing checks stay out of the panel. The operator's complaint is that
    // he has to hunt and scroll; listing everything that is already fine makes
    // the actionable rows harder to find, not easier. The summary line above
    // already reports the pass count.
    const severityOrder = { BLOCKER: 0, WARNING: 1 };
    const findings = diagnostics.findings
      .filter((finding) => finding.severity !== "OK")
      .map((finding, index) => ({ finding, index }))
      .sort((left, right) => (severityOrder[left.finding.severity] ?? 2) - (severityOrder[right.finding.severity] ?? 2) || left.index - right.index)
      .map(({ finding }) => finding);
    for (const finding of findings) {
      const row = document.createElement("div");
      row.className = `guidance-row ${finding.severity.toLowerCase()}`;
      // Vietnamese for what the operator reads; the English code still goes to
      // the log, the audit JSONL and the ledger as the stable identifier.
      const text = window.DacOperatorMessages.present(finding);
      const title = document.createElement("strong"); title.textContent = text.label;
      const detail = document.createElement("span"); detail.textContent = text.guidance;
      row.append(title, detail);
      // The original message carries filenames and job IDs, so it stays
      // visible as smaller technical detail rather than being dropped.
      if (text.detail) {
        const technical = document.createElement("span");
        technical.className = "guidance-technical";
        technical.textContent = text.detail;
        row.appendChild(technical);
      }
      const action = diagnosticGuidanceAction(finding);
      if (action) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "secondary setup-action guidance-action";
        button.textContent = action.label;
        button.addEventListener("click", action.handler);
        row.appendChild(button);
      }
      els.validationGuidance.appendChild(row);
    }
  }

  // Resolving a checkpoint collision is an operator decision, not an automatic
  // one: the runner cannot know which of two same-version files is the
  // authoritative record. It can, however, read the truth out of each file --
  // every checkpoint records its own `checkpoint_created_at` and job states --
  // and put those facts in front of the operator so the choice is informed.
  // The losing file is renamed, never deleted, and never overwritten.
  const COLLISION_SUFFIXES = ["__superseded", " (1)"];

  function selectedCollisionSuffix() {
    const chosen = String(els.checkpointCollisionSuffix?.value || "");
    return COLLISION_SUFFIXES.includes(chosen) ? chosen : COLLISION_SUFFIXES[0];
  }

  async function readCheckpointSummary(directoryHandle, filename) {
    try {
      const handle = await directoryHandle.getFileHandle(filename, { create: false });
      const file = await handle.getFile();
      const workbook = await window.DacXlsx.open(file);
      const jobs = workbook.jobs || [];
      const done = jobs.filter((job) => ["success", "done"].includes(String(job.status || "").trim().toLowerCase())).length;
      return {
        filename,
        createdAt: String(workbook.config?.checkpoint_created_at || ""),
        version: String(workbook.config?.checkpoint_version || ""),
        jobs: jobs.length,
        done,
        size: Number(file.size) || 0,
        readable: true
      };
    } catch (error) {
      return { filename, createdAt: "", version: "", jobs: 0, done: 0, size: 0, readable: false, error: messageOf(error) };
    }
  }

  function renderCheckpointCollisionList() {
    if (!els.checkpointCollisionList) return;
    els.checkpointCollisionList.replaceChildren();
    const entries = state.checkpointCollision?.entries || [];
    const newest = entries.filter((entry) => entry.createdAt).map((entry) => Date.parse(entry.createdAt)).filter(Number.isFinite).sort((left, right) => right - left)[0];
    for (const entry of entries) {
      const row = element("label", "collision-option");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "checkpointCollisionKeep";
      input.value = entry.filename;
      input.checked = state.checkpointCollision?.keep === entry.filename;
      input.addEventListener("change", () => {
        state.checkpointCollision.keep = entry.filename;
        if (els.checkpointCollisionConfirmBtn) els.checkpointCollisionConfirmBtn.disabled = false;
      });
      const body = element("div", "collision-body");
      body.appendChild(element("strong", "", entry.filename));
      const isNewest = entry.createdAt && Date.parse(entry.createdAt) === newest;
      // The pending count is the part that actually decides the choice: two
      // checkpoints of one version can hold different work, so keeping the
      // newer file is not automatically the safe answer.
      const pending = Math.max(0, entry.jobs - entry.done);
      const facts = entry.readable
        ? `Tạo lúc ${entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "không rõ"} · ${entry.done}/${entry.jobs} job đã xong${pending ? ` · còn ${pending} job chờ chạy` : ""}${isNewest ? " · MỚI NHẤT" : ""}`
        : `Không đọc được file này (${entry.error || "lỗi không rõ"})`;
      body.appendChild(element("span", isNewest ? "collision-facts newest" : "collision-facts", facts));
      if (entry.readable && pending) body.appendChild(element("span", "collision-warning", `Bỏ file này là mất ${pending} job đang chờ.`));
      row.append(input, body);
      els.checkpointCollisionList.appendChild(row);
    }
  }

  async function openCheckpointCollisionDialog(finding) {
    const files = (finding.files || []).map((name) => String(name)).filter(Boolean);
    if (!files.length || !els.checkpointCollisionDialog) return;
    const values = state.outputSettings ? window.DacOutputLocation.effective(state.outputSettings) : null;
    const directoryHandle = values?.result?.kind === "directory" ? values.result.handle : null;
    if (!directoryHandle) { progress("Chọn lại thư mục đã cấp quyền trước khi xử lý file trùng."); return; }
    state.checkpointCollision = { entries: [], keep: null, directoryHandle };
    state.checkpointCollision.entries = await Promise.all(files.map((name) => readCheckpointSummary(directoryHandle, name)));
    // Preselect the newest readable checkpoint; the operator can still switch.
    const readable = state.checkpointCollision.entries.filter((entry) => entry.readable && entry.createdAt);
    const suggested = readable.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))[0];
    state.checkpointCollision.keep = suggested?.filename || null;
    if (els.checkpointCollisionStatus) els.checkpointCollisionStatus.textContent = suggested ? "Suggestion: keep the newest checkpoint (preselected)." : "Creation times are unavailable; select the file to keep.";
    if (els.checkpointCollisionStatusVi) els.checkpointCollisionStatusVi.textContent = suggested ? "Gợi ý: giữ bản mới nhất (đã chọn sẵn)." : "Không đọc được thời điểm tạo; hãy tự chọn file cần giữ.";
    if (els.checkpointCollisionConfirmBtn) els.checkpointCollisionConfirmBtn.disabled = !state.checkpointCollision.keep;
    renderCheckpointCollisionList();
    if (typeof els.checkpointCollisionDialog.showModal === "function") els.checkpointCollisionDialog.showModal();
    else els.checkpointCollisionDialog.setAttribute("open", "");
  }

  function closeCheckpointCollisionDialog() {
    state.checkpointCollision = null;
    if (!els.checkpointCollisionDialog) return;
    if (typeof els.checkpointCollisionDialog.close === "function") els.checkpointCollisionDialog.close();
    else els.checkpointCollisionDialog.removeAttribute("open");
  }

  async function supersededName(directoryHandle, filename, suffix) {
    const dot = filename.lastIndexOf(".");
    const stem = dot > 0 ? filename.slice(0, dot) : filename;
    const extension = dot > 0 ? filename.slice(dot) : "";
    // Both suffixes stop the name matching the checkpoint pattern, which is
    // what clears the ambiguity. The counter keeps a second run from ever
    // landing on a name that already exists.
    for (let index = 0; index < 100; index += 1) {
      const counted = index ? (suffix === " (1)" ? ` (${index + 1})` : `${suffix}-${String(index).padStart(2, "0")}`) : suffix;
      const candidate = `${stem}${counted}${extension}`;
      if (!(await window.DacOutputLocation.fileExists(directoryHandle, candidate))) return candidate;
    }
    throw new Error("Không tìm được tên thay thế còn trống.");
  }

  async function confirmCheckpointCollision() {
    const collision = state.checkpointCollision;
    if (!collision?.keep) return;
    const { directoryHandle, keep, entries } = collision;
    const suffix = selectedCollisionSuffix();
    const losers = entries.map((entry) => entry.filename).filter((name) => name !== keep);
    try {
      if (els.checkpointCollisionConfirmBtn) els.checkpointCollisionConfirmBtn.disabled = true;
      const renamed = [];
      for (const filename of losers) {
        const handle = await directoryHandle.getFileHandle(filename, { create: false });
        if (typeof handle.move !== "function") throw new Error("Chrome bản này không đổi tên file được. Đổi tên thủ công trong Explorer rồi Check Plan lại.");
        const target = await supersededName(directoryHandle, filename, suffix);
        await handle.move(target);
        renamed.push(`${filename} → ${target}`);
      }
      closeCheckpointCollisionDialog();
      log(`Checkpoint collision resolved; kept ${keep}. Renamed: ${renamed.join("; ")}.`, "done");
      progress(`Đã giữ ${keep}. Đổi tên: ${renamed.join("; ")}. Đang kiểm tra lại…`);
      // Re-derive the resume state from disk rather than trusting the in-memory
      // plan that was built while the folder was still ambiguous.
      state.resumeCheckpointFindings = [];
      state.resumePlan = window.DacResumeCore.plan(state.workbook);
      await scanProfileCheckpoints({ loadHighest: true });
      state.resumePlan = window.DacResumeCore.plan(state.workbook);
      addCheckpointFindings({ findings: state.resumeCheckpointFindings });
      await prepare({ diagnostic: true });
      if (state.prepared) window.DacResumeCore.applyToQueue(state.prepared.queue, state.resumePlan.jobs);
      await validate();
    } catch (error) {
      const reason = messageOf(error);
      if (els.checkpointCollisionStatus) els.checkpointCollisionStatus.textContent = `Không xử lý được: ${reason}`;
      if (els.checkpointCollisionConfirmBtn) els.checkpointCollisionConfirmBtn.disabled = false;
      log(`Checkpoint collision not resolved: ${reason}`, "error");
    }
  }

  // Every actionable finding carries the one control that resolves it, so the
  // operator never has to scroll back up hunting for a button.
  function diagnosticGuidanceAction(finding) {
    if (finding.severity !== "BLOCKER" && finding.severity !== "WARNING") return null;
    if (["WORKBOOK_NOT_LOADED", "WORKBOOK_NO_JOBS", "MALFORMED_JOBS"].includes(finding.code)) {
      return { label: "Chọn workbook", handler: () => els.workbookInput.click() };
    }
    if (["MISSING_REFERENCES", "AMBIGUOUS_REFERENCES", "DUPLICATE_REFERENCE", "DUPLICATE_ALIASES", "UNUSED_REFERENCES"].includes(finding.code)) {
      return { label: "Thêm ảnh tham chiếu", handler: () => els.referencesInput.click() };
    }
    if (["MAX_INPUT_IMAGES", "RUN_SETTINGS_INVALID"].includes(finding.code)) {
      return {
        label: "Mở phần thiết lập",
        handler: () => {
          const firstControl = els.runtimeSettingsCard.querySelector("input, select, textarea, button");
          els.runtimeSettingsCard.scrollIntoView({ behavior: "smooth", block: "start" });
          firstControl?.focus({ preventScroll: true });
        }
      };
    }
    if (["OUTPUT_DESTINATION_MISSING", "OUTPUT_PERMISSION_REQUIRED", "OUTPUT_PROFILE_UNAVAILABLE", "OUTPUT_PROFILE_UNBOUND", "RESUME_OUTPUT_MISMATCH"].includes(finding.code)) {
      return { label: "Chọn thư mục", handler: () => openFolderPickDialog("image") };
    }
    if (["CHATGPT_RECEIVER_UNAVAILABLE", "CHATGPT_SECURITY_BLOCKER", "CHATGPT_COMPOSER_UNAVAILABLE", "CHATGPT_BUSY", "CHATGPT_NOT_CONNECTED", "CHECKPOINT_VERSION_CONFLICT"].includes(finding.code)) {
      return { label: "Kiểm tra lại", handler: validate };
    }
    // Renaming a checkpoint is never automated: one of the two files may still
    // be the authoritative one, and the runner cannot tell which. Hand the
    // operator the exact names instead.
    if (finding.code === "RESUME_CHECKPOINT_VERSION_AMBIGUOUS" && (finding.files || []).length) {
      return { label: "Xử lý file trùng", handler: () => openCheckpointCollisionDialog(finding).catch((error) => log(messageOf(error), "error")) };
    }
    if (["RESUME_LEDGER_INVALID", "RESUME_RUN_ID_MISMATCH", "RESUME_LATEST_CHECKPOINT_INVALID"].includes(finding.code)) {
      return { label: "Chọn Result XLSX khác", handler: () => els.resumeWorkbookInput?.click() };
    }
    return null;
  }

  async function validate() {
    const [outputCheck, chatCheck] = await Promise.all([diagnosticOutputCheck(), diagnosticChatCheck()]);
    state.diagnostics = window.DacPlanDiagnostics.analyze({
      workbook: state.workbook,
      files: state.files,
      overrides: state.runtimeOverrides,
      outputCheck,
      chatCheck,
      runner: window.DacRunnerCore,
      output: window.DacOutputLocation,
      configFindings: state.configFindings,
      outputProfileState: state.destinationMode === "profile" ? state.outputProfileState : null
    });
    if (state.resumeMode && state.resumePlan) {
      await verifyResumeDirectoryLedger();
      state.diagnostics.findings.push(...state.resumePlan.findings);
      state.diagnostics.blockers = state.diagnostics.findings.filter((finding) => finding.severity === "BLOCKER");
      state.diagnostics.warnings = state.diagnostics.findings.filter((finding) => finding.severity === "WARNING");
      state.diagnostics.oks = state.diagnostics.findings.filter((finding) => finding.severity === "OK");
      state.diagnostics.summary = { blockers: state.diagnostics.blockers.length, warnings: state.diagnostics.warnings.length, ok: state.diagnostics.oks.length };
      renderResumePlan();
    }
    state.validated = state.diagnostics.summary.blockers === 0;
    if (state.validated) {
      setStatus(state.diagnostics.summary.warnings ? "IDLE" : "DONE", state.diagnostics.summary.warnings ? "WARNING" : "READY TO RUN");
      progress(state.diagnostics.summary.warnings ? "Check Plan found warnings; run remains enabled." : "Check Plan passed. Ready to run.");
      log("Check Plan completed with no blockers.", "done");
    } else {
      setStatus("IDLE", "NEEDS INPUT");
      progress(`Check Plan found ${state.diagnostics.summary.blockers} blocker(s).`);
      log("Check Plan completed; guidance is shown in Setup.", "error");
    }
    renderDiagnosticGuidance();
    renderQueue();
    renderOutput();
    controls();
  }

  async function copyReviewPacket() {
    if (!state.workbook) return;
    const payload = window.DacOrchestratorReview.copyPayload(reviewContext());
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(payload);
    } catch (_) {
      const textarea = document.createElement("textarea");
      textarea.value = payload;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      textarea.remove();
      if (!copied) throw new Error("Could not copy the review packet. Select and copy it manually from DevTools.");
    }
    els.copyReviewPacketStatus.textContent = "Copied review packet. Local blockers remain authoritative.";
    log("Copied DAC_ORCHESTRATOR_REVIEW_V1 packet for AI review.", "done");
  }

  async function copyFolderHint() {
    const hint = String(state.outputSettings?.folderHint || "").trim();
    if (!hint) return;
    await navigator.clipboard.writeText(hint);
    els.outputPermissionText.textContent = "Expected folder path copied. Choose that folder, then Check Plan again.";
  }

  function renderHelpGlossary() {
    if (!els.helpGlossary) return;
    els.helpGlossary.textContent = "";
    const groups = new Map();
    for (const entry of window.DacOperatorGlossary.GLOSSARY) groups.set(entry.section, [...(groups.get(entry.section) || []), entry]);
    for (const [section, entries] of groups) {
      const block = document.createElement("section");
      const heading = document.createElement("h3"); heading.textContent = section;
      const list = document.createElement("dl");
      for (const entry of entries) { const term = document.createElement("dt"); term.textContent = entry.term; const detail = document.createElement("dd"); detail.textContent = entry.detail; list.append(term, detail); }
      block.append(heading, list); els.helpGlossary.appendChild(block);
    }
  }

  function renderOutputGlossary() {
    if (!els.outputGlossary || !window.DacOperatorGlossary) return;
    els.outputGlossary.replaceChildren();
    for (const entry of window.DacOperatorGlossary.GLOSSARY.filter((item) => item.section === "OUTPUT")) {
      const item = element("article", "output-concept-item");
      item.append(element("strong", "output-concept-term", entry.term), element("p", "output-concept-detail", entry.detail));
      els.outputGlossary.appendChild(item);
    }
  }

  function renderHaltInstructions() {
    const guide = window.DacHaltInstructions;
    if (!guide || !els.haltInstructionsList) return;
    els.haltInstructionsList.replaceChildren();
    if (els.haltInstructionsCount) els.haltInstructionsCount.textContent = `${guide.HALT_GROUPS.length} nhóm`;
    for (const group of guide.HALT_GROUPS) {
      const item = element("article", "halt-instruction-item");
      const top = element("div", "halt-instruction-top");
      top.append(element("div", "halt-instruction-title", group.title), element("span", "halt-retry-badge", `Auto-retry: ${group.retry}`));
      const codes = element("div", "halt-code-list");
      for (const code of group.codes) codes.appendChild(element("code", "halt-code", code));
      const meaning = element("p", "halt-meaning", group.meaning);
      const action = element("p", "halt-action");
      action.append(element("strong", "", "Nên làm: "), document.createTextNode(group.action));
      item.append(top, codes, meaning, action);
      els.haltInstructionsList.appendChild(item);
    }
    const special = guide.SPECIAL_STATUS;
    if (els.haltSpecialStatus) {
      const code = element("code", "halt-code", special.code);
      const meaning = element("p", "", special.meaning);
      const action = element("p", "halt-action");
      action.append(element("strong", "", "Nên làm: "), document.createTextNode(special.action));
      els.haltSpecialStatus.replaceChildren(element("div", "halt-instruction-title", special.title), code, meaning, action);
    }
    if (els.haltNonHaltList) {
      const rows = guide.NON_HALT_CODES.map((entry) => {
        const row = element("p", "");
        row.append(element("code", "halt-code", entry.code), document.createTextNode(` — ${entry.meaning}`));
        return row;
      });
      els.haltNonHaltList.replaceChildren(...rows);
    }
  }

  function openHaltInstructions() {
    renderHaltInstructions();
    if (typeof els.haltInstructionsDialog?.showModal === "function") els.haltInstructionsDialog.showModal();
    else els.haltInstructionsDialog?.setAttribute("open", "");
  }

  function closeHaltInstructions() {
    if (typeof els.haltInstructionsDialog?.close === "function") els.haltInstructionsDialog.close();
    else els.haltInstructionsDialog?.removeAttribute("open");
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
    // A deliberate rerun of a completed job carries its own collision-policy
    // choice on the job row (set only for that one job by confirmRerun), so
    // it can preserve or replace the prior image independently of whatever
    // the operator configured as the run's default collision policy.
    const policy = item.job.rerun_collision_policy ? window.DacOutputLocation.collisionPolicy(item.job.rerun_collision_policy) : values.collisionPolicy;
    if (location.kind === "downloads") return download(url, item.job.id, location.folder, `${location.folder}/${requested}`, policy);
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) throw new Error(`Could not fetch the generated image for the selected folder (${response.status}).`);
    const blob = await response.blob();
    if (!blob.size) throw new Error("Generated image download was empty.");
    const actual = await window.DacOutputLocation.writeFileWithPolicy(location.handle, window.DacOutputLocation.renderImageFilename(values.imagePattern, { job_id: item.job.id, attempt: item.attempt_count, index: item.number }, window.DacOutputLocation.actualExtension(blob, extension)), blob, policy);
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

  function snapshotOutputSettings(actualResultFilename = null, actualAuditFilename = state.auditFile || null, workbook = state.workbook, checkpoint = null) {
    const plan = outputPlan();
    const settings = state.prepared?.settings || window.DacRunnerCore.runtimeConfig(workbook?.config || {}, state.runtimeOverrides);
    const effectiveResult = window.DacOutputLocation.effective(state.outputSettings).result;
    const actual = String(actualResultFilename || "");
    const resultDestination = actual ? (/^(?:[A-Za-z]:[\\/]|\/)/.test(actual) || actual.startsWith(window.DacOutputLocation.locationLabel(effectiveResult)) ? actual : window.DacOutputLocation.fileLabel(effectiveResult, actual)) : plan.resultDestination;
    const output = window.DacOutputLocation.effective(state.outputSettings);
    const auditChain = auditGapAcknowledged() ? { audit_chain_status: state.workbook.config.audit_chain_status, audit_chain_missing_filename: state.workbook.config.audit_chain_missing_filename, audit_chain_acknowledged_at: state.workbook.config.audit_chain_acknowledged_at, audit_chain_segment_filename: state.workbook.config.audit_chain_segment_filename } : {};
    const snapshot = { run_id: state.runId || "", result_filename_pattern: output.checkpointFilenamePattern, effective_source_workbook: plan.sourceWorkbook, effective_image_output: plan.imageDestination, effective_result_xlsx: resultDestination, effective_image_naming: output.imagePattern, effective_collision_policy: output.collisionPolicy, effective_save_images: output.saveImages, effective_save_result_xlsx: output.saveResultXlsx, effective_save_audit_jsonl: output.saveAuditJsonl, effective_audit_log: actualAuditFilename || "", effective_timeout_sec: settings.timeout_sec, effective_max_retries: settings.max_retries, effective_safety_cooldown_sec: settings.safety_cooldown_sec, effective_max_input_images: settings.max_input_images, effective_continue_on_error: settings.continue_on_error, effective_rerun_done: settings.rerun_done, effective_checkpoint_interval_jobs: settings.checkpoint_interval_jobs, ...auditChain, ...(checkpoint || {}) };
    window.DacXlsx.updateConfigSnapshot(workbook, snapshot);
    if (workbook === state.workbook && state.prepared) for (const item of state.prepared.queue) update(item, snapshot);
  }

  async function checkpointWorkbook(filename, version, sourceWorkbook = state.workbook, auditFilename = state.auditFile) {
    const sourceBlob = window.DacXlsx.downloadBlob(sourceWorkbook);
    const candidate = await window.DacXlsx.open(new File([sourceBlob], filename, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const previous = state.checkpointFilename || window.DacOutputLocation.artifactLeaf(sourceWorkbook.config.checkpoint_filename || "");
    const checkpoint = { checkpoint_version: String(version), checkpoint_filename: filename, checkpoint_created_at: new Date().toISOString() };
    if (previous) checkpoint.previous_checkpoint_filename = previous;
    snapshotOutputSettings(filename, auditFilename, candidate, checkpoint);
    return { workbook: candidate, blob: window.DacXlsx.downloadBlob(candidate), checkpoint };
  }

  // Enumerates every file in a directory that parses as a checkpoint of this run's
  // pattern. Shared by the resume scan and the pre-write conflict check so both
  // reason about the same set.
  async function discoverCheckpoints(directoryHandle, pattern) {
    const found = [];
    for await (const [name, handle] of directoryHandle.entries()) {
      if (handle?.kind !== "file") continue;
      const parsed = window.DacCheckpointCore.parse(pattern, name);
      if (parsed) found.push(parsed);
    }
    return found;
  }

  async function assertCheckpointVersionAvailable(location, filename, pattern = "", version = null) {
    if (location.kind === "directory") {
      if (await window.DacOutputLocation.fileExists(location.handle, filename)) {
        throw new Error(`CHECKPOINT_VERSION_CONFLICT: '${filename}' already exists. No Result checkpoint was written.`);
      }
      // A free filename is not a free version. Once a folder holds both naming
      // widths, 'v002' and 'v02' mean the same version, and a later resume
      // would tie-break on filename and silently prefer the older file. Refuse
      // to create the second one instead.
      if (pattern && Number.isInteger(Number(version))) {
        const discovered = await discoverCheckpoints(location.handle, pattern);
        if (window.DacCheckpointCore.hasVersionConflict(discovered, version)) {
          const taken = discovered.filter((item) => Number(item.version) === Number(version)).map((item) => item.filename).join(", ");
          throw new Error(`CHECKPOINT_VERSION_CONFLICT: checkpoint version ${window.DacCheckpointCore.formatVersion(version)} already exists as ${taken}. No Result checkpoint was written.`);
        }
      }
      return;
    }
    const request = window.DacOutputLocation.downloadArtifactRequest(location, filename, "fail");
    const requested = request.filename.replace(/\//g, "\\").toLowerCase();
    const matches = await chrome.downloads.search({ filename: request.filename });
    if (matches.some((item) => item.state === "complete" && String(item.filename || "").toLowerCase().endsWith(requested))) throw new Error(`CHECKPOINT_VERSION_CONFLICT: '${filename}' already exists in Chrome Downloads history. No Result checkpoint was written.`);
  }

  async function persistLedgerCandidate(sourceWorkbook, location, auditFilename = state.auditFile, { force = false } = {}) {
    const values = window.DacOutputLocation.effective(state.outputSettings);
    if (!values.saveResultXlsx && !force) return null;
    const version = window.DacCheckpointCore.nextVersion(state.checkpointVersion || sourceWorkbook.config.checkpoint_version);
    const filename = window.DacOutputLocation.renderCheckpointFilename(sourceWorkbook.fileName, state.outputSettings, version);
    const candidate = await checkpointWorkbook(filename, version, sourceWorkbook, auditFilename);
    await assertCheckpointVersionAvailable(location, filename, values.checkpointFilenamePattern, version);
    if (location.kind === "directory") {
      await window.DacCheckpointCore.persistDirectoryCheckpoint({
        directoryHandle: location.handle,
        filename,
        version,
        blob: candidate.blob,
        writeNewFile: window.DacOutputLocation.writeNewFile,
        fileExists: window.DacOutputLocation.fileExists,
        onAbandoned: async (failure) => audit("CHECKPOINT_PARTIAL_ABANDONED", null, {
          message: `Checkpoint '${failure.filename}' failed verification and was quarantined as '${failure.abandoned_filename}' at version ${window.DacCheckpointCore.formatVersion(failure.version)}.`
        })
      });
      const actual = window.DacOutputLocation.fileLabel(location, filename);
      return { ...candidate, actual, version, filename, storage: "directory" };
    }
    const objectUrl = URL.createObjectURL(candidate.blob);
    try {
      const request = window.DacOutputLocation.downloadArtifactRequest(location, filename, "fail");
      const downloadId = await chrome.downloads.download({ url: objectUrl, filename: request.filename, conflictAction: request.conflictAction, saveAs: false });
      const item = await waitForCompletedDownload(downloadId);
      window.DacOutputLocation.verifyDownloadedFilename(request, item.filename);
      return { ...candidate, actual: item.filename, version, filename, storage: "downloads" };
    } finally { setTimeout(() => URL.revokeObjectURL(objectUrl), 1000); }
  }

  async function saveLedger(location) {
    const persisted = await persistLedgerCandidate(state.workbook, location, state.auditFile);
    if (!persisted) return "";
    state.workbook = persisted.workbook;
    state.checkpointVersion = persisted.version;
    state.checkpointFilename = persisted.filename;
    state.checkpointCreatedAt = persisted.checkpoint.checkpoint_created_at;
    if (state.prepared?.queue) window.DacRunnerCore.rebindQueueRows(state.prepared.queue, state.workbook, window.DacXlsx.activeJobs);
    renderCheckpointMeta();
    log(`Result checkpoint v${window.DacCheckpointCore.formatVersion(persisted.version)} ${persisted.storage === "directory" ? "verified" : "downloaded"}: ${persisted.actual}.`, "done");
    return persisted.actual;
  }

  async function saveAuditLog(location, { appendExisting = false, force = false } = {}) {
    const values = window.DacOutputLocation.effective(state.outputSettings);
    if (!values.saveAuditJsonl && !force) return "";
    const pendingEvents = state.auditEvents.slice();
    const pendingPayload = pendingEvents.map((event) => JSON.stringify(event)).join("\n") + (pendingEvents.length ? "\n" : "");
    let payload = pendingPayload;
    const blob = new Blob([payload], { type: "application/jsonl" });
    const requested = values.auditFilename;
    if (location.kind === "directory") {
      let appendedExisting = false;
      if (appendExisting) {
        try {
          const existingHandle = await location.handle.getFileHandle(requested, { create: false });
          const existingFile = await existingHandle.getFile();
          if (!existingFile || Number(existingFile.size) <= 0) throw new Error("empty audit");
          const existingPayload = await existingFile.text();
          payload = `${existingPayload}${existingPayload.endsWith("\n") ? "" : "\n"}${payload}`;
          appendedExisting = true;
        } catch (error) {
          if (error?.name !== "NotFoundError") throw error;
        }
      } else if (state.resumeMode) {
        if (auditGapAcknowledged()) {
          if (state.auditChain?.segmentStarted) {
            try {
              const segmentHandle = await location.handle.getFileHandle(requested, { create: false });
              const segmentFile = await segmentHandle.getFile();
              if (!segmentFile || Number(segmentFile.size) <= 0) throw new Error("empty segment");
              const segmentPayload = await segmentFile.text();
              payload = `${segmentPayload}${segmentPayload.endsWith("\n") ? "" : "\n"}${payload}`;
            } catch (_) { throw new Error(`RESUME_AUDIT_GAP_SEGMENT_MISSING: New audit segment '${requested}' is unavailable; do not recreate until the gap record is restored.`); }
          }
        } else {
          const previous = recordedPriorAuditFilename(values);
          try {
            const priorHandle = await location.handle.getFileHandle(previous, { create: false });
            const priorFile = await priorHandle.getFile();
            if (!priorFile || Number(priorFile.size) <= 0) throw new Error("empty prior audit");
            const priorPayload = await priorFile.text();
            payload = `${priorPayload}${priorPayload.endsWith("\n") ? "" : "\n"}${payload}`;
          } catch (_) {
            const diagnostic = window.DacAuditChainCore.missing(previous);
            throw new Error(`${diagnostic.code}: ${diagnostic.message}`);
          }
        }
      }
      const mergedBlob = new Blob([payload], { type: "application/jsonl" });
      const policy = appendedExisting || state.resumeMode && (!auditGapAcknowledged() || state.auditChain?.segmentStarted) ? "overwrite" : "fail";
      const written = await window.DacOutputLocation.writeFileWithPolicy(location.handle, requested, mergedBlob, policy);
      if (state.resumeMode && auditGapAcknowledged()) state.auditChain = { ...state.auditChain, segmentStarted: true };
      // Every buffered event is now durably in the file, and each later flush
      // on this path re-reads that file before appending.  Leaving the buffer
      // populated made a second flush re-emit already-persisted events -- the
      // AUDIT_CHAIN_GAP marker was written twice in Pilot-05.  Clear only
      // after a verified write, and only on this read-then-append path.
      const flushed = new Set(pendingEvents);
      state.auditEvents = state.auditEvents.filter((event) => !flushed.has(event));
      return window.DacOutputLocation.fileLabel(location, written.filename);
    }
    if (state.resumeMode) throw new Error("RESUME_AUDIT_APPEND_UNAVAILABLE: Chrome Downloads cannot read and append the prior audit log. Continue using the authorized run folder.");
    payload = `${state.auditPersistedPayload || ""}${pendingPayload}`;
    const downloadBlob = new Blob([payload], { type: "application/jsonl" });
    const objectUrl = URL.createObjectURL(downloadBlob);
    try {
      const request = state.auditPersistedPayload
        ? window.DacOutputLocation.downloadArtifactRequest(location, requested, "overwrite")
        : force
        ? window.DacOutputLocation.downloadArtifactRequest(location, requested, "uniquify")
        : window.DacOutputLocation.downloadArtifactRequest(location, requested, "fail");
      if (!force) await assertDownloadCollisionPolicy(request);
      const downloadId = await chrome.downloads.download({ url: objectUrl, filename: request.filename, conflictAction: request.conflictAction, saveAs: false });
      const item = await waitForCompletedDownload(downloadId);
      window.DacOutputLocation.verifyDownloadedFilename(request, item.filename);
      state.auditPersistedPayload = payload;
      const flushed = new Set(pendingEvents);
      state.auditEvents = state.auditEvents.filter((event) => !flushed.has(event));
      return item.filename;
    } finally { setTimeout(() => URL.revokeObjectURL(objectUrl), 1000); }
  }

  async function flushRunCheckpoint(resultLocation, reason) {
    const verified = await window.DacRunnerCore.verifiedRunCheckpoint({
      persistAudit: () => saveAuditLog(resultLocation, { appendExisting: Boolean(state.auditFile) }),
      onAuditPersisted: async (auditFile) => { state.auditFile = auditFile; snapshotOutputSettings(null, auditFile); },
      persistLedger: () => saveLedger(resultLocation)
    });
    state.auditFile = verified.auditFile;
    state.resultFile = verified.resultFile;
    audit("RUN_CHECKPOINT_VERIFIED", null, { message: `${reason}; ${state.checkpointFilename} is authoritative.` });
    return state.resultFile;
  }

  async function assertDownloadCollisionPolicy(request) {
    if (request.collisionPolicy !== "fail") return;
    const requested = request.filename.replace(/\//g, "\\").toLowerCase();
    const matches = await chrome.downloads.search({ filename: request.filename });
    if (matches.some((item) => item.state === "complete" && String(item.filename || "").toLowerCase().endsWith(requested))) throw window.DacOutputLocation.collisionError(request);
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
    state.selectedInterJobDelay = seconds;
    for (const remaining of window.DacRunnerCore.countdownValues(seconds)) {
      if (state.stopRequested) break;
      state.interJobCountdown = remaining;
      const runtimeInfo = currentRuntimeInfo();
      nextTask(item, `${runtimeInfo.nextTransition} · ${runtimeInfo.interJobDelay}`);
      renderRuntime();
      await sleep(1000);
    }
    state.interJobCountdown = null;
    state.selectedInterJobDelay = null;
    renderRuntime();
  }

  async function waitForChatReady(item) {
    const selectedSafetyCooldownSec = window.DacRunnerCore.safetyCooldownSeconds(item.settings);
    const response = await send({ type: "DAC_WAIT_CHAT_READY", timeoutMs: item.settings.timeout_sec * 1000, safetyCooldownSec: selectedSafetyCooldownSec, outputVerified: true });
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
    update(item, { status: "INTERRUPTED", attempt_phase: item.phase, attempt_count: item.attempt_count, retry_count: item.retry_count, failure_type: failureType, last_error: message, error: message, completed_at: now, ...(item.operator_recreate ? { recreate_status: "FAILED" } : {}) });
    audit("FAILURE", item, { message }); audit("JOB_INTERRUPTED", item, { message });
    if (item.operator_recreate) audit("RECREATE_ATTEMPT_FAILED", item, { message });
    log(`${item.job.id} interrupted: ${failureType}: ${message}`, "error");
    setCurrent(item, "INTERRUPTED", failureType);
    renderQueue(); progress(`${item.job.id} interrupted after ${item.phase}.`);
  }

  function retriesExhausted(item) {
    return item.retry_count >= item.settings.max_retries || window.DacRunnerCore.HARD_STOP_FAILURE_TYPES.has(item.failure_type);
  }

  // Single funnel for every failure path (pre-submit gate, the submit call
  // itself, post-submit reconciliation, save/verify) once USER_STOP has
  // already been ruled out. A hard stop (CAPTCHA, quota, receiver lost)
  // halts the whole batch -- nothing else can safely run until the operator
  // resolves it via Resume Plan. Everything else auto-retries up to
  // max_retries and, once exhausted, settles as FAILED so the queue keeps
  // moving to the next job instead of stopping the batch.
  async function resolveJobFailure(item, failureType, message, settings) {
    const hardStop = window.DacRunnerCore.HARD_STOP_FAILURE_TYPES.has(failureType);
    if (!hardStop && window.DacRunnerCore.canRetry(item, failureType)) {
      item.retry_count += 1;
      update(item, { status: "PENDING", attempt_phase: "PRE_SUBMIT", attempt_count: item.attempt_count, retry_count: item.retry_count, failure_type: failureType, last_error: message, error: message });
      audit("FAILURE", item, { message }); log(`${item.job.id} ${failureType}; retry ${item.retry_count}/${item.settings.max_retries}.`, "error"); renderQueue();
      const retryCooldownMs = window.DacRunnerCore.retryCooldown(item.settings, item.retry_count) * 1000;
      state.retryResumeAt = Date.now() + retryCooldownMs; renderRuntime();
      await sleep(retryCooldownMs);
      state.retryResumeAt = null; renderRuntime();
      return { completed: false, halted: false };
    }
    if (hardStop) {
      markInterrupted(item, failureType, message);
      return { completed: true, halted: true };
    }
    update(item, { status: "FAILED", attempt_phase: item.phase, attempt_count: item.attempt_count, retry_count: item.retry_count, failure_type: failureType, last_error: message, error: message, completed_at: new Date().toISOString(), ...(item.operator_recreate ? { recreate_status: "FAILED" } : {}) });
    audit("FAILURE", item, { message }); if (item.operator_recreate) audit("RECREATE_ATTEMPT_FAILED", item, { message });
    log(`${item.job.id} skipped after ${item.retry_count} retr${item.retry_count === 1 ? "y" : "ies"}: ${failureType}: ${message}`, "error");
    setCurrent(item, "FAILED", failureType);
    renderQueue(); progress(`${item.job.id} skipped (${failureType}); continuing with the next job.`);
    return { completed: true, halted: !settings.continue_on_error };
  }

  async function finishDetectedOutput(item, result, effectiveOutput, settings) {
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
      return resolveJobFailure(item, persistenceFailureType(error), messageOf(error), settings);
    }
    try {
      item.runtime_stage = "FINALIZING / WAITING_IDLE"; setCurrent(item, item.runtime_stage, "No new prompt can start until ChatGPT is idle.", item.settings.timeout_sec);
      await waitForChatReady(item);
      item.phase = "CHAT_READY"; audit("CHAT_READY", item);
      item.phase = "SUCCESS";
      item.runtime_stage = "SUCCESS"; setCurrent(item, item.runtime_stage, "Saved image and idle readiness confirmed.");
      update(item, { status: "SUCCESS", attempt_phase: item.phase, result_file: item.result_file, result_download_id: item.result_download_id, attempt_count: item.attempt_count, retry_count: item.retry_count, failure_type: "", last_error: "", error: "", completed_at: new Date().toISOString(), ...(item.operator_recreate ? { recreate_status: "SUCCESS", recreate_attempt_id: item.attempt_id } : {}) });
      audit("JOB_SUCCESS", item); log(`${item.job.id} success after CHAT_READY.`, "done"); renderQueue(); progress(`${item.job.id} complete; saved output is checkpointed.`);
      if (item.operator_recreate) {
        // recreate_origin_result_file is only set when the deliberately
        // recreated job actually had a prior verified output (the SAFE_
        // COMPLETE rerun case) -- record which attempt superseded which
        // file, and when, so the audit trail matches the folder instead of
        // silently letting the new result_file erase that history.
        const priorFile = item.job.recreate_origin_result_file || "";
        audit("RECREATE_JOB_SUCCESS", item, { message: priorFile ? `Operator-approved recreate completed with verified persisted output; replaced previous output '${priorFile}'.` : "Operator-approved recreate completed with verified persisted output." });
      }
      return { completed: true, halted: false };
    } catch (error) {
      return resolveJobFailure(item, window.DacRunnerCore.classifyFailure(error, "OUTPUT_SAVED"), messageOf(error), settings);
    }
  }

  async function reconcileSubmittedAttempt(item, effectiveOutput, message, settings) {
    item.status = "RECONCILING"; item.phase = "SUBMITTED";
    update(item, { status: "RECONCILING", attempt_phase: item.phase, attempt_count: item.attempt_count, retry_count: item.retry_count, failure_type: "", last_error: "", error: "" });
    audit("RECONCILE_START", item, { message }); renderQueue(); progress(`Reconciling ${item.job.id}; it will not be resubmitted this attempt.`);
    let response;
    try { response = await send({ type: "DAC_RECONCILE_IMAGE_JOB", job_id: item.job.id, attempt_id: item.attempt_id, timeoutMs: Math.min(item.settings.timeout_sec * 1000, 60000) }); }
    catch (error) { return resolveJobFailure(item, "POST_SUBMIT_UNCERTAIN", messageOf(error), settings); }
    if (!matchesAttempt(response, item)) return resolveJobFailure(item, "ATTEMPT_ID_MISMATCH", "Attempt identity mismatch during reconciliation.", settings);
    applyAttemptTelemetry(item, response.attempt);
    if (response?.ok && response.result?.image_url) {
      audit("RECONCILE_RESULT", item, { message: "Late attributable output found." });
      return finishDetectedOutput(item, response.result, effectiveOutput, settings);
    }
    const failureType = window.DacRunnerCore.classifyFailure(response?.error || message || "Post-submit output remained uncertain.", "SUBMITTED");
    audit("RECONCILE_RESULT", item, { message: response?.error || message || "No attributable output found." });
    return resolveJobFailure(item, failureType === "TIMEOUT_AFTER_SUBMIT" ? "POST_SUBMIT_UNCERTAIN" : failureType, response?.error || message || "Post-submit output remained uncertain.", settings);
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
      return { ok: true };
    } catch (error) {
      return { ok: false, failureType: window.DacRunnerCore.classifyFailure(error, "PRE_SUBMIT"), message: messageOf(error) };
    }
  }

  async function run(mode = "all") {
    if (!queueRunLock.tryBeginRun()) {
      const reason = "RUN_ACTIVE: Setup mutation, run validation, or another run is already active.";
      setStatus("ERROR", "NOT READY"); progress(reason); log(reason, "error"); controls();
      return { ok: false, reason };
    }
    let effectiveOutput;
    let artifactPersistenceFailed = false;
    let completedNaturally = false;
    let runQueue;
    try {
      effectiveOutput = await authoritativeValidate({ allowRecreate: mode === "recreate" });
      runQueue = window.DacRunnerCore.selectQueue(state.prepared.queue, mode, mode === "selected" ? state.runSelection : state.selectedJobId);
      if (!runQueue.length) {
        const reason = `No ${mode} jobs are eligible.`;
        setStatus("ERROR", "NOT READY"); progress(reason); log(reason, "error");
        return { ok: false, reason };
      }
      queueRunLock.promoteRun();
    } catch (error) {
      const reason = messageOf(error); setStatus("ERROR"); progress(reason); log(reason, "error");
      return { ok: false, reason };
    } finally {
      queueRunLock.endRunStart(); controls();
    }
    state.stopRequested = false; state.pauseRequested = false; state.paused = false; state.retryResumeAt = null; state.terminal = state.prepared.queue.filter((item) => item.status === "SUCCESS").length;
    showScreen("runScreen");
    state.runId = state.runId || window.DacResumeCore.createRunId(state.workbook.fileName); state.attemptSerial = 0; state.auditEvents = []; state.auditPersistedPayload = ""; if (!state.resumeMode) { state.auditFile = ""; state.resultFile = ""; state.verifiedImageFiles = []; state.checkpointVersion = 0; state.checkpointFilename = ""; state.checkpointCreatedAt = ""; } state.artifactErrors = []; renderCheckpointMeta();
    if (mode !== "recreate") els.logList.textContent = "";
    startRuntimeTicker();
    const target = await activeTab().catch(() => null);
    audit(state.resumeMode ? "RUN_CONTINUED" : "RUN_START", null, { target_url: target?.url || null }); log(state.resumeMode ? "Continued run started; completed jobs remain protected." : "Run started; visible log is scoped to this run.");
    setStatus("RUNNING"); renderQueue(); controls();
    const settings = state.prepared.settings; let halted = false;
    try {
      snapshotOutputSettings();
      for (let runIndex = 0; runIndex < runQueue.length; runIndex += 1) {
        const item = runQueue[runIndex];
        if (state.stopRequested) break;
        await waitWhilePaused();
        if (state.stopRequested) break;
        let completed = false;
        while (!completed && !state.stopRequested) {
          const gate = await gateNextJob(item);
          if (!gate.ok) {
            const outcome = await resolveJobFailure(item, gate.failureType, gate.message, settings);
            completed = outcome.completed; halted ||= outcome.halted;
            if (completed) break; else continue;
          }
          item.status = "RUNNING"; item.phase = "PRE_SUBMIT"; item.attempt_count += 1;
          item.runtime_stage = item.references.length ? "ATTACHING_REFS" : "SENDING";
          item.attempt_id = nextAttemptId();
          const rerunReset = item.deliberate_rerun ? { result_file: "", result_download_id: "", output_saved_at: "" } : {};
          const reservation = window.DacRunnerCore.submissionReservation(item);
          update(item, { ...rerunReset, ...reservation, attempt_id: item.attempt_id, attempt_count: item.attempt_count, retry_count: item.retry_count, failure_type: "", last_error: "", error: "", ...(item.operator_recreate ? { recreate_attempt_id: item.attempt_id, recreate_status: "RUNNING" } : {}) });
          item.deliberate_rerun = false;
          audit(item.operator_recreate ? "RECREATE_ATTEMPT_STARTED" : "JOB_START", item, item.operator_recreate ? { message: "Starting one operator-approved deliberate recreate attempt." } : {}); setCurrent(item, item.runtime_stage, item.references.length ? `Preparing ${item.references.length} reference image(s).` : "Preparing prompt submission."); renderQueue(); nextTask(nextEligible(item.job.id), "Waiting for current job to finish."); progress(`Running ${item.job.id}…`);
          audit("PROMPT_SUBMISSION_RESERVED", item, { message: "Submission risk marker persisted before the content receiver may send the prompt." });
          try {
            await flushRunCheckpoint(effectiveOutput.result, `Pre-send reservation for ${item.job.id}`);
          } catch (error) {
            const reason = `Pre-send checkpoint failed; prompt was not sent: ${messageOf(error)}`;
            artifactPersistenceFailed = true;
            state.artifactErrors.push(reason);
            markInterrupted(item, "PERSISTENCE_VERIFICATION_FAILED", reason);
            completed = true; halted = true; break;
          }
          let response;
          try { response = await send({ type: "DAC_RUN_IMAGE_JOB", job_id: item.job.id, attempt_id: item.attempt_id, prompt: item.job.prompt, timeoutMs: item.settings.timeout_sec * 1000, referenceImages: item.references }); }
          catch (error) { response = { ok: false, error: messageOf(error), attempt: { job_id: item.job.id, attempt_id: item.attempt_id, phase: "PRE_SUBMIT", submittedAt: null } }; }
          if (!matchesAttempt(response, item)) {
            const outcome = await resolveJobFailure(item, "ATTEMPT_ID_MISMATCH", "Attempt identity mismatch from ChatGPT content receiver.", settings);
            completed = outcome.completed; halted ||= outcome.halted;
            if (completed) break; else continue;
          }
          applyAttemptTelemetry(item, response.attempt);
          if (response?.attempt?.submittedAt || response?.attempt?.phase === "SUBMITTED" || response?.attempt?.phase === "OUTPUT_DETECTED") {
            item.phase = "SUBMITTED";
            if (item.references.length) audit("ATTACHMENTS_READY", item);
            audit("PROMPT_SUBMITTED", item, { target_url: target?.url || null });
            if (item.operator_recreate) { update(item, { recreate_status: "SUBMITTED", recreate_attempt_id: item.attempt_id }); audit("RECREATE_PROMPT_SUBMITTED", item, { message: "Operator-approved recreate prompt submitted." }); }
          }
          if (response?.ok && response.result?.image_url) {
            const outcome = await finishDetectedOutput(item, response.result, effectiveOutput, settings);
            completed = outcome.completed; halted ||= outcome.halted;
            continue;
          }
          if (state.stopRequested) {
            update(item, { status: "STOPPED", attempt_phase: item.phase, attempt_count: item.attempt_count, retry_count: item.retry_count, failure_type: "USER_STOP", last_error: response?.error || "Stopped by user.", error: response?.error || "Stopped by user.", completed_at: new Date().toISOString(), ...(item.operator_recreate ? { recreate_status: "FAILED" } : {}) });
            audit("FAILURE", item, { message: response?.error || "Stopped by user." }); if (item.operator_recreate) audit("RECREATE_ATTEMPT_FAILED", item, { message: response?.error || "Stopped by user." }); completed = true; break;
          }
          if (window.DacRunnerCore.needsReconciliation(item.phase)) {
            const outcome = await reconcileSubmittedAttempt(item, effectiveOutput, response?.error || "No attributable generated image was found.", settings);
            completed = outcome.completed; halted ||= outcome.halted;
            continue;
          }
          const failureType = window.DacRunnerCore.classifyFailure(response?.error || "No attributable generated image was found.", item.phase);
          const outcome = await resolveJobFailure(item, failureType, response?.error || failureType, settings);
          completed = outcome.completed; halted ||= outcome.halted;
        }
        state.terminal += 1; renderQueue();
        if (window.DacRunnerCore.shouldCheckpoint(runIndex + 1, settings.checkpoint_interval_jobs)) {
          try { await flushRunCheckpoint(effectiveOutput.result, `Completion interval reached after ${item.job.id}`); }
          catch (error) {
            artifactPersistenceFailed = true;
            state.artifactErrors.push(`Mid-run checkpoint failed after ${item.job.id}: ${messageOf(error)}`);
            halted = true;
          }
        }
        if (halted) break;
        await waitWhilePaused();
        if (state.stopRequested) break;
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
      try { state.auditFile = await saveAuditLog(effectiveOutput.result, { appendExisting: Boolean(state.auditFile) }); snapshotOutputSettings(null, state.auditFile); if (state.auditFile) log(`Audit log verified: ${state.auditFile}.`, "done"); }
      catch (error) { artifactPersistenceFailed = true; state.artifactErrors.push(`Audit JSONL persistence verification failed: ${messageOf(error)}`); log(`Audit log failed: ${messageOf(error)}`, "error"); }
      try { state.resultFile = await saveLedger(effectiveOutput.result); }
      catch (error) { artifactPersistenceFailed = true; state.artifactErrors.push(`Result XLSX persistence verification failed: ${messageOf(error)}`); log(`Result XLSX failed: ${messageOf(error)}`, "error"); }
      if (artifactPersistenceFailed) {
        setStatus("ERROR", "OUTPUT PERSISTENCE FAILED");
        progress("Output persistence verification failed; no unverified artifact is reported as saved.");
        audit("ARTIFACT_PERSISTENCE_FAILED", null, { message: state.artifactErrors.join(" | ") });
      }
      completedNaturally = !state.stopRequested && !halted;
      if (state.resumeMode && !artifactPersistenceFailed) {
        state.resumePlan = window.DacResumeCore.plan(state.workbook);
        renderResumePlan();
      }
      if (mode === "selected") state.runSelection.clear();
      state.running = false; state.stopRequested = false; renderQueue(); renderOutputScreen(); controls();
      stopRuntimeTicker();
      if (completedNaturally) {
        showScreen("outputScreen");
      }
    }
    return { ok: !artifactPersistenceFailed, started: true, completed: completedNaturally && !artifactPersistenceFailed, reason: artifactPersistenceFailed ? state.artifactErrors.join(" | ") : "" };
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

  // Pause never interrupts an in-flight attempt -- exact-once submission
  // means a job that has already been sent cannot be safely suspended mid
  // generation. It only holds the queue at the one boundary that is already
  // safe: after the current job reaches a terminal state and before the next
  // one is gated/submitted. This is why it is a distinct control from Stop,
  // not a rename of it: Stop abandons the run (no auto-resume, the operator
  // must press Run again); Pause holds the same in-memory run in place so
  // Resume continues it with no re-checkpoint, no re-gate, nothing lost.
  function togglePause() {
    state.pauseRequested = !state.pauseRequested;
    if (state.pauseRequested) {
      progress("Sẽ tạm dừng ngay sau khi job hiện tại hoàn tất — job đang chạy sẽ không bị huỷ giữa chừng.");
      log("Pause requested; the current job finishes first.", "info");
    } else {
      progress(state.paused ? "Đã tiếp tục — đang chuyển sang job kế tiếp." : "Đã huỷ yêu cầu tạm dừng.");
      log("Pause cancelled or resumed by operator.", "info");
    }
    controls();
  }

  async function waitWhilePaused() {
    if (!state.pauseRequested || state.stopRequested) return;
    state.paused = true;
    setStatus("IDLE", "PAUSED");
    progress("Đã tạm dừng sau khi job vừa rồi hoàn tất. Bấm \"Tiếp tục\" để chạy job kế tiếp.");
    log("Run paused between jobs.", "info");
    audit("RUN_PAUSED", null, {});
    renderQueue(); controls();
    while (state.pauseRequested && !state.stopRequested) await sleep(250);
    state.paused = false;
    if (!state.stopRequested) {
      audit("RUN_RESUMED", null, {});
      setStatus("RUNNING");
      progress("Đã tiếp tục — đang chuyển sang job kế tiếp.");
      log("Run resumed by operator.", "done");
    }
    renderQueue(); controls();
  }

  function showScreen(id) {
    if (state.running && id === "outputScreen") return;
    document.querySelectorAll(".workflow-screen").forEach((screen) => screen.classList.toggle("active", screen.id === id));
    document.querySelectorAll(".workflow-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.screen === id));
    if (id === "runScreen") requestAnimationFrame(() => applyRunSplitRatio(runSplitRatio));
    if (id === "bridgeScreen") refreshBridgeScreen().catch(() => renderBridgeActivityFeed());
  }

  els.workbookInput.addEventListener("change", openWorkbook);
  els.quickPromptCheckBtn?.addEventListener("click", () => checkQuickPrompt());
  els.resumeWorkbookInput?.addEventListener("change", openExistingRun);
  els.continueExistingRunBtn?.addEventListener("click", () => els.resumeWorkbookInput?.click());
  els.referencesInput.addEventListener("change", () => loadFiles().catch((error) => log(error.message, "error")));
  els.outputDestinationMode.addEventListener("change", setOutputDestinationMode);
  els.imageOutputFolderInput.addEventListener("change", setImageDownloadsFolder);
  els.destinationFolderBtn.addEventListener("click", () => openFolderPickDialog("image"));
  els.separateResultDestinationInput.addEventListener("change", setSeparateResultDestination);
  els.resultLocationMode.addEventListener("change", setResultLocation);
  els.resultDownloadsFolderInput.addEventListener("change", setResultDownloadsFolder);
  els.resultFilenameInput.addEventListener("change", setResultFilename);
  for (const element of [els.imagePatternInput, els.auditFilenameInput, els.collisionPolicyInput, els.saveImagesInput, els.saveResultXlsxInput, els.saveAuditJsonlInput]) element.addEventListener("change", setArtifactNaming);
  for (const element of [els.timeoutSecInput, els.maxRetriesInput, els.delayMinSecInput, els.delayMaxSecInput, els.safetyCooldownInput, els.maxInputImagesInput, els.continueOnErrorInput, els.rerunDoneInput]) element.addEventListener("change", () => updateRuntimeOverrides().catch((error) => log(error.message, "error")));
  els.chooseResultFolderBtn.addEventListener("click", () => openFolderPickDialog("result"));
  els.checkpointCollisionCancelBtn?.addEventListener("click", closeCheckpointCollisionDialog);
  els.checkpointCollisionConfirmBtn?.addEventListener("click", () => confirmCheckpointCollision());
  els.folderPickCopyBtn?.addEventListener("click", () => copyFolderPickPath());
  els.folderPickCancelBtn?.addEventListener("click", closeFolderPickDialog);
  els.folderPickOpenBtn?.addEventListener("click", confirmFolderPick);
  els.bridgeAttentionRestoreBtn?.addEventListener("click", () => {
    state.bridgeAttention.forEach((item) => { item.dismissed = false; });
    renderBridgeAttention();
  });
  els.copyFolderHintBtn?.addEventListener("click", () => copyFolderHint().catch((error) => { els.outputPermissionText.textContent = error.message; }));
  const ZOOM_LEVELS = [0.8, 0.9, 1.0];
  const ZOOM_EPSILON = 0.015;
  const UI_ZOOM_LEVELS = [1, 1.1, 1.2];
  const UI_ZOOM_STORAGE_KEY = "dac_ui_zoom";
  const RUN_SPLIT_STORAGE_KEY = "dac_run_split_ratio";
  let runSplitRatio = 0.5;

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

  function applyUiZoom(level) {
    const selected = window.DacSidepanelUiSemantics.normalizeUiZoom(level);
    document.documentElement.style.setProperty("--dac-ui-zoom", String(selected));
    document.body.dataset.uiZoom = String(selected);
    document.querySelectorAll(".ui-zoom-btn").forEach((button) => {
      button.classList.toggle("active", Number(button.dataset.uiZoom) === selected);
    });
    return selected;
  }

  async function restoreUiZoom() {
    let stored = 1;
    try {
      const values = await chrome.storage.local.get(UI_ZOOM_STORAGE_KEY);
      stored = values?.[UI_ZOOM_STORAGE_KEY] ?? 1;
    } catch (_) { /* The default remains usable if local storage is unavailable. */ }
    return applyUiZoom(stored);
  }

  function setUiZoom(level) {
    const selected = applyUiZoom(level);
    chrome.storage?.local?.set({ [UI_ZOOM_STORAGE_KEY]: selected }).catch?.(() => {});
  }

  function runSplitBounds() {
    const width = els.runDashboardSplit?.getBoundingClientRect().width || 0;
    const usable = Math.max(0, width - 14);
    if (!usable) return null;
    const minimumLeft = Math.min(220, usable / 2);
    const maximumLeft = Math.max(minimumLeft, usable - Math.min(260, usable / 2));
    return { usable, minimumRatio: minimumLeft / usable, maximumRatio: maximumLeft / usable };
  }

  function applyRunSplitRatio(value, persist = false) {
    const bounds = runSplitBounds();
    const requested = Number(value);
    runSplitRatio = Number.isFinite(requested) ? Math.max(0.1, Math.min(0.9, requested)) : 0.5;
    if (!bounds || !els.runDashboardSplit || !els.runWidthSplitter) return runSplitRatio;
    runSplitRatio = Math.max(bounds.minimumRatio, Math.min(bounds.maximumRatio, runSplitRatio));
    els.runDashboardSplit.style.setProperty("--run-left-pane-width", `${Math.round(bounds.usable * runSplitRatio)}px`);
    els.runWidthSplitter.setAttribute("aria-valuemin", String(Math.round(bounds.minimumRatio * 100)));
    els.runWidthSplitter.setAttribute("aria-valuemax", String(Math.round(bounds.maximumRatio * 100)));
    els.runWidthSplitter.setAttribute("aria-valuenow", String(Math.round(runSplitRatio * 100)));
    if (persist) chrome.storage?.local?.set({ [RUN_SPLIT_STORAGE_KEY]: runSplitRatio }).catch?.(() => {});
    return runSplitRatio;
  }

  async function initRunWidthSplitter() {
    if (!els.runDashboardSplit || !els.runWidthSplitter) return;
    try {
      const stored = await chrome.storage.local.get(RUN_SPLIT_STORAGE_KEY);
      runSplitRatio = Number(stored?.[RUN_SPLIT_STORAGE_KEY]) || 0.5;
    } catch (_) { runSplitRatio = 0.5; }
    applyRunSplitRatio(runSplitRatio);
    const resize = (clientX, persist = false) => {
      const rect = els.runDashboardSplit.getBoundingClientRect();
      if (!rect.width) return;
      applyRunSplitRatio((clientX - rect.left) / Math.max(1, rect.width - 14), persist);
    };
    els.runWidthSplitter.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      els.runWidthSplitter.focus({ preventScroll: true });
      els.runWidthSplitter.classList.add("dragging");
      els.runWidthSplitter.setPointerCapture?.(event.pointerId);
      const move = (moveEvent) => resize(moveEvent.clientX);
      const finish = (upEvent) => {
        resize(upEvent.clientX, true);
        els.runWidthSplitter.classList.remove("dragging");
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", finish);
        window.removeEventListener("pointercancel", finish);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", finish);
      window.addEventListener("pointercancel", finish);
    });
    els.runWidthSplitter.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home"].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === "Home" ? 0.5 : runSplitRatio + (event.key === "ArrowLeft" ? -0.03 : 0.03);
      applyRunSplitRatio(next, true);
    });
    els.runWidthSplitter.addEventListener("dblclick", () => applyRunSplitRatio(0.5, true));
    if (typeof ResizeObserver === "function") new ResizeObserver(() => applyRunSplitRatio(runSplitRatio)).observe(els.runDashboardSplit);
  }

  document.querySelectorAll(".zoom-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const level = Number(btn.dataset.zoom);
      if (level) setChatZoom(level).catch(() => {});
    });
  });
  document.querySelectorAll(".ui-zoom-btn").forEach((btn) => {
    btn.addEventListener("click", () => setUiZoom(Number(btn.dataset.uiZoom)));
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
  els.helpBtn.addEventListener("click", () => { renderHelpGlossary(); els.helpDrawer.hidden = false; });
  els.closeHelpBtn.addEventListener("click", () => { els.helpDrawer.hidden = true; });
  els.haltInstructionsBtn?.addEventListener("click", openHaltInstructions);
  els.haltInstructionsCloseBtn?.addEventListener("click", closeHaltInstructions);
  els.haltInstructionsDialog?.addEventListener("cancel", (event) => { event.preventDefault(); closeHaltInstructions(); });
  els.copyReviewPacketBtn.addEventListener("click", () => copyReviewPacket().catch((error) => {
    els.copyReviewPacketStatus.textContent = error.message;
    log(error.message, "error");
  }));
  els.recreateCancelBtn?.addEventListener("click", cancelRecreate);
  els.recreateConfirmBtn?.addEventListener("click", () => confirmRecreate().catch(() => controls()));
  els.recreateConfirmDialog?.addEventListener("cancel", (event) => { event.preventDefault(); cancelRecreate(); });
  els.auditGapCancelBtn?.addEventListener("click", closeAuditGapDialog);
  els.auditGapConfirmBtn?.addEventListener("click", () => confirmAuditGap().catch(() => controls()));
  els.auditGapConfirmDialog?.addEventListener("cancel", (event) => { event.preventDefault(); closeAuditGapDialog(); });
  els.rerunCancelBtn?.addEventListener("click", cancelRerun);
  els.rerunConfirmBtn?.addEventListener("click", () => confirmRerun().catch(() => controls()));
  els.rerunConfirmDialog?.addEventListener("cancel", (event) => { event.preventDefault(); cancelRerun(); });
  els.queueRemoveCancelBtn?.addEventListener("click", closeQueueRemoveDialog);
  els.queueRemoveConfirmBtn?.addEventListener("click", () => confirmQueueRemoval().catch(() => controls()));
  els.queueRemoveDialog?.addEventListener("cancel", (event) => { event.preventDefault(); closeQueueRemoveDialog(); });
  els.bridgeProposalFixtureBtn?.addEventListener("click", () => stageBridgeFixture().catch((error) => log(messageOf(error), "error")));
  els.bridgeProposalRejectBtn?.addEventListener("click", () => rejectBridgeProposal().catch((error) => log(messageOf(error), "error")));
  els.bridgeProposalApproveBtn?.addEventListener("click", () => approveBridgeProposal().catch((error) => log(messageOf(error), "error")));
  els.bridgePairingBtn?.addEventListener("click", () => els.bridgePairingInput.click());
  els.bridgePairingInput?.addEventListener("change", () => {
    const file = els.bridgePairingInput.files?.[0] || null;
    pairAgentBridgeFile(file).catch((error) => log(messageOf(error), "error")).finally(() => { els.bridgePairingInput.value = ""; });
  });
  els.bridgeUnpairBtn?.addEventListener("click", () => unpairAgentBridge().catch((error) => log(messageOf(error), "error")));
  els.runBtn.addEventListener("click", () => run("all"));
  els.runFromRunTabBtn?.addEventListener("click", () => run("all"));
  els.runFailedBtn.addEventListener("click", () => run("failed"));
  els.runSelectedBtn?.addEventListener("click", () => run("selected"));
  els.selectAllQueueBtn?.addEventListener("click", selectAllQueueJobs);
  els.clearQueueSelectionBtn?.addEventListener("click", clearQueueSelection);
  els.stopBtn.addEventListener("click", stop);
  els.pauseResumeBtn?.addEventListener("click", togglePause);
  els.clearLogsBtn.addEventListener("click", () => { els.logList.textContent = ""; });
  els.viewQueueBtn.addEventListener("click", () => { state.queueExpanded = !state.queueExpanded; renderQueue(); });
  els.viewOutputsBtn.addEventListener("click", () => { state.outputsExpanded = !state.outputsExpanded; renderOutputScreen(); });
  els.loadNewWorkbookBtn.addEventListener("click", () => { showScreen("setupScreen"); els.workbookInput.click(); });
  els.openOutputFolderBtn.addEventListener("click", openOutputFolder);
  document.querySelectorAll(".workflow-tab").forEach((tab) => tab.addEventListener("click", () => showScreen(tab.dataset.screen)));
  renderOutput(); renderRuntime(); renderOutputGlossary(); renderOutputScreen(); controls(); restoreUiZoom().catch(() => applyUiZoom(1)); initRunWidthSplitter().catch(() => {}); syncZoomState().catch(() => {});
  renderBridgeTransportStatus(); renderBridgeActivityFeed();
  // Startup must also probe + render attention, or the tab badge stays hidden
  // until the operator happens to visit the BRIDGE tab — the exact "vẫn bị ẩn"
  // failure Đức reported live on 2026-08-24.
  renderBridgeAttention();
  probeBridgePersistence().catch(() => {});
  refreshBridgeTransportStatus();
  chrome.storage?.onChanged?.addListener((changes, areaName) => {
    if (areaName === "local" && changes[window.DacBridgePairingCore.STATUS_STORAGE_KEY]?.newValue) {
      renderBridgeTransportStatus(changes[window.DacBridgePairingCore.STATUS_STORAGE_KEY].newValue);
      refreshBridgeScreen().catch(() => {});
    }
  });
  readBridgeProposalStore().then(() => renderBridgeProposals()).catch((error) => log(`Không thể đọc hộp đề xuất Agent: ${messageOf(error)}`, "error"));
  connectBridgeExecutor();

  (typeof window !== "undefined" ? window : globalThis).DacChatZoom = {
    isChatGPTUrl,
    matchesZoomLevel,
    ZOOM_LEVELS,
    ZOOM_EPSILON,
    UI_ZOOM_LEVELS,
    syncZoomState,
    setChatZoom,
    applyUiZoom,
    setUiZoom
  };

  (typeof window !== "undefined" ? window : globalThis).DacVisualMapping = {
    updatePipelineStepper,
    updateProgressVisuals,
    updateHaltedBanner,
    updateOperatorTimer,
    renderProgressSegments
  };

  (typeof window !== "undefined" ? window : globalThis).DacBridgeExecutorTestHooks = Object.freeze({
    dispatch: bridgeExecutorDispatch,
    handlers: Object.freeze({
      "queue.list": bridgeQueueList,
      "run.status": bridgeRunStatus,
      "ledger.read": bridgeLedgerRead,
      "jobs.add": bridgeJobsAdd,
      "jobs.update": bridgeJobsUpdate,
      "jobs.remove": bridgeJobsRemove,
      "jobs.reorder": bridgeJobsReorder,
      "output.configure": bridgeOutputConfigure,
      "output.set_folder_hint": bridgeOutputSetFolderHint,
      "run_settings.configure": bridgeRunSettingsConfigure,
      "queue.propose": bridgeQueuePropose,
      "queue.proposal.get": bridgeProposalGet
    }),
    port_name: BRIDGE_EXECUTOR_PORT
  });
})();
