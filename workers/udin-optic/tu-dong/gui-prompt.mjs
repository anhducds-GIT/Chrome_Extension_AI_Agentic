/* Udin Optic — gõ prompt, bấm Send, chờ Udin làm xong, đếm ảnh mới.
 *
 * Selector lấy từ DOM thật 13/09 (scout.query trước/sau một lượt gửi thật), không đoán:
 *   button.agent-send-button               — nút Send; có `disabled` khi ô trống
 *   button.agent-send-button.stop-button   — nút đó lúc Udin đang chạy
 *   img.batch-grid-image                   — ảnh kết quả ("Variation 1..4")
 * Nút Send và nút Stop là CÙNG một phần tử đổi class — bấm nhầm Stop là báo "đã nhận" giả (audit 13/09).
 * Đo thật: gửi → 1,5s thành stop-button → 68s tắt → 4 ảnh mới (GIA-THUYET G-30).
 *
 *   UDIN_GHE=<id> node workers/udin-optic/tu-dong/gui-prompt.mjs "a red car"
 */
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { goi as goiThat, timTab as timTabThat } from "./goi-bridge.mjs";
import { quaManCho, URL_UDIN, SEL as SEL_CHO } from "./qua-man-cho.mjs";

export const SEL = Object.freeze({
  oPrompt: SEL_CHO.oPrompt,
  nutSend: "button.agent-send-button:not(.stop-button)",
  dangChay: "button.agent-send-button.stop-button",
  anhKetQua: "img.batch-grid-image",
});

const ngu = (ms) => new Promise((r) => setTimeout(r, ms));

/* URL ký sẵn của ảnh kết quả khai `X-Amz-Expires=900` (`G-51`). Quá 900 giây kể từ lúc ảnh sinh
 * ra thì có lấy cũng 403 — nên đó là trần TỰ NHIÊN của một lượt chờ, không phải một con số đẹp. */
export const HAN_URL_MS = 900000;

/**
 * Udin **vẫn đang chạy** khi hết trần chờ. Đây KHÔNG phải "hỏng": credit đã tiêu, ảnh sắp có, và
 * lượt chạy còn nối lại được. Đo 14/09 (`G-55`): adapter bỏ cuộc ở 300s trong khi Udin chạy tiếp
 * hơn 17 phút — cả lượt tốn tiền đó mất trắng vì *quá giờ* bị gộp vào *hỏng*.
 */
export class UdinDangChay extends Error {
  constructor(giay, truoc) {
    super(
      `Udin VẪN ĐANG CHẠY sau ${giay}s — chưa hỏng, chỉ là chưa xong. Credit đã tiêu. ` +
      `Nối lại bằng: choXong(truoc) với ${truoc.length} ảnh đã có trước lúc gửi. ` +
      "Ảnh hết hạn 900 giây sau khi hiện ra, nên đừng để lâu.",
    );
    this.name = "UdinDangChay";
    this.dangChay = true;
    this.giay = giay;
    this.truoc = truoc;
  }
}

/**
 * Chờ Udin chạy xong rồi trả về ảnh MỚI so với `truoc`. Tách rời `guiPrompt` để **nối lại được
 * một lượt đang dở** mà không gửi thêm prompt nào (và không tiêu thêm credit).
 * @param {string[]} truoc tập `src` ảnh có trước lúc gửi
 */
