(() => {
  "use strict";

  const DEFAULTS = { timeout_sec: 180, delay_min_sec: 3, delay_max_sec: 3, safety_cooldown_sec: 0, max_retries: 2, continue_on_error: true, output_folder: "Duc Auto ChatGPT", max_input_images: 5, rerun_done: false };
  const ATTEMPT_PHASES = Object.freeze(["PRE_SUBMIT", "SUBMITTED", "OUTPUT_DETECTED", "OUTPUT_SAVED", "CHAT_READY", "SUCCESS"]);
  const POST_SUBMIT_PHASES = new Set(ATTEMPT_PHASES.slice(1));
  const FAILURE_TYPES = new Set(["TIMEOUT_PRE_SUBMIT", "TIMEOUT_AFTER_SUBMIT", "POST_SUBMIT_UNCERTAIN", "READINESS_TIMEOUT_AFTER_SAVE", "OUTPUT_AMBIGUOUS", "ATTACHMENT_FAILED", "DOWNLOAD_FAILED", "VALIDATION_FAILED", "RECEIVER_LOST", "SECURITY_HARD_STOP", "USER_STOP", "ATTEMPT_ID_MISMATCH", "INTERRUPTED", "OTHER"]);
  const PRE_SUBMIT_RETRYABLE_FAILURES = new Set(["TIMEOUT_PRE_SUBMIT", "ATTACHMENT_FAILED", "OTHER"]);
  const imageExtension = /\.(avif|gif|jpe?g|png|webp)$/i;
  const normalise = (value) => String(value || "").trim().toLowerCase();
  const basename = (value) => normalise(value).replace(/^.*[\\/]/, "").replace(imageExtension, "");
  const tokens = (value) => String(value || "").split("|").map((item) => item.trim()).filter(Boolean);

  function bool(value, fallback) {
    if (value === undefined || value === null || value === "") return fallback;
    if (/^(true|1|yes)$/i.test(String(value).trim())) return true;
    if (/^(false|0|no)$/i.test(String(value).trim())) return false;
    throw new Error(`Invalid boolean value '${value}'.`);
  }
  function whole(value, fallback, minimum, maximum, key) {
    if (value === undefined || value === null || value === "") return fallback;
    const number = Number(value);
    if (!Number.isInteger(number) || number < minimum || number > maximum) throw new Error(`Invalid ${key}; expected ${minimum}-${maximum}.`);
    return number;
  }
  function config(raw = {}) {
    const timeout = whole(raw.timeout_sec, DEFAULTS.timeout_sec, 15, 900, "timeout_sec");
    const legacyDelay = raw.delay_sec === undefined || raw.delay_sec === "" ? null : whole(raw.delay_sec, null, 1, 120, "delay_sec");
    const min = whole(raw.delay_min_sec, legacyDelay ?? DEFAULTS.delay_min_sec, 1, 120, "delay_min_sec");
    const max = whole(raw.delay_max_sec, legacyDelay ?? DEFAULTS.delay_max_sec, 1, 120, "delay_max_sec");
    if (min > max) throw new Error("delay_min_sec must not exceed delay_max_sec.");
    const folder = String(raw.output_folder || DEFAULTS.output_folder).trim();
    if (!folder || /(^|[\\/])\.\.([\\/]|$)/.test(folder)) throw new Error("output_folder must be a safe relative folder name.");
    return {
      timeout_sec: timeout, delay_min_sec: min, delay_max_sec: max,
      safety_cooldown_sec: whole(raw.safety_cooldown_sec, DEFAULTS.safety_cooldown_sec, 0, 120, "safety_cooldown_sec"),
      max_retries: whole(raw.max_retries, DEFAULTS.max_retries, 0, 5, "max_retries"),
      continue_on_error: bool(raw.continue_on_error, true), output_folder: folder.replace(/[\\/]+/g, "/"),
      max_input_images: whole(raw.max_input_images, DEFAULTS.max_input_images, 0, 10, "max_input_images"),
      rerun_done: bool(raw.rerun_done, false)
    };
  }
  function runtimeConfig(workbookConfig, overrides = {}) { return config({ ...(workbookConfig || {}), ...(overrides || {}) }); }
  function referenceTokens(job) { return tokens(job.reference_images || job.reference_image); }
  function aliases(files) {
    const seen = new Set();
    for (const file of files || []) {
      const alias = normalise(file.alias);
      if (!alias) continue;
      if (seen.has(alias)) throw new Error(`DUPLICATE_ALIAS: '${file.alias}'.`);
      seen.add(alias);
    }
  }
  function resolveReferences(job, selectedFiles, maxInputImages) {
    const requested = referenceTokens(job);
    if (requested.length > maxInputImages) throw new Error(`MAX_INPUT_IMAGES: ${job.id} requests ${requested.length}, limit is ${maxInputImages}.`);
    const files = Array.from(selectedFiles || []); aliases(files);
    const resolved = requested.map((token) => {
      const key = normalise(token);
      const aliasMatches = files.filter((file) => normalise(file.alias) === key && key);
      const exact = imageExtension.test(key) ? files.filter((file) => normalise(file.fileName || file.name) === key) : [];
      const base = files.filter((file) => basename(file.fileName || file.name) === basename(token));
      const matches = aliasMatches.length ? aliasMatches : exact.length ? exact : base;
      if (!matches.length) throw new Error(`MISSING_REFERENCE: ${job.id} requires '${token}'.`);
      if (matches.length > 1) throw new Error(`AMBIGUOUS_REFERENCE: ${job.id} requires '${token}'.`);
      return matches[0];
    });
    if (new Set(resolved.map((file) => normalise(file.fileName || file.name))).size !== resolved.length) throw new Error(`DUPLICATE_REFERENCE: ${job.id} requests the same file more than once.`);
    return resolved;
  }
  function perJobSettings(job, settings) {
    const overrides = {};
    for (const key of ["timeout_sec", "max_retries", "safety_cooldown_sec", "output_folder"]) if (job[key] !== undefined && job[key] !== "") overrides[key] = job[key];
    return config({ ...settings, ...overrides });
  }
  function classifyFailure(error, phase = "PRE_SUBMIT") {
    const text = String(error?.message || error || "");
    if (/HARD_STOP|captcha|unusual activity|security\/interstitial/i.test(text)) return "SECURITY_HARD_STOP";
    if (/stopped by user|automation stopped/i.test(text)) return "USER_STOP";
    if (/ambiguous|INPUT_IMAGE_FALSE_POSITIVE/i.test(text)) return "OUTPUT_AMBIGUOUS";
    if (/timed out|timeout/i.test(text)) {
      if (phase === "OUTPUT_SAVED" || phase === "CHAT_READY") return "READINESS_TIMEOUT_AFTER_SAVE";
      return POST_SUBMIT_PHASES.has(phase) ? "TIMEOUT_AFTER_SUBMIT" : "TIMEOUT_PRE_SUBMIT";
    }
    if (/no attributable|NO_NEW_IMAGE|no output|could not isolate/i.test(text)) return POST_SUBMIT_PHASES.has(phase) ? "POST_SUBMIT_UNCERTAIN" : "OTHER";
    if (/reference|attachment|upload/i.test(text)) return "ATTACHMENT_FAILED";
    if (/download|fetch|write|output was not accepted/i.test(text)) return "DOWNLOAD_FAILED";
    if (/validation|missing_reference|ambiguous_reference|duplicate_alias|invalid |output_location/i.test(text)) return "VALIDATION_FAILED";
    if (/receiver|composer|chatgpt tab|session integrity/i.test(text)) return "RECEIVER_LOST";
    return POST_SUBMIT_PHASES.has(phase) ? "POST_SUBMIT_UNCERTAIN" : "OTHER";
  }
  function canRetry(item, failureType) {
    return item?.phase === "PRE_SUBMIT" && PRE_SUBMIT_RETRYABLE_FAILURES.has(failureType) && item.retry_count < item.settings.max_retries;
  }
  function needsReconciliation(phase) { return POST_SUBMIT_PHASES.has(phase) && phase !== "SUCCESS"; }
  function interruptedStatus(phase, failureType) {
    return needsReconciliation(phase) && failureType !== "SECURITY_HARD_STOP" && failureType !== "USER_STOP" ? "INTERRUPTED" : "FAILED";
  }
  function canStartNextJob(signal, queue = []) {
    return readinessState(signal) === "CHAT_READY" && !queue.some((item) => ["RUNNING", "RECONCILING"].includes(item.status));
  }
  function auditOrderValid(events = []) {
    const phaseIndex = new Map(ATTEMPT_PHASES.map((phase, index) => [phase, index]));
    const seen = new Map();
    for (const event of events) {
      if (!event?.job_id || !event.phase || !phaseIndex.has(event.phase)) continue;
      const key = `${event.job_id}:${event.attempt}`;
      const current = phaseIndex.get(event.phase);
      const previous = seen.get(key);
      if (previous !== undefined && current < previous) return false;
      seen.set(key, current);
    }
    return true;
  }
  function retryCooldown(settings, retryCount) { return Math.min(30, Math.max(settings.safety_cooldown_sec, 1) * Math.max(1, retryCount)); }
  function resultWorkbookName(name) { return `${String(name || "workbook.xlsx").replace(/\.xlsx$/i, "")}-result.xlsx`; }
  function delaySeconds(settings, random = Math.random) { return settings.delay_min_sec + Math.floor(random() * (settings.delay_max_sec - settings.delay_min_sec + 1)); }
  function countdownValues(seconds) { return Array.from({ length: Math.max(0, Number(seconds) || 0) }, (_unused, index) => seconds - index); }
  function planSummary(queue, settings) {
    const count = (predicate) => queue.filter(predicate).length;
    return { total_jobs: queue.length, eligible_jobs: count((item) => !item.skipped), skipped_done: count((item) => item.skipped), success_jobs: count((item) => item.status === "SUCCESS" || item.status === "DONE"), running_jobs: count((item) => item.status === "RUNNING"), reconciling_jobs: count((item) => item.status === "RECONCILING"), interrupted_jobs: count((item) => item.status === "INTERRUPTED"), failed_jobs: count((item) => item.status === "FAILED"), pending_jobs: count((item) => item.status === "PENDING"), total_max_attempts: queue.filter((item) => !item.skipped).reduce((total, item) => total + 1 + item.settings.max_retries, 0), retry_allowance: settings.max_retries, references_per_job: queue.map((item) => ({ id: item.job.id, references: item.references.map((file) => file.alias || file.fileName || file.name) })) };
  }
  function prepare(workbook, selectedFiles, overrides = {}) {
    const settings = runtimeConfig(workbook.config, overrides);
    aliases(selectedFiles || []);
    const queue = workbook.jobs.map((job, index) => {
      const itemSettings = perJobSettings(job, settings);
      const references = resolveReferences(job, selectedFiles, itemSettings.max_input_images);
      const persistedStatus = normalise(job.status);
      const persistedPhase = String(job.attempt_phase || "").trim().toUpperCase();
      const terminalSuccess = persistedStatus === "done" || persistedStatus === "success";
      const savedOutput = String(job.result_file || "").trim();
      const hasOutputCheckpoint = Boolean(savedOutput) || persistedPhase === "OUTPUT_SAVED";
      // A deliberate rerun is supported only for completed successful jobs.  It
      // intentionally starts a fresh PRE_SUBMIT execution; an interrupted saved
      // output is never treated as eligible merely because rerun_done is true.
      const deliberateRerun = terminalSuccess && settings.rerun_done;
      const status = deliberateRerun ? "PENDING" : terminalSuccess ? "SUCCESS" : persistedStatus === "failed" ? "FAILED" : persistedStatus === "interrupted" ? "INTERRUPTED" : persistedStatus === "stopped" ? "STOPPED" : hasOutputCheckpoint ? "INTERRUPTED" : "PENDING";
      const phase = deliberateRerun ? "PRE_SUBMIT" : ATTEMPT_PHASES.includes(persistedPhase) ? persistedPhase : terminalSuccess ? "SUCCESS" : hasOutputCheckpoint ? "OUTPUT_SAVED" : "PRE_SUBMIT";
      const protectedCheckpoint = hasOutputCheckpoint && !deliberateRerun;
      const operatorRecreate = bool(job.recreate_operator_approved, false) && !terminalSuccess;
      return { job, number: index + 1, references, settings: itemSettings, status, skipped: terminalSuccess && !deliberateRerun || protectedCheckpoint, protected_checkpoint: protectedCheckpoint, deliberate_rerun: deliberateRerun, operator_recreate: operatorRecreate, phase, attempt_id: String(job.attempt_id || ""), submitted_at: String(job.submitted_at || ""), detection_diagnostics: String(job.detection_diagnostics || ""), attempt_count: Number(job.attempt_count) || 0, retry_count: Number(job.retry_count) || 0, failure_type: job.failure_type || "", last_error: job.last_error || job.error || "", result_file: savedOutput, result_download_id: job.result_download_id || "" };
    });
    return { settings, queue, plan: planSummary(queue, settings) };
  }
  function selectQueue(queue, mode, selectedId) {
    if (mode === "all") return queue.filter((item) => !item.skipped);
    if (mode === "pending") return queue.filter((item) => item.status === "PENDING" && !item.protected_checkpoint);
    if (mode === "failed") return queue.filter((item) => item.status === "FAILED" && !item.protected_checkpoint);
    if (mode === "recreate") return queue.filter((item) => item.operator_recreate && item.status === "PENDING" && item.phase === "PRE_SUBMIT" && !item.protected_checkpoint);
    if (mode === "selected") return queue.filter((item) => item.job.id === selectedId && item.phase === "PRE_SUBMIT" && !item.protected_checkpoint && !["SUCCESS", "DONE", "INTERRUPTED", "STOPPED"].includes(item.status));
    return [];
  }
  function readinessState(signal) {
    if (signal?.securityBlocker) return "HARD_STOP";
    if (signal?.generating) return "GENERATING";
    if (!signal?.outputVerified) return "OUTPUT_READY";
    if (!signal?.composerFound) return "OUTPUT_READY";
    return "CHAT_READY";
  }
  const api = { DEFAULTS, ATTEMPT_PHASES, FAILURE_TYPES, PRE_SUBMIT_RETRYABLE_FAILURES, basename, referenceTokens, config, runtimeConfig, aliases, resolveReferences, perJobSettings, classifyFailure, canRetry, needsReconciliation, interruptedStatus, canStartNextJob, auditOrderValid, retryCooldown, resultWorkbookName, delaySeconds, countdownValues, planSummary, prepare, selectQueue, readinessState };
  (typeof window !== "undefined" ? window : globalThis).DacRunnerCore = api;
})();
