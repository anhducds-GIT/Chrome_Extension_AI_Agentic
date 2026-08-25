import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const context = { console, structuredClone };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL("../bridge-proposal-core.js", import.meta.url), "utf8"), context);
const proposals = context.DacBridgeProposalCore;

const persistenceReason = proposals.approvalLockReason({ persistence_missing: true });
assert.match(persistenceReason, /bật lưu audit/i);
for (const flag of ["running", "reconciliation", "recreate", "audit_gap", "queue_mutation"]) {
  const reason = proposals.approvalLockReason({ [flag]: true, persistence_missing: true });
  assert.notEqual(reason, persistenceReason, `${flag} remains the higher-priority transient lock`);
}

const source = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");
const lock = source.slice(source.indexOf("function bridgeDirectLock"), source.indexOf("async function assertBridgeOutputBound"));
assert.match(lock, /const transient = flags\.running \|\| flags\.reconciliation \|\| flags\.recreate \|\| flags\.audit_gap \|\| flags\.queue_mutation/);
assert.match(lock, /flags\.persistence_missing && !transient && !flags\.workbook_missing \? "VALIDATION_FAILED" : "RUN_ACTIVE"/);
const attention = source.slice(source.indexOf("function bridgeAttentionFromError"), source.indexOf("function renderBridgeActivityFeed"));
assert.match(attention, /code === "VALIDATION_FAILED" && \/bật lưu audit\/i/);
assert.equal(/code === "RUN_ACTIVE" && \/bật lưu audit\/i/.test(attention), false);

console.log("bridge lock classification smoke tests: PASS");
