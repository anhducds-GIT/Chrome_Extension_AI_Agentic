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

  /* BẤM LẠI NHIỀU LẦN, và đây là chỗ một lời khai cũ đã bị Đức bác — đọc kỹ trước khi rút gọn.
   *
   * Bản trước bấm ĐÚNG MỘT lần rồi ném: *"máy chủ Udin vẫn đầy chỗ, thử lại sau."* Câu ấy sai ở
   * hai tầng. Tầng ngoài: nó khai một NGUYÊN NHÂN mà lệnh này không có cách nào kiểm — ta chỉ
   * thấy một màn chắn còn đó, không thấy cái máy chủ. Tầng trong: nguyên nhân ấy **không đúng**.
   * Đức chốt 17/09: *"đây chỉ là bug thôi, từ sau bạn cứ ấn"* — màn chắn là lỗi giao diện của
   * Udin, không phải hết chỗ thật.
   *
   * Bài học đắt hơn bản vá: 16/09 tôi đo ĐÚNG triệu chứng (~25 phút, 6 lượt bấm, không tắt) rồi
   * **tự đặt tên cho nguyên nhân**, và viết cái tên ấy thành luật *"đừng bấm thêm, chỉ có đợi"*.
   * Hôm sau chính luật ấy chặn một lượt chạy thật, và tôi báo cho Đức là *bị chặn bởi sức chứa
   * máy chủ* — một câu chỉ có anh ấy mới bác được. Triệu chứng thì đo được; nguyên nhân thì phải
   * hỏi người biết. */
  const tranBam = tuyChon.soLanBam ?? 12;
  for (let bam = 1; bam <= tranBam; bam++) {
    const san = await goi("scout.wait", { target_id: tab, selector: SEL.nutThuLai, state: "usable", timeout_ms: 5000 }, tuyChon);
    if (!san.data.satisfied) throw new Error(`Nút Try Again chưa bấm được: ${san.data.usableBlockedBy || "hết giờ"}`);

    await goi("scout.click", { target_id: tab, selector: SEL.nutThuLai }, tuyChon);

    /* Kiểm bằng KẾT QUẢ trên trang, không bằng lời báo của scout.click (S-22). */
    const het = await goi("scout.wait", { target_id: tab, selector: SEL.manChan, state: "absent", timeout_ms: 15000 }, tuyChon);
    if (het.data.satisfied) {
      const o = await goi("scout.wait", { target_id: tab, selector: SEL.oPrompt, state: "usable", timeout_ms: 5000 }, tuyChon);
      if (!o.data.satisfied) throw new Error(`Màn chắn đã tắt nhưng ô prompt chưa dùng được: ${o.data.usableBlockedBy}`);
      return { daChan: true, bam };
    }
  }

  /* Hết trần thì kể ĐÃ LÀM GÌ, và **không đặt tên cho nguyên nhân**. */
  throw new Error(
    `Đã bấm Try Again ${tranBam} lần, mỗi lần chờ tới 15s, mà màn chắn vẫn còn. Đức chốt 17/09 rằng ` +
    "màn chắn này là **bug của Udin** chứ không phải hết chỗ thật, nên đừng ngồi đợi nó — làm việc khác " +
    "rồi quay lại, hoặc nạp lại trang. Chưa gửi prompt nào.",
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  quaManCho().then((k) => console.log(JSON.stringify(k))).catch((e) => { console.error(e.message); process.exitCode = 1; });
}
