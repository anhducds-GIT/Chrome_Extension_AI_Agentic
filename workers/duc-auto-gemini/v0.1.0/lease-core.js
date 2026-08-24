(() => {
  "use strict";
  function identity(value = {}) {
    return { run_id: String(value.run_id || ""), job_id: String(value.job_id || ""), attempt_id: String(value.attempt_id || "") };
  }
  function key(value = {}) {
    const current = identity(value); return `${current.run_id}|${current.job_id}|${current.attempt_id}`;
  }
  function createController() {
    let active = null;
    function acquire(value) {
      const current = identity(value); if (!current.run_id || !current.job_id || !current.attempt_id) throw new Error("GLOBAL_LEASE_IDENTITY_REQUIRED");
      if (active) throw new Error("GLOBAL_ACTIVE_ATTEMPT_EXISTS");
      active = Object.freeze({ ...current, key: key(current), acquired_at: new Date().toISOString() }); return active;
    }
    function release(value) {
      if (!active || active.key !== key(value)) return false;
      active = null; return true;
    }
    async function run(value, task) {
      const lease = acquire(value);
      try { return await task(lease); }
      finally { release(value); }
    }
    function snapshot() { return active ? { ...active } : null; }
    return Object.freeze({ acquire, release, run, snapshot });
  }
  function createDurableController(ports = {}) {
    let active = null; let acquiring = false;
    async function acquire(value) {
      const current = identity(value); if (!current.run_id || !current.job_id || !current.attempt_id) throw new Error("GLOBAL_LEASE_IDENTITY_REQUIRED");
      if (acquiring || active) throw new Error("GLOBAL_ACTIVE_ATTEMPT_EXISTS");
      acquiring = true;
      try {
        if (await ports.load?.()) throw new Error("GLOBAL_ACTIVE_ATTEMPT_EXISTS");
        const lease = Object.freeze({ ...current, key: key(current), acquired_at: new Date().toISOString() });
        if (typeof ports.save !== "function") throw new Error("GLOBAL_LEASE_STORE_REQUIRED");
        await ports.save(lease); active = lease; return lease;
      } finally { acquiring = false; }
    }
    async function release(value) {
      const leaseKey = key(value); if (typeof ports.clear !== "function") throw new Error("GLOBAL_LEASE_STORE_REQUIRED");
      const released = await ports.clear(leaseKey); if (active?.key === leaseKey) active = null; return released;
    }
    async function run(value, task) {
      const lease = await acquire(value);
      try { return await task(lease); }
      finally { await release(value); }
    }
    function snapshot() { return active ? { ...active } : null; }
    return Object.freeze({ acquire, release, run, snapshot });
  }
  globalThis.DagLeaseCore = Object.freeze({ identity, key, createController, createDurableController });
})();
