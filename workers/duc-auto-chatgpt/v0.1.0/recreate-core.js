(() => {
  "use strict";

  const text = (value) => String(value ?? "").trim();
  const fail = (code, message) => ({ ok: false, code, message });

  function approval({ job = {}, recoveryState = "", now = new Date().toISOString() } = {}) {
    if (recoveryState !== "AMBIGUOUS_SUBMITTED") return fail("RECREATE_NOT_AMBIGUOUS", "Only an ambiguous submitted job may be deliberately recreated.");
    if (!text(job.id) || !text(job.attempt_id) || !text(job.submitted_at)) return fail("RECREATE_PRIOR_ATTEMPT_MISSING", "The prior submitted attempt identity is required before recreation.");
    const prior = Object.freeze({
      attempt_id: text(job.attempt_id), submitted_at: text(job.submitted_at), status: text(job.status), attempt_phase: text(job.attempt_phase),
      detection_diagnostics: text(job.detection_diagnostics), failure_type: text(job.failure_type), last_error: text(job.last_error || job.error)
    });
    const fields = {
      recreate_operator_approved: "true", recreate_authorized_at: text(now), recreate_origin_attempt_id: prior.attempt_id,
      recreate_origin_submitted_at: prior.submitted_at, recreate_origin_status: prior.status, recreate_origin_phase: prior.attempt_phase,
      recreate_origin_detection_diagnostics: prior.detection_diagnostics, recreate_origin_failure_type: prior.failure_type,
      recreate_origin_last_error: prior.last_error, recreate_history_json: JSON.stringify(prior), recreate_status: "APPROVED",
      attempt_id: "", submitted_at: "", detection_diagnostics: "", status: "RECREATE_APPROVED", attempt_phase: "PRE_SUBMIT",
      retry_count: "0", failure_type: "", last_error: "", error: "", result_file: "", result_download_id: "",
      requested_file: "", persistence_verified: "false", detected_not_downloaded: "false", write_outcome: "", output_saved_at: "", completed_at: ""
    };
    return { ok: true, prior, fields };
  }

  function cancelled() { return { ok: true, cancelled: true, fields: {} }; }
  function isApproved(job = {}) { return /^(true|1|yes)$/i.test(text(job.recreate_operator_approved)); }

  const api = { approval, cancelled, isApproved };
  (typeof window !== "undefined" ? window : globalThis).DacRecreateCore = api;
})();
