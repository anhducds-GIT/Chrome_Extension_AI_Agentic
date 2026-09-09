/* B-14 ⑵ · MỎ NEO CẤU TRÚC cho chip đính kèm, và VÌ SAO nó phải ở nhóm RIÊNG.
 *
 * ĐO LIVE 2026-09-09 bằng `composerScope` (B-48), giữa lúc gắn ảnh, job chữ 2 ảnh, 0 credit.
 * Chip đính kèm của ChatGPT có hình dạng này:
 *
 *   div[role="group" aria-label="<TÊN FILE>"]
 *     ├ div > div[data-default-action="true"] > div > button[aria-label="Open image: …"]
 *     └ div > div > span[data-state="closed"] > button[aria-label="Remove file N: <TÊN FILE>"]
 *
 * Nên `B-14` đã có câu trả lời: CÓ mỏ neo không phụ thuộc ngôn ngữ giao diện.
 *
 * NHƯNG — và đây là điều file này tồn tại để ghim — KHÔNG được nhét chúng vào
 * `attachmentPreview`. Nhóm đó được ĐẾM rồi SO với SỐ FILE:
 *
 *     previewsReady = attachmentPreviewCount() >= previousPreviewCount + referenceImages.length
 *
 * Ba selector khớp BA phần tử khác nhau trên CÙNG một chip. Gộp vào là mỗi chip đếm thành 3,
 * nên một job 2 ảnh mới gắn xong 1 chip đã cho `3 >= 2` → cổng mở SỚM và runner gõ Gửi khi
 * còn thiếu một ảnh. File này CHẠY đúng phép đếm đó trên DOM giả một chip để chứng minh con
 * số, chứ không chỉ nói.
 *
 * TRẦN TUYÊN BỐ: DOM giả dựng theo chuỗi tổ tiên ĐO ĐƯỢC ngày 09/09, không phải chatgpt.com.
 * Nó ghim quan hệ SỐ HỌC giữa hai nhóm; nó không chứng minh ChatGPT sẽ giữ cấu trúc đó. Việc
 * canh chuyện đó là của `dom_probe`: nhóm `attachmentChip` được đếm mỗi lượt dò. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

/* ---- đọc selector THẬT từ adapter đã ship, không gõ lại ------------------ */
const ctx = { window: {} };
ctx.globalThis = ctx;
vm.runInNewContext(fs.readFileSync(new URL("../provider-adapter.js", import.meta.url), "utf8"), ctx);
const SEL = (ctx.window.DacProviderAdapter ?? ctx.DacProviderAdapter).SELECTORS;

assert.ok(Array.isArray(SEL.attachmentChip), "adapter phải có nhóm `attachmentChip`");
assert.equal(SEL.attachmentChip.length, 2, "hai mục đo được 09/09: khung chip theo `role=group`, và `data-default-action`");
assert.ok(SEL.attachmentChip.some((s) => s.includes('role="group"')), "phải có mục khung chip `role=group`");
assert.ok(SEL.attachmentChip.some((s) => s.includes("data-default-action")), "phải có mục `data-default-action`");
assert.equal(SEL.attachmentPreview.length, 5, "nhóm cũ giữ ĐÚNG 5 mục — thêm vào là phá phép đếm, xem phần dưới");
for (const moi of SEL.attachmentChip) {
  assert.ok(!SEL.attachmentPreview.includes(moi), `\`${moi}\` KHÔNG được nằm trong \`attachmentPreview\` — nó làm mỗi chip đếm thành nhiều`);
}

