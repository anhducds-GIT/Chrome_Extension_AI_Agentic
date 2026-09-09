---
status: Accepted
adr: 0047
date: 2026-09-06
deciders: Đức
nhom: an-toan-khi-chay
---

# ADR-0047 — Sau khi đã gửi thì không gửi lại, trừ khi đối soát khẳng định được là lượt gửi đó không tạo ra kết quả nào

## Bối cảnh

Bảng tính năng ghi *"sau khi gửi thì không bao giờ tự gửi lại"*. Đọc code thì không đúng
(`B-19`, phát hiện 26/08): `canRetry()` chỉ loại năm loại hard stop cộng `USER_STOP`, và
`resolveJobFailure()` khi thử lại đặt lại `attempt_phase: "PRE_SUBMIT"` + `status: "PENDING"`
— nên `TIMEOUT_AFTER_SUBMIT`, `POST_SUBMIT_UNCERTAIN`, `OUTPUT_AMBIGUOUS`,
`READINESS_TIMEOUT_AFTER_SAVE`, `DOWNLOAD_FAILED`, `PERSISTENCE_VERIFICATION_FAILED` đều
làm prompt bay lần nữa. Mặc định khi **không biết** là **gửi lại**.

`B-19` để ngỏ một câu chưa ai truy: lớp đối soát có chặn phần lớn ca sau-khi-gửi trước khi
tới đường thử lại không? **Đo 2026-09-06:**

- Lớp đối soát trong run là `reconcileSubmittedAttempt()` → `DAC_RECONCILE_IMAGE_JOB` →
  `reconcileImageAttempt()` → `waitForCompletion()` lần hai. Nó có **đúng một** phán quyết
  dương — *"có ảnh quy được về attempt này"* — và phán quyết đó rẽ thẳng sang
  `finishDetectedOutput()`, không bao giờ tới đường thử lại.
- Ba lối ra còn lại đều là **"không chứng minh được"**: transport chết (đối soát không
  chạy) · lệch danh tính (đối soát từ chối chạy) · hết giờ không thấy gì.
- `verifyExistingOutput()` — hàm duy nhất trong gói phán được *"ảnh này thuộc lượt gửi
  kia"* — có **0** chỗ gọi trên đường chạy tự động; nó chỉ chạy khi người vận hành bấm nút
  (`DAC_MANUAL_RECONCILE_EXISTING_OUTPUT`).

Số ca lớp đối soát khẳng định được *"lượt gửi đó không tạo ra kết quả nào"*: **0**.

Đức đã bác hai phương án cũ trong sổ ("giữ nguyên" và "chặn hẳn") vì cả hai **hành động mà
không cần biết sự thật**.

## Quyết định

Câu Đức chốt, nguyên văn: **"Sau khi đã gửi, chỉ được gửi lại khi đối soát khẳng định được
là lượt gửi đó không tạo ra kết quả nào. Không khẳng định được thì DỪNG và hỏi người."**

Vì đo ra 0 ca khẳng định được, luật thu về đúng "chặn hẳn sau khi đã gửi" — Đức đã ghi
trước tình huống này trong brief nên không hỏi lại.

Hiện thực:

1. `runner-core.js` có `submissionMayExist(item)` — một chỗ duy nhất trả lời câu *"lượt gửi
   này có thể đã bay chưa"*: đúng khi `phase` đã sau lúc gửi, **hoặc** khi cờ
   `submission_uncertain` còn bật. `canRetry()` trả `false` khi nó đúng.
2. `resolveJobFailure()` cho những ca đó đi vào nhánh `markInterrupted` + `halted: true` —
   **không** phải `FAILED`, vì `resume-core` đọc `FAILED` là `SAFE_FAILED` = "bỏ qua an
   toàn", mà một prompt đã bay thì chưa an toàn để bỏ qua. `INTERRUPTED` xếp job vào
   `AMBIGUOUS_SUBMITTED`, nơi người vận hành có nút đối soát thủ công và nút tạo lại.
3. Vòng chạy **bật** `submission_uncertain` ở mốc đặt chỗ gửi (`submissionReservation`, ghi
   trước khi prompt có thể bay) và chỉ **tắt** khi receiver trả lời đúng danh tính attempt
   này và nói nó chưa gửi. Không nghe được câu trả lời khớp danh tính thì cờ ở nguyên — đó
   chính là chỗ đảo mặc định: không biết thì DỪNG.

## Hệ quả

- Một prompt không bao giờ bay hai lần nữa vì một lỗi sau lúc gửi. Đây là điều luật nhắm tới:
  lượt ChatGPT tốn tiền, và một ảnh trùng thì người đọc sổ không có cách nào biết.
- **Mặt xấu, nói thẳng:** batch dừng ở những chỗ trước đây nó tự đi tiếp. Lỗi ghi file, lỗi
  chờ ChatGPT rảnh sau khi đã lưu ảnh — trước tự thử lại, nay dừng cả batch và đợi người.
  Với `continue_on_error: true` thì đây là mất mát thật về tính trôi chảy. Đổi lại là không
  bao giờ đốt thêm một lượt sinh ảnh cho một việc đã có thể xong rồi.
- Lỗi **trước** lúc gửi không đổi: vẫn thử lại tới `max_retries`, vẫn settle `FAILED` bỏ qua
  được. Đó là phần lớn lượt thử lại thật (cổng sẵn sàng, đính ảnh tham chiếu hỏng), và cố ý
  không đụng tới — chặn cả chỗ đó là làm hỏng tính năng chứ không phải siết an toàn.
- Năm hard stop (`SECURITY_HARD_STOP`, `GENERATION_LIMIT_REACHED`, `RECEIVER_LOST`,
  `DETECTION_BLIND`, `WRONG_SURFACE`) giữ nguyên hình. Bản vá chỉ siết, không nới.
- Hai phép ghim cũ **ghi luật đã bị đảo** nên được viết lại kèm lý do:
  `tests/p1-attempt-state-smoke.mjs` (dòng nói *"Đức chose smooth-to-completion over avoiding
  a possible duplicate image"* — đó chính là quyết định bị đảo) và
  `tests/v03-operational-core-smoke.mjs`.
- Ghim mới: `tests/post-submit-no-resend-smoke.mjs`. Nó chạy chính hàm `resolveJobFailure()`
  đã ship trong `node:vm`, và **đếm lại con số 0** ở trên — hôm nào có người nối
  `verifyExistingOutput()` vào vòng chạy thì test đỏ và phép đo phải làm lại trước khi nới
  luật. 8/8 đột biến đỏ.

## Trạng thái

Accepted
