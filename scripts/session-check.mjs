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
import os from "node:os";
import { execFileSync, execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { FINGERPRINT_FIELD, fingerprintState, khoaFileQuaHan, PHUT_NHAC_KHOA_FILE, readClaims, VO_DAU } from "./claim.mjs";
import { CAU_CHI_DUONG, docMucTuFile, laNhatKy, mucMoi, thangCua, thangHienTai, vuotTran } from "./handoff.mjs";
import { appendOnlyAtEof, appendOnlyExemptFrom, areaOf, CHUA_THAY_DAU_VET, chonSuiteBoDongBang, claimPrefixesFrom, DAU_VET, dauVetTheoVung, frozenFrom, generatorsFrom, handoffCapFrom, handoffSoMucCapFrom, kiemArtifactTuHead, quyTrachNhiemSuite, laneFromMessage, LANE_TRAILER, ownershipInvariant, ownershipKeys, readStructureFromDisk, stewardOf, unitDirOf, unitDirsUnder, unitsFrom } from "./repo-structure.mjs";
import { bamLenh, danhSachSuite, dauCay, docDau, xetDau } from "./chay-test.mjs";
import { dangMo } from "./backlog-check.mjs";

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
/* NUỐT LỖI GIT LÀ FAIL-OPEN, VÀ NÓ NẰM NGAY DƯỚI K2-9 — audit GPT vòng 5, 03/09.
 *
 * Bản cũ `catch { return ""; }`: mọi lệnh git hỏng đều thành chuỗi rỗng, không dấu vết. Đường
 * đi của lỗi: `git status --porcelain` hỏng → `workingChanges` RỖNG → `banTrongVungCuaToi()`
 * rỗng → cổng tin là vùng tôi sạch → chạy lại trên HEAD → HEAD xanh → `[BỎ]`. Tức cổng vừa
 * MIỄN cho một regression của chính tôi, bằng đúng cái guard sinh ra để chặn nó. Và `touched`
 * rỗng làm một loạt phép kiểm khác xanh rỗng theo.
 *
 * Nay mọi lỗi được GHI LẠI, và phép kiểm cuối cùng biến chúng thành ĐỎ. Không đoán, không
 * đi tiếp im lặng. */
const gitLoi = [];
const gitRaw = (a) => execFileSync("git", ["-c", "core.quotepath=false", ...a], { cwd: ROOT, encoding: "utf8" });
const git = (...a) => {
  try { return gitRaw(a); }
  catch (error) {
    gitLoi.push(`git ${a.join(" ")} → ${String(error.stderr || error.message).trim().split(String.fromCharCode(10))[0]}`);
    return "";
  }
};
// BA CHỖ MÀ LỖI LÀ BÌNH THƯỜNG, nên không ghi: dò xem `origin/main` có tồn tại (repo mới thì
// KHÔNG, và cổng đã có đường xử riêng), và đọc `HANDOFF.md` ở origin/main (repo dựng từ bộ
// khung chưa có file đó). Ghi cả mấy chỗ này là chặn oan đúng repo vừa dựng.
const gitLoiLaBinhThuong = (...a) => { try { return gitRaw(a); } catch { return ""; } };

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
const originMainResolves = gitLoiLaBinhThuong("rev-parse", "--verify", "origin/main").trim() !== "";

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
/* ĐÃ QUY THUỘC ĐƯỢC — N-48, nới từ "của lane khác" thành "của MỘT lane nào đó".
 *
 * Bản cũ chỉ miễn file mà mọi commit chạm nó mang nhãn của NGƯỜI KHÁC. Hệ quả: commit của
 * CHÍNH BẠN, mang nhãn đầy đủ, vẫn bắt bạn giữ khoá VÙNG cho tới lúc đẩy. Với khoá mức file
 * (ADR-0025) — thứ trả ngay sau mỗi lượt ghi — điều đó kéo ngược cả cơ chế về khoá vùng:
 * gặp thật ngay lượt đầu dùng, phải nhận lại `_code` chỉ để đẩy.
 *
 * Vì sao nới được: câu hỏi của phép kiểm này là *"commit chưa đẩy có ai chịu trách nhiệm
 * không"*, và từ 03/09 thứ trả lời câu đó là **nhãn `Lane:`**, không phải khoá. Một commit
 * mang nhãn của bạn thì nó KHÔNG mồ côi — `safe-push` cũng quy thuộc nó bằng đúng cái nhãn ấy.
 *
 * Và nó KHÔNG rỗng sau khi nới — hai đường đỏ còn nguyên, cả hai đều là mồ côi thật:
 *   ⑴ file bạn đang sửa trong CÂY LÀM VIỆC (chưa commit, nên chưa có nhãn nào);
 *   ⑵ commit chưa đẩy KHÔNG NHÃN hoặc nhãn hỏng — không quy thuộc được cho ai. */
const daQuyThuocDuoc = (file) => !workingFiles.has(file)
  && nhanCuaFile.has(file)
  && [...nhanCuaFile.get(file)].every((nhan) => Boolean(nhan));
// Chỉ dùng cho việc dò MỒ CÔI. Các phép kiểm khác vẫn thấy `touched` đầy đủ — thu hẹp phạm vi
// của chúng là một bản vá khác, và trộn hai việc vào một là cách làm mất dấu cái nào gây ra gì.
const touchedToiPhaiTraLoi = touched.filter((f) => !daQuyThuocDuoc(f));

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
/* `scripts.test` là các lệnh nối bằng `&&`. Cắt ra chạy TỪNG cái, đừng `npm test` một cục.
 *
 * Vì sao (đo thật 03/09, một phiên bị chặn BỐN lần): `scripts.test` của repo này mở đầu bằng
 * suite của `workers/duc-auto-chatgpt`. `&&` nghĩa là suite đó đỏ thì dừng hết — nên một lane
 * lưu file dở làm MỌI lane khác không đóng được phiên, và cổng còn không nói nổi đỏ của ai.
 * Cả bốn lần đều tự xanh lại khi lane kia lưu xong.
 */
const rootSuiteParts = () => {
  let raw = "";
  /* Đọc `test:tuan-tu` TRƯỚC. Từ khi `test` trỏ sang bộ chạy song song, chuỗi thật nằm ở
     `test:tuan-tu` — hỏi `test` không thôi thì cổng chỉ thấy MỘT lệnh, và mất sạch lớp quy đỏ
     theo từng suite mà K2-9 dựng ra. */
  try { const sc = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"))?.scripts ?? {};
        raw = sc["test:tuan-tu"] ?? sc.test ?? ""; }
  catch { return []; }
  return String(raw).split("&&").map((s) => s.trim()).filter(Boolean);
};

const runOne = (cmd, cwd = ROOT) => execSync(cmd, { cwd, encoding: "utf8", timeout: 900000 });

/* ---- SUITE ĐỎ LÀ CỦA AI — quy theo TRẠNG THÁI, không theo ĐƯỜNG DẪN -------
 *
 * Bản K2-9 v1 của tôi quy theo đường dẫn file test: test nằm trong gói của lane khác thì bỏ
 * qua. Audit GPT bác đúng, và sai đó nặng theo cả hai chiều:
 *   · tôi commit vào `scripts/` DÙNG CHUNG mà làm test gói khác đỏ → cổng [BỎ] một
 *     **regression thật**;
 *   · một suite gốc dưới `tests/` đọc file sửa dở của lane khác → vẫn **chặn oan tôi**, vì
 *     chủ của file test đó là `_code`, tức của tôi.
 * Gốc bệnh không nằm ở đường dẫn: nó nằm ở chỗ suite chạy trên một CÂY LÀM VIỆC DÙNG CHUNG.
 *
 * Nên hỏi đúng câu: **lỗi này có trong thứ đã commit không?** Trích HEAD ra thư mục tạm, chạy
 * lại đúng suite đó ở đó. Đỏ ở đó = thật. Xanh ở đó = nhiễm từ cây làm việc.
 *
 * Bản chụp là một bản `clone` tạm chứ KHÔNG `git worktree add`: worktree ghi vào
 * `.git/worktrees` của repo gốc — state dùng chung mà hai lane chạy cùng lúc có thể giẫm nhau —
 * và cũng phạm luật "KHÔNG worktree". Ảnh chụp sống vài giây rồi xoá, không phải hộp cát
 * thường trú (K2-6). Cách chụp và giá của nó: xem khối ngay dưới.
 */
/* ẢNH CHỤP PHẢI BIẾT GIT, KHÔNG CHỈ BIẾT FILE — K2-9d, audit GPT vòng 6, 04/09.
 *
 * Bản `git archive` chép file mà KHÔNG mang `.git`. Nên suite nào gọi git — trong repo này là
 * `feature-parity-smoke`, nó chạy `git show HEAD:FEATURE-PARITY.md` — sẽ chết vì
 * `not a git repository`, và cái chết đó bị đọc thành "đỏ có thật trong HEAD" tức
 * `REGRESSION_DA_COMMIT`. Quy oan cho lane đang đóng phiên, đúng bệnh K2-9 sinh ra để chữa.
 * Fail-closed nên không nguy hiểm bằng fail-open, nhưng nó chặn oan — mà chặn oan chính là
 * lý do tồn tại của cả K2-9.
 *
 * ĐỔI SANG `git clone` THÌ CHƯA ĐỦ, và chỗ thiếu thì IM LẶNG. Đây là gợi ý đầu của tôi, và
 * audit bác đúng: bản clone lấy `refs/remotes/origin/main` từ NHÁNH LOCAL của repo gốc, tức nó
 * bằng HEAD chứ không bằng baseline thật. Suite vẫn chạy, vẫn xanh, chỉ là so với một mốc sai.
 * Đo trên repo dựng riêng (HEAD=B, baseline thật=A): clone trần cho suite thấy `CHUA_PUSH=0`
 * trong khi sự thật là 1. Không test nào đỏ — loại lỗi tệ nhất.
 *
 * Nên phải đủ BA thứ, và cả ba đều có ca ghim:
 *   1. `clone`      → có `.git`, suite gọi git sống được;
 *   2. `--detach`   → ghim ĐÚNG commit đang xét. Đừng tin nhánh mặc định: repo gốc có thể đang
 *                     ở nhánh khác, lúc đó clone lấy sai commit;
 *   3. `update-ref` → viền lại baseline THẬT. Chỉ làm khi có baseline: repo mới dựng chưa có
 *                     `origin/main` vẫn phải chụp được.
 *
 * Vẫn KHÔNG `git worktree add`: nó ghi vào `.git/worktrees` của repo gốc — state dùng chung mà
 * hai lane chạy cùng lúc giẫm nhau. Đã đo: cách này không để lại gì ở repo gốc (cây sạch,
 * `git worktree list` vẫn đúng một dòng), và có ca ghim.
 *
 * Giá: đo trên repo này (`.git` 203MB) clone hardlink 1.9s, còn `git archive` 2.6s. Bản ĐÚNG
 * rẻ hơn bản sai — nên không có gì phải đánh đổi. Không dùng `--no-hardlinks`: chậm hơn (2.9s)
 * mà không an toàn hơn, vì file object của git là bất biến, và xoá bản chụp chỉ xoá liên kết.
 *
 * Giới hạn đã biết: nếu repo gốc đang ở detached HEAD tại một commit không nhánh nào với tới,
 * bản clone sẽ không có commit đó → `checkout` ném → trả `null` → cổng ĐỎ với
 * `KHONG_TRICH_DUOC_HEAD`. Fail-closed, đúng ý; không chữa vì phiên AI ở repo này luôn làm
 * trên `main`, và chữa nó là thêm một đường mà không ca thật nào đi qua.
 */
const chayLaiTrenHead = (cmd) => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "gate-head-"));
  try {
    const head = git("rev-parse", "HEAD").trim();
    if (!head) return null;
    // HÀM KHOAN DUNG, cố ý: repo chưa có `origin/main` là hợp lệ. Dùng `git` ở đây thì lỗi rơi
    // vào `gitLoi` và phép kiểm #12 đỏ oan đúng cái repo vừa dựng từ bộ khung.
    const baseline = gitLoiLaBinhThuong("rev-parse", "origin/main").trim();
    const r = path.join(d, "r");
    runOne(`git clone -q . "${r}"`);
    runOne(`git -C "${r}" checkout -q --detach ${head}`);
    if (baseline) runOne(`git -C "${r}" update-ref refs/remotes/origin/main ${baseline}`);
    try { runOne(cmd, r); return true; }
    catch { return false; }
  } catch { return null; }        // không dựng được ảnh chụp → KHÔNG biết → không được miễn
  finally { fs.rmSync(d, { recursive: true, force: true }); }
};

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

   HAI LOẠI MIỄN TRỪ, và điều kiện khác nhau:
   · `.agents/claims.json` — miễn VÔ ĐIỀU KIỆN. Nhận và TRẢ quyền là thao tác hành chính; không
     miễn thì không ai trả lại được quyền, vì chính thao tác trả cũng bị coi là sửa file gốc.
   · Các file khai ở `append_only_exempt` — miễn CÓ ĐIỀU KIỆN: chỉ khi **thêm ở cuối**. Sửa hay
     xoá dòng cũ là viết lại lịch sử của phiên khác, và cái đó thì không được miễn.
     `HANDOFF.md` ở gốc: luật mục 7 bắt MỌI phiên ghi Log vào đây, nên bắt phải nhận thêm một
     khoá chỉ để tuân luật là tự chặn luật của mình.
     `IDEAS.md` (Đức chốt 04/09): vai điều phối là vai ghi ý tưởng nhiều nhất, mà sổ nằm ở gốc
     nên nó phải xếp hàng sau `_root` — khoá đông nhất, 77% commit ngày 02/09 chạm gốc. Cùng
     một lý lẽ với `HANDOFF.md`, nên cùng một hình dạng luật. */
