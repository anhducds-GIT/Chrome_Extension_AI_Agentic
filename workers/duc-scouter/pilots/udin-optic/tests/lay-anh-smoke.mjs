/* Phép ghim cho W3 — lấy ảnh Udin về đĩa. Chạy không cần trình duyệt.
 * Máy giả trả về theo URL, nên mọi nhánh TỪ CHỐI đều kiểm được bằng "có lượt file.write nào không". */
import assert from "node:assert/strict";
import { layAnh, tenFile, THU_MUC } from "../scripts/lay-anh.mjs";

const ANH = "img.batch-grid-image";

function lam({ kieu = "image/webp", status = 200, than = "QUFB", bytes = 3, ghiBytes = null, trenTrang = [] } = {}) {
  const nk = [];
  const goi = async (method, p) => {
    nk.push({ method, p });
    if (method === "scout.query") {
      assert.equal(p.selector, ANH);
      const tu = p.offset || 0, lay = p.limit || 100;
      const items = trenTrang.map((src) => ({ attributes: { src } }));
      return { data: { matchCount: items.length, items: items.slice(tu, tu + lay), hasMore: tu + lay < items.length } };
    }
    if (method === "scout.fetch") {
      return { data: { ok: status >= 200 && status < 300, status, content_type: kieu, bytes, body_base64: than, body: null } };
    }
    if (method === "file.write") return { path: p.path, bytes: ghiBytes ?? bytes, size: ghiBytes ?? bytes };
    throw new Error("method lạ " + method);
  };
  return { nk, goi, timTab: async () => "TAB", dau: "2026-09-14T00:00:00.000Z" };
}
const ghi = (nk) => nk.filter((g) => g.method === "file.write");

// ⓐ đường thẳng: hai ảnh → hai lượt ghi, base64 đúng thân tải về, thư mục theo mốc thời gian
{ const t = lam();
  const k = await layAnh(["https://cdn.udin/a/v1.webp", "https://cdn.udin/b/v2.webp"], t);
  assert.equal(k.daLay.length, 2);
  assert.equal(ghi(t.nk).length, 2);
  assert.ok(ghi(t.nk).every((g) => g.p.encoding === "base64"), "phải ghi base64, không phải utf8");
  assert.ok(ghi(t.nk).every((g) => g.p.content === "QUFB"), "ghi đúng thân đã tải, không ghi thứ khác");
  assert.equal(ghi(t.nk)[0].p.path, `${THU_MUC}/2026-09-14T00-00-00-000Z/01-v1.webp`);
  assert.equal(ghi(t.nk)[1].p.path, `${THU_MUC}/2026-09-14T00-00-00-000Z/02-v2.webp`);
  assert.ok(t.nk.filter((g) => g.method === "scout.fetch").every((g) => g.p.as === "base64"), "xin base64, không xin text"); }

// ⓑ src dạng blob: → KHÔNG gọi mạng, KHÔNG ghi (máy phục vụ nền không với tới tài nguyên của tab)
{ const t = lam();
  await assert.rejects(() => layAnh(["blob:https://vinfast.udinbv.com/9a-1"], t), /không với tới/);
  assert.equal(ghi(t.nk).length, 0);
  assert.equal(t.nk.filter((g) => g.method === "scout.fetch").length, 0); }

// ⓒ 200 OK mà không phải ảnh → không ghi (bài học hnx: 200 OK không đủ để kết luận có dữ liệu)
{ const t = lam({ kieu: "text/html" });
  await assert.rejects(() => layAnh(["https://cdn.udin/v1.webp"], t), /không phải ảnh/);
  assert.equal(ghi(t.nk).length, 0); }

// ⓓ máy chủ trả 403 → không ghi
{ const t = lam({ status: 403 });
  await assert.rejects(() => layAnh(["https://cdn.udin/v1.webp"], t), /403/);
  assert.equal(ghi(t.nk).length, 0); }

// ⓔ thân rỗng dù 200 → không ghi
{ const t = lam({ than: "" });
  await assert.rejects(() => layAnh(["https://cdn.udin/v1.webp"], t), /thân rỗng/);
  assert.equal(ghi(t.nk).length, 0); }

// ⓕ ghi ra số byte khác số tải về → ĐỎ, và nói rõ đừng tin file đó
{ const t = lam({ bytes: 3, ghiBytes: 4 });
  await assert.rejects(() => layAnh(["https://cdn.udin/v1.webp"], t), /KHÔNG tin file này/); }

// ⓖ ảnh thứ hai hỏng → ảnh đầu vẫn trên đĩa, và lời báo nói ra con số đó
{ let lan = 0;
  const t = lam();
  const goiGoc = t.goi;
  t.goi = async (m, p) => { if (m === "scout.fetch" && lan++ === 1) return { data: { ok: false, status: 500 } }; return goiGoc(m, p); };
  await assert.rejects(() => layAnh(["https://cdn.udin/v1.webp", "https://cdn.udin/v2.webp"], t), /Đã lấy 1 ảnh/);
  assert.equal(ghi(t.nk).length, 1); }

// ⓗ không truyền danh sách → đọc trang, bỏ src trùng, lấy đủ
{ const t = lam({ trenTrang: ["https://cdn.udin/v1.webp", "https://cdn.udin/v1.webp", "https://cdn.udin/v2.webp"] });
  const k = await layAnh(null, t);
  assert.equal(k.daLay.length, 2, "src trùng chỉ lấy một lần");
  assert.ok(t.nk.some((g) => g.method === "scout.query")); }

// ⓘ trang chưa có ảnh nào → nói thẳng, không ghi file rỗng
{ const t = lam({ trenTrang: [] });
  await assert.rejects(() => layAnh(null, t), /Không có ảnh/);
  assert.equal(ghi(t.nk).length, 0); }

// ⓙ tên file: cắt ký tự lạ, giữ thứ tự, hai ảnh trùng tên gốc vẫn ra hai tên khác nhau
assert.equal(tenFile("https://cdn.udin/a b/v 1.webp?x=1", 1), "01-v-1.webp");
assert.notEqual(tenFile("https://cdn.udin/a/v.webp", 1), tenFile("https://cdn.udin/b/v.webp", 2));
assert.match(tenFile("https://cdn.udin/", 7), /^07-anh$/);

console.log("  · udin lay-anh: 10 khối xanh");
