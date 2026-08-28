# Pilot-15 — Kết quả lần chạy 1 (2026-08-28 04:40)

**Kết luận: DỌN RÁC CHẠY ĐÚNG VỀ SỐ LƯỢNG, NHƯNG SAI PHẠM VI. Có lỗi thật, bẫy thử bắt được.**

## 1. Đạt — giữ đúng số bản

Thư mục pilot sau khi chạy còn **đúng 2 file `.xlsx`** (`v04`, `v05`) cộng 1 file audit.
Bản mới nhất còn nguyên, mở được. Đây là điều pilot đặt ra để kiểm, và nó đúng.

## 2. Đạt — không gửi lại prompt sau khi đã gửi

Q001 hết giờ **sau khi prompt đã bay**. Runner ghi `TIMEOUT_AFTER_SUBMIT`, đánh dấu
`INTERRUPTED`, halt cả batch, và nói rõ *"The text prompt will not be sent again
automatically."* Đúng luật exact-once, xác minh trên trang thật.

## 3. HỎNG — xoá file nằm NGOÀI thư mục ra đã cấu hình

Bẫy thử đặt trước khi chạy: `Phai sinh\Duc Auto ChatGPT\...__results__v01.xlsx` —
cùng mẫu tên, **khác thư mục**. Sau khi chạy: **đã bị xoá**.

Audit lúc `04:40:25`:

```
CHECKPOINT_PRUNED :: Removed 1 superseded Result checkpoint(s),
                     keeping the newest 2: ...__results__v01.xlsx
```

Không có `CHECKPOINT_PRUNE_SCOPE` nào. Tức là phần khoá phạm vi **không hề được gọi tới**.

### Nguyên nhân, đã truy ra

Việc đọc lại lịch sử tải chạy **một lần cho mỗi workbook**, và nó chạy ở checkpoint ĐẦU TIÊN —
lúc đó thư mục ra vẫn là thư mục cũ. Mốc so thư mục vì thế được neo vào **thư mục cũ**.
Sau đó `output.configure` đổi sang thư mục pilot, nhưng cờ "đã đọc lại" đã bật nên không
neo lại. Danh sách lịch sử từ đó **trộn hai thư mục**, và mỗi dòng chỉ giữ **tên file**,
không giữ thư mục — nên lúc xoá không còn cách nào phân biệt.

### Vì sao đây là lỗi, dù tôi từng ghi là "không phải lỗi"

Vòng audit thứ ba nêu đúng hành vi này và xếp nó là *"đáng ghi lại chứ không phải sửa"*,
lập luận rằng file bị xoá vẫn là checkpoint **của chính run này** nên vẫn trong hợp đồng.
Tôi đã chép lại kết luận đó vào `HANDOFF.md`.

**Chạy thật cho thấy lập luận đó sai ở một điểm quyết định:** việc xoá với tay sang một thư mục
**không phải thư mục ra đang cấu hình**, và audit **không hề nói** là nó đã làm vậy. Lần này thứ
bị xoá vô hại. Nhưng nếu thư mục đó có một file cùng mẫu tên từ lần chạy trước của Đức, nó cũng
đi theo — và không có dòng nào trong sổ để lần ra.

## 4. Không kết luận được — job không chạy xong

Q001 hết giờ ở **trần cứng 90 giây** của `run.trial` (đây là B-17 đã biết, không phải lỗi mới).
Nên pilot **chưa** kiểm được mốc chính "2 job SUCCESS, 7 checkpoint". Mới ghi được 5 checkpoint,
dọn 2. Phải chạy lại với timeout dài hơn sau khi vá lỗi mục 3.

## Bằng chứng

- `audit-run-20260828-0440.jsonl` — sổ audit đầy đủ của lần chạy
- `tripwire-truoc-khi-chay.txt` — SHA-256 của file bẫy, ghi TRƯỚC khi chạy
- `folder-truoc-khi-chay.txt` — hiện trạng thư mục trước khi chạy

---

# Bản vá cho mục 3 (cùng ngày, sau khi Đức duyệt "vá đi")

**Nguyên tắc đổi:** việc lọc theo thư mục chuyển từ **lúc đọc lại lịch sử** sang **lúc xoá**.

| Trước | Sau |
|---|---|
| Mỗi dòng lịch sử giữ: tên file, id tải | Giữ thêm **đường dẫn tuyệt đối** |
| Lọc thư mục ở khâu đọc lại, neo vào đích **lúc đó** | Lọc ở **khâu xoá**, so với **checkpoint vừa ghi** |
| Đổi đích giữa chừng → mốc cũ, không ai biết | Đổi đích bao nhiêu lần cũng không với sang thư mục khác |
| Không ghi gì khi bỏ qua | Ghi `CHECKPOINT_PRUNE_SCOPE` nêu rõ số file bị bỏ qua |

Lý do đặt ở khâu xoá: đó là chỗ **duy nhất** biết chắc file đang thật sự nằm đâu và ta đang thật
sự ghi vào đâu. Đặt ở khâu đọc lại là dựa vào một giả định có thể cũ đi mà không ai phát hiện —
đúng cái đã xảy ra.

Hàm mới `DacCheckpointCore.scopedTo(entries, anchorPath)` là **hàm thuần**, ghim bằng test tái dựng
**nguyên văn** kịch bản đã xảy ra: `v01` ở thư mục A, `v02..v05` ở thư mục B, mốc là `v05`.
Kỳ vọng: chỉ `v02`, `v03` bị xoá; `v01` **sống sót**.

Ba đột biến, chết hai. Cái sống là chốt mốc-rỗng — thừa vì `sameFolder` đã tự chặn, ghi rõ trong code.

## Còn lại phải chạy lại

Lần chạy 2 cần: thư mục **mới khác**, **không đổi đích giữa chừng**, và timeout **dài hơn 90 giây**
(tức Đức tự bấm Run, vì chế độ chạy thử của AI bị chặn cứng ở 90s — B-17).
Đặt lại bẫy trước khi chạy. **Với tính năng xoá file, đặt bẫy là bắt buộc.**
