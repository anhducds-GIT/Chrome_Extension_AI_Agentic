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
4. **Bridge host của Đức KHÔNG nằm ở đường dẫn mặc định của installer.** Nó ở
   `C:\WORKING ZONE\Chrome Extension Bridge\duc-auto-chatgpt\` (mỗi worker một thư mục con cạnh nhau).
   Gọi CLI thì phải truyền `--pairing "<đường dẫn đó>\duc-auto-chatgpt-bridge-pairing-v1.json"`.
   Không truyền thì CLI tìm ở `%LOCALAPPDATA%\DucAutoChatGPT\BridgeV1\` và báo `ENOENT` —
   **rất dễ tưởng là Bridge chưa chạy trong khi nó đang chạy.** Đã mất thời gian vì đúng chuyện này
   ngày 28/08: tôi kết luận "chưa cài Bridge" và cài lại một bản thứ hai, hoá ra host thật đã chạy
   từ sáng và đang giữ cổng 32147. Kiểm nhanh: `Get-Process node | ... CommandLine -like "*bridge-host*"`.

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

### #3 · Run **trông như treo** giữa hai job — **ĐÃ VÁ 2026-08-28**, để lại đây vì số đo đáng biết

| | |
|---|---|
| **Triệu chứng (bản cũ)** | `run.status` đứng yên `RUNNING`, `current` vẫn là job vừa xong, job kế `PENDING`. Kéo dài **~11 phút** dù khoảng nghỉ chỉ đặt 12–24 giây. |
| **Thật ra là gì** | Side panel **không ở tiền cảnh**. Chrome bóp `setTimeout` của tài liệu bị che, nên đồng hồ đếm ngược giữa job chạy chậm hàng chục lần. Không phải treo. |
| **Đã đo được bao nhiêu** | Đo trong Chrome 151 thật, tài liệu extension bị che, khoảng nghỉ đặt 12 giây: bản cũ (đếm 12 nhịp `sleep(1000)`) mất **276.982 giây → gấp 23 lần**. Cùng đoạn code đó khi tài liệu hiện: **12,06 giây**. |
| **Bản vá** | Khoảng nghỉ giờ chờ theo **mốc thời gian thật**, và được đánh thức bằng **`chrome.alarms`** — sự kiện alarm do tiến trình trình duyệt gửi, không đi qua hàng đợi timer bị bóp. Đo lại trong cùng điều kiện: **12,005 giây → gấp 1,00**. Không xin quyền mới; `"alarms"` đã có trong `manifest.json` từ trước. |
| **Giờ trông như thế nào** | Khoảng nghỉ đúng bằng con số cấu hình, kể cả khi panel bị che. Đồng hồ đếm ngược trên màn hình vẫn nhảy từng giây khi panel hiện; khi panel bị che nó nhảy thưa — **đó là hiển thị, không phải đồng hồ chờ**, đừng lấy nó để suy ra run có chạy hay không. |
| **Nếu vẫn thấy chậm** | Còn HAI đồng hồ nữa CHƯA vá, và một cái nằm ngoài panel: nút **"Tiếp tục"** sau khi tạm dừng (B-28), và **nghỉ an toàn 6–9 giây bên trong content script** của tab chatgpt.com (B-29 — chưa đo, đừng đoán). Nếu tổng khoảng cách giữa hai job vẫn hơn cấu hình đáng kể thì nghi B-29 trước. |
| **Bằng chứng** | `Pilot-16_InterJobDelay/` — số đo, script harness, và cách chạy lại. |
| **Đo lại trên trang thật** | **ĐÃ ĐO 2026-08-28**, trial `trial-e99addeb`, 2 job text, 2/2 SUCCESS. Tách từ nhật ký: `JOB_SUCCESS` Q001 → `RECONCILE_START` Q002 = **12,0 giây** (cấu hình 12) → `RECONCILE_RESULT` idle sau **6,3 giây** (nghỉ an toàn 6). Tổng `completed_at` → `submitted_at` = **20 giây**. |
| **Điều kiện lúc đo** | Đức xác nhận **cửa sổ Chrome bị che suốt từ trước khi chạy tới hết run** — tức đo ĐÚNG điều kiện sinh ra bug, không phải điều kiện dễ. Nguồn: lời Đức, không phải suy luận từ artifact. |
| **Vì sao bug này ẩn được lâu** | Cùng lúc đó, nghỉ an toàn 6 giây **trong content script** đo được **6,3 giây — không bị bóp**. Không mâu thuẫn: Chrome bóp nặng **chuỗi timer nối nhau** (đúng hình dạng vòng 12 nhịp cũ), chứ không bóp một `sleep()` đơn lẻ. Nên mọi lớp cooldown vẫn trông bình thường trong khi khoảng nghỉ đã phồng lên gấp hàng chục lần. Đừng dùng "cooldown vẫn đúng giờ" để kết luận "không bị bóp". |

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
