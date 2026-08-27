/* Pins the provider-adapter seam: every provider-specific selector, blocker
   pattern, timing value and origin rule lives in provider-adapter.js, loaded
   BEFORE every consumer. The Flow origin is active during bootstrap while
   every selector and timing assertion remains inherited from Gemini. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const adapterUrl = new URL("provider-adapter.js", root);

/* ---- the adapter file exists and defines window.DacProviderAdapter ------- */

assert.ok(fs.existsSync(adapterUrl), "provider-adapter.js exists");
const adapterSource = fs.readFileSync(adapterUrl, "utf8");
const context = { URL };
vm.runInNewContext(adapterSource, context);
const adapter = context.DacProviderAdapter;
assert.ok(adapter, "the adapter exports DacProviderAdapter on window/globalThis");
assert.ok(Object.isFrozen(adapter), "the export is frozen, matching the other core modules");
assert.equal(adapter.provider, "gg-flow-video", "the adapter identifies the Google Flow video worker");

/* ---- load order: the adapter comes first everywhere ---------------------- */

const manifest = JSON.parse(fs.readFileSync(new URL("manifest.json", root), "utf8"));
const contentScripts = manifest.content_scripts[0].js;
assert.equal(contentScripts[0], "provider-adapter.js", "the adapter is the FIRST content script");
assert.ok(contentScripts.includes("content.js"), "content.js still loads as a content script");
assert.deepEqual(
  contentScripts,
  ["provider-adapter.js", "image-evidence-core.js", "attempt-identity-core.js", "reconciliation-core.js", "chat-readiness-core.js", "content-decision-core.js", "content.js"],
  "content-decision-core.js (ported v0.1.0 decision logic) loads before content.js"
);
assert.equal(manifest.name, "Duc Auto GG Flow Video");
assert.equal(manifest.version, "0.1.0");
assert.deepEqual(manifest.content_scripts[0].matches, ["https://labs.google/fx/tools/flow/*"], "content scripts inject on the Google Flow tool only");
assert.ok(manifest.host_permissions.includes("https://labs.google/fx/tools/flow/*"), "Google Flow is the only provider host permission");
assert.equal(manifest.host_permissions.some((value) => /chatgpt|openai/i.test(value)), false, "no ChatGPT host permission survives the platform swap");
for (const size of ["16", "32", "48", "128"]) {
  assert.equal(manifest.icons[size], `icons/icon${size}.png`, `manifest icon ${size} is declared`);
  assert.equal(manifest.action.default_icon[size], `icons/icon${size}.png`, `action icon ${size} is declared`);
  assert.ok(fs.existsSync(new URL(`icons/icon${size}.png`, root)), `icons/icon${size}.png exists`);
}

const html = fs.readFileSync(new URL("sidepanel.html", root), "utf8");
const adapterTag = html.indexOf('<script src="provider-adapter.js"></script>');
assert.ok(adapterTag > -1, "sidepanel.html loads the adapter");
for (const later of ["xlsx-codec.js", "runner-core.js", "sidepanel.js"]) {
  assert.ok(adapterTag < html.indexOf(`src="${later}"`), `the adapter loads before ${later}`);
}

/* ---- origin rules: one predicate, evidence-verified behavior -------------- */

assert.match(adapterSource, /labs\\\.google/, "the adapter carries the labs.google origin pattern");
assert.equal(adapter.isProviderUrl("https://labs.google/fx/tools/flow"), true);
assert.equal(adapter.isProviderUrl("https://labs.google/fx/tools/flow/"), true);
assert.equal(adapter.isProviderUrl("https://labs.google/fx/tools/flow/project/d7c07112-eb7f-4efe-b251-8aee4b2b6c4f"), true);
assert.equal(adapter.isProviderUrl("https://gemini.google.com/app"), false);
assert.equal(adapter.isProviderUrl("https://labs.google/fx/tools/image-fx"), false);
assert.equal(adapter.isProviderUrl("https://labs.google/fx/tools/flowx"), false);
assert.equal(adapter.isProviderUrl("http://labs.google/fx/tools/flow"), false, "insecure HTTP never matches");
assert.equal(adapter.isProviderUrl("https://evil.example/fx/tools/flow"), false, "unrelated hosts never match");
assert.equal(adapter.isProviderUrl(""), false);
assert.equal(adapter.isProviderUrl(null), false);
assert.deepEqual([...adapter.ORIGIN.hosts], ["labs.google"], "the host allowlist is declared");

