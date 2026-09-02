/* Liveness and bounded recovery for this branch's transport.

   Ported from duc-auto-gemini via duc-auto-chatgpt, layered on top of THIS branch's handshake.
   This branch is the simple one: the identity is read BEFORE the socket exists and the auth frame
   goes out from the open handler, so there is no await inside the handshake for an early auth_ok
   to race. What it needs instead is a guard against two connect attempts overlapping, because the
   identity read happens before a socket can be claimed. */
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
for (const name of ["bridge-core.js", "bridge-pairing-core.js", "bridge-router-core.js", "bridge-transport-loopback.js"]) {
  await import(pathToFileURL(path.join(here, "..", name)));
}
const transport = globalThis.DacBridgeLoopbackTransport;
const PAIRING_KEY = globalThis.DacBridgePairingCore.PAIRING_STORAGE_KEY;
const STATUS_KEY = globalThis.DacBridgePairingCore.STATUS_STORAGE_KEY;
const FAR_FUTURE_MS = 300000;

function eventSource() {
  const listeners = [];
  return {
    addListener(listener) { listeners.push(listener); },
    emit(...args) { for (const listener of [...listeners]) listener(...args); }
  };
}

function fakeClock() {
  let now = 0;
  let nextId = 1;
  const tasks = new Map();
  function add(callback, delay, interval = 0) {
    const id = nextId++;
    tasks.set(id, { callback, due: now + Math.max(0, Number(delay) || 0), interval });
    return id;
  }
  return {
    setTimeout(callback, delay) { return add(callback, delay); },
    clearTimeout(id) { tasks.delete(id); },
    setInterval(callback, delay) { return add(callback, delay, Math.max(1, Number(delay) || 1)); },
    clearInterval(id) { tasks.delete(id); },
    advance(milliseconds) {
      const target = now + milliseconds;
      for (;;) {
        const next = [...tasks.entries()].filter(([, task]) => task.due <= target).sort((a, b) => a[1].due - b[1].due || a[0] - b[0])[0];
        if (!next) break;
        const [id, task] = next;
        now = task.due;
        if (task.interval) task.due += task.interval;
        else tasks.delete(id);
        task.callback();
      }
      now = target;
    },
    pending() { return tasks.size; }
  };
}

// `lingering` models the browser honestly: close() reaches CLOSING and the close event only
// arrives when the peer gets round to it -- or never. The instant-close fake hides that window.
function makeSocketClass({ lingering }) {
  return class Socket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    static instances = [];
    constructor(url) {
      this.url = url;
      this.readyState = Socket.CONNECTING;
      this.listeners = new Map();
      this.sent = [];
      Socket.instances.push(this);
    }
    addEventListener(name, listener) {
      const list = this.listeners.get(name) || [];
      list.push(listener);
      this.listeners.set(name, list);
    }
    emit(name, value = {}) {
      if (name === "open") this.readyState = Socket.OPEN;
      for (const listener of this.listeners.get(name) || []) listener(value);
    }
    send(value) { this.sent.push(JSON.parse(value)); }
    close(code = 1000, reason = "") {
      if (this.readyState === Socket.CLOSED || this.readyState === Socket.CLOSING) return;
      this.closeCode = code;
      this.closeReason = reason;
      if (lingering) { this.readyState = Socket.CLOSING; return; }
      this.readyState = Socket.CLOSED;
      this.emit("close", { code, reason });
    }
    finishClose() {
      this.readyState = Socket.CLOSED;
      this.emit("close", { code: this.closeCode ?? 1000, reason: this.closeReason ?? "" });
    }
  };
}

function makeChrome(store, gate = null) {
  return {
    runtime: {
      id: "a".repeat(32),
      onConnect: eventSource(),
      onMessage: eventSource(),
      getManifest: () => ({ version: "0.1.0" })
    },
    alarms: { onAlarm: eventSource(), create() {} },
    storage: {
      local: {
        get(key) {
          if (Array.isArray(key)) {
            const out = {};
            for (const one of key) if (one in store) out[one] = store[one];
            // The instance read is the only array read, and on this branch it sits BEFORE the
            // socket is created -- the window the in-flight guard exists to cover.
            if (gate && gate.hold) {
              return new Promise((resolve) => {
                gate.parked = gate.parked || [];
                gate.parked.push(() => resolve(out));
              });
            }
            return Promise.resolve(out);
          }
          return Promise.resolve({ [key]: store[key] });
        },
        async set(next) { Object.assign(store, next); },
        async remove(key) { delete store[key]; }
      }
    }
  };
}

