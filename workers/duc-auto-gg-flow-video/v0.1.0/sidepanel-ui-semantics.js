(() => {
  "use strict";

  function fallbackDuration(seconds) {
    const safe = Math.max(0, Number(seconds) || 0);
    return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(Math.floor(safe % 60)).padStart(2, "0")}`;
  }

  function delayDescription(settings) {
    const min = Number(settings?.delay_min_sec);
    const max = Number(settings?.delay_max_sec);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return "Not scheduled";
    return min === max ? `Configured delay: fixed ${min}s` : `Configured delay: ${min}–${max}s`;
  }

  function runtimeInfo(runtime, now = Date.now(), formatDuration = fallbackDuration) {
    const item = runtime.currentItem || null;
    const settings = item?.settings || runtime.settings || null;
    const stage = item ? (runtime.currentStage || item.runtime_stage || "—") : "—";
    const jobElapsed = runtime.currentStartedAt ? Math.floor((now - runtime.currentStartedAt) / 1000) : null;
    const stageElapsed = runtime.stageStartedAt ? Math.floor((now - runtime.stageStartedAt) / 1000) : 0;
    const stageBudget = runtime.stageBudgetSec || item?.settings?.timeout_sec || 0;
    const timeoutRemaining = item && stageBudget ? Math.max(0, stageBudget - stageElapsed) : null;
    const retryRemaining = runtime.retryResumeAt ? Math.max(0, Math.ceil((runtime.retryResumeAt - now) / 1000)) : null;
    const retryCount = item?.retry_count || 0;
    const maxRetries = item?.settings?.max_retries;
    const configuredDelay = delayDescription(settings);
    const selectedDelay = runtime.selectedInterJobDelay;
    const inDelay = runtime.interJobCountdown != null && runtime.interJobCountdown > 0;
    const waitingForReadiness = stage === "WAITING_READY" || stage === "FINALIZING / WAITING_IDLE" || item?.runtime_stage === "WAITING_READY";

    let retryState = "Not scheduled";
    if (item && retryRemaining != null) retryState = `Retry ${retryCount}/${maxRetries} · next retry in ${formatDuration(retryRemaining)}`;
    else if (item && item.phase !== "PRE_SUBMIT") retryState = "Auto-retry closed after submission";
    else if (item && Number.isFinite(maxRetries)) retryState = `Retry ${retryCount}/${maxRetries} · no retry scheduled`;

    let interJobDelay = configuredDelay;
    if (inDelay && selectedDelay != null) interJobDelay = `${configuredDelay} · Selected this transition: ${selectedDelay}s`;

    let nextTransition = "Waiting…";
    if (inDelay) nextTransition = `Next readiness check in ${formatDuration(runtime.interJobCountdown)}`;
    else if (waitingForReadiness) nextTransition = "Awaiting Gemini readiness confirmation";
    else if (retryRemaining != null) nextTransition = "Retry is pending; readiness will be checked before submission";
    else if (item && runtime.running) nextTransition = "Waiting…";

    let timerText = "—";
    let timerMode = "idle";
    if (inDelay) {
      timerText = `${nextTransition} · ${interJobDelay}`;
      timerMode = "cooldown";
    } else if (waitingForReadiness) {
      timerText = "Awaiting Gemini readiness confirmation";
      timerMode = "waiting";
    } else if (retryRemaining != null) {
      timerText = `Retry in ${formatDuration(retryRemaining)}`;
      timerMode = "cooldown";
    } else if (item && runtime.running) {
      timerText = timeoutRemaining == null ? "Operation timeout not scheduled" : `Operation timeout remaining ${formatDuration(timeoutRemaining)}`;
      timerMode = "active";
    } else if (item && ["FAILED", "INTERRUPTED", "STOPPED"].includes(item.status)) {
      timerText = `Halted · ${item.status}`;
      timerMode = "halted";
    }

    return {
      jobElapsed: jobElapsed == null ? "—" : formatDuration(jobElapsed),
      currentOperation: stage,
      operationTimeoutRemaining: timeoutRemaining == null ? "Not scheduled" : formatDuration(timeoutRemaining),
      retryState,
      interJobDelay,
      nextTransition,
      timerText,
      timerMode,
      timerHidden: !runtime.running && !item
    };
  }

  function outputFolderAction(location) {
    if (!location) return {
      enabled: false,
      label: "📁 Output location not configured",
      note: "Configure an output destination before opening a folder."
    };
    if (location.kind === "downloads") return {
      enabled: true,
      label: "📁 Open Chrome Downloads",
      note: "Chrome opens its default Downloads folder. It cannot open the configured Downloads subfolder directly."
    };
    if (location.kind === "directory") return {
      enabled: false,
      label: "📁 Authorized folder — open manually",
      note: "Chrome can write to this authorized folder but cannot open its native folder window from a File System Access handle."
    };
    return {
      enabled: false,
      label: "📁 Output location unavailable",
      note: "The configured output destination is not available."
    };
  }

  function queueElapsed(item, runtime = {}, now = Date.now(), formatDuration = fallbackDuration) {
    const toMillis = (value) => {
      if (typeof value === "number" && Number.isFinite(value)) return value;
      const parsed = Date.parse(value || "");
      return Number.isFinite(parsed) ? parsed : null;
    };
    const isCurrent = runtime.currentItem === item;
    const currentStart = isCurrent ? (toMillis(item?.submitted_at) || toMillis(runtime.currentStartedAt)) : null;
    if (isCurrent && currentStart != null) return formatDuration(Math.max(0, Math.floor((now - currentStart) / 1000)));
    const submittedAt = toMillis(item?.submitted_at);
    const completedAt = toMillis(item?.completed_at);
    if (submittedAt != null && completedAt != null && completedAt >= submittedAt) return formatDuration(Math.floor((completedAt - submittedAt) / 1000));
    return "—";
  }

  function normalizeUiZoom(value) {
    const numeric = Number(value);
    return [1, 1.1, 1.2].includes(numeric) ? numeric : 1;
  }

  function destinationVisibility(mode) {
    return { showDownloads: mode === "downloads", showProfile: mode === "profile" };
  }

  const api = { delayDescription, runtimeInfo, outputFolderAction, queueElapsed, normalizeUiZoom, destinationVisibility };
  (typeof window !== "undefined" ? window : globalThis).DacSidepanelUiSemantics = api;
})();
