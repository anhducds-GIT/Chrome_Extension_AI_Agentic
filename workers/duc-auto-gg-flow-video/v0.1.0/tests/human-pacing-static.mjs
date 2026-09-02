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

function load(name, globalName) {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(new URL(`../${name}`, import.meta.url), "utf8"), context);
  return context.window[globalName] || context[globalName];
}

const content = fs.readFileSync(new URL("../content.js", import.meta.url), "utf8");
const ADAPTER = load("provider-adapter.js", "DacProviderAdapter");

/* ---- 1. dây nối: nhịp phải tới được content script -------------------------- */

assert.ok(ADAPTER.HUMAN_PACING, "HUMAN_PACING phải nằm trong khối XUẤT RA của adapter — khai mà không xuất thì humanPause() im lặng trả 0 và cả tính năng biến mất");
for (const key of ["preComposeMs", "postTypeMs", "preSubmitMs"]) {
  const span = ADAPTER.HUMAN_PACING[key];
  assert.ok(span, `thiếu quãng nghỉ ${key}`);
  assert.ok(Number.isFinite(span.min) && Number.isFinite(span.max), `${key} phải là khoảng số`);
  assert.ok(span.min < span.max, `${key} phải là một KHOẢNG, không phải hằng số — nghỉ đúng một con số lặp lại hàng chục lần còn dễ nhận ra hơn là không nghỉ`);
  assert.ok(span.min >= 1500, `${key} tối thiểu ${span.min}ms là quá nhanh so với nhịp người`);
  // BIÊN ĐỘ, không chỉ độ dài. Một nhịp đều đặn vẫn là một dấu vân tay dù nó
  // chậm — Đức chốt 02/09 "dài hơn và random hơn nhiều".
  assert.ok(span.max >= span.min * 3, `${key} có biên độ quá hẹp (${span.min}-${span.max}ms): nghỉ lâu nhưng đều đặn vẫn là một nhịp máy`);
}

/* ---- 1b. nhịp GIỮA HAI JOB — đòn bẩy lớn nhất ------------------------------ */

// Đây mới là thứ quyết định "chạy trọn một flow không bị ngắt", lớn hơn hẳn ba
// quãng nghỉ trong trang cộng lại. Trước 02/09 là 20-30s: bảy video trong ~10
// phút, và lượt F4R6 bị Google gắn cờ "unusual activity" ở job thứ hai.
const devTrial = load("dev-trial-core.js", "DacDevTrialCore");
const delay = devTrial.DELAY_BOUNDS;
assert.ok(delay, "dev-trial-core phải khai DELAY_BOUNDS");
assert.ok(delay.min >= 45, `sàn nhịp giữa hai job (${delay.min}s) quá ngắn — sàn phải chặn được cả AI điều phối đề nghị một nhịp gấp`);
assert.ok(delay.default >= 90, `nhịp mặc định (${delay.default}s) quá ngắn cho mục tiêu chạy trọn flow`);
assert.ok(delay.max > delay.min, "nhịp giữa hai job phải là một KHOẢNG để còn bốc ngẫu nhiên");
assert.ok(delay.default >= delay.min && delay.default <= delay.max, "mặc định phải nằm trong khoảng");

// Thuộc tính nói thẳng ý định của Đức: một chuỗi đầy KHÔNG được bắn hết trong
// vòng mươi phút. Đây là phép kiểm chịu trách nhiệm chính — ai hạ bất kỳ con số
// nào ở trên để "chạy cho nhanh" đều vỡ ở đây, và thông báo nói rõ vì sao.
const fullChainDelaySec = devTrial.MAX_TRIAL_JOBS * delay.default;
assert.ok(fullChainDelaySec >= 600,
  `một chuỗi đầy (${devTrial.MAX_TRIAL_JOBS} job × ${delay.default}s = ${fullChainDelaySec}s) chỉ mất ${Math.round(fullChainDelaySec / 60)} phút chờ. ` +
  "Mục tiêu Đức chốt 02/09 là chạy TRỌN một flow không bị ngắt, không phải chạy nhanh — " +
  "nhịp cũ 20-30s đã bị Google gắn cờ 'unusual activity' ở job thứ hai (evidence/F4R6-KET-QUA.md).");

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
