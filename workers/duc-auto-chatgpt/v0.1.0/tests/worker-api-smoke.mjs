import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const sent = [];
let externalListener;
let pendingPromptResolve;
const chrome = {
  sidePanel: { setPanelBehavior: async () => {} },
  runtime: {
    onInstalled: { addListener: () => {} },
    onStartup: { addListener: () => {} },
    onMessageExternal: { addListener: (listener) => { externalListener = listener; } }
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

vm.runInNewContext(fs.readFileSync(new URL("../background.js", import.meta.url), "utf8"), { chrome, URL, Set, Map, Date, setTimeout, console });
assert.ok(externalListener, "external listener registered");

function call(message, origin = "http://localhost:8123") {
  return new Promise((resolve) => {
    assert.equal(externalListener(message, { origin }, resolve), true);
  });
}
const wait = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));

assert.equal((await call({ operation: "ping" })).result.composerFound, true);
const accepted = await call({ operation: "job.submit", job_id: "wp2-test-001", task_type: "text_prompt", prompt: "test", timeout_ms: 180000 });
assert.equal(accepted.job.status, "accepted");
await wait();
assert.equal((await call({ operation: "job.status", job_id: "wp2-test-001" })).job.status, "running");
const duplicate = await call({ operation: "job.submit", job_id: "wp2-test-001", task_type: "text_prompt", prompt: "must not send", timeout_ms: 180000 });
assert.equal(duplicate.duplicate, true);
assert.equal(sent.filter((message) => message.type === "DAC_RUN_PROMPT").length, 1);
pendingPromptResolve({ ok: true, result: { response: "test complete" } });
await wait();
assert.equal((await call({ operation: "job.status", job_id: "wp2-test-001" })).job.status, "done");

const abortAccepted = await call({ operation: "job.submit", job_id: "wp2-abort-001", task_type: "text_prompt", prompt: "abort", timeout_ms: 180000 });
assert.equal(abortAccepted.job.status, "accepted");
await wait();
const aborted = await call({ operation: "job.abort", job_id: "wp2-abort-001" });
assert.equal(aborted.job.status, "aborted");
pendingPromptResolve({ ok: false, error: "Automation stopped by user." });
await wait();
assert.equal((await call({ operation: "job.status", job_id: "wp2-abort-001" })).job.status, "aborted");

assert.equal((await call({ operation: "ping" }, "https://example.com")).code, "UNAUTHORIZED_ORIGIN");
console.log("worker API smoke tests: PASS");
