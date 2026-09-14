/* file-core.mjs — TẦNG THỨ BA của ADR-0009: ghi ghi chép xuống đĩa.
 *
 * Đây là phần LÕI, thuần: không mở cổng, không đọc `process.argv`, không biết gì về HTTP. Máy
 * chủ ở `scouter-bridge-host.mjs` bơm đường dẫn gốc vào rồi gọi ba hàm dưới. Tách ra vì chỗ
 * nguy hiểm nhất của cả gói nay nằm ở đây — và một hàm thuần thì ghim được đầy đủ mà không cần
 * dựng máy chủ nào.
 *
 * ---- VÌ SAO CÓ FILE NÀY -----------------------------------------------------
 * ADR-0009 mục ⑸ tả vòng tự cải tiến là "Scouter quan sát → **Bridge ghi code mới xuống đĩa**
 * → `scout.reload`". Đo ngày 07/09: cái vế giữa **chưa bao giờ tồn tại**. `bridge-host.mjs`
 * của gói ChatGPT chỉ ĐỌC đúng một file (tệp ghép cặp) và không có đường ghi nào. Mà gói đó
 * Đức đã đóng băng, nên không sửa được. File này là vế giữa, dựng ở chỗ được phép dựng.
 *
 * ---- HAI CHỐT, VÀ VÌ SAO CHÚNG KHÔNG PHẢI "GIỚI HẠN TÍNH NĂNG" --------------
 * Đức chốt 07/09: *"mở thông luồng cho tất cả các tính năng"*. Hai chốt dưới đây KHÔNG chống
 * lại câu đó — chúng phân biệt một công cụ phát triển với một dịch vụ ghi file từ xa:
 *
 * ⑴ **Gốc do NGƯỜI KHỞI ĐỘNG khai, không do người gọi khai.** Ai bật máy chủ thì người đó chọn
 *    vùng ghi (`--root`). Lệnh đi trên dây KHÔNG nới được vùng đó ra. Nếu người gọi tự khai
 *    gốc thì cái gốc chỉ là một gợi ý, và "vùng ghi" thành một chữ không có nghĩa.
 *
 * ⑵ **Đi ra khỏi gốc là ĐỎ, kể cả bằng liên kết mềm.** Chặn `..` là phần dễ và ai cũng nhớ.
 *    Phần hay quên: một liên kết mềm NẰM TRONG gốc trỏ ra ngoài thì `path.resolve` thấy hợp lệ
 *    hoàn toàn — nên phải hỏi thêm `realpath`. Trên Windows còn hai cửa nữa mà `path.isAbsolute`
 *    trả `false`: đường dẫn theo ổ đĩa (`C:x.txt`) và đường bắt đầu bằng dấu gạch (`\x`).
 *
 * KHÔNG CÓ `file.delete`, cố ý. Luật gốc của Đức xếp "xoá file" vào nhóm phải hỏi trước, và
 * câu "mở thông luồng" là câu chung — luật riêng thắng luật chung. Thêm sau nếu Đức nói.
 */
import fs from "node:fs";
import path from "node:path";

/* Trần một file. 8 MiB — rộng hơn phong bì Bridge 1 MiB rất nhiều, cố ý: người gọi ghép nhiều
 * lượt `file.append` lại thành một file lớn được, mà mỗi lượt vẫn lọt phong bì. */
export const MAX_FILE_BYTES = 8 * 1024 * 1024;

export class FileError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "FileError";
    this.code = code;
    this.details = details;
  }
}

const loi = (code, message, details) => { throw new FileError(code, message, details); };

/* Đường dẫn nào KHÔNG BAO GIỜ nhận, xét trước khi đụng đĩa. Ba dạng, và cả ba đều là dạng mà
 * `path.isAbsolute` trên Windows trả về `false` cho ít nhất một cái — nên đừng rút gọn khối này
 * thành một lời gọi `isAbsolute`. */