/* ---- surface rule: IMAGES pre-submit, CONVERSATION allowed after submit --- */

assert.equal(adapter.surface("https://labs.google/fx/tools/flow"), "CONVERSATION");
assert.equal(adapter.surface("https://labs.google/fx/tools/flow/"), "CONVERSATION");
assert.equal(adapter.surface("https://labs.google/fx/tools/flow/project/d7c07112-eb7f-4efe-b251-8aee4b2b6c4f"), "CONVERSATION");
assert.equal(adapter.surface("https://gemini.google.com/app"), "WRONG");
assert.equal(adapter.surface("https://labs.google/fx/tools/image-fx"), "WRONG");
assert.equal(adapter.surface("https://labs.google/fx/tools/flowx"), "WRONG");
assert.equal(adapter.surface("http://labs.google/fx/tools/flow"), "WRONG");
assert.equal(adapter.surface("https://evil.example/fx/tools/flow"), "WRONG");
assert.equal(adapter.surfaceAllowed("https://labs.google/fx/tools/flow", {}), true, "the Flow root is an allowed conversation surface");
assert.equal(adapter.surfaceAllowed("https://labs.google/fx/tools/flow/project/d7c07112-eb7f-4efe-b251-8aee4b2b6c4f", {}), true, "Flow project subpaths remain allowed");
assert.equal(adapter.surfaceAllowed("https://example.com/", {}), false);

