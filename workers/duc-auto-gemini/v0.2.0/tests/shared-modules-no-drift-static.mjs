/* G-08 — BẢY MODULE CÒN GIỐNG HỆT GIỮA HAI NHÁNH PHẢI TIẾP TỤC GIỐNG HỆT.
 *
 * BỆNH: hai nhánh (`duc-auto-chatgpt` và `duc-auto-gemini`) giữ hai bản của cùng một module.
 * Sửa một bên quên bên kia thì hai bản trôi dạt, và KHÔNG AI HAY — vì con số duy nhất nói về
 * chuyện đó nằm trong `FEATURE-PARITY.md`, một tài liệu người ta đọc chứ không phải một cái
 * chuông kêu.
 *
 * ĐÃ XẢY RA THẬT, ĐO ĐƯỢC (07/09, phiên `claude-gemini-g08`):
 *   27/08  `FEATURE-PARITY.md` ghi **8** file giống hệt — có `xlsx-codec.js`.
 *   28/08  cùng khối đó ghi **7** — `xlsx-codec.js` biến mất khỏi danh sách.
 *   07/09  đo lại trên đĩa: đúng 7, và `xlsx-codec.js` nay lệch 7 dòng (371 GPT / 364 Gemini).
 * Một module trôi dạt, con số trong tài liệu tự cập nhật đúng, và mười ngày sau vẫn chưa ai
 * biết bản nào là bản đúng. Đó chính xác là cái phép ghim này chặn: bộ sinh GHI LẠI sự trôi
 * dạt, phép ghim CHẶN nó.
 *
 * VÌ SAO GHIM DANH SÁCH CỨNG chứ không "so mọi file trùng tên": 24 file trùng tên đã khác
 * nhau CÓ CHỦ ĐÍCH (hai nhà cung cấp, hai DOM, hai bộ tính năng). Ghim tất cả là đỏ vĩnh viễn,
 * mà đỏ vĩnh viễn thì người ta tắt. Bảy cái dưới đây là bảy cái đã chứng minh được rằng chúng
 * KHÔNG cần khác nhau.
 *
 * ĐỎ THÌ LÀM GÌ: đừng chép bản này đè bản kia — đó chính là cách bản trôi dạt ra đời. Đọc cả
 * hai bản, xác định thay đổi thuộc về một nhánh hay cả hai, rồi hoặc port sang nhánh kia,
 * hoặc gỡ tên file khỏi danh sách dưới đây kèm một dòng nói vì sao nó được phép khác.
 *
 * ĐẾM MỎ NEO: phép ghim này đếm số CẶP file thực sự mở và so được. Không đủ bảy cặp thì ĐỎ,
 * không phải "không có gì để sửa" — thiếu file một bên cũng là trôi dạt, và một công cụ đo
 * hỏng thì im lặng giống hệt một repo lành.
 *
 * SO SAU KHI CHUẨN HOÁ CRLF→LF, cùng cách `scripts/feature-parity.mjs` đo. Repo đặt
 * `core.autocrlf=true`, nên bản trên đĩa đổi kiểu xuống dòng theo từng lượt checkout — so byte
 * trần sẽ đỏ oan sau một lượt checkout mà không dòng code nào đổi.
 *
 * CHỈ ĐỌC NHÁNH KIA. Gói `duc-auto-chatgpt` là vùng của lane khác (luật mục 1 của `AGENTS.md`
 * gốc): phép ghim này mở file bên đó để so, không ghi một byte nào vào đó.
 */

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GEMINI = path.resolve(HERE, "..");
const ROOT = path.resolve(HERE, "..", "..", "..", "..");

/* Hợp đồng: bảy module này phải giống hệt nhau ở cả hai nhánh. */
const SHARED = [
  "attempt-identity-core.js",
  "attempt-telemetry-core.js",
  "audit-chain-core.js",
  "bridge-pairing-core.js",
  "recreate-core.js",
  "run-state-core.js",
];

/* `reconciliation-core.js` RỜI danh sách "giống hệt" ngày 09/09 (N-60) — cửa thứ ba mà chính
   phần đầu file này nêu. Lý do, và nó là lý do THẬT chứ không phải để cổng xanh:
   `duc-auto-chatgpt` mọc thêm ~40 dòng đối soát chữ cho `text_reasoning` (B-43, commit
   `478b24aa`). **Gói Gemini không có tính năng đó** — không `text-output-core.js`, không một
   tham chiếu `text_reasoning` nào. Port sang là nhét mã chết cho một tính năng không tồn tại,
   tệ hơn hẳn sự trôi dạt.

   ĐỔI LẠI TA MẤT GÌ, nói ra chứ không giấu: bốn hàm dùng chung trong module đó chở logic
   attribution và exact-once, và nay chúng KHÔNG còn được canh từng byte. Cái giữ lại dưới đây
   là guard HẸP HƠN — bề mặt export phải khớp — nên nó bắt được "một nhánh xoá mất một hàm
   dùng chung", nhưng KHÔNG bắt được "một nhánh sửa ruột một hàm". Nợ đó ghi ở `N-60`. */
