(() => {
  "use strict";
  const ids = ["workbookInput", "referencesInput", "validateBtn", "runBtn", "stopBtn", "statusChip", "workbookText", "referenceText", "progressText", "progressDetail", "nextTaskCard", "nextTaskId", "nextTaskCountdown", "queueSummary", "queueList", "logList", "clearLogsBtn", "imageOutputText", "resultOutputText", "outputPermissionText", "imageOutputFolderInput", "resultLocationMode", "resultDownloadsFolderInput", "resultDownloadsFolderLabel", "resultFilenameInput", "chooseImageFolderBtn", "useSourceFolderBtn", "changeImageFolderBtn", "chooseResultFolderBtn", "runPlanList"];
  const els = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
  const state = { workbook: null, files: [], prepared: null, outputSettings: null, running: false, stopRequested: false, terminal: 0 };
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function setStatus(status, label = status) { els.statusChip.className = `chip ${status.toLowerCase()}`; els.statusChip.textContent = label; }
  function log(text, kind = "") { const li = document.createElement("li"); li.className = kind; li.textContent = `${new Date().toLocaleTimeString()} · ${text}`; els.logList.prepend(li); }
  function progress(detail) { const total = state.prepared?.queue.length || 0; els.progressText.textContent = `${state.terminal} / ${total}`; els.progressDetail.textContent = detail; }
  function nextTask(item = null, detail = "—") { els.nextTaskCard.hidden = false; els.nextTaskId.textContent = item?.job?.id || "—"; els.nextTaskCountdown.textContent = detail; }

  function controls() {
    const ready = Boolean(state.workbook && state.prepared && state.outputSettings);
    const outputLocked = !state.workbook || state.running;
    els.validateBtn.disabled = !state.workbook || state.running;
    els.runBtn.disabled = !ready || state.running;
    els.stopBtn.disabled = !state.running;
    els.workbookInput.disabled = state.running;
    els.referencesInput.disabled = state.running;
    for (const element of [els.imageOutputFolderInput, els.resultLocationMode, els.resultDownloadsFolderInput, els.resultFilenameInput, els.chooseImageFolderBtn, els.useSourceFolderBtn, els.changeImageFolderBtn, els.chooseResultFolderBtn]) element.disabled = outputLocked;
    if (state.outputSettings?.image?.kind === "directory") els.imageOutputFolderInput.disabled = true;
    if (state.outputSettings?.result?.kind !== "downloads") els.resultDownloadsFolderInput.disabled = true;
  }

  function renderQueue() {
    const queue = state.prepared?.queue || [];
    els.queueList.textContent = "";
    els.queueSummary.textContent = `${queue.length} job${queue.length === 1 ? "" : "s"}`;
    for (const item of queue) {
      const li = document.createElement("li");
      li.className = item.status === "RUNNING" ? "current" : item.status.toLowerCase();
      li.textContent = `#${item.number} ${item.job.id}${item.references.length ? ` · ${item.references.map((file) => window.DacRunnerCore.basename(file.fileName)).join(", ")}` : ""} · ${item.status}`;
      els.queueList.appendChild(li);
    }
  }

  function outputPlan() { return window.DacOutputLocation.runPlan(state.workbook?.fileName, state.outputSettings); }

  function renderPlan() {
    els.runPlanList.textContent = "";
    if (!state.workbook || !state.outputSettings) {
      const empty = document.createElement("dd"); empty.textContent = "Open an XLSX to view the run plan."; els.runPlanList.appendChild(empty); return;
    }
    try {
      const plan = outputPlan();
      for (const [label, value] of [["Source workbook", plan.sourceWorkbook], ["Generated images", plan.imageDestination], ["Result XLSX", plan.resultDestination], ["Naming", plan.namingPattern]]) {
        const dt = document.createElement("dt"); dt.textContent = label;
        const dd = document.createElement("dd"); dd.textContent = value;
        els.runPlanList.append(dt, dd);
      }
    } catch (error) {
      const empty = document.createElement("dd"); empty.textContent = error.message; els.runPlanList.appendChild(empty);
    }
  }

  function renderOutput() {
    if (!state.outputSettings || !state.workbook) {
      els.imageOutputText.textContent = "—"; els.resultOutputText.textContent = "—"; els.outputPermissionText.textContent = "Open an XLSX to set locations."; renderPlan(); controls(); return;
    }
    try {
      const values = window.DacOutputLocation.effective(state.outputSettings);
      els.imageOutputText.textContent = window.DacOutputLocation.locationLabel(values.image);
      els.resultOutputText.textContent = window.DacOutputLocation.fileLabel(values.result, values.resultFilename);
      els.imageOutputFolderInput.value = values.image.kind === "downloads" ? values.image.folder : "";
      els.resultLocationMode.value = state.outputSettings.result?.kind || "same_as_image";
      els.resultDownloadsFolderInput.value = values.result.kind === "downloads" ? values.result.folder : "";
      els.resultDownloadsFolderLabel.hidden = state.outputSettings.result?.kind !== "downloads";
      els.resultFilenameInput.value = values.resultFilename;
      els.outputPermissionText.textContent = values.image.kind === "directory" || values.result.kind === "directory" ? "Custom folder authorization will be checked before Run." : "Explicit Chrome Downloads location.";
    } catch (error) {
      els.outputPermissionText.textContent = error.message;
    }
    renderPlan(); controls();
  }

  async function activeTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/^https:\/\/(chatgpt\.com|chat\.openai\.com)\//i.test(tab.url || "")) throw new Error("Open a normal ChatGPT conversation in the active tab.");
    return tab;
  }

  async function send(message) {
    const tab = await activeTab();
    try { return await chrome.tabs.sendMessage(tab.id, message); }
    catch (_) { throw new Error("HARD_STOP: ChatGPT receiver unavailable. Reload the ChatGPT tab once."); }
  }

  function dataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ fileName: file.name, dataUrl: reader.result });
      reader.onerror = () => reject(reader.error || new Error("Could not read reference image."));
      reader.readAsDataURL(file);
    });
  }

  async function loadFiles() {
    state.files = [];
    for (const file of Array.from(els.referencesInput.files || [])) if (file.type.startsWith("image/")) state.files.push(await dataUrl(file));
    els.referenceText.textContent = state.files.length ? `${state.files.length} local reference image(s) selected.` : "No local references selected.";
    await prepare();
  }

  async function openWorkbook() {
    state.workbook = null; state.prepared = null; state.outputSettings = null; state.terminal = 0; renderOutput();
    try {
      state.workbook = await window.DacXlsx.open(els.workbookInput.files?.[0]);
      state.outputSettings = window.DacOutputLocation.fromWorkbook(state.workbook.config, state.workbook.fileName);
      await prepare();
      log(`Opened ${state.workbook.fileName}.`);
    } catch (error) {
      setStatus("ERROR"); els.workbookText.textContent = error.message; log(error.message, "error"); controls();
    }
  }

  async function prepare() {
    if (!state.workbook) return;
    try {
      state.prepared = window.DacRunnerCore.prepare(state.workbook, state.files);
      state.terminal = state.prepared.queue.filter((item) => item.status === "DONE").length;
      const settings = state.prepared.settings;
      els.workbookText.textContent = `${state.workbook.fileName} · ${state.prepared.queue.length} jobs · ${settings.delay_min_sec}-${settings.delay_max_sec}s delay`;
      setStatus("IDLE", "READY"); progress("Review the Run Plan, then Validate before Run."); renderQueue(); renderOutput();
    } catch (error) {
      state.prepared = null; setStatus("ERROR"); progress(error.message); log(error.message, "error"); controls();
    }
  }

  async function chooseDirectory(prompt, target) {
    if (typeof window.showDirectoryPicker !== "function") throw new Error("This Chrome build cannot authorize a folder. Use the explicit Chrome Downloads location or update Chrome.");
    const handle = await window.showDirectoryPicker({ mode: "readwrite" });
    const location = window.DacOutputLocation.directoryLocation(handle, handle.name);
    state.outputSettings[target] = location;
    els.outputPermissionText.textContent = `${prompt}: ${location.label}.`;
    renderOutput();
  }

  async function useSourceFolder() {
    if (!state.workbook) throw new Error("Open the source XLSX first.");
    if (typeof window.showDirectoryPicker !== "function") throw new Error("This Chrome build cannot authorize the source folder. Use the explicit Chrome Downloads location or update Chrome.");
    const handle = await window.showDirectoryPicker({ mode: "readwrite" });
    const location = window.DacOutputLocation.directoryLocation(handle, handle.name);
    state.outputSettings.image = location;
    state.outputSettings.result = { kind: "same_as_image" };
    els.outputPermissionText.textContent = `Source-folder mode: ${location.label}. Confirm that this is the folder containing ${state.workbook.fileName}.`;
    renderOutput();
  }

  function setImageDownloadsFolder() {
    try {
      state.outputSettings.image = window.DacOutputLocation.downloadsLocation(els.imageOutputFolderInput.value);
      els.outputPermissionText.textContent = "Using the explicit Chrome Downloads location.";
      renderOutput();
    } catch (error) { els.outputPermissionText.textContent = error.message; log(error.message, "error"); }
  }

  function setResultLocation() {
    try {
      const mode = els.resultLocationMode.value;
      if (mode === "same_as_image") state.outputSettings.result = { kind: "same_as_image" };
      else if (mode === "downloads") state.outputSettings.result = window.DacOutputLocation.downloadsLocation(els.resultDownloadsFolderInput.value || state.outputSettings.image?.folder || "Duc Auto ChatGPT");
      else state.outputSettings.result = { kind: "directory", handle: null, label: "No authorized result folder selected" };
      renderOutput();
    } catch (error) { els.outputPermissionText.textContent = error.message; log(error.message, "error"); }
  }

  function setResultDownloadsFolder() {
    if (state.outputSettings.result?.kind !== "downloads") return;
    try { state.outputSettings.result = window.DacOutputLocation.downloadsLocation(els.resultDownloadsFolderInput.value); renderOutput(); }
    catch (error) { els.outputPermissionText.textContent = error.message; log(error.message, "error"); }
  }

  function setResultFilename() {
    try { state.outputSettings.resultFilename = window.DacOutputLocation.safeFilename(els.resultFilenameInput.value, window.DacOutputLocation.baseResultName(state.workbook.fileName)); renderOutput(); }
    catch (error) { els.outputPermissionText.textContent = error.message; log(error.message, "error"); }
  }

  async function authoritativeValidate() {
    if (!state.workbook) throw new Error("Open an XLSX workbook first.");
    state.prepared = window.DacRunnerCore.prepare(state.workbook, state.files);
    const locationPreflight = await window.DacOutputLocation.preflight(state.outputSettings);
    if (!locationPreflight.ok) throw new Error(`OUTPUT_LOCATION: ${locationPreflight.error}`);
    const ping = await send({ type: "DAC_PING" });
    if (!ping?.composerFound || ping.generating || ping.busy || ping.securityBlocker) throw new Error(ping.securityBlocker ? `HARD_STOP: ${ping.securityBlocker}` : "ChatGPT must be reachable, idle, and show its composer.");
    els.outputPermissionText.textContent = "Output-location preflight passed.";
    return locationPreflight.effective;
  }

  async function validate() {
    try { await authoritativeValidate(); setStatus("DONE", "VALID"); progress("Validation passed. Ready to run."); renderQueue(); log("Validation passed, including output write permission.", "done"); }
    catch (error) { setStatus("ERROR"); progress(error.message); log(error.message, "error"); }
    controls();
  }

  function imageExtensionFromUrl(url) {
    const dataMime = /^data:image\/(avif|gif|jpe?g|png|webp)/i.exec(url || "")?.[1];
    if (dataMime) return dataMime.toLowerCase().replace("jpeg", "jpg");
    try {
      const parsed = new URL(url);
      const fromPath = /\.(avif|gif|jpe?g|png|webp)$/i.exec(parsed.pathname)?.[1];
      const fromQuery = parsed.searchParams.get("format") || parsed.searchParams.get("fm");
      return String(fromPath || fromQuery || "png").toLowerCase().replace("jpeg", "jpg");
    } catch (_) { return "png"; }
  }

  function download(url, jobId, outputFolder) {
    return new Promise((resolve) => chrome.runtime.sendMessage({ type: "DAC_DOWNLOAD_IMAGE", url, jobId, outputFolder }, resolve));
  }

  async function saveGeneratedImage(url, jobId, location) {
    if (location.kind === "downloads") return download(url, jobId, location.folder);
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) throw new Error(`Could not fetch the generated image for the selected folder (${response.status}).`);
    const blob = await response.blob();
    if (!blob.size) throw new Error("Generated image download was empty.");
    const extension = window.DacOutputLocation.actualExtension(blob, imageExtensionFromUrl(url));
    const filename = await window.DacOutputLocation.writeUniqueFile(location.handle, window.DacOutputLocation.imageCandidates(jobId, extension), blob);
    return { ok: true, filename: window.DacOutputLocation.fileLabel(location, filename), download_id: null, storage: "directory" };
  }

  function update(item, values) { window.DacXlsx.updateJob(state.workbook, item.job, values); }

  function snapshotOutputSettings() {
    const plan = outputPlan();
    const snapshot = { effective_source_workbook: plan.sourceWorkbook, effective_image_output: plan.imageDestination, effective_result_xlsx: plan.resultDestination, effective_image_naming: plan.namingPattern };
    window.DacXlsx.updateConfigSnapshot(state.workbook, snapshot);
    for (const item of state.prepared.queue) update(item, snapshot);
  }

  async function saveLedger(location) {
    const values = window.DacOutputLocation.effective(state.outputSettings);
    const blob = window.DacXlsx.downloadBlob(state.workbook);
    let filename = values.resultFilename;
    if (location.kind === "directory") {
      filename = await window.DacOutputLocation.writeUniqueFile(location.handle, window.DacOutputLocation.fileCandidates(filename), blob);
      log(`Result ledger written: ${window.DacOutputLocation.fileLabel(location, filename)}.`, "done");
      return filename;
    }
    const objectUrl = URL.createObjectURL(blob);
    try {
      await chrome.downloads.download({ url: objectUrl, filename: `${location.folder}/${filename}`, conflictAction: "uniquify", saveAs: false });
      log(`Result ledger downloaded: ${window.DacOutputLocation.fileLabel(location, filename)}.`, "done");
      return filename;
    } finally { setTimeout(() => URL.revokeObjectURL(objectUrl), 1000); }
  }

  async function countdown(seconds) {
    const item = state.prepared.queue.find((candidate) => candidate.status === "PENDING");
    for (const remaining of window.DacRunnerCore.countdownValues(seconds)) {
      if (state.stopRequested) break;
      nextTask(item, `Starts in 00:${String(remaining).padStart(2, "0")}`);
      await sleep(1000);
    }
  }

  async function run() {
    let effectiveOutput;
    try { effectiveOutput = await authoritativeValidate(); }
    catch (error) { setStatus("ERROR"); progress(error.message); log(error.message, "error"); controls(); return; }
    state.running = true; state.stopRequested = false; state.terminal = state.prepared.queue.filter((item) => item.status === "DONE").length;
    setStatus("RUNNING"); renderQueue(); controls();
    const settings = state.prepared.settings; let halted = false;
    try {
      snapshotOutputSettings();
      for (const item of state.prepared.queue) {
        if (state.stopRequested) break;
        if (item.skipped) continue;
        item.status = "RUNNING"; renderQueue(); nextTask(null, "Waiting for current job"); progress(`Running ${item.job.id}…`); update(item, { status: "RUNNING", error: "" });
        try {
          const response = await send({ type: "DAC_RUN_IMAGE_JOB", prompt: item.job.prompt, timeoutMs: settings.timeout_sec * 1000, referenceImages: item.references });
          if (!response?.ok || !response.result?.image_url) throw new Error(response?.error || "No attributable generated image was found.");
          if (item.references.some((reference) => reference.dataUrl === response.result.image_url)) throw new Error("INPUT_IMAGE_FALSE_POSITIVE: output URL matches a selected reference image.");
          const accepted = await saveGeneratedImage(response.result.image_url, item.job.id, effectiveOutput.image);
          if (!accepted?.ok) throw new Error(accepted?.message || accepted?.error || "Image output was not accepted.");
          item.status = "DONE";
          update(item, { status: "DONE", result_file: accepted.filename, result_download_id: accepted.download_id ?? "", error: "", completed_at: new Date().toISOString() });
          log(`${item.job.id} done.`, "done");
        } catch (error) {
          if (state.stopRequested) { item.status = "STOPPED"; update(item, { status: "STOPPED", error: "Stopped by user.", completed_at: new Date().toISOString() }); break; }
          item.status = "FAILED"; update(item, { status: "FAILED", error: error.message, completed_at: new Date().toISOString() }); log(`${item.job.id} failed: ${error.message}`, "error");
          if (String(error.message).startsWith("HARD_STOP:") || !settings.continue_on_error) { state.terminal += 1; renderQueue(); halted = true; break; }
        }
        state.terminal += 1; renderQueue();
        if (!state.stopRequested && state.terminal < state.prepared.queue.length) await countdown(window.DacRunnerCore.delaySeconds(settings));
      }
      nextTask(null, "—"); setStatus(state.stopRequested ? "IDLE" : halted ? "ERROR" : "DONE", state.stopRequested ? "STOPPED" : halted ? "HALTED" : "DONE"); progress(state.stopRequested ? "Stopped. No later jobs were submitted." : halted ? "Batch halted after terminal failure." : "Queue complete.");
    } finally {
      try { await saveLedger(effectiveOutput.result); }
      catch (error) { setStatus("ERROR", "RESULT NOT SAVED"); progress(`Result XLSX was not written: ${error.message}`); log(`Result XLSX failed: ${error.message}`, "error"); }
      state.running = false; state.stopRequested = false; renderQueue(); controls();
    }
  }

  async function stop() { state.stopRequested = true; progress("Stopping current operation…"); try { await send({ type: "DAC_ABORT" }); } catch (_) { /* local stop prevents further jobs */ } }

  els.workbookInput.addEventListener("change", openWorkbook);
  els.referencesInput.addEventListener("change", () => loadFiles().catch((error) => log(error.message, "error")));
  els.imageOutputFolderInput.addEventListener("change", setImageDownloadsFolder);
  els.resultLocationMode.addEventListener("change", setResultLocation);
  els.resultDownloadsFolderInput.addEventListener("change", setResultDownloadsFolder);
  els.resultFilenameInput.addEventListener("change", setResultFilename);
  els.chooseImageFolderBtn.addEventListener("click", () => chooseDirectory("Image folder selected", "image").catch((error) => { if (error.name !== "AbortError") { els.outputPermissionText.textContent = error.message; log(error.message, "error"); } }));
  els.changeImageFolderBtn.addEventListener("click", () => chooseDirectory("Image folder changed", "image").catch((error) => { if (error.name !== "AbortError") { els.outputPermissionText.textContent = error.message; log(error.message, "error"); } }));
  els.useSourceFolderBtn.addEventListener("click", () => useSourceFolder().catch((error) => { if (error.name !== "AbortError") { els.outputPermissionText.textContent = error.message; log(error.message, "error"); } }));
  els.chooseResultFolderBtn.addEventListener("click", () => chooseDirectory("Result XLSX folder selected", "result").then(() => { els.resultLocationMode.value = "directory"; renderOutput(); }).catch((error) => { if (error.name !== "AbortError") { els.outputPermissionText.textContent = error.message; log(error.message, "error"); } }));
  els.validateBtn.addEventListener("click", validate);
  els.runBtn.addEventListener("click", run);
  els.stopBtn.addEventListener("click", stop);
  els.clearLogsBtn.addEventListener("click", () => { els.logList.textContent = ""; });
  renderOutput(); controls();
})();
