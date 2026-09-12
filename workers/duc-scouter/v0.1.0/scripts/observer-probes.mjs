/* observer-probes.mjs — BỐN PHÉP DÒ READ-ONLY của Observer V0.
 *
 * Đề bài: docs/briefs/BRIEF-OBSERVER-V1.md mục 3a. Quyết định: docs/adr/0007-*.md.
 *
 * ─── BẤT BIẾN SỐ MỘT ────────────────────────────────────────────────────────
 * Observer nhận MỘT BỘ TỪ VỰNG CỐ ĐỊNH các phép dò. Nó KHÔNG BAO GIỜ nhận biểu thức
 * tự do từ bên ngoài. File này thi hành bất biến đó bằng BA chốt, không bằng lời hứa:
 *
 *   ⑴ Tên phép dò phải nằm trong `PROBE_NAMES`. Tên lạ → ném, không đoán.
 *   ⑵ Method CDP phải nằm trong `READ_ONLY_CDP_METHODS`. Danh sách này CỐ Ý KHÔNG CÓ
 *      `Runtime.*` — nghĩa là trong file này KHÔNG TỒN TẠI đường nào chạy JS trên trang.
 *      Đây là chỗ khác căn bản với `observer-engine.js` hôm nay: bản đó read-only vì
 *      *đúng một chuỗi được gõ cứng*, còn bản này read-only vì *kênh chạy mã không có mặt*.
 *   ⑶ Không tham số CDP nào được mang khoá chở-mã (`expression`, `functionDeclaration`,
 *      `text`, `value`, …). Chốt thừa so với ⑵ hôm nay — cố ý giữ, vì ⑵ là một DANH SÁCH
 *      và danh sách thì người ta nới ra được; ⑶ chặn theo HÌNH DẠNG tham số nên nó còn
 *      sống sau khi ai đó nới ⑵.
 *
 * ─── SELECTOR ĐI ĐƯỜNG NÀO, VÀ VÌ SAO ĐƯỜNG ĐÓ AN TOÀN ─────────────────────
 * Selector đi qua `DOM.querySelectorAll` của CDP, làm THAM SỐ giao thức:
 *
 *     send("DOM.querySelectorAll", { nodeId: <gốc>, selector: <chuỗi của người gọi> })
 *
 * Chuỗi đó được JSON-hoá vào một message CDP rồi Chrome đưa thẳng cho engine CSS. Nó
 * KHÔNG bao giờ đi qua một parser JavaScript nào, ở đâu, nên KHÔNG CÓ chỗ nào để "thoát
 * ra khỏi chuỗi" — vì không có chuỗi mã nào cả. Selector độc kiểu `'); doSomething(); ('`
 * chỉ là một selector CSS SAI: Chrome trả lỗi giao thức, và ta trả về mã `SELECTOR_INVALID`.
 *
 * Vì sao chọn đường này thay vì `Runtime.callFunctionOn` + `arguments`: cả hai đều an toàn
 * trên lý thuyết (callFunctionOn cũng bind giá trị vào tham số, không nối chuỗi), nhưng
 * callFunctionOn BẮT BUỘC phải mở `Runtime.*`. Mở `Runtime.*` là mở đúng cái cửa mà ADR-0007
 * nói là "read-only chết trong một dòng code" — sau đó chỉ còn kỷ luật con người canh cửa.
 * Đường CDP thuần thì không có cửa để canh. Rẻ hơn và chắc hơn, chọn nó.
 *
 * ─── THUẦN LOGIC ────────────────────────────────────────────────────────────
 * File này KHÔNG biết `chrome` là gì. Nó nhận vào một bộ "người gửi lệnh CDP" (`deps`)
 * và trả ra kết quả — nên phép ghim chạy được mà không cần Chrome, và lớp nối dây vào
 * `observer-engine.js` chỉ còn là vài dòng bơm `chrome.debugger.sendCommand` vào đây.
 */

import { ObserverEngine } from "../observer-engine.js";

/* ---- Từ vựng cố định ---------------------------------------------------- */

export const PROBE_NAMES = Object.freeze([
  "targets.list",
  "page.snapshot",
  "dom.query",
  "dom.tree",
  "a11y.tree",
  "page.shot",
  /* ---- HAI PHÉP DÒ MỞ THÊM 12/09 — Đức chốt ------------------------------
   * Cả hai sinh ra từ MỘT chỗ đau đo được: để dựng chuỗi thiết kế trên trang Optic, AI phải
   * biết **lúc nào việc xong**. Hôm nay nó chỉ biết bằng cách hỏi đi hỏi lại qua Bridge —
   * sinh một ảnh mất 60–90 giây là gần trăm vòng đi-về, và cái logic "xong chưa" nằm NGOÀI
   * trình duyệt nên không thấy được trạng thái ở giữa.
   *
   *   · `dom.wait`  — chờ ngay trong trình duyệt, trả về MỘT lần. Không mở thêm cửa CDP nào:
   *     nó dùng lại đúng `DOM.getDocument` + `DOM.querySelectorAll` mà `dom.query` đã dùng.
   *   · `network.watch` — nghe trang nói chuyện với máy chủ. Cái này CÓ mở cửa mới, và chỗ đó
   *     được giải trình riêng ở `READ_ONLY_CDP_METHODS` bên dưới.
   *
   * Cả hai `read_only`, và cả hai KHÔNG chạy mã của người gọi. */
  "dom.wait",
  "network.watch"
]);

/* Method CDP được phép. CỐ Ý không có `Runtime.*`, không có `Input.*`, không có
 * `DOMStorage.*`, không có `Page.navigate`, không có `DOM.set*`. Mọi cái ở đây đều là
 * getter thuần. Nới danh sách này = đổi luật an toàn = phải hỏi Đức (AGENTS.md mục 2). */
