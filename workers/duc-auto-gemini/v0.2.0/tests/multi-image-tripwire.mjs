// Test ghim cho CÁI BẪY đếm ảnh theo từng lượt.
//
// Đây KHÔNG phải phép ghim của một tính năng. Đức chốt 06/09: Gemini chưa bao
// giờ trả hai ảnh trong một câu trả lời, và chưa bao giờ hỏi lại "thích ảnh nào
// hơn" — *"case này tôi chưa gặp, bao giờ gặp ta sẽ capture và vá."*
//
// Câu đó chỉ đúng nếu có thứ gì đó BÁO ĐƯỢC là đã gặp. Trước 06/09 thì không:
//
//   · Gemini trả HAI ảnh trong MỘT lượt      -> AMBIGUOUS_POST_TURN_IMAGE
//   · HAI LƯỢT riêng, mỗi lượt MỘT ảnh       -> AMBIGUOUS_POST_TURN_IMAGE
//
// Cùng một mã lỗi, và sổ cái ghi `fresh.eligible: 2` ở cả hai ca. Hai nguyên
// nhân khác hẳn nhau mà nhìn giống hệt nhau — nên ca đầu có xảy ra cũng không ai
// nhận ra. Một dãy số tách được chúng: `[2]` là ca đang chờ bắt, `[1, 1]` là
// chuyện khác.
//
// File này ghim ĐÚNG HAI điều, và điều thứ hai mới là chỗ dễ mất:
//   ① hàm đếm đúng số ảnh của từng lượt;
//   ② con số đó ĐI TỚI ĐƯỢC sổ cái. Bản đầu của tôi đếm đúng mà **không** nối
//      vào dòng ghi nhận — dòng đó liệt kê từng trường một, và trường mới không
//      có tên trong đó. Đếm đúng mà không ai đọc được thì cái bẫy là đồ trang trí.

import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("../", import.meta.url);
const source = fs.readFileSync(new URL("content.js", root), "utf8");

/* ---- ① Hàm đếm: trích thân hàm thật rồi chạy ----------------------------- */

const than = /function imageDecision\(boundary, inputEvidence\) \{[\s\S]*?\n  \}/.exec(source);
assert.ok(than, "trích được imageDecision ra khỏi content.js — neo hỏng thì phép kiểm này vô nghĩa, nên nó phải nổ");

/** Dựng hàm thật với mọi phụ thuộc được tiêm vào. */
function dung({ luotMoi, anhTheoLuot }) {
  const goi = { soLanGoiOutput: 0 };
  const deps = {
    newAssistantMessages: () => luotMoi,
    outputCandidates: (scope) => {
      goi.soLanGoiOutput += 1;
      // `scope` là một khối lượt trả lời, hoặc `document` khi quét cả trang.
      const index = luotMoi.indexOf(scope);
      return index >= 0 ? anhTheoLuot[index] : anhTheoLuot.flat();
    },
    assistantMessages: () => luotMoi,
    assistantFingerprint: (message) => `fp-${luotMoi.indexOf(message)}`,
    document: {},
    window: { DacImageEvidence: { selectAttributableImage: (input) => ({ ok: false, reason: "GIA", diagnostics: { nhan: input.postTurn.length } }) } },
  };
  const ten = Object.keys(deps);
  const fn = new Function(...ten, `${than[0]}\nreturn imageDecision;`)(...ten.map((k) => deps[k]));
  return { fn, goi };
}

const anh = (n) => Array.from({ length: n }, (_, i) => ({ source: `img-${i}` }));

/* CA ĐANG CHỜ BẮT: một lượt, hai ảnh. */
{
  const luot = [{}];
  const { fn } = dung({ luotMoi: luot, anhTheoLuot: [anh(2)] });
  const ket = fn({ images: [] }, {});
  assert.deepEqual(ket.new_assistant_image_counts, [2], "MỘT lượt trả HAI ảnh phải đọc ra [2] — đây chính là ca Đức đang chờ bắt");
  assert.equal(ket.decision.diagnostics.nhan, 2, "hai ảnh đó vẫn được gộp lại đưa cho lớp quy kết, y như trước");
}

