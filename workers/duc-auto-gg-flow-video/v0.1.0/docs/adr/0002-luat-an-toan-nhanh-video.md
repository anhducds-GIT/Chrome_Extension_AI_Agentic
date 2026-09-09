---
status: Accepted
adr: 0002
date: 2026-08-27
deciders: Đức
source_section: "2026-08-27 — Luật an toàn nhánh video (từ kế hoạch FLOW đã duyệt)"
migrated_from: workers/duc-auto-gg-flow-video/v0.1.0/decisions.md
---

# ADR-0002 — Luật an toàn nhánh video: trần trial, không retry, khoá bootstrap Bridge

## Bối cảnh

Nhánh ảnh (Gemini/ChatGPT) chạy trần 30 job một chuỗi. Video thì **trừ credits thật**, nên
không được thừa kế con số đó.

## Quyết định

- **Trần trial dev: ≤2 job một chuỗi** — video trừ credits thật, không dùng trần
  30 job của nhánh ảnh. Nới trần = đổi luật an toàn = hỏi Đức.
- **Không retry tự động** khi nghi ngờ lần sinh trước đã trừ credits.
- **Khoá bootstrap Bridge**: cho tới khi adapter dựng từ bằng chứng thật, Bridge chỉ
  phục vụ `session.hello`, `system.ping`, `system.capabilities`,
  `diagnostics.dom_probe`. Gỡ khoá phải ghi thêm một mục vào file này.

## Hệ quả

không ghi lại — bản ghi gốc không có mục Hệ quả.

## Vế đã chết

- **Trần ≤2 job.** Chết cùng ngày 27/08: [ADR-0003](0003-tran-trial-toi-da-3-video-mot-luot.md)
  nâng lên 3 theo chốt của Đức trong chat.
- **Khoá bootstrap Bridge.** Chết 27/08: [ADR-0007](0007-go-khoa-bootstrap-bridge-f-05.md) gỡ
  hẳn allowlist sau khi adapter được dựng từ bằng chứng thật.

Vế **không retry tự động** vẫn sống.

## Trạng thái

Accepted.

> Tách ra từ `workers/duc-auto-gg-flow-video/v0.1.0/decisions.md` ngày 2026-09-09 (N-55).
> Chỉ đổi HÌNH DẠNG, không đổi một chữ nội dung quyết định.
