---
status: Accepted
adr: 0020
date: 2026-08-26
deciders: Claude, sau audit Antigravity 2 vòng (PASS)
source_section: Quy ước dữ liệu / workbook
migrated_from: workers/duc-auto-chatgpt/v0.1.0/decisions.md
---

# ADR-0020 — Một run khoá đúng MỘT tab và MỘT hội thoại

## Bối cảnh

Trước đó tab được giải lại ở MỖI lần gửi, nên đổi tab giữa chừng là runner âm thầm gõ prompt sang chat khác và đọc ảnh của chat đó về như output của job mình — attribution không thể tự vệ, vì nó suy luận trên một trang mà bị đưa cho một trang khác. Đã cắn thật 2 lần ngày 26/08

Nhóm trong bản ghi gốc: Quy ước dữ liệu / workbook.

## Quyết định

**2026-08-26 — Một run khoá đúng MỘT tab và MỘT hội thoại:** tab được chọn một lần lúc bắt đầu run (trước cả bước kiểm tra), sau đó mọi message chỉ gửi tới đúng tab id đó. Tab biến mất, rời ChatGPT, hoặc **đổi sang hội thoại khác** đều là `RECEIVER_LOST` (hard stop). Ngoại lệ hợp lệ duy nhất: run bắt đầu ở trang chat mới thì được *nhận* hội thoại `/c/<id>` do chính prompt đầu tiên của nó tạo ra

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-chatgpt/v0.1.0/decisions.md` chỉ có bốn cột (Quyết định · Vì sao · Ai chốt · Nguồn), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-26. Người chốt: Claude, sau audit Antigravity 2 vòng (PASS).

Nguồn gốc: `sidepanel.js` `bindRunTab`/`activeTab`, test `tests/bound-tab-static.mjs`, BACKLOG B-01

> ADR này được TÁCH RA từ `workers/duc-auto-chatgpt/v0.1.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