const token = Buffer.alloc(32, 19).toString("base64url");
const pairing = {
  schema_version: 1,
  host: "127.0.0.1",
  port: 32149,
  http_url: "http://127.0.0.1:32149/v1/rpc",
  websocket_url: "ws://127.0.0.1:32149/v1/extension",
  token
};

const settle = async (times = 4) => {
  for (let index = 0; index < times; index += 1) await new Promise((resolve) => setImmediate(resolve));
};

/* Advancing the clock is not enough to see a new socket on this branch: connectHost reads the
   identity first, so the socket appears a few microtasks after the timer fires. Every place a
   retry is expected therefore advances AND settles. */
const advance = async (clock, ms) => {
  clock.advance(ms);
  await settle();
};

async function authenticate(sock, sessionId) {
  sock.emit("open");
  const auth = sock.sent.at(-1);
  assert.equal(auth.type, "auth", "this branch sends its auth frame straight from the open handler");
  assert.equal(auth.instance.worker, "duc-auto-gg-flow-video", "and it still carries the multi-profile identity");
  sock.emit("message", { data: JSON.stringify({ type: "auth_ok", session_id: sessionId }) });
  await settle();
}

function newInstance({ lingering = false, gate = null, ...overrides } = {}) {
  const clock = fakeClock();
  const store = { [PAIRING_KEY]: pairing };
  const chrome = makeChrome(store, gate);
  const Socket = makeSocketClass({ lingering });
  const handle = transport.create({
    chrome,
    WebSocket: Socket,
    timers: clock,
    keepalive_ms: 20,
    keepalive_ack_timeout_ms: 5,
    handshake_timeout_ms: 1000,
    reconnect_delays_ms: [3],
    ...overrides
  });
  return { clock, store, chrome, Socket, handle };
}

// ---------------------------------------------------------------------------
// The bounds are declared in code, not merely in a comment.
// ---------------------------------------------------------------------------
assert.equal(transport.RECONNECT_CEILING_MS, 5000, "bounded reconnect never waits longer than the five-second ceiling");
assert.ok(transport.RECONNECT_DELAYS_MS.every((delay) => delay > 0 && delay <= transport.RECONNECT_CEILING_MS),
  "every default rung stays inside the ceiling");
assert.ok(transport.KEEPALIVE_ACK_TIMEOUT_MS < transport.KEEPALIVE_MS,
  "the ACK deadline resolves before the next probe is sent");
assert.ok(transport.RECONNECT_WINDOW_MS > transport.RECONNECT_CEILING_MS,
  "the give-up window spans several rungs rather than cutting the ladder off at once");

// ---------------------------------------------------------------------------
// A probe that goes unanswered means the socket is half-open.
// ---------------------------------------------------------------------------
{
  const { clock, Socket, handle } = newInstance();
  await settle();
  const first = Socket.instances[0];
  await authenticate(first, "session-1");
  assert.equal(handle.status().state, "connected");

  await advance(clock, 20);
  assert.equal(first.sent.at(-1).type, "keepalive", "an authenticated transport sends its liveness probe");
  await advance(clock, 5);
  assert.equal(first.readyState, Socket.CLOSED, "a missing keepalive ACK closes a half-open socket");
  await advance(clock, 3);
  assert.equal(Socket.instances.length, 2, "the bounded reconnect does not wait for the 30-second alarm");

  const second = Socket.instances[1];
  await authenticate(second, "session-2");
  await advance(clock, 20);
  second.emit("message", { data: JSON.stringify({ type: "keepalive_ack" }) });
  await settle();
  await advance(clock, 5);
  assert.equal(second.readyState, Socket.OPEN, "a timely ACK preserves the healthy socket");
  assert.equal(second.url.includes(token), false, "the token is never placed in the WebSocket URL");
  assert.equal(JSON.stringify(second.sent.filter((m) => m.type === "keepalive")).includes(token), false,
    "keepalive frames carry no token");
}

