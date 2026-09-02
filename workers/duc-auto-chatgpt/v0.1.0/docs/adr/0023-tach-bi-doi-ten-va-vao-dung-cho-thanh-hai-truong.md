---
status: Accepted
adr: 0023
date: 2026-08-26
deciders: Claude, theo phát hiện của Codex
source_section: Quy ước dữ liệu / workbook
migrated_from: workers/duc-auto-chatgpt/v0.1.0/decisions.md
---

# ADR-0023 — Tách "bị đổi tên" và "vào đúng chỗ" thành HAI trường

## Bối cảnh

`conflictAction` của Chrome chỉ đổi được TÊN FILE, không đổi được thư mục — nên gộp hai câu hỏi vào một từ khiến cả hai đều không trả lời được đúng. Chrome cũng không cho biết thư mục Downloads gốc, nên phép so chỉ được khai đúng bằng cái nó đo

Nhóm trong bản ghi gốc: Quy ước dữ liệu / workbook.

## Quyết định

**2026-08-26 — Tách "bị đổi tên" và "vào đúng chỗ" thành HAI trường:** `write_outcome` so tên file (chính xác từng ký tự) trả lời "có bị đổi tên tránh trùng không"; trường mới `landed_as_requested` trả lời "có vào đúng thư mục không", và được khai rõ là **phép so đuôi đường dẫn** chứ không phải bằng chứng đường dẫn đã phân giải

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-chatgpt/v0.1.0/decisions.md` chỉ có bốn cột (Quyết định · Vì sao · Ai chốt · Nguồn), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-26. Người chốt: Claude, theo phát hiện của Codex.

Nguồn gốc: `background.js`, `sidepanel.js` audit `OUTPUT_SAVED`

> ADR này được TÁCH RA từ `workers/duc-auto-chatgpt/v0.1.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
