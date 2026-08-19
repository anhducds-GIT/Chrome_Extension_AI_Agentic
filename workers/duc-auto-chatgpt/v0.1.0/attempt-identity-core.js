(() => {
  "use strict";

  function clean(value) { return typeof value === "string" ? value.trim() : ""; }
  function valid(value) { return /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value); }
  function create(message = {}) {
    const jobId = clean(message.job_id);
    const attemptId = clean(message.attempt_id);
    return { job_id: jobId, attempt_id: attemptId, phase: "PRE_SUBMIT", submittedAt: null, beforeCount: null, expectImage: true };
  }
  function validContext(attempt) { return valid(attempt?.job_id) && valid(attempt?.attempt_id); }
  function same(left, right) { return Boolean(left && right && left.job_id === right.job_id && left.attempt_id === right.attempt_id); }
  function submitted(attempt) { return Boolean(attempt?.submittedAt); }
  function snapshot(attempt) {
    return { job_id: attempt?.job_id || "", attempt_id: attempt?.attempt_id || "", phase: attempt?.phase || "PRE_SUBMIT", submittedAt: attempt?.submittedAt || null, beforeCount: Number.isInteger(attempt?.beforeCount) ? attempt.beforeCount : null, expectImage: Boolean(attempt?.expectImage) };
  }

  const api = { create, validContext, same, submitted, snapshot };
  (typeof window !== "undefined" ? window : globalThis).DacAttemptIdentity = api;
})();
