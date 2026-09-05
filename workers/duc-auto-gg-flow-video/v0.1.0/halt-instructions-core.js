/* Operator-facing Halt taxonomy. English first (canonical App codes and
   terms), with a Vietnamese explanation/suggestion in parentheses right
   after -- by request, so the operator learns the English terms while
   using the tool rather than reading a fully localized guide.

   Only three codes are true Hard Stops: SECURITY_HARD_STOP,
   GENERATION_LIMIT_REACHED, RECEIVER_LOST. Each means no further job can
   safely run at all -- the whole batch stops and needs a human to resolve
   the underlying block. Every other code here is Recoverable: the job is
   retried automatically (a fresh prompt submission, up to the configured
   retry limit) and, if it still fails, is marked FAILED and skipped so the
   rest of the queue keeps running. See runner-core.js's
   HARD_STOP_FAILURE_TYPES / canRetry and sidepanel.js's resolveJobFailure
   for the implementation this guide describes. */
(() => {
  "use strict";

  const HALT_GROUPS = Object.freeze([
    Object.freeze({
      title: "Security hard stop",
      codes: Object.freeze(["SECURITY_HARD_STOP"]),
      retry: "No -- hard stop, whole batch stops (Không -- dừng cứng, dừng toàn bộ batch)",
      meaning: "Flow is asking for a CAPTCHA, human verification, or has flagged unusual activity. (Flow yêu cầu CAPTCHA, xác minh con người, hoặc báo hoạt động bất thường.)",
      action: "Open the Flow tab yourself, complete the CAPTCHA/verification, and wait until the composer works normally again. Then Check Plan and Continue Run. Do not try to bypass it, and do not resend the job before the warning clears. (Mở đúng tab Flow, tự hoàn tất CAPTCHA/xác minh, chờ composer hoạt động bình thường trở lại. Sau đó Check Plan rồi Continue Run. Không cố bypass, không gửi lại job trước khi cảnh báo biến mất.)"
    }),
    Object.freeze({
      title: "Generation limit reached",
      codes: Object.freeze(["GENERATION_LIMIT_REACHED"]),
      retry: "No -- hard stop, whole batch stops (Không -- dừng cứng, dừng toàn bộ batch)",
      meaning: "This account is out of generation credits. (Tài khoản này đã hết credit tạo video.)",
      action: "Switch to another Chrome profile signed in to a different account, then run the next chain against that profile. A free account carries 50 credits and a 360p video costs 7, so one account covers 7 videos -- a full trial chain is deliberately sized to exactly that, so hitting this wall mid-chain means the account was already partly spent. Nothing was charged for the job that stopped here: the wall is checked before the one guarded Create click. (Đổi sang hồ sơ Chrome đang đăng nhập tài khoản khác, rồi chạy chuỗi tiếp theo trên hồ sơ đó. Tài khoản free có 50 credit, video 360p tốn 7, nên một tài khoản đủ 7 video -- một chuỗi trial đầy được đặt đúng bằng con số đó, vì vậy chạm tường giữa chừng nghĩa là tài khoản đã tiêu bớt từ trước. Job dừng ở đây KHÔNG bị trừ credit nào: tường được kiểm trước cú bấm Create duy nhất.)"
    }),
    Object.freeze({
      title: "Receiver lost",
      codes: Object.freeze(["RECEIVER_LOST"]),
      retry: "No -- hard stop, whole batch stops (Không -- dừng cứng, dừng toàn bộ batch)",
      meaning: "The extension lost its connection to the Flow tab, composer, or content receiver. (Extension mất kết nối với tab Flow, composer, hoặc content receiver.)",
      action: "Reload the correct Flow tab, wait for the composer to become available, then Check Plan and Continue Run. This stays a hard stop on purpose: if the tab is genuinely gone, auto-retrying would just fail every remaining job in the queue back-to-back without producing anything. (Tải lại đúng tab Flow, chờ composer sẵn sàng, rồi Check Plan và Continue Run. Đây vẫn là hard stop có chủ đích: nếu tab thật sự mất, tự động retry sẽ chỉ khiến mọi job còn lại trong queue fail liên tục mà không tạo được video nào.)"
    }),
    Object.freeze({
      title: "Attempt ID mismatch",
      codes: Object.freeze(["ATTEMPT_ID_MISMATCH"]),
      retry: "Yes, then skip if it keeps happening (Có, tự động thử lại; nếu vẫn lỗi thì bỏ qua job)",
      meaning: "The response that came back didn't match the job/attempt being tracked -- most often the extension briefly lost track of which tab or attempt it was watching. (Phản hồi nhận về không khớp job/attempt đang được theo dõi -- thường do extension tạm thời lẫn tab hoặc lẫn attempt.)",
      action: "The batch does not stop for this. The job resubmits automatically up to your configured retry limit; if it keeps mismatching, it is marked FAILED and skipped so the rest of the queue keeps running. Open Technical details afterward if you want to double-check which attempt actually landed. (Batch không dừng vì lỗi này. Job tự động gửi lại theo số lần cấu hình; nếu vẫn lệch, job được đánh dấu FAILED và bỏ qua để phần còn lại của queue tiếp tục chạy. Sau đó có thể mở Technical details để kiểm tra attempt nào thực sự đã submit.)"
    }),
    Object.freeze({
      title: "Post-submit uncertain",
      codes: Object.freeze(["POST_SUBMIT_UNCERTAIN", "TIMEOUT_AFTER_SUBMIT"]),
      retry: "Yes, then skip if still uncertain (Có, tự động thử lại; nếu vẫn không xác định được thì bỏ qua)",
      meaning: "The prompt was (or may have been) sent, but after waiting and reconciling, the extension still can't prove which new video belongs to this attempt. (Prompt đã hoặc có thể đã được gửi, nhưng sau khi chờ và đối chiếu, extension vẫn không chứng minh được video mới thuộc đúng attempt nào.)",
      action: "The batch does not stop. This retries by submitting the prompt again, up to your configured retry limit; if it is still uncertain after that, the job is marked FAILED and skipped and the queue moves to the next job. Because each retry resubmits the prompt, a job that actually did generate a video earlier may end up with more than one video in the chat -- open the chat afterward if you want to check for and clean up extras. Use Run Failed later for a deliberate one-off retry of anything skipped this way. (Batch không dừng. Job được gửi lại prompt theo số lần cấu hình; nếu vẫn không xác định được, job bị đánh dấu FAILED và bỏ qua, queue chạy tiếp job kế tiếp. Vì mỗi lần retry là gửi lại prompt mới, một job thật ra đã tạo video trước đó có thể sinh thêm video trùng trong đoạn chat -- có thể mở lại chat sau để kiểm tra/dọn video thừa. Dùng Run Failed sau này nếu muốn thử lại riêng job đã bị bỏ qua.)"
    }),
    Object.freeze({
      title: "Readiness timeout after save",
      codes: Object.freeze(["READINESS_TIMEOUT_AFTER_SAVE"]),
      retry: "Yes, then skip if still stuck (Có, tự động thử lại; nếu vẫn kẹt thì bỏ qua)",
      meaning: "The video was already saved, but Flow didn't return to a ready state within the allowed time. (Video đã được lưu nhưng Flow không trở lại trạng thái sẵn sàng trong thời gian cho phép.)",
      action: "The batch does not stop. Note this one retries the same way as every other code here -- by submitting a fresh prompt -- even though a video was already saved; if that retry also succeeds, its newly saved video becomes this job's recorded result and the earlier saved file is left on disk, just no longer the one tracked in the ledger. If you specifically want to keep the first saved video and only wait longer for readiness instead, say so and this can be special-cased. (Batch không dừng. Lưu ý case này vẫn retry theo đúng cơ chế chung -- gửi lại một prompt mới -- dù video trước đó đã lưu; nếu lần thử lại cũng thành công, video mới sẽ trở thành kết quả được ghi nhận cho job này, còn file video cũ vẫn nằm trên ổ đĩa nhưng không còn được ledger theo dõi nữa. Nếu bạn muốn giữ đúng video đầu tiên và chỉ chờ readiness lâu hơn thay vì gửi lại prompt, báo lại để xử lý riêng case này.)"
    }),
    Object.freeze({
      title: "Output ambiguous",
      codes: Object.freeze(["OUTPUT_AMBIGUOUS"]),
      retry: "Yes, then skip if still ambiguous (Có, tự động thử lại; nếu vẫn không rõ thì bỏ qua)",
      meaning: "An output exists but can't be confidently attributed to this attempt, or the detected video matches an input/reference image. (Có output nhưng không thể quy thuộc chắc chắn cho attempt này, hoặc video phát hiện trùng với ảnh input/reference.)",
      action: "The batch does not stop. This retries with a fresh prompt submission, up to your configured retry limit; if it is still ambiguous, the job is marked FAILED and skipped. Detection diagnostics stay available afterward if you want to compare the output against the input/reference manually. (Batch không dừng. Job được gửi lại prompt theo số lần cấu hình; nếu vẫn không rõ, job bị đánh dấu FAILED và bỏ qua. Detection diagnostics vẫn còn để bạn tự so sánh output với ảnh input/reference nếu cần.)"
    }),
    Object.freeze({
      title: "Download failed",
      codes: Object.freeze(["DOWNLOAD_FAILED"]),
      retry: "Yes, then skip if still failing (Có, tự động thử lại; nếu vẫn lỗi thì bỏ qua)",
      meaning: "An output was detected on Flow, but downloading or writing the video file failed. (Đã phát hiện output nhưng tải hoặc ghi file video thất bại.)",
      action: "The batch does not stop. This retries with a fresh prompt submission, up to your configured retry limit; if saving keeps failing, the job is marked FAILED and skipped -- worth checking disk space, folder permissions, or Output destination afterward so the next attempt (Run Failed) actually lands. (Batch không dừng. Job được gửi lại prompt theo số lần cấu hình; nếu vẫn không lưu được, job bị đánh dấu FAILED và bỏ qua -- nên kiểm tra dung lượng ổ đĩa, quyền thư mục, hoặc Output destination sau đó để lần Run Failed tiếp theo lưu được.)"
    }),
    Object.freeze({
      title: "Persistence verification failed",
      codes: Object.freeze(["PERSISTENCE_VERIFICATION_FAILED"]),
      retry: "Yes, then skip if still failing (Có, tự động thử lại; nếu vẫn lỗi thì bỏ qua)",
      meaning: "The video file was written, but it can't be reopened/verified as a valid, non-empty file. (File video đã được ghi nhưng không mở lại/xác minh được là file hợp lệ và không rỗng.)",
      action: "The batch does not stop. This retries with a fresh prompt submission, up to your configured retry limit; if verification keeps failing, the job is marked FAILED and skipped -- worth checking folder permissions and disk space afterward. (Batch không dừng. Job được gửi lại prompt theo số lần cấu hình; nếu vẫn không xác minh được, job bị đánh dấu FAILED và bỏ qua -- nên kiểm tra quyền thư mục và dung lượng ổ đĩa sau đó.)"
    }),
    Object.freeze({
      title: "Pre-submit failure",
      codes: Object.freeze(["TIMEOUT_PRE_SUBMIT", "ATTACHMENT_FAILED", "VALIDATION_FAILED", "OTHER"]),
      retry: "Yes, then skip if still failing (Có, tự động thử lại; nếu vẫn lỗi thì bỏ qua)",
      meaning: "The failure happened before the prompt was ever confirmed submitted -- timeout waiting for the composer, a reference-image attachment problem, a validation error (bad reference/config), or another unclassified error. (Lỗi xảy ra trước khi prompt được xác nhận đã gửi -- timeout chờ composer, lỗi đính kèm ảnh tham chiếu, lỗi validation (sai reference/cấu hình), hoặc lỗi khác chưa phân loại.)",
      action: "The batch does not stop. This retries up to your configured retry limit; if it keeps failing, the job is marked FAILED and skipped. A VALIDATION_FAILED job will usually keep failing the same way on every retry since nothing about the config changed -- fix the underlying reference/config and use Run Failed to try it again deliberately. (Batch không dừng. Job được tự động thử lại theo số lần cấu hình; nếu vẫn lỗi, job bị đánh dấu FAILED và bỏ qua. Riêng VALIDATION_FAILED thường sẽ lỗi giống hệt ở mọi lần retry vì cấu hình không đổi -- hãy sửa reference/cấu hình gốc rồi dùng Run Failed để thử lại job đó khi đã sẵn sàng.)"
    })
  ]);

  const SPECIAL_STATUS = Object.freeze({
    title: "Output persistence failed",
    code: "OUTPUT PERSISTENCE FAILED",
    meaning: "This is a Run-level artifact error, not a job Failure Type. The Audit JSONL and/or Result XLSX itself was not written or verified successfully; it can appear layered on top of another Halt. (Đây là lỗi artifact cấp Run, không phải một Failure Type của job. Audit JSONL và/hoặc Result XLSX không được ghi hoặc xác minh thành công; nó có thể xuất hiện chồng lên một Halt khác.)",
    action: "Open OUTPUT and Technical details to see exactly whether it was the Result XLSX or the Audit JSONL that failed. (Mở OUTPUT và Technical details để xác định chính xác Result XLSX hay Audit JSONL đã lỗi.)"
  });

  const NON_HALT_CODES = Object.freeze([
    Object.freeze({ title: "User stop", code: "USER_STOP", retry: "No -- this is an operator action, not an automatic Halt (Không -- đây là thao tác của người dùng, không phải Halt tự động)", meaning: "You pressed Stop yourself. (Bạn đã chủ động bấm Stop.)", action: "Check whether the current job had already been submitted and whether an output is mid-generation before starting a new Run. (Kiểm tra job hiện tại đã submit hay chưa và output có đang được tạo hay không, trước khi bắt đầu Run mới.)" }),
    Object.freeze({ title: "Interrupted", code: "INTERRUPTED", retry: "No -- this is a resulting status, not a Halt cause; see the underlying failure_type above (Không -- đây là trạng thái kết quả, không phải nguyên nhân Halt; xem failure_type gốc ở trên)", meaning: "The result status shows a job was interrupted by one of the three hard stops; the real cause is that failure_type. (Trạng thái kết quả cho biết job bị gián đoạn bởi một trong ba hard stop; nguyên nhân thật nằm ở failure_type đó.)", action: "Read the failure_type code and Technical details in the banner, then follow that root cause's guidance above. (Đọc mã failure_type và Chi tiết ghi nhận trong banner/Technical details, rồi làm theo hướng xử lý của mã nguyên nhân gốc đó ở trên.)" })
  ]);

  const UNKNOWN_INSTRUCTION = Object.freeze({
    title: "Unknown halt",
    code: "HALT_UNKNOWN",
    retry: "Unknown -- treat as a hard stop until reviewed (Không xác định -- coi như hard stop cho tới khi được kiểm tra)",
    meaning: "The extension stopped, but this state doesn't map to a known Halt code yet. (Extension đã dừng nhưng không ánh xạ được trạng thái này vào danh mục Halt hiện tại.)",
    action: "Leave the Flow tab as-is and do not resend the job. Open Technical details, note the exact error code and message, check whether the prompt was submitted / an output appeared, then decide whether to continue or Recreate. (Giữ nguyên tab Flow và không gửi lại job. Mở Technical details, ghi lại mã lỗi cùng nội dung Chi tiết ghi nhận, kiểm tra prompt đã submit/output đã xuất hiện hay chưa, rồi mới quyết định tiếp tục hoặc Recreate.)"
  });

  function coveredFailureCodes() {
    return HALT_GROUPS.flatMap((group) => [...group.codes]).concat(NON_HALT_CODES.map((entry) => entry.code));
  }

  function findInstruction(code) {
    const normalized = String(code || "").trim().toUpperCase();
    if (!normalized) return UNKNOWN_INSTRUCTION;
    const group = HALT_GROUPS.find((entry) => entry.codes.includes(normalized));
    if (group) return group;
    if (normalized === SPECIAL_STATUS.code) return SPECIAL_STATUS;
    return NON_HALT_CODES.find((entry) => entry.code === normalized) || UNKNOWN_INSTRUCTION;
  }

  (typeof window !== "undefined" ? window : globalThis).DacHaltInstructions = {
    HALT_GROUPS,
    SPECIAL_STATUS,
    NON_HALT_CODES,
    UNKNOWN_INSTRUCTION,
    findInstruction,
    coveredFailureCodes
  };
})();
