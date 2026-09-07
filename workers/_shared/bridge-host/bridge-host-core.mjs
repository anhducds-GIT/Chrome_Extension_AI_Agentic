/* bridge-host-core.mjs — LÕI DÙNG CHUNG của máy chủ Bridge. Một bản, nhiều extension.
 *
 * ══ VÌ SAO FILE NÀY TỒN TẠI — đo ngày 07/09, không phải lý thuyết ══
 *
 * Ba gói `duc-auto-*` mỗi gói giữ MỘT BẢN CHÉP của cùng đoạn mã này. Đếm bằng mã băm:
 *
 *     websocket-core.mjs   3 bản, GIỐNG HỆT cả ba   → nhân bản thuần, không được gì
 *     bridge-host.mjs      3 bản, KHÁC NHAU cả ba   → 461 / 451 / 450 dòng, ba mã băm
 *
 * Và 11 dòng khác nhau giữa bản `duc-auto-chatgpt` với hai bản kia **chính là cái bắt tay hai
 * chiều** (`auth_challenge` → chứng minh HMAC → `auth`): máy chủ phải chứng minh nó biết token
 * TRƯỚC khi extension đưa token ra.
 *
 * Nghĩa là: một bản vá an toàn được làm ở MỘT bản chép, và **không bao giờ tới hai bản kia**.
 * Hai Bridge tới hôm nay vẫn nhận token trần. Đó là cái giá của fork, đo được, trên đĩa.
 *
 * Nên luật của file này: **thêm extension mới thì thêm một host MỎNG gọi vào đây, không chép
 * file này.** Ba gói đóng băng giữ nguyên bản chép của chúng — luật cấm sửa chúng, và cũng
 * không cần: chúng đã ngừng thay đổi.
 *
 * ══ HAI THỨ ĐƯỢC THAM SỐ HOÁ, VÀ CHỈ HAI ══
 *
 *   ⑴ `protocol` — bản cũ gõ cứng `"duc-auto-chatgpt.bridge"` ở **bốn** chỗ. Một cái seed sắp
 *      nhân bản mà mang tên một sản phẩm khác thì mỗi bản clone lại kéo theo cái tên đó.
 *   ⑵ `methodTaiCho` — bảng method do CHÍNH máy chủ trả lời, không chuyển tiếp xuống extension.
 *      Bản cũ có đúng một ca như thế (`bridge.sessions`) viết thẳng vào giữa luồng; ở đây nó
 *      thành một cái móc, để Scouter cắm nhóm `file.*` vào mà không phải rẽ nhánh trong lõi.
 *
 * Mọi thứ còn lại giữ NGUYÊN hành vi bản `duc-auto-chatgpt` — bản duy nhất có bắt tay hai chiều.
 * Đây là chỗ dễ mất mát nhất khi tách lõi, nên nói rõ những gì PHẢI còn nguyên:
 *   · chặn `Origin` ở CẢ hai cửa (HTTP và WebSocket) · so token bằng thời gian hằng
 *   · bắt tay hai chiều · định tuyến fail-closed (nhiều phiên mà không nêu đích thì TỪ CHỐI,
 *     máy chủ không bao giờ tự chọn hộ) · hỏng theo phiên chứ không hỏng cả nhà
 *   · trần số lượt đang bay · trả lời FIN nửa chừng để ghế không thành ghế ma
 */

import http from "node:http";
import crypto from "node:crypto";
import { closePayload, createFrameDecoder, encodeFrame, websocketAcceptKey } from "./websocket-core.mjs";

export const DEFAULT_HOST = "127.0.0.1";
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

function tokenBytes(token) {
  const value = String(token || "");
  if (!/^[A-Za-z0-9_-]{43}$/.test(value)) throw new Error("Pairing token must encode exactly 32 random bytes as base64url.");
  const decoded = Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/") + "=", "base64");
  if (decoded.length !== 32) throw new Error("Pairing token must contain exactly 32 bytes.");
  return decoded;
}

