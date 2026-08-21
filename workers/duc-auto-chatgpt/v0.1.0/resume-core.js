(() => {
  "use strict";

  const text = (value) => String(value ?? "").trim();
  const lower = (value) => text(value).toLowerCase();
  const bool = (value) => value === true || /^(true|1|yes)$/i.test(text(value));
  const leaf = (value) => text(value).replace(/^.*[\\/]/, "");
  const base = (value) => leaf(value).replace(/__results\.xlsx$/i, "").replace(/\.xlsx$/i, "") || "workbook";
  const postSubmitPhases = new Set(["SUBMITTED", "OUTPUT_DETECTED", "OUTPUT_SAVED", "CHAT_READY", "SUCCESS"]);
  const preSubmitFailures = new Set(["TIMEOUT_PRE_SUBMIT", "ATTACHMENT_FAILED", "OTHER", "VALIDATION_FAILED", "RECEIVER_LOST"]);

  function token(value) { return text(value).replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase().slice(0, 40) || "run"; }
  function hash(value) { let h = 2166136261; for (const char of String(value)) { h ^= char.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  function createRunId(workbookName, now = new Date()) {
    const date = now instanceof Date ? now : new Date(now);
    const stamp = `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}-${String(date.getUTCHours()).padStart(2, "0")}${String(date.getUTCMinutes()).padStart(2, "0")}`;
    return `${stamp}-${token(base(workbookName))}`;
  }
  function legacyRunId(workbook) {
    const jobs = (workbook?.jobs || []).map((job) => `${text(job.id)}:${text(job.prompt)}`).join("|");
    return `legacy-${token(base(workbook?.fileName))}-${hash(`${base(workbook?.fileName)}|${jobs}`).slice(0, 8)}`;
  }
  function identity(workbook, now) {
    const existing = text(workbook?.config?.run_id);
    if (/^[a-z0-9][a-z0-9-]{2,79}$/i.test(existing)) return { run_id: existing, provenance: "persisted" };
    return { run_id: legacyRunId(workbook), provenance: "legacy" };
  }
  function hasSubmittedBoundary(job = {}) {
    const phase = text(job.attempt_phase).toUpperCase();
    return Boolean(text(job.submitted_at)) || postSubmitPhases.has(phase) || ["running", "reconciling", "interrupted", "stopped"].includes(lower(job.status));
  }
  function validSavedAttribution(job = {}) {
    const result = leaf(job.result_file);
    if (!bool(job.persistence_verified) || !result) return false;
    const requested = leaf(job.requested_file);
    return !requested || requested === result;
  }
  function classify(job = {}) {
    const status = lower(job.status);
    const phase = text(job.attempt_phase).toUpperCase() || "PRE_SUBMIT";
    if (["success", "done"].includes(status) && validSavedAttribution(job)) return { state: "SAFE_COMPLETE", code: "", message: "Verified persisted output; skip on continuation." };
    const preSubmitFailure = status === "failed" && phase === "PRE_SUBMIT" && !hasSubmittedBoundary(job) && preSubmitFailures.has(text(job.failure_type).toUpperCase() || "OTHER");
    if (preSubmitFailure) return { state: "SAFE_FAILED_PRE_SUBMIT", code: "", message: "Failure is proven pre-submit; existing retry/rerun rules apply." };
    if (!hasSubmittedBoundary(job) && ["", "pending", "eligible"].includes(status)) return { state: "SAFE_PENDING", code: "", message: "No submitted boundary recorded; eligible for normal readiness-gated execution." };
    if (!hasSubmittedBoundary(job) && status === "failed" && phase === "PRE_SUBMIT") return { state: "SAFE_FAILED_PRE_SUBMIT", code: "", message: "Recorded pre-submit failure; existing retry/rerun rules apply." };
    return { state: "AMBIGUOUS_SUBMITTED", code: "RESUME_AMBIGUOUS_SUBMISSION", message: "Submitted previously; outcome is not safely attributable. Manual review required." };
  }
  function validateLedger(workbook) {
    const findings = [];
    if (!workbook?.jobs?.length) findings.push({ code: "RESUME_LEDGER_INVALID", severity: "BLOCKER", scope: "resume", message: "Recovery ledger has no jobs.", guidance: "Select a supported Result XLSX for this run." });
    const ids = new Set();
    for (const job of workbook?.jobs || []) {
      const id = lower(job.id);
      if (!id || ids.has(id)) findings.push({ code: "RESUME_LEDGER_INVALID", severity: "BLOCKER", scope: "resume", message: `Duplicate or missing job ID '${text(job.id) || "(blank)"}'.`, guidance: "Use the original unmodified Result XLSX." });
      ids.add(id);
    }
    const recordedLedger = leaf(workbook?.config?.effective_result_xlsx);
    if (recordedLedger && recordedLedger !== leaf(workbook?.fileName)) findings.push({ code: "RESUME_RUN_ID_MISMATCH", severity: "BLOCKER", scope: "resume", message: `Selected Result XLSX '${leaf(workbook?.fileName)}' does not match ledger provenance '${recordedLedger}'.`, guidance: "Select the Result XLSX recorded by this run; do not substitute a similarly named workbook." });
    return findings;
  }
  function checkpointValidation(workbook, filename, pattern, expectedRunId = "") {
    const fileName = leaf(filename);
    const parsed = globalThis.DacCheckpointCore?.parse(pattern, fileName) || null;
    const findings = validateLedger(workbook);
    const config = workbook?.config || {};
    const run = identity(workbook);
    if (expectedRunId && run.run_id !== expectedRunId) findings.push({ code: "RESUME_RUN_ID_MISMATCH", severity: "BLOCKER", scope: "resume", message: `Checkpoint '${fileName}' belongs to run '${run.run_id}', not '${expectedRunId}'.`, guidance: "Choose checkpoints from one run only." });
    if (parsed) {
      const version = Number(config.checkpoint_version);
      const recorded = leaf(config.checkpoint_filename);
      const createdAt = Date.parse(text(config.checkpoint_created_at));
      if (!text(config.run_id) || run.provenance !== "persisted" || version !== parsed.version || recorded !== fileName || !Number.isFinite(createdAt)) findings.push({ code: "RESUME_LATEST_CHECKPOINT_INVALID", severity: "BLOCKER", scope: "resume", message: `Checkpoint '${fileName}' is missing or has inconsistent checkpoint metadata.`, guidance: "Restore the valid latest checkpoint; do not fall back automatically." });
      if (leaf(config.effective_result_xlsx) !== fileName) findings.push({ code: "RESUME_LATEST_CHECKPOINT_INVALID", severity: "BLOCKER", scope: "resume", message: `Checkpoint '${fileName}' does not record itself as the effective Result XLSX.`, guidance: "Use an unmodified verified checkpoint." });
    } else if (!/__results\.xlsx$/i.test(fileName)) {
      findings.push({ code: "RESUME_LEDGER_INVALID", severity: "BLOCKER", scope: "resume", message: `Result XLSX '${fileName}' does not match the configured checkpoint pattern.`, guidance: "Choose a matching Result checkpoint." });
    }
    return { run, parsed, findings, ready: findings.every((item) => item.severity !== "BLOCKER") };
  }
  function plan(workbook) {
    const run = identity(workbook);
    const findings = validateLedger(workbook);
    const jobs = (workbook?.jobs || []).map((job) => ({ job_id: text(job.id), ...classify(job) }));
    const count = (state) => jobs.filter((item) => item.state === state).length;
    const ambiguous = jobs.filter((item) => item.state === "AMBIGUOUS_SUBMITTED");
    for (const item of ambiguous) findings.push({ code: item.code, severity: "BLOCKER", scope: "resume", job_ids: [item.job_id], message: item.message, guidance: "Do not submit this job again. Review the prior ChatGPT outcome and persisted artifact manually." });
    const summary = { total: jobs.length, completed: count("SAFE_COMPLETE"), safe_pending: count("SAFE_PENDING"), failed_pre_submit: count("SAFE_FAILED_PRE_SUBMIT"), ambiguous_submitted: ambiguous.length, missing_artifacts: jobs.filter((item) => item.state === "AMBIGUOUS_SUBMITTED" && ["success", "done"].includes(lower((workbook.jobs || []).find((job) => text(job.id) === item.job_id)?.status))).length };
    const next = jobs.find((item) => item.state === "SAFE_PENDING") || jobs.find((item) => item.state === "SAFE_FAILED_PRE_SUBMIT") || null;
    return { run, jobs, findings, summary, next_eligible_job: next?.job_id || null, ready: findings.every((item) => item.severity !== "BLOCKER") };
  }
  function applyToQueue(queue = [], recovery = []) {
    const byId = new Map(recovery.map((item) => [item.job_id, item]));
    for (const item of queue) {
      const recoveryItem = byId.get(text(item.job?.id));
      if (!recoveryItem) continue;
      item.recovery_state = recoveryItem.state;
      if (recoveryItem.state === "SAFE_COMPLETE") { item.status = "SUCCESS"; item.phase = "SUCCESS"; item.skipped = true; item.protected_checkpoint = true; }
      else if (recoveryItem.state === "SAFE_PENDING") { item.status = "PENDING"; item.phase = "PRE_SUBMIT"; item.skipped = false; item.protected_checkpoint = false; }
      else if (recoveryItem.state === "SAFE_FAILED_PRE_SUBMIT") { item.status = "FAILED"; item.phase = "PRE_SUBMIT"; item.skipped = false; item.protected_checkpoint = false; }
      else { item.status = "INTERRUPTED"; item.skipped = true; item.protected_checkpoint = true; }
    }
    return queue;
  }
  function summaryText(summary) { return `${summary.completed} completed · ${summary.safe_pending} safe pending · ${summary.failed_pre_submit} failed pre-submit · ${summary.ambiguous_submitted} need review`; }

  (typeof window !== "undefined" ? window : globalThis).DacResumeCore = { createRunId, legacyRunId, identity, validSavedAttribution, classify, validateLedger, checkpointValidation, plan, applyToQueue, summaryText };
})();
