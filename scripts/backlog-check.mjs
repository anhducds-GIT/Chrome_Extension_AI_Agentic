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

/* ---- TRÙNG MÃ — N-12 -----------------------------------------------------
 *
 * Ca thật, HAI LẦN TRONG MỘT NGÀY (06/09): hai lane cùng ghi mục `N-08`, rồi hai lane cùng
 * ghi mục `N-13`. Cả hai lượt đều vào HEAD, và không lớp nào kêu. Bộ kiểm này thì còn làm
 * người đọc đi sửa nhầm khối: nó gộp hai khối thành một mã rồi báo mã đó thiếu trường.
 *
 * VÌ SAO NÓ SẼ CÒN XẢY RA, VÀ VÌ SAO KHÔNG SỬA BẰNG CÁCH CẤP SỐ TẬP TRUNG: ba sổ ở gốc repo
 * cố ý MIỄN KHOÁ cho thao tác thêm dòng — không có miễn trừ đó thì không lane nào ghi được
 * Log. Miễn khoá nghĩa là nhiều lane cùng ghi hợp lệ, và cả hai cùng đọc thấy "số kế tiếp là
 * 08". Dựng một bộ cấp số tập trung là dựng một cái KHOÁ THỨ HAI cho đúng thứ vừa được miễn
 * khoá. Rẻ nhất: phát hiện trùng rồi báo đỏ, người sửa mất 30 giây.
 *
 * CỬA RA PHẢI RẺ NGANG CỬA VÀO — và đây là chỗ dễ làm sai nhất. Sổ này miễn khoá KHI CHỈ
 * THÊM DÒNG Ở CUỐI; sửa tiêu đề một khối cũ là viết lại chữ của lane khác VÀ đòi khoá
 * `_root`. Nếu lối gỡ trùng bắt phải sửa tiêu đề thì bộ kiểm này thành một cái chặn mà người
 * bị chặn KHÔNG CÓ QUYỀN gỡ. Nên lối gỡ cũng là MỘT DÒNG THÊM Ở CUỐI:
 *
 *   - **ĐỔI MÃ N-09 → N-19** · 2026-09-07 · lane `x` · vài chữ nhận ra khối · **đóng khi:** ...
 *
 * Chữ khối cũ giữ nguyên (luật mục 1 của sổ). Một dòng gỡ đúng MỘT lượt trùng, và nó mang
 * luôn `đóng khi:` cho mã mới — vì khối cũ thường chính là khối chưa khai trường đó, mà thêm
 * trường vào giữa khối là sửa chữ người khác, đúng thứ vừa cấm.
 *
 * AI ĐỔI SỐ: khối ĐẦU TIÊN giữ mã — nó có trước. Khối thứ hai, thứ ba… nhận mã mới theo đúng
 * thứ tự các dòng `ĐỔI MÃ` cùng mã cũ. Luật này phải CỐ ĐỊNH, không "đoán khối nào mới hơn":
 * một quy tắc gỡ mà đọc hai lần ra hai kết quả thì nó không gỡ được gì cả.
 *
 * Mã ĐÍCH cũng bị đếm như mọi mã khác, nên đổi sang một mã đang có người dùng vẫn ĐỎ — đó chỉ
 * là dời chỗ va chạm. */
export const DONG_DOI_MA = "- **ĐỔI MÃ";

export function doiMa(text) {
  const ra = [];
  for (const line of String(text ?? "").split(/\r?\n/)) {
    const m = /^-\s+\*\*ĐỔI\s+MÃ\s+(N-\d+)\s*(?:->|\u2192)\s*(N-\d+)\*\*(.*)$/.exec(line);
    if (!m) continue;
    const k = m[3].indexOf(TRUONG_DONG_KHI.replace(/^-\s*/, ""));
    ra.push({
      tu: m[1],
      sang: m[2],
      dongKhi: k === -1 ? "" : m[3].slice(k + TRUONG_DONG_KHI.replace(/^-\s*/, "").length).trim()
    });
  }
  return ra;
}

/* Mục sau khi áp các dòng đổi mã.
 *
 * ĐÁNH SỐ THEO MÃ ĐÃ GIẢI, KHÔNG THEO MÃ GỐC CỦA TIÊU ĐỀ. Bản đầu đánh số theo mã gốc, và
 * `claude-assistant` tìm ra lỗ ngay trong ngày: va chạm có thể nằm giữa ⑴ một khối đã được đổi
 * SANG `N-19` và ⑵ một tiêu đề vốn là `N-19`. Khối ⑵ là khối ĐẦU TIÊN mang mã đó trong tiêu đề
 * nên nó luôn ở lần gặp thứ nhất, và không dòng đổi mã nào chạm tới được — tức **mã ĐÍCH của
 * một lượt đổi có thể va chạm mà cửa append-only không gỡ nổi**, đúng thứ cơ chế này sinh ra
 * để tránh. Đánh số theo mã đã giải thì các lượt đổi NỐI ĐUÔI được: `N-09 → N-19`, rồi
 * `N-19 → N-20`, rồi `N-20 → N-26`. Mỗi dòng đổi dùng đúng một lần (`shift`), nên một dây đổi
 * vòng tròn cũng cạn hàng đợi rồi dừng; trần 32 vòng là dây bảo hiểm, không phải luật.
 *
 * Khối đầu tiên nhận một mã thì GIỮ mã đó — nó có trước. Khối đến sau mới phải đổi. */
