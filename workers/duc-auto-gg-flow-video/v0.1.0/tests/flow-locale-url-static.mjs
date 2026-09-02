// Flow phục vụ cùng một dự án ở CẢ HAI dạng đường dẫn, có và không có locale.
//
// Đo thật 2026-09-02 trên hồ sơ `Bình`:
//   https://labs.google/fx/tools/flow/project/<id>        <- nhận
//   https://labs.google/fx/vi/tools/flow/project/<id>     <- TỪ CHỐI
//
// Hậu quả không hề giống nguyên nhân, và đó là lý do phép kiểm này tồn tại:
// `manifest.json` không khớp URL có locale → Chrome **không tiêm content
// script** → panel báo `composer_found: false` → triệu chứng nổi lên là
// **`RECEIVER_LOST`**, một mã lỗi chỉ thẳng vào "mất kết nối với tab". Người
// vận hành sẽ đi reload extension, reload tab, đổi hồ sơ — tất cả đều vô ích,
// vì thứ sai là một đoạn `/vi/` trên thanh địa chỉ. Mất ba lượt hỏi đáp mới
// tìm ra.
//
// HAI LỚP, CỐ Ý KHÔNG GIỐNG NHAU:
//   · manifest BUỘC phải rộng — match pattern của Chrome chỉ có `*` và nó nuốt
//     cả dấu gạch chéo, không có cách nào nói "đúng một đoạn".
//   · adapter thì SIẾT — đúng một đoạn, và đoạn đó phải có dạng mã ngôn ngữ.
// Manifest quyết định script CÓ ĐƯỢC NẠP không; adapter mới là cổng quyết định
// trang đó CÓ PHẢI Flow thật không. Nới lớp một mà quên siết lớp hai là biến
// một sự nới lỏng kỹ thuật thành một lỗ hổng thật.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const manifest = JSON.parse(fs.readFileSync(new URL("../manifest.json", import.meta.url), "utf8"));
const ctx = { window: {}, URL };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL("../provider-adapter.js", import.meta.url), "utf8"), ctx);
const ADAPTER = ctx.window.DacProviderAdapter;

/* ---- 1. manifest phải phủ CẢ HAI dạng ------------------------------------- */

const PLAIN = "https://labs.google/fx/tools/flow/*";
const LOCALE = "https://labs.google/fx/*/tools/flow/*";
const matches = manifest.content_scripts.flatMap((entry) => entry.matches);
for (const pattern of [PLAIN, LOCALE]) {
  assert.ok(matches.includes(pattern), `content_scripts thiếu ${pattern} — thiếu nó thì content script không được tiêm và triệu chứng sẽ là RECEIVER_LOST`);
  assert.ok(manifest.host_permissions.includes(pattern), `host_permissions thiếu ${pattern}`);
}

// Không được nới rộng hơn mức Đức đã duyệt (2026-09-02): vẫn phải nằm dưới
// labs.google và vẫn phải kết thúc bằng /tools/flow/*.
for (const pattern of matches) {
  assert.match(pattern, /^https:\/\/labs\.google\/fx\/(?:\*\/)?tools\/flow\/\*$/, `match pattern quá rộng so với mức đã duyệt: ${pattern}`);
}

/* ---- 2. adapter phải SIẾT hơn manifest ------------------------------------ */

const ACCEPT = [
  "https://labs.google/fx/tools/flow/project/575b20b1",
  "https://labs.google/fx/vi/tools/flow/project/e20b7325",
  "https://labs.google/fx/pt-BR/tools/flow/project/x",
  "https://labs.google/fx/tools/flow",
];
const REJECT = [
  // Đúng thứ manifest KHÔNG chặn nổi mà adapter phải chặn: nhiều đoạn ở giữa.
  "https://labs.google/fx/evil/path/tools/flow/x",
  "https://labs.google/fx/notalocale/tools/flow/x",
  // Công cụ khác của cùng site.
  "https://labs.google/fx/vi/tools/whisk/project/x",
  "https://labs.google/fx/tools/whisk",
  // Host khác.
  "https://evil.com/fx/vi/tools/flow/project/x",
  "https://labs.google.evil.com/fx/tools/flow/x",
];

for (const url of ACCEPT) {
  assert.equal(ADAPTER.isProviderUrl(url), true, `phải nhận: ${url}`);
  assert.equal(ADAPTER.surface(url), "CONVERSATION", `surface phải là CONVERSATION: ${url}`);
  assert.equal(ADAPTER.surfaceAllowed(url), true, `phải cho phép: ${url}`);
}
for (const url of REJECT) {
  assert.equal(ADAPTER.isProviderUrl(url), false, `phải từ chối: ${url}`);
  assert.equal(ADAPTER.surface(url), "WRONG", `surface phải là WRONG: ${url}`);
  assert.equal(ADAPTER.surfaceAllowed(url), false, `không được cho phép: ${url}`);
}

// Ghim thẳng điều "siết hơn": manifest cho lọt một đường mà adapter phải chặn.
const manifestWouldAllow = "https://labs.google/fx/evil/path/tools/flow/x";
assert.equal(ADAPTER.isProviderUrl(manifestWouldAllow), false,
  "adapter phải chặn được đường mà match pattern của manifest buộc phải cho lọt — nếu không, nới manifest là nới thật");

console.log(`flow locale URLs accepted, adapter still stricter than manifest (${ACCEPT.length} nhận / ${REJECT.length} từ chối): PASS`);
