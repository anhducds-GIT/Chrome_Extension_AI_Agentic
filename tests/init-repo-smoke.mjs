/* PHÉP KIỂM CÔNG CỤ KHỞI TẠO REPO MỚI.
 *
 * Công cụ này thay cho một danh sách sáu bước làm tay mà **thứ tự quan trọng** — và thứ tự sai
 * đã làm hỏng một lượt thử thật (chạy bộ sinh trước khi commit thì nó dựng lại từ HEAD cũ).
 * Nên phép kiểm nặng nhất ở đây là phép cuối: chạy thật, rồi hỏi chính repo vừa dựng xem nó
 * có sạch không. Ba khối đầu ghim những chỗ dễ sai mà chạy-thật không phân biệt được.
 */

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildTemplateFiles } from "../scripts/build-template.mjs";
import { boPhuLucKhoiBanDo, chuanBiFiles, doiTenRepo } from "../scripts/init-repo.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PHU_LUC = "docs/ANNEX-tu-dong-hoa-trinh-duyet.md";
const chuan = buildTemplateFiles();
let passed = 0;
const ok = (name) => { passed += 1; console.log(`  ok  ${name}`); };

/* ---- 1. Tên repo phải vào đúng chỗ --------------------------------------- */
{
  const ra = doiTenRepo(chuan.get(".repo-structure.json"), "Kho Tài Liệu");
  assert.equal(JSON.parse(ra).repo.name, "Kho Tài Liệu");
  // ĐỐI CHỨNG: hạt giống phải KHÁC tên đó trước khi đổi, nếu không phép kiểm trên không chứng
  // minh được là hàm có làm gì.
  assert.notEqual(JSON.parse(chuan.get(".repo-structure.json")).repo.name, "Kho Tài Liệu");
  ok("đổi tên repo: ghi đúng chỗ, và hạt giống vốn mang tên khác");
}

/* ---- 2. Phụ lục nghề: mặc định BỎ, và bỏ thì phải bỏ CẢ dòng trỏ tới nó --- */
{
  // Xoá file mà để lại dòng trỏ tới nó là tự tạo một liên kết chết ngay ở phiên đầu tiên —
  // ấn tượng đầu tiên tệ nhất có thể cho một repo vừa dựng.
  const macDinh = chuanBiFiles(chuan, { ten: "X", giuPhuLucNghe: false });
  assert.ok(!macDinh.has(PHU_LUC), "mac dinh phai BO phu luc mau — repo moi gan nhu chac chan lam nghe khac");
  assert.ok(!macDinh.get("AGENTS.md").includes(PHU_LUC), "bo file thi phai bo ca dong tro toi no trong ban do");

  const giu = chuanBiFiles(chuan, { ten: "X", giuPhuLucNghe: true });
  assert.ok(giu.has(PHU_LUC), "--kho-nghe thi phai GIU lai");
  assert.ok(giu.get("AGENTS.md").includes(PHU_LUC), "giu file thi phai giu ca dong tro toi no");
  ok("phụ lục nghề: mặc định bỏ cả file lẫn dòng trỏ · giữ thì giữ cả hai");
}

/* ---- 3. Cắt dòng bản đồ không được cắt nhầm dòng khác -------------------- */
{
  const truoc = chuan.get("AGENTS.md").split("\n").length;
  const sau = boPhuLucKhoiBanDo(chuan.get("AGENTS.md")).split("\n").length;
  assert.equal(truoc - sau, 1, `chi duoc cat DUNG MOT dong, dang cat ${truoc - sau}`);
  // Và các dòng nhắc phụ lục ở dạng chung (`docs/ANNEX-*.md`) PHẢI còn — chúng nói về phụ lục
  // của repo bạn, không phải về file mẫu bị xoá. Cắt nhầm chúng là làm luật mất một mắt xích.
  assert.ok(boPhuLucKhoiBanDo(chuan.get("AGENTS.md")).includes("docs/ANNEX-*.md"),
    "khong duoc cat cac dong noi ve phu luc NOI CHUNG");
  ok("cắt bản đồ: đúng một dòng, giữ nguyên các dòng nói về phụ lục nói chung");
}

/* ---- 4. TỪ CHỐI ghi đè thư mục đang có nội dung ------------------------- */
{
  // Fail-closed có chủ đích: lệnh này TẠO repo, và chạy nhầm trong thư mục đang có việc thì
  // không lùi lại được.
  const banRon = mkdtempSync(join(tmpdir(), "init-ban-ron-"));
  try {
    writeFileSync(join(banRon, "viec-cua-toi.txt"), "dung xoa", "utf8");
    const run = spawnSync(process.execPath, [join(ROOT, "scripts", "init-repo.mjs"), banRon, "--ten", "X"], { encoding: "utf8" });
    assert.notEqual(run.status, 0, "thu muc co noi dung thi phai TU CHOI, khong duoc ghi de");
    assert.match(String(run.stderr), /TU_CHOI/, "phai noi ro vi sao tu choi");
    assert.equal(readFileSync(join(banRon, "viec-cua-toi.txt"), "utf8"), "dung xoa", "file cu phai con NGUYEN VEN");
    ok("từ chối thư mục đang có nội dung, và không chạm vào file có sẵn");
  } finally { rmSync(banRon, { recursive: true, force: true }); }
}

/* ---- 5. Chạy THẬT: repo dựng ra phải tự sạch ---------------------------- */
{
  const dich = join(mkdtempSync(join(tmpdir(), "init-that-")), "repo");
  try {
    const run = spawnSync(process.execPath, [join(ROOT, "scripts", "init-repo.mjs"), dich, "--ten", "Repo Thử"], { encoding: "utf8" });
    const out = String(run.stdout || "") + String(run.stderr || "");
    assert.equal(run.status, 0, `dung repo phai thanh cong: ${out.slice(0, 600)}`);
    assert.match(out, /0 chỗ ĐỎ/, `cong cau truc phai sach ngay tu dau: ${out.slice(0, 600)}`);

    // Và bảng sinh ra KHÔNG được mang tên gọi đơn vị của repo gốc. Bộ sinh từng đóng cứng chữ
    // "Extension" ở tiêu đề, nên một repo tài liệu vẫn nhận "Bảng điều hành Extension".
    const bang = readFileSync(join(dich, "DASHBOARD.md"), "utf8");
    assert.ok(!/Bảng điều hành Extension/.test(bang), "bang cua repo moi mang ten don vi cua repo goc");

    // Suite hạt giống phải chạy được NGAY, không cần sửa gì. Đây là điều kiện để cổng đóng
    // phiên của repo đó có răng ngay từ phiên đầu tiên.
    const test = spawnSync(process.execPath, [join(dich, "tests", "harness-smoke.mjs")], { cwd: dich, encoding: "utf8" });
    assert.equal(test.status, 0, `suite hat giong phai xanh ngay: ${String(test.stdout).slice(-500)}`);
    ok("chạy thật: 0 chỗ đỏ · bảng không mang tên đơn vị repo gốc · suite hạt giống xanh ngay");
  } finally { rmSync(dirname(dich), { recursive: true, force: true }); }
}

console.log(`\n${passed} passed, 0 failed, ${passed} total`);
