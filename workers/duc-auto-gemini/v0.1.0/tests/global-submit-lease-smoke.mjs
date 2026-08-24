import { assert, load, pass } from "./test-helpers.mjs";
const Lease = await load(new URL("../lease-core.js", import.meta.url), "DagLeaseCore");
const controller = Lease.createController();
const first = { run_id: "run-a", job_id: "job-a", attempt_id: "run-a:job-a:a001" };
const second = { run_id: "run-b", job_id: "job-b", attempt_id: "run-b:job-b:a001" };
let releaseFirst;
const firstBlocked = new Promise((resolve) => { releaseFirst = resolve; });
let firstEntered = false; let secondEntered = false;
const firstRun = controller.run(first, async () => { firstEntered = true; await firstBlocked; return "FIRST_DONE"; });
await Promise.resolve();
await assert.rejects(controller.run(second, async () => { secondEntered = true; }), /GLOBAL_ACTIVE_ATTEMPT_EXISTS/, "second Side Panel/tab must fail before entering submit-critical work");
assert.equal(firstEntered, true); assert.equal(secondEntered, false); assert.equal(controller.snapshot().attempt_id, first.attempt_id);
releaseFirst(); assert.equal(await firstRun, "FIRST_DONE"); assert.equal(controller.snapshot(), null, "lease releases after the first routed attempt settles");
assert.equal(await controller.run(second, async () => { secondEntered = true; return "SECOND_DONE"; }), "SECOND_DONE"); assert.equal(secondEntered, true);
await assert.rejects(controller.run({ run_id: "", job_id: "bad", attempt_id: "bad" }, async () => {}), /GLOBAL_LEASE_IDENTITY_REQUIRED/);
let durableLease = null;
const durablePorts = {
  async load() { return durableLease ? { ...durableLease } : null; },
  async save(value) { durableLease = { ...value }; },
  async clear(expectedKey) { if (durableLease?.key !== expectedKey) return false; durableLease = null; return true; }
};
const beforeRestart = Lease.createDurableController(durablePorts); let finishBeforeRestart;
const heldAcrossRestart = beforeRestart.run(first, async () => new Promise((resolve) => { finishBeforeRestart = resolve; }));
await Promise.resolve(); await Promise.resolve(); assert.equal(durableLease.attempt_id, first.attempt_id);
const afterRestart = Lease.createDurableController(durablePorts); let enteredAfterRestart = false;
await assert.rejects(afterRestart.run(second, async () => { enteredAfterRestart = true; }), /GLOBAL_ACTIVE_ATTEMPT_EXISTS/, "new service-worker runtime must reconstruct the durable conflict");
assert.equal(enteredAfterRestart, false); assert.equal(await afterRestart.release(first), true, "matching terminal stage may release a lease owned before restart");
assert.equal(await afterRestart.run(second, async () => "AFTER_RESTART_DONE"), "AFTER_RESTART_DONE");
finishBeforeRestart("FIRST_RUNTIME_GONE"); assert.equal(await heldAcrossRestart, "FIRST_RUNTIME_GONE");
pass("global submit lease: simultaneous route runs and service-worker restart admit exactly one attempt");
