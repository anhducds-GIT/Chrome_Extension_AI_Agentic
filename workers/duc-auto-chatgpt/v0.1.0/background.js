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

// Intentionally in-memory: V0 has no queue and does not recover jobs after a worker restart.
const jobs = new Map();
let activeJobId = null;

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  handleExternalMessage(message, sender)
    .then(sendResponse)
    .catch((error) => sendResponse(failure("INTERNAL_ERROR", error?.message || String(error))));
  return true;
});

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
  const matchedTabs = await queryChatGptTabs();
  try {
    const tab = selectChatGptTab(matchedTabs);
    const result = await sendToChatGpt(tab.id, { type: "DAC_PING" });
    return {
      ok: true,
      operation: "ping",
      tab_id: tab.id,
      tab_url: tab.url,
      matched_tab_count: matchedTabs.length,
      matched_tabs: summariseTabs(matchedTabs),
      result
    };
  } catch (error) {
    return failure("CHATGPT_UNAVAILABLE", error?.message || String(error), {
      matched_tab_count: matchedTabs.length,
      matched_tabs: summariseTabs(matchedTabs)
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
  const job = { jobId, taskType, prompt, timeoutMs, status: "accepted", createdAt: now, updatedAt: now, result: null, error: null };
  jobs.set(jobId, job);
  activeJobId = jobId;

  // Let the external caller observe accepted before the private DAC_RUN_PROMPT begins.
  setTimeout(() => runJob(job), 0);
  return { ok: true, operation: "job.submit", duplicate: false, job: publicJob(job) };
}

function statusJob(message) {
  const jobId = validJobId(message.job_id);
  if (!jobId) return failure("INVALID_JOB_ID", "job_id is required and must be a short identifier.");
  const job = jobs.get(jobId);
  return job
    ? { ok: true, operation: "job.status", job: publicJob(job) }
    : failure("JOB_NOT_FOUND", "No job exists for job_id.");
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
  job.updatedAt = new Date().toISOString();
  try {
    const tab = await resolveChatGptTab();
    await sendToChatGpt(tab.id, { type: "DAC_ABORT" });
  } catch (error) {
    job.abortError = error?.message || String(error);
  }
  return { ok: true, operation: "job.abort", job: publicJob(job) };
}

async function runJob(job) {
  if (job.status === "aborted") {
    releaseActiveJob(job.jobId);
    return;
  }

  job.status = "running";
  job.updatedAt = new Date().toISOString();
  try {
    const tab = await resolveChatGptTab();
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
    job.updatedAt = new Date().toISOString();
    releaseActiveJob(job.jobId);
  }
}

async function queryChatGptTabs() {
  return chrome.tabs.query({ url: CHATGPT_URL_PATTERNS });
}

function selectChatGptTab(tabs) {
  // Tab-selection algorithm is unchanged (prefer active tab, else first match).
  const tab = tabs.find((candidate) => candidate.active) || tabs[0];
  if (!tab?.id) throw new Error("No ChatGPT tab is available. Open chatgpt.com and reload it once.");
  return tab;
}

function summariseTabs(tabs) {
  return tabs.map((tab) => ({ tab_id: tab.id, url: tab.url, active: Boolean(tab.active), window_id: tab.windowId }));
}

async function resolveChatGptTab() {
  const tabs = await queryChatGptTabs();
  return selectChatGptTab(tabs);
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
    updated_at: job.updatedAt,
    result: job.result,
    error: job.error,
    abort_error: job.abortError || null
  };
}

function releaseActiveJob(jobId) {
  if (activeJobId === jobId) activeJobId = null;
}

function failure(code, error, extra) {
  return { ok: false, code, error, ...(extra || {}) };
}
