---
status: Accepted
adr: 0058
date: 2026-08-26
deciders: Claude
source_section: 2026-08-26 (tối) — Trial live cặp stop/reload: bắt được một lời nhắn nói dối (owner: Đức yêu cầu chạy trial)
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0058 — KHÔNG đổi thời điểm cờ dừng ăn (để job đang chạy không kịp gửi).

## Bối cảnh

Đó là đổi luật an toàn (`AGENTS.md` mục 2.4) và cần đo trước. Bản vá lời nhắn là bản vá TRUNG THỰC với chi phí bằng không; đổi hành vi dừng là việc khác, phải hỏi Đức riêng.

Nhóm trong bản ghi gốc: 2026-08-26 (tối) — Trial live cặp stop/reload: bắt được một lời nhắn nói dối (owner: Đức yêu cầu chạy trial).

## Quyết định

KHÔNG đổi thời điểm cờ dừng ăn (để job đang chạy không kịp gửi).

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có ba cột (Quyết định · Vì sao · Ai chốt), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-26. Người chốt: Claude.

Nguồn gốc: không ghi lại

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
