import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function load(relativePath, globalName) {
  const context = {};
  vm.runInNewContext(fs.readFileSync(new URL(relativePath, import.meta.url), "utf8"), context);
  return context[globalName];
}

const poll = load("../ab-poll-core.js", "DacAbPoll");
const choices = [{ number: 1, index: 0 }, { number: 2, index: 1 }];

// --- text anchors -----------------------------------------------------
// A false positive CLICKS something in the operator's live chat, so the
// question pattern must stay narrow.
assert.equal(poll.isQuestionText("Which image do you like more?"), true);
assert.equal(poll.isQuestionText("which image do you prefer"), true);
assert.equal(poll.isQuestionText("Which image do you like better?"), true);
assert.equal(poll.isQuestionText("Here is the image you asked for."), false);
assert.equal(poll.isQuestionText("Do you like this image?"), false);
assert.equal(poll.isQuestionText(""), false);

assert.equal(poll.choiceNumber("Image 1 is better"), 1);
assert.equal(poll.choiceNumber("  image 2 is better  "), 2);
assert.equal(poll.choiceNumber("Image 2 is better than the first"), null);
assert.equal(poll.choiceNumber("Regenerate"), null);

assert.equal(poll.isSkipText("Skip"), true);
assert.equal(poll.isSkipText(" skip "), true);
assert.equal(poll.isSkipText("Skip this poll"), false);

// --- action normalisation --------------------------------------------
assert.equal(poll.normalizeAction(undefined), "random");
assert.equal(poll.normalizeAction(""), "random");
assert.equal(poll.normalizeAction("CLICK_2"), "click_2");
assert.equal(poll.normalizeAction("nonsense"), "random");
assert.equal(poll.validateAction("skip"), "skip");
assert.throws(() => poll.validateAction("nonsense"), /Invalid ab_poll_action/);

// --- explicit policies ------------------------------------------------
const first = poll.chooseAnswer("click_1", { choices, hasSkip: true });
assert.deepEqual({ kind: first.kind, choice_number: first.choice_number }, { kind: "choice", choice_number: 1 });
const second = poll.chooseAnswer("click_2", { choices, hasSkip: true });
assert.deepEqual({ kind: second.kind, choice_number: second.choice_number }, { kind: "choice", choice_number: 2 });
assert.equal(poll.chooseAnswer("skip", { choices, hasSkip: true }).kind, "skip");

// --- refusals are named, never silently substituted -------------------
// Doing the opposite of the configured policy would make the audit lie, so
// an unavailable control is reported instead of quietly clicking something.
const noSkip = poll.chooseAnswer("skip", { choices, hasSkip: false });
assert.deepEqual({ kind: noSkip.kind, reason: noSkip.reason }, { kind: "none", reason: "SKIP_CONTROL_MISSING" });
const noChoice = poll.chooseAnswer("click_2", { choices: [{ number: 1, index: 0 }], hasSkip: true });
assert.deepEqual({ kind: noChoice.kind, reason: noChoice.reason }, { kind: "none", reason: "CHOICE_UNAVAILABLE" });
const nothing = poll.chooseAnswer("random", { choices: [], hasSkip: false });
assert.deepEqual({ kind: nothing.kind, reason: nothing.reason }, { kind: "none", reason: "NO_ANSWER_CONTROL" });
for (const reason of ["SKIP_CONTROL_MISSING", "CHOICE_UNAVAILABLE", "NO_ANSWER_CONTROL"]) {
  assert.ok(poll.refusalMessage(reason).length > 10, `${reason} has an operator message`);
}

// --- random policy is a real coin flip over the offered choices --------
assert.deepEqual(
  [0, 0.49, 0.5, 0.99].map((roll) => poll.chooseAnswer("random", { choices, hasSkip: true, random: () => roll }).choice_number),
  [1, 1, 2, 2]
);
assert.equal(poll.chooseAnswer("random", { choices, hasSkip: true, random: () => 0.2 }).randomized, true);
// A broken random source must still produce a valid click, never undefined.
for (const roll of [Number.NaN, -1, 1, 42]) {
  const answer = poll.chooseAnswer("random", { choices, hasSkip: true, random: () => roll });
  assert.equal(answer.kind, "choice");
  assert.ok([1, 2].includes(answer.choice_number), `roll ${roll} still picks a real choice`);
}
// With no choice controls but a Skip link, random clears the poll and says so.
const skipFallback = poll.chooseAnswer("random", { choices: [], hasSkip: true });
assert.deepEqual({ kind: skipFallback.kind, fallback: skipFallback.fallback }, { kind: "skip", fallback: "NO_CHOICE_CONTROL" });

console.log("ab-poll core smoke tests: PASS");
