---
status: Accepted
adr: 0016
date: không ghi lại
deciders: Claude, xác nhận là chủ đích thiết kế, không phải bug
source_section: Quy ước dữ liệu / workbook
migrated_from: workers/duc-auto-chatgpt/v0.1.0/decisions.md
---

# ADR-0016 — Completed job (SAFE_COMPLETE) không bao giờ tự chạy lại khi Resume, kể cả khi…

## Bối cảnh

Bảo vệ output đã xác minh khỏi bị ghi đè âm thầm; re-run chỉ được làm qua cơ chế duyệt thủ công per-job

Nhóm trong bản ghi gốc: Quy ước dữ liệu / workbook.

## Quyết định

Completed job (`SAFE_COMPLETE`) không bao giờ tự chạy lại khi Resume, kể cả khi `rerun_done=true` trong config

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-chatgpt/v0.1.0/decisions.md` chỉ có bốn cột (Quyết định · Vì sao · Ai chốt · Nguồn), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted. Người chốt: Claude, xác nhận là chủ đích thiết kế, không phải bug.

Nguồn gốc: `HANDOFF.md` dòng 113

> ADR này được TÁCH RA từ `workers/duc-auto-chatgpt/v0.1.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
