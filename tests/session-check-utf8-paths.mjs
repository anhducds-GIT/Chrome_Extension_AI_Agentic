// Test ghim — cổng kiểm phải ĐỌC ĐÚNG đường dẫn tiếng Việt.
//
// Lỗi thật ngày 26/08/2026: thư mục "Pilot-07-Tạo Ảnh tô màu" đã được khai đầy
// đủ vào Bản đồ file, nhưng cổng vẫn báo đỏ. Nguyên nhân: git mặc định mã hoá
// mọi ký tự không phải ASCII thành octal, nên `git status --porcelain` trả về
// "Pilot-07-T\341\272\241o \341\272\242nh t\303\264 m\303\240u". Cổng đem chuỗi
// mã hoá đó so với tên thật trong AGENTS.md nên không bao giờ khớp.
//
// Hậu quả nếu tái phát: MỌI thư mục đặt tên tiếng Việt đều bị báo đỏ oan —
// mà chủ dự án là người Việt và đặt tên thư mục bằng tiếng Việt. Phiên sau gặp
// đỏ oan sẽ có động cơ đi sửa cổng cho nó xanh, đúng thứ luật cấm.
//
// Test này phá được theo cả hai chiều:
//  - Bỏ "-c core.quotepath=false" khỏi scripts -> phần 2 đỏ.
//  - Bỏ .map(unquote) trong safe-push -> phần 3 đỏ.
//  - Nếu một ngày git đổi hành vi mặc định -> phần 1 đỏ, và lúc đó phải đọc lại
//    cả ba phần chứ đừng vá mù.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TEN_TIENG_VIET = "Tạo Ảnh tô màu.txt";
let passed = 0;
const ok = (name) => { passed += 1; console.log(`  ok  ${name}`); };

/* ---- 1. Hành vi git: cờ này THẬT SỰ cần thiết --------------------------- */
// Dựng một repo git dùng một lần trong thư mục tạm của hệ điều hành, không
// đụng gì tới repo thật.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dac-utf8-"));
try {
  const g = (...a) => execFileSync("git", a, { cwd: tmp, encoding: "utf8" });
  g("init", "--quiet");
  fs.writeFileSync(path.join(tmp, TEN_TIENG_VIET), "x");

  const macDinh = g("status", "--porcelain");
  const daSua = g("-c", "core.quotepath=false", "status", "--porcelain");

  assert.ok(
    !macDinh.includes(TEN_TIENG_VIET),
    "Tiền đề của test đã đổi: git mặc định KHÔNG còn mã hoá octal nữa. Đọc lại cả ba phần trước khi sửa."
  );
  ok("git mặc định mã hoá tên tiếng Việt thành octal (nên cờ là cần thiết)");

  assert.ok(
    daSua.includes(TEN_TIENG_VIET),
    "core.quotepath=false phải trả về tên thật, không phải octal"
  );
  ok("core.quotepath=false trả về tên tiếng Việt đọc được");

  // Cổng bỏ dấu nháy bao ngoài rồi mới so tên -> chuỗi sau khi bỏ nháy phải
  // đúng bằng tên thật, không thừa không thiếu.
  const duongDan = daSua.split("\n").filter(Boolean)[0].slice(3).replace(/^"|"$/g, "");
  assert.equal(duongDan, TEN_TIENG_VIET, "sau khi bỏ dấu nháy phải ra đúng tên file");
  ok("bỏ dấu nháy bao ngoài xong thì khớp tên thật");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

/* ---- 2. Cả hai script đều phải xin git trả tên thật --------------------- */
for (const file of ["scripts/session-check.mjs", "scripts/safe-push.mjs"]) {
  const src = fs.readFileSync(path.join(ROOT, file), "utf8");
  assert.ok(
    /execFileSync\("git",\s*\["-c",\s*"core\.quotepath=false",\s*\.\.\.a\]/.test(src),
    `${file} phải gọi git kèm -c core.quotepath=false, nếu không đường dẫn tiếng Việt sẽ về dạng octal`
  );
  ok(`${file} gọi git với core.quotepath=false`);
}

/* ---- 3. safe-push phải bỏ dấu nháy trước khi quy chủ sở hữu ------------- */
// Không bỏ nháy thì dòng bắt đầu bằng dấu " nên regex ^workers/ trượt, và
// commit bị quy nhầm cho "_root" thay vì đúng package -> quy chụp sai người.
const safePush = fs.readFileSync(path.join(ROOT, "scripts/safe-push.mjs"), "utf8");
assert.ok(/const unquote = /.test(safePush), "safe-push phải có hàm bỏ dấu nháy");
assert.ok(
  /show",\s*"--name-only".*\.map\(unquote\)/.test(safePush),
  "safe-push phải bỏ dấu nháy cho danh sách file trước khi quy chủ sở hữu"
);
ok("safe-push bỏ dấu nháy trước khi quy chủ sở hữu commit");

console.log(`\n${passed} passed, 0 failed, ${passed} total`);
