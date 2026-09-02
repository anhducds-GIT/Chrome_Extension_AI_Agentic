---
status: Accepted
adr: 0062
date: 2026-08-27
deciders: Claude, theo brief
source_section: 2026-08-27 — G-01: sửa hành vi "dừng nhận trước lúc gửi ⇒ không gửi" (owner: Đức, Go trong chat)
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0062 — Root cause phải chứng minh bằng test tái hiện trước khi vá

## Bối cảnh

Repo này đã có 3 vòng chẩn đoán "nghe rất hợp lý" mà 2 vòng đầu sai. Giả thuyết dòng-784 cũng rất hợp lý — nên phải bắt nó tự lộ diện bằng phép đo.

Nhóm trong bản ghi gốc: 2026-08-27 — G-01: sửa hành vi "dừng nhận trước lúc gửi ⇒ không gửi" (owner: Đức, Go trong chat).

## Quyết định

**Root cause phải chứng minh bằng test tái hiện trước khi vá**: `tests/content-abort-race-behavior.mjs` nạp content.js thật, bắn đúng thứ tự message của sổ cái 26/08 — đỏ trên code cũ, xanh sau vá.

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có ba cột (Quyết định · Vì sao · Ai chốt), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-27. Người chốt: Claude, theo brief.

Nguồn gốc: không ghi lại

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
