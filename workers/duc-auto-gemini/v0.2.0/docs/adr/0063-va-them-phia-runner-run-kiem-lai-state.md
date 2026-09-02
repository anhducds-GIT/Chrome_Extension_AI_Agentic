---
status: Accepted
adr: 0063
date: 2026-08-27
deciders: Claude
source_section: 2026-08-27 — G-01: sửa hành vi "dừng nhận trước lúc gửi ⇒ không gửi" (owner: Đức, Go trong chat)
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0063 — Vá thêm phía runner: run() kiểm lại state.stopRequested ngay sau await gateNextJob…

## Bối cảnh

Đây là nửa panel của cùng race: Stop rơi vào khoảng await của gate thì attempt vẫn được phái đi. Kiểm một cờ cục bộ, không phải round-trip mới, nên vẫn trong phạm vi B-refined.

Nhóm trong bản ghi gốc: 2026-08-27 — G-01: sửa hành vi "dừng nhận trước lúc gửi ⇒ không gửi" (owner: Đức, Go trong chat).

## Quyết định

Vá thêm phía runner: `run()` kiểm lại `state.stopRequested` ngay sau `await gateNextJob` — trước đó từ gate tới `send()` không có phép kiểm nào.

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có ba cột (Quyết định · Vì sao · Ai chốt), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-27. Người chốt: Claude.

Nguồn gốc: không ghi lại

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
