#!/usr/bin/env node
/* BENCHMARK CHI PHÍ CONTEXT — Browser Context Burn, trên Vizcom thật.
 *
 * ─── CÂU HỎI ────────────────────────────────────────────────────────────────
 * Cùng MỘT câu hỏi hẹp, ba cách nhìn trình duyệt tốn chênh nhau bao nhiêu chữ đi vào context
 * của AI? Và cách rẻ hơn có mất bằng chứng nào không?
 *
 * ─── CHỖ DỄ TỰ LỪA NHẤT, NÓI TRƯỚC ──────────────────────────────────────────
 * `bytes_tho` (payload trình duyệt → Node) và `chu_cho_ai` (chữ → context model) là HAI con số.
 * Rút gọn ở Node **không** làm giảm `bytes_tho` một byte nào — nó chỉ giảm cái thứ hai. Nên một
 * báo cáo trộn hai con số sẽ hoặc khoe hờ, hoặc bỏ mất đúng chỗ tiết kiệm thật. Bộ đo này in
 * tách, luôn luôn.
 *
 * ─── READ-ONLY, ĐÚNG YÊU CẦU ĐỀ BÀI ────────────────────────────────────────
 * Mọi lượt gọi đi qua `chan` — hàm đó NÉM nếu gặp method thuộc từ vựng GHI. Bộ đo **không tự
 * chuyển trang**: đề bài nói benchmark chỉ đọc. Ca nào cần một bề mặt khác thì nó khai
 * `KHONG_CO_TREN_BE_MAT_NAY` và đi tiếp, chứ không điều hướng hộ.
 *
 * Chạy:  node workers/duc-scouter/pilots/vizcom-anhducds/do-bcb.mjs
 * Muốn đo bề mặt khác: mở bề mặt đó bằng TAY rồi chạy lại đúng lệnh trên.
 */
import { goi as goiThat } from "../trang-thu-cham/scripts/goi-bridge.mjs";
import { taoCanChiPhi, tiLeHuuIch } from "../../../_shared/goi-bridge/do-chi-phi.mjs";
import { TU_VUNG_GHI } from "../../../_shared/adapters/hop-dong.mjs";
import { VIZCOM } from "../../../_shared/adapters/vizcom.mjs";

const chan = async (m, p, o) => {
  if (TU_VUNG_GHI.includes(m)) throw new Error(`CHẶN: benchmark READ-ONLY, từ chối ${m}`);
  return goiThat(m, p, o);
};

/* ── Tìm bề mặt đang sống. Giải lại từ đầu, không dùng lại `target_id` nào (bất biến 18/09). ── */
const dau = taoCanChiPhi(chan, { viec: "tim-be-mat" });
const ses = await dau.goi("bridge.sessions", {});
let uv = null;
for (const s of ses.sessions || []) {
  const t = await dau.goi("scout.targets", {}, { ghe: s.instance_id });
  for (const y of t.data.targets.filter((x) => x.type === "page" && x.url.startsWith(VIZCOM.origin))) {
    if (!uv) uv = { ghe: s.instance_id, target_id: y.targetId, url: y.url, tieu_de: y.title };
  }
}
if (!uv) { console.error("Không có target Vizcom nào đang mở."); process.exit(2); }
const beMat = uv.url.includes("/drawing/") ? "edit-anh"
  : uv.url.includes("/workbench/") ? "workbench" : "trang-me";
console.log(`## BỀ MẶT ĐANG SỐNG: ${beMat}`);
console.log(`   ${uv.url}\n   target ${uv.target_id} · ghế ${uv.ghe.slice(0, 8)}…`);
console.log(`   (phí tìm bề mặt: ${dau.tomTat().luot_goi} lượt · ${dau.tomTat().bcb_tho} byte thô — tính riêng, không vào ca nào)\n`);

/* ── BA CÂU HỎI, mỗi câu hai cách nhìn. `dung` = chữ THỰC SỰ dùng để ra kết luận. ─────────── */

/** MODE A — đọc rộng: kiểm kê rồi đổ NGUYÊN cho AI tự tìm. Đây là đường cơ sở. */
const modeA = async (ten, locDung) => {
  const c = taoCanChiPhi(chan, { viec: `A/${ten}` });
  await c.goi("scout.page", { target_id: uv.target_id, limit: 200 }, { ghe: uv.ghe });
  const a = await c.goi("scout.a11y", { target_id: uv.target_id, limit: 1500 }, { ghe: uv.ghe });
  const pg = c.so.find((x) => x.method === "scout.page");
  /* Mode A đưa cho AI **cả hai phong bì**, nguyên dạng — đó chính là nghĩa của "đọc rộng".
   * Không được thay bằng một bản đã lọc: bản đã lọc là Mode B đội tên Mode A. */
  const chu = JSON.stringify(a.data) + JSON.stringify({ page: pg?.so_node });
  c.khaiChoAi(chu);
  const dung = locDung((a.data.nodes || []).map((n) => n.name || ""));
  return { can: c.tomTat(), dung, chu_dung: JSON.stringify(dung).length, truncated: a.data.truncated };
};

/** MODE B — vị ngữ ở Node: cùng lượt gọi, nhưng chỉ CÂU TRẢ LỜI đi vào context. */
const modeB = async (ten, locDung) => {
  const c = taoCanChiPhi(chan, { viec: `B/${ten}` });
  const a = await c.goi("scout.a11y", { target_id: uv.target_id, limit: 1500 }, { ghe: uv.ghe });
  const dung = locDung((a.data.nodes || []).map((n) => n.name || ""));
  const chu = JSON.stringify({ ket_qua: dung, tong_node: a.data.total_nodes, truncated: a.data.truncated });
  c.khaiChoAi(chu);
  return { can: c.tomTat(), dung, chu_dung: chu.length, truncated: a.data.truncated };
};

