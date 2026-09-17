#!/usr/bin/env node
/* PILOT VIZCOM / anhducds — E2E: Local AI → Bridge → đúng GHẾ → Scouter → đúng target → adapter.
 *
 * ─── CÂU HỎI, ĐÚNG MỘT CÂU ──────────────────────────────────────────────────
 * Đức có **ba** tài khoản Vizcom. Cả ba mở cùng `app.vizcom.com`, cùng hình dạng URL
 * `/files/<uuid>/recent`, cùng `title` là `"Vizcom"`. Local AI có chọn được đúng tài khoản
 * `anhducds` — và **từ chối** hai tài khoản kia — mà không ai chỉ tay vào tab nào không?
 *
 * ─── VÌ SAO KHÔNG THỂ THAY BẰNG MỘT PHÉP GHIM ───────────────────────────────
 * `tests/giai-target-smoke.mjs` ghim *logic* của bộ giải: nó dựng một Bridge giả và chứng minh
 * resolver từ chối đúng lúc. Nhưng cả bộ ghim ấy đứng trên một giả định mà chỉ Chrome thật trả
 * lời được: *hai tài khoản Vizcom có thật sự khác nhau ở một chỗ ĐỌC ĐƯỢC không?* Trang giả
 * trả về đúng thứ người viết TIN là nó sẽ trả về. File này đi hỏi cái máy.
 *
 * ─── READ-ONLY, VÀ ĐÓ LÀ THỨ ĐO ĐƯỢC CHỨ KHÔNG PHẢI LỜI HỨA ─────────────────
 * Mọi lượt gọi đi qua `goiCoSo`, và hàm đó **ném** nếu gặp một method thuộc từ vựng GHI. Nên
 * câu *"hai tài khoản kia không bị thao tác"* có một con số đứng sau: khối ⑤ in ra tổng số lượt
 * gọi và số lệnh GHI, tách theo từng target. Một lời khai an toàn không có bộ đếm là một lời hứa.
 *
 * Chạy:  node workers/duc-scouter/pilots/vizcom-anhducds/chay.mjs
 * Cần:   máy chủ Bridge của Scouter đang chạy · ít nhất một cửa sổ Vizcom của `anhducds` đang mở.
 * Mã thoát: 0 = ĐẠT · 2 = KHÔNG giải ra target (fail closed, ĐÚNG hành vi) · 1 = hỏng thật.
 */
import { goi } from "../trang-thu-cham/scripts/goi-bridge.mjs";
import { taoGiaiTarget } from "../../../_shared/goi-bridge/giai-target.mjs";
import { soatAdapter, TU_VUNG_GHI } from "../../../_shared/adapters/hop-dong.mjs";
import { VIZCOM } from "../../../_shared/adapters/vizcom.mjs";

const nhatKy = [];
const goiCoSo = async (method, params = {}, o = {}) => {
  nhatKy.push({ method, target: params.target_id ?? null });
  if (TU_VUNG_GHI.includes(method)) throw new Error(`CHẶN: pilot này READ-ONLY, từ chối ${method}`);
  return goi(method, params, o);
};

console.log("## ⓪ SOÁT HỢP ĐỒNG ADAPTER");
const soat = soatAdapter(VIZCOM);
console.log("   ", JSON.stringify(soat));
if (!soat.dat) process.exit(1);

const R = taoGiaiTarget({ goi: goiCoSo });
console.log("\n## ① KIỂM KÊ GHẾ");
for (const g of await R.lietKeGhe()) console.log(`    ${(g.nhan || "(KHÔNG NHÃN)").padEnd(18)} ${g.instance_id}`);

