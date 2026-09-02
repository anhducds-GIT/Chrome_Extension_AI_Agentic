---
status: Accepted
adr: 0039
date: 2026-08-24
deciders: Đức
source_section: Roadmap tự hành (chốt sau audit 2026-08-24)
migrated_from: workers/duc-auto-chatgpt/v0.1.0/decisions.md
---

# ADR-0039 — Nguyên tắc thiết kế Bridge

## Bối cảnh

Đức muốn tối giản và tiết kiệm thời gian user trong mô hình tự hành

Nhóm trong bản ghi gốc: Roadmap tự hành (chốt sau audit 2026-08-24).

## Quyết định

**Nguyên tắc thiết kế Bridge: "AI là bộ não, người dùng là cánh tay."** Mọi điểm chặn cần thao tác người thật (chọn file, cấp quyền folder, bật công tắc) phải được AI/UI dọn sẵn tới mức chỉ bấm hoặc copy-paste, không phải suy nghĩ hay tự tìm đường: nút mở đúng hộp thoại ngay tại chỗ, đường dẫn đúng kèm nút Copy, hướng dẫn 1 câu. Tab BRIDGE là nơi tập trung duy nhất của các tương tác này. Áp dụng cho mọi tính năng Bridge từ nay về sau.

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-chatgpt/v0.1.0/decisions.md` chỉ có bốn cột (Quyết định · Vì sao · Ai chốt · Nguồn), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-24. Người chốt: Đức.

Nguồn gốc: Phiên 2026-08-24, khi xây khối "Cần thao tác của Đức"

> ADR này được TÁCH RA từ `workers/duc-auto-chatgpt/v0.1.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
