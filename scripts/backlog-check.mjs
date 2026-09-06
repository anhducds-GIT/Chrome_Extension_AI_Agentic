#!/usr/bin/env node
/* Cưỡng chế luật mục 2 của `BACKLOG.md` ở gốc repo: mỗi mục `## N-xx` PHẢI khai `đóng khi:`.
 *
 * VÌ SAO ĐÂY LÀ MỘT FILE, KHÔNG PHẢI MỘT DÒNG TRONG `package.json` (N-01, 06/09).
 * Luật này trước đây sống bằng một lệnh `node -e "..."` nhét trong `scripts.test`. Nó chặn
 * thật — bỏ trường `đóng khi:` khỏi một mục thì cổng ĐỎ. Nhưng **không có phép ghim nào canh
 * chính nó**: xoá dòng đó khỏi `package.json` là luật biến mất trong im lặng và mọi test vẫn
 * xanh. `MULTIFLOW.md` mục 5 gọi đúng tên chuyện này — *"một chốt không có test ghim thì nó
 * chỉ là bình luận"*.
 *
 * Không khai được điều kiện đóng thì mục đó chưa đủ chín để ghi vào sổ: nó là một cảm giác,
 * không phải một việc.
 *
 * Chỉ soi mục `## N-`. Mười bốn mục `## Y-` chuyển từ `IDEAS.md` ngày 06/09 được miễn — chúng
 * ra đời trước luật này, và sửa chúng là sửa chữ của phiên khác.
 *
 *   node scripts/backlog-check.mjs [đường-dẫn-sổ]
 *
 * Ra 0 nếu mọi mục đều khai. Ra 1 kèm tên mục nếu có mục thiếu. Ra 2 nếu không đọc được sổ. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MODULE_FILE = path.resolve(fileURLToPath(import.meta.url));

export const TRUONG_DONG_KHI = "- **đóng khi:**";

/* Cắt sổ theo tiêu đề mục. Tách bằng chính dòng tiêu đề nên phần văn xuôi mở đầu (luật của sổ,
   bản mẫu trong khối mã) rơi ra ngoài — bản mẫu viết `## N-xx`, không phải `## N-<số>`. */
export function docMuc(text) {
  const muc = [];
  let hienTai = null;
  for (const line of String(text ?? "").split(/\r?\n/)) {
    /* Dấu phân cách CỐ Ý không bắt buộc. Bản cũ trong `package.json` cắt bằng `\n## N-[0-9]`,
       tức nhận mọi tiêu đề `## N-<số>`; đòi thêm dấu `·` là làm phép kiểm HỞ RA — một mục viết
       thiếu dấu sẽ lọt qua mà không ai biết, đúng loại im lặng mà N-01 sinh ra để chặn. */
    const m = /^##\s+(N-\d+)(?![\w-])\s*[·:.\-]?\s*(.*)$/.exec(line);
    if (m) {
      hienTai = { ma: m[1], ten: m[2].trim(), than: [] };
      muc.push(hienTai);
      continue;
    }
    if (hienTai) hienTai.than.push(line);
  }
  return muc;
}

/* Khai = có dòng `- **đóng khi:**` VÀ có chữ đứng sau nó. Một dòng để trống là chưa khai:
   trường rỗng trông như đã khai với máy đếm dòng, mà với mắt người thì không nói gì cả. */
export function thieuDongKhi(text) {
  return docMuc(text)
    .filter((m) => {
      const dong = m.than.find((l) => l.trimStart().startsWith(TRUONG_DONG_KHI));
      return dong === undefined || dong.trimStart().slice(TRUONG_DONG_KHI.length).trim() === "";
    })
    .map((m) => m.ma);
}

export function kiemSo(text) {
  const tong = docMuc(text).length;
  const thieu = thieuDongKhi(text);
  return { tong, thieu };
}

function main(argv) {
  const duongDan = argv[0] ?? "BACKLOG.md";
  let text;
  try {
    text = fs.readFileSync(duongDan, "utf8");
  } catch {
    console.error(`KHONG_DOC_DUOC_SO: không mở được ${duongDan}. Sổ nợ hạ tầng phải nằm ở gốc repo.`);
    return 2;
  }
  const { tong, thieu } = kiemSo(text);
  console.log(`BACKLOG: ${tong} muc, ${thieu.length} thieu truong dong-khi`);
  if (thieu.length === 0) return 0;
  for (const ma of thieu) {
    console.error(`  ${ma}: thiếu "${TRUONG_DONG_KHI} lệnh: <lệnh chạy được>" hoặc "${TRUONG_DONG_KHI} đức: <câu Đức phải chốt>"`);
  }
  console.error("Luật mục 2 của BACKLOG.md: không khai được điều kiện đóng thì mục đó chưa đủ chín để ghi vào sổ.");
  return 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === MODULE_FILE) process.exit(main(process.argv.slice(2)));