// ---------------------------------------------------------------------------
// THIS branch's invariant: the identity read happens before a socket can be
// claimed, so two overlapping connect attempts would open two sockets.
// ---------------------------------------------------------------------------
{
  const gate = { hold: true, release: null };
  const { clock, chrome, Socket } = newInstance({ gate });
  await settle();
  assert.equal(Socket.instances.length, 0, "no socket yet: the identity read is parked");
  assert.ok(gate.parked && gate.parked.length === 1, "and it really is parked");

  // Everything that could start a second attempt fires while the first is still deciding.
  chrome.alarms.onAlarm.emit({ name: transport.RECONNECT_ALARM });
  chrome.alarms.onAlarm.emit({ name: transport.RECONNECT_ALARM });
  await advance(clock, FAR_FUTURE_MS);
  await settle();
  assert.equal(Socket.instances.length, 0, "no attempt slips past the in-flight guard");
  assert.equal(gate.parked.length, 1, "and only ONE identity read was ever started, not one per attempt");

  gate.hold = false;
  for (const release of gate.parked) release();
  await settle();
  assert.equal(
    Socket.instances.length,
    1,
    "so when the read lands exactly one socket is opened -- without the guard each overlapping attempt would open its own"
  );
}

// ---------------------------------------------------------------------------
// Ownership is given up when we judge a socket dead, not when the browser
// finishes closing it -- a CLOSING socket may never emit close.
// ---------------------------------------------------------------------------
{
  const { clock, store, chrome, Socket, handle } = newInstance({ lingering: true });
  await settle();
  const lingering = Socket.instances[0];
  await authenticate(lingering, "linger-1");

  await advance(clock, 20);
  await advance(clock, 5);
  await settle();
  assert.equal(lingering.readyState, Socket.CLOSING, "a browser socket sits in CLOSING after close() is requested");
  assert.equal(handle.status().state, "disconnected",
    "status stops claiming connected the moment the probe is judged unanswered");
  assert.equal(store[STATUS_KEY].state, "disconnected", "and the published status says the same");
  assert.equal(clock.pending(), 1, "its liveness timers are gone and only recovery is armed");

  chrome.alarms.onAlarm.emit({ name: transport.RECONNECT_ALARM });
  await settle();
  assert.equal(Socket.instances.length, 2, "the alarm rescues a socket stuck in CLOSING");
  lingering.finishClose();
  await settle();
  assert.equal(Socket.instances.length, 2, "a superseded socket's late close event does not open another");
}

// ---------------------------------------------------------------------------
// The handshake deadline covers a socket that never opens and one that opens
// and is never answered. The alarm rescues neither.
// ---------------------------------------------------------------------------
{
  const { clock, chrome, Socket } = newInstance({ lingering: true });
  await settle();

  const mute = Socket.instances[0];
  chrome.alarms.onAlarm.emit({ name: transport.RECONNECT_ALARM });
  await settle();
  assert.equal(Socket.instances.length, 1,
    "the alarm cannot replace a CONNECTING socket, which is why the handshake needs its own deadline");
  await advance(clock, 1000);
  await settle();
  assert.equal(mute.readyState, Socket.CLOSING, "the handshake deadline gives up on a socket that never opens");
  await advance(clock, 3);
  assert.equal(Socket.instances.length, 2, "and the bounded reconnect follows without any close event");

  const unanswered = Socket.instances[1];
  unanswered.emit("open");
  assert.equal(unanswered.sent.at(-1).type, "auth", "we did send our auth frame");
  await advance(clock, 1000);
  await settle();
  assert.equal(unanswered.readyState, Socket.CLOSING,
    "the deadline covers a socket that opened and was never answered too");
}

