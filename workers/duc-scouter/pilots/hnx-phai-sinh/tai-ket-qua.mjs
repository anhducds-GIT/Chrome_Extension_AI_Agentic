/* tai-ket-qua.mjs — lấy KẾT QUẢ GIAO DỊCH phái sinh và ghi thẳng thành CSV vào cơ sở dữ liệu
 * của Đức trên Drive.
 *
 * Dùng:
 *   node tai-ket-qua.mjs --pairing <tệp> --thu-muc "<đường dẫn>" --tu 2026-08-25 --den 2026-09-07
 *   thêm --thu-xem để CHỈ LIỆT KÊ, không ghi gì
 *
 * ─── VÌ SAO CÓ FILE NÀY, trong khi đã có `chay.mjs` ────────────────────────────────────────
 * `chay.mjs` ghi khối HTML **thô** vào vùng ghi của Bridge. Thô là đúng cho lưu trữ — nó là
 * bằng chứng, không diễn giải. Nhưng nó nằm trong hộp cát của Bridge, còn thứ Đức dùng để phân
 * tích là **bảng số trên Drive**. Đo 08/09: 7 tệp thô kẹt trong hộp cát, 0 tệp vào cơ sở dữ liệu.
 *
 * Nên file này KHÔNG thay `chay.mjs`; nó là đường thứ hai, đi thẳng tới nơi Đức thật sự đọc.
 *
 * Ba luật giống hệt `tai-pdf.mjs`, và giống vì cùng một lý do chứ không phải để cho đều:
 *   ⑴ FETCH qua Bridge, GHI bằng Node — không nới vùng ghi của extension ra tới Drive.
 *   ⑵ KHÔNG BAO GIỜ GHI ĐÈ. Tệp đã có thì bỏ qua.
 *   ⑶ Tệp trên đĩa CHÍNH LÀ trạng thái, nên ghi qua tên tạm rồi mới đổi tên.
 *
 * Tên tệp theo ĐÚNG cách Đức đã đặt từ trước: `YYYY-MM-DD_HNX_KetQua_GiaoDich.csv`.
 */
import fs from "node:fs";
import path from "node:path";
import { PROTOCOL } from "../../v0.1.0/scripts/scouter-bridge-core.mjs";
import { docBang, raCsv } from "./bang-ket-qua.mjs";
import { createNguonHnx, LOAI_SAN_PHAM } from "./nguon-hnx.mjs";

