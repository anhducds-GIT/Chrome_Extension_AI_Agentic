import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const context = vm.createContext({ console });
vm.runInContext(fs.readFileSync(new URL("audit-chain-core.js", root), "utf8"), context);
const auditChain = context.DacAuditChainCore;

const missing = auditChain.inspect({ resumeMode: true, saveAuditJsonl: true, locationKind: "directory", previousFilename: "Pilot-05__audit.jsonl", prior: { exists: false, size: 0 } });
assert.equal(missing.ok, false, "missing prior audit blocks Check Plan before recreate");
assert.equal(missing.code, "RESUME_AUDIT_CHAIN_MISSING");
assert.doesNotMatch(missing.message, /NotFoundError|DOMException/i, "raw directory errors never reach operator diagnostics");
const present = auditChain.inspect({ resumeMode: true, saveAuditJsonl: true, locationKind: "directory", previousFilename: "Pilot-05__audit.jsonl", prior: { exists: true, size: 23 } });
assert.equal(present.ok, true, "existing non-empty audit retains append behavior");
const approval = auditChain.approveGap({ previousFilename: "Pilot-05__audit.jsonl", auditFilename: "Pilot-05__audit.jsonl", now: "2026-08-21T05:00:00.000Z" });
assert.equal(approval.fields.audit_chain_status, "GAP_ACKNOWLEDGED", "gap requires explicit runner-owned provenance");
assert.equal(approval.fields.audit_chain_missing_filename, "Pilot-05__audit.jsonl");
assert.equal(approval.event.event, "AUDIT_CHAIN_GAP", "new segment begins with an explicit continuity-gap event");
assert.equal(auditChain.inspect({ resumeMode: true, saveAuditJsonl: true, locationKind: "directory", previousFilename: "Pilot-05__audit.jsonl", prior: { exists: false, size: 0 }, gapAcknowledged: true }).ok, true, "only explicit approval permits a new audit segment");
assert.equal(auditChain.segmentMissing("Pilot-05__audit.jsonl").code, "RESUME_AUDIT_GAP_SEGMENT_MISSING", "an acknowledged segment cannot silently disappear after reload");

console.log("audit chain core smoke tests: PASS");
