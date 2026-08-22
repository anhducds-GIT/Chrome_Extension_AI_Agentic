(() => {
  "use strict";
  const GLOSSARY = Object.freeze([
    ["THIẾT LẬP", "Giới hạn thời gian", "Ngân sách thời gian tối đa cho thao tác kiểm tra sẵn sàng hoặc thực thi đang hoạt động; đây không phải là một bộ đếm thời gian chung cho toàn bộ tác vụ."],
    ["THIẾT LẬP", "Số lần thử lại", "Chỉ được phép tự động thử lại một cách an toàn trước khi prompt được gửi."],
    ["THIẾT LẬP", "Thời gian nghỉ an toàn", "Khoảng nghỉ bổ sung tại cổng kiểm tra sẵn sàng, được dùng khi kiểm tra trạng thái sẵn sàng của ChatGPT; khác với khoảng nghỉ giữa các tác vụ."],
    ["THIẾT LẬP", "Khoảng nghỉ giữa các tác vụ", "Khoảng nghỉ được cấu hình từ delay_min_sec đến delay_max_sec trước cổng kiểm tra sẵn sàng tiếp theo. 3–3 là cố định; 3–5 sẽ chọn ngẫu nhiên một số nguyên cho lần chuyển tiếp đó."],
    ["CHẠY", "Đang chờ ChatGPT sẵn sàng", "Extension đang xác minh trình soạn thảo ở trạng thái rảnh. Việc bộ đếm thời gian kết thúc không tự nó cho phép gửi prompt."],
    ["CHẠY", "Phát hiện phản hồi / đầu ra", "Extension theo dõi ranh giới của một lần thực hiện để xác định đầu ra mới có thể quy thuộc; ảnh cũ hoặc ảnh tham chiếu không được xem là đầu ra mới."],
    ["CHẠY", "Đang lưu", "Đã phát hiện đầu ra; các tệp được cấu hình đang được lưu và kiểm tra."],
    ["CHẠY", "Đang đối soát", "Prompt có thể đã tồn tại. Extension kiểm tra lần thực hiện đó thay vì gửi lại một cách mù quáng."],
    ["ĐẦU RA", "Đã xác minh lưu tệp", "Tệp đã ghi được mở lại và xác minh là không rỗng. Chỉ khi đó trạng thái mới được hiển thị là Đã lưu."],
    ["ĐẦU RA", "Đã phát hiện nhưng chưa tải xuống", "Đã xác định được đầu ra, nhưng chức năng tải ảnh xuống đang tắt; vì vậy không có tệp ảnh nào được lưu."],
    ["TRẠNG THÁI / LỖI", "Đã dừng", "Lần chạy đã dừng do điều kiện được bảo vệ hoặc do lỗi. V1 không có chức năng Tiếp tục lần chạy."],
    ["TRẠNG THÁI / LỖI", "Chỉ gửi một lần", "Cùng một lần thực hiện sẽ không bao giờ bị gửi lại một cách mù quáng."],
    ["TRẠNG THÁI / LỖI", "Dừng bắt buộc vì bảo mật", "Gặp CAPTCHA, hoạt động bất thường hoặc yêu cầu xác minh của con người. Không có cơ chế bỏ qua hoặc tự động thử lại."],
    ["THỜI GIAN", "Thời gian tác vụ đã chạy", "Thời gian thực tế đã trôi qua kể từ khi tác vụ hiện tại bắt đầu hoạt động; độc lập với các bộ đếm thời gian của thao tác đang chạy."],
    ["THỜI GIAN", "Hành động tiếp theo", "Thời điểm kiểm tra sẵn sàng sớm nhất không đồng nghĩa với việc prompt tiếp theo chắc chắn sẽ được gửi; trạng thái sẵn sàng vẫn phải được xác nhận."]
  ].map(([section, term, detail]) => ({ section, term, detail })));
  (typeof window !== "undefined" ? window : globalThis).DacOperatorGlossary = { GLOSSARY };
})();