export const READ_ONLY_CDP_METHODS = Object.freeze([
  "DOM.enable",
  "DOM.getDocument",
  "DOM.querySelectorAll",
  "DOM.describeNode",
  "Target.getTargetInfo",
  /* ---- BA MIỀN MỞ THÊM 07/09 (Đức chốt "add thêm tính năng") ------------------
   * Cả ba vẫn là getter thuần: không cái nào sửa trang, không cái nào chạy mã của người
   * gọi. Đó là điều kiện để chúng vào được danh sách này — không phải vì chúng tiện.
   *
   * `Accessibility.*` là thuốc cho luật vàng 1 ("không đoán selector"): nó trả về
   * *"nút tên Gửi"* thay vì `div > div > button:nth-child(3)`. Trang đổi giao diện thì
   * class đổi, nhưng vai trò và tên thì ở lại.
   *
   * `DOMSnapshot.captureSnapshot` ĐÃ RỜI danh sách này ngày 08/09 cùng với `dom.snapshot`.
   * Nó là cửa CDP duy nhất từng mở mà nay không ai gọi, và một cửa mở không phục vụ ai thì
   * chỉ còn là bề mặt tấn công. Lý do bỏ `dom.snapshot`: nó giết service worker trên trang
   * lớn, đo thật 2/3 trang.
   *
   * `Page.captureScreenshot` — bằng chứng NHÌN THẤY ĐƯỢC, thay cho việc mượn mắt
   * Đức. Nó mở được vì ADR-0016 gỡ chính sách che dữ liệu và nay đã có đường ghi đĩa.
   * CỐ Ý không mở `Page.navigate` — cái đó điều khiển trang, không phải đọc trang. */
  "Accessibility.enable",
  "Accessibility.getFullAXTree",
  "Page.captureScreenshot",
  /* ---- `Network.*` MỞ NGÀY 12/09, và nó KHÔNG phải getter thuần ------------
   * Nói thẳng chỗ khác biệt trước khi nói vì sao vẫn nhận: mọi dòng phía trên là **getter** —
   * hỏi một câu, nhận một câu trả lời, hết. `Network.enable` là một **lượt đăng ký**: bật
   * xong thì Chrome bắt đầu đổ sự kiện về, và dòng đó chảy cho tới khi `Network.disable`.
   * Cái khác biệt đó có thật, đừng giấu nó sau chữ "read-only".
   *
   * Vì sao vẫn là ĐỌC: dòng chảy đi MỘT CHIỀU VÀO. `Network.enable` không sửa một byte nào
   * của trang, không gửi một request nào, không chạy một dòng mã nào của người gọi. Nó chỉ
   * mở tai. Đó là ranh giới thật, và nó khác hẳn `Input.*` hay `Runtime.*`.
   *
   * CỐ Ý CHỈ HAI DÒNG NÀY. Miền `Network` của Chrome có những method mạnh hơn nhiều, và
   * **không cái nào trong số đó có mặt ở đây** — nên chúng không tồn tại với file này, không
   * phải bị canh:
   *   · `Network.getCookies` · `Network.setCookie` — cảnh báo số 10 của bảng kiểm kê năng lực
   *   · `Network.getResponseBody` · `Network.getRequestPostData` — đọc được nội dung thật
   *   · `Network.setExtraHTTPHeaders` · `Network.setRequestInterception` — SỬA lượt gọi
   * Thêm bất cứ dòng nào trong số đó là đổi luật an toàn → hỏi Đức, đừng tự thêm.
   *
   * Lớp chặn thứ hai nằm ở chính `network.watch`: nó KHÔNG trả nguyên gói sự kiện Chrome đưa.
   * Gói đó chở `request.headers` — tức là cookie và token đăng nhập. `network.watch` nhặt ra
   * từng trường một theo danh sách trắng. Danh sách method mở được thì người ta nới được;
   * nhặt-theo-danh-sách-trắng thì nới cũng không lọt. */
  "Network.enable",
  "Network.disable",
  /* ---- HAI DÒNG MỞ NGÀY 12/09 cho `dom.wait state:"usable"` — Đức chốt ----
   * Cả hai là getter thuần, đúng nghĩa cũ: hỏi một câu, nhận một câu trả lời, không sửa một
   * byte nào của trang, không chạy một dòng mã nào của người gọi. `DOM.getBoxModel` hỏi *hộp
   * của phần tử nằm ở đâu*; `DOM.getNodeForLocation` hỏi *điểm này là phần tử nào*.
   *
   * CHÚNG CŨNG CÓ MẶT TRONG `scouter-actions-core.mjs`, VÀ ĐÓ KHÔNG PHẢI TRÙNG LẶP CẦN DỌN.
   * Luật gói số 6: đọc và ghi đi qua hai lõi khác nhau, và lõi này chứng minh được là
   * read-only vì kênh ghi KHÔNG CÓ MẶT trong file này — không phải vì hai file chia nhau một
   * danh sách. Gộp hai danh sách lại là xoá đúng cái ranh giới ấy: từ đó trở đi, ai nới danh
   * sách cho đường ghi là nới luôn cho đường đọc, một lượt, không ai thấy.
   * Nên hai bên khai riêng, mỗi bên một dòng giải trình của mình. Trông thừa; nó là ranh giới.
   *
   * Vì sao lõi ĐỌC cần chúng: `dom.wait` trước hôm nay chỉ trả lời được *"selector có khớp
   * không"*. Đo thật trên trang Optic ngày 12/09 — chờ `textarea.agent-textarea` trả
   * `satisfied` sau **36ms** trong khi một tấm chắn phủ kín ứng dụng, vì cả cây DOM vẫn nằm
   * nguyên bên dưới. Câu trả lời đúng về mặt chữ, vô dụng về mặt việc. `S-18`.
   *
   * CỐ Ý KHÔNG CÓ `DOM.scrollIntoViewIfNeeded` ở đây, dù lõi ghi có: cuộn trang là SỬA trạng
   * thái trang. Một phép dò không được tự ý xê dịch thứ nó đang quan sát. Hệ quả có thật và
   * đúng ý: phần tử nằm ngoài màn hình thì `usable` trả về KHÔNG — vì đúng là lúc ấy chưa
   * bấm được vào nó. */
  "DOM.getBoxModel",
  "DOM.getNodeForLocation"
]);

/* Khoá tham số CHỞ MÃ hoặc CHỞ THAO TÁC GHI. Không method hợp lệ nào ở trên dùng tới một
 * khoá nào trong đây — nên chốt này không bao giờ chặn oan việc thật, mà vẫn chặn đúng
 * lượt ai đó vừa nới danh sách method ở trên. */
const CODE_BEARING_PARAM_KEYS = Object.freeze([
  "expression",
  "functionDeclaration",
  "arguments",
  "source",
  "scriptSource",
  "script",
  "code",
  "outerHTML",
  "html",
  "value",
  "text",
  "key",
  "nodeValue",
  "name"
]);

/* Bộ chọn phần tử tương tác — HẰNG SỐ, không ghép từ dữ liệu người gọi. */
const INTERACTIVE_SELECTOR =
  "a,button,input,select,textarea,[role='button'],[role='link'],[contenteditable='true'],[tabindex]";

const MAX_SELECTOR_LENGTH = 1024;
const MAX_PAGE_LIMIT = 200;
const DEFAULT_PAGE_LIMIT = 100;
const MAX_TREE_DEPTH = 10;
const DEFAULT_TREE_DEPTH = 3;
const MAX_TREE_NODES = 500;

/* Trần cho ba phép dò mới. Đặt THẤP HƠN trần phong bì Bridge (1 MiB) khá nhiều, cố ý: cả
 * ba đều trả về thứ LỚN theo trang, mà chạm trần phong bì thì cả lượt chết ở tầng vận
 * chuyển với một câu khó hiểu, thay vì chết ở đây với một câu nói rõ vì sao. */
