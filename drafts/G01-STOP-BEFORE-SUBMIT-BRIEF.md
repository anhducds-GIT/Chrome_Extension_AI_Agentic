# Brief G-01 — "Dừng nhận trước lúc gửi ⇒ prompt không được gửi"

> ## Trạng thái duyệt — cập nhật 2026-08-27
> - ✅ **Hợp đồng ở mục 2: ĐÃ DUYỆT.**
> - ✅ **Trial live: ĐÃ DUYỆT**, nhưng **chỉ sau khi test race tĩnh PASS**.
> - ✅ **Hướng đi: B-refined** (mục 3) — không phải A, không phải B nguyên bản.
>
> Vẫn cần Đức xác nhận lần cuối trước khi phiên sau gõ dòng code đầu tiên, vì đây là
> **đổi luật an toàn** (`AGENTS.md` mục 2).
>
> **Người giữ `_root`:** `opus-platform-2`. Package cần: `workers/duc-auto-gemini`.

## 1. Bằng chứng — chuyện đã xảy ra thật

Trial live 2026-08-26, sổ cái ghi:

```
14:20:36  BRIDGE_RUN_STOPPED   message = STOP_REQUESTED_BEFORE_SUBMIT
14:20:37  PROMPT_SUBMITTED
```

Hệ thống khai "đã nhận lệnh dừng **trước lúc gửi**", rồi **một giây sau vẫn gửi**. Lời nhắn
trả về operator trấn an *"Không job nào bị gửi thêm"* — và câu đó **sai**.

Đã vá **lời nhắn** cho nói đúng sự thật (`sidepanel.js:596-606`). **Chưa đụng vào hành vi**,
vì đó là đổi luật an toàn. Bằng chứng: `evidence-stop-reload-20260826/README.md`.

## 2. Hợp đồng đề xuất — GPT soạn, hẹp có chủ đích

1. Nhận Stop **trước** thời điểm gửi thật → **không gửi prompt**, kết thúc `USER_STOP`.
2. Nếu việc gửi **đã bắt đầu và không đảo ngược được** → **không được khai
   `prompt_already_sent: false`**; phải phản ánh trạng thái thật.
3. **Stop KHÔNG phải cơ chế rollback.** Prompt đã gửi thì đã gửi — không có "rút lại".
4. **Không đụng** retry, halt, attribution, persistence, exact-once. Đây là sửa *ngữ nghĩa*
   để câu "Stop trước submit = không submit" **trở thành sự thật**, không phải mở rộng gì.

## 3. ⚠️ Chỗ sửa KHÔNG nằm ở nơi ai cũng tưởng — đọc kỹ mục này

GPT viết *"runner phải kiểm `stopRequested` ngay sát trước thao tác submit"*. **Hợp đồng thì
đúng, nhưng trong code này runner KHÔNG làm được điều đó**, vì việc gửi không xảy ra trong
runner.

Tôi đã đọc code ngày 27/08 (**[ĐỌC]**, không phải dò theo tên):

| Nơi | Việc gì xảy ra |
|---|---|
| `sidepanel.js:4544,4546` | chốt `if (state.stopRequested) break;` — **mốc cuối cùng runner còn kiểm được** |
| `sidepanel.js:4563` | `await send({ type: "DAC_RUN_IMAGE_JOB", ... })` — **giao việc cho content script rồi chờ** |
| `content.js:1002` | content script nhận việc |
| **`content.js:822`** | **`DECISIONS.clickSend({ click: () => sendButton.click() })` — CHỖ GỬI THẬT** |
| `content.js:824` | `requestAttempt.submittedAt = ...` — dấu thời gian gửi |
| `sidepanel.js:4574` | `audit("PROMPT_SUBMITTED", ...)` — **chỉ là dòng sổ ghi lại SAU KHI content script báo về** |

