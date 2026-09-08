/* Phép ghim cho `luoc-do-master.mjs` + `master.mjs` — tệp CSV SSOT của Đức.
 *
 * Lược đồ 25 cột KHÔNG do ta nghĩ ra: nó đọc ra từ chính tệp Đức đang dùng
 * (`HNX_PS_Ket_qua_giao_dich_AUG2026_MASTER.csv.xlsx`, đo 2026-09-08). Và đã đối chiếu THẬT:
 * lấy lại 12/08 từ HNX rồi so từng ô với hàng `VN41I1G80003` trong tệp của Đức — **25/25 khớp**.
 *
 * Cái đáng ghim ở đây là chỗ dữ liệu SAI mà vẫn trông ĐÚNG:
 *   · số kiểu Việt đọc nhầm thành kiểu Anh → sai gấp 1000 lần, con số vẫn hợp lý;
 *   · bảng lệch cột → mọi giá trị nằm dưới sai tên, tệp vẫn mở được;
 *   · ghi đè dòng cũ → mất dữ liệu Đức gom từ 07/2026, không có gì đỏ lên.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { COT_MASTER, LoiLuocDo, hangMaster, so, tachThayDoi } from "../luoc-do-master.mjs";
import { LoiMaster, docMaster, themHang } from "../master.mjs";

/* ---- ① Số kiểu Việt → kiểu Anh ---------------------------------------- */
{
  assert.equal(so("1.952,8"), "1952.8", "dấu chấm là phân cách NGHÌN, dấu phẩy là thập phân");
  assert.equal(so("227.139"), "227139", "1.000 lần sai nếu đọc dấu chấm thành thập phân");
  assert.equal(so("0,83"), "0.83");
  assert.equal(so("44.019.703.790.000"), "44019703790000");
  assert.equal(so("-16,5"), "-16.5");
  assert.equal(so("0"), "0");

  /* Ô rỗng ở lại RỖNG, không thành 0. HNX để trống khi không có giao dịch, mà "0" và "không có
   * giao dịch" là hai chuyện khác nhau khi tính trung bình. */
  assert.equal(so(""), "");
  assert.equal(so("   "), "");
  assert.equal(so("-"), "");

  /* Thứ không phải số phải ĐỎ, không được lặng lẽ thành 0 hay NaN. */
  for (const xau of ["abc", "1,2,3", "1.2.3,4,5", "12a"]) {
    assert.throws(() => so(xau), (e) => e instanceof LoiLuocDo && e.ma === "SO_LA", `lọt: ${xau}`);
  }
}

/* ---- ② Ô "thay đổi giá" chở HAI số trong một ô ------------------------- */
{
  assert.deepEqual(tachThayDoi("6,6 / 0,36"), { diem: "6.6", phanTram: "0.36" });
  assert.deepEqual(tachThayDoi("-22,6/-1,21"), { diem: "-22.6", phanTram: "-1.21" });
  assert.deepEqual(tachThayDoi(""), { diem: "", phanTram: "" });

  /* Không có dấu `/` thì coi cả ô là điểm và bỏ trống phần trăm — thà thiếu một cột còn hơn
   * đoán bừa rồi ghi một tỉ lệ không ai kiểm được. */
  assert.deepEqual(tachThayDoi("16"), { diem: "16", phanTram: "" });

  assert.throws(() => tachThayDoi("1/2/3"),
    (e) => e.ma === "THAY_DOI_LA", "ô ba phần phải đỏ, đừng đoán phần nào là gì");
}

