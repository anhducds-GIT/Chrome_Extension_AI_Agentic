import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function load(relativePath, globalName) {
  const context = {};
  vm.runInNewContext(fs.readFileSync(new URL(relativePath, import.meta.url), "utf8"), context);
  return context[globalName];
}

const evidence = load("../image-evidence-core.js", "DacImageEvidence");
const output = load("../output-location-core.js", "DacOutputLocation");
const readiness = load("../chat-readiness-core.js", "DacChatReadiness");
const runner = load("../runner-core.js", "DacRunnerCore");

const sources = (decision) => (decision.candidates || []).map((candidate) => candidate.source).join("|");
const image = (source, options = {}) => ({ source, source_id: `h:${source}`, node_id: `n:${source}`, turn_id: "turn-A", ready: true, visible: true, role: "assistant", input: false, ...options });

// --- one image: behaviour is byte-for-byte what it always was ---------
const single = evidence.selectAttributableImage({ postTurn: [image("a.png")], visible: [image("a.png")], baseline: [] });
assert.equal(single.ok, true);
assert.equal(single.candidate.source, "a.png");
assert.equal(sources(single), "a.png");
assert.equal(single.multi_image, false);
assert.equal(single.attribution, "post_turn");

// --- two images in ONE assistant turn: the A/B poll case ---------------
const pair = [image("a.png"), image("b.png")];
const multi = evidence.selectAttributableImages({ postTurn: pair, visible: pair, baseline: [], maxImages: 4 });
assert.equal(multi.ok, true);
assert.equal(multi.multi_image, true);
assert.equal(sources(multi), "a.png|b.png");
assert.equal(multi.diagnostics.chosen_count, 2);
assert.equal(multi.diagnostics.same_turn, true);

// --- the same pair still fails closed when multi-image is not allowed --
const capped = evidence.selectAttributableImages({ postTurn: pair, visible: pair, baseline: [], maxImages: 1 });
assert.equal(capped.ok, false);
assert.equal(capped.reason, "AMBIGUOUS_POST_TURN_IMAGE");

// --- images from DIFFERENT turns are still ambiguous -------------------
// This is the protection that must survive: when two assistant turns each
// carry a fresh image, attribution genuinely cannot tell whose output is
// whose, and guessing would put the wrong file under a job's name.
const split = [image("a.png", { turn_id: "turn-A" }), image("b.png", { turn_id: "turn-B" })];
const ambiguous = evidence.selectAttributableImages({ postTurn: split, visible: split, baseline: [], maxImages: 4 });
assert.equal(ambiguous.ok, false);
assert.equal(ambiguous.reason, "AMBIGUOUS_POST_TURN_IMAGE");
assert.equal(ambiguous.diagnostics.same_turn, false);

// An image with no assistant ancestor can never join a multi-image set.
const orphan = [image("a.png", { turn_id: "" }), image("b.png", { turn_id: "" })];
assert.equal(evidence.selectAttributableImages({ postTurn: orphan, visible: orphan, baseline: [], maxImages: 4 }).ok, false);

// --- more images than the job is allowed to claim ----------------------
const five = ["a", "b", "c", "d", "e"].map((name) => image(`${name}.png`));
const overLimit = evidence.selectAttributableImages({ postTurn: five, visible: five, baseline: [], maxImages: 4 });
assert.equal(overLimit.ok, false);
assert.equal(overLimit.reason, "TOO_MANY_NEW_IMAGES");
assert.equal(overLimit.diagnostics.candidate_count, 5);

// --- baseline images are still excluded --------------------------------
const withBaseline = evidence.selectAttributableImages({ postTurn: pair, visible: pair, baseline: [image("a.png")], maxImages: 4 });
assert.equal(withBaseline.ok, true);
assert.equal(sources(withBaseline), "b.png");
assert.equal(withBaseline.multi_image, false);

