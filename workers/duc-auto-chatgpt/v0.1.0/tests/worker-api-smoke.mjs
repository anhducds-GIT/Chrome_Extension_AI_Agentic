import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const sent = [];
const downloads = [];
const downloadItems = new Map();
let externalListener;
let privateListener;
let pendingPromptResolve;
let keepAliveCalls = 0;
let nextIntervalId = 1;
const activeIntervals = new Map();
const terminalJobsStorageKey = "dac.terminal_jobs.v1";
const sessionData = new Map();
let sessionWriteError = null;
const sessionStorage = {
  get: async (key) => ({ [key]: sessionData.has(key) ? structuredClone(sessionData.get(key)) : undefined }),
  set: async (items) => {
    if (sessionWriteError) throw sessionWriteError;
    for (const [key, value] of Object.entries(items)) sessionData.set(key, structuredClone(value));
  }
};
const setIntervalMock = (callback, delay) => {
  const intervalId = nextIntervalId++;
  activeIntervals.set(intervalId, { callback, delay });
  return intervalId;
};
const clearIntervalMock = (intervalId) => activeIntervals.delete(intervalId);
const chrome = {
  sidePanel: { setPanelBehavior: async () => {} },
  runtime: {
    onInstalled: { addListener: () => {} },
    onStartup: { addListener: () => {} },
    onMessageExternal: { addListener: (listener) => { externalListener = listener; } },
    onMessage: { addListener: (listener) => { privateListener = listener; } },
    getPlatformInfo: async () => { keepAliveCalls += 1; return {}; }
  },
  storage: { session: sessionStorage },
  downloads: {
    download: async (options) => {
      downloads.push(options);
      const id = 77 + downloads.length - 1;
      const finalName = options.filename.includes("image_001.png") ? "C:\\Users\\Duc\\Downloads\\Duc Auto ChatGPT\\image_001 (1).png" : `C:\\Users\\Duc\\Downloads\\${options.filename}`;
      downloadItems.set(id, { id, state: "complete", filename: finalName });
      return id;
    },
    search: async ({ id }) => downloadItems.has(id) ? [downloadItems.get(id)] : [],
    onChanged: { addListener: () => {}, removeListener: () => {} }
  },
  tabs: {
    query: async () => [{ id: 42, active: true, url: "https://chatgpt.com/c/test" }],
    sendMessage: async (_tabId, message) => {
      sent.push(message);
      if (message.type === "DAC_PING") return { ok: true, composerFound: true };
      if (message.type === "DAC_ABORT") return { ok: true };
      if (message.type === "DAC_RUN_PROMPT") return new Promise((resolve) => { pendingPromptResolve = resolve; });
      throw new Error("Unexpected private message");
    }
  }
};

vm.runInNewContext(fs.readFileSync(new URL("../background.js", import.meta.url), "utf8"), {
  chrome, URL, Set, Map, Date, setTimeout, setInterval: setIntervalMock, clearInterval: clearIntervalMock, console
});
assert.ok(externalListener, "external listener registered");
assert.ok(privateListener, "private listener registered");

function call(message, origin = "http://localhost:8123") {
  return new Promise((resolve) => {
    assert.equal(externalListener(message, { origin }, resolve), true);
  });
}
function privateCall(message) {
  return new Promise((resolve) => {
    assert.equal(privateListener(message, {}, resolve), true);
  });
}
const wait = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));

assert.equal((await call({ operation: "ping" })).result.composerFound, true);
const imageDownload = await privateCall({ type: "DAC_DOWNLOAD_IMAGE", jobId: "image:001", url: "https://chatgpt.com/generated.png" });
assert.equal(imageDownload.ok, true);
assert.equal(imageDownload.download_id, 77);
assert.equal(imageDownload.requested_filename, "Duc Auto ChatGPT/image_001.png");
assert.equal(imageDownload.filename, "C:\\Users\\Duc\\Downloads\\Duc Auto ChatGPT\\image_001 (1).png", "Downloads collision ledger uses DownloadItem's actual final filename");
assert.equal(downloads.length, 1);
assert.equal((await privateCall({ type: "DAC_DOWNLOAD_IMAGE", url: "file:///not-allowed" })).code, "INVALID_IMAGE_URL");
const invalidOutputFolder = await privateCall({ type: "DAC_DOWNLOAD_IMAGE", jobId: "image:002", url: "https://chatgpt.com/generated.png", outputFolder: "../outside" });
assert.equal(invalidOutputFolder.ok, false);
assert.equal(invalidOutputFolder.code, "DOWNLOAD_FAILED");
assert.equal(downloads.length, 1, "unsafe output folder must fail instead of silently falling back to Downloads");
const accepted = await call({ operation: "job.submit", job_id: "wp2-test-001", task_type: "text_prompt", prompt: "test", timeout_ms: 180000 });
assert.equal(accepted.job.status, "accepted");
await wait();
assert.equal((await call({ operation: "job.status", job_id: "wp2-test-001" })).job.status, "running");
assert.equal(sessionData.get(terminalJobsStorageKey), undefined);
assert.equal(keepAliveCalls, 1);
assert.equal(activeIntervals.size, 1);
const [keepAlive] = activeIntervals.values();
assert.equal(keepAlive.delay, 25000);
keepAlive.callback();
await wait();
assert.equal(keepAliveCalls, 2);
const duplicate = await call({ operation: "job.submit", job_id: "wp2-test-001", task_type: "text_prompt", prompt: "must not send", timeout_ms: 180000 });
assert.equal(duplicate.duplicate, true);
assert.equal(sent.filter((message) => message.type === "DAC_RUN_PROMPT").length, 1);
pendingPromptResolve({
  ok: true,
  result: {
    type: "text",
    text: "test complete",
    char_count: 13,
    assistant_message_index: 2,
    assistant_count_before: 2,
    assistant_count_after: 3,
    completion: { generation_seen: true, reason: "stable_text", poll_count: 7 }
  }
});
await wait();
const completed = await call({ operation: "job.status", job_id: "wp2-test-001" });
assert.equal(completed.job.status, "done");
assert.equal(completed.job.result_type, "text");
assert.equal(completed.job.result.text, "test complete");
assert.equal(completed.job.result.completion.reason, "stable_text");
assert.equal(completed.job.target.tab_id, 42);
assert.equal(completed.job.target.tab_url, "https://chatgpt.com/c/test");
assert.equal(completed.job.target.window_id, null);
assert.equal(completed.job.target.conversation_url, "https://chatgpt.com/c/test");
assert.ok(completed.job.started_at);
assert.ok(completed.job.completed_at);
assert.equal(activeIntervals.size, 0);
assert.equal(sessionData.get(terminalJobsStorageKey).length, 1);
assert.equal(sessionData.get(terminalJobsStorageKey)[0].prompt, undefined);

