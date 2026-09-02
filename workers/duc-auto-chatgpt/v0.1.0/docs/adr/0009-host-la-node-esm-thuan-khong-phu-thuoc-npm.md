---
status: Accepted
adr: 0009
date: không ghi lại
deciders: Claude (coordinator), đảo ngược đề xuất .NET ban đầu của Codex
source_section: Kiến trúc & Agent Bridge
migrated_from: workers/duc-auto-chatgpt/v0.1.0/decisions.md
---

# ADR-0009 — Host là Node ESM thuần, không phụ thuộc npm

## Bối cảnh

Máy không có .NET SDK; repo vốn chủ trương không phụ thuộc ngoài

Nhóm trong bản ghi gốc: Kiến trúc & Agent Bridge.

## Quyết định

Host là Node ESM thuần, không phụ thuộc npm — không dùng .NET

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-chatgpt/v0.1.0/decisions.md` chỉ có bốn cột (Quyết định · Vì sao · Ai chốt · Nguồn), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted. Người chốt: Claude (coordinator), đảo ngược đề xuất .NET ban đầu của Codex.

Nguồn gốc: `drafts/AGENT-BRIDGE-HANDOFF.md` §1.5

> ADR này được TÁCH RA từ `workers/duc-auto-chatgpt/v0.1.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
