/* Udin Optic — E2E: mở trang → W1 vượt màn chờ → W2 gửi prompt → W3 lấy ảnh về đĩa.
 *
 * Một lượt chạy TIÊU CREDIT THẬT của Đức, nên:
 *   · prompt là THAM SỐ BẮT BUỘC và phải khác lượt trước — luật repo: mỗi lượt chạy thật một
 *     prompt mới, không lượt nào dùng lại chữ của lượt nào.
 *   · `scout.navigate` mặc định KHÔNG chạy: nó nạp lại tab Đức đang mở. Muốn bắt đầu từ trang
 *     sạch thì thêm `--nap-lai`.
 *
 *   SCOUTER_GHE=<id> node workers/duc-scouter/pilots/udin-optic/scripts/e2e.mjs "a blue kite" [--nap-lai]
 */
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { goi as goiThat, timTab as timTabThat } from "../../trang-thu-cham/scripts/goi-bridge.mjs";
import { quaManCho, URL_UDIN } from "./qua-man-cho.mjs";
import { guiPrompt } from "./gui-prompt.mjs";
import { layAnh } from "./lay-anh.mjs";
import { docTraLoi } from "./doc-tra-loi.mjs";

export async function e2e(prompt, tuyChon = {}) {
  if (typeof prompt !== "string" || !prompt.trim()) throw new Error("Thiếu prompt — mỗi lượt chạy thật phải có chữ MỚI.");
  const goi = tuyChon.goi || goiThat;
  const chang = [];

  if (tuyChon.napLai) {
    const tab = await (tuyChon.timTab || timTabThat)(URL_UDIN, tuyChon);
    await goi("scout.navigate", { target_id: tab, url: URL_UDIN }, tuyChon);
    chang.push({ chang: "nap-lai", ok: true });
  }

  /* Mỗi chặng tự hỏi lại targetId — sau một lượt điều hướng số cũ là số của tab đã chết (N2). */
  chang.push({ chang: "W1", ...(await quaManCho(tuyChon)) });

  /* Câu trả lời ĐANG có trên trang, đọc TRƯỚC khi gửi. W4 ở cuối sẽ từ chối nếu chữ không đổi —
   * *có chữ* không bao giờ là *có chữ MỚI*, y như đếm ảnh theo `src` ở W2. Trang sạch thì chưa
   * có tin nhắn agent nào và `docTraLoi` ném đúng theo thiết kế: đó là `null`, không phải lỗi. */
  const truoc = await docTraLoi(tuyChon).then((k) => k.chu, () => null);

  const gui = await guiPrompt(prompt, tuyChon);
  chang.push({ chang: "W2", ...gui });
  chang.push({ chang: "W3", ...(await layAnh(gui.src, tuyChon)) });

  /* W4 là ĐỌC, và nó đứng SAU lượt tiêu tiền — nên một chặng W4 đỏ không bao giờ làm mất ảnh
   * đã nằm trên đĩa. Vẫn để nó ném: một câu trả lời sai còn tệ hơn không có câu nào. */
  chang.push({ chang: "W4", ...(await docTraLoi({ ...tuyChon, khacVoi: truoc ?? undefined })) });
  return { prompt, chang };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const doi = process.argv.slice(2);
  e2e(doi.find((a) => !a.startsWith("--")), {
    napLai: doi.includes("--nap-lai"),
    /* W7 — gửi lượt hai trên cùng ô. Phải XIN, vì chữ đang nằm trong ô có thể là chữ Đức gõ dở. */
    xoaOCu: doi.includes("--xoa-o-cu"),
  })
    .then((k) => console.log(JSON.stringify(k, null, 2)))
    .catch((e) => {
      console.error(e.message);
      /* *Vẫn đang chạy* ≠ *hỏng*. Credit đã tiêu, ảnh sắp có, và còn đúng 900 giây để lấy chúng
       * — nên lối ra này phải đưa luôn lệnh nối lại, đừng bắt người đọc tự nghĩ ra (`G-55`). */
      if (e?.dangChay) {
        console.error("");
        console.error("CREDIT ĐÃ TIÊU — lượt chạy vẫn sống. Nối lại ngay (ảnh hết hạn sau 900s):");
        console.error("  node workers/duc-scouter/pilots/udin-optic/scripts/gui-prompt.mjs --noi-lai");
        console.error("  node workers/duc-scouter/pilots/udin-optic/scripts/lay-anh.mjs <src…>");
      }
      process.exitCode = 1;
    });
}
