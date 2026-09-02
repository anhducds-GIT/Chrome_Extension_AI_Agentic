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
// Doan locale duoc them 2026-09-02 (Duc duyet): Flow phuc vu cung mot du an o
// ca /fx/tools/flow/... lan /fx/vi/tools/flow/... Thieu pattern thu hai thi
// Chrome khong tiem content script tren giao dien tieng Viet, va trieu chung
// noi len la RECEIVER_LOST — mot ma loi chi thang vao cho khong he sai.
// Chi tiet + ranh gioi "adapter phai siet hon manifest": tests/flow-locale-url-static.mjs
assert.deepEqual(manifest.content_scripts[0].matches, [
  "https://labs.google/fx/tools/flow/*",
  "https://labs.google/fx/*/tools/flow/*",
]);
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

// FLOW-04, after the live ancestry trace of 2026-08-28 corrected two wrong
// diagnoses in a row:
//   1. The composer has NO <form> ancestor, so the first fix (closest("form"))
//      refused every job.
//   2. "add_2 Create" is NOT page-level and NOT a submit button. It is the
//      add-media control, sitting in the SAME cluster as the real submit button.
//      No amount of scoping can separate two controls that share a parent, so
//      the label list is what had to change: only "arrow_forward Create" submits.
// Scope remains as defence in depth: climb through button-less ancestors, stop at
// the first ancestor holding buttons, and never enter shared page chrome.
const button = (text, extra = {}) => ({
  innerText: text, textContent: text, getAttribute: () => null,
  getBoundingClientRect: () => ({ width: 80, height: 32 }), ...extra,
});
// areaButtons = the composer's own control cluster. pageButtons live one level
// higher, in the page root, exactly where the live "add_2 Create" was found.
function scopedDocument({ areaButtons = [], pageButtons = [], composerCount = 1, composerDetached = false, emptyAreaLevels = 0, innerAreaButtons = null, composerText = "" } = {}) {
  // Measured: shared page chrome holds other text-entry surfaces (nav + search);
  // the composer's own cluster holds only the composer.
  const searchInput = { tagName: "INPUT" };
  const composersRef = [];
  const pageRoot = { tagName: "DIV", parentElement: null, querySelectorAll: (s) => s === "button" ? [...pageButtons, ...areaButtons] : [searchInput, ...composersRef] };
  const area = { tagName: "DIV", parentElement: pageRoot, querySelectorAll: (s) => s === "button" ? areaButtons : composersRef };
  // Optional button-less wrappers between the composer and its control cluster:
  // the climb must pass through these and still stop at `area`.
  let attach = area;
  // A nearer cluster that HAS buttons but no Create. The climb must stop here.
  if (innerAreaButtons) attach = { tagName: "DIV", parentElement: area, querySelectorAll: (s) => s === "button" ? innerAreaButtons : composersRef };
  for (let i = 0; i < emptyAreaLevels; i += 1) attach = { tagName: "DIV", parentElement: attach, querySelectorAll: () => [] };
  const composers = Array.from({ length: composerCount }, () => ({
    getBoundingClientRect: () => ({ width: 320, height: 48 }),
    textContent: composerText,
    parentElement: composerDetached ? null : attach,
  }));
  composersRef.push(...composers);
  const document = {
    defaultView: null,
    querySelectorAll(selector) {
      if (selector === "button") return [...pageButtons, ...areaButtons];
      if (selector.includes("contenteditable")) return composers;
      return [];
    },
  };
  return { document, area, pageRoot, composers };
}

