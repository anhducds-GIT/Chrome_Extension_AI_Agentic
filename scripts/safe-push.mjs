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

import { appendOnlyAtEof, AUDIT_CHUA_CO, AUDIT_TRAILER, auditFromMessage, claimPrefixesFrom, generatorsFrom, laneFromMessage, LANE_TRAILER, loiKhuyenKhiChan, nguoiDuyetFrom, nguoiDuyetSaiKhuon, ownershipKeys, readStructureFromDisk } from "./repo-structure.mjs";
import { bamLenh, danhSachSuite, dauCay, docDauCong, xetDauCong } from "./chay-test.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const asLabel = args[args.indexOf("--as") + 1];
const dryRun = args.includes("--dry-run");
const carry = args.includes("--carry");
/* Cua rieng cho vế "da qua audit doc lap" cua AGENTS.md muc 2. KHONG dung chung voi `--carry`:
   hai dieu kien khac nhau thi phai hai cai co khac nhau, khong thi mot lan chot thanh hai. */
const ducDuyetChuaAudit = args.includes("--duc-duyet-chua-audit");
const NL = String.fromCharCode(10);

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

/* NHÁNH ĐÍCH — tính MỘT LẦN, rồi mọi chỗ dưới dùng nó.
 *
 * Bản đầu đóng cứng `main` ở mười chỗ: fetch, ls-remote, mốc so, câu đẩy. Nên nó chỉ phục vụ
 * được MỘT hình dạng repo — mọi thứ nằm trên `main`. Đo thật 04/09: repo 3AI có việc bộ khung
 * nằm trên một nhánh tính năng, và công cụ **không có cách nào** đẩy nhánh đó lên remote của
 * chính nó. Một bộ khung tự nhận phục vụ 21 repo mà chỉ đẩy được một hình dạng thì chưa xong.
 *
 * LUẬT "MERGE VÀO MAIN PHẢI HỎI ĐỨC" KHÔNG BỊ NỚI — nó được giữ bằng CẤU TRÚC, và chặt hơn
 * trước: đứng ở nhánh nào thì đẩy lên đúng nhánh đó, nên ca "đưa nhánh khác lên main" không còn
 * tồn tại để mà phải chặn. Trước đây nó là một câu `if` ở cuối file — tức một cửa có thể quên
 * mở đúng chỗ; nay nó là chuyện không dựng nổi.
 *
 * Nhánh CHƯA có upstream thì TỪ CHỐI: tạo một nhánh mới trên remote là công bố một thứ MỚI,
 * không phải cập nhật thứ đã có — việc đó là của người. */
const nhanhHienTai = gitQuiet("rev-parse", "--abbrev-ref", "HEAD").trim();

/* DETACHED HEAD THÌ TỪ CHỐI — không được lùi về `main`.
 *
 * Bản v1.2.9 viết `nhanhHienTai !== "HEAD" ? nhanhHienTai : "main"`, tức đứng ở detached HEAD là
 * công cụ **lặng lẽ nhắm `main`** rồi đẩy `HEAD:main`. Đó đúng là cú HỢP NHẤT mà luật mục 2 bắt
 * phải hỏi Đức — tới bằng đường tai nạn, không ai chọn. Và nó tệ hơn bản trước v1.2.9: hồi đó có
 * một câu `if` chặn mọi thứ không phải `main`; cái lùi-về-mặc-định này xoá mất câu đó.
 *
 * Detached HEAD nghĩa là KHÔNG CÓ nhánh nào đang đứng. "Nhánh đích bằng nhánh đang đứng" mất
 * nghĩa, nên câu trả lời đúng là DỪNG, không phải đoán một cái tên. */
