/* what-next.mjs — BẢN ĐỒ VIỆC cho vai điều phối.
 *
 * Trả lời đúng một câu mà không file nào khác trả lời được: **việc nào chạy song song được
 * ngay bây giờ**. Dữ liệu vốn có đủ, nhưng nằm rải ở nhiều chỗ (bảng quyền · các `BACKLOG.md`
 * · sổ ý tưởng · `STATUS.md` từng đơn vị) và không chỗ nào giao được với chỗ nào.
 *
 * Luật song song mà file này cưỡng chế, chỉ một câu: hai việc chạy song song được KHI VÀ
 * CHỈ KHI chúng thuộc hai khoá khác nhau và cả hai khoá đang trống. Không suy diễn gì thêm.
 *
 * VÙNG CỦA MỘT VIỆC LÀ SUY RA, KHÔNG KHAI TAY. Một mục nợ nằm trong
 * `<đơn-vị>/<phiên-bản>/BACKLOG.md` thì vùng của nó là vùng của đơn vị đó — `stewardOf()` đã
 * biết cách suy điều đó cho cổng kiểm và safe-push, nên ở đây dùng lại CÙNG MỘT HÀM. Bắt
 * người khai `vùng:` cho hàng chục mục nợ là thêm một trường có thể khai sai, để lấy về đúng
 * thông tin đã nằm trong đường dẫn.
 *
 * BA NGUỒN ĐỀU CÓ THỂ VẮNG, và vắng KHÔNG phải lỗi. Repo chưa có `BACKLOG.md`, chưa có
 * `IDEAS.md`, chưa có `STATUS.md`, hoặc không có đơn vị con nào (`units.root_dir: null`) thì
 * lệnh vẫn chạy và vẫn nói đúng — nó chỉ có ít việc để kể. Bản đầu đóng cứng thư mục đơn vị
 * là `workers/`, và ở repo không có thư mục đó thì mọi đơn vị biến mất im lặng.
 *
 * HAI QUY ƯỚC SỔ mà file này đọc (đều tuỳ chọn):
 *   · `BACKLOG.md`: mỗi mục là `### <MÃ>-<số> · <tiêu đề>`, ưu tiên khai bằng `## P<n>`,
 *     mục đã đóng thì gạch ngang `~~MÃ~~`.
 *   · `IDEAS.md`: mỗi ý tưởng là `## <MÃ>-<số> · <tiêu đề>`, kèm các dòng `- **bậc:** …`,
 *     `- **việc kế:** …`, `- **chủ:** …`, `- **phạm vi:** …`, `- **nhà:** …`.
 *
 * TÊN NGƯỜI CHỐT lấy từ `repo.owner` trong `.repo-structure.json`. Không khai thì mục "đang
 * chờ người chốt" nói THẲNG là không lọc được, chứ không im lặng in ra danh sách rỗng — rỗng
 * vì không có việc và rỗng vì không biết cách tìm là hai chuyện khác nhau.
 *
 * CHỈ ĐỌC. File này không ghi gì, không commit gì, không đòi khoá nào.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseStatus } from "./build-dashboard.mjs";
import * as claimMod from "./claim.mjs";
import { claimPrefixesFrom, frozenFrom, readStructureFromDisk, stewardOf, unitsFrom } from "./repo-structure.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* --- Đọc dữ liệu: hàm thuần, không chạm đĩa ----------------------------------
   Thuần để test ghim dựng được ca hỏng bằng chuỗi, không phải bằng repo thật. Phép kiểm nào
   dựa vào repo thật thì chỉ chứng minh *hôm nay* đang khớp — vô nghĩa ngày mai. */

/* Tiền tố được phép chứa SỐ, nhưng phải BẮT ĐẦU bằng chữ cái: `[A-Z][A-Z0-9]*`.
   Vấp thật 05/09 lượt migrate `n8n-orchestrator`: mã tự nhiên là `N8N-1`, bản cũ đòi tiền tố
   TOÀN chữ cái nên mục biến mất khỏi bảng mà không báo gì, phải lách sang `CP-`. Repo nào tên
   chứa số — n8n · s3 · web3 · i18n — đều vấp.
   Bắt buộc chữ cái ở đầu là có lý do: cho phép số ở đầu thì `### 2026-09 · ...` (một mốc ngày
   trong sổ) sẽ bị đọc thành mã việc `2026-09`. */
