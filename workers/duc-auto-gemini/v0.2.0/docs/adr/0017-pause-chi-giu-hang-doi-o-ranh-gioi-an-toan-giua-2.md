---
status: Accepted
adr: 0017
date: không ghi lại
deciders: Claude
source_section: Vận hành / UI
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0017 — Pause chỉ giữ hàng đợi ở ranh giới an toàn giữa 2 job, không bao giờ ngắt 1 job…

## Bối cảnh

Exact-once submission — job đã gửi không thể an toàn tạm ngưng giữa chừng

Nhóm trong bản ghi gốc: Vận hành / UI.

## Quyết định

Pause chỉ giữ hàng đợi ở ranh giới an toàn giữa 2 job, không bao giờ ngắt 1 job đang generate giữa chừng

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có bốn cột (Quyết định · Vì sao · Ai chốt · Nguồn), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted. Người chốt: Claude.

Nguồn gốc: `HANDOFF.md` dòng 132, `sidepanel.js` dòng 3887-3894

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
