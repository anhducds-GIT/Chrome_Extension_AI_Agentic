/* MỌI LƯỢT `import { X } from "./y.mjs"` PHẢI GIẢI ĐƯỢC — và khu cách ly phải ĐẾM ĐƯỢC (`N-68` ③).
 *
 * ══ VÌ SAO, và vì sao phép đo TRƯỚC NÓ chưa đủ ══
 *
 * `N-68` mở ra vì một lượt migrate bộ khung (`4da1e9e5`, 09/09) xoá mất hai cửa riêng của repo.
 * Lượt đo đầu so **bề mặt cờ** (`--cờ`) của 11 file bị thay và tìm được đúng hai cửa đó. Phép đo
 * ấy **mù** với thứ không khai bằng cờ: một hàm bị bỏ, một hằng số bị đổi tên, một nhánh rút gọn.
 *
 * Phép đo thứ hai, ở file này, hỏi một câu khác hẳn: **có ai đang `import` một cái tên không còn
 * tồn tại không?** Đo 18/09, nó ra con số mà phép so cờ không thấy:
 *
 *     9 cặp import gãy, trên ĐÚNG 8 file — và 8 file đó chính là khu cách ly `npm run test:chet`.
 *     0 file trong `scripts/` gãy.
 *
 * Hai câu đó cùng nhau đổi hẳn hình dạng của món nợ:
 *
 *   ⑴ **Không công cụ đang sống nào hỏng.** Phần lớn trong "119 ký hiệu biến mất" của phép đo
 *      trước là một lượt VIẾT LẠI, không phải thiệt hại.
 *   ⑵ **Khu cách ly 8 bài không phải 8 bài kiểm hỏng vặt.** Nó là **8 lớp bảo vệ mà thứ chúng
 *      canh đã bị xoá**. `build-overview-smoke.mjs` một mình `import` **44** cái tên không còn —
 *      đó không phải "hơi lệch API", đó là toàn bộ chủ thể của nó đã bị thay. Viết lại chúng
 *      trước hết là **quyết lớp bảo vệ nào còn đáng giữ**, không phải port mã.
 *
 * ══ PHÉP GHIM NÀY GHIM GÌ ══
 *
 * Nó KHÔNG đòi 8 bài kia phải sống lại — đó là việc của `N-65` và nó cần người quyết. Nó ghim
 * **cái hàng rào**: khu cách ly được phép tồn tại, nhưng **không được lớn thêm trong im lặng**,
 * và **không được giữ lại một bài đã lành**.
 *
 *   ① Một file NGOÀI khu cách ly mà có import gãy  → ĐỎ. Đây là cái sẽ nổ ở lượt migrate sau.
 *   ② Một file TRONG khu cách ly mà mọi import đã lành → ĐỎ. Nó phải ra khỏi khu, nếu không
 *      khu cách ly chỉ phình rồi thành chỗ chôn. (Vế ngược — thiếu nó thì một danh sách cách ly
 *      "cho chắc" sống mãi.)
 *   ③ Quét được ít hơn ngưỡng cặp import → ĐỎ. Một bộ dò không khớp gì báo XANH, và màu xanh đó
 *      nói *"regex chết"*, không nói *"repo lành"*.
 *
 * Chạy: `node tests/import-gay-smoke.mjs`
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* Ngưỡng neo. Đo 18/09: 85 cặp import có tên. Để 60 cho co giãn hai chiều — thấp hơn nữa nghĩa
   là bộ dò gãy, không phải repo gọn đi. */
const TOI_THIEU_CAP = 60;

/* ---- Khu cách ly: đọc từ `scripts.test:chet`, KHÔNG gõ lại danh sách -------------------- */

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const chuoiCachLy = pkg?.scripts?.["test:chet"] ?? "";
const CACH_LY = new Set(
  [...chuoiCachLy.matchAll(/tests\/([\w.-]+\.mjs)/g)].map((m) => `tests/${m[1]}`),
);
assert.ok(
  CACH_LY.size >= 1,
  "KHU_CACH_LY_RONG: không đọc được bài nào từ `scripts[\"test:chet\"]`. Hoặc khu cách ly đã hết "
    + "(thì gỡ luôn phép ghim này và đóng N-65), hoặc bộ đọc SAI — đừng đoán.",
);