// So với origin/main tới WORKING TREE, nên bắt được cả commit chưa push lẫn bản sửa dở. Đây là
// phạm vi ĐÚNG cho cổng ("việc của phiên này"); `safe-push` cố ý dùng phạm vi khác (`origin/main`
// … `HEAD` = "thứ tôi sắp công bố") — xem ghi chú ở đó. Dùng chung là HÀM QUYẾT ĐỊNH, không phải
// phạm vi: dùng chung phạm vi thì một bản sửa dở chưa commit có thể che một commit phá hoại.
//
// CHẶT HƠN TỪ K2-2b: `appendOnlyFromNumstat` (A2) chỉ chứng minh "0 dòng bị xoá", nên chèn một
// dòng bịa vào GIỮA `HANDOFF.md` vẫn được miễn — một lỗ CẤP QUYỀN: ghi file luật ở gốc mà không
// cần nhận khoá gốc. `appendOnlyAtEof` đòi thêm: đúng một hunk, và nó bắt đầu ngay sau dòng cuối
// của bản cũ. Đây là SIẾT, không phải nới: thứ trước đây lọt thì nay đỏ, và đó là chủ ý.
// DANH SÁCH file miễn nay đọc từ `.repo-structure.json` (`append_only_exempt`) — trước đây gõ
// cứng ở cả đây và `safe-push.mjs`, và hai bản sao của một luật đã lệch nhau thật ngày 02/09.
// Điều kiện "chỉ thêm ở cuối" vẫn tính RIÊNG cho từng file, và vẫn bằng `appendOnlyAtEof`.
const appendOnlyExempt = appendOnlyExemptFrom(structure);
const chiThemOCuoi = new Map(appendOnlyExempt.map((f) => [f, appendOnlyAtEof(
  gitLoiLaBinhThuong("diff", "-U0", "origin/main", "--", f),
  gitLoiLaBinhThuong("show", `origin/main:${f}`)
)]));
const adminFile = (f) => f === ".agents/claims.json" || chiThemOCuoi.get(f) === true;

