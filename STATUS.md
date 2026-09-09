---
schema: extension-status/v2
id: chrome-extension-ai-agentic
name: Chrome Extension AI Agentic
lifecycle: active
last_verified: 2026-09-09
last_verified_commit: 4da1e9e5a5c89002309c35b12c7bb1a52721ef9f
last_verified_how: "migrate bộ khung 0.3.0 → 1.8.0; cổng cấu trúc còn ĐỎ ở B12 (42 ADR) và B16 — xem BACKLOG"
evidence_ref: HANDOFF.md
owner: harness-loi-01
priority_rank: 1
next_step: "Dọn 42 ADR bị B12 nêu, rồi khai luat.chu_de cho bộ biên dịch luật (B16) — xem BACKLOG.md."
version_source: package.json
current_focus: "Vừa lên khung 1.8.0: nhận bộ nén luật, Context Compiler, can-nang đo token, bảng sống. Cổng nay chặt hơn và đang nêu nợ có thật."
human_action: "CÓ — Đức chốt có bật B16 (bộ biên dịch luật) hay để cảnh báo cho tới khi 154 ADR khai xong `chu_de`."
ref_readme: README.md
ref_handoff: HANDOFF.md
---

# Trạng thái — Chrome Extension AI Agentic

> **Khai bằng tay, và là thứ MỌI PHIÊN ĐỌC LÚC MỞ.** Giữ nó một trang. Đừng gõ số nào mà máy đo
> được. Lịch sử từng lượt việc ở [HANDOFF.md](HANDOFF.md).

**Bộ khung:** `1.8.0` (`.ark/harness.lock.json`), migrate 09/09 từ mốc Stable Baseline `v1.8.0` của `Ark_Repo_Harness`.
Lượt migrate **không chạm `workers/`** — một lane khác đang giữ `workers/duc-auto-chatgpt`.

**Nhận thêm trong lượt này:** bộ biên dịch luật (`npm run luat`) · Context Compiler
(`npm run luat -- --nap`) · `npm run can-nang` đo **token mỗi phiên phải nạp** · bảng sống ·
`features.json` · nhịp dọn (`npm run don`).

**Cổng cấu trúc đang ĐỎ, và đó là nợ CÓ THẬT chứ không phải hỏng:** B12 nêu 42 ADR đã
`Accepted` mà thân bài bị sửa sau đó · B16 đòi khai `luat.chu_de`. Cả hai ghi ở
[BACKLOG.md](BACKLOG.md).

**Còn mở:** `next_step` ở đầu file này, và [BACKLOG.md](BACKLOG.md).
