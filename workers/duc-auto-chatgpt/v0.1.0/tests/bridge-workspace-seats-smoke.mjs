/* Workspace seats: several NAMED work sessions inside ONE Chrome profile
   (MULTI-SESSION-PER-PROFILE-DESIGN-V1, direction A — Đức approved 03/09:
   cap 3, host unchanged, full method surface, tab-scoped methods bound to the
   workspace's own tab).

   Pins, in three layers:
   1. bridge-workspace-core: sanitize/normalize/upsert/remove/derive are
      fail-closed (cap, duplicate names, duplicate tabs, hostile names).
   2. transport: one extra socket per workspace, each walking the FULL
      challenge → proof → auth handshake with a derived identity; a workspace
      whose tab is closed or off-provider gets NO socket (and loses the one it
      had); rpc arriving through a workspace seat hands the panel that
      workspace; the profile seat is untouched.
   3. sidepanel (static): tab-scoped handlers read call.context.workspace and
      resolve the workspace's OWN tab, refusing RECEIVER_LOST when it is gone. */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
for (const name of ["bridge-core.js", "bridge-pairing-core.js", "bridge-router-core.js", "bridge-workspace-core.js", "bridge-transport-loopback.js"]) {
  await import(pathToFileURL(path.join(here, "..", name)));
}
const core = globalThis.DacBridgeCore;
const pairingCore = globalThis.DacBridgePairingCore;
const wsCore = globalThis.DacBridgeWorkspaceCore;

// ---------------------------------------------------------------------------
// 1. Pure core
// ---------------------------------------------------------------------------
assert.equal(wsCore.MAX_WORKSPACES, 3, "the cap Đức approved 2026-09-03 is 3");

// Hostile names get the same treatment as profile labels: bounded BEFORE the
// scan, C0+C1 stripped, lone surrogates swept at the cut.
assert.equal(wsCore.sanitizeWorkspaceName(`${"x".repeat(1000000)}`).length, 64, "million-char names are bounded");
assert.equal(wsCore.sanitizeWorkspaceName([7, 116, 101, 110, 159, 112, 104, 105, 101, 110, 0].map((code) => String.fromCharCode(code)).join("")), "tenphien", "C0 and C1 controls are stripped");
const surrogateBait = String.fromCharCode(1).repeat(255) + String.fromCodePoint(0x1f600) + "b";
assert.ok(wsCore.sanitizeWorkspaceName(surrogateBait).isWellFormed(), "no lone surrogate survives the cut");
assert.equal(wsCore.sanitizeWorkspaceName(42), "", "non-strings sanitize to empty");

assert.equal(wsCore.isProviderTabUrl("https://chatgpt.com/c/abc"), true);
assert.equal(wsCore.isProviderTabUrl("https://chat.openai.com/"), true);
assert.equal(wsCore.isProviderTabUrl("https://example.com/chatgpt.com/"), false, "origin check, not substring");
assert.equal(wsCore.isProviderTabUrl(""), false);

// normalizeStore drops garbage and never lets more than the cap through.
const dirty = {
  workspaces: [
    { workspace_id: "ws-aaaa-0001", name: "mot", tab_id: 11 },
    { workspace_id: "ws-aaaa-0001", name: "trung-id", tab_id: 12 },
    { workspace_id: "ws-aaaa-0002", name: "MOT", tab_id: 13 },
    { workspace_id: "ws-aaaa-0003", name: "trung-tab", tab_id: 11 },
    { workspace_id: "bad id!", name: "sai-id", tab_id: 14 },
    { workspace_id: "ws-aaaa-0004", name: "", tab_id: 15 },
    { workspace_id: "ws-aaaa-0005", name: "hai", tab_id: -3 },
    { workspace_id: "ws-aaaa-0006", name: "ba", tab_id: 16 },
    { workspace_id: "ws-aaaa-0007", name: "bon", tab_id: 17 },
    { workspace_id: "ws-aaaa-0008", name: "nam", tab_id: 18 }
  ]
};
const cleaned = wsCore.normalizeStore(dirty);
assert.deepEqual(cleaned.workspaces.map((entry) => entry.workspace_id), ["ws-aaaa-0001", "ws-aaaa-0006", "ws-aaaa-0007"],
  "duplicates (id, case-folded name, tab) and invalid rows are dropped; the cap holds");

// tab_id: null is a LEGAL durable state — a named workspace whose binding was
// voided (browser restart) keeps its name and identity, connects to nothing.
const unbound = wsCore.normalizeStore({ workspaces: [
  { workspace_id: "ws-aaaa-0001", name: "mot", tab_id: null },
  { workspace_id: "ws-aaaa-0002", name: "hai", tab_id: null }
] });
assert.deepEqual(unbound.workspaces.map((entry) => entry.tab_id), [null, null], "two unbound workspaces coexist (null never collides as a duplicate tab)");