const keyOf = (f) => stewardOf(f, structure, claimPrefixes);
// MỘT CỬA DUY NHẤT (K2-2b): cả cổng này và `safe-push.mjs` đi qua `ownershipKeys`. Trước đó mỗi
// bên tự gộp tập khoá, và 02/09 hai bên đã trả hai câu khác nhau cho cùng một file — xem ghi chú
// trong repo-structure.mjs. Khoá gốc luôn bắt đầu bằng "_"; vùng chia-theo-gói thì không.
const keysTouched = ownershipKeys(touched, structure, claimPrefixes, adminFile);

/* Vùng nào bị chính TÔI sửa qua một commit chưa push — dùng để quy chủ một suite đỏ.
 * Khác `keysTouched` ở đúng chỗ quan trọng: cây làm việc là CHUNG, nên `keysTouched` chứa cả
 * file chưa commit của lane khác. Commit mang nhãn của tôi thì không lẫn được.
 * Commit không nhãn → không quy thuộc được → tính là của tôi (fail closed). */
const rootAreasTouched = keysTouched.filter((k) => k.startsWith("_"));
const myRootAreas = rootAreasTouched.filter((k) => ownedBy(k) === asLabel);

/* File CHƯA COMMIT nằm trong vùng TÔI đang giữ. Đây là thứ duy nhất trong cả bài này quy thuộc
 * được một file chưa commit, và nó dựa thẳng vào luật mục 1: chỉ tôi được ghi vào vùng tôi giữ,
 * nên file bẩn ở đó là của tôi. Dùng cho `quyTrachNhiemSuite` — nếu vùng tôi còn bẩn thì KHÔNG
 * được lấy "HEAD xanh" ra tự miễn, vì thay đổi gây lỗi có thể là của chính tôi và nó chưa có
 * trong HEAD. Chốt này do audit GPT thêm; thiếu nó thì bản vá tự mở một fail-open mới. */
const banTrongVungCuaToi = () => {
  const cuaToi = new Set([...myPackages, ...myRootAreas]);
  return workingChanges
    .map((c) => c.file)
    .filter((f) => !adminFile(f))
    .filter((f) => cuaToi.has(stewardOf(f, structure, claimPrefixes)));
};
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
  /* HOOK PHẢI ĐƯỢC CÀI, và đây là chỗ canh nó — N-49.
     `core.hooksPath` nằm ở `.git/config`, thứ KHÔNG đi theo git. Không ai canh thì hook là một
     file nằm im trong `.githooks/` mà chưa chắc chạy, tức đúng loại chốt-không-có-răng mà mục 7
     của `AGENTS.md` cảnh báo. May là mọi lane ở đây dùng CHUNG một cây làm việc, nên một lượt
     `git config` là xong cho tất cả.
     Đặt trong phép kiểm này chứ không thêm phép thứ 17: cùng một câu hỏi — *ai chịu trách nhiệm
     cho lượt ghi này* — chỉ khác một đằng canh lúc commit, một đằng canh lúc đóng phiên. */
  /* CHỈ ĐÒI KHI REPO CÓ HOOK. Repo tạm mà các kho thử dựng lên không chép `.githooks/` sang,
     nên đòi vô điều kiện là làm đỏ mọi fixture chạy cổng — đúng cái bẫy "cổng nhận thêm một
     phụ thuộc thì MỌI kho thử phải biết", thứ đã cắn bốn lần trong ngày 08/09. Câu đúng là:
     repo nào PHÁT một cái hook thì phải CÀI nó. */
  const coHook = fs.existsSync(path.join(ROOT, ".githooks", "commit-msg"));
  const hooksPath = gitLoiLaBinhThuong("config", "--get", "core.hooksPath").trim();
  if (coHook && hooksPath !== ".githooks") {
    return {
      ok: false,
      msg: `HOOK_CHUA_CAI: \`core.hooksPath\` đang là "${hooksPath || "(chưa đặt)"}", phải là ".githooks". `
        + "Không có nó thì chốt `commit-msg` (nửa còn lại của N-40) KHÔNG chạy, và một chốt không "
        + "chạy thì tệ hơn không có chốt — vì ai cũng tưởng nó đang canh. Cài một lần, xong cho "
        + "MỌI lane vì tất cả dùng chung một cây làm việc: git config core.hooksPath .githooks",
    };
  }
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
  const doCuaLaneKhac = [];
  const NEWLINE = String.fromCharCode(10);
  /* MỌI SUITE ĐI QUA CÙNG MỘT PHÁN QUYẾT — K2-9c, audit GPT vòng 5, 03/09.
   *
   * K2-9 v2 chỉ bọc suite GỐC REPO. Suite của package vẫn chạy thẳng trên cây làm việc dùng
   * chung và đỏ là `return ok:false` ngay — nên một lane chỉ giữ package vẫn bị file sửa dở
   * của lane khác chặn oan, đúng bệnh mà K2-9 sinh ra để chữa.
   *
   * Gốc bệnh KHÔNG nằm ở suite nào: nó nằm ở chỗ suite chạy trên một CÂY LÀM VIỆC DÙNG CHUNG.
   * Bệnh ở cây thì thuốc phải áp cho mọi thứ chạy trên cây đó. Nên hai vòng lặp gộp thành
   * một danh sách lệnh, và một đường xử lý lỗi duy nhất — ít code hơn bản cũ.
   */
  /* DÙNG LẠI LƯỢT CHẠY VỪA XONG, THAY VÌ CHẠY LẠI Y HỆT.
   *
   * Đo 08/09 ở repo này: chuỗi suite 241,7s, và cổng chạy lại đúng chuỗi đó — một vòng làm việc
   * tốn ~8,5 phút, nửa sau không kiểm thêm gì.
   *
   * KHÔNG NỚI LỚP BẢO VỆ: dấu buộc vào HEAD + băm `git status --porcelain -uall` + danh sách
   * suite + môi trường (bản Node) + hạn 30 phút. Sửa một byte ở bất kỳ file nào, kể cả file
   * chưa track, là dấu hết hiệu lực. Suite đỏ thì bộ chạy XOÁ dấu. Dấu nằm trong `.gitignore`
   * nên không mượn được của máy khác. Đường chạy đầy đủ vẫn còn nguyên ngay dưới. */
  const xetDauSuite = rootSuite ? xetDau(docDau(ROOT), dauCay(ROOT), bamLenh(danhSachSuite(ROOT))) : { dung: false };
  const menhLenhDay = [
    ...(rootSuite && !xetDauSuite.dung ? rootSuiteParts().map((cmd) => ({ cmd, nhan: null })) : []),
    ...suites.map((suite) => ({ cmd: `node "${suite}"`, nhan: suite }))
  ];
  /* GÓI ĐÓNG BĂNG: bỏ suite của chúng khi không ai chạm — giới hạn ① Đức chốt 07/09.
   * Luật và lý do ở `chonSuiteBoDongBang`. `originMainResolves` là vế fail-closed: không đo
   * chắc được gói nào bị chạm thì chạy hết, vì bỏ suite dựa trên một phép đo rỗng oan là đúng
   * cách mất một phép kiểm mà không ai biết. */
  const { chay: menhLenh, boQua: suiteDongBang } = chonSuiteBoDongBang({
    menhLenh: menhLenhDay,
    frozen: frozenFrom(readStructureFromDisk(ROOT)),
    daCham: touched,
    chacChanDoDuocCham: originMainResolves
  });
  const totals = [];
  for (const { cmd, nhan } of menhLenh) {
    let out;
    try { out = runOne(cmd); }
    catch (error) {
      const tail = String(error.stdout || error.message).trim().split(NEWLINE).slice(-3).join(" | ");
      const banCuaToi = banTrongVungCuaToi();
      const verdict = quyTrachNhiemSuite({
        vungToiGiuConBan: banCuaToi,
        ketQuaTrenHead: banCuaToi.length ? null : chayLaiTrenHead(cmd)
      });
      if (verdict.ok) { doCuaLaneKhac.push(`${nhan ?? cmd} → ${tail}`); continue; }
      return { ok: false, msg: `${nhan ?? cmd} ĐỎ (${verdict.ly_do}) → ${tail}` };
    }
    if (nhan) lines.push(`${nhan}: ${(out.trim().split(NEWLINE).pop() || "").trim()}`);
    else totals.push(...out.split(NEWLINE).filter((line) => /[0-9]+ passed, [0-9]+ failed/.test(line)));
  }
  if (rootSuite) {
    lines.unshift(xetDauSuite.dung
      ? `suite gốc repo: DÙNG LẠI DẤU — ${xetDauSuite.vi_sao}`
      : `suite gốc repo: ${totals.length ? totals.join(" · ") : "chạy xong"}`);
  }
  if (suiteDongBang.length) {
    const goi = [...new Set(suiteDongBang.map((m) => m.goi))];
    lines.push(`bỏ qua ${suiteDongBang.length} suite của ${goi.length} gói ĐÃ ĐÓNG BĂNG (${goi.join(" · ")})`
      + " — chỉ-đọc, không ai chạm. Chạm vào là suite của gói đó chạy lại ngay.");
  }
  // Đỏ ở cây làm việc nhưng XANH ở HEAD: không chặn tôi, nhưng cũng KHÔNG được in ra XANH.
  // Thứ đã commit thì lành thật, cây làm việc thì đang hỏng thật — hai sự thật, nói cả hai.
  if (doCuaLaneKhac.length) {
    return {
      ok: true,
      skipped: true,
      msg: `Thứ ĐÃ COMMIT xanh (${lines.join(" · ")}). NHƯNG chạy trên CÂY LÀM VIỆC thì đỏ: ${doCuaLaneKhac.join(" · ")}. Đỏ đó KHÔNG có trong HEAD và vùng bạn đang giữ thì sạch, nên nó đến từ file sửa dở của phiên khác — không chặn bạn. Ai commit nó thì cổng của HỌ sẽ chặn.`
    };
  }
  return { ok: true, msg: lines.join(" · ") };
});

