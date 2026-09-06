// Ghim B-20 · "tên gọi ngắn cho ảnh mẫu" (alias) là CODE CHẾT.
//
// Bộ giải tham chiếu thử alias TRƯỚC, rồi mới tới tên file, rồi tới tên không
// đuôi. Nhưng KHÔNG có ô nhập alias ở đâu cả: cả hai đường nạp ảnh mẫu — hộp
// chọn file của Đức và `references.add` qua Bridge — đều ghi `alias: ""`, và
// mọi nhánh alias đều bị chặn bởi một điều kiện "khoá phải khác rỗng". Nên
// nhánh đó chưa từng chạy một lần nào.
//
// File này KHÔNG bảo "đừng bao giờ làm alias". Nó là cái chuông: ngày ai đó
// nối một ô nhập alias vào, file này ĐỎ và người đó phải mở lại B-20 rồi hỏi
// Đức, thay vì để `README.md` tiếp tục hứa một tính năng không tồn tại.
//
// TRẦN TUYÊN BỐ: phép kiểm TĨNH. Nó đọc mã, không chạy panel.

import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("../", import.meta.url);
const sidepanel = fs.readFileSync(new URL("sidepanel.js", root), "utf8");
const html = fs.readFileSync(new URL("sidepanel.html", root), "utf8");
const runner = fs.readFileSync(new URL("runner-core.js", root), "utf8");
const planDiag = fs.readFileSync(new URL("plan-diagnostics-core.js", root), "utf8");
const proposal = fs.readFileSync(new URL("bridge-proposal-core.js", root), "utf8");

/* ---- 1. Mọi đường ghi vào `state.files` đều đặt alias RỖNG --------------- */

// Hai chỗ dựng đối tượng file: hộp chọn file, và `references.add` qua Bridge.
const dungFile = [
  '{ ...(await dataUrl(file)), alias: "" }',
  'const file = { fileName: reference.name, dataUrl: reference.data_url, alias: "" };',
];
for (const doan of dungFile) {
  const n = sidepanel.split(doan).length - 1;
  assert.equal(n, 1, `đoạn dựng file tham chiếu phải khớp ĐÚNG 1 chỗ, đang khớp ${n}: ${doan}`);
}

// Và KHÔNG có đường ghi thứ ba. Bốn lời gọi, đúng bốn: nút xoá của gallery
// (`splice(index, 1)`), push của hộp chọn file, rồi splice-thay + push của
// `references.add` qua Bridge. Chỉ ba cái sau ĐƯA file mới vào, và cả ba đều
// dùng một trong hai đoạn dựng ở trên.
const ghiVaoFiles = (sidepanel.match(/state\.files\.(push|splice)\(/g) || []).length;
assert.equal(
  ghiVaoFiles,
  4,
  `phải có ĐÚNG 4 lời gọi ghi vào state.files, đang đếm ${ghiVaoFiles} — con số khác nghĩa là có đường nạp ảnh mẫu mới, và nó có thể mang alias thật`
);

// Không có ô nhập alias trên giao diện.
assert.doesNotMatch(html, /alias/i, "`sidepanel.html` không được có ô nhập alias — có thì tính năng đã sống và B-20 phải mở lại");

/* ---- 2. Cả BA bản sao logic khớp alias đều chặn khoá rỗng ---------------- */
//
// Ba module khớp alias song song nhau. Nếu một cái bỏ chốt "khoá khác rỗng"
// trong khi alias luôn là "", thì MỌI file sẽ khớp MỌI token và job nào cũng
// thành AMBIGUOUS_REFERENCE. Đó là lý do chốt này quan trọng hơn nó trông.
for (const [ten, doan, chot] of [
  ["runner-core.js", runner, 'files.filter((file) => normalise(file.alias) === key && key)'],
  ["plan-diagnostics-core.js", planDiag, 'files.filter((file) => key && normalise(file.alias) === key)'],
  ["bridge-proposal-core.js", proposal, 'files.filter((file) => referenceKey(file.alias) === key && key)'],
]) {
  const n = doan.split(chot).length - 1;
  assert.equal(n, 1, `${ten}: nhánh khớp alias phải còn chốt "khoá khác rỗng", khớp ${n} chỗ`);
}

// Và chốt chống trùng alias vẫn bỏ qua alias rỗng — nếu không thì hai file bất
// kỳ (alias đều "") sẽ ném DUPLICATE_ALIAS và không run nào chạy nổi.
assert.match(
  runner,
  /const alias = normalise\(file\.alias\);\s*\n\s*if \(!alias\) continue;/,
  "runner-core.js: `aliases()` phải bỏ qua alias rỗng trước khi kiểm trùng"
);

console.log("reference alias dead code static (B-20): PASS");
