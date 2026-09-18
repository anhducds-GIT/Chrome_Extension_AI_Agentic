#!/usr/bin/env node
/* PILOT BẤM GENERATE — đo `outputs = N → N+1` trên Workbench thật.
 *
 * ─── VÌ SAO FILE NÀY TỒN TẠI ĐƯỢC, SAU KHI TÔI ĐÃ BÁO LÀ KHÔNG THỂ ─────────
 * Tôi đã hai lần báo với Đức rằng nút `Generate` không bấm được. Cả hai lần đều sai, và sai
 * theo hai kiểu khác nhau — ghi lại vì cái sai thứ hai là kiểu dễ lặp lại nhất:
 *
 *   ⑴ *"mọi class là hash"* — SAI. Hash nằm ở ĐUÔI; đầu là tên component ổn định, nên
 *      `button[class*="WorkbenchElementImg2Img__GenerateButton"]` không chứa `-sc-` (`G-127`).
 *   ⑵ *"không selector nào khớp đúng một, đây là số học"* — SAI. Tôi thử 18 biến thể CSS rồi
 *      tuyên bố bất khả. Thứ 19 là **`id` React của từng khối**, và nó tách sạch (`G-129`).
 *
 * Bài học: *"tôi đã thử N cách"* không phải một chứng minh bất khả. Nó là một con số về tôi.
 *
 * ─── NEO, VÀ VÌ SAO NÓ HỢP LUẬT ─────────────────────────────────────────────
 *     [class^="WorkbenchElementImg2Img__Img2Img-"]:has(button[id="<id>"]) button[class*="__GenerateButton"]
 *
 * Không chứa `-sc-` ⇒ qua luật ⑸. Khớp **đúng một** ⇒ qua luật gói số 7. `<id>` **đọc sống mỗi
 * lượt chạy**, không gõ cứng — `id` React đổi theo mỗi lượt tải trang. Và trước khi bấm, file
 * này đọc `value` của ô prompt TRONG CÙNG khối ấy để **xác nhận đang nhắm khối nào** — thứ tự
 * không được đoán, nó phải được đọc.
 *
 * ─── DANH TÍNH: NÓI THẲNG CHỖ KHÔNG CHỨNG MINH ĐƯỢC ────────────────────────
 * `khoaDanhTinh` **không chạy được trên bề mặt này**: canvas không phơi email/workspace/plan
 * (`G-115`), và `a[href="/settings/account/profile"]` chỉ trả `"Đ"`. File này vì thế **KHÔNG**
 * chứng minh được tài khoản tại thời điểm ghi. Nó chạy theo **chỉ thị hai lần rõ ràng của Đức**
 * (*"bạn chủ động bấm"*, *"tôi muốn bạn tự bấm"*), và nó KHAI RA điều đó ở đầu mỗi lượt chạy
 * thay vì lặng lẽ bỏ qua một luật. Một luật bị bỏ qua trong im lặng là một luật đã chết.
 *
 * ─── GENERATE TIÊU CREDIT ──────────────────────────────────────────────────
 * Đây là lệnh sinh ảnh thật. Mặc định bấm **ĐÚNG MỘT LẦN**, đúng ý Đức *"bấm chậm lần lượt"*.
 *
 * Chạy:  node workers/duc-scouter/pilots/vizcom-anhducds/bam-generate.mjs [<thu-muc-anh>]
 * Mã thoát: 0 = xong · 2 = fail closed · 1 = hỏng thật.
 */
import fs from "node:fs";
import path from "node:path";
import { goi } from "../trang-thu-cham/scripts/goi-bridge.mjs";
import { taoCanChiPhi } from "../../../_shared/goi-bridge/do-chi-phi.mjs";
import { TU_VUNG_GHI } from "../../../_shared/adapters/hop-dong.mjs";

