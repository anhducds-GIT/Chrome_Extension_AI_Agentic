/* `HANDOFF.md` — trần độ dài một mục, và xoay file theo tháng.
 *
 * Quyết định gốc: ADR-0011 (Đức chốt 06/09). Luật vận hành: `docs/protocols/HANDOFF.md`.
 *
 * Hai việc, cố ý nằm chung một file vì chúng đọc CÙNG một cách bổ file ra mục:
 *   ⑴ đếm byte một mục để cổng đóng phiên chặn mục MỚI quá dài;
 *   ⑵ xoay file theo tháng — nội dung tháng cũ thành file lưu trữ, để lại một con trỏ.
 *
 * TRẦN KHÔNG NẰM Ở ĐÂY. Nó khai ở `.repo-structure.json` (`handoff.tran_byte_moi_muc`) và đi
 * qua `handoffCapFrom` trong `repo-structure.mjs`. Gõ cứng ở đây là gieo lại đúng con bug
 * 02/09: hai bản sao của một luật trả hai câu khác nhau cho cùng một file.
 *
 * Dùng:
 *   node scripts/handoff.mjs --check  [<file>…]        chỉ đo, không ghi
 *   node scripts/handoff.mjs --rotate <file> [--thang YYYY-MM]
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/* Mốc THÁNG mà file hiện đang chứa. Máy đọc, người cũng đọc được.
 * Vì sao phải khai chứ không suy ra từ ngày trong tiêu đề mục: các mục Log KHÔNG xếp theo thứ
 * tự thời gian (đo được ở gói ChatGPT: 22/08 → 24/08 → 22/08 lại). Suy từ ngày là câu máy
 * không xác định được — ADR-0008 bất biến ⑵ cấm. Khai một dòng thì không phải đoán. */
export const NHAN_THANG = "<!-- HANDOFF-THANG:";
const RE_THANG = /<!--\s*HANDOFF-THANG:\s*(\d{4}-\d{2})\s*-->/;

/* Tiêu đề mở phần Log. Khớp CHÍNH XÁC `## Log` — cả bốn `HANDOFF.md` của repo đều dùng đúng
 * dạng này. Không dùng \b: JS \b không khớp cạnh chữ Việt có dấu, và cái đó đã âm thầm làm một
 * regex không khớp gì cả hai lần trong repo này. */
const RE_MO_LOG = /^##[ \t]+Log[ \t]*$/;
const RE_TIEU_DE_MUC = /^##[ \t]/;

/* Con trỏ lưu trữ — CÙNG HÌNH DẠNG tên file mà bộ đếm sự cố ở `build-overview.mjs` dò
 * (`HANDOFF-ARCHIVE-\d+\.md`). Đổi cách đặt tên ở đây mà quên chỗ kia thì bộ đếm ÂM THẦM về 0,
 * và "0 sự cố" đọc y hệt "sạch sẽ". Đó là lý do lược đồ theo tháng vẫn đánh SỐ chứ không đặt
 * tên theo tháng: nó nối tiếp được với `HANDOFF-ARCHIVE-01.md` sinh sáng 06/09. */
const RE_TEN_LUU_TRU = /^HANDOFF-ARCHIVE-(\d+)\.md$/;

/* Bổ file làm hai: phần ĐẦU (tiêu đề, ghi chú, dòng `## Log`) và phần THÂN (con trỏ + mọi mục).
 * Bất biến: `dau + than === nguyên bản`, từng byte. Mọi phép xoay dựa vào đây. */
export function tachThan(text) {
  const raw = String(text ?? "");
  const lines = raw.split("\n");
  const i = lines.findIndex((l) => RE_MO_LOG.test(l));
  if (i < 0) return { dau: raw, than: "" };
  const dau = lines.slice(0, i + 1).join("\n") + (i + 1 < lines.length ? "\n" : "");
  return { dau, than: raw.slice(dau.length) };
}

/* Bổ phần thân ra từng mục. Một mục bắt đầu ở một dòng `## ` và kéo tới trước dòng `## ` kế.
 * Chữ đứng TRƯỚC mục đầu tiên (khối con trỏ) không thuộc mục nào — cố ý: nó là chú thích của
 * file, không phải nhật ký của ai. */
