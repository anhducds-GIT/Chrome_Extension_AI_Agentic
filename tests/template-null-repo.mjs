/* PHÉP THỬ REPO RỖNG — tiêu chí nghiệm thu của bộ trích template.
 *
 * Dựng một repo git **trống hoàn toàn**, thả bộ khung vào, làm đúng những gì README bảo làm,
 * rồi chạy cổng kiểm cấu trúc. **Không được có chỗ ĐỎ nào.**
 *
 * Vì sao phép thử này quan trọng hơn nó trông có vẻ: nó bắt kiểu hỏng mà mọi phép kiểm khác
 * đều mù — **template THIẾU thứ gì đó**. Chạy cổng trong repo gốc thì mọi thứ đều xanh, vì
 * repo gốc có đủ mọi file; chỉ khi bê bộ khung sang một chỗ trống mới lộ ra cái gì không đi
 * theo. Đo thật: bản trích đầu tiên đỏ B1 (quên `STATUS.md` cho gốc repo) và vàng B6 ở 4 chỗ
 * (bản đồ mục 6 để rỗng nên chính `README.md` cũng nằm ngoài đường điều hướng). Cả hai đều
 * KHÔNG thể phát hiện được từ trong repo gốc.
 *
 * Cặp đôi của nó là phép thử ngược — bộ máy cũ và mới sinh ra bảng giống hệt từng byte — bắt
 * kiểu hỏng ngược lại: **trích ra làm MẤT thứ gì đó**. Thiếu một trong hai là hụt.
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { buildTemplateFiles, leakedNames, TEMPLATE_VERSION } from "../scripts/build-template.mjs";

let passed = 0;
const ok = (name) => { passed += 1; console.log(`  ok  ${name}`); };

const files = buildTemplateFiles();

/* ---- 1. Không mang tên riêng của repo gốc -------------------------------- */
{
  const leaks = leakedNames(files);
  assert.deepEqual(leaks, [], `template mang ten rieng cua repo goc: ${JSON.stringify(leaks)}`);

  // MẪU ĐỐI CHỨNG DƯƠNG — bắt buộc. Không có nó thì phép kiểm trên RỖNG NGHĨA: template hiện
  // đã sạch, nên "không thấy gì" đúng ở cả hai chiều, và một đột biến xoá sạch danh sách mẫu
  // dò vẫn thoát. Đo thật: đột biến đó ĐÃ thoát ở bản đầu của phép kiểm này.
  const planted = leakedNames(new Map([
    ["gia/mot.md", "duong dan workers/duc-auto-gemini/v0.2.0 lot vao"],
    ["gia/hai.md", "khong co gi dang ngo"]
  ]));
  assert.equal(planted.length, 1, "bo do phai bat duoc ten du an cam khi co that");
  assert.equal(planted[0].file, "gia/mot.md", "phai chi dung file co ten cam");
  ok(`bo khung ${TEMPLATE_VERSION} khong mang ten rieng cua repo goc (${files.size} file), va bo do co that su bat duoc`);
}

/* ---- 2. KHÔNG mang theo tầng GENERATED ----------------------------------- */
{
  // Chép trang máy sinh sang repo khác là làm MỌI repo cùng hiển thị trạng thái của repo gốc.
  // Đây là kiểu hỏng tệ nhất vì nó im lặng: bảng vẫn đẹp, chỉ có điều nói về repo khác.
  for (const forbidden of ["DASHBOARD.md", "llms.txt", "repo-map.json", "FEATURE-PARITY.md"]) {
    assert.ok(!files.has(forbidden),
      `${forbidden} thuoc tang GENERATED — bo SINH thi di theo, san pham cua no thi KHONG`);
  }
  // Và cũng không mang bằng chứng của repo gốc.
  for (const rel of files.keys()) {
    assert.ok(!rel.startsWith("evidence/"), `${rel}: bang chung cua repo nao la cua repo do`);
  }
  ok("khong mang theo trang may sinh, khong mang theo bang chung");
}

/* ---- 3. Repo rỗng + bộ khung → cổng kiểm KHÔNG có chỗ đỏ ------------------ */
{
  const tempRoot = mkdtempSync(join(tmpdir(), "template-null-repo-"));
  try {
    const at = (cmd, args) => execFileSync(cmd, args, { cwd: tempRoot, encoding: "utf8" });
    const gitAt = (...args) => at("git", ["-c", "core.quotepath=false", ...args]);

    for (const [rel, text] of files) {
      const abs = join(tempRoot, ...rel.split("/"));
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, text, "utf8");
    }

    gitAt("init", "-q", "-b", "main");
    gitAt("config", "user.name", "Null Repo Test");
    gitAt("config", "user.email", "nullrepo@example.invalid");
    gitAt("add", "-A");
    gitAt("commit", "-q", "-m", "khoi tao tu bo khung");

    // Bước README bảo làm: sinh trang TRƯỚC khi đo. Bỏ bước này là đo một repo chưa có cổng
    // vào máy đọc, và phép kiểm điều hướng sẽ vàng — đúng, nhưng không phải điều đang thử.
    at(process.execPath, [join(tempRoot, "scripts", "build-dashboard.mjs")]);
    gitAt("add", "-A");
    gitAt("commit", "-q", "-m", "sinh trang lan dau");

    let out;
    try {
      out = at(process.execPath, [join(tempRoot, "scripts", "check-bootstrap.mjs")]);
    } catch (error) {
      throw new Error(`cong kiem cau truc thoat khac 0 tren repo rong:\n${error.stdout ?? ""}${error.stderr ?? ""}`);
    }

    const summary = out.split("\n").find((line) => line.startsWith("TỔNG:")) ?? "";
    assert.match(summary, /0 chỗ ĐỎ/, `repo rong phai KHONG co cho do. Dong tong ket: "${summary}"`);
    // Vàng cũng phải sạch: một bộ khung phát cho người khác mà ngay lúc mở hộp đã có cảnh báo
    // thì người ta học ngay thói quen ngó lơ cảnh báo — đúng cái bệnh làm chết một cổng kiểm.
    assert.match(summary, /0 chỗ VÀNG/, `repo rong nen sach ca VANG. Dong tong ket: "${summary}"`);
    ok("repo git TRONG + bo khung + sinh trang → cong kiem 0 do, 0 vang");
  } finally {
    assert.ok(tempRoot.startsWith(join(tmpdir(), "template-null-repo-")), "chi don dung temp fixture cua phep kiem nay");
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

console.log(`\n${passed} passed, 0 failed, ${passed} total`);