/* ---- ③ Ánh xạ sang lược đồ master ------------------------------------- */
const bangThat = {
  cot: Array.from({ length: 24 }, (_v, i) => `c${i}`),
  hang: [[
    "up", "VN41I1G80003", "VN30", "F", "2608",
    "1.952,8", "1.920,1", "1.922,0", "1.940,0", "2.058,6", "1.789,4",
    "1.551", "298.102.200.000", "219.717", "42.582.627.590.000",
    "5.871", "1.138.974.000.000", "0", "0", "227.139", "44.019.703.790.000",
    "30.390", "1.940,0", "16,0 / 0,83"
  ]]
};
{
  const h = hangMaster(bangThat, "2026-08-12");
  assert.equal(h.length, 1);
  assert.equal(h[0].length, COT_MASTER.length, "phải đúng 25 cột");

  /* Đối chiếu với hàng THẬT trong tệp của Đức — đã so 25/25 ngày 08/09. */
  assert.equal(h[0][0], "2026-08-12", "trade_date không nằm trong bảng, nó là tham số của lượt gọi");
  assert.equal(h[0][1], "VN41I1G80003");
  assert.equal(h[0][5], "1952.8");
  assert.equal(h[0][12], "298102200000");
  /* `16,0` → `16.0`, KHÔNG rút thành `16`: giữ đúng số chữ số thập phân trang đã in. Rút gọn
   * là làm mất thông tin về độ chính xác, và ta không phải người quyết định điều đó. */
  assert.equal(h[0][23], "16.0", "change_points");
  assert.equal(h[0][24], "0.83", "change_pct");

  /* `maturity` và `isin` giữ NGUYÊN chuỗi. "2608" là mã tháng đáo hạn, không phải số đo —
   * đổi sang số rồi định dạng lại là cách mã hợp đồng biến thành 2.608 hoặc 2608.0. */
  assert.equal(h[0][4], "2608");

  /* Ngày sai dạng phải đỏ: một SSOT lẫn hai kiểu ngày là một SSOT không lọc được theo ngày. */
  for (const n of ["12/08/2026", "2026-8-12", "", null]) {
    assert.throws(() => hangMaster(bangThat, n), (e) => e.ma === "NGAY_SAI", `ngày lọt: ${n}`);
  }

  /* SỐ CỘT PHẢI ĐÚNG 24. Ánh xạ dưới đây theo VỊ TRÍ, nên một bảng 23 hoặc 25 cột sẽ gán mọi
   * giá trị vào sai tên — và tệp vẫn mở được, vẫn có số. */
  assert.throws(() => hangMaster({ cot: bangThat.cot.slice(0, 23), hang: [bangThat.hang[0].slice(0, 23)] }, "2026-08-12"),
    (e) => e.ma === "SO_COT_LA", "bảng lệch số cột phải đỏ");

  /* Câu lỗi phải nói RÕ hàng nào, ISIN nào — một lượt chạy 46 ngày mà chỉ báo "số lạ" thì
   * không ai tìm được chỗ hỏng. */
  const xau = { cot: bangThat.cot, hang: [bangThat.hang[0].map((v, i) => (i === 5 ? "abc" : v))] };
  assert.throws(() => hangMaster(xau, "2026-08-12"), (e) => /VN41I1G80003/.test(e.message),
    "câu lỗi phải nói ISIN của hàng hỏng");
}

/* ---- ④ Tệp SSOT: chỉ thêm, không bao giờ viết lại ---------------------- */
{
  const san = fs.mkdtempSync(path.join(os.tmpdir(), "master-ghim-"));
  const F = path.join(san, "ssot.csv");

  assert.deepEqual(docMaster(F), { coTep: false, ngay: new Set(), soHang: 0 },
    "tệp chưa có KHÁC tệp hỏng — chưa có thì bắt đầu từ trống được");

  themHang(F, hangMaster(bangThat, "2026-08-12"));
  let t = docMaster(F);
  assert.equal(t.soHang, 1);
  assert.deepEqual([...t.ngay], ["2026-08-12"]);

  themHang(F, hangMaster(bangThat, "2026-08-13"));
  t = docMaster(F);
  assert.equal(t.soHang, 2, "lượt hai phải NỐI, không ghi đè");
  assert.deepEqual([...t.ngay].sort(), ["2026-08-12", "2026-08-13"]);

  const van = fs.readFileSync(F, "utf8");
  assert.equal(van.charCodeAt(0), 0xFEFF, "thiếu BOM — Excel đọc tiêu đề tiếng Anh thì không sao, nhưng dữ liệu tiếng Việt thì hỏng");
  assert.equal((van.match(/trade_date/g) || []).length, 1, "tiêu đề chỉ được xuất hiện MỘT lần");
  assert.ok(van.includes("\r\n"), "CSV phải dùng CRLF");
  assert.ok(van.endsWith("\r\n"), "phải kết thúc bằng xuống dòng, nếu không lượt nối sau dính vào dòng cuối");

  /* Dòng cũ phải còn NGUYÊN VĂN sau khi nối. Đây là dữ liệu Đức gom từ 07/2026. */
  const dong = van.slice(1).split("\r\n").filter(Boolean);
  assert.equal(dong.length, 3);
  assert.ok(dong[1].includes("2026-08-12"), "dòng cũ bị đổi sau lượt nối");

  /* Tiêu đề lệch thì DỪNG, không tự sửa. Tự sửa tiêu đề của một tệp dữ liệu thật là cách
   * nhanh nhất để mọi cột lệch tên mà không ai biết. */
  const H = path.join(san, "hong.csv");
  fs.writeFileSync(H, '"sai","tieu","de"\r\n"1","2","3"\r\n', "utf8");
  assert.throws(() => docMaster(H), (e) => e instanceof LoiMaster && e.ma === "TIEU_DE_LECH");
  assert.throws(() => themHang(H, hangMaster(bangThat, "2026-08-14")),
    (e) => e.ma === "TIEU_DE_LECH", "không được nối vào một tệp có tiêu đề lạ");

  /* Hàng sai cỡ không bao giờ được chạm đĩa. */
  assert.throws(() => themHang(F, [["chi", "co", "ba", "o"]]),
    (e) => e.ma === "HANG_SAI_CO");
  assert.equal(docMaster(F).soHang, 2, "một lượt ghi bị từ chối không được đổi tệp");

  fs.rmSync(san, { recursive: true, force: true });
}

console.log("master smoke tests: PASS");
