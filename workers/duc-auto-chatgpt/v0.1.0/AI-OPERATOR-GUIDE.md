# AI-OPERATOR-GUIDE — Duc Auto ChatGPT

Sổ tay **vận hành**, cho người/AI sắp chạy thật trên chatgpt.com.
Kiến trúc và cách dùng nằm ở `README.md` — file này **không** lặp lại.

Mỗi dòng dưới đây là **lỗi đã gặp thật**, có bằng chứng. Đừng chẩn đoán lại từ đầu.

## Trước khi bấm chạy — 3 việc, 30 giây

1. **Tab ChatGPT phải ở sẵn MỘT CUỘC HỘI THOẠI** (`chatgpt.com/c/<id>`), **không phải trang chủ**.
   Lý do ở lỗi #2 — bỏ qua bước này là hỏng chắc.
2. **Vừa reload extension?** Phải nạp lại content script vào tab: `chat.reload` qua Bridge,
   hoặc bấm F5 tab đó. Xem lỗi #1.
3. **Sắp chạy tính năng có XOÁ FILE?** Chụp bản sao thư mục ra trước. Xem lỗi #3.

## Bảng lỗi đã gặp thật

### #1 · `RECEIVER_LOST` ngay sau khi reload extension

| | |
|---|---|
| **Triệu chứng** | `ping` trả `composer_found: false`, `state: HARD_STOP`. `dom_probe` trả `INTERNAL_ERROR` kèm `RECEIVER_LOST: ChatGPT receiver unavailable. Reload the ChatGPT tab once.` |
| **Thật ra là gì** | Reload extension **không** tự nạp lại content script vào các tab đang mở. Tab vẫn hiện bình thường trên màn hình, nên rất dễ tưởng là lỗi Bridge. |
| **Làm gì** | `chat.reload` qua Bridge (không có run nào đang chạy thì dùng được), hoặc F5 tab. |
| **KHÔNG phải** | Không phải Bridge chết, không phải chưa pair. `extension_paired` vẫn `true` suốt. |
| **Bằng chứng** | 2026-08-28, gặp 2 lần trong một buổi. |

### #2 · `TIMEOUT_AFTER_SUBMIT` khi chạy từ TRANG CHỦ ChatGPT — **[ĐO] live 2026-08-28**

| | |
|---|---|
| **Triệu chứng** | Job hết giờ với `OUTPUT_DETECTION_TIMEOUT: NOT_EVALUATED; stop_visible=false`. Nhìn màn hình thì **ChatGPT rõ ràng đã trả lời**. |
| **Thật ra là gì** | Tab đang ở `chatgpt.com/`. Prompt đầu tiên làm trang **điều hướng sang `/c/<id>`**. Cú điều hướng đó xoá mốc gán kết quả (boundary) đang nằm trong bộ nhớ content script → runner không nhận ra câu trả lời của **chính nó**. |
| **Làm gì** | Mở sẵn một hội thoại rồi mới chạy. Đã ở hội thoại thì cùng prompt đó xong trong **~20 giây**. |
| **KHÔNG phải** | **Không phải ChatGPT chậm.** `dom_probe` sau đó cho thấy `assistantCount: 1`, selector khoẻ, câu trả lời nằm trên trang. Đừng nới timeout để "chữa" — nới bao nhiêu cũng hỏng. |
| **Giá phải trả** | Một lượt sinh đã tốn mà không thu được gì. Job thành `INTERRUPTED`, **không tự gửi lại** (đúng luật). |
| **Bằng chứng** | `Pilot-15_CheckpointRetention/evidence/KET-QUA.md` (lần 1 hỏng) và `KET-QUA-LAN-2.md` (lần 2 đạt). |

### #3 · Run **trông như treo** giữa hai job — **[ĐO] live 2026-08-28**

| | |
|---|---|
| **Triệu chứng** | `run.status` đứng yên `RUNNING`, `current` vẫn là job vừa xong, job kế `PENDING`. Kéo dài **~11 phút** dù khoảng nghỉ chỉ đặt 12–24 giây. |
| **Thật ra là gì** | Side panel **không ở tiền cảnh**. Chrome bóp `setTimeout` của tài liệu ẩn, nên đồng hồ đếm ngược giữa job chạy chậm hàng chục lần. |
| **Làm gì** | Đưa cửa sổ chứa side panel ra trước, hoặc cứ chờ — **nó vẫn chạy tới cùng**. |
| **KHÔNG phải** | Không treo, không mất dữ liệu, không cần `run.stop`. Phân biệt nhanh: `paused: false`, `halt: null`, và checkpoint mới nhất vẫn đúng bản vừa ghi. |
| **Vì sao đáng ghi** | Chính tôi mất 10 phút mới loại trừ được khả năng treo thật, phải đọc code mới yên tâm. |

### #4 · Trần cứng 90 giây của `run.trial`

| | |
|---|---|
| **Triệu chứng** | Job dài hơn 90 giây luôn `TIMEOUT_AFTER_SUBMIT` khi chạy qua Bridge. |
| **Thật ra là gì** | `capTrialTimeouts` ép mọi `timeout_sec` xuống ≤90 cho đường dev-trial. Đây là **nắp an toàn**, không phải lỗi. Chỉ chặn `timeout_sec`, không đụng khoảng nghỉ giữa job. |
| **Làm gì** | Việc thật cần lâu hơn → **Đức tự bấm Run** trong panel. AI không được nới nắp này. |
| **Chi tiết** | B-17 trong `BACKLOG.md`. |

## Chạy tính năng có xoá file — bắt buộc đặt bẫy

Luật rút ra từ Pilot-15, **đã trả giá bằng một file thật bị xoá**:

> Ba vòng audit trên giấy gọi lỗi xoá nhầm phạm vi là "không phải bug".
> Một lần chạy thật **có đặt bẫy** bắt được nó trong 15 giây.

Cách đặt bẫy: trước khi chạy, chọn một file **cùng mẫu tên nhưng ở thư mục khác**, ghi SHA-256
của nó vào `evidence/`. Chạy xong so lại. Còn nguyên = phạm vi đúng. Mất hoặc đổi = dừng ngay.

**Đây là bước bắt buộc, không phải tuỳ chọn.**
