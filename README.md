# Chrome Extension AI Agentic

Kho chứa các **extension Chrome cục bộ, dùng riêng** của Đức, cộng bộ luật và cổng kiểm để
nhiều phiên AI làm việc song song trên cùng một repo mà không giẫm chân nhau.

> Trước 06/09 file này là README của extension Observer V0. Observer đã thành Scouter và dọn
> về nhà riêng theo [ADR-0013](docs/adr/0007-scouter.md); bản ghi cũ
> giữ nguyên văn ở `workers/duc-scouter/v0.1.0/README-OBSERVER-V0.md`.

## Vào đâu trước

| Bạn là ai / muốn gì | Mở file |
|---|---|
| **AI mở phiên mới** | `AGENTS.md` — hiến pháp repo, đọc trước khi gõ dòng đầu tiên |
| AI cần hiểu repo trong một lần đọc | `llms.txt` (sinh tự động) · bản đồ máy đọc: `repo-map.json` |
| **Đức muốn xem trạng thái** | nhấp đúp `bang-trang-thai/Xem-bang.cmd`, hoặc mở `DASHBOARD-Chrome-Extension-AI-Agentic.html` |
| Đức cần một câu để dán cho AI | `PROMPTS.md` |
| Muốn biết repo có extension nào, cái nào dùng được | `DASHBOARD.md` (sinh tự động) |
| Thêm một extension mới, hoặc hiểu cách vận hành nhiều extension | `PLATFORM.md` |
| Biết Đức đã chốt gì và vì sao | `docs/adr/` |
| Tìm một tài liệu | `docs/README.md` |

## Các extension trong repo

| Gói | Việc của nó |
|---|---|
| `workers/duc-auto-chatgpt/v0.1.0` | Chạy workbook XLSX trên ChatGPT |
| `workers/duc-auto-gemini/v0.2.0` | Chạy workbook XLSX sinh ảnh trên Gemini |
| `workers/duc-auto-gg-flow-video/v0.1.0` | Chạy workbook XLSX sinh video trên Google Flow |
| `workers/duc-scouter/v0.1.0` | Dò một trang, báo cáo cho AI qua Bridge, tự nạp lại chính nó |
| `workers/hnx-fetch` | Lấy dữ liệu HNX mỗi ngày. **Không có quyền `debugger`** nên nó không bấm được gì ([ADR-0021](docs/adr/0021-goi-extension.md) ⑵) |

Mỗi gói tự có `AGENTS.md` · `README.md` · `STATUS.md` · `HANDOFF.md` · `BACKLOG.md` và **khoá
riêng** trong `.agents/claims.json`.

## Chạy phép ghim

```bash
npm run test:song-song                            # toàn bộ suite, chạy song song
node scripts/session-check.mjs --as <tên-phiên>   # cổng đóng phiên
```

`npm test` vẫn chạy được nhưng là chuỗi TUẦN TỰ, chậm hơn nhiều lần — nó tồn tại vì một phép
ghim đọc thẳng trường đó để bắt "xanh giả" (`AGENTS.md` mục 0a). Đóng phiên thì dùng dòng trên.

Không có phụ thuộc ngoài. Mọi phép ghim là script Node thuần.