/* ---- 7. Sự thật máy sinh còn tươi ------------------------------------ */
// Phép kiểm này dựng và so hoàn toàn từ HEAD: chạy SAU commit, trước safe-push.
// Nó không đọc hay ghi working tree, vì việc đang làm dở của bất kỳ phiên nào
// cũng không được làm đỏ sự thật đã commit. --quick chỉ bỏ test, không bỏ phép này.
// Bộ kiểm phải là bản ĐÃ COMMIT — nếu không thì một bản sửa dở của chính bộ sinh làm cổng
// nói dối về chính nó (audit GPT 02/09, mục 4). Cho tới 05/09 cách xử là TỪ CHỐI TIN khi bộ
// sinh còn sửa dở, kèm ghi chú "không chạy blob HEAD trong thư mục tạm được, vì bộ sinh tự
// tính ROOT theo vị trí file của nó". Ghi chú đó đúng về blob, nhưng nó kết luận quá tay:
// chép cả REPO ra chỗ tạm thì ROOT lại đúng, vì bộ sinh vẫn nằm trong `scripts/` của một
// repo thật. `kiemArtifactTuHead` làm đúng thế (PUSH-GATE-01, 05/09) — xem khối chú thích
// dài trong `repo-structure.mjs`, kể cả ba chi tiết đã trả giá.
//
// Vì sao phải đổi: "từ chối tin" nghe rẻ, nhưng cây làm việc là của CHUNG, nên nó biến một
// phiên đang sửa bộ sinh thành cái khoá cửa của mọi phiên khác. Đo thật 05/09: 4 lượt chặn
// oan trong một ngày cho một lane không hề chạm bộ sinh.

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
  /* ĐO BẰNG HÀM DÙNG CHUNG — PUSH-GATE-01, 05/09.
   *
   * Trước bản này phép kiểm ở đây chạy bộ sinh Ở CÂY LÀM VIỆC, nên nó phải tự vệ bằng hai
   * cửa từ chối riêng (`GENERATOR_DIRTY` và `VERIFIER_UNKNOWN`) — và cổng xuất bản có bản sao
   * của đúng hai cửa đó. Hai bản sao của một luật là cái bẫy repo này đã sập đúng một lần rồi
   * (`append_only_exempt`, 02/09: hai chỗ trả hai câu khác nhau cho cùng một file). Nay cả hai
   * gọi `kiemArtifactTuHead`, chạy bộ sinh Ở HEAD trong một bản chụp HEAD — cây làm việc thôi
   * không còn là đầu vào, nên hai cửa kia không còn lý do tồn tại.
   *
   * CHÍNH SÁCH thì vẫn được phép khác nhau, và cố ý khác: ở đây artifact lệch chỉ NÓI TO
   * (K2-8 — artifact đo việc của MỌI lane nên đòi ở đây là đòi sai người), còn cổng xuất bản
   * thì CHẶN. Khác chính sách thì được; khác CÁCH ĐO thì không. */
  const artifact = kiemArtifactTuHead(ROOT, scripts);
  if (artifact.ok === null) {
    // KHÔNG BIẾT thì ĐỎ — bất biến ④. Giữ nguyên độ chặt của `VERIFIER_UNKNOWN` cũ.
    return {
      ok: false,
      msg: `${artifact.ly_do}. Phép kiểm này so artifact đã commit với bản sinh từ HEAD, và nó cần một bản chụp HEAD để chạy. Không dựng được thì không xác nhận được gì — không biết thì nói là không biết.`
    };
  }
  const failures = artifact.lech;
  if (failures.length) {
    // KHÔNG CÒN ĐỎ Ở ĐÂY — chuyển sang cổng push (K2-8, 03/09, GPT duyệt).
    //
    // Lỗi tầng chứ không phải chuyện nới tay: artifact ĐO VIỆC CỦA MỌI LANE (số commit mỗi gói,
    // số dòng mỗi file), nên độ tươi của nó là tính chất của **trạng thái sắp publish**, không
    // phải của **một phiên đang đóng**. Kiểm một bất biến toàn cục tại một thời điểm cục bộ thì
    // với nhiều lane nó chắc chắn chập chờn, và ai commit sau cùng thì thắng.
    //
    // Đo thật trong một phiên 03/09: bị chặn BA lần, và cả ba lần **100% dòng lệch đều thuộc gói
    // của lane khác** — không một dòng nào của lane đang bị chặn. Nợ có thật, nhưng đòi sai người
    // và sai lúc.
    //
    // KHÔNG PHẢI GỠ BẢO VỆ: `safe-push.mjs` nay TỪ CHỐI ĐẨY khi artifact lệch. Không gì lên được
    // remote với artifact cũ — chỉ là chỗ chặn dời tới đúng nơi nó là sự thật. Vẫn nói to ở đây,
    // vì phiên đang đóng là người có ngữ cảnh để sửa rẻ nhất.
    return {
      ok: true,
      skipped: true,
      // Câu gợi ý dựng từ chính danh sách đã khai. Đóng cứng ở đây thì một repo không có
      // `feature-parity.mjs` vẫn bị bảo đi chạy nó — chỉ dẫn sai còn tệ hơn không chỉ dẫn.
      msg: `${failures.join(" · ")}. KHÔNG chặn đóng phiên (artifact đo việc của MỌI lane, nên ở đây nó đòi sai người) — nhưng safe-push SẼ TỪ CHỐI cho tới khi sửa: ${scripts.map((name) => `node scripts/${name}`).join(" && ")}.`
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
/* Bảng quyền có bị mở ra sửa tay không.
 *
 * Lệnh `claim.mjs` bảo vệ ĐƯỜNG GHI, nhưng không gì bảo vệ chính `claims.json`. Ngày 03/09 cả
 * bốn khoá gốc bị đổi chủ bằng một lượt sửa hàng loạt đi vòng qua lệnh, và phiên đang giữ khoá
 * không hề biết cho tới lúc mở lệnh ra xem.
 *
 * Phép kiểm này CỐ Ý không so trạng thái cũ với mới. Ảnh chụp không phân biệt được "trả rồi
 * nhận" với "ghi đè" — cùng ngày 03/09 `_root` đi thẳng từ chủ này sang chủ kia trong đúng một
 * diff mà chuỗi thật là hai thao tác hợp lệ. So trạng thái chỉ báo oan. Nên: soi DẤU.
 *
 * ĐỎ cho MỌI phiên, không riêng phiên gây ra. Cố ý: người cần biết nhất là người vừa BỊ mất
 * khoá, mà họ thì không chạy lệnh nào cả — họ chỉ chạy cổng.
 */
check("Bảng quyền chưa bị sửa tay", () => {
  let parsed;
  try { parsed = readClaims(); }
  catch (error) { return { ok: false, msg: `Không đọc được .agents/claims.json: ${error.message}` }; }

  const seal = fingerprintState(parsed);
  if (seal.ok === true) {
    return { ok: true, msg: `Dấu niêm phong khớp (${seal.stamped}) — mọi lượt nhận/trả đều đi qua claim.mjs.` };
  }
  if (seal.ok === null) {
    return {
      ok: false,
      msg: `CHUA_DONG_DAU: .agents/claims.json thiếu trường \`${FINGERPRINT_FIELD}\`, nên không kiểm được có ai sửa tay hay không.`
        + ` Đóng dấu trạng thái hiện tại: node scripts/claim.mjs --restamp --as ${asLabel}`
    };
  }
  const XUONG_DONG = String.fromCharCode(10);
  return { ok: false, msg: VO_DAU.split(XUONG_DONG).join(`${XUONG_DONG}         `) };
});

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
  // K2-3b, BẬT CHẶN 2026-09-03 (Đức chốt). Trước đó chỉ cảnh báo.
  //
  // Điều kiện đã đủ, theo đúng thứ tự: convention dạy vào `AGENTS.md` mục 2 TRƯỚC
  // (commit 4f0cbab), rồi mới bật chặn. Bật trước khi dạy là đỏ oan mọi phiên chưa đọc luật.
  //
  // Phạm vi CHỈ là `origin/main..HEAD` — GPT đính chính đúng chỗ này: lý lẽ "509 commit cũ đều
  // không có nhãn" của tôi KHÔNG liên quan, vì phép kiểm không hề quét lịch sử. Cản trở thật
  // chỉ là commit CHƯA PUSH hiện tại thiếu nhãn, và chúng sửa được bằng một `--amend`.
  //
  // Vì sao đáng chặn: không có nhãn thì không quy thuộc được commit về lane nào, và chiều nguy
  // hiểm là **im lặng cuốn việc của người khác lên remote**. Ngày 26/08 đã có 2 commit chưa
  // duyệt lên `main` đúng đường đó.
  //
  // Từ K2-3c (03/09) `safe-push` CŨNG chặn ca này. Trước đó nó chỉ cảnh báo rồi lùi về quy theo
  // chủ vùng — nên gọi thẳng `safe-push` là né được đúng phép kiểm này. Audit GPT vòng 5.
  if (thieu.length) {
    return {
      ok: false,
      msg: `LANE_THIEU_NHAN: ${thieu.length}/${shas.length} commit chưa push không có nhãn (${thieu.slice(0, 6).join(", ")}${thieu.length > 6 ? ", …" : ""})${ke.length ? ` · ${ke.join(" · ")}` : ""}.`
        + ` Không quy thuộc được thì safe-push cũng TỪ CHỐI đẩy, vì không biết đang cuốn theo việc của ai.`
        + ` Sửa: \`git commit --amend\` rồi thêm dòng cuối \`${LANE_TRAILER} ${asLabel}\`. Từ commit sau thì thêm sẵn dòng đó.`
    };
  }
  return { ok: true, msg: `${shas.length} commit chưa push đều quy thuộc được: ${ke.join(" · ")}.` };
});