// upsert: create, cap, duplicate name, duplicate tab, rename, not-found.
const makeId = () => `ws-gen-${crypto.randomUUID()}`;
let store = { schema_version: 1, workspaces: [] };
({ store } = wsCore.upsertWorkspace(store, { name: "gpt-kichban", tab_id: 101 }, makeId));
({ store } = wsCore.upsertWorkspace(store, { name: "gpt-research", tab_id: 102 }, makeId));
const third = wsCore.upsertWorkspace(store, { name: "gpt-hopdong", tab_id: 103 }, makeId);
store = third.store;
assert.throws(() => wsCore.upsertWorkspace(store, { name: "gpt-thu-tu", tab_id: 104 }, makeId), (error) => error.code === "WORKSPACE_LIMIT");
assert.throws(() => wsCore.upsertWorkspace(store, { workspace_id: third.workspace.workspace_id, name: "GPT-KICHBAN", tab_id: 103 }, makeId), (error) => error.code === "WORKSPACE_NAME_TAKEN", "names are unique case-insensitively — the host routes by label");
assert.throws(() => wsCore.upsertWorkspace(store, { workspace_id: third.workspace.workspace_id, name: "gpt-hopdong", tab_id: 101 }, makeId), (error) => error.code === "WORKSPACE_TAB_TAKEN", "one tab belongs to one workspace");
assert.throws(() => wsCore.upsertWorkspace(store, { workspace_id: "ws-khong-co-0001", name: "x", tab_id: 105 }, makeId), (error) => error.code === "WORKSPACE_NOT_FOUND");
assert.throws(() => wsCore.upsertWorkspace(store, { name: String.fromCharCode(1, 2), tab_id: 105 }, makeId), (error) => error.code === "WORKSPACE_NAME_INVALID");
assert.throws(() => wsCore.upsertWorkspace(store, { name: "gpt-x", tab_id: 0 }, makeId), (error) => error.code === "WORKSPACE_TAB_INVALID");
const renamed = wsCore.upsertWorkspace(store, { workspace_id: third.workspace.workspace_id, name: "gpt-hopdong-2", tab_id: 103 }, makeId);
assert.equal(renamed.workspace.workspace_id, third.workspace.workspace_id, "rename keeps the identity");
assert.equal(renamed.store.workspaces.length, 3);
const afterRemove = wsCore.removeWorkspace(renamed.store, third.workspace.workspace_id);
assert.equal(afterRemove.store.workspaces.length, 2);
assert.throws(() => wsCore.removeWorkspace(afterRemove.store, "ws-khong-co-0001"), (error) => error.code === "WORKSPACE_NOT_FOUND");

// deriveInstance: routing metadata only, same shape as the profile block.
const profileInstance = { schema_version: 1, instance_id: "prof-1234", label: "kaito", worker: "duc-auto-chatgpt", extension_version: "0.3.0" };
const derived = wsCore.deriveInstance(profileInstance, { workspace_id: "ws-aaaa-0001", name: "gpt-kichban", tab_id: 101 });
assert.deepEqual(derived, { schema_version: 1, instance_id: "ws-aaaa-0001", label: "gpt-kichban", worker: "duc-auto-chatgpt", extension_version: "0.3.0" });
assert.equal(wsCore.deriveInstance(profileInstance, { workspace_id: "ws-aaaa-0001", name: String.fromCharCode(1) }), null, "a workspace with no usable name derives NO identity — fail closed");
assert.equal(wsCore.deriveInstance(null, { workspace_id: "ws-aaaa-0001", name: "x" }), null);
// A workspace_id that impersonates the profile's own instance_id (hostile
// store) derives NO identity: the host keys seats by instance_id, so the two
// sockets would evict each other and --target would oscillate (audit 03/09).
assert.equal(wsCore.deriveInstance(profileInstance, { workspace_id: "prof-1234", name: "gia-mao" }), null, "a workspace may never announce the profile's own id");

// ---------------------------------------------------------------------------
// 2. Transport seats
// ---------------------------------------------------------------------------
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

function hostProofFor(token, nonce) {
  const key = Buffer.from(token.replace(/-/g, "+").replace(/_/g, "/") + "=", "base64");
  return crypto.createHmac("sha256", key).update(String(nonce), "utf8").digest("base64url");
}

const token = Buffer.alloc(32, 7).toString("base64url");
const pairing = { schema_version: 1, host: "127.0.0.1", port: 32147, http_url: "http://127.0.0.1:32147/v1/rpc", websocket_url: "ws://127.0.0.1:32147/v1/extension", token };

const seededWorkspaces = {
  schema_version: 1,
  workspaces: [
    { workspace_id: "ws-kichban-0001", name: "gpt-kichban", tab_id: 101, created_at: "2026-09-03T00:00:00.000Z" },
    { workspace_id: "ws-research-0002", name: "gpt-research", tab_id: 102, created_at: "2026-09-03T00:00:00.000Z" },
    { workspace_id: "ws-offsite-0003", name: "gpt-lac-trang", tab_id: 103, created_at: "2026-09-03T00:00:00.000Z" }
  ]
};

const values = {
  [pairingCore.PAIRING_STORAGE_KEY]: pairing,
  [wsCore.STORAGE_KEY]: seededWorkspaces,
  "dac.bridge.instance.v1": { schema_version: 1, instance_id: "prof-abcd-0001", created_at: "2026-09-01T00:00:00.000Z" },
  "dac.bridge.instance_label.v1": "kaito"
};

const tabs = new Map([
  [101, { id: 101, url: "https://chatgpt.com/c/one" }],
  [102, { id: 102, url: "https://chatgpt.com/c/two" }],
  [103, { id: 103, url: "https://example.com/elsewhere" }],
  [104, { id: 104, url: "https://chatgpt.com/c/four" }],
  [105, { id: 105, url: "https://chatgpt.com/c/five" }]
]);