Nghĩa là: giữa mốc kiểm cuối cùng (4544) và cú `sendButton.click()` thật (`content.js:822`) có
**một ranh giới tiến trình**. Lệnh Stop rơi vào khoảng đó thì runner đã "buông tay" — đúng
khớp một giây trong sổ cái.

**Hệ quả: bản vá bắt buộc phải chạm `content.js`.** Ai định sửa mỗi `sidepanel.js` là đang vá
nhầm chỗ, và test tĩnh sẽ vẫn xanh trong khi bug còn nguyên.

> **~~Và `content.js` hiện KHÔNG biết gì về lệnh dừng.~~ — CÂU NÀY SAI, đã bị bác bỏ ngay
> trong ngày.** Tôi dò theo chữ `stop`, thấy `stopButton`/`stopFound` là nút Stop của chính
> trang Gemini, rồi kết luận không có kênh nào. Thực tế kênh đó tên là **`abort`** — xem mục
> ngay dưới. Để lại câu sai này kèm gạch ngang thay vì xoá đi, vì nó là ví dụ sống của bẫy
> [DÒ]: **dò theo tên chỉ tìm được thứ mình đã đoán đúng tên.** Lần thứ năm trong repo này.

### ⚠️ Cập nhật 27/08 — GPT tìm ra thứ brief bản đầu BỎ SÓT: kênh huỷ ĐÃ TỒN TẠI

Bản đầu của brief này nói `content.js` "không biết gì về lệnh dừng". **Sai.** Tôi đã dò theo
chữ `stop` và bỏ sót vì kênh đó tên là **`abort`**. Đúng cái bẫy [DÒ] mà chính repo này cảnh
báo — dò theo tên chỉ tìm được thứ mình đã đoán đúng tên.

Sự thật, đã đọc code (**[ĐỌC]**, 2026-08-27):

| Nơi | Việc |
|---|---|
| `sidepanel.js:4643` | `stop()` **đã** gửi `DAC_ABORT` sang content script |
| `content.js:972-973` | nhận `DAC_ABORT` → `STATE.abortRequested = true` |
| `content.js:364` | `blockerSnapshot()` **đã** trả `abortRequested` |
| `content.js:822` | `DECISIONS.clickSend({ snapshot: blockerSnapshot, ... })` — **đã đọc cờ đó ngay sát cú click** |
| **`content.js:784`** | **`runPrompt()` mở đầu bằng `STATE.abortRequested = false`** |

**Chốt chặn đã có sẵn và đã đúng chỗ. Cái hỏng là cờ bị XOÁ mất.**

Race nghi vấn, khớp đúng hiện tượng một giây trong sổ cái:

```
DAC_ABORT tới        → abortRequested = true
DAC_RUN_IMAGE_JOB    → runPrompt() → dòng 784 reset về false
clickSend            → snapshot thấy false → VẪN CLICK
```

**Chưa được gọi đây là root cause đã chứng minh** — phải có test tái hiện đúng thứ tự message
đó trước. Nhưng nó đủ mạnh để chọn hướng đi.

Thuận lợi: `STATE.activeAttempt` (`content.js:785`, `:852`, `:1023`) **đã tồn tại**, nên gắn
huỷ theo attempt không phải dựng từ đầu.

### Hướng đã chốt: **B-refined** — huỷ theo `attempt_id`

Giữ kênh `DAC_ABORT` sẵn có, **đừng dựng thêm round-trip hỏi ngược side panel**. Việc cần làm:
làm cho lệnh huỷ **gắn với attempt cụ thể**, để **abort tới trước hay sau `DAC_RUN_IMAGE_JOB`
đều không bị dòng 784 xoá mất**.

Hai hướng cũ giữ lại để đối chiếu, **không chọn**:

**A. Kiểm ngay trước cú click, ngay trong `content.js`.** Side panel gửi kèm một cách để
content script hỏi lại *"còn được gửi không?"* ngay sát `content.js:822`, và bỏ cú click nếu
đã có lệnh dừng. Cửa sổ hở còn lại **nhỏ nhất có thể** — đúng bằng khoảng cách giữa lần hỏi
cuối và cú click.