const abortAccepted = await call({ operation: "job.submit", job_id: "wp2-abort-001", task_type: "text_prompt", prompt: "abort", timeout_ms: 180000 });
assert.equal(abortAccepted.job.status, "accepted");
await wait();
assert.equal(activeIntervals.size, 1);
const aborted = await call({ operation: "job.abort", job_id: "wp2-abort-001" });
assert.equal(aborted.job.status, "aborted");
assert.equal(activeIntervals.size, 0);
assert.equal(sessionData.get(terminalJobsStorageKey).some((job) => job.job_id === "wp2-abort-001"), true);
pendingPromptResolve({ ok: false, error: "Automation stopped by user." });
await wait();
assert.equal((await call({ operation: "job.status", job_id: "wp2-abort-001" })).job.status, "aborted");

const failedAccepted = await call({ operation: "job.submit", job_id: "wp2-fail-001", task_type: "text_prompt", prompt: "fail", timeout_ms: 180000 });
assert.equal(failedAccepted.job.status, "accepted");
await wait();
assert.equal(activeIntervals.size, 1);
pendingPromptResolve({ ok: false, error: "ChatGPT DOM changed." });
await wait();
const failed = await call({ operation: "job.status", job_id: "wp2-fail-001" });
assert.equal(failed.job.status, "failed");
assert.equal(activeIntervals.size, 0);
assert.equal(sessionData.get(terminalJobsStorageKey).some((job) => job.job_id === "wp2-fail-001"), true);

async function completeTerminalJob(jobId) {
  const acceptedJob = await call({ operation: "job.submit", job_id: jobId, task_type: "text_prompt", prompt: "complete", timeout_ms: 180000 });
  assert.equal(acceptedJob.job.status, "accepted");
  await wait();
  pendingPromptResolve({ ok: true, result: { type: "text", text: jobId, char_count: jobId.length, completion: { reason: "stable_text" } } });
  await wait();
  return call({ operation: "job.status", job_id: jobId });
}

for (let index = 1; index <= 8; index += 1) {
  const terminal = await completeTerminalJob(`terminal-${index}`);
  assert.equal(terminal.job.status, "done");
}
assert.equal(sessionData.get(terminalJobsStorageKey).length, 10);
assert.equal(sessionData.get(terminalJobsStorageKey).some((job) => job.job_id === "wp2-test-001"), false);
assert.equal(sessionData.get(terminalJobsStorageKey).every((job) => !("prompt" in job)), true);

sessionWriteError = new Error("session storage unavailable");
const retentionFailure = await completeTerminalJob("terminal-retention-error");
assert.equal(retentionFailure.job.status, "done");
assert.match(retentionFailure.job.retention_error, /session storage unavailable/);
assert.equal(sessionData.get(terminalJobsStorageKey).some((job) => job.job_id === "terminal-retention-error"), false);
sessionWriteError = null;

let freshExternalListener;
const freshChrome = {
  sidePanel: { setPanelBehavior: async () => {} },
  runtime: {
    onInstalled: { addListener: () => {} },
    onStartup: { addListener: () => {} },
    onMessageExternal: { addListener: (listener) => { freshExternalListener = listener; } },
    onMessage: { addListener: () => {} },
    getPlatformInfo: async () => ({})
  },
  storage: { session: sessionStorage },
  downloads: { download: async () => 1 },
  tabs: { query: async () => [], sendMessage: async () => ({ ok: true }) }
};
vm.runInNewContext(fs.readFileSync(new URL("../background.js", import.meta.url), "utf8"), {
  chrome: freshChrome, URL, Set, Map, Date, setTimeout, setInterval: setIntervalMock, clearInterval: clearIntervalMock, console
});
function freshCall(message, origin = "http://localhost:8123") {
  return new Promise((resolve) => {
    assert.equal(freshExternalListener(message, { origin }, resolve), true);
  });
}
const restored = await freshCall({ operation: "job.status", job_id: "terminal-8" });
assert.equal(restored.job.status, "done");
assert.equal(restored.job.result.text, "terminal-8");
assert.equal((await freshCall({ operation: "job.status", job_id: "terminal-retention-error" })).code, "JOB_NOT_FOUND");
assert.equal((await freshCall({ operation: "job.status", job_id: "missing-job" })).code, "JOB_NOT_FOUND");

assert.equal((await call({ operation: "ping" }, "https://example.com")).code, "UNAUTHORIZED_ORIGIN");
console.log("worker API smoke tests: PASS");
