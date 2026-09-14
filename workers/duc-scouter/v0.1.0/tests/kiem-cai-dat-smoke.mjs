/* Phép ghim cho `scripts/kiem-cai-dat.mjs`.
 *
 * Việc của file được ghim là NÓI ĐÚNG KHI HỎNG, nên bộ này ghim chủ yếu các nhánh hỏng: một
 * công cụ chẩn đoán chỉ xanh khi mọi thứ xanh thì chẳng chẩn đoán gì.
 *
 * Hai chốt đắt nhất:
 *   ① Bước ① phải dùng `bridge.sessions`, KHÔNG dùng `system.ping`. Bản đầu dùng ping và lượt
 *     chạy thật đầu tiên đỏ ngay bước một với `TARGET_AMBIGUOUS`, vì ping đi tới extension —
 *     tức bước sinh ra để tách *Bridge chưa chạy* khỏi *có hai ghế* lại chết vì có hai ghế.
 *   ② Công tắc ghi ĐÓNG **không phải hỏng**. Đảo chỗ này là dạy người mới rằng cài đúng nghĩa
 *     là mở sẵn đường ghi — ngược hẳn luật gói số 8.
 */
import assert from "node:assert/strict";
import { kiem } from "../scripts/kiem-cai-dat.mjs";

const GHE = [
  { instance_id: "cu000000-0000", label: "", extension_version: "0.1.0", connected_at: "2026-09-14T08:00:00.000Z" },
  { instance_id: "moi00000-1111", label: "Ghe_Moi", extension_version: "0.1.0", connected_at: "2026-09-14T16:00:00.000Z" },
];
const TAB = [
  { targetId: "T1", type: "page", url: "https://mot.trang/x" },
  { targetId: "T2", type: "page", url: "chrome://extensions/" },
];

function lam({ ghe = GHE, tab = TAB, soMethod = 24, docDuoc = true, ghiDuoc = true, ping = true } = {}) {
  const nk = [];
  const goi = async (method, p = {}, t = {}) => {
    nk.push({ method, p, ghe: t.ghe });
    if (method === "bridge.sessions") {
      if (ghe === null) throw new Error("fetch failed");
      return { sessions: ghe, count: ghe.length };
    }
    if (method === "system.ping") {
      if (!ping) throw new Error("REQUEST_TIMEOUT");
      return { scouter: "online", seed: "scouter-seed-v0.1" };
    }
    if (method === "system.capabilities") {
      return { methods: Array.from({ length: soMethod }, (_, i) => ({ name: "m" + i, read_only: i % 2 === 0 })) };
    }
    if (method === "scout.targets") return { data: { targets: tab } };
    if (method === "scout.query") {
      if (!docDuoc) throw new Error("TARGET_ALREADY_ATTACHED");
      return { data: { matchCount: 1, items: [], hasMore: false } };
    }
    if (method === "scout.hover") {
      if (!ghiDuoc) throw new Error("WRITE_BLOCKED — công tắc đường ghi đang đóng");
      return { data: { hoveredAt: { x: 1, y: 1 } } };
    }
    throw new Error("method lạ " + method);
  };
  return { nk, goi };
}
const lay = (k, dau) => k.buoc.find((b) => b.ten.startsWith(dau));

// ⓐ mọi thứ xanh — và bước ① KHÔNG được gọi `system.ping`
{
  const t = lam();
  const k = await kiem(t.goi, {});
  assert.equal(k.dat, true, JSON.stringify(k.buoc));
  assert.equal(t.nk[0].method, "bridge.sessions",
    "bước ① phải hỏi máy chủ, không hỏi extension — `system.ping` đi tới extension và chết vì hai ghế");
  /* và mọi lượt gọi có ghế đều phải dán đúng ghế NỐI GẦN NHẤT */
  const coGhe = t.nk.filter((g) => g.ghe);
  assert.ok(coGhe.length > 0 && coGhe.every((g) => g.ghe === "moi00000-1111"),
    "phải dán ghế nối gần nhất; chọn nhầm là đo phải bản cũ sau một lượt nạp lại");
}

