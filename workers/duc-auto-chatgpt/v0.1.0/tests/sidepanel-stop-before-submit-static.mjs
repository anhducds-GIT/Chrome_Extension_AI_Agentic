// Test ghim B-22, nửa phía SIDE PANEL. Nửa phía content (nạp content.js thật,
// đếm click) nằm ở content-abort-race-behavior.mjs — file này ghim phần wiring
// mà test hành vi kia KHÔNG với tới được, vì sidepanel.js không nạp nổi vào
// Node bằng một harness nhỏ: nó cần cả chrome.* lẫn DOM của side panel.
//
// Ba bất biến, mỗi cái đỡ một khúc của race:
//   1. stop() phải GỬI KÈM danh tính attempt đang bay trong DAC_ABORT. Thiếu nó
//      thì receiver không phân biệt được "dừng attempt NÀY" với một cờ mồ côi,
//      và lệnh huỷ tới trước job bị dòng reset của runPrompt() xoá trắng.
//   2. bridgeRunStop() — cửa Bridge — phải gửi cùng danh tính đó. Hai đường
//      dừng mà một đường mất danh tính là một nửa bản vá.
//   3. run() phải KIỂM LẠI cờ dừng ngay sau `await gateNextJob` — từ chỗ đó
//      xuống tới lúc cấp attempt_id không còn phép kiểm nào, nên một lệnh Stop
//      rơi đúng vào khoảng await đó sẽ thấy attempt vẫn được phái đi như thường.
//
// KHÁC VỚI NHÁNH GEMINI, và khác có chủ đích: bên đó ghim "từ lúc đánh dấu
// RUNNING tới send chỉ được có ĐÚNG 1 await". Nhánh này có HAI — cú send, và
// `flushRunCheckpoint` giữ chỗ trước khi gửi (lớp bảo vệ persistence, không
// được gỡ). Nên bất biến tương đương ở đây là bất biến THỨ TỰ: attempt_id và
// setCurrent phải xong TRƯỚC cái await đó, để một lệnh Stop rơi vào khoảng
// flush vẫn đọc ra ĐÚNG attempt sắp gửi và bị content.js chặn ở cửa.
//
// Ghim theo cấu trúc mã nguồn: bỏ dòng chú thích trước khi soi — test đọc chú
// thích là test văn xuôi, không phải test mã. Và mọi chuỗi đem soi đều phải
// assert TÌM THẤY trước đã: một phép soi trượt mục tiêu mà vẫn xanh là xanh giả.

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

const SCOPED = /scoped = current\?\.attempt_id \? \{ job_id: current\.job\.id, attempt_id: current\.attempt_id \} : \{\}/;

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
  // Ghim vào ĐÚNG CÂU LỆNH GỬI, không phải chỗ dựng danh tính: một mutation giữ
  // nguyên `const scoped = …` nhưng gửi DAC_ABORT trần vẫn khớp dòng dựng. Danh
  // tính dựng ra mà không lên tàu thì bằng không dựng.
  const sendStatement = stopBody.slice(iSend, stopBody.indexOf("\n", iSend));
  assert.match(sendStatement, /\.\.\.scoped/, "câu lệnh gửi DAC_ABORT phải mang ...scoped — danh tính dựng ra mà không gửi đi là vô nghĩa");
  assert.match(stopBody, SCOPED, "scoped phải lấy CẢ job_id lẫn attempt_id từ attempt đang bay — receiver so danh tính bằng cả hai");
  ok("stop() gửi DAC_ABORT kèm danh tính attempt ngay trong câu lệnh send, guard đúng kiểu bridgeRunStop, cờ đặt trước send");
}

/* ---- 2. bridgeRunStop() gửi cùng danh tính ------------------------------- */
{
  const stopBody = body("bridgeRunStop");
  const iGuard = stopBody.indexOf("state.running ? state.currentItem : null");
  const iSend = stopBody.indexOf('type: "DAC_ABORT"');
  assert.notEqual(iGuard, -1, "bridgeRunStop() phải giữ guard state.running cho currentItem");
  assert.notEqual(iSend, -1, "bridgeRunStop() phải gửi DAC_ABORT");
  const sendStatement = stopBody.slice(iSend, stopBody.indexOf("\n", iSend));
  assert.match(sendStatement, /\.\.\.scoped/, "cửa Bridge phải gửi cùng danh tính attempt như nút Stop — một đường mất danh tính là nửa bản vá");
  assert.match(stopBody, SCOPED, "bridgeRunStop() dựng scoped từ CHÍNH current đã qua guard");
  // Lớp bảo vệ có sẵn (audit 03/09 vòng 4, INV-3): chỉ nhắn khi đã có tab bị
  // khoá. Bản vá này không được nới nó ra.
  assert.ok(stopBody.indexOf("state.boundTabId !== null") !== -1 && stopBody.indexOf("state.boundTabId !== null") < iSend,
    "DAC_ABORT vẫn phải nằm sau cửa boundTabId — không được nhắn vào tab đang ở trước mặt");
  ok("bridgeRunStop() gửi DAC_ABORT kèm danh tính, và cửa boundTabId vẫn nguyên");
}

