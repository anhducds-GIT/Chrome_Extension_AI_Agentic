/* what-next.mjs — BẢN ĐỒ VIỆC cho vai điều phối.
 *
 * Trả lời đúng một câu mà hôm nay không file nào trả lời được: **việc nào chạy song song
 * được ngay bây giờ**. Dữ liệu vốn có đủ, nhưng nằm rải ở năm chỗ (bảng quyền · ba
 * BACKLOG · sổ ý tưởng · STATUS từng đơn vị) và không chỗ nào giao được với chỗ nào.
 *
 * Luật song song mà file này cưỡng chế, chỉ một câu: hai việc chạy song song được KHI VÀ
 * CHỈ KHI chúng thuộc hai khoá khác nhau và cả hai khoá đang trống. Không suy diễn gì thêm.
 *
 * VÙNG CỦA MỘT VIỆC LÀ SUY RA, KHÔNG KHAI TAY. Một mục nợ nằm trong
 * `workers/duc-auto-gemini/v0.2.0/BACKLOG.md` thì vùng của nó là `workers/duc-auto-gemini` —
 * `stewardOf()` đã biết cách suy điều đó cho cổng kiểm và safe-push, nên ở đây dùng lại
 * cùng một hàm. Bắt người khai `vùng:` cho 58 mục nợ là thêm một trường có thể khai sai,
 * để lấy về đúng thông tin đã nằm trong đường dẫn.
 *
 * CHỈ ĐỌC. File này không ghi gì, không commit gì.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseStatus } from "./build-dashboard.mjs";
import { ageHours, ageLabel, fingerprintState, GIO_NHAC, readClaims } from "./claim.mjs";
import { claimPrefixesFrom, readStructureFromDisk, stewardOf, unitsFrom } from "./repo-structure.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* --- Đọc dữ liệu: hàm thuần, không chạm đĩa ----------------------------------
   Thuần để test ghim dựng được ca hỏng bằng chuỗi, không phải bằng repo thật. Ba phép
   kiểm trong repo này đã từng xanh một cách vô nghĩa vì chúng kiểm hàm có chạm đĩa. */

const MA_VIEC = /^###\s+~*\s*([A-Z]+-\d+)~*\s*[·:]?\s*(.*)$/;
const UU_TIEN = /^##\s+(P[1-9])\b/;

/* HAI cách nhận một mục đã đóng, và chúng KHÔNG ngang hàng.
   Quy ước thật của sổ là gạch ngang `~~` — đo 03/09: 6 trong 7 mục đóng dùng nó.
   Đúng MỘT mục (`G-11`) chỉ ghi `**ĐÓNG 28/08**` mà không gạch, nên nếu chỉ đọc `~~` thì
   nó bị đếm là việc mở, và bảng sẽ giao cho người khác một việc đã xong.
   Nên: `~~` là chính, từ khoá in HOA là lưới hứng, và mục rơi vào lưới thì BỊ NÊU TÊN
   (mục `canhBaoKhai`) thay vì âm thầm bỏ qua — cách viết thứ năm sẽ xuất hiện, và lúc đó
   phải có người thấy. In hoa toàn phần là cố ý: `đóng phiên` trong văn xuôi không trúng lưới. */
const GACH = /^###\s+~~/;
// KHÔNG dùng `\b` ở đây: `\b` dựa trên `\w` = [A-Za-z0-9_], nên `Đ` là non-word và
// `\bĐÓNG` không bao giờ khớp. Bản đầu viết `\b(ĐÃ ĐÓNG|ĐÓNG|…)\b` và **G-11 thoát lưới** —
// mục đã đóng 28/08 vẫn được bảng đem đi giao cho phiên khác. Lỗi im lặng, không báo gì.
const TU_DONG = /(ĐÃ ĐÓNG|ĐÓNG|ĐÃ XONG|XONG|ĐÃ VÁ)/;

/** Mục nợ MỞ trong một BACKLOG.md. Mục đã đóng bị bỏ — sổ giữ chúng để tra lịch sử.
    Trả `{ mo, khaiSai }`; `khaiSai` = mục đóng bằng từ khoá mà không gạch, sai quy ước sổ. */