export function docMuc(than) {
  const lines = String(than ?? "").split("\n");
  const out = [];
  let cur = null;
  for (const line of lines) {
    if (RE_TIEU_DE_MUC.test(line)) {
      if (cur) out.push(cur);
      cur = { tieuDe: line.trim(), lines: [] };
    }
    if (cur) cur.lines.push(line);
  }
  if (cur) out.push(cur);
  return out.map((e) => {
    const text = e.lines.join("\n").replace(/\s+$/, "") + "\n";
    return { tieuDe: e.tieuDe, byte: Buffer.byteLength(text, "utf8"), text };
  });
}

export const docMucTuFile = (text) => docMuc(tachThan(text).than);

/* CÓ PHẢI MỘT QUYỂN NHẬT KÝ KHÔNG — hỏi NỘI DUNG, đừng hỏi TÊN FILE.
 *
 * Đo thật 06/09, ngay lượt chạy cổng đầu tiên: `docs/protocols/HANDOFF.md` — **sổ tay luật**, không
 * phải nhật ký — cũng có tên kết thúc bằng `HANDOFF.md`, nên nó bị đòi khai mốc tháng và cổng ĐỎ.
 * Lọc theo đường dẫn (`không nằm trong docs/`) thì lần sau lại có một chỗ khác. Dấu hiệu đúng là
 * dòng `## Log`: quyển nào có nó thì có mục nhật ký, quyển nào không có thì không có gì để đếm. */
export const laNhatKy = (text) => String(text ?? "").split("\n").some((l) => RE_MO_LOG.test(l));

/* MỤC NÀO LÀ MỤC PHIÊN NÀY VỪA THÊM.
 *
 * So theo TIÊU ĐỀ, không so theo nội dung — và đây là chỗ dễ làm sai nhất của cả bài:
 * so theo nội dung thì một lượt sửa lỗi chính tả trong mục CŨ biến mục đó thành "mới", và
 * cổng chặn lane này vì chữ của lane khác. Brief `HANDOFF-TRAN-01` mục 2 cấm đúng chuyện đó. */
export function mucMoi(vanBanMoi, vanBanGoc) {
  const cu = new Set(docMucTuFile(vanBanGoc ?? "").map((m) => m.tieuDe));
  return docMucTuFile(vanBanMoi).filter((m) => !cu.has(m.tieuDe));
}

/* Mục nào vượt trần. Trả về danh sách, KHÔNG ném — bên gọi quyết định đỏ hay không. */
export function vuotTran(mucs, tran) {
  if (!Number.isInteger(tran) || tran <= 0) {
    throw new Error(`HANDOFF_TRAN_HONG: trần phải là số nguyên dương, nhận "${tran}".`);
  }
  return mucs.filter((m) => m.byte > tran);
}

export const CAU_CHI_DUONG = "Phần thừa thuộc về ADR, sổ nợ, hay brief? Chuyển nó sang đó rồi"
  + " để lại một con trỏ — đừng cắt chữ cho vừa. Xem `docs/protocols/HANDOFF.md` mục 2.";

export const thangCua = (text) => (String(text ?? "").match(RE_THANG) ?? [])[1] ?? null;

export function datThang(text, thang) {
  if (!/^\d{4}-\d{2}$/.test(String(thang ?? ""))) {
    throw new Error(`HANDOFF_THANG_HONG: tháng phải là YYYY-MM, nhận "${thang}".`);
  }
  const dong = `${NHAN_THANG} ${thang} -->`;
  const raw = String(text ?? "");
  if (RE_THANG.test(raw)) return raw.replace(RE_THANG, dong);
  return raw.replace(/\s*$/, "\n") + `\n${dong}\n`;
}

/* Số thứ tự file lưu trữ kế tiếp, suy từ những file ĐANG CÓ trong cùng thư mục.
 * Cấm gõ cứng tên file lưu trữ ở bất kỳ đâu (protocol mục 5) — kể cả ở đây. */