const MA_VIEC = /^###\s+~*\s*([A-Z][A-Z0-9]*-\d+)~*\s*[·:]?\s*(.*)$/;
/* Mọi dòng `###` trong sổ nợ ĐỀU phải là một mục việc — quy ước sổ nói thế, và đo ở repo nhà
   06/09: 24/24 dòng `###` là mục việc, không có ngoại lệ nào. Nên dòng `###` mà không đọc ra
   mã việc là SAI QUY ƯỚC, và phải bị NÊU TÊN. Đây mới là gốc bệnh của KHUNG-18: không phải
   regex hẹp, mà là bỏ qua IM LẶNG — hình dạng lạ lần sau vẫn sẽ biến mất nếu chỉ nới regex. */
const DANG_MUC = /^###\s+(.+)$/;
const UU_TIEN = /^##\s+(P[1-9])\b/;

/* HAI cách nhận một mục đã đóng, và chúng KHÔNG ngang hàng.
   Quy ước sổ là gạch ngang `~~`. Nhưng đo thật ở repo đã dùng thử gói này: ĐÚNG MỘT mục chỉ
   ghi `**ĐÓNG 28/08**` mà không gạch, nên nếu chỉ đọc `~~` thì nó bị đếm là việc mở, và bảng
   sẽ giao cho người khác một việc đã xong.
   Nên: `~~` là chính, từ khoá in HOA là lưới hứng, và mục rơi vào lưới thì BỊ NÊU TÊN (mục
   `khaiSai`) thay vì âm thầm bỏ qua — cách viết thứ năm sẽ xuất hiện, và lúc đó phải có người
   thấy. In hoa toàn phần là cố ý: `đóng phiên` trong văn xuôi không trúng lưới. */
const GACH = /^###\s+~~/;

/* CO "CHO NGUOI CHOT" trong mot muc no. In HOA va co dau hai cham la co y: cau van xuoi
   "viec nay cho nguoi chot quyet" KHONG trung, chi dong khai moi trung.
   VI SAO CAN: truoc 05/09 muc C cua ban do CHI doc so y tuong (IDEAS.md). Repo khong co so do
   thi muc C in ra "0 muc, khong ai lam thay duoc" — tuc KHANG DINH da kiem va khong co gi —
   trong khi so no dang co muc can nguoi chot. Nguoi chot doc bang roi tin minh khong phai quyet
   gi. Do that o repo nha: 2 muc cho chot, bang bao 0. */
const CHO_CHOT = /\*\*CHỜ NGƯỜI CHỐT:?\*\*/;
// KHÔNG dùng `\b` ở đây: `\b` dựa trên `\w` = [A-Za-z0-9_], nên `Đ` là non-word và
// `\bĐÓNG` không bao giờ khớp. Bản đầu viết `\b(ĐÃ ĐÓNG|ĐÓNG|…)\b` và một mục ĐÃ ĐÓNG
// THOÁT LƯỚI — bảng vẫn đem nó đi giao cho phiên khác. Lỗi im lặng, không báo gì.
const TU_DONG = /(ĐÃ ĐÓNG|ĐÓNG|ĐÃ XONG|XONG|ĐÃ VÁ)/;

/** Mục nợ MỞ trong một `BACKLOG.md`. Mục đã đóng bị bỏ — sổ giữ chúng để tra lịch sử.
    Trả `{ mo, khaiSai, khongHieu }`.
    `khaiSai`   = mục đóng bằng từ khoá mà không gạch, sai quy ước sổ.
    `khongHieu` = dòng `###` mà KHÔNG đọc ra mã việc — bản cũ nuốt im, giờ bị nêu tên. */
