/* Phép ghim cho vòng tham chiếu (`@1` / `@2`).
 *
 * Chốt của bộ này: **danh tính ảnh vừa thả học bằng PHẦN CHÊNH của canvas, không bằng tên tệp.**
 * Đo 16/09: ảnh trên canvas mang `persistent/…/img/…`, ảnh trong khung chat mang
 * `ephemeral/…/generated/batch-…` — khớp **0/8** theo tên. Một phép đối chiếu theo tên sẽ khớp 0
 * ở mọi lượt, và cái sai ấy đọc y hệt *"trang chưa nhận ảnh"*.
 */
import assert from "node:assert/strict";
import { vongThamChieu, thaLenCanvas, timTrenCanvas, NOI_THA } from "../vong-tham-chieu.mjs";
import { SEL as SEL_CHON } from "../chon-tham-chieu.mjs";
import { SEL as SEL_GUI } from "../gui-prompt.mjs";

const VUNG_GHI = "C:/vung-ghi-gia";
const CU = "https://cdn.udin/persistent/img/1111-aaa.webp";
const CU2 = "https://cdn.udin/persistent/img/2222-bbb.webp";
const THA1 = "https://cdn.udin/persistent/img/9001-tha.webp";
const THA2 = "https://cdn.udin/persistent/img/9002-tha.webp";

/**
 * @param moiMoiLuotTha `src` canvas mọc ra sau MỖI lượt thả, theo thứ tự
 * @param thaHong lượt thả không làm canvas mọc thêm gì
 * @param thaThua một lượt thả làm canvas mọc thêm HAI ảnh
 */
