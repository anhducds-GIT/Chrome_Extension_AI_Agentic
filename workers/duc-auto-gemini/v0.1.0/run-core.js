(() => {
  "use strict";
  const DEFAULTS = Object.freeze({ timeout_sec: 240, max_retries: 1, max_input_images: 5, continue_on_error: true, delay_min_sec: 8, delay_max_sec: 15, output_folder: "Duc Auto Gemini" });

  function bool(value, fallback) {
    if (value === "" || value == null) return fallback;
    if (typeof value === "boolean") return value;
    if (/^(true|1|yes)$/i.test(String(value).trim())) return true;
    if (/^(false|0|no)$/i.test(String(value).trim())) return false;
    throw new Error(`Invalid boolean value '${value}'.`);
  }
  function integer(value, fallback, min, max, name) {
    if (value === "" || value == null) return fallback;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new Error(`${name} must be an integer from ${min} to ${max}.`);
    return parsed;
  }
  function settings(config = {}, overrides = {}) {
    const source = { ...config, ...Object.fromEntries(Object.entries(overrides).filter(([, value]) => value !== "" && value != null)) };
    const result = {
      timeout_sec: integer(source.timeout_sec, DEFAULTS.timeout_sec, 15, 900, "timeout_sec"),
      max_retries: integer(source.max_retries, DEFAULTS.max_retries, 0, 5, "max_retries"),
      max_input_images: integer(source.max_input_images, DEFAULTS.max_input_images, 0, 10, "max_input_images"),
      continue_on_error: bool(source.continue_on_error, DEFAULTS.continue_on_error),
      delay_min_sec: integer(source.delay_min_sec, DEFAULTS.delay_min_sec, 0, 120, "delay_min_sec"),
      delay_max_sec: integer(source.delay_max_sec, DEFAULTS.delay_max_sec, 0, 120, "delay_max_sec"),
      output_folder: String(source.output_folder || DEFAULTS.output_folder).trim()
    };
    if (result.delay_min_sec > result.delay_max_sec) throw new Error("delay_min_sec cannot exceed delay_max_sec.");
    return Object.freeze(result);
  }
  function referenceTokens(job) {
    return String(job.reference_images || job.reference_image || "").split("|").map((value) => value.trim()).filter(Boolean);
  }
  function resolveReferences(job, files, max) {
    const tokens = referenceTokens(job);
    if (tokens.length > max) throw new Error(`Job ${job.id} has ${tokens.length} references; maximum is ${max}.`);
    const byExact = new Map(); const byBase = new Map();
    for (const file of files || []) {
      const exact = String(file.alias || file.name || file.fileName || "").toLowerCase();
      if (exact) { if (byExact.has(exact)) throw new Error(`Duplicate reference alias '${exact}'.`); byExact.set(exact, file); }
      const base = String(file.name || file.fileName || "").replace(/\.[^.]+$/, "").toLowerCase();
      if (base) { if (!byBase.has(base)) byBase.set(base, []); byBase.get(base).push(file); }
    }
    return tokens.map((token) => {
      const key = token.toLowerCase();
      if (byExact.has(key)) return byExact.get(key);
      const base = key.replace(/\.[^.]+$/, ""); const matches = byBase.get(base) || [];
      if (matches.length === 1) return matches[0];
      if (matches.length > 1) throw new Error(`Reference '${token}' is ambiguous.`);
      throw new Error(`Reference '${token}' was not selected.`);
    });
  }
  function prepare(workbook, files = [], overrides = {}) {
    const effective = settings(workbook.config || {}, overrides);
    const seen = new Set();
    const queue = (workbook.jobs || []).map((job, index) => {
      const id = String(job.id || "").trim(); const prompt = String(job.prompt || "").trim();
      if (!id || !prompt) throw new Error(`Row ${index + 2} requires id and prompt.`);
      const key = id.toLowerCase(); if (seen.has(key)) throw new Error(`Duplicate job id '${id}'.`); seen.add(key);
      return { job: { ...job, id, prompt }, index, references: resolveReferences(job, files, effective.max_input_images), phase: "PENDING", retry_count: 0, result_file: "", failure_type: "", last_error: "" };
    });
    if (!queue.length) throw new Error("Workbook has no jobs.");
    return Object.freeze({ settings: effective, queue });
  }
  function select(queue, mode = "pending") {
    if (mode === "all") return queue.filter((item) => item.phase !== "RUNNING");
    if (mode === "failed") return queue.filter((item) => /^FAILED|OWNER_REVIEW|INTERRUPTED/.test(item.phase));
    return queue.filter((item) => item.phase === "PENDING" || item.phase === "FAILED_PRE_SUBMIT");
  }
  function nextAttemptId(runId, jobId, serial) { return `${runId}:${jobId}:a${String(serial).padStart(3, "0")}`; }
  function checkpoint(runId, sourceFile, queue, extra = {}) {
    return { schema: "dag.checkpoint.v1", run_id: runId, source_file: sourceFile, updated_at: new Date().toISOString(), queue: queue.map((item) => ({ job_id: item.job.id, phase: item.phase, retry_count: item.retry_count, attempt_id: item.attempt_id || "", result_file: item.result_file || "", failure_type: item.failure_type || "", last_error: item.last_error || "" })), ...extra };
  }
  function restore(queue, saved) {
    if (!saved || saved.schema !== "dag.checkpoint.v1") throw new Error("CHECKPOINT_INVALID");
    const byId = new Map(saved.queue.map((item) => [item.job_id, item]));
    return queue.map((item) => {
      const prior = byId.get(item.job.id); if (!prior) return item;
      return { ...item, ...prior, job: item.job, references: item.references };
    });
  }
  function auditEvent(type, item, values = {}) {
    return { schema: "dag.audit.v1", event: type, at: new Date().toISOString(), run_id: values.run_id || "", job_id: item?.job?.id || values.job_id || "", attempt_id: item?.attempt_id || values.attempt_id || "", phase: item?.phase || values.phase || "", prompt_hash: globalThis.DagProviderCore?.shortHash(item?.job?.prompt || "") || "", reference_names: (item?.references || []).map((ref) => ref.alias || ref.name || ref.fileName), ...values };
  }
  globalThis.DagRunCore = Object.freeze({ DEFAULTS, settings, referenceTokens, resolveReferences, prepare, select, nextAttemptId, checkpoint, restore, auditEvent });
})();
