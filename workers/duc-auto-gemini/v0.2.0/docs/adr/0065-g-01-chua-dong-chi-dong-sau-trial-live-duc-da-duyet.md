---
status: Accepted
adr: 0065
date: 2026-08-27
deciders: Đức (điều kiện trial đặt từ brief)
source_section: 2026-08-27 — G-01: sửa hành vi "dừng nhận trước lúc gửi ⇒ không gửi" (owner: Đức, Go trong chat)
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0065 — G-01 chưa đóng: chỉ đóng sau trial live (Đức đã duyệt, điều kiện test tĩnh PASS —…

## Bối cảnh

Chính lỗi này suite tĩnh 79/79 xanh không bắt được — chỉ sổ cái một lần chạy thật mới bắt được.

Nhóm trong bản ghi gốc: 2026-08-27 — G-01: sửa hành vi "dừng nhận trước lúc gửi ⇒ không gửi" (owner: Đức, Go trong chat).

## Quyết định

**G-01 chưa đóng**: chỉ đóng sau trial live (Đức đã duyệt, điều kiện test tĩnh PASS — đã đạt) chứng minh sổ cái hết chuỗi `STOP_REQUESTED_BEFORE_SUBMIT → PROMPT_SUBMITTED`.

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có ba cột (Quyết định · Vì sao · Ai chốt), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-27. Người chốt: Đức (điều kiện trial đặt từ brief).

Nguồn gốc: không ghi lại

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
