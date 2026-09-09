/* B-48 · `diagnostics.dom_probe` phải soi được CHIP ĐÍNH KÈM trong ô soạn thảo.
 *
 * ĐO LIVE 2026-09-09, và đây là hình dạng của khiếm khuyết: probe có trường `buttons`
 * nắp **40 mục**, còn thanh bên ChatGPT của Đức (10 project + lịch sử hội thoại) sinh
 * **hơn 40** nút nhìn thấy được. Nên bốn nút "Remove file" của bốn ảnh vừa gắn
 * **không bao giờ** vào danh sách — đúng cái mục `B-14` cần xem để tìm một mỏ neo theo
 * CẤU TRÚC thay cho `aria-label` tiếng Anh.
 *
 * Vì sao không nới nắp 40 lên 200: payload probe có nắp **64KB**, và thanh bên sẽ ăn
 * thêm bao nhiêu cũng hết — nới nắp là mua thêm chỗ cho đúng thứ gây nghẽn. Cửa ra là
 * soi **theo phạm vi**.
 *
 * Và một bằng chứng ÂM của cùng buổi đo, nó quyết định hình dạng của trường mới:
 * census `data-testid` toàn tài liệu (top 12 theo số lần) **không có** mục nào liên quan
 * đính kèm, mà bốn chip cùng testid sẽ đếm 4 → đứng thứ hai → vắng mặt là bằng chứng
 * thật. Nên ChatGPT **không** đặt `data-testid` lên chip, và một chuỗi tổ tiên chỉ soi
 * `data-*` sẽ mù đúng chỗ nó sinh ra để chữa. Chuỗi mới phải mang cả `aria-*` và `role`.
 *
 * File này KHÔNG grep mã. Nó CẮT khối đã ship ra khỏi `content.js` rồi CHẠY trong
 * `node:vm` trên các DOM giả — gồm một DOM dựng lại đúng ca live: 45 nút thanh bên
 * cộng 4 chip đính kèm.
 *
 * TRẦN TUYÊN BỐ: DOM giả, không phải chatgpt.com. Nó chứng minh phép SOI đúng phạm vi
 * và chuỗi tổ tiên mang đủ loại thuộc tính; nó KHÔNG chứng minh chip thật có hình gì.
 * Cái đó chỉ một lượt đo live sau khi Đức nạp lại tiện ích mới nói được (`B-14`). */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const content = fs.readFileSync(new URL("../content.js", import.meta.url), "utf8").split("\r\n").join("\n");

/* ---- cắt khối đã ship ---------------------------------------------------- */
const startAnchor = "        // B-48 · SOI RIÊNG TRONG Ô SOẠN THẢO";
const endAnchor = "        const poll = findAbPoll();";
const start = content.indexOf(startAnchor);
const end = content.indexOf(endAnchor);
assert.ok(start > 0, `content.js còn giữ khối "${startAnchor.trim()}" — nếu nó dời chỗ thì phép ghim này phải đi theo, KHÔNG được xoá`);
assert.ok(end > start, "khối soi ô soạn thảo còn đứng ngay trên `const poll = findAbPoll()`");
const block = content.slice(start, end);

/* Khối này phải đi qua adapter, không được viết lại selector lần thứ hai. Hai bản sao
   của cùng một selector là đúng cái đã làm mẫu chữ của probe mù suốt một tuần. */
assert.match(block, /document\.querySelector\(SEL\.fileInput\)/, "phải tìm form qua `SEL.fileInput` của adapter");
assert.match(block, /SEL\.attachmentPreview\.join/, "phải đọc nhóm `attachmentPreview` của adapter, không chép lại danh sách");
/* Bỏ dòng chú thích trước khi kiểm: chú thích của khối CÓ nhắc `form input[type="file"]`
   để nói rõ `SEL.fileInput` là gì, và một phép kiểm không phân biệt được mã với chú thích
   sẽ đỏ vì đúng cái câu giải thích nó. Đã đỏ một lần khi viết file này. */
