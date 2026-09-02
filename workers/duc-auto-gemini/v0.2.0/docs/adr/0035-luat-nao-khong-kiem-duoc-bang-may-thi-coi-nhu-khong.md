---
status: Accepted
adr: 0035
date: 2026-08-26
deciders: Đức
source_section: 2026-08-26 — Bộ luật đa-AI: luật tự nạp, quy trình mở khi cần (owner: Đức)
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0035 — Luật nào không kiểm được bằng máy thì coi như không có

## Bối cảnh

Tài liệu không điều khiển được AI; một script chạy đỏ thì có. Cổng hiện có 6 phép kiểm, mỗi phép ứng với một lỗi ĐÃ thật sự xảy ra trong project, không phép nào tưởng tượng.

Nhóm trong bản ghi gốc: 2026-08-26 — Bộ luật đa-AI: luật tự nạp, quy trình mở khi cần (owner: Đức).

## Quyết định

Luật nào không kiểm được bằng máy thì coi như không có: mỗi lỗi thật mới gặp → thêm 1 dòng vào bảng lỗi **và** cân nhắc 1 phép kiểm vào cổng.

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có ba cột (Quyết định · Vì sao · Ai chốt), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-26. Người chốt: Đức.

Nguồn gốc: không ghi lại

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