// ---------------------------------------------------------------------------
// auth_ok counts once, and only from a socket that is genuinely open.
// ---------------------------------------------------------------------------
{
  const { clock, store, Socket } = newInstance({ lingering: true });
  await settle();
  const live = Socket.instances[0];
  await authenticate(live, "repeat-1");

  await advance(clock, 15);
  live.emit("message", { data: JSON.stringify({ type: "auth_ok", session_id: "repeat-1-again" }) });
  await settle();
  assert.equal(live.readyState, Socket.CLOSING, "a repeated auth_ok is a protocol violation and fails closed");
  assert.equal(store[STATUS_KEY].state, "disconnected",
    "ownership is given up at once, not left reporting connected for the whole CLOSING window");
  assert.equal(clock.pending(), 1, "only recovery stays armed");
  await advance(clock, 3);
  assert.equal(Socket.instances.length, 2, "and the bounded reconnect recovers without a close event");
}

// ---------------------------------------------------------------------------
// Replacing a socket takes all of its timers, and its authentication, with it.
// ---------------------------------------------------------------------------
{
  const { clock, Socket, handle } = newInstance({ lingering: true });
  await settle();
  const first = Socket.instances[0];
  await authenticate(first, "slot-1");
  await advance(clock, 20);
  assert.equal(clock.pending(), 2, "keepalive interval plus ACK deadline");

  first.close();
  await handle.connectHost();
  assert.equal(Socket.instances.length, 2, "a CLOSING socket is replaceable on purpose");
  assert.equal(clock.pending(), 1,
    "the replacement inherits none of the old socket's timers: only its own handshake deadline");
  assert.equal(handle.status().state, "connecting",
    "and none of its authentication either");

  const replacement = Socket.instances[1];
  replacement.emit("open");
  const preAuth = {
    protocol: globalThis.DacBridgeCore.PROTOCOL, version: 1, kind: "request",
    request_id: "liveness-preauth-0001", method: "queue.list",
    sent_at: "2026-09-02T00:00:00.000Z", client: { client_id: "test", name: "Test", version: "1" }, params: {}
  };
  replacement.emit("message", { data: JSON.stringify({ type: "rpc", relay_id: "r1", envelope: preAuth }) });
  await settle();
  assert.equal(replacement.readyState, Socket.CLOSING, "a pre-auth RPC on the replacement fails closed");
  assert.equal(replacement.sent.some((message) => message.type === "rpc_response"), false, "and is never routed");
}

// ---------------------------------------------------------------------------
// A protocol violation gives up ownership at once, CLOSING window included.
// ---------------------------------------------------------------------------
{
  const { clock, store, Socket } = newInstance({ lingering: true });
  await settle();
  const rude = Socket.instances[0];
  await authenticate(rude, "rude-1");
  rude.emit("message", { data: JSON.stringify({ type: "not-a-known-frame" }) });
  await settle();
  assert.equal(rude.readyState, Socket.CLOSING, "an unsupported frame fails closed");
  assert.equal(store[STATUS_KEY].state, "disconnected",
    "and ownership is given up at once instead of reporting connected for the whole CLOSING window");
  await advance(clock, 3);
  assert.equal(Socket.instances.length, 2, "recovery follows without a close event");
}

// ---------------------------------------------------------------------------
// A peer-initiated close whose event never arrives is still noticed.
// ---------------------------------------------------------------------------
{
  const { clock, store, Socket, handle } = newInstance({ lingering: true });
  await settle();
  const silent = Socket.instances[0];
  await authenticate(silent, "silent-1");
  assert.equal(handle.status().state, "connected");

  silent.close();
  assert.notEqual(handle.status().state, "connected",
    "being authenticated is not the same as being connected: a socket that is no longer OPEN is not");
  await advance(clock, 20);
  await settle();
  assert.equal(store[STATUS_KEY].state, "disconnected",
    "the next probe tick notices the socket is no longer open and gives up ownership");
  await advance(clock, 3);
  assert.equal(Socket.instances.length, 2, "recovery happens within one probe period, with no close event at all");
}

