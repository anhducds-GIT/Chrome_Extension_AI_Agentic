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
  // Lives in chrome.storage.session: present = same browser session as the
  // last workspace load, absent = Chrome restarted and every stored tab_id is
  // potentially someone else's tab now.
  const WORKSPACE_SESSION_MARK_KEY = "dac.bridge.workspaces.session_mark.v1";
  const INSTANCE_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;
  const INSTANCE_LABEL_STRIP = new RegExp("[\\u0000-\\u001f\\u007f-\\u009f]", "g");
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
    // Workspaces (MULTI-SESSION-PER-PROFILE-DESIGN-V1, direction A) are an
    // optional layer: without the core module the transport is exactly the
    // single-seat transport it always was. Production loads it (background.js
    // importScripts, pinned by the static test); the guard is for harnesses.
    const workspaceCore = options.workspace_core || globalThis.DacBridgeWorkspaceCore || null;

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
    // Workspace edits are the same shape of hazard (read-modify-write on one
    // storage key from several async handlers), so they get the same cure.
    let workspaceWork = Promise.resolve();
    function queueWorkspaceWork(work) {
      const run = workspaceWork.then(work, work);
      workspaceWork = run.then(() => {}, () => {});
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

    function failExecutorPending(code = "EXECUTOR_UNAVAILABLE") {
      for (const [routeId, pending] of executorPending) {
        executorPending.delete(routeId);
        clearTimeout(pending.timer);
        pending.reject(new core.BridgeProtocolError(code));
      }
    }

    // `workspace` rides the PORT message, not the protocol envelope: the wire
    // schema, the host, and the CLI stay untouched. The panel reads it to bind
    // tab-scoped methods to the workspace's own tab instead of the active one.
    function sendExecutor(request, values = {}, workspace = null) {
      if (!executorPort || !executorEpoch) return Promise.reject(new core.BridgeProtocolError("EXECUTOR_UNAVAILABLE"));
      const routeId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      const deadline = Math.max(1000, Number(values.deadline_ms || 10000));
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          executorPending.delete(routeId);
          reject(new core.BridgeProtocolError("REQUEST_TIMEOUT"));
        }, deadline);
        executorPending.set(routeId, { resolve, reject, timer });
        const message = { type: "DAC_BRIDGE_RPC", route_id: routeId, envelope: request };
        if (workspace) message.workspace = { workspace_id: workspace.workspace_id, name: workspace.name, tab_id: workspace.tab_id };
        try { executorPort.postMessage(message); }
        catch (_) {
          clearTimeout(timer);
          executorPending.delete(routeId);
          reject(new core.BridgeProtocolError("EXECUTOR_UNAVAILABLE"));
        }
      });
    }

    const executorStateFn = () => ({ available: Boolean(executorPort && executorEpoch), executor_epoch: executorEpoch });

    const router = routerCore.createRouter({
      core,
      extension_id: chromeApi.runtime.id,
      session_id: extensionSessionId,
      executor_state: executorStateFn,
      send_executor: sendExecutor
    });

    function sanitizeInstanceLabel(value) {
      // Bound BEFORE scanning (O(cap), not O(input)); the caps cut by UTF-16
      // code unit, so sweep lone surrogates to keep the label well-formed.
      const raw = typeof value === "string" ? value.slice(0, 256) : "";
      return raw.replace(INSTANCE_LABEL_STRIP, "").trim().slice(0, 64).replace(/(?:[\uD800-\uDBFF](?![\uDC00-\uDFFF]))|(?:(?<![\uD800-\uDBFF])[\uDC00-\uDFFF])/g, "");
    }

    // Identity reads are SERIALIZED: several seats authenticate concurrently
    // now, and two first-run reads racing the create-if-missing write would
    // mint two different profile ids — one announced, the other persisted, so
    // the profile's routing identity would silently change on its next
    // reconnect (audit 03/09, MED). One at a time, same cure as pairing edits.
    let instanceWork = Promise.resolve();
    function queueInstanceWork(work) {
      const run = instanceWork.then(work, work);
      instanceWork = run.then(() => {}, () => {});
      return run;
    }

    function loadInstance() {
      return queueInstanceWork(loadInstanceNow);
    }

    async function loadInstanceNow() {
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

    async function workspaceTabUsable(tabId) {
      if (tabId === null || tabId === undefined) return false;
      const tabsApi = chromeApi.tabs;
      if (!workspaceCore || !tabsApi || typeof tabsApi.get !== "function") return false;
      try {
        const tab = await tabsApi.get(tabId);
        return Boolean(tab?.id) && workspaceCore.isProviderTabUrl(tab.url || tab.pendingUrl || "");
      } catch (_) { return false; }
    }

    // One seat = one socket = one identity on the host. The profile seat is the
    // transport as it has always been (it alone publishes the status the panel
    // reads); workspace seats are additional named connections, one per
    // owner-declared work session, each bound to one tab. The host cannot tell
    // them apart from profiles, which is the whole point of direction A: the
    // routing, fail-closed ambiguity rules, served_by, and bridge.sessions all
    // apply unchanged.
    function createSeat(spec) {
      const isProfile = spec.kind === "profile";
      let workspaceRecord = isProfile ? null : spec.workspace;
      let retired = false;

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

      // Workspace seats do not own the profile-level status record; their
      // state is reported through the workspace listing instead.
      function publish(state, errorCode = null) {
        return isProfile ? publishStatus(state, errorCode) : Promise.resolve(null);
      }

      const seatRouter = isProfile ? router : routerCore.createRouter({
        core,
        extension_id: chromeApi.runtime.id,
        executor_state: executorStateFn,
        send_executor: (request, values) => sendExecutor(request, values, workspaceRecord)
      });

      // One honest reading of the current state. Being authenticated is not the same as being
      // connected: a socket that is no longer OPEN is not a connection.
      function currentState() {
        if (!pairing) return "unpaired";
        if (authenticated && socket && socket.readyState === WebSocketApi.OPEN) return "connected";
        return socket && socket.readyState === WebSocketApi.CONNECTING ? "connecting" : "disconnected";
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
        if (!pairing || retired || authenticated || reconnectTimer) return;
        if (reconnectElapsedMs >= reconnectWindowMs) return;
        const delay = reconnectDelays[Math.min(reconnectAttempt, reconnectDelays.length - 1)];
        reconnectAttempt += 1;
        reconnectElapsedMs += delay;
        reconnectTimer = armTimer("setTimeout", () => {
          reconnectTimer = null;
          if (!pairing || retired || authenticated) return;
          connectHost().catch(() => publish("disconnected", "HOST_UNAVAILABLE"));
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
        publish(pairing ? "disconnected" : "unpaired", pairing ? "HOST_UNAVAILABLE" : null);
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
          // The pairing this proof is judged against is FROZEN here. If the
          // owner swaps pairing mid-verification, the handler below must not
          // read the fresh global and hand the NEW token to a host that only
          // ever proved knowledge of the OLD one (audit 03/09, HIGH). Primary
          // defense is the synchronous seat close in the pairing handlers;
          // this epoch pin is the belt-and-braces for any future await path.
          const pairingAtProof = pairing;
          const verified = await verifyHostProof(pairingAtProof.token, handshakeNonce, message.proof);
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
          // (no-instance) auth on the profile seat — routing stays fail-closed
          // either way. A workspace seat without its identity is refused
          // outright: an anonymous extra seat would only poison the ambiguity
          // rules it exists to serve.
          const instance = await loadInstance()
            .then((base) => (isProfile ? base : workspaceCore.deriveInstance(base, workspaceRecord)))
            .catch(() => null);
          if (socket !== targetSocket || targetSocket.readyState !== WebSocketApi.OPEN) return;
          if (pairing !== pairingAtProof) {
            abandonSocket(targetSocket, 1008, "Pairing changed during authentication.");
            return;
          }
          if (!isProfile && !instance) {
            abandonSocket(targetSocket, 1008, "Workspace identity unavailable.");
            return;
          }
          const auth = { type: "auth", role: "extension", token: pairingAtProof.token };
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
          await publish("connected");
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
        const response = await seatRouter.route(message.envelope);
        if (socket === targetSocket && authenticated && targetSocket.readyState === WebSocketApi.OPEN) {
          targetSocket.send(JSON.stringify({ type: "rpc_response", relay_id: message.relay_id, envelope: response }));
        }
      }

      async function connectHost() {
        if (retired || !pairing || socket && [WebSocketApi.OPEN, WebSocketApi.CONNECTING].includes(socket.readyState)) {
          return safeStatus(currentState());
        }
        if (!isProfile) {
          // A workspace seat exists only while its tab is a live provider tab:
          // a closed or navigated-away tab must read as TARGET_NOT_CONNECTED on
          // the host, never as a seat that answers for some other tab. The
          // check awaits, so re-guard the slot before claiming it — two
          // concurrent connects must not race two sockets into one seat.
          const usable = await workspaceTabUsable(workspaceRecord.tab_id);
          if (retired || !pairing) return safeStatus(currentState());
          if (socket && [WebSocketApi.OPEN, WebSocketApi.CONNECTING].includes(socket.readyState)) return safeStatus(currentState());
          if (!usable) {
            closeSocket();
            return safeStatus(currentState());
          }
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
        return publish("connecting");
      }

      return {
        connect: connectHost,
        close: closeSocket,
        retire() {
          retired = true;
          closeSocket();
        },
        updateWorkspace(record) { workspaceRecord = record; },
        workspace: () => workspaceRecord,
        isAuthenticated: () => authenticated && socket && socket.readyState === WebSocketApi.OPEN,
        currentState
      };
    }

    const profileSeat = createSeat({ kind: "profile" });
    const workspaceSeats = new Map();
    let workspaceStore = { schema_version: 1, workspaces: [] };

    // Bring the seat map in line with the store: retire seats whose workspace
    // is gone, cycle seats whose name or tab changed (a cycle re-announces the
    // new identity immediately — same owner promise as the Lưu tên button),
    // create and connect seats for new workspaces.
    async function reconcileWorkspaces(nextStore) {
      if (!workspaceCore) return;
      workspaceStore = workspaceCore.normalizeStore(nextStore);
      const wanted = new Map(workspaceStore.workspaces.map((entry) => [entry.workspace_id, entry]));
      for (const [workspaceId, seat] of [...workspaceSeats]) {
        if (!wanted.has(workspaceId)) {
          seat.retire();
          workspaceSeats.delete(workspaceId);
        }
      }
      for (const record of wanted.values()) {
        const existing = workspaceSeats.get(record.workspace_id);
        if (!existing) {
          const seat = createSeat({ kind: "workspace", workspace: record });
          workspaceSeats.set(record.workspace_id, seat);
          if (pairing) await seat.connect().catch(() => {});
          continue;
        }
        const previous = existing.workspace();
        const changed = previous.name !== record.name || previous.tab_id !== record.tab_id;
        existing.updateWorkspace(record);
        if (!pairing) continue;
        if (changed) {
          existing.close();
          await existing.connect().catch(() => {});
        } else if (!existing.isAuthenticated()) {
          await existing.connect().catch(() => {});
        }
      }
    }

    async function workspaceSeatStates() {
      const rows = [];
      for (const record of workspaceStore.workspaces) {
        const seat = workspaceSeats.get(record.workspace_id);
        rows.push({
          workspace_id: record.workspace_id,
          name: record.name,
          tab_id: record.tab_id,
          state: seat ? seat.currentState() : "disconnected",
          tab_alive: await workspaceTabUsable(record.tab_id)
        });
      }
      return rows;
    }

    async function persistWorkspaceStore(store) {
      await chromeApi.storage.local.set({ [workspaceCore.STORAGE_KEY]: store });
    }

    function workspaceUnavailableError() {
      const error = new Error("Workspace module is not loaded.");
      error.code = "WORKSPACES_UNAVAILABLE";
      return error;
    }

    async function loadWorkspacesNow() {
      if (!workspaceCore) return;
      const stored = await chromeApi.storage.local.get(workspaceCore.STORAGE_KEY);
      let store = workspaceCore.normalizeStore(stored?.[workspaceCore.STORAGE_KEY] || { schema_version: 1, workspaces: [] });
      // Chrome tab ids are unique only WITHIN one browser session: after a
      // restart, an unrelated tab can inherit a stored id and a stale binding
      // would hand a workspace's name to a stranger's page (audit 03/09,
      // HIGH). chrome.storage.session survives service-worker restarts but
      // not browser restarts, so a missing mark means a fresh browser session:
      // keep the names, void the tab bindings, let the owner re-attach with
      // one click. Harness note: MV3 guarantees storage.session; when a test
      // harness omits it, bindings are trusted as-is.
      // FAIL CLOSED: only a readable mark proves this is still the browser
      // session the bindings were made in. No session API, or a session API
      // that errors, counts as a restart. (Chrome ships storage.session from
      // 102 and this manifest requires 120, so in production the API exists;
      // the fail-closed default is for every other condition.)
      let freshBrowserSession = true;
      const sessionApi = chromeApi.storage.session;
      if (sessionApi && typeof sessionApi.get === "function") {
        try {
          const mark = await sessionApi.get(WORKSPACE_SESSION_MARK_KEY);
          freshBrowserSession = !mark?.[WORKSPACE_SESSION_MARK_KEY];
        } catch (_) { freshBrowserSession = true; }
      }
      if (freshBrowserSession) {
        // Void FIRST, plant the mark AFTER the voided store is durably
        // written. The other order is not crash-consistent: a planted mark
        // over an un-voided store would make the next worker start trust
        // bindings that were never cleared (audit 03/09 round 2, HIGH).
        if (store.workspaces.some((entry) => entry.tab_id !== null)) {
          store = { schema_version: 1, workspaces: store.workspaces.map((entry) => ({ ...entry, tab_id: null })) };
          await persistWorkspaceStore(store);
        }
        try { await sessionApi?.set?.({ [WORKSPACE_SESSION_MARK_KEY]: new Date().toISOString() }); }
        catch (_) { /* Next start voids again — the safe direction. */ }
      }
      await reconcileWorkspaces(store);
    }

    // Pairing changed out from under every seat: reconnect them all (or, with
    // pairing gone, make sure none of them keeps a socket to the old host).
    async function reconnectAllSeats() {
      if (!pairing) {
        for (const seat of workspaceSeats.values()) seat.close();
        return;
      }
      for (const seat of workspaceSeats.values()) {
        seat.close();
        await seat.connect().catch(() => {});
      }
    }

    // The gentle variant for boot ordering: pairing load and workspace load run
    // on two queues, so whichever lands second just makes sure every seat is on
    // its way up — without cycling sockets that are already mid-handshake.
    async function ensureWorkspaceSeatsConnected() {
      if (!pairing) return;
      for (const seat of workspaceSeats.values()) {
        if (!seat.isAuthenticated()) await seat.connect().catch(() => {});
      }
    }

    function loadPairing() {
      return queuePairingWork(loadPairingNow);
    }

    async function loadPairingNow() {
      const stored = await chromeApi.storage.local.get(pairingCore.PAIRING_STORAGE_KEY);
      const candidate = stored?.[pairingCore.PAIRING_STORAGE_KEY];
      if (!candidate) {
        pairing = null;
        profileSeat.close();
        for (const seat of workspaceSeats.values()) seat.close();
        return publishStatus("unpaired");
      }
      const previous = pairing;
      try {
        pairing = pairingCore.validate(candidate);
      } catch (_) {
        pairing = null;
        profileSeat.close();
        for (const seat of workspaceSeats.values()) seat.close();
        return publishStatus("pairing_invalid", "PAIRING_FILE_INVALID");
      }
      // A pairing that CHANGED on disk is a rollover exactly like PAIRING_SET:
      // no socket may outlive the pairing it authenticated under, and the
      // close happens in this same synchronous block as the swap (audit 03/09
      // round 2, HIGH — this path used to leave old-pairing seats serving).
      const changed = Boolean(previous) && (previous.token !== pairing.token || previous.websocket_url !== pairing.websocket_url);
      if (changed) {
        profileSeat.close();
        for (const seat of workspaceSeats.values()) seat.close();
      }
      await profileSeat.connect();
      queueWorkspaceWork(changed ? reconnectAllSeats : ensureWorkspaceSeatsConnected);
      return safeStatus(profileSeat.currentState());
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
          publishStatus(profileSeat.currentState());
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
        publishStatus(profileSeat.currentState());
      });
    });

    chromeApi.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type === "DAC_BRIDGE_PAIRING_SET") {
        queuePairingWork(async () => {
          const validated = pairingCore.validate(message.pairing);
          await chromeApi.storage.local.set({ [pairingCore.PAIRING_STORAGE_KEY]: validated });
          pairing = validated;
          profileSeat.close();
          // Workspace seats close IN THIS SAME synchronous block as the
          // pairing swap — never merely queued. A queued close leaves an old
          // socket mid-handshake able to resume after the swap and leak the
          // new token to a host that proved only the old one (audit 03/09,
          // HIGH). The queued reconnect below then brings them back up.
          for (const seat of workspaceSeats.values()) seat.close();
          await profileSeat.connect();
          queueWorkspaceWork(reconnectAllSeats);
          return safeStatus(profileSeat.currentState());
        }).then((status) => sendResponse({ ok: true, status })).catch(() => sendResponse({ ok: false, code: "PAIRING_FILE_INVALID" }));
        return true;
      }
      if (message?.type === "DAC_BRIDGE_LABEL_SET") {
        // Save the owner-typed profile name AND announce it at once by cycling
        // only THIS profile's socket — the fresh connect (challenge -> proof ->
        // auth) reads the new label. No host restart, no extension reload.
        // Workspace seats keep their own names and their own sockets.
        Promise.resolve().then(async () => {
          const label = sanitizeInstanceLabel(message.label);
          await chromeApi.storage.local.set({ [INSTANCE_LABEL_STORAGE_KEY]: label });
          if (pairing) {
            profileSeat.close();
            await profileSeat.connect();
          }
          return label;
        }).then((label) => sendResponse({ ok: true, label })).catch(() => sendResponse({ ok: false, code: "LABEL_SET_FAILED" }));
        return true;
      }
      if (message?.type === "DAC_BRIDGE_PAIRING_REMOVE") {
        queuePairingWork(async () => {
          pairing = null;
          profileSeat.close();
          // Synchronous for the same reason as PAIRING_SET: no socket may
          // outlive the pairing it authenticated under.
          for (const seat of workspaceSeats.values()) seat.close();
          await chromeApi.storage.local.remove(pairingCore.PAIRING_STORAGE_KEY);
          return publishStatus("unpaired");
        }).then((status) => sendResponse({ ok: true, status })).catch(() => sendResponse({ ok: false, code: "PAIRING_REMOVE_FAILED" }));
        return true;
      }
      if (message?.type === "DAC_BRIDGE_STATUS_GET") {
        sendResponse({ ok: true, status: safeStatus(profileSeat.currentState()) });
        return false;
      }
      if (message?.type === "DAC_BRIDGE_WORKSPACE_UPSERT") {
        queueWorkspaceWork(async () => {
          if (!workspaceCore) throw workspaceUnavailableError();
          // Fail closed at the door: a workspace may only ever be born onto a
          // live provider tab. Everything later (navigation, closure) is
          // handled by the tab listeners and the connect-time guard.
          const usable = await workspaceTabUsable(message.tab_id);
          if (!usable) {
            const error = new Error("Tab được gắn phải là một tab ChatGPT đang mở.");
            error.code = "WORKSPACE_TAB_INVALID";
            throw error;
          }
          const { store, workspace } = workspaceCore.upsertWorkspace(
            workspaceStore,
            { workspace_id: message.workspace_id, name: message.name, tab_id: message.tab_id },
            () => globalThis.crypto?.randomUUID?.()
          );
          await persistWorkspaceStore(store);
          await reconcileWorkspaces(store);
          return { workspace, seats: await workspaceSeatStates() };
        }).then((result) => sendResponse({ ok: true, ...result }))
          .catch((error) => sendResponse({ ok: false, code: error?.code || "WORKSPACE_UPSERT_FAILED", error: error?.message || "" }));
        return true;
      }
      if (message?.type === "DAC_BRIDGE_WORKSPACE_REMOVE") {
        queueWorkspaceWork(async () => {
          if (!workspaceCore) throw workspaceUnavailableError();
          const { store, removed } = workspaceCore.removeWorkspace(workspaceStore, message.workspace_id);
          await persistWorkspaceStore(store);
          await reconcileWorkspaces(store);
          return { removed, seats: await workspaceSeatStates() };
        }).then((result) => sendResponse({ ok: true, ...result }))
          .catch((error) => sendResponse({ ok: false, code: error?.code || "WORKSPACE_REMOVE_FAILED", error: error?.message || "" }));
        return true;
      }
      if (message?.type === "DAC_BRIDGE_WORKSPACES_GET") {
        queueWorkspaceWork(async () => {
          if (!workspaceCore) return { seats: [] };
          return { seats: await workspaceSeatStates() };
        }).then((result) => sendResponse({ ok: true, ...result }))
          .catch((error) => sendResponse({ ok: false, code: error?.code || "WORKSPACES_GET_FAILED" }));
        return true;
      }
      return false;
    });

    // A workspace's tab dying or leaving the provider is the fail-closed edge
    // of direction A: the seat's socket must drop so the host answers
    // TARGET_NOT_CONNECTED instead of ever letting that name drift to another
    // tab. The record stays, so re-opening the page and re-attaching is cheap.
    //
    // Every CLOSE below is synchronous in the event callback itself — never
    // queued. The workspace queue can be legitimately busy (a listing awaiting
    // tabs.get, a reconcile mid-flight), and a close parked behind it would
    // leave the dead tab's seat authenticated exactly as long as the queue is
    // wedged (audit 03/09 round 2, HIGH). Only reconnects, which are not
    // safety-relevant, go through the queue.
    function closeSeatsBoundToTab(tabId) {
      for (const seat of workspaceSeats.values()) {
        if (seat.workspace()?.tab_id === tabId) seat.close();
      }
    }
    chromeApi.tabs?.onRemoved?.addListener?.((tabId) => { closeSeatsBoundToTab(tabId); });
    // Chrome can swap a tab's id wholesale (prerender/Instant activation
    // fires onReplaced, NOT onRemoved). The old id our record holds no longer
    // names any tab, so the seat drops — the owner re-attaches with one click.
    chromeApi.tabs?.onReplaced?.addListener?.((addedTabId, removedTabId) => { closeSeatsBoundToTab(removedTabId); });
    chromeApi.tabs?.onUpdated?.addListener?.((tabId, changeInfo) => {
      if (!changeInfo || typeof changeInfo.url !== "string" || !workspaceCore) return;
      if (!workspaceCore.isProviderTabUrl(changeInfo.url)) {
        closeSeatsBoundToTab(tabId);
        return;
      }
      queueWorkspaceWork(async () => {
        for (const seat of workspaceSeats.values()) {
          if (seat.workspace()?.tab_id !== tabId) continue;
          if (pairing && !seat.isAuthenticated()) await seat.connect().catch(() => {});
        }
      });
    });

    chromeApi.alarms.onAlarm.addListener((alarm) => {
      if (alarm?.name !== RECONNECT_ALARM || !pairing) return;
      if (!profileSeat.isAuthenticated()) profileSeat.connect().catch(() => publishStatus("disconnected", "HOST_UNAVAILABLE"));
      for (const seat of workspaceSeats.values()) {
        if (!seat.isAuthenticated()) seat.connect().catch(() => {});
      }
    });
    chromeApi.alarms.create(RECONNECT_ALARM, { periodInMinutes: 0.5 });

    loadPairing().catch(() => publishStatus("pairing_invalid", "PAIRING_FILE_INVALID"));
    queueWorkspaceWork(loadWorkspacesNow).catch(() => {});
    return Object.freeze({
      connectHost: profileSeat.connect,
      loadPairing,
      status: () => safeStatus(profileSeat.currentState()),
      router
    });
  }

  (typeof window !== "undefined" ? window : globalThis).DacBridgeLoopbackTransport = Object.freeze({
    EXECUTOR_PORT_NAME, RECONNECT_ALARM, KEEPALIVE_MS, KEEPALIVE_ACK_TIMEOUT_MS, HANDSHAKE_TIMEOUT_MS,
    RECONNECT_CEILING_MS, RECONNECT_DELAYS_MS, RECONNECT_WINDOW_MS, verifyHostProof, create
  });
})();