export function soLuuTruTiepTheo(tenFileTrongThuMuc) {
  let max = 0;
  for (const ten of tenFileTrongThuMuc ?? []) {
    const m = RE_TEN_LUU_TRU.exec(ten);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

export const tenLuuTru = (so) => `HANDOFF-ARCHIVE-${String(so).padStart(2, "0")}.md`;

/* XOAY. Thuần, không đụng đĩa — để kiểm được từng nhánh.
 *
 * Ba bất biến của protocol mục 3, và cả ba nằm ngay trong hình dạng dưới đây:
 *   ⑴ KHÔNG MẤT MỘT BYTE — `luuTru` chứa `than` NGUYÊN VĂN ở đuôi, nên `luuTru.endsWith(than)`.
 *   ⑵ CHUỖI CON TRỎ ĐI ĐƯỢC BẰNG MÁY — file mới trỏ sang file vừa sinh, mà file vừa sinh mang
 *      theo con trỏ CŨ của nó (nằm trong `than`), nên chuỗi dài bao nhiêu vẫn đi được.
 *   ⑶ khai vào Bản đồ file — việc của người gọi, không máy nào làm hộ được. */
export function xoay({ text, thangMoi, so, tenFile = "HANDOFF.md" }) {
  const { dau, than } = tachThan(text);
  const thangCu = thangCua(text);
  const luuTruTen = tenLuuTru(so);
  const tieuDe = `# HANDOFF lưu trữ — ${tenFile}${thangCu ? `, tới hết tháng ${thangCu}` : ""}`;
  const luuTruDau = [
    tieuDe,
    "",
    "> Sinh bằng `node scripts/handoff.mjs --rotate` theo ADR-0011: `HANDOFF.md` chỉ chứa tháng",
    `> hiện tại. Nguyên văn, không sửa một chữ. File hiện tại: [\`${tenFile}\`](${tenFile}).`,
    "",
    /* Giữ nguyên dòng `## Log` ở file lưu trữ. Không phải trang trí: mọi công cụ đọc nhật ký
     * (bộ đếm byte một mục, bộ đếm sự cố) bổ file theo đúng dòng này. Bỏ nó đi thì file lưu
     * trữ bổ ra ĐÚNG 0 MỤC — và "0 mục" đọc y hệt "file rỗng". */
    "## Log",
    ""
  ].join("\n") + "\n";
  /* NỐI BẰNG ĐÚNG MỘT PHÉP CỘNG, và TRẢ CẢ `luuTruDau` RA NGOÀI. Không trả thì phép ghim chỉ
   * kiểm được `endsWith(than)` — mà một đột biến bớt đúng MỘT byte đầu `than` **sống sót** qua
   * phép kiểm đó, vì byte bị bớt trùng đúng byte cuối của phần đầu. Đo thật, 06/09. Có
   * `luuTruDau` thì phép ghim kiểm được bằng ĐẲNG THỨC, và đẳng thức thì không có chỗ lọt. */
  const luuTru = luuTruDau + than;
  const conTro = [
    "",
    `${NHAN_THANG} ${thangMoi} -->`,
    "",
    "<!-- HANDOFF-CUT-POINTER: ADR-0011 -->",
    `> **Tháng${thangCu ? ` ${thangCu}` : " trước"} và trước đó đã dời sang [\`${luuTruTen}\`](${luuTruTen})**`,
    "> — cùng thư mục này, nguyên văn, không mất chữ nào. File này chỉ chứa **tháng hiện tại**",
    "> (ADR-0011). Cần đào lịch sử xa hơn thì mở file đó và đi tiếp theo con trỏ trong nó;",
    "> ghi Log mới thì vẫn ghi vào cuối file này.",
    "<!-- /HANDOFF-CUT-POINTER -->",
    ""
  ].join("\n");
  return { moi: dau + conTro, luuTru, luuTruDau, luuTruTen, thangCu };
}

/* ---- CẮT THEO SỐ MỤC (ADR-0008) ----------------------------------------
 *
 * KHÁC HẲN `xoay()` Ở TRÊN, và hai cơ chế này đã bị lẫn với nhau một lần rồi.
 *   `xoay()`  — ADR-0011 — cắt theo **THÁNG**: file chỉ giữ tháng hiện tại.
 *   `catTheoSo()` — ADR-0008 — cắt theo **SỐ MỤC**: file giữ N mục cuối.
 *
 * Vì sao phải có cả hai: đo 09/09, `HANDOFF.md` gốc có **60 mục** trong khi ADR-0008 chốt 20 —
 * nhưng cả 60 mục đều mang mốc `2026-09`, nên `--rotate` chạy xong dời **0 dòng** và in ra một
 * câu nghe như thành công. Cơ chế của ADR-0008 làm tay một lần ngày 06/09 rồi **chưa bao giờ
 * được cài**; đây là lượt cài nó.
 */

/* Vị trí (chỉ số chuỗi) của dòng mở mỗi mục trong phần thân.
 * Trả VỊ TRÍ chứ không trả nội dung mục — cố ý. `docMuc()` chuẩn hoá đuôi trắng của mỗi mục
 * (`.replace(/\s+$/, "") + "\n"`), nên nối các mục của nó lại KHÔNG ra đúng nguyên bản khi giữa
 * hai mục có dòng trắng. Cắt bằng vị trí thì `than.slice(0,k) + than.slice(k) === than` là hằng
 * đúng, không cần tin bộ chuẩn hoá nào — mà bất biến ⑴ của ADR-0008 chính là chỗ đó. */
export function viTriMuc(than) {
  const s = String(than ?? "");
  const out = [];
  let i = 0;
  for (const line of s.split("\n")) {
    if (RE_TIEU_DE_MUC.test(line)) out.push(i);
    i += line.length + 1;
  }
  return out;
}

export const MOC_THAN_LUU_TRU = "<!-- ARCHIVE-BODY-START -->\n";

/* CẮT. Thuần, không đụng đĩa. Trả `null` khi chưa tới ngưỡng — "chưa cần cắt" không phải lỗi.
 *
 * Hình dạng bản ra khớp ĐÚNG bản `HANDOFF-ARCHIVE-01.md` mà lượt cắt tay 06/09 để lại, nên
 * chuỗi con trỏ đi tiếp được: khối con trỏ CŨ nằm ở đầu `thanCu`, tức nó theo vào file lưu trữ
 * mới và từ đó trỏ ngược về file lưu trữ trước.
 *
 * BẤT BIẾN ⑴ — dựng lại được từng byte:
 *     dau + <thân của file lưu trữ, sau MOC_THAN_LUU_TRU> + thanMoi === text
 * Trả cả `thanCu` và `thanMoi` ra ngoài để phép ghim kiểm được bằng ĐẲNG THỨC. Kiểm bằng
 * `endsWith`/`includes` thì một đột biến bớt đúng một byte ở mối nối vẫn sống — đã đo thật
 * 06/09 ở `xoay()`, không lặp lại ở đây. */
export function catTheoSo({ text, giu, so, tenFile = "HANDOFF.md", sha = null, ngay = null }) {
  if (!Number.isInteger(giu) || giu <= 0) {
    throw new Error(`HANDOFF_GIU_HONG: số mục giữ lại phải là số nguyên dương, nhận "${giu}".`);
  }
  const raw = String(text ?? "");
  const { dau, than } = tachThan(raw);
  const moc = viTriMuc(than);
  /* Ra 0 mỏ neo là BỘ ĐO HỎNG, không phải "file sạch". Ném, đừng trả null — trả null ở đây thì
   * một file hỏng dòng `## Log` sẽ báo "chưa cần cắt" và không ai biết. */
  if (moc.length === 0) {
    throw new Error(`HANDOFF_KHONG_KHOP: không bổ được mục nào trong ${tenFile}. Kiểm dòng \`## Log\`.`);
  }
  if (moc.length <= giu) return null;
  const cat = moc[moc.length - giu];
  const thanCu = than.slice(0, cat);    // khối con trỏ cũ + các mục bị dời
  const thanMoi = than.slice(cat);      // các mục giữ lại
  const soCat = moc.length - giu;
  const luuTruTen = tenLuuTru(so);
  const luuTruDau = [
    `# HANDOFF lưu trữ — ${tenFile}, ${soCat} mục cũ`,
    "",
    `> **Đây là phần đuôi đã cắt của [\`${tenFile}\`](${tenFile}) cạnh file này.**`,
    `> Sinh bằng \`node scripts/handoff.mjs --cat ${tenFile} --giu ${giu}\` theo`,
    "> [ADR-0008](docs/adr/0008-cat-duoi-handoff-giu-hai-muoi-luot.md)"
      + `${ngay ? ` — cắt ngày ${ngay}` : ""}.`,
    ">",
    `> Cắt theo **vị trí trong file**, không theo ngày (bất biến ⑵ của ADR): file kia giữ **${giu}`,
    `> mục cuối**, ${soCat} mục trước đó nằm ở đây — **nguyên văn, không sửa một chữ**.`,
    ">",
    "> **Dựng lại bản gốc:** thay khối con trỏ trong `" + tenFile + "` (phần giữa dòng `## Log` và",
    "> tiêu đề `##` đầu tiên) bằng toàn bộ phần dưới dấu `ARCHIVE-BODY-START` ở đây — ra đúng bản",
    "> gốc **từng byte**" + (sha ? `. SHA-256 bản gốc trước khi cắt: \`${sha}\`` : "") + ".",
    ">",
    "> **Chỉ đọc.** Ghi Log mới thì ghi vào `" + tenFile + "`, đừng ghi vào đây.",
    "",
    MOC_THAN_LUU_TRU.trimEnd()
  ].join("\n") + "\n";
  const conTro = [
    "",
    `${NHAN_THANG} ${thangCua(raw) ?? thangHienTai()} -->`,
    "",
    "<!-- HANDOFF-CUT-POINTER: ADR-0008 -->",
    `> **${soCat} mục cũ hơn đã dời sang [\`${luuTruTen}\`](${luuTruTen})** — cùng thư mục này,`,
    `> nguyên văn, không mất chữ nào. File này giữ **${giu} mục cuối** (ADR-0008). Cần đào lịch sử`,
    "> xa hơn thì mở file đó và đi tiếp theo con trỏ trong nó; ghi Log mới thì vẫn ghi vào cuối",
    "> file này.",
    "<!-- /HANDOFF-CUT-POINTER -->",
    "",
    ""
  ].join("\n");
  return {
    moi: dau + conTro + thanMoi,
    luuTru: luuTruDau + thanCu,
    luuTruDau, luuTruTen, dau, conTro, thanCu, thanMoi, soCat, giu
  };
}

/* ---- CLI ---------------------------------------------------------------- */

const MAC_DINH = ["HANDOFF.md"];

export const homNay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

export function thangHienTai(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function chayCLI(argv) {
  const cat = argv.indexOf("--cat");
  if (cat >= 0) {
    const file = argv[cat + 1];
    if (!file || file.startsWith("--")) {
      console.error("Thiếu đường dẫn: node scripts/handoff.mjs --cat <file> [--giu 20]");
      return 2;
    }
    const iGiu = argv.indexOf("--giu");
    const giu = iGiu >= 0 ? Number(argv[iGiu + 1]) : 20;
    const text = fs.readFileSync(file, "utf8");
    const sha = crypto.createHash("sha256").update(text, "utf8").digest("hex");
    const dir = path.dirname(file);
    const so = soLuuTruTiepTheo(fs.readdirSync(dir));
    let r;
    try {
      r = catTheoSo({ text, giu, so, tenFile: path.basename(file), sha, ngay: homNay() });
    } catch (e) { console.error(String(e.message)); return 3; }
    if (r === null) {
      console.log(`${file}: ${docMucTuFile(text).length} mục, không quá ${giu} — chưa cần cắt.`);
      return 0;
    }
    /* KIỂM BẤT BIẾN ⑴ TRƯỚC KHI GHI, không sau. Ghi trước rồi kiểm là đã mất bản gốc nếu sai. */
    /* Ghép lại TỪ CHUỖI SẮP GHI RA ĐĨA (`r.moi`), không từ các mảnh rời. Bản đầu của phép kiểm
     * này ghép `r.dau + <thân lưu trữ> + r.thanMoi` — nó XANH trong khi `r.moi` bị sót cả phần
     * `thanMoi`, tức file ra rỗng mục mà phép kiểm vẫn gật. Kiểm cái mình ghi, không kiểm cái
     * mình định ghi. */
    const thanLuuTru = r.luuTru.slice(r.luuTru.indexOf(MOC_THAN_LUU_TRU) + MOC_THAN_LUU_TRU.length);
    const dungLai = r.moi.slice(0, r.dau.length) + thanLuuTru
      + r.moi.slice(r.dau.length + r.conTro.length);
    if (dungLai !== text) {
      console.error("HANDOFF_MAT_BYTE: ghép lại KHÔNG ra bản gốc. Không ghi gì cả.");
      return 3;
    }
    const dich = path.join(dir, r.luuTruTen);
    if (fs.existsSync(dich)) {
      console.error(`HANDOFF_LUU_TRU_DA_CO: ${dich} đã tồn tại. Dừng, không ghi đè.`);
      return 3;
    }
    fs.writeFileSync(dich, r.luuTru, "utf8");
    fs.writeFileSync(file, r.moi, "utf8");
    console.log(`đã cắt ${file}: ${r.soCat + r.giu} mục → giữ ${r.giu}, dời ${r.soCat} sang ${dich}.`);
    console.log(`ghép lại dựng đúng bản gốc từng byte — SHA-256 bản gốc: ${sha}`);
    console.log(`CÒN MỘT VIỆC KHÔNG MÁY NÀO LÀM HỘ: khai \`${r.luuTruTen}\` vào Bản đồ file (AGENTS.md).`);
    return 0;
  }

  const rotate = argv.indexOf("--rotate");
  const thangEp = argv.indexOf("--thang") >= 0 ? argv[argv.indexOf("--thang") + 1] : null;
  if (rotate >= 0) {
    const file = argv[rotate + 1];
    if (!file || file.startsWith("--")) {
      console.error("Thiếu đường dẫn: node scripts/handoff.mjs --rotate <file> [--thang YYYY-MM]");
      return 2;
    }
    const text = fs.readFileSync(file, "utf8");
    const thangMoi = thangEp ?? thangHienTai();
    const thangCu = thangCua(text);
    if (thangCu === null) {
      fs.writeFileSync(file, datThang(text, thangMoi), "utf8");
      console.log(`đã khai tháng ${thangMoi} cho ${file} — chưa xoay (file chưa từng khai tháng nào).`);
      console.log("Nội dung cũ hơn tháng này nằm lại trong file tới lượt xoay sau. Cố ý: xoay theo");
      console.log("một tháng ĐOÁN ra từ ngày trong tiêu đề là câu máy không xác định được.");
      return 0;
    }
    if (thangCu === thangMoi) {
      console.log(`${file} đang khai tháng ${thangCu}, đúng tháng hiện tại — chưa cần xoay.`);
      return 0;
    }
    const dir = path.dirname(file);
    const so = soLuuTruTiepTheo(fs.readdirSync(dir));
    const r = xoay({ text, thangMoi, so, tenFile: path.basename(file) });
    const dichLuuTru = path.join(dir, r.luuTruTen);
    if (fs.existsSync(dichLuuTru)) {
      console.error(`HANDOFF_LUU_TRU_DA_CO: ${dichLuuTru} đã tồn tại. Dừng, không ghi đè.`);
      return 3;
    }
    fs.writeFileSync(dichLuuTru, r.luuTru, "utf8");
    fs.writeFileSync(file, r.moi, "utf8");
    console.log(`đã xoay ${file}: tháng ${r.thangCu} → ${dichLuuTru}, file hiện tại mở tháng ${thangMoi}.`);
    console.log(`CÒN MỘT VIỆC KHÔNG MÁY NÀO LÀM HỘ: khai \`${r.luuTruTen}\` vào Bản đồ file (AGENTS.md).`);
    return 0;
  }

  const files = argv.filter((a) => !a.startsWith("--") && /HANDOFF\.md$/.test(a));
  const dsFile = files.length ? files : MAC_DINH;
  let neo = 0;
  for (const f of dsFile) {
    let text;
    try { text = fs.readFileSync(f, "utf8"); } catch { console.log(`${f}: KHÔNG ĐỌC ĐƯỢC`); continue; }
    const ms = docMucTuFile(text);
    neo += ms.length;
    const b = ms.map((m) => m.byte).sort((x, y) => x - y);
    const tong = b.reduce((a, x) => a + x, 0);
    console.log(`${f}  tháng=${thangCua(text) ?? "CHƯA KHAI"}  mục=${b.length}`
      + (b.length ? `  min=${b[0]} trung-vị=${b[Math.floor(b.length / 2)]} max=${b[b.length - 1]} trung-bình=${Math.round(tong / b.length)}` : ""));
  }
  /* ĐẾM SỐ CHỖ MỎ NEO KHỚP. Ra 0 nghĩa là bộ bổ mục hỏng, KHÔNG nghĩa là "không có mục nào" —
   * ngày 06/09 đúng cái nhầm này xảy ra với năm lane khác nhau trong repo. */
  if (neo === 0) {
    console.error("HANDOFF_KHONG_KHOP: không bổ được mục nào trong toàn bộ danh sách file.");
    console.error("Đây là công cụ đo HỎNG, không phải 'không có gì phải sửa'. Kiểm dòng `## Log`.");
    return 3;
  }
  return 0;
}

const chayTrucTiep = process.argv[1]
  && path.basename(process.argv[1]) === "handoff.mjs";
if (chayTrucTiep) process.exit(chayCLI(process.argv.slice(2)));
