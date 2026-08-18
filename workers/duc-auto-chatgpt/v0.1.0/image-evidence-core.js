(() => {
  "use strict";

  function uniqueBySource(candidates) {
    const seen = new Set();
    return candidates.filter((candidate) => {
      if (!candidate?.ready || !candidate?.visible || !candidate.source || seen.has(candidate.source)) return false;
      seen.add(candidate.source);
      return true;
    });
  }

  function selectAttributableImage({ postTurn = [], visible = [], baseline = [] }) {
    const turnCandidates = uniqueBySource(postTurn);
    if (turnCandidates.length === 1) return { ok: true, candidate: turnCandidates[0], attribution: "post_turn" };
    if (turnCandidates.length > 1) return { ok: false, reason: "AMBIGUOUS_POST_TURN_IMAGE" };

    const priorSources = new Set(baseline.map((candidate) => candidate.source).filter(Boolean));
    const newCandidates = uniqueBySource(visible.filter((candidate) => !priorSources.has(candidate.source)));
    if (newCandidates.length === 1) return { ok: true, candidate: newCandidates[0], attribution: "new_visible_fallback" };
    return { ok: false, reason: newCandidates.length ? "AMBIGUOUS_NEW_IMAGE" : "NO_NEW_IMAGE" };
  }

  const api = { selectAttributableImage };
  (typeof window !== "undefined" ? window : globalThis).DacImageEvidence = api;
})();
