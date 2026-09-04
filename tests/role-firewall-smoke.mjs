/* Phép ghim cho HARD ROLE FIREWALL — brief `ROLE-DRIFT-01`, Đức chốt 2026-09-04.
 *
 * Vì sao có file này: ngày 04/09 phiên điều phối trượt sang debug extension, vì mục 4 của
 * `docs/protocols/ORCHESTRATOR.md` có một ngoại lệ "sửa nhỏ" với trần đếm vòng. Ngoại lệ
 * đã bị xoá. Phép kiểm này tồn tại để **không ai vô tình mở lại nó** — kể cả bằng một cách
 * viết khác.
 *
 * Ba luật viết phép kiểm, cả ba đều đã trả giá thật trong repo này:
 *
 *  1. **Cắt đúng phạm vi rồi mới khẳng định.** Không dùng `/mở đầu[\s\S]*?kết thúc/` —
 *     `[\s\S]*?` chạy tiếp ra ngoài phạm vi và làm phép kiểm xanh giả. Ba lượt thử phá đã
 *     thoát vì đúng lỗi này trong phiên viết F-25.
 *  2. **Đừng dùng `\b` cạnh chữ tiếng Việt.** `\b` dựa trên [A-Za-z0-9_] nên không tạo được
 *     biên cạnh `Đ`/`ế`, và regex sẽ khớp KHÔNG GÌ CẢ một cách im lặng.
 *  3. **Ghim vào cấu trúc, đừng chỉ dò một chữ.** Dò được một cách viết thì cách viết thứ
 *     hai lọt. Nên phép kiểm ghim vào: ba trường frontmatter + hình dạng mục 4 (bảng
 *     được/không được, chuỗi năm mục) + sự tồn tại của lối ra mục 4b.
 *
 * Chạy: `node tests/role-firewall-smoke.mjs`
 * Chạy trên một cây khác (dùng để thử phá): `node tests/role-firewall-smoke.mjs <thư-mục>`
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const doc = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

let so = 0;
const kiem = (ten, fn) => { fn(); so += 1; console.log("  ok  " + ten); };

/* --- dao cắt phạm vi ---------------------------------------------------------
 * Ba hàm dưới đây là toàn bộ chỗ chống "xanh giả". Chúng cắt ra ĐÚNG một khối rồi
 * trả về khối đó; mọi khẳng định phía dưới chỉ chạy trên khối đã cắt.
 */

/** Khối frontmatter: chỉ các dòng giữa hai dòng `---` ĐẦU TIÊN. null nếu không có. */
function frontmatter(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0] !== "---") return null;
  const ket = lines.indexOf("---", 1);
  if (ket < 0) return null;
  return lines.slice(1, ket);
}

/** Cắt file thành các mục theo tiêu đề `## `. Tiêu đề `### ` nằm lại trong thân. */
function cacMuc(text) {
  const out = [];
  let hienTai = null;
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith("## ")) {
      hienTai = { tieuDe: line.slice(3).trim(), than: [] };
      out.push(hienTai);
    } else if (hienTai) {
      hienTai.than.push(line);
    }
  }
  return out;
}

/** Một mục theo số hiệu, so khớp CẢ DẤU CHẤM nên "4" không nuốt "4b". */
function muc(text, so) {
  const s = cacMuc(text).find((m) => m.tieuDe.startsWith(so + ".") || m.tieuDe === so);
  return s ? { tieuDe: s.tieuDe, than: s.than.join("\n") } : null;
}

/** Một mục con `### ` bên trong thân của một mục `## `, cắt tới `### ` kế tiếp.
 *  Cần thật, không phải trang trí: chữ "DỪNG" có mặt ở HAI mục con của mục 4 (luật nạp báo
 *  cáo, và tự kiểm). Khẳng định đặt ở phạm vi cả mục 4 nên xoá được nó khỏi luật nạp báo
 *  cáo mà phép kiểm vẫn xanh — ca thử phá số 13 đã thoát đúng như vậy trước khi có hàm này. */
function mucCon(than, khoaTieuDe) {
  const lines = than.split(/\r?\n/);
  const dau = lines.findIndex((l) => l.startsWith("### ") && l.includes(khoaTieuDe));
  if (dau < 0) return null;
  const con = lines.findIndex((l, i) => i > dau && l.startsWith("### "));
  return lines.slice(dau + 1, con < 0 ? lines.length : con).join("\n");
}

