---
status: Accepted
adr: 0042
date: 2026-08-26
deciders: Đức
source_section: 2026-08-26 (vòng 2) — Đưa ảnh vào tầm mắt rồi mới đo, KHÔNG nới lớp kiểm (owner: Đức)
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0042 — Nguyên nhân thật: ảnh của lượt trả lời mới nằm dưới đáy hội thoại dài, ngoài…

## Bối cảnh

Phép kiểm "ảnh phải hiện ra thật" **giữ nguyên**, không bỏ gì. Ảnh rỗng / ảnh giả / phần tử 0px thì cuộn tới cũng vẫn 0px — nên đây là **loại bỏ một phép đo sai**, không phải nới lỏng bảo vệ. Lớp khoan dung của Pilot-04 chỉ cứu ảnh `https://lh3`, mà Gemini nay trả toàn `blob:` nên nó không còn áp được lần nào.

Nhóm trong bản ghi gốc: 2026-08-26 (vòng 2) — Đưa ảnh vào tầm mắt rồi mới đo, KHÔNG nới lớp kiểm (owner: Đức).

## Quyết định

Nguyên nhân thật: ảnh của lượt trả lời mới nằm **dưới đáy hội thoại dài, ngoài viewport**, nên `getBoundingClientRect()` đo ra 0 → bị chấm "không hiện ra" → `NO_NEW_IMAGE`. Cách trị: **cuộn tịnh tiến tới đúng tấm ảnh đó rồi mới đo**.

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có ba cột (Quyết định · Vì sao · Ai chốt), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-26. Người chốt: Đức.

Nguồn gốc: không ghi lại

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
