---
status: Accepted
adr: 0023
date: 2026-08-24
deciders: Đức
source_section: Roadmap tự hành (chốt sau audit 2026-08-24)
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0023 — Cho phép gộp checkpoint cho phiên sửa của agent (transaction / session.checkpoint)

## Bối cảnh

Agent sửa 20 lần = 20 file XLSX là không dùng được; audit chi tiết giữ lại đủ dấu vết

Nhóm trong bản ghi gốc: Roadmap tự hành (chốt sau audit 2026-08-24).

## Quyết định

Cho phép gộp checkpoint cho phiên sửa của agent (transaction / `session.checkpoint`) — thay triết lý "mỗi ghi = 1 version". Điều kiện: audit JSONL vẫn ghi đủ TỪNG mutation riêng lẻ

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có bốn cột (Quyết định · Vì sao · Ai chốt · Nguồn), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-24. Người chốt: Đức.

Nguồn gốc: Audit 2026-08-24, điểm chốt #3

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
