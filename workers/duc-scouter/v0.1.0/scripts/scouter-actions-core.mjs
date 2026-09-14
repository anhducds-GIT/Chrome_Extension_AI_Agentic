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
  "input.clear",
  "input.navigate",
  /* MỞ 14/09 — Đức chốt `S-24` đường ⒜. KHÔNG có lệnh Bridge nào ánh xạ thẳng tới nó:
   * nó trả về URL ĐẦY ĐỦ (kể cả chữ ký trong query), nên nó chỉ được gọi TỪ TRONG máy,
   * bởi `scout.grab` — thứ tải file rồi trả BYTE, không trả URL. Ánh xạ nó ra dây là mở
   * đúng cái lỗ mà `S-24` sinh ra để bịt. Con `GR9` canh chỗ đó. */
  "input.grabUrl",
  /* ---- NHÓM "ĐI LẠI" MỞ 14/09 — Đức uỷ quyền, [ADR-0007] ------------------
   * Cả ba đi kèm MỘT luật, và luật đó viết ở ADR chứ không phải ở đây: `scout.view` (ĐỌC)
   * phải có TRƯỚC chúng. Ba lệnh này hứa *"đã bắn sự kiện"*, **không** hứa *"trang đã nhận"* —
   * cùng lời hứa hẹp của `scout.click`. Thứ kiểm được lời hứa ấy là một con số đọc lại từ
   * trang, và đó là việc của `scout.view`. */
  "input.scroll",
  "input.hover",
  "input.history"
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
  /* MỞ 14/09 — Đức chốt `S-24` đường ⒜. Method này CHỈ ĐỌC: nó trả về danh sách thuộc
   * tính của đúng một phần tử đã khớp, không đổi gì trên trang. Nó ở danh sách đường GHI
   * (không mượn của đường đọc) vì luật gói số 6: mỗi lõi khai lấy thứ nó dùng. Và nó cần
   * ở đây chứ không ở lõi đọc vì lõi đọc CỐ Ý cắt query khỏi `src`/`href` — cắt đúng chỗ
   * chữ ký của một URL ký sẵn nằm. */
  "DOM.getAttributes",
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
  "Target.getTargetInfo",
  /* MỞ 14/09 cho `input.history` (lùi / tiến) — Đức uỷ quyền nhóm "đi lại", [ADR-0007].
   *
   * `Page.getNavigationHistory` CHỈ ĐỌC. Nó ở danh sách đường GHI, không ở đường đọc, và đó là
   * cố ý: chỗ duy nhất cần nó là ngay TRƯỚC một lượt lùi/tiến, để biết **có gì ở phía sau
   * không** thay vì bắn một lệnh vào hư không rồi đoán. Luật gói số 6 — mỗi lõi khai lấy thứ
   * nó dùng, kể cả khi hai bên khai cùng một cái tên.
   *
   * Nó cũng là thứ giữ cho `input.history` KHÔNG nhận chỉ số từ người gọi: người gọi nói
   * "lùi" hay "tiến", còn chỉ số mục lịch sử tính ở TRONG từ danh sách vừa đọc. Cùng khuôn với
   * chốt ⑶ (toạ độ tính ở trong): một hướng có TÊN, không phải một con trỏ tự do vào lịch sử
   * duyệt web của Đức — `navigateToHistoryEntry` với một `entryId` bất kỳ nhảy được tới **bất
   * kỳ trang nào trong lịch sử của tab đó**. */
  "Page.getNavigationHistory",
  "Page.navigateToHistoryEntry"
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

/* Mặt nạ phím bổ trợ của CDP: Alt=1, **Ctrl=2**, Meta=4, Shift=8. Chỉ `Ctrl` có mặt ở đây, và
 * chỉ `input.clear` dùng nó. Thêm một hằng số nữa vào chỗ này là bước đầu tiên để có một tham
 * số `modifiers` — xem khối giải trình ở `input.clear`. */
const CTRL = 2;

