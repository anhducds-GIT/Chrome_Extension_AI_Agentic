import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
for (const name of ["bridge-core.js", "bridge-pairing-core.js", "bridge-router-core.js", "bridge-transport-loopback.js"]) {
  await import(pathToFileURL(path.join(here, "..", name)));
}

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

const token = Buffer.alloc(32, 17).toString("base64url");
const pairing = {
  schema_version: 1,
  host: "127.0.0.1",
  port: 32148,
  http_url: "http://127.0.0.1:32148/v1/rpc",
  websocket_url: "ws://127.0.0.1:32148/v1/extension",
  token
};
const values = { [globalThis.DacBridgePairingCore.PAIRING_STORAGE_KEY]: pairing };
const runtimeMessage = eventSource();
const clock = fakeClock();
const chromeMock = {
  runtime: { id: "a".repeat(32), onConnect: eventSource(), onMessage: runtimeMessage },
  alarms: { onAlarm: eventSource(), create() {} },
  storage: {
    local: {
      async get(key) { return { [key]: values[key] }; },
      async set(next) { Object.assign(values, next); },
      async remove(key) { delete values[key]; }
    }
  }
};

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 3;
  static instances = [];
  constructor(url) {
    this.url = url;
    this.readyState = FakeWebSocket.CONNECTING;
    this.listeners = new Map();
    this.sent = [];
    FakeWebSocket.instances.push(this);
  }
  addEventListener(name, listener) {
    const list = this.listeners.get(name) || [];
    list.push(listener);
    this.listeners.set(name, list);
  }
  emit(name, value = {}) {
    if (name === "open") this.readyState = FakeWebSocket.OPEN;
    for (const listener of this.listeners.get(name) || []) listener(value);
  }
  send(value) { this.sent.push(JSON.parse(value)); }
  close(code = 1000, reason = "") {
    if (this.readyState === FakeWebSocket.CLOSED) return;
    this.closeCode = code;
    this.closeReason = reason;
    this.readyState = FakeWebSocket.CLOSED;
    this.emit("close", { code, reason });
  }
}

globalThis.DacBridgeLoopbackTransport.create({
  chrome: chromeMock,
  WebSocket: FakeWebSocket,
  timers: clock,
  keepalive_ms: 20,
  keepalive_ack_timeout_ms: 5,
  handshake_timeout_ms: 1000,
  reconnect_delays_ms: [3, 7]
});
await Promise.resolve();
await Promise.resolve();
await new Promise((resolve) => setImmediate(resolve));

const first = FakeWebSocket.instances[0];
first.emit("open");
first.emit("message", { data: JSON.stringify({ type: "auth_ok", session_id: "session-1" }) });
await Promise.resolve();
await Promise.resolve();
clock.advance(20);
assert.equal(first.sent.at(-1).type, "keepalive", "an authenticated transport sends its liveness probe");
clock.advance(5);
assert.equal(first.readyState, FakeWebSocket.CLOSED, "a missing keepalive ACK closes a half-open socket");
clock.advance(3);
assert.equal(FakeWebSocket.instances.length, 2, "the first bounded reconnect attempt does not wait for the 30-second alarm");

const second = FakeWebSocket.instances[1];
second.emit("open");
second.emit("message", { data: JSON.stringify({ type: "auth_ok", session_id: "session-2" }) });
await Promise.resolve();
await Promise.resolve();
clock.advance(20);
second.emit("message", { data: JSON.stringify({ type: "keepalive_ack" }) });
await Promise.resolve();
clock.advance(5);
assert.equal(second.readyState, FakeWebSocket.OPEN, "a timely ACK preserves the healthy socket");

// --- the backoff is bounded by construction, not merely by convention ---
const transport = globalThis.DacBridgeLoopbackTransport;
// Far past anything any case here arms, stated outright so it cannot shrink with a constant.
const FAR_FUTURE_MS = 300000;
// Owner decision 2026-08-28, taken from live measurement: the host is on loopback, so backing
// off to spare it buys nothing while the operator waits. Two live cycles recovered in 22.5s and
// 27.7s, both explained exactly by the ladder sitting on its old 30-second rung.
assert.equal(transport.RECONNECT_CEILING_MS, 5000, "bounded reconnect never waits longer than the five-second ceiling");
assert.ok(transport.RECONNECT_WINDOW_MS > transport.RECONNECT_CEILING_MS, "the give-up window spans several rungs rather than cutting the ladder off at once");
assert.ok(transport.RECONNECT_DELAYS_MS.length > 1, "the backoff actually steps rather than repeating one delay");
assert.ok(
  transport.RECONNECT_DELAYS_MS.every((delay) => delay > 0 && delay <= transport.RECONNECT_CEILING_MS),
  "every default backoff step stays inside the ceiling"
);
assert.ok(
  transport.RECONNECT_DELAYS_MS.every((delay, index, all) => index === 0 || delay >= all[index - 1]),
  "the backoff never steps back down toward hammering the host"
);
assert.ok(transport.KEEPALIVE_ACK_TIMEOUT_MS < transport.KEEPALIVE_MS, "the ACK deadline resolves before the next probe is sent");

// --- no secret material leaves the auth frame ---
assert.equal(second.url.includes(token), false, "token is never placed in the WebSocket URL");
const keepaliveFrames = second.sent.filter((message) => message.type === "keepalive");
assert.ok(keepaliveFrames.length >= 1, "the healthy socket did probe");
assert.equal(JSON.stringify(keepaliveFrames).includes(token), false, "keepalive frames carry no token");
const publishedStatus = values[globalThis.DacBridgePairingCore.STATUS_STORAGE_KEY];
assert.equal(JSON.stringify(publishedStatus).includes(token), false, "published status never carries token material");
assert.equal(publishedStatus.endpoint.host, "127.0.0.1", "status keeps the loopback endpoint only");

