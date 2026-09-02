# F4R4 — xác nhận bản vá F-21 trên trang thật, 02/09 09:33

> Phiên `claude-f18-evidence`. Đức duyệt chạy. **Credit tiêu: 15 (đúng 1 video).**
> Bản extension: đã reload sau khi vá F-21.

## Kết quả

**Job chạy trọn vẹn VÀ chẩn đoán tiền-submit đã tới được sổ cái** — thứ mà lượt F4R3
làm được vế đầu nhưng mất vế sau.

| | F4R3 (trước vá) | **F4R4 (sau vá)** |
|---|---|---|
| `typing_path` | `undefined` | **`"input_events"`** |
| `typing_ok` | `undefined` | **`true`** |
| `prompt_len` | `undefined` | **145** |
| `composer_len_before_typing` | `undefined` | **28** |
| `composer_len_after_typing` | `undefined` | **145** |
| `attach` | `undefined` | **`null`** (đúng — không có ảnh tham chiếu) |
| `video_id` | có | có — `696005ca-be49-4445-a976-200871a7d0fd` |
| `candidate_video_ids` | đúng 1 | đúng 1 |
| `poll_count` | 7 | 9 |

Lần ghi kết quả **không mất gì** khi trộn — đây là vế thứ hai của phép kiểm, quan trọng
ngang vế đầu: một bản vá "giữ được bản cũ" mà làm rơi bản mới thì còn tệ hơn.

Job: `Q001` `SUCCESS`, submit 09:33:28 → xong 09:34:19 (~51 giây), retry 0, `max_retries=0`.

## Và nó xác nhận lần thứ ba phần đã đính chính

`composer_len_before_typing = 28` (ô rỗng) → `composer_len_after_typing = **145**` = **đúng
bằng `prompt_len`**. Đo lần này là **đo từ trong trang lúc chạy thật**, không phải qua
`dom_probe`, tức một cơ chế đo khác hẳn — và ra cùng kết luận:

> Gõ sạch thì composer đọc ra **đúng độ dài prompt**. Hằng số 28 **bị thay thế, không cộng thêm**.

Nên lượt F4R2 đọc ra `172` cho prompt 145 ký tự là **dôi 27 ký tự bất thường thật** — ứng viên
số 4 của F-18 (composer ở trạng thái lai) đứng vững. Xem `F4R3-KET-QUA.md` mục đính chính.

## Bản vá F-21 đã làm gì

`detection_diagnostics` bị ghi hai lần cho một lượt; lần sau (nhánh video,
`sidepanel.js:4512`) **ghi thay trắng** lần đầu (`applyAttemptTelemetry`).

- Thêm `mergeDetection(existing, values)` vào `attempt-telemetry-core.js` — trộn thay vì xoá,
  giá trị mới đè lên khi trùng khoá, không bao giờ ném, bản cũ hỏng/rỗng/không phải object thì
  coi như `{}`.
- Nhánh video gọi nó thay cho `JSON.stringify` thẳng.
- **Nhánh ảnh KHÔNG đụng vào** — nó đang chạy được, và tôi không kiểm live được đường đó.
  Nó cũng không trải bản cũ, chỉ mang tay ba trường; ghi thành nợ để phiên nào chạy live
  nhánh ảnh thì xử lý.

Đo: suite **89/89** (88 → +1 file pin) · **6/6 đột biến bị bắt**, gồm mutation dựng lại đúng
lỗi F-21. Pin: `tests/video-ledger-keeps-attempt-detection.mjs`, ghim **hai tầng** — hành vi
của `mergeDetection`, và **dây nối** (nhánh video có thật sự gọi nó không).

**Không chạy audit độc lập** — Đức chốt 02/09 bỏ audit cho fix nhỏ để tăng tốc; xem `decisions.md`.

## Việc kế tiếp

- F-18: đường gõ lành, `typing_path` nay về được sổ cái mọi lượt. Chờ trạng thái lai tái hiện;
  lúc đó `composer_len_before_typing` sẽ nói ngay ô có sạch trước khi gõ hay không.
- Nợ còn: nhánh **ảnh** cũng không trải bản cũ (cùng gốc bệnh F-21, chưa gặp thật).
