#!/usr/bin/env node
/* BENCHMARK WORKBENCH — sáu câu hỏi đúng use case của Đức, ba cách nhìn.
 *
 * ─── PHÁT HIỆN QUYẾT ĐỊNH CẢ FILE NÀY, NÓI TRƯỚC ────────────────────────────
 * Graph của Workbench **không nằm trong DOM**. Đo 18/09 trên `/workbench/5c805df7…`:
 *
 *     img 0 · [style*=background-image] 0 · picture 0 · video 0 · [role=img] 0
 *     canvas 1  ← có thuộc tính `data-engine`
 *     data-node-id 0 · data-id 0 · data-block-id 0 · draggable 0
 *     scout.view: document 2048×1017 == viewport  ⇒ graph KHÔNG nở ra DOM
 *
 * Nên **ảnh gốc, ảnh kết quả và các đường nối đều được vẽ trong MỘT `<canvas>`**. Thứ duy nhất
 * có mặt trong DOM là lớp phủ của khối prompt. Hệ quả cho cả nghiên cứu: với ảnh gốc/ảnh ra,
 * `scout.shot` **không phải một cách tối ưu — nó là giác quan DUY NHẤT**.
 *
 * Vì thế file này KHÔNG cố dựng graph từ DOM. Nó đo xem từng câu hỏi trả lời được ở đâu, và
 * biểu diễn NHỎ NHẤT đủ dùng là gì.
 *
 * READ-ONLY: mọi lượt gọi qua `chan`, ném nếu gặp method GHI.
 * Chạy:  node workers/duc-scouter/pilots/vizcom-anhducds/do-bcb-workbench.mjs
 */
import { goi as goiThat } from "../trang-thu-cham/scripts/goi-bridge.mjs";
import { taoCanChiPhi, tiLeHuuIch } from "../../../_shared/goi-bridge/do-chi-phi.mjs";
import { TU_VUNG_GHI } from "../../../_shared/adapters/hop-dong.mjs";
import { VIZCOM } from "../../../_shared/adapters/vizcom.mjs";

const chan = async (m, p, o) => {
  if (TU_VUNG_GHI.includes(m)) throw new Error(`CHẶN: benchmark READ-ONLY, từ chối ${m}`);
  return goiThat(m, p, o);
};

const tim = taoCanChiPhi(chan, { viec: "tim-workbench" });
const ses = await tim.goi("bridge.sessions", {});
let uv = null;
for (const s of ses.sessions || []) {
  let t; try { t = await tim.goi("scout.targets", {}, { ghe: s.instance_id }); } catch { continue; }
  for (const y of t.data.targets.filter((x) => x.type === "page" && x.url.includes("/workbench/"))) {
    if (!uv) uv = { ghe: s.instance_id, target_id: y.targetId, url: y.url, tieu_de: y.title };
  }
}
if (!uv) { console.error("Không có target /workbench/ nào đang mở. Mở một tệp Vizcom rồi chạy lại."); process.exit(2); }
console.log(`## WORKBENCH: ${uv.tieu_de}`);
console.log(`   ${uv.url.split("?")[0]}`);
console.log(`   ghế ${uv.ghe.slice(0, 8)}… · target ${uv.target_id}`);
console.log(`   phí tìm: ${tim.tomTat().luot_goi} lượt · ${tim.tomTat().bcb_tho} B thô\n`);

/* ── MODE A: đọc rộng một lần, rồi TRẢ LỜI CẢ SÁU CÂU từ cùng đống dữ liệu đó. ─────────────
 * Đo thế mới công bằng: một agent đọc rộng không đọc lại 6 lần, nó đọc một lần rồi suy. Chia
 * chi phí cho 6 câu là cách duy nhất không làm Mode A trông tệ hơn thực tế. */
const A = taoCanChiPhi(chan, { viec: "A-doc-rong" });
const pgA = await A.goi("scout.page", { target_id: uv.target_id, limit: 200 }, { ghe: uv.ghe });
const axA = await A.goi("scout.a11y", { target_id: uv.target_id, limit: 1500 }, { ghe: uv.ghe });
A.khaiChoAi(JSON.stringify(axA.data) + JSON.stringify(pgA.data));
const tt = A.tomTat();
console.log(`## MODE A — đọc rộng: ${tt.luot_goi} lượt · ${tt.bcb_tho} B thô · **${tt.bcb_model} chữ cho AI** · ${tt.ms_tong}ms`);
console.log(`   a11y total=${axA.data.total_nodes} returned=${axA.data.returned} truncated=${axA.data.truncated} · page ${pgA.data.elements.total} phần tử`);