if (!nhanhHienTai || nhanhHienTai === "HEAD") {
  console.error(String.fromCharCode(10) + "TU_CHOI: đang ở detached HEAD — không đứng trên nhánh nào.");
  console.error("Công cụ này đẩy lên ĐÚNG nhánh bạn đang đứng, mà ở đây không có nhánh nào để đẩy lên.");
  console.error("Lùi về `main` cho tiện là biến một tai nạn thành một cú HỢP NHẤT — luật mục 2 bắt hỏi Đức.");
  console.error("Cách xử lý: `git checkout <nhánh>` rồi chạy lại." + String.fromCharCode(10));
  process.exit(1);
}
const NHANH = nhanhHienTai;
const upstream = gitQuiet("rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}").trim();
if (NHANH !== "main" && upstream !== "origin/" + NHANH) {
  console.error(String.fromCharCode(10) + `TU_CHOI: nhánh "${NHANH}" chưa có nhánh tương ứng trên remote.`);
  console.error("Tạo một nhánh MỚI trên remote là công bố một thứ mới, không phải cập nhật thứ đã có —");
  console.error("việc đó là của người, không phải của công cụ.");
  console.error("Muốn công bố thật thì tự tạo nhánh trên remote trước, rồi chạy lại." + String.fromCharCode(10));
  process.exit(1);
}
const REMOTE = "origin/" + NHANH;

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
  git("fetch", "origin", NHANH, "--quiet");
} catch (error) {
  const detail = String(error.stderr || error.stdout || error.message).trim().split("\n").slice(-2).join(" | ");
  console.error(`\n⚠ KHONG_FETCH_DUOC: \`git fetch origin ${NHANH}\` thất bại → ${detail}`);
  console.error(`  Vẫn đi tiếp, nhưng mốc so sánh là bản ${REMOTE} CŨ trên máy. Nếu push bị từ chối vì không tiến thẳng thì đó là lý do.\n`);
}
/* HAI CA khác hẳn nhau, cùng có hình dạng "không phân giải được origin/main":
 *   a) remote CHƯA CÓ nhánh main -> CÚ ĐẨY ĐẦU TIÊN của một repo mới. Hợp lệ, và MỌI repo
 *      dựng từ harness đều đi qua đúng ca này. Chặn nó là chặn chính việc harness sinh ra
 *      để làm. Đo được 03/09: repo nhà của harness không đẩy nổi lần đầu.
 *   b) remote CÓ nhánh main mà máy không có -> máy đang lệch, chưa fetch bao giờ. PHẢI chặn.
 * Phân biệt bằng cách HỎI THẲNG REMOTE, không suy từ trạng thái máy — vì chính trạng thái
 * máy là thứ đang bị nghi. */
const remoteCoMain = gitQuiet("ls-remote", "--heads", "origin", NHANH).trim() !== "";
const coRefTrenMay = gitQuiet("rev-parse", "--verify", REMOTE).trim() !== "";
const lanDau = !coRefTrenMay && !remoteCoMain;

if (!coRefTrenMay && remoteCoMain) {
  console.error(String.fromCharCode(10) + ` KHONG_CO_REF_REMOTE: remote CÓ nhánh ${NHANH}, nhưng bản sao trên máy này thì không.`);
  console.error("Máy đang lệch với remote. Đếm \"chưa đẩy\" bằng một mốc không tồn tại là báo xong cho một cú đẩy CHƯA HỀ XẢY RA.");
  console.error("Chạy `git fetch origin` một lần rồi thử lại." + String.fromCharCode(10));
  process.exit(1);
}

// Lần đầu thì mốc so là toàn bộ lịch sử — không có origin/main để trừ đi.
const phamVi = lanDau ? "HEAD" : `${REMOTE}..HEAD`;
if (lanDau) console.log(String.fromCharCode(10) + `LẦN ĐẦU: remote chưa có nhánh ${NHANH}. Sắp tạo nó bằng toàn bộ lịch sử repo này.`);
const pending = gitQuiet("log", "--format=%H%x1f%s%x1f%an", phamVi).split("\n").filter(Boolean)
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
  gitQuiet("diff", "-U0", REMOTE, "HEAD", "--", ROOT_HANDOFF),
  gitQuiet("show", `${REMOTE}:${ROOT_HANDOFF}`)
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

console.log(`\nSẮP ĐẨY LÊN ${REMOTE} — phiên "${asLabel}"`);
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

