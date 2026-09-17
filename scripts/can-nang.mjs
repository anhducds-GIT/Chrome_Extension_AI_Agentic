/* CÂN NẶNG — bộ khung này đang nặng bao nhiêu, và nặng thế có còn dùng được không?
 *
 *   node scripts/can-nang.mjs            # báo cáo
 *   node scripts/can-nang.mjs --nhanh    # bỏ phép đo thời gian (chậm nhất)
 *
 * VÌ SAO CÓ FILE NÀY. Mọi cổng kiểm khác trong repo hỏi "có đúng không". File này hỏi câu ngược
 * lại: **"có đáng không"**. Không ai hỏi câu đó thì một bộ khung chỉ có thể phình ra — mỗi lần
 * gặp lỗi là thêm một luật, và không lần nào bớt. Sau vài tháng thì:
 *
 *   - AI mất nửa phiên chỉ để đọc luật, chưa làm gì đã hết chỗ nhớ;
 *   - luật nhiều tới mức mâu thuẫn nhau, và AI chọn nhánh nào cũng "đúng luật";
 *   - đóng phiên mất vài phút, nên người ta bắt đầu bỏ qua cổng.
 *
 * Cả ba đều làm hệ thống TỆ ĐI dù mỗi luật thêm vào đều hợp lý lúc thêm. Đó là lý do cân nặng
 * phải được ĐO, chứ không để cảm tính — cảm tính luôn nói "thêm một cái nữa thì có sao đâu".
 *
 * FILE NÀY CỐ Ý KHÔNG NẰM TRONG CỔNG ĐÓNG PHIÊN. Thêm một phép kiểm vào mỗi phiên để chống
 * "quá nhiều phép kiểm mỗi phiên" thì tự mâu thuẫn. Nó chạy theo nhịp tháng — xem
 * `docs/BAO-TRI-DINH-KY.md`.
 */

import { execSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readStructureFromDisk, THU_MUC_DOCS_KHONG_TINH } from "./repo-structure.mjs";
import { napContext } from "./rule-compiler.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NL = String.fromCharCode(10);

/* NGÂN SÁCH. Đây là những con số CÓ THỂ SAI, và sai thì sửa ở đây — nhưng phải sửa CÓ LÝ DO ghi
   lại, không phải nới ra cho vừa hiện trạng. Nới ngân sách để báo cáo đẹp lên là đúng cái bệnh
   file này sinh ra để bắt. */
export const NGAN_SACH_MAC_DINH = {
  tongTaiLieu: 2200,   // tổng dòng tài liệu (không tính bản trích)
  soPhepKiem: 30,      // tổng phép kiểm hai cổng
  giayDongPhien: 180,  // giây để chạy trọn bộ kiểm khi đóng phiên
  soNhatKy: 600,       // dòng HANDOFF.md — thứ phình nhanh nhất và chưa từng có nhịp dọn
  tiLeDaDong: 50,      // % mục nợ đã đóng còn nằm trong sổ; quá thì chuyển sang kho lưu
  soPhatHanh: 300,     // dòng CHANGELOG.md — sổ chỉ-thêm, không bao giờ nhỏ lại
  /* TRẦN TOKEN cho phần MỌI phiên phải nạp. Đức chốt 09/09 hai lượt: trước là *"giảm mọi phiên
     xuống 4.000–6.000 token"*, sau là *"mục tiêu không phải đạt ngưỡng, mà phải nhỏ hơn ngưỡng
     margin là 30-40%, vì sau này sẽ tiếp tục phình ra"* — nên trần SIẾT xuống 4.000, tức đúng
     mức thấp của dải cũ, và phần nạp phải nằm dưới nó chứ không chạm nó. Đây là con số duy nhất
     trong bảng này nhân theo (số repo × số phiên), nên nới nó đắt hơn mọi mục khác. `docBatBuoc`
     (đo bằng DÒNG) bỏ đi vì nó đo sai đơn vị: nó báo 284/300 ĐẠT trong khi thứ nạp thật là
     ~13.800 token. */
  tokenNap: 4200
};

