# Brief G-01 — "Dừng nhận trước lúc gửi ⇒ prompt không được gửi"

> ## ⛔ CHƯA ĐƯỢC GIAO CODE
> Đây là **đổi luật an toàn**. `AGENTS.md` mục 2 xếp nó vào nhóm **phải hỏi Đức trước**.
> GPT đã khuyến nghị duyệt (27/08), nhưng **người chốt là Đức**. Brief này viết sẵn để Đức
> đọc rồi quyết — **không phiên nào được bắt đầu code khi Đức chưa nói "được"**.
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

**Và `content.js` hiện KHÔNG biết gì về lệnh dừng.** Tôi đã kiểm mọi định danh chứa "stop"
trong file đó: `stopButton` / `stopFound` là **nút Stop của chính trang Gemini**, dùng để dò
xem trang đang generate hay chưa — **không phải** kênh nhận lệnh từ side panel.

**Hệ quả: bản vá bắt buộc phải chạm `content.js`.** Ai định sửa mỗi `sidepanel.js` là đang vá
nhầm chỗ, và test tĩnh sẽ vẫn xanh trong khi bug còn nguyên.

### Hai hướng, Đức/GPT chọn — tôi nghiêng về A

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

**Test ghim (tĩnh, chạy trong suite):**
1. Race `stop → pre-submit → không submit`: dựng trạng thái đã bật cờ dừng ngay trước điểm
   gửi → **không có cú click nào**, kết thúc `USER_STOP`.
2. Chiều ngược lại: **không** có cờ dừng → vẫn gửi bình thường. Thiếu ca này thì bản vá
   "thành công" bằng cách không bao giờ gửi gì nữa.
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
