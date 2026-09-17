#!/usr/bin/env node
/* KIỂM KÊ TÀI KHOẢN VIZCOM — bằng chứng cách ly, READ-ONLY, có bộ đếm.
 *
 * ─── VÌ SAO FILE NÀY TÁCH KHỎI `chay.mjs` ───────────────────────────────────
 * `chay.mjs` trả lời *"chọn đúng được không"*. File này trả lời một câu khác và độc lập:
 * *"có bao nhiêu tài khoản Vizcom đang với tới được, và HAI CÁI KIA có bị đụng không"*.
 * Gộp hai câu vào một file thì con số cách ly bị trộn với lượt gọi của chặng giải target, và
 * một con số trộn thì không ai kiểm được.
 *
 * ─── ĐỌC SÂU TỚI ĐÂU, VÀ VÌ SAO ĐƯỢC PHÉP ───────────────────────────────────
 * Ranh giới an toàn Đức đặt: *"hai account còn lại — không đọc nội dung sâu NẾU KHÔNG CẦN để
 * phân biệt"*. Ở đây cần: đề bài Phase 2 đòi chứng minh cả ba tài khoản discover được, và
 * dấu hiệu duy nhất phân biệt chúng là chuỗi email trong cây trợ năng. Nên file này đọc đúng
 * MỘT thứ trên mỗi target — danh sách tên node — rồi lọc ra thứ khớp hình dạng email, và
 * **không in gì khác**. Không đọc tệp, không đọc nội dung tác phẩm, không mở trang nào.
 *
 * Mọi lượt gọi đi qua `goiCoSo`, và hàm đó NÉM nếu gặp method thuộc từ vựng GHI. Nên câu
 * "không tài khoản nào bị thao tác" có một con số đứng sau, tách theo từng target.
 *
 * Chạy:  node workers/duc-scouter/pilots/vizcom-anhducds/kiem-ke-tai-khoan.mjs
 * Mã thoát: 0 = chạy xong · 1 = có lệnh ghi lọt qua (hỏng thật).
 */
import { goi } from "../trang-thu-cham/scripts/goi-bridge.mjs";
import { taoGiaiTarget } from "../../../_shared/goi-bridge/giai-target.mjs";
import { TU_VUNG_GHI } from "../../../_shared/adapters/hop-dong.mjs";
import { VIZCOM } from "../../../_shared/adapters/vizcom.mjs";

const nhatKy = [];
const goiCoSo = async (method, params = {}, o = {}) => {
  nhatKy.push({ method, target: params.target_id ?? null });
  if (TU_VUNG_GHI.includes(method)) throw new Error(`CHẶN: file này READ-ONLY, từ chối ${method}`);
  return goi(method, params, o);
};

/* Hình dạng email, không phải một danh sách email gõ cứng. Gõ cứng ba địa chỉ vào đây thì
 * file này chỉ tìm thấy thứ tôi đã tin là có — và một tài khoản thứ tư sẽ vô hình. */
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

const R = taoGiaiTarget({ goi: goiCoSo });
const ghe = await R.lietKeGhe();
console.log(`## GHẾ ĐANG NỐI: ${ghe.length}`);

const ungVien = [];
for (const g of ghe) {
  const tg = await goiCoSo("scout.targets", {}, { ghe: g.dia_chi });
  const hop = tg.data.targets.filter((t) => t.type === "page" && t.url.startsWith(VIZCOM.origin));
  console.log(`   ${(g.nhan || "(không nhãn)").padEnd(16)} ${g.instance_id}  → ${hop.length} target Vizcom`);
  for (const t of hop) ungVien.push({ ghe: g.dia_chi, ghe_nhan: g.nhan || "(không nhãn)", target_id: t.targetId, url: t.url });
}

console.log(`\n## ỨNG VIÊN VIZCOM: ${ungVien.length}`);
const thay = new Set();
for (const uv of ungVien) {
  let dau = "(đọc không ra)";
  try {
    const a = await goiCoSo("scout.a11y", { target_id: uv.target_id }, { ghe: uv.ghe });
    const moi = [...new Set((a.data.nodes || []).map((n) => n.name || "").join(" ").match(EMAIL) ?? [])];
    moi.forEach((e) => thay.add(e));
    dau = moi.length ? moi.join(", ") : "(không thấy chuỗi dạng email)";
  } catch (loi) { dau = `(lỗi: ${String(loi.message).slice(0, 60)})`; }
  console.log(`   ghế ${uv.ghe.slice(0, 8)}… target ${uv.target_id.slice(0, 12)}…`);
  console.log(`      url   ${uv.url}`);
  console.log(`      email ${dau}`);
}

console.log(`\n## TÀI KHOẢN PHÂN BIỆT ĐƯỢC: ${thay.size} → ${[...thay].join(" · ")}`);
/* KHÔNG kết luận "3/3" từ con số này nếu nó chưa tới 3. Một lời khai cách ly ba chân dựng
 * trên hai chân là lời khai sai, và nó sai về phía nguy hiểm. */
console.log(thay.size >= 3 ? "   → đủ ba chân cho phép thử cách ly." : `   → MỚI ${thay.size} CHÂN. Chưa được viết thành 3/3.`);

const ghi = nhatKy.filter((x) => TU_VUNG_GHI.includes(x.method));
const theoTarget = {};
for (const x of nhatKy) if (x.target) theoTarget[x.target] = (theoTarget[x.target] || 0) + 1;
console.log(`\n## NHẬT KÝ DÂY — tổng ${nhatKy.length} lượt · lệnh GHI: ${ghi.length}`);
for (const [t, n] of Object.entries(theoTarget)) console.log(`   target ${t.slice(0, 12)}… : ${n} lượt đọc · 0 lượt ghi`);
if (ghi.length) { console.error("HỎNG: có lệnh ghi lọt qua."); process.exit(1); }
