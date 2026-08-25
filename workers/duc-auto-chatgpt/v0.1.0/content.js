(() => {
  "use strict";

  const STATE = {
    busy: false,
    abortRequested: false,
    activeAttempt: null,
    answeredPolls: new Set(),
    pollAttempts: new Map(),
    pollFirstSeen: new Map(),
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

  function assistantFingerprint(message) {
    const explicitId = message?.getAttribute("data-message-id") || message?.id || "";
    const images = Array.from(message?.querySelectorAll?.("img") || []).map((image) => image.currentSrc || image.src || "").join("|");
    return shortHash(`${explicitId}|${assistantMessageText(message).slice(0, 256)}|${images}`);
  }

  function securityTextWithoutUserMessages(root = document.body) {
    if (!root) return "";
    const scope = root.cloneNode(true);
    for (const userMessage of scope.querySelectorAll('[data-message-author-role="user"]')) userMessage.remove();
    return scope.innerText || scope.textContent || "";
  }

  function securityBlockerText() {
    const text = securityTextWithoutUserMessages().toLowerCase();
    return /(captcha|unusual activity|verify you are human|suspicious activity)/.test(text) ? "ChatGPT security/interstitial blocker detected." : null;
  }

  // Free/paid image-generation quotas ("you've hit your daily limit") render
  // as an ordinary assistant message, not an interstitial -- scanning the
  // whole assistant history would catch the OPERATOR'S OWN
  // PROMPT if it happened to contain these same common words (draw a picture
  // about someone waiting for a daily limit to reset, etc). Scoped to only
  // the specific assistant message under evaluation instead.
  //
  // NOTE for whoever validates this live: this phrase list is a best-effort
  // starting set, not confirmed against a real rate-limited ChatGPT session
  // -- OpenAI's exact wording is not something that can be verified without
  // actually hitting the limit. If a real limit is hit and the batch does
  // NOT halt here, capture the exact text ChatGPT showed and add it below,
  // the same way the CAPTCHA phrase list above was built from real evidence.
  function matchesGenerationLimit(text) {
    return /(reached (?:your|the) (?:daily |monthly )?(?:image generation )?limit|hit (?:your|the) (?:daily |monthly )?(?:image generation )?limit|image generation limit|generate more images (?:after|later|tomorrow)|try again (?:after|tomorrow|in (?:a|\d))|come back (?:after|in|tomorrow) to (?:generate|create) (?:more )?images|daily limit for image generation|you.ve used all your (?:free )?image generations)/i.test(text || "");
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

  function conversationRoot() {
    const message = document.querySelector('[data-message-author-role="assistant"], [data-message-author-role="user"]');
    const rooted = message?.closest('[data-testid="conversation-turns"], [data-testid*="conversation"], main, [role="main"]');
    return rooted || document.querySelector('[data-testid="conversation-turns"], [data-testid*="conversation"], main, [role="main"]') || document.body;
  }

  function imageCandidates(root = conversationRoot(), inputEvidence = { sources: new Set(), names: new Set() }) {
    return Array.from(root.querySelectorAll("img")).map((image) => {
      const source = image.currentSrc || image.src || "";
      const rect = image.getBoundingClientRect();
      const role = image.closest('[data-message-author-role="assistant"]') ? "assistant" : image.closest('[data-message-author-role="user"]') ? "user" : "unknown";
      const label = `${image.alt || ""} ${image.getAttribute("aria-label") || ""}`.toLowerCase();
      const namedReference = Array.from(inputEvidence.names || []).some((name) => label.includes(name));
      const attachmentPreview = Boolean(image.closest('form, [data-testid*="attachment"], [data-testid*="upload-preview"], [data-testid*="file-upload"]'));
      // turn_id is the identity of the assistant message this image lives in.
      // Multi-image attribution only accepts several images when they all
      // belong to the SAME assistant turn; "" (no assistant ancestor) can
      // never satisfy that, which keeps stray page images failing closed.
      const turnId = nodeId(image.closest('[data-message-author-role="assistant"]'), "assistant");
      return { source, source_id: shortHash(source), node_id: nodeId(image, "image"), turn_id: turnId, role, input: role === "user" || attachmentPreview || inputEvidence.sources?.has(source) || namedReference, visible: isVisible(image) && rect.width >= 64 && rect.height >= 64, ready: image.complete && image.naturalWidth > 0 };
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
    const images = imageCandidates(conversationRoot(), inputEvidence);
    return Object.freeze({ assistant_count: assistants.length, assistant_fingerprints: assistants.map(assistantFingerprint), assistant_node_ids: assistants.map((message) => nodeId(message, "assistant")), images, image_source_ids: images.map((candidate) => candidate.source_id), image_node_ids: images.map((candidate) => candidate.node_id) });
  }
  function newAssistantMessages(boundary) {
    const known = new Set(boundary?.assistant_fingerprints || []);
    return assistantMessages().filter((message) => !known.has(assistantFingerprint(message)));
  }
  function imageDecision(boundary, inputEvidence, maxImages = 1) {
    const postTurnMessages = newAssistantMessages(boundary);
    return { decision: window.DacImageEvidence.selectAttributableImages({ postTurn: postTurnMessages.flatMap((message) => imageCandidates(message, inputEvidence)), visible: imageCandidates(conversationRoot(), inputEvidence), baseline: boundary?.images || [], maxImages }), assistant_count_after: assistantMessages().length, new_assistant_fingerprints: postTurnMessages.map(assistantFingerprint) };
  }

  // ---------------------------------------------------------------------
  // A/B image poll ("Which image do you like more?")
  //
  // Discovery is text-anchored, not selector-anchored: ChatGPT's testids and
  // class names for this block are unknown and will churn. Every live
  // encounter captures the block's REAL attributes into the diagnostics so
  // the next revision can be anchored on something durable.
  // ---------------------------------------------------------------------

  const CLICKABLE_SELECTOR = 'button, [role="button"], a[href], [tabindex]:not([tabindex="-1"])';

  function clickableAncestor(node) {
    return node?.closest?.(CLICKABLE_SELECTOR) || null;
  }

  // An already-answered poll usually leaves its controls disabled or marked
  // selected. Those are not answerable and must never be clicked. Inert text
  // is not a control at all -- clicking a <span> does nothing but still gets
  // recorded as an attempted answer.
  function answerableControl(element) {
    if (!element || !isVisible(element)) return false;
    if (typeof element.matches !== "function" || !element.matches(CLICKABLE_SELECTOR)) return false;
    return !element.disabled
      && element.getAttribute("aria-disabled") !== "true"
      && element.getAttribute("aria-pressed") !== "true"
      && element.getAttribute("aria-checked") !== "true";
  }

  function describeControl(element) {
    if (!element) return null;
    return {
      tag: element.tagName?.toLowerCase() || "",
      role: element.getAttribute?.("role") || "",
      testid: element.getAttribute?.("data-testid") || "",
      aria_label: element.getAttribute?.("aria-label") || "",
      class_name: String(element.getAttribute?.("class") || "").slice(0, 160),
      text: (element.innerText || element.textContent || "").trim().slice(0, 80),
      node_id: nodeId(element, "ab-poll-control"),
      visible: isVisible(element)
    };
  }

  // Scans the newest assistant turn only. An older answered poll further up
  // the conversation must never be re-clicked.
  function findAbPoll() {
    const messages = assistantMessages();
    const message = messages[messages.length - 1];
    if (!message) return null;
    const text = assistantMessageText(message);
    if (!window.DacAbPoll.isQuestionText(text)) return null;

    const controls = Array.from(message.querySelectorAll(CLICKABLE_SELECTOR)).filter(answerableControl);
    const seen = new Set();
    const choices = [];
    let skip = null;
    for (const control of controls) {
      const label = (control.innerText || control.textContent || "").trim();
      const number = window.DacAbPoll.choiceNumber(label);
      if (number !== null && !seen.has(number)) {
        seen.add(number);
        choices.push({ number, index: choices.length, element: control });
        continue;
      }
      if (!skip && window.DacAbPoll.isSkipText(label)) skip = control;
    }
    // The Skip affordance renders as small text; if it is not itself
    // clickable, walk up to whatever wrapper actually is. The wrapper has to
    // clear the same answerable filter -- otherwise a disabled control from an
    // already-answered poll, or an inert <span>, gets clicked here after the
    // filter above rejected it.
    if (!skip) {
      const skipText = Array.from(message.querySelectorAll("span, div, p, a")).find((node) => isVisible(node) && window.DacAbPoll.isSkipText((node.innerText || node.textContent || "").trim()));
      const candidate = clickableAncestor(skipText);
      skip = answerableControl(candidate) ? candidate : null;
    }
    // Deliberately NOT "return null when no control was recognised". The
    // composer is locked by the poll itself, not by the buttons: reporting
    // "no poll" here would let readiness call a locked composer READY and
    // send the next prompt into a chat that cannot accept it. An
    // unrecognised control set is a poll the runner must WAIT on and tell the
    // operator about, not a poll that does not exist.
    return {
      message,
      node_id: nodeId(message, "ab-poll"),
      fingerprint: assistantFingerprint(message),
      question: text.slice(0, 200),
      choices,
      skip,
      diagnostics: {
        detected_at: new Date().toISOString(),
        question_text: text.slice(0, 200),
        message_testid: message.getAttribute("data-testid") || "",
        message_id: message.getAttribute("data-message-id") || "",
        choice_controls: choices.map((choice) => ({ number: choice.number, ...describeControl(choice.element) })),
        skip_control: describeControl(skip),
        image_count: imageCandidates(message).length
      }
    };
  }

  // Only ChatGPT actually closing the block counts as answered -- a click the
  // page never acted on must not make the poll disappear from readiness.
  // Attempts are capped separately so an ineffective click is not repeated
  // forever. Both are keyed on the assistant message NODE rather than a
  // content fingerprint: answering changes the block's content, and a
  // fingerprint key would read the answered block as a brand-new unanswered
  // poll and loop.
  const AB_POLL_MAX_ATTEMPTS = 2;
  const AB_POLL_CONTROL_GRACE_MS = 10000;

  function abPollOpen() {
    const poll = findAbPoll();
    if (!poll) return null;
    if (STATE.answeredPolls.has(poll.node_id)) return null;
    if ((STATE.pollAttempts.get(poll.node_id) || 0) >= AB_POLL_MAX_ATTEMPTS) return null;
    return poll;
  }

  function abPollPending() {
    const poll = findAbPoll();
    if (!poll) return false;
    if (!STATE.pollFirstSeen.has(poll.node_id)) STATE.pollFirstSeen.set(poll.node_id, Date.now());
    if (STATE.answeredPolls.has(poll.node_id)) return false;
    // An answerable control means a real, still-open poll: block, always.
    if (poll.choices.length || poll.skip) return true;
    // Question text with NO answerable control is ambiguous: either a human
    // already answered it by hand (ChatGPT keeps the question, drops the
    // buttons) or the block has not finished rendering. Block for a bounded
    // grace period so a slow render is still caught, then stop blocking --
    // blocking forever would stall the whole run after the operator has
    // already fixed it themselves. Nothing is lost by letting the gate
    // proceed: if the composer really is still locked, the pre-submit gate
    // catches it as TIMEOUT_PRE_SUBMIT and no prompt is ever sent.
    return Date.now() - (STATE.pollFirstSeen.get(poll.node_id) || 0) < AB_POLL_CONTROL_GRACE_MS;
  }

  async function waitForPollCleared(nodeIdentity, timeoutMs = 6000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const poll = findAbPoll();
      if (!poll || poll.node_id !== nodeIdentity) return true;
      await sleep(200);
    }
    return false;
  }

  // Returns a record of exactly what was clicked, or a NAMED refusal. Never
  // substitutes a different answer than the configured policy asks for.
  // Safety outranks the poll in both directions: nothing is clicked while a
  // security/quota blocker is on screen or while ChatGPT is still generating,
  // and the same check is repeated in the instant before the click so a
  // blocker that appeared while the answer was being chosen still wins.
  function pollInteractionBlocker() {
    const blocker = securityBlockerText();
    if (blocker) return { code: "HARD_STOP", detail: blocker };
    const limitBlocker = generationLimitText();
    if (limitBlocker) return { code: "LIMIT_STOP", detail: limitBlocker };
    if (findStopButton()) return { code: "GENERATING", detail: "ChatGPT is still generating." };
    return null;
  }

  async function answerAbPoll(action) {
    const poll = abPollOpen();
    if (!poll) return null;
    const blocked = pollInteractionBlocker();
    if (blocked) return { detected: true, answered: false, action: window.DacAbPoll.normalizeAction(action), question: poll.question, diagnostics: poll.diagnostics, reason: `BLOCKED_${blocked.code}`, message: `Poll A/B chưa trả lời: ${blocked.detail}` };
    const instruction = window.DacAbPoll.chooseAnswer(action, { choices: poll.choices.map(({ number, index }) => ({ number, index })), hasSkip: Boolean(poll.skip) });
    const base = { detected: true, action: instruction.action, question: poll.question, diagnostics: poll.diagnostics };
    if (instruction.kind === "none") {
      return { ...base, answered: false, reason: instruction.reason, message: window.DacAbPoll.refusalMessage(instruction.reason) };
    }
    const target = instruction.kind === "skip" ? poll.skip : poll.choices.find((choice) => choice.number === instruction.choice_number)?.element;
    if (!target) return { ...base, answered: false, reason: "CONTROL_DISAPPEARED", message: window.DacAbPoll.refusalMessage("NO_ANSWER_CONTROL") };
    const blockedNow = pollInteractionBlocker();
    if (blockedNow) return { ...base, answered: false, reason: `BLOCKED_${blockedNow.code}`, message: `Poll A/B chưa trả lời: ${blockedNow.detail}` };
    STATE.pollAttempts.set(poll.node_id, (STATE.pollAttempts.get(poll.node_id) || 0) + 1);
    target.click();
    const cleared = await waitForPollCleared(poll.node_id);
    if (cleared) STATE.answeredPolls.add(poll.node_id);
    if (!cleared) STATE.pollFirstSeen.set(poll.node_id, Date.now());
    return {
      ...base,
      // ChatGPT accepting the click is what makes it an ANSWER. A click the
      // page never acted on is reported as clicked-but-unconfirmed so nothing
      // downstream -- the audit, or the gate's own sticky outcome -- can
      // record it as an answer that was never verified.
      clicked: true,
      answered: cleared,
      kind: instruction.kind,
      choice_number: instruction.choice_number ?? null,
      randomized: Boolean(instruction.randomized),
      fallback: instruction.fallback || null,
      cleared,
      answered_at: new Date().toISOString(),
      clicked_control: describeControl(target)
    };
  }
  function boundaryTelemetry(boundary) {
    return { assistant_count_before: boundary?.assistant_count || 0, assistant_node_ids: boundary?.assistant_node_ids || [], assistant_fingerprints: boundary?.assistant_fingerprints || [], baseline_image_count: boundary?.images?.length || 0, baseline_source_ids: boundary?.image_source_ids || [], baseline_image_node_ids: boundary?.image_node_ids || [] };
  }
  function recordDetection(attempt, values) { if (attempt) attempt.detection = values; }

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

  async function waitForCompletion({ boundary, timeoutMs, expectImage = false, inputEvidence, attempt = null, maxImages = 1 }) {
    const startedAt = Date.now();
    let generationSeen = false;
    let stableText = "";
    let stableSince = 0;
    let pollCount = 0;
    let imageSignature = "";
    let imageStableSince = null;
    let abPollSeen = null;
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
        // Detected, never clicked here. The images this attempt must save are
        // still on screen and their blob/CDN URLs are still live; clicking the
        // poll now could tear them down before sidepanel.js has persisted
        // them. The poll is answered later, in the readiness gate, which runs
        // only after this job's output step has finished -- every image saved
        // and verified, or explicitly recorded as detected-not-downloaded when
        // the operator turned image saving off.
        const livePoll = findAbPoll();
        if (livePoll) abPollSeen = { detected: true, answered: false, question: livePoll.question, diagnostics: livePoll.diagnostics };

        const evaluated = imageDecision(boundary, inputEvidence, maxImages);
        const decision = evaluated.decision;
        const diagnostics = decision.diagnostics || {};
        const settle = window.DacImageEvidence.settledForImages(decision, { previousSignature: imageSignature, stableSinceMs: imageStableSince, nowMs: Date.now(), settleMs: 1500, maxImages, generationControlVisible: Boolean(stopButton) });
        imageSignature = settle.signature;
        imageStableSince = settle.stable_since_ms;
        lastDetection = { ...boundaryTelemetry(boundary), assistant_count_after: evaluated.assistant_count_after, new_assistant_fingerprints: evaluated.new_assistant_fingerprints, stop_visible: Boolean(stopButton), generating: Boolean(stopButton), candidate_counts: { post_turn: diagnostics.post_turn || null, fresh: diagnostics.fresh || null }, baseline_vs_fresh: { baseline: diagnostics.baseline_count ?? boundary?.images?.length ?? 0, fresh: diagnostics.fresh?.total ?? 0 }, chosen_attribution: decision.attribution || null, chosen_count: diagnostics.chosen_count ?? 0, multi_image: Boolean(decision.multi_image), image_settle: { settled: settle.settled, count: settle.count, reason: settle.reason }, ab_poll: abPollSeen, decision_reason: decision.ok ? null : decision.reason || "NO_NEW_IMAGE", decision: diagnostics };
        recordDetection(attempt, lastDetection);
        // A unique, attributable ready image is output evidence even when a
        // stale generation control remains visible.  Do not send another
        // prompt here: sidepanel.js persists this image and then independently
        // waits for DAC_WAIT_CHAT_READY before any next-job transition.
        const imageCompletion = window.DacImageEvidence.completionForImage(decision, { generationControlVisible: Boolean(stopButton) });
        if (imageCompletion.ok && settle.settled) {
          const candidates = decision.candidates?.length ? decision.candidates : [decision.candidate];
          return {
            type: "image",
            text,
            char_count: text.length,
            assistant_message_index: resultMessage ? messages.indexOf(resultMessage) : null,
            assistant_count_before: boundary?.assistant_count || 0,
            assistant_count_after: messages.length,
            completion: { generation_seen: generationSeen, reason: imageCompletion.reason, poll_count: pollCount, image_settle_reason: settle.reason },
            image_url: decision.candidate.source,
            image_urls: candidates.map((candidate) => candidate.source),
            image_attribution: decision.attribution,
            image_attributions: decision.attributions || [decision.attribution],
            multi_image: Boolean(decision.multi_image),
            ab_poll: abPollSeen,
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
        if (stableText && Date.now() - stableSince >= 1500) {
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

      await sleep(300);
    }

    recordDetection(attempt, { ...lastDetection, timed_out: true });
    const error = new Error(`OUTPUT_DETECTION_TIMEOUT: ${lastDetection.decision_reason || "NO_NEW_IMAGE"}; stop_visible=${lastDetection.stop_visible}.`);
    error.detection = { ...lastDetection, timed_out: true };
    throw error;
  }

  function sendUsable(composer, button) {
    return Boolean(composer && button && !button.disabled && button.getAttribute("aria-disabled") !== "true");
  }

  // A poll the runner refused to answer because a blocker was on screen is
  // still evidence: it explains why the gate stopped. Carry it out with the
  // hard-stop so the side panel can audit it instead of losing it.
  function hardStopError(message, abPoll) {
    const error = new Error(message);
    error.ab_poll = abPoll || null;
    return error;
  }

  async function waitForChatReady({ timeoutMs = 30000, safetyCooldownSec = 0, outputVerified = true, abPollAction = "random" } = {}) {
    const deadline = Date.now() + timeoutMs;
    let observer;
    let wake = null;
    let abPoll = null;
    const changed = () => { if (wake) { wake(); wake = null; } };
    try {
      observer = new MutationObserver(changed);
      observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled", "aria-disabled", "aria-busy"] });
      while (Date.now() < deadline) {
        if (STATE.abortRequested) throw new Error("Automation stopped by user.");
        // Answered here, after this job's output step is complete. An
        // unanswered poll locks the composer, so without this the next job
        // would sit in WAITING_READY until it timed out (observed live
        // 2026-08-25). A refusal is recorded and the gate keeps waiting --
        // the operator can still answer by hand and the loop resumes.
        if (abPollOpen()) {
          const outcome = await answerAbPoll(abPollAction);
          if (outcome) abPoll = abPoll?.answered ? abPoll : outcome;
          if (outcome && String(outcome.reason || "").startsWith("BLOCKED_")) abPoll = outcome;
          if (outcome && !outcome.clicked) await sleep(1000);
        }
        const composer = findComposer();
        const sendButton = findSendButton(composer);
        const blocker = securityBlockerText();
        const limitBlocker = generationLimitText();
        const readiness = window.DacChatReadiness.evaluate({ composerFound: Boolean(composer), sendUsable: sendUsable(composer, sendButton), generating: Boolean(findStopButton()), securityBlocker: blocker, generationLimitBlocker: limitBlocker, attachmentPending: uploadIsPending(), abPollPending: abPollPending(), outputVerified });
        if (readiness === "HARD_STOP") throw hardStopError(limitBlocker ? `LIMIT_STOP: ${limitBlocker}` : `HARD_STOP: ${blocker}`, abPoll);
        if (readiness === "READY") {
          if (safetyCooldownSec > 0) await sleep(safetyCooldownSec * 1000);
          const finalComposer = findComposer();
          const finalSendButton = findSendButton(finalComposer);
          const finalBlocker = securityBlockerText();
          const finalLimitBlocker = generationLimitText();
          const finalReadiness = window.DacChatReadiness.evaluate({ composerFound: Boolean(finalComposer), sendUsable: sendUsable(finalComposer, finalSendButton), generating: Boolean(findStopButton()), securityBlocker: finalBlocker, generationLimitBlocker: finalLimitBlocker, attachmentPending: uploadIsPending(), abPollPending: abPollPending(), outputVerified });
          if (finalReadiness === "HARD_STOP") throw hardStopError(finalLimitBlocker ? `LIMIT_STOP: ${finalLimitBlocker}` : `HARD_STOP: ${finalBlocker}`, abPoll);
          if (finalReadiness === "READY") return { ok: true, state: "IDLE_READY", composerFound: true, sendUsable: sendUsable(finalComposer, finalSendButton), ab_poll: abPoll };
        }
        await Promise.race([new Promise((resolve) => { wake = resolve; }), sleep(300)]);
      }
    } finally {
      observer?.disconnect();
      wake = null;
    }
    const stuckPoll = abPoll && !abPoll.answered ? ` ${abPoll.message || "Poll A/B chưa trả lời được."}` : "";
    const error = new Error(`Timed out waiting for an idle ChatGPT composer.${stuckPoll}`);
    error.ab_poll = abPoll;
    throw error;
  }

  async function runPrompt(prompt, timeoutMs, referenceImages = [], expectImage = false, requestAttempt = null, maxImages = 1) {
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
      if (requestAttempt) Object.assign(requestAttempt, { boundary, inputEvidence, hasReferences: referenceImages.length > 0, expectImage, maxImages, detection: { ...boundaryTelemetry(boundary), decision_reason: "PENDING" } });
      setComposerValue(composer, prompt);
      await sleep(150);

      const sendButton = await waitForSendButtonReady(composer);
      emitRuntimeStage(requestAttempt, "SENDING");
      sendButton.click();
      if (requestAttempt) { requestAttempt.phase = "SUBMITTED"; requestAttempt.submittedAt = new Date().toISOString(); }
      emitRuntimeStage(requestAttempt, "GENERATING");

      // Let ChatGPT process the click before completion polling.
      await sleep(500);

      const result = await waitForCompletion({ boundary, timeoutMs, expectImage, inputEvidence, attempt: requestAttempt, maxImages });
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
    const result = await waitForCompletion({ boundary: attempt.boundary, timeoutMs, expectImage: true, inputEvidence: attempt.inputEvidence, attempt, maxImages: attempt.maxImages || 1 });
    if (result?.image_url) attempt.phase = "OUTPUT_DETECTED";
    if (result?.image_url) emitRuntimeStage(attempt, "OUTPUT_DETECTED");
    return result;
  }

  function inspectPersistedImage(message) {
    const proof = message?.proof;
    const identity = window.DacReconciliationCore.matchesRequest(proof, message);
    if (!identity.ok) throw new Error(`${identity.code}: ${identity.message}`);
    const verified = window.DacReconciliationCore.verifyExistingOutput({ proof, candidates: imageCandidates(conversationRoot()) });
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
        abPollPending: abPollPending(),
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
      waitForChatReady({ timeoutMs, safetyCooldownSec, outputVerified: message.outputVerified !== false, abPollAction: message.abPollAction })
        .then((result) => sendResponse(result))
        .catch((error) => sendResponse({ ok: false, error: error?.message || String(error), ab_poll: error?.ab_poll || null }));
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
      runPrompt(prompt, timeoutMs, message.referenceImages || (message.referenceImage ? [message.referenceImage] : []), true, requestAttempt, Math.max(1, Math.min(Number(message.maxImages) || 1, 20)))
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