const THU_MUC = process.argv[2] || ".";
const ROOT = '[class^="WorkbenchElementImg2Img__Img2Img-"]';
const GEN = 'button[class*="__GenerateButton"]';
const O_PROMPT = 'textarea[placeholder="What are you creating?"]';

let chiGhiVao = null;
const nhatKy = [];
const can = taoCanChiPhi(async (m, p = {}, o = {}) => {
  const ghi = TU_VUNG_GHI.includes(m);
  nhatKy.push({ method: m, ghi, target: p.target_id ?? null });
  if (ghi && p.target_id !== chiGhiVao) throw new Error(`CHẶN: ${m} nhắm target lạ ${p.target_id}`);
  return goi(m, p, o);
}, { viec: "bam-generate" });
const g = can.goi;

console.log("## ⓪ KHAI TRƯỚC — chỗ file này KHÔNG chứng minh được");
console.log("   Danh tính tài khoản KHÔNG kiểm được trên /workbench/ (G-115). Chạy theo chỉ thị");
console.log("   trực tiếp của Đức. Generate TIÊU CREDIT. Bấm đúng MỘT lần.\n");

console.log("## ① GIẢI TARGET — không dùng lại id nào (bất biến G-118)");
const ses = await g("bridge.sessions", {});
let uv = null;
for (const s of ses.sessions || []) {
  let t; try { t = await g("scout.targets", {}, { ghe: s.instance_id }); } catch { continue; }
  for (const y of t.data.targets.filter((x) => x.type === "page" && x.url.includes("/workbench/"))) {
    if (!uv) uv = { ghe: s.instance_id, target_id: y.targetId, url: y.url, tieu_de: y.title };
  }
}
if (!uv) { console.error("Không có /workbench/ nào đang mở."); process.exit(2); }
chiGhiVao = uv.target_id;
console.log(`   ${uv.tieu_de} · ghế ${uv.ghe.slice(0, 8)}… · target ${uv.target_id}`);

console.log("\n## ② scout.song");
const song = await g("scout.song", { target_id: uv.target_id }, { ghe: uv.ghe });
console.log(`   ${JSON.stringify(song.data)}`);
if (!song.data.song) { console.error("DỪNG — target không đáp."); process.exit(2); }

/* ── Ảnh chụp đi ra ĐĨA, không vào context. Đo 18/09: một lượt `scout.shot` là 103.066 byte
 *    base64 trong phong bì — đắt nhất trong mọi method (`G-125`). Node nhận base64 rồi ghi tệp;
 *    context chỉ nhận một đường dẫn. ── */
const chup = async (nhan) => {
  const r = await g("scout.shot", { target_id: uv.target_id }, { ghe: uv.ghe });
  const tep = path.join(THU_MUC, `generate-${nhan}.jpg`);
  fs.writeFileSync(tep, Buffer.from(r.data.base64, "base64"));
  console.log(`   ảnh ${nhan}: ${tep} (${r.data.bytes} byte)`);
  return tep;
};

/* ── Ảnh chụp trạng thái DOM. Đếm thứ ĐO ĐƯỢC, không đếm thứ tiện đếm. ── */
const dem = async () => {
  const a = await g("scout.a11y", { target_id: uv.target_id, limit: 1500 }, { ghe: uv.ghe });
  const n = a.data.nodes || [];
  const pho = {};
  for (const x of n) pho[x.role || "?"] = (pho[x.role || "?"] || 0) + 1;
  const sl = {};
  for (const s of ["img", ROOT, O_PROMPT, '[class^="WorkbenchElement"]', "canvas", "svg"]) {
    sl[s] = (await g("scout.query", { selector: s, target_id: uv.target_id, limit: 1 }, { ghe: uv.ghe })).data.matchCount;
  }
  return { total: a.data.total_nodes, tra_ve: a.data.returned, pho, sl,
    ten: [...new Set(n.map((x) => x.name || "").filter(Boolean))] };
};

