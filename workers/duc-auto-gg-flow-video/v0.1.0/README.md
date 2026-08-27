# Duc Auto GG Flow Video — V0.1

> Extension Chrome MV3 cá nhân, chạy kế hoạch XLSX tạo **video** trên **Google Flow**
> (`https://labs.google/fx/tools/flow/*`), ngay trong trình duyệt của Đức, không gửi gì
> ra máy chủ lạ. Là **fork từ `workers/duc-auto-gemini/v0.2.0`** (nhánh ảnh Gemini) —
> kiến trúc, lớp an toàn, Bridge giữ nguyên; phần biết-về-trang (selector, timing) sẽ
> được viết lại từ bằng chứng DOM thật của Flow.

## Trạng thái thật, đọc trước khi tin

- Provider adapter Flow đã được dựng từ bằng chứng DOM thật, có test ghim; F-02 đã qua
  audit đối kháng. Đường job video chạy ở mức deterministic; kiểm chứng runtime cần reload
  extension sau khi đổi file `.js`.
- **Khoá bootstrap Bridge đã được gỡ ngày 2026-08-27.** Toàn bộ method surface trong
  registry hiện khả dụng theo đúng gate riêng của từng method (executor, approval, Dev Mode,
  validation và các lớp an toàn khác vẫn giữ nguyên).
- `diagnostics.evidence_submit` **vẫn được giữ** làm công cụ debug: gõ 1 prompt + bấm Create
  1 lần, có trần cứng **3 lượt mỗi lần nạp trang**. Đây không thay thế runner thật.
- `run.trial` có trần cứng **3 job video mỗi chuỗi** và chỉ chạy khi Đức bật toggle
  **Chế độ phát triển (Dev Mode)** trong side panel.
- Khác biệt sống còn so với nhánh ảnh: **mỗi lần sinh video trừ credits thật**. Trần
  trial dev cho nhánh này là **≤3 video** (Đức chốt 27/08: 3 × 15 credits = ngân sách free),
  không dùng trần 30 job của nhánh ảnh.

## Kiến trúc — đọc ở đâu

Kiến trúc chi tiết (runner, exact-once, attribution, checkpoint, Bridge…) không chép
lại ở đây: đọc `README.md` của `workers/duc-auto-gemini/v0.2.0/` — fork này giữ nguyên
các lớp đó. Khác biệt của nhánh video ghi trong `BACKLOG.md` (F-xx) và `decisions.md`.

## Agent Bridge V1

Extension nói chuyện với AI operator qua **Agent Bridge V1** — host Node loopback
(`127.0.0.1`, cổng riêng cho nhánh này: **32149**), token pairing nằm ngoài repo.
Nguyên tắc không đổi so với hai nhánh trước:

- Bridge là ingress + observability. **AI không bắt đầu Run sản xuất** — side panel là
  executor duy nhất, batch thật do Đức bấm. (Trial dev có trần riêng, xem trên.)
- `run.start` / `run.pause` / `run.resume` không tồn tại trong giao thức.
- Toàn bộ method đã được mở sau F-05, nhưng `run.trial` vẫn bắt buộc toggle
  **Chế độ phát triển (Dev Mode)** trong side panel và vẫn bị chặn ở quá 3 job.
- Muốn đổi token: chạy lại script cài với tham số `RotateToken` (xem
  `scripts/Install-DucAutoChatGPTLoopbackBridgeV1.ps1`). Gỡ host: script
  `Uninstall-DucAutoChatGPTLoopbackBridgeV1` trong cùng thư mục scripts.
- Host của nhánh này nằm ở `C:\WORKING ZONE\Chrome Extension Bridge\duc-auto-gg-flow-video\`
  (ngoài repo, vì chứa pairing token). Khởi động: đúp chuột
  `START-BRIDGE_GG_Flow_Video.cmd`.

## Cài đặt (developer mode)

1. `chrome://extensions` → bật Developer mode → Load unpacked → chọn thư mục này.
2. Mở tab Flow: `https://labs.google/fx/tools/flow/` (project bất kỳ).
3. Mở side panel của extension → tab BRIDGE → dán nội dung file pairing
   (`duc-auto-gg-flow-video-bridge-pairing-v1.json` trong thư mục host ở trên).
4. Host phải đang chạy (cửa sổ START-BRIDGE mở). AI kiểm nối bằng `ping`.

## Sổ tay

| Cần gì | Mở file |
|---|---|
| Luật riêng + Bản đồ file | `AGENTS.md` |
| Trạng thái vận hành 1 trang | `STATUS.md` |
| Phiên trước làm tới đâu | `HANDOFF.md` (cuối file) |
| Việc còn mở F-xx | `BACKLOG.md` |
| Đức đã chốt gì | `decisions.md` |
| Vận hành/debug qua Bridge | `AI-OPERATOR-GUIDE.md` |
