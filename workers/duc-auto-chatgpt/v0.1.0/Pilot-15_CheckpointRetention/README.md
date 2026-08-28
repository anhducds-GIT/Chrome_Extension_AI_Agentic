# Pilot-15 — Kiểm tính năng DỌN RÁC CHECKPOINT

**Ngày:** 2026-08-28 · **Đức duyệt chạy live:** có · **Trạng thái:** chưa chạy

## Pilot này hỏi đúng một câu

> Cơ chế dọn rác có xoá đúng thứ cần xoá, và có **giữ lại được** thứ không được phép xoá không?

Đây là tính năng **xoá file thật**. Nó đã qua ba vòng audit độc lập (REJECT → REVISE → PASS)
và mỗi vòng đều lòi ra một đường xoá nhầm khác nhau — trong đó **một lỗi là do chính bản vá
sinh ra**. Nhưng cho tới lúc này nó **chưa chạy trên Chrome lần nào và chưa xoá một file thật nào**.
Pilot này là lần đầu.

## Vì sao pilot tự tố cáo được

Theo đúng bài học Pilot-14 (Đức chốt 26/08: *pilot kiểm tính năng thì tự tạo, đừng đem việc thật
ra đo*), kết quả ở đây **tự nói lên đúng/sai** mà không cần diễn giải:

- Thư mục **hoàn toàn mới và trống**. Mọi file trong đó đều do run này sinh ra — không có gì
  của run cũ để đổ lỗi.
- Chạy 2 job thì runner ghi **7 checkpoint** (mỗi job 3, cộng 1 bản cuối lúc kết thúc).
- Với `checkpoint_retention = 2`, cuối run thư mục **phải còn đúng 2 file** `.xlsx`.
- Đếm file là xong. Không cần đọc code, không cần tin lời AI nào.

## Thiết lập

| Mục | Giá trị |
|---|---|
| Thư mục ra | `Downloads\DucAuto_GPT-Output\Pilot-15_CheckpointRetention` (mới, trống) |
| Số job | 2, đều `text_reasoning` |
| `checkpoint_retention` | 2 (mặc định) |
| `max_retries` | 0 |
| Backup trước khi chạy | AI tự làm, đối chiếu SHA-256 |

Prompt cố ý ngắn (yêu cầu trả lời một dòng) để pilot đo **cơ chế dọn rác**, không đo nội dung.

## ĐẠT khi nào

1. Cả 2 job `SUCCESS`, `response_text` nguyên vẹn trong Result XLSX.
2. Cuối run thư mục còn **đúng 2 file `.xlsx`** (cộng 1 file `__audit.jsonl`).
3. File còn lại là **hai version CAO NHẤT**, và bản cao nhất mở được, đọc được cả 2 job.
4. Audit JSONL có sự kiện `CHECKPOINT_PRUNED` ghi rõ đã xoá tên file nào.
5. **Không** có `CHECKPOINT_PRUNE_SKIPPED` (thư mục trống nên không được có tín hiệu "thư mục bẩn").

## HỎNG khi nào — và đây mới là phần quan trọng

| Dấu hiệu | Nghĩa là |
|---|---|
| Thư mục còn 0 hoặc 1 file `.xlsx` | **Xoá lem sang bản mới nhất.** Lỗi nặng nhất, dừng ngay |
| Còn đủ 7 file | Dọn rác không chạy — chốt chặn nào đó chặn nhầm |
| Có `CHECKPOINT_PRUNE_SKIPPED` | Chốt "chỉ dọn khi mình là bản mới nhất" hiểu sai thư mục trống |
| Có `CHECKPOINT_PRUNE_PARTIAL` | Chrome từ chối xoá — cần đọc lý do, có thể là file đang mở |
| Có file nào ngoài thư mục này biến mất | **Sai phạm vi.** Nghiêm trọng nhất, dừng và báo Đức ngay |

## Ẩn số mà chỉ live mới trả lời được

1. `chrome.downloads.search({filenameRegex})` trong bản Chrome này có khớp theo cách đã giả định không.
2. Chuỗi đường dẫn tuyệt đối Chrome trả về có đúng dạng đang dùng làm mốc so thư mục không.
3. `removeFile()` báo lỗi bằng cách nào khi không xoá được.
4. Chuyện gì xảy ra khi **file đang mở trong Excel** — ca Đức rất dễ gặp.

## Bằng chứng

Đặt trong `evidence/`. Chỉ THÊM, không sửa, không xoá — luật vùng cấm.
