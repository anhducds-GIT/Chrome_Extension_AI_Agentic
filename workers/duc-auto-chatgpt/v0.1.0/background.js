chrome.runtime.onInstalled.addListener(async () => {
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (error) {
    console.warn("Unable to set side panel behavior", error);
  }
});

chrome.runtime.onStartup.addListener(async () => {
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (error) {
    console.warn("Unable to set side panel behavior", error);
  }
});

const LOCALHOST_HOSTS = new Set(["localhost", "127.0.0.1"]);
const CHATGPT_URL_PATTERNS = ["https://chatgpt.com/*", "https://chat.openai.com/*"];
const MIN_TIMEOUT_MS = 15000;
const DEFAULT_TIMEOUT_MS = 180000;
const MAX_TIMEOUT_MS = 900000;
const TERMINAL_STATUSES = new Set(["done", "failed", "aborted"]);
const ACTIVE_JOB_KEEPALIVE_MS = 25000;
const DOWNLOAD_COMPLETE_TIMEOUT_MS = 120000;
const TERMINAL_JOBS_STORAGE_KEY = "dac.terminal_jobs.v1";
const MAX_TERMINAL_JOBS = 10;

// Intentionally in-memory: V0 has no queue and does not recover jobs after a worker restart.
const jobs = new Map();
let activeJobId = null;
let activeJobKeepAlive = null;

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  handleExternalMessage(message, sender)
    .then(sendResponse)
    .catch((error) => sendResponse(failure("INTERNAL_ERROR", error?.message || String(error))));
  return true;
});

// Private message used only by this extension's side panel after a generated
// image URL has been observed in the current ChatGPT tab.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "DAC_DOWNLOAD_IMAGE") return false;
  downloadGeneratedImage(message)
    .then(sendResponse)
    .catch((error) => sendResponse(failure("DOWNLOAD_FAILED", error?.message || String(error))));
  return true;
});

async function downloadGeneratedImage(message) {
  const url = typeof message.url === "string" ? message.url : "";
  if (!/^https:\/\//i.test(url) && !/^data:image\//i.test(url)) {
    return failure("INVALID_IMAGE_URL", "Generated image URL was not usable.");
  }
  const safeId = String(message.jobId || "image").replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 100) || "image";
  const extension = imageExtension(url);
  const folder = safeDownloadFolder(message.outputFolder);
  const requestedFilename = `${folder}/${safeId}.${extension}`;
  const downloadId = await chrome.downloads.download({ url, filename: requestedFilename, conflictAction: "uniquify", saveAs: false });
  const item = await waitForCompletedDownload(downloadId);
  return { ok: true, download_id: downloadId, filename: item.filename, requested_filename: requestedFilename };
}

async function waitForCompletedDownload(downloadId, timeoutMs = DOWNLOAD_COMPLETE_TIMEOUT_MS) {
  const lookup = async () => {
    const items = await chrome.downloads.search({ id: downloadId });
    return items?.[0] || null;
  };
  const current = await lookup();
  if (current?.state === "complete" && current.filename) return current;
  if (current?.state === "interrupted") throw new Error(`Generated image download failed: ${current.error || "interrupted"}.`);
  if (!chrome.downloads.onChanged?.addListener) throw new Error("Could not verify the final generated-image filename.");
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      chrome.downloads.onChanged.removeListener?.(listener);
      callback(value);
    };
    const listener = async (delta) => {
      if (delta?.id !== downloadId || (!delta.state && !delta.filename)) return;
      try {
        const item = await lookup();
        if (item?.state === "complete" && item.filename) finish(resolve, item);
        else if (item?.state === "interrupted") finish(reject, new Error(`Generated image download failed: ${item.error || "interrupted"}.`));
      } catch (error) { finish(reject, error); }
    };
    const timer = setTimeout(() => finish(reject, new Error("Timed out waiting for the final generated-image filename.")), timeoutMs);
    chrome.downloads.onChanged.addListener(listener);
    lookup().then((item) => {
      if (item?.state === "complete" && item.filename) finish(resolve, item);
      else if (item?.state === "interrupted") finish(reject, new Error(`Generated image download failed: ${item.error || "interrupted"}.`));
    }).catch((error) => finish(reject, error));
  });
}

