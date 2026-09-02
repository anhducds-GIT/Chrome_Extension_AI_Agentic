---
status: Accepted
adr: 0013
date: không ghi lại
deciders: Đức
source_section: Quy ước dữ liệu / workbook
migrated_from: workers/duc-auto-chatgpt/v0.1.0/decisions.md
---

# ADR-0013 — Checkpoint đặt tên 2 chữ số (v01, v02...) thay vì 3 chữ số (v001)

## Bối cảnh

Đức yêu cầu quy ước ngắn hơn; checkpoint cũ 3 chữ số vẫn đọc/resume được (`legacy`)

Nhóm trong bản ghi gốc: Quy ước dữ liệu / workbook.

## Quyết định

Checkpoint đặt tên 2 chữ số (`v01`, `v02`...) thay vì 3 chữ số (`v001`)

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-chatgpt/v0.1.0/decisions.md` chỉ có bốn cột (Quyết định · Vì sao · Ai chốt · Nguồn), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted. Người chốt: Đức.

Nguồn gốc: `HANDOFF.md` dòng 91

> ADR này được TÁCH RA từ `workers/duc-auto-chatgpt/v0.1.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
