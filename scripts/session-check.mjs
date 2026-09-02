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
import { execFileSync, execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { appendOnlyAtEof, areaOf, claimPrefixesFrom, generatorsFrom, laneFromMessage, LANE_TRAILER, ownershipInvariant, ownershipKeys, readStructureFromDisk, stewardOf, unitDirOf, unitDirsUnder, unitsFrom } from "./repo-structure.mjs";

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

/* VIỆC ĐÃ COMMIT CỦA LANE KHÁC KHÔNG PHẢI VIỆC MỒ CÔI CỦA TÔI — K2-1b, 2026-09-02.
 *
 * ĐO ĐƯỢC: 6 trong 64 lượt nhận quyền ngày 02/09 (9%) là phiên giữ khoá vì **không push được**,
 * không phải vì đang làm. Ghi chú nguyên văn: "DANG GIU DEN KHI PUSH XONG" ×3, "giu quyen den
 * khi push xong" ×3. Tức một chỗ tắc ở git biến thành chỗ tắc ở QUYỀN — hàng đợi push khuếch
 * đại tranh chấp khoá.
 *
 * Vì sao trước đây buộc phải giữ tới lúc push (bài học 26/08): trả quyền sớm thì file trong
 * commit chưa push của mình rơi vào vùng KHÔNG CÓ CHỦ, và cổng của phiên SAU đọc thấy "việc mồ
 * côi" rồi ĐỎ oan. Nên kỷ luật đúng lúc đó là giữ khoá — và cái giá là chặn người khác.
 *
 * Nhãn `Lane:` (K2-3) tháo được ràng buộc đó: quy thuộc không còn phụ thuộc ai đang giữ vùng.
 * Cổng nay phân biệt được **mồ côi thật** với **của lane khác, đã commit, đang chờ push**.
 *
 * CHIỀU FAIL-CLOSED, và nó quan trọng hơn bản thân bản vá: chỉ MIỄN khi commit mang nhãn của
 * NGƯỜI KHÁC. Commit **không có nhãn** thì giữ nguyên hành vi cũ (vẫn tính vào mồ côi) — vì
 * không có nhãn thì tôi không chứng minh được nó không phải của tôi. Nới theo chiều "không nhãn
 * thì cho qua" là biến bản vá này thành một đường lách: cứ bỏ nhãn là hết bị soi. */
// PHẢI khai TRƯỚC khối dò nhãn lane bên dưới. Bản đầu của K2-1 để dòng này ở dưới chỗ
// dùng đầu tiên (~30 dòng), và vì `const` có vùng chết tạm thời nên cổng NÉM NGAY khi
// nạp — mọi phiên, mọi lệnh, không riêng ca nào. Đo được 03/09: `session-check.mjs --as`
// bất kỳ đều chết ở dòng đầu tiên dùng nó.
const originMainResolves = git("rev-parse", "--verify", "origin/main").trim() !== "";

const workingFiles = new Set(workingChanges.map((c) => c.file));
const nhanCuaFile = new Map();                       // file -> tập nhãn đã chạm nó (null = không nhãn)
if (originMainResolves) {
  for (const sha of git("log", "--format=%H", "origin/main..HEAD").split("\n").filter(Boolean)) {
    const { lane, problem } = laneFromMessage(git("log", "-1", "--format=%B", sha));
    // Nhãn HỎNG cũng coi như KHÔNG có nhãn: không quy thuộc được thì không được miễn cho ai.
    const nhan = problem ? null : lane;
    for (const f of git("show", "--name-only", "--format=", sha).split("\n").filter(Boolean).map((s) => s.replace(/^"|"$/g, ""))) {
      if (!nhanCuaFile.has(f)) nhanCuaFile.set(f, new Set());
      nhanCuaFile.get(f).add(nhan);
    }
  }
}
// "Của lane khác" chỉ đúng khi: không nằm trong cây làm việc của tôi, VÀ mọi nguồn đã chạm nó
// đều là commit mang nhãn của người khác. Một nguồn không nhãn là đủ để KHÔNG miễn.
const cuaLaneKhac = (file) => !workingFiles.has(file)
  && nhanCuaFile.has(file)
  && [...nhanCuaFile.get(file)].every((nhan) => nhan && nhan !== asLabel);
// Chỉ dùng cho việc dò MỒ CÔI. Các phép kiểm khác vẫn thấy `touched` đầy đủ — thu hẹp phạm vi
// của chúng là một bản vá khác, và trộn hai việc vào một là cách làm mất dấu cái nào gây ra gì.
const touchedToiPhaiTraLoi = touched.filter((f) => !cuaLaneKhac(f));

// CÙNG HỌ VỚI FAIL-OPEN VỪA VÁ Ở `safe-push`, khác chỗ. `git()` nuốt lỗi, nên nếu `origin/main`
// không phân giải được (repo mới dựng từ bộ khung chưa có remote, nhánh mặc định tên khác) thì
// `unpushed` RỖNG — và cổng lặng lẽ **bỏ qua mọi commit chưa push**: không đòi Log HANDOFF cho
// chúng, không quy chủ cho file trong chúng, không chạy suite vì chúng. Đo được ngay trong
// fixture repo rỗng: `fatal: bad revision 'origin/main'` in ra stderr rồi mọi thứ vẫn xanh.
//
// CHƯA có teeth ở đây, và nói thẳng vì sao: chọn mốc so thay thế là một quyết định thật (gốc
// lịch sử? commit đầu? bắt phải có remote?), và đoán bừa một mốc thì sinh ra một cổng nói về
// một phạm vi khác cái nó tưởng. Nên bản này làm đúng một việc: **thôi im lặng**. Không biết
// thì phải nói là không biết — đó là mức tối thiểu, không phải mức đủ.

// Đơn vị sở hữu đọc từ `.repo-structure.json` (K1, 2026-09-02) — trước đây regex `^workers/`
// nằm cứng ở ĐÂY và một bản y hệt nằm trong safe-push.mjs. Hai bản đã lệch nhau một lần thật
// (26/08, đường dẫn tiếng Việt bị quy nhầm chủ). Một hàm dùng chung thì không lệch được.
const structure = readStructureFromDisk(ROOT);
const claimPrefixes = claimPrefixesFrom(structure);
const unitShape = unitsFrom(structure);
// Vùng chia-theo-gói vẫn hỏi `areaOf` ở đây, và đó KHÔNG phải cửa thứ hai: `stewardOf` gọi
// chính `areaOf` cho mọi đường dẫn thuộc gói rồi mới xét `steward` cho phần còn lại. Cửa thứ hai
// mà K2-2b vừa đóng là ở tập khoá GỐC. Không gộp dòng này vào `ownershipKeys` vì nó cần chạy
// TRƯỚC `adminFile` (thứ phải hỏi git), còn miễn trừ thì không đổi gì cho đường dẫn trong gói.
const packagesTouched = [...new Set(touched.map((f) => areaOf(f, claimPrefixes)).filter((a) => a !== "_root"))];

// Nhiều phiên AI dùng CHUNG một thư mục làm việc, nên `git status` cho thấy cả
// việc đang làm dở của phiên khác. Không tách ra thì cổng đổ việc của họ lên
// đầu bạn — bắt bạn ghi HANDOFF hộ họ, và bắt bạn chịu test đỏ do họ đang viết
// dở. Trách nhiệm chia theo bảng chủ sở hữu: bạn chịu đúng phần bạn đang giữ.
const CLAIMS = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, ".agents", "claims.json"), "utf8")).claims || {}; }
  catch { return null; }
})();
const ownedBy = (area) => CLAIMS?.[area]?.owner ?? null;
// Chạy qua shell chứ không spawn trực tiếp: từ Node 24, spawn một file `.cmd` trên Windows
// trả `EINVAL` (siết bảo mật). Và `scripts.test` vốn là một chuỗi lệnh nhiều bước nối bằng
// `&&` — thứ chỉ shell hiểu. Đo thật: bản đầu dùng execFileSync("npm.cmd") và chết ngay.
const runRootSuite = () => execSync("npm test --silent", { cwd: ROOT, encoding: "utf8", timeout: 900000 });
const hasRootTestScript = () => {
  try { return Boolean(JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"))?.scripts?.test); }
  catch { return false; }
};
const myPackages = packagesTouched.filter((pkg) => ownedBy(pkg) === asLabel);
const foreignPackages = packagesTouched.filter((pkg) => ownedBy(pkg) && ownedBy(pkg) !== asLabel);
// Mồ côi = KHÔNG có mục trong bảng, HOẶC có mục nhưng owner = null (vừa được
// trả quyền). Bản đầu chỉ xét trường hợp thứ nhất, nên một package đã trả
// quyền mà còn thay đổi chưa commit sẽ rơi qua cả ba rổ (không phải của
// bạn, không phải của phiên khác, không phải mồ côi) và **bị bỏ qua im
// lặng** — suite của nó cũng không chạy. Lỗ này lộ ra ngày 26/08 lúc đóng
// phiên: trả quyền trước khi commit thì cổng báo xanh mà không kiểm gì.
// Dò mồ côi trên tập ĐÃ TRỪ việc của lane khác (K2-1b) — xem ghi chú dài ở đầu file. Các phép
// kiểm khác giữ nguyên `packagesTouched` đầy đủ, để chúng vẫn báo đúng "của phiên khác".
const packagesToiPhaiTraLoi = [...new Set(touchedToiPhaiTraLoi.map((f) => areaOf(f, claimPrefixes)).filter((a) => a !== "_root"))];
const orphanPackages = packagesToiPhaiTraLoi.filter((pkg) => !CLAIMS?.[pkg] || !CLAIMS[pkg].owner);
// VÙNG GỐC CŨNG LÀ VÙNG. Trước 2026-09-02 `mine()` chỉ khớp package, nên một phiên chỉ giữ
// `_root` — tức MỌI phiên sửa `scripts/`, `tests/`, hay cả bộ khung — có `mine()` luôn false.
// Hậu quả đo thật: phép kiểm "Test xanh" báo "không package nào của bạn có suite bị ảnh hưởng"
// và **suite gốc không hề chạy**, dù phiên vừa sửa chính bộ sinh và cổng kiểm. Và trong một
// repo dựng từ bộ khung (`root_dir: null`) thì KHÔNG có package nào cả, nên cổng mất răng vĩnh
// viễn. Audit độc lập bắt được; tôi đã chạy tay `npm test` nên không có gì lọt, nhưng cổng thì
// không bảo vệ gì.
/* GỐC REPO KHÔNG PHẢI MỘT VÙNG — nó là NHIỀU vùng (A2, 2026-09-02).
   Đo thật ngày 02/09: 98/127 commit (77%) chạm gốc repo. Và một ca thật cùng ngày: một phiên
   mượn khoá gốc để sửa audit K1 (chỉ cần `scripts/`), còn phiên này chỉ cần `docs/` — hai việc
   KHÔNG chồng nhau mà một khoá chặn cả hai. Nay mỗi thư mục gốc có `steward` riêng trong
   `areas`, và mọi phép kiểm dưới đây xét THEO TỪNG KHOÁ.

   HAI FILE ĐƯỢC MIỄN, và lý do khác nhau:
   · `.agents/claims.json` — nhận và TRẢ quyền là thao tác hành chính. Không miễn thì không ai
     trả lại được quyền, vì chính thao tác trả cũng bị coi là sửa file gốc.
   · `HANDOFF.md` ở gốc — luật mục 7 bắt MỌI phiên ghi Log vào đây. Bắt phải nhận thêm một khoá
     chỉ để tuân luật là tự chặn luật của mình. NHƯNG chỉ miễn khi **chỉ thêm dòng**: sửa hay
     xoá dòng cũ là viết lại lịch sử của phiên khác, và cái đó thì không được miễn. */
const ROOT_HANDOFF = "HANDOFF.md";
// So với origin/main tới WORKING TREE, nên bắt được cả commit chưa push lẫn bản sửa dở. Đây là
// phạm vi ĐÚNG cho cổng ("việc của phiên này"); `safe-push` cố ý dùng phạm vi khác (`origin/main`
// … `HEAD` = "thứ tôi sắp công bố") — xem ghi chú ở đó. Dùng chung là HÀM QUYẾT ĐỊNH, không phải
// phạm vi: dùng chung phạm vi thì một bản sửa dở chưa commit có thể che một commit phá hoại.
//
// CHẶT HƠN TỪ K2-2b: `appendOnlyFromNumstat` (A2) chỉ chứng minh "0 dòng bị xoá", nên chèn một
// dòng bịa vào GIỮA `HANDOFF.md` vẫn được miễn — một lỗ CẤP QUYỀN: ghi file luật ở gốc mà không
// cần nhận khoá gốc. `appendOnlyAtEof` đòi thêm: đúng một hunk, và nó bắt đầu ngay sau dòng cuối
// của bản cũ. Đây là SIẾT, không phải nới: thứ trước đây lọt thì nay đỏ, và đó là chủ ý.
const handoffAppendOnly = appendOnlyAtEof(
  git("diff", "-U0", "origin/main", "--", ROOT_HANDOFF),
  git("show", `origin/main:${ROOT_HANDOFF}`)
);
const adminFile = (f) => f === ".agents/claims.json" || (f === ROOT_HANDOFF && handoffAppendOnly);

const keyOf = (f) => stewardOf(f, structure, claimPrefixes);
// MỘT CỬA DUY NHẤT (K2-2b): cả cổng này và `safe-push.mjs` đi qua `ownershipKeys`. Trước đó mỗi
// bên tự gộp tập khoá, và 02/09 hai bên đã trả hai câu khác nhau cho cùng một file — xem ghi chú
// trong repo-structure.mjs. Khoá gốc luôn bắt đầu bằng "_"; vùng chia-theo-gói thì không.
const keysTouched = ownershipKeys(touched, structure, claimPrefixes, adminFile);
const rootAreasTouched = keysTouched.filter((k) => k.startsWith("_"));
const myRootAreas = rootAreasTouched.filter((k) => ownedBy(k) === asLabel);
// Mồ côi xét trên tập ĐÃ TRỪ việc của lane khác (K2-1b). Đây là chỗ 9% lượt "giữ khoá vì chưa
// push được" biến mất: một phiên nay trả khoá xong vẫn đẩy được sau, mà cổng phiên kế không đỏ oan.
const orphanRootAreas = ownershipKeys(touchedToiPhaiTraLoi, structure, claimPrefixes, adminFile)
  .filter((k) => k.startsWith("_"))
  .filter((k) => !CLAIMS?.[k] || !CLAIMS[k].owner);
const foreignRootAreas = rootAreasTouched.filter((k) => ownedBy(k) && ownedBy(k) !== asLabel);
const rootTouched = rootAreasTouched.length > 0;
// "Gốc là của tôi" chỉ đúng khi MỌI khoá gốc đã chạm đều của tôi. Một khoá của người khác là
// đủ để phần đó không phải trách nhiệm của tôi.
const rootMine = rootTouched && myRootAreas.length === rootAreasTouched.length;
const mine = (file) => myPackages.some((pkg) => file.startsWith(`${pkg}/`))
  || (areaOf(file, claimPrefixes) === "_root" && myRootAreas.includes(keyOf(file)));

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
  if (orphanRootAreas.length) {
    return { ok: false, msg: `Vùng gốc repo bị sửa nhưng chưa ai đứng tên: ${orphanRootAreas.join(", ")}. Nhận bằng: node scripts/claim.mjs --take ${orphanRootAreas[0]} --as ${asLabel} --task "…"` };
  }
  const rootIsMine = rootMine;
  // Việc của phiên khác trong cùng thư mục KHÔNG phải lỗi của bạn — báo cho
  // biết rồi loại khỏi mọi phép kiểm sau. Cổng không thể biết ai gõ phím nào;
  // giả vờ biết chỉ tạo ra lời buộc tội sai.
  const foreign = foreignPackages.map((pkg) => `${pkg} [${ownedBy(pkg)}]`);
  for (const key of foreignRootAreas) foreign.push(`${key} [${ownedBy(key)}]`);
  const note = foreign.length ? ` · bỏ qua (của phiên khác): ${foreign.join(", ")}` : "";
  const yoursList = [...myPackages, ...myRootAreas];
  const yours = yoursList.length ? yoursList.join(", ") : "(không đụng vùng nào)";
  return { ok: true, msg: `Phần của bạn: ${yours}${note}` };
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
    // Thư mục đơn vị lấy theo hình dạng đã khai, không đóng cứng `workers/<gói>/<phiên-bản>`.
    const pkgDir = unitDirOf(file, unitShape);
    // File GỐC repo đối chiếu bản đồ ở `AGENTS.md` GỐC. Bản cũ `continue` ở đây, nên thêm một
    // thư mục top-level mới mà không khai vào bản đồ thì không ai bắt — đúng lỗ mà luật vàng 4
    // ("không khai = không tồn tại") sinh ra để bịt.
    const base = pkgDir ?? "";
    const agentsPath = path.join(ROOT, base, "AGENTS.md");
    if (!fs.existsSync(agentsPath)) continue;
    const rest = pkgDir ? file.slice(pkgDir.length + 1) : file;
    const topLevel = rest.split("/")[0];
    if (!topLevel || topLevel === "AGENTS.md") continue;
    const map = fs.readFileSync(agentsPath, "utf8");
    if (!map.includes(topLevel)) undeclared.push(base ? `${base}/${topLevel}` : topLevel);
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
  // Đi xuống đúng số tầng đã khai. Bản cũ giả định LUÔN có một tầng phiên bản dưới vùng sở
  // hữu, nên repo khai `depth: 1` có suite đỏ mà cổng vẫn báo "không có suite nào bị ảnh hưởng".
  const listDirs = (rel) => {
    try {
      return fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true })
        .filter((entry) => entry.isDirectory()).map((entry) => entry.name);
    } catch { return []; }
  };
  const suites = myPackages
    .flatMap((pkg) => unitDirsUnder(pkg, unitShape, listDirs).map((dir) => path.join(dir, "tests", "run-all.mjs")))
    .filter((p) => fs.existsSync(path.join(ROOT, p)));
  // SUITE GỐC REPO. Đây là lỗ nặng nhất audit tìm ra: suite chỉ lấy từ `myPackages`, nên một
  // phiên chỉ giữ `_root` — mọi phiên sửa bộ sinh, cổng kiểm, hay cả bộ khung — nhận câu
  // "không package nào của bạn có suite bị ảnh hưởng" và **suite gốc không hề chạy**. Trong
  // repo dựng từ bộ khung (`root_dir: null`) thì không có package nào cả, nên cổng mất răng
  // vĩnh viễn. Đo thật 2026-09-02: suốt một phiên sửa `build-dashboard`, `session-check`,
  // `repo-structure`, cổng vẫn báo "Test xanh" mà chưa chạy một test nào.
  // Chạy khi có BẤT KỲ khoá gốc nào là của mình — suite gốc là một, không chia theo khoá.
  const rootSuite = myRootAreas.length > 0 && hasRootTestScript();
  // FAIL LOUD, ĐỪNG FAIL SILENT — nửa còn lại của lỗ trên, phiên K1 tìm ra 02/09 và tôi kiểm
  // chứng lại là thật. Bản vá trước làm vùng gốc thành vùng thật TRONG REPO NÀY, nhưng ở một repo
  // dựng từ bộ khung thì `package.json` KHÔNG khai `scripts.test` (bộ trích không mang suite nào
  // theo), nên `hasRootTestScript()` false VĨNH VIỄN và dòng dưới trả XANH — im lặng. Repo gốc
  // hết bệnh, bộ khung vẫn nguyên bệnh, mà bộ khung mới là thứ sắp nhân ra nhiều repo.
  //
  // Vì sao BỎ QUA chứ không ĐỎ: một repo vừa dựng thì chưa có test là chuyện thật và hợp lệ —
  // đỏ ở đây là khoá repo ngay ở phiên đầu tiên, đúng kiểu chặn oan mà cổng này tránh. Nhưng
  // "chưa kiểm được gì" thì PHẢI hiện ra là chưa kiểm, không được đội lốt XANH. Dùng đúng hình
  // dạng `skipped` mà `--quick` đã dùng: nó in `[BỎ  ]`, và câu chữ nói thẳng là chưa chạy gì.
  if (!suites.length && !rootSuite && myRootAreas.length > 0 && !hasRootTestScript()) {
    return {
      ok: true,
      skipped: true,
      msg: `REPO CHƯA CÓ SUITE GỐC: \`package.json\` không khai \`scripts.test\`, nên cổng KHÔNG kiểm được một dòng code nào của bạn. Đây là "chưa kiểm", không phải "đã đạt" — thêm suite rồi khai \`scripts.test\` thì cổng mới có răng.`
    };
  }
  if (!suites.length && !rootSuite) return { ok: true, msg: "Không package nào của bạn có suite bị ảnh hưởng." };
  const lines = [];
  if (rootSuite) {
    try {
      const out = runRootSuite();
      const NEWLINE = String.fromCharCode(10);
      const totals = out.split(NEWLINE).filter((line) => /[0-9]+ passed, [0-9]+ failed/.test(line));
      lines.push(`suite gốc repo: ${totals.length ? totals.join(" · ") : "chạy xong"}`);
    } catch (error) {
      const tail = String(error.stdout || error.message).trim().split(String.fromCharCode(10)).slice(-3).join(" | ");
      return { ok: false, msg: `suite gốc repo ĐỎ → ${tail}` };
    }
  }
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
// Bộ kiểm phải là bản ĐÃ COMMIT. Phép kiểm này chạy `scripts/*.mjs` ở WORKING TREE
// để phán xem artifact đã commit có khớp HEAD không — nên một bản sửa dở của chính
// bộ sinh có thể làm cổng nói dối về chính nó. Audit GPT 2026-09-02, mục 4.
// Không sửa bằng cách chạy blob HEAD trong thư mục tạm: bộ sinh tự tính ROOT theo vị
// trí file của nó, chạy ở chỗ khác là tính sai gốc repo. Cách đúng và rẻ: từ chối tin
// kết quả khi bộ kiểm chưa commit. Đúng quy trình đã ghi (commit → cổng → push) thì
// lúc chạy cổng cây làm việc vốn đã sạch, nên phép kiểm này không cản ai cả.
function verifierMatchesHead(script) {
  try {
    const diff = execFileSync("git", ["-c", "core.quotepath=false", "diff", "HEAD", "--name-only", "--", `scripts/${script}`], {
      cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]
    });
    return diff.trim() === "";
  } catch {
    // FAIL CLOSED. Bản trước trả `true` với lý lẽ "không hỏi được git thì đừng bịa ra
    // cáo buộc" — nghe hợp lý, nhưng hậu quả là: git hỏng → phép kiểm im lặng bỏ qua →
    // cổng vẫn xanh dựa trên một điều nó KHÔNG kiểm được. Không biết thì phải nói là
    // không biết, không được nói là ổn. Audit GPT 2026-09-02, mục 5.
    return null;
  }
}