const maThuan = block.split("\n").filter((dong) => !/^\s*\/\//.test(dong)).join("\n");
assert.ok(
  !/querySelectorAll\(['"`]form /.test(maThuan) && !/input\[type=/.test(maThuan),
  "không được có selector ô-chọn-file viết cứng trong MÃ của khối này — nó sẽ trôi khỏi adapter"
);
/* Chuỗi tổ tiên phải nhận cả `aria-` và `role`, không chỉ `data-`. Đây là phép ghim
   chống đúng cái mù mà trường này sinh ra để chữa. */
assert.match(block, /\^\(data-\|aria-\)/, "chuỗi tổ tiên phải lọc cả `data-` VÀ `aria-`");
assert.match(block, /=== "role"/, "chuỗi tổ tiên phải giữ `role`");

/* Và probe phải THẬT SỰ mang trường đó ra ngoài — tính được mà không ai đọc thì bằng không. */
assert.match(content, /fileInputs, composerScope,/, "`composerScope` phải nằm trong payload của probe");

const chay = vm.runInNewContext(
  `(function (document, SEL) {\n${block}\nreturn { composerScope, composerChain, composerForm };\n})`
);

/* ---- DOM giả, đủ rộng cho đúng những selector khối này hỏi ---------------- */
// Hỗ trợ: `*`, `tag`, `[attr]`, `[attr="v"]`, `[attr*="v"]`, `tag[attr*="v"]`,
// danh sách phân cách bằng dấu phẩy, và MỘT cấp hậu duệ (`form input[type="file"]`).
function nut(tag, attrs = {}, con = [], text = "") {
  const node = {
    tagName: tag.toUpperCase(),
    attributes: Object.entries(attrs).map(([name, value]) => ({ name, value: String(value) })),
    innerText: text,
    parentElement: null,
    _con: con,
    getAttribute(name) {
      const thay = this.attributes.find((a) => a.name === name);
      return thay ? thay.value : null;
    },
    closest(sel) {
      let n = this;
      while (n) { if (khopMotToken(n, sel)) return n; n = n.parentElement; }
      return null;
    },
    querySelectorAll(sel) { return hauDue(this).filter((n) => khop(n, sel)); },
  };
  for (const c of con) c.parentElement = node;
  return node;
}
function hauDue(node) {
  const ra = [];
  for (const c of node._con || []) { ra.push(c); ra.push(...hauDue(c)); }
  return ra;
}
function khopMotToken(node, token) {
  const t = token.trim();
  if (t === "*") return true;
  const m = t.match(/^([a-zA-Z*]*)((?:\[[^\]]+\])*)$/);
  if (!m) throw new Error(`DOM giả chưa hiểu token: ${t}`);
  const [, tag, phanAttr] = m;
  if (tag && tag !== "*" && node.tagName !== tag.toUpperCase()) return false;
  for (const cai of phanAttr.match(/\[[^\]]+\]/g) || []) {
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
/* Cắt phải BIẾT DẤU NGOẶC. `button[aria-label*="Remove attachment"]` có khoảng trắng
   NẰM TRONG giá trị thuộc tính, nên `split(/\s+/)` trần cắt đúng giữa nó và DOM giả
   báo "chưa hiểu token" — đã đỏ một lần khi viết file này, và nó đỏ vì cái harness
   sai, không vì mã đang thử. Cắt theo dấu ngoặc thì cả hai loại đều đúng. */
function catNgoai(chuoi, dauCat) {
  const ra = []; let hien = "", sau = 0;
  for (const ky of chuoi) {
    if (ky === "[") sau += 1;
    if (ky === "]") sau -= 1;
    if (sau === 0 && dauCat.test(ky)) { if (hien.trim()) ra.push(hien.trim()); hien = ""; continue; }
    hien += ky;
  }
  if (hien.trim()) ra.push(hien.trim());
  return ra;
}
function khop(node, sel) {
  return catNgoai(sel, /,/).some((phan) => {
    const buoc = catNgoai(phan, /\s/);
    if (buoc.length === 1) return khopMotToken(node, buoc[0]);
    if (buoc.length !== 2) throw new Error(`DOM giả chỉ hiểu 1-2 cấp: ${phan}`);
    if (!khopMotToken(node, buoc[1])) return false;
    let n = node.parentElement;
    while (n) { if (khopMotToken(n, buoc[0])) return true; n = n.parentElement; }
    return false;
  });
}
function taiLieu(goc) {
  return {
    querySelector(sel) { return hauDue(goc).find((n) => khop(n, sel)) || null; },
    querySelectorAll(sel) { return hauDue(goc).filter((n) => khop(n, sel)); },
  };
}

const SEL = {
  fileInput: 'form input[type="file"]',
  attachmentPreview: [
    '[data-testid*="attachment"]',
    '[data-testid*="file-upload"]',
    '[data-testid*="upload-preview"]',
    'button[aria-label*="Remove attachment"]',
    'button[aria-label*="Remove file"]',
  ],
};

/* ---- ca 1: DỰNG LẠI ĐÚNG CA LIVE 09/09 ----------------------------------- */
// 45 nút thanh bên (thật hơn 40, tức vượt nắp cũ) + 4 chip đính kèm trong form.
const thanhBen = nut("nav", { "data-sidebar": "root" },
  Array.from({ length: 45 }, (_, i) => nut("button", { "aria-label": `Open project options for P${i}`, "data-testid": `history-item-${i}-options` })));

const chip = (ten) => nut("div", { role: "group" }, [
  nut("span", {}, [], ten),
  nut("button", { "aria-label": `Remove file ${ten}`, type: "button" }),
]);

const form = nut("form", { "data-type": "unified-composer" }, [
  nut("div", { "data-attachments-row": "" }, ["A", "B", "C", "D"].map(chip)),
  nut("input", { type: "file", multiple: "" }),
  nut("div", {}, [nut("button", { "aria-label": "Send prompt", "data-testid": "send-button" })]),
]);

const live = chay(taiLieu(nut("body", {}, [thanhBen, form])), SEL);

assert.equal(live.composerScope.found, true, "tìm được form soạn thảo qua ô chọn file");

// ĐÂY là phép khẳng định mà mã cũ KHÔNG thể vượt: 45 nút thanh bên đứng trước, và với
// một danh sách nút toàn tài liệu nắp 40 thì bốn nút "Remove file" bị đẩy ra ngoài.
const goXoa = live.composerScope.buttons.filter((b) => /^Remove file/.test(b.aria));
assert.equal(goXoa.length, 4, `bốn nút gỡ của bốn chip phải có mặt, đang thấy ${goXoa.length} — soi theo phạm vi thì thanh bên không ăn được nắp`);
assert.ok(
  !live.composerScope.buttons.some((b) => /Open project options/.test(b.aria)),
  "không nút thanh bên nào được lọt vào phạm vi ô soạn thảo — lẫn vào là nắp lại bị ăn"
);

// Và chuỗi tổ tiên phải mang đủ loại thuộc tính. Chỉ `data-*` là mù, vì ChatGPT không
// đặt `data-testid` nào lên chip (đo live 09/09).
assert.equal(live.composerScope.preview_chains.length, 4, "bốn chip → bốn chuỗi tổ tiên");
const chuoi = live.composerScope.preview_chains[0];
assert.match(chuoi, /aria-label="Remove file/, "chuỗi phải mang `aria-label` — mỏ neo duy nhất đang sống");
assert.match(chuoi, /role="group"/, "chuỗi phải mang `role` của khối bọc chip — đây là ứng viên mỏ neo CẤU TRÚC mà B-14 đi tìm");
assert.match(chuoi, /data-attachments-row/, "chuỗi phải mang `data-*` của hàng đính kèm");
assert.match(chuoi, /form\[.*data-type="unified-composer"/, "chuỗi phải đi tới `form` — biên trên của phạm vi");

// Tên thuộc tính `data-*` trong form, và KHÔNG có tên của thanh bên.
assert.ok(live.composerScope.data_attr_names.includes("data-attachments-row"), "báo tên `data-*` thấy trong form");
assert.ok(!live.composerScope.data_attr_names.includes("data-sidebar"), "không báo `data-*` của thanh bên");

/* `deepEqual` KHÔNG dùng được ở đây: mảng trả về từ `node:vm` mang prototype của realm
   khác, nên `deepStrictEqual` đỏ trong khi hai bên cùng là mảng rỗng (đã đỏ một lần khi
   viết file này, và nó đọc y hệt một bản vá hỏng). So bằng `.length`. */

/* ---- ca 2: chưa gắn ảnh nào -------------------------------------------- */
const trongForm = nut("form", {}, [nut("input", { type: "file" })]);
const rong = chay(taiLieu(nut("body", {}, [thanhBen, trongForm])), SEL);
assert.equal(rong.composerScope.found, true, "form vẫn tìm được khi chưa có chip");
assert.equal(rong.composerScope.preview_chains.length, 0, "chưa gắn ảnh thì không có chuỗi nào — đây là nền để so, và không được ném");

/* ---- ca 3: không có ô chọn file trong form nào — PHẢI FAIL MỀM --------- */
// Trang phóng của ChatGPT không có composer đầy đủ. Probe là công cụ CHẨN ĐOÁN: nó ném
// thì mọi trường khác cũng mất theo, và người đọc mất luôn thứ đang cần để chẩn đoán.
const khongForm = chay(taiLieu(nut("body", {}, [thanhBen, nut("div", {}, [nut("input", { type: "file" })])])), SEL);
assert.equal(khongForm.composerScope.found, false, "ô chọn file ngoài form thì không tính là ô soạn thảo");
assert.equal(khongForm.composerScope.buttons.length, 0, "không có form → danh sách nút rỗng, không phải ném");
assert.equal(khongForm.composerScope.preview_chains.length, 0);
assert.equal(khongForm.composerScope.data_attr_names.length, 0);

/* ---- ca 4: NẮP. Một hàng 30 chip không được làm vỡ payload 64KB -------- */
const formTo = nut("form", {}, [
  nut("div", { "data-attachments-row": "" }, Array.from({ length: 30 }, (_, i) => chip(`F${i}`))),
  nut("input", { type: "file" }),
]);
const to = chay(taiLieu(nut("body", {}, [formTo])), SEL);
assert.ok(to.composerScope.buttons.length <= 20, `nắp 20 nút, đang có ${to.composerScope.buttons.length}`);
assert.ok(to.composerScope.preview_chains.length <= 4, `nắp 4 chuỗi, đang có ${to.composerScope.preview_chains.length}`);
assert.ok(to.composerScope.data_attr_names.length <= 24, `nắp 24 tên thuộc tính, đang có ${to.composerScope.data_attr_names.length}`);
assert.ok(JSON.stringify(to.composerScope).length < 12 * 1024, `trường này phải nhỏ so với nắp payload 64KB, đang ${JSON.stringify(to.composerScope).length} byte`);

console.log("dom_probe composer scope (B-48): PASS");
