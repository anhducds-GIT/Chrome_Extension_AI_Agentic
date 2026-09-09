#!/usr/bin/env node
/* BỘ BIÊN DỊCH LUẬT — `append → merge → supersede → trim → compile`
 *
 * Đức chốt 09/09: *"cần một bộ rule compiler, đảm bảo các rules được consistent và ổn định,
 * không phình… mọi rule mới được append vào ledger, nhưng KHÔNG append trực tiếp vào active
 * rules."* Thiết kế đầy đủ ở `docs/protocols/RULE-COMPILER.md`.
 *
 * HAI TẦNG, ĐỪNG LẪN:
 *
 *   SỔ CÁI (docs/adr/**)      lịch sử đầy đủ, chỉ thêm — B12 canh: không số hiệu nào được mất
 *   BẢN HIỆU LỰC (AGENTS.md…) thứ AI thật sự nạp — nhỏ, phân nhóm, mỗi dòng trỏ về sổ cái
 *
 * File này canh **mối nối giữa hai tầng**, thứ trước 09/09 không ai canh. Bốn phép:
 *
 *   ① TRICH_VE_CHET      bản hiệu lực trích một vế đã chết          → ĐỎ
 *   ② QUYET_DINH_MO_COI  quyết định còn sống mà không luật nào mang → VÀNG
 *   ③ LUAT_TRUNG         hai dòng luật cùng vân tay ở hai file      → VÀNG
 *   ④ CHUA_RA_SOAT       nơi chứa luật quá hạn rà (giới hạn ⑨)      → VÀNG
 *
 * VÌ SAO ① LÀ ĐỎ CÒN BA CÁI KIA LÀ VÀNG. ① là **sai sự thật**: file luật đang bảo người đọc
 * làm một việc mà Đức đã chốt ngược lại. Không có cách đọc nào khiến nó đúng. Ba cái còn lại
 * là **mùi**: một quyết định mồ côi có thể chỉ là bối cảnh chứ không phải luật, hai dòng giống
 * nhau có thể cố ý nhắc lại ở hai tầng. Bắt máy phán những chỗ đó là dạy người ta tắt máy.
 *
 * BỘ NÀY KHÔNG TỰ SỬA GÌ. Đức chốt rõ: *"tôi không khuyến nghị AI tự tiện sửa/xóa rules"* —
 * AI đề xuất, người chốt, máy chỉ tố giác. Vì thế đây là bộ ĐO, cố ý KHÔNG có cờ `--fix`.
 * Thêm một cờ như thế là mở đúng cánh cửa Đức vừa đóng.
 *
 *   node scripts/rule-compile.mjs          bảng đầy đủ
 *   node scripts/rule-compile.mjs --gon    một dòng cho cổng đóng phiên
 *
 * Ra 0 nếu không có ĐỎ. Ra 1 nếu có ĐỎ. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MODULE_FILE = path.resolve(fileURLToPath(import.meta.url));
const ROOT = path.resolve(path.dirname(MODULE_FILE), "..");

/* Số vế trong ngoặc: ⑴ = U+2474. Dựng bằng mã điểm chứ không gõ thẳng — chuỗi này đi qua
   nhiều bộ giải mã khác nhau và đã bị nuốt một lần ngày 09/09. */
export const VE = Array.from({ length: 20 }, (_, i) => String.fromCodePoint(0x2474 + i));
const LOP_VE = VE.join("");

/* ---- ĐỌC SỔ CÁI ---------------------------------------------------------- */

/* Một file ADR khai ba thứ: số hiệu của chính nó, danh sách số hiệu nó GÁNH (`decides`), và
   các vế đã chết. `decides` là thứ khiến gộp 27 file thành 9 không làm mất quyết định nào. */