/* K2-2 (thu hẹp bán kính của phép kiểm này) CỐ Ý CHƯA LÀM Ở ĐÂY — và lý do đáng ghi lại.

   Vấn đề là thật, đo được ba lần trong ngày 02/09: phép kiểm dưới đây so bản-sinh-từ-HEAD với
   bản-đã-commit, nên nó ĐỎ CHO MỌI PHIÊN cùng lúc khi bất kỳ ai commit mà không sinh lại — và
   cách sửa là chạm `DASHBOARD.md`, file thuộc một khoá mà phiên khác có thể đang giữ. Tức một
   phiên bị chặn bởi khoản nợ nó BỊ CẤM TRẢ.

   Tôi ĐÃ viết bản vá cho nó trong phiên này, và audit độc lập (Codex) BÁC với hai lỗi chặn —
   cả hai đều kiểm chứng lại là thật:
     1. Không có commit nào chưa push thì bản vá coi như "nợ không phải của tôi". Nhưng repo này
        push sớm theo chính sách, nên nợ CỦA TÔI vừa push xong sẽ tự được miễn.
     2. Bản vá quy trách nhiệm theo chủ HIỆN TẠI của vùng. Trả quyền xong là thoát; và tệ hơn,
        phiên nhận vùng SAU đó bị quy cho nợ của người trước — đúng cái "đổ oan" mà cả lớp phân
        vùng này sinh ra để tránh.
   Cả hai đều cùng một gốc: **không có cách quy trách nhiệm cho một COMMIT.** Chủ sở hữu là
   trạng thái sống, commit là chuyện đã qua; lấy trạng thái hiện tại để phán chuyện đã qua thì
   sai theo cả hai chiều.

   Nên K2-2 PHỤ THUỘC K2-3 (nhãn `Lane:` trong commit), không phải ngược lại như thứ tự tôi xếp
   ban đầu. Có nhãn thì quy đúng người, và cả hai lỗi trên biến mất. Chưa có nhãn thì thà để
   phép kiểm này rộng quá còn hơn nới sai — nới sai thì nó vừa tha nợ thật vừa buộc tội người
   vô can. Đừng làm lại bản vá đó trước khi có K2-3. */

