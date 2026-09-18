#!/usr/bin/env node
/* V2 · CÒN GÌ KHÁC NHAU GIỮA HAI CÂY TRỢ NĂNG — READ-ONLY, có bộ đếm.
 *
 * Lượt trước trả lời *"email có đọc được không"* → **KHÔNG**, trên cả hai ghế. Nhưng
 * *"không thấy email"* và *"không thấy gì"* là **hai câu khác nhau**, và gộp chúng là đúng cái
 * bẫy `read-the-text-not-just-the-number`: tôi đã chọn một thứ để đếm (email), rồi suýt đọc con
 * số 0 của nó thành *"Workbench không lộ danh tính"*.
 *
 * Nên file này không đi tìm một chuỗi nào cả. Nó lấy TOÀN BỘ tên node của hai cây rồi hỏi:
 * **cái gì có ở cây này mà không có ở cây kia?** Thứ nào còn lại sau phép trừ đó là ứng viên
 * neo danh tính — hoặc, nếu phép trừ ra rỗng, thì câu *"Workbench không lộ danh tính"* mới có
 * quyền được viết ra, và lúc đó nó là một phép đo chứ không phải một ấn tượng.
 *
 * ─── HAI CHUYỆN FILE NÀY KHÔNG LÀM ──────────────────────────────────────────
 * ⑴ KHÔNG in nội dung tác phẩm. Ranh giới Đức đặt còn nguyên: đọc đúng thứ cần để PHÂN BIỆT.
 *    Phép trừ dưới đây chỉ giữ tên node, cắt còn 80 ký tự, và bỏ những tên thuần hình dạng
 *    (rỗng, số, icon) — chúng không phân biệt được ai với ai.
 * ⑵ KHÔNG kết luận thay Đức. Một chuỗi khác nhau giữa hai cây CHƯA phải danh tính: nó còn phải
 *    ổn định qua phiên và không giả mạo được từ trang. File này chỉ nói *có gì để xét*.
 *
 * Chạy:  node workers/duc-scouter/pilots/vizcom-anhducds/do-khac-biet-a11y.mjs
 * Mã thoát: 0 = chạy xong · 1 = có lệnh ghi lọt qua (hỏng thật).
 */
import { goi } from "../trang-thu-cham/scripts/goi-bridge.mjs";
import { taoGiaiTarget } from "../../../_shared/goi-bridge/giai-target.mjs";
import { TU_VUNG_GHI } from "../../../_shared/adapters/hop-dong.mjs";
import { VIZCOM } from "../../../_shared/adapters/vizcom.mjs";

const nhatKy = [];
const goiCoSo = async (method, params = {}, o = {}) => {
  nhatKy.push(method);
  if (TU_VUNG_GHI.includes(method)) throw new Error(`CHẶN: READ-ONLY, từ chối ${method}`);
  return goi(method, params, o);
};

/* Tên KHÔNG phân biệt được ai với ai: rỗng · thuần số/ký hiệu · nhãn giao diện chung. Lọc chúng
   để phép trừ không bị chôn dưới hàng trăm dòng nhiễu. Đây là bộ lọc HIỂN THỊ, không phải bộ
   lọc quyết định — số đếm TRƯỚC khi lọc vẫn in ra ngay dưới. */
const VO_NGHIA = (s) => !s || s.length < 3 || /^[\s\d.,:%/+\-—·()[\]]+$/.test(s);

const R = taoGiaiTarget({ goi: goiCoSo });
const ghe = await R.lietKeGhe();

const muc = [];
for (const g of ghe) {
  const tg = await goiCoSo("scout.targets", {}, { ghe: g.dia_chi });
  for (const t of tg.data.targets.filter((t) => t.type === "page" && t.url.startsWith(VIZCOM.origin))) {
    muc.push({ ghe: g.dia_chi, target_id: t.targetId, url: t.url });
  }
}
if (muc.length !== 2) {
  console.log(`## CẦN ĐÚNG 2 target Vizcom để trừ nhau, đang có ${muc.length}. Dừng.`);
  process.exit(0);
}

const ten = [];
for (const m of muc) {
  const a = await goiCoSo("scout.a11y", { target_id: m.target_id }, { ghe: m.ghe });
  /* Gom MỌI chuỗi `name` ở mọi độ sâu — không giả định hình dạng cây. Một bộ đọc giả định
     `nodes[]` phẳng sẽ im lặng ra rỗng nếu bản trả về lồng nhau, và cái rỗng đó đọc y hệt
     "trang không có gì". */
  const goc = [];
  (function di(x) {
    if (!x || typeof x !== "object") return;
    if (Array.isArray(x)) return x.forEach(di);
    if (typeof x.name === "string") goc.push(x.name.trim());
    for (const v of Object.values(x)) di(v);
  })(a.data);
  ten.push({ ...m, tho: goc, tap: new Set(goc.filter((s) => !VO_NGHIA(s)).map((s) => s.slice(0, 80))) });
}

const [A, B] = ten;
const chiA = [...A.tap].filter((s) => !B.tap.has(s));
const chiB = [...B.tap].filter((s) => !A.tap.has(s));
const chung = [...A.tap].filter((s) => B.tap.has(s));

console.log(`## HAI CÂY TRỢ NĂNG`);
for (const t of ten) {
  console.log(`   ghế ${t.ghe.slice(0, 8)}…  ${t.tho.length} tên thô · ${t.tap.size} tên có nghĩa`);
}
console.log(`   chung ${chung.length} · chỉ ghế A ${chiA.length} · chỉ ghế B ${chiB.length}\n`);

const in80 = (nhan, ds) => {
  console.log(`## ${nhan} (${ds.length})`);
  if (!ds.length) { console.log("   (rỗng)"); return; }
  for (const s of ds.slice(0, 40)) console.log(`   ${JSON.stringify(s)}`);
  if (ds.length > 40) console.log(`   … và ${ds.length - 40} tên nữa`);
};
in80(`CHỈ CÓ Ở GHẾ ${A.ghe.slice(0, 8)}…`, chiA);
console.log("");
in80(`CHỈ CÓ Ở GHẾ ${B.ghe.slice(0, 8)}…`, chiB);

console.log("\n## PHÁN");
if (!chiA.length && !chiB.length) {
  console.log("   Hai cây GIỐNG HỆT nhau về tên node. Lúc này câu \"Workbench không lộ danh tính\"");
  console.log("   là một PHÉP ĐO, không phải một ấn tượng — và nó mạnh hơn hẳn lượt trước, vì lượt");
  console.log("   trước mới chỉ nói \"không thấy chuỗi hình dạng email\".");
} else {
  console.log(`   Còn ${chiA.length + chiB.length} tên khác nhau giữa hai tài khoản. Chúng là ỨNG VIÊN,`);
  console.log("   CHƯA phải danh tính: còn phải đo ổn định qua phiên, và đo có giả mạo được từ trang");
  console.log("   không. Đừng ghi cái nào vào adapter trước hai phép đo đó.");
}

console.log(`\n## NHẬT KÝ DÂY — ${nhatKy.length} lượt · lệnh GHI: ${nhatKy.filter((m) => TU_VUNG_GHI.includes(m)).length}`);
