/* tests/seed-purity-smoke.mjs — SEED KHÔNG ĐƯỢC BIẾT TÊN MỘT TRANG THẬT NÀO.
 *
 * [ADR-0020](../../../../docs/adr/0007-scouter.md) mục
 * ⑶. Luật ba tầng thì [ADR-0009](../../../../docs/adr/0007-scouter.md)
 * mục ⑵ đã viết từ 06/09: **seed đúng một bản, chứa năng lực đúng với MỌI trang; adapter mỗi
 * URL một cái, chứa selector và hiểu biết riêng của trang.** File này không thêm luật — nó là
 * cái máy canh luật đó.
 *
 * PHẠM VI HẸP, CÓ CHỦ Ý — Đức chốt 07/09: *"nhiễm cũng được, chỉ là 1 list các trial mà ta đã
 * thử thôi, ko quá khắt khe đâu, trừ khi nó ảnh hưởng quá."* Nên file này chỉ canh chỗ **ảnh
 * hưởng thật**: tên trang nằm trong **mã CHẠY** của seed — một hằng số, một giá trị mặc định,
 * một nhánh rẽ theo hostname. Đó là lúc seed hết dùng chung được cho trang sau.
 *
 * Không canh `tests/` (fixture nêu tên trang thật là vô hại, xem khối `BO_QUA_THU_MUC`), không
 * canh `docs/`, không canh `pilots/`. Danh sách trang đã thử ở `docs/TRIALS.md` — đó là một
 * cuốn sổ, không phải hàng rào, và hai thứ đó đừng lẫn.
 *
 * BẮT GÌ, KHÔNG BẮT GÌ:
 *   · Chỉ soi **chuỗi** (`"..."` · `'...'` · `` `...` ``), không soi mã trần.
 *   · Bỏ **chú thích** trước khi soi. Chú thích nêu tên trang làm ví dụ là vô hại; một hằng số
 *     thì không. Khác nhau ở chỗ cái nào CHẠY.
 *   · Cho phép: `127.0.0.1`, `localhost`, tên dành riêng theo RFC 2606, và một danh sách ngắn
 *     các chuỗi TRÔNG GIỐNG tên miền mà không phải (`chrome.app` từ đường dẫn bundle macOS —
 *     dương tính giả gặp thật ở lượt chạy đầu).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const BO_QUA_THU_MUC = new Set([
  "node_modules",
  "docs",     /* chữ của người — pilot được nêu tên ở đó, đó là chỗ của nó */
  "icons",
  ".git",
  "pilots",   /* chỗ ĐỨNG của pilot: cấm tên trang ở đó là cấm pilot tồn tại */
  /* `tests/` — ĐỨC CHỐT 07/09: *"nhiễm cũng được, chỉ là 1 list các trial mà ta đã thử thôi,
   * ko quá khắt khe đâu, trừ khi nó ảnh hưởng quá."*
   *
   * Một fixture nêu tên trang thật KHÔNG ảnh hưởng gì: nó không chạy trên máy ai, không đổi
   * hành vi của seed, và nó còn nói cho người đọc biết phép ghim này sinh ra từ ca thật nào.
   * Thứ ảnh hưởng THẬT là tên trang nằm trong MÃ CHẠY — một hằng số, một giá trị mặc định,
   * một nhánh rẽ theo hostname. Đó là lúc seed hết dùng chung được, và đó là tất cả những gì
   * phép kiểm này canh.
   *
   * Bản đầu của file này soi cả `tests/` và đỏ ngay 9 chỗ. Cả 9 đều vô hại — tức là nó đang
   * đòi công việc mà không đổi lấy an toàn nào. Ghi lại vì cái bẫy đó tổng quát: một phép kiểm
   * siết quá tay sẽ bị người ta tắt đi, và lúc đó mất luôn cả phần nó canh đúng. */
  "tests"
]);

