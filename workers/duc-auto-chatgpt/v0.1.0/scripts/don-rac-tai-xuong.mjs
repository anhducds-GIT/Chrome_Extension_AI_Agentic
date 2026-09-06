/* Dọn file rác tên-GUID mà Chrome đặt cho artifact của extension này.
   Xem `AI-OPERATOR-GUIDE.md` mục "Protocol dọn rác" để biết vì sao có nó.

   LUẬT SỐ MỘT: KHÔNG lọc theo hình dạng tên. Đo ngày 2026-09-06 trong thư mục
   Tải xuống thật của Đức: 39 file mang tên GUID, và HAI trong số đó là
   `.pdf` + `.jpg` KHÔNG phải của gói này — trang web nào tải blob về cũng
   được Chrome đặt tên kiểu ấy. Một bộ lọc chỉ khớp tên sẽ xoá file thật của
   Đức, và xoá là không hoàn lại được. Nên mỗi ứng viên phải TỰ CHỨNG MINH
   nó là đầu ra của gói này, bằng nội dung.

   Mặc định là CHỈ XEM, không xoá. Muốn xoá thì phải nói ra.  */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

/* Chrome đặt tên blob theo đoạn cuối của blob URL: 36 ký tự hex có gạch.
   Chữ hoa/thường đều nhận — hình dạng này là ĐIỀU KIỆN CẦN, không phải điều
   kiện đủ. Phần quyết định nằm ở `phanLoai()` bên dưới. */
const GUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const DUOI_CUA_GOI = new Set(["", ".png", ".xlsx"]);

/* Ba bậc, cố ý khác nhau về độ chắc:
     "so-audit"  chứng minh được là của gói — dòng đầu là JSON của chính nó
     "can-mat"   đúng hình dạng đầu ra của gói, nhưng KHÔNG chứng minh được
                 chủ sở hữu (ảnh PNG nào cũng là PNG) → cần Đức xác nhận
     "khong-phai" mọi thứ còn lại → KHÔNG BAO GIỜ xoá, nhưng PHẢI in ra
   In cả bậc thứ ba là phần làm cho công cụ này đáng tin: Đức thấy được
   chính xác cái gì đã được bảo vệ, chứ không phải tin lời hứa. */
export function phanLoai(ten, docDauFile) {
  const duoi = path.extname(ten).toLowerCase();
  const goc = duoi ? ten.slice(0, -duoi.length) : ten;
  if (!GUID.test(goc)) return { bac: "khong-phai", vi_sao: "tên không phải một GUID trần" };
  if (!DUOI_CUA_GOI.has(duoi)) return { bac: "khong-phai", vi_sao: `gói này không sinh ra file ${duoi || "(không đuôi)"}` };

  const dau = docDauFile();
  if (duoi === "") {
    /* NHẬN THEO CHỮ KÝ, KHÔNG PARSE. Bản đầu của hàm này cắt dòng đầu rồi
       `JSON.parse` nó — và lượt chạy thật đầu tiên cho thấy nó sai: dòng đầu
       của một sổ audit thật DÀI HƠN đoạn đầu file mà ta đọc, nên chuỗi bị
       cắt giữa, parse ném, và 12 sổ audit thật bị xếp vào nhóm "không phải
       của gói". Hỏng an toàn (không xoá sai), nhưng nó vô hiệu hoá cả công cụ.
       Chữ ký thì miễn nhiễm với việc bị cắt. */
    const chu = dau.toString("utf8");
    if (!chu.startsWith("{")) return { bac: "khong-phai", vi_sao: "không đuôi mà nội dung không mở đầu bằng JSON" };
    if (chu.includes('"timestamp"') && chu.includes('"event"')) {
      return { bac: "so-audit", vi_sao: "sổ audit của gói — có cả `timestamp` và `event`" };
    }
    if (chu.includes('"probe"')) return { bac: "so-audit", vi_sao: "file đo của gói — có khoá `probe`" };
    return { bac: "khong-phai", vi_sao: "JSON nhưng không mang chữ ký sổ audit của gói" };
  }
  if (duoi === ".png") {
    const ok = dau.length >= 4 && dau[0] === 0x89 && dau[1] === 0x50 && dau[2] === 0x4e && dau[3] === 0x47;
    return ok
      ? { bac: "can-mat", vi_sao: "PNG thật, nhưng ảnh nào cũng là PNG — không chứng minh được chủ" }
      : { bac: "khong-phai", vi_sao: "đuôi .png mà không phải PNG" };
  }
  const ok = dau.length >= 4 && dau[0] === 0x50 && dau[1] === 0x4b && dau[2] === 0x03 && dau[3] === 0x04;
  return ok
    ? { bac: "can-mat", vi_sao: "workbook thật, nhưng không chứng minh được chủ" }
    : { bac: "khong-phai", vi_sao: "đuôi .xlsx mà không phải workbook" };
}

function doc(thuMuc, ten) {
  const fd = fs.openSync(path.join(thuMuc, ten), "r");
  try {
    const buf = Buffer.alloc(2048);
    const n = fs.readSync(fd, buf, 0, 2048, 0);
    return buf.subarray(0, n);
  } finally { fs.closeSync(fd); }
}

