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

// core.quotepath=false: mặc định git mã hoá tên file không phải ASCII thành
// octal ("Pilot-07-Táº¡o" thay vì "Pilot-07-Tạo"). Cổng đem chuỗi mã
// hoá đó so với tên thật trong Bản đồ file nên KHÔNG BAO GIỜ khớp -> mọi thư
// mục đặt tên tiếng Việt đều bị báo đỏ oan. Gặp thật 26/08 với
// "Pilot-07-Tạo Ảnh tô màu". Đức là người Việt và đặt tên thư mục bằng tiếng
// Việt, nên đây không phải trường hợp hiếm.
const git = (...a) => { try { return execFileSync("git", ["-c", "core.quotepath=false", ...a], { cwd: ROOT, encoding: "utf8" }); } catch { return ""; } };

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

// Nhiều phiên AI dùng CHUNG một thư mục làm việc, nên `git status` cho thấy cả
// việc đang làm dở của phiên khác. Không tách ra thì cổng đổ việc của họ lên
// đầu bạn — bắt bạn ghi HANDOFF hộ họ, và bắt bạn chịu test đỏ do họ đang viết
// dở. Trách nhiệm chia theo bảng chủ sở hữu: bạn chịu đúng phần bạn đang giữ.
const CLAIMS = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, ".agents", "claims.json"), "utf8")).claims || {}; }
  catch { return null; }
})();
const ownedBy = (area) => CLAIMS?.[area]?.owner ?? null;
const myPackages = packagesTouched.filter((pkg) => ownedBy(pkg) === asLabel);
const foreignPackages = packagesTouched.filter((pkg) => ownedBy(pkg) && ownedBy(pkg) !== asLabel);
// Mồ côi = KHÔNG có mục trong bảng, HOẶC có mục nhưng owner = null (vừa được
// trả quyền). Bản đầu chỉ xét trường hợp thứ nhất, nên một package đã trả
// quyền mà còn thay đổi chưa commit sẽ rơi qua cả ba rổ (không phải của
// bạn, không phải của phiên khác, không phải mồ côi) và **bị bỏ qua im
// lặng** — suite của nó cũng không chạy. Lỗ này lộ ra ngày 26/08 lúc đóng
// phiên: trả quyền trước khi commit thì cổng báo xanh mà không kiểm gì.
const orphanPackages = packagesTouched.filter((pkg) => !CLAIMS?.[pkg] || !CLAIMS[pkg].owner);
const mine = (file) => myPackages.some((pkg) => file.startsWith(`${pkg}/`));
// claims.json không tính là "sửa file gốc": nhận và TRẢ quyền là thao tác
// hành chính, không phải đổi luật. Không miễn trừ nó thì không ai trả lại
// được quyền gốc — vì chính thao tác trả cũng bị coi là sửa file gốc.
const rootTouched = touched.some((f) => !f.startsWith("workers/") && f !== ".agents/claims.json");

/* ---- 1. Chủ sở hữu ------------------------------------------------------ */
check("Phạm vi trách nhiệm", () => {
  if (!CLAIMS) return { ok: false, msg: "Thiếu (hoặc hỏng) .agents/claims.json — xem AGENTS.md mục 1." };
  // Package chưa khai chủ mà có thay đổi = việc mồ côi, không ai chịu trách
  // nhiệm. Đây mới là thứ cổng chặn được thật.
  if (orphanPackages.length) {
    return { ok: false, msg: `Package có thay đổi nhưng chưa khai chủ: ${orphanPackages.join(", ")}. Ghi tên mình vào .agents/claims.json, hoặc hỏi xem của ai.` };
  }
  // File gốc repo (AGENTS.md, CLAUDE.md, scripts/) là luật chung của cả ba AI
  // — đổi nó phải được Đức duyệt, tức phải có người ghi tên vào _root.
  // Không ai đứng tên mà gốc bị sửa = vi phạm, chặn.
  // Có người đứng tên nhưng không phải bạn = việc của họ, xử như package của
  // phiên khác. Chặn ở đây thì mỗi lần một phiên sửa luật là mọi phiên còn lại
  // tắc cổng — đúng kiểu đổ oan mà phần trên vừa bỏ.
  if (rootTouched && !ownedBy("_root")) {
    return { ok: false, msg: `File gốc repo bị sửa nhưng không ai đứng tên. Hỏi Đức; được duyệt rồi thì ghi "${asLabel}" vào _root.owner trong .agents/claims.json.` };
  }
  const rootIsMine = ownedBy("_root") === asLabel;
  // Việc của phiên khác trong cùng thư mục KHÔNG phải lỗi của bạn — báo cho
  // biết rồi loại khỏi mọi phép kiểm sau. Cổng không thể biết ai gõ phím nào;
  // giả vờ biết chỉ tạo ra lời buộc tội sai.
  const foreign = foreignPackages.map((pkg) => `${pkg} [${ownedBy(pkg)}]`);
  if (rootTouched && !rootIsMine) foreign.push(`file gốc repo [${ownedBy("_root")}]`);
  const note = foreign.length ? ` · bỏ qua (của phiên khác): ${foreign.join(", ")}` : "";
  const yours = myPackages.length ? myPackages.join(", ") : "(không đụng package nào)";
  return { ok: true, msg: `Phần của bạn: ${yours}${rootTouched && rootIsMine ? " + file gốc repo" : ""}${note}` };
});

