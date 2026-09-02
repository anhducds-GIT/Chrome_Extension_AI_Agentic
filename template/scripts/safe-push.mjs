/* Push có kiểm soát — thay cho `git push` khi nhiều phiên AI dùng chung repo.

   Vì sao có file này: `.agents/claims.json` khoá được FILE, không khoá được
   LỊCH SỬ GIT. Ngày 26/08 phiên AI bên ChatGPT chạy `git push` của nó và cuốn
   theo 2 commit của phiên Gemini lên remote — Đức chưa hề duyệt cú push đó.
   Một phiên push là mọi phiên cùng push. Script này bắt chuyện đó lộ ra TRƯỚC
   khi đẩy, thay vì phát hiện sau.

   Cách dùng:
     node scripts/safe-push.mjs --as claude-gemini            (kiểm rồi push)
     node scripts/safe-push.mjs --as claude-gemini --dry-run  (chỉ xem, không đẩy)
     node scripts/safe-push.mjs --as claude-gemini --carry    (Đức đã duyệt cho
                                                               đẩy kèm việc của
                                                               phiên khác)
*/
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { areaOf, claimPrefixesFrom, readStructureFromDisk } from "./repo-structure.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const asLabel = args[args.indexOf("--as") + 1];
const dryRun = args.includes("--dry-run");
const carry = args.includes("--carry");

if (!args.includes("--as") || !asLabel || asLabel.startsWith("--")) {
  console.error("Thiếu --as <nhãn-phiên>. Ví dụ: node scripts/safe-push.mjs --as claude-gemini");
  process.exit(2);
}

// core.quotepath=false + bo dau nhay bao ngoai: neu khong, duong dan tieng
// Viet ve dang "áº¡..." va regex ^workers/ truot -> commit bi quy
// nham cho "_root" thay vi dung package. Cung goc loi voi session-check 26/08.
const git = (...a) => execFileSync("git", ["-c", "core.quotepath=false", ...a], { cwd: ROOT, encoding: "utf8" });
const unquote = (line) => line.replace(/^"|"$/g, "");
const gitQuiet = (...a) => { try { return git(...a); } catch { return ""; } };

// Đối chiếu với remote thật, không tin con trỏ cũ trên máy.
gitQuiet("fetch", "origin", "main", "--quiet");

const pending = gitQuiet("log", "--format=%H%x1f%s%x1f%an", "origin/main..HEAD").split("\n").filter(Boolean)
  .map((line) => { const [sha, subject, author] = line.split("\x1f"); return { sha, subject, author }; });

if (!pending.length) {
  console.log("\nKhông có gì để push — máy đang bằng với remote.\n");
  process.exit(0);
}

const claims = JSON.parse(fs.readFileSync(path.join(ROOT, ".agents", "claims.json"), "utf8")).claims || {};

// Một commit thuộc về ai? Xét theo package mà nó đụng.
// .agents/claims.json là thao tác hành chính (nhận/trả quyền) — ai cũng được
// đẩy kèm, nếu không thì một phiên trả quyền xong sẽ chặn mọi phiên khác.
// Tiền tố quyền đọc từ `.repo-structure.json`, dùng CHUNG hàm với cổng đóng phiên — xem
// ghi chú trong session-check.mjs về lần hai bản regex lệch nhau.
const claimPrefixes = claimPrefixesFrom(readStructureFromDisk(ROOT));

function ownersOf(sha) {
  const files = gitQuiet("show", "--name-only", "--format=", sha).split("\n").filter(Boolean).map(unquote);
  const areas = new Set();
  for (const file of files) {
    if (file === ".agents/claims.json") continue;
    areas.add(areaOf(file, claimPrefixes));
  }
  return [...areas].map((area) => ({ area, owner: claims[area]?.owner ?? null }));
}

const rows = pending.map((commit) => {
  const areas = ownersOf(commit.sha);
  const foreign = areas.filter((a) => a.owner && a.owner !== asLabel);
  return { ...commit, areas, foreign };
});

console.log(`\nSẮP ĐẨY LÊN origin/main — phiên "${asLabel}"`);
console.log(`${rows.length} commit:\n`);
for (const row of rows) {
  const mark = row.foreign.length ? "  ⚠" : "   ";
  const areaText = row.areas.map((a) => `${a.area}${a.owner ? ` [${a.owner}]` : " [trống chủ]"}`).join(", ") || "(chỉ claims.json)";
  console.log(`${mark} ${row.sha.slice(0, 7)}  ${row.subject.slice(0, 68)}`);
  console.log(`      vùng: ${areaText}`);
}

const blocked = rows.filter((row) => row.foreign.length);
if (blocked.length && !carry) {
  console.error(`\nTỪ CHỐI PUSH — bạn đang cuốn theo việc của phiên khác:`);
  for (const row of blocked) {
    console.error(`  ${row.sha.slice(0, 7)} → ${row.foreign.map((f) => `${f.area} (của "${f.owner}")`).join(", ")}`);
  }
  console.error(`\nĐẩy lên là commit của họ cũng lên theo, và Đức chưa duyệt phần đó.`);
  console.error(`Cách xử lý: chờ phiên đó tự push, HOẶC hỏi Đức rồi chạy lại kèm --carry.\n`);
  process.exit(1);
}
if (blocked.length && carry) {
  console.log(`\n--carry: Đức đã duyệt cho đẩy kèm việc của ${[...new Set(blocked.flatMap((r) => r.foreign.map((f) => f.owner)))].join(", ")}.`);
}

if (dryRun) { console.log("\n--dry-run: dừng ở đây, chưa đẩy gì.\n"); process.exit(0); }

console.log("\nĐang đẩy...");
try { console.log(git("push", "origin", "main").trim() || "Xong."); }
catch (error) { console.error(`Push thất bại: ${String(error.stdout || error.stderr || error.message).trim()}`); process.exit(1); }
console.log(`\nĐÃ PUSH ${rows.length} commit. Nhớ trả quyền _root về null trong .agents/claims.json nếu đã xong việc ở gốc repo.\n`);
