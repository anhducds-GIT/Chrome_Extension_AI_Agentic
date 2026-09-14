/* Udin Optic — gõ prompt, bấm Send, chờ Udin làm xong, đếm ảnh mới.
 *
 * Selector lấy từ DOM thật 13/09 (scout.query trước/sau một lượt gửi thật), không đoán:
 *   button.agent-send-button               — nút Send; có `disabled` khi ô trống
 *   button.agent-send-button.stop-button   — nút đó lúc Udin đang chạy
 *   img.batch-grid-image                   — ảnh kết quả ("Variation 1..4")
 * Nút Send và nút Stop là CÙNG một phần tử đổi class — bấm nhầm Stop là báo "đã nhận" giả (audit 13/09).
 * Đo thật: gửi → 1,5s thành stop-button → 68s tắt → 4 ảnh mới (GIA-THUYET G-30).
 *
 *   SCOUTER_GHE=<id> node workers/duc-scouter/pilots/udin-optic/scripts/gui-prompt.mjs "a red car"
 */
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { goi as goiThat, timTab as timTabThat } from "../../trang-thu-cham/scripts/goi-bridge.mjs";
import { quaManCho, URL_UDIN, SEL as SEL_CHO } from "./qua-man-cho.mjs";

export const SEL = Object.freeze({
  oPrompt: SEL_CHO.oPrompt,
  nutSend: "button.agent-send-button:not(.stop-button)",
  dangChay: "button.agent-send-button.stop-button",
  anhKetQua: "img.batch-grid-image",
});

const ngu = (ms) => new Promise((r) => setTimeout(r, ms));

export async function guiPrompt(prompt, tuyChon = {}) {
  if (typeof prompt !== "string" || !prompt.trim()) throw new Error("Thiếu prompt.");
  const goi = tuyChon.goi || goiThat;
  const nghi = tuyChon.ngu || ngu;
  const buoc = tuyChon.buocMs ?? 3000;
  const tran = tuyChon.tranMs ?? 300000;

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
    throw new Error("Ô prompt đang có chữ sẵn (nút Send đã mở) — gõ thêm sẽ dính vào chữ cũ; chưa gửi.");
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

  while ((await dem(SEL.dangChay)).matchCount > 0) {
    if (Date.now() - t0 > tran) throw new Error(`Udin chạy quá ${Math.round(tran / 1000)}s chưa xong.`);
    await nghi(buoc);
  }

  const moi = [...(await tapAnh())].filter((src) => !truoc.has(src));
  if (moi.length === 0) throw new Error(`Udin chạy xong nhưng không có ảnh mới (trước có ${truoc.size}).`);
  /* Trả cả `src` chứ không chỉ số đếm: chặng sau (W3) lấy đúng những ảnh của LƯỢT NÀY về đĩa,
   * không lấy cả lịch sử của phiên. */
  return { anhMoi: moi.length, giay: Math.round((Date.now() - t0) / 1000), src: moi };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  guiPrompt(process.argv[2]).then((k) => console.log(JSON.stringify(k))).catch((e) => { console.error(e.message); process.exitCode = 1; });
}