/** MODE D — ảnh Đức gửi làm TIỀN ĐỀ THỊ GIÁC, rồi một lượt hỏi đúng selector để XÁC NHẬN.
 *  Chỉ chạy được khi ảnh đã chỉ ra một neo NGỮ NGHĨA. Không có neo thì trả `null` và nói ra —
 *  ảnh thu hẹp không gian tìm, nó không tự sinh ra một selector ổn định. */
const modeD = async (ten, selector) => {
  if (!selector) return null;
  const c = taoCanChiPhi(chan, { viec: `D/${ten}` });
  const q = await c.goi("scout.query", { selector, target_id: uv.target_id, limit: 10 }, { ghe: uv.ghe });
  const chu = JSON.stringify({ selector, khop: q.data.matchCount });
  c.khaiChoAi(chu);
  return { can: c.tomTat(), dung: { selector, khop: q.data.matchCount }, chu_dung: chu.length, truncated: null };
};

const CA = [
  { ten: "A-email", hoi: `trang có phơi "${VIZCOM.danh_tinh.a11y_chua}" không`,
    loc: (ten) => ten.filter((x) => x.includes(VIZCOM.danh_tinh.a11y_chua)),
    /* Ảnh CHỈ RA chỗ email nằm (khối người dùng góc dưới trái), nhưng không chỉ ra một selector
     * ổn định cho nó — và đoán selector là thứ luật gói cấm. Nên ca này KHÔNG có Mode D. */
    selector: null },
  { ten: "B-o-prompt", hoi: "control nào nhận prompt",
    loc: (ten) => ten.filter((x) => /what are you creating/i.test(x)),
    selector: VIZCOM.be_mat_workbench.o_prompt },
  { ten: "C-render", hoi: "control nào là Render/Generate",
    loc: (ten) => [...new Set(ten.filter((x) => /^(render|generate)$/i.test(x.trim())))],
    /* Ảnh thấy rõ nút `Generate` xanh, nhưng quét DOM 18/09: nút đó **chỉ có hash
     * styled-components**, không có `data-testid`/`aria-label`. Hợp đồng luật ⑸ cấm neo vào
     * hash. Nên ảnh biết nó ở đâu mà dây vẫn không có đường gọi hợp lệ — xem mục THIẾU. */
    selector: null }
];

const bang = [];
for (const ca of CA) {
  console.log(`\n## CA ${ca.ten} — "${ca.hoi}"`);
  const a = await modeA(ca.ten, ca.loc);
  const b = await modeB(ca.ten, ca.loc);
  const d = await modeD(ca.ten, ca.selector);
  const giai = (x) => x.dung.length ? "GIẢI ĐƯỢC" : "KHÔNG_CÓ_TRÊN_BỀ_MẶT_NÀY";
  for (const [ten, x] of [["A đọc rộng", a], ["B vị ngữ Node", b], ["D ảnh + hỏi đúng chỗ", d]]) {
    if (!x) { console.log(`   ${ten.padEnd(22)} — KHÔNG CHẠY: ảnh không chỉ ra neo ngữ nghĩa nào`); continue; }
    const u = tiLeHuuIch(x.chu_dung, x.can.bcb_model);
    console.log(`   ${ten.padEnd(22)} ${String(x.can.luot_goi)} lượt · thô ${String(x.can.bcb_tho).padStart(7)}B · ` +
      `CHO AI ${String(x.can.bcb_model).padStart(7)} chữ · ${String(x.can.ms_tong).padStart(4)}ms · ` +
      `hữu ích ${u.nhan} (${x.chu_dung}/${x.can.bcb_model}) · ${giai(x)}`);
    bang.push({ ca: ca.ten, mode: ten, ...x.can, chu_dung: x.chu_dung, huu_ich: u.nhan, ket: giai(x), truncated: x.truncated });
  }
  const giam = a.can.bcb_model ? (1 - b.can.bcb_model / a.can.bcb_model) * 100 : null;
  console.log(`   → B giảm ${giam === null ? "?" : giam.toFixed(1)}% chữ-cho-AI so với A. ` +
    `Thô thì ${b.can.bcb_tho <= a.can.bcb_tho ? "giảm" : "TĂNG"} ${Math.abs(a.can.bcb_tho - b.can.bcb_tho)}B.`);
  console.log(`   → cùng kết luận?  A=${JSON.stringify(a.dung).slice(0, 70)}  B=${JSON.stringify(b.dung).slice(0, 70)}`);
}

console.log("\n## TỔNG — token thật: UNKNOWN (bộ đo này không đọc được usage của runtime, và không bịa)");
const tong = (k) => bang.filter((x) => x.mode.startsWith(k)).reduce((t, x) => t + x.bcb_model, 0);
console.log(`   BCB_MODEL toàn benchmark: A ${tong("A")} chữ · B ${tong("B")} chữ · D ${tong("D")} chữ`);
console.log(`   BCB_RAW   toàn benchmark: A ${bang.filter((x) => x.mode.startsWith("A")).reduce((t, x) => t + x.bcb_tho, 0)}B · ` +
  `B ${bang.filter((x) => x.mode.startsWith("B")).reduce((t, x) => t + x.bcb_tho, 0)}B`);