/* NGÂN SÁCH KHAI ĐƯỢC, vì repo khác có kích thước khác. Repo nhỏ mà bắt theo ngân sách của một
   bộ khung 3000 dòng là bắt nó im lặng chịu đỏ; repo lớn mà dùng ngân sách nhỏ thì con số mất
   nghĩa. Khai `budget` trong `.repo-structure.json`; không khai thì dùng mặc định trên. */
export function nganSachTu(structure) {
  const khai = structure?.budget;
  const ra = { ...NGAN_SACH_MAC_DINH };
  if (khai === undefined) return ra;
  /* SAI KIỂU PHẢI NÓI RA, KHÔNG ĐƯỢC LÙI VỀ MẶC ĐỊNH IM LẶNG.
     Bản đầu viết `if (!khai || typeof khai !== "object") return ra` — nên `"budget": "rất lớn"`
     hay `"budget": 5` đều lặng lẽ thành "không khai", và người viết tưởng ngân sách riêng của
     mình đang có hiệu lực. Audit độc lập Codex bắt được 05/09, cùng ngày khối này ra đời. */
  if (khai === null || typeof khai !== "object" || Array.isArray(khai)) {
    throw new Error(`BUDGET_HONG: \`budget\` phải là object các mục ngân sách. Đang là: ${Array.isArray(khai) ? "mảng" : typeof khai}`);
  }
  for (const [k, v] of Object.entries(khai)) {
    if (k.startsWith("_")) continue;
    if (!(k in ra)) throw new Error(`BUDGET_HONG: \`budget.${k}\` không phải mục ngân sách. Hợp lệ: ${Object.keys(ra).join(", ")}`);
    /* CÓ TRẦN, và trần là phần khiến khối này còn nghĩa. Không trần thì `1e300` hợp lệ, mọi chỉ
       số thực tế đều nằm dưới ngân sách, và thước đo im lặng mất tác dụng — cách vô hiệu hoá nó
       mà bảng vẫn xanh. Trần đặt ở 100 lần mặc định: đủ rộng cho repo lớn thật, đủ hẹp để một
       con số vô nghĩa bị chặn. */
    const tran = NGAN_SACH_MAC_DINH[k] * 100;
    if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) {
      throw new Error(`BUDGET_HONG: \`budget.${k}\` phải là số dương. Đang là: ${JSON.stringify(v)}`);
    }
    if (v > tran) {
      throw new Error(`BUDGET_HONG: \`budget.${k}\` = ${v} vượt trần ${tran} (100 lần mặc định ${NGAN_SACH_MAC_DINH[k]}). Một ngân sách lớn tới mức không bao giờ chạm là cách vô hiệu hoá thước đo trong khi bảng vẫn xanh. Repo lớn thật thì nới vừa đủ, và ghi lý do vào decisions.md.`);
    }
    ra[k] = v;
  }
  return ra;
}

const dem = (rel) => {
  try { return fs.readFileSync(path.join(ROOT, rel), "utf8").split(NL).length; } catch { return 0; }
};

/* Đếm mục nợ: tổng và đã đóng. Nhận diện "đã đóng" bằng ĐÚNG quy ước sổ (gạch mã `~~`), không
   dò từ khoá trong văn xuôi — cùng lý do như cờ chờ-chốt ở `what-next.mjs`. */