/* ---- TRẦN CHỜ — con số này ĐỌC RA TỪ MÁY CHỦ, không phải chọn cho đẹp -----
 * `bridge-host-core.mjs` bỏ cuộc một lượt chuyển tiếp sau **35.000ms** (`requestTimeoutMs`,
 * mặc định, và chưa ai truyền giá trị khác). Nên một lệnh chờ 90 giây KHÔNG chờ được 90 giây:
 * ở giây thứ 35 máy chủ trả `REQUEST_TIMEOUT` cho người gọi trong khi extension vẫn đang chờ
 * tiếp — tức là hỏng theo kiểu tệ nhất, **hai đầu tin hai chuyện khác nhau**.
 *
 * 30.000ms chừa 5 giây cho lượt gắn debugger, lượt đóng gói và đường về. Muốn chờ lâu hơn thì
 * gọi nhiều lượt — ba lượt 30 giây vẫn rẻ hơn chín mươi lượt hỏi-đáp gần trăm lần.
 *
 * **Ba method hiện có đang vượt trần này** (`scout.navigate` 70s · `scout.type` và
 * `scout.fetch` 60s) — sổ nợ S-16. Đừng chép con số của chúng. */
const MAX_WAIT_MS = 30000;
const DEFAULT_WAIT_MS = 15000;
const MIN_POLL_MS = 100;
const MAX_POLL_MS = 5000;
const DEFAULT_POLL_MS = 500;

/* Nghe mạng cũng nằm dưới cùng cái trần 35 giây, và còn phải chừa thêm cho `Network.disable`
 * cùng lượt đóng gói danh sách — nên thấp hơn `MAX_WAIT_MS`. */
const MAX_NET_MS = 25000;
const DEFAULT_NET_MS = 5000;
const MAX_NET_ITEMS = 200;
const DEFAULT_NET_ITEMS = 50;
const MAX_URL_FILTER_LENGTH = 200;

const MAX_AX_NODES = 1500;
const DEFAULT_AX_NODES = 400;
const MAX_SHOT_BYTES = 700 * 1024;
const DEFAULT_SHOT_QUALITY = 60;
const MAX_ATTR_LENGTH = 200;

/* ---- Chính sách che dữ liệu — ĐỀ XUẤT, CHƯA ĐƯỢC ĐỨC CHỐT ---------------
 * BRIEF mục 3c hỏi chính sách che. Mặc định ở đây là hướng CHẶT: chỉ trả về thuộc tính
 * trong danh sách trắng dưới đây; thuộc tính ngoài danh sách chỉ hiện TÊN, không hiện giá
 * trị. Chưa có công tắc nới lỏng — cố ý, vì nới lỏng là quyết định của Đức, không phải
 * của executor. Xem báo cáo phiên để biết đề xuất đầy đủ. */
const SAFE_ATTRIBUTES = Object.freeze([
  "id", "class", "name", "type", "role", "href", "src", "alt", "title", "placeholder",
  "aria-label", "aria-labelledby", "aria-describedby", "aria-hidden", "aria-expanded",
  "disabled", "readonly", "checked", "selected", "hidden", "tabindex", "for",
  "contenteditable", "data-testid", "data-test-id", "data-qa"
]);
const URL_ATTRIBUTES = Object.freeze(["href", "src"]);

/* ---- Lỗi ---------------------------------------------------------------- */

export class ProbeError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ProbeError";
    this.code = code;
  }
}

/* ---- Chốt ⑵ + ⑶: người gửi lệnh CDP read-only ---------------------------
 * Mọi phép dò CHỈ nhận được hàm do đây trả ra. Bản thô (`sendRaw`) không bao giờ tới tay
 * phép dò, nên không có đường vòng. */
export function createReadOnlySender(sendRaw, log) {
  const allowed = new Set(READ_ONLY_CDP_METHODS);
  const banned = new Set(CODE_BEARING_PARAM_KEYS);
  return async function send(method, params = {}) {
    if (!allowed.has(method)) {
      throw new ProbeError("CDP_METHOD_NOT_ALLOWED", `Method CDP "${method}" không nằm trong bộ read-only.`);
    }
    for (const paramKey of Object.keys(params)) {
      if (banned.has(paramKey)) {
        throw new ProbeError("CDP_PARAM_NOT_ALLOWED", `Tham số "${paramKey}" chở mã hoặc thao tác ghi.`);
      }
    }
    if (log) log.push({ method, params });
    return await sendRaw(method, params);
  };
}

/* ---- Cửa vào duy nhất --------------------------------------------------- */

/**
 * @param {string} name       một trong PROBE_NAMES
 * @param {object} deps       { sendRaw?: (method, params) => Promise<any>, listTargets?: () => Promise<any[]> }
 * @param {object} params     tham số của phép dò (DỮ LIỆU, không bao giờ là mã)
 */
export async function runProbe(name, deps = {}, params = {}) {
  if (!PROBE_NAMES.includes(name)) {
    return fail(name, "PROBE_UNKNOWN", `Không có phép dò tên "${name}". Từ vựng cố định: ${PROBE_NAMES.join(", ")}.`, []);
  }
  const log = [];
  const send = deps.sendRaw ? createReadOnlySender(deps.sendRaw, log) : null;
  try {
    /* `sleep` và `subscribe` bơm vào giống hệt `sendRaw`, và vì cùng một lý do: file này không
     * biết `chrome` là gì, cũng không được biết đồng hồ thật là gì. Phép ghim tiêm đồng hồ giả
     * nên `dom.wait` 30 giây chạy xong trong một phần nghìn giây — không có cái đó thì suite
     * của gói dài thêm vài phút và sẽ có người bỏ chạy nó.
     *
     * `sleep` mặc định là đồng hồ thật để lớp nối dây khỏi phải nhớ bơm; `subscribe` KHÔNG có
     * mặc định — không ai đưa kênh sự kiện thì `network.watch` phải nói thẳng là nó không nghe
     * được, chứ không được im lặng trả về một danh sách rỗng trông y như "trang chẳng gọi gì". */
    const ctx = {
      send,
      listTargets: deps.listTargets,
      targetId: deps.targetId,
      sleep: typeof deps.sleep === "function" ? deps.sleep : ((ms) => new Promise((r) => setTimeout(r, ms))),
      subscribe: deps.subscribe
    };
    const data = await PROBES[name](ctx, params);
    return { ok: true, probe: name, data, cdp: log };
  } catch (error) {
    const code = error instanceof ProbeError ? error.code : "PROBE_FAILED";
    return fail(name, code, error?.message || String(error), log);
  }
}

function fail(probe, code, detail, cdp) {
  return { ok: false, probe, code, detail, cdp };
}

/* ---- Bốn phép dò -------------------------------------------------------- */

