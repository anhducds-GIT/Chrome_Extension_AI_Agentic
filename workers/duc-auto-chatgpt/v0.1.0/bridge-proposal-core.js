(() => {
  "use strict";

  const STORAGE_SCHEMA_VERSION = 1;
  const PENDING_TTL_MS = 24 * 60 * 60 * 1000;
  const HISTORY_TTL_MS = 30 * 24 * 60 * 60 * 1000;
  const MAX_PENDING_RECORDS = 20;
  const MAX_PENDING_JOBS = 100;
  const PENDING_STATUSES = new Set(["AWAITING_OWNER_APPROVAL", "NEEDS_REVIEW", "APPROVING", "APPROVAL_FAILED"]);
  const TERMINAL_STATUSES = new Set(["APPROVED_CHECKPOINTED", "REJECTED", "EXPIRED", "WITHDRAWN"]);
  const WITHDRAWABLE_STATUSES = new Set(["AWAITING_OWNER_APPROVAL", "NEEDS_REVIEW", "APPROVAL_FAILED"]);
  const PROVENANCE_FIELDS = Object.freeze([
    "input_origin", "bridge_protocol_version", "bridge_transport", "bridge_proposal_id",
    "bridge_request_id", "bridge_client_id", "bridge_client_job_id", "bridge_received_at",
    "bridge_approved_at", "bridge_prompt_sha256", "bridge_payload_sha256"
  ]);

  class ProposalError extends Error {
    constructor(code, message, details = {}) {
      super(message);
      this.name = "ProposalError";
      this.code = code;
      this.details = clone(details);
    }
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function text(value) {
    return String(value ?? "").trim();
  }

  function iso(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) throw new TypeError("A valid date is required.");
    return date.toISOString();
  }

  function time(value) {
    const parsed = Date.parse(String(value || ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function randomId(prefix = "proposal", randomUuid = globalThis.crypto?.randomUUID?.bind(globalThis.crypto)) {
    if (typeof randomUuid !== "function") throw new Error("crypto.randomUUID is required for proposal identity.");
    return `${prefix}-${randomUuid()}`;
  }

  function idempotencyKey(clientId, requestId) {
    return `${text(clientId)}\u0000${text(requestId)}`;
  }

  function sanitizeLedgerValue(value) {
    if (value === null || value === undefined) return "";
    if (["string", "number", "boolean"].includes(typeof value)) return value;
    return "";
  }

  function artifactLeaf(value) {
    return String(value ?? "").replace(/\\/g, "/").split("/").filter(Boolean).at(-1) || "";
  }

  function safeLedgerValue(key, value) {
    const clean = sanitizeLedgerValue(value);
    if (typeof clean !== "string" || key === "prompt") return clean;
    if (/^(?:effective_(?:source_workbook|image_output|result_xlsx)|.*absolute_path)$/i.test(key)) return "[local value redacted]";
    if (/^(?:reference_images?|references)$/i.test(key)) {
      return clean.split("|").map((token) => artifactLeaf(token.trim())).filter(Boolean).join("|");
    }
    if (/(?:^|_)(?:file|filename)$/i.test(key) && /[\\/]/.test(clean)) return artifactLeaf(clean);
    if (/(?:^|\s)(?:[A-Za-z]:[\\/]|\\\\|file:\/\/|\/(?:Users|home|tmp)\/)/i.test(clean)) return "[local value redacted]";
    return clean;
  }

  function sanitizeLedgerJob(job = {}, { redact_local_paths = true } = {}) {
    const clean = {};
    for (const key of Object.keys(job).sort()) {
      if (key === "response_text" || key.startsWith("_") || /(?:token|handle|data_url|object_url|absolute_path)$/i.test(key)) continue;
      clean[key] = redact_local_paths ? safeLedgerValue(key, job[key]) : sanitizeLedgerValue(job[key]);
    }
    return clean;
  }

  function ledgerMaterial(workbook = {}) {
    const config = {};
    for (const key of Object.keys(workbook.config || {}).sort()) config[key] = sanitizeLedgerValue(workbook.config[key]);
    return {
      file_name: text(workbook.fileName),
      config,
      jobs: Array.from(workbook.jobs || [], (job) => sanitizeLedgerJob(job, { redact_local_paths: false }))
    };
  }

  async function ledgerEtag(workbook, hashCanonical) {
    if (typeof hashCanonical !== "function") throw new TypeError("hashCanonical must be injected.");
    return hashCanonical(ledgerMaterial(workbook));
  }

  function jobIdSet(existingJobs = []) {
    return new Set(existingJobs.map((job) => text(typeof job === "string" ? job : job?.id).toLowerCase()).filter(Boolean));
  }

  function nextQueueId(taken, counter) {
    let candidate = Math.max(1, Number(counter) || 1);
    while (taken.has(`q${String(candidate).padStart(3, "0")}`)) candidate += 1;
    return { id: `Q${String(candidate).padStart(3, "0")}`, next: candidate + 1 };
  }

  function assignFinalIds(jobs, existingJobs = []) {
    if (!Array.isArray(jobs) || !jobs.length) throw new ProposalError("VALIDATION_FAILED", "Proposal must contain at least one job.");
    const taken = jobIdSet(existingJobs);
    let counter = 1;
    return jobs.map((job) => {
      let finalId = text(job.requested_job_id);
      if (finalId) {
        if (!/^[A-Za-z0-9._-]+$/.test(finalId) || finalId.includes("..")) {
          throw new ProposalError("VALIDATION_FAILED", `Job ID '${finalId}' is not valid.`, { client_job_id: job.client_job_id });
        }
        if (taken.has(finalId.toLowerCase())) {
          throw new ProposalError("VALIDATION_FAILED", `Job ID '${finalId}' is already used.`, { client_job_id: job.client_job_id, job_id: finalId });
        }
      } else {
        const assigned = nextQueueId(taken, counter);
        finalId = assigned.id;
        counter = assigned.next;
      }
      taken.add(finalId.toLowerCase());
      return { ...clone(job), job_id: finalId };
    });
  }

  function referenceKey(value) {
    return text(value).toLowerCase();
  }

  function referenceBase(value) {
    return referenceKey(value).replace(/^.*[\\/]/, "").replace(/\.(avif|gif|jpe?g|png|webp)$/i, "");
  }

  function resolveReference(token, availableReferences) {
    const key = referenceKey(token);
    const files = Array.from(availableReferences || []);
    const aliases = files.filter((file) => referenceKey(file.alias) === key && key);
    const exact = /\.(avif|gif|jpe?g|png|webp)$/i.test(key)
      ? files.filter((file) => referenceKey(file.fileName || file.name) === key)
      : [];
    const bases = files.filter((file) => referenceBase(file.fileName || file.name) === referenceBase(token));
    const matches = aliases.length ? aliases : exact.length ? exact : bases;
    if (!matches.length) throw new ProposalError("VALIDATION_FAILED", `Reference '${token}' is not selected.`, { reference: token });
    if (matches.length > 1) throw new ProposalError("VALIDATION_FAILED", `Reference '${token}' is ambiguous.`, { reference: token });
    return matches[0];
  }

  function effectiveSettings(job, defaults = {}) {
    return {
      timeout_sec: job.settings?.timeout_sec ?? defaults.timeout_sec,
      max_retries: job.settings?.max_retries ?? defaults.max_retries,
      safety_cooldown_sec: job.settings?.safety_cooldown_sec ?? defaults.safety_cooldown_sec,
      output_folder: job.settings?.output_folder ?? defaults.output_folder
    };
  }

  function buildPreview({ params, ledger_etag, existing_jobs = [], available_references = [], default_settings = {}, max_input_images = 10 }) {
    if (!params || text(params.if_ledger_etag) !== text(ledger_etag)) {
      throw new ProposalError("PROPOSAL_CONFLICT", "The ledger changed before the proposal was staged.", { current_ledger_etag: ledger_etag });
    }
    const clientIds = new Set();
    for (const job of params.jobs || []) {
      const clientId = text(job.client_job_id);
      if (!clientId || clientIds.has(clientId)) throw new ProposalError("VALIDATION_FAILED", "client_job_id values must be non-empty and unique.");
      clientIds.add(clientId);
      if (!text(job.prompt)) throw new ProposalError("VALIDATION_FAILED", `Job '${clientId}' has an empty prompt.`);
    }
    return assignFinalIds(params.jobs || [], existing_jobs).map((job) => {
      const references = Array.from(job.reference_images || []);
      if (references.length > max_input_images) {
        throw new ProposalError("VALIDATION_FAILED", `${job.job_id} requests ${references.length} references; the current limit is ${max_input_images}.`, { job_id: job.job_id });
      }
      const resolved = references.map((token) => resolveReference(token, available_references));
      const filenames = resolved.map((file) => text(file.fileName || file.name).toLowerCase());
      if (new Set(filenames).size !== filenames.length) {
        throw new ProposalError("VALIDATION_FAILED", `${job.job_id} resolves the same reference more than once.`, { job_id: job.job_id });
      }
      return {
        job_id: job.job_id,
        client_job_id: job.client_job_id,
        requested_job_id: job.requested_job_id || null,
        prompt: job.prompt,
        task_type: job.task_type || "image_generation",
        reference_images: references,
        settings: effectiveSettings(job, default_settings)
      };
    });
  }

  async function createRecord({ params, preview, request, ledger_etag, now = new Date(), random_uuid, hash_canonical, hash_text }) {
    if (typeof hash_canonical !== "function") throw new TypeError("hash_canonical must be injected.");
    if (typeof hash_text !== "function") throw new TypeError("hash_text must be injected.");
    const receivedAt = iso(now);
    const proposalId = randomId("proposal", random_uuid);
    const jobs = [];
    for (const item of preview) {
      jobs.push({
        ...clone(item),
        bridge_prompt_sha256: await hash_text(item.prompt),
        bridge_payload_sha256: await hash_canonical({
          job_id: item.job_id,
          client_job_id: item.client_job_id,
          prompt: item.prompt,
          task_type: item.task_type,
          reference_images: item.reference_images,
          settings: item.settings
        })
      });
    }
    const record = {
      schema_version: STORAGE_SCHEMA_VERSION,
      proposal_id: proposalId,
      status: "AWAITING_OWNER_APPROVAL",
      proposal_label: text(params.proposal_label),
      client: clone(request.client),
      request_id: request.request_id,
      idempotency_key: idempotencyKey(request.client.client_id, request.request_id),
      received_at: receivedAt,
      updated_at: receivedAt,
      expires_at: iso(new Date(time(receivedAt) + PENDING_TTL_MS)),
      base_ledger_etag: ledger_etag,
      local_events: [{ event: "BRIDGE_PROPOSAL_RECEIVED", timestamp: receivedAt }],
      jobs
    };
    record.payload_hash = await hash_canonical({ method: request.method, params });
    return record;
  }

  function publicRecord(record, { include_prompt = PENDING_STATUSES.has(record?.status) } = {}) {
    if (!record) return null;
    const jobs = Array.from(record.jobs || [], (job) => {
      const copy = clone(job);
      if (!include_prompt) delete copy.prompt;
      return copy;
    });
    return {
      proposal_id: record.proposal_id,
      status: record.status,
      proposal_label: record.proposal_label || "",
      client: clone(record.client || {}),
      received_at: record.received_at,
      updated_at: record.updated_at,
      expires_at: record.expires_at,
      base_ledger_etag: record.base_ledger_etag,
      preview: jobs,
      approved_at: record.approved_at || null,
      rejected_at: record.rejected_at || null,
      withdrawn_at: record.withdrawn_at || null,
      failure: record.failure ? clone(record.failure) : null,
      checkpoint: record.checkpoint ? clone(record.checkpoint) : null,
      ledger_etag: record.ledger_etag || null,
      final_job_ids: jobs.map((job) => job.job_id)
    };
  }

  function redact(record) {
    const copy = clone(record);
    copy.jobs = Array.from(copy.jobs || [], (job) => {
      return {
        job_id: job.job_id,
        client_job_id: job.client_job_id,
        requested_job_id: job.requested_job_id || null,
        task_type: job.task_type || "image_generation",
        bridge_prompt_sha256: job.bridge_prompt_sha256,
        bridge_payload_sha256: job.bridge_payload_sha256
      };
    });
    copy.client = { client_id: copy.client?.client_id || "" };
    delete copy.proposal_label;
    return copy;
  }

  function transition(record, status, values = {}, now = new Date()) {
    if (!PENDING_STATUSES.has(status) && !TERMINAL_STATUSES.has(status)) throw new TypeError(`Unknown proposal status '${status}'.`);
    const updatedAt = iso(now);
    const eventByStatus = {
      REJECTED: "BRIDGE_PROPOSAL_REJECTED",
      EXPIRED: "BRIDGE_PROPOSAL_EXPIRED",
      WITHDRAWN: "BRIDGE_PROPOSAL_WITHDRAWN"
    };
    const updated = { ...clone(record), ...clone(values), status, updated_at: updatedAt };
    if (eventByStatus[status]) {
      updated.local_events = [...(updated.local_events || []), { event: eventByStatus[status], timestamp: updatedAt }];
    }
    return TERMINAL_STATUSES.has(status) ? redact(updated) : updated;
  }

  function maintainRecords(records, now = new Date()) {
    const current = time(iso(now));
    return Array.from(records || []).flatMap((record) => {
      let next = clone(record);
      if (PENDING_STATUSES.has(next.status) && time(next.expires_at) && time(next.expires_at) <= current) {
        next = transition(next, "EXPIRED", { expired_at: iso(now) }, now);
      }
      const retentionFrom = time(next.updated_at || next.received_at);
      if (TERMINAL_STATUSES.has(next.status) && retentionFrom && current - retentionFrom > HISTORY_TTL_MS) return [];
      return [next];
    });
  }

  function assertCapacity(records, addedJobs) {
    const pending = Array.from(records || []).filter((record) => PENDING_STATUSES.has(record.status));
    const jobs = pending.reduce((total, record) => total + (record.jobs?.length || 0), 0);
    if (pending.length >= MAX_PENDING_RECORDS || jobs + addedJobs > MAX_PENDING_JOBS) {
      throw new ProposalError("VALIDATION_FAILED", "The proposal inbox is full; review or reject existing proposals first.", {
        max_pending_records: MAX_PENDING_RECORDS,
        max_pending_jobs: MAX_PENDING_JOBS
      });
    }
  }

  function findByIdempotency(records, clientId, requestId) {
    const key = idempotencyKey(clientId, requestId);
    return Array.from(records || []).find((record) => record.idempotency_key === key) || null;
  }

  function bridgeFields(record, job, approvedAt) {
    return {
      input_origin: "bridge",
      bridge_protocol_version: "1",
      bridge_transport: "loopback_ws",
      bridge_proposal_id: record.proposal_id,
      bridge_request_id: record.request_id,
      bridge_client_id: record.client.client_id,
      bridge_client_job_id: job.client_job_id,
      bridge_received_at: record.received_at,
      bridge_approved_at: iso(approvedAt),
      bridge_prompt_sha256: job.bridge_prompt_sha256,
      bridge_payload_sha256: job.bridge_payload_sha256
    };
  }

  function approvalLockReason(flags = {}) {
    if (flags.running) return "Đang có lượt chạy; chỉ duyệt khi lượt chạy đã dừng hẳn.";
    if (flags.reconciliation) return "Đang đối soát kết quả; chờ đối soát hoàn tất.";
    if (flags.recreate) return "Đang xử lý Recreate/chạy lại; chờ checkpoint hiện tại hoàn tất.";
    if (flags.audit_gap) return "Khoảng trống audit chưa được xử lý xong.";
    if (flags.queue_mutation) return "Queue đang được cập nhật; chờ thao tác hiện tại hoàn tất.";
    if (flags.workbook_missing) return "Chưa có workbook/ledger đang mở.";
    if (flags.persistence_missing) return "Cần bật lưu audit và Result XLSX trước khi duyệt.";
    return "";
  }

  function page(items, cursor, limit) {
    const match = /^offset:(\d+)$/.exec(text(cursor));
    const offset = cursor == null || cursor === "" ? 0 : match ? Number(match[1]) : -1;
    if (offset < 0) throw new ProposalError("VALIDATION_FAILED", "The pagination cursor is invalid.");
    const size = Math.max(1, Math.min(100, Number(limit) || 50));
    const values = Array.from(items || []).slice(offset, offset + size);
    return { values, next_cursor: offset + size < items.length ? `offset:${offset + size}` : null };
  }

  function createSerialExecutor() {
    let tail = Promise.resolve();
    return function serialize(operation) {
      if (typeof operation !== "function") return Promise.reject(new TypeError("Serialized operation must be a function."));
      const task = tail.then(operation, operation);
      tail = task.then(() => undefined, () => undefined);
      return task;
    };
  }

  const api = {
    STORAGE_SCHEMA_VERSION, PENDING_TTL_MS, HISTORY_TTL_MS, MAX_PENDING_RECORDS, MAX_PENDING_JOBS,
    PENDING_STATUSES, TERMINAL_STATUSES, WITHDRAWABLE_STATUSES, PROVENANCE_FIELDS, ProposalError, ledgerMaterial, ledgerEtag,
    sanitizeLedgerJob, assignFinalIds, buildPreview, createRecord, publicRecord, redact, transition,
    maintainRecords, assertCapacity, findByIdempotency, idempotencyKey, bridgeFields, approvalLockReason, page,
    createSerialExecutor
  };
  (typeof window !== "undefined" ? window : globalThis).DacBridgeProposalCore = api;
})();
