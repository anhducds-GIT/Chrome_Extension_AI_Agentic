#!/usr/bin/env node
/* scouter-file-core-smoke.mjs — ghim TẦNG GHI ĐĨA của Bridge Scouter.
 *
 * Đây là phép ghim của chỗ nguy hiểm nhất trong cả gói: một lệnh đi trên dây làm chương trình
 * này ghi lên đĩa của Đức. Nên các khối dưới hỏi đúng MỘT câu — *"đường nào ra được khỏi gốc?"*
 * — và hỏi nó bằng nhiều lối vào khác nhau, vì mỗi nền tảng bịt được lối này lại hở lối kia.
 *
 * Chạy trong một thư mục tạm THẬT, không giả `fs`: chốt ở đây là chốt về hệ tệp (liên kết mềm,
 * `realpath`, cách Windows đọc `C:x`), mà một `fs` giả thì nói đúng thứ người viết nó TƯỞNG hệ
 * tệp làm. Giả ở đây là tự chấm điểm bài của mình.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const {
  trongGoc, ghiFile, docFile, lietKe, FileError, MAX_FILE_BYTES
} = await import("../bridge/file-core.mjs");

const TAM = fs.mkdtempSync(path.join(os.tmpdir(), "scouter-file-pin-"));
const GOC = path.join(TAM, "goc");
const NGOAI = path.join(TAM, "ngoai");
fs.mkdirSync(GOC, { recursive: true });
fs.mkdirSync(NGOAI, { recursive: true });
fs.writeFileSync(path.join(NGOAI, "bi-mat.txt"), "khong duoc doc");
/* Thư mục ANH EM có tên bắt đầu bằng đúng tên gốc. Đây là ca mà một phép so `startsWith` nói
 * "nằm trong gốc" còn sự thật là "nằm cạnh gốc" — và nó lọt cho tới khi có người thử đúng nó.
 * Con `G2` sống sót lượt đầu 07/09 vì phép ghim này chưa có nó. */
const ANH_EM = `${GOC}-khac`;
fs.mkdirSync(ANH_EM, { recursive: true });

let soKhoi = 0;
function khoi(ten, fn) { soKhoi += 1; fn(); }

function tuChoi(fn, maMongDoi, viTri) {
  try { fn(); }
  catch (error) {
    assert.ok(error instanceof FileError, `${viTri}: mong doi FileError, nhan ${error?.name}: ${error?.message}`);
    assert.equal(error.code, maMongDoi, `${viTri}: sai ma loi`);
    return error;
  }
  assert.fail(`${viTri}: le ra phai bi tu choi, nhung da chay xong`);
}

/* ---- ① Đường ĐÚNG phải đi lọt --------------------------------------------
 * Đứng đầu, cố ý. Một trạm gác chặn tất cả thì mọi khối bên dưới đều "đạt" mà không chứng minh
 * được gì — và cái hỏng đó im lặng y như cái nó định canh. */
khoi("duong dung di lot", () => {
  const ra = ghiFile(GOC, "du-lieu/ngay-01.json", '{"a":1}');
  assert.equal(ra.bytes, 7);
  assert.equal(fs.readFileSync(path.join(GOC, "du-lieu", "ngay-01.json"), "utf8"), '{"a":1}');
  assert.equal(docFile(GOC, "du-lieu/ngay-01.json").content, '{"a":1}');
  const ds = lietKe(GOC, "du-lieu");
  assert.deepEqual(ds.entries.map((e) => e.name), ["ngay-01.json"]);
  assert.equal(ds.entries[0].kind, "file");
});

/* ---- ② `..` — cửa ai cũng nhớ bịt --------------------------------------- */
khoi("dau cham cham", () => {
  for (const xau of ["../bi-mat.txt", "../../etc/passwd", "du-lieu/../../ngoai/bi-mat.txt", ".."]) {
    tuChoi(() => trongGoc(GOC, xau), "PATH_OUTSIDE_ROOT", xau);
  }
  /* Thư mục anh em trùng tiền tố — xem chú thích ở `ANH_EM`. `path.resolve` ra một đường nằm
   * NGOÀI gốc, nhưng chuỗi của nó bắt đầu bằng đúng chuỗi gốc. Chỉ `path.relative` phân biệt
   * được hai chuyện đó; `startsWith` thì không. */
  tuChoi(() => trongGoc(GOC, `../${path.basename(ANH_EM)}/lot.txt`), "PATH_OUTSIDE_ROOT", "thu muc anh em trung tien to");
  tuChoi(() => ghiFile(GOC, `../${path.basename(ANH_EM)}/lot.txt`, "x"), "PATH_OUTSIDE_ROOT", "ghi sang thu muc anh em");
  assert.ok(!fs.existsSync(path.join(ANH_EM, "lot.txt")), "da ghi sang thu muc ANH EM — chot so chuoi hong");
});