check("Sự thật máy sinh còn tươi", () => {
  // Đọc từ `.repo-structure.json`. Trước 2026-09-02 danh sách này viết cứng và gồm cả
  // `feature-parity.mjs` — một script CHỈ repo này có. Bộ khung cố ý không mang nó theo, nên
  // một repo dựng từ bộ khung chạy cổng này là hỏng ngay ở cổng của chính nó. Audit độc lập
  // bắt được; phép thử repo rỗng của tôi thì không, vì nó chỉ chạy cổng CẤU TRÚC.
  const scripts = generatorsFrom(structure);
  const failures = [];
  const verdicts = scripts.map((script) => ({ script, clean: verifierMatchesHead(script) }));
  const unknown = verdicts.filter((entry) => entry.clean === null);
  if (unknown.length) {
    return {
      ok: false,
      msg: `VERIFIER_UNKNOWN: không hỏi được git về ${unknown.map((entry) => `scripts/${entry.script}`).join(", ")}. Phép kiểm này dùng chính script đó để phán xử; không xác nhận được nó có sạch không thì kết quả không đáng tin. Không biết thì nói là không biết.`
    };
  }
  const dirtyVerifiers = verdicts.filter((entry) => entry.clean === false).map((entry) => entry.script);
  if (dirtyVerifiers.length) {
    return {
      ok: false,
      msg: `GENERATOR_DIRTY: ${dirtyVerifiers.map((s) => `scripts/${s}`).join(", ")} đang sửa dở chưa commit. Phép kiểm này dùng chính script đó để phán xử, nên kết quả không đáng tin. Commit bộ sinh trước, rồi chạy lại cổng.`
    };
  }
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
      // Câu gợi ý dựng từ chính danh sách đã khai. Đóng cứng ở đây thì một repo không có
      // `feature-parity.mjs` vẫn bị bảo đi chạy nó — chỉ dẫn sai còn tệ hơn không chỉ dẫn.
      msg: `${failures.join(" · ")}. Hãy sửa bằng: ${scripts.map((name) => `node scripts/${name}`).join(" && ")}, rồi commit --amend hoặc tạo commit mới.`
    };
  }
  // Nói đúng thứ VỪA kiểm, không liệt kê cứng tên artifact: repo khác khai bộ sinh khác thì
  // câu này sẽ kể tên những file nó không hề có.
  return { ok: true, msg: `Artifact do ${scripts.join(" và ")} sinh ra đã commit đều khớp với HEAD.` };
});

