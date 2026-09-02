---
status: Accepted
adr: 0002
date: 2026-08-24
deciders: Đức
source_section: Kiến trúc & Agent Bridge
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0002 — SUPERSEDES dòng "AI ngoài chỉ được propose" bên dưới, chỉ trong phạm vi Setup

## Bối cảnh

Đức chủ động yêu cầu, để giảm ma sát trước khi mở rộng tiếp sang Tầng 2/3; ranh giới Run là điều duy nhất Đức giữ nguyên tuyệt đối

Nhóm trong bản ghi gốc: Kiến trúc & Agent Bridge.

## Quyết định

**2026-08-24 — SUPERSEDES dòng "AI ngoài chỉ được `propose`" bên dưới, chỉ trong phạm vi Setup.** Tầng 1: AI qua Bridge được toàn quyền như Đức trên mọi thao tác Setup (thêm/sửa/xoá/sắp xếp job, đổi output naming, đổi Run Settings) — **không cần duyệt từng job**. Ranh giới duy nhất còn lại là nút Run — chỉ Đức tự bấm được. Sau khi Run, AI chỉ đọc, không ghi.

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có bốn cột (Quyết định · Vì sao · Ai chốt · Nguồn), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-24. Người chốt: Đức.

Nguồn gốc: Phiên reasoning 2026-08-24, ngay sau khi test sống `queue.propose` lần đầu lộ 2 vấn đề (bug tên file audit, version conflict do debris)

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