export function docFileADR(text, duongDan) {
  const s = String(text ?? "");
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(s);
  const dau = fm ? fm[1] : "";
  const soRieng = /^adr:\s*(\d+)/m.exec(dau)?.[1] ?? null;
  const mDecides = /^decides:\s*\[([^\]]*)\]/m.exec(dau)?.[1] ?? "";
  const ganh = mDecides
    .split(",")
    .map((x) => x.trim())
    .filter((x) => /^\d+$/.test(x))
    .map((x) => x.padStart(4, "0"));
  const mang = ganh.length ? ganh : soRieng ? [String(soRieng).padStart(4, "0")] : [];

  /* Vế chết nằm dưới đúng một tiêu đề. Cắt từ tiêu đề đó tới tiêu đề `##` kế tiếp — mỗi vế
     một dòng `- **0023 ⑴ — …**`, hoặc `- **0007 — …**` khi chết cả quyết định. */
  const chet = [];
  const iBatDau = s.search(/^##\s+V[^\n]*ch[^\n]*t\s*$/m);
  if (iBatDau >= 0) {
    const conLai = s.slice(iBatDau + 1);
    const iKetThuc = conLai.search(/^## /m);
    const than = iKetThuc >= 0 ? conLai.slice(0, iKetThuc) : conLai;
    const re = new RegExp("^-\\s+\\*\\*(\\d{3,4})\\s*([" + LOP_VE + "])?", "gm");
    let m;
    while ((m = re.exec(than))) chet.push({ so: m[1].padStart(4, "0"), ve: m[2] ?? null });
  }

  /* CÁC VẾ CÒN SỐNG CỦA CHÍNH FILE NÀY — tiêu đề `### ⑵ …`.
     VÌ SAO CẦN, và đây là một chỗ mô hình sai đã lọt qua một lần 09/09: sau lượt gộp, số vế
     trong một file chủ đề là số của FILE, không phải số vế của quyết định cũ. `0021-goi-
     extension.md` có `### ⑵ Tách gói…` (đang sống) trong khi mục `Vế đã chết` của nó ghi
     `0021 ⑵` (trần nâng lên HAI, chết) — **hai vật khác nhau, cùng một ký hiệu.** So thẳng thì
     mọi lượt trích `ADR-0021 ⑵` bị báo đỏ oan.
     Luật giải: **một lượt trích chỉ chết khi file KHÔNG CÒN vế mang ký hiệu đó.**
     Chỗ hở còn lại, nói ra chứ không giấu: vế cũ nào có số trùng với một vế mới đang sống thì
     bộ này không bắt được. Đổi lại là 0 báo động giả, và một phép kiểm báo giả sẽ bị tắt. */
  const veSong = new Set();
  const reVe = new RegExp("^#{2,4}\\s+([" + LOP_VE + "])", "gm");
  let mv;
  while ((mv = reVe.exec(s))) veSong.add(mv[1]);

  return { duongDan, mang, chet, veSong };
}

/* Thư mục chứa một file ADR — cùng cách chia phạm vi B12 dùng. `docs/adr/0001` và
   `workers/duc-scouter/v0.1.0/docs/adr/0001` là HAI quyết định khác nhau. */
export const phamViCua = (rel) => rel.slice(0, rel.lastIndexOf("/") + 1);

/* Phạm vi mà một file ĐỌC LUẬT thuộc về: thư mục ADR gần nhất phía trên nó. File ở gốc trích
   `ADR-0005` là trích sổ gốc; file trong gói trích `ADR-0050` là trích sổ của gói đó. */
export function phamViCuaNguoiTrich(rel, cacPhamVi) {
  let dai = "";
  for (const pv of cacPhamVi) {
    const goc = pv.replace(/docs\/adr\/$/, "");
    if (rel.startsWith(goc) && goc.length >= dai.length) dai = goc;
  }
  return dai + "docs/adr/";
}

/* ---- ĐỌC BẢN HIỆU LỰC ---------------------------------------------------- */

/* Mọi lượt trích số hiệu, kèm vế nếu có. Trả cả số dòng để người sửa đi thẳng tới chỗ.
   CHỖ DỄ SAI, ĐÃ SAI MỘT LẦN 09/09: trong văn bản thật số vế đứng SAU cái đuôi liên kết —
   `[ADR-0005](docs/adr/0005-….md) ⑴` chứ không phải `ADR-0005 ⑴`. Bản đầu chỉ bắt hình dạng
   thứ hai, nên nó bỏ sót **mọi** lượt trích theo vế trong `AGENTS.md` mà vẫn báo SẠCH. Phép
   ghim `tests/rule-compile-smoke.mjs` bắt được ngay lượt chạy đầu tiên. */
export function trichDan(text) {
  const out = [];
  const re = new RegExp("ADR-(\\d{4})(?:\\]\\(([^)]*)\\))?\\s*([" + LOP_VE + "])?", "g");
  const dong = String(text ?? "").split(/\r?\n/);
  for (let i = 0; i < dong.length; i++) {
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(dong[i]))) out.push({ so: m[1], lienKet: m[2] ?? null, ve: m[3] ?? null, dong: i + 1 });
  }
  return out;
}

