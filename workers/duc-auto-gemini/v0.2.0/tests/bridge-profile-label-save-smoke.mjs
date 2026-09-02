/* Save-and-announce pin (owner request 2026-09-02).

   DAC_BRIDGE_LABEL_SET must (1) persist the sanitized label, (2) cycle ONLY
   this profile's socket so the fresh connect announces the new name at once —
   no host restart, no extension reload — and (3) answer the panel with the
   sanitized label. */
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

const token = Buffer.alloc(32, 13).toString("base64url");
const pairing = { schema_version: 1, host: "127.0.0.1", port: 32148, http_url: "http://127.0.0.1:32148/v1/rpc", websocket_url: "ws://127.0.0.1:32148/v1/extension", token };
const values = { [pairingCore.PAIRING_STORAGE_KEY]: pairing };
const runtimeMessage = eventSource();
const chromeMock = {
  runtime: { id: "a".repeat(32), onConnect: eventSource(), onMessage: runtimeMessage, getManifest: () => ({ version: "0.2.0" }) },
  alarms: { onAlarm: eventSource(), create() {} },
  storage: {
    local: {
      async get(key) {
        if (Array.isArray(key)) return Object.fromEntries(key.map((name) => [name, values[name]]));
        return key ? { [key]: values[key] } : { ...values };
      },
      async set(next) { Object.assign(values, next); },
      async remove(key) { delete values[key]; }
    },
    onChanged: eventSource()
  }
};

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

globalThis.DacBridgeLoopbackTransport.create({ chrome: chromeMock, WebSocket: FakeWebSocket });
await tick();

const first = FakeWebSocket.instances[0];
first.emit("open");
await tick();
assert.equal(first.sent[0].type, "auth");
assert.equal(first.sent[0].instance.label, "", "no label saved yet");
first.emit("message", { data: JSON.stringify({ type: "auth_ok", session_id: "session-1" }) });
await tick();
assert.equal(values[pairingCore.STATUS_STORAGE_KEY].state, "connected");

// Save with messy input: control char + padding must be stripped, then the
// transport must cycle its own socket and announce the clean name at once.
const messy = "  Máy A" + String.fromCharCode(7) + "  ";
let reply = null;
runtimeMessage.emit({ type: "DAC_BRIDGE_LABEL_SET", label: messy }, {}, (response) => { reply = response; });
await tick();
await tick();
assert.equal(reply?.ok, true, "the panel gets an answer");
assert.equal(reply.label, "Máy A", "the echoed label is the sanitized one");
assert.equal(values["dac.bridge.instance_label.v1"], "Máy A", "the sanitized label is persisted");
assert.equal(first.readyState, FakeWebSocket.CLOSED, "the old socket is cycled");
const second = FakeWebSocket.instances.at(-1);
assert.notEqual(second, first, "a fresh socket exists after the save");
second.emit("open");
await tick();
const announced = second.sent.find((frame) => frame.type === "auth");
assert.equal(announced.instance.label, "Máy A", "the fresh connect announces the NEW name immediately");
assert.equal(announced.token, token, "authentication is untouched by the label flow");

// Hostile inputs (audit 02/09): a huge label must be bounded BEFORE scanning,
// C1 controls (U+0080-U+009F) must be stripped like C0, non-strings become "".
const hostile = "Máy" + String.fromCharCode(0x9f) + " B" + "y".repeat(1000000);
let hostileReply = null;
runtimeMessage.emit({ type: "DAC_BRIDGE_LABEL_SET", label: hostile }, {}, (response) => { hostileReply = response; });
await tick();
await tick();
assert.equal(hostileReply?.ok, true);
assert.ok(hostileReply.label.length <= 64, "a million-char label is capped");
const C1 = new RegExp("[\\u0080-\\u009f]");
assert.equal(C1.test(hostileReply.label), false, "C1 controls are stripped too");
assert.ok(hostileReply.label.startsWith("Máy B"), "the human part of the name survives");
let numberReply = null;
runtimeMessage.emit({ type: "DAC_BRIDGE_LABEL_SET", label: 12345 }, {}, (response) => { numberReply = response; });
await tick();
await tick();
assert.equal(numberReply?.ok, true);
assert.equal(numberReply.label, "", "a non-string label becomes empty, never garbage");

// Wiring pins: the panel exposes the button and routes the save through the
// SAME message the transport handles.
import fs from "node:fs";
const panelHtml = fs.readFileSync(path.join(here, "..", "sidepanel.html"), "utf8");
const panelSource = fs.readFileSync(path.join(here, "..", "sidepanel.js"), "utf8");
assert.ok(panelHtml.includes('id="bridgeProfileLabelSaveBtn"'), "the panel offers the save button");
assert.ok(panelSource.includes('"DAC_BRIDGE_LABEL_SET"'), "the panel saves through the transport message");
assert.ok(panelSource.includes("bridgeProfileLabelSaveBtn"), "the panel wires the save button");

console.log("bridge profile label save smoke tests: PASS");
process.exit(0);
