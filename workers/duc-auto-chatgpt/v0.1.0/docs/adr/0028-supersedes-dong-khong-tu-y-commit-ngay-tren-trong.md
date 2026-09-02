---
status: Accepted
adr: 0028
date: 2026-08-24
deciders: Đức
source_section: Vận hành / UI
migrated_from: workers/duc-auto-chatgpt/v0.1.0/decisions.md
---

# ADR-0028 — SUPERSEDES dòng "Không tự ý commit" ngay trên, trong phạm vi project này

## Bối cảnh

Đức không code, muốn AI chủ động thay vì chờ duyệt từng commit; git revert luôn khôi phục được nên rủi ro chấp nhận được

Nhóm trong bản ghi gốc: Vận hành / UI.

## Quyết định

**2026-08-24 — SUPERSEDES dòng "Không tự ý commit" ngay trên, trong phạm vi project này.** AI (Claude/Codex) được toàn quyền `git commit`, kể cả vào `main`, với 4 điều kiện an toàn: (1) toàn bộ test phải xanh trước khi commit; (2) không bao giờ `push --force` / rewrite history — lịch sử git là đường lùi duy nhất của Đức; (3) mỗi commit phải có 1 dòng Log trong `HANDOFF.md` nói rõ commit gì, vì sao; (4) xoá file, sửa pilot evidence, và mọi thay đổi ranh giới Run vẫn phải hỏi Đức như cũ

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-chatgpt/v0.1.0/decisions.md` chỉ có bốn cột (Quyết định · Vì sao · Ai chốt · Nguồn), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-24. Người chốt: Đức.

Nguồn gốc: Phiên audit 2026-08-24, chốt 5 điểm roadmap (điểm 5, Đức nới rộng hơn đề xuất gốc "chỉ nhánh làm việc")

> ADR này được TÁCH RA từ `workers/duc-auto-chatgpt/v0.1.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
