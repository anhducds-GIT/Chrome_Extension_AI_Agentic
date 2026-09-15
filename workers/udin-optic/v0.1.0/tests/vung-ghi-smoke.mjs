/* vung-ghi-smoke.mjs — phép ghim của luật VÙNG GHI (`bridge/vung-ghi.mjs`).
 *
 * File này sinh ra từ một lỗi thật, 16/09. `U4` cài luật *"đổi ổ đĩa bằng một dòng"* vào bộ
 * khởi động — và hoá ra có **hai** bộ khởi động, một cái nằm **ngoài repo**. Tức là hai bản
 * của một luật, và bản quan trọng hơn thì git không thấy, không phép ghim nào canh được, một
 * lượt cài lại máy là mất. Luật đã dồn về `bridge/vung-ghi.mjs`; file này là cái canh nó.
 *
 * Hệ tệp bơm vào qua `tep`, nên phép ghim chạy không cần một thư mục thật nào trên đĩa.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { timVungGhi, canhTrumLenNhau, TEN_TEP_CAU_HINH, TEN_THU_MUC_MAC_DINH } from "../bridge/vung-ghi.mjs";

const NHA = path.resolve("C:/Bridge/udin-optic");
const GHEP = path.join(NHA, "udin-optic-bridge-pairing-v1.json");
const CAU_HINH = path.join(NHA, TEN_TEP_CAU_HINH);

/** Hệ tệp giả: chỉ biết đúng những tệp được kể tên. */
const tepGia = (bang) => ({
  existsSync: (d) => Object.prototype.hasOwnProperty.call(bang, path.resolve(d)),
  readFileSync: (d) => {
    const k = path.resolve(d);
    if (!Object.prototype.hasOwnProperty.call(bang, k)) throw new Error(`ENOENT: ${k}`);
    return bang[k];
  }
});

/* ═══ THỨ TỰ: --root ‣ vung-ghi.txt ‣ anh-ra ═══════════════════════════════ */

{
  const k = timVungGhi({ duongGhepCap: GHEP, tep: tepGia({}) });
  assert.equal(k.duong, path.join(NHA, TEN_THU_MUC_MAC_DINH), "không có gì thì dùng `anh-ra` cạnh tệp ghép cặp");
  assert.equal(k.tu, "mac-dinh");
}
{
  const k = timVungGhi({ duongGhepCap: GHEP, tep: tepGia({ [CAU_HINH]: "D:\\Udin\\ket-xuat\n" }) });
  assert.equal(k.duong, path.resolve("D:\\Udin\\ket-xuat"), "có `vung-ghi.txt` thì theo nó");
  assert.equal(k.tu, TEN_TEP_CAU_HINH, "phải nói ra đường này LẤY TỪ ĐÂU");
}
{
  /* `--root` THẮNG cả `vung-ghi.txt`: người khởi động khai thẳng là ý định mạnh nhất. */
  const k = timVungGhi({ duongGhepCap: GHEP, root: "E:\\tam", tep: tepGia({ [CAU_HINH]: "D:\\Udin\\ket-xuat" }) });
  assert.equal(k.duong, path.resolve("E:\\tam"));
  assert.equal(k.tu, "--root");
}

/* ═══ DÒNG TRONG TỆP CẤU HÌNH — Đức gõ tay, nên phải chịu được tay người ═══ */

const doDong = (chu) => timVungGhi({ duongGhepCap: GHEP, tep: tepGia({ [CAU_HINH]: chu }) });

assert.equal(doDong('  "D:\\Udin\\co nhay"  ').duong, path.resolve("D:\\Udin\\co nhay"),
  "dấu nháy bao quanh và khoảng trắng thừa phải được bóc — dán từ Explorer là ra đúng hình dạng đó");
assert.equal(doDong("D:\\Udin\\A\nD:\\Udin\\B\n").duong, path.resolve("D:\\Udin\\A"),
  "đọc ĐÚNG dòng đầu; dòng thứ hai là chú thích của người viết, không phải một đường thứ hai");
assert.equal(doDong("D:\\Udin\\A\r\nrác\r\n").duong, path.resolve("D:\\Udin\\A"),
  "tệp kiểu Windows (CRLF) phải đọc ra đúng đường, không dính `\\r`");

for (const rong of ["", "   ", "\n", "  \r\n  \r\n"]) {
  const k = doDong(rong);
  assert.equal(k.duong, path.join(NHA, TEN_THU_MUC_MAC_DINH),
    "tệp rỗng = chưa điền = dùng mặc định. ĐỎ ở đây thì máy chủ không bật được vì một tệp trống");
  assert.equal(k.tu, "mac-dinh");
}

