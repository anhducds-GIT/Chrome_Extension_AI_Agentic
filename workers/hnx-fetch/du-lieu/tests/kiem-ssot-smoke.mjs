/* kiem-ssot-smoke.mjs — ghim BỘ SOI TỆP SSOT.
 *
 * ══ VÌ SAO FILE NÀY PHẢI TỒN TẠI ══
 *
 * `kiem-ssot.mjs` là thứ AI vận hành dựa vào để nói *"dữ liệu ổn"*. Một bộ soi báo SẠCH trong
 * khi tệp bẩn còn tệ hơn không có bộ soi nào: nó biến một nghi ngờ thành một lời bảo đảm.
 *
 * Audit nội dung độc lập 08/09 chỉ ra hai chỗ mù của cách kiểm cũ (đếm hàng theo ngày):
 *   ⑴ nó lấy **ngày** làm khoá, nên hai bản ghi của CÙNG một hợp đồng trong cùng một ngày lọt
 *     qua — miễn tổng vẫn ra 8;
 *   ⑵ một ngày **thiếu hẳn** không bao giờ xuất hiện trong phép đếm, nên nó vô hình.
 *
 * Bốn khối dưới đây ghim đúng bốn thứ đó.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { COT_MASTER } from "../luoc-do-master.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const BO_SOI = path.join(here, "..", "kiem-ssot.mjs");
const LF = String.fromCharCode(10);
const CRLF = String.fromCharCode(13) + LF;
const BOM = String.fromCharCode(0xFEFF);

const san = fs.mkdtempSync(path.join(os.tmpdir(), "hnx-soi-"));

/* Dựng một tệp SSOT giả từ CHÍNH lược đồ thật. Gõ tay 25 tên cột ở đây là dựng bản thứ hai của
 * một luật, và hai bản thì sớm muộn nói khác nhau. */
const o = (v) => '"' + String(v).replace(/"/g, '""') + '"';
const iNgay = COT_MASTER.indexOf("trade_date");
const iIsin = COT_MASTER.indexOf("isin");

function hang(ngay, isin) {
  return COT_MASTER.map((_c, i) => (i === iNgay ? o(ngay) : i === iIsin ? o(isin) : o(""))).join(",");
}
function tep(ten, hangs) {
  const duong = path.join(san, ten);
  fs.writeFileSync(duong, BOM + COT_MASTER.map(o).join(",") + CRLF + hangs.map((h) => h + CRLF).join(""), "utf8");
  return duong;
}
function soi(duong, den) {
  return execFileSync(process.execPath, [BO_SOI, duong, den], { encoding: "utf8" });
}

/* Tám hợp đồng cho một ngày đủ — đúng hình dạng một phiên thật. */
const ISIN = Array.from({ length: 8 }, (_v, i) => `VN41I1G8000${i}`);
const ngayDu = (n) => ISIN.map((x) => hang(n, x));

try {
  /* ---- ⑴ Tệp SẠCH phải báo sạch ------------------------------------------
   * Không có khối này thì ba khối dưới vô nghĩa: một bộ soi báo ĐỎ với mọi thứ cũng "bắt được"
   * cả ba ca hỏng, và nó vô dụng. */
  {
    const ra = soi(tep("sach.csv", [...ngayDu("2026-09-07"), ...ngayDu("2026-09-08")]), "2026-09-08");
    assert.match(ra, /dòng lệch cột : không/);
    assert.match(ra, /khoá trùng    : không/);
    assert.match(ra, /ngày KHÁC 8 hàng: không/);
    assert.match(ra, /THIẾU HẲN.*: không/);
    assert.match(ra, /Không thấy lỗi cấu trúc/);
    assert.match(ra, /ngày CUỐI     : 2026-09-08/, "phải chỉ ra ngày cuối để biết lượt sau bắt đầu từ đâu");
  }

  /* ---- ⑵ CÙNG hợp đồng hai lần trong CÙNG ngày → phải ĐỎ ------------------
   * Đây là ca mà cách đếm cũ mù hoàn toàn: tổng vẫn đúng 8 hàng, nhưng một hợp đồng có hai bản
   * ghi và một hợp đồng khác biến mất. Khoá phải là (ngày + ISIN), không phải chỉ ngày. */
  {
    const lap = [...ngayDu("2026-09-07")];
    lap[7] = hang("2026-09-07", ISIN[0]);      /* thay hợp đồng thứ 8 bằng bản sao của hợp đồng đầu */
    const ra = soi(tep("trung.csv", lap), "2026-09-07");
    assert.match(ra, /khoá trùng    : 2026-09-07\|VN41I1G80000/, "trùng khoá phải hiện ra và nói RÕ khoá nào");
    assert.match(ra, /ngày KHÁC 8 hàng: không/, "tổng vẫn đúng 8 — đó chính là lý do đếm theo ngày không đủ");
    assert.match(ra, /ĐỎ — dừng lại/);
  }

  /* ---- ⑶ Ngày trong tuần THIẾU HẲN phải hiện ra --------------------------
   * Một ngày không có dòng nào thì không có gì để đếm, nên nó vô hình với mọi phép đếm. Chỉ dò
   * bằng LỊCH mới thấy. Cuối tuần thì không tính — HNX không có phiên. */
  {
    const ra = soi(tep("thieu.csv", [...ngayDu("2026-09-07"), ...ngayDu("2026-09-09")]), "2026-09-09");
    assert.match(ra, /THIẾU HẲN.*: 2026-09-08/, "ngày giữa bị thiếu phải hiện ra");
    const cuoiTuan = soi(tep("cuoituan.csv", [...ngayDu("2026-09-04"), ...ngayDu("2026-09-07")]), "2026-09-07");
    assert.match(cuoiTuan, /THIẾU HẲN.*: không/, "thứ Bảy và Chủ nhật KHÔNG được kể là thiếu");
  }

  /* ---- ⑷ Dòng lệch cột phải ĐỎ ------------------------------------------
   * Tệp vẫn mở được, vẫn có số, mà mọi giá trị nằm dưới sai tên. */
  {
    const cut = [...ngayDu("2026-09-07")];
    cut[3] = cut[3].split(",").slice(0, 20).join(",");
    const ra = soi(tep("lech.csv", cut), "2026-09-07");
    assert.match(ra, /dòng lệch cột : 5/, "phải nói ĐÚNG số dòng trong tệp, để người ta mở ra xem được");
    assert.match(ra, /ĐỎ — dừng lại/);
  }

  console.log("kiem-ssot-smoke: 4 khoi, tat ca DAT");
} finally {
  fs.rmSync(san, { recursive: true, force: true });
}
