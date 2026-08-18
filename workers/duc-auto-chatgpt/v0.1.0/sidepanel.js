(() => {
  "use strict";

  const els = {
    promptInput: document.getElementById("promptInput"),
    promptCount: document.getElementById("promptCount"),
    delayInput: document.getElementById("delayInput"),
    timeoutInput: document.getElementById("timeoutInput"),
    startBtn: document.getElementById("startBtn"),
    pauseBtn: document.getElementById("pauseBtn"),
    stopBtn: document.getElementById("stopBtn"),
    testBtn: document.getElementById("testBtn"),
    clearBtn: document.getElementById("clearBtn"),
    connectionText: document.getElementById("connectionText"),
    statusChip: document.getElementById("statusChip"),
    progressText: document.getElementById("progressText"),
    queueList: document.getElementById("queueList"),
  };

  const run = {
    prompts: [],
    index: 0,
    status: "idle",
    paused: false,
    stopped: false,
    itemStates: [],
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function parsePrompts(text) {
    return text
      .split(/^\s*---\s*$/m)
      .map((part) => part.trim())
      .filter(Boolean);
  }

  function summarizePrompt(prompt) {
    return prompt.replace(/\s+/g, " ").trim().slice(0, 72) + (prompt.replace(/\s+/g, " ").trim().length > 72 ? "…" : "");
  }

  function setStatus(status, label = status.toUpperCase()) {
    run.status = status;
    els.statusChip.className = `chip ${status}`;
    els.statusChip.textContent = label;
  }

  function renderQueue() {
    els.queueList.textContent = "";
    run.prompts.forEach((prompt, i) => {
      const li = document.createElement("li");
      const state = run.itemStates[i] || "pending";
      li.className = state === "running" ? "current" : state;

      const text = document.createElement("span");
      text.textContent = summarizePrompt(prompt);
      li.appendChild(text);

      const stateEl = document.createElement("span");
      stateEl.className = "state";
      stateEl.textContent = `· ${state}`;
      li.appendChild(stateEl);
      els.queueList.appendChild(li);
    });
    els.progressText.textContent = `${Math.min(run.index, run.prompts.length)} / ${run.prompts.length}`;
  }

  function refreshPromptCount() {
    const prompts = parsePrompts(els.promptInput.value);
    els.promptCount.textContent = `${prompts.length} prompt${prompts.length === 1 ? "" : "s"}`;
  }

  async function saveDraft() {
    await chrome.storage.local.set({
      dacDraft: els.promptInput.value,
      dacDelaySec: Number(els.delayInput.value) || 3,
      dacTimeoutSec: Number(els.timeoutInput.value) || 180,
    });
  }

  async function saveRunState() {
    await chrome.storage.local.set({
      dacRunState: {
        prompts: run.prompts,
        index: run.index,
        status: run.status,
        itemStates: run.itemStates,
        updatedAt: Date.now(),
      },
    });
  }

  async function activeChatGptTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No active browser tab found.");

    const url = tab.url || "";
    if (!/^https:\/\/(chatgpt\.com|chat\.openai\.com)\//i.test(url)) {
      throw new Error("Active tab is not ChatGPT. Open chatgpt.com first.");
    }
    return tab;
  }

  async function sendToChatGpt(message) {
    const tab = await activeChatGptTab();
    try {
      return await chrome.tabs.sendMessage(tab.id, message);
    } catch (error) {
      throw new Error("Cannot reach the ChatGPT page. Reload the ChatGPT tab once, then retry.");
    }
  }

  async function testConnection() {
    els.connectionText.textContent = "Testing…";
    try {
      const result = await sendToChatGpt({ type: "DAC_PING" });
      if (!result?.composerFound) {
        throw new Error("Connected, but composer was not detected. Open a normal ChatGPT conversation.");
      }
      const details = [
        "Connected",
        result.generating ? "ChatGPT generating" : "ready",
        `${result.assistantCount} assistant message(s) detected`,
      ];
      els.connectionText.textContent = details.join(" · ");
    } catch (error) {
      els.connectionText.textContent = error.message;
    }
  }

  function updateControls() {
    const active = run.status === "running" || run.status === "paused";
    els.startBtn.disabled = active;
    els.pauseBtn.disabled = !active;
    els.stopBtn.disabled = !active;
    els.pauseBtn.textContent = run.paused ? "Resume" : "Pause";
  }

  async function waitWhilePaused() {
    while (run.paused && !run.stopped) await sleep(200);
  }

  async function startQueue() {
    const prompts = parsePrompts(els.promptInput.value);
    if (!prompts.length) {
      setStatus("error", "NO PROMPTS");
      return;
    }

    await saveDraft();
    await testConnection();

    // Re-test with a machine-readable ping so a failed connection blocks Start.
    const ping = await sendToChatGpt({ type: "DAC_PING" });
    if (!ping?.composerFound) throw new Error("ChatGPT composer not detected.");
    if (ping.generating || ping.busy) throw new Error("ChatGPT is currently busy. Wait for it to finish.");

    run.prompts = prompts;
    run.index = 0;
    run.paused = false;
    run.stopped = false;
    run.itemStates = prompts.map(() => "pending");
    setStatus("running");
    updateControls();
    renderQueue();
    await saveRunState();

    const delayMs = Math.max(1000, Math.min((Number(els.delayInput.value) || 3) * 1000, 120000));
    const timeoutMs = Math.max(15000, Math.min((Number(els.timeoutInput.value) || 180) * 1000, 900000));

    try {
      for (let i = 0; i < run.prompts.length; i++) {
        run.index = i;
        await waitWhilePaused();
        if (run.stopped) break;

        run.itemStates[i] = "running";
        renderQueue();
        await saveRunState();

        const response = await sendToChatGpt({
          type: "DAC_RUN_PROMPT",
          prompt: run.prompts[i],
          timeoutMs,
        });

        if (!response?.ok) {
          run.itemStates[i] = "error";
          renderQueue();
          throw new Error(response?.error || `Prompt ${i + 1} failed.`);
        }

        run.itemStates[i] = "done";
        run.index = i + 1;
        renderQueue();
        await saveRunState();

        if (i < run.prompts.length - 1 && !run.stopped) {
          const delayEnd = Date.now() + delayMs;
          while (Date.now() < delayEnd && !run.stopped) {
            await sleep(Math.min(200, delayEnd - Date.now()));
          }
        }
      }

      if (run.stopped) {
        setStatus("idle", "STOPPED");
      } else {
        setStatus("done");
        run.index = run.prompts.length;
        renderQueue();
      }
    } catch (error) {
      if (run.stopped) {
        setStatus("idle", "STOPPED");
        els.connectionText.textContent = "Queue stopped. Current ChatGPT response was left untouched.";
      } else {
        setStatus("error");
        els.connectionText.textContent = error.message;
      }
    } finally {
      run.paused = false;
      run.stopped = false;
      updateControls();
      await saveRunState();
    }
  }

  async function togglePause() {
    if (run.status !== "running" && run.status !== "paused") return;
    run.paused = !run.paused;
    setStatus(run.paused ? "paused" : "running");
    updateControls();
    await saveRunState();
  }

  async function stopQueue() {
    run.stopped = true;
    run.paused = false;
    try {
      await sendToChatGpt({ type: "DAC_ABORT" });
    } catch (_) {
      // The queue is still marked stopped even if the tab disappeared.
    }
    setStatus("idle", "STOPPING");
    updateControls();
    await saveRunState();
  }

  async function restore() {
    const stored = await chrome.storage.local.get([
      "dacDraft",
      "dacDelaySec",
      "dacTimeoutSec",
      "dacRunState",
    ]);

    els.promptInput.value = stored.dacDraft || "";
    els.delayInput.value = stored.dacDelaySec || 3;
    els.timeoutInput.value = stored.dacTimeoutSec || 180;
    refreshPromptCount();

    const old = stored.dacRunState;
    if (old?.prompts?.length) {
      run.prompts = old.prompts;
      run.index = Number(old.index) || 0;
      run.itemStates = Array.isArray(old.itemStates) ? old.itemStates : old.prompts.map(() => "pending");
      // Side-panel JS cannot safely resume an in-flight request after it was closed.
      if (old.status === "running" || old.status === "paused") {
        setStatus("idle", "INTERRUPTED");
      } else {
        setStatus(old.status || "idle");
      }
      renderQueue();
    }
    updateControls();
  }

  els.promptInput.addEventListener("input", () => {
    refreshPromptCount();
    saveDraft();
  });
  els.delayInput.addEventListener("change", saveDraft);
  els.timeoutInput.addEventListener("change", saveDraft);
  els.testBtn.addEventListener("click", testConnection);
  els.clearBtn.addEventListener("click", async () => {
    els.promptInput.value = "";
    refreshPromptCount();
    await saveDraft();
  });
  els.startBtn.addEventListener("click", () => startQueue().catch((error) => {
    setStatus("error");
    els.connectionText.textContent = error.message;
    updateControls();
  }));
  els.pauseBtn.addEventListener("click", togglePause);
  els.stopBtn.addEventListener("click", stopQueue);

  restore();
})();