// --- one socket per outage: the alarm fallback and the backoff must not both fire ---
second.close();
assert.equal(FakeWebSocket.instances.length, 2, "closing a socket does not synchronously open its replacement");
assert.equal(clock.pending(), 1, "an outage arms exactly one timer: the bounded reconnect");
chromeMock.alarms.onAlarm.emit({ name: transport.RECONNECT_ALARM });
assert.equal(FakeWebSocket.instances.length, 3, "the 30-second alarm remains a working fallback path");
assert.equal(clock.pending(), 1, "the alarm-driven reconnect disarms the backoff timer, leaving only the new socket's handshake deadline");
clock.advance(50);
assert.equal(FakeWebSocket.instances.length, 3, "a reconnect superseded by the alarm never opens a parallel socket");

const third = FakeWebSocket.instances[2];
third.emit("open");
third.emit("message", { data: JSON.stringify({ type: "auth_ok", session_id: "session-3" }) });
await Promise.resolve();
await Promise.resolve();
clock.advance(20);
assert.ok(third.sent.some((message) => message.type === "keepalive"), "the recovered socket resumes probing");

// --- unpairing must leave nothing ticking, whichever timer happens to be armed ---
async function settle() {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

function removePairing() {
  let removal = null;
  runtimeMessage.emit({ type: "DAC_BRIDGE_PAIRING_REMOVE" }, {}, (response) => { removal = response; });
  return settle().then(() => removal);
}

// Case A: a reconnect timer is the thing left armed.
third.close();
assert.equal(clock.pending(), 1, "an outage leaves exactly one timer armed: the pending reconnect");
const socketsBeforeUnpair = FakeWebSocket.instances.length;
const removalDuringBackoff = await removePairing();
assert.equal(removalDuringBackoff?.ok, true, "pairing removal reports success");
assert.equal(removalDuringBackoff.status.state, "unpaired");
assert.equal(clock.pending(), 0, "pairing removal cancels a pending reconnect timer");
clock.advance(FAR_FUTURE_MS);
assert.equal(FakeWebSocket.instances.length, socketsBeforeUnpair, "an unpaired transport never reconnects");

// Case B: a live authenticated socket with its keepalive and ACK deadline armed.
let repaired = null;
runtimeMessage.emit({ type: "DAC_BRIDGE_PAIRING_SET", pairing }, {}, (response) => { repaired = response; });
await settle();
assert.equal(repaired?.ok, true, "re-pairing reports success");
const fourth = FakeWebSocket.instances.at(-1);
assert.equal(FakeWebSocket.instances.length, socketsBeforeUnpair + 1, "re-pairing opens exactly one socket");
fourth.emit("open");
fourth.emit("message", { data: JSON.stringify({ type: "auth_ok", session_id: "session-4" }) });
await settle();
clock.advance(20);
assert.ok(fourth.sent.some((message) => message.type === "keepalive"), "the re-paired socket probes");
assert.equal(clock.pending(), 2, "a probing socket holds its keepalive interval and its ACK deadline");
const framesAtRemoval = fourth.sent.length;
const removalWhileLive = await removePairing();
assert.equal(removalWhileLive?.ok, true);
assert.equal(fourth.readyState, FakeWebSocket.CLOSED, "pairing removal closes the live socket");
assert.equal(clock.pending(), 0, "pairing removal cancels the keepalive interval and the ACK deadline");
const socketsAtRemoval = FakeWebSocket.instances.length;
clock.advance(FAR_FUTURE_MS);
assert.equal(FakeWebSocket.instances.length, socketsAtRemoval, "closing on removal does not itself trigger a reconnect");
assert.equal(fourth.sent.length, framesAtRemoval, "no probe is sent after removal");

// --- a real socket does not close instantly: it lingers in CLOSING ---
// The fake above closes synchronously, which hides the window a browser actually has.
// Two things must hold inside that window: status must stop claiming "connected" the
// moment the probe is judged unanswered, and the alarm must still be able to rescue a
// socket the browser never finishes closing.
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

function makeChrome(store) {
  return {
    runtime: { id: "a".repeat(32), onConnect: eventSource(), onMessage: eventSource() },
    alarms: { onAlarm: eventSource(), create() {} },
    storage: {
      local: {
        async get(key) { return { [key]: store[key] }; },
        async set(next) { Object.assign(store, next); },
        async remove(key) { delete store[key]; }
      }
    }
  };
}

const authOk = (id) => ({ data: JSON.stringify({ type: "auth_ok", session_id: id }) });
const ackFrame = { data: JSON.stringify({ type: "keepalive_ack" }) };

const lingerClock = fakeClock();
const lingerStore = { [globalThis.DacBridgePairingCore.PAIRING_STORAGE_KEY]: pairing };
const lingerChrome = makeChrome(lingerStore);
const LingerSocket = makeSocketClass({ lingering: true });
const lingerTransport = transport.create({
  chrome: lingerChrome,
  WebSocket: LingerSocket,
  timers: lingerClock,
  keepalive_ms: 20,
  keepalive_ack_timeout_ms: 5,
  handshake_timeout_ms: 1000,
  reconnect_delays_ms: [3]
});
await settle();

const lingering = LingerSocket.instances[0];
lingering.emit("open");
lingering.emit("message", authOk("linger-1"));
await settle();
assert.equal(lingerTransport.status().state, "connected", "a freshly authenticated socket reports connected");
lingerClock.advance(20);
assert.equal(lingering.sent.at(-1).type, "keepalive", "the lingering-socket transport probes too");
lingerClock.advance(5);
assert.equal(lingering.readyState, LingerSocket.CLOSING, "a browser socket sits in CLOSING after close() is requested");
assert.equal(
  lingerTransport.status().state,
  "disconnected",
  "status stops claiming connected the moment the probe is judged unanswered, not when the browser finishes closing"
);
assert.equal(
  lingerClock.pending(),
  1,
  "judging the socket dead disarms its keepalive timers and arms recovery at once, rather than waiting on a close event a CLOSING socket may never emit"
);

// The 30-second alarm must be able to rescue a socket stuck in CLOSING. This is exactly why
// CLOSING is deliberately NOT treated as a socket worth keeping.
lingerChrome.alarms.onAlarm.emit({ name: transport.RECONNECT_ALARM });
assert.equal(LingerSocket.instances.length, 2, "the alarm rescues a socket the browser leaves stuck in CLOSING");
lingering.finishClose();
await settle();
assert.equal(LingerSocket.instances.length, 2, "a superseded socket's late close event does not open another socket");

// --- a socket wedged in CONNECTING is the one case the alarm provably cannot rescue ---
const wedged = LingerSocket.instances[1];
assert.equal(wedged.readyState, LingerSocket.CONNECTING, "the replacement is still trying to connect");
lingerChrome.alarms.onAlarm.emit({ name: transport.RECONNECT_ALARM });
assert.equal(
  LingerSocket.instances.length,
  2,
  "the alarm routes through connectHost, which refuses to replace a CONNECTING socket -- this is why the handshake needs its own deadline"
);
lingerClock.advance(1000);
assert.equal(wedged.readyState, LingerSocket.CLOSING, "the handshake deadline gives up on a socket that never opens");
lingerClock.advance(3);
assert.equal(
  LingerSocket.instances.length,
  3,
  "and the bounded reconnect rescues the bridge without waiting for a close event that may never arrive"
);

// --- a flapping host must be backed off, not hammered at the first rung forever ---
const flapClock = fakeClock();
const flapStore = { [globalThis.DacBridgePairingCore.PAIRING_STORAGE_KEY]: pairing };
const FlapSocket = makeSocketClass({ lingering: false });
transport.create({
  chrome: makeChrome(flapStore),
  WebSocket: FlapSocket,
  timers: flapClock,
  keepalive_ms: 20,
  keepalive_ack_timeout_ms: 5,
  handshake_timeout_ms: 1000,
  reconnect_delays_ms: [3, 7, 11]
});
await settle();

function measureReconnectDelay() {
  const before = FlapSocket.instances.length;
  let waited = 0;
  while (FlapSocket.instances.length === before && waited < 200) {
    flapClock.advance(1);
    waited += 1;
  }
  assert.ok(FlapSocket.instances.length > before, "a dropped connection is always retried");
  return waited;
}

async function authenticateThenDrop(label) {
  const sock = FlapSocket.instances.at(-1);
  sock.emit("open");
  sock.emit("message", authOk(label));
  await settle();
  sock.close();
  return sock;
}

await authenticateThenDrop("flap-1");
assert.equal(measureReconnectDelay(), 3, "the first retry after an outage uses the first rung");
await authenticateThenDrop("flap-2");
assert.equal(measureReconnectDelay(), 7, "a host that authenticates then drops climbs the ladder instead of being hammered");
await authenticateThenDrop("flap-3");
assert.equal(measureReconnectDelay(), 11, "the ladder keeps climbing while the link keeps failing");

const proven = FlapSocket.instances.at(-1);
proven.emit("open");
proven.emit("message", authOk("proven"));
await settle();
flapClock.advance(20);
proven.emit("message", ackFrame);
await settle();
proven.close();
assert.equal(measureReconnectDelay(), 3, "an answered probe, not a bare auth_ok, is what resets the ladder");

// --- a socket judged dead must stay dead ---
// Round-2 audit finding: dropping `authenticated` at the deadline is right, but it opened a
// window where an auth_ok the browser had already queued could flip the transport back to
// "connected" about a socket that is only CLOSING -- reinstating the exact lie being fixed,
// and silencing the alarm fallback, which skips work while authenticated.
const STATUS_KEY = globalThis.DacBridgePairingCore.STATUS_STORAGE_KEY;
const zombieClock = fakeClock();
const zombieStore = { [globalThis.DacBridgePairingCore.PAIRING_STORAGE_KEY]: pairing };
const zombieChrome = makeChrome(zombieStore);
const ZombieSocket = makeSocketClass({ lingering: true });
transport.create({
  chrome: zombieChrome,
  WebSocket: ZombieSocket,
  timers: zombieClock,
  keepalive_ms: 20,
  keepalive_ack_timeout_ms: 5,
  handshake_timeout_ms: 1000,
  reconnect_delays_ms: [3]
});
await settle();

const zombie = ZombieSocket.instances[0];
zombie.emit("open");
zombie.emit("message", authOk("zombie-1"));
await settle();
zombieClock.advance(20);
zombieClock.advance(5);
await settle();
assert.equal(zombie.readyState, ZombieSocket.CLOSING, "the deadline judged it dead but the browser has not finished closing it");
assert.equal(zombieStore[STATUS_KEY].state, "disconnected", "the published state is honest at that moment");
assert.equal(zombieClock.pending(), 1, "and recovery is already armed: only the reconnect timer remains");
const zombieFramesAtDeath = zombie.sent.length;

zombie.emit("message", authOk("zombie-1-again"));
await settle();
assert.equal(zombieStore[STATUS_KEY].state, "disconnected", "a queued auth_ok cannot resurrect a socket the ACK deadline judged dead");
assert.equal(zombieClock.pending(), 1, "and it arms nothing new: no keepalive interval is restarted on a dead socket");


// The executor Port announcing itself must read the same state, not talk it back up.
const zombiePort = {
  name: transport.EXECUTOR_PORT_NAME,
  onMessage: eventSource(),
  onDisconnect: eventSource(),
  postMessage() {},
  disconnect() {}
};
zombieChrome.runtime.onConnect.emit(zombiePort);
zombiePort.onMessage.emit({
  type: "DAC_BRIDGE_EXECUTOR_READY",
  protocol: globalThis.DacBridgeCore.PROTOCOL,
  version: 1,
  executor_epoch: "zombie-epoch"
});
await settle();
assert.equal(zombieStore[STATUS_KEY].state, "disconnected", "the executor announcing itself does not talk a dead socket back up to connecting");

// Recovery still runs, and the socket that was judged dead is never probed again.
zombieClock.advance(20);
assert.equal(zombie.sent.length, zombieFramesAtDeath, "a dead socket is never probed again");
assert.equal(ZombieSocket.instances.length, 2, "and the bounded reconnect replaced it");

// --- a repeated auth_ok on a live socket must not postpone the probe forever ---
// Re-authenticating restarts the keepalive interval. A host that repeats auth_ok just under
// the probe period would therefore never be probed at all: liveness defeated by protocol abuse.
const repeatClock = fakeClock();
const repeatStore = { [globalThis.DacBridgePairingCore.PAIRING_STORAGE_KEY]: pairing };
const RepeatSocket = makeSocketClass({ lingering: true });
transport.create({
  chrome: makeChrome(repeatStore),
  WebSocket: RepeatSocket,
  timers: repeatClock,
  keepalive_ms: 20,
  keepalive_ack_timeout_ms: 5,
  handshake_timeout_ms: 1000,
  reconnect_delays_ms: [3]
});
await settle();

const live = RepeatSocket.instances[0];
live.emit("open");
live.emit("message", authOk("repeat-1"));
await settle();
repeatClock.advance(15);
live.emit("message", authOk("repeat-1-again"));
await settle();
assert.equal(live.readyState, RepeatSocket.CLOSING, "a repeated auth_ok is a protocol violation and fails closed rather than restarting the probe clock");
assert.equal(
  repeatStore[STATUS_KEY].state,
  "disconnected",
  "and ownership is given up at once -- not left reporting connected for however long the browser keeps the socket in CLOSING"
);
assert.equal(repeatClock.pending(), 1, "only recovery stays armed; the keepalive interval the violation tried to restart is gone");
repeatClock.advance(3);
assert.equal(RepeatSocket.instances.length, 2, "the bounded reconnect recovers from the violation without a close event");

// --- a protocol violation gives up ownership at once, CLOSING window included ---
// An unsupported frame drops the socket immediately: its keepalive interval and ACK deadline go
// with it, and recovery is armed without waiting for a close event the peer may never send.
const staleClock = fakeClock();
const staleStore = { [globalThis.DacBridgePairingCore.PAIRING_STORAGE_KEY]: pairing };
const StaleSocket = makeSocketClass({ lingering: true });
const staleTransport = transport.create({
  chrome: makeChrome(staleStore),
  WebSocket: StaleSocket,
  timers: staleClock,
  keepalive_ms: 20,
  keepalive_ack_timeout_ms: 50,
  handshake_timeout_ms: 1000,
  reconnect_delays_ms: [3]
});
await settle();

const stale = StaleSocket.instances[0];
stale.emit("open");
stale.emit("message", authOk("stale-1"));
await settle();
staleClock.advance(20);
assert.equal(stale.sent.at(-1).type, "keepalive", "the probe went out and armed its deadline");

stale.emit("message", { data: JSON.stringify({ type: "not-a-known-frame" }) });
await settle();
assert.equal(stale.readyState, StaleSocket.CLOSING, "an unsupported frame fails closed, and a real socket only reaches CLOSING");
assert.equal(
  staleStore[STATUS_KEY].state,
  "disconnected",
  "a protocol violation gives up ownership at once instead of reporting connected for the whole CLOSING window"
);
assert.equal(staleTransport.status().state, "disconnected", "every status path reads that same decision");
assert.equal(staleClock.pending(), 1, "the abandoned socket leaves only recovery armed: its keepalive and ACK deadline are gone");
staleClock.advance(3);
assert.equal(
  StaleSocket.instances.length,
  2,
  "and the bounded reconnect recovers even though the browser never finished closing the offending socket"
);

// Replacing a socket voids the old authentication, so the replacement is reported honestly.
const replacement = StaleSocket.instances[1];
assert.equal(replacement.readyState, StaleSocket.CONNECTING);
assert.equal(
  staleTransport.status().state,
  "connecting",
  "the replacement is reported as connecting, never as already connected on the strength of the old socket's auth"
);

// --- a replacement socket must never inherit the old socket's authentication ---
// Round-4 audit gave the reachable sequence: the peer starts closing an authenticated socket,
// its close event has not run yet, and something calls the exported connectHost() or
// loadPairing(). The replacement is created while the flag is still set, so an rpc frame that
// arrives before the new socket has authenticated would sail past the pre-auth check and reach
// the router. Production already refuses this; nothing pinned it.
const inheritClock = fakeClock();
const inheritStore = { [globalThis.DacBridgePairingCore.PAIRING_STORAGE_KEY]: pairing };
const InheritSocket = makeSocketClass({ lingering: true });
const inheritTransport = transport.create({
  chrome: makeChrome(inheritStore),
  WebSocket: InheritSocket,
  timers: inheritClock,
  keepalive_ms: 20,
  keepalive_ack_timeout_ms: 5,
  handshake_timeout_ms: 1000,
  reconnect_delays_ms: [3]
});
await settle();

const established = InheritSocket.instances[0];
established.emit("open");
established.emit("message", authOk("inherit-1"));
await settle();
assert.equal(inheritTransport.status().state, "connected", "the first socket really is authenticated");

// The peer closes it. No close event yet -- that is the whole point of the window.
established.close();
assert.equal(established.readyState, InheritSocket.CLOSING, "the peer's close has begun but its event has not run");

await inheritTransport.connectHost();
assert.equal(InheritSocket.instances.length, 2, "the exported connectHost replaces a socket the peer is closing");
const replacementSocket = InheritSocket.instances[1];
assert.equal(
  inheritTransport.status().state,
  "connecting",
  "the replacement does not inherit the old socket's authentication"
);

replacementSocket.emit("open");
const preAuthRequest = {
  protocol: globalThis.DacBridgeCore.PROTOCOL,
  version: 1,
  kind: "request",
  request_id: "inherit-request-0001",
  method: "queue.list",
  sent_at: "2026-08-28T00:00:00.000Z",
  client: { client_id: "test", name: "Test", version: "1" },
  params: {}
};
replacementSocket.emit("message", {
  data: JSON.stringify({ type: "rpc", relay_id: "inherit-relay", envelope: preAuthRequest })
});
await settle();
assert.equal(replacementSocket.readyState, InheritSocket.CLOSING, "a pre-auth RPC on the replacement fails closed");
assert.equal(
  replacementSocket.sent.some((message) => message.type === "rpc_response"),
  false,
  "and is never routed: inherited authentication would have let it through"
);

// --- a peer-initiated close whose event never arrives must still be noticed ---
// Round-5 audit: this is the one window the ACK deadline could not cover. If the socket enters
// CLOSING before a probe was ever sent, no deadline is armed; the probe tick used to skip a
// non-OPEN socket silently; and the alarm skips recovery while `authenticated` is set. Nothing
// was left to notice, so the transport could report connected forever.
const silentClock = fakeClock();
const silentStore = { [globalThis.DacBridgePairingCore.PAIRING_STORAGE_KEY]: pairing };
const SilentSocket = makeSocketClass({ lingering: true });
const silentTransport = transport.create({
  chrome: makeChrome(silentStore),
  WebSocket: SilentSocket,
  timers: silentClock,
  keepalive_ms: 20,
  keepalive_ack_timeout_ms: 5,
  handshake_timeout_ms: 1000,
  reconnect_delays_ms: [3]
});
await settle();

const silent = SilentSocket.instances[0];
silent.emit("open");
silent.emit("message", authOk("silent-1"));
await settle();
assert.equal(silentTransport.status().state, "connected", "the socket is genuinely connected first");

// The peer closes it. No close event, and no probe had been sent yet, so no deadline is armed.
silent.close();
assert.equal(silent.readyState, SilentSocket.CLOSING, "the socket is closing with its event withheld");
assert.notEqual(
  silentTransport.status().state,
  "connected",
  "being authenticated is not the same as being connected: a socket that is no longer OPEN is not reported as connected"
);

silentClock.advance(20);
await settle();
assert.equal(silentStore[STATUS_KEY].state, "disconnected", "the next probe tick notices the socket is no longer open and gives up ownership");
assert.equal(silentClock.pending(), 1, "and arms recovery: the keepalive interval it was running in is gone");
silentClock.advance(3);
assert.equal(SilentSocket.instances.length, 2, "recovery happens within one probe period, without any close event at all");

// --- a host that accepts the socket and then never answers must not wedge the bridge ---
// Round-6 audit: the deadline used to end the moment the socket opened. A socket that is OPEN but
// never authenticated has no keepalive (that starts at auth_ok), no ACK deadline, and no rescue --
// the alarm routes through connectHost, which refuses to replace an OPEN socket just as it refuses
// to replace a CONNECTING one.
const muteClock = fakeClock();
const muteStore = { [globalThis.DacBridgePairingCore.PAIRING_STORAGE_KEY]: pairing };
const muteChrome = makeChrome(muteStore);
const MuteSocket = makeSocketClass({ lingering: true });
transport.create({
  chrome: muteChrome,
  WebSocket: MuteSocket,
  timers: muteClock,
  keepalive_ms: 20,
  keepalive_ack_timeout_ms: 5,
  handshake_timeout_ms: 1000,
  reconnect_delays_ms: [3]
});
await settle();

const mute = MuteSocket.instances[0];
mute.emit("open");
// Multi-profile: the auth frame is sent one microtask after "open" (the
// identity is read from storage inside the open handler).
await settle();
assert.equal(mute.sent[0].type, "auth", "we did ask the host to authenticate us");
muteChrome.alarms.onAlarm.emit({ name: transport.RECONNECT_ALARM });
assert.equal(
  MuteSocket.instances.length,
  1,
  "the alarm cannot replace an OPEN socket, so it cannot rescue a handshake that is never answered"
);
muteClock.advance(1000);
await settle();
assert.equal(mute.readyState, MuteSocket.CLOSING, "the deadline covers the whole handshake, not merely the connect");
assert.equal(muteStore[STATUS_KEY].state, "disconnected", "and the transport stops waiting on a host that will not answer");
muteClock.advance(3);
assert.equal(MuteSocket.instances.length, 2, "recovery follows on the bounded backoff");

// --- storage writes are not ordered, so the newest status must still be the one that lands ---
// Round-7 audit: publishStatus awaited an unordered storage write. Two publishes in flight could
// complete newest-first, leaving a stale "connected" persisted for the side panel to read after
// the transport had already given up. This mock completes writes out of order on purpose.
const orderedClock = fakeClock();
const orderedStore = { [globalThis.DacBridgePairingCore.PAIRING_STORAGE_KEY]: pairing };
const heldWrites = [];
let holdWrites = false;
const orderedChrome = {
  runtime: { id: "a".repeat(32), onConnect: eventSource(), onMessage: eventSource() },
  alarms: { onAlarm: eventSource(), create() {} },
  storage: {
    local: {
      async get(key) { return { [key]: orderedStore[key] }; },
      set(next) {
        if (!holdWrites) { Object.assign(orderedStore, next); return Promise.resolve(); }
        return new Promise((resolve) => heldWrites.push(() => { Object.assign(orderedStore, next); resolve(); }));
      },
      async remove(key) { delete orderedStore[key]; }
    }
  }
};
const OrderedSocket = makeSocketClass({ lingering: true });
transport.create({
  chrome: orderedChrome,
  WebSocket: OrderedSocket,
  timers: orderedClock,
  keepalive_ms: 20,
  keepalive_ack_timeout_ms: 5,
  handshake_timeout_ms: 1000,
  reconnect_delays_ms: [3]
});
await settle();

const ordered = OrderedSocket.instances[0];
ordered.emit("open");
holdWrites = true;
ordered.emit("message", authOk("ordered-1"));
await settle();
orderedClock.advance(20);
orderedClock.advance(5);
await settle();
assert.ok(heldWrites.length >= 1, "a status write is in flight");
// Release everything in the worst order: newest first, the stale one last. Serialized writes
// surface one at a time; unserialized ones surface together and land newest-first.
for (let round = 0; round < 8 && heldWrites.length; round += 1) {
  const batch = heldWrites.splice(0, heldWrites.length).reverse();
  for (const finish of batch) {
    finish();
    await settle();
  }
}
holdWrites = false;
assert.equal(
  orderedStore[STATUS_KEY].state,
  "disconnected",
  "a superseded status write is dropped rather than allowed to land last and re-publish connected"
);

// --- a handshake deadline must never lose its handle to a socket it no longer owns ---
// Round-7 audit: connectHost overwrote the single handshakeTimer slot without cancelling the old
// one; the leaked callback then nulled the slot, taking the live timer's handle with it, so
// pairing removal could no longer cancel it.
const slotClock = fakeClock();
const slotStore = { [globalThis.DacBridgePairingCore.PAIRING_STORAGE_KEY]: pairing };
const slotChrome = makeChrome(slotStore);
const SlotSocket = makeSocketClass({ lingering: true });
const slotTransport = transport.create({
  chrome: slotChrome,
  WebSocket: SlotSocket,
  timers: slotClock,
  keepalive_ms: 20,
  keepalive_ack_timeout_ms: 5,
  handshake_timeout_ms: 1000,
  reconnect_delays_ms: [3]
});
await settle();

// First the unauthenticated case, where the timer at risk is the handshake deadline itself.
const unauthClock = fakeClock();
const UnauthSocket = makeSocketClass({ lingering: true });
const unauthTransport = transport.create({
  chrome: makeChrome({ [globalThis.DacBridgePairingCore.PAIRING_STORAGE_KEY]: pairing }),
  WebSocket: UnauthSocket,
  timers: unauthClock,
  keepalive_ms: 20,
  keepalive_ack_timeout_ms: 5,
  handshake_timeout_ms: 1000,
  reconnect_delays_ms: [3]
});
await settle();
const unauth = UnauthSocket.instances[0];
unauth.emit("open");
assert.equal(unauthClock.pending(), 1, "an unauthenticated socket holds its handshake deadline");
unauth.close();
assert.equal(unauth.readyState, UnauthSocket.CLOSING, "the peer closed it and withheld the event");
await unauthTransport.connectHost();
assert.equal(UnauthSocket.instances.length, 2, "the replacement is created");
assert.equal(
  unauthClock.pending(),
  1,
  "and the replaced socket's handshake deadline was cancelled rather than leaked alongside the new one"
);

// An authenticated socket reaches CLOSING with its close event withheld, so nothing cleaned up:
// it still holds a keepalive interval and an unanswered ACK deadline, and the replacement that
// follows must not inherit either of them.
const abandoned = SlotSocket.instances[0];
abandoned.emit("open");
abandoned.emit("message", authOk("slot-1"));
await settle();
slotClock.advance(20);
assert.equal(abandoned.sent.at(-1).type, "keepalive", "it probed, so its ACK deadline is armed");
assert.equal(slotClock.pending(), 2, "keepalive interval plus ACK deadline");
abandoned.close();
assert.equal(abandoned.readyState, SlotSocket.CLOSING, "the peer closed it and withheld the event");

await slotTransport.connectHost();
assert.equal(SlotSocket.instances.length, 2, "the replacement is created");
assert.equal(
  slotClock.pending(),
  1,
  "and it inherits none of the replaced socket's timers: only the new handshake deadline is armed"
);
slotClock.advance(1000);
assert.equal(
  SlotSocket.instances[1].readyState,
  SlotSocket.CLOSING,
  "the one armed timer really is the replacement's own handshake deadline"
);
await slotTransport.connectHost();
assert.equal(SlotSocket.instances.length, 3);

let slotRemoval = null;
slotChrome.runtime.onMessage.emit({ type: "DAC_BRIDGE_PAIRING_REMOVE" }, {}, (response) => { slotRemoval = response; });
await settle();
assert.equal(slotRemoval?.ok, true);
assert.equal(slotClock.pending(), 0, "pairing removal can still cancel the live handshake deadline");

// --- interleaved pairing edits must linearize: the later request wins ---
// Round-7 audit: PAIRING_SET awaits a storage write before assigning `pairing`. A removal that
// ran inside that window reported success while the set went on to pair and connect anyway.
const raceClock = fakeClock();
const raceStore = { [globalThis.DacBridgePairingCore.PAIRING_STORAGE_KEY]: pairing };
const raceChrome = makeChrome(raceStore);
const RaceSocket = makeSocketClass({ lingering: true });
const raceTransport = transport.create({
  chrome: raceChrome,
  WebSocket: RaceSocket,
  timers: raceClock,
  keepalive_ms: 20,
  keepalive_ack_timeout_ms: 5,
  handshake_timeout_ms: 1000,
  reconnect_delays_ms: [3]
});
await settle();
const socketsBeforeRace = RaceSocket.instances.length;

let raceSet = null;
let raceRemove = null;
raceChrome.runtime.onMessage.emit({ type: "DAC_BRIDGE_PAIRING_SET", pairing }, {}, (response) => { raceSet = response; });
raceChrome.runtime.onMessage.emit({ type: "DAC_BRIDGE_PAIRING_REMOVE" }, {}, (response) => { raceRemove = response; });
await settle();
await settle();

assert.equal(raceRemove?.ok, true, "the removal reports success");
assert.ok(raceSet, "and the set still answers its caller rather than hanging behind it");
assert.equal(
  raceTransport.status().state,
  "unpaired",
  "the later request is what stands: the set does not finish pairing us behind the removal's back"
);
assert.equal(raceStore[globalThis.DacBridgePairingCore.PAIRING_STORAGE_KEY], undefined, "and its storage write does not survive the removal either");
assert.equal(raceClock.pending(), 0, "nothing is left ticking");
for (const opened of RaceSocket.instances.slice(socketsBeforeRace)) {
  assert.notEqual(opened.readyState, RaceSocket.OPEN, "no socket the set opened is left alive");
}

// A reload of the stored pairing is a pairing edit too, and must queue behind a removal rather
// than read the key before the removal's write lands and pair us back up from stale bytes.
let secondRemoval = null;
raceChrome.runtime.onMessage.emit({ type: "DAC_BRIDGE_PAIRING_SET", pairing }, {}, () => {});
await settle();
await settle();
raceChrome.runtime.onMessage.emit({ type: "DAC_BRIDGE_PAIRING_REMOVE" }, {}, (response) => { secondRemoval = response; });
const reload = raceTransport.loadPairing();
await settle();
await settle();
await reload;
assert.equal(secondRemoval?.ok, true, "the removal still reports success");
assert.equal(raceTransport.status().state, "unpaired", "a concurrent reload does not resurrect a pairing that was just removed");
assert.equal(raceTransport.status().paired, false, "and the transport does not claim to be paired");

// --- the ladder gives up after its window and leaves the alarm to it ---
// Retrying is what keeps an MV3 worker resident, and that -- not the connect itself -- is what
// costs battery. So a host that stays down stops being chased: after the window the 30-second
// alarm is the only path, which is what an overnight outage already costs today.
const giveUpClock = fakeClock();
const giveUpChrome = makeChrome({ [globalThis.DacBridgePairingCore.PAIRING_STORAGE_KEY]: pairing });
const GiveUpSocket = makeSocketClass({ lingering: false });
transport.create({
  chrome: giveUpChrome,
  WebSocket: GiveUpSocket,
  timers: giveUpClock,
  keepalive_ms: 20,
  keepalive_ack_timeout_ms: 5,
  handshake_timeout_ms: 1000,
  reconnect_delays_ms: [5],
  reconnect_window_ms: 20
});
await settle();

function refuseLatestConnect() {
  GiveUpSocket.instances.at(-1).close();
}

refuseLatestConnect();
for (let attempt = 0; attempt < 12; attempt += 1) {
  const before = GiveUpSocket.instances.length;
  giveUpClock.advance(5);
  if (GiveUpSocket.instances.length > before) refuseLatestConnect();
}
assert.equal(
  GiveUpSocket.instances.length,
  5,
  "the ladder spends its 20ms window on four retries and then stops, instead of chasing a dead host forever"
);
giveUpClock.advance(FAR_FUTURE_MS);
assert.equal(GiveUpSocket.instances.length, 5, "and it stays stopped");

giveUpChrome.alarms.onAlarm.emit({ name: transport.RECONNECT_ALARM });
assert.equal(GiveUpSocket.instances.length, 6, "the 30-second alarm is still the fallback once the ladder has given up");

// A connection that proves itself restores the budget, so the next outage is chased again.
const revived = GiveUpSocket.instances.at(-1);
revived.emit("open");
revived.emit("message", authOk("give-up-revived"));
await settle();
giveUpClock.advance(20);
revived.emit("message", ackFrame);
await settle();
revived.close();
giveUpClock.advance(5);
assert.equal(
  GiveUpSocket.instances.length,
  7,
  "an answered probe restores the reconnect budget, so a later outage is chased from the first rung again"
);

// --- an ACK that answers nothing must not refill the reconnect budget ---
// Otherwise a host that authenticates, sends an unsolicited keepalive_ack and drops resets the
// budget every cycle, and the give-up window never closes: unlimited first-rung retries.
const refillClock = fakeClock();
const refillChrome = makeChrome({ [globalThis.DacBridgePairingCore.PAIRING_STORAGE_KEY]: pairing });
const RefillSocket = makeSocketClass({ lingering: false });
transport.create({
  chrome: refillChrome,
  WebSocket: RefillSocket,
  timers: refillClock,
  keepalive_ms: 20,
  keepalive_ack_timeout_ms: 5,
  handshake_timeout_ms: 1000,
  reconnect_delays_ms: [5],
  reconnect_window_ms: 20
});
await settle();

RefillSocket.instances.at(-1).close();
for (let attempt = 0; attempt < 12; attempt += 1) {
  const before = RefillSocket.instances.length;
  refillClock.advance(5);
  if (RefillSocket.instances.length > before) RefillSocket.instances.at(-1).close();
}
const spentBudgetSockets = RefillSocket.instances.length;
refillClock.advance(FAR_FUTURE_MS);
assert.equal(RefillSocket.instances.length, spentBudgetSockets, "the budget is spent and the ladder has given up");

refillChrome.alarms.onAlarm.emit({ name: transport.RECONNECT_ALARM });
const revivedByAlarm = RefillSocket.instances.at(-1);
revivedByAlarm.emit("open");
revivedByAlarm.emit("message", authOk("refill-1"));
await settle();
// No probe has been sent yet -- the keepalive interval has not fired -- so this ACK answers nothing.
revivedByAlarm.emit("message", ackFrame);
await settle();
revivedByAlarm.close();
const socketsAfterUnsolicitedAck = RefillSocket.instances.length;
refillClock.advance(FAR_FUTURE_MS);
assert.equal(
  RefillSocket.instances.length,
  socketsAfterUnsolicitedAck,
  "an unsolicited ACK answers no outstanding probe, so it does not refill a spent budget"
);

// --- every rung must cost budget, or the window never closes ---
// A zero delay would be a free rung: the ladder would spin without ever giving up.
const zeroClock = fakeClock();
const ZeroSocket = makeSocketClass({ lingering: false });
transport.create({
  chrome: makeChrome({ [globalThis.DacBridgePairingCore.PAIRING_STORAGE_KEY]: pairing }),
  WebSocket: ZeroSocket,
  timers: zeroClock,
  keepalive_ms: 20,
  keepalive_ack_timeout_ms: 5,
  handshake_timeout_ms: 1000,
  reconnect_delays_ms: [0],
  reconnect_window_ms: 3
});
await settle();

ZeroSocket.instances.at(-1).close();
for (let attempt = 0; attempt < 20; attempt += 1) {
  const before = ZeroSocket.instances.length;
  zeroClock.advance(1);
  if (ZeroSocket.instances.length > before) ZeroSocket.instances.at(-1).close();
}
assert.equal(
  ZeroSocket.instances.length,
  4,
  "a zero delay is floored to a real rung, so a 3ms window buys exactly three retries and then stops"
);
zeroClock.advance(FAR_FUTURE_MS);
assert.equal(ZeroSocket.instances.length, 4, "and it stays stopped rather than spinning");

// --- a window that never closes is not a window ---
// Infinity survived Number(), so the give-up condition could never become true and the ladder
// would chase a dead host forever. A non-finite or non-positive window falls back to the default.
const foreverClock = fakeClock();
const ForeverSocket = makeSocketClass({ lingering: false });
transport.create({
  chrome: makeChrome({ [globalThis.DacBridgePairingCore.PAIRING_STORAGE_KEY]: pairing }),
  WebSocket: ForeverSocket,
  timers: foreverClock,
  keepalive_ms: 20,
  keepalive_ack_timeout_ms: 5,
  handshake_timeout_ms: 1000,
  reconnect_delays_ms: [transport.RECONNECT_CEILING_MS],
  reconnect_window_ms: Infinity
});
await settle();

const expectedRetries = transport.RECONNECT_WINDOW_MS / transport.RECONNECT_CEILING_MS;
ForeverSocket.instances.at(-1).close();
for (let attempt = 0; attempt < expectedRetries + 5; attempt += 1) {
  const before = ForeverSocket.instances.length;
  foreverClock.advance(transport.RECONNECT_CEILING_MS);
  if (ForeverSocket.instances.length > before) ForeverSocket.instances.at(-1).close();
}
assert.equal(
  ForeverSocket.instances.length,
  expectedRetries + 1,
  "a non-finite window is refused and the default window applies, so the ladder still gives up"
);

// --- a nonsense knob must not hand back a transport with no bounds ---
// Production passes no options at all, so this guards the test seam: Infinity survived Number()
// on every timing knob, and an array hole became a NaN rung that cost no budget. Both produced a
// transport that could never probe, never expire a probe, or never give up.
const junkClock = fakeClock();
const JunkSocket = makeSocketClass({ lingering: false });
transport.create({
  chrome: makeChrome({ [globalThis.DacBridgePairingCore.PAIRING_STORAGE_KEY]: pairing }),
  WebSocket: JunkSocket,
  timers: junkClock,
  keepalive_ms: Infinity,
  keepalive_ack_timeout_ms: Number.NaN,
  handshake_timeout_ms: -1,
  reconnect_delays_ms: new Array(2)
});
await settle();

const junk = JunkSocket.instances[0];
junk.emit("open");
junk.emit("message", authOk("junk-1"));
await settle();
junkClock.advance(transport.KEEPALIVE_MS);
assert.equal(
  junk.sent.at(-1).type,
  "keepalive",
  "an Infinity probe period falls back to the default rather than disabling probing outright"
);
junkClock.advance(transport.KEEPALIVE_ACK_TIMEOUT_MS);
assert.equal(
  junk.readyState,
  JunkSocket.CLOSED,
  "a NaN ACK deadline falls back to the default rather than letting an unanswered probe hang forever"
);

const junkSocketsBeforeRetry = JunkSocket.instances.length;
junkClock.advance(transport.RECONNECT_DELAYS_MS[0] - 1);
assert.equal(JunkSocket.instances.length, junkSocketsBeforeRetry, "nothing retries before the default first rung");
junkClock.advance(1);
assert.equal(
  JunkSocket.instances.length,
  junkSocketsBeforeRetry + 1,
  "an all-holes ladder falls back to the default ladder rather than becoming NaN rungs that cost no budget"
);

console.log("bridge transport liveness smoke tests: PASS");
