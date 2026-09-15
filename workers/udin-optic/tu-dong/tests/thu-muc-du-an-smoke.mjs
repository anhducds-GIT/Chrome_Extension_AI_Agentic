/* thu-muc-du-an-smoke.mjs — phép ghim của bộ kiểm tên project (`U4`).
 *
 * Đây là một BIÊN, không phải một tiện nghi: chuỗi đi thẳng vào một đường dẫn ghi đĩa, phía
 * sau máy chủ Bridge. Nên phép ghim này hỏi đúng hai câu, và hỏi riêng:
 *   ⑴ tên xấu có bị TỪ CHỐI không (không phải "có bị dọn không"),
 *   ⑵ lời từ chối có đọc được không — một `Error: invalid` thì Đức không sửa được gì.
 */

import assert from "node:assert/strict";
import { kiemTenDuAn, duongThuMuc, duongDayDu, nhanLuotChay, THU_MUC_GOC, DAI_TOI_DA } from "../thu-muc-du-an.mjs";

/* ---- Tên DÙNG ĐƯỢC phải qua NGUYÊN VĂN, không bị sửa một ký tự nào ------- */
for (const tot of ["xe-dien-2026", "A", "bao_cao.v2", "job-007", "a".repeat(DAI_TOI_DA)]) {
  assert.equal(kiemTenDuAn(tot), tot, `'${tot}' phải qua NGUYÊN VĂN`);
}

/* ---- Tên XẤU phải NÉM, và mỗi loại một câu riêng ------------------------- */
const XAU = [
  ["../ra-ngoai", /\.\./, "đi ra ngoài vùng ghi"],
  ["..", /\.\./, "chỉ hai dấu chấm cũng là đường đi ra"],
  ["co/gach", /gạch chéo/, "gạch chéo xuôi"],
  ["co\\gach", /gạch chéo/, "gạch chéo ngược — Windows"],
  ["Dự án A", /dấu cách|'ự'|chữ không dấu/, "dấu tiếng Việt và dấu cách"],
  ["du an", /dấu cách/, "dấu cách giữa tên"],
  ["CON", /Windows/, "tên dành riêng của Windows"],
  ["nul", /Windows/, "tên dành riêng, viết thường cũng cấm"],
  ["COM1", /Windows/, "cổng COM"],
  ["ten.", /dấu chấm/, "Windows cắt lặng dấu chấm cuối"],
  [" dau-cach", /dấu cách thừa/, "khoảng trắng đầu"],
  ["dau-cach ", /dấu cách thừa/, "khoảng trắng cuối"],
  ["", /rỗng/, "rỗng"],
  [".an", /bắt đầu bằng/, "tên ẩn trên Unix"],
  ["-co-dau-gach", /bắt đầu bằng/, "gạch đầu dòng dễ bị đọc thành tham số dòng lệnh"],
  ["a".repeat(DAI_TOI_DA + 1), /tối đa/, "quá dài"],
  [null, /phải là chữ/, "không phải chuỗi"],
  [42, /phải là chữ/, "số"]
];
const cau = new Set();
for (const [ten, mong, vi] of XAU) {
  let loi = null;
  try { kiemTenDuAn(ten); } catch (e) { loi = e; }
  assert.ok(loi, `${vi}: '${ten}' phải bị TỪ CHỐI, không được lặng lẽ sửa thành tên gần giống`);
  assert.match(loi.message, mong, `${vi}: lời từ chối phải nói ra nguyên nhân`);
  /* Câu phải dài hơn một mã lỗi. Đức đọc câu này chứ không đọc mã. */
  assert.ok(loi.message.length > 25, `${vi}: lời từ chối quá cụt, Đức không sửa được gì từ nó`);
  cau.add(loi.message);
}
assert.ok(cau.size >= 10, "mỗi loại tên xấu phải ra một câu riêng, không dồn vào một câu chung");

/* ---- Đường thư mục ------------------------------------------------------- */
assert.equal(duongThuMuc({ dau: "D" }), `${THU_MUC_GOC}/D`, "không có project thì giữ NGUYÊN hình dạng cũ");
assert.equal(duongThuMuc({ duAn: null, dau: "D" }), `${THU_MUC_GOC}/D`);
assert.equal(duongThuMuc({ duAn: "p1", dau: "D" }), `${THU_MUC_GOC}/p1/D`);
assert.throws(() => duongThuMuc({ duAn: "../x", dau: "D" }), /\.\./,
  "tên xấu phải ném ở ĐÂY — trước khi có bất kỳ byte nào đi xuống đĩa");

/* Nhãn lượt chạy không được chứa `:` — Windows không nhận nó trong tên thư mục. */
const nhan = nhanLuotChay(new Date("2026-09-16T10:20:30.456Z"));
assert.equal(nhan, "2026-09-16T10-20-30-456Z");
assert.ok(!/[:*?"<>|]/.test(nhan), "nhãn lượt chạy không được chứa ký tự Windows cấm");

/* ---- Ghép với vùng ghi: giữ đúng kiểu dấu gạch của vùng ghi -------------- */
assert.equal(duongDayDu("C:\\Udin\\anh-ra", "udin-optic/p1/D"), "C:\\Udin\\anh-ra\\udin-optic\\p1\\D",
  "vùng ghi kiểu Windows thì cả đường phải một kiểu — đường lai `C:\\x/y` trông như hỏng");
assert.equal(duongDayDu("C:\\Udin\\anh-ra\\", "udin-optic/D"), "C:\\Udin\\anh-ra\\udin-optic\\D",
  "gạch thừa ở cuối vùng ghi không được thành gạch đôi");
assert.equal(duongDayDu("/home/duc/anh", "udin-optic/D"), "/home/duc/anh/udin-optic/D");

console.log("  · udin thu-muc-du-an: OK");