const PROBES = {
  /* ① targets.list — quét + phân loại, y như scanTargets() hôm nay.
   * Dùng lại `describeTarget` của ObserverEngine (hàm đó thuần, không đụng `chrome`) thay vì
   * chép luật phân loại sang đây — hai bản của một luật thì sớm muộn lệch nhau. */
  async "targets.list"(ctx) {
    if (typeof ctx.listTargets !== "function") {
      throw new ProbeError("DEPS_MISSING", "targets.list cần deps.listTargets.");
    }
    const raw = await ctx.listTargets();
    const engine = new ObserverEngine();
    const targets = (raw || []).map((target) => engine.describeTarget(target));
    return { count: targets.length, targets };
  },

  /* ② page.snapshot — metadata + kiểm kê phần tử tương tác, CÓ PHÂN TRANG.
   * Lỗ ⑷ của brief: bản cũ cắt cứng ở 100 rồi chỉ ghi `truncated`. Ở đây phân trang xảy ra
   * BÊN NGOÀI trang: `DOM.querySelectorAll` trả về TOÀN BỘ nodeId (đó là con số thật cần
   * biết), rồi ta cắt lát ở phía mình và chỉ mô tả đúng lát đó. Trang không hề biết có
   * phân trang, nên không có tham số nào của người gọi chạm tới trang. */
  async "page.snapshot"(ctx, params) {
    const send = requireSend(ctx);
    const offset = readIndex(params.offset, 0, "offset");
    const limit = readIndex(params.limit, DEFAULT_PAGE_LIMIT, "limit", 1, MAX_PAGE_LIMIT);

    const info = await send("Target.getTargetInfo", ctx.targetId ? { targetId: ctx.targetId } : {});
    await send("DOM.enable", {});
    const doc = await send("DOM.getDocument", { depth: 0, pierce: false });
    const root = doc?.root;
    if (!root?.nodeId) throw new ProbeError("NO_DOCUMENT", "Target không trả về document nào.");

    const found = await send("DOM.querySelectorAll", { nodeId: root.nodeId, selector: INTERACTIVE_SELECTOR });
    const nodeIds = found?.nodeIds || [];
    const slice = nodeIds.slice(offset, offset + limit);
    const items = [];
    for (const nodeId of slice) items.push(await describe(send, nodeId));

    return {
      metadata: {
        targetId: ctx.targetId ?? null,
        title: cap(info?.targetInfo?.title ?? ""),
        /* URL cũng bị cắt query/fragment: token phiên nằm ở đó nhiều không kém thuộc tính. */
        url: stripQuery(info?.targetInfo?.url ?? root.documentURL ?? ""),
        documentURL: stripQuery(root.documentURL ?? ""),
        baseURL: stripQuery(root.baseURL ?? "")
      },
      elements: {
        selector: INTERACTIVE_SELECTOR,
        total: nodeIds.length,
        offset,
        limit,
        returned: items.length,
        hasMore: offset + items.length < nodeIds.length,
        nextOffset: offset + items.length < nodeIds.length ? offset + items.length : null,
        items
      },
      redaction: redactionNote()
    };
  },

  /* ③ dom.query — "selector này khớp mấy phần tử, và chúng là gì".
   * Đây là câu trả lời cho luật vàng số 1. Selector là DỮ LIỆU: nó đi làm tham số
   * `selector` của `DOM.querySelectorAll`, không có bước nối chuỗi nào ở bất kỳ đâu. */
  async "dom.query"(ctx, params) {
    const send = requireSend(ctx);
    const selector = params.selector;
    if (typeof selector !== "string" || selector.trim() === "") {
      throw new ProbeError("SELECTOR_REQUIRED", "dom.query cần tham số `selector` là chuỗi không rỗng.");
    }
    if (selector.length > MAX_SELECTOR_LENGTH) {
      throw new ProbeError("SELECTOR_TOO_LONG", `Selector dài quá ${MAX_SELECTOR_LENGTH} ký tự.`);
    }
    const offset = readIndex(params.offset, 0, "offset");
    const limit = readIndex(params.limit, DEFAULT_PAGE_LIMIT, "limit", 1, MAX_PAGE_LIMIT);

    await send("DOM.enable", {});
    const doc = await send("DOM.getDocument", { depth: 0, pierce: false });
    const root = doc?.root;
    if (!root?.nodeId) throw new ProbeError("NO_DOCUMENT", "Target không trả về document nào.");

    let found;
    try {
      found = await send("DOM.querySelectorAll", { nodeId: root.nodeId, selector });
    } catch (error) {
      if (error instanceof ProbeError) throw error;
      /* Selector sai cú pháp — kể cả selector độc — dừng ở đây, dưới dạng LỖI CSS.
       * Không có mã nào chạy, vì chưa từng có mã nào được dựng. */
      throw new ProbeError("SELECTOR_INVALID", `Chrome từ chối selector: ${error?.message || String(error)}`);
    }

    const nodeIds = found?.nodeIds || [];
    const slice = nodeIds.slice(offset, offset + limit);
    const items = [];
    for (const nodeId of slice) items.push(await describe(send, nodeId));

    return {
      selector,
      matchCount: nodeIds.length,
      offset,
      limit,
      returned: items.length,
      hasMore: offset + items.length < nodeIds.length,
      nextOffset: offset + items.length < nodeIds.length ? offset + items.length : null,
      items,
      redaction: redactionNote()
    };
  },

  /* ⑦ dom.wait — "chờ tới khi selector này khớp (hoặc thôi khớp)".
   *
   * VÌ SAO NÓ Ở TRONG TRÌNH DUYỆT chứ không để người gọi tự lặp `dom.query`: mỗi lượt
   * `dom.query` là một vòng đi-về trọn vẹn qua Bridge — phong bì, HTTP, một chặng WebSocket,
   * rồi ngược lại. Chờ một tấm ảnh sinh xong mất 60–90 giây; hỏi mỗi giây là gần trăm vòng
   * như thế. Ở đây nó là MỘT vòng, và lượt hỏi lặp lại nằm sát trang.
   *
   * KHÔNG MỞ THÊM CỬA NÀO. Nó gọi đúng ba method mà `dom.query` đã gọi. Đó là điều kiện để
   * phép dò này rẻ về mặt an toàn: nó không phải một năng lực mới, nó là một VÒNG LẶP quanh
   * một năng lực đã có.
   *
   * Lấy lại `DOM.getDocument` MỖI lượt hỏi, không giữ `nodeId` gốc từ lượt đầu: trang kiểu
   * React dựng lại cây liên tục, và CDP làm `nodeId` cũ hết hiệu lực khi tài liệu đổi. Giữ
   * lại thì phép dò sẽ báo "chưa thấy" mãi mãi trên đúng những trang nó sinh ra để phục vụ. */
  async "dom.wait"(ctx, params) {
    const send = requireSend(ctx);
    const selector = params.selector;
    if (typeof selector !== "string" || selector.trim() === "") {
      throw new ProbeError("SELECTOR_REQUIRED", "dom.wait cần tham số `selector` là chuỗi không rỗng.");
    }
    if (selector.length > MAX_SELECTOR_LENGTH) {
      throw new ProbeError("SELECTOR_TOO_LONG", `Selector dài quá ${MAX_SELECTOR_LENGTH} ký tự.`);
    }
    /* `present` VẪN LÀ MẶC ĐỊNH, và đừng đảo lại. Đổi nghĩa một tham số đang có là làm hỏng
     * mọi lượt gọi đã viết, ở khắp nơi, cùng một lúc — và hỏng lặng lẽ, vì lượt gọi cũ vẫn
     * chạy được, chỉ trả lời một câu hỏi khác. Năng lực mới đi vào bằng một GIÁ TRỊ MỚI. */
    const state = params.state === undefined || params.state === null ? "present" : params.state;
    if (state !== "present" && state !== "absent" && state !== "usable") {
      throw new ProbeError("WAIT_STATE_INVALID", "`state` chỉ nhận 'present', 'absent' hoặc 'usable'.");
    }
    const minCount = readIndex(params.minCount, 1, "minCount", 1, MAX_PAGE_LIMIT);
    const timeoutMs = readIndex(params.timeoutMs, DEFAULT_WAIT_MS, "timeoutMs", MIN_POLL_MS, MAX_WAIT_MS);
    const pollMs = readIndex(params.pollMs, DEFAULT_POLL_MS, "pollMs", MIN_POLL_MS, MAX_POLL_MS);

    await send("DOM.enable", {});
    const batDau = Date.now();
    let polls = 0;
    let matchCount = 0;
    let satisfied = false;
    let nodeIds = [];
    let usableCount = 0;
    let usableBlockedBy = null;

    /* Hỏi TRƯỚC rồi mới ngủ, không ngược lại: điều kiện rất hay đã đúng sẵn ngay lúc gọi, và
     * một vòng lặp ngủ-trước sẽ tốn oan một nhịp mỗi lần như thế. */
    for (;;) {
      const doc = await send("DOM.getDocument", { depth: 0, pierce: false });
      const root = doc?.root;
      if (!root?.nodeId) throw new ProbeError("NO_DOCUMENT", "Target không trả về document nào.");
      let found;
      try {
        found = await send("DOM.querySelectorAll", { nodeId: root.nodeId, selector });
      } catch (error) {
        if (error instanceof ProbeError) throw error;
        throw new ProbeError("SELECTOR_INVALID", `Chrome từ chối selector: ${error?.message || String(error)}`);
      }
      polls += 1;
      nodeIds = found?.nodeIds || [];
      matchCount = nodeIds.length;
      if (state === "absent") {
        satisfied = matchCount === 0;
      } else if (state === "present") {
        satisfied = matchCount >= minCount;
      } else {
        /* `usable`: khớp thôi chưa đủ, phải có ĐỦ `minCount` phần tử mà điểm giữa của chúng
         * thật sự thuộc về chúng. Đếm lại mỗi nhịp, không nhớ kết quả nhịp trước — tấm chắn
         * biến mất giữa hai nhịp là chuyện thường, và đó chính là thứ ta đang chờ. */
        const dem = await demSoDungDuoc(send, nodeIds, minCount);
        usableCount = dem.dem;
        usableBlockedBy = dem.vuong;
        satisfied = usableCount >= minCount;
      }
      if (satisfied) break;
      /* Hết giờ thì DỪNG, và trả về `satisfied: false` — KHÔNG ném. Hết giờ là một CÂU TRẢ LỜI
       * ("sau 30 giây vẫn chưa thấy"), không phải một sự cố; ném ra thì người gọi phải bóc lỗi
       * mới biết được cái tin đó, và sớm muộn có người bóc nhầm thành "Scouter hỏng". */
      if (Date.now() - batDau + pollMs > timeoutMs) break;
      await ctx.sleep(pollMs);
    }

    /* Chỉ mô tả phần tử khi ĐÃ thấy, và chỉ vài cái đầu: người gọi chờ xong thường cần đúng
     * một thứ — "nó đây, trông thế này" — chứ không cần cả trang. */
    const items = [];
    if (satisfied && state !== "absent") {
      for (const nodeId of nodeIds.slice(0, Math.min(minCount, 10))) items.push(await describe(send, nodeId));
    }

    return {
      selector,
      state,
      minCount,
      timeoutMs,
      pollMs,
      satisfied,
      matchCount,
      /* Trả về CẢ HAI con số, luôn luôn. `matchCount: 1, usableCount: 0` là câu trả lời giá
       * trị nhất mà phép dò này nói được — "nó có đấy, nhưng đang bị chắn" — và gộp lại thành
       * một con số là vứt đi đúng cái tin đó. Ở `state` khác `usable` thì `usableCount` là
       * `null`, không phải `0`: "không đếm" khác "đếm được không cái nào". */
      usableCount: state === "usable" ? usableCount : null,
      /* VÌ SAO chưa dùng được, không chỉ LÀ chưa dùng được. Ba lý do dẫn tới ba việc khác hẳn
       * nhau, và gộp chúng thành một `false` là đúng kiểu hỏng im lặng mà cả gói này chống:
       *   · `covered`      — có thứ chắn lên. Chờ tiếp, hoặc đóng cái đang chắn.
       *   · `no_box`       — phần tử không có hộp hiển thị (ẩn, rộng 0, chưa dựng xong).
       *   · `no_hit_test`  — Chrome KHÔNG TRẢ LỜI được câu hỏi. Đo thật 12/09: tab không
       *     đang được vẽ thì `DOM.getNodeForLocation` trả `-32000`. Đây KHÔNG phải "bị chắn",
       *     và ai đọc nhầm nó thành "bị chắn" sẽ đi tìm một hộp thoại không hề tồn tại. */
      usableBlockedBy: state === "usable" && !satisfied ? usableBlockedBy : null,
      polls,
      waitedMs: Date.now() - batDau,
      items,
      redaction: redactionNote()
    };
  },

  /* ④ dom.tree — cấu trúc cây tới độ sâu N kèm thuộc tính.
   * Lỗ ⑵ của brief: bản cũ gọi `DOM.getDocument` với `depth: 0` nên chỉ trả về nút gốc. */
  async "dom.tree"(ctx, params) {
    const send = requireSend(ctx);
    const depth = readIndex(params.depth, DEFAULT_TREE_DEPTH, "depth", 1, MAX_TREE_DEPTH);
    const maxNodes = readIndex(params.maxNodes, MAX_TREE_NODES, "maxNodes", 1, MAX_TREE_NODES);

    await send("DOM.enable", {});
    const doc = await send("DOM.getDocument", { depth, pierce: false });
    const root = doc?.root;
    if (!root?.nodeId) throw new ProbeError("NO_DOCUMENT", "Target không trả về document nào.");

    const budget = { left: maxNodes, truncated: false };
    const tree = shapeNode(root, budget);
    return {
      depth,
      maxNodes,
      nodeCount: maxNodes - budget.left,
      truncated: budget.truncated,
      tree,
      redaction: redactionNote()
    };
  }
,

  /* ⑤ a11y.tree — ĐỌC TRANG THEO VAI TRÒ VÀ TÊN, không theo class CSS.
   *
   * Đây là thuốc thật cho luật vàng 1. Ba điều đáng biết trước khi sửa:
   *
   * ① KHÔNG che `name`. Mọi chỗ khác trong file này che thuộc tính, nhưng ở đây
   *   `name` CHÍNH LÀ thứ cần — che nó là trả về một cây rỗng và phép dò thành vô dụng.
   *   ADR-0016 gỡ chính sách che dữ liệu, nên điều này hợp lệ từ 07/09.
   * ② Bỏ nút KHÔNG mang thông tin — `ignored`, hoặc vai trò `none`/`generic` mà
   *   không có tên. Trên trang thật chúng chiếm phần lớn cây; giữ lại là đổ rác vào phong
   *   bì rồi chạm trần vì rác.
   * ③ `getFullAXTree` trả cả cây một lượt — CDP không phân trang được, nên ta phải cắt
   *   ở đây và NÓI RÕ là đã cắt. Cắt im lặng là nói dối. */
  async "a11y.tree"(ctx, params) {
    const send = requireSend(ctx);
    const limit = readIndex(params.limit, DEFAULT_AX_NODES, "limit", 1, MAX_AX_NODES);
    await send("DOM.enable", {});
    await send("Accessibility.enable", {});
    const raw = await send("Accessibility.getFullAXTree", {});
    const all = Array.isArray(raw?.nodes) ? raw.nodes : [];
    const coIch = all.filter((n) => {
      if (n?.ignored === true) return false;
      const role = n?.role?.value ?? null;
      const name = cap(n?.name?.value ?? "");
      if (!role) return false;
      if ((role === "none" || role === "generic" || role === "InlineTextBox") && name === "") return false;
      return true;
    });
    const co = (n, ten) => Boolean((n.properties || []).find((x) => x.name === ten)?.value?.value);
    return {
      total_nodes: all.length,
      useful_nodes: coIch.length,
      returned: Math.min(coIch.length, limit),
      truncated: coIch.length > limit,
      nodes: coIch.slice(0, limit).map((n) => ({
        role: n.role?.value ?? null,
        name: cap(n.name?.value ?? ""),
        value: cap(n.value?.value ?? ""),
        focusable: co(n, "focusable"),
        disabled: co(n, "disabled"),
        backend_node_id: n.backendDOMNodeId ?? null
      }))
    };
  },

  /* ⑦ page.shot — ẢNH, tức bằng chứng Đức nhìn được bằng mắt.
   *
   * MẶC ĐỊNH JPEG chất lượng 60, KHÔNG phải PNG. Lý do là số: một ảnh PNG thường vượt
   * trần phong bì 1 MiB, nên để PNG làm mặc định là để phép dò này hỏng ở đúng trường
   * hợp hay gặp nhất. Ai cần PNG thì khai tường minh và tự chịu trần.
   *
   * QUÁ TRẦN THÌ ĐỎ, KHÔNG CẮT — cùng luật với `scout.fetch`: một ảnh bị cắt là một
   * file hỏng, và người nhận sẽ đi tìm bug ở chỗ không có bug. */
  async "page.shot"(ctx, params) {
    const send = requireSend(ctx);
    const format = params.format === "png" ? "png" : "jpeg";
    const quality = readIndex(params.quality, DEFAULT_SHOT_QUALITY, "quality", 1, 100);
    const raw = await send("Page.captureScreenshot", format === "png"
      ? { format: "png", captureBeyondViewport: false }
      : { format: "jpeg", quality, captureBeyondViewport: false });
    const data = typeof raw?.data === "string" ? raw.data : "";
    if (data === "") throw new ProbeError("NO_SCREENSHOT", "Chrome không trả về ảnh nào.");
    const bytes = Math.floor(data.length * 3 / 4);
    if (bytes > MAX_SHOT_BYTES) {
      throw new ProbeError("SHOT_TOO_LARGE",
        "Ảnh " + bytes + " byte, quá trần " + MAX_SHOT_BYTES + " byte. Hạ quality, hoặc dùng jpeg thay vì png.");
    }
    return { format, quality: format === "jpeg" ? quality : null, bytes, base64: data };
  },

  /* ⑧ network.watch — "nghe trang nói chuyện với máy chủ trong N giây rồi kể lại".
   *
   * NÓ TRẢ LỜI CÂU GÌ. Hôm nay muốn biết "trang xong chưa" thì chỉ còn cách nhìn màn hình mà
   * đoán. Nghe được thì biết CHÍNH XÁC lúc máy chủ trả kết quả về, và biết trang báo lỗi gì
   * bên trong khi ngoài mặt nó chỉ quay vòng vòng.
   *
   * ══ CHỖ ĐẮT NHẤT CỦA PHÉP DÒ NÀY, ĐỌC TRƯỚC KHI SỬA ══
   * Gói sự kiện Chrome đưa sang CHỞ `request.headers` — tức là cookie phiên và token đăng
   * nhập của Đức. Trả nguyên gói đó ra ngoài dây là làm rò bí mật qua đúng cái cửa dựng ra để
   * quan sát. Nên hàm này **nhặt ra từng trường một theo danh sách trắng**, không bao giờ
   * trải gói gốc. Khác biệt giữa hai lối viết chỉ là vài dòng, và nó là toàn bộ khoảng cách
   * giữa một công cụ chẩn đoán với một máy hút token.
   *
   * Ba thứ CỐ Ý KHÔNG có mặt trong kết quả, dù Chrome đưa sẵn:
   *   · `headers` (cả request lẫn response) — chỗ cookie và `authorization` nằm
   *   · `postData` — chỗ nội dung người dùng gõ nằm; và `Network.enable` còn được gọi kèm
   *     `maxPostDataSize: 0` để Chrome ĐỪNG GỬI, chứ không phải gửi rồi ta bỏ
   *   · nội dung phản hồi — muốn có nó phải gọi `Network.getResponseBody`, mà method đó
   *     không nằm trong danh sách read-only, nên nó không tồn tại với file này
   *
   * URL đi qua `stripQuery` y như `href`/`src` ở `dom.query`: query string là chỗ token hay
   * nằm thứ hai sau header. Giữ đường dẫn, cắt phần sau dấu `?`.
   *
   * ══ VÌ SAO GẮN-RỒI-NHẢ, KHÔNG PHIÊN DÀI ══
   * Phép dò này sống trọn trong một lượt gọi: bật tai, nghe N giây, tắt tai, kể lại. Nó KHÔNG
   * để lại một phiên nghe nào chạy tiếp sau khi trả lời. Giữ đúng khuôn gắn-rồi-nhả của
   * `runProbe` nghĩa là dải băng vàng "đang gỡ lỗi" chỉ hiện đúng lúc nó làm việc — và nghĩa
   * là không có cái tai nào bị bỏ quên trong tình trạng đang mở. */
  async "network.watch"(ctx, params) {
    const send = requireSend(ctx);
    if (typeof ctx.subscribe !== "function") {
      /* Nói thẳng là KHÔNG NGHE ĐƯỢC. Trả về danh sách rỗng ở đây thì nó trông y hệt "trang
       * chẳng gọi máy chủ lần nào" — một câu trả lời sai mà nghe rất giống câu đúng. */
      throw new ProbeError("DEPS_MISSING", "network.watch cần deps.subscribe — kênh sự kiện CDP chưa được nối.");
    }
    const durationMs = readIndex(params.durationMs, DEFAULT_NET_MS, "durationMs", MIN_POLL_MS, MAX_NET_MS);
    const limit = readIndex(params.limit, DEFAULT_NET_ITEMS, "limit", 1, MAX_NET_ITEMS);
    let urlContains = null;
    if (params.urlContains !== undefined && params.urlContains !== null) {
      if (typeof params.urlContains !== "string" || params.urlContains.length > MAX_URL_FILTER_LENGTH) {
        throw new ProbeError("PARAM_INVALID",
          `Tham số \`urlContains\` phải là chuỗi tối đa ${MAX_URL_FILTER_LENGTH} ký tự.`);
      }
      /* Lọc bằng SO KHỚP CHUỖI CON, không phải biểu thức chính quy. Nhận regex từ ngoài dây là
       * mở một cửa cho lượt gọi làm treo service worker bằng một mẫu quay lui mũ. */
      urlContains = params.urlContains;
    }

    const luot = new Map();      /* requestId → bản ghi đang dựng */
    const thuTu = [];            /* giữ đúng thứ tự trang gọi, `Map` không hứa điều đó qua mọi đời JS */
    let boQua = 0;

    function ban(requestId) {
      if (luot.has(requestId)) return luot.get(requestId);
      if (thuTu.length >= MAX_NET_ITEMS) { boQua += 1; return null; }
      const banGhi = {
        requestId: String(requestId),
        method: null, url: null, resourceType: null,
        status: null, mimeType: null, fromCache: null,
        encodedDataLength: null, startedAt: null, endedAt: null, durationMs: null,
        failed: false, errorText: null
      };
      luot.set(requestId, banGhi);
      thuTu.push(banGhi);
      return banGhi;
    }

    /* NHẶT TỪNG TRƯỜNG. Mỗi dòng dưới đây là một quyết định có chủ ý; không dòng nào trải một
     * đối tượng Chrome đưa sang. Xem khối chú thích đầu phép dò. */
    function nghe(cdpMethod, e) {
      if (!e || typeof e.requestId !== "string") return;
      if (cdpMethod === "Network.requestWillBeSent") {
        const url = typeof e.request?.url === "string" ? e.request.url : "";
        if (urlContains !== null && !url.includes(urlContains)) return;
        const banGhi = ban(e.requestId);
        if (!banGhi) return;
        banGhi.method = typeof e.request?.method === "string" ? e.request.method.slice(0, 16) : null;
        banGhi.url = stripQuery(url);
        banGhi.resourceType = typeof e.type === "string" ? e.type.slice(0, 32) : null;
        banGhi.startedAt = typeof e.timestamp === "number" ? e.timestamp : null;
        return;
      }
      /* Ba sự kiện còn lại chỉ CẬP NHẬT bản ghi đã có. Không tạo bản ghi mới: một lượt gọi bắt
       * đầu trước khi ta bật tai sẽ chỉ có nửa sau, và một bản ghi không biết mình gọi URL nào
       * thì vô dụng — tệ hơn, nó lọt qua được cái lọc `urlContains`. */
      const banGhi = luot.get(e.requestId);
      if (!banGhi) return;
      if (cdpMethod === "Network.responseReceived") {
        banGhi.status = typeof e.response?.status === "number" ? e.response.status : null;
        banGhi.mimeType = typeof e.response?.mimeType === "string" ? e.response.mimeType.slice(0, 64) : null;
        banGhi.fromCache = e.response?.fromDiskCache === true;
      } else if (cdpMethod === "Network.loadingFinished") {
        banGhi.encodedDataLength = typeof e.encodedDataLength === "number" ? e.encodedDataLength : null;
        banGhi.endedAt = typeof e.timestamp === "number" ? e.timestamp : null;
      } else if (cdpMethod === "Network.loadingFailed") {
        banGhi.failed = true;
        banGhi.errorText = typeof e.errorText === "string" ? e.errorText.slice(0, 200) : null;
        banGhi.endedAt = typeof e.timestamp === "number" ? e.timestamp : null;
      }
    }

    const thoi = ctx.subscribe(nghe);
    try {
      /* `maxPostDataSize: 0` — bảo Chrome ĐỪNG GỬI nội dung người dùng gõ sang, thay vì gửi
       * rồi ta bỏ đi. Thứ không bao giờ tới thì không rò được. */
      await send("Network.enable", { maxPostDataSize: 0 });
      await ctx.sleep(durationMs);
    } finally {
      /* Tắt tai trong `finally`: lượt ngủ hỏng giữa chừng cũng không được để lại một phiên
       * nghe đang mở. `thoi()` gọi trước vì nó không thể hỏng; `Network.disable` đi qua dây
       * nên hỏng được, và hỏng thì cũng đã có `detachQuietly` của engine dọn nốt. */
      try { thoi(); } catch (_error) { /* cố hết sức */ }
      try { await send("Network.disable", {}); } catch (_error) { /* cố hết sức */ }
    }

    for (const banGhi of thuTu) {
      if (banGhi.startedAt !== null && banGhi.endedAt !== null) {
        banGhi.durationMs = Math.round((banGhi.endedAt - banGhi.startedAt) * 1000);
      }
    }
    const items = thuTu.slice(0, limit);
    return {
      durationMs,
      urlContains,
      total: thuTu.length,
      returned: items.length,
      dropped: boQua,
      hasMore: thuTu.length > items.length,
      items,
      redaction: "URL cắt phần sau dấu `?`. KHÔNG trả header, KHÔNG trả nội dung gửi lên, KHÔNG trả nội dung phản hồi."
    };
  }
};

