import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function load(relativePath, globalName) {
  const context = {};
  vm.runInNewContext(fs.readFileSync(new URL(relativePath, import.meta.url), "utf8"), context);
  return context[globalName];
}

const evidence = load("../image-evidence-core.js", "DacImageEvidence");
const telemetry = load("../attempt-telemetry-core.js", "DacAttemptTelemetry");
const image = (source, options = {}) => ({ source, source_id: `h:${source}`, node_id: `n:${source}`, ready: true, visible: true, role: "unknown", input: false, ...options });
const assistant = (fingerprint, images) => ({ fingerprint, images });

function boundary(assistants, visible, references = []) {
  return Object.freeze({
    assistant_fingerprints: assistants.map((entry) => entry.fingerprint),
    images: visible,
    reference_source_ids: references.map((entry) => entry.source_id)
  });
}

function detect(immutableBoundary, currentAssistants, currentVisible, stopVisible = false) {
  const known = new Set(immutableBoundary.assistant_fingerprints);
  const postTurn = currentAssistants.filter((entry) => !known.has(entry.fingerprint)).flatMap((entry) => entry.images);
  const decision = evidence.selectAttributableImage({ postTurn, visible: currentVisible, baseline: immutableBoundary.images });
  return { decision, detection: { assistant_count_before: immutableBoundary.assistant_fingerprints.length, assistant_count_after: currentAssistants.length, stop_visible: stopVisible, baseline_image_count: immutableBoundary.images.length, fresh_candidate_count: decision.diagnostics?.fresh_count ?? 0, chosen_attribution: decision.attribution || null, rejection_reason: decision.ok ? null : decision.reason || "NO_NEW_IMAGE" } };
}

const old = image("old");
const generated = image("generated");
const unknownNoRef = detect(boundary([], []), [assistant("a1", [generated])], [generated]);
assert.equal(unknownNoRef.decision.ok, true, "unknown-role generated image without references is accepted");

const ref1 = image("ref-01", { input: true, role: "user" });
const unknownOneRef = detect(boundary([], [ref1], [ref1]), [assistant("a1", [generated])], [ref1, generated]);
assert.equal(unknownOneRef.decision.ok, true, "unknown-role generated image with one reference is accepted");

const refs5 = [1, 2, 3, 4, 5].map((n) => image(`ref-${n}`, { input: true, role: "user" }));
const generatedFive = image("generated-five");
assert.equal(detect(boundary([], refs5, refs5), [assistant("a5", [generatedFive])], [...refs5, generatedFive]).decision.candidate.source, "generated-five", "five input references remain excluded");

const rerender = image("ref-rerender", { input: true, role: "user" });
assert.equal(detect(boundary([], [old]), [], [old, rerender]).decision.ok, false, "user/reference rerender is excluded");
const altEcho = image("echoed-filename-alt", { input: true, role: "unknown" });
assert.equal(detect(boundary([], [old]), [], [old, altEcho]).decision.reason, "INPUT_IMAGE_FALSE_POSITIVE", "attachment preview/filename echo is excluded by input evidence");

const sidebarThumbnail = image("sidebar-fresh", { role: "unknown" });
assert.equal(detect(boundary([], []), [], [sidebarThumbnail]).decision.ok, false, "fresh unknown-role image outside the conversation is not fallback-selectable");
const assistantFallback = image("assistant-fresh", { role: "assistant" });
assert.equal(detect(boundary([], []), [], [assistantFallback]).decision.candidate.source, "assistant-fresh", "fresh assistant-message image remains fallback-selectable");

const two = detect(boundary([], []), [assistant("a1", [image("one"), image("two")])], [image("one"), image("two")]);
assert.equal(two.decision.reason, "AMBIGUOUS_POST_TURN_IMAGE", "multiple fresh candidates fail closed");
const postTurnPlusFresh = detect(boundary([], []), [assistant("a1", [image("one")])], [image("one"), image("unrelated-fresh", { role: "assistant" })]);
assert.equal(postTurnPlusFresh.decision.reason, "AMBIGUOUS_NEW_IMAGE", "a post-turn image cannot hide a second qualifying fresh candidate");

const reorderedBoundary = boundary([assistant("old-a", [old])], [old]);
const reordered = detect(reorderedBoundary, [assistant("new-a", [generated]), assistant("old-a", [old])], [old, generated]);
assert.equal(reordered.decision.candidate.source, "generated", "assistant reordering/virtualization uses immutable fingerprints, not ordinal position");

const stillGenerating = detect(boundary([], []), [assistant("a1", [generated])], [generated], true);
assert.equal(stillGenerating.decision.ok, true, "Stop-visible state does not suppress image diagnostics");
assert.equal(stillGenerating.detection.stop_visible, true, "Stop-visible state is recorded");
assert.equal(evidence.completionForImage(stillGenerating.decision, { generationControlVisible: true }).ok, true, "a stale generation control cannot suppress proven image completion");

// Regression: ChatGPT can render a completed image without an assistant text
// node.  Completion is driven by the immutable post-submit image boundary,
// not assistant prose or its presence in the DOM.
const imageOnlyNoAssistantText = detect(boundary([], []), [], [image("generated", { role: "assistant" })], false);
assert.equal(imageOnlyNoAssistantText.decision.ok, true, "a visible ready generated image is attributable with no assistant text");
assert.equal(evidence.completionForImage(imageOnlyNoAssistantText.decision, { generationControlVisible: false }).reason, "image_ready", "completed image-only output is detected");

const reconciliationBoundary = boundary([assistant("old-a", [old])], [old]);
const firstPass = detect(reconciliationBoundary, [assistant("new-a", [generated])], [old, generated]);
const reconcilePass = detect(reconciliationBoundary, [assistant("new-a", [generated])], [old, generated]);
assert.deepEqual(reconcilePass.decision, firstPass.decision, "reconciliation uses the identical immutable boundary");

const attempt = { submittedAt: "2026-08-20T01:02:03.000Z", detection: { ...stillGenerating.detection, assistant_node_ids: ["h:a1"], rejection_reason: "NO_NEW_IMAGE" } };
const fields = telemetry.fieldsFromAttempt(attempt);
assert.equal(fields.submitted_at, attempt.submittedAt, "actual click timestamp is persisted");
const ledgerItem = { ...fields };
const audit = telemetry.auditFields(ledgerItem);
assert.equal(audit.detection.rejection_reason, "NO_NEW_IMAGE", "JSONL and interrupted ledger receive the final rejection reason");
assert.equal(audit.detection.stop_visible, true, "JSONL and interrupted ledger receive generation state");

console.log("V1 output-detection DOM/behavioral fixtures: PASS");
