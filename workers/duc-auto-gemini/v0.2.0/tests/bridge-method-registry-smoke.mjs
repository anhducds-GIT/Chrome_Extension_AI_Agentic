import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.join(here, "..", "bridge-core.js");
await import(pathToFileURL(sourcePath));
const bridge = globalThis.DacBridgeCore;

const expectedMethods = [
  "session.hello", "system.ping", "system.capabilities", "queue.list",
  "run.status", "ledger.read", "jobs.add", "jobs.update", "jobs.remove",
  "jobs.reorder", "output.configure", "run_settings.configure", "queue.propose", "queue.proposal.get", "run.trial"
];
assert.deepEqual(Object.keys(bridge.METHOD_REGISTRY), expectedMethods);
assert(Object.isFrozen(bridge.METHOD_REGISTRY));
assert.equal(Object.getPrototypeOf(bridge.METHOD_REGISTRY), null, "the registry cannot inherit callable Object.prototype names");
assert.equal(Object.getPrototypeOf(bridge.ERROR_DEFINITIONS), null, "the error registry cannot inherit Object.prototype names either");
assert.equal(bridge.ERROR_DEFINITIONS.INTERNAL_ERROR.retryable, false, "unexpected RPC failures have a stable non-leaking error policy");
for (const method of expectedMethods) {
  const entry = bridge.METHOD_REGISTRY[method];
  assert(Object.isFrozen(entry), `${method} metadata is immutable`);
  assert.equal(entry.name, method);
  assert(["router", "executor"].includes(entry.context));
  assert.equal(entry.requires_executor, entry.context === "executor");
  assert.equal(typeof entry.read_only, "boolean");
  assert(["none", "owner_click"].includes(entry.approval));
  assert.equal(typeof entry.params_validator, "function");
  assert.equal(typeof entry.result_serializer, "function");
  assert.equal(typeof entry.capability_description, "string");
  assert([10000, 30000].includes(entry.deadline_ms));
}
assert.equal(bridge.METHOD_REGISTRY["queue.propose"].read_only, false);
assert.equal(bridge.METHOD_REGISTRY["queue.propose"].approval, "owner_click");
assert.equal(bridge.METHOD_REGISTRY["queue.propose"].idempotent, true);
assert(expectedMethods.filter((name) => name !== "queue.propose").every((name) => bridge.METHOD_REGISTRY[name].idempotent === false));

const capabilities = bridge.capabilities();
assert(Object.isFrozen(capabilities));
assert.deepEqual(capabilities.protocol_versions, [1]);
assert.equal(capabilities.executor_model, "side_panel_only");
assert.equal(capabilities.auto_execute, false);
assert.deepEqual(capabilities.prohibited_methods, ["run.start", "run.pause", "run.resume"]);
assert.deepEqual(capabilities.methods.map((entry) => entry.name), expectedMethods);
assert.equal(capabilities.limits.max_envelope_bytes, 1048576);
assert.equal(capabilities.limits.max_jobs_per_proposal, 100);
assert.equal(capabilities.limits.max_page_size, 100);
assert.deepEqual(capabilities.failure_types, bridge.FAILURE_TYPES);
assert.deepEqual(capabilities.features, ["proposal_inbox", "immutable_result_checkpoints", "audit_chain", "verified_persistence"]);
for (const prohibited of bridge.POLICY.prohibited_methods) {
  assert.equal(bridge.METHOD_REGISTRY[prohibited], undefined);
  assert.equal(capabilities.methods.some((entry) => entry.name === prohibited), false);
  assert.throws(() => bridge.requireMethod(prohibited), (error) => error.code === "METHOD_NOT_FOUND");
}

const validByMethod = {
  "session.hello": { supported_versions: [1] },
  "system.ping": {},
  "system.capabilities": {},
  "queue.list": { cursor: null, limit: 50, statuses: [], include_prompt: false },
  "run.status": {},
  "ledger.read": { cursor: null, limit: 50, include_prompt: false, include_removed: true },
  "jobs.add": { jobs: [{ prompt: "Create ...", reference_images: ["Duc1.jpg"], settings: { timeout_sec: 180 } }] },
  "jobs.update": { job_id: "Q001", prompt: "Updated", reference_images: [], settings: { max_retries: 3 } },
  "jobs.remove": { job_id: "Q001" },
  "jobs.reorder": { job_id: "Q001", position: 2 },
  "output.configure": { image_pattern: "{job_id}", collision_policy: "uniquify", save_images: true },
  "run_settings.configure": { timeout_sec: 240, delay_min_sec: 12, delay_max_sec: 24, safety_cooldown_sec: "6-9", continue_on_error: true },
  "queue.propose": {
    if_ledger_etag: "sha256:ledger-etag",
    proposal_label: "Character batch 2026-08-23",
    jobs: [{
      client_job_id: "agent-001",
      requested_job_id: "Q012",
      prompt: "Create ...",
      reference_images: ["Duc1.jpg", "Meo1.png"],
      settings: { timeout_sec: 180, max_retries: 2, safety_cooldown_sec: "6-9", output_folder: "Duc Auto ChatGPT" }
    }]
  },
  "queue.proposal.get": { proposal_id: "proposal-uuid" },
  "run.trial": { job_ids: ["P09-01", "P09-02"], timeout_sec: 90, delay_sec: 25 }
};
for (const [method, params] of Object.entries(validByMethod)) {
  assert.doesNotThrow(() => bridge.validateParams(method, params), `${method} accepts its v1 fixture`);
}

