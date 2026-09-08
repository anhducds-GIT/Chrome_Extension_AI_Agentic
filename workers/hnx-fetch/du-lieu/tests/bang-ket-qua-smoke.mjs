/* Phép ghim cho `bang-ket-qua.mjs` — đọc bảng kết quả giao dịch HNX thành hàng và cột.
 *
 * Cái đáng ghim ở đây KHÔNG phải "hàm có chạy không". Là: **một bảng sai vẫn mở được, vẫn có
 * số, nên không ai phát hiện.** Mọi ca dưới đây canh đúng chỗ đó.
 *
 * Hình dạng HTML lấy từ chính hnx.vn, đo 2026-09-08, rút gọn lại: `<thead>` 2 hàng, hàng trên
 * trộn `rowspan=2` với `colspan=2`.
 */
import assert from "node:assert/strict";
import { LoiBang, docBang, raCsv, tenCot } from "../bang-ket-qua.mjs";

const THAT = `<table><thead>
<tr><th rowspan="2"></th><th rowspan="2">ISIN</th><th rowspan="2">S&#7843;n ph&#7849;m</th>
    <th colspan="2">Kh&#7899;p l&#7879;nh li&#234;n t&#7909;c</th><th rowspan="2">Gi&#225; thanh to&#225;n</th></tr>
<tr><th>KLGD</th><th>GTGD</th></tr>
</thead><tbody>
<tr><td>1</td><td>VN41I2G90000</td><td>VN100</td><td>137</td><td>25.621.070.000</td><td>1.861,7</td></tr>
<tr><td>2</td><td>VN41I2GA0000</td><td>VN100</td><td>12</td><td>2.240.000.000</td><td>1.870,0</td></tr>
</tbody></table>`;

/* ---- ① Tên cột: nhóm phải được GHÉP với tên con ------------------------- */
{
  const c = tenCot(THAT);
  assert.deepEqual(c, [
    "Hướng (tên ảnh HNX, ta tự đặt tên cột)", "ISIN", "Sản phẩm",
    "Khớp lệnh liên tục — KLGD",
    "Khớp lệnh liên tục — GTGD",
    "Giá thanh toán"
  ]);

  /* Vì sao phải ghép: bảng thật có NĂM nhóm, mỗi nhóm một cặp KLGD/GTGD. Không ghép thì có
   * năm cột tên "KLGD" nằm cạnh nhau, và không ai tra được cột nào của cái gì. */
  const nam = c.filter((x) => x === "KLGD");
  assert.equal(nam.length, 0, "còn cột KLGD đứng trơ ra thì bảng không dùng được");

  /* Ô đầu của HNX không có tên. Để rỗng là để một cột không ai tra được. Tên này DO TA ĐẶT,
   * và chuỗi phải tự nói ra điều đó — nếu không, lượt sau tưởng HNX đặt tên như thế. */
  assert.match(c[0], /ta tự đặt/, "tên do ta đặt phải tự khai là do ta đặt");

  /* Thực thể HTML phải được giải. `&#7843;` là cách hnx.vn mã hoá chữ có dấu; bỏ qua nó thì
   * mọi tên cột tiếng Việt thành rác. */
  assert.ok(c.includes("Sản phẩm"), "chưa giải thực thể HTML — tên cột tiếng Việt sẽ thành rác");
}

/* ---- ② Đọc bảng: đúng số cột, đúng nội dung ---------------------------- */
{
  const b = docBang(THAT);
  assert.equal(b.cot.length, 6);
  assert.equal(b.hang.length, 2);
  assert.deepEqual(b.hang[0], ["1", "VN41I2G90000", "VN100", "137", "25.621.070.000", "1.861,7"]);
  assert.equal(b.hang[1][1], "VN41I2GA0000");
}

/* ---- ③ Trang đổi cấu trúc thì ĐỎ, không đoán --------------------------- */
{
  const nem = (html, ma, viTri) => assert.throws(() => docBang(html),
    (e) => e instanceof LoiBang && e.ma === ma, `${viTri}: mong đợi ${ma}`);

  nem("<table><tbody><tr><td>1</td></tr></tbody></table>", "KHONG_CO_THEAD", "mất thead");
  nem(THAT.replace(/<tbody>[\s\S]*<\/tbody>/, ""), "KHONG_CO_TBODY", "mất tbody");

  /* Nhóm khai colspan=2 mà hàng dưới chỉ còn 1 ô: cấu trúc đã đổi. Nếu im lặng thì mọi cột
   * sau chỗ đó lệch tên, và bảng vẫn mở được — đúng cái sai không ai phát hiện. */
  nem(THAT.replace("<tr><th>KLGD</th><th>GTGD</th></tr>", "<tr><th>KLGD</th></tr>"),
    "THIEU_TIEU_DE_CON", "hàng tiêu đề dưới thiếu ô");

  nem(THAT.replace("<tr><th>KLGD</th><th>GTGD</th></tr>", "<tr><th>KLGD</th><th>GTGD</th><th>THUA</th></tr>"),
    "THUA_TIEU_DE_CON", "hàng tiêu đề dưới thừa ô");

  /* ĐÂY LÀ CA QUAN TRỌNG NHẤT CỦA CẢ FILE. Một hàng thiếu ô nghĩa là mọi giá trị sau chỗ
   * thiếu đều nằm dưới sai tên cột. Bảng đó vẫn mở được, vẫn có số, và người đọc sẽ tin nó. */
  nem(THAT.replace("<td>137</td><td>25.621.070.000</td>", "<td>137</td>"),
    "LECH_COT", "hàng thiếu một ô");

  nem(THAT.replace("<tbody>", "<tbody><tr><td>x</td><td>y</td></tr>"),
    "LECH_COT", "hàng lạ ít cột");

  nem(THAT.replace(/<tbody>[\s\S]*?<\/tbody>/, "<tbody></tbody>"),
    "KHONG_CO_HANG", "tbody rỗng");
}