function docSoNo() {
  let text = "";
  try { text = fs.readFileSync(path.join(ROOT, "BACKLOG.md"), "utf8"); } catch { return { tong: 0, daDong: 0 }; }
  const dong = text.split(NL);
  const muc = dong.filter((l) => /^###\s+~*\s*[A-Za-z0-9]+-\d+/.test(l));
  const daDong = muc.filter((l) => /^###\s+~~/.test(l));
  return { tong: muc.length, daDong: daDong.length };
}

/* `docs/archive/` KHÔNG tính vào ngân sách tài liệu — và đây là bản vá của một mâu thuẫn
   THẬT trong chính file này (đo 06/09).

   Bản trước bảo người dùng "chuyển các lượt CŨ sang docs/archive/HANDOFF-<năm>-<tháng>.md",
   trong khi `liet("docs")` quét ĐỆ QUY cả `docs/`. Nghĩa là làm đúng lời khuyên thì 673 dòng
   nhật ký vượt ngân sách được dời từ một chỗ KHÔNG bị đếm (`HANDOFF.md` có ngân sách riêng)
   vào một chỗ ĐANG bị đếm — tổng tài liệu TĂNG, và người làm đúng bị phạt.

   Vì sao miễn là đúng chứ không phải nới lỏng: ngân sách này đo THỨ MỌI PHIÊN PHẢI NẠP.
   Lưu trữ theo định nghĩa là thứ không nạp mỗi lần — cất gọn để tra khi cần. Đếm nó là đo
   sai thứ mình định đo. Chữ vẫn còn nguyên trong repo, luật "chỉ thêm dòng" không bị vi phạm. */
// Tên thư mục lưu trữ khai ở `repo-structure.mjs` — cổng đóng phiên cũng đọc đúng hằng số đó.

const liet = (thuMuc) => {
  const ra = [];
  const di = (d) => {
    let mucs;
    try { mucs = fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }); } catch { return; }
    for (const m of mucs) {
      const p = `${d}/${m.name}`;
      /* TRỪ ĐÚNG BA THƯ MỤC MÀ CỔNG ĐÓNG PHIÊN TRỪ — dùng chung một hằng số, không tự liệt kê.
         Bản cũ chỉ trừ `archive/`, nên hai phép đo của CÙNG MỘT THỨ trong cùng repo cho hai con
         số khác nhau: cổng nói 3.185, lệnh này nói 6.012. Nặng hơn: nó đếm cả `docs/adr/`, mà
         ADR đã Accepted là BẤT BIẾN theo luật — tức mỗi quyết định mới làm con số này đỏ hơn và
         không có cách nào hợp lệ để hạ xuống. Một thước không bao giờ xanh được thì người ta nói
         cho xong; đó đúng là điều `.repo-structure.json` đã ghi khi trừ ba thư mục này. */
      if (m.isDirectory()) { if (!THU_MUC_DOCS_KHONG_TINH.includes(m.name)) di(p); }
      else if (m.name.endsWith(".md")) ra.push(p);
    }
  };
  di(thuMuc);
  return ra;
};

/* ĐỌC BẮT BUỘC — chỉ tính thứ luật bắt đọc TRƯỚC KHI gõ dòng đầu tiên (mục 0 của AGENTS.md).
   Tài liệu "mở khi cần" KHÔNG tính: nó không tốn gì của phiên không dùng tới. Phân biệt hai loại
   này là điểm mấu chốt — gộp lại thì mọi tài liệu đều thành nợ, và không ai dám viết gì nữa. */
/* HANDOFF CHỈ TÍNH PHẦN ĐUÔI, và đây là chỗ bản đầu đo SAI.
 *
 * Luật (mục 0) bảo đọc "phần cuối" của HANDOFF, không phải cả file. Mà HANDOFF là sổ CHỈ THÊM —
 * nó dài ra mãi. Đếm cả file nghĩa là ngân sách chắc chắn vỡ, không phải vì hệ thống nặng lên
 * mà vì lịch sử dài ra. Một cái cân báo động vì thứ không ai phải đọc thì sẽ bị tắt, và lúc đó
 * nó không còn canh gì nữa.
 *
 * Chính cái cân này đã tự báo sai như thế ngay lần chạy thứ hai — 305/300, trong đó phần đuôi
 * thật sự phải đọc chỉ khoảng một phần ba. */
export const DUOI_HANDOFF = 40;

export function docBatBuoc() {
  const dongHandoff = Math.min(dem("HANDOFF.md"), DUOI_HANDOFF);
  return [
    { file: "AGENTS.md", dong: dem("AGENTS.md") },
    { file: `HANDOFF.md (${DUOI_HANDOFF} dòng cuối)`, dong: dongHandoff }
  ];
}

