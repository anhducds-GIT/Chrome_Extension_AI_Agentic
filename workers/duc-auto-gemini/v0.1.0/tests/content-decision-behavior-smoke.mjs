import { assert, load, pass } from "./test-helpers.mjs";
const Core = await load(new URL("../content-decision-core.js", import.meta.url), "DagContentDecisionCore");
async function exposure({ initial = null, trigger = {}, menu = {}, waits = [] } = {}) {
  let clicks = 0; let index = 0;
  const ports = { queryInput: () => initial, findTrigger: () => trigger, findMenuItem: () => menu, click: () => { clicks += 1; }, waitInput: async () => waits[index++] || null };
  try { return { input: await Core.exposeFileInput(ports), clicks }; } catch (error) { return { error: error.message, clicks }; }
}
assert.deepEqual(await exposure({ initial: { id: "input" } }), { input: { id: "input" }, clicks: 0 });
assert.deepEqual(await exposure({ waits: [{ id: "lazy-input" }] }), { input: { id: "lazy-input" }, clicks: 1 }, "trigger exposes lazy input");
assert.deepEqual(await exposure({ waits: [null, { id: "menu-input" }] }), { input: { id: "menu-input" }, clicks: 2 }, "menu item exposes input after trigger");
assert.deepEqual(await exposure({ menu: null, waits: [null] }), { error: "UPLOAD_MENU_ITEM_MISSING", clicks: 1 });
assert.deepEqual(await exposure({ waits: [null, null] }), { error: "FILE_INPUT_NOT_EXPOSED", clicks: 2 });
assert.equal(Core.attachmentReady(2, 3, { after: 5, busy: false }), true);
assert.equal(Core.attachmentReady(2, 3, { after: 5, busy: true }), false, "busy upload is not ready");
assert.equal(Core.attachmentReady(2, 3, { after: 4, busy: false }), false, "missing preview is not ready");
assert.equal(Core.sendReady({ found: false }), false); assert.equal(Core.sendReady({ found: true, disabled: true }), false); assert.equal(Core.sendReady({ found: true, ariaDisabled: "true" }), false); assert.equal(Core.sendReady({ found: true }), true);
for (const blocker of ["SECURITY_BLOCKER", "QUOTA_LIMIT", "POLICY_BLOCK"]) { let clicks = 0; await assert.rejects(Core.guardedAction({ security: blocker === "SECURITY_BLOCKER" ? blocker : null, quota: blocker === "SECURITY_BLOCKER" ? null : blocker }, () => { clicks += 1; }), new RegExp(blocker)); assert.equal(clicks, 0, `${blocker} must prevent Send click`); assert.equal(Core.sendReady({ found: true, security: blocker === "SECURITY_BLOCKER" ? blocker : null, quota: blocker === "SECURITY_BLOCKER" ? null : blocker }), false); }
pass("content decisions: lazy input, previews, disabled Send and blockers execute fail-closed");
