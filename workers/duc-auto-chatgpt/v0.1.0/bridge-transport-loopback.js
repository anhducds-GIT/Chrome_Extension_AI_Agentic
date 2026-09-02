(() => {
  "use strict";

  const EXECUTOR_PORT_NAME = "dac.bridge.executor.v1";
  const RECONNECT_ALARM = "dac.bridge.loopback.reconnect.v1";
  const KEEPALIVE_MS = 20000;
  // Liveness and recovery, ported from duc-auto-gemini (3514aa5 + 4789754) and layered on top of
  // this branch's own handshake -- not copied over it. The probe period was already here; what was
  // missing is any deadline on the answer, so a half-open socket kept reporting connected.
  const KEEPALIVE_ACK_TIMEOUT_MS = 10000;
  const HANDSHAKE_TIMEOUT_MS = 10000;
  const RECONNECT_CEILING_MS = 5000;
  const RECONNECT_DELAYS_MS = Object.freeze([1000, 2000, RECONNECT_CEILING_MS]);
  const RECONNECT_WINDOW_MS = 120000;
  // Multi-profile identity (BRIDGE-MULTIPROFILE-DESIGN-V1, approved 2026-08-28;
  // ported from gg-flow-video). chrome.storage.local is PER Chrome profile, so
  // the id persisted here is a stable per-profile identity; the label is the
  // human name the owner typed in the side panel. Routing metadata only —
  // never authentication; the challenge handshake is untouched.
  const INSTANCE_STORAGE_KEY = "dac.bridge.instance.v1";
  const INSTANCE_LABEL_STORAGE_KEY = "dac.bridge.instance_label.v1";
  const INSTANCE_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;
  const INSTANCE_LABEL_STRIP = new RegExp("[\\u0000-\\u001f\\u007f]", "g");
  const WORKER_ID = "duc-auto-chatgpt";

  function base64Url(bytes) {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function base64UrlBytes(value) {
    const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  }

  function freshNonce() {
    const bytes = new Uint8Array(32);
    globalThis.crypto.getRandomValues(bytes);
    return base64Url(bytes);
  }

  async function verifyHostProof(token, nonce, proof) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(String(proof || ""))) return false;
    try {
      const key = await globalThis.crypto.subtle.importKey("raw", base64UrlBytes(token), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
      return globalThis.crypto.subtle.verify("HMAC", key, base64UrlBytes(proof), new TextEncoder().encode(nonce));
    } catch (_) { return false; }
  }

  function create(options = {}) {
    const chromeApi = options.chrome || globalThis.chrome;
    const WebSocketApi = options.WebSocket || globalThis.WebSocket;
    const core = options.core || globalThis.DacBridgeCore;
    const pairingCore = options.pairing_core || globalThis.DacBridgePairingCore;
    const routerCore = options.router_core || globalThis.DacBridgeRouterCore;
    if (!chromeApi || !WebSocketApi || !core || !pairingCore || !routerCore) throw new TypeError("Loopback transport dependencies are unavailable.");

    // Timing is injectable so liveness and backoff are testable without real waiting. Production
    // passes no options at all (background.js), so this normalization guards the test seam and any
    // future caller -- a seam that quietly accepts Infinity, NaN or a hole hands back a transport
    // with no bounds at all, which is worse than refusing the value.
    const MAX_TIMING_MS = 86400000;
    function timingMs(value, fallback) {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed > 0 ? Math.min(MAX_TIMING_MS, parsed) : fallback;
    }

    const timers = options.timers || globalThis;
    const keepaliveMs = timingMs(options.keepalive_ms, KEEPALIVE_MS);
    const keepaliveAckTimeoutMs = timingMs(options.keepalive_ack_timeout_ms, KEEPALIVE_ACK_TIMEOUT_MS);
    const handshakeTimeoutMs = timingMs(options.handshake_timeout_ms, HANDSHAKE_TIMEOUT_MS);
    // Coerced once, holes and non-numbers dropped; if nothing usable is left the default ladder
    // stands. Bounded by construction: no rung may exceed the ceiling or cost less than a millisecond.
    const configuredDelays = Array.isArray(options.reconnect_delays_ms)
      ? options.reconnect_delays_ms.map((value) => Number(value)).filter(Number.isFinite)
      : [];
    const reconnectDelays = (configuredDelays.length ? configuredDelays : RECONNECT_DELAYS_MS)
      .map((value) => Math.min(RECONNECT_CEILING_MS, Math.max(1, value)));
    const reconnectWindowMs = timingMs(options.reconnect_window_ms, RECONNECT_WINDOW_MS);

    // Chrome hands back a numeric id; Node hands back a Timeout that holds the process open.
    // Unref where it exists so a headless run can still exit, with no behaviour change in the
    // browser, where there is nothing to unref.
    function armTimer(kind, callback, delay) {
      const handle = timers[kind](callback, delay);
      if (handle && typeof handle.unref === "function") handle.unref();
      return handle;
    }

    let pairing = null;
    let socket = null;
    let authenticated = false;
    let handshakeNonce = null;
    let hostProofVerified = false;
    let tokenSent = false;
    // tokenSent flips BEFORE the identity read (replay protection); authSent
    // flips only after the auth frame actually left the socket. auth_ok is
    // acceptable only after authSent — a host answering earlier is broken or
    // hostile and must not cancel the pending handshake state.
    let authSent = false;
    // A socket authenticates once. Without this, an auth_ok the browser had already queued could
    // resurrect a socket the ACK deadline just judged dead, and a host repeating auth_ok under the
    // probe period would restart the keepalive interval so no probe ever fires.
    const settledSockets = new WeakSet();
    let keepaliveTimer = null;
    let keepaliveDeadlineTimer = null;
    let reconnectTimer = null;
    let reconnectAttempt = 0;
    // Summed from the delays we scheduled, not from a clock, so the transport stays testable
    // against an injected clock.
    let reconnectElapsedMs = 0;
    let handshakeTimer = null;
    let statusSequence = 0;
    let statusWrites = Promise.resolve();
    // Pairing edits are separate async handlers mutating the same field and the same storage key.
    // They run one at a time: an epoch check orders their continuations but not their writes.
    let pairingWork = Promise.resolve();
    function queuePairingWork(work) {
      const run = pairingWork.then(work, work);
      pairingWork = run.then(() => {}, () => {});
      return run;
    }
    let executorPort = null;
    let executorEpoch = null;
    const executorPending = new Map();
    const extensionSessionId = `worker-${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`;

    function safeStatus(state, errorCode = null) {
      return {
        schema_version: 1,
        state,
        paired: Boolean(pairing),
        endpoint: pairing ? pairingCore.publicPairing(pairing) : null,
        executor: { available: Boolean(executorPort && executorEpoch), executor_epoch: executorEpoch },
        error_code: errorCode,
        updated_at: new Date().toISOString()
      };
    }

    // One honest reading of the current state. Being authenticated is not the same as being
    // connected: a socket that is no longer OPEN is not a connection.
    function currentState() {
      if (!pairing) return "unpaired";
      if (authenticated && socket && socket.readyState === WebSocketApi.OPEN) return "connected";
      return socket && socket.readyState === WebSocketApi.CONNECTING ? "connecting" : "disconnected";
    }

    // Storage writes are not ordered by the API, so they are serialized here and a write that a
    // newer status has already superseded is dropped rather than allowed to land last.
    async function publishStatus(state, errorCode = null) {
      const status = safeStatus(state, errorCode);
      const sequence = ++statusSequence;
      statusWrites = statusWrites.then(async () => {
        if (sequence !== statusSequence) return;
        try { await chromeApi.storage.local.set({ [pairingCore.STATUS_STORAGE_KEY]: status }); } catch (_) { /* Status is advisory only. */ }
      });
      await statusWrites;
      return status;
    }

    function clearKeepaliveDeadline() {
      if (keepaliveDeadlineTimer) timers.clearTimeout(keepaliveDeadlineTimer);
      keepaliveDeadlineTimer = null;
    }

    function clearKeepalive() {
      if (keepaliveTimer) timers.clearInterval(keepaliveTimer);
      keepaliveTimer = null;
      clearKeepaliveDeadline();
    }

    function clearReconnect() {
      if (reconnectTimer) timers.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    function clearHandshakeDeadline() {
      if (handshakeTimer) timers.clearTimeout(handshakeTimer);
      handshakeTimer = null;
    }

    function resetHandshakeState() {
      handshakeNonce = null;
      hostProofVerified = false;
      tokenSent = false;
      authSent = false;
    }

    // An unanswered probe means the socket is half-open: still "open" to us, already gone to the
    // host. Give up on it so status stops lying and recovery can start.
    function armKeepaliveDeadline(targetSocket) {
      if (keepaliveDeadlineTimer) return;
      keepaliveDeadlineTimer = armTimer("setTimeout", () => {
        keepaliveDeadlineTimer = null;
        if (socket !== targetSocket) return;
        // The probe period and this deadline are waits we scheduled, so they are charged to the
        // give-up window like the handshake deadline is. Otherwise a host that authenticates and
        // then never answers a probe repeats a ~30s cycle while paying only the reconnect delay,
        // and the window stretches to many minutes. An answered probe resets the budget anyway.
        //
        // This is an UPPER BOUND on the wait, not a clock reading: the interval keeps its own
        // cadence, so a late ACK that resets the budget mid-interval still gets the full period
        // charged on the next miss. That errs toward handing over to the alarm sooner, which is
        // the safe direction for a budget whose whole purpose is to stop holding the worker awake.
        // Reading a real clock would be exact but would make every deadline here untestable
        // against the injected one.
        reconnectElapsedMs += keepaliveMs + keepaliveAckTimeoutMs;
        abandonSocket(targetSocket, 1000, "Keepalive ACK deadline exceeded.");
      }, keepaliveAckTimeoutMs);
    }

    function startKeepalive(targetSocket) {
      clearKeepalive();
      keepaliveTimer = armTimer("setInterval", () => {
        if (socket !== targetSocket || !authenticated) return;
        if (targetSocket.readyState !== WebSocketApi.OPEN) {
          // We still own an authenticated socket that is no longer open, so its close event is
          // late or missing. Bound the wait at one probe period instead of trusting the event.
          abandonSocket(targetSocket, 1000, "Socket left OPEN without a close event.");
          return;
        }
        targetSocket.send(JSON.stringify({ type: "keepalive", sent_at: new Date().toISOString() }));
        armKeepaliveDeadline(targetSocket);
      }, keepaliveMs);
    }

    // One pending reconnect at a time. The 30-second alarm stays the fallback for a missed close
    // event; it cannot rescue a socket wedged mid-handshake, which is what the handshake deadline
    // below is for. Past the window the host is not coming back in a hurry, so stop holding the
    // worker awake for it and let the alarm carry on alone.
    function scheduleReconnect() {
      if (!pairing || authenticated || reconnectTimer) return;
      if (reconnectElapsedMs >= reconnectWindowMs) return;
      const delay = reconnectDelays[Math.min(reconnectAttempt, reconnectDelays.length - 1)];
      reconnectAttempt += 1;
      reconnectElapsedMs += delay;
      reconnectTimer = armTimer("setTimeout", () => {
        reconnectTimer = null;
        if (!pairing || authenticated) return;
        connectHost().catch(() => publishStatus("disconnected", "HOST_UNAVAILABLE"));
      }, delay);
    }

    function dropSocket(targetSocket) {
      if (socket !== targetSocket) return false;
      socket = null;
      authenticated = false;
      resetHandshakeState();
      clearKeepalive();
      clearHandshakeDeadline();
      scheduleReconnect();
      publishStatus(pairing ? "disconnected" : "unpaired", pairing ? "HOST_UNAVAILABLE" : null);
      return true;
    }

    // Give up ownership BEFORE asking the browser to close: a socket can sit in CLOSING for as
    // long as the peer stays silent, and recovery must not wait on an event that may never come.
    function abandonSocket(targetSocket, code, reason) {
      dropSocket(targetSocket);
      try { targetSocket.close(code, reason); }
      catch (_) { /* Recovery above does not depend on the close succeeding. */ }
    }

    function closeSocket() {
      clearKeepalive();
      clearReconnect();
      clearHandshakeDeadline();
      authenticated = false;
      resetHandshakeState();
      const current = socket;
      socket = null;
      try { current?.close?.(1000, "Reconnect requested."); } catch (_) { /* Best effort. */ }
    }

    function failExecutorPending(code = "EXECUTOR_UNAVAILABLE") {
      for (const [routeId, pending] of executorPending) {
        executorPending.delete(routeId);
        clearTimeout(pending.timer);
        pending.reject(new core.BridgeProtocolError(code));
      }
    }

    function sendExecutor(request, values = {}) {
      if (!executorPort || !executorEpoch) return Promise.reject(new core.BridgeProtocolError("EXECUTOR_UNAVAILABLE"));
      const routeId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      const deadline = Math.max(1000, Number(values.deadline_ms || 10000));
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          executorPending.delete(routeId);
          reject(new core.BridgeProtocolError("REQUEST_TIMEOUT"));
        }, deadline);
        executorPending.set(routeId, { resolve, reject, timer });
        try { executorPort.postMessage({ type: "DAC_BRIDGE_RPC", route_id: routeId, envelope: request }); }
        catch (_) {
          clearTimeout(timer);
          executorPending.delete(routeId);
          reject(new core.BridgeProtocolError("EXECUTOR_UNAVAILABLE"));
        }
      });
    }

    const router = routerCore.createRouter({
      core,
      extension_id: chromeApi.runtime.id,
      session_id: extensionSessionId,
      executor_state: () => ({ available: Boolean(executorPort && executorEpoch), executor_epoch: executorEpoch }),
      send_executor: sendExecutor
    });

    function sanitizeInstanceLabel(value) {
      return typeof value === "string" ? value.replace(INSTANCE_LABEL_STRIP, "").trim().slice(0, 64) : "";
    }

    async function loadInstance() {
      const stored = await chromeApi.storage.local.get([INSTANCE_STORAGE_KEY, INSTANCE_LABEL_STORAGE_KEY]);
      let record = stored?.[INSTANCE_STORAGE_KEY];
      if (!record || typeof record !== "object" || typeof record.instance_id !== "string" || !INSTANCE_ID_PATTERN.test(record.instance_id)) {
        record = {
          schema_version: 1,
          instance_id: globalThis.crypto?.randomUUID?.() || `inst-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`,
          created_at: new Date().toISOString()
        };
        await chromeApi.storage.local.set({ [INSTANCE_STORAGE_KEY]: record });
      }
      return {
        schema_version: 1,
        instance_id: record.instance_id,
        label: sanitizeInstanceLabel(stored?.[INSTANCE_LABEL_STORAGE_KEY]),
        worker: WORKER_ID,
        extension_version: chromeApi.runtime?.getManifest?.()?.version || "0.0.0"
      };
    }

    async function handleSocketMessage(event, targetSocket) {
      let message;
      try {
        if (typeof event.data !== "string" || new TextEncoder().encode(event.data).byteLength > core.LIMITS.max_envelope_bytes + 8192) throw new Error("invalid transport frame");
        message = JSON.parse(event.data);
      } catch (_) {
        abandonSocket(targetSocket, 1007, "Text JSON required.");
        return;
      }
      if (socket !== targetSocket) return;
      if (!authenticated && message?.type === "auth_proof" && typeof message.proof === "string" && handshakeNonce && !hostProofVerified && !tokenSent) {
        const verified = await verifyHostProof(pairing.token, handshakeNonce, message.proof);
        if (socket !== targetSocket || !verified) {
          abandonSocket(targetSocket, 1008, "Host authentication failed.");
          return;
        }
        hostProofVerified = true;
        tokenSent = true;
        // Identity is read fresh per connect so a label the owner just typed
        // takes effect at the very next (re)connect. tokenSent is already set,
        // so a replayed auth_proof during this await stays ignored; the socket
        // guard re-runs after the read. A storage failure degrades to a legacy
        // (no-instance) auth — routing stays fail-closed either way.
        const instance = await loadInstance().catch(() => null);
        if (socket !== targetSocket || targetSocket.readyState !== WebSocketApi.OPEN) return;
        const auth = { type: "auth", role: "extension", token: pairing.token };
        if (instance) auth.instance = instance;
        targetSocket.send(JSON.stringify(auth));
        authSent = true;
        return;
      }
      if (message?.type === "auth_ok" && typeof message.session_id === "string") {
        // The branch's own handshake contract is unchanged: auth_ok counts only after the host
        // proved itself and our auth frame actually left the socket. Added on top: it counts only
        // from a socket that is genuinely open, and only once per socket.
        if (!hostProofVerified || !tokenSent || !authSent
          || targetSocket.readyState !== WebSocketApi.OPEN || settledSockets.has(targetSocket)) {
          abandonSocket(targetSocket, 1008, "Unexpected authentication frame.");
          return;
        }
        settledSockets.add(targetSocket);
        authenticated = true;
        clearHandshakeDeadline();
        clearReconnect();
        // Armed before the status write: liveness must not depend on storage succeeding.
        startKeepalive(targetSocket);
        await publishStatus("connected");
        return;
      }
      if (!authenticated) {
        abandonSocket(targetSocket, 1008, "Host authentication is not complete.");
        return;
      }
      if (message?.type === "keepalive_ack") {
        // Only an ACK that answers an outstanding probe is a completed round trip, and only that
        // is evidence the link carries traffic. An unsolicited one refills nothing.
        if (!keepaliveDeadlineTimer) return;
        clearKeepaliveDeadline();
        reconnectAttempt = 0;
        reconnectElapsedMs = 0;
        return;
      }
      if (message?.type !== "rpc" || typeof message.relay_id !== "string" || !message.envelope) {
        abandonSocket(targetSocket, 1008, "Unsupported host transport message.");
        return;
      }
      const response = await router.route(message.envelope);
      if (socket === targetSocket && authenticated && targetSocket.readyState === WebSocketApi.OPEN) {
        targetSocket.send(JSON.stringify({ type: "rpc_response", relay_id: message.relay_id, envelope: response }));
      }
    }

    async function connectHost() {
      if (!pairing || socket && [WebSocketApi.OPEN, WebSocketApi.CONNECTING].includes(socket.readyState)) {
        return safeStatus(currentState());
      }
      clearReconnect();
      // Every timer belonging to the socket being replaced goes with it: one slot, one timer.
      clearHandshakeDeadline();
      clearKeepalive();
      // Replacing a socket voids whatever authentication and handshake state the old one had.
      authenticated = false;
      resetHandshakeState();
      // The socket is claimed before the first await so a scheduled reconnect cannot race a second
      // socket into existence between the status write and the constructor.
      const candidate = new WebSocketApi(pairing.websocket_url);
      socket = candidate;
      // Covers the whole handshake -- still CONNECTING, or open but never carried through
      // challenge/proof/auth to auth_ok. The alarm rescues neither, because connectHost replaces
      // neither state.
      handshakeTimer = armTimer("setTimeout", () => {
        handshakeTimer = null;
        if (socket !== candidate || authenticated) return;
        // The wait we just spent counts against the give-up window too. Counting only the delays
        // BETWEEN attempts would let a host that accepts connections and never answers hold the
        // worker awake for several times the window the code claims to enforce.
        reconnectElapsedMs += handshakeTimeoutMs;
        abandonSocket(candidate, 1000, "Handshake deadline exceeded.");
      }, handshakeTimeoutMs);
      candidate.addEventListener("open", () => {
        if (socket !== candidate) return;
        handshakeNonce = freshNonce();
        hostProofVerified = false;
        tokenSent = false;
        authSent = false;
        candidate.send(JSON.stringify({ type: "auth_challenge", role: "extension", nonce: handshakeNonce }));
      });
      candidate.addEventListener("message", (event) => {
        handleSocketMessage(event, candidate).catch(() => abandonSocket(candidate, 1011, "Router failure."));
      });
      candidate.addEventListener("close", () => { dropSocket(candidate); });
      candidate.addEventListener("error", () => { /* close publishes the fail-closed state without secret-bearing details. */ });
      return publishStatus("connecting");
    }

    function loadPairing() {
      return queuePairingWork(loadPairingNow);
    }

    async function loadPairingNow() {
      const stored = await chromeApi.storage.local.get(pairingCore.PAIRING_STORAGE_KEY);
      const candidate = stored?.[pairingCore.PAIRING_STORAGE_KEY];
      if (!candidate) {
        pairing = null;
        closeSocket();
        return publishStatus("unpaired");
      }
      try {
        pairing = pairingCore.validate(candidate);
      } catch (_) {
        pairing = null;
        closeSocket();
        return publishStatus("pairing_invalid", "PAIRING_FILE_INVALID");
      }
      await connectHost();
      return safeStatus(currentState());
    }

    chromeApi.runtime.onConnect.addListener((port) => {
      if (port.name !== EXECUTOR_PORT_NAME) return;
      if (executorPort && executorPort !== port) {
        try { executorPort.disconnect(); } catch (_) { /* Fresh panel replaces stale executor. */ }
      }
      executorPort = port;
      executorEpoch = null;
      port.onMessage.addListener((message) => {
        if (executorPort !== port) return;
        if (message?.type === "DAC_BRIDGE_EXECUTOR_READY" && message.protocol === core.PROTOCOL && message.version === 1 && typeof message.executor_epoch === "string") {
          executorEpoch = message.executor_epoch;
          publishStatus(currentState());
          return;
        }
        if (message?.type === "DAC_BRIDGE_RPC_RESPONSE" && typeof message.route_id === "string") {
          const pending = executorPending.get(message.route_id);
          if (!pending) return;
          executorPending.delete(message.route_id);
          clearTimeout(pending.timer);
          try { pending.resolve(core.parseResponse(message.envelope)); }
          catch (error) { pending.reject(error); }
        }
      });
      port.onDisconnect.addListener(() => {
        if (executorPort !== port) return;
        executorPort = null;
        executorEpoch = null;
        failExecutorPending("EXECUTOR_UNAVAILABLE");
        publishStatus(currentState());
      });
    });

    chromeApi.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type === "DAC_BRIDGE_PAIRING_SET") {
        queuePairingWork(async () => {
          const validated = pairingCore.validate(message.pairing);
          await chromeApi.storage.local.set({ [pairingCore.PAIRING_STORAGE_KEY]: validated });
          pairing = validated;
          closeSocket();
          await connectHost();
          return safeStatus(currentState());
        }).then((status) => sendResponse({ ok: true, status })).catch(() => sendResponse({ ok: false, code: "PAIRING_FILE_INVALID" }));
        return true;
      }
      if (message?.type === "DAC_BRIDGE_PAIRING_REMOVE") {
        queuePairingWork(async () => {
          pairing = null;
          closeSocket();
          await chromeApi.storage.local.remove(pairingCore.PAIRING_STORAGE_KEY);
          return publishStatus("unpaired");
        }).then((status) => sendResponse({ ok: true, status })).catch(() => sendResponse({ ok: false, code: "PAIRING_REMOVE_FAILED" }));
        return true;
      }
      if (message?.type === "DAC_BRIDGE_STATUS_GET") {
        sendResponse({ ok: true, status: safeStatus(currentState()) });
        return false;
      }
      return false;
    });

    chromeApi.alarms.onAlarm.addListener((alarm) => {
      if (alarm?.name === RECONNECT_ALARM && pairing && !authenticated) connectHost().catch(() => publishStatus("disconnected", "HOST_UNAVAILABLE"));
    });
    chromeApi.alarms.create(RECONNECT_ALARM, { periodInMinutes: 0.5 });

    loadPairing().catch(() => publishStatus("pairing_invalid", "PAIRING_FILE_INVALID"));
    return Object.freeze({ connectHost, loadPairing, status: () => safeStatus(currentState()), router });
  }

  (typeof window !== "undefined" ? window : globalThis).DacBridgeLoopbackTransport = Object.freeze({
    EXECUTOR_PORT_NAME, RECONNECT_ALARM, KEEPALIVE_MS, KEEPALIVE_ACK_TIMEOUT_MS, HANDSHAKE_TIMEOUT_MS,
    RECONNECT_CEILING_MS, RECONNECT_DELAYS_MS, RECONNECT_WINDOW_MS, verifyHostProof, create
  });
})();
