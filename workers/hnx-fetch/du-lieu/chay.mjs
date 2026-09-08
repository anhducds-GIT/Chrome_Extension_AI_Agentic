/* chay.mjs — LỆNH CHẠY THẬT của pilot. Nối `vong-lay` với máy chủ Bridge đang chạy.
 *
 * File này CỐ Ý mỏng và cố ý không có phép ghim riêng: mọi thứ đáng ghim nằm ở `vong-lay.mjs`
 * và `nguon-hnx.mjs`, cả hai đều nhận phụ thuộc qua tham số nên chạy được không cần mạng. Thêm
 * một dòng LOGIC vào đây là thêm một dòng không ai canh — cùng quy ước với `scouter-background.js`.
 *
 * Dùng:
 *   node chay.mjs --pairing <đường-dẫn-tệp-ghép-cặp> --tu 2026-09-01 --den 2026-09-07 [--thu-muc hnx]
 *
 * KHÔNG có token nào trong repo — nó đọc từ tệp ghép cặp Đức chỉ ra. Luật gốc của Đức.
 */
import fs from "node:fs";
import { PROTOCOL } from "../v0.1.0/scripts/bridge-core.mjs";
import { createNguonHnx, LOAI_SAN_PHAM } from "./nguon-hnx.mjs";
import { createVongLay, KET_QUA } from "./vong-lay.mjs";

function docCo(ten, macDinh) {
  const i = process.argv.indexOf(`--${ten}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : macDinh;
}

/* Ngày trong tuần thôi. Ngày lễ thì KHÔNG lọc ở đây — trang tự trả lời "không có ô dữ liệu
 * nào" và `nguon.kiemTra` nhận ra, nên nhồi một bảng ngày lễ vào code là dựng một bản sao sẽ
 * mục dần của thứ trang đã tự nói. */
function ngayTrongTuan(tu, den) {
  const ra = [];
  for (let d = new Date(`${tu}T00:00:00Z`); d <= new Date(`${den}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    const thu = d.getUTCDay();
    if (thu !== 0 && thu !== 6) ra.push(d.toISOString().slice(0, 10));
  }
  return ra;
}

/* Chỉ đích danh extension nào. CẦN khi trên máy có NHIỀU extension cùng ghép cặp bằng một
 * tệp — lúc đó cả hai cùng cắm vào máy chủ, và máy chủ không đoán hộ được. Đo thật 08/09:
 * Scouter và HNX Fetch dùng chung một tệp ghép cặp thì cả hai cùng nối, và mọi lượt gọi trả
 * về `TARGET_AMBIGUOUS`. Tên giao thức KHÔNG chặn được chuyện đó — nó gác ở tầng phong bì,
 * còn cắm dây thì xảy ra trước đó. */
const dichDanh = docCo("target");
const duongDanGhepCap = docCo("pairing");
if (!duongDanGhepCap) {
  console.error("Thiếu --pairing <đường-dẫn-tệp-ghép-cặp>. Tệp đó do bộ cài Bridge tạo.");
  process.exit(2);
}
const ghepCap = JSON.parse(fs.readFileSync(duongDanGhepCap, "utf8"));
/* Scouter nay CÓ HOST RIÊNG (Đức chốt 07/09), nên nó nghe ở ĐÚNG cổng trong tệp ghép cặp.
 * Bản trước cộng thêm 1 vì lúc đó có hai máy chủ chồng nhau — nay chỉ còn một. */
const cong = Number(docCo("cong", ghepCap.port));
const diaChi = `http://127.0.0.1:${cong}/v1/rpc`;

let dem = 0;
async function goi(method, params) {
  dem += 1;
  const phanHoi = await fetch(diaChi, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${ghepCap.token}` },
    body: JSON.stringify({
      protocol: PROTOCOL,
      version: 1,
      kind: "request",
      request_id: `hnx-${Date.now()}-${dem}`,
      method,
      sent_at: new Date().toISOString(),
      client: { client_id: "pilot-hnx-phai-sinh" },
      ...(dichDanh ? { target: dichDanh } : {}),
      params
    })
  });
  const phongBi = await phanHoi.json();
  if (phongBi?.ok !== true) {
    /* Giữ NGUYÊN mã lỗi của Bridge: `vong-lay` phân loại theo đúng mã đó (phanh · thử lại ·
     * dừng cả lượt). Bọc lại thành một Error trơn là ném đi cái phân loại. */
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
    loi.code = phongBi?.error?.code;
    loi.chiTiet = phongBi?.error?.details;
    throw loi;
  }
  return phongBi.result;
}

const dsNgay = ngayTrongTuan(docCo("tu"), docCo("den"));
if (dsNgay.length === 0) {
  console.error("Khoảng --tu … --den không có ngày làm việc nào.");
  process.exit(2);
}

const nguon = createNguonHnx({ loaiSanPham: docCo("loai", LOAI_SAN_PHAM.CHI_SO_CO_PHIEU) });
const thuMuc = docCo("thu-muc", "hnx-phai-sinh");

console.log(`Bridge : ${diaChi}`);
console.log(`Nguồn  : ${nguon.ten}`);
console.log(`Ngày   : ${dsNgay.length} ngày làm việc (${dsNgay[0]} → ${dsNgay.at(-1)})`);
console.log(`Ghi vào: ${thuMuc}/\n`);

const vong = createVongLay({
  goi, nguon, thuMuc,
  ghiLai: (d) => {
    const nhan = { LAY_MOI: "lấy được", TRONG: "không có dữ liệu", GOI_HONG: "gọi hỏng" }[d.ma] || d.ma;
    console.log(`  ${d.ngay}  ${nhan}${d.bytes ? ` (${d.bytes} byte)` : ""}${d.lan > 1 ? `  [lần ${d.lan}]` : ""}`);
  }
});

try {
  const ra = await vong.chay(dsNgay);
  const t = ra.tom_tat;
  console.log(`\nXong: ${t.lay_moi} lấy mới · ${t.da_co} đã có · ${t.trong} không có dữ liệu · ${t.hong} hỏng`);
  /* Ngày HỎNG làm mã thoát khác 0 — nếu không thì một lượt chạy hụt nửa tuần vẫn trông như
   * thành công với bất cứ thứ gì gọi lệnh này. */
  process.exit(t.hong > 0 ? 1 : 0);
} catch (loi) {
  console.error(`\nDỪNG CẢ LƯỢT: ${loi.ma || "LỖI"} — ${loi.message}`);
  if (loi.ma === "PHANH_CHAN") {
    console.error("Bật công tắc 'Cho phép bấm và gõ' trong bảng bên của Scouter rồi chạy lại.");
  }
  process.exit(1);
}