console.log("\n## ② GIẢI TARGET theo adapter — KHÔNG nêu ghế, để resolver tự tìm");
const r = await R.giai({ origin: VIZCOM.origin, danh_tinh: VIZCOM.danh_tinh });
console.log("    ok:", r.ok, "| mã:", r.ma ?? "-");
for (const h of r.da_hoi) console.log(`    hỏi ${h.ghe_nhan.padEnd(16)} ${h.tong} target · ${h.trang} page · ${h.hop} khớp origin`);
console.log(`    ứng viên: ${r.ung_vien ?? 0} · khớp: ${r.khop ?? 0} · lệch: ${r.lech?.length ?? 0} · đọc không ra: ${r.khong_doc_duoc?.length ?? 0}`);
if (r.ok) {
  console.log(`    → CHỌN  ${r.ghe_nhan} (${r.ghe.slice(0, 8)}…)  id=${r.target_id}`);
  console.log(`      url=${r.url}`);
  console.log(`      bằng chứng danh tính: ${JSON.stringify(r.doc_duoc)}`);
}
/* In cả cái BỊ LOẠI, kèm chữ đọc được. Đây là bằng chứng §1 đòi — và nó phải in ra được,
 * vì một resolver chỉ khoe cái nó chọn thì không ai kiểm được nó đã loại đúng hay chưa. */
for (const l of r.lech ?? []) console.log(`    → LOẠI  ${l.ghe_nhan} (${l.ghe.slice(0, 8)}…) id=${l.target_id.slice(0, 10)}… vì đọc ra ${JSON.stringify(l.doc_duoc)}`);
if (!r.ok) { console.log(`\nDỪNG — fail closed (${r.ma}). Không thao tác gì.`); process.exit(2); }

console.log("\n## ③ CỔNG THỨ HAI — danh tính TÀI KHOẢN, chạy trước mọi bước GHI");
const a = await goiCoSo("scout.a11y", { target_id: r.target_id }, { ghe: r.ghe });
const ten = (a.data.nodes || []).map((n) => n.name || "");
const moc = VIZCOM.xac_nhan_truoc_khi_ghi.a11y_chua;
const hit = ten.filter((t) => t.includes(moc));
/* `>= 1`, không phải `=== 1`. Đo 18/09: chuỗi email xuất hiện **2 lần** trong cây trợ năng.
 * Bản đầu viết `=== 1` và báo CỔNG ĐÓNG cho đúng tài khoản — một phép kiểm chặt quá tay vẫn
 * là một phép kiểm SAI, nó chỉ sai về phía an toàn nên dễ trôi. */
console.log(`    tìm ${JSON.stringify(moc)} trong ${ten.length} tên node → ${hit.length} khớp`);
console.log(`    → danh tính tài khoản ${hit.length >= 1 ? "XÁC NHẬN" : "KHÔNG XÁC NHẬN"}. Công tắc đường ghi vẫn do TAY ĐỨC, không method nào bật được nó.`);

console.log("\n## ④ CHẠY CÁC BƯỚC ĐỌC CỦA ADAPTER");
for (const [nhom, buoc] of Object.entries(VIZCOM.viec)) {
  for (const b of buoc) {
    const kq = await goiCoSo(b.method, { target_id: r.target_id, ...(b.selector ? { selector: b.selector } : {}) }, { ghe: r.ghe });
    const tom = b.method === "scout.text" ? JSON.stringify(String(kq.data.text).slice(0, 60))
      : b.method === "scout.page" ? `${kq.data.elements.total} phần tử tương tác`
      : b.method === "scout.a11y" ? `${kq.data.total_nodes} node` : "ok";
    console.log(`    [${nhom}] ${b.ten}: ${tom}`);
  }
}

console.log("\n## ⑤ NHẬT KÝ DÂY — bằng chứng không tài khoản nào bị thao tác");
const ghi = nhatKy.filter((x) => TU_VUNG_GHI.includes(x.method));
const theoTarget = {};
for (const x of nhatKy) if (x.target) theoTarget[x.target] = (theoTarget[x.target] || 0) + 1;
console.log(`    tổng ${nhatKy.length} lượt gọi · lệnh GHI: ${ghi.length}`);
for (const [t, n] of Object.entries(theoTarget)) console.log(`    target ${t.slice(0, 12)}… : ${n} lượt, tất cả read-only`);
if (ghi.length) { console.error("PILOT HỎNG: có lệnh ghi lọt qua."); process.exit(1); }