/* Phạm vi của MỘT lượt trích. Cái đuôi liên kết nói thẳng nó trỏ vào sổ nào, nên khi có liên
   kết thì tin liên kết; không có thì rơi về sổ gần nhất phía trên file đang đọc.
   VÌ SAO CẦN, và đây là chỗ mô hình sai thứ hai trong ngày 09/09: một file TRONG GÓI vẫn trích
   quyết định của sổ GỐC — `workers/duc-scouter/v0.1.0/AGENTS.md` trỏ
   `[ADR-0016](../../../docs/adr/0007-scouter.md)`. Chỉ suy theo thư mục thì lượt trích đó rơi
   vào sổ của gói, và ADR-0016 của gốc bị báo **mồ côi oan**. */
export function phamViCuaMotLuot(relFile, lienKet, cacPhamVi) {
  if (lienKet && lienKet.includes("docs/adr/")) {
    const goc = relFile.slice(0, relFile.lastIndexOf("/") + 1);
    const chuan = new URL(lienKet, "file:///" + goc).pathname.slice(1);
    const pv = chuan.slice(0, chuan.lastIndexOf("/") + 1);
    if (cacPhamVi.includes(pv)) return pv;
  }
  return phamViCuaNguoiTrich(relFile, cacPhamVi);
}

/* DẤU VÂN TAY của một dòng luật — bước `normalize` + `deduplicate` của bộ biên dịch.
   Bỏ markdown, bỏ dấu tiếng Việt, bỏ số, giữ tập từ đã sắp xếp. Hai câu nói cùng một thứ
   bằng hai thứ tự từ khác nhau ra cùng vân tay; hai câu khác nghĩa gần như không đụng nhau.
   Đây là phép SÀNG, không phải phép PHÁN — nó nêu ứng viên cho người đọc quyết. */
export function vanTay(dong) {
  const tu = String(dong ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/`[^`]*`/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
  if (tu.length < 8) return null; /* câu quá ngắn thì vân tay chỉ tạo báo động giả */
  return [...new Set(tu)].sort().join(" ");
}

/* Dòng nào ĐÁNG coi là một câu luật: gạch đầu dòng hoặc mục đánh số. Bỏ bảng, khối mã và
   trích dẫn — ba chỗ đó là ví dụ và bối cảnh, không phải câu luật. */
export function dongLuat(text) {
  const out = [];
  let trongMa = false;
  const dong = String(text ?? "").split(/\r?\n/);
  for (let i = 0; i < dong.length; i++) {
    const d = dong[i];
    if (/^\s*```/.test(d)) {
      trongMa = !trongMa;
      continue;
    }
    if (trongMa) continue;
    if (/^\s*[|>]/.test(d)) continue;
    if (!/^\s*(?:[-*]|\d+\.)\s+\S/.test(d)) continue;
    out.push({ noiDung: d.trim(), dong: i + 1 });
  }
  return out;
}

/* ---- BIÊN DỊCH ----------------------------------------------------------- */

