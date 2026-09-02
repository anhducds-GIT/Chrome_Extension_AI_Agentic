---
status: Accepted
adr: 0051
date: 2026-08-26
deciders: Claude, theo thiết kế gốc
source_section: 2026-08-26 (chiều) — Port `run.stop` + `chat.reload` từ worker ChatGPT sang Gemini (owner: Đức)
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0051 — Giữ nguyên bất đối xứng cố ý của thiết kế gốc

## Bối cảnh

Dừng chỉ BỚT việc, không thêm việc — một lệnh dừng bị từ chối vì "đang chạy" là vô dụng đúng lúc cần nó nhất. Ngược lại F5 giữa chừng giết content script và attempt đang bay, làm mất quota đã tiêu và có nguy cơ gửi lại đúng prompt đó lần thứ hai (vỡ exact-once).

Nhóm trong bản ghi gốc: 2026-08-26 (chiều) — Port `run.stop` + `chat.reload` từ worker ChatGPT sang Gemini (owner: Đức).

## Quyết định

Giữ nguyên bất đối xứng cố ý của thiết kế gốc: **`run.stop` đi VÒNG QUA khoá `RUN_ACTIVE`, `chat.reload` thì BỊ khoá đó chặn.**

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có ba cột (Quyết định · Vì sao · Ai chốt), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-26. Người chốt: Claude, theo thiết kế gốc.

Nguồn gốc: không ghi lại

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
