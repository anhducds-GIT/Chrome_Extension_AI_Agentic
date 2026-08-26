# Batch Sản Xuất 01 — KẾT QUẢ (chạy 2026-08-26, AI tự vận hành)

## Kết luận một dòng

**ĐẠT.** 12/12 ảnh thành công trong MỘT chuỗi liên tục, không lỗi, không halt, không ai chạm tay
vào giao diện. Đây là lần đầu pipeline chạy chuỗi dài (>10 job) trên trang thật.

## Số liệu

| Chỉ số | Kết quả |
|---|---|
| Job chạy | 12 (Q001 → Q012), một chuỗi liên tục |
| SUCCESS | **12/12** (tiêu chí đạt là ≥11/12) |
| FAILED / INTERRUPTED | 0 / 0 |
| Retry | 0 — không job nào phải thử lại |
| Halt giữa chừng | Không |
| `artifact_persistence_failed` | false |
| Tổng thời gian | 13 phút 19 giây (799 giây) |
| Trung bình mỗi ảnh | ~66 giây (gồm 25s nghỉ giữa các job) |
| run_id | `20260826-0154-bridge-2026-08-26t01-54` |

Tham số chạy: `run.trial` với 12 job, timeout 90s/job, delay 25s giữa các job, Dev Mode BẬT.

## Kiểm chứng tên file — nâng cấp "giành lại quyền đặt tên" ĐÃ THẮNG

Đây là điều đáng giá nhất của lần chạy này.

Trước đây Chrome trên máy Đức đổi tên mọi file extension tải về thành mã UUID rác
(`162499c9-e4c6-4372-8719-571b3c79e9ef.png`). Lần này:

| Yêu cầu | Thực tế trên đĩa |
|---|---|
| Q001.png … Q012.png | **Q001.jpg … Q012.jpg** |

12/12 file nằm đúng thư mục `Downloads\Phai sinh\Duc Auto Gemini\`, tên sạch, đánh số đúng thứ tự
job. **Không còn một file UUID nào** sinh ra trong lần chạy này. `persistence_verified = true` cho
cả 12 job.

Khác biệt duy nhất: đuôi `.png` → `.jpg`. Đây KHÔNG phải lỗi. Gemini trả ảnh dưới dạng JPEG, và
Chrome tự sửa đuôi cho khớp với nội dung thật của file. Đuôi mới đúng hơn đuôi cũ. Lớp
khoan-dung-đổi-tên (lưới dự phòng) nhận ra và chấp nhận, ghi lại tên thật vào sổ cái.

## Kiểm chứng nội dung — 12/12 ảnh đúng đề bài

Đã mở xem từng ảnh một, không xem mẫu. Đây là phép thử gán-nhầm-ảnh (lỗi từng gặp ở các phiên
trước: job sau nhặt nhầm ảnh của job trước).

| Job | Đề bài | Ảnh nhận được |
|---|---|---|
| Q001 | Hạ Long, teal + vàng | Poster Hạ Long, núi đá + thuyền buồm, teal/vàng ✅ |
| Q002 | Kyoto, cổng torii + lá phong | Poster Kyoto, torii đỏ + lá phong ✅ |
| Q003 | Paris, tháp Eiffel hoàng hôn, tím | Poster Paris, Eiffel + trời tím ✅ |
| Q004 | Santorini, nhà trắng mái vòm xanh | Poster Santorini, nhà trắng + vòm xanh ✅ |
| Q005 | Sahara, đoàn lạc đà lúc hoàng hôn | Poster Sahara, bóng lạc đà + mặt trời lặn ✅ |
| Q006 | New York, skyline + taxi vàng | Poster NYC, skyline + taxi vàng ✅ |
| Q007 | Alps Thụy Sĩ, cáp treo đỏ | Poster Swiss Alps, cáp treo đỏ + núi tuyết ✅ |
| Q008 | Venice, thuyền gondola dưới cầu | Poster Venice, gondola + cầu Rialto ✅ |
| Q009 | Bali, ruộng bậc thang + cổng đền | Poster Bali, ruộng bậc thang xanh + cổng đền ✅ |
| Q010 | Iceland, cực quang + bãi cát đen | Poster Iceland, cực quang ✅ |
| Q011 | Cairo, kim tự tháp + thuyền felucca | Poster Cairo, kim tự tháp + thuyền buồm ✅ |
| Q012 | Sydney, nhà hát bình minh | Poster Sydney Opera House, bình minh ✅ |

Không có tấm nào trùng nhau, không tấm nào lệch đề. Job cuối chuỗi (Q012) vẫn nhận đúng ảnh của
chính nó — đây là bằng chứng mạnh nhất rằng cơ chế gán ảnh giữ chuẩn suốt cả chuỗi dài.

## Việc mở nhỏ (không chặn gì)

- File audit bị Chrome đánh số: `Bridge-...__audit.jsonl` và `Bridge-...__audit (1).jsonl`. Đây là
  giới hạn đã biết — Chrome Downloads không ghi nối tiếp vào file cũ, nên mỗi lần ghi ra một file
  mới. Không mất dữ liệu; bản `(1)` là bản đầy đủ cuối cùng (168KB). Muốn hết hẳn thì phải dùng
  chế độ "thư mục" thay vì Downloads.
- Mẫu tên ảnh mặc định để `{job_id}` + `.png`. Có thể đổi mặc định sang `.jpg` cho khớp thực tế,
  nhưng phải hỏi Đức vì đó là đổi cấu hình mặc định.

## Bối cảnh trước khi chạy (để phiên sau đọc hiểu)

Đầu phiên, extension đã được reload lên bản mới nhưng tab Gemini vẫn ôm content script cũ →
`RECEIVER_LOST`. `diagnostics.dom_probe` (nâng cấp mới) chẩn đoán ra ngay, không phải mượn mắt
Đức. Sau khi Đức F5 tab một lần là chạy thẳng, không vấp thêm lần nào.

**Nếp mới rút ra:** reload extension → LUÔN phải F5 tab Gemini kèm theo.