/* ---- Phụ trợ ------------------------------------------------------------ */

function requireSend(ctx) {
  if (typeof ctx.send !== "function") throw new ProbeError("DEPS_MISSING", "Phép dò này cần deps.sendRaw.");
  return ctx.send;
}

function readIndex(raw, fallback, label, min = 0, max = Number.MAX_SAFE_INTEGER) {
  if (raw === undefined || raw === null) return fallback;
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw < min || raw > max) {
    throw new ProbeError("PARAM_INVALID", `Tham số \`${label}\` phải là số nguyên trong khoảng ${min}..${max}.`);
  }
  return raw;
}

/* ---- `usable`: *dùng được*, không phải *có mặt* — `S-18` ------------------
 *
 * Trần 10 phần tử mỗi nhịp. `usable` tốn hai tới ba lượt hỏi CHO MỖI phần tử, nhân với số
 * nhịp chờ — một selector lỏng khớp 300 thứ sẽ biến một lượt chờ 30 giây thành hàng nghìn
 * lượt hỏi. Trần này cắt cái đuôi đó; đếm đủ `minCount` là dừng, nên ca thường (khớp một)
 * không trả thêm đồng nào. */
const MAX_USABLE_CHECKS = 10;

async function demSoDungDuoc(send, nodeIds, minCount) {
  let dem = 0;
  let vuong = null;
  for (const nodeId of nodeIds.slice(0, MAX_USABLE_CHECKS)) {
    const lyDo = await dungDuoc(send, nodeId);
    if (lyDo === "yes") {
      dem += 1;
      if (dem >= minCount) break;
    } else if (vuong === null) {
      vuong = lyDo;
    }
  }
  return { dem, vuong };
}

