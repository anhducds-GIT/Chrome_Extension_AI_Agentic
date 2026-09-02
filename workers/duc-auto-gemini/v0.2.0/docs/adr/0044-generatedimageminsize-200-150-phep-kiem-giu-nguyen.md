---
status: Accepted
adr: 0044
date: 2026-08-26
deciders: Đức
source_section: 2026-08-26 (vòng 3) — Hạ ngưỡng kích thước ảnh sinh ra: 200 → 150 (owner: Đức)
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0044 — generatedImageMinSize: 200 → 150. Phép kiểm giữ nguyên hình dạng (vẫn đòi cả hai…

## Bối cảnh

Số đo thật: ảnh Gemini sinh ra **330 × 180**; ảnh người dùng đính kèm **112 × 112**. Ngưỡng 200 đòi CẢ hai chiều ≥ 200 nên **180 < 200 loại sạch mọi ảnh sinh ra, vĩnh viễn**. 150 nằm giữa 112 và 180, cách rộng cả hai bên — vẫn loại được ảnh nhỏ/biểu tượng mà không sát mép.

Nhóm trong bản ghi gốc: 2026-08-26 (vòng 3) — Hạ ngưỡng kích thước ảnh sinh ra: 200 → 150 (owner: Đức).

## Quyết định

`generatedImageMinSize`: **200 → 150**. Phép kiểm giữ nguyên hình dạng (vẫn đòi cả hai chiều ≥ ngưỡng), chỉ đổi con số.

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có ba cột (Quyết định · Vì sao · Ai chốt), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-26. Người chốt: Đức.

Nguồn gốc: không ghi lại

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
