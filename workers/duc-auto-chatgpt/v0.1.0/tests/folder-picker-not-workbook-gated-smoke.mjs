/* B-52 · Nút CHỌN THƯ MỤC phải bấm được kể cả khi chưa nạp workbook.
 *
 * Đức 09/09: *"hiện tôi không chọn được thư mục vì bị khoá, có lẽ điều kiện là
 * phải có file excel"*. Chẩn đoán đúng: `outputLocked = !state.workbook ||
 * operatorLocked`, và cả hai nút chọn thư mục nằm trong danh sách bị nó tắt.
 *
 * VÌ SAO ĐÂY KHÔNG PHẢI CHUYỆN TIỆN TAY: cấp quyền một thư mục là quyền BỀN,
 * lưu theo hồ sơ trong IndexedDB — nó không thuộc workbook nào. Và nó là lối
 * thoát DUY NHẤT của `B-36`: trên máy này mọi thứ đi qua Chrome Downloads đều
 * bị thứ gì đó đổi thành tên GUID (đo 09/09: 67 file trong một ngày), còn
 * đường thư-mục-đã-cấp-quyền thì đo được là giữ đúng tên. Khoá nút đó sau một
 * điều kiện không liên quan là khoá luôn cửa thoát.
 *
 * `choosePrimaryDestination()` vốn ĐÃ viết cho ca chưa-có-workbook — nó tự
 * dựng `outputSettings`, tự tìm hồ sơ đã lưu, tự đặt `destinationMode`. Nên
 * đây là gỡ một cái khoá thừa, không phải nới một lớp bảo vệ.
 *
 * Thứ PHẢI giữ: `operatorLocked` (đang chạy thì không được đổi đích giữa
 * chừng). File này ghim cả hai chiều.
 *
 * Không grep chữ: nó CẮT vòng gán `disabled` đã ship ra khỏi `sidepanel.js` và
 * CHẠY, với hai trạng thái workbook × hai trạng thái đang-chạy. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const panel = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8").split("\r\n").join("\n");

/* ---- cắt đúng hai vòng gán đã ship --------------------------------------- */
const startAnchor = "    for (const element of [els.outputDestinationMode,";
const endAnchor = "for (const element of [els.destinationFolderBtn, els.chooseResultFolderBtn]) if (element) element.disabled = operatorLocked;";
const start = panel.indexOf(startAnchor);
const end = panel.indexOf(endAnchor);
assert.ok(start > 0, "sidepanel.js còn vòng tắt nhóm điều khiển Output");
assert.ok(end > start, "vòng riêng cho hai nút chọn thư mục còn đứng SAU vòng chung — nếu nó lên trước, vòng chung sẽ ghi đè và cái khoá quay lại");
const block = panel.slice(start, end + endAnchor.length);

/* Hai nút KHÔNG được nằm trong vòng dùng `outputLocked`. Đây là chính cái lỗi. */
const vongChung = panel.slice(start, panel.indexOf("\n", start));
assert.ok(!vongChung.includes("destinationFolderBtn"), "`destinationFolderBtn` KHÔNG được nằm trong vòng khoá theo workbook");
assert.ok(!vongChung.includes("chooseResultFolderBtn"), "`chooseResultFolderBtn` KHÔNG được nằm trong vòng khoá theo workbook");

const chay = vm.runInNewContext(
  `(function (els, outputLocked, operatorLocked) {\n${block}\nreturn els;\n})`
);

const dungEls = () => ({
  outputDestinationMode: { disabled: null }, imageOutputFolderInput: { disabled: null },
  separateResultDestinationInput: { disabled: null }, resultLocationMode: { disabled: null },
  resultDownloadsFolderInput: { disabled: null }, imagePatternInput: { disabled: null },
  resultFilenameInput: { disabled: null }, auditFilenameInput: { disabled: null },
  collisionPolicyInput: { disabled: null }, saveImagesInput: { disabled: null },
  saveResultXlsxInput: { disabled: null }, saveAuditJsonlInput: { disabled: null },
  timeoutSecInput: { disabled: null }, maxRetriesInput: { disabled: null },
  delayMinSecInput: { disabled: null }, delayMaxSecInput: { disabled: null },
  safetyCooldownInput: { disabled: null }, maxInputImagesInput: { disabled: null },
  continueOnErrorInput: { disabled: null }, rerunDoneInput: { disabled: null },
  destinationFolderBtn: { disabled: null }, chooseResultFolderBtn: { disabled: null }
});

/* ---- ca 1: CHƯA NẠP WORKBOOK, không chạy gì — ĐÚNG CA CỦA ĐỨC ------------ */
// `outputLocked` = !workbook || operatorLocked → true khi chưa có workbook.
const chuaWorkbook = chay(dungEls(), true, false);
assert.equal(chuaWorkbook.destinationFolderBtn.disabled, false, "ĐÂY là phép khẳng định mã cũ không thể vượt: chưa nạp Excel thì nút Chọn thư mục vẫn phải bấm được");
assert.equal(chuaWorkbook.chooseResultFolderBtn.disabled, false, "nút chọn thư mục Result cũng vậy");
// Và phần còn lại VẪN khoá — bản vá không được nới rộng ra ngoài hai cái nút.
assert.equal(chuaWorkbook.imagePatternInput.disabled, true, "kiểu đặt tên vẫn khoá khi chưa có workbook");
assert.equal(chuaWorkbook.saveImagesInput.disabled, true, "công tắc lưu ảnh vẫn khoá");
assert.equal(chuaWorkbook.timeoutSecInput.disabled, true, "các ô cấu hình lượt chạy vẫn khoá");

/* ---- ca 2: ĐANG CHẠY — lớp bảo vệ THẬT phải còn -------------------------- */
const dangChay = chay(dungEls(), true, true);
assert.equal(dangChay.destinationFolderBtn.disabled, true, "đang chạy thì KHÔNG được đổi thư mục đích giữa chừng — đây là lớp bảo vệ phải giữ");
assert.equal(dangChay.chooseResultFolderBtn.disabled, true, "cùng lý do cho thư mục Result");

/* ---- ca 3: có workbook, không chạy — mọi thứ mở ------------------------- */
const sanSang = chay(dungEls(), false, false);
assert.equal(sanSang.destinationFolderBtn.disabled, false);
assert.equal(sanSang.imagePatternInput.disabled, false, "có workbook thì nhóm cấu hình mở như cũ");

/* ---- ca 4: có workbook NHƯNG đang chạy --------------------------------- */
const chayCoWorkbook = chay(dungEls(), true, true);
assert.equal(chayCoWorkbook.destinationFolderBtn.disabled, true, "đang chạy vẫn khoá, bất kể workbook");

console.log("folder picker not workbook gated (B-52): PASS");