const chromeMock = {
  runtime: { id: "a".repeat(32), onConnect: eventSource(), onMessage: eventSource(), getManifest: () => ({ version: "0.3.0" }) },
  alarms: { onAlarm: eventSource(), create() {} },
  tabs: {
    onRemoved: eventSource(),
    onUpdated: eventSource(),
    onReplaced: eventSource(),
    hangTabs: new Set(),
    hangResolvers: [],
    async get(tabId) {
      if (this.hangTabs.has(tabId)) {
        await new Promise((resolve) => this.hangResolvers.push(resolve));
      }
      const tab = tabs.get(tabId);
      if (!tab) throw new Error(`No tab with id: ${tabId}.`);
      return tab;
    }
  },
  storage: {
    local: {
      failInstanceReads: false,
      instanceGates: null,
      get(key) {
        if (Array.isArray(key)) {
          if (this.failInstanceReads) return Promise.reject(new Error("storage unavailable"));
          if (this.instanceGates) {
            return new Promise((resolve) => this.instanceGates.push(() => resolve(Object.fromEntries(key.map((name) => [name, values[name]])))));
          }
          return Promise.resolve(Object.fromEntries(key.map((name) => [name, values[name]])));
        }
        return Promise.resolve(key ? { [key]: values[key] } : { ...values });
      },
      async set(next) { Object.assign(values, next); },
      async remove(key) { delete values[key]; }
    },
    // The main scenario runs "mid browser session": the mark is present, so
    // seeded tab bindings are trusted. Section 2b covers the fresh session.
    session: {
      marked: true,
      async get(key) { return this.marked ? { [key]: "marked" } : {}; },
      async set() { this.marked = true; }
    },
    onChanged: eventSource()
  }
};

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));
async function settle(times = 4) { for (let i = 0; i < times; i += 1) await tick(); }

const transport = globalThis.DacBridgeLoopbackTransport.create({ chrome: chromeMock, WebSocket: FakeWebSocket });
await settle();

const liveSockets = () => FakeWebSocket.instances.filter((socket) => socket.readyState !== FakeWebSocket.CLOSED);

// Exactly profile + the two workspaces on live provider tabs. The workspace
// whose tab sits on example.com gets NO socket — fail closed, not best-effort.
assert.equal(liveSockets().length, 3, `one profile socket + two workspace sockets (got ${liveSockets().length})`);

async function authenticate(socket) {
  if (socket.readyState !== FakeWebSocket.OPEN) socket.emit("open");
  await settle(2);
  const challenge = socket.sent.find((frame) => frame.type === "auth_challenge");
  assert.ok(challenge, "every seat challenges the host first — no seat skips the handshake");
  socket.emit("message", { data: JSON.stringify({ type: "auth_proof", proof: hostProofFor(token, challenge.nonce) }) });
  await settle(2);
  const auth = socket.sent.find((frame) => frame.type === "auth");
  assert.ok(auth, "the auth frame followed the verified proof");
  socket.emit("message", { data: JSON.stringify({ type: "auth_ok", session_id: `sess-${Math.random().toString(36).slice(2)}` }) });
  await settle(1);
  return auth;
}

const authFrames = [];
for (const socket of liveSockets()) authFrames.push(await authenticate(socket));
const identities = authFrames.map((frame) => ({ instance_id: frame.instance?.instance_id, label: frame.instance?.label, worker: frame.instance?.worker }));
assert.deepEqual(
  identities.sort((left, right) => String(left.instance_id).localeCompare(String(right.instance_id))),
  [
    { instance_id: "prof-abcd-0001", label: "kaito", worker: "duc-auto-chatgpt" },
    { instance_id: "ws-kichban-0001", label: "gpt-kichban", worker: "duc-auto-chatgpt" },
    { instance_id: "ws-research-0002", label: "gpt-research", worker: "duc-auto-chatgpt" }
  ],
  "each seat announces its OWN identity: the profile keeps its id+label, each workspace announces its workspace_id + name"
);

const socketByInstance = new Map();
for (const socket of liveSockets()) {
  const auth = socket.sent.find((frame) => frame.type === "auth");
  socketByInstance.set(auth.instance.instance_id, socket);
}

// -- executor wiring: a workspace rpc hands the panel the workspace ----------
function fakePort() {
  return { name: "dac.bridge.executor.v1", posted: [], onMessage: eventSource(), onDisconnect: eventSource(), postMessage(message) { this.posted.push(message); }, disconnect() {} };
}
const port = fakePort();
chromeMock.runtime.onConnect.emit(port);
port.onMessage.emit({ type: "DAC_BRIDGE_EXECUTOR_READY", protocol: core.PROTOCOL, version: 1, executor_epoch: "epoch-1" });
await settle(1);

const baseEnvelope = { protocol: core.PROTOCOL, version: 1, kind: "request", sent_at: "2026-09-03T10:00:00.000Z", client: { client_id: "workspace-test-cli", name: "Workspace Test", version: "1" } };

async function rpcThrough(socket, requestId) {
  const envelope = { ...baseEnvelope, request_id: requestId, method: "queue.list", params: {} };
  socket.emit("message", { data: JSON.stringify({ type: "rpc", relay_id: `relay-${requestId}`, envelope }) });
  await settle(1);
  const routed = port.posted.at(-1);
  assert.equal(routed?.type, "DAC_BRIDGE_RPC", "the rpc reached the executor port");
  assert.equal(routed.envelope.request_id, requestId);
  const response = core.successResponse(core.parseRequest(routed.envelope), { jobs: [], cursor: null });
  port.onMessage.emit({ type: "DAC_BRIDGE_RPC_RESPONSE", route_id: routed.route_id, envelope: response });
  await settle(1);
  const answered = socket.sent.find((frame) => frame.type === "rpc_response" && frame.relay_id === `relay-${requestId}`);
  assert.ok(answered, "the seat relayed the executor's answer back on its OWN socket");
  return routed;
}

const workspaceRouted = await rpcThrough(socketByInstance.get("ws-kichban-0001"), "wsreq-0001");
assert.deepEqual(workspaceRouted.workspace, { workspace_id: "ws-kichban-0001", name: "gpt-kichban", tab_id: 101 },
  "a workspace rpc carries the workspace on the PORT message so tab-scoped handlers bind to ITS tab");

const profileRouted = await rpcThrough(socketByInstance.get("prof-abcd-0001"), "profreq-0001");
assert.equal(profileRouted.workspace, undefined, "a profile rpc carries NO workspace — today's behavior, untouched");