// ⓑ Bridge không trả lời → dừng NGAY, không chạy tiếp cho có
{
  const t = lam({ ghe: null });
  const k = await kiem(t.goi, {});
  assert.equal(k.dat, false);
  assert.equal(k.buoc.length, 1, "bước sau không có nghĩa gì khi bước trước đã gãy");
  assert.match(k.buoc[0].lamGi, /Bridge chưa chạy/);
}

// ⓒ không ghế nào → nói đúng việc phải làm, và không đụng tới trang
{
  const t = lam({ ghe: [] });
  const k = await kiem(t.goi, {});
  assert.equal(k.dat, false);
  assert.match(lay(k, "②").lamGi, /Load unpacked/);
  assert.equal(t.nk.filter((g) => g.method === "scout.targets").length, 0);
}

// ⓓ ghế có tên trong danh sách mà không đáp → tách được khỏi ca "không ghế nào"
{
  const t = lam({ ping: false });
  const k = await kiem(t.goi, {});
  assert.equal(k.dat, false);
  assert.match(lay(k, "②").noi, /REQUEST_TIMEOUT/);
  assert.match(lay(k, "②").lamGi, /service worker/);
}

// ⓔ số method lệch → chỉ ra đúng nguyên nhân: Chrome đang chạy BẢN KHÁC
{
  const t = lam({ soMethod: 22 });
  const k = await kiem(t.goi, {});
  assert.equal(k.dat, false);
  assert.equal(lay(k, "③").dat, false);
  assert.match(lay(k, "③").lamGi, /bản KHÁC/);
  /* lệch từ vựng KHÔNG được chặn các bước sau — người mới cần thấy cả bức tranh */
  assert.ok(lay(k, "④"), "vẫn phải chạy tiếp để báo đủ");
}

// ⓕ không tab http(s) nào → hỏng, và nói rõ `file:`/`chrome://` không dò được
{
  const t = lam({ tab: [{ targetId: "T2", type: "page", url: "chrome://extensions/" }] });
  const k = await kiem(t.goi, {});
  assert.equal(lay(k, "④").dat, false);
  assert.match(lay(k, "④").lamGi, /chrome:/);
  assert.equal(lay(k, "⑤").dat, false, "không có tab thì không thể khai là đọc được");
  assert.equal(t.nk.filter((g) => g.method === "scout.query").length, 0);
}

// ⓖ gắn debugger không được → đoán đúng thủ phạm thường gặp
{
  const t = lam({ docDuoc: false });
  const k = await kiem(t.goi, {});
  assert.equal(lay(k, "⑤").dat, false);
  assert.match(lay(k, "⑤").lamGi, /DevTools/);
  assert.equal(t.nk.filter((g) => g.method === "scout.hover").length, 0, "đọc còn không được thì đừng tiêu lượt ghi");
}

// ⓗ CÔNG TẮC GHI ĐÓNG KHÔNG PHẢI HỎNG — cả bản cài vẫn ĐẠT
{
  const t = lam({ ghiDuoc: false });
  const k = await kiem(t.goi, {});
  assert.equal(k.dat, true, "đóng là MẶC ĐỊNH và là một lớp bảo vệ — khai nó thành hỏng là dạy ngược luật gói số 8");
  assert.match(lay(k, "⑥").noi, /ĐANG ĐÓNG/);
}

// ⓘ --khong-thu-ghi → KHÔNG tiêu lượt ghi nào
{
  const t = lam();
  const k = await kiem(t.goi, { khongThuGhi: true });
  assert.equal(t.nk.filter((g) => g.method === "scout.hover").length, 0);
  assert.match(lay(k, "⑥").noi, /chưa thử/);
}

// ⓙ nhiều ghế → phải CẢNH BÁO, vì các bước trên chỉ nói về một ghế
{
  const nhieu = await kiem(lam().goi, {});
  assert.ok(lay(nhieu, "⚠"), "hai ghế mà im lặng là để người đọc tưởng báo cáo nói về cả hai");
  const mot = await kiem(lam({ ghe: [GHE[1]] }).goi, {});
  assert.equal(lay(mot, "⚠"), undefined, "một ghế thì đừng doạ");
}

console.log("  · kiem-cai-dat: 10 khối xanh");
