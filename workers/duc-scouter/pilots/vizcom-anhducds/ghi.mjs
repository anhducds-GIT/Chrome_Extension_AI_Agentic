#!/usr/bin/env node
/* PILOT GHI VIZCOM / anhducds — chặng ④ của `docs/VIZCOM-PHASE-2.md`.
 *
 * ─── CÂU HỎI ────────────────────────────────────────────────────────────────
 * Một lượt GHI thật có đi hết dây — Local AI → Bridge → đúng ghế → đúng target → đúng TÀI
 * KHOẢN — rồi **đổi được trạng thái trang và đọc lại được chỗ đổi** không? Và hai tài khoản
 * Vizcom kia có đúng **0** lượt ghi không?
 *
 * ─── HAI CÁI CHỐT, VÀ CHÚNG KHÔNG PHẢI LỜI HỨA ──────────────────────────────
 * ⑴ `chiGhiVao` là target đã giải ra. Mọi lượt GHI đi qua `goiCoSo`, và hàm đó **ném** nếu
 *    target không phải nó. Nên câu *"không đụng hai tài khoản kia"* có một cái chặn đứng sau,
 *    không phải một lời khai.
 * ⑵ Trước MỖI lượt ghi: `khoaDanhTinh` chạy lại. Không phải cho chắc — `G-102` đo được
 *    `target_id` sống qua điều hướng SPA, nên "vẫn đúng target" KHÔNG kéo theo "vẫn đúng
 *    người". Một lượt giải target là một phép đo tại một thời điểm.
 *
 * ─── LƯỢT GHI ĐƯỢC CHỌN, VÀ VÌ SAO KHÔNG PHẢI CÁI Ở `/workbench/` ───────────
 * Đề bài đòi quét `/workbench/…`. Quét bề mặt thật ngày 18/09 cho thấy **đường duy nhất tới
 * `/workbench/` từ trang này là nút `Create new file`** — `a[href^="/workbench/"]` khớp đúng
 * **1** phần tử, và nó TẠO một tệp. Tạo tệp không đảo ngược được nếu không xoá, mà xoá là thứ
 * Đức cấm thẳng. Nên file này dừng trước cửa đó và báo lại, đúng luật STOP của đề bài.
 *
 * Lượt ghi được chọn là gõ vào ô tìm tệp rồi xoá đi: **không chạm một byte dữ liệu nào, không
 * tiêu credit, đảo ngược hoàn toàn**, và vẫn đổi trạng thái trang đủ để đọc lại.
 *
 * Chạy:  node workers/duc-scouter/pilots/vizcom-anhducds/ghi.mjs
 * Cần:   Bridge chạy · Vizcom `anhducds` đang mở · **công tắc đường ghi đã bật bằng tay Đức**.
 * Mã thoát: 0 = ĐẠT · 2 = fail closed (đúng hành vi) · 1 = hỏng thật.
 */
import { goi } from "../trang-thu-cham/scripts/goi-bridge.mjs";
import { taoGiaiTarget } from "../../../_shared/goi-bridge/giai-target.mjs";
import { soatAdapter, TU_VUNG_GHI } from "../../../_shared/adapters/hop-dong.mjs";
import { VIZCOM } from "../../../_shared/adapters/vizcom.mjs";

const CHU_THU = "zzq-scouter-probe";   /* chuỗi không khớp tệp nào — để lượt lọc hiện rõ */

let chiGhiVao = null;
const nhatKy = [];
const goiCoSo = async (method, params = {}, o = {}) => {
  const ghi = TU_VUNG_GHI.includes(method);
  nhatKy.push({ method, ghi, target: params.target_id ?? null });
  if (ghi && params.target_id !== chiGhiVao) {
    throw new Error(`CHẶN: lệnh GHI ${method} nhắm target ${params.target_id}, không phải target đã giải ra.`);
  }
  return goi(method, params, o);
};

const R = taoGiaiTarget({ goi: goiCoSo });

console.log("## ⓪ SOÁT HỢP ĐỒNG ADAPTER");
const soat = soatAdapter(VIZCOM);
console.log("   ", JSON.stringify(soat));
if (!soat.dat) process.exit(1);

