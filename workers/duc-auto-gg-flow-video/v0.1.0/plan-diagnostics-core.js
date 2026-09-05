(() => {
  "use strict";

  const normalise = (value) => String(value || "").trim().toLowerCase();
  const fileName = (file) => String(file?.fileName || file?.name || "").trim();
  const makeFinding = (code, severity, scope, values = {}) => ({
    code, severity, scope,
    job_ids: values.job_ids || [],
    missing_items: values.missing_items || [],
    message: values.message || code,
    guidance: values.guidance || "",
    action: values.action || ""
  });

  function matchesForToken(runner, files, token) {
    const key = normalise(token);
    const aliasMatches = files.filter((file) => key && normalise(file.alias) === key);
    const exactMatches = /\.(avif|gif|jpe?g|png|webp)$/i.test(key)
      ? files.filter((file) => normalise(fileName(file)) === key)
      : [];
    const baseMatches = files.filter((file) => runner.basename(fileName(file)) === runner.basename(token));
    return aliasMatches.length ? aliasMatches : exactMatches.length ? exactMatches : baseMatches;
  }

  function analyze({ workbook, files = [], overrides = {}, outputCheck, chatCheck, runner, output, configFindings = [], outputProfileState = null }) {
    const findings = [...configFindings];
    const physicalJobs = Array.isArray(workbook?.jobs) ? workbook.jobs.filter(Boolean) : [];
    const xlsx = globalThis.DacXlsx || globalThis.window?.DacXlsx;
    const validJobs = xlsx?.activeJobs ? xlsx.activeJobs(physicalJobs) : physicalJobs.filter((job) => !/^(true|1|yes)$/i.test(String(job?.queue_removed || "").trim()));
    if (!workbook) {
      findings.push(makeFinding("WORKBOOK_NOT_LOADED", "BLOCKER", "workbook", {
        message: "No workbook loaded.", guidance: "Load a valid XLSX plan first.", action: "Load workbook"
      }));
      return result(findings, { required: 0, available: 0, missing: 0 });
    }
    if (!validJobs.length) {
      findings.push(makeFinding("WORKBOOK_NO_JOBS", "BLOCKER", "workbook", {
        message: "Workbook contains no runnable jobs.", guidance: "Add at least one job with an ID and prompt.", action: "Fix workbook"
      }));
    }
    const malformed = validJobs.filter((job) => !String(job.id || "").trim() || !String(job.prompt || "").trim());
    if (malformed.length) {
      findings.push(makeFinding("MALFORMED_JOBS", "BLOCKER", "workbook", {
        job_ids: malformed.map((job) => String(job.id || "(missing ID)")),
        message: `${malformed.length} job${malformed.length === 1 ? " is" : "s are"} missing an ID or prompt.`,
        guidance: "Every runnable row needs a job ID and prompt.", action: "Fix workbook"
      }));
    }
    if (validJobs.length && !malformed.length) findings.push(makeFinding("WORKBOOK_OK", "OK", "workbook", {
      message: `${validJobs.length} job${validJobs.length === 1 ? "" : "s"} parsed.`, guidance: "Workbook structure is ready."
    }));

    let settings = null;
    try {
      settings = runner.runtimeConfig(workbook.config, overrides);
      findings.push(makeFinding("RUN_SETTINGS_OK", "OK", "settings", {
        message: `Timeout ${settings.timeout_sec}s · retries ${settings.max_retries} · cooldown ${settings.safety_cooldown_sec}s.`, guidance: "Run settings are valid."
      }));
    } catch (error) {
      findings.push(makeFinding("RUN_SETTINGS_INVALID", "BLOCKER", "settings", {
        message: error.message, guidance: "Correct the invalid run setting and check again.", action: "Fix run settings"
      }));
    }

    const aliases = new Map();
    for (const file of files) {
      const alias = normalise(file.alias);
      if (!alias) continue;
      aliases.set(alias, [...(aliases.get(alias) || []), fileName(file)]);
    }
    const duplicateAliases = [...aliases.entries()].filter(([, names]) => names.length > 1);
    if (duplicateAliases.length) {
      findings.push(makeFinding("DUPLICATE_ALIASES", "BLOCKER", "references", {
        missing_items: duplicateAliases.flatMap(([alias, names]) => [`${alias}: ${names.join(", ")}`]),
        message: `${duplicateAliases.length} duplicate reference alias${duplicateAliases.length === 1 ? "" : "es"}.`,
        guidance: "Give each selected reference a unique alias or remove the duplicate.", action: "Fix reference aliases"
      }));
    }

    const requiredKeys = new Set();
    const usedFiles = new Set();
    const missing = [];
    const ambiguous = [];
    const duplicates = [];
    const maxViolations = [];
    for (const job of validJobs.filter((job) => String(job.id || "").trim() && String(job.prompt || "").trim())) {
      const requested = runner.referenceTokens(job);
      if (settings && requested.length > settings.max_input_images) maxViolations.push({ job, requested });
      const seenInJob = new Set();
      for (const token of requested) {
        const key = normalise(token);
        if (seenInJob.has(key)) duplicates.push({ job, token });
        seenInJob.add(key);
        requiredKeys.add(`${job.id}:${key}`);
        const matches = matchesForToken(runner, files, token);
        if (!matches.length) missing.push({ job, token });
        else if (matches.length > 1) ambiguous.push({ job, token, matches });
        else usedFiles.add(fileName(matches[0]));
      }
    }
    if (maxViolations.length) findings.push(makeFinding("MAX_INPUT_IMAGES", "BLOCKER", "references", {
      job_ids: maxViolations.map(({ job }) => job.id),
      missing_items: maxViolations.map(({ job, requested }) => `${job.id}: ${requested.length} requested`),
      message: `${maxViolations.length} job${maxViolations.length === 1 ? " exceeds" : "s exceed"} the maximum reference count.`,
      guidance: "Reduce requested references or raise Max input references within the allowed limit.", action: "Fix reference count"
    }));
    if (duplicates.length) findings.push(makeFinding("DUPLICATE_REFERENCE", "BLOCKER", "references", {
      job_ids: [...new Set(duplicates.map(({ job }) => job.id))],
      missing_items: duplicates.map(({ job, token }) => `${job.id}: ${token}`),
      message: `${duplicates.length} repeated reference request${duplicates.length === 1 ? "" : "s"}.`,
      guidance: "A job must not resolve the same reference more than once.", action: "Fix workbook references"
    }));
    if (missing.length) findings.push(makeFinding("MISSING_REFERENCES", "BLOCKER", "references", {
      job_ids: [...new Set(missing.map(({ job }) => job.id))],
      missing_items: [...new Set(missing.map(({ token }) => token))],
      message: `${missing.length} required reference${missing.length === 1 ? " is" : "s are"} missing.`,
      guidance: `Missing: ${[...new Set(missing.map(({ token }) => token))].join(", ")}. Required by: ${[...new Set(missing.map(({ job }) => job.id))].join(", ")}.`, action: "Add reference images"
    }));
    if (ambiguous.length) findings.push(makeFinding("AMBIGUOUS_REFERENCES", "BLOCKER", "references", {
      job_ids: [...new Set(ambiguous.map(({ job }) => job.id))],
      missing_items: ambiguous.map(({ job, token, matches }) => `${job.id}: ${token} → ${matches.map(fileName).join(", ")}`),
      message: `${ambiguous.length} reference match${ambiguous.length === 1 ? " is" : "es are"} ambiguous.`,
      guidance: "Use a unique filename or alias for each required reference.", action: "Fix reference aliases"
    }));
    const requirementCount = requiredKeys.size;
    const resolvedRequirements = Math.max(0, requirementCount - missing.length - ambiguous.length);
    if (!requirementCount) findings.push(makeFinding("REFERENCES_OPTIONAL", "OK", "references", {
      message: "0 required.", guidance: "This workbook does not require reference images."
    }));
    else if (!missing.length && !ambiguous.length && !duplicates.length && !maxViolations.length && !duplicateAliases.length) findings.push(makeFinding("REFERENCES_OK", "OK", "references", {
      message: `${resolvedRequirements} / ${requirementCount} requirements resolved · ${files.length} files selected.`, guidance: "All required reference images resolve uniquely."
    }));
    const extras = files.filter((file) => !usedFiles.has(fileName(file))).map(fileName);
    if (extras.length) findings.push(makeFinding("UNUSED_REFERENCES", "WARNING", "references", {
      missing_items: extras, message: `${extras.length} selected reference${extras.length === 1 ? " is" : "s are"} unused.`, guidance: "Unused files will not be attached to any job.", action: "Review references"
    }));

    if (outputProfileState?.state === "unbound") findings.push(makeFinding("OUTPUT_PROFILE_UNBOUND", "BLOCKER", "output", {
      message: `Output profile '${outputProfileState.profile_id || "(missing)"}' is not bound.`, guidance: `Authorize a folder once for output profile '${outputProfileState.profile_id || "this profile"}'.`, action: "Choose Folder"
    }));
    if (outputProfileState?.state === "permission_required") findings.push(makeFinding("OUTPUT_PERMISSION_REQUIRED", "BLOCKER", "output", {
      message: "Output profile permission is required.", guidance: "Re-authorize the profile folder before Run.", action: "Re-authorize Folder"
    }));
    if (outputProfileState?.state === "unavailable") findings.push(makeFinding("OUTPUT_PROFILE_UNAVAILABLE", "BLOCKER", "output", {
      message: "Output profile is unavailable.", guidance: "Choose and bind the profile folder again.", action: "Choose Folder"
    }));
    if (!outputCheck) findings.push(makeFinding("OUTPUT_DESTINATION_MISSING", "BLOCKER", "output", {
      message: "No writable output destination selected.", guidance: "Choose Chrome Downloads or authorize an output folder.", action: "Choose output destination"
    }));
    else if (!outputCheck.ok) findings.push(makeFinding(outputCheck.missingDestination ? "OUTPUT_DESTINATION_MISSING" : outputCheck.namingInvalid ? "OUTPUT_NAMING_INVALID" : "OUTPUT_PREFLIGHT_FAILED", "BLOCKER", "output", {
      message: outputCheck.error || "Output destination is not writable.", guidance: "Choose or re-authorize the output destination, then check again.", action: "Choose output destination"
    }));
    else {
      try {
        const values = output.effective(outputCheck.settings || outputCheck.outputSettings || {});
        findings.push(makeFinding("OUTPUT_OK", "OK", "output", {
          message: `Destination ready · images ${values.saveImages ? "on" : "off"}, XLSX ${values.saveResultXlsx ? "on" : "off"}, audit ${values.saveAuditJsonl ? "on" : "off"}.`, guidance: "Output naming and write permission are valid."
        }));
        // "overwrite" silently destroys the previous file for any job that
        // runs again with the same name -- including a workbook that carries
        // this setting from its own saved config, not something the operator
        // just chose. It is a legitimate policy, so it stays a WARNING (Run
        // is not blocked), but it must be an explicit, visible line in Check
        // Plan rather than three words inside the Naming detail string.
        if (values.collisionPolicy === "overwrite") findings.push(makeFinding("OUTPUT_COLLISION_OVERWRITE_ACTIVE", "WARNING", "output", {
          message: "Collision policy is 'overwrite': a job that runs again will replace its previous saved image.",
          guidance: "Chọn 'Keep both — add number' trong Naming nếu muốn giữ ảnh cũ, hoặc để nguyên nếu bạn thực sự muốn đè.", action: "Review naming settings"
        }));
      } catch (_) {
        findings.push(makeFinding("OUTPUT_OK", "OK", "output", { message: "Output destination and naming are ready.", guidance: "Output preflight passed." }));
      }
    }
    if (outputCheck?.auditChain && !outputCheck.auditChain.ok) findings.push(makeFinding(outputCheck.auditChain.code, "BLOCKER", "output", {
      message: outputCheck.auditChain.message,
      guidance: outputCheck.auditChain.guidance,
      action: "Continue with new audit segment"
    }));

    if (!chatCheck?.ok) findings.push(makeFinding(chatCheck?.code || "CHATGPT_NOT_CONNECTED", "BLOCKER", "chatgpt", {
      message: chatCheck?.message || "Open a Google Flow project tab and make it the active tab.", guidance: chatCheck?.guidance || "Open or activate a Flow project tab, then retry Check Plan.", action: "Retry Check Plan"
    }));
    else findings.push(makeFinding("CHATGPT_OK", "OK", "chatgpt", { message: "Connected and idle.", guidance: "Composer receiver is reachable." }));
    return result(findings, { selected_files: files.length, unique_required_references: new Set([...requiredKeys].map((key) => key.split(":").slice(1).join(":"))).size, requirement_count: requirementCount, resolved_requirements: resolvedRequirements, missing_requirements: missing.length, affected_jobs: [...new Set([...missing, ...ambiguous].map(({ job }) => job.id))], required: requirementCount, available: resolvedRequirements, missing: missing.length, ambiguous: ambiguous.length });
  }

  function result(findings, references) {
    const blockers = findings.filter((finding) => finding.severity === "BLOCKER");
    const warnings = findings.filter((finding) => finding.severity === "WARNING");
    const oks = findings.filter((finding) => finding.severity === "OK");
    return { findings, blockers, warnings, oks, references, summary: { blockers: blockers.length, warnings: warnings.length, ok: oks.length } };
  }

  (typeof window !== "undefined" ? window : globalThis).DacPlanDiagnostics = { analyze, makeFinding, matchesForToken };
})();
