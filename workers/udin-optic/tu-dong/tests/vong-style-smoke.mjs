/* Phép ghim cho `R1` — vòng style: ảnh lượt trước → đính kèm → prompt mới → ảnh mới về đĩa.
 *
 * Ba chốt của bộ này, cả ba đều là chốt PHÂN BIỆT NHÁNH:
 *   ⑴ *"đã đính kèm"* đo bằng **đếm lại trên trang**, không bằng lời báo của `scout.upload`. Mọi
 *      đường vào lượt tải lên đều để lại **0 ảnh đã đếm lại**, nên phép kiểm là một con số tuyệt
 *      đối chứ không phải một hiệu số. ⓑ3 + ⓑ4 là đúng một cặp phân biệt hai nhánh: cùng
 *      trang giả, cùng cờ, khác đúng một biến.
 *   ⑵ mục `Image` tìm theo **nhãn**. Trang giả ⓒ đặt nó ở vị trí **3**, nên một `:nth-of-type(2)`
 *      gõ cứng sẽ đỏ ở đây thay vì âm thầm bấm sang mục khác trên máy Đức.
 *   ⑶ trang đã có ảnh đính kèm sẵn thì **TỪ CHỐI**, không gỡ lặng lẽ — cái đang nằm đó có thể là
 *      ảnh Đức tự đưa vào, và lượt ngay sau là lượt tiêu tiền.
 */
import assert from "node:assert/strict";
import { vongStyle, chonAnhCu, dinhKem, SEL } from "../vong-style.mjs";
import { SEL as SEL_GUI } from "../gui-prompt.mjs";

const VUNG_GHI = "C:/vung-ghi-gia";

/* Trang giả. `nhan` là nhãn các mục trong bảng `+`, theo đúng thứ tự trang vẽ ra.
 * `pillDau` là số ẢNH đang đính kèm (đo thật: đúng một `.agent-context-pill-thumb` mỗi ảnh). */
