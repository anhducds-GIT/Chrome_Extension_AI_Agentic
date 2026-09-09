/* Live regression 2026-08-28: the panel messaged DAC_EXPECT_DOWNLOAD_NAME, then
   started the blob download in a LATER turn. MV3 could suspend background.js
   between those calls, erase its in-memory reservation, and Chrome persisted a
   GUID leaf. Bản vá lúc đó: dồn cả đặt-chỗ, `downloads.download`, chờ hoàn tất
   và đối chiếu byte vào MỘT lời nhắn chạy trong background.

   ĐẢO LẠI 2026-09-09, và lý do là số đo chứ không phải ý thích:

     · gói này (worker gọi `download()`)  → 67 file trong MỘT ngày, toàn tên
       GUID, nằm PHẲNG trong thư mục tải mặc định — thư mục con bị bỏ luôn;
     · gói Gemini (PANEL gọi `download()`) → `Duc Auto Gemini/<job>/Q001.jpg`
       … `Q007.jpg`, đúng tên, thư mục con HAI CẤP — cùng máy, cùng Chrome.

   Nên câu "Chrome bỏ qua `filename` với blob URL" là sự thật của MỘT CÁCH GỌI.
   Nó đứng tám tuần và biến B-36 thành "không chữa được".

   Bản vá mới giữ NGUYÊN thứ tự an toàn — đặt chỗ TRƯỚC khi tải, chờ hoàn tất,
   đối chiếu byte, và lỗi nghiệm thu chặn trước khi gửi prompt — chỉ đổi AI là
   người gọi `download()`. Điều mà bản 28/08 sợ (worker ngủ giữa hai lượt) vẫn
   được chặn: lời nhắn đặt chỗ ĐÁNH THỨC worker và lời gọi `download()` đi ngay
   sau nó trong CÙNG một lượt của panel, không còn khoảng chờ nào ở giữa. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const background = fs.readFileSync(new URL("../background.js", import.meta.url), "utf8");
const panel = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");
const runner = fs.readFileSync(new URL("../runner-core.js", import.meta.url), "utf8");

let determiningListener;
let messageListener;
let suggested;
const guidLeaf = "8bd2ab09-d874-4ba3-84f2-6e958f767cff";
const downloadItem = { id: 71, url: "blob:extension-artifact", byExtensionId: "extension-test", state: "complete", filename: `C:\\Users\\tester\\Downloads\\${guidLeaf}`, fileSize: 19, bytesReceived: 19, exists: true };
const chrome = {
  runtime: {
    id: "extension-test",
    onInstalled: { addListener() {} },
    onStartup: { addListener() {} },
    onMessage: { addListener(listener) { messageListener = listener; } }
  },
  sidePanel: { async setPanelBehavior() {} },
  downloads: {
    onDeterminingFilename: { addListener(listener) { determiningListener = listener; } },
    onChanged: { addListener() {}, removeListener() {} },
    async download(options) {
      determiningListener({ ...downloadItem, url: options.url }, (value) => { suggested = value; });
      return downloadItem.id;
    },
    async search(query) { return query.id === downloadItem.id ? [downloadItem] : []; }
  }
};
const runtime = vm.createContext({
  chrome,
  console,
  URL,
  setTimeout,
  clearTimeout,
  globalThis: null,
  importScripts() {},
  DacBridgeLoopbackTransport: { create() { return {}; } }
});
runtime.globalThis = runtime;
vm.runInContext(background, runtime, { filename: "background.js" });
vm.runInContext(fs.readFileSync(new URL("../output-location-core.js", import.meta.url), "utf8"), runtime, { filename: "output-location-core.js" });
vm.runInContext(runner, runtime, { filename: "runner-core.js" });

function dispatch(message) {
  return new Promise((resolve, reject) => {
    try {
      const keepAlive = messageListener(message, {}, resolve);
      if (keepAlive !== true) reject(new Error("Expected an asynchronous background response."));
    } catch (error) { reject(error); }
  });
}
/* `DAC_EXPECT_DOWNLOAD_NAME` trả lời ĐỒNG BỘ (`return false`), nên nó cần một
   cửa khác — dùng `dispatch` cho nó sẽ đỏ vì "Expected an asynchronous
   response", một cái đỏ nói sai nguyên nhân. */
function dispatch2(message) {
  let answer;
  const keepAlive = messageListener(message, {}, (value) => { answer = value; });
  assert.equal(keepAlive, false, "lời nhắn đặt chỗ tên trả lời đồng bộ");
  return Promise.resolve(answer);
}

