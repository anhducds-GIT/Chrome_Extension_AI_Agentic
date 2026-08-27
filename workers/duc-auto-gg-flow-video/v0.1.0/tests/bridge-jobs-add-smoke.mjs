import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
await import(pathToFileURL(path.join(here, "..", "bridge-core.js")));
await import(pathToFileURL(path.join(here, "..", "bridge-proposal-core.js")));
await import(pathToFileURL(path.join(here, "..", "approval-persistence-core.js")));
const bridge = globalThis.DacBridgeCore;
const sidepanel = fs.readFileSync(path.join(here, "..", "sidepanel.js"), "utf8");
const entry = bridge.METHOD_REGISTRY["jobs.add"];
assert.equal(entry.approval, "none");
assert.equal(entry.context, "executor");
assert.equal(entry.read_only, false);
assert.doesNotThrow(() => bridge.validateParams("jobs.add", { jobs: [{ prompt: "Create", reference_images: [], settings: { timeout_sec: 180 } }] }));
assert(globalThis.DacBridgeProposalCore.approvalLockReason({ running: true }).length > 0);
const handler = sidepanel.slice(sidepanel.indexOf("async function bridgeJobsAdd"), sidepanel.indexOf("async function bridgeJobsUpdate"));
assert.match(handler, /executeBridgeDirectMutation/);
assert.match(handler, /event: "BRIDGE_JOB_ADDED_DIRECT"/);
assert.match(handler, /workbookRequired: false/);
const mutation = sidepanel.slice(sidepanel.indexOf("async function applyBridgeJobsAdd"), sidepanel.indexOf("function applyQueueJobUpdate"));
assert.match(mutation, /DacXlsx\.createWorkbook/);
assert.match(mutation, /DacXlsx\.addJobsBatch/);
assert.doesNotMatch(mutation, /\brun\s*\(/);
const transaction = sidepanel.slice(sidepanel.indexOf("async function executeBridgeDirectMutation"), sidepanel.indexOf("async function bridgeJobsAdd"));
assert.equal((transaction.match(/state\.auditEvents\.push\(auditEvent\)/g) || []).length, 1);
assert.equal((transaction.match(/persistLedgerCandidate\(/g) || []).length, 1);
let audits = 0;
let checkpoints = 0;
await globalThis.DacApprovalPersistence.execute({
  snapshot: async () => ({}),
  apply: async () => { audits += 1; return {}; },
  persist_audit: async () => "audit",
  persist_checkpoint: async () => { checkpoints += 1; return "v01"; },
  commit: async () => true,
  rollback: async () => {}
});
assert.equal(audits, 1);
assert.equal(checkpoints, 1);
console.log("bridge jobs.add smoke tests: PASS");

