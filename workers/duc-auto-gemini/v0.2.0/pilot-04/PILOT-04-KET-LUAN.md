# Pilot 04 — KẾT LUẬN (2026-08-25)

## Kết quả cuối: MỤC TIÊU ĐẠT — vòng tự hành khép kín đã được chứng minh trên trang thật

Chuỗi chung kết: **4/4 SUCCESS trong MỘT trial liên tục** (sau khi vá nhận diện + nâng trần chuỗi),
toàn bộ do AI điều khiển qua Agent Bridge, không ai chạm giao diện extension:
`jobs.add` → `run.trial` (chuỗi 4 job, delay 25s) → theo dõi `run.status` → 4 ảnh tự tải về.

## Diễn biến đầy đủ (giá trị nằm ở các vòng thua)

| Lượt | Job | Kết quả | Bài học |
|---|---|---|---|
| Trial 1 (luật cũ ≤2 job) | Q001, Q002 | ❌❌ | Lộ bug nhận diện: Gemini có lúc TẠO ảnh nhưng KHÔNG render preview → detection (đòi ảnh hiển thị ≥200px) trượt → cơ chế "chưa xác minh ảnh thì không chạy tiếp" khoá dây chuyền → halt. An toàn đúng, mắt kém. |
| Trial 2 | Q003, Q004 | ✅✅ | Chat thường /app + prompt "Generate an image: …" chạy hoàn hảo (mẹo của owner). |
| Trial 3 | Q005, Q006 | ❌❌ | Q005 lặp đúng vết Q001 trên hội thoại khác → khép án: lỗi hệ thống nhận diện, không phải trang lỗi ngẫu nhiên. |
| Chung kết (luật mới: chuỗi ≤10) | 4 job oan chạy lại | ✅✅✅✅ | Bản vá "ảnh trong khung generated-image với URL lh3 thật = ảnh tồn tại, render chỉ là mỹ thuật" trúng đích. |

Điểm số từng khâu qua cả pilot: **gõ+gửi 9/9 · Gemini tạo ảnh 9/9 · nhận diện 2/5 trước vá → 4/4 sau vá · tải về 6/6**.

## Các bản vá/thay đổi sinh ra từ pilot này (đều có test ghim, suite 74/74)

1. `44bb09b` — nhận diện ảnh chưa render (remoteVerifiedResult).
2. `95d8d78` — trần trial 2 → 10 job/chuỗi liên tục (quyết định owner giữa pilot).
3. `6b920ec` — khoan dung đổi-tên-file download + START-BRIDGE.cmd (từ phiên trước, được pilot xác nhận chạy đúng: checkpoint verified).
4. `26b94f8` — references.add + INTERNAL_ERROR mang details.message (details.message đã chứng minh giá trị ngay trong pilot).

## Việc còn mở sau pilot

- Nhân vụ preview không render: cân nhắc lệnh chẩn đoán DOM qua Bridge (`diagnostics.domProbe`) để AI tự soi trang không cần mắt owner.
- Chuỗi >10 job (sản xuất) chưa kiểm chứng — cần một lần Đức bấm Run batch thật.
- Thủ phạm đổi tên download trong Chrome của owner chưa xác định (hệ thống đã miễn nhiễm).
- Push repo lên remote (chờ owner duyệt).

## Dành cho AI kế nhiệm

Đọc `../AI-OPERATOR-GUIDE.md` trước khi làm bất cứ gì — bảng lỗi trong đó đã cập nhật đủ các vết của pilot này.