export async function choXong(truoc, tuyChon = {}) {
  const goi = tuyChon.goi || goiThat;
  const nghi = tuyChon.ngu || ngu;
  const buoc = tuyChon.buocMs ?? 3000;
  const tran = tuyChon.tranMs ?? HAN_URL_MS;
  const t0 = tuyChon.t0 ?? Date.now();
  const tab = await (tuyChon.timTab || timTabThat)(URL_UDIN, tuyChon);
  const cu = new Set(truoc);

  const dem = async (selector) => (await goi("scout.query", { target_id: tab, selector, limit: 1 }, tuyChon)).data;
  const tapAnh = async () => {
    const tap = new Set();
    for (let offset = 0; ; offset += 200) {
      const d = (await goi("scout.query", { target_id: tab, selector: SEL.anhKetQua, offset, limit: 200 }, tuyChon)).data;
      for (const it of d.items) if (it.attributes?.src) tap.add(it.attributes.src);
      if (!d.hasMore) return tap;
    }
  };

  while ((await dem(SEL.dangChay)).matchCount > 0) {
    /* Hết trần thì NÓI LÀ ĐANG CHẠY, đừng nói là hỏng — hai câu dẫn tới hai việc khác nhau. */
    if (Date.now() - t0 > tran) throw new UdinDangChay(Math.round((Date.now() - t0) / 1000), [...cu]);
    await nghi(buoc);
  }

  const moi = [...(await tapAnh())].filter((src) => !cu.has(src));
  if (moi.length === 0) throw new Error(`Udin chạy xong nhưng không có ảnh mới (trước có ${cu.size}).`);
  /* Trả cả `src` chứ không chỉ số đếm: chặng sau (W3) lấy đúng những ảnh của LƯỢT NÀY về đĩa,
   * không lấy cả lịch sử của phiên. */
  return { anhMoi: moi.length, giay: Math.round((Date.now() - t0) / 1000), src: moi };
}

