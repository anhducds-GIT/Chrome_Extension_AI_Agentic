---
schema: extension-status/v2
id: chrome-extension-ai-agentic
name: Chrome Extension AI Agentic
lifecycle: active
last_verified: 2026-09-09
last_verified_commit: 4da1e9e5a5c89002309c35b12c7bb1a52721ef9f
last_verified_how: "cổng cấu trúc: nhóm CHẶN đạt hết (B12 44→0, xem N-65); npm test thoát 0 lần đầu từ 10/09"
evidence_ref: HANDOFF.md
owner: harness-loi-01
priority_rank: 1
next_step: "N-65: 8 bài kiểm viết cho bộ khung 0.3.0 đang cách ly ở npm run test:chet — Đức chốt viết lại hay bỏ. Rồi khai luat.chu_de (B16)."
version_source: package.json
current_focus: "Vừa lên khung 1.8.0: nhận bộ nén luật, Context Compiler, can-nang đo token, bảng sống. Cổng nay chặt hơn và đang nêu nợ có thật."
human_action: "CÓ — ⑴ N-65: viết lại hay bỏ 8 bài kiểm đang cách ly · ⑵ bật B16 hay để cảnh báo tới khi 154 ADR khai xong `chu_de`."
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

**Cổng cấu trúc: nhóm CHẶN đạt hết (12/09).** 42 chỗ B12 nêu **không chỗ nào là lỗi thật** —
22 chỗ oan cho lượt gộp ADR Đức tự chốt, 20 chỗ cưỡng chế luật `ADR-0026` đã thu hồi 09/09;
B12 nay làm đúng việc ADR-0026 giao (sổ số hiệu) và siết thêm hai vế. Còn **B16** (khai
`luat.chu_de`) ở mức cảnh báo, và **`N-65`**: 8 bài kiểm viết cho bộ khung 0.3.0 đang cách ly
ở `npm run test:chet`. Cả hai ở [BACKLOG.md](BACKLOG.md).

**Còn mở:** `next_step` ở đầu file này, và [BACKLOG.md](BACKLOG.md).
