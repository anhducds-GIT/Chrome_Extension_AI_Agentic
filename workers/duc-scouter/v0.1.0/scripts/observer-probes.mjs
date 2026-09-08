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
  "page.shot"
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
  "Page.captureScreenshot"
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
    const data = await PROBES[name]({ send, listTargets: deps.listTargets, targetId: deps.targetId }, params);
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
