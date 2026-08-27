---
schema: extension-status/v1
id: duc-auto-gg-flow-video
name: Duc Auto GG Flow Video
lifecycle: building
version_source: workers/duc-auto-gg-flow-video/v0.1.0/manifest.json
current_focus: "FLOW-01: chụp bằng chứng DOM trang Flow qua dom_probe (bootstrap đã fork, Bridge khoá chỉ-đọc, chưa chạy được job video nào)"
ref_readme: workers/duc-auto-gg-flow-video/v0.1.0/README.md
ref_handoff: workers/duc-auto-gg-flow-video/v0.1.0/HANDOFF.md
ref_runbook: workers/duc-auto-gg-flow-video/v0.1.0/AI-OPERATOR-GUIDE.md
ref_backlog: workers/duc-auto-gg-flow-video/v0.1.0/BACKLOG.md
---

# STATUS — Duc Auto GG Flow Video

> Trạng thái vận hành, một trang, cho mắt Đức. Kiến trúc/cách dùng ở file khác — chỉ trỏ link.

## Ý tưởng ban đầu

Cùng bài toán với hai nhánh ảnh (ChatGPT, Gemini) — chạy kế hoạch XLSX hàng loạt —
nhưng cho **video trên Google Flow**. Fork từ nhánh Gemini v0.2.0 vì kiến trúc đã tách
sạch phần biết-về-trang vào một file adapter.

## Mục đích

Tạo video hàng loạt theo kế hoạch XLSX trên `labs.google/fx/tools/flow`, ngay trong
trình duyệt của Đức, điều khiển từ xa qua Bridge để AI vận hành hộ. Không gửi gì ra
máy chủ lạ.

## Đã kiểm chứng tới đâu

**Chưa kiểm live.** Mới fork xong bootstrap: suite thừa kế xanh, Bridge bị khoá
chỉ-đọc, chưa có selector Flow nào. Bằng chứng DOM sẽ nằm ở `evidence/` khi FLOW-01 chạy.

## Giới hạn đã biết

1. **Chưa dùng được** — bootstrap, chưa chạy nổi một job video.
2. SELECTORS/TIMING trong adapter còn là của Gemini — cố tình, chờ bằng chứng thật.
3. Video **trừ credits thật** mỗi lần sinh → trần trial dev ≤2 job, chặt hơn nhánh ảnh.

## Đọc sâu ở đâu

| Cần gì | Mở file |
|---|---|
| Luật riêng + Bản đồ file | [`AGENTS.md`](AGENTS.md) |
| Tổng quan + cài đặt | [`README.md`](README.md) |
| Việc còn mở F-xx | [`BACKLOG.md`](BACKLOG.md) |
| Vận hành qua Bridge | [`AI-OPERATOR-GUIDE.md`](AI-OPERATOR-GUIDE.md) |
| Kế hoạch điều phối 5 checkpoint | [`../../../drafts/FLOW-EXT-COORDINATION-PLAN.md`](../../../drafts/FLOW-EXT-COORDINATION-PLAN.md) |
