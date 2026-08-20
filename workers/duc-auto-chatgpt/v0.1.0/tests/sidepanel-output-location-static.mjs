import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../sidepanel.html", import.meta.url), "utf8");
const source = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");

for (const id of ["setupScreen", "runScreen", "outputScreen", "outputLocationCard", "imageOutputText", "resultOutputText", "auditOutputText", "imagePatternInput", "resultFilenameInput", "auditFilenameInput", "collisionPolicyInput", "saveImagesInput", "saveResultXlsxInput", "saveAuditJsonlInput", "runPlanList", "runtimeSettingsCard", "referenceGallery", "failedJobsText", "runFailedBtn", "outputList", "artifactList"]) assert.match(html, new RegExp(`id="${id}"`));
assert.match(html, /SETUP/); assert.match(html, /RUN/); assert.match(html, /OUTPUT/);
assert.match(html, /Download generated images/); assert.match(html, /Save Result XLSX/); assert.match(html, /Save Audit JSONL/);
assert.match(html, /\{job_id\}, \{attempt\}, \{index\}/);
assert.match(source, /state\.validated/);
assert.match(source, /invalidateValidation/);
assert.match(source, /DacOutputLocation\.preflight/);
assert.match(source, /OUTPUT_LOCATION:/);
assert.match(source, /detected_not_downloaded/);
assert.match(source, /DETECTED_NOT_DOWNLOADED/);
assert.match(source, /writeFileWithPolicy/);
assert.match(source, /effective_image_output/);
assert.match(source, /effective_result_xlsx/);
assert.match(source, /DAC_WAIT_CHAT_READY/);
assert.match(source, /DAC_RECONCILE_IMAGE_JOB/);
assert.match(source, /ATTEMPT_ID_MISMATCH/);
assert.match(source, /protected_checkpoint/);
assert.match(source, /showScreen/);
assert.match(source, /View full queue/);
assert.match(source, /View all outputs/);
assert.match(source, /Auto-retry: No/);
assert.match(source, /showScreen\("runScreen"\)/);
assert.match(source, /showScreen\("outputScreen"\)/);
assert.match(source, /if \(state\.running && id === "outputScreen"\) return;/);
assert.ok(source.indexOf("needsReconciliation(item.phase)") < source.indexOf("canRetry(item, failureType)"), "post-submit uncertainty is reconciled before retry policy is considered");
assert.doesNotMatch(source, /location\.kind === "directory"[\s\S]{0,220}download\(/, "custom-folder writes must not fall back to Downloads");

console.log("sidepanel V1 closure static checks: PASS");