export function parseBacklog(text) {
  const ra = [];
  const khaiSai = [];
  let uuTien = "P?";
  for (const dong of String(text).split(/\r?\n/)) {
    const moc = UU_TIEN.exec(dong);
    if (moc) { uuTien = moc[1]; continue; }
    const viec = MA_VIEC.exec(dong);
    if (!viec) continue;
    if (GACH.test(dong)) continue;
    if (TU_DONG.test(dong)) { khaiSai.push(viec[1]); continue; }
    ra.push({ ma: viec[1], tieuDe: lamSach(viec[2]), uuTien });
  }
  return { mo: ra, khaiSai };
}

const TRUONG = (ten) => new RegExp("^\\s*[-*]\\s+\\*\\*" + ten + ":?\\*\\*:?\\s*(.*)$");
const MA_Y = /^##\s+(Y-\d+)\s*[·:]?\s*(.*)$/;
const BAC_NGHI = /^(nghỉ|nghi)$/i;

/** Ý tưởng trong IDEAS.md. Bậc `nghỉ` bị bỏ: sổ giữ chúng để không ai đề xuất lại.
    Ý tưởng đã có `nhà:` cũng bỏ — luật IDEAS mục 2, còn hiện là bảng đếm hai lần một việc. */
export function parseIdeas(text) {
  const ra = [];
  let hienTai = null;
  const truongs = [["bậc", "bac"], ["việc kế", "viecKe"], ["chủ", "chu"], ["phạm vi", "phamVi"], ["nhà", "nha"]];
  for (const dong of String(text).split(/\r?\n/)) {
    const moc = MA_Y.exec(dong);
    if (moc) {
      hienTai = { ma: moc[1], tieuDe: lamSach(moc[2]), bac: "", viecKe: "", chu: "", phamVi: "", nha: "" };
      ra.push(hienTai);
      continue;
    }
    if (!hienTai) continue;
    for (const [nhan, khoa] of truongs) {
      const t = TRUONG(nhan).exec(dong);
      if (t && !hienTai[khoa]) hienTai[khoa] = lamSach(t[1]);
    }
  }
  return ra.filter((y) => !BAC_NGHI.test(y.bac.trim()) && !y.nha.trim());
}

/* Chờ Đức = trường `việc kế` nhắc tên Đức. Hai lựa chọn có chủ đích ở đây.
   MỘT, không liệt kê động từ: bản đầu dò `cần Đức|chờ Đức|Đức chốt|Đức duyệt` và **bỏ sót
   Y-01** vì nó viết "Đức mô tả rõ hơn" — liệt kê động từ thì luôn thiếu động từ thứ năm.
   HAI, chỉ quét `việc kế`, KHÔNG quét tiêu đề: Y-03 tên là "Trường Đức cần làm…" nhưng bước
   kế của nó là việc của AI, nên quét tiêu đề sẽ đẩy nó vào danh sách chờ Đức một cách sai. */
// Không `\b` — cùng cái bẫy đã cắn ở TU_DONG bên trên, và nó cắn ĐÚNG HAI LẦN trong một
// buổi: `\b` dựa trên [A-Za-z0-9_], nên với chữ tiếng Việt nó không tạo biên. Trong repo mà
// mọi chữ đều tiếng Việt, `\b` là bẫy mặc định — đừng gõ nó theo phản xạ.
const CHO_DUC = /Đức/;
export function locChoDuc(muc) {
  return muc.filter((m) => CHO_DUC.test(String(m.viecKe || "")));
}

function lamSach(s) {
  return String(s || "").replace(/~~/g, "").replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
}

