/* scouter-transport-loopback.mjs — DÂY của cửa Bridge: WebSocket tới 127.0.0.1.
 *
 * Đề bài: docs/briefs/BRIEF-SCOUTER-SEED-01.md mục 2, khả năng ② "báo cáo qua Bridge".
 *
 * ─── ĐỌC CẢ BA BẢN RỒI QUYẾT, KHÔNG CHÉP BẢN GẦN TAY NHẤT ───────────────────
 * Brief bắt làm đúng thế, và ở file này nó đổi ra một khác biệt AN TOÀN, không phải thẩm mỹ.
 * Đo ngày 06/09, cả `bridge-transport-loopback.js` lẫn `bridge-host.mjs` đều CẢ BA KHÁC NHAU:
 *
 *   · ChatGPT (945 dòng) bắt tay HAI CHIỀU: gửi `auth_challenge` kèm nonce ngẫu nhiên, ĐỢI
 *     `auth_proof` = HMAC-SHA256(token, nonce), tự kiểm, RỒI mới đưa token ra.
 *   · Gemini (515) và Flow (498) gửi thẳng `{type:"auth", token}` ngay khi socket mở.
 *   · Máy chủ: chỉ bản ChatGPT ĐÒI challenge (`bridge-host.mjs:270` — không có
 *     `challengeAccepted` thì mọi khung `auth` bị từ chối). Hai bản kia nhận auth trần.
 *
 * Nghĩa là: chép bản Gemini "vì nó gần tay nhất" sẽ khiến Scouter — thứ có bề mặt quyền rộng
 * nhất repo này — đưa token ghép cặp cho BẤT KỲ tiến trình nào chiếm được cổng 32147 trước.
 * Seed dùng bắt tay hai chiều của bản ChatGPT.
 *
 * HỆ QUẢ PHẢI BIẾT TRƯỚC: seed này CHỈ nối được với máy chủ bản ChatGPT. Đấu với hai bản host
 * cũ thì `auth_challenge` bị coi là khung lạ và socket bị đóng — nhìn ra ngoài giống "Bridge
 * không lên". Đó là hỏng AN TOÀN, và nó cố ý.
 *
 * ─── THỨ CỐ Ý KHÔNG MANG SANG ───────────────────────────────────────────────
 * · Cổng executor (`chrome.runtime.Port` tới bảng bên): seed không có bảng bên. ADR-0009 ⑷.
 * · Danh tính đa profile / workspace: ADR-0009 ⑷ hoãn đa profile tới khi có thứ thật để nhân bản.
 * · `chrome.alarms` làm lưới đỡ nối lại: KHÔNG nằm trong file này, và cố ý. Đức duyệt quyền
 *   `alarms` ngày 07/09 (S-02), nhưng Chrome ép sàn 30 giây một lượt hẹn còn tầng thử-lại ở
 *   đây chạy 1s/2s/5s — nên alarm không thay được nó, alarm chỉ ĐÁNH THỨC service worker đã
 *   ngủ. Hai việc khác nhau, để ở hai chỗ: lưới đỡ nằm ở `scouter-background.js`.
 *   `options.schedule` vẫn chừa đó cho phép ghim tiêm đồng hồ giả, không phải cho alarm.
 */

const PAIRING_STORAGE_KEY = "dac.bridge.pairing.v1";
const STATUS_STORAGE_KEY = "scouter.bridge.status.v1";

const KEEPALIVE_MS = 20000;
const KEEPALIVE_ACK_TIMEOUT_MS = 10000;
const HANDSHAKE_TIMEOUT_MS = 10000;
const RECONNECT_CEILING_MS = 5000;
const RECONNECT_DELAYS_MS = Object.freeze([1000, 2000, RECONNECT_CEILING_MS]);
const RECONNECT_WINDOW_MS = 120000;
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/;

