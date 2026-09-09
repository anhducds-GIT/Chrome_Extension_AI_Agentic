---
status: Proposed
adr: 0007
date: 2026-08-27
deciders: không ghi lại
source_section: "2026-08-27 — F-05: gỡ khoá bootstrap Bridge"
migrated_from: workers/duc-auto-gg-flow-video/v0.1.0/decisions.md
---

# ADR-0007 — F-05: gỡ khoá bootstrap Bridge, mở lại toàn bộ method surface

## Bối cảnh

[ADR-0002](0002-luat-an-toan-nhanh-video.md) khoá Bridge còn bốn method cho tới khi provider
adapter được dựng từ bằng chứng DOM thật. Điều kiện đó đã đạt.

## Quyết định

Gỡ allowlist/bootstrap gate trong `bridge-router-core.js`, mở lại toàn bộ method surface theo
router chuẩn của Gemini HEAD. Lý do: provider adapter Flow đã được dựng từ bằng chứng DOM thật,
có test ghim; F-02 hoàn tất và audit đối kháng PASS, F-04 đã hạ trần trial còn 3 job. Các gate
an toàn riêng của từng method vẫn giữ nguyên. `diagnostics.evidence_submit` vẫn là công cụ debug
có trần cứng 3 lượt/trang; `run.trial` vẫn cần Đức bật **Chế độ phát triển (Dev Mode)** trong panel.

## Hệ quả

không ghi lại — bản ghi gốc không có mục Hệ quả.

Con số *"trần trial còn 3 job"* nêu trong phần lý do là số của
[ADR-0003](0003-tran-trial-toi-da-3-video-mot-luot.md), **đã chết 05/09** (F-22, nay suy từ chip,
trần tuyệt đối 7). Việc gỡ khoá thì không phụ thuộc vào con số đó nên quyết định này vẫn sống.

## Trạng thái

Proposed

> Tách ra từ `workers/duc-auto-gg-flow-video/v0.1.0/decisions.md` ngày 2026-09-09 (N-55).
> Chỉ đổi HÌNH DẠNG, không đổi một chữ nội dung quyết định.
