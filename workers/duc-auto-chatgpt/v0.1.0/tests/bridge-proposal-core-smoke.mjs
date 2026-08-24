import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
await import(pathToFileURL(path.join(here, "..", "bridge-core.js")));
await import(pathToFileURL(path.join(here, "..", "bridge-proposal-core.js")));
const bridge = globalThis.DacBridgeCore;
const proposals = globalThis.DacBridgeProposalCore;

const workbook = {
  fileName: "Duc-Prompts.xlsx",
  config: { run_id: "run-001", checkpoint_version: "4" },
  jobs: [
    { id: "Q001", prompt: "old", status: "SUCCESS", _row: { browser: true } },
    { id: "manual-A", prompt: "pending", queue_removed: "true" }
  ]
};
const etag = await proposals.ledgerEtag(workbook, bridge.hashCanonical);
assert.match(etag, /^sha256:/);
assert.equal(etag, await proposals.ledgerEtag({ ...workbook, jobs: workbook.jobs.map((job) => ({ ...job, _row: "different browser object" })) }, bridge.hashCanonical), "DOM row identity cannot affect a ledger etag");
assert.notEqual(etag, await proposals.ledgerEtag({ ...workbook, jobs: [{ ...workbook.jobs[0], status: "FAILED" }, workbook.jobs[1]] }, bridge.hashCanonical), "physical ledger state changes the etag");
const sanitized = proposals.sanitizeLedgerJob({
  id: "Q001", prompt: "Prompt may mention C:\\art\\style.png as text.",
  result_file: "C:\\Users\\Duc\\Pictures\\Q001.png",
  effective_result_xlsx: "C:\\Users\\Duc\\Runs\\Run-v001.xlsx",
  reference_images: "C:\\private\\Duc1.jpg|Meo1.png",
  pairing_token: "secret", _row: { private: true }
});
assert.equal(sanitized.result_file, "Q001.png", "ledger reads expose artifact identity without an absolute local path");
assert.equal(sanitized.effective_result_xlsx, "[local value redacted]");
assert.equal(sanitized.reference_images, "Duc1.jpg|Meo1.png");
assert.equal(sanitized.prompt.includes("C:\\art"), true, "an explicitly requested prompt is content, not a filesystem capability");
assert.equal(Object.hasOwn(sanitized, "pairing_token"), false);
assert.equal(Object.hasOwn(sanitized, "_row"), false);

const params = bridge.validateParams("queue.propose", {
  if_ledger_etag: etag,
  proposal_label: "Character batch",
  jobs: [
    { client_job_id: "agent-001", requested_job_id: null, prompt: "Create Đức.", reference_images: ["Duc1.jpg"], settings: { timeout_sec: 180 } },
    { client_job_id: "agent-002", requested_job_id: "Agent-B", prompt: "Create Mèo.", reference_images: ["hero"], settings: { max_retries: 1, safety_cooldown_sec: "7-9", output_folder: "Agent Batch" } }
  ]
});
const preview = proposals.buildPreview({
  params,
  ledger_etag: etag,
  existing_jobs: workbook.jobs,
  available_references: [{ fileName: "Duc1.jpg", alias: "" }, { fileName: "Meo1.png", alias: "hero" }],
  default_settings: { timeout_sec: 120, max_retries: 2, safety_cooldown_sec: "6-9", output_folder: "Duc Auto ChatGPT" },
  max_input_images: 5
});
assert.deepEqual(preview.map((job) => job.job_id), ["Q002", "Agent-B"], "unrequested IDs use the Quick Prompt Q### collision rule and requested IDs remain exact");
assert.deepEqual(preview[0].settings, { timeout_sec: 180, max_retries: 2, safety_cooldown_sec: "6-9", output_folder: "Duc Auto ChatGPT" }, "preview shows every effective setting, not only supplied overrides");
assert.deepEqual(preview[1].reference_images, ["hero"], "the exact alias remains visible to the owner");

assert.throws(() => proposals.buildPreview({ ...{
  params: { ...params, if_ledger_etag: "stale" }, ledger_etag: etag, existing_jobs: workbook.jobs,
  available_references: [], default_settings: {}, max_input_images: 5
} }), (error) => error.code === "PROPOSAL_CONFLICT" && error.details.current_ledger_etag === etag);
assert.throws(() => proposals.assignFinalIds([{ client_job_id: "x", requested_job_id: "Q001", prompt: "x" }], workbook.jobs), (error) => error.code === "VALIDATION_FAILED");

