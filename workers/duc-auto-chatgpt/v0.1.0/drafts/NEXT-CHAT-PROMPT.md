# Prompt mở chat mới — Duc Auto ChatGPT

Đức copy nguyên khối trong ô dưới, dán vào chat Claude Code mới.

```text
Đọc AGENTS.md ở gốc repo trước (hiến pháp đa-AI), rồi nhận package:
ghi tên phiên của bạn vào .agents/claims.json cho workers/duc-auto-chatgpt
(đang trống chủ). Tự đặt nhãn mới, ví dụ claude-chatgpt-3.

Sau đó đọc theo thứ tự:
1. workers/duc-auto-chatgpt/v0.1.0/HANDOFF.md   -> Log cuối + mục Next
2. workers/duc-auto-chatgpt/v0.1.0/BACKLOG.md   -> việc còn lại, đã xếp ưu tiên

Việc của phiên này: mục 1 trong Next — chạy PILOT THẬT đầu tiên.
Không phải trial 2 job nữa. Giữ max_retries = 0 cho lần đo đầu.

Luật bắt buộc:
- Một checkpoint một phiên. Việc phát sinh ghi vào BACKLOG.md, không tự mở rộng.
- Fix nào cũng phải chạy thật trên trang mới được coi là xong. Chưa chạy = mới
  chỉ là lời tuyên bố.
- Commit tự do. PUSH phải hỏi Đức, và dùng:
      node scripts/safe-push.mjs --as <nhãn của bạn>
  Không bao giờ dùng git push.
- git add chỉ file của mình (cây làm việc dùng chung với phiên Gemini).
- Đóng phiên: node scripts/session-check.mjs --as <nhãn của bạn>

Bạn là người điều phối và cố vấn, không phải người nhận lệnh: chốt phạm vi
phiên ngay từ đầu, phản biện lại tôi khi thứ tự tôi đề xuất chưa đúng, và tự
viết handoff lúc đóng mà không cần tôi nhắc.
```

---

## Bối cảnh để Đức tự đọc (không cần dán)

**Đang ở đâu.** Nền của vòng tự hành đã chạy thật và đo được, không còn là giả định:

| Thứ | Trạng thái |
|---|---|
| Selector ChatGPT | Đo live, `data-turn` (nhãn cũ đã chết ở lượt assistant) |
| Khoá tab + khoá hội thoại | Xác minh live — 2 job vào đúng 1 hội thoại |
| Ảnh vào đúng thư mục cấu hình | Xác minh live (Pilot-12) |
| Ledger nói đúng về file đã ghi | Xác minh live |
| `DETECTION_BLIND` | Code + test xong, **chưa từng nổ thật** |
| `run.stop` / `chat.reload` | Xong, đã thử live |
| Trial tự hành trọn vẹn | **2 lần, 2/2 SUCCESS** |

**Việc lớn còn treo:** đồng bộ GPT ↔ Gemini (B-06). Không phải vì ngại làm — nó
đụng file ở gốc repo và package Gemini, cả hai đang do phiên `claude-gemini` giữ.
Cần Đức điều phối hai phiên, hoặc chờ phiên kia trả package.

**Còn nợ một phép đo:** `DETECTION_BLIND` là lưới an toàn chưa ai nhảy thử. Muốn
chứng minh nó bắt thật thì phải cố tình làm bộ dò mù rồi gửi một prompt — tốn
1 lượt quota. Đức quyết có làm hay không.

**Bài học phải giữ:** hai lần chạy thật trong ngày 26/08 đều tìm ra thứ mà test
không thấy. Lần một: selector chết, đốt 6 lượt quota. Lần hai: ảnh đi sai thư
mục và ledger khai sai về mọi file đã tải. Không chạy thật thì không biết.