export function demPhepKiem() {
  let b = 0;
  let s = 0;
  // ĐẾM THỨ THẬT SỰ CHẠY, đừng đếm tên hàm. Bản đầu dò tên hàm và ra 10, trong khi cổng chạy
  // 15 — năm phép kiểm sinh ra từ hàm dùng chung nên không có tên riêng. Một cái cân báo thiếu
  // một phần ba thì tệ hơn không có cân: nó cho phép phình thêm mà vẫn thấy còn dư ngân sách.
  // Cùng họ với mọi lỗi khác đã vá hôm nay — dò theo TÊN thay vì đo thứ có thật.
  {
    let ra = "";
    try {
      ra = execSync("node scripts/check-bootstrap.mjs --all", { cwd: ROOT, encoding: "utf8" });
    } catch (e) {
      ra = String(e.stdout || "");   // thoát khác 0 là chuyện thường: có phép kiểm đang đỏ
    }
    const ma = ra.split(NL).map((l) => (l.match(/\]\s+(B[0-9]+)\s/) || [])[1]).filter(Boolean);
    b = new Set(ma).size;
  }
  try {
    const t = fs.readFileSync(path.join(ROOT, "scripts", "session-check.mjs"), "utf8");
    const m = t.match(/EXPECTED_CHECKS = ([0-9]+)/);
    s = m ? Number(m[1]) : 0;
  } catch { /* nt */ }
  return { cauTruc: b, dongPhien: s, tong: b + s };
}

/* LUẬT NÀO CHƯA TỪNG CHẶN ĐƯỢC GÌ — phép đo NGƯỢC, và là phép đo khó có nhất.
 *
 * `docs/BAO-TRI-DINH-KY.md` đã hỏi câu này từ đầu, nhưng hỏi suông: không ai trả lời nổi "luật
 * này tháng qua chặn được mấy lần" khi không có gì ghi lại. Nên cổng đóng phiên nay ghi một dòng
 * mỗi lần chạy vào thư mục tạm của máy (KHÔNG nằm trong repo, mỗi máy một bản).
 *
 * Một phép kiểm chưa từng đỏ KHÔNG tự động là đồ thừa — có thể nó đang làm tốt việc răn đe. Nên
 * đây là DANH SÁCH ĐỂ HỎI, không phải danh sách để xoá. Câu hỏi đúng là: *dựng nổi ca hỏng cho
 * nó không?* Không dựng nổi thì nó chưa bao giờ là một phép kiểm thật. */
export function luatChuaTungChan(dongLog) {
  const daDo = new Set();
  const daThay = new Set();
  for (const d of dongLog) {
    for (const t of d.ten ?? []) daThay.add(t);
    for (const t of d.do ?? []) daDo.add(t);
  }
  return { soLanChay: dongLog.length, chuaTungDo: [...daThay].filter((t) => !daDo.has(t)).sort() };
}

export function docLog() {
  try {
    // Cùng chỗ mà cổng ghi: thư mục tạm của MÁY NÀY, khoá theo đường dẫn repo. Sổ cố ý KHÔNG
    // nằm trong repo — cổng đi theo bản trích sang mọi repo khác, và một file lạ trong repo
    // đích sẽ bị chính phép kiểm bản đồ của nó bắt. Lý do đầy đủ ở `session-check.mjs`.
    const khoa = crypto.createHash("sha256").update(ROOT).digest("hex").slice(0, 16);
    return fs.readFileSync(path.join(os.tmpdir(), "ark-harness-gate-log", khoa + ".jsonl"), "utf8")
      .split(NL).filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean);
  } catch { return []; }
}

/* ---- chạy ------------------------------------------------------------------ */

