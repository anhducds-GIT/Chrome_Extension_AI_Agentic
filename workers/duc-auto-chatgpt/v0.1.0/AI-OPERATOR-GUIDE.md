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
| **Thật ra là gì** | ⚠️ **CHẨN ĐOÁN NÀY SAI — đã đính chính và VÁ 2026-09-02.** Bản cũ ghi: *"cú điều hướng xoá mốc gán kết quả trong bộ nhớ content script"*. Đọc code thì nguyên nhân nằm sớm hơn và tầm thường hơn nhiều: **`surface()` của nhánh này trả `CONVERSATION` cho MỌI url chatgpt.com, kể cả trang chủ** — và `surfaceAllowed` **không được gọi ở đâu cả** ngoài một dòng in ra trong `dom_probe`. Có luật mà không nối dây. Hệ quả đo được: `ping` trả `state: READY` khi tab ở trang chủ, nên cả người lẫn AI đều tin là chạy được. |
| **Đã vá thế nào** | `surface()` nay phân biệt theo đường dẫn (`/c/<id>` = hội thoại; còn lại trên chatgpt.com = `LAUNCHER`). `surfaceAllowedNow()` được nối vào **ba** chỗ: readiness (nên `ping` thôi nói READY ở trang chủ), lớp chặn **trước tác dụng phụ đầu tiên** trong `runPrompt` (ném `WRONG_SURFACE`, **chưa gửi gì, chưa tốn lượt nào**), và `dom_probe`. Cùng cách hai nhánh gemini và gg-flow-video đã làm từ trước — nhánh này là cái duy nhất còn hở. |
| **Bài học đáng nhớ hơn cả bản vá** | Suite **đang ghim chính cái lỗi**: `tests/provider-adapter-static.mjs` có sẵn dòng `assert.equal(adapter.surfaceAllowed("https://chatgpt.com/"), true)`. Lỗi sống lâu không phải vì không ai kiểm, mà vì **phép kiểm khẳng định hành vi sai**. Khi một lỗi sống dai, hãy đọc phép kiểm đang bảo vệ nó. |
| **Làm gì** | Mở sẵn một hội thoại (`chatgpt.com/c/<id>`) rồi mới chạy. Đã ở hội thoại thì cùng prompt đó xong trong **~20 giây**. Từ 02/09, quên bước này thì runner **từ chối ngay** kèm `WRONG_SURFACE` thay vì tiêu một lượt rồi báo hết giờ. |
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

### #5 · `dom_probe` không bao giờ trả chữ trên trang — **[ĐO] live 2026-09-02**

