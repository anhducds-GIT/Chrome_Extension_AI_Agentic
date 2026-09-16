/* Phép ghim cho vòng tham chiếu (`@1` / `@2`).
 *
 * Chốt của bộ này: **danh tính ảnh vừa thả học bằng PHẦN CHÊNH của tập `data-image-id`.**
 * Hai bản trước lấy một CÁI TÊN làm danh tính và cả hai đều hỏng cùng kiểu:
 *   · TÊN TỆP (16/09) — canvas giữ một bản khác, khớp **0/8**
 *   · `src` (17/09 sáng) — Udin mã hoá lại ảnh thả vào thành `data:image/webp;base64,…`, lõi
 *     đọc cắt ở 200 ký tự, nên hai ảnh khác hẳn nhau cho ra **hai chuỗi y hệt**; canvas mọc
 *     18 → 20 mà phép so thấy 0 ảnh mới.
 * Cả hai cái sai ấy đọc y hệt nhau trên màn hình: *"trang chưa nhận ảnh"*.
 */
import assert from "node:assert/strict";
import { vongThamChieu, thaLenCanvas, timTrenCanvas, NOI_THA } from "../vong-tham-chieu.mjs";
import { SEL as SEL_CHON } from "../chon-tham-chieu.mjs";
import { SEL as SEL_GUI } from "../gui-prompt.mjs";

const VUNG_GHI = "C:/vung-ghi-gia";
/* Canvas là danh sách CHỖ ĐẶT `{ id, src }`. Hai chỗ thả vào cố ý mang **cùng một `src`** —
 * đó chính là ca đã hạ đường cũ: Udin mã hoá lại ảnh thả vào, và hai bản mã hoá ấy giống hệt
 * nhau trong 200 ký tự đầu. Phép so theo `src` thấy chúng là MỘT; theo `data-image-id` thì không. */
const CU = { id: "ph-1111", src: "https://cdn.udin/persistent/img/1111-aaa.webp" };
const CU2 = { id: "ph-2222", src: "https://cdn.udin/persistent/img/2222-bbb.webp" };
const SRC_THA = "data:image/webp;base64,UklGRiJVTgBXRUJQVlA4WAoAAAAgAAAA";
const THA1 = { id: "ph-9001", src: SRC_THA };
const THA2 = { id: "ph-9002", src: SRC_THA };
/* Hai câu trả lời PHẢI khác nhau: ca hỏng đắt nhất của `W4` là đọc lại câu của lượt TRƯỚC
 * rồi khai là câu của lượt NÀY, và chỉ một cặp chuỗi khác nhau mới phân biệt được hai nhánh. */
const CHU_CU = "cau tra loi cua luot TRUOC";
const CHU_MOI = "cau tra loi cua luot NAY";

/**
 * @param moiMoiLuotTha `src` canvas mọc ra sau MỖI lượt thả, theo thứ tự
 * @param thaHong lượt thả không làm canvas mọc thêm gì
 * @param thaThua một lượt thả làm canvas mọc thêm HAI ảnh
 */
