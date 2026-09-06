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
// Nhà thứ hai, đo thật 2026-09-06: Google dời Flow sang domain riêng
// https://flow.google.com/project/<id>. Đức duyệt cùng ngày, nguyên văn:
// "thêm domain mới, GIỮ luôn domain cũ" — vì chưa ai đo được Google còn phục
// vụ song song bao lâu, và bỏ domain cũ là tự chuốc rủi ro đổi lấy gọn gàng.
const NEW_HOME = "https://flow.google.com/*";
const matches = manifest.content_scripts.flatMap((entry) => entry.matches);
for (const pattern of [PLAIN, LOCALE, NEW_HOME]) {
  assert.ok(matches.includes(pattern), `content_scripts thiếu ${pattern} — thiếu nó thì content script không được tiêm và triệu chứng sẽ là RECEIVER_LOST`);
  assert.ok(manifest.host_permissions.includes(pattern), `host_permissions thiếu ${pattern}`);
}

// Không được nới rộng hơn mức Đức đã duyệt (2026-09-02): vẫn phải nằm dưới
// labs.google và vẫn phải kết thúc bằng /tools/flow/*.
// Hai muc duyet, hai ngay, ke rieng ra chu KHONG gop thanh mot bieu thuc rong
// hon ca hai - gop la danh mat dung cai ranh gioi ma dong nay ton tai de giu.
const DUOC_DUYET = [
  /^https:\/\/labs\.google\/fx\/(?:\*\/)?tools\/flow\/\*$/,   // Duc duyet 02/09
  /^https:\/\/flow\.google\.com\/\*$/,                        // Duc duyet 06/09
];
for (const pattern of matches) {
  assert.ok(DUOC_DUYET.some((duyet) => duyet.test(pattern)), `match pattern qua rong so voi muc da duyet: ${pattern}`);
}
// Va chieu nguoc lai: moi muc da duyet phai con khop mot pattern that. Mot
// dong duyet chet la mot cua mo san ma khong ai con nho vi sao no mo.
for (const duyet of DUOC_DUYET) {
  assert.ok(matches.some((pattern) => duyet.test(pattern)), `muc duyet khong con khop match pattern nao: ${duyet}`);
}

/* ---- 2. adapter phải SIẾT hơn manifest ------------------------------------ */

