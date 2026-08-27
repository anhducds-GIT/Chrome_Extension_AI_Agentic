/* Pins the evidence-backed Flow adapter seam and its load order. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const adapterUrl = new URL("provider-adapter.js", root);
assert.ok(fs.existsSync(adapterUrl));
const adapterSource = fs.readFileSync(adapterUrl, "utf8");
const context = { URL };
vm.runInNewContext(adapterSource, context);
const adapter = context.DacProviderAdapter;
assert.ok(Object.isFrozen(adapter));
assert.equal(adapter.provider, "gg-flow-video");
assert.equal(adapter.resultKind, "video");

const manifest = JSON.parse(fs.readFileSync(new URL("manifest.json", root), "utf8"));
const contentScripts = manifest.content_scripts[0].js;
assert.deepEqual(contentScripts, ["provider-adapter.js", "image-evidence-core.js", "attempt-identity-core.js", "reconciliation-core.js", "chat-readiness-core.js", "content-decision-core.js", "content.js"]);
assert.deepEqual(manifest.content_scripts[0].matches, ["https://labs.google/fx/tools/flow/*"]);
assert.deepEqual([...adapter.ORIGIN.hosts], ["labs.google"]);
assert.equal(adapter.isProviderUrl("https://labs.google/fx/tools/flow/project/abc"), true);
assert.equal(adapter.isProviderUrl("https://labs.google/fx/tools/flow?hl=vi"), true);
assert.equal(adapter.isProviderUrl("https://labs.google/fx/tools/flowx"), false);
assert.equal(adapter.isProviderUrl("https://gemini.google.com/app"), false);
assert.equal(adapter.surfaceAllowed("https://labs.google/fx/tools/flow/project/abc"), true);
assert.equal(adapter.surfaceAllowed("https://evil.example/fx/tools/flow/project/abc"), false);

// F1 selector set: attributes/text/structure only; no styled-components sc-*.
assert.deepEqual([...adapter.SELECTORS.composer], ['[contenteditable="true"][role="textbox"]']);
assert.deepEqual([...adapter.SELECTORS.send], [], "dead Gemini Send aria selectors are explicit empty arrays");
assert.deepEqual([...adapter.SELECTORS.stop], [], "Flow has no Stop button during generation");
assert.deepEqual([...adapter.SELECTORS.fileInput], ['input[type="file"][accept*="image"]']);
assert.equal(adapter.SELECTORS.videoSelector, "video");
assert.doesNotMatch(adapterSource, /[.#]sc-[a-z0-9]/i, "adapter never binds to styled-components classes");

const visibleCreate = { innerText: "arrow_forward Create" };
const disabledCreate = { textContent: "arrow_forward   Create", disabled: true };
const unrelated = { innerText: "Create project" };
const fakeDocument = { querySelectorAll: (selector) => selector === "button" ? [unrelated, visibleCreate, disabledCreate] : [] };
assert.equal(adapter.findCreateButton(fakeDocument), visibleCreate, "text matcher finds the first structural Create control");
assert.equal(adapter.findCreateButton({ querySelectorAll: () => [unrelated] }), null);

const media = "https://labs.google/fx/api/trpc/media.getMediaUrlRedirect?name=7e084b0";
assert.equal(adapter.videoIdFromSrc(media), "7e084b0");
assert.equal(adapter.videoIdFromSrc(`${media}&x=1`), "7e084b0");
for (const src of ["", "blob:abc", "https://labs.google/fx/api/trpc/media.getMediaUrlRedirect", "https://evil.example/fx/api/trpc/media.getMediaUrlRedirect?name=x", "https://labs.google/fx/api/trpc/other?name=x", `${media}&name=second`]) {
  assert.equal(adapter.videoIdFromSrc(src), null, `reject non-result src: ${src}`);
}

assert.deepEqual({ ...adapter.TIMING }, { perJobTimeoutMs: 300000, postTypeSettleMs: 150, postSendSettleMs: 2000, completionPollMs: 5000, stableTextDwellMs: 1500, referenceReadyTimeoutMs: 15000, sendReadyTimeoutMs: 5000, menuSettleMs: 0 });
for (const list of [adapter.SELECTORS.composer, adapter.SELECTORS.send, adapter.SELECTORS.stop, adapter.SELECTORS.fileInput]) assert.ok(Object.isFrozen(list));
assert.ok(adapter.securityBlockerPattern.test("verify you are human"));

const sidepanel = fs.readFileSync(new URL("sidepanel.js", root), "utf8");
assert.equal([...sidepanel.matchAll(/DacProviderAdapter\.isProviderUrl\(/g)].length, 2);
const html = fs.readFileSync(new URL("sidepanel.html", root), "utf8");
assert.ok(html.indexOf('<script src="provider-adapter.js"></script>') < html.indexOf('src="sidepanel.js"'));

console.log("provider adapter static tests: PASS");
