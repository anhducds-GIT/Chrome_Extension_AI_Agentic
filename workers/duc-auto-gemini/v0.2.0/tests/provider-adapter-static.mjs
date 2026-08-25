/* Pins the provider-adapter seam introduced in v0.2.0 step 1: every
   ChatGPT-specific selector, blocker pattern, timing value and origin rule
   lives in provider-adapter.js, loaded BEFORE every consumer, so a Gemini
   adapter can later be swapped in by replacing that one file. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const adapterUrl = new URL("provider-adapter.js", root);

/* ---- the adapter file exists and defines window.DacProviderAdapter ------- */

assert.ok(fs.existsSync(adapterUrl), "provider-adapter.js exists");
const adapterSource = fs.readFileSync(adapterUrl, "utf8");
const context = {};
vm.runInNewContext(adapterSource, context);
const adapter = context.DacProviderAdapter;
assert.ok(adapter, "the adapter exports DacProviderAdapter on window/globalThis");
assert.ok(Object.isFrozen(adapter), "the export is frozen, matching the other core modules");
assert.equal(adapter.provider, "chatgpt", "step 1 ships the ChatGPT adapter as the only implementation");

/* ---- load order: the adapter comes first everywhere ---------------------- */

const manifest = JSON.parse(fs.readFileSync(new URL("manifest.json", root), "utf8"));
const contentScripts = manifest.content_scripts[0].js;
assert.equal(contentScripts[0], "provider-adapter.js", "the adapter is the FIRST content script");
assert.ok(contentScripts.includes("content.js"), "content.js still loads as a content script");

const html = fs.readFileSync(new URL("sidepanel.html", root), "utf8");
const adapterTag = html.indexOf('<script src="provider-adapter.js"></script>');
assert.ok(adapterTag > -1, "sidepanel.html loads the adapter");
for (const later of ["xlsx-codec.js", "runner-core.js", "sidepanel.js"]) {
  assert.ok(adapterTag < html.indexOf(`src="${later}"`), `the adapter loads before ${later}`);
}

/* ---- origin rules: one predicate, byte-identical behavior ---------------- */

assert.match(adapterSource, /chatgpt\\\.com\|chat\\\.openai\\\.com/, "the adapter carries the chatgpt.com|chat.openai.com origin pattern");
assert.equal(adapter.isProviderUrl("https://chatgpt.com/c/123"), true);
assert.equal(adapter.isProviderUrl("https://chat.openai.com/"), true);
assert.equal(adapter.isProviderUrl("http://chatgpt.com/"), false, "insecure HTTP never matches");
assert.equal(adapter.isProviderUrl("https://gemini.google.com/"), false);
assert.equal(adapter.isProviderUrl(""), false);
assert.equal(adapter.isProviderUrl(null), false);
assert.deepEqual([...adapter.ORIGIN.hosts], ["chatgpt.com", "chat.openai.com"], "the host allowlist is declared");

// The two formerly-duplicated origin regexes in sidepanel.js (activeTab and
// isChatGPTUrl) must both delegate to the single adapter predicate.
const sidepanel = fs.readFileSync(new URL("sidepanel.js", root), "utf8");
assert.doesNotMatch(sidepanel, /chatgpt\\\.com/, "sidepanel.js no longer contains a literal chatgpt\\.com regex");
assert.equal([...sidepanel.matchAll(/DacProviderAdapter\.isProviderUrl\(/g)].length, 2, "activeTab and isChatGPTUrl both delegate to the adapter predicate");

/* ---- content.js consumes the adapter instead of inline literals ---------- */

const content = fs.readFileSync(new URL("content.js", root), "utf8");
assert.doesNotMatch(content, /#prompt-textarea/, "the composer selector left content.js");
assert.doesNotMatch(content, /data-message-author-role/, "assistant/user role selectors left content.js");
assert.doesNotMatch(content, /captcha/, "the security blocker phrase list left content.js");
assert.match(content, /const ADAPTER = window\.DacProviderAdapter;/, "content.js binds the adapter once at the top");

// The values themselves stay byte-identical to the battle-tested worker.
assert.equal(adapter.SELECTORS.composer[0], "#prompt-textarea");
assert.equal(adapter.SELECTORS.assistantMessage, '[data-message-author-role="assistant"]');
assert.equal(adapter.SELECTORS.userMessage, '[data-message-author-role="user"]');
assert.equal(adapter.SELECTORS.stopButton[0], 'button[data-testid="stop-button"]');
assert.equal(adapter.SELECTORS.sendButtonDirect[0], 'button[data-testid="send-button"]');
assert.equal(adapter.SELECTORS.fileInputFallback, 'form input[type="file"]');
assert.ok(adapter.securityBlockerPattern.test("verify you are human"));
assert.ok(!adapter.securityBlockerPattern.test("an ordinary assistant reply"));
assert.deepEqual(
  { ...adapter.TIMING },
  { postTypeSettleMs: 150, postSendSettleMs: 500, completionPollMs: 300, stableTextDwellMs: 1500, referenceReadyTimeoutMs: 15000, sendReadyTimeoutMs: 5000 },
  "timing values moved without changing"
);
for (const list of [adapter.SELECTORS.composer, adapter.SELECTORS.sendButtonDirect, adapter.SELECTORS.stopButton, adapter.SELECTORS.attachmentPreview, adapter.SELECTORS.uploadPending]) {
  assert.ok(Object.isFrozen(list), "selector arrays are frozen");
}

console.log("provider adapter static tests: PASS");
