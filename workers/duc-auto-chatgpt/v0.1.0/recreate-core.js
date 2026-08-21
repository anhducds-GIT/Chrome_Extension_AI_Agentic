(() => {
  "use strict";

  const text = (value) => String(value ?? "").trim();
  const fail = (code, message) => ({ ok: false, code, message });

  function history(job = {}) {
    try {
      const parsed = JSON.parse(text(job.recreate_history_json) || "[]");
      return Array.isArray(parsed) ? parsed.filter((entry) => entry && typeof entry === "object") : parsed && typeof parsed === "object" ? [parsed] : [];
    } catch (_) { return []; }
  }
  function snapshot(job = {}) {
    return Object.freeze({
      attempt_id: text(job.attempt_id), submitted_at: text(job.submitted_at), status: text(job.status), attempt_phase: text(job.attempt_phase),
      detection_diagnostics: text(job.detection_diagnostics), failure_type: text(job.failure_type), last_error: text(job.last_error || job.error),
      recreate_authorized_at: text(job.recreate_authorized_at), recreate_attempt_id: text(job.recreate_attempt_id), recreate_status: text(job.recreate_status)
    });
  }
  function appendHistory(entries, entry) {
    return entries.some((known) => text(known.attempt_id) === entry.attempt_id && text(known.submitted_at) === entry.submitted_at && text(known.recreate_authorized_at) === entry.recreate_authorized_at && text(known.failure_type) === entry.failure_type && text(known.status) === entry.status) ? entries : [...entries, entry];
  }

  function approval({ job = {}, recoveryState = "", now = new Date().toISOString() } = {}) {
    if (recoveryState !== "AMBIGUOUS_SUBMITTED") return fail("RECREATE_NOT_AMBIGUOUS", "Only an ambiguous submitted job may be deliberately recreated.");
    const failedApprovedRecreate = isApproved(job) && text(job.recreate_status).toUpperCase() === "FAILED";
    if (!text(job.id) || ((!text(job.attempt_id) || !text(job.submitted_at)) && !failedApprovedRecreate)) return fail("RECREATE_PRIOR_ATTEMPT_MISSING", "The prior submitted attempt identity is required before recreation.");
    const prior = snapshot(job);
    const priorHistory = appendHistory(history(job), prior);
    const original = priorHistory[0] || prior;
    const approvalCount = Math.max(0, Number(job.recreate_approval_count) || 0) + 1;
    const fields = {
      recreate_operator_approved: "true", recreate_authorized_at: text(now), recreate_origin_attempt_id: text(job.recreate_origin_attempt_id) || original.attempt_id,
      recreate_origin_submitted_at: text(job.recreate_origin_submitted_at) || original.submitted_at, recreate_origin_status: text(job.recreate_origin_status) || original.status, recreate_origin_phase: text(job.recreate_origin_phase) || original.attempt_phase,
      recreate_origin_detection_diagnostics: text(job.recreate_origin_detection_diagnostics) || original.detection_diagnostics, recreate_origin_failure_type: text(job.recreate_origin_failure_type) || original.failure_type,
      recreate_origin_last_error: text(job.recreate_origin_last_error) || original.last_error, recreate_history_json: JSON.stringify(priorHistory), recreate_approval_count: String(approvalCount), recreate_status: "APPROVED",
      attempt_id: "", submitted_at: "", detection_diagnostics: "", status: "RECREATE_APPROVED", attempt_phase: "PRE_SUBMIT",
      retry_count: "0", failure_type: "", last_error: "", error: "", result_file: "", result_download_id: "",
      requested_file: "", persistence_verified: "false", detected_not_downloaded: "false", write_outcome: "", output_saved_at: "", completed_at: ""
    };
    return { ok: true, prior, fields };
  }

  function cancelled() { return { ok: true, cancelled: true, fields: {} }; }
  function isApproved(job = {}) { return /^(true|1|yes)$/i.test(text(job.recreate_operator_approved)); }
  function isQueuedApproval(job = {}) { return isApproved(job) && text(job.recreate_status).toUpperCase() === "APPROVED" && !text(job.attempt_id) && !text(job.submitted_at); }
  function hasSubmittedBoundary(job = {}) { return Boolean(text(job.attempt_id) && text(job.submitted_at)); }
  function requiresNewApproval(job = {}) { return isApproved(job) && !isQueuedApproval(job) && (hasSubmittedBoundary(job) || text(job.recreate_status).toUpperCase() === "FAILED"); }

  const api = { approval, cancelled, isApproved, isQueuedApproval, hasSubmittedBoundary, requiresNewApproval };
  (typeof window !== "undefined" ? window : globalThis).DacRecreateCore = api;
})();