/* ---- 8. Cổng kiểm cấu trúc — CHẶN từ phiên S7 -------------------------- */
// S4 dựng phép kiểm này ở chế độ chỉ-in-ra. S7 bật chặn: nợ thuộc nhóm CHẶN nay làm cổng đỏ.
//
// BA MÃ THOÁT của check-bootstrap.mjs, và cố ý KHÔNG gộp:
//   0 = không có phép kiểm nhóm CHẶN nào đỏ (cảnh báo như B6/B9 vẫn có thể đỏ) -> XANH
//   1 = repo CÓ NỢ thuộc nhóm CHẶN                                              -> ĐỎ
//   2 = CHÍNH BỘ KIỂM không chạy được                                           -> ĐỎ, mã khác
// Gộp 1 với 2 thì người đóng phiên đọc "cổng đỏ" mà không biết phải sửa repo hay sửa bộ kiểm.
// Lớp fail-closed từ S4 giữ nguyên: bộ kiểm hỏng không được im lặng thành "repo ổn".
//
// Nhóm nào bị chặn thì khai ở `bootstrap.blocking` trong `.repo-structure.json`, KHÔNG viết
// cứng ở đây — S8 sẽ mở thêm B6/B9 sau khi trả nợ, và lúc đó không ai phải sửa script.
check("Cổng kiểm cấu trúc B1–B14", () => {
  const tomTat = (text) => {
    const summary = String(text).split("\n")
      .filter((line) => /^(TỔNG|CHAN|BỎ QUA|NGOÀI 14|MIỄN TRỪ)/.test(line.trim()))
      .map((line) => line.trim());
    return summary.length ? summary.join(" · ") : "không đọc được dòng tổng kết";
  };
  const XEM = "Xem chi tiết: node scripts/check-bootstrap.mjs --all";
  let stdout;
  try {
    stdout = execFileSync(process.execPath, [path.join(ROOT, "scripts", "check-bootstrap.mjs")], {
      cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 300000
    });
  } catch (error) {
    const out = String(error.stdout || "");
    if (error.status === 1) {
      // Repo có nợ thuộc nhóm CHẶN. Đây là cái S7 sinh ra để làm.
      return { ok: false, msg: `${tomTat(out)} — có nợ thuộc nhóm CHẶN nên CHƯA được báo xong. ${XEM}` };
    }
    const detail = String(error.stderr || out || error.message).trim().split("\n").slice(-4).join(" | ");
    return { ok: false, msg: `BOOTSTRAP_KHONG_CHAY_DUOC (mã thoát ${error.status ?? "?"}): scripts/check-bootstrap.mjs không chạy được → ${detail}. Đây là BỘ KIỂM HỎNG, KHÔNG phải nợ cấu trúc — đừng đi sửa repo.` };
  }
  // Chỉ lấy các dòng tổng kết. In cả bản đầy đủ ở đây thì báo cáo cổng dài gấp ba và không ai
  // đọc nữa — chi tiết nằm sau một lệnh, và lệnh đó được in ra ngay dưới đây.
  return { ok: true, msg: `${tomTat(stdout)} — nhóm CHẶN đạt hết. ${XEM}` };
});

