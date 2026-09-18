---
schema: extension-status/v2
id: chrome-extension-ai-agentic
name: Chrome Extension AI Agentic
lifecycle: active
last_verified: 2026-09-18
last_verified_commit: 6f3a761f3c02a5fba478eb3f3c857fbf9304132a
last_verified_how: "cổng cấu trúc: nhóm CHẶN đạt hết; aggregate chạy trọn và KHÔNG còn khu cách ly nào — N-65 đóng 18/09, tám bài cuối đã viết lại hoặc DROP kèm bằng chứng; phá một bất biến đại diện thì aggregate ĐỎ ở cả năm chỗ thử"
evidence_ref: HANDOFF.md
owner: harness-loi-01
priority_rank: 1
next_step: "Đóng mốc Universal Scouter V1 (xem workers/duc-scouter/v0.1.0/docs/UNIVERSAL-SCOUTER.md §V1 — SSOT của mốc). Nợ hạ tầng còn lại, theo thứ tự: N-70 (bản sinh nhìn đồng hồ nên artifact không bao giờ đứng yên) · gộp ba bộ đọc sổ nợ về một nhà · khai luat.chu_de (B16)."
version_source: package.json
current_focus: "Đang đóng mốc Universal Scouter V1 — chứng minh đường I/O trình duyệt và điều khiển Workbench tiết kiệm context. Hạ tầng repo vừa qua một lượt dọn: không còn bài kiểm nào bị cách ly, nên mọi lớp bảo vệ đang thật sự chạy."
human_action: "CÓ — ⑴ mở thêm một tab Vizcom đăng nhập tài khoản KHÁC trong cùng profile, để thí nghiệm identity attestation của V2 có cái để bác · ⑵ bật B16 hay để mức cảnh báo tới khi các ADR khai xong `chu_de`."
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

**Mốc đang đóng: Universal Scouter V1** — *Browser I/O Feasibility + Context-Efficient
Workbench Control*. SSOT của mốc là
[`workers/duc-scouter/v0.1.0/docs/UNIVERSAL-SCOUTER.md`](workers/duc-scouter/v0.1.0/docs/UNIVERSAL-SCOUTER.md)
**§V1**: chứng minh được gì · giới hạn đã biết · hoãn gì sang V2 · V2 bắt đầu ở đâu. Đừng chép
số liệu của nó sang đây.

**`N-65` ĐÓNG 18/09 — không còn khu cách ly nào.** Tám bài kiểm viết cho bộ khung 0.3.0 đã xử
hết: năm viết lại và về `npm test`, ba DROP kèm bằng chứng. Hợp đồng đóng đã siết thành *"mọi
khu cách ly đều rỗng"*, và hàng rào đọc theo tiền tố nên dựng lại một khu dưới tên khác vẫn kêu.
Cái giá đo được của chín ngày im lặng: **bảy lỗ sản phẩm**, do chính những bài ấy bắt. Còn
**B16** (khai `luat.chu_de`) ở mức cảnh báo — xem [BACKLOG.md](BACKLOG.md).

**Còn mở:** `next_step` ở đầu file này, và [BACKLOG.md](BACKLOG.md).
