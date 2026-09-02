---
status: Accepted
adr: 0037
date: 2026-08-26
deciders: Claude (theo gói việc drafts/RUN-STOP-CHAT-RELOAD-HANDOFF.md, Đức chốt hướng 2026-08-26)
source_section: Roadmap tự hành (chốt sau audit 2026-08-24)
migrated_from: workers/duc-auto-chatgpt/v0.1.0/decisions.md
---

# ADR-0037 — run.stop ĐI VÒNG QUA khoá RUN_ACTIVE

## Bối cảnh

Đây là ngoại lệ có lý do, không phải thiếu nhất quán — ghi lại để vòng audit sau không "sửa cho nhất quán" rồi vô hiệu hoá cả hai

Nhóm trong bản ghi gốc: Roadmap tự hành (chốt sau audit 2026-08-24).

## Quyết định

**2026-08-26 — `run.stop` ĐI VÒNG QUA khoá `RUN_ACTIVE`; `chat.reload` thì BỊ khoá đó CHẶN.** Hai method sinh đôi, ngược chiều nhau có chủ đích. `run.stop`: mọi lệnh ghi khác bị từ chối khi run đang chạy vì chúng có thể đổi việc run sắp làm — còn dừng thì chỉ *bớt* việc đi, không bao giờ thêm. Một lệnh dừng bị từ chối vì "đang chạy" là vô dụng đúng lúc cần nhất. `chat.reload`: F5 giết content script và mọi attempt đang bay, làm mất dấu một lượt ĐÃ tốn quota và khiến lần retry sau có thể gửi lại prompt — phá "gửi đúng một lần", bất biến không được phép yếu đi. Cách dùng đúng là nối tiếp: `run.stop` → `chat.reload` → chạy lại.

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-chatgpt/v0.1.0/decisions.md` chỉ có bốn cột (Quyết định · Vì sao · Ai chốt · Nguồn), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-26. Người chốt: Claude (theo gói việc `drafts/RUN-STOP-CHAT-RELOAD-HANDOFF.md`, Đức chốt hướng 2026-08-26).

Nguồn gốc: `tests/bridge-run-stop-smoke.mjs`, `tests/bridge-chat-reload-smoke.mjs` ghim cả hai chiều

> ADR này được TÁCH RA từ `workers/duc-auto-chatgpt/v0.1.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
