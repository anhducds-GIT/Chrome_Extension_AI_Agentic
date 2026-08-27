// Test ghim cho cặp run.stop / chat.reload (port từ worker ChatGPT 559c653).
//
// Hai lệnh cố ý NGƯỢC NHAU về cùng một cái khoá:
//   run.stop    — đi VÒNG QUA khoá RUN_ACTIVE. Dừng chỉ bớt việc, không thêm
//                 việc; một lệnh dừng bị từ chối vì "đang chạy" là vô dụng
//                 đúng lúc cần nó nhất.
//   chat.reload — BỊ khoá bởi đúng cái khoá đó. F5 giữa chừng giết content
//                 script và attempt đang bay, làm mất quota đã tiêu và có nguy
//                 cơ gửi lại đúng prompt đó lần thứ hai (vỡ exact-once).
//
// Worker Gemini KHÔNG có createQueueRunLock như worker ChatGPT, nên chốt khởi
// động run được dựng thẳng trong run(). Vì thế phần 3 ghim theo cấu trúc mã
// nguồn — đó là cách duy nhất kiểm được một bất biến về THỨ TỰ mà không nạp
// được cả sidepanel vào Node.

import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const context = { console, TextEncoder, crypto: globalThis.crypto, structuredClone };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL("../bridge-core.js", import.meta.url), "utf8"), context);
const core = context.DacBridgeCore;
const sidepanel = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");

let passed = 0;
const ok = (name) => { passed += 1; console.log(`  ok  ${name}`); };

/* ---- 1. Hợp đồng registry ----------------------------------------------- */
assert.deepEqual(JSON.parse(JSON.stringify((({ context: c, approval, read_only, idempotent, deadline_ms }) =>
  ({ context: c, approval, read_only, idempotent, deadline_ms }))(core.METHOD_REGISTRY["run.stop"]))), {
  context: "executor", approval: "none", read_only: false, idempotent: true, deadline_ms: 10000
});
ok("run.stop có đúng hợp đồng registry");

assert.deepEqual(JSON.parse(JSON.stringify((({ context: c, approval, read_only, idempotent, deadline_ms }) =>
  ({ context: c, approval, read_only, idempotent, deadline_ms }))(core.METHOD_REGISTRY["chat.reload"]))), {
  context: "executor", approval: "none", read_only: false, idempotent: true, deadline_ms: 30000
});
ok("chat.reload có đúng hợp đồng registry");

/* ---- 2. Không nhận tham số, và nghiêm ngặt ------------------------------ */
// Không có "dừng job X" để ai đó nhầm thành "dừng tất cả", và không có ô nào
// cho một lệnh tiêm chui vào.
for (const method of ["run.stop", "chat.reload"]) {
  assert.deepEqual(JSON.parse(JSON.stringify(core.validateParams(method, {}))), {});
  assert.throws(() => core.validateParams(method, undefined), (e) => e.code === "INVALID_PARAMS",
    `${method} phải nghiêm ngặt: thiếu hẳn params là gọi sai, không đoán ý người gọi`);
  assert.throws(() => core.validateParams(method, { job_id: "Q001" }), (e) => e.code === "INVALID_PARAMS");
  assert.throws(() => core.validateParams(method, { force: true }), (e) => e.code === "INVALID_PARAMS");
  ok(`${method} chỉ nhận params rỗng, từ chối mọi thứ khác`);
}

/* ---- 3. run.stop là lệnh KẾT THÚC việc, không phải lệnh BẮT ĐẦU việc ---- */
assert.deepEqual(Array.from(core.POLICY.prohibited_methods), ["run.start", "run.pause", "run.resume"]);
assert.equal(core.METHOD_REGISTRY["run.start"], undefined);
assert.equal(core.METHOD_REGISTRY["run.pause"], undefined);
assert.equal(core.METHOD_REGISTRY["run.resume"], undefined);
ok("ba lệnh có thể BẮT ĐẦU việc vẫn bị cấm, run.stop không nằm trong đó");