/* ---- Quét mọi lượt import có tên --------------------------------------------------------- */

const FILE = execFileSync("git", ["ls-files", "scripts/*.mjs", "tests/*.mjs", "bang-trang-thai/*.mjs", "bang-song/*.mjs"], {
  cwd: ROOT, encoding: "utf8",
}).split("\n").filter(Boolean);

const nhu = (p) => `file:///${path.resolve(ROOT, p).replace(/\\/g, "/")}`;

let soCap = 0;
const gay = new Map();   // file → [lý do…]

for (const f of FILE) {
  const chu = fs.readFileSync(path.join(ROOT, f), "utf8");
  for (const d of chu.matchAll(/import\s*\{([^}]+)\}\s*from\s*["'](\.[^"']+)["']/g)) {
    soCap += 1;
    const ten = d[1].split(",").map((x) => x.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
    const dich = path.join(path.dirname(f), d[2]);
    const ghi = (ly) => { if (!gay.has(f)) gay.set(f, []); gay.get(f).push(`${d[2]} — ${ly}`); };

    if (!fs.existsSync(path.join(ROOT, dich))) { ghi("file đích KHÔNG TỒN TẠI"); continue; }
    let mod;
    try { mod = await import(nhu(dich)); }
    catch (loi) { ghi(`nạp HỎNG: ${String(loi.message).slice(0, 70)}`); continue; }
    const thieu = ten.filter((t) => !(t in mod));
    if (thieu.length) ghi(`THIẾU XUẤT: ${thieu.join(" ")}`);
  }
}

assert.ok(
  soCap >= TOI_THIEU_CAP,
  `chỉ quét được ${soCap} cặp import (< ${TOI_THIEU_CAP}) — BỘ DÒ GÃY, không phải repo sạch.`,
);

/* ---- ① Gãy NGOÀI khu cách ly = đỏ -------------------------------------------------------- */

const gayNgoai = [...gay.keys()].filter((f) => !CACH_LY.has(f));
assert.equal(
  gayNgoai.length, 0,
  `IMPORT_GAY_NGOAI_KHU: ${gayNgoai.length} file đang import một cái tên KHÔNG CÒN TỒN TẠI, và `
    + `chúng không nằm trong khu cách ly \`npm run test:chet\`.\n`
    + `Đây đúng hình dạng thiệt hại của lượt migrate 4da1e9e5 (xem N-68). Xử: hoặc trả lại cái `
    + `bị mất, hoặc sửa nơi gọi — ĐỪNG nhét thêm vào khu cách ly cho xanh.\n`
    + gayNgoai.map((f) => `  ${f}\n${gay.get(f).map((l) => `      ${l}`).join("\n")}`).join("\n"),
);

/* ---- ② Đã lành mà vẫn nằm trong khu cách ly = đỏ ----------------------------------------- */

const daLanh = [...CACH_LY].filter((f) => !gay.has(f) && fs.existsSync(path.join(ROOT, f)));
assert.equal(
  daLanh.length, 0,
  `CON_TRONG_KHU_MA_DA_LANH: ${daLanh.length} bài không còn import gãy nhưng vẫn nằm trong `
    + `\`test:chet\`. Cho nó về \`scripts.test\` — một khu cách ly chỉ phình mà không bao giờ vơi `
    + `là chỗ chôn, không phải hàng rào.\n`
    + daLanh.map((f) => `  ${f}`).join("\n"),
);

/* ---- ③ Danh sách cách ly không được mục ---------------------------------------------------
 * Một tên trong `test:chet` mà file không còn trên đĩa nghĩa là danh sách đang nói về quá khứ. */

const mat = [...CACH_LY].filter((f) => !fs.existsSync(path.join(ROOT, f)));
assert.equal(
  mat.length, 0,
  `KHU_CACH_LY_MUC: ${mat.length} tên trong \`test:chet\` không còn trên đĩa: ${mat.join(", ")}`,
);

console.log(
  `import-gay-smoke: ${soCap} cặp import · ${gay.size} file gãy, tất cả trong khu cách ly `
    + `(${CACH_LY.size} bài) — XANH`,
);
