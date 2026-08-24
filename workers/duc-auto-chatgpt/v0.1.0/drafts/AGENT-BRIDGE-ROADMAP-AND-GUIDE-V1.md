# Agent Bridge — Roadmap & Hướng dẫn (viết cho Đức)

Viết 2026-08-24. File này KHÔNG phải tài liệu kỹ thuật — đó là
`README.md` §Agent Bridge V1 (cài đặt, lệnh CLI). File này trả lời 2 câu hỏi
Đức đang hỏi: "Bridge bây giờ làm được gì, và sắp tới sẽ có thêm gì."

## 1. Đang ở đâu bây giờ

Bridge v1 làm được đúng 2 việc:

- **Biết trạng thái** — hỏi "extension có online không, ChatGPT sẵn sàng
  chưa, workbook đã load chưa, Queue có gì" (`ping`, `capabilities`,
  `queue-list`, `run-status`, `ledger-read`). Không cần Đức làm gì để những
  lệnh này chạy được, miễn side panel đang mở.
- **Xin phép** — gửi 1 đề xuất job vào một "vùng cách ly" (`propose`). Đề
  xuất này KHÔNG vào Queue thật cho tới khi Đức tự tay duyệt.

Chưa có:
- Tab riêng cho Bridge trong side panel — mọi thứ Bridge làm hiện chỉ hiện ra
  ở 1 thẻ nhỏ "ĐỀ XUẤT TỪ AGENT" khi có đề xuất đang chờ.
- Bất kỳ khả năng tự chạy nào — không có `run.start`, `run.pause`,
  `run.resume`, và sẽ không có trừ khi có quyết định mới (xem
  `../decisions.md`).

### Sơ đồ luồng hiện tại

```text
AI ngoài (Codex/Claude/khác)
        │  đọc trạng thái (không cần hỏi)
        ▼
   Bridge host (127.0.0.1)
        │  gửi đề xuất (propose)
        ▼
  Vùng cách ly (chờ Đức)
        │  Đức đọc, bấm Duyệt hoặc Từ chối trong side panel
        ▼
   Queue thật (nếu duyệt) ── vẫn ở trạng thái chờ, KHÔNG tự chạy
        │  Đức tự bấm Run
        ▼
   Ảnh được tạo
```

## 2. Use case thật — vì sao Bridge tồn tại

Không phải ý tưởng trừu tượng — đây là chính quy trình Đức đang làm tay hằng
ngày, đã ghi lại trong `HANDOFF.md`: skill Orchestrator của GPT gợi ý ý
tưởng/concept trong lúc trò chuyện, và việc duy nhất Đức phải làm thủ công
cho từng ảnh là gõ "OK, render".

Giá trị thật của Bridge = thay vì Đức phải gõ tay từng "OK, render", một AI
(GPT Orchestrator, hoặc Codex đọc lại hội thoại đó) tự đẩy các ý tưởng đó
thành đề xuất vào Bridge. Việc của Đức thu gọn lại thành: **đọc + duyệt**,
thay vì đọc + gõ lại + duyệt.

Điều không đổi: Đức vẫn luôn là người xem prompt cuối cùng trước khi nó chạy,
và vẫn luôn là người bấm Run.

## 3. Backlog roadmap — CHƯA cam kết, để Đức chọn

Danh sách dưới đây là ý tưởng, không phải việc đã lên lịch. Mỗi mục cần Đức
chọn trước khi Claude/Codex bắt tay code.

- **Tab "BRIDGE" riêng trong side panel** (thay cho 1 thẻ nhỏ hiện tại).
  Outline nội dung nếu làm:
  - Khối 1 — *Trạng thái kết nối*: host online/offline, đã pairing chưa, lần
    kết nối gần nhất.
  - Khối 2 — *Đề xuất đang chờ*: danh sách đề xuất chưa duyệt, giống thẻ hiện
    tại nhưng xem được nhiều đề xuất cùng lúc thay vì chỉ 1.
  - Khối 3 — *Lịch sử*: đề xuất đã duyệt/đã từ chối, ai/khi nào (audit).
- **Nhãn "nguồn đề xuất"** trên mỗi đề xuất — khi có nhiều AI cùng gửi đề
  xuất (Codex, GPT Orchestrator, Claude...), Đức cần biết cái nào từ đâu.
- **Thông báo khi có đề xuất mới** (badge trên icon extension, hoặc âm
  thanh) — hiện tại Đức phải tự mở panel mới biết có đề xuất đang chờ.
- **(Xa hơn, cần bàn kỹ, KHÔNG phải v1.1)** một hình thức duyệt nhanh có điều
  kiện — ví dụ chỉ những đề xuất khớp đúng 1 mẫu định sẵn mới cần xem kỹ, còn
  lại vẫn phải xem nhưng bấm nhanh hơn. Đây là ý tưởng nhạy cảm nhất trong
  danh sách vì đụng tới ranh giới "Đức luôn xem trước khi duyệt" — nếu làm,
  phải ghi quyết định rõ ràng vào `../decisions.md` trước, không âm thầm nới
  lỏng.

## 4. Ràng buộc không đổi dù roadmap phát triển tới đâu

Bất kể chọn làm bao nhiêu mục ở trên, những điều sau **không nằm trong danh
sách để đổi** (xem `../decisions.md`):

- AI ngoài không bao giờ tự bấm Run.
- AI ngoài không bao giờ tự gửi prompt tới ChatGPT.
- Duyệt đề xuất không bao giờ tự động bỏ qua bước Đức xem prompt thật.
- Sửa Queue luôn phải ghi được audit + checkpoint trước khi có hiệu lực.

Muốn đổi bất kỳ điều nào ở trên → phải là một quyết định mới, ghi rõ lý do
vào `../decisions.md`, không phải một thay đổi âm thầm đi kèm tính năng khác.
