/* Phép ghim cho `do-chi-phi.mjs` — cái cân đo chi phí context.
 *
 * Một cái cân sai thì tệ hơn không có cân, vì mọi quyết định tối ưu sau đó đứng trên nó và
 * không ai kiểm lại. Nên bộ này ghim đúng bốn chỗ cái cân có thể nói dối:
 *   ⑴ đếm node theo hình dạng SAI của phép dò
 *   ⑵ trộn `bytes_tho` với `chu_cho_ai`
 *   ⑶ lượt gọi HỎNG biến mất khỏi sổ
 *   ⑷ tự bịa một con số token
 */
import assert from "node:assert/strict";
import { taoCanChiPhi, tiLeHuuIch } from "../do-chi-phi.mjs";

// ⓐ ĐẾM NODE THEO ĐÚNG HÌNH DẠNG CỦA TỪNG PHÉP DÒ, và `null` khi phép dò không có khái niệm node.
//    `null` ≠ `0`: "không có node nào" và "phép dò này không đếm node" là hai câu khác nhau, và
//    gộp chúng thành 0 là cách một method rẻ trông như một method đắt đã tối ưu xong.
{
  const hinh = [
    [{ nodes: [1, 2, 3] }, 3],
    [{ targets: [1, 2] }, 2],
    [{ matches: [1] }, 1],
    [{ elements: { total: 23 } }, 23],
    [{ matchCount: 7 }, 7],
    [{ text: "chỉ là chữ" }, null],
    [null, null]
  ];
  for (const [data, mong] of hinh) {
    const c = taoCanChiPhi(async () => ({ data }));
    await c.goi("scout.gi-do", {});
    assert.equal(c.so[0].so_node, mong, `đếm sai với ${JSON.stringify(data)}`);
  }
}

// ⓑ HAI CON SỐ PHẢI ĐỘC LẬP. Rút gọn ở Node KHÔNG được làm giảm `bcb_tho` một byte nào —
//    nếu nó giảm, cái cân đang khoe hờ đúng chỗ đề bài hỏi.
{
  const to = { data: { nodes: Array.from({ length: 300 }, (_, i) => ({ role: "StaticText", name: `n${i}` })) } };
  const c = taoCanChiPhi(async () => to);
  await c.goi("scout.a11y", {});
  const truoc = c.tomTat();
  assert.ok(truoc.bcb_tho > 3000, "phong bì to phải được tính là to");
  assert.equal(truoc.bcb_model, 0, "chưa khai gì cho AI thì phải là 0, không phải bằng bytes thô");

  c.khaiChoAi('{"matched":true}');
  const sau = c.tomTat();
  assert.equal(sau.bcb_tho, truoc.bcb_tho, "khai chữ-cho-AI KHÔNG được đổi bytes thô");
  assert.equal(sau.bcb_model, 16);
  assert.ok(sau.bcb_model * 100 < sau.bcb_tho, "đây đúng là ca mà hai con số phải chênh hai bậc");
}

// ⓒ LƯỢT GỌI HỎNG VẪN PHẢI VÀO SỔ, rồi mới được ném.
//    Một lượt hỏng biến mất khỏi sổ là một phép đo tự làm đẹp: đúng những lượt đắt nhất
//    (treo rồi hết hạn) là những lượt hay hỏng nhất.
{
  const c = taoCanChiPhi(async () => { throw new Error("CDP_TIMEOUT — hết hạn"); });
  await assert.rejects(() => c.goi("scout.a11y", { target_id: "T1" }), /CDP_TIMEOUT/);
  assert.equal(c.so.length, 1, "lượt hỏng phải được ghi");
  assert.match(c.so[0].loi, /CDP_TIMEOUT/);
  assert.equal(c.so[0].target_id, "T1");
  assert.equal(c.tomTat().luot_goi, 1);
}

// ⓓ KHÔNG BỊA TOKEN. Cái cân không biết bộ tách token nào cả.
{
  const c = taoCanChiPhi(async () => ({ data: { nodes: [] } }));
  await c.goi("scout.a11y", {});
  c.khaiChoAi("x".repeat(5000));
  assert.equal(c.tomTat().token_that, null,
    "`token_that` phải là null. Nhân một hệ số rồi gọi đó là usage là thứ khó bóc ra nhất về sau");
}

// ⓔ TỈ LỆ HỮU ÍCH: nhãn thô, và nói thật khi không đo được.
{
  assert.equal(tiLeHuuIch(43, 14180).nhan, "THAP", "43 chữ hữu ích trong 14.180 chữ là THẤP");
  assert.equal(tiLeHuuIch(89, 89).nhan, "CAO");
  assert.equal(tiLeHuuIch(10, 200).nhan, "TRUNG");
  assert.equal(tiLeHuuIch(5, 0).nhan, "KHONG_DO_DUOC", "chia cho 0 phải nói ra, không trả một số");
}

console.log("do-chi-phi-smoke: 5 khối ĐẠT");
