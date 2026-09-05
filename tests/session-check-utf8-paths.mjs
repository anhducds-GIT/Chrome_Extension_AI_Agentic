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

import { CHUA_DAY, commitChuaDay } from "../scripts/repo-structure.mjs";

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

/* ---- 3. Bỏ dấu nháy trước khi quy chủ sở hữu ---------------------------- */
// Không bỏ nháy thì dòng bắt đầu bằng dấu " nên regex ^workers/ trượt, và
// commit bị quy nhầm cho "_root" thay vì đúng package -> quy chụp sai người.
//
// TRA-KHOA-01, 06/09: phép này TỪNG chỉ ghim CHUỖI NGUỒN của `safe-push.mjs`. Khi phép đếm
// commit chuyển về `commitChuaDay` trong `repo-structure.mjs` (để `claim.mjs --release` dùng
// chung, thay vì đẻ ra bản thứ hai), ghim chuỗi đó đỏ ngay — dù hành vi không đổi một chút nào.
// Nên phép ghim chuỗi được TRỎ LẠI đúng file nay làm việc đó, và thêm một ca HÀNH VI bên dưới.
//
// VÌ SAO VẪN GIỮ CẢ GHIM CHUỖI, dù MULTIFLOW mục 5 dặn ghim hành vi: ĐO THẬT hôm nay — gỡ
// `.map(unquote)` khỏi `commitChuaDay` rồi chạy ca hành vi bên dưới thì nó VẪN XANH. Lý do:
// với `core.quotepath=false`, git chỉ bọc nháy khi đường dẫn chứa dấu nháy kép, dấu gạch chéo
// ngược hoặc ký tự điều khiển — mà Windows CẤM cả ba trong tên file, nên ca đó không dựng được
// ở đây. Bỏ ghim chuỗi để lấy một ca hành vi "đẹp hơn" là gỡ một lớp bảo vệ đang chạy được và
// thay bằng một lớp không với tới — luật vàng 3.
const nguonQuyVung = fs.readFileSync(path.join(ROOT, "scripts/repo-structure.mjs"), "utf8");
const thanCommitChuaDay = nguonQuyVung.slice(nguonQuyVung.indexOf("export function commitChuaDay("));
assert.ok(thanCommitChuaDay !== "", "khong tim thay commitChuaDay — phep ghim nay dang tro vao khoang khong");
assert.ok(/const unquote = /.test(thanCommitChuaDay), "commitChuaDay phải có hàm bỏ dấu nháy");
assert.ok(
  /show",\s*"--name-only".*\.map\(unquote\)/.test(thanCommitChuaDay),
  "commitChuaDay phải bỏ dấu nháy cho danh sách file trước khi quy chủ sở hữu"
);
ok("commitChuaDay bỏ dấu nháy trước khi quy chủ sở hữu commit (ghim chuỗi — ca hành vi không với tới trên Windows)");

{
  const kho = fs.mkdtempSync(path.join(os.tmpdir(), "dac-utf8-vung-"));
  try {
    const remote = path.join(kho, "origin.git");
    const work = path.join(kho, "lam-viec");
    execFileSync("git", ["init", "-q", "--bare", "-b", "main", remote], { encoding: "utf8" });
    execFileSync("git", ["clone", "-q", remote, work], { encoding: "utf8" });
    const g = (...a) => execFileSync("git", a, { cwd: work, encoding: "utf8" });
    g("config", "user.name", "UTF8"); g("config", "user.email", "utf8@example.invalid");

    // Nền: một commit đã đẩy, để `origin/main` phân giải được.
    fs.writeFileSync(path.join(work, "README.md"), "x", "utf8");
    g("add", "-A"); g("commit", "-q", "-m", "nen"); g("push", "-q", "origin", "main");

    // Rồi một commit CHƯA ĐẨY, chạm một package có tên tiếng Việt.
    const goi = "Tạo Ảnh tô màu";
    fs.mkdirSync(path.join(work, "workers", goi, "v1"), { recursive: true });
    fs.writeFileSync(path.join(work, "workers", goi, "v1", TEN_TIENG_VIET), "y", "utf8");
    g("add", "-A"); g("commit", "-q", "-m", "them package ten tieng Viet");

    const doc = commitChuaDay(work, null);
    assert.equal(doc.trangThai, CHUA_DAY.OK, `phai do duoc. Ra: ${JSON.stringify(doc)}`);
    assert.equal(doc.commits.length, 1, "dung mot commit chua day");
    assert.deepEqual(doc.commits[0].areas, [`workers/${goi}`],
      "duong dan tieng Viet phai quy ve DUNG package — khong bo dau nhay thi no roi ve _root va quy chup sai nguoi");
  } finally { fs.rmSync(kho, { recursive: true, force: true }); }
  ok("HÀNH VI: commit chạm package tên tiếng Việt vẫn quy về đúng package, không rơi về _root");
}

console.log(`\n${passed} passed, 0 failed, ${passed} total`);
