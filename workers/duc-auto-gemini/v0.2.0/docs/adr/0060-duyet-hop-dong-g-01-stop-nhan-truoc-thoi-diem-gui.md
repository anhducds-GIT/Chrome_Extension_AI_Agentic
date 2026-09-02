---
status: Accepted
adr: 0060
date: 2026-08-27
deciders: Đức (Go trong chat 27/08, sau khi GPT + brief đã duyệt trước đó)
source_section: 2026-08-27 — G-01: sửa hành vi "dừng nhận trước lúc gửi ⇒ không gửi" (owner: Đức, Go trong chat)
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0060 — Duyệt hợp đồng G-01: Stop nhận trước thời điểm gửi thật → attempt đó không được…

## Bối cảnh

Đo thật 26/08: hệ thống khai "đã nhận dừng trước lúc gửi" rồi 1 giây sau vẫn gửi. Hợp đồng chỉ làm cho câu đó thành sự thật, không mở rộng gì.

Nhóm trong bản ghi gốc: 2026-08-27 — G-01: sửa hành vi "dừng nhận trước lúc gửi ⇒ không gửi" (owner: Đức, Go trong chat).

## Quyết định

**Duyệt hợp đồng G-01**: Stop nhận trước thời điểm gửi thật → attempt đó không được gửi, kết thúc `USER_STOP`. Đã gửi thì khai thật, không có rollback. Không đụng retry/halt/attribution/persistence/exact-once.

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có ba cột (Quyết định · Vì sao · Ai chốt), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-27. Người chốt: Đức (Go trong chat 27/08, sau khi GPT + brief đã duyệt trước đó).

Nguồn gốc: không ghi lại

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
