#!/usr/bin/env node
/* V2 · ĐO BƯỚC ĐẦU CỦA IDENTITY ATTESTATION — READ-ONLY, có bộ đếm.
 *
 * ─── CÂU HỎI DUY NHẤT ───────────────────────────────────────────────────────
 * Blocker đóng V1 nói: *"Workbench thường không expose email identity."* Câu đó đã được tái
 * hiện hôm nay — `kiem-ke-tai-khoan.mjs` chạy trên hai ghế Đức vừa mở, cả hai target đều ở
 * `/workbench/<uuid>`, và **0 tài khoản phân biệt được**.
 *
 * File này KHÔNG đi tìm cách vòng qua chuyện đó. Nó hỏi đúng một câu đứng trước mọi thiết kế
 * attestation: **trên một target `/workbench`, CÒN GÌ đọc được có thể làm neo danh tính?**
 * Bốn ứng viên, đo cả bốn trên cùng một lượt, rồi để số liệu tự nói:
 *
 *   ⓐ email trong cây trợ năng           — `danh_tinh` của adapter, thứ DUY NHẤT được quyết định
 *   ⓑ nút chuyển tổ chức                 — `danh_tinh_phu`, chỉ in ra cho người đọc
 *   ⓒ org UUID trong `srcRoute` của URL  — ỨNG VIÊN MỚI, xem dưới
 *   ⓓ `title`                            — đối chứng âm: `G-104` đo nó KHÔNG phân biệt được
 *
 * ─── VÌ SAO ⓒ ĐÁNG ĐO, VÀ VÌ SAO NÓ KHÔNG PHẢI LỜI BÁC `G-104` ──────────────
 * `G-104` chốt: *"không một bit nào trong URL phân biệt được chúng"*, đo trên `/files/<uuid>/recent`.
 * Hai URL hôm nay mang **hai org UUID khác nhau** trong tham số `srcRoute`. Hai chuyện đó KHÔNG
 * mâu thuẫn và cũng KHÔNG thay thế nhau:
 *   · `G-104` nói URL không **tự khai** danh tính — đúng, một UUID không đọc ra tên ai.
 *   · Câu hỏi ở đây khác: UUID ấy có **ổn định và khác nhau** đủ để làm **mã** cho một danh
 *     tính đã được attest **ở nơi khác** hay không.
 * Một cái mã thì không cần đọc hiểu được; nó cần **được khai** và **không trùng**. Đó đúng là
 * hình dạng của một token carry — và cũng đúng là chỗ dễ tự lừa nhất, nên nó phải đứng cạnh ⓐ
 * trong cùng một bảng chứ không được đo riêng.
 *
 * ─── FILE NÀY KHÔNG KẾT LUẬN THAY ĐỨC ──────────────────────────────────────
 * Nó **không** đề xuất dùng ⓒ làm danh tính, và **không** ghi gì vào adapter. Ba điều kiện để ⓒ
 * dùng được — ổn định qua phiên · duy nhất theo tài khoản · **không giả mạo được từ trang** —
 * mới có điều kiện thứ nhất là đo được ở đây. Hai điều kiện kia cần đúng thí nghiệm bác bỏ mà
 * V1 đã thiết kế: *hai tài khoản trong CÙNG một ghế*. Hôm nay Đức mở hai ghế, mỗi ghế một tài
 * khoản — tức cấu hình NỀN, không phải cấu hình bác bỏ. Nói ra ở cuối bản in.
 *
 * Mọi lượt gọi đi qua `goiCoSo`, và hàm đó NÉM nếu gặp method thuộc từ vựng GHI.
 *
 * Chạy:  node workers/duc-scouter/pilots/vizcom-anhducds/do-danh-tinh-workbench.mjs
 * Mã thoát: 0 = chạy xong · 1 = có lệnh ghi lọt qua (hỏng thật).
 */
import { goi } from "../trang-thu-cham/scripts/goi-bridge.mjs";
import { taoGiaiTarget } from "../../../_shared/goi-bridge/giai-target.mjs";
import { TU_VUNG_GHI } from "../../../_shared/adapters/hop-dong.mjs";
import { VIZCOM } from "../../../_shared/adapters/vizcom.mjs";

const nhatKy = [];
let coGhi = false;
const goiCoSo = async (method, params = {}, o = {}) => {
  nhatKy.push({ method, target: params.target_id ?? null });
  if (TU_VUNG_GHI.includes(method)) { coGhi = true; throw new Error(`CHẶN: file này READ-ONLY, từ chối ${method}`); }
  return goi(method, params, o);
};

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
/* `srcRoute` là tham số truy vấn đã ĐƯỢC MÃ HOÁ URL, nên phải giải mã trước khi dò — dò thẳng
   trên chuỗi thô thì `%2Ffiles%2F…` không bao giờ khớp, và ⓒ sẽ im lặng ra "không có". */
const ORG_TU_SRCROUTE = (url) => {
  try {
    const sr = new URL(url).searchParams.get("srcRoute");
    return sr ? (sr.match(/\/files\/([0-9a-f-]{16,})/i) ?? [])[1] ?? null : null;
  } catch { return null; }
};
const ORG_TU_DUONG = (url) => {
  try { return (new URL(url).pathname.match(/\/files\/([0-9a-f-]{16,})/i) ?? [])[1] ?? null; }
  catch { return null; }
};

const R = taoGiaiTarget({ goi: goiCoSo });
const ghe = await R.lietKeGhe();