/* ---- KHÔNG chỗ nào trong runner đọc nhóm mới ----------------------------- */
// Lời khai "0 thay đổi hành vi" phải đo được, không phải hứa.
const shipped = ["content.js", "sidepanel.js", "runner-core.js", "reconciliation-core.js", "bridge-core.js", "plan-diagnostics-core.js", "bridge-proposal-core.js"];
for (const ten of shipped) {
  const ma = fs.readFileSync(new URL(`../${ten}`, import.meta.url), "utf8");
  assert.ok(!ma.includes("attachmentChip"), `${ten} KHÔNG được đọc \`attachmentChip\`: nhóm này chỉ để \`dom_probe\` đếm. Nối vào cổng trước-khi-gửi thì phải qua B-49 và Đức chốt.`);
}
// Và phép đếm cũ phải còn nguyên hình dạng "so với SỐ FILE" — đó là thứ bị phá nếu gộp nhóm.
const content = fs.readFileSync(new URL("../content.js", import.meta.url), "utf8");
assert.match(
  content,
  /attachmentPreviewCount\(\) >= previousPreviewCount \+ referenceImages\.length/,
  "phép đếm sẵn-sàng còn so với SỐ FILE — nếu dòng này đổi thì lý do tách nhóm cũng đổi, và phép ghim này phải được đọc lại"
);

/* ---- DOM giả, dựng theo chuỗi tổ tiên ĐO ĐƯỢC 09/09 ---------------------- */
function nut(tag, attrs = {}, con = []) {
  const node = {
    tagName: tag.toUpperCase(),
    attributes: Object.entries(attrs).map(([name, value]) => ({ name, value: String(value) })),
    _con: con,
    getAttribute(name) { const t = this.attributes.find((a) => a.name === name); return t ? t.value : null; },
  };
  for (const c of con) c.parentElement = node;
  return node;
}
const hauDue = (n) => (n._con || []).flatMap((c) => [c, ...hauDue(c)]);
function khopToken(node, token) {
  const m = token.match(/^([a-zA-Z*]*)((?:\[[^\]]+\])*)$/);
  assert.ok(m, `DOM giả chưa hiểu token: ${token}`);
  if (m[1] && m[1] !== "*" && node.tagName !== m[1].toUpperCase()) return false;
  for (const cai of m[2].match(/\[[^\]]+\]/g) || []) {
    const a = cai.slice(1, -1);
    const co = a.match(/^([\w-]+)(\*?=)"([^"]*)"$/);
    if (co) {
      const gt = node.getAttribute(co[1]);
      if (gt === null) return false;
      if (co[2] === "=" ? gt !== co[3] : !gt.includes(co[3])) return false;
    } else if (!node.attributes.some((x) => x.name === a)) return false;
  }
  return true;
}
/* Cắt biết dấu ngoặc: `aria-label*="Remove file"` có khoảng trắng NẰM TRONG giá trị, nên
   `split(/\s+/)` trần cắt giữa nó. Đã làm đỏ một phép ghim khác trong repo này. */
function catNgoai(s, dau) {
  const ra = []; let hien = "", sau = 0;
  for (const k of s) {
    if (k === "[") sau += 1;
    if (k === "]") sau -= 1;
    if (sau === 0 && dau.test(k)) { if (hien.trim()) ra.push(hien.trim()); hien = ""; continue; }
    hien += k;
  }
  if (hien.trim()) ra.push(hien.trim());
  return ra;
}
function khop(node, sel) {
  return catNgoai(sel, /,/).some((phan) => {
    const buoc = catNgoai(phan, /\s/);
    if (buoc.length === 1) return khopToken(node, buoc[0]);
    if (!khopToken(node, buoc[buoc.length - 1])) return false;
    let n = node.parentElement, con = buoc.slice(0, -1).reverse(), i = 0;
    while (n && i < con.length) { if (khopToken(n, con[i])) i += 1; n = n.parentElement; }
    return i === con.length;
  });
}
const dem = (goc, sel) => hauDue(goc).filter((n) => khop(n, sel)).length;

