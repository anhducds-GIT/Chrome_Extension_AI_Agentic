# F4R8 — nhịp giống người ĐƯỢC KIỂM CHỨNG, và một điểm gãy mới. 02/09 11:38

> Hồ sơ `Bình`, 360p/8s (6 credit/video), giao diện **tiếng Việt** — chạy được nhờ F-23.
> **4 video thật, 24/50 credit.** Chuỗi 7 job dừng ở job thứ 5 vì lý do KHÔNG phải Google chặn.

## 1. Nhịp giống người: xác nhận trên trang thật, lần đầu

| Job | `typing_path` | `prompt_len` | `before` | `after` | `pre_compose` | `post_type` |
|---|---|---:|---:|---:|---:|---:|
| Q001 | `input_events` | 120 | 17 | 120 | 4996 ms | 8717 ms |
| Q002 | `input_events` | 110 | 17 | 110 | 6939 ms | 5388 ms |
| Q003 | `input_events` | 119 | 17 | 119 | 7708 ms | 3329 ms |
| Q004 | `input_events` | 124 | 17 | 124 | 8621 ms | 3582 ms |

- `pre_compose` đo được **4996–8621 ms**, khai 3000–14000 → **trong khoảng**.
- `post_type` đo được **3329–8717 ms**, khai 2500–11000 → **trong khoảng**.
- **Không giá trị nào trùng nhau** — đúng là bốc ngẫu nhiên, không phải hằng số.

Đây là lần đầu tiên chuỗi `carryDiagnostic → CARRIED_DIAGNOSTICS → mergeDetection → sổ cái`
chạy trọn cho một trường mới. Ba lượt trước đều trả `null` vì thiếu một mắt xích.

**Và nó cũng xác nhận `composer_len` lần thứ tư:** `before` là **17** ở mọi job — kể cả job 2, 3,
4 gõ vào ô mà job trước vừa dùng — rồi `after` **đúng bằng `prompt_len`**. Ô sạch mỗi lượt.
Lưu ý: baseline ở locale này là **17**, không phải **28** như hồ sơ `kaito`. **Hằng số nền phụ
thuộc ngôn ngữ**, nên đừng ghim con số 28 ở đâu cả.

## 2. Không bị gắn cờ — khác hẳn lượt trước

Lượt F4R6 (nhịp cũ 20–30s) bị Google chặn ở **job thứ hai** bằng *"unusual activity"*.
Lượt này, nhịp 90s + ba quãng nghỉ dài: **4 job liên tiếp, không cảnh báo nào, không lỗi nào.**

Chưa đủ để kết luận nhân quả — một lượt không chứng minh được, và biến số đã đổi nhiều hơn một
(đổi cả tài khoản, cả độ dài video). Nhưng nó là dấu hiệu đầu tiên theo hướng đúng.

## 3. ĐIỂM GÃY MỚI: vòng chạy chết theo side panel

Sau Q004, chuỗi **đứng yên 22 phút** rồi tôi phải can thiệp:

| Đo | Giá trị |
|---|---|
| `queue.list` | Q001–Q004 `SUCCESS`, Q005–Q007 `PENDING` |
| `run.status` | `state: RUNNING`, `running: 0`, `pending: 3`, **`halt: null`** |
| `system.ping` | `executor: available` · `state: READY` · composer tìm thấy · không generating |
| `run.stop` | **được chấp nhận, nhưng state KHÔNG đổi** |

Mọi lớp đều sống: service worker trả lời, content script trả lời, workbook đã nạp. Chỉ có
**vòng lặp chạy job — vốn nằm trong side panel — là không còn ai chạy nó**. Chi tiết chốt hạ:
`run.stop` trả `ok:true` mà trạng thái không nhúc nhích, tức **không có ai tiêu thụ cả yêu cầu
dừng**.

**ĐÁNH ĐỔI CẦN NÓI THẲNG:** nâng nhịp làm một chuỗi 7 job đi từ ~9 phút lên **~20+ phút**, tức
**hơn gấp đôi thời gian phơi ra trước điểm gãy này**. Nhịp chậm là đúng cho mục tiêu không bị
chặn, nhưng nó biến **độ bền của chuỗi** thành nút thắt mới. Ghi thành **F-25**.

## 4. Việc kế tiếp

- Còn 26/50 credit trên `Bình` — đủ 4 video nữa.
- Muốn chạy nốt: reload (xoá state kẹt) → `jobs.add` 3 prompt còn lại → `run.trial`, và **giữ
  side panel mở** suốt lượt.
- F-25: cần biết chính xác cái gì giết vòng lặp trước khi tin vào chuỗi dài.