/* Cùng một câu hỏi mà `scouter-actions-core.mjs` hỏi trước mỗi lượt bấm — cố ý, vì `usable`
 * chỉ đáng tin khi nó đo ĐÚNG THỨ lượt bấm sẽ gặp. Hai bên viết riêng (luật gói số 6), nhưng
 * chúng phải nói cùng một câu trả lời trên cùng một trang.
 *
 * MỘT CHỖ CỐ Ý KHÁC bên đường ghi: ở đó, "không hỏi được" thì NÉM — không kiểm được thì không
 * bấm. Ở đây thì trả `false`, và đó không phải nới lỏng: `false` nghĩa là *chưa thấy nó dùng
 * được*, và lượt chờ sẽ hỏi lại ở nhịp sau rồi kết thúc bằng `satisfied: false`. Cả hai đều
 * là hỏng-thì-đóng, chỉ khác nhau ở chỗ một bên phải quyết ngay còn một bên được chờ. */
async function dungDuoc(send, nodeId) {
  let hop;
  try { hop = await send("DOM.getBoxModel", { nodeId }); }
  catch { return "no_box"; }
  const quad = hop?.model?.content;
  if (!Array.isArray(quad) || quad.length !== 8) return "no_box";
  const xs = [quad[0], quad[2], quad[4], quad[6]];
  const ys = [quad[1], quad[3], quad[5], quad[7]];
  const x = (Math.min(...xs) + Math.max(...xs)) / 2;
  const y = (Math.min(...ys) + Math.max(...ys)) / 2;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return "no_box";

  let o;
  try {
    o = await send("DOM.getNodeForLocation", {
      x: Math.round(x), y: Math.round(y), includeUserAgentShadowDOM: false
    });
  } catch { return "no_hit_test"; }
  const trungDiem = o?.nodeId;
  if (typeof trungDiem !== "number") return "no_hit_test";
  if (trungDiem === nodeId) return "yes";

  /* Nhận cả con cháu, cùng lý do với đường ghi: nút thật hay là `<button><svg><path>` và tâm
   * hộp rơi vào `<path>`. Chỉ nhận đúng nút thì mọi nút có icon bị báo là "không dùng được"
   * trong khi tay người bấm vẫn trúng. */
  let con;
  try { con = await send("DOM.querySelectorAll", { nodeId, selector: "*" }); }
  catch { return "no_hit_test"; }
  return (con?.nodeIds || []).includes(trungDiem) ? "yes" : "covered";
}

