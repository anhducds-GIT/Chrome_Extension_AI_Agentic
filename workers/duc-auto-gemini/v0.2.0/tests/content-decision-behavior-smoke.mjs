/* Ported from duc-auto-gemini/v0.1.0 tests/content-decision-behavior-smoke.mjs:
   the proven Gemini decision matrices (transient file input exposure,
   addedSince unique-new-node attachment arrival, guarded Send) now pinned
   against the v0.2.0 port (global name DacContentDecision), plus the v0.1.0
   output-attribution cases translated into DacImageEvidence fixtures shaped
   like real Gemini candidates. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function load(relativePath, name) {
  const context = {};
  vm.runInNewContext(fs.readFileSync(new URL(relativePath, import.meta.url), "utf8"), context);
  return context[name];
}

const Core = load("../content-decision-core.js", "DacContentDecision");
assert.ok(Core, "content-decision-core.js exports DacContentDecision");
{
  const context = {};
  vm.runInNewContext(fs.readFileSync(new URL("../content-decision-core.js", import.meta.url), "utf8"), context);
  assert.equal(context.DacContentDecision, context.DagContentDecisionCore, "the v0.1.0 global name aliases the same frozen object");
  assert.ok(Object.isFrozen(context.DacContentDecision), "the export is frozen");
}

/* ---- exposeFileInput state machine (transient Gemini input) --------------- */

async function exposure({ initial = null, trigger = {}, menu = {}, waits = [], snapshots = [] } = {}) {
  let clicks = 0; let index = 0; let snapshotIndex = 0;
  const ports = { queryInput: () => initial, findTrigger: () => trigger, findMenuItem: () => menu, click: () => { clicks += 1; }, snapshot: () => snapshots[snapshotIndex++] || {}, waitInput: async () => { const value = waits[index++] || null; if (value instanceof Error) throw value; return value; } };
  try { return { input: await Core.exposeFileInput(ports), clicks }; } catch (error) { return { error: error.message, clicks }; }
}
assert.deepEqual(await exposure({ initial: { id: "input" } }), { input: { id: "input" }, clicks: 0 });
assert.deepEqual(await exposure({ waits: [{ id: "lazy-input" }] }), { input: { id: "lazy-input" }, clicks: 1 }, "trigger exposes lazy input");
assert.deepEqual(await exposure({ waits: [null, { id: "menu-input" }] }), { input: { id: "menu-input" }, clicks: 2 }, "menu item exposes input after trigger");
assert.deepEqual(await exposure({ menu: null, waits: [null] }), { error: "UPLOAD_MENU_ITEM_MISSING", clicks: 1 });
assert.deepEqual(await exposure({ waits: [null, null] }), { error: "FILE_INPUT_NOT_EXPOSED", clicks: 2 });
assert.deepEqual(await exposure({ snapshots: [{ security: "SECURITY_BLOCKER" }] }), { error: "SECURITY_BLOCKER", clicks: 0 }, "blocker before exposure prevents trigger click");
assert.deepEqual(await exposure({ waits: [new Error("SECURITY_BLOCKER")] }), { error: "SECURITY_BLOCKER", clicks: 1 }, "blocker during first wait prevents menu click");
assert.deepEqual(await exposure({ waits: [new Error("ABORTED_BY_OPERATOR")] }), { error: "ABORTED_BY_OPERATOR", clicks: 1 }, "abort during first wait prevents menu click");
assert.deepEqual(await exposure({ waits: [null, { id: "normal-timeout-menu" }] }), { input: { id: "normal-timeout-menu" }, clicks: 2 }, "ordinary first timeout may proceed to menu");
assert.deepEqual(await exposure({ waits: [null, new Error("QUOTA_LIMIT")] }), { error: "QUOTA_LIMIT", clicks: 2 }, "blocker during second wait propagates unchanged");
assert.deepEqual(await exposure({ waits: [null], snapshots: [{}, { abortRequested: true }] }), { error: "ABORTED_BY_OPERATOR", clicks: 1 }, "abort before menu prevents second click");

/* ---- attachmentReady / sendReady / guarded clicks -------------------------- */

assert.equal(Core.attachmentReady(2, 3, { after: 5, busy: false }), true);
assert.equal(Core.attachmentReady(2, 3, { after: 5, busy: true }), false, "busy upload is not ready");
assert.equal(Core.attachmentReady(2, 3, { after: 4, busy: false }), false, "missing preview is not ready");
assert.equal(Core.sendReady({ found: false }), false); assert.equal(Core.sendReady({ found: true, disabled: true }), false); assert.equal(Core.sendReady({ found: true, ariaDisabled: "true" }), false); assert.equal(Core.sendReady({ found: true }), true);
for (const blocker of ["SECURITY_BLOCKER", "QUOTA_LIMIT", "POLICY_BLOCK"]) { let clicks = 0; await assert.rejects(Core.guardedAction({ security: blocker === "SECURITY_BLOCKER" ? blocker : null, quota: blocker === "SECURITY_BLOCKER" ? null : blocker }, () => { clicks += 1; }), new RegExp(blocker)); assert.equal(clicks, 0, `${blocker} must prevent Send click`); assert.equal(Core.sendReady({ found: true, security: blocker === "SECURITY_BLOCKER" ? blocker : null, quota: blocker === "SECURITY_BLOCKER" ? null : blocker }), false); }
let submittedPersisted = false; let stopAfterPersist = false; let sendClicks = 0;
submittedPersisted = true; stopAfterPersist = true;
await assert.rejects(Core.clickSend({ snapshot: () => ({ abortRequested: stopAfterPersist }), click: () => { sendClicks += 1; } }), /ABORTED_BY_OPERATOR/, "Stop after durable SUBMITTED persistence must prevent Send");
assert.equal(submittedPersisted, true); assert.equal(sendClicks, 0);
stopAfterPersist = false; await Core.clickSend({ snapshot: () => ({ abortRequested: stopAfterPersist }), click: () => { sendClicks += 1; } }); assert.equal(sendClicks, 1);

