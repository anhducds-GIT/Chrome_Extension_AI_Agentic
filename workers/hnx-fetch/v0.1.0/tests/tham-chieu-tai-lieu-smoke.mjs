/* tham-chieu-tai-lieu-smoke.mjs — MỌI đường dẫn và câu lệnh trong tài liệu phải TRỎ VÀO THẬT.
 *
 * ══ VÌ SAO FILE NÀY PHẢI TỒN TẠI ══
 *
 * Trong đúng một ngày dựng gói này, tài liệu trỏ hụt **ba lần**: một lệnh gọi tên tệp chưa bao
 * giờ tồn tại, và hai đường dẫn viết thiếu tiền tố thư mục. Không lần nào có gì đỏ lên — tài
 * liệu không chạy, nên không ai biết nó sai cho tới lúc có người đi theo nó.
 *
 * Với gói này thì đó không phải lỗi nhỏ: `PROTOCOL.md` được viết để một AI KHÁC đọc và làm theo
 * mà không hỏi ai. Một đường dẫn hụt trong đó là một lượt chạy hằng ngày bị chặn.
 *
 * Nó KHÔNG kiểm nội dung câu chữ — chữ là việc của người. Chỉ kiểm thứ có đúng một câu trả lời
 * đúng: tệp đó có trên đĩa hay không.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/* Suy từ vị trí CHÍNH TỆP NÀY. Gõ cứng đường dẫn tuyệt đối là dựng một phép ghim chỉ chạy
 * được trên đúng một máy — nó sẽ đỏ ở máy thứ hai, và người ở đó không đoán ra vì sao. */
const here = path.dirname(fileURLToPath(import.meta.url));
const GOI = path.resolve(here, "..", "..");                 /* workers/hnx-fetch */
const REPO = path.resolve(GOI, "..", "..");                 /* gốc kho */
const LF = String.fromCharCode(10);
/* CHỈ soi tài liệu CHỈ DẪN. `HANDOFF.md` và các mục sổ nợ ĐÃ ĐÓNG là bản ghi lịch sử: chúng
 * cố ý giữ nguyên tên tệp lúc đó, kể cả khi tệp ấy nay mang tên khác. Bắt chúng trỏ đúng là
 * bắt lịch sử phải tự sửa mình. */
const TEP = ["PROTOCOL.md", "README.md", "AGENTS.md", "v0.1.0/STATUS.md"];

let hong = 0, kiem = 0;
for (const t of TEP) {
  const s = fs.readFileSync(path.join(GOI, t), "utf8");

  /* ⑴ Moi lenh `node <duong>` */
  for (const m of s.matchAll(/node\s+((?:workers\/|v0\.1\.0\/|du-lieu\/|scripts\/|tests\/)[A-Za-z0-9._/-]+\.mjs)/g)) {
    const d = m[1];
    const thu = d.startsWith("workers/")
      ? [path.join(REPO, d)]
      : [path.join(GOI, d), path.join(GOI, "du-lieu", d), path.join(GOI, "v0.1.0", d)];
    kiem += 1;
    if (!thu.some((x) => fs.existsSync(x))) { console.log("HONG  " + t + " → lenh: node " + d); hong += 1; }
  }

  /* ⑵ Moi lien ket markdown tro toi tep trong kho */
  for (const m of s.matchAll(/\]\(([^)#][^)]*\.(?:md|mjs|js|json|html|cmd))\)/g)) {
    const d = m[1];
    if (/^https?:/.test(d)) continue;
    kiem += 1;
    const goc = path.dirname(path.join(GOI, t));
    if (!fs.existsSync(path.resolve(goc, d))) { console.log("HONG  " + t + " → liên kết: " + d); hong += 1; }
  }

  /* ⑶ Moi duong dan trong dau nhay nguoc tro toi tep cua goi */
  for (const m of s.matchAll(/`((?:v0\.1\.0|du-lieu|bridge|scripts|tests)\/[A-Za-z0-9._/-]+\.(?:mjs|js|json|html|cmd|css|md))`/g)) {
    const d = m[1];
    kiem += 1;
    /* Thử cả hai gốc: gốc gói và trong . Người đọc cũng giải như thế. */
    if (![path.join(GOI, d), path.join(GOI, "v0.1.0", d)].some((x) => fs.existsSync(x))) {
      console.log("HONG  " + t + " → nhắc tệp: " + d); hong += 1;
    }
  }
}
console.log("");
console.log("đã soi " + kiem + " tham chiếu · hỏng: " + hong);
assert.equal(hong, 0, hong + " tham chiếu trỏ hụt — xem các dòng HONG ở trên");
assert.ok(kiem > 30, "soi được quá ít tham chiếu (" + kiem + ") — bộ đọc hỏng, KHÔNG phải tài liệu sạch");
console.log("tham-chieu-tai-lieu-smoke: " + kiem + " tham chieu, 0 hong");
