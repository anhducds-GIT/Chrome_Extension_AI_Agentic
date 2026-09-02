---
status: Accepted
adr: 0046
date: 2026-08-26
deciders: Claude
source_section: 2026-08-26 (vòng 3) — Hạ ngưỡng kích thước ảnh sinh ra: 200 → 150 (owner: Đức)
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0046 — Hai phương án đã thử và bị bằng chứng bác bỏ trong cùng ngày

## Bối cảnh

Cả hai nghe rất hợp lý. Không ghim thì phiên sau dựng lại y hệt.

Nhóm trong bản ghi gốc: 2026-08-26 (vòng 3) — Hạ ngưỡng kích thước ảnh sinh ra: 200 → 150 (owner: Đức).

## Quyết định

Hai phương án đã thử và bị bằng chứng bác bỏ trong cùng ngày — **ghim vào test cấm dựng lại**: (1) chờ blob đổi sang lh3 (đo: 31s/68 lần dò, không đổi); (2) cuộn ảnh vào tầm mắt rồi đo (sai tiền đề: `getBoundingClientRect` trả kích thước layout, độc lập vị trí cuộn).

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có ba cột (Quyết định · Vì sao · Ai chốt), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-26. Người chốt: Claude.

Nguồn gốc: không ghi lại

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
