---
status: Accepted
adr: 0061
date: 2026-08-27
deciders: Đức duyệt hướng; Claude thiết kế chi tiết
source_section: 2026-08-27 — G-01: sửa hành vi "dừng nhận trước lúc gửi ⇒ không gửi" (owner: Đức, Go trong chat)
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0061 — Hướng B-refined — huỷ theo attempt, không phải A (round-trip hỏi ngược) hay B…

## Bối cảnh

Kênh `DAC_ABORT` đã tồn tại và chốt chặn trước click đã đúng chỗ — cái hỏng duy nhất là cờ bị dòng mở đầu `runPrompt()` xoá. Gắn theo attempt thì abort tới trước hay sau job đều không bị xoá nhầm, mà attempt sau không bị lây.

Nhóm trong bản ghi gốc: 2026-08-27 — G-01: sửa hành vi "dừng nhận trước lúc gửi ⇒ không gửi" (owner: Đức, Go trong chat).

## Quyết định

**Hướng B-refined — huỷ theo attempt**, không phải A (round-trip hỏi ngược) hay B nguyên bản: `DAC_ABORT` mang `job_id`+`attempt_id`; `content.js` nhớ attempt bị huỷ và chỉ giữ cờ cho đúng attempt đó; huỷ trần (không danh tính) giữ nguyên nghĩa cũ.

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có ba cột (Quyết định · Vì sao · Ai chốt), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-27. Người chốt: Đức duyệt hướng; Claude thiết kế chi tiết.

Nguồn gốc: không ghi lại

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
