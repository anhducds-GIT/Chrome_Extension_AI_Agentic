(() => {
  "use strict";
  const HARD_PHASES = new Set(["OWNER_REVIEW", "INTERRUPTED"]);
  const HARD_FAILURES = new Set(["SECURITY_BLOCKER", "QUOTA_LIMIT", "POLICY_BLOCK", "ATTEMPT_ID_MISMATCH", "BOUND_TAB_MISSING", "BOUND_TAB_RECEIVER_MISSING", "BOUND_TAB_LEFT_IMAGES_SURFACE", "GLOBAL_ACTIVE_ATTEMPT_EXISTS"]);
  function continuation(item, continueOnError) {
    const phase = String(item?.phase || ""); const failure = String(item?.failure_type || "");
    const hard = HARD_PHASES.has(phase) || HARD_FAILURES.has(failure) || /^BOUND_TAB_|^ATTEMPT_ID_/.test(failure);
    if (hard) return { proceed: false, hard_stop: true, reason: failure || phase };
    if (phase === "SUCCESS") return { proceed: true, hard_stop: false, reason: "SUCCESS" };
    return { proceed: Boolean(continueOnError && phase === "FAILED_PRE_SUBMIT"), hard_stop: false, reason: failure || phase || "FAILED" };
  }
  async function run(items, worker, options = {}) {
    let invoked = 0;
    for (let index = 0; index < items.length; index += 1) {
      if (options.stopping?.()) return { invoked, stopped: true, hard_stop: false, reason: "OPERATOR_STOP" };
      const item = items[index]; invoked += 1; await worker(item, index);
      const decision = continuation(item, options.continueOnError);
      if (!decision.proceed) { if (decision.hard_stop) await options.onHardStop?.(decision, item, index); return { invoked, stopped: true, ...decision }; }
      if (index < items.length - 1 && !options.stopping?.()) await options.onBetween?.(item, index);
    }
    return { invoked, stopped: false, hard_stop: false, reason: "QUEUE_COMPLETE" };
  }
  globalThis.DagBatchCore = Object.freeze({ HARD_PHASES, HARD_FAILURES, continuation, run });
})();
