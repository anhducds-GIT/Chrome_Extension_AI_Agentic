(() => {
  "use strict";
  const els = Object.fromEntries(["workbookInput", "referencesInput", "validateBtn", "runBtn", "stopBtn", "statusChip", "workbookText", "referenceText", "progressText", "progressDetail", "queueSummary", "queueList", "logList", "clearLogsBtn"].map((id) => [id, document.getElementById(id)]));
  const state = { workbook: null, files: [], prepared: null, running: false, stopRequested: false, terminal: 0 };
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function setStatus(status, label = status) { els.statusChip.className = `chip ${status.toLowerCase()}`; els.statusChip.textContent = label; }
  function log(text, kind = "") { const li = document.createElement("li"); li.className = kind; li.textContent = `${new Date().toLocaleTimeString()} · ${text}`; els.logList.prepend(li); }
  function progress(detail) { const total = state.prepared?.queue.length || 0; els.progressText.textContent = `${state.terminal} / ${total}`; els.progressDetail.textContent = detail; }
  function controls() { const ready = Boolean(state.workbook && state.prepared); els.validateBtn.disabled = !state.workbook || state.running; els.runBtn.disabled = !ready || state.running; els.stopBtn.disabled = !state.running; els.workbookInput.disabled = state.running; els.referencesInput.disabled = state.running; }
  function renderQueue() {
    const queue = state.prepared?.queue || []; els.queueList.textContent = ""; els.queueSummary.textContent = `${queue.length} job${queue.length === 1 ? "" : "s"}`;
    for (const item of queue) { const li = document.createElement("li"); li.className = item.status === "RUNNING" ? "current" : item.status.toLowerCase(); li.textContent = `#${item.number} ${item.job.id}${item.references.length ? ` · ${item.references.map((file) => window.DacRunnerCore.basename(file.fileName)).join(", ")}` : ""} · ${item.status}`; els.queueList.appendChild(li); }
  }
  async function activeTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/^https:\/\/(chatgpt\.com|chat\.openai\.com)\//i.test(tab.url || "")) throw new Error("Open a normal ChatGPT conversation in the active tab.");
    return tab;
  }
  async function send(message) { const tab = await activeTab(); try { return await chrome.tabs.sendMessage(tab.id, message); } catch (_) { throw new Error("HARD_STOP: ChatGPT receiver unavailable. Reload the ChatGPT tab once."); } }
  function dataUrl(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve({ fileName: file.name, dataUrl: reader.result }); reader.onerror = () => reject(reader.error || new Error("Could not read reference image.")); reader.readAsDataURL(file); }); }
  async function loadFiles() { state.files = []; for (const file of Array.from(els.referencesInput.files || [])) if (file.type.startsWith("image/")) state.files.push(await dataUrl(file)); els.referenceText.textContent = state.files.length ? `${state.files.length} local reference image(s) selected.` : "No local references selected."; await prepare(); }
  async function openWorkbook() {
    state.workbook = null; state.prepared = null; state.terminal = 0; controls();
    try { state.workbook = await window.DacXlsx.open(els.workbookInput.files?.[0]); await prepare(); log(`Opened ${state.workbook.fileName}.`); }
    catch (error) { setStatus("ERROR"); els.workbookText.textContent = error.message; log(error.message, "error"); controls(); }
  }
  async function prepare() {
    if (!state.workbook) return;
    try {
      state.prepared = window.DacRunnerCore.prepare(state.workbook, state.files); state.terminal = state.prepared.queue.filter((item) => item.status === "DONE").length;
      const settings = state.prepared.settings; els.workbookText.textContent = `${state.workbook.fileName} · ${state.prepared.queue.length} jobs · ${settings.delay_min_sec}-${settings.delay_max_sec}s delay`;
      setStatus("IDLE", "READY"); progress("Validate before Run."); renderQueue(); controls();
    } catch (error) { state.prepared = null; setStatus("ERROR"); progress(error.message); log(error.message, "error"); controls(); }
  }
  async function authoritativeValidate() {
    if (!state.workbook) throw new Error("Open an XLSX workbook first.");
    state.prepared = window.DacRunnerCore.prepare(state.workbook, state.files);
    const ping = await send({ type: "DAC_PING" });
    if (!ping?.composerFound || ping.generating || ping.busy || ping.securityBlocker) throw new Error(ping.securityBlocker ? `HARD_STOP: ${ping.securityBlocker}` : "ChatGPT must be reachable, idle, and show its composer.");
    return state.prepared;
  }
  async function validate() { try { await authoritativeValidate(); setStatus("DONE", "VALID"); progress("Validation passed. Ready to run."); renderQueue(); log("Validation passed.", "done"); } catch (error) { setStatus("ERROR"); progress(error.message); log(error.message, "error"); } controls(); }
  function download(url, jobId, outputFolder) { return new Promise((resolve) => chrome.runtime.sendMessage({ type: "DAC_DOWNLOAD_IMAGE", url, jobId, outputFolder }, resolve)); }
  function update(item, values) { window.DacXlsx.updateJob(state.workbook, item.job, values); }
  function saveLedger() { const anchor = document.createElement("a"); anchor.href = URL.createObjectURL(window.DacXlsx.downloadBlob(state.workbook)); anchor.download = window.DacRunnerCore.resultWorkbookName(state.workbook.fileName); anchor.click(); setTimeout(() => URL.revokeObjectURL(anchor.href), 1000); log(`Result ledger downloaded: ${anchor.download}.`, "done"); }
  async function countdown(seconds) { for (let remaining = seconds; remaining > 0 && !state.stopRequested; remaining -= 1) { progress(`Next job in 00:${String(remaining).padStart(2, "0")}`); await sleep(1000); } }
  async function run() {
    try { await authoritativeValidate(); } catch (error) { setStatus("ERROR"); progress(error.message); log(error.message, "error"); controls(); return; }
    state.running = true; state.stopRequested = false; state.terminal = state.prepared.queue.filter((item) => item.status === "DONE").length; setStatus("RUNNING"); renderQueue(); controls();
    const settings = state.prepared.settings; let halted = false;
    try {
      for (const item of state.prepared.queue) {
        if (state.stopRequested) break;
        if (item.skipped) continue;
        item.status = "RUNNING"; renderQueue(); progress(`Running ${item.job.id}…`); update(item, { status: "RUNNING", error: "" });
        try {
          const response = await send({ type: "DAC_RUN_IMAGE_JOB", prompt: item.job.prompt, timeoutMs: settings.timeout_sec * 1000, referenceImages: item.references });
          if (!response?.ok || !response.result?.image_url) throw new Error(response?.error || "No attributable generated image was found.");
          const accepted = await download(response.result.image_url, item.job.id, settings.output_folder);
          if (!accepted?.ok) throw new Error(accepted?.message || accepted?.error || "Image download was not accepted.");
          item.status = "DONE"; update(item, { status: "DONE", result_file: accepted.filename, result_download_id: accepted.download_id, error: "", completed_at: new Date().toISOString() }); log(`${item.job.id} done.`, "done");
        } catch (error) {
          if (state.stopRequested) { item.status = "STOPPED"; update(item, { status: "STOPPED", error: "Stopped by user.", completed_at: new Date().toISOString() }); break; }
          item.status = "FAILED"; update(item, { status: "FAILED", error: error.message, completed_at: new Date().toISOString() }); log(`${item.job.id} failed: ${error.message}`, "error");
          if (String(error.message).startsWith("HARD_STOP:") || !settings.continue_on_error) { state.terminal += 1; renderQueue(); halted = true; break; }
        }
        state.terminal += 1; renderQueue();
        if (!state.stopRequested && state.terminal < state.prepared.queue.length) await countdown(window.DacRunnerCore.delaySeconds(settings));
      }
      setStatus(state.stopRequested ? "IDLE" : halted ? "ERROR" : "DONE", state.stopRequested ? "STOPPED" : halted ? "HALTED" : "DONE"); progress(state.stopRequested ? "Stopped. No later jobs were submitted." : halted ? "Batch halted after terminal failure." : "Queue complete.");
    } finally { saveLedger(); state.running = false; state.stopRequested = false; renderQueue(); controls(); }
  }
  async function stop() { state.stopRequested = true; progress("Stopping current operation…"); try { await send({ type: "DAC_ABORT" }); } catch (_) { /* local stop prevents further jobs */ } }
  els.workbookInput.addEventListener("change", openWorkbook); els.referencesInput.addEventListener("change", () => loadFiles().catch((error) => log(error.message, "error"))); els.validateBtn.addEventListener("click", validate); els.runBtn.addEventListener("click", run); els.stopBtn.addEventListener("click", stop); els.clearLogsBtn.addEventListener("click", () => { els.logList.textContent = ""; }); controls();
})();