/* ---- Ghép cặp -----------------------------------------------------------
 * Luật ở đây là bản viết lại của `bridge-pairing-core.js` — file DUY NHẤT giống hệt từng byte
 * ở cả ba worker (đo 06/09). Viết lại chứ không dùng lại vì bản kia là IIFE gán biến toàn cục
 * cho script cổ điển, còn seed chạy ESM trong service worker; nạp thẳng là không được.
 * Vì đây là hai bản của MỘT luật, `tests/scouter-transport-smoke.mjs` đọc file worker và ghim
 * bốn hằng số hợp đồng (host · dải cổng · hai đường dẫn · hình dạng token) phải khớp. Lệch là
 * ĐỎ, cố ý: hai bản của một luật thì sớm muộn nói hai câu khác nhau. */
export function validatePairing(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("PAIRING_FILE_INVALID: nội dung phải là JSON object.");
  if (input.schema_version !== 1) throw new Error("PAIRING_SCHEMA_UNSUPPORTED: schema_version phải bằng 1.");
  if (input.host !== "127.0.0.1") throw new Error("PAIRING_ENDPOINT_INVALID: host phải là 127.0.0.1.");
  if (!Number.isInteger(input.port) || input.port < 1024 || input.port > 65535) throw new Error("PAIRING_ENDPOINT_INVALID: port phải nằm trong 1024-65535.");
  const httpUrl = `http://127.0.0.1:${input.port}/v1/rpc`;
  const websocketUrl = `ws://127.0.0.1:${input.port}/v1/extension`;
  if (input.http_url !== httpUrl || input.websocket_url !== websocketUrl) throw new Error("PAIRING_ENDPOINT_INVALID: endpoint không khớp đường dẫn cố định Bridge V1.");
  if (!TOKEN_SHAPE.test(String(input.token || ""))) throw new Error("PAIRING_TOKEN_INVALID: token phải là 32 byte base64url.");
  if (base64UrlBytes(input.token).length !== 32) throw new Error("PAIRING_TOKEN_INVALID: token phải chứa đúng 32 byte.");
  return Object.freeze({ schema_version: 1, host: "127.0.0.1", port: input.port, http_url: httpUrl, websocket_url: websocketUrl, token: String(input.token) });
}

/* ---- base64url + bằng chứng của máy chủ --------------------------------- */

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