/* ---- 12. HANDOFF: trần độ dài mục MỚI, và xoay file theo tháng — ADR-0011 */
// Đức chốt 06/09: chặn ở ĐẦU VÀO, không chặn ở đầu ra. `HANDOFF.md` gốc tăng ~44 KB/ngày và
// không tăng vì nhiều mục mà vì mỗi mục béo lên 60% — nên trần nằm ở MỘT MỤC, không ở cả file.
//
// HAI PHẠM VI KHÁC NHAU, và trộn chúng vào một là hỏng cả hai:
// · TRẦN xét MỌI file `HANDOFF.md` phiên này chạm, bất kể ai giữ khoá — mục bạn vừa thêm luôn
//   là chữ của bạn, không cần bảng quyền để biết điều đó.
// · XOAY THÁNG chỉ xét file bạn ĐANG GIỮ KHOÁ. Xoay là viết lại đầu file, tức KHÔNG còn là
//   "chỉ thêm ở cuối" nên miễn trừ hành chính không che nó; bắt một lane không giữ `_root` phải
//   xoay là bắt họ làm một việc luật cấm họ làm. Ngày 1 hàng tháng mà đỏ với mọi lane thì cổng
//   này thành thuế, đúng thứ ADR-0005 vừa gỡ.
//
// CHỈ CHẶN MỤC VỪA THÊM. Mục cũ là việc của lượt viết ngắn (ADR-0011 mục ⑶) — chặn cả file là
// mọi lane đỏ ngay lập tức vì chữ của người khác, brief `HANDOFF-TRAN-01` mục 2 cấm.
check("HANDOFF: mục mới trong trần, file đúng tháng", () => {
  const files = touched.filter((f) => /(^|\/)HANDOFF\.md$/.test(f));
  if (!files.length) return { ok: true, msg: "Phiên này không chạm HANDOFF.md nào." };
  const B = String.fromCharCode(96);        // dấu huyền, dựng chứ không gõ
  const tran = handoffCapFrom(structure);
  const tranSoMuc = handoffSoMucCapFrom(structure);
  if (tran === null) return { ok: true, skipped: true, msg: "Chưa khai `handoff.tran_byte_moi_muc` trong .repo-structure.json — CHƯA KIỂM ĐƯỢC GÌ." };

  const doc = (f) => { try { return fs.readFileSync(path.join(ROOT, f), "utf8"); } catch { return null; } };
  const beo = [];
  const canXoay = [];
  const chuaKhai = [];
  const quaDay = [];                        // quyển vượt trần SỐ MỤC — ADR-0008
  let neo = 0;                              // số mục bổ được — ra 0 là BỘ ĐO HỎNG, xem dưới
  let nhatKy = 0;                           // số quyển nhật ký THẬT đã soi
  for (const f of files) {
    const hienTai = doc(f);
    if (hienTai === null) continue;         // file vừa bị xoá khỏi cây làm việc
    /* Hỏi NỘI DUNG, không hỏi TÊN FILE: `docs/protocols/HANDOFF.md` là sổ tay luật, không phải
     * nhật ký, mà tên nó cũng kết thúc bằng `HANDOFF.md`. Xem ghi chú ở `laNhatKy`. */
    if (!laNhatKy(hienTai)) continue;
    nhatKy += 1;
    /* BẢN GỐC ĐỌC HỎNG THÌ MỌI MỤC THÀNH "MỤC MỚI" — tức cổng chặn lane này bằng chữ của lane
     * khác, đúng thứ brief cấm. Nên hỏi trước: file có trên `origin/main` không?
     *  · KHÔNG có (gói mới, `HANDOFF.md` vừa lập) → bản gốc rỗng là ĐÚNG, mọi mục đều mới thật.
     *  · CÓ mà đọc hỏng → dùng `git()` chứ không phải bản nuốt lỗi, để phép kiểm cuối biến nó
     *    thành ĐỎ kèm tên nguyên nhân. Không biết thì phải nói là không biết. */
    const coTrenRemote = originMainResolves
      && gitLoiLaBinhThuong("ls-tree", "--name-only", "origin/main", "--", f).trim() !== "";
    const goc = coTrenRemote ? git("show", `origin/main:${f}`) : "";
    const soMuc = docMucTuFile(hienTai).length;
    neo += soMuc;
    /* TRẦN SỐ MỤC — ADR-0008, khác hẳn trần BYTE ở trên (ADR-0011). Đo 09/09: `HANDOFF.md` gốc
     * giữ 60 mục trong khi ADR chốt 20, và KHÔNG phép kiểm nào kêu suốt ba ngày — đúng hình
     * dạng "luật không máy nào canh" mà mục 7 của AGENTS.md cảnh báo.
     * KHÔNG lọc theo `mine(f)` như hai nhánh xoay dưới: cắt thì cần khoá, nhưng biết quyển đã
     * dày thì ai chạm cũng nên biết — và ở gốc repo thì ai cũng chạm, vì luật mục 7 bắt thế. */
    if (tranSoMuc !== null && soMuc > tranSoMuc) quaDay.push(f + " (" + soMuc + " mục)");
    for (const m of vuotTran(mucMoi(hienTai, goc), tran)) {
      beo.push(`${f} · "${m.tieuDe.replace(/^#+\s*/, "").slice(0, 48)}…" = ${m.byte} byte`);
    }
    if (!mine(f)) continue;                 // xoay là việc của người đang giữ khoá
    const thang = thangCua(hienTai);
    if (thang === null) chuaKhai.push(f);
    else if (thang !== thangHienTai()) canXoay.push(`${f} (đang khai ${thang})`);
  }

  /* ĐẾM MỎ NEO. `mucMoi` trả rỗng đọc y hệt "mọi mục đều vừa trần" — và ngày 06/09 đúng cái
   * nhầm này (công cụ không khớp gì, bị đọc thành "không có gì phải sửa") xảy ra với NĂM lane
   * khác nhau trong repo. Nên: bổ ra 0 mục trên một file có thật là ĐỎ, không phải xanh. */
  if (nhatKy > 0 && neo === 0) {
    return { ok: false, msg: "HANDOFF_KHONG_KHOP: chạm HANDOFF.md nhưng không bổ được MỤC nào."
      + " Đây là bộ đo HỎNG, không phải 'không có gì phải sửa' — kiểm dòng `## Log` của file." };
  }

  const loi = [];
  if (beo.length) {
    loi.push(`HANDOFF_MUC_QUA_DAI: ${beo.length} mục MỚI vượt trần ${tran} byte — ${beo.join(" · ")}. ${CAU_CHI_DUONG}`);
  }
  if (quaDay.length) {
    loi.push("HANDOFF_QUA_DAY: " + quaDay.join(", ") + " — trần " + tranSoMuc
      + " mục (ADR-0008 chốt đích 20). Sửa bằng một lệnh: " + B + "node scripts/handoff.mjs"
      + " --cat <file> --giu 20" + B + " — nó dời phần cũ sang một file lưu trữ NGUYÊN VĂN, và tự"
      + " kiểm ghép lại ra đúng bản gốc từng byte TRƯỚC khi ghi. ĐỪNG dùng " + B + "--rotate" + B
      + ": cái đó xoay theo THÁNG (ADR-0011) nên dời 0 dòng khi mọi mục cùng một tháng — đo thật"
      + " 09/09. Xong thì khai file lưu trữ vừa sinh vào Bản đồ file.");
  }
  if (canXoay.length) {
    loi.push(`HANDOFF_QUA_THANG: ${canXoay.join(", ")} còn chứa tháng cũ, nay là ${thangHienTai()}.`
      + ` Sửa bằng một lệnh: \`node scripts/handoff.mjs --rotate <file>\` rồi khai file lưu trữ vừa sinh vào Bản đồ file.`);
  }
  if (chuaKhai.length) {
    loi.push(`HANDOFF_CHUA_KHAI_THANG: ${chuaKhai.join(", ")} chưa khai tháng, nên chưa vào được lược đồ xoay.`
      + ` Sửa: \`node scripts/handoff.mjs --rotate <file>\` (lượt đầu chỉ khai tháng, không xoay gì).`);
  }
  if (loi.length) return { ok: false, msg: loi.join(" ") };
  if (nhatKy === 0) return { ok: true, msg: `${files.length} file tên HANDOFF.md nhưng không quyển nào có phần \`## Log\` — không phải nhật ký, không kiểm.` };
  return { ok: true, msg: nhatKy + " quyển nhật ký, " + neo + " mục, mọi mục mới đều dưới trần " + tran + " byte và đúng tháng" + (tranSoMuc === null ? "." : ", quyển dày nhất dưới trần " + tranSoMuc + " mục.") };
});

