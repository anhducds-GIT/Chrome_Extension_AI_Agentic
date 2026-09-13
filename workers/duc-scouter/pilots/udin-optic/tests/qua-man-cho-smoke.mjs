/* Phép ghim cho adapter vượt màn chờ của Udin — chạy không cần trình duyệt. */
import assert from "node:assert/strict";
import { quaManCho, SEL } from "../scripts/qua-man-cho.mjs";

function lam({ coChan = true, nutDung = true, chanTat = true, oDung = true } = {}) {
  const nk = [];
  const goi = async (method, p) => {
    nk.push({ method, p });
    if (method === "scout.query") return { data: { matchCount: coChan ? 1 : 0 } };
    if (method === "scout.click") return { data: { hit: { relation: "self" } } };
    if (method === "scout.wait") {
      if (p.selector === SEL.nutThuLai) return { data: { satisfied: nutDung, usableBlockedBy: nutDung ? null : "covered" } };
      if (p.selector === SEL.manChan) return { data: { satisfied: chanTat } };
      if (p.selector === SEL.oPrompt) return { data: { satisfied: oDung, usableBlockedBy: oDung ? null : "covered" } };
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
// ⓒ nút chưa dùng được → không bấm
{ const t = lam({ nutDung: false }); await assert.rejects(() => quaManCho(t), /chưa bấm được/); assert.equal(bam(t.nk), 0); }
// ⓓ bấm rồi mà màn chắn vẫn còn → báo thật, không báo đạt
{ const t = lam({ chanTat: false }); await assert.rejects(() => quaManCho(t), /vẫn còn/); }
// ⓔ màn chắn tắt nhưng ô prompt chưa dùng được → báo thật
{ const t = lam({ oDung: false }); await assert.rejects(() => quaManCho(t), /ô prompt chưa dùng được/); }
console.log("  · udin qua-man-cho: 5 khối xanh");
