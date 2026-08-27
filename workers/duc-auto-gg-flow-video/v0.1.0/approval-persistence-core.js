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

  (typeof window !== "undefined" ? window : globalThis).DacApprovalPersistence = Object.freeze({ execute });
})();
