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
 * ─── VÌ SAO PROTOCOL VẪN LÀ "duc-auto-chatgpt.bridge" ───────────────────────
 * Tên đó đọc như tên sai. Nó KHÔNG phải tên sản phẩm, nó là HẰNG SỐ TRÊN DÂY: máy chủ Bridge
 * (`workers/duc-auto-chatgpt/v0.1.0/duc-auto-chatgpt-loopback-bridge-host-v1/bridge-host.mjs`
 * dòng 145 và 207) so sánh CHÍNH XÁC chuỗi này ở cả chiều vào lẫn chiều ra. Cả Gemini lẫn
 * Flow Video cũng dùng đúng chuỗi này, dù chúng là sản phẩm khác. Đổi nó = Scouter không nối
 * được vào máy chủ đang có. Đây là thứ phải đổi CÙNG LÚC ở host, không phải đổi một mình.
 */

import { NAMED_KEY_NAMES } from "./scouter-actions-core.mjs";

/* ---- Hằng số trên dây (khớp bridge-host.mjs) ----------------------------- */

export const PROTOCOL = "duc-auto-chatgpt.bridge";
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

function optionalInt(value, path, min, max) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    invalidParams(path, `expected an integer in ${min}..${max}`);
  }
  return value;
}

/* `target_id` là BẮT BUỘC cho ba phép dò chạm trang, cố ý — không có đường "tab đang mở".
 * Bảng kiểm kê ghi đúng khuyết tật đó ở nhánh Flow (`sidepanel.js:2551` hỏi lại
 * `chrome.tabs.query({active:true})` mỗi lần gửi), và hậu quả là việc bay sang tab khác khi
 * người dùng đổi tab giữa chừng. Muốn biết id thì gọi `scout.targets` — đó là việc của nó. */
function requiredTargetId(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9._:-]{1,128}$/.test(value)) {
    invalidParams("params.target_id", "expected a 1-128 character target id from scout.targets");
  }
  return value;
}

function requiredSelector(value) {
  if (typeof value !== "string" || value.trim() === "") invalidParams("params.selector", "expected a non-empty string");
  if (value.length > 1024) invalidParams("params.selector", "expected at most 1024 characters");
  /* Không kiểm cú pháp CSS ở đây: engine CSS của Chrome là trọng tài duy nhất đúng, và
   * `observer-probes.mjs` đã trả `SELECTOR_INVALID` cho selector sai. Selector đi làm THAM SỐ
   * giao thức, không bao giờ đi qua một parser JavaScript nào — xem khối "SELECTOR ĐI ĐƯỜNG
   * NÀO" ở đầu `scripts/observer-probes.mjs`. */
  return value;
}

/* Chuỗi gõ: cấm ký tự điều khiển ngay tại cổng phong bì, KHÔNG chỉ ở lõi. Hai lớp, cố ý —
 * lớp này cho người gọi một câu lỗi rõ ràng trước khi ta gắn debugger vào trang. */
function requiredTypedText(value) {
  if (typeof value !== "string" || value === "") invalidParams("params.text", "expected a non-empty string");
  if (value.length > 2000) invalidParams("params.text", "expected at most 2000 characters");
  for (const character of value) {
    const point = character.codePointAt(0);
    if (point < 0x20 || point === 0x7f) {
      invalidParams("params.text", "control characters go through scout.key, not scout.type");
    }
  }
  return value;
}

/* Tên phím phải nằm trong bảng cố định của lõi hành động. Khai lại danh sách ở đây thì hai bản
 * sẽ lệch, nên đọc thẳng bảng của lõi — nó là nguồn duy nhất. */
