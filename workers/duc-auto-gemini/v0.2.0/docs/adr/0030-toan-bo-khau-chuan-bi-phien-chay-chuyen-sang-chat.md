---
status: Accepted
adr: 0030
date: 2026-08-25
deciders: Đức
source_section: 2026-08-25 — Workflow điều khiển từ chat: owner chỉ còn "tạo thư mục" và "bấm Run" (owner: Đức)
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0030 — Toàn bộ khâu chuẩn bị phiên chạy chuyển sang chat

## Bối cảnh

Extension không đọc được thư mục máy (giới hạn Chrome) nhưng AI đọc được — nên khâu "chọn file" qua giao diện là thừa. Giảm thao tác thủ công của owner xuống tối thiểu đúng theo nguyên tắc "AI là bộ não, người là cánh tay".

Nhóm trong bản ghi gốc: 2026-08-25 — Workflow điều khiển từ chat: owner chỉ còn "tạo thư mục" và "bấm Run" (owner: Đức).

## Quyết định

Toàn bộ khâu chuẩn bị phiên chạy chuyển sang chat: Đức tạo thư mục và gửi đường dẫn; AI tự đọc workbook + ảnh, tự bơm qua Bridge (jobs.add + references.add mới + run_settings.configure + output.configure). Giao diện extension không còn là nơi làm việc chính. Hai thao tác còn lại của owner: đưa đường dẫn thư mục, và bấm Run cho batch sản xuất (trial ≤2 job theo exception dev đã chốt).

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có ba cột (Quyết định · Vì sao · Ai chốt), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-25. Người chốt: Đức.

Nguồn gốc: không ghi lại

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