/* ---- ③ Ba dạng đường dẫn TUYỆT ĐỐI, và hai trong ba lọt `path.isAbsolute` --
 * `C:x.txt` là "tương đối so với thư mục hiện tại CỦA ổ C" — một khái niệm chỉ Windows có, và
 * `isAbsolute` trả `false` cho nó. `\x.txt` giữ lại trong danh sách này dù chốt riêng
 * cho nó đã bỏ 07/09: trên Windows `isAbsolute` bắt được rồi, nên đây là ca đo CHỐT ĐÓ. */
khoi("duong tuyet doi ba dang", () => {
  for (const xau of ["C:\\Windows\\win.ini", "C:x.txt", "\\x.txt", "/etc/passwd", "//may/chia-se/x"]) {
    tuChoi(() => trongGoc(GOC, xau), "PATH_OUTSIDE_ROOT", xau);
  }
});

/* ---- ④ LIÊN KẾT MỀM — chốt dễ quên nhất -----------------------------------
 * Một liên kết mềm NẰM TRONG gốc, trỏ RA NGOÀI. Mọi phép so chuỗi đều thấy hợp lệ: đường dẫn
 * không có `..`, không tuyệt đối, `path.resolve` ra một điểm nằm trong gốc. Chỉ có hệ tệp biết
 * sự thật. Nếu máy không cho tạo liên kết mềm (Windows không bật chế độ nhà phát triển) thì
 * BÁO BỎ QUA CHỨ KHÔNG BÁO ĐẠT — "chưa đo được" không được đội lốt "đã đo và đạt". */
khoi("lien ket mem tro ra ngoai", () => {
  const lienKet = path.join(GOC, "loi-ra");
  let taoDuoc = true;
  try { fs.symlinkSync(NGOAI, lienKet, "junction"); }
  catch { taoDuoc = false; }
  if (!taoDuoc) {
    console.log("  ⚠ BỎ QUA chốt liên kết mềm: máy này không tạo được liên kết. CHƯA ĐO, không phải đã đạt.");
    return;
  }
  tuChoi(() => trongGoc(GOC, "loi-ra/bi-mat.txt"), "PATH_OUTSIDE_ROOT", "qua lien ket mem");
  tuChoi(() => ghiFile(GOC, "loi-ra/moi.txt", "x"), "PATH_OUTSIDE_ROOT", "ghi qua lien ket mem");
  assert.ok(!fs.existsSync(path.join(NGOAI, "moi.txt")), "da ghi ra NGOAI goc — chot lien ket mem hong");
});

/* ---- ⑤ Gốc do NGƯỜI KHỞI ĐỘNG khai, và hàm này không nhận gốc tương đối ----
 * Chốt ⑴ của `file-core.mjs`. Nhận gốc tương đối là để cái gốc phụ thuộc thư mục hiện tại của
 * tiến trình — mà thư mục đó đổi được, nên vùng ghi sẽ đổi theo mà không ai khai gì. */
khoi("goc phai tuyet doi va co that", () => {
  tuChoi(() => trongGoc("goc-tuong-doi", "x.txt"), "ROOT_INVALID", "goc tuong doi");
  tuChoi(() => trongGoc(path.join(TAM, "khong-co-that"), "x.txt"), "ROOT_MISSING", "goc khong co that");
});

/* ---- ⑥ Hình dạng xấu ------------------------------------------------------ */
khoi("hinh dang xau", () => {
  tuChoi(() => trongGoc(GOC, ""), "PATH_INVALID", "chuoi rong");
  tuChoi(() => trongGoc(GOC, "   "), "PATH_INVALID", "toan dau cach");
  tuChoi(() => trongGoc(GOC, 42), "PATH_INVALID", "khong phai chuoi");
  tuChoi(() => trongGoc(GOC, "a\0b"), "PATH_INVALID", "byte 0");
  tuChoi(() => trongGoc(GOC, "a".repeat(1025)), "PATH_INVALID", "dai qua tran");
});

