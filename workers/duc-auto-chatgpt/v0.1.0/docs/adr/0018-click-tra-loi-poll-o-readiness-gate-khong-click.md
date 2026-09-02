---
status: Accepted
adr: 0018
date: 2026-08-25
deciders: Claude (khi implement), lệch có chủ đích so với brief
source_section: Quy ước dữ liệu / workbook
migrated_from: workers/duc-auto-chatgpt/v0.1.0/decisions.md
---

# ADR-0018 — Click trả lời poll ở readiness gate, KHÔNG click trong lúc dò ảnh

## Bối cảnh

Lúc `waitForCompletion` chạy, ảnh của job vẫn còn trên màn hình và URL blob/CDN vẫn sống — chưa lưu xong. Bấm poll lúc đó có thể làm ChatGPT thay/gỡ khối ảnh trước khi extension kịp ghi file. Readiness gate chạy SAU khi mọi ảnh đã verified trên đĩa, nên bấm ở đó là an toàn tuyệt đối. Poll xuất hiện sau khi sinh xong (bằng chứng sống Q001/Q002 2026-08-25) nên không có ca nào bị kẹt vì hoãn click

Nhóm trong bản ghi gốc: Quy ước dữ liệu / workbook.

## Quyết định

**2026-08-25 — Click trả lời poll ở readiness gate, KHÔNG click trong lúc dò ảnh:** brief ban đầu ghi "auto-click trong readiness gate VÀ waitForCompletion". Khi implement chỉ click ở readiness gate; `waitForCompletion` chỉ GHI NHẬN poll (`detection_diagnostics.ab_poll`) chứ không bấm

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-chatgpt/v0.1.0/decisions.md` chỉ có bốn cột (Quyết định · Vì sao · Ai chốt · Nguồn), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-25. Người chốt: Claude (khi implement), lệch có chủ đích so với brief.

Nguồn gốc: `content.js` `waitForCompletion` / `waitForChatReady`, test `ab-poll-integration-static.mjs`

> ADR này được TÁCH RA từ `workers/duc-auto-chatgpt/v0.1.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
