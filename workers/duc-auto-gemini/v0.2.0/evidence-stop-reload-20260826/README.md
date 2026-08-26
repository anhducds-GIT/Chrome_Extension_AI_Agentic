# Bằng chứng: trial live cặp `run.stop` / `chat.reload` (26/08/2026)

`trial-audit.jsonl` là sổ cái nguyên bản của lần chạy thật đã kiểm chứng hai lệnh mới.
Chép vào đây vì bản gốc nằm trong thư mục Downloads, mà tên file đầu ra **đè nhau giữa các
pilot** (job luôn đánh số lại từ Q001) — lần chạy sau sẽ xoá mất nó.

## Dòng quan trọng nhất — lỗi mà trial bắt được

```
14:20:36  Q001  BRIDGE_RUN_STOPPED   STOP_REQUESTED_BEFORE_SUBMIT
14:20:37  Q001  PROMPT_SUBMITTED
14:20:37  Q001  FAILURE               USER_STOP
```

`run.stop` trả `prompt_already_sent: false` và trấn an *"Không job nào bị gửi thêm"* —
rồi **một giây sau prompt vẫn bay đi**. Cờ dừng chỉ được đọc ở các mốc ngắt của runner,
nên một job đã đi tới chỗ gửi thì gửi nốt.

Đã vá **lời nhắn** cho nói đúng sự thật. **Chưa** đổi thời điểm cờ dừng ăn — đó là đổi luật
an toàn, phải hỏi Đức riêng. Đây là bằng chứng số cho lần bàn quyết định đó.

Suite tĩnh 79/79 xanh **không** bắt được lỗi này. Chỉ sổ cái của một lần chạy thật mới bắt được.
