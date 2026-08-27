(() => {
  "use strict";
  const GLOSSARY = Object.freeze([
    ["SETUP", "Timeout", "Ngân sách thời gian tối đa cho thao tác kiểm tra sẵn sàng hoặc thực thi đang hoạt động; đây không phải là một bộ đếm thời gian chung cho toàn bộ tác vụ."],
    ["SETUP", "Retries", "Chỉ được phép tự động thử lại một cách an toàn trước khi prompt được gửi."],
    ["SETUP", "Safety cooldown", "Khoảng giữ thêm sau khi Gemini vừa đạt trạng thái READY. Có thể nhập một số cố định hoặc dải như 6-9; extension chọn một số nguyên cho mỗi readiness gate, chờ đủ thời gian rồi kiểm tra READY lần nữa. Khoảng này khác với Inter-job delay."],
    ["SETUP", "Inter-job delay", "Khoảng nghỉ được cấu hình từ delay_min_sec đến delay_max_sec sau khi job trước đã hoàn tất và trước readiness gate của job kế tiếp. 12–24 sẽ chọn ngẫu nhiên một số nguyên cho lần chuyển tiếp đó."],
    ["RUN", "Waiting for Gemini ready", "Extension đang xác minh trình soạn thảo ở trạng thái rảnh. Việc bộ đếm thời gian kết thúc không tự nó cho phép gửi prompt."],
    ["RUN", "Response / output detection", "Extension theo dõi ranh giới của một lần thực hiện để xác định đầu ra mới có thể quy thuộc; ảnh cũ hoặc ảnh tham chiếu không được xem là đầu ra mới."],
    ["RUN", "Saving", "Đã phát hiện đầu ra; các tệp được cấu hình đang được lưu và kiểm tra."],
    ["RUN", "Reconciling", "Prompt có thể đã tồn tại. Extension kiểm tra lần thực hiện đó thay vì gửi lại một cách mù quáng."],
    ["OUTPUT", "Artifact", "Một tệp đầu ra do extension quản lý: ảnh đã tạo, Result XLSX hoặc Audit JSONL."],
    ["OUTPUT", "Jobs completed", "Số job đã hoàn tất phần tạo ảnh. Ví dụ 9 / 9 completed chỉ xác nhận chuỗi render đã xong; con số này không tự chứng minh các artifact đã được lưu thành công."],
    ["OUTPUT", "Persistence", "Quá trình ghi artifact vào nơi lưu đã chọn và giữ tệp đó tồn tại sau khi thao tác kết thúc."],
    ["OUTPUT", "Persistence verified", "Tệp đã ghi được mở lại và xác minh là không rỗng. Chỉ khi đó trạng thái mới được hiển thị là Saved hoặc Verified."],
    ["OUTPUT", "Artifact persistence failed", "Phần tạo ảnh có thể đã hoàn tất, nhưng ít nhất một artifact không ghi được hoặc không vượt qua bước mở lại để xác minh. Xem bảng Run Artifacts để biết Images, Result XLSX hay Audit JSONL bị lỗi; giữ nguyên output trong Gemini cho đến khi đã bảo toàn tệp."],
    ["OUTPUT", "Detected not downloaded", "Đã xác định được output mới, nhưng chức năng tải ảnh xuống đang tắt; vì vậy không có tệp ảnh nào được lưu."],
    ["OUTPUT", "Result XLSX", "Checkpoint dạng Excel ghi trạng thái job, tên tệp và bằng chứng tiếp tục lần chạy. Đây không phải là ảnh output."],
    ["OUTPUT", "Audit JSONL", "Nhật ký kỹ thuật theo từng sự kiện để truy vết lần chạy; tệp này khác với Result XLSX và ảnh đã tạo."],
    ["STATUS / FAILURE", "Halted", "Lần chạy đã dừng do điều kiện được bảo vệ hoặc do lỗi. V1 không có chức năng Tiếp tục lần chạy."],
    ["STATUS / FAILURE", "Exact-once", "Cùng một lần thực hiện sẽ không bao giờ bị gửi lại một cách mù quáng."],
    ["STATUS / FAILURE", "Security hard stop", "Gặp CAPTCHA, hoạt động bất thường hoặc yêu cầu xác minh của con người. Không có cơ chế bỏ qua hoặc tự động thử lại."],
    ["TIMING", "Job elapsed", "Thời gian thực tế đã trôi qua kể từ khi tác vụ hiện tại bắt đầu hoạt động; độc lập với các bộ đếm thời gian của thao tác đang chạy."],
    ["TIMING", "Next action", "Thời điểm kiểm tra sẵn sàng sớm nhất không đồng nghĩa với việc prompt tiếp theo chắc chắn sẽ được gửi; trạng thái sẵn sàng vẫn phải được xác nhận."]
  ].map(([section, term, detail]) => ({ section, term, detail })));
  (typeof window !== "undefined" ? window : globalThis).DacOperatorGlossary = { GLOSSARY };
})();