export function parseBacklog(text) {
  const ra = [];
  const khaiSai = [];
  const khongHieu = [];
  let uuTien = "P?";
  let hienTai = null;
  for (const dong of String(text).split(/\r?\n/)) {
    const moc = UU_TIEN.exec(dong);
    if (moc) { uuTien = moc[1]; continue; }
    const viec = MA_VIEC.exec(dong);
    if (!viec) {
      // Dòng `###` mà không ra mã việc: KHÔNG được lặng lẽ đi tiếp. Nó trông như một mục
      // việc với mắt người đọc, nên nếu bảng bỏ qua thì người viết không bao giờ biết.
      const dangMuc = DANG_MUC.exec(dong);
      if (dangMuc) { hienTai = null; khongHieu.push(lamSach(dangMuc[1])); continue; }
      // CO CHO NGUOI CHOT — khai TUONG MINH trong than muc, khong do ten trong van xuoi.
      // Do ten la phep do bang chuoi: doi cach xung ho mot chu la muc bien mat, va khong ai biet.
      // Co thi hoac co hoac khong.
      if (hienTai && CHO_CHOT.test(dong)) hienTai.choChot = true;
      continue;
    }
    hienTai = null;
    if (GACH.test(dong)) continue;
    if (TU_DONG.test(dong)) { khaiSai.push(viec[1]); continue; }
    hienTai = { ma: viec[1], tieuDe: lamSach(viec[2]), uuTien, choChot: false };
    ra.push(hienTai);
  }
  return { mo: ra, khaiSai, khongHieu };
}


const TRUONG = (ten) => new RegExp("^\\s*[-*]\\s+\\*\\*" + ten + ":?\\*\\*:?\\s*(.*)$");
// KHÔNG đóng cứng tiền tố mã: repo nào tự chọn chữ đầu của mã ý tưởng.
const MA_Y = /^##\s+([A-Z]+-\d+)\s*[·:]?\s*(.*)$/;
const BAC_NGHI = /^(nghỉ|nghi)$/i;

/** Ý tưởng trong `IDEAS.md`. Bậc `nghỉ` bị bỏ: sổ giữ chúng để không ai đề xuất lại.
    Ý tưởng đã có `nhà:` cũng bỏ — nó đã có chỗ ở thật, còn hiện ở đây là đếm hai lần một việc. */
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

/* Chờ người chốt = trường `việc kế` nhắc tên người chốt. Ba lựa chọn có chủ đích ở đây.
   MỘT, không liệt kê động từ: bản đầu dò `cần <tên>|chờ <tên>|<tên> chốt|<tên> duyệt` và BỎ
   SÓT một mục vì nó viết "<tên> mô tả rõ hơn" — liệt kê động từ thì luôn thiếu động từ thứ năm.
   HAI, chỉ quét `việc kế`, KHÔNG quét tiêu đề: một mục tên là "Trường <tên> cần làm…" nhưng
   bước kế của nó là việc của AI, nên quét tiêu đề sẽ đẩy nó vào danh sách chờ một cách sai.
   BA, tên lấy từ cấu hình, không đóng cứng: bộ khung này không biết chủ dự án của bạn tên gì.

   Và KHÔNG dùng `\b` — cùng cái bẫy đã cắn ở `TU_DONG` bên trên, và nó cắn ĐÚNG HAI LẦN trong
   một buổi: `\b` dựa trên [A-Za-z0-9_], nên với chữ tiếng Việt nó không tạo biên. Ở repo mà
   mọi chữ đều tiếng Việt, `\b` là bẫy mặc định — đừng gõ nó theo phản xạ. */
export function locChoNguoiChot(muc, tenNguoiChot) {
  const ten = String(tenNguoiChot || "").trim();
  if (!ten) return null;                    // null = KHÔNG LỌC ĐƯỢC, khác hẳn [] = không có mục nào
  const escaped = ten.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const timTen = new RegExp(escaped, "i");
  return muc.filter((m) => timTen.test(String(m.viecKe || "")));
}

function lamSach(s) {
  return String(s || "").replace(/~~/g, "").replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
}

