(() => {
  "use strict";

  // Bootstrap lock; removal requires a decisions.md entry (F-05).
  // The public export is a FROZEN ARRAY (truly immutable — audit 2026-08-27
  // proved Object.freeze(new Set(...)) leaves .add() working, so an exported
  // Set could be mutated to smuggle methods past the gate). Membership checks
  // use a module-private Set that nothing outside this closure can reach.
  const BOOTSTRAP_ALLOWED_METHODS = Object.freeze([
    "session.hello",
    "system.ping",
    "system.capabilities",
    "diagnostics.dom_probe",
    // chat.reload joined the allowlist 2026-08-27 (decisions.md): it only
    // F5s the bound tab — no prompt, no credits — and without it every
    // extension reload during bootstrap needs the owner's hands for the
    // mandatory tab refresh (RECEIVER_LOST loop).
    "chat.reload",
    // diagnostics.evidence_submit (2026-08-27, decisions.md): the single
    // bootstrap interaction primitive — one typed prompt + one Create click,
    // content-side hard cap 3 per page load (owner's 45-credit free budget).
    "diagnostics.evidence_submit"
  ]);
  const BOOTSTRAP_ALLOWED_SET = new Set(BOOTSTRAP_ALLOWED_METHODS);

  function createRouter(options = {}) {
    const core = options.core || globalThis.DacBridgeCore;
    if (!core) throw new TypeError("DacBridgeCore is required.");
    if (typeof options.executor_state !== "function" || typeof options.send_executor !== "function") {
      throw new TypeError("executor_state and send_executor adapters are required.");
    }
    const now = typeof options.now === "function" ? options.now : () => new Date();
    const sessionId = options.session_id || `bridge-${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`;
    const extensionId = String(options.extension_id || "");

    function executorState() {
      const current = options.executor_state() || {};
      return { available: Boolean(current.available), executor_epoch: current.available ? current.executor_epoch || null : null };
    }

    function offlinePing() {
      return {
        extension: "online",
        executor: "unavailable",
        chatgpt: { state: "UNKNOWN", failure_type: null, composer_found: null, generating: null },
        workbook: { loaded: false, file_name: null, run_id: null }
      };
    }

    async function route(input) {
      let request;
      try {
        request = core.parseRequest(input);
        const method = core.requireMethod(request.method);
        const params = core.validateParams(request.method, request.params);
        if (!BOOTSTRAP_ALLOWED_SET.has(request.method)) {
          throw new core.BridgeProtocolError("FORBIDDEN", undefined, {
            reason: "bootstrap_locked",
            method: request.method
          });
        }
        if (method.context === "executor") {
          if (!executorState().available) return core.failureResponse(request.request_id, "EXECUTOR_UNAVAILABLE", now);
          return core.parseResponse(await options.send_executor(request, { deadline_ms: method.deadline_ms }));
        }
        if (request.method === "session.hello") {
          const selectedVersion = core.negotiateVersion(params.supported_versions);
          return core.successResponse(request, {
            selected_version: selectedVersion,
            session_id: sessionId,
            extension_id: extensionId,
            transport: "loopback_ws",
            executor: executorState(),
            server_time: now().toISOString()
          }, now);
        }
        if (request.method === "system.capabilities") {
          return core.successResponse(request, core.capabilities(), now);
        }
        if (request.method === "system.ping") {
          if (!executorState().available) return core.successResponse(request, offlinePing(), now);
          return core.parseResponse(await options.send_executor(request, { deadline_ms: method.deadline_ms }));
        }
        throw new core.BridgeProtocolError("METHOD_NOT_FOUND", undefined, { method: request.method });
      } catch (error) {
        if (error instanceof core.BridgeProtocolError) return core.failureResponse(request?.request_id, error, now);
        // Keep the INTERNAL_ERROR taxonomy but carry a bounded message so the
        // remote agent can diagnose the failure without extension logs.
        return core.failureResponse(request?.request_id, "INTERNAL_ERROR", now, undefined, { message: String(error?.message ?? error).slice(0, 300) });
      }
    }

    return Object.freeze({ route, session_id: sessionId });
  }

  (typeof window !== "undefined" ? window : globalThis).DacBridgeRouterCore = Object.freeze({
    createRouter,
    BOOTSTRAP_ALLOWED_METHODS
  });
})();
