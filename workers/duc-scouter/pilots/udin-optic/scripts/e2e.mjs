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
  const gui = await guiPrompt(prompt, tuyChon);
  chang.push({ chang: "W2", ...gui });
  chang.push({ chang: "W3", ...(await layAnh(gui.src, tuyChon)) });
  return { prompt, chang };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const doi = process.argv.slice(2);
  e2e(doi.find((a) => !a.startsWith("--")), { napLai: doi.includes("--nap-lai") })
    .then((k) => console.log(JSON.stringify(k, null, 2)))
    .catch((e) => { console.error(e.message); process.exitCode = 1; });
}