/* ---- ④ CSV ------------------------------------------------------------- */
{
  const csv = raCsv(docBang(THAT));

  /* BOM: Excel trên Windows mở CSV không BOM bằng bảng mã hệ thống, và tên cột tiếng Việt
   * thành rác. Đức mở tệp này bằng Excel — thiếu BOM là tệp coi như hỏng. */
  assert.equal(csv.charCodeAt(0), 0xFEFF, "thiếu BOM UTF-8 — Excel sẽ đọc tên cột thành rác");

  /* Bọc MỌI ô, không chỉ ô "có vẻ cần". Dữ liệu HNX dùng dấu phẩy làm phần thập phân
   * (`1.861,7`), nên một bộ bọc "chỉ khi cần" sẽ để nguyên rất nhiều ô rồi vỡ ở đúng những
   * ô quan trọng nhất — các cột giá. */
  assert.ok(csv.includes('"1.861,7"'), "ô có dấu phẩy thập phân phải được bọc");
  const dong = csv.slice(1).split("\r\n").filter(Boolean);
  assert.equal(dong.length, 3, "một dòng tiêu đề + hai dòng dữ liệu");
  for (const d of dong) {
    assert.ok(d.startsWith('"') && d.endsWith('"'), "mọi ô phải được bọc, không có ca biên để quên");
  }

  /* Xuống dòng CRLF: RFC 4180, và Excel trên Windows đọc đúng hơn. */
  assert.ok(csv.includes("\r\n"), "CSV phải dùng CRLF");

  /* Dấu nháy trong dữ liệu phải được nhân đôi, nếu không một ô sẽ nuốt phần còn lại của dòng. */
  const coNhay = raCsv({ cot: ["a"], hang: [['x"y']] });
  assert.ok(coNhay.includes('"x""y"'), 'dấu nháy trong ô phải nhân đôi');

  /* Chiều ngược lại: tắt BOM được, để nơi khác dùng lại hàm này mà không dính BOM. */
  assert.notEqual(raCsv(docBang(THAT), { bom: false }).charCodeAt(0), 0xFEFF);
}

/* ---- ⑤ MỘT Ô CHỈ CÓ ẢNH VẪN LÀ DỮ LIỆU --------------------------------
 *
 * Suýt thành một lỗi giao hàng ngày 08/09: cột đầu của bảng HNX không có chữ nào, nó chứa
 * `<img src="/Content/img/up.png">` — dấu tăng/giảm giá. Bản đầu của tôi gỡ thẻ rồi lấy phần
 * chữ, nên ô đó ra RỖNG và cả một cột dữ liệu biến mất TRONG IM LẶNG. CSV vẫn đủ 24 cột, vẫn
 * mở được, vẫn có số — không có gì đỏ lên.
 *
 * Đo trên 7 ngày: `up.png` 33 lần, `down6.png` 23 lần, tổng 56 = 7 × 8 hàng. Mỗi hàng đều có.
 */
{
  const anh = THAT.replace("<td>1</td>", '<td><img src="/Content/img/up.png" /></td>')
    .replace("<td>2</td>", '<td><img src="/Content/img/down6.png" /></td>');
  const b = docBang(anh);
  assert.equal(b.hang[0][0], "up", "ô chỉ có ảnh bị nuốt — mất cả một cột dữ liệu trong im lặng");
  assert.equal(b.hang[1][0], "down6", "phải giữ NGUYÊN tên tệp, không dịch sang tăng/giảm");

  /* Giữ nguyên tên tệp chứ không dịch: dịch là diễn giải, và một bảng lưu trữ nên giữ đúng
   * thứ trang đã nói. Một ảnh chưa từng gặp cũng phải đi qua được, không được thành rỗng. */
  const la = THAT.replace("<td>1</td>", '<td><img src="/Content/img/khong-doi.svg" /></td>');
  assert.equal(docBang(la).hang[0][0], "khong-doi", "ảnh chưa từng gặp phải giữ lại, không được thành rỗng");

  /* Chiều ngược lại: ô CÓ CHỮ thì chữ thắng, đừng đi tìm ảnh. */
  const caHai = THAT.replace("<td>1</td>", '<td><img src="/x/up.png" />7</td>');
  assert.equal(docBang(caHai).hang[0][0], "7", "ô có chữ thì phải lấy chữ");

  /* Và một ô rỗng THẬT thì vẫn rỗng — đừng bịa giá trị. */
  const rong = THAT.replace("<td>1</td>", "<td></td>");
  assert.equal(docBang(rong).hang[0][0], "", "ô rỗng thật phải ở lại rỗng");
}

console.log("bang-ket-qua smoke tests: PASS");
