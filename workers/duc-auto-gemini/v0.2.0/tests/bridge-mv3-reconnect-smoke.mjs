import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
for (const name of ["bridge-core.js", "bridge-pairing-core.js", "bridge-router-core.js", "bridge-transport-loopback.js"]) {
  await import(pathToFileURL(path.join(here, "..", name)));
}
const core = globalThis.DacBridgeCore;

function eventSource() {
  const listeners = [];
  return { addListener(listener) { listeners.push(listener); }, emit(...args) { for (const listener of [...listeners]) listener(...args); }, count: () => listeners.length };
}

const token = Buffer.alloc(32, 11).toString("base64url");
const pairing = { schema_version: 1, host: "127.0.0.1", port: 32147, http_url: "http://127.0.0.1:32147/v1/rpc", websocket_url: "ws://127.0.0.1:32147/v1/extension", token };
const values = { [globalThis.DacBridgePairingCore.PAIRING_STORAGE_KEY]: pairing };
const runtimeConnect = eventSource();
const runtimeMessage = eventSource();
const alarms = eventSource();
const storageChanges = eventSource();
let alarmSpec = null;
const chromeMock = {
  runtime: { id: "a".repeat(32), onConnect: runtimeConnect, onMessage: runtimeMessage },
  alarms: { onAlarm: alarms, create(name, spec) { alarmSpec = { name, spec }; } },
  storage: {
    local: {
      async get(key) {
        if (Array.isArray(key)) return Object.fromEntries(key.map((name) => [name, values[name]]));
        return key ? { [key]: values[key] } : { ...values };
      },
      async set(next) { Object.assign(values, next); },
      async remove(key) { delete values[key]; }
    },
    onChanged: storageChanges
  }
};

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 3;
  static instances = [];
  constructor(url) { this.url = url; this.readyState = FakeWebSocket.CONNECTING; this.listeners = new Map(); this.sent = []; FakeWebSocket.instances.push(this); }
  addEventListener(name, listener) { const list = this.listeners.get(name) || []; list.push(listener); this.listeners.set(name, list); }
  emit(name, value = {}) { if (name === "open") this.readyState = FakeWebSocket.OPEN; for (const listener of this.listeners.get(name) || []) listener(value); }
  send(value) { this.sent.push(JSON.parse(value)); }
  close() { this.readyState = FakeWebSocket.CLOSED; this.emit("close", {}); }
}

globalThis.DacBridgeLoopbackTransport.create({ chrome: chromeMock, WebSocket: FakeWebSocket });
assert.equal(runtimeConnect.count(), 1, "onConnect listener is registered synchronously before async storage lookup");
assert.equal(runtimeMessage.count(), 1, "pairing message listener is registered synchronously");
assert.deepEqual(alarmSpec, { name: "dac.bridge.loopback.reconnect.v1", spec: { periodInMinutes: 0.5 } });
await new Promise((resolve) => setTimeout(resolve, 0));
const firstSocket = FakeWebSocket.instances[0];
assert.equal(firstSocket.url, pairing.websocket_url);
assert.equal(firstSocket.url.includes(token), false, "token is not placed in the WebSocket URL");
firstSocket.emit("open");
await new Promise((resolve) => setTimeout(resolve, 0)); // multi-profile: auth lands one microtask after open
// Multi-profile (port tu gg-flow-video): auth mang khoi instance va duoc gui
// sau mot microtask (doc identity tu storage trong handler open).
await new Promise((resolve) => setTimeout(resolve, 0));
const firstAuth = firstSocket.sent[0];
assert.equal(firstAuth.type, "auth");
assert.equal(firstAuth.role, "extension");
assert.equal(firstAuth.token, token);
assert.equal(firstAuth.instance.schema_version, 1);
assert.match(firstAuth.instance.instance_id, /^[A-Za-z0-9-]{8,64}$/);
assert.equal(firstAuth.instance.worker, "duc-auto-gemini");
const persistedInstance = values["dac.bridge.instance.v1"];
assert.equal(firstAuth.instance.instance_id, persistedInstance.instance_id, "the announced identity is the persisted one");
const portMessage = eventSource();
const portDisconnect = eventSource();
const posted = [];
const port = { name: "dac.bridge.executor.v1", onMessage: portMessage, onDisconnect: portDisconnect, postMessage(value) { posted.push(value); }, disconnect() {} };
runtimeConnect.emit(port);
portMessage.emit({ type: "DAC_BRIDGE_EXECUTOR_READY", protocol: core.PROTOCOL, version: 1, executor_epoch: "epoch-test" });
const preAuthProposal = {
  protocol: core.PROTOCOL, version: 1, kind: "request", request_id: "mv3-preauth-0001", method: "queue.propose",
  sent_at: "2026-08-24T10:00:00.000Z", client: { client_id: "test", name: "Test", version: "1" },
  params: { if_ledger_etag: "sha256:test", jobs: [{ client_job_id: "a", requested_job_id: null, prompt: "must not stage", reference_images: [], settings: {} }] }
};
firstSocket.emit("message", { data: JSON.stringify({ type: "rpc", relay_id: "preauth-relay", envelope: preAuthProposal }) });
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(firstSocket.readyState, FakeWebSocket.CLOSED, "pre-auth RPC closes the socket fail-closed");
assert.equal(posted.length, 0, "pre-auth proposal never reaches the executor");

