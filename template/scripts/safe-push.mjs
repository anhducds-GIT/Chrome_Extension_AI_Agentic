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

import { appendOnlyAtEof, claimPrefixesFrom, laneFromMessage, LANE_TRAILER, ownershipKeys, readStructureFromDisk } from "./repo-structure.mjs";

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
//
// FAIL CLOSED, và đây là một FAIL-OPEN THẬT vừa được vá (phát hiện bởi phiên K1 qua audit
// Codex, 02/09). Bản cũ gọi `gitQuiet("fetch", …)` — hàm nuốt mọi lỗi. Nếu `fetch` hỏng (mạng,
// xác thực) hoặc `origin/main` không phân giải được, thì `origin/main..HEAD` trả RỖNG, công cụ
// in "Không có gì để push — máy đang bằng với remote" rồi thoát 0. Tức người đóng phiên tin là
// đã đẩy, trong khi remote chưa có gì. Fail-open trên đúng công cụ mà cả repo dùng để đẩy, và
// nó im lặng — không thể tệ hơn về mặt hình dạng lỗi.
// Tự kiểm nhanh sau mỗi lần đẩy: `git status -sb`, còn `ahead N` là chưa đẩy thật.
// HAI CA, HAI CÁCH XỬ KHÁC NHAU — và sự khác nhau đó là kết quả ĐO, không phải suy luận.
// Phiên K1 nêu lỗi này rồi tự đính chính sau khi chạy thử, và bản vá đi theo số đo của họ:
//
//   · `fetch` HỎNG (mạng, xác thực) → KHÔNG nổ. Ref `origin/main` cũ vẫn còn trên máy nên
//     `origin/main..HEAD` vẫn liệt kê đúng commit đang chờ; cùng lắm là so với một mốc cũ.
//     Chặn ở đây là chặn oan một phiên chỉ vì mạng chớp. Nên: NÓI TO, rồi đi tiếp.
//   · Ref `origin/main` KHÔNG TỒN TẠI (clone mới chưa fetch, nhánh mặc định tên khác, remote
//     đổi tên) → NỔ THẬT. `git log origin/main..HEAD` báo `fatal: ambiguous argument`,
//     `gitQuiet` nuốt, trả rỗng, và bản cũ in "Không có gì để push — máy đang bằng với remote"
//     rồi thoát 0. Người đóng phiên tin là đã đẩy trong khi remote chưa có gì. Nên: CHẶN.
//
// Ca thứ hai gần như không xảy ra với repo này, nhưng nó là bẫy cho repo MỚI dựng từ bộ khung —
// tức đúng đối tượng mà bộ khung nhắm tới. Tự kiểm sau mỗi lần đẩy: `git status -sb`, còn
// `ahead N` là chưa đẩy thật.
try {
  git("fetch", "origin", "main", "--quiet");
} catch (error) {
  const detail = String(error.stderr || error.stdout || error.message).trim().split("\n").slice(-2).join(" | ");
  console.error(`\n⚠ KHONG_FETCH_DUOC: \`git fetch origin main\` thất bại → ${detail}`);
  console.error(`  Vẫn đi tiếp, nhưng mốc so sánh là bản origin/main CŨ trên máy. Nếu push bị từ chối vì không tiến thẳng thì đó là lý do.\n`);
}
if (!gitQuiet("rev-parse", "--verify", "origin/main").trim()) {
  console.error(`\nKHONG_CO_ORIGIN_MAIN: không phân giải được \`origin/main\`.`);
  console.error(`Không có mốc để so thì không đếm được commit nào chưa đẩy — và im lặng ở đây là báo "xong" cho một cú đẩy CHƯA HỀ XẢY RA.`);
  console.error(`Kiểm: \`git remote -v\` và \`git branch -r\`. Repo mới thì chạy \`git fetch origin\` một lần.\n`);
  process.exit(1);
}

const pending = gitQuiet("log", "--format=%H%x1f%s%x1f%an", "origin/main..HEAD").split("\n").filter(Boolean)
  .map((line) => { const [sha, subject, author] = line.split("\x1f"); return { sha, subject, author }; });

if (!pending.length) {
  console.log("\nKhông có gì để push — máy đang bằng với remote.\n");
  process.exit(0);
}

const claims = JSON.parse(fs.readFileSync(path.join(ROOT, ".agents", "claims.json"), "utf8")).claims || {};

