---
status: Accepted
adr: 0036
date: 2026-08-24
deciders: Đức
source_section: Roadmap tự hành (chốt sau audit 2026-08-24)
migrated_from: workers/duc-auto-chatgpt/v0.1.0/decisions.md
---

# ADR-0036 — Quy trình bắt buộc: cross-check độc lập trước khi đưa Đức thao tác. Sau mỗi đợt…

## Bối cảnh

Đã 2–3 lần Claude báo "đã sửa" nhưng giao diện không đổi (nguyên nhân: suy luận tĩnh, thiếu trace runtime); Đức yêu cầu thêm vòng validate để giảm debug lắt nhắt

Nhóm trong bản ghi gốc: Roadmap tự hành (chốt sau audit 2026-08-24).

## Quyết định

**Quy trình bắt buộc: cross-check độc lập trước khi đưa Đức thao tác.** Sau mỗi đợt sửa code UI/extension, AI thực thi phải gọi một AI khác (Antigravity `agy --mode plan --print`, hoặc Codex nếu agy không chạy được) audit read-only phần vừa sửa — trọng tâm: trace đường chạy runtime thật, không tin comment/test — rồi mới báo Đức reload/nghiệm thu.

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-chatgpt/v0.1.0/decisions.md` chỉ có bốn cột (Quyết định · Vì sao · Ai chốt · Nguồn), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-24. Người chốt: Đức.

Nguồn gốc: Phiên 2026-08-24, sau bug "ô suggest folder không hiện"

> ADR này được TÁCH RA từ `workers/duc-auto-chatgpt/v0.1.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
