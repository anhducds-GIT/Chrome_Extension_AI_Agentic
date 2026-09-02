---
status: Accepted
adr: 0015
date: không ghi lại
deciders: Claude, sau khi Đức phản hồi workbook cũ "đòi hỏi quá nhiều field"
source_section: Quy ước dữ liệu / workbook
migrated_from: workers/duc-auto-chatgpt/v0.1.0/decisions.md
---

# ADR-0015 — id/prompt là 2 cột bắt buộc duy nhất trên sheet jobs

## Bối cảnh

Giữ workbook mới đơn giản nhất có thể cho Đức — chỉ cần dán `id + prompt`

Nhóm trong bản ghi gốc: Quy ước dữ liệu / workbook.

## Quyết định

`id`/`prompt` là 2 cột bắt buộc duy nhất trên sheet `jobs`; `config` luôn optional với default hợp lý

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-chatgpt/v0.1.0/decisions.md` chỉ có bốn cột (Quyết định · Vì sao · Ai chốt · Nguồn), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted. Người chốt: Claude, sau khi Đức phản hồi workbook cũ "đòi hỏi quá nhiều field".

Nguồn gốc: `HANDOFF.md` dòng 145-150, `DAC_XLSX_RUN_PLAN_V1.md`

> ADR này được TÁCH RA từ `workers/duc-auto-chatgpt/v0.1.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
