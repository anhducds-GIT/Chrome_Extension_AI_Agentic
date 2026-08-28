(() => {
  "use strict";

  const DEFAULTS = { timeout_sec: 180, delay_min_sec: 12, delay_max_sec: 24, safety_cooldown_sec: "6-9", max_retries: 2, continue_on_error: true, output_folder: "Duc Auto ChatGPT", max_input_images: 5, rerun_done: false, checkpoint_interval_jobs: 1, checkpoint_retention: 2, ab_poll_action: "random", max_images_per_job: 4 };
  const ATTEMPT_PHASES = Object.freeze(["PRE_SUBMIT", "SUBMITTED", "OUTPUT_DETECTED", "OUTPUT_SAVED", "CHAT_READY", "SUCCESS"]);
  const TASK_TYPES = Object.freeze(["image_generation", "text_reasoning"]);
  const POST_SUBMIT_PHASES = new Set(ATTEMPT_PHASES.slice(1));
  const FAILURE_TYPES = new Set(["TIMEOUT_PRE_SUBMIT", "TIMEOUT_AFTER_SUBMIT", "POST_SUBMIT_UNCERTAIN", "READINESS_TIMEOUT_AFTER_SAVE", "OUTPUT_AMBIGUOUS", "ATTACHMENT_FAILED", "DOWNLOAD_FAILED", "PERSISTENCE_VERIFICATION_FAILED", "VALIDATION_FAILED", "RECEIVER_LOST", "DETECTION_BLIND", "SECURITY_HARD_STOP", "GENERATION_LIMIT_REACHED", "USER_STOP", "ATTEMPT_ID_MISMATCH", "INTERRUPTED", "OTHER"]);
  // Only these three genuinely block the whole batch: each means no further
  // job can safely run until a human resolves it (CAPTCHA/verification,
  // quota reset, or the ChatGPT tab/composer itself being reachable again).
  // Every other failure type is auto-retried, then skipped so the queue
  // keeps moving -- see resolveJobFailure() in sidepanel.js.
  // DETECTION_BLIND joined this set on 2026-08-26 after a live run sent SIX
  // prompts and burned six real image generations while reporting
  // NO_NEW_IMAGE every time. The page had no assistant message AT ALL --
  // either the message selector had rotted or the tab was not on a
  // conversation. Neither is a condition a retry can improve, and retrying
  // costs the owner quota per attempt, so it halts the batch instead.
  const HARD_STOP_FAILURE_TYPES = new Set(["SECURITY_HARD_STOP", "GENERATION_LIMIT_REACHED", "RECEIVER_LOST", "DETECTION_BLIND"]);
  const imageExtension = /\.(avif|gif|jpe?g|png|webp)$/i;
  const normalise = (value) => String(value || "").trim().toLowerCase();
  const basename = (value) => normalise(value).replace(/^.*[\\/]/, "").replace(imageExtension, "");
  const tokens = (value) => String(value || "").split("|").map((item) => item.trim()).filter(Boolean);

  function taskType(job = {}) {
    const value = String(job.task_type || "").trim().toLowerCase() || "image_generation";
    if (!TASK_TYPES.includes(value)) throw new Error(`INVALID_TASK_TYPE: ${job.id || "Job"} must use image_generation or text_reasoning.`);
    return value;
  }

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
  function wholeRange(value, fallback, minimum, maximum, key) {
    const source = value === undefined || value === null || value === "" ? fallback : value;
    const match = String(source).trim().match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/);
    if (!match) throw new Error(`Invalid ${key}; expected one integer or a range such as 6-9.`);
    const min = Number(match[1]);
    const max = Number(match[2] ?? match[1]);
    if (!Number.isInteger(min) || !Number.isInteger(max) || min < minimum || max > maximum || min > max) throw new Error(`Invalid ${key}; expected ${minimum}-${maximum} with minimum not exceeding maximum.`);
    return { min, max, value: min === max ? min : `${min}-${max}` };
  }
  function config(raw = {}) {
    const timeout = whole(raw.timeout_sec, DEFAULTS.timeout_sec, 15, 900, "timeout_sec");
    const legacyDelay = raw.delay_sec === undefined || raw.delay_sec === "" ? null : whole(raw.delay_sec, null, 1, 120, "delay_sec");
    const min = whole(raw.delay_min_sec, legacyDelay ?? DEFAULTS.delay_min_sec, 1, 120, "delay_min_sec");
    const max = whole(raw.delay_max_sec, legacyDelay ?? DEFAULTS.delay_max_sec, 1, 120, "delay_max_sec");
    if (min > max) throw new Error("delay_min_sec must not exceed delay_max_sec.");
    const cooldown = wholeRange(raw.safety_cooldown_sec, DEFAULTS.safety_cooldown_sec, 0, 120, "safety_cooldown_sec");
    const folder = String(raw.output_folder || DEFAULTS.output_folder).trim();
    if (!folder || /(^|[\\/])\.\.([\\/]|$)/.test(folder)) throw new Error("output_folder must be a safe relative folder name.");
    return {
      timeout_sec: timeout, delay_min_sec: min, delay_max_sec: max,
      safety_cooldown_sec: cooldown.value, safety_cooldown_min_sec: cooldown.min, safety_cooldown_max_sec: cooldown.max,
      max_retries: whole(raw.max_retries, DEFAULTS.max_retries, 0, 5, "max_retries"),
      continue_on_error: bool(raw.continue_on_error, true), output_folder: folder.replace(/[\\/]+/g, "/"),
      max_input_images: whole(raw.max_input_images, DEFAULTS.max_input_images, 0, 10, "max_input_images"),
      rerun_done: bool(raw.rerun_done, false),
      checkpoint_interval_jobs: whole(raw.checkpoint_interval_jobs, DEFAULTS.checkpoint_interval_jobs, 1, 1000, "checkpoint_interval_jobs"),
      // How many Result checkpoints survive on disk. Minimum 1, because the
      // newest one IS the recoverable ledger; 2 by default so a corrupt newest
      // file still leaves the operator a readable predecessor.
      checkpoint_retention: whole(raw.checkpoint_retention, DEFAULTS.checkpoint_retention, 1, 1000, "checkpoint_retention"),
      // How the runner answers ChatGPT's "Which image do you like more?"
      // poll, and how many images ONE job may legitimately produce. Both are
      // owner policy (decisions.md 2026-08-25), not detection heuristics.
      ab_poll_action: abPollAction(raw.ab_poll_action),
      max_images_per_job: whole(raw.max_images_per_job, DEFAULTS.max_images_per_job, 1, 20, "max_images_per_job")
    };
  }
  function abPollAction(value) {
    const poll = globalThis.DacAbPoll;
    if (poll?.validateAction) return poll.validateAction(value);
    const action = String(value ?? "").trim().toLowerCase();
    if (!action) return DEFAULTS.ab_poll_action;
    if (!["random", "click_1", "click_2", "skip"].includes(action)) throw new Error(`Invalid ab_poll_action '${value}'; expected one of random, click_1, click_2, skip.`);
    return action;
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
    if (/^RECEIVER_LOST:/i.test(text)) return "RECEIVER_LOST";
    // Checked before the generic timeout rule below: a blind detector always
    // ALSO looks like a timeout, and classifying it as one would send it back
    // through the retry path this exists to stop.
    if (/^DETECTION_BLIND:/i.test(text)) return "DETECTION_BLIND";
    if (/LIMIT_STOP|image generation limit/i.test(text)) return "GENERATION_LIMIT_REACHED";
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
    return !HARD_STOP_FAILURE_TYPES.has(failureType) && failureType !== "USER_STOP" && item.retry_count < item.settings.max_retries;
  }
  function needsReconciliation(phase) { return POST_SUBMIT_PHASES.has(phase) && phase !== "SUCCESS"; }
  // INTERRUPTED means "genuinely unresolved -- a human must look before this
  // run continues" and is reserved for the three hard stops. Everything else
  // that exhausts its retries settles as FAILED: safe to skip, safe to leave
  // behind on continuation, and still available for a deliberate Run Failed.
  function interruptedStatus(phase, failureType) {
    return needsReconciliation(phase) && HARD_STOP_FAILURE_TYPES.has(failureType) ? "INTERRUPTED" : "FAILED";
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
  function safetyCooldownSeconds(settings, random = Math.random) {
    const range = wholeRange(settings?.safety_cooldown_sec, DEFAULTS.safety_cooldown_sec, 0, 120, "safety_cooldown_sec");
    return range.min + Math.floor(random() * (range.max - range.min + 1));
  }
  function retryCooldown(settings, retryCount, random = Math.random) { return Math.min(30, Math.max(safetyCooldownSeconds(settings, random), 1) * Math.max(1, retryCount)); }
  function resultWorkbookName(name) { return `${String(name || "workbook.xlsx").replace(/\.xlsx$/i, "")}-result.xlsx`; }
  function delaySeconds(settings, random = Math.random) { return settings.delay_min_sec + Math.floor(random() * (settings.delay_max_sec - settings.delay_min_sec + 1)); }
  function submissionReservation(item, now = new Date()) {
    const timestamp = (now instanceof Date ? now : new Date(now)).toISOString();
    if (!item?.attempt_id) throw new Error("Submission reservation requires an attempt identity.");
    return { status: "RUNNING", attempt_phase: "SUBMITTED", submitted_at: timestamp };
  }
  function shouldCheckpoint(completedJobs, interval = DEFAULTS.checkpoint_interval_jobs) {
    const count = Number(completedJobs);
    const every = whole(interval, DEFAULTS.checkpoint_interval_jobs, 1, 1000, "checkpoint_interval_jobs");
    return Number.isInteger(count) && count > 0 && count % every === 0;
  }
  function rebindQueueRows(queue = [], workbook, activeJobs) {
    if (typeof activeJobs !== "function") throw new Error("Queue row rebind requires the XLSX activeJobs reader.");
    const rows = new Map(activeJobs(workbook).map((job) => [String(job.id || ""), job]));
    for (const item of queue) {
      const rebound = rows.get(String(item?.job?.id || ""));
      if (!rebound) throw new Error(`RUN_CHECKPOINT_REBIND_FAILED: Job '${item?.job?.id || "(missing)"}' is absent from the verified checkpoint.`);
      item.job = rebound;
    }
    return queue;
  }

  async function verifiedRunCheckpoint({ persistAudit, persistLedger, onAuditPersisted = async () => {} } = {}) {
    if (typeof persistAudit !== "function" || typeof persistLedger !== "function") throw new TypeError("Run checkpoint persistence callbacks are required.");
    const auditFile = await persistAudit();
    if (!auditFile) throw new Error("PERSISTENCE_VERIFICATION_FAILED: Run requires a verified audit JSONL before prompt submission.");
    await onAuditPersisted(auditFile);
    const resultFile = await persistLedger();
    if (!resultFile) throw new Error("PERSISTENCE_VERIFICATION_FAILED: Run requires a verified Result XLSX checkpoint before prompt submission.");
    return { auditFile, resultFile };
  }
  // NOT the inter-job clock any more. Counting these ticks is what made a
  // configured 12s gap take ~11 minutes in a hidden side panel (measured live
  // 2026-08-28). The gap now runs on a wall-clock deadline plus a chrome.alarms
  // wake-up -- see interjob-delay-core.js. Kept only because it is still
  // exported and covered by tests; do not wire it back to a wait.
  function countdownValues(seconds) { return Array.from({ length: Math.max(0, Number(seconds) || 0) }, (_unused, index) => seconds - index); }
  function planSummary(queue, settings) {
    const count = (predicate) => queue.filter(predicate).length;
    return { total_jobs: queue.length, eligible_jobs: count((item) => !item.skipped), skipped_done: count((item) => item.skipped), success_jobs: count((item) => item.status === "SUCCESS" || item.status === "DONE"), running_jobs: count((item) => item.status === "RUNNING"), reconciling_jobs: count((item) => item.status === "RECONCILING"), interrupted_jobs: count((item) => item.status === "INTERRUPTED"), failed_jobs: count((item) => item.status === "FAILED"), pending_jobs: count((item) => item.status === "PENDING"), total_max_attempts: queue.filter((item) => !item.skipped).reduce((total, item) => total + 1 + item.settings.max_retries, 0), retry_allowance: settings.max_retries, references_per_job: queue.map((item) => ({ id: item.job.id, references: item.references.map((file) => file.alias || file.fileName || file.name) })) };
  }
  function prepare(workbook, selectedFiles, overrides = {}) {
    const settings = runtimeConfig(workbook.config, overrides);
    aliases(selectedFiles || []);
    const xlsx = globalThis.DacXlsx || globalThis.window?.DacXlsx;
    const logicalJobs = xlsx?.activeJobs ? xlsx.activeJobs(workbook) : workbook.jobs;
    const queue = logicalJobs.map((job, index) => {
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
      const operatorRecreate = bool(job.recreate_operator_approved, false) && String(job.recreate_status || "").trim().toUpperCase() === "APPROVED" && !String(job.attempt_id || "").trim() && !String(job.submitted_at || "").trim() && !terminalSuccess;
      const normalizedTaskType = taskType(job);
      job.task_type = normalizedTaskType;
      return { job, task_type: normalizedTaskType, output_type: String(job.output_type || ""), response_char_count: String(job.response_char_count || ""), response_sha256: String(job.response_sha256 || ""), number: index + 1, references, settings: itemSettings, status, skipped: terminalSuccess && !deliberateRerun || protectedCheckpoint, protected_checkpoint: protectedCheckpoint, deliberate_rerun: deliberateRerun, operator_recreate: operatorRecreate, phase, attempt_id: String(job.attempt_id || ""), submitted_at: String(job.submitted_at || ""), detection_diagnostics: String(job.detection_diagnostics || ""), attempt_count: Number(job.attempt_count) || 0, retry_count: Number(job.retry_count) || 0, failure_type: job.failure_type || "", last_error: job.last_error || job.error || "", result_file: savedOutput, result_download_id: job.result_download_id || "" };
    });
    return { settings, queue, plan: planSummary(queue, settings) };
  }
  // selectedId accepts a single job id (legacy single-selection callers) or an
  // array/Set of ids (multi-select "run these jobs" from the SETUP queue).
  function selectQueue(queue, mode, selectedId) {
    // INTERRUPTED is reserved for the three hard stops (see interruptedStatus
    // above) -- it must never be silently re-submitted by a plain "Run All",
    // in or out of Resume Mode. Reaching one always requires the operator to
    // resolve the underlying block (CAPTCHA/quota/tab) and go through Resume
    // Plan / Recreate, the same as the AMBIGUOUS_SUBMITTED gate already does.
    if (mode === "all") return queue.filter((item) => !item.skipped && item.status !== "INTERRUPTED");
    if (mode === "pending") return queue.filter((item) => item.status === "PENDING" && !item.protected_checkpoint);
    if (mode === "failed") return queue.filter((item) => item.status === "FAILED" && !item.protected_checkpoint);
    if (mode === "recreate") return queue.filter((item) => item.operator_recreate && item.status === "PENDING" && item.phase === "PRE_SUBMIT" && !item.protected_checkpoint);
    if (mode === "selected") {
      // Duck-typed rather than `instanceof Set`: this module can run inside a
      // different realm/vm context than its caller (as the test suite does),
      // where a cross-realm Set fails instanceof but still has a working .has.
      const ids = selectedId && typeof selectedId.has === "function" ? selectedId : new Set(Array.isArray(selectedId) ? selectedId : selectedId ? [selectedId] : []);
      return queue.filter((item) => ids.has(item.job.id) && item.phase === "PRE_SUBMIT" && !item.protected_checkpoint && !["SUCCESS", "DONE", "INTERRUPTED", "STOPPED"].includes(item.status));
    }
    return [];
  }
  function readinessState(signal) {
    if (signal?.securityBlocker) return "HARD_STOP";
    if (signal?.generating) return "GENERATING";
    if (!signal?.outputVerified) return "OUTPUT_READY";
    if (!signal?.composerFound) return "OUTPUT_READY";
    return "CHAT_READY";
  }
  const api = { DEFAULTS, ATTEMPT_PHASES, TASK_TYPES, FAILURE_TYPES, HARD_STOP_FAILURE_TYPES, basename, referenceTokens, taskType, config, runtimeConfig, aliases, resolveReferences, perJobSettings, classifyFailure, canRetry, needsReconciliation, interruptedStatus, canStartNextJob, auditOrderValid, safetyCooldownSeconds, retryCooldown, resultWorkbookName, delaySeconds, submissionReservation, shouldCheckpoint, rebindQueueRows, verifiedRunCheckpoint, countdownValues, planSummary, prepare, selectQueue, readinessState };
  (typeof window !== "undefined" ? window : globalThis).DacRunnerCore = api;
})();
