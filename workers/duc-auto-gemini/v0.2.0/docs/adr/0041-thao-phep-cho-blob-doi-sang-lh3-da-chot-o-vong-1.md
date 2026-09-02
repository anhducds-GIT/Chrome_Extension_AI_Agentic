---
status: Accepted
adr: 0041
date: 2026-08-26
deciders: Đức (vòng 1) → số liệu bác bỏ → Đức (vòng 2)
source_section: 2026-08-26 (vòng 2) — Đưa ảnh vào tầm mắt rồi mới đo, KHÔNG nới lớp kiểm (owner: Đức)
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0041 — Tháo phép chờ "blob đổi sang lh3" đã chốt ở vòng 1 cùng ngày.

## Bối cảnh

Đã ĐO và bác bỏ: chờ 31 giây / 68 lần dò, không đổi; `dom_probe` xác nhận **6/6 ảnh sinh ra vẫn giữ địa chỉ blob sau nhiều phút**. Gemini không đổi. Giữ lại chỉ đốt thêm 30 giây mỗi lần trượt mà kết quả không khác. Đây là ví dụ vì sao mọi phương án phải đo được: vòng 1 nghe rất hợp lý và sai.

Nhóm trong bản ghi gốc: 2026-08-26 (vòng 2) — Đưa ảnh vào tầm mắt rồi mới đo, KHÔNG nới lớp kiểm (owner: Đức).

## Quyết định

**Tháo** phép chờ "blob đổi sang lh3" đã chốt ở vòng 1 cùng ngày.

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có ba cột (Quyết định · Vì sao · Ai chốt), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-26. Người chốt: Đức (vòng 1) → số liệu bác bỏ → Đức (vòng 2).

Nguồn gốc: không ghi lại

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