// The two formerly-duplicated origin regexes in sidepanel.js (activeTab and
// isChatGPTUrl) must both delegate to the single adapter predicate.
const sidepanel = fs.readFileSync(new URL("sidepanel.js", root), "utf8");
assert.doesNotMatch(sidepanel, /chatgpt\\\.com/, "sidepanel.js does not contain a literal chatgpt\\.com regex");
assert.doesNotMatch(sidepanel, /gemini\\\.google/, "sidepanel.js does not grow its own gemini origin regex either");
assert.equal([...sidepanel.matchAll(/DacProviderAdapter\.isProviderUrl\(/g)].length, 2, "activeTab and isChatGPTUrl both delegate to the adapter predicate");

/* ---- content.js consumes the adapter instead of inline literals ---------- */

const content = fs.readFileSync(new URL("content.js", root), "utf8");
assert.doesNotMatch(content, /#prompt-textarea/, "no ChatGPT composer selector remains in content.js");
assert.doesNotMatch(content, /data-message-author-role/, "no ChatGPT role selector remains in content.js");
assert.doesNotMatch(content, /captcha/, "the security blocker phrase list stays out of content.js");
assert.doesNotMatch(content, /ql-editor|rich-textarea/, "the Gemini composer selector lives only in the adapter");
assert.doesNotMatch(content, /Upload & tools/, "the upload menu selector lives only in the adapter");
assert.match(content, /const ADAPTER = window\.DacProviderAdapter;/, "content.js binds the adapter once at the top");
assert.match(content, /const DECISIONS = window\.DacContentDecision;/, "content.js binds the ported v0.1.0 decision core once at the top");

// The values themselves stay byte-identical to the verified evidence set.
assert.equal(adapter.SELECTORS.composer[0], 'rich-textarea .ql-editor[role="textbox"][contenteditable="true"]');
assert.equal(adapter.SELECTORS.send[0], 'button[aria-label="Send message"]');
assert.equal(adapter.SELECTORS.stop[0], 'button[aria-label="Stop response"]');
assert.equal(adapter.SELECTORS.uploadMenuButton[0], 'button[aria-label="Upload & tools"]');
assert.equal(adapter.SELECTORS.fileInput[0], 'images-files-uploader input[type="file"]');
assert.equal(adapter.SELECTORS.fileInput[1], '.cdk-overlay-container input[type="file"]');
assert.equal(adapter.SELECTORS.attachmentPreview[0], "uploader-file-preview gem-media-attachment img");
assert.equal(adapter.SELECTORS.composerScope, "input-container", "the composer/attachment scope is the input-container custom element (page has no <form>)");
assert.equal(adapter.SELECTORS.fileDropTarget, "file-drop-indicator");
assert.deepEqual([...adapter.SELECTORS.responseContainer], ["model-response"], "assistant turns are model-response containers");
assert.equal(adapter.SELECTORS.userQueryContainer, "user-query");
assert.equal(adapter.SELECTORS.generatedImage, "generated-image single-image img");
// NGƯỠNG NÀY LÀ LỚP BẢO VỆ, không phải con số tuỳ chỉnh: nó chặn việc nhận
// nhầm ảnh nhỏ/biểu tượng làm output. Đổi nó phải Đức chốt (AGENTS.md 2.4).
// 150 do Đức chốt 26/08 trên số đo thật: Gemini render 330x180, ảnh đính kèm
// 112x112. Ngưỡng 200 cũ đòi cả hai chiều >= 200 nên 180 < 200 loại sạch mọi
// ảnh sinh ra; bug ẩn lâu vì ảnh lh3 lọt nhờ remoteVerifiedResult bỏ hẳn
// phép kiểm kích thước.
assert.equal(adapter.SELECTORS.generatedImageMinSize, 150, "ngưỡng kích thước ảnh sinh ra = 150 (Đức chốt 26/08 trên số đo 330x180 vs 112x112) — đổi phải hỏi Đức");
// Output exclusion (snapshot 1/1b/3): user uploads, template gallery cards
// and composer previews are never output candidates.
for (const excluded of ["user-query", "image-card", "input-container"]) {
  assert.ok(adapter.SELECTORS.outputExclude.includes(excluded), `output candidates exclude ${excluded}`);
}
assert.ok(adapter.SELECTORS.excludedImageHostPattern.test("https://www.gstatic.com/lamda/images/immersives/origami.png"), "gstatic zero-state gallery images are excluded by host");
assert.ok(!adapter.SELECTORS.excludedImageHostPattern.test("https://lh3.googleusercontent.com/gg-dl/abc"), "real generated-image hosts are not excluded");
assert.ok(adapter.SELECTORS.generatedImageHostPattern.test("https://lh3.googleusercontent.com/gg-dl/abc"), "lh3.googleusercontent.com marks a generated result (snapshot 3)");
assert.equal(adapter.SELECTORS.generatedImageAltMarker, "ai generated", 'alt ", AI generated" is the stable result marker');
assert.equal(adapter.SELECTORS.generatingBusy, 'chat-window [role="progressbar"], chat-window [aria-busy="true"]', "busy checks are chat-window scoped (idle page keeps page-wide progressbars alive)");
assert.equal(adapter.SELECTORS.thinkingAnimation, "thinking-dots-animation");
assert.equal(adapter.SELECTORS.quotaExceededAnchor, "freemium-file-upload-quota-exceeded-disclaimer", "the quota wall is detected by its DOM anchor first");
assert.ok(adapter.securityBlockerPattern.test("verify you are human"));
assert.ok(adapter.securityBlockerPattern.test("hoạt động bất thường"));
assert.ok(!adapter.securityBlockerPattern.test("an ordinary assistant reply"));
assert.deepEqual(
  { ...adapter.TIMING },
  { postTypeSettleMs: 150, postSendSettleMs: 500, completionPollMs: 300, stableTextDwellMs: 1500, referenceReadyTimeoutMs: 15000, sendReadyTimeoutMs: 5000, menuSettleMs: 400 },
  "ChatGPT-proven base timings survive; referenceReadyTimeoutMs stays 15000; menuSettleMs added for the transient upload menu"
);
for (const list of [adapter.SELECTORS.composer, adapter.SELECTORS.send, adapter.SELECTORS.stop, adapter.SELECTORS.uploadMenuButton, adapter.SELECTORS.fileInput, adapter.SELECTORS.attachmentPreview, adapter.SELECTORS.uploadPending]) {
  assert.ok(Object.isFrozen(list), "selector arrays are frozen");
}

console.log("provider adapter static tests: PASS");

// Review F1/F3/F6/F7 pins (adversarial pre-pilot review, 2026-08-25).
assert.ok(adapter.isProviderUrl("https://labs.google/fx/tools/flow?hl=vi"), "bare /flow with a query string is a provider URL (F7)");
assert.ok(adapter.isProviderUrl("https://labs.google/fx/tools/flow#project"), "bare /flow with a fragment is a provider URL (F7)");
assert.ok(adapter.isProviderUrl("https://labs.google/fx/tools/flow/project/abc123"), "Flow subpaths are provider URLs (F7)");
assert.ok(!adapter.isProviderUrl("https://labs.google/fx/tools/flowx"), "path-prefix lookalikes are rejected (F7)");
console.log("provider adapter F-fix pins: PASS");
