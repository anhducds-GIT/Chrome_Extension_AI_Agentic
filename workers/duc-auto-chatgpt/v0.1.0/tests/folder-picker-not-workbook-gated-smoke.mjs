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
const startAnchor = "    for (const element of [els.imageOutputFolderInput,";
const endAnchor = "for (const element of [els.outputDestinationMode, els.destinationFolderBtn, els.chooseResultFolderBtn]) if (element) element.disabled = operatorLocked;";
const start = panel.indexOf(startAnchor);
const end = panel.indexOf(endAnchor);
assert.ok(start > 0, "sidepanel.js còn vòng tắt nhóm điều khiển Output");
assert.ok(end > start, "vòng riêng cho nhóm chọn-đích còn đứng SAU vòng chung — nếu nó lên trước, vòng chung sẽ ghi đè và cái khoá quay lại");
const block = panel.slice(start, end + endAnchor.length);

/* Ba điều khiển KHÔNG được nằm trong vòng dùng `outputLocked`. Đây là chính cái lỗi.
   `outputDestinationMode` cũng nằm đây, và nó là cái tôi BỎ SÓT ở lượt vá đầu: mở nút
   mà khoá ô chọn chế độ thì Đức không tới được cái nút. */
const vongChung = panel.slice(start, panel.indexOf("\n", start));
for (const ten of ["destinationFolderBtn", "chooseResultFolderBtn", "outputDestinationMode"]) {
  assert.ok(!vongChung.includes(ten), `\`${ten}\` KHÔNG được nằm trong vòng khoá theo workbook`);
}

/* ---- KHOÁ THỨ BA, sâu nhất: `renderOutput` từng THOÁT SỚM ---------------- */
// Khối thư-mục-đã-cấp-quyền mặc định `hidden` trong HTML và chỉ được hiện bên
// trong `renderOutput`. Thoát sớm khi chưa có workbook = khối không bao giờ
// hiện = nút mở khoá vẫn vô hình. Đây là thứ làm lượt vá ⑴ trông như đã xong
// mà Đức vẫn không bấm được.
assert.doesNotMatch(
  panel,
  /if \(!state\.outputSettings \|\| !state\.workbook\) \{[\s\S]{0,400}?Open an XLSX to set locations/,
  "`renderOutput` KHÔNG được thoát sớm theo `!state.workbook` — làm vậy là khối chọn thư mục không bao giờ được vẽ"
);
const render = panel.slice(panel.indexOf("function renderOutput()"), panel.indexOf("function renderOutput()") + 2800);
assert.match(
  render,
  /if \(!state\.outputSettings\) state\.outputSettings = window\.DacOutputLocation\.fromWorkbook\(\{\}, "phien-chua-mo-workbook\.xlsx"\)/,
  "chưa có workbook thì dựng bộ cấu hình mặc định để VẼ ĐƯỢC khối chọn thư mục"
);
assert.match(render, /authorizedDestinationControls\.hidden = !visibility\.showProfile/, "khối thư mục đã cấp quyền vẫn được hiện/ẩn theo chế độ đích");
// Và bộ đổi chế độ phải chịu được ca chưa-có-workbook, nếu không nó ném và
// try/catch nuốt thành một dòng đỏ khó hiểu.
const doiCheDo = panel.slice(panel.indexOf("function setOutputDestinationMode()"), panel.indexOf("function setOutputDestinationMode()") + 900);
assert.match(doiCheDo, /if \(!state\.outputSettings\) state\.outputSettings = window\.DacOutputLocation\.fromWorkbook/, "đổi chế độ đích phải chạy được khi chưa có workbook");

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
// Ô CHỌN CHẾ ĐỘ: không mở nó thì Đức không tới được cái nút, vì khối chứa nút
// chỉ hiện ở chế độ *thư mục đã cấp quyền*. Đây là cái tôi bỏ sót ở lượt vá đầu.
assert.equal(chuaWorkbook.outputDestinationMode.disabled, false, "chưa có workbook thì vẫn phải đổi được chế độ đích — nếu không, nút Chọn thư mục nằm trong khối không bao giờ hiện");
// Và phần còn lại VẪN khoá — bản vá không được nới rộng ra ngoài hai cái nút.
assert.equal(chuaWorkbook.imagePatternInput.disabled, true, "kiểu đặt tên vẫn khoá khi chưa có workbook");
assert.equal(chuaWorkbook.saveImagesInput.disabled, true, "công tắc lưu ảnh vẫn khoá");
assert.equal(chuaWorkbook.timeoutSecInput.disabled, true, "các ô cấu hình lượt chạy vẫn khoá");

/* ---- ca 2: ĐANG CHẠY — lớp bảo vệ THẬT phải còn -------------------------- */
const dangChay = chay(dungEls(), true, true);
assert.equal(dangChay.destinationFolderBtn.disabled, true, "đang chạy thì KHÔNG được đổi thư mục đích giữa chừng — đây là lớp bảo vệ phải giữ");
assert.equal(dangChay.chooseResultFolderBtn.disabled, true, "cùng lý do cho thư mục Result");
assert.equal(dangChay.outputDestinationMode.disabled, true, "đang chạy thì cũng không được đổi CHẾ ĐỘ đích");

/* ---- ca 3: có workbook, không chạy — mọi thứ mở ------------------------- */
const sanSang = chay(dungEls(), false, false);
assert.equal(sanSang.destinationFolderBtn.disabled, false);
assert.equal(sanSang.imagePatternInput.disabled, false, "có workbook thì nhóm cấu hình mở như cũ");

/* ---- ca 4: có workbook NHƯNG đang chạy --------------------------------- */
const chayCoWorkbook = chay(dungEls(), true, true);
assert.equal(chayCoWorkbook.destinationFolderBtn.disabled, true, "đang chạy vẫn khoá, bất kể workbook");

console.log("folder picker not workbook gated (B-52): PASS");
