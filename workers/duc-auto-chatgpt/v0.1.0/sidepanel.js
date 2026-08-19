(() => {
  "use strict";
  const ids = ["workbookInput", "referencesInput", "validateBtn", "runBtn", "runPendingBtn", "runFailedBtn", "retrySelectedBtn", "stopBtn", "statusChip", "workbookText", "referenceText", "referenceGallery", "progressText", "progressDetail", "failedJobsText", "currentJobId", "currentStage", "currentTiming", "currentSaved", "nextTaskCard", "nextTaskId", "nextTaskCountdown", "queueSummary", "queueList", "logList", "clearLogsBtn", "imageOutputText", "resultOutputText", "outputPermissionText", "imageOutputFolderInput", "resultLocationMode", "resultDownloadsFolderInput", "resultDownloadsFolderLabel", "resultFilenameInput", "chooseImageFolderBtn", "useSourceFolderBtn", "changeImageFolderBtn", "chooseResultFolderBtn", "runPlanList", "timeoutSecInput", "maxRetriesInput", "safetyCooldownInput", "maxInputImagesInput", "continueOnErrorInput", "rerunDoneInput"];
  const els = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
  const state = { workbook: null, files: [], prepared: null, outputSettings: null, runtimeOverrides: {}, selectedJobId: null, running: false, stopRequested: false, terminal: 0, runId: null, attemptSerial: 0, auditEvents: [], auditFile: "", currentItem: null, currentStage: "—", currentReason: "No run in progress.", currentStartedAt: null, runtimeTicker: null };
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function setStatus(status, label = status) { els.statusChip.className = `chip ${status.toLowerCase()}`; els.statusChip.textContent = label; }
  function log(text, kind = "") { const li = document.createElement("li"); li.className = kind; li.textContent = `${new Date().toLocaleTimeString()} · ${text}`; els.logList.prepend(li); }
  function progress(detail) {
    const plan = state.prepared ? window.DacRunnerCore.planSummary(state.prepared.queue, state.prepared.settings) : null;
    const finalizing = state.prepared ? state.prepared.queue.filter((item) => item.result_file && !["SUCCESS", "FAILED", "INTERRUPTED", "STOPPED"].includes(item.status)).length : 0;
    els.progressText.textContent = plan ? `Success ${plan.success_jobs}/${plan.total_jobs} · Saved/finalizing ${finalizing} · Running ${plan.running_jobs} · Pending ${plan.pending_jobs} · Failed ${plan.failed_jobs}${plan.interrupted_jobs ? ` · Interrupted ${plan.interrupted_jobs}` : ""}` : "0 / 0";
    els.progressDetail.textContent = detail;
  }
  function promptFingerprint(prompt) {
    let hash = 2166136261;
    for (const character of String(prompt || "")) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); }
    return `${(hash >>> 0).toString(16).padStart(8, "0")}:${String(prompt || "").length}`;
  }
  function nextAttemptId() {
    state.attemptSerial += 1;
    return `attempt-${Date.now().toString(36)}-${state.attemptSerial.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
  function audit(event, item = null, values = {}) {
    if (!state.runId) return;
    state.auditEvents.push({ timestamp: new Date().toISOString(), run_id: state.runId, job_id: item?.job?.id || null, attempt_id: item?.attempt_id || null, event, attempt: item?.attempt_count ?? null, phase: item?.phase || null, status: item?.status || null, failure_type: item?.failure_type || null, message: values.message || null, elapsed_ms: values.elapsed_ms ?? null, references: item ? item.references.map((file) => file.alias || file.fileName || file.name) : [], result_file: item?.result_file || null, result_download_id: item?.result_download_id || null, prompt_fingerprint: item ? promptFingerprint(item.job.prompt) : null, target_url: values.target_url || null });
  }
  function nextTask(item = null, detail = "—") { els.nextTaskCard.hidden = false; els.nextTaskId.textContent = item?.job?.id || "—"; els.nextTaskCountdown.textContent = detail; }
  function nextEligible(currentId = state.currentItem?.job?.id || null) { return window.DacRunState.nextEligible(state.prepared?.queue || [], currentId); }
  function renderRuntime() {
    const item = state.currentItem;
    els.currentJobId.textContent = item ? item.job.id : "—";
    els.currentStage.textContent = item ? state.currentStage || window.DacRunState.stageFor(item) : "—";
    const elapsed = state.currentStartedAt ? Math.floor((Date.now() - state.currentStartedAt) / 1000) : 0;
    const budget = item?.settings?.timeout_sec;
    els.currentTiming.textContent = item ? `Attempt ${item.attempt_count}/${1 + item.settings.max_retries} · Elapsed ${window.DacRunState.formatDuration(elapsed)}${budget ? ` · Stage budget ${window.DacRunState.formatDuration(Math.max(0, budget - elapsed))} remaining` : ""}${state.currentReason ? ` · ${state.currentReason}` : ""}` : state.currentReason;
    const saved = item?.result_file || "";
    els.currentSaved.hidden = !saved;
    els.currentSaved.textContent = saved ? `SAVED ✓ ${saved}` : "";
  }
  function setCurrent(item, stage, reason = "") {
    if (item && state.currentItem !== item) state.currentStartedAt = Date.now();
    state.currentItem = item || null; state.currentStage = stage || (item ? window.DacRunState.stageFor(item) : "—"); state.currentReason = reason || "";
    renderRuntime();
  }
  function startRuntimeTicker() { clearInterval(state.runtimeTicker); state.runtimeTicker = setInterval(renderRuntime, 1000); }
  function stopRuntimeTicker() { clearInterval(state.runtimeTicker); state.runtimeTicker = null; renderRuntime(); }

  function controls() {
    const ready = Boolean(state.workbook && state.prepared && state.outputSettings);
    const outputLocked = !state.workbook || state.running;
    els.validateBtn.disabled = !state.workbook || state.running;
    for (const element of [els.runBtn, els.runPendingBtn, els.runFailedBtn, els.retrySelectedBtn]) element.disabled = !ready || state.running;
    els.stopBtn.disabled = !state.running;
    els.workbookInput.disabled = state.running;
    els.referencesInput.disabled = state.running;
    for (const element of [els.imageOutputFolderInput, els.resultLocationMode, els.resultDownloadsFolderInput, els.resultFilenameInput, els.chooseImageFolderBtn, els.useSourceFolderBtn, els.changeImageFolderBtn, els.chooseResultFolderBtn, els.timeoutSecInput, els.maxRetriesInput, els.safetyCooldownInput, els.maxInputImagesInput, els.continueOnErrorInput, els.rerunDoneInput]) element.disabled = outputLocked;
    if (state.outputSettings?.image?.kind === "directory") els.imageOutputFolderInput.disabled = true;
    if (state.outputSettings?.result?.kind !== "downloads") els.resultDownloadsFolderInput.disabled = true;
  }

  function renderQueue() {
    const queue = state.prepared?.queue || [];
    els.queueList.textContent = "";
    els.queueSummary.textContent = `${queue.length} job${queue.length === 1 ? "" : "s"}`;
    for (const item of queue) {
      const li = document.createElement("li");
      li.className = ["RUNNING", "RECONCILING"].includes(item.status) ? "current" : item.status.toLowerCase();
      li.textContent = `#${item.number} ${item.job.id}${item.references.length ? ` · refs: ${item.references.map((file) => file.alias || window.DacRunnerCore.basename(file.fileName)).join(", ")}` : " · refs: none"} · ${item.status} · ${window.DacRunState.stageFor(item)} · attempt ${item.attempt_count}/${1 + item.settings.max_retries}${item.result_file ? ` · SAVED ✓ ${item.result_file}` : ""}${item.failure_type ? ` · ${item.failure_type}` : ""}`;
      li.addEventListener("click", () => { state.selectedJobId = item.job.id; renderQueue(); controls(); });
      if (state.selectedJobId === item.job.id) {
        const details = document.createElement("details"); details.open = true;
        const summary = document.createElement("summary"); summary.textContent = "Prompt / effective settings";
        const body = document.createElement("div"); body.textContent = `${item.job.prompt}\nReferences: ${item.references.map((file) => file.alias || file.fileName).join(", ") || "none"}\nTimeout: ${item.settings.timeout_sec}s · Retries: ${item.settings.max_retries} · Cooldown: ${item.settings.safety_cooldown_sec}s\nLast error: ${item.last_error || "—"}`;
        details.append(summary, body); li.appendChild(details);
      }
      els.queueList.appendChild(li);
    }
    const failures = queue.filter((item) => ["FAILED", "INTERRUPTED"].includes(item.status));
    els.failedJobsText.textContent = `Failed / Interrupted: ${failures.length}${failures.length ? ` · ${failures.map((item) => `${item.job.id}: ${item.failure_type || item.last_error || "OTHER"}`).join("; ")}` : ""}`;
  }

  function renderReferenceGallery() {
    els.referenceGallery.textContent = "";
    for (const [index, file] of state.files.entries()) {
      const row = document.createElement("div"); row.className = "reference-item";
      const image = document.createElement("img"); image.src = file.dataUrl; image.alt = file.fileName;
      const label = document.createElement("label"); label.textContent = file.fileName;
      const alias = document.createElement("input"); alias.value = file.alias || ""; alias.placeholder = "Alias (optional)";
      alias.addEventListener("change", async () => { file.alias = alias.value.trim(); try { await prepare(); } catch (_) { /* prepare renders error */ } });
      const remove = document.createElement("button"); remove.className = "secondary small"; remove.type = "button"; remove.textContent = "Remove";
      remove.addEventListener("click", async () => { state.files.splice(index, 1); await prepare(); renderReferenceGallery(); });
      label.appendChild(alias); row.append(image, label, remove); els.referenceGallery.appendChild(row);
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
      const execution = state.prepared ? window.DacRunnerCore.planSummary(state.prepared.queue, state.prepared.settings) : null;
      const rows = [["Source workbook", plan.sourceWorkbook], ["Generated images", plan.imageDestination], ["Result XLSX", plan.resultDestination], ["Naming", plan.namingPattern], ["Jobs", execution ? `${execution.total_jobs} total · ${execution.eligible_jobs} eligible · ${execution.skipped_done} skipped DONE · ${execution.failed_jobs} failed · ${execution.pending_jobs} pending` : "—"], ["Attempts", execution ? `${execution.total_max_attempts} maximum total · retry allowance ${execution.retry_allowance}` : "—"], ["Effective settings", state.prepared ? `timeout ${state.prepared.settings.timeout_sec}s · cooldown ${state.prepared.settings.safety_cooldown_sec}s · max refs ${state.prepared.settings.max_input_images}` : "—"]];
      for (const [label, value] of rows) {
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
    for (const file of Array.from(els.referencesInput.files || [])) if (file.type.startsWith("image/")) state.files.push({ ...(await dataUrl(file)), alias: "" });
    els.referenceText.textContent = state.files.length ? `${state.files.length} local reference image(s) selected.` : "No local references selected.";
    renderReferenceGallery();
    await prepare();
  }

  async function openWorkbook() {
    state.workbook = null; state.prepared = null; state.outputSettings = null; state.runtimeOverrides = {}; state.terminal = 0; renderOutput();
    try {
      state.workbook = await window.DacXlsx.open(els.workbookInput.files?.[0]);
      state.outputSettings = window.DacOutputLocation.fromWorkbook(state.workbook.config, state.workbook.fileName);
      setCurrent(null, "—", "Review the Run Plan before starting.");
      await prepare();
      log(`Opened ${state.workbook.fileName}.`);
    } catch (error) {
      setStatus("ERROR"); els.workbookText.textContent = error.message; log(error.message, "error"); controls();
    }
  }

  async function prepare() {
    if (!state.workbook) return;
    try {
      state.prepared = window.DacRunnerCore.prepare(state.workbook, state.files, state.runtimeOverrides);
      state.terminal = state.prepared.queue.filter((item) => item.status === "SUCCESS" || item.status === "DONE").length;
      const settings = state.prepared.settings;
      els.workbookText.textContent = `${state.workbook.fileName} · ${state.prepared.queue.length} jobs · ${settings.delay_min_sec}-${settings.delay_max_sec}s delay`;
      els.timeoutSecInput.value = settings.timeout_sec; els.maxRetriesInput.value = settings.max_retries; els.safetyCooldownInput.value = settings.safety_cooldown_sec; els.maxInputImagesInput.value = settings.max_input_images; els.continueOnErrorInput.value = String(settings.continue_on_error); els.rerunDoneInput.value = String(settings.rerun_done);
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

  async function updateRuntimeOverrides() {
    if (!state.workbook) return;
    state.runtimeOverrides = {
      timeout_sec: els.timeoutSecInput.value,
      max_retries: els.maxRetriesInput.value,
      safety_cooldown_sec: els.safetyCooldownInput.value,
      max_input_images: els.maxInputImagesInput.value,
      continue_on_error: els.continueOnErrorInput.value,
      rerun_done: els.rerunDoneInput.value
    };
    await prepare();
  }

  async function authoritativeValidate() {
    if (!state.workbook) throw new Error("Open an XLSX workbook first.");
    state.prepared = window.DacRunnerCore.prepare(state.workbook, state.files, state.runtimeOverrides);
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

  function update(item, values) {
    if (Object.hasOwn(values, "status")) item.status = values.status;
    if (Object.hasOwn(values, "attempt_phase")) item.phase = values.attempt_phase;
    if (Object.hasOwn(values, "result_file")) item.result_file = values.result_file;
    if (Object.hasOwn(values, "result_download_id")) item.result_download_id = values.result_download_id;
    if (Object.hasOwn(values, "failure_type")) item.failure_type = values.failure_type;
    if (Object.hasOwn(values, "last_error")) item.last_error = values.last_error;
    window.DacXlsx.updateJob(state.workbook, item.job, values);
  }

  function snapshotOutputSettings(actualResultFilename = null, actualAuditFilename = state.auditFile || null) {
    const plan = outputPlan();
    const settings = state.prepared.settings;
    const effectiveResult = window.DacOutputLocation.effective(state.outputSettings).result;
    const resultDestination = actualResultFilename ? window.DacOutputLocation.fileLabel(effectiveResult, actualResultFilename) : plan.resultDestination;
    const snapshot = { effective_source_workbook: plan.sourceWorkbook, effective_image_output: plan.imageDestination, effective_result_xlsx: resultDestination, effective_image_naming: plan.namingPattern, effective_audit_log: actualAuditFilename || "", effective_timeout_sec: settings.timeout_sec, effective_max_retries: settings.max_retries, effective_safety_cooldown_sec: settings.safety_cooldown_sec, effective_max_input_images: settings.max_input_images, effective_continue_on_error: settings.continue_on_error, effective_rerun_done: settings.rerun_done };
    window.DacXlsx.updateConfigSnapshot(state.workbook, snapshot);
    for (const item of state.prepared.queue) update(item, snapshot);
  }

  async function saveLedger(location) {
    const values = window.DacOutputLocation.effective(state.outputSettings);
    let filename = values.resultFilename;
    if (location.kind === "directory") {
      filename = await window.DacOutputLocation.findAvailableFilename(location.handle, window.DacOutputLocation.fileCandidates(filename));
      snapshotOutputSettings(filename);
      const blob = window.DacXlsx.downloadBlob(state.workbook);
      await window.DacOutputLocation.writeNewFile(location.handle, filename, blob);
      log(`Result ledger written: ${window.DacOutputLocation.fileLabel(location, filename)}.`, "done");
      return filename;
    }
    const blob = window.DacXlsx.downloadBlob(state.workbook);
    const objectUrl = URL.createObjectURL(blob);
    try {
      const downloadId = await chrome.downloads.download({ url: objectUrl, filename: `${location.folder}/${filename}`, conflictAction: "uniquify", saveAs: false });
      const item = await waitForCompletedDownload(downloadId);
      log(`Result ledger downloaded: ${item.filename}.`, "done");
      return item.filename;
    } finally { setTimeout(() => URL.revokeObjectURL(objectUrl), 1000); }
  }

  async function saveAuditLog(location) {
    const payload = state.auditEvents.map((event) => JSON.stringify(event)).join("\n") + (state.auditEvents.length ? "\n" : "");
    const blob = new Blob([payload], { type: "application/jsonl" });
    const requested = `run-${state.runId}.jsonl`;
    if (location.kind === "directory") {
      const filename = await window.DacOutputLocation.writeUniqueFile(location.handle, window.DacOutputLocation.fileCandidates(requested), blob);
      return window.DacOutputLocation.fileLabel(location, filename);
    }
    const objectUrl = URL.createObjectURL(blob);
    try {
      const downloadId = await chrome.downloads.download({ url: objectUrl, filename: `${location.folder}/${requested}`, conflictAction: "uniquify", saveAs: false });
      const item = await waitForCompletedDownload(downloadId);
      return item.filename;
    } finally { setTimeout(() => URL.revokeObjectURL(objectUrl), 1000); }
  }

  async function waitForCompletedDownload(downloadId, timeoutMs = 120000) {
    const lookup = async () => (await chrome.downloads.search({ id: downloadId }))?.[0] || null;
    const current = await lookup();
    if (current?.state === "complete" && current.filename) return current;
    if (current?.state === "interrupted") throw new Error(`Result XLSX download failed: ${current.error || "interrupted"}.`);
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (callback, value) => { if (!settled) { settled = true; clearTimeout(timer); chrome.downloads.onChanged.removeListener?.(listener); callback(value); } };
      const listener = async (delta) => {
        if (delta?.id !== downloadId || (!delta.state && !delta.filename)) return;
        try {
          const item = await lookup();
          if (item?.state === "complete" && item.filename) finish(resolve, item);
          else if (item?.state === "interrupted") finish(reject, new Error(`Result XLSX download failed: ${item.error || "interrupted"}.`));
        } catch (error) { finish(reject, error); }
      };
      const timer = setTimeout(() => finish(reject, new Error("Timed out waiting for the final result-XLSX filename.")), timeoutMs);
      chrome.downloads.onChanged.addListener(listener);
      lookup().then((item) => {
        if (item?.state === "complete" && item.filename) finish(resolve, item);
        else if (item?.state === "interrupted") finish(reject, new Error(`Result XLSX download failed: ${item.error || "interrupted"}.`));
      }).catch((error) => finish(reject, error));
    });
  }

  async function countdown(seconds, item) {
    for (const remaining of window.DacRunnerCore.countdownValues(seconds)) {
      if (state.stopRequested) break;
      nextTask(item, `Inter-job delay · starts in ${window.DacRunState.formatDuration(remaining)}`);
      await sleep(1000);
    }
  }

  async function waitForChatReady(item) {
    const response = await send({ type: "DAC_WAIT_CHAT_READY", timeoutMs: item.settings.timeout_sec * 1000, safetyCooldownSec: item.settings.safety_cooldown_sec, outputVerified: true });
    if (!response?.ok) throw new Error(response?.error || "ChatGPT did not become ready for the next job.");
  }

  function imageLocationFor(item, effectiveOutput) {
    return effectiveOutput.image.kind === "downloads" ? window.DacOutputLocation.downloadsLocation(item.settings.output_folder) : effectiveOutput.image;
  }

  function messageOf(error) { return error?.message || String(error); }
  function matchesAttempt(response, item) { return Boolean(response?.attempt && response.attempt.job_id === item.job.id && response.attempt.attempt_id === item.attempt_id); }

  function markInterrupted(item, failureType, message) {
    const now = new Date().toISOString();
    update(item, { status: "INTERRUPTED", attempt_phase: item.phase, attempt_count: item.attempt_count, retry_count: item.retry_count, failure_type: failureType, last_error: message, error: message, completed_at: now });
    audit("FAILURE", item, { message }); audit("JOB_INTERRUPTED", item, { message });
    log(`${item.job.id} interrupted: ${failureType}: ${message}`, "error");
    setCurrent(item, "INTERRUPTED", failureType);
    renderQueue(); progress(`${item.job.id} interrupted after ${item.phase}.`);
  }

  async function finishDetectedOutput(item, result, effectiveOutput) {
    item.phase = "OUTPUT_DETECTED";
    item.runtime_stage = "OUTPUT_DETECTED"; setCurrent(item, item.runtime_stage, "Attributable generated image found.");
    audit("OUTPUT_DETECTED", item);
    update(item, { status: "RUNNING", attempt_phase: item.phase, attempt_count: item.attempt_count, retry_count: item.retry_count });
    try {
      item.runtime_stage = "SAVING"; setCurrent(item, item.runtime_stage, "Writing generated image to the configured output.");
      if (!result?.image_url) throw new Error("No attributable generated image was found.");
      if (item.references.some((reference) => reference.dataUrl === result.image_url)) throw new Error("INPUT_IMAGE_FALSE_POSITIVE: output URL matches a selected reference image.");
      const accepted = await saveGeneratedImage(result.image_url, item.job.id, imageLocationFor(item, effectiveOutput));
      if (!accepted?.ok) throw new Error(accepted?.message || accepted?.error || "Image output was not accepted.");
      item.phase = "OUTPUT_SAVED";
      const outputSavedAt = new Date().toISOString();
      update(item, { status: "RUNNING", attempt_phase: item.phase, result_file: accepted.filename, result_download_id: accepted.download_id ?? "", output_saved_at: outputSavedAt, attempt_count: item.attempt_count, retry_count: item.retry_count, failure_type: "", last_error: "", error: "" });
      audit("OUTPUT_SAVED", item);
      item.runtime_stage = "OUTPUT_SAVED"; setCurrent(item, item.runtime_stage, "Image checkpoint recorded; waiting for ChatGPT to become idle.");
      renderQueue(); progress(`SAVED ✓ ${accepted.filename}`);
    } catch (error) {
      markInterrupted(item, window.DacRunnerCore.classifyFailure(error, item.phase), messageOf(error));
      return { completed: true, halted: true };
    }
    try {
      item.runtime_stage = "FINALIZING / WAITING_IDLE"; setCurrent(item, item.runtime_stage, "No new prompt can start until ChatGPT is idle.");
      await waitForChatReady(item);
      item.phase = "CHAT_READY"; audit("CHAT_READY", item);
      item.phase = "SUCCESS";
      item.runtime_stage = "SUCCESS"; setCurrent(item, item.runtime_stage, "Saved image and idle readiness confirmed.");
      update(item, { status: "SUCCESS", attempt_phase: item.phase, result_file: item.result_file, result_download_id: item.result_download_id, attempt_count: item.attempt_count, retry_count: item.retry_count, failure_type: "", last_error: "", error: "", completed_at: new Date().toISOString() });
      audit("JOB_SUCCESS", item); log(`${item.job.id} success after CHAT_READY.`, "done"); renderQueue(); progress(`${item.job.id} complete; saved output is checkpointed.`);
      return { completed: true, halted: false };
    } catch (error) {
      markInterrupted(item, window.DacRunnerCore.classifyFailure(error, "OUTPUT_SAVED"), messageOf(error));
      return { completed: true, halted: true };
    }
  }

  async function reconcileSubmittedAttempt(item, effectiveOutput, message) {
    item.status = "RECONCILING"; item.phase = "SUBMITTED";
    update(item, { status: "RECONCILING", attempt_phase: item.phase, attempt_count: item.attempt_count, retry_count: item.retry_count, failure_type: "", last_error: "", error: "" });
    audit("RECONCILE_START", item, { message }); renderQueue(); progress(`Reconciling ${item.job.id}; it will not be resubmitted.`);
    let response;
    try { response = await send({ type: "DAC_RECONCILE_IMAGE_JOB", job_id: item.job.id, attempt_id: item.attempt_id, timeoutMs: Math.min(item.settings.timeout_sec * 1000, 60000) }); }
    catch (error) { markInterrupted(item, "POST_SUBMIT_UNCERTAIN", messageOf(error)); return { completed: true, halted: true }; }
    if (!matchesAttempt(response, item)) { markInterrupted(item, "ATTEMPT_ID_MISMATCH", "Attempt identity mismatch during reconciliation."); return { completed: true, halted: true }; }
    if (response?.ok && response.result?.image_url) {
      audit("RECONCILE_RESULT", item, { message: "Late attributable output found." });
      return finishDetectedOutput(item, response.result, effectiveOutput);
    }
    const failureType = window.DacRunnerCore.classifyFailure(response?.error || message || "Post-submit output remained uncertain.", "SUBMITTED");
    audit("RECONCILE_RESULT", item, { message: response?.error || message || "No attributable output found." });
    markInterrupted(item, failureType === "TIMEOUT_AFTER_SUBMIT" ? "POST_SUBMIT_UNCERTAIN" : failureType, response?.error || message || "Post-submit output remained uncertain.");
    return { completed: true, halted: true };
  }

  async function gateNextJob(item) {
    item.status = "RECONCILING"; item.phase = "PRE_SUBMIT";
    item.runtime_stage = "WAITING_READY"; setCurrent(item, item.runtime_stage, "Checking the idle ChatGPT composer."); nextTask(nextEligible(item.job.id), "Waiting for current job to become ready.");
    update(item, { status: "RECONCILING", attempt_phase: item.phase, failure_type: "", last_error: "", error: "" });
    audit("RECONCILE_START", item, { message: "Pre-submit ChatGPT readiness gate." }); renderQueue();
    try {
      await waitForChatReady(item);
      audit("RECONCILE_RESULT", item, { message: "ChatGPT is idle and ready." });
      return true;
    } catch (error) {
      markInterrupted(item, window.DacRunnerCore.classifyFailure(error, "PRE_SUBMIT"), messageOf(error));
      return false;
    }
  }

  async function run(mode = "all") {
    let effectiveOutput;
    try { effectiveOutput = await authoritativeValidate(); }
    catch (error) { setStatus("ERROR"); progress(messageOf(error)); log(messageOf(error), "error"); controls(); return; }
    const runQueue = window.DacRunnerCore.selectQueue(state.prepared.queue, mode, state.selectedJobId);
    if (!runQueue.length) { setStatus("ERROR", "NOT READY"); progress(`No ${mode} jobs are eligible.`); controls(); return; }
    state.running = true; state.stopRequested = false; state.terminal = state.prepared.queue.filter((item) => item.status === "SUCCESS").length;
    state.runId = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`; state.attemptSerial = 0; state.auditEvents = []; state.auditFile = "";
    els.logList.textContent = "";
    startRuntimeTicker();
    const target = await activeTab().catch(() => null);
    audit("RUN_START", null, { target_url: target?.url || null }); log("Run started; visible log is scoped to this run.");
    setStatus("RUNNING"); renderQueue(); controls();
    const settings = state.prepared.settings; let halted = false;
    try {
      snapshotOutputSettings();
      for (let runIndex = 0; runIndex < runQueue.length; runIndex += 1) {
        const item = runQueue[runIndex];
        if (state.stopRequested) break;
        let completed = false;
        while (!completed && !state.stopRequested) {
          if (!(await gateNextJob(item))) { halted = true; completed = true; break; }
          item.status = "RUNNING"; item.phase = "PRE_SUBMIT"; item.attempt_count += 1;
          item.runtime_stage = item.references.length ? "ATTACHING_REFS" : "SENDING";
          item.attempt_id = nextAttemptId();
          const rerunReset = item.deliberate_rerun ? { result_file: "", result_download_id: "", output_saved_at: "" } : {};
          update(item, { ...rerunReset, status: "RUNNING", attempt_id: item.attempt_id, attempt_phase: item.phase, attempt_count: item.attempt_count, retry_count: item.retry_count, failure_type: "", last_error: "", error: "" });
          item.deliberate_rerun = false;
          audit("JOB_START", item); setCurrent(item, item.runtime_stage, item.references.length ? `Preparing ${item.references.length} reference image(s).` : "Preparing prompt submission."); renderQueue(); nextTask(nextEligible(item.job.id), "Waiting for current job to finish."); progress(`Running ${item.job.id}…`);
          let response;
          try { response = await send({ type: "DAC_RUN_IMAGE_JOB", job_id: item.job.id, attempt_id: item.attempt_id, prompt: item.job.prompt, timeoutMs: item.settings.timeout_sec * 1000, referenceImages: item.references }); }
          catch (error) { response = { ok: false, error: messageOf(error), attempt: { job_id: item.job.id, attempt_id: item.attempt_id, phase: "PRE_SUBMIT", submittedAt: null } }; }
          if (!matchesAttempt(response, item)) { markInterrupted(item, "ATTEMPT_ID_MISMATCH", "Attempt identity mismatch from ChatGPT content receiver."); completed = true; halted = true; break; }
          if (response?.attempt?.submittedAt || response?.attempt?.phase === "SUBMITTED" || response?.attempt?.phase === "OUTPUT_DETECTED") {
            item.phase = "SUBMITTED";
            if (item.references.length) audit("ATTACHMENTS_READY", item);
            audit("PROMPT_SUBMITTED", item, { target_url: target?.url || null });
          }
          if (response?.ok && response.result?.image_url) {
            const outcome = await finishDetectedOutput(item, response.result, effectiveOutput);
            completed = outcome.completed; halted ||= outcome.halted;
            continue;
          }
          const failureType = state.stopRequested ? "USER_STOP" : window.DacRunnerCore.classifyFailure(response?.error || "No attributable generated image was found.", item.phase);
          if (state.stopRequested) {
            update(item, { status: "STOPPED", attempt_phase: item.phase, attempt_count: item.attempt_count, retry_count: item.retry_count, failure_type: failureType, last_error: response?.error || "Stopped by user.", error: response?.error || "Stopped by user.", completed_at: new Date().toISOString() });
            audit("FAILURE", item, { message: response?.error || "Stopped by user." }); completed = true; break;
          }
          if (window.DacRunnerCore.needsReconciliation(item.phase)) {
            const outcome = await reconcileSubmittedAttempt(item, effectiveOutput, response?.error || failureType);
            completed = outcome.completed; halted ||= outcome.halted;
            continue;
          }
          if (window.DacRunnerCore.canRetry(item, failureType)) {
            item.retry_count += 1;
            update(item, { status: "PENDING", attempt_phase: "PRE_SUBMIT", attempt_count: item.attempt_count, retry_count: item.retry_count, failure_type: failureType, last_error: response?.error || failureType, error: response?.error || failureType });
            audit("FAILURE", item, { message: response?.error || failureType }); log(`${item.job.id} ${failureType}; retry ${item.retry_count}/${item.settings.max_retries} before any submission.`, "error"); renderQueue();
            await sleep(window.DacRunnerCore.retryCooldown(item.settings, item.retry_count) * 1000); continue;
          }
          update(item, { status: "FAILED", attempt_phase: "PRE_SUBMIT", attempt_count: item.attempt_count, retry_count: item.retry_count, failure_type: failureType, last_error: response?.error || failureType, error: response?.error || failureType, completed_at: new Date().toISOString() });
          audit("FAILURE", item, { message: response?.error || failureType }); log(`${item.job.id} failed: ${failureType}: ${response?.error || failureType}`, "error"); completed = true;
          if (failureType === "SECURITY_HARD_STOP" || failureType === "RECEIVER_LOST" || !settings.continue_on_error) halted = true;
        }
        state.terminal += 1; renderQueue();
        if (halted) break;
        const nextItem = runQueue[runIndex + 1] || null;
        if (!state.stopRequested && item.status === "SUCCESS" && nextItem) {
          const delay = window.DacRunnerCore.delaySeconds(settings);
          nextTask(nextItem, `Inter-job delay · ${delay}s before readiness check.`);
          await countdown(delay, nextItem);
        }
      }
      nextTask(null, "—"); setStatus(state.stopRequested ? "IDLE" : halted ? "ERROR" : "DONE", state.stopRequested ? "STOPPED" : halted ? "HALTED" : "DONE"); progress(state.stopRequested ? "Stopped. No later jobs were submitted." : halted ? "Batch halted after a protected terminal state." : "Queue complete.");
    } finally {
      audit("RUN_END", null, { message: state.stopRequested ? "STOPPED" : halted ? "HALTED" : "COMPLETE" });
      try { state.auditFile = await saveAuditLog(effectiveOutput.result); snapshotOutputSettings(null, state.auditFile); log(`Audit log written: ${state.auditFile}.`, "done"); }
      catch (error) { log(`Audit log failed: ${messageOf(error)}`, "error"); }
      try { await saveLedger(effectiveOutput.result); }
      catch (error) { setStatus("ERROR", "RESULT NOT SAVED"); progress(`Result XLSX was not written: ${messageOf(error)}`); log(`Result XLSX failed: ${messageOf(error)}`, "error"); }
      state.running = false; state.stopRequested = false; renderQueue(); controls();
      stopRuntimeTicker();
    }
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type !== "DAC_IMAGE_RUN_STAGE") return false;
    const item = state.currentItem;
    if (!item || message.job_id !== item.job.id || message.attempt_id !== item.attempt_id) return false;
    item.runtime_stage = message.stage;
    setCurrent(item, message.stage, message.stage === "GENERATING" ? "ChatGPT is generating; no next prompt will be sent." : "Live stage update from the ChatGPT receiver.");
    renderQueue(); progress(`${item.job.id}: ${message.stage}.`);
    return false;
  });

  async function stop() { state.stopRequested = true; progress("Stopping current operation…"); try { await send({ type: "DAC_ABORT" }); } catch (_) { /* local stop prevents further jobs */ } }

  els.workbookInput.addEventListener("change", openWorkbook);
  els.referencesInput.addEventListener("change", () => loadFiles().catch((error) => log(error.message, "error")));
  els.imageOutputFolderInput.addEventListener("change", setImageDownloadsFolder);
  els.resultLocationMode.addEventListener("change", setResultLocation);
  els.resultDownloadsFolderInput.addEventListener("change", setResultDownloadsFolder);
  els.resultFilenameInput.addEventListener("change", setResultFilename);
  for (const element of [els.timeoutSecInput, els.maxRetriesInput, els.safetyCooldownInput, els.maxInputImagesInput, els.continueOnErrorInput, els.rerunDoneInput]) element.addEventListener("change", () => updateRuntimeOverrides().catch((error) => log(error.message, "error")));
  els.chooseImageFolderBtn.addEventListener("click", () => chooseDirectory("Image folder selected", "image").catch((error) => { if (error.name !== "AbortError") { els.outputPermissionText.textContent = error.message; log(error.message, "error"); } }));
  els.changeImageFolderBtn.addEventListener("click", () => chooseDirectory("Image folder changed", "image").catch((error) => { if (error.name !== "AbortError") { els.outputPermissionText.textContent = error.message; log(error.message, "error"); } }));
  els.useSourceFolderBtn.addEventListener("click", () => useSourceFolder().catch((error) => { if (error.name !== "AbortError") { els.outputPermissionText.textContent = error.message; log(error.message, "error"); } }));
  els.chooseResultFolderBtn.addEventListener("click", () => chooseDirectory("Result XLSX folder selected", "result").then(() => { els.resultLocationMode.value = "directory"; renderOutput(); }).catch((error) => { if (error.name !== "AbortError") { els.outputPermissionText.textContent = error.message; log(error.message, "error"); } }));
  els.validateBtn.addEventListener("click", validate);
  els.runBtn.addEventListener("click", () => run("all"));
  els.runPendingBtn.addEventListener("click", () => run("pending"));
  els.runFailedBtn.addEventListener("click", () => run("failed"));
  els.retrySelectedBtn.addEventListener("click", () => run("selected"));
  els.stopBtn.addEventListener("click", stop);
  els.clearLogsBtn.addEventListener("click", () => { els.logList.textContent = ""; });
  renderOutput(); renderRuntime(); controls();
})();
