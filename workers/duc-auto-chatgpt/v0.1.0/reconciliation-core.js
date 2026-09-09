(() => {
  "use strict";

  const text = (value) => String(value ?? "").trim();
  const unique = (values) => [...new Set(values.filter(Boolean))];
  const fail = (code, message) => ({ ok: false, code, message });

  function parseDiagnostics(value) {
    if (value && typeof value === "object") return value;
    try { return JSON.parse(text(value)); } catch { return null; }
  }

  // Creates the immutable proof carried from the persisted submitted attempt
  // into the operator-triggered, read-only DOM inspection.
  function proofFromRecordedAttempt({ run_id, job = {} } = {}) {
    const diagnostics = parseDiagnostics(job.detection_diagnostics);
    const chosen = diagnostics?.decision?.chosen;
    const baseline = diagnostics?.baseline_source_ids;
    const attribution = text(diagnostics?.chosen_attribution);
    if (!text(run_id)) return fail("RECONCILIATION_RUN_ID_MISSING", "The persisted run ID is required for reconciliation.");
    if (!text(job.id) || !text(job.attempt_id) || !text(job.submitted_at)) return fail("RECONCILIATION_ATTEMPT_IDENTITY_MISSING", "The original job, attempt ID, and submission timestamp are required.");
    if (!Array.isArray(baseline) || !diagnostics?.decision || !text(chosen?.source_id) || !["post_turn", "new_visible_fallback"].includes(attribution)) return fail("RECONCILIATION_RECORDED_EVIDENCE_MISSING", "The original immutable image boundary or selected attribution is unavailable.");
    if (chosen.input || chosen.role === "user") return fail("RECONCILIATION_RECORDED_INPUT", "The recorded candidate was an input/reference image.");
    if (Number(diagnostics?.decision?.fresh?.eligible) !== 1) return fail("RECONCILIATION_RECORDED_AMBIGUOUS", "The original attempt did not record exactly one eligible generated image.");
    return {
      ok: true,
      proof: Object.freeze({
        run_id: text(run_id),
        job_id: text(job.id),
        attempt_id: text(job.attempt_id),
        submitted_at: text(job.submitted_at),
        baseline_source_ids: Object.freeze([...baseline].map(text)),
        expected_source_id: text(chosen.source_id),
        attribution
      })
    };
  }

  function verifyExistingOutput({ proof, candidates = [] } = {}) {
    if (!proof?.run_id || !proof?.job_id || !proof?.attempt_id || !proof?.submitted_at || !proof?.expected_source_id || !Array.isArray(proof?.baseline_source_ids)) return fail("RECONCILIATION_PROOF_INVALID", "The reconciliation proof is incomplete.");
    const expected = candidates.filter((candidate) => candidate?.source_id === proof.expected_source_id);
    if (!expected.length) return fail("ATTRIBUTION_NOT_PROVEN", "The recorded generated image is not visible in this conversation.");
    if (proof.baseline_source_ids.includes(proof.expected_source_id)) return fail("ATTRIBUTION_NOT_PROVEN", "The recorded candidate was already present before submission.");
    if (expected.some((candidate) => !candidate.visible)) return fail("ATTRIBUTION_NOT_PROVEN", "The recorded generated image is not visible.");
    if (expected.some((candidate) => !candidate.ready)) return fail("ATTRIBUTION_NOT_PROVEN", "The recorded generated image is not fully loaded.");
    if (expected.some((candidate) => candidate.input || candidate.role === "user")) return fail("ATTRIBUTION_NOT_PROVEN", "The recorded generated image is an input/reference image.");
    const baseline = new Set(proof.baseline_source_ids);
    const eligible = unique(candidates.filter((candidate) => candidate?.visible && candidate?.ready && !candidate?.input && candidate?.role !== "user" && !baseline.has(candidate?.source_id)).map((candidate) => candidate.source_id));
    if (eligible.length !== 1 || eligible[0] !== proof.expected_source_id) return fail("ATTRIBUTION_NOT_PROVEN", "The current conversation does not contain exactly one eligible image matching the recorded submitted boundary.");
    const candidate = expected.find((item) => item.visible && item.ready && !item.input && item.role !== "user");
    return { ok: true, candidate, proof };
  }

  function matchesRequest(proof, context = {}) {
    if (!proof) return fail("RECONCILIATION_PROOF_INVALID", "The reconciliation proof is missing.");
    for (const key of ["run_id", "job_id", "attempt_id", "submitted_at"]) {
      if (text(proof[key]) !== text(context[key])) return fail("RECONCILIATION_IDENTITY_MISMATCH", `The ${key} does not match the persisted submitted attempt.`);
    }
    return { ok: true };
  }

  function safeComplete({ attribution, imagePersisted, checkpointPersisted } = {}) {
    return Boolean(attribution?.ok && imagePersisted && checkpointPersisted);
  }

  /* ĐỐI SOÁT CHỮ — B-43 vòng ba. Tìm câu trả lời cho ĐÚNG prompt của mình trong một hội
     thoại đã đọc về, không đọc DOM, không nhận biến ngoài.

     VÌ SAO CẦN NÓ. Đo live 09/09: tab bị che thì Chrome không cấp khung hình, nên trang
     ChatGPT KHÔNG VẼ chữ vào DOM — máy đọc thấy 25 ký tự và đứng yên 160 giây, trong khi
     câu trả lời đã nằm đủ trên máy chủ. Một cú F5 lấy lại bản thật: 25 → 1.611 ký tự,
     không sinh lại, không gửi lại. Đức 99% thời gian để tab bị che, nên đây là đường
     CHÍNH, không phải ca ngoại lệ.

     VÌ SAO ĐỐI SOÁT BẰNG LƯỢT HỎI, KHÔNG PHẢI "lượt trả lời cuối". `latestAssistantText()`
     trả về lượt cuối của TRANG, mà trang có thể đã trôi sang hội thoại khác hoặc có lượt
     người dùng gõ tay chen vào. Neo vào chính prompt của job là thứ duy nhất buộc câu trả
     lời VỚI câu hỏi — cùng luật attribution mà đường ảnh đã theo. Không thấy lượt hỏi của
     mình thì KHÔNG kết luận gì: `found: false` là "chưa chứng minh được", không phải "chưa
     trả lời".

     So khớp 160 ký tự đầu sau khi bóp mọi khoảng trắng thành một dấu cách: `innerText` gói
     lại dòng theo bề rộng khung, nên so nguyên văn cả prompt là so hai thứ khác nhau. */
  const PROMPT_MATCH_CHARS = 160;
  function promptKey(value) {
    return String(value || "").replace(/\s+/g, " ").trim().slice(0, PROMPT_MATCH_CHARS);
  }
  function answerAfterPrompt(turns, promptText) {
    const want = promptKey(promptText);
    if (!want) return { found: false, reason: "NO_PROMPT", text: "" };
    const rows = Array.isArray(turns) ? turns : [];
    // LƯỢT HỎI CUỐI khớp, không phải lượt đầu: cùng một prompt có thể được gửi lại trong
    // một hội thoại dài, và câu trả lời cần đối soát luôn là câu của lần gần nhất.
    let at = -1;
    for (let i = 0; i < rows.length; i += 1) {
      if (rows[i]?.role === "user" && promptKey(rows[i]?.text) === want) at = i;
    }
    if (at < 0) return { found: false, reason: "PROMPT_NOT_IN_CONVERSATION", text: "" };
    const reply = rows.slice(at + 1).find((row) => row?.role === "assistant");
    const text = String(reply?.text || "");
    if (!text.trim()) return { found: true, reason: "NO_ANSWER_YET", text: "" };
    return { found: true, reason: "OK", text };
  }

  /* B-41 ⑵ (ADR-0050 ⒞) — BỘ DÒ MÙ TỰ KIỂM BẰNG CHÍNH THỨ NÓ ĐỌC ĐƯỢC.

     `DETECTION_BLIND` nghĩa là "0 lượt trả lời trên trang sau trọn thời gian chờ". Hai
     nguyên nhân trông y hệt nhau từ bên trong:
       ⑴ trang chưa VẼ (tab bị che nên Chrome không cấp khung hình) — kết quả ĐÃ CÓ trên
         máy chủ; đây là đường CHÍNH trên máy Đức, đo được ở B-43;
       ⑵ máy chủ thật sự không tạo ra gì.
     Gửi lại ở ca ⑴ là đốt lượt quota thứ hai cho một việc đã xong — đúng cái ADR-0047 sinh
     ra để chặn. Nên "không thấy gì" KHÔNG BAO GIỜ đủ để gửi lại; phải KHẲNG ĐỊNH được là
     không có. Hàm này là chỗ phát biểu "khẳng định được" thành một phép đo.

     BA VẾ, cả ba đều bắt buộc:
       ⒜ lượt hỏi của chính job này nằm trong hội thoại → bộ đọc lượt NGƯỜI còn sống, và
         prompt đã tới đích. Cùng phép neo mà `answerAfterPrompt()` dùng.
       ⒝ có ÍT NHẤT MỘT lượt trả lời ở đâu đó trong hội thoại → bộ đọc lượt TRỢ LÝ còn
         sống. ĐÂY LÀ VẾ CHỊU TẢI, và thiếu nó thì cả hàm thành một cái bẫy: một selector
         trợ lý bị mục đọc ra "không có lượt trả lời nào" ở MỌI hội thoại, nên phép tự kiểm
         sẽ KHẲNG ĐỊNH SAI là máy chủ không tạo gì — rồi gửi lại một prompt đã có kết quả.
         Vế ⒜ một mình KHÔNG đủ: hai selector khác nhau, mục cái nào là chuyện riêng của
         cái đó.
       ⒞ ngay sau lượt hỏi của mình KHÔNG có lượt trả lời nào.

     Hội thoại mới toanh, chỉ có đúng lượt hỏi của mình, thì ⒝ không đạt → KHÔNG khẳng
     định. Đó là chủ ý, không phải chỗ thiếu: lúc đó không có cách nào phân biệt "selector
     mục" với "chưa trả lời", và đoán ở chỗ đó là đoán bằng quota của Đức.

     Thiếu bất kỳ vế nào → `affirmed: false`, lớp gọi dừng hẳn đúng như hôm nay. */
  function blindAbsenceAffirmed(turns, promptText) {
    const rows = Array.isArray(turns) ? turns : [];
    const assistantTurns = rows.filter((row) => row?.role === "assistant").length;
    const so = (affirmed, reason) => ({ affirmed, reason, assistant_turns: assistantTurns, turns_read: rows.length });
    const want = promptKey(promptText);
    if (!want) return so(false, "NO_PROMPT");
    let at = -1;
    for (let i = 0; i < rows.length; i += 1) {
      if (rows[i]?.role === "user" && promptKey(rows[i]?.text) === want) at = i;
    }
    if (at < 0) return so(false, "PROMPT_NOT_IN_CONVERSATION");
    if (!assistantTurns) return so(false, "ASSISTANT_READER_UNPROVEN");
    if (rows.slice(at + 1).some((row) => row?.role === "assistant")) return so(false, "REPLY_EXISTS");
    return so(true, "NO_REPLY_AFTER_PROMPT");
  }

  const api = { proofFromRecordedAttempt, verifyExistingOutput, matchesRequest, safeComplete, PROMPT_MATCH_CHARS, promptKey, answerAfterPrompt, blindAbsenceAffirmed };
  (typeof window !== "undefined" ? window : globalThis).DacReconciliationCore = api;
})();
