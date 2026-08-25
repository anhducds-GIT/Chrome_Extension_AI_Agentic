(() => {
  "use strict";

  // All provider-specific DOM selectors, blocker patterns, timing values and
  // origin rules live in provider-adapter.js (loaded before this file per
  // manifest.json content_scripts order).
  const ADAPTER = window.DacProviderAdapter;

  const STATE = {
    busy: false,
    abortRequested: false,
    activeAttempt: null,
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const nodeIds = new WeakMap();
  let nextNodeId = 1;

  function shortHash(value) {
    let hash = 2166136261;
    for (const character of String(value || "")) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }
  function nodeId(node, prefix) {
    if (!node) return "";
    if (!nodeIds.has(node)) nodeIds.set(node, shortHash(`dac-node:${prefix}:${nextNodeId++}`));
    return nodeIds.get(node);
  }

  function emitRuntimeStage(attempt, stage) {
    if (!attempt?.job_id || !attempt?.attempt_id) return;
    try {
      const pending = chrome.runtime.sendMessage({ type: "DAC_IMAGE_RUN_STAGE", job_id: attempt.job_id, attempt_id: attempt.attempt_id, stage });
      pending?.catch?.(() => {});
    }
    catch (_) { /* Runtime telemetry must never affect the guarded job path. */ }
  }

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
    return firstVisible(ADAPTER.SELECTORS.composer);
  }

  function findSendButton(composer = findComposer()) {
    const direct = firstVisible(ADAPTER.SELECTORS.sendButtonDirect);
    if (direct) return direct;

    const form = composer?.closest("form");
    if (!form) return null;

    return firstVisible(ADAPTER.SELECTORS.sendButtonWithinForm, form);
  }

  function findStopButton() {
    return firstVisible(ADAPTER.SELECTORS.stopButton);
  }

  function assistantMessages() {
    return Array.from(document.querySelectorAll(ADAPTER.SELECTORS.assistantMessage));
  }

  function assistantFingerprint(message) {
    const explicitId = message?.getAttribute("data-message-id") || message?.id || "";
    const images = Array.from(message?.querySelectorAll?.("img") || []).map((image) => image.currentSrc || image.src || "").join("|");
    return shortHash(`${explicitId}|${assistantMessageText(message).slice(0, 256)}|${images}`);
  }

  function securityBlockerText() {
    const text = (document.body?.innerText || "").toLowerCase();
    return ADAPTER.securityBlockerPattern.test(text) ? "ChatGPT security/interstitial blocker detected." : null;
  }

  // Free/paid image-generation quotas ("you've hit your daily limit") render
  // as an ordinary assistant message, not an interstitial -- scanning the
  // whole page like securityBlockerText() would catch the OPERATOR'S OWN
  // PROMPT if it happened to contain these same common words (draw a picture
  // about someone waiting for a daily limit to reset, etc). Scoped to only
  // the specific assistant message under evaluation instead.
  //
  // The phrase list itself lives in provider-adapter.js (it is provider
  // wording); the scoping policy above stays here.
  function matchesGenerationLimit(text) {
    return ADAPTER.matchesGenerationLimit(text);
  }
  function generationLimitText() {
    return matchesGenerationLimit(latestAssistantText()) ? "ChatGPT image generation limit reached for now." : null;
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

  async function waitForSendButtonReady(composer, timeoutMs = ADAPTER.TIMING.sendReadyTimeoutMs) {
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
      const role = image.closest(ADAPTER.SELECTORS.assistantMessage) ? "assistant" : image.closest(ADAPTER.SELECTORS.userMessage) ? "user" : "unknown";
      const label = `${image.alt || ""} ${image.getAttribute("aria-label") || ""}`.toLowerCase();
      const namedReference = Array.from(inputEvidence.names || []).some((name) => label.includes(name));
      const attachmentPreview = Boolean(image.closest(ADAPTER.SELECTORS.attachmentPreviewAncestor));
      return { source, source_id: shortHash(source), node_id: nodeId(image, "image"), role, input: role === "user" || attachmentPreview || inputEvidence.sources?.has(source) || namedReference, visible: isVisible(image) && rect.width >= 64 && rect.height >= 64, ready: image.complete && image.naturalWidth > 0 };
    }).filter((candidate) => /^(https:|data:image\/|blob:)/i.test(candidate.source));
  }

  function referenceEvidence(referenceImages) {
    const names = new Set((referenceImages || []).flatMap((image) => [image.fileName, image.alias]).filter(Boolean).map((name) => name.toLowerCase()));
    const sources = new Set((referenceImages || []).map((image) => image.dataUrl).filter(Boolean));
    for (const candidate of imageCandidates()) if (candidate.role === "user") sources.add(candidate.source);
    return { names, sources };
  }

  function captureBoundary(inputEvidence) {
    const assistants = assistantMessages();
    const images = imageCandidates(document, inputEvidence);
    return Object.freeze({ assistant_count: assistants.length, assistant_fingerprints: assistants.map(assistantFingerprint), assistant_node_ids: assistants.map((message) => nodeId(message, "assistant")), images, image_source_ids: images.map((candidate) => candidate.source_id), image_node_ids: images.map((candidate) => candidate.node_id) });
  }
  function newAssistantMessages(boundary) {
    const known = new Set(boundary?.assistant_fingerprints || []);
    return assistantMessages().filter((message) => !known.has(assistantFingerprint(message)));
  }
  function imageDecision(boundary, inputEvidence) {
    const postTurnMessages = newAssistantMessages(boundary);
    return { decision: window.DacImageEvidence.selectAttributableImage({ postTurn: postTurnMessages.flatMap((message) => imageCandidates(message, inputEvidence)), visible: imageCandidates(document, inputEvidence), baseline: boundary?.images || [] }), assistant_count_after: assistantMessages().length, new_assistant_fingerprints: postTurnMessages.map(assistantFingerprint) };
  }
  function boundaryTelemetry(boundary) {
    return { assistant_count_before: boundary?.assistant_count || 0, assistant_node_ids: boundary?.assistant_node_ids || [], assistant_fingerprints: boundary?.assistant_fingerprints || [], baseline_image_count: boundary?.images?.length || 0, baseline_source_ids: boundary?.image_source_ids || [], baseline_image_node_ids: boundary?.image_node_ids || [] };
  }
  function recordDetection(attempt, values) { if (attempt) attempt.detection = values; }

  function attachmentPreviewCount() {
    return Array.from(document.querySelectorAll(ADAPTER.SELECTORS.attachmentPreview.join(", "))).filter(isVisible).length;
  }

  function uploadIsPending() {
    return Array.from(document.querySelectorAll(ADAPTER.SELECTORS.uploadPending.join(", "))).some(isVisible);
  }

  function fileInputHasReference(fileInput, fileName) {
    return Array.from(fileInput?.files || []).some((file) => file.name === fileName);
  }

  async function waitForReferenceImagesReady(fileInput, referenceImages, previousPreviewCount, timeoutMs = ADAPTER.TIMING.referenceReadyTimeoutMs) {
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
    const fileInput = composer?.closest("form")?.querySelector(ADAPTER.SELECTORS.fileInput) || document.querySelector(ADAPTER.SELECTORS.fileInputFallback);
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

  async function waitForCompletion({ boundary, timeoutMs, expectImage = false, inputEvidence, attempt = null }) {
    const startedAt = Date.now();
    let generationSeen = false;
    let stableText = "";
    let stableSince = 0;
    let pollCount = 0;
    let lastDetection = { ...boundaryTelemetry(boundary), stop_visible: false, generating: false, decision_reason: "NOT_EVALUATED" };

    while (Date.now() - startedAt < timeoutMs) {
      pollCount += 1;
      if (STATE.abortRequested) throw new Error("Automation stopped by user.");
      const blocker = securityBlockerText();
      if (blocker) throw new Error(`HARD_STOP: ${blocker}`);

      const stopButton = findStopButton();
      if (stopButton) generationSeen = true;

      const messages = assistantMessages();
      const newMessages = newAssistantMessages(boundary);
      const resultMessage = newMessages.at(-1) || null;
      const text = assistantMessageText(resultMessage);

      // Checked only once this attempt's own response has finished
      // streaming (never mid-generation, where partial text could false-
      // match) and only against the new message this attempt produced --
      // not the whole page, so an unrelated older turn can't trigger it.
      if (resultMessage && !stopButton && matchesGenerationLimit(text)) throw new Error("LIMIT_STOP: ChatGPT image generation limit reached for now.");

      // Evaluate on every poll, including while Stop is visible, so a timeout
      // can explain whether generation state or attribution rejected the image.
      if (expectImage) {
        const evaluated = imageDecision(boundary, inputEvidence);
        const decision = evaluated.decision;
        const diagnostics = decision.diagnostics || {};
        lastDetection = { ...boundaryTelemetry(boundary), assistant_count_after: evaluated.assistant_count_after, new_assistant_fingerprints: evaluated.new_assistant_fingerprints, stop_visible: Boolean(stopButton), generating: Boolean(stopButton), candidate_counts: { post_turn: diagnostics.post_turn || null, fresh: diagnostics.fresh || null }, baseline_vs_fresh: { baseline: diagnostics.baseline_count ?? boundary?.images?.length ?? 0, fresh: diagnostics.fresh?.total ?? 0 }, chosen_attribution: decision.attribution || null, decision_reason: decision.ok ? null : decision.reason || "NO_NEW_IMAGE", decision: diagnostics };
        recordDetection(attempt, lastDetection);
        // A unique, attributable ready image is output evidence even when a
        // stale generation control remains visible.  Do not send another
        // prompt here: sidepanel.js persists this image and then independently
        // waits for DAC_WAIT_CHAT_READY before any next-job transition.
        const imageCompletion = window.DacImageEvidence.completionForImage(decision, { generationControlVisible: Boolean(stopButton) });
        if (imageCompletion.ok) {
          return {
            type: "image",
            text,
            char_count: text.length,
            assistant_message_index: resultMessage ? messages.indexOf(resultMessage) : null,
            assistant_count_before: boundary?.assistant_count || 0,
            assistant_count_after: messages.length,
            completion: { generation_seen: generationSeen, reason: imageCompletion.reason, poll_count: pollCount },
            image_url: decision.candidate.source,
            image_attribution: decision.attribution,
            detection: lastDetection,
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
        if (stableText && Date.now() - stableSince >= ADAPTER.TIMING.stableTextDwellMs) {
          return {
            type: "text",
            text: stableText,
            char_count: stableText.length,
            assistant_message_index: messages.indexOf(resultMessage),
            assistant_count_before: boundary?.assistant_count || 0,
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

      await sleep(ADAPTER.TIMING.completionPollMs);
    }

    recordDetection(attempt, { ...lastDetection, timed_out: true });
    const error = new Error(`OUTPUT_DETECTION_TIMEOUT: ${lastDetection.decision_reason || "NO_NEW_IMAGE"}; stop_visible=${lastDetection.stop_visible}.`);
    error.detection = { ...lastDetection, timed_out: true };
    throw error;
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
        const composer = findComposer();
        const sendButton = findSendButton(composer);
        const blocker = securityBlockerText();
        const limitBlocker = generationLimitText();
        const readiness = window.DacChatReadiness.evaluate({ composerFound: Boolean(composer), sendUsable: sendUsable(composer, sendButton), generating: Boolean(findStopButton()), securityBlocker: blocker, generationLimitBlocker: limitBlocker, attachmentPending: uploadIsPending(), outputVerified });
        if (readiness === "HARD_STOP") throw new Error(limitBlocker ? `LIMIT_STOP: ${limitBlocker}` : `HARD_STOP: ${blocker}`);
        if (readiness === "READY") {
          if (safetyCooldownSec > 0) await sleep(safetyCooldownSec * 1000);
          const finalComposer = findComposer();
          const finalSendButton = findSendButton(finalComposer);
          const finalBlocker = securityBlockerText();
          const finalLimitBlocker = generationLimitText();
          const finalReadiness = window.DacChatReadiness.evaluate({ composerFound: Boolean(finalComposer), sendUsable: sendUsable(finalComposer, finalSendButton), generating: Boolean(findStopButton()), securityBlocker: finalBlocker, generationLimitBlocker: finalLimitBlocker, attachmentPending: uploadIsPending(), outputVerified });
          if (finalReadiness === "HARD_STOP") throw new Error(finalLimitBlocker ? `LIMIT_STOP: ${finalLimitBlocker}` : `HARD_STOP: ${finalBlocker}`);
          if (finalReadiness === "READY") return { ok: true, state: "IDLE_READY", composerFound: true, sendUsable: sendUsable(finalComposer, finalSendButton) };
        }
        await Promise.race([new Promise((resolve) => { wake = resolve; }), sleep(ADAPTER.TIMING.completionPollMs)]);
      }
    } finally {
      observer?.disconnect();
      wake = null;
    }
    throw new Error("Timed out waiting for an idle ChatGPT composer.");
  }

  async function runPrompt(prompt, timeoutMs, referenceImages = [], expectImage = false, requestAttempt = null) {
    if (STATE.busy) throw new Error("This ChatGPT tab is already running an automation prompt.");
    STATE.busy = true;
    STATE.abortRequested = false;
    if (requestAttempt) STATE.activeAttempt = requestAttempt;

    try {
      if (findStopButton()) {
        throw new Error("ChatGPT is already generating. Wait for it to finish before starting the queue.");
      }

      const composer = findComposer();
      if (!composer) {
        throw new Error("ChatGPT composer not found. Open a normal chat page and retry.");
      }

      emitRuntimeStage(requestAttempt, referenceImages.length ? "ATTACHING_REFS" : "SENDING");
      await attachReferenceImages(referenceImages);
      const inputEvidence = referenceEvidence(referenceImages);
      const boundary = captureBoundary(inputEvidence);
      if (requestAttempt) Object.assign(requestAttempt, { boundary, inputEvidence, hasReferences: referenceImages.length > 0, expectImage, detection: { ...boundaryTelemetry(boundary), decision_reason: "PENDING" } });
      setComposerValue(composer, prompt);
      await sleep(ADAPTER.TIMING.postTypeSettleMs);

      const sendButton = await waitForSendButtonReady(composer);
      emitRuntimeStage(requestAttempt, "SENDING");
      sendButton.click();
      if (requestAttempt) { requestAttempt.phase = "SUBMITTED"; requestAttempt.submittedAt = new Date().toISOString(); }
      emitRuntimeStage(requestAttempt, "GENERATING");

      // Let ChatGPT process the click before completion polling.
      await sleep(ADAPTER.TIMING.postSendSettleMs);

      const result = await waitForCompletion({ boundary, timeoutMs, expectImage, inputEvidence, attempt: requestAttempt });
      if (result?.image_url && requestAttempt) requestAttempt.phase = "OUTPUT_DETECTED";
      if (result?.image_url) emitRuntimeStage(requestAttempt, "OUTPUT_DETECTED");
      return result;
    } finally {
      STATE.busy = false;
      STATE.abortRequested = false;
    }
  }

  function attemptSnapshot(attempt) { return { ...window.DacAttemptIdentity.snapshot(attempt), detection: attempt?.detection || null }; }

  async function reconcileImageAttempt(timeoutMs, requestAttempt) {
    const attempt = STATE.activeAttempt;
    if (!window.DacAttemptIdentity.same(attempt, requestAttempt) || !window.DacAttemptIdentity.submitted(attempt) || !attempt.expectImage) throw new Error("ATTEMPT_ID_MISMATCH: no matching submitted image attempt is available for reconciliation.");
    const result = await waitForCompletion({ boundary: attempt.boundary, timeoutMs, expectImage: true, inputEvidence: attempt.inputEvidence, attempt });
    if (result?.image_url) attempt.phase = "OUTPUT_DETECTED";
    if (result?.image_url) emitRuntimeStage(attempt, "OUTPUT_DETECTED");
    return result;
  }

  function inspectPersistedImage(message) {
    const proof = message?.proof;
    const identity = window.DacReconciliationCore.matchesRequest(proof, message);
    if (!identity.ok) throw new Error(`${identity.code}: ${identity.message}`);
    const verified = window.DacReconciliationCore.verifyExistingOutput({ proof, candidates: imageCandidates(document) });
    if (!verified.ok) throw new Error(`${verified.code}: ${verified.message}`);
    return {
      type: "image",
      image_url: verified.candidate.source,
      image_attribution: proof.attribution,
      reconciliation: { verified: true, run_id: proof.run_id, job_id: proof.job_id, attempt_id: proof.attempt_id, submitted_at: proof.submitted_at, expected_source_id: proof.expected_source_id }
    };
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
        generationLimitBlocker: generationLimitText(),
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
      const requestAttempt = window.DacAttemptIdentity.create(message);
      const prompt = typeof message.prompt === "string" ? message.prompt.trim() : "";
      const timeoutMs = Math.max(15000, Math.min(Number(message.timeoutMs) || 180000, 900000));
      if (!window.DacAttemptIdentity.validContext(requestAttempt)) {
        sendResponse({ ok: false, error: "INVALID_ATTEMPT_ID: job_id and attempt_id are required.", attempt: attemptSnapshot(requestAttempt) });
        return false;
      }
      if (!prompt) {
        sendResponse({ ok: false, error: "Prompt is empty.", attempt: attemptSnapshot(requestAttempt) });
        return false;
      }
      runPrompt(prompt, timeoutMs, message.referenceImages || (message.referenceImage ? [message.referenceImage] : []), true, requestAttempt)
        .then((result) => sendResponse({ ok: true, result, attempt: attemptSnapshot(requestAttempt) }))
        .catch((error) => sendResponse({ ok: false, error: error?.message || String(error), attempt: attemptSnapshot(requestAttempt) }));
      return true;
    }

    if (message.type === "DAC_RECONCILE_IMAGE_JOB") {
      const requestAttempt = window.DacAttemptIdentity.create(message);
      const timeoutMs = Math.max(1000, Math.min(Number(message.timeoutMs) || 30000, 120000));
      if (!window.DacAttemptIdentity.validContext(requestAttempt) || !window.DacAttemptIdentity.same(STATE.activeAttempt, requestAttempt) || !window.DacAttemptIdentity.submitted(STATE.activeAttempt)) {
        sendResponse({ ok: false, error: "ATTEMPT_ID_MISMATCH: reconciliation request does not own the submitted attempt.", attempt: attemptSnapshot(requestAttempt) });
        return false;
      }
      reconcileImageAttempt(timeoutMs, requestAttempt)
        .then((result) => sendResponse({ ok: true, result, attempt: attemptSnapshot(STATE.activeAttempt) }))
        .catch((error) => sendResponse({ ok: false, error: error?.message || String(error), attempt: attemptSnapshot(STATE.activeAttempt) }));
      return true;
    }

    // This endpoint is deliberately read-only: it must never attach files,
    // edit the composer, click Send, or create a new attempt.
    if (message.type === "DAC_MANUAL_RECONCILE_EXISTING_OUTPUT") {
      const requestAttempt = window.DacAttemptIdentity.create(message);
      if (!window.DacAttemptIdentity.validContext(requestAttempt)) {
        sendResponse({ ok: false, error: "INVALID_ATTEMPT_ID: job_id and attempt_id are required.", attempt: attemptSnapshot(requestAttempt) });
        return false;
      }
      try {
        const result = inspectPersistedImage(message);
        sendResponse({ ok: true, result, attempt: { ...attemptSnapshot(requestAttempt), phase: "OUTPUT_DETECTED", submittedAt: message.submitted_at } });
      } catch (error) {
        sendResponse({ ok: false, error: error?.message || String(error), attempt: { ...attemptSnapshot(requestAttempt), phase: "SUBMITTED", submittedAt: message.submitted_at } });
      }
      return false;
    }

    return false;
  });
})();
