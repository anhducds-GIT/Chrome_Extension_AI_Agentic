// Test ghim G-01, nửa phía SIDE PANEL. Nửa phía content (nạp content.js thật,
// đếm click) nằm ở content-abort-race-behavior.mjs — file này ghim phần wiring
// mà test behavioral kia KHÔNG với tới được, vì sidepanel.js không nạp nổi vào
// Node: nó cần cả chrome.* lẫn DOM của side panel.
//
// Hai bất biến, mỗi cái đỡ một nửa của race 26/08:
//   1. stop() phải GỬI KÈM danh tính attempt đang bay trong DAC_ABORT. Thiếu nó
//      thì receiver không phân biệt được "dừng attempt NÀY" với một cờ mồ côi,
//      và lệnh huỷ tới trước job bị dòng reset của runPrompt() xoá trắng.
//   2. run() phải KIỂM LẠI cờ dừng ngay sau `await gateNextJob` — từ chỗ đó
//      xuống tới send() không còn phép kiểm nào, nên một lệnh Stop rơi đúng vào
//      khoảng await đó sẽ thấy attempt vẫn được phái đi như thường.
//
// Ghim theo cấu trúc mã nguồn (cùng cách với bridge-run-stop-chat-reload-smoke):
// bỏ dòng chú thích trước khi soi — test đọc chú thích là test văn xuôi, không
// phải test mã. Và mọi chuỗi đem soi đều phải assert TÌM THẤY trước đã: một phép
// soi trượt mục tiêu mà vẫn xanh là xanh giả (bài học mutation 27/08).

import assert from "node:assert/strict";
import fs from "node:fs";

const sidepanel = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");

let passed = 0;
const ok = (name) => { passed += 1; console.log(`  ok  ${name}`); };

function body(name) {
  const start = sidepanel.indexOf(`async function ${name}(`);
  assert.notEqual(start, -1, `không tìm thấy ${name}()`);
  const next = sidepanel.indexOf("\n  async function ", start + 1);
  const alt = sidepanel.indexOf("\n  function ", start + 1);
  const end = Math.min(...[next, alt].filter((i) => i > 0));
  return sidepanel.slice(start, end).split("\n").filter((line) => !line.trim().startsWith("//")).join("\n");
}

/* ---- 1. stop() gửi DAC_ABORT có danh tính attempt ------------------------ */
{
  const stopBody = body("stop");
  const iFlag = stopBody.indexOf("state.stopRequested = true");
  const iGuard = stopBody.indexOf("state.running ? state.currentItem : null");
  const iSend = stopBody.indexOf('type: "DAC_ABORT"');
  assert.notEqual(iFlag, -1, "stop() phải đặt cờ dừng cục bộ");
  assert.notEqual(iGuard, -1, "stop() phải qua đúng cái guard của bridgeRunStop: chỉ tin currentItem khi run đang THẬT SỰ chạy — giữa hai run nó vẫn trỏ vào job cuối của run trước");
  assert.notEqual(iSend, -1, "stop() phải gửi DAC_ABORT");
  assert.ok(iFlag < iSend, "cờ dừng cục bộ phải đặt TRƯỚC khi await send — đặt sau là mở lại đúng cái race cờ-bị-xoá");
  // Ghim vào ĐÚNG CÂU LỆNH GỬI, không phải chỗ dựng danh tính: một mutation
  // giữ nguyên `const scoped = ...` nhưng gửi DAC_ABORT trần đã từng lọt qua
  // bản đầu của phép ghim này (nó khớp trúng dòng dựng). Danh tính dựng ra mà
  // không lên tàu thì bằng không dựng.
  const sendStatement = stopBody.slice(iSend, stopBody.indexOf("\n", iSend));
  assert.match(sendStatement, /\.\.\.scoped/, "câu lệnh gửi DAC_ABORT phải mang ...scoped — danh tính dựng ra mà không gửi đi là vô nghĩa");
  assert.match(stopBody, /scoped = current\?\.attempt_id \? \{ job_id: current\.job\.id, attempt_id: current\.attempt_id \} : \{\}/, "scoped phải lấy CẢ job_id lẫn attempt_id từ attempt đang bay — receiver so danh tính bằng cả hai");
  ok("stop() gửi DAC_ABORT kèm danh tính attempt ngay trong câu lệnh send, guard đúng kiểu bridgeRunStop, cờ đặt trước send");
}

