(() => {
  "use strict";

  const els = {
    workbookInput: document.getElementById("workbookInput"), referencesInput: document.getElementById("referencesInput"),
    validateBtn: document.getElementById("validateBtn"), runBtn: document.getElementById("runBtn"), stopBtn: document.getElementById("stopBtn"),
    statusChip: document.getElementById("statusChip"), workbookText: document.getElementById("workbookText"),
    progressText: document.getElementById("progressText"), progressDetail: document.getElementById("progressDetail"),
    logList: document.getElementById("logList"), clearLogsBtn: document.getElementById("clearLogsBtn"),
  };
  const state = { workbook: null, references: new Map(), running: false, stopRequested: false, completed: 0 };
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function setStatus(status, label = status.toUpperCase()) { els.statusChip.className = `chip ${status}`; els.statusChip.textContent = label; }
  function updateControls() {
    els.validateBtn.disabled = !state.workbook || state.running; els.runBtn.disabled = !state.workbook || state.running; els.stopBtn.disabled = !state.running;
    els.workbookInput.disabled = state.running; els.referencesInput.disabled = state.running;
  }
  function log(text, kind = "") { const item = document.createElement("li"); item.className = kind; item.textContent = `${new Date().toLocaleTimeString()} · ${text}`; els.logList.prepend(item); }
  function progress(detail = "") { const total = state.workbook?.jobs.length || 0; els.progressText.textContent = `${state.completed} / ${total}`; els.progressDetail.textContent = detail; }
  function positiveNumber(value, fallback, minimum, maximum) { const number = Number(value); return Number.isFinite(number) ? Math.max(minimum, Math.min(number, maximum)) : fallback; }
  async function activeChatGptTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/^https:\/\/(chatgpt\.com|chat\.openai\.com)\//i.test(tab.url || "")) throw new Error("Open a normal ChatGPT conversation in the active tab.");
    return tab;
  }
  async function sendToChatGpt(message) {
    const tab = await activeChatGptTab();
    try { return await chrome.tabs.sendMessage(tab.id, message); }
    catch (_) { throw new Error("Cannot reach the ChatGPT page. Reload it once, then retry."); }
  }
  function readAsDataUrl(file) {
    return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error || new Error("Could not read image.")); reader.readAsDataURL(file); });
  }
  async function loadReferences(files) {
    state.references.clear();
    for (const file of Array.from(files || [])) if (file.type.startsWith("image/")) state.references.set(file.name.toLowerCase(), { fileName: file.name, dataUrl: await readAsDataUrl(file) });
    if (state.references.size) log(`${state.references.size} local reference image(s) ready.`);
  }
  async function openWorkbook() {
    state.workbook = null; state.completed = 0; updateControls(); progress("Reading XLSX…");
    try {
      state.workbook = await window.DacXlsx.open(els.workbookInput.files?.[0]);
      const timeout = positiveNumber(state.workbook.config.timeout_sec, 180, 15, 900);
      els.workbookText.textContent = `${state.workbook.fileName} · ${state.workbook.jobs.length} job(s) · timeout ${timeout}s`;
      setStatus("idle", "READY"); progress("Select Validate, then Run."); log(`Opened ${state.workbook.fileName}.`);
    } catch (error) { setStatus("error"); els.workbookText.textContent = error.message; log(error.message, "error"); }
    updateControls();
  }
  async function validate() {
    if (!state.workbook) return;
    try {
      const ping = await sendToChatGpt({ type: "DAC_PING" });
      if (!ping?.composerFound || ping.generating || ping.busy) throw new Error("ChatGPT must be open, idle, and show its composer.");
      const missing = state.workbook.jobs.filter((job) => job.reference_image && !state.references.has(String(job.reference_image).toLowerCase()));
      if (missing.length) throw new Error(`Missing local reference image(s): ${missing.map((job) => job.reference_image).join(", ")}.`);
      setStatus("done", "VALID"); progress("Validation passed. Ready to run."); log("Validation passed.", "done");
    } catch (error) { setStatus("error"); progress(error.message); log(error.message, "error"); }
  }
  function requestDownload(url, jobId) { return new Promise((resolve) => chrome.runtime.sendMessage({ type: "DAC_DOWNLOAD_IMAGE", url, jobId }, resolve)); }
  function saveWorkbook() {
    const blob = window.DacXlsx.downloadBlob(state.workbook); const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob); anchor.download = state.workbook.fileName; anchor.click(); setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
  }
  async function run() {
    if (!state.workbook || state.running) return;
    state.running = true; state.stopRequested = false; state.completed = 0; setStatus("running"); updateControls(); progress("Starting sequential run…");
    const timeoutMs = positiveNumber(state.workbook.config.timeout_sec, 180, 15, 900) * 1000;
    const delayMs = positiveNumber(state.workbook.config.delay_sec, 3, 1, 120) * 1000;
    let current = null;
    try {
      for (const job of state.workbook.jobs) {
        if (state.stopRequested) break;
        current = job; progress(`Running ${job.id}…`); log(`Running ${job.id}.`);
        window.DacXlsx.updateJob(state.workbook, job, { status: "running", error: "", result_file: "" });
        const referenceImage = job.reference_image ? state.references.get(String(job.reference_image).toLowerCase()) : null;
        const response = await sendToChatGpt({ type: "DAC_RUN_IMAGE_JOB", prompt: job.prompt, timeoutMs, referenceImage });
        if (!response?.ok || !response.result?.image_url) throw new Error(response?.error || "ChatGPT completed without a generated image URL.");
        const download = await requestDownload(response.result.image_url, job.id);
        if (!download?.ok) throw new Error(download?.message || download?.error || "Automatic image download failed.");
        window.DacXlsx.updateJob(state.workbook, job, { status: "done", result_file: download.filename, result_download_id: download.download_id, error: "" });
        state.completed += 1; progress(`Downloaded ${download.filename}.`); log(`${job.id} done.`, "done"); current = null;
        if (!state.stopRequested && state.completed < state.workbook.jobs.length) await sleep(delayMs);
      }
      if (state.stopRequested) { setStatus("idle", "STOPPED"); progress("Stopped. Completed rows have been saved."); log("Run stopped."); }
      else { setStatus("done"); progress("All jobs complete. Updated XLSX downloaded."); log("Run complete; downloading updated XLSX.", "done"); }
    } catch (error) {
      if (state.stopRequested) {
        if (current) window.DacXlsx.updateJob(state.workbook, current, { status: "aborted", error: "Stopped by user." });
        setStatus("idle", "STOPPED"); progress("Stopped. Completed rows have been saved."); log("Run stopped.");
      } else {
        if (current) window.DacXlsx.updateJob(state.workbook, current, { status: "failed", error: error.message });
        setStatus("error"); progress(error.message); log(error.message, "error");
      }
    } finally { saveWorkbook(); state.running = false; state.stopRequested = false; updateControls(); }
  }
  async function stop() {
    state.stopRequested = true; progress("Stopping after the current browser operation…");
    try { await sendToChatGpt({ type: "DAC_ABORT" }); } catch (_) { /* local stop remains authoritative */ }
  }
  els.workbookInput.addEventListener("change", openWorkbook);
  els.referencesInput.addEventListener("change", () => loadReferences(els.referencesInput.files).catch((error) => log(error.message, "error")));
  els.validateBtn.addEventListener("click", validate); els.runBtn.addEventListener("click", run); els.stopBtn.addEventListener("click", stop);
  els.clearLogsBtn.addEventListener("click", () => { els.logList.textContent = ""; }); updateControls();
})();
