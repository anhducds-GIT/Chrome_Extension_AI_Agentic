# AI OPERATOR GUIDE — Duc Auto GG Flow Video (V0.1)

> Đọc file này ĐẦU TIÊN nếu bạn là AI vận hành/debug extension này. Nền tảng vận hành
> giống hệt nhánh Gemini — đọc `workers/duc-auto-gemini/v0.2.0/AI-OPERATOR-GUIDE.md`
> cho playbook đầy đủ và bảng lỗi. File này CHỈ ghi khác biệt của nhánh Flow.

## Khác biệt so với nhánh Gemini

| Món | Gemini | Nhánh này |
|---|---|---|
| Host Bridge | `C:\WORKING ZONE\Chrome Extension Bridge\duc-auto-gemini\`, cổng 32148 | `C:\WORKING ZONE\Chrome Extension Bridge\duc-auto-gg-flow-video\`, cổng **32149** |
| Pairing | `duc-auto-gemini-bridge-pairing-v1.json` | `duc-auto-gg-flow-video-bridge-pairing-v1.json` (cùng thư mục host, KHÔNG commit) |
| Khởi động host | `START-BRIDGE_Gemini_Extension.cmd` | `START-BRIDGE_GG_Flow_Video.cmd` |
| Method dùng được | đầy đủ | **Đầy đủ từ 2026-08-27**; gate executor/approval/validation của từng method vẫn áp dụng. `diagnostics.evidence_submit` được giữ làm debug tool, trần 3 lượt/trang |
| Trần trial dev | ≤30 job | **≤3 video** (Đức chốt 27/08: 3 × 15 credits); phải bật toggle **Chế độ phát triển (Dev Mode)** trong side panel |
| Trang đích | gemini.google.com | `https://labs.google/fx/tools/flow/*` |

## Gọi Bridge

```bash
cd "C:\WORKING ZONE\Chrome Extension Bridge\duc-auto-gg-flow-video" && node bridge-cli.mjs ping --pairing duc-auto-gg-flow-video-bridge-pairing-v1.json
```

Raw RPC (dom_probe):

```bash
node "workers/duc-auto-gg-flow-video/v0.1.0/scripts/bridge-rpc.mjs" diagnostics.dom_probe
```

(`bridge-rpc.mjs` đọc pairing theo đường dẫn — xem đầu file script; nếu nó khoá cứng
đường dẫn host Gemini thì sửa/truyền tham số trước khi dùng.)

## Bảng lỗi nhánh Flow (thêm dòng khi gặp lỗi thật)

| Triệu chứng | Nguyên nhân thật | Xử lý |
|---|---|---|
| `run.trial` trả lỗi Dev Mode/toggle | Toggle **Chế độ phát triển (Dev Mode)** trong side panel đang tắt | Đức bật toggle trước khi gọi; trần 3 job vẫn luôn áp dụng |
| `diagnostics.evidence_submit` báo hết lượt | Debug primitive đã chạm trần 3 lượt của lần nạp trang hiện tại | Không bypass; dùng runner thật hoặc nạp lại trang khi đúng phạm vi debug được duyệt |