export function quet(thuMuc) {
  const ra = { "so-audit": [], "can-mat": [], "khong-phai": [] };
  for (const ten of fs.readdirSync(thuMuc)) {
    let st;
    try { st = fs.lstatSync(path.join(thuMuc, ten)); } catch { continue; }
    if (!st.isFile()) continue;                       // không đi vào thư mục, không theo symlink
    if (!GUID.test(ten.replace(/\.[A-Za-z0-9]+$/, ""))) continue;   // không phải ứng viên, im lặng bỏ
    let kq;
    try { kq = phanLoai(ten, () => doc(thuMuc, ten)); }
    catch (e) { kq = { bac: "khong-phai", vi_sao: `không đọc được: ${e.message}` }; }
    ra[kq.bac].push({ ten, bytes: st.size, sua: st.mtime.toISOString().slice(0, 10), vi_sao: kq.vi_sao });
  }
  for (const bac of Object.keys(ra)) ra[bac].sort((a, b) => a.sua.localeCompare(b.sua) || a.ten.localeCompare(b.ten));
  return ra;
}

function inNhom(tieuDe, muc, danhSach) {
  console.log(`\n${tieuDe} — ${danhSach.length} file`);
  if (!danhSach.length) { console.log("  (không có)"); return; }
  console.log(`  ${muc}`);
  let tong = 0;
  for (const f of danhSach) {
    tong += f.bytes;
    console.log(`    ${f.sua}  ${String(f.bytes).padStart(9)} B  ${f.ten}`);
  }
  console.log(`  tổng ${(tong / 1024).toFixed(1)} KB`);
}

function main() {
  const args = process.argv.slice(2);
  const co = (c) => args.includes(c);
  const iThuMuc = args.indexOf("--thu-muc");
  const thuMuc = iThuMuc >= 0 && args[iThuMuc + 1] ? args[iThuMuc + 1] : path.join(os.homedir(), "Downloads");

  if (!fs.existsSync(thuMuc) || !fs.statSync(thuMuc).isDirectory()) {
    console.error(`KHONG_CHAY_DUOC: không thấy thư mục "${thuMuc}".`);
    process.exit(2);
  }

  const kq = quet(thuMuc);
  const tongFile = fs.readdirSync(thuMuc).length;
  console.log(`DỌN RÁC TÊN-GUID — ${thuMuc}`);
  console.log(`${tongFile} file trong thư mục · ${kq["so-audit"].length + kq["can-mat"].length + kq["khong-phai"].length} file mang tên GUID`);

  inNhom("① XOÁ ĐƯỢC — chứng minh được là của gói", "sổ audit và file đo. Nội dung đã đi qua Claude Code, giá trị một lần.", kq["so-audit"]);
  inNhom("② CẦN ĐỨC XÁC NHẬN — đúng hình dạng của gói, chưa chứng minh được chủ", "ảnh và workbook. Có thể là đầu ra thật của một run cũ.", kq["can-mat"]);
  inNhom("③ ĐƯỢC BẢO VỆ — KHÔNG BAO GIỜ xoá", "tên giống GUID nhưng không phải của gói này.", kq["khong-phai"]);
  for (const f of kq["khong-phai"]) console.log(`      └ vì sao giữ: ${f.vi_sao}`);

  if (!co("--xoa")) {
    console.log("\nĐANG Ở CHẾ ĐỘ CHỈ XEM. Không file nào bị đụng tới.");
    console.log("  xoá nhóm ①:        node scripts/don-rac-tai-xuong.mjs --xoa");
    console.log("  xoá cả nhóm ②:     node scripts/don-rac-tai-xuong.mjs --xoa --ca-anh-va-workbook");
    return;
  }

  const xoa = [...kq["so-audit"], ...(co("--ca-anh-va-workbook") ? kq["can-mat"] : [])];
  if (!xoa.length) { console.log("\nKhông có gì để xoá."); return; }
  console.log(`\nXOÁ ${xoa.length} file:`);
  let hong = 0;
  for (const f of xoa) {
    try { fs.unlinkSync(path.join(thuMuc, f.ten)); console.log(`  đã xoá  ${f.ten}`); }
    catch (e) { hong += 1; console.log(`  HỎNG    ${f.ten} — ${e.message}`); }
  }
  console.log(`\nXong: ${xoa.length - hong} xoá được, ${hong} hỏng. Nhóm ③ (${kq["khong-phai"].length} file) không bị đụng.`);
  if (hong) process.exit(1);
}

/* `pathToFileURL` chứ không phải ghép chuỗi: đường dẫn repo này có DẤU CÁCH
   ("WORKING ZONE"), nên `import.meta.url` mã hoá thành %20 trong khi
   `process.argv[1]` giữ dấu cách. Ghép chuỗi tay thì hai bên không bao giờ
   bằng nhau và `main()` KHÔNG BAO GIỜ chạy — công cụ im lặng không làm gì.
   Phép ghim hành vi bắt được đúng cái này ở lượt chạy đầu tiên; bốn khẳng
   định tĩnh trên mã nguồn mà nó thay thế thì không thấy gì cả. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
