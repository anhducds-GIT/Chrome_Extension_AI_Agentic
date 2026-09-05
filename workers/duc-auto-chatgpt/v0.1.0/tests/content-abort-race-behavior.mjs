// Test ghim B-22: "Dừng nhận TRƯỚC lúc gửi ⇒ prompt không được gửi." — nhánh ChatGPT.
//
// Gốc bệnh, đọc thẳng code chứ không dò theo tên: `runPrompt()` mở đầu bằng
// `STATE.abortRequested = false`, nên một DAC_ABORT tới TRƯỚC DAC_RUN_IMAGE_JOB
// bị xoá trắng và cú click Send vẫn bắn. Nguyên văn dòng đã gây ra vụ 26/08 bên
// nhánh Gemini (sổ cái: STOP_REQUESTED_BEFORE_SUBMIT 14:20:36 → PROMPT_SUBMITTED
// 14:20:37, đúng một giây sau).
//
// File này KHÔNG soi chuỗi mã nguồn — nó nạp content.js THẬT (đúng thứ tự
// content_scripts trong manifest.json) vào sandbox vm với DOM giả tối thiểu dựng
// theo ĐÚNG selector của provider-adapter.js ChatGPT, rồi bắn message theo đúng
// thứ tự race và ĐẾM số lần sendButton.click. Gỡ bản vá ở content.js là ca 2 đỏ
// lại ngay.
//
// KHÔNG ĐOÁN SELECTOR: mọi selector của DOM giả bên dưới đọc thẳng từ
// window.DacProviderAdapter.SELECTORS sau khi nạp adapter thật, nên một ngày
// adapter đổi selector thì harness đổi theo, không lệch âm thầm.
//
// Sáu ca, thứ tự cố ý:
//   1. ĐỐI CHỨNG: không có lệnh huỷ → job click đúng 1 lần. Không có ca này thì
//      ca 2 có thể "xanh oan" chỉ vì harness không bao giờ đi tới được cú click.
//   2. RACE: DAC_ABORT(attempt X) tới trước → DAC_RUN_IMAGE_JOB(attempt X) →
//      KHÔNG được có click mới, và composer phải nguyên vẹn.
//   3. CHẶN VÁ QUÁ TAY: huỷ X xong, attempt Y mới PHẢI vẫn click được.
//   4. KHÔNG LÀM YẾU LỚP CŨ: DAC_ABORT trần (không kèm attempt) giữa lúc đang
//      chạy vẫn phải dừng được run.
//   5. HUỶ MỒ CÔI: huỷ lúc rảnh (không attempt nào tiêu thụ) không được giết
//      run mới mở sau đó — bắt bản "vá ẩu" xoá hẳn dòng reset.
//   6. HUỶ LỆCH DANH TÍNH giữa lúc đang bay: VẪN dừng (fail-closed, chủ đích).
//
// Ca 1 và 4 còn ghim: job đã click rồi mới bị huỷ thì attempt.submittedAt phải
// KHÁC null — không được khai "chưa gửi" cho một prompt đã đi.

import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const SCRIPTS = ["provider-adapter.js", "image-evidence-core.js", "attempt-identity-core.js", "reconciliation-core.js", "chat-readiness-core.js", "ab-poll-core.js", "content.js"];

// Thứ tự nạp phải khớp manifest.json — lệch là harness đo một thế giới khác với
// cái đang ship. Đọc từ manifest thật thay vì chép tay.
{
  const manifest = JSON.parse(fs.readFileSync(new URL("../manifest.json", import.meta.url), "utf8"));
  assert.deepEqual(manifest.content_scripts?.[0]?.js, SCRIPTS, "thứ tự content_scripts trong manifest.json đã đổi — cập nhật harness trước khi tin kết quả");
}

/* ---- DOM giả tối thiểu ----------------------------------------------------
   Chỉ đủ cho đường đi của một job KHÔNG có ảnh mẫu: composer nhìn thấy được,
   nút Send sẵn sàng, không blocker, không ảnh, không lượt hội thoại nào. */

let sendClicks = 0;

const composer = {
  isContentEditable: true,
  textContent: "",
  get innerText() { return this.textContent; },
  focus() {},
  dispatchEvent() {},
  replaceChildren(node) { this.textContent = node?.text ?? ""; },
  getBoundingClientRect: () => ({ width: 320, height: 48 }),
  closest: () => null,
  querySelectorAll: () => [],
  querySelector: () => null,
};

const sendButton = {
  disabled: false,
  getAttribute: () => null,
  getBoundingClientRect: () => ({ width: 40, height: 40 }),
  closest: () => null,
  click: () => { sendClicks += 1; },
};

// Điền sau khi adapter đã nạp: selector lấy từ chính adapter, không gõ tay.
let COMPOSER_SELECTOR = "";
let SEND_SELECTOR = "";

function queryAll(selector) {
  if (typeof selector !== "string") return [];
  if (selector === COMPOSER_SELECTOR) return [composer];
  if (selector === SEND_SELECTOR) return [sendButton];
  return [];
}