/* ---- 4. Cái bẫy: cờ dừng phải được xoá TRƯỚC await đầu tiên của run() --- */
// Đây là bất biến quan trọng nhất của cả file. Chỗ cũ đặt state.stopRequested
// = false SAU await authoritativeValidate. run.stop cố ý đi vòng qua khoá nên
// nó gọi được đúng vào khoảng await đó -> cờ dừng bị xoá âm thầm, run vẫn gửi
// prompt, trong khi người gọi đã được báo "đã dừng".
// Bỏ hẳn các dòng chú thích trước khi soi. Bài học tự thân: bản đầu của test
// này khớp phải chữ "await" nằm trong một dòng CHÚ THÍCH và báo đỏ oan cho mã
// vốn đúng. Một test đọc chú thích thì nó đang kiểm văn xuôi, không kiểm mã.
function body(name) {
  const start = sidepanel.indexOf(`async function ${name}(`);
  assert.notEqual(start, -1, `không tìm thấy ${name}()`);
  const next = sidepanel.indexOf("\n  async function ", start + 1);
  const alt = sidepanel.indexOf("\n  function ", start + 1);
  const end = Math.min(...[next, alt].filter((i) => i > 0));
  return sidepanel.slice(start, end).split("\n").filter((line) => !line.trim().startsWith("//")).join("\n");
}
const runBody = body("run");
const iReset = runBody.indexOf("state.stopRequested = false");
const iAwait = runBody.indexOf("await authoritativeValidate");
assert.notEqual(iReset, -1, "run() phải xoá cờ dừng ở đâu đó");
assert.notEqual(iAwait, -1, "run() phải còn gọi authoritativeValidate");
assert.ok(iReset < iAwait,
  "state.stopRequested phải được xoá TRƯỚC await đầu tiên của run(). Đặt sau await thì một run.stop rơi vào khoảng khởi động sẽ bị xoá âm thầm.");
ok("cờ dừng được xoá trước await đầu tiên của run()");

// Có đúng HAI lần xoá hợp lệ, và chỉ hai: một ở chốt khởi động (trước await),
// một lúc dọn dẹp khi run kết thúc. Bất kỳ lần xoá thứ ba nào — nhất là một
// lần nằm giữa await đầu tiên và vòng lặp job — chính là dựng lại nguyên bug.
const resets = [...runBody.matchAll(/state\.stopRequested = false/g)].map((m) => m.index);
assert.equal(resets.length, 2, `run() chỉ được xoá cờ dừng đúng hai lần (chốt khởi động + dọn dẹp cuối run), thấy ${resets.length}`);
const tail = runBody.slice(resets[1] - 120, resets[1] + 40);
assert.ok(/state\.running = false/.test(tail),
  "lần xoá thứ hai phải là lúc DỌN DẸP khi run kết thúc (đi kèm state.running = false), không phải một lần xoá lạc giữa run");
ok("cờ dừng chỉ bị xoá ở chốt khởi động và lúc run kết thúc");

assert.ok(/if \(state\.running \|\| state\.runStarting \|\| state\.queueMutationRunning\)/.test(runBody),
  "run() phải có chốt khởi động — nút Run bị controls() làm mờ, nhưng run.trial qua Bridge gọi thẳng run()");
ok("run() có chốt chặn cả nút người bấm lẫn run.trial qua Bridge");

/* ---- 5. run.stop KHÔNG được đi qua khoá --------------------------------- */
const stopBody = body("bridgeRunStop");
assert.ok(!/bridgeDirectLock|executeBridgeDirectMutation|bridgeApprovalLockReason/.test(stopBody),
  "run.stop cố ý đi vòng qua khoá RUN_ACTIVE — đừng 'dọn cho nhất quán' với các handler khác");
ok("run.stop không đi qua khoá RUN_ACTIVE (đúng thiết kế)");

// Đọc state.currentItem vô điều kiện thì một lệnh dừng lúc rảnh sẽ khai ra job
// của run TRƯỚC kèm prompt_already_sent: true, và ghi lời khai sai vào sổ cái.
assert.ok(/state\.running \? state\.currentItem : null/.test(stopBody),
  "run.stop chỉ được tin state.currentItem khi run đang thật sự chạy");