const request = {
  method: "queue.propose",
  request_id: "request-agent-0001",
  client: { client_id: "duc-codex-local", name: "Codex", version: "1.0.0" }
};
const record = await proposals.createRecord({
  params, preview, request, ledger_etag: etag,
  now: new Date("2026-08-23T10:00:00.000Z"),
  random_uuid: () => "00000000-0000-4000-8000-000000000001",
  hash_canonical: bridge.hashCanonical,
  hash_text: bridge.hashText
});
assert.equal(record.proposal_id, "proposal-00000000-0000-4000-8000-000000000001");
assert.equal(record.status, "AWAITING_OWNER_APPROVAL");
assert.equal(record.expires_at, "2026-08-24T10:00:00.000Z");
assert.deepEqual(record.local_events, [{ event: "BRIDGE_PROPOSAL_RECEIVED", timestamp: "2026-08-23T10:00:00.000Z" }]);
assert.equal(record.jobs[0].prompt, "Create Đức.");
assert.match(record.jobs[0].bridge_prompt_sha256, /^sha256:/);
assert.notEqual(record.jobs[0].bridge_prompt_sha256, record.jobs[0].bridge_payload_sha256);

const replay = proposals.findByIdempotency([record], request.client.client_id, request.request_id);
assert.equal(replay.proposal_id, record.proposal_id, "response-loss retry finds the original proposal record");
assert.equal(proposals.publicRecord(record).preview[0].prompt, "Create Đức.");

const approved = proposals.transition(record, "APPROVED_CHECKPOINTED", {
  approved_at: "2026-08-23T10:05:00.000Z",
  checkpoint: { version: 5, filename: "Run__results__v005.xlsx" },
  ledger_etag: "sha256:new"
}, new Date("2026-08-23T10:05:00.000Z"));
assert.equal(Object.hasOwn(approved.jobs[0], "prompt"), false, "terminal proposal storage removes full prompt text");
assert.equal(Object.hasOwn(approved.jobs[0], "reference_images"), false, "terminal proposal storage retains hashes and IDs, not reference content");
assert.equal(Object.hasOwn(approved.jobs[0], "settings"), false, "terminal proposal storage retains hashes and IDs, not execution settings");
assert.equal(approved.jobs[0].bridge_prompt_sha256, record.jobs[0].bridge_prompt_sha256, "redaction keeps cryptographic provenance");
assert.equal(proposals.publicRecord(approved).preview[0].prompt, undefined);

const fields = proposals.bridgeFields(record, record.jobs[0], "2026-08-23T10:05:00.000Z");
assert.deepEqual(Object.keys(fields), proposals.PROVENANCE_FIELDS);
assert.equal(fields.input_origin, "bridge");
assert.equal(fields.bridge_transport, "loopback_ws");
assert.equal(fields.bridge_client_job_id, "agent-001");

const expired = proposals.maintainRecords([record], new Date("2026-08-24T10:00:00.001Z"));
assert.equal(expired[0].status, "EXPIRED");
assert.equal(expired[0].local_events.at(-1).event, "BRIDGE_PROPOSAL_EXPIRED");
assert.equal(Object.hasOwn(expired[0].jobs[0], "prompt"), false, "expiry redacts prompt text");
assert.throws(() => proposals.assertCapacity(Array.from({ length: 20 }, (_value, index) => ({ ...record, proposal_id: `p-${index}` })), 1), (error) => error.code === "VALIDATION_FAILED");
assert.throws(() => proposals.assertCapacity([{ ...record, jobs: Array.from({ length: 100 }, () => record.jobs[0]) }], 1), (error) => error.code === "VALIDATION_FAILED");

assert.equal(proposals.approvalLockReason({ running: true }).includes("lượt chạy"), true);
assert.equal(proposals.approvalLockReason({ audit_gap: true }).includes("audit"), true);
assert.equal(proposals.approvalLockReason({}), "");

const page1 = proposals.page([1, 2, 3], null, 2);
assert.deepEqual(page1, { values: [1, 2], next_cursor: "offset:2" });
assert.deepEqual(proposals.page([1, 2, 3], page1.next_cursor, 2), { values: [3], next_cursor: null });

const serialize = proposals.createSerialExecutor();
const concurrentStore = [];
const stage = (id, delayMs) => serialize(async () => {
  const snapshot = [...concurrentStore];
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  snapshot.push(id);
  concurrentStore.splice(0, concurrentStore.length, ...snapshot);
});
await Promise.all([stage("proposal-a", 10), stage("proposal-b", 0)]);
assert.deepEqual(concurrentStore, ["proposal-a", "proposal-b"], "serialized proposal-store mutations cannot lose either concurrent acceptance");
await assert.rejects(() => serialize(null), /function/, "an invalid operation does not poison the serial queue");
await serialize(async () => concurrentStore.push("proposal-c"));
assert.deepEqual(concurrentStore, ["proposal-a", "proposal-b", "proposal-c"]);

console.log("bridge proposal core smoke tests: PASS");
