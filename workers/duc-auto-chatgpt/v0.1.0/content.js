(() => {
  "use strict";

  const STATE = {
    busy: false,
    abortRequested: false,
    activeAttempt: null,
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const isVisible = (el) => {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
  };

  function firstVisible(selectors, root = document) {
    for (const selector of selectors) {
      const candidates = Array.from(root.querySelectorAll(selector));
      const match = candidates.find(isVisible);
      if (match) return match;
    }
    return null;
  }

  function findComposer() {
    return firstVisible([
      "#prompt-textarea",
      'textarea[data-testid="prompt-textarea"]',
      'div[data-testid="composer-text-input"][contenteditable="true"]',
      'form div.ProseMirror[contenteditable="true"]',
      'form [contenteditable="true"][role="textbox"]',
      "form textarea",
    ]);
  }

  function findSendButton(composer = findComposer()) {
    const direct = firstVisible([
      'button[data-testid="send-button"]',
      'button[aria-label="Send prompt"]',
      'button[aria-label^="Send"]',
      'button[aria-label^="Gửi"]',
    ]);
    if (direct) return direct;

    const form = composer?.closest("form");
    if (!form) return null;

    return firstVisible([
      'button[type="submit"]',
      'button[data-testid*="send"]',
    ], form);
  }

  function findStopButton() {
    return firstVisible([
      'button[data-testid="stop-button"]',
      'button[aria-label="Stop generating"]',
      'button[aria-label^="Stop"]',
      'button[aria-label^="Dừng"]',
    ]);
  }

  function assistantMessages() {
    return Array.from(document.querySelectorAll('[data-message-author-role="assistant"]'));
  }

  function securityBlockerText() {
    const text = (document.body?.innerText || "").toLowerCase();
    return /(captcha|unusual activity|verify you are human|suspicious activity)/.test(text) ? "ChatGPT security/interstitial blocker detected." : null;
  }

  function assistantMessageText(message) {
    return message ? (message.innerText || message.textContent || "").trim() : "";
  }

  function latestAssistantText() {
    const messages = assistantMessages();
    return assistantMessageText(messages[messages.length - 1]);
  }

  function setTextareaValue(el, text) {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
    descriptor?.set?.call(el, text);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function setContentEditableValue(el, text) {
    el.focus();

    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    selection.removeAllRanges();
    selection.addRange(range);

    let inserted = false;
    try {
      inserted = document.execCommand("insertText", false, text);
    } catch (_) {
      inserted = false;
    }

    if (!inserted || !(el.innerText || el.textContent || "").trim()) {
      el.replaceChildren(document.createTextNode(text));
    }

    try {
      el.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        inputType: "insertText",
        data: text,
      }));
    } catch (_) {
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  function setComposerValue(composer, text) {
    if (composer instanceof HTMLTextAreaElement || composer instanceof HTMLInputElement) {
      setTextareaValue(composer, text);
      return;
    }
    if (composer.isContentEditable) {
      setContentEditableValue(composer, text);
      return;
    }
    throw new Error("Unsupported ChatGPT composer type.");
  }

  async function waitForSendButtonReady(composer, timeoutMs = 5000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (STATE.abortRequested) throw new Error("Automation stopped by user.");
      const button = findSendButton(composer);
      if (button && !button.disabled && button.getAttribute("aria-disabled") !== "true") return button;
      await sleep(100);
    }
    throw new Error("Send button did not become ready. ChatGPT DOM may have changed.");
  }

  function imageCandidates(root = document, inputEvidence = { sources: new Set(), names: new Set() }) {
    return Array.from(root.querySelectorAll("img")).map((image) => {
      const source = image.currentSrc || image.src || "";
      const rect = image.getBoundingClientRect();
      const role = image.closest('[data-message-author-role="assistant"]') ? "assistant" : image.closest('[data-message-author-role="user"]') ? "user" : "unknown";
      const label = `${image.alt || ""} ${image.getAttribute("aria-label") || ""}`.toLowerCase();
      const namedReference = Array.from(inputEvidence.names || []).some((name) => label.includes(name));
      return { source, role, input: role === "user" || inputEvidence.sources?.has(source) || namedReference, visible: isVisible(image) && rect.width >= 64 && rect.height >= 64, ready: image.complete && image.naturalWidth > 0 };
    }).filter((candidate) => /^(https:|data:image\/|blob:)/i.test(candidate.source));
  }

  function referenceEvidence(referenceImages) {
    const names = new Set((referenceImages || []).flatMap((image) => [image.fileName, image.alias]).filter(Boolean).map((name) => name.toLowerCase()));
    const sources = new Set((referenceImages || []).map((image) => image.dataUrl).filter(Boolean));
    for (const candidate of imageCandidates()) if (candidate.role === "user") sources.add(candidate.source);
    return { names, sources };
  }

  function imageDecision(resultMessage, imageBaseline, inputEvidence, hasReferences) {
    return window.DacImageEvidence.selectAttributableImage({ postTurn: resultMessage ? imageCandidates(resultMessage, inputEvidence) : [], visible: imageCandidates(document, inputEvidence), baseline: imageBaseline, hasReferences });
  }

  function attachmentPreviewCount() {
    return Array.from(document.querySelectorAll([
      '[data-testid*="attachment"]',
      '[data-testid*="file-upload"]',
      '[data-testid*="upload-preview"]',
      'button[aria-label*="Remove attachment"]',
      'button[aria-label*="Remove file"]',
    ].join(", "))).filter(isVisible).length;
  }

  function uploadIsPending() {
    return Array.from(document.querySelectorAll([
      '[data-testid*="uploading"]',
      '[aria-busy="true"]',
      '[role="progressbar"]',
    ].join(", "))).some(isVisible);
  }

  function fileInputHasReference(fileInput, fileName) {
    return Array.from(fileInput?.files || []).some((file) => file.name === fileName);
  }

  async function waitForReferenceImagesReady(fileInput, referenceImages, previousPreviewCount, timeoutMs = 15000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (STATE.abortRequested) throw new Error("Automation stopped by user.");
      const blocker = securityBlockerText();
      if (blocker) throw new Error(`HARD_STOP: ${blocker}`);
      const previewsReady = attachmentPreviewCount() >= previousPreviewCount + referenceImages.length;
      const filesReady = referenceImages.every((referenceImage) => fileInputHasReference(fileInput, referenceImage.fileName));
      if (filesReady && previewsReady && !uploadIsPending()) return;
      await sleep(100);
    }
    throw new Error("Required reference images did not all become ready before the prompt was sent.");
  }

  async function attachReferenceImages(referenceImages) {
    const images = Array.isArray(referenceImages) ? referenceImages : [];
    if (!images.length) return;
    // ChatGPT normally keeps this native input visually hidden behind its attach button.
    const composer = findComposer();
    const fileInput = composer?.closest("form")?.querySelector('input[type="file"]') || document.querySelector('form input[type="file"]');
    if (!fileInput) throw new Error("ChatGPT image attachment input was not found.");
    const previousPreviewCount = attachmentPreviewCount();
    const data = new DataTransfer();
    for (const referenceImage of images) {
      const response = await fetch(referenceImage.dataUrl);
      const blob = await response.blob();
      data.items.add(new File([blob], referenceImage.fileName, { type: blob.type || "image/png" }));
    }
    fileInput.files = data.files;
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    await waitForReferenceImagesReady(fileInput, images, previousPreviewCount);
  }

  async function waitForCompletion({ beforeCount, timeoutMs, expectImage = false, imageBaseline = [], inputEvidence, hasReferences = false }) {
    const startedAt = Date.now();
    let generationSeen = false;
    let stableText = "";
    let stableSince = 0;
    let pollCount = 0;
    let ambiguousExistingMessageChange = false;

    while (Date.now() - startedAt < timeoutMs) {
      pollCount += 1;
      if (STATE.abortRequested) throw new Error("Automation stopped by user.");
      const blocker = securityBlockerText();
      if (blocker) throw new Error(`HARD_STOP: ${blocker}`);

      const stopButton = findStopButton();
      if (stopButton) generationSeen = true;

      const messages = assistantMessages();
      const resultMessage = messages[beforeCount] || null;
      const text = assistantMessageText(resultMessage);
      if (!resultMessage && messages.length && latestAssistantText()) {
        ambiguousExistingMessageChange = true;
      }

      // Image fallback is intentionally independent of an assistant-message container.
      // With no resultMessage it receives only the global pre-send baseline diff.
      if (expectImage && !stopButton) {
        const decision = imageDecision(resultMessage, imageBaseline, inputEvidence, hasReferences);
        if (decision.ok) {
          return {
            type: "image",
            text,
            char_count: text.length,
            assistant_message_index: resultMessage ? beforeCount : null,
            assistant_count_before: beforeCount,
            assistant_count_after: messages.length,
            completion: { generation_seen: generationSeen, reason: "image_ready", poll_count: pollCount },
            image_url: decision.candidate.source,
            image_attribution: decision.attribution,
          };
        }
      }

      if (resultMessage && !stopButton) {
        const imageUrl = imageCandidates(resultMessage).at(-1)?.source || null;
        if (text === stableText) {
          if (!stableSince) stableSince = Date.now();
        } else {
          stableText = text;
          stableSince = Date.now();
        }

        // Require 1.5s of stable text from the first assistant message created after the pre-send boundary.
        if (stableText && Date.now() - stableSince >= 1500) {
          return {
            type: "text",
            text: stableText,
            char_count: stableText.length,
            assistant_message_index: beforeCount,
            assistant_count_before: beforeCount,
            assistant_count_after: messages.length,
            completion: {
              generation_seen: generationSeen,
              reason: "stable_text",
              poll_count: pollCount,
            },
            image_url: imageUrl,
          };
        }
      } else {
        stableSince = 0;
      }

      await sleep(300);
    }

    if (ambiguousExistingMessageChange) {
      throw new Error("Could not isolate a new assistant message after the pre-send boundary.");
    }
    throw new Error(`Timed out after ${Math.round(timeoutMs / 1000)}s waiting for ChatGPT to finish.`);
  }

  function sendUsable(composer, button) {
    return Boolean(composer && button && !button.disabled && button.getAttribute("aria-disabled") !== "true");
  }

  async function waitForChatReady({ timeoutMs = 30000, safetyCooldownSec = 0, outputVerified = true } = {}) {
    const deadline = Date.now() + timeoutMs;
    let observer;
    let wake = null;
    const changed = () => { if (wake) { wake(); wake = null; } };
    try {
      observer = new MutationObserver(changed);
      observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled", "aria-disabled", "aria-busy"] });
      while (Date.now() < deadline) {
        if (STATE.abortRequested) throw new Error("Automation stopped by user.");
        const blocker = securityBlockerText();
        if (blocker) throw new Error(`HARD_STOP: ${blocker}`);
        const composer = findComposer();
        const sendButton = findSendButton(composer);
        const generating = Boolean(findStopButton());
        if (!generating && outputVerified && sendUsable(composer, sendButton)) {
          if (safetyCooldownSec > 0) await sleep(safetyCooldownSec * 1000);
          const finalBlocker = securityBlockerText();
          if (finalBlocker) throw new Error(`HARD_STOP: ${finalBlocker}`);
          if (!findStopButton() && sendUsable(findComposer(), findSendButton())) return { ok: true, state: "CHAT_READY", composerFound: true, sendUsable: true };
        }
        await Promise.race([new Promise((resolve) => { wake = resolve; }), sleep(300)]);
      }
    } finally {
      observer?.disconnect();
      wake = null;
    }
    throw new Error("Timed out waiting for ChatGPT readiness after verified output.");
  }

  async function runPrompt(prompt, timeoutMs, referenceImages = [], expectImage = false) {
    if (STATE.busy) throw new Error("This ChatGPT tab is already running an automation prompt.");
    STATE.busy = true;
    STATE.abortRequested = false;

    try {
      if (findStopButton()) {
        throw new Error("ChatGPT is already generating. Wait for it to finish before starting the queue.");
      }

      const composer = findComposer();
      if (!composer) {
        throw new Error("ChatGPT composer not found. Open a normal chat page and retry.");
      }

      await attachReferenceImages(referenceImages);
      const beforeCount = assistantMessages().length;
      const inputEvidence = referenceEvidence(referenceImages);
      const imageBaseline = imageCandidates(document, inputEvidence);
      STATE.activeAttempt = { phase: "PRE_SUBMIT", beforeCount, imageBaseline, inputEvidence, hasReferences: referenceImages.length > 0, expectImage, submittedAt: null };
      setComposerValue(composer, prompt);
      await sleep(150);

      const sendButton = await waitForSendButtonReady(composer);
      sendButton.click();
      STATE.activeAttempt.phase = "SUBMITTED";
      STATE.activeAttempt.submittedAt = new Date().toISOString();

      // Let ChatGPT process the click before completion polling.
      await sleep(500);

      const result = await waitForCompletion({ beforeCount, timeoutMs, expectImage, imageBaseline, inputEvidence, hasReferences: referenceImages.length > 0 });
      if (result?.image_url && STATE.activeAttempt) STATE.activeAttempt.phase = "OUTPUT_DETECTED";
      return result;
    } finally {
      STATE.busy = false;
      STATE.abortRequested = false;
    }
  }

  function attemptSnapshot() {
    const attempt = STATE.activeAttempt;
    return attempt ? { phase: attempt.phase, beforeCount: attempt.beforeCount, submittedAt: attempt.submittedAt, expectImage: attempt.expectImage } : { phase: "PRE_SUBMIT", submittedAt: null };
  }

  async function reconcileImageAttempt(timeoutMs) {
    const attempt = STATE.activeAttempt;
    if (!attempt?.submittedAt || !attempt.expectImage) throw new Error("No submitted image attempt is available for reconciliation.");
    const result = await waitForCompletion({ beforeCount: attempt.beforeCount, timeoutMs, expectImage: true, imageBaseline: attempt.imageBaseline, inputEvidence: attempt.inputEvidence, hasReferences: attempt.hasReferences });
    if (result?.image_url) attempt.phase = "OUTPUT_DETECTED";
    return result;
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message !== "object") return false;

    if (message.type === "DAC_PING") {
      const composer = findComposer();
      const sendButton = findSendButton(composer);
      sendResponse({
        ok: true,
        url: location.href,
        composerFound: Boolean(composer),
        sendButtonFound: Boolean(sendButton),
        generating: Boolean(findStopButton()),
        assistantCount: assistantMessages().length,
        busy: STATE.busy,
        securityBlocker: securityBlockerText(),
      });
      return false;
    }

    if (message.type === "DAC_ABORT") {
      STATE.abortRequested = true;
      sendResponse({ ok: true });
      return false;
    }

    if (message.type === "DAC_RUN_PROMPT") {
      const prompt = typeof message.prompt === "string" ? message.prompt.trim() : "";
      const timeoutMs = Math.max(15000, Math.min(Number(message.timeoutMs) || 180000, 900000));

      if (!prompt) {
        sendResponse({ ok: false, error: "Prompt is empty." });
        return false;
      }

      runPrompt(prompt, timeoutMs)
        .then((result) => sendResponse({ ok: true, result }))
        .catch((error) => sendResponse({ ok: false, error: error?.message || String(error) }));
      return true;
    }

    if (message.type === "DAC_WAIT_CHAT_READY") {
      const timeoutMs = Math.max(1000, Math.min(Number(message.timeoutMs) || 30000, 900000));
      const safetyCooldownSec = Math.max(0, Math.min(Number(message.safetyCooldownSec) || 0, 120));
      waitForChatReady({ timeoutMs, safetyCooldownSec, outputVerified: message.outputVerified !== false })
        .then((result) => sendResponse(result))
        .catch((error) => sendResponse({ ok: false, error: error?.message || String(error) }));
      return true;
    }

    if (message.type === "DAC_RUN_IMAGE_JOB") {
      const prompt = typeof message.prompt === "string" ? message.prompt.trim() : "";
      const timeoutMs = Math.max(15000, Math.min(Number(message.timeoutMs) || 180000, 900000));
      if (!prompt) {
        sendResponse({ ok: false, error: "Prompt is empty." });
        return false;
      }
      runPrompt(prompt, timeoutMs, message.referenceImages || (message.referenceImage ? [message.referenceImage] : []), true)
        .then((result) => sendResponse({ ok: true, result, attempt: attemptSnapshot() }))
        .catch((error) => sendResponse({ ok: false, error: error?.message || String(error), attempt: attemptSnapshot() }));
      return true;
    }

    if (message.type === "DAC_RECONCILE_IMAGE_JOB") {
      const timeoutMs = Math.max(1000, Math.min(Number(message.timeoutMs) || 30000, 120000));
      reconcileImageAttempt(timeoutMs)
        .then((result) => sendResponse({ ok: true, result, attempt: attemptSnapshot() }))
        .catch((error) => sendResponse({ ok: false, error: error?.message || String(error), attempt: attemptSnapshot() }));
      return true;
    }

    return false;
  });
})();