const ACCEPT = [
  "https://labs.google/fx/tools/flow/project/575b20b1",
  "https://labs.google/fx/vi/tools/flow/project/e20b7325",
  "https://labs.google/fx/pt-BR/tools/flow/project/x",
  "https://labs.google/fx/tools/flow",
  // Nhà mới (06/09). Đoạn locale chưa có bằng chứng trên domain này, nhưng chừa
  // sẵn chỗ cho nó là miễn phí, còn thiếu nó thì lặp lại đúng lỗi 02/09.
  "https://flow.google.com/project/575b20b1-e19c-4e33-b3ab-bedb5dc9e880",
  "https://flow.google.com/vi/project/e20b7325",
  "https://flow.google.com/",
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
  // Nhà mới: manifest buộc phải cho lọt CẢ DOMAIN (match pattern của Chrome
  // không nói được "chỉ /project/"), nên adapter là lớp duy nhất chặn được.
  "https://flow.google.com/settings",
  "https://flow.google.com/evil/path/project/x",
  "https://flow.google.com.evil.com/project/x",
  "https://notflow.google.com/project/x",
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

// Domain mới làm khoảng cách giữa hai lớp RỘNG HẲN, nên chỗ này nay đáng giá
// hơn trước: mẫu "https://flow.google.com/*" cho lọt MỌI đường dẫn trên domain
// đó. Adapter là thứ duy nhất nói được "chỉ trang chủ và /project/".
assert.equal(ADAPTER.isProviderUrl("https://flow.google.com/settings"), false,
  "manifest cho lọt cả domain mới, nên adapter phải là lớp nói được chỉ trang chủ và /project/");
assert.equal(ADAPTER.surface("https://flow.google.com/settings"), "WRONG");

/* ---- 3. NHÃN NÚT cũng bị dịch, và đó là bẫy nguy hiểm hơn URL ------------- */

// Đo thật trên hồ sơ `Bình`: giao diện tiếng Việt dịch cả nhãn nút.
//     "arrow_forward Create" -> "arrow_forward Tạo"
//     "add_2 Create"         -> "add_2 Tạo"
// Cấu trúc DOM y hệt, chỉ chữ khác — nên URL sửa xong rồi vẫn không chạy được.
const adapterSource = fs.readFileSync(new URL("../provider-adapter.js", import.meta.url), "utf8");
const labelBlock = adapterSource.slice(adapterSource.indexOf("const CREATE_BUTTON_LABELS"), adapterSource.indexOf("function isCreateButtonLabel"));
for (const label of ["arrow_forward Create", "arrow_forward Tạo"]) {
  assert.ok(labelBlock.includes(label), `danh sách nhãn nút gửi thiếu ${JSON.stringify(label)}`);
}

// MỖI nhãn phải kèm trích nguồn bằng chứng ngay trên dòng đó — luật vàng 1.
// Thiếu trích nguồn nghĩa là ai đó đã dịch tay một nhãn thay vì đo nó.
for (const line of labelBlock.split(String.fromCharCode(10)).filter((l) => l.includes("arrow_forward"))) {
  assert.match(line, /\/\/\s*\w+\s*—\s*evidence\//, `nhãn nút phải trích nguồn bằng chứng: ${line.trim()}`);
}

// VÀ ĐÂY LÀ CHỖ NGUY HIỂM: ở tiếng Việt CẢ HAI nút đều kết thúc bằng "Tạo".
// Bất kỳ cách so khớp nào chỉ nhìn chữ sau ligature đều nuốt luôn `add_2 Tạo` —
// đúng nút mở bảng media đã gây mất credit 28/08. Và một quy tắc chỉ so tiền tố
// ligature thì nuốt luôn near-miss `arrow_forward Recreate` mà file
// provider-adapter-static.mjs cố ý chặn. Nên cách so khớp phải là DANH SÁCH
// CHÍNH XÁC — tôi đã thử quy tắc tiền tố ngày 02/09 và bỏ nó vì đúng lý do này.
assert.match(labelBlock, /Object\.freeze\(\[/, "danh sách nhãn phải là danh sách đóng băng, không phải một quy tắc so khớp mờ");
assert.ok(!/\^arrow_forward\s/.test(adapterSource), "không được quay lại so khớp theo tiền tố ligature: nó nuốt cả 'arrow_forward Recreate'");
const matcher = adapterSource.slice(adapterSource.indexOf("function isCreateButtonLabel"), adapterSource.indexOf("function isCreateButtonLabel") + 200);
assert.match(matcher, /CREATE_BUTTON_LABELS\.includes\(/, "so khớp phải là so bằng CHÍNH XÁC với danh sách đã đo");

console.log(`flow locale URLs accepted, adapter still stricter than manifest (${ACCEPT.length} nhận / ${REJECT.length} từ chối): PASS`);

/* ---- 4. Ba câu báo lỗi cũng phải chỉ về nhà mới ------------------------- */

// Ba câu này là thứ người vận hành đọc khi lạc trang. Để chúng chỉ về một
// địa chỉ không còn tồn tại thì đúng lúc cần nhất chúng lại dẫn đi sai chỗ —
// và đó là kiểu hỏng không phép kiểm nào khác bắt được, vì code vẫn chạy.
// Cố ý so chuỗi thẳng, không regex: câu báo lỗi là chữ nguyên văn, và một
// biểu thức khớp lỏng sẽ vẫn xanh khi câu đã bị viết lại nửa vời.
const contentSource = fs.readFileSync(new URL("../content.js", import.meta.url), "utf8");
const CAU_NHA_MOI = "https://flow.google.com/project/";
const CAU_COMPOSER = "Flow composer not found. Open a Flow project on flow.google.com and retry.";
const CAU_CU = "Open a labs.google Flow project";
assert.ok(contentSource.includes(CAU_NHA_MOI), "câu WRONG_SURFACE phải chỉ về nhà mới");
assert.equal(contentSource.split(CAU_COMPOSER).length - 1, 2,
  "cả hai câu 'không tìm thấy ô nhập' phải chỉ về nhà mới");
assert.ok(!contentSource.includes(CAU_CU),
  "câu cũ chỉ về labs.google vẫn còn — nó dẫn người vận hành tới một trang đã dời");

// LUẬT F-20: `classifyFailure` dò từ khoá trên TOÀN BỘ câu báo lỗi, nên sửa
// lời văn LÀ sửa hành vi retry. Đổi địa chỉ mà tuột sang nhánh phán quyết
// khác là đổi cả cách hệ thống xử lý thất bại, không phải sửa chính tả.
const runnerCtx = { window: {}, URL };
vm.createContext(runnerCtx);
vm.runInContext(fs.readFileSync(new URL("../runner-core.js", import.meta.url), "utf8"), runnerCtx);
const RUNNER = runnerCtx.window.DacRunnerCore;
for (const cau of [
  "WRONG_SURFACE: the Flow receiver tab must be on https://flow.google.com/project/ (or the older https://labs.google/fx/tools/flow/).",
  CAU_COMPOSER,
]) {
  assert.equal(RUNNER.classifyFailure(cau), "RECEIVER_LOST",
    `phán quyết đổi sau khi đổi địa chỉ — đó là đổi hành vi retry, không phải sửa chữ: ${cau}`);
}