/* ── MODE C: vị ngữ ở Node — rút cùng đống dữ liệu đó thành BIỂU DIỄN GRAPH nhỏ nhất. ────── */
const nodes = axA.data.nodes || [];
const ten = (r) => nodes.filter((n) => new RegExp(`^${r}$`, "i").test(n.role || ""));
const oPrompt = nodes.filter((n) => /^textbox$/i.test(n.role || "") && n.name === "What are you creating?");
const nutGenerate = ten("button").filter((n) => n.name === "Generate");
const bieuDien = {
  be_mat: "workbench",
  chi_trong_canvas: true,
  khoi_prompt: oPrompt.map((n, i) => ({
    i,
    prompt: n.value ?? "",
    nut_generate: nutGenerate[i] ? `a11y:button[name=Generate]#${i}` : null,
    selector_gõ: `${VIZCOM.be_mat_workbench.o_prompt}  (khớp ${oPrompt.length}, cần chỉ số)`
  })),
  anh_goc: "KHÔNG_CÓ_TRONG_DOM — vẽ trong canvas",
  anh_ra: "KHÔNG_CÓ_TRONG_DOM — vẽ trong canvas",
  canh_noi: "KHÔNG_CÓ_TRONG_DOM — vẽ trong canvas",
  giac_quan_duy_nhat_cho_ba_dong_tren: "scout.shot"
};
const C = taoCanChiPhi(chan, { viec: "C-vi-ngu-Node" });
const axC = await C.goi("scout.a11y", { target_id: uv.target_id, limit: 1500 }, { ghe: uv.ghe });
const chuC = C.khaiChoAi(JSON.stringify(bieuDien));
const ttC = C.tomTat();
console.log(`\n## MODE C — vị ngữ Node: ${ttC.luot_goi} lượt · ${ttC.bcb_tho} B thô · **${ttC.bcb_model} chữ cho AI** · ${ttC.ms_tong}ms`);
console.log(`   ${chuC}`);

/* ── MODE B: ảnh làm tiền đề rồi hỏi đúng MỘT selector để xác nhận. ───────────────────────── */
const Bm = taoCanChiPhi(chan, { viec: "B-anh-truoc" });
const qB = await Bm.goi("scout.query", { selector: VIZCOM.be_mat_workbench.o_prompt, target_id: uv.target_id, limit: 10 }, { ghe: uv.ghe });
Bm.khaiChoAi(JSON.stringify({ selector: VIZCOM.be_mat_workbench.o_prompt, khop: qB.data.matchCount }));
const ttB = Bm.tomTat();
console.log(`\n## MODE B — ảnh + hỏi đúng chỗ: ${ttB.luot_goi} lượt · ${ttB.bcb_tho} B thô · **${ttB.bcb_model} chữ cho AI** · ${ttB.ms_tong}ms`);

/* ── SÁU CÂU HỎI: trả lời được ở đâu, và bằng bằng chứng gì. ──────────────────────────────── */
console.log("\n## SÁU CÂU HỎI — trạng thái bằng chứng");
const CAU = [
  ["Q1 đâu là khối ảnh GỐC", ten("image").length && ten("image").every((n) => !n.name)
    ? `VISUAL-ONLY — ${ten("image").length} node role=image, **0 cái có tên**; và \`img\`/\`background-image\` đều = 0 nên đây là icon svg, không phải tác phẩm`
    : "KHÔNG RÕ"],
  ["Q2 đâu là khối prompt/render", `CONFIRMED — ${oPrompt.length} khối, neo \`${VIZCOM.be_mat_workbench.o_prompt}\` (khớp ${qB.data.matchCount})`],
  ["Q3 prompt viết gì", `CONFIRMED — đọc được \`value\`: ${JSON.stringify(oPrompt.map((n) => n.value))}`],
  ["Q4 đâu là nút Generate", `MỘT NỬA — a11y có ${nutGenerate.length} button tên "Generate", nhưng DOM chỉ có hash styled-components ⇒ **không có selector hợp lệ để bấm**`],
  ["Q5 đâu là ảnh RA tương ứng", "VISUAL-ONLY — không có phần tử DOM nào cho ảnh ra"],
  ["Q6 map được source → block → outputs[]", "UNKNOWN từ DOM — không node id, không cạnh, và `style` bị che (ADR-0006) nên **quan hệ không gian cũng không đọc được**"]
];
for (const [q, tl] of CAU) console.log(`   ${q.padEnd(34)} ${tl}`);

/* ── SO SÁNH ────────────────────────────────────────────────────────────────────────────── */
console.log("\n## SO SÁNH (chữ cho AI, cho TRỌN bộ 6 câu)");
const u = (x, d) => { const r = tiLeHuuIch(d, x.bcb_model); return `${r.nhan} ${d}/${x.bcb_model}`; };
console.log(`   A đọc rộng       ${String(tt.bcb_model).padStart(6)} chữ · ${String(tt.bcb_tho).padStart(6)} B thô · hữu ích ${u(tt, chuC.length)}`);
console.log(`   C vị ngữ Node    ${String(ttC.bcb_model).padStart(6)} chữ · ${String(ttC.bcb_tho).padStart(6)} B thô · hữu ích ${u(ttC, chuC.length)}`);
console.log(`   B ảnh + 1 hỏi    ${String(ttB.bcb_model).padStart(6)} chữ · ${String(ttB.bcb_tho).padStart(6)} B thô  (chỉ trả lời Q2, không trả lời Q1/Q5/Q6)`);
console.log(`\n   C giảm ${(100 * (1 - ttC.bcb_model / tt.bcb_model)).toFixed(1)}% chữ so với A, **cùng lượng bằng chứng** — cùng một lượt \`scout.a11y\`.`);
console.log(`   Thô thì C chỉ giảm ${tt.bcb_tho - ttC.bcb_tho} B (bỏ \`scout.page\`): rút gọn ở Node KHÔNG cắt byte thô.`);
console.log("\n   token thật: UNKNOWN — bộ đo không đọc được usage runtime và không bịa.");