// Một commit thuộc về ai? Xét theo VÙNG QUYỀN mà nó đụng.
//
// K2-2b, 02/09: chú thích cũ ở đây khẳng định nó "dùng CHUNG hàm với cổng đóng phiên" — và câu
// đó ĐÃ THÀNH SAI. A2 tách gốc repo thành `_root` · `_docs` · `_code` · `_template` bằng hàm mới
// `stewardOf`, nối dây cho `session-check.mjs` mà không nối cho file này. Đo được: `docs/…` thì
// cổng quy `_docs`, chỗ này quy `_root` → phiên giữ `_docs` làm xong, cổng XANH, rồi bị chính
// safe-push từ chối đẩy việc của mình. Nay cả hai đi qua `ownershipKeys` — xem ghi chú dài trong
// repo-structure.mjs về vì sao "tách hàm dùng chung" không đủ và phải là MỘT CỬA duy nhất.
const structure = readStructureFromDisk(ROOT);
const claimPrefixes = claimPrefixesFrom(structure);

const ROOT_HANDOFF = "HANDOFF.md";

// MIỄN TRỪ CŨNG PHẢI GIỐNG CỔNG — đây là lệch thứ hai trong cùng bản vá, và nó nặng hơn.
// `.agents/claims.json`: nhận/trả quyền là thao tác hành chính, ai cũng được đẩy kèm; không miễn
// thì một phiên vừa trả quyền sẽ chặn mọi phiên khác.
// `HANDOFF.md` gốc: luật mục 7 BẮT mọi phiên ghi Log vào đó, và cổng đã miễn từ A2. Chỗ này thì
// chưa — nên tuân luật mục 7 là tự quy commit của mình về `_root` rồi bị mục 1 từ chối. Hai luật
// của repo đá nhau, và không ai thấy vì nó chỉ hiện ra lúc push.
// Miễn CHỈ khi chỉ-thêm-dòng: sửa hay xoá dòng cũ là viết lại Log của phiên khác, không được miễn.
//
// ĐO THEO CẢ LOẠT, KHÔNG THEO TỪNG COMMIT. Bản đầu của tôi hỏi `git show --numstat` từng commit,
// trong khi cổng hỏi cả loạt. Hai độ hạt = hai đáp án: một commit xoá một dòng cũ rồi commit sau
// thêm lại, thì cả loạt có 0 dòng xoá (cổng MIỄN) nhưng commit đầu có xoá (safe-push KHÔNG miễn)
// → lại từ chối một cú push mà cổng đã cho xanh. Audit độc lập (Codex, vòng 1) bắt chỗ này.
//
// NHƯNG PHẠM VI HAI BÊN CỐ Ý KHÁC NHAU, và đó không phải lệch:
//   · cổng đóng phiên phán "việc của phiên này"  → `origin/main` … CÂY LÀM VIỆC
//   · safe-push phán "thứ tôi sắp công bố"        → `origin/main` … `HEAD`
// Bản vòng 2 của tôi dùng phạm vi của cổng cho cả hai, và audit (Codex, vòng 2) bác đúng: một
// bản sửa dở CHƯA COMMIT có thể che một commit phá hoại ĐÃ nằm trong HEAD — safe-push sẽ đẩy nó
// đi. Cái phải dùng chung là HÀM QUYẾT ĐỊNH, không phải phạm vi. Đúng đúng cách chia đã khai ở
// đầu `repo-structure.mjs`: hàm suy ra thì thuần và dùng chung, việc đọc thì mỗi bên tự làm.
const handoffAppendOnly = appendOnlyAtEof(
  gitQuiet("diff", "-U0", "origin/main", "HEAD", "--", ROOT_HANDOFF),
  gitQuiet("show", `origin/main:${ROOT_HANDOFF}`)
);
const adminFile = (file) => file === ".agents/claims.json" || (file === ROOT_HANDOFF && handoffAppendOnly);

function ownersOf(sha) {
  const files = gitQuiet("show", "--name-only", "--format=", sha).split("\n").filter(Boolean).map(unquote);
  const areas = ownershipKeys(files, structure, claimPrefixes, adminFile);
  return areas.map((area) => ({ area, owner: claims[area]?.owner ?? null }));
}

