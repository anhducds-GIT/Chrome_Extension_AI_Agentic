---
status: Accepted
adr: 0047
date: 2026-08-26
deciders: Đức
source_section: 2026-08-26 (chiều) — Vá lỗi cổng kiểm đọc sai đường dẫn tiếng Việt (owner: Đức)
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0047 — Cho sửa file gốc scripts/session-check.mjs + scripts/safe-push.mjs

## Bối cảnh

Git mặc định mã hoá ký tự không phải ASCII thành octal, nên thư mục `Pilot-07-Tạo Ảnh tô màu` **đã khai đủ vào Bản đồ file mà cổng vẫn báo đỏ**. Đây không phải trường hợp hiếm: Đức là người Việt và đặt tên thư mục bằng tiếng Việt, nên mọi pilot sau đều sẽ dính.

Nhóm trong bản ghi gốc: 2026-08-26 (chiều) — Vá lỗi cổng kiểm đọc sai đường dẫn tiếng Việt (owner: Đức).

## Quyết định

Cho sửa file gốc `scripts/session-check.mjs` + `scripts/safe-push.mjs`: gọi git kèm `-c core.quotepath=false`, và safe-push bỏ dấu nháy bao ngoài trước khi quy chủ sở hữu commit.

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có ba cột (Quyết định · Vì sao · Ai chốt), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-26. Người chốt: Đức.

Nguồn gốc: không ghi lại

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