function lam({ canvas = [CU, CU2], moiMoiLuotTha = [THA1, THA2], thaHong = false, thaThua = false, traLoiMoi = true } = {}) {
  const nk = [];
  const trang = { canvas: [...canvas], chon: [], chu: "", chay: false, vong: 0, ketQua: [], traLoi: CHU_CU };
  let luotTha = 0;
  const q = (n, items = [], hasMore = false) => ({ data: { matchCount: n, items, hasMore } });
  const idCuaSel = (sel) => {
    const m = sel.match(/^\.canvas-image-container\[data-image-id="(.*?)"\]/);
    return m ? m[1] : null;
  };
  const mauCuaSel = (sel) => {
    const m = sel.match(/^\.canvas-image-container:has\(img\[src\*="(.*?)"\]\)$/);
    return m ? m[1] : null;
  };
  const demId = (id) => trang.canvas.filter((c) => c.id === id).length;
  const soCua = (id) => { const i = trang.chon.indexOf(id); return i < 0 ? null : String(i + 1); };

  const goi = async (method, p) => {
    nk.push({ method, p });
    if (method === "host.capabilities") return { write_root: VUNG_GHI };
    if (method === "scout.tha") {
      luotTha += 1;
      if (!thaHong) {
        trang.canvas.push(moiMoiLuotTha[luotTha - 1]);
        if (thaThua) trang.canvas.push({ id: moiMoiLuotTha[luotTha - 1].id + "-thua", src: SRC_THA });
      }
      return { action: "input.tha", data: { selector: p.selector, path: p.path, files: 1 } };
    }
    if (method === "scout.query") {
      const sel = p.selector;
      if (sel === ".concurrency-overlay") return q(0);
      if (sel === ".agent-message-item:last-child .markdown-content") return q(1);
      if (sel === SEL_CHON.hop) {
        return { data: { matchCount: trang.canvas.length, hasMore: false,
                         items: trang.canvas.map((c) => ({ attributes: { "data-image-id": c.id } })) } };
      }
      if (sel === SEL_CHON.anh) {
        return { data: { matchCount: trang.canvas.length, hasMore: false,
                         items: trang.canvas.map((c) => ({ attributes: { src: c.src + "…" } })) } };
      }
      if (sel === SEL_CHON.dangChon) return q(trang.chon.length);
      if (sel === SEL_CHON.huyHieu) return q(trang.chon.length >= 2 ? trang.chon.length : 0);
      { const mau = mauCuaSel(sel);
        if (mau !== null) {
          const hop = trang.canvas.filter((c) => c.src.includes(mau));
          return q(hop.length, hop.map((c) => ({ attributes: { "data-image-id": c.id } })));
        } }
      { const id = idCuaSel(sel);
        if (id !== null) {
          const n = demId(id);
          if (sel.endsWith(".selected")) return q(n === 1 && trang.chon.includes(id) ? 1 : 0);
          if (!sel.endsWith(SEL_CHON.huyHieu)) return q(n);
          if (n !== 1 || trang.chon.length < 2) return q(0);
          return q(soCua(id) === null ? 0 : 1);
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
      if (p.selector === ".agent-message-item:last-child .markdown-content") {
        return { data: { selector: p.selector, matchCount: 1, text: trang.traLoi,
                         chars: trang.traLoi.length, truncated: false, maxChars: 5000 } };
      }
      const id = idCuaSel(p.selector);
      const so = id === null ? null : soCua(id);
      if (so === null) throw new Error("SELECTOR_AMBIGUOUS " + p.selector);
      return { data: { selector: p.selector, matchCount: 1, text: so, chars: 1, truncated: false } };
    }
    if (method === "scout.chon") {
      const id = idCuaSel(p.selector);
      if (id === null || demId(id) !== 1) throw new Error("khong tro duoc " + p.selector);
      const i = trang.chon.indexOf(id);
      if (i >= 0) trang.chon.splice(i, 1); else trang.chon.push(id);
      return { action: "input.chon", data: {} };
    }
    if (method === "scout.type") { trang.chu += p.text; return { data: { typed: p.text.length } }; }
    if (method === "scout.click") {
      trang.chay = true; trang.vong = 1; trang.chu = "";
      /* `traLoiMoi: false` dựng đúng ca agent ra ảnh mà KHÔNG viết câu mới — trang vẫn "xong",
       * W3 vẫn có ảnh, và chỉ `W4` nhìn ra là câu chữ vẫn là câu của lượt trước. */
      if (traLoiMoi) trang.traLoi = CHU_MOI;
      return { data: {} };
    }
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
  assert.deepEqual(k.chang.map((c) => c.chang), ["W1", "NGUON", "CHON", "W2", "W3", "JPG", "W4"]);
  /* `W4` phải trả câu MỚI, không phải câu đang có trên trang lúc bắt đầu. */
  assert.equal(k.traLoi, CHU_MOI);
  assert.deepEqual(k.thamChieu.map((x) => x.so), [1, 2]);
  /* Thứ tự `@N` phải theo thứ tự người gọi đưa `--anh`, không theo thứ tự nào khác.
   * HAI ẢNH NÀY MANG CÙNG MỘT `src` — đó là cả điểm của khối: đường cũ (so `src`) thấy lượt thả
   * thứ hai KHÔNG đẻ ra gì và báo "trang chưa nhận". */
  assert.equal(k.thamChieu[0].id, THA1.id);
  assert.equal(k.thamChieu[1].id, THA2.id);
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
  await assert.rejects(() => vongThamChieu("style @1 onto @2", { ...t, anh: ["a.png", "b.png"] }), /canvas KHÔNG mọc thêm chỗ đặt nào/);
  assert.equal(soLan(t.nk, "scout.chon"), 0);
  assert.equal(soLan(t.nk, "scout.type"), 0); }

// ⓓ một lượt thả mà canvas mọc thêm HAI ảnh → ĐỎ: không biết ảnh nào là của lượt này.
//    Đây là ca mà "lấy ảnh mới nhất" sẽ đoán bừa và trỏ nhầm tham chiếu mà không báo gì.
{ const t = lam({ thaThua: true });
  await assert.rejects(() => vongThamChieu("style @1 onto @2", { ...t, anh: ["a.png", "b.png"] }), /mọc thêm 2 chỗ đặt/);
  assert.equal(soLan(t.nk, "scout.chon"), 0); }

// ⓔ `canvas:` — dùng ảnh ĐÃ có trên canvas, không thả gì
{ const t = lam();
  const k = await vongThamChieu("blend @1 with @2", { ...t, anh: ["canvas:1111-aaa", "canvas:2222-bbb"] });
  assert.equal(soLan(t.nk, "scout.tha"), 0, "ảnh đã trên canvas thì không thả lại");
  assert.deepEqual(k.thamChieu.map((x) => x.id), [CU.id, CU2.id]); }

// ⓕ trộn hai dạng: một ảnh thả vào, một ảnh đã có — thứ tự `@N` vẫn theo thứ tự đưa vào
{ const t = lam();
  const k = await vongThamChieu("put @2 into the scene of @1", { ...t, anh: ["canvas:2222-bbb", "udin-optic/vao/a.png"] });
  assert.deepEqual(k.thamChieu.map((x) => x.id), [CU2.id, THA1.id]);
  assert.equal(soLan(t.nk, "scout.tha"), 1); }

// ⓖ `canvas:` khớp nhiều chỗ → TỪ CHỐI, không đoán
{ const t = lam({ canvas: [CU, CU2] });
  await assert.rejects(() => timTrenCanvas("persistent", t), /khớp 2 chỗ/); }

// ⓗ `canvas:` không khớp ảnh nào → TỪ CHỐI kèm lối ra
{ const t = lam();
  await assert.rejects(() => timTrenCanvas("khong-co-dau", t), /Không chỗ nào mang mẩu ấy/); }

// ⓘ không đưa `--anh` nào → ĐỎ, và chỉ thẳng sang `e2e.mjs`
{ const t = lam();
  await assert.rejects(() => vongThamChieu("a lone prompt", { ...t, anh: [] }), /e2e\.mjs/);
  assert.equal(t.nk.length, 0); }

// ⓙ thiếu prompt → không đụng tới trang
{ const t = lam();
  await assert.rejects(() => vongThamChieu("  ", { ...t, anh: ["a.png"] }), /chữ MỚI/);
  assert.equal(t.nk.length, 0); }

// ⓚ `thaLenCanvas` trả đúng MÃ mới, học bằng phần chênh — không bằng tên tệp, không bằng `src`
{ const t = lam();
  const k = await thaLenCanvas("udin-optic/vao/ten-khac-han.png", t);
  assert.equal(k.id, THA1.id, "danh tính học bằng phần chênh của tập mã; tên tệp và `src` không dính dáng gì");
  assert.equal(k.canvasTruoc, 2);
  assert.equal(k.canvasSau, 3); }

// ⓛ agent ra ảnh mà KHÔNG viết câu mới → `W4` ĐỎ, và ảnh của lượt này VẪN nằm trên đĩa
/* Đây là ca hỏng đắt nhất của `W4` và nó không báo lỗi ở đâu khác: trang vẫn "xong", `W3` vẫn
 * có ảnh, chỉ mỗi câu chữ là câu của lượt TRƯỚC. Vế thứ hai quan trọng ngang vế đầu — `W4`
 * đứng sau lượt ghi đĩa đúng để một chặng đọc đỏ không bao giờ làm mất ảnh đã tải về. */
{ const t = lam({ traLoiMoi: false });
  await assert.rejects(
    () => vongThamChieu("a dusk-lit cathedral in @1 rendered onto @2", { ...t, anh: ["udin-optic/vao/a.png", "udin-optic/vao/b.png"] }),
  );
  assert.equal(t.nk.filter((g) => g.method === "file.write").length, 1, "W4 đỏ không được làm mất ảnh đã ghi"); }

console.log("vong-tham-chieu-smoke: OK");
