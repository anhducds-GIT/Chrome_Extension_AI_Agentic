(() => {
  "use strict";

  const text = (value) => String(value ?? "").trim();
  const unique = (values) => [...new Set(values.filter(Boolean))];
  const fail = (code, message) => ({ ok: false, code, message });

  function parseDiagnostics(value) {
    if (value && typeof value === "object") return value;
    try { return JSON.parse(text(value)); } catch { return null; }
  }

  // Creates the immutable proof carried from the persisted submitted attempt
  // into the operator-triggered, read-only DOM inspection.
  function proofFromRecordedAttempt({ run_id, job = {} } = {}) {
    const diagnostics = parseDiagnostics(job.detection_diagnostics);
    const chosen = diagnostics?.decision?.chosen;
    const baseline = diagnostics?.baseline_source_ids;
    const attribution = text(diagnostics?.chosen_attribution);
    if (!text(run_id)) return fail("RECONCILIATION_RUN_ID_MISSING", "The persisted run ID is required for reconciliation.");
    if (!text(job.id) || !text(job.attempt_id) || !text(job.submitted_at)) return fail("RECONCILIATION_ATTEMPT_IDENTITY_MISSING", "The original job, attempt ID, and submission timestamp are required.");
    if (!Array.isArray(baseline) || !diagnostics?.decision || !text(chosen?.source_id) || !["post_turn", "new_visible_fallback"].includes(attribution)) return fail("RECONCILIATION_RECORDED_EVIDENCE_MISSING", "The original immutable image boundary or selected attribution is unavailable.");
    if (chosen.input || chosen.role === "user") return fail("RECONCILIATION_RECORDED_INPUT", "The recorded candidate was an input/reference image.");
    if (Number(diagnostics?.decision?.fresh?.eligible) !== 1) return fail("RECONCILIATION_RECORDED_AMBIGUOUS", "The original attempt did not record exactly one eligible generated image.");
    return {
      ok: true,
      proof: Object.freeze({
        run_id: text(run_id),
        job_id: text(job.id),
        attempt_id: text(job.attempt_id),
        submitted_at: text(job.submitted_at),
        baseline_source_ids: Object.freeze([...baseline].map(text)),
        expected_source_id: text(chosen.source_id),
        attribution
      })
    };
  }

  function verifyExistingOutput({ proof, candidates = [] } = {}) {
    if (!proof?.run_id || !proof?.job_id || !proof?.attempt_id || !proof?.submitted_at || !proof?.expected_source_id || !Array.isArray(proof?.baseline_source_ids)) return fail("RECONCILIATION_PROOF_INVALID", "The reconciliation proof is incomplete.");
    const expected = candidates.filter((candidate) => candidate?.source_id === proof.expected_source_id);
    if (!expected.length) return fail("ATTRIBUTION_NOT_PROVEN", "The recorded generated image is not visible in this conversation.");
    if (proof.baseline_source_ids.includes(proof.expected_source_id)) return fail("ATTRIBUTION_NOT_PROVEN", "The recorded candidate was already present before submission.");
    if (expected.some((candidate) => !candidate.visible)) return fail("ATTRIBUTION_NOT_PROVEN", "The recorded generated image is not visible.");
    if (expected.some((candidate) => !candidate.ready)) return fail("ATTRIBUTION_NOT_PROVEN", "The recorded generated image is not fully loaded.");
    if (expected.some((candidate) => candidate.input || candidate.role === "user")) return fail("ATTRIBUTION_NOT_PROVEN", "The recorded generated image is an input/reference image.");
    const baseline = new Set(proof.baseline_source_ids);
    const eligible = unique(candidates.filter((candidate) => candidate?.visible && candidate?.ready && !candidate?.input && candidate?.role !== "user" && !baseline.has(candidate?.source_id)).map((candidate) => candidate.source_id));
    if (eligible.length !== 1 || eligible[0] !== proof.expected_source_id) return fail("ATTRIBUTION_NOT_PROVEN", "The current conversation does not contain exactly one eligible image matching the recorded submitted boundary.");
    const candidate = expected.find((item) => item.visible && item.ready && !item.input && item.role !== "user");
    return { ok: true, candidate, proof };
  }

  function matchesRequest(proof, context = {}) {
    if (!proof) return fail("RECONCILIATION_PROOF_INVALID", "The reconciliation proof is missing.");
    for (const key of ["run_id", "job_id", "attempt_id", "submitted_at"]) {
      if (text(proof[key]) !== text(context[key])) return fail("RECONCILIATION_IDENTITY_MISMATCH", `The ${key} does not match the persisted submitted attempt.`);
    }
    return { ok: true };
  }

  function safeComplete({ attribution, imagePersisted, checkpointPersisted } = {}) {
    return Boolean(attribution?.ok && imagePersisted && checkpointPersisted);
  }

  const api = { proofFromRecordedAttempt, verifyExistingOutput, matchesRequest, safeComplete };
  (typeof window !== "undefined" ? window : globalThis).DacReconciliationCore = api;
})();