// -- fail closed on tab death -------------------------------------------------
tabs.delete(101);
chromeMock.tabs.onRemoved.emit(101);
await settle(2);
assert.equal(socketByInstance.get("ws-kichban-0001").readyState, FakeWebSocket.CLOSED,
  "a closed tab drops the workspace's socket at once — the host answers TARGET_NOT_CONNECTED, the name never drifts to another tab");
assert.equal(socketByInstance.get("prof-abcd-0001").readyState, FakeWebSocket.OPEN, "the profile seat is untouched by a workspace tab dying");

// -- fail closed on navigation away, recover on navigation back ---------------
tabs.set(102, { id: 102, url: "https://example.com/gone" });
chromeMock.tabs.onUpdated.emit(102, { url: "https://example.com/gone" });
await settle(2);
assert.equal(socketByInstance.get("ws-research-0002").readyState, FakeWebSocket.CLOSED, "leaving ChatGPT drops the workspace socket");
const socketsBeforeReturn = FakeWebSocket.instances.length;
tabs.set(102, { id: 102, url: "https://chatgpt.com/c/two-again" });
chromeMock.tabs.onUpdated.emit(102, { url: "https://chatgpt.com/c/two-again" });
await settle(2);
assert.ok(FakeWebSocket.instances.length > socketsBeforeReturn, "returning to ChatGPT reconnects the seat");
const researchReturn = FakeWebSocket.instances.at(-1);
const researchAuth = await authenticate(researchReturn);
assert.equal(researchAuth.instance.instance_id, "ws-research-0002", "the reconnected seat keeps its identity");

// -- owner messages: upsert / remove / get ------------------------------------
function sendPanelMessage(message) {
  return new Promise((resolve) => { chromeMock.runtime.onMessage.emit(message, {}, resolve); });
}

// The cap counts RECORDS, not live sockets: 3 declared workspaces refuse a 4th
// even while one of them is off-provider with no socket.
const overCap = await sendPanelMessage({ type: "DAC_BRIDGE_WORKSPACE_UPSERT", name: "gpt-thu-tu", tab_id: 104 });
assert.deepEqual({ ok: overCap.ok, code: overCap.code }, { ok: false, code: "WORKSPACE_LIMIT" });

const removed = await sendPanelMessage({ type: "DAC_BRIDGE_WORKSPACE_REMOVE", workspace_id: "ws-offsite-0003" });
assert.equal(removed.ok, true);
assert.equal(values[wsCore.STORAGE_KEY].workspaces.length, 2, "removal persists");

const badTab = await sendPanelMessage({ type: "DAC_BRIDGE_WORKSPACE_UPSERT", name: "gpt-sai-tab", tab_id: 103 });
assert.deepEqual({ ok: badTab.ok, code: badTab.code }, { ok: false, code: "WORKSPACE_TAB_INVALID" }, "a workspace may only be born onto a live provider tab");

const dupName = await sendPanelMessage({ type: "DAC_BRIDGE_WORKSPACE_UPSERT", name: "GPT-RESEARCH", tab_id: 105 });
assert.deepEqual({ ok: dupName.ok, code: dupName.code }, { ok: false, code: "WORKSPACE_NAME_TAKEN" });

const created = await sendPanelMessage({ type: "DAC_BRIDGE_WORKSPACE_UPSERT", name: "gpt-hopdong", tab_id: 104 });
assert.equal(created.ok, true);
assert.equal(values[wsCore.STORAGE_KEY].workspaces.length, 3, "creation persists");
await settle(2);
const hopdongSocket = FakeWebSocket.instances.at(-1);
const hopdongAuth = await authenticate(hopdongSocket);
assert.equal(hopdongAuth.instance.label, "gpt-hopdong", "a new workspace announces IMMEDIATELY — no host restart, no extension reload");
assert.equal(hopdongAuth.instance.instance_id, created.workspace.workspace_id);

// Rename cycles the seat so the new name announces immediately (same owner
// promise as the profile's Lưu tên button).
const renamedLive = await sendPanelMessage({ type: "DAC_BRIDGE_WORKSPACE_UPSERT", workspace_id: created.workspace.workspace_id, name: "gpt-hopdong-vip", tab_id: 104 });
assert.equal(renamedLive.ok, true);
await settle(2);
assert.equal(hopdongSocket.readyState, FakeWebSocket.CLOSED, "rename retires the old socket");
const renamedSocket = FakeWebSocket.instances.at(-1);
const renamedAuth = await authenticate(renamedSocket);
assert.deepEqual({ id: renamedAuth.instance.instance_id, label: renamedAuth.instance.label },
  { id: created.workspace.workspace_id, label: "gpt-hopdong-vip" },
  "the renamed seat keeps its instance_id and announces the new label at once");

const listed = await sendPanelMessage({ type: "DAC_BRIDGE_WORKSPACES_GET" });
assert.equal(listed.ok, true);
assert.deepEqual(listed.seats.map((seat) => [seat.name, seat.state, seat.tab_alive]).sort(),
  [["gpt-hopdong-vip", "connected", true], ["gpt-kichban", "disconnected", false], ["gpt-research", "connected", true]],
  "the listing tells the owner which seat is live and which tab is gone");

const removedLive = await sendPanelMessage({ type: "DAC_BRIDGE_WORKSPACE_REMOVE", workspace_id: created.workspace.workspace_id });
assert.equal(removedLive.ok, true);
await settle(1);
assert.equal(renamedSocket.readyState, FakeWebSocket.CLOSED, "removing a workspace closes its socket at once");

