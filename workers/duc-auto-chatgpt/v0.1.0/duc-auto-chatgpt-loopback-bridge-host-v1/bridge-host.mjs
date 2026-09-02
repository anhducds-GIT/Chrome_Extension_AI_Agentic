import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import { closePayload, createFrameDecoder, encodeFrame, websocketAcceptKey } from "./websocket-core.mjs";

export const DEFAULT_HOST = "127.0.0.1";
export const DEFAULT_PORT = 32147;
export const MAX_ENVELOPE_BYTES = 1024 * 1024;
export const MAX_INFLIGHT = 32;

const ERRORS = Object.freeze({
  INVALID_ENVELOPE: { retryable: false, message: "The RPC envelope is invalid." },
  UNAUTHENTICATED: { retryable: false, message: "Bridge authentication failed." },
  FORBIDDEN: { retryable: false, message: "The transport role is not allowed to perform this action." },
  EXTENSION_OFFLINE: { retryable: true, message: "No authenticated extension connection is available." },
  TARGET_AMBIGUOUS: { retryable: false, message: "More than one extension session is connected; name exactly one target." },
  TARGET_NOT_CONNECTED: { retryable: true, message: "The named target session is not connected." },
  REQUEST_TIMEOUT: { retryable: true, message: "The request timed out; retry the identical idempotency key." },
  TRANSPORT_DISCONNECTED: { retryable: true, message: "The transport disconnected; retry the identical idempotency key." },
  INTERNAL_ERROR: { retryable: false, message: "The bridge could not complete the request." }
});

function json(response, status, value) {
  const body = Buffer.from(JSON.stringify(value), "utf8");
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": String(body.length),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(body);
}

function failureEnvelope(requestId, code, details = {}) {
  const definition = ERRORS[code] || ERRORS.INTERNAL_ERROR;
  return {
    protocol: "duc-auto-chatgpt.bridge",
    version: 1,
    kind: "response",
    request_id: typeof requestId === "string" ? requestId : null,
    ok: false,
    error: { code: ERRORS[code] ? code : "INTERNAL_ERROR", message: definition.message, retryable: definition.retryable, details },
    responded_at: new Date().toISOString()
  };
}

function successEnvelope(requestId, result) {
  return {
    protocol: "duc-auto-chatgpt.bridge",
    version: 1,
    kind: "response",
    request_id: requestId,
    ok: true,
    result,
    responded_at: new Date().toISOString()
  };
}

function tokenBytes(token) {
  const value = String(token || "");
  if (!/^[A-Za-z0-9_-]{43}$/.test(value)) throw new Error("Pairing token must encode exactly 32 random bytes as base64url.");
  const decoded = Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/") + "=", "base64");
  if (decoded.length !== 32) throw new Error("Pairing token must contain exactly 32 bytes.");
  return decoded;
}

function sameToken(expected, supplied) {
  try {
    const left = tokenBytes(expected);
    const right = tokenBytes(supplied);
    return crypto.timingSafeEqual(left, right);
  } catch (_) {
    return false;
  }
}
function hostProof(token, nonce) {
  return crypto.createHmac("sha256", tokenBytes(token)).update(String(nonce), "utf8").digest("base64url");
}

export function validatePairing(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Pairing file must be a JSON object.");
  if (input.schema_version !== 1) throw new Error("Pairing schema_version must equal 1.");
  if (input.host !== DEFAULT_HOST) throw new Error("Pairing host must be literal 127.0.0.1.");
  if (!Number.isInteger(input.port) || input.port < 1024 || input.port > 65535) throw new Error("Pairing port must be an integer from 1024 to 65535.");
  tokenBytes(input.token);
  const httpUrl = `http://${DEFAULT_HOST}:${input.port}/v1/rpc`;
  const websocketUrl = `ws://${DEFAULT_HOST}:${input.port}/v1/extension`;
  if (input.http_url !== httpUrl || input.websocket_url !== websocketUrl) throw new Error("Pairing endpoints do not match the fixed loopback paths.");
  return Object.freeze({ schema_version: 1, host: DEFAULT_HOST, port: input.port, http_url: httpUrl, websocket_url: websocketUrl, token: input.token });
}

const INSTANCE_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;

function sanitizeInstanceLabel(value) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 64);
}

// The instance block is routing metadata only. It never participates in
// authentication: the pairing token alone decides admission. Absent block =
// a pre-multiprofile extension (legacy). A present-but-malformed block is
// rejected fail-closed so a broken identity can never route ambiguously.
export function parseInstance(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "object" || Array.isArray(value)) throw new Error("instance must be a JSON object.");
  if (value.schema_version !== 1) throw new Error("instance.schema_version must equal 1.");
  if (typeof value.instance_id !== "string" || !INSTANCE_ID_PATTERN.test(value.instance_id)) {
    throw new Error("instance.instance_id must be 8-64 characters of A-Za-z0-9 or hyphen.");
  }
  return Object.freeze({
    instance_id: value.instance_id,
    label: sanitizeInstanceLabel(value.label),
    worker: typeof value.worker === "string" ? value.worker.slice(0, 64) : null,
    extension_version: typeof value.extension_version === "string" ? value.extension_version.slice(0, 32) : null
  });
}

