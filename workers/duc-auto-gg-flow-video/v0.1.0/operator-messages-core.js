/* Vietnamese operator-facing text for Check Plan and Resume findings.

   The finding CODE stays English everywhere it matters as an identifier: in
   the audit JSONL, the Result ledger, the log, and every test. Only what the
   operator reads on screen is translated, and it lives here rather than in the
   diagnostic cores so those keep one job and no test asserts on prose.

   `label`    replaces the raw SCREAMING_SNAKE code as the row title.
   `guidance` says what to do next, in plain language.
   The finding's own `message` still renders underneath as technical detail,
   because it carries the filenames and job IDs the operator needs. */
(() => {
  "use strict";

  const MESSAGES = Object.freeze({
    // --- Workbook -----------------------------------------------------------
    WORKBOOK_NOT_LOADED: { label: "Chưa chọn workbook", guidance: "Chọn một file .xlsx để bắt đầu." },
    WORKBOOK_NO_JOBS: { label: "Workbook không có job nào", guidance: "Thêm ít nhất một dòng có ID và prompt vào sheet jobs." },
    MALFORMED_JOBS: { label: "Có dòng job bị lỗi", guidance: "Mỗi dòng phải có đủ ID và prompt. Sửa các dòng được nêu bên dưới." },

    // --- Run settings -------------------------------------------------------
    RUN_SETTINGS_INVALID: { label: "Thiết lập chạy không hợp lệ", guidance: "Sửa giá trị sai trong phần thiết lập, rồi Check Plan lại." },
    MAX_INPUT_IMAGES: { label: "Vượt giới hạn ảnh tham chiếu", guidance: "Giảm số ảnh tham chiếu của job, hoặc tăng giới hạn trong phần thiết lập." },

    // --- References ---------------------------------------------------------
    MISSING_REFERENCES: { label: "Thiếu ảnh tham chiếu", guidance: "Thêm đúng các file ảnh mà workbook yêu cầu." },
    AMBIGUOUS_REFERENCES: { label: "Ảnh tham chiếu bị trùng tên", guidance: "Nhiều file cùng tên gốc nên không xác định được file nào. Đặt tên hoặc alias riêng cho từng file." },
    DUPLICATE_REFERENCE: { label: "Một job dùng lặp cùng một ảnh", guidance: "Mỗi job không được gọi cùng một ảnh hai lần." },
    DUPLICATE_ALIASES: { label: "Alias bị trùng", guidance: "Mỗi ảnh cần một alias riêng, hoặc bỏ bớt file trùng." },
    UNUSED_REFERENCES: { label: "Có ảnh không được dùng", guidance: "Các file này sẽ không được đính vào job nào. Bỏ qua được nếu là cố ý." },

    // --- Output location ----------------------------------------------------
    OUTPUT_DESTINATION_MISSING: { label: "Chưa chọn nơi lưu", guidance: "Chọn thư mục lưu ảnh trước khi chạy." },
    OUTPUT_PERMISSION_REQUIRED: { label: "Thư mục chưa được cấp quyền ghi", guidance: "Chọn lại thư mục và bấm cho phép. Hệ thống sẽ không tự lưu sang Downloads." },
    OUTPUT_PROFILE_UNAVAILABLE: { label: "Không đọc được profile thư mục", guidance: "Chọn lại thư mục để gắn lại profile." },
    OUTPUT_PROFILE_UNBOUND: { label: "Profile thư mục chưa gắn", guidance: "Chọn đúng thư mục mà workbook mong đợi, rồi Check Plan lại." },
    OUTPUT_COLLISION_OVERWRITE_ACTIVE: { label: "Đang bật chế độ ĐÈ LÊN ảnh cũ", guidance: "Job nào chạy lại với cùng tên file sẽ xoá mất ảnh cũ. Vào Naming, đổi Collision policy sang 'Keep both — add number' nếu muốn giữ ảnh cũ." },

    // --- Gemini tab --------------------------------------------------------
    CHATGPT_NOT_CONNECTED: { label: "Chưa kết nối được Flow", guidance: "Mở một tab Google Flow và để tab đó ở trạng thái hoạt động." },
    CHATGPT_RECEIVER_UNAVAILABLE: { label: "Tab Flow chưa sẵn sàng nhận lệnh", guidance: "Tải lại trang Flow, rồi bấm kiểm tra lại." },
    CHATGPT_COMPOSER_UNAVAILABLE: { label: "Không thấy ô nhập của Flow", guidance: "Mở một cuộc hội thoại bình thường có ô nhập, rồi kiểm tra lại." },
    CHATGPT_BUSY: { label: "Flow đang bận", guidance: "Đợi Flow sinh xong nội dung hiện tại, rồi kiểm tra lại." },
    CHATGPT_SECURITY_BLOCKER: { label: "Flow đang chặn vì bảo mật", guidance: "Xử lý cảnh báo bảo mật (CAPTCHA, xác minh) ngay trên trang Flow. Hệ thống sẽ không tự vượt qua." },
    CHATGPT_GENERATION_LIMIT: { label: "Flow đã hết credit tạo video", guidance: "Dừng lại để không gửi thêm prompt vô ích. Đợi giới hạn được reset (thường sau vài giờ) hoặc nâng gói, rồi Check Plan lại." },

    // --- Resume / checkpoint ------------------------------------------------
    RESUME_LEDGER_INVALID: { label: "File Result XLSX không dùng được", guidance: "Chọn đúng file Result XLSX gốc của lần chạy đó, không dùng bản chỉnh tay." },
    RESUME_RUN_ID_MISMATCH: { label: "File thuộc lần chạy khác", guidance: "Chỉ dùng các checkpoint của cùng một lần chạy. Chọn lại file cho đúng." },
    RESUME_LATEST_CHECKPOINT_INVALID: { label: "Checkpoint mới nhất bị lỗi", guidance: "Khôi phục lại checkpoint mới nhất. Hệ thống cố ý không tự lùi về bản cũ hơn." },
    RESUME_OUTPUT_MISMATCH: { label: "Thư mục không chứa file Result cần tìm", guidance: "Chọn đúng thư mục có chứa file Result của lần chạy này." },
    RESUME_AMBIGUOUS_SUBMISSION: { label: "Job đã gửi nhưng không rõ kết quả", guidance: "Không được gửi lại job này tự động. Xem kết quả cũ trên Flow, rồi dùng nút Recreate nếu thật sự cần tạo lại." },
    RESUME_RECREATE_INCOMPLETE: { label: "Lần tạo lại chưa hoàn tất", guidance: "Job này chưa có ảnh nào được lưu và xác minh. Bấm Recreate để tạo lại một lần nữa." },
    RESUME_AUDIT_CHAIN_MISSING: { label: "Không tìm thấy file audit cũ", guidance: "File Result XLSX vẫn là bản gốc đáng tin. Chọn 'Continue with new audit segment' nếu muốn ghi tiếp vào một file audit mới." },
    RESUME_AUDIT_GAP_SEGMENT_MISSING: { label: "Thiếu file audit mới đã tạo", guidance: "Khôi phục lại file audit mới trước khi chạy tiếp." },
    RESUME_AUDIT_APPEND_UNAVAILABLE: { label: "Chrome Downloads không ghi tiếp audit được", guidance: "Chuyển sang dùng thư mục đã cấp quyền cho lần chạy này." },
    RESUME_CHECKPOINT_VERSION_AMBIGUOUS: {
      label: "Hai file checkpoint trùng số phiên bản",
      guidance: "Mỗi số phiên bản chỉ được có một file. Đổi tên file cũ hơn (thêm đuôi __superseded) hoặc chuyển nó ra khỏi thư mục này, rồi Check Plan lại. Đừng xoá — file đó có thể vẫn là bản đúng."
    },
    CHECKPOINT_VERSION_CONFLICT: { label: "Số phiên bản checkpoint đã bị chiếm", guidance: "Chưa ghi file nào cả. Dọn thư mục cho mỗi phiên bản chỉ còn một file, rồi thử lại." }
  });

  function messageFor(code) {
    return MESSAGES[String(code || "").trim().toUpperCase()] || null;
  }

  // Falls back to the finding's own English text so a code without a
  // translation still renders something useful instead of a blank row.
  function present(finding = {}) {
    const translated = messageFor(finding.code);
    const label = translated?.label || String(finding.code || "").replace(/_/g, " ");
    const guidance = translated?.guidance || finding.guidance || finding.message || "";
    const detail = String(finding.message || "").trim();
    return { label, guidance, detail: detail && detail !== guidance ? detail : "" };
  }

  (typeof window !== "undefined" ? window : globalThis).DacOperatorMessages = { MESSAGES, messageFor, present };
})();
