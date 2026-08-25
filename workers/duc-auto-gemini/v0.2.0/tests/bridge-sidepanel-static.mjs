import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = new URL("../", import.meta.url);
const sidepanel = fs.readFileSync(new URL("sidepanel.js", root), "utf8");
const html = fs.readFileSync(new URL("sidepanel.html", root), "utf8");
const css = fs.readFileSync(new URL("sidepanel.css", root), "utf8");

for (const id of [
  "bridgeProposalCard", "bridgeProposalCount", "bridgeProposalStatus", "bridgeProposalMeta",
  "bridgeProposalList", "bridgeProposalNotice", "bridgeProposalLockReason", "bridgeProposalFixtureBtn",
  "bridgeProposalRejectBtn", "bridgeProposalApproveBtn"
]) assert.match(html, new RegExp(`id="${id}"`), `${id} exists in the side panel`);
assert.match(html, />ĐỀ XUẤT TỪ AGENT</);
assert.match(html, /id="bridgeProposalRejectBtn"[^>]*>Từ chối</);
assert.match(html, /id="bridgeProposalApproveBtn"[^>]*>Duyệt &amp; ghi checkpoint</);
assert.match(html, /id="bridgeProposalFixtureBtn"[^>]*>Nạp đề xuất thử</);
assert.match(html, /Duyệt chỉ thêm[^<]*Queue[^<]*không bắt đầu chạy[^<]*không gửi prompt tới Gemini/);
const bridgeScreen = html.slice(html.indexOf('id="bridgeScreen"'), html.indexOf("<footer>"));
assert.match(bridgeScreen, /id="bridgeProposalCard"/, "proposal review moved into the dedicated BRIDGE screen");
assert.doesNotMatch(html.slice(html.indexOf('id="runScreen"'), html.indexOf('id="outputScreen"')), /id="bridgeProposalCard"/, "proposal review no longer occupies the RUN screen");

const scriptOrder = ["bridge-core.js", "bridge-proposal-core.js", "approval-persistence-core.js", "sidepanel.js"]
  .map((name) => html.indexOf(`src="${name}"`));
assert(scriptOrder.every((index) => index > -1));
assert.deepEqual(scriptOrder, [...scriptOrder].sort((left, right) => left - right), "bridge cores load before the side-panel executor");

assert.match(sidepanel, /const BRIDGE_EXECUTOR_PORT = "dac\.bridge\.executor\.v1"/);
assert.match(sidepanel, /crypto\.randomUUID\(\)/, "each side-panel document announces a random executor epoch");
assert.match(sidepanel, /DAC_BRIDGE_EXECUTOR_READY[\s\S]*?executor_epoch: state\.bridgeExecutorEpoch/, "the named Port announces the document epoch");
assert.match(sidepanel, /const bridgeExecutorDispatch = window\.DacBridgeCore\.createDispatcher/, "Port requests enter the full bridge dispatcher");
assert.match(sidepanel, /const envelope = wrapped \? message\.envelope : message;[\s\S]*?bridgeExecutorDispatch\(envelope, \{ executor_epoch: state\.bridgeExecutorEpoch \}\)/, "direct and routed Port envelopes both enter the full dispatcher, never a handler");
assert.match(sidepanel, /port\.onDisconnect\.addListener[\s\S]*?setTimeout\(\(\) => connectBridgeExecutor\(\), 1000\)/, "an open panel reconnects its executor Port after a worker restart");

