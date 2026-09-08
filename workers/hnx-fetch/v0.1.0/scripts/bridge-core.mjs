/* scouter-bridge-core.mjs — CỬA BRIDGE của Scouter seed: giao thức + từ vựng method.
 *
 * Đề bài: docs/briefs/BRIEF-SCOUTER-SEED-01.md mục 2, khả năng ② "báo cáo qua Bridge".
 * Quyết định: ADR-0009 (Scouter là gì) · ADR-0010 (dừng ở SEED v0.1).
 *
 * ─── VÌ SAO KHÔNG CHÉP `bridge-core.js` CỦA WORKER NÀO ──────────────────────
 * Brief mục 2 bắt đọc cả ba worker rồi quyết TỪNG FILE, vì "chép bản gần tay nhất là đẻ ra
 * bản trôi dạt thứ tư". Đo lại ngày 06/09 (`md5sum`): `bridge-core.js` CẢ BA KHÁC NHAU
 * (798 · 1022 · 8xx dòng), và 22 trong 25 method của chúng là chuyện xếp hàng job XLSX —
 * Scouter không có hàng đợi, không có workbook, không có bảng bên. Chép về là mang theo
 * 20 method chết cùng toàn bộ luật thử lại của một sản phẩm khác.
 *
 * Thứ ĐƯỢC lấy lại nguyên vẹn là **khung `registryEntry`** (mục 3 bảng kiểm kê ghi đúng thế:
 * "khung giống nhau; nội dung từng method dính nhà cung cấp") và **hợp đồng phong bì trên
 * dây** — cái sau không phải lựa chọn thẩm mỹ, xem khối dưới.
 *
 * ─── TÊN GIAO THỨC LÀ CỦA CHÍNH SCOUTER (đổi 07/09) ────────────────────────
 * Trước 07/09 chuỗi này là `"duc-auto-chatgpt.bridge"`, vì Scouter nối vào máy chủ của gói
 * kia và máy chủ đó so sánh CHÍNH XÁC chuỗi đó ở cả hai chiều. Lý do đúng ở thời điểm ấy.
 *
 * Đức chốt 07/09: Scouter phải có host RIÊNG, để sau này nhân bản seed sang nhiều extension.
 * Hai chỗ hỏng của cách cũ: Scouter phụ thuộc lúc chạy vào một gói ĐÃ ĐÓNG BĂNG, và mỗi bản
 * clone lại mang tên một sản phẩm khác. Nay host của Scouter dựng trên lõi dùng chung
 * `workers/_shared/bridge-host/`, và lõi đó NHẬN tên giao thức qua tham số.
 *
 * HAI ĐẦU MỘT SỢI DÂY: chuỗi dưới đây phải khớp `PROTOCOL` trong
 * `bridge/scouter-bridge-host.mjs`. Nhân bản seed sang extension khác thì đổi cả hai.
 */


/* ---- Hằng số trên dây (khớp bridge-host.mjs) ----------------------------- */

export const PROTOCOL = "hnx-fetch.bridge";
export const SUPPORTED_VERSIONS = Object.freeze([1]);
export const MAX_ENVELOPE_BYTES = 1024 * 1024;

/* ---- Bảng lỗi ------------------------------------------------------------
 * CỐ Ý NHỎ. Bảng của worker có 24 mã, phần lớn nói về hàng đợi job và phê duyệt của chủ —
 * Scouter seed không có hai thứ đó, nên mang về là mang về mã chết. Mã nào ở đây cũng có
 * ít nhất một đường sinh ra nó trong file này hoặc trong `scouter-seed-core.mjs`. */
export const ERROR_DEFINITIONS = Object.freeze({
  INVALID_ENVELOPE: { retryable: false, message: "The RPC envelope is invalid." },
  UNSUPPORTED_VERSION: { retryable: false, message: "No supported major protocol version was offered." },
  METHOD_NOT_FOUND: { retryable: false, message: "The requested method is not registered." },
  INVALID_PARAMS: { retryable: false, message: "The method parameters are invalid." },
  PROBE_FAILED: { retryable: false, message: "The read-only probe could not complete." },
  ACTION_FAILED: { retryable: false, message: "The input action could not complete." },
  /* Khác ACTION_FAILED một cách CỐ Ý: `ACTION_FAILED` nghĩa là đã thử và không xong,
   * `WRITE_BLOCKED` nghĩa là CHƯA HỀ THỬ vì cái phanh đóng. Gộp hai mã lại thì người ở đầu dây
   * kia không phân biệt được "nút không bấm được" với "anh chưa mở khoá", và sẽ đi sửa nhầm chỗ. */
  WRITE_BLOCKED: { retryable: false, message: "The write path is closed; no input was dispatched." },
  RELOAD_RATE_LIMIT: { retryable: false, message: "The previous self-reload was too recent." },
  INTERNAL_ERROR: { retryable: false, message: "The scouter could not complete the request." }
});

