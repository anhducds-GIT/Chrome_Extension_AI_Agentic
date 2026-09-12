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
 * ─── NĂM CHỐT, VÀ CHÚNG KHÁC BA CHỐT CỦA LÕI ĐỌC ───────────────────────────
 *   ⑴ Tên hành động phải nằm trong `ACTION_NAMES`. Tên lạ → từ chối, không đoán.
 *   ⑵ Method CDP phải nằm trong `WRITE_CDP_METHODS`. Danh sách này CỐ Ý KHÔNG CÓ `Runtime.*`:
 *      bấm và gõ không cần chạy một dòng JS nào trên trang, nên cửa đó vẫn đóng.
 *   ⑶ **TOẠ ĐỘ DO TA TÍNH, KHÔNG BAO GIỜ NHẬN TỪ NGƯỜI GỌI.** Đây là chốt quan trọng nhất
 *      của cả file. Một tham số `x`/`y` từ ngoài dây biến `scout.click` thành "bấm vào bất kỳ
 *      điểm nào trên màn hình", và cổng selector ở trên thành đồ trang trí. Toạ độ luôn suy
 *      từ `DOM.getBoxModel` của đúng phần tử đã khớp.
 *   ⑷ **Selector phải khớp ĐÚNG MỘT phần tử.** Khớp 0 thì không có gì để bấm; khớp nhiều thì
 *      "bấm cái đầu tiên" là chỗ tự động hoá phá hỏng đồ thật. Cả hai đều TỪ CHỐI, không đoán.
 *   ⑸ **ĐIỂM SẮP BẤM PHẢI THUỘC VỀ PHẦN TỬ ĐÃ KHỚP** (mở 12/09, `S-17`). Chốt ⑶ bảo đảm toạ
 *      độ suy từ đúng phần tử; nó KHÔNG bảo đảm phần tử đó đang ở trên cùng tại điểm ấy. Một
 *      lớp phủ chắn ngang thì chuột trúng lớp phủ. Nên trước lượt bắn, hỏi Chrome *"điểm này
 *      là ai"* và so với phần tử đã khớp — chấp nhận cả con cháu của nó, vì nút thật thường
 *      là `<button><svg><path>` và tâm hộp rơi vào `<path>`.
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
  /* MỞ 12/09 — Đức chốt D1 (`CHUOI-VIEC.md`). Method này KHÔNG sửa gì: nó hỏi Chrome
   * *"điểm (x, y) này là phần tử nào"*. Nó ở trong danh sách của đường GHI vì chỗ cần nó là
   * ngay TRƯỚC lượt bắn chuột, và luật gói số 6 cấm đường ghi mượn method của đường đọc —
   * mỗi lõi khai lấy thứ nó dùng, kể cả khi hai bên khai cùng một cái tên.
   *
   * Nó vá `S-17`: trước hôm nay `input.click` suy toạ độ từ hộp của đúng phần tử đã khớp rồi
   * bắn chuột vào đó, mà KHÔNG kiểm điểm ấy có thuộc về phần tử ấy không. Một lớp phủ chắn
   * ngang thì chuột trúng lớp phủ và Scouter trả về y hệt một lượt bấm thành công — đó là
   * kiểu hỏng đắt nhất, vì nó nói dối chứ không báo lỗi. */
  "DOM.getNodeForLocation",
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
    /* Chốt ⑸ đứng ĐÚNG Ở ĐÂY, giữa "đã có toạ độ" và "đã bắn": sớm hơn thì chưa có điểm để
     * hỏi, muộn hơn thì chuột đã đi rồi và câu trả lời chỉ còn là lời phân trần. */
    const hit = await kiemDiemBam(send, node.nodeId, point);
    await clickAt(send, point);
    return { selector, matchCount: node.matchCount, clickedAt: point, hit, method: "Input.dispatchMouseEvent" };
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
   * "Tới nơi" = đọc được tài liệu, VÀ có một trong hai dấu hiệu đã đi: url đổi, HOẶC tài liệu
   * được thay mới. Thiếu vế "đọc được" thì một trang mới bắt đầu tải cũng tính là xong, và
   * lượt `scout.page` ngay sau đó đọc phải trang rỗng.
   *
   * VÌ SAO HAI DẤU HIỆU CHỨ KHÔNG MỘT (`S-19`, vá 12/09). Bản cũ chỉ chờ url đổi, và nó có
   * đúng một lỗ: **đi tới đúng url đang đứng thì url không bao giờ đổi.** Lượt đó treo hết
   * 15 giây rồi trả `NAVIGATE_TIMEOUT` — một câu SAI NGUYÊN NHÂN, trong khi trang đã tải lại
   * thật. Nạp lại trang là việc cơ bản của mọi vòng thuần hoá (thử lại từ trạng thái sạch),
   * nên khuyết tật này gặp ở mọi trang. Đo 12/09 trên Udin, tái hiện lần hai trên trang tự
   * dựng — nguyên văn: *"Xin đi 'http://127.0.0.1:38411/', đang ở 'http://127.0.0.1:38411/'
   * (url chưa đổi)."* Hai vế cùng một url, in cạnh nhau.
   *
   * Nhưng dấu hiệu "tài liệu mới" MỘT MÌNH cũng không đủ: đi tới `#muc-2` trên chính trang
   * đang mở là một lượt điều hướng **trong cùng tài liệu** — url đổi, tài liệu thì không.
   * Hai ca đó loại trừ nhau, nên nhận CẢ HAI dấu hiệu là câu trả lời duy nhất phủ hết. */
  async "input.navigate"(send, params, ctx) {
    const url = readUrlDi(params.url);
    const hanMs = readHanCho(params.timeout_ms);

    const truoc = await send("Target.getTargetInfo", {});
    const urlTruoc = truoc?.targetInfo?.url ?? null;
    /* `?? null` KHÔNG phải thói quen gõ máy: `danhTinhTaiLieu` trả `undefined` khi chưa đọc
     * được tài liệu, và để nguyên `undefined` thì phép so bên dưới thấy "khác con số nào cũng
     * khác" — tức là lượt điều hướng nào cũng xong ngay nhịp đầu. Không đọc được tài liệu
     * TRƯỚC khi đi thì ta KHÔNG BIẾT danh tính cũ, và "không biết" là `null`. */
    const taiLieuTruoc = (await danhTinhTaiLieu(send)) ?? null;

    const ket = await send("Page.navigate", { url });
    /* `Page.navigate` trả 200 kèm `errorText` khi Chrome từ chối đi — im lặng bỏ qua trường
     * đó là báo thành công cho một lượt chưa bao giờ rời trang cũ. */
    if (ket && typeof ket.errorText === "string" && ket.errorText !== "") {
      throw new ActionError("NAVIGATE_REFUSED", `Chrome từ chối đi tới '${url}': ${ket.errorText}`);
    }

    const batDau = ctx.now();
    let urlSau = urlTruoc;
    let doiUrl = false;
    let docDuoc = false;
    while (ctx.now() - batDau < hanMs) {
      await ctx.cho(250);
      const tin = await send("Target.getTargetInfo", {});
      urlSau = tin?.targetInfo?.url ?? null;
      doiUrl = Boolean(urlSau && urlSau !== urlTruoc);

      /* Đọc tài liệu LUÔN, không chỉ khi url đã đổi: chính lượt đọc này vừa là phép kiểm
       * "trang đã sẵn sàng chưa" vừa là phép kiểm "đây có phải một tài liệu KHÁC không". */
      const taiLieuSau = await danhTinhTaiLieu(send);
      if (taiLieuSau === undefined) continue;   // chưa đọc được tài liệu → chưa tới nơi
      docDuoc = true;
      const doiTaiLieu = taiLieuTruoc !== null && taiLieuSau !== null && taiLieuSau !== taiLieuTruoc;
      if (!doiUrl && !doiTaiLieu) continue;

      return {
        requested: url, url: urlSau, from: urlTruoc,
        ms: ctx.now() - batDau, redirected: urlSau !== url,
        /* Nói ra ĐÃ BIẾT BẰNG CÁCH NÀO. Hai dấu hiệu nghĩa là hai chuyện khác nhau đã xảy ra,
         * và người gọi một lượt nạp lại cần phân biệt được "trang đã dựng lại" với "mới chỉ
         * nhảy tới một mục khác trong cùng trang". */
        arrivedBy: doiTaiLieu ? "new_document" : "url_change",
        reloaded: urlSau === urlTruoc
      };
    }
    /* Câu lỗi phải nói ĐÚNG cái đã quan sát được, theo cả hai trục. Bản cũ chỉ có một trục
     * nên nó nói "(url chưa đổi)" cho một lượt nạp lại hoàn toàn thành công — và đó chính là
     * `S-19`: không phải treo mới đắt, mà là treo RỒI NÓI SAI NGUYÊN NHÂN. */
    throw new ActionError("NAVIGATE_TIMEOUT",
      `Quá ${hanMs}ms mà chưa tới nơi. Xin đi '${url}', đang ở '${urlSau ?? "không đọc được"}'. ` +
      (doiUrl ? "url đã đổi" : "url KHÔNG đổi") + "; " +
      (docDuoc ? "tài liệu đọc được nhưng KHÔNG phải một tài liệu mới" : "tài liệu chưa đọc được") +
      (taiLieuTruoc === null
        ? ". (Chrome không cho biết danh tính tài liệu ở lượt này, nên chỉ còn dấu hiệu url.)"
        : "."));
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

/* Danh tính của TÀI LIỆU đang mở — `S-19`.
 *
 * Trả về `undefined` nghĩa là *chưa đọc được* (đang tải dở), `null` nghĩa là *đọc được nhưng
 * Chrome không cho biết danh tính*, và một con số là danh tính thật. Ba trạng thái, không hai:
 * gộp "chưa đọc được" với "không biết" lại thì một trang đang tải dở bị tính là một trang có
 * danh tính không đổi, và lượt chờ thoát sớm.
 *
 * DÙNG `backendNodeId`, KHÔNG DÙNG `nodeId`. `nodeId` là số thứ tự trong bảng tra của phiên
 * debug và nó ĐƯỢC CẤP LẠI mỗi lượt `DOM.getDocument` — nút gốc gần như luôn là `1`, nên so
 * `nodeId` là so hai con số luôn bằng nhau: một phép kiểm không bao giờ báo gì.
 * `backendNodeId` là danh tính Chrome cấp cho một nút THẬT trong trình duyệt, và một lượt tải
 * mới dựng một tài liệu mới, nên con số đó đổi.
 *
 * Chrome không trả `backendNodeId` thì hàm này trả `null` và lượt điều hướng **tự động lùi về
 * đúng hành vi cũ** — chỉ còn dấu hiệu url. Thoái lui êm, không nổ. */
async function danhTinhTaiLieu(send) {
  let doc;
  try { doc = await send("DOM.getDocument", { depth: 0 }); }
  catch { return undefined; }
  const goc = doc?.root;
  if (!goc) return undefined;
  return typeof goc.backendNodeId === "number" ? goc.backendNodeId : null;
}

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

/* Trần 30000 (hạ từ 60000 ngày 12/09, `S-16`). Không phải vì 60 giây là quá lâu để chờ một
 * trang, mà vì **máy chủ Bridge cắt lượt chuyển tiếp ở 35 giây**: xin chờ 60 thì tới giây thứ
 * 35 người gọi đã nhận `REQUEST_TIMEOUT` trong khi extension vẫn đang chờ tiếp. Hai đầu tin
 * hai chuyện khác nhau, và đó là chỗ hỏng đắt hơn hẳn một hạn chờ ngắn.
 *
 * Số này phải dưới `deadline_ms` của `scout.navigate` (34000) một quãng đủ cho lượt trả lời
 * đi về. Đổi một trong hai thì phải đổi cùng nhau — con `B9` canh cặp đó. */
function readHanCho(value) {
  if (value === undefined || value === null) return 15000;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1000 || value > 30000) {
    throw new ActionError("TIMEOUT_INVALID", "timeout_ms phải là số nguyên trong 1000..30000.");
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
  /* LÀM TRÒN NGAY TẠI ĐÂY, không làm tròn lúc hỏi. `DOM.getNodeForLocation` chỉ nhận số
   * nguyên, còn khung chuột nhận số lẻ — hai đầu làm tròn riêng là hỏi về một điểm rồi bấm
   * vào một điểm khác, và chốt ⑸ mất nghĩa đúng ở nửa pixel đó. Một chỗ làm tròn, một điểm. */
  return { x: Math.round(x), y: Math.round(y) };
}

/* Chốt ⑸ sống ở đây — `S-17`.
 *
 * Câu hỏi: *điểm sắp bấm thuộc về ai?* Ba câu trả lời, và cả ba đều phải nói thật:
 *   · chính phần tử đã khớp          → bấm
 *   · con cháu của nó                → bấm (nút có icon: `<button><svg><path>`)
 *   · thứ khác, hoặc không biết      → TỪ CHỐI, hai mã lỗi khác nhau
 *
 * Vì sao hai mã chứ không một: *"có thứ khác chắn"* và *"Chrome không trả lời được"* dẫn tới
 * hai cách sửa khác nhau. Gộp chúng lại là bắt người đọc log đoán mình đang gặp cái nào.
 *
 * Vì sao TỪ CHỐI khi không biết, thay vì cứ bấm: hỏng thì ĐÓNG, giống hệt công tắc đường ghi.
 * Một lượt bấm không kiểm được chính là trạng thái mà `S-17` mô tả — quay về nó lúc gặp khó
 * là bỏ luôn chốt này.
 *
 * Tìm con cháu bằng `DOM.querySelectorAll(nodeId của phần tử, "*")` — method đã có sẵn trong
 * danh sách, nên chốt này chỉ tốn ĐÚNG MỘT method mới. Hằng số `"*"` gõ cứng trong mã, không
 * ghép từ dữ liệu người gọi. */
async function kiemDiemBam(send, nodeId, point) {
  let o;
  try {
    o = await send("DOM.getNodeForLocation", {
      x: point.x, y: point.y, includeUserAgentShadowDOM: false
    });
  } catch (error) {
    if (error instanceof ActionError) throw error;
    /* ĐO THẬT 12/09, và NGUYÊN NHÂN THÌ CHƯA BIẾT — nói đúng mức đó, đừng nói hơn.
     * Quan sát được: trên một target, Chrome trả `-32000 No node found at given location`
     * cho đúng toạ độ mà vài phút trước nó trả lời bình thường; `scout.shot` trên cùng
     * target ấy cũng hỏng cùng lúc; sau một lượt điều hướng thật thì cả hai trở lại bình
     * thường. Ba dấu hiệu đó khớp nhau, nhưng chúng KHÔNG chứng minh được vì sao — một
     * chẩn đoán sai mà nghe có thẩm quyền thì đắt hơn một ô trống. Ghi ở `S-21`.
     *
     * Đừng để câu tiếng Anh thô của CDP đi thẳng ra ngoài dây một mình: người đọc nó sẽ đi
     * sửa selector, và selector không phải chỗ hỏng. */
    throw new ActionError("CLICK_HIT_TEST_FAILED",
      `Chrome không trả lời được "điểm (${point.x}, ${point.y}) là phần tử nào": ` +
      `${error?.message || String(error)}. Không kiểm được thì không bấm. Đo được 12/09: ` +
      "target rơi vào trạng thái này thì `scout.shot` cũng hỏng cùng lúc, và một lượt " +
      "`scout.navigate` thật làm cả hai trở lại bình thường. Chưa biết vì sao — xem `S-21`.");
  }
  const nutTrungDiem = o?.nodeId;
  if (typeof nutTrungDiem !== "number") {
    throw new ActionError("CLICK_HIT_TEST_FAILED",
      `Chrome không nói được phần tử nào nằm ở (${point.x}, ${point.y}). Không kiểm được thì ` +
      "không bấm — một lượt bấm không kiểm được đúng là chỗ hỏng S-17 mô tả.");
  }
  if (nutTrungDiem === nodeId) return { relation: "self", hitNodeId: nutTrungDiem };

  let con;
  try {
    con = await send("DOM.querySelectorAll", { nodeId, selector: "*" });
  } catch (error) {
    if (error instanceof ActionError) throw error;
    throw new ActionError("CLICK_HIT_TEST_FAILED",
      `Không đọc được con cháu của phần tử để đối chiếu: ${error?.message || String(error)}`);
  }
  if ((con?.nodeIds || []).includes(nutTrungDiem)) {
    return { relation: "descendant", hitNodeId: nutTrungDiem };
  }

  throw new ActionError("CLICK_OBSCURED",
    `Điểm (${point.x}, ${point.y}) là tâm của phần tử đã khớp, nhưng thứ nằm trên cùng ở đó là ` +
    `một phần tử KHÁC (node ${nutTrungDiem}). Bấm bây giờ là bấm vào thứ đang chắn, và lượt bấm ` +
    "sẽ trông như thành công. Thường gặp: hộp thoại, lớp phủ tải, tấm chắn báo hết chỗ.");
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