/* CA KHÁC HẲN, mà mã lỗi lại giống hệt: hai lượt, mỗi lượt một ảnh. */
{
  const luot = [{}, {}];
  const { fn } = dung({ luotMoi: luot, anhTheoLuot: [anh(1), anh(1)] });
  const ket = fn({ images: [] }, {});
  assert.deepEqual(ket.new_assistant_image_counts, [1, 1], "HAI lượt mỗi lượt MỘT ảnh phải đọc ra [1, 1] — khác hẳn [2], dù cùng một mã lỗi");
}

/* Đường thường ngày, và ca không có lượt mới nào. */
{
  const { fn } = dung({ luotMoi: [{}], anhTheoLuot: [anh(1)] });
  assert.deepEqual(fn({ images: [] }, {}).new_assistant_image_counts, [1], "một lượt một ảnh — đường bình thường");
  const rong = dung({ luotMoi: [], anhTheoLuot: [] });
  assert.deepEqual(rong.fn({ images: [] }, {}).new_assistant_image_counts, [], "không lượt mới nào thì trả mảng rỗng, không phải undefined");
}

/* Không được gọi lại bộ dò ảnh cho mỗi lượt hai lần: đếm và gộp phải dùng
   CHUNG một lượt quét. Bản đầu gọi `outputCandidates` hai lần cho mỗi lượt —
   vô hại về kết quả nhưng là quét DOM thừa trên một vòng lặp chạy mỗi nhịp. */
{
  const { fn, goi } = dung({ luotMoi: [{}, {}], anhTheoLuot: [anh(1), anh(1)] });
  fn({ images: [] }, {});
  assert.equal(goi.soLanGoiOutput, 3, "hai lượt + một lượt quét cả trang = ĐÚNG ba lần quét, không phải năm");
}

/* ---- ② Con số phải ĐI TỚI sổ cái ---------------------------------------- */
//
// Chỗ này chỉ ghim được ở mức nguồn: dòng dựng `lastDetection` nằm sâu trong
// vòng lặp chờ, không trích ra chạy riêng được. Nhưng nó là chỗ ĐÃ MẤT một lần
// trong chính lượt viết bản vá này, nên nó phải có người canh.
// CÓ HAI chỗ gán `lastDetection`, và chúng khác nhau: một chỗ khởi tạo với
// `decision_reason: "NOT_EVALUATED"` trước vòng lặp, một chỗ ghi thật sau mỗi
// lần đánh giá. Neo đầu tiên của tôi tóm nhầm chỗ khởi tạo và báo đỏ oan. Ghim
// cả SỐ LƯỢNG để chỗ thứ ba mọc ra thì có người biết, thay vì lặng lẽ trượt.
const moiChoGhi = [...source.matchAll(/lastDetection = \{[^\n]*\n/g)].map((m) => m[0]);
assert.equal(moiChoGhi.length, 2, "đúng hai chỗ gán lastDetection: một khởi tạo, một ghi thật");
const dongGhiThat = moiChoGhi.filter((dong) => dong.includes("evaluated."));
assert.equal(dongGhiThat.length, 1, "đúng một chỗ ghi từ kết quả đánh giá");
assert.match(
  dongGhiThat[0],
  /new_assistant_image_counts: evaluated\.new_assistant_image_counts/,
  "dãy số phải có tên trong dòng ghi nhận — dòng đó liệt kê TỪNG TRƯỜNG một, nên một trường mới không tự động đi theo. Đếm đúng mà không ai đọc được thì cái bẫy là đồ trang trí"
);

/* Và nó phải sống sót qua recordDetection: hàm đó thay TOÀN BỘ khối chẩn đoán,
   chỉ giữ lại các khoá trong CARRIED_DIAGNOSTICS. Dãy số này được ghi mới ở mỗi
   nhịp chứ không phải mang theo, nên nó KHÔNG được nằm trong danh sách đó —
   nằm vào là mỗi nhịp lại chép đè bằng giá trị của nhịp đầu tiên. */
const mang = /const CARRIED_DIAGNOSTICS = [\s\S]*?;/.exec(source);
if (mang) {
  assert.doesNotMatch(
    mang[0], /new_assistant_image_counts/,
    "dãy số này được tính lại mỗi nhịp, KHÔNG được mang theo từ nhịp đầu — mang theo là đóng băng số đo ở lần poll đầu tiên"
  );
}

console.log("multi image tripwire: PASS");