function tuChoiHinhDangXau(rel) {
  if (typeof rel !== "string" || rel.trim() === "") loi("PATH_INVALID", "Đường dẫn phải là một chuỗi không rỗng.");
  if (rel.length > 1024) loi("PATH_INVALID", "Đường dẫn dài quá 1024 ký tự.");
  if (rel.includes("\0")) loi("PATH_INVALID", "Đường dẫn chứa byte 0.");
  if (path.isAbsolute(rel)) loi("PATH_OUTSIDE_ROOT", "Chỉ nhận đường dẫn TƯƠNG ĐỐI so với gốc.", { path: rel });
  /* `C:x.txt` — tương đối so với thư mục hiện tại CỦA Ổ C, không phải so với gốc ta đưa.
   * `path.isAbsolute("C:x.txt")` trả `false`, nên nó lọt qua phép kiểm trên. */
  if (/^[A-Za-z]:/.test(rel)) loi("PATH_OUTSIDE_ROOT", "Đường dẫn theo ổ đĩa không phải đường tương đối.", { path: rel });
}

/* MỘT phép trả lời cho câu "điểm này có nằm trong gốc không", dùng ở CẢ HAI chỗ cần nó.
 * Trước 07/09 câu này được viết hai lần, và hai bản trùng nhau đủ để che nhau: một con đột biến
 * phá bản thứ nhất vẫn bị bản thứ hai bắt, nên bộ đo báo "sống sót" mà không ai chỉ ra được chỗ
 * hở. Trùng lặp ở đây không phải bền vững — nó là chỗ mù.
 *
 * So bằng `path.relative`, KHÔNG bằng `startsWith`: `startsWith` coi `/goc-khac` là nằm trong
 * `/goc` vì nó chỉ so chuỗi. */
function raNgoaiGoc(gocThat, diem) {
  const buoc = path.relative(gocThat, diem);
  return buoc !== "" && (buoc === ".." || buoc.startsWith(`..${path.sep}`) || path.isAbsolute(buoc));
}

/* Tổ tiên CÓ THẬT gần nhất của một đường dẫn. Cần vì `realpath` ném khi file chưa tồn tại — mà
 * lượt ghi đầu tiên thì đúng là chưa tồn tại. Ta hỏi thư mục cha gần nhất đã có, và hỏi nó
 * bằng `realpathSync` để một liên kết mềm giữa đường không lọt. */
function toTienCoThat(diem) {
  let hien = diem;
  for (let i = 0; i < 64; i += 1) {
    if (fs.existsSync(hien)) return hien;
    const cha = path.dirname(hien);
    if (cha === hien) return hien;
    hien = cha;
  }
  return hien;
}

/**
 * Đổi một đường dẫn tương đối thành đường tuyệt đối NẰM TRONG gốc, hoặc ném.
 * @param {string} root  gốc tuyệt đối, do người khởi động máy chủ khai
 * @param {string} rel   đường tương đối do người gọi đưa
 */
export function trongGoc(root, rel) {
  tuChoiHinhDangXau(rel);
  if (typeof root !== "string" || !path.isAbsolute(root)) {
    loi("ROOT_INVALID", "Gốc phải là một đường dẫn tuyệt đối.", { root: String(root) });
  }
  /* `realpathSync` ngay từ GỐC: nếu chính cái gốc là một liên kết mềm thì mọi phép so chuỗi
   * bên dưới so nhầm hai hệ quy chiếu khác nhau. */
  let gocThat;
  try { gocThat = fs.realpathSync(root); }
  catch { loi("ROOT_MISSING", "Thư mục gốc không tồn tại.", { root }); }

  const dich = path.resolve(gocThat, rel);
  if (raNgoaiGoc(gocThat, dich)) loi("PATH_OUTSIDE_ROOT", "Đường dẫn đi ra khỏi gốc.", { path: rel });
  /* CHỐT LIÊN KẾT MỀM. Tới đây đường dẫn hợp lệ về mặt CHUỖI. Nhưng một liên kết mềm nằm trong
   * gốc mà trỏ ra ngoài thì chuỗi vẫn đẹp, còn lượt ghi thì rơi ra ngoài. Hỏi hệ tệp, đừng tin
   * chuỗi. */
  const neo = toTienCoThat(dich);
  let neoThat;
  try { neoThat = fs.realpathSync(neo); }
  catch { loi("PATH_INVALID", "Không đọc được đường dẫn thật.", { path: rel }); }
  if (raNgoaiGoc(gocThat, neoThat)) {
    loi("PATH_OUTSIDE_ROOT", "Đường dẫn đi ra khỏi gốc qua một liên kết mềm.", { path: rel, real: neoThat });
  }
  return dich;
}

