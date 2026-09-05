import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const base = new URL("../", import.meta.url);
const html = fs.readFileSync(new URL("sidepanel.html", base), "utf8");
const css = fs.readFileSync(new URL("sidepanel.css", base), "utf8");
const source = fs.readFileSync(new URL("sidepanel.js", base), "utf8");
const semanticsSource = fs.readFileSync(new URL("sidepanel-ui-semantics.js", base), "utf8");
const context = vm.createContext({});
vm.runInContext(semanticsSource, context);
const ui = context.DacSidepanelUiSemantics;
const format = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

// SETUP: Naming is visible and no longer hidden inside advanced output details.
assert.match(html, /id="namingSetupSection"/);
assert.match(html, /class="workbook-layout"/);
assert.match(css, /\.workbook-layout \{ display: grid; gap: 8px; \}/);
assert.match(css, /\.workbook-layout \{ grid-template-columns: minmax\(0, 1fr\) minmax\(220px, 0\.9fr\);/);
assert.match(html, /class="workbook-actions">\s*<button id="changeWorkbookBtn"[\s\S]*?<button id="continueExistingRunBtn"/, "Continue Existing Run sits beside Change in one action group");
assert.match(css, /\.workbook-actions \{ display: flex; align-items: center; gap: 6px;/, "workbook actions share one compact row");
assert.doesNotMatch(html, /class="existing-run-actions"/, "Continue Existing Run no longer occupies a separate row");
assert.match(css, /\.collision-option \{\s*display: grid;\s*grid-template-columns: auto minmax\(0, 1fr\);/, "checkpoint collision choices reserve only the radio width before their content");
assert.match(css, /\.collision-option input\[type="radio"\] \{ width: auto; height: auto;/, "global full-width input styling cannot stretch collision radios");
assert.match(css, /\.recreate-confirm-dialog \{[\s\S]*?overflow-x: hidden;/, "dialogs do not expose a horizontal scrollbar for long checkpoint names");
for (const id of ["imagePatternInput", "resultFilenameInput", "auditFilenameInput", "collisionPolicyInput"]) assert.match(html, new RegExp(`id="${id}"`));
assert.ok(html.indexOf('id="namingSetupSection"') < html.indexOf('id="outputAdvancedDetails"'));
const advancedOutputStart = html.indexOf('<details class="secondary-details" id="outputAdvancedDetails">');
const advancedOutputEnd = html.indexOf("</details>", advancedOutputStart);
const advancedOutputHtml = html.slice(advancedOutputStart, advancedOutputEnd);
for (const id of ["resultFilenameInput", "auditFilenameInput", "runIdText", "checkpointVersionText", "checkpointFilenameText"]) {
  assert.match(advancedOutputHtml, new RegExp(`id="${id}"`), `${id} stays inside the collapsed advanced-output section`);
}
for (const id of ["imagePatternInput", "collisionPolicyInput"]) {
  assert.ok(html.indexOf(`id="${id}"`) < advancedOutputStart, `${id} remains visible in the primary Naming section`);
}
assert.match(advancedOutputHtml, /Chỉ để xem trước nơi extension sẽ lưu file/, "destination previews explain that they are informational and automatic");
assert.match(source, /markLocalOverride\("output_naming"\)/, "naming changes retain local-override invalidation");
assert.match(source, /markLocalOverride\("result_filename_pattern"\)/, "Result checkpoint pattern retains local-override invalidation");
assert.match(html, /Mẫu tên checkpoint kết quả/);
for (const id of ["runIdText", "checkpointVersionText", "checkpointFilenameText"]) assert.match(html, new RegExp(`id="${id}"`));
assert.match(html, /id="namingProvenance"/);
assert.match(source, /XLSX \+ local override/);
assert.match(source, /renderNamingProvenance\(\)/);
assert.match(html, /<option value="overwrite">Ghi đè file hiện có<\/option>/);
assert.match(html, /<option value="uniquify" selected>Giữ cả hai — tự thêm số<\/option>/);
assert.match(html, /<option value="fail">Dừng và báo trùng tên<\/option>/);
assert.match(html, /ĐẶT TÊN/);
assert.match(html, /Mẫu tên file ảnh/);
assert.match(html, /Khi tên file đã tồn tại/);
assert.match(css, /\.naming-grid label \{ align-self: start; align-content: start;/, "advanced naming controls align at the top even when only one field has help text");
assert.match(css, /\.naming-grid input, \.naming-grid select \{ min-height: 38px;[^}]*font-size: 13px;/, "Naming controls are larger and easier to read");
assert.match(html, /Quy định cách xử lý khi đã có file trùng tên\./);
for (const id of ["delayMinSecInput", "delayMaxSecInput", "safetyCooldownInput"]) assert.match(html, new RegExp(`id="${id}"`));
assert.match(html, /id="safetyCooldownInput"[^>]*placeholder="6-9"/, "Safety cooldown accepts a fixed value or an explicit random range");
for (const unit of ["giây", "lần"]) assert.match(html, new RegExp(`<span class="runtime-unit">${unit}</span>`));
assert.equal((html.match(/<span class="runtime-unit">giây<\/span>/g) || []).length, 4, "all four time fields show seconds");
assert.equal((html.match(/<span class="runtime-unit">lần<\/span>/g) || []).length, 1, "Retries shows an attempt-count unit");
assert.match(css, /\.runtime-settings-grid \{ grid-template-columns: repeat\(auto-fit, minmax\(116px, 120px\)\); justify-content: start;/, "small numeric settings stop stretching to fill the card");
assert.match(css, /\.runtime-value-input \{[^}]*min-height: 34px;/, "compact fields retain a usable target height");
assert.match(source, /delay_min_sec: els\.delayMinSecInput\.value/);
assert.match(source, /delay_max_sec: els\.delayMaxSecInput\.value/);

// SETUP: destination controls are mutually exclusive by actual location mode.
assert.match(source, /DacSidepanelUiSemantics\.destinationVisibility\(state\.destinationMode\)/);
assert.match(html, /Relative to Chrome Downloads\. No folder selection required\./);
assert.match(css, /\.destination-authorized\[hidden\][^{]*\{ display: none !important;/);
assert.match(css, /\.destination-authorized \{[^}]*display: grid;[^}]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/);
assert.match(css, /\.destination-authorized \.output-folder-hint \{[^}]*grid-column: 1 \/ -1;[^}]*display: grid;/);
assert.match(css, /\.destination-authorized \.output-folder-hint output \{[^}]*text-overflow: ellipsis;[^}]*white-space: nowrap;/);
assert.match(source, /els\.folderHintText\.title = values\.folderHint \|\| ""/);
assert.equal(ui.destinationVisibility("downloads").showDownloads, true);
assert.equal(ui.destinationVisibility("downloads").showProfile, false);
assert.equal(ui.destinationVisibility("profile").showDownloads, false);
assert.equal(ui.destinationVisibility("profile").showProfile, true);

// RUN: all six factual runtime fields stay available, including empty states.
for (const id of ["runtimeJobElapsed", "runtimeCurrentOperation", "runtimeTimeoutRemaining", "runtimeRetryState", "runtimeInterJobDelay", "runtimeNextTransition"]) assert.match(html, new RegExp(`id="${id}"`));
assert.match(css, /\.runtime-information-grid/);
assert.match(html, /runtime-information--timer[^>]*>\s*<span>⏱ Job elapsed<\/span><output id="runtimeJobElapsed"/, "elapsed time has the prominent timer treatment");
assert.match(html, /runtime-information--timer[^>]*>\s*<span>⌛ Operation timeout remaining<\/span><output id="runtimeTimeoutRemaining"/, "timeout time has the prominent timer treatment");
assert.match(css, /\.timer-badge #operatorTimerText \{ font-size: 17px; font-variant-numeric: tabular-nums;/, "the live attempt timer is visually prominent");
assert.match(css, /\.runtime-information--timer output \{ color: #1e3a8a; font-size: 18px; font-variant-numeric: tabular-nums;/, "timer values are large and scan-friendly");
assert.match(html, /id="runDashboardSplit"[\s\S]*?id="runWidthSplitter"[^>]*role="separator"/, "Run dashboard exposes a semantic adjustable-width handle");
assert.match(html, /id="runWidthSplitter"[^>]*>[\s\S]*?↔/, "the handle uses a bidirectional resize cue, not a one-way collapse arrow");
assert.match(css, /grid-template-columns: minmax\(220px, var\(--run-left-pane-width, 1fr\)\) 14px minmax\(260px, 1fr\)/, "both Run columns are controlled by one persisted split width");
assert.match(source, /RUN_SPLIT_STORAGE_KEY = "dac_run_split_ratio"/);
assert.match(source, /pointerdown[\s\S]*?pointermove[\s\S]*?applyRunSplitRatio/, "the separator supports real pointer dragging");
assert.match(source, /\["ArrowLeft", "ArrowRight", "Home"\]/, "the separator remains keyboard adjustable");

// RUN: Current Job keeps the prompt and real attached reference images together.
for (const id of ["currentJobContent", "currentPromptPreview", "currentReferenceColumn", "currentReferenceGallery"]) assert.match(html, new RegExp(`id="${id}"`));
assert.match(css, /\.current-job-content \{ display: grid; grid-template-columns: minmax\(0, 1fr\) minmax\(110px, 0\.65fr\);/, "Current Job uses prompt and reference-image columns when width permits");
assert.match(css, /\.current-reference-gallery \{ display: grid;/, "attached images render as a compact thumbnail gallery");
assert.match(source, /function renderCurrentJobReferences\(item\)/, "Current Job references are rendered from the live queue item");
assert.match(source, /reference\?\.dataUrl/, "only real selected reference images are rendered");
assert.match(source, /image\.src = reference\.dataUrl/, "Current Job thumbnail source is the actual attached image");
assert.match(source, /renderCurrentJobReferences\(item\);/, "thumbnail state updates with the Current Job state");

const inactive = ui.runtimeInfo({ running: false, settings: { delay_min_sec: 3, delay_max_sec: 3 } }, 10, format);
assert.equal(inactive.jobElapsed, "—");
assert.equal(inactive.currentOperation, "—");
assert.equal(inactive.operationTimeoutRemaining, "Not scheduled");
assert.equal(inactive.retryState, "Not scheduled");
assert.equal(inactive.interJobDelay, "Configured delay: fixed 3s");
assert.equal(inactive.nextTransition, "Waiting…");

const delayed = ui.runtimeInfo({
  running: true,
  currentItem: { status: "SUCCESS", settings: { delay_min_sec: 3, delay_max_sec: 5, timeout_sec: 120, max_retries: 2 } },
  currentStage: "INTER_JOB_DELAY",
  interJobCountdown: 4,
  selectedInterJobDelay: 4
}, 1000, format);
assert.equal(delayed.interJobDelay, "Configured delay: 3–5s · Selected this transition: 4s");
assert.equal(delayed.nextTransition, "Next readiness check in 00:04");
assert.match(delayed.timerText, /^Next readiness check in 00:04/);

const awaiting = ui.runtimeInfo({
  running: true,
  currentItem: { status: "RECONCILING", runtime_stage: "WAITING_READY", settings: { delay_min_sec: 3, delay_max_sec: 3, timeout_sec: 120, max_retries: 2 } },
  currentStage: "WAITING_READY"
}, 1000, format);
assert.equal(awaiting.nextTransition, "Awaiting Flow readiness confirmation");
assert.equal(awaiting.timerText, "Awaiting Flow readiness confirmation");

const retry = ui.runtimeInfo({
  running: true,
  currentItem: { status: "PENDING", phase: "PRE_SUBMIT", retry_count: 1, settings: { delay_min_sec: 3, delay_max_sec: 3, timeout_sec: 120, max_retries: 2 } },
  retryResumeAt: 6000
}, 1000, format);
assert.equal(retry.retryState, "Retry 1/2 · next retry in 00:05");
assert.equal(retry.nextTransition, "Retry is pending; readiness will be checked before submission");
assert.match(source, /state\.retryResumeAt = Date\.now\(\) \+ retryCooldownMs/);

const queueRunning = { status: "RUNNING", submitted_at: "2026-08-21T00:00:00.000Z" };
assert.equal(ui.queueElapsed(queueRunning, { currentItem: queueRunning, currentStartedAt: Date.parse("2026-08-21T00:00:00.000Z") }, Date.parse("2026-08-21T00:00:42.000Z"), format), "00:42");
assert.equal(ui.queueElapsed({ status: "SUCCESS", submitted_at: "2026-08-21T00:00:00.000Z", completed_at: "2026-08-21T00:01:37.000Z" }, {}, Date.now(), format), "01:37");
assert.equal(ui.queueElapsed({ status: "PENDING" }, {}, Date.now(), format), "—");
assert.match(source, /statusWithElapsed/);
assert.match(css, /\.runtime-information output[^}]*font-size: 14px/);

// OUTPUT: result cards retain job/artifact identity and use persistence as Saved authority.
assert.match(html, /id="outputList" class="queue-list output-results-list"/);
assert.match(css, /grid-template-columns: repeat\(auto-fit, minmax\(145px, 1fr\)\)/);
assert.match(css, /width: 58px; height: 58px/);
assert.match(source, /const isSaved = Boolean\(item\.persistence_verified && item\.result_file\)/);
assert.match(source, /output-filename/);
assert.match(source, /downloadArtifactRequest\(location, filename, "fail"\)/, "Result checkpoints always require an exact version filename");
assert.match(source, /downloadArtifactRequest\(location, requested, "fail"\)/, "Audit JSONL retains one stable filename");
assert.match(source, /verifyDownloadedFilename\(request, item\.filename\)/);

// Open-folder behavior is capability truthful: only default Downloads can be opened.
const downloadsAction = ui.outputFolderAction({ kind: "downloads", folder: "pilot-03" });
assert.equal(downloadsAction.enabled, true);
assert.equal(downloadsAction.label, "📁 Open Chrome Downloads");
assert.match(downloadsAction.note, /cannot open the configured Downloads subfolder directly/i);
const profileAction = ui.outputFolderAction({ kind: "directory", label: "pilot-03" });
assert.equal(profileAction.enabled, false);
assert.equal(profileAction.label, "📁 Authorized folder — open manually");
assert.match(profileAction.note, /cannot open its native folder window/i);
assert.match(source, /function openOutputFolder\(\)/);
assert.match(source, /chrome\.downloads\.showDefaultFolder\(\)/);
assert.match(source, /openOutputFolderBtn\.addEventListener\("click", openOutputFolder\)/);

// Extension UI zoom is local CSS scaling and does not call tab zoom APIs.
assert.match(html, /UI ZOOM/);
for (const level of ["1", "1.1", "1.2"]) assert.match(html, new RegExp(`data-ui-zoom="${level}"`));
assert.match(css, /--dac-ui-zoom: 1/);
assert.match(css, /zoom: var\(--dac-ui-zoom\)/);
assert.match(css, /width: 100%;/, "the app layout always fills the side-panel width");
assert.doesNotMatch(css, /width: calc\(100% \/ var\(--dac-ui-zoom\)\)/, "UI zoom must not shrink the app layout box and leave a right gutter");
assert.match(css, /\.header-meta \{[\s\S]*?flex-direction: row;[\s\S]*?flex-wrap: wrap;[\s\S]*?justify-content: flex-end;/, "header controls use horizontal space before adding height");
assert.match(css, /@container sidepanel \(max-width: 479px\)[\s\S]*?\.header \{ flex-wrap: wrap; \}/, "narrow panels wrap the compact header safely instead of overflowing");
assert.match(source, /UI_ZOOM_STORAGE_KEY = "dac_ui_zoom"/);
assert.match(source, /chrome\.storage\.local\.get\(UI_ZOOM_STORAGE_KEY\)/);
assert.equal(ui.normalizeUiZoom(1), 1);
assert.equal(ui.normalizeUiZoom(1.1), 1.1);
assert.equal(ui.normalizeUiZoom(1.2), 1.2);
assert.equal(ui.normalizeUiZoom(0.9), 1);

// Wide layout reacts to the side-panel container, not browser viewport media queries.
assert.match(css, /container-type: inline-size/);
assert.match(css, /@container sidepanel \(min-width: 620px\)/);
assert.match(css, /@container sidepanel \(min-width: 780px\)/);
assert.match(css, /#outputLocationCard \.naming-grid \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
assert.doesNotMatch(css, /@media \(min-width:/);

// Check Plan stays local-only; no prompt submission appears in its handler path.
const validateStart = source.indexOf("async function validate(");
const validateEnd = source.indexOf("async function copyReviewPacket(");
assert.ok(validateStart >= 0 && validateEnd > validateStart);
assert.doesNotMatch(source.slice(validateStart, validateEnd), /DAC_RUN_IMAGE_JOB|PROMPT_SUBMITTED/);

console.log("V1 UI/UX closure static tests: PASS");

// 2026-08-25 pilot regression: browser-side download renaming must degrade to a
// warning with the real name recorded — never an artifact failure — but ONLY
// when Chrome confirms the download completed and exists.
assert.match(source, /function verifyArtifactDownload\(request, item\)/);
assert.match(source, /item\?\.state !== "complete" \|\| item\?\.exists === false/, "rename tolerance still fails closed when the file is missing or incomplete");
assert.match(source, /renamed: true/, "the accepted rename is recorded, not hidden");
console.log("artifact rename-tolerance pins: PASS");