function lam({ canvas = [CU, CU2], moiMoiLuotTha = [THA1, THA2], thaHong = false, thaThua = false } = {}) {
  const nk = [];
  const trang = { canvas: [...canvas], chon: [], chu: "", chay: false, vong: 0, ketQua: [] };
  let luotTha = 0;
  const q = (n, items = [], hasMore = false) => ({ data: { matchCount: n, items, hasMore } });
  const tienTo = (sel) => {
    const m = sel.match(/^\.canvas-image-container:has\(img\[src\^="(.*?)"\]\)/);
    return m ? m[1] : null;
  };
  const demTienTo = (p) => trang.canvas.filter((s) => s.startsWith(p)).length;
  const soCua = (src) => { const i = trang.chon.indexOf(src); return i < 0 ? null : String(i + 1); };

  const goi = async (method, p) => {
    nk.push({ method, p });
    if (method === "host.capabilities") return { write_root: VUNG_GHI };
    if (method === "scout.tha") {
      luotTha += 1;
      if (!thaHong) {
        trang.canvas.push(moiMoiLuotTha[luotTha - 1]);
        if (thaThua) trang.canvas.push(moiMoiLuotTha[luotTha - 1] + "-thua");
      }
      return { action: "input.tha", data: { selector: p.selector, path: p.path, files: 1 } };
    }
    if (method === "scout.query") {
      const sel = p.selector;
      if (sel === ".concurrency-overlay") return q(0);
      if (sel === SEL_CHON.anh) {
        return { data: { matchCount: trang.canvas.length, hasMore: false,
                         items: trang.canvas.map((src) => ({ attributes: { src: src + "…" } })) } };
      }
      if (sel === SEL_CHON.dangChon) return q(trang.chon.length);
      if (sel === SEL_CHON.huyHieu) return q(trang.chon.length >= 2 ? trang.chon.length : 0);
      { const m = sel.match(/^(\.canvas-image-container:has\(img\[src\^="(.*?)"\]\))\.selected$/);
        if (m) { if (demTienTo(m[2]) !== 1) return q(0);
          const src = trang.canvas.find((x) => x.startsWith(m[2]));
          return q(trang.chon.includes(src) ? 1 : 0); } }
      { const p2 = tienTo(sel);
        if (p2 !== null) {
          const n = demTienTo(p2);
          if (!sel.endsWith(SEL_CHON.huyHieu)) return q(n);
          if (n !== 1 || trang.chon.length < 2) return q(0);
          return q(soCua(trang.canvas.find((s) => s.startsWith(p2))) === null ? 0 : 1);
        } }
      if (sel === SEL_GUI.anhKetQua) return q(trang.ketQua.length, trang.ketQua.map((src) => ({ attributes: { src } })), false);
      { const m = sel.match(/^img\.batch-grid-image\[src\^="(.*)"\]$/);
        if (m) { const h = trang.ketQua.filter((s) => s.startsWith(m[1]));
          return q(h.length, h.map((src) => ({ attributes: { src } })), false); } }
      if (sel === SEL_GUI.dangChay) {
        if (trang.chay && trang.vong-- <= 0) { trang.chay = false; trang.ketQua.push("https://cdn.udin/ephemeral/generated/batch-moi.webp"); }
        return q(trang.chay ? 1 : 0);
      }
      if (sel === SEL_GUI.nutSend) return trang.chay ? q(0) : q(1, [{ attributes: trang.chu ? {} : { disabled: "" } }]);
    }
    if (method === "scout.wait") {
      if (p.selector === SEL_GUI.dangChay) return { data: { satisfied: p.state === "present" ? trang.chay : !trang.chay } };
      return { data: { satisfied: true } };
    }
    if (method === "scout.text") {
      const p2 = tienTo(p.selector);
      const so = p2 === null ? null : soCua(trang.canvas.find((s) => s.startsWith(p2)));
      if (so === null) throw new Error("SELECTOR_AMBIGUOUS " + p.selector);
      return { data: { selector: p.selector, matchCount: 1, text: so, chars: 1, truncated: false } };
    }
    if (method === "scout.chon") {
      const p2 = tienTo(p.selector);
      const src = p2 === null ? null : trang.canvas.find((s) => s.startsWith(p2));
      if (!src) throw new Error("khong tro duoc " + p.selector);
      const i = trang.chon.indexOf(src);
      if (i >= 0) trang.chon.splice(i, 1); else trang.chon.push(src);
      return { action: "input.chon", data: {} };
    }
    if (method === "scout.type") { trang.chu += p.text; return { data: { typed: p.text.length } }; }
    if (method === "scout.click") { trang.chay = true; trang.vong = 1; trang.chu = ""; return { data: {} }; }
    if (method === "scout.grab") {
      const m = p.selector.match(/^img\.batch-grid-image\[src\^="(.*)"\]$/);
      const h = trang.ketQua.filter((s) => m && s.startsWith(m[1]));
      if (h.length !== 1) throw new Error("SELECTOR_AMBIGUOUS");
      return { action: "grab", ok: true, status: 200, content_type: "image/webp", bytes: 3, body_base64: "QUFB",
               source: { selector: p.selector, masked: h[0], matchCount: 1 } };
    }
    if (method === "file.write") return { path: p.path, bytes: 3, size: 3 };
    throw new Error("method lạ " + method + " " + (p.selector || ""));
  };
  const chay = async () => JSON.stringify({ nguon: "batch-moi.webp", ra: "batch-moi.jpg", byteNguon: 9, byteRa: 8, rong: 4, cao: 4 });
  return { nk, trang, goi, chay, laJpeg: () => true, co: () => null, timTab: async () => "TAB",
           ngu: async () => {}, buocMs: 0, soNhip: 4, dau: "2026-09-17T00:00:00.000Z" };
}

const soLan = (nk, m) => nk.filter((g) => g.method === m).length;

// ⓐ vòng đầy đủ: thả hai ảnh → chọn đúng thứ tự → gửi → ảnh mới về đĩa
{ const t = lam();
  const k = await vongThamChieu("apply the style of @1 to @2", { ...t, anh: ["udin-optic/vao/a.png", "udin-optic/vao/b.png"] });
  assert.deepEqual(k.chang.map((c) => c.chang), ["W1", "NGUON", "CHON", "W2", "W3", "JPG"]);
  assert.deepEqual(k.thamChieu.map((x) => x.so), [1, 2]);
  /* Thứ tự `@N` phải theo thứ tự người gọi đưa `--anh`, không theo thứ tự nào khác. */
  assert.equal(k.thamChieu[0].src, THA1);
  assert.equal(k.thamChieu[1].src, THA2);
  assert.equal(soLan(t.nk, "scout.tha"), 2);
  /* Thả vào `#root` — Udin không có lớp canvas riêng nào đọc được (đo 17/09). */
  assert.ok(t.nk.filter((g) => g.method === "scout.tha").every((g) => g.p.selector === NOI_THA));
  /* THẢ xong mới CHỌN, CHỌN xong mới GỬI — đảo bất kỳ chỗ nào là trỏ nhầm tham chiếu. */
  assert.ok(t.nk.findLastIndex((g) => g.method === "scout.tha") < t.nk.findIndex((g) => g.method === "scout.chon"));
  assert.ok(t.nk.findLastIndex((g) => g.method === "scout.chon") < t.nk.findIndex((g) => g.method === "scout.type"));
  assert.equal(soLan(t.nk, "file.write"), 1); }

