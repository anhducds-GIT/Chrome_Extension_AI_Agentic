(() => {
  "use strict";

  const text = (value) => String(value ?? "").trim();

  function missing(previousFilename) {
    const filename = text(previousFilename) || "recorded audit JSONL";
    return {
      ok: false,
      code: "RESUME_AUDIT_CHAIN_MISSING",
      previousFilename: filename,
      message: `Previous technical audit '${filename}' is unavailable or empty.`,
      guidance: "Result XLSX remains authoritative. Explicitly choose Continue with new audit segment to record the continuity gap; no historical audit data will be fabricated."
    };
  }
  function segmentMissing(segmentFilename) {
    const filename = text(segmentFilename) || "configured audit segment";
    return {
      ok: false,
      code: "RESUME_AUDIT_GAP_SEGMENT_MISSING",
      previousFilename: filename,
      message: `Acknowledged audit segment '${filename}' is unavailable or empty.`,
      guidance: "Restore the recorded new audit segment before continuing; its AUDIT_CHAIN_GAP event is required provenance."
    };
  }
  function inspect({ resumeMode = false, saveAuditJsonl = false, locationKind = "", previousFilename = "", prior = null, gapAcknowledged = false } = {}) {
    if (!resumeMode || !saveAuditJsonl || locationKind !== "directory") return { ok: true, applicable: false };
    if (gapAcknowledged) return { ok: true, applicable: true, gapAcknowledged: true, previousFilename: text(previousFilename) };
    if (!prior?.exists || Number(prior.size) <= 0) return missing(previousFilename);
    return { ok: true, applicable: true, previousFilename: text(previousFilename) };
  }
  function approveGap({ previousFilename = "", now = new Date().toISOString(), auditFilename = "" } = {}) {
    const missingFilename = text(previousFilename) || "recorded audit JSONL";
    const segmentFilename = text(auditFilename) || missingFilename;
    return {
      fields: {
        audit_chain_status: "GAP_ACKNOWLEDGED",
        audit_chain_missing_filename: missingFilename,
        audit_chain_acknowledged_at: text(now),
        audit_chain_segment_filename: segmentFilename
      },
      event: { event: "AUDIT_CHAIN_GAP", message: `Prior audit '${missingFilename}' was unavailable. Operator approved a new audit segment; historical audit data was not fabricated.` }
    };
  }
  function gapAcknowledged(config = {}) { return text(config.audit_chain_status).toUpperCase() === "GAP_ACKNOWLEDGED"; }

  (typeof window !== "undefined" ? window : globalThis).DacAuditChainCore = { missing, segmentMissing, inspect, approveGap, gapAcknowledged };
})();