const proposalHandler = sidepanel.slice(sidepanel.indexOf("async function bridgeQueuePropose"), sidepanel.indexOf("async function bridgeProposalGet"));
assert.match(proposalHandler, /assertCapacity/);
assert.match(proposalHandler, /findByIdempotency/);
assert.match(proposalHandler, /writeBridgeProposalStore/);
assert.match(proposalHandler, /serializeBridgeProposalStore\(async \(\) =>/, "the full proposal read-modify-write is serialized across distinct request IDs");
assert.doesNotMatch(proposalHandler, /DacXlsx\.addJob|DacXlsx\.addJobsBatch|saveLedger|persistLedgerCandidate|\brun\(/, "queue.propose only writes quarantine storage");
const fixture = sidepanel.slice(sidepanel.indexOf("async function stageBridgeFixture"), sidepanel.indexOf("async function replaceBridgeRecord"));
assert.match(fixture, /bridgeExecutorDispatch\(\{/, "the built-in fixture traverses the same validated in-memory executor");
assert.doesNotMatch(fixture, /DacXlsx\.addJob|DacXlsx\.addJobsBatch|await run\(/, "the fixture stages only and cannot mutate or run the queue");

const approval = sidepanel.slice(sidepanel.indexOf("async function approveBridgeProposal"), sidepanel.indexOf("function renderCurrentJobReferences"));
assert.match(approval, /DacApprovalPersistence\.execute/);
assert.ok(approval.indexOf("persist_audit:") < approval.indexOf("persist_checkpoint:"), "approval declares audit persistence before checkpoint persistence");
assert.ok(approval.indexOf("persist_checkpoint:") < approval.indexOf("commit:"), "workbook commit is declared only after checkpoint verification");
assert.match(approval, /window\.DacXlsx\.cloneWorkbook\(state\.workbook\)/, "approval mutates a disposable workbook candidate");
assert.match(approval, /window\.DacXlsx\.addJobsBatch\(candidate, rows\)/, "every proposal row is batch-added or none are");
assert.match(sidepanel, /function adoptBridgeCheckpoint[\s\S]*?state\.runSelection = new Set\(applied\.added_ids\)/, "approved rows become visible and pre-selected");
assert.match(sidepanel, /function adoptBridgeCheckpoint[\s\S]*?state\.validated = false/, "approval does not falsely claim the new queue passed live Run readiness");
assert.match(approval, /if \(checkpoint\)[\s\S]*?adoptBridgeCheckpoint\(applied, audit, checkpoint\)/, "a post-checkpoint failure recovers forward instead of restoring the old workbook");
assert.match(approval, /BRIDGE_PROPOSAL_POST_CHECKPOINT_RECOVERED/, "post-checkpoint recovery is recorded in canonical audit evidence");
assert.match(approval, /if \(postCheckpointRecovery\)[\s\S]*?markBridgeApprovalFailed/, "a verified checkpoint is never mislabeled APPROVAL_FAILED");
assert.match(approval, /state\.auditEvents = audit \? \[\] : snapshot\.auditEvents/, "persisted approval events are not buffered for a duplicate flush");
assert.doesNotMatch(approval, /await run\(|DAC_RUN_IMAGE_JOB|chrome\.tabs\.sendMessage/, "approval cannot start or submit a run");

for (const flag of ["running", "reconciliation", "recreate", "audit_gap", "queue_mutation"]) {
  assert.match(sidepanel, new RegExp(`${flag}:`), `approval wiring supplies the ${flag} operator lock`);
}
assert.match(sidepanel, /element\("div", "bridge-proposal-prompt", job\.prompt/, "full prompts render through textContent, not markup or hover UI");
assert.match(css, /\.bridge-proposal-prompt \{[^}]*max-height: none;[^}]*overflow: visible;[^}]*white-space: pre-wrap;/, "full proposal prompts are visible and preserve line breaks");
assert.doesNotMatch(css, /\.bridge-proposal-prompt \{[^}]*text-overflow: ellipsis/, "proposal prompts are never visually truncated");

// Exercise the same protocol/proposal cores through an injected in-memory
// executor. This catches the second-entry-path defect without needing Chrome.
await import(pathToFileURL(path.join(here, "..", "bridge-core.js")));
await import(pathToFileURL(path.join(here, "..", "bridge-proposal-core.js")));
const bridge = globalThis.DacBridgeCore;
const proposals = globalThis.DacBridgeProposalCore;
const records = [];
const replay = bridge.createMemoryReplayStore();
const etag = await proposals.ledgerEtag({ fileName: "in-memory.xlsx", config: {}, jobs: [] }, bridge.hashCanonical);
const dispatch = bridge.createDispatcher({
  replay_store: replay,
  handlers: {
    "queue.propose": async (params, call) => {
      const prior = proposals.findByIdempotency(records, call.request.client.client_id, call.request.request_id);
      if (prior) return proposals.publicRecord(prior);
      const preview = proposals.buildPreview({ params, ledger_etag: etag, existing_jobs: [], available_references: [], default_settings: { timeout_sec: 180, max_retries: 2, safety_cooldown_sec: "6-9", output_folder: "Duc Auto ChatGPT" }, max_input_images: 5 });
      const record = await proposals.createRecord({ params, preview, request: call.request, ledger_etag: etag, hash_canonical: bridge.hashCanonical, hash_text: bridge.hashText, random_uuid: () => "00000000-0000-4000-8000-000000000002" });
      records.push(record);
      return proposals.publicRecord(record);
    }
  }
});
const request = {
  protocol: bridge.PROTOCOL, version: 1, kind: "request", request_id: "request-memory-0001",
  method: "queue.propose", sent_at: "2026-08-23T10:00:00.000Z",
  client: { client_id: "test-agent", name: "Test Agent", version: "1" },
  params: { if_ledger_etag: etag, proposal_label: "memory", jobs: [{ client_job_id: "a", requested_job_id: null, prompt: "stage only", reference_images: [], settings: {} }] }
};
const staged = await dispatch(request);
const replayed = await dispatch({ ...request, sent_at: "2026-08-23T10:00:01.000Z" });
assert.equal(staged.ok, true);
assert.equal(staged.result.status, "AWAITING_OWNER_APPROVAL");
assert.deepEqual(replayed, staged);
assert.equal(records.length, 1, "response-loss replay cannot create a second proposal");
const malformed = await dispatch({ ...request, method: "constructor" });
assert.equal(malformed.ok, false);
assert.equal(malformed.error.code, "INVALID_ENVELOPE", "the in-memory executor validates its own Port input");

console.log("bridge side-panel static tests: PASS");
