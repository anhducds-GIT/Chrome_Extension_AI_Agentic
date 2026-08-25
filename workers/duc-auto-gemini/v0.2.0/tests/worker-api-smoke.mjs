import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const backgroundUrl = new URL("../background.js", import.meta.url);
const manifestUrl = new URL("../manifest.json", import.meta.url);
const source = fs.readFileSync(backgroundUrl, "utf8");
const manifest = JSON.parse(fs.readFileSync(manifestUrl, "utf8"));

assert.equal(Object.hasOwn(manifest, "externally_connectable"), false, "legacy browser-page ingress is removed");
assert.doesNotMatch(source, /onMessageExternal|handleExternalMessage|DAC_RUN_PROMPT|dac\.terminal_jobs|ACTIVE_JOB_KEEPALIVE|const jobs\s*=\s*new Map/);
assert.match(source, /chrome\.runtime\.onMessage\.addListener/);
assert.match(source, /DAC_DOWNLOAD_IMAGE/);
assert.equal(fs.existsSync(new URL("../worker-api-test.html", import.meta.url)), false);
assert.equal(fs.existsSync(new URL("../start-worker-api-test.bat", import.meta.url)), false);

const downloads = [];
const downloadItems = new Map();
let downloadPersistence = { fileSize: 2048, bytesReceived: 2048, exists: true };
let privateListener;
let transportCreates = 0;
const chrome = {
  sidePanel: { setPanelBehavior: async () => {} },
  runtime: {
    onInstalled: { addListener: () => {} },
    onStartup: { addListener: () => {} },
    onMessage: { addListener: (listener) => { privateListener = listener; } }
  },
  downloads: {
    download: async (options) => {
      downloads.push(options);
      const id = 77 + downloads.length - 1;
      const finalName = options.filename.includes("image_001.png")
        ? "C:\\Users\\Duc\\Downloads\\Duc Auto Gemini\\image_001 (1).png"
        : `C:\\Users\\Duc\\Downloads\\${options.filename.replace(/\//g, "\\")}`;
      downloadItems.set(id, { id, state: "complete", filename: finalName, ...downloadPersistence });
      return id;
    },
    search: async ({ id, filename }) => {
      if (id !== undefined) return downloadItems.has(id) ? [downloadItems.get(id)] : [];
      if (filename !== undefined) return [];
      return [];
    },
    onChanged: { addListener: () => {}, removeListener: () => {} }
  }
};

vm.runInNewContext(source, {
  chrome,
  URL,
  Date,
  setTimeout,
  clearTimeout,
  console,
  importScripts: () => {},
  DacBridgeLoopbackTransport: { create: () => { transportCreates += 1; return {}; } }
});
assert.equal(transportCreates, 1, "the authenticated Agent Bridge transport remains active");
assert.ok(privateListener, "private extension-only download listener remains registered");

function privateCall(message) {
  return new Promise((resolve) => {
    assert.equal(privateListener(message, {}, resolve), true);
  });
}

assert.equal(privateListener({ type: "UNRELATED" }, {}, () => {}), false);
const imageDownload = await privateCall({ type: "DAC_DOWNLOAD_IMAGE", jobId: "image:001", url: "https://chatgpt.com/generated.png" });
assert.equal(imageDownload.ok, true);
assert.equal(imageDownload.download_id, 77);
assert.equal(imageDownload.requested_filename, "Duc Auto Gemini/image_001.png");
assert.equal(imageDownload.filename, "C:\\Users\\Duc\\Downloads\\Duc Auto Gemini\\image_001 (1).png");
assert.equal(downloads.length, 1);

assert.equal((await privateCall({ type: "DAC_DOWNLOAD_IMAGE", url: "file:///not-allowed" })).code, "INVALID_IMAGE_URL");
const invalidOutputFolder = await privateCall({ type: "DAC_DOWNLOAD_IMAGE", jobId: "image:002", url: "https://chatgpt.com/generated.png", outputFolder: "../outside" });
assert.equal(invalidOutputFolder.code, "DOWNLOAD_FAILED");
assert.equal(downloads.length, 1, "unsafe output folders fail before Chrome receives a download");

downloadPersistence = { fileSize: 0, bytesReceived: 0, exists: true };
const emptyDownload = await privateCall({ type: "DAC_DOWNLOAD_IMAGE", jobId: "image:003", url: "https://chatgpt.com/generated.png" });
assert.equal(emptyDownload.code, "PERSISTENCE_VERIFICATION_FAILED");
assert.match(emptyDownload.error, /^PERSISTENCE_VERIFICATION_FAILED:/);

downloadPersistence = { fileSize: 2048, bytesReceived: 2048, exists: false };
const vanishedDownload = await privateCall({ type: "DAC_DOWNLOAD_IMAGE", jobId: "image:004", url: "https://chatgpt.com/generated.png" });
assert.equal(vanishedDownload.code, "PERSISTENCE_VERIFICATION_FAILED");

console.log("worker API migration closure smoke tests: PASS");