console.log("\n## ③ CHỌN KHỐI — đọc `id` sống, rồi XÁC NHẬN bằng chữ trong ô prompt");
const bt = await g("scout.query", { selector: "button[id]", target_id: uv.target_id, limit: 10 }, { ghe: uv.ghe });
const ids = (bt.data.items || []).map((m) => (m.attributes || {}).id).filter((x) => /^:r/.test(String(x)));
if (!ids.length) { console.error("Không thấy `id` khối nào — bề mặt đã đổi, DỪNG."); process.exit(2); }
const khoi = [];
for (const id of ids) {
  const pham = `${ROOT}:has(button[id="${id}"])`;
  const nGen = (await g("scout.query", { selector: `${pham} ${GEN}`, target_id: uv.target_id, limit: 3 }, { ghe: uv.ghe })).data.matchCount;
  let chu = null;
  try { chu = String((await g("scout.text", { selector: `${pham} ${O_PROMPT}`, target_id: uv.target_id }, { ghe: uv.ghe })).data.text ?? ""); } catch { /* đọc không ra thì để null */ }
  console.log(`   ${id}  generate khớp ${nGen}  prompt=${JSON.stringify(chu)}`);
  khoi.push({ id, pham, nGen, chu });
}
/* Chỉ nhận khối mà selector khớp ĐÚNG MỘT **và** đọc ra được chữ. Thiếu một trong hai thì
 * không biết mình đang bấm vào đâu — và một lượt bấm không biết đích là một lượt bấm mù. */
const chon = khoi.find((k) => k.nGen === 1 && k.chu);
if (!chon) { console.error("Không khối nào vừa khớp-một vừa đọc được prompt. DỪNG fail-closed."); process.exit(2); }
console.log(`   → BẤM khối ${chon.id} · prompt ${JSON.stringify(chon.chu)}`);

console.log("\n## ④ TRƯỚC");
const truoc = await dem();
console.log(`   a11y total=${truoc.total} · ${JSON.stringify(truoc.sl)}`);
const anhTruoc = await chup("truoc");

console.log("\n## ⑤ BẤM GENERATE — một lần");
const bam = await g("scout.click", { selector: `${chon.pham} ${GEN}`, target_id: uv.target_id }, { ghe: uv.ghe });
console.log(`   da_kiem=${bam.da_kiem} · ngân sách ${JSON.stringify(bam.write_budget)}`);
console.log(`   kiem_noi=${JSON.stringify(String(bam.kiem_noi ?? "").slice(0, 120))}`);

console.log("\n## ⑥ SAU — theo dõi, không đoán khi nào xong");
for (const cho of [3000, 6000, 12000]) {
  await new Promise((r) => setTimeout(r, cho));
  const s = await dem();
  const themTen = s.ten.filter((x) => !truoc.ten.includes(x));
  console.log(`   +${cho / 1000}s  a11y total=${s.total} (${s.total - truoc.total >= 0 ? "+" : ""}${s.total - truoc.total}) · img=${s.sl.img} · svg=${s.sl.svg} · khối=${s.sl[ROOT]}`);
  if (themTen.length) console.log(`         tên mới: ${JSON.stringify(themTen.slice(0, 8))}`);
}
const anhSau = await chup("sau");

console.log("\n## ⑦ BỘ ĐẾM");
const theo = {};
for (const x of nhatKy) { const k = x.target ?? "(không target)"; theo[k] ??= { doc: 0, ghi: 0 }; theo[k][x.ghi ? "ghi" : "doc"] += 1; }
for (const [t, v] of Object.entries(theo)) console.log(`   ${t.slice(0, 16).padEnd(18)} đọc ${v.doc} · GHI ${v.ghi}${t === chiGhiVao ? "  ← đúng target" : ""}`);
console.log(`\n   ảnh so sánh: ${anhTruoc}  ↔  ${anhSau}`);
console.log(`   chi phí: ${can.tomTat().luot_goi} lượt · ${can.tomTat().bcb_tho} B thô (ảnh đi ra ĐĨA, không vào context)`);