// --- a multi-image set is post-turn evidence only ----------------------
// new_visible_fallback answers "this appeared on the page and was not in the
// baseline", which an OLD assistant image satisfies just by having its
// blob/CDN URL refreshed. Tolerable for one image; not enough to hand a whole
// set of files to this job.
const fallbackPair = [image("a.png"), image("b.png")];
const fallbackOnly = evidence.selectAttributableImages({ postTurn: [], visible: fallbackPair, baseline: [], maxImages: 4 });
assert.equal(fallbackOnly.ok, false, "a multi-image set never rests on the visible fallback");
assert.equal(fallbackOnly.diagnostics.post_turn_only, false);
// One fallback image alone is still accepted, exactly as before.
const fallbackSingle = evidence.selectAttributableImages({ postTurn: [], visible: [image("a.png")], baseline: [], maxImages: 4 });
assert.equal(fallbackSingle.ok, true);
assert.equal(fallbackSingle.attribution, "new_visible_fallback");

// --- settling: a multi-image turn may render one image at a time -------
// Returning on the first attributable image would silently drop the rest.
const settleOptions = { settleMs: 1500, maxImages: 4 };
const sig = (decision) => evidence.imageSignature(decision);
assert.equal(evidence.settledForImages(multi, { previousSignature: "", stableSinceMs: null, nowMs: 1000, ...settleOptions }).settled, false, "a newly seen set is never settled");
const growing = evidence.settledForImages(multi, { previousSignature: "a.png", stableSinceMs: 1000, nowMs: 2000, ...settleOptions });
assert.equal(growing.settled, false);
assert.equal(growing.reason, "image_set_changed");
assert.equal(growing.stable_since_ms, 2000, "the settle clock restarts when the set changes");
// Identity, not size: a swapped URL at the same count must restart the clock.
const swapped = [image("a.png"), image("c.png")];
const swappedDecision = evidence.selectAttributableImages({ postTurn: swapped, visible: swapped, baseline: [], maxImages: 4 });
assert.equal(evidence.settledForImages(swappedDecision, { previousSignature: sig(multi), stableSinceMs: 1000, nowMs: 2000, ...settleOptions }).reason, "image_set_changed");
assert.equal(evidence.settledForImages(multi, { previousSignature: sig(multi), stableSinceMs: 2000, nowMs: 3000, ...settleOptions }).settled, false);
const stable = evidence.settledForImages(multi, { previousSignature: sig(multi), stableSinceMs: 2000, nowMs: 3500, ...settleOptions });
assert.equal(stable.settled, true);
assert.equal(stable.reason, "image_set_stable");
assert.equal(stable.count, 2);
// While ChatGPT is still generating, more images may genuinely be coming --
// hold the set open longer, but finitely, so a STALE generation control can
// never turn a proven set into a detection timeout.
assert.equal(evidence.settledForImages(multi, { previousSignature: sig(multi), stableSinceMs: 2000, nowMs: 3500, generationControlVisible: true, ...settleOptions }).settled, false);
const stableWhileGenerating = evidence.settledForImages(multi, { previousSignature: sig(multi), stableSinceMs: 2000, nowMs: 8100, generationControlVisible: true, ...settleOptions });
assert.equal(stableWhileGenerating.settled, true);
assert.equal(stableWhileGenerating.reason, "image_set_stable_while_generating");
// Single-image mode keeps returning immediately -- no added latency.
assert.equal(evidence.settledForImages(single, { previousSignature: "", nowMs: 1000, maxImages: 1 }).settled, true);
// Reaching max_images_per_job is a CAPACITY condition, not proof the turn has
// finished. A full set must still wait, so a further image can still be seen
// and make the whole set ambiguous instead of being silently dropped.
const four = ["a", "b", "c", "d"].map((name) => image(`${name}.png`));
const full = evidence.selectAttributableImages({ postTurn: four, visible: four, baseline: [], maxImages: 4 });
assert.equal(evidence.settledForImages(full, { previousSignature: sig(full), stableSinceMs: 3000, nowMs: 3001, ...settleOptions }).settled, false);
assert.equal(evidence.settledForImages(full, { previousSignature: sig(full), stableSinceMs: 3000, nowMs: 5000, ...settleOptions }).settled, true);
// The signature is a SET, not an ordered list: ChatGPT reordering the same
// two images in the DOM is not a new image and must not restart the clock.
const reordered = [image("b.png"), image("a.png")];
const reorderedDecision = evidence.selectAttributableImages({ postTurn: reordered, visible: reordered, baseline: [], maxImages: 4 });
assert.equal(sig(reorderedDecision), sig(multi), "the same set in a different DOM order has the same signature");
assert.equal(evidence.settledForImages(reorderedDecision, { previousSignature: sig(multi), stableSinceMs: 2000, nowMs: 3500, ...settleOptions }).settled, true);
// A rejected decision is never settled.
assert.equal(evidence.settledForImages(ambiguous, { previousSignature: "", nowMs: 1000, ...settleOptions }).settled, false);

