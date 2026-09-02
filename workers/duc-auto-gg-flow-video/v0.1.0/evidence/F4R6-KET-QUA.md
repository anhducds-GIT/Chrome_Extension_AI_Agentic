# F4R6 — Google gắn cờ "unusual activity". 02/09 10:18

> Phiên `claude-f18-evidence`. **Chuỗi dừng cứng ở job thứ hai.**
> Đây KHÔNG phải tường credit — thứ chúng tôi định đi đo. Nó là một thứ khác, và quan trọng hơn.

## Chuyện gì đã xảy ra

| Job | Kết quả |
|---|---|
| Q001 | `SUCCESS` — video `6aa7b364…`, submit 10:19:20 |
| Q002 | **`INTERRUPTED` ở phase `SUBMITTED`** — `SECURITY_HARD_STOP`, submit 10:20:46, **không có video** |
| Q003 | không bao giờ chạy (cả mẻ dừng) |

**Chữ Đức đọc được trên màn hình:**

> *Failed. We noticed some unusual activity. Please visit the Help Center for more information.*

`unusual activity` nằm **đúng trong** `securityBlockerPattern` của adapter. Nên cú dừng cứng là
**đúng, không phải báo động giả** — lớp bảo vệ đã làm chính xác việc nó sinh ra để làm: thấy
tín hiệu chống lạm dụng thì dừng cả mẻ, không retry, không job nào chạy tiếp.

## Đo được gì lúc dừng

`evidence/F4R6-probe-AT-SECURITY-HALT-20260902.json`:

- `securityBlocker` có · `generationLimitBlocker` **null** → **không phải hết credit**.
- **`arrow_forward Create` biến mất khỏi DOM**, `sendFound: false`,
  `composer_scope_resolved: false` — cụm composer tan.
- Xuất hiện nhóm nút trạng thái lỗi: `refresh Retry` · `undo Reuse Prompt` ·
  `delete_forever Delete` · `redo Reuse prompt`.
- `g-recaptcha-response` từ `valueLen: 0` → **`2510`**: một token reCAPTCHA đã được sinh ra
  trên trang (trước đó rỗng ở mọi lần đo).
- Composer về `valueLen: 28` (rỗng), 15 video nền.

**KHÔNG ai bấm `Retry`.** Dừng cứng nghĩa là người quyết định, không phải AI.

## Một lỗi của tôi mà chính lượt này lộ ra: `pacing_ms: null`

Sổ cái ghi `pacing_ms: null` cho **cả hai** job. Nguyên nhân: `pacing_ms` được ghi đúng bằng
`carryDiagnostic`, nhưng **không nằm trong `CARRIED_DIAGNOSTICS`**, nên `recordDetection` xoá
sạch. Đây là **lần thứ năm trong ngày** cùng một họ lỗi: *sửa luật ở một chỗ, quên dây nối ở
chỗ khác.*

**Hệ quả cho việc đọc lượt này:** tôi **không chứng minh được** ba quãng nghỉ giống người có
chạy trong lượt này hay không. Nên lượt F4R6 **không phải bằng chứng** rằng nhịp mới vô dụng —
mà cũng không phải bằng chứng rằng nó có tác dụng. Nó chưa nói gì về nhịp cả.

**Đã vá**, và lần này ghim ở dạng **luật chung** thay vì danh sách: mọi khoá ghi bằng
`carryDiagnostic` trong `runPrompt` **phải** có trong `CARRIED_DIAGNOSTICS`. Một phép kiểm liệt
kê tay sẽ lại bỏ sót trường tiếp theo; phép kiểm này thì không.

## Điều cần Đức quyết

1. **Kiểm credit còn lại của tài khoản `kaito`.** Q002 đã `SUBMITTED` rồi mới bị chặn, nên có
   thể đã trừ 7 credit mà không ra video. Con số còn lại sẽ nói.
2. **Cờ "unusual activity" là tín hiệu chống lạm dụng của Google, không phải lỗi kỹ thuật.**
   Đổi sang tài khoản khác để chạy tiếp là cách bỏ qua tín hiệu đó, và rủi ro rơi vào chính
   các tài khoản. Đây là việc của Đức quyết; tôi nêu một lần rồi thôi.
3. Nếu vẫn chạy tiếp: **nhịp giống người chưa từng được kiểm chứng trên trang thật** (xem trên).
   Chạy lại có nhịp và **đo được `pacing_ms`** là bước hợp lý trước khi mở rộng quy mô.