export function bienDich({ soCai, banHieuLuc, dangKy, homNay }) {
  const cacPhamVi = [...new Set(soCai.map((f) => phamViCua(f.duongDan)))];

  /* Bảng số hiệu theo phạm vi: cái nào còn sống, vế nào đã chết, ai đang mang nó. */
  const song = new Map();
  const chet = new Map();
  const nha = new Map();
  for (const f of soCai) {
    const pv = phamViCua(f.duongDan);
    if (!song.has(pv)) song.set(pv, new Set());
    if (!chet.has(pv)) chet.set(pv, new Set());
    for (const so of f.mang) {
      song.get(pv).add(so);
      nha.set(pv + "|" + so, f.duongDan);
    }
    /* Vế cũ mà file NAY vẫn còn một vế mang đúng ký hiệu đó thì bỏ qua — xem `docFileADR`. */
    for (const c of f.chet) {
      if (c.ve && (f.veSong ?? new Set()).has(c.ve)) continue;
      chet.get(pv).add(c.ve ? c.so + " " + c.ve : c.so);
    }
  }

  /* ① và ② — đi qua từng lượt trích trong bản hiệu lực. */
  const veChetConTrich = [];
  const daTrich = new Set();
  for (const f of banHieuLuc) {
    for (const t of trichDan(f.noiDung)) {
      const pv = phamViCuaMotLuot(f.duongDan, t.lienKet, cacPhamVi);
      daTrich.add(pv + "|" + t.so);
      const khoa = t.ve ? t.so + " " + t.ve : t.so;
      if ((chet.get(pv) ?? new Set()).has(khoa)) {
        veChetConTrich.push({ file: f.duongDan, dong: t.dong, so: t.so, ve: t.ve, so_cai: pv });
      }
    }
  }

  /* Mồ côi gộp theo PHẠM VI, không đổ thành một danh sách phẳng. Một sổ cái của gói mà KHÔNG
     một số hiệu nào được trích là **một** vấn đề (gói đó không có thói quen trích số), không
     phải năm mươi. Đổ phẳng là biến một câu thành năm mươi dòng và người đọc tắt phép kiểm. */
  /* Mồ côi CỐ Ý — khai ở `luat.mo_coi_co_y`, khoá là `<phạm vi><số>`, giá trị là LÝ DO.
     Không có khối này thì ② báo một con số không bao giờ về 0, và một phép kiểm không bao giờ
     về 0 là một phép kiểm người ta thôi đọc. Có nó thì con số còn lại là con số THẬT.

     DẠNG THỨ HAI — NHÓM, thêm 09/09 khi soi 59 quyết định của một gói cùng lúc. Khoá là
     `<phạm vi>` (không có số), giá trị là `{ nhom: [{ ly_do, cac_so }] }`. Vì sao cần: 26 mục
     ở đó có CÙNG một lý do thật (*bản ghi chẩn đoán của một lượt sửa*), và chép câu đó 26 lần
     là **giả vờ đã suy nghĩ 26 lần**. Một lý do, một danh sách.

     Chỗ CỐ Ý không nới: nhóm vẫn phải **liệt kê từng số**. Không có dạng "cả sổ này miễn" —
     làm thế là tắt hẳn ②, mà chính ② vừa lôi ra bốn chốt `run.trial` của Đức đang sống mà
     không nơi luật nào mang. Quyết định MỚI thêm sau vẫn kêu, vì nó không có trong danh sách. */
  const coY = new Map();
  for (const [khoa, giaTri] of Object.entries(dangKy.mo_coi_co_y ?? {})) {
    if (typeof giaTri === "string") { coY.set(khoa, giaTri); continue; }
    for (const nhom of giaTri?.nhom ?? []) {
      for (const so of nhom?.cac_so ?? []) coY.set(khoa + so, nhom.ly_do);
    }
  }
  const moCoi = [];
  for (const [pv, bo] of song) {
    const dc = chet.get(pv) ?? new Set();
    const cai = [];
    let tong = 0;
    for (const so of [...bo].sort()) {
      if (dc.has(so)) continue; /* chết cả quyết định thì không tính là mồ côi */
      tong++;
      if (coY.has(pv + so)) continue;
      if (!daTrich.has(pv + "|" + so)) cai.push({ so, o: nha.get(pv + "|" + so) });
    }
    if (cai.length) moCoi.push({ so_cai: pv, cai, tong, imLang: cai.length === tong });
  }
  moCoi.sort((a, b) => b.cai.length - a.cai.length);

  /* ③ — vân tay trùng, chỉ tính GIỮA các file khác nhau. Cùng một file nhắc lại là chuyện
     hành văn; hai file khác nhau nói cùng một câu mới là chỗ luật sẽ trôi lệch. */
  const theoVanTay = new Map();
  for (const f of banHieuLuc) {
    for (const d of dongLuat(f.noiDung)) {
      const v = vanTay(d.noiDung);
      if (!v) continue;
      if (!theoVanTay.has(v)) theoVanTay.set(v, []);
      theoVanTay.get(v).push({ file: f.duongDan, dong: d.dong, noiDung: d.noiDung });
    }
  }
  const trung = [];
  for (const [, cho] of theoVanTay) {
    if (new Set(cho.map((c) => c.file)).size > 1) trung.push(cho);
  }

  /* ④ — hạn rà soát. Giới hạn ⑨ của `AGENTS.md` nói HẰNG TUẦN; trước file này nó chỉ là chữ. */
  const quaHan = [];
  const tran = dangKy.tran_ngay_ra_soat ?? 7;
  for (const [duongDan, ngay] of Object.entries(dangKy.ra_soat ?? {})) {
    const t = Date.parse(ngay);
    const tuoi = Number.isNaN(t) ? Infinity : Math.floor((homNay - t) / 86400000);
    if (tuoi > tran) quaHan.push({ duongDan, ngay, tuoi });
  }
  quaHan.sort((a, b) => b.tuoi - a.tuoi);

  return { veChetConTrich, moCoi, trung, quaHan };
}

