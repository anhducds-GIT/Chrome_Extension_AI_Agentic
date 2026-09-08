/* luoc-do-master.mjs — đổi bảng HNX sang ĐÚNG lược đồ file master của Đức.
 *
 * Lược đồ này KHÔNG do tôi nghĩ ra. Nó đọc ra từ chính file Đức đang dùng, ngày 2026-09-08:
 * `HNX_PS_Ket_qua_giao_dich_AUG2026_MASTER.csv.xlsx` — 25 cột, tên tiếng Anh snake_case,
 * số đã chuẩn hoá kiểu Anh (`1952.8`, không phải `1.952,8`).
 *
 * BA CHỖ LƯỢC ĐỒ CỦA ĐỨC KHÁC BẢNG GỐC — đọc kỹ, vì mỗi chỗ là một cơ hội gán nhầm cột:
 *
 *   ⑴ Thêm `trade_date` ở đầu. Ngày KHÔNG nằm trong bảng — nó là tham số của lượt gọi. Nên
 *      hàm dưới BẮT BUỘC nhận ngày; không có mặc định, không đoán từ hệ thống.
 *   ⑵ BỎ cột đầu của HNX (dấu tăng/giảm dạng ảnh). Đức bỏ nó, và bỏ là hợp lý: dấu đó đã nằm
 *      trong dấu của `change_points`. Ta theo Đức, không tự thêm cột.
 *   ⑶ TÁCH cột cuối `"Thay đổi giá (điểm /%)"` làm HAI: `change_points` và `change_pct`.
 *      Trên trang nó là một ô, ngăn bởi dấu `/`.
 *
 * 24 cột HNX = 1 bỏ + 22 giữ + 1 tách đôi → 24 cột dữ liệu, cộng `trade_date` = 25. Khớp.
 */

export const COT_MASTER = Object.freeze([
  "trade_date", "isin", "product", "classification", "maturity",
  "price_high", "price_low", "price_open", "price_close", "price_ceiling", "price_floor",
  "volume_ato", "value_ato",
  "volume_continuous", "value_continuous",
  "volume_atc", "value_atc",
  "volume_block", "value_block",
  "volume_total", "value_total",
  "open_interest", "settlement_price",
  "change_points", "change_pct"
]);

export class LoiLuocDo extends Error {
  constructor(ma, thongDiep, thuoc = {}) {
    super(thongDiep);
    this.name = "LoiLuocDo";
    this.ma = ma;
    Object.assign(this, thuoc);
  }
}

/* Số kiểu Việt sang số kiểu Anh: `1.952,8` → `1952.8`. Dấu chấm là phân cách nghìn, dấu phẩy
 * là phần thập phân — NGƯỢC hẳn với cách đọc của Anh/Mỹ. Đọc nhầm một lần là sai gấp 1000 lần,
 * và con số vẫn trông hợp lý nên không ai phát hiện.
 *
 * Ô rỗng ở lại RỖNG, không thành 0: HNX để trống khi không có giao dịch, mà 0 và "không có
 * giao dịch" là hai chuyện khác nhau khi tính trung bình. */
export function so(chuoi) {
  const v = String(chuoi ?? "").trim();
  if (v === "" || v === "-") return "";
  const sach = v.replace(/\s/g, "").replace(/\./g, "").replace(/,/g, ".");
  if (!/^-?\d+(\.\d+)?$/.test(sach)) {
    throw new LoiLuocDo("SO_LA", `Không đọc được số từ '${chuoi}'.`, { tho: chuoi });
  }
  return sach;
}

/* `"6,6 / 0,36"` → điểm 6.6, phần trăm 0.36. Trên trang hai số này nằm CHUNG một ô.
 * Không có dấu `/` thì coi cả ô là điểm và bỏ trống phần trăm — thà thiếu một cột còn hơn
 * đoán bừa rồi ghi một tỉ lệ không ai kiểm được. */
export function tachThayDoi(chuoi) {
  const v = String(chuoi ?? "").trim();
  if (v === "") return { diem: "", phanTram: "" };
  const phan = v.split("/");
  if (phan.length === 1) return { diem: so(phan[0]), phanTram: "" };
  if (phan.length !== 2) {
    throw new LoiLuocDo("THAY_DOI_LA", `Ô thay đổi giá có ${phan.length} phần: '${chuoi}'.`);
  }
  return { diem: so(phan[0]), phanTram: so(phan[1]) };
}

/* ---- Đổi một bảng HNX thành các hàng của master --------------------------
 * `ngay` là chuỗi `YYYY-MM-DD`, bắt buộc. Ghi ngày dạng ISO chứ không dạng số sê-ri của Excel:
 * `46246` không nói gì cho người đọc, còn `2026-08-12` thì Excel vẫn nhận ra là ngày. */
export function hangMaster(bang, ngay) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(ngay))) {
    throw new LoiLuocDo("NGAY_SAI", `Ngày phải là YYYY-MM-DD, nhận '${ngay}'.`);
  }
  if (!bang || !Array.isArray(bang.hang) || !Array.isArray(bang.cot)) {
    throw new LoiLuocDo("BANG_SAI", "Cần một bảng đã đọc từ `docBang`.");
  }
  /* SỐ CỘT PHẢI ĐÚNG 24. Bảng ít hoặc nhiều hơn nghĩa là trang đã đổi, và ánh xạ theo VỊ TRÍ
   * dưới đây sẽ gán mọi giá trị vào sai tên. Thà đỏ — một bảng lệch cột vẫn mở được. */
  if (bang.cot.length !== 24) {
    throw new LoiLuocDo("SO_COT_LA",
      `Bảng có ${bang.cot.length} cột, lược đồ master dựng trên đúng 24. Trang đã đổi cấu trúc.`,
      { so_cot: bang.cot.length });
  }

  return bang.hang.map((h, i) => {
    let td;
    try {
      td = tachThayDoi(h[23]);
    } catch (loi) {
      throw new LoiLuocDo(loi.ma, `Hàng ${i + 1} (${h[1] || "?"}): ${loi.message}`);
    }
    const n = (j) => {
      try { return so(h[j]); }
      catch (loi) { throw new LoiLuocDo(loi.ma, `Hàng ${i + 1} (${h[1] || "?"}), cột "${bang.cot[j]}": ${loi.message}`); }
    };
    return [
      ngay,
      String(h[1] ?? "").trim(),   // isin — giữ nguyên chuỗi, KHÔNG đổi sang số
      String(h[2] ?? "").trim(),   // product
      String(h[3] ?? "").trim(),   // classification
      String(h[4] ?? "").trim(),   // maturity — "2609" là mã tháng đáo hạn, không phải số đo
      n(5), n(6), n(7), n(8), n(9), n(10),
      n(11), n(12), n(13), n(14), n(15), n(16), n(17), n(18), n(19), n(20),
      n(21), n(22),
      td.diem, td.phanTram
    ];
  });
}