function imageExtension(url) {
  const dataMime = /^data:image\/(avif|gif|jpe?g|png|webp)/i.exec(url)?.[1];
  if (dataMime) return dataMime.toLowerCase().replace("jpeg", "jpg");
  try {
    const parsed = new URL(url);
    const fromPath = /\.(avif|gif|jpe?g|png|webp)$/i.exec(parsed.pathname)?.[1];
    const fromQuery = parsed.searchParams.get("format") || parsed.searchParams.get("fm");
    const candidate = fromPath || (/^(avif|gif|jpe?g|png|webp)$/i.test(fromQuery || "") ? fromQuery : null);
    if (candidate) return candidate.toLowerCase().replace("jpeg", "jpg");
  } catch (_) { /* URL was already validated; retain the safe fallback. */ }
  return "png";
}

function safeDownloadFolder(value) {
  const folder = String(value || "Duc Auto ChatGPT").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (!folder || folder.split("/").some((part) => !part || part === "." || part === "..")) throw new Error("Image output folder must be a safe relative Downloads folder.");
  const safeFolder = folder.replace(/[^A-Za-z0-9._ -/]/g, "_").slice(0, 160);
  if (!safeFolder) throw new Error("Image output folder must not be empty.");
  return safeFolder;
}

async function handleExternalMessage(message, sender) {
  if (!isAllowedLocalhostOrigin(sender?.origin)) {
    return failure("UNAUTHORIZED_ORIGIN", "Only http://localhost or http://127.0.0.1 callers are allowed.");
  }
  if (!message || typeof message !== "object" || Array.isArray(message)) {
    return failure("INVALID_MESSAGE", "Message must be an object.");
  }

  switch (message.operation) {
    case "ping":
      return pingActiveChatGptTab();
    case "job.submit":
      return submitJob(message);
    case "job.status":
      return statusJob(message);
    case "job.abort":
      return abortJob(message);
    default:
      return failure("UNSUPPORTED_OPERATION", "operation must be ping, job.submit, job.status, or job.abort.");
  }
}

function isAllowedLocalhostOrigin(origin) {
  try {
    const parsed = new URL(origin);
    return parsed.protocol === "http:" && LOCALHOST_HOSTS.has(parsed.hostname.toLowerCase());
  } catch (_) {
    return false;
  }
}

async function pingActiveChatGptTab() {
  try {
    const receiver = await resolveChatGptReceiver();
    return {
      ok: true,
      operation: "ping",
      tab_id: receiver.tab.id,
      tab_url: receiver.tab.url,
      matched_tab_count: receiver.matchedTabs.length,
      matched_tabs: summariseTabs(receiver.matchedTabs),
      probe_attempts: receiver.probeAttempts,
      result: receiver.result
    };
  } catch (error) {
    return failure("CHATGPT_UNAVAILABLE", error?.message || String(error), {
      matched_tab_count: error?.matchedTabs?.length || 0,
      matched_tabs: summariseTabs(error?.matchedTabs || []),
      probe_attempts: error?.probeAttempts || []
    });
  }
}

function submitJob(message) {
  const validation = validateSubmit(message);
  if (!validation.ok) return validation;

  const { jobId, taskType, prompt, timeoutMs } = validation;
  const existing = jobs.get(jobId);
  if (existing) {
    return { ok: true, operation: "job.submit", duplicate: true, job: publicJob(existing) };
  }
  if (activeJobId) return failure("ACTIVE_JOB_EXISTS", "Only one active job is permitted; no queue is available.");

  const now = new Date().toISOString();
  const job = {
    jobId,
    taskType,
    prompt,
    timeoutMs,
    status: "accepted",
    createdAt: now,
    startedAt: null,
    completedAt: null,
    updatedAt: now,
    target: null,
    result: null,
    error: null
  };
  jobs.set(jobId, job);
  activeJobId = jobId;

  // Let the external caller observe accepted before the private DAC_RUN_PROMPT begins.
  setTimeout(() => runJob(job), 0);
  return { ok: true, operation: "job.submit", duplicate: false, job: publicJob(job) };
}

