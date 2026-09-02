/* Async-boundary pins for the multi-profile identity read (audit finding 02/09).

   The auth frame is now sent AFTER an async storage read inside the "open"
   handler. Two things must hold across that gap:
   1. An auth_ok arriving BEFORE our auth frame left the socket is refused
      fail-closed (a host answering unasked is broken or hostile); it must not
      mark the transport authenticated nor cancel the pending handshake state.
   2. If the socket is replaced while the read is pending, the replaced socket
      never receives the auth frame. */
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
for (const name of ["bridge-core.js", "bridge-pairing-core.js", "bridge-router-core.js", "bridge-transport-loopback.js"]) {
  await import(pathToFileURL(path.join(here, "..", name)));
}
const pairingCore = globalThis.DacBridgePairingCore;

function eventSource() {
  const listeners = [];
  return { addListener(listener) { listeners.push(listener); }, emit(...args) { for (const listener of [...listeners]) listener(...args); } };
}

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 3;
  static instances = [];
  constructor(url) { this.url = url; this.readyState = FakeWebSocket.CONNECTING; this.listeners = new Map(); this.sent = []; FakeWebSocket.instances.push(this); }
  addEventListener(name, listener) { const list = this.listeners.get(name) || []; list.push(listener); this.listeners.set(name, list); }
  emit(name, value = {}) { if (name === "open") this.readyState = FakeWebSocket.OPEN; for (const listener of this.listeners.get(name) || []) listener(value); }
  send(value) { this.sent.push(JSON.parse(value)); }
  close() { if (this.readyState === FakeWebSocket.CLOSED) return; this.readyState = FakeWebSocket.CLOSED; this.emit("close", {}); }
}

const token = Buffer.alloc(32, 7).toString("base64url");
const pairing = { schema_version: 1, host: "127.0.0.1", port: 32148, http_url: "http://127.0.0.1:32148/v1/rpc", websocket_url: "ws://127.0.0.1:32148/v1/extension", token };
const values = { [pairingCore.PAIRING_STORAGE_KEY]: pairing };

// Every INSTANCE read (array get) blocks on its own gate; the pairing read
// (string get) resolves immediately. The test releases gates in chosen order.
const gates = [];
const chromeMock = {
  runtime: { id: "a".repeat(32), onConnect: eventSource(), onMessage: eventSource(), getManifest: () => ({ version: "0.2.0" }) },
  alarms: { onAlarm: eventSource(), create() {} },
  storage: {
    local: {
      get(key) {
        if (Array.isArray(key)) {
          return new Promise((resolve) => gates.push(() => resolve(Object.fromEntries(key.map((name) => [name, values[name]])))));
        }
        return Promise.resolve(key ? { [key]: values[key] } : { ...values });
      },
      async set(next) { Object.assign(values, next); },
      async remove(key) { delete values[key]; }
    },
    onChanged: eventSource()
  }
};

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

const transport = globalThis.DacBridgeLoopbackTransport.create({
  chrome: chromeMock,
  WebSocket: FakeWebSocket,
  keepalive_ms: 60000,
  keepalive_ack_timeout_ms: 30000,
  handshake_timeout_ms: 60000,
  reconnect_delays_ms: [1]
});
await tick();

// --- pin 1: premature auth_ok is refused while the identity read is pending ---
const first = FakeWebSocket.instances[0];
first.emit("open");
await tick();
assert.equal(first.sent.length, 0, "the auth frame waits for the identity read");
first.emit("message", { data: JSON.stringify({ type: "auth_ok", session_id: "too-early" }) });
await tick();
assert.equal(first.readyState, FakeWebSocket.CLOSED, "an unanswerable auth_ok closes the socket fail-closed");
assert.notEqual(values[pairingCore.STATUS_STORAGE_KEY]?.state, "connected", "a premature auth_ok never yields a connected status");
const gateOne = gates.shift();
gateOne();
await tick();
assert.equal(first.sent.some((frame) => frame.type === "auth"), false, "the abandoned socket never receives the auth frame");

// --- pin 2: a socket replaced mid-read never receives the auth frame ---------
await transport.connectHost();
const second = FakeWebSocket.instances.at(-1);
second.emit("open");
await tick();
// Replace it while its identity read is still pending.
second.close();
await transport.connectHost();
const third = FakeWebSocket.instances.at(-1);
assert.notEqual(third, second, "a replacement socket exists");
third.emit("open");
await tick();
// Fixture trick that isolates the IDENTITY predicate of the post-read guard:
// ownership already moved to the replacement, but the old handle is forced to
// look OPEN again — so only socket-identity, not readiness, can block the send.
second.readyState = FakeWebSocket.OPEN;
const gateSecond = gates.shift();
const gateThird = gates.shift();
gateSecond();
await tick();
assert.equal(second.sent.some((frame) => frame.type === "auth"), false, "the replaced socket never receives the auth frame");
gateThird();
await tick();
const auth = third.sent.find((frame) => frame.type === "auth");
assert.ok(auth, "the live socket authenticates once its identity read lands");
assert.equal(auth.instance.worker, "duc-auto-gemini");
third.emit("message", { data: JSON.stringify({ type: "auth_ok", session_id: "session-ok" }) });
await tick();
assert.equal(values[pairingCore.STATUS_STORAGE_KEY].state, "connected", "auth_ok AFTER the auth frame still connects normally");

console.log("bridge multiprofile transport async smoke tests: PASS");
process.exit(0);
