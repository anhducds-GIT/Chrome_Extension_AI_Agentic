---
status: Proposed
adr: 0004
date: 2026-08-27
deciders: Đức
source_section: "2026-08-27 — `diagnostics.evidence_submit`: primitive tương tác duy nhất của bootstrap"
migrated_from: workers/duc-auto-gg-flow-video/v0.1.0/decisions.md
---

# ADR-0004 — `diagnostics.evidence_submit`: primitive tương tác duy nhất của bootstrap

## Bối cảnh

Đức chốt trong chat: *"bạn hãy tự động thử tất cả các tính năng"* (việc cần tay người để
cuối). Claude-in-Chrome chưa cài nên extension phải tự có tay.

## Quyết định

Thêm method `diagnostics.evidence_submit`: gõ 1 prompt vào composer (selector có bằng chứng
`evidence/F1-snapshot-1-idle-20260827.json`) + bấm nút "arrow_forward Create", một lần
mỗi call, **trần cứng 3 lượt mỗi lần nạp trang** khớp ngân sách free 3 video. Đếm
TRƯỚC khi click (click lỗi không hoàn lượt — thà mất lượt đếm còn hơn lố credits).
Là giàn giáo FLOW-01: gỡ hoặc gộp vào runner thật ở F-02.

## Hệ quả

không ghi lại — bản ghi gốc không có mục Hệ quả.

Method này **vẫn sống** tới 09/09 với đúng trần 3 lượt/trang, dù
[ADR-0007](0007-go-khoa-bootstrap-bridge-f-05.md) đã gỡ khoá bootstrap: nó ở lại làm công cụ
debug, không bị gộp vào runner như dự tính ban đầu.

## Trạng thái

Proposed

> Tách ra từ `workers/duc-auto-gg-flow-video/v0.1.0/decisions.md` ngày 2026-09-09 (N-55).
> Chỉ đổi HÌNH DẠNG, không đổi một chữ nội dung quyết định.
