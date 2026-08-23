(() => {
  "use strict";
  function attemptKey(value = {}) { return `${value.run_id || ""}|${value.job_id || ""}|${value.attempt_id || ""}`; }
  function createBinding(message, tab, surface) {
    if (!message?.run_id || !message?.job_id || !message?.attempt_id || !Number.isInteger(tab?.id) || surface !== "IMAGES") throw new Error("INVALID_ATTEMPT_BINDING");
    return Object.freeze({ key: attemptKey(message), run_id: message.run_id, job_id: message.job_id, attempt_id: message.attempt_id, tab_id: tab.id, window_id: tab.windowId, initial_url: tab.url || "", surface, bound_at: new Date().toISOString() });
  }
  function matches(binding, message) { return Boolean(binding && attemptKey(binding) === attemptKey(message)); }
  function validate(binding, message, tab, snapshot) {
    if (!matches(binding, message)) return { ok: false, reason: "ATTEMPT_ID_MISMATCH" };
    if (!tab || tab.id !== binding.tab_id || tab.windowId !== binding.window_id) return { ok: false, reason: "BOUND_TAB_MISSING" };
    if (snapshot?.surface !== "IMAGES") return { ok: false, reason: "BOUND_TAB_LEFT_IMAGES_SURFACE" };
    return { ok: true, reason: "BOUND_ATTEMPT_TAB" };
  }
  globalThis.DagBindingCore = Object.freeze({ attemptKey, createBinding, matches, validate });
})();