/* ---- BA BẢNG CỐ ĐỊNH của nhóm "đi lại" (14/09, [ADR-0007]) ----------------
 * Cùng khuôn với `NAMED_KEYS`, và vì cùng một lý do: người gọi chọn một CÁI TÊN trong bảng, họ
 * không bao giờ đưa một giá trị thô. Nhận `button: "left"` thì `button` là dữ liệu có biên; nhận
 * một chuỗi bất kỳ rồi chuyển thẳng xuống CDP là mở lại đúng cái cửa chốt ⑴ vừa đóng.
 *
 * `mask` là mặt nạ `buttons` của CDP (trái=1, phải=2, giữa=4) — nó phải khớp với `name`, nếu
 * không thì trang nhận được một sự kiện tự mâu thuẫn và xử lý nó theo kiểu không ai đoán nổi. */
const MOUSE_BUTTONS = Object.freeze({
  left: { name: "left", mask: 1 },
  right: { name: "right", mask: 2 },
  middle: { name: "middle", mask: 4 }
});
export const MOUSE_BUTTON_NAMES = Object.freeze(Object.keys(MOUSE_BUTTONS));
const MAX_CLICK_COUNT = 3;

/* Bốn hướng cuộn, không nhận vector tự do. Một `{deltaX, deltaY}` mở là một đường đưa toạ độ
 * từ ngoài vào — thứ chốt ⑶ cấm — chỉ khác cái tên. */
const SCROLL_DIRECTIONS = Object.freeze({
  down: { x: 0, y: 1 }, up: { x: 0, y: -1 }, right: { x: 1, y: 0 }, left: { x: -1, y: 0 }
});
export const SCROLL_DIRECTION_NAMES = Object.freeze(Object.keys(SCROLL_DIRECTIONS));
/* Trần một lượt cuộn. Không phải để "an toàn" — để một con số sai (ví dụ thừa ba số 0) dừng lại
 * ở đây kèm câu giải thích, thay vì thành một cú nhảy mà người gọi không hiểu vì sao. */
const MAX_SCROLL_AMOUNT = 5000;
const DEFAULT_SCROLL_AMOUNT = 600;