export class BridgeProtocolError extends Error {
  constructor(code, message, details) {
    if (!Object.hasOwn(ERROR_DEFINITIONS, code)) throw new TypeError(`Unknown scouter bridge error code '${code}'.`);
    const definition = ERROR_DEFINITIONS[code];
    super(message || definition.message);
    this.name = "BridgeProtocolError";
    this.code = code;
    this.retryable = definition.retryable;
    this.details = details && typeof details === "object" && !Array.isArray(details) ? details : {};
  }
}

/* ---- Kiểm tham số -------------------------------------------------------- */

function isPlainObject(value) {
  return Boolean(value) && Object.prototype.toString.call(value) === "[object Object]";
}

function invalidParams(path, issue) {
  throw new BridgeProtocolError("INVALID_PARAMS", `Invalid params at '${path}': ${issue}`, { path, issue });
}

function objectParams(raw, allowed) {
  const params = raw === undefined || raw === null ? {} : raw;
  if (!isPlainObject(params)) invalidParams("params", "expected an object");
  /* Trường lạ bị TỪ CHỐI, không bị lờ đi: một tham số gõ sai (`limits` thay vì `limit`) mà
   * được lờ đi sẽ chạy im lặng với giá trị mặc định, và người gọi tưởng mình đã đặt nó. */
  const unknown = Object.keys(params).filter((key) => !allowed.includes(key));
  if (unknown.length) invalidParams("params", `unknown field '${unknown[0]}'`);
  return params;
}

/* ---- BỐN PHÉP KIỂM CHO `scout.fetch` (S-10) ------------------------------
 * Đây là method đầu tiên của Scouter đi ra INTERNET, nên chỗ kiểm tham số ở đây là trạm gác
 * thật, không phải thủ tục. Đức mở `<all_urls>` ngày 07/09 để không phải xin quyền theo từng
 * trang — mở vùng ĐÍCH thì phải siết vùng HÌNH DẠNG, nếu không thì không còn lớp nào.
 *
 * `requiredHttpUrl` CHỈ nhận http/https. Cấm `file:` (đọc đĩa của Đức), `chrome-extension:`
 * (đọc chính gói này), `data:`/`blob:` (không phải mạng, chỉ làm rối nhật ký). Đây không phải
 * lo xa: `fetch()` trong service worker nuốt cả `file:` mà không kêu một tiếng.
 *
 * `optionalHeaders` cấm `cookie` và `authorization` — HAI cái tên đó, không phải cả bảng.
 * Trình duyệt tự gắn cookie khi `with_credentials` bật, nên người gọi KHÔNG bao giờ cần tự gõ
 * chúng; mà cho gõ thì method này thành công cụ mượn danh tính của bất kỳ ai. Các header khác
 * để mở, vì đó đúng là thứ Đức bảo đừng giới hạn theo từng ca. */
function requiredHttpUrl(value) {
  if (typeof value !== "string" || value.trim() === "") invalidParams("params.url", "expected a non-empty string");
  if (value.length > 2048) invalidParams("params.url", "expected at most 2048 characters");
  let parsed;
  try { parsed = new URL(value); }
  catch { return invalidParams("params.url", "expected an absolute URL"); }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    invalidParams("params.url", `expected an http: or https: URL, got '${parsed.protocol}'`);
  }
  return parsed.toString();
}

const FETCH_METHODS = Object.freeze(["GET", "POST"]);

function optionalHttpMethod(value) {
  if (value === undefined || value === null) return "GET";
  if (typeof value !== "string" || !FETCH_METHODS.includes(value)) {
    invalidParams("params.method", `expected one of: ${FETCH_METHODS.join(", ")}`);
  }
  return value;
}

const FORBIDDEN_HEADERS = Object.freeze(["cookie", "authorization"]);

