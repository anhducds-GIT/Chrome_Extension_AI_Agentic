---
status: Accepted
adr: 0028
date: 2026-08-25
deciders: Đức
source_section: 2026-08-25 — Điều chỉnh trần tần suất trial (owner: Đức)
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0028 — Bỏ trần "≤6 trial/giờ"; thay bằng: hai trial liên tiếp phải cách nhau tối thiểu 5…

## Bối cảnh

Quota tạo ảnh của owner rất dồi dào — cái cần kiểm soát là nhịp độ (tránh hành vi máy móc dồn dập), không phải tổng số lượng.

Nhóm trong bản ghi gốc: 2026-08-25 — Điều chỉnh trần tần suất trial (owner: Đức).

## Quyết định

Bỏ trần "≤6 trial/giờ"; thay bằng: hai trial liên tiếp phải cách nhau tối thiểu 5 phút.

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có ba cột (Quyết định · Vì sao · Ai chốt), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-25. Người chốt: Đức.

Nguồn gốc: không ghi lại

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