export async function verifyHostProof(cryptoApi, token, nonce, proof) {
  if (!TOKEN_SHAPE.test(String(proof || ""))) return false;
  try {
    const key = await cryptoApi.subtle.importKey("raw", base64UrlBytes(token), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    return await cryptoApi.subtle.verify("HMAC", key, base64UrlBytes(proof), new TextEncoder().encode(nonce));
  } catch (_error) {
    return false;
  }
}

/* ---- Vận chuyển ---------------------------------------------------------- */

export function createTransport(options = {}) {
  const chromeApi = options.chrome || globalThis.chrome;
  const WebSocketApi = options.WebSocket || globalThis.WebSocket;
  const cryptoApi = options.crypto || globalThis.crypto;
  const timers = options.timers || globalThis;
  const dispatch = options.dispatch;
  const maxEnvelopeBytes = Number(options.max_envelope_bytes) || 1024 * 1024;
  if (!chromeApi || !WebSocketApi || !cryptoApi || typeof dispatch !== "function") {
    throw new TypeError("Scouter transport needs chrome, WebSocket, crypto and dispatch.");
  }

  /* Số đo tiêm được để phép ghim không phải chờ thật. Giá trị vô nghĩa (NaN · Infinity · âm)
   * bị TRẢ VỀ MẶC ĐỊNH chứ không được nhận: một khe kiểm thử nhận Infinity là một transport
   * không còn giới hạn nào, tệ hơn hẳn việc từ chối giá trị đó. */
  const MAX_TIMING_MS = 86400000;
  function timingMs(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.min(MAX_TIMING_MS, parsed) : fallback;
  }
  const keepaliveMs = timingMs(options.keepalive_ms, KEEPALIVE_MS);
  const keepaliveAckTimeoutMs = timingMs(options.keepalive_ack_timeout_ms, KEEPALIVE_ACK_TIMEOUT_MS);
  const handshakeTimeoutMs = timingMs(options.handshake_timeout_ms, HANDSHAKE_TIMEOUT_MS);
  const reconnectWindowMs = timingMs(options.reconnect_window_ms, RECONNECT_WINDOW_MS);
  const configuredDelays = Array.isArray(options.reconnect_delays_ms)
    ? options.reconnect_delays_ms.map((value) => Number(value)).filter(Number.isFinite)
    : [];
  const reconnectDelays = (configuredDelays.length ? configuredDelays : RECONNECT_DELAYS_MS)
    .map((value) => Math.min(RECONNECT_CEILING_MS, Math.max(1, value)));

  let pairing = null;
  let socket = null;
  let authenticated = false;
  let hostProofVerified = false;
  let authSent = false;
  let handshakeNonce = null;
  let keepaliveTimer = null;
  let keepaliveDeadlineTimer = null;
  let handshakeTimer = null;
  let reconnectTimer = null;
  let reconnectAttempt = 0;
  let reconnectElapsedMs = 0;
  let connecting = false;
  /* Một socket chỉ xác thực ĐÚNG MỘT LẦN. Thiếu chốt này thì một `auth_ok` mà trình duyệt đã
   * xếp hàng sẵn có thể làm sống lại một socket vừa bị hạn chót ACK tuyên chết, và một máy chủ
   * lặp `auth_ok` sẽ khởi động lại nhịp keepalive mãi mãi nên không lần dò nào kịp bắn. */
  const settledSockets = new WeakSet();

  function armTimer(kind, callback, delay) {
    const handle = timers[kind](callback, delay);
    /* Node trả về một Timeout giữ tiến trình sống; Chrome trả về một số. Nhả ở chỗ có, để một
     * lượt chạy headless của phép ghim vẫn thoát được. */
    if (handle && typeof handle.unref === "function") handle.unref();
    return handle;
  }

  function clearHandshakeDeadline() {
    if (handshakeTimer) timers.clearTimeout(handshakeTimer);
    handshakeTimer = null;
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
    reconnectAttempt = 0;
    reconnectElapsedMs = 0;
  }

  function state() {
    /* Xác thực rồi KHÔNG đồng nghĩa với đang nối: một socket không còn OPEN thì không phải một
     * kết nối, dù nó từng xác thực xong. */
    if (authenticated && socket && socket.readyState === WebSocketApi.OPEN) return "connected";
    if (!pairing) return "unpaired";
    return "disconnected";
  }

  async function publishStatus(status, reason = null) {
    try {
      await chromeApi.storage.local.set({
        [STATUS_STORAGE_KEY]: { status, reason, at: new Date().toISOString() }
      });
    } catch (_error) { /* Trạng thái là để người đọc; nó không được phép làm chết đường sống. */ }
  }

  function dropSocket(targetSocket) {
    if (socket !== targetSocket) return false;
    socket = null;
    authenticated = false;
    hostProofVerified = false;
    authSent = false;
    handshakeNonce = null;
    clearKeepalive();
    clearHandshakeDeadline();
    scheduleReconnect();
    return true;
  }

  /* Nhả quyền sở hữu TRƯỚC khi bảo trình duyệt đóng: một socket có thể nằm ở CLOSING lâu tuỳ ý
   * khi đối phương im lặng, và việc hồi phục không được chờ một sự kiện có thể không bao giờ tới. */
  function abandonSocket(targetSocket, code, reason) {
    dropSocket(targetSocket);
    try { targetSocket.close(code, reason); } catch (_error) { /* Hồi phục ở trên không phụ thuộc lượt đóng này. */ }
  }

  function armKeepaliveDeadline(targetSocket) {
    if (keepaliveDeadlineTimer) return;
    keepaliveDeadlineTimer = armTimer("setTimeout", () => {
      keepaliveDeadlineTimer = null;
      if (socket !== targetSocket) return;
      /* Lần dò không ai trả lời nghĩa là socket nửa mở: với ta thì vẫn "mở", với máy chủ thì đã
       * mất. Đóng nó để trạng thái thôi báo "connected" và việc nối lại bắt đầu được. */
      reconnectElapsedMs += keepaliveMs + keepaliveAckTimeoutMs;
      abandonSocket(targetSocket, 1000, "Keepalive ACK deadline exceeded.");
    }, keepaliveAckTimeoutMs);
  }

  function startKeepalive(targetSocket) {
    clearKeepalive();
    keepaliveTimer = armTimer("setInterval", () => {
      if (socket !== targetSocket || !authenticated) return;
      if (targetSocket.readyState !== WebSocketApi.OPEN) {
        abandonSocket(targetSocket, 1000, "Socket left OPEN without a close event.");
        return;
      }
      targetSocket.send(JSON.stringify({ type: "keepalive", sent_at: new Date().toISOString() }));
      armKeepaliveDeadline(targetSocket);
    }, keepaliveMs);
  }

  function scheduleReconnect() {
    if (!pairing || authenticated || reconnectTimer) return;
    /* Quá cửa sổ thì máy chủ không quay lại sớm đâu; thôi giữ service worker thức vì nó. */
    if (reconnectElapsedMs >= reconnectWindowMs) return;
    const delay = reconnectDelays[Math.min(reconnectAttempt, reconnectDelays.length - 1)];
    reconnectAttempt += 1;
    reconnectElapsedMs += delay;
    const schedule = typeof options.schedule === "function"
      ? options.schedule
      : (callback, ms) => armTimer("setTimeout", callback, ms);
    reconnectTimer = schedule(() => {
      reconnectTimer = null;
      if (!pairing || authenticated) return;
      connect().catch(() => publishStatus("disconnected", "HOST_UNAVAILABLE"));
    }, delay);
  }

  function freshNonce() {
    const bytes = new Uint8Array(32);
    cryptoApi.getRandomValues(bytes);
    return base64Url(bytes);
  }

  async function handleMessage(event, targetSocket) {
    let message;
    try {
      if (typeof event.data !== "string" || new TextEncoder().encode(event.data).byteLength > maxEnvelopeBytes + 8192) {
        throw new Error("invalid transport frame");
      }
      message = JSON.parse(event.data);
    } catch (_error) {
      abandonSocket(targetSocket, 1007, "Text JSON required.");
      return;
    }
    if (socket !== targetSocket) return;

    if (!authenticated && message?.type === "auth_proof" && typeof message.proof === "string"
      && handshakeNonce && !hostProofVerified && !authSent) {
      /* Ghép cặp mà bằng chứng này bị xử theo được ĐÓNG BĂNG ở đây. Nếu chủ đổi ghép cặp giữa
       * chừng, đoạn dưới không được đọc bản mới rồi đưa token MỚI cho một máy chủ chỉ vừa
       * chứng minh nó biết token CŨ. */
      const pairingAtProof = pairing;
      const nonceAtProof = handshakeNonce;
      const verified = await verifyHostProof(cryptoApi, pairingAtProof.token, nonceAtProof, message.proof);
      if (socket !== targetSocket || !verified || pairing !== pairingAtProof || targetSocket.readyState !== WebSocketApi.OPEN) {
        abandonSocket(targetSocket, 1008, "Host authentication failed.");
        return;
      }
      hostProofVerified = true;
      authSent = true;
      targetSocket.send(JSON.stringify({ type: "auth", role: "extension", token: pairingAtProof.token }));
      return;
    }

    if (message?.type === "auth_ok" && typeof message.session_id === "string") {
      if (!hostProofVerified || !authSent || targetSocket.readyState !== WebSocketApi.OPEN || settledSockets.has(targetSocket)) {
        abandonSocket(targetSocket, 1008, "Unexpected authentication frame.");
        return;
      }
      settledSockets.add(targetSocket);
      authenticated = true;
      clearHandshakeDeadline();
      clearReconnect();
      /* Lên nhịp TRƯỚC khi ghi trạng thái: đường sống không được phụ thuộc vào storage. */
      startKeepalive(targetSocket);
      await publishStatus("connected");
      return;
    }

    if (!authenticated) {
      abandonSocket(targetSocket, 1008, "Host authentication is not complete.");
      return;
    }

    if (message?.type === "keepalive_ack") {
      /* Chỉ ACK trả lời một lần dò ĐANG TREO mới là một vòng đi-về trọn vẹn. Một ACK tự dưng
       * gửi tới không chứng minh gì và không được nạp lại ngân sách nối lại. */
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

    const response = await dispatch(message.envelope);
    if (socket === targetSocket && authenticated && targetSocket.readyState === WebSocketApi.OPEN) {
      targetSocket.send(JSON.stringify({ type: "rpc_response", relay_id: message.relay_id, envelope: response }));
    }
  }

  async function loadPairing() {
    const stored = await chromeApi.storage.local.get([PAIRING_STORAGE_KEY]);
    const raw = stored?.[PAIRING_STORAGE_KEY];
    if (!raw) {
      pairing = null;
      await publishStatus("unpaired");
      return null;
    }
    /* Tệp ghép cặp hỏng nằm sẵn trong kho lưu thì kết quả là CHƯA GHÉP CẶP, không phải một
     * ngoại lệ bay ra khỏi service worker. Không nới chốt nào: socket vẫn không mở khi không
     * có một `pairing` hợp lệ — chỉ đổi cách hỏng từ "nổ" thành "nói ra". */
    try {
      pairing = validatePairing(raw);
    } catch (error) {
      pairing = null;
      await publishStatus("unpaired", String(error?.message || error).split(":")[0]);
      return null;
    }
    return pairing;
  }

  async function connect() {
    /* Một lượt nối tại một thời điểm. Đọc ghép cặp là một `await`, nên không có cờ này thì hai
     * lời gọi song song đều thấy `socket === null` rồi cùng mở socket, và cái mở sau lặng lẽ
     * cướp chỗ cái mở trước. */
    if (connecting || authenticated || socket) return null;
    connecting = true;
    try {
      if (!pairing) await loadPairing();
      if (!pairing) return null;
      const candidate = new WebSocketApi(pairing.websocket_url);
      socket = candidate;
      authenticated = false;
      hostProofVerified = false;
      authSent = false;
      handshakeNonce = freshNonce();

      handshakeTimer = armTimer("setTimeout", () => {
        handshakeTimer = null;
        /* Phủ CẢ hai kiểu treo: còn CONNECTING, hoặc đã OPEN mà máy chủ không bao giờ trả lời. */
        if (socket !== candidate || authenticated) return;
        reconnectElapsedMs += handshakeTimeoutMs;
        abandonSocket(candidate, 1000, "Handshake deadline exceeded.");
      }, handshakeTimeoutMs);

      candidate.onopen = () => {
        if (socket !== candidate) return;
        candidate.send(JSON.stringify({ type: "auth_challenge", role: "extension", nonce: handshakeNonce }));
      };
      candidate.onmessage = (event) => {
        handleMessage(event, candidate).catch(() => abandonSocket(candidate, 1011, "Transport handler failed."));
      };
      candidate.onclose = () => {
        if (dropSocket(candidate)) publishStatus("disconnected", "HOST_UNAVAILABLE");
      };
      candidate.onerror = () => { /* `onclose` là chỗ dọn dẹp có thẩm quyền. */ };
      return candidate;
    } finally {
      connecting = false;
    }
  }

  function disconnect() {
    clearKeepalive();
    clearReconnect();
    clearHandshakeDeadline();
    authenticated = false;
    hostProofVerified = false;
    authSent = false;
    const current = socket;
    socket = null;
    try { current?.close?.(1000, "Transport stopped."); } catch (_error) { /* Cố hết sức. */ }
  }

  return Object.freeze({
    connect,
    disconnect,
    loadPairing,
    state,
    PAIRING_STORAGE_KEY,
    STATUS_STORAGE_KEY
  });
}

export const TRANSPORT_CONSTANTS = Object.freeze({
  PAIRING_STORAGE_KEY,
  STATUS_STORAGE_KEY,
  KEEPALIVE_MS,
  KEEPALIVE_ACK_TIMEOUT_MS,
  HANDSHAKE_TIMEOUT_MS,
  RECONNECT_DELAYS_MS,
  RECONNECT_WINDOW_MS
});