const CHUNG_BE_MAT = {
  "reconciliation-core.js": ["proofFromRecordedAttempt", "verifyExistingOutput", "matchesRequest", "safeComplete"],
};

let passed = 0;
const ok = (name) => { passed += 1; console.log(`  ok  ${name}`); };

/* Nhánh kia: lấy thư mục phiên bản từ đĩa, đừng gõ cứng `v0.1.0` — đổi phiên bản là phép ghim
   im lặng không tìm thấy file nữa, mà "không tìm thấy" phải ĐỎ chứ không được thành SKIP. */
const GPT_PKG = path.join(ROOT, "workers", "duc-auto-chatgpt");
const gptVersions = fs.existsSync(GPT_PKG)
  ? fs.readdirSync(GPT_PKG, { withFileTypes: true })
      .filter((e) => e.isDirectory() && /^v\d/.test(e.name)).map((e) => e.name).sort()
  : [];
assert.ok(gptVersions.length > 0, `khong tim thay thu muc phien ban nao trong ${GPT_PKG}`);
const GPT = path.join(GPT_PKG, gptVersions[gptVersions.length - 1]);
ok(`nhanh kia: ${path.relative(ROOT, GPT).split(path.sep).join("/")}`);

const norm = (file) =>
  crypto.createHash("sha256").update(fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n")).digest("hex");

let anchors = 0;
const drifted = [];
const missing = [];

for (const name of SHARED) {
  const a = path.join(GPT, name);
  const b = path.join(GEMINI, name);
  if (!fs.existsSync(a) || !fs.existsSync(b)) {
    missing.push(`${name} — ${fs.existsSync(a) ? "thieu ben Gemini" : "thieu ben GPT"}`);
    continue;
  }
  anchors += 1;
  if (norm(a) !== norm(b)) drifted.push(name);
}

/* ĐẾM MỎ NEO trước khi kết luận. Không đủ cặp = công cụ đo hỏng, không phải repo lành. */
assert.equal(
  missing.length, 0,
  `thieu file o mot ben — day cung la troi dat:\n    ${missing.join("\n    ")}`,
);
assert.equal(
  anchors, SHARED.length,
  `chi so duoc ${anchors}/${SHARED.length} cap — phep ghim da truot, KHONG phai "khong co gi de sua"`,
);
ok(`so du ${anchors}/${SHARED.length} cap module`);

assert.equal(
  drifted.length, 0,
  `module da TROI DAT giua hai nhanh:\n    ${drifted.join("\n    ")}\n` +
  "  Dung chep ban nay de ban kia. Doc ca hai ban, port thay doi, hoac go ten file khoi\n" +
  "  danh sach SHARED trong chinh file test nay kem mot dong noi vi sao no duoc phep khac.",
);
ok(`${SHARED.length} module con giong het (chuan hoa CRLF/LF)`);

/* GUARD HẸP cho module đã rời danh sách trên: hai nhánh vẫn phải khai CÙNG bộ tên dùng chung.
   Yếu hơn so-từng-byte, nhưng khác hẳn KHÔNG CÓ GÌ — nó chặn đúng ca "xoá một hàm ở một bên". */
for (const [name, ten] of Object.entries(CHUNG_BE_MAT)) {
  for (const [nhan, thuMuc] of [["GPT", GPT], ["Gemini", GEMINI]]) {
    const duong = path.join(thuMuc, name);
    assert.ok(fs.existsSync(duong), `${name} thieu o nhanh ${nhan} — do cung la troi dat`);
    const src = fs.readFileSync(duong, "utf8");
    /* `includes`, KHONG regex: `\b` trong template literal JS la ky tu BACKSPACE chu khong
       phai ranh gioi tu — vap that 09/09, lan thu ba cua cung ho loi do. Ten ham o day du dac
       trung nen khong can ranh gioi tu. */
    const thieu = ten.filter((t) => !src.includes(t));
    assert.equal(
      thieu.length, 0,
      `${name} o nhanh ${nhan} khong con khai: ${thieu.join(", ")}
` +
      "  Module nay duoc phep khac RUOT giua hai nhanh, nhung KHONG duoc mat mot ten dung chung.",
    );
  }
}
ok(`be mat export van khop cho ${Object.keys(CHUNG_BE_MAT).length} module duoc phep khac ruot`);

console.log(`\n${passed} checks passed`);
