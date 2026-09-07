/* Runs every deterministic worker test in one pass.
   Node only -- no shell builtins, so it behaves identically in PowerShell,
   Git Bash and CI. */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const skip = new Set(["run-all.mjs", "xlsx-test-utils.mjs"]);
const files = fs.readdirSync(here).filter((name) => name.endsWith(".mjs") && !skip.has(name)).sort()
  .map((name) => path.join(here, name));

/* ---- Suite của PILOT cũng chạy ở đây (07/09) ------------------------------
 * Pilot đứng ngoài thư mục phiên bản ([ADR-0020](../../../../docs/adr/0020-thang-phien-ban-scouter-va-ranh-gioi-seed-pilot.md)
 * mục ⑶a), nên nó không rơi vào lượt quét trên. Không nối thì phép ghim của pilot chỉ chạy khi
 * có người nhớ chạy tay — và cái gì phải nhớ thì sẽ có lúc quên.
 *
 * Quét theo HÌNH DẠNG, không theo tên: `pilots/<bất kỳ>/tests/*.mjs`. Gõ cứng tên pilot vào đây
 * là đưa hiểu biết về một trang cụ thể vào seed, đúng thứ `seed-purity-smoke.mjs` canh. Pilot
 * thứ hai ra đời thì dòng này không phải sửa. */
/* Suite của LÕI DÙNG CHUNG cũng chạy ở đây (07/09). Cùng lý do với pilot: cái gì phải nhớ mới
 * chạy thì sẽ có lúc quên. Quét theo HÌNH DẠNG `_shared/<bất kỳ>/tests/*.mjs`, không gõ cứng
 * tên module nào — lõi thứ hai ra đời thì dòng này không phải sửa.
 *
 * Scouter là NGƯỜI TIÊU THỤ duy nhất của lõi hôm nay, nên nó gánh việc chạy. Có người tiêu thụ
 * thứ hai thì việc này phải chuyển lên suite gốc — ghi vào `BACKLOG.md` khi tới lúc, đừng dựng
 * sẵn một tầng cho một người dùng tưởng tượng. */
const thuMucChung = path.resolve(here, "..", "..", "..", "_shared");   /* workers/_shared — CẠNH gói, không trong gói */
const thuMucPilot = path.resolve(here, "..", "..", "pilots");
for (const goc of [thuMucChung, thuMucPilot]) {
if (fs.existsSync(goc)) {
  for (const ten of fs.readdirSync(goc).sort()) {
    const tests = path.join(goc, ten, "tests");
    if (!fs.existsSync(tests)) continue;
    for (const f of fs.readdirSync(tests).sort()) {
      if (f.endsWith(".mjs") && !skip.has(f)) files.push(path.join(tests, f));
    }
  }
}
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
