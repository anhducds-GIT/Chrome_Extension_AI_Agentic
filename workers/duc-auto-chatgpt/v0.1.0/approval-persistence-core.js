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
        // A stop belongs to the run that was live when it was asked for. This
        // latch is the ONE synchronous instant at which a new run begins, so it
        // is the only safe place to drop a stale stop flag.
        //
        // The reset used to live further down inside run(), AFTER the run had
        // already awaited its validation -- which meant a stop arriving during
        // that await (run.stop bypasses this lock, so it can) was silently
        // wiped, and the run submitted prompts anyway while the caller had been
        // told it was stopping. Clearing it here keeps the property that made
        // the old placement correct (a stop requested while idle can never kill
        // the NEXT run) and adds the one it lacked (a stop requested after a run
        // has begun always survives to be honoured).
        state.stopRequested = false;
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