async function describe(send, nodeId) {
  const described = await send("DOM.describeNode", { nodeId, depth: 0, pierce: false });
  return shapeNode(described?.node ?? { nodeId }, { left: 1, truncated: false }, true);
}

function shapeNode(node, budget, flat = false) {
  if (budget.left <= 0) {
    budget.truncated = true;
    return null;
  }
  budget.left -= 1;
  const { attributes, redactedAttributes } = maskAttributes(node.attributes);
  const shaped = {
    nodeId: node.nodeId ?? null,
    nodeType: node.nodeType ?? null,
    nodeName: node.nodeName ?? null,
    localName: node.localName ?? null,
    childNodeCount: node.childNodeCount ?? 0,
    attributes,
    redactedAttributes
  };
  if (flat) return shaped;
  const kids = Array.isArray(node.children) ? node.children : [];
  shaped.children = [];
  for (const kid of kids) {
    const child = shapeNode(kid, budget);
    if (child === null) break;
    shaped.children.push(child);
  }
  return shaped;
}

/* CDP trả `attributes` là mảng phẳng [tên, giá_trị, tên, giá_trị, …]. */
function maskAttributes(flatPairs) {
  const attributes = {};
  const redactedAttributes = [];
  if (!Array.isArray(flatPairs)) return { attributes, redactedAttributes };
  const safe = new Set(SAFE_ATTRIBUTES);
  const urls = new Set(URL_ATTRIBUTES);
  for (let i = 0; i + 1 < flatPairs.length; i += 2) {
    const attrName = String(flatPairs[i]);
    const attrValue = flatPairs[i + 1];
    if (!safe.has(attrName)) {
      redactedAttributes.push(attrName);
      continue;
    }
    attributes[attrName] = urls.has(attrName) ? stripQuery(attrValue) : cap(attrValue);
  }
  return { attributes, redactedAttributes };
}

function cap(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return text.length > MAX_ATTR_LENGTH ? `${text.slice(0, MAX_ATTR_LENGTH)}…` : text;
}

/* Query string và fragment là chỗ token hay nằm nhất — cắt bỏ, giữ lại đường dẫn. */
function stripQuery(value) {
  const text = cap(value);
  const cut = text.search(/[?#]/);
  return cut === -1 ? text : `${text.slice(0, cut)}…`;
}

function redactionNote() {
  return {
    policy: "de-xuat-chat-v1",
    status: "ĐỀ XUẤT — Đức chưa chốt (BRIEF-OBSERVER-V1 mục 3c)",
    rule: "Chỉ trả giá trị của thuộc tính trong danh sách trắng; thuộc tính khác chỉ hiện tên. " +
      "href/src bị cắt query và fragment. Không trả text node, không trả outerHTML, không trả giá trị ô nhập."
  };
}
