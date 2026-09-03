/* The REAL stale-rpc race, on the REAL call chain (GPT audit vòng 6).

   Round 5 pinned the lease predicate and the wiring statically; the reviewer
   correctly insisted on a deterministic interleaving test through the actual
   sidepanel handlers. This harness executes sidepanel.js itself (vm context,
   stub DOM/chrome), parks chrome.tabs.get mid-resolver, re-attaches the
   workspace to another tab (the durable-store write the service worker
   performs), releases the park — and demands:

     - chat.reload with the stale tab-101 snapshot must NOT reload tab 101;
     - run.trial with the stale snapshot must NOT bind tab 101;
     - diagnostics.dom_probe must NOT message tab 101;
     - each refusal names the lease, not some downstream accident.

   The lease is checked LAST in resolveWorkspaceTab — after its tabs.get —
   so this exact interleaving (rebind lands while tabs.get is in flight) is
   caught. Mutations that gut the lease make every case here go red. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (name) => fs.readFileSync(path.join(here, "..", name), "utf8");

// ---------------------------------------------------------------------------
// Stub DOM: every element answers the calls sidepanel.js makes at load time.
// ---------------------------------------------------------------------------
function fakeClassList() {
  return { add() {}, remove() {}, toggle() {}, contains() { return false; } };
}
function fakeElement() {
  const element = {
    textContent: "", value: "", checked: false, hidden: false, disabled: false,
    indeterminate: false, title: "", placeholder: "", files: [],
    dataset: {}, style: { setProperty() {}, removeProperty() {} },
    classList: fakeClassList(),
    children: [],
    addEventListener() {}, removeEventListener() {},
    append() {}, appendChild() {}, prepend() {}, replaceChildren() {}, remove() {},
    setAttribute() {}, removeAttribute() {}, getAttribute() { return null; },
    closest() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; },
    focus() {}, blur() {}, click() {}, scrollIntoView() {},
    insertBefore() {}, contains() { return false; },
    getBoundingClientRect() { return { top: 0, left: 0, width: 0, height: 0 }; }
  };
  return element;
}
const documentStub = {
  getElementById: () => fakeElement(),
  createElement: () => fakeElement(),
  createDocumentFragment: () => fakeElement(),
  createTextNode: (text) => ({ textContent: String(text) }),
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener() {},
  removeEventListener() {},
  body: fakeElement(),
  documentElement: fakeElement(),
  execCommand() { return false; }
};

// ---------------------------------------------------------------------------
// Stub chrome: storage is the live lease store; tabs.get is parkable per id.
// ---------------------------------------------------------------------------
const WS_KEY = "dac.bridge.workspaces.v1";
const values = {
  [WS_KEY]: { schema_version: 1, workspaces: [{ workspace_id: "ws-race-0001", name: "gpt-dua", tab_id: 101, created_at: "2026-09-03T00:00:00.000Z" }] },
  "dac.bridge.dev_mode.v1": true
};
const tabs = new Map([
  [101, { id: 101, url: "https://chatgpt.com/c/cu" }],
  [102, { id: 102, url: "https://chatgpt.com/c/moi" }]
]);
const tabCalls = { reload: [], sendMessage: [] };
const parked = { tabs: new Set(), resolvers: [] };
function releasePark(tabId) {
  const index = parked.resolvers.findIndex((entry) => entry.tabId === tabId);
  if (index < 0) return false;
  const [entry] = parked.resolvers.splice(index, 1);
  entry.resolve();
  return true;
}

const chromeStub = {
  runtime: {
    id: "c".repeat(32),
    getManifest: () => ({ version: "0.3.0" }),
    connect: () => ({ postMessage() {}, disconnect() {}, onMessage: { addListener() {} }, onDisconnect: { addListener() {} } }),
    sendMessage: async (message) => {
      if (message?.type === "DAC_BRIDGE_WORKSPACES_GET") return { ok: true, seats: [] };
      if (message?.type === "DAC_BRIDGE_STATUS_GET") return { ok: true, status: { state: "disconnected", paired: false } };
      return { ok: true };
    },
    onMessage: { addListener() {} }
  },
  tabs: {
    async get(tabId) {
      if (parked.tabs.has(tabId)) await new Promise((resolve) => parked.resolvers.push({ tabId, resolve }));
      const tab = tabs.get(tabId);
      if (!tab) throw new Error(`No tab with id: ${tabId}.`);
      return tab;
    },
    async sendMessage(tabId, message) {
      tabCalls.sendMessage.push({ tabId, type: message?.type });
      if (message?.type === "DAC_PING") return { composerFound: true, sendUsable: true, generating: false, busy: false };
      if (message?.type === "DAC_DOM_PROBE") return { ok: true, probe: { marker: "probe-tab-" + tabId } };
      return { ok: true };
    },
    async query() { return []; },
    async reload(tabId) { tabCalls.reload.push(tabId); },
    onRemoved: { addListener() {} },
    onUpdated: { addListener() {} },
    onReplaced: { addListener() {} },
    onActivated: { addListener() {} }
  },
  storage: {
    local: {
      async get(key) {
        if (Array.isArray(key)) return Object.fromEntries(key.map((name) => [name, values[name]]));
        if (typeof key === "string") return { [key]: values[key] };
        return { ...values };
      },
      async set(next) { Object.assign(values, next); },
      async remove(key) { delete values[key]; }
    },
    session: {
      async get(key) { return { [key]: "marked" }; },
      async set() {}
    },
    onChanged: { addListener() {} }
  },
  alarms: {
    create() {}, clear() {},
    onAlarm: { addListener() {} }
  },
  downloads: { onDeterminingFilename: { addListener() {} }, onChanged: { addListener() {} } },
  sidePanel: {}
};

// ---------------------------------------------------------------------------
// Load the panel's scripts — same order as sidepanel.html — in one context.
// ---------------------------------------------------------------------------
const context = {
  console, TextEncoder, TextDecoder, URL, URLSearchParams, Date, Math, JSON,
  setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask,
  structuredClone, crypto: globalThis.crypto, performance,
  atob: (value) => Buffer.from(value, "base64").toString("binary"),
  btoa: (value) => Buffer.from(value, "binary").toString("base64"),
  document: documentStub,
  navigator: {},
  chrome: chromeStub,
  FileReader: class { readAsDataURL() {} },
  Blob: globalThis.Blob,
  requestAnimationFrame: (callback) => setTimeout(callback, 0),
  cancelAnimationFrame: (handle) => clearTimeout(handle)
};
context.window = context;
context.self = context;
context.globalThis = context;
vm.createContext(context);

const panelHtml = read("sidepanel.html");
const scriptOrder = [...panelHtml.matchAll(/<script src="([^"]+)"><\/script>/g)].map((match) => match[1]);
assert.ok(scriptOrder.includes("bridge-workspace-core.js") && scriptOrder.at(-1) === "sidepanel.js", "the panel loads workspace core and ends with sidepanel.js");
for (const name of scriptOrder) {
  vm.runInContext(read(name), context, { filename: name });
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 5));
await tick(); await tick();

const hooks = context.DacBridgeExecutorTestHooks;
assert.ok(hooks?.handlers, "the panel exposes its executor handlers for tests");

const staleCall = Object.freeze({
  request: { client: { client_id: "lease-race-cli" } },
  method: null,
  context: { workspace: { workspace_id: "ws-race-0001", name: "gpt-dua", tab_id: 101 } }
});

function rebindTo102() {
  values[WS_KEY] = { schema_version: 1, workspaces: [{ workspace_id: "ws-race-0001", name: "gpt-dua", tab_id: 102, created_at: "2026-09-03T00:00:00.000Z" }] };
}
function rebindTo101() {
  values[WS_KEY] = { schema_version: 1, workspaces: [{ workspace_id: "ws-race-0001", name: "gpt-dua", tab_id: 101, created_at: "2026-09-03T00:00:00.000Z" }] };
}

async function raceThrough(handlerName, params) {
  rebindTo101();
  parked.tabs.add(101);
  const inFlight = hooks.handlers[handlerName](params, staleCall);
  // Give the handler time to reach the parked tabs.get(101).
  await tick();
  assert.ok(parked.resolvers.some((entry) => entry.tabId === 101), `${handlerName} is parked inside tabs.get(101)`);
  // The owner re-attaches the workspace to tab 102 — the durable-store write
  // the service worker performs BEFORE cycling seats.
  rebindTo102();
  parked.tabs.delete(101);
  releasePark(101);
  let failure = null;
  try { await inFlight; } catch (error) { failure = error; }
  return failure;
}

// -- chat.reload: the stale snapshot must NOT reload tab 101 -----------------
{
  const failure = await raceThrough("chat.reload", {});
  assert.ok(failure, "the stale chat.reload is refused");
  assert.match(String(failure.message || failure), /không còn gắn vào tab này/, "refused BY THE LEASE, not by some downstream accident");
  assert.deepEqual(tabCalls.reload, [], "tab 101 was never reloaded");
}

// -- run.trial: the stale snapshot must NOT bind tab 101 ---------------------
{
  tabCalls.sendMessage.length = 0;
  const failure = await raceThrough("run.trial", { job_ids: ["job-0001"] });
  assert.ok(failure, "the stale run.trial is refused");
  assert.match(String(failure.message || failure), /không còn gắn vào tab này/, "refused by the lease before any binding");
  assert.deepEqual(tabCalls.sendMessage.filter((call) => call.tabId === 101), [], "nothing was ever sent to tab 101 — no bind, no validate");
}

// -- diagnostics.dom_probe: same race, read path -----------------------------
{
  tabCalls.sendMessage.length = 0;
  const failure = await raceThrough("diagnostics.dom_probe", {});
  assert.ok(failure, "the stale probe is refused");
  assert.match(String(failure.message || failure), /không còn gắn vào tab này/);
  assert.deepEqual(tabCalls.sendMessage, [], "tab 101 was never probed");
}

// -- control case: with the lease intact the same chain works ----------------
{
  rebindTo101();
  tabCalls.sendMessage.length = 0;
  const probe = await hooks.handlers["diagnostics.dom_probe"]({}, staleCall);
  assert.equal(probe.marker, "probe-tab-101", "an UN-raced workspace call flows through the same chain and acts on its own tab");
}

console.log("bridge workspace lease race smoke tests: PASS");
