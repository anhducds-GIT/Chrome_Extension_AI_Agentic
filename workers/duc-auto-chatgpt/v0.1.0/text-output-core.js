(() => {
  "use strict";

  const TASK_TYPES = Object.freeze(["image_generation", "text_reasoning"]);
  const MAX_XLSX_TEXT_CHARS = 32767;

  function taskType(value) {
    const normalized = String(value || "").trim().toLowerCase() || "image_generation";
    if (!TASK_TYPES.includes(normalized)) {
      throw new Error(`INVALID_TASK_TYPE: expected ${TASK_TYPES.join(" or ")}, received '${value}'.`);
    }
    return normalized;
  }

  function capture(result) {
    if (!result || result.type !== "text" || typeof result.text !== "string" || !result.text.trim()) {
      throw new Error("TEXT_RESPONSE_MISSING: ChatGPT did not return a non-empty attributable text response.");
    }
    // An XML parser turns \r\n and a lone \r into \n when it reads a text node
    // (XML 1.0 §2.11), and checkpointWorkbook() re-parses the whole workbook on
    // EVERY checkpoint. Storing a raw \r would therefore make
    // response_char_count unsatisfiable the moment the Result XLSX is reopened:
    // resume would classify a perfectly good answer AMBIGUOUS_SUBMITTED and
    // offer to "create it again" -- asking ChatGPT the same question twice for
    // a response already safely on disk. Normalise once, here, so the value we
    // count and hash is the value that survives the round trip.
    const responseText = result.text.replace(/\r\n?/g, "\n");
    if (responseText.length > MAX_XLSX_TEXT_CHARS) {
      throw new Error(`TEXT_RESPONSE_TOO_LARGE: response has ${responseText.length} characters; XLSX supports at most ${MAX_XLSX_TEXT_CHARS} in one cell.`);
    }
    return { response_text: responseText, response_char_count: responseText.length };
  }

  function ledgerFields(captured, responseSha256) {
    if (!captured || typeof captured.response_text !== "string") throw new TypeError("Captured text output is required.");
    if (typeof responseSha256 !== "string" || !responseSha256) throw new TypeError("Response SHA-256 is required.");
    return {
      task_type: "text_reasoning",
      output_type: "text",
      response_text: captured.response_text,
      response_char_count: String(captured.response_char_count),
      response_sha256: responseSha256,
      requested_file: "",
      result_file: "",
      result_files: "",
      image_count: "",
      result_download_id: "",
      write_outcome: "text_checkpointed",
      persistence_verified: false,
      detected_not_downloaded: false
    };
  }

  function auditFields(captured, responseSha256) {
    return {
      output_type: "text",
      response_char_count: captured.response_char_count,
      response_sha256: responseSha256
    };
  }

  // What the run loop does with a content-script reply, as a pure decision so
  // it can be tested without the side panel. Pass B (2026-08-28) found this
  // rule was pinned only by a regex over sidepanel.js source: renaming a
  // variable or reordering two `if` blocks kept every test green while a text
  // job silently fell into the image-persistence path.
  //
  // completed/halted are the dispatch's OWN verdict for the two terminal
  // actions. They are null where a finisher decides the outcome instead.
  const DISPATCH_ACTIONS = Object.freeze({
    IMAGE_OUTPUT: "image_output",
    TEXT_OUTPUT: "text_output",
    USER_STOP: "user_stop",
    TEXT_HALT_NO_RESEND: "text_halt_no_resend",
    IMAGE_RECONCILE: "image_reconcile",
    FAILURE: "failure"
  });

  function dispatchOutcome({ task, ok = false, result = null, stopRequested = false, postSubmit = false } = {}) {
    const isText = taskType(task) === "text_reasoning";
    // A text answer can legitimately CONTAIN a picture, so result.image_url is
    // often set on a text reply. Gating on the job's declared type -- not on
    // the presence of an image -- is what stops a text job from being diverted
    // into image download, attribution and reconciliation it never preflighted.
    if (!isText && ok && result?.image_url) return { action: DISPATCH_ACTIONS.IMAGE_OUTPUT, completed: null, halted: null };
    if (isText && ok && result?.type === "text") return { action: DISPATCH_ACTIONS.TEXT_OUTPUT, completed: null, halted: null };
    if (stopRequested) return { action: DISPATCH_ACTIONS.USER_STOP, completed: true, halted: false };
    // The prompt was submitted and no attributable answer came back.
    // Reconciliation is image-only evidence, so for text the sole safe move is
    // to halt: re-sending would ask ChatGPT the same question a second time.
    if (isText && postSubmit) return { action: DISPATCH_ACTIONS.TEXT_HALT_NO_RESEND, completed: true, halted: true };
    if (postSubmit) return { action: DISPATCH_ACTIONS.IMAGE_RECONCILE, completed: null, halted: null };
    return { action: DISPATCH_ACTIONS.FAILURE, completed: null, halted: null };
  }

  async function verifiedTextTransition({
    result,
    hashText,
    onDetected = async () => {},
    onLedger = async () => {},
    persistCheckpoint,
    onVerified = async () => {}
  } = {}) {
    if (typeof hashText !== "function") throw new TypeError("Text response hash callback is required.");
    if (typeof persistCheckpoint !== "function") throw new TypeError("Text checkpoint persistence callback is required.");
    if (typeof onDetected !== "function" || typeof onLedger !== "function" || typeof onVerified !== "function") {
      throw new TypeError("Text transition hooks must be functions.");
    }
    const captured = capture(result);
    const responseSha256 = await hashText(captured.response_text);
    const audit = auditFields(captured, responseSha256);
    const ledger = ledgerFields(captured, responseSha256);
    await onDetected({ captured, responseSha256, audit });
    await onLedger({ captured, responseSha256, audit, ledger });
    const checkpoint = await persistCheckpoint({ captured, responseSha256, audit, ledger });
    if (!checkpoint) throw new Error("PERSISTENCE_VERIFICATION_FAILED: Text response checkpoint was not verified.");
    await onVerified({ captured, responseSha256, audit, ledger, checkpoint });
    return { captured, responseSha256, audit, ledger: { ...ledger, persistence_verified: true }, checkpoint };
  }

  const api = { TASK_TYPES, MAX_XLSX_TEXT_CHARS, DISPATCH_ACTIONS, taskType, capture, ledgerFields, auditFields, dispatchOutcome, verifiedTextTransition };
  (typeof window !== "undefined" ? window : globalThis).DacTextOutputCore = api;
})();
