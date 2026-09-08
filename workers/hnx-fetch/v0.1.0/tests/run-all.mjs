/* Chạy mọi phép ghim của gói `hnx-fetch` trong một lượt.
 * Node thuần — không dùng lệnh của shell, nên nó chạy y hệt trong PowerShell, Git Bash và CI.
 *
 * `session-check.mjs` TỰ TÌM tệp này theo hình dạng `<đơn-vị>/tests/run-all.mjs`, nên không có
 * nó thì cổng đóng phiên **im lặng bỏ qua cả gói** — và phép ghim của gói chỉ chạy khi có người
 * nhớ chạy tay. Cái gì phải nhớ mới chạy thì sẽ có lúc quên.
 *
 * Hai nguồn tệp, quét theo HÌNH DẠNG chứ không gõ cứng tên:
 *   ① `v0.1.0/tests/*.mjs`   — phép ghim của extension
 *   ② `../du-lieu/tests/*.mjs` — phép ghim của tầng lấy dữ liệu, nằm NGOÀI thư mục phiên bản
 *
 * Tầng dữ liệu đứng ngoài thư mục phiên bản là cố ý: nó không phải mã chạy trong trình duyệt,
 * và nó không lên phiên bản cùng nhịp với extension.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const boQua = new Set(["run-all.mjs"]);

const files = fs.readdirSync(here)
  .filter((ten) => ten.endsWith(".mjs") && !boQua.has(ten)).sort()
  .map((ten) => path.join(here, ten));

const tangDuLieu = path.resolve(here, "..", "..", "du-lieu", "tests");
/* Thư mục biến mất thì ĐỎ, không lặng lẽ bỏ qua: một lượt chạy 0 tệp của tầng dữ liệu đọc y hệt
 * một lượt chạy tốt, và đó đúng là cách một suite tự tắt mà bảng vẫn xanh. */
if (!fs.existsSync(tangDuLieu)) {
  console.log(`FAIL  không thấy thư mục phép ghim của tầng dữ liệu: ${tangDuLieu}`);
  process.exit(1);
}
for (const ten of fs.readdirSync(tangDuLieu).sort()) {
  if (ten.endsWith(".mjs") && !boQua.has(ten)) files.push(path.join(tangDuLieu, ten));
}

let passed = 0;
const failed = [];
for (const file of files) {
  try {
    execFileSync(process.execPath, [file], { stdio: "pipe", encoding: "utf8" });
    passed += 1;
    console.log(`PASS  ${path.relative(here, file)}`);
  } catch (error) {
    failed.push(path.relative(here, file));
    console.log(`FAIL  ${path.relative(here, file)}`);
    const detail = `${error.stdout || ""}${error.stderr || ""}`.trim().split("\n").slice(0, 15);
    for (const line of detail) console.log(`      ${line}`);
  }
}

console.log(`\n${passed} passed, ${failed.length} failed, ${files.length} total`);
if (failed.length) {
  console.log(`Failed: ${failed.join(", ")}`);
  process.exitCode = 1;
}
