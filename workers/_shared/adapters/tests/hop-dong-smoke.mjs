/* Phép ghim cho hợp đồng Site Adapter (Gap 4).
 *
 * Bộ này canh **bộ soát có ĐỎ được không**, không canh adapter Vizcom có chạy không. Một bộ
 * soát luôn trả `dat: true` sẽ xanh trọn vẹn dưới mọi adapter, kể cả adapter gõ `chrome.tabs`
 * vào giữa — nên mỗi khối cấm dưới đây đi kèm một adapter VI PHẠM cố ý, và khối chỉ đạt khi
 * bộ soát bắt được nó.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { soatAdapter, TU_VUNG_DOC, TU_VUNG_GHI } from "../hop-dong.mjs";
import { VIZCOM } from "../vizcom.mjs";

const thuMuc = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOP_LE = {
  id: "thu", origin: "https://vi-du.example/",
  danh_tinh: { selector: '[data-testid="x"]', chua: "abc" },
  viec: { a: [{ ten: "đọc", method: "scout.text", selector: '[data-testid="x"]' }] }
};

// ⓐ adapter hợp lệ thì ĐẠT — nếu khối này đỏ thì mọi khối "bắt được vi phạm" bên dưới vô nghĩa
assert.deepEqual(soatAdapter(HOP_LE), { dat: true, loi: [] });

// ⓑ ADAPTER VIZCOM THẬT PHẢI ĐẠT HỢP ĐỒNG CỦA CHÍNH NÓ
{
  const r = soatAdapter(VIZCOM);
  assert.ok(r.dat, `adapter Vizcom vi phạm hợp đồng: ${r.loi.join(" · ")}`);
}

// ⓒ THIẾU DANH TÍNH ⇒ TỪ CHỐI. Đây là khối đắt nhất bộ này: ba tài khoản Vizcom cùng origin,
//    cùng hình dạng URL, cùng title. Thiếu dòng danh tính là mời thao tác nhầm tài khoản.
{
  const r = soatAdapter({ ...HOP_LE, danh_tinh: undefined });
  assert.equal(r.dat, false);
  assert.ok(r.loi.some((x) => x.includes("danh_tinh")));
  assert.equal(soatAdapter({ ...HOP_LE, danh_tinh: { selector: '[data-testid="x"]' } }).dat, false, "có selector mà thiếu `chua` vẫn là thiếu danh tính");
  assert.equal(soatAdapter({ ...HOP_LE, danh_tinh: { a11y_chua: "x@y.z" } }).dat, true, "đường a11y là một danh tính hợp lệ");
}

// ⓓ LỜI GỌI TRÌNH DUYỆT THÔ ⇒ TỪ CHỐI
{
  for (const ban of [
    { ...HOP_LE, ghi_chu: "goi chrome.tabs.query cho nhanh" },
    { ...HOP_LE, viec: { a: [{ ten: "x", method: "scout.text", selector: "#a", meo: "Page.navigate" }] } },
    { ...HOP_LE, viec: { a: [{ ten: "x", method: "scout.text", selector: "#a", meo: "dung debugger" }] } }
  ]) assert.equal(soatAdapter(ban).dat, false, `phải bắt: ${JSON.stringify(ban).slice(0, 60)}`);
}

// ⓔ METHOD NGOÀI TỪ VỰNG ĐÓNG ⇒ TỪ CHỐI
{
  const r = soatAdapter({ ...HOP_LE, viec: { a: [{ ten: "x", method: "scout.eval", selector: "#a" }] } });
  assert.equal(r.dat, false);
  assert.ok(r.loi.some((x) => x.includes("từ vựng đóng")));
  assert.ok(!TU_VUNG_DOC.includes("scout.eval") && !TU_VUNG_GHI.includes("scout.eval"));
}

// ⓕ TOẠ Độ TỰ DO ⇒ TỪ CHỐI (luật gói duc-scouter mục 7)
{
  for (const k of ["x", "toa_do", "coordinate"]) {
    const r = soatAdapter({ ...HOP_LE, viec: { a: [{ ten: "bấm", method: "scout.click", selector: "#a", [k]: 120 }] } });
    assert.equal(r.dat, false, `phải bắt toạ độ khai bằng khoá \`${k}\``);
    assert.ok(r.loi.some((x) => x.includes("Toạ độ")));
  }
}

// ⓖ BƯỚC GHI KHÔNG KIỂM ĐƯỢC ⇒ TỪ CHỐI
{
  const r = soatAdapter({ ...HOP_LE, viec: { a: [{ ten: "bấm mù", method: "scout.click" }] } });
  assert.equal(r.dat, false);
}

// ⓗ SELECTOR NEO VÀO HASH styled-components ⇒ TỪ CHỐI.
//    Luật này rút thẳng từ phép đo 18/09: mọi class trên Vizcom là hash đổi theo mỗi lượt build.
{
  for (const s of ["Button__StyledButton-sc-1dj7csb-0", ".OrganizationSwitcher__StyledButton-sc-1n7j73-1", "div.Sidebar__SidebarItem-sc-1i9kobe-2"]) {
    const r = soatAdapter({ ...HOP_LE, viec: { a: [{ ten: "x", method: "scout.text", selector: s }] } });
    assert.equal(r.dat, false, `phải bắt hash: ${s}`);
    assert.ok(r.loi.some((x) => x.includes("styled-components")));
  }
  /* Đối chứng: `data-testid` và thuộc tính thường KHÔNG được báo nhầm — một bộ soát báo nhầm
   * thì người ta tắt nó đi, và tắt rồi thì luật ⑸ không còn tồn tại. */
  for (const s of ['[data-testid="organization-switcher-button"]', 'input[placeholder="Search all files"]', 'a[href^="/workbench/folder/"]', "iframe#intercom-frame"]) {
    assert.equal(soatAdapter({ ...HOP_LE, viec: { a: [{ ten: "x", method: "scout.text", selector: s }] } }).dat, true, `báo nhầm selector lành: ${s}`);
  }
}

