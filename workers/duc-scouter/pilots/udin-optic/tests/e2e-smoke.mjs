/* Phép ghim cho E2E Udin — thứ tự ba chặng, và chặng W3 chỉ lấy ảnh của LƯỢT NÀY.
 * Trang giả: 2 ảnh cũ sẵn có, gửi xong sinh thêm 2 ảnh mới. */
import assert from "node:assert/strict";
import { e2e } from "../scripts/e2e.mjs";
import { SEL } from "../scripts/gui-prompt.mjs";

function lam({ nhan = true } = {}) {
  const nk = [];
  const trang = { chu: "", chay: false, vong: 0, anh: ["https://cdn.udin/cu-1.webp", "https://cdn.udin/cu-2.webp"] };
  const q = (n, items = [], hasMore = false) => ({ data: { matchCount: n, items, hasMore } });
  const goi = async (method, p) => {
    nk.push({ method, p });
    if (method === "scout.navigate") return { data: { ok: true } };
    if (method === "scout.query") {
      if (p.selector === ".concurrency-overlay") return q(0);
      if (p.selector === SEL.anhKetQua) return q(trang.anh.length, trang.anh.map((src) => ({ attributes: { src } })), false);
      /* Ứng viên selector mà `lay-anh` dựng để chỉ ĐÚNG MỘT nút ảnh. Trang giả này không có
       * `alt`/`id`, nên đường duy nhất là tiền tố `src` — và nó phải khớp đúng một. */
      { const m = p.selector.match(/^img\.batch-grid-image\[src\^="(.*)"\]$/);
        if (m) { const h = trang.anh.filter((s) => s.startsWith(m[1]));
          return q(h.length, h.map((src) => ({ attributes: { src } })), false); } }
      if (p.selector === SEL.dangChay) {
        if (trang.chay && trang.vong-- <= 0) { trang.chay = false; trang.anh.push("https://cdn.udin/moi-1.webp", "https://cdn.udin/moi-2.webp"); }
        return q(trang.chay ? 1 : 0);
      }
      if (p.selector === SEL.nutSend) return trang.chay ? q(0) : q(1, [{ attributes: trang.chu ? {} : { disabled: "" } }]);
    }
    if (method === "scout.type") { trang.chu += p.text; return { data: { typed: p.text.length } }; }
    if (method === "scout.click") { if (nhan) { trang.chay = true; trang.vong = 1; trang.chu = ""; } return { data: {} }; }
    if (method === "scout.wait") {
      if (p.selector === SEL.dangChay) return { data: { satisfied: p.state === "present" ? trang.chay : !trang.chay } };
      return { data: { satisfied: true } };
    }
    if (method === "scout.grab") {
      const m = p.selector.match(/^img\.batch-grid-image\[src\^="(.*)"\]$/);
      const h = trang.anh.filter((s) => m && s.startsWith(m[1]));
      if (h.length !== 1) throw new Error(`SELECTOR_AMBIGUOUS — ${h.length}`);
      return { action: "grab", ok: true, status: 200, content_type: "image/webp", bytes: 3, body_base64: "QUFB",
               source: { selector: p.selector, attribute: p.attribute, masked: h[0], matchCount: 1 } };
    }
    if (method === "file.write") return { path: p.path, bytes: 3, size: 3 };
    throw new Error("method lạ " + method + " " + (p.selector || ""));
  };
  return { nk, goi, timTab: async () => "TAB", ngu: async () => {}, buocMs: 0, dau: "2026-09-14T00:00:00.000Z" };
}

// ⓐ ba chặng đúng thứ tự, và W3 ghi ĐÚNG hai ảnh mới — không ghi lại hai ảnh cũ
{ const t = lam();
  const k = await e2e("a blue kite", t);
  assert.deepEqual(k.chang.map((c) => c.chang), ["W1", "W2", "W3"]);
  assert.equal(k.chang[2].daLay.length, 2);
  const daGhi = t.nk.filter((g) => g.method === "file.write").map((g) => g.p.path);
  assert.equal(daGhi.length, 2, "chỉ ghi ảnh của lượt này");
  assert.ok(daGhi.every((p) => /moi-/.test(p)), `phải là ảnh mới, thấy ${daGhi.join(" ")}`);
  assert.ok(t.nk.findIndex((g) => g.method === "scout.click") < t.nk.findIndex((g) => g.method === "scout.grab"), "lấy ảnh sau khi gửi"); }

// ⓑ mặc định KHÔNG nạp lại tab của Đức
{ const t = lam(); await e2e("a green door", t);
  assert.equal(t.nk.filter((g) => g.method === "scout.navigate").length, 0); }

// ⓒ --nap-lai thì có nạp, và nạp TRƯỚC chặng W1
{ const t = lam(); await e2e("a green door", { ...t, napLai: true });
  const i = t.nk.findIndex((g) => g.method === "scout.navigate");
  assert.ok(i >= 0 && i < t.nk.findIndex((g) => g.method === "scout.query")); }

// ⓓ thiếu prompt → không đụng tới trang (mỗi lượt chạy thật phải có chữ mới)
{ const t = lam(); await assert.rejects(() => e2e("  ", t), /chữ MỚI/); assert.equal(t.nk.length, 0); }

// ⓔ chặng W2 hỏng → cả vòng ĐỎ, và chặng W3 KHÔNG chạy (không ghi file nào)
{ const t = lam({ nhan: false });
  await assert.rejects(() => e2e("a red gate", t), /không chạy/);
  assert.equal(t.nk.filter((g) => g.method === "file.write").length, 0);
  assert.equal(t.nk.filter((g) => g.method === "scout.grab").length, 0); }

console.log("  · udin e2e: 5 khối xanh");
