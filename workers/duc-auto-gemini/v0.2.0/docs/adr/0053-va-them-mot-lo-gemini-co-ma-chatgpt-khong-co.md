---
status: Accepted
adr: 0053
date: 2026-08-26
deciders: Claude
source_section: 2026-08-26 (chiều) — Port `run.stop` + `chat.reload` từ worker ChatGPT sang Gemini (owner: Đức)
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0053 — Vá thêm một lỗ Gemini có mà ChatGPT không có

## Bối cảnh

Đúng cái lỗ mà `chat.reload` sinh ra để bịt. Chốt đặt trong `run()` vì đó là chỗ duy nhất cả nút của người lẫn Bridge đều đi qua.

Nhóm trong bản ghi gốc: 2026-08-26 (chiều) — Port `run.stop` + `chat.reload` từ worker ChatGPT sang Gemini (owner: Đức).

## Quyết định

Vá thêm một lỗ Gemini có mà ChatGPT không có: **`run()` trước đây không có chốt nào.** Nút Run bị `controls()` làm mờ, nhưng `run.trial` qua Bridge gọi thẳng `run()` và chỉ kiểm `state.running` — nên một trial vẫn khởi động được ngay giữa lúc `chat.reload` đang F5 trang.

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có ba cột (Quyết định · Vì sao · Ai chốt), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-26. Người chốt: Claude.

Nguồn gốc: không ghi lại

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
