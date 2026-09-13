/* Phép ghim cho adapter gửi prompt Udin — chạy không cần trình duyệt.
 * Trang giả giữ TRẠNG THÁI (chữ trong ô, đang chạy, tập ảnh) và trả theo đúng selector + state,
 * để bấm nhầm Stop hay chờ sai state là lộ ra. */
import assert from "node:assert/strict";
import { guiPrompt, SEL } from "../scripts/gui-prompt.mjs";

function lam({ chuSan = "", dangChaySan = false, goToi = true, nhan = true, vongChay = 2, anhMoi = 4, nutLap = 1, anhCu = 2, tranMs = 300000 } = {}) {
  const nk = [];
  const trang = { chu: chuSan, chay: dangChaySan, vong: dangChaySan ? vongChay : 0, anh: Array.from({ length: anhCu }, (_, i) => `s3/cu-${i}.webp`) };
  const q = (n, items = [], hasMore = false) => ({ data: { matchCount: n, items, hasMore } });
  const goi = async (method, p) => {
    nk.push({ method, p });
    if (method === "scout.query") {
      if (p.selector === ".concurrency-overlay") return q(0);
      if (p.selector === SEL.anhKetQua) {
        /* lượt thật: một ảnh có thể hiện NHIỀU nút DOM — nhân bản để đếm-nút là sai */
        const items = trang.anh.flatMap((src) => Array(nutLap).fill({ attributes: { src } }));
        const tu = p.offset || 0, lay = p.limit || 100;
        return q(items.length, items.slice(tu, tu + lay), tu + lay < items.length);
      }
      if (p.selector === SEL.dangChay) {
        if (trang.chay && trang.vong-- <= 0) { trang.chay = false; if (trang.guiDi) for (let i = 0; i < anhMoi; i++) trang.anh.push(`s3/moi-${i}.webp`); }
        return q(trang.chay ? 1 : 0);
      }
      if (p.selector === SEL.nutSend) return trang.chay ? q(0) : q(1, [{ attributes: trang.chu ? { title: "Send" } : { title: "Send", disabled: "" } }]);
    }
    if (method === "scout.type") { if (goToi) trang.chu += p.text; return { data: { typed: p.text.length } }; }
    if (method === "scout.click") {
      assert.equal(p.selector, SEL.nutSend);
      if (trang.chay) { trang.chay = false; return { data: {} }; } /* đó là nút Stop */
      if (nhan) { trang.chay = true; trang.vong = vongChay; trang.guiDi = true; trang.chu = ""; }
      return { data: {} };
    }
    if (method === "scout.wait") {
      if (p.selector === SEL.oPrompt) return { data: { satisfied: true } };
      if (p.selector === SEL.dangChay) return { data: { satisfied: p.state === "present" ? trang.chay : !trang.chay } };
    }
    throw new Error("method lạ " + method + " " + p.selector);
  };
  return { nk, goi, timTab: async () => "TAB", ngu: async () => {}, buocMs: 0, tranMs };
}
const bam = (nk) => nk.filter((g) => g.method === "scout.click").length;

// ⓐ đường thẳng: qua màn chờ, gõ đúng prompt, bấm Send một lần, đếm ảnh MỚI theo src
{ const t = lam({ nutLap: 2 }); const k = await guiPrompt("a red car", t);
  assert.equal(k.anhMoi, 4, "đếm theo src, không theo nút DOM"); assert.equal(bam(t.nk), 1);
  assert.ok(t.nk.some((g) => g.p.selector === ".concurrency-overlay"), "phải qua màn chờ trước");
  assert.equal(t.nk.find((g) => g.method === "scout.type").p.text, "a red car");
  assert.ok(t.nk.findIndex((g) => g.method === "scout.type") < t.nk.findIndex((g) => g.method === "scout.click")); }
// ⓑ Udin đang chạy sẵn → không gõ, không bấm (bấm lúc này là bấm Stop)
{ const t = lam({ dangChaySan: true, vongChay: 99 }); t.nk.length = 0;
  await assert.rejects(() => guiPrompt("x", t), /đang chạy/); assert.equal(bam(t.nk), 0);
  assert.ok(!t.nk.some((g) => g.method === "scout.type")); }
// ⓒ ô có chữ sẵn → không gõ, không bấm
{ const t = lam({ chuSan: "cu" }); await assert.rejects(() => guiPrompt("x", t), /có chữ sẵn/); assert.equal(bam(t.nk), 0);
  assert.ok(!t.nk.some((g) => g.method === "scout.type")); }
// ⓓ gõ mà chữ không tới trang → nút vẫn khoá → không bấm
{ const t = lam({ goToi: false }); await assert.rejects(() => guiPrompt("x", t), /vẫn khoá/); assert.equal(bam(t.nk), 0); }
// ⓔ bấm mà Udin không chạy → báo thật
{ const t = lam({ nhan: false }); await assert.rejects(() => guiPrompt("x", t), /không chạy/); }
// ⓕ chạy xong mà không có ảnh mới → không báo đạt
{ const t = lam({ anhMoi: 0, nutLap: 3 }); await assert.rejects(() => guiPrompt("x", t), /không có ảnh mới/); }
// ⓖ chạy mãi không xong → dừng ở trần
{ const t = lam({ vongChay: 1e9, tranMs: -1 }); await assert.rejects(() => guiPrompt("x", t), /chưa xong/); }
// ⓘ lịch sử dài hơn một trang query (250 ảnh cũ) → vẫn không đếm ảnh cũ là mới
{ const t = lam({ anhCu: 250 }); assert.equal((await guiPrompt("x", t)).anhMoi, 4); }
// ⓙ selector Send phải loại nút Stop (cùng một phần tử đổi class)
assert.match(SEL.nutSend, /:not\(\.stop-button\)/);
// ⓗ prompt rỗng → không đụng trang
{ const t = lam(); await assert.rejects(() => guiPrompt("  ", t), /Thiếu prompt/); assert.equal(t.nk.length, 0); }
console.log("  · udin gui-prompt: 10 khối xanh");
