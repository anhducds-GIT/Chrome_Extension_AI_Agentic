---
status: Accepted
adr: 0038
date: 2026-08-26
deciders: Đức
source_section: 2026-08-26 — Ảnh mang "địa chỉ tạm" (blob): CHỜ đổi sang link thật, không nới lớp chấm attribution (owner: Đức)
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0038 — Gặp ảnh mang địa chỉ tạm (blob:) thì chờ Gemini tự đổi sang link thật…

## Bối cảnh

Đức hỏi "blob tạm là gì?" trước khi chọn — sau khi hiểu, chọn phương án **không bỏ lớp bảo vệ nào**. Lớp đó tồn tại để chống job này lấy ảnh của job khác. Đánh đổi: có thể vẫn trượt (chưa có bằng chứng Gemini LUÔN đổi — probe thấy ảnh blob nằm rải rác giữa các ảnh https, không chỉ tấm mới nhất).

Nhóm trong bản ghi gốc: 2026-08-26 — Ảnh mang "địa chỉ tạm" (blob): CHỜ đổi sang link thật, không nới lớp chấm attribution (owner: Đức).

## Quyết định

Gặp ảnh mang địa chỉ tạm (`blob:`) thì **chờ** Gemini tự đổi sang link thật (`https://lh3...`), rồi mới kết luận. **Không** nới lớp chấm attribution để chấp nhận ảnh tạm.

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có ba cột (Quyết định · Vì sao · Ai chốt), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-26. Người chốt: Đức.

Nguồn gốc: không ghi lại

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