/* `--carry` TU LAM KHI DU HAI DIEU KIEN — Duc chot 2026-09-09, AGENTS.md muc 2 hang 2.
 *
 * Ba luot trong hai ngay phai dung hoi Duc cho cung mot hinh dang: commit cua lane khac nam duoi
 * commit cua minh, va git xep theo thu tu nen day cai tren la buoc day cai duoi. Ca ba luot Duc
 * deu duyet. Mot cua ma lan nao cung mo thi no khong con la cua — no la thu tuc, va thu tuc lap
 * lai bi bo qua truoc khi bi go.
 *
 * HAI DIEU KIEN, va thieu mot la van hoi:
 *   ⑴ MOI commit sap day deu QUY THUOC DUOC — co nhan `Lane:` doc ra ten phien. Day la cai
 *     `--carry` thuc su mua: neu sau nay co gi sai, tra nguoc ve dung phien lam ra no.
 *   ⑵ Cong dong phien da chay va XANH tren DUNG cay lam viec nay — doc dau xac nhan, khong tin
 *     loi ai. Dau buoc vao HEAD + bam cay lam viec, nen no khong muon duoc cua luot truoc.
 *
 * VE ⑵ LA CHO DE LAM SAI NHAT: bo no di thi luat con lai la "co nhan Lane thi day duoc", tuc
 * mot lane co the day viec cua lane khac di khi cong dang DO. Dau xac nhan la thu duy nhat o
 * day biet cong da chay hay chua. */
let tuDong = null;
if (blocked.length && !carry) {
  const thieuNhan = rows.filter((r) => !r.lane).map((r) => r.sha.slice(0, 7));
  let dauXanh = false;
  let viSaoDau = "chua doc duoc dau xac nhan";
  try {
    const xet = xetDauCong(docDauCong(ROOT), dauCay(ROOT), bamLenh(danhSachSuite(ROOT)),
      { as: asLabel, moc: gitQuiet("rev-parse", "--verify", REMOTE).trim() });
    dauXanh = Boolean(xet && xet.dung);
    viSaoDau = (xet && xet.vi_sao) || viSaoDau;
  } catch (e) {
    dauXanh = false;
    viSaoDau = String(e.message).split(String.fromCharCode(10))[0];
  }
  if (!thieuNhan.length && dauXanh) {
    tuDong = viSaoDau;
  } else {
    console.error(`${String.fromCharCode(10)}TU CHOI PUSH — dieu kien tu dong CHUA du:`);
    if (thieuNhan.length) console.error(`  · commit khong quy thuoc duoc (thieu nhan ${LANE_TRAILER}): ${thieuNhan.join(" ")}`);
    if (!dauXanh) console.error(`  · cong dong phien chua xanh tren cay lam viec nay — ${viSaoDau}`);
  }
}

if (blocked.length && !carry && !tuDong) {
  console.error(`\nTỪ CHỐI PUSH — bạn đang cuốn theo việc của phiên khác:`);
  for (const row of blocked) {
    console.error(`  ${row.sha.slice(0, 7)} → ${row.foreign.map((f) => `${f.area} (của "${f.owner}")`).join(", ")}`);
  }
  console.error(`\nĐẩy lên là commit của họ cũng lên theo, và Đức chưa duyệt phần đó.`);
  /* LANE ĐÃ ĐI RỒI THÌ ĐỪNG BẢO NGƯỜI TA CHỜ NÓ.
   *
   * `claim.mjs --release --du-biet` cho một lane trả khoá KÈM commit chưa đẩy — cần thiết, không
   * thì lane bị cổng xuất bản chặn sẽ kẹt khoá vĩnh viễn. Nhưng lane đó đi rồi, và commit của nó
   * ở lại chặn MỌI lane sau.
   *
   * Đo 07/09 trong một kho dựng riêng: sau một lượt `--du-biet`, lane kế KHÔNG đẩy được, và câu
   * duy nhất chỗ này in ra là "chờ phiên đó tự push" — bảo người ta chờ một việc sẽ KHÔNG BAO GIỜ
   * xảy ra. Lời khuyên sai còn tệ hơn không có lời khuyên: người đọc tin là mình chỉ cần đợi, nên
   * không ai đi hỏi Đức, nên repo kẹt im lặng.
   *
   * KHÔNG tự cho qua. `--carry` vẫn phải hỏi Đức (AGENTS.md mục 2 hàng 2) — chỗ này chỉ đổi một
   * câu SAI thành một câu ĐÚNG, không hạ một lớp bảo vệ nào. */
  for (const dong of loiKhuyenKhiChan(claims)) console.error(dong);
  console.error("");
  process.exit(1);
}
if (blocked.length && tuDong) {
  const ai = [...new Set(blocked.flatMap((r) => r.foreign.map((f) => f.owner)))].join(", ");
  console.log(`${String.fromCharCode(10)}CUON THEO viec cua ${ai} — tu dong cho qua (Duc chot 09/09).`);
  console.log(`  du hai dieu kien: moi commit deu co nhan ${LANE_TRAILER} · cong da xanh (${tuDong})`);
  console.log("  Duc THOI duoc bao tung luot — do la cai gia da ghi trong AGENTS.md muc 2.");
}
if (blocked.length && carry) {
  console.log(`\n--carry: Đức đã duyệt cho đẩy kèm việc của ${[...new Set(blocked.flatMap((r) => r.foreign.map((f) => f.owner)))].join(", ")}.`);
}

