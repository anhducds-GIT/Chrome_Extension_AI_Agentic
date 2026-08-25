/* Provider adapter -- the single place that knows which AI chat product this
   worker drives. Every provider-specific DOM selector, blocker pattern,
   timing constant and origin rule lives here; content.js and sidepanel.js
   consume this surface and stay provider-neutral.

   This file currently ships the ChatGPT adapter (chatgpt.com /
   chat.openai.com). Swapping the worker to another provider (Gemini) means
   replacing the values in this file only -- the selector strings, regexes
   and timings below are byte-identical to the battle-tested values that
   previously lived inline in content.js and sidepanel.js. */
(() => {
  "use strict";

  const SELECTORS = Object.freeze({
    // Prompt composer, in preference order (first visible match wins).
    composer: Object.freeze([
      "#prompt-textarea",
      'textarea[data-testid="prompt-textarea"]',
      'div[data-testid="composer-text-input"][contenteditable="true"]',
      'form div.ProseMirror[contenteditable="true"]',
      'form [contenteditable="true"][role="textbox"]',
      "form textarea",
    ]),
    // Send button located anywhere on the page.
    sendButtonDirect: Object.freeze([
      'button[data-testid="send-button"]',
      'button[aria-label="Send prompt"]',
      'button[aria-label^="Send"]',
      'button[aria-label^="Gửi"]',
    ]),
    // Fallback send button scoped to the composer's own <form>.
    sendButtonWithinForm: Object.freeze([
      'button[type="submit"]',
      'button[data-testid*="send"]',
    ]),
    stopButton: Object.freeze([
      'button[data-testid="stop-button"]',
      'button[aria-label="Stop generating"]',
      'button[aria-label^="Stop"]',
      'button[aria-label^="Dừng"]',
    ]),
    assistantMessage: '[data-message-author-role="assistant"]',
    userMessage: '[data-message-author-role="user"]',
    // An <img> inside any of these ancestors is an INPUT preview (something
    // the operator attached), never provider output.
    attachmentPreviewAncestor: 'form, [data-testid*="attachment"], [data-testid*="upload-preview"], [data-testid*="file-upload"]',
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
    // The provider keeps this native input visually hidden behind its attach
    // button; preferred lookup is scoped to the composer's <form>.
    fileInput: 'input[type="file"]',
    fileInputFallback: 'form input[type="file"]',
  });

  const TIMING = Object.freeze({
    postTypeSettleMs: 150, // after the prompt is inserted, before Send readiness is polled
    postSendSettleMs: 500, // after Send is clicked, before completion polling starts
    completionPollMs: 300, // poll interval for completion and chat-readiness loops
    stableTextDwellMs: 1500, // text response must hold unchanged this long to count as complete
    referenceReadyTimeoutMs: 15000, // reference-image attach must settle within this window
    sendReadyTimeoutMs: 5000, // Send button must become enabled within this window
  });

  const ORIGIN = Object.freeze({
    hosts: Object.freeze(["chatgpt.com", "chat.openai.com"]),
    urlPattern: /^https:\/\/(chatgpt\.com|chat\.openai\.com)\//i,
  });

  function isProviderUrl(url) {
    return Boolean(url && ORIGIN.urlPattern.test(url));
  }

  // Page-wide interstitial blockers (CAPTCHA and similar). Callers lower-case
  // the page text before testing.
  const securityBlockerPattern = /(captcha|unusual activity|verify you are human|suspicious activity)/;

  // Free/paid image-generation quota phrases ("you've hit your daily limit").
  //
  // NOTE for whoever validates this live: this phrase list is a best-effort
  // starting set, not confirmed against a real rate-limited ChatGPT session
  // -- OpenAI's exact wording is not something that can be verified without
  // actually hitting the limit. If a real limit is hit and the batch does
  // NOT halt, capture the exact text ChatGPT showed and add it below, the
  // same way the CAPTCHA phrase list above was built from real evidence.
  function matchesGenerationLimit(text) {
    return /(reached (?:your|the) (?:daily |monthly )?(?:image generation )?limit|hit (?:your|the) (?:daily |monthly )?(?:image generation )?limit|image generation limit|generate more images (?:after|later|tomorrow)|try again (?:after|tomorrow|in (?:a|\d))|come back (?:after|in|tomorrow) to (?:generate|create) (?:more )?images|daily limit for image generation|you.ve used all your (?:free )?image generations)/i.test(text || "");
  }

  (typeof window !== "undefined" ? window : globalThis).DacProviderAdapter = Object.freeze({
    provider: "chatgpt",
    SELECTORS,
    TIMING,
    ORIGIN,
    isProviderUrl,
    securityBlockerPattern,
    matchesGenerationLimit,
  });
})();