/** Ghi một file. Tạo thư mục cha nếu thiếu. `append` để nối thêm thay vì đè. */
export function ghiFile(root, rel, noiDung, { append = false, encoding = "utf8" } = {}) {
  const dich = trongGoc(root, rel);
  if (typeof noiDung !== "string") loi("CONTENT_INVALID", "Nội dung phải là một chuỗi.");
  if (encoding !== "utf8" && encoding !== "base64") {
    loi("ENCODING_INVALID", "Chỉ nhận utf8 hoặc base64.", { encoding });
  }
  const bytes = Buffer.from(noiDung, encoding);
  if (bytes.length > MAX_FILE_BYTES) {
    loi("FILE_TOO_LARGE", `Một lượt ghi tối đa ${MAX_FILE_BYTES} byte.`, { bytes: bytes.length, max_bytes: MAX_FILE_BYTES });
  }
  fs.mkdirSync(path.dirname(dich), { recursive: true });
  if (append) fs.appendFileSync(dich, bytes);
  else fs.writeFileSync(dich, bytes);
  return { path: rel, bytes: bytes.length, appended: append === true, size: fs.statSync(dich).size };
}

/** Đọc một file dưới dạng chuỗi. */
export function docFile(root, rel, { encoding = "utf8" } = {}) {
  const dich = trongGoc(root, rel);
  if (encoding !== "utf8" && encoding !== "base64") {
    loi("ENCODING_INVALID", "Chỉ nhận utf8 hoặc base64.", { encoding });
  }
  let stat;
  try { stat = fs.statSync(dich); }
  catch { loi("FILE_NOT_FOUND", "Không có file đó.", { path: rel }); }
  if (stat.isDirectory()) loi("IS_DIRECTORY", "Đường dẫn là một thư mục, không phải file.", { path: rel });
  if (stat.size > MAX_FILE_BYTES) {
    loi("FILE_TOO_LARGE", `File ${stat.size} byte, quá trần ${MAX_FILE_BYTES}.`, { bytes: stat.size, max_bytes: MAX_FILE_BYTES });
  }
  return { path: rel, bytes: stat.size, encoding, content: fs.readFileSync(dich).toString(encoding) };
}

/** Liệt kê một thư mục, một tầng. Không đệ quy — đệ quy trên một cây lớn là một lượt trả về
 *  không có trần, và người gọi không đoán được nó to cỡ nào trước khi gọi. */
export function lietKe(root, rel = ".") {
  const dich = trongGoc(root, rel === "" ? "." : rel);
  let items;
  try { items = fs.readdirSync(dich, { withFileTypes: true }); }
  catch { loi("DIR_NOT_FOUND", "Không có thư mục đó.", { path: rel }); }
  return {
    path: rel,
    entries: items.map((item) => {
      const day = path.join(dich, item.name);
      let size = null;
      if (item.isFile()) { try { size = fs.statSync(day).size; } catch { size = null; } }
      return {
        name: item.name,
        kind: item.isDirectory() ? "dir" : item.isFile() ? "file" : "other",
        bytes: size
      };
    })
  };
}
