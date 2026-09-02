---
status: Accepted
adr: 0031
date: 2026-08-25
deciders: Đức
source_section: 2026-08-25 — Điều chỉnh trần trial: một trial = một chuỗi liên tục ≤10 job (owner: Đức)
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0031 — Bỏ trần "≤2 job/trial"; một trial chạy LIÊN TỤC cả chuỗi ảnh (trần cứng mới: 10…

## Bối cảnh

Mục đích của trial là kiểm chứng cả flow chạy chuỗi — xé lẻ 2 job/lần vừa chậm (chờ 5 phút giữa các lát) vừa không phản ánh hành vi chuỗi thật.

Nhóm trong bản ghi gốc: 2026-08-25 — Điều chỉnh trần trial: một trial = một chuỗi liên tục ≤10 job (owner: Đức).

## Quyết định

Bỏ trần "≤2 job/trial"; một trial chạy LIÊN TỤC cả chuỗi ảnh (trần cứng mới: 10 job/trial). Giãn cách ≥5 phút chỉ áp dụng giữa hai trial khác nhau. Batch >10 job vẫn là nút Run của owner.

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có ba cột (Quyết định · Vì sao · Ai chốt), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-25. Người chốt: Đức.

Nguồn gốc: không ghi lại

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
