---
status: Accepted
adr: 0048
date: 2026-08-26
deciders: Claude
source_section: 2026-08-26 (chiều) — Vá lỗi cổng kiểm đọc sai đường dẫn tiếng Việt (owner: Đức)
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0048 — Ghim bằng test thật tests/session-check-utf8-paths.mjs, nối vào npm test

## Bối cảnh

Luật vàng số 2: mỗi fix một test ghim. Đã phá thử cả hai chiều — gỡ cờ khỏi session-check thì đỏ, gỡ `.map(unquote)` khỏi safe-push thì đỏ, phục hồi thì xanh. Test tĩnh không thôi thì yếu, nên phần 1 kiểm hành vi git thật.

Nhóm trong bản ghi gốc: 2026-08-26 (chiều) — Vá lỗi cổng kiểm đọc sai đường dẫn tiếng Việt (owner: Đức).

## Quyết định

Ghim bằng test thật `tests/session-check-utf8-paths.mjs`, nối vào `npm test`. Test dựng repo git dùng một lần trong thư mục tạm, chứng minh cờ đó THẬT SỰ cần, rồi mới kiểm hai script có xin cờ không.

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có ba cột (Quyết định · Vì sao · Ai chốt), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-26. Người chốt: Claude.

Nguồn gốc: không ghi lại

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
