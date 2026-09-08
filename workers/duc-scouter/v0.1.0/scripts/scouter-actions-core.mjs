/* scouter-actions-core.mjs — BA HÀNH ĐỘNG GHI của Scouter: bấm và gõ như tay người.
 *
 * Đề bài: `S-01` trong `BACKLOG.md` của gói — năng lực xếp hạng **số một** của bảng kiểm kê.
 * Quyết định: ADR-0009 (Scouter là kẻ hành động, không còn là người quan sát).
 *
 * ─── VÌ SAO ĐÂY LÀ FILE RIÊNG, KHÔNG PHẢI THÊM VÀO `observer-probes.mjs` ────
 * Lõi phép dò read-only thi hành bất biến của ADR-0007 bằng BA chốt, và hai trong ba là
 * DANH SÁCH: `READ_ONLY_CDP_METHODS` cố ý không có `Input.*`, và `CODE_BEARING_PARAM_KEYS`
 * cấm đúng những khoá mà gõ phím cần (`text`, `key`, `value`). Thêm `Input.*` vào đó là
 * **làm yếu một lớp bảo vệ đang có** — luật vàng 3 của repo cấm, và hai con đột biến `M1`
 * `M2` sẽ ĐỎ đúng lúc đó, cố ý.
 *
 * Nên đường ghi ở đây là một lõi RIÊNG, với danh sách RIÊNG. Kết quả: sau lượt này,
 * `observer-probes.mjs` vẫn chứng minh được là read-only — không phải vì ai đó hứa, mà vì
 * kênh ghi **không có mặt trong file đó**. Ai muốn biết Scouter ghi được gì thì đọc đúng
 * một file: file này.
 *
 * ─── BỐN CHỐT, VÀ CHÚNG KHÁC BA CHỐT CỦA LÕI ĐỌC ───────────────────────────
 *   ⑴ Tên hành động phải nằm trong `ACTION_NAMES`. Tên lạ → từ chối, không đoán.
 *   ⑵ Method CDP phải nằm trong `WRITE_CDP_METHODS`. Danh sách này CỐ Ý KHÔNG CÓ `Runtime.*`:
 *      bấm và gõ không cần chạy một dòng JS nào trên trang, nên cửa đó vẫn đóng.
 *   ⑶ **TOẠ ĐỘ DO TA TÍNH, KHÔNG BAO GIỜ NHẬN TỪ NGƯỜI GỌI.** Đây là chốt quan trọng nhất
 *      của cả file. Một tham số `x`/`y` từ ngoài dây biến `scout.click` thành "bấm vào bất kỳ
 *      điểm nào trên màn hình", và cổng selector ở trên thành đồ trang trí. Toạ độ luôn suy
 *      từ `DOM.getBoxModel` của đúng phần tử đã khớp.
 *   ⑷ **Selector phải khớp ĐÚNG MỘT phần tử.** Khớp 0 thì không có gì để bấm; khớp nhiều thì
 *      "bấm cái đầu tiên" là chỗ tự động hoá phá hỏng đồ thật. Cả hai đều TỪ CHỐI, không đoán.
 *
 * ─── CHUỖI LỆNH LẤY TỪ PHÉP ĐO, KHÔNG TỰ CHẾ ───────────────────────────────
 * Thứ tự ba khung chuột và hình dạng khung phím chép đúng từ
 * `scripts/scouter-input-trust-probe.mjs` (dòng 247–249 và 265–266) — bản đã chạy thật ngày
 * 06/09 và cho `isTrusted: true` kèm cổng hoạt động mở. Đừng "gọn lại" nó: bỏ `mouseMoved`
 * hay bỏ `unmodifiedText` là đổi một chuỗi ĐÃ ĐO thành một chuỗi CHƯA ĐO.
 *
 * MỘT CHỖ CỐ Ý KHÁC PHÉP ĐO: phép đo lấy toạ độ bằng `getBoundingClientRect` qua
 * `Runtime.evaluate`. Ở đây dùng `DOM.getBoxModel` — cùng con số, nhưng không phải mở cửa
 * chạy JS. Phép đo là script đo một lần; file này sống trong một extension có `debugger`.
 */