/** Khối ```text đầu tiên trong một thân mục — tức chính câu Đức dán, không phải văn xuôi quanh nó. */
function khoiDan(than) {
  const lines = than.split(/\r?\n/);
  const dau = lines.findIndex((l) => l.trim() === "```text");
  if (dau < 0) return null;
  const ket = lines.findIndex((l, i) => i > dau && l.trim() === "```");
  if (ket < 0) return null;
  return lines.slice(dau + 1, ket).join("\n");
}

/** Ép văn xuôi về một dòng trước khi so khớp: markdown ngắt dòng ở cột 95, nên một câu
 *  luật hoàn toàn đúng vẫn trượt phép kiểm chỉ vì nó bị xuống dòng giữa chừng.
 *  (Đã cắn thật: `không chẩn đoán nguyên/nhân` nằm hai dòng.) */
const phang = (van) => van.replace(/\s+/g, " ");

const CHUOI_NAM_MUC = /DONE\s*→\s*STATE CHANGE\s*→\s*BLOCKER\s*→\s*HUMAN DECISION\s*→\s*NEXT WORK/;

const orch = doc("docs/protocols/ORCHESTRATOR.md");
const agents = doc("AGENTS.md");
const prompts = doc("PROMPTS.md");

/* --- 1. Hợp đồng máy đọc ----------------------------------------------------- */

kiem("ORCHESTRATOR: frontmatter khai đủ ba trường, đúng giá trị", () => {
  const fm = frontmatter(orch);
  assert.ok(fm, "sổ tay phải mở đầu bằng khối frontmatter");
  // Cố ý so khớp CẢ DÒNG trong PHẠM VI frontmatter: khai ba trường này ở thân file là
  // văn xuôi, không phải hợp đồng — máy đọc frontmatter, không đọc văn xuôi.
  for (const [truong, giaTri] of [
    ["role_scope", "control-plane"],
    ["product_debug", "forbidden"],
    ["product_code", "forbidden"]
  ]) {
    assert.ok(
      fm.some((l) => l.trim() === `${truong}: ${giaTri}`),
      `frontmatter thiếu hoặc sai \`${truong}: ${giaTri}\` — đây là hợp đồng máy đọc được của vai điều phối`
    );
  }
});

/* --- 2. Mục 4 là firewall, không còn là cửa cho phép -------------------------- */

kiem("ORCHESTRATOR: mục 4 là HARD ROLE FIREWALL", () => {
  const m = muc(orch, "4");
  assert.ok(m, "phải có mục 4");
  assert.ok(
    m.tieuDe.includes("HARD ROLE FIREWALL"),
    `mục 4 phải là firewall, đang là: "${m.tieuDe}"`
  );
  for (const cam of ["không code", "không debug product", "không đề xuất patch"]) {
    assert.ok(phang(m.than).includes(cam), `thân mục 4 phải cấm rõ: "${cam}"`);
  }
});

kiem("ORCHESTRATOR: mục 4 có bảng ĐƯỢC / KHÔNG được, và cột cấm có đủ ba món", () => {
  const m = muc(orch, "4");
  assert.ok(
    m.than.includes("| ĐƯỢC làm | KHÔNG được làm |"),
    "ranh giới phải là một BẢNG, không phải văn xuôi — brief mục 2.1"
  );
  // Ghim vào NỘI DUNG cột cấm, không chỉ vào việc bảng có tồn tại: một bảng rỗng cũng
  // là một bảng.
  for (const mon of ["Sửa code extension", "Viết hoặc sửa test", "Sửa runner, bridge"]) {
    assert.ok(phang(m.than).includes(mon), `bảng ranh giới thiếu món cấm: "${mon}"`);
  }
});

kiem("ORCHESTRATOR: không còn mục nào cho phép sửa code", () => {
  // Cấu trúc, không phải một chữ: mục cũ tên "4. Được sửa gì — trần cứng…". Bất kỳ tiêu đề
  // `## ` nào mang lại hình dạng "được sửa" đều là cửa mở lại.
  const tieuDe = cacMuc(orch).map((m) => m.tieuDe);
  const pham = tieuDe.filter((t) => /Được sửa|sửa nhỏ|ngoại lệ/i.test(t));
  assert.deepEqual(pham, [], `tiêu đề mở lại cửa sửa code: ${pham.join(" · ")}`);
});

