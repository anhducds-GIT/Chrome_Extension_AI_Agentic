/* Live regression 2026-08-28:
   the panel first messaged DAC_EXPECT_DOWNLOAD_NAME, then started the blob
   download in a later turn. MV3 could suspend background.js between those
   calls, erase its in-memory reservation, and Chrome persisted a GUID leaf.
   The prompt correctly remained unsent, but every retry hit the same gate.

   The fix keeps reservation, chrome.downloads.download, completion polling,
   and byte verification inside one background message transaction. */
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

assert.match(background, /message\?\.type === "DAC_DOWNLOAD_ARTIFACT"/, "background owns an atomic artifact-download RPC");
const transaction = background.slice(background.indexOf("async function downloadArtifact"), background.indexOf("function safeArtifactFilename"));
assert.match(transaction, /rememberExpectedDownloadName\(url, requestedFilename, conflictAction\)/, "the transaction reserves the requested physical name");
assert.match(transaction, /chrome\.downloads\.download\(\{ url, filename: requestedFilename, conflictAction, saveAs: false \}\)/, "the same transaction starts the download");
assert.match(transaction, /await waitForCompletedDownload\(downloadId\)/, "the same transaction waits for Chrome completion");
assert.match(transaction, /verifyCompletedDownload\(item, Number\(message\.expectedBytes\)\)/, "the same transaction verifies persisted bytes");
assert.ok(transaction.indexOf("rememberExpectedDownloadName") < transaction.indexOf("chrome.downloads.download"), "reservation precedes download");

assert.doesNotMatch(panel, /chrome\.downloads\.download\(\{ url: objectUrl/, "the panel cannot split blob download from background naming state");
assert.equal((panel.match(/downloadArtifactViaBackground\(objectUrl, request/g) || []).length, 2, "Audit JSONL and Result XLSX both use the atomic path");
assert.match(panel, /if \(!response\?\.ok\) throw new Error\(response\?\.error/, "background verification failure propagates to the pre-send barrier");

// The safety property that contained the live incident must remain explicit:
// no verified audit/checkpoint means the content receiver is never called.
assert.match(runner, /if \(!auditFile\) throw new Error\("PERSISTENCE_VERIFICATION_FAILED:/, "missing audit blocks before submission");
assert.match(runner, /if \(!resultFile\) throw new Error\("PERSISTENCE_VERIFICATION_FAILED:/, "missing checkpoint blocks before submission");

const request = runtime.DacOutputLocation.downloadArtifactRequest({ kind: "downloads", folder: "Duc Auto ChatGPT" }, "Quick-2026-08-27T18-49__audit.jsonl", "fail");
const response = await dispatch({ type: "DAC_DOWNLOAD_ARTIFACT", url: downloadItem.url, filename: request.filename, conflictAction: request.conflictAction, expectedBytes: 19 });
assert.equal(response.ok, true, "the background transaction observes a complete non-empty download");
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
