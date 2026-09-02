---
status: Accepted
adr: 0057
date: 2026-08-26
deciders: Claude
source_section: 2026-08-26 (tối) — Trial live cặp stop/reload: bắt được một lời nhắn nói dối (owner: Đức yêu cầu chạy trial)
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0057 — Sửa lời nhắn của run.stop lúc PRE_SUBMIT

## Bối cảnh

Sổ cái live: `BRIDGE_RUN_STOPPED` 14:20:36 (`STOP_REQUESTED_BEFORE_SUBMIT`) → `PROMPT_SUBMITTED` 14:20:37. Câu trấn an kia sai đúng 1 giây sau khi được nói ra. Đây là loại nói dối dự án này từ chối: hệ thống nói với người vận hành một điều dễ chịu mà không đúng.

Nhóm trong bản ghi gốc: 2026-08-26 (tối) — Trial live cặp stop/reload: bắt được một lời nhắn nói dối (owner: Đức yêu cầu chạy trial).

## Quyết định

Sửa lời nhắn của `run.stop` lúc PRE_SUBMIT: bỏ câu *"Không job nào bị gửi thêm"*, thay bằng câu nói rõ job đang chạy VẪN có thể kịp gửi.

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có ba cột (Quyết định · Vì sao · Ai chốt), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-26. Người chốt: Claude.

Nguồn gốc: không ghi lại

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
