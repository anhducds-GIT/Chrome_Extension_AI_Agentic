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

  function buttonLabel(button) {
    return (button?.innerText || button?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function visibleNode(root, node) {
    if (typeof node?.getBoundingClientRect !== "function") return true;
    const rect = node.getBoundingClientRect();
    const style = root.defaultView?.getComputedStyle?.(node);
    return rect.width > 0 && rect.height > 0 && style?.display !== "none" && style?.visibility !== "hidden";
  }

  function enabledButton(button) {
    return Boolean(button) && !button.disabled && button.getAttribute?.("aria-disabled") !== "true";
  }

  // FLOW-04 live failure (evidence/F4-image-mode-live-fail-closed-outcome-20260828.json):
  // a page-level enabled "add_2 Create" that lives OUTSIDE the prompt form was
  // selected and clicked; it opened the media panel, the prompt stayed intact
  // and zero results were produced. Exact label text alone is therefore not
  // enough evidence -- the control must also be owned by the composer.
  //
  // The single authorised submit scope is the nearest <form> of the ONE visible
  // composer. No unique visible composer, no owning form, or more than one
  // candidate inside it => no scope, and every scoped lookup returns null so
  // the caller fails closed with zero clicks.
  function composerScope(root) {
    if (!root?.querySelectorAll) return null;
    const composers = [];
    for (const selector of SELECTORS.composer) {
      let nodes;
      try { nodes = Array.from(root.querySelectorAll(selector)); } catch (_) { return null; }
      for (const node of nodes) {
        if (!composers.includes(node) && visibleNode(root, node)) composers.push(node);
      }
    }
    if (composers.length !== 1) return null;
    const composer = composers[0];
    const form = typeof composer.closest === "function" ? composer.closest("form") : null;
    if (!form || typeof form.querySelectorAll !== "function") return null;
    return Object.freeze({ composer, form });
  }

  function scopedVisibleButtons(root, scope) {
    if (!scope) return [];
    let nodes;
    try { nodes = Array.from(scope.form.querySelectorAll("button")); } catch (_) { return []; }
    return nodes.filter((button) => visibleNode(root, button));
  }

  // Audit helper for diagnostics.dom_probe: proves for any element whether it
  // belongs to the authorised composer form, so selector scope is inspectable
  // from evidence instead of inferred.
  function isInComposerForm(root, element) {
    const scope = composerScope(root);
    if (!scope || !element || typeof element.closest !== "function") return false;
    return element.closest("form") === scope.form;
  }

  // Measured button text: F1 "arrow_forward Create" and FLOW-04 selector-drift
  // evidence "add_2 Create". Exact normalized text plus composer-form ownership
  // is intentionally used instead of sc-* classes or a broad "Create" match.
  const CREATE_BUTTON_LABELS = Object.freeze(["arrow_forward Create", "add_2 Create"]);
  function createCandidates(root, scope) {
    return scopedVisibleButtons(root, scope)
      .filter((button) => CREATE_BUTTON_LABELS.includes(buttonLabel(button)));
  }
  function findCreateButton(root) {
    const scope = composerScope(root);
    if (!scope) return null;
    const matches = createCandidates(root, scope);
    // Two exact Create controls inside one form is an unmeasured page state.
    return matches.length === 1 ? matches[0] : null;
  }

  const IMAGE_MODE_SUMMARY_LABEL = "🍌 Nano Banana 2 crop_9_16 x2";
  const VIDEO_MODE_SUMMARY_PATTERN = /^Video · [^·]+ · [^·]+ crop_[^\s]+ x\d+$/;
  const MODE_OPTION_CLASS = "flow_tab_slider_trigger";

  function hasClassToken(button, token) {
    const raw = button?.className?.baseVal || button?.className || button?.getAttribute?.("class") || "";
    return String(raw).split(/\s+/).includes(token);
  }

  // FLOW-04 live evidence (2026-08-28): the closed settings trigger is either
  // the exact measured Image summary or a structured Video summary whose
  // resolution/duration/aspect/count values may vary. Only visible, enabled
  // buttons count; prompt/page prose can never identify the generation mode.
  function generationMode(root) {
    if (!root?.querySelectorAll) return Object.freeze({ mode: "unknown", button: null, label: "" });
    const matches = Array.from(root.querySelectorAll("button")).map((button) => ({ button, label: buttonLabel(button) }))
      .filter(({ button, label }) => visibleNode(root, button) && enabledButton(button) && (label === IMAGE_MODE_SUMMARY_LABEL || VIDEO_MODE_SUMMARY_PATTERN.test(label)));
    if (matches.length !== 1) return Object.freeze({ mode: "unknown", button: null, label: "" });
    const match = matches[0];
    return Object.freeze({ mode: match.label === IMAGE_MODE_SUMMARY_LABEL ? "image" : "video", button: match.button, label: match.label });
  }

  // The open settings panel exposes this exact semantic button with the
  // measured stable class token. Duplicate candidates are ambiguous and must
  // fail closed; no styled-component hash class is used.
  function findVideoModeOption(root) {
    if (!root?.querySelectorAll) return null;
    const matches = Array.from(root.querySelectorAll("button")).filter((button) => (
      buttonLabel(button) === "videocam Video" && hasClassToken(button, MODE_OPTION_CLASS)
      && visibleNode(root, button) && enabledButton(button)
    ));
    return matches.length === 1 ? matches[0] : null;
  }

  const FLOW_GENERATION_LIMIT_REASON = "Flow generation limit reached: visible Upgrade button replaced the unavailable Create control.";

  // FLOW-04 live evidence (2026-08-28): after prompt entry on a no-credit
  // account, Create is unavailable and enabled visible buttons whose exact
  // semantic text is "Upgrade" appear. Button-only evidence deliberately
  // excludes arbitrary prompt/page prose and avoids styled-component classes.
  // FLOW-04 (2026-08-28): Upgrade is only quota evidence when it stands INSIDE
  // the composer form in place of the unavailable Create. A page-level Upgrade
  // is ordinary marketing chrome and must never be read as a quota wall.
  function generationLimitBlocker(root) {
    const scope = composerScope(root);
    if (!scope) return null;
    const candidates = createCandidates(root, scope);
    // Two or more exact Create controls is AMBIGUITY, not exhaustion. Reading
    // that as a quota wall would send the owner to a billing page over what is
    // really an unmeasured DOM change. Ambiguity has its own fail-closed path.
    if (candidates.length > 1) return null;
    if (candidates.some(enabledButton)) return null;
    const upgrade = scopedVisibleButtons(root, scope)
      .find((button) => buttonLabel(button) === "Upgrade" && enabledButton(button));
    return upgrade ? FLOW_GENERATION_LIMIT_REASON : null;
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
    composerScope,
    isInComposerForm,
    findCreateButton,
    generationMode,
    findVideoModeOption,
    generationLimitBlocker,
    videoIdFromSrc,
    securityBlockerPattern,
    matchesGenerationLimit,
  });
})();