/* ---- Từ vựng cố định ---------------------------------------------------- */

export const ACTION_NAMES = Object.freeze([
  "input.click",
  "input.type",
  "input.key",
  "input.navigate"
]);

/* Method CDP được phép ở đường GHI. Ba lệnh `DOM.*` đầu chỉ để TÌM và ĐƯA VÀO TẦM NHÌN đúng
 * một phần tử; chúng không đổi gì trên trang. `DOM.focus` đổi tiêu điểm — đó là thao tác ghi
 * nhỏ nhất mà gõ phím bắt buộc phải có. CỐ Ý KHÔNG CÓ: `Runtime.*` (chạy mã), `DOM.setOuterHTML`
 * và `DOM.setAttributeValue` (sửa trang thẳng tay), `Network.*` (đụng dây), `Input.insertText` (CDP đánh dấu THỬ NGHIỆM — phép đo 06/09 ghi nhận
 * nó chạy được nhưng KHÔNG tính điểm, nên nó không vào seed).
 * Nới danh sách này = đổi luật an toàn = phải hỏi Đức (AGENTS.md gốc mục 2). */
export const WRITE_CDP_METHODS = Object.freeze([
  "DOM.enable",
  "DOM.getDocument",
  "DOM.querySelectorAll",
  "DOM.scrollIntoViewIfNeeded",
  "DOM.getBoxModel",
  "DOM.focus",
  "Input.dispatchMouseEvent",
  "Input.dispatchKeyEvent",
  /* MỞ 08/09 — Đức chốt. Trước đó dòng chú thích trên khai "CỐ Ý KHÔNG CÓ `Page.navigate`",
   * và câu đó đúng cho tới khi Scouter chỉ cần đọc một trang. Nay việc thật cần đi từ trang
   * này sang trang kia (danh mục → chi tiết), mà bấm vào link thì phụ thuộc trang có link đó
   * và có đúng một link đó — hai điều kiện Scouter không kiểm được trước khi bấm.
   *
   * Nó KHÔNG được coi là đọc: `scout.navigate` là method GHI, chui qua phanh và trả giá hạn
   * mức y như `scout.click`. Đổi trang là điều khiển trang, và mở nó ở đây không nới rộng
   * đường đọc — danh sách của `observer-probes.mjs` vẫn không có `Page.navigate`.
   *
   * `Target.getTargetInfo` vào cùng vì đường điều hướng phải ĐỌC LẠI url sau khi đi, và một
   * lượt đi không kiểm được đích đến thì không nói được nó đã tới đâu. */
  "Page.navigate",
  "Target.getTargetInfo"
]);

/* Khoá tham số CHỞ TOẠ ĐỘ. Chốt ⑶ chặn theo HÌNH DẠNG tham số của NGƯỜI GỌI, nên nó còn sống
 * sau khi ai đó nới danh sách hành động ở trên. */
const COORDINATE_PARAM_KEYS = Object.freeze([
  "x", "y", "coordinate", "coordinates", "point", "position", "clientX", "clientY", "nodeId"
]);

/* Phím có tên — BẢNG CỐ ĐỊNH. Người gọi chọn một TÊN trong bảng; họ không bao giờ đưa mã phím.
 * Nhận mã phím tự do là mở lại đúng cái cửa mà chốt ⑴ vừa đóng. */
const NAMED_KEYS = Object.freeze({
  Enter: { code: "Enter", vk: 13, text: "\r" },
  Tab: { code: "Tab", vk: 9 },
  Escape: { code: "Escape", vk: 27 },
  Backspace: { code: "Backspace", vk: 8 },
  Delete: { code: "Delete", vk: 46 },
  ArrowUp: { code: "ArrowUp", vk: 38 },
  ArrowDown: { code: "ArrowDown", vk: 40 },
  ArrowLeft: { code: "ArrowLeft", vk: 37 },
  ArrowRight: { code: "ArrowRight", vk: 39 },
  Home: { code: "Home", vk: 36 },
  End: { code: "End", vk: 35 }
});

