---
status: Accepted
adr: 0021
date: 2026-08-26
deciders: Claude, theo phát hiện của Antigravity
source_section: Quy ước dữ liệu / workbook
migrated_from: workers/duc-auto-chatgpt/v0.1.0/decisions.md
---

# ADR-0021 — Địa chỉ chưa biết thì HOÃN phán xét, không dừng cứng

## Bối cảnh

Kiểm origin trên chuỗi rỗng sẽ dừng cứng đúng vào lúc trang điều hướng — mà đó chính là lúc gửi prompt đầu tiên của mọi hội thoại mới. Lá chắn tự bắn vào chân mình

Nhóm trong bản ghi gốc: Quy ước dữ liệu / workbook.

## Quyết định

**2026-08-26 — Địa chỉ chưa biết thì HOÃN phán xét, không dừng cứng:** giữa lúc Chrome commit điều hướng, `tab.url` rỗng và đích nằm ở `pendingUrl`. Đọc cả hai; nếu vẫn rỗng thì trả tab về cho ping của content script quyết định, không coi là sai tab

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-chatgpt/v0.1.0/decisions.md` chỉ có bốn cột (Quyết định · Vì sao · Ai chốt · Nguồn), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-26. Người chốt: Claude, theo phát hiện của Antigravity.

Nguồn gốc: `sidepanel.js` `activeTab`

> ADR này được TÁCH RA từ `workers/duc-auto-chatgpt/v0.1.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
