/* HỢP ĐỒNG SITE ADAPTER — Gap 4 của `duc-scouter/v0.1.0/docs/UNIVERSAL-SCOUTER.md`.
 *
 * Một adapter là DỮ LIỆU. Nó khai một trang: origin · danh tính · selector · bước việc · bằng
 * chứng xong. Nó KHÔNG chạy gì cả — bộ chạy chung gọi `scout.*` thay nó.
 *
 * ─── VÌ SAO CẦN MỘT BỘ SOÁT CHỨ KHÔNG PHẢI MỘT TRANG TÀI LIỆU ──────────────
 * Pilot 18/09 chứng minh hình dạng này chạy được. Nhưng *"chạy được một lần"* không chặn được
 * trang thứ hai lén gõ `chrome.*` vào, hay lén sửa lõi Scouter cho riêng nó — mà đó đúng là
 * thứ cả nghiên cứu đi chứng minh là không được làm. Luật không có máy canh thì nó vỡ trong
 * im lặng; đây là cái máy canh.
 *
 * ─── LUẬT ⑸ RÚT THẲNG TỪ PHÉP ĐO, KHÔNG PHẢI TỪ TRỰC GIÁC ──────────────────
 * Quét DOM thật của Vizcom 18/09: mọi `class` trên trang là hash của styled-components
 * (`Button__StyledButton-sc-1dj7csb-0 XbHEH`). Những chuỗi đó đổi theo **mỗi lượt build của
 * nhà cung cấp**, nên một adapter neo vào chúng sẽ hỏng vào một ngày không ai đụng repo này.
 * Cùng trang ấy có `[data-testid="organization-switcher-button"]` — ổn định, có nghĩa, và
 * `matchCount=1`. Nên luật không phải *"nên dùng data-testid"*, nó là **cấm neo vào hash**.
 */

/** Từ vựng `scout.*` một adapter được phép gọi. Mở rộng danh sách này là ĐỔI LUẬT AN TOÀN
 *  (luật gói duc-scouter mục 4) — hỏi Đức, đừng tự thêm. */
export const TU_VUNG_DOC = [
  "scout.targets", "scout.page", "scout.view", "scout.query", "scout.text",
  "scout.tree", "scout.a11y", "scout.wait", "scout.network", "scout.shot"
];
export const TU_VUNG_GHI = [
  "scout.click", "scout.chon", "scout.hover", "scout.scroll", "scout.history",
  "scout.type", "scout.key", "scout.clear", "scout.fetch", "scout.grab",
  "scout.navigate", "scout.reload", "scout.upload", "scout.tha"
];

/* Hash của styled-components: `-sc-` rồi một cụm chữ-số. Bắt cả `sc-1dj7csb-0` lẫn
 * `Sidebar__SidebarItem-sc-1i9kobe-2`. */
const HASH_STYLED = /-sc-[a-z0-9]{5,}/i;

/* Method CDP có dạng `Miền.tênMethod` — miền viết hoa, tên method **viết thường** ở ký tự đầu
 * (`Page.navigate`, `DOM.getDocument`, `Input.dispatchMouseEvent`). Bản đầu của khối này viết
 * `[A-Z]` sau dấu chấm, tức nó **không bao giờ kêu** — một bộ dò rỗng, và phép ghim ⓓ bắt được
 * nó ngay lượt chạy đầu. Giữ lại chú thích này vì bộ dò rỗng đọc y hệt bộ dò đã kiểm. */
const CAM_TRONG_MA = [/\bchrome\s*\./, /\bdebugger\b/, /\bPage\.[a-zA-Z]/, /\bDOM\.[a-zA-Z]/, /\bInput\.[a-zA-Z]/, /\bRuntime\.[a-zA-Z]/];

/**
 * Soát một descriptor. Trả `{ dat: true }` hoặc `{ dat: false, loi: [...] }`.
 * KHÔNG ném: người gọi phải thấy HẾT lỗi một lượt, chứ không sửa một lỗi rồi chạy lại để
 * gặp lỗi kế tiếp.
 */
export function soatAdapter(d) {
  const loi = [];
  const co = (x) => typeof x === "string" && x.length > 0;

  if (!co(d?.id)) loi.push("thiếu `id`.");
  if (!co(d?.origin)) loi.push("thiếu `origin`.");
  else if (!/^https?:\/\//.test(d.origin)) loi.push("`origin` phải là http(s) tuyệt đối — tiền tố lỏng khớp nhầm trang.");

  /* ⑴ DANH TÍNH LÀ BẮT BUỘC, không có ngoại lệ. Ba tài khoản Vizcom dùng cùng origin và cùng
   *    hình dạng URL; thiếu dòng này là adapter mời người ta thao tác nhầm tài khoản. */
  const dt = d?.danh_tinh;
  const dtOk = (co(dt?.selector) && typeof dt?.chua === "string") || co(dt?.a11y_chua);
  if (!dtOk) loi.push("thiếu `danh_tinh` — `{ selector, chua }` hoặc `{ a11y_chua }`. Đúng URL KHÔNG có nghĩa đúng trang, và với site nhiều tài khoản thì còn không có nghĩa đúng người.");

  /* ⑵ Không lời gọi trình duyệt thô. Adapter là dữ liệu. */
  const chuoi = JSON.stringify(d ?? {});
  for (const c of CAM_TRONG_MA) {
    if (c.test(chuoi)) loi.push(`adapter chứa lời gọi trình duyệt thô khớp ${c} — adapter chỉ được khai, bộ chạy chung mới gọi.`);
  }

  /* ⑶ Mọi bước phải nằm trong từ vựng đóng. */
  const buoc = Array.isArray(d?.viec) ? d.viec : Object.values(d?.viec ?? {}).flat();
  for (const b of buoc) {
    if (!co(b?.method)) { loi.push(`bước ${JSON.stringify(b?.ten ?? b)} thiếu \`method\`.`); continue; }
    if (!TU_VUNG_DOC.includes(b.method) && !TU_VUNG_GHI.includes(b.method)) {
      loi.push(`bước "${b.ten ?? b.method}" gọi \`${b.method}\` — ngoài từ vựng đóng. Thêm method là đổi luật an toàn, hỏi Đức.`);
    }
    /* ⑷ Toạ độ không bao giờ đến từ adapter (luật gói duc-scouter mục 7). */
    if (b.x !== undefined || b.y !== undefined || b.toa_do !== undefined || b.coordinate !== undefined) {
      loi.push(`bước "${b.ten ?? b.method}" khai toạ độ. Toạ độ suy từ hộp của phần tử đã khớp, không nhận từ ngoài dây.`);
    }
    if (TU_VUNG_GHI.includes(b.method) && !co(b.bang_chung_xong) && !co(b.selector)) {
      loi.push(`bước GHI "${b.ten ?? b.method}" không khai \`selector\` lẫn \`bang_chung_xong\` — một lệnh ghi không kiểm được là một lệnh không biết nó có chạy không.`);
    }
  }

  /* ⑸ Cấm neo vào hash của styled-components — xem đầu file. */
  const moiSelector = [dt?.selector, ...Object.values(d?.be_mat ?? {}), ...buoc.map((b) => b?.selector)].filter(co);
  for (const s of moiSelector) {
    if (HASH_STYLED.test(s)) loi.push(`selector \`${s}\` neo vào hash của styled-components — chuỗi đó đổi theo mỗi lượt build của nhà cung cấp, và nó sẽ hỏng vào một ngày không ai đụng repo này.`);
  }

  return loi.length ? { dat: false, loi } : { dat: true, loi: [] };
}
