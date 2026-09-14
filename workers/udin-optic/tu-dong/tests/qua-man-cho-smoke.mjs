/* Phép ghim cho adapter vượt màn chờ của Udin — chạy không cần trình duyệt. */
import assert from "node:assert/strict";
import { quaManCho, SEL } from "../qua-man-cho.mjs";

/* `daVe` = ứng dụng đã vẽ xong chưa. Ngay sau `scout.navigate` nó là FALSE cho MỌI selector —
 * cả màn chắn lẫn ô prompt đều chưa có trong DOM. Đó là trạng thái đã cắn 14/09. */
function lam({ coChan = true, nutDung = true, chanTat = true, oDung = true, daVe = true } = {}) {
  const nk = [];
  const goi = async (method, p) => {
    nk.push({ method, p });
    if (method === "scout.query") return { data: { matchCount: daVe && coChan ? 1 : 0 } };
    if (method === "scout.click") return { data: { hit: { relation: "self" } } };
    if (method === "scout.wait") {
      if (p.selector === SEL.nutThuLai) return { data: { satisfied: nutDung, usableBlockedBy: nutDung ? null : "covered" } };
      if (p.selector === SEL.manChan) return { data: { satisfied: chanTat } };
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
// ⓓ bấm rồi mà màn chắn vẫn còn → báo thật, không báo đạt
{ const t = lam({ chanTat: false }); await assert.rejects(() => quaManCho(t), /vẫn còn/); }
// ⓔ màn chắn tắt nhưng ô prompt chưa dùng được → báo thật
{ const t = lam({ oDung: false }); await assert.rejects(() => quaManCho(t), /ô prompt chưa dùng được/); }
console.log("  · udin qua-man-cho: 7 khối xanh");
