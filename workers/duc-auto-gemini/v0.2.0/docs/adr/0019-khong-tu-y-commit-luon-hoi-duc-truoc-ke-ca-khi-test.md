---
status: Accepted
adr: 0019
date: không ghi lại
deciders: Đức (luật cố định)
source_section: Vận hành / UI
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0019 — Không tự ý commit — luôn hỏi Đức trước, kể cả khi test 100% pass

## Bối cảnh

Đức là người chốt duy nhất theo CLAUDE.md gốc

Nhóm trong bản ghi gốc: Vận hành / UI.

## Quyết định

Không tự ý commit — luôn hỏi Đức trước, kể cả khi test 100% pass

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có bốn cột (Quyết định · Vì sao · Ai chốt · Nguồn), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted. Người chốt: Đức (luật cố định).

Nguồn gốc: `NEXT-SESSION-BRIEF.md` dòng 15-16, lặp lại mọi entry "Next" trong `HANDOFF.md`

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