function lam({ nhan = ["Project", "Image", "Video"], pillDau = 0, pillThem = 1,
               bangMoSan = false, bamKhongMo = false, goKhongAn = false } = {}) {
  const nk = [];
  const trang = {
    chu: "", chay: false, vong: 0, pill: pillDau, bangMo: bangMoSan,
    anh: ["https://cdn.udin/cu-1.webp"],
  };
  const q = (n, items = [], hasMore = false) => ({ data: { matchCount: n, items, hasMore } });
  const viTriMuc = (selector) => {
    const m = selector.match(/^\.agent-add-dropdown button\.agent-add-option:nth-of-type\((\d+)\)$/);
    return m ? Number(m[1]) : 0;
  };

  const goi = async (method, p) => {
    nk.push({ method, p });
    if (method === "host.capabilities") return { write_root: VUNG_GHI };
    if (method === "scout.query") {
      if (p.selector === ".concurrency-overlay") return q(0);
      if (p.selector === SEL.bang) return q(trang.bangMo ? 1 : 0);
      /* Một nút gỡ cho mỗi ảnh — đo thật 16/09: thumb 1 ↔ nút gỡ 1. */
      if (p.selector === SEL.pill || p.selector === SEL.goPill) return q(trang.pill);
      { const i = viTriMuc(p.selector); if (i) return q(trang.bangMo && i <= nhan.length ? 1 : 0); }
      if (p.selector === SEL_GUI.anhKetQua) return q(trang.anh.length, trang.anh.map((src) => ({ attributes: { src } })), false);
      { const m = p.selector.match(/^img\.batch-grid-image\[src\^="(.*)"\]$/);
        if (m) { const h = trang.anh.filter((s) => s.startsWith(m[1]));
          return q(h.length, h.map((src) => ({ attributes: { src } })), false); } }
      if (p.selector === SEL_GUI.dangChay) {
        if (trang.chay && trang.vong-- <= 0) { trang.chay = false; trang.anh.push("https://cdn.udin/moi-1.webp"); }
        return q(trang.chay ? 1 : 0);
      }
      if (p.selector === SEL_GUI.nutSend) return trang.chay ? q(0) : q(1, [{ attributes: trang.chu ? {} : { disabled: "" } }]);
    }
    if (method === "scout.text") {
      const i = viTriMuc(p.selector);
      if (!i || !trang.bangMo || i > nhan.length) throw new Error("SELECTOR_AMBIGUOUS " + p.selector);
      return { data: { selector: p.selector, matchCount: 1, text: nhan[i - 1], chars: nhan[i - 1].length, truncated: false } };
    }
    if (method === "scout.upload") { trang.pill += pillThem; return { action: "input.upload", data: { mo_bang: p.mo_bang, path: p.path, files: 1 } }; }
    if (method === "scout.type") { trang.chu += p.text; return { data: { typed: p.text.length } }; }
    if (method === "scout.click") {
      if (p.selector === SEL.nutThem) { if (!bamKhongMo) trang.bangMo = true; return { data: {} }; }
      if (p.selector === SEL.goPill) { if (!goKhongAn) trang.pill = Math.max(0, trang.pill - 1); return { data: {} }; }
      trang.chay = true; trang.vong = 1; trang.chu = "";
      return { data: {} };
    }
    if (method === "scout.wait") {
      if (p.selector === SEL_GUI.dangChay) return { data: { satisfied: p.state === "present" ? trang.chay : !trang.chay } };
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
  const chay = async () => JSON.stringify({ nguon: "moi-1.webp", ra: "moi-1.jpg", byteNguon: 100, byteRa: 90, rong: 8, cao: 8 });
  return { nk, trang, goi, chay, laJpeg: () => true, co: () => null, timTab: async () => "TAB",
           ngu: async () => {}, buocMs: 0, soNhip: 3, dau: "2026-09-16T00:00:00.000Z", anh: "udin-optic/cu/01-a.jpg" };
}

const soLan = (nk, method) => nk.filter((g) => g.method === method).length;
const bam = (nk, selector) => nk.filter((g) => g.method === "scout.click" && g.p.selector === selector).length;

// ⓐ sáu chặng đúng thứ tự, và ĐÍNH KÈM xong mới tới lượt tiêu tiền
{ const t = lam();
  const k = await vongStyle("in the style of a woodcut", t);
  assert.deepEqual(k.chang.map((c) => c.chang), ["W1", "CHON", "DINH-KEM", "W2", "W3", "JPG"]);
  const iUp = t.nk.findIndex((g) => g.method === "scout.upload");
  const iSend = t.nk.findIndex((g) => g.method === "scout.click" && g.p.selector === SEL_GUI.nutSend);
  assert.ok(iUp >= 0 && iSend > iUp, "phải đính kèm TRƯỚC khi bấm Send — đảo lại là trả tiền cho lượt không có ảnh");
  assert.equal(soLan(t.nk, "file.write"), 1); }

// ⓑ tải lên xong mà trang KHÔNG có ảnh đính kèm nào → ĐỎ, và tuyệt đối chưa gõ chữ, chưa bấm Send, chưa ghi tệp nào
{ const t = lam({ pillThem: 0 });
  await assert.rejects(() => vongStyle("a brass lantern", t), /VẪN không có ảnh đính kèm nào/);
  assert.equal(soLan(t.nk, "scout.type"), 0, "chưa nhận ảnh thì không được gõ prompt");
  assert.equal(bam(t.nk, SEL_GUI.nutSend), 0);
  assert.equal(soLan(t.nk, "file.write"), 0); }

// ⓑ2 trang ĐÃ có ảnh đính kèm sẵn → TỪ CHỐI, không gỡ lén, không tải lên
{ const t = lam({ pillDau: 1 });
  await assert.rejects(() => dinhKem("udin-optic/cu/01-a.jpg", t), /--xoa-pill-cu/);
  assert.equal(bam(t.nk, SEL.goPill), 0, "chưa xin thì không được gỡ ảnh của Đức");
  assert.equal(soLan(t.nk, "scout.upload"), 0); }

// ⓑ3 xin gỡ → gỡ sạch TRƯỚC rồi mới tải lên, và mốc đếm là 0 chứ không phải 1
{ const t = lam({ pillDau: 1 });
  const k = await dinhKem("udin-optic/cu/01-a.jpg", { ...t, xoaPillCu: true });
  assert.deepEqual([k.coSan, k.soAnh], [1, 1], "có sẵn 1 → gỡ sạch → đính kèm lại 1");
  assert.equal(bam(t.nk, SEL.goPill), 1);
  assert.ok(t.nk.findIndex((g) => g.method === "scout.click" && g.p.selector === SEL.goPill)
          < t.nk.findIndex((g) => g.method === "scout.upload"), "gỡ xong mới tải lên"); }

// ⓑ4 CÙNG trang ấy, cùng `xoaPillCu`, chỉ khác: lượt tải lên không tới trang → ĐỎ.
//    Cặp ⓑ3+ⓑ4 là chỗ một phép kiểm chỉ nhìn `ok` của lệnh tải lên sẽ xanh ở cả hai nhánh.
{ const t = lam({ pillDau: 1, pillThem: 0 });
  await assert.rejects(() => dinhKem("udin-optic/cu/01-a.jpg", { ...t, xoaPillCu: true }), /VẪN không có ảnh đính kèm nào/); }

// ⓑ5 nhiều nút gỡ cùng lúc → KHÔNG bấm bừa cái đầu tiên
{ const t = lam({ pillDau: 2 });
  await assert.rejects(() => dinhKem("udin-optic/cu/01-a.jpg", { ...t, xoaPillCu: true }), /2 nút gỡ đính kèm/);
  assert.equal(soLan(t.nk, "scout.upload"), 0); }

// ⓑ6 bấm gỡ mà trang không gỡ → ĐỎ, không đi tải lên chồng lên ảnh cũ (`S-22`)
{ const t = lam({ pillDau: 1, goKhongAn: true });
  await assert.rejects(() => dinhKem("udin-optic/cu/01-a.jpg", { ...t, xoaPillCu: true }), /vẫn còn 1 ảnh đính kèm/);
  assert.equal(soLan(t.nk, "scout.upload"), 0); }

// ⓒ mục `Image` ở vị trí 3 → phải bấm đúng vị trí 3 (gõ cứng `nth-of-type(2)` đỏ ở đây)
{ const t = lam({ nhan: ["Attach", "Project", "Image"] });
  const k = await dinhKem("udin-optic/cu/01-a.jpg", t);
  assert.equal(k.viTri, 3);
  assert.equal(t.nk.find((g) => g.method === "scout.upload").p.mo_bang, `${SEL.muc}:nth-of-type(3)`); }

// ⓓ menu đổi, không còn nhãn nào là `Image` → ĐỎ, kể ra đã thấy gì, và KHÔNG tải lên
{ const t = lam({ nhan: ["Attach", "Project"] });
  await assert.rejects(() => dinhKem("udin-optic/cu/01-a.jpg", t), /'Attach', 'Project'/);
  assert.equal(soLan(t.nk, "scout.upload"), 0); }

// ⓔ bảng đã mở sẵn → không bấm nút '+' lần nào
{ const t = lam({ bangMoSan: true });
  await dinhKem("udin-optic/cu/01-a.jpg", t);
  assert.equal(bam(t.nk, SEL.nutThem), 0); }

// ⓔ2 bấm nút '+' mà bảng không mở → ĐỎ ngay, không đi đọc nhãn của một bảng không có (`S-22`)
{ const t = lam({ bamKhongMo: true });
  await assert.rejects(() => dinhKem("udin-optic/cu/01-a.jpg", t), /bảng chọn không mở/);
  assert.equal(soLan(t.nk, "scout.text"), 0, "bảng chưa mở thì không có nhãn nào để đọc");
  assert.equal(soLan(t.nk, "scout.upload"), 0); }

// ⓕ chọn ảnh: lượt chạy MỚI NHẤT có ảnh, ưu tiên `.jpg`, bỏ qua lượt rỗng
{ const dia = {
    [`${VUNG_GHI}/udin-optic/xe-dien-2026`]: [
      { ten: "2026-09-14T01-00-00-000Z", laThuMuc: true },
      { ten: "2026-09-16T02-12-00-261Z", laThuMuc: true },
      { ten: "2026-09-16T09-00-00-000Z", laThuMuc: true },
    ],
    [`${VUNG_GHI}/udin-optic/xe-dien-2026/2026-09-16T09-00-00-000Z`]: [],
    [`${VUNG_GHI}/udin-optic/xe-dien-2026/2026-09-16T02-12-00-261Z`]: [
      { ten: "01-batch-a.webp", laThuMuc: false }, { ten: "02-batch-b.jpg", laThuMuc: false },
      { ten: "ghi-chu.txt", laThuMuc: false },
    ],
    [`${VUNG_GHI}/udin-optic/xe-dien-2026/2026-09-14T01-00-00-000Z`]: [{ ten: "01-cu.jpg", laThuMuc: false }],
  };
  const doc = (d) => { if (!(d in dia)) throw new Error("ENOENT " + d); return dia[d]; };
  assert.equal(
    chonAnhCu({ vungGhi: VUNG_GHI, duAn: "xe-dien-2026", doc }),
    "udin-optic/xe-dien-2026/2026-09-16T02-12-00-261Z/02-batch-b.jpg",
    "lượt mới nhất CÓ ảnh, và trong đó ưu tiên JPG",
  ); }

// ⓖ không có `--du-an` → chỉ nhận thư mục mang nhãn lượt chạy, bỏ qua thư mục project
{ const dia = {
    [`${VUNG_GHI}/udin-optic`]: [
      { ten: "xe-dien-2026", laThuMuc: true },
      { ten: "2026-09-15T00-00-00-000Z", laThuMuc: true },
    ],
    [`${VUNG_GHI}/udin-optic/2026-09-15T00-00-00-000Z`]: [{ ten: "01-a.jpg", laThuMuc: false }],
  };
  const doc = (d) => { if (!(d in dia)) throw new Error("ENOENT " + d); return dia[d]; };
  assert.equal(chonAnhCu({ vungGhi: VUNG_GHI, doc }), "udin-optic/2026-09-15T00-00-00-000Z/01-a.jpg"); }

// ⓖ2 không lượt nào còn ảnh → ĐỎ kèm lối ra, không bao giờ trả một đường đoán.
//    Và con số trong câu ấy phải ĐẾM ĐÚNG lượt chạy: thư mục project **không phải** một lượt
//    chạy, đếm cả nó vào là đưa Đức một con số sai ngay trong lời từ chối.
{ const dia = {
    [`${VUNG_GHI}/udin-optic`]: [
      { ten: "xe-dien-2026", laThuMuc: true },
      { ten: "2026-09-15T00-00-00-000Z", laThuMuc: true },
    ],
    [`${VUNG_GHI}/udin-optic/xe-dien-2026`]: [{ ten: "2026-09-16T00-00-00-000Z", laThuMuc: true }],
    [`${VUNG_GHI}/udin-optic/2026-09-15T00-00-00-000Z`]: [],
  };
  assert.throws(
    () => chonAnhCu({ vungGhi: VUNG_GHI, doc: (d) => dia[d] ?? [] }),
    /'udin-optic' có 1 lượt chạy nhưng không lượt nào còn ảnh[\s\S]*--anh/,
  ); }

// ⓗ thiếu prompt → không đụng tới trang (mỗi lượt chạy thật phải có chữ mới)
{ const t = lam(); await assert.rejects(() => vongStyle("  ", t), /chữ MỚI/); assert.equal(t.nk.length, 0); }

// ⓘ chỉ thẳng `--anh` → không đọc đĩa lần nào, và đính kèm ĐÚNG đường ấy
{ const t = lam();
  const k = await vongStyle("a pewter mug", { ...t, anh: "udin-optic/tay/01-x.jpg",
    doc: () => { throw new Error("không được đọc đĩa khi đã chỉ thẳng --anh"); } });
  assert.equal(k.anhNguon, "udin-optic/tay/01-x.jpg");
  assert.equal(t.nk.find((g) => g.method === "scout.upload").p.path, "udin-optic/tay/01-x.jpg");
  assert.equal(k.chang.find((c) => c.chang === "CHON").tuDong, false); }

console.log("vong-style-smoke: OK");
