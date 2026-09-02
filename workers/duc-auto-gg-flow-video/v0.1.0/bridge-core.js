(() => {
  "use strict";

  const PROTOCOL = "duc-auto-chatgpt.bridge";
  const SUPPORTED_VERSIONS = Object.freeze([1]);
  const LIMITS = deepFreeze({
    max_envelope_bytes: 1024 * 1024,
    max_jobs_per_proposal: 100,
    max_page_size: 100,
    max_references_per_job: 10,
    max_references_per_add: 5,
    max_reference_data_url_bytes: 700 * 1024
  });
  const POLICY = deepFreeze({
    executor_model: "side_panel_only",
    auto_execute: false,
    prohibited_methods: ["run.start", "run.pause", "run.resume"]
  });
  const FAILURE_TYPES = Object.freeze([
    "TIMEOUT_PRE_SUBMIT", "TIMEOUT_AFTER_SUBMIT", "POST_SUBMIT_UNCERTAIN",
    "READINESS_TIMEOUT_AFTER_SAVE", "OUTPUT_AMBIGUOUS", "ATTACHMENT_FAILED",
    "DOWNLOAD_FAILED", "PERSISTENCE_VERIFICATION_FAILED", "VALIDATION_FAILED",
    "RECEIVER_LOST", "SECURITY_HARD_STOP", "GENERATION_LIMIT_REACHED",
    "USER_STOP", "ATTEMPT_ID_MISMATCH", "INTERRUPTED", "OTHER"
  ]);
  const FEATURES = Object.freeze([
    "proposal_inbox", "immutable_result_checkpoints", "audit_chain", "verified_persistence"
  ]);
  const ERROR_DEFINITIONS = deepFreeze(Object.assign(Object.create(null), {
    INVALID_ENVELOPE: { retryable: false, message: "The RPC envelope is invalid." },
    INTERNAL_ERROR: { retryable: false, message: "The bridge could not complete the request." },
    UNSUPPORTED_VERSION: { retryable: false, message: "No supported major protocol version was offered.", details: { supported_versions: [1] } },
    METHOD_NOT_FOUND: { retryable: false, message: "The requested method is not registered." },
    INVALID_PARAMS: { retryable: false, message: "The method parameters are invalid." },
    REQUEST_ID_REUSED: { retryable: false, message: "The client_id and request_id were already used with a different payload." },
    UNAUTHENTICATED: { retryable: false, message: "Bridge authentication failed." },
    FORBIDDEN: { retryable: false, message: "The transport role is not allowed to perform this action." },
    EXTENSION_OFFLINE: { retryable: true, message: "No authenticated extension connection is available." },
    EXECUTOR_UNAVAILABLE: { retryable: true, message: "Open the Duc Auto GG Flow side panel and retry the same request_id.", details: { failure_type: null, halt_instruction: null } },
    REQUEST_TIMEOUT: { retryable: true, message: "The request timed out; retry the identical idempotency key." },
    TRANSPORT_DISCONNECTED: { retryable: true, message: "The transport disconnected; retry the identical idempotency key." },
    WORKBOOK_NOT_LOADED: { retryable: true, message: "The side panel has no current workbook session." },
    RUN_ACTIVE: { retryable: true, message: "This owner action is unavailable until the current run is idle." },
    PROPOSAL_NOT_FOUND: { retryable: false, message: "The proposal does not exist." },
    PROPOSAL_EXPIRED: { retryable: false, message: "The proposal has expired." },
    PROPOSAL_CONFLICT: { retryable: true, message: "The ledger changed; refresh and submit a new proposal for owner review." },
    VALIDATION_FAILED: { retryable: false, message: "Existing workbook, reference, or settings validation rejected the proposal." },
    APPROVAL_REQUIRED: { retryable: false, message: "This product mutation requires an owner click in the side panel." },
    DEV_MODE_OFF: { retryable: false, message: "The owner's development-mode toggle is OFF; run.trial is refused." },
    JOB_NOT_RUNNABLE: { retryable: false, message: "A requested job is missing from the loaded plan or is not currently runnable (PENDING, PRE_SUBMIT, unprotected)." },
    TRIAL_RATE_LIMIT: { retryable: false, message: "The previous development trial started less than 300 seconds ago." },
    PERSISTENCE_VERIFICATION_FAILED: { retryable: true, message: "The immutable Result checkpoint could not be verified.", details: { failure_type: "PERSISTENCE_VERIFICATION_FAILED" } }
  }));

  class BridgeProtocolError extends Error {
    constructor(code, message, details) {
      if (!Object.hasOwn(ERROR_DEFINITIONS, code)) throw new TypeError(`Unknown bridge error code '${code}'.`);
      const definition = ERROR_DEFINITIONS[code];
      super(message || definition.message);
      this.name = "BridgeProtocolError";
      this.code = code;
      this.retryable = definition.retryable;
      const supplied = details === undefined ? {} : details;
      if (!isPlainObject(supplied)) throw new TypeError("Bridge error details must be a plain object.");
      this.details = jsonClone({ ...(definition.details || {}), ...supplied });
    }
  }

  function isPlainObject(value) {
    if (!value || Object.prototype.toString.call(value) !== "[object Object]") return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === null || Object.getPrototypeOf(prototype) === null;
  }

  function deepFreeze(value, seen = new Set()) {
    if (!value || (typeof value !== "object" && typeof value !== "function") || seen.has(value)) return value;
    seen.add(value);
    for (const key of Reflect.ownKeys(value)) deepFreeze(value[key], seen);
    return Object.freeze(value);
  }

  function canonicalJson(value) {
    const ancestors = new Set();
    function encode(item) {
      if (item === null) return "null";
      if (typeof item === "string" || typeof item === "boolean") return JSON.stringify(item);
      if (typeof item === "number") {
        if (!Number.isFinite(item)) throw new TypeError("Canonical JSON accepts only finite numbers.");
        return JSON.stringify(item);
      }
      if (typeof item !== "object") throw new TypeError("Canonical JSON accepts JSON values only.");
      if (ancestors.has(item)) throw new TypeError("Canonical JSON does not accept cyclic values.");
      ancestors.add(item);
      let encoded;
      if (Array.isArray(item)) {
        encoded = `[${item.map((entry) => encode(entry)).join(",")}]`;
      } else {
        if (!isPlainObject(item)) throw new TypeError("Canonical JSON accepts plain objects only.");
        encoded = `{${Object.keys(item).sort().map((key) => `${JSON.stringify(key)}:${encode(item[key])}`).join(",")}}`;
      }
      ancestors.delete(item);
      return encoded;
    }
    return encode(value);
  }

  function jsonClone(value) {
    return JSON.parse(canonicalJson(value));
  }

  function utf8Bytes(value) {
    return new TextEncoder().encode(value);
  }

  function base64Url(bytes) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let result = "";
    for (let index = 0; index < bytes.length; index += 3) {
      const remaining = bytes.length - index;
      const combined = (bytes[index] << 16) | ((bytes[index + 1] || 0) << 8) | (bytes[index + 2] || 0);
      result += alphabet[(combined >>> 18) & 63];
      result += alphabet[(combined >>> 12) & 63];
      if (remaining > 1) result += alphabet[(combined >>> 6) & 63];
      if (remaining > 2) result += alphabet[combined & 63];
    }
    return result;
  }

  async function hashCanonical(value) {
    const subtle = globalThis.crypto.subtle;
    if (!subtle) throw new Error("WebCrypto SubtleCrypto is required for canonical SHA-256 hashing.");
    const digest = await subtle.digest("SHA-256", utf8Bytes(canonicalJson(value)));
    return `sha256:${base64Url(new Uint8Array(digest))}`;
  }

  async function hashText(value) {
    if (typeof value !== "string") throw new TypeError("Text hashing accepts a string only.");
    const subtle = globalThis.crypto.subtle;
    if (!subtle) throw new Error("WebCrypto SubtleCrypto is required for UTF-8 SHA-256 hashing.");
    const digest = await subtle.digest("SHA-256", utf8Bytes(value));
    return `sha256:${base64Url(new Uint8Array(digest))}`;
  }

  function byteLength(value) {
    return utf8Bytes(value).byteLength;
  }

  function invalidEnvelope(message, details = {}) {
    throw new BridgeProtocolError("INVALID_ENVELOPE", message, details);
  }

  function invalidParams(path, issue) {
    throw new BridgeProtocolError("INVALID_PARAMS", `Invalid params at '${path}': ${issue}`, { path, issue });
  }

  function assertPlainObject(value, path) {
    if (!isPlainObject(value)) invalidParams(path, "expected an object");
    return value;
  }

  function rejectUnknown(object, allowed, path) {
    const unknown = Object.keys(object).filter((key) => !allowed.includes(key));
    if (unknown.length) invalidParams(path, `unknown field '${unknown[0]}'`);
  }

  function stringValue(value, path, options = {}) {
    if (typeof value !== "string") invalidParams(path, "expected a string");
    const text = options.trim === false ? value : value.trim();
    const minimum = options.min ?? 0;
    const maximum = options.max ?? Number.MAX_SAFE_INTEGER;
    if (text.length < minimum || text.length > maximum) invalidParams(path, `expected ${minimum}-${maximum} characters`);
    if (options.pattern && !options.pattern.test(text)) invalidParams(path, options.patternMessage || "invalid format");
    return text;
  }

  function booleanValue(value, path) {
    if (typeof value !== "boolean") invalidParams(path, "expected a boolean");
    return value;
  }

  function integerValue(value, path, minimum, maximum) {
    if (!Number.isInteger(value) || value < minimum || value > maximum) invalidParams(path, `expected an integer from ${minimum} to ${maximum}`);
    return value;
  }

  function nullableCursor(value, path) {
    if (value === undefined || value === null) return null;
    return stringValue(value, path, { min: 1, max: 512, pattern: /^[\x21-\x7e]+$/, patternMessage: "expected an opaque visible-ASCII cursor" });
  }

  function validateEmptyParams(raw) {
    const params = assertPlainObject(raw, "params");
    rejectUnknown(params, [], "params");
    return {};
  }

  function negotiateVersion(clientVersions) {
    if (!Array.isArray(clientVersions) || !clientVersions.length || clientVersions.some((version) => !Number.isInteger(version) || version < 1)) {
      invalidParams("params.supported_versions", "expected a non-empty array of positive integer major versions");
    }
    const offered = new Set(clientVersions);
    const selected = [...SUPPORTED_VERSIONS].sort((left, right) => right - left).find((version) => offered.has(version));
    if (selected === undefined) {
      throw new BridgeProtocolError("UNSUPPORTED_VERSION", undefined, { supported_versions: [...SUPPORTED_VERSIONS] });
    }
    return selected;
  }

  function validateSessionHello(raw) {
    const params = assertPlainObject(raw, "params");
    rejectUnknown(params, ["supported_versions"], "params");
    negotiateVersion(params.supported_versions);
    return { supported_versions: [...params.supported_versions] };
  }

  function validateStatuses(value) {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.length > 32) invalidParams("params.statuses", "expected at most 32 status codes");
    const statuses = value.map((status, index) => stringValue(status, `params.statuses[${index}]`, {
      min: 1, max: 64, pattern: /^[A-Z][A-Z0-9_]*$/, patternMessage: "expected an English status code"
    }));
    if (new Set(statuses).size !== statuses.length) invalidParams("params.statuses", "duplicate status code");
    return statuses;
  }

  function validateQueueList(raw) {
    const params = assertPlainObject(raw, "params");
    rejectUnknown(params, ["cursor", "limit", "statuses", "include_prompt"], "params");
    return {
      cursor: nullableCursor(params.cursor, "params.cursor"),
      limit: params.limit === undefined ? 50 : integerValue(params.limit, "params.limit", 1, LIMITS.max_page_size),
      statuses: validateStatuses(params.statuses),
      include_prompt: params.include_prompt === undefined ? false : booleanValue(params.include_prompt, "params.include_prompt")
    };
  }

  function validateLedgerRead(raw) {
    const params = assertPlainObject(raw, "params");
    rejectUnknown(params, ["cursor", "limit", "include_prompt", "include_removed"], "params");
    return {
      cursor: nullableCursor(params.cursor, "params.cursor"),
      limit: params.limit === undefined ? 50 : integerValue(params.limit, "params.limit", 1, LIMITS.max_page_size),
      include_prompt: params.include_prompt === undefined ? false : booleanValue(params.include_prompt, "params.include_prompt"),
      include_removed: params.include_removed === undefined ? true : booleanValue(params.include_removed, "params.include_removed")
    };
  }

  function validateReferenceToken(value, path) {
    const token = stringValue(value, path, { min: 1, max: 255 });
    if (token === "." || token === ".." || /[\x00-\x1f\x7f<>:"/\\|?*]/.test(token) || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(token)) {
      invalidParams(path, "expected a selected filename or alias token, not a path, URL, or binary value");
    }
    return token;
  }

  function validateSettings(raw, path) {
    const settings = raw === undefined ? {} : assertPlainObject(raw, path);
    const allowed = ["timeout_sec", "max_retries", "safety_cooldown_sec", "output_folder"];
    rejectUnknown(settings, allowed, path);
    const normalized = {};
    if (settings.timeout_sec !== undefined) normalized.timeout_sec = integerValue(settings.timeout_sec, `${path}.timeout_sec`, 15, 900);
    if (settings.max_retries !== undefined) normalized.max_retries = integerValue(settings.max_retries, `${path}.max_retries`, 0, 5);
    if (settings.safety_cooldown_sec !== undefined) {
      const value = settings.safety_cooldown_sec;
      const match = String(value).trim().match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/);
      const minimum = match ? Number(match[1]) : -1;
      const maximum = match ? Number(match[2] ?? match[1]) : -1;
      if (!match || minimum < 0 || maximum > 120 || minimum > maximum) invalidParams(`${path}.safety_cooldown_sec`, "expected 0-120 or an ascending range such as 6-9");
      normalized.safety_cooldown_sec = minimum === maximum ? minimum : `${minimum}-${maximum}`;
    }
    if (settings.output_folder !== undefined) {
      const folder = stringValue(settings.output_folder, `${path}.output_folder`, { min: 1, max: 255 });
      if (/^[A-Za-z]:/.test(folder) || /^[\\/]/.test(folder) || /(^|[\\/])\.\.([\\/]|$)/.test(folder) || /[\x00-\x1f\x7f<>:"|?*]/.test(folder) || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(folder)) {
        invalidParams(`${path}.output_folder`, "expected a safe relative folder without traversal, URL, or absolute path");
      }
      normalized.output_folder = folder.replace(/[\\/]+/g, "/");
    }
    return normalized;
  }

  function validateProposalJob(raw, index) {
    const path = `params.jobs[${index}]`;
    const job = assertPlainObject(raw, path);
    rejectUnknown(job, ["client_job_id", "requested_job_id", "prompt", "reference_images", "settings"], path);
    const clientJobId = stringValue(job.client_job_id, `${path}.client_job_id`, {
      min: 1, max: 128, pattern: /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/, patternMessage: "expected a stable visible identifier"
    });
    let requestedJobId = null;
    if (job.requested_job_id !== undefined && job.requested_job_id !== null) {
      requestedJobId = stringValue(job.requested_job_id, `${path}.requested_job_id`, {
        min: 1, max: 100, pattern: /^[A-Za-z0-9._-]+$/, patternMessage: "use letters, numbers, dot, underscore, or hyphen"
      });
      if (requestedJobId.includes("..")) invalidParams(`${path}.requested_job_id`, "two consecutive dots are not filename-safe");
    }
    const prompt = stringValue(job.prompt, `${path}.prompt`, { min: 1, max: LIMITS.max_envelope_bytes, trim: false });
    if (!prompt.trim()) invalidParams(`${path}.prompt`, "expected non-whitespace text");
    const references = job.reference_images === undefined ? [] : job.reference_images;
    if (!Array.isArray(references) || references.length > LIMITS.max_references_per_job) {
      invalidParams(`${path}.reference_images`, `expected at most ${LIMITS.max_references_per_job} selected filename or alias tokens`);
    }
    const referenceImages = references.map((reference, referenceIndex) => validateReferenceToken(reference, `${path}.reference_images[${referenceIndex}]`));
    if (new Set(referenceImages.map((reference) => reference.toLowerCase())).size !== referenceImages.length) invalidParams(`${path}.reference_images`, "duplicate reference token");
    return {
      client_job_id: clientJobId,
      requested_job_id: requestedJobId,
      prompt,
      reference_images: referenceImages,
      settings: validateSettings(job.settings, `${path}.settings`)
    };
  }

  function validateQueuePropose(raw) {
    const params = assertPlainObject(raw, "params");
    rejectUnknown(params, ["if_ledger_etag", "proposal_label", "jobs"], "params");
    const etag = stringValue(params.if_ledger_etag, "params.if_ledger_etag", {
      min: 1, max: 128, pattern: /^[\x21-\x7e]+$/, patternMessage: "expected a visible-ASCII ledger etag"
    });
    const label = params.proposal_label === undefined ? "" : stringValue(params.proposal_label, "params.proposal_label", { min: 1, max: 200 });
    if (!Array.isArray(params.jobs) || params.jobs.length < 1 || params.jobs.length > LIMITS.max_jobs_per_proposal) {
      invalidParams("params.jobs", `expected 1-${LIMITS.max_jobs_per_proposal} jobs`);
    }
    const jobs = params.jobs.map(validateProposalJob);
    const ids = jobs.map((job) => job.client_job_id);
    if (new Set(ids).size !== ids.length) invalidParams("params.jobs", "client_job_id values must be unique");
    const requested = jobs.filter((job) => job.requested_job_id).map((job) => job.requested_job_id.toLowerCase());
    if (new Set(requested).size !== requested.length) invalidParams("params.jobs", "requested_job_id values must be unique within the proposal");
    return { if_ledger_etag: etag, proposal_label: label, jobs };
  }

  function jobIdValue(value, path = "params.job_id") {
    const id = stringValue(value, path, {
      min: 1, max: 100, pattern: /^[A-Za-z0-9._-]+$/, patternMessage: "use letters, numbers, dot, underscore, or hyphen"
    });
    if (id.includes("..")) invalidParams(path, "two consecutive dots are not filename-safe");
    return id;
  }

  function validateDirectJob(raw, index) {
    const path = `params.jobs[${index}]`;
    const job = assertPlainObject(raw, path);
    rejectUnknown(job, ["prompt", "reference_images", "settings"], path);
    const prompt = stringValue(job.prompt, `${path}.prompt`, { min: 1, max: LIMITS.max_envelope_bytes, trim: false });
    if (!prompt.trim()) invalidParams(`${path}.prompt`, "expected non-whitespace text");
    const references = job.reference_images === undefined ? [] : job.reference_images;
    if (!Array.isArray(references) || references.length > LIMITS.max_references_per_job) {
      invalidParams(`${path}.reference_images`, `expected at most ${LIMITS.max_references_per_job} selected filename or alias tokens`);
    }
    const referenceImages = references.map((reference, referenceIndex) => validateReferenceToken(reference, `${path}.reference_images[${referenceIndex}]`));
    if (new Set(referenceImages.map((reference) => reference.toLowerCase())).size !== referenceImages.length) invalidParams(`${path}.reference_images`, "duplicate reference token");
    return { prompt, reference_images: referenceImages, settings: validateSettings(job.settings, `${path}.settings`) };
  }

  function validateReferenceUpload(raw, index) {
    const path = `params.references[${index}]`;
    const reference = assertPlainObject(raw, path);
    rejectUnknown(reference, ["name", "data_url"], path);
    const name = validateReferenceToken(reference.name, `${path}.name`);
    if (!/\.(png|jpe?g|webp)$/i.test(name)) invalidParams(`${path}.name`, "expected a filename ending in .png, .jpg, .jpeg, or .webp");
    if (typeof reference.data_url !== "string") invalidParams(`${path}.data_url`, "expected a string");
    const prefix = reference.data_url.match(/^data:image\/(png|jpeg|webp);base64,/);
    if (!prefix) invalidParams(`${path}.data_url`, "expected a data:image/(png|jpeg|webp);base64, prefix");
    const payload = reference.data_url.slice(prefix[0].length);
    if (!payload || !/^[A-Za-z0-9+/]+={0,2}$/.test(payload)) invalidParams(`${path}.data_url`, "expected standard base64 image data after the prefix");
    if (byteLength(reference.data_url) > LIMITS.max_reference_data_url_bytes) {
      invalidParams(`${path}.data_url`, `expected at most ${LIMITS.max_reference_data_url_bytes} bytes per reference data_url`);
    }
    return { name, data_url: reference.data_url };
  }

  function validateReferencesAdd(raw) {
    const params = assertPlainObject(raw, "params");
    rejectUnknown(params, ["references"], "params");
    if (!Array.isArray(params.references) || params.references.length < 1 || params.references.length > LIMITS.max_references_per_add) {
      invalidParams("params.references", `expected 1-${LIMITS.max_references_per_add} reference images`);
    }
    const references = params.references.map(validateReferenceUpload);
    if (new Set(references.map((reference) => reference.name.toLowerCase())).size !== references.length) {
      invalidParams("params.references", "duplicate reference name");
    }
    return { references };
  }

  function validateJobsAdd(raw) {
    const params = assertPlainObject(raw, "params");
    rejectUnknown(params, ["jobs"], "params");
    if (!Array.isArray(params.jobs) || params.jobs.length < 1 || params.jobs.length > LIMITS.max_jobs_per_proposal) {
      invalidParams("params.jobs", `expected 1-${LIMITS.max_jobs_per_proposal} jobs`);
    }
    return { jobs: params.jobs.map(validateDirectJob) };
  }

  function validateJobsUpdate(raw) {
    const params = assertPlainObject(raw, "params");
    rejectUnknown(params, ["job_id", "prompt", "reference_images", "settings"], "params");
    const normalized = { job_id: jobIdValue(params.job_id) };
    if (params.prompt !== undefined) {
      normalized.prompt = stringValue(params.prompt, "params.prompt", { min: 1, max: LIMITS.max_envelope_bytes, trim: false });
      if (!normalized.prompt.trim()) invalidParams("params.prompt", "expected non-whitespace text");
    }
    if (params.reference_images !== undefined) {
      if (!Array.isArray(params.reference_images) || params.reference_images.length > LIMITS.max_references_per_job) {
        invalidParams("params.reference_images", `expected at most ${LIMITS.max_references_per_job} selected filename or alias tokens`);
      }
      normalized.reference_images = params.reference_images.map((reference, index) => validateReferenceToken(reference, `params.reference_images[${index}]`));
      if (new Set(normalized.reference_images.map((reference) => reference.toLowerCase())).size !== normalized.reference_images.length) invalidParams("params.reference_images", "duplicate reference token");
    }
    if (params.settings !== undefined) normalized.settings = validateSettings(params.settings, "params.settings");
    if (!Object.hasOwn(normalized, "prompt") && !Object.hasOwn(normalized, "reference_images") && !Object.hasOwn(normalized, "settings")) {
      invalidParams("params", "expected at least one mutable job field");
    }
    return normalized;
  }

  function validateJobIdOnly(raw) {
    const params = assertPlainObject(raw, "params");
    rejectUnknown(params, ["job_id"], "params");
    return { job_id: jobIdValue(params.job_id) };
  }

  function validateJobsReorder(raw) {
    const params = assertPlainObject(raw, "params");
    rejectUnknown(params, ["job_id", "position"], "params");
    return { job_id: jobIdValue(params.job_id), position: integerValue(params.position, "params.position", 1, 1000000) };
  }

  function validateOutputConfigure(raw) {
    const params = assertPlainObject(raw, "params");
    const allowed = ["image_pattern", "result_filename_pattern", "audit_filename", "collision_policy", "save_images", "save_result_xlsx", "save_audit_jsonl"];
    rejectUnknown(params, allowed, "params");
    if (!Object.keys(params).length) invalidParams("params", "expected at least one output field");
    const normalized = {};
    for (const key of ["image_pattern", "result_filename_pattern", "audit_filename"]) {
      if (params[key] !== undefined) normalized[key] = stringValue(params[key], `params.${key}`, { min: 1, max: 255, trim: false });
    }
    if (params.collision_policy !== undefined) {
      const policy = stringValue(params.collision_policy, "params.collision_policy", { min: 1, max: 32 });
      if (!["overwrite", "uniquify", "fail"].includes(policy)) invalidParams("params.collision_policy", "expected overwrite, uniquify, or fail");
      normalized.collision_policy = policy;
    }
    for (const key of ["save_images", "save_result_xlsx", "save_audit_jsonl"]) {
      if (params[key] !== undefined) normalized[key] = booleanValue(params[key], `params.${key}`);
    }
    return normalized;
  }

  function validateRunSettingsConfigure(raw) {
    const params = assertPlainObject(raw, "params");
    const allowed = ["timeout_sec", "max_retries", "delay_min_sec", "delay_max_sec", "safety_cooldown_sec", "max_input_images", "continue_on_error", "rerun_done"];
    rejectUnknown(params, allowed, "params");
    if (!Object.keys(params).length) invalidParams("params", "expected at least one run setting");
    const normalized = {};
    if (params.timeout_sec !== undefined) normalized.timeout_sec = integerValue(params.timeout_sec, "params.timeout_sec", 15, 900);
    if (params.max_retries !== undefined) normalized.max_retries = integerValue(params.max_retries, "params.max_retries", 0, 5);
    if (params.delay_min_sec !== undefined) normalized.delay_min_sec = integerValue(params.delay_min_sec, "params.delay_min_sec", 1, 120);
    if (params.delay_max_sec !== undefined) normalized.delay_max_sec = integerValue(params.delay_max_sec, "params.delay_max_sec", 1, 120);
    if (params.safety_cooldown_sec !== undefined) normalized.safety_cooldown_sec = validateSettings({ safety_cooldown_sec: params.safety_cooldown_sec }, "params").safety_cooldown_sec;
    if (params.max_input_images !== undefined) normalized.max_input_images = integerValue(params.max_input_images, "params.max_input_images", 0, 10);
    if (params.continue_on_error !== undefined) normalized.continue_on_error = booleanValue(params.continue_on_error, "params.continue_on_error");
    if (params.rerun_done !== undefined) normalized.rerun_done = booleanValue(params.rerun_done, "params.rerun_done");
    if (normalized.delay_min_sec !== undefined && normalized.delay_max_sec !== undefined && normalized.delay_min_sec > normalized.delay_max_sec) {
      invalidParams("params.delay_min_sec", "must not exceed params.delay_max_sec");
    }
    return normalized;
  }

  // Tran chuoi trial, ban sao thu hai cua con so trong dev-trial-core.js.
  //
  // Vi sao KHONG doc cheo tu dev-trial-core: file nay co luat thuan khiet cam
  // moi tham chieu toi bien toan cuc cua trang (co test ghim grep tren chinh
  // ma nguon nay, ke ca trong ghi chu), va no duoc nap trong service worker qua
  // background.js — noi dev-trial-core khong he co mat. Doc cheo o day se luon
  // roi ve gia tri du phong, tuc te hon la go lai con so.
  //
  // Doi lai, hai ban sao KHONG DUOC LECH NHAU, va co test ghim dung dieu do
  // (tests/trial-cap-single-truth.mjs). Chuyen nay da xay ra that ngay
  // 2026-09-02: Duc nang tran 3 -> 7, toi sua dev-trial-core, va lop Bridge van
  // tu choi 7 job. Suite khong bat duoc vi no kiem hai lop rieng re va moi lop
  // deu "dung" theo con so cua chinh no; chi mot luot chay that moi lo ra.
  const MAX_TRIAL_JOBS = 7;
  // Cung ly do, cung cach cuong che: nhip giua hai job cung co ban sao thu hai
  // o day. Ngay 02/09 toi nang nhip trong dev-trial-core len 45-120s de tranh bi
  // gan co "unusual activity", chay suite XANH, roi lenh that bi CHINH LOP NAY
  // tu choi vi no van khoa 20-30. Day la lan THU HAI trong mot ngay cung mot ho
  // loi o cung mot ham. tests/trial-cap-single-truth.mjs cuong che ca hai.
  const TRIAL_DELAY_BOUNDS = Object.freeze({ min: 45, max: 120, default: 90 });

  function validateRunTrial(raw) {
    const params = assertPlainObject(raw, "params");
    rejectUnknown(params, ["job_ids", "timeout_sec", "delay_sec"], "params");
    if (!Array.isArray(params.job_ids) || params.job_ids.length < 1 || params.job_ids.length > MAX_TRIAL_JOBS) {
      invalidParams("params.job_ids", `expected 1-${MAX_TRIAL_JOBS} video job ids (owner free-credit budget: one free account covers ${MAX_TRIAL_JOBS} videos at 360p)`);
    }
    const jobIds = params.job_ids.map((value, index) => jobIdValue(value, `params.job_ids[${index}]`));
    if (new Set(jobIds.map((id) => id.toLowerCase())).size !== jobIds.length) invalidParams("params.job_ids", "duplicate job id");
    // F1 measured ~70s/video and recommends 180-300s; runner-core DEFAULTS already uses 180s.
    return {
      job_ids: jobIds,
      timeout_sec: params.timeout_sec === undefined ? 180 : integerValue(params.timeout_sec, "params.timeout_sec", 15, 300),
      delay_sec: params.delay_sec === undefined ? TRIAL_DELAY_BOUNDS.default : integerValue(params.delay_sec, "params.delay_sec", TRIAL_DELAY_BOUNDS.min, TRIAL_DELAY_BOUNDS.max)
    };
  }

  function validateProposalGet(raw) {
    const params = assertPlainObject(raw, "params");
    rejectUnknown(params, ["proposal_id"], "params");
    return {
      proposal_id: stringValue(params.proposal_id, "params.proposal_id", {
        min: 1, max: 128, pattern: /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/, patternMessage: "expected a stable proposal identifier"
      })
    };
  }

  function serializeResult(result) {
    return jsonClone(result);
  }

  function registryEntry(values) {
    return deepFreeze({
      name: values.name,
      context: values.context,
      read_only: values.read_only,
      approval: values.approval,
      requires_executor: values.context === "executor",
      idempotent: Boolean(values.idempotent),
      deadline_ms: values.deadline_ms,
      capability_description: values.description,
      params_schema: values.params_schema,
      params_validator: values.params_validator,
      result_serializer: serializeResult
    });
  }

  const METHOD_ENTRIES = [
    registryEntry({ name: "session.hello", context: "router", read_only: true, approval: "none", deadline_ms: 10000, description: "Negotiate protocol version and report current layer availability.", params_schema: { supported_versions: "positive_integer[]" }, params_validator: validateSessionHello }),
    registryEntry({ name: "system.ping", context: "router", read_only: true, approval: "none", deadline_ms: 10000, description: "Report fresh extension, executor, Gemini, and workbook availability.", params_schema: {}, params_validator: validateEmptyParams }),
    registryEntry({ name: "system.capabilities", context: "router", read_only: true, approval: "none", deadline_ms: 10000, description: "Describe the immutable v1 method and policy surface.", params_schema: {}, params_validator: validateEmptyParams }),
    registryEntry({ name: "queue.list", context: "executor", read_only: true, approval: "none", deadline_ms: 10000, description: "Read a page of active logical queue jobs.", params_schema: { cursor: "string|null", limit: "integer:1..100", statuses: "code[]", include_prompt: "boolean" }, params_validator: validateQueueList }),
    registryEntry({ name: "run.status", context: "executor", read_only: true, approval: "none", deadline_ms: 10000, description: "Read current run state without changing it.", params_schema: {}, params_validator: validateEmptyParams }),
    registryEntry({ name: "ledger.read", context: "executor", read_only: true, approval: "none", deadline_ms: 10000, description: "Read a sanitized page of physical XLSX ledger rows.", params_schema: { cursor: "string|null", limit: "integer:1..100", include_prompt: "boolean", include_removed: "boolean" }, params_validator: validateLedgerRead }),
    registryEntry({ name: "jobs.add", context: "executor", read_only: false, approval: "none", deadline_ms: 30000, description: "Add jobs directly to the current Setup session, or create an in-memory session.", params_schema: { jobs: "direct_job[1..100]" }, params_validator: validateJobsAdd }),
    registryEntry({ name: "jobs.update", context: "executor", read_only: false, approval: "none", deadline_ms: 30000, description: "Update mutable input fields on one PRE_SUBMIT job.", params_schema: { job_id: "string", prompt: "string?", reference_images: "string[]?", settings: "job_settings?" }, params_validator: validateJobsUpdate }),
    registryEntry({ name: "jobs.remove", context: "executor", read_only: false, approval: "none", deadline_ms: 30000, description: "Tombstone one PRE_SUBMIT Queue job without deleting its ledger row.", params_schema: { job_id: "string" }, params_validator: validateJobIdOnly }),
    registryEntry({ name: "jobs.reorder", context: "executor", read_only: false, approval: "none", deadline_ms: 30000, description: "Move one PRE_SUBMIT Queue job to a persisted logical position.", params_schema: { job_id: "string", position: "integer:1..1000000" }, params_validator: validateJobsReorder }),
    registryEntry({ name: "references.add", context: "executor", read_only: false, approval: "none", deadline_ms: 30000, description: "Add or replace in-memory reference images for the current Setup session from base64 data URLs; jobs pick them up by filename token.", params_schema: { references: "reference_image[1..5]" }, params_validator: validateReferencesAdd }),
    registryEntry({ name: "diagnostics.dom_probe", context: "executor", read_only: true, approval: "none", deadline_ms: 30000, description: "Read-only DOM snapshot of the provider tab (adapter selector match counts, visible buttons, image candidates, custom element tags, file inputs) so an AI operator can diagnose the live page without the owner's eyes. Never clicks, types, or changes focus.", params_schema: {}, params_validator: (raw) => { const params = raw === undefined || raw === null ? {} : assertPlainObject(raw, "params"); rejectUnknown(params, [], "params"); return {}; } }),
    registryEntry({ name: "diagnostics.mode_probe", context: "executor", read_only: false, approval: "none", deadline_ms: 30000, description: "Press the create-settings chip once and report whether the settings panel opened, then close it again. Zero credits: it NEVER selects a mode option, never types, and never touches Create. Exists to settle F-14 -- whether Flow's settings controls respond to synthesised pointer events at all -- without spending a video to find out. The labels it reports as newly appeared are the DOM evidence needed to add a localised Video-option label (F-24).", params_schema: {}, params_validator: (raw) => { const params = raw === undefined || raw === null ? {} : assertPlainObject(raw, "params"); rejectUnknown(params, [], "params"); return {}; } }),    // FLOW-01 evidence scaffold (2026-08-27): the ONLY interaction primitive of
    // the bootstrap phase. Types one prompt into the evidence-verified Flow
    // composer and clicks the evidence-verified Create button, once per call.
    // Hard-capped at 3 submissions per page load in the content script (owner
    // decision 2026-08-27: 3 videos x 15 credits = the whole free budget).
    // Exists to capture during/after DOM evidence while the runner has no Flow
    // adapter; fold into the real runner at F-02 and remove.
    registryEntry({ name: "diagnostics.evidence_submit", context: "executor", read_only: false, approval: "none", deadline_ms: 30000, description: "FLOW-01 scaffold: type one prompt into the Flow composer and click Create, once; content-side hard cap 3 per page load (owner free-credit budget). dry_run=true types and reports the Create button state WITHOUT clicking and WITHOUT consuming a slot. Evidence: evidence/F1-snapshot-1-idle-20260827.json.", params_schema: { prompt: "string", dry_run: "boolean?" }, params_validator: (raw) => { const params = assertPlainObject(raw, "params"); rejectUnknown(params, ["prompt", "dry_run"], "params"); const out = { prompt: stringValue(params.prompt, "params.prompt", { min: 1, max: 2000 }) }; if (params.dry_run !== undefined) out.dry_run = booleanValue(params.dry_run, "params.dry_run"); return out; } }),
    registryEntry({ name: "output.configure", context: "executor", read_only: false, approval: "none", deadline_ms: 30000, description: "Configure naming, collision, and save controls for an already-bound output location.", params_schema: { image_pattern: "string?", result_filename_pattern: "string?", audit_filename: "string?", collision_policy: "overwrite|uniquify|fail?", save_images: "boolean?", save_result_xlsx: "boolean?", save_audit_jsonl: "boolean?" }, params_validator: validateOutputConfigure }),
    registryEntry({ name: "run_settings.configure", context: "executor", read_only: false, approval: "none", deadline_ms: 30000, description: "Configure the same current-run overrides exposed on the Setup tab.", params_schema: { timeout_sec: "integer?", max_retries: "integer?", delay_min_sec: "integer?", delay_max_sec: "integer?", safety_cooldown_sec: "integer|range?", max_input_images: "integer?", continue_on_error: "boolean?", rerun_done: "boolean?" }, params_validator: validateRunSettingsConfigure }),
    registryEntry({ name: "queue.propose", context: "executor", read_only: false, approval: "owner_click", idempotent: true, deadline_ms: 30000, description: "Stage a quarantined queue proposal; never execute it automatically.", params_schema: { if_ledger_etag: "string", proposal_label: "string?", jobs: "proposal_job[1..100]" }, params_validator: validateQueuePropose }),
    registryEntry({ name: "queue.proposal.get", context: "executor", read_only: true, approval: "none", deadline_ms: 10000, description: "Read a quarantined proposal decision and checkpoint evidence.", params_schema: { proposal_id: "string" }, params_validator: validateProposalGet }),
    registryEntry({ name: "run.trial", context: "executor", read_only: false, approval: "none", deadline_ms: 30000, description: `Start one owner-gated development trial run of at most ${MAX_TRIAL_JOBS} runnable video jobs (one continuous chain, one free account’s budget); refused unless the side-panel development-mode toggle is ON, no run is active, and 300 seconds have passed since the previous trial. Larger production runs stay owner-only.`, params_schema: { job_ids: `job_id[1..${MAX_TRIAL_JOBS}]`, timeout_sec: "integer:15..300?", delay_sec: `integer:${TRIAL_DELAY_BOUNDS.min}..${TRIAL_DELAY_BOUNDS.max}?` }, params_validator: validateRunTrial }),
    // run.stop là lệnh ghi DUY NHẤT cố ý đi vòng qua khoá RUN_ACTIVE. Mọi lệnh
    // ghi khác bị từ chối khi đang chạy vì chúng có thể đổi thứ run sắp làm;
    // dừng thì chỉ BỚT việc đi. Một lệnh dừng bị từ chối vì "đang chạy" là vô
    // dụng đúng lúc cần nó nhất. Nó KHÔNG phải run.start đội lốt: nó chỉ kết
    // thúc được việc, không bao giờ bắt đầu được việc — nên nó nằm ngoài
    // POLICY.prohibited_methods.
    registryEntry({ name: "run.stop", context: "executor", read_only: false, approval: "none", idempotent: true, deadline_ms: 10000, description: "Ask the current run to stop at its next safe boundary, on exactly the path the owner's Stop button uses. Bypasses the RUN_ACTIVE lock by design, since a stop reduces risk rather than adding it. Idempotent: with no run active it reports was_running=false instead of failing. Reports the phase reached, because a prompt already submitted cannot be recalled by stopping.", params_schema: {}, params_validator: validateEmptyParams }),
    // Ảnh phản chiếu của run.stop: bị khoá BỞI đúng cái khoá kia. F5 giữa chừng
    // giết content script và attempt đang bay, làm mất quota đã tiêu và có nguy
    // cơ gửi lại đúng prompt đó lần thứ hai. Cặp này dùng nối tiếp nhau, không
    // bao giờ chồng lên nhau.
    registryEntry({ name: "chat.reload", context: "executor", read_only: false, approval: "none", idempotent: true, deadline_ms: 30000, description: "Reload the Gemini tab (F5) and wait until its content script answers again before replying. Refused with RUN_ACTIVE while a run is live, because a reload would kill an in-flight attempt and risk resubmitting a prompt: call run.stop first. Reports ready plus the tab id and the URL before and after, since the tab is resolved as the active tab at call time.", params_schema: {}, params_validator: validateEmptyParams })
  ];
  const METHOD_REGISTRY = (() => {
    const registry = Object.create(null);
    for (const entry of METHOD_ENTRIES) registry[entry.name] = entry;
    return Object.freeze(registry);
  })();

  function capabilities() {
    return deepFreeze({
      protocol_versions: [...SUPPORTED_VERSIONS],
      executor_model: POLICY.executor_model,
      auto_execute: POLICY.auto_execute,
      prohibited_methods: [...POLICY.prohibited_methods],
      methods: Object.values(METHOD_REGISTRY).map((entry) => ({
        name: entry.name,
        context: entry.context,
        read_only: entry.read_only,
        approval: entry.approval,
        requires_executor: entry.requires_executor,
        idempotent: entry.idempotent,
        deadline_ms: entry.deadline_ms,
        description: entry.capability_description
      })),
      limits: { ...LIMITS },
      failure_types: [...FAILURE_TYPES],
      features: [...FEATURES]
    });
  }

  function decodedEnvelope(input) {
    let envelope;
    let source;
    if (typeof input === "string") {
      source = input;
      if (byteLength(source) > LIMITS.max_envelope_bytes) invalidEnvelope("The decoded envelope exceeds 1 MiB.", { max_envelope_bytes: LIMITS.max_envelope_bytes });
      try { envelope = JSON.parse(source); } catch (_error) { invalidEnvelope("The request is not valid JSON."); }
    } else {
      try { source = canonicalJson(input); } catch (error) { invalidEnvelope(error.message); }
      if (byteLength(source) > LIMITS.max_envelope_bytes) invalidEnvelope("The decoded envelope exceeds 1 MiB.", { max_envelope_bytes: LIMITS.max_envelope_bytes });
      envelope = input;
    }
    if (!isPlainObject(envelope)) invalidEnvelope("The request must be a JSON object.");
    return envelope;
  }

  function validTimestamp(value) {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) && !Number.isNaN(Date.parse(value));
  }

  function validRequestId(value) {
    return typeof value === "string" && /^[\x21-\x7e]{8,128}$/.test(value);
  }

  function validateRequestEnvelope(envelope) {
    if (!validRequestId(envelope.request_id)) invalidEnvelope("request_id must be 8-128 visible ASCII characters.", { field: "request_id" });
    if (typeof envelope.method !== "string" || !/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/.test(envelope.method)) invalidEnvelope("method must be a dotted lowercase identifier.", { field: "method" });
    if (!validTimestamp(envelope.sent_at)) invalidEnvelope("sent_at must be an ISO-8601 UTC timestamp.", { field: "sent_at" });
    if (!isPlainObject(envelope.client)) invalidEnvelope("client must be an object.", { field: "client" });
    const client = envelope.client;
    if (typeof client.client_id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(client.client_id)) invalidEnvelope("client.client_id must be a stable 1-128 character identifier.", { field: "client.client_id" });
    if (typeof client.name !== "string" || !client.name.trim() || client.name.length > 128) invalidEnvelope("client.name must be a non-empty string of at most 128 characters.", { field: "client.name" });
    if (typeof client.version !== "string" || !client.version.trim() || client.version.length > 64) invalidEnvelope("client.version must be a non-empty string of at most 64 characters.", { field: "client.version" });
    if (!isPlainObject(envelope.params)) invalidEnvelope("params must be an object.", { field: "params" });
  }

  function validateResponseEnvelope(envelope) {
    if (!validRequestId(envelope.request_id) && !(envelope.request_id === null && envelope.ok === false)) invalidEnvelope("response request_id must be 8-128 visible ASCII characters, or null for an uncorrelated failure.", { field: "request_id" });
    if (typeof envelope.ok !== "boolean") invalidEnvelope("response ok must be a boolean.", { field: "ok" });
    if (!validTimestamp(envelope.responded_at)) invalidEnvelope("responded_at must be an ISO-8601 UTC timestamp.", { field: "responded_at" });
    if (envelope.ok) {
      if (!Object.prototype.hasOwnProperty.call(envelope, "result") || Object.prototype.hasOwnProperty.call(envelope, "error")) invalidEnvelope("A successful response must contain result and no error.");
      return;
    }
    if (!isPlainObject(envelope.error) || Object.prototype.hasOwnProperty.call(envelope, "result")) invalidEnvelope("A failed response must contain error and no result.");
    const error = envelope.error;
    if (!Object.hasOwn(ERROR_DEFINITIONS, error.code)) invalidEnvelope("response error.code is not a v1 bridge error code.", { field: "error.code" });
    if (typeof error.message !== "string" || !error.message.trim()) invalidEnvelope("response error.message must be non-empty text.", { field: "error.message" });
    if (error.retryable !== ERROR_DEFINITIONS[error.code].retryable) invalidEnvelope("response error.retryable does not match the registered error policy.", { field: "error.retryable" });
    if (!isPlainObject(error.details)) invalidEnvelope("response error.details must be an object.", { field: "error.details" });
  }

  function parseEnvelope(input) {
    const envelope = decodedEnvelope(input);
    if (envelope.protocol !== PROTOCOL) invalidEnvelope(`protocol must equal '${PROTOCOL}'.`, { field: "protocol" });
    if (!Number.isInteger(envelope.version) || envelope.version < 1) invalidEnvelope("version must be a positive integer.", { field: "version" });
    if (!SUPPORTED_VERSIONS.includes(envelope.version)) {
      throw new BridgeProtocolError("UNSUPPORTED_VERSION", undefined, { supported_versions: [...SUPPORTED_VERSIONS] });
    }
    if (envelope.kind === "request") validateRequestEnvelope(envelope);
    else if (envelope.kind === "response") validateResponseEnvelope(envelope);
    else invalidEnvelope("kind must equal 'request' or 'response'.", { field: "kind" });
    return envelope;
  }

  function parseRequest(input) {
    const envelope = parseEnvelope(input);
    if (envelope.kind !== "request") invalidEnvelope("Expected a request envelope.", { field: "kind" });
    return envelope;
  }

  function parseResponse(input) {
    const envelope = parseEnvelope(input);
    if (envelope.kind !== "response") invalidEnvelope("Expected a response envelope.", { field: "kind" });
    return envelope;
  }

  function serializeEnvelope(envelope) {
    let serialized;
    try { serialized = canonicalJson(envelope); } catch (error) { invalidEnvelope(error.message); }
    if (byteLength(serialized) > LIMITS.max_envelope_bytes) invalidEnvelope("The decoded envelope exceeds 1 MiB.", { max_envelope_bytes: LIMITS.max_envelope_bytes });
    return serialized;
  }

  function requireMethod(method) {
    if (!Object.hasOwn(METHOD_REGISTRY, method)) {
      throw new BridgeProtocolError("METHOD_NOT_FOUND", undefined, { method });
    }
    return METHOD_REGISTRY[method];
  }

  function validateParams(method, params) {
    return requireMethod(method).params_validator(params);
  }

  function errorObject(errorOrCode, message, details) {
    const error = errorOrCode instanceof BridgeProtocolError
      ? errorOrCode
      : new BridgeProtocolError(errorOrCode, message, details);
    return deepFreeze({ code: error.code, message: error.message, retryable: error.retryable, details: jsonClone(error.details || {}) });
  }

  function responseTime(now) {
    const value = typeof now === "function" ? now() : new Date();
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) throw new TypeError("now must produce a valid date.");
    return date.toISOString();
  }

  function successResponse(request, result, now) {
    return deepFreeze({
      protocol: PROTOCOL,
      version: request.version,
      kind: "response",
      request_id: request.request_id,
      ok: true,
      result: jsonClone(result),
      responded_at: responseTime(now)
    });
  }

  function failureResponse(requestId, errorOrCode, now, message, details) {
    return deepFreeze({
      protocol: PROTOCOL,
      version: SUPPORTED_VERSIONS[0],
      kind: "response",
      request_id: typeof requestId === "string" ? requestId : null,
      ok: false,
      error: errorObject(errorOrCode, message, details),
      responded_at: responseTime(now)
    });
  }

  function idempotencyKey(request) {
    return `${request.client.client_id}\u0000${request.request_id}`;
  }

  function idempotencyPayload(request, normalizedParams = request.params) {
    return {
      protocol: request.protocol,
      version: request.version,
      method: request.method,
      params: normalizedParams
    };
  }

  async function idempotencyHash(request, normalizedParams = request.params) {
    return hashCanonical(idempotencyPayload(request, normalizedParams));
  }

  function createMemoryReplayStore() {
    const records = new Map();
    return Object.freeze({
      async get(key) { return records.has(key) ? jsonClone(records.get(key)) : null; },
      async put(key, record) { records.set(key, jsonClone(record)); },
      size() { return records.size; }
    });
  }

  function createDispatcher(options = {}) {
    const handlers = isPlainObject(options.handlers) ? options.handlers : {};
    const replayStore = options.replay_store || null;
    const now = options.now;
    return async function dispatch(input, context = {}) {
      let request;
      try {
        request = parseRequest(input);
        const entry = requireMethod(request.method);
        const params = entry.params_validator(request.params);
        const handler = Object.hasOwn(handlers, request.method) ? handlers[request.method] : null;
        if (typeof handler !== "function") throw new TypeError(`No injected handler for registered method '${request.method}'.`);
        let key = null;
        let payloadHash = null;
        if (entry.idempotent) {
          if (!replayStore || typeof replayStore.get !== "function" || typeof replayStore.put !== "function") {
            throw new TypeError(`An injected replay_store is required for idempotent method '${request.method}'.`);
          }
          key = idempotencyKey(request);
          payloadHash = await idempotencyHash(request, params);
          const prior = await replayStore.get(key);
          if (prior) {
            if (prior.payload_hash !== payloadHash) throw new BridgeProtocolError("REQUEST_ID_REUSED", undefined, { method: request.method });
            return deepFreeze(jsonClone(prior.response));
          }
        }
        const call = Object.freeze({ request: deepFreeze(jsonClone(request)), method: entry, context });
        const rawResult = await handler(params, call);
        const result = entry.result_serializer(rawResult);
        const response = successResponse(request, result, now);
        if (entry.idempotent) await replayStore.put(key, { payload_hash: payloadHash, response });
        return response;
      } catch (error) {
        if (error instanceof BridgeProtocolError) return failureResponse(request?.request_id, error, now);
        return failureResponse(request?.request_id, "INTERNAL_ERROR", now);
      }
    };
  }

  (typeof window !== "undefined" ? window : globalThis).DacBridgeCore = {
    PROTOCOL,
    SUPPORTED_VERSIONS,
    LIMITS,
    POLICY,
    FAILURE_TYPES,
    FEATURES,
    ERROR_DEFINITIONS,
    METHOD_REGISTRY,
    BridgeProtocolError,
    canonicalJson,
    hashCanonical,
    hashText,
    negotiateVersion,
    parseEnvelope,
    parseRequest,
    parseResponse,
    serializeEnvelope,
    requireMethod,
    validateParams,
    capabilities,
    errorObject,
    successResponse,
    failureResponse,
    idempotencyKey,
    idempotencyPayload,
    idempotencyHash,
    createMemoryReplayStore,
    createDispatcher
  };
})();
