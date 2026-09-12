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

/* ---- DANH TÍNH GHẾ — "Profile ID" trong lời Đức (12/09) ------------------
 * Dòng ở đầu file này trước đây ghi: *đa profile HOÃN tới khi có thứ thật để nhân bản*. Ngày
 * 12/09 cái "thứ thật" xuất hiện và ĐO ĐƯỢC: `bridge.sessions` trả về HAI ghế cùng nối, cả
 * hai `label: null` `legacy: true`. Hệ quả không phải thẩm mỹ — máy chủ định tuyến
 * FAIL-CLOSED, nên mọi lượt gọi không nêu đích bị từ chối `TARGET_AMBIGUOUS`, và cách duy
 * nhất còn lại để nêu đích là dán một chuỗi `legacy:<uuid>` đọc ra từ `bridge.sessions`.
 *
 * Máy chủ ĐÃ có sẵn chỗ cho việc này (`parseInstance`, và định tuyến theo `label` ở
 * `_shared/bridge-host/bridge-host-core.mjs`) — thiếu đúng phía extension. Nên đây KHÔNG phải
 * một method Bridge mới: luật gói số 4 giữ nguyên, từ vựng cửa Bridge không thêm chữ nào.
 * Nhãn đi kèm khung `auth`, là khung máy chủ vốn đã đọc.
 *
 * HAI khoá, không phải một, và cố ý:
 *   · `instance_id` — máy sinh MỘT LẦN rồi ở yên. Đây là danh tính ĐỊNH TUYẾN: một cái ghế tự
 *     đổi số giữa hai lượt nối lại thì mọi lệnh đang nhắm vào nó lạc chỗ.
 *   · `label` — người gõ, sửa lúc nào cũng được. Đây là cái TÊN Đức gọi.
 * Gộp hai thứ vào một khoá nghĩa là sửa tên thì mất ghế. */
const INSTANCE_STORAGE_KEY = "scouter.bridge.instance.v1";
const INSTANCE_LABEL_STORAGE_KEY = "scouter.bridge.instance_label.v1";
const INSTANCE_ID_SHAPE = /^[A-Za-z0-9-]{8,64}$/;
/* TÊN GÓI KHÔNG ĐƯỢC GÕ CỨNG VÀO FILE NÀY. File này được CHÉP NGUYÊN VĂN sang `hnx-fetch`
 * (và phép ghim ⑷ của gói đó so từng byte), nên một hằng số mang tên gói ở đây sẽ theo bản
 * chép sang gói khác và khiến gói đó **tự khai sai tên mình trên dây**.
 *
 * Tôi đã gõ cứng `"duc-scouter"` ở đây ngày 12/09 và phép ghim của `hnx-fetch` bắt được đúng
 * lượt chạy `npm test` đầu tiên sau đó. Đây là hình dạng khác của cùng cái bẫy mà luật gói
 * số 1 nói: **năng lực vào seed, hiểu biết riêng của một chỗ vào lớp nối dây.** Tên gói là
 * hiểu biết riêng.
 *
 * Nên nó là THAM SỐ, và mặc định là `null` = "không khai" — không phải một tên đoán bừa:
 * khai sai tên còn tệ hơn không khai, vì `bridge.sessions` là chỗ người ta nhìn để phân biệt
 * các ghế. */
const WORKER_ID_SHAPE = /^[a-z0-9][a-z0-9-]{0,63}$/;

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

/* Cắt trần TRƯỚC khi quét (O(trần), không phải O(đầu vào)), bỏ cả ký tự điều khiển C1, rồi quét
 * nốt nửa cặp thay thế LẠC mà chính lượt cắt vừa có thể tạo ra. Bản này phải khớp từng bước với
 * `sanitizeInstanceLabel` của máy chủ: lệch một bước thì nhãn extension gửi đi và nhãn máy chủ
 * lưu lại khác nhau, và Đức gọi tên nào cũng không trúng ghế nào.
 *
 * Dãy ký tự điều khiển dựng bằng CHUỖI ESCAPE chứ không gõ ký tự thật — gõ thật thì git coi cả
 * file là nhị phân và giấu diff vĩnh viễn. Cùng lý do ở phía máy chủ. */
const DIEU_KHIEN = new RegExp("[\\u0000-\\u001f\\u007f-\\u009f]", "g");
const NUA_CAP_LAC = new RegExp("(?:[\\ud800-\\udbff](?![\\udc00-\\udfff]))|(?:(?<![\\ud800-\\udbff])[\\udc00-\\udfff])", "g");

