PILOT-06 — Bài nghiệm thu sau khi sửa lỗi (2026-08-22)
=======================================================

MỤC ĐÍCH
Xác nhận 4 lỗi đã sửa thật sự hết trên máy thật. Đây KHÔNG phải pilot thử
tính năng mới — mọi thứ giống Pilot-05, chỉ khác là không dùng ảnh tham chiếu
để Đức bớt thao tác.

Vì sao là Pilot-06 chứ không ghi đè Pilot-05:
Folder pilot-05 đang chứa đúng những file lỗi dùng làm bằng chứng
(v005 trùng dòng, tên file bị viết thường, audit ghi trùng). Ghi đè lên đó là
xoá mất bằng chứng. Pilot-06 là folder sạch, cùng cấu hình.

CHUẨN BỊ (1 lần)
1. chrome://extensions → Reload extension "Duc Auto ChatGPT".
2. Mở https://chatgpt.com/ ở 1 tab, vào 1 cuộc hội thoại bình thường, để yên.

CHẠY LẦN 1 — tạo v001
3. Mở side panel.
4. Chọn workbook:  pilot-06/Duc-Auto-ChatGPT-Pilot-06.xlsx
5. KHÔNG cần chọn ảnh tham chiếu. Workbook này không dùng ảnh.
6. Bấm "Choose Image Folder" → chọn đúng folder  pilot-06  → cho phép ghi.
7. Bấm Check Plan. Phải không còn blocker.
8. Bấm Run. Chờ 3 job chạy xong (P06-A, P06-B, P06-C).

KIỂM TRA LẦN 1  → đây là phần quan trọng nhất
   [ ] A. Trong folder pilot-06 có đúng các file:
          P06-A.png, P06-B.png, P06-C.png
          Duc-Auto-ChatGPT-Pilot-06__results__v001.xlsx
          Duc-Auto-ChatGPT-Pilot-06__audit.jsonl
       → Tên file audit phải VIẾT HOA chữ D đầu (Duc-...), không phải duc-...
          Đây là lỗi #2 đã sửa.

   [ ] B. Mở Duc-Auto-ChatGPT-Pilot-06__results__v001.xlsx bằng Excel.
       → Excel KHÔNG được hỏi "sửa file / repair".
       → Vào sheet "config": mỗi key chỉ xuất hiện ĐÚNG 1 LẦN.
          (Trước đây run_id, effective_result_xlsx... bị ghi 2 lần.)
          Đây là lỗi #1 đã sửa.

   [ ] C. Mở Duc-Auto-ChatGPT-Pilot-06__audit.jsonl bằng Notepad.
       → Không có dòng nào bị lặp y hệt nhau.
          Đây là lỗi #3 đã sửa.

   [ ] D. Trong sheet "jobs", cột write_outcome của 3 job phải là  written
       → KHÔNG được là  overwritten  (vì đây là file mới tinh, không đè gì cả).

   [ ] E. Nhìn màn hình RUN và OUTPUT trong side panel:
       → Danh sách job, danh sách output, ảnh thumbnail hiển thị bình thường.
       → Bấm vào 1 job xem chi tiết: Prompt / References / Settings hiện đủ.
          Đây là phần giao diện đã viết lại, cần nhìn bằng mắt.

CHẠY LẦN 2 — tạo v02 (kiểm tra resume)  ← ĐÃ CHUẨN BỊ SẴN

Ledger v001 đã được thêm sẵn 2 job mới: P06-D và P06-E.
(3 job cũ A/B/C vẫn khoá vĩnh viễn, hệ thống sẽ KHÔNG chạy lại chúng.)
Đã mô phỏng trước bằng đúng core của extension, kết quả phải ra:
    P06-A/B/C = SAFE_COMPLETE (bỏ qua)
    P06-D/E   = SAFE_PENDING  (sẽ chạy)
    0 blocker · next job = P06-D · checkpoint tiếp theo = v02

9.  Bấm "Continue Existing Run".
10. Chọn file  Duc-Auto-ChatGPT-Pilot-06__results__v001.xlsx
11. Chọn lại folder pilot-06 khi được hỏi.
12. Check Plan → phải hiện "3 completed · 2 safe pending · 0 need review",
    KHÔNG có blocker.
13. Bấm Run. Chỉ P06-D và P06-E chạy (2 lần sinh ảnh).

KIỂM TRA LẦN 2
   [ ] F. Có file Duc-Auto-ChatGPT-Pilot-06__results__v02.xlsx
          → Tên là v02 (2 chữ số), KHÔNG phải v002. Quy ước mới.
          → File v001 cũ vẫn còn nguyên, không bị ghi đè.
          → Có thêm P06-D.png và P06-E.png.

   [ ] G. Mở v02 → sheet config → dòng previous_checkpoint_filename phải là
          Duc-Auto-ChatGPT-Pilot-06__results__v001.xlsx
          (VIẾT HOA đúng như tên file thật, không phải duc-auto-chatgpt-...)
          Đây là bằng chứng cuối của lỗi #2.

   [ ] H. Mở v02 → sheet config → mỗi key vẫn chỉ 1 lần (như mục B).
          Đây là lúc dễ sinh trùng nhất vì snapshot chạy nhiều lần hơn.

   [ ] I. Mở lại file audit → 3 job cũ vẫn còn, 2 job mới nối tiếp phía dưới,
          không có dòng nào lặp, KHÔNG có dòng AUDIT_CHAIN_GAP.

GHI CHÚ VỀ TÊN FILE
Từ bản này quy ước là v01, v02, v03... (2 chữ số).
File v001 sinh ra trước khi đổi quy ước vẫn đọc và resume bình thường —
nó được hiểu là version 1, và checkpoint kế tiếp ghi thành v02.

NẾU CÓ MỤC NÀO KHÔNG ĐẠT
Chụp màn hình + gửi file kết quả tương ứng. Không cần chạy lại nhiều lần.

CẤU HÌNH WORKBOOK (để tham khảo)
   3 job, không ảnh tham chiếu, delay 3s, timeout 300s
   output_destination_mode = profile (bắt buộc chọn folder, vì audit cần
                             folder mới nối tiếp được — Chrome Downloads không
                             đọc lại được file audit cũ)
   collision_policy        = overwrite   (cố ý, để kiểm tra mục D)
   result pattern          = Duc-Auto-ChatGPT-Pilot-06__results__v{version}.xlsx
                             ({version} nay ra 2 chu so: v01, v02, ...)
   audit filename          = Duc-Auto-ChatGPT-Pilot-06__audit.jsonl

Tạo lại workbook (nếu cần):
   node workers/duc-auto-chatgpt/v0.1.0/scripts/create-pilot-06.mjs
