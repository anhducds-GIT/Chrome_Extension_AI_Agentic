(() => {
  "use strict";

  const EXECUTOR_PORT_NAME = "dac.bridge.executor.v1";
  const RECONNECT_ALARM = "dac.bridge.loopback.reconnect.v1";
  const KEEPALIVE_MS = 20000;
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
    let keepaliveTimer = null;
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

    async function publishStatus(state, errorCode = null) {
      const status = safeStatus(state, errorCode);
      try { await chromeApi.storage.local.set({ [pairingCore.STATUS_STORAGE_KEY]: status }); } catch (_) { /* Status is advisory only. */ }
      return status;
    }

    function clearKeepalive() {
      if (keepaliveTimer) clearInterval(keepaliveTimer);
      keepaliveTimer = null;
    }

    function closeSocket() {
      clearKeepalive();
      authenticated = false;
      handshakeNonce = null;
      hostProofVerified = false;
      tokenSent = false;
      authSent = false;
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
        targetSocket.close(1007, "Text JSON required.");
        return;
      }
      if (socket !== targetSocket) return;
      if (!authenticated && message?.type === "auth_proof" && typeof message.proof === "string" && handshakeNonce && !hostProofVerified && !tokenSent) {
        const verified = await verifyHostProof(pairing.token, handshakeNonce, message.proof);
        if (socket !== targetSocket || !verified) {
          targetSocket.close(1008, "Host authentication failed.");
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
      if (message?.type === "auth_ok" && typeof message.session_id === "string" && hostProofVerified && tokenSent && authSent) {
        authenticated = true;
        await publishStatus("connected");
        clearKeepalive();
        keepaliveTimer = setInterval(() => {
          if (socket === targetSocket && authenticated && targetSocket.readyState === WebSocketApi.OPEN) {
            targetSocket.send(JSON.stringify({ type: "keepalive", sent_at: new Date().toISOString() }));
          }
        }, KEEPALIVE_MS);
        return;
      }
      if (!authenticated) {
        targetSocket.close(1008, "Host authentication is not complete.");
        return;
      }
      if (message?.type === "keepalive_ack") return;
      if (message?.type !== "rpc" || typeof message.relay_id !== "string" || !message.envelope) {
        targetSocket.close(1008, "Unsupported host transport message.");
        return;
      }
      const response = await router.route(message.envelope);
      if (socket === targetSocket && authenticated && targetSocket.readyState === WebSocketApi.OPEN) {
        targetSocket.send(JSON.stringify({ type: "rpc_response", relay_id: message.relay_id, envelope: response }));
      }
    }

    async function connectHost() {
      if (!pairing || socket && [WebSocketApi.OPEN, WebSocketApi.CONNECTING].includes(socket.readyState)) return;
      await publishStatus("connecting");
      const candidate = new WebSocketApi(pairing.websocket_url);
      socket = candidate;
      candidate.addEventListener("open", () => {
        if (socket !== candidate) return;
        handshakeNonce = freshNonce();
        hostProofVerified = false;
        tokenSent = false;
        authSent = false;
        candidate.send(JSON.stringify({ type: "auth_challenge", role: "extension", nonce: handshakeNonce }));
      });
      candidate.addEventListener("message", (event) => {
        handleSocketMessage(event, candidate).catch(() => candidate.close(1011, "Router failure."));
      });
      candidate.addEventListener("close", () => {
        if (socket !== candidate) return;
        socket = null;
        authenticated = false;
        clearKeepalive();
        publishStatus(pairing ? "disconnected" : "unpaired", pairing ? "HOST_UNAVAILABLE" : null);
      });
      candidate.addEventListener("error", () => { /* close publishes the fail-closed state without secret-bearing details. */ });
    }

    async function loadPairing() {
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
      return safeStatus(authenticated ? "connected" : "connecting");
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
          publishStatus(authenticated ? "connected" : pairing ? "connecting" : "unpaired");
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
        publishStatus(authenticated ? "connected" : pairing ? "disconnected" : "unpaired");
      });
    });

    chromeApi.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type === "DAC_BRIDGE_PAIRING_SET") {
        Promise.resolve().then(async () => {
          const validated = pairingCore.validate(message.pairing);
          await chromeApi.storage.local.set({ [pairingCore.PAIRING_STORAGE_KEY]: validated });
          pairing = validated;
          closeSocket();
          await connectHost();
          return safeStatus("connecting");
        }).then((status) => sendResponse({ ok: true, status })).catch(() => sendResponse({ ok: false, code: "PAIRING_FILE_INVALID" }));
        return true;
      }
      if (message?.type === "DAC_BRIDGE_PAIRING_REMOVE") {
        Promise.resolve().then(async () => {
          pairing = null;
          closeSocket();
          await chromeApi.storage.local.remove(pairingCore.PAIRING_STORAGE_KEY);
          return publishStatus("unpaired");
        }).then((status) => sendResponse({ ok: true, status })).catch(() => sendResponse({ ok: false, code: "PAIRING_REMOVE_FAILED" }));
        return true;
      }
      if (message?.type === "DAC_BRIDGE_STATUS_GET") {
        sendResponse({ ok: true, status: safeStatus(authenticated ? "connected" : pairing ? "disconnected" : "unpaired") });
        return false;
      }
      return false;
    });

    chromeApi.alarms.onAlarm.addListener((alarm) => {
      if (alarm?.name === RECONNECT_ALARM && pairing && !authenticated) connectHost().catch(() => publishStatus("disconnected", "HOST_UNAVAILABLE"));
    });
    chromeApi.alarms.create(RECONNECT_ALARM, { periodInMinutes: 0.5 });

    loadPairing().catch(() => publishStatus("pairing_invalid", "PAIRING_FILE_INVALID"));
    return Object.freeze({ connectHost, loadPairing, status: () => safeStatus(authenticated ? "connected" : pairing ? "disconnected" : "unpaired"), router });
  }

  (typeof window !== "undefined" ? window : globalThis).DacBridgeLoopbackTransport = Object.freeze({
    EXECUTOR_PORT_NAME, RECONNECT_ALARM, KEEPALIVE_MS, verifyHostProof, create
  });
})();