assert.match(background, /message\?\.type === "DAC_DOWNLOAD_ARTIFACT"/, "background vẫn sở hữu bước NGHIỆM THU artifact");
const transaction = background.slice(background.indexOf("async function downloadArtifact"), background.indexOf("function safeArtifactFilename"));
assert.match(transaction, /await waitForCompletedDownload\(downloadId\)/, "worker chờ Chrome báo hoàn tất");
assert.match(transaction, /verifyCompletedDownload\(item, Number\(message\.expectedBytes\)\)/, "worker đối chiếu số byte đã ghi");
// Điều bản vá 09/09 đổi, và là điều dễ bị lặng lẽ đảo ngược nhất.
// Neo vào `({` chứ không phải `(`: thông điệp lỗi trong chính hàm này CÓ nhắc
// tên `chrome.downloads.download()` để chỉ đường cho người đọc, và một phép
// kiểm không phân biệt được LỜI GỌI với CÂU CHỮ sẽ đỏ vì đúng câu giải thích
// nó. Đã đỏ một lần khi viết bản vá này, và đây là lần thứ hai trong ngày.
assert.doesNotMatch(transaction, /chrome\.downloads\.download\(\{/, "worker KHÔNG được tự gọi `download()` nữa — đó chính là cách gọi làm mất tên và mất cả thư mục con (đo 09/09: 67 file GUID trong một ngày)");

// Panel là nơi gọi, và đặt chỗ phải đi TRƯỚC — cùng một lượt, không còn khoảng
// chờ nào để MV3 chen vào (đó là thứ bản 28/08 sợ, và nó vẫn được chặn).
const panelFn = panel.slice(panel.indexOf("async function downloadArtifactViaBackground"), panel.indexOf("async function downloadArtifactViaBackground") + 1600);
assert.match(panelFn, /type: "DAC_EXPECT_DOWNLOAD_NAME"/, "panel đặt chỗ tên trước");
assert.match(panelFn, /chrome\.downloads\.download\(\{ url, filename: request\.filename, conflictAction: request\.conflictAction, saveAs: false \}\)/, "PANEL là nơi gọi `downloads.download()` — cách Gemini làm, và là cách duy nhất đo được là giữ đúng tên");
assert.ok(panelFn.indexOf("DAC_EXPECT_DOWNLOAD_NAME") < panelFn.indexOf("chrome.downloads.download"), "đặt chỗ phải đứng TRƯỚC lời gọi tải");
assert.ok(panelFn.indexOf("chrome.downloads.download") < panelFn.indexOf('type: "DAC_DOWNLOAD_ARTIFACT"'), "tải xong mới nhờ worker nghiệm thu");
assert.equal((panel.match(/downloadArtifactViaBackground\(objectUrl, request/g) || []).length, 2, "Audit JSONL và Result XLSX dùng chung một đường");
assert.match(panel, /if \(!response\?\.ok\) throw new Error\(response\?\.error/, "lỗi nghiệm thu vẫn dội ngược tới cửa chặn trước-khi-gửi");

// The safety property that contained the live incident must remain explicit:
// no verified audit/checkpoint means the content receiver is never called.
assert.match(runner, /if \(!auditFile\) throw new Error\("PERSISTENCE_VERIFICATION_FAILED:/, "missing audit blocks before submission");
assert.match(runner, /if \(!resultFile\) throw new Error\("PERSISTENCE_VERIFICATION_FAILED:/, "missing checkpoint blocks before submission");

const request = runtime.DacOutputLocation.downloadArtifactRequest({ kind: "downloads", folder: "Duc Auto ChatGPT" }, "Quick-2026-08-27T18-49__audit.jsonl", "fail");
// CHẠY ĐÚNG TRÌNH TỰ MỚI, không chỉ đọc chữ: panel đặt chỗ → panel tải →
// worker nghiệm thu. Đây là thứ bản ghim cũ không diễn được, vì hồi đó cả ba
// bước nằm trong một lời nhắn.
await dispatch2({ type: "DAC_EXPECT_DOWNLOAD_NAME", url: downloadItem.url, filename: request.filename, conflictAction: request.conflictAction });
const panelDownloadId = await chrome.downloads.download({ url: downloadItem.url, filename: request.filename, conflictAction: request.conflictAction, saveAs: false });
const response = await dispatch({ type: "DAC_DOWNLOAD_ARTIFACT", download_id: panelDownloadId, filename: request.filename, expectedBytes: 19 });
assert.equal(response.ok, true, "worker nhìn thấy một lượt tải hoàn tất, khác 0 byte");
assert.equal(suggested?.filename, request.filename, "onDeterminingFilename suggests the reserved physical path");
assert.equal(suggested?.conflictAction, request.conflictAction, "onDeterminingFilename preserves the reserved collision action");
assert.equal(response.filename, downloadItem.filename, "the transaction returns Chrome's actual completed filename, not its requested name");

let promptSendCount = 0;
await assert.rejects(
  async () => {
    await runtime.DacRunnerCore.verifiedRunCheckpoint({
      persistAudit: async () => {
        runtime.DacOutputLocation.verifyDownloadedFilename(request, response.filename);
        return response.filename;
      },
      persistLedger: async () => "unused.xlsx"
    });
    promptSendCount += 1;
  },
  /PERSISTENCE_FILENAME_MISMATCH: requested 'Quick-2026-08-27T18-49__audit\.jsonl' but Chrome reported '8bd2ab09-d874-4ba3-84f2-6e958f767cff'/
);
assert.equal(promptSendCount, 0, "a GUID physical filename fails the real pre-send checkpoint before prompt submission");

console.log("persistence download filename regression: PASS");
