---
status: Accepted
adr: 0006
date: không ghi lại
deciders: Claude (coordinator)
source_section: Kiến trúc & Agent Bridge
migrated_from: workers/duc-auto-chatgpt/v0.1.0/decisions.md
---

# ADR-0006 — Side panel là executor duy nhất

## Bối cảnh

Tránh 2 "sự thật" thực thi cùng lúc (side panel vs background); đóng panel phải trả `EXECUTOR_UNAVAILABLE`, không có runner nền thay thế

Nhóm trong bản ghi gốc: Kiến trúc & Agent Bridge.

## Quyết định

Side panel là executor duy nhất; service worker chỉ là router, không bao giờ tự sửa XLSX/chạy queue

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-chatgpt/v0.1.0/decisions.md` chỉ có bốn cột (Quyết định · Vì sao · Ai chốt · Nguồn), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted. Người chốt: Claude (coordinator).

Nguồn gốc: `drafts/AGENT-BRIDGE-HANDOFF.md` §1.2

> ADR này được TÁCH RA từ `workers/duc-auto-chatgpt/v0.1.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
