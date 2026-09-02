---
status: Accepted
adr: 0022
date: 2026-08-26
deciders: Claude, sau audit Codex 3 vòng (PASS)
source_section: Quy ước dữ liệu / workbook
migrated_from: workers/duc-auto-chatgpt/v0.1.0/decisions.md
---

# ADR-0022 — write_outcome chỉ nói điều quan sát được, không nói điều được PHÉP làm

## Bối cảnh

Khai một lần ghi đầu tiên thành "đã phá bằng chứng cũ" là nói dối, chỉ là nói dối ngược chiều với lỗi vừa vá. `collision_policy` vẫn báo riêng nên ý định của người dùng không mất

Nhóm trong bản ghi gốc: Quy ước dữ liệu / workbook.

## Quyết định

**2026-08-26 — `write_outcome` chỉ nói điều quan sát được, không nói điều được PHÉP làm:** ở đường Downloads, `overwritten` bị **gỡ hẳn**. Tải xong với `conflictAction: "overwrite"` chỉ chứng minh Chrome *được phép* ghi đè, không chứng minh có file nào bị thay. Đường ghi thư mục dò trước được nên vẫn giữ `overwritten` — bất đối xứng có chủ đích

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-chatgpt/v0.1.0/decisions.md` chỉ có bốn cột (Quyết định · Vì sao · Ai chốt · Nguồn), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-26. Người chốt: Claude, sau audit Codex 3 vòng (PASS).

Nguồn gốc: `background.js`, test `tests/output-routing-static.mjs`

> ADR này được TÁCH RA từ `workers/duc-auto-chatgpt/v0.1.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
