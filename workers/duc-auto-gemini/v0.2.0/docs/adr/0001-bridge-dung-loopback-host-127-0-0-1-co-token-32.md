---
status: Accepted
adr: 0001
date: không ghi lại
deciders: Claude (coordinator), sau 2 vòng nghiên cứu với Codex
source_section: Kiến trúc & Agent Bridge
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0001 — Bridge dùng loopback host 127.0.0.1 có token 32-byte, không dùng Native Messaging

## Bối cảnh

Native Messaging: Chrome tự spawn host làm stdio child của Chrome, một CLI độc lập không gắn vào được, sẽ cần thêm 1 tầng IPC nữa

Nhóm trong bản ghi gốc: Kiến trúc & Agent Bridge.

## Quyết định

Bridge dùng loopback host `127.0.0.1` có token 32-byte, không dùng Native Messaging

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có bốn cột (Quyết định · Vì sao · Ai chốt · Nguồn), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted. Người chốt: Claude (coordinator), sau 2 vòng nghiên cứu với Codex.

Nguồn gốc: `drafts/AGENT-BRIDGE-DESIGN-V1.md`, `drafts/AGENT-BRIDGE-HANDOFF.md` §1.1

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