const THIS = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(THIS)) {
  const nhanh = process.argv.includes("--nhanh");
  const canh = [];
  const dong = (nhan, thuc, budget, donVi) => {
    const qua = thuc > budget;
    if (qua) canh.push(nhan);
    console.log(`  ${qua ? "✗" : "✓"} ${nhan.padEnd(34)} ${String(thuc).padStart(5)} / ${budget} ${donVi}`);
  };

  const NS = nganSachTu(readStructureFromDisk(ROOT));
  console.log(`${NL}CÂN NẶNG BỘ KHUNG — "có đáng không", không phải "có đúng không"${NL}`);

  /* ---- BÁNH CÓC PHẢI CÓ RĂNG ---------------------------------------------
   * Audit độc lập 17/09: `budget.*` tự xưng là bánh cóc (*"chỉ được HẠ"*), nhưng **không gì so
   * nó với chính nó của hôm qua**. Chuỗi hỏng Codex đưa ra, và nó chạy được:
   *   ⑴ thêm 1.500 dòng tài liệu · ⑵ nâng `tongTaiLieu` lên trong CÙNG commit ·
   *   ⑶ `can-nang` chỉ so số thực với con số MỚI · ⑷ XANH, và không máy nào nói trần vừa bị nới.
   * Tức "chỉ được HẠ" là một lời hứa, không phải một cơ chế — đúng bài
   * `hard-cap-at-generation-not-a-ratchet` mà chính repo này đã ghi.
   *
   * Nay so với `HEAD`. Nới một trần là một dòng ✗ có tên, không phải một lượt im lặng.
   * KHÔNG đọc được `HEAD` thì nói KHÔNG ĐO ĐƯỢC — đừng lặng lẽ cho qua, vì "không có gì nới"
   * và "không kiểm được" đọc y hệt nhau. */
  try {
    const cu = JSON.parse(execSync("git show HEAD:.repo-structure.json", { cwd: ROOT, encoding: "utf8" }))?.budget ?? {};
    /* KHOÁ MỚI CŨNG PHẢI KỂ RA — audit vòng 2, 17/09. Bản đầu lọc `typeof cu[k] === "number"`,
       nên **thêm hẳn một mục ngân sách mới** với con số tuỳ ý thì `cu[k]` vắng mặt và lượt so
       im lặng bỏ qua. Đó là đúng cái cửa mà cả khối này sinh ra để đóng, chỉ đi vòng một bước.
       Khoá BỊ XOÁ thì không kể: bỏ một thước là siết, không phải nới. */
    const them = Object.entries(NS)
      .filter(([k, v]) => typeof v === "number" && !(k in cu) && k in (JSON.parse(fs.readFileSync(path.join(ROOT, ".repo-structure.json"), "utf8"))?.budget ?? {}))
      .map(([k, v]) => `${k} (MỚI) = ${v}`);
    const noi = Object.entries(NS)
      .filter(([k, v]) => typeof cu[k] === "number" && typeof v === "number" && v > cu[k])
      .map(([k, v]) => `${k} ${cu[k]} → ${v}`)
      .concat(them);
    if (noi.length) {
      canh.push(`TRẦN VỪA BỊ NỚI: ${noi.join(" · ")}`);
      console.log(`  ✗ ${"Trần so với HEAD".padEnd(34)} NỚI LÊN: ${noi.join(" · ")}`);
      console.log("      Bánh cóc chỉ được HẠ. Nới thì phải có ADR nói vì sao con số CŨ sai —");
      console.log("      không phải vì nó đang vướng. Hạ lại, hoặc viết ADR rồi nói ra ở HANDOFF.");
    }
  } catch (e) {
    /* "KHÔNG ĐO ĐƯỢC" KHÔNG PHẢI "ĐẠT" — audit vòng 2 nêu, và đó là luật ba-trạng-thái của
       chính repo này. Bản đầu chỉ in một dòng rồi vẫn thoát 0, tức một lượt chạy mù đọc y hệt
       một lượt chạy sạch. Nay nó vào `canh`, nên mã thoát nói thật. */
    const vi = String(e.message).split(NL)[0].slice(0, 60);
    canh.push(`KHÔNG so được trần với HEAD (${vi})`);
    console.log(`  ✗ ${"Trần so với HEAD".padEnd(34)} KHÔNG ĐO ĐƯỢC — ${vi}`);
    console.log("      Không đo được thì không được tính là đạt. Kho chưa có commit nào, hay");
    console.log("      `git show HEAD:.repo-structure.json` không đọc được?");
  }

  /* ĐO BẰNG TOKEN, không bằng dòng — Đức chốt 09/09. Dùng chung `napContext` với cổng đóng
     phiên và với `npm run luat -- --nap`: ba chỗ hỏi cùng một câu thì phải đọc cùng một phép đo,
     không thì sớm muộn chúng nói ba con số. */
  const nap = napContext(ROOT, NS.tokenNap);
  dong("Token MỌI phiên phải nạp", nap.napToken, NS.tokenNap, "token");
  for (const t of nap.nhan) console.log(`      ${t.file.padEnd(30)} ${String(t.token).padStart(5)} token`);
  console.log(`      KHÔNG nạp (mở khi cần)         ${String(nap.khongNapToken).padStart(5)} token trong ${nap.khiCan.length} file docs/`);

  const taiLieu = [...liet("docs"), "README.md", "CHANGELOG.md", "STATUS.md"];
  const tongTL = taiLieu.reduce((a, f) => a + dem(f), 0);
  dong("Tổng tài liệu (không kể bản trích)", tongTL, NS.tongTaiLieu, "dòng");

  /* HAI SỐ ĐO CHO TOKEN. Chúng đo thứ mà mọi phiên AI phải nạp, ở mọi repo — nên tiết kiệm ở
     đây nhân lên theo (số repo × số phiên), khác hẳn tài liệu tra cứu chỉ đọc khi cần. */
  const nhatKy = dem("HANDOFF.md");
  dong("Nhật ký bàn giao (HANDOFF.md)", nhatKy, NS.soNhatKy, "dòng");
  if (nhatKy > NS.soNhatKy) {
    console.log("      → chuyển các lượt CŨ sang docs/archive/HANDOFF-<năm>-<tháng>.md, giữ nguyên chữ.");
    console.log("        Đây là DỜI CHỖ, không phải xoá: luật 'chỉ thêm dòng' cấm viết lại lịch sử,");
    console.log("        không cấm cất gọn nó. Phiên sau vẫn đọc được, chỉ là không nạp mỗi lần.");
  }

  const so = docSoNo();
  if (so.tong) {
    const tiLe = Math.round((so.daDong / so.tong) * 100);
    dong("Mục nợ ĐÃ ĐÓNG còn nằm trong sổ", tiLe, NS.tiLeDaDong, `% (${so.daDong}/${so.tong} mục)`);
    if (tiLe > NS.tiLeDaDong) {
      console.log("      → chuyển mục đã đóng sang docs/archive/BACKLOG-da-dong.md.");
      console.log("        Sổ nợ là thứ vai điều phối đọc mỗi lượt; nửa sổ là việc đã xong thì");
      console.log("        mỗi lượt đọc trả tiền cho phần không còn dùng.");
    }
  }

  const pk = demPhepKiem();
  dong("Số phép kiểm", pk.tong, NS.soPhepKiem, `(${pk.cauTruc} cấu trúc + ${pk.dongPhien} đóng phiên)`);

  if (!nhanh) {
    /* ĐO ĐÚNG LỆNH MÀ LUẬT BẢO PHIÊN CHẠY — `npm run test:song-song`, không phải `npm test`.
     *
     * Đổi 17/09 (`A4`), và đây là đổi CÁI GÌ ĐƯỢC ĐO chứ không phải hạ thước. Thước vẫn 180.
     *
     * Vì sao: mốc đóng phiên ở `MULTIFLOW.md` mục 3b và câu Đức dán ở `PROMPTS.md` mục 4 đều
     * nói `npm run test:song-song`. Không luật nào bảo ai chạy `npm test` lúc đóng phiên. Mà
     * `npm test` là chuỗi **cố ý tuần tự** — nó phải giữ nguyên hình dạng vì một phép ghim ở
     * `duc-auto-gemini` đọc thẳng `scripts.test` để bắt xanh giả (`N-43`), nên nó là một hợp
     * đồng với phép ghim đó, không phải đường chạy của người.
     *
     * Đo 17/09, cùng một cây làm việc:
     *     npm test            29 suite · 233 giây   ← thứ hoá đơn này đang tính, và không ai chạy
     *     test:song-song      36 suite · 116 giây   ← thứ luật bảo chạy
     * Tức bản cũ tính tiền cho một đường **vừa chậm gấp đôi vừa hụt 7 suite**. Đường mới rộng
     * hơn VÀ rẻ hơn; không có đánh đổi nào phải cân ở đây.
     *
     * CHỖ HỞ, nói ra chứ không giấu: `test:song-song` chạy song song nên con số phụ thuộc số
     * lõi của máy. Nó đo *"máy Đức mất bao lâu"*, không đo *"tốn bao nhiêu công"*. Đó đúng là
     * thứ cái trần này quan tâm — trần sinh ra vì một vòng sửa–chạy quá chậm thì người ta bỏ
     * chạy — nhưng một máy yếu hơn sẽ thấy số khác, và đó là hành vi ĐÚNG, không phải nhiễu. */
    const t0 = Date.now();
    try { execSync("npm run test:song-song", { cwd: ROOT, stdio: "ignore" }); } catch { /* đỏ cũng vẫn tính giờ */ }
    dong("Thời gian chạy trọn bộ kiểm", Math.round((Date.now() - t0) / 1000), NS.giayDongPhien, "giây");
    console.log("      → đo `npm run test:song-song` (đường luật bảo chạy lúc đóng phiên), không");
    console.log("        phải `npm test`. Chuỗi tuần tự giữ nguyên cho phép ghim N-43, xem mã.");
  } else {
    console.log("  · Thời gian chạy: BỎ QUA (--nhanh)");
  }

  const log = docLog();
  const kq = luatChuaTungChan(log);
  console.log(`${NL}  PHÉP KIỂM CHƯA TỪNG ĐỎ — qua ${kq.soLanChay} lần chạy cổng đã ghi lại:`);
  if (!kq.soLanChay) {
    console.log("      (chưa có dữ liệu — chạy cổng đóng phiên vài lần rồi quay lại)");
  } else if (!kq.chuaTungDo.length) {
    console.log("      (không có — mọi phép kiểm đều đã bắt được ít nhất một lần)");
  } else {
    /* CÂU HỎI NÀY ĐÃ CÓ CHỖ TRẢ LỜI, nên đừng hỏi lại mãi.
     *
     * "Chưa từng đỏ" đếm các lượt chạy THẬT, và một ca hỏng dựng trong phép kiểm thì không bao
     * giờ vào đó. Nếu chỉ liệt kê, danh sách này lặp lại y nguyên sau mỗi phiên — kể cả những
     * mục đã có ca hỏng dựng sẵn. Một lời nhắc đã được trả lời mà vẫn kêu là cách nhanh nhất
     * khiến người ta bỏ qua cả danh sách. */
    const CA_HONG = "tests/cong-do-that.mjs";
    let vanBan = "";
    try { vanBan = fs.readFileSync(path.join(ROOT, CA_HONG), "utf8"); } catch { /* chưa có file */ }
    const coCaHong = (ten) => vanBan.includes(ten);
    const daTraLoi = kq.chuaTungDo.filter(coCaHong);
    const conHoi = kq.chuaTungDo.filter((t) => !coCaHong(t));

    for (const t of conHoi) console.log(`      · ${t}`);
    if (daTraLoi.length) {
      console.log(`      ${conHoi.length ? "—" : ""} ${daTraLoi.length} mục đã có ca hỏng dựng sẵn ở ${CA_HONG}:`);
      for (const t of daTraLoi) console.log(`        ✓ ${t}`);
      /* CÂU NÀY LÀ MỘT LỜI TRÍCH, KHÔNG PHẢI MỘT PHÉP ĐO. Ở đây chỉ dò TÊN trong văn bản file
         ca hỏng — nó không chạy gì cả, nên một cái tên nằm trong chú thích cũng ăn dấu ✓. Bản
         trước viết thẳng *"đã chứng minh là ĐỎ ĐƯỢC"*, tức khai một kết quả mình chưa hề đo.
         Đó đúng cái bệnh `A1` đi chữa, nên không được phép tái diễn ngay trong công cụ đo. */
      console.log("        (chưa đỏ trong lượt chạy thật · XÁC NHẬN bằng `npm run test:do-that` ≈25 giây)");
    }
    if (conHoi.length) {
      console.log(`${NL}      Đây là danh sách để HỎI, không phải để xoá. Với từng cái: dựng nổi ca`);
      console.log("      hỏng cho nó không? Không dựng nổi thì nó chưa bao giờ là phép kiểm thật.");
    }
  }

  console.log(`${NL}${canh.length ? `QUÁ NGÂN SÁCH ${canh.length} chỗ: ${canh.join(", ")}.
Trước khi nới ngân sách, hãy thử BỚT — mỗi luật thêm vào nên thay chỗ một luật cũ.` : "TRONG NGÂN SÁCH — chưa cần cắt gì."}${NL}`);
  process.exit(canh.length ? 1 : 0);
}
