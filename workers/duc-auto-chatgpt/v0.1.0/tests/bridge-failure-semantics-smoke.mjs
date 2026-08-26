import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
await import(pathToFileURL(path.join(here, "..", "bridge-core.js")));
await import(pathToFileURL(path.join(here, "..", "bridge-router-core.js")));
const core = globalThis.DacBridgeCore;
const routerCore = globalThis.DacBridgeRouterCore;
const base = {
  protocol: core.PROTOCOL,
  version: 1,
  kind: "request",
  request_id: "failure-request-0001",
  sent_at: "2026-08-24T10:00:00.000Z",
  client: { client_id: "failure-test", name: "Failure Test", version: "1" }
};

let available = false;
const router = routerCore.createRouter({
  core,
  executor_state: () => ({ available, executor_epoch: available ? "epoch-1" : null }),
  send_executor: async () => { throw new Error("panel Port disappeared"); },
  now: () => new Date("2026-08-24T10:00:01.000Z")
});

const offlinePing = await router.route({ ...base, method: "system.ping", params: {} });
assert.equal(offlinePing.ok, true, "panel-closed ping is an availability report, not a fabricated run failure");
assert.equal(offlinePing.result.extension, "online");
assert.equal(offlinePing.result.executor, "unavailable");
assert.equal(offlinePing.result.chatgpt.state, "UNKNOWN");

const executorMethods = ["queue.list", "run.status", "run.trial", "ledger.read", "jobs.add", "references.add", "jobs.update", "jobs.remove", "jobs.reorder", "output.configure", "run_settings.configure", "profiles.remove", "queue.propose", "queue.proposal.get", "queue.proposal.withdraw"];
const paramsByMethod = {
  "jobs.add": { jobs: [{ prompt: "x" }] },
  // Carries image bytes, so its fail-closed behaviour with the panel shut is
  // worth pinning like any other executor write. Added after the Antigravity
  // audit noted the sibling Gemini worker covers it and this one did not.
  "references.add": { references: [{ name: "r.png", data_url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==" }] },
  "jobs.update": { job_id: "Q001", prompt: "x" },
  "jobs.remove": { job_id: "Q001" },
  "jobs.reorder": { job_id: "Q001", position: 1 },
  "output.configure": { image_pattern: "{job_id}" },
  "run_settings.configure": { timeout_sec: 180 },
  "queue.propose": { if_ledger_etag: "etag", jobs: [{ client_job_id: "a", prompt: "x" }] },
  "queue.proposal.get": { proposal_id: "proposal-1" },
  "queue.proposal.withdraw": { proposal_id: "proposal-1" },
  "run.trial": { job_ids: ["Q001"] }
  ,"profiles.remove": { profile_id: "pilot-09" }
};
for (const [index, method] of executorMethods.entries()) {
  const params = paramsByMethod[method] || {};
  const response = await router.route({ ...base, request_id: `failure-request-000${index + 2}`, method, params });
  assert.equal(response.error.code, "EXECUTOR_UNAVAILABLE", `${method} fails closed while the side panel executor is absent`);
  assert.equal(response.error.retryable, true);
}

available = true;
const disconnected = await router.route({ ...base, request_id: "failure-request-0008", method: "queue.list", params: {} });
assert.equal(disconnected.error.code, "INTERNAL_ERROR", "an unexpected Port failure never becomes a job failure or partial result");
assert.equal(disconnected.error.retryable, false);

for (const code of ["EXECUTOR_UNAVAILABLE", "TRANSPORT_DISCONNECTED", "REQUEST_TIMEOUT"]) {
  assert.equal(core.failureResponse("failure-request-0009", code).error.retryable, true, `${code} remains a retryable bridge-layer failure`);
}
assert.equal(core.capabilities().auto_execute, false);
assert.deepEqual(core.capabilities().prohibited_methods, ["run.start", "run.pause", "run.resume"]);

console.log("bridge failure semantics smoke tests: PASS");
