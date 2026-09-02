---
status: Accepted
adr: 0049
date: 2026-08-26
deciders: Claude
source_section: 2026-08-26 (chiều) — Vá lỗi cổng kiểm đọc sai đường dẫn tiếng Việt (owner: Đức)
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0049 — Ghi nhận loại lỗi: đỏ oan nguy hiểm ngang đỏ thật. Một cổng báo đỏ sai tạo động cơ…

## Bối cảnh

Đây là lỗi thứ **năm** của bộ luật tìm được, và lại lộ ra lúc DÙNG chứ không phải lúc đọc code (giống `%20`, không trả được quyền gốc, quy chụp việc phiên khác, owner rỗng rơi qua ba rổ).

Nhóm trong bản ghi gốc: 2026-08-26 (chiều) — Vá lỗi cổng kiểm đọc sai đường dẫn tiếng Việt (owner: Đức).

## Quyết định

Ghi nhận loại lỗi: **đỏ oan nguy hiểm ngang đỏ thật.** Một cổng báo đỏ sai tạo động cơ cho phiên sau đi sửa cổng cho nó xanh — đúng thứ `AGENTS.md` mục 0 cấm.

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có ba cột (Quyết định · Vì sao · Ai chốt), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-26. Người chốt: Claude.

Nguồn gốc: không ghi lại

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
