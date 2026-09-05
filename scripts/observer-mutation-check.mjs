#!/usr/bin/env node
/* observer-mutation-check.mjs — ĐỘT BIẾN KIỂM cho bốn phép dò read-only.
 *
 * Câu hỏi nó trả lời: `tests/observer-probes-smoke.mjs` có THẬT SỰ ghim cái gì không, hay nó
 * chỉ xanh vì code đang đúng? Cách duy nhất biết là cố ý làm hỏng chốt rồi xem test có đỏ.
 * MULTIFLOW.md mục 5: "một chốt không có test ghim thì nó chỉ là bình luận" — đếm được BỐN
 * lần trong một ngày một chốt vừa viết ra hoá ra vô tác dụng mà test vẫn xanh.
 *
 * BA CÁI BẪY ĐÃ TRẢ GIÁ, và cách file này tránh:
 *
 *   · `\b` trong regex JS KHÔNG khớp cạnh chữ tiếng Việt; neo `^`/`$` gặp file CRLF báo
 *     "không khớp" trông y hệt "không có gì để sửa". → File này KHÔNG DÙNG REGEX. Mọi đột
 *     biến là thay chuỗi NGUYÊN VĂN, đếm bằng indexOf.
 *   · Bộ đo mà mỏ neo không khớp sẽ báo SKIP, đọc gần y hệt một lượt xanh. → Ở đây mỏ neo
 *     không khớp là ĐỎ (`MO_NEO_HONG`), và số con khớp = 0 thì THOÁT NGAY mã 2.
 *   · Khôi phục bằng `git checkout` sẽ xoá luôn việc chưa commit. → Khôi phục bằng ghi lại
 *     ĐÚNG BYTES GỐC đã đọc vào bộ nhớ trước khi sửa, trong `finally`.
 *
 * Chạy: node scripts/observer-mutation-check.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TARGET = path.join(ROOT, "scripts", "observer-probes.mjs");
const PIN = path.join(ROOT, "tests", "observer-probes-smoke.mjs");

/* Mỗi con đột biến = một đường GHI hoặc một chốt bị gỡ. `tim` phải xuất hiện đúng `soLan` lần,
 * nếu không thì mỏ neo đã mục theo code — đó là lỗi của bộ đo, không phải kết quả. */
const MUTANTS = [
  {
    ma: "M1",
    ten: "Nới danh sách method: cho Runtime.evaluate vào",
    tim: '  "DOM.enable",\n  "DOM.getDocument",',
    thay: '  "Runtime.evaluate",\n  "DOM.enable",\n  "DOM.getDocument",',
    soLan: 1
  },
  {
    ma: "M2",
    ten: "Nới danh sách method: cho Input.dispatchKeyEvent (gửi phím) vào",
    tim: '  "DOM.querySelectorAll",\n  "DOM.describeNode",',
    thay: '  "DOM.querySelectorAll",\n  "Input.dispatchKeyEvent",\n  "DOM.describeNode",',
    soLan: 1
  },
  {
    ma: "M3",
    ten: "Gỡ hẳn chốt method: cổng cho mọi lệnh CDP đi qua",
    tim: "    if (!allowed.has(method)) {",
    thay: "    if (false && !allowed.has(method)) {",
    soLan: 1
  },
  {
    ma: "M4",
    ten: "Gỡ chốt tham số chở mã (expression / functionDeclaration / text …)",
    tim: "      if (banned.has(paramKey)) {",
    thay: "      if (false && banned.has(paramKey)) {",
    soLan: 1
  },
  {
    ma: "M5",
    ten: "NỐI CHUỖI: dựng biểu thức Runtime.evaluate từ selector của người gọi",
    tim: '      found = await send("DOM.querySelectorAll", { nodeId: root.nodeId, selector });',
    thay:
      '      const expr = "document.querySelectorAll(\'" + selector + "\').length";\n' +
      '      found = { nodeIds: [], evaluated: await send("Runtime.evaluate", { expression: expr }) };',
    soLan: 1
  },
  {
    ma: "M6",
    ten: "Thêm một đường GHI vào giữa page.snapshot (sửa thuộc tính DOM)",
    tim: '    const found = await send("DOM.querySelectorAll", { nodeId: root.nodeId, selector: INTERACTIVE_SELECTOR });',
    thay:
      '    await send("DOM.setAttributeValue", { nodeId: root.nodeId, name: "data-observer", value: "1" });\n' +
      '    const found = await send("DOM.querySelectorAll", { nodeId: root.nodeId, selector: INTERACTIVE_SELECTOR });',
    soLan: 1
  },
  {
    ma: "M7",
    ten: "Gỡ chốt từ vựng: chấp nhận mọi tên phép dò",
    tim: "  if (!PROBE_NAMES.includes(name)) {",
    thay: "  if (false && !PROBE_NAMES.includes(name)) {",
    soLan: 1
  },
  {
    ma: "M8",
    ten: "Gỡ che dữ liệu: trả nguyên giá trị mọi thuộc tính",
    tim: "    if (!safe.has(attrName)) {",
    thay: "    if (false && !safe.has(attrName)) {",
    soLan: 1
  },
  {
    ma: "M9",
    ten: "Bỏ phân trang: luôn trả về lát đầu, lờ offset của người gọi",
    tim: "    const slice = nodeIds.slice(offset, offset + limit);\n    const items = [];\n    for (const nodeId of slice) items.push(await describe(send, nodeId));\n\n    return {\n      metadata:",
    thay: "    const slice = nodeIds.slice(0, limit);\n    const items = [];\n    for (const nodeId of slice) items.push(await describe(send, nodeId));\n\n    return {\n      metadata:",
    soLan: 1
  },
  {
    ma: "M10",
    ten: "Quay lại depth:0 cho dom.tree (đúng khuyết tật của bản cũ)",
    tim: '    const doc = await send("DOM.getDocument", { depth, pierce: false });',
    thay: '    const doc = await send("DOM.getDocument", { depth: 0, pierce: false });',
    soLan: 1
  }
];

