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

import { appendOnlyAtEof, areaOf, claimPrefixesFrom, FILE_HANH_CHINH, generatedFrom, generatorsFrom, laneFromMessage, LANE_TRAILER, ownershipInvariant, ownershipKeys, handoffCapFrom, readStructureFromDisk, stewardOf, THU_MUC_DOCS_KHONG_TINH, unitDirOf, unitDirsUnder, unitsFrom } from "./repo-structure.mjs";
import { napContext } from "./rule-compiler.mjs";
import { fingerprintState, readClaims, xetCuaIndex } from "./claim.mjs";
import { bamLenh, danhSachSuite, dauCay, docDau, xetDau, ghiDauCong, xoaDauCong, moiTruongNay } from "./chay-test.mjs";
import { CAU_CHI_DUONG, docMucTuFile, laNhatKy, mucMoi, thangCua, thangHienTai, vuotTran } from "./handoff.mjs";
import { parseBacklog } from "./what-next.mjs";

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
/* LỆNH GIT HỎNG KHÔNG ĐƯỢC TRÔNG NHƯ "KHÔNG CÓ DỮ LIỆU".
 *
 * Bản đầu là `catch { return "" }` — mọi lỗi thành chuỗi rỗng. Hậu quả không phải cổng chết,
 * mà cổng MÙ: "0 file được track · 0 thay đổi · 0 file cần test · secret 0/0 sạch", rồi
 * XANH TOÀN BỘ. Không phải kho git, git không có trong PATH, hay output vượt buffer trên repo
 * lớn — cả ba đều cho cùng một chuỗi rỗng, và cả ba đều dẫn tới xanh.
 *
 * Nay: vẫn trả chuỗi rỗng để chỗ gọi không phải viết lại, NHƯNG ghi lại là đã hỏng. Cuối phiên,
 * hỏng một lệnh nào là cổng ĐỎ — vì mọi con số phía sau đều là đoán. */