// THE measured live shape, and the most important pin in this file: the real
// submit button sits beside the add-media control in one cluster, and is
// DISABLED while the composer is empty. Picking the enabled neighbour because
// the right button is disabled is exactly the mistake that produced no video.
{
  const realSubmit = button("arrow_forward Create", { disabled: true });
  const addMedia = button("add_2 Create");
  const live = scopedDocument({ areaButtons: [addMedia, button("Agent"), button("\u{1F34C} Nano Banana 2 crop_9_16 x2"), realSubmit] });
  assert.equal(adapter.findCreateButton(live.document), realSubmit, "the submit control is the only Create, even while disabled");
  assert.notEqual(adapter.findCreateButton(live.document), addMedia, "add-media must never be mistaken for submit");
  assert.equal(adapter.composerScope(live.document).hops, 1);
}
// "add_2 Create" is not a submit label anywhere, at any level, ever.
for (const where of ["areaButtons", "pageButtons"]) {
  assert.equal(adapter.findCreateButton(scopedDocument({ [where]: [button("add_2 Create")] }).document), null, `add_2 Create is never a submit control (${where})`);
}

const areaCreate = button("arrow_forward Create");
const pageCreate = button("arrow_forward Create");
const scoped = scopedDocument({ areaButtons: [areaCreate], pageButtons: [button("Create project"), pageCreate] });
assert.equal(adapter.findCreateButton(scoped.document), areaCreate, "the composer's own Create is the only submit candidate");
assert.equal(adapter.isInComposerScope(scoped.document, areaCreate), true);
assert.equal(adapter.isInComposerScope(scoped.document, pageCreate), false, "a page-level Create is provably outside the submit scope");
assert.equal(adapter.composerScope(scoped.document).container, scoped.area);
assert.equal(adapter.composerScope(scoped.document).hops, 1);

// Button-less wrappers between composer and cluster are climbed through, but the
// climb still stops at the cluster and never reaches the page-level Create.
const nested = scopedDocument({ areaButtons: [button("arrow_forward Create")], pageButtons: [button("arrow_forward Create")], emptyAreaLevels: 3 });
assert.equal(adapter.composerScope(nested.document).container, nested.area);
assert.equal(adapter.composerScope(nested.document).hops, 4);

// THE live defect, stated as a pin: an enabled, exactly-labelled page-level
// Create with no candidate in the composer's own cluster must never be reached.
const pageOnly = scopedDocument({ areaButtons: [button("more_vert More")], pageButtons: [button("arrow_forward Create")] });
assert.equal(adapter.findCreateButton(pageOnly.document), null, "a page-level Create can never be selected");
// ...and the same holds when the cluster is empty of buttons entirely, because
// the climb then finds the page root and must refuse rather than adopt it.
const bareOnly = scopedDocument({ areaButtons: [], pageButtons: [button("arrow_forward Create")] });
assert.equal(adapter.findCreateButton(bareOnly.document), null, "an empty cluster never promotes the page root into scope");

// THE BOUND ITSELF, pinned. The climb stops at the FIRST ancestor holding any
// button — that level is the composer's control cluster. If it holds no Create,
// the answer is "no Create", NOT "keep climbing until one turns up". Without
// this bound a Create belonging to some outer container becomes reachable again,
// which is the whole class of bug that cost a live run on 2026-08-28.
{
  const outerCreate = button("arrow_forward Create");
  const bounded = scopedDocument({ innerAreaButtons: [button("more_vert More")], areaButtons: [outerCreate] });
  assert.equal(adapter.findCreateButton(bounded.document), null, "a Create above the composer's own cluster is out of reach");
  assert.equal(adapter.composerScope(bounded.document), null);
}

// Whitespace in the measured label normalizes; near-matches never do.
const wrappedLabel = "arrow_forward\n  Create";
assert.equal(adapter.findCreateButton(scopedDocument({ areaButtons: [button(wrappedLabel)] }).document)?.innerText, wrappedLabel);
for (const label of ["Create", "Create project", "arrow_forward Recreate", "add_2 Create", "add_2 Create project"]) {
  assert.equal(adapter.findCreateButton(scopedDocument({ areaButtons: [button(label)] }).document), null, `near-match must fail closed: ${label}`);
}

