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
for (const id of ["imagePatternInput", "resultFilenameInput", "auditFilenameInput", "collisionPolicyInput"]) assert.match(html, new RegExp(`id="${id}"`));
assert.ok(html.indexOf('id="namingSetupSection"') < html.indexOf('id="outputAdvancedDetails"'));
assert.match(source, /markLocalOverride\("output_naming"\)/, "naming changes retain local-override invalidation");
assert.match(source, /markLocalOverride\("result_filename"\)/, "Result XLSX filename retains local-override invalidation");
assert.match(html, /id="namingProvenance"/);
assert.match(source, /XLSX \+ local override/);
assert.match(source, /renderNamingProvenance\(\)/);
assert.match(html, /<option value="overwrite">Replace existing file<\/option>/);
assert.match(html, /<option value="uniquify" selected>Keep both — add number<\/option>/);
assert.match(html, /<option value="fail">Stop and report conflict<\/option>/);
assert.match(html, /Controls what happens when a file with the same name already exists\./);

// SETUP: destination controls are mutually exclusive by actual location mode.
assert.match(source, /DacSidepanelUiSemantics\.destinationVisibility\(state\.destinationMode\)/);
assert.match(html, /Relative to Chrome Downloads\. No folder selection required\./);
assert.match(css, /\.destination-authorized\[hidden\][^{]*\{ display: none !important;/);
assert.equal(ui.destinationVisibility("downloads").showDownloads, true);
assert.equal(ui.destinationVisibility("downloads").showProfile, false);
assert.equal(ui.destinationVisibility("profile").showDownloads, false);
assert.equal(ui.destinationVisibility("profile").showProfile, true);

// RUN: all six factual runtime fields stay available, including empty states.
for (const id of ["runtimeJobElapsed", "runtimeCurrentOperation", "runtimeTimeoutRemaining", "runtimeRetryState", "runtimeInterJobDelay", "runtimeNextTransition"]) assert.match(html, new RegExp(`id="${id}"`));
assert.match(css, /\.runtime-information-grid/);

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
assert.equal(awaiting.nextTransition, "Awaiting ChatGPT readiness confirmation");
assert.equal(awaiting.timerText, "Awaiting ChatGPT readiness confirmation");

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
assert.match(css, /\.runtime-information output[^}]*font-size: 11px/);

// OUTPUT: result cards retain job/artifact identity and use persistence as Saved authority.
assert.match(html, /id="outputList" class="queue-list output-results-list"/);
assert.match(css, /grid-template-columns: repeat\(auto-fit, minmax\(145px, 1fr\)\)/);
assert.match(css, /width: 58px; height: 58px/);
assert.match(source, /const isSaved = Boolean\(item\.persistence_verified && item\.result_file\)/);
assert.match(source, /output-filename/);
assert.match(source, /downloadArtifactRequest\(location, filename, values\.collisionPolicy\)/);
assert.match(source, /downloadArtifactRequest\(location, requested, values\.collisionPolicy\)/);
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
assert.match(css, /#outputLocationCard \.naming-grid \{ grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/);
assert.doesNotMatch(css, /@media \(min-width:/);

// Check Plan stays local-only; no prompt submission appears in its handler path.
const validateStart = source.indexOf("async function validate(");
const validateEnd = source.indexOf("async function copyReviewPacket(");
assert.ok(validateStart >= 0 && validateEnd > validateStart);
assert.doesNotMatch(source.slice(validateStart, validateEnd), /DAC_RUN_IMAGE_JOB|PROMPT_SUBMITTED/);

console.log("V1 UI/UX closure static tests: PASS");
