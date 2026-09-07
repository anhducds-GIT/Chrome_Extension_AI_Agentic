/* tests/nguon-hnx-smoke.mjs — ghim HỢP ĐỒNG TRANG.
 *
 * Mọi hình dạng dùng ở đây là hình dạng ĐÃ ĐO ngày 07/09 trên trang thật (chi tiết ở khối đầu
 * `nguon-hnx.mjs`). Phép ghim thì chạy trên bản ghi lại, không gọi mạng: một phép ghim gọi
 * mạng là một phép ghim sẽ đỏ vào ngày trang bảo trì, và lúc đó người ta tắt nó đi.
 *
 * Khối đắt nhất là ⑤ — nó canh đúng cái bẫy đã ghi trong `S-10`.
 */
import assert from "node:assert/strict";
import { createNguonHnx, LOAI_SAN_PHAM, ngayTheoTrang } from "../nguon-hnx.mjs";
import { LoiNguon } from "../vong-lay.mjs";

const nguon = createNguonHnx();

/* Hình dạng thật, rút gọn. Con số `<td>` giữ đúng tinh thần đã đo: có hàng thì có ô, nghỉ thì
 * không ô nào. */
const NGAY_CO_HANG = JSON.stringify({
  SumTable: null,
  Content: "<style>.MAHOPDONG{}</style><table><tr><th>Mã</th></tr><tr><td>VN30F2609</td><td>1234</td></tr></table>",
  DataDropSearch: "<option value=\"VN30F2609\">VN30F2609</option>"
});
const NGAY_NGHI = JSON.stringify({
  SumTable: null,
  Content: "<style>.MAHOPDONG{}</style><table><tr><th>Mã</th></tr><tr></tr></table>",
  DataDropSearch: ""
});
/* Cái bẫy: 200 OK, nhưng là một TRANG, không phải dữ liệu. */
const TRANG_KHAC = "<!DOCTYPE html><html><head><title>HNX</title></head><body>...</body></html>";

const ok = (body, status = 200) => ({ action: "fetch", status, ok: status === 200, body });