/* ---- 9. Bất biến ba tầng của quyền sở hữu ------------------------------- */
// Yêu cầu bởi audit GPT 02/09, sau khi A2 tách gốc repo thành bốn khoá. Ba tầng phải luôn khớp:
//   LAW    `steward` trong .repo-structure.json
//   STATE  khoá quyền trong .agents/claims.json
//   MÁY    một hàm phân giải duy nhất (`ownershipKeys` → `stewardOf`)
// Lệch một tầng thì bảng nói một đằng máy nói một nẻo, và cổng LẶNG LẼ quy việc cho sai người
// mà vẫn xanh — đúng kiểu hỏng đã xảy ra thật trong ngày. Nên đây là BẤT BIẾN, không phải luật
// di-trú: kiểm mỗi phiên, không phải kiểm một lần lúc chuyển đổi.
// Đọc CÂY LÀM VIỆC, không phải HEAD: mối nguy nửa-di-trú sống ở bản sửa dở, và bắt được lúc đó
// mới kịp. `check-bootstrap.mjs` chỉ đọc HEAD nên không phải chỗ của phép kiểm này.
check("Bất biến quyền sở hữu ba tầng", () => {
  if (!CLAIMS) return { ok: false, msg: "Thiếu (hoặc hỏng) .agents/claims.json — không kiểm được bất biến." };
  if (!structure) return { ok: true, msg: "Repo chưa có .repo-structure.json — không có gì để lệch." };
  const problems = ownershipInvariant(structure, CLAIMS);
  if (problems.length) return { ok: false, msg: problems.join(" · ") };
  const keys = [...new Set(Object.keys(CLAIMS).filter((k) => k.startsWith("_")))].sort();
  return { ok: true, msg: `${keys.length} khoá vùng gốc (${keys.join(", ")}) đều có thư mục khai steward, và ngược lại.` };
});