// -- the inherited handshake gates hold on workspace seats ---------------------
const premature = await sendPanelMessage({ type: "DAC_BRIDGE_WORKSPACE_UPSERT", name: "gpt-som", tab_id: 105 });
assert.equal(premature.ok, true);
await settle(2);
const prematureSocket = FakeWebSocket.instances.at(-1);
prematureSocket.emit("open");
await settle(1);
prematureSocket.emit("message", { data: JSON.stringify({ type: "auth_ok", session_id: "truoc-han" }) });
await settle(1);
assert.equal(prematureSocket.readyState, FakeWebSocket.CLOSED, "auth_ok before the handshake finished closes a workspace seat fail-closed — same law as the profile seat");
assert.equal(prematureSocket.sent.some((frame) => frame.type === "auth"), false, "the token never left the socket");

// -- a workspace seat that cannot read its identity never authenticates --------
// The profile seat degrades to a legacy (no-instance) auth on a storage
// failure; a workspace seat must NOT: an anonymous extra seat would poison the
// very ambiguity rules it exists to serve. Fail closed, try again next cycle.
const renameCycle = await sendPanelMessage({ type: "DAC_BRIDGE_WORKSPACE_UPSERT", workspace_id: premature.workspace.workspace_id, name: "gpt-som-2", tab_id: 105 });
assert.equal(renameCycle.ok, true);
await settle(2);
const blindSocket = FakeWebSocket.instances.at(-1);
chromeMock.storage.local.failInstanceReads = true;
blindSocket.emit("open");
await settle(1);
const blindChallenge = blindSocket.sent.find((frame) => frame.type === "auth_challenge");
blindSocket.emit("message", { data: JSON.stringify({ type: "auth_proof", proof: hostProofFor(token, blindChallenge.nonce) }) });
await settle(2);
chromeMock.storage.local.failInstanceReads = false;
assert.equal(blindSocket.readyState, FakeWebSocket.CLOSED, "no identity, no seat: the workspace socket is abandoned fail-closed");
assert.equal(blindSocket.sent.some((frame) => frame.type === "auth"), false, "the token never left the socket as an anonymous auth");

// -- onReplaced: Chrome swapping a tab id (prerender activation) drops the seat
const researchLive = FakeWebSocket.instances.filter((socket) => socket.readyState !== FakeWebSocket.CLOSED)
  .find((socket) => socket.sent.some((frame) => frame.type === "auth" && frame.instance?.instance_id === "ws-research-0002"));
assert.ok(researchLive, "gpt-research holds a live socket before the swap");
chromeMock.tabs.onReplaced.emit(777, 102);
await settle(2);
assert.equal(researchLive.readyState, FakeWebSocket.CLOSED,
  "onReplaced retires the seat: its recorded tab id names no tab anymore, so the name must stop answering (audit 03/09)");

// -- pairing rollover: the NEW token must never reach a host that proved the OLD
// The exact audit interleaving: workspaceWork is wedged (a listing stuck in
// tabs.get), one workspace socket sits mid-handshake with its identity read
// gated, and the owner swaps pairing. The fix under pin: the pairing handlers
// close every workspace socket IN THE SAME synchronous block as the swap —
// a merely QUEUED close would sit behind the wedge while the old socket
// resumes and reads the fresh token. (The pairingAtProof epoch re-check in the
// proof handler is belt-and-braces behind this and static-only: with the
// synchronous close in place no interleaving can reach it.)
chromeMock.alarms.onAlarm.emit({ name: globalThis.DacBridgeLoopbackTransport.RECONNECT_ALARM });
await settle(2);
const somSocket = FakeWebSocket.instances.at(-1);
assert.equal(somSocket.readyState, FakeWebSocket.CONNECTING, "the som seat is reconnecting via the alarm");
somSocket.emit("open");
await settle(1);
const somChallenge = somSocket.sent.find((frame) => frame.type === "auth_challenge");
chromeMock.tabs.hangTabs.add(105);
const wedgedListing = sendPanelMessage({ type: "DAC_BRIDGE_WORKSPACES_GET" });
await settle(1);
chromeMock.storage.local.instanceGates = [];
somSocket.emit("message", { data: JSON.stringify({ type: "auth_proof", proof: hostProofFor(token, somChallenge.nonce) }) });
await settle(1);
assert.equal(chromeMock.storage.local.instanceGates.length, 1, "the proof continuation is parked on its identity read");
const tokenB = Buffer.alloc(32, 11).toString("base64url");
const pairingB = { ...pairing, token: tokenB };
const rolled = await sendPanelMessage({ type: "DAC_BRIDGE_PAIRING_SET", pairing: pairingB });
assert.equal(rolled.ok, true);
assert.equal(somSocket.readyState, FakeWebSocket.CLOSED,
  "the pairing swap closes workspace sockets SYNCHRONOUSLY — even with the workspace queue wedged");
const releaseIdentity = chromeMock.storage.local.instanceGates.shift();
chromeMock.storage.local.instanceGates = null;
releaseIdentity();
await settle(2);
assert.equal(somSocket.sent.some((frame) => frame.type === "auth"), false,
  "the resumed continuation never sends an auth frame: neither the old token nor the NEW one leaves on the old socket");
for (const release of chromeMock.tabs.hangResolvers.splice(0)) release();
chromeMock.tabs.hangTabs.clear();
await wedgedListing;
await settle(2);

// After the rollover, the queued reconnect brought the surviving seats back up
// under pairing B. Authenticate them so the next two pins act on LIVE seats.
const postRollSockets = FakeWebSocket.instances.filter((socket) => socket.readyState !== FakeWebSocket.CLOSED && socket.sent.length === 0);
const postRollByInstance = new Map();
for (const socket of postRollSockets) {
  socket.emit("open");
  await settle(2);
  const challenge = socket.sent.find((frame) => frame.type === "auth_challenge");
  socket.emit("message", { data: JSON.stringify({ type: "auth_proof", proof: hostProofFor(tokenB, challenge.nonce) }) });
  await settle(2);
  const auth = socket.sent.find((frame) => frame.type === "auth");
  if (auth?.instance) postRollByInstance.set(auth.instance.label, socket);
  socket.emit("message", { data: JSON.stringify({ type: "auth_ok", session_id: `roll-${Math.random().toString(36).slice(2)}` }) });
  await settle(1);
}

