(() => {
  "use strict";

  const severityRank = { OK: 0, WARNING: 1, BLOCKER: 2 };
  const normaliseSeverity = (value) => ["OK", "WARNING", "BLOCKER"].includes(value) ? value : "BLOCKER";
  const findingsFor = (diagnostics, predicate) => (diagnostics?.findings || []).filter(predicate);
  const strongest = (findings, fallback = "BLOCKER") => findings.length
    ? findings.reduce((current, finding) => severityRank[normaliseSeverity(finding.severity)] > severityRank[current] ? normaliseSeverity(finding.severity) : current, "OK")
    : fallback;
  const compactFinding = (finding) => ({ code: finding.code, scope: finding.scope, job_ids: finding.job_ids || [], missing_items: finding.missing_items || [], message: finding.message, guidance: finding.guidance, action: finding.action });

  function checklist({ workbook, prepared, diagnostics, outputSettings, output, settings }) {
    const sections = [];
    const add = (id, label, findings, fallback, detail) => sections.push({ id, label, severity: strongest(findings, fallback), detail, findings: findings.map(compactFinding) });
    const workbookFindings = findingsFor(diagnostics, (finding) => finding.scope === "workbook");
    const malformed = workbookFindings.filter((finding) => finding.code === "MALFORMED_JOBS");
    add("workbook", "Workbook", workbookFindings, workbook ? "OK" : "BLOCKER", workbook ? `${workbook.fileName || "Workbook loaded"}` : "Not loaded");
    add("jobs", "Jobs", malformed, workbook ? (malformed.length ? "BLOCKER" : "OK") : "BLOCKER", workbook ? `${workbook.jobs?.length || 0} total${prepared ? ` · ${prepared.queue.filter((item) => !item.skipped).length} eligible` : " · eligibility pending"}` : "No workbook");
    const referenceFindings = findingsFor(diagnostics, (finding) => finding.scope === "references");
    const references = diagnostics?.references;
    add("references", "References", referenceFindings.filter((finding) => finding.severity !== "OK"), workbook ? (references?.missing || references?.ambiguous ? "BLOCKER" : diagnostics ? "OK" : "WARNING") : "BLOCKER", references ? (!references.required ? "0 required" : references.missing ? `${references.missing} missing` : references.ambiguous ? `${references.ambiguous} ambiguous` : `${references.available} / ${references.required} available`) : "Check plan");
    const outputFindings = findingsFor(diagnostics, (finding) => finding.scope === "output");
    const values = safeOutput(outputSettings, output);
    add("output", "Output destination", outputFindings.filter((finding) => finding.severity !== "OK"), outputSettings ? (diagnostics ? "OK" : "WARNING") : "BLOCKER", values ? output.locationLabel(values.image) : "Not selected");
    add("save_modes", "Save modes", [], values ? "OK" : outputSettings ? "WARNING" : "BLOCKER", values ? `images ${values.saveImages ? "on" : "off"} · XLSX ${values.saveResultXlsx ? "on" : "off"} · audit ${values.saveAuditJsonl ? "on" : "off"}` : "Check output configuration");
    add("naming", "Naming", outputFindings.filter((finding) => /NAMING|FILENAME|PATTERN|OUTPUT_PREFLIGHT_FAILED/.test(finding.code)), values ? "OK" : outputSettings ? "WARNING" : "BLOCKER", values ? `${values.imagePattern} · ${values.collisionPolicy}` : "Check output configuration");
    const settingsFindings = findingsFor(diagnostics, (finding) => finding.scope === "settings");
    const effectiveSettings = prepared?.settings || settings;
    add("settings", "Run settings", settingsFindings.filter((finding) => finding.severity !== "OK"), effectiveSettings ? "OK" : workbook ? "WARNING" : "BLOCKER", effectiveSettings ? `timeout ${effectiveSettings.timeout_sec}s · retries ${effectiveSettings.max_retries} · cooldown ${effectiveSettings.safety_cooldown_sec}s` : "Check plan");
    const chatFindings = findingsFor(diagnostics, (finding) => finding.scope === "chatgpt");
    add("chatgpt", "ChatGPT connection", chatFindings.filter((finding) => finding.severity !== "OK"), diagnostics ? (chatFindings.some((finding) => finding.code === "CHATGPT_OK") ? "OK" : "BLOCKER") : "WARNING", chatFindings.find((finding) => finding.code === "CHATGPT_OK")?.message || chatFindings[0]?.message || "Check plan");
    return sections;
  }

  function safeOutput(outputSettings, output) {
    try { return outputSettings && output ? output.effective(outputSettings) : null; } catch (_) { return null; }
  }

  function packet({ workbook, prepared, diagnostics, outputSettings, output, settings }) {
    const values = safeOutput(outputSettings, output);
    const references = diagnostics?.references || {};
    const missingReferenceFinding = findingsFor(diagnostics, (finding) => finding.code === "MISSING_REFERENCES")[0];
    const ambiguousReferenceFinding = findingsFor(diagnostics, (finding) => finding.code === "AMBIGUOUS_REFERENCES")[0];
    const effectiveSettings = prepared?.settings || settings || null;
    const queue = prepared?.queue || [];
    const chatOk = Boolean(findingsFor(diagnostics, (finding) => finding.code === "CHATGPT_OK").length);
    const destination = values?.image?.kind === "directory" ? "authorized_directory" : values?.image?.kind === "downloads" ? "downloads" : null;
    const reviewRequired = !diagnostics && workbook ? [compactFinding({
      code: "PLAN_CHECK_REQUIRED", scope: "plan", job_ids: [], missing_items: [],
      message: "Configuration changed after the last local Check Plan.",
      guidance: "Run Check Plan again before requesting GO.", action: "Check plan"
    })] : [];
    return {
      protocol: "DAC_ORCHESTRATOR_REVIEW_V1",
      workbook: { name: workbook?.fileName || null },
      jobs: {
        total: Array.isArray(workbook?.jobs) ? workbook.jobs.length : 0,
        eligible: prepared ? queue.filter((item) => !item.skipped).length : null,
        pending: prepared ? queue.filter((item) => item.status === "PENDING").length : null
      },
      references: {
        required_count: Number(references.required || 0),
        resolved_count: Number(references.available || 0),
        missing: [...new Set([...(missingReferenceFinding?.missing_items || []), ...(ambiguousReferenceFinding?.missing_items || [])])],
        affected_jobs: [...new Set([...(missingReferenceFinding?.job_ids || []), ...(ambiguousReferenceFinding?.job_ids || [])])]
      },
      output: {
        destination,
        label: values?.image?.kind === "directory" ? (values.image.handleName || null) : (values?.image?.folder || null),
        save_images: values?.saveImages ?? null,
        save_result_xlsx: values?.saveResultXlsx ?? null,
        save_audit_jsonl: values?.saveAuditJsonl ?? null
      },
      naming: { image_pattern: values?.imagePattern || null, collision: values?.collisionPolicy || null },
      settings: {
        timeout_sec: effectiveSettings?.timeout_sec ?? null,
        cooldown_sec: effectiveSettings?.safety_cooldown_sec ?? null,
        max_retries: effectiveSettings?.max_retries ?? null,
        max_refs: effectiveSettings?.max_input_images ?? null
      },
      chatgpt: { connected: diagnostics ? chatOk : null, ready: diagnostics ? chatOk : null },
      blockers: (diagnostics?.blockers || []).map(compactFinding),
      warnings: [...(diagnostics?.warnings || []).map(compactFinding), ...reviewRequired]
    };
  }

  function copyPayload(values) {
    return [
      "DAC Orchestrator review request:",
      "Review the packet below and return GO or FIX.",
      "If FIX, list the exact blockers/warnings and their guidance.",
      "Do not invent facts not present in the packet.",
      "",
      JSON.stringify(packet(values), null, 2)
    ].join("\n");
  }

  (typeof window !== "undefined" ? window : globalThis).DacOrchestratorReview = { checklist, packet, copyPayload };
})();
