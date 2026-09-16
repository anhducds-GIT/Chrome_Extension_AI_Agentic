/* bridge-core.mjs — CỬA BRIDGE của Udin Optic: giao thức + từ vựng method.
 *
 * Cắt từ `duc-scouter/v0.1.0/scripts/scouter-bridge-core.mjs` ngày 15/09 khi Udin tách ra gói
 * riêng (`T21`). Đây là **tệp CỐ Ý KHÁC bản gốc** — nó là chỗ gói này hẹp lại.
 *
 * ─── TỪ VỰNG ĐÓNG Ở MƯỜI HAI LỆNH ───────────────────────────────────────────
 * Scouter khai 24. Udin dùng 12, đo bằng chính năm tệp ở `tu-dong/`:
 *   `session.hello` · `system.capabilities` · `system.ping` · `scout.targets` ·
 *   `scout.query` · `scout.text` · `scout.wait` ·
 *   `scout.click` · `scout.type` · `scout.clear` · `scout.grab` · `scout.navigate`
 *
 * **CẮT chứ không TẮT** (ADR-0021 ⑵): 12 lệnh kia không nằm trong `METHOD_ENTRIES`, nên chúng
 * trả `METHOD_NOT_FOUND` — *không tồn tại*, chứ không phải *tồn tại mà đang bị chặn*. Cái sau
 * thì bật lại được bằng một dòng cờ; cái này thì bật lại là **thêm một method**, tức đổi luật
 * an toàn, tức phải hỏi Đức.
 *
 * Ba lệnh bị cắt đáng nói riêng:
 *   · `scout.fetch` — Udin **cố ý** không dùng: ảnh nằm trên S3 sau URL ký hạn giờ và mọi `src`
 *     ra tới ngoài đều đã mất chữ ký, nên nó trả 403 (`S-24`, đo 14/09). Đường đúng là
 *     `scout.grab`. Giữ `scout.fetch` là giữ một cửa gọi mạng tuỳ ý mà gói này không cần.
 *   · `scout.reload` — vòng tự nạp lại là việc của **seed**, không phải của một gói chạy việc.
 *   · `scout.shot` · `scout.tree` · `scout.a11y` · `scout.network` — Udin không dò trang lạ.
 *
 * ─── HAI ĐẦU MỘT SỢI DÂY ────────────────────────────────────────────────────
 * `PROTOCOL` dưới đây phải khớp chuỗi trong `bridge/udin-optic-host.mjs`. **Không được trùng**
 * `duc-scouter.bridge`: `hnx-fetch` mất một buổi ngày 08/09 vì hai đầu nói hai tên — cùng cổng,
 * cùng token, vẫn không nối được, và triệu chứng chỉ là *"im lặng"*.
 *
 * Phần KHÔNG đổi so với bản gốc (khung `registryEntry`, hợp đồng phong bì, bảng lỗi) giữ nguyên
 * từng dòng — ở đó lệch một ký tự là hai đầu dây không hiểu nhau.
 */

import { MOUSE_BUTTON_NAMES, NAMED_KEY_NAMES } from "./scouter-actions-core.mjs";

/* ---- Hằng số trên dây (khớp bridge-host.mjs) ----------------------------- */

export const PROTOCOL = "udin-optic.bridge";
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
  /* HAI MÃ CỦA ĐƯỜNG GHI TỰ KIỂM (`S1`/`S2`, 16/09). Chúng KHÁC `ACTION_FAILED` ở chỗ quan
   * trọng nhất: sự kiện ĐÃ bắn đi, lệnh ĐÃ chạy trọn — thứ thiếu là **bằng chứng trang đã
   * nhận**. Gộp vào `ACTION_FAILED` thì người gọi đi tìm lỗi ở lệnh, trong khi lệnh không hỏng.
   *
   * `retryable: false` là cố ý, và đây là chỗ dễ làm sai nhất: gõ lại một ô KHÔNG tự xoá chữ
   * cũ nghĩa là **gõ hai lần** vào ô đó. Một mã "thử lại được" ở đây sẽ sinh ra đúng cái hỏng
   * mà `S-16` đã ghi. Thử lại là quyết định của người gọi, sau khi họ nhìn lại trang. */
  WRITE_NOT_OBSERVED: { retryable: false, message: "Keys were dispatched but the field never showed them." },
  CLICK_NOT_OBSERVED: { retryable: false, message: "The click was dispatched but the expected change never happened." },
  /* `retryable: false` DÙ xoá hai lần bằng xoá một lần: lượt thử lại bắn đúng hai phím vừa
   * thất bại, nên nó không chữa được nguyên nhân nào mà vẫn tiêu một suất của cái phanh. */
  CLEAR_NOT_OBSERVED: { retryable: false, message: "Ctrl+A and Delete were dispatched but the field still has characters." },
  RELOAD_RATE_LIMIT: { retryable: false, message: "The previous self-reload was too recent." },
  INTERNAL_ERROR: { retryable: false, message: "The extension could not complete the request." }
});