/* ---- 10. Nhãn lane trong commit — K2-3 --------------------------------- */
// Quy thuộc một COMMIT cho một phiên. Vì sao cần: `safe-push` quy commit theo chủ HIỆN TẠI của
// vùng, mà chủ sở hữu là trạng thái sống còn commit là chuyện đã qua — nên nó sai cả hai chiều,
// và chiều nguy hiểm là **im lặng đẩy kèm việc người khác** khi bạn vừa nhận vùng của họ. Xem
// ghi chú dài ở `laneFromMessage` trong repo-structure.mjs.
//
// CHẾ ĐỘ CẢNH BÁO, CÓ CHỦ Ý. 509 commit trong lịch sử repo không có nhãn nào, và các phiên khác
// đang có commit chưa push ngay lúc này — bật chặn ngay là làm đỏ cổng của người không liên
// quan, đúng kiểu chặn oan mà cả lớp phân vùng này sinh ra để tránh. Nên: nhãn hỏng thì ĐỎ
// (không quy thuộc được là lỗi thật, và chỉ người vừa gõ nó mới sửa được), thiếu nhãn thì chỉ
// nhắc. Bật chặn là một quyết định LUẬT — khai ở `.repo-structure.json`, và file đó thuộc `_root`
// nên phiên này KHÔNG tự bật được. Đã ghi vào HANDOFF.
check("Nhãn lane trong commit", () => {
  if (!originMainResolves) {
    return { ok: true, skipped: true, msg: "Không so được với origin/main nên không đếm được commit nào chưa push — xem cảnh báo ở đầu báo cáo." };
  }
  const shas = git("log", "--format=%H", "origin/main..HEAD").split("\n").filter(Boolean);
  if (!shas.length) return { ok: true, msg: "Không có commit nào chưa push." };
  const hong = [];
  const thieu = [];
  const cuaToi = [];
  const cuaNguoiKhac = new Map();
  for (const sha of shas) {
    const { lane, problem } = laneFromMessage(git("log", "-1", "--format=%B", sha));
    if (problem) hong.push(`${sha.slice(0, 7)} (${problem})`);
    else if (!lane) thieu.push(sha.slice(0, 7));
    else if (lane === asLabel) cuaToi.push(sha.slice(0, 7));
    else cuaNguoiKhac.set(lane, (cuaNguoiKhac.get(lane) ?? 0) + 1);
  }
  // Nhãn HỎNG thì ĐỎ: một commit mang hai nhãn khác nhau, hay nhãn rỗng, là thứ không ai quy
  // thuộc được — và nó chỉ có thể do phiên vừa gõ commit đó tạo ra, nên không có chuyện đổ oan.
  if (hong.length) {
    return { ok: false, msg: `LANE_KHONG_QUY_THUOC_DUOC: ${hong.join(" · ")}. Sửa thông điệp commit (\`git commit --amend\`) cho mỗi commit đúng MỘT dòng \`${LANE_TRAILER} <nhãn-phiên>\`.` };
  }
  const ke = [];
  if (cuaToi.length) ke.push(`${cuaToi.length} của bạn`);
  for (const [lane, n] of [...cuaNguoiKhac].sort()) ke.push(`${n} của "${lane}"`);
  if (thieu.length) {
    return {
      ok: true,
      skipped: true,
      msg: `${thieu.length}/${shas.length} commit chưa push KHÔNG có nhãn (${thieu.slice(0, 6).join(", ")}${thieu.length > 6 ? ", …" : ""})${ke.length ? ` · ${ke.join(" · ")}` : ""}. Chưa chặn (509 commit cũ đều không có nhãn), nhưng quy theo vùng sai được cả hai chiều. Từ nay thêm dòng cuối commit: \`${LANE_TRAILER} ${asLabel}\``
    };
  }
  return { ok: true, msg: `${shas.length} commit chưa push đều quy thuộc được: ${ke.join(" · ")}.` };
});

