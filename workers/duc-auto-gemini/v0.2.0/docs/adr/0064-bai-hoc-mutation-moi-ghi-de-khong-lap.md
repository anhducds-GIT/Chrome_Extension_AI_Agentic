---
status: Accepted
adr: 0064
date: 2026-08-27
deciders: Claude
source_section: 2026-08-27 — G-01: sửa hành vi "dừng nhận trước lúc gửi ⇒ không gửi" (owner: Đức, Go trong chat)
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0064 — Bài học mutation mới, ghi để không lặp

## Bối cảnh

Cùng họ với bài học 27/08 "mutation-test đường nối": thứ cần ghim là dữ liệu LÊN TÀU, không phải dữ liệu được chuẩn bị.

Nhóm trong bản ghi gốc: 2026-08-27 — G-01: sửa hành vi "dừng nhận trước lúc gửi ⇒ không gửi" (owner: Đức, Go trong chat).

## Quyết định

**Bài học mutation mới, ghi để không lặp:** bản đầu của test tĩnh khớp chỗ *dựng* danh tính (`const scoped = ...`) nên mutation "dựng mà không gửi" (`send({type:"DAC_ABORT"})` trần) vẫn xanh. Đã siết: phép ghim phải khớp NGAY TRONG câu lệnh send.

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có ba cột (Quyết định · Vì sao · Ai chốt), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-27. Người chốt: Claude.

Nguồn gốc: không ghi lại

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