function optionalHeaders(value) {
  if (value === undefined || value === null) return {};
  if (!isPlainObject(value)) invalidParams("params.headers", "expected an object of string to string");
  const entries = Object.entries(value);
  if (entries.length > 20) invalidParams("params.headers", "expected at most 20 headers");
  const out = {};
  for (const [name, headerValue] of entries) {
    if (typeof name !== "string" || name.trim() === "") invalidParams("params.headers", "expected non-empty header names");
    if (FORBIDDEN_HEADERS.includes(name.toLowerCase())) {
      invalidParams(`params.headers.${name}`, "cookie and authorization are never accepted from the caller; use with_credentials instead");
    }
    if (typeof headerValue !== "string") invalidParams(`params.headers.${name}`, "expected a string value");
    if (headerValue.length > 1024) invalidParams(`params.headers.${name}`, "expected at most 1024 characters");
    out[name] = headerValue;
  }
  return out;
}

function optionalBodyText(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") invalidParams("params.body", "expected a string");
  if (value.length > 65536) invalidParams("params.body", "expected at most 65536 characters");
  return value;
}

function optionalFlag(value, path) {
  if (value === undefined || value === null) return false;
  if (typeof value !== "boolean") invalidParams(path, "expected true or false");
  return value;
}

function noParams(raw) {
  objectParams(raw, []);
  return {};
}

/* ---- Khung registryEntry (lấy lại từ worker) ---------------------------- */

function registryEntry(values) {
  return Object.freeze({
    name: values.name,
    read_only: values.read_only,
    deadline_ms: values.deadline_ms,
    capability_description: values.description,
    params_schema: Object.freeze({ ...values.params_schema }),
    params_validator: values.params_validator
  });
}

/* ---- TỪ VỰNG CỐ ĐỊNH ----------------------------------------------------
 * Bất biến số một của Observer (ADR-0007) sống tiếp ở đây dưới dạng mới: Scouter nhận một BỘ
 * TỪ VỰNG CỐ ĐỊNH, không nhận biểu thức tự do. ADR-0009 thay bất biến "chỉ đọc" bằng "hành
 * động được", nhưng KHÔNG thay bất biến "từ vựng cố định" — và ở lượt SEED v0.1 việc ② này,
 * đúng MỘT method không read_only, và nó không chạm trang nào: nó nạp lại chính extension.
 *
 * Bốn `scout.*` là bốn phép dò của `scripts/observer-probes.mjs`, khai TƯỜNG MINH từng cái
 * thay vì một method `scout.probe {name}` chung. Lý do: khai tường minh thì `system.capabilities`
 * nói thẳng cho AI ở đầu dây biết gọi được gì, và cờ `read_only` trở thành thứ CƯỠNG CHẾ ĐƯỢC
 * theo từng method — với một method chung thì cờ đó là lời hứa suông. */