async function statusJob(message) {
  const jobId = validJobId(message.job_id);
  if (!jobId) return failure("INVALID_JOB_ID", "job_id is required and must be a short identifier.");
  const job = jobs.get(jobId);
  if (job) return { ok: true, operation: "job.status", job: publicJob(job) };

  try {
    const stored = await chrome.storage.session.get(TERMINAL_JOBS_STORAGE_KEY);
    const terminalJob = Array.isArray(stored[TERMINAL_JOBS_STORAGE_KEY])
      ? stored[TERMINAL_JOBS_STORAGE_KEY].find((record) => record?.job_id === jobId)
      : null;
    return terminalJob
      ? { ok: true, operation: "job.status", job: terminalJob }
      : failure("JOB_NOT_FOUND", "No job exists for job_id.");
  } catch (error) {
    return failure("TERMINAL_RECORD_UNAVAILABLE", error?.message || String(error));
  }
}

async function abortJob(message) {
  const jobId = validJobId(message.job_id);
  if (!jobId) return failure("INVALID_JOB_ID", "job_id is required and must be a short identifier.");
  const job = jobs.get(jobId);
  if (!job) return failure("JOB_NOT_FOUND", "No job exists for job_id.");
  if (TERMINAL_STATUSES.has(job.status)) {
    return { ok: true, operation: "job.abort", already_terminal: true, job: publicJob(job) };
  }

  job.status = "aborted";
  job.completedAt = new Date().toISOString();
  job.updatedAt = new Date().toISOString();
  try {
    const tab = await resolveChatGptTab();
    await sendToChatGpt(tab.id, { type: "DAC_ABORT" });
  } catch (error) {
    job.abortError = error?.message || String(error);
  }
  await persistTerminalJob(job);
  stopActiveJobKeepAlive(job.jobId);
  return { ok: true, operation: "job.abort", job: publicJob(job) };
}

async function runJob(job) {
  if (job.status === "aborted") {
    releaseActiveJob(job.jobId);
    return;
  }

  job.status = "running";
  job.startedAt = new Date().toISOString();
  job.updatedAt = job.startedAt;
  let stopKeepAlive = null;
  try {
    const tab = await resolveChatGptTab();
    job.target = targetFromTab(tab);
    stopKeepAlive = startActiveJobKeepAlive(job.jobId);
    const response = await sendToChatGpt(tab.id, { type: "DAC_RUN_PROMPT", prompt: job.prompt, timeoutMs: job.timeoutMs });
    if (job.status === "aborted") return;
    if (!response?.ok) throw new Error(response?.error || "DAC_RUN_PROMPT returned no successful result.");
    job.status = "done";
    job.result = response.result ?? null;
  } catch (error) {
    if (job.status !== "aborted") {
      job.status = "failed";
      job.error = error?.message || String(error);
    }
  } finally {
    job.completedAt = new Date().toISOString();
    job.updatedAt = job.completedAt;
    if (TERMINAL_STATUSES.has(job.status)) await persistTerminalJob(job);
    stopKeepAlive?.();
    releaseActiveJob(job.jobId);
  }
}

async function queryChatGptTabs() {
  return chrome.tabs.query({ url: CHATGPT_URL_PATTERNS });
}

function summariseTabs(tabs) {
  return tabs.map((tab) => ({ tab_id: tab.id, url: tab.url, active: Boolean(tab.active), window_id: tab.windowId }));
}

async function resolveChatGptTab() {
  const receiver = await resolveChatGptReceiver();
  return receiver.tab;
}

async function resolveChatGptReceiver() {
  const matchedTabs = await queryChatGptTabs();
  const probeAttempts = [];
  const candidates = [...matchedTabs].sort((left, right) => Number(Boolean(right.active)) - Number(Boolean(left.active)));

  for (const tab of candidates) {
    try {
      const result = await sendToChatGpt(tab.id, { type: "DAC_PING" });
      if (result?.ok) return { tab, result, matchedTabs, probeAttempts };
      probeAttempts.push(tabProbeAttempt(tab, result?.error || "DAC_PING returned a non-success response."));
    } catch (error) {
      probeAttempts.push(tabProbeAttempt(tab, error?.message || String(error)));
    }
  }

  const unavailable = new Error(
    matchedTabs.length
      ? "No matching ChatGPT tab has a reachable DAC receiver."
      : "No ChatGPT tab is available. Open chatgpt.com and reload it once."
  );
  unavailable.matchedTabs = matchedTabs;
  unavailable.probeAttempts = probeAttempts;
  throw unavailable;
}

