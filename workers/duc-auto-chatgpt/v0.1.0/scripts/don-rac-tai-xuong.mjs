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


/* Ba bậc, cố ý khác nhau về độ chắc:
     "so-audit"  chứng minh được là của gói — dòng đầu là JSON của chính nó
     "can-mat"   đúng hình dạng đầu ra của gói, nhưng KHÔNG chứng minh được
                 chủ sở hữu (ảnh PNG nào cũng là PNG) → cần Đức xác nhận
     "khong-phai" mọi thứ còn lại → KHÔNG BAO GIỜ xoá, nhưng PHẢI in ra
   In cả bậc thứ ba là phần làm cho công cụ này đáng tin: Đức thấy được
   chính xác cái gì đã được bảo vệ, chứ không phải tin lời hứa. */
/* Ba hàm chứng minh, mỗi đuôi một hàm. Chúng nhận đoạn đầu tệp và trả về
   BẬC + VÌ SAO. Đặt TRƯỚC bảng vì bảng trỏ tới chúng. */
function chungMinhSoAudit(dau) {
  /* NHẬN THEO CHỮ KÝ, KHÔNG PARSE. Bản đầu cắt dòng đầu rồi `JSON.parse` nó —
     và lượt chạy thật đầu tiên cho thấy nó sai: dòng đầu của một sổ audit thật
     DÀI HƠN đoạn đầu tệp mà ta đọc, nên chuỗi bị cắt giữa, parse ném, và 12 sổ
     audit thật bị xếp vào nhóm "không phải của gói". Hỏng an toàn (không xoá
     sai) nhưng vô hiệu hoá cả công cụ. Chữ ký miễn nhiễm với việc bị cắt. */
  const chu = dau.toString("utf8");
  if (!chu.startsWith("{")) return { bac: "khong-phai", vi_sao: "không đuôi mà nội dung không mở đầu bằng JSON" };
  if (chu.includes('"timestamp"') && chu.includes('"event"')) {
    return { bac: "so-audit", vi_sao: "sổ audit của gói — có cả `timestamp` và `event`" };
  }
  if (chu.includes('"probe"')) return { bac: "so-audit", vi_sao: "file đo của gói — có khoá `probe`" };
  return { bac: "khong-phai", vi_sao: "JSON nhưng không mang chữ ký sổ audit của gói" };
}

function chungMinhPng(dau) {
  const ok = dau.length >= 4 && dau[0] === 0x89 && dau[1] === 0x50 && dau[2] === 0x4e && dau[3] === 0x47;
  return ok
    ? { bac: "can-mat", vi_sao: "PNG thật, nhưng ảnh nào cũng là PNG — không chứng minh được chủ" }
    : { bac: "khong-phai", vi_sao: "đuôi .png mà không phải PNG" };
}

function chungMinhXlsx(dau) {
  const ok = dau.length >= 4 && dau[0] === 0x50 && dau[1] === 0x4b && dau[2] === 0x03 && dau[3] === 0x04;
  return ok
    ? { bac: "can-mat", vi_sao: "workbook thật, nhưng không chứng minh được chủ" }
    : { bac: "khong-phai", vi_sao: "đuôi .xlsx mà không phải workbook" };
}

/* MỘT BẢNG, KHÔNG PHẢI MỘT DANH SÁCH CỘNG MẤY NHÁNH `if`.
   Trước đây đây là `new Set(["", ".png", ".xlsx"])` và phần chứng minh nằm ở
   những nhánh `if (duoi === …)` bên dưới. Thử phá 09/09 chỉ ra chỗ hỏng: thêm
   `.pdf` vào Set là một sửa đổi **diễn đạt được**, và không phép kiểm nào đỏ.
   Lần đó vô hại (một `.pdf` thật rơi vào nhánh "giữ lại" cuối), nhưng luật đã
   hỏng — bước tiếp theo của cùng một người là thêm một nhánh chứng minh, và
   lúc đó tài liệu thật của Đức thành ứng viên xoá.
   Ghim nó thì chỉ canh được một nước đi. Bảng này làm nước đi đó **không diễn
   đạt được**: khai một đuôi mà không kèm cách chứng minh chủ là không khai
   được. Đó là lý do có bảng, không phải vì bảng gọn hơn. */
