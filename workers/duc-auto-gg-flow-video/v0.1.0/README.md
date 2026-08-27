# Duc Auto GG Flow Video — V0.1 (bootstrap)

> Extension Chrome MV3 cá nhân, chạy kế hoạch XLSX tạo **video** trên **Google Flow**
> (`https://labs.google/fx/tools/flow/*`), ngay trong trình duyệt của Đức, không gửi gì
> ra máy chủ lạ. Là **fork từ `workers/duc-auto-gemini/v0.2.0`** (nhánh ảnh Gemini) —
> kiến trúc, lớp an toàn, Bridge giữ nguyên; phần biết-về-trang (selector, timing) sẽ
> được viết lại từ bằng chứng DOM thật của Flow.

## Trạng thái thật, đọc trước khi tin

- **Đang ở giai đoạn BOOTSTRAP (FLOW-01).** Chưa chạy được job video nào.
- `provider-adapter.js` hiện chỉ đúng phần **ORIGIN** (labs.google Flow). Toàn bộ
  **SELECTORS và TIMING vẫn là của Gemini** — cố tình giữ nguyên, KHÔNG dùng được trên
  Flow, và sẽ chỉ được thay bằng selector có bằng chứng `dom_probe` (luật vàng: không
  đoán selector).
- Bridge đang bị **khoá bootstrap**: chỉ 4 method đọc/chẩn đoán hoạt động
  (`session.hello`, `system.ping`, `system.capabilities`, `diagnostics.dom_probe`).
  Mọi method chạy/ghi khác bị từ chối cho tới khi adapter có bằng chứng thật.
- Khác biệt sống còn so với nhánh ảnh: **mỗi lần sinh video trừ credits thật**. Trần
  trial dev cho nhánh này là **≤2 job** (chốt trong kế hoạch FLOW đã duyệt 27/08),
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
- Muốn đổi token: chạy lại script cài với tham số `RotateToken` (xem
  `scripts/Install-DucAutoChatGPTLoopbackBridgeV1.ps1`). Gỡ host: script
  `Uninstall-DucAutoChatGPTLoopbackBridgeV1` trong cùng thư mục scripts.
- Host của nhánh này nằm ở `C:\WORKING ZONE\Duc-Auto-GG-Flow-Video-Bridge\`
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
