---
status: Accepted
adr: 0052
date: 2026-08-26
deciders: Claude
source_section: 2026-08-26 (chiều) — Port `run.stop` + `chat.reload` từ worker ChatGPT sang Gemini (owner: Đức)
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0052 — KHÔNG chép nguyên xi. Worker Gemini không có createQueueRunLock như ChatGPT, nên…

## Bối cảnh

Chép mù một khoá không tồn tại thì code chạy nhưng không khoá gì cả — nguy hiểm hơn là không port.

Nhóm trong bản ghi gốc: 2026-08-26 (chiều) — Port `run.stop` + `chat.reload` từ worker ChatGPT sang Gemini (owner: Đức).

## Quyết định

**KHÔNG chép nguyên xi.** Worker Gemini không có `createQueueRunLock` như ChatGPT, nên chốt khởi động run được dựng thẳng trong `run()`, và `chat.reload` giành khoá qua `state.queueMutationRunning`.

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có ba cột (Quyết định · Vì sao · Ai chốt), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-26. Người chốt: Claude.

Nguồn gốc: không ghi lại

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
