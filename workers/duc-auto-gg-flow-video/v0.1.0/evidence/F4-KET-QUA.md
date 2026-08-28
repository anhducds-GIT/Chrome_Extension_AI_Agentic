# FLOW-04 — Kết quả trial runner thật (2026-08-28)

## Phạm vi

- Đường chạy: `jobs.add` → `run.trial` → `run.status` / `queue.list` / `ledger.read`.
- Số job: đúng 3 (`Q001`, `Q002`, `Q003`).
- `run.trial` chỉ được gọi đúng một lần.
- Timeout: 300 giây/job; delay: 25 giây; `max_retries=0` ở cả ba job.
- Không dùng `diagnostics.evidence_submit`; không tải byte video.

## Kết quả đo được

| Job | Kết quả | Submit | Attribution |
|---|---|---:|---|
| Q001 | SUCCESS | 1 lần | đúng 1 ID mới: `c42d45f2-6e67-4945-8966-c36a61a60747` |
| Q002 | SUCCESS | 1 lần | đúng 1 ID mới: `10c82c53-a96a-4e39-ab8b-792d0e835d1f` |
| Q003 | FAILED ở PRE_SUBMIT | 0 lần | không có video/URL |

DOM video tăng từ 5 trước trial lên 7 sau trial, khớp đúng hai dòng SUCCESS. Ledger ghi
`attempt_count=1`, `retry_count=0`, `write_outcome=url_recorded`, và
`detected_not_downloaded=true` cho cả Q001/Q002.

## Lỗi live tìm được

Q003 dừng trước Submit với lỗi `Create button not found. Flow DOM may have changed.`.
Probe sau trial cho thấy composer vẫn có mặt và trang không có CAPTCHA/quota blocker, nhưng
nút submit prompt `arrow_forward Create` chưa remount; chỉ còn nút `add_2 Create` cấp trang.
Code đã kiểm nút quá sớm, trước khi gõ prompt vào React/Lexical composer.

Bản sửa tối thiểu bỏ kiểm tra pre-type thừa; vẫn giữ nguyên `waitForSendButtonReady()` sau
khi gõ, attribution boundary ngay trước click, `DECISIONS.clickSend`, và bảo vệ đúng một
click. Regression test có hai ca: nút xuất hiện sau gõ thì đúng một click; nút vẫn vắng sau
gõ thì fail với zero click.

## Bằng chứng liên quan

- `F4-snapshot-1-baseline-20260828.json`: baseline ban đầu (4 video; trước lần reload cuối).
- `F4-jobs-add-params-20260828.json`: ba prompt literal đã nạp.
- `F4-run-trial-params-20260828.json`: đúng ba job, timeout/delay.
- `F4-ledger-final-20260828.json`: extract ledger cuối, gồm URL và attribution.
- `F4-post-trial-dom-summary-20260828.json`: DOM sau trial, tổng 7 video và trạng thái nút.

Lưu ý: ngay trước trial, `chat.reload` đo được 5 video (có thêm
`9594771e-3493-49ab-bce1-03c1bce3f3f8` so với snapshot #1). Vì vậy attribution chính thức
dùng baseline riêng của từng attempt trong ledger, không lấy snapshot #1 để đoán.