/* So sánh THỜI GIAN HẰNG. `===` trên chuỗi thoát sớm ở byte đầu khác nhau, và khoảng thời gian
 * đó đo được — đủ để dò từng byte của token. */
export function sameToken(expected, supplied) {
  try {
    return crypto.timingSafeEqual(tokenBytes(expected), tokenBytes(supplied));
  } catch (_) {
    return false;
  }
}

/* Bằng chứng của MÁY CHỦ. Đây là 11 dòng mà hai gói kia không có: extension gửi một `nonce`,
 * máy chủ phải trả lại HMAC của nó bằng token. Không có bước này thì extension đưa token ra cho
 * bất cứ ai đang nghe đúng cổng — và trên loopback, "bất cứ ai" gồm mọi tiến trình trên máy. */
export function hostProof(token, nonce) {
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
  /* Chặn trần TRƯỚC khi quét, bỏ cả ký tự điều khiển C1, rồi quét nốt nửa cặp thay thế lạc mà
   * chính lượt cắt có thể vừa tạo ra (kết quả audit 02/09). */
  if (typeof value !== "string") return "";
    /* Dãy ký tự điều khiển dựng bằng CHUỖI ESCAPE, không gõ ký tự thật: gõ thật thì git coi
   * cả file là nhị phân và giấu diff vĩnh viễn — vừa dính đúng thế lúc viết file này. */
  const DIEU_KHIEN = new RegExp("[\\u0000-\\u001f\\u007f-\\u009f]", "g");
  return value.slice(0, 256).replace(DIEU_KHIEN, "").trim().slice(0, 64)
    .replace(/(?:[\uD800-\uDBFF](?![\uDC00-\uDFFF]))|(?:(?<![\uD800-\uDBFF])[\uDC00-\uDFFF])/g, "");
}

/* Khối `instance` là **dữ liệu định tuyến**, không bao giờ tham gia xác thực: chỉ token quyết
 * định ai được vào. Vắng khối = extension đời cũ (trước đa hồ sơ). Có mà méo thì TỪ CHỐI —
 * fail-closed, vì một danh tính hỏng mà vẫn định tuyến được là định tuyến nhầm chỗ. */
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

function extensionOrigin(value) {
  return typeof value === "string" && /^chrome-extension:\/\/[a-p]{32}$/.test(value);
}

/**
 * @param {object}  o
 * @param {object}  o.pairing        tệp ghép cặp (chưa kiểm cũng được, hàm này kiểm)
 * @param {string}  o.protocol       tên giao thức của SẢN PHẨM NÀY — xem ⑴ ở khối đầu file
 * @param {object} [o.methodTaiCho]  { "<method>": async (params, ctx) => result } — xem ⑵
 */
