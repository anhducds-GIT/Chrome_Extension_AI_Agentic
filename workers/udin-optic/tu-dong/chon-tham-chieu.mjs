/* Udin Optic — CHỌN ẢNH THAM CHIẾU THEO THỨ TỰ, để prompt gọi được `@1` / `@2`.
 *
 * Đức đo tay 16/09 và gửi ảnh chụp: **Shift+click** một ảnh trên canvas thì nó hiện một huy hiệu
 * mang số ở góc; ảnh bấm trước là `1`, ảnh sau là `2`; và prompt gọi chúng bằng `@1` / `@2` —
 * câu thật trên màn hình Đức là *"APPLY STYLE OF @1 TO @2"*.
 *
 * ─── VÌ SAO FILE NÀY TỒN TẠI, NÓI BẰNG CÁI GIÁ ─────────────────────────────
 * Đức nêu đúng chỗ hỏng: *"nếu bạn apply 1 cho 2 mà không xác định được đâu là 1, đâu là 2 thì
 * sẽ không còn chính xác nữa."* Đây là loại sai **không báo lỗi**: chọn nhầm thứ tự thì Udin vẫn
 * chạy, vẫn ra bốn ảnh, vẫn tính tiền — chỉ là nó lấy style của ảnh B áp lên ảnh A. Không một
 * dòng đỏ nào. Nên mọi hàm ở đây đều kết thúc bằng **đọc lại con số trên trang**, chứ không bằng
 * lời báo của lệnh bấm (`scout.chon` tự khai là chưa kiểm — đọc `kiem_noi` của nó).
 *
 * ─── DANH TÍNH MỘT ẢNH: `data-image-id` (ĐỔI 17/09) ───────────────────────
 * ~~Thứ duy nhất phân biệt được là `src`.~~ **Câu ấy hết đúng 17/09** — Đức chốt cho
 * `data-image-id` vào danh sách trắng của lõi đọc, nên nay trang tự khai danh tính từng chỗ đặt.
 *
 * VÌ SAO PHẢI ĐỔI, nói bằng phép đo chứ không bằng thẩm mỹ: Udin **mã hoá lại** mọi ảnh người
 * dùng thả vào thành WebP nhúng thẳng trong `src` (`data:image/webp;base64,…`), còn lõi đọc thì
 * cắt mọi thuộc tính ở 200 ký tự. Hai ảnh KHÁC HẲN NHAU cho ra hai chuỗi 200 ký tự **y hệt**. Đo
 * 17/09 trên trang thật: canvas mọc từ 18 lên 20 mà phép so `src` thấy **0 ảnh mới**, và lệnh
 * báo *"trang chưa nhận"* — một câu SAI NGUYÊN NHÂN.
 *
 * Chỗ sâu hơn đáng nhớ: **`src` bị cắt cũng là một cái tên.** 16/09 tôi bỏ phép nhận dạng theo
 * TÊN TỆP vì nó khớp 0/8, thay bằng `src`, rồi rơi lại đúng họ lỗi ấy ở một lớp sâu hơn. Thứ
 * chữa được là một mã ĐỊNH DANH do trang tự đặt, không phải một chuỗi ta cắt ngắn rồi đem so.
 *
 * Nó chữa luôn một khuyết tật khác: `src` định danh **TẤM ẢNH**, `data-image-id` định danh **CHỖ
 * ĐẶT**. Một ảnh nằm 5 chỗ trên canvas (đo thật 16/09) thì `src` phải TỪ CHỐI vì không nói được
 * chỗ nào; `data-image-id` trỏ đích danh từng chỗ.
 *
 * `src` còn đúng một việc: **tìm hộ Đức** khi anh gõ `canvas:<mẩu src>`. Phép tìm ấy để CHROME
 * khớp CSS (`img[src*="…"]`) chứ không so chuỗi trong Node — Chrome khớp trên `src` THẬT, còn
 * chuỗi Node cầm thì đã bị cắt. Lõi đọc gắn `…` vào cuối chỗ cắt; dấu ấy là chú thích cho người
 * đọc, không phải một phần của URL (đã dính 16/09).
 */
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { goi as goiThat, timTab as timTabThat } from "./goi-bridge.mjs";
import { URL_UDIN } from "./qua-man-cho.mjs";

export const SEL = Object.freeze({
  hop: ".canvas-image-container",
  anh: ".canvas-image-container img",
  dangChon: ".canvas-image-container.selected",
  huyHieu: ".selection-order-badge",
});