/* TỰ DẠY ĐÚNG LÚC, thay vì thêm một dòng vào sổ tay không ai mở.
 *
 * Nhãn `Audit:` chỉ chặn được khi có người GÕ nó, mà không ai gõ một nhãn mình chưa biết là có.
 * Chỗ dạy rẻ nhất là ngay đây — lúc người ta sắp đẩy code. Cùng khuôn với khối ⚠ nhãn `Lane:`
 * phía trên: NÊU TÊN, không đổi mã thoát. Bật chặn cho commit thiếu nhãn là khoá repo ngay lượt
 * đầu, và `AGENTS.md` mục 2 vốn đã đòi audit bằng chữ rồi. */
/* MỘT LƯỢT ĐỌC, DÙNG CHUNG. Bản đầu đọc thông điệp hai lần (một cho cảnh báo, một cho cửa) —
   audit độc lập nêu chi phí N tiến trình git; gộp lại thì còn một lượt. */
const dsNguoiDuyet = nguoiDuyetFrom(structure);
/* NÊU TÊN SAI KHUÔN, ĐỪNG BỎ IM LẶNG — audit vòng 4. Khai `Duc` hay `nguyen van a` thì tên đó
   không có hiệu lực, và người khai tưởng mình đã cấp quyền duyệt. Chỉ NÊU, không đổi mã thoát. */
const saiKhuon = nguoiDuyetSaiKhuon(structure);
if (saiKhuon.length) {
  console.log(`${NL}⚠ ${saiKhuon.length} tên trong \`audit.nguoi_duyet\` SAI KHUÔN nên KHÔNG có hiệu lực: ${saiKhuon.join(", ")}`);
  console.log(`  Tên người duyệt là một thẻ chữ thường: khớp \`^[a-z0-9][a-z0-9._-]*$\`, ví dụ "codex-r04".`);
}
const rowsAudit = rows.map((row) => ({ ...row, audit: auditFromMessage(gitQuiet("log", "-1", "--format=%B", row.sha), dsNguoiDuyet) }));
const chamCode = rowsAudit.filter((row) => {
  const files = gitQuiet("show", "--name-only", "--format=", row.sha).split(NL).filter(Boolean);
  return files.some((f) => f.replace(/^"|"$/g, "").startsWith("scripts/") || f.replace(/^"|"$/g, "").startsWith("tests/"));
});
/* ĐẾM COMMIT THIẾU KHAI, không hỏi "có commit nào khai không". Bản đầu tắt cảnh báo cho MỌI
   commit code khi chỉ MỘT commit có nhãn — audit độc lập nêu đúng chỗ này. */
const codeThieuKhai = chamCode.filter((row) => !row.audit.khai);
if (codeThieuKhai.length) {
  console.log(`${NL}⚠ ${codeThieuKhai.length}/${chamCode.length} commit chạm \`scripts/\` hoặc \`tests/\` mà KHÔNG khai \`${AUDIT_TRAILER}\`.`);
  console.log(`  AGENTS.md mục 2 điều ⑵ đòi code phải QUA AUDIT ĐỘC LẬP trước khi đẩy — cổng không đo được điều đó.`);
  console.log(`  Chưa qua audit thì thêm một dòng cuối thông điệp commit, và cửa này sẽ giữ nó lại:`);
  console.log(`      ${AUDIT_TRAILER} ${AUDIT_CHUA_CO}`);
}