console.log("\n## ① GIẢI TARGET — không nêu ghế, để resolver tự tìm");
const r = await R.giai({ origin: VIZCOM.origin, danh_tinh: VIZCOM.danh_tinh, danh_tinh_phu: VIZCOM.danh_tinh_phu });
for (const h of r.da_hoi) console.log(`    hỏi ${h.ghe_nhan.padEnd(16)} ${h.tong} target · ${h.trang} page · ${h.hop} khớp origin`);
if (!r.ok) { console.error(`DỪNG — fail closed (${r.ma}): ${r.ly_do}`); process.exit(2); }
console.log(`    → CHỌN ghế ${r.ghe} · target ${r.target_id}`);
console.log(`      url ${r.url}`);
console.log(`      danh tính CHÍNH: ${JSON.stringify(r.doc_duoc)} · phụ: ${JSON.stringify(r.phu?.doc_duoc)}`);
for (const l of r.lech ?? []) console.log(`    → LOẠI ${l.target_id.slice(0, 10)}… vì đọc ra ${JSON.stringify(l.doc_duoc)}`);
/* Mở chốt ⑴ ĐÚNG MỘT LẦN, tại đây, sau khi danh tính đã chứng minh xong. */
chiGhiVao = r.target_id;

console.log("\n## ② scout.song — phải ĐẠT trước khi đi tiếp");
const s = await goiCoSo("scout.song", { target_id: r.target_id }, { ghe: r.ghe });
console.log(`    ${JSON.stringify(s.data)}`);
if (!s.data.song) { console.error("DỪNG — target không đáp."); process.exit(2); }
/* `song:true` KHÔNG có nghĩa trang dựng xong (`G-101`). Cửa tiếp theo là danh tính, không phải
 * lòng tin: một renderer đáp ở 5ms vẫn có thể đang hiện DOM của lượt tải trước. */

const khoa = async (nhan) => {
  const k = await R.khoaDanhTinh({ ghe: r.ghe, target_id: r.target_id, origin: VIZCOM.origin,
    danh_tinh: VIZCOM.danh_tinh, danh_tinh_phu: VIZCOM.danh_tinh_phu });
  console.log(`    [khoá ${nhan}] ${k.ok ? "ĐẠT" : `TRƯỢT ${k.ma}`} · ${JSON.stringify(k.bang_chung ?? k.ly_do)} · url=${k.url ?? "-"}`);
  if (!k.ok) { console.error("DỪNG fail-closed — không ghi gì."); process.exit(2); }
  return k;
};

/* Ảnh chụp trạng thái = tập TÊN trong cây trợ năng. Cố ý không đếm phần tử theo selector: mọi
 * `class` của Vizcom là hash styled-components, và hợp đồng luật ⑸ cấm neo vào chúng. Tên node
 * thì đọc được mà không phải đoán một selector nào. */
const chup = async () => {
  const a = await goiCoSo("scout.a11y", { target_id: r.target_id }, { ghe: r.ghe });
  return (a.data.nodes || []).map((n) => n.name || "").filter(Boolean);
};
const soSanh = (truoc, sau) => ({
  mat: truoc.filter((x) => !sau.includes(x)),
  them: sau.filter((x) => !truoc.includes(x))
});

console.log("\n## ③ KHOÁ DANH TÍNH + CHỤP TRẠNG THÁI TRƯỚC");
await khoa("trước khi đo");
const truoc = await chup();
console.log(`    ${truoc.length} tên node trong cây trợ năng`);

console.log("\n## ④ BỀ MẶT `/workbench/…` — ĐO, RỒI DỪNG TRƯỚC CỬA");
const wb = await goiCoSo("scout.query", { selector: 'a[href^="/workbench/"]', target_id: r.target_id, limit: 10 }, { ghe: r.ghe });
const soWb = wb.data.matchCount ?? (wb.data.matches || []).length;
console.log(`    a[href^="/workbench/"] → ${soWb} khớp`);
for (const m of wb.data.matches || []) {
  const t = m.attributes || {};
  console.log(`      class=${JSON.stringify(String(t.class || "").slice(0, 60))} href=${JSON.stringify(t.href ?? "(che)")}`);
}
console.log("    → Đường duy nhất tới /workbench/ từ trang này là nút TẠO TỆP MỚI.");
console.log("      Tạo tệp không đảo ngược được nếu không xoá, mà xoá là thứ Đức cấm. DỪNG ở đây.");

console.log(`\n## ⑤ LƯỢT GHI — khoá lại NGAY TRƯỚC, không dùng lại lượt khoá ở ③`);
await khoa("ngay trước ghi");
const g1 = await goiCoSo("scout.type", { selector: VIZCOM.be_mat.tim_tep, text: CHU_THU, target_id: r.target_id }, { ghe: r.ghe });
/* `da_kiem` nằm CÙNG TẦNG với `data`, không nằm trong nó (`{...ra, da_kiem}` ở seed). Bản đầu
 * đọc `g1.data.da_kiem` và nhận `undefined` — rồi suýt báo là lệnh ghi không tự kiểm. Khi một
 * trường trông như THIẾU, nghi cách đọc của mình trước. */
