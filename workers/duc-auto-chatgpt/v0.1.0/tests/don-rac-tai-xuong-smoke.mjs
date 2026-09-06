/* Ghim bộ phân loại của `scripts/don-rac-tai-xuong.mjs`.

   Vì sao phép kiểm này là phần đáng giá nhất của công cụ đó: nó xoá file
   trong thư mục Tải xuống THẬT của Đức, và xoá không hoàn lại được. Một
   matcher nới ra một chút là mất file thật.

   Các ca dưới đây KHÔNG bịa: bốn tên GUID ở nhóm "của gói" và hai tên ở
   nhóm "được bảo vệ" đều là file quan sát được trong thư mục Tải xuống của
   Đức ngày 2026-09-06 (39 file dạng GUID / 170 file). Hai ca `.pdf` và
   `.jpg` chính là hai file đã suýt bị một bộ lọc chỉ-khớp-tên xoá mất. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { phanLoai, quet } from "../scripts/don-rac-tai-xuong.mjs";

const B = (s) => Buffer.from(s, "binary");
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
const AUDIT = B('{"timestamp":"2026-09-03T18:41:43.472Z","run_id":"20260903-1841","event":"BRIDGE_JOB_ADDED_DIRECT"}\n{"event":"X"}');
const PROBE = B('{"probe":"B36-panel"}');

let n = 0;
const ca = (ten, noiDung, bacMong, ghiChu) => {
  const kq = phanLoai(ten, () => noiDung);
  assert.equal(kq.bac, bacMong, `${ten}: mong "${bacMong}", nhận "${kq.bac}" (${kq.vi_sao}) — ${ghiChu}`);
  assert.ok(kq.vi_sao && kq.vi_sao.length > 8, `${ten}: phải nói được vì sao`);
  n += 1;
};

/* ---- ① của gói, chứng minh được: sổ audit thật đã quan sát được ---- */
ca("16f87e2b-3d75-4a5d-9cee-884f1c7b732a", AUDIT, "so-audit", "sổ audit thật, 793 B, 04/09");
ca("0d309026-e447-4dbb-839d-16cd1e2393d3", AUDIT, "so-audit", "sổ audit thật, run Quick 03/09");
ca("05a491ce-623c-4d7a-bb81-f677686cf7ec", PROBE, "so-audit", "file đo B-36 lượt side panel");
ca("d31c629e-39e1-4a96-ae61-dde336b91792", PROBE, "so-audit", "file đo B-36 lượt DAC_DOWNLOAD_ARTIFACT");

/* ---- ② hình dạng của gói, KHÔNG chứng minh được chủ ---- */
ca("ad6d9e75-24b1-4b04-9ec5-6e7974a0872c.xlsx", ZIP, "can-mat", "checkpoint thật, 10.545 B, 04/09");
ca("bd00d527-e43a-4806-bb1b-df5c59f6aa19.png", PNG, "can-mat", "ảnh — PNG nào cũng là PNG");

/* ---- ③ ĐƯỢC BẢO VỆ. Hai ca đầu là lý do phép kiểm này tồn tại ---- */
ca("2b6cb294-a4f7-4d96-b489-a5058474c683.pdf", B("%PDF-1.7"), "khong-phai", "file THẬT của Đức, gói này không sinh PDF");
ca("dc1a799d-c631-48f5-b0fa-449eb477cc77.jpg", B("\xff\xd8\xff\xe0"), "khong-phai", "file THẬT của Đức, gói này không sinh JPG");
ca("Bridge-2026-09-03T12-46__audit.jsonl", AUDIT, "khong-phai", "sổ audit ĐẶT TÊN ĐÚNG — đây là thứ ta muốn giữ");
ca("Duc-Auto-ChatGPT-Template-V1.xlsx", ZIP, "khong-phai", "workbook mẫu, tên thật");
ca("16f87e2b-3d75-4a5d-9cee-884f1c7b732", AUDIT, "khong-phai", "GUID thiếu một ký tự");
ca("16f87e2b-3d75-4a5d-9cee-884f1c7b732a-x", AUDIT, "khong-phai", "GUID có đuôi lạ dán thêm");
ca("zzzzzzzz-3d75-4a5d-9cee-884f1c7b732a", AUDIT, "khong-phai", "đúng hình dạng mà không phải hex");
ca("16f87e2b-3d75-4a5d-9cee-884f1c7b732a", B("khong phai json"), "khong-phai", "tên GUID trần mà nội dung không phải JSON");
ca("16f87e2b-3d75-4a5d-9cee-884f1c7b732a", B('{"a":1,"b":2}'), "khong-phai", "JSON nhưng không mang chữ ký sổ audit");