/* SỔ NỢ KHÔNG PHẢI NGUỒN DUY NHẤT, và bỏ sót điều đó là một lỗi đã đo được.
   `workers/duc-auto-gg-flow-video` có **0 mục nợ** trong `BACKLOG.md` — F-25, việc ưu tiên
   số 1 của cả repo, chỉ nằm ở `next_step` của `STATUS.md`. Bản đồ chỉ đọc sổ nợ thì gói đó
   trông như rảnh, và tệ hơn: nó bị lọc khỏi mục "song song được" vì đếm 0 việc.
   Nên đọc thêm `next_step`, gắn nhãn nguồn, và KHÔNG cộng vào số mục nợ — đó là hai loại
   dữ liệu khác nhau, gộp số lại là đếm một việc hai lần. */
export function tieuDiemTuStatus(text) {
  const { frontmatter } = parseStatus(text);
  const nextStep = String(frontmatter.next_step || "").trim();
  if (!nextStep) return null;
  const rank = Number.parseInt(frontmatter.priority_rank, 10);
  return { nextStep, rank: Number.isFinite(rank) ? rank : null, lifecycle: String(frontmatter.lifecycle || "") };
}

/* --- Ghép việc vào khoá, rồi cắt theo trạng thái khoá ------------------------- */

/** Trung tâm của file: nhóm việc theo khoá, đánh dấu khoá nào trống. */
export function banDoVung({ viecTheoFile, tieuDiemTheoFile = [], claims, structure, prefixes, now = new Date() }) {
  const vungs = new Map();
  const lay = (khoa) => {
    if (!vungs.has(khoa)) {
      const o = (claims && claims.claims && claims.claims[khoa]) || null;
      const chu = o && o.owner ? o.owner : null;
      vungs.set(khoa, {
        khoa,
        chu,
        gio: chu && o.claimed_at ? ageHours(o.claimed_at, now) : null,
        viecChu: chu ? lamSach(o.task) : "",
        viec: [],
        tieuDiem: [],
      });
    }
    return vungs.get(khoa);
  };
  // Mọi khoá đã có trong bảng quyền đều phải hiện, kể cả khoá không mục nợ nào trỏ tới —
  // nếu không thì một vùng đang bị giữ sẽ vô hình đúng với người cần biết nhất.
  for (const khoa of Object.keys((claims && claims.claims) || {})) lay(khoa);
  for (const { relPath, viec } of viecTheoFile) {
    const khoa = stewardOf(relPath, structure, prefixes) || "_root";
    lay(khoa).viec.push(...viec);
  }
  for (const { relPath, tieuDiem } of tieuDiemTheoFile) {
    if (!tieuDiem) continue;
    const khoa = stewardOf(relPath, structure, prefixes) || "_root";
    lay(khoa).tieuDiem.push(tieuDiem);
  }
  return [...vungs.values()].sort((a, b) => xepVung(a, b));
}

/* Vùng có `priority_rank` nhỏ nhất lên trước — thứ hạng do người khai trong STATUS, và đó
   là thứ tự Đức đã chốt. Vùng không khai thứ hạng xếp sau, rồi mới tới thứ tự chữ cái. */
function xepVung(a, b) {
  const hang = (v) => v.tieuDiem.reduce((m, t) => (t.rank != null && t.rank < m ? t.rank : m), Number.MAX_SAFE_INTEGER);
  const ha = hang(a);
  const hb = hang(b);
  if (ha !== hb) return ha - hb;
  return a.khoa < b.khoa ? -1 : a.khoa > b.khoa ? 1 : 0;
}

/** Khoá TRỐNG và CÓ việc (mục nợ HOẶC tiêu điểm STATUS). Mỗi dòng một luồng song song. */
export function songSongDuoc(vungs) {
  return vungs.filter((v) => !v.chu && (v.viec.length > 0 || v.tieuDiem.length > 0));
}

/** Khoá có chủ: việc trong đó KHÔNG được ai khác chạm, luật AGENTS mục 1. */
export function dangBiChan(vungs) {
  return vungs.filter((v) => v.chu);
}

/* --- In ra cho Đức đọc -------------------------------------------------------- */

const KE = (n) => "".padEnd(n, "─");

