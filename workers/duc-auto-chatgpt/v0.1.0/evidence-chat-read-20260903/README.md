# evidence-chat-read-20260903 — nghiệm thu live `chat.read`

Ba payload THÔ, chụp bằng `bridge-cli.mjs chat-read` trên ghế `MVP_GPT Chat debug`
(profile Ark), sau khi Đức reload extension + F5 tab, ngày 2026-09-03.
Hội thoại thật: 5 lượt, tiếng Việt có dấu.

| file | byte | ok | status | matched | returned | with_text |
|---|---|---|---|---|---|---|
| `01-live-limit2-max400.json` | 1745 | true | OK | 5 | 2 | 2 |
| `02-live-BAN-CHUA-CO-NAP-TO-HOP-cho-qua.json` | 15926 | true | OK | 5 | 5 | 5 |
| `03-live-limit50-max4000.json` | 14340 | true | OK | 5 | 5 | 5 |

## Đọc ba con số này cho đúng

**`matched: 5` trên hội thoại 5 lượt — KHÔNG giống `dom_probe`.** Lỗi #5 của sổ tay ghi
`matched: 10` trên trang 5 lượt, vì probe cố ý khớp cả hai tầng khung. `chat.read` phân giải
selector qua adapter và lấy **ứng viên ĐẦU TIÊN khớp** (`[data-turn="assistant"]`), nên mỗi
lượt được đếm đúng một lần. Đó là lý do hai method không được gộp: một cái cần thấy mọi tầng
marker để chẩn đoán, một cái cần đếm đúng số lượt.

**`with_text: 5` là trường phân biệt "trang chưa có chữ" với "selector đã chết".**
`status: OK` chỉ có khi `with_text > 0`.

**File 02 là bằng chứng của một LỖ, không phải của một tính năng.** Nó đi qua với
`limit: 50, max_chars_per_turn: 40000` — tổ hợp đó cho phép ~2 MB chữ trong khi trần envelope
là 1 MB (`MAX_ENVELOPE_BYTES`, `bridge-host.mjs:8`). Hội thoại này chỉ 5 lượt nên ra 15.926 byte
và trông vô hại; một hội thoại dài sẽ làm **frame vỡ trên đường về**, và người gọi sẽ thấy lỗi
transport rồi đi sửa đường mạng. Nắp tổ hợp (`limit x max_chars_per_turn <= 200000`) được thêm
NGAY SAU số đo này, ghim bằng `tests/chat-read-smoke.mjs`, 4/4 đột biến bị bắt.
**Chưa nghiệm thu live** — cần một lần reload extension nữa; bản trong RAM lúc chụp là bản
trước khi có nắp. Đừng ghi là đã nghiệm thu.
