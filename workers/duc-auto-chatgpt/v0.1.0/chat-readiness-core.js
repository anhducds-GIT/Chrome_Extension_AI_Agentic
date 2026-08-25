(() => {
  "use strict";

  function evaluate(signal = {}) {
    // A generation-limit block (daily/monthly image quota reached) is not a
    // security issue, but it must gate submission exactly the same way: no
    // next prompt goes out while ChatGPT has said it will not generate more
    // right now. Callers distinguish which one fired from their own blocker
    // text/message, not from this state name.
    if (signal.securityBlocker || signal.generationLimitBlocker) return "HARD_STOP";
    if (signal.generating) return "GENERATING";
    // An unanswered "Which image do you like more?" poll holds the assistant
    // turn open and locks the composer, so the composer can look present and
    // the Send button can look usable while nothing can actually be sent.
    // Treat it as its own wait state so a caller never mistakes it for READY
    // and never reports it as a mysterious composer timeout.
    if (signal.abPollPending) return "WAITING_AB_POLL";
    if (!signal.composerFound) return "COMPOSER_MISSING";
    if (signal.attachmentPending) return "WAITING_UPLOAD";
    if (!signal.outputVerified) return "OUTPUT_READY";
    return "READY";
  }

  (typeof window !== "undefined" ? window : globalThis).DacChatReadiness = { evaluate };
})();