/* ---- 13. Đọc git có lỗi nào không -------------------------------------- */
// PHẢI LÀ PHÉP KIỂM CUỐI. Nó phán về thứ mà mười một phép kiểm trên vừa đọc, nên đặt sớm hơn
// là phán trên một danh sách chưa đầy.
//
// Vì sao là ĐỎ chứ không phải cảnh báo: cả cổng này suy ra từ những gì git kể. Git không kể
// được thì cổng không biết gì — mà "không biết" đã im lặng biến thành "không có vấn đề" ở đúng
// cái guard của K2-9 (xem ghi chú dài ở `git` đầu file). Một cổng không đọc được đầu vào thì
// phải nói là nó không đọc được, không được nói XANH.
check("Đọc git không lỗi", () => {
  // Repo chưa có `origin/main`: mọi lệnh so với nó đều hỏng, và đó là chuyện ĐÃ BIẾT — cổng
  // in cảnh báo riêng ở phần báo cáo. Đếm lại chúng ở đây là chặn oan repo vừa dựng.
  const thuc = gitLoi.filter((line) => originMainResolves || !line.includes("origin/main"));
  if (thuc.length) {
    return {
      ok: false,
      msg: `GIT_DOC_LOI: ${thuc.length} lệnh git thất bại, nên cổng đang suy luận trên dữ liệu THIẾU`
        + ` — và thiếu ở đây im lặng thành "sạch", tức miễn oan cho lỗi của chính bạn.`
        + ` ${thuc.join(" · ")}.`
        + ` Sửa: chạy lại lệnh đó bằng tay xem nó nói gì, đừng chạy lại cổng và hy vọng.`
    };
  }
  if (gitLoi.length) return { ok: true, msg: `${gitLoi.length} lệnh git hỏng, nhưng đều vì chưa có \`origin/main\` — xem cảnh báo ở đầu báo cáo.` };
  return { ok: true, msg: "Mọi lệnh git đọc được." };
});

/* ---- chống tự tháo cổng ------------------------------------------------- */
// Cách dễ nhất để "làm cho cổng xanh" là lặng lẽ xoá bớt một phép kiểm.
// Con số này chặn đúng việc đó: thêm phép kiểm thật thì tăng nó lên và ghi
/* TRẦN SỔ NỢ — con số đã có từ lâu, MÁY CANH thì hôm nay mới có.
 *
 * `AGENTS.md` mục 3 giới hạn ④ nói thẳng chỗ mù này: *"Trần này KHÔNG có máy cưỡng chế — công cụ
 * chỉ đếm và in ra, cổng đóng phiên không đọc con số đó."* Và nó vỡ đúng như thế: mục thứ 11 vào
 * sổ mà **không gì đỏ lên**, nên trần 10 phải nâng thành 15 **sau khi đã vỡ**. Một trần không ai
 * canh thì nó không phải trần, nó là lời khuyên.
 *
 * Trần khai ở `backlog.tran` của `.repo-structure.json`, KHÔNG viết cứng ở đây. Repo không khai
 * thì phép kiểm XANH — cùng hợp đồng với bản khung (ADR-0010 của repo bộ khung).
 *
 * Bộ đếm dùng lại `dangMo` của `backlog-check.mjs`, không viết bộ thứ hai: quy ước đóng mục của
 * sổ này là **thêm dòng `- **ĐÓNG N-xx**` ở cuối**, không gạch tiêu đề, và đếm tiêu đề là đếm
 * sai (đã đếm sai một lần: 14 thay vì 12).
 *
 * CÁI GIÁ, ghi ra để phiên sau không mất thì giờ: cổng nay PHỤ THUỘC `backlog-check.mjs`. **15
 * kho thử** chép một DANH SÁCH script cố định sang thư mục tạm; thiếu file này thì cổng ném lúc
 * NẠP MODULE, tức không in ra một dòng nào, và test báo *"không thấy mục [XANH] …"* — một câu
 * trỏ sai hoàn toàn chỗ hỏng. Thêm kho thử mới mà chép `session-check.mjs` thì chép cả
 * `backlog-check.mjs`. */
