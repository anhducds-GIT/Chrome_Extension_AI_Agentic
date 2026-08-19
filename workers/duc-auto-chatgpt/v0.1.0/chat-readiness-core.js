(() => {
  "use strict";

  function evaluate(signal = {}, { requireSendUsable = true } = {}) {
    if (signal.securityBlocker) return "HARD_STOP";
    if (signal.generating) return "GENERATING";
    if (!signal.composerFound) return "COMPOSER_MISSING";
    if (!signal.outputVerified) return "OUTPUT_READY";
    if (requireSendUsable && !signal.sendUsable) return "OUTPUT_READY";
    return "READY";
  }

  (typeof window !== "undefined" ? window : globalThis).DacChatReadiness = { evaluate };
})();
