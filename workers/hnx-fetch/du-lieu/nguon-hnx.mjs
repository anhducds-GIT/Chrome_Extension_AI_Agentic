/* nguon-hnx.mjs — HIỂU BIẾT VỀ TRANG. Mọi thứ riêng của `hnx.vn` chỉ được nằm trong file này.
 *
 * Đây là tầng **adapter** của [ADR-0009](../../../docs/adr/0009-scouter-thay-observer-cua-tuong-tac.md)
 * mục ⑵: mỗi URL một cái, chứa địa chỉ · tham số · dấu hiệu "xong" · lỗi riêng của trang.
 * `vong-lay.mjs` bên cạnh thì mù về tất cả những thứ đó, cố ý — đó là điều kiện để nó lên seed.
 *
 * ══ MỌI CON SỐ DƯỚI ĐÂY ĐỀU ĐO NGÀY 07/09/2026, KHÔNG SUY ĐOÁN ══
 *
 * Cách đo: tải chính trang `/phai-sinh/ket-qua-giao-dich.html` rồi đọc khối `$.ajax` trong đó.
 * KHÔNG đoán tên tham số — luật vàng 1 của repo, và lần trước số đo bị mất chính vì không ai
 * ghi nó vào file. Nay nó ở đây.
 *
 * ⑴ BẢY THAM SỐ, đọc thẳng từ mã trang:
 *      p_date           ← ô ngày, dạng dd/MM/yyyy
 *      p_keysearch      ← "-1|0|"        (mã hợp đồng = tất cả)
 *      p_orderby        ← "MAHOPDONG"    (giá trị mặc định của input ẩn #colSorted)
 *      p_ordertype      ← "ASC"          (mặc định của #SortType)
 *      p_currentpage    ← 1
 *      p_type_sanpham   ← "HDTLCSCP" hoặc "HDTLTPCP"  (hai option của #cboLoaiSanPham)
 *      p_record_on_page ← 20
 *
 * ⑵ TRẢ VỀ: JSON `{ SumTable, Content, DataDropSearch }`. `Content` là một mảnh bảng HTML.
 *
 * ⑶ NGÀY CÓ HÀNG ↔ NGÀY KHÔNG, đo trên bốn ngày liền:
 *      03/09 · 04/09 (thứ Năm, thứ Sáu):  ~46 KB · <tr>=10 · <td>=192
 *      05/09 · 06/09 (thứ Bảy, Chủ nhật):  8.791 B · <tr>=2 · <td>=0
 *    Ngày nghỉ vẫn trả **200 OK và JSON hợp lệ** — khác nhau ở chỗ KHÔNG CÓ Ô DỮ LIỆU NÀO.
 *    Nên `<td>` = 0 là dấu hiệu "trống", và nó dứt khoát: 192 với 0, không có vùng xám.
 *
 * ⑷ **Con số 231 KB trong `S-10` là SAI.** Đo lại: ~46 KB một ngày. Ghi ra vì nó đổi kết luận —
 *    231 KB nghe như sắp chạm trần 512 KiB của `scout.fetch`, còn 46 KB thì rộng gấp mười.
 *
 * ⑸ **Điều hướng của trang dựng bằng JavaScript.** Một bộ tải tĩnh không thấy được menu —
 *    `cau-truc-website.html` trả về 16 liên kết và không có cái nào dẫn tới trang kết quả. Nhưng
 *    ENDPOINT thì là một lượt POST trần. Hai chuyện khác nhau: *tìm ra* trang cần Chrome, *lấy*
 *    dữ liệu thì không.
 *
 * ⑹ **Máy chủ gửi THIẾU mắt xích chứng chỉ** (chỉ có leaf, không kèm trung gian GlobalSign).
 *    Chrome tự đi lấy qua AIA nên người dùng không thấy gì; Node thì ném
 *    `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. Đây là một lý do nữa để pilot chạy qua Scouter chứ không
 *    qua một script Node — và **đừng bao giờ vá nó bằng cách tắt kiểm chứng chỉ**.
 */

import { LoiNguon } from "./vong-lay.mjs";

const DIA_CHI = "https://hnx.vn/ModulePhaiSinh/KetQuaGiaoDichV2/ListSearch_Datas";

export const LOAI_SAN_PHAM = Object.freeze({
  CHI_SO_CO_PHIEU: "HDTLCSCP",
  TRAI_PHIEU_CHINH_PHU: "HDTLTPCP"
});

