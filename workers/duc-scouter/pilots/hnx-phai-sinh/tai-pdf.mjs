/* tai-pdf.mjs — TẢI CÁC BÁO CÁO PDF phái sinh của HNX về thư mục dữ liệu của Đức.
 *
 * Dùng:
 *   node tai-pdf.mjs --pairing <tệp> --thu-muc "<đường dẫn>" --thang 08/2026 [--thang 09/2026]
 *   node tai-pdf.mjs --pairing <tệp> --thu-muc "<đường dẫn>" --nam 2026        (báo cáo tháng)
 *   thêm --thu-xem  để CHỈ LIỆT KÊ, không tải gì
 *
 * ─── HAI QUYẾT ĐỊNH KIẾN TRÚC, đọc trước khi sửa ────────────────────────────────────────
 *
 * ⑴ FETCH qua Bridge, nhưng GHI bằng Node.
 *    Máy chủ Bridge nhốt mọi lượt `file.*` trong vùng ghi của nó, và vùng đó CỐ Ý không phải
 *    thư mục dữ liệu thật của Đức. Nới vùng ghi ra tới Google Drive là hạ đúng cái chốt sinh
 *    ra để một trang web không bao giờ ghi được vào dữ liệu thật. Nên: extension chỉ TẢI,
 *    tiến trình Node này — của chính Đức, chạy trên máy Đức — mới ĐẶT file xuống đĩa.
 *
 * ⑵ FILE TRÊN ĐĨA CHÍNH LÀ TRẠNG THÁI, và vì thế file cụt là thứ nguy hiểm nhất.
 *    Không có sổ tiến độ riêng. Nên trước khi ghi, mỗi tệp phải qua `laPdfDayDu`, và lượt ghi
 *    đi qua tên tạm rồi mới đổi tên. Chết giữa chừng thì để lại một tệp `.dang-tai` mà lượt
 *    sau bỏ qua — KHÔNG để lại một tệp mang tên thật nhưng thiếu nửa sau.
 *
 * KHÔNG BAO GIỜ GHI ĐÈ. Tệp đã có thì bỏ qua, kể cả khi nội dung khác. Đây là dữ liệu Đức đã
 * duy trì bằng tay từ 07/2026 — ghi đè là việc phải hỏi, không phải việc một script tự làm.
 */
import fs from "node:fs";
import path from "node:path";
import { PROTOCOL } from "../../v0.1.0/scripts/scouter-bridge-core.mjs";
import { KIEU, docDanhMuc, laPdfDayDu, yeuCau } from "./nguon-thong-ke.mjs";