const ngu = (ms) => new Promise((r) => setTimeout(r, ms));

/** Bỏ dấu `…` lõi đọc gắn vào khi cắt. Xem khối đầu file. */
export function sachSrc(src) {
  return String(src ?? "").replace(/…+$/, "");
}

/**
 * Giá trị nhét vào một selector thuộc tính phải nằm gọn trong cặp nháy kép, nên có `"`, `\` hay
 * xuống dòng thì **TỪ CHỐI**, không đi thoát chuỗi cho khéo — cùng chốt với `lay-anh.mjs`: một
 * selector thoát sai là một selector trỏ đi đâu không ai biết.
 */
function nhetDuocVaoSelector(gia, ten) {
  const s = sachSrc(gia);
  if (!s) throw new Error(`Thiếu \`${ten}\` để trỏ tới ảnh trên canvas.`);
  if (/["\\\n\r]/.test(s)) {
    throw new Error(`\`${ten}\` chứa ký tự không nhét được vào selector (" hoặc \\ hoặc xuống dòng): ${JSON.stringify(s.slice(0, 60))}.`);
  }
  return s;
}

/** Selector trỏ tới ĐÚNG MỘT chỗ đặt trên canvas, theo mã trang tự gán. */
export function hopTheoId(id) {
  return `${SEL.hop}[data-image-id="${nhetDuocVaoSelector(id, "data-image-id")}"]`;
}

/**
 * Selector tìm hộp theo một MẨU `src` — dùng `*=` để **Chrome** khớp trên `src` THẬT. Đừng thay
 * bằng một phép `includes()` trong Node: chuỗi `src` phía này đã bị lõi đọc cắt ở 200 ký tự, và
 * đúng chỗ ấy là chỗ đường cũ mù.
 */
export function hopTheoMauSrc(manh) {
  return `${SEL.hop}:has(img[src*="${nhetDuocVaoSelector(manh, "src")}"])`;
}

function may(tuyChon) {
  const goi = tuyChon.goi || goiThat;
  const nghi = tuyChon.ngu || ngu;
  return {
    goi, nghi,
    tab: async () => await (tuyChon.timTab || timTabThat)(URL_UDIN, tuyChon),
    dem: async (tab, selector) => (await goi("scout.query", { target_id: tab, selector, limit: 1 }, tuyChon)).data.matchCount,
    chu: async (tab, selector) => String((await goi("scout.text", { target_id: tab, selector }, tuyChon)).data.text ?? "").trim(),
  };
}

/**
 * Mã của mọi CHỖ ĐẶT đang có trên canvas, theo thứ tự tài liệu. **Đây là phép đo danh tính** —
 * thứ dùng để biết một lượt thả đã đẻ ra chỗ đặt nào.
 *
 * Hộp không có `data-image-id` thì **TỪ CHỐI cả lượt**, không lặng lẽ bỏ qua: bỏ qua nghĩa là
 * phép so trước/sau đếm thiếu, và nó sẽ báo *"canvas không mọc thêm ảnh nào"* cho một lượt thả
 * thành công — đúng câu sai nguyên nhân mà 17/09 đã tốn một lượt chạy.
 */
export async function idTrenCanvas(tuyChon = {}) {
  const { goi } = may(tuyChon);
  const tab = await may(tuyChon).tab();
  const ra = [];
  for (let offset = 0; ; offset += 200) {
    const d = (await goi("scout.query", { target_id: tab, selector: SEL.hop, offset, limit: 200 }, tuyChon)).data;
    for (const n of d.items || []) {
      const id = n.attributes?.["data-image-id"];
      if (!id) {
        throw new Error(
          "Một hộp trên canvas không có `data-image-id`. Hoặc trang đổi hình dạng, hoặc extension " +
          "đang chạy bản cũ chưa có thuộc tính ấy trong danh sách trắng của lõi đọc (mở 17/09) — " +
          "nạp lại extension rồi chạy lại. Chưa chọn gì.",
        );
      }
      ra.push(String(id));
    }
    if (!d.hasMore) return ra;
  }
}

/** Tập `src` của mọi ảnh đang nằm trên canvas, đã bỏ dấu cắt. Để NGƯỜI đọc, không để định danh. */
export async function anhTrenCanvas(tuyChon = {}) {
  const { goi } = may(tuyChon);
  const tab = await may(tuyChon).tab();
  const ra = [];
  for (let offset = 0; ; offset += 200) {
    const d = (await goi("scout.query", { target_id: tab, selector: SEL.anh, offset, limit: 200 }, tuyChon)).data;
    for (const n of d.items || []) if (n.attributes?.src) ra.push(sachSrc(n.attributes.src));
    if (!d.hasMore) return ra;
  }
}

/** `canvas:<mẩu src>` → mã của ĐÚNG MỘT chỗ đặt. Khớp ≠ 1 thì TỪ CHỐI. */
export async function idTheoSrc(manh, tuyChon = {}) {
  const { goi } = may(tuyChon);
  const tab = await may(tuyChon).tab();
  const selector = hopTheoMauSrc(manh);
  const d = (await goi("scout.query", { target_id: tab, selector, offset: 0, limit: 4 }, tuyChon)).data;
  if (d.matchCount !== 1) {
    throw new Error(
      `'canvas:${manh}' khớp ${d.matchCount} chỗ trên canvas, cần đúng 1. ` +
      (d.matchCount > 1
        ? "Cùng một tấm ảnh đang nằm nhiều chỗ — đưa một mẩu `src` dài hơn, hoặc đưa thẳng `data-image-id`."
        : "Không chỗ nào mang mẩu ấy — xem danh sách bằng `node chon-tham-chieu.mjs`."),
    );
  }
  const id = d.items?.[0]?.attributes?.["data-image-id"];
  if (!id) throw new Error(`Hộp khớp 'canvas:${manh}' không có \`data-image-id\` — nạp lại extension rồi chạy lại.`);
  return String(id);
}

/**
 * Bỏ chọn hết. Mặc định **TỪ CHỐI** khi trang đang có ảnh được chọn — cùng lý do với ô prompt có
 * sẵn chữ và với ảnh đính kèm sẵn: cái đang chọn có thể là thứ Đức tự chọn, và lượt ngay sau là
 * lượt tiêu tiền. Xin bằng `boChonCu: true`.
 */
export async function boChonHet(tuyChon = {}) {
  const { goi, nghi, dem } = may(tuyChon);
  const tab = await may(tuyChon).tab();
  let con = await dem(tab, SEL.dangChon);
  if (con === 0) return { coSan: 0, daBo: 0 };
  if (!tuyChon.boChonCu) {
    throw new Error(
      `Trên canvas đang có ${con} ảnh được chọn — chúng sẽ thành \`@1\`, \`@2\`… của prompt sắp gửi, ` +
      "và có thể là ảnh chính Đức chọn. Muốn bỏ hết rồi chọn lại thì truyền `boChonCu: true`.",
    );
  }
  const coSan = con;
  let daBo = 0;
  for (let i = 0; i < 12 && con > 0; i++) {
    /* Bấm lại CÓ GIỮ SHIFT lên một ảnh đang chọn để bỏ nó ra. Chốt: chỉ bấm khi selector khớp
     * ĐÚNG MỘT — nhiều ảnh đang chọn thì trỏ từng cái bằng `:nth-of-type`, không bấm bừa. */
    let sel = SEL.dangChon;
    if ((await dem(tab, sel)) !== 1) {
      sel = null;
      for (let k = 1; k <= 12 && !sel; k++) {
        const thu = `${SEL.hop}.selected:nth-of-type(${k})`;
        if ((await dem(tab, thu)) === 1) sel = thu;
      }
      if (!sel) throw new Error(`Còn ${con} ảnh đang chọn mà không trỏ được đích danh cái nào — bỏ chọn bằng tay rồi chạy lại.`);
    }
    await goi("scout.chon", { target_id: tab, selector: sel }, tuyChon);
    await nghi(tuyChon.buocMs ?? 400);
    const sau = await dem(tab, SEL.dangChon);
    if (sau >= con) {
      throw new Error(
        `Đã Shift+click lên một ảnh đang chọn mà số ảnh được chọn KHÔNG giảm (${con} → ${sau}) — ` +
        "trang không bỏ chọn theo cách này. Bỏ chọn bằng tay rồi chạy lại.",
      );
    }
    daBo += con - sau;
    con = sau;
  }
  if (con > 0) throw new Error(`Bỏ chọn xong vẫn còn ${con} ảnh được chọn.`);
  return { coSan, daBo };
}

/**
 * Chọn các ảnh THEO ĐÚNG THỨ TỰ đưa vào, và **đọc lại con số trang gán cho từng ảnh**.
 *
 * Trả về `[{ id, selector, so }]` với `so` là số ĐỌC ĐƯỢC trên trang — không phải số ta mong đợi.
 * Lệch một chỗ là ném, vì đó đúng là ca Đức chỉ ra: prompt `@1` trỏ nhầm ảnh mà không ai nhìn ra.
 *
 * @param {string[]} dsId `data-image-id` của từng chỗ đặt, theo thứ tự muốn nó mang `@1`, `@2`, …
 */
export async function chonTheoThuTu(dsId, tuyChon = {}) {
  if (!Array.isArray(dsId) || dsId.length === 0) throw new Error("Thiếu danh sách ảnh để chọn.");
  const { goi, nghi, dem, chu } = may(tuyChon);
  const tab = await may(tuyChon).tab();

  /* Hai mã trùng nhau nghĩa là người gọi xin chọn cùng một chỗ hai lần — trang sẽ bỏ chọn nó ở
   * cú bấm thứ hai, và phép đếm cuối sẽ đỏ với một câu khó hiểu. Bắt ngay từ danh sách. */
  if (new Set(dsId).size !== dsId.length) {
    throw new Error(`Danh sách có mã trùng nhau (${dsId.join(", ")}) — mỗi tham chiếu phải là một chỗ đặt KHÁC nhau.`);
  }

  const truoc = await boChonHet(tuyChon);
  const ra = [];
  for (let i = 0; i < dsId.length; i++) {
    const mong = i + 1;
    const selector = hopTheoId(dsId[i]);
    const khop = await dem(tab, selector);
    if (khop !== 1) {
      throw new Error(
        `Ảnh thứ ${mong} khớp ${khop} hộp trên canvas, cần đúng 1. ` +
        (khop > 1
          ? "Hai chỗ đặt mang cùng một `data-image-id` — trang đổi hình dạng; chưa chọn gì."
          : "Không thấy chỗ đặt này trên canvas — nó đã bị xoá, hoặc mã đã cũ. Đọc lại danh sách rồi chạy lại."),
      );
    }

    /* CANVAS LÀ MỘT MẶT PHẲNG KÉO ĐƯỢC, nên "có trong DOM" còn xa mới là "bấm được": đo 16/09
     * trên canvas thật, **6 / 12** ảnh bấm được, số còn lại báo `no_hit_test` vì chúng nằm ngoài
     * khung nhìn. Không hỏi trước thì lượt bấm ngã với một câu của CDP — *"No node found at given
     * location"* kèm một toạ độ `y = -100` — và câu ấy không nói được Đức cần làm gì. */
    const dungDuoc = (await goi("scout.wait", {
      target_id: tab, selector, state: "usable", timeout_ms: tuyChon.choMs ?? 2000,
    }, tuyChon)).data;
    if (dungDuoc?.satisfied !== true) {
      throw new Error(
        `Ảnh thứ ${mong} đang KHÔNG bấm được (${dungDuoc?.usableBlockedBy || "hết giờ"}) — nó nằm ngoài khung nhìn ` +
        "của canvas, hoặc bị che. Kéo canvas cho nó hiện ra (hoặc bấm nút thu-vừa-màn-hình) rồi chạy lại. Chưa bấm gì.",
      );
    }

    await goi("scout.chon", { target_id: tab, selector }, tuyChon);

    /* Kiểm bằng TRANG: đúng cái hộp vừa bấm phải mang dấu "đang chọn". */
    let daChon = 0;
    for (let n = 0; n < (tuyChon.soNhip ?? 16) && daChon !== 1; n++) {
      await nghi(tuyChon.buocMs ?? 300);
      daChon = await dem(tab, `${selector}.selected`);
    }
    if (daChon !== 1) {
      throw new Error(
        `Đã Shift+click ảnh thứ ${mong} mà hộp ấy KHÔNG mang dấu "đang chọn" (khớp ${daChon}) — ` +
        "trang chưa nhận cú bấm; CHƯA gửi prompt.",
      );
    }
    ra.push({ id: String(dsId[i]), selector, so: null });
  }

  const tong = await dem(tab, SEL.dangChon);
  if (tong !== dsId.length) {
    throw new Error(`Chọn xong ${dsId.length} ảnh mà trang đếm ra ${tong} ảnh đang chọn — tập chọn không khớp; chưa gửi prompt.`);
  }

  /* ─── THỨ TỰ, đọc lại từ trang ──────────────────────────────────────────
   * Đo 16/09 tối, và nó lật một giả định của chính file này: **Udin chỉ vẽ số khi có từ HAI ảnh
   * trở lên.** Một ảnh được chọn thì hộp mang `selected` mà không có huy hiệu nào — hợp lý, một
   * ảnh thì chẳng có gì để xếp thứ tự. Bản đầu đòi huy hiệu ngay sau cú bấm ĐẦU TIÊN nên nó ném
   * oan ở lượt chạy thật đầu tiên.
   *
   * Nên phép kiểm thứ tự chạy SAU KHI đã chọn xong, và chỉ chạy khi có cái để xếp. Một ảnh thì
   * `so` trả về `null` — **khai là không có**, chứ không bịa ra số 1. */
  if (ra.length < 2) return { boChon: truoc, daChon: ra, thuTuKiemDuoc: false };

  let soHuyHieu = 0;
  for (let n = 0; n < (tuyChon.soNhip ?? 16) && soHuyHieu !== ra.length; n++) {
    await nghi(tuyChon.buocMs ?? 300);
    soHuyHieu = await dem(tab, SEL.huyHieu);
  }
  if (soHuyHieu !== ra.length) {
    throw new Error(`Đã chọn ${ra.length} ảnh mà trang chỉ vẽ ${soHuyHieu} huy hiệu số — chưa đọc được thứ tự; chưa gửi prompt.`);
  }

  for (let i = 0; i < ra.length; i++) {
    const mong = i + 1;
    const selHuyHieu = `${ra[i].selector} ${SEL.huyHieu}`;
    /* KHÔNG đếm lại huy hiệu trong từng hộp ở đây, dù nó trông như một lớp bảo vệ nữa: `scout.text`
     * TỪ CHỐI mọi selector khớp ≠ 1 (ADR-0006), nên phép đếm ấy chỉ nói lại một câu lõi đọc đã
     * nói. Con đột biến gỡ nó ra không giết được ai — đó là dấu của mã thừa, không phải của ghim
     * hở, nên xoá thay vì đi ghim một thứ không làm gì.
     *
     * Chốt thật của cả file nằm ở dòng dưới: **có huy hiệu ≠ ĐÚNG SỐ.** */
    const doc = await chu(tab, selHuyHieu);
    if (doc !== String(mong)) {
      throw new Error(
        `Ảnh thứ ${mong} sau khi chọn mang số **${JSON.stringify(doc)}**, không phải "${mong}". ` +
        "Prompt viết `@" + mong + "` sẽ trỏ sang ảnh khác, và Udin vẫn chạy, vẫn ra ảnh, vẫn tính tiền — " +
        "không một dòng đỏ nào. Dừng ở đây.",
      );
    }
    ra[i].so = mong;
  }
  return { boChon: truoc, daChon: ra, thuTuKiemDuoc: true };
}

/**
 * Prompt gọi `@N` thì `N` phải nằm trong số ảnh đã chọn. Rẻ, và nó bắt đúng ca Đức lo: câu
 * *"apply style of @1 to @2"* gửi đi khi mới chọn một ảnh.
 */
export function kiemPromptThamChieu(prompt, soAnh) {
  const goi = [...String(prompt ?? "").matchAll(/@(\d+)/g)].map((m) => Number(m[1]));
  const xau = goi.filter((n) => n < 1 || n > soAnh);
  if (xau.length) {
    throw new Error(
      `Prompt gọi ${xau.map((n) => "@" + n).join(", ")} nhưng chỉ có ${soAnh} ảnh được chọn. ` +
      "Gửi đi thì Udin vẫn chạy và vẫn tính tiền, chỉ là tham chiếu trỏ vào chỗ trống.",
    );
  }
  return { goi, soAnh };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const doi = process.argv.slice(2);
  const ma = doi.filter((a) => !a.startsWith("--"));
  (ma.length
    ? chonTheoThuTu(ma, { boChonCu: doi.includes("--bo-chon-cu") })
    /* Không đưa mã nào = LIỆT KÊ. Mặc định liệt kê `data-image-id` vì đó là thứ đưa lại được cho
     * chính lệnh này; `--src` để nhìn ảnh nào là ảnh nào. */
    : doi.includes("--src")
      ? anhTrenCanvas().then((ds) => ({ soAnh: ds.length, src: ds }))
      : idTrenCanvas().then((ds) => ({ soChoDat: ds.length, id: ds })))
    .then((k) => console.log(JSON.stringify(k, null, 2)))
    .catch((e) => { console.error(e.message); process.exitCode = 1; });
}
