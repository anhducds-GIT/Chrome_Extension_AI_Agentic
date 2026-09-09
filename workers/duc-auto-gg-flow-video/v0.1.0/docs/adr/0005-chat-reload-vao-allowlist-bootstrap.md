---
status: Accepted
adr: 0005
date: 2026-08-27
deciders: không ghi lại
source_section: "2026-08-27 — `chat.reload` vào allowlist bootstrap (thứ 5)"
migrated_from: workers/duc-auto-gg-flow-video/v0.1.0/decisions.md
---

# ADR-0005 — `chat.reload` vào allowlist bootstrap (method thứ năm)

## Bối cảnh

Gặp thật ngay lần nối đầu: tab Flow mở trước khi load extension → content script chưa
tiêm → `RECEIVER_LOST`, và mỗi lần reload extension sau này cũng sẽ cần F5 tab.

## Quyết định

`chat.reload` chỉ F5 tab đã bind — không gửi prompt, không tốn credits — nên cho vào
allowlist để vòng debug tự chạy, khỏi mượn tay Đức mỗi lần. Test ghim đã đổi theo.

(Cùng ngày, cùng phiên: Đức yêu cầu đổi tên hiển thị "Duc Auto Gemini" → "Duc Auto GG
Flow" và icon G xanh-tím → F teal, đã làm.)

## Hệ quả

không ghi lại — bản ghi gốc không có mục Hệ quả.

Allowlist bootstrap mà quyết định này mở rộng đã bị gỡ hẳn cùng ngày bởi
[ADR-0007](0007-go-khoa-bootstrap-bridge-f-05.md); `chat.reload` thì ở lại và vẫn dùng.

## Trạng thái

Accepted.

> Tách ra từ `workers/duc-auto-gg-flow-video/v0.1.0/decisions.md` ngày 2026-09-09 (N-55).
> Chỉ đổi HÌNH DẠNG, không đổi một chữ nội dung quyết định.