/* ---- 2. run() kiểm lại cờ dừng ngay sau await gateNextJob ---------------- */
{
  const runBody = body("run");
  const iGate = runBody.indexOf("const gate = await gateNextJob(item);");
  assert.notEqual(iGate, -1, "không tìm thấy chỗ run() gọi gateNextJob");
  const after = runBody.slice(iGate + "const gate = await gateNextJob(item);".length);
  const iRecheck = after.indexOf("if (state.stopRequested) {");
  const iGateOk = after.indexOf("if (!gate.ok)");
  const iAttempt = after.indexOf("nextAttemptId()");
  const iDispatch = after.indexOf('type: "DAC_RUN_IMAGE_JOB"');
  assert.notEqual(iRecheck, -1, "sau await gateNextJob phải kiểm lại state.stopRequested — Stop rơi vào khoảng await đó mà không kiểm lại thì attempt vẫn được phái đi");
  assert.notEqual(iGateOk, -1, "không tìm thấy nhánh gate.ok");
  assert.notEqual(iAttempt, -1, "không tìm thấy chỗ cấp attempt_id");
  assert.notEqual(iDispatch, -1, "không tìm thấy chỗ phái DAC_RUN_IMAGE_JOB");
  assert.ok(iRecheck < iGateOk, "phép kiểm lại phải đứng TRƯỚC nhánh gate.ok — dừng nghĩa là bỏ run, không phải đi tiếp vào xử lý gate rồi mới tính");
  assert.ok(iRecheck < iAttempt && iAttempt < iDispatch, "thứ tự bắt buộc: kiểm lại cờ dừng → cấp attempt_id → phái job");
  // Audit 27/08: gateNextJob đã ghi RECONCILING vào sổ TRƯỚC khi await, nên
  // break trần ở đây bỏ rơi dòng sổ ở trạng thái đó và vẫn đếm terminal.
  // Nhánh dừng phải SETTLE job trung thực (USER_STOP, chưa gửi gì) rồi mới break.
  const recheckBlock = after.slice(iRecheck, iGateOk);
  assert.match(recheckBlock, /failure_type:\s*"USER_STOP"/, "nhánh dừng-sau-gate phải khai USER_STOP vào sổ, không bỏ rơi dòng RECONCILING");
  assert.match(recheckBlock, /Stopped by user before submission\./, "lời khai phải nói rõ: dừng TRƯỚC khi gửi — không được mượn thông điệp của nhánh đã-gửi");
  assert.ok(recheckBlock.includes("break;"), "settle xong phải break — không được rơi tiếp xuống phái job");
  // Bất biến THỜI GIAN trên ĐƯỜNG PHÁI JOB: nhánh gate.ok-thất-bại có await
  // riêng (resolveJobFailure) nhưng nó break/continue, không đi tới send. Đường
  // phái job thật bắt đầu từ chỗ đánh dấu RUNNING; từ đó tới send() không được
  // có thêm await nào — thêm một await là mở một khe mới cho Stop lọt vào giữa.
  const iRunning = after.indexOf('item.status = "RUNNING"');
  assert.notEqual(iRunning, -1, "không tìm thấy chỗ đánh dấu item RUNNING");
  assert.ok(iGateOk < iRunning && iRunning < iAttempt, "thứ tự: nhánh gate.ok → đánh dấu RUNNING → cấp attempt_id");
  const window_ = after.slice(iRunning, iDispatch);
  const awaits = window_.match(/\bawait\b/g) || [];
  assert.equal(awaits.length, 1, `từ lúc đánh dấu RUNNING tới DAC_RUN_IMAGE_JOB chỉ được có đúng 1 await (chính cú send) — thấy ${awaits.length}`);
  ok("run() kiểm lại cờ dừng ngay sau gate, và từ đó tới send không còn khe await nào khác");
}

console.log(`PASS sidepanel stop-before-submit: ${passed}/2 nhóm bất biến wiring cho G-01`);