export function sanitizeInstanceLabel(value) {
  if (typeof value !== "string") return "";
  return value.slice(0, 256).replace(DIEU_KHIEN, "").trim().slice(0, 64).replace(NUA_CAP_LAC, "");
}

/* ---- Vận chuyển ---------------------------------------------------------- */

export function createTransport(options = {}) {
  const chromeApi = options.chrome || globalThis.chrome;
  const WebSocketApi = options.WebSocket || globalThis.WebSocket;
  const cryptoApi = options.crypto || globalThis.crypto;
  const timers = options.timers || globalThis;
  const dispatch = options.dispatch;
  const maxEnvelopeBytes = Number(options.max_envelope_bytes) || 1024 * 1024;
  /* Hình dạng sai thì KHÔNG khai, chứ không phải khai bừa: máy chủ nhận khối `instance` và
   * một `worker` rác ở đó đi thẳng vào bảng `bridge.sessions` mà người đọc đang tin. */
  const workerId = typeof options.worker_id === "string" && WORKER_ID_SHAPE.test(options.worker_id)
    ? options.worker_id
    : null;
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
  let instanceForSocket = null;
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
      /* `instance` là DỮ LIỆU ĐỊNH TUYẾN, không bao giờ tham gia xác thực — chỉ token quyết
       * định ai được vào. Nên thiếu nó thì vẫn đăng nhập được, chỉ là ngồi ghế không tên
       * (`legacy`) y như trước ngày 12/09: đọc danh tính hỏng KHÔNG được kéo theo mất kết nối. */
      const khungAuth = { type: "auth", role: "extension", token: pairingAtProof.token };
      if (instanceForSocket) khungAuth.instance = instanceForSocket;
      targetSocket.send(JSON.stringify(khungAuth));
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
      targetSocket.send(JSON.stringify({ type: "rpc_response", relay_id: message.relay_id, envelope: guiDuoc(response) }));
    }
  }

  /* TRẦN CHO PHONG BÌ ĐI RA — đối xứng với phép kiểm tin ĐI VÀO ở `handleMessage`.
   *
   * Đo thật 08/09 trên Bridge đang chạy: `scout.snapshot` và `scout.shot` **giết kết nối**,
   * 100% lặp lại được. Người gọi nhận `TRANSPORT_DISCONNECTED`, rồi mọi lệnh sau đó nhận
   * `EXTENSION_OFFLINE` cho tới khi extension tự nối lại (~1 giây).
   *
   * Vì sao: bộ giải khung của máy chủ nhận tối đa `MAX_ENVELOPE_BYTES + 8192`. Một ảnh chụp
   * màn hình hoặc một bản chụp DOM vượt trần đó, nên máy chủ ĐÓNG SOCKET thay vì trả lời.
   * Phía extension trước đây kiểm kích thước tin đi vào (dòng ~255) nhưng **không kiểm gì cả
   * ở đường gửi ra** — nên một câu trả lời quá to không thành lỗi, nó thành mất kết nối.
   *
   * Chặn ở ĐÂY chứ không ở từng method là cố ý: mọi câu trả lời đều đi qua đúng chỗ này, nên
   * một chốt ở đây che cả 15 method lẫn mọi method thêm sau. Vá riêng `snapshot` và `shot` là
   * để nguyên cái bẫy cho method thứ ba giẫm phải.
   *
   * Giữ NGUYÊN `request_id` và trả `ok:false`: người gọi phải nhận được một câu trả lời có
   * tương quan. Mất kết nối là câu trả lời tệ nhất — nó không nói được điều gì đã sai. */
  function guiDuoc(response) {
    let so;
    try {
      so = new TextEncoder().encode(JSON.stringify(response)).byteLength;
    } catch (_error) {
      so = Infinity; // không tuần tự hoá được thì cũng không gửi được
    }
    if (so <= maxEnvelopeBytes) return response;
    return {
      protocol: response?.protocol,
      version: response?.version,
      kind: "response",
      request_id: typeof response?.request_id === "string" ? response.request_id : null,
      ok: false,
      error: {
        code: "RESULT_TOO_LARGE",
        message: "The result is larger than one envelope allows.",
        retryable: false,
        details: {
          bytes: Number.isFinite(so) ? so : null,
          max_bytes: maxEnvelopeBytes
        }
      },
      responded_at: new Date().toISOString()
    };
  }

  /* ---- ĐỌC DANH TÍNH — TUẦN TỰ, không song song ---------------------------
   * Lượt đọc đầu tiên là một cặp "không thấy thì tạo rồi ghi". Hai lượt đọc chạy chồng nhau
   * lúc chưa có gì trong kho thì CẢ HAI thấy trống, cả hai đúc một `instance_id` khác nhau,
   * một cái được khai lên máy chủ còn cái kia nằm lại trên đĩa — nên ghế đổi số ở lượt nối
   * lại sau. Gói `duc-auto-chatgpt` đã dính đúng lỗi này (audit 03/09) và cách chữa là xếp
   * hàng; chép lại cách chữa, không chép lại lỗi.
   *
   * Hàng đợi này KHÔNG bảo vệ chống một tiến trình khác cùng ghi — nó không cần: cả hai lượt
   * đọc đều ở trong một service worker. */
  let instanceWork = Promise.resolve();
  function loadInstance() {
    const run = instanceWork.then(loadInstanceNow, loadInstanceNow);
    instanceWork = run.then(() => {}, () => {});
    return run;
  }

  async function loadInstanceNow() {
    const stored = await chromeApi.storage.local.get([INSTANCE_STORAGE_KEY, INSTANCE_LABEL_STORAGE_KEY]);
    let record = stored?.[INSTANCE_STORAGE_KEY];
    if (!record || typeof record !== "object" || typeof record.instance_id !== "string"
      || !INSTANCE_ID_SHAPE.test(record.instance_id)) {
      record = {
        schema_version: 1,
        instance_id: cryptoApi.randomUUID?.() || `inst-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`,
        created_at: new Date().toISOString()
      };
      await chromeApi.storage.local.set({ [INSTANCE_STORAGE_KEY]: record });
    }
    return {
      schema_version: 1,
      instance_id: record.instance_id,
      label: sanitizeInstanceLabel(stored?.[INSTANCE_LABEL_STORAGE_KEY]),
      worker: workerId,
      extension_version: chromeApi.runtime?.getManifest?.()?.version || "0.0.0"
    };
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
      /* Danh tính đọc MỘT LẦN mỗi lượt nối, TRƯỚC khi socket mở, rồi đông cứng cho cả lượt đó.
       * Hai lý do, và cả hai đều là chốt:
       *   · Khung `auth` gửi đi trong một nhánh async đã có sẵn một `await` (kiểm bằng chứng
       *     máy chủ). Thêm một `await` nữa vào đúng chỗ đó là thêm một khe cho socket đổi chủ
       *     giữa chừng. Đọc trước thì lúc gửi không còn `await` nào.
       *   · Đức vừa gõ tên xong thì lượt nối KẾ TIẾP khai tên mới — không phải nạp lại
       *     extension, cũng không phải khởi động lại máy chủ. `scouter-background.js` lo phần
       *     cắt dây cho lượt kế tiếp xảy ra ngay. */
      instanceForSocket = await loadInstance().catch(() => null);
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
    /* `loadInstance` CỐ Ý không có mặt ở đây. Nó là việc riêng của lượt bắt tay; bảng bên đọc
     * thẳng hai khoá lưu vì nó chỉ cần HIỂN THỊ, không cần đúc số ghế. Bày nó ra ngoài là dựng
     * sẵn một tầng cho một người dùng chưa tồn tại — và cái tầng đó sẽ đúc số ghế vào những lúc
     * không ai định đúc. */
    PAIRING_STORAGE_KEY,
    STATUS_STORAGE_KEY,
    INSTANCE_STORAGE_KEY,
    INSTANCE_LABEL_STORAGE_KEY
  });
}

export const TRANSPORT_CONSTANTS = Object.freeze({
  PAIRING_STORAGE_KEY,
  STATUS_STORAGE_KEY,
  INSTANCE_STORAGE_KEY,
  INSTANCE_LABEL_STORAGE_KEY,
  INSTANCE_ID_SHAPE,
  WORKER_ID_SHAPE,
  KEEPALIVE_MS,
  KEEPALIVE_ACK_TIMEOUT_MS,
  HANDSHAKE_TIMEOUT_MS,
  RECONNECT_DELAYS_MS,
  RECONNECT_WINDOW_MS
});
