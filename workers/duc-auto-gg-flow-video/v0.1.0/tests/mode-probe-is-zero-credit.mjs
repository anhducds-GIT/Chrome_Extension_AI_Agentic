// `diagnostics.mode_probe` phải là 0 CREDIT, và đó là điều duy nhất đáng ghim.
//
// Bối cảnh: F-14 hỏi một câu rất hẹp — nhóm nút cấu hình của Flow có nghe sự
// kiện pointer tổng hợp không? Trước lệnh này, cách duy nhất để biết là chạy một
// job thật: 6–7 credit cho một câu hỏi có/không.
//
// Nhưng một lệnh chẩn đoán mà BIẾT BẤM thì nguy hiểm hơn hẳn một lệnh chỉ đọc.
// Nó nằm sát ba thứ tốn tiền: nút Create, tuỳ chọn mode, và ô prompt. Phép kiểm
// này ghim đúng ba đường đó phải đóng — và ghim ở tầng NGUỒN, vì một lệnh chỉ
// chạy trên trang thật thì không có cách nào test hành vi mà không mở Chrome.
import assert from "node:assert/strict";
import fs from "node:fs";

const content = fs.readFileSync(new URL("../content.js", import.meta.url), "utf8");
const panel = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");

const start = content.indexOf('if (message.type === "DAC_MODE_PROBE") {');
assert.ok(start > -1, "handler DAC_MODE_PROBE phải tồn tại trong content.js");
const end = content.indexOf('if (message.type === "DAC_DOM_PROBE") {', start);
assert.ok(end > start, "không khoanh được vùng handler");
const handler = content.slice(start, end);

/* ---- 1. ba đường tốn tiền phải đóng ---------------------------------------- */

// (a) Không bao giờ bấm nút gửi. Đây là đường duy nhất tiêu credit.
assert.ok(!/findCreateButton|clickSend|sendButton/.test(handler),
  "mode_probe không được chạm tới nút Create dưới bất kỳ hình thức nào");

// (b) Không bao giờ gõ. Gõ không tốn credit, nhưng nó làm nút Create SÁNG LÊN
//     và để lại một ô prompt đã nạp sẵn — đúng cái bẫy đã gặp ngày 02/09, khi
//     một lượt dry_run để lại 141 ký tự và một nút Create đang sáng.
assert.ok(!/typeIntoFlowComposer|execCommand|insertText/.test(handler),
  "mode_probe không được gõ gì vào composer");

// (c) Không bao giờ CHỌN một tuỳ chọn mode. Mở bảng ra là quan sát; bấm vào một
//     tuỳ chọn là đổi cấu hình của Đức sau lưng anh ấy.
const presses = [...handler.matchAll(/pressFlowControl\(([^)]*)\)/g)].map((m) => m[1].trim());
assert.ok(presses.length > 0, "phải có ít nhất một cú bấm — nếu không thì nó không kiểm được gì");
for (const target of presses) {
  assert.equal(target, "before.button",
    `mode_probe chỉ được bấm chip cấu hình, không được bấm gì khác — đang bấm: ${target}`);
}
assert.ok(!/findVideoModeOption\(document\)\s*\)/.test(handler.replace(/const videoOption = [^;]*;/, "")),
  "tuỳ chọn Video chỉ được QUAN SÁT, không được truyền vào một cú bấm");

/* ---- 2. phải trả trang về nguyên trạng -------------------------------------- */

// Mở bảng rồi bỏ đó là để lại trang ở trạng thái Đức không đặt. Và lượt chạy sau
// sẽ gặp một bảng đang mở — đúng điều kiện đã làm hỏng một lượt ngày 28/08.
assert.match(handler, /if \(opened\) \{ pressFlowControl\(before\.button\);/,
  "mở được thì phải đóng lại, trả trang về nguyên trạng");
assert.match(handler, /panel_closed_again/, "phải báo lại là đã đóng được hay chưa");

/* ---- 3. phải trả về BẰNG CHỨNG, không chỉ một chữ có/không ------------------ */

// `appeared_labels` là lý do lệnh này đáng giá gấp đôi: nó vừa trả lời F-14, vừa
// là bằng chứng DOM để thêm nhãn tuỳ chọn Video cho locale khác (F-24) mà không
// phải dịch tay — đúng luật vàng 1.
for (const field of ["opened", "appeared_labels", "mode_before", "mode_after", "video_option_found_by_english_label"]) {
  assert.ok(handler.includes(field), `kết quả thiếu trường ${field}`);
}

/* ---- 4. dây nối: panel phải thật sự gọi tới nó ------------------------------ */

assert.match(panel, /async function bridgeModeProbe\(\)/, "panel phải có handler");
assert.match(panel, /send\(\{ type: "DAC_MODE_PROBE" \}\)/, "panel phải gửi đúng thông điệp");
for (const table of ['"diagnostics.mode_probe": withBridgeErrors(bridgeModeProbe)', '"diagnostics.mode_probe": bridgeModeProbe']) {
  assert.ok(panel.includes(table), `panel chưa đăng ký method ở bảng: ${table}`);
}

console.log("mode probe is zero-credit and reversible: PASS");
