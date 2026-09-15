/* zoom-core.mjs — phần THUẦN LOGIC của hai nút phóng to, tách khỏi mọi thứ đụng Chrome.
 *
 * Vì sao tách: `sidepanel.js` gọi `document` ngay ở dòng đầu, nên Node không nạp nổi nó,
 * nên mọi phép ghim trên nó buộc phải là `assert.match(nguồn, /regex/)`. Mà một phép ghim
 * đọc chữ trong mã thì **xanh cả khi mã sai** — nó chỉ chứng minh dòng chữ có ở đó. File
 * này nhỏ, không đụng trình duyệt, nên phép ghim gọi ĐƯỢC hàm thật và đo ĐƯỢC kết quả thật.
 *
 * File này được **chép nguyên văn giữa hai gói và bị so từng byte**, nên nó không được gõ cứng
 * tên gói nào — kể cả trong chú thích. Mọi thứ riêng của một gói đi vào bằng THAM SỐ.
 *
 * ─── VÌ SAO CỠ CHỮ KHÔNG XUỐNG DƯỚI 100% ────────────────────────────────────
 * Nền bảng bên này là `font-size: 11.5px` (đo trong `sidepanel.css` 16/09). 80% của nó là
 * 9,2px — nhỏ hơn mức đọc thoải mái trên màn hình thường. Ba gói `duc-auto-*` đã đi qua
 * đúng chỗ này và chốt cùng một cách: **cỡ chữ chỉ đi LÊN, thu phóng trang chỉ đi XUỐNG.**
 * Hai hàng nút cộng lại phủ đúng khoảng 80…120% mà Đức đặt bài, chỉ là mỗi hàng một nửa.
 */

/** Cỡ chữ của BẢNG BÊN. Chỉ lên, xem đầu file. */
export const MUC_ZOOM_UI = Object.freeze([1, 1.1, 1.2]);

/** Thu phóng của TRANG WEB. Chỉ xuống — để nhìn được nhiều nội dung hơn trong một màn. */
export const MUC_ZOOM_WEB = Object.freeze([0.8, 0.9, 1]);

/* Khoá trong `chrome.storage.local`. KHÔNG mang tên gói, và đó không phải chuyện gọn gàng:
 * file này được chép nguyên văn sang gói kia và bị so từng byte, nên một tên gói gõ cứng ở đây là
 * một lời nói dối ở một trong hai bản (bài học `G9` của `transport`). Kho lưu vốn riêng cho từng
 * extension nên không có gì để đụng nhau. Đổi tên khoá = Đức mất cỡ chữ đã chọn. */
export const KHOA_ZOOM_UI = "zoom_chu_bang_ben";

/* Chrome trả về mức thu phóng dạng số thực và làm tròn theo thang riêng của nó, nên so
 * bằng `===` là sai. Đo 16/09 trên Chrome 153: `setZoom(1.2)` rồi `getZoom` trả về đúng y
 * 1.2, không trôi một phần nghìn (`G-95`) — nhưng sai số vẫn giữ, vì Đức còn chỉnh zoom
 * bằng Ctrl+cuộn và thang của Chrome KHÔNG trùng ba mức ở trên. Con số 0,015 lấy từ ba gói
 * `duc-auto-*`, nơi nó đã chạy thật. */
export const SAI_SO_ZOOM = 0.015;

/** Giá trị lạ (chữ, rỗng, `null`, mức đã bỏ) đều rơi về 100%, không ném. */
export function chuanHoaZoomUi(gia) {
  const so = Number(gia);
  return MUC_ZOOM_UI.includes(so) ? so : 1;
}

/** Mức thật có khớp nút này không. Dùng cho CẢ hai hàng nút. */
export function trungMuc(thuc, muc, saiSo = SAI_SO_ZOOM) {
  if (!Number.isFinite(thuc) || !Number.isFinite(muc)) return false;
  return Math.abs(thuc - muc) <= saiSo;
}

/* ─── U2 dùng riêng ─────────────────────────────────────────────────────────
 * `G-95` đo ra một điều ngược trực giác và cả `U2` treo vào đó: `chrome.tabs.setZoom`
 * **KHÔNG** bị `host_permissions` chặn — nó phóng to được cả một tab hoàn toàn ngoài quyền.
 * Thứ duy nhất ngăn tiện ích phóng nhầm tab của người khác là **`tab.url` bị Chrome GIẤU** ở
 * tab ngoài quyền. Nên lớp an toàn nằm ở đây, trên đường ĐỌC.
 *
 * Hệ quả, viết thẳng ra cho người sửa sau: **không đọc được `url` thì KHOÁ NÚT.** Ai "chữa"
 * bằng cách cứ zoom tab đang xem khi không biết nó là tab gì là vừa gỡ mất lớp chặn duy nhất.
 */
/**
 * Tab đang xem có dùng được không, và nếu không thì VÌ SAO — lý do là thứ hiện lên tooltip.
 * Trả `{ dung: boolean, vi: string }`. `vi` rỗng khi dùng được.
 *
 * `mien` là tên miền DUY NHẤT được phép, hoặc `null` nghĩa là **mọi trang http(s)**. Hai gói
 * dùng hai giá trị khác nhau và đó là khác biệt THẬT, không phải tuỳ chọn:
 *   · gói hẹp mở đúng một tên miền → truyền tên miền đó
 *   · gói mở `<all_urls>` → truyền `null`, vì *"không phải trang của tôi"* không có nghĩa ở đó
 *
 * BỐN nguyên nhân nút xám phải ra BỐN câu khác nhau: một nút xám câm không chẩn đoán được từ
 * xa, và *"nút zoom hỏng"* là tất cả những gì người dùng gõ được vào chat.
 */
export function xetTabDangXem(tab, mien = null) {
  if (!tab) return { dung: false, vi: "cửa sổ đang mở bảng này không có tab nào" };
  if (!tab.id && tab.id !== 0) return { dung: false, vi: "Chrome không trả về số hiệu tab" };
  if (typeof tab.url !== "string" || tab.url === "") {
    return { dung: false, vi: mien
      ? `tab đang xem không phải trang ${mien} (Chrome giấu địa chỉ của tab ngoài quyền)`
      : "Chrome không trả về địa chỉ của tab đang xem" };
  }
  let dia;
  try { dia = new URL(tab.url); } catch { return { dung: false, vi: `địa chỉ tab đọc không ra: ${tab.url}` }; }
  /* `chrome://`, `file://`, `chrome-extension://` — Chrome từ chối thu phóng chúng, và nó từ
   * chối bằng một mã lỗi. Chặn từ đây thì còn nói được một câu. */
  if (dia.protocol !== "http:" && dia.protocol !== "https:") {
    return { dung: false, vi: `tab đang xem là trang ${dia.protocol.replace(":", "")}, không thu phóng được` };
  }
  if (mien && dia.hostname !== mien) return { dung: false, vi: `tab đang xem là ${dia.hostname}, không phải ${mien}` };
  return { dung: true, vi: "" };
}
