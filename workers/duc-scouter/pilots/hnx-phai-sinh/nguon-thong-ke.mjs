/* nguon-thong-ke.mjs — HỢP ĐỒNG VỚI TRANG THỐNG KÊ phái sinh của hnx.vn.
 *
 * Khác `nguon-hnx.mjs`: file kia lấy BẢNG SỐ của một ngày; file này lấy DANH MỤC các báo cáo
 * PDF mà HNX công bố. Trang thống kê không cho bảng số — nó cho file PDF.
 *
 * MỌI GIÁ TRỊ Ở ĐÂY LÀ ĐO ĐƯỢC ngày 2026-09-08, không phải đoán. Cách đo: đọc chính khối
 * `$.ajax` trong mã nguồn trang `https://hnx.vn/vi-vn/phai-sinh/thong-ke.html`.
 *
 *   POST /ModulePhaiSinh/ThongKeV2/GetDataByTypeIndex
 *   p_key_search   "mm/yyyy" khi p_report_type = D · "yyyy" khi = M · "" khi = Y
 *   p_report_type  D = theo ngày · M = theo tháng · Y = theo năm
 *
 * Trả về HTML (không phải JSON), mỗi dòng một ngày, mỗi ô một liên kết PDF.
 *
 * ĐO ĐƯỢC, ghi lại để lượt sau khỏi đo lại:
 *   · 07/2026 → 92 file · 08/2026 → 80 file · 09/2026 (tới 07/09) → 12 file
 *   · M 2026  → 32 file (báo cáo tháng)
 *   · Y ""    → "Không tìm thấy dữ liệu". KIỂU NÀY CHƯA DÙNG ĐƯỢC, đừng gọi.
 *   · Ngày HNX không công bố gì (31/08 · 01/09 · 02/09) thì đơn giản là KHÔNG có dòng —
 *     không cần bảng ngày lễ, trang tự nói.
 */

export const DIA_CHI = "https://hnx.vn/ModulePhaiSinh/ThongKeV2/GetDataByTypeIndex";

/* Kiểu báo cáo. `Y` cố ý KHÔNG có mặt: đo 08/09 thì nó trả "Không tìm thấy dữ liệu", và một
 * hằng số cho một thứ không chạy chỉ để lượt sau mất công phát hiện lại. */
export const KIEU = Object.freeze({ NGAY: "D", THANG: "M" });

const KHOA_NGAY = /^(0[1-9]|1[0-2])\/(20\d{2})$/;
const KHOA_THANG = /^20\d{2}$/;

export class LoiThongKe extends Error {
  constructor(ma, thongDiep, thuoc = {}) {
    super(thongDiep);
    this.name = "LoiThongKe";
    this.ma = ma;
    Object.assign(this, thuoc);
  }
}

export function yeuCau(kieu, khoa) {
  if (kieu !== KIEU.NGAY && kieu !== KIEU.THANG) {
    throw new LoiThongKe("KIEU_SAI", `Kiểu phải là "D" hoặc "M", nhận được '${kieu}'.`, { thuLai: false });
  }
  const dung = kieu === KIEU.NGAY ? KHOA_NGAY.test(khoa) : KHOA_THANG.test(khoa);
  if (!dung) {
    throw new LoiThongKe("KHOA_SAI",
      `Kiểu ${kieu} cần khoá dạng ${kieu === KIEU.NGAY ? "mm/yyyy" : "yyyy"}, nhận được '${khoa}'.`,
      { thuLai: false });
  }
  return {
    url: DIA_CHI,
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      "x-requested-with": "XMLHttpRequest"
    },
    body: new URLSearchParams({ p_key_search: khoa, p_report_type: kieu }).toString(),
    with_credentials: false
  };
}

/* Rút danh sách liên kết PDF. Chỉ nhận đúng máy chủ tệp của HNX và đúng dạng tên —
 * một trang lỗi vẫn có thể chứa thẻ `a`, nên lọc theo HÌNH DẠNG chứ không đếm thẻ. */
const LIEN_KET = /href="(https:\/\/owa\.hnx\.vn\/[^"]*?\/(\d{6,8})_PS_([A-Za-z0-9_]+)\.pdf)"/g;

export function docDanhMuc(html) {
  const van = String(html ?? "");
  if (van.includes("Không tìm thấy dữ liệu") || van.includes("Kh&#244;ng t&#236;m thấy dữ liệu")) {
    return { trong: true, muc: [] };
  }
  const muc = [];
  const daThay = new Set();
  for (const khop of van.matchAll(LIEN_KET)) {
    const [, url, ky, loai] = khop;
    const ten = `${ky}_PS_${loai}.pdf`;
    if (daThay.has(ten)) continue;   // trang lặp lại cùng một liên kết thì chỉ tính một
    daThay.add(ten);
    muc.push({ url, ten, ky, loai });
  }
  /* Danh mục RỖNG mà trang KHÔNG nói "không tìm thấy" là chuyện lạ — có thể trang đổi hình
   * dạng. Nói ĐỎ, đừng trả mảng rỗng: một mảng rỗng im lặng sẽ được hiểu thành "đã đủ rồi". */
  if (muc.length === 0) {
    throw new LoiThongKe("HINH_DANG_SAI",
      "Trang trả về nhưng không có liên kết PDF nào, và cũng không nói 'không tìm thấy dữ liệu'. " +
      "Có thể HNX đổi cấu trúc trang — đo lại trước khi tin kết quả.",
      { thuLai: false, bytes: van.length });
  }
  return { trong: false, muc };
}

/* Một PDF ĐẦY ĐỦ hay không. Dùng trước khi ghi ra đĩa, vì `file trên đĩa CHÍNH LÀ trạng thái`:
 * ghi một file cụt ra thư mục dữ liệu là dạy cho mọi lượt sau rằng ngày đó "đã có". */
export function laPdfDayDu(bytes) {
  if (!bytes || bytes.length < 1024) return false;
  const dau = Buffer.from(bytes.subarray(0, 5)).toString("latin1");
  if (dau !== "%PDF-") return false;
  const duoi = Buffer.from(bytes.subarray(Math.max(0, bytes.length - 2048))).toString("latin1");
  return duoi.includes("%%EOF");
}