export const NAMED_KEY_NAMES = Object.freeze(Object.keys(NAMED_KEYS));

const MAX_SELECTOR_LENGTH = 1024;
const MAX_TEXT_LENGTH = 2000;

/* ---- Lỗi ---------------------------------------------------------------- */

export class ActionError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ActionError";
    this.code = code;
  }
}

/* ---- Chốt ⑵ + ⑶: người gửi lệnh CDP đường ghi --------------------------- */

export function createWriteSender(sendRaw, log) {
  const allowed = new Set(WRITE_CDP_METHODS);
  return async function send(method, params = {}) {
    if (!allowed.has(method)) {
      throw new ActionError("CDP_METHOD_NOT_ALLOWED", `Method CDP "${method}" không nằm trong bộ hành động.`);
    }
    if (log) log.push({ method, params });
    return await sendRaw(method, params);
  };
}

/* ---- Cửa vào duy nhất --------------------------------------------------- */

/**
 * @param {string} name    một trong ACTION_NAMES
 * @param {object} deps    { sendRaw?: (method, params) => Promise<any> }
 * @param {object} params  tham số của hành động (DỮ LIỆU, không bao giờ là toạ độ hay mã phím)
 */
export async function runAction(name, deps = {}, params = {}) {
  if (!ACTION_NAMES.includes(name)) {
    return fail(name, "ACTION_UNKNOWN", `Không có hành động tên "${name}". Từ vựng cố định: ${ACTION_NAMES.join(", ")}.`, []);
  }
  const log = [];
  try {
    /* Chốt ⑶ chạy TRƯỚC mọi thứ khác, kể cả trước khi đọc selector: một yêu cầu mang toạ độ là
     * một yêu cầu sai từ trong ý định, đừng làm gì cho nó cả. */
    rejectCoordinates(params);
    if (typeof deps.sendRaw !== "function") throw new ActionError("DEPS_MISSING", "Hành động này cần deps.sendRaw.");
    const send = createWriteSender(deps.sendRaw, log);
    /* `cho` và `now` tiêm được để phép ghim không phải chờ thật — cùng quy ước với transport. */
    const ctx = {
      cho: typeof deps.cho === "function" ? deps.cho : (ms) => new Promise((r) => setTimeout(r, ms)),
      now: typeof deps.now === "function" ? deps.now : () => Date.now()
    };
    const data = await ACTIONS[name](send, params, ctx);
    return { ok: true, action: name, data, cdp: log };
  } catch (error) {
    const code = error instanceof ActionError ? error.code : "ACTION_FAILED";
    return fail(name, code, error?.message || String(error), log);
  }
}

function fail(action, code, detail, cdp) {
  return { ok: false, action, code, detail, cdp };
}

function rejectCoordinates(params) {
  if (!params || typeof params !== "object") return;
  for (const key of Object.keys(params)) {
    if (COORDINATE_PARAM_KEYS.includes(key)) {
      throw new ActionError("COORDINATE_NOT_ACCEPTED",
        `Tham số "${key}" chở toạ độ hoặc danh tính nút. Scouter tự tính toạ độ từ phần tử đã khớp; ` +
        "nhận toạ độ từ ngoài là bấm được vào bất kỳ đâu trên màn hình.");
    }
  }
}

/* ---- Ba hành động -------------------------------------------------------- */