/* Đường TƯƠNG ĐỐI bị TỪ CHỐI, không được âm thầm ghép vào thư mục hiện tại: thư mục hiện tại
 * của máy chủ tuỳ chỗ bấm mà khác nhau, nên ảnh sẽ rơi xuống những chỗ khác nhau giữa hai lần
 * bật — đúng loại hỏng không ai truy ra được. */
for (const tuongDoi of ["ket-xuat", ".\\ra", "..\\ra", "ra/xa"]) {
  assert.throws(() => doDong(tuongDoi), /TUY\u1ec6T \u0110\u1ed0I/,
    `'${tuongDoi}' là đường tương đối, phải bị từ chối kèm lý do`);
}
{
  let loi = null;
  try { doDong("ket-xuat"); } catch (e) { loi = e; }
  assert.match(loi.message, /vung-ghi\.txt/, "lời từ chối phải chỉ ra ĐÚNG tệp cần sửa");
  assert.match(loi.message, /D:/, "và phải cho một ví dụ gõ đúng");
}

assert.throws(() => timVungGhi({}), /duongGhepCap/, "thiếu tệp ghép cặp thì ném, không đoán một thư mục nào");

/* ═══ VÙNG GHI KHÔNG ĐƯỢC CHỨA THƯ MỤC GHÉP CẶP ═══════════════════════════
 * `file.read` đọc được mọi tệp dưới vùng ghi, và thư mục ghép cặp giữ token. */

assert.equal(canhTrumLenNhau({ duongGhepCap: GHEP, vungGhi: "D:\\Udin\\ket-xuat" }), path.resolve("D:\\Udin\\ket-xuat"));
assert.equal(canhTrumLenNhau({ duongGhepCap: GHEP, vungGhi: path.join(NHA, "anh-ra") }), path.join(NHA, "anh-ra"),
  "thư mục CON của thư mục ghép cặp thì được — đó là hình dạng mặc định");

for (const trum of [NHA, path.resolve("C:/Bridge"), path.resolve("C:/")]) {
  assert.throws(() => canhTrumLenNhau({ duongGhepCap: GHEP, vungGhi: trum }), /token/,
    `vùng ghi '${trum}' trùm lên thư mục ghép cặp — phải từ chối, và phải nói ra vì sao`);
}
/* Windows không phân biệt hoa thường: `c:\\bridge` là cùng một chỗ với `C:\\Bridge`, và một
 * phép so phân biệt hoa thường sẽ cho nó lọt. */
assert.throws(() => canhTrumLenNhau({ duongGhepCap: GHEP, vungGhi: "c:\\bridge" }), /token/,
  "so đường dẫn Windows phải BỎ QUA hoa thường");
/* Tên chỉ TRÙNG TIỀN TỐ thì không phải là trùm lên: `C:\\Bridge-cu` không chứa `C:\\Bridge`. */
assert.equal(canhTrumLenNhau({ duongGhepCap: GHEP, vungGhi: "C:\\Bridge-cu" }), path.resolve("C:\\Bridge-cu"),
  "chỉ giống tiền tố thì KHÔNG phải trùm lên — nếu không thì một thư mục vô can bị chặn oan");

/* ═══ BỘ KHỞI ĐỘNG KHÔNG ĐƯỢC GIỮ BẢN RIÊNG CỦA LUẬT ══════════════════════
 * Đây là cái canh chính cho lỗi 16/09. Bộ khởi động trong repo chỉ được PHÉP gọi vào máy chủ. */
const cmd = fs.readFileSync(new URL("../bridge/Chay-may-chu-Udin.cmd", import.meta.url), "utf8");
assert.ok(!/set\s+\/p\s+ROOT=/i.test(cmd),
  "`Chay-may-chu-Udin.cmd` không được tự đọc `vung-ghi.txt` — luật nằm ở `bridge/vung-ghi.mjs`, một chỗ thôi");
assert.match(cmd, /--pairing "%PAIRING%"\s*$/m,
  "phải có đường gọi KHÔNG kèm `--root`, để máy chủ tự quyết vùng ghi");

/* Và host phải THẬT SỰ gọi vào luật đó, chứ không dựng lại một bản riêng bên trong nó. */
const host = fs.readFileSync(new URL("../bridge/udin-optic-host.mjs", import.meta.url), "utf8");
assert.match(host, /from "\.\/vung-ghi\.mjs"/, "host phải nhập luật, không chép lại");
assert.match(host, /timVungGhi\(\{/, "và phải gọi nó");
assert.match(host, /canhTrumLenNhau\(\{/, "và phải chạy phép canh trùm trước khi mở máy chủ");

console.log("vung-ghi-smoke: OK");