// -- onReplaced (and onRemoved) close seats SYNCHRONOUSLY, never via the queue.
// A close parked behind a wedged workspace queue leaves the dead tab's seat
// authenticated for as long as the wedge lasts (audit 03/09 round 2, HIGH).
const researchRolled = postRollByInstance.get("gpt-research");
assert.ok(researchRolled && researchRolled.readyState === FakeWebSocket.OPEN, "gpt-research is live under the new pairing");
chromeMock.tabs.hangTabs.add(105);
const wedgeForReplace = sendPanelMessage({ type: "DAC_BRIDGE_WORKSPACES_GET" });
await settle(1);
chromeMock.tabs.onReplaced.emit(888, 102);
assert.equal(researchRolled.readyState, FakeWebSocket.CLOSED,
  "the swapped-out tab's seat closes IMMEDIATELY, wedged queue or not");
for (const release of chromeMock.tabs.hangResolvers.splice(0)) release();
chromeMock.tabs.hangTabs.clear();
await wedgeForReplace;
await settle(2);

// -- loadPairing() with a pairing that CHANGED on disk is a rollover too:
// seats of the old pairing close in the same synchronous block as the swap.
const somRolled = postRollByInstance.get("gpt-som-2");
assert.ok(somRolled && somRolled.readyState === FakeWebSocket.OPEN, "gpt-som-2 is live under pairing B");
const tokenC = Buffer.alloc(32, 13).toString("base64url");
values[pairingCore.PAIRING_STORAGE_KEY] = { ...pairing, token: tokenC };
await transport.loadPairing();
assert.equal(somRolled.readyState, FakeWebSocket.CLOSED,
  "a pairing changed on disk closes every workspace seat before loadPairing() returns — no old-pairing seat keeps serving");
await settle(2);

// ---------------------------------------------------------------------------
// 2b. Fresh browser session: stored tab ids are strangers now
// ---------------------------------------------------------------------------
// Chrome tab ids are unique only within one browser session. A fresh transport
// with NO session mark must void every stored binding (names survive, sockets
// do not) and let the owner re-attach; a service-worker restart in the SAME
// browser session (mark present) must keep bindings. A hostile record whose
// workspace_id equals the profile's instance_id must never authenticate.
function freshHarness({ sessionValues, localValues, tabRows }) {
  const local = { ...localValues };
  const session = { ...sessionValues };
  const rows = new Map(tabRows);
  const mock = {
    runtime: { id: "b".repeat(32), onConnect: eventSource(), onMessage: eventSource(), getManifest: () => ({ version: "0.3.0" }) },
    alarms: { onAlarm: eventSource(), create() {} },
    tabs: {
      onRemoved: eventSource(),
      onUpdated: eventSource(),
      onReplaced: eventSource(),
      async get(tabId) {
        const tab = rows.get(tabId);
        if (!tab) throw new Error(`No tab with id: ${tabId}.`);
        return tab;
      }
    },
    storage: {
      local: {
        instanceGates: null,
        failSetKeys: new Set(),
        get(key) {
          if (Array.isArray(key)) {
            if (this.instanceGates) {
              return new Promise((resolve) => this.instanceGates.push(() => resolve(Object.fromEntries(key.map((name) => [name, local[name]])))));
            }
            return Promise.resolve(Object.fromEntries(key.map((name) => [name, local[name]])));
          }
          return Promise.resolve(key ? { [key]: local[key] } : { ...local });
        },
        async set(next) {
          for (const key of Object.keys(next)) {
            if (this.failSetKeys.has(key)) { this.failSetKeys.delete(key); throw new Error("storage write failed"); }
          }
          Object.assign(local, next);
        },
        async remove(key) { delete local[key]; }
      },
      onChanged: eventSource()
    }
  };
  if (sessionValues !== null) {
    mock.storage.session = {
      async get(key) { return { [key]: session[key] }; },
      async set(next) { Object.assign(session, next); }
    };
  }
  return { mock, local, session, rows };
}

const SESSION_MARK = "dac.bridge.workspaces.session_mark.v1";
const freshLocal = {
  [pairingCore.PAIRING_STORAGE_KEY]: pairing,
  "dac.bridge.instance.v1": { schema_version: 1, instance_id: "prof-fresh-0001", created_at: "2026-09-01T00:00:00.000Z" },
  [wsCore.STORAGE_KEY]: {
    schema_version: 1,
    workspaces: [{ workspace_id: "ws-fresh-0001", name: "gpt-kichban", tab_id: 201, created_at: "2026-09-03T00:00:00.000Z" }]
  }
};
const freshTabs = [[201, { id: 201, url: "https://chatgpt.com/c/fresh" }], [202, { id: 202, url: "https://chatgpt.com/c/hostile" }]];

const boot1 = freshHarness({ sessionValues: {}, localValues: freshLocal, tabRows: freshTabs });
const socketsBeforeBoot1 = FakeWebSocket.instances.length;
globalThis.DacBridgeLoopbackTransport.create({ chrome: boot1.mock, WebSocket: FakeWebSocket });
await settle(3);
assert.equal(boot1.local[wsCore.STORAGE_KEY].workspaces[0].tab_id, null,
  "a fresh browser session voids the stored tab binding — id 201 may belong to a stranger's tab now");