const ACTIONS = {
  /* ① input.click — bấm vào ĐÚNG MỘT phần tử, bằng chuột thật của trình duyệt. */
  async "input.click"(send, params) {
    const selector = readSelector(params.selector);
    const node = await locateOne(send, selector);
    const point = await centreOf(send, node.nodeId);
    await clickAt(send, point);
    return { selector, matchCount: node.matchCount, clickedAt: point, method: "Input.dispatchMouseEvent" };
  },

  /* ② input.type — gõ một chuỗi vào ĐÚNG MỘT phần tử, từng phím một.
   * Không xoá nội dung cũ, cố ý: xoá hộ là đoán ý người gọi. Muốn xoá thì gõ `input.key`. */
  async "input.type"(send, params) {
    const selector = readSelector(params.selector);
    const text = readText(params.text);
    const node = await locateOne(send, selector);
    await send("DOM.focus", { nodeId: node.nodeId });
    for (const character of [...text]) await typeCharacter(send, character);
    return { selector, matchCount: node.matchCount, typed: text.length, method: "Input.dispatchKeyEvent" };
  },

  /* ③ input.key — gõ MỘT phím có tên, chọn từ bảng cố định. */
  /* ④ input.navigate — ĐI SANG TRANG KHÁC, rồi đợi tới nơi.
   *
   * Vì sao là một thao tác TRỌN GÓI chứ không phải một máy trạng thái sáu bước: "đi" và "làm
   * tiếp" là hai lượt gọi riêng, và `target_id` là thứ nối chúng lại. Không có trạng thái nào
   * cần sống xuyên qua lần đổi trang, nên đừng dựng chỗ chứa nó.
   *
   * KHÔNG khẳng định đã tới ĐÚNG url đã xin. Chuyển hướng là chuyện bình thường, và một phép
   * so bằng sẽ báo hỏng cho một lượt đi hoàn toàn thành công. Thay vào đó nó TRẢ VỀ url thật
   * đã tới, và người gọi tự đối chiếu — đó là sự thật, không phải lời hứa.
   *
   * "Tới nơi" = url đã đổi VÀ đọc được tài liệu. Thiếu vế sau thì một trang mới bắt đầu tải
   * cũng tính là xong, và lượt `scout.page` ngay sau đó đọc phải trang rỗng. */
  async "input.navigate"(send, params, ctx) {
    const url = readUrlDi(params.url);
    const hanMs = readHanCho(params.timeout_ms);

    const truoc = await send("Target.getTargetInfo", {});
    const urlTruoc = truoc?.targetInfo?.url ?? null;

    const ket = await send("Page.navigate", { url });
    /* `Page.navigate` trả 200 kèm `errorText` khi Chrome từ chối đi — im lặng bỏ qua trường
     * đó là báo thành công cho một lượt chưa bao giờ rời trang cũ. */
    if (ket && typeof ket.errorText === "string" && ket.errorText !== "") {
      throw new ActionError("NAVIGATE_REFUSED", `Chrome từ chối đi tới '${url}': ${ket.errorText}`);
    }

    const batDau = ctx.now();
    let urlSau = urlTruoc;
    let doiRoi = false;
    while (ctx.now() - batDau < hanMs) {
      await ctx.cho(250);
      const tin = await send("Target.getTargetInfo", {});
      urlSau = tin?.targetInfo?.url ?? null;
      if (urlSau && urlSau !== urlTruoc) {
        doiRoi = true;
        try {
          await send("DOM.getDocument", { depth: 0 });
          return {
            requested: url, url: urlSau, from: urlTruoc,
            ms: ctx.now() - batDau, redirected: urlSau !== url
          };
        } catch (_chuaSan) { /* tài liệu chưa đọc được thì chờ tiếp, chưa phải hỏng */ }
      }
    }
    throw new ActionError("NAVIGATE_TIMEOUT",
      `Quá ${hanMs}ms mà chưa tới nơi. Xin đi '${url}', đang ở '${urlSau ?? "không đọc được"}'` +
      (doiRoi ? " (url đã đổi nhưng tài liệu chưa đọc được)." : " (url chưa đổi)."));
  },

  async "input.key"(send, params) {
    const selector = readSelector(params.selector);
    const keyName = readKeyName(params.key);
    const descriptor = NAMED_KEYS[keyName];
    const node = await locateOne(send, selector);
    await send("DOM.focus", { nodeId: node.nodeId });
    const down = { type: "keyDown", key: keyName, code: descriptor.code, windowsVirtualKeyCode: descriptor.vk };
    if (descriptor.text) {
      down.text = descriptor.text;
      down.unmodifiedText = descriptor.text;
    }
    await send("Input.dispatchKeyEvent", down);
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: keyName, code: descriptor.code, windowsVirtualKeyCode: descriptor.vk });
    return { selector, matchCount: node.matchCount, key: keyName, method: "Input.dispatchKeyEvent" };
  }
};

