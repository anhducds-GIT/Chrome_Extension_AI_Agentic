/* Cổng kiểm đóng phiên — mọi AI phải chạy trước khi được nói "xong".

   Triết lý: luật nào không kiểm được bằng máy thì sớm muộn cũng bị bỏ qua.
   Nên mỗi phép kiểm ở đây tương ứng với MỘT lỗi đã thật sự xảy ra trong lịch
   sử project, không phải lỗi tưởng tượng. Thêm phép kiểm mới khi (và chỉ khi)
   gặp một lỗi thật mới.

   Cách dùng:
     node scripts/session-check.mjs --as claude-gemini
     node scripts/session-check.mjs --as codex --quick    (bỏ chạy test — báo rõ là ĐÃ BỎ)

   Không phụ thuộc gói ngoài, đúng quy ước repo.
*/
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// fileURLToPath, không phải url.pathname: đường dẫn của Đức có dấu cách
// ("C:\WORKING ZONE\...") và pathname trả về %20, khiến mọi lệnh git im lặng
// chạy sai thư mục rồi trả về rỗng — cả cổng kiểm sẽ báo xanh giả.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const asLabel = args[args.indexOf("--as") + 1];
const quick = args.includes("--quick");

if (!args.includes("--as") || !asLabel || asLabel.startsWith("--")) {
  console.error("Thiếu --as <nhãn-phiên>. Ví dụ: node scripts/session-check.mjs --as claude-gemini");
  console.error("Nhãn phải khớp .agents/claims.json — xem AGENTS.md mục 1.");
  process.exit(2);
}

const git = (...a) => { try { return execFileSync("git", a, { cwd: ROOT, encoding: "utf8" }); } catch { return ""; } };

const results = [];
const check = (name, fn) => {
  try { const r = fn(); results.push({ name, ...r }); }
  catch (error) { results.push({ name, ok: false, msg: `Phép kiểm lỗi: ${error.message}` }); }
};

/* ---- những gì đã thay đổi trong phiên này ------------------------------- */
// "Phiên này" = mọi thứ chưa có trên origin/main: commit chưa push + working tree.
const porcelain = git("status", "--porcelain").split("\n").filter(Boolean);
const workingChanges = porcelain.map((line) => ({ code: line.slice(0, 2).trim(), file: line.slice(3).replace(/^"|"$/g, "") }));
const unpushed = git("diff", "--name-only", "origin/main...HEAD").split("\n").filter(Boolean);
const touched = [...new Set([...workingChanges.map((c) => c.file), ...unpushed])];