export function render({ vungs, ideas, now, dauNiemPhong, khaiSai = [] }) {
  const d = [];
  d.push("BẢN ĐỒ VIỆC — trạng thái sống, đọc lúc " + now.toISOString().slice(0, 16).replace("T", " "));
  d.push(KE(78));
  if (dauNiemPhong) {
    d.push("");
    d.push("⚠ " + dauNiemPhong);
  }
  if (khaiSai.length) {
    d.push("");
    d.push("⚠ " + khaiSai.length + " mục đã đóng nhưng KHÔNG gạch ngang: " + khaiSai.join(" · "));
    d.push("  Quy ước sổ nợ là `~~mã~~`. Không gạch thì bảng này phải đoán, và đoán sẽ sai.");
  }

  const song = songSongDuoc(vungs);
  d.push("");
  d.push("A · CHẠY SONG SONG ĐƯỢC NGAY — " + song.length + " luồng");
  d.push("  Mỗi dòng là một vùng TRỐNG chủ và CÓ việc mở. Hai dòng khác nhau không đụng nhau,");
  d.push("  nên giao cho hai phiên AI cùng lúc là an toàn.");
  if (!song.length) d.push("  (không có: mọi vùng có việc mở đều đang có chủ)");
  for (const v of song) {
    d.push("");
    d.push("  ▸ " + v.khoa + "  — " + v.viec.length + " việc mở" + nhanHang(v));
    for (const t of v.tieuDiem) d.push("      tiêu điểm (STATUS): " + catNgan(t.nextStep, 80));
    for (const viec of v.viec.slice(0, 6)) {
      d.push("      " + (viec.uuTien || "P?").padEnd(3) + " " + viec.ma + " · " + catNgan(viec.tieuDe, 84));
    }
    if (v.viec.length > 6) d.push("      … còn " + (v.viec.length - 6) + " việc nữa trong sổ");
  }

  const chan = dangBiChan(vungs);
  d.push("");
  d.push("B · ĐANG CÓ CHỦ — " + chan.length + " vùng, chỉ được ĐỌC");
  for (const v of chan) {
    const tuoi = v.gio == null ? "" : "  (" + ageLabel(v.gio) + (v.gio >= GIO_NHAC ? " ⚠" : "") + ")";
    d.push("  ▸ " + v.khoa + "  ← " + v.chu + tuoi + nhanHang(v));
    if (v.viecChu) d.push("      đang làm: " + catNgan(v.viecChu, 84));
    for (const t of v.tieuDiem) d.push("      tiêu điểm (STATUS): " + catNgan(t.nextStep, 80));
    if (v.viec.length) d.push("      " + v.viec.length + " việc mở trong vùng này — KHÔNG giao cho phiên khác");
  }
  d.push("");
  d.push("  ⚠ = giữ quá " + GIO_NHAC + "h. Cũ KHÔNG có nghĩa là chết. Đây là số liệu để HỎI,");
  d.push("    không phải giấy phép để giành. Nhắn phiên đang giữ trước — rẻ hơn giành.");

  const cho = locChoDuc(ideas);
  d.push("");
  d.push("C · ĐANG CHỜ ĐỨC — " + cho.length + " mục, không ai làm thay được");
  if (!cho.length) d.push("  (không có)");
  for (const y of cho) {
    d.push("  ▸ " + y.ma + " · " + catNgan(y.tieuDe, 76) + "   [bậc: " + (y.bac || "?") + "]");
    if (y.viecKe) d.push("      việc kế: " + catNgan(y.viecKe, 84));
  }

  const dangXay = ideas.filter((y) => /đang xây|dang xay/i.test(y.bac));
  d.push("");
  d.push("D · Ý TƯỞNG ĐANG XÂY — " + dangXay.length + " mục");
  if (!dangXay.length) d.push("  (không có)");
  for (const y of dangXay) {
    d.push("  ▸ " + y.ma + " · " + catNgan(y.tieuDe, 76) + (y.chu ? "   chủ: " + y.chu : "   ⚠ CHƯA khai chủ"));
    // `phạm vi` là văn xuôi người tự viết, nên máy KHÔNG suy được vùng từ nó. In nguyên văn
    // và gắn nhãn [DÒ]: dò theo tên trong repo này đã cho kết luận sai bốn lần trong một ngày.
    if (y.phamVi) d.push("      [DÒ] phạm vi đã khai: " + catNgan(y.phamVi, 80));
    else d.push("      ⚠ CHƯA khai phạm vi — luật IDEAS mục 4: đang xây thì PHẢI khai");
  }

  d.push("");
  d.push(KE(78));
  d.push("Việc kế: chọn MỘT dòng ở mục A, rồi nhận khoá bằng");
  d.push("  node scripts/claim.mjs --take <khoá> --as <tên-phiên> --task \"một câu\"");
  d.push("Mục C thì đừng tự quyết — hỏi Đức.");
  return d.join("\n");
}