ok("run.stop không khai nhầm job của run trước khi đang rảnh");

assert.ok(/await stop\(\)/.test(stopBody),
  "run.stop phải đi đúng đường nút Stop của người vận hành, không dựng runner thứ hai");
ok("run.stop dùng lại đúng đường dừng của người vận hành");

/* ---- 5b. Lời nhắn lúc PRE_SUBMIT không được trấn ăn quá tay ------------- */
// Bằng chứng live 26/08: BRIDGE_RUN_STOPPED lúc 14:20:36 ghi
// STOP_REQUESTED_BEFORE_SUBMIT, rồi PROMPT_SUBMITTED lúc 14:20:37 — đúng 1
// giây sau. Bản đầu của lời nhắn nói "Không job nào bị gửi thêm", và câu đó
// SAI: cờ dừng chỉ được đọc ở các mốc ngắt, nên job đang chạy vẫn gửi nốt.
// prompt_already_sent: false mô tả KHOẢNH KHẮC gọi, không phải lời hứa tương lai.
assert.ok(!/Không job nào bị gửi thêm/.test(stopBody),
  "lời nhắn lúc PRE_SUBMIT không được hứa rằng không prompt nào sẽ được gửi — đo thật cho thấy job đang chạy vẫn gửi sau 1 giây");
assert.ok(/VẪN CÓ THỂ kịp gửi/.test(stopBody),
  "lời nhắn lúc PRE_SUBMIT phải nói rõ job đang chạy vẫn có thể kịp gửi prompt");
assert.ok(/job SAU/.test(stopBody),
  "lời nhắn phải nêu thứ DUY NHẤT được bảo đảm: các job sau sẽ không chạy");
ok("lời nhắn lúc PRE_SUBMIT nói đúng sự thật, không trấn an quá tay");

/* ---- 6. chat.reload PHẢI giành khoá và giữ suốt thời gian F5 ------------ */
const reloadBody = body("bridgeChatReload");
assert.ok(/bridgeApprovalLockReason\(/.test(reloadBody) && /RUN_ACTIVE/.test(reloadBody),
  "chat.reload phải bị từ chối khi đang có run");
ok("chat.reload bị từ chối khi đang có run");

const iCheck = reloadBody.indexOf("bridgeApprovalLockReason(");
const iClaim = reloadBody.indexOf("state.queueMutationRunning = true");
const iFirstAwait = reloadBody.indexOf("await ");
assert.notEqual(iClaim, -1, "chat.reload phải GIÀNH khoá, không chỉ đọc cờ rồi bỏ đó");
assert.ok(iCheck < iClaim && iClaim < iFirstAwait,
  "phải kiểm rồi giành khoá TRƯỚC await đầu tiên. Chỉ đọc cờ suông thì suốt 20 giây dò trang vẫn có run khởi động lên đúng cái tab sắp bị F5.");
ok("chat.reload giành khoá trước await đầu tiên, không để hở cửa sổ 20 giây");

assert.ok(/finally \{[\s\S]*state\.queueMutationRunning = false/.test(reloadBody),
  "khoá phải được trả trong finally, nếu không một lần F5 lỗi sẽ khoá chết panel");
ok("chat.reload trả khoá trong finally");

/* ---- 7. Cả hai phải có mặt ở CẢ HAI bảng handler ------------------------ */
// Thiếu một bảng thì method chỉ chạy được một đường, và lỗi chỉ lộ ra lúc live.
for (const method of ["run.stop", "chat.reload"]) {
  const hits = sidepanel.split(`"${method}":`).length - 1;
  assert.equal(hits, 2, `${method} phải được đăng ký ở CẢ HAI bảng handler của sidepanel (thấy ${hits})`);
  ok(`${method} có mặt ở cả hai bảng handler`);
}

console.log(`\n${passed} passed, 0 failed, ${passed} total`);
