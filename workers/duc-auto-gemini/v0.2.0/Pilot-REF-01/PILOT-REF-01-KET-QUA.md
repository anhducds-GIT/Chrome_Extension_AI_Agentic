# Pilot REF-01 — Ảnh tham chiếu, lần đầu chạy trên trang thật (26/08/2026)

## Kết luận một dòng

**ĐẠT.** Đường gắn ảnh tham chiếu — code có từ lâu nhưng **chưa từng chạy live lần nào** — hoạt động
đúng ngay lần đầu. 2/2 job thành công, và ảnh sinh ra **rõ ràng bám theo phong cách ảnh mẫu**.

## Cách thử

| Mục | Nội dung |
|---|---|
| Ảnh mẫu | `style-ref-halong.jpg` — chính là poster Hạ Long `Q001.jpg` do Batch-SX-01 tạo ra |
| Kích thước | 118.878 byte → data URL 158.527 byte (trần 716.800) |
| Job | Q013 (Đà Nẵng — cầu Rồng), Q014 (Hội An — đèn lồng) |
| Yêu cầu trong prompt | "dùng poster đính kèm làm mẫu phong cách; giữ nguyên thiết kế phẳng, bảng màu xanh mòng két + vàng, và bố cục" |
| Tham số | chuỗi 2 job, timeout 90s, delay 25s |

Chọn 2 job chứ không phải 1 là có chủ đích: job thứ hai kiểm tra xem ảnh mẫu có **gắn lại đúng cho
job kế tiếp** không, hay chỉ gắn được lần đầu.

## Kết quả

| Chỉ số | Kết quả |
|---|---|
| SUCCESS | **2/2** |
| Lỗi gắn ảnh (`ATTACHMENT_FAILED` / `ATTACHMENT_NOT_READY`) | Không có |
| Retry | 0 |
| `persistence_verified` | true cả 2 |
| Tên file | `Q013.jpg`, `Q014.jpg` — sạch, không UUID |
| Thời gian | ~90 giây cho cả 2 |

## Bằng chứng ảnh mẫu THẬT SỰ được dùng

Đây mới là phép thử quan trọng. Sổ cái báo SUCCESS chỉ chứng minh không có lỗi kỹ thuật — nó
**không** chứng minh Gemini nhìn thấy ảnh. Nếu ảnh gắn hụt mà code không bắt được, job vẫn
SUCCESS nhưng ảnh sẽ chẳng liên quan gì tới mẫu.

So sánh trực tiếp ba tấm:

| Đặc điểm | Q001 (ảnh mẫu) | Q013 (Đà Nẵng) | Q014 (Hội An) |
|---|---|---|---|
| Cách trình bày | 3 poster cạnh nhau, tấm giữa có khung | Giống hệt | Giống hệt |
| Bảng màu | Xanh mòng két + vàng kim | Giống | Giống |
| Khối tiêu đề | Tên lớn + "VIETNAM" nhỏ bên dưới | Giống | Giống |
| Dải chân poster | Khẩu hiệu in đậm + dòng phụ ngăn bằng dấu chấm | `DRAGON BRIDGE` + `VIETNAM · DRAGON'S BREATH · DISCOVER` | `DISCOVER THE NIGHT` + `HOI AN · ANCIENT TOWN · LANTERNS` |
| Mô-típ | Mặt trời toả tia, mặt nước phản chiếu, thuyền nhỏ | Giống | Giống |

Ba tấm nằm cạnh nhau trông như **cùng một bộ**. Không thể trùng hợp — ảnh mẫu đã tới tay Gemini.

Và Q014 là job **thứ hai** trong chuỗi, cũng bám mẫu y hệt → ảnh mẫu gắn lại đúng cho job kế tiếp,
không phải chỉ được lần đầu.

## Xác nhận từ DOM probe trước khi chạy

Probe khớp đúng mô tả trong adapter, chứng minh selector không phải đoán:

| Selector | Khi menu upload ĐÓNG |
|---|---|
| `button[aria-label="Upload & tools"]` | 1 (có) |
| `input[type="file"]` (mọi biến thể) | **0** |

Đúng như adapter ghi: Gemini **không có** ô nhập file cố định — nó chỉ hiện ra trong lúc menu
upload mở. Đây là lý do code phải mở menu trước khi gán file.

## Việc mở phát hiện được (chưa sửa)

**Chạy thành công thì KHÔNG biết đường nào đã thắng.** Code có hai đường gắn ảnh: đường chính
(mở menu → gán vào ô nhập file tạm) và đường dự phòng (giả lập kéo-thả). Dấu vết chẩn đoán
(`attachmentFingerprint`) **chỉ được ghi khi THẤT BẠI**. Lần này thành công nên không có gì ghi lại,
và ta vẫn không biết Gemini đã chấp nhận đường nào.

Vì sao đáng sửa: hôm nào Google đổi giao diện làm hỏng đường chính, hệ thống sẽ **âm thầm** rơi sang
đường dự phòng và vẫn chạy — cho tới khi đường dự phòng cũng hỏng, lúc đó mới sập, và không có
lịch sử nào cho biết nó đã âm thầm chống đỡ bao lâu. Ghi lại đường đã dùng kể cả khi thành công là
một dòng vào sổ cái, đổi lại một cảnh báo sớm.

## Bối cảnh

Chạy trên phiên đang có sẵn (12 job Batch-SX-01 đã xong trước đó). Không phải mở phiên mới.
Ảnh mẫu bơm qua Bridge bằng `references.add`, job bơm bằng `jobs.add`, chạy bằng `run.trial` —
Đức không chạm giao diện lần nào.
