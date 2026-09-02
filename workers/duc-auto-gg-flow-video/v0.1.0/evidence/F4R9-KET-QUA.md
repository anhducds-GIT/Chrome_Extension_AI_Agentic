# F4R9 — 3 job cuối chạy trọn. Tổng 7/7 trên một tài khoản. 02/09 12:47

> Hồ sơ `Bình`, giao diện tiếng Việt, 360p/8s. **3/3 SUCCESS**, state về `IDLE`.
> Gộp với F4R8: **7/7 job, 42/50 credit, còn 8.**

## Gộp cả hai chuỗi

| | |
|---|---|
| Job thành công | **7 / 7** |
| `typing_path` | `input_events` ở cả 7 |
| `pre_compose` đo được | **4996–11215 ms** (khai 3000–14000) |
| `post_type` đo được | **3329–9337 ms** (khai 2500–11000) |
| Giá trị trùng nhau | **không có** — đúng là bốc ngẫu nhiên |
| `composer_len_before_typing` | **17** ở cả 7 job |
| `composer_len_after_typing − prompt_len` | **0** ở cả 7 job |
| Cảnh báo của Google | **không có lần nào** |

`after − prompt_len = 0` ở cả bảy job là bằng chứng mạnh nhất tới nay cho việc **ô prompt sạch
trước mỗi lượt gõ** — kể cả job thứ 2..7 gõ vào ô mà job trước vừa dùng. Trạng thái lai từng
thấy ở lượt F4R2 (dôi 27 ký tự) **không tái hiện lần nào trong 7 lượt**.

## Về F-25 — KHÔNG tái hiện, và tôi đã suýt báo sai

Chuỗi này **chạy trọn**, nên điểm gãy ở F4R8 (dừng sau Q004, 22 phút không hồi) **không phải
tất định**.

Giữa chừng tôi **suýt báo sai là nó tái hiện**. Bộ phát hiện đứng máy tôi vừa viết đặt ngưỡng
**4 phút**, con số tôi *suy luận* ra (nhịp 90s + sinh ~50s). Nó kêu sau Q001. Kiểm lại trạng
thái trước khi viết báo cáo thì thấy Q002 **đã khởi động** — khoảng nghỉ thật giữa hai job có
thể vượt 5 phút.

Và phép đo tôi dùng để hiệu chỉnh ngưỡng lần đầu cũng vô nghĩa: nó đo khoảng cách giữa hai lần
poll, vì trong lúc đếm nhịp thì `run.status.current` **vẫn hiển thị job vừa xong**. Đã bỏ.

**Quan sát đúng** là độ dài của khoảng "job xong · `running: 0` · chưa job nào khởi động":

| Lượt | Khoảng đó | Kết cục |
|---|---|---|
| F4R8 sau Q004 | **22 phút** | không bao giờ hồi |
| F4R9 sau Q001 | ~4–5 phút | tự đi tiếp |

Ngưỡng nay đặt **10 phút**, có ghi rõ vì sao. **Cơ chế vẫn chưa biết** — F-25 còn nguyên là nợ,
không phải đã giải.

**Bài học:** một bộ phát hiện dựng bằng suy luận chỉ đáng tin bằng đúng suy luận đó. Ngưỡng
phải đến từ số đo, và trước khi báo "hỏng" thì hỏi lại hệ thống một câu.

## Còn lại

- 8/50 credit trên `Bình` — đủ 1 video nữa.
- F-25 chưa giải: cần biết cái gì giết vòng lặp ở lượt F4R8.
- Chưa đủ để kết luận nhịp chậm **là nguyên nhân** không bị gắn cờ: đã đổi nhiều hơn một biến
  (tài khoản, độ dài video, locale). Nhưng 7/7 sạch, so với lượt nhịp cũ bị chặn ở job thứ hai.
