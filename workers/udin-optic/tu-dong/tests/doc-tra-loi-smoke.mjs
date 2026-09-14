/* Phép ghim cho W4 — đọc câu trả lời chữ của agent. Chạy không cần trình duyệt.
 *
 * Hình dạng máy giả dưới đây KHÔNG phải tôi nghĩ ra: nó chép từ lượt gọi THẬT ngày 14/09 trên
 * `vinfast.udinbv.com/optic`. `scout.text` trả về đúng bảy trường
 * `selector,matchCount,text,chars,truncated,maxChars,redaction` — và số khớp của ba ứng viên
 * (1 · 20 · 20) cũng là số đo thật. Bài học `fake-encodes-my-belief` 14/09: một máy giả chép
 * đúng cái hiểu SAI của mình thì xanh hết rồi ngã ở lượt gọi thật đầu tiên.
 *
 * Quá nửa số khối ở đây ghim ĐƯỜNG HỎNG. Đường đúng của chặng này chỉ có một dáng; chỗ đắt là
 * năm cách nó có thể trả lời sai mà trông như đúng.
 */
import assert from "node:assert/strict";
import { docTraLoi, UNG_VIEN } from "../doc-tra-loi.mjs";

const TRA_LOI = "Here are some options for the bronze desk lamp on a walnut table!";
const TRAN = 5000;

/** @param khop bản đồ selector → số khớp; thiếu thì 0. @param chu bản đồ selector → chữ. */
function lam({ khop = {}, chu = {}, chars = null, truncated = false } = {}) {
  const daHoi = [];
  const daDoc = [];
  const goi = async (method, p) => {
    if (method === "scout.query") {
      daHoi.push(p.selector);
      return { data: { selector: p.selector, matchCount: khop[p.selector] ?? 0 } };
    }
    if (method === "scout.text") {
      daDoc.push(p.selector);
      const t = chu[p.selector] ?? TRA_LOI;
      return { data: { selector: p.selector, matchCount: 1, text: t, chars: chars ?? t.length, truncated, maxChars: TRAN, redaction: { policy: "de-xuat-chat-v1" } } };
    }
    throw new Error(`máy giả không biết method '${method}' — chặng này chỉ được dùng hai lệnh ĐỌC`);
  };
  return { goi, tab: "TAB1", daHoi, daDoc };
}

/* ⓐ đường đúng: ứng viên hẹp nhất khớp 1 → trả về đúng chữ và đúng selector đã dùng */
{
  const t = lam({ khop: { [UNG_VIEN[0]]: 1 } });
  const k = await docTraLoi(t);
  assert.equal(k.selector, UNG_VIEN[0]);
  assert.equal(k.chu, TRA_LOI);
  assert.equal(k.kyTu, TRA_LOI.length);
  /* hỏi đúng MỘT lượt rồi dừng — không quét nốt bảng cho vui */
  assert.deepEqual(t.daHoi, [UNG_VIEN[0]]);
  assert.deepEqual(t.daDoc, [UNG_VIEN[0]]);
}

/* ⓑ ứng viên đầu khớp 0 thì RƠI XUỐNG cái sau, và chỉ đọc chữ của cái thật sự khớp */
{
  const t = lam({ khop: { [UNG_VIEN[1]]: 1 } });
  const k = await docTraLoi(t);
  assert.equal(k.selector, UNG_VIEN[1]);
  assert.deepEqual(t.daHoi, [UNG_VIEN[0], UNG_VIEN[1]]);
  assert.deepEqual(t.daDoc, [UNG_VIEN[1]]);
}

/* ⓒ KHỚP NHIỀU KHÔNG PHẢI KHỚP. Số 20 là số đo thật của `.markdown-content:last-of-type`.
 * Đây là khối phân biệt bản đúng với bản `matchCount >= 1` — bản kia xanh ở ⓐ và ⓑ. */
{
  const t = lam({ khop: { [UNG_VIEN[0]]: 20, [UNG_VIEN[1]]: 20, [UNG_VIEN[2]]: 20 } });
  /* ⓒ và ⓓ rơi vào CÙNG một lượt ném, nên phải phân biệt bằng SỐ KHỚP trong lời báo — chứ
   * không bằng một câu chữ có mặt ở cả hai. Lời báo mà nuốt mất số đếm thì hai ca hỏng khác
   * hẳn nhau sẽ đọc y như nhau, và người sửa đi tìm sai chỗ. */
  await assert.rejects(docTraLoi(t), /→ 20/);
  /* và tuyệt đối KHÔNG được đi đọc chữ của một selector khớp 20 */
  assert.deepEqual(t.daDoc, []);
  /* đã hỏi lại trang ĐỦ CẢ BA trước khi bỏ cuộc — không bỏ cuộc sau cái đầu */
  assert.equal(t.daHoi.length, UNG_VIEN.length);
}

