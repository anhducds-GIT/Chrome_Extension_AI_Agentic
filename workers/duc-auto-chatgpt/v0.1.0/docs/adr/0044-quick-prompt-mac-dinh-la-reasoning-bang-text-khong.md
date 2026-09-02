---
status: Accepted
adr: 0044
date: 2026-08-28
deciders: Đức
source_section: Roadmap tự hành (chốt sau audit 2026-08-24)
migrated_from: workers/duc-auto-chatgpt/v0.1.0/decisions.md
---

# ADR-0044 — Quick Prompt mặc định là "Reasoning bằng text", KHÔNG phải "Tạo ảnh"

## Bối cảnh

Reasoning bằng text là việc Đức đang dùng thật; ảnh vẫn chọn được bằng một cú bấm trong cùng ô

Nhóm trong bản ghi gốc: Roadmap tự hành (chốt sau audit 2026-08-24).

## Quyết định

**2026-08-28 — Quick Prompt mặc định là "Reasoning bằng text", KHÔNG phải "Tạo ảnh".** Codex đặt mặc định này khi thêm `text_reasoning` và tự ghi là "suy đoán an toàn" chứ Đức chưa duyệt; Claude tách ra hỏi riêng vì nó đổi thói quen thao tác hằng ngày của Đức — mở panel gõ prompt như mọi hôm thì nay ra text chứ không ra ảnh. Đức chạy trial live 3 job text (3/3 SUCCESS) rồi chốt **giữ nguyên**. Lưu ý phạm vi: điều này CHỈ áp cho ô nhập nhanh. **Dòng XLSX cũ không có cột `task_type` vẫn mặc định `image_generation`** — tương thích ngược không đổi, có test ghim (`tests/text-reasoning-mode-smoke.mjs`).

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-chatgpt/v0.1.0/decisions.md` chỉ có bốn cột (Quyết định · Vì sao · Ai chốt · Nguồn), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-28. Người chốt: Đức.

Nguồn gốc: Phiên 2026-08-28, sau trial live `Quick-2026-08-28T02-46`

> ADR này được TÁCH RA từ `workers/duc-auto-chatgpt/v0.1.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