kiem("ORCHESTRATOR: bảng mục 0 không còn chào mời 'sửa nhỏ'", () => {
  // Cắt đúng mục 0 rồi mới khẳng định. Mục 4 CÓ chữ "sửa nhỏ" (nó trích lại câu đã bị bác),
  // nên khẳng định này mà quét cả file thì đỏ oan — và nếu nới cho hết đỏ oan thì nó
  // ngừng bắt được gì.
  const m = muc(orch, "0");
  assert.ok(m, "phải có mục 0");
  assert.ok(
    !/sửa nhỏ/i.test(m.than),
    "bảng 'vai này là gì' đang chào mời sửa nhỏ — đó là lối vào đã bị đóng"
  );
});

/* --- 2b. Không có ghi đè trong phiên -----------------------------------------
 * Luật này có HAI NỬA, và hai nửa phải có hai khẳng định RIÊNG. Gộp làm một thì xoá mất
 * một nửa mà phép kiểm vẫn xanh — mà mỗi nửa hỏng theo một kiểu khác nhau: mất nửa cấm thì
 * firewall thành quy ước mềm; mất nửa cho phép thì Đức hết đường ra và sẽ ghi đè bằng miệng.
 */

const KHOA_GHI_DE = "Không có ghi đè trong phiên";

kiem("ORCHESTRATOR: nửa CẤM — không câu nào biến phiên điều phối thành executor 'lần này thôi'", () => {
  const gd = mucCon(muc(orch, "4").than, KHOA_GHI_DE);
  assert.ok(gd, "mục 4 phải có mục con `### Không có ghi đè trong phiên`");
  const p = phang(gd);
  assert.ok(
    p.includes("Không có câu nào biến phiên điều phối thành executor"),
    "phải cấm thẳng việc ghi đè trong phiên"
  );
  assert.ok(p.includes("Kể cả câu của Đức."), "phải nói rõ lệnh cấm áp cả cho Đức — đó là chỗ luật này để ngỏ trước đây");
});

kiem("ORCHESTRATOR: nửa CHO PHÉP — đổi vai tường minh, kèm đủ ba điều kiện", () => {
  const gd = mucCon(muc(orch, "4").than, KHOA_GHI_DE);
  const p = phang(gd);
  assert.ok(
    p.includes("ĐỔI VAI, không phải ngoại lệ"),
    "phải phân biệt rõ: quyền tối cao của Đức là đổi vai, KHÔNG phải một ngoại lệ làm luôn"
  );
  const cau = khoiDan(gd);
  assert.ok(cau, "phải cho Đức sẵn một khối ```text để dán — lối ra không có câu để dán là lối ra trên giấy");
  assert.ok(
    /Kết thúc vai Assistant, chuyển phiên này thành Executor/.test(cau),
    "câu đổi vai tường minh phải nằm TRONG khối dán"
  );
  for (const dk of [
    "Checkpoint trạng thái Assistant TRƯỚC",
    "KHÔNG CÒN là Assistant",
    "Mặc định vẫn nên mở executor riêng"
  ]) {
    assert.ok(p.includes(dk), `thiếu điều kiện đổi vai: "${dk}"`);
  }
});

/* --- 3. Luật nạp báo cáo ------------------------------------------------------ */

kiem("ORCHESTRATOR: luật nạp báo cáo — chuỗi năm mục, đúng thứ tự, kèm lệnh DỪNG", () => {
  const nap = mucCon(muc(orch, "4").than, "Luật nạp báo cáo");
  assert.ok(nap, "mục 4 phải có mục con `### Luật nạp báo cáo`");
  assert.match(nap, CHUOI_NAM_MUC, "luật nạp báo cáo phải có nguyên chuỗi năm mục, đúng thứ tự");
  assert.ok(phang(nap).includes("DỪNG"), "phải nói rõ là DỪNG sau năm mục, không đi tiếp");
  assert.ok(
    phang(nap).includes("không chẩn đoán nguyên nhân"),
    "phải cấm thẳng việc chẩn đoán nguyên nhân — đó là chỗ trượt vai ngày 04/09"
  );
});