// Package = workers/<tên>. Đây là đơn vị sở hữu.
const packagesTouched = [...new Set(touched.map((f) => (f.match(/^(workers\/[^/]+)\//) || [])[1]).filter(Boolean))];
const rootTouched = touched.some((f) => !f.startsWith("workers/"));

/* ---- 1. Chủ sở hữu ------------------------------------------------------ */
check("Chủ sở hữu package", () => {
  const file = path.join(ROOT, ".agents", "claims.json");
  if (!fs.existsSync(file)) return { ok: false, msg: "Thiếu .agents/claims.json — xem AGENTS.md mục 1." };
  const claims = JSON.parse(fs.readFileSync(file, "utf8")).claims || {};
  const stolen = packagesTouched.filter((pkg) => claims[pkg]?.owner && claims[pkg].owner !== asLabel);
  if (stolen.length) {
    const who = stolen.map((pkg) => `${pkg} (đang do "${claims[pkg].owner}" giữ)`).join(", ");
    return { ok: false, msg: `Bạn (${asLabel}) đang sửa package của phiên khác: ${who}. Chỉ được đọc. Muốn giành thì hỏi Đức.` };
  }
  const unclaimed = packagesTouched.filter((pkg) => !claims[pkg]);
  if (unclaimed.length) return { ok: false, msg: `Package chưa khai chủ: ${unclaimed.join(", ")}. Ghi tên mình vào .agents/claims.json trước.` };
  // File gốc repo (AGENTS.md, CLAUDE.md, scripts/, package.json) là luật chung
  // của cả ba AI — đổi nó phải được Đức duyệt. Mặc định owner=null nghĩa là
  // "chưa ai được phép"; duyệt rồi thì ghi tên phiên vào, xong việc trả về null.
  if (rootTouched && claims._root?.owner !== asLabel) {
    const holder = claims._root?.owner ? `đang do "${claims._root.owner}" giữ` : "chưa được Đức duyệt cho ai";
    return { ok: false, msg: `Bạn đang sửa file gốc repo nhưng gốc ${holder}. Hỏi Đức; được duyệt rồi thì ghi "${asLabel}" vào _root.owner trong .agents/claims.json.` };
  }
  return { ok: true, msg: packagesTouched.length ? `${asLabel} giữ đúng: ${packagesTouched.join(", ")}` : "Không đụng package nào." };
});

/* ---- 2. Vùng bằng chứng ------------------------------------------------- */
check("Vùng bằng chứng không bị sửa", () => {
  const protectedRe = /(^|\/)(pilot-[^/]*|Pilot-[^/]*|Batch-[^/]*|evidence)\//i;
  // Thêm mới (A/??) thì được; Sửa (M) hoặc Xoá (D) thì không.
  const violations = workingChanges.filter((c) => protectedRe.test(c.file) && /[MDR]/.test(c.code));
  if (violations.length) return { ok: false, msg: `Sửa/xoá bằng chứng vận hành: ${violations.map((v) => v.file).join(", ")}. Chỉ được THÊM mới.` };
  return { ok: true, msg: "Bằng chứng cũ nguyên vẹn." };
});

/* ---- 3. Secret ---------------------------------------------------------- */
check("Không có secret lọt vào repo", () => {
  const tracked = git("ls-files").split("\n").filter(Boolean);
  const badName = tracked.filter((f) => /pairing.*\.json$/i.test(f));
  if (badName.length) return { ok: false, msg: `File pairing bị track: ${badName.join(", ")}. Gỡ khỏi git và cho vào .gitignore.` };
  const patterns = [/"token"\s*:\s*"[A-Za-z0-9_\-]{20,}"/, /Bearer\s+[A-Za-z0-9_\-]{24,}/];
  const suspects = [];
  for (const file of tracked) {
    if (!/\.(js|mjs|json|md|ps1|cmd)$/i.test(file)) continue;
    const full = path.join(ROOT, file);
    let text; try { text = fs.readFileSync(full, "utf8"); } catch { continue; }
    if (text.length > 2_000_000) continue;
    if (patterns.some((p) => p.test(text))) suspects.push(file);
  }
  if (suspects.length) return { ok: false, msg: `Nghi có token thật trong: ${suspects.join(", ")}. Kiểm tra bằng mắt trước khi commit.` };
  return { ok: true, msg: `Quét ${tracked.length} file được track, sạch.` };
});

/* ---- 4. File mới phải khai vào Bản đồ file ------------------------------ */
check("File mới đã khai vào Bản đồ file", () => {
  const added = workingChanges.filter((c) => /^(A|\?\?)/.test(c.code)).map((c) => c.file);
  const undeclared = [];
  for (const file of added) {
    const m = file.match(/^(workers\/[^/]+\/[^/]+)\/(.+)$/);
    if (!m) continue;
    const [, pkgDir, rest] = m;
    const agentsPath = path.join(ROOT, pkgDir, "AGENTS.md");
    if (!fs.existsSync(agentsPath)) continue;
    const topLevel = rest.split("/")[0];
    const map = fs.readFileSync(agentsPath, "utf8");
    if (!map.includes(topLevel)) undeclared.push(`${pkgDir}/${topLevel}`);
  }
  const unique = [...new Set(undeclared)];
  if (unique.length) return { ok: false, msg: `Chưa khai vào Bản đồ file của package: ${unique.join(", ")}. Không khai = không tồn tại (luật gốc).` };
  return { ok: true, msg: "Mọi thứ mới đều đã khai." };
});

/* ---- 5. HANDOFF phải được ghi ------------------------------------------- */
check("HANDOFF đã ghi Log phiên này", () => {
  const missing = packagesTouched.filter((pkg) => {
    const codeChanged = touched.some((f) => f.startsWith(`${pkg}/`) && !/HANDOFF\.md$/.test(f));
    if (!codeChanged) return false;
    return !touched.some((f) => f.startsWith(`${pkg}/`) && /HANDOFF\.md$/.test(f));
  });
  if (missing.length) return { ok: false, msg: `Đã sửa nhưng chưa ghi Log vào HANDOFF.md: ${missing.join(", ")}. Phiên sau sẽ mù.` };
  return { ok: true, msg: packagesTouched.length ? "Đã ghi Log." : "Không có gì phải ghi." };
});

/* ---- 6. Test ------------------------------------------------------------ */
check("Test xanh", () => {
  if (quick) return { ok: true, skipped: true, msg: "ĐÃ BỎ QUA (--quick). Chưa được báo 'xong' khi chưa chạy thật." };
  const suites = packagesTouched
    .flatMap((pkg) => fs.readdirSync(path.join(ROOT, pkg)).map((v) => path.join(pkg, v, "tests", "run-all.mjs")))
    .filter((p) => fs.existsSync(path.join(ROOT, p)));
  if (!suites.length) return { ok: true, msg: "Không package nào có suite bị ảnh hưởng." };
  const lines = [];
  for (const suite of suites) {
    try {
      const out = execFileSync("node", [suite], { cwd: ROOT, encoding: "utf8", timeout: 600000 });
      lines.push(`${suite}: ${(out.trim().split("\n").pop() || "").trim()}`);
    } catch (error) {
      const tail = String(error.stdout || error.message).trim().split("\n").slice(-3).join(" | ");
      return { ok: false, msg: `${suite} ĐỎ → ${tail}` };
    }
  }
  return { ok: true, msg: lines.join(" · ") };
});

/* ---- chống tự tháo cổng ------------------------------------------------- */
// Cách dễ nhất để "làm cho cổng xanh" là lặng lẽ xoá bớt một phép kiểm.
// Con số này chặn đúng việc đó: thêm phép kiểm thật thì tăng nó lên và ghi
// một dòng vào HANDOFF nói vì sao.
const EXPECTED_CHECKS = 6;
if (results.length !== EXPECTED_CHECKS) {
  console.error(`\nCỔNG BỊ SỬA: đang có ${results.length} phép kiểm, phải có ${EXPECTED_CHECKS}.`);
  console.error("Ai đó đã bớt (hoặc thêm) phép kiểm mà không cập nhật EXPECTED_CHECKS. Xem lại scripts/session-check.mjs.\n");
  process.exit(3);
}

/* ---- báo cáo ------------------------------------------------------------ */
console.log(`\nCỔNG KIỂM ĐÓNG PHIÊN — phiên "${asLabel}"`);
console.log(`Package đụng tới: ${packagesTouched.join(", ") || "(không)"}${rootTouched ? " + file gốc repo" : ""}\n`);
for (const r of results) {
  const mark = r.ok ? (r.skipped ? "BỎ  " : "XANH") : "ĐỎ  ";
  console.log(`  [${mark}] ${r.name}`);
  console.log(`         ${r.msg}`);
}
const failed = results.filter((r) => !r.ok);
console.log(failed.length ? `\nCHƯA XONG — ${failed.length} mục đỏ, sửa rồi chạy lại.\n` : `\nXANH TOÀN BỘ — được phép báo xong.\n`);
process.exit(failed.length ? 1 : 0);