function co(ten, macDinh = null) {
  const i = process.argv.indexOf(`--${ten}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : macDinh;
}
function coNhieu(ten) {
  const ra = [];
  for (let i = 0; i < process.argv.length; i += 1) {
    if (process.argv[i] === `--${ten}` && process.argv[i + 1]) ra.push(process.argv[i + 1]);
  }
  return ra;
}

const duongGhepCap = co("pairing");
const thuMuc = co("thu-muc");
const thang = coNhieu("thang");
const nam = coNhieu("nam");
const chiXem = process.argv.includes("--thu-xem");

if (!duongGhepCap || !thuMuc || (thang.length === 0 && nam.length === 0)) {
  process.stderr.write("Thiếu tham số. Dùng:\n");
  process.stderr.write('  node tai-pdf.mjs --pairing <tệp> --thu-muc "<đường dẫn>" --thang 08/2026\n');
  process.stderr.write("  --nam 2026 để lấy báo cáo tháng · --thu-xem để chỉ liệt kê\n");
  process.exit(2);
}
if (!fs.existsSync(thuMuc)) {
  process.stderr.write(`Thư mục không tồn tại: ${thuMuc}\n`);
  process.stderr.write("CỐ Ý không tự tạo: gõ nhầm một ký tự là đổ dữ liệu vào một thư mục lạ.\n");
  process.exit(2);
}

const ghepCap = JSON.parse(fs.readFileSync(duongGhepCap, "utf8"));
const diaChi = `http://127.0.0.1:${ghepCap.port}/v1/rpc`;

let dem = 0;
async function goi(method, params) {
  dem += 1;
  const phanHoi = await fetch(diaChi, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${ghepCap.token}` },
    body: JSON.stringify({
      protocol: PROTOCOL, version: 1, kind: "request",
      request_id: `pdf-${Date.now()}-${dem}`, method,
      sent_at: new Date().toISOString(),
      client: { client_id: "pilot-hnx-thong-ke" }, params
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

/* ---- ① Gom danh mục ------------------------------------------------------ */
const canLay = [];
for (const [kieu, ds] of [[KIEU.NGAY, thang], [KIEU.THANG, nam]]) {
  for (const khoa of ds) {
    const kq = await goi("scout.fetch", yeuCau(kieu, khoa));
    const dm = docDanhMuc(kq.body);
    if (dm.trong) { console.log(`${khoa}: HNX chưa công bố gì`); continue; }
    console.log(`${khoa}: HNX công bố ${dm.muc.length} tệp`);
    canLay.push(...dm.muc);
  }
}

const daCo = new Set(fs.readdirSync(thuMuc));
const thieu = canLay.filter((m) => !daCo.has(m.ten));
console.log(`\nTổng HNX có: ${canLay.length} · đã có trên đĩa: ${canLay.length - thieu.length} · CÒN THIẾU: ${thieu.length}\n`);

if (thieu.length === 0) { console.log("Không thiếu gì. Xong."); process.exit(0); }
if (chiXem) {
  for (const m of thieu) console.log(`  ${m.ten}`);
  console.log("\n--thu-xem: chỉ liệt kê, chưa tải gì.");
  process.exit(0);
}

/* ---- ② Tải từng tệp ------------------------------------------------------ */
let lay = 0;
let hong = 0;
for (const m of thieu) {
  let kq;
  try {
    kq = await goi("scout.fetch", { url: m.url, method: "GET", with_credentials: false, as: "base64" });
  } catch (loi) {
    console.log(`  HỎNG   ${m.ten}  ${loi.ma || "LỖI"}`);
    if (loi.ma === "PHANH_CHAN" || loi.chiTiet?.action_code === "WRITE_GATE_CLOSED") {
      console.error("\nCái phanh chặn đường ghi. Bật công tắc trong bảng bên của Scouter rồi chạy lại.");
      process.exit(1);
    }
    hong += 1;
    continue;
  }

  if (typeof kq.body_base64 !== "string" || kq.body_base64 === "") {
    console.log(`  HỎNG   ${m.ten}  không nhận được thân base64 — extension đã nạp lại bản mới chưa?`);
    hong += 1;
    continue;
  }
  const byte = Buffer.from(kq.body_base64, "base64");

  /* Ba phép kiểm trước khi chạm đĩa. Số byte phải khớp con số máy chủ khai — lệch nghĩa là
   * mất byte trên đường, và một PDF mất byte vẫn có thể mở được nhưng thiếu trang. */
  if (byte.length !== kq.bytes) {
    console.log(`  HỎNG   ${m.ten}  lệch byte: nhận ${byte.length}, máy chủ khai ${kq.bytes}`);
    hong += 1;
    continue;
  }
  if (!laPdfDayDu(byte)) {
    console.log(`  HỎNG   ${m.ten}  không phải PDF đầy đủ (${byte.length} byte)`);
    hong += 1;
    continue;
  }

  const dich = path.join(thuMuc, m.ten);
  const tam = path.join(thuMuc, `${m.ten}.dang-tai`);
  fs.writeFileSync(tam, byte);
  fs.renameSync(tam, dich);
  console.log(`  LẤY    ${m.ten}  (${byte.length} byte)`);
  lay += 1;
}

console.log(`\nXong: ${lay} lấy mới · ${hong} hỏng · ${canLay.length - thieu.length} đã có sẵn`);
process.exit(hong > 0 ? 1 : 0);
