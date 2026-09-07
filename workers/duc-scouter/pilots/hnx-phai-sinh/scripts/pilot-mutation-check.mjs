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
}];

process.exit(chayDotBien(BATCHES, ROOT));