kiem("ORCHESTRATOR: mục 4 có câu tự kiểm trước mỗi lượt trả lời", () => {
  const tu = mucCon(muc(orch, "4").than, "Tự kiểm");
  assert.ok(tu, "mục 4 phải có mục con `### Tự kiểm`");
  assert.ok(
    phang(tu).includes("quản lý công việc hay đang giải bài kỹ thuật"),
    "thiếu chính câu tự kiểm mà brief mục 2.1 chốt"
  );
  assert.ok(phang(tu).includes("DỪNG"), "tự kiểm phải kết bằng lệnh DỪNG, không phải lời khuyên");
});

/* --- 4. LỐI RA --------------------------------------------------------------- */

kiem("ORCHESTRATOR: có mục 4b — lối ra bàn giao cho executor", () => {
  const m = muc(orch, "4b");
  assert.ok(m, "firewall mà không có lối ra thì chỉ đổi 'trượt vai' thành 'tắc' — brief mục 2.2");
  assert.ok(phang(m.than).includes("docs/briefs/"), "phải nói brief đặt ở đâu");
  // Theo dõi bằng HAI cơ chế đã có, không phát minh cơ chế thứ ba.
  assert.ok(phang(m.than).includes("claim.mjs --list"), "theo dõi bằng bảng quyền");
  assert.ok(phang(m.than).includes("HANDOFF.md"), "theo dõi bằng Log");
});

kiem("ORCHESTRATOR: mục 4b nói brief tối thiểu phải có những gì", () => {
  const m = muc(orch, "4b");
  for (const cot of ["Defect", "Phải làm gì", "Ranh giới", "Khoá cần", "Xong khi nào", "Hỏi ai"]) {
    assert.ok(phang(m.than).includes(cot), `mục brief tối thiểu còn thiếu: "${cot}"`);
  }
});

/* --- 5. Con trỏ ở AGENTS.md gốc ---------------------------------------------- */

kiem("AGENTS.md gốc: con trỏ không còn quảng bá trần đếm vòng", () => {
  const dong = agents.split(/\r?\n/).filter((l) => l.includes("docs/protocols/ORCHESTRATOR.md"));
  assert.ok(dong.length > 0, "AGENTS.md phải còn trỏ sang sổ tay điều phối");
  for (const l of dong) {
    assert.ok(
      !/vòng sửa/.test(l),
      "con trỏ đang quảng cáo đúng cái rule vừa bị bác (trần hai vòng sửa–chạy–sửa)"
    );
  }
  assert.ok(
    dong.some((l) => l.includes("HARD ROLE FIREWALL")),
    "con trỏ phải nói firewall — Đức đọc bảng này chứ không mở sổ tay"
  );
  assert.ok(dong.some((l) => CHUOI_NAM_MUC.test(l)), "con trỏ phải nêu luật năm mục");
});

/* --- 6. Câu dán ở PROMPTS.md -------------------------------------------------- */

kiem("PROMPTS.md mục 0: luật năm mục nằm TRONG câu dán, không phải ở văn xuôi quanh nó", () => {
  const m = muc(prompts, "0");
  assert.ok(m, "phải có mục 0 — mở một phiên điều phối");
  const dan = khoiDan(m.than);
  assert.ok(dan, "mục 0 phải có khối ```text để Đức chép");
  // Đây là chỗ dễ xanh giả nhất của cả file: văn xuôi giải thích nằm ngay cạnh câu dán,
  // nên một khẳng định quét cả mục sẽ xanh dù câu dán trống rỗng. Cắt lấy khối rồi mới hỏi.
  assert.match(dan, CHUOI_NAM_MUC, "câu Đức dán phải chứa nguyên chuỗi năm mục");
  assert.ok(phang(dan).includes("KHÔNG code"), "câu dán phải cấm code ngay trong câu");
  assert.ok(
    phang(dan).includes("triệu chứng"),
    "câu dán phải nói BLOCKER chỉ ghi triệu chứng — không thì AI vẫn chẩn đoán tiếp"
  );
});

console.log(`role-firewall-smoke: ${so} phép — XANH`);
