/* Provider adapter -- the single provider-specific surface for this worker.
   ORIGIN targets Google Flow per the owner decision dated 2026-08-27 in
   decisions.md. ALL SELECTORS and TIMING below are inherited from the Gemini
   v0.2.0 worker and are NOT valid for Flow. During bootstrap (backlog F-02),
   they must only be replaced with values backed by dom_probe evidence. */
(() => {
  "use strict";

  const SELECTORS = Object.freeze({
    // Prompt composer (Quill editor), in preference order (snapshot 1: all
    // three matched exactly one element; aria-label "Enter a prompt for Gemini").
    composer: Object.freeze([
      'rich-textarea .ql-editor[role="textbox"][contenteditable="true"]',
      '[data-test-id="textarea-wrapper"] [role="textbox"][contenteditable="true"]',
      '[contenteditable="true"][role="textbox"]',
    ]),
    // Send button. It EXISTS ONLY when the composer has content (snapshot 3,
    // finding 5) -- readiness must not require it on an empty composer.
    send: Object.freeze([
      'button[aria-label="Send message"]',
      'button[aria-label*="Send" i]',
      'button[aria-label*="Gửi" i]',
    ]),
    // Stop button, present only during generation (snapshot 2).
    stop: Object.freeze([
      'button[aria-label="Stop response"]',
      'button[aria-label*="Stop" i]',
      'button[aria-label*="Dừng" i]',
    ]),
    // The "+" menu that materializes the transient file input (snapshot 4).
    uploadMenuButton: Object.freeze([
      'button[aria-label="Upload & tools"]',
      'button[aria-label*="Upload" i][aria-haspopup="menu"]',
    ]),
    // input[type=file] exists ONLY while the upload menu is open (snapshot 4:
    // inside images-files-uploader and the CDK overlay's mat-card).
    fileInput: Object.freeze([
      'images-files-uploader input[type="file"]',
      '.cdk-overlay-container input[type="file"]',
      'input[type="file"]',
    ]),
    // Composer attachment preview chain (snapshots 1/1b):
    // uploader-file-preview > gem-media-attachment > img.gem-attachment-style-img,
    // alt="attachment", src blob:.
    attachmentPreview: Object.freeze([
      'uploader-file-preview gem-media-attachment img',
      'gem-media-attachment img',
      'img.gem-attachment-style-img',
      'img[alt="attachment" i]',
    ]),
    // The custom element that scopes ALL composer/attachment state. The idle
    // page keeps page-wide progressbars alive (sidebar spinner,
    // chat-loading-animation) so busy/pending checks MUST stay inside this
    // scope (snapshot 1).
    composerScope: "input-container",
    // Always-present drop pipeline target for the synthetic-drop fallback.
    fileDropTarget: "file-drop-indicator",
    // Assistant-turn containers (snapshots 2-3): the NEW container appears
    // first, its image content arrives later.
    responseContainer: Object.freeze(["model-response"]),
    // Operator's own uploaded reference re-rendered in the conversation
    // (snapshot 3, finding 4) -- input evidence, never output.
    userQueryContainer: "user-query",
    // The generated result image (snapshot 3, finding 3): 708x708,
    // alt ", AI generated", src https://lh3.googleusercontent.com/...
    generatedImage: "generated-image single-image img",
    generatedImageContainer: "generated-image",
    generatedImageAltMarker: "ai generated",
    generatedImageHostPattern: /^https:\/\/lh3\.googleusercontent\.com\//i,
    // 150, không phải 200 — Đức chốt 26/08 sau khi ĐO thật:
    //   ảnh Gemini sinh ra:            330 x 180
    //   ảnh người dùng đính kèm:       112 x 112
    // Ngưỡng 200 cũ đòi CẢ hai chiều >= 200, nên 180 < 200 khiến MỌI ảnh sinh
    // ra bị chấm "không hiện ra" vĩnh viễn. Bug đó ẩn được lâu vì ảnh
    // https://lh3 lọt qua nhờ remoteVerifiedResult bỏ hẳn phép kiểm kích
    // thước, không phải nhờ kích thước đạt; Gemini chuyển sang render blob:
    // thì lớp che biến mất và bug lộ ra.
    // 150 nằm giữa 112 và 180, cách cả hai một khoảng rộng — vẫn loại được
    // ảnh nhỏ/biểu tượng, mà không sát mép bên nào.
    generatedImageMinSize: 150,
    // An <img> inside any of these ancestors is INPUT/template evidence and is
    // excluded from output candidates (zero-state gallery cards, the
    // operator's uploads, composer previews -- snapshots 1/1b/3).
    outputExclude: "user-query, image-card, input-container",
    // Zero-state template gallery images are all served from gstatic
    // (snapshot 1b) -- excluded by host as well.
    excludedImageHostPattern: /^https:\/\/www\.gstatic\.com\//i,
    // Generating signals, all scoped or generation-only (snapshot 2):
    // stop button visible OR chat-window-scoped busy OR thinking-dots-animation.
    // image-loading-overlay exists in DOM templates even at rest -- never
    // usable alone.
    generatingBusy: 'chat-window [role="progressbar"], chat-window [aria-busy="true"]',
    thinkingAnimation: "thinking-dots-animation",
    // Freemium quota wall anchor (snapshot 3, finding 6) -- a far better
    // signal than phrase matching; phrases below stay as scoped fallback.
    quotaExceededAnchor: "freemium-file-upload-quota-exceeded-disclaimer",
    // Pending-upload markers, only meaningful INSIDE composerScope.
    uploadPending: Object.freeze(['[aria-busy="true"]', '[role="progressbar"]']),
  });

  const TIMING = Object.freeze({
    postTypeSettleMs: 150, // after the prompt is inserted, before Send readiness is polled
    postSendSettleMs: 500, // after Send is clicked, before completion polling starts
    completionPollMs: 300, // poll interval for completion and chat-readiness loops
    stableTextDwellMs: 1500, // text response must hold unchanged this long to count as complete
    referenceReadyTimeoutMs: 15000, // reference-image attach must settle within this window
    sendReadyTimeoutMs: 5000, // Send button must become enabled within this window
    menuSettleMs: 400, // after the upload menu closes, before the next composer interaction
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

  // Surface rule. Snapshot 3, finding 1: submitting from /images NAVIGATES the
  // tab to /app/<conversation-id>, so /app must never be treated as receiver
  // loss (the v0.1.0 BOUND_TAB_LEFT_IMAGES_SURFACE design bug). Owner decision
  // 2026-08-25: runs may also START from an /app conversation — the G1
  // evidence (snapshots 2-4) verified the composer, upload menu, send button
  // and generated-image containers on /app itself, and the owner generates
  // there routinely. Operational note: on /app the prompt lands in whichever
  // conversation the tab shows; pointing the tab at the right one is the
  // operator's responsibility (the audit records the URL).
  function surfaceAllowed(url, _context = {}) {
    const value = surface(url);
    return value === SURFACE.IMAGES || value === SURFACE.CONVERSATION;
  }

  // Page-wide interstitial blockers (CAPTCHA and similar), EN + VN, carried
  // unchanged from the proven v0.1.0 Gemini worker.
  const securityBlockerPattern = /(captcha|verify you are human|unusual activity|suspicious activity|security check|xác minh.*con người|hoạt động bất thường)/i;

  // Image-generation quota phrases. Primary detection is the DOM anchor
  // SELECTORS.quotaExceededAnchor; this phrase list is the fallback and MUST
  // only ever be tested against model-response text (content.js scopes it) --
  // never the whole page, where the operator's own prompt could false-match.
  // The list is the union of the v0.1.0 Gemini quota regex (EN + VN) and the
  // ChatGPT-era phrasing kept from the proven v0.2.0 worker.
  const quotaPhrasePattern = /((reached|hit|used).{0,45}(limit|quota)|try again later|come back later|giới hạn|hạn mức|thử lại sau)/i;
  const legacyLimitPattern = /(reached (?:your|the) (?:daily |monthly )?(?:image generation )?limit|hit (?:your|the) (?:daily |monthly )?(?:image generation )?limit|image generation limit|generate more images (?:after|later|tomorrow)|try again (?:after|tomorrow|in (?:a|\d))|come back (?:after|in|tomorrow) to (?:generate|create) (?:more )?images|daily limit for image generation|you.ve used all your (?:free )?image generations)/i;
  function matchesGenerationLimit(text) {
    const value = String(text || "");
    if (!value) return false;
    return quotaPhrasePattern.test(value) || legacyLimitPattern.test(value);
  }

  (typeof window !== "undefined" ? window : globalThis).DacProviderAdapter = Object.freeze({
    provider: "gg-flow-video",
    SELECTORS,
    TIMING,
    ORIGIN,
    SURFACE,
    isProviderUrl,
    surface,
    surfaceAllowed,
    securityBlockerPattern,
    matchesGenerationLimit,
  });
})();