/* ---- ĐỌC ĐĨA ------------------------------------------------------------- */

function quet(thuMuc, nhan) {
  const ra = [];
  const di = (d) => {
    let muc;
    try {
      muc = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const m of muc) {
      if (m.name === "node_modules" || m.name === ".git" || m.name === "evidence") continue;
      const p = path.join(d, m.name);
      if (m.isDirectory()) di(p);
      else if (nhan(path.relative(ROOT, p).split(path.sep).join("/"))) ra.push(p);
    }
  };
  di(thuMuc);
  return ra;
}

export function docTuDia() {
  const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");
  const fileADR = quet(ROOT, (r) => /(^|\/)docs\/adr\/\d{4}[^/]*\.md$/.test(r));
  const soCai = fileADR.map((p) => docFileADR(fs.readFileSync(p, "utf8"), rel(p)));

  const dangKy = JSON.parse(fs.readFileSync(path.join(ROOT, ".repo-structure.json"), "utf8")).luat ?? {};
  const banHieuLuc = Object.keys(dangKy.ra_soat ?? {})
    .map((r) => ({ r, p: path.join(ROOT, r) }))
    .filter(({ p }) => fs.existsSync(p))
    .map(({ r, p }) => ({ duongDan: r, noiDung: fs.readFileSync(p, "utf8") }));

  return { soCai, banHieuLuc, dangKy };
}

/* ---- CLI ----------------------------------------------------------------- */

