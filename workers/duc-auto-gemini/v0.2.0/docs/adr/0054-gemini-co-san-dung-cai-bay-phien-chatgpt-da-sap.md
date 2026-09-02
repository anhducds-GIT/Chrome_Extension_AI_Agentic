---
status: Accepted
adr: 0054
date: 2026-08-26
deciders: Claude
source_section: 2026-08-26 (chiều) — Port `run.stop` + `chat.reload` từ worker ChatGPT sang Gemini (owner: Đức)
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0054 — Gemini có sẵn đúng cái bẫy phiên ChatGPT đã sập

## Bối cảnh

`run.stop` cố ý đi vòng qua khoá nên nó gọi được đúng vào khoảng await đó → cờ dừng bị xoá âm thầm, run vẫn gửi prompt, trong khi người gọi đã được báo "đã dừng".

Nhóm trong bản ghi gốc: 2026-08-26 (chiều) — Port `run.stop` + `chat.reload` từ worker ChatGPT sang Gemini (owner: Đức).

## Quyết định

Gemini có sẵn **đúng cái bẫy** phiên ChatGPT đã sập: `state.stopRequested = false` nằm SAU `await authoritativeValidate`. Đã chuyển lên khoảnh khắc đồng bộ lúc run bắt đầu.

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có ba cột (Quyết định · Vì sao · Ai chốt), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-26. Người chốt: Claude.

Nguồn gốc: không ghi lại

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
