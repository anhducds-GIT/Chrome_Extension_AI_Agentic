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
    // VERIFIED 2026-08-26 by diagnostics.dom_probe on a live conversation,
    // and functionally by a real submission in trial-09c93cd4: the probe
    // measured "#prompt-textarea => 1" (first entry matches, so the rest are
    // untried fallbacks) and the trial's prompt reached ChatGPT.
    // Prompt composer, in preference order.
    composer: Object.freeze([
      "#prompt-textarea",
      'textarea[data-testid="prompt-textarea"]',
      'div[data-testid="composer-text-input"][contenteditable="true"]',
      'form div.ProseMirror[contenteditable="true"]',
      'form [contenteditable="true"][role="textbox"]',
      "form textarea",
    ]),
    // FUNCTIONALLY VERIFIED 2026-08-26, but NOT snapshot-verified, and the
    // difference matters. Every entry here measures 0 on a probe -- both while
    // idle AND mid-generation -- because ChatGPT only renders a send button
    // while the composer holds text, and swaps it for the stop button the
    // moment generation starts. A read-only probe cannot type, so it can never
    // catch that window. What DOES prove these selectors: trial-09c93cd4
    // submitted successfully, which requires findSendButton() to have returned
    // a real enabled button. Treat a future submission failure, not a probe
    // count of 0, as the signal that this group has rotted.
    // Send button, searched page-wide first.
    send: Object.freeze([
      'button[data-testid="send-button"]',
      'button[aria-label="Send prompt"]',
      'button[aria-label^="Send"]',
      'button[aria-label^="Gửi"]',
    ]),
    // Same status as `send` above: never observable in a probe snapshot, and
    // in trial-09c93cd4 it was not needed because `send` resolved first.
    // Send fallback, scoped to the composer's form.
    sendInForm: Object.freeze([
      'button[type="submit"]',
      'button[data-testid*="send"]',
    ]),
    // VERIFIED 2026-08-26 by probing DURING generation (trial-09c93cd4), the
    // only state in which this button exists at all:
    //     button[data-testid="stop-button"] => 1
    //     button[aria-label^="Stop"]        => 1
    //     button[aria-label="Stop generating"] => 0   (exact label has changed)
    // The first entry matches, so the exact-label entry below is dead weight
    // rather than a live dependency -- kept only as a fallback.
    // Stop button, present only during generation.
    stop: Object.freeze([
      'button[data-testid="stop-button"]',
      'button[aria-label="Stop generating"]',
      'button[aria-label^="Stop"]',
      'button[aria-label^="Dừng"]',
    ]),
    // VERIFIED 2026-08-26 by diagnostics.dom_probe against a live conversation
    // (chatgpt.com/c/6a8e47cd...). CRITICAL: attribution, the submission
    // boundary and the security scan all depend on these two.
    //
    // The probe measured, on one real page:
    //     data-turn                 => assistant x5, user x4
    //     data-message-author-role  => user x4        (assistant: ZERO)
    // ChatGPT moved the turn marker to data-turn and dropped the old
    // attribute from the ASSISTANT turn only, which is why detection went
    // blind for exactly one half of the conversation while looking healthy.
    //
    // Ordered lists, newest first. content.js resolves each to the FIRST
    // entry that actually matches something on the page and uses only that
    // one -- matching both at once would count a turn twice if a future
    // markup carries both markers on nested nodes, and attribution reads two
    // matches as two separate turns.
    assistantMessage: Object.freeze([
      '[data-turn="assistant"]',
      '[data-message-author-role="assistant"]',
    ]),
    userMessage: Object.freeze([
      '[data-turn="user"]',
      '[data-message-author-role="user"]',
    ]),
    // Fallback root for a page that has no turns yet. content.js normally
    // computes the root as the common ancestor of the turns themselves, which
    // depends on no name at all.
    //
    // The wildcard `[data-testid*="conversation"]` was REMOVED here on
    // 2026-08-26: ChatGPT names each turn container with a data-testid that
    // contains the word "conversation", so `.closest()` from a turn matched
    // THAT TURN and the scan root collapsed to a single turn -- the probe
    // measured 3 visible images instead of 14. A wildcard over a name the
    // provider also uses per-item is not a container selector.
    //
    // CONFIRMED FIXED 2026-08-26 on the same conversation, after the reload
    // that finally loaded f418bc1: imageCandidateCount went 3 -> 15 against a
    // page holding 15 conversation images (5 distinct generated images), and
    // this fallback list now matches 1 node instead of 12. The scan root
    // covers the whole conversation again, so the pre-submit baseline is built
    // from every image already on screen -- which is what stops an old image
    // being attributed to a running job.
    conversationRoot: '[data-testid="conversation-turns"], main, [role="main"]',
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