| | |
|---|---|
| **Triệu chứng** | `dom_probe` chạy xong, `ok: true`, `truncated: false`, payload chỉ 7,7 KB trên nắp 64 KB — trông khoẻ hoàn toàn. Nhưng `articleSample` trả `[]`, và đó là **trường duy nhất trong cả payload có chữ của trang**. |
| **Thật ra là gì** | Selector đã chết. Trường đó dựng từ `document.querySelectorAll("article")`, mà ChatGPT đã chuyển lượt hội thoại sang `data-turn` / `data-message-author-role` từ lâu. Cùng lúc đó `assistantCount` vẫn đúng (2 và 3 trên hai profile) vì nó đi qua selector khác. Nên probe **mù một nửa mà tự báo khoẻ**. |
| **Vì sao nó quan trọng hơn một trường rỗng** | Luật vàng 1 bắt mọi AI lấy bằng chứng DOM bằng `dom_probe` thay vì đoán selector. Trường chữ mù nghĩa là AI đi chẩn đoán lỗi phát hiện kết quả sẽ nhận được **cấu trúc mà không có một chữ nào của trang**, và không thể phân biệt "trang chưa có chữ" với "selector đã chết" — hai kết luận chỉ về hai hướng ngược nhau. |
| **Đo được gì** | Hai profile, hai hội thoại khác nhau, cùng kết quả: `articleSample: []`, `assistantCount: 3` và `1`, `data-turn` trả `assistant x3, user x2`, `truncated: false`. Nhánh bóp payload **không** hề chạy, nên không phải do cắt cho vừa nắp. |
| **Nó sống được bao lâu** | **Một tuần, trong chính hồ sơ bằng chứng.** `Pilot-13_References/evidence/dom-probe-baseline-before-run.json` ngày 2026-08-26 đã ghi `articleSample: []` ngay cạnh `assistantCount: 7`. Có người đọc file đó, không ai đọc hai dòng ấy cùng nhau. |
| **Đã vá thế nào** | Một định nghĩa selector, hai người đọc: `MESSAGE_TURN_SELECTOR` (lượt thật, có `data-turn` đứng đầu) cho mẫu **chữ**, và `MESSAGE_DISCOVERY_SELECTOR` = selector đó **cộng** `[data-testid]` cho việc dò tên attribute. Trường đổi tên thành `messageSample` — tên cũ nói dối về selector của chính nó. |
| **Và nay nó lên tiếng** | Thêm `messageSampleDiag` với 4 trạng thái: `OK` · `MATCHED_BUT_NO_TEXT` (container thật, trang chưa có chữ) · `NO_CONTAINER_MATCHED` (**selector chết — dựng lại từ `attributeValues`, đừng đoán**) · `DROPPED_FOR_SIZE` (nắp payload cắt mất, trường này không nói gì về trang). Kèm `selector` · `matched` · `sampled` · `with_text` để người đọc thấy thứ đã thử. |
| **Bài học** | Bản vá #2 dạy "lỗi sống dai thì đọc phép kiểm đang bảo vệ nó". Lần này **không có phép kiểm nào cả** — trước phiên này không một test nào nhắc tới `articleSample`, kể cả để khẳng định nó được phép rỗng. Nên có hai cách một lỗi sống: phép kiểm khẳng định sai, hoặc **trường quan trọng không có phép kiểm nào**. Cái thứ hai khó thấy hơn, vì grep không trả về gì thì trông như sạch sẽ. |
| **KHÔNG phải** | Không phải payload bị cắt (`truncated: false`, 7,7 KB / 64 KB). Không phải trang trống (`assistantCount` > 0). Không phải sai profile (`served_by` xác nhận đúng nhãn). |
| **Đọc `matched` cho đúng** | `matched: 10` trên một trang **5 lượt** không phải lỗi. Mỗi lượt ChatGPT có **hai** tầng cùng khớp: khung ngoài (`data-turn` + `data-testid="conversation-turn-N"`) và khối trong (`data-message-author-role` + `data-message-id`). Nên 4 mẫu chữ phủ **2 lượt**, không phải 4. Giữ nguyên có chủ đích: khi một tầng marker chết, thứ cần thấy chính là tầng nào còn sống, và `attrs` hiển thị rõ hai tầng cạnh nhau. Muốn đếm lượt thì đọc `assistantCount`, đừng đọc `matched`. |
| **Bằng chứng** | `tests/dom-probe-message-sample-smoke.mjs` — chạy **chính đoạn mã đã ship**, cắt ra từ `content.js`, trên 3 DOM giả dựng theo số đo live. 3/3 đột biến bị bắt. **Nghiệm thu live 02/09 sau khi Đức reload:** `evidence-dom-probe-message-sample-20260902/` — payload thô trước và sau, `status: "OK"`, `with_text: 4`, chữ tiếng Việt có dấu của trang nằm trong `txtHead`. |

## Muốn ĐỌC nội dung hội thoại về máy — dùng `chat.read`, không dùng `dom_probe`

**[ĐO] live 2026-09-03**, ghế `MVP_GPT Chat debug`, bằng chứng thô ở
`evidence-chat-read-20260903/`.

Lỗi #5 vá cho probe **thấy** được chữ. Nó không làm probe **chở** được chữ, và đây là số đo:
`dom_probe` cắt mỗi mẫu ở 60 ký tự và chỉ lấy 4 khung, mà mỗi lượt ChatGPT khớp **hai** tầng
khung — nên nó phủ đúng **2 lượt**. Quét cả payload probe, trường chữ dài nhất là cái URL:
**114 ký tự**. Đủ để trả lời "selector còn sống không", không đủ để đọc một câu trả lời.