/* ---- Phụ trợ ------------------------------------------------------------ */

/* Chỉ http(s). `javascript:` chạy mã, `file:` đọc đĩa, `chrome-extension:` vào ruột
 * extension — cả ba là ba lối thoát khác nhau ra khỏi "đi tới một trang web". */
function readUrlDi(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ActionError("URL_INVALID", "Tham số url phải là một chuỗi không rỗng.");
  }
  if (value.length > 2048) throw new ActionError("URL_INVALID", "url dài quá 2048 ký tự.");
  let phanTich;
  try { phanTich = new URL(value); }
  catch { throw new ActionError("URL_INVALID", `Không phải một url hợp lệ: '${value}'.`); }
  if (phanTich.protocol !== "http:" && phanTich.protocol !== "https:") {
    throw new ActionError("URL_INVALID",
      `Chỉ đi tới http hoặc https. Nhận được '${phanTich.protocol}'.`);
  }
  return phanTich.href;
}

function readHanCho(value) {
  if (value === undefined || value === null) return 15000;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1000 || value > 60000) {
    throw new ActionError("TIMEOUT_INVALID", "timeout_ms phải là số nguyên trong 1000..60000.");
  }
  return value;
}

function readSelector(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ActionError("SELECTOR_REQUIRED", "Hành động cần tham số `selector` là chuỗi không rỗng.");
  }
  if (value.length > MAX_SELECTOR_LENGTH) {
    throw new ActionError("SELECTOR_TOO_LONG", `Selector dài quá ${MAX_SELECTOR_LENGTH} ký tự.`);
  }
  return value;
}

function readText(value) {
  if (typeof value !== "string" || value === "") {
    throw new ActionError("TEXT_REQUIRED", "`input.type` cần tham số `text` là chuỗi không rỗng.");
  }
  if (value.length > MAX_TEXT_LENGTH) {
    throw new ActionError("TEXT_TOO_LONG", `Chuỗi dài quá ${MAX_TEXT_LENGTH} ký tự.`);
  }
  /* Ký tự điều khiển đi đường `input.key`, không đi đường này: một `\n` lọt vào giữa chuỗi là
   * một lượt gửi biểu mẫu mà người gọi không hề yêu cầu. */
  for (const character of value) {
    const point = character.codePointAt(0);
    if (point < 0x20 || point === 0x7f) {
      throw new ActionError("TEXT_HAS_CONTROL_CHAR",
        "Chuỗi chứa ký tự điều khiển. Enter/Tab/Backspace đi qua `input.key`, không đi qua `input.type`.");
    }
  }
  return value;
}

function readKeyName(value) {
  if (typeof value !== "string" || !Object.hasOwn(NAMED_KEYS, value)) {
    throw new ActionError("KEY_NOT_ALLOWED",
      `Phím "${value}" không có trong bảng. Bảng cố định: ${NAMED_KEY_NAMES.join(", ")}.`);
  }
  return value;
}

/* Chốt ⑷ sống ở đây. `DOM.querySelectorAll` trả về TOÀN BỘ khớp, nên ta biết con số thật —
 * và từ chối khi nó không phải 1. */