const emptyBody = {
  innerText: "",
  textContent: "",
  querySelectorAll: () => [],
  querySelector: () => null,
  cloneNode() { return { querySelectorAll: () => [], innerText: "", textContent: "" }; },
};

const fakeDocument = {
  body: emptyBody,
  documentElement: {},
  querySelectorAll: queryAll,
  querySelector: (selector) => queryAll(selector)[0] || null,
  createRange: () => ({ selectNodeContents() {} }),
  createTextNode: (text) => ({ text }),
  execCommand: () => false,
};

const listeners = [];
const context = {
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  URL,
  location: { href: "https://chatgpt.com/c/6a9803a5-0000-4000-8000-000000000000" },
  document: fakeDocument,
  getComputedStyle: () => ({ visibility: "visible", display: "block" }),
  getSelection: () => ({ removeAllRanges() {}, addRange() {} }),
  MutationObserver: class { observe() {} disconnect() {} },
  Event: class { constructor(type) { this.type = type; } },
  HTMLTextAreaElement: class {},
  HTMLInputElement: class {},
  chrome: { runtime: { onMessage: { addListener: (fn) => listeners.push(fn) }, sendMessage: () => Promise.resolve() } },
};
context.InputEvent = class extends context.Event {};
context.window = context;
context.globalThis = context;
vm.createContext(context);

for (const file of SCRIPTS) {
  vm.runInContext(fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), context, { filename: file });
  if (file === "provider-adapter.js") {
    COMPOSER_SELECTOR = context.DacProviderAdapter.SELECTORS.composer[0];
    SEND_SELECTOR = context.DacProviderAdapter.SELECTORS.send[0];
    assert.ok(COMPOSER_SELECTOR && SEND_SELECTOR, "adapter phải cung cấp selector composer và send");
    // Bề mặt phải hợp lệ, nếu không runPrompt() chặn ở WRONG_SURFACE và harness
    // đo nhầm cái chốt khác — xanh vì lý do sai.
    assert.equal(context.DacProviderAdapter.surfaceAllowed(context.location.href), true, "URL của DOM giả phải là một hội thoại thật theo luật của adapter");
  }
}
assert.equal(listeners.length, 1, "content.js phải đăng ký đúng một message listener");
const receive = listeners[0];

function deliver(message) {
  return new Promise((resolve) => { receive(message, {}, resolve); });
}

