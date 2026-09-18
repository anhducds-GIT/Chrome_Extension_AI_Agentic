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
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* Ngưỡng neo. Đo 18/09: 85 cặp import có tên. Để 60 cho co giãn hai chiều — thấp hơn nữa nghĩa
   là bộ dò gãy, không phải repo gọn đi. */
const TOI_THIEU_CAP = 60;

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
assert.ok(!Object.keys(pkg.scripts ?? {}).some((k) => /^test:(chet|hong|cach-ly)/.test(k)),
  "khu cách ly đã sống lại trong package.json — N-65 đóng với hợp đồng \"mọi khu cách ly đều rỗng\".");

/* ---- Quét mọi lượt import có tên --------------------------------------------------------- */

const FILE = execFileSync("git", ["ls-files", "scripts/*.mjs", "tests/*.mjs", "bang-trang-thai/*.mjs", "bang-song/*.mjs"], {
  cwd: ROOT, encoding: "utf8",
}).split("\n").filter(Boolean);

const nhu = (p) => `file:///${path.resolve(ROOT, p).replace(/\\/g, "/")}`;

let soCap = 0;
const gay = new Map();   // file → [lý do…]

/* GỠ CHÚ THÍCH TRƯỚC KHI DÒ — và đây không phải đề phòng suông, phép ghim này đã tự cắn mình
   ngay lượt chạy đầu sau khi được commit: docblock của chính nó mang dòng ví dụ
   `import { X } from "./y.mjs"`, nên nó báo mình là một file có import gãy. Nó **không** cắn ở
   lượt chạy trước đó vì lúc ấy file chưa vào git, mà bộ quét đi qua `git ls-files` — tức một
   dương tính giả BIẾT CHỌN GIỜ, và giờ nó chọn là lượt commit. Một dòng `import` bị comment
   cũng không phải một lượt import thật, nên gỡ chú thích là đúng cả hai nghĩa. */
const goChuThich = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

for (const f of FILE) {
  const chu = goChuThich(fs.readFileSync(path.join(ROOT, f), "utf8"));
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

/* ---- ① KHÔNG FILE NÀO ĐƯỢC IMPORT MỘT CÁI TÊN KHÔNG CÒN TỒN TẠI -------------------------
 *
 * ĐƠN GIẢN ĐI 18/09 (N-65 đóng). Trước bản này, vế ① chỉ đỏ cho file NGOÀI khu cách ly, và hai
 * vế nữa (②③) chỉ để trông chừng chính cái danh sách miễn trừ ấy. Khu cách ly nay RỖNG — 8 bài
 * đã xử hết: 5 viết lại và về `npm test`, 3 DROP kèm bằng chứng. Nên danh sách miễn biến mất,
 * và cùng nó biến mất cả hai vế chỉ sinh ra để canh nó.
 *
 * Còn lại đúng một câu, và là câu đáng giá nhất: **không ai được import một cái tên đã chết.**
 * Không miễn cho ai. Đây là hình dạng thiệt hại của lượt migrate `4da1e9e5` (N-68) — 9 cặp
 * import gãy trên 8 file, và cả 8 file ấy là bài kiểm, nên **không một lớp bảo vệ nào kêu**
 * suốt 9 ngày. Một danh sách miễn trừ là cách chính xác để chuyện đó xảy ra lần nữa. */

const gayHet = [...gay.keys()];
assert.equal(
  gayHet.length, 0,
  `IMPORT_GAY: ${gayHet.length} file đang import một cái tên KHÔNG CÒN TỒN TẠI.\n`
    + `Đây đúng hình dạng thiệt hại của lượt migrate 4da1e9e5 (xem N-68). Xử: hoặc trả lại cái `
    + `bị mất, hoặc sửa nơi gọi. KHÔNG có danh sách miễn trừ — N-65 đóng khu cách ly 18/09.\n`
    + gayHet.map((f) => `  ${f}\n${gay.get(f).map((l) => `      ${l}`).join("\n")}`).join("\n"),
);

console.log(`import-gay-smoke: ${soCap} cặp import · 0 file gãy · 0 khu cách ly — XANH`);