**B. Kênh huỷ một chiều.** Side panel bắn một message `DAC_STOP` khi có Stop; content script
đặt cờ nội bộ và tự bỏ cú click. Đơn giản hơn, nhưng có race riêng của nó (message tới sau cú
click) — tức là **vẫn phải có kiểm sát trước click**, nên A gần như bao gồm B.

**Cửa sổ hở không bao giờ về 0.** Bất kỳ ai nói "vá xong là Stop luôn kịp" là đang hứa quá
tay. Mục tiêu là **thu nhỏ cửa sổ và khai đúng sự thật khi lỡ** — chính là điều khoản 2 của
hợp đồng.

## 4. Bằng chứng phải có trước khi được gọi là xong

**Test ghim (tĩnh, chạy trong suite). Ca 1 và ca 1b là hai ca QUAN TRỌNG NHẤT —
viết chúng TRƯỚC khi sửa code:**

1. **Tái hiện đúng race:** `DAC_ABORT(attempt X)` → **rồi mới** `DAC_RUN_IMAGE_JOB(attempt X)`
   → **ZERO `sendButton.click`**. Đây là ca chứng minh (hoặc bác bỏ) giả thuyết reset ở dòng
   784. Nếu ca này đỏ trước khi sửa và xanh sau khi sửa, ta có root cause thật.
1b. **Chiều ngược, chặn bản vá quá tay:** huỷ attempt X → **attempt Y mới vẫn được phép chạy**.
   Thiếu ca này thì có thể "sửa" bằng cách giữ `abortRequested = true` vĩnh viễn, và vô tình
   **giết luôn run kế tiếp** — đổi một bug thành một bug tệ hơn.
2. Chiều ngược lại cơ bản: **không** có lệnh huỷ → vẫn gửi bình thường.
3. Đã gửi rồi mới Stop → **không** được khai `prompt_already_sent: false`.
4. Ghim vào **đúng ranh giới** (`content.js`), không chỉ ghim ở runner — nếu không, gỡ bản vá
   ở content mà test vẫn xanh.

**Kiểm chứng live (bắt buộc, suite tĩnh KHÔNG đủ):**
5. Trial live, đọc sổ cái, chứng minh **không còn** chuỗi
   `STOP_REQUESTED_BEFORE_SUBMIT → PROMPT_SUBMITTED`.
6. Bằng chứng mới ghi vào `evidence-stop-*/`, cập nhật `last_verified` + `last_verified_commit`
   + `evidence_ref` trong `STATUS.md`.

> **Vì sao mục 5 không được bỏ:** chính lỗi này **suite tĩnh 79/79 xanh không bắt được**. Chỉ
> sổ cái của một lần chạy thật mới bắt được. Ghi trong `HANDOFF.md` ngày 26/08.
>
> Và **chạy pilot live trên trang thật cũng nằm trong nhóm phải hỏi Đức** (`AGENTS.md` mục 2).

## 5. Ngoài phạm vi — đừng đụng

Retry · halt · attribution · persistence · exact-once · `DETECTION_BLIND` · `RUN_ACTIVE`.
Phát sinh ý tưởng → ghi `BACKLOG.md` của package, không tự làm.

Nhánh ChatGPT **có cùng lỗi này** (lời nhắn đã port nguyên văn từ đó sang). **Không sửa hộ
trong patch này** — package khác, quyền khác, và phải đo lại vì hai nhánh khác nhau ở chốt
khởi động run. Ghi thành một mục backlog bên đó.

## 6. Câu hỏi cho Đức

1. **Duyệt hợp đồng ở mục 2 không?** (Stop trước submit ⇒ không submit.)
2. **Chọn hướng A hay B ở mục 3?**
3. **Cho chạy trial live để kiểm chứng không?** (mục 4.5 — cũng thuộc nhóm phải hỏi.)

Ba câu đó được trả lời thì phần còn lại là việc kỹ thuật thẳng thớm.
