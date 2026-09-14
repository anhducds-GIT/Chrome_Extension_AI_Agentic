/* Phép ghim cho adapter gửi prompt Udin — chạy không cần trình duyệt.
 * Trang giả giữ TRẠNG THÁI (chữ trong ô, đang chạy, tập ảnh) và trả theo đúng selector + state,
 * để bấm nhầm Stop hay chờ sai state là lộ ra. */
import assert from "node:assert/strict";
import { guiPrompt, choXong, UdinDangChay, HAN_URL_MS, SEL } from "../scripts/gui-prompt.mjs";

function lam({ chuSan = "", dangChaySan = false, goToi = true, nhan = true, vongChay = 2, anhMoi = 4, nutLap = 1, anhCu = 2, tranMs = 300000 } = {}) {
  const nk = [];
  /* `guiDi` = "lượt đang chạy này sẽ đẻ ra ảnh khi xong". Đúng cho cả lượt MÌNH gửi lẫn lượt
   * đã chạy sẵn từ trước — và vế thứ hai là đúng cảnh `--noi-lai` phải xử lý. */
  const trang = { chu: chuSan, chay: dangChaySan, vong: dangChaySan ? vongChay : 0, guiDi: dangChaySan, anh: Array.from({ length: anhCu }, (_, i) => `s3/cu-${i}.webp`) };
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
/* ⓖ `T22` — HẾT TRẦN KHÔNG PHẢI HỎNG. Đo 14/09 (`G-55`): adapter bỏ cuộc ở 300s trong khi Udin
 * chạy tiếp >17 phút; credit đã tiêu mà cả lượt vứt đi vì *quá giờ* bị gộp vào *hỏng*. */
{ const t = lam({ vongChay: 1e9, tranMs: -1 });
  await assert.rejects(() => guiPrompt("x", t), (e) => {
    assert.ok(e instanceof UdinDangChay, `phải là UdinDangChay, không phải Error trơn — thấy ${e.name}`);
    assert.equal(e.dangChay, true, "người gọi phân biệt hai ca bằng cờ này");
    assert.match(e.message, /VẪN ĐANG CHẠY/);
    assert.match(e.message, /Credit đã tiêu/, "lời báo phải nói ra cái giá, không thì nó bị đọc như một lỗi vặt");
    assert.ok(Array.isArray(e.truoc), "phải chở theo tập ảnh TRƯỚC lúc gửi — không có nó thì không nối lại được");
    assert.deepEqual(e.truoc, ["s3/cu-0.webp", "s3/cu-1.webp"]);
    return true;
  }); }

// ⓚ `T22` — trần mặc định bằng đúng hạn của URL ký sẵn, không phải một con số gõ tay
{ assert.equal(HAN_URL_MS, 900000, "900s = X-Amz-Expires của ảnh Udin (G-51)");
  const t = lam({ dangChaySan: true, vongChay: 1e9 });
  delete t.tranMs; /* bỏ trần của máy giả để hàm dùng MẶC ĐỊNH — đó mới là thứ khối này ghim */
  const t0 = Date.now() - HAN_URL_MS - 1; /* giả vờ đã chờ quá hạn */
  await assert.rejects(() => choXong(["s3/cu-0.webp"], { ...t, t0 }), UdinDangChay); }

// ⓛ `T22` — NỐI LẠI một lượt đang dở: không gõ, không bấm, vẫn lấy được ảnh mới
{ const t = lam({ dangChaySan: true, vongChay: 2, anhMoi: 4 });
  t.nk.length = 0;
  /* trang đang chạy sẵn và sẽ đẻ ảnh khi xong — đúng cảnh một lượt đã tiêu credit rồi bị bỏ rơi */
  const k = await choXong(["s3/cu-0.webp", "s3/cu-1.webp"], t);
  assert.equal(k.anhMoi, 4, "phải vớt được đủ bốn ảnh của lượt mình KHÔNG gửi");
  assert.ok(k.src.every((s) => s.startsWith("s3/moi-")), `chỉ ảnh mới, thấy ${k.src.join(" ")}`);
  assert.equal(bam(t.nk), 0, "nối lại KHÔNG được bấm — bấm lúc này là bấm Stop, giết lượt đang chạy");
  assert.ok(!t.nk.some((g) => g.method === "scout.type"), "nối lại KHÔNG được gõ — gõ là tiêu thêm credit"); }
// ⓘ lịch sử dài hơn một trang query (250 ảnh cũ) → vẫn không đếm ảnh cũ là mới
{ const t = lam({ anhCu: 250 }); assert.equal((await guiPrompt("x", t)).anhMoi, 4); }
// ⓙ selector Send phải loại nút Stop (cùng một phần tử đổi class)
assert.match(SEL.nutSend, /:not\(\.stop-button\)/);
// ⓗ prompt rỗng → không đụng trang
{ const t = lam(); await assert.rejects(() => guiPrompt("  ", t), /Thiếu prompt/); assert.equal(t.nk.length, 0); }
console.log("  · udin gui-prompt: 13 khối xanh");
