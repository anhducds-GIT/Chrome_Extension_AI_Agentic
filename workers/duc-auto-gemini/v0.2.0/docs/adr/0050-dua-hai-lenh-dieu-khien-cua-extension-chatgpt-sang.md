---
status: Accepted
adr: 0050
date: 2026-08-26
deciders: Đức
source_section: 2026-08-26 (chiều) — Port `run.stop` + `chat.reload` từ worker ChatGPT sang Gemini (owner: Đức)
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0050 — Đưa hai lệnh điều khiển của extension ChatGPT sang extension Gemini

## Bối cảnh

Đức yêu cầu hai extension có cùng năng lực. `chat.reload` còn gỡ được một phụ thuộc vào tay Đức: trước đây gặp `RECEIVER_LOST` là phải nhờ Đức bấm F5.

Nhóm trong bản ghi gốc: 2026-08-26 (chiều) — Port `run.stop` + `chat.reload` từ worker ChatGPT sang Gemini (owner: Đức).

## Quyết định

Đưa hai lệnh điều khiển của extension ChatGPT sang extension Gemini: `run.stop` (dừng) và `chat.reload` (F5 trang).

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có ba cột (Quyết định · Vì sao · Ai chốt), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-26. Người chốt: Đức.

Nguồn gốc: không ghi lại

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