/* ---- addedSince: unique arrivals, not a rising total ------------------------ */

// Codex review finding: summing overlapping selectors across the document is not a count of attachments.
// These pin the replacement model — unique arrivals, not a rising total.
const a = { id: "placeholder" }, b = { id: "thumbnail" }, c = { id: "second" };
assert.equal(Core.addedSince(new Set([a]), new Set([a])), 0, "nothing new means nothing arrived");
assert.equal(Core.addedSince(new Set(), new Set([a])), 1, "a first preview counts as one arrival");
assert.equal(Core.addedSince(new Set([a]), new Set([b])), 1, "a placeholder swapped in place for the finished thumbnail is still one arrival");
assert.equal(Core.addedSince(new Set([a]), new Set([a, b, c])), 2, "only genuinely new nodes count");
// The old summed model failed exactly here: after(1) >= before(1) + expected(1) is false, so a correct
// in-place swap timed out at 20s even though the page had rendered the attachment.
assert.equal(Core.attachmentReady(1, 1, { after: 1, busy: false }), false, "the old summed comparison rejects a valid in-place swap");
assert.equal(Core.attachmentReady(0, 1, { after: Core.addedSince(new Set([a]), new Set([b])), busy: false }), true, "the replacement model accepts it");
assert.equal(Core.attachmentReady(0, 1, { after: 1, busy: true }), false, "a busy uploader still blocks readiness");

/* ---- v0.1.0 output-attribution cases as Gemini image-evidence fixtures ----- */

const Evidence = load("../image-evidence-core.js", "DacImageEvidence");
const candidate = (source, extra = {}) => ({ source, source_id: source.length.toString(16), node_id: `n-${source.slice(-6)}`, role: "assistant", input: false, visible: true, ready: true, ...extra });
// gstatic zero-state gallery cards and the operator's own uploads arrive
// marked input:true by content.js's exclusion rules -- they must never win.
const galleryCard = candidate("https://www.gstatic.com/lamda/images/immersives/origami.png", { role: "unknown", input: true });
const userUpload = candidate("blob:https://gemini.google.com/1111-2222", { role: "user", input: true });
const generated = candidate("https://lh3.googleusercontent.com/gg-dl/result-one");
const generatedTwo = candidate("https://lh3.googleusercontent.com/gg-dl/result-two");
const priorGenerated = candidate("https://lh3.googleusercontent.com/gg-dl/result-old");

// One fresh generated image inside the new model-response wins with post_turn attribution.
let verdict = Evidence.selectAttributableImage({ postTurn: [generated, userUpload], visible: [generated, userUpload, galleryCard], baseline: [galleryCard, userUpload, priorGenerated] });
assert.equal(verdict.ok, true);
assert.equal(verdict.candidate.source, generated.source);
assert.equal(verdict.attribution, "post_turn");

// Only excluded/input imagery fresh on the page -> INPUT_IMAGE_FALSE_POSITIVE, never a win.
verdict = Evidence.selectAttributableImage({ postTurn: [], visible: [galleryCard, userUpload], baseline: [] });
assert.equal(verdict.ok, false);
assert.equal(verdict.reason, "INPUT_IMAGE_FALSE_POSITIVE");

// Two fresh generated images in the new turn -> ambiguity is refused, not resolved.
verdict = Evidence.selectAttributableImage({ postTurn: [generated, generatedTwo], visible: [generated, generatedTwo], baseline: [] });
assert.equal(verdict.ok, false);
assert.equal(verdict.reason, "AMBIGUOUS_POST_TURN_IMAGE");

// An image already present at the pre-send boundary can never be re-claimed.
verdict = Evidence.selectAttributableImage({ postTurn: [priorGenerated], visible: [priorGenerated], baseline: [priorGenerated] });
assert.equal(verdict.ok, false);
assert.equal(verdict.reason, "NO_NEW_IMAGE");

// A still-loading generated image is not yet output evidence.
verdict = Evidence.selectAttributableImage({ postTurn: [candidate(generated.source, { ready: false })], visible: [candidate(generated.source, { ready: false })], baseline: [] });
assert.equal(verdict.ok, false);
assert.equal(verdict.reason, "NO_NEW_IMAGE");

console.log("PASS content decisions: lazy input, previews, disabled Send, blockers and Gemini attribution fixtures execute fail-closed");