function readBody(request, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let exceeded = false;
    request.on("data", (chunk) => {
      if (exceeded) return;
      size += chunk.length;
      if (size > limit) {
        exceeded = true;
        chunks.length = 0;
        reject(Object.assign(new Error("Request body is too large."), { code: "LIMIT" }));
        request.resume();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function validRpcRequest(value) {
  return Boolean(
    value && typeof value === "object" && !Array.isArray(value) &&
    value.protocol === "duc-auto-chatgpt.bridge" && value.version === 1 && value.kind === "request" &&
    typeof value.request_id === "string" && /^[\x21-\x7e]{8,128}$/.test(value.request_id)
  );
}

function extensionOrigin(value) {
  return typeof value === "string" && /^chrome-extension:\/\/[a-p]{32}$/.test(value);
}

export function createBridgeHost(options = {}) {
  const pairing = validatePairing(options.pairing);
  const requestTimeoutMs = Math.max(100, Number(options.requestTimeoutMs || 35000));
  const authTimeoutMs = Math.max(100, Number(options.authTimeoutMs || 5000));
  const maxInflight = Math.max(1, Math.min(256, Number(options.maxInflight || MAX_INFLIGHT)));
  const inflight = new Map();
  // One entry per connected extension session, keyed by instance_id (or a
  // per-connection legacy key). Several Chrome profiles may sit here at once;
  // nothing ever evicts a DIFFERENT instance's seat.
  const sessions = new Map();
  let listening = null;

  function send(socket, value) {
    if (!socket || socket.destroyed) throw new Error("Extension transport is unavailable.");
    socket.write(encodeFrame(JSON.stringify(value)));
  }

  function closeSocket(socket, code, reason) {
    if (!socket || socket.destroyed) return;
    try { socket.write(encodeFrame(closePayload(code, reason), { opcode: 0x8 })); } catch (_) { /* Best effort. */ }
    socket.end();
  }

  function liveSessions() {
    return [...sessions.values()].filter((entry) => entry.socket && !entry.socket.destroyed);
  }

  function candidateList(entries = liveSessions()) {
    return entries.map((entry) => ({
      instance_id: entry.key,
      label: entry.instance ? entry.instance.label : null,
      legacy: !entry.instance
    }));
  }

  function sessionDirectory() {
    return liveSessions().map((entry) => ({
      instance_id: entry.key,
      label: entry.instance ? entry.instance.label : null,
      legacy: !entry.instance,
      worker: entry.instance ? entry.instance.worker : null,
      extension_version: entry.instance ? entry.instance.extension_version : null,
      connected_at: entry.connectedAt,
      last_seen_at: entry.lastSeenAt
    }));
  }

  function settleRelay(relayId, envelope) {
    const pending = inflight.get(relayId);
    if (!pending) return;
    inflight.delete(relayId);
    clearTimeout(pending.timer);
    const correlated = envelope && typeof envelope === "object" && !Array.isArray(envelope) &&
      envelope.protocol === "duc-auto-chatgpt.bridge" && envelope.version === 1 && envelope.kind === "response" &&
      envelope.request_id === pending.requestId && typeof envelope.ok === "boolean";
    const payload = correlated ? envelope : failureEnvelope(pending.requestId, "INTERNAL_ERROR", { reason: "uncorrelated_extension_response" });
    if (pending.servedBy) payload.served_by = pending.servedBy;
    json(pending.response, 200, payload);
  }

  // Scoped failure: only the named session's in-flight work dies with it.
  // Other profiles' requests keep running untouched.
  function failSession(sessionKey, code) {
    for (const [relayId, pending] of inflight) {
      if (pending.sessionKey === sessionKey) settleRelay(relayId, failureEnvelope(pending.requestId, code));
    }
  }

  function failAll(code) {
    for (const [relayId, pending] of inflight) settleRelay(relayId, failureEnvelope(pending.requestId, code));
  }

  function acceptExtension(request, socket, head) {
    if (request.url !== "/v1/extension" || !extensionOrigin(request.headers.origin)) {
      socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    if (String(request.headers.upgrade || "").toLowerCase() !== "websocket" || !String(request.headers.connection || "").toLowerCase().split(/\s*,\s*/).includes("upgrade") || request.headers["sec-websocket-version"] !== "13") {
      socket.write("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    let accept;
    try { accept = websocketAcceptKey(request.headers["sec-websocket-key"]); }
    catch (_) {
      socket.write("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    socket.write([
      "HTTP/1.1 101 Switching Protocols",
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Accept: ${accept}`,
      "\r\n"
    ].join("\r\n"));
    const decoder = createFrameDecoder({ maxPayloadBytes: MAX_ENVELOPE_BYTES + 8192, requireMasked: true });
    let authenticated = false;
    let entry = null;
    let challengeAccepted = false;
    const authTimer = setTimeout(() => closeSocket(socket, 1008, "Authentication required."), authTimeoutMs);

    function onMessage(frame) {
      if (frame.opcode === 0x8) { closeSocket(socket, 1000, "Closing."); return; }
      if (frame.opcode === 0x9) { socket.write(encodeFrame(frame.payload, { opcode: 0xa })); return; }
      if (frame.opcode === 0xa) return;
      let message;
      try { message = JSON.parse(frame.text); }
      catch (_) { closeSocket(socket, 1007, "Text JSON required."); return; }
      if (!authenticated) {
        if (!challengeAccepted && message?.type === "auth_challenge" && message?.role === "extension" && /^[A-Za-z0-9_-]{43}$/.test(String(message?.nonce || ""))) {
          challengeAccepted = true;
          send(socket, { type: "auth_proof", proof: hostProof(pairing.token, message.nonce) });
          return;
        }
        if (!challengeAccepted || message?.type !== "auth" || message?.role !== "extension" || !sameToken(pairing.token, message?.token)) {
          closeSocket(socket, 1008, "Authentication failed.");
          return;
        }
        let instance;
        try { instance = parseInstance(message.instance); }
        catch (_) {
          closeSocket(socket, 1008, "Invalid instance metadata.");
          return;
        }
        authenticated = true;
        clearTimeout(authTimer);
        const key = instance ? instance.instance_id : `legacy:${crypto.randomUUID()}`;
        const incumbent = sessions.get(key);
        if (incumbent && incumbent.socket !== socket) {
          // The SAME instance reconnected (MV3 service worker woke up).
          // Replace only its own seat; every other profile keeps its seat
          // and its in-flight work.
          failSession(key, "TRANSPORT_DISCONNECTED");
          sessions.delete(key);
          closeSocket(incumbent.socket, 1000, "Replaced by a fresh session from the same instance.");
        }
        const now = new Date().toISOString();
        entry = { key, socket, sessionId: crypto.randomUUID(), origin: request.headers.origin, instance, connectedAt: now, lastSeenAt: now };
        sessions.set(key, entry);
        send(socket, { type: "auth_ok", session_id: entry.sessionId, server_time: now });
        return;
      }
      if (entry) entry.lastSeenAt = new Date().toISOString();
      if (message?.type === "keepalive") {
        send(socket, { type: "keepalive_ack", server_time: new Date().toISOString() });
        return;
      }
      if (message?.type === "rpc_response" && typeof message.relay_id === "string" && message.envelope && typeof message.envelope === "object") {
        settleRelay(message.relay_id, message.envelope);
        return;
      }
      closeSocket(socket, 1008, "Unsupported extension transport message.");
    }

    socket.on("data", (chunk) => {
      try { for (const frame of decoder.push(chunk)) onMessage(frame); }
      catch (_) { closeSocket(socket, 1009, "Invalid or oversized WebSocket frame."); }
    });
    socket.on("close", () => {
      clearTimeout(authTimer);
      if (entry && sessions.get(entry.key)?.socket === socket) {
        sessions.delete(entry.key);
        failSession(entry.key, "TRANSPORT_DISCONNECTED");
      }
    });
    // The HTTP server hands us allowHalfOpen sockets: a peer that dies with a
    // bare FIN (an MV3 service worker being killed does exactly this) would
    // otherwise never fire "close", leaving a zombie seat that still counts
    // toward TARGET_AMBIGUOUS. Answer the FIN so "close" always arrives.
    socket.on("end", () => socket.end());
    socket.on("error", () => { /* close handles authoritative cleanup. */ });
    if (head?.length) socket.emit("data", head);
  }

  const server = http.createServer(async (request, response) => {
    if (request.url !== "/v1/rpc" || request.method !== "POST") {
      json(response, 404, { ok: false, code: "NOT_FOUND" });
      return;
    }
    if (request.headers.origin !== undefined) {
      json(response, 403, failureEnvelope(null, "FORBIDDEN", { reason: "browser_origin_rejected" }));
      return;
    }
    const authorization = String(request.headers.authorization || "");
    if (!authorization.startsWith("Bearer ") || !sameToken(pairing.token, authorization.slice(7))) {
      json(response, 401, failureEnvelope(null, "UNAUTHENTICATED"));
      return;
    }
    let body;
    let envelope;
    try {
      body = await readBody(request, MAX_ENVELOPE_BYTES);
      envelope = JSON.parse(body.toString("utf8"));
      if (!validRpcRequest(envelope)) throw new Error("Invalid RPC request envelope.");
    } catch (error) {
      if (!response.writableEnded) json(response, error?.code === "LIMIT" ? 413 : 400, failureEnvelope(envelope?.request_id, "INVALID_ENVELOPE"));
      return;
    }
    if (envelope.method === "bridge.sessions") {
      // Answered by the host itself, read-only: who is connected right now.
      json(response, 200, successEnvelope(envelope.request_id, { sessions: sessionDirectory(), count: liveSessions().length }));
      return;
    }
    let target = null;
    if (envelope.target !== undefined) {
      if (typeof envelope.target !== "string" || !envelope.target.trim() || envelope.target.length > 128) {
        json(response, 400, failureEnvelope(envelope.request_id, "INVALID_ENVELOPE", { field: "target" }));
        return;
      }
      target = envelope.target;
    }
    // Routing is fail-closed: with several sessions connected, an untargeted
    // request is refused with the candidate list — the host never picks one.
    const live = liveSessions();
    let chosen = null;
    if (target !== null) {
      const matches = live.filter((entry) => entry.key === target || (entry.instance && entry.instance.label !== "" && entry.instance.label === target));
      if (matches.length === 0) {
        json(response, 200, failureEnvelope(envelope.request_id, "TARGET_NOT_CONNECTED", { target, candidates: candidateList(live) }));
        return;
      }
      if (matches.length > 1) {
        json(response, 200, failureEnvelope(envelope.request_id, "TARGET_AMBIGUOUS", { target, candidates: candidateList(matches) }));
        return;
      }
      chosen = matches[0];
    } else if (live.length === 0) {
      json(response, 200, failureEnvelope(envelope.request_id, "EXTENSION_OFFLINE"));
      return;
    } else if (live.length === 1) {
      chosen = live[0];
    } else {
      json(response, 200, failureEnvelope(envelope.request_id, "TARGET_AMBIGUOUS", { candidates: candidateList(live) }));
      return;
    }
    if (inflight.size >= maxInflight) {
      json(response, 503, failureEnvelope(envelope.request_id, "REQUEST_TIMEOUT", { reason: "relay_capacity" }));
      return;
    }
    const relayId = crypto.randomUUID();
    // The target field is host routing metadata; the extension never sees it.
    const relayEnvelope = { ...envelope };
    delete relayEnvelope.target;
    const timer = setTimeout(() => settleRelay(relayId, failureEnvelope(envelope.request_id, "REQUEST_TIMEOUT")), requestTimeoutMs);
    inflight.set(relayId, {
      response,
      requestId: envelope.request_id,
      timer,
      sessionKey: chosen.key,
      servedBy: { instance_id: chosen.key, label: chosen.instance ? chosen.instance.label : null }
    });
    try { send(chosen.socket, { type: "rpc", relay_id: relayId, envelope: relayEnvelope }); }
    catch (_) { settleRelay(relayId, failureEnvelope(envelope.request_id, "TRANSPORT_DISCONNECTED")); }
  });
  server.on("upgrade", acceptExtension);
  server.on("clientError", (_error, socket) => {
    if (!socket.destroyed) socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
  });

  async function start() {
    if (listening) return listening;
    listening = await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(pairing.port, DEFAULT_HOST, () => {
        server.off("error", reject);
        resolve(server.address());
      });
    });
    return listening;
  }

  async function stop() {
    for (const entry of sessions.values()) closeSocket(entry.socket, 1001, "Host stopping.");
    sessions.clear();
    failAll("TRANSPORT_DISCONNECTED");
    if (!server.listening) return;
    await new Promise((resolve) => server.close(resolve));
    listening = null;
  }

  return Object.freeze({
    start,
    stop,
    address: () => server.address(),
    inflightCount: () => inflight.size,
    extensionConnected: () => liveSessions().length > 0,
    sessionCount: () => liveSessions().length
  });
}

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("/bridge-host.mjs")) {
  const pairingPath = argument("--pairing");
  if (!pairingPath) throw new Error("Usage: node bridge-host.mjs --pairing <pairing-json-path>");
  const pairing = validatePairing(JSON.parse(fs.readFileSync(pairingPath, "utf8")));
  const host = createBridgeHost({ pairing });
  await host.start();
  process.stdout.write(`Duc Auto ChatGPT bridge listening on ${pairing.host}:${pairing.port}\n`);
  const shutdown = async () => { await host.stop(); process.exit(0); };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