/* RFC 2606 + loopback. Danh sách này CỐ Ý ngắn: mỗi cái thêm vào là một lỗ, và lỗ nào rồi cũng
 * có người chui qua. Thêm thì phải ghi lý do ngay dòng đó. */
/* KHÔNG PHẢI TÊN MIỀN — dương tính giả đã gặp thật. Giữ riêng khỏi danh sách dưới vì khác loại:
 * cái dưới nói "tên miền này được phép", cái này nói "đây không phải một tên miền". */
const KHONG_PHAI_TEN_MIEN = new Set([
  "chrome.app"   /* từ đường dẫn bundle macOS: "/Applications/Google Chrome.app/Contents/..." */
]);

const CHO_PHEP = [
  /^127\.0\.0\.1$/,
  /^localhost$/,
  /^(.+\.)?example\.(com|net|org)$/,
  /\.(test|invalid|example)$/
];

const TEN_MIEN = /\b(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:com|vn|net|org|io|co|ai|dev|app|edu|gov|info|biz|xyz|me)\b/gi;

/* Bóc chuỗi. Không phải bộ phân tích cú pháp JS đầy đủ, và không cần là: nó chỉ cần đủ chặt để
 * không nuốt mất một chuỗi có tên miền. Nuốt hụt = báo oan (phiền), bỏ sót = mù (nguy) — nên
 * khi phân vân thì bắt, đừng bỏ. */
function bocChuoi(ma) {
  const ra = [];
  for (const re of [/"((?:[^"\\\n]|\\.)*)"/g, /'((?:[^'\\\n]|\\.)*)'/g, /`((?:[^`\\]|\\.)*)`/g]) {
    for (const m of ma.matchAll(re)) ra.push(m[1]);
  }
  return ra;
}

function boChuThich(ma) {
  return ma.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function duocPhep(ten) {
  return CHO_PHEP.some((re) => re.test(ten));
}

function quet(thuMuc, ra = []) {
  for (const e of fs.readdirSync(thuMuc, { withFileTypes: true })) {
    const p = path.join(thuMuc, e.name);
    if (e.isDirectory()) {
      if (!BO_QUA_THU_MUC.has(e.name)) quet(p, ra);
    } else if (/\.(mjs|js|json|html|css)$/.test(e.name)) {
      ra.push(p);
    }
  }
  return ra;
}

const files = quet(GOC);
assert.ok(files.length > 8, `chi quet duoc ${files.length} file — phep kiem nay dang do mu`);

const banAn = [];
for (const p of files) {
  const tho = fs.readFileSync(p, "utf8");
  /* JSON/HTML/CSS không có chú thích kiểu JS; bóc chuỗi cũng không đúng với chúng, nên soi cả
   * nội dung. Đổi lại chúng gần như không có chuỗi nào ngoài dữ liệu thật. */
  const soi = /\.(mjs|js)$/.test(p) ? bocChuoi(boChuThich(tho)).join("\n") : tho;
  for (const m of soi.matchAll(TEN_MIEN)) {
    const ten = m[0].toLowerCase();
    if (KHONG_PHAI_TEN_MIEN.has(ten) || duocPhep(ten)) continue;
    banAn.push(`${path.relative(GOC, p)} → ${ten}`);
  }
}

assert.deepEqual([...new Set(banAn)].sort(), [], [
  "",
  "SEED BI NHIEM TEN TRANG THAT — ADR-0020 muc ⑶.",
  "",
  "Seed la ban DUNG MOT, dung chung cho moi trang. Hieu biet rieng cua mot trang thuoc ve",
  "adapter (`workers/duc-scouter/pilots/<ten>/`), khong thuoc ve day.",
  "",
  "Sua theo mot trong ba cach:",
  "  · la du lieu cua pilot  → chuyen sang `pilots/<ten>/`",
  "  · la vi du trong van    → dua vao chu thich, dung de trong chuoi",
  ""
].join("\n"));

console.log(`seed-purity smoke test: PASS (${files.length} file, 0 ten trang that trong seed)`);