// ⓑ prompt gọi `@3` mà chỉ đưa 2 ảnh → ĐỎ TRƯỚC khi đụng vào trang một lần nào
{ const t = lam();
  await assert.rejects(() => vongThamChieu("apply @1 to @3", { ...t, anh: ["a.png", "b.png"] }), /@3/);
  assert.equal(t.nk.length, 0, "đọc được lỗi từ chuỗi chữ thì đừng hỏi trang một câu nào"); }

// ⓒ thả mà canvas KHÔNG mọc thêm ảnh → ĐỎ, và không chọn, không gõ, không gửi
{ const t = lam({ thaHong: true });
  await assert.rejects(() => vongThamChieu("style @1 onto @2", { ...t, anh: ["a.png", "b.png"] }), /canvas KHÔNG mọc thêm/);
  assert.equal(soLan(t.nk, "scout.chon"), 0);
  assert.equal(soLan(t.nk, "scout.type"), 0); }

// ⓓ một lượt thả mà canvas mọc thêm HAI ảnh → ĐỎ: không biết ảnh nào là của lượt này.
//    Đây là ca mà "lấy ảnh mới nhất" sẽ đoán bừa và trỏ nhầm tham chiếu mà không báo gì.
{ const t = lam({ thaThua: true });
  await assert.rejects(() => vongThamChieu("style @1 onto @2", { ...t, anh: ["a.png", "b.png"] }), /mọc thêm 2 ảnh/);
  assert.equal(soLan(t.nk, "scout.chon"), 0); }

// ⓔ `canvas:` — dùng ảnh ĐÃ có trên canvas, không thả gì
{ const t = lam();
  const k = await vongThamChieu("blend @1 with @2", { ...t, anh: ["canvas:1111-aaa", "canvas:2222-bbb"] });
  assert.equal(soLan(t.nk, "scout.tha"), 0, "ảnh đã trên canvas thì không thả lại");
  assert.deepEqual(k.thamChieu.map((x) => x.src), [CU, CU2]); }

// ⓕ trộn hai dạng: một ảnh thả vào, một ảnh đã có — thứ tự `@N` vẫn theo thứ tự đưa vào
{ const t = lam();
  const k = await vongThamChieu("put @2 into the scene of @1", { ...t, anh: ["canvas:2222-bbb", "udin-optic/vao/a.png"] });
  assert.deepEqual(k.thamChieu.map((x) => x.src), [CU2, THA1]);
  assert.equal(soLan(t.nk, "scout.tha"), 1); }

// ⓖ `canvas:` khớp nhiều ảnh → TỪ CHỐI, không đoán
{ const t = lam({ canvas: [CU, CU2] });
  await assert.rejects(() => timTrenCanvas("persistent", t), /kh\u1edbp 2 \u1ea3nh/); }

// ⓗ `canvas:` không khớp ảnh nào → TỪ CHỐI kèm lối ra
{ const t = lam();
  await assert.rejects(() => timTrenCanvas("khong-co-dau", t), /Không có ảnh nào/); }

// ⓘ không đưa `--anh` nào → ĐỎ, và chỉ thẳng sang `e2e.mjs`
{ const t = lam();
  await assert.rejects(() => vongThamChieu("a lone prompt", { ...t, anh: [] }), /e2e\.mjs/);
  assert.equal(t.nk.length, 0); }

// ⓙ thiếu prompt → không đụng tới trang
{ const t = lam();
  await assert.rejects(() => vongThamChieu("  ", { ...t, anh: ["a.png"] }), /chữ MỚI/);
  assert.equal(t.nk.length, 0); }

// ⓚ `thaLenCanvas` trả đúng `src` MỚI, học bằng phần chênh — không bằng tên tệp
{ const t = lam();
  const k = await thaLenCanvas("udin-optic/vao/ten-khac-han.png", t);
  assert.equal(k.src, THA1, "danh tính học bằng phần chênh của canvas, tên tệp không dính dáng gì");
  assert.equal(k.canvasTruoc, 2);
  assert.equal(k.canvasSau, 3); }

console.log("vong-tham-chieu-smoke: OK");