export async function guiPrompt(prompt, tuyChon = {}) {
  if (typeof prompt !== "string" || !prompt.trim()) throw new Error("Thiếu prompt.");
  const goi = tuyChon.goi || goiThat;
  const nghi = tuyChon.ngu || ngu;

  await quaManCho({ ...tuyChon, goi });
  const tab = await (tuyChon.timTab || timTabThat)(URL_UDIN, tuyChon);
  const dem = async (selector) => (await goi("scout.query", { target_id: tab, selector, limit: 1 }, tuyChon)).data;
  /* Tập src của ảnh kết quả — đếm số nút DOM thì nhiễu (lượt thật ra 8 cho 4 ảnh). */
  const tapAnh = async () => {
    const tap = new Set();
    for (let offset = 0; ; offset += 200) {
      const d = (await goi("scout.query", { target_id: tab, selector: SEL.anhKetQua, offset, limit: 200 }, tuyChon)).data;
      for (const it of d.items) if (it.attributes?.src) tap.add(it.attributes.src);
      if (!d.hasMore) return tap;
    }
  };

  /* Hai điều kiện TRƯỚC khi gõ, không thì mọi phép kiểm sau đều vô nghĩa. */
  if ((await dem(SEL.dangChay)).matchCount > 0) throw new Error("Udin đang chạy một lượt khác — chưa gửi.");
  const nutTruoc = await dem(SEL.nutSend);
  if (nutTruoc.matchCount !== 1) throw new Error(`Cần đúng một nút Send, thấy ${nutTruoc.matchCount} — trang Udin đã đổi?`);
  if (!("disabled" in (nutTruoc.items[0]?.attributes || {}))) {
    /* W7 — prompt lần hai trên cùng một ô. Lời từ chối cũ là một LỚP BẢO VỆ, không phải thiếu
     * sót: ô có chữ sẵn có thể là chữ Đức đang gõ dở. Nên đường xoá là thứ người gọi phải XIN,
     * còn mặc định vẫn từ chối. Hạ lời từ chối xuống cho tiện là nới bảo vệ. */
    if (!tuyChon.xoaOCu) {
      throw new Error(
        "Ô prompt đang có chữ sẵn (nút Send đã mở) — gõ thêm sẽ dính vào chữ cũ; chưa gửi. " +
        "Muốn gửi lượt hai trên cùng ô thì truyền `xoaOCu: true` — nó XOÁ chữ đang có.",
      );
    }
    await goi("scout.clear", { target_id: tab, selector: SEL.oPrompt }, tuyChon);
    /* KIỂM BẰNG TRANG, không tin lời báo của lệnh xoá — nút Send phải khoá lại. Đây đúng cơ chế
     * đã dùng cho lượt gõ ngay bên dưới (`G-29`): trạng thái nút là thứ React thật sự biết, còn
     * `ok` của một lệnh ghi chỉ nói *lệnh hoàn tất*, không nói *trang đã nhận* (`S-22`). */
    let daXoa = false;
    for (let i = 0; i < 10 && !daXoa; i++) {
      const nut = await dem(SEL.nutSend);
      daXoa = nut.matchCount === 1 && "disabled" in (nut.items[0]?.attributes || {});
      if (!daXoa) await nghi(300);
    }
    if (!daXoa) {
      throw new Error(
        "Đã gọi `scout.clear` mà nút Send VẪN mở — chữ cũ còn trong ô; chưa gửi. " +
        "Gõ tiếp sẽ dính vào chữ cũ và lượt chạy sẽ tiêu tiền cho một prompt không ai muốn.",
      );
    }
  }

  const truoc = await tapAnh();
  await goi("scout.type", { target_id: tab, selector: SEL.oPrompt, text: prompt }, tuyChon);

  /* Nút Send mở khoá = chữ đã tới React, không chỉ tới DOM (G-29). */
  let moKhoa = false;
  for (let i = 0; i < 10 && !moKhoa; i++) {
    const nut = await dem(SEL.nutSend);
    moKhoa = nut.matchCount === 1 && !("disabled" in (nut.items[0]?.attributes || {}));
    if (!moKhoa) await nghi(300);
  }
  if (!moKhoa) throw new Error("Đã gõ mà nút Send vẫn khoá — chữ không tới được trang.");

  const t0 = Date.now();
  await goi("scout.click", { target_id: tab, selector: SEL.nutSend }, tuyChon);

  /* Kiểm bằng trang, không bằng lời báo của scout.click (S-22). */
  const nhan = await goi("scout.wait", { target_id: tab, selector: SEL.dangChay, state: "present", timeout_ms: 10000 }, tuyChon);
  if (!nhan.data.satisfied) throw new Error("Đã bấm Send mà Udin không chạy — prompt chưa được nhận.");

  /* Từ đây trở đi CREDIT ĐÃ TIÊU. Mọi đường ra khỏi hàm phải nói được *"lượt chạy đang ở đâu"*,
   * không được chỉ nói "hỏng" — đó là chỗ lượt 14/09 mất trắng (`G-55`). */
  return choXong([...truoc], { ...tuyChon, t0 });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const doi = process.argv.slice(2);
  /* `--noi-lai`: bám vào một lượt ĐANG chạy mà không gửi thêm prompt nào. Lấy tập ảnh hiện tại
   * làm mốc `truoc` — hợp lệ **trong lúc còn đang chạy**, vì Udin chỉ đăng ảnh khi xong. Nếu nó
   * đăng dần từng ảnh thì cách này bỏ sót ảnh đã đăng; chưa thấy ca đó, ghi ra để đừng quên. */
  const viec = doi.includes("--noi-lai")
    ? (async () => {
        const tab = await timTabThat(URL_UDIN, {});
        const tap = new Set();
        for (let offset = 0; ; offset += 200) {
          const d = (await goiThat("scout.query", { target_id: tab, selector: SEL.anhKetQua, offset, limit: 200 })).data;
          for (const it of d.items) if (it.attributes?.src) tap.add(it.attributes.src);
          if (!d.hasMore) break;
        }
        console.error(`nối lại: ${tap.size} ảnh đang có, chờ lượt hiện tại xong…`);
        return choXong([...tap]);
      })()
    : guiPrompt(doi.find((a) => !a.startsWith("--")));
  viec.then((k) => console.log(JSON.stringify(k))).catch((e) => { console.error(e.message); process.exitCode = 1; });
}