const invalidByMethod = {
  "session.hello": { supported_versions: [] },
  "system.ping": { wake_run: true },
  "system.capabilities": { include_hidden: true },
  "queue.list": { limit: 101 },
  "run.status": { pause: true },
  "ledger.read": { include_removed: "yes" },
  "jobs.add": { jobs: [] },
  "jobs.update": { job_id: "Q001" },
  "jobs.remove": { job_id: "" },
  "jobs.reorder": { job_id: "Q001", position: 0 },
  "output.configure": { collision_policy: "replace" },
  "run_settings.configure": { delay_min_sec: 25, delay_max_sec: 12 },
  "queue.propose": { if_ledger_etag: "etag", jobs: [] },
  "queue.proposal.get": { proposal_id: "" },
  "run.trial": { job_ids: [] }
};
for (const [method, params] of Object.entries(invalidByMethod)) {
  assert.throws(() => bridge.validateParams(method, params), (error) => error.code === "INVALID_PARAMS", `${method} rejects invalid schema input`);
}
assert.throws(() => bridge.validateParams("queue.propose", {
  ...validByMethod["queue.propose"],
  jobs: [
    validByMethod["queue.propose"].jobs[0],
    { ...validByMethod["queue.propose"].jobs[0], requested_job_id: "Q013" }
  ]
}), (error) => error.code === "INVALID_PARAMS" && error.details.issue.includes("client_job_id"));
assert.throws(() => bridge.validateParams("queue.propose", {
  ...validByMethod["queue.propose"],
  jobs: [{ ...validByMethod["queue.propose"].jobs[0], reference_images: ["../Duc1.jpg"] }]
}), (error) => error.code === "INVALID_PARAMS");
assert.throws(() => bridge.validateParams("queue.propose", {
  ...validByMethod["queue.propose"],
  jobs: [{ ...validByMethod["queue.propose"].jobs[0], settings: { arbitrary_setting: true } }]
}), (error) => error.code === "INVALID_PARAMS");

const source = fs.readFileSync(sourcePath, "utf8");
const exportConvention = /\(typeof window !== "undefined" \? window : globalThis\)\.DacBridgeCore = \{/;
assert.match(source, exportConvention, "classic worker/script-tag/Node global export convention is preserved");
const sourceWithoutRequiredExport = source.replace(exportConvention, "DacBridgeCore = {");
const forbiddenApiReferences = [
  /chrome\s*\./, /\bwindow\b/, /\bdocument\b/, /\bnavigator\b/,
  /\bfetch\s*\(/, /\bXMLHttpRequest\b/, /\bWebSocket\b/, /\bEventSource\b/,
  /\bshowDirectoryPicker\b/, /\bshowOpenFilePicker\b/, /\bFileSystem(?:File|Directory)Handle\b/,
  /\bindexedDB\b/, /\bFileReader\b/, /\bcreateWritable\b/, /\bgetFileHandle\b/,
  /["']node:/, /\brequire\s*\(/, /\bprocess\s*\./, /\bBuffer\s*\./,
  /\binnerHTML\b/, /\bouterHTML\b/, /\binsertAdjacentHTML\b/
];
for (const pattern of forbiddenApiReferences) assert.doesNotMatch(sourceWithoutRequiredExport, pattern, `bridge core purity forbids ${pattern}`);
assert.doesNotMatch(source, /\bimport\s+(?:\(|[^;])/m, "bridge core has no module import and remains importScripts-compatible");
assert.match(source, /globalThis\.crypto\.subtle/);
assert.doesNotMatch(source, /function\s+(?:sha256|sha_?256)|const\s+(?:sha256|sha_?256)\s*=/i, "SHA-256 is supplied only by WebCrypto");

console.log("bridge method registry smoke tests: PASS");
