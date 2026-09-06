---
kind: brief
status: active
ttl_days: 60
---

# BRIEF `BANG-DANG-LAM-01` — Khối "Đang làm gì" nói bằng ngôn ngữ máy, và cũ mà không ai báo

Đức nêu ngày 06/09 khi nhìn khối *"Đang làm gì — 2 luồng đang chạy"* ở tab AI điều phối:

> *"Báo cáo luồng này chưa ổn, bị đi vào quá chi tiết. Các `Y-xx` cần có một nest lớn hơn để
> tôi hiểu ý tưởng đó đang giải quyết vấn đề gì, và viết rõ hơn một chút về công việc đang
> được triển khai."*

## 1. Hai bệnh, Đức nêu một

**⑴ Nó in dữ liệu thô của bảng quyền.** Tên lane · tên khoá · chuỗi việc gõ lúc nhận khoá ·
giờ nhận. Chuỗi đó do AI gõ vào tham số `--task` nên nó **không dấu và đầy từ kỹ thuật**:
*"them .gitattributes, chuan hoa EOL ve LF"*. Đức đọc xong không biết nó đang chữa bệnh gì.

Và nó **sẽ mãi như vậy** — tham số dòng lệnh trên Windows PowerShell là chỗ chữ có dấu hay
hỏng. Đừng chữa bằng cách bắt lane gõ đẹp hơn.

**⑵ Khối đó cũ 8 tiếng mà không phép kiểm nào báo.** Đức nhìn thấy hai luồng `claude-eol` đã
trả khoá từ lâu.

Nó cũ **có chủ ý**: dòng bảng quyền được cố tình loại khỏi phép kiểm "artifact còn tươi"
(tiền tố `<!--khoa-->`), vì nếu không thì mỗi lượt nhận/trả khoá là mọi lane bị chặn đẩy. Quyết
định đó đúng cho lý do của nó — nhưng hệ quả là **khối "đang làm gì" là khối duy nhất không ai
kiểm độ tươi**.

Tệ hơn: dòng *"(8 giờ trước)"* do đoạn JS trong trang tự tính **lúc mở trang**, nên một ảnh
chụp cũ **đội lốt số liệu thời gian thực**. Đó là kiểu sai tệ nhất — nó không trông giống lỗi.

## 2. Bốn việc

**⑴ Lồng theo VẤN ĐỀ, không theo khoá.** Mỗi mục trong sổ khai thuộc **nhóm vấn đề** nào. Danh
sách nhóm là **cố định và khai trong file cấu hình**, không để mọc tự do — một phân loại mọc tự
do thì sau ba tuần có 19 nhóm cho 19 mục.

**⑵ Câu mô tả lấy TỪ SỔ, không lấy từ chuỗi `--task`.** Lane khai mã việc (`Y-17`, `N-03`,
`B-19`) lúc nhận khoá; bảng tra sang sổ và lấy **câu tiếng Việt có dấu** đã viết sẵn ở đó.

Không ai phải gõ thêm lần thứ hai. Chuỗi `--task` tụt xuống thành thứ AI đọc, không phải thứ
Đức đọc.

Lane không khai mã nào thì bảng **nói thẳng là không tra được** — đừng im lặng in chuỗi thô,
vì im lặng thì không ai sửa thói quen đó.

**⑶ Nói rõ đây là ẢNH CHỤP.** Tuổi tính từ **lúc sinh bảng**, không tính từ lúc mở trang. Ảnh
chụp cũ 8 tiếng phải **trông** cũ 8 tiếng. Cấm dùng đồng hồ hệ thống của người xem để làm một
con số trông như dữ liệu sống.

**⑷ Bỏ bớt.** Tên khoá và giờ nhận chính xác là chữ dành cho AI. Đức cần ba thứ:
**vấn đề gì · đang làm gì · bao lâu rồi.**

## 3. Ràng buộc

- Bảng **suy hoàn toàn từ HEAD**, không phụ thuộc đồng hồ hệ thống. Phụ thuộc đồng hồ là sang
  ngày mới mọi lane bị chặn đẩy dù không dữ liệu nào đổi (`AGENTS.md` mục 6).
- Hai lượt sinh trên cùng HEAD ra **kết quả giống hệt từng byte**.
- Chữ operator thấy: **tiếng Việt CÓ DẤU** (`B15` cưỡng chế). Trong trang cấm: SHA · đường dẫn ·
  phần trăm · lời máy tự khen.
- **Cấm đẻ sổ mới phải nuôi bằng tay.**
- **Đếm số chỗ mỏ neo của bạn khớp. Ra 0 thì DỪNG** — công cụ đo hỏng, không phải "không có gì
  phải sửa".

## 4. Làm SAU hai việc này, đừng chen

Cùng khoá `_code`, và cùng chạm bộ sinh bảng:

1. **`N-03` — ưu tiên cao hơn việc này.** Bảng chưa đọc `BACKLOG.md` ở gốc repo, nên nó đang
   báo **thiếu 14 việc** mà không mục nào được đóng. Con số sai theo hướng làm repo trông nhẹ
   đi là con số nguy hiểm nhất với một người đọc bảng để ra quyết định.
2. **`N-01`** — lệnh kiểm `đóng khi:` chưa có phép ghim nào, xoá nó đi là luật biến mất trong
   im lặng.

## 5. Khoá và đóng phiên

```
node scripts/claim.mjs --take _code --as <tên-phiên> --task "N-03"
```

Cần `_root` (khai danh sách nhóm vấn đề) thì nhận thêm — hiện đang trống, nhưng **kiểm trước
khi nhận**, và nhận đúng thứ mình đụng.

Commit có dòng cuối `Lane: <tên-phiên>` · dùng `git commit -o <đường-dẫn>` · cổng XANH TOÀN BỘ ·
đẩy bằng `safe-push.mjs` · **trả khoá SAU khi đẩy**. Đẩy bị chặn vì lý do ngoài tầm với thì
bàn giao bằng `--release ... --du-biet "<một câu>"`, đừng trả trống.