/* ⓓ cả ba khớp 0 = agent CHƯA đáp. Lời báo phải nói ra điều đó, vì nó không phải lỗi. */
{
  const t = lam();
  await assert.rejects(docTraLoi(t), /→ 0 · .*→ 0 · .*→ 0/);
  await assert.rejects(docTraLoi(t), /CHƯA đáp/);
  assert.equal(t.daHoi.length, UNG_VIEN.length * 2);
}

/* ⓔ khớp đúng một mà chữ rỗng → ĐỎ, không trả chuỗi rỗng ra ngoài như thể agent im lặng */
{
  const t = lam({ khop: { [UNG_VIEN[0]]: 1 }, chu: { [UNG_VIEN[0]]: "   \n  " } });
  await assert.rejects(docTraLoi(t), /KHÔNG có chữ/);
}

/* ⓕ chữ bị cắt ở trần `scout.text` → ĐỎ, và lời báo phải chỉ đúng trần của SEED chứ không đổ
 * cho trang. Bản bỏ qua `truncated` xanh ở mọi khối khác — chỉ khối này giết nó. */
{
  const t = lam({ khop: { [UNG_VIEN[0]]: 1 }, chars: 5000, truncated: true });
  await assert.rejects(docTraLoi(t), /CẮT ở trần 5000 .*SEED/s);
}

/* ⓖ `khacVoi` trùng = đọc lại câu của lượt TRƯỚC → ĐỎ. Ca hỏng đắt nhất của chặng này. */
{
  const t = lam({ khop: { [UNG_VIEN[0]]: 1 } });
  await assert.rejects(docTraLoi({ ...t, khacVoi: TRA_LOI }), /Y HỆT|chưa đáp lượt này/);
}

/* ⓗ so `khacVoi` phải BỎ KHOẢNG TRẮNG hai đầu — trang trả cùng một câu kèm thụt đầu dòng khác
 * nhau là chuyện thường, và một dấu cách thừa sẽ biến "chưa đổi" thành "đã đổi". */
{
  const t = lam({ khop: { [UNG_VIEN[0]]: 1 }, chu: { [UNG_VIEN[0]]: `\n  ${TRA_LOI}  \n` } });
  await assert.rejects(docTraLoi({ ...t, khacVoi: `${TRA_LOI}\n` }), /Y HỆT/);
  /* và chữ trả ra ngoài cũng đã sạch hai đầu */
  assert.equal((await docTraLoi(t)).chu, TRA_LOI);
}

/* ⓘ `khacVoi` khác thật → đi qua, và trả câu MỚI */
{
  const t = lam({ khop: { [UNG_VIEN[0]]: 1 } });
  assert.equal((await docTraLoi({ ...t, khacVoi: "câu của lượt trước" })).chu, TRA_LOI);
}

/* ⓙ đưa sẵn `tab` thì KHÔNG đi tìm tab — một lượt `scout.targets` thừa là một lượt đo nhầm tab
 * sau mỗi lần điều hướng (`N2`). */
{
  const t = lam({ khop: { [UNG_VIEN[0]]: 1 } });
  let daTim = 0;
  await docTraLoi({ ...t, timTab: async () => { daTim += 1; return "TAB-KHAC"; } });
  assert.equal(daTim, 0);
}

/* ⓚ chặng này chỉ được dùng lệnh ĐỌC — máy giả ném nếu thấy lệnh khác, nên khối ⓐ đã chứng
 * minh điều đó. Ghim thêm ở đây cho lượt sau khỏi lặng lẽ thêm một lệnh ghi vào W4. */
assert.equal(UNG_VIEN.length, 3);
assert.ok(UNG_VIEN.every((s) => s.startsWith(".agent-message-item:last-child")));

console.log("  · udin doc-tra-loi: 11 khối xanh");
