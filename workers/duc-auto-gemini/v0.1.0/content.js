(() => {
  "use strict";
  const Core = globalThis.DagProviderCore;
  const Runtime = globalThis.DagRuntimeCore;
  const state = { activeAttempt: null, abortRequested: false };
  const responseIds = new WeakMap(); let responseSerial = 0;

  function visible(element) {
    if (!element) return false;
    const style = getComputedStyle(element); const rect = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) > 0 && rect.width > 0 && rect.height > 0;
  }
  function firstVisible(selectors, root = document) {
    for (const selector of selectors) for (const element of root.querySelectorAll(selector)) if (visible(element)) return element;
    return null;
  }
  function composer() { return firstVisible(Core.SELECTORS.composer); }
  function uploadButton() { return firstVisible(Core.SELECTORS.upload); }
  function sendButton() { return firstVisible(Core.SELECTORS.send); }
  function stopButton() { return firstVisible(Core.SELECTORS.stop); }
  function pageBlockers() {
    const pageText = document.body?.innerText || "";
    const responseText = Array.from(document.querySelectorAll('[role="alert"], [data-message-author-role="model"], [data-message-author-role="assistant"], model-response, [data-test-id*="response" i], [class*="model-response"]')).map((node) => node.innerText || "").join("\n");
    return { security: Core.securityBlocker(pageText), quota: Core.quotaOrPolicyBlocker(responseText) };
  }
  function attachmentPending() {
    return Boolean(document.querySelector('[aria-busy="true"][data-test-id*="upload" i], [data-test-id*="upload" i] [role="progressbar"], [class*="upload"] [role="progressbar"]'));
  }
  function modelContainer(image) {
    for (const selector of Core.SELECTORS.modelContainer) {
      const container = image.closest(selector); if (container) return container;
    }
    return null;
  }
  function responseKey(container) {
    if (!container) return "";
    const explicit = container.getAttribute("data-message-id") || container.id;
    if (explicit) return `explicit:${explicit}`;
    if (!responseIds.has(container)) responseIds.set(container, `response-${++responseSerial}`);
    return responseIds.get(container);
  }
  function modelContainers() {
    const nodes = []; const seen = new Set();
    for (const selector of Core.SELECTORS.modelContainer) for (const node of document.querySelectorAll(selector)) if (!seen.has(node)) { seen.add(node); nodes.push(node); }
    return nodes;
  }
  function inputContainer(image) {
    return image.closest('rich-textarea, [data-test-id*="attachment" i], [data-test-id*="upload" i], form');
  }
  function imageCandidates(originalBoundary = null) {
    return Array.from(document.querySelectorAll("main img, [role=main] img")).map((image, index) => {
      const rect = image.getBoundingClientRect(); const model = modelContainer(image); const input = inputContainer(image);
      const src = image.currentSrc || image.src || image.getAttribute("src") || "";
      const containerKey = responseKey(model);
      return {
        key: Core.shortHash(src),
        src,
        nodeId: image.getAttribute("data-test-id") || image.id || `img-${index}`,
        role: input ? "input" : model ? "model" : "unknown",
        input: Boolean(input), visible: visible(image), usable: Boolean(src && rect.width >= 96 && rect.height >= 96), containerKey,
        afterBoundary: Boolean(containerKey && originalBoundary && !(originalBoundary.response_keys || []).includes(containerKey)), alt: image.alt || ""
      };
    });
  }
  function captureBoundary() {
    const responses = modelContainers();
    return Core.boundary(imageCandidates(), { url: location.href, model_count: responses.length, response_keys: responses.map(responseKey) });
  }
  function snapshot() {
    const blocks = pageBlockers(); const send = sendButton();
    return {
      surface: Core.surface(location.href), url: location.href, composerFound: Boolean(composer()), uploadFound: Boolean(uploadButton()),
      sendFound: Boolean(send), sendUsable: Boolean(send && !send.disabled && send.getAttribute("aria-disabled") !== "true"),
      generating: Boolean(stopButton()), attachmentPending: attachmentPending(), securityBlocker: blocks.security, quotaBlocker: blocks.quota,
      images: imageCandidates().map(({ src, ...item }) => ({ ...item, source_id: Core.shortHash(src) }))
    };
  }
  function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
  async function waitUntil(check, timeoutMs, code, interval = 250) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (state.abortRequested) throw new Error("ABORTED_BY_OPERATOR");
      const blocks = pageBlockers(); if (blocks.security) throw new Error(blocks.security); if (blocks.quota) throw new Error(blocks.quota);
      const value = await check(); if (value) return value; await wait(interval);
    }
    throw new Error(code);
  }
  function setComposerText(target, text) {
    target.focus();
    const selection = getSelection(); const range = document.createRange(); range.selectNodeContents(target); selection.removeAllRanges(); selection.addRange(range);
    document.execCommand("insertText", false, text);
    if ((target.innerText || "").trim() !== text.trim()) {
      target.textContent = text;
      target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
    }
  }
  async function ensureFileInput() {
    let input = document.querySelector(Core.SELECTORS.fileInput.join(",")); if (input) return input;
    const trigger = uploadButton(); if (!trigger) throw new Error("UPLOAD_TRIGGER_MISSING");
    trigger.click();
    input = await waitUntil(() => document.querySelector(Core.SELECTORS.fileInput.join(",")), 3000, "FILE_INPUT_NOT_EXPOSED").catch(() => null);
    if (input) return input;
    const menuItem = Array.from(document.querySelectorAll('[role="menuitem"], button')).find((item) => visible(item) && /(upload files|upload from computer|files|tải tệp|từ máy tính)/i.test(item.innerText || item.getAttribute("aria-label") || ""));
    if (!menuItem) throw new Error("UPLOAD_MENU_ITEM_MISSING");
    menuItem.click();
    return waitUntil(() => document.querySelector(Core.SELECTORS.fileInput.join(",")), 3000, "FILE_INPUT_NOT_EXPOSED");
  }
  async function attachReferences(references) {
    if (!references?.length) return;
    const input = await ensureFileInput(); const transfer = new DataTransfer();
    for (const reference of references) {
      const response = await fetch(reference.dataUrl); const blob = await response.blob();
      transfer.items.add(new File([blob], reference.fileName || reference.name, { type: blob.type || "image/png" }));
    }
    const before = Core.SELECTORS.attachmentPreview.reduce((count, selector) => count + document.querySelectorAll(selector).length, 0);
    input.files = transfer.files; input.dispatchEvent(new Event("change", { bubbles: true }));
    await waitUntil(() => {
      const after = Core.SELECTORS.attachmentPreview.reduce((count, selector) => count + document.querySelectorAll(selector).length, 0);
      return after >= before + references.length && !attachmentPending();
    }, 20000, "ATTACHMENT_NOT_READY");
  }
  async function waitForOutput(attempt, timeoutMs) {
    const deadline = Date.now() + timeoutMs; let last = null;
    while (Date.now() < deadline) {
      if (state.abortRequested) throw new Error("ABORTED_BY_OPERATOR");
      const blocks = pageBlockers(); if (blocks.security) throw new Error(blocks.security); if (blocks.quota) throw new Error(blocks.quota);
      last = Core.outputDecision(attempt.boundary, imageCandidates(attempt.boundary), { generating: Boolean(stopButton()), securityBlocker: blocks.security, allowMultiple: false });
      if (last.ok) return last; await wait(500);
    }
    const error = new Error(`OUTPUT_AMBIGUOUS:${last?.reason || "TIMEOUT"}`); error.decision = last; throw error;
  }
  async function downloadableUrl(url) {
    if (!String(url || "").startsWith("blob:")) return url;
    const blob = await (await fetch(url)).blob();
    return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob); });
  }
  async function waitReady(timeoutMs = 30000) {
    return waitUntil(() => {
      const current = snapshot();
      const decision = Core.readiness({ ...current, requireSend: false, surface: Core.surface(location.href) });
      return decision.ready ? { ...decision, snapshot: current } : null;
    }, timeoutMs, "GEMINI_NOT_READY");
  }
  function persistStage(attempt) {
    return chrome.runtime.sendMessage({ type: "DAG_ATTEMPT_STAGE", attempt });
  }
  async function runImageJob(message) {
    if (state.activeAttempt && !Core.TERMINAL.has(state.activeAttempt.phase)) throw new Error("ACTIVE_ATTEMPT_EXISTS");
    state.abortRequested = false;
    let attempt = Core.createAttempt({ runId: message.run_id, jobId: message.job_id, attemptId: message.attempt_id, boundary: captureBoundary() }); state.activeAttempt = attempt;
    try {
      const before = snapshot(); const initial = Core.readiness({ ...before, requireSend: false, surface: Core.surface(location.href) }); if (!initial.ready) throw new Error(initial.reason);
      await attachReferences(message.references || []);
      const target = composer(); if (!target) throw new Error("COMPOSER_MISSING"); setComposerText(target, String(message.prompt || ""));
      const send = await waitUntil(() => { const button = sendButton(); return button && !button.disabled && button.getAttribute("aria-disabled") !== "true" ? button : null; }, 7000, "SEND_NOT_READY");
      const originalBoundary = captureBoundary();
      attempt = Core.transition(attempt, Core.PHASE.SUBMITTED, { boundary: originalBoundary, submitted_at: new Date().toISOString() }); state.activeAttempt = attempt;
      const persisted = await persistStage(attempt); if (!persisted?.ok) throw new Error(persisted?.error || "SUBMITTED_PERSISTENCE_FAILED");
      send.click();
      const output = await waitForOutput(attempt, Number(message.timeout_ms || 240000));
      attempt = Core.transition(attempt, Core.PHASE.OUTPUT_DETECTED, { detection: output, output_detected_at: new Date().toISOString() }); state.activeAttempt = attempt; await persistStage(attempt);
      const outputUrl = await downloadableUrl(output.candidate.src);
      return { ok: true, attempt, output: { url: outputUrl, source_id: Core.shortHash(output.candidate.src), diagnostics: output } };
    } catch (error) {
      if (attempt.phase === Core.PHASE.PRE_SUBMIT) {
        attempt = Core.transition(attempt, Core.PHASE.FAILED_PRE_SUBMIT, { failure_type: error.message, last_error: error.message }); state.activeAttempt = attempt; await persistStage(attempt).catch(() => {});
      } else if (Core.POST_SUBMIT.has(attempt.phase)) {
        attempt = Core.transition(attempt, state.abortRequested ? Core.PHASE.INTERRUPTED : Core.PHASE.OWNER_REVIEW, { failure_type: error.message.startsWith("OUTPUT_AMBIGUOUS") ? "OUTPUT_AMBIGUOUS" : error.message, last_error: error.message, detection: error.decision || null });
        state.activeAttempt = attempt; await persistStage(attempt).catch(() => {});
      }
      return { ok: false, error: error.message, attempt };
    }
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "DAG_PING") { sendResponse({ ok: true, receiver: "duc-auto-gemini", snapshot: snapshot(), attempt: state.activeAttempt }); return false; }
    if (message?.type === "DAG_ABORT") { if (!Runtime.matchesAttempt(state.activeAttempt, message)) { sendResponse({ ok: false, error: "ATTEMPT_ID_MISMATCH", attempt: state.activeAttempt }); return false; } state.abortRequested = true; sendResponse({ ok: true, attempt: state.activeAttempt }); return false; }
    if (message?.type === "DAG_WAIT_READY") { if (!Runtime.matchesAttempt(state.activeAttempt, message)) { sendResponse({ ok: false, error: "ATTEMPT_ID_MISMATCH", attempt: state.activeAttempt }); return false; } waitReady(message.timeout_ms).then((result) => sendResponse({ ok: true, result, attempt: state.activeAttempt })).catch((error) => sendResponse({ ok: false, error: error.message, attempt: state.activeAttempt })); return true; }
    if (message?.type === "DAG_RUN_IMAGE_JOB") { runImageJob(message).then(sendResponse).catch((error) => sendResponse({ ok: false, error: error.message, attempt: Runtime.matchesAttempt(state.activeAttempt, message) ? state.activeAttempt : null })); return true; }
    if (message?.type === "DAG_RECONCILE") {
      const attempt = state.activeAttempt;
      if (!attempt || attempt.run_id !== message.run_id || attempt.job_id !== message.job_id || attempt.attempt_id !== message.attempt_id) { sendResponse({ ok: false, error: "ATTEMPT_ID_MISMATCH", attempt }); return false; }
      const decision = Core.outputDecision(attempt.boundary, imageCandidates(attempt.boundary), { generating: Boolean(stopButton()), securityBlocker: pageBlockers().security });
      sendResponse({ ok: decision.ok, decision, attempt }); return false;
    }
    if (message?.type === "DAG_ADVANCE_ATTEMPT") {
      const attempt = state.activeAttempt;
      if (!attempt || attempt.run_id !== message.run_id || attempt.job_id !== message.job_id || attempt.attempt_id !== message.attempt_id) { sendResponse({ ok: false, error: "ATTEMPT_ID_MISMATCH", attempt }); return false; }
      try { state.activeAttempt = Core.transition(attempt, message.next_phase, message.values || {}); persistStage(state.activeAttempt).then((persisted) => sendResponse(persisted?.ok ? { ok: true, attempt: state.activeAttempt } : { ok: false, error: persisted?.error || "ATTEMPT_PERSISTENCE_FAILED", attempt: state.activeAttempt })).catch((error) => sendResponse({ ok: false, error: error.message, attempt: state.activeAttempt })); return true; }
      catch (error) { sendResponse({ ok: false, error: error.message, attempt }); }
      return false;
    }
    return false;
  });
})();