// --- variant filenames -------------------------------------------------
// A single-image job keeps its exact filename, so nothing already on disk
// changes shape when this feature ships.
assert.equal(output.variantFilename("Q001.png", 1, 1), "Q001.png");
assert.equal(output.variantFilename("Q001.png", 1, 2), "Q001__variant-01.png");
assert.equal(output.variantFilename("Q001.png", 2, 2), "Q001__variant-02.png");
assert.equal(output.variantFilename("Q001.tar.gz", 2, 2), "Q001.tar__variant-02.gz");
assert.equal(output.variantFilename("Q001", 2, 2), "Q001__variant-02");
assert.equal(output.variantFilename("Q001.png", 0, 3), "Q001__variant-01.png");
// The uniquify collision policy still recognises a variant leaf as its own
// file, so a re-run appends __attempt-NN rather than colliding.
assert.equal(output.isPolicyFilename("Q001__variant-02.png", "Q001__variant-02__attempt-01.png", "uniquify"), true);
assert.equal(output.isPolicyFilename("Q001__variant-02.png", "Q001__variant-01.png", "uniquify"), false);

// --- readiness treats an unanswered poll as its own wait state ---------
const base = { composerFound: true, sendUsable: true, generating: false, securityBlocker: null, generationLimitBlocker: null, attachmentPending: false, outputVerified: true };
assert.equal(readiness.evaluate(base), "READY");
assert.equal(readiness.evaluate({ ...base, abPollPending: true }), "WAITING_AB_POLL");
// A hard stop still outranks the poll -- safety never waits behind a poll.
assert.equal(readiness.evaluate({ ...base, abPollPending: true, securityBlocker: "captcha" }), "HARD_STOP");
assert.equal(readiness.evaluate({ ...base, abPollPending: true, generating: true }), "GENERATING");

// --- config surface ----------------------------------------------------
const defaults = runner.runtimeConfig({});
assert.equal(defaults.ab_poll_action, "random");
assert.equal(defaults.max_images_per_job, 4);
assert.equal(runner.runtimeConfig({ ab_poll_action: "click_2" }).ab_poll_action, "click_2");
assert.equal(runner.runtimeConfig({ ab_poll_action: "SKIP" }).ab_poll_action, "skip");
assert.equal(runner.runtimeConfig({ max_images_per_job: 2 }).max_images_per_job, 2);
assert.throws(() => runner.runtimeConfig({ ab_poll_action: "click_9" }), /Invalid ab_poll_action/);
assert.throws(() => runner.runtimeConfig({ max_images_per_job: 0 }), /max_images_per_job/);
assert.throws(() => runner.runtimeConfig({ max_images_per_job: 21 }), /max_images_per_job/);

console.log("multi-image attribution smoke tests: PASS");
