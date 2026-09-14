/* Udin Optic — W4: đọc câu trả lời CHỮ của agent sau một lượt chạy.
 *
 * HỢP ĐỒNG ⟨trước · thao tác · thành công · thất bại⟩
 *   trước     một lượt đã chạy xong trên tab Udin (W2 đã gửi, agent đã đáp).
 *   thao tác  dựng vài ứng viên selector cho **tin nhắn agent cuối cùng**, HỎI LẠI TRANG từng
 *             cái bằng `scout.query`, lấy cái đầu tiên khớp đúng MỘT, rồi `scout.text`.
 *   thành công chữ khác rỗng, KHÔNG bị cắt, và — nếu người gọi đưa `khacVoi` — khác câu trả lời
 *             đã có trước lượt gửi.
 *   thất bại  không ứng viên nào khớp đúng một · chữ rỗng · chữ bị cắt ở trần 5.000 · chữ y hệt
 *             trước lượt gửi. Cả năm đều ĐỎ và kể ra đã thử gì — không đoán, không trả nửa vời.
 *
 * VÌ SAO PHẢI HỎI LẠI TRANG TỪNG ỨNG VIÊN. Đo thật 14/09 trên chính trang này:
 *   `.agent-message-item:last-child .markdown-content` → khớp **1**  ✅
 *   `.markdown-content:last-of-type`                   → khớp **20** ❌
 *   `.chat-message.agent:last-of-type`                 → khớp **20** ❌
 * Hai cái sau *trông* như "cái cuối cùng" y hệt cái đầu. `:last-of-type` xét theo TÊN THẺ trong
 * từng cha, nên trên một danh sách tin nhắn nó ra mỗi cha một cái. Một adapter tin vào tên
 * selector sẽ đọc **tin nhắn của lượt khác** và không ai biết. Đây đúng cơ chế đã cứu `W3`
 * (`G-54`: `alt` khớp 4 ảnh) — cùng một phép kiểm, cùng một lý do.
 *
 * VÌ SAO KHÔNG DÙNG CHUNG `selectorDuyNhat` CỦA `lay-anh.mjs`: hàm đó nhận một *ảnh* và dựng
 * ứng viên từ thuộc tính của ảnh. Phần dùng lại được chỉ là vòng lặp sáu dòng dưới đây; tách nó
 * ra nghĩa là sửa một đường VỪA CHỨNG MINH XONG (`T33`) để tiết kiệm sáu dòng. Không đáng.
 *
 * `scout.text` là CỬA HẸP của ADR-0006: một phần tử, trần 5.000 ký tự, không có đường lấy chữ
 * hàng loạt. Nó **từ chối** khi selector khớp ≠ 1 — đó là chốt, không phải phiền; đừng nới.
 *
 *   UDIN_GHE=<id> node workers/udin-optic/tu-dong/doc-tra-loi.mjs
 */
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { goi as goiThat, timTab as timTabThat } from "./goi-bridge.mjs";
import { URL_UDIN } from "./qua-man-cho.mjs";

/* Xếp từ hẹp tới rộng. Cái hẹp nhất ra đúng phần chữ agent viết; cái rộng nhất là lưới an toàn
 * cho ngày trang đổi lớp trong. Trang đổi tới mức cả ba cùng trượt thì ĐỎ — đúng ý. */
export const UNG_VIEN = Object.freeze([
  ".agent-message-item:last-child .markdown-content",
  ".agent-message-item:last-child .message-content",
  ".agent-message-item:last-child",
]);

/**
 * @param {object}  [tuyChon]
 * @param {string}  [tuyChon.khacVoi]  câu trả lời ĐỌC ĐƯỢC TRƯỚC lượt gửi. Đưa vào thì hàm này
 *   từ chối trả về khi chữ không đổi — chặn đúng ca đọc lại câu của lượt TRƯỚC rồi khai là câu
 *   của lượt NÀY. Không đưa thì nó chỉ đọc, và người gọi chịu trách nhiệm về chỗ đó.
 * @returns {Promise<{selector:string, chu:string, kyTu:number}>}
 */
export async function docTraLoi(tuyChon = {}) {
  const goi = tuyChon.goi || goiThat;
  const tab = tuyChon.tab || (await (tuyChon.timTab || timTabThat)(URL_UDIN, tuyChon));

  const daThu = [];
  for (const selector of UNG_VIEN) {
    const d = (await goi("scout.query", { target_id: tab, selector, limit: 1 }, tuyChon)).data;
    daThu.push(`${selector} → ${d.matchCount}`);
    if (d.matchCount !== 1) continue;

    const t = (await goi("scout.text", { target_id: tab, selector }, tuyChon)).data;
    const chu = typeof t.text === "string" ? t.text.trim() : "";

    /* Khớp đúng một mà rỗng nghĩa là ta đang đọc nhầm chỗ — một khung chứa chưa có chữ chẳng
     * hạn. Trả chuỗi rỗng ra ngoài thì người gọi đọc thành "agent không nói gì". */
    if (chu === "") {
      throw new Error(
        `Selector '${selector}' khớp đúng một phần tử nhưng KHÔNG có chữ. Đang đọc nhầm chỗ — ` +
        "sửa bảng UNG_VIEN, đừng trả chuỗi rỗng ra ngoài như thể agent im lặng.",
      );
    }
    /* Trần 5.000 là trần của SEED (`scout.text`), không phải của trang. Một câu bị cắt vẫn là
     * một câu SAI nếu ai đó đem đi so chuỗi hay đưa cho người đọc — nên ĐỎ, và nói rõ trần của
     * ai. Đo 14/09: câu trả lời thật của Udin dài 251 ký tự, còn cách trần rất xa. */
    if (t.truncated) {
      throw new Error(
        `Câu trả lời dài ${t.chars} ký tự và đã bị CẮT ở trần ${t.maxChars} của 'scout.text'. ` +
        "Đó là trần của SEED chứ không của trang — nâng nó là một quyết định ở lõi đọc, " +
        "không phải chỗ để adapter lặng lẽ dùng bản cụt.",
      );
    }
    /* Ca hỏng đắt nhất của chặng này: agent chưa kịp đáp lượt mới, ta đọc lại câu của lượt
     * trước và khai là kết quả. Cùng loại với "đếm ảnh theo `src`" ở W2 — *có chữ* không bao
     * giờ là *có chữ MỚI*. */
    if (typeof tuyChon.khacVoi === "string" && chu === tuyChon.khacVoi.trim()) {
      throw new Error(
        "Câu trả lời Y HỆT câu đọc được TRƯỚC lượt gửi — agent chưa đáp lượt này. " +
        "Đây là câu của lượt trước, không phải kết quả của lượt này.",
      );
    }
    return { selector, chu, kyTu: t.chars };
  }

  throw new Error(
    "Không dựng được selector khớp đúng một tin nhắn agent cuối. Đã hỏi lại trang: " +
    `${daThu.join(" · ")}. Khớp 0 nghĩa là agent CHƯA đáp (tin cuối là của người dùng); ` +
    "khớp nhiều nghĩa là trang đã đổi hình dạng — sửa bảng UNG_VIEN, đừng lấy phần tử đầu tiên.",
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  docTraLoi()
    .then((k) => console.log(JSON.stringify(k, null, 2)))
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    });
}
