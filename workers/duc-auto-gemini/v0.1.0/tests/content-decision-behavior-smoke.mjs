import { assert, load, pass } from "./test-helpers.mjs";
const Core = await load(new URL("../content-decision-core.js", import.meta.url), "DagContentDecisionCore");
async function exposure({ initial = null, trigger = {}, menu = {}, waits = [], snapshots = [] } = {}) {
  let clicks = 0; let index = 0; let snapshotIndex = 0;
  const ports = { queryInput: () => initial, findTrigger: () => trigger, findMenuItem: () => menu, click: () => { clicks += 1; }, snapshot: () => snapshots[snapshotIndex++] || {}, waitInput: async () => { const value = waits[index++] || null; if (value instanceof Error) throw value; return value; } };
  try { return { input: await Core.exposeFileInput(ports), clicks }; } catch (error) { return { error: error.message, clicks }; }
}
assert.deepEqual(await exposure({ initial: { id: "input" } }), { input: { id: "input" }, clicks: 0 });
assert.deepEqual(await exposure({ waits: [{ id: "lazy-input" }] }), { input: { id: "lazy-input" }, clicks: 1 }, "trigger exposes lazy input");
assert.deepEqual(await exposure({ waits: [null, { id: "menu-input" }] }), { input: { id: "menu-input" }, clicks: 2 }, "menu item exposes input after trigger");
assert.deepEqual(await exposure({ menu: null, waits: [null] }), { error: "UPLOAD_MENU_ITEM_MISSING", clicks: 1 });
assert.deepEqual(await exposure({ waits: [null, null] }), { error: "FILE_INPUT_NOT_EXPOSED", clicks: 2 });
assert.deepEqual(await exposure({ snapshots: [{ security: "SECURITY_BLOCKER" }] }), { error: "SECURITY_BLOCKER", clicks: 0 }, "blocker before exposure prevents trigger click");
assert.deepEqual(await exposure({ waits: [new Error("SECURITY_BLOCKER")] }), { error: "SECURITY_BLOCKER", clicks: 1 }, "blocker during first wait prevents menu click");
assert.deepEqual(await exposure({ waits: [new Error("ABORTED_BY_OPERATOR")] }), { error: "ABORTED_BY_OPERATOR", clicks: 1 }, "abort during first wait prevents menu click");
assert.deepEqual(await exposure({ waits: [null, { id: "normal-timeout-menu" }] }), { input: { id: "normal-timeout-menu" }, clicks: 2 }, "ordinary first timeout may proceed to menu");
assert.deepEqual(await exposure({ waits: [null, new Error("QUOTA_LIMIT")] }), { error: "QUOTA_LIMIT", clicks: 2 }, "blocker during second wait propagates unchanged");
assert.deepEqual(await exposure({ waits: [null], snapshots: [{}, { abortRequested: true }] }), { error: "ABORTED_BY_OPERATOR", clicks: 1 }, "abort before menu prevents second click");
assert.equal(Core.attachmentReady(2, 3, { after: 5, busy: false }), true);
assert.equal(Core.attachmentReady(2, 3, { after: 5, busy: true }), false, "busy upload is not ready");
assert.equal(Core.attachmentReady(2, 3, { after: 4, busy: false }), false, "missing preview is not ready");
assert.equal(Core.sendReady({ found: false }), false); assert.equal(Core.sendReady({ found: true, disabled: true }), false); assert.equal(Core.sendReady({ found: true, ariaDisabled: "true" }), false); assert.equal(Core.sendReady({ found: true }), true);
for (const blocker of ["SECURITY_BLOCKER", "QUOTA_LIMIT", "POLICY_BLOCK"]) { let clicks = 0; await assert.rejects(Core.guardedAction({ security: blocker === "SECURITY_BLOCKER" ? blocker : null, quota: blocker === "SECURITY_BLOCKER" ? null : blocker }, () => { clicks += 1; }), new RegExp(blocker)); assert.equal(clicks, 0, `${blocker} must prevent Send click`); assert.equal(Core.sendReady({ found: true, security: blocker === "SECURITY_BLOCKER" ? blocker : null, quota: blocker === "SECURITY_BLOCKER" ? null : blocker }), false); }
let submittedPersisted = false; let stopAfterPersist = false; let sendClicks = 0;
submittedPersisted = true; stopAfterPersist = true;
await assert.rejects(Core.clickSend({ snapshot: () => ({ abortRequested: stopAfterPersist }), click: () => { sendClicks += 1; } }), /ABORTED_BY_OPERATOR/, "Stop after durable SUBMITTED persistence must prevent Send");
assert.equal(submittedPersisted, true); assert.equal(sendClicks, 0);
stopAfterPersist = false; await Core.clickSend({ snapshot: () => ({ abortRequested: stopAfterPersist }), click: () => { sendClicks += 1; } }); assert.equal(sendClicks, 1);
pass("content decisions: lazy input, previews, disabled Send and blockers execute fail-closed");
