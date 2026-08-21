(() => {
  "use strict";
  const SUPPORTED = new Set([
    "timeout_sec", "max_retries", "delay_min_sec", "delay_max_sec", "delay_sec", "safety_cooldown_sec", "max_input_images", "continue_on_error", "rerun_done", "output_folder",
    "output_destination_mode", "output_downloads_subfolder", "output_profile_id", "image_filename_pattern", "collision_policy", "save_images", "save_result_xlsx", "save_audit_jsonl",
    "separate_result_destination", "result_destination_mode", "result_downloads_subfolder", "result_output_profile_id", "result_filename", "result_filename_pattern", "audit_filename", "output_folder_hint", "run_id",
    "checkpoint_version", "checkpoint_filename", "checkpoint_created_at", "previous_checkpoint_filename",
    "effective_source_workbook", "effective_image_output", "effective_result_xlsx", "effective_image_naming", "effective_collision_policy", "effective_save_images", "effective_save_result_xlsx", "effective_save_audit_jsonl", "effective_audit_log", "effective_timeout_sec", "effective_max_retries", "effective_safety_cooldown_sec", "effective_max_input_images", "effective_continue_on_error", "effective_rerun_done"
  ]);
  const slug = /^[a-z0-9][a-z0-9-]{0,63}$/;
  const safeJobId = /^[A-Za-z0-9._-]{1,100}$/;
  const finding = (code, severity, scope, message, guidance, extras = {}) => ({ code, severity, scope, job_ids: extras.job_ids || [], missing_items: extras.missing_items || [], message, guidance, action: extras.action || "Fix XLSX config" });
  const bool = (value) => /^(true|false|1|0|yes|no)$/i.test(String(value).trim());
  const asBool = (value) => /^(true|1|yes)$/i.test(String(value).trim());

  function validate(config = {}, jobs = [], runner, output) {
    const findings = [];
    const raw = { ...config };
    for (const key of Object.keys(raw)) if (!SUPPORTED.has(key)) findings.push(finding("UNKNOWN_CONFIG_KEY", "WARNING", "settings", `Unknown XLSX config key '${key}'.`, "Remove it or use a DAC_XLSX_RUN_PLAN_V1 key."));
    const runtimeRaw = Object.fromEntries([...SUPPORTED].filter((key) => key in raw && ["timeout_sec", "max_retries", "delay_min_sec", "delay_max_sec", "delay_sec", "safety_cooldown_sec", "max_input_images", "continue_on_error", "rerun_done", "output_folder"].includes(key)).map((key) => [key, raw[key]]));
    let runtime = null;
    try { runtime = runner.runtimeConfig(runtimeRaw, {}); } catch (error) { findings.push(finding("INVALID_RUN_CONFIG", "BLOCKER", "settings", error.message, "Correct the named XLSX config value.")); }
    const mode = String(raw.output_destination_mode || "downloads").trim().toLowerCase();
    if (!['downloads', 'profile'].includes(mode)) findings.push(finding("INVALID_OUTPUT_DESTINATION_MODE", "BLOCKER", "output", `output_destination_mode '${raw.output_destination_mode}' is invalid.`, "Use downloads or profile."));
    const downloadFolder = raw.output_downloads_subfolder ?? raw.output_folder ?? "Duc Auto ChatGPT";
    if (mode === "downloads") try { output.safeRelativeFolder(downloadFolder); } catch (error) { findings.push(finding("INVALID_OUTPUT_SUBFOLDER", "BLOCKER", "output", error.message, "Use a safe relative Downloads subfolder without '..' or an absolute path.")); }
    const profileId = String(raw.output_profile_id || "").trim();
    if (mode === "profile" && !slug.test(profileId)) findings.push(finding("INVALID_OUTPUT_PROFILE_ID", "BLOCKER", "output", "output_profile_id must be a stable lowercase slug.", "Use a value such as pilot-04; it is a logical ID, not a filesystem path."));
    const collision = String(raw.collision_policy || "uniquify").trim().toLowerCase();
    if (!["overwrite", "uniquify", "fail"].includes(collision)) findings.push(finding("INVALID_COLLISION_POLICY", "BLOCKER", "output", "collision_policy must be overwrite, uniquify, or fail.", "Choose one supported collision policy."));
    for (const key of ["save_images", "save_result_xlsx", "save_audit_jsonl", "separate_result_destination"]) if (raw[key] !== undefined && !bool(raw[key])) findings.push(finding("INVALID_BOOLEAN", "BLOCKER", "output", `${key} must be true or false.`, "Use true or false in the config sheet."));
    const separate = asBool(raw.separate_result_destination);
    const resultMode = String(raw.result_destination_mode || "downloads").trim().toLowerCase();
    if (separate && !["downloads", "profile"].includes(resultMode)) findings.push(finding("INVALID_RESULT_DESTINATION_MODE", "BLOCKER", "output", "result_destination_mode must be downloads or profile.", "Choose one supported destination mode."));
    if (separate && resultMode === "downloads") try { output.safeRelativeFolder(raw.result_downloads_subfolder || downloadFolder); } catch (error) { findings.push(finding("INVALID_RESULT_SUBFOLDER", "BLOCKER", "output", error.message, "Use a safe relative Downloads subfolder.")); }
    if (separate && resultMode === "profile" && !slug.test(String(raw.result_output_profile_id || "").trim())) findings.push(finding("INVALID_RESULT_PROFILE_ID", "BLOCKER", "output", "result_output_profile_id must be a stable lowercase slug.", "Use a value such as pilot-04-results."));
    try { output.validateImagePattern(raw.image_filename_pattern || "{job_id}"); } catch (error) { findings.push(finding("INVALID_IMAGE_PATTERN", "BLOCKER", "output", error.message, "Use only {job_id}, {attempt}, and {index}.")); }
    try { output.validateResultFilenamePattern(raw.result_filename_pattern || raw.result_filename || output.baseResultFilenamePattern("workbook.xlsx"), output.baseResultFilenamePattern("workbook.xlsx")); } catch (error) { findings.push(finding("INVALID_RESULT_FILENAME_PATTERN", "BLOCKER", "output", error.message, "Use a safe XLSX leaf filename and only the optional {version} token.")); }
    try { output.safeFileLeaf(raw.audit_filename || output.baseAuditName("workbook.xlsx"), output.baseAuditName("workbook.xlsx")); } catch (error) { findings.push(finding("INVALID_AUDIT_FILENAME", "BLOCKER", "output", error.message, "Use a safe JSONL leaf filename.")); }
    const ids = new Set();
    for (const job of jobs || []) {
      const id = String(job.id || "").trim();
      if (!id || !safeJobId.test(id) || id.includes("..")) findings.push(finding("INVALID_JOB_ID", "BLOCKER", "workbook", `Job ID '${id || "(blank)"}' is not filename-safe.`, "Use a unique ID with letters, numbers, dot, underscore, or hyphen.", { job_ids: [id || "(blank)"] }));
      if (id && ids.has(id.toLowerCase())) findings.push(finding("DUPLICATE_JOB_ID", "BLOCKER", "workbook", `Job ID '${id}' is duplicated.`, "Use unique job IDs.", { job_ids: [id] }));
      ids.add(id.toLowerCase());
    }
    const effective = {
      runtime,
      output: {
        mode: mode === "profile" ? "profile" : "downloads", downloadsSubfolder: String(downloadFolder), profileId,
        imagePattern: raw.image_filename_pattern || "{job_id}", collisionPolicy: collision,
        saveImages: raw.save_images === undefined ? true : asBool(raw.save_images), saveResultXlsx: raw.save_result_xlsx === undefined ? true : asBool(raw.save_result_xlsx), saveAuditJsonl: raw.save_audit_jsonl === undefined ? true : asBool(raw.save_audit_jsonl),
        separateResultDestination: separate, resultMode: resultMode === "profile" ? "profile" : "downloads", resultDownloadsSubfolder: String(raw.result_downloads_subfolder || downloadFolder), resultProfileId: String(raw.result_output_profile_id || ""), resultFilenamePattern: raw.result_filename_pattern || raw.result_filename || "", auditFilename: raw.audit_filename || "", folderHint: String(raw.output_folder_hint || "").trim(), runId: String(raw.run_id || "")
      }
    };
    return { raw, effective, findings, supported_keys: [...SUPPORTED] };
  }
  (typeof window !== "undefined" ? window : globalThis).DacXlsxRunPlan = { SUPPORTED, validate };
})();
