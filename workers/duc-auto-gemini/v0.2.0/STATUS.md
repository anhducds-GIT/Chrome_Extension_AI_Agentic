---
schema: extension-status/v1
id: duc-auto-gemini
name: Duc Auto Gemini (Platform)
lifecycle: active
version_source: workers/duc-auto-gemini/v0.2.0/manifest.json
last_verified: 2026-08-26
last_verified_commit: dd3c736b64206a357e6aa83f85c6e62a9fde43f7
last_verified_how: "Trial live cặp run.stop/chat.reload 9/9 bước, khoá RUN_ACTIVE chứng minh thật"
evidence_ref: workers/duc-auto-gemini/v0.2.0/evidence-stop-reload-20260826/README.md
current_focus: "Reload extension để nạp bản vá lời nhắn; chưa có BACKLOG.md riêng; nợ GPT 6 tính năng + 3 method (xem FEATURE-PARITY.md)"
ref_readme: workers/duc-auto-gemini/v0.2.0/README.md
ref_handoff: workers/duc-auto-gemini/v0.2.0/HANDOFF.md
ref_runbook: workers/duc-auto-gemini/v0.2.0/AI-OPERATOR-GUIDE.md
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
Điều khiển từ xa được bằng **Bridge** (19 lệnh), để một AI khác vận hành hộ.

## Đã kiểm chứng tới đâu

Lời khai và cách kiểm nằm ở `last_verified` / `last_verified_how` đầu file. **Chi tiết không
chép lại ở đây** — đọc bằng chứng:
[`evidence-stop-reload-20260826/README.md`](evidence-stop-reload-20260826/README.md),
diễn biến phiên ở cuối [`HANDOFF.md`](HANDOFF.md), bảng lỗi thật ở
[`AI-OPERATOR-GUIDE.md`](AI-OPERATOR-GUIDE.md).

## Giới hạn đã biết

1. **Bản vá lời nhắn chưa live** — lần reload extension tới sẽ nạp. Chỉ là chữ, không phải
   hành vi, nên không gấp.
2. **Chưa có `BACKLOG.md` riêng** — việc còn mở của nhánh này không có sổ. Ghi ở mục 6 của
   [`FEATURE-PARITY.md`](../../../FEATURE-PARITY.md).
3. **Nợ nhánh ChatGPT 6 tính năng + 3 method** — số đo 26/08, xem
   [`FEATURE-PARITY.md`](../../../FEATURE-PARITY.md). **Đọc file đó, đừng đọc backlog** —
   danh sách port trong backlog đã lạc hậu một lần.
4. **`README.md` của package này là bản chép từ nhánh ChatGPT** — tiêu đề vẫn ghi "Duc Auto
   ChatGPT V0.3", nên nó dẫn sai tên ngay dòng đầu. Chưa có sổ để ghi (xem giới hạn 2).

## Đọc sâu ở đâu

| Cần gì | Mở file |
|---|---|
| **Vận hành / debug qua Bridge, và bảng lỗi thật đã gặp trên trang** | [`AI-OPERATOR-GUIDE.md`](AI-OPERATOR-GUIDE.md) |
| Luật riêng của package, Bản đồ file | [`AGENTS.md`](AGENTS.md) |
| Phiên trước làm tới đâu (cuối file) | [`HANDOFF.md`](HANDOFF.md) |
| Extension làm gì (**lưu ý giới hạn 4**) | [`README.md`](README.md) |
| Schema workbook XLSX | [`DAC_XLSX_RUN_PLAN_V1.md`](DAC_XLSX_RUN_PLAN_V1.md) |
| Đức đã chốt những gì | [`decisions.md`](decisions.md) |
| Nhánh này hơn/kém nhánh ChatGPT chỗ nào | [`../../../FEATURE-PARITY.md`](../../../FEATURE-PARITY.md) |
