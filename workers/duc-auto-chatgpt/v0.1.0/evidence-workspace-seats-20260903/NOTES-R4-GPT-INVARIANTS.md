# Vòng 4 — kiểm 5 bất biến GPT nêu (2026-09-03, sau khi push 17 commit)

GPT (đọc thiết kế qua GitHub) nêu 5 bất biến; Codex kiểm từng cái trên code thật
(`AUDIT-r4-BRIEF.md` / `AUDIT-r4-REPORT.md`). Kết quả và cách đóng:

| # | Bất biến | Kết quả Codex | Đóng thế nào |
|---|---|---|---|
| 1 | target đi theo từng RPC, không biến global | **HELD** | + test RPC đồng thời chéo ghế, trả lời NGƯỢC thứ tự (pin hồi quy, không phải vá) |
| 2 | tách page-scoped / session-scoped | **HELD** (ghế = định tuyến tab, kho vẫn chung) | + mục 6 sổ tay nói thẳng "queue là CHUNG, đừng suy ra queue của gpt-A" |
| 3 | stop/reload/ping hiểu ghế | **PARTIALLY** — reload/ping đúng; `run.stop` trong cửa sổ chưa-bind gửi DAC_ABORT về tab ACTIVE | **VÁ**: chỉ gửi abort khi đã bind tab; cửa sổ khởi động thì cờ stop cục bộ tự đủ. Pin tĩnh + mutation đỏ |
| 4 | danh tính vòng đời ≠ tabId | **VIOLATED theo tiêu chí của GPT** — nhưng đây là THIẾT KẾ ĐÃ CHỐT (ADR-0046): ghế bám TAB, không bám hội thoại; đổi chat trong cùng tab vẫn là phiên đó; RUN mới khoá theo hội thoại (boundConversationId, ghế thừa kế qua bindRunTab). Epoch phiên trình duyệt + onRemoved/onReplaced/rời-trang đã có từ vòng 1–2 | Ghi rõ thành mục 8 sổ tay thay vì đổi thiết kế. Muốn ghế bám hội thoại → đổi ADR, hỏi Đức |
| 5 | một state machine điều khiển duy nhất | **VIOLATED** — Codex dựng được interleaving thật: connect cũ (kiểm tab A) chiếm ghế SAU khi Đức đã gắn lại sang tab B đang rời trang | **VÁ**: `seatEpoch` — mọi close/đổi-record vô hiệu continuation cũ; kịch bản 4 bước của Codex thành test 2d; mutation đỏ. B-34 (gom queue) vẫn để backlog nhưng hết là lỗ hổng sống |

Extra finding (gói audit thiếu file phụ thuộc để tự chạy test): ghi nhận — các vòng
sau đính kèm đủ `bridge-core.js`/`bridge-pairing-core.js`/`background.js` hoặc nói rõ
suite chạy ở repo. Không phải lỗi code.

Mutation vòng này: MC1 (seatEpoch guard) đỏ, MC3 (cổng abort theo boundTabId) đỏ.
Ghi nhận trung thực: bump epoch trong `updateWorkspace` trùng tầng với phép so
`workspaceRecord !== recordAtCheck` — hai nửa của guard được ghim CHUNG (xoá cả dòng
là đỏ), không ghim được từng nửa riêng vì kịch bản nào cũng bump qua close.