/* THƯỚC CÓC CHO KHO CHỮ — Đức hỏi 08/09: *"về protocol clean: nếu chưa có ta nên xây dựng
 * đúng không?"* Có, nhưng KHÔNG phải một tài liệu mới — một tài liệu dạy cách dọn tài liệu là
 * món tự trào, và nó cộng vào đúng con số nó định cắt. Protocol dọn kho chữ là **phép kiểm này**.
 *
 * THƯỚC CÓC KHÁC TRẦN LÝ TƯỞNG, và chỗ này là cả thiết kế. Giới hạn ③ của `AGENTS.md` đặt ĐÍCH
 * 8.000 dòng; hôm nay còn 15.265 (đã cắt 8.266 sáng nay). Một phép kiểm đỏ với MỌI phiên trong
 * nhiều tuần liền là một phép kiểm sẽ bị gỡ — repo này đã tự đo đúng chuyện đó ở giới hạn ④,
 * nơi một trần phải nâng SAU KHI đã vỡ. Nên máy canh con số của HÔM QUA, không canh cái đích:
 * nó không đòi ai dọn, nó chỉ chặn PHÌNH. Ai dọn thêm thì HẠ con số xuống, và chỗ đã hạ không
 * quay lại được.
 *
 * TRỪ `docs/adr/`: ADR đã Accepted là bất biến (ADR-0000), nên thư mục đó chỉ có thể to lên.
 * Tính nó vào thước thì mỗi quyết định mới làm cộng dồn, và người ta sẽ nới con số cho xong. */
/* KHOÁ FILE PHẢI TRẢ HẾT TRƯỚC KHI ĐÓNG PHIÊN — Đức chốt 08/09.
 *
 * Cả giá trị của khoá mức file nằm ở chữ NGẮN: *"khóa được giữ và trả ngay trước và sau khi
 * AI sửa"*. Không gì cưỡng chế chữ đó thì nó thoái hoá thành đúng cái khoá vùng dài hạn mà nó
 * thay thế — và lúc ấy repo có HAI cơ chế cùng làm một việc dở, thay vì một cơ chế làm tốt.
 *
 * ĐÓNG PHIÊN LÀ MỐC ĐÚNG, và nó khác hẳn khoá vùng. Khoá vùng trả **sau khi đẩy** (mục 1),
 * vì commit chưa đẩy mà vùng đã trống chủ thì để lại một mục đỏ cho phiên sau. Khoá file
 * KHÔNG mang trách nhiệm đó — nguồn gốc của một commit là nhãn `Lane:`, không phải khoá. Nên
 * ở đây mốc là "hết phiên", không phải "đã đẩy".
 *
 * Chỉ soi khoá của CHÍNH BẠN. Khoá quá hạn của lane khác chỉ được NÊU, không làm bạn đỏ:
 * ngày 06/09 một khoá đã bị nhả hộ vì có người đọc một dòng chẩn đoán thành "phiên kia rảnh". */
check("Khoá file đã trả hết", () => {
  let bang;
  try { bang = readClaims(); }
  catch (error) { return { ok: false, msg: `KHONG_DOC_DUOC_BANG: ${error.message}` }; }
  const tam = Object.entries(bang.tam || {}).filter(([, o]) => o?.owner);
  if (!tam.length) return { ok: true, msg: "Không khoá file nào đang giữ." };
  const cuaToi = tam.filter(([, o]) => o.owner === asLabel);
  const quaHan = khoaFileQuaHan(bang, PHUT_NHAC_KHOA_FILE).filter((x) => x.owner !== asLabel);
  const themCuaHo = quaHan.length
    ? ` Ngoài ra ${quaHan.length} khoá của lane khác đã quá ${PHUT_NHAC_KHOA_FILE} phút (${quaHan.map((x) => `${x.duongDan} ← ${x.owner}`).join(" · ")}) — NÊU để bạn HỎI họ, KHÔNG phải để nhả hộ.`
    : "";
  if (!cuaToi.length) {
    return { ok: true, msg: `${tam.length} khoá file đang giữ, không cái nào của bạn.${themCuaHo}` };
  }
  return {
    ok: false,
    msg: `KHOA_FILE_CON_TREO: bạn còn giữ ${cuaToi.length} khoá file: ${cuaToi.map(([d]) => d).join(" · ")}. `
      + "Khoá mức file sinh ra để giữ VÀI PHÚT quanh một lượt ghi, không giữ qua cả phiên — "
      + `giữ tiếp là chặn lane khác vì một việc bạn đã làm xong. Trả hết: node scripts/claim.mjs --xong --het --as ${asLabel}${themCuaHo}`,
  };
});
check("Kho chữ không phình", () => {
  /* HIẾN PHÁP TRƯỚC, `docs/` SAU — vì nó đắt hơn nhiều lần. `docs/` có 65 file mà một phiên
     chỉ mở 1–3 file theo việc; `AGENTS.md` thì MỌI phiên nạp trọn, trước cả khi biết mình sắp
     làm gì. Đo 09/09: cắt `docs/` từ 26.104 xuống 12.396 trong một ngày gỡ được ĐÚNG 0 dòng
     khỏi cái phải nạp. Đo đúng cái người ta than, đừng đo cái dễ đếm. */
  const tranAgents = structure?.agents?.tran_dong;
  if (typeof tranAgents === "number") {
    let dongAgents = null;
    try { dongAgents = fs.readFileSync(path.join(ROOT, "AGENTS.md"), "utf8").split(String.fromCharCode(10)).length - 1; }
    catch { /* repo chưa có AGENTS.md (kho thử) — không đo được KHÁC không đạt */ }
    if (dongAgents !== null && dongAgents > tranAgents) {
      return {
        ok: false,
        msg: "HIEN_PHAP_PHINH: AGENTS.md " + dongAgents + " dòng, thước cóc là " + tranAgents
          + " — thêm " + (dongAgents - tranAgents) + ". Giới hạn ⑦ của chính file đó bắt: MỘT LUẬT VÀO"
          + " THÌ MỘT LUẬT RA. Ba cửa ra: lấy một luật ra · chuyển phần kể chuyện (đo được bao nhiêu,"
          + " vấp ở đâu) sang một ADR rồi để lại một dòng trỏ sang · phần thêm cần thiết thật thì nâng"
          + " `agents.tran_dong` VÀ nói vì sao trong nhật ký phiên.",
      };
    }
  }
  const tran = structure?.docs?.tran_dong_khong_ke_adr;
  if (typeof tran !== "number") {
    return { ok: true, msg: "Repo chưa khai `docs.tran_dong_khong_ke_adr` — không có thước thì không đo." };
  }
  const ds = gitLoiLaBinhThuong("ls-files", "docs").split(String.fromCharCode(10))
    .map((d) => d.trim()).filter((d) => d && !d.startsWith("docs/adr/"));
  if (!ds.length) return { ok: true, msg: "Không có file `docs/` nào ngoài ADR." };
  let dong = 0;
  for (const f of ds) {
    // File vừa bị xoá khỏi cây làm việc thì bỏ qua, không ném: lượt sau `git ls-files` cũng
    // không còn kể nó, và một lượt dọn dở dang không đáng làm cổng đỏ vì lý do khác.
    try { dong += fs.readFileSync(path.join(ROOT, f), "utf8").split(String.fromCharCode(10)).length - 1; }
    catch { /* bỏ qua, xem trên */ }
  }
  if (dong <= tran) {
    const du = tran - dong;
    return {
      ok: true,
      msg: `${dong}/${tran} dòng (${ds.length} file, không kể ADR).`
        + (du >= 50 ? ` Đã dưới thước ${du} dòng — HẠ \`docs.tran_dong_khong_ke_adr\` xuống ${dong} để giữ phần đã dọn.` : ""),
    };
  }
  return {
    ok: false,
    msg: `KHO_CHU_PHINH: ${dong} dòng trong \`docs/\` (không kể ADR), thước cóc là ${tran} — thêm ${dong - tran}. `
      + "Đây KHÔNG phải trần lý tưởng, nó là con số của ngày hôm qua: phiên này đang làm kho chữ TO RA. "
      + "Ba cửa ra: xoá/gộp cho về dưới thước · chuyển phần dài sang một ADR (ADR không tính vào thước) · "
      + "phần thêm cần thiết thật thì nâng `docs.tran_dong_khong_ke_adr` VÀ nói vì sao trong nhật ký phiên.",
  };
});
check("Sổ nợ dưới trần", () => {
  const tran = structure?.backlog?.tran;
  if (typeof tran !== "number") {
    return { ok: true, msg: "Repo chưa khai `backlog.tran` trong .repo-structure.json — không có trần thì không có gì để canh." };
  }
  const so = path.join(ROOT, "BACKLOG.md");
  if (!fs.existsSync(so)) return { ok: true, msg: `Chưa có BACKLOG.md ở gốc repo (trần khai là ${tran}).` };
  const mo = dangMo(fs.readFileSync(so, "utf8"));
  if (mo.length <= tran) return { ok: true, msg: `${mo.length}/${tran} mục nợ đang mở.` };
  return {
    ok: false,
    msg: `SO_NO_VUOT_TRAN — ${mo.length} mục đang mở, trần là ${tran} (${mo.slice(0, 6).join(", ")}${mo.length > 6 ? ", …" : ""}). `
      + "ĐÓNG một mục là cổng xanh lại — thêm dòng `- **ĐÓNG <mã>** · <ngày> · lane `<tên>` · <bằng chứng>` ở CUỐI sổ, "
      + "đừng sửa khối cũ. Thấy trần thật sự quá chặt thì HỎI ĐỨC rồi sửa `backlog.tran`, không sửa script."
  };
});

