---
status: Accepted
adr: 0016
date: không ghi lại
deciders: Đức
source_section: Vận hành / UI
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0016 — Retry/Halt: chỉ dừng toàn batch khi CAPTCHA / hết quota / mất tab ChatGPT thật sự…

## Bối cảnh

Đức: "cost is not a concern — đừng dừng, retry, chạy hết queue, job nào vẫn lỗi thì bỏ qua job đó"

Nhóm trong bản ghi gốc: Vận hành / UI.

## Quyết định

Retry/Halt: chỉ dừng toàn batch khi CAPTCHA / hết quota / mất tab ChatGPT thật sự (3 loại hard-stop); mọi lỗi khác retry rồi bỏ qua job đó, chạy tiếp

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có bốn cột (Quyết định · Vì sao · Ai chốt · Nguồn), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted. Người chốt: Đức.

Nguồn gốc: `HANDOFF.md` dòng 188

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