/* CỬA AUDIT — `KHUNG-56`. Chạy TRƯỚC `--dry-run` (cùng lý do với phép kiểm nhánh ngay dưới) và
 * ĐỘC LẬP với `blocked`: đẩy commit chưa duyệt của CHÍNH MÌNH cũng là công bố việc chưa ai duyệt.
 *
 * `--carry` KHÔNG mở được cửa này, và đó là chủ ý. Điều Đức chốt 09/09 là *"cuốn theo việc QUY
 * THUỘC ĐƯỢC"* — một câu về truy nguồn. Nó không nói gì về việc đã duyệt hay chưa. Gộp hai câu
 * làm một là dùng lời chấp thuận cho việc A để làm việc B.
 *
 * MỘT COMMIT SAU GỠ ĐƯỢC LỜI KHAI CỦA COMMIT TRƯỚC — nếu thiếu vế này thì cơ chế là ngõ cụt:
 * thông điệp commit không sửa được mà không viết lại lịch sử, nên một commit đã khai `chua-co`
 * sẽ bị chặn VĨNH VIỄN kể cả sau khi audit đạt, và đường ra duy nhất là gọi Đức mỗi lượt — trái
 * đúng `AGENTS.md` mục 2, vốn cho tự đẩy KHI ĐÃ có audit. (Tôi đã tự đi vào ngõ cụt đó một lần,
 * ngay lượt viết ra nó.)
 *
 * ĐƠN VỊ LÀ "TỚI ĐÂY", KHÔNG PHẢI TỪNG COMMIT — vì audit thật ở repo này soi CẢ KHOẢNG diff, không
 * soi từng commit. Nên một commit khai tên người duyệt sẽ gỡ mọi lời khai `chua-co` CŨ HƠN nó;
 * commit MỚI HƠN vẫn bị chặn. `rows` xếp mới→cũ, nên "cũ hơn" là chỉ số LỚN hơn. */
const iDaDuyet = rowsAudit.findIndex((row) => row.audit.khai && !row.audit.chuaAudit);
const chuaDuyet = rowsAudit.filter((row, i) => row.audit.chuaAudit && (iDaDuyet === -1 || i < iDaDuyet));
if (chuaDuyet.length && !ducDuyetChuaAudit) {
  console.error(`${NL}TU CHOI PUSH — ${chuaDuyet.length} commit TU KHAI la chua qua audit doc lap:`);
  for (const row of chuaDuyet) {
    console.error(`  ${row.sha.slice(0, 7)}  ${row.subject.slice(0, 62)}`);
    if (row.audit.problem) console.error(`             ${row.audit.problem}`);
  }
  console.error(`${NL}AGENTS.md muc 2 dieu (2): cong XANH TOAN BO, va code thi DA QUA AUDIT DOC LAP.`);
  console.error(`Cong xanh khong thay duoc audit — do la hai dieu kien, khong phai mot.`);
  console.error(`${NL}Ba duong ra, khong co duong thu tu:`);
  console.error(`  · lay audit that, roi commit KET QUA audit kem dong cuoi:  ${AUDIT_TRAILER} <ten-nguoi-duyet>`);
  console.error(`    commit do go moi loi khai "${AUDIT_CHUA_CO}" CU HON no — khong phai sua lai lich su`);
  console.error(`  · Duc chot cho day khi chua duyet:  --duc-duyet-chua-audit`);
  console.error(`  · KHONG the "day rieng phan con lai" neu commit chua duyet la TO TIEN cua thu`);
  console.error(`    ban muon day — git day ca chuoi. Muon tach thi cherry-pick phan doc lap`);
  console.error(`    sang mot nhanh khac roi chay lai cong o do.${NL}`);
  process.exit(1);
}
/* CHỈ NÓI KHI THẬT SỰ GỠ ĐƯỢC MỘT CÁI. Bản đầu in câu này bất cứ khi nào có một nhãn duyệt và
   một lời khai `chua-co` ở ĐÂU ĐÓ — kể cả khi lời khai đó MỚI HƠN nên không hề được gỡ. Một câu
   đúng-một-nửa ở cổng là đúng họ bệnh `KHUNG-15`. */