function co(ten, macDinh = null) {
  const i = process.argv.indexOf(`--${ten}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : macDinh;
}

const duongGhepCap = co("pairing");
const thuMuc = co("thu-muc");
const tu = co("tu");
const den = co("den");
const chiXem = process.argv.includes("--thu-xem");

if (!duongGhepCap || !thuMuc || !tu || !den) {
  process.stderr.write("Thiếu tham số. Dùng:\n");
  process.stderr.write('  node tai-ket-qua.mjs --pairing <tệp> --thu-muc "<đường dẫn>" --tu 2026-08-25 --den 2026-09-07\n');
  process.exit(2);
}
if (!fs.existsSync(thuMuc)) {
  process.stderr.write(`Thư mục không tồn tại: ${thuMuc}\n`);
  process.stderr.write("CỐ Ý không tự tạo: gõ nhầm một ký tự là đổ dữ liệu vào một thư mục lạ.\n");
  process.exit(2);
}

const ghepCap = JSON.parse(fs.readFileSync(duongGhepCap, "utf8"));
const diaChi = `http://127.0.0.1:${ghepCap.port}/v1/rpc`;
const nguon = createNguonHnx({ loaiSanPham: LOAI_SAN_PHAM.CHI_SO_CO_PHIEU });

let dem = 0;
async function goi(method, params) {
  dem += 1;
  const phanHoi = await fetch(diaChi, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${ghepCap.token}` },
    body: JSON.stringify({
      protocol: PROTOCOL, version: 1, kind: "request",
      request_id: `csv-${Date.now()}-${dem}`, method,
      sent_at: new Date().toISOString(),
      client: { client_id: "pilot-hnx-ket-qua" }, params
    })
  });
  const phongBi = await phanHoi.json();
  if (phongBi?.ok !== true) {
    const loi = new Error(phongBi?.error?.message || "Bridge trả lỗi không rõ.");
    loi.ma = phongBi?.error?.code;
    loi.chiTiet = phongBi?.error?.details;
    throw loi;
  }
  return phongBi.result;
}

/* Ngày trong tuần. Ngày lễ KHÔNG lọc ở đây — trang tự trả lời "không có ô dữ liệu nào", và
 * nhồi một bảng ngày lễ vào code là dựng bản sao sẽ mục dần của thứ trang đã tự nói. */
function ngayLamViec(a, b) {
  const ra = [];
  for (let d = new Date(`${a}T00:00:00Z`); d <= new Date(`${b}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    const t = d.getUTCDay();
    if (t !== 0 && t !== 6) ra.push(d.toISOString().slice(0, 10));
  }
  return ra;
}

const tenCsv = (ngay) => `${ngay}_HNX_KetQua_GiaoDich.csv`;

const dsNgay = ngayLamViec(tu, den);
if (dsNgay.length === 0) {
  process.stderr.write("Khoảng --tu … --den không có ngày làm việc nào.\n");
  process.exit(2);
}
const daCo = new Set(fs.readdirSync(thuMuc));
const thieu = dsNgay.filter((n) => !daCo.has(tenCsv(n)));

console.log(`Ngày làm việc trong khoảng: ${dsNgay.length} (${dsNgay[0]} → ${dsNgay.at(-1)})`);
console.log(`Đã có trên đĩa: ${dsNgay.length - thieu.length} · CÒN THIẾU: ${thieu.length}\n`);

if (thieu.length === 0) { console.log("Không thiếu gì. Xong."); process.exit(0); }
if (chiXem) {
  for (const n of thieu) console.log(`  ${tenCsv(n)}`);
  console.log("\n--thu-xem: chỉ liệt kê, chưa ghi gì.");
  process.exit(0);
}

let lay = 0;
let trong = 0;
let hong = 0;
for (const ngay of thieu) {
  let kq;
  try {
    kq = await goi("scout.fetch", nguon.yeuCau(ngay));
  } catch (loi) {
    console.log(`  HỎNG   ${ngay}  ${loi.ma || "LỖI"}`);
    if (loi.chiTiet?.write_code === "WRITE_CAP_REACHED" || loi.ma === "WRITE_BLOCKED") {
      console.error("\nHết hạn mức ghi. Tắt rồi bật lại công tắc “Cho phép bấm và gõ” ở đầu bảng bên, rồi chạy lại.");
      console.error("Lượt sau tự bỏ qua những ngày đã có — không lấy lại.");
      process.exit(1);
    }
    hong += 1;
    continue;
  }

  /* Dùng chính `kiemTra` của hợp đồng nguồn: nó phân biệt "ngày không có phiên" với "trang
   * trả về thứ khác". Tự đoán lại ở đây là dựng bản sao thứ hai của một luật. */
  let phanLoai;
  try {
    phanLoai = nguon.kiemTra(kq);
  } catch (loi) {
    console.log(`  HỎNG   ${ngay}  ${loi.ma || "HÌNH DẠNG SAI"}`);
    hong += 1;
    continue;
  }
  if (phanLoai.trong) { console.log(`  —      ${ngay}  không có phiên`); trong += 1; continue; }

  let bang;
  try {
    bang = docBang(JSON.parse(phanLoai.noiDung).Content);
  } catch (loi) {
    console.log(`  HỎNG   ${ngay}  ${loi.ma || "ĐỌC BẢNG"}: ${loi.message}`);
    hong += 1;
    continue;
  }

  const csv = raCsv(bang);
  const dich = path.join(thuMuc, tenCsv(ngay));
  const tam = `${dich}.dang-ghi`;
  fs.writeFileSync(tam, csv, "utf8");
  fs.renameSync(tam, dich);
  console.log(`  LẤY    ${tenCsv(ngay)}  (${bang.hang.length} hàng × ${bang.cot.length} cột)`);
  lay += 1;
}

console.log(`\nXong: ${lay} lấy mới · ${trong} không có phiên · ${hong} hỏng · ${dsNgay.length - thieu.length} đã có sẵn`);
process.exit(hong > 0 ? 1 : 0);
