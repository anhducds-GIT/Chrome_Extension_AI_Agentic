(() => {
  "use strict";

  function evaluate(signal = {}) {
    if (signal.securityBlocker) return "HARD_STOP";
    if (signal.generating) return "GENERATING";
    if (!signal.composerFound) return "COMPOSER_MISSING";
    if (signal.attachmentPending) return "WAITING_UPLOAD";
    if (!signal.outputVerified) return "OUTPUT_READY";
    return "READY";
  }

  (typeof window !== "undefined" ? window : globalThis).DacChatReadiness = { evaluate };
})();