async function until(check, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (check()) return true;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Chờ quá ${timeoutMs}ms: ${label}`);
}

let passed = 0;
const ok = (name) => { passed += 1; console.log(`  ok  ${name}`); };

/* ---- 1. Đối chứng: harness đi được tới cú click ------------------------- */
{
  const response = deliver({ type: "DAC_RUN_IMAGE_JOB", job_id: "Q001", attempt_id: "attempt-control", prompt: "control run", timeoutMs: 15000 });
  await until(() => sendClicks === 1, 5000, "job đối chứng phải click Send");
  await deliver({ type: "DAC_ABORT", job_id: "Q001", attempt_id: "attempt-control" });
  const settled = await response;
  assert.equal(settled.ok, false, "job bị huỷ sau khi gửi phải kết thúc lỗi, không kết thúc êm");
  assert.match(settled.error, /stopped by user/i);
  assert.ok(settled.attempt?.submittedAt, "đã click rồi mới huỷ thì submittedAt phải KHÁC null");
  assert.equal(sendClicks, 1);
  ok("đối chứng: không có lệnh huỷ thì job click đúng 1 lần, và huỷ-sau-gửi khai đúng sự thật");
}

/* ---- 2. RACE: huỷ tới TRƯỚC, job tới SAU → cấm click --------------------- */
{
  await deliver({ type: "DAC_ABORT", job_id: "Q002", attempt_id: "attempt-raced" });
  const response = deliver({ type: "DAC_RUN_IMAGE_JOB", job_id: "Q002", attempt_id: "attempt-raced", prompt: "raced run", timeoutMs: 15000 });
  // Đua giữa hai kết cục để bản đỏ (code chưa vá) lộ ra trong ~4s thay vì treo
  // 15s theo timeout của job: hoặc job trả lời (đường đúng), hoặc click bắn.
  const outcome = await Promise.race([
    response,
    until(() => sendClicks > 1, 4000, "").then(() => "CLICKED", () => "QUIET"),
  ]);
  assert.notEqual(outcome, "CLICKED", "RACE TÁI HIỆN: DAC_ABORT đã được nhận TRƯỚC job mà sendButton.click vẫn bắn — đúng lỗi B-22 (dòng reset đầu runPrompt xoá cờ huỷ)");
  const settled = outcome === "QUIET" ? await response : outcome;
  assert.equal(settled.ok, false, "attempt bị huỷ trước khi gửi phải kết thúc lỗi USER_STOP");
  assert.match(settled.error, /stopped by user/i);
  assert.equal(sendClicks, 1, "tuyệt đối không có click mới cho attempt đã huỷ");
  assert.equal(settled.attempt?.submittedAt ?? null, null, "attempt chưa từng gửi thì submittedAt phải null");
  // Huỷ trước là huỷ HẲN: không gõ chữ vào composer — chặn mutation gỡ cú throw
  // sớm rồi trông cậy vào các chốt muộn hơn ở phía sau.
  assert.notEqual(composer.textContent, "raced run", "attempt bị huỷ trước không được đụng vào composer");
  ok("race B-22: huỷ trước → job sau → ZERO click, composer nguyên vẹn, kết thúc USER_STOP");
}

/* ---- 3. Huỷ attempt X xong, attempt Y mới vẫn phải chạy được ------------- */
{
  const response = deliver({ type: "DAC_RUN_IMAGE_JOB", job_id: "Q003", attempt_id: "attempt-after", prompt: "next run", timeoutMs: 15000 });
  await until(() => sendClicks === 2, 5000, "attempt mới sau một lệnh huỷ cũ PHẢI vẫn click được — cờ huỷ không được ghim vĩnh viễn");
  await deliver({ type: "DAC_ABORT", job_id: "Q003", attempt_id: "attempt-after" });
  const settled = await response;
  assert.ok(settled.attempt?.submittedAt, "attempt Y đã gửi thật");
  ok("huỷ theo attempt: lệnh huỷ của X không giết attempt Y kế tiếp");
}

/* ---- 4. Kênh cũ không yếu đi: DAC_ABORT trần vẫn dừng run đang bay ------- */
{
  const response = deliver({ type: "DAC_RUN_IMAGE_JOB", job_id: "Q004", attempt_id: "attempt-bare", prompt: "bare abort run", timeoutMs: 15000 });
  await until(() => sendClicks === 3, 5000, "job thứ tư phải click trước khi thử huỷ trần");
  await deliver({ type: "DAC_ABORT" });
  const settled = await response;
  assert.equal(settled.ok, false, "DAC_ABORT trần (không kèm attempt) vẫn phải dừng được run đang bay");
  assert.match(settled.error, /stopped by user/i);
  assert.ok(settled.attempt?.submittedAt, "huỷ sau gửi: submittedAt vẫn khai thật");
  ok("kênh huỷ trần giữ nguyên sức với run đang bay — không làm yếu lớp bảo vệ cũ");
}

/* ---- 5. Huỷ KHÔNG được attempt nào tiêu thụ, rồi mở run mới -------------- */
// Ca này bắt đúng bản "vá ẩu" xoá hẳn dòng reset: lệnh huỷ lúc rảnh (không run
// nào bay, không attempt nào tiêu thụ nó) mà làm run MỚI sau đó chết ngay từ
// cửa là đổi một bug lấy một bug tệ hơn. finally của attempt trước không cứu
// được ca này, vì cờ được đặt SAU khi mọi attempt đã đóng.
{
  await deliver({ type: "DAC_ABORT" });
  const response = deliver({ type: "DAC_RUN_IMAGE_JOB", job_id: "Q005", attempt_id: "attempt-fresh-run", prompt: "fresh run after idle abort", timeoutMs: 15000 });
  await until(() => sendClicks === 4, 5000, "run mới sau một lệnh huỷ lúc rảnh PHẢI vẫn click được");
  await deliver({ type: "DAC_ABORT", job_id: "Q005", attempt_id: "attempt-fresh-run" });
  const settled = await response;
  assert.ok(settled.attempt?.submittedAt, "run mới đã gửi thật");
  ok("huỷ lúc rảnh không giết run kế tiếp — cờ mồ côi không sống qua attempt mới");
}

/* ---- 6. Huỷ LỆCH danh tính giữa lúc đang bay: VẪN dừng (chủ đích) --------- */
// Danh tính attempt tồn tại CHỈ để dòng reset đầu runPrompt() không xoá được
// lệnh huỷ tới trước job — không phải để một attempt sống sót qua một lệnh
// dừng. Fail-closed: nghi ngờ thì dừng.
{
  const response = deliver({ type: "DAC_RUN_IMAGE_JOB", job_id: "Q006", attempt_id: "attempt-live", prompt: "live run", timeoutMs: 15000 });
  await until(() => sendClicks === 5, 5000, "job thứ sáu phải click trước khi thử huỷ lệch danh tính");
  await deliver({ type: "DAC_ABORT", job_id: "Q999", attempt_id: "attempt-cua-nguoi-khac" });
  const settled = await response;
  assert.equal(settled.ok, false, "huỷ lệch danh tính giữa lúc đang bay vẫn phải dừng attempt đang bay");
  assert.match(settled.error, /stopped by user/i);
  assert.ok(settled.attempt?.submittedAt, "đã gửi trước khi huỷ tới: submittedAt khai thật");
  ok("huỷ lệch danh tính giữa lúc đang bay VẪN dừng — lệnh dừng không bao giờ bị bỏ qua im lặng");
}

assert.equal(sendClicks, 5, "tổng số click toàn file: 5 job được phép, 1 attempt bị huỷ trước gửi");
console.log(`PASS content abort race: ${passed}/6 ca — huỷ trước gửi chặn được click, huỷ theo attempt không lây sang attempt/run sau, dừng không bao giờ bị bỏ qua`);