// ---------------------------------------------------------------------------
// A flapping host is backed off, and only a completed round trip resets the ladder.
// ---------------------------------------------------------------------------
{
  const { clock, Socket } = newInstance({ reconnect_delays_ms: [3, 7, 11] });
  await settle();

  async function measureReconnectDelay() {
    const before = Socket.instances.length;
    let waited = 0;
    while (Socket.instances.length === before && waited < 200) {
      await advance(clock, 1);
      waited += 1;
    }
    assert.ok(Socket.instances.length > before, "a dropped connection is always retried");
    return waited;
  }

  async function authenticateThenDrop(label) {
    const sock = Socket.instances.at(-1);
    await authenticate(sock, label);
    sock.close();
  }

  await authenticateThenDrop("flap-1");
  assert.equal(await measureReconnectDelay(), 3, "the first retry after an outage uses the first rung");
  await authenticateThenDrop("flap-2");
  assert.equal(await measureReconnectDelay(), 7, "a host that authenticates then drops climbs the ladder");
  await authenticateThenDrop("flap-3");
  assert.equal(await measureReconnectDelay(), 11, "the ladder keeps climbing while the link keeps failing");

  const proven = Socket.instances.at(-1);
  await authenticate(proven, "proven");
  await advance(clock, 20);
  proven.emit("message", { data: JSON.stringify({ type: "keepalive_ack" }) });
  await settle();
  proven.close();
  assert.equal(await measureReconnectDelay(), 3, "an answered probe, not a bare auth_ok, is what resets the ladder");
}

// ---------------------------------------------------------------------------
// The ladder gives up, an unsolicited ACK refills nothing, and the alarm remains.
// ---------------------------------------------------------------------------
{
  const { clock, chrome, Socket } = newInstance({ reconnect_delays_ms: [5], reconnect_window_ms: 20 });
  await settle();

  Socket.instances.at(-1).close();
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const before = Socket.instances.length;
    await advance(clock, 5);
    if (Socket.instances.length > before) Socket.instances.at(-1).close();
  }
  assert.equal(Socket.instances.length, 5,
    "the ladder spends its window on four retries and then stops chasing a dead host");
  await advance(clock, FAR_FUTURE_MS);
  assert.equal(Socket.instances.length, 5, "and it stays stopped, so the worker is not held awake");

  chrome.alarms.onAlarm.emit({ name: transport.RECONNECT_ALARM });
  await settle();
  assert.equal(Socket.instances.length, 6, "the 30-second alarm is still the fallback once the ladder gives up");

  const revived = Socket.instances.at(-1);
  await authenticate(revived, "revived");
  revived.emit("message", { data: JSON.stringify({ type: "keepalive_ack" }) });
  await settle();
  revived.close();
  const socketsAfterUnsolicited = Socket.instances.length;
  await advance(clock, FAR_FUTURE_MS);
  assert.equal(Socket.instances.length, socketsAfterUnsolicited,
    "an unsolicited ACK answers no outstanding probe, so it does not refill a spent budget");
}

// ---------------------------------------------------------------------------
// The give-up window charges every wait it schedules, not just the gaps between attempts.
// ---------------------------------------------------------------------------
{
  const { clock, Socket } = newInstance({
    lingering: true,
    handshake_timeout_ms: 5,
    reconnect_delays_ms: [5],
    reconnect_window_ms: 20
  });
  await settle();

  for (let cycle = 0; cycle < 10; cycle += 1) {
    const before = Socket.instances.length;
    const latest = Socket.instances.at(-1);
    if (latest.readyState === Socket.CONNECTING) latest.emit("open");
    await advance(clock, 5);
    if (Socket.instances.length === before) await advance(clock, 5);
  }
  assert.equal(Socket.instances.length, 3,
    "each cycle spends a delay AND a handshake deadline, so a 20ms window buys two retries, not four");
  await advance(clock, FAR_FUTURE_MS);
  assert.equal(Socket.instances.length, 3, "and it stays stopped");
}

// ---------------------------------------------------------------------------
// The executor Port announcing itself must not talk a dead socket back up.
// ---------------------------------------------------------------------------
{
  const { clock, store, chrome, Socket } = newInstance({ lingering: true });
  await settle();
  const dead = Socket.instances[0];
  await authenticate(dead, "port-1");
  await advance(clock, 20);
  await advance(clock, 5);
  await settle();
  assert.equal(store[STATUS_KEY].state, "disconnected", "the deadline judged it dead");

  const port = {
    name: transport.EXECUTOR_PORT_NAME,
    onMessage: eventSource(),
    onDisconnect: eventSource(),
    postMessage() {},
    disconnect() {}
  };
  chrome.runtime.onConnect.emit(port);
  port.onMessage.emit({
    type: "DAC_BRIDGE_EXECUTOR_READY",
    protocol: globalThis.DacBridgeCore.PROTOCOL,
    version: 1,
    executor_epoch: "epoch-1"
  });
  await settle();
  assert.equal(store[STATUS_KEY].state, "disconnected",
    "the executor announcing itself does not talk a dead socket back up to connecting");
}

