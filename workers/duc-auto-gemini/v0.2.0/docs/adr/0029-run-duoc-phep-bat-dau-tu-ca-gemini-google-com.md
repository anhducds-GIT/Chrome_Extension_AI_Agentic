---
status: Accepted
adr: 0029
date: 2026-08-25
deciders: Đức
source_section: 2026-08-25 — Cho phép bắt đầu run từ trang hội thoại /app (owner: Đức)
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0029 — Run được phép BẮT ĐẦU từ cả gemini.google.com/images lẫn…

## Bối cảnh

Bằng chứng G1 (bản chụp 2–4) xác minh đầy đủ ô soạn thảo, menu upload, nút Gửi, khung trả lời và ảnh kết quả ngay trên /app; owner cũng thao tác thường xuyên ở đó. Lưu ý vận hành: chạy từ /app thì prompt gõ vào đúng hội thoại đang mở — owner chịu trách nhiệm trỏ tab đúng chỗ; audit ghi lại URL.

Nhóm trong bản ghi gốc: 2026-08-25 — Cho phép bắt đầu run từ trang hội thoại /app (owner: Đức).

## Quyết định

Run được phép BẮT ĐẦU từ cả gemini.google.com/images lẫn gemini.google.com/app/<id> (trước đó /app chỉ hợp lệ sau khi chính tab đó đã gửi).

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có ba cột (Quyết định · Vì sao · Ai chốt), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-25. Người chốt: Đức.

Nguồn gốc: không ghi lại

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
