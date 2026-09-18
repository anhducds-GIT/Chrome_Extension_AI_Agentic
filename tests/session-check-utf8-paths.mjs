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
//  - Bỏ .map(unquote) trong commitChuaDay -> phần 3 đỏ (ca HÀNH VI, repo thật).
//  - Nếu một ngày git đổi hành vi mặc định -> phần 1 đỏ, và lúc đó phải đọc lại
//    cả ba phần chứ đừng vá mù.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { claimPrefixesFrom, readStructureFromDisk, stewardOf } from "../scripts/repo-structure.mjs";

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

/* ---- 3. QUY CHỦ SỞ HỮU: đường dẫn tiếng Việt phải về ĐÚNG package -------
 *
 * Phép đếm commit chưa đẩy đã DỜI NHÀ hai lần: `safe-push.mjs` → `commitChuaDay` trong
 * `repo-structure.mjs` (TRA-KHOA-01, 06/09) → nay nằm **trong `scripts/claim.mjs`**, nhánh
 * `--release`. `commitChuaDay` và `CHUA_DAY` không còn tồn tại; bài này chết ngay dòng `import`
 * từ lượt migrate `4da1e9e5` và bị đẩy vào khu cách ly (N-65).
 *
 * ĐO 2026-09-18, ngay khi bài được mở lại: nhà MỚI gọi `git log --name-only` **không kèm**
 * `core.quotepath=false` và không bỏ nháy — tức đúng con bug 26/08 đã trở lại, ở một file khác.
 * Số đo trên một repo dựng thật, commit chạm `workers/Tạo Ảnh tô màu/v1/x.txt`:
 *     không cờ → "workers/T\341\272\241o …"  → stewardOf = `_root`      ← QUY CHỤP SAI
 *     có  cờ → "workers/Tạo Ảnh tô màu/…"    → stewardOf = đúng package
 * Hậu quả: `--release` giữ `_root` của MỌI lane và tha đúng vùng đang nợ. Đã vá cùng lượt này.
 *
 * Ghim HAI vế, cố ý không chỉ ghim chuỗi:
 *   ⑴ HÀNH VI của bộ ba git + bỏ nháy + `stewardOf` — ca dựng được thật trên Windows.
 *   ⑵ CHUỖI ở nhà mới: cờ phải có mặt đúng trên lượt `git log` đếm commit chưa đẩy. Giữ vế này
 *      vì ⑴ kiểm bộ ba nói chung, không kiểm được rằng CHÍNH lượt gọi đó mang cờ. */
{
  const kho = fs.mkdtempSync(path.join(os.tmpdir(), "dac-utf8-vung-"));
  try {
    const remote = path.join(kho, "origin.git");
    const work = path.join(kho, "lam-viec");
    execFileSync("git", ["init", "-q", "--bare", "-b", "main", remote], { encoding: "utf8" });
    execFileSync("git", ["clone", "-q", remote, work], { encoding: "utf8", stdio: "pipe" });
    const g = (...a) => execFileSync("git", a, { cwd: work, encoding: "utf8" });
    g("config", "user.name", "UTF8"); g("config", "user.email", "utf8@example.invalid");
    fs.writeFileSync(path.join(work, "README.md"), "x", "utf8");
    g("add", "-A"); g("commit", "-q", "-m", "nen"); g("push", "-q", "origin", "main");

    const goi = "Tạo Ảnh tô màu";
    fs.mkdirSync(path.join(work, "workers", goi, "v1"), { recursive: true });
    fs.writeFileSync(path.join(work, "workers", goi, "v1", TEN_TIENG_VIET), "y", "utf8");
    g("add", "-A"); g("commit", "-q", "-m", "them package ten tieng Viet");

    const lay = (...truoc) => g(...truoc, "log", "origin/main..HEAD", "--format=%x01%h %s", "--name-only")
      .split(String.fromCharCode(1)).filter(Boolean)
      .flatMap((khoi) => khoi.split(String.fromCharCode(10)).slice(1).filter(Boolean))
      .map((f) => f.replace(/^"|"$/g, ""));

    const ct = readStructureFromDisk(ROOT);
    const tienTo = claimPrefixesFrom(ct);
    const quy = (ds) => ds.map((f) => stewardOf(f, ct, tienTo));

    // Tiền đề: KHÔNG cờ thì git mã hoá octal, và lúc đó quy chủ sở hữu SAI. Tiền đề này đổi
    // (git đổi hành vi mặc định) thì phải đọc lại cả ba phần, đừng vá mù.
    /* Thiếu cờ thì `stewardOf` trả một KHOÁ VÙNG KHÔNG TỒN TẠI (`workers/Táº¡o …`)
     * — và cái đó tệ hơn `_root`: nó không khớp khoá nào, nên commit chưa đẩy thành **vô hình**
     * và `--release` cho qua trong im lặng. Ghim đúng hình dạng đó chứ đừng ghim `_root`: hai
     * ca sai khác nhau, và ghi sai ca thì phiên sau đi tìm sai chỗ. */
    const thieuCo = quy(lay());
    assert.notDeepEqual(thieuCo, [`workers/${goi}`],
      "tien de: thieu co thi KHONG duoc quy dung — ve nay do thi git da doi hanh vi mac dinh");
    assert.ok(/\\[0-9]{3}/.test(thieuCo[0]),
      "tien de: thieu co thi khoa vung chua chuoi octal — tuc mot khoa khong ai co");
    assert.deepEqual(quy(lay("-c", "core.quotepath=false")), [`workers/${goi}`],
      "co co thi commit phai quy ve DUNG package, khong roi ve _root va quy chup sai nguoi");
  } finally { fs.rmSync(kho, { recursive: true, force: true }); }
  ok("HÀNH VI: git + bỏ nháy + stewardOf quy commit tên tiếng Việt về đúng package");
}

{
  const nguon = fs.readFileSync(path.join(ROOT, "scripts/claim.mjs"), "utf8");
  const than = nguon.slice(nguon.indexOf("let chuaDay = null;"));
  assert.notEqual(than, "", "khong tim thay nhanh dem commit chua day trong claim.mjs — ghim dang tro vao khoang khong");
  assert.match(than, /execFileSync\("git",\s*\["-c",\s*"core\.quotepath=false",\s*"log"/,
    "luot `git log` dem commit chua day PHAI mang co core.quotepath=false — thieu no la quy chup sai vung");
  assert.match(than, /\.map\(boNhay\)/,
    "va phai bo nhay bao ngoai: git van boc nhay khi duong dan chua dau nhay kep, gach cheo nguoc hoac ky tu dieu khien");
  ok("claim.mjs: lượt đếm commit chưa đẩy mang cờ quotepath và bỏ nháy (nhà MỚI của N-65)");
}

console.log(`\n${passed} passed, 0 failed, ${passed} total`);
