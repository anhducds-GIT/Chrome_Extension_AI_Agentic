/* TRÍCH SỐ MỤC CỦA `AGENTS.md` PHẢI TRỎ ĐÚNG CHỖ — và tên mục phải khớp.
 *
 * VÌ SAO CÓ FILE NÀY (đo 2026-09-17, lượt rà `A5`): `AGENTS.md` đã được đánh số lại khi nén
 * luật. Sau lượt đó, **21 chỗ trên mặt luật sống vẫn trích số cũ**, và ba cái trong số đó dẫn
 * người đọc tới một mục nói chuyện KHÁC hẳn:
 *
 *   `ORCHESTRATOR.md` "mục 3 (*Phải hỏi Đức trước*)" → mục 3 nay là *Kiểm, commit, đẩy*
 *   `ORCHESTRATOR.md` "mục 7 (*Sổ tay*)"             → mục 7 nay là *Giới hạn*
 *   `MULTIFLOW.md`    "mục 1 (*Khoá*)"               → mục 1 nay là *Một phiên*
 *
 * Trích sai số KHÔNG nổ như mã sai: người đọc mở đúng file, thấy một mục có thật, đọc nó, rồi
 * làm theo một luật không liên quan. Không cổng nào đỏ, không ai biết. Đó là lý do phép ghim
 * này ghim vào CẤU TRÚC (số + tên) chứ không chỉ dò một chữ.
 *
 * PHẠM VI — và vì sao nó dừng ở đó:
 *   QUÉT   mặt luật SỐNG: file luật ở gốc, `docs/*.md` tầng đầu, `docs/protocols/`,
 *          `AGENTS.md`/`PROTOCOL.md` của từng gói. Đây là thứ một phiên ĐANG LÀM sẽ mở.
 *   MIỄN   `docs/adr/` · `docs/archive/` · `docs/briefs/` · mục đã đóng trong `BACKLOG.md`.
 *          Chúng là BẢN GHI của quá khứ: lúc viết thì số đó đúng, và luật của repo cấm sửa
 *          quyết định đã chốt (ADR-0026 ⑵). Sửa chúng cho "khớp hôm nay" là làm giả hồ sơ.
 *
 * BA LUẬT VIẾT PHÉP KIỂM ở đây, cả ba đều đã trả giá thật trong repo này:
 *  1. **Đếm neo, và ĐỎ khi đếm được 0.** Một bộ dò không khớp gì báo "xanh" — nó không nói
 *     luật đúng, nó nói regex chết. `TOI_THIEU_TRICH` chặn đúng ca đó.
 *  2. **Đừng dùng `\b` cạnh chữ tiếng Việt.** `\b` dựa trên [A-Za-z0-9_] nên không tạo được
 *     biên cạnh `Đ`/`ế`, và regex sẽ khớp KHÔNG GÌ CẢ một cách im lặng.
 *  3. **Ghim cả hai chiều.** Vế "số phải tồn tại" một mình vẫn xanh khi tên mục bị đổi hẳn;
 *     nên có thêm vế "tên trong ngoặc phải khớp tiêu đề".
 *
 * Chạy: `node tests/trich-muc-agents-smoke.mjs`
 * Chạy trên một cây khác (dùng để thử phá): `node tests/trich-muc-agents-smoke.mjs <thư-mục>`
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* Số trích ÍT NHẤT phải đếm được. Dưới con số này nghĩa là bộ dò gãy, không phải repo sạch.
 * Đo 17/09 sau lượt vá: 24 chỗ trích trên mặt luật sống. Để 12 cho co giãn hai chiều. */
const TOI_THIEU_TRICH = 12;

const doc = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const co = (p) => fs.existsSync(path.join(ROOT, p));

/* ---- ① Bảng mục THẬT của `AGENTS.md`, đọc từ chính file đó ------------------- */

const tieuDeAgents = () => {
  const bang = new Map();
  for (const d of doc("AGENTS.md").matchAll(/^##\s+(\d+)\.\s+(.+?)\s*$/gm)) {
    bang.set(Number(d[1]), d[2]);
  }
  return bang;
};

const MUC = tieuDeAgents();
assert.ok(
  MUC.size >= 6,
  `AGENTS.md: chỉ đọc được ${MUC.size} tiêu đề \`## <số>. <tên>\` — bộ đọc SAI, không phải file sai`,
);

/* ---- ② Gom file thuộc mặt luật SỐNG ------------------------------------------ */

const goc = ["AGENTS.md", "CLAUDE.md", "PROMPTS.md", "README.md", "STATUS.md", "PLATFORM.md", "ROADMAP.md"];

const trongThuMuc = (thuMuc, loc) => {
  const d = path.join(ROOT, thuMuc);
  if (!fs.existsSync(d)) return [];
  return fs
    .readdirSync(d, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".md") && loc(e.name))
    .map((e) => `${thuMuc}/${e.name}`);
};

