/* master.mjs — MỘT file duy nhất chứa toàn bộ kết quả giao dịch. Chỉ thêm, không viết lại.
 *
 * Đức chốt 08/09: *"giữ 1 file duy nhất, ko làm thành nhiều file. Định dạng excel để GPT & CC
 * cùng thao tác được."* Và: *"nếu bạn có file & format tốt hơn thì nên làm theo bạn."*
 *
 * ─── VÌ SAO CSV CHỨ KHÔNG PHẢI .XLSX ────────────────────────────────────────────────────────
 * Điều kiện Đức đặt ra là **hai công cụ cùng thao tác được**, không phải đuôi tệp phải là xlsx.
 *   · CSV: cả GPT lẫn Claude Code đọc và ghi thẳng. Excel mở bình thường.
 *   · XLSX: là một tệp ZIP chứa XML. Mỗi lượt ghi phải bung ZIP, sửa XML, rồi tự cuộn lại ZIP —
 *     repo này không có thư viện nào làm việc đó (`package.json` không có dependency nào), nên
 *     sẽ phải tự viết. Mỗi lượt ghi bằng tay như thế là một cơ hội làm hỏng tệp dữ liệu thật.
 * Một định dạng mà công cụ phải đánh vật để mở thì không phải định dạng để hai bên cùng thao tác.
 *
 * ─── TỆP CHÍNH LÀ TRẠNG THÁI ────────────────────────────────────────────────────────────────
 * Không có sổ tiến độ riêng. Ngày nào đã có trong tệp thì không lấy lại. Cùng một quyết định
 * với `vong-lay.mjs` và `tai-pdf.mjs`, và cùng một lý do: một cuốn sổ riêng thì lệch được với
 * tệp, còn tệp thì không lệch được với chính nó.
 *
 * ─── CHỈ THÊM, KHÔNG BAO GIỜ SỬA DÒNG CŨ ────────────────────────────────────────────────────
 * Đây là dữ liệu Đức đã gom từ 07/2026. Ghi đè là việc phải hỏi, không phải việc một script tự
 * quyết. Nên: đọc → lọc ngày đã có → nối vào cuối. Tiêu đề lệch thì DỪNG, không tự sửa.
 */
import fs from "node:fs";
import { COT_MASTER } from "./luoc-do-master.mjs";

export class LoiMaster extends Error {
  constructor(ma, thongDiep, thuoc = {}) {
    super(thongDiep);
    this.name = "LoiMaster";
    this.ma = ma;
    Object.assign(this, thuoc);
  }
}

const BOM = "﻿";
const XUONG_DONG = "\r\n";

/* Đọc một dòng CSV có bọc nháy. Tự viết vì cần đúng một luật: `""` bên trong ô là một dấu
 * nháy. Kéo một thư viện về cho 20 dòng này là đổi một phụ thuộc lấy một tiện nghi. */
function docDong(dong) {
  const o = [];
  let cur = "";
  let trongNhay = false;
  for (let i = 0; i < dong.length; i += 1) {
    const c = dong[i];
    if (trongNhay) {
      if (c === '"') {
        if (dong[i + 1] === '"') { cur += '"'; i += 1; } else trongNhay = false;
      } else cur += c;
    } else if (c === '"') trongNhay = true;
    else if (c === ",") { o.push(cur); cur = ""; }
    else cur += c;
  }
  o.push(cur);
  return o;
}

function raDong(o) {
  return o.map((v) => '"' + String(v ?? "").replace(/"/g, '""') + '"').join(",");
}

/* Trạng thái hiện tại của tệp master. Tệp chưa có = chưa có ngày nào, KHÁC hẳn tệp hỏng. */
export function docMaster(duong) {
  if (!fs.existsSync(duong)) return { coTep: false, ngay: new Set(), soHang: 0 };

  const van = fs.readFileSync(duong, "utf8").replace(/^﻿/, "");
  const dong = van.split(/\r?\n/).filter((d) => d.trim() !== "");
  if (dong.length === 0) return { coTep: true, ngay: new Set(), soHang: 0 };

  const tieuDe = docDong(dong[0]);
  if (tieuDe.length !== COT_MASTER.length || tieuDe.some((c, i) => c !== COT_MASTER[i])) {
    throw new LoiMaster("TIEU_DE_LECH",
      `Tiêu đề của ${duong} không khớp lược đồ master. KHÔNG tự sửa — đây là dữ liệu thật.\n` +
      `  tệp có : ${tieuDe.length} cột, bắt đầu bằng ${JSON.stringify(tieuDe.slice(0, 3))}\n` +
      `  cần    : ${COT_MASTER.length} cột, bắt đầu bằng ${JSON.stringify(COT_MASTER.slice(0, 3))}`,
      { so_cot_tep: tieuDe.length, so_cot_can: COT_MASTER.length });
  }

  const ngay = new Set();
  for (let i = 1; i < dong.length; i += 1) {
    const o = docDong(dong[i]);
    if (o.length !== COT_MASTER.length) {
      throw new LoiMaster("HANG_LECH",
        `Dòng ${i + 1} của ${duong} có ${o.length} ô, cần ${COT_MASTER.length}. Tệp đã hỏng — dừng.`,
        { dong: i + 1 });
    }
    if (o[0]) ngay.add(o[0]);
  }
  return { coTep: true, ngay, soHang: dong.length - 1 };
}

/* Nối các hàng vào cuối. Ghi qua tệp tạm rồi đổi tên: chết giữa lượt ghi để lại một tệp master
 * cụt nghĩa là mất cả dữ liệu cũ, không chỉ mất phần đang thêm. */
export function themHang(duong, hangMoi) {
  if (!Array.isArray(hangMoi) || hangMoi.length === 0) return { them: 0 };
  for (const h of hangMoi) {
    if (h.length !== COT_MASTER.length) {
      throw new LoiMaster("HANG_SAI_CO",
        `Một hàng có ${h.length} ô, lược đồ khai ${COT_MASTER.length}. Không ghi.`);
    }
  }
  const trangThai = docMaster(duong);
  const phan = [];
  if (!trangThai.coTep || trangThai.soHang === 0) {
    const cu = trangThai.coTep ? fs.readFileSync(duong, "utf8") : "";
    if (!cu.trim()) phan.push(BOM + raDong(COT_MASTER));
  }
  for (const h of hangMoi) phan.push(raDong(h));

  const tam = duong + ".dang-ghi";
  const cu = trangThai.coTep && trangThai.soHang > 0 ? fs.readFileSync(duong, "utf8").replace(/\r?\n$/, "") : "";
  const noiDung = (cu ? cu + XUONG_DONG : "") + phan.join(XUONG_DONG) + XUONG_DONG;
  fs.writeFileSync(tam, noiDung, "utf8");
  fs.renameSync(tam, duong);
  return { them: hangMoi.length };
}
