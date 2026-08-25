import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const context = { console, structuredClone };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL("../bridge-proposal-core.js", import.meta.url), "utf8"), context);
const proposals = context.DacBridgeProposalCore;
const record = {
  proposal_id: "proposal-1", status: "AWAITING_OWNER_APPROVAL", client: { client_id: "agent-a" },
  received_at: "2026-08-25T00:00:00.000Z", updated_at: "2026-08-25T00:00:00.000Z",
  local_events: [], jobs: [{ job_id: "J-1", client_job_id: "C-1", bridge_prompt_sha256: "sha", bridge_payload_sha256: "sha" }]
};
const withdrawn = proposals.transition(record, "WITHDRAWN", { withdrawn_at: "2026-08-25T01:00:00.000Z" }, new Date("2026-08-25T01:00:00.000Z"));
assert.equal(withdrawn.status, "WITHDRAWN");
assert.equal(proposals.TERMINAL_STATUSES.has("WITHDRAWN"), true);
assert.equal(proposals.WITHDRAWABLE_STATUSES.has("AWAITING_OWNER_APPROVAL"), true);
assert.equal(proposals.WITHDRAWABLE_STATUSES.has("APPROVING"), false, "an in-flight owner approval cannot be withdrawn concurrently");
assert.equal(withdrawn.local_events.at(-1).event, "BRIDGE_PROPOSAL_WITHDRAWN");
assert.equal(proposals.publicRecord(withdrawn).withdrawn_at, "2026-08-25T01:00:00.000Z");

const source = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");
const start = source.indexOf("async function bridgeProposalWithdraw");
const end = source.indexOf("function withBridgeErrors", start);
const handler = source.slice(start, end);
assert.match(handler, /record\.client\?\.client_id !== call\.request\.client\.client_id/);
assert.match(handler, /BridgeProtocolError\("FORBIDDEN"/);
assert.match(handler, /WITHDRAWABLE_STATUSES\.has\(record\.status\)/);
assert.match(handler, /transition\(record, "WITHDRAWN"/);
assert.match(handler, /delete store\.replays\[record\.idempotency_key\]/);
assert.match(source, /WITHDRAWN: "Agent đã rút đề xuất"/);

console.log("bridge proposal withdraw smoke tests: PASS");
