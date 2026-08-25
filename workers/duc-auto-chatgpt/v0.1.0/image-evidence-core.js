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

  // One assistant TURN may legitimately carry several generated images -- the
  // A/B poll renders two, and the owner's semantic is "một job có thể ra nhiều
  // ảnh". Images spread across DIFFERENT new assistant turns are still
  // ambiguous: that is the case where attribution genuinely cannot tell whose
  // output is whose, and it must keep failing closed.
  function sameTurn(candidates) {
    const turns = new Set(candidates.map((candidate) => String(candidate?.turn_id || "")));
    return turns.size === 1 && !turns.has("");
  }

  function selectAttributableImages({ postTurn = [], visible = [], baseline = [], maxImages = 1 }) {
    const limit = Math.max(1, Math.min(Number(maxImages) || 1, 20));
    const priorSources = new Set(baseline.map((candidate) => candidate.source).filter(Boolean));
    const postTurnFresh = postTurn.filter((candidate) => !priorSources.has(candidate?.source));
    const newlyVisible = visible.filter((candidate) => !priorSources.has(candidate.source));
    const fresh = [...postTurnFresh, ...newlyVisible];
    const fallbackEligible = newlyVisible.filter((candidate) => candidate?.role === "assistant");
    const newCandidates = uniqueBySource([...postTurnFresh, ...fallbackEligible]);
    const postTurnSources = new Set(postTurnFresh.map((candidate) => candidate.source));
    const attributionOf = (candidate) => postTurnSources.has(candidate.source) ? "post_turn" : "new_visible_fallback";
    const diagnostics = { post_turn: summary(postTurn), post_turn_ids: identifiers(postTurn), baseline_count: baseline.length, fresh: summary(fresh), fresh_ids: identifiers(fresh), max_images: limit };
    if (newCandidates.length === 1) {
      const candidate = newCandidates[0];
      return verdict(true, { candidate, candidates: [candidate], attribution: attributionOf(candidate), attributions: [attributionOf(candidate)], multi_image: false, diagnostics: { ...diagnostics, rejection_reason: null, chosen: identifiers(newCandidates)[0], chosen_count: 1 } });
    }
    if (newCandidates.length > 1) {
      // A multi-image set is accepted ONLY from post-turn evidence. The
      // new_visible_fallback path answers "this image appeared somewhere on
      // the page and was not in the baseline", which an old assistant image
      // can satisfy just by having its blob/CDN URL refreshed. That is a
      // tolerable last resort for ONE image; it is not evidence strong enough
      // to hand a whole set of files to this job.
      const postTurnOnly = newCandidates.every((candidate) => postTurnSources.has(candidate.source));
      if (limit > 1 && newCandidates.length <= limit && postTurnOnly && sameTurn(newCandidates)) {
        return verdict(true, {
          candidate: newCandidates[0],
          candidates: newCandidates,
          attribution: attributionOf(newCandidates[0]),
          attributions: newCandidates.map(attributionOf),
          multi_image: true,
          diagnostics: { ...diagnostics, rejection_reason: null, chosen: identifiers(newCandidates)[0], chosen_count: newCandidates.length, chosen_ids: identifiers(newCandidates), same_turn: true }
        });
      }
      const overLimit = limit > 1 && postTurnOnly && sameTurn(newCandidates) && newCandidates.length > limit;
      const reason = overLimit ? "TOO_MANY_NEW_IMAGES" : uniqueBySource(postTurnFresh).length > 1 ? "AMBIGUOUS_POST_TURN_IMAGE" : "AMBIGUOUS_NEW_IMAGE";
      return verdict(false, { reason, diagnostics: { ...diagnostics, rejection_reason: reason, chosen: null, chosen_count: 0, candidate_count: newCandidates.length, same_turn: sameTurn(newCandidates), post_turn_only: postTurnOnly } });
    }
    if (fresh.some((candidate) => candidate.input)) return verdict(false, { reason: "INPUT_IMAGE_FALSE_POSITIVE", diagnostics: { ...diagnostics, rejection_reason: "INPUT_IMAGE_FALSE_POSITIVE", chosen: null, chosen_count: 0 } });
    return verdict(false, { reason: "NO_NEW_IMAGE", diagnostics: { ...diagnostics, rejection_reason: "NO_NEW_IMAGE", chosen: null, chosen_count: 0 } });
  }

  // Single-image entry point kept intact for every caller that owns exactly
  // one artifact per attempt (reconciliation, manual verification).
  function selectAttributableImage(input) {
    return selectAttributableImages({ ...input, maxImages: 1 });
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

  // A multi-image turn can render its images one at a time. Returning on the
  // first attributable image would silently drop the rest, so a multi-image
  // decision is only complete once the candidate SET has stopped changing.
  // Single-image decisions keep returning immediately.
  // Sorted deliberately: this is a SET signature. ChatGPT reordering the same
  // two images in the DOM is not a new image, and letting it restart the
  // settle clock could starve a complete output into a detection timeout.
  function imageSignature(decision) {
    return (decision?.candidates || []).map((candidate) => candidate?.source || "").sort().join("|");
  }

  function settledForImages(decision, { previousSignature = "", stableSinceMs = null, nowMs = Date.now(), settleMs = 1500, maxImages = 1, generationControlVisible = false } = {}) {
    const count = decision?.ok ? (decision.candidates?.length || 1) : 0;
    const signature = imageSignature(decision);
    if (!decision?.ok) return { settled: false, count, signature: "", stable_since_ms: null, reason: decision?.reason || "NO_NEW_IMAGE" };
    const limit = Math.max(1, Math.min(Number(maxImages) || 1, 20));
    if (limit <= 1) return { settled: true, count, signature, stable_since_ms: nowMs, reason: "single_image_mode" };
    // Counting is not enough: a turn can swap one candidate URL for another
    // without the total ever changing. The SET has to hold still, not its size.
    if (signature !== previousSignature) return { settled: false, count, signature, stable_since_ms: nowMs, reason: "image_set_changed" };
    const since = Number.isFinite(Number(stableSinceMs)) ? Number(stableSinceMs) : nowMs;
    // Reaching max_images_per_job is a capacity condition, not proof the turn
    // has finished -- a further image would make the whole set ambiguous, and
    // the runner must be allowed to see that and fail closed rather than grab
    // the first N. So there is no early return here.
    //
    // While ChatGPT still shows its generation control, more images may
    // genuinely be coming; hold the set open substantially longer.
    //
    // KNOWN LIMIT, deliberate: this window is finite rather than "wait until
    // the generation control disappears". A stale Stop control is a real
    // observed condition in this codebase (see completionForImage), and
    // gating on it would turn a proven set of images into a detection
    // timeout -- losing files that are already on screen. So a very late
    // image, arriving after a fully stable window, can still be missed. It is
    // recorded as image_set_stable_while_generating in detection_diagnostics
    // so the evidence says which rule finalised the set.
    const required = generationControlVisible ? settleMs * 4 : settleMs;
    if (nowMs - since >= required) return { settled: true, count, signature, stable_since_ms: since, reason: generationControlVisible ? "image_set_stable_while_generating" : "image_set_stable" };
    return { settled: false, count, signature, stable_since_ms: since, reason: "awaiting_image_settle" };
  }

  const api = { selectAttributableImage, selectAttributableImages, completionForImage, settledForImages, imageSignature };
  (typeof window !== "undefined" ? window : globalThis).DacImageEvidence = api;
})();
