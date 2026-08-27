import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { FakeDOMParser, FakeXMLSerializer } from "./xlsx-test-utils.mjs";

const root = new URL("../", import.meta.url);
const context = vm.createContext({ window: {}, globalThis: {}, TextEncoder, TextDecoder, DOMParser: FakeDOMParser, XMLSerializer: FakeXMLSerializer, console });
context.globalThis = context;
for (const file of ["xlsx-codec.js", "runner-core.js"]) vm.runInContext(fs.readFileSync(new URL(file, root), "utf8"), context);
const xlsx = context.window.DacXlsx;
const runner = context.window.DacRunnerCore;

const workbook = xlsx.createWorkbook("Bridge.xlsx", [{ id: "Q001", prompt: "existing" }]);
const fields = {
  input_origin: "bridge",
  bridge_protocol_version: "1",
  bridge_transport: "loopback_ws",
  bridge_proposal_id: "proposal-001",
  bridge_request_id: "request-001",
  bridge_client_id: "codex-local",
  bridge_client_job_id: "agent-001",
  bridge_received_at: "2026-08-23T10:00:00.000Z",
  bridge_approved_at: "2026-08-23T10:01:00.000Z",
  bridge_prompt_sha256: "sha256:prompt",
  bridge_payload_sha256: "sha256:payload"
};
const [added] = xlsx.addJobsBatch(workbook, [{ id: "Q002", prompt: "approved", reference_images: "", queue_position: "2", queue_removed: "false", ...fields }]);
for (const [key, value] of Object.entries(fields)) assert.equal(added[key], value, `${key} is persisted on the bridge-origin ledger row`);
const prepared = runner.prepare(workbook, []);
assert.equal(prepared.queue.find((item) => item.job.id === "Q002").job.bridge_proposal_id, "proposal-001", "prepare/retry selection preserves additive bridge provenance");

const jobsXml = new TextDecoder().decode(workbook.entries.get(workbook.jobsPath));
for (const key of Object.keys(fields)) assert.match(jobsXml, new RegExp(`<t>${key}</t>`), `${key} exists as a physical XLSX header`);
assert.match(jobsXml, /<t>proposal-001<\/t>/);
assert.match(jobsXml, /<t>sha256:payload<\/t>/);

const sidepanel = fs.readFileSync(new URL("sidepanel.js", root), "utf8");
const audit = sidepanel.slice(sidepanel.indexOf("function audit("), sidepanel.indexOf("function nextTask"));
for (const field of ["input_origin", "bridge_proposal_id", "bridge_request_id", "bridge_client_id", "bridge_client_job_id", "bridge_approved_at", "bridge_payload_sha256"]) {
  assert.match(audit, new RegExp(field), `normal run audit events retain ${field} for bridge rows`);
}
const duplicate = sidepanel.slice(sidepanel.indexOf("async function duplicateQueueJob"), sidepanel.indexOf("async function moveQueueJob"));
assert.match(duplicate, /source\.input_origin === "bridge"/);
assert.match(duplicate, /copiedInputs\.input_origin = "operator_duplicate"/);
assert.match(duplicate, /copiedInputs\.source_bridge_proposal_id = source\.bridge_proposal_id/);
assert.doesNotMatch(duplicate, /copiedInputs\.bridge_proposal_id\s*=/, "a manual duplicate never impersonates the original bridge row");

console.log("bridge provenance smoke tests: PASS");
