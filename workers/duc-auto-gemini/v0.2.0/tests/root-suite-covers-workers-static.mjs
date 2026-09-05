/* G-09 — `npm test` Ở GỐC REPO PHẢI CHẠY SUITE CỦA MỌI WORKER, KHÔNG CHỈ MỘT.
 *
 * Đo ngày 2026-09-05 trước khi vá: `package.json` gốc gọi ĐÍCH DANH đúng một suite worker
 * (`duc-auto-chatgpt/v0.1.0`, 107 file) rồi 13 file test gốc. Ba suite còn lại —
 * `duc-auto-gemini/v0.1.0` (19 file), `duc-auto-gemini/v0.2.0` (86 file),
 * `duc-auto-gg-flow-video/v0.1.0` (96 file) — KHÔNG chạy một dòng nào. Tức `npm test` xanh
 * sau khi chạy 120 trong 321 file test (37%). Sau khi vá: 322/322, exit 0.
 * Đó là XANH GIẢ: ai chỉ chạy `npm test` sẽ tưởng cả repo đã xanh.
 *
 * (Số trên là ảnh chụp, sẽ cũ đi. Đo lại bằng chính phép ghim này: nó đếm từ đĩa, không tin số.)
 *
 * GỐC BỆNH KHÔNG PHẢI "quên Gemini" — mà là danh sách suite được GÕ TAY. Thêm worker mới thì
 * nó lại lọt ra ngoài, im lặng, y hệt lần này. Nên phép ghim này kiểm ĐIỀU KIỆN CHUNG: mọi
 * thư mục đơn vị có `tests/run-all.mjs` đều phải có mặt trong `scripts.test`. Thêm worker mà
 * quên nối → đỏ ngay, kèm đúng dòng cần dán vào.
 *
 * HÌNH DẠNG REPO LẤY TỪ `.repo-structure.json`, KHÔNG TỰ CHẾ `^workers/`. Repo này đã trả giá
 * một lần vì ba script cùng "biết" hình dạng repo bằng ba đoạn code chép tay, và hai trong ba
 * đã lệch nhau thật (26/08). Dùng lại `unitsFrom` / `unitDirsUnder` của `scripts/repo-structure.mjs`.
 *
 * VÌ SAO PHÉP GHIM NÀY NẰM TRONG GÓI GEMINI CHỨ KHÔNG Ở `tests/` GỐC: `tests/` thuộc khoá
 * `_code`, và lúc vá G-09 khoá đó đang do phiên khác giữ — luật mục 1 cấm ghi vào vùng của
 * người khác. Chỗ ở đúng của nó là `tests/root-suite-covers-workers-static.mjs`; đã ghi nợ
 * vào `BACKLOG.md` mục G-09.
 *
 * MỘT LỖ ĐÃ CÂN, KHÔNG PHẢI BỎ SÓT: nếu ai xoá đúng dòng gọi suite GEMINI khỏi `scripts.test`
 * thì `npm test` không chạy tới file này nữa, nên `npm test` không bắt được. Nhưng cổng đóng
 * phiên bắt: `session-check.mjs` chạy `workers/<gói>/<bản>/tests/run-all.mjs` THẲNG cho lane
 * đang giữ gói, không đi qua `scripts.test`. Ba dòng suite kia thì `npm test` bắt được ngay.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { unitsFrom, unitDirsUnder, readStructureFromDisk } from "../../../../scripts/repo-structure.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..", "..");

let passed = 0;
const ok = (name) => { passed += 1; console.log(`  ok  ${name}`); };

const units = unitsFrom(readStructureFromDisk(ROOT));
const listDirs = (rel) => {
  try {
    return fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true })
      .filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch { return []; }
};

/* Mọi thư mục đơn vị của repo, đi xuống đúng số tầng đã khai (không đoán "luôn có tầng phiên bản"). */
const unitDirs = units.rootDir === null
  ? []
  : listDirs(units.rootDir).flatMap((name) => unitDirsUnder(`${units.rootDir}/${name}`, units, listDirs));

const suites = unitDirs
  .map((dir) => `${dir}/tests/run-all.mjs`)
  .filter((rel) => fs.existsSync(path.join(ROOT, rel)))
  .sort();

const testScript = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"))?.scripts?.test ?? "";

/* ---- 1. có suite để mà kiểm ---------------------------------------------- */
{
  assert.ok(suites.length >= 2, `Chỉ tìm thấy ${suites.length} suite worker — phép ghim này mất tác dụng. Kiểm lại khối \`units\` trong .repo-structure.json.`);
  ok(`tìm thấy ${suites.length} suite worker theo hình dạng khai trong .repo-structure.json`);
}

/* ---- 2. `npm test` gốc gọi ĐỦ mọi suite ---------------------------------- */
{
  const thieu = suites.filter((rel) => !testScript.includes(rel));
  assert.deepEqual(
    thieu,
    [],
    `\`scripts.test\` trong package.json gốc KHÔNG chạy ${thieu.length} suite worker: ${thieu.join(", ")}.\n`
    + `Đó là XANH GIẢ — \`npm test\` báo xanh mà chưa chạy một dòng nào của chúng.\n`
    + `Sửa: thêm vào \`scripts.test\` các đoạn sau, nối bằng \` && \`:\n`
    + thieu.map((rel) => `  node ${rel}`).join("\n")
  );
  ok(`\`npm test\` gốc chạy đủ cả ${suites.length} suite worker`);
}

/* ---- 3. suite của CHÍNH GÓI NÀY có mặt — đúng lỗ G-09 đã đo -------------- */
{
  const cuaToi = path.relative(ROOT, path.join(HERE, "run-all.mjs")).split(path.sep).join("/");
  assert.ok(
    testScript.includes(cuaToi),
    `Suite của gói Gemini (${cuaToi}) không có trong \`scripts.test\`. Đây đúng là lỗ G-09 đã đo ngày 05/09 — đừng để nó quay lại.`
  );
  ok("suite của gói Gemini có tên trong `scripts.test`");
}

console.log(`\nroot-suite-covers-workers-static: ${passed} passed`);
