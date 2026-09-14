/* Udin Optic — vượt màn "User Limit Reached" bằng nút Try Again.
 *
 * Selector lấy từ DOM thật 13/09 (scout.a11y + scout.query), không đoán:
 *   .concurrency-overlay                              — màn chắn (div)
 *   .concurrency-overlay button.concurrency-button    — nút "Try Again", khớp đúng 1
 *   textarea.agent-textarea                           — ô prompt; lúc bị chắn usable=covered
 *
 *   UDIN_GHE=<id> node workers/udin-optic/tu-dong/qua-man-cho.mjs
 */
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { goi as goiThat, timTab as timTabThat } from "./goi-bridge.mjs";

export const URL_UDIN = "https://vinfast.udinbv.com/optic";
export const SEL = Object.freeze({
  manChan: ".concurrency-overlay",
  nutThuLai: ".concurrency-overlay button.concurrency-button",
  oPrompt: "textarea.agent-textarea",
});

export async function quaManCho(tuyChon = {}) {
  const goi = tuyChon.goi || goiThat;
  const tab = await (tuyChon.timTab || timTabThat)(URL_UDIN, tuyChon);

  /* ĐỢI ỨNG DỤNG VẼ XONG TRƯỚC ĐÃ. Đo 14/09: ngay sau `scout.navigate`, cả màn chắn lẫn ô prompt
   * đều CHƯA có, nên hàm này đọc "không màn chắn" rồi trả về *sẵn sàng* — và chặng sau ngã với
   * "thấy 0 nút Send". **Vắng mặt cái chắn không phải là có mặt cái sẵn sàng** (cùng họ với
   * `S-18`: *có mặt* khác *dùng được*). Ô prompt là dấu đúng: nó nằm trong DOM kể cả khi bị màn
   * chắn phủ kín (đo `S-18` 12/09), nên `present` phân biệt được *chưa vẽ* với *đang bị chắn*. */
  const veXong = await goi("scout.wait", { target_id: tab, selector: SEL.oPrompt, state: "present", timeout_ms: 20000 }, tuyChon);
  if (!veXong.data.satisfied) throw new Error("Trang Udin chưa vẽ xong sau 20s — chưa có ô prompt trong DOM, chưa làm gì cả.");

  const chan = await goi("scout.query", { target_id: tab, selector: SEL.manChan }, tuyChon);
  if (chan.data.matchCount === 0) {
    /* Không có màn chắn vẫn chưa đủ để nói *sẵn sàng*: ô prompt có thể còn bị thứ khác phủ. */
    const o = await goi("scout.wait", { target_id: tab, selector: SEL.oPrompt, state: "usable", timeout_ms: 5000 }, tuyChon);
    if (!o.data.satisfied) throw new Error(`Không có màn chắn nhưng ô prompt vẫn chưa dùng được: ${o.data.usableBlockedBy || "hết giờ"}`);
    return { daChan: false, bam: 0 };
  }

  const san = await goi("scout.wait", { target_id: tab, selector: SEL.nutThuLai, state: "usable", timeout_ms: 5000 }, tuyChon);
  if (!san.data.satisfied) throw new Error(`Nút Try Again chưa bấm được: ${san.data.usableBlockedBy || "hết giờ"}`);

  await goi("scout.click", { target_id: tab, selector: SEL.nutThuLai }, tuyChon);

  /* Kiểm bằng KẾT QUẢ trên trang, không bằng lời báo của scout.click (S-22). */
  const het = await goi("scout.wait", { target_id: tab, selector: SEL.manChan, state: "absent", timeout_ms: 15000 }, tuyChon);
  if (!het.data.satisfied) throw new Error("Đã bấm Try Again mà màn chắn vẫn còn — máy chủ Udin vẫn đầy chỗ, thử lại sau.");

  const o = await goi("scout.wait", { target_id: tab, selector: SEL.oPrompt, state: "usable", timeout_ms: 5000 }, tuyChon);
  if (!o.data.satisfied) throw new Error(`Màn chắn đã tắt nhưng ô prompt chưa dùng được: ${o.data.usableBlockedBy}`);
  return { daChan: true, bam: 1 };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  quaManCho().then((k) => console.log(JSON.stringify(k))).catch((e) => { console.error(e.message); process.exitCode = 1; });
}
