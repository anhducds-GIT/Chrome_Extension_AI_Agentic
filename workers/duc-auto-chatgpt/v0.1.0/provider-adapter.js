/* Provider adapter -- the single place that knows which AI chat product this
   worker drives. Every provider-specific DOM selector, blocker pattern,
   timing constant and origin rule lives here; content.js consumes this
   surface and stays provider-neutral.

   This file ships the CHATGPT adapter (chatgpt.com). Structure deliberately
   mirrors workers/duc-auto-gemini/v0.2.0/provider-adapter.js so the two
   workers converge instead of drifting -- see decisions.md 2026-08-26.

   PROVENANCE WARNING, read before trusting anything below. Unlike the Gemini
   adapter -- where every selector is backed by owner-captured live-DOM
   snapshots -- this file is at first only a faithful EXTRACTION of the
   selectors content.js already used. They are inherited, not verified. The
   2026-08-26 trial found zero `[data-message-author-role="assistant"]`
   elements on a live page across six attempts, so at least one of these may
   already be wrong. Use diagnostics.dom_probe against the real tab and
   replace guesses with evidence; mark each group below as it is confirmed. */
(() => {
  "use strict";

  const SELECTORS = Object.freeze({
    // UNVERIFIED (inherited). Prompt composer, in preference order.
    composer: Object.freeze([
      "#prompt-textarea",
      'textarea[data-testid="prompt-textarea"]',
      'div[data-testid="composer-text-input"][contenteditable="true"]',
      'form div.ProseMirror[contenteditable="true"]',
      'form [contenteditable="true"][role="textbox"]',
      "form textarea",
    ]),
    // UNVERIFIED (inherited). Send button, searched page-wide first.
    send: Object.freeze([
      'button[data-testid="send-button"]',
      'button[aria-label="Send prompt"]',
      'button[aria-label^="Send"]',
      'button[aria-label^="Gửi"]',
    ]),
    // UNVERIFIED (inherited). Send fallback, scoped to the composer's form.
    sendInForm: Object.freeze([
      'button[type="submit"]',
      'button[data-testid*="send"]',
    ]),
    // UNVERIFIED (inherited). Stop button, present only during generation.
    stop: Object.freeze([
      'button[data-testid="stop-button"]',
      'button[aria-label="Stop generating"]',
      'button[aria-label^="Stop"]',
      'button[aria-label^="Dừng"]',
    ]),
    // UNVERIFIED (inherited) and CRITICAL: attribution, the submission
    // boundary and the security scan all depend on these two. If the live
    // page stops matching them, every job fails NO_NEW_IMAGE while the chat
    // visibly contains answers -- exactly the 2026-08-26 signature.
    assistantMessage: '[data-message-author-role="assistant"]',
    userMessage: '[data-message-author-role="user"]',
    // UNVERIFIED (inherited). Root that image scans are confined to, so an
    // attribution scan never sweeps the whole document.
    conversationRoot: '[data-testid="conversation-turns"], [data-testid*="conversation"], main, [role="main"]',
    // UNVERIFIED (inherited). Containers that mark an image as INPUT rather
    // than output; a false negative here can attribute a reference image to a
    // job as if the model had produced it.
    attachmentContainer: 'form, [data-testid*="attachment"], [data-testid*="upload-preview"], [data-testid*="file-upload"]',
    attachmentPreview: Object.freeze([
      '[data-testid*="attachment"]',
      '[data-testid*="file-upload"]',
      '[data-testid*="upload-preview"]',
      'button[aria-label*="Remove attachment"]',
      'button[aria-label*="Remove file"]',
    ]),
    uploadPending: Object.freeze([
      '[data-testid*="uploading"]',
      '[aria-busy="true"]',
      '[role="progressbar"]',
    ]),
    fileInput: 'form input[type="file"]',
    // Controls the A/B image poll may expose. The poll's TEXT anchors stay in
    // ab-poll-core.js with the answering policy.
    pollControl: 'button, [role="button"], a[href], [tabindex]:not([tabindex="-1"])',
  });

  const TIMING = Object.freeze({
    postTypeSettleMs: 150, // after the prompt is inserted, before Send readiness is polled
    postSendSettleMs: 500, // after Send is clicked, before completion polling starts
    completionPollMs: 300, // poll interval for completion and chat-readiness loops
    stableTextDwellMs: 1500, // text response must hold unchanged this long to count as complete
    imageSettleMs: 1500, // a multi-image set must hold unchanged this long to be complete
    referenceReadyTimeoutMs: 15000, // reference-image attach must settle within this window
    sendReadyTimeoutMs: 5000, // Send button must become enabled within this window
  });

  const SURFACE = Object.freeze({ CONVERSATION: "CONVERSATION", WRONG: "WRONG" });

  const ORIGIN = Object.freeze({
    hosts: Object.freeze(["chatgpt.com", "chat.openai.com"]),
    urlPattern: /^https:\/\/(chatgpt\.com|chat\.openai\.com)\//i,
  });

  function isProviderUrl(url) {
    return Boolean(url && ORIGIN.urlPattern.test(url));
  }

  // ChatGPT has no images-vs-app split the way Gemini does: every normal
  // conversation URL is the same surface. Kept as a function anyway so both
  // adapters expose one shape.
  function surface(url) {
    return isProviderUrl(url) ? SURFACE.CONVERSATION : SURFACE.WRONG;
  }

  function surfaceAllowed(url, _context = {}) {
    return surface(url) === SURFACE.CONVERSATION;
  }

  // Page-wide interstitial blockers (CAPTCHA and similar).
  const securityBlockerPattern = /(captcha|unusual activity|verify you are human|suspicious activity)/i;

  // Image-generation quota phrases. Scoped by content.js to the ONE model
  // response under evaluation -- never the whole page, where the operator's
  // own prompt could false-match these common words.
  //
  // NOTE for whoever validates this live: this phrase list is a best-effort
  // starting set, not confirmed against a real rate-limited ChatGPT session --
  // OpenAI's exact wording cannot be verified without actually hitting the
  // limit. If a real limit is hit and the batch does NOT halt, capture the
  // exact text ChatGPT showed and add it here, the same way the CAPTCHA
  // phrase list above was built from real evidence.
  const generationLimitPattern = /(reached (?:your|the) (?:daily |monthly )?(?:image generation )?limit|hit (?:your|the) (?:daily |monthly )?(?:image generation )?limit|image generation limit|generate more images (?:after|later|tomorrow)|try again (?:after|tomorrow|in (?:a|\d))|come back (?:after|in|tomorrow) to (?:generate|create) (?:more )?images|daily limit for image generation|you.ve used all your (?:free )?image generations)/i;

  function matchesGenerationLimit(text) {
    const value = String(text || "");
    return value ? generationLimitPattern.test(value) : false;
  }

  (typeof window !== "undefined" ? window : globalThis).DacProviderAdapter = Object.freeze({
    provider: "chatgpt",
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