const gitLoi = [];
const git = (...a) => {
  try {
    return execFileSync("git", ["-c", "core.quotepath=false", ...a], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    gitLoi.push(`git ${a.slice(0, 2).join(" ")} → ${String(e.message).split(String.fromCharCode(10))[0].slice(0, 80)}`);
    return "";
  }
};

/* HỎI MỘT CÂU MÀ "KHÔNG" LÀ CÂU TRẢ LỜI HỢP LỆ.
 *
 * `git` ở trên ghi mọi lượt thất bại vào `gitLoi`, và cuối phiên một dòng trong đó làm cổng ĐỎ.
 * Đúng cho lệnh mà thất bại nghĩa là cổng đang mù. SAI cho câu hỏi kiểu *"file này đã có trên
 * nhánh xa chưa?"* — ở đó `git ls-tree` trả rỗng là **một câu trả lời**, không phải một sự cố,
 * và ghi nó vào `gitLoi` là tự làm mình đỏ vì một file mới hoàn toàn bình thường. */
const gitLoiLaBinhThuong = (...a) => {
  try {
    return execFileSync("git", ["-c", "core.quotepath=false", ...a], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch { return ""; }
};

/* MỐC SO = UPSTREAM CỦA NHÁNH ĐANG ĐỨNG, không phải `origin/main` đóng cứng.
 *
 * Cùng bệnh đã vá ở `safe-push` (v1.2.9), ở tool anh em. Đứng trên một nhánh tính năng mà nhánh
 * gốc chưa có `HANDOFF.md` thì `git show origin/main:HANDOFF.md` NỔ, cổng báo `GIT_HONG`, và
 * theo đúng luật fail-closed của chính nó thì **mọi con số phía trên thành "đoán"**. Đo thật ở
 * repo 3AI ngày 04/09: cổng không thể xanh trên nhánh đó — không phải vì repo sai, mà vì công cụ
 * chỉ biết một hình dạng.
 *
 * Nhánh chưa có upstream thì lùi về `origin/main`: vẫn là câu trả lời cũ, và các lớp fail-closed
 * sẵn có phía dưới lo phần "không phân giải được". */
const MOC = (() => {
  try {
    const u = execFileSync("git", ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"],
      { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    if (u) return u;
  } catch { /* chưa có upstream */ }
  return "origin/main";
})();

// Mỗi lượt cổng thay thế bằng chứng cũ, kể cả lượt --quick hay lượt bị lỗi.
let dauCongTruoc;
let loiDauCong;
try {
  xoaDauCong(ROOT);
  dauCongTruoc = { ...dauCay(ROOT), lenh: bamLenh(danhSachSuite(ROOT)), moc: git("rev-parse", "--verify", MOC).trim() };
} catch (e) { loiDauCong = e.message; }

const results = [];
const check = (name, fn) => {
  try { const r = fn(); results.push({ name, ...r }); }
  catch (error) { results.push({ name, ok: false, msg: `Phép kiểm lỗi: ${error.message}` }); }
};

/* GỘP NHIỀU PHÉP ĐO THÀNH MỘT MỤC CỔNG — Đức chốt 09/09: *"xếp hạng lại phép kiểm, giảm xuống 25,
 * giữ trần 32"*.
 *
 * VÌ SAO GỘP CHỨ KHÔNG XOÁ: bỏ một phép đo là **nới một lớp bảo vệ**, và luật vàng số 3 cấm.
 * Nhưng bốn cặp dưới đây trả lời CÙNG MỘT CÂU HỎI bằng hai mục riêng — đó là trùng lặp ở lớp
 * BÁO CÁO, không phải hai lớp bảo vệ. Gộp lại thì số mục xuống mà **không mất một khẳng định nào**:
 * phép đo con nào đỏ vẫn được nêu đích danh trong lời nhắn.
 *
 * BẤT BIẾN CỦA HÀM NÀY, và nó là chỗ dễ làm hỏng nhất: **một con đỏ thì cả mục ĐỎ**. Viết thành
 * "đa số thắng" hay "đỏ mềm" là biến bốn lớp bảo vệ thành một lớp yếu hơn cả bốn. `skipped` chỉ
 * giữ khi MỌI con đều skip — một con chạy thật thì mục đã có nội dung để nói. */
const ghepKiem = (name, ...phepDo) => check(name, () => {
  const kq = phepDo.map(([nhan, fn]) => ({ nhan, ...fn() }));
  const do_ = kq.filter((k) => !k.ok);
  const noiDung = (ds) => ds.map((k) => `${k.nhan}: ${k.msg}`).join(" · ");
  if (do_.length) return { ok: false, msg: noiDung(do_) };
  if (kq.every((k) => k.skipped)) return { ok: true, skipped: true, msg: noiDung(kq) };
  return { ok: true, msg: noiDung(kq) };
});

/* ---- những gì đã thay đổi trong phiên này ------------------------------- */
// "Phiên này" = mọi thứ chưa có trên origin/main: commit chưa push + working tree.
// `--untracked-files=all` bắt Git liệt kê FILE thật. Mặc định Git co cả thư mục mới thành
// `?? evidence/`, khiến phép bản đồ không thể biết đường dẫn file nào cần được khai.
const porcelain = git("status", "--porcelain", "--untracked-files=all").split("\n").filter(Boolean);
const workingChanges = porcelain.map((line) => ({ code: line.slice(0, 2).trim(), file: line.slice(3).replace(/^"|"$/g, "") }));
const unpushed = git("diff", "--name-only", `${MOC}...HEAD`).split("\n").filter(Boolean);
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
const originMainResolves = git("rev-parse", "--verify", MOC).trim() !== "";

// Trạng thái của CẢ PHIÊN, không chỉ cây làm việc. `git status` không thấy file đã commit;
// so thẳng origin/main → working tree thì thấy cả commit chưa push, staged và unstaged.
// `--no-renames` cố ý tách rename thành xoá file cũ + thêm file mới: trong vùng append-only,
// đổi tên file cũ vẫn là xoá bằng chứng cũ và phải bị chặn.
const parseNameStatus = (text) => String(text ?? "").split("\n").filter(Boolean).map((line) => {
  const [code, ...parts] = line.split("\t");
  return { code, file: parts.join("\t").replace(/^"|"$/g, "") };
});
const comparedChanges = originMainResolves
  ? parseNameStatus(git("diff", "--name-status", "--no-renames", MOC))
  : [];
const sessionChanges = originMainResolves
  ? [...comparedChanges, ...workingChanges.filter((c) => c.code === "??")]
  : workingChanges;

const workingFiles = new Set(workingChanges.map((c) => c.file));
const nhanCuaFile = new Map();                       // file -> tập nhãn đã chạm nó (null = không nhãn)
if (originMainResolves) {
  for (const sha of git("log", "--format=%H", `${MOC}..HEAD`).split("\n").filter(Boolean)) {
    const { lane, problem } = laneFromMessage(git("log", "-1", "--format=%B", sha));
    // Nhãn HỎNG cũng coi như KHÔNG có nhãn: không quy thuộc được thì không được miễn cho ai.
    const nhan = problem ? null : lane;
    for (const f of git("show", "--name-only", "--format=", sha).split("\n").filter(Boolean).map((s) => s.replace(/^"|"$/g, ""))) {
      if (!nhanCuaFile.has(f)) nhanCuaFile.set(f, new Set());
      nhanCuaFile.get(f).add(nhan);
    }
  }
}
/* QUY THUỘC ĐƯỢC = việc này ĐÃ CÓ NGƯỜI ĐỨNG TÊN. Đó là câu duy nhất mục "phạm vi" hỏi.
 *
 * KHUNG-53, đo 08/09. Từ 08/09 mặc định là khoá mức FILE, và khoá file trả NGAY sau commit —
 * nên tới lúc chạy cổng, bảng khoá VÙNG trống một cách hoàn toàn hợp lệ. Cổng cũ đi tìm câu
 * trả lời trong bảng khoá vùng, nên nó ĐỎ ở đúng con đường Đức vừa chốt: một phiên làm đúng
 * luật mới phải nhận lại **4 khoá vùng cho 6 lượt commit**, mỗi lượt chặn lane khác vô ích.
 * `ADR-0012` mục ⑷ nói rõ chỗ mang trách nhiệm truy nguồn là nhãn `Lane:` trong commit, KHÔNG
 * phải bảng khoá. Cổng đang hỏi bảng khoá một câu mà bảng khoá không còn là chỗ trả lời.
 *
 * ĐỔI ĐÚNG MỘT ĐIỀU: nhãn của CHÍNH TÔI cũng là một câu trả lời, y như nhãn của người khác.
 * Bản cũ chỉ miễn cho nhãn NGƯỜI KHÁC — tức cổng tin lời khai của mọi lane trừ lane đang hỏi.
 *
 * KHÔNG PHẢI NỚI, và chiều fail-closed giữ nguyên từng vế:
 *   · một nguồn KHÔNG nhãn (hoặc nhãn HỎNG) là đủ để KHÔNG quy thuộc được → vẫn ĐỎ;
 *   · file còn trong CÂY LÀM VIỆC thì chưa commit nào đứng tên nó → vẫn phải có khoá, vẫn ĐỎ.
 * Cả hai vế có ca hỏng dựng sẵn ở `tests/cong-do-that.mjs` khối 1. */
/* `size > 0` KHÔNG dư: `[].every(Boolean)` trả `true`, nên một mục Map rỗng sẽ nói "quy thuộc
   được" khi KHÔNG nhãn nào đứng tên. Hôm nay không tới được (chỗ điền Map luôn `.add` ngay sau
   khi `set`), nhưng hướng hỏng là fail-OPEN, và audit độc lập nêu đúng chỗ này 10/09. Không có
   fixture vì không dựng nổi ca hỏng — ghi ra đây để lượt sau đọc được lý do, không phải để tin. */
const nhanHopLe = (file) => nhanCuaFile.has(file) && nhanCuaFile.get(file).size > 0
  && [...nhanCuaFile.get(file)].every(Boolean);
const daQuyThuoc = (file) => !workingFiles.has(file) && nhanHopLe(file);
// Nhãn của TÔI trên một file đã commit → vùng đó là việc của tôi, dù tôi không giữ khoá vùng nào.
const nhanCuaToi = (file) => daQuyThuoc(file) && [...nhanCuaFile.get(file)].some((nhan) => nhan === asLabel);
// Chỉ dùng cho việc dò MỒ CÔI. Các phép kiểm khác vẫn thấy `touched` đầy đủ — thu hẹp phạm vi
// của chúng là một bản vá khác, và trộn hai việc vào một là cách làm mất dấu cái nào gây ra gì.
const touchedToiPhaiTraLoi = touched.filter((f) => !daQuyThuoc(f));

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
/* Khối `tam` — khoá mức FILE, loại giữ VÀI PHÚT. Đọc riêng vì nó có vòng đời khác hẳn `claims`:
   khoá vùng trả SAU khi đẩy, khoá file trả NGAY sau lượt ghi. */
const KHOA_FILE = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, ".agents", "claims.json"), "utf8")).tam || {}; }
  catch { return null; }
})();
// Chạy qua shell chứ không spawn trực tiếp: từ Node 24, spawn một file `.cmd` trên Windows
// trả `EINVAL` (siết bảo mật). Và `scripts.test` vốn là một chuỗi lệnh nhiều bước nối bằng
// `&&` — thứ chỉ shell hiểu. Đo thật: bản đầu dùng execFileSync("npm.cmd") và chết ngay.
const runRootSuite = () => execSync("npm test --silent", { cwd: ROOT, encoding: "utf8", timeout: 900000 });
const hasRootTestScript = () => {
  try { return Boolean(JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"))?.scripts?.test); }
  catch { return false; }
};
/* HAI ĐƯỜNG ĐỨNG TÊN, không một. Khoá vùng là đường cũ; nhãn `Lane:` của chính tôi trên một
   commit là đường mới (KHUNG-53) — xem khối `daQuyThuoc` ở trên. Mọi phép kiểm dưới đây suy ra
   từ `myPackages` / `myRootAreas`, nên nới ở ĐÂY là nới đúng một chỗ: suite gốc chạy, cổng đòi
   Log HANDOFF, và phép kiểm vùng chỉ-thêm soi việc của tôi — cả ba đều SIẾT LẠI, không lỏng ra.
   Trước bản này, một phiên chỉ dùng khoá file thoát cả ba trong im lặng. */
const goiCoNhanCuaToi = new Set(touched.filter(nhanCuaToi).map((f) => areaOf(f, claimPrefixes)).filter((a) => a !== "_root"));
const myPackages = packagesTouched.filter((pkg) => ownedBy(pkg) === asLabel || goiCoNhanCuaToi.has(pkg));
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
/* "FILE CHƯA CÓ Ở MỐC SO" KHÔNG PHẢI "GIT HỎNG" — lần thứ sáu cùng một hình dạng.
 *
 * `git show <mốc>:<file>` thất bại vì HAI lý do khác hẳn nhau, và `git()` gộp cả hai thành một
 * dòng trong `gitLoi` → cổng báo `GIT_HONG` → theo đúng luật fail-closed của chính nó, MỌI con
 * số phía trên thành "đoán". Đo thật ở 3AI 04/09: `HANDOFF.md` do bộ khung thêm vào nên nó chưa
 * có trên nhánh gốc, và cổng KHÔNG THỂ XANH — trong khi repo hoàn toàn lành. Vòng luẩn quẩn:
 * cổng đòi xanh mới được đẩy, mà chỉ đẩy xong nó mới hết đỏ.
 *
 * `ls-tree` tách được, y như đã làm cho sổ phát hành ở v1.2.8: mã thoát nói git có chạy được
 * không, output rỗng nói đường dẫn có tồn tại ở mốc đó không. Chưa có thì bản cũ là RỖNG —
 * và `appendOnlyAtEof` với bản cũ rỗng đúng nghĩa "cả file là phần thêm mới".
 *
 * Phép dò này CỐ Ý dùng `git()` chứ không phải một hàm im lặng: `ls-tree` chỉ thất bại khi mốc
 * so không phân giải được, mà ca đó đã có đường mềm riêng ở dưới (lùi về `origin/main`, rồi
 * "chỉ thấy CÂY LÀM VIỆC"). Thêm một hàm im lặng ở đây là thêm một lớp không có ca hỏng nào để
 * canh — và một lớp không dựng nổi ca hỏng thì chưa bao giờ là lớp bảo vệ. */
const handoffCoOMoc = git("ls-tree", MOC, "--", ROOT_HANDOFF).trim() !== "";
const handoffAppendOnly = appendOnlyAtEof(
  git("diff", "-U0", MOC, "--", ROOT_HANDOFF),
  handoffCoOMoc ? git("show", `${MOC}:${ROOT_HANDOFF}`) : ""
);
const adminFile = (f) => f === ".agents/claims.json" || (f === ROOT_HANDOFF && handoffAppendOnly);

const keyOf = (f) => stewardOf(f, structure, claimPrefixes);
// MỘT CỬA DUY NHẤT (K2-2b): cả cổng này và `safe-push.mjs` đi qua `ownershipKeys`. Trước đó mỗi
// bên tự gộp tập khoá, và 02/09 hai bên đã trả hai câu khác nhau cho cùng một file — xem ghi chú
// trong repo-structure.mjs. Khoá gốc luôn bắt đầu bằng "_"; vùng chia-theo-gói thì không.
const keysTouched = ownershipKeys(touched, structure, claimPrefixes, adminFile);
const rootAreasTouched = keysTouched.filter((k) => k.startsWith("_"));
const khoaGocCoNhanCuaToi = new Set(
  ownershipKeys(touched.filter(nhanCuaToi), structure, claimPrefixes, adminFile).filter((k) => k.startsWith("_"))
);
const myRootAreas = rootAreasTouched.filter((k) => ownedBy(k) === asLabel || khoaGocCoNhanCuaToi.has(k));
// Mồ côi xét trên tập ĐÃ TRỪ việc của lane khác (K2-1b). Đây là chỗ 9% lượt "giữ khoá vì chưa
// push được" biến mất: một phiên nay trả khoá xong vẫn đẩy được sau, mà cổng phiên kế không đỏ oan.
const orphanRootAreas = ownershipKeys(touchedToiPhaiTraLoi, structure, claimPrefixes, adminFile)
  .filter((k) => k.startsWith("_"))
  .filter((k) => !CLAIMS?.[k] || !CLAIMS[k].owner);
const foreignRootAreas = rootAreasTouched.filter((k) => ownedBy(k) && ownedBy(k) !== asLabel);
/* `rootTouched` / `rootMine` ĐÃ XOÁ 10/09. `rootMine` chỉ còn một chỗ dùng là `rootIsMine`, mà
   biến đó không ai đọc — code chết từ lâu. Audit độc lập nêu nó như một chỗ nghĩa CÓ THỂ lệch sau
   khi `myRootAreas` được nới; nghĩa của một biến chết thì không lệch được, nên đường rẻ nhất là
   xoá. Cần lại thì `git log` có. */
const mine = (file) => myPackages.some((pkg) => file.startsWith(`${pkg}/`))
  || (areaOf(file, claimPrefixes) === "_root" && myRootAreas.includes(keyOf(file)));

/* ---- 0b. Khoá mức FILE đã trả hết --------------------------------------- */
const doKhoaFile = () => {
  /* MỐC LÀ *HẾT PHIÊN*, KHÔNG PHẢI *ĐÃ ĐẨY* — và đây là chỗ khác khoá vùng, đừng lẫn.
   *
   * Khoá vùng trả SAU khi đẩy, vì commit chưa đẩy nằm trong một vùng vô chủ để lại một mục đỏ
   * cho phiên sau (xem `tra_khi_chua_day` trong `claim.mjs`). Khoá file KHÔNG mang trách nhiệm
   * truy nguồn — nhãn `Lane:` trong commit mang. Nên nó chỉ cần biến mất khi bạn ngừng gõ.
   *
   * Vì sao cần cổng: khoá file sinh ra để giữ vài phút, và thứ duy nhất bắt nó thật sự ngắn là
   * một chỗ ĐỎ khi bạn định báo xong. Không có cổng thì nó thoái hoá thành đúng cái khoá dài
   * hạn mà nó thay thế — luật *"nhận ngay trước lượt ghi"* đã có sẵn từ lâu, không ai theo, và
   * không gì đo nó. Đó là hình dạng một luật-là-chữ. */
  if (KHOA_FILE === null) return { ok: false, msg: "Không đọc được `.agents/claims.json` — xem AGENTS.md mục 1." };
  const cua = Object.entries(KHOA_FILE).filter(([, o]) => o?.owner === asLabel);
  if (!cua.length) {
    const nguoiKhac = Object.keys(KHOA_FILE).length;
    return { ok: true, msg: nguoiKhac ? `Bạn không giữ khoá file nào (${nguoiKhac} của phiên khác — không phải việc của bạn).` : "Không khoá file nào đang treo." };
  }
  const NL1 = String.fromCharCode(10);
  return {
    ok: false,
    msg: `KHOA_FILE_CON_TREO: bạn còn giữ ${cua.length} khoá mức FILE — ${cua.map(([d]) => d).join(" · ")}.`
      + NL1 + "Khoá file là loại giữ VÀI PHÚT: nhận ngay TRƯỚC lượt ghi, trả ngay SAU."
      + NL1 + "Mốc là HẾT PHIÊN, không phải ĐÃ ĐẨY — nó không mang trách nhiệm truy nguồn, nhãn `Lane:` mang."
      + NL1 + `Trả hết: node scripts/claim.mjs --xong --het --as ${asLabel}`,
  };
};

/* ---- 1. Chủ sở hữu ------------------------------------------------------ */
const doPhamVi = () => {
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
  // Việc của phiên khác trong cùng thư mục KHÔNG phải lỗi của bạn — báo cho
  // biết rồi loại khỏi mọi phép kiểm sau. Cổng không thể biết ai gõ phím nào;
  // giả vờ biết chỉ tạo ra lời buộc tội sai.
  const foreign = foreignPackages.map((pkg) => `${pkg} [${ownedBy(pkg)}]`);
  for (const key of foreignRootAreas) foreign.push(`${key} [${ownedBy(key)}]`);
  const note = foreign.length ? ` · bỏ qua (của phiên khác): ${foreign.join(", ")}` : "";
  const yoursList = [...myPackages, ...myRootAreas];
  const yours = yoursList.length ? yoursList.join(", ") : "(không đụng vùng nào)";
  return { ok: true, msg: `Phần của bạn: ${yours}${note}` };
};

/* ---- 2. Vùng bằng chứng ------------------------------------------------- */
const doBangChung = () => {
  // Nguồn sự thật là `.repo-structure.json`, không phải tên thư mục mà code đoán. Một repo
  // khai `records/` append-only thì `records/` phải được bảo vệ y như `evidence/`.
  const appendOnlyPrefixes = Object.entries(structure?.areas ?? {})
    .filter(([key, area]) => !key.startsWith("_") && area?.mutability === "append-only")
    .map(([key]) => key.replaceAll("\\", "/"));
  const inAppendOnlyArea = (file) => appendOnlyPrefixes.some((prefix) => file.startsWith(prefix));
  // Thêm mới (A/??) thì được; sửa, xoá hoặc đổi tên file đã có thì không.
  const violations = sessionChanges.filter((c) => mine(c.file) && inAppendOnlyArea(c.file) && /[MDR]/.test(c.code));
  if (violations.length) return { ok: false, msg: `Sửa/xoá bằng chứng vận hành: ${violations.map((v) => v.file).join(", ")}. Chỉ được THÊM mới.` };
  return { ok: true, msg: "Bằng chứng cũ nguyên vẹn." };
};

/* HÀNG GIẢ TRONG FIXTURE KHÔNG PHẢI SECRET.
 *
 * Bộ quét mở rộng ra mọi loại file lập tức báo nhầm một fixture có thật ở repo NAV:
 * `token = "test-one-session-token"`. Nó khớp dạng `token = <22 ký tự>`, và nó hoàn toàn vô hại.
 *
 * Vì sao chuyện này đáng sửa NGAY chứ không phải "chấp nhận cho chắc": một cổng hay báo nhầm sẽ
 * bị người ta tắt, hoặc tệ hơn — bị lướt qua theo thói quen. Lúc đó nó không còn canh gì nữa,
 * mà vẫn hiện lên màn hình như đang canh.
 *
 * Cách phân biệt: secret thật không tự khai mình là đồ giả. Chuỗi mang một trong các dấu dưới
 * đây là fixture, biến mẫu, hoặc chỗ trống chờ điền. */
const DAU_HANG_GIA = [
  "test", "example", "sample", "dummy", "fake", "placeholder", "your-", "your_",
  "changeme", "change-me", "redacted", "xxxxx", "<", "${", "{{", "...", "…"
];
function laHangGia(doan) {
  const thap = doan.toLowerCase();
  return DAU_HANG_GIA.some((d) => thap.includes(d));
}

/* ---- 3. Secret ---------------------------------------------------------- */
check("Không có secret lọt vào repo", () => {
  const tracked = git("ls-files").split("\n").filter(Boolean);
  const badName = tracked.filter((f) => /pairing.*\.json$/i.test(f));
  if (badName.length) return { ok: false, msg: `File pairing bị track: ${badName.join(", ")}. Gỡ khỏi git và cho vào .gitignore.` };
  /* QUÉT THEO DANH SÁCH LOẠI TRỪ, KHÔNG THEO DANH SÁCH CHO PHÉP.
   *
   * Bản cũ chỉ đọc `.js .mjs .json .md .ps1 .cmd`. Nghĩa là `.env`, `.yaml`, `.yml`, `.toml`,
   * `.py`, `.sh`, `.ini`, `.txt` — đúng những nơi secret hay nằm nhất — **không bao giờ được
   * đọc**. Và câu kết in ra "Quét N file được track, sạch" với N là TỔNG số file track, trong
   * khi nó chỉ đọc một phần. Lỗ hổng thì còn vá được; một con số nói dối trong báo cáo thì làm
   * người đọc thôi không kiểm nữa.
   *
   * Danh sách cho phép luôn lạc hậu sau đuôi file tiếp theo mà repo thêm vào. Danh sách loại
   * trừ thì không: thứ gì không đọc được sẽ được KỂ RA là không đọc được, chứ không biến mất. */
  const patterns = [
    /"token"\s*:\s*"[A-Za-z0-9_\-]{20,}"/,
    /Bearer\s+[A-Za-z0-9_\-]{24,}/,
    // Dạng KEY=value / key: value — dạng phổ biến nhất trong .env, .yaml, .ini, .toml
    // GIÁ TRỊ PHẢI TRÔNG NHƯ MỘT GIÁ TRỊ, KHÔNG PHẢI MỘT CÁI TÊN.
    //
    // Bản đầu chấp nhận giá trị không có nháy, nên dòng này bị kêu là secret ở repo Project 3AI:
    //     api_key = _paperclip_env_value(PAPERCLIP_API_KEY_ENV)
    // Đó là một lời gọi hàm, hoàn toàn vô hại — `_paperclip_env_value` vừa đủ 20 ký tự nên lọt.
    //
    // Vì sao phải sửa ngay chứ không phải "báo thừa cho chắc": một cổng hay báo nhầm sẽ bị tắt,
    // hoặc tệ hơn — bị lướt qua theo thói quen. Lúc đó nó không còn canh gì nữa mà vẫn hiện lên
    // màn hình y như đang canh.
    //   (a) có nháy — cách một secret thật gần như luôn xuất hiện trong mã nguồn
    new RegExp("(?:api[_-]?key|secret|token|password|passwd|access[_-]?key|private[_-]?key|client[_-]?secret)\\s*[:=]\\s*[\"'][A-Za-z0-9_\\-\\/+=]{20,}[\"']", "i"),
    //   (b) kiểu file .env — KEY=value trọn một dòng, không dấu cách, không ngoặc
    new RegExp("^[A-Z0-9_]*(?:API_?KEY|SECRET|TOKEN|PASSWORD|ACCESS_?KEY)\\s*=\\s*[A-Za-z0-9_\\-\\/+=]{20,}\\s*$", "mi"),
    /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/,
    /\bsk-[A-Za-z0-9]{20,}/,          // OpenAI
    /\bghp_[A-Za-z0-9]{30,}/,          // GitHub personal token
    /\bAKIA[0-9A-Z]{16}\b/             // AWS access key id
  ];
  const suspects = [];
  let daDoc = 0;
  const khongDocDuoc = [];
  const nhiPhan = [];
  for (const file of tracked) {
    const full = path.join(ROOT, file);
    let buf;
    try { buf = fs.readFileSync(full); } catch { khongDocDuoc.push(file); continue; }
    /* "LÀ FILE NHỊ PHÂN" LÀ MỘT CÂU TRẢ LỜI, KHÔNG PHẢI MỘT DẤU HỎI.
     *
     * Bản đầu gộp nó với "đọc không được" và "quá lớn", nên mọi repo có một cái ảnh đều mang
     * vĩnh viễn một mục [BỎ] — tức cổng KHÔNG BAO GIỜ xanh được ở bất kỳ repo thật nào. Đo được
     * ở 3AI 04/09: 33 file (PNG, XLSX trong `archive/`) giữ cổng ở "chưa đủ bằng chứng" mãi mãi.
     * Lại đúng cái bệnh "luật không thoả được thì sớm muộn bị bỏ qua cả cụm".
     *
     * ĐÂY KHÔNG PHẢI NỚI LỎNG: phép kiểm này giải UTF-8 rồi dò mẫu chữ, nên nó CHƯA BAO GIỜ soi
     * được file nhị phân. Gọi tên đúng thứ nó vốn không làm được không mất đi một chút phát hiện
     * nào — chỉ thôi dán nhãn "không biết" lên một chỗ ta biết rõ.
     *
     * Hai ca kia thì GIỮ NGUYÊN là KHÔNG BIẾT: "đọc không được" và "quá lớn" là file văn bản
     * thật sự chưa được soi. */
    if (buf.subarray(0, 8192).includes(0)) { nhiPhan.push(file); continue; }
    /* THỨ TỰ QUAN TRỌNG: phép thử nhị phân phải chạy TRƯỚC phép thử kích thước.
       Đảo lại thì một tấm PNG 3MB bị gọi là "quá lớn" — tức KHÔNG BIẾT — trong khi ta biết
       thừa nó là ảnh. Đo ở 3AI: sau khi tách nhị phân vẫn còn 4 file kẹt, cả bốn đều là
       PNG/PPTX chỉ vì chúng vượt ngưỡng trước khi kịp được nhận là nhị phân.
       "Có phải nhị phân không" không phụ thuộc kích thước; ngưỡng này để tránh giải mã một
       file VĂN BẢN khổng lồ, nên nó thuộc về sau. */
    if (buf.length > 2_000_000) { khongDocDuoc.push(`${file} (quá lớn)`); continue; }
    daDoc += 1;
    const text = buf.toString("utf8");
    for (const p of patterns) {
      const m = text.match(p);
      if (m && !laHangGia(m[0])) { suspects.push(file); break; }
    }
  }
  if (suspects.length) return { ok: false, msg: `Nghi có token thật trong: ${suspects.join(", ")}. Kiểm tra bằng mắt trước khi commit.` };
  const duoi = (khongDocDuoc.length
    ? ` · ${khongDocDuoc.length} file KHÔNG đọc được (${khongDocDuoc.slice(0, 3).join(", ")}${khongDocDuoc.length > 3 ? ", …" : ""}) — không kiểm được, không phải đã sạch`
    : "")
    + (nhiPhan.length ? ` · bỏ qua ${nhiPhan.length} file nhị phân (phép kiểm này dò mẫu chữ, không áp dụng cho ảnh/nhị phân)` : "");
  // File khong doc duoc = CHUA KIEM. Bao [XANH] o day la dung cai benh ca cong nay sinh ra
  // de chua: badge xanh trong khi mot phan repo chua he duoc soi.
  return {
    ok: true,
    ...(khongDocDuoc.length ? { skipped: true } : {}),
    msg: `Đọc thật ${daDoc}/${tracked.length} file được track, sạch${duoi}.`
  };
});

/* File nào chứa Bản đồ file. Repo khai `docs.file_map` trong `.repo-structure.json`; không khai
   thì vẫn là `AGENTS.md` như trước — repo cũ không phải đổi gì. */
const KHAI_BAN_DO = (() => {
  const v = structure?.docs?.file_map;
  return typeof v === "string" && v.trim() ? v.trim() : null;
})();
const FILE_BAN_DO = KHAI_BAN_DO || "AGENTS.md";

/* ---- 4. File mới phải khai vào Bản đồ file ------------------------------ */
check("File mới đã khai vào Bản đồ file", () => {
  // LỌC THEO VÙNG MÌNH GIỮ LÀ ĐÚNG — nhưng lọc còn RỖNG thì KHÔNG phải "đã đạt".
  //
  // Ca đo được ở repo Project 3AI ngày 03/09: cùng một cây làm việc, cùng một giây, hai nhãn
  // phiên khác nhau cho hai câu trả lời khác nhau — `--as migrate-3ai` ra 40 file chưa khai,
  // `--as mot-nhan-khac` ra "Mọi thứ mới đều đã khai". Vì phiên sau không giữ vùng nào nên bộ
  // lọc quét sạch danh sách, và cổng báo XANH vì RỖNG.
  //
  // Cùng họ với mọi lỗ fail-open đã vá hôm nay, và là họ nguy hiểm nhất: gõ một nhãn phiên khác
  // là cổng đổi câu trả lời. Nên: lọc hết sạch mà vẫn CÓ file mới thì đó là `BỎ`, kèm câu nói
  // thẳng vì sao không kiểm được.
  const themMoi = sessionChanges.filter((c) => /^(A|\?\?)/.test(c.code)).map((c) => c.file);
  const added = themMoi.filter(mine);
  if (themMoi.length > 0 && added.length === 0) {
    return {
      ok: true,
      skipped: true,
      msg: `${themMoi.length} file mới đều thuộc vùng phiên KHÁC đang giữ, nên cổng KHÔNG kiểm được cái nào. Đây là "chưa kiểm", không phải "đã đạt" — chạy lại dưới đúng nhãn phiên đang giữ vùng đó.`
    };
  }
  const undeclared = [];
  const khaiSaiBanDo = new Set();
  /* TÌM BẢN ĐỒ BẰNG MỐC, KHÔNG BẰNG SỐ MỤC.
   *
   * Bản đầu đóng cứng `## 6.` … `## 7.` — tức là số mục trong `AGENTS.md` CỦA BỘ KHUNG. Repo
   * thật hiếm khi có cùng số mục: repo "Project 3 AI Agent Unify" có 8 mục KHÔNG ĐÁNH SỐ, nên
   * không tìm thấy đoạn nào, `map` rỗng, và **mọi file mới đều bị coi là chưa khai**. Cổng đỏ
   * hàng loạt, không có cách sửa nào ngoài việc viết lại `AGENTS.md` của repo đích cho giống
   * repo nhà — đúng thứ mà quy trình migrate ghi rõ là KHÔNG thuộc phạm vi.
   *
   * Ba cách tìm, theo thứ tự tin cậy giảm dần. Không thấy thì nói THẲNG là không thấy, chứ
   * không im lặng coi như bản đồ rỗng — hai chuyện đó cần hai cách sửa khác hẳn nhau. */
  const mapSection = (text) => {
    const lines = String(text ?? "").replaceAll("\r", "").split("\n");

    // (1) Mốc tường minh. Repo nào muốn chắc chắn thì đặt hai dòng này quanh bản đồ.
    const b = lines.findIndex((l) => l.includes("<!-- BAN-DO:BEGIN -->"));
    const e = lines.findIndex((l, i) => i > b && l.includes("<!-- BAN-DO:END -->"));
    if (b >= 0 && e > b) return lines.slice(b, e).join("\n");

    // (2) Tiêu đề gọi đúng tên việc, ở BẤT KỲ cấp nào, có đánh số hay không.
    const laTieuDe = (l) => /^#{1,6}\s/.test(l);
    const start = lines.findIndex((l) => laTieuDe(l) && /bản đồ file|sổ tay mở khi cần|file map/i.test(l));
    if (start >= 0) {
      const cap = lines[start].match(/^#+/)[0].length;
      const end = lines.findIndex((l, i) => i > start && laTieuDe(l) && l.match(/^#+/)[0].length <= cap);
      return lines.slice(start, end > start ? end : lines.length).join("\n");
    }
    return null;   // null = KHÔNG TÌM THẤY, khác hẳn "" = tìm thấy nhưng rỗng
  };
  const thieuBanDo = [];
  const mentionsExactPath = (text, relPath) => {
    const escaped = relPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Chấp nhận link Markdown, inline-code hoặc lệnh có chứa đúng đường dẫn. Hai biên cấm
    // `scripts/` tự nhận vơ mọi file con chỉ vì cùng tiền tố.
    return new RegExp(`(^|[\\s(\\[{\"'\\x60|])${escaped}(?=$|[\\s)\\]}\"'\\x60|,.:;])`, "m").test(text);
  };
  for (const file of added) {
    // Thư mục đơn vị lấy theo hình dạng đã khai, không đóng cứng `workers/<gói>/<phiên-bản>`.
    const pkgDir = unitDirOf(file, unitShape);
    // File GỐC repo đối chiếu bản đồ ở `AGENTS.md` GỐC. Bản cũ `continue` ở đây, nên thêm một
    // thư mục top-level mới mà không khai vào bản đồ thì không ai bắt — đúng lỗ mà luật vàng 4
    // ("không khai = không tồn tại") sinh ra để bịt.
    const base = pkgDir ?? "";
    /* NƠI ĐẶT BẢN ĐỒ DO REPO KHAI, mặc định `AGENTS.md`.
     * VẤP THẬT 05/09, lượt migrate `n8n-orchestrator`: repo đó để Bản đồ file ở
     * `design_brief.md` mục 8 — hợp lệ theo luật của chính nó, và luật đó có TRƯỚC bộ khung.
     * Cổng chỉ tìm trong `AGENTS.md` nên đỏ cho tới khi phải thêm một mục thứ hai vào
     * `AGENTS.md`. Kết quả: repo đó nay có HAI bản đồ ở hai file — hai nguồn cho một khái niệm,
     * đúng bệnh mà cả bộ khung sinh ra để chữa, và lần đó bộ khung là thủ phạm. */
    const agentsPath = path.join(ROOT, base, FILE_BAN_DO);
    /* KHAI TRỎ VÀO HƯ KHÔNG PHẢI ĐỎ, KHÔNG ĐƯỢC BỎ QUA IM LẶNG.
     *
     * `continue` ở đây an toàn khi nơi đặt bản đồ còn đóng cứng `AGENTS.md`: package con không
     * có `AGENTS.md` là chuyện thường, và bản đồ gốc đã canh phần còn lại.
     * Từ 1.3.3, repo khai được `docs.file_map` — và đúng lúc đó dòng này thành CỬA HẬU. Đo thật
     * ngay trong lượt 1.3.4: khai `file_map` trỏ tới một file không tồn tại, thêm một file mới
     * chưa khai ở đâu cả, cổng báo **XANH** — "Mọi thứ mới đều đã khai".
     * Một dòng cấu hình vô hiệu hoá cả một cổng, không cảnh báo gì. Đây là loại lỗ mà chính
     * luật vàng số 3 cấm: không được làm yếu lớp bảo vệ đã có.
     *
     * Nên tách hai ca: repo KHÔNG khai (dùng mặc định) thì giữ nguyên hành vi cũ; repo CÓ khai
     * mà file không có thì ĐỎ, và nói thẳng đó là khai sai chứ không phải thiếu bản đồ. */
    if (!fs.existsSync(agentsPath)) {
      if (KHAI_BAN_DO) { khaiSaiBanDo.add(path.join(base, FILE_BAN_DO).replaceAll("\\", "/")); }
      continue;
    }
    const rest = pkgDir ? file.slice(pkgDir.length + 1) : file;
    if (!rest || rest === FILE_BAN_DO) continue;
    const map = mapSection(fs.readFileSync(agentsPath, "utf8"));
    if (map === null) { thieuBanDo.push(path.join(base, FILE_BAN_DO).replaceAll("\\", "/")); continue; }
    // KHAI MỘT THƯ MỤC LÀ ĐÃ KHAI NHỮNG GÌ TRONG NÓ.
    //
    // Bản đầu chỉ nhận đúng đường dẫn đầy đủ. Nghe thì chặt, nhưng dùng thật thì hỏng: mỗi hồ sơ
    // migrate mới, mỗi ADR mới, mỗi workflow mới lại đòi thêm một dòng bản đồ — vĩnh viễn. Bản
    // đồ phình theo số file thay vì theo số LOẠI việc, và tới lúc nào đó người ta bỏ khai.
    // Một luật không ai theo nổi thì không phải luật chặt, nó chỉ là luật chết.
    //
    // Đây là một chỗ NỚI CÓ CHỦ Ý và có biên: chỉ nhận khi bản đồ khai đúng thư mục cha (kèm
    // dấu `/`), tức vẫn là một hành vi khai báo tường minh của người viết luật. Không nhận
    // khai kiểu chung chung, và không nhận thư mục chưa từng được nhắc.
    const daKhai = mentionsExactPath(map, rest) || (() => {
      const doan = rest.split("/");
      for (let i = doan.length - 1; i > 0; i -= 1) {
        if (mentionsExactPath(map, doan.slice(0, i).join("/") + "/")) return true;
      }
      return false;
    })();
    if (!daKhai) undeclared.push(file);
  }
  // Không tìm thấy bản đồ là một lỗi RIÊNG, có cách sửa RIÊNG. Gộp nó vào "chưa khai" là bảo
  // người ta đi khai từng file vào một mục không tồn tại.
  /* Khai sai là lỗi RIÊNG, nặng hơn "thiếu bản đồ": thiếu thì người ta quên, khai sai thì cổng
     đã bị vô hiệu hoá mà bảng vẫn xanh. Báo nó TRƯỚC mọi thứ khác. */
  if (khaiSaiBanDo.size) {
    return { ok: false, msg: `\`docs.file_map\` trong .repo-structure.json trỏ tới file KHÔNG TỒN TẠI: ${[...khaiSaiBanDo].join(", ")}. Cổng này khi đó không kiểm được gì — sửa đường dẫn, hoặc bỏ hẳn khối \`docs.file_map\` để dùng mặc định AGENTS.md.` };
  }
  const thieu = [...new Set(thieuBanDo)];
  if (thieu.length) {
    return { ok: false, msg: `KHÔNG TÌM THẤY Bản đồ file trong: ${thieu.join(", ")}. Cổng không biết đối chiếu vào đâu. Sửa: đặt hai dòng \`<!-- BAN-DO:BEGIN -->\` và \`<!-- BAN-DO:END -->\` quanh bảng bản đồ, HOẶC đặt tiêu đề chứa chữ "Bản đồ file".` };
  }
  const unique = [...new Set(undeclared)];
  if (unique.length) return { ok: false, msg: `Chưa khai vào Bản đồ file của package: ${unique.join(", ")}. Không khai = không tồn tại (luật gốc).` };
  return { ok: true, msg: "Mọi thứ mới đều đã khai." };
});

/* ---- 5. HANDOFF phải được ghi ------------------------------------------- */
/* VÙNG GỐC REPO CŨNG PHẢI GHI LOG — trước đây chỉ package mới phải.
 *
 * Bản cũ duyệt đúng `myPackages`. Repo nào KHÔNG có package con — như chính repo bộ khung này —
 * thì phép kiểm luôn trả "Không có gì phải ghi", kể cả khi phiên vừa viết lại nửa bộ máy. Tức
 * luật "phiên sau phải biết phiên trước làm gì" chưa từng được cưỡng chế ở đúng nơi việc nặng
 * nhất diễn ra. Audit độc lập bắt được 03/09.
 *
 * Và "đã chạm file" chưa đủ: sửa một khoảng trắng trong dòng Log CŨ cũng tính là đã ghi. Log là
 * thứ CHỈ ĐƯỢC THÊM, nên bằng chứng đúng phải là CÓ DÒNG MỚI. Đo bằng `--numstat`; đo không
 * được thì hạ về phép cũ và nói rõ là chỉ đo được tới đó — chứ không im lặng coi như đạt. */
const laHandoff = (f) => /(^|\/)HANDOFF\.md$/i.test(f);

/* Đếm dòng thêm / dòng xoá của một file, so cây làm việc với MỐC.
   Trả `{ them, xoa }`, hoặc `null` khi KHÔNG ĐO ĐƯỢC — null không phải "không có gì". */
const doThemXoa = (rel) => {
  // Cộng cả phần đã commit chưa push lẫn phần còn trong cây làm việc. Thiếu vế nào cũng sai:
  // ghi Log rồi commit thì cây làm việc sạch; ghi mà chưa commit thì diff với remote lại rỗng.
  let them = 0;
  let xoa = 0;
  let doDuoc = false;
  for (const args of [
    originMainResolves ? ["diff", "--numstat", MOC, "--", rel] : null,
    ["diff", "--numstat", "HEAD", "--", rel]
  ]) {
    if (!args) continue;
    const ra = git(...args);
    if (!ra) continue;
    for (const dong of ra.split("\n").filter(Boolean)) {
      const [a, b] = dong.split(String.fromCharCode(9));
      if (Number.isFinite(Number(a))) { them += Number(a); xoa += Number(b) || 0; doDuoc = true; }
    }
  }
  return doDuoc ? { them, xoa } : null;
};

/* THƯ MỤC LƯU TRỮ. Cùng quy ước với `can-nang.mjs`: một đoạn đường dẫn tên `archive`.
   Không đóng cứng `docs/archive` — repo khác có thể để chỗ khác, miễn tên đoạn đúng. */
const LA_LUU_TRU = /(^|\/)archive\//;

/* Mọi dòng đang nằm trong kho lưu trữ, đọc từ CÂY LÀM VIỆC.
   Đọc lười (chỉ dựng khi thật sự có dòng bị xoá) vì nó quét file. */
let _kholuu = null;
const khoLuuTru = () => {
  if (_kholuu) return _kholuu;
  _kholuu = new Set();
  const ra = git("ls-files");
  if (!ra) return _kholuu;
  for (const f of ra.split("\n").filter((x) => LA_LUU_TRU.test(x))) {
    try {
      for (const d of fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\r\n?/g, "\n").split("\n")) {
        _kholuu.add(d);
      }
    } catch { /* file vừa bị xoá khỏi cây: bỏ qua, vế dưới sẽ báo thiếu */ }
  }
  return _kholuu;
};

/* Dòng nào bị xoá khỏi `rel` mà KHÔNG tìm thấy nguyên văn trong kho lưu trữ.
   Trả mảng (rỗng = mọi dòng xoá đều đã được dời chỗ), hoặc `null` khi không đo được.

   VÌ SAO CÓ HÀM NÀY — Đức chốt 2026-09-06 (KHUNG-25). Hai luật của repo cắn nhau: sổ tay bảo
   trì bắt DỜI nhật ký cũ đi khi quá ngân sách, còn phép kiểm này cấm `HANDOFF.md` xoá bất kỳ
   dòng nào. Làm đúng luật thứ nhất thì VĨNH VIỄN không đóng được phiên — đã thử thật.

   Bản vá SIẾT chứ không nới: cổng thôi GIẢ ĐỊNH "không dời được", và bắt đầu KIỂM CHỨNG luật
   *dời chỗ chứ không xoá*. Xoá mà không có bản sao khớp BYTE trong kho lưu trữ thì vẫn đỏ —
   nên nó không hề mở đường cho việc viết lại lịch sử, chỉ mở đường cho việc cất gọn nó. */
const dongXoaChuaLuuTru = (rel) => {
  const args = originMainResolves ? ["diff", "-U0", MOC, "--", rel] : ["diff", "-U0", "HEAD", "--", rel];
  const ra = git(...args);
  if (ra === null || ra === undefined) return null;
  const kho = khoLuuTru();

  /* DÒNG DỊCH CHỖ TRONG CÙNG FILE KHÔNG PHẢI DÒNG BỊ XOÁ — và `git diff` không phân biệt
     được hai thứ đó: nó in ra một cặp `-` / `+`. Đo thật 06/09, lượt dọn đầu tiên: dòng trỏ
     sang kho lưu trữ của lượt trước bị đẩy từ giữa file lên đầu file, và cổng báo ĐỎ oan với
     đúng dòng đó. Một cổng bắt oan cũng nguy hiểm như một cổng bỏ sót: người ta học cách
     bỏ qua nó. Nên trước khi kết luận "mất chữ", hỏi thêm: dòng đó có còn trong chính file
     không? Còn thì không mất gì cả. */
  let conTrongFile = new Set();
  try {
    conTrongFile = new Set(fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n?/g, "\n").split("\n"));
  } catch { /* file vừa bị xoá hẳn: để vế dưới báo mất */ }

  const thieu = [];
  for (const dong of ra.replace(/\r\n?/g, "\n").split("\n")) {
    if (!dong.startsWith("-") || dong.startsWith("---")) continue;
    const noiDung = dong.slice(1);
    if (!kho.has(noiDung) && !conTrongFile.has(noiDung)) thieu.push(noiDung);
  }
  return thieu;
};

/* `true` = đã ghi Log đúng luật · `false` = chưa · `null` = không đo được.
   Chuỗi trả về = lý do cụ thể khi `false`, để lời nhắn dẫn đúng chỗ chứ không nói chung chung. */
const coDongMoi = (rel) => {
  const so = doThemXoa(rel);
  if (!so) return null;   // null = khong do duoc, khong phai "khong co"
  // THEM DONG, chu khong phai "co dung vao". Sua mot chu trong dong Log CU cho ra `1 them /
  // 1 xoa` — van la `them > 0`, nen ban dau cham dat.
  if (so.them === 0) return { ok: false, vi: "KHÔNG thêm dòng nào — Log là thứ chỉ được THÊM" };
  if (so.xoa === 0) return { ok: true };
  const thieu = dongXoaChuaLuuTru(rel);
  if (thieu === null) return null;
  if (thieu.length === 0) return { ok: true, doiCho: so.xoa };
  const mau = thieu.find((d) => d.trim()) ?? thieu[0];
  return {
    ok: false,
    vi: `xoá ${so.xoa} dòng mà ${thieu.length} dòng KHÔNG có bản khớp byte trong kho lưu trữ (\`*/archive/*\`)`
      + `, ví dụ: "${mau.slice(0, 60)}". Dời chỗ thì được, xoá thì không`
  };
};

const doGhiLog = () => {
  const thieu = [];
  const chiSuaChoCu = [];
  let daDoiCho = 0;

  const soi = (file, nhan) => {
    const kq = coDongMoi(file);
    if (!kq) return;                       // null = khong do duoc, de mac
    if (kq.ok) { daDoiCho += kq.doiCho || 0; return; }
    chiSuaChoCu.push(`${nhan}: ${kq.vi}`);
  };

  for (const pkg of myPackages) {
    const codeChanged = touched.some((f) => f.startsWith(pkg + "/") && !laHandoff(f));
    if (!codeChanged) continue;
    const file = pkg + "/HANDOFF.md";
    if (!touched.some((f) => f.startsWith(pkg + "/") && laHandoff(f))) { thieu.push(file); continue; }
    soi(file, file);
  }

  // Vùng gốc: một file bất kỳ ngoài package, thuộc vùng mình đang giữ.
  const chamGoc = touched.some((f) => !laHandoff(f) && !myPackages.some((p) => f.startsWith(p + "/")));
  if (myRootAreas.length > 0 && chamGoc) {
    if (!touched.some((f) => f === "HANDOFF.md")) thieu.push("HANDOFF.md (gốc repo)");
    else soi("HANDOFF.md", "HANDOFF.md (gốc repo)");
  }

  if (thieu.length) {
    return { ok: false, msg: "Đã sửa nhưng chưa ghi Log vào: " + thieu.join(", ") + ". Phiên sau sẽ mù." };
  }
  if (chiSuaChoCu.length) {
    return { ok: false, msg: chiSuaChoCu.join(" · ") + ". Sửa dòng cũ không phải là ghi Log." };
  }
  const coViec = myPackages.length > 0 || (myRootAreas.length > 0 && chamGoc);
  if (daDoiCho) {
    return { ok: true, msg: `Đã ghi Log, và ${daDoiCho} dòng cũ được DỜI sang kho lưu trữ (đã đối chiếu khớp byte, không dòng nào mất).` };
  }
  return { ok: true, msg: coViec ? "Đã ghi Log." : "Không có gì phải ghi." };
};

/* ---- 5b. Sổ quyết định: dời chỗ thì được, XOÁ thì không ------------------
 *
 * LUẬT NÀY ĐÃ CÓ CHỮ TỪ LÂU MÀ CHƯA CÓ RĂNG. `AGENTS.md` mục 6 khai `decisions.md` là sổ
 * **"chỉ thêm"**, nhưng đo 09/09: cơ chế *dời-chỗ-chứ-không-xoá* (`dongXoaChuaLuuTru`) chỉ được
 * gọi cho **HANDOFF.md**. Xoá sạch một quyết định cũ khỏi `decisions.md` thì KHÔNG gì kêu.
 *
 * Vì sao đáng lắp răng chứ không đáng bỏ luật: sổ quyết định là chỗ trả lời *"Đức đã chốt gì"*.
 * Một quyết định biến mất không dấu vết thì lượt sau không có cách nào biết luật hiện hành đến
 * từ đâu — và chính lượt 09/09 này là lượt ĐẦU TIÊN có người (tôi) dời quyết định đi thật.
 *
 * KHÔNG PHẢI LUẬT MỚI, và không phải cấm dọn: dùng lại nguyên cỗ máy của `HANDOFF.md`, nên
 * **dời sang thư mục lưu trữ vẫn XANH**, chỉ xoá-mất-hẳn mới ĐỎ. `EXPECTED_CHECKS` 15 -> 16,
 * khai tường minh ngay dưới đây theo đúng luật của chính cổng.
 *
 * (Đừng viết mẫu đường dẫn kho lưu trữ vào khối chú thích này: dấu sao-gạch trong đó ĐÓNG luôn
 *  khối chú thích, và cả file chết ngay lúc nạp. Đã vấp thật ở lượt viết phép kiểm này.) */
const doSoQuyetDinh = () => {
  const SO = "decisions.md";
  if (!touched.includes(SO)) return { ok: true, msg: "Phiên này không đụng sổ quyết định." };
  const so = doThemXoa(SO);
  if (!so) return { ok: true, skipped: true, msg: `Không đọc được diff của ${SO} — nói KHÔNG BIẾT, không nói ĐẠT.` };
  if (so.xoa === 0) return { ok: true, msg: `Chỉ thêm ${so.them} dòng vào sổ quyết định.` };
  const thieu = dongXoaChuaLuuTru(SO);
  if (thieu === null) return { ok: true, skipped: true, msg: `Không đối chiếu được kho lưu trữ cho ${SO}.` };
  if (thieu.length === 0) {
    return { ok: true, msg: `${so.xoa} dòng được DỜI sang kho lưu trữ (khớp byte, không dòng nào mất).` };
  }
  const mau = (thieu.find((d) => d.trim()) ?? thieu[0]).slice(0, 60);
  return {
    ok: false,
    msg: `xoá ${so.xoa} dòng khỏi ${SO} mà ${thieu.length} dòng KHÔNG có bản khớp byte trong kho lưu trữ (\`*/archive/*\`)`
      + `, ví dụ: "${mau}". Quyết định cũ thì DỜI đi, đừng xoá — lượt sau còn tra được luật hiện hành đến từ đâu.`
  };
};

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
  /* KHÔNG CÓ SUITE NÀO CHẠY ≠ ĐÃ KIỂM XONG.
   *
   * Bản cũ trả XANH ở đây bất kể chuyện gì đã xảy ra trong phiên. Ca đo được ở repo NAV ngày
   * 03/09: **trả quyền xong là mục "Test xanh" tự chuyển từ ĐỎ sang XANH** — cùng một cây làm
   * việc, suite không đổi một chữ. Vì trả quyền làm `myRootAreas` rỗng, nhánh `skipped` phía
   * trên không vào, và rơi thẳng xuống dòng này.
   *
   * Phân biệt hai chuyện khác hẳn nhau, và bản cũ gộp chúng làm một:
   *   - phiên KHÔNG đổi gì  → đúng là không có gì phải kiểm. XANH thật.
   *   - phiên CÓ đổi mà không suite nào chạy → CHƯA KIỂM. Phải là `BỎ`, và mã thoát 2. */
  if (!suites.length && !rootSuite) {
    /* CHỈ SINH LẠI ARTIFACT THÌ KHÔNG CÓ GÌ ĐỂ CHẠY TEST — và đó là một câu trả lời, không phải
     * một dấu hỏi.
     *
     * Artifact máy sinh không đòi khoá nào (luật mục 1), nên chúng không vào `myRootAreas`,
     * nên `rootSuite` false, nên phiên **chỉ sinh lại artifact** rơi thẳng vào nhánh "chưa kiểm"
     * — và không có cách nào thoát: chạy `npm test` cũng không đổi được kết luận. Tức một loại
     * commit rất thường (`chore: sinh lai artifact`) **không bao giờ đóng phiên được**.
     *
     * KHÔNG phải nới lỏng: chúng do máy sinh thẳng từ HEAD, và đã có phép kiểm riêng canh chúng
     * ("Sự thật máy sinh còn tươi") — chạy suite cho chúng không chứng minh thêm điều gì. Cùng
     * một nguyên tắc đã dùng cho file nhị phân ở v1.2.13: gọi tên đúng thứ vốn không áp dụng,
     * thay vì dán nhãn "không biết" lên chỗ ta biết rõ. */
    /* ponytail: đột biến "coi MỌI phiên là chỉ-artifact" KHÔNG bắt được, và đó là câu trả lời
       đúng: nhánh ngay trên (`myRootAreas.length > 0 && !hasRootTestScript()`) đã chặn mọi ca
       đổi file thật trước khi tới đây, nên biến thể sai đó bị che. Giữ điều kiện chặt vì nó
       ĐÚNG, không vì có phép kiểm ghim nó. Bỏ nhánh trên thì phải viết phép kiểm cho dòng này. */
    /* AUDIT 10/09 (R1) — LỜI MIỄN TRỪ NÀY CHỈ ĐỨNG ĐƯỢC KHI CÓ AI CANH THAY.
     * Chú thích ngay trên tự nêu tiền đề của nó: *"đã có phép kiểm riêng canh chúng"*. R1 cho
     * repo khai `generators: []` — tức TẮT đúng phép kiểm đó. Lúc ấy `generated` một mình mở
     * một lỗ: commit bất cứ gì vào DASHBOARD.md rồi được miễn suite, mà không còn ai đối chiếu
     * nội dung. Tổ hợp `generated` KHÔNG RỖNG + `generators` RỖNG là hợp lệ về cú pháp, nên
     * lỗ này mở được bằng cấu hình, không cần sửa mã. Kiểm toán độc lập bắt được, không phải tôi.
     * Nên: không có bộ sinh nào canh thì KHÔNG miễn trừ — rơi về "chưa kiểm", đúng như trước R1.
     *
     * GIỚI HẠN, NÓI TRƯỚC KHI AI HỎI (kiểm toán vòng hai): điều kiện này chứng minh CÓ bộ sinh,
     * KHÔNG chứng minh bộ sinh đó canh ĐÚNG file đang được miễn. Repo khai thêm một file vào
     * `generated` mà không bộ sinh nào sinh ra nó thì file đó vẫn được miễn suite mà chẳng ai
     * đối chiếu. Phủ sóng từng-file đòi một bảng "bộ sinh nào đẻ ra file nào" mà repo chưa có —
     * dựng nó bây giờ là thêm máy giữa lúc đang đóng băng. Ghi nợ `KHUNG-64`, không giả vờ đủ. */
    /* HAI NGUỒN MIỄN TRỪ, VÀ CHÚNG KHÁC LÝ DO — 10/09, sau khi gộp chúng làm một và gãy.
     *
     * ⑴ ARTIFACT MÁY SINH được miễn vì CÓ bộ sinh nào đó đang bị đối chiếu với HEAD (mục "còn
     *   tươi"). Bỏ người canh đi — `generators: []` — là lời miễn mất chỗ dựa, nên nó chết theo.
     *   Đó là lỗ P1-2. NÓI ĐÚNG MỨC (kiểm toán vòng ba): điều kiện này bảo đảm CÓ ÍT NHẤT MỘT bộ
     *   sinh bị đối chiếu, KHÔNG bảo đảm file đang được miễn nằm trong số được đối chiếu. Lỗ đó
     *   còn mở và có tên: `KHUNG-64`.
     *
     * ⑵ FILE HÀNH CHÍNH (`.agents/claims.json`) được miễn vì lý do KHÁC HẲN: nó không phải
     *   file hành vi (`isBehaviourFile` false, ca thật 06/09), nó có DẤU NIÊM PHONG riêng canh,
     *   và mọi suite tự dựng bảng quyền trong fixture của nó — nên chạy suite cho nó không
     *   chứng minh thêm gì. Lời miễn này KHÔNG dựa vào `generators`.
     *
     * Bản vá lỗ P1-2 của tôi gộp hai thứ này làm một, nên nó gỡ luôn ⑵: một phiên chỉ NHẬN hay
     * TRẢ KHOÁ bị cổng báo "chưa kiểm". Mà mỗi lượt `--sua`/`--xong` đều ghi lại file đó, tức
     * gần như MỌI phiên. `tests/khoa-dau-vet.mjs` vế 7 bắt được — nhưng chỉ bắt được SAU khi R1
     * làm fixture xanh lên; trước đó fixture đỏ vì lý do khác nên hai lượt đều đỏ và vế đó xanh
     * mà chẳng đo gì. Một phép ghim chỉ đúng nhờ nền đang hỏng thì nó đang ghim số 0. */
    const dsMaySinh = new Set([
      ...(generatorsFrom(structure).length ? generatedFrom(structure) : []),
      ...FILE_HANH_CHINH
    ]);
    const chiLaArtifact = sessionChanges.length > 0 && sessionChanges.every((c) => dsMaySinh.has(c.file ?? c));
    if (chiLaArtifact) {
      return { ok: true, msg: "Phiên này chỉ đổi " + sessionChanges.length
        + " file máy sinh hoặc hành chính — suite không áp dụng. Bảng quyền thì dấu niêm phong canh."
        + " Artifact thì mục \"Sự thật máy sinh còn tươi\" canh BẢN RA CỦA TỪNG BỘ SINH ĐÃ KHAI: một"
        + " file khai trong `generated` mà không bộ sinh nào nhận là bản ra của mình thì KHÔNG ai"
        + " đối chiếu nó (nợ `KHUNG-64`)." };
    }
    const coThayDoi = sessionChanges.length > 0;
    if (!coThayDoi) return { ok: true, msg: "Phiên này không đổi file nào — không có gì phải kiểm." };
    return {
      ok: true,
      skipped: true,
      msg: `Phiên này đổi ${sessionChanges.length} file nhưng KHÔNG suite nào chạy. Đây là "chưa kiểm", không phải "đã đạt". Nhận vùng mình đang sửa (\`claim.mjs --take\`), và khai \`scripts.test\` trong package.json.`
    };
  }
  const lines = [];
  if (rootSuite) {
    /* DÙNG LẠI LƯỢT CHẠY VỪA XONG, THAY VÌ CHẠY LẠI Y HỆT.
     *
     * Đo 08/09: chuỗi suite bộ khung tốn **535s**, và cổng này gọi lại đúng chuỗi đó. Một vòng
     * làm việc bình thường — chạy suite rồi chạy cổng — tốn **hơn 17 phút**, mà nửa sau không
     * kiểm thêm được gì so với nửa đầu.
     *
     * KHÔNG PHẢI NỚI LỚP BẢO VỆ. Điều kiện để dùng lại chặt hơn vẻ ngoài của nó: dấu phải khớp
     * **HEAD** + **băm index và nội dung thay đổi** + **danh sách suite** + còn **trong
     * hạn**. Sửa một byte ở bất kỳ file nào, kể cả file chưa track, là băm đổi và cổng chạy lại
     * đủ bộ. Suite đỏ thì `chay-test.mjs` XOÁ dấu chứ không ghi dấu đỏ, nên không có đường nào
     * để một cây chưa xanh lại có dấu hợp lệ. Dấu không được commit, nên không mượn được của
     * máy khác.
     *
     * Nói cách khác: cổng vẫn đòi ĐÚNG bằng chứng cũ — "cây làm việc này đã chạy suite và xanh"
     * — nó chỉ thôi đòi làm lại một việc vừa làm xong. */
    const xet = xetDau(docDau(ROOT), dauCay(ROOT), bamLenh(danhSachSuite(ROOT)));
    if (xet.dung) {
      lines.push(`suite gốc repo: DÙNG LẠI DẤU — ${xet.vi_sao}`);
    } else try {
      const out = runRootSuite();
      const NEWLINE = String.fromCharCode(10);
      const totals = out.split(NEWLINE).filter((line) => /[0-9]+ passed, [0-9]+ failed/.test(line));
      lines.push(`suite gốc repo: ${totals.length ? totals.join(" · ") : "chạy xong"}`);
    } catch (error) {
      /* NÊU ĐÚNG TÊN SUITE ĐỎ — `KHUNG-52`, và cái giá của bản cũ đã đo được.
       *
       * Bản trước lấy `.slice(-3)` của stdout làm phần giải thích. Ba dòng cuối của bộ chạy là
       * **bảng xếp hạng THỜI GIAN** (top-5 chậm nhất), không phải danh sách đỏ. Nên cổng in ra ba
       * cái tên có thật, có số giây thật — và **không cái nào là suite đỏ**. Kiểu hỏng tệ nhất
       * của một cổng: nó không im lặng, nó nói sai một cách tự tin, nên người đọc tin và đi sai
       * hướng. Đo 08/09: **bốn lượt** đuổi theo ba cái tên sai (chạy riêng từng suite · dựng repo
       * mới · dựng worktree ở bản trước · rồi mới phải chép suite ra bản gỡ lỗi) trước khi thấy
       * suite đỏ thật, cái chưa lần nào xuất hiện trên màn hình.
       *
       * Bộ chạy in mỗi suite đỏ thành một dòng `── node <suite> (mã N) ──`. Bắt theo mẫu đó, và
       * chỉ lùi về đuôi khi KHÔNG bắt được cái nào — không đo được thì nói không đo được, đừng
       * đưa ra một câu trả lời trông giống thật. */
      /* ĐỌC CẢ HAI LUỒNG. Bộ chạy in bảng thời gian ra `stdout` nhưng khối "SUITE ĐỎ" kèm tên
         từng suite ra `stderr` — đọc mỗi `stdout` là bỏ đúng thứ cần. Bắt được vì nhánh thành
         thật ở dưới nói "không đọc được TÊN" thay vì nói bừa; nếu nó lùi về đuôi trong im lặng
         thì lỗi này sống tiếp một vòng nữa. */
      const raw = `${String(error.stdout || "")}${String(error.stderr || "")}` || String(error.message);
      const NL2 = String.fromCharCode(10);
      const ten = [...raw.matchAll(/──\s*(.+?)\s*\(mã\s*\d+\)\s*──/g)].map((m) => m[1].trim());
      /* SUITE XANH MÀ BỘ CHẠY THOÁT MÃ ≠ 0 — KHÔNG được gọi là "suite đỏ". `KHUNG-15`.
       *
       * Đo 09→10/09: 22/22 suite xanh, `chay-test.mjs` trả mã 2 vì chưa ghi được dấu, và cổng in
       * *"suite gốc repo ĐỎ → không đọc được TÊN suite đỏ"*. Không đọc được tên vì **không có
       * suite nào đỏ**. Đó là kiểu hỏng tệ nhất của một cổng: nó không im lặng, nó nói sai một
       * cách tự tin — và người đọc đi tìm một suite không tồn tại.
       *
       * KHÔNG PHẢI NỚI, vì nó KHÔNG thành XANH: trả `skipped` → cổng thoát mã 2 → *"CHƯA ĐỦ BẰNG
       * CHỨNG"*, vẫn không được báo xong. Chỉ đổi LỜI: từ một lời buộc tội sai sang đúng lý do.
       *
       * FAIL-CLOSED hai lớp: chỉ hạ xuống `skipped` khi (a) KHÔNG bắt được tên suite đỏ nào, VÀ
       * (b) có dòng tổng xanh tường minh do bộ chạy in ra. Thiếu một trong hai thì giữ ĐỎ như cũ
       * — không đo được thì nói không đo được, đừng đoán về phía nhẹ hơn. */
      /* ĐÒI DẤU HIỆU CỦA CHÍNH BỘ CHẠY, KHÔNG PHẢI MỘT DÒNG TỔNG BẤT KỲ — audit độc lập bắt
       * được, 10/09, và đây là lỗi FAIL-OPEN nên nó nặng.
       *
       * Bản 1.8.2 khớp `/(\d+) passed, 0 failed, \d+ total/`. Ở repo NHÀ thì vô hại: bộ chạy chỉ
       * in dòng tổng khi cả chuỗi xanh, và mọi lượt đỏ đều in `── <suite> (mã N) ──`. Nhưng cổng
       * này ĐƯỢC PHÁT ĐI, và ở repo tiêu thụ `scripts.test` là **runner khác** — jest, vitest,
       * script riêng. Đo được ca hỏng: một runner in `12 passed, 0 failed, 12 total` cho dự án
       * thứ nhất rồi `FAIL` dự án thứ hai và thoát 1 → không có tiêu đề `──` nào → bản 1.8.2
       * HẠ một suite ĐỎ THẬT xuống BỎ.
       *
       * Nên hai vế, và cả hai là bằng chứng DƯƠNG của bộ chạy này: hậu tố `— SUITE XANH` (chỉ
       * `chay-test.mjs` in, và chỉ khi CẢ chuỗi xanh) và KHÔNG có chuỗi `SUITE ĐỎ`. Runner lạ
       * không in hậu tố đó, nên nó rơi về ĐỎ — đúng chiều fail-closed. */
      const xanh = raw.match(/(\d+) passed, 0 failed, \d+ total — SUITE XANH/);
      const coSuiteDo = raw.includes("SUITE ĐỎ");
      if (!ten.length && xanh && !coSuiteDo) {
        const viSao = (raw.match(/^[A-Z_]{4,}:.*$/m) || ["bộ chạy không nêu lý do"])[0].trim();
        return {
          ok: true,
          skipped: true,
          msg: `suite gốc repo XANH (${xanh[1]}/${xanh[1]}, 0 đỏ) nhưng bộ chạy thoát mã ≠ 0 nên KHÔNG có dấu xác nhận → ${viSao}`
            + NL2 + "Đây KHÔNG phải suite đỏ. Chạy lại trên cây ổn định — hoặc xem lane nào đang ghi cùng lúc.",
        };
      }
      const moTa = ten.length
        ? `${ten.length} suite ĐỎ: ${ten.join(" · ")}`
        : `không đọc được TÊN suite đỏ từ bản ghi — đuôi: ${raw.trim().split(NL2).slice(-3).join(" | ")}`;
      return { ok: false, msg: `suite gốc repo ĐỎ → ${moTa}` };
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
  /* AUDIT 10/09 (R1) — RỖNG THÌ NÓI RÕ LÀ KHÔNG ÁP DỤNG.
   * Trước bản này, `scripts = []` đi hết vòng lặp mà không kiểm gì rồi trả câu "Artifact do
   * sinh ra đã commit đều khớp với HEAD" — một câu XANH nói rằng đã kiểm, trong khi chưa kiểm
   * gì cả. Đó là kiểu dối tệ nhất của một cổng: nó không sai, nó chỉ khiến người đọc tin sai.
   * Và đây là MẤT BẢO VỆ THẬT, không phải "không áp dụng cho vui": ba artifact (DASHBOARD.md,
   * llms.txt, repo-map.json) vẫn nằm trong git mà nay không còn ai đối chiếu với HEAD. Đánh đổi
   * có chủ ý — đổi lấy việc bỏ vòng lặp 37% commit — nên phải NÓI RA ở đúng chỗ người ta đọc. */
  if (!scripts.length) {
    return { ok: true, msg: "KHÔNG ÁP DỤNG: repo khai `generators: []`, nên KHÔNG có gì được đối chiếu với HEAD. Artifact đã commit (nếu có) hiện KHÔNG ai canh — đó là đánh đổi cố ý của R1, không phải đã kiểm và thấy sạch." };
  }
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
/* TÊN MỤC KHÔNG GÕ SỐ. Bản cũ ghi "B1–B14" trong khi bộ kiểm đã có 15 rồi 16 phép — người đọc
   cổng tin con số đó và nghĩ hai phép kiểm cuối không tồn tại. Cùng bệnh với "6 trên 11" ở bảng
   tra: một con số gõ tay mô tả tập hợp thì chỉ đúng tới lần sửa kế tiếp. */
check("Cổng kiểm cấu trúc (dãy B)", () => {
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
  // MÃ THOÁT 0 KHÔNG PHẢI BẰNG CHỨNG. Đây là lỗ nặng nhất còn lại, và nó đã được dựng lại thật:
  // thay `check-bootstrap.mjs` bằng đúng một dòng `process.exit(0);` thì cổng đóng phiên in ra
  //     [XANH] Cổng kiểm cấu trúc — không đọc được dòng tổng kết — nhóm CHẶN đạt hết
  // Tức là toàn bộ bộ kiểm cấu trúc bị vô hiệu hoá, và cổng vẫn tuyên bố nhóm CHẶN đã đạt.
  //
  // Một bộ kiểm không nói được nó đã kiểm gì thì phải bị coi là CHƯA KIỂM, không phải ĐÃ ĐẠT.
  // Dòng `TỔNG:` là bằng chứng tối thiểu: nó chỉ tồn tại khi bộ kiểm thật sự chạy hết.
  const bangChung = tomTat(stdout);
  if (!/^TỔNG|·\s*TỔNG/.test(bangChung) && !bangChung.includes("TỔNG")) {
    return {
      ok: false,
      msg: `BOOTSTRAP_KHONG_CO_BANG_CHUNG: scripts/check-bootstrap.mjs thoát 0 nhưng KHÔNG in dòng tổng kết nào. Mã thoát 0 không phải bằng chứng — coi như CHƯA KIỂM. Kiểm xem file đó có bị thay/cắt cụt không. ${XEM}`
    };
  }
  return { ok: true, msg: `${bangChung} — nhóm CHẶN đạt hết. ${XEM}` };
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
    return { ok: true, skipped: true, msg: `Không so được với ${MOC} nên không đếm được commit nào chưa push — xem cảnh báo ở đầu báo cáo.` };
  }
  const shas = git("log", "--format=%H", `${MOC}..HEAD`).split("\n").filter(Boolean);
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

/* TRẦN MỘT MỤC NHẬT KÝ, VÀ XOAY FILE THEO THÁNG.
 *
 * Cơ chế mang từ repo tiêu thụ lên đây 2026-09-08 (ADR-0011) để phát cho mọi repo. Nó chặn
 * **đúng mục vừa thêm trong phiên này** — mục cũ KHÔNG bị chặn, vì chặn cả file là mọi lane đỏ
 * ngay vì chữ của người khác, và một cổng như thế bị tháo trong một ngày.
 *
 * Repo chưa khai `handoff.tran_byte_moi_muc` thì phép kiểm **BỎ** (không xanh, không đỏ): nó
 * chưa kiểm được gì, và nói "xanh" ở đó là nói dối. Khác hẳn trần sổ nợ ngay dưới — ở đó không
 * khai là một lựa chọn hợp lệ, còn ở đây file nhật ký vẫn đang bị chạm mà ta không đo nổi. */
const doTranHandoff = () => {
  const files = touched.filter((f) => /(^|\/)HANDOFF\.md$/.test(f));
  if (!files.length) return { ok: true, msg: "Phiên này không chạm HANDOFF.md nào." };
  const tran = handoffCapFrom(structure);
  if (tran === null) return { ok: true, skipped: true, msg: "Chưa khai `handoff.tran_byte_moi_muc` trong .repo-structure.json — CHƯA KIỂM ĐƯỢC GÌ." };

  const docFile = (f) => { try { return fs.readFileSync(path.join(ROOT, f), "utf8"); } catch { return null; } };
  const beo = [];
  const canXoay = [];
  const chuaKhai = [];
  let neo = 0;        // số mục bổ được — ra 0 là BỘ ĐO HỎNG, xem dưới
  let nhatKy = 0;     // số quyển nhật ký THẬT đã soi
  for (const f of files) {
    const hienTai = docFile(f);
    if (hienTai === null) continue;   // file vừa bị xoá khỏi cây làm việc
    // Hỏi NỘI DUNG, không hỏi TÊN FILE: một sổ tay luật cũng có thể tên `…HANDOFF.md`.
    if (!laNhatKy(hienTai)) continue;
    nhatKy += 1;
    /* BẢN GỐC ĐỌC HỎNG THÌ MỌI MỤC THÀNH "MỤC MỚI" — tức chặn lane này bằng chữ của lane khác.
     * Nên hỏi trước: file có trên mốc so không? Không có (quyển vừa lập) thì bản gốc rỗng là
     * ĐÚNG. Có mà đọc hỏng thì dùng `git` (bản ghi lỗi) để phép kiểm cuối biến nó thành ĐỎ. */
    const coTrenMoc = originMainResolves
      && gitLoiLaBinhThuong("ls-tree", "--name-only", MOC, "--", f).trim() !== "";
    const goc = coTrenMoc ? git("show", `${MOC}:${f}`) : "";
    neo += docMucTuFile(hienTai).length;
    for (const m of vuotTran(mucMoi(hienTai, goc), tran)) {
      beo.push(`${f} · "${m.tieuDe.replace(/^#+\s*/, "").slice(0, 48)}…" = ${m.byte} byte`);
    }
    if (!mine(f)) continue;           // xoay là việc của người đang giữ khoá
    /* QUYỂN TRẮNG KHÔNG PHẢI QUYỂN CHƯA KHAI THÁNG. Mốc tháng tồn tại để biết phần nào đem đi
     * lưu trữ; không mục nào thì không có gì để lưu, và đòi khai là bắt một repo vừa dựng chạy
     * một lượt xoay trên một file rỗng. Đo thật 08/09: repo sinh từ bản trích ĐỎ ngay lượt chạy
     * cổng đầu tiên, vì lý do nó không có cách nào biết trước. */
    if (docMucTuFile(hienTai).length === 0) continue;
    const thang = thangCua(hienTai);
    if (thang === null) chuaKhai.push(f);
    else if (thang !== thangHienTai()) canXoay.push(`${f} (đang khai ${thang})`);
  }

  /* ĐẾM MỎ NEO. `mucMoi` trả rỗng đọc y hệt "mọi mục đều vừa trần", nên bổ ra 0 mục phải kêu.
   * NHƯNG so với 0 là sai: một quyển nhật ký TRẮNG (repo vừa dựng từ bản khung) cũng cho 0, và
   * ở đó 0 là câu trả lời đúng. So với phép đếm THÔ mới tách được hai chuyện: 0 trên một file
   * không có tiêu đề nào là bình thường, 0 trên một file có 37 tiêu đề mới là bộ đo hỏng. */
  const demTho = (text) => {
    const dong = String(text).split(/\r?\n/);
    const i = dong.findIndex((d) => /^##[ \t]+Log[ \t]*$/.test(d));
    return i < 0 ? 0 : dong.slice(i + 1).filter((d) => /^##[ \t]/.test(d)).length;
  };
  const thoTong = files.reduce((s, f) => { const t = docFile(f); return t === null ? s : s + demTho(t); }, 0);
  if (nhatKy > 0 && neo === 0 && thoTong > 0) {
    return { ok: false, msg: "HANDOFF_KHONG_KHOP: chạm HANDOFF.md nhưng không bổ được MỤC nào."
      + " Đây là bộ đo HỎNG, không phải 'không có gì phải sửa' — kiểm dòng `## Log` của file." };
  }

  const loi = [];
  if (beo.length) {
    loi.push(`HANDOFF_MUC_QUA_DAI: ${beo.length} mục MỚI vượt trần ${tran} byte — ${beo.join(" · ")}. ${CAU_CHI_DUONG}`);
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
  return { ok: true, msg: `${nhatKy} quyển nhật ký, ${neo} mục, mọi mục mới đều dưới trần ${tran} byte và đúng tháng.` };
};

/* KHO CHỮ KHÔNG ĐƯỢC PHÌNH — THƯỚC CÓC, không phải trần lý tưởng.
 *
 * Đo 08/09: `docs/` tăng **5.915 → 6.654 dòng trong một ngày**, và phần tăng phần lớn là chữ do
 * chính AI viết ra. Trong khi luật chốt 07/09 nói *"xoá là thắng, thêm là thua"*. Không con số
 * nào canh chỗ này, nên nó phình mà không ai thấy cho tới lúc đo thủ công.
 *
 * VÌ SAO LÀ THƯỚC CÓC, KHÔNG PHẢI TRẦN THẬT: đặt trần ở con số mong muốn là **đỏ ngay lập tức
 * với mọi lane**, kể cả lane không viết một dòng docs nào — và một cổng đỏ vì việc của người
 * khác thì bị tháo trong một ngày. Thước cóc đặt ở **đúng con số hôm nay**: nó không đòi ai dọn,
 * nó chỉ chặn PHÌNH. Mỗi lượt xoá thì hạ con số xuống, và chỗ đã hạ không quay lại được.
 *
 * VÌ SAO TRỪ `docs/adr/`: ADR đã `Accepted` là **bất biến** (ADR-0000), tức thư mục đó chỉ có
 * thể to lên. Tính nó vào thước cóc thì **mỗi quyết định mới làm cổng đỏ**, người ta sẽ nới con
 * số cho xong việc, và sau vài lượt nới thì thước không còn nghĩa gì.
 *
 * VÌ SAO TRỪ `docs/archive/` — vá 08/09, Đức chốt, và nó là chữa MÂU THUẪN chứ không phải nới:
 * `AGENTS.md` viết rõ *"Thư mục này KHÔNG tính vào ngân sách tài liệu: ngân sách đo thứ MỌI phiên
 * phải nạp, mà lưu trữ theo định nghĩa là thứ không nạp mỗi lần"*, và `can-nang.mjs` đã miễn nó
 * từ 06/09 vì đúng lý do đó. Chỉ CỔNG NÀY là còn đếm. Một luật hai chỗ, và chúng đã lệch thật:
 * hôm nay một lane chạy đúng nhịp DỌN mà repo bắt làm — dời 1.135 dòng sang `docs/archive/` — và
 * cổng ĐỎ vì chính việc dọn đó. Cùng họ `KHUNG-25`: sổ tay bảo DỌN, cổng CẤM.
 *
 * Và nó KHÔNG làm yếu lớp bảo vệ: bỏ lưu trữ ra thì con số thật là **4.001**, tức thước mới
 * CHẶT HƠN 5.744 cũ. Tên khoá giữ nguyên `tran_dong_khong_ke_adr` — đổi tên là repo đã lắp mất
 * thước trong im lặng, tệ hơn một cái tên kể thiếu. Câu in ra thì nói đủ cả hai chỗ trừ. */
const doKhoChu = () => {
  const tran = structure?.docs?.tran_dong_khong_ke_adr;
  if (typeof tran !== "number") {
    return { ok: true, msg: "Repo chưa khai `docs.tran_dong_khong_ke_adr` — không có thước thì không đo." };
  }
  const ds = git("ls-files", "docs").split(String.fromCharCode(10))
    .map((d) => d.trim())
    .filter((d) => d && !THU_MUC_DOCS_KHONG_TINH.some((t) => d.startsWith(`docs/${t}/`)));
  if (!ds.length) return { ok: true, msg: `Không có file \`docs/\` nào ngoài ${THU_MUC_DOCS_KHONG_TINH.join(", ")}.` };
  let dong = 0;
  for (const f of ds) {
    try { dong += fs.readFileSync(path.join(ROOT, f), "utf8").split(String.fromCharCode(10)).length - 1; }
    catch { /* file vừa bị xoá khỏi cây làm việc — không tính, lượt sau `git ls-files` cũng bỏ nó */ }
  }
  if (dong <= tran) {
    const du = tran - dong;
    return {
      ok: true,
      msg: `${dong}/${tran} dòng (${ds.length} file, không kể ${THU_MUC_DOCS_KHONG_TINH.join("/, ")}/).`
        + (du >= 50 ? ` Đã dưới thước ${du} dòng — HẠ \`docs.tran_dong_khong_ke_adr\` xuống ${dong} để giữ phần đã dọn.` : "")
    };
  }
  return {
    ok: false,
    msg: `KHO_CHU_PHINH: ${dong} dòng trong \`docs/\` (không kể ${THU_MUC_DOCS_KHONG_TINH.join("/, ")}/), thước cóc là ${tran} — thêm ${dong - tran}. `
      + "Đây KHÔNG phải trần lý tưởng, nó là con số của ngày hôm qua: phiên này đang làm kho chữ to ra. "
      + "Ba cửa ra: xoá/gộp cho về dưới thước · chuyển phần dài sang một ADR (ADR không tính vào thước) · "
      + "nếu phần thêm là cần thiết thật thì nâng `docs.tran_dong_khong_ke_adr` VÀ nói vì sao trong nhật ký phiên."
  };
};

/* TRẦN SỔ NỢ — một con số không có máy canh thì nó vỡ trong im lặng.
 *
 * Một repo tiêu thụ bộ khung đặt trần 15 mục và KHÔNG cưỡng chế. Kết quả đo 2026-09-07:
 * mục thứ 11 vào sổ mà không gì đỏ lên, và trần phải nâng lên 15 sau khi đã vỡ — tức con số
 * ấy chưa bao giờ là trần, nó là một lời khuyên. Đây là chỗ vá đúng: cổng đóng phiên là thứ
 * MỌI phiên đều chạy, còn `backlog-check` là thứ chỉ người nhớ ra mới chạy.
 *
 * Trần khai ở `backlog.tran` của `.repo-structure.json`, KHÔNG viết cứng ở đây — repo khác
 * nợ khác nhau. Repo không khai thì phép kiểm XANH và nói rõ là chưa có trần: một repo có
 * quyền không đặt trần, và chặn nó vì thiếu một khoá tuỳ chọn là cổng tự bịa ra luật.
 *
 * Bộ đọc sổ dùng lại `parseBacklog` của `what-next.mjs`. Cố ý không viết bộ đếm thứ hai:
 * quy ước đóng mục (gạch mã `~~KHUNG-1~~`) nằm trong đó, và hai bản sao của một quy ước đã
 * trả hai câu khác nhau cho cùng một file — đúng cái bẫy `KHUNG-46` ghi.
 *
 * CÁI GIÁ của lượt dùng lại đó, ghi ra để phiên sau không mất thì giờ: cổng nay PHỤ THUỘC
 * `what-next.mjs`. Mọi kho thử dựng sẵn (`tests/harness-smoke.mjs`, `tests/cong-do-that.mjs`)
 * chép một DANH SÁCH script cố định sang thư mục tạm — thiếu file này thì cổng ném lúc nạp
 * module, và test báo một câu trỏ sai chỗ ("không thấy phép kiểm HANDOFF"). Thêm kho thử mới
 * mà chép `session-check.mjs` thì chép cả `what-next.mjs`. */
const doSoNo = () => {
  const tran = structure?.backlog?.tran;
  if (typeof tran !== "number") {
    return { ok: true, msg: "Repo chưa khai `backlog.tran` trong .repo-structure.json — không có trần thì không có gì để canh." };
  }
  const so = path.join(ROOT, "BACKLOG.md");
  if (!fs.existsSync(so)) return { ok: true, msg: `Chưa có BACKLOG.md ở gốc repo (trần khai là ${tran}).` };
  const { mo } = parseBacklog(fs.readFileSync(so, "utf8"));
  if (mo.length <= tran) return { ok: true, msg: `${mo.length}/${tran} mục nợ đang mở.` };
  return {
    ok: false,
    msg: `SO_NO_VUOT_TRAN — ${mo.length} mục đang mở, trần là ${tran}. `
      + `ĐÓNG một mục (gạch mã: \`### ~~MÃ~~ · …\`) là cổng xanh lại; đừng nâng trần để đi tiếp. `
      + `Thấy trần thật sự quá chặt thì HỎI ĐỨC, và sửa \`backlog.tran\` trong .repo-structure.json, không sửa script.`
  };
};

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
check("Mọi lệnh git đọc được", () => {
  // Đặt CUỐI cùng, cố ý: tới đây mọi phép kiểm đã chạy xong nên `gitLoi` đã gom đủ.
  if (!gitLoi.length) return { ok: true, msg: "Không lệnh git nào hỏng." };
  return {
    ok: false,
    msg: `GIT_HONG — ${gitLoi.length} lệnh git thất bại, nên MỌI con số ở trên đều là đoán: ${[...new Set(gitLoi)].slice(0, 3).join(" · ")}. Kiểm xem đây có phải kho git không, và git có trong PATH không.`
  };
});

// 2026-09-08, phiên claude-cua-kiem: 13 → 14. Thêm "Kho chữ không phình" — thước cóc cho
// `docs/` (trừ ADR, vì ADR bất biến nên chỉ có thể to lên). Đo được: docs/ tăng 739 dòng trong
// một ngày mà không con số nào canh. Lý lẽ ở ADR-0011.
// 2026-09-08, phiên claude-cua-kiem: 12 → 13. Thêm "HANDOFF: mục mới trong trần, file đúng
// tháng" — cơ chế mang từ repo tiêu thụ lên nơi phát hành (ADR-0011) để mọi repo cùng có.
// 2026-09-08, phiên claude-cua-kiem: 11 → 12. Thêm "Sổ nợ dưới trần". Đức uỷ quyền chọn con số
// và cách cưỡng chế; lý do ở ADR-0010. Trần khai trong `.repo-structure.json`, repo không khai
// thì phép kiểm xanh — nên bản khung phát đi không tự đặt trần cho repo nào.
/* BỐN MỤC GỘP — mỗi mục một CÂU HỎI, không phải một phép đo. Xem ghi chú ở `ghepKiem`.
   Thứ tự trong mỗi mục là thứ tự đọc: cái chặn nặng nhất đứng trước. */
/* DẤU NIEM PHONG bảng quyền — kéo về từ repo tiêu thụ 09/09.
   Luật mục 1 viết "nhận và trả BẰNG LỆNH, không sửa tay" từ lâu, nhưng KHÔNG gì cưỡng chế nó.
   Bên kia đã trả giá thật: bốn khoá gốc bị đổi chủ bằng một lượt sửa hàng loạt đi vòng qua lệnh,
   và phiên đang giữ khoá không hề biết. Gộp vào mục QUYỀN chứ không thành mục thứ 26 — cùng chủ
   đề, và thêm một mục để cưỡng chế một luật chống-lách thì đúng cái luật mục 8 cấm. */
const doNiemPhong = () => {
  let st;
  try { st = fingerprintState(readClaims()); }
  catch (e) { return { ok: false, msg: `không đọc được bảng quyền: ${String(e.message).split(String.fromCharCode(10))[0]}` }; }
  if (st.ok === false) return { ok: false, msg: `DAU_VO: bảng quyền bị sửa NGOÀI lệnh (dấu ${st.stamped} ≠ nội dung ${st.actual}). Xem "git diff .agents/claims.json"; ĐỪNG đóng lại dấu cho xong.` };
  if (st.ok === null) return { ok: true, skipped: true, msg: "bảng chưa có dấu niêm phong — chạy \"claim.mjs --restamp --as <phiên>\" một lần" };
  return { ok: true, msg: "dấu niêm phong còn nguyên" };
};

/* CỬA INDEX đã bật chưa — KHUNG-59, 10/09.
   Cơ chế nằm ở `.githooks/commit-msg`, nhưng `core.hooksPath` là cấu hình MỖI BẢN SAO nên nó
   KHÔNG theo git. Không kiểm thì bản sao nào quên bật sẽ chạy cả phiên với cửa tắt, và triệu
   chứng y hệt lúc chưa có cửa: việc lane A vào commit dưới tên lane B, chỉ mắt người bắt được.
   Gộp vào mục QUYỀN, không thành mục thứ 26 — cùng câu hỏi *"ai đứng tên việc này"*. */
/* CỬA INDEX đã bật chưa — KHUNG-59, 10/09.
   Cơ chế nằm ở `.githooks/commit-msg`, nhưng `core.hooksPath` là cấu hình MỖI BẢN SAO nên nó
   KHÔNG theo git. Không kiểm thì bản sao nào quên bật sẽ chạy cả phiên với cửa tắt, và triệu
   chứng y hệt lúc chưa có cửa: việc lane A vào commit dưới tên lane B, chỉ mắt người bắt được.
   Gộp vào mục QUYỀN, không thành mục thứ 26 — cùng câu hỏi *"ai đứng tên việc này"*.
   Quyết định ở `xetCuaIndex` (hàm thuần, ghim ở `tests/cua-index.mjs`); đây chỉ đi lấy số. */
const doCuaIndex = () => xetCuaIndex({
  coTrenDia: fs.existsSync(path.join(ROOT, ".githooks", "commit-msg")),
  daTheoDoi: gitLoiLaBinhThuong("ls-files", "--error-unmatch", ".githooks/commit-msg").trim() !== "",
  hooksPath: gitLoiLaBinhThuong("config", "--get", "core.hooksPath"),
});

ghepKiem("Ai đứng tên việc này", ["khoá file", doKhoaFile], ["phạm vi", doPhamVi], ["niêm phong", doNiemPhong], ["cửa index", doCuaIndex]);
ghepKiem("Vùng CHỈ-THÊM không bị viết lại", ["bằng chứng", doBangChung], ["sổ quyết định", doSoQuyetDinh]);
ghepKiem("HANDOFF đã ghi Log, đúng trần, đúng tháng", ["ghi Log", doGhiLog], ["trần/tháng", doTranHandoff]);
/* PHẦN NẠP — CONTEXT COMPILER, gắn vào cổng ở ĐÂY chứ không thành một mục riêng.
 *
 * Đây là thứ Đức gọi là điểm quan trọng nhất: sổ cái được phép phình vô hạn, **thứ NẠP thì
 * không**. Một lệnh không ai chạy thì nó không canh gì — nên nó phải nằm trong cổng.
 *
 * Vì sao GỘP vào mục ngân sách thay vì thêm mục thứ 26: nó LÀ một thước ngân sách, và Đức vừa
 * chốt giảm số phép kiểm xuống 25. Thêm một mục để cưỡng chế luật chống-phình thì tự mâu thuẫn.
 *
 * Đo cái gì: `AGENTS.md` + phần cuối `HANDOFF.md` — thứ MỌI phiên ở MỌI repo phải nạp, nên mỗi
 * dòng ở đây nhân theo (số repo × số phiên). Kho `docs/` KHÔNG tính: nó mở khi cần. */
const doNap = () => {
  const tran = structure?.budget?.tokenNap;
  if (typeof tran !== "number") return { ok: true, msg: "repo chưa khai `budget.tokenNap` — không có thước thì không đo." };
  let kq;
  try { kq = napContext(ROOT, tran); } catch (e) { return { ok: true, skipped: true, msg: `không đo được phần nạp: ${String(e.message).split(String.fromCharCode(10))[0]}` }; }
  const tyLe = Math.round(kq.napToken * 100 / Math.max(1, kq.napToken + kq.khongNapToken));
  if (kq.dat) return { ok: true, msg: `~${kq.napToken}/${kq.tran} token nạp mỗi phiên · ${kq.khongNapToken} token để dành (${tyLe}% nạp).` };
  return {
    ok: false,
    /* NÊU ĐÚNG ĐƠN VỊ ĐÃ PHÁN XỬ. Bản cũ in `napDong` và nói "dòng" trong khi `dat` tính
       bằng `napToken` — nên 10/09 cổng in *"200/4200 dòng"* rồi bảo VƯỢT TRẦN, một câu vô
       nghĩa. Và nó chỉ hiện ở nhánh Đỏ, tức đúng lúc Đức cần đọc số. Ghim: `core-contract`. */
    msg: `PHAN_NAP_VUOT_TRAN: ~${kq.napToken}/${kq.tran} token nạp mỗi phiên. Đây là thứ MỌI phiên ở MỌI repo nạp, nên mỗi token ở đây nhân theo (số repo × số phiên). `
      + "Bớt ở `AGENTS.md` (luật mục 8: thêm một luật thì bớt một luật), đừng nới trần."
  };
};

ghepKiem("Ngân sách trong trần", ["kho chữ", doKhoChu], ["sổ nợ", doSoNo], ["phần nạp", doNap]);

const EXPECTED_CHECKS = 12;
if (results.length !== EXPECTED_CHECKS) {
  console.error(`\nCỔNG BỊ SỬA: đang có ${results.length} phép kiểm, phải có ${EXPECTED_CHECKS}.`);
  console.error("Ai đó đã bớt (hoặc thêm) phép kiểm mà không cập nhật EXPECTED_CHECKS. Xem lại scripts/session-check.mjs.\n");
  process.exit(3);
}

/* ---- báo cáo ------------------------------------------------------------ */
console.log(`\nCỔNG KIỂM ĐÓNG PHIÊN — phiên "${asLabel}"`);
if (!originMainResolves) {
  console.log(`⚠ KHÔNG SO ĐƯỢC VỚI ${MOC} — cổng chỉ thấy CÂY LÀM VIỆC. Mọi commit chưa push`);
  console.log(`  đều KHÔNG được xét: không đòi Log HANDOFF, không quy chủ, không kích hoạt suite.`);
  console.log(`  Kiểm: \`git remote -v\` và \`git branch -r\`. Repo mới thì chạy \`git fetch origin\` một lần.`);
}
console.log(`Bạn chịu trách nhiệm: ${[...myPackages, ...myRootAreas].join(", ") || "(không vùng nào)"}`);

/* ---- VÀNG, KHÔNG ĐỎ: khoá bạn đang giữ mà repo chưa thấy dấu vết ----------
 *
 * MỨC NGHIÊM TRỌNG LÀ PHẦN CỦA HỢP ĐỒNG, không phải chi tiết trình bày. Đây là một GHI CHÚ,
 * cố ý nằm ngoài danh sách phép kiểm: nó không đụng `EXPECTED_CHECKS`, không đụng `results`,
 * và không đổi mã thoát. `tests/khoa-dau-vet.mjs` ghim đúng điều đó.
 *
 * Vì sao không được để nó thành ĐỎ: một lane đọc kỹ 30 phút trước khi sửa một dòng là lane
 * TỐT. Chặn nó là dạy mọi lane **ghi bừa một byte để giữ khoá cho hợp lệ** — lúc đó phép kiểm
 * biến thành thứ ngược lại chính nó.
 *
 * Và câu này nói với ĐÚNG MỘT người: chính lane đang giữ khoá, người duy nhất biết mình có
 * đang làm hay không. Nó không nói với phiên điều phối, và nó không cho phép ai nhả khoá hộ.
 *
 * CÂU IN RA LẤY TỪ `noiDauVet`, không gõ lại ở đây. Trước bản 1.3.23 chỗ này gõ tay, tức có
 * HAI bản của cùng một câu — và tên của tín hiệu này là phần của hợp đồng: bản đầu gọi nó là
 * "vùng chưa bị chạm", và cả người viết ra nó cũng đọc thành "lane đang rảnh". Hai bản thì
 * sớm muộn một bản trôi, và bản trôi là bản dạy sai. */
try {
  const kh = await import("./claim.mjs");
  const cuaToi = Object.fromEntries(Object.entries(CLAIMS || {}).filter(([, v]) => v?.owner === asLabel));
  const vet = await kh.doDauVet(cuaToi, ROOT);
  const chua = [...vet.entries()].filter(([, t]) => t === kh.DAU_VET.CHUA).map(([k]) => k);
  if (chua.length) {
    const tuoi = chua.map((k) => { const st = CLAIMS[k]?.claimed_at; const cg = kh.mocCoGio(st); return `${k} (${cg ? "giữ " : ""}${kh.ageLabel(kh.ageHours(st), cg)})`; }).join(", ");
    console.log(`⚠ VÀNG — ${kh.noiDauVet(kh.DAU_VET.CHUA)} ở: ${tuoi}`);
    console.log("  Không commit nào chạm vùng đó kể từ lúc bạn nhận khoá, và không file nào đang sửa dở.");
    console.log("  KHÔNG chặn bạn: đọc kỹ trước khi sửa là việc tốt, và repo không thấy được việc bạn");
    console.log("  làm ở ngoài nó. Chỉ là: nếu vùng đó bạn CHƯA cần nữa thì tự trả, phiên khác đang chờ.");
    console.log(`  Trả: node scripts/claim.mjs --release ${chua[0]} --as ${asLabel}`);
  }
} catch (_) {
  /* Không đo được thì im — đây là ghi chú, không phải phép kiểm. Một ghi chú tự nổ sẽ làm
   * người ta gỡ nó ra, và lúc đó mất luôn thứ nó định nói. */
}
const others = [...foreignPackages, ...foreignRootAreas].map((k) => `${k} [${ownedBy(k)}]`);
if (others.length) console.log(`Phiên khác đang làm dở, KHÔNG tính cho bạn: ${others.join(", ")}`);
console.log("");
for (const r of results) {
  const mark = r.ok ? (r.skipped ? "BỎ  " : "XANH") : "ĐỎ  ";
  console.log(`  [${mark}] ${r.name}`);
  console.log(`         ${r.msg}`);
}
/* BA TRẠNG THÁI, KHÔNG PHẢI HAI. Đây là chỗ cổng từng nói dối.
 *
 * Bản cũ chỉ đếm `!ok`. Mục `BỎ` mang `ok: true`, nên một lượt chạy KHÔNG KIỂM ĐƯỢC GÌ vẫn kết
 * thúc bằng đúng câu "XANH TOÀN BỘ — được phép báo xong" và thoát 0. Ba ca có thật cùng dẫn tới
 * đó: chạy `--quick`; repo chưa khai `scripts.test`; không phân giải được `origin/main` (nhánh
 * tên khác, hoặc chưa `git fetch`) nên mọi commit chưa push biến khỏi tầm nhìn.
 *
 * Vì sao KHÔNG chuyển `BỎ` thành ĐỎ: một repo vừa dựng chưa có test là chuyện thật và hợp lệ —
 * đỏ ở đó là khoá repo ngay phiên đầu. Nhưng "chưa kiểm được" cũng KHÔNG phải "đã đạt". Nên nó
 * là trạng thái thứ ba, có mã thoát riêng:
 *
 *   0 — XANH TOÀN BỘ            mọi phép kiểm đã chạy và đạt
 *   1 — CHƯA XONG               có mục đỏ
 *   2 — CHƯA ĐỦ BẰNG CHỨNG      không mục nào đỏ, nhưng có mục không kiểm được
 *
 * Cả ca `BỎ` đều tự sửa được, và quy trình migrate đã dặn đúng cách sửa — nên mã 2 không khoá
 * repo nào, nó chỉ không cho nói dối. */
/* GHI MỘT DÒNG MỖI LẦN CHẠY — để trả lời được câu "luật nào chưa từng chặn được gì".
 *
 * `docs/BAO-TRI-DINH-KY.md` hỏi câu đó từ đầu, nhưng hỏi suông: không ai trả lời nổi khi không
 * có gì ghi lại. Một luật chưa từng bắt được gì thì hoặc nó thừa, hoặc nó là phép kiểm rỗng
 * nghĩa — repo này đã tự bắt được BẢY cái như thế trong ba ngày.
 *
 * KHÔNG COMMIT file này, và cố ý: nó là số đo của MÁY NÀY, không phải sự thật chung của repo.
 * Commit vào thì mỗi phiên lại tạo một thay đổi rác, và cổng "cây làm việc sạch" kêu oan.
 * Cắt còn 300 dòng cuối để nó không phình vô hạn — chính file đo cân nặng mà béo lên thì hỏng. */
try {
  // GHI RA NGOÀI REPO, không ghi vào trong.
  //
  // Bản đầu ghi `.agents/gate-log.jsonl` trong repo. Ở repo nhà thì thêm một dòng .gitignore là
  // xong — nhưng cổng này ĐI THEO BẢN TRÍCH sang mọi repo khác, và ở đó nó tạo một file lạ mà
  // chính phép kiểm bản đồ của nó bắt được. Đo thật ở repo NAV: cổng tự làm mình đỏ.
  //
  // Sổ này vốn là số đo CỦA MÁY NÀY, không phải sự thật chung của repo — nên chỗ đúng của nó là
  // thư mục tạm của máy, khoá theo đường dẫn repo. Không đụng một byte nào trong repo.
  const os = await import("node:os");
  const crypto = await import("node:crypto");
  const khoa = crypto.createHash("sha256").update(ROOT).digest("hex").slice(0, 16);
  const thuMuc = path.join(os.tmpdir(), "ark-harness-gate-log");
  fs.mkdirSync(thuMuc, { recursive: true });
  const soGhi = path.join(thuMuc, khoa + ".jsonl");
  const dongMoi = JSON.stringify({
    // Ngày theo đồng hồ MÁY NÀY, không phải UTC. Cùng lỗi đã sửa ở build-overview: sinh lúc
    // 0h30 giờ Việt Nam thì toISOString() trả ngày HÔM QUA, và sổ ghi lệch ngay dòng đầu.
    d: (() => { const x = new Date(), z = (n) => String(n).padStart(2, "0");
                return `${x.getFullYear()}-${z(x.getMonth() + 1)}-${z(x.getDate())}`; })(),
    as: asLabel,
    ten: results.map((r) => r.name),
    do: results.filter((r) => !r.ok).map((r) => r.name),
    bo: results.filter((r) => r.ok && r.skipped).map((r) => r.name)
  });
  let cu = [];
  try { cu = fs.readFileSync(soGhi, "utf8").split(String.fromCharCode(10)).filter(Boolean); } catch { cu = []; }
  fs.writeFileSync(soGhi, [...cu, dongMoi].slice(-300).join(String.fromCharCode(10)) + String.fromCharCode(10), "utf8");
} catch { /* ghi sổ hỏng KHÔNG được làm hỏng cổng — đây là số đo phụ, không phải phép kiểm */ }

const failed = results.filter((r) => !r.ok);
const boQua = results.filter((r) => r.ok && r.skipped);
if (failed.length) {
  console.log(`\nCHƯA XONG — ${failed.length} mục đỏ, sửa rồi chạy lại.\n`);
  process.exit(1);
}
if (boQua.length) {
  console.log(`\nCHƯA ĐỦ BẰNG CHỨNG — ${boQua.length} mục KHÔNG KIỂM ĐƯỢC (không mục nào đỏ).`);
  console.log("KHÔNG được báo xong: cổng chưa nhìn thấy thứ nó phải canh. Từng mục:");
  for (const r of boQua) console.log(`  · ${r.name}`);
  console.log("");
  process.exit(2);
}
try {
  if (loiDauCong) throw new Error(loiDauCong);
  const sau = dauCay(ROOT);
  if (sau.head !== dauCongTruoc.head || sau.bam !== dauCongTruoc.bam
      || git("rev-parse", "--verify", MOC).trim() !== dauCongTruoc.moc) {
    throw new Error("TREE_CHANGED: cây hoặc mốc remote đã đổi trong lúc chạy cổng; chạy lại trên cây ổn định.");
  }
  ghiDauCong(ROOT, { ...dauCongTruoc, loai: "session-check", as: asLabel, ok: true,
    moi_truong: moiTruongNay(), luc: new Date().toISOString() });
} catch (e) {
  console.error(`\nCHƯA ĐỦ BẰNG CHỨNG — không ghi được kết quả cổng: ${e.message}`);
  process.exit(2);
}
console.log(`\nXANH TOÀN BỘ — được phép báo xong.\n`);
process.exit(0);
