---
schema: extension-status/v2
id: duc-auto-gemini
name: Duc Auto Gemini (Platform)
lifecycle: active
owner: claude
priority_rank: 3
next_step: "Duc reload extension o TUNG profile Gemini + dien o Ten ho so Chrome nay (tab BRIDGE); AI goi bridge.sessions kiem ten. No cu van con: do live nhanh tat host qua 2 phut"
version_source: workers/duc-auto-gemini/v0.2.0/manifest.json
last_verified: 2026-08-28
last_verified_commit: 4789754b2ad57121fe94d97e1ebd86fc5d4d2148
last_verified_how: "Live sau khi hạ trần chờ xuống 5 giây: tắt/bật host, nối lại sau 1,0 giây (bản trước đo 22,5s và 27,7s). Khớp dự đoán viết trước khi đo, lần thứ ba liên tiếp"
evidence_ref: workers/duc-auto-gemini/v0.2.0/evidence-transport-liveness-5s-20260828/README.md
current_focus: "Multi-profile Bridge đã PORT xong 02/09 (mẫu gg-flow-video đã audit PASS): host nhiều kết nối fail-closed + bridge.sessions/target/served_by, ô tên hồ sơ trong panel, suite 83/83, 10/10 mutation đỏ. Host mới đã deploy + chạy trên 32148, thấy 1 kết nối legacy — chờ tay Đức reload extension + đặt tên. Nợ cũ giữ nguyên: đo live nhánh tắt host quá 2 phút; G-01 chờ trial live"
ref_readme: workers/duc-auto-gemini/v0.2.0/README.md
ref_handoff: workers/duc-auto-gemini/v0.2.0/HANDOFF.md
ref_runbook: workers/duc-auto-gemini/v0.2.0/AI-OPERATOR-GUIDE.md
ref_backlog: workers/duc-auto-gemini/v0.2.0/BACKLOG.md
---

# STATUS — Duc Auto Gemini (Platform)

> **File này là gì:** trạng thái vận hành, một trang, cho mắt Đức đọc.
> **File này KHÔNG phải gì:** không phải README thứ hai. Kiến trúc, cách vận hành, bảng lỗi
> đã gặp — đều nằm ở file khác, dưới đây chỉ có đường dẫn tới.
> Dashboard ở gốc repo (`DASHBOARD.md`) đọc phần đầu file này để sinh ra bảng tổng.

## Ý tưởng ban đầu

Cùng bài toán với nhánh ChatGPT — chạy kế hoạch XLSX tạo ảnh hàng loạt — nhưng trên
**Gemini**. Hai nhà cung cấp có trang khác nhau, cách nhận biết "ảnh đã xong" khác nhau,
nên phải có hai bản, không dùng chung một bản được.

## Mục đích

Chạy kế hoạch XLSX trên Gemini, ngay trong trình duyệt của Đức, không gửi gì ra máy chủ lạ.
Điều khiển từ xa được bằng **Bridge**, để một AI khác vận hành hộ. Số lệnh Bridge hiện có:
xem cột **Method Bridge [ĐO]** trên [`DASHBOARD.md`](../../../DASHBOARD.md) — máy đếm, luôn tươi.

## Đã kiểm chứng tới đâu

Lời khai và cách kiểm nằm ở `last_verified` / `last_verified_how` đầu file. **Chi tiết không
chép lại ở đây** — đọc bằng chứng:
[`evidence-stop-reload-20260826/README.md`](evidence-stop-reload-20260826/README.md),
diễn biến phiên ở cuối [`HANDOFF.md`](HANDOFF.md), bảng lỗi thật ở
[`AI-OPERATOR-GUIDE.md`](AI-OPERATOR-GUIDE.md).

## Giới hạn đã biết

1. **Hai bản vá chưa live** — lời nhắn (26/08) và hành vi G-01 (27/08) đều nằm trong code
   nhưng extension đang chạy bản cũ. Lần reload (⟳) + F5 tab Gemini tới sẽ nạp cả hai.
2. **G-01 đã vá TĨNH, chưa kiểm chứng LIVE** — race "dừng nhận trước lúc gửi mà prompt vẫn
   bay" (đo thật 26/08) đã tái hiện được bằng test, vá theo hướng huỷ-theo-attempt (Đức Go
   27/08), test đỏ→xanh + 6 phép phá thử đều bị bắt. Nhưng chính lỗi này suite tĩnh từng
   bỏ lọt, nên **chỉ được coi là XONG sau trial live** đọc sổ cái không còn chuỗi
   `STOP_REQUESTED_BEFORE_SUBMIT → PROMPT_SUBMITTED` (Đức đã duyệt trial, chạy sau reload).
3. **Còn nợ nhánh ChatGPT một số tính năng và method.** Con số cụ thể **không ghi ở đây** —
   nó đổi mỗi lần port xong một món, và số gõ tay thì mục ngay. **Số hiện tại lấy ở khối máy
   sinh trong** [`FEATURE-PARITY.md`](../../../FEATURE-PARITY.md); [`BACKLOG.md`](BACKLOG.md)
   nói *có nợ những món nào*, không giữ con số. Lý do tách như vậy: danh sách port gõ tay
   trong sổ của nhánh ChatGPT đã lạc hậu một lần (B-07).
4. **`README.md` của package này là bản chép từ nhánh ChatGPT** — tiêu đề vẫn ghi "Duc Auto
   ChatGPT V0.3", nên nó dẫn sai tên ngay dòng đầu (**G-03**).

## Đọc sâu ở đâu

| Cần gì | Mở file |
|---|---|
| **Vận hành / debug qua Bridge, và bảng lỗi thật đã gặp trên trang** | [`AI-OPERATOR-GUIDE.md`](AI-OPERATOR-GUIDE.md) |
| Luật riêng của package, Bản đồ file | [`AGENTS.md`](AGENTS.md) |
| Phiên trước làm tới đâu (cuối file) | [`HANDOFF.md`](HANDOFF.md) |
| Việc còn mở, đánh số G-xx | [`BACKLOG.md`](BACKLOG.md) |
| Extension làm gì (**lưu ý giới hạn 4**) | [`README.md`](README.md) |
| Schema workbook XLSX | [`DAC_XLSX_RUN_PLAN_V1.md`](DAC_XLSX_RUN_PLAN_V1.md) |
| Đức đã chốt những gì | [`decisions.md`](decisions.md) |
| Nhánh này hơn/kém nhánh ChatGPT chỗ nào | [`../../../FEATURE-PARITY.md`](../../../FEATURE-PARITY.md) |
