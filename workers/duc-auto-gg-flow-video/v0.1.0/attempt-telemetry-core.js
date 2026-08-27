(() => {
  "use strict";

  function serialise(value) {
    if (!value) return null;
    try { return JSON.stringify(value); } catch { return null; }
  }

  function parse(value) {
    if (!value || typeof value !== "string") return null;
    try { return JSON.parse(value); } catch { return null; }
  }

  function fieldsFromAttempt(attempt) {
    if (!attempt || typeof attempt !== "object") return {};
    const fields = {};
    if (attempt.submittedAt) fields.submitted_at = attempt.submittedAt;
    const detection = serialise(attempt.detection);
    if (detection) fields.detection_diagnostics = detection;
    return fields;
  }

  function auditFields(item) {
    return { submitted_at: item?.submitted_at || null, detection: parse(item?.detection_diagnostics) };
  }

  globalThis.DacAttemptTelemetry = { fieldsFromAttempt, auditFields };
})();
