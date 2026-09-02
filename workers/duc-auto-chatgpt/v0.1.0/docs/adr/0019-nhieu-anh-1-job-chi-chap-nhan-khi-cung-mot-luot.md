---
status: Accepted
adr: 0019
date: 2026-08-25
deciders: Claude (khi implement), theo khái niệm "1 job nhiều ảnh" của Đức
source_section: Quy ước dữ liệu / workbook
migrated_from: workers/duc-auto-chatgpt/v0.1.0/decisions.md
---

# ADR-0019 — Nhiều ảnh 1 job chỉ chấp nhận khi CÙNG MỘT lượt assistant

## Bối cảnh

Giữ nguyên lá chắn attribution: 2 lượt khác nhau nghĩa là thật sự không biết ảnh nào của job nào — đoán bừa sẽ gán sai file cho job. Cùng 1 lượt thì chắc chắn là output của chính prompt vừa gửi

Nhóm trong bản ghi gốc: Quy ước dữ liệu / workbook.

## Quyết định

**2026-08-25 — Nhiều ảnh 1 job chỉ chấp nhận khi CÙNG MỘT lượt assistant:** `max_images_per_job` (default 4) cho phép lưu nhiều ảnh, nhưng chỉ khi tất cả ảnh mới nằm trong cùng 1 message assistant. Ảnh rải ở 2 lượt khác nhau vẫn `OUTPUT_AMBIGUOUS` và vẫn fail-closed

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-chatgpt/v0.1.0/decisions.md` chỉ có bốn cột (Quyết định · Vì sao · Ai chốt · Nguồn), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-25. Người chốt: Claude (khi implement), theo khái niệm "1 job nhiều ảnh" của Đức.

Nguồn gốc: `image-evidence-core.js` `selectAttributableImages`, test `multi-image-attribution-smoke.mjs`

> ADR này được TÁCH RA từ `workers/duc-auto-chatgpt/v0.1.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
