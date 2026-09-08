/* tai-ket-qua.mjs — gom KẾT QUẢ GIAO DỊCH phái sinh vào MỘT tệp CSV duy nhất (SSOT).
 *
 * Dùng:
 *   node tai-ket-qua.mjs --pairing <tệp> --master "<đường dẫn .csv>" --tu 2026-08-25 --den 2026-09-07
 *   thêm --thu-xem để CHỈ LIỆT KÊ, không ghi gì
 *
 * ─── VÌ SAO MỘT TỆP, VÀ VÌ SAO CSV ──────────────────────────────────────────────────────────
 * Đức chốt 08/09: *"giữ 1 file duy nhất, ko làm thành nhiều file"* và *"cả 2 cùng ghi CSV được
 * thì tốt, bạn maintain 1 file CSV SSOT duy nhất là ok."* Lý do chọn CSV thay vì .xlsx nằm ở
 * đầu `master.mjs` — tóm tắt: điều kiện là HAI CÔNG CỤ cùng thao tác được, không phải đuôi tệp.
 *
 * ─── BA LUẬT, giống `tai-pdf.mjs` và giống vì cùng một lý do ────────────────────────────────
 *   ⑴ FETCH qua Bridge, GHI bằng Node — không nới vùng ghi của extension ra tới Drive.
 *   ⑵ Ngày đã có trong tệp thì KHÔNG lấy lại. Tệp chính là trạng thái.
 *   ⑶ Chỉ nối vào cuối, không bao giờ sửa dòng cũ. Ghi qua tệp tạm rồi đổi tên.
 */
import fs from "node:fs";
import { PROTOCOL } from "../v0.1.0/scripts/bridge-core.mjs";
import { docBang } from "./bang-ket-qua.mjs";
import { hangMaster } from "./luoc-do-master.mjs";
import { docMaster, themHang } from "./master.mjs";
import { createNguonHnx, LOAI_SAN_PHAM } from "./nguon-hnx.mjs";