assert.ok(boot1.session[SESSION_MARK], "the session mark is planted for the rest of this browser session");
const boot1Sockets = FakeWebSocket.instances.slice(socketsBeforeBoot1);
assert.equal(boot1Sockets.length, 1, "only the profile connects; the unbound workspace holds NO socket");

// Re-attach: upserting the SAME workspace_id onto a live tab reconnects it
// with its old identity — the recovery path the panel offers as one click.
const reattach = await new Promise((resolve) => boot1.mock.runtime.onMessage.emit({ type: "DAC_BRIDGE_WORKSPACE_UPSERT", workspace_id: "ws-fresh-0001", name: "gpt-kichban", tab_id: 201 }, {}, resolve));
assert.equal(reattach.ok, true);
await settle(2);
const reattachedSocket = FakeWebSocket.instances.at(-1);
{
  reattachedSocket.emit("open");
  await settle(2);
  const challenge = reattachedSocket.sent.find((frame) => frame.type === "auth_challenge");
  reattachedSocket.emit("message", { data: JSON.stringify({ type: "auth_proof", proof: hostProofFor(token, challenge.nonce) }) });
  await settle(2);
  const auth = reattachedSocket.sent.find((frame) => frame.type === "auth");
  assert.equal(auth?.instance?.instance_id, "ws-fresh-0001", "the re-attached seat keeps its identity");
}

// Same browser session, service worker restarts, plus a HOSTILE record that
// impersonates the profile id: bindings survive, the impostor never auths.
boot1.local[wsCore.STORAGE_KEY] = {
  schema_version: 1,
  workspaces: [
    ...boot1.local[wsCore.STORAGE_KEY].workspaces,
    { workspace_id: "prof-fresh-0001", name: "gia-mao", tab_id: 202, created_at: "2026-09-03T00:00:00.000Z" }
  ]
};
const boot2 = freshHarness({ sessionValues: boot1.session, localValues: boot1.local, tabRows: freshTabs });
const socketsBeforeBoot2 = FakeWebSocket.instances.length;
globalThis.DacBridgeLoopbackTransport.create({ chrome: boot2.mock, WebSocket: FakeWebSocket });
await settle(3);
assert.equal(boot2.local[wsCore.STORAGE_KEY].workspaces[0].tab_id, 201,
  "a service-worker restart in the SAME browser session keeps the binding — voiding is for browser restarts only");
const boot2Sockets = FakeWebSocket.instances.slice(socketsBeforeBoot2);
assert.equal(boot2Sockets.length, 3, "profile + legitimate workspace + the impostor's socket attempt");
for (const socket of boot2Sockets) {
  socket.emit("open");
  await settle(2);
  const challenge = socket.sent.find((frame) => frame.type === "auth_challenge");
  socket.emit("message", { data: JSON.stringify({ type: "auth_proof", proof: hostProofFor(token, challenge.nonce) }) });
  await settle(2);
}
const boot2Announced = boot2Sockets.map((socket) => socket.sent.find((frame) => frame.type === "auth")?.instance?.instance_id).filter(Boolean).sort();
assert.deepEqual(boot2Announced, ["prof-fresh-0001", "ws-fresh-0001"],
  "exactly two identities authenticate; the impostor workspace derives NO identity and is refused");
const impostorSocket = boot2Sockets.find((socket) => !socket.sent.some((frame) => frame.type === "auth"));
assert.equal(impostorSocket.readyState, FakeWebSocket.CLOSED, "the impostor's socket is abandoned fail-closed");

// -- crash consistency: the mark is planted only AFTER the voided store lands.
// If voiding fails, no mark may exist — the next start must void again. The
// other order (mark first) would let a crash freeze stale bindings forever.
const crashLocal = {
  [pairingCore.PAIRING_STORAGE_KEY]: pairing,
  "dac.bridge.instance.v1": { schema_version: 1, instance_id: "prof-crash-0001", created_at: "2026-09-01T00:00:00.000Z" },
  [wsCore.STORAGE_KEY]: {
    schema_version: 1,
    workspaces: [{ workspace_id: "ws-crash-0001", name: "gpt-crash", tab_id: 211, created_at: "2026-09-03T00:00:00.000Z" }]
  }
};
const bootCrash = freshHarness({ sessionValues: {}, localValues: crashLocal, tabRows: [[211, { id: 211, url: "https://chatgpt.com/c/crash" }]] });
bootCrash.mock.storage.local.failSetKeys.add(wsCore.STORAGE_KEY);
globalThis.DacBridgeLoopbackTransport.create({ chrome: bootCrash.mock, WebSocket: FakeWebSocket });
await settle(3);
assert.equal(bootCrash.session[SESSION_MARK], undefined,
  "voiding failed, so NO mark was planted — the next start will void again instead of trusting stale bindings");
assert.equal(bootCrash.local[wsCore.STORAGE_KEY].workspaces[0].tab_id, 211, "the store itself is untouched by the failed write");

// -- no storage.session at all = no proof of same-session = fail closed.
// (Production always has the API — manifest requires Chrome 120, storage.session
// ships from 102 — so this is the harness/unknown-environment edge.)
const noSessionLocal = {
  [pairingCore.PAIRING_STORAGE_KEY]: pairing,
  "dac.bridge.instance.v1": { schema_version: 1, instance_id: "prof-nosess-0001", created_at: "2026-09-01T00:00:00.000Z" },
  [wsCore.STORAGE_KEY]: {
    schema_version: 1,
    workspaces: [{ workspace_id: "ws-nosess-0001", name: "gpt-nosess", tab_id: 221, created_at: "2026-09-03T00:00:00.000Z" }]
  }
};
const bootNoSession = freshHarness({ sessionValues: null, localValues: noSessionLocal, tabRows: [[221, { id: 221, url: "https://chatgpt.com/c/nosess" }]] });
const socketsBeforeNoSession = FakeWebSocket.instances.length;
globalThis.DacBridgeLoopbackTransport.create({ chrome: bootNoSession.mock, WebSocket: FakeWebSocket });
await settle(3);
assert.equal(bootNoSession.local[wsCore.STORAGE_KEY].workspaces[0].tab_id, null,
  "without a session mark to read, bindings are voided — fail closed, never trusted");