export function createBridgeHostCore(options = {}) {
  const pairing = validatePairing(options.pairing);
  const PROTOCOL = String(options.protocol || "");
  if (!/^[a-z0-9][a-z0-9.-]{2,63}$/.test(PROTOCOL)) {
    throw new Error("`protocol` phải là tên giao thức của chính sản phẩm này, dạng chữ thường có dấu chấm.");
  }
  const taiCho = options.methodTaiCho && typeof options.methodTaiCho === "object" ? options.methodTaiCho : {};
  const requestTimeoutMs = Math.max(100, Number(options.requestTimeoutMs || 35000));
  const authTimeoutMs = Math.max(100, Number(options.authTimeoutMs || 5000));
  const maxInflight = Math.max(1, Math.min(256, Number(options.maxInflight || MAX_INFLIGHT)));
  const inflight = new Map();
  /* Một ghế cho mỗi phiên extension đang nối, khoá theo `instance_id`. Nhiều hồ sơ Chrome ngồi
   * cùng lúc được; không bao giờ có gì đá ghế của một instance KHÁC. */
  const sessions = new Map();
  let listening = null;

  function failureEnvelope(requestId, code, details = {}) {
    const dinhNghia = ERRORS[code];
    return {
      protocol: PROTOCOL, version: 1, kind: "response",
      request_id: typeof requestId === "string" ? requestId : null,
      ok: false,
      error: dinhNghia
        ? { code, message: dinhNghia.message, retryable: dinhNghia.retryable, details }
        /* Mã lạ tới từ một handler tại chỗ (ví dụ `PATH_OUTSIDE_ROOT` của Scouter). Giữ NGUYÊN
         * mã đó thay vì nuốt thành INTERNAL_ERROR: người gọi phân loại lỗi theo mã, và bóp mọi
         * thứ về một mã là lấy mất khả năng đó. */
        : { code: String(code || "INTERNAL_ERROR"), message: details?.message || ERRORS.INTERNAL_ERROR.message, retryable: false, details },
      responded_at: new Date().toISOString()
    };
  }

  function successEnvelope(requestId, result) {
    return {
      protocol: PROTOCOL, version: 1, kind: "response",
      request_id: requestId, ok: true, result,
      responded_at: new Date().toISOString()
    };
  }

  function validRpcRequest(value) {
    return Boolean(
      value && typeof value === "object" && !Array.isArray(value) &&
      value.protocol === PROTOCOL && value.version === 1 && value.kind === "request" &&
      typeof value.request_id === "string" && /^[\x21-\x7e]{8,128}$/.test(value.request_id)
    );
  }

  function send(socket, value) {
    if (!socket || socket.destroyed) throw new Error("Extension transport is unavailable.");
    socket.write(encodeFrame(JSON.stringify(value)));
  }

  function closeSocket(socket, code, reason) {
    if (!socket || socket.destroyed) return;
    try { socket.write(encodeFrame(closePayload(code, reason), { opcode: 0x8 })); } catch (_) { /* cố hết sức */ }
    socket.end();
  }

  const liveSessions = () => [...sessions.values()].filter((e) => e.socket && !e.socket.destroyed);

  const candidateList = (entries = liveSessions()) => entries.map((e) => ({
    instance_id: e.key, label: e.instance ? e.instance.label : null, legacy: !e.instance
  }));

  const sessionDirectory = () => liveSessions().map((e) => ({
    instance_id: e.key,
    label: e.instance ? e.instance.label : null,
    legacy: !e.instance,
    worker: e.instance ? e.instance.worker : null,
    extension_version: e.instance ? e.instance.extension_version : null,
    connected_at: e.connectedAt,
    last_seen_at: e.lastSeenAt
  }));

  function settleRelay(relayId, envelope) {
    const pending = inflight.get(relayId);
    if (!pending) return;
    inflight.delete(relayId);
    clearTimeout(pending.timer);
    const khop = envelope && typeof envelope === "object" && !Array.isArray(envelope) &&
      envelope.protocol === PROTOCOL && envelope.version === 1 && envelope.kind === "response" &&
      envelope.request_id === pending.requestId && typeof envelope.ok === "boolean";
    const payload = khop ? envelope : failureEnvelope(pending.requestId, "INTERNAL_ERROR", { reason: "uncorrelated_extension_response" });
    if (pending.servedBy) payload.served_by = pending.servedBy;
    json(pending.response, 200, payload);
  }

  /* Hỏng CÓ PHẠM VI: chỉ việc đang bay của đúng phiên đó chết theo nó. Hồ sơ khác chạy tiếp. */
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
    if (String(request.headers.upgrade || "").toLowerCase() !== "websocket"
      || !String(request.headers.connection || "").toLowerCase().split(/\s*,\s*/).includes("upgrade")
      || request.headers["sec-websocket-version"] !== "13") {
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
        /* BẮT TAY HAI CHIỀU — 11 dòng mà hai gói kia không có. */
        if (!challengeAccepted && message?.type === "auth_challenge" && message?.role === "extension"
          && /^[A-Za-z0-9_-]{43}$/.test(String(message?.nonce || ""))) {
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
        catch (_) { closeSocket(socket, 1008, "Invalid instance metadata."); return; }

        authenticated = true;
        clearTimeout(authTimer);
        const key = instance ? instance.instance_id : `legacy:${crypto.randomUUID()}`;
        const incumbent = sessions.get(key);
        if (incumbent && incumbent.socket !== socket) {
          /* CHÍNH instance đó nối lại (service worker MV3 vừa tỉnh). Chỉ thay ghế của nó; mọi
           * hồ sơ khác giữ nguyên ghế và việc đang bay. */
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
    /* Máy chủ HTTP đưa xuống socket nửa mở: một đầu bên kia chết bằng FIN trần (service worker
     * MV3 bị giết làm đúng thế) sẽ KHÔNG bao giờ bắn "close", để lại một ghế ma vẫn tính vào
     * TARGET_AMBIGUOUS. Trả lời FIN để "close" luôn tới. */
    socket.on("end", () => socket.end());
    socket.on("error", () => { /* "close" mới là chỗ dọn dẹp có thẩm quyền. */ });
    if (head?.length) socket.emit("data", head);
  }

  const server = http.createServer(async (request, response) => {
    if (request.url !== "/v1/rpc" || request.method !== "POST") {
      json(response, 404, { ok: false, code: "NOT_FOUND" });
      return;
    }
    /* Trình duyệt gắn `Origin` cho mọi lượt gọi chéo nguồn. Có nó nghĩa là lượt này tới từ một
     * TRANG WEB — và một trang web không được sai khiến máy chủ này. */
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

    /* Chỉ đọc, chính máy chủ trả lời: ai đang nối. */
    if (envelope.method === "bridge.sessions") {
      json(response, 200, successEnvelope(envelope.request_id, { sessions: sessionDirectory(), count: liveSessions().length }));
      return;
    }

    /* ⑵ MÓC METHOD TẠI CHỖ. Đứng TRƯỚC lượt định tuyến: đây là method của máy chủ, extension
     * không cần biết chúng tồn tại — và quan trọng hơn, chúng chạy được cả khi KHÔNG có
     * extension nào nối. Ghi một file xuống đĩa không cần trình duyệt mở. */
    if (Object.hasOwn(taiCho, envelope.method)) {
      try {
        const ketQua = await taiCho[envelope.method](envelope.params ?? {}, { pairing, protocol: PROTOCOL });
        json(response, 200, successEnvelope(envelope.request_id, ketQua));
      } catch (error) {
        json(response, 200, failureEnvelope(envelope.request_id, error?.code || "INTERNAL_ERROR", {
          message: String(error?.message || error), ...(error?.details || {})
        }));
      }
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

    /* Định tuyến FAIL-CLOSED: nhiều phiên đang nối mà lượt gọi không nêu đích thì TỪ CHỐI kèm
     * danh sách ứng viên — máy chủ không bao giờ tự chọn hộ. */
    const live = liveSessions();
    let chosen = null;
    if (target !== null) {
      const matches = live.filter((e) => e.key === target || (e.instance && e.instance.label !== "" && e.instance.label === target));
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
    /* `target` là dữ liệu định tuyến của máy chủ; extension không bao giờ nhìn thấy nó. */
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
    for (const e of sessions.values()) closeSocket(e.socket, 1001, "Host stopping.");
    sessions.clear();
    failAll("TRANSPORT_DISCONNECTED");
    if (!server.listening) return;
    await new Promise((resolve) => server.close(resolve));
    listening = null;
  }

  return Object.freeze({
    start,
    stop,
    protocol: PROTOCOL,
    address: () => server.address(),
    inflightCount: () => inflight.size,
    extensionConnected: () => liveSessions().length > 0,
    sessionCount: () => liveSessions().length,
    localMethods: () => Object.keys(taiCho)
  });
}
