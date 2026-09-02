---
status: Accepted
adr: 0014
date: không ghi lại
deciders: Claude, theo yêu cầu ngầm định của quy trình audit
source_section: Quy ước dữ liệu / workbook
migrated_from: workers/duc-auto-chatgpt/v0.1.0/decisions.md
---

# ADR-0014 — pilot-03/, pilot-05/, pilot-06/, pilot-06B/ không bao giờ bị sửa/regenerate

## Bối cảnh

Đây là bằng chứng vận hành của các lỗi đã tìm và sửa

Nhóm trong bản ghi gốc: Quy ước dữ liệu / workbook.

## Quyết định

`pilot-03/`, `pilot-05/`, `pilot-06/`, `pilot-06B/` không bao giờ bị sửa/regenerate

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-chatgpt/v0.1.0/decisions.md` chỉ có bốn cột (Quyết định · Vì sao · Ai chốt · Nguồn), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted. Người chốt: Claude, theo yêu cầu ngầm định của quy trình audit.

Nguồn gốc: `NEXT-SESSION-BRIEF.md` §1, lặp lại nhiều lần trong Log `HANDOFF.md`

> ADR này được TÁCH RA từ `workers/duc-auto-chatgpt/v0.1.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