const ungVien = [];
for (const g of ghe) {
  const tg = await goiCoSo("scout.targets", {}, { ghe: g.dia_chi });
  for (const t of tg.data.targets.filter((t) => t.type === "page" && t.url.startsWith(VIZCOM.origin))) {
    ungVien.push({ ghe: g.dia_chi, target_id: t.targetId, url: t.url });
  }
}

console.log(`## GHẾ: ${ghe.length} · TARGET VIZCOM: ${ungVien.length}\n`);

const bang = [];
for (const u of ungVien) {
  const o = { ghe: u.ghe };
  const doc = { email: [], org_button: null, title: null, org_uuid: null, loi: [] };

  doc.org_uuid = ORG_TU_SRCROUTE(u.url) ?? ORG_TU_DUONG(u.url);

  // ⓐ email trong cây trợ năng — đường đọc duy nhất không phải đoán selector (G-104).
  try {
    const a = await goiCoSo("scout.a11y", { target_id: u.target_id }, o);
    const ten = JSON.stringify(a.data ?? {});
    doc.email = [...new Set(ten.match(EMAIL) ?? [])];
  } catch (e) { doc.loi.push(`a11y: ${String(e.message).slice(0, 80)}`); }

  // ⓑ nút chuyển tổ chức — `danh_tinh_phu`, KHÔNG có quyền quyết định.
  try {
    const t = await goiCoSo("scout.text", { target_id: u.target_id, selector: VIZCOM.danh_tinh_phu.selector }, o);
    const chuoi = JSON.stringify(t.data ?? {});
    doc.org_button = chuoi.length > 2 ? chuoi.slice(0, 160) : null;
  } catch (e) { doc.loi.push(`org-button: ${String(e.message).slice(0, 80)}`); }

  // ⓓ title — đối chứng ÂM. Nó PHẢI giống nhau ở cả hai ghế; giống nhau là bằng chứng
  //    rằng lượt đo này thật sự nhìn hai tài khoản khác nhau bằng những neo KHÁC title.
  try {
    const q = await goiCoSo("scout.query", { target_id: u.target_id, selector: "title" }, o);
    doc.title = JSON.stringify(q.data ?? {}).slice(0, 120);
  } catch (e) { doc.loi.push(`title: ${String(e.message).slice(0, 80)}`); }

  bang.push({ ...u, ...doc });
}

for (const b of bang) {
  console.log(`ghế ${b.ghe.slice(0, 8)}…  target ${b.target_id.slice(0, 12)}…`);
  console.log(`   route     ${new URL(b.url).pathname.slice(0, 60)}`);
  console.log(`   ⓐ email    ${b.email.length ? b.email.join(" · ") : "KHÔNG THẤY"}`);
  console.log(`   ⓑ org-btn  ${b.org_button ?? "KHÔNG THẤY"}`);
  console.log(`   ⓒ org-uuid ${b.org_uuid ?? "KHÔNG THẤY"}`);
  console.log(`   ⓓ title    ${b.title ?? "KHÔNG THẤY"}`);
  if (b.loi.length) console.log(`   ⚠ ${b.loi.join(" | ")}`);
  console.log("");
}

/* ─── PHÁN, và phán theo SỐ chứ không theo cảm giác ───────────────────────── */
const phanBiet = (lay) => {
  const v = bang.map(lay).filter(Boolean);
  if (v.length !== bang.length) return { du: false, ly_do: `chỉ ${v.length}/${bang.length} target đọc được` };
  return { du: new Set(v).size === bang.length, ly_do: `${new Set(v).size} giá trị khác nhau trên ${bang.length} target` };
};

console.log("## NEO NÀO PHÂN BIỆT ĐƯỢC HAI GHẾ");
for (const [nhan, lay] of [
  ["ⓐ email (danh_tinh)", (b) => b.email.join("|") || null],
  ["ⓑ org-button (phụ)", (b) => b.org_button],
  ["ⓒ org-uuid trong URL", (b) => b.org_uuid],
  ["ⓓ title (đối chứng ÂM)", (b) => b.title]
]) {
  const k = phanBiet(lay);
  console.log(`   ${nhan.padEnd(26)} ${k.du ? "PHÂN BIỆT ĐƯỢC" : "không"}  — ${k.ly_do}`);
}

const doiChung = phanBiet((b) => b.title);
if (doiChung.du) {
  console.log("\n⚠ ĐỐI CHỨNG ÂM HỎNG: `title` mà cũng phân biệt được thì hai target này khác nhau ở");
  console.log("  quá nhiều thứ, và mọi kết luận ở trên KHÔNG nói được neo nào là neo danh tính.");
}

console.log("\n## PHẠM VI CỦA LƯỢT ĐO NÀY — đọc trước khi trích");
console.log("   Đây là cấu hình NỀN: hai GHẾ, mỗi ghế một tài khoản. Nó KHÔNG phải thí nghiệm bác");
console.log("   bỏ mà V1 đã thiết kế (hai tài khoản trong CÙNG một ghế), nên nó KHÔNG trả lời được");
console.log("   câu \"ghế = tài khoản\". Nó chỉ trả lời: trên /workbench còn đọc được neo nào.");

const soGhi = nhatKy.filter((n) => TU_VUNG_GHI.includes(n.method)).length;
console.log(`\n## NHẬT KÝ DÂY — ${nhatKy.length} lượt · lệnh GHI: ${soGhi}`);
process.exit(coGhi || soGhi > 0 ? 1 : 0);
