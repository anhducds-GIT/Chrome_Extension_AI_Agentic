/* pilot-mutation-check.mjs — đột biến kiểm cho vòng lấy dữ liệu của pilot.
 *
 * Dùng CHUNG bộ máy với seed (`../../v0.1.0/scripts/mutation-runner.mjs`) — không chép một bản
 * thứ hai. Bộ máy đó đã trả giá cho ba lần bỏ lại mã đột biến trong repo và nay có khoá file +
 * nhật ký hồi phục; dựng lại bản riêng cho pilot là mua lại đúng ba bài học đó bằng tiền mặt.
 *
 * Vì sao pilot cũng cần đột biến kiểm: suite của nó xanh ngay lượt chạy đầu tiên, và "xanh ngay
 * lượt đầu" là dấu hiệu đáng ngờ chứ không phải dấu hiệu tốt — ngày 07/09 sáu con `N1..N6` đã
 * sống sót qua một suite xanh vì phép ghim canh khai báo chứ không canh hành vi.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chayDotBien } from "../../../v0.1.0/scripts/mutation-runner.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PIN = path.join(ROOT, "tests", "vong-lay-smoke.mjs");
const DICH = path.join(ROOT, "vong-lay.mjs");
const Q = String.fromCharCode(34);

const BATCHES = [{
  ten: "VÒNG LẤY — ba điều kiện đóng của S-10",
  target: DICH,
  pin: PIN,
  mutants: [
    {
      ma: "V1",
      ten: "Bỏ phép bỏ-qua-ngày-đã-có — lượt hai tải lại cả tuần",
      tim: "        if (daCo.has(nguon.tenFile(ngay))) {",
      thay: "        if (false) {",
      soLan: 1
    },
    {
      ma: "V2",
      ten: "File 0 byte tính là đã có — một ngày bị bỏ sót vĩnh viễn, im lặng",
      tim: "      if (muc?.kind === " + Q + "file" + Q + " && Number(muc.bytes) > 0) co.add(muc.name);",
      thay: "      if (muc?.kind === " + Q + "file" + Q + ") co.add(muc.name);",
      soLan: 1
    },
    {
      ma: "V3",
      ten: "Không nhớ file VỪA ghi — ngày lặp trong danh sách bị tải lại",
      tim: "        if (mot.trang_thai === KET_QUA.LAY_MOI) daCo.add(nguon.tenFile(ngay));",
      thay: "        if (false) daCo.add(nguon.tenFile(ngay));",
      soLan: 1
    },
    {
      ma: "V4",
      ten: "Hình dạng sai cũng thử lại — đốt ngân sách cho 5 câu trả lời sai giống nhau",
      tim: "        if (error instanceof LoiNguon && error.thuLai) {",
      thay: "        if (error instanceof LoiNguon) {",
      soLan: 1
    },
    {
      ma: "V5",
      ten: "Phanh chặn cũng thử lại — thử lại một cái phanh là vô nghĩa",
      tim: "        if (MA_PHANH.has(String(ma))) {",
      thay: "        if (false) {",
      soLan: 1
    },
    {
      ma: "V6",
      ten: "Đọc thư mục hỏng nuốt im — không biết đã có gì mà vẫn chạy, tải lại cả tuần",
      tim: "      if (error?.ma === " + Q + "DIR_NOT_FOUND" + Q + " || error?.code === " + Q + "DIR_NOT_FOUND" + Q + ") return new Set();",
      thay: "      return new Set();",
      soLan: 1
    },
    {
      ma: "V7",
      ten: "Chờ đều thay vì lùi dần — đâm liên tiếp vào một trang đang ngộp",
      tim: "  const cho = typeof deps.cho === " + Q + "function" + Q + " ? deps.cho : (lan) => Math.min(30000, 1000 * 2 ** (lan - 1));",
      thay: "  const cho = typeof deps.cho === " + Q + "function" + Q + " ? deps.cho : () => 1000;",
      soLan: 1
    },
    {
      ma: "V8",
      ten: "Ngày trống cũng ghi ra file — bịa một file rỗng cho ngày nghỉ",
      tim: "      if (doc?.trong === true) {",
      thay: "      if (false) {",
      soLan: 1
    },
    {
      ma: "V9",
      ten: "Lệch một nhịp ở vòng thử lại — mất đúng lần thử cuối",
      tim: "    for (let lan = 1; lan <= lanThuToiDa; lan += 1) {",
      thay: "    for (let lan = 1; lan < lanThuToiDa; lan += 1) {",
      soLan: 1
    }
  ]
}, {
  ten: "NGUỒN HNX — hợp đồng trang, mọi con số đo 07/09",
  target: path.join(ROOT, "nguon-hnx.mjs"),
  pin: path.join(ROOT, "tests", "nguon-hnx-smoke.mjs"),
  mutants: [
    {
      ma: "N1",
      ten: "Cái bẫy lọt: 200 OK kèm một TRANG cũng coi là dữ liệu",
      tim: "        goi = JSON.parse(String(phanHoi?.body ?? " + Q + Q + "));",
      thay: "        goi = { Content: String(phanHoi?.body ?? " + Q + Q + ") };",
      soLan: 1
    },
    {
      ma: "N2",
      ten: "Hình dạng sai thành ĐÁNG thử lại — đốt ngân sách lấy 5 câu trả lời sai giống nhau",
      tim: "          { thuLai: false, chiTiet: String(phanHoi?.body ?? " + Q + Q + ").slice(0, 120) });",
      thay: "          { thuLai: true, chiTiet: String(phanHoi?.body ?? " + Q + Q + ").slice(0, 120) });",
      soLan: 1
    },
    {
      ma: "N3",
      ten: "Ngày nghỉ bị ghi thành file — bịa một ngày giao dịch không tồn tại",
      tim: "      if ((noiDung.match(/<td/gi) || []).length === 0) return { trong: true };",
      thay: "      if (false) return { trong: true };",
      soLan: 1
    },
    {
      ma: "N4",
      ten: "Gửi kèm phiên đăng nhập của Đức sang một trang ngoài",
      tim: "      with_credentials: false",
      thay: "      with_credentials: true",
      soLan: 1
    },
    {
      ma: "N5",
      ten: "5xx thành không-thử-lại — trang hỏng một nhịp là mất luôn ngày đó",
      tim: "        throw new LoiNguon(" + Q + "MAY_CHU_HONG" + Q + ", `Trang trả ${ma}.`, { thuLai: true, chiTiet: ma });",
      thay: "        throw new LoiNguon(" + Q + "MAY_CHU_HONG" + Q + ", `Trang trả ${ma}.`, { thuLai: false, chiTiet: ma });",
      soLan: 1
    },
    {
      ma: "N6",
      ten: "Bỏ kiểm khoá Content — một JSON của ai khác vẫn lọt",
      tim: "      if (goi === null || typeof goi !== " + Q + "object" + Q + " || !Object.hasOwn(goi, " + Q + "Content" + Q + ")) {",
      thay: "      if (false) {",
      soLan: 1
    },
    {
      ma: "N7",
      ten: "Tên file bỏ loại sản phẩm — hai loại đè lên nhau, mất một nửa dữ liệu",
      tim: "    tenFile: (ngay) => `${ngay}-${loaiSanPham}.json`,",
      thay: "    tenFile: (ngay) => `${ngay}.json`,",
      soLan: 1
    },
    {
      ma: "N8",
      ten: "Ngày sai dạng vẫn gửi đi — đốt một lượt ngân sách cho một yêu cầu chắc chắn sai",
      tim: "  if (!m) throw new LoiNguon(" + Q + "NGAY_SAI_DANG" + Q + ", `Ngày phải là yyyy-mm-dd, nhận được '${ngay}'.`, { thuLai: false });",
      thay: "  if (!m) return String(ngay);",
      soLan: 1
    }
  ]
}];

process.exit(chayDotBien(BATCHES, ROOT));
