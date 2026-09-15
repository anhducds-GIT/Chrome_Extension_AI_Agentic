---
kind: protocol
status: active
ttl_days: 365
---

# BRIDGE-READ — đọc hội thoại GPT qua Bridge

> Vì sao: [ADR-0037](../adr/0037-nap-doc-dom-dat-bang-tham-so-do-duoc.md).

**Mặc định `limit 2 × max_chars_per_turn 6000`.** Thiếu thì tăng **một lần**, tổng
**không quá 20.000 ký tự** cho một câu hỏi. Chạm trần thì hỏi Đức, đừng tự nới.

Ba điều khiến luật này tồn tại:

- **Đọc lại là gửi lại TỪ ĐẦU** — không trục nào có offset. Nên đọc dè rồi đọc lại
  **đắt hơn** đọc đủ ngay lần đầu. Đó là lý do mặc định là 6000 chứ không phải 3000.
- **Ít chữ bất thường thì `chat-reload` rồi đọc lại, đừng tăng nắp.** `generating: false`
  không chứng minh câu trả lời đã xong (đo 10/09: DOM có 48 ký tự, reload ra 2.934).
- **`limit` trần 50, luôn lấy lượt mới nhất, không lùi được**, và chỉ đọc đúng tab đang mở.
  Cần giữ tri thức qua nhiều phiên thì **chốt vào file**, đừng nới nắp đọc.

**Budget GPT** — đặt để reply lọt một lần đọc, không phải để CC suy ra nắp:

| Explain | Plan | Handoff | Research · Implement | Audit |
|---|---|---|---|---|
| 250 w | 300 w | 350 w | 400 w | 500 w **một vùng** |

Audit dài thì **chia vùng**, không nới budget. Quy đổi ~7–8 ký tự/word (đo n=2).

GPT mở đầu mọi câu trả lời bằng `[MODE: … | BUDGET: … w | RULES: ✓]`. Đếm dòng đó là
ra **số vòng reasoning** đã đọc — `limit` chỉ đếm khung, 4 khung thường là 2 vòng.
