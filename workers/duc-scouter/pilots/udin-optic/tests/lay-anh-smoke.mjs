/* Phép ghim cho W3 — lấy ảnh Udin về đĩa qua `scout.grab`. Chạy không cần trình duyệt.
 *
 * Máy giả ở đây **có một bộ khớp selector thật** (bốn dạng ứng viên mà adapter dựng ra), chứ
 * không gật đầu với mọi chuỗi. Đó là chỗ đắt nhất của file này: một selector sai nay ĐỎ, thay
 * vì lặng lẽ "khớp" rồi tải nhầm ảnh.
 *
 * Hình dạng `scout.grab` dưới đây chép từ `scouter-seed-core.mjs`: **PHẲNG**, có `source.masked`,
 * và **không có trường `url`**. Bài học 14/09 (`fake-encodes-my-belief`): 15 khối xanh trên một
 * máy giả chép đúng cái hiểu sai của tôi thì vẫn ngã ở lượt gọi thật đầu tiên.
 */
import assert from "node:assert/strict";
import { layAnh, tenFile, selectorDuyNhat, THU_MUC } from "../scripts/lay-anh.mjs";

const ANH = "img.batch-grid-image";
const A1 = "https://cdn.udin/a/v1.webp";
const A2 = "https://cdn.udin/b/v2.webp";

