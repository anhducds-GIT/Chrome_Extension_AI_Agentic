#!/usr/bin/env node
/* BỘ BIÊN DỊCH LUẬT (Rule Compiler) — Đức chốt 2026-09-09.
 *
 * VẤN ĐỀ NÓ CHỮA: luật chỉ có một chiều là TĂNG. Mỗi luật hợp lý lúc thêm vào; cộng lại thì
 * mâu thuẫn nhau, và phiên sau bốc trúng câu nào thì theo câu đó. Đo được ở chính repo này
 * 09/09: mục 1 của hiến pháp có BA mốc trả khoá khác nhau cùng lúc, và một phiên đã đọc đúng
 * một trong ba rồi làm ngược hai cái kia.
 *
 * KIẾN TRÚC — ba tầng, đừng lẫn:
 *
 *     SỔ CÁI (ledger)      `docs/adr/` · `decisions.md` · `docs/archive/`
 *       CHỈ THÊM, không sửa. Đây là LỊCH SỬ: vì sao ta tới được luật hôm nay.
 *            ↓
 *     BỘ BIÊN DỊCH        file này
 *       Chuẩn hoá → gộp trùng → bao hàm → xử xung đột → cắt → biên dịch.
 *            ↓
 *     LUẬT HIỆU LỰC       thứ một phiên AI thật sự phải đọc
 *
 * BẤT BIẾN QUAN TRỌNG NHẤT, và nó là lý do file này tồn tại: **AI không tự ý sửa hay xoá luật.**
 * AI được ĐỀ XUẤT (`--de-xuat`); chỉ khai báo tường minh trong frontmatter mới làm đổi bộ luật
 * hiệu lực. Máy quyết định theo khai báo, không theo suy diễn — nên hai lượt chạy trên cùng một
 * HEAD luôn ra cùng một kết quả.
 *
 * VÌ SAO KHÔNG GỘP FILE ADR LẠI CHO GỌN: luật B12 khai ADR đã `Accepted` là BẤT BIẾN — sửa phần
 * thân là đỏ cổng. Và đúng như vậy: ADR là biên bản, không phải bản nháp. Nên ta không gộp FILE,
 * ta gộp CÂU TRẢ LỜI: mỗi ADR khai `chu_de`, một chủ đề có một `dau_moi`, và bộ biên dịch in ra
 * mỗi chủ đề MỘT khối. Muốn biết luật khoá thì mở đúng một khối, không phải đọc bốn file rồi
 * tự đoán cái nào thắng. B12 cho phép sửa frontmatter — đó chính là cửa hợp lệ để làm việc này.
 *
 * MÃ THOÁT, cố ý không gộp:
 *   0  bộ luật biên dịch được, không vi phạm
 *   2  CÓ VI PHẠM — thiếu khai báo, trỏ vào hư không, hoặc xung đột chưa ai xử
 *   3  không đọc được (nói KHÔNG BIẾT, không nói ĐẠT)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readStructureFromDisk } from "./repo-structure.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NL = String.fromCharCode(10);
const ADR_DIR = "docs/adr";
const SO_QUYET_DINH = "decisions.md";

export const EXIT = Object.freeze({ OK: 0, VI_PHAM: 2, KHONG_DOC_DUOC: 3 });

/* --- ⑴ CHUẨN HOÁ ---------------------------------------------------------- */

/* Frontmatter YAML tối giản, cố ý KHÔNG nạp thư viện: ta chỉ cần `khoá: giá trị` một dòng.
   Gặp cú pháp YAML thật (danh sách, lồng nhau) thì trả về thô để bên gọi tự xử — im lặng đoán
   là cách một bộ đọc bắt đầu nói dối. */
export function docFrontmatter(text) {
  const dong = String(text).replace(/\r\n?/g, NL).split(NL);
  if (dong[0] !== "---") return { fm: {}, coFm: false };
  const het = dong.indexOf("---", 1);
  if (het < 0) return { fm: {}, coFm: false };
  const fm = {};
  for (const d of dong.slice(1, het)) {
    const m = d.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
    if (m) fm[m[1]] = m[2].trim();
  }
  return { fm, coFm: true };
}

/* Mã ADR: lấy từ frontmatter `adr:`, KHÔNG lấy từ tên file. Tên file đổi được, mã thì không —
   và B12 dùng `--follow` chính vì đổi tên là chuyện có thật. */
