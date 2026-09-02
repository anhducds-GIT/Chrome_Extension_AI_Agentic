---
status: Accepted
adr: 0009
date: không ghi lại
deciders: Claude (coordinator)
source_section: Kiến trúc & Agent Bridge
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0009 — API externally_connectable localhost cũ bị gỡ hoàn toàn ở WP-4, không giữ song song

## Bối cảnh

Giữ lại sẽ là một cổng vào không xác thực thứ hai, phá vỡ mô hình an toàn mới

Nhóm trong bản ghi gốc: Kiến trúc & Agent Bridge.

## Quyết định

API `externally_connectable` localhost cũ bị gỡ hoàn toàn ở WP-4, không giữ song song

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có bốn cột (Quyết định · Vì sao · Ai chốt · Nguồn), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted. Người chốt: Claude (coordinator).

Nguồn gốc: `drafts/AGENT-BRIDGE-HANDOFF.md` §1.6

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