/* ---- 3. run() kiểm lại cờ dừng ngay sau await gateNextJob ---------------- */
{
  const runBody = body("run");
  const iGate = runBody.indexOf("const gate = await gateNextJob(item);");
  assert.notEqual(iGate, -1, "không tìm thấy chỗ run() gọi gateNextJob");
  const after = runBody.slice(iGate + "const gate = await gateNextJob(item);".length);
  const iRecheck = after.indexOf("if (state.stopRequested) {");
  const iGateOk = after.indexOf("if (!gate.ok)");
  const iAttempt = after.indexOf("nextAttemptId()");
  const iCurrent = after.indexOf("setCurrent(item, item.runtime_stage");
  const iFlush = after.indexOf("await flushRunCheckpoint(");
  const iDispatch = after.indexOf('"DAC_RUN_TEXT_JOB" : "DAC_RUN_IMAGE_JOB"');
  assert.notEqual(iRecheck, -1, "sau await gateNextJob phải kiểm lại state.stopRequested — Stop rơi vào khoảng await đó mà không kiểm lại thì attempt vẫn được phái đi");
  assert.notEqual(iGateOk, -1, "không tìm thấy nhánh gate.ok");
  assert.notEqual(iAttempt, -1, "không tìm thấy chỗ cấp attempt_id");
  assert.notEqual(iCurrent, -1, "không tìm thấy chỗ setCurrent cho job đang chạy");
  assert.notEqual(iFlush, -1, "không tìm thấy checkpoint giữ chỗ trước khi gửi");
  assert.notEqual(iDispatch, -1, "không tìm thấy chỗ phái job xuống content script");
  assert.ok(iRecheck < iGateOk, "phép kiểm lại phải đứng TRƯỚC nhánh gate.ok — dừng nghĩa là bỏ run, không phải đi tiếp vào xử lý gate rồi mới tính");
  assert.ok(iRecheck < iAttempt && iAttempt < iDispatch, "thứ tự bắt buộc: kiểm lại cờ dừng → cấp attempt_id → phái job");
  // gateNextJob đã ghi RECONCILING vào sổ TRƯỚC khi await, nên break trần ở đây
  // bỏ rơi dòng sổ ở trạng thái đó mà vẫn đếm terminal. Nhánh dừng phải SETTLE
  // trung thực (USER_STOP, chưa gửi gì) rồi mới break.
  const recheckBlock = after.slice(iRecheck, iGateOk);
  assert.match(recheckBlock, /failure_type:\s*"USER_STOP"/, "nhánh dừng-sau-gate phải khai USER_STOP vào sổ, không bỏ rơi dòng RECONCILING");
  assert.match(recheckBlock, /Stopped by user before submission\./, "lời khai phải nói rõ: dừng TRƯỚC khi gửi — không được mượn thông điệp của nhánh đã-gửi");
  assert.ok(recheckBlock.includes("break;"), "settle xong phải break — không được rơi tiếp xuống phái job");
  // Bất biến THỨ TỰ thay cho bất biến "một await" của nhánh Gemini: khoảng
  // await còn lại trên đường phái job là flushRunCheckpoint, và nó chỉ AN TOÀN
  // khi danh tính attempt đã sẵn sàng cho stop() đọc — cấp attempt_id và
  // setCurrent phải xong trước nó, nếu không lệnh huỷ rơi vào đúng khoảng đó sẽ
  // mang danh tính của job TRƯỚC và bị content.js coi là cờ mồ côi.
  assert.ok(iAttempt < iFlush && iCurrent < iFlush, "attempt_id và setCurrent phải xong TRƯỚC checkpoint giữ chỗ — nếu không, một Stop rơi vào khoảng flush sẽ nêu tên attempt của job trước");
  assert.ok(iFlush < iDispatch, "checkpoint giữ chỗ vẫn phải đứng trước cú phái job — không được đảo để 'gọn'");
  ok("run() kiểm lại cờ dừng ngay sau gate, settle trung thực, và danh tính attempt sẵn sàng trước khoảng await còn lại");
}

console.log(`PASS sidepanel stop-before-submit: ${passed}/3 nhóm bất biến wiring cho B-22`);