// Một chip, đúng hình dạng đo được.
const chip = (ten, so) => nut("div", { role: "group", "aria-label": ten }, [
  nut("div", {}, [nut("div", { "data-default-action": "true" }, [nut("div", {}, [
    nut("button", { type: "button", "aria-label": "Open image: User uploaded image" })])])]),
  nut("div", {}, [nut("div", {}, [nut("span", { "data-state": "closed" }, [
    nut("button", { type: "button", "aria-label": `Remove file ${so}: ${ten}` })])])]),
]);
const form = (chips) => nut("body", {}, [nut("form", {}, [
  ...chips, nut("input", { type: "file" }),
  nut("div", {}, [nut("button", { type: "submit", "aria-label": "Send prompt", "data-testid": "send-button" })]),
])]);

const nhomCu = SEL.attachmentPreview.join(", ");
const nhomMoi = SEL.attachmentChip.join(", ");
const gopLai = [...SEL.attachmentPreview, ...SEL.attachmentChip].join(", ");

/* ---- ca 1: hai chip — mỗi nhóm đếm ra CÁI GÌ --------------------------- */
const hai = form([chip("REF-A-HINH-TRON-DO.png", 1), chip("REF-B-HINH-VUONG-XANH.png", 2)]);
assert.equal(dem(hai, nhomCu), 2, "nhóm cũ đếm ĐÚNG số ảnh — một nút gỡ mỗi chip. Đây là tính chất phép đếm sẵn-sàng dựa vào");
assert.equal(dem(hai, nhomMoi), 4, "nhóm mới khớp HAI phần tử mỗi chip (khung + data-default-action) — nên nó KHÔNG đếm được số ảnh");

/* ---- ca 2: PHÉP ĐO CỦA CHÍNH LÝ DO TÁCH NHÓM --------------------------- */
// Một job 2 ảnh, mới gắn xong MỘT chip. Nền trước khi gắn = 0.
const mot = form([chip("REF-A-HINH-TRON-DO.png", 1)]);
const nen = 0, soFile = 2;
assert.ok(
  !(dem(mot, nhomCu) >= nen + soFile),
  "nhóm cũ: một chip trên hai ảnh thì cổng PHẢI còn đóng (1 >= 2 là sai) — đây là hành vi đúng đang có"
);
assert.ok(
  dem(mot, gopLai) >= nen + soFile,
  `nếu GỘP hai nhóm thì một chip đã cho ${dem(mot, gopLai)} >= 2 → cổng mở SỚM và runner gõ Gửi khi còn thiếu một ảnh. Đây là con số của lý do tách nhóm, không phải một câu văn`
);

/* ---- ca 3: chưa gắn ảnh thì nhóm mới im ------------------------------- */
const rong = form([]);
assert.equal(dem(rong, nhomMoi), 0, "chưa gắn ảnh → 0. Đo nền live 09/09 cũng cho 0 `data-default-action` trong ô soạn thảo");
assert.equal(dem(rong, nhomCu), 0);

/* ---- ca 4: mỏ neo mới KHÔNG phụ thuộc ngôn ngữ ------------------------ */
// Đây là chính vấn đề B-14: nhãn tiếng Anh chết thì nhóm cũ mù hẳn.
const tiengViet = (ten, so) => nut("div", { role: "group", "aria-label": ten }, [
  nut("div", {}, [nut("div", { "data-default-action": "true" }, [nut("div", {}, [
    nut("button", { type: "button", "aria-label": "Mở ảnh: ảnh người dùng tải lên" })])])]),
  nut("div", {}, [nut("div", {}, [nut("span", { "data-state": "closed" }, [
    nut("button", { type: "button", "aria-label": `Xoá tệp ${so}: ${ten}` })])])]),
]);
const viet = form([tiengViet("REF-A-HINH-TRON-DO.png", 1), tiengViet("REF-B-HINH-VUONG-XANH.png", 2)]);
assert.equal(dem(viet, nhomCu), 0, "đổi ngôn ngữ giao diện là nhóm cũ MÙ HẲN — chính rủi ro B-14 nêu, nay đo được thành số");
assert.equal(dem(viet, nhomMoi), 4, "nhóm mới vẫn thấy đủ hai chip khi nhãn đổi sang tiếng Việt");

console.log("attachment chip anchor (B-14 ⑵): PASS");
