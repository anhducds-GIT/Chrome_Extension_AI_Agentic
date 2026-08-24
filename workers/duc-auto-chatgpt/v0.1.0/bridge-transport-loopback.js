(() => {
  "use strict";

  const EXECUTOR_PORT_NAME = "dac.bridge.executor.v1";
  const RECONNECT_ALARM = "dac.bridge.loopback.reconnect.v1";
  const KEEPALIVE_MS = 20000;

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
      if (message?.type === "auth_ok" && typeof message.session_id === "string") {
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
        candidate.send(JSON.stringify({ type: "auth", role: "extension", token: pairing.token }));
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
    EXECUTOR_PORT_NAME, RECONNECT_ALARM, KEEPALIVE_MS, create
  });
})();