const HISTORY_DIRECTIONS = Object.freeze(["back", "forward"]);

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
  /* `button` và `click_count` MỞ 14/09 (`I7` — bấm phải / bấm đúp, [ADR-0007]). Thêm THAM SỐ
   * chứ không thêm method, cố ý: một lượt bấm phải khác một lượt bấm trái đúng hai trường trên
   * dây, và mọi thứ đắt giá của lượt bấm — khớp đúng một, đưa vào tầm nhìn, hỏi-điểm trước khi
   * bắn — thì y hệt. Tách thành `scout.rightclick` là chép ba cái chốt ấy sang chỗ thứ hai, và
   * chỗ thứ hai là chỗ người ta quên cập nhật.
   *
   * Không khai gì thì cư xử Y HỆT như trước: trái, một lượt. */
  async "input.click"(send, params) {
    const selector = readSelector(params.selector);
    const nut = readNutChuot(params.button);
    const soLan = readSoLanBam(params.click_count);
    const node = await locateOne(send, selector);
    const point = await centreOf(send, node.nodeId);
    /* Chốt ⑸ đứng ĐÚNG Ở ĐÂY, giữa "đã có toạ độ" và "đã bắn": sớm hơn thì chưa có điểm để
     * hỏi, muộn hơn thì chuột đã đi rồi và câu trả lời chỉ còn là lời phân trần. */
    const hit = await kiemDiemBam(send, node.nodeId, point, await gocCuon(send, node.rootNodeId));
    await clickAt(send, point, nut, soLan);
    return {
      selector, matchCount: node.matchCount, clickedAt: point, hit,
      button: nut.name, clickCount: soLan, method: "Input.dispatchMouseEvent"
    };
  },

  /* input.hover — ĐƯA CHUỘT TỚI một phần tử mà KHÔNG bấm (`I6`).
   *
   * Vì sao cần: một phần menu chỉ tồn tại khi có chuột rê lên. Không rê được thì Scouter không
   * bao giờ nhìn thấy chúng, và mọi selector trỏ vào chúng đều báo `SELECTOR_NO_MATCH` — một
   * câu trả lời đúng cho một câu hỏi sai.
   *
   * NÓ VẪN HỎI-ĐIỂM TRƯỚC (chốt ⑸), y như lượt bấm, và đó không phải thừa: rê chuột lên một
   * phần tử đang bị che thì sự kiện tới CÁI CHE, còn Scouter thì báo thành công. Đúng kiểu nói
   * dối mà `S-17` mô tả, chỉ đổi loại sự kiện.
   *
   * HỨA GÌ: *đã đưa chuột tới đúng phần tử đã khớp.* KHÔNG hứa *"menu đã hiện"* — muốn biết
   * menu đã hiện thì hỏi trang bằng `scout.wait`. */
  async "input.hover"(send, params) {
    const selector = readSelector(params.selector);
    const node = await locateOne(send, selector);
    const point = await centreOf(send, node.nodeId);
    const hit = await kiemDiemBam(send, node.nodeId, point, await gocCuon(send, node.rootNodeId));
    await send("Input.dispatchMouseEvent", {
      type: "mouseMoved", x: point.x, y: point.y, button: "none", buttons: 0
    });
    return { selector, matchCount: node.matchCount, hoveredAt: point, hit, method: "Input.dispatchMouseEvent" };
  },

  /* input.scroll — CUỘN bằng bánh xe chuột thật (`I5`).
   *
   * Vì sao cần, dù `input.click` đã tự cuộn tới phần tử: cuộn-tới-phần-tử chỉ đi được tới thứ
   * ĐÃ CÓ trong DOM. Một danh sách tải-thêm-khi-cuộn thì thứ cần lại chưa tồn tại, nên không có
   * selector nào trỏ tới nó — phải cuộn trước, nó mới sinh ra.
   *
   * VÌ SAO VẪN ĐÒI `selector`, dù "cuộn trang" nghe như không cần trỏ vào đâu: bánh xe chuột
   * cuộn **thứ nằm dưới con trỏ**, không cuộn "trang" một cách trừu tượng. Một trang có bảng
   * bên cuộn riêng thì "cuộn xuống" là hai việc khác nhau tuỳ chuột đang ở đâu. Bắt nói ra chỗ
   * cuộn là bắt người gọi nói rõ họ muốn cuộn CÁI GÌ — và giữ đúng luật gói số 7: toạ độ suy ra
   * từ một phần tử đã khớp, không nhận từ ngoài. Cuộn cả trang thì trỏ `body`.
   *
   * CỐ Ý KHÔNG hỏi-điểm ở đây, khác `input.click` và `input.hover`: cuộn thứ đang nằm trên cùng
   * tại điểm đó là **đúng ý** — một lớp phủ cuộn được thì cuộn nó mới là việc người gọi cần.
   *
   * HỨA GÌ: *đã bắn một sự kiện bánh xe tại điểm đó.* KHÔNG hứa *"trang đã cuộn"*, và ở đây lời
   * hứa hẹp ấy đắt hơn mọi chỗ khác — một phần tử không cuộn được thì sự kiện đi vào hư không
   * mà không có lỗi nào. Thứ kiểm được là `scout.view`: đọc `scroll` trước và sau. */
  async "input.scroll"(send, params) {
    const selector = readSelector(params.selector);
    const huong = readHuongCuon(params.direction);
    const luong = readLuongCuon(params.amount);
    const node = await locateOne(send, selector);
    const point = await centreOf(send, node.nodeId);
    await send("Input.dispatchMouseEvent", {
      type: "mouseWheel", x: point.x, y: point.y, button: "none", buttons: 0,
      deltaX: huong.vec.x * luong, deltaY: huong.vec.y * luong
    });
    return {
      selector, matchCount: node.matchCount, direction: huong.ten, amount: luong,
      wheeledAt: point, method: "Input.dispatchMouseEvent"
    };
  },

  /* input.history — LÙI / TIẾN trong lịch sử của đúng tab đó (`N5`).
   *
   * Vì sao cần: nhiều luồng việc là "vào xem chi tiết rồi quay lại danh sách". Làm việc đó bằng
   * `scout.navigate` tới url cũ là một trang KHÁC — mất vị trí cuộn, mất bộ lọc, mất trạng thái
   * mà trang giữ trong lịch sử. Lùi thật thì không mất.
   *
   * CHỐT AN TOÀN, và nó là lý do khối này dài hơn vẻ ngoài của nó: `Page.navigateToHistoryEntry`
   * nhận một `entryId` và nhảy tới **bất kỳ mục nào** trong lịch sử của tab. Người gọi ở đây
   * KHÔNG chạm tới `entryId`: họ nói `"back"` hoặc `"forward"`, còn chỉ số tính ở trong từ danh
   * sách vừa đọc, và chỉ đi được MỘT bước. Mở một tham số `entry_id` (hay `delta`) là biến một
   * lệnh lùi thành một con trỏ tự do vào lịch sử duyệt web của Đức.
   *
   * HẾT ĐƯỜNG THÌ TỪ CHỐI, không im lặng: `Page.navigateToHistoryEntry` với chỉ số ngoài khoảng
   * không báo lỗi ở nhiều phiên bản Chrome, nên một lượt "lùi" ở trang đầu tiên sẽ trông y hệt
   * một lượt lùi thành công. Đó là chỗ phải đỏ. */
  async "input.history"(send, params, ctx) {
    const huong = readHuongDi(params.direction);
    const hanMs = readHanCho(params.timeout_ms);

    const lichSu = await send("Page.getNavigationHistory", {});
    const muc = Array.isArray(lichSu?.entries) ? lichSu.entries : [];
    const viTri = Number(lichSu?.currentIndex);
    if (muc.length === 0 || !Number.isInteger(viTri) || viTri < 0 || viTri >= muc.length) {
      throw new ActionError("HISTORY_UNREADABLE",
        "Không đọc được lịch sử của tab này, nên không biết lùi/tiến sẽ đi đâu. Không biết thì không đi.");
    }
    const dich = viTri + (huong === "back" ? -1 : 1);
    if (dich < 0 || dich >= muc.length) {
      throw new ActionError("HISTORY_AT_END",
        `Không còn trang nào ở phía '${huong}': đang ở mục ${viTri + 1}/${muc.length} của lịch sử tab này.`);
    }

    const urlTruoc = muc[viTri]?.url ?? null;
    const taiLieuTruoc = (await danhTinhTaiLieu(send)) ?? null;
    await send("Page.navigateToHistoryEntry", { entryId: muc[dich].id });

    const batDau = ctx.now();
    let urlSau = urlTruoc;
    while (ctx.now() - batDau < hanMs) {
      await ctx.cho(250);
      const tin = await send("Target.getTargetInfo", {});
      urlSau = tin?.targetInfo?.url ?? null;
      const taiLieuSau = await danhTinhTaiLieu(send);
      if (taiLieuSau === undefined) continue;
      const doiTaiLieu = taiLieuTruoc !== null && taiLieuSau !== null && taiLieuSau !== taiLieuTruoc;
      if (!(urlSau && urlSau !== urlTruoc) && !doiTaiLieu) continue;
      return {
        direction: huong, from: urlTruoc, url: urlSau,
        entry: dich + 1, entries: muc.length, ms: ctx.now() - batDau,
        arrivedBy: doiTaiLieu ? "new_document" : "url_change"
      };
    }
    throw new ActionError("HISTORY_TIMEOUT",
      `Quá ${hanMs}ms mà chưa thấy trang đổi. Xin '${huong}' tới mục ${dich + 1}/${muc.length}, ` +
      `đang ở '${urlSau ?? "không đọc được"}'.`);
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

  /* ③b input.clear — XOÁ SẠCH một ô nhập bằng bàn phím thật (`I4`).
   *
   * Vì sao cần: `scout.type` **không xoá chữ cũ**, nên `gui-prompt.mjs` phải từ chối khi ô đã
   * có chữ — tức là một phiên làm việc thật (nhiều lượt prompt trên cùng một ô) không chạy được.
   *
   * VÌ SAO KHÔNG MỞ "PHÍM BỔ TRỢ TỰ DO" cho `input.key`, dù đó là đường ngắn hơn: `Ctrl` + một
   * phím bất kỳ chạm tới **lệnh của trình duyệt**, không chỉ của trang — `Ctrl+W` đóng tab,
   * `Ctrl+N` mở cửa sổ, `Ctrl+Shift+N` mở ẩn danh. Mở một tham số `modifiers` là giao cả bộ đó
   * cho người gọi. Nên ở đây **phím `A` và phím bổ trợ `Ctrl` gõ cứng trong mã**: không tham số
   * nào của người gọi chạm tới chúng. Cùng khuôn với chốt ⑶ (toạ độ tính ở trong, không nhận
   * từ ngoài) — một thao tác có TÊN, không phải một cái máy gõ phím đa năng.
   *
   * HỨA GÌ: *đã gửi Ctrl+A rồi Delete vào đúng phần tử đã khớp.* KHÔNG hứa *"ô đã rỗng"* —
   * cùng lời hứa hẹp của `scout.click`/`scout.type` (`README`, `S-22`). Adapter tự kiểm bằng
   * trang: với Udin, ô rỗng thì nút Send khoá lại.
   *
   * GIỚI HẠN ĐÃ BIẾT, ghi ra thay vì giả vờ không có: trên macOS phím chọn-tất-cả là `Cmd+A`,
   * không phải `Ctrl+A`, nên thao tác này **không xoá được trên máy Mac**. Gói chạy trên Windows
   * của Đức. Ai chạy trên Mac thì đây là chỗ sửa, và dấu kiểm của adapter sẽ bắt được. */
  async "input.clear"(send, params) {
    const selector = readSelector(params.selector);
    const node = await locateOne(send, selector);
    await send("DOM.focus", { nodeId: node.nodeId });
    for (const type of ["keyDown", "keyUp"]) {
      await send("Input.dispatchKeyEvent", {
        type, key: "a", code: "KeyA", windowsVirtualKeyCode: 65, modifiers: CTRL
      });
    }
    const xoa = NAMED_KEYS.Delete;
    for (const type of ["keyDown", "keyUp"]) {
      await send("Input.dispatchKeyEvent", { type, key: "Delete", code: xoa.code, windowsVirtualKeyCode: xoa.vk });
    }
    return { selector, matchCount: node.matchCount, steps: ["Ctrl+A", "Delete"], method: "Input.dispatchKeyEvent" };
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
  },

  /* ⑤ input.grabUrl — đọc URL ĐẦY ĐỦ của đúng một phần tử, cho `scout.grab` dùng TRONG MÁY.
   *
   * Vì sao nó tồn tại (`S-24`, Đức chốt 14/09 đường ⒜): ảnh của một trang thật thường nằm sau
   * một **URL ký sẵn** — chữ ký và hạn giờ nằm trong query. Lõi ĐỌC cắt query khỏi mọi
   * `src`/`href`, và cắt đúng như thế là ĐÚNG: query là chỗ token hay nằm. Nên đường lấy file
   * không phải nới lõi đọc, mà là: **đọc URL ở trong, dùng ở trong, không bao giờ phát ra dây.**
   * Cùng khuôn với chốt ⑶ của file này — toạ độ cũng được tính ở trong và không nhận từ ngoài.
   *
   * HAI CHỖ ĐỪNG ĐẢO LẠI:
   *   · **Không lệnh Bridge nào ánh xạ tới hành động này.** Nó trả `url` đầy đủ; ai nối nó ra
   *     dây là phát chữ ký ra ngoài. `scout.grab` gọi nó, tải file, rồi trả BYTE.
   *   · **Lời báo lỗi không được chở lại giá trị thuộc tính.** Một `URL_INVALID` in kèm chuỗi
   *     gốc là đúng cái rò rỉ đó, chỉ mặc áo thông báo lỗi. */
  async "input.grabUrl"(send, params) {
    const selector = readSelector(params.selector);
    const attribute = readAttrName(params.attribute);
    const node = await locateOne(send, selector);

    const got = await send("DOM.getAttributes", { nodeId: node.nodeId });
    /* CDP trả mảng phẳng [tên, giá_trị, tên, giá_trị, …]. */
    const flat = Array.isArray(got?.attributes) ? got.attributes : [];
    let raw = null;
    for (let i = 0; i + 1 < flat.length; i += 2) {
      if (String(flat[i]) === attribute) { raw = String(flat[i + 1] ?? ""); break; }
    }
    if (raw === null || raw.trim() === "") {
      throw new ActionError("ATTRIBUTE_MISSING",
        `Phần tử khớp selector không có thuộc tính '${attribute}' hoặc thuộc tính rỗng.`);
    }

    let url;
    try { url = new URL(raw, node.baseURL || undefined); }
    catch {
      throw new ActionError("URL_INVALID",
        `Thuộc tính '${attribute}' không phải một URL đọc được (${raw.length} ký tự).`);
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      /* `blob:` và `data:` thuộc về TAB, máy phục vụ nền không với tới; `file:` là đĩa của Đức. */
      throw new ActionError("URL_INVALID",
        `Thuộc tính '${attribute}' trỏ tới '${url.protocol}', chỉ lấy được http hoặc https.`);
    }

    /* `masked` là thứ DUY NHẤT của URL được phép đi ra dây: gốc + đường dẫn, không query,
     * không fragment — đúng bằng thứ lõi đọc vẫn cho phép, nên nó không mở thêm gì. */
    return {
      url: url.href,
      masked: `${url.origin}${url.pathname}`,
      attribute,
      selector,
      matchCount: node.matchCount
    };
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

function readNutChuot(value) {
  if (value === undefined || value === null) return MOUSE_BUTTONS.left;
  if (typeof value !== "string" || !Object.hasOwn(MOUSE_BUTTONS, value)) {
    throw new ActionError("BUTTON_NOT_ALLOWED",
      `Nút chuột "${value}" không có trong bảng. Bảng cố định: ${MOUSE_BUTTON_NAMES.join(", ")}.`);
  }
  return MOUSE_BUTTONS[value];
}

function readSoLanBam(value) {
  if (value === undefined || value === null) return 1;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > MAX_CLICK_COUNT) {
    throw new ActionError("CLICK_COUNT_INVALID", `\`click_count\` phải là số nguyên trong 1..${MAX_CLICK_COUNT}.`);
  }
  return value;
}

function readHuongCuon(value) {
  if (typeof value !== "string" || !Object.hasOwn(SCROLL_DIRECTIONS, value)) {
    throw new ActionError("DIRECTION_NOT_ALLOWED",
      `Hướng cuộn "${value}" không có trong bảng. Bảng cố định: ${SCROLL_DIRECTION_NAMES.join(", ")}.`);
  }
  return { ten: value, vec: SCROLL_DIRECTIONS[value] };
}

function readLuongCuon(value) {
  if (value === undefined || value === null) return DEFAULT_SCROLL_AMOUNT;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > MAX_SCROLL_AMOUNT) {
    throw new ActionError("SCROLL_AMOUNT_INVALID",
      `\`amount\` phải là số nguyên trong 1..${MAX_SCROLL_AMOUNT} (điểm ảnh CSS).`);
  }
  return value;
}