function requiredKeyName(value) {
  if (typeof value !== "string" || !NAMED_KEY_NAMES.includes(value)) {
    invalidParams("params.key", `expected one of: ${NAMED_KEY_NAMES.join(", ")}`);
  }
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
    name: "scout.targets", read_only: true, deadline_ms: 10000,
    description: "List and classify Chrome debug targets. Read-only: no attach to any page.",
    params_schema: {}, params_validator: noParams
  }),
  registryEntry({
    name: "scout.page", read_only: true, deadline_ms: 30000,
    description: "Page metadata plus a paged inventory of interactive elements on one target.",
    params_schema: { target_id: "string", offset: "integer:0..?", limit: "integer:1..200?" },
    params_validator: (raw) => {
      const params = objectParams(raw, ["target_id", "offset", "limit"]);
      return {
        target_id: requiredTargetId(params.target_id),
        offset: optionalInt(params.offset, "params.offset", 0, Number.MAX_SAFE_INTEGER),
        limit: optionalInt(params.limit, "params.limit", 1, 200)
      };
    }
  }),
  registryEntry({
    name: "scout.query", read_only: true, deadline_ms: 30000,
    description: "Count and describe the elements one CSS selector matches. This is the evidence golden rule 1 asks for.",
    params_schema: { selector: "string", target_id: "string", offset: "integer:0..?", limit: "integer:1..200?" },
    params_validator: (raw) => {
      const params = objectParams(raw, ["selector", "target_id", "offset", "limit"]);
      return {
        selector: requiredSelector(params.selector),
        target_id: requiredTargetId(params.target_id),
        offset: optionalInt(params.offset, "params.offset", 0, Number.MAX_SAFE_INTEGER),
        limit: optionalInt(params.limit, "params.limit", 1, 200)
      };
    }
  }),
  registryEntry({
    name: "scout.tree", read_only: true, deadline_ms: 30000,
    description: "DOM structure to depth N with masked attributes.",
    params_schema: { target_id: "string", depth: "integer:1..10?", max_nodes: "integer:1..500?" },
    params_validator: (raw) => {
      const params = objectParams(raw, ["target_id", "depth", "max_nodes"]);
      return {
        target_id: requiredTargetId(params.target_id),
        depth: optionalInt(params.depth, "params.depth", 1, 10),
        max_nodes: optionalInt(params.max_nodes, "params.max_nodes", 1, 500)
      };
    }
  }),
  /* ---- BA HÀNH ĐỘNG GHI (S-01) --------------------------------------------
   * Đây là chỗ Scouter thôi làm người quan sát và thành kẻ hành động (ADR-0009). Cả ba đều
   * `read_only: false`, và cả ba đều bắt buộc `selector` — không có method nào bấm theo toạ độ,
   * cố ý: xem chốt ⑶ ở đầu `scripts/scouter-actions-core.mjs`.
   *
   * `deadline_ms` rộng hơn phép dò: một lượt bấm phải cuộn phần tử vào tầm nhìn, đo hộp, rồi
   * gửi ba khung chuột; một lượt gõ gửi hai khung cho MỖI ký tự. */
  registryEntry({
    name: "scout.click", read_only: false, deadline_ms: 30000,
    description: "Click one element with the browser's real mouse, so the page sees isTrusted:true. Refuses unless the selector matches exactly one visible element. Coordinates are computed from the element box, never accepted from the caller.",
    params_schema: { target_id: "string", selector: "string" },
    params_validator: (raw) => {
      const params = objectParams(raw, ["target_id", "selector"]);
      return { target_id: requiredTargetId(params.target_id), selector: requiredSelector(params.selector) };
    }
  }),
  registryEntry({
    name: "scout.type", read_only: false, deadline_ms: 60000,
    description: "Type a string into one element with the browser's real keyboard, one key at a time. Refuses control characters: Enter and Tab go through scout.key. Does not clear the field first.",
    params_schema: { target_id: "string", selector: "string", text: "string" },
    params_validator: (raw) => {
      const params = objectParams(raw, ["target_id", "selector", "text"]);
      return {
        target_id: requiredTargetId(params.target_id),
        selector: requiredSelector(params.selector),
        text: requiredTypedText(params.text)
      };
    }
  }),
  registryEntry({
    name: "scout.key", read_only: false, deadline_ms: 30000,
    description: "Press one named key (Enter, Tab, Escape, Backspace, Delete, arrows, Home, End) on one element. The caller picks a NAME from the fixed table and never supplies a key code.",
    params_schema: { target_id: "string", selector: "string", key: "named_key" },
    params_validator: (raw) => {
      const params = objectParams(raw, ["target_id", "selector", "key"]);
      return {
        target_id: requiredTargetId(params.target_id),
        selector: requiredSelector(params.selector),
        key: requiredKeyName(params.key)
      };
    }
  }),
  registryEntry({
    /* Chân chạy của vòng tự cải tiến (ADR-0009 mục ⑸): AI ghi code mới xuống đĩa qua Bridge,
     * rồi gọi method này để Scouter nạp lại CHÍNH NÓ. Nó không chạm trang nào — nên nó là
     * method duy nhất `read_only: false` mà vẫn không phải "kẻ hành động" theo nghĩa ADR-0009. */
    name: "scout.reload", read_only: false, deadline_ms: 10000,
    description: "Reload the scouter extension itself so newly written code takes effect. Answers before restarting.",
    params_schema: {}, params_validator: noParams
  })
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
    seed: "scouter-seed-v0.1",
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
