(() => {
  "use strict";

  async function execute(steps = {}) {
    const required = ["snapshot", "apply", "persist_audit", "persist_checkpoint", "commit", "rollback"];
    for (const name of required) if (typeof steps[name] !== "function") throw new TypeError(`Missing approval persistence step '${name}'.`);
    const snapshot = await steps.snapshot();
    let applied;
    let audit;
    let checkpoint;
    try {
      applied = await steps.apply(snapshot);
      audit = await steps.persist_audit(applied, snapshot);
      checkpoint = await steps.persist_checkpoint(applied, audit, snapshot);
      const result = await steps.commit(applied, audit, checkpoint, snapshot);
      return Object.freeze({ ok: true, audit, checkpoint, result });
    } catch (error) {
      await steps.rollback({ snapshot, applied, audit, checkpoint, error });
      throw error;
    }
  }

  function createQueueRunLock(state) {
    if (!state || typeof state !== "object") throw new TypeError("Queue/run lock requires shared state.");
    return Object.freeze({
      tryBeginMutation() {
        if (state.queueMutationRunning || state.running || state.runStarting) return false;
        state.queueMutationRunning = true;
        return true;
      },
      endMutation() { state.queueMutationRunning = false; },
      tryBeginRun() {
        if (state.queueMutationRunning || state.running || state.runStarting) return false;
        state.runStarting = true;
        return true;
      },
      promoteRun() {
        if (!state.runStarting) throw new Error("Run-start latch is not held.");
        state.runStarting = false;
        state.running = true;
      },
      endRunStart() { state.runStarting = false; }
    });
  }

  (typeof window !== "undefined" ? window : globalThis).DacApprovalPersistence = Object.freeze({ execute, createQueueRunLock });
})();