/* ---- ⑦ Trần một lượt ghi — và nó phải đo BYTE, không đo ký tự -------------
 * Một chuỗi tiếng Việt có dấu nặng gấp rưỡi số ký tự của nó. Đo bằng `length` thì trần thật
 * cao hơn trần khai tới 50%, và cái chênh đó chỉ lộ ra khi có người ghi tiếng Việt. */
khoi("tran mot luot ghi", () => {
  const vuot = "đ".repeat(MAX_FILE_BYTES / 2 + 10);      // 2 byte/ký tự
  assert.ok(vuot.length < MAX_FILE_BYTES, "phai NGAN hon tran neu dem bang ky tu");
  const loi = tuChoi(() => ghiFile(GOC, "to.txt", vuot), "FILE_TOO_LARGE", "vuot tran");
  assert.ok(loi.details.bytes > MAX_FILE_BYTES, "phai bao so BYTE that");
  assert.ok(!fs.existsSync(path.join(GOC, "to.txt")), "bi tu choi roi ma van tao file");
});

/* ---- ⑧ Nối thêm KHÔNG được đè ------------------------------------------- */
khoi("noi them", () => {
  ghiFile(GOC, "nhat-ky.txt", "dong 1\n");
  ghiFile(GOC, "nhat-ky.txt", "dong 2\n", { append: true });
  assert.equal(fs.readFileSync(path.join(GOC, "nhat-ky.txt"), "utf8"), "dong 1\ndong 2\n");
  ghiFile(GOC, "nhat-ky.txt", "de\n");
  assert.equal(fs.readFileSync(path.join(GOC, "nhat-ky.txt"), "utf8"), "de\n", "khong append thi phai DE");
});

/* ---- ⑨ Bảng mã hoá đóng, và base64 đi qua nguyên vẹn --------------------- */
khoi("ma hoa", () => {
  tuChoi(() => ghiFile(GOC, "x.bin", "AAA", { encoding: "hex" }), "ENCODING_INVALID", "hex");
  const gocByte = Buffer.from([0, 1, 2, 250, 255]);
  ghiFile(GOC, "nhi-phan.bin", gocByte.toString("base64"), { encoding: "base64" });
  assert.deepEqual([...fs.readFileSync(path.join(GOC, "nhi-phan.bin"))], [...gocByte]);
  assert.equal(docFile(GOC, "nhi-phan.bin", { encoding: "base64" }).content, gocByte.toString("base64"));
});

/* ---- ⑩ Đọc cái không có, và đọc một thư mục ------------------------------ */
khoi("doc hut", () => {
  tuChoi(() => docFile(GOC, "khong-co.txt"), "FILE_NOT_FOUND", "file khong co");
  tuChoi(() => docFile(GOC, "du-lieu"), "IS_DIRECTORY", "doc mot thu muc");
  tuChoi(() => lietKe(GOC, "khong-co-thu-muc"), "DIR_NOT_FOUND", "liet ke thu muc khong co");
});

/* ---- ⑪ KHÔNG có đường XOÁ ------------------------------------------------
 * Luật gốc của Đức xếp "xoá file" vào nhóm phải hỏi trước. Câu *"mở thông luồng cho tất cả
 * tính năng"* (07/09) là câu chung, và luật riêng thắng luật chung — nên tầng này cố ý không
 * có đường xoá. Ghim lại để lượt "tiện tay thêm cho đủ bộ" sau này phải đi hỏi Đức trước. */
khoi("khong co duong xoa", () => {
  const nguon = fs.readFileSync(new URL("../bridge/file-core.mjs", import.meta.url), "utf8");
  for (const cam of ["unlinkSync", "rmSync", "rmdirSync", "renameSync"]) {
    assert.ok(!nguon.includes(cam), `file-core.mjs khong duoc goi ${cam} — xoa/doi ten file phai hoi Duc truoc`);
  }
});

fs.rmSync(TAM, { recursive: true, force: true });
console.log(`scouter-file-core-smoke: ${soKhoi} khoi, tat ca DAT`);