const cuaGoi = () => {
  const ra = [];
  const w = path.join(ROOT, "workers");
  if (!fs.existsSync(w)) return ra;
  for (const goi of fs.readdirSync(w, { withFileTypes: true }).filter((e) => e.isDirectory())) {
    for (const ten of ["AGENTS.md", "PROTOCOL.md"]) {
      if (co(`workers/${goi.name}/${ten}`)) ra.push(`workers/${goi.name}/${ten}`);
    }
    for (const pb of fs.readdirSync(path.join(w, goi.name), { withFileTypes: true }).filter((e) => e.isDirectory())) {
      for (const ten of ["AGENTS.md", "PROTOCOL.md"]) {
        if (co(`workers/${goi.name}/${pb.name}/${ten}`)) ra.push(`workers/${goi.name}/${pb.name}/${ten}`);
      }
    }
  }
  return ra;
};

const MAT_LUAT = [
  ...goc.filter(co),
  ...trongThuMuc("docs", () => true),
  ...trongThuMuc("docs/protocols", () => true),
  ...cuaGoi(),
];

/* ---- ③ Quét từng chỗ trích --------------------------------------------------- */

/* Khớp: "`AGENTS.md` mục 4" · "AGENTS.md mục 4 (*Phải hỏi Đức trước*)" · "mục 2 của `AGENTS.md`"
 * Cố ý KHÔNG dùng `\b` — xem luật 2 ở đầu file. */
const KIEU = [
  /`?AGENTS\.md`?\s+mục\s+(\d+)(?:\s*\(\*([^*)]+)\*[^)]*\))?/g,
  /mục\s+(\d+)\s+(?:của\s+)?`AGENTS\.md`(?:\s*\(\*([^*)]+)\*[^)]*\))?/g,
];

const trich = [];
for (const f of MAT_LUAT) {
  const chu = doc(f);
  for (const re of KIEU) {
    for (const d of chu.matchAll(re)) {
      const dong = chu.slice(0, d.index).split("\n").length;
      trich.push({ f, dong, so: Number(d[1]), ten: d[2] ?? null });
    }
  }
}

assert.ok(
  trich.length >= TOI_THIEU_TRICH,
  `chỉ đếm được ${trich.length} chỗ trích (< ${TOI_THIEU_TRICH}) — BỘ DÒ GÃY, không phải repo sạch`,
);

/* ⓐ Số phải là một mục có thật */
const soLa = trich.filter((t) => !MUC.has(t.so));
assert.equal(
  soLa.length,
  0,
  `SO_MUC_KHONG_CO — ${soLa.length} chỗ trỏ tới mục không tồn tại trong AGENTS.md ` +
    `(có: ${[...MUC.keys()].join(", ")}):\n` +
    soLa.map((t) => `  ${t.f}:${t.dong} → mục ${t.so}`).join("\n"),
);

/* ⓑ Tên trong ngoặc phải khớp tiêu đề của chính mục đó.
 * So lỏng dấu câu và hoa/thường — thứ cần bắt là "trỏ sang mục nói chuyện KHÁC", không phải
 * một dấu phẩy. */
const gon = (s) => s.toLowerCase().replace(/[.,;:*`]/g, "").replace(/\s+/g, " ").trim();
const tenLa = trich.filter((t) => t.ten && !gon(MUC.get(t.so)).includes(gon(t.ten)) && !gon(t.ten).includes(gon(MUC.get(t.so))));
assert.equal(
  tenLa.length,
  0,
  `TEN_MUC_LECH — ${tenLa.length} chỗ ghi số một mục nhưng gọi tên mục khác:\n` +
    tenLa.map((t) => `  ${t.f}:${t.dong} → "mục ${t.so} (*${t.ten}*)" nhưng mục ${t.so} là "${MUC.get(t.so)}"`).join("\n"),
);

/* ⓒ Liên kết neo `../AGENTS.md#<số>-<tên>` cũng phải khớp — đây là thứ Đức BẤM được,
 * nên nó hỏng thấy được ngay, khác ⓐ ⓑ. */
const neoLa = [];
for (const f of MAT_LUAT) {
  const chu = doc(f);
  for (const d of chu.matchAll(/AGENTS\.md#(\d+)-([a-zà-ỹ0-9-]+)/gi)) {
    const so = Number(d[1]);
    const dong = chu.slice(0, d.index).split("\n").length;
    if (!MUC.has(so)) { neoLa.push(`  ${f}:${dong} → #${d[1]}-${d[2]} (mục ${so} không có)`); continue; }
    const mongDoi = gon(MUC.get(so)).replace(/ /g, "-");
    if (mongDoi !== d[2].toLowerCase()) neoLa.push(`  ${f}:${dong} → #${d[1]}-${d[2]}, đúng phải là #${so}-${mongDoi}`);
  }
}
assert.equal(neoLa.length, 0, `NEO_CHET — ${neoLa.length} liên kết neo không còn tới đâu:\n${neoLa.join("\n")}`);

console.log(`trich-muc-agents-smoke: ${trich.length} chỗ trích trên ${MAT_LUAT.length} file mặt luật — XANH`);
