---
status: Accepted
adr: 0038
date: 2026-08-26
deciders: Claude
source_section: Roadmap tự hành (chốt sau audit 2026-08-24)
migrated_from: workers/duc-auto-chatgpt/v0.1.0/decisions.md
---

# ADR-0038 — Cờ stopRequested được xoá tại KHOÁ mở run (tryBeginRun), không phải giữa run() nữa

## Bối cảnh

Lỗi này KHÔNG nằm trong gói việc; phát hiện khi kiểm chứng cái bẫy mà gói việc dặn "đừng tin dòng chữ này, hãy test" — test đúng là thứ tìm ra nó

Nhóm trong bản ghi gốc: Roadmap tự hành (chốt sau audit 2026-08-24).

## Quyết định

**2026-08-26 — Cờ `stopRequested` được xoá tại KHOÁ mở run (`tryBeginRun`), không phải giữa `run()` nữa.** Chỗ cũ nằm sau lần `await` đầu tiên của `run()`. Vì `run.stop` đi vòng qua khoá, nó có thể rơi đúng vào cửa sổ await đó — và bị xoá âm thầm: bên gọi được báo "đã dừng" trong khi run vẫn gửi prompt tiếp. Chuyển lên khoá giữ nguyên tính chất cũ (dừng lúc rảnh không giết run kế tiếp) và thêm tính chất còn thiếu (dừng sau khi run đã bắt đầu thì luôn có hiệu lực).

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-chatgpt/v0.1.0/decisions.md` chỉ có bốn cột (Quyết định · Vì sao · Ai chốt · Nguồn), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-26. Người chốt: Claude.

Nguồn gốc: `approval-persistence-core.js` `tryBeginRun`; 4 phép kiểm hành vi trong `tests/bridge-run-stop-smoke.mjs`

> ADR này được TÁCH RA từ `workers/duc-auto-chatgpt/v0.1.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
