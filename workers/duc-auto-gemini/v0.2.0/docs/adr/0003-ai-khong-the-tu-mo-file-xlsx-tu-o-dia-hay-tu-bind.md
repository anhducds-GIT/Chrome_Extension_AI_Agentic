---
status: Accepted
adr: 0003
date: không ghi lại
deciders: Claude (coordinator), xác nhận kỹ thuật khi thiết kế Tầng 1
source_section: Kiến trúc & Agent Bridge
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0003 — AI không thể tự mở file .xlsx từ ổ đĩa hay tự bind folder output MỚI

## Bối cảnh

Chrome từ chối gọi các API này từ script; không có cách nào vượt qua bằng code

Nhóm trong bản ghi gốc: Kiến trúc & Agent Bridge.

## Quyết định

AI không thể tự mở file .xlsx từ ổ đĩa hay tự bind folder output MỚI — đây là giới hạn bảo mật trình duyệt (`showOpenFilePicker`/`showDirectoryPicker` cần user gesture thật), không phải lựa chọn chính sách

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có bốn cột (Quyết định · Vì sao · Ai chốt · Nguồn), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted. Người chốt: Claude (coordinator), xác nhận kỹ thuật khi thiết kế Tầng 1.

Nguồn gốc: Chrome File System Access API spec; `drafts/AGENT-BRIDGE-DESIGN-V1.md` (đã ghi nhận `output-profile-core.js` cần handle đã bind sẵn)

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
