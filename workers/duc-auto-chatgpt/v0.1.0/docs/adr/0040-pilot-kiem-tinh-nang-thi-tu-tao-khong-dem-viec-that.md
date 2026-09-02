---
status: Accepted
adr: 0040
date: 2026-08-26
deciders: Đức
source_section: Roadmap tự hành (chốt sau audit 2026-08-24)
migrated_from: workers/duc-auto-chatgpt/v0.1.0/decisions.md
---

# ADR-0040 — Pilot kiểm tính năng thì TỰ TẠO, không đem việc thật ra đo

## Bối cảnh

Kiểm tính năng cần tín hiệu nhị phân, không cần dữ liệu thật

Nhóm trong bản ghi gốc: Roadmap tự hành (chốt sau audit 2026-08-24).

## Quyết định

**2026-08-26 — Pilot kiểm tính năng thì TỰ TẠO, không đem việc thật ra đo.** Đức bác phương án lấy 3 job thật của Pilot-08 làm pilot ảnh tham chiếu, yêu cầu dựng một pilot nhỏ chỉ để kiểm tính năng. Hoá ra đo chắc hơn: ảnh tham chiếu tự tạo (một hình + một màu + chữ nhãn) khiến kết quả **tự tố cáo** — ảnh ra đúng hình đúng màu thì ảnh tham chiếu đã tới, sai thì chưa. Việc thật không cho tín hiệu rõ như vậy.

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-chatgpt/v0.1.0/decisions.md` chỉ có bốn cột (Quyết định · Vì sao · Ai chốt · Nguồn), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-26. Người chốt: Đức.

Nguồn gốc: Pilot-14, 3/3 SUCCESS

> ADR này được TÁCH RA từ `workers/duc-auto-chatgpt/v0.1.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