/* ---- ① BẢY THAM SỐ, đúng bảy, đúng tên ---------------------------------- */
{
  const yc = nguon.yeuCau("2026-09-04");
  const p = new URLSearchParams(yc.body);
  assert.deepEqual([...p.keys()].sort(),
    ["p_currentpage", "p_date", "p_keysearch", "p_orderby", "p_ordertype", "p_record_on_page", "p_type_sanpham"],
    "bay tham so, doc thang tu ma trang — them hay bot deu la doan");
  assert.equal(p.get("p_date"), "04/09/2026", "trang doi dd/MM/yyyy");
  assert.equal(p.get("p_keysearch"), "-1|0|");
  assert.equal(p.get("p_orderby"), "MAHOPDONG");
  assert.equal(p.get("p_ordertype"), "ASC");
  assert.equal(p.get("p_type_sanpham"), LOAI_SAN_PHAM.CHI_SO_CO_PHIEU);
  assert.equal(yc.method, "POST");
  assert.match(yc.url, /^https:\/\//, "phai la https");

  /* KHÔNG gửi cookie. Dữ liệu công khai; kèm phiên đăng nhập của Đức sang một trang ngoài là
   * thứ không bao giờ nên là mặc định. */
  assert.equal(yc.with_credentials, false, "khong duoc gui kem phien dang nhap");
  assert.ok(!Object.keys(yc.headers).some((h) => /cookie|authorization/i.test(h)));
}

/* ---- ② NGÀY CÓ HÀNG → ghi NGUYÊN VĂN phong bì --------------------------- */
{
  const ra = nguon.kiemTra(ok(NGAY_CO_HANG));
  assert.equal(ra.trong, undefined);
  assert.equal(ra.noiDung, NGAY_CO_HANG, "phai ghi NGUYEN VAN, khong boc lay phan minh thich");
}

/* ---- ③ NGÀY NGHỈ → trống, KHÔNG phải hỏng ------------------------------
 * Đo được: ngày nghỉ vẫn trả 200 OK và JSON hợp lệ, chỉ khác ở chỗ không có ô dữ liệu nào
 * (192 với 0 — không có vùng xám). Coi nó là hỏng thì vòng lặp thử lại một ngày không bao giờ
 * có gì; ghi ra file thì bịa một ngày giao dịch không tồn tại. */
{
  const ra = nguon.kiemTra(ok(NGAY_NGHI));
  assert.equal(ra.trong, true);
  assert.equal(ra.noiDung, undefined, "ngay nghi khong duoc sinh ra noi dung de ghi");
}

/* ---- ④ 5xx ĐÁNG thử lại · 4xx thì KHÔNG --------------------------------- */
{
  for (const ma of [500, 502, 503]) {
    assert.throws(() => nguon.kiemTra(ok("", ma)),
      (e) => e instanceof LoiNguon && e.ma === "MAY_CHU_HONG" && e.thuLai === true, `${ma} phai dang thu lai`);
  }
  for (const ma of [400, 403, 404]) {
    assert.throws(() => nguon.kiemTra(ok("", ma)),
      (e) => e instanceof LoiNguon && e.thuLai === false, `${ma} la ta goi sai, thu lai vo ich`);
  }
}

/* ---- ⑤ CÁI BẪY: 200 OK nhưng là một TRANG ------------------------------
 * `S-10` ghi: *"đoán sai tên tham số thì endpoint trả 200 OK kèm cả một trang HTML 43KB, trông
 * y hệt thành công. Ở trang này, sai tham số không ra lỗi — nó ra một trang khác."*
 *
 * Hai chốt, và chốt thứ hai mới là chốt đắt tiền: lỗi này **KHÔNG được đáng thử lại**. Yêu cầu
 * sai thì sai với MỌI ngày, nên thử lại chỉ để đốt ngân sách ghi lấy năm câu trả lời sai giống
 * hệt nhau. */
{
  assert.throws(() => nguon.kiemTra(ok(TRANG_KHAC)),
    (e) => e instanceof LoiNguon && e.ma === "HINH_DANG_SAI" && e.thuLai === false,
    "mot trang HTML phai bi bat, va KHONG duoc thu lai");

  /* Và một JSON hợp lệ nhưng của ai đó khác thì vẫn parse được — nên phải soi tới khoá. */
  assert.throws(() => nguon.kiemTra(ok('{"loi":"khong co quyen"}')),
    (e) => e.ma === "HINH_DANG_SAI" && e.thuLai === false, "JSON la khong co 'Content' phai bi bat");
  assert.throws(() => nguon.kiemTra(ok("null")), (e) => e.ma === "HINH_DANG_SAI");
  assert.throws(() => nguon.kiemTra(ok("[]")), (e) => e.ma === "HINH_DANG_SAI");
}

/* ---- ⑥ TÊN FILE SẮP ĐÚNG THỨ TỰ THỜI GIAN ------------------------------
 * Dùng `yyyy-mm-dd` chứ không phải dạng của trang: thư mục tự xếp đúng thứ tự, và một cái lỗ
 * giữa tuần nhìn ra ngay. Với `dd/MM/yyyy` thì 01/09 nằm cạnh 01/10. */
{
  const ds = ["2026-09-10", "2026-09-02", "2026-10-01"].map(nguon.tenFile);
  assert.deepEqual([...ds].sort(), ["2026-09-02", "2026-09-10", "2026-10-01"].map(nguon.tenFile),
    "ten file phai sap dung thu tu thoi gian khi sap chuoi");
  assert.match(nguon.tenFile("2026-09-02"), /^2026-09-02-HDTLCSCP\.json$/);

  /* Hai loại sản phẩm KHÔNG được đè lên nhau. */
  const khac = createNguonHnx({ loaiSanPham: LOAI_SAN_PHAM.TRAI_PHIEU_CHINH_PHU });
  assert.notEqual(khac.tenFile("2026-09-02"), nguon.tenFile("2026-09-02"));
  assert.equal(new URLSearchParams(khac.yeuCau("2026-09-02").body).get("p_type_sanpham"), "HDTLTPCP");
}

/* ---- ⑦ NGÀY SAI DẠNG → ĐỎ NGAY, đừng gửi đi ---------------------------- */
{
  for (const xau of ["04/09/2026", "2026-9-4", "hom qua", "", null, "2026-09-4"]) {
    assert.throws(() => ngayTheoTrang(xau), (e) => e.ma === "NGAY_SAI_DANG", `'${xau}' phai bi chan`);
  }
  assert.equal(ngayTheoTrang("2026-01-31"), "31/01/2026");
}

console.log("nguon-hnx smoke tests: PASS (7 khoi)");
