/* Async-boundary pins for the multi-profile identity read (audit finding 02/09).

   On this branch the auth frame is sent after BOTH the HMAC proof verification
   AND an async storage read. tokenSent flips before the read (replay guard),
   so the pin here is authSent: an auth_ok arriving after a valid proof but
   BEFORE our auth frame left the socket must be refused fail-closed, and a
   socket replaced mid-read must never receive the auth frame. */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
for (const name of ["bridge-core.js", "bridge-pairing-core.js", "bridge-router-core.js", "bridge-transport-loopback.js"]) {
  await import(pathToFileURL(path.join(here, "..", name)));
}
const pairingCore = globalThis.DacBridgePairingCore;

function hostProofFor(token, nonce) {
  const key = Buffer.from(token.replace(/-/g, "+").replace(/_/g, "/") + "=", "base64");
  return crypto.createHmac("sha256", key).update(String(nonce), "utf8").digest("base64url");
}

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

const token = Buffer.alloc(32, 9).toString("base64url");
const pairing = { schema_version: 1, host: "127.0.0.1", port: 32147, http_url: "http://127.0.0.1:32147/v1/rpc", websocket_url: "ws://127.0.0.1:32147/v1/extension", token };
const values = { [pairingCore.PAIRING_STORAGE_KEY]: pairing };

const gates = [];
const chromeMock = {
  runtime: { id: "a".repeat(32), onConnect: eventSource(), onMessage: eventSource(), getManifest: () => ({ version: "0.1.0" }) },
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

const transport = globalThis.DacBridgeLoopbackTransport.create({ chrome: chromeMock, WebSocket: FakeWebSocket });
await tick();

async function handshakeUpToProof(socket) {
  socket.emit("open");
  await tick();
  const challenge = socket.sent[0];
  assert.equal(challenge.type, "auth_challenge", "the extension challenges the host first");
  socket.emit("message", { data: JSON.stringify({ type: "auth_proof", proof: hostProofFor(token, challenge.nonce) }) });
  await tick();
}

// --- pin 1: auth_ok after a valid proof but before OUR auth frame is refused --
const first = FakeWebSocket.instances[0];
await handshakeUpToProof(first);
assert.equal(first.sent.some((frame) => frame.type === "auth"), false, "the auth frame waits for the identity read");
first.emit("message", { data: JSON.stringify({ type: "auth_ok", session_id: "too-early" }) });
await tick();
assert.equal(first.readyState, FakeWebSocket.CLOSED, "an unanswerable auth_ok closes the socket fail-closed");
assert.notEqual(values[pairingCore.STATUS_STORAGE_KEY]?.state, "connected", "a premature auth_ok never yields a connected status");
const gateOne = gates.shift();
gateOne();
await tick();
assert.equal(first.sent.some((frame) => frame.type === "auth"), false, "the abandoned socket never receives the auth frame (token stays home)");

// --- pin 2: a socket replaced mid-read never receives the auth frame ---------
await transport.connectHost();
const second = FakeWebSocket.instances.at(-1);
await handshakeUpToProof(second);
second.close();
await transport.connectHost();
const third = FakeWebSocket.instances.at(-1);
assert.notEqual(third, second, "a replacement socket exists");
await handshakeUpToProof(third);
const gateSecond = gates.shift();
const gateThird = gates.shift();
gateSecond();
await tick();
assert.equal(second.sent.some((frame) => frame.type === "auth"), false, "the replaced socket never receives the auth frame");
gateThird();
await tick();
const auth = third.sent.find((frame) => frame.type === "auth");
assert.ok(auth, "the live socket authenticates once its identity read lands");
assert.equal(auth.instance.worker, "duc-auto-chatgpt");
third.emit("message", { data: JSON.stringify({ type: "auth_ok", session_id: "session-ok" }) });
await tick();
assert.equal(values[pairingCore.STATUS_STORAGE_KEY].state, "connected", "auth_ok AFTER the auth frame still connects normally");

console.log("bridge multiprofile transport async smoke tests: PASS");
process.exit(0);