function tabProbeAttempt(tab, error) {
  return { tab_id: tab.id, tab_url: tab.url, active: Boolean(tab.active), window_id: tab.windowId, error };
}

async function sendToChatGpt(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    const detail = error?.message || String(error);
    throw new Error(`Cannot reach the ChatGPT page. Reload the ChatGPT tab once, then retry. (${detail})`);
  }
}

function validateSubmit(message) {
  const jobId = validJobId(message.job_id);
  if (!jobId) return failure("INVALID_JOB_ID", "job_id is required and must be a short identifier.");
  if (message.task_type !== "text_prompt") return failure("INVALID_TASK_TYPE", "V0 supports task_type=text_prompt only.");
  const prompt = typeof message.prompt === "string" ? message.prompt.trim() : "";
  if (!prompt) return failure("INVALID_PROMPT", "prompt must be a non-empty string.");
  return { ok: true, jobId, taskType: "text_prompt", prompt, timeoutMs: normaliseTimeout(message.timeout_ms) };
}

function validJobId(value) {
  const jobId = typeof value === "string" ? value.trim() : "";
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(jobId) ? jobId : null;
}

function normaliseTimeout(value) {
  const requested = Number(value);
  const timeoutMs = Number.isFinite(requested) ? requested : DEFAULT_TIMEOUT_MS;
  return Math.max(MIN_TIMEOUT_MS, Math.min(timeoutMs, MAX_TIMEOUT_MS));
}

function publicJob(job) {
  return {
    job_id: job.jobId,
    task_type: job.taskType,
    status: job.status,
    timeout_ms: job.timeoutMs,
    created_at: job.createdAt,
    started_at: job.startedAt,
    completed_at: job.completedAt,
    updated_at: job.updatedAt,
    target: job.target,
    result_type: job.result?.type || null,
    result: job.result,
    error: job.error,
    abort_error: job.abortError || null,
    retention_error: job.retentionError || null
  };
}

function terminalJobSnapshot(job) {
  return publicJob(job);
}

async function persistTerminalJob(job) {
  const snapshot = terminalJobSnapshot(job);
  try {
    const stored = await chrome.storage.session.get(TERMINAL_JOBS_STORAGE_KEY);
    const existing = Array.isArray(stored[TERMINAL_JOBS_STORAGE_KEY]) ? stored[TERMINAL_JOBS_STORAGE_KEY] : [];
    const retained = [snapshot, ...existing.filter((record) => record?.job_id !== snapshot.job_id)]
      .slice(0, MAX_TERMINAL_JOBS);
    await chrome.storage.session.set({ [TERMINAL_JOBS_STORAGE_KEY]: retained });
    job.retentionError = null;
  } catch (error) {
    job.retentionError = error?.message || String(error);
  }
}

function targetFromTab(tab) {
  return {
    tab_id: tab.id,
    tab_url: tab.url || null,
    window_id: tab.windowId ?? null,
    conversation_url: tab.url || null
  };
}

function startActiveJobKeepAlive(jobId) {
  stopActiveJobKeepAlive();
  const touch = () => {
    try {
      Promise.resolve(chrome.runtime.getPlatformInfo()).catch((error) => {
        console.warn("Active job keepalive failed", error);
      });
    } catch (error) {
      console.warn("Active job keepalive failed", error);
    }
  };

  touch();
  const intervalId = setInterval(touch, ACTIVE_JOB_KEEPALIVE_MS);
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearInterval(intervalId);
    if (activeJobKeepAlive?.jobId === jobId) activeJobKeepAlive = null;
  };
  activeJobKeepAlive = { jobId, stop };
  return stop;
}

function stopActiveJobKeepAlive(jobId) {
  if (!activeJobKeepAlive || (jobId && activeJobKeepAlive.jobId !== jobId)) return;
  activeJobKeepAlive.stop();
}

function releaseActiveJob(jobId) {
  if (activeJobId === jobId) activeJobId = null;
}

function failure(code, error, extra) {
  return { ok: false, code, error, ...(extra || {}) };
}