assert.equal(FakeWebSocket.instances.slice(socketsBeforeNoSession).length, 1, "only the profile connects");

// ---------------------------------------------------------------------------
// 2c. First-run identity is minted ONCE even with seats racing
// ---------------------------------------------------------------------------
// No instance record exists yet, and the profile seat and a workspace seat
// authenticate concurrently. The serialized identity read must mint ONE id:
// what the profile announces on the wire is what storage still holds after
// the dust settles. (Unserialized reads each minted their own id — the one
// persisted LAST silently replaced the announced identity at next reconnect.)
const raceLocal = {
  [pairingCore.PAIRING_STORAGE_KEY]: pairing,
  [wsCore.STORAGE_KEY]: {
    schema_version: 1,
    workspaces: [{ workspace_id: "ws-race-0001", name: "gpt-dua", tab_id: 301, created_at: "2026-09-03T00:00:00.000Z" }]
  }
};
const boot3 = freshHarness({ sessionValues: { [SESSION_MARK]: "already-marked" }, localValues: raceLocal, tabRows: [[301, { id: 301, url: "https://chatgpt.com/c/race" }]] });
const socketsBeforeBoot3 = FakeWebSocket.instances.length;
globalThis.DacBridgeLoopbackTransport.create({ chrome: boot3.mock, WebSocket: FakeWebSocket });
await settle(3);
const boot3Sockets = FakeWebSocket.instances.slice(socketsBeforeBoot3);
assert.equal(boot3Sockets.length, 2, "profile + workspace sockets exist");
boot3.mock.storage.local.instanceGates = [];
for (const socket of boot3Sockets) {
  socket.emit("open");
  await settle(1);
  const challenge = socket.sent.find((frame) => frame.type === "auth_challenge");
  socket.emit("message", { data: JSON.stringify({ type: "auth_proof", proof: hostProofFor(token, challenge.nonce) }) });
}
await settle(1);
// Both proofs are in flight. Release identity reads as they arrive; a
// serialized queue presents them one at a time.
for (let round = 0; round < 6 && (boot3.mock.storage.local.instanceGates.length || round < 2); round += 1) {
  const release = boot3.mock.storage.local.instanceGates.shift();
  if (release) release();
  await settle(1);
}
boot3.mock.storage.local.instanceGates = null;
await settle(2);
const profileAnnounced = boot3Sockets
  .map((socket) => socket.sent.find((frame) => frame.type === "auth")?.instance)
  .find((instance) => instance && instance.instance_id !== "ws-race-0001");
assert.ok(profileAnnounced, "the profile seat announced an identity");
assert.equal(boot3.local["dac.bridge.instance.v1"].instance_id, profileAnnounced.instance_id,
  "the id announced on the wire is the id persisted — first-run minting is single-writer");

// ---------------------------------------------------------------------------
// 3. Panel wiring (static: sidepanel.js needs chrome + DOM to execute)
// ---------------------------------------------------------------------------
const sidepanel = fs.readFileSync(path.join(here, "..", "sidepanel.js"), "utf8");
const codeOnly = sidepanel.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

// The workspace rides the PORT message into the dispatch context…
assert.match(codeOnly, /executor_epoch:\s*state\.bridgeExecutorEpoch,\s*workspace/, "the dispatcher receives the workspace from the port message");

// …and every tab-scoped handler resolves the workspace's OWN tab.
const resolverStart = codeOnly.indexOf("async function resolveWorkspaceTab");
assert.ok(resolverStart >= 0, "resolveWorkspaceTab exists");
const resolver = codeOnly.slice(resolverStart, resolverStart + codeOnly.slice(resolverStart).search(/^ {2}\}$/m) + 3);
assert.match(resolver, /RECEIVER_LOST/, "a workspace whose tab is gone refuses — never a silent fallback to the front tab");
assert.match(resolver, /isChatGPTTabUrl/, "the workspace tab must still be ON the provider");

function handlerBody(anchor) {
  const start = codeOnly.indexOf(anchor);
  assert.ok(start >= 0, `${anchor} exists`);
  return codeOnly.slice(start, start + codeOnly.slice(start).search(/^ {2}\}$/m) + 3);
}
assert.match(handlerBody("async function bridgeDomProbe"), /resolveWorkspaceTab\(call\)/, "dom_probe probes the workspace's tab");
assert.match(handlerBody("async function bridgeSystemPing"), /resolveWorkspaceTab\(call\)/, "system.ping reports on the workspace's tab");
assert.match(handlerBody("async function bridgeChatReload"), /performChatReload\(await resolveWorkspaceTab\(call\)\)/, "chat.reload reloads the workspace's tab");
assert.match(handlerBody("async function bridgeRunTrial"), /bindRunTab\(await resolveWorkspaceTab\(call\)\)/, "run.trial binds the run to the workspace's tab — the one-run-at-a-time lock is untouched");

// The transport must load the workspace module in production.
const background = fs.readFileSync(path.join(here, "..", "background.js"), "utf8");
assert.match(background, /importScripts\([^)]*"bridge-workspace-core\.js",\s*"bridge-transport-loopback\.js"\)/, "background loads workspace core BEFORE the transport");

console.log("bridge workspace seats smoke tests: PASS");
