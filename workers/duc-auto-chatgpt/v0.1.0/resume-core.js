(() => {
  "use strict";

  const text = (value) => String(value ?? "").trim();
  const lower = (value) => text(value).toLowerCase();
  const bool = (value) => value === true || /^(true|1|yes)$/i.test(text(value));
  const leaf = (value) => text(value).replace(/^.*[\\/]/, "");
  const base = (value) => leaf(value).replace(/__results\.xlsx$/i, "").replace(/\.xlsx$/i, "") || "workbook";
  const postSubmitPhases = new Set(["SUBMITTED", "OUTPUT_DETECTED", "OUTPUT_SAVED", "CHAT_READY", "SUCCESS"]);

  function token(value) { return text(value).replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase().slice(0, 40) || "run"; }
  function hash(value) { let h = 2166136261; for (const char of String(value)) { h ^= char.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  function createRunId(workbookName, now = new Date()) {
    const date = now instanceof Date ? now : new Date(now);
    const stamp = `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}-${String(date.getUTCHours()).padStart(2, "0")}${String(date.getUTCMinutes()).padStart(2, "0")}`;
    return `${stamp}-${token(base(workbookName))}`;
  }
  function legacyRunId(workbook) {
    const jobs = (workbook?.jobs || []).map((job) => `${text(job.id)}:${text(job.prompt)}`).join("|");
    return `legacy-${token(base(workbook?.fileName))}-${hash(`${base(workbook?.fileName)}|${jobs}`).slice(0, 8)}`;
  }
  function identity(workbook, now) {
    const existing = text(workbook?.config?.run_id);
    if (/^[a-z0-9][a-z0-9-]{2,79}$/i.test(existing)) return { run_id: existing, provenance: "persisted" };
    return { run_id: legacyRunId(workbook), provenance: "legacy" };
  }
  function hasSubmittedBoundary(job = {}) {
    const phase = text(job.attempt_phase).toUpperCase();
    return Boolean(text(job.submitted_at)) || postSubmitPhases.has(phase) || ["running", "reconciling", "interrupted", "stopped"].includes(lower(job.status));
  }
  // B-23: `response_sha256` được GHI từ 28/08 nhưng KHÔNG bao giờ được KIỂM — nhánh
  // `text_reasoning` của validSavedAttribution chỉ so HÌNH DẠNG chuỗi hash. Ai mở Result
  // XLSX bằng Excel, sửa một chữ trong ô câu trả lời mà GIỮ NGUYÊN số ký tự, thì hàng đó
  // vẫn được xếp SAFE_COMPLETE và bị bỏ qua khi chạy tiếp. Một trường bằng chứng không ai
  // đọc thì nó là trang trí, không phải bằng chứng.
  //
  // VÌ SAO KHÔNG ĐỔI CẢ CHUỖI HÀM SANG ASYNC: SHA-256 trong trình duyệt là hàm bất đồng
  // bộ, còn classify()/validSavedAttribution() là đồng bộ và plan() được gọi từ 14 chỗ
  // trong sidepanel.js. Đổi hết là một diện tích rủi ro lớn cho một phép so sánh nhỏ.
  // Thay vào đó: băm TRƯỚC (một lượt, bất đồng bộ), cất phán quyết vào một WeakMap khoá
  // theo chính workbook, rồi các hàm đồng bộ đọc lại phán quyết đó.
  //
  // WeakMap chứ không phải một trường trên job, và đó là cố ý: một trường trên job có thể
  // bị codec ghi ngược ra XLSX, và lúc đó người sửa file chỉ cần thêm một cột để tự cấp
  // cho mình một dấu đạt — đúng cái việc phép kiểm này sinh ra để chặn.
  const HASH_VERDICTS = new WeakMap();

  function verdictFor(workbook, job) { return HASH_VERDICTS.get(workbook)?.get(lower(job?.id)); }

  // Băm lại MỌI câu trả lời text đã lưu trong sổ và đối chiếu với dấu vân tay đã ghi.
  // `hashText` được TIÊM VÀO, không gọi thẳng WebCrypto: module này phải thuần để test
  // chạy được chính nó, và hàm băm thật là cái đã GHI dấu (DacBridgeCore.hashText) —
  // băm bằng một hàm khác thì phép so là vô nghĩa.
  //
  // Chỉ băm hàng NÀO ĐÃ CÓ dấu và có câu trả lời: hàng thiếu dấu đã trượt phép kiểm hình
  // dạng sẵn có rồi, không cần băm để biết.
  async function verifyResponseHashes(workbook, hashText) {
    if (typeof hashText !== "function") throw new TypeError("Response hash callback is required.");
    const table = new Map();
    let checked = 0;
    let mismatched = 0;
    for (const job of activeJobs(workbook)) {
      if (lower(job.task_type) !== "text_reasoning") continue;
      const recorded = text(job.response_sha256);
      const response = String(job.response_text ?? "");
      if (!recorded || !response) continue;
      const actual = await hashText(response);
      const match = actual === recorded;
      table.set(lower(job.id), match);
      checked += 1;
      if (!match) mismatched += 1;
    }
    HASH_VERDICTS.set(workbook, table);
    return { checked, mismatched, matched: checked - mismatched };
  }

  // `hashVerdict`: true = đã băm lại và KHỚP · false = đã băm lại và LỆCH · undefined = chưa
  // băm lại lần nào. LỆCH luôn trượt. CHƯA BĂM thì rơi về phép kiểm hình dạng cũ — đủ cho
  // bảng hiển thị, và KHÔNG phải chỗ gánh: cửa thật là authoritativeValidate(), nơi mọi
  // đường chạy (nút Run lẫn run.trial của Bridge) đều BẮT BUỘC băm lại trước khi một job
  // nào được bỏ qua. Không run nào khởi động được trên hàng text chưa băm lại.
  function validSavedAttribution(job = {}, hashVerdict) {
    const taskType = lower(job.task_type) || "image_generation";
    if (taskType === "text_reasoning") {
      if (hashVerdict === false) return false;
      const response = String(job.response_text ?? "");
      const charCount = Number(job.response_char_count);
      return bool(job.persistence_verified)
        && lower(job.output_type) === "text"
        && Boolean(response.trim())
        && Number.isInteger(charCount)
        && charCount === response.length
        && /^sha256:[A-Za-z0-9_-]{20,}$/.test(text(job.response_sha256));
    }
    const result = leaf(job.result_file);
    if (!bool(job.persistence_verified) || !result) return false;
    const requested = leaf(job.requested_file);
    return !requested || requested === result;
  }
  function classify(job = {}, hashVerdict) {
    const status = lower(job.status);
    if (["success", "done"].includes(status) && validSavedAttribution(job, hashVerdict)) return { state: "SAFE_COMPLETE", code: "", message: "Verified persisted output; skip on continuation." };
    // Dấu vân tay lệch có mã RIÊNG: gộp chung vào AMBIGUOUS chung chung thì người đọc
    // tưởng job bị ngắt giữa chừng, trong khi sự thật là ô câu trả lời trên đĩa đã KHÁC với
    // cái ChatGPT trả về. Hai việc khác nhau, hai cách xử lý khác nhau.
    if (hashVerdict === false) return { state: "AMBIGUOUS_SUBMITTED", code: "RESUME_RESPONSE_HASH_MISMATCH", message: "Câu trả lời đã lưu không còn khớp dấu vân tay response_sha256 ghi lúc chạy. Ô này đã bị sửa sau khi ghi." };
    if (bool(job.recreate_operator_approved)) return { state: "AMBIGUOUS_SUBMITTED", code: "RESUME_RECREATE_INCOMPLETE", message: "Operator-approved recreate has not produced a verified persisted output. Continue remains blocked." };
    // FAILED is only ever reached after the runner exhausted every retry on a
    // non-hard-stop failure (pre- or post-submit alike) and deliberately gave
    // up -- see resolveJobFailure() in sidepanel.js. That is already a
    // settled, safe-to-skip outcome, so it never blocks continuation here,
    // regardless of phase. A job still mid-attempt when a real hard stop hit
    // (CAPTCHA/quota/receiver lost) is INTERRUPTED, not FAILED, and correctly
    // falls through to AMBIGUOUS_SUBMITTED below.
    if (status === "failed") return { state: "SAFE_FAILED", code: "", message: "Failure exhausted its retries and was skipped; safe to leave behind, or retry deliberately via Run Failed." };
    if (!hasSubmittedBoundary(job) && ["", "pending", "eligible"].includes(status)) return { state: "SAFE_PENDING", code: "", message: "No submitted boundary recorded; eligible for normal readiness-gated execution." };
    return { state: "AMBIGUOUS_SUBMITTED", code: "RESUME_AMBIGUOUS_SUBMISSION", message: "Interrupted by a hard stop; outcome is not safely attributable. Manual review required." };
  }
  function validateLedger(workbook) {
    const findings = [];
    if (!workbook?.jobs?.length) findings.push({ code: "RESUME_LEDGER_INVALID", severity: "BLOCKER", scope: "resume", message: "Recovery ledger has no jobs.", guidance: "Select a supported Result XLSX for this run." });
    const ids = new Set();
    for (const job of workbook?.jobs || []) {
      const id = lower(job.id);
      if (!id || ids.has(id)) findings.push({ code: "RESUME_LEDGER_INVALID", severity: "BLOCKER", scope: "resume", message: `Duplicate or missing job ID '${text(job.id) || "(blank)"}'.`, guidance: "Use the original unmodified Result XLSX." });
      ids.add(id);
    }
    const recordedLedger = leaf(workbook?.config?.effective_result_xlsx);
    if (recordedLedger && recordedLedger !== leaf(workbook?.fileName)) findings.push({ code: "RESUME_RUN_ID_MISMATCH", severity: "BLOCKER", scope: "resume", message: `Selected Result XLSX '${leaf(workbook?.fileName)}' does not match ledger provenance '${recordedLedger}'.`, guidance: "Select the Result XLSX recorded by this run; do not substitute a similarly named workbook." });
    return findings;
  }
  function activeJobs(workbook) {
    const xlsx = globalThis.DacXlsx || globalThis.window?.DacXlsx;
    if (xlsx?.activeJobs) return xlsx.activeJobs(workbook);
    return (workbook?.jobs || [])
      .map((job, physicalIndex) => ({ job, physicalIndex, position: Number(job.queue_position) > 0 ? Number(job.queue_position) : Number.MAX_SAFE_INTEGER }))
      .filter(({ job }) => !bool(job.queue_removed))
      .sort((left, right) => left.position - right.position || left.physicalIndex - right.physicalIndex)
      .map(({ job }) => job);
  }
  function checkpointValidation(workbook, filename, pattern, expectedRunId = "") {
    const fileName = leaf(filename);
    const parsed = globalThis.DacCheckpointCore?.parse(pattern, fileName) || null;
    const findings = validateLedger(workbook);
    const config = workbook?.config || {};
    const run = identity(workbook);
    if (expectedRunId && run.run_id !== expectedRunId) findings.push({ code: "RESUME_RUN_ID_MISMATCH", severity: "BLOCKER", scope: "resume", message: `Checkpoint '${fileName}' belongs to run '${run.run_id}', not '${expectedRunId}'.`, guidance: "Choose checkpoints from one run only." });
    if (parsed) {
      const version = Number(config.checkpoint_version);
      const recorded = leaf(config.checkpoint_filename);
      const createdAt = Date.parse(text(config.checkpoint_created_at));
      if (!text(config.run_id) || run.provenance !== "persisted" || version !== parsed.version || recorded !== fileName || !Number.isFinite(createdAt)) findings.push({ code: "RESUME_LATEST_CHECKPOINT_INVALID", severity: "BLOCKER", scope: "resume", message: `Checkpoint '${fileName}' is missing or has inconsistent checkpoint metadata.`, guidance: "Restore the valid latest checkpoint; do not fall back automatically." });
      if (leaf(config.effective_result_xlsx) !== fileName) findings.push({ code: "RESUME_LATEST_CHECKPOINT_INVALID", severity: "BLOCKER", scope: "resume", message: `Checkpoint '${fileName}' does not record itself as the effective Result XLSX.`, guidance: "Use an unmodified verified checkpoint." });
    } else if (!/__results\.xlsx$/i.test(fileName)) {
      findings.push({ code: "RESUME_LEDGER_INVALID", severity: "BLOCKER", scope: "resume", message: `Result XLSX '${fileName}' does not match the configured checkpoint pattern.`, guidance: "Choose a matching Result checkpoint." });
    }
    return { run, parsed, findings, ready: findings.every((item) => item.severity !== "BLOCKER") };
  }
  function plan(workbook) {
    const run = identity(workbook);
    const findings = validateLedger(workbook);
    const active = activeJobs(workbook);
    const jobs = active.map((job) => ({ job_id: text(job.id), ...classify(job, verdictFor(workbook, job)) }));
    const count = (state) => jobs.filter((item) => item.state === state).length;
    const ambiguous = jobs.filter((item) => item.state === "AMBIGUOUS_SUBMITTED");
    for (const item of ambiguous) findings.push({ code: item.code, severity: "BLOCKER", scope: "resume", job_ids: [item.job_id], message: item.message, guidance: "Do not submit this job again. Review the prior ChatGPT outcome and persisted artifact manually." });
    const summary = { total: jobs.length, completed: count("SAFE_COMPLETE"), safe_pending: count("SAFE_PENDING"), failed: count("SAFE_FAILED"), ambiguous_submitted: ambiguous.length, missing_artifacts: jobs.filter((item) => item.state === "AMBIGUOUS_SUBMITTED" && ["success", "done"].includes(lower(active.find((job) => text(job.id) === item.job_id)?.status))).length };
    const next = jobs.find((item) => item.state === "SAFE_PENDING") || jobs.find((item) => item.state === "SAFE_FAILED") || null;
    return { run, jobs, findings, summary, next_eligible_job: next?.job_id || null, ready: findings.every((item) => item.severity !== "BLOCKER") };
  }
  function applyToQueue(queue = [], recovery = []) {
    const byId = new Map(recovery.map((item) => [item.job_id, item]));
    for (const item of queue) {
      const recoveryItem = byId.get(text(item.job?.id));
      if (!recoveryItem) continue;
      item.recovery_state = recoveryItem.state;
      if (recoveryItem.state === "SAFE_COMPLETE") { item.status = "SUCCESS"; item.phase = "SUCCESS"; item.skipped = true; item.protected_checkpoint = true; }
      else if (recoveryItem.state === "SAFE_PENDING") { item.status = "PENDING"; item.phase = "PRE_SUBMIT"; item.skipped = false; item.protected_checkpoint = false; }
      else if (recoveryItem.state === "SAFE_FAILED") { item.status = "FAILED"; item.phase = "PRE_SUBMIT"; item.skipped = false; item.protected_checkpoint = false; }
      else if (item.operator_recreate) { item.status = "PENDING"; item.phase = "PRE_SUBMIT"; item.skipped = false; item.protected_checkpoint = false; item.recovery_state = "RECREATE_APPROVED"; }
      else { item.status = "INTERRUPTED"; item.skipped = true; item.protected_checkpoint = true; }
    }
    return queue;
  }
  function summaryText(summary) { return `${summary.completed} completed · ${summary.safe_pending} safe pending · ${summary.failed} failed (skipped) · ${summary.ambiguous_submitted} need review`; }

  (typeof window !== "undefined" ? window : globalThis).DacResumeCore = { createRunId, legacyRunId, identity, verifyResponseHashes, validSavedAttribution, classify, validateLedger, checkpointValidation, plan, applyToQueue, summaryText };
})();