console.log(`    scout.type → da_kiem=${g1.da_kiem} · kiem_bang=${g1.kiem_bang} · gõ ${g1.data.typed} ký tự`);
console.log(`      lời tự khai: ${JSON.stringify(String(g1.kiem_noi ?? "").slice(0, 140))}`);
console.log(`      ngân sách ghi còn: ${JSON.stringify(g1.write_budget)}`);

console.log("\n## ⑥ TRẠNG THÁI SAU — đọc lại TRANG, không tin lời báo của lệnh ghi");
const sau = await chup();
const d1 = soSanh(truoc, sau);
console.log(`    ${truoc.length} → ${sau.length} tên node · mất ${d1.mat.length} · thêm ${d1.them.length}`);
console.log(`    MẤT : ${JSON.stringify(d1.mat.slice(0, 8))}`);
console.log(`    THÊM: ${JSON.stringify(d1.them.slice(0, 8))}`);
console.log(`    chuỗi đã gõ có mặt trong cây trợ năng: ${sau.some((x) => x.includes(CHU_THU))}`);

console.log("\n## ⑦ ĐẢO NGƯỢC — khoá lại lần nữa rồi mới xoá");
await khoa("ngay trước xoá");
const g2 = await goiCoSo("scout.clear", { selector: VIZCOM.be_mat.tim_tep, target_id: r.target_id }, { ghe: r.ghe });
console.log(`    scout.clear → da_kiem=${g2.da_kiem} · kiem_noi=${JSON.stringify(String(g2.kiem_noi ?? "").slice(0, 140))}`);

/* Ô trống lại rồi, nhưng lượt chạy đầu (18/09) đo được **trang chưa về đúng nguyên trạng**:
 * còn dư hai tên `"Recent searches"` — bảng gợi ý của ô tìm kiếm đang MỞ vì ô vẫn đang có con
 * trỏ. Không dữ liệu nào bị đổi (chuỗi đã gõ không còn trong cây), nhưng "đảo ngược" mà còn
 * một cái bảng mở thì là đảo ngược XẤP XỈ. `Escape` đóng nó — và nó là lượt ghi thứ ba, khai
 * đủ trong bộ đếm chứ không giấu đi cho con số đẹp. */
await khoa("ngay trước Escape");
const g3 = await goiCoSo("scout.key", { selector: VIZCOM.be_mat.tim_tep, key: "Escape", target_id: r.target_id }, { ghe: r.ghe });
console.log(`    scout.key Escape → da_kiem=${g3.da_kiem}`);
const hoi = await chup();
const d2 = soSanh(truoc, hoi);
console.log(`    so với TRƯỚC: mất ${d2.mat.length} · thêm ${d2.them.length} → ${d2.mat.length === 0 && d2.them.length === 0 ? "KHÔI PHỤC ĐÚNG NGUYÊN TRẠNG" : "CÒN LỆCH (xem dưới)"}`);
if (d2.mat.length || d2.them.length) {
  console.log(`      MẤT : ${JSON.stringify(d2.mat.slice(0, 6))}`);
  console.log(`      THÊM: ${JSON.stringify(d2.them.slice(0, 6))}`);
}

console.log("\n## ⑧ BỘ ĐẾM — tách theo từng target");
const theo = {};
for (const x of nhatKy) {
  const k = x.target ?? "(không target)";
  theo[k] ??= { doc: 0, ghi: 0 };
  theo[k][x.ghi ? "ghi" : "doc"] += 1;
}
for (const [t, n] of Object.entries(theo)) {
  const ai = t === chiGhiVao ? "anhducds ← ĐÃ GIẢI RA" : t === "(không target)" ? "lệnh không nhắm target nào" : "TÀI KHOẢN KHÁC";
  console.log(`    ${t.slice(0, 16).padEnd(18)} đọc ${String(theo[t].doc).padStart(2)} · GHI ${n.ghi}   ${ai}`);
}
const ghiLac = Object.entries(theo).filter(([t, n]) => t !== chiGhiVao && n.ghi > 0);
if (ghiLac.length) { console.error("PILOT HỎNG: có lệnh ghi lọt sang target khác."); process.exit(1); }
console.log(`\n    Tổng ${nhatKy.length} lượt · GHI ${nhatKy.filter((x) => x.ghi).length}, tất cả trên đúng một target.`);
