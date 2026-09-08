/* Phép ghim cho `nguon-thong-ke.mjs` — hợp đồng với trang thống kê phái sinh hnx.vn.
 *
 * Không chạm mạng. Mọi mẫu ở đây là HÌNH DẠNG THẬT đo được ngày 2026-09-08 từ chính trang đó,
 * rút gọn lại. Cái đáng ghim không phải "hàm có chạy không" mà là: **một trang đổi hình dạng
 * thì ta biết, thay vì lặng lẽ kết luận là đã đủ dữ liệu.**
 */
import assert from "node:assert/strict";
import { KIEU, LoiThongKe, docDanhMuc, laPdfDayDu, yeuCau } from "../nguon-thong-ke.mjs";

/* ---- ① Tham số gọi: đúng hai kiểu, và khoá phải đúng dạng --------------- */
{
  const r = yeuCau(KIEU.NGAY, "08/2026");
  assert.equal(r.method, "POST");
  assert.match(r.url, /ThongKeV2\/GetDataByTypeIndex$/);
  assert.equal(r.with_credentials, false, "dữ liệu công khai thì KHÔNG gửi cookie đi");
  const th = new URLSearchParams(r.body);
  assert.equal(th.get("p_key_search"), "08/2026");
  assert.equal(th.get("p_report_type"), "D");

  const t = new URLSearchParams(yeuCau(KIEU.THANG, "2026").body);
  assert.equal(t.get("p_report_type"), "M");
  assert.equal(t.get("p_key_search"), "2026");

  /* Khoá sai dạng phải ĐỎ NGAY, không được để trang trả 200 kèm bảng rỗng rồi ta đọc thành
   * "ngày đó không có dữ liệu". Đây đúng cái bẫy đã ghi trong `nguon-hnx.mjs`: đoán sai tham
   * số thì hnx.vn trả 200 OK kèm một trang không phải thứ mình xin. */
  for (const [k, khoa] of [[KIEU.NGAY, "2026-08"], [KIEU.NGAY, "8/2026"], [KIEU.NGAY, "13/2026"],
    [KIEU.THANG, "08/2026"], [KIEU.THANG, "26"]]) {
    assert.throws(() => yeuCau(k, khoa), (e) => e instanceof LoiThongKe && e.ma === "KHOA_SAI",
      `khoá sai dạng vẫn lọt: ${k} ${khoa}`);
  }
  assert.throws(() => yeuCau("Y", ""), (e) => e.ma === "KIEU_SAI",
    'kiểu Y trả "không tìm thấy dữ liệu" nên phải bị chặn ở đây, đừng để gọi ra mạng');
}

/* ---- ② Đọc danh mục ---------------------------------------------------- */
{
  const html = [
    '<tr><td class="STT">1</td><td>28/08/2026</td>',
    '<td><a download="true" href="https://owa.hnx.vn/ftp///THONGKEGIAODICH//20260828/PS/20260828_PS_Quy_mo_giao_dich.pdf"><img src="/x.png" /></a></td>',
    '<td><a download="true" href="https://owa.hnx.vn/ftp///THONGKEGIAODICH//20260828/PS/20260828_PS_Quy_mo_cung_cau.pdf"></a></td></tr>',
    '<tr><td class="STT">2</td><td>27/08/2026</td>',
    '<td><a href="https://owa.hnx.vn/ftp///THONGKEGIAODICH//20260827/PS/20260827_PS_Quy_mo_ndtnn.pdf"></a></td></tr>'
  ].join("");
  const dm = docDanhMuc(html);
  assert.equal(dm.trong, false);
  assert.equal(dm.muc.length, 3);
  assert.deepEqual(dm.muc.map((m) => m.ten), [
    "20260828_PS_Quy_mo_giao_dich.pdf",
    "20260828_PS_Quy_mo_cung_cau.pdf",
    "20260827_PS_Quy_mo_ndtnn.pdf"
  ], "tên tệp phải giữ NGUYÊN tên của HNX — Đức đã đặt tên thư mục theo đúng tên đó từ 07/2026");
  assert.equal(dm.muc[0].ky, "20260828");
  assert.equal(dm.muc[0].loai, "Quy_mo_giao_dich");

  /* Cùng một liên kết xuất hiện hai lần thì chỉ tính một — nếu không, số "còn thiếu" phồng
   * lên và ta tải lại thứ vừa tải. */
  assert.equal(docDanhMuc(html + html).muc.length, 3, "liên kết lặp phải được gộp");

  /* Báo cáo THÁNG dùng khoá 6 chữ số. Thiếu vế này thì một biểu thức chỉ nhận 8 chữ số sẽ
   * lặng lẽ bỏ qua toàn bộ báo cáo tháng — mà Đức đang giữ 28 tệp loại đó. */
  const thang = docDanhMuc('<a href="https://owa.hnx.vn/ftp///x//202608/PS/202608_PS_Quy_mo_ndtnn.pdf"></a>');
  assert.equal(thang.muc.length, 1);
  assert.equal(thang.muc[0].ky, "202608");
}

/* ---- ③ Trang nói "không có" KHÁC trang đổi hình dạng -------------------- */
{
  const trong = docDanhMuc('<div>Kh&#244;ng t&#236;m thấy dữ liệu</div>');
  assert.equal(trong.trong, true);
  assert.deepEqual(trong.muc, []);

  /* Không liên kết nào MÀ cũng không có câu "không tìm thấy" = trang đã đổi. Phải ĐỎ.
   * Trả mảng rỗng ở đây là dạy cho lượt gọi hiểu thành "đã đủ rồi, không cần tải gì". */
  assert.throws(() => docDanhMuc('<table><tr><td>một trang lạ</td></tr></table>'),
    (e) => e instanceof LoiThongKe && e.ma === "HINH_DANG_SAI",
    "trang đổi hình dạng mà im lặng thì ta sẽ tưởng là đã đủ dữ liệu");

  /* Liên kết tới máy chủ KHÁC không được tính, kể cả khi tên tệp đúng dạng. */
  assert.throws(() => docDanhMuc('<a href="https://ke-la.example/20260828_PS_Quy_mo_giao_dich.pdf"></a>'),
    (e) => e.ma === "HINH_DANG_SAI", "chỉ nhận tệp từ máy chủ tệp của HNX");
}

/* ---- ④ PDF đầy đủ hay cụt ---------------------------------------------- */
{
  const than = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(2000, 0x41), Buffer.from("\n%%EOF\n")]);
  assert.equal(laPdfDayDu(than), true);

  assert.equal(laPdfDayDu(than.subarray(0, 1500)), false, "PDF mất phần đuôi phải bị từ chối");
  assert.equal(laPdfDayDu(Buffer.concat([Buffer.from("<html>"), Buffer.alloc(2000, 0x41)])), false,
    "một trang lỗi HTML không được nhận là PDF");
  assert.equal(laPdfDayDu(Buffer.alloc(200)), false, "tệp quá nhỏ thì không thể là báo cáo");
  assert.equal(laPdfDayDu(null), false);

  /* Vì sao phải kiểm cả đuôi chứ không chỉ đầu: `file trên đĩa CHÍNH LÀ trạng thái`, nên một
   * PDF cụt mang tên thật sẽ làm MỌI lượt sau bỏ qua ngày đó — mất dữ liệu vĩnh viễn mà
   * không có gì đỏ lên. */
}

console.log("nguon-thong-ke smoke tests: PASS");
