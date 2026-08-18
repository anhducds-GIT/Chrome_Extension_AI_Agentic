(() => {
  "use strict";

  const STATE = {
    busy: false,
    abortRequested: false,
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

  function latestAssistantText() {
    const messages = assistantMessages();
    const last = messages[messages.length - 1];
    return last ? (last.innerText || last.textContent || "").trim() : "";
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

  async function waitForCompletion({ beforeCount, beforeText, timeoutMs }) {
    const startedAt = Date.now();
    let responseStarted = false;
    let generationSeen = false;
    let stableText = "";
    let stableSince = 0;

    while (Date.now() - startedAt < timeoutMs) {
      if (STATE.abortRequested) throw new Error("Automation stopped by user.");

      const stopButton = findStopButton();
      if (stopButton) generationSeen = true;

      const messages = assistantMessages();
      const text = latestAssistantText();
      const changed = messages.length > beforeCount || (text && text !== beforeText);
      if (changed) responseStarted = true;

      if (responseStarted && !stopButton) {
        if (text === stableText) {
          if (!stableSince) stableSince = Date.now();
        } else {
          stableText = text;
          stableSince = Date.now();
        }

        // Require 1.5s of stable assistant text after generation UI disappears.
        if (stableText && Date.now() - stableSince >= 1500) {
          return {
            assistantCount: messages.length,
            responseChars: stableText.length,
            generationSeen,
          };
        }
      } else {
        stableSince = 0;
      }

      await sleep(300);
    }

    throw new Error(`Timed out after ${Math.round(timeoutMs / 1000)}s waiting for ChatGPT to finish.`);
  }

  async function runPrompt(prompt, timeoutMs) {
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

      const beforeCount = assistantMessages().length;
      const beforeText = latestAssistantText();

      setComposerValue(composer, prompt);
      await sleep(150);

      const sendButton = await waitForSendButtonReady(composer);
      sendButton.click();

      // Let ChatGPT process the click before completion polling.
      await sleep(500);

      return await waitForCompletion({ beforeCount, beforeText, timeoutMs });
    } finally {
      STATE.busy = false;
      STATE.abortRequested = false;
    }
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

    return false;
  });
})();