/* QUY THEO AI ĐÃ LÀM, KHÔNG THEO AI ĐANG GIỮ VÙNG — K2-3.
   Bản cũ chỉ có một cách quy: xem chủ HIỆN TẠI của vùng mà commit chạm. Sai cả hai chiều, xem
   ghi chú dài ở `laneFromMessage` trong repo-structure.mjs. Nay:
     · có nhãn `Lane:` → quy theo nhãn. Chính xác, và không đổi khi quyền đổi chủ.
     · nhãn HỎNG      → KHÔNG quy thuộc được → coi là của phiên khác (fail closed). Thà chặn
                        oan mình còn hơn im lặng đẩy việc người khác.
     · KHÔNG có nhãn  → lùi về quy theo vùng như cũ, VÀ nói to là đang lùi. Bắt buộc phải lùi:
                        509 commit trong lịch sử repo không có nhãn nào, chặn hết là khoá repo. */
const laneOf = (sha) => laneFromMessage(gitQuiet("log", "-1", "--format=%B", sha));

const rows = pending.map((commit) => {
  const areas = ownersOf(commit.sha);
  const { lane, problem } = laneOf(commit.sha);
  let foreign;
  let basis;
  if (problem) {
    foreign = [{ area: "(nhãn lane hỏng)", owner: problem }];
    basis = "lane-hong";
  } else if (lane) {
    foreign = lane === asLabel ? [] : [{ area: `lane ${lane}`, owner: lane }];
    basis = "lane";
  } else {
    foreign = areas.filter((a) => a.owner && a.owner !== asLabel);
    basis = "vung";
  }
  return { ...commit, areas, foreign, lane, laneProblem: problem, basis };
});

const khongCoNhan = rows.filter((row) => row.basis === "vung");
if (khongCoNhan.length) {
  console.log(`\n⚠ ${khongCoNhan.length}/${rows.length} commit KHÔNG có nhãn \`${LANE_TRAILER} <phiên>\`, nên đang tạm quy theo VÙNG.`);
  console.log(`  Quy theo vùng sai được cả hai chiều: từ chối việc của chính bạn nếu vùng đã đổi chủ,`);
  console.log(`  và im lặng đẩy kèm việc người khác nếu bạn vừa nhận vùng của họ.`);
  console.log(`  Từ nay thêm một dòng cuối thông điệp commit:  ${LANE_TRAILER} ${asLabel}\n`);
}

console.log(`\nSẮP ĐẨY LÊN origin/main — phiên "${asLabel}"`);
console.log(`${rows.length} commit:\n`);
for (const row of rows) {
  const mark = row.foreign.length ? "  ⚠" : "   ";
  const areaText = row.areas.map((a) => `${a.area}${a.owner ? ` [${a.owner}]` : " [trống chủ]"}`).join(", ") || "(chỉ claims.json)";
  console.log(`${mark} ${row.sha.slice(0, 7)}  ${row.subject.slice(0, 68)}`);
  // In cả CĂN CỨ quy thuộc, không chỉ kết quả: đọc "vùng: _root [ai-đó]" mà không biết nó đang
  // quy theo nhãn hay theo vùng thì không kiểm lại được phán quyết. Ba căn cứ, ba cách hiện.
  const canCu = row.laneProblem ? `NHÃN HỎNG (${row.laneProblem.split(":")[0]})`
    : row.lane ? `lane ${row.lane}${row.lane === asLabel ? " — của bạn" : ""}`
    : "KHÔNG có nhãn → tạm quy theo vùng";
  console.log(`      ${canCu}`);
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
// Đừng đóng cứng `_root`: sau A2 gốc repo có BỐN khoá, nên câu cũ dặn sai tên vùng — và đây là
// chữ operator, tức luật vàng 5. Kể đúng vùng vừa đẩy, và nêu luôn lệnh trả quyền (đừng dặn sửa
// tay `claims.json`: A1 sinh ra `claim.mjs` chính vì sửa tay là chỗ quyền bị ghi đè).
const pushedAreas = [...new Set(rows.flatMap((row) => row.areas.map((a) => a.area)))].sort();
console.log(`\nĐÃ PUSH ${rows.length} commit, chạm vùng: ${pushedAreas.join(", ") || "(chỉ thao tác hành chính)"}.`);
console.log(`Xong việc ở vùng nào thì trả quyền vùng đó: node scripts/claim.mjs --release <khoá> --as ${asLabel}\n`);