/* `yyyy-mm-dd` (thứ tự này sắp xếp được, nên dùng cho TÊN FILE) → `dd/MM/yyyy` (trang đòi). */
export function ngayTheoTrang(ngay) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ngay));
  if (!m) throw new LoiNguon("NGAY_SAI_DANG", `Ngày phải là yyyy-mm-dd, nhận được '${ngay}'.`, { thuLai: false });
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export function createNguonHnx({ loaiSanPham = LOAI_SAN_PHAM.CHI_SO_CO_PHIEU } = {}) {
  return {
    ten: `hnx-phai-sinh-${loaiSanPham}`,

    /* Tên file dùng `yyyy-mm-dd` chứ không phải dạng của trang: thư mục tự sắp đúng thứ tự thời
     * gian, và một cái lỗ giữa tuần nhìn ra ngay. `dd/MM/yyyy` thì 01/09 nằm cạnh 01/10. */
    tenFile: (ngay) => `${ngay}-${loaiSanPham}.json`,

    yeuCau: (ngay) => ({
      url: DIA_CHI,
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        /* Trang tự gửi header này. Giữ nguyên vì nó là thứ phân biệt lượt gọi nền với lượt tải
         * trang, và một số khung sinh ra hai câu trả lời khác nhau cho hai thứ đó. */
        "x-requested-with": "XMLHttpRequest"
      },
      body: new URLSearchParams({
        p_date: ngayTheoTrang(ngay),
        p_keysearch: "-1|0|",
        p_orderby: "MAHOPDONG",
        p_ordertype: "ASC",
        p_currentpage: "1",
        p_type_sanpham: loaiSanPham,
        p_record_on_page: "20"
      }).toString(),
      /* KHÔNG gửi cookie. Dữ liệu này công khai, và gửi kèm phiên đăng nhập của Đức sang một
       * trang bên ngoài là thứ không bao giờ nên làm mặc định. */
      with_credentials: false
    }),

    /* ---- CHỐT DUY NHẤT phân biệt "dữ liệu thật" với "một trang khác" ------
     * Cái bẫy đã ghi trong `S-10`: sai tham số thì trang trả **200 OK kèm một trang HTML**, và
     * `ok: true` của HTTP không chứng minh gì cả. Ba cửa, theo đúng thứ tự rẻ→đắt. */
    kiemTra(phanHoi) {
      /* ① Mã HTTP. 5xx là phía họ đang hỏng → ĐÁNG thử lại. 4xx là ta gọi sai → không. */
      const ma = Number(phanHoi?.status);
      if (ma >= 500) {
        throw new LoiNguon("MAY_CHU_HONG", `Trang trả ${ma}.`, { thuLai: true, chiTiet: ma });
      }
      if (ma !== 200) {
        throw new LoiNguon("MA_LA", `Trang trả ${ma}, không phải 200.`, { thuLai: false, chiTiet: ma });
      }

      /* ② Có phải JSON không. Đây là chỗ cái bẫy bị bắt: một trang HTML 43KB không parse được. */
      let goi;
      try {
        goi = JSON.parse(String(phanHoi?.body ?? ""));
      } catch (_error) {
        throw new LoiNguon("HINH_DANG_SAI",
          "200 OK nhưng thân không phải JSON — nhiều khả năng sai tên tham số, và nó sẽ sai với MỌI ngày.",
          { thuLai: false, chiTiet: String(phanHoi?.body ?? "").slice(0, 120) });
      }

      /* ③ Đúng JSON nhưng của ai? Một JSON lạ vẫn parse được. `Content` là khoá bắt buộc. */
      if (goi === null || typeof goi !== "object" || !Object.hasOwn(goi, "Content")) {
        throw new LoiNguon("HINH_DANG_SAI", "JSON hợp lệ nhưng không có khoá 'Content'.", { thuLai: false });
      }

      /* Ngày nghỉ: trả lời ĐÚNG, chỉ là không có ô dữ liệu nào. Đo được 192 với 0 — dứt khoát. */
      const noiDung = String(goi.Content ?? "");
      if ((noiDung.match(/<td/gi) || []).length === 0) return { trong: true };

      /* Ghi NGUYÊN VĂN phong bì trang trả về, không bóc lấy phần mình thích. Bóc bây giờ là
       * quyết định hộ người đọc sau ba tháng nữa rằng họ không cần phần còn lại. */
      return { noiDung: String(phanHoi.body) };
    }
  };
}