const BANG_DUOI = new Map([
  ["", chungMinhSoAudit],
  [".png", chungMinhPng],
  [".xlsx", chungMinhXlsx],
]);

export function phanLoai(ten, docDauFile) {
  const duoi = path.extname(ten).toLowerCase();
  const goc = duoi ? ten.slice(0, -duoi.length) : ten;
  if (!GUID.test(goc)) return { bac: "khong-phai", vi_sao: "tên không phải một GUID trần" };
  const chungMinh = BANG_DUOI.get(duoi);
  if (!chungMinh) return { bac: "khong-phai", vi_sao: `gói này không sinh ra file ${duoi || "(không đuôi)"}` };
  return chungMinh(docDauFile());
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

/* B-44 — CHỈ RA CHỖ CÒN ỨNG VIÊN, KHÔNG TỰ ĐỘNG VỚI TỚI ĐÓ.
   Số đo 09/09: gói xin ghi vào `Downloads/Duc Auto ChatGPT`, Chrome ghi vào
   `Downloads/Phai sinh` — thư mục tải mặc định của Đức. Tức Chrome bỏ qua CẢ
   đường dẫn, không chỉ phần tên. Công cụ này quét đúng một tầng nên nó không
   bao giờ thấy đống đó: quét hôm ấy ra 16 tệp ở tầng ngoài, và 0 trong số đó
   là của lượt chạy vừa xong.

   VÌ SAO KHÔNG QUÉT ĐỆ QUY. Thư mục Tải xuống của Đức có tài liệu thật (đã
   đo: một `.pdf` và một `.jpg` của Đức lọt vào nhóm được bảo vệ, đúng nhờ luật
   "không lọc theo tên"). Mở rộng phạm vi quét là mở rộng bán kính của một thao
   tác XOÁ KHÔNG HOÀN LẠI ĐƯỢC — nên hàm này KHÔNG đọc nội dung, KHÔNG phân
   loại, và KHÔNG bao giờ xoá gì trong thư mục con. Nó chỉ ĐẾM theo hình dạng
   tên rồi in ra một câu lệnh để người chạy. Bán kính xoá không đổi một chút nào.

   Đếm theo tên ở đây là ĐÚNG, dù luật số một cấm LỌC theo tên: đây là một gợi
   ý để đi xem, không phải một phán quyết để xoá. Hai việc khác nhau. */
export function ungVienThuMucCon(thuMuc) {
  const ra = [];
  let ten;
  try { ten = fs.readdirSync(thuMuc); } catch { return ra; }
  for (const con of ten) {
    const duong = path.join(thuMuc, con);
    let st;
    try { st = fs.lstatSync(duong); } catch { continue; }
    if (!st.isDirectory()) continue;   // lstat, nên symlink KHÔNG được đi vào
    let trong;
    try { trong = fs.readdirSync(duong); } catch { continue; }
    const so = trong.filter((f) => GUID.test(f.replace(/\.[A-Za-z0-9]+$/, ""))).length;
    if (so > 0) ra.push({ ten: con, so });
  }
  return ra.sort((a, b) => b.so - a.so || a.ten.localeCompare(b.ten));
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

  const con = ungVienThuMucCon(thuMuc);
  if (con.length) {
    const tong = con.reduce((s, c) => s + c.so, 0);
    console.log(`\n④ CÒN ỨNG VIÊN Ở ${con.length} THƯ MỤC CON — ${tong} tệp, KHÔNG được quét và KHÔNG bị đụng tới`);
    console.log("  Chrome bỏ qua cả đường dẫn thư mục, không chỉ phần tên (đo 09/09), nên đầu ra của gói");
    console.log("  hay rơi vào thư mục tải mặc định. Công cụ này CỐ Ý không tự với tới đó: mở rộng phạm vi");
    console.log("  quét là mở rộng bán kính của một thao tác xoá không hoàn lại. Xem từng thư mục một:");
    for (const c of con) console.log(`    ${String(c.so).padStart(4)} tệp tên GUID   node scripts/don-rac-tai-xuong.mjs --thu-muc "${path.join(thuMuc, c.ten)}"`);
  }

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
