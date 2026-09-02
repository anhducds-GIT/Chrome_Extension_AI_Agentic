---
status: Accepted
adr: 0039
date: 2026-08-26
deciders: Claude đề xuất, trong phạm vi quyết định trên
source_section: 2026-08-26 — Ảnh mang "địa chỉ tạm" (blob): CHỜ đổi sang link thật, không nới lớp chấm attribution (owner: Đức)
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0039 — Phép chờ có hạn mức 30 giây (blobSwapWaitMs), hết hạn thì kết luận trung thực.

## Bối cảnh

Chờ vô hạn trong trần 90s nghĩa là mỗi lần trượt đốt hết 90s × 3 lần thử = chậm gấp 3, mà kết quả vẫn thế.

Nhóm trong bản ghi gốc: 2026-08-26 — Ảnh mang "địa chỉ tạm" (blob): CHỜ đổi sang link thật, không nới lớp chấm attribution (owner: Đức).

## Quyết định

Phép chờ có **hạn mức 30 giây** (`blobSwapWaitMs`), hết hạn thì kết luận trung thực.

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có ba cột (Quyết định · Vì sao · Ai chốt), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-26. Người chốt: Claude đề xuất, trong phạm vi quyết định trên.

Nguồn gốc: không ghi lại

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