// ---------------------------------------------------------------------------
// Unpairing leaves nothing ticking, whichever timer happens to be armed.
// ---------------------------------------------------------------------------
{
  const { clock, chrome, Socket } = newInstance({ lingering: true });
  await settle();
  const live = Socket.instances[0];
  await authenticate(live, "unpair-1");
  await advance(clock, 20);
  assert.equal(clock.pending(), 2, "a probing socket holds its keepalive interval and its ACK deadline");

  let removal = null;
  chrome.runtime.onMessage.emit({ type: "DAC_BRIDGE_PAIRING_REMOVE" }, {}, (response) => { removal = response; });
  await settle(6);
  assert.equal(removal?.ok, true, "pairing removal reports success");
  assert.equal(removal.status.state, "unpaired");
  assert.equal(live.readyState, Socket.CLOSING, "pairing removal closes the live socket");
  assert.equal(clock.pending(), 0, "and cancels every timer it was holding");
  const socketsAtRemoval = Socket.instances.length;
  await advance(clock, FAR_FUTURE_MS);
  assert.equal(Socket.instances.length, socketsAtRemoval, "an unpaired transport never reconnects");
}

{
  const { clock, chrome, Socket } = newInstance();
  await settle();
  const sock = Socket.instances[0];
  await authenticate(sock, "unpair-2");
  sock.close();
  assert.equal(clock.pending(), 1, "the outage armed a reconnect");
  const socketsBefore = Socket.instances.length;

  let removal = null;
  chrome.runtime.onMessage.emit({ type: "DAC_BRIDGE_PAIRING_REMOVE" }, {}, (response) => { removal = response; });
  await settle(6);
  assert.equal(removal?.ok, true);
  assert.equal(clock.pending(), 0, "pairing removal cancels a pending reconnect timer too");
  await advance(clock, FAR_FUTURE_MS);
  assert.equal(Socket.instances.length, socketsBefore, "an unpaired transport never reconnects");
}

// The alarm-driven connect disarms the backoff instead of leaving it to fire twice.
{
  const { clock, chrome, Socket } = newInstance();
  await settle();
  const first = Socket.instances[0];
  await authenticate(first, "arm-1");
  first.close();
  await settle();
  assert.equal(clock.pending(), 1, "an outage arms exactly one timer: the bounded reconnect");

  chrome.alarms.onAlarm.emit({ name: transport.RECONNECT_ALARM });
  await settle();
  assert.equal(Socket.instances.length, 2, "the 30-second alarm remains a working fallback path");
  assert.equal(
    clock.pending(),
    1,
    "and it disarmed the backoff timer, leaving only the new socket's handshake deadline"
  );
  await advance(clock, 50);
  assert.equal(Socket.instances.length, 2, "a superseded reconnect never opens a parallel socket");
}

// A host that authenticates and then never answers a probe repeats a probe-plus-deadline cycle.
// Those are waits we scheduled, so they are charged too -- otherwise the cycle costs only its
// reconnect delay and the give-up window stretches to many minutes. Found by the independent
// audit of this port.
{
  const { clock, Socket } = newInstance({
    keepalive_ms: 5,
    keepalive_ack_timeout_ms: 5,
    reconnect_delays_ms: [5],
    reconnect_window_ms: 20
  });
  await settle();

  for (let cycle = 0; cycle < 8; cycle += 1) {
    const latest = Socket.instances.at(-1);
    if (latest && latest.readyState === Socket.CONNECTING) await authenticate(latest, `dwell-${cycle}`);
    await advance(clock, 5);
    await advance(clock, 5);
    await advance(clock, 5);
  }
  assert.equal(
    Socket.instances.length,
    2,
    "each unproven cycle costs its probe period and its ACK deadline, so a 20ms window buys one retry, not four"
  );
}

console.log("bridge transport liveness smoke tests: PASS");