**Đừng nới `dom_probe` cho đủ chữ.** Probe là máy soi *cấu trúc*: nắp 64 KB, mọi trường cắt
ngắn có chủ đích. Bắt nó chở nội dung là bắt một trường làm hai việc, và cái vỡ trước sẽ là
**chẩn đoán** — đúng cách lỗi #5 sống được một tuần.

| | |
|---|---|
| **Gọi thế nào** | `node bridge-cli.mjs chat-read --pairing <...> --target "<nhãn phiên>" --limit 2 --max-chars 400` |
| **Trả về gì** | `turns[]` **cũ trước mới sau trong lát đã lấy**, mỗi lượt có `role` · `id` · `chars` · `truncated` · `text`. Kèm `matched` · `returned` · `with_text` · `selector` · `status`. |
| **`limit` lấy từ ĐUÔI** | `limit: 3` trên hội thoại 12 lượt trả **3 lượt cuối**. Đây là ca đột biến im lặng nhất: lấy từ đầu vẫn trả đủ số lượt, payload trông y như thật, chỉ là câu trả lời vừa tới **không có trong đó**. |
| **`chars` là độ dài THẬT trên trang** | Không phải độ dài sau khi cắt. Nên `chars > max_chars_per_turn` cộng `truncated: true` là cách biết mình đang đọc thiếu bao nhiêu — đọc `text.length` thì không bao giờ biết. |
| **`matched: 5` trên hội thoại 5 lượt** | **Khác `dom_probe` có chủ đích.** Probe cố ý khớp cả hai tầng marker nên `matched: 10` trên trang 5 lượt (lỗi #5). `chat.read` phân giải qua adapter và lấy ứng viên **ĐẦU TIÊN** khớp, nên mỗi lượt đếm đúng một lần. Đó là lý do hai method không gộp được. |
| **Selector chết thì nó NÓI** | `status: NO_TURNS_MATCHED` kèm `selector` đã thử và `attribute_names` — tên attribute **thật đang có trên trang**, quét trung tính (`*`, nắp 400 phần tử), **không** dựng từ marker đã biết: một lưới dò dựng từ marker đã biết sẽ chết đúng lúc cần nó nhất. Dựng lại selector từ danh sách đó, đừng đoán. |
| **Ba trạng thái phải phân biệt** | `OK` (có chữ) · `MATCHED_BUT_NO_TEXT` (khung thật, trang chưa có chữ) · `NO_TURNS_MATCHED` (selector chết). Gộp hai cái sau là chỉ về hai hướng ngược nhau. |
| **Đọc được trong lúc run đang chạy** | Có chủ đích: nó không bấm, không gõ, không chạm focus, nên **không** lấy chốt mutation. |
| **Ở trang phóng thì bị TỪ CHỐI** | `WRONG_SURFACE`. Đọc ở trang chủ trả 0 lượt và trông **y như hội thoại trống** — cùng cái bẫy của lỗi #2. |
| **Hai nắp bắt buộc, và chúng nhân nhau** | `--limit` 1..50, `--max-chars` 200..40000, mặc định 10 / 8000. Nhưng **tổ hợp** bị chặn ở `limit x max_chars_per_turn <= 200000`: mỗi nắp ở mức tối đa của riêng nó thì vô hại, nhân lên là ~2 MB trong khi trần envelope 1 MB (`bridge-host.mjs:8`). Không chặn ở cửa vào thì **frame vỡ trên đường về** và lỗi trông như đứt mạng. Vượt nắp bị `INVALID_PARAMS`, **không** bị cắt bớt lượt — một câu trả lời ngắn mà trông đầy đủ tệ hơn một lỗi nói "hỏi ít thôi". |
| **Số đo thật** | Hội thoại 5 lượt, nắp 50/4000: envelope **14.340 byte** trên trần 1 MB. Nắp 50/40000 trên hội thoại này ra 15.926 byte — *trông* vô hại, và chính vì trông vô hại nên phải chặn bằng luật chứ không bằng cảm giác. |
| **Bằng chứng** | `tests/chat-read-smoke.mjs` — cắt **chính đoạn mã đã ship** ra khỏi `content.js` và **chạy** trên DOM giả dựng theo số đo live; cộng `validateParams` thật của `bridge-core.js`. 7/7 rồi 4/4 đột biến bị bắt. Live: `evidence-chat-read-20260903/`. |
| **CHƯA nghiệm thu live** | Riêng **nắp tổ hợp**: bản trong RAM lúc chụp bằng chứng là bản trước khi có nắp, nên file `02-…-cho-qua.json` là bằng chứng của **lỗ**, không phải của tính năng. Cần một lần reload extension nữa mới ghi được là đã nghiệm thu. |
| **Không giải quyết chuyện GỬI** | `chat.read` chỉ đọc. Đường gửi duy nhất vẫn là `run.trial`, và nó có trần cứng 90 giây (lỗi #4). |

## Chạy tính năng có xoá file — bắt buộc đặt bẫy

Luật rút ra từ Pilot-15, **đã trả giá bằng một file thật bị xoá**:

> Ba vòng audit trên giấy gọi lỗi xoá nhầm phạm vi là "không phải bug".
> Một lần chạy thật **có đặt bẫy** bắt được nó trong 15 giây.

Cách đặt bẫy: trước khi chạy, chọn một file **cùng mẫu tên nhưng ở thư mục khác**, ghi SHA-256
của nó vào `evidence/`. Chạy xong so lại. Còn nguyên = phạm vi đúng. Mất hoặc đổi = dừng ngay.

**Đây là bước bắt buộc, không phải tuỳ chọn.**

## Nhiều profile Chrome cùng nối Bridge — từ 2026-09-02 KHÔNG phải tắt extension nữa

Port từ nhánh gg-flow-video (thiết kế: `drafts/BRIDGE-MULTIPROFILE-DESIGN-V1.md` gốc repo,
Đức duyệt hướng A 28/08). Host giữ nhiều kết nối cùng lúc; mỗi profile báo danh bằng tên
Đức đặt trong side panel (tab BRIDGE, ô **"Tên hồ sơ Chrome này"**).

1. Mở phiên: `cd "C:WORKING ZONEChrome Extension Bridgeduc-auto-chatgpt" && node bridge-cli.mjs sessions --pairing duc-auto-chatgpt-bridge-pairing-v1.json` — xem profile nào đang nối (`label`, `legacy`).
2. **Có ≥2 kết nối → MỌI lệnh phải nêu đích** `--target <tên|instance_id>`. Quên là host TỪ CHỐI bằng `TARGET_AMBIGUOUS` kèm danh sách — không bao giờ tự chọn. Đúng 1 kết nối thì như cũ.
3. **Probe và run phải CÙNG MỘT `--target`.** Mọi phản hồi chuyển tiếp mang dấu `served_by` — thấy đổi giữa chừng là DỪNG.
4. `TARGET_NOT_CONNECTED` (retryable) = đích đang offline (service worker ngủ); đợi ~30s gọi lại, đừng đổi đích.
5. `legacy: true` = profile đó còn chạy bản extension CŨ trong RAM — nhờ Đức reload extension ở profile đó rồi đặt tên.
6. Đổi tên hồ sơ: gõ vào ô rồi bấm **Lưu tên** (hoặc click ra ngoài ô) — panel lưu và tự nối lại đúng socket của profile đó (đi trọn bắt tay challenge), tên hiện trên `bridge.sessions` NGAY, không đụng host, không đụng profile khác.

## Nhiều PHIÊN LÀM VIỆC có tên trong MỘT profile — từ 2026-09-03 (ADR-0046)

Một profile mở nhiều tab ChatGPT: Đức gắn tên từng tab trong side panel (tab BRIDGE, khối
**"Phiên làm việc theo tab"**, tối đa 3). Mỗi phiên là MỘT ghế riêng trên `bridge.sessions`
(instance_id = mã phiên, label = tên phiên) — gọi bằng `--target <tên phiên>` y hệt gọi một
profile. Host không phân biệt phiên với profile, nên mọi luật ở mục trên áp dụng nguyên xi.

Khác biệt duy nhất phải biết khi vận hành:

1. **Method chạm tab đi theo ĐÚNG tab của phiên**: `dom_probe`, `system.ping`, `chat.reload`,
   `run.trial` gọi qua `--target <tên phiên>` tác động lên tab của phiên đó — KHÔNG phải tab
   đang mở trước mặt. Gọi không `--target` (hoặc target = tên hồ sơ) thì như cũ (tab active).
2. **Tab đóng / rời ChatGPT → ghế của phiên tự ngắt** → `TARGET_NOT_CONNECTED`. Tên không bao
   giờ trôi sang tab khác. Mở lại trang là ghế tự nối lại (cùng tên, cùng mã).
3. **Vẫn chỉ MỘT run tại một thời điểm** cho cả profile: `run.trial` qua phiên thứ hai khi
   đang có run sẽ bị `RUN_ACTIVE` — đúng luật, đừng coi là lỗi. Ba phiên đọc/probe song song
   thoải mái.
4. Tên phiên trùng tên hồ sơ hay trùng nhau → host trả `TARGET_AMBIGUOUS` như mọi khi; panel
   đã chặn trùng trong cùng profile, nhưng hai profile khác nhau vẫn có thể đặt trùng — đặt
   tên có tiền tố cho dễ (ví dụ `kaito-kichban`).
5. **Khởi động lại Chrome → mọi phiên tự rời ghế** (mã tab của Chrome không sống qua phiên
   trình duyệt — giữ liên kết cũ là cầm tên của Đức gắn vào tab của người lạ). Tên và mã phiên
   VẪN CÒN: mở lại tab, gõ ĐÚNG tên cũ rồi bấm **Gắn tab đang mở** là phiên trở lại với đúng
   mã cũ. Panel ghi rõ dòng nào đang chờ gắn lại. Reload extension giữa chừng (không đóng
   Chrome) thì KHÔNG mất gì.
6. **Phiên = định tuyến tab, KHÔNG phải kho dữ liệu riêng.** Hàng đợi, workbook, ledger,
   cấu hình output là MỘT bộ chung cho cả profile: `jobs.add` / `queue.list` /
   `queue.propose` gọi qua phiên nào cũng đọc-ghi cùng một hàng đợi đó. Chỉ 4 method chạm
   tab (`dom_probe`, `system.ping`, `chat.reload`, `run.trial`) là theo phiên. Đừng suy ra
   "queue của gpt-A" — chưa tồn tại; tách kho theo phiên là bước N-run-đồng-thời, có brief
   riêng.
7. **`run.stop` dừng RUN DUY NHẤT đang chạy, gọi qua phiên nào cũng vậy** — cả profile chỉ
   có một run tại một thời điểm nên không có chuyện dừng nhầm run của phiên khác; câu trả
   lời vẫn nêu rõ job/phase bị dừng. `run.trial` qua phiên B khi phiên A đang chạy sẽ bị
   `RUN_ACTIVE` — đúng luật, không phải lỗi. Stop tới ĐÚNG cửa sổ run vừa khởi động (chưa
   khoá tab): cờ dừng vẫn ăn, nhưng extension KHÔNG gửi thông điệp abort vào tab nào cả —
   vì lúc đó chưa có gì trong tab để huỷ (vá theo audit vòng 4, 03/09).
8. **Phiên bám TAB, không bám CUỘC HỘI THOẠI** (thiết kế đã chốt trong ADR-0046). Đổi chat
   trong cùng tab — kể cả mở chat mới — thì phiên vẫn là phiên đó; rời hẳn chatgpt.com thì
   ghế ngắt, quay lại là tự nối (cùng tab = cùng phiên). Cái bám theo hội thoại là RUN:
   `run.trial` khoá tab + khoá hội thoại từ lúc bind, trôi hội thoại giữa run là
   `RECEIVER_LOST`. Operator cần "đúng cuộc hội thoại X" thì tự kiểm bằng `dom_probe`
   trước khi hành động, đừng suy từ tên phiên.