export const TRAN_NOI_DUOI = 32;

export function docMucDaGo(text) {
  const hang = new Map();
  for (const d of doiMa(text)) {
    if (!hang.has(d.tu)) hang.set(d.tu, []);
    hang.get(d.tu).push(d);
  }
  const daGap = new Map();
  return docMuc(text).map((m) => {
    let ma = m.ma;
    let doiTu;
    let dongKhiNgoai;
    for (let i = 0; i < TRAN_NOI_DUOI; i += 1) {
      if ((daGap.get(ma) ?? 0) === 0) break;          // mã này chưa ai dùng — nhận
      const d = (hang.get(ma) || []).shift();
      if (!d) break;                                   // hết dòng đổi — để trùng, `trungMa` sẽ kêu
      doiTu = ma;
      ma = d.sang;
      dongKhiNgoai = d.dongKhi;
    }
    daGap.set(ma, (daGap.get(ma) ?? 0) + 1);
    return doiTu === undefined ? m : { ...m, ma, doiTu, dongKhiNgoai };
  });
}

/** Mã nào vẫn còn hai khối trở lên sau khi gỡ. */
export function trungMa(text) {
  const dem = new Map();
  for (const m of docMucDaGo(text)) dem.set(m.ma, (dem.get(m.ma) ?? 0) + 1);
  return [...dem.entries()].filter(([, lan]) => lan > 1)
    .map(([ma, lan]) => ({ ma, lan })).sort((a, b) => a.ma.localeCompare(b.ma));
}

/* Khai = có dòng `- **đóng khi:**` VÀ có chữ đứng sau nó. Một dòng để trống là chưa khai:
   trường rỗng trông như đã khai với máy đếm dòng, mà với mắt người thì không nói gì cả.
   Dòng `ĐỔI MÃ` mang `đóng khi:` cũng tính — cùng một cửa append-only, xem khối trên. */
export function thieuDongKhi(text) {
  return docMucDaGo(text)
    .filter((m) => {
      if (String(m.dongKhiNgoai ?? "").trim() !== "") return false;
      const dong = m.than.find((l) => l.trimStart().startsWith(TRUONG_DONG_KHI));
      return dong === undefined || dong.trimStart().slice(TRUONG_DONG_KHI.length).trim() === "";
    })
    .map((m) => m.ma);
}

export function kiemSo(text) {
  const tong = docMucDaGo(text).length;
  const thieu = thieuDongKhi(text);
  return { tong, thieu, trung: trungMa(text) };
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
  const { tong, thieu, trung } = kiemSo(text);
  console.log(`BACKLOG: ${tong} muc, ${thieu.length} thieu truong dong-khi, ${trung.length} ma bi trung`);
  for (const ma of thieu) {
    console.error(`  ${ma}: thiếu "${TRUONG_DONG_KHI} lệnh: <lệnh chạy được>" hoặc "${TRUONG_DONG_KHI} đức: <câu Đức phải chốt>"`);
  }
  if (thieu.length) console.error("Luật mục 2 của BACKLOG.md: không khai được điều kiện đóng thì mục đó chưa đủ chín để ghi vào sổ.");
  for (const t of trung) {
    console.error(`  ${t.ma}: ${t.lan} khối cùng mang mã này${t.daGo ? ` (đã gỡ ${t.daGo})` : ""} — hai lane đã chọn trùng số.`);
  }
  if (trung.length) {
    console.error(`Sổ này miễn khoá KHI CHỈ THÊM DÒNG Ở CUỐI, nên cửa ra cũng là một dòng thêm ở cuối — đừng sửa tiêu đề khối cũ:`);
    console.error(`  ${DONG_DOI_MA} <mã cũ> → <mã mới chưa ai dùng>** · <ngày> · lane \`<tên>\` · khối "<vài chữ đầu của tiêu đề>" đọc là <mã mới> từ nay`);
    console.error("Mỗi dòng gỡ đúng một lượt trùng. Chữ khối cũ giữ nguyên — luật mục 1 của sổ.");
  }
  return thieu.length || trung.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === MODULE_FILE) process.exit(main(process.argv.slice(2)));