const daGo = rowsAudit.filter((row, i) => row.audit.chuaAudit && iDaDuyet >= 0 && i > iDaDuyet);
if (daGo.length) {
  console.log(`${NL}Nhan ${AUDIT_TRAILER} ${rowsAudit[iDaDuyet].audit.khai} o ${rowsAudit[iDaDuyet].sha.slice(0, 7)} go ${daGo.length} loi khai "${AUDIT_CHUA_CO}" cu hon no.`);
}
if (chuaDuyet.length && ducDuyetChuaAudit) {
  console.log(`${NL}--duc-duyet-chua-audit: Duc chot cho day ${chuaDuyet.length} commit chua qua audit.`);
}

/* Phép kiểm nhánh phải chạy TRƯỚC cửa `--dry-run`. Đặt nó sau thì lần chạy thử báo "sẽ đẩy
   được", rồi lần chạy thật mới từ chối — mà `--dry-run` tồn tại đúng để nói trước chuyện đó. */
/* Cửa "đứng ngoài main thì từ chối" của bản cũ ĐÃ BỎ, và KHÔNG phải vì nới lỏng: nó không còn
   ca nào để chặn. Nhánh đích nay bằng chính nhánh đang đứng (tính ở đầu file), nên "đưa nhánh
   khác lên main" là chuyện không dựng nổi — chặt hơn một câu `if`, vì không có gì để quên. */

