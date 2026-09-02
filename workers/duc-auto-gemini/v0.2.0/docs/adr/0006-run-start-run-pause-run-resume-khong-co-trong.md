---
status: Accepted
adr: 0006
date: không ghi lại
deciders: Claude (coordinator), theo yêu cầu an toàn của Đức
source_section: Kiến trúc & Agent Bridge
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0006 — run.start / run.pause / run.resume không có trong Bridge v1, trả METHOD_NOT_FOUND

## Bối cảnh

Bridge là ingress + observability, không phải remote execution — Đức luôn là người bấm Run

Nhóm trong bản ghi gốc: Kiến trúc & Agent Bridge.

## Quyết định

`run.start` / `run.pause` / `run.resume` không có trong Bridge v1, trả `METHOD_NOT_FOUND`

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có bốn cột (Quyết định · Vì sao · Ai chốt · Nguồn), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted. Người chốt: Claude (coordinator), theo yêu cầu an toàn của Đức.

Nguồn gốc: `drafts/AGENT-BRIDGE-HANDOFF.md` §1.4

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