export class BridgeProtocolError extends Error {
  constructor(code, message, details) {
    if (!Object.hasOwn(ERROR_DEFINITIONS, code)) throw new TypeError(`Unknown Udin Optic bridge error code '${code}'.`);
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

/* Trần chờ SAU một cú bấm (`S2`). 20.000ms chứ không phải 30.000 của `scout.wait`, và con số
 * này có ràng buộc số học: `deadline_ms` của `scout.click` là 34.000, còn lượt bấm (cuộn vào
 * tầm nhìn, đo hộp, hỏi-điểm, ba khung chuột) đã ăn một phần. Cho phép chờ kịch 30.000 là mở
 * lại đúng `S-16`: máy chủ bỏ cuộc trước, extension vẫn đang chờ, và hai đầu tin hai chuyện. */
const MAX_CHO_SAU_BAM_MS = 20000;

function requiredSelector(value) {
  return selectorTai(value, "params.selector");
}

/* Cùng luật selector, nhưng NÓI ĐÚNG TÊN TRƯỜNG đang sai. `scout.click` nay có HAI selector
 * (`selector` và `wait_for`), và một câu lỗi luôn trỏ vào `params.selector` sẽ bắt người gọi
 * đi sửa đúng cái trường đang đúng. */
function selectorTai(value, duong) {
  if (typeof value !== "string" || value.trim() === "") invalidParams(duong, "expected a non-empty string");
  if (value.length > 1024) invalidParams(duong, "expected at most 1024 characters");
  /* Không kiểm cú pháp CSS ở đây: engine CSS của Chrome là trọng tài duy nhất đúng, và
   * `scouter-probes.mjs` đã trả `SELECTOR_INVALID` cho selector sai. Selector đi làm THAM SỐ
   * giao thức, không bao giờ đi qua một parser JavaScript nào — xem khối "SELECTOR ĐI ĐƯỜNG
   * NÀO" ở đầu `scripts/scouter-probes.mjs`. */
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

/* Ba bảng dưới đây cũng ĐỌC THẲNG bảng của lõi, cùng lý do với `requiredKeyName`: khai lại ở
 * đây là dựng bản thứ hai, và hai bản thì lệch. `HISTORY_DIRECTIONS` thì gõ tại chỗ vì nó chỉ
 * có hai giá trị và lõi không xuất nó ra — nếu có ngày nó dài hơn hai, hãy xuất và đọc. */
function optionalMouseButton(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || !MOUSE_BUTTON_NAMES.includes(value)) {
    invalidParams("params.button", `expected one of: ${MOUSE_BUTTON_NAMES.join(", ")}`);
  }
  return value;
}

function requiredHistoryDirection(value) {
  if (value !== "back" && value !== "forward") {
    invalidParams("params.direction", "expected one of: back, forward");
  }
  return value;
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
 * Bốn `scout.*` là bốn phép dò của `scripts/scouter-probes.mjs`, khai TƯỜNG MINH từng cái
 * thay vì một method `scout.probe {name}` chung. Lý do: khai tường minh thì `system.capabilities`
 * nói thẳng cho AI ở đầu dây biết gọi được gì, và cờ `read_only` trở thành thứ CƯỠNG CHẾ ĐƯỢC
 * theo từng method — với một method chung thì cờ đó là lời hứa suông. */
const METHOD_ENTRIES = [
  registryEntry({
    name: "session.hello", read_only: true, deadline_ms: 10000,
    description: "Negotiate protocol version and report the Udin Optic session identity.",
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
    description: "Describe the fixed method vocabulary of this Udin Optic extension.",
    params_schema: {}, params_validator: noParams
  }),
  registryEntry({
    name: "system.ping", read_only: true, deadline_ms: 10000,
    description: "Report that the Udin Optic service worker is awake.",
    params_schema: {}, params_validator: noParams
  }),
  registryEntry({
    name: "scout.targets", read_only: true, deadline_ms: 10000,
    description: "List and classify Chrome debug targets. Read-only: no attach to any page.",
    params_schema: {}, params_validator: noParams
  }),
  /* ---- `scout.view` MỞ 14/09 — [ADR-0007], phép ĐỌC của nhóm "nhìn & đi lại" ----
   * Đứng TRƯỚC `scout.scroll` và `scout.zoom` trong lộ trình, và thứ tự đó là bắt buộc chứ
   * không phải tiện: ba method ghi hứa *"đã bắn sự kiện"*, không hứa *"trang đã nhận"* — nên
   * một lệnh đổi tầm nhìn mà không có đường đọc lại tầm nhìn là một lệnh không kiểm được. */
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
    name: "scout.text", read_only: true, deadline_ms: 30000,
    description: "Read the visible text of the ONE element a selector matches. Refuses 0 or 2+ matches; caps at 5000 characters; never returns outerHTML (ADR-0006).",
    params_schema: { selector: "string", target_id: "string" },
    params_validator: (raw) => {
      /* CỐ Ý không có tham số nới trần hay bỏ phép kiểm khớp-đúng-một: cả hai là điều kiện
       * của [ADR-0006], không phải tuỳ chọn. Trường lạ bị `objectParams` từ chối ở cửa. */
      const params = objectParams(raw, ["selector", "target_id"]);
      return {
        selector: requiredSelector(params.selector),
        target_id: requiredTargetId(params.target_id)
      };
    }
  }),
  /* ---- BA PHÉP DÒ QUAN SÁT MỞ THÊM 07/09 --------------------------------
   * Đức chốt: *"đối chiếu xem còn có thể add thêm gì vào seed & Scouter thì add thêm"*.
   * Hồ sơ `docs/studies/SCOUTER-CAPABILITY-INVENTORY-V1.md` mục 1.2 liệt kê mười năng lực
   * còn thiếu; ba cái dưới đây là số 3, 7 và 4 của danh sách đó.
   *
   * Cả ba `read_only: true` — khác hẳn `scout.fetch`. Chúng KHÔNG chạm mạng, KHÔNG sửa
   * trang, và KHÔNG chạy mã của người gọi: chúng đọc thứ Chrome đã tính sẵn. Nên chúng
   * không phải trả giá của cái phanh, và điều đó là đúng chứ không phải nới lỏng. */
  /* ---- HAI LỆNH MỞ THÊM 12/09 — Đức chốt -------------------------------
   * `deadline_ms` của cả hai đặt 34000, và con số đó KHÔNG tự chọn: máy chủ Bridge bỏ cuộc
   * một lượt chuyển tiếp ở 35.000ms (`requestTimeoutMs` của `bridge-host-core.mjs`). Đặt
   * rộng hơn 35s là dựng một cái hẹn không bao giờ tới lượt — máy chủ đã trả `REQUEST_TIMEOUT`
   * cho người gọi từ trước, trong khi extension vẫn đang làm. Trần THẬT của lượt chờ nằm ở
   * `MAX_WAIT_MS`/`MAX_NET_MS` trong lõi đọc, thấp hơn nữa. */
  registryEntry({
    name: "scout.wait", read_only: true, deadline_ms: 34000,
    description: "Wait inside the browser until a CSS selector matches (present), stops matching (absent), or becomes actually clickable (usable), then answer once. Replaces dozens of polling round trips. Times out with satisfied=false rather than failing. Use usable when something may be covered by an overlay: present only proves the element is in the DOM, not that a click would reach it.",
    params_schema: {
      target_id: "string", selector: "string", state: "present|absent|usable?",
      min_count: "integer:1..200?", timeout_ms: "integer:100..30000?", poll_ms: "integer:100..5000?"
    },
    params_validator: (raw) => {
      const params = objectParams(raw, ["target_id", "selector", "state", "min_count", "timeout_ms", "poll_ms"]);
      if (params.state !== undefined && params.state !== null
        && params.state !== "present" && params.state !== "absent" && params.state !== "usable") {
        invalidParams("params.state", "expected present, absent or usable");
      }
      return {
        target_id: requiredTargetId(params.target_id),
        selector: requiredSelector(params.selector),
        state: params.state === undefined || params.state === null ? "present" : params.state,
        min_count: optionalInt(params.min_count, "params.min_count", 1, 200),
        timeout_ms: optionalInt(params.timeout_ms, "params.timeout_ms", 100, 30000),
        poll_ms: optionalInt(params.poll_ms, "params.poll_ms", 100, 5000)
      };
    }
  }),
  /* ---- BA HÀNH ĐỘNG GHI (S-01) --------------------------------------------
   * Đây là chỗ Scouter thôi làm người quan sát và thành kẻ hành động (ADR-0009). Cả ba đều
   * `read_only: false`, và cả ba đều bắt buộc `selector` — không có method nào bấm theo toạ độ,
   * cố ý: xem chốt ⑶ ở đầu `scripts/scouter-actions-core.mjs`.
   *
   * `deadline_ms` rộng hơn phép dò: một lượt bấm phải cuộn phần tử vào tầm nhìn, đo hộp, rồi
   * gửi ba khung chuột; một lượt gõ gửi hai khung cho MỖI ký tự.
   *
   * NHƯNG KHÔNG RỘNG HƠN NGƯỠNG MÁY CHỦ (`S-16`, sửa 12/09). `scout.type` từng khai 60000 và
   * `scout.navigate` 70000, trong khi máy chủ Bridge bỏ cuộc ở `DEFAULT_REQUEST_TIMEOUT_MS`
   * = 35000. Quá ngưỡng đó thì **hai đầu tin hai chuyện khác nhau**: máy chủ đã trả
   * `REQUEST_TIMEOUT` cho người gọi, extension thì vẫn đang gõ. Người gọi thấy "hỏng" và thử
   * lại — và với `scout.type` thử lại nghĩa là **GÕ HAI LẦN** vào một ô có thể đã đầy chữ.
   * Một hạn chờ khai dài hơn thực tế không mua thêm thời gian; nó chỉ mua một lời nói dối.
   *
   * Nay cả ba xuống 34000, cùng con số với `scout.wait` — và con `B9` ở
   * `tests/scouter-bridge-smoke.mjs` so TỪNG method với ngưỡng đọc thẳng từ lõi máy chủ, nên
   * mục này không tái phát bằng một lượt gõ tay nữa. */
  registryEntry({
    name: "scout.click", read_only: false, deadline_ms: 34000,
    description: "Click one element with the browser's real mouse, so the page sees isTrusted:true. Refuses unless the selector matches exactly one visible element. Coordinates are computed from the element box, never accepted from the caller. A click leaves no universal trace, so by itself this returns da_kiem:false and says so: it proves the event was dispatched, NOT that the page reacted. Pass wait_for (a selector that must appear, or disappear with wait_state:absent) to make it verifiable — then it fails with CLICK_NOT_OBSERVED instead of quietly succeeding. Optional button (left|right|middle) and click_count (1..3) for right-click and double-click; omitting all of them behaves exactly as before.",
    params_schema: {
      target_id: "string", selector: "string", button: "left|right|middle?", click_count: "integer:1..3?",
      wait_for: "string?", wait_state: "present|absent?", wait_timeout_ms: "integer:100..20000?"
    },
    params_validator: (raw) => {
      const params = objectParams(raw, ["target_id", "selector", "button", "click_count",
        "wait_for", "wait_state", "wait_timeout_ms"]);
      /* `wait_state` CỐ Ý không nhận `usable`, dù `scout.wait` có nó. Ở đây ta hỏi *"cú bấm có
       * làm trang đổi không"*, và `usable` trả lời một câu khác — *"cái đó có bấm được không"*.
       * Nhận nó vào là mời người gọi kiểm một thứ rồi tưởng mình đã kiểm thứ kia. */
      if (params.wait_state !== undefined && params.wait_state !== null
        && params.wait_state !== "present" && params.wait_state !== "absent") {
        invalidParams("params.wait_state", "expected present or absent");
      }
      if ((params.wait_state !== undefined && params.wait_state !== null
        || params.wait_timeout_ms !== undefined && params.wait_timeout_ms !== null)
        && (params.wait_for === undefined || params.wait_for === null)) {
        invalidParams("params.wait_for", "required when wait_state or wait_timeout_ms is given");
      }
      return {
        target_id: requiredTargetId(params.target_id),
        selector: requiredSelector(params.selector),
        button: optionalMouseButton(params.button),
        click_count: optionalInt(params.click_count, "params.click_count", 1, 3),
        wait_for: params.wait_for === undefined || params.wait_for === null
          ? undefined : selectorTai(params.wait_for, "params.wait_for"),
        wait_state: params.wait_state ?? undefined,
        wait_timeout_ms: optionalInt(params.wait_timeout_ms, "params.wait_timeout_ms", 100, MAX_CHO_SAU_BAM_MS)
      };
    }
  }),
  /* ---- HAI LỆNH "ĐI LẠI" MỞ 14/09 — [ADR-0007] --------------------------
   * Cả hai đi kèm luật ĐỌC-TRƯỚC: `scout.view` đọc lại tầm nhìn là thứ duy nhất kiểm được
   * chúng, vì cả hai chỉ hứa *"đã bắn sự kiện"*. */
  registryEntry({
    name: "scout.type", read_only: false, deadline_ms: 34000,
    description: "Type a string into one element with the browser's real keyboard, one key at a time, then READ THE FIELD BACK and refuse to call it done if the text is not there. Refuses control characters: Enter and Tab go through scout.key. Does not clear the field first. Three outcomes, never two: da_kiem:true when the read-back shows the text arrived; WRITE_NOT_OBSERVED when it does not; da_kiem:false with a sentence when the field cannot be read back at all (a password field masks its value, the accessibility value was truncated, the element vanished). Do NOT retry on WRITE_NOT_OBSERVED without looking at the page: this command does not clear the field, so a blind retry types the text twice.",
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
    name: "scout.clear", read_only: false, deadline_ms: 30000,
    description: "Clear one input/textarea with real keystrokes (Ctrl+A then Delete), then READ THE FIELD BACK and refuse to call it done while characters remain. The key and the modifier are hard-coded in the write core; no parameter can change them. Three outcomes, never two: da_kiem:true when the read-back shows the field empty; CLEAR_NOT_OBSERVED when characters are still there; da_kiem:false with a sentence when the field cannot be read back at all. Read kiem_noi even on success: it says whether the field actually held anything before, because clearing an already-empty field confirms the STATE without proving the keystrokes reached the page. Unlike scout.type this works on a password field: a masked value means characters REMAIN, which is an answer, not a blind spot.",
    params_schema: { target_id: "string", selector: "string" },
    params_validator: (raw) => {
      /* CỐ Ý chỉ hai trường. Một tham số `key` hay `modifiers` ở đây là mở lại đúng cửa mà
       * `input.clear` đóng: Ctrl + phím tuỳ ý chạm tới lệnh của TRÌNH DUYỆT (Ctrl+W đóng tab). */
      const params = objectParams(raw, ["target_id", "selector"]);
      return {
        target_id: requiredTargetId(params.target_id),
        selector: requiredSelector(params.selector)
      };
    }
  }),
  /* `scout.grab` — MỞ 14/09, Đức chốt `S-24` đường ⒜.
   *
   * Nó nhận **selector**, không nhận url, và đó là cả lý do nó tồn tại: ảnh của một trang thật
   * hay nằm sau URL **ký sẵn**, mà lõi đọc cắt query khỏi `src`/`href` (chính sách che), nên
   * `scout.fetch` chỉ nhận được nửa URL. Ở đây URL được đọc ở trong extension, dùng để tải, rồi
   * **không đi ra dây** — trả về byte và một `source.masked` gốc+đường dẫn.
   *
   * `deadline_ms` 34000 bằng `scout.fetch`: nó cũng là một lượt gọi mạng, và con `B9` so từng
   * method với ngưỡng đọc thẳng từ lõi máy chủ. */
  registryEntry({
    name: "scout.grab", read_only: false, deadline_ms: 34000,
    description: "Download the file one element points to (its src or href), using the URL read inside the browser. The URL itself is never returned: signed URLs keep their signature out of logs and off disk. Takes a selector, never a URL, and refuses unless it matches exactly one element.",
    params_schema: { target_id: "string", selector: "string", attribute: "src|href?", part: "integer:0..?" },
    params_validator: (raw) => {
      const params = objectParams(raw, ["target_id", "selector", "attribute", "part"]);
      /* Danh sách TRẮNG hai tên, kiểm ở đây CHỨ KHÔNG chỉ ở lõi hành động: cửa từ vựng là chỗ
       * người gọi nhận được câu trả lời rõ ràng, và là chỗ duy nhất một tên lạ bị chặn trước
       * khi nó chạm tới trang. */
      let attribute = null;
      if (params.attribute !== undefined && params.attribute !== null) {
        if (params.attribute !== "src" && params.attribute !== "href") {
          invalidParams("params.attribute", String.fromCharCode(39) + "src" + String.fromCharCode(39) + " or " + String.fromCharCode(39) + "href" + String.fromCharCode(39));
        }
        attribute = params.attribute;
      }
      return {
        target_id: requiredTargetId(params.target_id),
        selector: requiredSelector(params.selector),
        attribute,
        /* `part` — số thứ tự khúc (`G-59`). Tệp lớn hơn một phong bì thì xin từng khúc; số khúc
         * do máy trả về (`parts`), người gọi không phải tự tính. Không có trần trên ở đây: tệp
         * dài bao nhiêu thì `parts` nói thật, và xin quá thì máy chủ trả `416`. */
        part: optionalInt(params.part, "params.part", 0, Number.MAX_SAFE_INTEGER)
      };
    }
  }),
  registryEntry({
    /* ĐI SANG TRANG KHÁC. `read_only: false` không phải hình thức: đổi trang là điều khiển
     * trang, nên nó chui qua phanh và trả giá hạn mức y như `scout.click`. */
    name: "scout.navigate", read_only: false, deadline_ms: 34000,
    description: "Navigate one tab to an http(s) URL and wait until the new document is readable. Returns the URL actually reached, which may differ after redirects.",
    /* `timeout_ms` trần 30000, KHÔNG phải 34000: extension phải kịp bỏ cuộc VÀ trả lời xong
     * trước khi máy chủ cắt dây. Bốn giây chênh là chỗ cho lượt trả lời đi về. Cùng hình dạng
     * với `scout.wait` (trần chờ 30000, `deadline_ms` 34000) — một khuôn, không hai. */
    params_schema: { target_id: "string", url: "string", timeout_ms: "integer:1000..30000?" },
    params_validator: (raw) => {
      const params = objectParams(raw, ["target_id", "url", "timeout_ms"]);
      return {
        target_id: requiredTargetId(params.target_id),
        url: requiredHttpUrl(params.url),
        timeout_ms: optionalInt(params.timeout_ms, "params.timeout_ms", 1000, 30000)
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
    seed: "udin-optic-v0.1",
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

/* ---- VỚT `request_id` TỪ PHONG BÌ THÔ (S-13) ----------------------------
 * Vì sao cần: `parseRequest` ném TRƯỚC khi biến `request` được gán, nên mọi lượt bị từ chối ở
 * tầng phong bì trả về `request_id: null`. Máy chủ Bridge khớp phản hồi với lượt gọi **bằng
 * đúng trường đó**, nên nó không khớp được và thay cả phản hồi bằng
 * `INTERNAL_ERROR / uncorrelated_extension_response`.
 *
 * Hệ quả RỘNG HƠN mục `S-13` mô tả: **mọi** lý do từ chối ở tầng phong bì đều bị nuốt — sai dấu
 * thời gian, thiếu `client_id`, phong bì quá khổ — người gọi chỉ thấy "lỗi nội bộ" và không có
 * đường nào tự sửa. Đo 08/09 trên Bridge chạy thật, lặp lại 3 lần, ổn định.
 *
 * Hàm này KHÔNG được ném và KHÔNG tin dữ liệu vào. Nó CỐ Ý **không tự kiểm hình dạng**:
 * `failureResponse` đã kiểm `REQUEST_ID` ở cửa ra, và cửa ra là đường DUY NHẤT phản hồi đi qua.
 * Bản đầu có thêm một lượt kiểm ở đây; đột biến kiểm 08/09 cho thấy **hoàn nguyên nó mà phép
 * ghim vẫn xanh** — tức nó là bình luận, không phải chốt. Hai bản của một luật thì bản nào
 * hỏng cũng không ai biết, nên giữ đúng một bản, ở cửa ra. */
function requestIdTho(input) {
  try {
    const o = typeof input === "string" ? JSON.parse(input) : input;
    return typeof o?.request_id === "string" ? o.request_id : null;
  } catch (_error) {
    return null;   /* không đọc nổi JSON thì không có gì để vớt — đúng là `null` */
  }
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
  if (missing.length) throw new TypeError(`Udin Optic dispatcher is missing handlers for: ${missing.join(", ")}.`);

  return async function dispatch(input) {
    let request = null;
    /* Vớt TRƯỚC khi kiểm: sau khi `parseRequest` ném thì không còn chỗ nào lấy được nữa. */
    const idTho = requestIdTho(input);
    try {
      request = parseRequest(input);
      const entry = requireMethod(request.method);
      const params = entry.params_validator(request.params);
      const result = await handlers[request.method](params, { request, method: entry });
      return successResponse(request, result, now);
    } catch (error) {
      const id = request?.request_id ?? idTho;
      if (error instanceof BridgeProtocolError) return failureResponse(id, error, now);
      return failureResponse(id, "INTERNAL_ERROR", now, undefined, {
        message: String(error?.message ?? error).slice(0, 300)
      });
    }
  };
}
