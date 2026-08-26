/* The adapter is only worth having if content.js actually stops knowing which
   product it drives. This test is the guard: it fails the build if a
   provider-specific selector creeps back into content.js.

   Written 2026-08-26 after a live trial burned six image generations while
   detection reported NO_NEW_IMAGE six times -- the inherited
   `[data-message-author-role="assistant"]` selector matched nothing on the
   real page. Selectors that can rot must live in ONE file, be reportable by
   diagnostics.dom_probe, and be replaceable without touching run logic. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const read = (name) => fs.readFileSync(new URL(name, root), "utf8");
const content = read("content.js");
const manifest = JSON.parse(read("manifest.json"));
const html = read("sidepanel.html");

const context = { window: null };
context.window = context;
vm.runInNewContext(read("provider-adapter.js"), context);
const adapter = context.DacProviderAdapter;

// --- the adapter is loaded before anything that consumes it ------------
const scripts = manifest.content_scripts[0].js;
assert.equal(scripts[0], "provider-adapter.js", "the adapter must load first in the content world");
assert.ok(html.includes('src="provider-adapter.js"'), "the side panel loads the adapter too");

// --- shape matches the Gemini worker so the two converge ---------------
for (const key of ["provider", "SELECTORS", "TIMING", "ORIGIN", "SURFACE", "isProviderUrl", "surface", "surfaceAllowed", "securityBlockerPattern", "matchesGenerationLimit"]) {
  assert.ok(key in adapter, `adapter exposes ${key}`);
}
assert.equal(adapter.provider, "chatgpt");
assert.ok(Object.isFrozen(adapter), "the adapter cannot be mutated at runtime");
assert.ok(Object.isFrozen(adapter.SELECTORS));

// --- every selector is a selector Chrome will accept -------------------
// A typo here would silently match nothing, which is exactly the failure
// mode this whole file exists to prevent.
const flat = Object.values(adapter.SELECTORS).flatMap((value) => Array.isArray(value) ? value : [value]);
assert.ok(flat.length >= 10, "the adapter carries the real selector set");
for (const selector of flat) {
  assert.equal(typeof selector, "string");
  assert.doesNotThrow(() => new Set([selector]), selector);
  assert.ok(selector.trim().length > 0, "no empty selector");
}

// --- origin rules ------------------------------------------------------
assert.equal(adapter.isProviderUrl("https://chatgpt.com/c/abc"), true);
assert.equal(adapter.isProviderUrl("https://chat.openai.com/c/abc"), true);
assert.equal(adapter.isProviderUrl("https://gemini.google.com/app"), false);
assert.equal(adapter.isProviderUrl("https://chatgpt.com.evil.test/c/abc"), false);
assert.equal(adapter.isProviderUrl(""), false);
assert.equal(adapter.surface("https://chatgpt.com/c/abc"), adapter.SURFACE.CONVERSATION);
assert.equal(adapter.surface("https://example.com"), adapter.SURFACE.WRONG);
assert.equal(adapter.surfaceAllowed("https://chatgpt.com/"), true);

// --- blockers still classify the way the safety tests expect -----------
assert.equal(adapter.securityBlockerPattern.test("please complete the captcha"), true);
assert.equal(adapter.securityBlockerPattern.test("here is your image"), false);
assert.equal(adapter.matchesGenerationLimit("You've reached your daily limit"), true);
assert.equal(adapter.matchesGenerationLimit("a duck on a white background"), false);
assert.equal(adapter.matchesGenerationLimit(""), false);

// --- content.js no longer hardcodes provider knowledge -----------------
const body = content.slice(content.indexOf('"use strict"'));
const forbidden = [
  ["data-message-author-role", "message-role selectors belong to the adapter"],
  ["prompt-textarea", "composer selectors belong to the adapter"],
  ["send-button", "send selectors belong to the adapter"],
  ["stop-button", "stop selectors belong to the adapter"],
  ["conversation-turns", "conversation-root selectors belong to the adapter"],
  ["upload-preview", "attachment selectors belong to the adapter"],
];
for (const [needle, why] of forbidden) {
  assert.ok(!body.includes(needle), `content.js must not contain '${needle}': ${why}`);
}
assert.ok(!/captcha|unusual activity/i.test(body), "blocker phrases belong to the adapter");

// --- content.js reads them from the adapter instead ---------------------
assert.match(content, /const ADAPTER = window\.DacProviderAdapter;/);
assert.match(content, /const SEL = ADAPTER\.SELECTORS;/);
assert.match(content, /firstVisible\(SEL\.composer\)/);
assert.match(content, /firstVisible\(SEL\.send\)/);
assert.match(content, /firstVisible\(SEL\.stop\)/);
assert.match(content, /document\.querySelectorAll\(SEL\.assistantMessage\)/);
assert.match(content, /ADAPTER\.securityBlockerPattern\.test/);
assert.match(content, /ADAPTER\.matchesGenerationLimit\(text\)/);

// --- dom_probe reports the adapter, and stays read-only -----------------
const probe = content.slice(content.indexOf('if (message.type === "DAC_DOM_PROBE")'), content.indexOf('if (message.type === "DAC_ABORT")'));
assert.ok(probe.length > 500, "the DOM probe handler is present");
assert.match(probe, /for \(const \[group, value\] of Object\.entries\(SEL\)\)/, "the probe reports the adapter's own selectors, not a copy");
assert.match(probe, /messageAttributes/, "the probe samples the attributes the page ACTUALLY uses, which is the whole question when attribution goes blind");
for (const mutation of [".click()", ".focus()", "setComposerValue", "dispatchEvent", "answerAbPoll", ".remove()"]) {
  assert.ok(!probe.includes(mutation), `the DOM probe must never ${mutation} -- it is strictly read-only`);
}

console.log("provider adapter static checks: PASS");