/* ---- chống tự tháo cổng ------------------------------------------------- */
// Cách dễ nhất để "làm cho cổng xanh" là lặng lẽ xoá bớt một phép kiểm.
// Con số này chặn đúng việc đó: thêm phép kiểm thật thì tăng nó lên và ghi
// một dòng vào HANDOFF nói vì sao.
// 2026-09-02, phiên S4: 7 → 8. Thêm "Cổng kiểm cấu trúc B1–B14 (chỉ cảnh báo)". Lý do đã ghi
// một dòng vào HANDOFF.md gốc repo, đúng luật chống tự tháo cổng.
// 2026-09-02, phiên K2-2b: 8 → 9. Thêm "Bất biến quyền sở hữu ba tầng", vì trong cùng ngày hai
// công cụ đã quy một file về hai vùng khác nhau mà cổng vẫn xanh. Lý do ghi ở HANDOFF.md gốc.
// 2026-09-02, phiên K2-3: 9 → 10. Thêm "Nhãn lane trong commit", vì quy commit theo chủ HIỆN
// TẠI của vùng sai cả hai chiều — và chiều nguy hiểm là im lặng đẩy kèm việc người khác.
const EXPECTED_CHECKS = 10;
if (results.length !== EXPECTED_CHECKS) {
  console.error(`\nCỔNG BỊ SỬA: đang có ${results.length} phép kiểm, phải có ${EXPECTED_CHECKS}.`);
  console.error("Ai đó đã bớt (hoặc thêm) phép kiểm mà không cập nhật EXPECTED_CHECKS. Xem lại scripts/session-check.mjs.\n");
  process.exit(3);
}

/* ---- báo cáo ------------------------------------------------------------ */
console.log(`\nCỔNG KIỂM ĐÓNG PHIÊN — phiên "${asLabel}"`);
if (!originMainResolves) {
  console.log(`⚠ KHÔNG SO ĐƯỢC VỚI origin/main — cổng chỉ thấy CÂY LÀM VIỆC. Mọi commit chưa push`);
  console.log(`  đều KHÔNG được xét: không đòi Log HANDOFF, không quy chủ, không kích hoạt suite.`);
  console.log(`  Kiểm: \`git remote -v\` và \`git branch -r\`. Repo mới thì chạy \`git fetch origin\` một lần.`);
}
console.log(`Bạn chịu trách nhiệm: ${[...myPackages, ...myRootAreas].join(", ") || "(không vùng nào)"}`);
const others = [...foreignPackages, ...foreignRootAreas].map((k) => `${k} [${ownedBy(k)}]`);
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
