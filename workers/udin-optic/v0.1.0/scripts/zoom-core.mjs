/* zoom-core.mjs — phần THUẦN LOGIC của hai nút phóng to, tách khỏi mọi thứ đụng Chrome.
 *
 * Vì sao tách: `sidepanel.js` gọi `document` ngay ở dòng đầu, nên Node không nạp nổi nó,
 * nên mọi phép ghim trên nó buộc phải là `assert.match(nguồn, /regex/)`. Mà một phép ghim
 * đọc chữ trong mã thì **xanh cả khi mã sai** — nó chỉ chứng minh dòng chữ có ở đó. File
 * này nhỏ, không đụng trình duyệt, nên phép ghim gọi ĐƯỢC hàm thật và đo ĐƯỢC kết quả thật.
 *
 * Nó cũng là thứ `U5` mang thẳng về Scouter: logic không dính gói nào.
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

/** Khoá trong `chrome.storage.local`. Đổi tên khoá = Đức mất cỡ chữ đã chọn. */
export const KHOA_ZOOM_UI = "udin_ui_zoom";

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
 * Thứ duy nhất ngăn Udin phóng nhầm tab của người khác là **`tab.url` bị Chrome GIẤU** ở
 * tab ngoài quyền. Nên lớp an toàn nằm ở đây, trên đường ĐỌC.
 *
 * Hệ quả, viết thẳng ra cho người sửa sau: **không đọc được `url` thì KHOÁ NÚT.** Ai "chữa"
 * bằng cách cứ zoom tab đang xem khi không biết nó là tab gì là vừa gỡ mất lớp chặn duy nhất.
 */
export const MIEN_UDIN = "vinfast.udinbv.com";

/**
 * Tab đang xem có dùng được không, và nếu không thì VÌ SAO — lý do là thứ hiện lên tooltip.
 * Trả `{ dung: boolean, vi: string }`. `vi` rỗng khi dùng được.
 *
 * Bốn nguyên nhân nút xám phải ra bốn câu khác nhau: một nút xám câm không chẩn đoán được
 * từ xa, và "nút zoom hỏng" là tất cả những gì Đức gõ được vào chat.
 */
export function xetTabDangXem(tab, mien = MIEN_UDIN) {
  if (!tab) return { dung: false, vi: "cửa sổ đang mở bảng này không có tab nào" };
  if (!tab.id && tab.id !== 0) return { dung: false, vi: "Chrome không trả về số hiệu tab" };
  if (typeof tab.url !== "string" || tab.url === "") {
    return { dung: false, vi: `tab đang xem không phải trang ${mien} (Chrome giấu địa chỉ của tab ngoài quyền)` };
  }
  let host = "";
  try { host = new URL(tab.url).hostname; } catch { return { dung: false, vi: `địa chỉ tab đọc không ra: ${tab.url}` }; }
  if (host !== mien) return { dung: false, vi: `tab đang xem là ${host}, không phải ${mien}` };
  return { dung: true, vi: "" };
}
