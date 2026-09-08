/* bang-ket-qua.mjs — đọc BẢNG kết quả giao dịch phái sinh của HNX thành hàng và cột.
 *
 * Vì sao có file này: `nguon-hnx.mjs` lấy về một khối HTML thô và cất nguyên vẹn. Thô là đúng
 * cho việc lưu trữ — nó là bằng chứng, không diễn giải. Nhưng thứ Đức dùng để phân tích là
 * BẢNG SỐ, và trước 08/09 khối thô đó nằm kẹt trong hộp cát của Bridge, không vào được cơ sở
 * dữ liệu trên Drive.
 *
 * MỌI TÊN CỘT Ở ĐÂY LÀ ĐỌC RA TỪ CHÍNH TRANG, không gõ tay. Cấu trúc đo ngày 2026-09-08:
 *   · `<thead>` có ĐÚNG 2 hàng.
 *   · Hàng 0: 19 ô — 14 ô `rowspan=2` (cột đơn) + 5 ô `colspan=2` (nhóm).
 *   · Hàng 1: 10 ô — KLGD/GTGD cho 5 nhóm đó.
 *   · Tổng cột = 14 + 5×2 = 24, khớp 192 ô dữ liệu ÷ 8 hàng.
 *
 * Ghép tên nhóm với tên con thành "Nhóm — Con", nên một cột `KLGD` không bao giờ đứng trơ ra
 * mà không biết nó là KLGD của cái gì. Năm cột `KLGD` cạnh nhau mà cùng tên là một bảng không
 * dùng được.
 */

const O = /<t([dh])([^>]*)>([\s\S]*?)<\/t\1>/g;
const HANG = /<tr[^>]*>([\s\S]*?)<\/tr>/g;

export class LoiBang extends Error {
  constructor(ma, thongDiep, thuoc = {}) {
    super(thongDiep);
    this.name = "LoiBang";
    this.ma = ma;
    Object.assign(this, thuoc);
  }
}

/* Gỡ thẻ, đổi thực thể, gộp khoảng trắng. `&#244;` là cách hnx.vn mã hoá chữ có dấu — bỏ qua
 * nó thì mọi tên cột tiếng Việt biến thành rác. */