/* ---- SỰ THẬT MÁY SINH PHẢI KHỚP HEAD ---------------------------------------
 *
 * KHÔI PHỤC 12/09, không phải tính năng mới. Bảo đảm này đã có chữ từ lâu — *"không ai đẩy
 * được một nhánh mà artifact đã commit không khớp với HEAD"* — và `tests/push-gate-artifact-
 * smoke.mjs` là phép ghim của nó. Lượt migrate bộ khung (`4da1e9e5`) gỡ mất khối này khỏi
 * safe-push; phép ghim đỏ từ hôm đó, nhưng nó nằm trong một chuỗi `npm test` đã chết ở bài
 * thứ nhất, nên không ai thấy. Đo 12/09: 18/31 bài kiểm gốc repo không chạy nổi.
 *
 * VÌ SAO PHẢI Ở ĐÂY, DÙ CỔNG PHIÊN CŨNG KIỂM: cổng là lượt TỰ KIỂM, bỏ qua được. `safe-push`
 * là CÁI CỬA. Một bảo đảm chỉ tồn tại ở lượt tự kiểm thì nó là lời khuyên.
 *
 * CƠ CHẾ dùng lại đúng hợp đồng sẵn có: mỗi bộ sinh tự biết đối chiếu bản ra của mình với HEAD
 * qua `--check-head`. Không chép logic so sánh sang đây — hai bộ so là hai chỗ để chúng nói
 * khác nhau.
 *
 * `ponytail: chạy tuần tự từng bộ sinh, mỗi cái tối đa 120 giây. Repo này có 4. Song song hoá
 *  nếu sau này có hàng chục.` */
{
  const boSinh = generatorsFrom(structure);
  /* CHẠY BẢN Ở HEAD, KHÔNG CHẠY BẢN TRONG CÂY LÀM VIỆC — và đây là điểm khác cổng phiên.
     Cổng phiên gặp bộ sinh sửa dở thì TỪ CHỐI PHÁN XỬ, và với nó thế là đủ: cổng là lượt tự
     kiểm của chính phiên đang sửa. `safe-push` thì không — một lane đang sửa `build-dashboard.mjs`
     sẽ chặn mọi lane khác đẩy việc chẳng liên quan. Đó là đổ oan, đúng họ bệnh mà cả lớp phân
     vùng sinh ra để tránh.
     Bản ở HEAD ghi tạm vào ĐÚNG `scripts/` chứ không vào thư mục tạm: bộ sinh tự tính gốc repo
     theo vị trí file của chính nó, chạy ở chỗ khác là nó tính sai gốc (ghi chú dài trong
     session-check.mjs, audit 02/09). */
  const tam = [];
  /* DỌN TRƯỚC KHI THOÁT, KHÔNG DỰA VÀO `finally`. `process.exit()` KHÔNG chạy khối `finally` —
     đo được ngay lượt thử đầu 12/09: một lượt từ chối để lại `.safe-push-head-<pid>-*.mjs` nằm
     trong `scripts/`, tức cửa này tự làm bẩn đúng thư mục nó vừa phán là phải sạch. */
  const don = () => { for (const f of tam) { try { fs.unlinkSync(f); } catch { /* dọn được thì dọn */ } } };
  try {
    const lech = [];
    for (const ten of boSinh) {
      const duongTam = path.join(ROOT, "scripts", `.safe-push-head-${process.pid}-${ten}`);
      let blob;
      try {
        blob = execFileSync("git", ["show", `HEAD:scripts/${ten}`], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      } catch {
        // Bộ sinh CHƯA có ở HEAD (vừa thêm, chưa commit) thì không có gì để đối chiếu — bỏ qua,
        // không chặn: chặn ở đây là bắt người ta commit bộ sinh trước khi được đẩy bộ sinh.
        continue;
      }
      fs.writeFileSync(duongTam, blob, "utf8");
      tam.push(duongTam);
      try {
        execFileSync(process.execPath, [duongTam, "--check-head"],
          { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 120000 });
      } catch (e) {
        const chiTiet = String(e.stderr || e.stdout || e.message).trim().split("\n").slice(-3).join(" | ");
        lech.push(`${ten}${chiTiet ? ` → ${chiTiet}` : ""}`);
      }
    }
    if (lech.length) {
      console.error(`${NL}TỪ CHỐI PUSH — sự thật máy sinh chưa khớp với HEAD:`);
      for (const d of lech) console.error(`    ✗ ${d}`);
      console.error(`${NL}  Sinh lại rồi commit phần vừa sinh:`);
      console.error(`      ${boSinh.map((t) => `node scripts/${t}`).join(" && ")}${NL}`);
      don();
      process.exit(1);
    }
  } finally { don(); }
}

if (dryRun) { console.log("\n--dry-run: dừng ở đây, chưa đẩy gì.\n"); process.exit(0); }

/* ĐẨY ĐÚNG CÁI VỪA SOI. Đây là lỗ nguy hiểm nhất từng tìm thấy trong công cụ này.
 *
 * Mọi phép soi phía trên chạy trên `origin/main..HEAD`. Câu đẩy cũ là `git push origin main` —
 * và `main` ở đó là NHÁNH main TRÊN MÁY, không phải `HEAD`. Đứng ở một nhánh tính năng thì hai
 * thứ đó là hai lịch sử khác nhau: công cụ soi nhánh của bạn, rồi đẩy nhánh main trên máy —
 * tức đẩy đúng thứ chưa ai soi, có thể gồm commit của phiên khác.
 *
 * Nói cách khác: công cụ sinh ra để chặn "đẩy kèm việc người khác" lại có thể tự làm đúng việc
 * đó. Audit độc lập bắt được 03/09; repo NAV cũng đang ở đúng hình dạng này (nhánh main trên máy
 * đã rẽ khỏi origin/main từ trước).
 *
 * Hai lớp chữa:
 *   1. Đứng ngoài `main` thì TỪ CHỐI. Đưa một nhánh khác lên `main` là một quyết định hợp nhất,
 *      và luật mục 2 nói rõ merge vào `main` phải hỏi Đức. Công cụ này không tự quyết thay.
 *   2. Kể cả khi đang ở `main`, đẩy bằng `HEAD:main` — nói thẳng nguồn và đích, để không còn
 *      khoảng cách nào giữa thứ được soi và thứ được đẩy. */
console.log("\nĐang đẩy...");
try { console.log(git("push", "origin", `HEAD:${NHANH}`).trim() || "Xong."); }
catch (error) { console.error(`Push thất bại: ${String(error.stdout || error.stderr || error.message).trim()}`); process.exit(1); }
// Đừng đóng cứng `_root`: sau A2 gốc repo có BỐN khoá, nên câu cũ dặn sai tên vùng — và đây là
// chữ operator, tức luật vàng 5. Kể đúng vùng vừa đẩy, và nêu luôn lệnh trả quyền (đừng dặn sửa
// tay `claims.json`: A1 sinh ra `claim.mjs` chính vì sửa tay là chỗ quyền bị ghi đè).
const pushedAreas = [...new Set(rows.flatMap((row) => row.areas.map((a) => a.area)))].sort();
console.log(`\nĐÃ PUSH ${rows.length} commit, chạm vùng: ${pushedAreas.join(", ") || "(chỉ thao tác hành chính)"}.`);
console.log(`Xong việc ở vùng nào thì trả quyền vùng đó: node scripts/claim.mjs --release <khoá> --as ${asLabel}\n`);
