(() => {
  "use strict";
  function identity(value = {}) { return { run_id: String(value.run_id || ""), job_id: String(value.job_id || value.job?.id || ""), attempt_id: String(value.attempt_id || "") }; }
  function matchesAttempt(actual, expected) { const left = identity(actual); const right = identity(expected); return Boolean(left.run_id && left.run_id === right.run_id && left.job_id === right.job_id && left.attempt_id === right.attempt_id); }
  function classifyFailure(value) {
    const error = String(value || "FAILED_PRE_SUBMIT");
    if (/No exact Gemini Images receiver|TARGET_MISSING|BOUND_TAB_MISSING|RECEIVER_MISSING/i.test(error)) return "TARGET_MISSING";
    if (/COMPOSER/i.test(error)) return "COMPOSER_NOT_READY";
    if (/ATTACHMENT|UPLOAD|FILE_INPUT/i.test(error)) return "ATTACHMENT_NOT_READY";
    if (/SEND/i.test(error)) return "SEND_NOT_READY";
    return error;
  }
  function responseOutcome(response, expected) {
    if (response?.attempt && !matchesAttempt(response.attempt, expected)) return { ok: false, phase: "OWNER_REVIEW", failure_type: "ATTEMPT_ID_MISMATCH", last_error: "Response attempt identity did not match the requested job." };
    if (response?.ok) return { ok: true, phase: response.attempt?.phase || "OUTPUT_DETECTED", attempt: response.attempt, output: response.output };
    if (response?.attempt && matchesAttempt(response.attempt, expected)) return { ok: false, phase: response.attempt.phase || "FAILED_PRE_SUBMIT", failure_type: classifyFailure(response.attempt.failure_type || response.error), last_error: response.error || response.attempt.last_error || "Attempt failed.", attempt: response.attempt };
    return { ok: false, phase: "FAILED_PRE_SUBMIT", failure_type: classifyFailure(response?.error), last_error: response?.error || "Attempt failed before a matching response was available." };
  }
  function restoreSubmitted(item, durableAttempt) {
    if (!durableAttempt || !matchesAttempt(durableAttempt, { run_id: durableAttempt.run_id, job_id: item.job.id, attempt_id: durableAttempt.attempt_id })) return item;
    if (/^(SUBMITTED|OUTPUT_DETECTED|OUTPUT_SAVED|CHAT_READY)$/.test(durableAttempt.phase)) return { ...item, attempt_id: durableAttempt.attempt_id, phase: "OWNER_REVIEW", failure_type: "UNRESOLVED_SUBMITTED_AFTER_RESTART", last_error: `Durable attempt was ${durableAttempt.phase} when the UI restarted.` };
    if (/^(SUCCESS|FAILED_PRE_SUBMIT|OWNER_REVIEW|INTERRUPTED)$/.test(durableAttempt.phase)) return { ...item, attempt_id: durableAttempt.attempt_id, phase: durableAttempt.phase, failure_type: durableAttempt.failure_type || item.failure_type, last_error: durableAttempt.last_error || item.last_error, result_file: durableAttempt.result_file || item.result_file };
    return item;
  }
  function deriveAttemptSerial(checkpoint = {}, queue = []) {
    let value = Number(checkpoint.attempt_serial || 0);
    for (const item of queue) { const match = String(item.attempt_id || "").match(/:a(\d+)$/); if (match) value = Math.max(value, Number(match[1])); }
    return value;
  }
  globalThis.DagRuntimeCore = Object.freeze({ identity, matchesAttempt, classifyFailure, responseOutcome, restoreSubmitted, deriveAttemptSerial });
})();
