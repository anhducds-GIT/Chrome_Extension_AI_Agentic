/* Save-and-announce pin (owner request 2026-09-02; ported from gemini).

   DAC_BRIDGE_LABEL_SET must (1) persist the sanitized label, (2) cycle ONLY
   this profile's socket so the fresh connect (challenge -> proof -> auth)
   announces the new name at once, and (3) answer the panel with the sanitized
   label. Hostile inputs are bounded, C1-stripped and surrogate-swept. */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
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

const token = Buffer.alloc(32, 21).toString("base64url");
const pairing = { schema_version: 1, host: "127.0.0.1", port: 32147, http_url: "http://127.0.0.1:32147/v1/rpc", websocket_url: "ws://127.0.0.1:32147/v1/extension", token };
const values = { [pairingCore.PAIRING_STORAGE_KEY]: pairing };
const runtimeMessage = eventSource();
const chromeMock = {
  runtime: { id: "a".repeat(32), onConnect: eventSource(), onMessage: runtimeMessage, getManifest: () => ({ version: "0.1.0" }) },
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

async function fullHandshake(socket) {
  socket.emit("open");
  await tick();
  const challenge = socket.sent[0];
  assert.equal(challenge.type, "auth_challenge", "this branch challenges the host first");
  socket.emit("message", { data: JSON.stringify({ type: "auth_proof", proof: hostProofFor(token, challenge.nonce) }) });
  await tick();
  const auth = socket.sent.find((frame) => frame.type === "auth");
  assert.ok(auth, "auth follows a valid proof");
  socket.emit("message", { data: JSON.stringify({ type: "auth_ok", session_id: `s-${FakeWebSocket.instances.length}` }) });
  await tick();
  return auth;
}

const first = FakeWebSocket.instances[0];
const firstAuth = await fullHandshake(first);
assert.equal(firstAuth.instance.label, "", "no label saved yet");
assert.equal(values[pairingCore.STATUS_STORAGE_KEY].state, "connected");

// Save with messy input: sanitized, persisted, socket cycled, announced at once.
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
const secondAuth = await fullHandshake(second);
assert.equal(secondAuth.instance.label, "Máy A", "the fresh connect announces the NEW name immediately");
assert.equal(secondAuth.token, token, "authentication is untouched by the label flow");

// The label cycle must not weaken the handshake: on the very connection a label
// save produces, an INVALID proof must still end fail-closed with no auth frame
// and no connected status. (Premature auth_ok and the authSent gate are pinned
// separately in bridge-multiprofile-transport-async-smoke.mjs.)
let badProofReply = null;
runtimeMessage.emit({ type: "DAC_BRIDGE_LABEL_SET", label: "Máy A" }, {}, (response) => { badProofReply = response; });
await tick();
await tick();
assert.equal(badProofReply?.ok, true);
const cycled = FakeWebSocket.instances.at(-1);
cycled.emit("open");
await tick();
assert.equal(cycled.sent[0].type, "auth_challenge");
cycled.emit("message", { data: JSON.stringify({ type: "auth_proof", proof: "A".repeat(43) }) });
await tick();
assert.equal(cycled.readyState, FakeWebSocket.CLOSED, "an invalid proof still closes the socket fail-closed after a label save");
assert.equal(cycled.sent.some((frame) => frame.type === "auth"), false, "the token never follows an invalid proof");
assert.notEqual(values[pairingCore.STATUS_STORAGE_KEY].state, "connected", "a failed handshake never reports connected");
// Recover for the rest of the test: reconnect and complete a real handshake.
runtimeMessage.emit({ type: "DAC_BRIDGE_LABEL_SET", label: "Máy A" }, {}, () => {});
await tick();
await tick();
await fullHandshake(FakeWebSocket.instances.at(-1));

// Hostile inputs: bounded before scanning, C1 stripped, non-strings emptied,
// no lone surrogate survives the cap boundary.
const hostile = "Máy" + String.fromCharCode(0x9f) + " B" + "y".repeat(1000000);
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

// 255 control chars are stripped AFTER the 256-cap cuts the astral pair in half,
// leaving exactly one lone high surrogate for the sweep to catch.
const splitEmoji = String.fromCharCode(1).repeat(255) + String.fromCodePoint(0x1f600);
let surrogateReply = null;
runtimeMessage.emit({ type: "DAC_BRIDGE_LABEL_SET", label: splitEmoji }, {}, (response) => { surrogateReply = response; });
await tick();
await tick();
assert.equal(surrogateReply?.ok, true);
assert.equal(surrogateReply.label.isWellFormed(), true, "the stored label is always well-formed Unicode");

// The HOST copy of the sanitizer must behave the same (behavioral pin).
const { parseInstance } = await import(pathToFileURL(path.join(here, "..", "duc-auto-chatgpt-loopback-bridge-host-v1", "bridge-host.mjs")));
const hostInstance = parseInstance({ schema_version: 1, instance_id: "h".repeat(12), label: hostile });
assert.ok(hostInstance.label.length <= 64, "host caps a million-char label");
assert.equal(C1.test(hostInstance.label), false, "host strips C1 controls");
assert.equal(parseInstance({ schema_version: 1, instance_id: "h".repeat(12), label: splitEmoji }).label.isWellFormed(), true, "host never keeps a lone surrogate");

// Wiring pins: the panel exposes the button and routes through the message.
const panelHtml = fs.readFileSync(path.join(here, "..", "sidepanel.html"), "utf8");
const panelSource = fs.readFileSync(path.join(here, "..", "sidepanel.js"), "utf8");
assert.ok(panelHtml.includes('id="bridgeProfileLabelSaveBtn"'), "the panel offers the save button");
assert.ok(panelSource.includes('"DAC_BRIDGE_LABEL_SET"'), "the panel saves through the transport message");
assert.ok(panelSource.includes("bridgeProfileLabelSaveBtn"), "the panel wires the save button");

console.log("bridge profile label save smoke tests: PASS");
process.exit(0);