/* ---- 2. Vùng bằng chứng ------------------------------------------------- */
check("Vùng bằng chứng không bị sửa", () => {
  const protectedRe = /(^|\/)(pilot-[^/]*|Pilot-[^/]*|Batch-[^/]*|evidence)\//i;
  // Thêm mới (A/??) thì được; Sửa (M) hoặc Xoá (D) thì không.
  const violations = workingChanges.filter((c) => mine(c.file) && protectedRe.test(c.file) && /[MDR]/.test(c.code));
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
  const added = workingChanges.filter((c) => /^(A|\?\?)/.test(c.code)).map((c) => c.file).filter(mine);
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
  const missing = myPackages.filter((pkg) => {
    const codeChanged = touched.some((f) => f.startsWith(`${pkg}/`) && !/HANDOFF\.md$/.test(f));
    if (!codeChanged) return false;
    return !touched.some((f) => f.startsWith(`${pkg}/`) && /HANDOFF\.md$/.test(f));
  });
  if (missing.length) return { ok: false, msg: `Đã sửa nhưng chưa ghi Log vào HANDOFF.md: ${missing.join(", ")}. Phiên sau sẽ mù.` };
  return { ok: true, msg: myPackages.length ? "Đã ghi Log." : "Không có gì phải ghi." };
});

/* ---- 6. Test ------------------------------------------------------------ */
check("Test xanh", () => {
  if (quick) return { ok: true, skipped: true, msg: "ĐÃ BỎ QUA (--quick). Chưa được báo 'xong' khi chưa chạy thật." };
  const suites = myPackages
    .flatMap((pkg) => fs.readdirSync(path.join(ROOT, pkg)).map((v) => path.join(pkg, v, "tests", "run-all.mjs")))
    .filter((p) => fs.existsSync(path.join(ROOT, p)));
  if (!suites.length) return { ok: true, msg: "Không package nào của bạn có suite bị ảnh hưởng." };
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

/* ---- 7. Sự thật máy sinh còn tươi ------------------------------------ */
// Phép kiểm này dựng và so hoàn toàn từ HEAD: chạy SAU commit, trước safe-push.
// Nó không đọc hay ghi working tree, vì việc đang làm dở của bất kỳ phiên nào
// cũng không được làm đỏ sự thật đã commit. --quick chỉ bỏ test, không bỏ phép này.
check("Sự thật máy sinh còn tươi", () => {
  const scripts = ["build-dashboard.mjs", "feature-parity.mjs"];
  const failures = [];
  for (const script of scripts) {
    try {
      execFileSync(process.execPath, [path.join(ROOT, "scripts", script), "--check-head"], {
        cwd: ROOT,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 120000
      });
    } catch (error) {
      const detail = String(error.stderr || error.stdout || error.message).trim().split("\n").slice(-4).join(" | ");
      failures.push(`${script} không khớp với HEAD${detail ? ` → ${detail}` : ""}`);
    }
  }
  if (failures.length) {
    return {
      ok: false,
      msg: `${failures.join(" · ")}. Hãy sửa bằng: node scripts/build-dashboard.mjs && node scripts/feature-parity.mjs, rồi commit --amend hoặc tạo commit mới.`
    };
  }
  return { ok: true, msg: "DASHBOARD.md, llms.txt, repo-map.json và FEATURE-PARITY.md đã commit đều khớp với HEAD." };
});

/* ---- chống tự tháo cổng ------------------------------------------------- */
// Cách dễ nhất để "làm cho cổng xanh" là lặng lẽ xoá bớt một phép kiểm.
// Con số này chặn đúng việc đó: thêm phép kiểm thật thì tăng nó lên và ghi
// một dòng vào HANDOFF nói vì sao.
const EXPECTED_CHECKS = 7;
if (results.length !== EXPECTED_CHECKS) {
  console.error(`\nCỔNG BỊ SỬA: đang có ${results.length} phép kiểm, phải có ${EXPECTED_CHECKS}.`);
  console.error("Ai đó đã bớt (hoặc thêm) phép kiểm mà không cập nhật EXPECTED_CHECKS. Xem lại scripts/session-check.mjs.\n");
  process.exit(3);
}

/* ---- báo cáo ------------------------------------------------------------ */
console.log(`\nCỔNG KIỂM ĐÓNG PHIÊN — phiên "${asLabel}"`);
const rootMine = (CLAIMS?._root?.owner ?? null) === asLabel;
console.log(`Bạn chịu trách nhiệm: ${myPackages.join(", ") || "(không package nào)"}${rootTouched && rootMine ? " + file gốc repo" : ""}`);
const others = [...foreignPackages.map((pkg) => `${pkg} [${ownedBy(pkg)}]`), ...(rootTouched && !rootMine ? [`file gốc repo [${CLAIMS?._root?.owner}]`] : [])];
if (others.length) console.log(`Phiên khác đang làm dở, KHÔNG tính cho bạn: ${others.join(", ")}`);
console.log("");
for (const r of results) {
  const mark = r.ok ? (r.skipped ? "BỎ  " : "XANH") : "ĐỎ  ";
  console.log(`  [${mark}] ${r.name}`);
  console.log(`         ${r.msg}`);
}
const failed = results.filter((r) => !r.ok);
console.log(failed.length ? `\nCHƯA XONG — ${failed.length} mục đỏ, sửa rồi chạy lại.\n` : `\nXANH TOÀN BỘ — được phép báo xong.\n`);
process.exit(failed.length ? 1 : 0);
