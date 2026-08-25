import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const context = { console, TextEncoder, crypto: globalThis.crypto, structuredClone };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL("../bridge-core.js", import.meta.url), "utf8"), context);
const core = context.DacBridgeCore;

const updates = Array.from({ length: 20 }, (_, index) => ({ job_id: `J-${index + 1}`, prompt: `Prompt ${index + 1}` }));
assert.equal(core.validateParams("jobs.update", { jobs: updates }).jobs.length, 20);
assert.throws(() => core.validateParams("jobs.update", { jobs: [...updates, { job_id: "J-21", prompt: "x" }] }), /1-20/);
assert.throws(() => core.validateParams("jobs.update", { jobs: [updates[0]], job_id: "J-X", prompt: "x" }), /choose either/);
assert.deepEqual(JSON.parse(JSON.stringify(core.validateParams("jobs.update", { job_id: "J-1", prompt: "single" }))), { job_id: "J-1", prompt: "single" });

assert.deepEqual(JSON.parse(JSON.stringify(core.validateParams("jobs.remove", { job_ids: ["J-1", "J-2"] }))), { job_ids: ["J-1", "J-2"] });
assert.throws(() => core.validateParams("jobs.remove", { job_ids: [...updates.map((item) => item.job_id), "J-21"] }), /1-20/);
assert.throws(() => core.validateParams("jobs.remove", { job_ids: ["J-1", "J-1"] }), /duplicate/);
assert.deepEqual(JSON.parse(JSON.stringify(core.validateParams("jobs.remove", { job_id: "J-1" }))), { job_id: "J-1" });

assert.deepEqual(JSON.parse(JSON.stringify(core.validateParams("jobs.reorder", { order: ["J-2", "J-1"] }))), { order: ["J-2", "J-1"] });
assert.throws(() => core.validateParams("jobs.reorder", { order: ["J-1", "J-1"] }), /duplicate/);
assert.deepEqual(JSON.parse(JSON.stringify(core.validateParams("jobs.reorder", { job_id: "J-1", position: 2 }))), { job_id: "J-1", position: 2 });

const source = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");
for (const [handlerName, batchApply] of [
  ["bridgeJobsUpdate", "applyQueueJobsUpdateBatch"],
  ["bridgeJobsRemove", "applyQueueJobsRemovalBatch"],
  ["bridgeJobsReorder", "applyQueueFullOrder"]
]) {
  const start = source.indexOf(`async function ${handlerName}`);
  const end = source.indexOf("\n  async function", start + 20);
  const handler = source.slice(start, end);
  assert.equal((handler.match(/executeBridgeDirectMutation\(/g) || []).length, 1, `${handlerName} uses one mutation transaction`);
  assert.match(handler, new RegExp(batchApply));
}
const fullOrder = source.slice(source.indexOf("function applyQueueFullOrder"), source.indexOf("async function refreshQueueAfterMutation"));
assert.match(fullOrder, /order\.length !== activeIds\.length/);
assert.match(fullOrder, /activeIds\.some\(\(id\) => !order\.includes\(id\)\)/);
assert.match(fullOrder, /!isQueueEditable\(item\)/);
assert.match(fullOrder, /DacXlsx\.setQueueOrder/);
for (const batchApply of ["applyQueueJobsUpdateBatch", "applyQueueJobsRemovalBatch", "applyQueueFullOrder"]) {
  const start = source.indexOf(`function ${batchApply}`);
  const end = source.indexOf("\n  function", start + 20);
  assert.match(source.slice(start, end), /job_ids:/, `${batchApply} reports all ids for one audit event`);
}

console.log("bridge batch mutation smoke tests: PASS");
