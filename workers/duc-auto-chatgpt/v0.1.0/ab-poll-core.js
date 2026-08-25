(() => {
  "use strict";

  // ChatGPT sometimes answers ONE image prompt with TWO images plus a poll:
  // "Which image do you like more?" with two "Image N is better" buttons and a
  // small Skip link. Live evidence 2026-08-25 (Đức's Quick session):
  //   - an UNANSWERED poll keeps the assistant turn open and LOCKS the
  //     composer, so the next job hangs in WAITING_READY forever;
  //   - answering by typing into the composer is impossible -- Enter does not
  //     send while the poll is pending (tested live, "1" + Enter, no send).
  // The only way out is to CLICK the poll, which is the owner's decision
  // (decisions.md 2026-08-25): default = random between image 1 and 2.
  //
  // This module holds the poll POLICY only. DOM discovery lives in content.js
  // so that the decision layer stays testable without a browser.

  const ACTIONS = Object.freeze(["random", "click_1", "click_2", "skip"]);
  const DEFAULT_ACTION = "random";

  // Anchored on the visible English wording ChatGPT renders today. Kept
  // deliberately narrow: a false positive here CLICKS something in the
  // operator's live chat, so a loose pattern is worse than a missed poll.
  // If a new wording shows up live, capture the block through
  // detection_diagnostics first and add the exact phrase here.
  const QUESTION_PATTERN = /which\s+image\s+do\s+you\s+(?:like|prefer)\s*(?:more|better)?\s*\??/i;
  const CHOICE_PATTERN = /^\s*image\s+(\d{1,2})\s+is\s+better\s*$/i;
  const SKIP_PATTERN = /^\s*skip\s*$/i;

  function normalizeAction(value) {
    const action = String(value ?? "").trim().toLowerCase();
    if (!action) return DEFAULT_ACTION;
    return ACTIONS.includes(action) ? action : DEFAULT_ACTION;
  }

  function validateAction(value) {
    const action = String(value ?? "").trim().toLowerCase();
    if (!action) return DEFAULT_ACTION;
    if (!ACTIONS.includes(action)) throw new Error(`Invalid ab_poll_action '${value}'; expected one of ${ACTIONS.join(", ")}.`);
    return action;
  }

  function isQuestionText(text) {
    return QUESTION_PATTERN.test(String(text || ""));
  }

  function choiceNumber(text) {
    const match = CHOICE_PATTERN.exec(String(text || ""));
    if (!match) return null;
    const number = Number(match[1]);
    return Number.isInteger(number) && number >= 1 && number <= 20 ? number : null;
  }

  function isSkipText(text) {
    return SKIP_PATTERN.test(String(text || ""));
  }

  // choices: [{ number, index }] in DOM order, already de-duplicated by caller.
  // Returns exactly one instruction, or a NAMED refusal. A refusal is a
  // visible blocker for the operator, never a silent substitution: doing the
  // opposite of the configured policy would make the audit trail lie.
  function chooseAnswer(action, { choices = [], hasSkip = false, random = Math.random } = {}) {
    const policy = normalizeAction(action);
    const available = choices.filter((choice) => Number.isInteger(choice?.number));
    if (policy === "skip") {
      if (hasSkip) return { kind: "skip", action: policy, choice_number: null };
      return { kind: "none", action: policy, reason: "SKIP_CONTROL_MISSING" };
    }
    if (policy === "click_1" || policy === "click_2") {
      const wanted = policy === "click_1" ? 1 : 2;
      const match = available.find((choice) => choice.number === wanted);
      if (match) return { kind: "choice", action: policy, choice_number: match.number, index: match.index };
      return { kind: "none", action: policy, reason: "CHOICE_UNAVAILABLE" };
    }
    if (!available.length) {
      if (hasSkip) return { kind: "skip", action: policy, choice_number: null, fallback: "NO_CHOICE_CONTROL" };
      return { kind: "none", action: policy, reason: "NO_ANSWER_CONTROL" };
    }
    const roll = Number(random());
    const bounded = Number.isFinite(roll) && roll >= 0 && roll < 1 ? roll : 0;
    const picked = available[Math.min(available.length - 1, Math.floor(bounded * available.length))];
    return { kind: "choice", action: policy, choice_number: picked.number, index: picked.index, randomized: true };
  }

  // Vietnamese, because this reaches the operator. The finding CODE stays
  // English (it is an identifier in the audit JSONL and the tests).
  function refusalMessage(reason) {
    if (reason === "SKIP_CONTROL_MISSING") return "Poll A/B đang treo nhưng không tìm thấy nút Skip — trả lời tay hoặc đổi ab_poll_action sang click_1/click_2/random.";
    if (reason === "CHOICE_UNAVAILABLE") return "Poll A/B đang treo nhưng không có lựa chọn ảnh theo đúng ab_poll_action — trả lời tay hoặc đổi sang random.";
    if (reason === "NO_ANSWER_CONTROL") return "Poll A/B đang treo nhưng không tìm thấy nút trả lời nào — trả lời tay trên tab ChatGPT.";
    return "Poll A/B đang treo và chưa trả lời được.";
  }

  const api = { ACTIONS, DEFAULT_ACTION, normalizeAction, validateAction, isQuestionText, choiceNumber, isSkipText, chooseAnswer, refusalMessage };
  (typeof window !== "undefined" ? window : globalThis).DacAbPoll = api;
})();
