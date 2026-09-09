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
  /* ═══ CODEX AUDIT 09/09 BẮT ĐƯỢC MỘT LỖI THẬT Ở ĐÂY, và nó là loại tệ nhất ═══

     BẢN CŨ chỉ so **160 ký tự ĐẦU** và lấy lượt hỏi khớp **CUỐI CÙNG**. Đo lại được ngay:
     hai job dùng chung một đoạn mở đầu 173 ký tự — **đúng hình dạng workbook của Đức**, nơi
     mọi job ảnh chia sẻ một đoạn tả phong cách — cho ra CÙNG một khoá. Hệ quả trên đường chữ
     đã ship sáng nay: `answerAfterPrompt()` neo vào lượt hỏi của **job khác** và
     `finishTextOutput()` ghi **câu trả lời của job khác** vào sổ, đóng dấu
     `persistence_verified`. Đó là **báo thành công giả**, đúng loại lỗi B-43 vừa đóng.

     HAI VIỆC SỬA, và việc thứ hai mới là việc chịu tải:

     ⑴ Khoá lấy **ĐẦU + ĐUÔI**. Với prompt theo mẫu, phần phân biệt nằm ở **cuối** ("Chủ thể:
       một con mèo…"), nên khoá chỉ-lấy-đầu là khoá bỏ đúng phần phân biệt. KHÔNG chuyển sang
       so TRỌN prompt: `innerText` dựng lại markdown (`**đậm**` mất hai dấu sao), nên so trọn
       sẽ **không khớp gì cả** và biến một lỗi báo-thành-công-giả thành một lỗi không-bao-giờ-
       đối-soát-được. Đầu+đuôi giữ được tính chịu-lệch đó.

     ⑵ **Phải khớp DUY NHẤT.** Đây là chỗ khoá thật, vì ⑴ chỉ làm trùng khoá HIẾM hơn chứ
       không làm nó bất khả. Trùng khoá → **từ chối kết luận**, không phải "lấy cái cuối".
       Rơi về phía an toàn: một job không đối soát được thì người xem; một job đối soát vào
       lượt của job khác thì dữ liệu sai đi thẳng vào sổ và không ai thấy.

     GIỚI HẠN CÒN LẠI, ghi ra vì nó là việc thật: cách sửa ĐÚNG là neo vào
     `data-message-id` của lượt hỏi, ghi lại lúc gửi. Nó không cần so chữ nào cả. Chưa làm
     vì mã đó phải sống qua một cú F5 — cùng gốc với `B-45`. */
  const PROMPT_MATCH_CHARS = 160;
  function promptKey(value) {
    const phang = String(value || "").replace(/\s+/g, " ").trim();
    if (phang.length <= PROMPT_MATCH_CHARS * 2) return phang;
    return phang.slice(0, PROMPT_MATCH_CHARS) + "\u2026" + phang.slice(-PROMPT_MATCH_CHARS);
  }
  /* Trả về chỉ số lượt hỏi khớp khi và chỉ khi có ĐÚNG MỘT lượt khớp.
       -1 = không lượt nào · -2 = NHIỀU HƠN MỘT, tức không kết luận được. */
  const MATCH_NONE = -1;
  const MATCH_AMBIGUOUS = -2;
  function soleUserTurnIndex(rows, promptText) {
    const want = promptKey(promptText);
    if (!want) return MATCH_NONE;
    let at = MATCH_NONE;
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      if (row?.role !== "user") continue;
      // Một lượt bị cắt ở nắp đọc KHÔNG được coi là khớp: chữ của nó không đầy đủ nên
      // phép so nói về một thứ khác với thứ ta hỏi.
      if (row?.truncated === true) continue;
      if (promptKey(row?.text) !== want) continue;
      if (at !== MATCH_NONE) return MATCH_AMBIGUOUS;
      at = i;
    }
    return at;
  }
  function answerAfterPrompt(turns, promptText) {
    if (!promptKey(promptText)) return { found: false, reason: "NO_PROMPT", text: "" };
    const rows = Array.isArray(turns) ? turns : [];
    // KHỚP DUY NHẤT, không phải "lượt khớp cuối cùng". Bản cũ lấy lượt cuối, và Codex audit
    // 09/09 chỉ ra hệ quả: hai job chung đoạn mở đầu dài thì nó neo vào lượt của job KHÁC và
    // ghi câu trả lời của job khác vào sổ. Trùng khoá nay là "không kết luận được".
    const at = soleUserTurnIndex(rows, promptText);
    if (at === MATCH_AMBIGUOUS) return { found: false, reason: "AMBIGUOUS_PROMPT_MATCH", text: "" };
    if (at === MATCH_NONE) return { found: false, reason: "PROMPT_NOT_IN_CONVERSATION", text: "" };
    const reply = rows.slice(at + 1).find((row) => row?.role === "assistant");
    const text = String(reply?.text || "");
    if (!text.trim()) return { found: true, reason: "NO_ANSWER_YET", text: "" };
    return { found: true, reason: "OK", text };
  }


  const api = { proofFromRecordedAttempt, verifyExistingOutput, matchesRequest, safeComplete, PROMPT_MATCH_CHARS, promptKey, answerAfterPrompt, soleUserTurnIndex, MATCH_NONE, MATCH_AMBIGUOUS };
  (typeof window !== "undefined" ? window : globalThis).DacReconciliationCore = api;
})();
