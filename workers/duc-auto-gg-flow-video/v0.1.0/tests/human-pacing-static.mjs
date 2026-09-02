// Nhịp thao tác giống người phải THẬT SỰ CHẠY, và phải nghỉ ĐÚNG CHỖ.
//
// Đức yêu cầu 02/09: đừng tạo video quá nhanh, đừng nhập liệu ở tốc độ máy,
// thao tác thong thả như người bình thường.
//
// Phép kiểm này ghim ba thứ, và thứ đầu tiên là thứ suýt trượt: **dây nối**.
// Bản đầu của tôi khai `HUMAN_PACING` trong `provider-adapter.js` nhưng QUÊN
// đưa nó vào khối xuất ra cuối file. `humanPause()` đọc `ADAPTER.HUMAN_PACING`
// nên nó nhận `undefined`, lặng lẽ trả 0, và **toàn bộ phần nhịp không chạy** —
// suite vẫn xanh, mọi job vẫn chạy, không có dấu hiệu gì. Đúng loại hỏng mà chỉ
// một phép kiểm hỏi thẳng "nó có tới nơi không" mới bắt được.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const content = fs.readFileSync(new URL("../content.js", import.meta.url), "utf8");
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL("../provider-adapter.js", import.meta.url), "utf8"), ctx);
const ADAPTER = ctx.window.DacProviderAdapter;

/* ---- 1. dây nối: nhịp phải tới được content script -------------------------- */

assert.ok(ADAPTER.HUMAN_PACING, "HUMAN_PACING phải nằm trong khối XUẤT RA của adapter — khai mà không xuất thì humanPause() im lặng trả 0 và cả tính năng biến mất");
for (const key of ["preComposeMs", "postTypeMs", "preSubmitMs"]) {
  const span = ADAPTER.HUMAN_PACING[key];
  assert.ok(span, `thiếu quãng nghỉ ${key}`);
  assert.ok(Number.isFinite(span.min) && Number.isFinite(span.max), `${key} phải là khoảng số`);
  assert.ok(span.min < span.max, `${key} phải là một KHOẢNG, không phải hằng số — nghỉ đúng một con số lặp lại hàng chục lần còn dễ nhận ra hơn là không nghỉ`);
  assert.ok(span.min >= 400, `${key} tối thiểu ${span.min}ms là quá nhanh so với nhịp người`);
}

/* ---- 2. có gọi thật, ở cả ba chỗ ------------------------------------------- */

assert.match(content, /async function humanPause\(name\)/, "phải có hàm humanPause");
for (const key of ["preComposeMs", "postTypeMs", "preSubmitMs"]) {
  assert.ok(content.includes(`humanPause("${key}")`), `chưa ai gọi humanPause("${key}")`);
}
assert.match(content, /Math\.random\(\)/, "quãng nghỉ phải bốc ngẫu nhiên trong khoảng");

/* ---- 3. nghỉ ĐÚNG CHỖ — đây mới là phần dễ làm hỏng thứ khác ---------------- */

const runStart = content.indexOf("async function runPrompt(");
const run = content.slice(runStart, content.indexOf("function attemptSnapshot", runStart));

// (a) Nghỉ trước khi DÒ LẠI composer, không phải sau. Đặt sau là mở lại lỗ hổng
//     audit Codex vòng 3 đã bắt: composer phải được dò ở bước cuối cùng ngay
//     trước khi gõ, vì mọi bước đổi DOM đều có thể remount nó.
const pauseCompose = run.indexOf('humanPause("preComposeMs")');
const resolveComposer = run.indexOf("const activeComposer = findComposer();");
const type = run.indexOf("typeIntoFlowComposer(activeComposer, prompt)");
assert.ok(pauseCompose > -1 && resolveComposer > -1 && type > -1, "không định vị được ba mốc");
assert.ok(pauseCompose < resolveComposer, "quãng nghỉ phải nằm TRƯỚC lệnh dò composer — nghỉ sau thì tham chiếu composer cũ đi một nhịp trước khi được dùng");
assert.ok(resolveComposer < type, "composer vẫn phải được dò ngay trước khi gõ");

// (b) Nghỉ cuối cùng: sau khi nút đã sáng, TRƯỚC khi chụp mốc quy gán. Luật
//     "chụp mốc ngay sát cú bấm" là thứ giữ cho việc quy gán video không lẫn.
const gate = run.indexOf("waitForSendButtonReady(");
const pauseSubmit = run.indexOf('humanPause("preSubmitMs")');
const boundary = run.indexOf("captureVideoBoundary()");
const click = run.indexOf("DECISIONS.clickSend(");
assert.ok(gate < pauseSubmit, "quãng nghỉ cuối phải sau khi nút gửi đã sáng — nghỉ trước đó là nghỉ vô ích");
assert.ok(pauseSubmit < boundary, "phải nghỉ TRƯỚC khi chụp mốc quy gán, không phải sau — chen quãng nghỉ vào giữa mốc và cú bấm làm nền cũ đi");
assert.ok(boundary < click, "mốc quy gán vẫn phải nằm ngay sát cú bấm");

// (c) Nhịp đã nghỉ phải về được sổ cái, và phải ghi SAU khi cả hai quãng chạy
//     xong. Bản đầu ghi nó cạnh các số đo composer — tức TRƯỚC dòng khai biến —
//     và lỗi TDZ đó làm MỌI job chết ở PRE_SUBMIT. Suite bắt ngay.
const declarePostType = run.indexOf('const pausedAfterType = await humanPause("postTypeMs")');
const carryPacing = run.indexOf('carryDiagnostic(requestAttempt, "pacing_ms"');
assert.ok(carryPacing > -1, "nhịp đã nghỉ phải được ghi vào sổ cái");
assert.ok(declarePostType < carryPacing, "pacing_ms phải ghi SAU khi pausedAfterType được khai — ghi trước là TDZ, và nó giết mọi job ở PRE_SUBMIT");
assert.ok(carryPacing < gate, "ghi trước cổng gửi, để lượt chết ở PRE_SUBMIT vẫn để lại nhịp");

console.log("human pacing is wired, randomised, and placed safely: PASS");