// Ambiguity in any scope input fails closed.
assert.equal(adapter.findCreateButton(scopedDocument({ areaButtons: [button("arrow_forward Create"), button("arrow_forward Create")] }).document), null, "two submit controls at one level are ambiguous");
assert.equal(adapter.findCreateButton(scopedDocument({ areaButtons: [button("arrow_forward Create")], composerCount: 2 }).document), null, "two visible composers give no scope");
assert.equal(adapter.findCreateButton(scopedDocument({ areaButtons: [button("arrow_forward Create")], composerCount: 0 }).document), null, "no composer gives no scope");
assert.equal(adapter.findCreateButton(scopedDocument({ areaButtons: [button("arrow_forward Create")], composerDetached: true }).document), null, "a composer with no ancestors gives no scope");
assert.equal(adapter.findCreateButton({ querySelectorAll: () => [] }), null);
assert.equal(adapter.composerScope(null), null);

// Quota evidence is scoped the same way: Upgrade replacing Create INSIDE the
// composer form is a wall; a page-level Upgrade is unrelated chrome.
// The measured wall: prompt TYPED, Create gone from the cluster, Upgrade there.
const wall = scopedDocument({ areaButtons: [button("Upgrade")], composerText: "a typed prompt" });
assert.match(adapter.generationLimitBlocker(wall.document), /hết credit/);
// Same DOM, empty composer: this is a mount delay, not exhaustion. Claiming the
// wall here would hard-stop healthy jobs with no retry every time Flow is slow
// to mount its submit control.
const notYet = scopedDocument({ areaButtons: [button("Upgrade")] });
assert.equal(adapter.generationLimitBlocker(notYet.document), null, "an unmounted Create on an empty composer is not a credit wall");
// A page-level Upgrade is outside the cluster and is ordinary marketing chrome.
const pageUpgrade = scopedDocument({ areaButtons: [button("arrow_forward Create", { disabled: true })], pageButtons: [button("Upgrade")] });
assert.equal(adapter.generationLimitBlocker(pageUpgrade.document), null, "a page-level Upgrade is never a quota wall");
assert.equal(adapter.generationLimitBlocker(scopedDocument({ areaButtons: [button("arrow_forward Create"), button("Upgrade")] }).document), null, "an available Create outranks any Upgrade");
// A DISABLED Create beside an Upgrade is NOT a wall, and getting this wrong is
// expensive in the other direction: arrow_forward Create is disabled on every
// idle page, so claiming quota here would hard-stop healthy work the moment any
// upsell chrome appears in the cluster. The measured wall is Create GONE.
assert.equal(
  adapter.generationLimitBlocker(scopedDocument({ areaButtons: [button("arrow_forward Create", { disabled: true }), button("Upgrade")] }).document),
  null,
  "an idle disabled Create beside upsell chrome is not a credit wall"
);
// Audit finding (Codex round 1, 2026-08-28): two exact Create controls plus an
// Upgrade is AMBIGUITY, not exhaustion. Calling it quota would send the owner
// to a billing page over a DOM change; the ambiguity path already fails closed.
assert.equal(
  adapter.generationLimitBlocker(scopedDocument({ areaButtons: [button("arrow_forward Create"), button("arrow_forward Create"), button("Upgrade")] }).document),
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

// F-26: findOutputCountOption nhan nut so luong output theo nhan CHINH XAC da do
// (evidence/F14-mode-probe-vi-20260902.json cho thay bon nut nhan dung "x1".."x4").
// Bang cau hinh nay con co 360p/720p — bam nham mot trong do KHONG mat credit
// ngay, nhung no doi DON GIA moi video, nen mo ho o day la mo ho ve tien.
// Ghim ba dieu: khop chinh xac (khong startsWith), doi DUNG MOT ung vien, va
// khong bao gio tra ve mot nut khong nhin thay duoc.
{
  const btn = (text, extra = {}) => ({
    innerText: text, textContent: text, disabled: false,
    getAttribute: () => null,
    getBoundingClientRect: () => ({ width: extra.hidden ? 0 : 40, height: extra.hidden ? 0 : 24 }),
  });
  const docOf = (buttons) => ({
    defaultView: { getComputedStyle: () => ({ display: "block", visibility: "visible" }) },
    querySelectorAll: (sel) => (sel === "button" ? buttons : []),
  });
  const x1 = btn("x1");
  assert.equal(adapter.findOutputCountOption(docOf([x1, btn("x2"), btn("360p")]), 1), x1, "dung mot ung vien x1 thi nhan");
  assert.equal(adapter.findOutputCountOption(docOf([btn("x1"), btn("x1")]), 1), null, "hai ung vien la mo ho -> tu choi");
  assert.equal(adapter.findOutputCountOption(docOf([btn("x2"), btn("x3")]), 1), null, "khong co x1 -> tu choi");
  assert.equal(adapter.findOutputCountOption(docOf([btn("x1 lan")]), 1), null, "phai khop CHINH XAC, khong duoc startsWith");
  assert.equal(adapter.findOutputCountOption(docOf([btn("x1", { hidden: true })]), 1), null, "nut khong nhin thay duoc thi khong duoc bam");
  assert.equal(adapter.findOutputCountOption(docOf([btn("x1")]), 0), null, "so luong khong hop le -> tu choi");
}

// F-11: nhan Image duoc nhan theo CAU TRUC (emoji + ten model + crop_* + x{n}),
// khong khop cung mot chuoi. Ban cu chi nhan dung "🍌 Nano Banana 2 crop_9_16 x2",
// nen Duc doi model/ti le/so luong la moi job dung o WRONG_GENERATION_MODE.
//
// Ghim CA HAI chieu. Noi long pattern nay khong lam mat credit ngay, nhung no
// lam he thong nhan nham mot trang la thanh "dang o che do Image" — va tu do
// moi quyet dinh ve sau deu dua tren mot tien de sai.
{
  const btn = (text) => ({
    innerText: text, textContent: text, disabled: false,
    getAttribute: () => null,
    getBoundingClientRect: () => ({ width: 160, height: 30 }),
  });
  const docOf = (labels) => ({
    defaultView: { getComputedStyle: () => ({ display: "block", visibility: "visible" }) },
    querySelectorAll: (sel) => (sel === "button" ? labels.map(btn) : []),
  });
  const modeOf = (label) => adapter.generationMode(docOf([label])).mode;

  assert.equal(modeOf("🍌 Nano Banana 2 crop_9_16 x2"), "image", "ban da do 28/08");
  assert.equal(modeOf("🍌 Nano Banana 2 Lite crop_16_9 x3"), "image", "ban da do 02/09 tren ho so Binh");
  assert.equal(modeOf("Video · 360p · 8s crop_16_9 x1"), "video");

  // Noi long thi vo o day: mot nhan chi co emoji khong phai la mot cau hinh.
  assert.equal(modeOf("🍌 rac"), "unknown", "chi co emoji thi khong du — pattern khong duoc nuot moi thu bat dau bang emoji");
  // Thieu hau to x{n} = khong biet mot luot sinh ra may output. Khong duoc nhan.
  assert.equal(modeOf("🍌 Nano Banana 2 crop_9_16"), "unknown", "thieu x{n} thi khong duoc nhan la Image");
  assert.equal(modeOf("🍌 Nano Banana 2 x2"), "unknown", "thieu crop_* thi khong duoc nhan la Image");

  // Hai pattern phai loai tru nhau: khong nhan nao vua la Image vua la Video.
  for (const label of ["🍌 Nano Banana 2 crop_9_16 x2", "Video · 360p · 8s crop_16_9 x1"]) {
    assert.notEqual(modeOf(label), "unknown", `phai nhan ra: ${label}`);
  }
}