async function locateOne(send, selector) {
  await send("DOM.enable", {});
  const doc = await send("DOM.getDocument", { depth: 0, pierce: false });
  const root = doc?.root;
  if (!root?.nodeId) throw new ActionError("NO_DOCUMENT", "Target không trả về document nào.");

  let found;
  try {
    found = await send("DOM.querySelectorAll", { nodeId: root.nodeId, selector });
  } catch (error) {
    if (error instanceof ActionError) throw error;
    throw new ActionError("SELECTOR_INVALID", `Chrome từ chối selector: ${error?.message || String(error)}`);
  }
  const nodeIds = found?.nodeIds || [];
  if (nodeIds.length === 0) {
    throw new ActionError("SELECTOR_NO_MATCH", `Selector không khớp phần tử nào: ${selector}`);
  }
  if (nodeIds.length > 1) {
    throw new ActionError("SELECTOR_AMBIGUOUS",
      `Selector khớp ${nodeIds.length} phần tử. Hành động chỉ chạy khi khớp đúng một — ` +
      "bấm vào 'cái đầu tiên' là chỗ tự động hoá phá hỏng đồ thật.");
  }
  return { nodeId: nodeIds[0], matchCount: nodeIds.length };
}

/* Chốt ⑶ sống ở đây: toạ độ suy từ hộp của chính phần tử, không từ tham số nào. */
async function centreOf(send, nodeId) {
  /* Đưa vào tầm nhìn trước khi đo hộp: phần tử nằm ngoài màn hình có hộp, nhưng bấm vào toạ độ
   * đó là bấm vào chỗ khác đang hiển thị ở đấy. */
  try { await send("DOM.scrollIntoViewIfNeeded", { nodeId }); }
  catch { /* Một số nút không cuộn được; hộp bên dưới vẫn là trọng tài. */ }

  const box = await send("DOM.getBoxModel", { nodeId });
  const quad = box?.model?.content;
  if (!Array.isArray(quad) || quad.length !== 8) {
    throw new ActionError("ELEMENT_NOT_VISIBLE",
      "Phần tử không có hộp hiển thị (ẩn, rộng bằng 0, hoặc chưa dựng). Không bấm vào thứ không nhìn thấy.");
  }
  const xs = [quad[0], quad[2], quad[4], quad[6]];
  const ys = [quad[1], quad[3], quad[5], quad[7]];
  const x = (Math.min(...xs) + Math.max(...xs)) / 2;
  const y = (Math.min(...ys) + Math.max(...ys)) / 2;
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new ActionError("ELEMENT_NOT_VISIBLE", "Hộp của phần tử không cho ra toạ độ hữu hạn.");
  }
  return { x, y };
}

/* Ba khung, đúng thứ tự đã đo. */
async function clickAt(send, point) {
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y, button: "none", buttons: 0 });
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", buttons: 1, clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", buttons: 0, clickCount: 1 });
}

/* ponytail: chỉ chữ cái, chữ số và dấu cách có `code` + mã phím Windows ĐÚNG. Ký tự khác gửi
 * khung đủ hình dạng nhưng `code` rỗng và mã phím 0 — trường `text` là thứ làm nên việc chèn,
 * và phép đo 06/09 chứng minh khung có `text` thì ô nhập dài thêm thật. Nâng khi gặp một trang
 * đọc `event.code` cho ký tự ngoài ba nhóm trên. */
function keyDescriptorFor(character) {
  if (/^[a-zA-Z]$/.test(character)) {
    const upper = character.toUpperCase();
    return { code: `Key${upper}`, vk: upper.charCodeAt(0) };
  }
  if (/^[0-9]$/.test(character)) {
    return { code: `Digit${character}`, vk: character.charCodeAt(0) };
  }
  if (character === " ") return { code: "Space", vk: 32 };
  return { code: "", vk: 0 };
}

async function typeCharacter(send, character) {
  const descriptor = keyDescriptorFor(character);
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: character,
    code: descriptor.code,
    text: character,
    unmodifiedText: character,
    windowsVirtualKeyCode: descriptor.vk
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: character,
    code: descriptor.code,
    windowsVirtualKeyCode: descriptor.vk
  });
}
