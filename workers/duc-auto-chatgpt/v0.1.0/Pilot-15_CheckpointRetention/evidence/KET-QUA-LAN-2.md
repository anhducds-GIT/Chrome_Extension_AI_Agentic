# Pilot-15 lần 2 (2026-08-28 05:24) — **ĐẠT TOÀN BỘ**

Chạy lại sau khi vá lỗi phạm vi. Dựng **đúng điều kiện đã gây ra vụ xoá nhầm lần 1**:
`v01` ghi vào thư mục mặc định, rồi mới đổi đích sang thư mục pilot mới.

## 5 mốc — đạt cả 5

| # | Mốc | Kết quả |
|---|---|---|
| 1 | 2 job SUCCESS, text nguyên vẹn | **Q001 20 ký tự · Q002 22 ký tự**, số ghi trong sổ khớp độ dài thật |
| 2 | Cuối run còn đúng 2 file `.xlsx` | **đúng 2** (`v08`, `v09`) — máy đã ghi 9 bản, xoá 5 |
| 3 | Hai bản còn lại là version cao nhất, mở được | **đúng**, đọc lại được cả 2 job |
| 4 | Audit ghi rõ đã xoá tên file nào | **5 sự kiện `CHECKPOINT_PRUNED`**, nêu đích danh từng file |
| 5 | Không có xoá nhầm phạm vi | **6 sự kiện `CHECKPOINT_PRUNE_SCOPE`** — mọi lần dọn đều nhận ra file ở thư mục khác và để yên |

## Bằng chứng quyết định: bẫy sống sót

File bẫy — cùng mẫu tên, **khác thư mục** — đặt trước khi chạy:

```
Phai sinh\Duc Auto ChatGPT\Bridge-2026-08-28T05-24__results__v01.xlsx
SHA256 trước: 0D22487B754A981448CB59182CDC12F2C2AC897AADBA869A2467603DB4507420
SHA256 sau  : 0D22487B754A981448CB59182CDC12F2C2AC897AADBA869A2467603DB4507420
```

**Nguyên vẹn từng byte.** Lần 1 file tương đương đã bị xoá. Bản vá đóng được lỗ đó trên máy thật,
không chỉ trên giấy.

Còn kiểm được một điều mà test không kiểm được: job text lưu `result_file` và `image_count`
**rỗng** — không có ảnh nào giả dạng, đúng luật, trên DOM thật.

## Hai phát hiện mới, không phải lỗi của bản vá

### A. Chạy từ TRANG CHỦ ChatGPT thì hỏng — phải ở sẵn một hội thoại

Lần 1 hết giờ **không phải** vì ChatGPT chậm. Dò DOM sau đó: câu trả lời **đã ra**.
Nguyên nhân: tab ở `chatgpt.com/`, gửi prompt đầu tiên làm trang **nhảy sang `/c/<id>`**,
cú nhảy đó xoá mốc gán kết quả đang nằm trong bộ nhớ content script → runner không nhận được
câu trả lời của chính nó → `TIMEOUT_AFTER_SUBMIT`.

Lần 2 tab đã ở sẵn hội thoại: **Q001 xong trong ~20 giây**.

→ **Luật vận hành: trước khi chạy, tab phải ở sẵn một hội thoại `/c/<id>`, không phải trang chủ.**

### B. Đồng hồ đếm ngược giữa job chạy rất chậm khi panel không ở tiền cảnh

Khoảng nghỉ giữa job đặt 12–24 giây, thực tế mất **~11 phút**. Không treo — vẫn chạy tới cùng.
Nguyên nhân gần như chắc chắn: Chrome bóp `setTimeout` của tài liệu không hiển thị.
Không mất dữ liệu, không sai kết quả, nhưng ai canh run sẽ tưởng máy đã treo.

→ Ghi vào bảng lỗi để phiên sau đừng chẩn đoán lại từ đầu.

## Bằng chứng kèm theo

- `audit-run2-20260828-0524.jsonl` — sổ audit đầy đủ
- `tripwire-lan-2-truoc-khi-chay.txt` — SHA-256 file bẫy, ghi TRƯỚC khi chạy