// ⓘ FILE ADAPTER LÀ DỮ LIỆU: không `import`, không lời gọi, sau khi đã BÓC CHÚ THÍCH.
//    Bóc trước khi soi vì chính văn xuôi ở đầu file giải thích *"không gọi chrome.*"* — bản đầu
//    của phép ghim này đỏ vì khớp vào câu chú thích của chính nó (detectors-match-your-own-prose).
{
  for (const ten of fs.readdirSync(thuMuc).filter((f) => f.endsWith(".mjs") && f !== "hop-dong.mjs")) {
    const ma = fs.readFileSync(path.join(thuMuc, ten), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    assert.ok(!/^\s*import\s/m.test(ma), `${ten}: adapter là dữ liệu, không import gì cả`);
    assert.ok(!/\bchrome\s*\./.test(ma) && !ma.includes("debugger"), `${ten}: adapter không được chạm chrome.*/debugger`);
    assert.ok(!/\bgoi\s*\(/.test(ma), `${ten}: adapter không tự gọi Bridge — bộ chạy chung gọi thay`);
  }
}

// ⓙ VIZCOM: DANH TÍNH CHÍNH PHẢI LÀ EMAIL, WORKSPACE CHỈ ĐƯỢC LÀM PHỤ.
//    Đức chốt 18/09. Lý do không phải sở thích: tên workspace là thứ người ta ĐẶT ĐƯỢC, nên
//    hai tài khoản khác nhau có thể cùng mang một tên; không ai đặt trùng được một địa chỉ
//    email. Khối này ĐỎ nếu ai đảo hai trường lại — kể cả khi đảo xong pilot vẫn chạy xanh,
//    vì nó chạy xanh đúng cho tới ngày có hai workspace trùng tên.
{
  const { VIZCOM } = await import("../vizcom.mjs");
  assert.ok(VIZCOM.danh_tinh?.a11y_chua?.includes("@"),
    "`danh_tinh` của Vizcom phải là dấu hiệu TÀI KHOẢN (email), không phải tên workspace");
  assert.equal(VIZCOM.danh_tinh.selector, undefined,
    "danh tính chính đi đường a11y — khai thêm selector ở đây là mở lại đường quyết định theo workspace");
  assert.ok(!JSON.stringify(VIZCOM.danh_tinh).includes("Workspace"),
    "tên workspace KHÔNG được nằm trong danh tính chính");
  assert.ok(VIZCOM.danh_tinh_phu?.chua?.includes("Workspace"),
    "workspace vẫn phải được giữ — ở `danh_tinh_phu`, để in ra cho người đọc");
  assert.equal(VIZCOM.xac_nhan_truoc_khi_ghi, undefined,
    "cổng trước-khi-ghi cũ đã bị `khoaDanhTinh` thay: một trường còn sót lại là hai nguồn sự thật cho cùng một phép kiểm");
  assert.equal(soatAdapter(VIZCOM).dat, true);
}

console.log("hop-dong-smoke: 10 khối ĐẠT");