/* ---- BUG THẬT, tìm ra ở lượt chạy đầu tiên trên thư mục Tải xuống của Đức.

   Bản đầu của bộ phân loại cắt dòng đầu rồi `JSON.parse` nó. Nhưng dòng đầu
   của một sổ audit thật DÀI HƠN đoạn đầu file mà công cụ đọc, nên chuỗi bị
   cắt giữa, parse ném, và **12 sổ audit thật bị xếp vào nhóm "được bảo vệ"**.
   Hỏng an toàn — không xoá sai gì — nhưng nó vô hiệu hoá cả công cụ: nhóm ①
   chỉ còn 4 file thay vì 16.

   Hai ca dưới đây ghim cái đó lại. Ca đầu là chuỗi CẮT GIỮA một khoá JSON,
   đúng hình dạng đã gặp thật. */
const AUDIT_CAT = B('{"timestamp":"2026-09-03T18:41:43.472Z","run_id":"20260903-1841-bridge","job_id":null,"attempt_id":null,"event":"BRIDGE_JOB_ADDED_DIRECT","attempt":null,"pha');
ca("bd00d527-e43a-4806-bb1b-df5c59f6aa19", AUDIT_CAT, "so-audit", "sổ audit thật, dòng đầu BỊ CẮT — chữ ký vẫn đủ");
assert.throws(() => JSON.parse(String(AUDIT_CAT)), "ca này chỉ có nghĩa nếu chuỗi đó THẬT SỰ không parse được");
n += 1;
ca("16f87e2b-3d75-4a5d-9cee-884f1c7b732a.png", ZIP, "khong-phai", "đuôi .png mà nội dung là ZIP");
ca("16f87e2b-3d75-4a5d-9cee-884f1c7b732a.xlsx", PNG, "khong-phai", "đuôi .xlsx mà nội dung là PNG");
ca("16f87e2b-3d75-4a5d-9cee-884f1c7b732a.exe", B("MZ"), "khong-phai", "gói này không sinh .exe");

/* Ca này ghim ĐỘT BIẾN M1, cái duy nhất thoát lưới ở lượt thử phá đầu (6/7).
   M1 thêm `.pdf` vào `DUOI_CUA_GOI`. Bản đầu để nhánh xlsx làm catch-all, nên
   `.pdf` lặng lẽ bị đối xử như workbook — và một `.pdf` mang chữ ký ZIP sẽ
   thành "xoá được với cờ phụ". Bây giờ mỗi đuôi có nhánh riêng, còn lại GIỮ. */
ca("2b6cb294-a4f7-4d96-b489-a5058474c683.pdf", ZIP, "khong-phai", "M1: .pdf mang chữ ký ZIP vẫn phải được GIỮ");

/* ---- quét thật trên một thư mục tạm: phải phân đúng ba nhóm, không đi vào thư mục con ---- */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "don-rac-"));
try {
  fs.writeFileSync(path.join(tmp, "16f87e2b-3d75-4a5d-9cee-884f1c7b732a"), AUDIT);
  fs.writeFileSync(path.join(tmp, "bd00d527-e43a-4806-bb1b-df5c59f6aa19.png"), PNG);
  fs.writeFileSync(path.join(tmp, "2b6cb294-a4f7-4d96-b489-a5058474c683.pdf"), B("%PDF-1.7"));
  fs.writeFileSync(path.join(tmp, "bao-cao-cua-Duc.xlsx"), ZIP);
  fs.mkdirSync(path.join(tmp, "05a491ce-623c-4d7a-bb81-f677686cf7ec"));   // THƯ MỤC tên GUID

  const kq = quet(tmp);
  assert.deepEqual(kq["so-audit"].map((f) => f.ten), ["16f87e2b-3d75-4a5d-9cee-884f1c7b732a"]);
  assert.deepEqual(kq["can-mat"].map((f) => f.ten), ["bd00d527-e43a-4806-bb1b-df5c59f6aa19.png"]);
  assert.deepEqual(kq["khong-phai"].map((f) => f.ten), ["2b6cb294-a4f7-4d96-b489-a5058474c683.pdf"]);
  n += 3;

  // Một thư mục mang tên GUID không được lọt vào bất kỳ nhóm nào — `rmdir` một
  // thư mục có nội dung sẽ ném, nhưng nếu nó lọt vào nhóm ① thì công cụ đã
  // đứng đúng ở chỗ định xoá nó.
  const moiTen = [...kq["so-audit"], ...kq["can-mat"], ...kq["khong-phai"]].map((f) => f.ten);
  assert.ok(!moiTen.includes("05a491ce-623c-4d7a-bb81-f677686cf7ec"), "thư mục tên GUID phải bị bỏ hẳn");
  assert.ok(!moiTen.includes("bao-cao-cua-Duc.xlsx"), "file tên thật không phải là ứng viên");
  n += 2;
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }

/* ---- CHẠY THẬT công cụ, ba lượt, vào thư mục tạm ----

   Bản đầu của khối này là bốn khẳng định TĨNH trên mã nguồn (có nhánh
   `if (!co("--xoa"))`, nhánh đó đứng trước `unlinkSync`, v.v.). Một trong
   bốn cái báo ĐỎ OAN ngay lượt chạy đầu: nó thấy chữ `khong-phai` nằm gần
   `unlinkSync` và kết luận nhóm ③ ở trong đường xoá — trong khi đó chỉ là
   dòng BÁO CÁO "nhóm ③ không bị đụng".

   Đúng bài học đắt nhất của gói này (`B-36`): một phép kiểm khẳng định
   *hình dạng mã* thì không phân biệt được hai nhánh, nên nó vừa báo oan
   vừa để lọt. Thay bằng: gọi công cụ như người dùng gọi, rồi xem file nào
   còn trên đĩa. */
const SCRIPT = fileURLToPath(new URL("../scripts/don-rac-tai-xuong.mjs", import.meta.url));

function dungSan() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "don-rac-chay-"));
  fs.writeFileSync(path.join(d, "16f87e2b-3d75-4a5d-9cee-884f1c7b732a"), AUDIT);       // ①
  fs.writeFileSync(path.join(d, "bd00d527-e43a-4806-bb1b-df5c59f6aa19.png"), PNG);     // ②
  fs.writeFileSync(path.join(d, "2b6cb294-a4f7-4d96-b489-a5058474c683.pdf"), B("%PDF-1.7")); // ③
  fs.writeFileSync(path.join(d, "bao-cao-cua-Duc.xlsx"), ZIP);                          // ngoài diện
  return d;
}
const chay = (d, ...co) => execFileSync(process.execPath, [SCRIPT, "--thu-muc", d, ...co], { encoding: "utf8" });
const con = (d, ten) => fs.existsSync(path.join(d, ten));

// Lượt 1 — KHÔNG có --xoa: mặc định phải là chỉ xem, không file nào mất.
let san = dungSan();
try {
  const ra = chay(san);
  assert.match(ra, /CHỈ XEM/, "lượt không có --xoa phải nói rõ là đang chỉ xem");
  assert.equal(fs.readdirSync(san).length, 4, "chế độ chỉ xem không được xoá gì");
  n += 2;
} finally { fs.rmSync(san, { recursive: true, force: true }); }

// Lượt 2 — --xoa: chỉ nhóm ① mất. Nhóm ② và ③ phải còn nguyên.
san = dungSan();
try {
  chay(san, "--xoa");
  assert.ok(!con(san, "16f87e2b-3d75-4a5d-9cee-884f1c7b732a"), "nhóm ① phải bị xoá");
  assert.ok(con(san, "bd00d527-e43a-4806-bb1b-df5c59f6aa19.png"), "nhóm ② KHÔNG được xoá khi thiếu cờ riêng");
  assert.ok(con(san, "2b6cb294-a4f7-4d96-b489-a5058474c683.pdf"), "nhóm ③ KHÔNG BAO GIỜ được xoá");
  assert.ok(con(san, "bao-cao-cua-Duc.xlsx"), "file tên thật không được đụng");
  n += 4;
} finally { fs.rmSync(san, { recursive: true, force: true }); }

// Lượt 3 — --xoa --ca-anh-va-workbook: nhóm ② cũng mất, nhóm ③ VẪN còn.
san = dungSan();
try {
  chay(san, "--xoa", "--ca-anh-va-workbook");
  assert.ok(!con(san, "16f87e2b-3d75-4a5d-9cee-884f1c7b732a"), "nhóm ① phải bị xoá");
  assert.ok(!con(san, "bd00d527-e43a-4806-bb1b-df5c59f6aa19.png"), "nhóm ② phải bị xoá khi có cờ riêng");
  assert.ok(con(san, "2b6cb294-a4f7-4d96-b489-a5058474c683.pdf"), "nhóm ③ KHÔNG BAO GIỜ được xoá, kể cả với mọi cờ");
  assert.ok(con(san, "bao-cao-cua-Duc.xlsx"), "file tên thật không được đụng");
  n += 4;
} finally { fs.rmSync(san, { recursive: true, force: true }); }

console.log(`don-rac-tai-xuong-smoke: ${n} khẳng định, tất cả đạt`);