const METHOD_ENTRIES = [
  registryEntry({
    name: "session.hello", read_only: true, deadline_ms: 10000,
    description: "Negotiate protocol version and report the scouter session identity.",
    params_schema: { supported_versions: "positive_integer[]" },
    params_validator: (raw) => {
      const params = objectParams(raw, ["supported_versions"]);
      /* Gọi để nó NÉM khi không có phiên bản chung — giá trị chọn được tính lại ở handler. */
      negotiateVersion(params.supported_versions);
      return { supported_versions: [...params.supported_versions] };
    }
  }),
  registryEntry({
    name: "system.capabilities", read_only: true, deadline_ms: 10000,
    description: "Describe the fixed method vocabulary of this scouter seed.",
    params_schema: {}, params_validator: noParams
  }),
  registryEntry({
    name: "system.ping", read_only: true, deadline_ms: 10000,
    description: "Report that the scouter service worker is awake.",
    params_schema: {}, params_validator: noParams
  }),
  registryEntry({
    /* ---- LỆNH GỌI MẠNG (S-10, Đức chốt 07/09) ----------------------------
     * Method đầu tiên của Scouter đi ra ngoài trình duyệt. Nó tồn tại vì một phép đo, không vì
     * một ý thích: `hnx.vn` gửi chuỗi chứng chỉ THIẾU (chỉ lá, không có trung gian
     * "GlobalSign GCC R3 EV TLS CA 2025"). Chrome tự đi lấy phần thiếu nên vào được; Node thì
     * ném `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. Nên đi vòng qua trình duyệt KHÔNG phải cho đẹp
     * kiến trúc — ở máy này nó là đường DUY NHẤT không phải tắt kiểm chứng chỉ.
     *
     * `read_only: false` DÙ nó chỉ đọc dữ liệu. Cố ý, và đây là chỗ dễ cãi nhất của method này:
     * cờ đó không hỏi "có sửa trang không", nó hỏi "có phải đi qua phanh không". Với
     * `<all_urls>` thì một lượt gọi chạm được mọi trang Đức đang đăng nhập, nên nó phải chui
     * qua đúng cái phanh mà `scout.click` chui qua. Xếp nó `read_only: true` là để nó chạy tự
     * do đúng lúc nó nguy hiểm nhất.
     *
     * KHÔNG dùng `Runtime.*` cũng KHÔNG dùng `Network.*`/`Fetch.*` — hai cửa đó đóng từ
     * ADR-0007 và lượt này không mở. Đây là `fetch()` của chính service worker. */
    name: "scout.fetch", read_only: false, deadline_ms: 60000,
    description: "Fetch one http(s) URL with the browser's own network stack. Returns text by default; set as=\"base64\" for binary bodies such as PDF. Credentials are omitted unless with_credentials is set. Refuses cookie and authorization headers from the caller.",
    params_schema: {
      url: "string", method: "GET|POST?", headers: "object?", body: "string?",
      with_credentials: "boolean?", as: "text|base64?"
    },
    params_validator: (raw) => {
      const params = objectParams(raw, ["url", "method", "headers", "body", "with_credentials", "as"]);
      const method = optionalHttpMethod(params.method);
      const body = optionalBodyText(params.body);
      /* GET kèm thân là thứ `fetch()` NÉM chứ không bỏ qua — bắt ở đây thì người gọi đọc được
       * câu tiếng người, thay vì một TypeError trần từ trong service worker. */
      if (method === "GET" && body !== null) invalidParams("params.body", "a GET request takes no body");
      /* `as` chỉ có HAI giá trị và mặc định là giá trị cũ, nên mọi lượt gọi đã có không đổi
       * hành vi. Một giá trị lạ bị TỪ CHỐI chứ không âm thầm rơi về mặc định: rơi về mặc định
       * nghĩa là người xin nhị phân sẽ nhận văn bản hỏng mà không hề biết — đúng cái lỗi mà
       * tham số này sinh ra để chữa. */
      let as = "text";
      if (params.as !== undefined && params.as !== null) {
        if (params.as !== "text" && params.as !== "base64") {
          invalidParams("params.as", 'expected "text" or "base64"');
        }
        as = params.as;
      }
      return {
        url: requiredHttpUrl(params.url),
        method,
        headers: optionalHeaders(params.headers),
        body,
        with_credentials: optionalFlag(params.with_credentials, "params.with_credentials"),
        as
      };
    }
  }),
];

export const METHOD_NAMES = Object.freeze(METHOD_ENTRIES.map((entry) => entry.name));

export const METHOD_REGISTRY = Object.freeze(Object.fromEntries(
  METHOD_ENTRIES.map((entry) => [entry.name, entry])
));

export function negotiateVersion(clientVersions) {
  if (!Array.isArray(clientVersions) || !clientVersions.length
    || clientVersions.some((version) => !Number.isInteger(version) || version < 1)) {
    invalidParams("params.supported_versions", "expected a non-empty array of positive integer major versions");
  }
  const offered = new Set(clientVersions);
  const selected = [...SUPPORTED_VERSIONS].sort((left, right) => right - left).find((version) => offered.has(version));
  if (selected === undefined) {
    throw new BridgeProtocolError("UNSUPPORTED_VERSION", undefined, { supported_versions: [...SUPPORTED_VERSIONS] });
  }
  return selected;
}

export function requireMethod(method) {
  if (!Object.hasOwn(METHOD_REGISTRY, method)) {
    throw new BridgeProtocolError("METHOD_NOT_FOUND", undefined, { method });
  }
  return METHOD_REGISTRY[method];
}

export function capabilities() {
  return {
    protocol: PROTOCOL,
    protocol_versions: [...SUPPORTED_VERSIONS],
    seed: "hnx-fetch-v0.1",
    methods: METHOD_ENTRIES.map((entry) => ({
      name: entry.name,
      read_only: entry.read_only,
      deadline_ms: entry.deadline_ms,
      description: entry.capability_description,
      params_schema: entry.params_schema
    }))
  };
}

/* ---- Phong bì ------------------------------------------------------------ */

const REQUEST_ID = /^[\x21-\x7e]{8,128}$/;
const METHOD_SHAPE = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

function invalidEnvelope(message, details = {}) {
  throw new BridgeProtocolError("INVALID_ENVELOPE", message, details);
}