/* SỔ NỢ KHÔNG PHẢI NGUỒN DUY NHẤT, và bỏ sót điều đó là một lỗi đã đo được.
   Một đơn vị có **0 mục nợ** trong `BACKLOG.md` trong khi việc ưu tiên số 1 của cả repo chỉ
   nằm ở `next_step` của `STATUS.md`. Bản đồ chỉ đọc sổ nợ thì đơn vị đó trông như rảnh, và tệ
   hơn: nó bị lọc khỏi mục "song song được" vì đếm 0 việc.
   Nên đọc thêm `next_step`, gắn nhãn nguồn, và KHÔNG cộng vào số mục nợ — đó là hai loại
   dữ liệu khác nhau, gộp số lại là đếm một việc hai lần. */
export function tieuDiemTuStatus(text) {
  const { frontmatter } = parseStatus(text);
  const nextStep = String(frontmatter.next_step || "").trim();
  if (!nextStep) return null;
  const rank = Number.parseInt(frontmatter.priority_rank, 10);
  return { nextStep, rank: Number.isFinite(rank) ? rank : null, lifecycle: String(frontmatter.lifecycle || "") };
}

/* --- Tuổi một lượt giữ khoá -------------------------------------------------
   Ba thứ này ĐÃ DỜI sang `claim.mjs` ở bản 1.3.20 — file GHI `claimed_at` là file duy nhất
   biết con số ấy nghĩa là gì, và `claim.mjs --list` nay cũng in tuổi. Xuất lại ở đây để mọi
   chỗ gọi cũ không phải đổi; hai bản sao của cùng một hàm là hai bản sẽ trôi khỏi nhau. */
export const { GIO_NHAC, ageHours, ageLabel, dangNhac, mocCoGio } = claimMod;

/* --- Ghép việc vào khoá, rồi cắt theo trạng thái khoá ------------------------- */

/** Trung tâm của file: nhóm việc theo khoá, đánh dấu khoá nào trống.
    `stewardOf()` KHÔNG BAO GIỜ trả rỗng — nó tự lùi về `_root` bên trong. Bản đầu viết
    `stewardOf(...) || "_root"`, tức đóng cứng một tên khoá vào chỗ không bao giờ chạy tới:
    ở repo khai vùng khác, cái tên đó trỏ vào hư không mà chẳng ai phát hiện. Đã xoá. */
