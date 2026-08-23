(() => {
  "use strict";
  const Provider = globalThis.DagProviderCore; const Runner = globalThis.DagRunCore; const Xlsx = globalThis.DagXlsx;
  const ids = ["receiverBadge","workbookInput","referencesInput","referenceGallery","checkBtn","runBtn","stopBtn","planBadge","planSummary","attemptBadge","currentGrid","currentPrompt","currentReferenceGallery","pipeline","queueCount","queueList","downloadAuditBtn","log"];
  const el = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
  const state = { workbookFile: null, workbook: null, references: [], prepared: null, queue: [], runId: "", running: false, stopped: false, attemptSerial: 0, checkpointVersion: 0, audit: [], sourceSha256: "", target: null };
  const PHASES = ["PRE_SUBMIT","SUBMITTED","OUTPUT_DETECTED","OUTPUT_SAVED","CHAT_READY","SUCCESS"];
  function now() { return new Date().toISOString(); }
  function safe(value) { return String(value || "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "job"; }
  function log(message, level = "info") { const line = `${now()} [${level.toUpperCase()}] ${message}`; el.log.textContent += `${line}\n`; el.log.scrollTop = el.log.scrollHeight; }
  function badge(node, text, kind = "muted") { node.textContent = text; node.className = `badge ${kind}`; }
  function setControls() { el.workbookInput.disabled = state.running; el.referencesInput.disabled = state.running; el.checkBtn.disabled = state.running; el.runBtn.disabled = state.running || !state.prepared || !state.queue.some((item) => item.phase === "PENDING" || item.phase === "FAILED_PRE_SUBMIT"); el.stopBtn.disabled = !state.running; el.downloadAuditBtn.disabled = !state.audit.length; }
  function figure(reference) { const item = document.createElement("figure"); const image = document.createElement("img"); image.src = reference.dataUrl; image.alt = reference.alias; image.title = reference.alias; const caption = document.createElement("figcaption"); caption.textContent = reference.alias; item.append(image, caption); return item; }
  function renderReferences(target, references) { target.replaceChildren(...references.map(figure)); }
  function renderQueue() {
    el.queueList.replaceChildren(...state.queue.map((item) => { const li = document.createElement("li"); li.textContent = `${item.job.id} — ${item.phase}`; const small = document.createElement("small"); small.textContent = item.result_file || item.last_error || `${item.references.length} reference(s)`; li.appendChild(small); return li; }));
    badge(el.queueCount, String(state.queue.length), state.queue.length ? "ok" : "muted"); setControls();
  }
  function renderCurrent(item) {
    if (!item) { el.currentPrompt.textContent = "Chưa chạy"; el.currentReferenceGallery.replaceChildren(); el.currentGrid.classList.add("no-refs"); badge(el.attemptBadge, "—"); el.pipeline.replaceChildren(); return; }
    el.currentPrompt.textContent = item.job.prompt; renderReferences(el.currentReferenceGallery, item.references); el.currentGrid.classList.toggle("no-refs", !item.references.length); badge(el.attemptBadge, item.attempt_id || item.phase, item.phase === "SUCCESS" ? "ok" : "warn");
    el.pipeline.replaceChildren(...PHASES.map((phase) => { const span = document.createElement("span"); span.textContent = phase; const currentIndex = PHASES.indexOf(item.phase); if (PHASES.indexOf(phase) <= currentIndex || item.phase === "SUCCESS") span.className = "active"; return span; }));
  }
  function addAudit(type, item, values = {}) { const event = Runner.auditEvent(type, item, { run_id: state.runId, ...values }); state.audit.push(event); chrome.storage.local.set({ [`dag.audit.${state.runId}`]: state.audit }).catch(() => {}); el.downloadAuditBtn.disabled = false; log(`${type}${item ? ` ${item.job.id}` : ""}`); return event; }
  async function sha256(file) { const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer()); return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join(""); }
  function fileToDataUrl(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); }); }
  function chromeMessage(message) { return new Promise((resolve, reject) => chrome.runtime.sendMessage(message, (response) => { if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message)); else resolve(response); })); }
  function downloadBlob(blob, filename) { const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 30000); }
  async function saveCheckpoint(item = null) {
    const snapshot = Runner.checkpoint(state.runId, state.workbookFile?.name || "", state.queue, { source_sha256: state.sourceSha256, checkpoint_version: state.checkpointVersion, active_job_id: item?.job?.id || "" });
    await chrome.storage.local.set({ "dag.active_checkpoint.v1": snapshot }); return snapshot;
  }
  async function downloadResult(reason) {
    state.checkpointVersion += 1; const base = state.workbookFile.name.replace(/\.xlsx$/i, ""); const filename = `${base}__results__v${String(state.checkpointVersion).padStart(2, "0")}.xlsx`; downloadBlob(Xlsx.blob(state.workbook), filename); addAudit("RESULT_CHECKPOINT", null, { reason, filename, checkpoint_version: state.checkpointVersion }); await saveCheckpoint(); return filename;
  }
  function updateWorkbook(item) {
    Xlsx.updateJob(state.workbook, item.job._source || item.job, { status: item.phase, attempt_id: item.attempt_id || "", attempt_phase: item.phase, result_file: item.result_file || "", result_download_id: item.result_download_id || "", output_saved_at: item.output_saved_at || "", failure_type: item.failure_type || "", last_error: item.last_error || "", completed_at: item.completed_at || "", run_id: state.runId });
  }
  async function loadWorkbook(file) {
    state.workbookFile = file; state.workbook = await Xlsx.open(file); state.sourceSha256 = await sha256(file); state.prepared = null; state.queue = []; state.runId = `dag-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${Provider.shortHash(file.name)}`; state.audit = []; state.checkpointVersion = 0;
    log(`Workbook loaded: ${file.name}; sha256=${state.sourceSha256.slice(0, 12)}…`); badge(el.planBadge, "LOADED", "warn"); el.planSummary.textContent = `${file.name}\n${state.workbook.jobs.length} job row(s)\nSource SHA-256: ${state.sourceSha256}`; setControls();
  }
  async function loadReferences(files) { state.references = await Promise.all(Array.from(files).map(async (file) => ({ file, name: file.name, fileName: file.name, alias: file.name, type: file.type, size: file.size, dataUrl: await fileToDataUrl(file) }))); renderReferences(el.referenceGallery, state.references); log(`${state.references.length} reference image(s) selected.`); }
  async function checkPlan() {
    if (!state.workbook) throw new Error("Chọn workbook trước."); const found = await chromeMessage({ type: "DAG_RESOLVE_TARGET" }); if (!found?.ok) throw new Error(found?.error || "Gemini receiver unavailable.");
    state.target = found; const prepared = Runner.prepare({ config: state.workbook.config, jobs: state.workbook.jobs.map((job) => ({ ...job, _source: job })) }, state.references); state.prepared = prepared; state.queue = prepared.queue;
    const stored = await chrome.storage.local.get("dag.active_checkpoint.v1"); const checkpoint = stored["dag.active_checkpoint.v1"];
    if (checkpoint?.source_file === state.workbookFile.name && checkpoint?.source_sha256 === state.sourceSha256) {
      state.runId = checkpoint.run_id; state.checkpointVersion = Number(checkpoint.checkpoint_version || 0); state.queue = Runner.restore(state.queue, checkpoint);
      const auditStored = await chrome.storage.local.get(`dag.audit.${state.runId}`); state.audit = Array.isArray(auditStored[`dag.audit.${state.runId}`]) ? auditStored[`dag.audit.${state.runId}`] : [];
      for (const item of state.queue) updateWorkbook(item);
      log(`Restored checkpoint ${state.runId}; submitted ambiguity remains non-runnable.`);
    }
    badge(el.receiverBadge, found.snapshot?.surface === "IMAGES" ? "Gemini Images READY" : `Gemini ${found.snapshot?.surface}`, "ok"); badge(el.planBadge, "READY", "ok");
    el.planSummary.textContent = [`Run: ${state.runId}`,`Jobs: ${state.queue.length}`,`Timeout: ${prepared.settings.timeout_sec}s`,`References/job max: ${prepared.settings.max_input_images}`,`Output: Downloads/${prepared.settings.output_folder}`,`Target: ${found.tab?.url || "unknown"}`].join("\n");
    addAudit("PLAN_VALIDATED", null, { job_count: state.queue.length, target_url: found.tab?.url || "", source_sha256: state.sourceSha256 }); renderQueue(); await saveCheckpoint();
  }
  function failureCode(error) { const text = String(error || ""); if (/COMPOSER|TARGET|RECEIVER|GEMINI_NOT_READY/.test(text)) return "COMPOSER_NOT_READY"; if (/ATTACHMENT|UPLOAD|FILE_INPUT/.test(text)) return "ATTACHMENT_NOT_READY"; if (/SEND/.test(text)) return "SEND_NOT_READY"; return text.split(":")[0] || "UNKNOWN"; }
  async function advance(item, next, values = {}) {
    const response = await chromeMessage({ type: "DAG_ROUTE_ADVANCE", run_id: state.runId, job_id: item.job.id, attempt_id: item.attempt_id, next_phase: next, values });
    if (!response?.ok) throw new Error(response?.error || `Cannot advance to ${next}.`); item.phase = response.attempt.phase; return response.attempt;
  }
  function imageExtension(url) { const match = String(url || "").match(/\.([a-z0-9]{3,4})(?:[?#]|$)/i); return match && /^(png|jpe?g|webp|gif)$/i.test(match[1]) ? match[1].toLowerCase().replace("jpeg", "jpg") : "png"; }
  async function executeItem(item) {
    renderCurrent(item); item.phase = "PRE_SUBMIT"; item.attempt_id = Runner.nextAttemptId(state.runId, item.job.id, ++state.attemptSerial); addAudit("ATTEMPT_PREPARED", item); updateWorkbook(item); await saveCheckpoint(item); renderQueue();
    const response = await chromeMessage({ type: "DAG_ROUTE_RUN", run_id: state.runId, job_id: item.job.id, attempt_id: item.attempt_id, prompt: item.job.prompt, references: item.references.map((reference) => ({ fileName: reference.fileName, alias: reference.alias, dataUrl: reference.dataUrl })), timeout_ms: state.prepared.settings.timeout_sec * 1000 });
    if (!response?.ok) {
      item.phase = response?.attempt?.phase || "FAILED_PRE_SUBMIT"; item.failure_type = response?.attempt?.failure_type || failureCode(response?.error); item.last_error = response?.error || "Unknown Gemini failure"; addAudit(item.phase === "OWNER_REVIEW" ? "SUBMITTED_AMBIGUITY" : "ATTEMPT_FAILED", item, { target_url: response?.target?.url || "" }); updateWorkbook(item); await saveCheckpoint(item); renderQueue(); return false;
    }
    item.phase = "OUTPUT_DETECTED"; addAudit("OUTPUT_DETECTED", item, { source_id: response.output?.source_id || "", target_url: response.target?.url || "" }); await saveCheckpoint(item); renderCurrent(item);
    const extension = imageExtension(response.output.url); const requested = `${state.prepared.settings.output_folder}/${safe(item.job.id)}.${extension}`; const downloaded = await chromeMessage({ type: "DAG_DOWNLOAD_IMAGE", url: response.output.url, filename: requested }); if (!downloaded?.ok) throw new Error(downloaded?.error || "Image download failed.");
    item.result_file = downloaded.download.filename; item.result_download_id = String(downloaded.download.id); item.output_saved_at = now(); await advance(item, "OUTPUT_SAVED", { result_file: item.result_file, result_download_id: item.result_download_id, output_saved_at: item.output_saved_at }); addAudit("OUTPUT_SAVED", item); updateWorkbook(item); await saveCheckpoint(item); await downloadResult(`output-saved:${item.job.id}`); renderCurrent(item);
    const ready = await chromeMessage({ type: "DAG_ROUTE_READY", timeout_ms: 45000 }); if (!ready?.ok) { item.phase = "INTERRUPTED"; item.failure_type = "CHAT_READY_TIMEOUT"; item.last_error = ready?.error || "Gemini did not become ready."; addAudit("READINESS_FAILED_AFTER_SAVE", item); updateWorkbook(item); await saveCheckpoint(item); return false; }
    await advance(item, "CHAT_READY"); await advance(item, "SUCCESS", { completed_at: now() }); item.phase = "SUCCESS"; item.completed_at = now(); addAudit("JOB_SUCCESS", item); updateWorkbook(item); await saveCheckpoint(item); renderCurrent(item); renderQueue(); return true;
  }
  async function runPending() {
    if (state.running || !state.prepared) return; state.running = true; state.stopped = false; setControls(); addAudit("RUN_STARTED", null, { job_count: state.queue.length });
    try {
      for (const item of Runner.select(state.queue, "pending")) {
        if (state.stopped) break; const ok = await executeItem(item);
        if (!ok && (item.phase === "OWNER_REVIEW" || item.phase === "INTERRUPTED" || !state.prepared.settings.continue_on_error)) break;
        if (!state.stopped && item !== Runner.select(state.queue, "pending").at(-1)) { const delay = state.prepared.settings.delay_min_sec + Math.floor(Math.random() * (state.prepared.settings.delay_max_sec - state.prepared.settings.delay_min_sec + 1)); await new Promise((resolve) => setTimeout(resolve, delay * 1000)); }
      }
      addAudit(state.stopped ? "RUN_STOPPED" : "RUN_FINISHED", null); await downloadResult(state.stopped ? "operator-stop" : "run-finished");
    } catch (error) { addAudit("RUN_INTERRUPTED", null, { error: error.message }); log(error.message, "error"); await saveCheckpoint(); }
    finally { state.running = false; renderQueue(); setControls(); }
  }
  async function stop() { state.stopped = true; await chromeMessage({ type: "DAG_ROUTE_ABORT" }).catch(() => {}); addAudit("STOP_REQUESTED", null); setControls(); }
  function downloadAudit() { const text = `${state.audit.map((row) => JSON.stringify(row)).join("\n")}\n`; downloadBlob(new Blob([text], { type: "application/x-ndjson" }), `${state.runId}.audit.jsonl`); }

  el.workbookInput.addEventListener("change", () => loadWorkbook(el.workbookInput.files[0]).catch((error) => log(error.message, "error")));
  el.referencesInput.addEventListener("change", () => loadReferences(el.referencesInput.files).catch((error) => log(error.message, "error")));
  el.checkBtn.addEventListener("click", () => checkPlan().catch((error) => { badge(el.planBadge, "BLOCKED", "warn"); log(error.message, "error"); state.prepared = null; setControls(); }));
  el.runBtn.addEventListener("click", runPending); el.stopBtn.addEventListener("click", stop); el.downloadAuditBtn.addEventListener("click", downloadAudit);
  renderQueue(); renderCurrent(null); log("Duc Auto Gemini initialized. No prompt has been submitted.");
})();
