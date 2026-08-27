(() => {
  "use strict";

  function evaluate(signal = {}) {
    // A generation-limit block (daily/monthly image quota reached) is not a
    // security issue, but it must gate submission exactly the same way: no
    // next prompt goes out while Gemini has said it will not generate more
    // right now. Callers distinguish which one fired from their own blocker
    // text/message, not from this state name.
    if (signal.securityBlocker || signal.generationLimitBlocker) return "HARD_STOP";
    if (signal.generating) return "GENERATING";
    if (!signal.composerFound) return "COMPOSER_MISSING";
    if (signal.attachmentPending) return "WAITING_UPLOAD";
    if (!signal.outputVerified) return "OUTPUT_READY";
    return "READY";
  }

  (typeof window !== "undefined" ? window : globalThis).DacChatReadiness = { evaluate };
})();
