---
status: Accepted
adr: 0045
date: 2026-08-26
deciders: Claude
source_section: 2026-08-26 (vòng 3) — Hạ ngưỡng kích thước ảnh sinh ra: 200 → 150 (owner: Đức)
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0045 — Ghi nhận: bug này đã nằm đó từ đầu, bị che bởi remoteVerifiedResult (lớp khoan…

## Bối cảnh

Để phiên sau hiểu vì sao một phép kiểm sai lại sống được nhiều ngày mà mọi thứ vẫn xanh.

Nhóm trong bản ghi gốc: 2026-08-26 (vòng 3) — Hạ ngưỡng kích thước ảnh sinh ra: 200 → 150 (owner: Đức).

## Quyết định

Ghi nhận: bug này **đã nằm đó từ đầu**, bị che bởi `remoteVerifiedResult` (lớp khoan dung Pilot-04 bỏ qua hẳn phép kiểm kích thước cho ảnh `https://lh3`). Batch-SX-01 đạt 12/12 là nhờ lớp che đó, **không** phải nhờ phép kiểm kích thước đúng. Gemini chuyển sang render `blob:` → lớp che mất → bug lộ.

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có ba cột (Quyết định · Vì sao · Ai chốt), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-26. Người chốt: Claude.

Nguồn gốc: không ghi lại

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
