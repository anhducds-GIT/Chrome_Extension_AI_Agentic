---
status: Accepted
adr: 0012
date: không ghi lại
deciders: Đức
source_section: Quy ước dữ liệu / workbook
migrated_from: workers/duc-auto-chatgpt/v0.1.0/decisions.md
---

# ADR-0012 — Job ID chuyển từ chữ cái (P06-A, P06-B...) sang số thứ tự (P08-...-01, P09-01...)

## Bối cảnh

Đức yêu cầu; thứ tự chạy thật vốn đã theo row trong sheet, không theo giá trị `id` — số thứ tự khớp trực giác hơn

Nhóm trong bản ghi gốc: Quy ước dữ liệu / workbook.

## Quyết định

Job ID chuyển từ chữ cái (`P06-A`, `P06-B`...) sang số thứ tự (`P08-...-01`, `P09-01`...)

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-chatgpt/v0.1.0/decisions.md` chỉ có bốn cột (Quyết định · Vì sao · Ai chốt · Nguồn), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted. Người chốt: Đức.

Nguồn gốc: `HANDOFF.md` dòng 159-160; xác nhận lại 2026-08-24 khi tạo Pilot-09, cập nhật vào `DAC_XLSX_RUN_PLAN_V1.md`

> ADR này được TÁCH RA từ `workers/duc-auto-chatgpt/v0.1.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
