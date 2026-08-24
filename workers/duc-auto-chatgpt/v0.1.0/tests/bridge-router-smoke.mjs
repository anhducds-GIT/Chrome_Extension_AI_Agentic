import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
await import(pathToFileURL(path.join(here, "..", "bridge-core.js")));
await import(pathToFileURL(path.join(here, "..", "bridge-router-core.js")));
const core = globalThis.DacBridgeCore;
const routerCore = globalThis.DacBridgeRouterCore;
const base = {
  protocol: core.PROTOCOL, version: 1, kind: "request", request_id: "router-request-0001",
  sent_at: "2026-08-24T10:00:00.000Z", client: { client_id: "cli", name: "CLI", version: "1" }
};
let available = false;
let forwarded = null;
const router = routerCore.createRouter({
  core,
  extension_id: "a".repeat(32),
  session_id: "worker-session",
  now: () => new Date("2026-08-24T10:00:01.000Z"),
  executor_state: () => ({ available, executor_epoch: available ? "epoch-1" : null }),
  send_executor: async (request) => {
    forwarded = request;
    return core.successResponse(request, request.method === "system.ping"
      ? { extension: "online", executor: "available", chatgpt: { state: "READY" }, workbook: { loaded: true } }
      : { jobs: [], next_cursor: null });
  }
});

const hello = await router.route({ ...base, method: "session.hello", params: { supported_versions: [1] } });
assert.equal(hello.ok, true);
assert.equal(hello.result.executor.available, false);
assert.equal(hello.result.transport, "loopback_ws");
const offlinePing = await router.route({ ...base, request_id: "router-request-0002", method: "system.ping", params: {} });
assert.equal(offlinePing.result.chatgpt.state, "UNKNOWN");
const unavailable = await router.route({ ...base, request_id: "router-request-0003", method: "queue.list", params: {} });
assert.equal(unavailable.error.code, "EXECUTOR_UNAVAILABLE");

available = true;
const ping = await router.route({ ...base, request_id: "router-request-0004", method: "system.ping", params: {} });
assert.equal(ping.result.chatgpt.state, "READY");
assert.equal(forwarded.request_id, "router-request-0004", "router preserves request_id exactly across executor routing");
const unknown = await router.route({ ...base, request_id: "router-request-0005", method: "run.start", params: {} });
assert.equal(unknown.error.code, "METHOD_NOT_FOUND");
const capabilities = await router.route({ ...base, request_id: "router-request-0006", method: "system.capabilities", params: {} });
assert.equal(capabilities.result.auto_execute, false);
assert.equal(capabilities.result.methods.some((method) => method.name === "run.start"), false);

console.log("bridge router smoke tests: PASS");
