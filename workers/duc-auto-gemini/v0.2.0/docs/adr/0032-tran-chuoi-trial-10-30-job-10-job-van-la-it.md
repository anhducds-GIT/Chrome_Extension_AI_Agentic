---
status: Accepted
adr: 0032
date: 2026-08-25
deciders: Đức
source_section: 2026-08-25 (chiều) — Nâng trần chuỗi trial lên 30 job + AI chạy batch sản xuất thay owner (owner: Đức)
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0032 — Trần chuỗi trial 10 → 30 job ("10 job vẫn là ít")

## Bối cảnh

Workload thật của owner là 20–30 ảnh/lượt; quota dồi dào; các hàng rào còn lại giữ nguyên (Dev Mode toggle, ≥5 phút giữa trial, timeout/delay, audit bridge_dev).

Nhóm trong bản ghi gốc: 2026-08-25 (chiều) — Nâng trần chuỗi trial lên 30 job + AI chạy batch sản xuất thay owner (owner: Đức).

## Quyết định

Trần chuỗi trial 10 → 30 job ("10 job vẫn là ít"); owner ủy quyền cho AI tự triển khai batch sản xuất kiểm chứng (>10 job) thay vì owner bấm Run; đồng thời duyệt: port kỹ thuật đặt-tên-download từ worker ChatGPT, xây lệnh chẩn đoán DOM qua Bridge, và PUSH repo lên remote.

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có ba cột (Quyết định · Vì sao · Ai chốt), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-25. Người chốt: Đức.

Nguồn gốc: không ghi lại

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