/* Bộ khớp selector của máy giả — hiểu đúng bốn dạng adapter dựng, và KHÔNG hiểu dạng nào khác. */
function khop(ds, sel) {
  if (sel === ANH) return ds;
  let m;
  if ((m = sel.match(/^img\.batch-grid-image#(.+)$/))) {
    const id = m[1].replace(/\\(.)/g, "$1");
    return ds.filter((a) => a.id === id);
  }
  if ((m = sel.match(/^img\.batch-grid-image\[data-testid="(.*)"\]$/))) return ds.filter((a) => a["data-testid"] === m[1]);
  if ((m = sel.match(/^img\.batch-grid-image\[alt="(.*)"\]$/))) return ds.filter((a) => a.alt === m[1]);
  if ((m = sel.match(/^img\.batch-grid-image\[src\^="(.*)"\]$/))) return ds.filter((a) => (a.src || "").startsWith(m[1]));
  return []; /* dạng lạ = không khớp gì, chứ không phải "khớp hết" */
}

/** @param trenTrang mảng thuộc tính của các nút ảnh — nhiều nút cùng `src` là chuyện THẬT của trang này. */
function lam({ kieu = "image/webp", status = 200, than = "QUFB", bytes = 3, ghiBytes = null, trenTrang = null, danhSach = [A1, A2] } = {}) {
  const nk = [];
  /* Mặc định: mỗi src một nút, có `alt` phân biệt — ca đơn giản nhất. */
  const ds = trenTrang || danhSach.map((src, i) => ({ src, alt: `Variation ${i + 1}` }));
  const goi = async (method, p) => {
    nk.push({ method, p });
    if (method === "scout.query") {
      const hop = khop(ds, p.selector);
      const tu = p.offset || 0, lay = p.limit || 100;
      const items = hop.map((a) => ({ attributes: a }));
      return { data: { matchCount: hop.length, items: items.slice(tu, tu + lay), hasMore: tu + lay < items.length } };
    }
    if (method === "scout.grab") {
      const hop = khop(ds, p.selector);
      /* Đúng như lõi thật: khớp không phải một thì TỪ CHỐI, không đoán "cái đầu tiên". */
      if (hop.length !== 1) throw new Error(`SELECTOR_AMBIGUOUS — ${hop.length} phần tử`);
      return {
        action: "grab", status, ok: status >= 200 && status < 300, content_type: kieu,
        bytes, body_base64: than,
        source: { selector: p.selector, attribute: p.attribute, masked: hop[0].src, matchCount: 1 },
        write_budget: { remaining: 199 },
      };
    }
    if (method === "file.write") return { path: p.path, bytes: ghiBytes ?? bytes, size: ghiBytes ?? bytes };
    throw new Error("method lạ " + method);
  };
  return { nk, goi, timTab: async () => "TAB", dau: "2026-09-14T00:00:00.000Z" };
}
const ghi = (nk) => nk.filter((g) => g.method === "file.write");
const grab = (nk) => nk.filter((g) => g.method === "scout.grab");

// ⓐ đường thẳng: hai ảnh → hai lượt ghi, base64 đúng thân tải về, thư mục theo mốc thời gian
{ const t = lam();
  const k = await layAnh([A1, A2], t);
  assert.equal(k.daLay.length, 2);
  assert.equal(ghi(t.nk).length, 2);
  assert.ok(ghi(t.nk).every((g) => g.p.encoding === "base64"), "phải ghi base64, không phải utf8");
  assert.ok(ghi(t.nk).every((g) => g.p.content === "QUFB"), "ghi đúng thân đã tải, không ghi thứ khác");
  assert.equal(ghi(t.nk)[0].p.path, `${THU_MUC}/2026-09-14T00-00-00-000Z/01-v1.webp`);
  assert.equal(ghi(t.nk)[1].p.path, `${THU_MUC}/2026-09-14T00-00-00-000Z/02-v2.webp`); }

// ⓤ CỬA TỪ VỰNG: grab đi bằng SELECTOR, không lượt nào mang `url`; và mỗi ảnh đúng MỘT lượt grab
{ const t = lam();
  await layAnh([A1, A2], t);
  assert.equal(grab(t.nk).length, 2, "mỗi ảnh một lượt grab — grab tiêu trần ghi, thừa một lượt là thừa một đơn vị");
  assert.ok(grab(t.nk).every((g) => typeof g.p.selector === "string" && g.p.selector !== ""), "grab phải nhận selector");
  assert.ok(grab(t.nk).every((g) => g.p.attribute === "src"));
  assert.ok(grab(t.nk).every((g) => !("url" in g.p)),
    "gửi `url` cho grab là biến nó thành fetch thứ hai — và fetch chính là đường đã chết vì 403");
  assert.equal(t.nk.filter((g) => g.method === "scout.fetch").length, 0, "không còn lượt scout.fetch nào"); }

// ⓠ TÁM NÚT CHO BỐN ẢNH — ca thật của trang này: `src^=` khớp 2, `alt` khớp 1 → phải đi bằng alt
{ const trenTrang = [
    { src: A1, alt: "Variation 1" }, { src: A1, alt: "Variation 1 thumb" },
    { src: A2, alt: "Variation 2" }, { src: A2, alt: "Variation 2 thumb" },
  ];
  const t = lam({ trenTrang });
  const k = await layAnh([A1, A2], t);
  assert.equal(k.daLay.length, 2);
  assert.ok(grab(t.nk).every((g) => g.p.selector.includes("[alt=")),
    `phải đi bằng alt vì src^= khớp hai nút; thật ra đi bằng: ${grab(t.nk).map((g) => g.p.selector).join(" · ")}`);
  assert.equal(k.daLay[0].selector, `${ANH}[alt="Variation 1"]`); }

// ⓟ THỨ TỰ ứng viên: có `id` thì dùng id và KHÔNG hỏi tới alt/src
{ const t = lam({ trenTrang: [{ src: A1, alt: "Variation 1", id: "anh-1" }] });
  const k = await layAnh([A1], t);
  assert.equal(k.daLay[0].selector, `${ANH}#anh-1`);
  assert.ok(!t.nk.some((g) => g.method === "scout.query" && g.p.selector.includes("[alt=")),
    "đã có selector duy nhất rồi thì đừng hỏi thêm — mỗi câu hỏi là một lượt đi dây"); }

// ⓡ KHÔNG ứng viên nào khớp đúng một → ĐỎ, kể ra đã thử gì, và KHÔNG grab lượt nào
{ const t = lam({ trenTrang: [{ src: A1, alt: "trùng" }, { src: A1, alt: "trùng" }] });
  await assert.rejects(() => layAnh([A1], t),
    (e) => /Không dựng được selector/.test(e.message) && /\[alt="trùng"\]/.test(e.message) && /src\^=/.test(e.message));
  assert.equal(grab(t.nk).length, 0, "chưa chắc là ai thì đừng bấm — grab tiêu trần ghi");
  assert.equal(ghi(t.nk).length, 0); }

// ⓢ giá trị thuộc tính có dấu nháy → bỏ ứng viên đó, KHÔNG dựng một selector thoát hỏng
{ const anh = { src: A1, alt: 'cái "đẹp"' };
  const t = lam({ trenTrang: [anh, { src: A1, alt: "khác" }] });
  /* alt có `"` nên bị loại; `src^=` khớp 2 → không còn ứng viên nào duy nhất */
  await assert.rejects(() => selectorDuyNhat("TAB", anh, t), (e) => !/đẹp/.test(e.message));
  assert.ok(!t.nk.some((g) => g.p.selector && g.p.selector.includes('"đẹp"')), "không được gửi selector chở nháy thô"); }

// ⓣ ảnh biến mất khỏi trang giữa chừng → ĐỎ, không im lặng lấy ít hơn
{ const t = lam({ trenTrang: [{ src: A1, alt: "Variation 1" }] });
  await assert.rejects(() => layAnh([A1, A2], t), /không còn trên trang/);
  assert.equal(ghi(t.nk).length, 1, "ảnh đầu đã lấy được thì vẫn ở trên đĩa"); }

// ⓑ src dạng blob: → KHÔNG grab, KHÔNG ghi (thứ thuộc về tab, tải kiểu gì cũng không ra byte)
{ const t = lam({ trenTrang: [{ src: "blob:https://vinfast.udinbv.com/9a-1", alt: "b" }] });
  await assert.rejects(() => layAnh(["blob:https://vinfast.udinbv.com/9a-1"], t), /thuộc về tab/);
  assert.equal(ghi(t.nk).length, 0);
  assert.equal(grab(t.nk).length, 0); }

// ⓒ 200 OK mà không phải ảnh → không ghi (bài học hnx: 200 OK không đủ để kết luận có dữ liệu)
{ const t = lam({ kieu: "text/html", danhSach: [A1] });
  await assert.rejects(() => layAnh([A1], t), /không phải ảnh/);
  assert.equal(ghi(t.nk).length, 0); }

// ⓓ máy chủ trả 403 → không ghi. (Đúng mã lỗi đã giết đường `scout.fetch` ngày 14/09.)
{ const t = lam({ status: 403, danhSach: [A1] });
  await assert.rejects(() => layAnh([A1], t), /403/);
  assert.equal(ghi(t.nk).length, 0); }

// ⓔ thân rỗng dù 200 → không ghi
{ const t = lam({ than: "", danhSach: [A1] });
  await assert.rejects(() => layAnh([A1], t), /thân rỗng/);
  assert.equal(ghi(t.nk).length, 0); }

// ⓕ ghi ra số byte khác số tải về → ĐỎ, và GỌI TÊN file đáng ngờ (file đã nằm trên đĩa rồi)
{ const t = lam({ bytes: 3, ghiBytes: 4, danhSach: [A1] });
  await assert.rejects(() => layAnh([A1], t),
    (e) => /KHÔNG tin file/.test(e.message) && e.message.includes("01-v1.webp")); }

// ⓝ lượt ghi bị máy chủ TỪ CHỐI (goi ném) → không nuốt, và lỗi thô vẫn mang theo chỗ để file
{ let lan = 0; const t = lam(); const goiGoc = t.goi;
  t.goi = async (m, p) => { if (m === "file.write" && lan++ === 1) throw new Error("DISK_FULL"); return goiGoc(m, p); };
  await assert.rejects(() => layAnh([A1, A2], t),
    (e) => /DISK_FULL/.test(e.message) && /Đã lấy 1 ảnh/.test(e.message) && /2026-09-14T00-00-00-000Z/.test(e.message)); }

// ⓞ lỗi của chính mình đi qua lượt bọc thì ghi chú ĐÚNG MỘT LẦN, và lỗi thô giữ được `cause`
{ const t = lam({ status: 403, danhSach: [A1] });
  await assert.rejects(() => layAnh([A1], t), (e) => (e.message.match(/Đã lấy/g) || []).length === 1);
  const t2 = lam({ danhSach: [A1] }); const goiGoc = t2.goi; const goc = Object.assign(new Error("DISK_FULL"), { code: "ENOSPC" });
  t2.goi = async (m, p) => { if (m === "file.write") throw goc; return goiGoc(m, p); };
  await assert.rejects(() => layAnh([A1], t2), (e) => e.cause === goc && e.cause.code === "ENOSPC");
  /* một lỗi từ dây mang sẵn trường `daGhiChu` KHÔNG được lách qua lượt ghi chú */
  const t3 = lam({ danhSach: [A1] }); const goiGoc3 = t3.goi;
  t3.goi = async (m, p) => { if (m === "file.write") throw Object.assign(new Error("LA_MAT"), { daGhiChu: true }); return goiGoc3(m, p); };
  await assert.rejects(() => layAnh([A1], t3), /Đã lấy 0 ảnh/); }

// ⓖ ảnh thứ hai hỏng → ảnh đầu vẫn trên đĩa, và lời báo nói ra con số đó
{ let lan = 0; const t = lam(); const goiGoc = t.goi;
  t.goi = async (m, p) => { if (m === "scout.grab" && lan++ === 1) return { ...(await goiGoc(m, p)), ok: false, status: 500 }; return goiGoc(m, p); };
  await assert.rejects(() => layAnh([A1, A2], t), /Đã lấy 1 ảnh/);
  assert.equal(ghi(t.nk).length, 1); }

// ⓗ không truyền danh sách → đọc trang, bỏ src trùng, lấy đủ
{ const t = lam({ trenTrang: [
    { src: A1, alt: "Variation 1" }, { src: A1, alt: "Variation 1 thumb" }, { src: A2, alt: "Variation 2" }] });
  const k = await layAnh(null, t);
  assert.equal(k.daLay.length, 2, "src trùng chỉ lấy một lần");
  assert.ok(t.nk.some((g) => g.method === "scout.query" && g.p.selector === ANH)); }

// ⓘ trang chưa có ảnh nào → nói thẳng, không ghi file rỗng
{ const t = lam({ trenTrang: [] });
  await assert.rejects(() => layAnh(null, t), /Không có ảnh/);
  assert.equal(ghi(t.nk).length, 0); }

// ⓚ danh sách RỖNG ≠ không truyền gì: lượt không sinh ảnh nào thì ĐỎ, không âm thầm lấy ảnh cũ
{ const t = lam({ trenTrang: [{ src: "https://cdn.udin/cu.webp", alt: "cũ" }] });
  await assert.rejects(() => layAnh([], t), /không sinh ảnh nào/);
  assert.equal(ghi(t.nk).length, 0);
  assert.equal(t.nk.length, 0, "không được sờ tới trang"); }

// ⓛ lời báo lúc hỏng phải nói ra CHỖ để file dở, không chỉ nói con số
{ let lan = 0; const t = lam(); const goiGoc = t.goi;
  t.goi = async (m, p) => { if (m === "scout.grab" && lan++ === 1) return { ...(await goiGoc(m, p)), ok: false, status: 500 }; return goiGoc(m, p); };
  await assert.rejects(() => layAnh([A1, A2], t), /2026-09-14T00-00-00-000Z/); }

// ⓜ đường dẫn báo ra là đường MÁY CHỦ trả, không phải đường mình xin (máy chủ có quyền đổi)
{ const t = lam({ danhSach: [A1] }); const goiGoc = t.goi;
  t.goi = async (m, p) => (m === "file.write" ? { path: `chuan-hoa/${p.path}`, bytes: 3, size: 3 } : goiGoc(m, p));
  const k = await layAnh([A1], t);
  assert.match(k.daLay[0].file, /^chuan-hoa\//); }

// ⓙ tên file: cắt ký tự lạ, giữ thứ tự, hai ảnh trùng tên gốc vẫn ra hai tên khác nhau
assert.equal(tenFile("https://cdn.udin/a b/v 1.webp?x=1", 1), "01-v-1.webp");
assert.notEqual(tenFile("https://cdn.udin/a/v.webp", 1), tenFile("https://cdn.udin/b/v.webp", 2));
assert.match(tenFile("https://cdn.udin/", 7), /^07-anh$/);

console.log("  · udin lay-anh: 21 khối xanh");