function co(ten, macDinh = null) {
  const i = process.argv.indexOf(`--${ten}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : macDinh;
}

/* Chỉ đích danh extension nào. CẦN khi trên máy có NHIỀU extension cùng ghép cặp bằng một
 * tệp — lúc đó cả hai cùng cắm vào máy chủ, và máy chủ không đoán hộ được. Đo thật 08/09:
 * Scouter và HNX Fetch dùng chung một tệp ghép cặp thì cả hai cùng nối, và mọi lượt gọi trả
 * về `TARGET_AMBIGUOUS`. Tên giao thức KHÔNG chặn được chuyện đó — nó gác ở tầng phong bì,
 * còn cắm dây thì xảy ra trước đó. */
const dichDanh = co("target");
const duongGhepCap = co("pairing");
const duongMaster = co("master");
const tu = co("tu");
const den = co("den");
const chiXem = process.argv.includes("--thu-xem");
const loaiGo = co("loai");

if (!duongGhepCap || !duongMaster || !tu || !den) {
  process.stderr.write("Thiếu tham số. Dùng:\n");
  process.stderr.write('  node tai-ket-qua.mjs --pairing <tệp> --master "<đường dẫn .csv>" --tu 2026-08-25 --den 2026-09-07\n');
  process.exit(2);
}
/* ---- `--loai`: chọn loại sản phẩm phái sinh (H-05) -------------------------
 * Nhận CẢ HAI cách gọi — tên dễ đọc (`CHI_SO_CO_PHIEU`) lẫn mã trang dùng (`HDTLCSCP`) — vì
 * người vận hành đọc tên trong tài liệu còn máy thấy mã trong URL, và bắt họ nhớ đúng một
 * trong hai là bắt nhầm.
 *
 * TỰ SINH từ `LOAI_SAN_PHAM`, không gõ lại danh sách: gõ lại là dựng bản sao thứ hai của một
 * bảng, rồi thêm loại thứ ba ở nguồn mà quên ở đây thì cờ này im lặng từ chối nó.
 *
 * Gõ sai thì DỪNG, không lặng lẽ dùng mặc định. Trang HNX trả 200 OK kèm cả một trang HTML khi
 * tham số sai (đo 07/09), nên "chạy tiếp với mặc định" nghĩa là ghi dữ liệu của loại khác vào
 * SSOT mà không ai biết — và SSOT thì chỉ nối thêm, không sửa lại được. */
const loaiSanPham = (() => {
  if (loaiGo === undefined || loaiGo === null || loaiGo === "") return LOAI_SAN_PHAM.CHI_SO_CO_PHIEU;
  const khoa = String(loaiGo).trim().toUpperCase();
  if (Object.hasOwn(LOAI_SAN_PHAM, khoa)) return LOAI_SAN_PHAM[khoa];
  const ma = Object.values(LOAI_SAN_PHAM).find((x) => x.toUpperCase() === khoa);
  if (ma) return ma;
  process.stderr.write("Không có loại sản phẩm '" + loaiGo + "'. Chọn một trong:" + String.fromCharCode(10));
  for (const [ten, x] of Object.entries(LOAI_SAN_PHAM)) {
    process.stderr.write("  --loai " + ten + "   (mã trang: " + x + ")" + String.fromCharCode(10));
  }
  process.exit(2);
})();

/* Thư mục chứa phải có sẵn. CỐ Ý không tự tạo: gõ nhầm một ký tự là dựng một SSOT thứ hai ở
 * chỗ không ai nhìn, mà "một tệp duy nhất" là chính điều Đức muốn. */
const thuMuc = duongMaster.replace(/[\\/][^\\/]*$/, "");
if (thuMuc && !fs.existsSync(thuMuc)) {
  process.stderr.write(`Thư mục không tồn tại: ${thuMuc}\n`);
  process.exit(2);
}

const ghepCap = JSON.parse(fs.readFileSync(duongGhepCap, "utf8"));
const diaChi = `http://127.0.0.1:${ghepCap.port}/v1/rpc`;
const nguon = createNguonHnx({ loaiSanPham });

let dem = 0;
async function goi(method, params) {
  dem += 1;
  const phanHoi = await fetch(diaChi, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${ghepCap.token}` },
    body: JSON.stringify({
      protocol: PROTOCOL, version: 1, kind: "request",
      request_id: `ssot-${Date.now()}-${dem}`, method,
      sent_at: new Date().toISOString(),
      client: { client_id: "pilot-hnx-ssot" },
      ...(dichDanh ? { target: dichDanh } : {}),
      params
    })
  });
  const phongBi = await phanHoi.json();
  if (phongBi?.ok !== true) {
    if (phongBi?.error?.code === "TARGET_AMBIGUOUS") {
      const ds = (phongBi.error.details?.candidates || []).map((c) => "  --target " + c.instance_id + (c.label ? "   (" + c.label + ")" : ""));
      throw new Error(["Có NHIỀU extension cùng nối vào máy chủ này, nên nó không biết gửi cho ai.",
        "Thường là vì Scouter và HNX Fetch đang ghép cặp bằng CÙNG một tệp.", "",
        "Chạy lại và chỉ đích danh một trong các dòng sau:", ...ds, "",
        "Không biết dòng nào là HNX Fetch? Gọi thử system.ping với từng dòng —",
        "đúng cái của HNX Fetch sẽ trả về  seed: hnx-fetch-v0.1"].join(String.fromCharCode(10)));
    }
    const loi = new Error(phongBi?.error?.message || "Bridge trả lỗi không rõ.");
    loi.ma = phongBi?.error?.code;
    loi.chiTiet = phongBi?.error?.details;
    throw loi;
  }
  return phongBi.result;
}

/* Ngày trong tuần. Ngày lễ KHÔNG lọc ở đây — trang tự trả lời "không có ô dữ liệu nào". */
function ngayLamViec(a, b) {
  const ra = [];
  for (let d = new Date(`${a}T00:00:00Z`); d <= new Date(`${b}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    const t = d.getUTCDay();
    if (t !== 0 && t !== 6) ra.push(d.toISOString().slice(0, 10));
  }
  return ra;
}

const dsNgay = ngayLamViec(tu, den);
if (dsNgay.length === 0) {
  process.stderr.write("Khoảng --tu … --den không có ngày làm việc nào.\n");
  process.exit(2);
}

let truoc;
try {
  truoc = docMaster(duongMaster);
} catch (loi) {
  process.stderr.write(`\n${loi.message}\n`);
  process.exit(1);
}
const thieu = dsNgay.filter((n) => !truoc.ngay.has(n));

console.log(`SSOT   : ${duongMaster}`);
console.log(`Đang có: ${truoc.soHang} hàng, ${truoc.ngay.size} ngày`);
console.log(`Khoảng : ${dsNgay.length} ngày làm việc (${dsNgay[0]} → ${dsNgay.at(-1)}) · CÒN THIẾU ${thieu.length}\n`);

if (thieu.length === 0) { console.log("Không thiếu gì. Xong."); process.exit(0); }
if (chiXem) {
  for (const n of thieu) console.log(`  ${n}`);
  console.log("\n--thu-xem: chỉ liệt kê, chưa ghi gì.");
  process.exit(0);
}

let lay = 0;
let hangMoi = 0;
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
      console.error("Những ngày đã ghi vào SSOT sẽ tự bị bỏ qua — không lấy lại.");
      break;
    }
    hong += 1;
    continue;
  }

  let phanLoai;
  try {
    phanLoai = nguon.kiemTra(kq);
  } catch (loi) {
    console.log(`  HỎNG   ${ngay}  ${loi.ma || "HÌNH DẠNG SAI"}`);
    hong += 1;
    continue;
  }
  if (phanLoai.trong) { console.log(`  —      ${ngay}  không có phiên`); trong += 1; continue; }

  let hang;
  try {
    hang = hangMaster(docBang(JSON.parse(phanLoai.noiDung).Content), ngay);
  } catch (loi) {
    console.log(`  HỎNG   ${ngay}  ${loi.ma || "ĐỌC BẢNG"}: ${loi.message}`);
    hong += 1;
    continue;
  }

  /* Ghi NGAY sau mỗi ngày, không gom lại ghi một lượt cuối. Gom lại thì một lượt chạy bị cắt
   * giữa chừng mất trắng mọi ngày đã lấy, và lượt sau phải lấy lại — tốn hạn mức ghi thật. */
  themHang(duongMaster, hang);
  console.log(`  LẤY    ${ngay}  (+${hang.length} hàng)`);
  lay += 1;
  hangMoi += hang.length;
}

const sau = docMaster(duongMaster);
console.log(`\nXong: ${lay} ngày mới (+${hangMoi} hàng) · ${trong} không có phiên · ${hong} hỏng`);
console.log(`SSOT nay: ${sau.soHang} hàng, ${sau.ngay.size} ngày`);
process.exit(hong > 0 ? 1 : 0);
