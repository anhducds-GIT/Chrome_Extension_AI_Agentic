import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../sidepanel.html", import.meta.url), "utf8");
const source = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");

for (const id of ["outputLocationCard", "imageOutputText", "resultOutputText", "chooseImageFolderBtn", "useSourceFolderBtn", "changeImageFolderBtn", "resultFilenameInput", "runPlanCard", "runtimeSettingsCard", "referenceGallery", "failedJobsText", "runPendingBtn", "runFailedBtn", "retrySelectedBtn"]) assert.match(html, new RegExp(`id="${id}"`));
assert.match(html, /Generated Images:/);
assert.match(html, /Result XLSX:/);
assert.match(source, /DacOutputLocation\.preflight/);
assert.match(source, /OUTPUT_LOCATION:/);
assert.match(source, /saveGeneratedImage/);
assert.match(source, /writeUniqueFile/);
assert.match(source, /effective_image_output/);
assert.match(source, /effective_result_xlsx/);
assert.match(source, /findAvailableFilename\(location\.handle/);
assert.match(source, /snapshotOutputSettings\(filename\)/, "custom result filename is snapshotted before its workbook blob is created");
assert.match(source, /waitForCompletedDownload\(downloadId\)/, "Downloads result waits for its final DownloadItem filename");
assert.match(source, /showDirectoryPicker/);
assert.match(source, /Failed \/ Interrupted:/);
assert.match(source, /DAC_WAIT_CHAT_READY/);
assert.match(source, /max_retries/);
assert.match(source, /attempt_count/);
assert.match(source, /DAC_RECONCILE_IMAGE_JOB/);
assert.match(source, /OUTPUT_SAVED/);
assert.match(source, /POST_SUBMIT_UNCERTAIN/);
assert.match(source, /saveAuditLog/);
assert.match(source, /run-\$\{state\.runId\}\.jsonl/);
assert.match(source, /status: "INTERRUPTED"/);
assert.match(source, /Pre-submit ChatGPT readiness gate/);
assert.ok(source.indexOf("output_saved_at") < source.indexOf("await waitForChatReady(item)"), "saved output checkpoint is written before the later ChatGPT readiness wait");
assert.ok(source.indexOf("needsReconciliation(item.phase)") < source.indexOf("canRetry(item, failureType)"), "post-submit uncertainty is reconciled before retry policy is considered");
assert.match(html, /Retry Selected/);
assert.doesNotMatch(source, /location\.kind === "directory"[\s\S]{0,220}download\(/, "custom-folder writes must not fall back to Downloads");

console.log("sidepanel output-location static checks: PASS");