/* Đếm số lần một chuỗi xuất hiện — không regex, nên không dính bẫy `\b` / CRLF. */
function demSoLan(nguon, tim) {
  let dem = 0;
  let vt = nguon.indexOf(tim);
  while (vt !== -1) {
    dem += 1;
    vt = nguon.indexOf(tim, vt + tim.length);
  }
  return dem;
}

function chayPin() {
  try {
    execFileSync(process.execPath, [PIN], { cwd: ROOT, stdio: "pipe", timeout: 120000 });
    return { do: false, dau: "" };
  } catch (error) {
    const dau = String(error.stdout || "") + String(error.stderr || "");
    return { do: true, dau: dau.split("\n").find((d) => d.includes("AssertionError") || d.includes("Error")) || "(đỏ)" };
  }
}

/* ---- Chạy --------------------------------------------------------------- */

const BYTES_GOC = fs.readFileSync(TARGET);          // bytes, không phải chuỗi
const NGUON_GOC = BYTES_GOC.toString("utf8");

let soKhop = 0;
let soDo = 0;
let soSong = 0;
const moNeoHong = [];
const songSot = [];

console.log(`Đột biến kiểm: ${path.relative(ROOT, TARGET)} → ${path.relative(ROOT, PIN)}\n`);

/* Vế nền: chưa đột biến thì phép ghim phải XANH. Không có vế này thì một phép ghim hỏng sẵn
 * sẽ "giết" cả 10 con và bộ đo báo thành công rực rỡ. */
const nen = chayPin();
if (nen.do) {
  console.error("ĐỎ: phép ghim đã đỏ sẵn khi CHƯA đột biến. Sửa test trước, đo sau.");
  console.error(nen.dau);
  process.exit(2);
}
console.log("nền (chưa đột biến): XANH — bộ đo dùng được\n");

try {
  for (const con of MUTANTS) {
    const dem = demSoLan(NGUON_GOC, con.tim);
    if (dem !== con.soLan) {
      moNeoHong.push(`${con.ma} (khớp ${dem}, cần ${con.soLan})`);
      console.log(`[MỎ NEO HỎNG] ${con.ma} — ${con.ten}: khớp ${dem} chỗ, cần ${con.soLan}`);
      continue;
    }
    soKhop += 1;
    fs.writeFileSync(TARGET, NGUON_GOC.split(con.tim).join(con.thay), "utf8");
    const ketQua = chayPin();
    fs.writeFileSync(TARGET, BYTES_GOC);
    if (ketQua.do) {
      soDo += 1;
      console.log(`[GIẾT ĐƯỢC] ${con.ma} — ${con.ten}`);
    } else {
      soSong += 1;
      songSot.push(`${con.ma} — ${con.ten}`);
      console.log(`[SỐNG SÓT ] ${con.ma} — ${con.ten}   ← chốt này chỉ là bình luận`);
    }
  }
} finally {
  fs.writeFileSync(TARGET, BYTES_GOC);              // khôi phục bytes gốc, không git checkout
}

console.log(`\nMỏ neo khớp: ${soKhop}/${MUTANTS.length} · giết được ${soDo} · sống sót ${soSong}`);

if (soKhop === 0) {
  console.error("ĐỎ: KHÔNG mỏ neo nào khớp. Bộ đo không đo được gì — đừng đọc đây thành 'xanh'.");
  process.exit(2);
}
if (moNeoHong.length) {
  console.error(`ĐỎ: mỏ neo mục theo code: ${moNeoHong.join(", ")}. Sửa bộ đo.`);
  process.exit(2);
}
if (songSot.length) {
  console.error(`ĐỎ: ${songSot.length} con sống sót:\n  - ${songSot.join("\n  - ")}`);
  process.exit(1);
}
console.log("Đột biến kiểm: PASS — mọi chốt đều có phép ghim đứng sau.");
