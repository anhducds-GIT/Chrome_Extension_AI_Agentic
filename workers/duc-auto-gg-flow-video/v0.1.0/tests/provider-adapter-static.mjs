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

// FLOW-04 scope contract (live miss 2026-08-28, evidence/F4-image-mode-live-*):
// a correctly-labelled "add_2 Create" that belonged to the PAGE was clicked and
// opened the media panel. A Create control now counts only when the ONE visible
// composer resolves to ONE owning <form> that holds exactly ONE exact-label
// button. Every other shape must fail closed at null.
const button = (text, extra = {}) => ({
  innerText: text, textContent: text, getAttribute: () => null,
  getBoundingClientRect: () => ({ width: 80, height: 32 }), ...extra,
});
function scopedDocument({ formButtons = [], pageButtons = [], composerCount = 1, composerHasForm = true } = {}) {
  const form = { tagName: "FORM", querySelectorAll: (selector) => selector === "button" ? formButtons : [] };
  for (const node of formButtons) node.closest = (selector) => selector === "form" ? form : null;
  for (const node of pageButtons) node.closest = () => null;
  const composers = Array.from({ length: composerCount }, () => ({
    getBoundingClientRect: () => ({ width: 320, height: 48 }),
    closest: (selector) => selector === "form" && composerHasForm ? form : null,
  }));
  const document = {
    defaultView: null,
    querySelectorAll(selector) {
      if (selector === "button") return [...pageButtons, ...formButtons];
      if (selector.includes("contenteditable")) return composers;
      return [];
    },
  };
  return { document, form, composers };
}

const formCreate = button("arrow_forward Create");
const pageCreate = button("add_2 Create");
const scoped = scopedDocument({ formButtons: [formCreate], pageButtons: [button("Create project"), pageCreate] });
assert.equal(adapter.findCreateButton(scoped.document), formCreate, "the composer-form Create is the only submit candidate");
assert.equal(adapter.isInComposerForm(scoped.document, formCreate), true);
assert.equal(adapter.isInComposerForm(scoped.document, pageCreate), false, "a page-level Create is provably outside the composer form");
assert.equal(adapter.composerScope(scoped.document).form, scoped.form);

// An enabled, exactly-labelled page-level Create with NO composer-form
// candidate is still not a Create: this is the exact live defect.
const pageOnly = scopedDocument({ formButtons: [], pageButtons: [button("add_2 Create")] });
assert.equal(adapter.findCreateButton(pageOnly.document), null, "a page-level Create can never be selected");

// Whitespace in the measured label normalizes; near-matches never do.
const wrappedLabel = "add_2\n  Create";
assert.equal(adapter.findCreateButton(scopedDocument({ formButtons: [button(wrappedLabel)] }).document)?.innerText, wrappedLabel);
for (const label of ["Create", "Create project", "arrow_forward Recreate", "add_2 Create project"]) {
  assert.equal(adapter.findCreateButton(scopedDocument({ formButtons: [button(label)] }).document), null, `near-match must fail closed: ${label}`);
}

// Ambiguity in any of the three scope inputs fails closed.
assert.equal(adapter.findCreateButton(scopedDocument({ formButtons: [button("arrow_forward Create"), button("add_2 Create")] }).document), null, "two Create controls in one form are ambiguous");
assert.equal(adapter.findCreateButton(scopedDocument({ formButtons: [button("arrow_forward Create")], composerCount: 2 }).document), null, "two visible composers give no scope");
assert.equal(adapter.findCreateButton(scopedDocument({ formButtons: [button("arrow_forward Create")], composerCount: 0 }).document), null, "no composer gives no scope");
assert.equal(adapter.findCreateButton(scopedDocument({ formButtons: [button("arrow_forward Create")], composerHasForm: false }).document), null, "a composer with no owning form gives no scope");
assert.equal(adapter.findCreateButton({ querySelectorAll: () => [] }), null);
assert.equal(adapter.composerScope(null), null);

// Quota evidence is scoped the same way: Upgrade replacing Create INSIDE the
// composer form is a wall; a page-level Upgrade is unrelated chrome.
const wall = scopedDocument({ formButtons: [button("Upgrade")] });
assert.match(adapter.generationLimitBlocker(wall.document), /Flow generation limit reached/);
const pageUpgrade = scopedDocument({ formButtons: [], pageButtons: [button("Upgrade")] });
assert.equal(adapter.generationLimitBlocker(pageUpgrade.document), null, "a page-level Upgrade is never a quota wall");
assert.equal(adapter.generationLimitBlocker(scopedDocument({ formButtons: [button("arrow_forward Create"), button("Upgrade")] }).document), null, "an available Create outranks any Upgrade");
// A dead-but-present Create beside Upgrade is still the measured wall shape.
assert.match(adapter.generationLimitBlocker(scopedDocument({ formButtons: [button("arrow_forward Create", { disabled: true }), button("Upgrade")] }).document), /Flow generation limit reached/);
// Audit finding (Codex round 1, 2026-08-28): two exact Create controls plus an
// Upgrade is AMBIGUITY, not exhaustion. Calling it quota would send the owner
// to a billing page over a DOM change; the ambiguity path already fails closed.
assert.equal(
  adapter.generationLimitBlocker(scopedDocument({ formButtons: [button("arrow_forward Create"), button("add_2 Create"), button("Upgrade")] }).document),
  null,
  "ambiguous Create controls must never be diagnosed as a credit wall"
);

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