function readHuongDi(value) {
  if (typeof value !== "string" || !HISTORY_DIRECTIONS.includes(value)) {
    throw new ActionError("DIRECTION_NOT_ALLOWED",
      `Hướng "${value}" không có trong bảng. Bảng cố định: ${HISTORY_DIRECTIONS.join(", ")}.`);
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
  /* `baseURL` để `input.grabUrl` giải được một `src` tương đối. Trường THÊM, không đổi thứ
   * ba hành động cũ đang đọc. */
  return {
    nodeId: nodeIds[0],
    matchCount: nodeIds.length,
    rootNodeId: root.nodeId,
    baseURL: typeof root.baseURL === "string" ? root.baseURL : (typeof root.documentURL === "string" ? root.documentURL : null)
  };
}

/* Chỉ HAI thuộc tính lấy được, và cả hai đều là thuộc tính URL mà lõi đọc đang cắt query.
 * Danh sách TRẮNG, không phải danh sách đen: mở theo nhu cầu thật, không mở trước. */
export const GRAB_ATTRIBUTES = Object.freeze(["src", "href"]);

function readAttrName(value) {
  if (value === undefined || value === null) return "src";
  if (typeof value !== "string" || !GRAB_ATTRIBUTES.includes(value)) {
    throw new ActionError("ATTRIBUTE_NOT_ALLOWED",
      `Chỉ lấy được thuộc tính ${GRAB_ATTRIBUTES.join(" hoặc ")}. Nhận được: ${JSON.stringify(value)}.`);
  }
  return value;
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
async function kiemDiemBam(send, nodeId, point, goc) {
  let o;
  try {
    o = await send("DOM.getNodeForLocation", {
      x: Math.round(point.x + goc.x), y: Math.round(point.y + goc.y), includeUserAgentShadowDOM: false
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

/* `S-23` — HAI HỆ TOẠ ĐỘ. `DOM.getBoxModel` và `Input.dispatchMouseEvent` nói theo KHUNG NHÌN;
 * `DOM.getNodeForLocation` nói theo TRANG (đã cộng phần cuộn). Đo 13/09 (`docs/GIA-THUYET.md`
 * G-23): sau khi cuộn 1288px, hỏi (38, 772) ra `No node found`, hỏi (38, 2060) ra đúng nút.
 * Chưa cuộn thì hai hệ trùng nhau — vì thế T1 qua mọi phép thử lúc làm.
 *
 * Độ cuộn đọc bằng method SẴN CÓ, không xin thêm: hộp `margin` của `:root` bắt đầu ở
 * `(-scrollX, -scrollY)` (G-24). Không đọc được thì KHÔNG bấm — hỏng thì đóng. */
async function gocCuon(send, rootNodeId) {
  try {
    const goc = await send("DOM.querySelectorAll", { nodeId: rootNodeId, selector: ":root" });
    const hop = await send("DOM.getBoxModel", { nodeId: goc?.nodeIds?.[0] });
    const q = hop?.model?.margin;
    const x = -Math.min(q[0], q[2], q[4], q[6]);
    const y = -Math.min(q[1], q[3], q[5], q[7]);
    if (Number.isFinite(x) && Number.isFinite(y)) return { x, y };
  } catch (error) {
    if (error instanceof ActionError) throw error;
  }
  throw new ActionError("CLICK_HIT_TEST_FAILED",
    "Không đọc được trang đang cuộn tới đâu, nên không đổi được toạ độ sang hệ của phép hỏi-điểm. " +
    "Không kiểm được thì không bấm — xem `S-23`.");
}

/* Ba khung, đúng thứ tự đã đo. */
/* `clickCount` TĂNG DẦN qua từng cặp nhấn-nhả (1 rồi 2), không phải gửi thẳng số 2 một lần.
 * Đó là hình dạng trình duyệt thật sinh ra, và trang nào nghe `dblclick` thì nghe đúng cái
 * chuỗi đó — gửi một cặp mang `clickCount: 2` là một sự kiện không trình duyệt nào tạo ra. */
async function clickAt(send, point, nut = MOUSE_BUTTONS.left, soLan = 1) {
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y, button: "none", buttons: 0 });
  for (let lan = 1; lan <= soLan; lan += 1) {
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: nut.name, buttons: nut.mask, clickCount: lan });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: nut.name, buttons: 0, clickCount: lan });
  }
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