export function parseRequest(input) {
  const envelope = typeof input === "string" ? decodeJson(input) : input;
  if (!isPlainObject(envelope)) invalidEnvelope("The request must be a JSON object.");
  if (envelope.protocol !== PROTOCOL) invalidEnvelope(`protocol must equal '${PROTOCOL}'.`, { field: "protocol" });
  if (!Number.isInteger(envelope.version) || envelope.version < 1) invalidEnvelope("version must be a positive integer.", { field: "version" });
  if (!SUPPORTED_VERSIONS.includes(envelope.version)) {
    throw new BridgeProtocolError("UNSUPPORTED_VERSION", undefined, { supported_versions: [...SUPPORTED_VERSIONS] });
  }
  if (envelope.kind !== "request") invalidEnvelope("kind must equal 'request'.", { field: "kind" });
  if (!REQUEST_ID.test(String(envelope.request_id))) invalidEnvelope("request_id must be 8-128 visible ASCII characters.", { field: "request_id" });
  if (typeof envelope.method !== "string" || !METHOD_SHAPE.test(envelope.method)) invalidEnvelope("method must be a dotted lowercase identifier.", { field: "method" });
  if (!TIMESTAMP.test(String(envelope.sent_at)) || Number.isNaN(Date.parse(envelope.sent_at))) invalidEnvelope("sent_at must be an ISO-8601 UTC timestamp.", { field: "sent_at" });
  if (!isPlainObject(envelope.client)) invalidEnvelope("client must be an object.", { field: "client" });
  if (typeof envelope.client.client_id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(envelope.client.client_id)) {
    invalidEnvelope("client.client_id must be a stable 1-128 character identifier.", { field: "client.client_id" });
  }
  if (envelope.params !== undefined && !isPlainObject(envelope.params)) invalidEnvelope("params must be an object.", { field: "params" });
  return envelope;
}

function decodeJson(source) {
  if (byteLength(source) > MAX_ENVELOPE_BYTES) invalidEnvelope("The decoded envelope exceeds 1 MiB.", { max_envelope_bytes: MAX_ENVELOPE_BYTES });
  try { return JSON.parse(source); } catch (_error) { return invalidEnvelope("The request is not valid JSON."); }
}

function byteLength(value) {
  return new TextEncoder().encode(String(value)).byteLength;
}

function respondedAt(now) {
  const value = typeof now === "function" ? now() : new Date();
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError("now must produce a valid date.");
  return date.toISOString();
}

export function successResponse(request, result, now) {
  return {
    protocol: PROTOCOL,
    version: request.version,
    kind: "response",
    request_id: request.request_id,
    ok: true,
    result: result === undefined ? {} : result,
    responded_at: respondedAt(now)
  };
}

export function failureResponse(requestId, errorOrCode, now, message, details) {
  const error = errorOrCode instanceof BridgeProtocolError
    ? errorOrCode
    : new BridgeProtocolError(errorOrCode, message, details);
  return {
    protocol: PROTOCOL,
    version: SUPPORTED_VERSIONS[0],
    kind: "response",
    request_id: typeof requestId === "string" && REQUEST_ID.test(requestId) ? requestId : null,
    ok: false,
    error: { code: error.code, message: error.message, retryable: error.retryable, details: error.details },
    responded_at: respondedAt(now)
  };
}

/* ---- Cửa vào duy nhất ----------------------------------------------------
 * Một phong bì vào, một phong bì ra. KHÔNG NÉM: máy chủ Bridge chờ đúng một phản hồi cho mỗi
 * `relay_id`, nên một ngoại lệ lọt ra khỏi đây sẽ treo người gọi cho tới khi hết hạn chờ.
 * Mọi lỗi phải rời khỏi hàm này dưới dạng phong bì `ok:false`. */
export function createDispatcher(options = {}) {
  const handlers = isPlainObject(options.handlers) ? options.handlers : {};
  const now = options.now;

  /* Handler thiếu bị bắt LÚC DỰNG, không phải lúc có người gọi: một method khai trong bảng mà
   * không ai nối tay là lỗi lập trình, và phát hiện nó lúc nạp service worker rẻ hơn nhiều so
   * với phát hiện nó lúc AI đang chờ trả lời. */
  const missing = METHOD_NAMES.filter((name) => typeof handlers[name] !== "function");
  if (missing.length) throw new TypeError(`Scouter dispatcher is missing handlers for: ${missing.join(", ")}.`);

  return async function dispatch(input) {
    let request = null;
    try {
      request = parseRequest(input);
      const entry = requireMethod(request.method);
      const params = entry.params_validator(request.params);
      const result = await handlers[request.method](params, { request, method: entry });
      return successResponse(request, result, now);
    } catch (error) {
      if (error instanceof BridgeProtocolError) return failureResponse(request?.request_id, error, now);
      return failureResponse(request?.request_id, "INTERNAL_ERROR", now, undefined, {
        message: String(error?.message ?? error).slice(0, 300)
      });
    }
  };
}
