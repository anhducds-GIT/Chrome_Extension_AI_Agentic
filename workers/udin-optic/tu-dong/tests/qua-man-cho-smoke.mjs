/* Phép ghim cho adapter vượt màn chờ của Udin — chạy không cần trình duyệt. */
import assert from "node:assert/strict";
import { quaManCho, SEL } from "../qua-man-cho.mjs";

/* `daVe` = ứng dụng đã vẽ xong chưa. Ngay sau `scout.navigate` nó là FALSE cho MỌI selector —
 * cả màn chắn lẫn ô prompt đều chưa có trong DOM. Đó là trạng thái đã cắn 14/09. */
/* `tatOLan` = màn chắn chỉ chịu tắt ở lượt bấm thứ N. Đức chốt 17/09 rằng màn chắn này là BUG
 * của Udin chứ không phải hết chỗ thật, nên adapter phải BẤM LẠI chứ không bỏ cuộc sau một cú. */
function lam({ coChan = true, nutDung = true, chanTat = true, oDung = true, daVe = true, tatOLan = null } = {}) {
  const nk = [];
  let daBam = 0;
  const goi = async (method, p) => {
    nk.push({ method, p });
    if (method === "scout.query") return { data: { matchCount: daVe && coChan ? 1 : 0 } };
    if (method === "scout.click") { daBam += 1; return { data: { hit: { relation: "self" } } }; }
    if (method === "scout.wait") {
      if (p.selector === SEL.nutThuLai) return { data: { satisfied: nutDung, usableBlockedBy: nutDung ? null : "covered" } };
      if (p.selector === SEL.manChan) {
        if (tatOLan !== null) return { data: { satisfied: daBam >= tatOLan } };
        return { data: { satisfied: chanTat } };
      }
      if (p.selector === SEL.oPrompt) {
        if (p.state === "present") return { data: { satisfied: daVe } };
        return { data: { satisfied: daVe && oDung, usableBlockedBy: oDung ? null : "covered" } };
      }
    }
    throw new Error("method lạ " + method);
  };
  return { nk, goi, timTab: async () => "TAB" };
}
const bam = (nk) => nk.filter((g) => g.method === "scout.click").length;

// ⓐ có màn chắn → bấm đúng một lần, chờ nút bằng usable, kiểm bằng kết quả trên trang
{ const t = lam(); assert.deepEqual(await quaManCho(t), { daChan: true, bam: 1 }); assert.equal(bam(t.nk), 1);
  assert.equal(t.nk.find((g) => g.p.selector === SEL.nutThuLai && g.method === "scout.wait").p.state, "usable");
  assert.equal(t.nk.find((g) => g.p.selector === SEL.manChan && g.method === "scout.wait").p.state, "absent"); }
// ⓑ không có màn chắn → không bấm gì
{ const t = lam({ coChan: false }); assert.deepEqual(await quaManCho(t), { daChan: false, bam: 0 }); assert.equal(bam(t.nk), 0); }

/* ⓕ TRANG CHƯA VẼ XONG — ca đã cắn 14/09 ngay sau `scout.navigate`. Không màn chắn, không ô
 * prompt, không gì cả. Bản cũ đọc "matchCount 0" rồi trả về *sẵn sàng*, và chặng sau ngã với
 * "thấy 0 nút Send". Phải ĐỎ ngay tại đây, nơi còn nói được đúng nguyên nhân. */
{ const t = lam({ daVe: false });
  await assert.rejects(() => quaManCho(t), /chưa vẽ xong/);
  assert.equal(bam(t.nk), 0);
  assert.ok(t.nk.some((g) => g.method === "scout.wait" && g.p.selector === SEL.oPrompt && g.p.state === "present"),
    "phải chờ ô prompt CÓ MẶT trước — đó là dấu phân biệt *chưa vẽ* với *đang bị chắn*"); }

/* ⓖ vẽ xong, không màn chắn, nhưng ô prompt vẫn bị thứ khác phủ → vẫn ĐỎ.
 * *Không có màn chắn* một mình chưa bao giờ đủ để nói *sẵn sàng*. */
{ const t = lam({ coChan: false, oDung: false });
  await assert.rejects(() => quaManCho(t), /chưa dùng được/);
  assert.equal(bam(t.nk), 0); }
// ⓒ nút chưa dùng được → không bấm
{ const t = lam({ nutDung: false }); await assert.rejects(() => quaManCho(t), /chưa bấm được/); assert.equal(bam(t.nk), 0); }
/* ⓓ bấm mãi mà màn chắn vẫn còn → ĐỎ, kể ĐÃ BẤM MẤY LẦN, và **không đặt tên cho nguyên nhân**.
 * Bản trước ném ngay sau MỘT cú với câu *"máy chủ Udin vẫn đầy chỗ"* — một nguyên nhân lệnh này
 * không kiểm được, và Đức đã bác: đó là bug giao diện. Vế `!/đầy chỗ/` là vế phân biệt; thiếu nó
 * thì một bản chỉ sửa số lần bấm mà giữ nguyên câu khai bậy vẫn xanh. */
{ const t = lam({ chanTat: false, soLanBam: 4 });
  await assert.rejects(() => quaManCho({ ...t, soLanBam: 4 }), /Đã bấm Try Again 4 lần/);
  await assert.rejects(() => quaManCho({ ...t, soLanBam: 4 }), /bug/);
  const e = await quaManCho({ ...t, soLanBam: 4 }).then(() => null, (x) => x);
  assert.ok(!/đầy chỗ/.test(e.message), "không được khai một nguyên nhân mà lệnh này không kiểm được"); }

/* ⓗ MÀN CHẮN TẮT Ở CÚ BẤM THỨ BA — khối phân biệt bản bấm-một-lần với bản bấm-lại.
 * Bản cũ ném ngay sau cú thứ nhất, nên nó ĐỎ ở đây trong khi bản đúng đi qua. */
{ const t = lam({ tatOLan: 3 });
  assert.deepEqual(await quaManCho(t), { daChan: true, bam: 3 });
  assert.equal(bam(t.nk), 3, "phải bấm đủ ba lần, không bỏ cuộc sau cú đầu"); }

/* ⓘ và trần bấm phải HỮU HẠN — không ngồi bấm vô tận. */
{ const t = lam({ chanTat: false });
  await assert.rejects(() => quaManCho({ ...t, soLanBam: 2 }), /Đã bấm Try Again 2 lần/);
  assert.equal(bam(t.nk), 2); }
// ⓔ màn chắn tắt nhưng ô prompt chưa dùng được → báo thật
{ const t = lam({ oDung: false }); await assert.rejects(() => quaManCho(t), /ô prompt chưa dùng được/); }
console.log("  · udin qua-man-cho: 10 khối xanh");
