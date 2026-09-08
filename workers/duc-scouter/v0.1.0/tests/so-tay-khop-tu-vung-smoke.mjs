/* so-tay-khop-tu-vung-smoke.mjs — SỔ TAY phải kể ĐÚNG những lệnh mà mã thật có.
 *
 * Vì sao có tệp này. Ngày 08/09 rà lại `README.md` của gói: nó viết *"Mười một method"* và
 * liệt kê 11, trong khi mã thật có **15**. Bốn cái thiếu là `scout.a11y` · `scout.shot` ·
 * `scout.fetch` · `scout.navigate` — và **hai cái sau chính là hai lệnh mà cả pilot HNX sống
 * bằng nó**. Một AI đọc sổ tay đó sẽ không biết `scout.fetch` tồn tại.
 *
 * Sổ tay không trôi vì ai đó lười. Nó trôi vì **không gì canh nó**: thêm một method thì cổng
 * kiểm xanh, suite xanh, chỉ có một bảng trong tài liệu là lặng lẽ sai đi. Đây là phép kiểm
 * đóng chỗ đó.
 *
 * Nó KHÔNG kiểm câu chữ mô tả — chữ là việc của người. Nó chỉ kiểm **tập tên lệnh**, thứ duy
 * nhất có một câu trả lời đúng.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const { METHOD_NAMES, capabilities } = await import("../scripts/scouter-bridge-core.mjs");

/* ---- ⑴ Bảng trong README kể đúng tập lệnh của mã --------------------------
 * Đọc tên lệnh ra khỏi bảng markdown: mọi `mã nhúng` nằm ở CỘT ĐẦU của một dòng bảng, và có
 * hình dạng `nhóm.tên`. Một ô có thể chở nhiều lệnh ngăn bằng `·` — bảng thật đang gộp ba
 * lệnh bắt tay vào một dòng, nên đừng giả định mỗi dòng một lệnh. */
{
  const readme = fs.readFileSync(path.join(here, "..", "README.md"), "utf8");

  const trongSo = new Set();
  for (const dong of readme.split(String.fromCharCode(10))) {
    if (!dong.startsWith("|")) continue;
    const oDau = dong.split("|")[1];
    if (oDau === undefined) continue;
    for (const khop of oDau.matchAll(/`([a-z]+\.[a-z0-9]+)`/g)) trongSo.add(khop[1]);
  }

  /* Bộ đọc trả về RỖNG thì ĐỎ, không lặng lẽ đạt. Nếu ai đổi bảng markdown sang hình dạng khác,
   * phép kiểm này sẽ khớp 0 lệnh — và "0 lệnh khớp 0 lệnh thiếu" là một lượt tự tắt trông y hệt
   * một lượt chạy tốt. Đây là cách một phép kiểm chết mà bảng vẫn xanh. */
  assert.ok(trongSo.size > 0,
    "không đọc được lệnh nào từ bảng README — bộ đọc hỏng, KHÔNG phải sổ tay đúng");

  const trongMa = new Set(METHOD_NAMES);
  const soThieu = [...trongMa].filter((t) => !trongSo.has(t)).sort();
  const soThua = [...trongSo].filter((t) => !trongMa.has(t)).sort();

  assert.deepEqual(soThieu, [],
    `README THIẾU lệnh mà mã thật có: ${soThieu.join(" · ")} — một AI đọc sổ tay sẽ không biết chúng tồn tại`);
  assert.deepEqual(soThua, [],
    `README kể lệnh mà mã KHÔNG có: ${soThua.join(" · ")} — hứa một năng lực không tồn tại còn tệ hơn im lặng`);

  /* Con số viết bằng chữ trong câu dẫn cũng phải khớp. Đây đúng là chỗ đã sai: câu viết
   * "Mười một" trong khi bảng ngay dưới đáng lẽ có 15 dòng. */
  const CHU_SO = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín", "mười",
    "mười một", "mười hai", "mười ba", "mười bốn", "mười lăm", "mười sáu", "mười bảy", "mười tám",
    "mười chín", "hai mươi"];
  const dung = CHU_SO[trongMa.size];
  assert.ok(dung !== undefined, `bảng chữ số chưa có mục cho ${trongMa.size} — thêm vào rồi chạy lại`);
  const cauDan = readme.match(/^\**([A-ZĐÀ-ỹa-zà-ỹ ]+?)\** method, \*\*từ vựng đóng\*\*/m);
  assert.ok(cauDan, "không thấy câu dẫn '… method, **từ vựng đóng**' — sửa phép kiểm nếu câu đó đã đổi");
  assert.equal(cauDan[1].trim().toLowerCase(), dung,
    `câu dẫn nói "${cauDan[1].trim()}" method nhưng mã có ${trongMa.size}`);
}

/* ---- ⑵ Bảng năng lực trả cho AI khớp với từ vựng --------------------------
 * `system.capabilities` là câu trả lời CÓ THẨM QUYỀN mà README tự nhận. Nếu nó lệch với
 * `METHOD_NAMES` thì câu đó sai, và mọi chỗ khác dẫn lại nó cũng sai theo. */
{
  const ban = capabilities();
  assert.deepEqual(ban.methods.map((x) => x.name), [...METHOD_NAMES],
    "bảng năng lực lệch với từ vựng — một trong hai đang nói dối");
  for (const x of ban.methods) {
    assert.equal(typeof x.description, "string");
    assert.ok(x.description.length > 0, `${x.name} thiếu mô tả trong bảng năng lực`);
    assert.equal(typeof x.read_only, "boolean", `${x.name} phải khai rõ đọc hay ghi`);
  }
}

console.log("so-tay-khop-tu-vung-smoke: 2 khoi, tat ca DAT");
