# Pilot 07 — Kết quả (26/08/2026)

## Kết luận một dòng

**ĐẠT 18/18.** 18 ảnh màu của Đức đã thành 18 tranh nét cho trẻ 5 tuổi tô. Không job nào bỏ dở,
không phải can thiệp tay lần nào. Ba lần thử lại tự động, hệ thống tự gỡ.

## Số liệu

| Chỉ số | Kết quả |
|---|---|
| SUCCESS | **18/18** |
| Đạt ngay lần thử đầu | 16/18 (89%) |
| Thử lại | Q001 cần 2 lần · Q004 cần 3 lần · 16 job còn lại 1 lần |
| Tổng số lần thử | 21 cho 18 tấm |
| `persistence_verified` | true toàn bộ |
| `attribution` | `post_turn` toàn bộ — không tấm nào lấy nhầm ảnh của job khác |
| Thời gian | 15:17 → 15:46, khoảng **1 phút 15 giây / tấm** |
| Halt | Không lần nào |

Chạy làm hai chặng theo kế hoạch: chặng 1 ba tấm (15:17–15:22), chặng 2 mười lăm tấm (15:24–15:46),
cách nhau đúng luật ≥300 giây.

## Năng lực mới được chứng minh: mỗi job một ảnh mẫu riêng

Trước pilot này, đường ảnh tham chiếu mới chỉ chạy live với **một** ảnh mẫu dùng chung
(Pilot-REF-01). Pilot 07 chạy 18 job với 18 ảnh mẫu khác nhau.

Kiểm chứng bằng mắt, không chỉ tin nhãn SUCCESS:

| Cặp đã soi | Kết quả |
|---|---|
| Q001 ↔ `ref-18` | Đúng — bố, bé, chó, khối gỗ |
| Q002 ↔ `ref-04` | Đúng — bếp làm bánh quy; chữ trên bảng đen **đã được bỏ** theo yêu cầu prompt |
| Q003 ↔ `ref-12` | Đúng — chợ nổi |
| Q004 ↔ `ref-01` | Đúng — xưởng gốm |
| Q018 ↔ `ref-17` | Đúng — lều đọc truyện, sách pop-up, đèn bão. **Tấm thứ 17 trong chuỗi vẫn không trôi ảnh mẫu** |

Bảng đối chiếu đầy đủ 18 cặp: `ket-qua/BANG-DOI-CHIEU-KET-QUA.md`.

## Chất lượng tranh so với yêu cầu của Đức

| Đức yêu cầu | Kết quả |
|---|---|
| Nét mảnh liền dạng vector | Đạt — nét đều, liền, không đứt |
| Vùng màu rõ ràng | Đạt — hình khép kín, tô được |
| Nền trắng hoàn toàn | Đạt |
| Bỏ chữ | Đạt — bảng đen, biển hiệu, bìa sách đều được để trống |

Một điểm Đức nên tự chấm: **độ rậm không đều nhau**. `to-mau-18` (bố con xếp khối) rất thoáng,
hợp trẻ 5 tuổi. `to-mau-12` (chợ nổi) rậm hơn hẳn dù Gemini đã tự lược. Nếu Đức thấy vài tấm quá
rối thì không cần chạy lại cả bộ — chỉ chạy lại đúng những tấm đó với prompt siết chặt hơn.

## Prompt đã dùng (giữ nguyên cho cả 18 job)

```
Generate an image: redraw the attached picture as a black-and-white colouring page for a
5-year-old child. Simple vector-style line art: thin, smooth, continuous black outlines of
even weight on a pure white background. Keep the main characters and only the few most
important objects; simplify or remove small background clutter, fine texture, patterns and
any text. Every shape must be a fully closed outline so a child can colour inside it.
Outlines only - no shading, no hatching, no grey, no colour, no fill, no watermark.
Large, clear, well-separated shapes.
```

## Ba lần thử lại — số liệu cho việc mở số 2 của brief

Đây là thứ brief cần và chưa có. **Có HAI kiểu trượt khác nhau, không phải một.**

### Kiểu A — `NO_NEW_IMAGE`, không có ứng viên nào (Q004, trượt 2 lần)

