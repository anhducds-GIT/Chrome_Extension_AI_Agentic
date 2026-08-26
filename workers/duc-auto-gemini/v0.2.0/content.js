(() => {
  "use strict";

  // All provider-specific DOM selectors, blocker patterns, timing values and
  // origin rules live in provider-adapter.js (loaded before this file per
  // manifest.json content_scripts order).
  const ADAPTER = window.DacProviderAdapter;
  // Proven v0.1.0 Gemini decision logic (guarded clicks, transient-file-input
  // state machine, addedSince unique-new-node attachment arrival model),
  // loaded from content-decision-core.js.
  const DECISIONS = window.DacContentDecision;

  const STATE = {
    busy: false,
    abortRequested: false,
    activeAttempt: null,
    // Surface rule (evidence snapshot 3): submitting from /images navigates
    // this tab to /app/<conversation-id>. The CONVERSATION surface is only
    // legitimate after this tab has submitted at least once.
    submittedInThisTab: false,
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

  // Gemini renders the Send button ONLY while the composer has content
  // (evidence snapshot 3, finding 5); there is no <form> to scope into.
  function findSendButton() {
    return firstVisible(ADAPTER.SELECTORS.send);
  }

  function findStopButton() {
    return firstVisible(ADAPTER.SELECTORS.stop);
  }

  function findUploadMenuButton() {
    return firstVisible(ADAPTER.SELECTORS.uploadMenuButton);
  }

  function surfaceAllowedNow() {
    return ADAPTER.surfaceAllowed(location.href, { submittedInThisTab: STATE.submittedInThisTab });
  }

  /* ---- assistant turns: model-response containers -------------------------- */

  const responseKeys = new WeakMap();
  let responseSerial = 0;
  function responseKey(container) {
    if (!container) return "";
    const explicit = container.id || container.getAttribute("data-message-id") || "";
    if (explicit) return `explicit:${explicit}`;
    if (!responseKeys.has(container)) responseKeys.set(container, `response-${(responseSerial += 1)}`);
    return responseKeys.get(container);
  }

  function assistantMessages() {
    const seen = new Set();
    const nodes = [];
    for (const selector of ADAPTER.SELECTORS.responseContainer) {
      for (const node of document.querySelectorAll(selector)) {
        if (!seen.has(node)) { seen.add(node); nodes.push(node); }
      }
    }
    return nodes;
  }

  function assistantMessageText(message) {
    return message ? (message.innerText || message.textContent || "").trim() : "";
  }

  function latestAssistantText() {
    const messages = assistantMessages();
    return assistantMessageText(messages[messages.length - 1]);
  }

  function assistantFingerprint(message) {
    const explicitId = message?.id || message?.getAttribute?.("data-message-id") || "";
    const images = Array.from(message?.querySelectorAll?.("img") || []).map((image) => image.currentSrc || image.src || "").join("|");
    return shortHash(`${explicitId}|${assistantMessageText(message).slice(0, 256)}|${images}`);
  }

  /* ---- blockers ------------------------------------------------------------ */

  function securityBlockerText() {
    const text = (document.body?.innerText || "").toLowerCase();
    return ADAPTER.securityBlockerPattern.test(text) ? "Gemini security/interstitial blocker detected." : null;
  }

  // Image-generation quotas gate submission the same way security blockers do,
  // but the detection is two-tier on Gemini:
  //  1. DOM anchor: the freemium quota-exceeded disclaimer custom element
  //     (evidence snapshot 3, finding 6) -- unambiguous, no phrase matching.
  //  2. Phrase fallback, scoped to model-response text ONLY -- scanning the
  //     whole page like securityBlockerText() would catch the OPERATOR'S OWN
  //     PROMPT if it happened to contain the same common words.
  // The phrase list itself lives in provider-adapter.js (provider wording);
  // the scoping policy stays here.
  function matchesGenerationLimit(text) {
    return ADAPTER.matchesGenerationLimit(text);
  }
  function quotaAnchorPresent() {
    // Pilot G2-0 (2026-08-25) proved mere existence is a FALSE POSITIVE:
    // Gemini keeps this disclaimer element in the /app conversation DOM as an
    // empty hidden placeholder after any generation (G1 snapshots 3-4), which
    // hard-stopped a healthy run as GENERATION_LIMIT_REACHED. The wall is
    // real only when the element is visible and actually says something.
    const anchor = document.querySelector(ADAPTER.SELECTORS.quotaExceededAnchor);
    if (!anchor) return false;
    const text = (anchor.innerText || "").trim();
    return text.length > 0 && isVisible(anchor);
  }
  function generationLimitText() {
    if (quotaAnchorPresent()) return "Gemini image generation quota reached (freemium quota disclaimer present).";
    return matchesGenerationLimit(latestAssistantText()) ? "Gemini image generation limit reached for now." : null;
  }

  // Generating signal (evidence snapshot 2): Stop button visible OR
  // chat-window-scoped busy OR thinking-dots-animation present. The idle page
  // keeps page-wide progressbars alive (sidebar spinner), so the busy check is
  // scoped; image-loading-overlay exists in DOM templates even at rest and is
  // never used alone.
  function generatingSignal() {
    if (findStopButton()) return true;
    if (document.querySelector(ADAPTER.SELECTORS.generatingBusy)) return true;
    return Boolean(document.querySelector(ADAPTER.SELECTORS.thinkingAnimation));
  }

  /* ---- composer text (Quill) ------------------------------------------------ */

  // Gemini's composer is a Quill editor that ignores plain value
  // assignment. Proven v0.1.0 path: focus, select-all, execCommand insertText,
  // then a textContent+InputEvent fallback if Quill ignored the command.
  function setComposerText(target, text) {
    target.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(target);
    selection.removeAllRanges();
    selection.addRange(range);

    let inserted = false;
    try {
      inserted = document.execCommand("insertText", false, text);
    } catch (_) {
      inserted = false;
    }

    if (!inserted || (target.innerText || target.textContent || "").trim() !== text.trim()) {
      target.textContent = text;
      try {
        target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
      } catch (_) {
        target.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
  }

  /* ---- image candidates ------------------------------------------------------ */

  // Anything inside user-query (the operator's own uploads re-rendered in the
  // conversation), image-card (zero-state template gallery) or input-container
  // (composer previews), or served from gstatic, is INPUT evidence -- never
  // provider output (evidence snapshots 1/1b/3).
  function isExcludedInput(image, source) {
    if (image.closest(ADAPTER.SELECTORS.outputExclude)) return true;
    return ADAPTER.SELECTORS.excludedImageHostPattern.test(source);
  }

  // A generated result image (evidence snapshot 3): lives under
  // generated-image > single-image > img, alt contains "AI generated" OR src
  // host is lh3.googleusercontent.com. Size is enforced via `visible`.
  function isGeneratedImage(image, source) {
    if (!image.closest(ADAPTER.SELECTORS.generatedImageContainer)) return false;
    const alt = (image.alt || "").toLowerCase();
    return alt.includes(ADAPTER.SELECTORS.generatedImageAltMarker) || ADAPTER.SELECTORS.generatedImageHostPattern.test(source);
  }

  function imageCandidates(root = document, inputEvidence = { sources: new Set(), names: new Set() }) {
    const minSize = ADAPTER.SELECTORS.generatedImageMinSize;
    return Array.from(root.querySelectorAll("img")).map((image) => {
      const source = image.currentSrc || image.src || "";
      const rect = image.getBoundingClientRect();
      const inUserQuery = Boolean(image.closest(ADAPTER.SELECTORS.userQueryContainer));
      const inModelResponse = ADAPTER.SELECTORS.responseContainer.some((selector) => Boolean(image.closest(selector)));
      const role = inUserQuery ? "user" : inModelResponse ? "assistant" : "unknown";
      const label = `${image.alt || ""} ${image.getAttribute("aria-label") || ""}`.toLowerCase();
      const namedReference = Array.from(inputEvidence.names || []).some((name) => label.includes(name));
      const generated = isGeneratedImage(image, source);
      // Pilot-04 (Q001, Q005): Gemini sometimes fails to RENDER the inline
      // preview even though the image exists (owner saw it on click; the img
      // carries a real https lh3 result URL). That URL only exists once the
      // model actually produced the image, so a verified generated candidate
      // with a remote result source counts as present even when unrendered —
      // rendering is cosmetic. Attribution still requires a fresh
      // model-response container after the boundary, and completion still
      // requires the generating signals to clear.
      const remoteVerifiedResult = generated && /^https:/i.test(source) && ADAPTER.SELECTORS.generatedImageHostPattern.test(source);
      return {
        source,
        source_id: shortHash(source),
        node_id: nodeId(image, "image"),
        role,
        input: role === "user" || isExcludedInput(image, source) || inputEvidence.sources?.has(source) || namedReference,
        visible: (isVisible(image) && rect.width >= minSize && rect.height >= minSize) || remoteVerifiedResult,
        ready: (image.complete && image.naturalWidth > 0) || remoteVerifiedResult,
        generated,
      };
    }).filter((candidate) => /^(https:|data:image\/|blob:)/i.test(candidate.source));
  }

  // Quyết định Đức 26/08 (sau khi số liệu bác bỏ phương án "chờ đổi địa chỉ"):
  // phép kiểm "ảnh phải hiện ra thật" GIỮ NGUYÊN — ta chỉ đưa ảnh vào tầm mắt
  // để phép đo đúng, giống như người dùng cuộn chuột xuống xem.
  //
  // Bằng chứng: ảnh của lượt trả lời mới nằm dưới đáy hội thoại dài, ngoài
  // viewport, nên getBoundingClientRect() đo ra 0 -> candidate.visible = false
  // -> NO_NEW_IMAGE, dù ảnh có thật. Cùng lúc đó dom_probe (chạy sau khi trang
  // đã cuộn) đo được 330x180. Lớp khoan dung của Pilot-04 chỉ cứu ảnh
  // https://lh3, mà Gemini nay trả 6/6 ảnh dạng blob: nên nó không còn áp được.
  //
  // Đây KHÔNG phải nới lỏng: ảnh rỗng, ảnh giả hay phần tử 0px thì cuộn tới
  // cũng vẫn 0px. Ta chỉ loại bỏ một phép đo sai do vị trí cuộn trang.
  let lastScrollProbe = null;
  function nudgeCandidateIntoView(message) {
    if (!message) return;
    const images = Array.from(message.querySelectorAll("img"));
    if (!images.length) return;
    const target = images[images.length - 1];
    const before = target.getBoundingClientRect();
    if (isVisible(target) && before.width > 0 && before.height > 0) return;
    try { target.scrollIntoView({ block: "nearest", inline: "nearest" }); }
    catch (_) { return; }
    const after = target.getBoundingClientRect();
    lastScrollProbe = {
      scrolled: true,
      before: { w: Math.round(before.width), h: Math.round(before.height) },
      after: { w: Math.round(after.width), h: Math.round(after.height) },
      became_visible: isVisible(target) && after.width > 0 && after.height > 0,
    };
  }

  // Output attribution only ever considers verified generated-image candidates;
  // the full candidate list still forms the baseline so nothing pre-existing
  // can be claimed as fresh output.
  function outputCandidates(root, inputEvidence) {
    return imageCandidates(root, inputEvidence).filter((candidate) => candidate.generated);
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
    return Object.freeze({
      assistant_count: assistants.length,
      assistant_keys: assistants.map(responseKey),
      assistant_fingerprints: assistants.map(assistantFingerprint),
      assistant_node_ids: assistants.map((message) => nodeId(message, "assistant")),
      images,
      image_source_ids: images.map((candidate) => candidate.source_id),
      image_node_ids: images.map((candidate) => candidate.node_id),
    });
  }
  // A new model-response container appears FIRST; its image content streams in
  // later (evidence snapshot 2). Container identity -- not content
  // fingerprints -- decides which turn is new, so a streaming turn stays "new"
  // for its whole lifetime.
  function newAssistantMessages(boundary) {
    const known = new Set(boundary?.assistant_keys || []);
    return assistantMessages().filter((message) => !known.has(responseKey(message)));
  }
  function imageDecision(boundary, inputEvidence) {
    const postTurnMessages = newAssistantMessages(boundary);
    return { decision: window.DacImageEvidence.selectAttributableImage({ postTurn: postTurnMessages.flatMap((message) => outputCandidates(message, inputEvidence)), visible: outputCandidates(document, inputEvidence), baseline: boundary?.images || [] }), assistant_count_after: assistantMessages().length, new_assistant_fingerprints: postTurnMessages.map(assistantFingerprint) };
  }
  function boundaryTelemetry(boundary) {
    return { assistant_count_before: boundary?.assistant_count || 0, assistant_node_ids: boundary?.assistant_node_ids || [], assistant_fingerprints: boundary?.assistant_fingerprints || [], baseline_image_count: boundary?.images?.length || 0, baseline_source_ids: boundary?.image_source_ids || [], baseline_image_node_ids: boundary?.image_node_ids || [] };
  }
  // CARRIED_DIAGNOSTICS are attempt-level facts established BEFORE completion
  // polling settles (which reference-attach path won; what a blob: image
  // really was). They must survive recordDetection's wholesale replacement:
  // the panel's authoritative ledger writer is applyAttemptTelemetry, which
  // serialises exactly `attempt.detection` and runs AFTER the earlier
  // detected-not-downloaded write -- so anything not in here is erased before
  // it reaches the ledger. Live proof 2026-08-26: a first attempt parked these
  // on `result` instead, the job passed, and both fields came back undefined.
  const CARRIED_DIAGNOSTICS = Object.freeze(["attach", "blob_conversion", "image_url_dropped", "scroll_probe"]);
  function recordDetection(attempt, values) {
    if (!attempt) return;
    const carried = {};
    for (const key of CARRIED_DIAGNOSTICS) carried[key] = attempt.detection?.[key] ?? null;
    attempt.detection = { ...values, ...carried };
  }
  function carryDiagnostic(attempt, key, value) {
    if (!attempt || value === undefined || value === null) return;
    attempt.detection = { ...(attempt.detection || {}), [key]: value };
  }

  /* ---- attachments (stage -> confirm split) --------------------------------- */

  function composerScope() {
    const target = findComposer();
    return target?.closest(ADAPTER.SELECTORS.composerScope) || document;
  }

  // The idle page keeps page-wide progressbars alive (sidebar spinner,
  // chat-loading-animation -- evidence snapshot 1); a page-wide busy latch
  // would deadlock, so pending-upload checks stay inside input-container.
  function uploadIsPending() {
    const scope = composerScope();
    if (scope === document) return false;
    return ADAPTER.SELECTORS.uploadPending.some((selector) => Boolean(scope.querySelector(selector)));
  }

  // Summing overlapping selectors across the whole document is not a count of
  // attachments: previews can match several selectors at once, and a
  // placeholder replaced in place by the finished thumbnail produces no
  // increase at all. Observe unique NEW nodes inside the composer scope
  // instead (v0.1.0 addedSince model).
  function attachmentNodes(scope = composerScope()) {
    const found = new Set();
    for (const selector of ADAPTER.SELECTORS.attachmentPreview) {
      for (const node of scope.querySelectorAll(selector)) found.add(node);
    }
    // Brand-agnostic fallback: a small image rendered inside the composer
    // scope is an attachment preview, whatever Google renames its internals to.
    if (scope !== document) {
      for (const image of scope.querySelectorAll("img")) {
        const rect = image.getBoundingClientRect();
        if (rect.width > 0 && rect.width <= 220 && rect.height > 0 && rect.height <= 220) found.add(image);
      }
    }
    return found;
  }

  // Diagnostic carried inside ATTACHMENT_NOT_READY errors so the audit trail
  // and the results workbook say which selector to add and which attach path
  // (transient input vs synthetic drop) Gemini honored -- without a devtools
  // session.
  function attachmentFingerprint(before, expected, input, path) {
    const scope = composerScope();
    const selectors = ADAPTER.SELECTORS.attachmentPreview.map((selector) => `${selector} => doc ${document.querySelectorAll(selector).length} / scope ${scope === document ? "-" : scope.querySelectorAll(selector).length}`);
    const thumbs = Array.from(document.querySelectorAll("img")).filter((image) => { const rect = image.getBoundingClientRect(); return rect.width > 0 && rect.width < 220 && rect.height > 0 && rect.height < 220; }).slice(0, 6)
      .map((image) => ({ testid: image.closest("[data-test-id]")?.getAttribute("data-test-id") || "", aria: image.closest("[aria-label]")?.getAttribute("aria-label") || "", cls: String(image.parentElement?.className || "").slice(0, 60) }));
    return { path: path || "unknown", expected, added: DECISIONS.addedSince(before, attachmentNodes(scope)), scoped: scope !== document, input_files: input?.files?.length ?? -1, busy: uploadIsPending(), selectors, thumbs };
  }

  function blockerSnapshot() {
    return { security: securityBlockerText(), quota: generationLimitText(), abortRequested: STATE.abortRequested };
  }

  // Fail-closed wait used by the attach expose/confirm loops: abort, security
  // and quota blockers all stop the loop (v0.1.0 blockingFailure semantics).
  async function waitUntil(check, timeoutMs, code, interval = 100) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (STATE.abortRequested) throw new Error("Automation stopped by user.");
      const blocker = securityBlockerText();
      if (blocker) throw new Error(`HARD_STOP: ${blocker}`);
      const limitBlocker = generationLimitText();
      if (limitBlocker) throw new Error(`LIMIT_STOP: ${limitBlocker}`);
      const value = check();
      if (value) return value;
      await sleep(interval);
    }
    throw new Error(code);
  }

  function queryTransientFileInput() {
    for (const selector of ADAPTER.SELECTORS.fileInput) {
      const input = document.querySelector(selector);
      if (input) return input;
    }
    return null;
  }

  // Gemini has NO persistent file input (evidence snapshot 1); one appears
  // only while the upload/tools menu is open (snapshot 4: one trigger
  // click is enough; menu rows are plain buttons, not [role=menuitem]).
  async function exposeTransientFileInput() {
    const waitInput = () => waitUntil(queryTransientFileInput, 3000, "FILE_INPUT_NOT_EXPOSED").catch((error) => {
      if (error.message === "FILE_INPUT_NOT_EXPOSED") return null;
      throw error;
    });
    return DECISIONS.exposeFileInput({
      queryInput: queryTransientFileInput,
      findTrigger: findUploadMenuButton,
      // Evidence (snapshot 4): the transient input exists the instant the menu
      // opens, and clicking the "Files" row fires input.click() -> a native OS
      // file dialog that automation cannot dismiss. The menu-item step is pure
      // downside on Gemini; a missed input budget goes straight to the
      // synthetic-drop fallback instead.
      findMenuItem: () => null,
      click: (element) => element.click(),
      snapshot: blockerSnapshot,
      waitInput,
    });
  }

  // Close the CDK overlay menu so it never intercepts the later Send click.
  function closeUploadMenu() {
    const init = { key: "Escape", code: "Escape", keyCode: 27, which: 27, bubbles: true, cancelable: true };
    // Angular CDK's OverlayKeyboardDispatcher listens on document.body; an
    // event whose target is `document` never reaches it (body is a
    // descendant, not an ancestor). Dispatch on body so the overlay hears it.
    const target = document.body || document.documentElement;
    target.dispatchEvent(new KeyboardEvent("keydown", init));
    target.dispatchEvent(new KeyboardEvent("keyup", init));
  }

  async function buildTransfer(referenceImages) {
    const transfer = new DataTransfer();
    for (const referenceImage of referenceImages) {
      const response = await fetch(referenceImage.dataUrl);
      const blob = await response.blob();
      transfer.items.add(new File([blob], referenceImage.fileName || referenceImage.name || "reference.png", { type: blob.type || "image/png" }));
    }
    return transfer;
  }

  function syntheticDropTarget() {
    return document.querySelector(ADAPTER.SELECTORS.fileDropTarget) || findComposer();
  }

  function dispatchSyntheticDrop(target, transfer) {
    for (const type of ["dragenter", "dragover", "drop"]) {
      let event;
      try {
        event = new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: transfer });
      } catch (_) {
        event = new Event(type, { bubbles: true, cancelable: true });
      }
      if (!event.dataTransfer) Object.defineProperty(event, "dataTransfer", { value: transfer });
      target.dispatchEvent(event);
    }
  }

  const ATTACH_PATH = Object.freeze({ TRANSIENT_INPUT: "transient_input", SYNTHETIC_DROP: "synthetic_drop" });
  const ATTACH_FALLBACK_CODES = new Set(["FILE_INPUT_NOT_EXPOSED", "UPLOAD_TRIGGER_MISSING", "UPLOAD_MENU_ITEM_MISSING"]);

  // Staging and confirmation are split so the prompt can be typed while the
  // page ingests the upload. Confirmation still runs BEFORE Send, so "never
  // submit without its verified reference" is unchanged.
  async function stageReferences(referenceImages) {
    const images = Array.isArray(referenceImages) ? referenceImages : [];
    if (!images.length) return null;
    const transfer = await buildTransfer(images);
    const before = attachmentNodes();
    let path = ATTACH_PATH.TRANSIENT_INPUT;
    let input = null;
    try {
      // Primary path: open the upload menu, assign to the transient input.
      // Snapshot-4 trap: the input's accept list carries no image extensions,
      // but accept never validates programmatic DataTransfer assignment.
      input = await exposeTransientFileInput();
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    } catch (error) {
      if (!ATTACH_FALLBACK_CODES.has(error?.message)) throw error;
      // Fallback: no transient input appeared within the wait budget --
      // dispatch a synthetic DataTransfer drop on the always-present
      // file-drop-indicator (or the composer), then confirm the same way.
      path = ATTACH_PATH.SYNTHETIC_DROP;
      const target = syntheticDropTarget();
      if (!target) throw new Error(`ATTACH_TARGET_MISSING ${JSON.stringify(attachmentFingerprint(before, images.length, null, path))}`);
      dispatchSyntheticDrop(target, transfer);
    }
    closeUploadMenu();
    await sleep(ADAPTER.TIMING.menuSettleMs);
    return { input, before, expected: images.length, path };
  }

  // Same set as attachmentNodes() but WITHOUT the size-based fallback, so a
  // success can still say whether the named selectors matched or whether only
  // the brand-agnostic heuristic carried it. That difference is the early
  // warning that Google renamed its internals -- see attachSummary().
  function selectorAttachmentCount(scope) {
    const found = new Set();
    for (const selector of ADAPTER.SELECTORS.attachmentPreview) {
      for (const node of scope.querySelectorAll(selector)) found.add(node);
    }
    return found.size;
  }

  // Recorded on SUCCESS, not only on failure. Without it the run says "the
  // reference attached" but never which of the two paths Gemini honored, so a
  // broken primary path degrades silently to the synthetic-drop fallback and
  // nobody learns until the fallback breaks too.
  function attachSummary(staged) {
    const scope = composerScope();
    return {
      path: staged.path,
      expected: staged.expected,
      added: DECISIONS.addedSince(staged.before, attachmentNodes(scope)),
      by_selector: selectorAttachmentCount(scope),
      scoped: scope !== document,
    };
  }

  async function confirmReferences(staged) {
    if (!staged) return null;
    try {
      await waitUntil(() => {
        const scope = composerScope();
        return DECISIONS.attachmentReady(0, staged.expected, { after: DECISIONS.addedSince(staged.before, attachmentNodes(scope)), busy: uploadIsPending() });
      }, ADAPTER.TIMING.referenceReadyTimeoutMs, "ATTACHMENT_NOT_READY", 250);
      return attachSummary(staged);
    } catch (error) {
      if (error.message !== "ATTACHMENT_NOT_READY") throw error;
      // The page may show the thumbnail even when no selector matched it.
      // Carry the real DOM shape so the first live run tells us which attach
      // path Gemini honored and which selector to add.
      const detail = new Error(`ATTACHMENT_NOT_READY ${JSON.stringify(attachmentFingerprint(staged.before, staged.expected, staged.input, staged.path))}`);
      detail.failure_type = "ATTACHMENT_NOT_READY";
      throw detail;
    }
  }

  /* ---- send + completion ----------------------------------------------------- */

  async function waitForSendButtonReady(timeoutMs = ADAPTER.TIMING.sendReadyTimeoutMs) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (STATE.abortRequested) throw new Error("Automation stopped by user.");
      const button = findSendButton();
      if (DECISIONS.sendReady({ found: Boolean(button), disabled: button?.disabled, ariaDisabled: button?.getAttribute("aria-disabled"), security: securityBlockerText(), quota: generationLimitText() })) return button;
      await sleep(100);
    }
    throw new Error("Send button did not become ready. Gemini DOM may have changed.");
  }

  // Magic-byte sniff. Needed because a Blob's `type` is whatever the page set
  // when it constructed it, and Gemini's generated-image blobs can arrive with
  // an empty or non-image type -- FileReader then produces
  // "data:application/octet-stream;base64,..." which background.js correctly
  // refuses (it only accepts https: or data:image/). The bytes are the truth,
  // so read them instead of trusting (or guessing) the label.
  // Live evidence 2026-08-26 (Pilot-REF-01 follow-up, job Q001 Hue): three
  // attempts each attached, submitted and DETECTED the image, then all three
  // died on "Generated image URL was not usable."
  function sniffImageType(bytes) {
    const at = (i) => bytes[i];
    if (at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47) return "image/png";
    if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return "image/jpeg";
    if (at(0) === 0x47 && at(1) === 0x49 && at(2) === 0x46) return "image/gif";
    if (at(0) === 0x52 && at(1) === 0x49 && at(2) === 0x46 && at(3) === 0x46 && at(8) === 0x57 && at(9) === 0x45 && at(10) === 0x42 && at(11) === 0x50) return "image/webp";
    // ISO-BMFF 'ftyp' box: AVIF and HEIC share it; only AVIF is in the
    // background extension list, so anything else here stays unknown.
    if (at(4) === 0x66 && at(5) === 0x74 && at(6) === 0x79 && at(7) === 0x70 && at(8) === 0x61 && at(9) === 0x76 && at(10) === 0x69 && at(11) === 0x66) return "image/avif";
    return null;
  }

  // Recorded so a rejection is diagnosable from the ledger alone, without a
  // devtools session on the owner's machine.
  let lastBlobConversion = null;

  async function downloadableUrl(url, attempt = null) {
    // Result images are https://lh3.googleusercontent.com per evidence
    // snapshot 3, but the guard stays: composer previews ARE blob:, and the
    // background chrome.downloads path rejects blob: outright.
    if (!String(url || "").startsWith("blob:")) return url;
    const raw = await (await fetch(url)).blob();
    const head = new Uint8Array(await raw.slice(0, 16).arrayBuffer());
    const sniffed = sniffImageType(head);
    // Prefer the sniffed bytes over the label: a blob labelled image/png that
    // actually holds JPEG bytes would otherwise be saved under a lying
    // extension. Fall back to the label only when the bytes say nothing.
    const type = sniffed || (raw.type.startsWith("image/") ? raw.type : null);
    lastBlobConversion = { blob_type: raw.type || "(rỗng)", sniffed, used: type, bytes: raw.size };
    // Ghi vào attempt.detection ngay, vì đó là nơi panel thật sự đọc để ghi sổ
    // cái. Chuyển đổi xảy ra SAU lần recordDetection cuối nên không bị xoá.
    carryDiagnostic(attempt, "blob_conversion", lastBlobConversion);
    if (!type) throw new Error(`BLOB_NOT_AN_IMAGE: blob type "${raw.type || "(rỗng)"}", ${raw.size} byte, 4 byte đầu ${Array.from(head.slice(0, 4)).map((b) => b.toString(16).padStart(2, "0")).join(" ")}`);
    const blob = raw.type === type ? raw : new Blob([raw], { type });
    return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob); });
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
      const generating = generatingSignal();
      if (generating) generationSeen = true;

      const messages = assistantMessages();
      const newMessages = newAssistantMessages(boundary);
      const resultMessage = newMessages.at(-1) || null;
      const text = assistantMessageText(resultMessage);

      // Two-tier quota detection, never mid-generation (partial text could
      // false-match): the freemium DOM anchor is unambiguous; the phrase
      // fallback runs only against the new message this attempt produced --
      // not the whole page, so an unrelated older turn can't trigger it.
      if (!generating && quotaAnchorPresent()) throw new Error("LIMIT_STOP: Gemini image generation quota reached (freemium quota disclaimer present).");
      if (resultMessage && !generating && matchesGenerationLimit(text)) throw new Error("LIMIT_STOP: Gemini image generation limit reached for now.");

      // Evaluate on every poll, including while generating, so a timeout can
      // explain whether generation state or attribution rejected the image.
      if (expectImage) {
        // Đưa ảnh của lượt này vào tầm mắt TRƯỚC khi đo, chỉ khi nó đang không
        // hiện ra. Không cuộn trong lúc còn đang sinh ảnh, để không can thiệp.
        if (resultMessage && !generating) {
          nudgeCandidateIntoView(resultMessage);
          if (lastScrollProbe) carryDiagnostic(attempt, "scroll_probe", lastScrollProbe);
        }
        const evaluated = imageDecision(boundary, inputEvidence);
        const decision = evaluated.decision;
        const diagnostics = decision.diagnostics || {};
        lastDetection = { ...boundaryTelemetry(boundary), assistant_count_after: evaluated.assistant_count_after, new_assistant_fingerprints: evaluated.new_assistant_fingerprints, stop_visible: Boolean(stopButton), generating, candidate_counts: { post_turn: diagnostics.post_turn || null, fresh: diagnostics.fresh || null }, baseline_vs_fresh: { baseline: diagnostics.baseline_count ?? boundary?.images?.length ?? 0, fresh: diagnostics.fresh?.total ?? 0 }, chosen_attribution: decision.attribution || null, decision_reason: decision.ok ? null : decision.reason || "NO_NEW_IMAGE", decision: diagnostics };
        recordDetection(attempt, lastDetection);
        // Gemini streams the finished image into the new model-response while
        // the generating signals are still clearing; completion additionally
        // requires every generating signal to have cleared, so exactly one
        // settled turn is ever claimed. sidepanel.js still independently waits
        // for DAC_WAIT_CHAT_READY before any next-job transition.
        const imageCompletion = window.DacImageEvidence.completionForImage(decision, { generationControlVisible: generating });
        if (imageCompletion.ok && !generating) {
          return {
            type: "image",
            text,
            char_count: text.length,
            assistant_message_index: resultMessage ? messages.indexOf(resultMessage) : null,
            assistant_count_before: boundary?.assistant_count || 0,
            assistant_count_after: messages.length,
            completion: { generation_seen: generationSeen, reason: imageCompletion.reason, poll_count: pollCount },
            image_url: await downloadableUrl(decision.candidate.source, attempt),
            image_attribution: decision.attribution,
            detection: lastDetection,
          };
        }
      }

      if (resultMessage && !generating) {
        const imageUrl = outputCandidates(resultMessage, inputEvidence).at(-1)?.source || null;
        // Chỉ https: và data: là tải được (background.js). blob: thì không.
        const imageDownloadable = imageUrl && /^(https:|data:)/i.test(String(imageUrl)) ? imageUrl : null;
        if (text === stableText) {
          if (!stableSince) stableSince = Date.now();
        } else {
          stableText = text;
          stableSince = Date.now();
        }

        // Phép chờ "blob đổi sang lh3" ĐÃ THÁO ngày 26/08: đo thật cho thấy
        // chờ 31 giây / 68 lần dò mà không đổi, và dom_probe xác nhận 6/6 ảnh
        // sinh ra vẫn giữ địa chỉ blob sau nhiều phút. Gemini không đổi. Giữ
        // phép chờ đó chỉ đốt thêm 30 giây mỗi lần trượt mà kết quả không khác.
        // Thay bằng nudgeCandidateIntoView() ở trên — trị đúng nguyên nhân
        // (phép đo sai do vị trí cuộn), không phải trị triệu chứng.

        // Require 1.5s of stable text from the first model-response created after the pre-send boundary.
        if (stableText && Date.now() - stableSince >= ADAPTER.TIMING.stableTextDwellMs) {
          // Phải đi qua attempt.detection: lần ghi sổ cái ở nhánh
          // detected-not-downloaded chỉ chạy khi CÓ image_url, mà ở đây ta vừa
          // bỏ nó đi — nên bản sao trên result không bao giờ tới được sổ cái.
          if (imageUrl && !imageDownloadable) {
            carryDiagnostic(attempt, "image_url_dropped", { scheme: String(imageUrl).split(":")[0] + ":", reason: "NOT_DOWNLOADABLE_FROM_TEXT_BRANCH" });
          }
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
            // Nhánh "kết quả là chữ" này từng trả URL THÔ. Ảnh Gemini sinh
            // ra có lúc là blob:, và background từ chối blob: thẳng — nên nó
            // rò ra ngoài dưới dạng thông điệp gây hiểu nhầm "Generated image
            // URL was not usable", trong khi nguyên nhân thật là ảnh không
            // được chấm là output gán được (decision_reason NO_NEW_IMAGE, do
            // ảnh không "visible"). Bằng chứng live 26/08 job Q001 Huế.
            //
            // KHÔNG chuyển đổi blob ở đây: làm vậy sẽ biến một job đang FAIL
            // thành SUCCESS, tức là đổi luật attribution — việc đó phải hỏi
            // Đức (AGENTS.md mục 2.4), không phải việc AI tự quyết.
            // Ở đây chỉ làm cho nó thất bại TRUNG THỰC: panel không có
            // image_url thì báo "không tìm thấy ảnh gán được" — đúng nguyên
            // nhân, thay vì đổ cho URL.
            image_url: imageDownloadable,
            image_url_dropped: imageUrl && !imageDownloadable ? { scheme: String(imageUrl).split(":")[0] + ":", reason: "NOT_DOWNLOADABLE_FROM_TEXT_BRANCH" } : null,
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

  function composerIsEmpty(composer) {
    return !(composer?.innerText || composer?.textContent || "").trim();
  }

  // Gemini quirk (evidence snapshot 3, finding 5): the Send button EXISTS
  // ONLY while the composer has content. On an EMPTY composer,
  // sendUsable := composerFound -- the absent button is normal idle state,
  // not missing readiness; the button is re-verified after typing by
  // waitForSendButtonReady before the one Send click.
  function sendUsable(composer, button) {
    if (composer && composerIsEmpty(composer)) return Boolean(composer);
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
        const sendButton = findSendButton();
        const blocker = securityBlockerText();
        const limitBlocker = generationLimitText();
        const readiness = window.DacChatReadiness.evaluate({ composerFound: Boolean(composer) && surfaceAllowedNow(), sendUsable: sendUsable(composer, sendButton), generating: generatingSignal(), securityBlocker: blocker, generationLimitBlocker: limitBlocker, attachmentPending: uploadIsPending(), outputVerified });
        if (readiness === "HARD_STOP") throw new Error(limitBlocker ? `LIMIT_STOP: ${limitBlocker}` : `HARD_STOP: ${blocker}`);
        if (readiness === "READY") {
          if (safetyCooldownSec > 0) await sleep(safetyCooldownSec * 1000);
          const finalComposer = findComposer();
          const finalSendButton = findSendButton();
          const finalBlocker = securityBlockerText();
          const finalLimitBlocker = generationLimitText();
          const finalReadiness = window.DacChatReadiness.evaluate({ composerFound: Boolean(finalComposer) && surfaceAllowedNow(), sendUsable: sendUsable(finalComposer, finalSendButton), generating: generatingSignal(), securityBlocker: finalBlocker, generationLimitBlocker: finalLimitBlocker, attachmentPending: uploadIsPending(), outputVerified });
          if (finalReadiness === "HARD_STOP") throw new Error(finalLimitBlocker ? `LIMIT_STOP: ${finalLimitBlocker}` : `HARD_STOP: ${finalBlocker}`);
          if (finalReadiness === "READY") return { ok: true, state: "IDLE_READY", composerFound: true, sendUsable: sendUsable(finalComposer, finalSendButton) };
        }
        await Promise.race([new Promise((resolve) => { wake = resolve; }), sleep(ADAPTER.TIMING.completionPollMs)]);
      }
    } finally {
      observer?.disconnect();
      wake = null;
    }
    throw new Error("Timed out waiting for an idle Gemini composer.");
  }

  async function runPrompt(prompt, timeoutMs, referenceImages = [], expectImage = false, requestAttempt = null) {
    if (STATE.busy) throw new Error("Gemini receiver busy: this tab is already running an automation prompt.");
    STATE.busy = true;
    STATE.abortRequested = false;
    if (requestAttempt) STATE.activeAttempt = requestAttempt;

    try {
      if (!surfaceAllowedNow()) {
        throw new Error("WRONG_SURFACE: the Gemini receiver tab must be on https://gemini.google.com/images (or a conversation this tab already submitted to).");
      }
      if (generatingSignal()) {
        throw new Error("Gemini is already generating. Wait for it to finish before starting the queue.");
      }

      const composer = findComposer();
      if (!composer) {
        throw new Error("Gemini composer not found. Open gemini.google.com/images and retry.");
      }

      // Order pinned by tests: attach-stage -> type prompt -> confirm
      // attachment -> send. Confirmation always completes before the one
      // guarded Send click, so no prompt is ever submitted without its
      // verified reference.
      emitRuntimeStage(requestAttempt, referenceImages.length ? "ATTACHING_REFS" : "SENDING");
      const staged = await stageReferences(referenceImages);
      setComposerText(composer, prompt);
      await sleep(ADAPTER.TIMING.postTypeSettleMs);
      // Đặt lại trước mỗi lần thử: biến này ở phạm vi module, để nguyên thì
      // một job không có blob nào sẽ thừa hưởng nhãn của job trước.
      lastBlobConversion = null;
      const attach = await confirmReferences(staged);

      const inputEvidence = referenceEvidence(referenceImages);
      const boundary = captureBoundary(inputEvidence);
      if (requestAttempt) Object.assign(requestAttempt, { boundary, inputEvidence, hasReferences: referenceImages.length > 0, expectImage, detection: { ...boundaryTelemetry(boundary), decision_reason: "PENDING", attach: attach ?? null } });

      const sendButton = await waitForSendButtonReady();
      emitRuntimeStage(requestAttempt, "SENDING");
      // Exactly one guarded Send click per attempt (submit-once protection):
      // any blocker or operator stop discovered at this instant prevents the
      // click entirely.
      await DECISIONS.clickSend({ snapshot: blockerSnapshot, click: () => sendButton.click() });
      STATE.submittedInThisTab = true;
      if (requestAttempt) { requestAttempt.phase = "SUBMITTED"; requestAttempt.submittedAt = new Date().toISOString(); }
      emitRuntimeStage(requestAttempt, "GENERATING");

      // Let Gemini process the click (and the /images -> /app SPA navigation)
      // before completion polling.
      await sleep(ADAPTER.TIMING.postSendSettleMs);

      const result = await waitForCompletion({ boundary, timeoutMs, expectImage, inputEvidence, attempt: requestAttempt });
      // Carried on the result, not on attempt.detection: recordDetection()
      // replaces attempt.detection wholesale when completion polling settles,
      // so anything parked there before Send is wiped by the time the panel
      // writes the ledger row.
      if (result && attach) result.attach = attach;
      // Cùng lý do như attach: đi kèm result, vì attempt.detection bị
      // recordDetection() ghi đè khi vòng dò kết quả xong.
      if (result && lastBlobConversion) result.blob_conversion = lastBlobConversion;
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
    // Cùng họ lỗi với downloadableUrl(): ảnh Gemini sinh ra có lúc là blob:,
    // và background từ chối blob: thẳng. Đường này KHÔNG chuyển đổi được vì
    // handler đang đồng bộ (chuyển sang async là đổi hợp đồng của message
    // handler — việc riêng, đã ghi vào HANDOFF). Nên ít nhất đừng đẩy một URL
    // vô dụng xuống dưới rồi để nó chết với thông điệp khó hiểu: dừng ngay ở
    // đây, nói rõ vì sao.
    if (String(verified.candidate.source || "").startsWith("blob:")) {
      throw new Error("RECONCILE_BLOB_UNSUPPORTED: ảnh trên trang đang là blob: nên đường đối chiếu thủ công chưa tải được. Chờ Gemini đổi sang link lh3 rồi thử lại, hoặc dùng Recreate.");
    }
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
      const sendButton = findSendButton();
      // sendButtonFound=false on an EMPTY composer is NORMAL on Gemini
      // (evidence snapshot 3, finding 5) -- readiness never requires it
      // pre-typing; it is reported for diagnostics only.
      sendResponse({
        ok: true,
        url: location.href,
        // Gated on the surface rule: a composer on an unsubmitted /app
        // conversation must NOT green-light Check Plan, or the first run
        // halts as RECEIVER_LOST behind a passing plan (review finding F1).
        composerFound: Boolean(composer) && surfaceAllowedNow(),
        surface: ADAPTER.surface(location.href),
        sendButtonFound: Boolean(sendButton),
        generating: generatingSignal(),
        assistantCount: assistantMessages().length,
        busy: STATE.busy,
        securityBlocker: securityBlockerText(),
        generationLimitBlocker: generationLimitText(),
      });
      return false;
    }

    if (message.type === "DAC_DOM_PROBE") {
      // STRICTLY READ-ONLY diagnostics for the AI operator (bridge method
      // diagnostics.dom_probe): observes the page and returns a snapshot.
      // This path must never click, type, or change focus.
      try {
        const chainOf = (element, depth = 5) => {
          const out = []; let parent = element?.parentElement, hops = 0;
          while (parent && hops < depth) {
            const testid = parent.getAttribute?.("data-test-id");
            out.push(parent.tagName.toLowerCase() + (testid ? `[${testid}]` : ""));
            parent = parent.parentElement; hops += 1;
          }
          return out.join(" > ");
        };
        const selectorCounts = {};
        for (const [group, value] of Object.entries(ADAPTER.SELECTORS)) {
          if (Array.isArray(value)) {
            selectorCounts[group] = value.map((selector) => { try { return `${selector} => ${document.querySelectorAll(selector).length}`; } catch (_) { return `${selector} => ERR`; } });
          } else if (typeof value === "string") {
            try { selectorCounts[group] = `${value} => ${document.querySelectorAll(value).length}`; } catch (_) { selectorCounts[group] = `${value} => (not a selector)`; }
          }
        }
        const buttons = Array.from(document.querySelectorAll("button")).filter(isVisible)
          .map((button) => ({ aria: (button.getAttribute("aria-label") || "").slice(0, 60), testid: button.getAttribute("data-test-id") || "", txt: (button.innerText || "").replace(/\s+/g, " ").trim().slice(0, 40), disabled: button.disabled || button.getAttribute("aria-disabled") === "true" }))
          .filter((button) => button.aria || button.testid || button.txt).slice(0, 40);
        const images = Array.from(document.querySelectorAll("img")).slice(0, 15).map((image) => {
          const rect = image.getBoundingClientRect();
          const src = image.currentSrc || image.src || "";
          return { rect: { w: Math.round(rect.width), h: Math.round(rect.height) }, scheme: (src.match(/^(blob:|data:|https:|http:)/) || ["none"])[0], srcHead: src.slice(0, 70), alt: (image.alt || "").slice(0, 40), generated: isGeneratedImage(image, src), chain: chainOf(image) };
        });
        const customTags = [...new Set(Array.from(document.querySelectorAll("*")).map((element) => element.tagName.toLowerCase()).filter((tag) => tag.includes("-")))].slice(0, 100);
        const fileInputs = Array.from(document.querySelectorAll('input[type="file"]')).map((input) => ({ accept: (input.getAttribute("accept") || "").slice(0, 120), multiple: input.multiple, connected: input.isConnected, chain: chainOf(input) }));
        const probe = {
          captured_at: new Date().toISOString(),
          url: location.href,
          surface: ADAPTER.surface(location.href),
          surface_allowed: surfaceAllowedNow(),
          composerFound: Boolean(findComposer()),
          sendFound: Boolean(findSendButton()),
          stopFound: Boolean(findStopButton()),
          generating: generatingSignal(),
          attachmentPending: uploadIsPending(),
          securityBlocker: securityBlockerText(),
          generationLimitBlocker: generationLimitText(),
          busy: STATE.busy,
          selectorCounts, buttons, images, customTags, fileInputs,
          truncated: false,
        };
        // Payload cap ~64KB: shrink the bulky arrays first rather than fail.
        if (JSON.stringify(probe).length > 64 * 1024) {
          probe.images = probe.images.slice(0, 5);
          probe.buttons = probe.buttons.slice(0, 10);
          probe.customTags = probe.customTags.slice(0, 40);
          probe.truncated = true;
        }
        sendResponse({ ok: true, probe });
      } catch (error) {
        sendResponse({ ok: false, error: error?.message || String(error) });
      }
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
