/* CỬA ① — nhấp đúp: sinh MỘT lượt rồi thoát. Không tiến trình nào ở lại.
 *
 * Cửa này không có máy chủ, nên trang mở bằng `file://` và không có nút "Làm mới ngay" — muốn
 * mới thì nhấp đúp lại. Đó là cái giá của cửa rẻ nhất, và nó được nói thẳng trên băng.
 *
 * Chạy đúng cái lõi, chịu đủ bốn chốt. Không có đường tắt nào.
 */
import { gioVN, sinhLai } from "./loi.mjs";

const tt = sinhLai({ nhip: new Date().toISOString() });
if (tt.ngung) {
  console.log(`Ngung sinh: ${tt.ly_do}`);
  console.log("Bang mo ra la ban CU. Bang tu noi dieu do o dai duoi cung.");
} else {
  console.log(`Da sinh bang song luc ${gioVN(tt.sinh_luc)}.`);
}
process.exit(0);
