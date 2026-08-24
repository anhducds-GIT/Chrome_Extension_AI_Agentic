(() => {
  "use strict";

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
        return core.failureResponse(request?.request_id, "INTERNAL_ERROR", now);
      }
    }

    return Object.freeze({ route, session_id: sessionId });
  }

  (typeof window !== "undefined" ? window : globalThis).DacBridgeRouterCore = Object.freeze({ createRouter });
})();