export function banDoVung({ viecTheoFile, tieuDiemTheoFile = [], claims, structure, prefixes, now = new Date(), frozen = [] }) {
  /* GÓI ĐÃ ĐÓNG BĂNG KHÔNG PHẢI VIỆC ĐANG CHỜ AI. Cờ khai ở khối `frozen` của
     `.repo-structure.json`. Trước 2026-09-08 bản đồ này KHÔNG đọc cờ đó trong khi cổng đóng
     phiên có đọc — nên hai công cụ của cùng một repo nói ngược nhau, và cái nói sai lại chính
     là cái AI đọc để CHỌN việc: nó xếp một gói đã đóng băng vào "chạy song song được ngay,
     ưu tiên #2, 22 việc mở". Đo được ngày 08/09 ở repo tiêu thụ. */
  const laDongBang = (khoa) => frozen.some((f) => khoa === f || khoa.startsWith(`${f}/`));
  const vungs = new Map();
  const bang = (claims && claims.claims) || {};
  const lay = (khoa) => {
    if (!vungs.has(khoa)) {
      const co = Object.prototype.hasOwnProperty.call(bang, khoa);
      const o = co ? bang[khoa] : null;
      const chu = o && o.owner ? o.owner : null;
      vungs.set(khoa, {
        khoa,
        chu,
        dongBang: laDongBang(khoa),
        // KHOA KHONG CO TRONG BANG QUYEN khac han KHOA CO MA TRONG CHU. Ca thu nhat nghia la
        // KHONG AI DANG CANH vung do — bao no la "trong chu, cu lam" la moi nguoi vao ghi cung
        // luc ma khong gi chan. Ca nay lo ra o repo khai ten vung khac han bo khung.
        khongCoTrongBang: !co,
        gio: chu && o.claimed_at ? ageHours(o.claimed_at, now) : null,
        // Giữ luôn mốc thô: chỉ nhìn số giờ thì không biết nó đo được tới đâu — mốc chỉ có ngày
        // và mốc có giờ cho ra cùng một con số, nhưng chỉ một trong hai đáng tin. `mocCoGio`.
        tu: chu ? (o.claimed_at || null) : null,
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
    lay(stewardOf(relPath, structure, prefixes)).viec.push(...viec);
  }
  for (const { relPath, tieuDiem } of tieuDiemTheoFile) {
    if (!tieuDiem) continue;
    lay(stewardOf(relPath, structure, prefixes)).tieuDiem.push(tieuDiem);
  }
  return [...vungs.values()].sort((a, b) => xepVung(a, b));
}

/* Vùng có `priority_rank` nhỏ nhất lên trước — thứ hạng do người khai trong STATUS, và đó
   là thứ tự chủ dự án đã chốt. Vùng không khai thứ hạng xếp sau, rồi mới tới thứ tự chữ cái. */
function xepVung(a, b) {
  const hang = (v) => v.tieuDiem.reduce((m, t) => (t.rank != null && t.rank < m ? t.rank : m), Number.MAX_SAFE_INTEGER);
  const ha = hang(a);
  const hb = hang(b);
  if (ha !== hb) return ha - hb;
  return a.khoa < b.khoa ? -1 : a.khoa > b.khoa ? 1 : 0;
}

/** Khoá TRỐNG và CÓ việc (mục nợ HOẶC tiêu điểm STATUS). Mỗi dòng một luồng song song. */
export function songSongDuoc(vungs) {
  return vungs.filter((v) => !v.chu && !v.dongBang && !v.khongCoTrongBang
    && (v.viec.length > 0 || v.tieuDiem.length > 0));
}

/** Vùng đã đóng băng: chỉ ĐỌC. Tách ra để không mất thông tin — ẩn hẳn thì người đọc tưởng
    gói đó biến mất, mà nợ của nó vẫn còn nằm trong sổ. */
export function daDongBang(vungs) {
  return vungs.filter((v) => v.dongBang);
}

/** Khoá có chủ: việc trong đó KHÔNG được ai khác chạm (AGENTS.md mục 1). */
export function dangBiChan(vungs) {
  return vungs.filter((v) => v.chu);
}

/* --- In ra cho người đọc ------------------------------------------------------ */

const KE = (n) => "".padEnd(n, "─");

export function render({ vungs, ideas, now, dauNiemPhong, khaiSai = [], khongHieu = [], tenNguoiChot = "", noChoChot = [] }) {
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
  if (khongHieu.length) {
    d.push("");
    d.push("⚠ " + khongHieu.length + " dòng `###` KHÔNG đọc ra mã việc — các mục này KHÔNG có trong bảng dưới:");
    for (const dong of khongHieu) d.push("  · " + dong);
    d.push("  Mã việc phải là `### <CHỮ><chữ-số>-<số> · <tiêu đề>`, ví dụ `KHUNG-7`, `N8N-1`.");
    d.push("  Tiền tố BẮT ĐẦU bằng chữ cái, sau đó được lẫn số. Bắt đầu bằng số thì không nhận.");
  }

  const laVungLa = vungs.filter((v) => v.khongCoTrongBang && (v.viec.length || v.tieuDiem.length));
  if (laVungLa.length) {
    d.push("");
    d.push("⚠ " + laVungLa.length + " vùng có việc mở mà bảng quyền KHÔNG có khoá đó: "
      + laVungLa.map((v) => "`" + v.khoa + "`").join(" · "));
    d.push("  Không phải \"trống chủ\" — là KHÔNG AI ĐANG CANH. Khai khoá đó vào");
    d.push("  `.agents/claims.json`, hoặc khai `steward` cho thư mục đó trong `.repo-structure.json`.");
  }

  const song = songSongDuoc(vungs);
  d.push("");
  d.push("A · CHẠY SONG SONG ĐƯỢC NGAY — " + song.length + " luồng");
  d.push("  Mỗi dòng là một vùng TRỐNG chủ và CÓ việc mở. Hai dòng khác nhau không đụng nhau,");
  d.push("  nên giao cho hai phiên AI cùng lúc là an toàn.");
  if (!song.length) d.push("  (không có: mọi vùng có việc mở đều đang có chủ, hoặc chưa có việc nào được khai)");
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
  if (!chan.length) d.push("  (không có: mọi vùng đang trống chủ)");
  for (const v of chan) {
    const cg = mocCoGio(v.tu);
    const tuoi = v.gio == null ? "" : "  (" + ageLabel(v.gio, cg) + (dangNhac(v.gio, cg) ? " ⚠" : "") + ")";
    d.push("  ▸ " + v.khoa + "  ← " + v.chu + tuoi + nhanHang(v));
    if (v.viecChu) d.push("      đang làm: " + catNgan(v.viecChu, 84));
    for (const t of v.tieuDiem) d.push("      tiêu điểm (STATUS): " + catNgan(t.nextStep, 80));
    if (v.viec.length) d.push("      " + v.viec.length + " việc mở trong vùng này — KHÔNG giao cho phiên khác");
  }
  d.push("");
  d.push("  ⚠ = giữ quá " + GIO_NHAC + "h. Cũ KHÔNG có nghĩa là chết. Đây là số liệu để HỎI,");
  d.push("    không phải giấy phép để giành. Nhắn phiên đang giữ trước — rẻ hơn giành.");

  /* ĐÓNG BĂNG — in RA, không ẩn đi. Ẩn hẳn thì người đọc tưởng gói đó biến mất, mà nợ của nó
     vẫn nằm trong sổ và vẫn đếm vào mọi con số khác. Cái phải sửa là nó KHÔNG được nằm ở mục A
     nữa, chứ không phải nó phải vô hình. */
  const bang = daDongBang(vungs);
  if (bang.length) {
    d.push("");
    d.push("B2 · ĐÃ ĐÓNG BĂNG — " + bang.length + " vùng, chỉ được ĐỌC dù KHÔNG có chủ");
    for (const v of bang) {
      const n = v.viec.length;
      d.push("  ▸ " + v.khoa + (n ? "  — " + n + " việc mở, KHÔNG làm" : "  — không việc mở"));
    }
    d.push("    Khai ở khối `frozen` của `.repo-structure.json`. Trống chủ KHÔNG có nghĩa là mời làm:");
    d.push("    chủ dự án đã chốt dừng các gói này. Muốn mở lại thì HỎI, đừng tự nhận khoá.");
  }

  /* MỤC C ĐỌC HAI NGUỒN, và nói rõ nguồn nào kiểm được nguồn nào không.
     Trước 05/09 nó chỉ đọc sổ ý tưởng. Repo không có `IDEAS.md` thì nó in "0 mục, không ai làm
     thay được" — tức KHẲNG ĐỊNH đã kiểm — trong khi sổ nợ đang có mục chờ chốt. Đo thật ở repo
     nhà: 2 mục chờ chốt, bảng báo 0. Người chốt đọc bảng rồi tin mình không phải quyết gì. */
  const cho = locChoNguoiChot(ideas, tenNguoiChot);
  const tuSoNo = noChoChot.filter((m) => m.choChot);
  d.push("");
  // KHI MOT NGUON KHONG LOC DUOC, KHONG DUOC IN MOT CON SO TONG. Con so tong ham y "da kiem
  // het"; o day moi kiem duoc mot nua. In so kem canh bao van khien nguoi doc nho con so.
  d.push(cho === null
    ? "C · ĐANG CHỜ NGƯỜI CHỐT — KHÔNG LỌC ĐƯỢC TRỌN VẸN (sổ nợ: " + tuSoNo.length + " · sổ ý tưởng: chưa lọc được)"
    : "C · ĐANG CHỜ NGƯỜI CHỐT — " + (tuSoNo.length + cho.length) + " mục, không ai làm thay được");
  for (const m of tuSoNo) {
    d.push("  ▸ " + m.ma + " · " + catNgan(m.tieuDe, 76) + "   [sổ nợ, " + m.uuTien + "]");
  }
  if (cho === null) {
    d.push("  ⚠ Sổ Ý TƯỞNG: KHÔNG LỌC ĐƯỢC — chưa khai `repo.owner` trong `.repo-structure.json`.");
    d.push("    Đây là \"chưa kiểm\", không phải \"không có mục nào chờ\".");
  } else {
    for (const y of cho) {
      d.push("  ▸ " + y.ma + " · " + catNgan(y.tieuDe, 76) + "   [ý tưởng, bậc: " + (y.bac || "?") + "]");
      if (y.viecKe) d.push("      việc kế: " + catNgan(y.viecKe, 84));
    }
  }
  if (!tuSoNo.length && cho && !cho.length) d.push("  (không có)");

  const dangXay = ideas.filter((y) => /đang xây|dang xay/i.test(y.bac));
  d.push("");
  d.push("D · Ý TƯỞNG ĐANG XÂY — " + dangXay.length + " mục");
  if (!dangXay.length) d.push("  (không có)");
  for (const y of dangXay) {
    d.push("  ▸ " + y.ma + " · " + catNgan(y.tieuDe, 76) + (y.chu ? "   chủ: " + y.chu : "   ⚠ CHƯA khai chủ"));
    // `phạm vi` là văn xuôi người tự viết, nên máy KHÔNG suy được vùng từ nó. In nguyên văn
    // và gắn nhãn [DÒ]: dò theo tên đã cho kết luận sai bốn lần trong một ngày.
    if (y.phamVi) d.push("      [DÒ] phạm vi đã khai: " + catNgan(y.phamVi, 80));
    else d.push("      ⚠ CHƯA khai phạm vi — đang xây thì PHẢI khai, nếu không hai phiên sẽ giẫm chân");
  }

  d.push("");
  d.push(KE(78));
  d.push("Việc kế: chọn MỘT dòng ở mục A, rồi nhận khoá bằng");
  d.push("  node scripts/claim.mjs --take <khoá> --as <tên-phiên> --task \"một câu\"");
  d.push("Mục C thì đừng tự quyết — hỏi chủ dự án.");
  return d.join("\n");
}

/** Thứ hạng ưu tiên đã khai trong STATUS. In ra để không ai phải mở file mới biết. */
function nhanHang(v) {
  const hangs = v.tieuDiem.map((t) => t.rank).filter((r) => r != null);
  return hangs.length ? "   [ưu tiên #" + Math.min(...hangs) + "]" : "";
}

function catNgan(s, n) {
  const t = String(s || "");
  return t.length <= n ? t : t.slice(0, n - 1) + "…";
}

/* --- Vỏ chạm đĩa, mỏng nhất có thể ------------------------------------------- */

/** Tìm mọi `<ten>` trong cây đơn vị. Dùng cho cả `BACKLOG.md` và `STATUS.md`.
    `units.rootDir === null` nghĩa là repo KHÔNG có đơn vị con — trả rỗng, đừng đi mò một
    thư mục mặc định. Bản đầu viết `units.rootDir || "workers"`, nên ở repo không có
    `workers/` nó lặng lẽ quét một thư mục không tồn tại và trả rỗng vì lý do SAI. */
export function timTrongDonVi(root, units, ten, deps = { exists: fs.existsSync, readDir: fs.readdirSync }) {
  if (!units || !units.rootDir) return [];
  const goc = path.join(root, units.rootDir);
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

/* BA CHỖ một sổ có thể nằm, và repo nào cũng chỉ dùng một hoặc hai trong ba.
   Bản đầu chỉ tìm ở cây đơn vị con — nên ở repo khai vùng theo THƯ MỤC (`luat/`, `may/`,
   `ho-so/`) mà không có đơn vị con nào, mọi sổ nợ trở nên vô hình và bản đồ luôn nói "không
   có việc nào". Đo thật trên fixture repo hình dạng khác.
   Thứ tự có ý nghĩa: cây đơn vị → thư mục vùng đã khai → gốc repo. Trùng thì lấy một lần. */
export function timSo(root, units, structure, ten, deps = { exists: fs.existsSync, readDir: fs.readdirSync }) {
  const ra = new Set(timTrongDonVi(root, units, ten, deps));
  const areas = (structure && structure.areas) || {};
  for (const key of Object.keys(areas)) {
    if (key.startsWith("_") || !key.endsWith("/")) continue;
    const f = path.join(root, key, ten);
    if (deps.exists(f)) ra.add(f);
  }
  const goc = path.join(root, ten);
  if (deps.exists(goc)) ra.add(goc);
  return [...ra];
}

/** Dấu niêm phong bảng quyền — CHỈ KIỂM NẾU BỘ KHUNG CỦA BẠN CÓ.
    Không phải mọi bản `claim.mjs` đều có cơ chế niêm phong. Nhập tường minh thì file này
    không chạy nổi ở nơi thiếu nó, mà thiếu niêm phong không phải lỗi — nó là một bản cũ hơn.
    Nên: có thì kiểm, không có thì im (và KHÔNG báo là "đã kiểm, sạch"). */
export function canhBaoNiemPhong(claims, mod = claimMod) {
  if (typeof mod.fingerprintState !== "function") return "";
  let dau = null;
  try { dau = mod.fingerprintState(claims); } catch { return ""; }
  if (!dau || dau.ok !== false) return "";
  return "DAU_VO: bảng quyền đã bị sửa ngoài lệnh `claim.mjs`. Ai đang giữ gì ở mục B có thể "
    + "không đúng. Xem `git diff .agents/claims.json`, rồi HỎI CHỦ DỰ ÁN.";
}

/** Tên người chốt, khai ở `repo.owner`. Không khai thì trả rỗng và mục C nói thẳng. */
export function tenNguoiChotTu(structure) {
  const v = structure && structure.repo && structure.repo.owner;
  return typeof v === "string" ? v.trim() : "";
}

function main() {
  const structure = readStructureFromDisk(ROOT);
  const units = unitsFrom(structure);
  const prefixes = claimPrefixesFrom(structure);

  let claims = { claims: {} };
  let loiClaims = "";
  try { claims = claimMod.readClaims(); }
  catch (e) { loiClaims = "Không đọc được bảng quyền `.agents/claims.json`: " + String(e.message || e); }

  const canhBao = loiClaims || canhBaoNiemPhong(claims);

  const rel = (abs) => path.relative(ROOT, abs).split(path.sep).join("/");
  const khaiSai = [];
  const khongHieu = [];

  const viecTheoFile = timSo(ROOT, units, structure, "BACKLOG.md").map((abs) => {
    const doc = parseBacklog(fs.readFileSync(abs, "utf8"));
    khaiSai.push(...doc.khaiSai);
    // Kèm tên file: repo nhiều đơn vị con thì "dòng này ở sổ nào" mới là thông tin dùng được.
    for (const d of doc.khongHieu) khongHieu.push(rel(abs) + " → " + d);
    return { relPath: rel(abs), viec: doc.mo };
  });

  const tieuDiemTheoFile = timSo(ROOT, units, structure, "STATUS.md").map((abs) => ({
    relPath: rel(abs),
    tieuDiem: tieuDiemTuStatus(fs.readFileSync(abs, "utf8")),
  }));

  const ideasFile = path.join(ROOT, "IDEAS.md");
  const ideas = fs.existsSync(ideasFile) ? parseIdeas(fs.readFileSync(ideasFile, "utf8")) : [];

  const vungs = banDoVung({ viecTheoFile, tieuDiemTheoFile, claims, structure, prefixes, frozen: frozenFrom(structure) });
  const noChoChot = viecTheoFile.flatMap((x) => x.viec);
  process.stdout.write(render({
    vungs, ideas, now: new Date(), dauNiemPhong: canhBao, khaiSai, khongHieu,
    tenNguoiChot: tenNguoiChotTu(structure), noChoChot,
  }) + "\n");
}

const laFileChay = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (laFileChay) main();
