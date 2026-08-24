(() => {
  "use strict";

  function uniqueBySource(candidates) {
    const seen = new Set();
    return candidates.filter((candidate) => {
      if (!candidate?.ready || !candidate?.visible || !candidate.source || candidate.input || seen.has(candidate.source)) return false;
      seen.add(candidate.source);
      return true;
    });
  }

  function summary(candidates) {
    const role = { assistant: 0, user: 0, unknown: 0 };
    const count = { total: candidates.length, ready: 0, visible: 0, input: 0, eligible: 0, role };
    for (const candidate of candidates) {
      if (candidate?.ready) count.ready += 1;
      if (candidate?.visible) count.visible += 1;
      if (candidate?.input) count.input += 1;
      const key = Object.hasOwn(role, candidate?.role) ? candidate.role : "unknown";
      role[key] += 1;
    }
    count.eligible = uniqueBySource(candidates).length;
    return count;
  }
  function identifiers(candidates) {
    return candidates.slice(0, 8).map((candidate) => ({ source_id: candidate.source_id || "", node_id: candidate.node_id || "", role: candidate.role || "unknown", input: Boolean(candidate.input), visible: Boolean(candidate.visible), ready: Boolean(candidate.ready) }));
  }
  function verdict(ok, values) { return { ok, ...values }; }

  function selectAttributableImage({ postTurn = [], visible = [], baseline = [] }) {
    const priorSources = new Set(baseline.map((candidate) => candidate.source).filter(Boolean));
    const postTurnFresh = postTurn.filter((candidate) => !priorSources.has(candidate?.source));
    const newlyVisible = visible.filter((candidate) => !priorSources.has(candidate.source));
    const fresh = [...postTurnFresh, ...newlyVisible];
    const newCandidates = uniqueBySource(fresh);
    const postTurnSources = new Set(postTurnFresh.map((candidate) => candidate.source));
    const diagnostics = { post_turn: summary(postTurn), post_turn_ids: identifiers(postTurn), baseline_count: baseline.length, fresh: summary(fresh), fresh_ids: identifiers(fresh) };
    if (newCandidates.length === 1) {
      const candidate = newCandidates[0];
      return verdict(true, { candidate, attribution: postTurnSources.has(candidate.source) ? "post_turn" : "new_visible_fallback", diagnostics: { ...diagnostics, rejection_reason: null, chosen: identifiers(newCandidates)[0] } });
    }
    if (newCandidates.length > 1) {
      const reason = uniqueBySource(postTurnFresh).length > 1 ? "AMBIGUOUS_POST_TURN_IMAGE" : "AMBIGUOUS_NEW_IMAGE";
      return verdict(false, { reason, diagnostics: { ...diagnostics, rejection_reason: reason, chosen: null } });
    }
    if (fresh.some((candidate) => candidate.input)) return verdict(false, { reason: "INPUT_IMAGE_FALSE_POSITIVE", diagnostics: { ...diagnostics, rejection_reason: "INPUT_IMAGE_FALSE_POSITIVE", chosen: null } });
    return verdict(false, { reason: "NO_NEW_IMAGE", diagnostics: { ...diagnostics, rejection_reason: "NO_NEW_IMAGE", chosen: null } });
  }

  // Image evidence and readiness are deliberately separate authorities.  Once
  // one attributable, ready image exists, it may be persisted; the runner
  // still waits for ChatGPT readiness before it is allowed to submit another
  // prompt.  A stale Stop control must not turn a proven image into a timeout.
  function completionForImage(decision, { generationControlVisible = false } = {}) {
    if (!decision?.ok) return { ok: false, reason: decision?.reason || "NO_NEW_IMAGE" };
    return {
      ok: true,
      reason: generationControlVisible ? "image_ready_while_generation_control_visible" : "image_ready"
    };
  }

  const api = { selectAttributableImage, completionForImage };
  (typeof window !== "undefined" ? window : globalThis).DacImageEvidence = api;
})();