| Lần | Bắt đầu | Trượt | Kéo dài | `post_turn` | `fresh` |
|---|---|---|---|---|---|
| 1 | 08:26:36 | 08:27:16 | 40 giây | 0 ảnh | 0 ảnh |
| 2 | 08:27:31 | 08:28:09 | 38 giây | 0 ảnh | 0 ảnh |
| 3 | 08:28:29 | đạt 08:29:06 | 37 giây | 1 ảnh | 2 (1 duy nhất) |

Cả ba lần đều kéo dài xấp xỉ nhau (~38 giây), mà **~35 giây trong đó là gắn ảnh mẫu**
(đo từ `JOB_START` → `ATTACHMENTS_READY` ở các job khác). Nghĩa là sau khi gửi prompt, hệ thống
chỉ thật sự nhìn trang vài giây rồi kết luận. Lúc đó `post_turn` và `fresh` đều bằng **0** — trang
chưa có ảnh nào cả.

**Giả thuyết trong brief là ĐÚNG cho kiểu này:** nhánh "kết quả là chữ" chốt sau 1,5 giây chữ ổn
định, trước khi Gemini kịp sinh ảnh.

### Kiểu B — `AMBIGUOUS_NEW_IMAGE`, hai ảnh mới cùng lúc (Q001, trượt 1 lần)

| `post_turn` | `fresh` | Chọn | Lý do |
|---|---|---|---|
| 1 ảnh (`6c89e72a`) | 2 ảnh (thêm `2bcc3eb9`) | không chọn | Luật cấm đoán khi có hai ảnh mới |

Ảnh thứ hai mang vai `assistant`, `visible`, `ready`, **không** bị chấm là ảnh đầu vào, và không
nằm trong 26 ảnh nền của hội thoại. Chưa biết nó là gì — sổ cái chỉ ghi mã băm, không ghi URL.

**Lớp bảo vệ đã hành xử đúng:** nó từ chối đoán, và lần thử lại cứu được. Đây là lớp chống job này
lấy ảnh của job khác — **không được nới**.

### Việc cần làm tiếp, theo thứ tự

1. **Thêm URL rút gọn vào `fresh_ids` trong sổ cái.** Không đổi luật gì, chỉ để lần sau nhận mặt
   được ảnh lạ. Không có nó thì kiểu B mãi mãi là ẩn số.
2. Với kiểu A: đừng để nhánh chữ kết luận khi `expectImage` mà `fresh` đang bằng 0. **Đo trước rồi
   sửa** — pilot này đã cho con số, nhưng con số nói "chưa có ảnh nào", chưa nói "phải chờ thêm bao
   lâu". Cần một cửa sổ đo trước khi chọn ngưỡng.

## Hai lỗi vận hành mới, đã ghi vào bảng lỗi của `AI-OPERATOR-GUIDE.md`

1. **`INVALID_ENVELOPE` khi nạp nhiều ảnh mẫu.** Trần thật là **1 MB mỗi lệnh RPC**
   (`MAX_ENVELOPE_BYTES`), không phải "≤5 ảnh" như sổ tay ghi. 15 ảnh phải chia 6 lô theo dung lượng.
2. **Tên file đầu ra đè nhau giữa các pilot.** Job luôn đánh số lại từ Q001, nên Pilot-07 rơi vào
   cùng thư mục với Batch-SX-01 và Chrome tự đổi thành `Q001 (3).jpg`. Tôi đã suýt đọc nhầm một
   poster Bali cũ (`Q009.jpg`, 09:05 sáng) thành kết quả của pilot này — bắt được nhờ đối chiếu
   **giờ sửa file**, không phải tên. Luật mới: mỗi pilot đặt `output_downloads_subfolder` riêng.

## Ghi chú về ảnh gốc

18 file PNG gốc (44 MB) **không bị đụng**. Bản thu nhỏ JPEG 1024px nằm ở `refs-thu-nho/`
(127–294 KB, lọt trần 700 KB). PNG gốc không đưa vào git (xem `.gitignore` cùng thư mục) —
repo khỏi phình, ảnh vẫn nằm nguyên trên máy Đức.
