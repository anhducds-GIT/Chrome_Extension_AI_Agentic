---
status: Accepted
adr: 0004
date: không ghi lại
deciders: Đức (ngầm định qua yêu cầu Tầng 1, xác nhận bởi Claude khi lên kế hoạch)
source_section: Kiến trúc & Agent Bridge
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0004 — queue.propose + duyệt tay của Đức KHÔNG bị xoá khi thêm các method Tầng 1 mới

## Bối cảnh

Giữ đường cũ song song, tránh phá vỡ cái đã test; quyết định có bỏ hẳn hay không để sau

Nhóm trong bản ghi gốc: Kiến trúc & Agent Bridge.

## Quyết định

`queue.propose` + duyệt tay của Đức KHÔNG bị xoá khi thêm các method Tầng 1 mới

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có bốn cột (Quyết định · Vì sao · Ai chốt · Nguồn), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted. Người chốt: Đức (ngầm định qua yêu cầu Tầng 1, xác nhận bởi Claude khi lên kế hoạch).

Nguồn gốc: Kế hoạch Tầng 1, phiên 2026-08-24

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
