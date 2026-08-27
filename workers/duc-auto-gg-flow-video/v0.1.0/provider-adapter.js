/* Provider adapter -- the single provider-specific surface for this worker.
   Flow selectors and timings below are backed by the measured lifecycle in
   evidence/F1-EVIDENCE-NOTES.md (2026-08-27). */
(() => {
  "use strict";

  const SELECTORS = Object.freeze({
    // F1 conclusion 1: exactly one durable prompt surface on the measured page.
    composer: Object.freeze(['[contenteditable="true"][role="textbox"]']),
    // Flow exposes no stable Send/Stop aria labels. Consumers use the
    // evidence-backed findCreateButton helper; generation has no Stop control.
    send: Object.freeze([]),
    stop: Object.freeze([]),
    uploadMenuButton: Object.freeze([]),
    // F1 conclusion 5: persistent body-level image inputs; there may be many.
    fileInput: Object.freeze(['input[type="file"][accept*="image"]']),
    attachmentPreview: Object.freeze([]),
    uploadPending: Object.freeze([]),
    composerScope: null,
    fileDropTarget: null,
    responseContainer: Object.freeze([]),
    userQueryContainer: null,
    generatedImage: null,
    generatedImageContainer: null,
    generatedImageAltMarker: "",
    generatedImageHostPattern: /$a/,
    generatedImageMinSize: 0,
    outputExclude: null,
    excludedImageHostPattern: /$a/,
    generatingBusy: null,
    thinkingAnimation: null,
    quotaExceededAnchor: null,
    // F1 conclusions 1 and 6: completion is a new stable media id, not a
    // styled-components class, progressbar, busy flag, or Stop button.
    videoSelector: "video",
  });

  const TIMING = Object.freeze({
    perJobTimeoutMs: 300000, // F1: measured ~70s for 720p x 10s; allow 300s
    postTypeSettleMs: 150,
    postSendSettleMs: 2000,
    completionPollMs: 5000,
    stableTextDwellMs: 1500,
    referenceReadyTimeoutMs: 15000,
    sendReadyTimeoutMs: 5000,
    menuSettleMs: 0,
  });

  const SURFACE = Object.freeze({ IMAGES: "IMAGES", CONVERSATION: "CONVERSATION", WRONG: "WRONG" });

  const ORIGIN = Object.freeze({
    hosts: Object.freeze(["labs.google"]),
    urlPattern: /^https:\/\/labs\.google\/fx\/tools\/flow(?:\/|[?#]|$)/i,
  });

  function isProviderUrl(url) {
    return Boolean(url && ORIGIN.urlPattern.test(url));
  }

  function surface(url) {
    try {
      const parsed = new URL(url);
      if (parsed.origin !== "https://labs.google") return SURFACE.WRONG;
      if (/^\/fx\/tools\/flow(?:\/|$)/.test(parsed.pathname)) return SURFACE.CONVERSATION;
      return SURFACE.WRONG;
    } catch (_) {
      return SURFACE.WRONG;
    }
  }

  function surfaceAllowed(url, _context = {}) {
    return surface(url) === SURFACE.CONVERSATION;
  }

  // F1 measured button text "arrow_forward Create" and no usable aria label.
  // Text plus element structure is intentionally used instead of sc-* classes.
  function findCreateButton(root) {
    if (!root?.querySelectorAll) return null;
    return Array.from(root.querySelectorAll("button")).find((button) => {
      const label = (button.innerText || button.textContent || "").replace(/\s+/g, " ").trim();
      if (!/arrow_forward/i.test(label) || !/create/i.test(label)) return false;
      if (typeof button.getBoundingClientRect !== "function") return true;
      const rect = button.getBoundingClientRect();
      const style = root.defaultView?.getComputedStyle?.(button);
      return rect.width > 0 && rect.height > 0 && style?.display !== "none" && style?.visibility !== "hidden";
    }) || null;
  }

  // F1 measured media redirect pattern. Reject other hosts, paths, missing or
  // repeated/blank name values so a non-result video can never be attributed.
  function videoIdFromSrc(src) {
    try {
      const parsed = new URL(String(src || ""));
      if (parsed.origin !== "https://labs.google" || parsed.pathname !== "/fx/api/trpc/media.getMediaUrlRedirect") return null;
      const values = parsed.searchParams.getAll("name");
      return values.length === 1 && values[0] ? values[0] : null;
    } catch (_) {
      return null;
    }
  }

  // Page-wide interstitial blockers remain provider-independent safety gates.
  const securityBlockerPattern = /(captcha|verify you are human|unusual activity|suspicious activity|security check|xác minh.*con người|hoạt động bất thường)/i;

  // Flow quota message text is UNMEASURED: there is no DOM evidence yet.
  // The generic visible-page scan is deliberately broad until F-09 captures
  // the real message; content.js excludes composer/input surfaces from it.
  const quotaPhrasePattern = /((reached|hit|used).{0,45}(limit|quota|credit)|try again later|come back later|giới hạn|hạn mức|thử lại sau|out of credits|not enough credits|hết credit|không đủ credit)/i;
  const legacyLimitPattern = /(reached (?:your|the) (?:daily |monthly )?(?:image generation )?limit|hit (?:your|the) (?:daily |monthly )?(?:image generation )?limit|image generation limit|generate more images (?:after|later|tomorrow)|try again (?:after|tomorrow|in (?:a|\d))|come back (?:after|in|tomorrow) to (?:generate|create) (?:more )?images|daily limit for image generation|you.ve used all your (?:free )?image generations)/i;
  function matchesGenerationLimit(text) {
    const value = String(text || "");
    return Boolean(value) && (quotaPhrasePattern.test(value) || legacyLimitPattern.test(value));
  }

  (typeof window !== "undefined" ? window : globalThis).DacProviderAdapter = Object.freeze({
    provider: "gg-flow-video",
    resultKind: "video",
    SELECTORS,
    TIMING,
    ORIGIN,
    SURFACE,
    isProviderUrl,
    surface,
    surfaceAllowed,
    findCreateButton,
    videoIdFromSrc,
    securityBlockerPattern,
    matchesGenerationLimit,
  });
})();
