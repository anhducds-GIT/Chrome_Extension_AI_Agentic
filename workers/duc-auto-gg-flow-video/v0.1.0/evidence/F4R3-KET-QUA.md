# F4R3 — lượt trial x1 trên hồ sơ `kaito`, 02/09 09:12

> Phiên `claude-f18-evidence`. Đức duyệt chạy. **Credit tiêu: 15 (đúng 1 video).**
> Bản extension: đã reload sau khi push `be17e75` (bản vá đường bằng chứng F-18).

## Kết quả một dòng

**Job CHẠY XONG, sinh ra video thật. F-18 KHÔNG tái hiện.**

| | |
|---|---|
| Job | `Q001`, prompt 145 ký tự (đúng prompt của lượt F4R2) |
| Kết quả | `SUCCESS` — 1/1, `submitted_at` 09:12:43 → `completed_at` 09:13:21 (~38 giây) |
| Video | `c81af2c5-6883-465f-8417-7d2b28f27ce9` |
| Quy gán | **đúng 1 ứng viên**, không có trong 44 id nền → không mơ hồ |
| Retry | 0 · `max_retries=0` · `poll_count` 7 |
| Bằng chứng | `F4R3-probe-BEFORE-trial-*.json` (nợ lượt trước, nay đã trả) · `F4R3-jobs-add-*` · `F4R3-run-trial-*` · `F4R3-run-status-poll-*.log` · `F4R3-ledger-after-trial-*.json` |

Tiền kiểm trước khi tốn credit, tất cả xanh: `runtime_contract` =
`flow04-composer-cluster-submit-v2` · `composer_scope_resolved: true` (2 hop) ·
`sendFound: true` · không blocker bảo mật/credit · chip `Video · 360p · 10s crop_16_9 **x1**`.

## Số đo đường gõ — thứ ba phiên đi tìm, lấy được với 0 credit

`diagnostics.evidence_submit` với `dry_run: true` gõ rồi báo cáo, **không bao giờ bấm**:

```
typing_path:    "input_events"
create_button:  "enabled"
typed_into:     "div"      textarea_count: 0
```

**Trùng khít lượt 27/08** (`F1-EVIDENCE-NOTES.md`: `input_events` / `enabled`). Nghĩa là:

- Tầng 1 (`execCommand insertText`) **không được Flow chấp nhận** — hôm nay cũng như 27/08.
  Nó rơi xuống tầng 2 và tầng 2 chạy. Đây là hành vi BÌNH THƯỜNG của trang, không phải lỗi.
- `textarea_count: 0` và `typed_into: "div"` xác nhận đường dry_run và đường runner
  **gõ vào cùng một phần tử** — đúng như đã suy ra từ code, nay có số đo.

## ĐÍNH CHÍNH — tôi kết luận sai ở `F18-PHAN-TICH-BANG-CHUNG-20260902.md`

File đó (mục 2 và 3) kết luận: `valueLen` có một **hằng số cộng thêm** ~27–28 ký tự, nên
`172 = 145 + hằng số` là bình thường, và **ứng viên số 4 của F-18 ("27 ký tự thừa trong
composer") đã bị loại**. **Sai.** Đo trực tiếp hôm nay:

| Trạng thái composer | `valueLen` đo được |
|---|---:|
| Rỗng | **28** |
| Sau khi gõ 141 ký tự (lượt dry_run hôm nay, LÀNH) | **141** |
| Sau khi gõ 145 ký tự (lượt F4R2 02/09, HỎNG) | **172** = 145 + 27 |

Hằng số 28 **không cộng thêm — nó bị THAY THẾ** khi gõ đúng cách. Một composer lành đọc ra
**đúng bằng độ dài prompt**. Vậy lượt F4R2 dôi ra 27 ký tự là **bất thường thật**, và nó khớp
với giả thuyết composer ở trạng thái **lai**: prompt được chèn vào nhưng phần nội dung cũ
không bị `focusAndSelectAll()` / `selectNodeContents` phủ hết.

**Ứng viên số 4 sống lại, và nay là ứng viên MẠNH NHẤT** — lần đầu có số đo chứ không phải suy
đoán. Ngược hẳn kết luận cũ của tôi.

Chỗ tôi sai ở đâu: tôi đọc bảng 27/08 thấy `28` ở cả trạng thái rỗng lẫn "đang sinh", rồi suy
ra nó là hằng số cộng. Nhưng **cả năm snapshot 27/08 đều chụp lúc composer RỖNG** (sau khi
submit thì Flow xoá ô) — không snapshot nào chụp lúc đang có chữ. Tôi đã ngoại suy từ một
trạng thái sang một trạng thái khác mà không có số đo cho trạng thái thứ hai. Bài học: **năm
lần đo cùng một trạng thái vẫn là một điểm dữ liệu.**

## Nợ mới tìm ra: bản vá bằng chứng CHƯA tới được sổ cái trên đường VIDEO

Bản vá `be17e75` ghi `typing_path` / `composer_len_*` vào `attempt.detection`. Sổ cái vẫn trả
về `undefined`. Không phải bản vá sai — mà **thiếu một mắt xích ở panel**:

- `sidepanel.js:4697` gọi `applyAttemptTelemetry` → ghi `detection_diagnostics` từ
  `attempt.detection` (số đo của tôi vào đây, đúng).
- Rồi `finishDetectedOutput` chạy sau, và nhánh **video** ở `sidepanel.js:4512` ghi
  `detection_diagnostics: JSON.stringify({ ...result.detection, video_id, video_url, detected_at })`
  — **thay trắng**, không trải lại bản đã có.
- Nhánh **ảnh** (`:4523`) thì CÓ mang theo `attach` / `blob_conversion` / `image_url_dropped`.
  Nhánh video **không mang gì cả**.

Bằng chứng: sổ cái lượt này mất **cả** `typing_path` **lẫn** `attach` — mà `attach` đã nằm
trong `CARRIED_DIAGNOSTICS` từ trước phiên này. Tức là lỗ này **có sẵn**, không phải do bản vá
gây ra; nó chỉ chưa lộ vì trước nay chưa ai đọc `attach` trên đường video.

Ghi thành **F-21**. Cách sửa gọn nhất: nhánh video trải lại `item.detection_diagnostics` đang
có trước khi chồng các trường video lên. **Chưa sửa** — hết phạm vi Đức duyệt cho lượt này, và
sửa xong thì cần một lượt live nữa (15 credit) để xác nhận, nên để Đức quyết.

## Cảnh báo vận hành ngay lúc này

Lượt `dry_run` **để lại 141 ký tự trong ô prompt và nút `arrow_forward Create` đang ENABLED**.
Nó không tự bấm, nhưng ai chạm vào là **15 credit**. Nên xoá ô prompt bằng tay trước khi rời máy.

## Việc kế tiếp

1. Xoá ô prompt (ở trên).
2. F-21: vá mắt xích panel để `typing_path` tới được sổ cái trên đường video.
3. F-18: **hạ khỏi P1**. Đường gõ chạy được, job chạy trọn, `typing_path` đã đo. Cái còn lại
   là câu hỏi hẹp hơn: *vì sao lượt F4R2 để composer ở trạng thái lai 172 ký tự* — và trạng
   thái đó **không tái hiện** hôm nay, nên đừng sửa mù. Chờ nó xuất hiện lại, lúc đó
   `composer_len_before_typing` (bản vá `be17e75`) sẽ nói ngay ô có sạch trước khi gõ hay không.