function chu(html) {
  return String(html)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function soNguyen(thuoc, ten) {
  const khop = String(thuoc).match(new RegExp(ten + '\\s*=\\s*"?(\\d+)', "i"));
  return khop ? Number(khop[1]) : 1;
}

/* MỘT Ô CHỈ CÓ ẢNH VẪN LÀ DỮ LIỆU.
 *
 * Đo 08/09, và nó suýt thành một lỗi giao hàng: cột đầu của bảng HNX không chứa chữ nào — nó
 * chứa `<img src="/Content/img/up.png">` hoặc `down6.png`, tức **dấu tăng/giảm giá**. Gỡ thẻ
 * rồi lấy phần chữ thì ô đó ra RỖNG, và cả một cột dữ liệu biến mất trong im lặng.
 *
 * Đếm trên 7 ngày: `up.png` 33 lần, `down6.png` 23 lần, tổng 56 = 7 × 8 hàng. Mỗi hàng đều
 * có một cái. Không phải trang trí.
 *
 * Lấy TÊN TỆP ẢNH làm giá trị, không dịch sang "tăng"/"giảm": dịch là diễn giải, và một bảng
 * lưu trữ nên giữ thứ trang đã nói. Làm chung cho MỌI ô chứ không riêng cột đầu — cột nào sau
 * này mọc thêm ảnh cũng không bị nuốt. */
function oCuaHang(html) {
  const ra = [];
  for (const k of String(html).matchAll(O)) {
    let noiDung = chu(k[3]);
    if (noiDung === "") {
      const anh = [...String(k[3]).matchAll(/<img[^>]*src="([^"]*)"/gi)]
        .map((m) => m[1].split("/").pop().replace(/\.[a-z0-9]+$/i, ""))
        .filter(Boolean);
      if (anh.length) noiDung = anh.join(" ");
    }
    ra.push({ chu: noiDung, colspan: soNguyen(k[2], "colspan"), rowspan: soNguyen(k[2], "rowspan") });
  }
  return ra;
}

/* ---- Tên cột --------------------------------------------------------------
 * Đọc từ `<thead>`. KHÔNG có bản dự phòng gõ tay: nếu trang đổi cấu trúc thì phải ĐỎ, chứ
 * không được lặng lẽ dùng một bản khai cũ rồi gán số vào nhầm cột — đó là cách một bảng sai
 * trông y hệt một bảng đúng. */
export function tenCot(html) {
  const van = String(html);
  const dau = van.indexOf("<thead");
  const cuoi = van.indexOf("</thead>");
  if (dau < 0 || cuoi < 0 || cuoi < dau) {
    throw new LoiBang("KHONG_CO_THEAD", "Không tìm thấy <thead> — trang đã đổi cấu trúc.");
  }
  const hang = [...van.slice(dau, cuoi).matchAll(HANG)].map((m) => oCuaHang(m[1]));
  if (hang.length === 0) throw new LoiBang("THEAD_RONG", "<thead> không có hàng nào.");

  const tren = hang[0];
  const duoi = hang[1] || [];
  const ten = [];
  let iDuoi = 0;
  for (const o of tren) {
    if (o.colspan > 1) {
      for (let i = 0; i < o.colspan; i += 1) {
        const con = duoi[iDuoi];
        iDuoi += 1;
        if (!con) throw new LoiBang("THIEU_TIEU_DE_CON", `Nhóm "${o.chu}" khai colspan=${o.colspan} nhưng hàng dưới hết ô.`);
        ten.push(o.chu ? `${o.chu} — ${con.chu}` : con.chu);
      }
    } else {
      ten.push(o.chu);
    }
  }
  if (iDuoi !== duoi.length) {
    throw new LoiBang("THUA_TIEU_DE_CON",
      `Hàng tiêu đề dưới còn ${duoi.length - iDuoi} ô không thuộc nhóm nào — cấu trúc đã đổi.`);
  }
  /* Ô đầu KHÔNG có tên trên trang, và nó KHÔNG phải số thứ tự — đo 08/09 thấy nó chứa dấu
   * tăng/giảm dạng ảnh. Đặt tên cho nó chứ đừng để rỗng (một cột không tên là một cột không
   * ai tra được), nhưng phải nói rõ đây là tên DO TA ĐẶT: HNX không đặt tên cột này. */
  if (ten[0] === "") ten[0] = "Hướng (tên ảnh HNX, ta tự đặt tên cột)";
  return ten;
}

/* ---- Hàng dữ liệu ---------------------------------------------------------
 * SỐ CỘT PHẢI KHỚP. Một hàng lệch cột nghĩa là mọi giá trị sau chỗ lệch đều nằm sai tên — và
 * một bảng sai kiểu đó vẫn mở được, vẫn có số, nên không ai phát hiện. Thà ĐỎ. */
export function docBang(html) {
  const ten = tenCot(html);
  const van = String(html);
  const dau = van.indexOf("<tbody");
  if (dau < 0) throw new LoiBang("KHONG_CO_TBODY", "Không tìm thấy <tbody> — trang đã đổi cấu trúc.");
  const than = van.slice(dau);

  const hang = [];
  for (const m of than.matchAll(HANG)) {
    const o = oCuaHang(m[1]);
    if (o.length === 0) continue;
    if (o.length !== ten.length) {
      throw new LoiBang("LECH_COT",
        `Một hàng có ${o.length} ô nhưng bảng khai ${ten.length} cột. Không ghi bảng lệch cột.`,
        { so_o: o.length, so_cot: ten.length });
    }
    hang.push(o.map((x) => x.chu));
  }
  if (hang.length === 0) throw new LoiBang("KHONG_CO_HANG", "<tbody> không có hàng dữ liệu nào.");
  return { cot: ten, hang };
}

/* ---- CSV ------------------------------------------------------------------
 * Bọc MỌI ô, không chỉ ô có dấu phẩy. Dữ liệu HNX dùng dấu phẩy làm phần thập phân
 * (`1.861,7`), nên một bộ bọc "chỉ khi cần" sẽ để nguyên rất nhiều ô rồi vỡ ở đúng những ô
 * quan trọng nhất. Bọc hết thì không có ca biên nào để quên.
 *
 * BOM UTF-8 ở đầu: Excel trên Windows mở CSV không BOM bằng bảng mã hệ thống, và mọi tên cột
 * tiếng Việt thành rác. Đức mở file này bằng Excel, nên thiếu BOM là file coi như hỏng. */
export function raCsv({ cot, hang }, { bom = true } = {}) {
  const o = (v) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
  const dong = [cot.map(o).join(","), ...hang.map((h) => h.map(o).join(","))];
  return (bom ? "﻿" : "") + dong.join("\r\n") + "\r\n";
}
