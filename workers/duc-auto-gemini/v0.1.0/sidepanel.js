(() => {
  "use strict";

  const Provider = globalThis.DagProviderCore;
  const Runtime = globalThis.DagRuntimeCore;
  const Runner = globalThis.DagRunCore;
  const Xlsx = globalThis.DagXlsx;
  const CHECKPOINT_KEY = "dag.active_checkpoint.v1";
  const AUDIT_KEY = "dag.audit_events.v1";
  const PIPELINE = ["PRE_SUBMIT", "SUBMITTED", "OUTPUT_DETECTED", "OUTPUT_SAVED", "CHAT_READY", "SUCCESS"];
  const ids = Object.fromEntries([
    "workbookInput", "referencesInput", "referenceGallery", "checkBtn", "runBtn", "runAllBtn", "stopBtn",
    "receiverBadge", "planBadge", "planSummary", "currentGrid", "currentPrompt", "currentReferenceGallery",
    "attemptBadge", "pipeline", "queueList", "queueCount", "downloadAuditBtn", "log"
  ].map((id) => [id, document.getElementById(id)]));
  const state = {
    workbook: null, references: [], plan: null, audit: [], runId: "", sourceSha256: "", attemptSerial: 0,
    selectedJobId: "", currentItem: null, running: false, stopping: false
  };

  function message(payload) {
    return chrome.runtime.sendMessage(payload).then((response) => response || { ok: false, error: "EMPTY_EXTENSION_RESPONSE" });
  }
  function badge(element, text, tone = "muted") { element.textContent = text; element.className = `badge ${tone}`; }
  function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
  function randomDelay(settings) {
    const min = Number(settings.delay_min_sec || 0); const max = Number(settings.delay_max_sec || min);
    return Math.round((min + Math.random() * (max - min)) * 1000);
  }
  function terminal(phase) { return Provider.TERMINAL.has(phase); }
  function runnable(item) { return item && (item.phase === "PENDING" || item.phase === "FAILED_PRE_SUBMIT"); }
  function safeName(value) { return String(value || "job").replace(/[<>:"/\\|?*]+/g, "_").trim() || "job"; }
  function inferExtension(url) {
    const match = String(url || "").match(/^data:image\/([a-z0-9.+-]+);|\.([a-z0-9]{3,5})(?:[?#]|$)/i);
    const value = String(match?.[1] || match?.[2] || "png").toLowerCase();
    return value === "jpeg" ? "jpg" : (/^(png|jpg|webp|gif)$/.test(value) ? value : "png");
  }
  function fileDataUrl(file) {
    return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); });
  }
  async function sha256(file) {
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function referenceFigure(reference) {
    const figure = document.createElement("figure"); const image = document.createElement("img"); const caption = document.createElement("figcaption");
    image.src = reference.dataUrl || URL.createObjectURL(reference); image.alt = reference.alias || reference.name || "reference"; caption.textContent = image.alt;
    figure.append(image, caption); return figure;
  }
  function renderReferences() {
    ids.referenceGallery.replaceChildren(...state.references.map(referenceFigure));
  }
  function renderCurrent(item = state.currentItem) {
    state.currentItem = item || null; ids.currentPrompt.textContent = item?.job?.prompt || "Chưa chạy";
    const references = item?.references || []; ids.currentGrid.classList.toggle("no-refs", !references.length);
    ids.currentReferenceGallery.replaceChildren(...references.map(referenceFigure));
    badge(ids.attemptBadge, item?.attempt_id || "—", item && terminal(item.phase) ? (item.phase === "SUCCESS" ? "ok" : "warn") : "muted");
    ids.pipeline.replaceChildren(...PIPELINE.map((phase) => { const span = document.createElement("span"); span.textContent = phase; if (item && (phase === item.phase || PIPELINE.indexOf(phase) <= PIPELINE.indexOf(item.phase))) span.className = "active"; return span; }));
  }
  function renderQueue() {
    const queue = state.plan?.queue || [];
    if (!queue.some((item) => item.job.id === state.selectedJobId)) state.selectedJobId = queue.find(runnable)?.job.id || queue[0]?.job.id || "";
    ids.queueList.replaceChildren(...queue.map((item) => {
      const row = document.createElement("li"); const label = document.createElement("label"); const radio = document.createElement("input"); const title = document.createElement("span"); const detail = document.createElement("small");
      radio.type = "radio"; radio.name = "selectedJob"; radio.value = item.job.id; radio.checked = state.selectedJobId === item.job.id; radio.disabled = state.running;
      radio.addEventListener("change", () => { state.selectedJobId = item.job.id; renderCurrent(item); setControls(); });
      title.textContent = `${item.job.id} — ${item.phase}`; detail.textContent = item.last_error || `${item.references.length} reference(s)`;
      label.append(radio, title); row.append(label, detail); return row;
    }));
    badge(ids.queueCount, String(queue.length));
  }
  function setControls() {
    const queue = state.plan?.queue || []; const selected = queue.find((item) => item.job.id === state.selectedJobId);
    ids.checkBtn.disabled = state.running; ids.workbookInput.disabled = state.running; ids.referencesInput.disabled = state.running;
    ids.runBtn.disabled = state.running || !runnable(selected); ids.runAllBtn.disabled = state.running || !queue.some(runnable);
    ids.stopBtn.disabled = !state.running || !state.currentItem?.attempt_id; ids.downloadAuditBtn.disabled = !state.audit.length;
  }
  function renderPlan() {
    const queue = state.plan?.queue || []; const counts = queue.reduce((all, item) => ({ ...all, [item.phase]: (all[item.phase] || 0) + 1 }), {});
    ids.planSummary.textContent = state.plan ? `${state.workbook.fileName}\n${queue.length} jobs · ${Object.entries(counts).map(([key, value]) => `${key} ${value}`).join(" · ")}\nSHA-256 ${state.sourceSha256}` : "Chọn workbook để bắt đầu.";
    badge(ids.planBadge, state.plan ? "READY" : "EMPTY", state.plan ? "ok" : "muted"); renderQueue(); setControls();
  }
  async function addAudit(type, item, values = {}) {
    const event = Runner.auditEvent(type, item, { run_id: state.runId, ...values }); state.audit.push(event);
    ids.log.textContent = state.audit.map((row) => JSON.stringify(row)).join("\n"); ids.log.scrollTop = ids.log.scrollHeight; ids.downloadAuditBtn.disabled = false;
    await chrome.storage.local.set({ [AUDIT_KEY]: state.audit.slice(-1000) }); return event;
  }
  async function saveCheckpoint() {
    if (!state.plan) return;
    const checkpoint = Runner.checkpoint(state.runId, state.workbook.fileName, state.plan.queue, { source_sha256: state.sourceSha256, attempt_serial: state.attemptSerial, selected_job_id: state.selectedJobId });
    await chrome.storage.local.set({ [CHECKPOINT_KEY]: checkpoint });
  }
  function updateWorkbook(item) {
    Xlsx.updateJob(state.workbook, item.job, { phase: item.phase, retry_count: item.retry_count, attempt_id: item.attempt_id || "", result_file: item.result_file || "", failure_type: item.failure_type || "", last_error: item.last_error || "" });
  }
  async function persistItem(item, event, values = {}) { updateWorkbook(item); await saveCheckpoint(); await addAudit(event, item, values); renderPlan(); renderCurrent(item); }
  function applyAttempt(item, attempt, fallbackPhase) {
    if (attempt && !Runtime.matchesAttempt(attempt, item)) throw new Error("ATTEMPT_ID_MISMATCH");
    item.phase = attempt?.phase || fallbackPhase || item.phase; item.failure_type = attempt?.failure_type || item.failure_type || ""; item.last_error = attempt?.last_error || item.last_error || ""; item.result_file = attempt?.result_file || item.result_file || "";
  }
  async function checkPlan() {
    const file = ids.workbookInput.files?.[0]; if (!file) throw new Error("Select one .xlsx workbook.");
    state.workbook = await Xlsx.open(file); state.sourceSha256 = await sha256(file); state.references = await Promise.all(Array.from(ids.referencesInput.files || []).map(async (input) => ({ name: input.name, alias: input.webkitRelativePath || input.name, dataUrl: await fileDataUrl(input) })));
    renderReferences(); state.plan = Runner.prepare(state.workbook, state.references);
    const stored = await chrome.storage.local.get([CHECKPOINT_KEY, AUDIT_KEY]); const checkpoint = stored[CHECKPOINT_KEY];
    if (checkpoint?.source_sha256 === state.sourceSha256 && checkpoint?.source_file === state.workbook.fileName) {
      state.plan = { ...state.plan, queue: Runner.restore(state.plan.queue, checkpoint) }; state.runId = checkpoint.run_id; state.selectedJobId = checkpoint.selected_job_id || "";
    } else {
      state.runId = `${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${Provider.shortHash(`${state.sourceSha256}|${Date.now()}`)}`; state.selectedJobId = "";
    }
    const durable = await message({ type: "DAG_GET_ATTEMPTS", run_id: state.runId });
    if (!durable.ok) throw new Error(durable.error || "DURABLE_ATTEMPT_READ_FAILED");
    const newest = new Map(); for (const attempt of durable.attempts || []) { const prior = newest.get(attempt.job_id); if (!prior || String(attempt.persisted_at || attempt.updated_at || "") > String(prior.persisted_at || prior.updated_at || "")) newest.set(attempt.job_id, attempt); }
    state.plan.queue = state.plan.queue.map((item) => Runtime.restoreSubmitted(item, newest.get(item.job.id)));
    state.attemptSerial = Runtime.deriveAttemptSerial(checkpoint || {}, state.plan.queue); state.audit = Array.isArray(stored[AUDIT_KEY]) ? stored[AUDIT_KEY].filter((row) => row.run_id === state.runId) : [];
    for (const item of state.plan.queue) updateWorkbook(item); await saveCheckpoint(); renderPlan(); renderCurrent(state.plan.queue.find((item) => item.job.id === state.selectedJobId));
    await addAudit("PLAN_CHECKED", null, { source_sha256: state.sourceSha256, job_count: state.plan.queue.length });
    const resolved = await message({ type: "DAG_RESOLVE_TARGET" }); if (!resolved.ok) { badge(ids.receiverBadge, "Gemini Images chưa sẵn sàng", "warn"); throw new Error(resolved.error || "TARGET_MISSING"); }
    badge(ids.receiverBadge, "Gemini Images sẵn sàng", "ok"); renderPlan();
  }
  async function advance(item, nextPhase, values = {}) {
    const response = await message({ type: "DAG_ROUTE_ADVANCE", run_id: state.runId, job_id: item.job.id, attempt_id: item.attempt_id, next_phase: nextPhase, values });
    const outcome = Runtime.responseOutcome(response, item); if (!outcome.ok) throw new Error(outcome.failure_type || outcome.last_error); applyAttempt(item, outcome.attempt, nextPhase); await persistItem(item, `ATTEMPT_${nextPhase}`); return response;
  }
  async function executeAttempt(item) {
    state.attemptSerial += 1; item.attempt_id = Runner.nextAttemptId(state.runId, item.job.id, state.attemptSerial); item.phase = "PRE_SUBMIT"; item.failure_type = ""; item.last_error = ""; state.currentItem = item;
    await persistItem(item, "ATTEMPT_PREPARED", { retry_count: item.retry_count });
    const response = await message({ type: "DAG_ROUTE_RUN", run_id: state.runId, job_id: item.job.id, attempt_id: item.attempt_id, prompt: item.job.prompt, references: item.references.map(({ name, alias, dataUrl }) => ({ fileName: name, name, alias, dataUrl })), timeout_ms: state.plan.settings.timeout_sec * 1000 });
    const outcome = Runtime.responseOutcome(response, item);
    if (!outcome.ok) { applyAttempt(item, outcome.attempt, outcome.phase); item.failure_type = outcome.failure_type; item.last_error = outcome.last_error; await persistItem(item, "ATTEMPT_FAILED", { failure_type: item.failure_type }); return false; }
    applyAttempt(item, outcome.attempt, "OUTPUT_DETECTED"); await persistItem(item, "OUTPUT_DETECTED", { source_id: response.output?.source_id || "" });
    const extension = inferExtension(response.output?.url); const relativeName = `${state.plan.settings.output_folder}/${safeName(item.job.id)}.${extension}`;
    const downloaded = await message({ type: "DAG_DOWNLOAD_IMAGE", url: response.output?.url, filename: relativeName }); if (!downloaded.ok) throw new Error(downloaded.error || "OUTPUT_DOWNLOAD_FAILED");
    item.result_file = downloaded.download?.filename || relativeName; await advance(item, "OUTPUT_SAVED", { result_file: item.result_file });
    const ready = await message({ type: "DAG_ROUTE_READY", run_id: state.runId, job_id: item.job.id, attempt_id: item.attempt_id, timeout_ms: 30000 });
    const readyOutcome = Runtime.responseOutcome(ready, item); if (!readyOutcome.ok) throw new Error(readyOutcome.failure_type || readyOutcome.last_error || "GEMINI_NOT_READY");
    await advance(item, "CHAT_READY"); await advance(item, "SUCCESS"); return true;
  }
  async function executeItem(item) {
    while (!state.stopping) {
      const success = await executeAttempt(item); if (success) return true;
      const retry = Provider.retryDecision({ phase: item.phase }, item.failure_type, item.retry_count, state.plan.settings.max_retries);
      if (!retry.allowed) return false; item.retry_count += 1; await addAudit("RETRY_SCHEDULED", item, { retry_count: item.retry_count, retry_reason: retry.reason }); await saveCheckpoint();
    }
    return false;
  }
  async function failPostSubmit(item, error) {
    const values = { failure_type: error.message, last_error: error.message };
    if (item?.attempt_id && Provider.POST_SUBMIT.has(item.phase) && !terminal(item.phase)) {
      try { await advance(item, "OWNER_REVIEW", values); return; } catch (_) { /* local checkpoint remains fail-closed below */ }
    }
    item.phase = Provider.POST_SUBMIT.has(item.phase) ? "OWNER_REVIEW" : "FAILED_PRE_SUBMIT"; item.failure_type = error.message; item.last_error = error.message;
    await persistItem(item, "JOB_EXCEPTION");
  }
  async function runQueue(mode) {
    if (state.running || !state.plan) return; const selected = state.plan.queue.find((item) => item.job.id === state.selectedJobId);
    const queue = mode === "selected" ? (runnable(selected) ? [selected] : []) : Runner.select(state.plan.queue, "pending"); if (!queue.length) return;
    state.running = true; state.stopping = false; setControls(); await addAudit("RUN_STARTED", null, { mode, selected_job_id: state.selectedJobId });
    try {
      for (let index = 0; index < queue.length && !state.stopping; index += 1) {
        const item = queue[index]; let success = false;
        try { success = await executeItem(item); }
        catch (error) { if (!terminal(item.phase)) await failPostSubmit(item, error); }
        if (!success && !state.plan.settings.continue_on_error) break;
        if (index < queue.length - 1 && !state.stopping) await sleep(randomDelay(state.plan.settings));
      }
    } finally {
      state.running = false; await saveCheckpoint(); await addAudit(state.stopping ? "RUN_STOPPED" : "RUN_FINISHED", state.currentItem); renderPlan(); setControls();
      downloadBlob(Xlsx.blob(state.workbook), state.workbook.fileName.replace(/\.xlsx$/i, "__results__v01.xlsx"));
    }
  }
  async function stop() {
    state.stopping = true; const item = state.currentItem; if (item?.attempt_id && !terminal(item.phase)) {
      const response = await message({ type: "DAG_ROUTE_ABORT", run_id: state.runId, job_id: item.job.id, attempt_id: item.attempt_id });
      const outcome = Runtime.responseOutcome(response, item); if (!response.ok || (response.attempt && !Runtime.matchesAttempt(response.attempt, item))) await addAudit("STOP_REJECTED", item, { error: outcome.last_error || response.error }); else await addAudit("STOP_REQUESTED", item);
    }
    setControls();
  }

  ids.referencesInput.addEventListener("change", async () => { state.references = await Promise.all(Array.from(ids.referencesInput.files || []).map(async (file) => ({ name: file.name, alias: file.webkitRelativePath || file.name, dataUrl: await fileDataUrl(file) }))); renderReferences(); });
  ids.checkBtn.addEventListener("click", () => checkPlan().catch(async (error) => { badge(ids.planBadge, "CHECK FAILED", "warn"); ids.planSummary.textContent = error.message; await addAudit("PLAN_CHECK_FAILED", null, { error: error.message }).catch(() => {}); setControls(); }));
  ids.runBtn.addEventListener("click", () => runQueue("selected")); ids.runAllBtn.addEventListener("click", () => runQueue("pending")); ids.stopBtn.addEventListener("click", stop);
  ids.downloadAuditBtn.addEventListener("click", () => downloadBlob(new Blob([state.audit.map((row) => JSON.stringify(row)).join("\n") + "\n"], { type: "application/x-ndjson" }), `${state.runId || "duc-auto-gemini"}.audit.jsonl`));
  renderCurrent(); renderPlan();
})();