/** Thứ hạng ưu tiên Đức đã khai trong STATUS. In ra để không ai phải mở file mới biết. */
function nhanHang(v) {
  const hangs = v.tieuDiem.map((t) => t.rank).filter((r) => r != null);
  return hangs.length ? "   [ưu tiên #" + Math.min(...hangs) + "]" : "";
}

function catNgan(s, n) {
  const t = String(s || "");
  return t.length <= n ? t : t.slice(0, n - 1) + "…";
}

/* --- Vỏ chạm đĩa, mỏng nhất có thể ------------------------------------------- */

/** Tìm mọi `<ten>` trong cây đơn vị. Dùng cho cả `BACKLOG.md` và `STATUS.md`. */
export function timTrongDonVi(root, units, ten, deps = { exists: fs.existsSync, readDir: fs.readdirSync }) {
  const goc = path.join(root, units.rootDir || "workers");
  if (!deps.exists(goc)) return [];
  const ra = [];
  const di = (dir, sau) => {
    for (const e of deps.readDir(dir, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const con = path.join(dir, e.name);
      const f = path.join(con, ten);
      if (deps.exists(f)) ra.push(f);
      if (sau > 0) di(con, sau - 1);
    }
  };
  di(goc, (units.depth || 2) + 1);
  return ra;
}

function main() {
  const structure = readStructureFromDisk(ROOT);
  const units = unitsFrom(structure);
  const prefixes = claimPrefixesFrom(structure);
  const claims = readClaims();

  const dau = fingerprintState(claims);
  const canhBao = dau && dau.ok === false
    ? "DAU_VO: bảng quyền đã bị sửa ngoài lệnh. Ai đang giữ gì ở mục B có thể không đúng. Xem AGENTS.md mục 6."
    : "";

  const rel = (abs) => path.relative(ROOT, abs).split(path.sep).join("/");
  const khaiSai = [];
  const viecTheoFile = timTrongDonVi(ROOT, units, "BACKLOG.md").map((abs) => {
    const doc = parseBacklog(fs.readFileSync(abs, "utf8"));
    khaiSai.push(...doc.khaiSai);
    return { relPath: rel(abs), viec: doc.mo };
  });

  // STATUS ở gốc repo cũng tính: đơn vị GỐC (`STATUS.md` cạnh `manifest.json` ngoài cùng)
  // không nằm trong cây `workers/`, và bỏ nó là bỏ đúng một đơn vị khỏi bản đồ.
  const statusFiles = timTrongDonVi(ROOT, units, "STATUS.md");
  const statusGoc = path.join(ROOT, "STATUS.md");
  if (fs.existsSync(statusGoc)) statusFiles.push(statusGoc);
  const tieuDiemTheoFile = statusFiles.map((abs) => ({
    relPath: rel(abs),
    tieuDiem: tieuDiemTuStatus(fs.readFileSync(abs, "utf8")),
  }));

  const ideasFile = path.join(ROOT, "IDEAS.md");
  const ideas = fs.existsSync(ideasFile) ? parseIdeas(fs.readFileSync(ideasFile, "utf8")) : [];

  const vungs = banDoVung({ viecTheoFile, tieuDiemTheoFile, claims, structure, prefixes });
  process.stdout.write(render({ vungs, ideas, now: new Date(), dauNiemPhong: canhBao, khaiSai }) + "\n");
}

const laFileChay = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (laFileChay) main();
