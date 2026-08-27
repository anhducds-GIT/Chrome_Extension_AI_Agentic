# AI OPERATOR GUIDE — Duc Auto GG Flow Video (V0.1 bootstrap)

> Đọc file này ĐẦU TIÊN nếu bạn là AI vận hành/debug extension này. Nền tảng vận hành
> giống hệt nhánh Gemini — đọc `workers/duc-auto-gemini/v0.2.0/AI-OPERATOR-GUIDE.md`
> cho playbook đầy đủ và bảng lỗi. File này CHỈ ghi khác biệt của nhánh Flow.

## Khác biệt so với nhánh Gemini

| Món | Gemini | Nhánh này |
|---|---|---|
| Host Bridge | `C:\WORKING ZONE\Duc-Auto-Gemini-Bridge\`, cổng 32148 | `C:\WORKING ZONE\Duc-Auto-GG-Flow-Video-Bridge\`, cổng **32149** |
| Pairing | `duc-auto-gemini-bridge-pairing-v1.json` | `duc-auto-gg-flow-video-bridge-pairing-v1.json` (cùng thư mục host, KHÔNG commit) |
| Khởi động host | `START-BRIDGE_Gemini_Extension.cmd` | `START-BRIDGE_GG_Flow_Video.cmd` |
| Method dùng được | đầy đủ | **KHOÁ BOOTSTRAP**: chỉ `session.hello`, `system.ping`, `system.capabilities`, `diagnostics.dom_probe` — method khác bị từ chối kèm `details.reason: "bootstrap_locked"` |
| Trần trial dev | ≤30 job | **≤2 job** (video trừ credits thật) — và hiện chưa mở trial |
| Trang đích | gemini.google.com | `https://labs.google/fx/tools/flow/*` |

## Gọi Bridge

```bash
cd "C:\WORKING ZONE\Duc-Auto-GG-Flow-Video-Bridge" && node bridge-cli.mjs ping --pairing duc-auto-gg-flow-video-bridge-pairing-v1.json
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
| Method khác 4 method đọc bị từ chối | Khoá bootstrap (cố ý) | Không phải bug. Gỡ khoá chỉ sau F-02+F-04, ghi decisions.md |
| `composerFound:false`, selectorCounts toàn 0 | SELECTORS còn là của Gemini | Đúng dự kiến ở bootstrap — đọc phần generic của probe (buttons, customTags, fileInputs) |