export function main(argv = process.argv.slice(2)) {
  const gon = argv.includes("--gon");
  const { soCai, banHieuLuc, dangKy } = docTuDia();
  const kq = bienDich({ soCai, banHieuLuc, dangKy, homNay: Date.now() });
  const soQuyetDinh = soCai.reduce((n, f) => n + f.mang.length, 0);
  const soVeChet = soCai.reduce((n, f) => n + f.chet.length, 0);
  const thieu = Object.keys(dangKy.ra_soat ?? {}).length - banHieuLuc.length;

  if (gon) {
    const co = kq.veChetConTrich.length;
    const tongMoCoiGon = kq.moCoi.reduce((n, g) => n + g.cai.length, 0);
    console.log(
      (co ? "TRICH_VE_CHET: " + co + " chỗ" : "biên dịch luật SẠCH") +
        `  ·  ${soQuyetDinh} quyết định / ${soVeChet} vế chết / ${banHieuLuc.length} nơi chứa luật` +
        (tongMoCoiGon ? `  ·  ${tongMoCoiGon} mồ côi` : "") +
        (kq.trung.length ? `  ·  ${kq.trung.length} chỗ trùng` : "") +
        (kq.quaHan.length ? `  ·  ${kq.quaHan.length} nơi quá hạn rà` : "")
    );
    return co ? 1 : 0;
  }

  console.log(`SỔ CÁI       ${soCai.length} file · ${soQuyetDinh} quyết định · ${soVeChet} vế đã chết`);
  console.log(`BẢN HIỆU LỰC ${banHieuLuc.length} nơi chứa luật (khai ở .repo-structure.json → luat.ra_soat)`);
  if (thieu > 0) console.log(`             ⚠ ${thieu} đường dẫn đã khai nhưng KHÔNG TỒN TẠI — sửa bản khai.`);

  console.log(`\n① TRICH_VE_CHET — bản hiệu lực trích một vế Đức đã chốt ngược lại  [${kq.veChetConTrich.length}]`);
  for (const c of kq.veChetConTrich) {
    console.log(`   ĐỎ  ${c.file}:${c.dong}  trích ADR-${c.so}${c.ve ? " " + c.ve : ""} — vế này đã chết trong ${c.so_cai}`);
  }

  const tongMoCoi = kq.moCoi.reduce((n, g) => n + g.cai.length, 0);
  console.log(`\n② QUYET_DINH_MO_COI — còn sống nhưng không nơi chứa luật nào mang  [${tongMoCoi} trong ${kq.moCoi.length} sổ]`);
  for (const g of kq.moCoi) {
    if (g.imLang) {
      console.log(`   ⚠ ${g.so_cai}  —  KHÔNG số hiệu nào được trích (${g.tong}/${g.tong}). Gói này chưa có thói quen trích số hiệu; đó là MỘT việc phải sửa, không phải ${g.tong}.`);
    } else {
      console.log(`   ·  ${g.so_cai}  ${g.cai.length}/${g.tong} mồ côi: ${g.cai.map((c) => "ADR-" + c.so).join(" ")}`);
    }
  }

  console.log(`\n③ LUAT_TRUNG — cùng dấu vân tay ở hai file khác nhau  [${kq.trung.length}]`);
  for (const nhom of kq.trung.slice(0, 15)) {
    console.log(`   ·  ${nhom.map((c) => c.file + ":" + c.dong).join("  ↔  ")}`);
    console.log(`      ${nhom[0].noiDung.slice(0, 110)}`);
  }
  if (kq.trung.length > 15) console.log(`   … còn ${kq.trung.length - 15} nhóm nữa`);

  console.log(`\n④ CHUA_RA_SOAT — quá ${dangKy.tran_ngay_ra_soat ?? 7} ngày (giới hạn ⑨)  [${kq.quaHan.length}]`);
  for (const c of kq.quaHan.slice(0, 30)) {
    console.log(`   ·  ${c.duongDan}  ${c.ngay ? "rà lần cuối " + c.ngay + " (" + c.tuoi + " ngày)" : "CHƯA BAO GIỜ rà"}`);
  }
  if (kq.quaHan.length > 30) console.log(`   … còn ${kq.quaHan.length - 30} nơi nữa`);

  console.log(kq.veChetConTrich.length ? "\nĐỎ — sửa ① trước khi đóng phiên." : "\nKhông có ĐỎ.");
  return kq.veChetConTrich.length ? 1 : 0;
}

if (path.resolve(process.argv[1] ?? "") === MODULE_FILE) process.exit(main());
