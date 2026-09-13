/* Udin Optic — vượt màn "User Limit Reached" bằng nút Try Again.
 *
 * Selector lấy từ DOM thật 13/09 (scout.a11y + scout.query), không đoán:
 *   .concurrency-overlay                              — màn chắn (div)
 *   .concurrency-overlay button.concurrency-button    — nút "Try Again", khớp đúng 1
 *   textarea.agent-textarea                           — ô prompt; lúc bị chắn usable=covered
 *
 *   SCOUTER_GHE=<id> node workers/duc-scouter/pilots/udin-optic/scripts/qua-man-cho.mjs
 */
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { goi as goiThat, timTab as timTabThat } from "../../trang-thu-cham/scripts/goi-bridge.mjs";

export const URL_UDIN = "https://vinfast.udinbv.com/optic";
export const SEL = Object.freeze({
  manChan: ".concurrency-overlay",
  nutThuLai: ".concurrency-overlay button.concurrency-button",
  oPrompt: "textarea.agent-textarea",
});

export async function quaManCho(tuyChon = {}) {
  const goi = tuyChon.goi || goiThat;
  const tab = await (tuyChon.timTab || timTabThat)(URL_UDIN, tuyChon);

  const chan = await goi("scout.query", { target_id: tab, selector: SEL.manChan }, tuyChon);
  if (chan.data.matchCount === 0) return { daChan: false, bam: 0 };

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
