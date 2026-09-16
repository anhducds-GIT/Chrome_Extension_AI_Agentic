/* Phép ghim cho phần PHÁN của `do-hinh-hoc.mjs` (`T10` / `S-21`). Chạy không cần trình duyệt.
 *
 * Phần đụng Chrome không ghim được ở đây — nó cần một trình duyệt thật, và đó là việc của chính
 * `npm run scouter:hinh-hoc`. Cái ghim được, và là cái dễ viết sai nhất, là **phép đếm "đã tái
 * hiện chưa"**: nới nó ra một chút là phép đo bắt đầu gật đầu với mọi thứ hỏng, và một dụng cụ
 * đo gật bừa thì tệ hơn không có dụng cụ nào.
 *
 * Số trong các khối dưới đây lấy từ lượt chạy thật 16/09, Chrome 153 — không phải số tôi thấy
 * hợp lý (`fake-encodes-my-belief`).
 */
import assert from "node:assert/strict";
import { ketLuan } from "../scripts/do-hinh-hoc.mjs";

const lanh = { hinhHoc: 6, hinhHocLoi: null, anh: 9384, anhLoi: null, hop: 220, hopLoi: null };
const nen = { ma: "N", ten: "nền", ...lanh };

/* ---- ① Nền lành, không phá gì → KHÔNG tái hiện ------------------------- */
{
  const k = ketLuan({ dong: [nen, { ma: "E4", ten: "hai phiên", ...lanh }] });
  assert.equal(k.taiHien.length, 0);
  assert.deepEqual(k.loi, []);
}

/* ---- ② HÌNH DẠNG `S-21` = hỏi-điểm VÀ ảnh chụp CÙNG hỏng ---------------
 * Đây là khối đắt nhất của tệp. Số đo 16/09 cho thấy có **hai** kiểu hỏng khác hẳn nhau, và
 * gộp chúng lại là đúng cái `S-21` dặn đừng làm (*"Đừng đóng bằng cách đoán"*):
 *
 *   · renderer bị GIẾT  → hỏi-điểm và ảnh chụp cùng chết  ← đây mới là `S-21`
 *   · nodeId CŨ sau điều hướng → chỉ `DOM.getBoxModel` chết, ảnh chụp vẫn ra 7.480 byte
 *
 * Cách chữa của hai cái khác nhau: cái đầu phải điều hướng lại, cái sau chỉ cần hỏi lại
 * selector. Một phép đếm không phân biệt được hai cái ấy sẽ đẩy người sửa đi sai đường. */
{
  const giet = { ma: "E1", ten: "renderer bị giết",
    hinhHocLoi: "HET_HAN: 'DOM.getNodeForLocation' khong tra loi trong 8000ms.",
    anhLoi: "Internal error", hopLoi: "HET_HAN: 'DOM.getBoxModel' khong tra loi trong 8000ms." };
  assert.equal(ketLuan({ dong: [nen, giet] }).taiHien.length, 1, "renderer chết PHẢI tính là tái hiện");

  /* nodeId cũ sau điều hướng: ảnh chụp VẪN RA ẢNH → KHÔNG phải `S-21`. */
  const cu = { ma: "E2", ten: "nodeId cũ", hinhHoc: 10, hinhHocLoi: null,
    anh: 7480, anhLoi: null, hop: null, hopLoi: "Could not find node with given id" };
  assert.equal(ketLuan({ dong: [nen, cu] }).taiHien.length, 0,
    "chỉ hộp hỏng mà ảnh vẫn ra thì là nodeId cũ, KHÔNG phải S-21 — gộp hai cái là đẩy người sửa đi sai đường");

  /* Và từng vế một mình cũng chưa đủ — ghim cả hai chiều. */
  for (const mot of [
    { ma: "X", ten: "chỉ hỏi-điểm hỏng", hinhHocLoi: "loi", anh: 9384, anhLoi: null, hopLoi: null },
    { ma: "Y", ten: "chỉ ảnh hỏng", hinhHoc: 6, hinhHocLoi: null, anhLoi: "loi", hopLoi: null }
  ]) {
    assert.equal(ketLuan({ dong: [nen, mot] }).taiHien.length, 0,
      `${mot.ten}: một mình chưa phải hình dạng S-21`);
  }
}

/* ---- ③ NỀN đã hỏng sẵn → cả phép đo vô giá trị, phải NÓI RA ------------
 * Không có khối này thì một lượt chạy trên máy hỏng sẽ báo *"tái hiện được!"* cho mọi dòng, và
 * đó là một kết luận sai mang thẩm quyền của một phép đo. */
{
  const k = ketLuan({ dong: [{ ma: "N", ten: "nền", hinhHocLoi: "loi", anhLoi: "loi", hopLoi: "loi" },
    { ma: "E1", ten: "x", hinhHocLoi: "loi", anhLoi: "loi", hopLoi: "loi" }] });
  assert.equal(k.dat, false);
  assert.match(k.loi.join(" "), /NỀN đã hỏng sẵn/);
}

/* ---- ④ Thiếu hẳn dòng nền → cũng phải đỏ, không im lặng ---------------- */
{
  const k = ketLuan({ dong: [{ ma: "E1", ten: "x", hinhHocLoi: "loi", anhLoi: "loi" }] });
  assert.equal(k.dat, false);
  assert.equal(k.taiHien.length, 0, "không có nền thì không được kết luận gì");
}

/* ---- ⑤ Dòng nền KHÔNG được tự tính là tái hiện ------------------------- */
{
  const k = ketLuan({ dong: [{ ma: "N", ten: "nền", hinhHocLoi: "loi", anhLoi: "loi" }] });
  assert.equal(k.taiHien.length, 0, "dòng nền bị loại khỏi phép đếm, dù chính nó hỏng");
}

console.log("  · hinh-hoc (T10): 5 khối xanh");
