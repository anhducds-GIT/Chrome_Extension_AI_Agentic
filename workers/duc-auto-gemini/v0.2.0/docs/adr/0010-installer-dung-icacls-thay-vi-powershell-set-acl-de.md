---
status: Accepted
adr: 0010
date: không ghi lại
deciders: Claude, xác nhận bằng test thật trên máy Đức
source_section: Kiến trúc & Agent Bridge
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0010 — Installer dùng icacls thay vì PowerShell Set-Acl để khoá quyền thư mục cài đặt

## Bối cảnh

`Set-Acl` với `New-Object DirectorySecurity` (không bắt nguồn từ `Get-Acl`) gây lỗi `PrivilegeNotHeldException: SeSecurityPrivilege` với mọi tài khoản, kể cả tài khoản chạy trực tiếp của Đức — đã tái hiện lỗi thật, không phải giả thuyết

Nhóm trong bản ghi gốc: Kiến trúc & Agent Bridge.

## Quyết định

Installer dùng `icacls` thay vì PowerShell `Set-Acl` để khoá quyền thư mục cài đặt

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có bốn cột (Quyết định · Vì sao · Ai chốt · Nguồn), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted. Người chốt: Claude, xác nhận bằng test thật trên máy Đức.

Nguồn gốc: 2026-08-24, phiên cài Bridge đầu tiên

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
