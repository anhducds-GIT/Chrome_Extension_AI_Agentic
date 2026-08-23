(() => {
  "use strict";

  const SURFACE = Object.freeze({ IMAGES: "IMAGES", CONVERSATION: "CONVERSATION", WRONG: "WRONG" });
  const PHASE = Object.freeze({
    PRE_SUBMIT: "PRE_SUBMIT",
    SUBMITTED: "SUBMITTED",
    OUTPUT_DETECTED: "OUTPUT_DETECTED",
    OUTPUT_SAVED: "OUTPUT_SAVED",
    CHAT_READY: "CHAT_READY",
    SUCCESS: "SUCCESS",
    FAILED_PRE_SUBMIT: "FAILED_PRE_SUBMIT",
    OWNER_REVIEW: "OWNER_REVIEW",
    INTERRUPTED: "INTERRUPTED"
  });
  const TERMINAL = new Set([PHASE.SUCCESS, PHASE.FAILED_PRE_SUBMIT, PHASE.OWNER_REVIEW, PHASE.INTERRUPTED]);
  const POST_SUBMIT = new Set([PHASE.SUBMITTED, PHASE.OUTPUT_DETECTED, PHASE.OUTPUT_SAVED, PHASE.CHAT_READY, PHASE.SUCCESS, PHASE.OWNER_REVIEW, PHASE.INTERRUPTED]);
  const TRANSITIONS = Object.freeze({
    PRE_SUBMIT: new Set([PHASE.SUBMITTED, PHASE.FAILED_PRE_SUBMIT]),
    SUBMITTED: new Set([PHASE.OUTPUT_DETECTED, PHASE.OWNER_REVIEW, PHASE.INTERRUPTED]),
    OUTPUT_DETECTED: new Set([PHASE.OUTPUT_SAVED, PHASE.OWNER_REVIEW, PHASE.INTERRUPTED]),
    OUTPUT_SAVED: new Set([PHASE.CHAT_READY, PHASE.OWNER_REVIEW, PHASE.INTERRUPTED]),
    CHAT_READY: new Set([PHASE.SUCCESS, PHASE.OWNER_REVIEW, PHASE.INTERRUPTED]),
    SUCCESS: new Set(), FAILED_PRE_SUBMIT: new Set(), OWNER_REVIEW: new Set(), INTERRUPTED: new Set()
  });

  const SELECTORS = Object.freeze({
    composer: [
      'div[role="textbox"][contenteditable="true"][aria-label*="prompt" i]',
      '[data-test-id="textarea-wrapper"] [role="textbox"][contenteditable="true"]',
      'rich-textarea [contenteditable="true"][role="textbox"]'
    ],
    upload: [
      'button[aria-label="Upload & tools"]',
      'button[aria-label*="Upload" i][aria-haspopup="menu"]',
      'button[aria-label*="Tải" i][aria-haspopup="menu"]'
    ],
    fileInput: ['input[type="file"][accept*="image"]', 'input[type="file"]'],
    send: [
      'button[aria-label="Send message"]',
      'button[aria-label*="Send" i]',
      'button[aria-label*="Gửi" i]',
      'button[data-test-id*="send" i]'
    ],
    stop: [
      'button[aria-label*="Stop" i]',
      'button[aria-label*="Dừng" i]',
      'button[data-test-id*="stop" i]'
    ],
    attachmentPreview: [
      '[data-test-id*="attachment" i]',
      '[data-test-id*="upload" i] img',
      'button[aria-label*="Remove" i] img',
      'button[aria-label*="Xóa" i] img'
    ],
    modelContainer: [
      '[data-message-author-role="model"]',
      '[data-message-author-role="assistant"]',
      'model-response',
      '[data-test-id*="response" i]',
      '[class*="model-response"]'
    ]
  });

  function surface(url) {
    try {
      const parsed = new URL(url);
      if (parsed.origin !== "https://gemini.google.com") return SURFACE.WRONG;
      if (/^\/images\/?$/.test(parsed.pathname)) return SURFACE.IMAGES;
      if (/^\/(app|share|u)\b/.test(parsed.pathname)) return SURFACE.CONVERSATION;
      return SURFACE.WRONG;
    } catch (_) { return SURFACE.WRONG; }
  }

  function normalise(value) { return String(value || "").replace(/\s+/g, " ").trim().toLowerCase(); }
  function securityBlocker(text) {
    const value = normalise(text);
    if (/(captcha|verify you are human|unusual activity|suspicious activity|security check|xác minh.*con người|hoạt động bất thường)/i.test(value)) return "SECURITY_BLOCKER";
    return null;
  }
  function quotaOrPolicyBlocker(text) {
    const value = normalise(text);
    if (/(reached|hit|used).{0,45}(limit|quota)|try again later|come back later|giới hạn|hạn mức|thử lại sau/i.test(value)) return "QUOTA_LIMIT";
    if (/(cannot|can.t|unable to).{0,40}(generate|create|image)|policy|prohibited|not allowed|không thể.{0,30}(tạo|hình ảnh)|chính sách/i.test(value)) return "POLICY_BLOCK";
    return null;
  }
  function shortHash(value) {
    let hash = 2166136261;
    for (const char of String(value || "")) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }
  function candidateKey(candidate) {
    return String(candidate?.key || candidate?.src || candidate?.href || candidate?.nodeId || "").trim();
  }
  function boundary(candidates = [], meta = {}) {
    const keys = candidates.map(candidateKey).filter(Boolean);
    return Object.freeze({
      captured_at: meta.captured_at || new Date().toISOString(),
      url: meta.url || "",
      model_count: Number(meta.model_count || 0),
      response_keys: Object.freeze([...new Set(meta.response_keys || candidates.map((item) => item.containerKey).filter(Boolean))]),
      image_keys: Object.freeze([...new Set(keys)]),
      fingerprint: shortHash(`${meta.url || ""}|${Number(meta.model_count || 0)}|${keys.sort().join("|")}`)
    });
  }
  function outputDecision(originalBoundary, candidates, options = {}) {
    const baseline = new Set(originalBoundary?.image_keys || []);
    const evaluated = (candidates || []).map((candidate) => ({ ...candidate, key: candidateKey(candidate) }));
    const fresh = evaluated.filter((item) => item.key && !baseline.has(item.key));
    const attributable = fresh.filter((item) => item.role === "model" && item.visible !== false && item.usable !== false && item.input !== true && item.afterBoundary === true && item.containerKey && !(originalBoundary?.response_keys || []).includes(item.containerKey));
    if (options.securityBlocker) return { ok: false, reason: options.securityBlocker, fresh_count: fresh.length, attributable_count: attributable.length };
    if (options.generating) return { ok: false, reason: "GENERATION_ACTIVE", fresh_count: fresh.length, attributable_count: attributable.length };
    if (!fresh.length) return { ok: false, reason: "NO_FRESH_OUTPUT", fresh_count: 0, attributable_count: 0 };
    if (!attributable.length) return { ok: false, reason: "FRESH_OUTPUT_NOT_ATTRIBUTABLE", fresh_count: fresh.length, attributable_count: 0 };
    if (attributable.length > 1 && !options.allowMultiple) return { ok: false, reason: "AMBIGUOUS_MULTIPLE_OUTPUTS", fresh_count: fresh.length, attributable_count: attributable.length };
    return { ok: true, reason: "ATTRIBUTABLE_FRESH_OUTPUT", candidate: attributable[0], candidates: attributable, fresh_count: fresh.length, attributable_count: attributable.length };
  }
  function createAttempt({ runId, jobId, attemptId, boundary: originalBoundary }) {
    if (!runId || !jobId || !attemptId || !originalBoundary) throw new Error("Attempt identity and boundary are required.");
    return Object.freeze({ run_id: runId, job_id: jobId, attempt_id: attemptId, phase: PHASE.PRE_SUBMIT, boundary: originalBoundary, created_at: new Date().toISOString() });
  }
  function transition(attempt, next, values = {}) {
    if (!attempt || !TRANSITIONS[attempt.phase]?.has(next)) throw new Error(`INVALID_TRANSITION:${attempt?.phase || "NONE"}->${next}`);
    return Object.freeze({ ...attempt, ...values, phase: next, updated_at: values.updated_at || new Date().toISOString() });
  }
  function retryDecision(attempt, failureType, retryCount = 0, maxRetries = 0) {
    const preSubmit = attempt?.phase === PHASE.PRE_SUBMIT || attempt?.phase === PHASE.FAILED_PRE_SUBMIT;
    const retryable = new Set(["TARGET_MISSING", "COMPOSER_NOT_READY", "ATTACHMENT_NOT_READY", "SEND_NOT_READY"]);
    return { allowed: Boolean(preSubmit && retryable.has(failureType) && retryCount < maxRetries), reason: preSubmit ? (retryable.has(failureType) ? "BUDGET" : "NON_RETRYABLE") : "SUBMITTED_BOUNDARY" };
  }
  function readiness(input = {}) {
    if (input.securityBlocker) return { ready: false, reason: input.securityBlocker };
    if (input.quotaBlocker) return { ready: false, reason: input.quotaBlocker };
    if (input.surface !== SURFACE.IMAGES) return { ready: false, reason: "WRONG_SURFACE" };
    if (!input.composerFound) return { ready: false, reason: "COMPOSER_MISSING" };
    if (input.generating) return { ready: false, reason: "GENERATION_ACTIVE" };
    if (input.attachmentPending) return { ready: false, reason: "ATTACHMENT_PENDING" };
    if (input.requireSend && !input.sendUsable) return { ready: false, reason: "SEND_NOT_READY" };
    return { ready: true, reason: "READY" };
  }

  globalThis.DagProviderCore = Object.freeze({ SURFACE, PHASE, TERMINAL, POST_SUBMIT, SELECTORS, surface, normalise, securityBlocker, quotaOrPolicyBlocker, shortHash, boundary, outputDecision, createAttempt, transition, retryDecision, readiness });
})();