// một dòng vào HANDOFF nói vì sao.
// 2026-09-02, phiên S4: 7 → 8. Thêm "Cổng kiểm cấu trúc B1–B14 (chỉ cảnh báo)". Lý do đã ghi
// một dòng vào HANDOFF.md gốc repo, đúng luật chống tự tháo cổng.
// 2026-09-02, phiên K2-2b: 8 → 9. Thêm "Bất biến quyền sở hữu ba tầng", vì trong cùng ngày hai
// công cụ đã quy một file về hai vùng khác nhau mà cổng vẫn xanh. Lý do ghi ở HANDOFF.md gốc.
// 2026-09-02, phiên K2-3: 9 → 10. Thêm "Nhãn lane trong commit", vì quy commit theo chủ HIỆN
// TẠI của vùng sai cả hai chiều — và chiều nguy hiểm là im lặng đẩy kèm việc người khác.
// 2026-09-03, phiên K2-vá-lỗi: 11 → 12. Thêm "Đọc git không lỗi", vì hàm đọc git nuốt mọi lỗi
// thành chuỗi rỗng, và chuỗi rỗng đó im lặng biến thành "vùng của tôi sạch" ngay trong guard
// của K2-9 — cổng tự miễn cho regression của chính lane. Audit GPT vòng 5 bắt được.
// 2026-09-06, lane claude-handoff-tran: 12 -> 13. Them "HANDOFF: muc moi trong tran, file dung
// thang" (ADR-0011). Ly do ghi mot dong vao HANDOFF.md goc repo, dung luat chong tu thao cong.
// 2026-09-08, lane claude-cua-kiem: 13 -> 14. Them "So no duoi tran". Duc chot tran 15 co hieu
// luc that; truoc do gioi han (4) cua AGENTS.md tu khai la KHONG co may cuong che, va no da vo
// trong im lang dung mot lan. Ly do ghi mot dong vao HANDOFF.md goc repo.
// 2026-09-08, lane claude-ext-mobang: 14 -> 15. Them "Kho chu khong phinh" — THUOC COC cho
// docs/ (tru ADR, vi ADR bat bien nen chi co the to len). Duc hoi "protocol clean, neu chua co
// ta nen xay dung dung khong?" — co, nhung la PHEP KIEM chu khong phai mot tai lieu moi: mot
// tai lieu day cach don tai lieu cong vao dung con so no dinh cat. Ly do ghi vao HANDOFF.md goc.
// 2026-09-08, lane claude-ext-khoafile: 15 -> 16. Them "Khoa file da tra het" — ca gia tri
// cua khoa muc file nam o chu NGAN, va khong gi cuong che chu do thi no thoai hoa thanh dung
// cai khoa vung dai han ma no thay the. Ly do ghi vao HANDOFF.md goc + ADR-0025.
const EXPECTED_CHECKS = 16;
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
/* ---- VÀNG: vùng BẠN đang giữ mà repo chưa thấy dấu vết — N-09 -------------
 *
 * CỐ Ý KHÔNG PHẢI MỘT PHÉP KIỂM. Nó không vào `results`, không đụng `EXPECTED_CHECKS`, và
 * không đổi mã thoát. Mức nghiêm trọng là PHẦN CỦA HỢP ĐỒNG, không phải chi tiết cài đặt:
 * một lane đọc kỹ 30 phút trước khi sửa một dòng là lane TỐT, và chặn nó là dạy mọi lane ghi
 * bừa một byte để giữ khoá cho hợp lệ — lúc đó phép kiểm thành thứ ngược lại chính nó.
 *
 * VÀ NÓ CHỈ NÓI VỚI CHÍNH LANE ĐANG GIỮ KHOÁ — người duy nhất biết mình có đang làm hay
 * không. Nó không nói với ai khác, và nó không bao giờ là giấy phép để một phiên khác nhả
 * khoá hộ (BRIEF-K2-KHOA-RANH-01 mục 2b: ba đường hợp lệ, không có đường thứ tư). */
if (CLAIMS) {
  const cuaToi = Object.fromEntries(Object.entries(CLAIMS)
    .filter(([, v]) => v?.owner === asLabel)
    .map(([k, v]) => [k, v.claimed_at]));
  let vet = new Map();
  try { vet = dauVetTheoVung(ROOT, structure, cuaToi); } catch { vet = new Map(); }
  const im = [...vet.entries()].filter(([, v]) => v.trangThai === DAU_VET.CHUA_THAY).map(([k]) => k);
  if (im.length) {
    console.log(`⚠ VÀNG (không chặn) — ${im.length} vùng bạn đang giữ mà ${CHUA_THAY_DAU_VET}: ${im.join(", ")}`);
    console.log("  Không commit nào chạm vùng đó kể từ lúc bạn nhận, và không file nào trong vùng bị sửa trên đĩa.");
    console.log("  Chỉ BẠN biết mình có đang làm hay không: đang dựng thử ngoài repo thì cứ giữ, câu này không");
    console.log("  chặn gì cả. Còn nếu chưa cần tới thì TỰ TRẢ để phiên khác vào được:");
    for (const k of im) console.log(`      node scripts/claim.mjs --release ${k} --as ${asLabel}`);
    console.log("");
  }
}

const failed = results.filter((r) => !r.ok);
console.log(failed.length ? `\nCHƯA XONG — ${failed.length} mục đỏ, sửa rồi chạy lại.\n` : `\nXANH TOÀN BỘ — được phép báo xong.\n`);
process.exit(failed.length ? 1 : 0);