alarms.emit({ name: "dac.bridge.loopback.reconnect.v1" });
await new Promise((resolve) => setTimeout(resolve, 0));
const secondSocket = FakeWebSocket.instances[1];
secondSocket.emit("open");
await new Promise((resolve) => setTimeout(resolve, 0)); // multi-profile: auth lands one microtask after open
secondSocket.emit("message", { data: JSON.stringify({ type: "auth_ok", session_id: "host-session", server_time: new Date().toISOString() }) });
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(values[globalThis.DacBridgePairingCore.STATUS_STORAGE_KEY].state, "connected");
firstSocket.emit("message", { data: JSON.stringify({ type: "rpc", relay_id: "stale-relay", envelope: preAuthProposal }) });
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(posted.length, 0, "a replaced stale socket cannot route RPC");

const currentPortMessage = eventSource();
const currentPortDisconnect = eventSource();
const currentPosted = [];
const currentPort = { name: "dac.bridge.executor.v1", onMessage: currentPortMessage, onDisconnect: currentPortDisconnect, postMessage(value) { currentPosted.push(value); }, disconnect() {} };
runtimeConnect.emit(currentPort);
portMessage.emit({ type: "DAC_BRIDGE_EXECUTOR_READY", protocol: core.PROTOCOL, version: 1, executor_epoch: "stale-epoch" });
currentPortMessage.emit({ type: "DAC_BRIDGE_EXECUTOR_READY", protocol: core.PROTOCOL, version: 1, executor_epoch: "epoch-current" });
const request = {
  protocol: core.PROTOCOL, version: 1, kind: "request", request_id: "mv3-request-0001", method: "queue.list",
  sent_at: "2026-08-24T10:00:00.000Z", client: { client_id: "test", name: "Test", version: "1" }, params: {}
};
secondSocket.emit("message", { data: JSON.stringify({ type: "rpc", relay_id: "relay-1", envelope: request }) });
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(currentPosted[0].type, "DAC_BRIDGE_RPC");
assert.equal(currentPosted[0].envelope.request_id, request.request_id);
portMessage.emit({ type: "DAC_BRIDGE_RPC_RESPONSE", route_id: currentPosted[0].route_id, envelope: core.successResponse(request, { jobs: ["stale"], next_cursor: null }) });
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(secondSocket.sent.some((message) => message.type === "rpc_response"), false, "a replaced panel Port cannot settle current work");
currentPortMessage.emit({ type: "DAC_BRIDGE_RPC_RESPONSE", route_id: currentPosted[0].route_id, envelope: core.successResponse(request, { jobs: [], next_cursor: null }) });
await new Promise((resolve) => setTimeout(resolve, 0));
const response = secondSocket.sent.find((message) => message.type === "rpc_response");
assert.equal(response.envelope.request_id, request.request_id, "request_id survives host-worker-panel round trip");

currentPortDisconnect.emit();
const closedRequest = { ...request, request_id: "mv3-request-0002" };
secondSocket.emit("message", { data: JSON.stringify({ type: "rpc", relay_id: "relay-2", envelope: closedRequest }) });
await new Promise((resolve) => setTimeout(resolve, 0));
const unavailable = secondSocket.sent.find((message) => message.relay_id === "relay-2");
assert.equal(unavailable.envelope.error.code, "EXECUTOR_UNAVAILABLE");

secondSocket.close();
alarms.emit({ name: "dac.bridge.loopback.reconnect.v1" });
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(FakeWebSocket.instances.length, 3, "30-second alarm reconnects after each host outage");

console.log("bridge MV3 reconnect smoke tests: PASS");