export function chuanHoaAdr(tenFile, text) {
  const { fm, coFm } = docFrontmatter(text);
  const ma = String(fm.adr ?? "").trim();
  const quanHe = [];
  for (const khoa of ["sua", "thay_the", "superseded_by", "bo_sung", "thuoc"]) {
    const v = String(fm[khoa] ?? "").trim();
    if (v) for (const x of v.split(/[,\s]+/).filter(Boolean)) quanHe.push({ kieu: khoa, toi: x });
  }
  return {
    file: tenFile,
    coFm,
    ma,
    chuDe: String(fm.chu_de ?? "").trim(),
    dauMoi: String(fm.dau_moi ?? "").trim().toLowerCase() === "true",
    trangThai: String(fm.status ?? "").trim(),
    ngay: String(fm.date ?? "").trim(),
    quanHe,
    tieuDe: (String(text).match(/^#\s+(.+)$/m) || [])[1] || tenFile
  };
}

const CON_HIEU_LUC = (a) => !/^superseded$/i.test(a.trangThai);

/* --- ⑵→⑸ SOÁT: trùng · bao hàm · xung đột · cắt --------------------------- */

/* Trả về danh sách vi phạm. RỖNG = biên dịch được.
   Mỗi vi phạm có `ma` (tiếng Anh, để máy đọc) và `vi` (tiếng Việt, để người đọc) — đúng luật
   vàng số 5 của repo. */
export function soatLuat(dsAdr, chuDeKhai) {
  const viPham = [];
  const coMa = new Set(dsAdr.map((a) => a.ma).filter(Boolean));

  for (const a of dsAdr) {
    if (!a.coFm || !a.ma) {
      viPham.push({ ma: "ADR_KHONG_KHAI", vi: `${a.file}: không đọc được frontmatter hoặc thiếu \`adr:\`` });
      continue;
    }
    // ⑴ Chuẩn hoá đòi MỌI luật phải có chỗ đứng. Đây là cái răng chống phình: thêm một ADR mà
    //    không trả lời nổi "nó thuộc nhóm nào" thì luật đó chưa đủ rõ để thêm.
    if (!a.chuDe) {
      viPham.push({ ma: "THIEU_CHU_DE", vi: `ADR-${a.ma}: thiếu \`chu_de:\` — mỗi luật phải có ĐÚNG MỘT nhà` });
    } else if (chuDeKhai && !chuDeKhai.has(a.chuDe)) {
      // Chủ đề tự do thì một lỗi gõ đẻ ra một nhóm mới trong im lặng.
      viPham.push({
        ma: "CHU_DE_LA",
        vi: `ADR-${a.ma}: chủ đề \`${a.chuDe}\` chưa khai ở \`.repo-structure.json\` (\`luat.chu_de\`). Khai trước, hoặc sửa lỗi gõ`
      });
    }
    // ⑶ Bao hàm: quan hệ phải trỏ tới ADR CÓ THẬT. Trỏ vào hư không là bộ luật tưởng mình có
    //    thứ tự mà thật ra không có.
    for (const q of a.quanHe) {
      if (!coMa.has(q.toi)) {
        viPham.push({ ma: "QUAN_HE_TREO", vi: `ADR-${a.ma}: khai \`${q.kieu}: ${q.toi}\` mà không có ADR nào mang mã đó` });
      } else if (q.toi === a.ma) {
        viPham.push({ ma: "QUAN_HE_VONG", vi: `ADR-${a.ma}: khai quan hệ trỏ vào CHÍNH NÓ` });
      }
    }
  }

  // ⑷ Xung đột: một chủ đề phải có ĐÚNG MỘT đầu mối. Không có đầu mối thì "mở đúng một file"
  //    là câu nói suông; hai đầu mối thì lại quay về đúng bệnh đọc-rồi-tự-đoán.
  const theoChuDe = new Map();
  for (const a of dsAdr.filter((x) => x.chuDe && CON_HIEU_LUC(x))) {
    if (!theoChuDe.has(a.chuDe)) theoChuDe.set(a.chuDe, []);
    theoChuDe.get(a.chuDe).push(a);
  }
  for (const [chuDe, ds] of theoChuDe) {
    const dauMoi = ds.filter((a) => a.dauMoi);
    if (dauMoi.length === 0) {
      viPham.push({
        ma: "CHU_DE_KHONG_DAU_MOI",
        vi: `chủ đề \`${chuDe}\` (${ds.length} ADR còn hiệu lực) không ADR nào khai \`dau_moi: true\` — không biết mở file nào trước`
      });
    } else if (dauMoi.length > 1) {
      viPham.push({
        ma: "CHU_DE_HAI_DAU_MOI",
        vi: `chủ đề \`${chuDe}\` có ${dauMoi.length} đầu mối (${dauMoi.map((a) => a.ma).join(", ")}) — phải đúng một`
      });
    }
  }
  return viPham;
}

/* ĐỀ XUẤT, KHÔNG PHẢI LỆNH. Máy chỉ được nêu chỗ ĐÁNG NGỜ; quyết định gộp hay không là của
   người, và cách thi hành là sửa frontmatter. Cố ý tách khỏi `soatLuat`: trộn "vi phạm" với
   "đáng xem lại" là cách một cổng bắt đầu bị bỏ qua. */
export function deXuat(dsAdr) {
  const ra = [];
  const theoChuDe = new Map();
  for (const a of dsAdr.filter((x) => x.chuDe && CON_HIEU_LUC(x))) {
    if (!theoChuDe.has(a.chuDe)) theoChuDe.set(a.chuDe, []);
    theoChuDe.get(a.chuDe).push(a);
  }
  for (const [chuDe, ds] of theoChuDe) {
    const roiRac = ds.filter((a) => !a.dauMoi && !a.quanHe.length);
    if (roiRac.length) {
      ra.push({
        chuDe,
        vi: `${roiRac.length} ADR trong chủ đề này không khai quan hệ với đầu mối: ${roiRac.map((a) => a.ma).join(", ")}`,
        lam: "khai `thuoc: <mã-đầu-mối>` nếu nó BỔ SUNG, hoặc `sua: <mã>` nếu nó SỬA — rồi bộ biên dịch xếp đúng thứ tự"
      });
    }
  }
  return ra;
}

/* --- ⑹ BIÊN DỊCH + XẾP ---------------------------------------------------- */

/* Thứ tự cố định: đầu mối trước, rồi tới các ADR bổ sung theo NGÀY. Không xếp theo mã, vì mã
   chỉ nói thứ tự viết ra, không nói thứ tự hiệu lực. */
export function bienDich(dsAdr, chuDeKhai) {
  const theoChuDe = new Map();
  for (const a of dsAdr.filter((x) => x.chuDe && CON_HIEU_LUC(x))) {
    if (!theoChuDe.has(a.chuDe)) theoChuDe.set(a.chuDe, []);
    theoChuDe.get(a.chuDe).push(a);
  }
  const khoi = [];
  for (const [chuDe, ds] of theoChuDe) {
    ds.sort((x, y) => (y.dauMoi - x.dauMoi) || String(x.ngay).localeCompare(String(y.ngay)) || String(x.ma).localeCompare(String(y.ma)));
    khoi.push({ chuDe, ten: (chuDeKhai && chuDeKhai.get(chuDe)) || chuDe, ds });
  }
  khoi.sort((a, b) => a.chuDe.localeCompare(b.chuDe));
  const daCat = dsAdr.filter((a) => !CON_HIEU_LUC(a));
  return { khoi, daCat };
}

/* --- Chạy ---------------------------------------------------------------- */

export function docAdr(root = ROOT) {
  const thuMuc = path.join(root, ADR_DIR);
  let ten;
  try { ten = fs.readdirSync(thuMuc).filter((f) => f.endsWith(".md")).sort(); }
  catch { return null; }
  return ten.map((f) => chuanHoaAdr(`${ADR_DIR}/${f}`, fs.readFileSync(path.join(thuMuc, f), "utf8")));
}

export function chuDeKhaiTu(parsed) {
  const raw = parsed && parsed.luat && parsed.luat.chu_de;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return new Map(Object.entries(raw).map(([k, v]) => [k, String(v)]));
}

/* --- SỔ CÁI: mọi luật từng ghi, ở mọi nhà --------------------------------- */

/* Một mục sổ quyết định. Quy ước: `## <ngày> · <tiêu đề>`. Cố ý KHÔNG đọc thân — sổ cái chỉ cần
   biết CÓ GÌ và Ở ĐÂU; đọc thân là việc của người mở file. */
export function docSoCai(root = ROOT) {
  const mot = (rel, nhan) => {
    let text;
    try { text = fs.readFileSync(path.join(root, rel), "utf8"); } catch { return []; }
    return [...text.replace(/\r\n?/g, NL).matchAll(/^##\s+(.+)$/gm)]
      .map((m) => ({ nhan, file: rel, tieuDe: m[1].trim() }));
  };
  const song = mot(SO_QUYET_DINH, "sống");
  const kho = [];
  const thuMucKho = path.join(root, "docs", "archive");
  try {
    for (const f of fs.readdirSync(thuMucKho)) {
      if (/^DECISIONS-/.test(f)) kho.push(...mot(`docs/archive/${f}`, "đã cắt"));
    }
  } catch { /* chưa có kho lưu trữ — repo mới, hợp lệ */ }
  return { song, kho };
}

/* --- TRIM: KHAI BÁO quyết định, máy KHÔNG tự suy ------------------------
 *
 * BA LƯỢT BẮT OAN LIÊN TIẾP 09/09 đã dạy đúng một điều, và nó là điều quan trọng nhất của cả bộ
 * biên dịch: **một mục sổ quyết định thường chứa CẢ HAI — bản ghi một việc đã xong, VÀ một nguyên
 * tắc vẫn đang sống.** Nên không tín hiệu máy nào cắt an toàn được:
 *   ⑴ *"Trần sổ nợ giữ 25"* — chỉ nhắc việc đã đóng, mà **trần 25 vẫn đang cưỡng chế**.
 *   ⑵ *"Migrate là BA việc trong một"* — là **định nghĩa** một quy trình đang dùng.
 *   ⑶ *"Cơ chế suite song song phải thành MỘT MỤC trong danh mục"* — chứa nguyên tắc *mọi cơ chế
 *      phải có một mục trong `features.json`*, và nguyên tắc đó vừa được áp lại hôm nay.
 *
 * NÊN: máy KHÔNG đề xuất cắt dựa trên suy diễn. Nó chỉ cắt thứ **ĐÃ KHAI** là đã thi hành, và
 * **NÊU** những mục chưa khai kèm bằng chứng để người đọc khai. Đúng điều Đức chốt: *AI đề xuất,
 * khai báo tường minh mới làm đổi bộ luật.*
 *
 * Khai bằng một dòng trong thân mục:  `> **trạng thái:** đã thi hành`
 * (giá trị khác: `đang hiệu lực` — mục mang một luật vẫn đang chạy, KHÔNG bao giờ cắt).
 */
export const NHAN_TRANG_THAI = /^>\s*\*\*trạng thái:\*\*\s*(.+)$/m;

/* Tín hiệu HỖ TRỢ, không phải lệnh cắt: dùng để xếp thứ tự đọc cho người khai.
 *
 *
 * Một tín hiệu duy nhất, và nó là tín hiệu đã bắt được ca thật hôm 09/09: **mục chỉ nhắc tới
 * những mã việc đã ĐÓNG hết**. Một quyết định về việc nay đã xong thì nó là lịch sử — vẫn tra
 * được ở kho, nhưng không cần nằm trong thứ mọi phiên đọc.
 *
 * VÀ MỘT VẾ NGƯỢC, thêm sau khi tín hiệu trên bắt oan ngay lượt chạy đầu: **mục nào trỏ tới một
 * ADR CÒN HIỆU LỰC thì GIỮ.** Ca thật 09/09 — mục *"Trần sổ nợ giữ 25 — đóng một mục, không nâng
 * trần"* chỉ nhắc `KHUNG-48` (đã đóng) nên tín hiệu nổ, trong khi **trần 25 vẫn đang cưỡng chế**
 * và mục đó là chỗ duy nhất ghi VÌ SAO. Cắt nó là mất lý do của một luật đang chạy.
 *
 * Vì sao vế ngược đó đúng chứ không phải một miếng vá: ADR là tầng LÝ LẼ. Một quyết định còn trỏ
 * tới ADR đang hiệu lực nghĩa là nó vẫn đang đỡ cho một luật sống — khác hẳn một quyết định chỉ
 * nhắc tới mấy mã việc đã xong.
 *
 * CỐ Ý HẸP. Máy không hiểu nghĩa, nên nó chỉ được nêu chỗ có bằng chứng ĐẾM ĐƯỢC; mọi tín hiệu
 * "nghe có vẻ cũ" đều bị bỏ. Đây là ĐỀ XUẤT — người quyết, và cách thi hành là DỜI sang kho, không
 * phải xoá. */
export function deXuatTrim(root = ROOT) {
  // ADR còn hiệu lực = không mang `status: superseded`. Dùng lại đúng bộ đọc của bước chuẩn hoá.
  const adrSong = new Set((docAdr(root) ?? []).filter(CON_HIEU_LUC).map((a) => `ADR-${a.ma}`));

  /* VẾ NGƯỢC THỨ HAI, thêm sau khi vế một vẫn bắt oan: **còn được một tài liệu SỐNG trỏ tới thì
     GIỮ.** Ca thật 09/09 — mục *"Migrate là BA việc trong một"* chỉ nhắc `KHUNG-2` (đã đóng) nên
     hai tín hiệu trước đều cho cắt, trong khi `CHUYEN-REPO-LEN-CHUAN.md` có hẳn một mục MANG ĐÚNG
     TÊN ĐÓ. Nó không phải lịch sử, nó là **định nghĩa đang được dùng**.
     Gom chữ của mọi tài liệu sống MỘT LẦN — quét lại cho từng mục là chậm và dễ lệch. */
  let chuSong = "";
  const gom = (d) => {
    let ms;
    try { ms = fs.readdirSync(path.join(root, d), { withFileTypes: true }); } catch { return; }
    for (const m of ms) {
      const p2 = `${d}/${m.name}`;
      if (m.isDirectory()) { if (!/archive/.test(m.name)) gom(p2); }
      else if (m.name.endsWith(".md")) { try { chuSong += fs.readFileSync(path.join(root, p2), "utf8"); } catch { /* nt */ } }
    }
  };
  gom("docs");
  for (const f of ["AGENTS.md", "BACKLOG.md", "IDEAS.md", "README.md"]) {
    try { chuSong += fs.readFileSync(path.join(root, f), "utf8"); } catch { /* nt */ }
  }
  let bl = "";
  let khoNo = "";
  try { bl = fs.readFileSync(path.join(root, "BACKLOG.md"), "utf8"); } catch { /* nt */ }
  try { khoNo = fs.readFileSync(path.join(root, "docs/archive/BACKLOG-da-dong.md"), "utf8"); } catch { /* nt */ }
  const daDong = new Set([...`${bl}${NL}${khoNo}`.matchAll(/^###\s+~~([A-Za-z0-9]+-\d+)~~/gm)].map((m) => m[1]));
  const conMo = new Set([...bl.matchAll(/^###\s+(?!~~)([A-Za-z0-9]+-\d+)/gm)].map((m) => m[1]));
  if (!daDong.size) return [];

  let text = "";
  try { text = fs.readFileSync(path.join(root, SO_QUYET_DINH), "utf8"); } catch { return []; }
  const dong = text.replace(/\r\n?/g, NL).split(NL);
  const moc = dong.map((d, i) => (/^##\s/.test(d) ? i : -1)).filter((i) => i >= 0);
  const ra = [];
  for (let k = 0; k < moc.length; k += 1) {
    const dau = moc[k];
    const cuoi = k + 1 < moc.length ? moc[k + 1] : dong.length;
    const than = dong.slice(dau, cuoi).join(NL);
    const ma = [...new Set([...than.matchAll(/([A-Za-z0-9]+-\d+)/g)].map((m) => m[1]))]
      .filter((x) => daDong.has(x) || conMo.has(x));
    if (!ma.length) continue;                       // không nhắc mã nào → không có tín hiệu, bỏ qua
    if (ma.some((x) => conMo.has(x))) continue;     // còn nhắc việc đang mở → GIỮ
    // VẾ NGƯỢC: còn trỏ tới một ADR đang hiệu lực → đây là quyết định SỐNG, giữ. Xem ghi chú trên.
    const adr = [...new Set([...than.matchAll(/ADR-(\d{4})/g)].map((m) => `ADR-${m[1]}`))];
    if (adr.some((x) => adrSong.has(x))) continue;
    const tieuDe = dong[dau].replace(/^##\s+/, "");
    /* Lấy phần ĐẶC TRƯNG của tiêu đề: bỏ ngày, rồi cắt ở dấu gạch dài **và dấu phẩy** — phần sau
       cả hai đều là lời giải thích, không phải tên. Bản đầu chỉ cắt ở gạch dài nên nó trượt ca
       thật: sổ ghi *"…trong một, không phải chuẩn hoá cấu trúc"* còn tài liệu ghi *"…trong một —
       Đức chốt 05/09"*. Hai chuỗi không khớp, và mục đang SỐNG bị đề xuất cắt.
       Ngắn quá thì bỏ qua vế này — một chuỗi 8 ký tự khớp mọi nơi và sẽ giữ lại tất cả. */
    const dacTrung = tieuDe.replace(/^\S+\s*(\([^)]*\)\s*)?·\s*/, "").split(/ — |, /)[0].trim();
    if (dacTrung.length >= 12 && chuSong.includes(dacTrung)) continue;
    const khai = (than.match(NHAN_TRANG_THAI) || [])[1];
    /* Chỉ lấy GIÁ TRỊ, bỏ phần giải thích sau dấu gạch dài — người khai gần như luôn viết thêm
       lý do, và bản đầu so bằng nguyên dòng nên khai đúng vẫn không được nhận. */
    const trangThai = khai ? khai.split(/ — |\. /)[0].trim().toLowerCase() : null;
    if (trangThai === "đang hiệu lực") continue;          // đã khai là luật sống → không bao giờ cắt
    ra.push({ tieuDe, dong: cuoi - dau, ma, daKhai: trangThai === "đã thi hành" });
  }
  return ra;
}

/* --- NẠP: Context Compiler — thứ một phiên THẬT SỰ phải đọc ---------------
 *
 * Đây là bước ⑹ *compile + sort* của vòng đời luật, và là lý do cả bộ này tồn tại: **sổ cái phình
 * vô hạn, thứ NẠP thì không được phình.** Không có bước này thì "biên dịch" chỉ là một bảng đẹp,
 * còn phiên AI vẫn nạp mọi thứ nó tìm thấy.
 *
 * BA TẦNG, đúng thứ tự đọc:
 *   NHÂN      — `AGENTS.md`: luật chung, mọi phiên nạp trước tiên, không có ngoại lệ.
 *   TRẠNG THÁI— `STATUS.md`: một trang, đang ở đâu và việc kế là gì. Đức chốt 09/09: phần đuôi
 *               `HANDOFF.md` là MỘT LƯỢT VIỆC, không phải TRẠNG THÁI — nó sang Tầng 2.
 *   THEO VIỆC — mở khi cần, theo bảng mục 6. **KHÔNG nạp trước.**
 *
 * Con số quan trọng nhất mà lệnh này in ra không phải tổng đã nạp, mà là **tổng KHÔNG nạp**: nó
 * cho thấy bảng mục 6 đang tiết kiệm bao nhiêu. Bảng đó mất tác dụng thì con số kia tụt, và ta
 * thấy ngay. */
/* ƯỚC LƯỢNG TOKEN — đơn vị đúng, và đây là chỗ bản đầu đo SAI.
 *
 * Bản đầu đếm DÒNG và báo `284/300 — ĐẠT`, trong khi thứ nạp thật là **13.799 token**. Một dòng
 * luật tiếng Việt đặc chữ nặng gấp ~32 lần một dòng trống, nên đếm dòng là đo một đại lượng
 * KHÔNG liên quan tới cái đang tốn tiền. Đo 09/09: mục 6 của hiến pháp một mình chiếm **73%**
 * tổng token mà đếm dòng không hề thấy.
 *
 * Hệ số 2.6 ký tự/token là đo thô cho tiếng Việt có dấu — đủ chính xác để XẾP HẠNG và để canh
 * một cái trần, không đủ để báo cáo con số tuyệt đối. Nói rõ ở đây để không ai đọc nó thành
 * số token thật của một nhà cung cấp cụ thể. */
export const uocToken = (s) => Math.round(String(s).length / 2.6);

export function napContext(root = ROOT, tran = 4200) {
  /* `doc` trả CHỮ (để đếm token), `dem` trả số dòng. Hai đơn vị, một nguồn đọc — tách ra thì
     sớm muộn hai con số nói về hai nội dung khác nhau. */
  const doc = (rel, gioiHan) => {
    try {
      const d = fs.readFileSync(path.join(root, rel), "utf8").replace(/\r\n?/g, NL).split(NL);
      return (Number.isFinite(gioiHan) ? d.slice(-gioiHan) : d).join(NL);
    } catch { return ""; }
  };
  const dem = (rel, gioiHan) => {
    const t = doc(rel, gioiHan);
    return t ? t.split(NL).length : 0;
  };
  const nhan = [
    { tang: "NHÂN", file: "AGENTS.md", dong: dem("AGENTS.md"), token: uocToken(doc("AGENTS.md")), vi: "luật chung — mọi phiên, không ngoại lệ" },
    { tang: "TRẠNG THÁI", file: "STATUS.md", dong: dem("STATUS.md"), token: uocToken(doc("STATUS.md")), vi: "đang ở đâu · việc kế · còn gì mở" }
  ];
  const napDong = nhan.reduce((a, b) => a + b.dong, 0);
  const napToken = nhan.reduce((a, b) => a + b.token, 0);

  // Tầng hai: đo nhưng KHÔNG nạp. Đây là phần bảng mục 6 tiết kiệm được.
  const khiCan = [];
  const di = (d) => {
    let ms;
    try { ms = fs.readdirSync(path.join(root, d), { withFileTypes: true }); } catch { return; }
    for (const m of ms) {
      const p2 = `${d}/${m.name}`;
      if (m.isDirectory()) { if (!/archive|migrations/.test(m.name)) di(p2); }
      else if (m.name.endsWith(".md")) khiCan.push({ file: p2, dong: dem(p2), token: uocToken(doc(p2)) });
    }
  };
  di("docs");
  const khongNap = khiCan.reduce((a, b) => a + b.dong, 0);
  const khongNapToken = khiCan.reduce((a, b) => a + b.token, 0);
  // TRẦN ĐO BẰNG TOKEN, không bằng dòng — xem ghi chú ở `uocToken`.
  return { nhan, napDong, napToken, tran, khiCan, khongNap, khongNapToken, dat: napToken <= tran };
}

function main() {
  /* --- Ba lệnh của vòng đời luật, tách khỏi lệnh biên dịch ADR ở dưới ---
     `--so-cai` xem SỔ CÁI (append) · `--trim` nêu mục đáng cắt · `--nap` là CONTEXT COMPILER. */
  if (process.argv.includes("--so-cai")) {
    const { song, kho } = docSoCai(ROOT);
    console.log(`# SỔ CÁI LUẬT — ${song.length + kho.length} quyết định từng ghi${NL}`);
    console.log(`**Đang ở sổ sống** (\`${SO_QUYET_DINH}\`): ${song.length}`);
    console.log(`**Đã cắt sang kho** (\`docs/archive/DECISIONS-*\`): ${kho.length}${NL}`);
    for (const m of song) console.log(`  · ${m.tieuDe}`);
    if (kho.length) {
      console.log(`${NL}## Đã cắt — vẫn tra được, không nạp mỗi lượt`);
      for (const m of kho) console.log(`  · ${m.tieuDe}   [${m.file}]`);
    }
    return EXIT.OK;
  }
  if (process.argv.includes("--trim")) {
    const ds = deXuatTrim(ROOT);
    const catDuoc = ds.filter((m) => m.daKhai);
    const chuaKhai = ds.filter((m) => !m.daKhai);
    console.log("# CẮT — máy chỉ cắt thứ ĐÃ KHAI, không tự suy" + NL);
    if (catDuoc.length) {
      console.log("## Cắt được ngay (" + catDuoc.length + ") — đã khai `trạng thái: đã thi hành`");
      console.log("Thi hành bằng cách DỜI sang `docs/archive/DECISIONS-*.md` giữ nguyên byte, KHÔNG xoá." + NL);
      for (const m of catDuoc) console.log("  · " + m.tieuDe + "   [" + m.dong + " dòng]");
      console.log("");
    }
    if (chuaKhai.length) {
      console.log("## Chưa khai trạng thái (" + chuaKhai.length + ") — ĐỌC rồi khai, đừng cắt theo tín hiệu");
      console.log("Ba lượt bắt oan 09/09 cho thấy một mục thường chứa CẢ bản ghi việc đã xong LẪN một");
      console.log("nguyên tắc vẫn đang sống. Khai bằng một dòng trong thân mục:" + NL);
      console.log("    > **trạng thái:** đã thi hành      (hoặc: đang hiệu lực)" + NL);
      for (const m of chuaKhai) console.log("  · " + m.tieuDe + NL + "      " + m.dong + " dòng · chỉ còn nhắc việc đã đóng: " + m.ma.join(", "));
    }
    if (!ds.length) console.log("Không mục nào có tín hiệu — mọi quyết định trong sổ sống đều còn nhắc việc đang mở, trỏ tới ADR sống, hoặc được một tài liệu sống nhắc lại.");
    return EXIT.OK;
  }
  if (process.argv.includes("--nap")) {
    let tran = 6000;
    try { tran = readStructureFromDisk(ROOT)?.budget?.tokenNap ?? 6000; } catch { /* dùng mặc định */ }
    const kq = napContext(ROOT, tran);
    console.log(`# NẠP — thứ một phiên THẬT SỰ phải đọc${NL}`);
    for (const t of kq.nhan) console.log(`  ${t.tang.padEnd(11)} ~${String(t.token).padStart(5)} token  ${String(t.dong).padStart(4)} dòng  ${t.file}${NL}${" ".repeat(18)}${t.vi}`);
    console.log(`${NL}  TỔNG NẠP: **~${kq.napToken}/${kq.tran} token** (${kq.napDong} dòng) — ${kq.dat ? "ĐẠT" : "VƯỢT TRẦN"}`);
    console.log(`  KHÔNG nạp: **${kq.khongNap} dòng** trong ${kq.khiCan.length} file \`docs/\` — mở khi cần, theo bảng mục 6.`);
    console.log(`${NL}  Tỉ lệ: nạp ${Math.round(kq.napToken * 100 / (kq.napToken + kq.khongNapToken))}% tổng kho chữ. Con số đáng nhìn là phần KHÔNG nạp.`);
    
    if (!kq.dat) {
      console.error(`${NL}VI_PHAM: phần NẠP vượt trần \`budget.docBatBuoc\`. Bớt ở NHÂN, đừng nới trần —`);
      console.error("nới trần ở đây là cho phép mọi phiên ở mọi repo tốn thêm, nhân theo (số repo × số phiên).");
      return EXIT.VI_PHAM;
    }
    return EXIT.OK;
  }

  const chiKiem = process.argv.includes("--check");
  const chiDeXuat = process.argv.includes("--de-xuat");

  const dsAdr = docAdr(ROOT);
  if (dsAdr === null) {
    console.log(`KHÔNG ÁP DỤNG — repo chưa có \`${ADR_DIR}/\`.`);
    return EXIT.OK;
  }
  let parsed;
  try { parsed = readStructureFromDisk(ROOT); }
  catch (e) { console.error(`KHONG_DOC_DUOC: ${String(e.message).split(NL)[0]}`); return EXIT.KHONG_DOC_DUOC; }
  const chuDeKhai = chuDeKhaiTu(parsed);

  /* FAIL-CLOSED, và đây là chỗ dễ nới nhất nên nói rõ: repo CÓ từ hai ADR trở lên mà KHÔNG khai
     chủ đề thì đó là ĐỎ, không phải "không áp dụng". Cho qua ở đây là mở đúng cái cửa mà cả bộ
     biên dịch này sinh ra để đóng — muốn thoát luật thì chỉ việc không khai. */
  if (!chuDeKhai && dsAdr.length >= 2) {
    console.error(`VI_PHAM: repo có ${dsAdr.length} ADR mà \`.repo-structure.json\` chưa khai \`luat.chu_de\`.`);
    console.error("  Khai danh sách chủ đề trước — không khai thì mọi ADR đều không có nhà, và luật lại phình tự do.");
    return EXIT.VI_PHAM;
  }

  const viPham = soatLuat(dsAdr, chuDeKhai);

  if (chiDeXuat) {
    const ds = deXuat(dsAdr);
    if (!ds.length) { console.log("Không có đề xuất nào — mọi ADR đều đã khai chỗ đứng và quan hệ."); return EXIT.OK; }
    console.log(`ĐỀ XUẤT (${ds.length}) — máy chỉ NÊU, người quyết. Thi hành bằng cách sửa frontmatter:${NL}`);
    for (const d of ds) console.log(`  · [${d.chuDe}] ${d.vi}${NL}      → ${d.lam}`);
    return EXIT.OK;
  }

  if (viPham.length) {
    console.error(`VI_PHAM (${viPham.length}) — bộ luật CHƯA biên dịch được:${NL}`);
    for (const v of viPham) console.error(`  · ${v.ma}: ${v.vi}`);
    console.error(`${NL}Sửa bằng cách khai vào frontmatter của ADR (B12 cho phép sửa frontmatter),`);
    console.error("hoặc khai chủ đề mới vào `.repo-structure.json` → `luat.chu_de`.");
    return EXIT.VI_PHAM;
  }
  if (chiKiem) {
    console.log(`Bộ luật biên dịch được — ${dsAdr.length} ADR, ${new Set(dsAdr.filter(CON_HIEU_LUC).map((a) => a.chuDe)).size} chủ đề, 0 vi phạm.`);
    return EXIT.OK;
  }

  const { khoi, daCat } = bienDich(dsAdr, chuDeKhai);
  const conHl = dsAdr.filter(CON_HIEU_LUC).length;
  console.log(`# LUẬT HIỆU LỰC — biên dịch từ ${dsAdr.length} ADR${NL}`);
  console.log(`**Nhân (kernel):** \`AGENTS.md\` — luật chung, mọi phiên nạp trước tiên.`);
  console.log(`**Sổ cái:** \`${ADR_DIR}/\` (${dsAdr.length} ADR, bất biến) · \`${SO_QUYET_DINH}\` · \`docs/archive/\`.`);
  console.log(`**Đang hiệu lực:** ${conHl} ADR trong ${khoi.length} chủ đề · **đã cắt khỏi bộ hiệu lực:** ${daCat.length}.${NL}`);
  for (const k of khoi) {
    console.log(`## ${k.ten}`);
    for (const a of k.ds) {
      const nhan = a.dauMoi ? "ĐẦU MỐI" : (a.quanHe[0] ? `${a.quanHe[0].kieu} ${a.quanHe[0].toi}` : "—");
      console.log(`  ${a.dauMoi ? "▶" : "·"} ADR-${a.ma} [${nhan}] ${a.tieuDe.replace(/^ADR-\d+\s*—\s*/, "")}`);
      console.log(`      ${a.file}`);
    }
    console.log("");
  }
  if (daCat.length) {
    console.log(`## Đã cắt khỏi bộ hiệu lực (vẫn nằm trong sổ cái, KHÔNG xoá)`);
    for (const a of daCat) console.log(`  · ADR-${a.ma} [${a.trangThai}] ${a.file}`);
  }
  return EXIT.OK;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  process.exit(main());
}
