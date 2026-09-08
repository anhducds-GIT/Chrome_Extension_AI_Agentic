---
status: Accepted
adr: 0008
decides: [0008, 0011, 0012]
date: 2026-09-06
last_reviewed: 2026-09-09
deciders: Đức
---

# ADR-0008 — Nhật ký phiên: giữ bao nhiêu, cắt thế nào

> **File chủ đề.** Mang quyết định **0008** (06/09, giữ 20 mục cuối), **0011** (06/09, trần độ
> dài mỗi mục + xoay theo tháng) và **0012** (06/09, lọc theo nội dung). Gộp 09/09.

## Bối cảnh

Luật bắt mọi phiên đọc `HANDOFF.md` của gói mình sắp đụng. Đo 06/09: bốn file đó cộng lại
**276.862 token**; một phiên điều phối nạp khoảng **137.800 token** chỉ để mở phiên. `HANDOFF.md`
gốc ra đời 02/09 và sau bốn ngày đã **93.837 token**, tăng ~23.000 token mỗi ngày.

Ba quyết định ra trong cùng một ngày rồi **đá nhau suốt ba ngày**: một cái cắt theo số mục, một
cái nói *"bỏ hẳn việc cắt định kỳ, xoay theo tháng"*, một cái nói *"tuổi KHÔNG phải tiêu chí"*.
Đức chốt lại 09/09.

## Quyết định

### ⑴ Mỗi `HANDOFF.md` giữ 20 MỤC CUỐI — máy cắt, đây là luật đang chạy

**Đức chốt lại 09/09.** Phần cũ hơn dời sang file lưu trữ cạnh nó, để lại một con trỏ nói lịch sử
nằm đâu. Lệnh: `node scripts/handoff.mjs --cat <file> --giu 20`.

Đây là lần đầu repo cho phép **viết lại chữ cũ của phiên khác**. Miễn trừ khoá của `HANDOFF.md`
chỉ áp khi **chỉ thêm dòng ở cuối**; dời dòng cũ không nằm trong đó, nên nó cần đúng một câu duyệt
của Đức, và câu đó là quyết định này.

**Bốn bất biến — chúng là ĐIỀU KIỆN để được phép làm, không phải lời khuyên:**

1. **Không mất một byte.** Ghép file lưu trữ với phần còn lại phải dựng lại bản gốc **giống hệt
   từng byte**. Đây là bất biến duy nhất khiến việc này khác với xoá.
2. **Cắt theo VỊ TRÍ trong file, không theo NGÀY.** Đo được: các mục Log **không xếp theo thứ tự
   thời gian** (`22/08` → `24/08` → `22/08` lại). *"20 lượt gần nhất theo ngày"* là câu máy không
   xác định được; *"20 mục cuối theo thứ tự trong file"* thì xác định được.
3. **Con trỏ ở lại, đặt chỗ đọc được.** Phiên sau phải biết lịch sử ở đâu mà không phải hỏi ai.
4. **File lưu trữ phải khai vào Bản đồ file.** Không khai = không tồn tại.

**Máy canh:** `handoff.tran_so_muc` trong `.repo-structure.json` là **chặn**, đặt cao hơn **đích**
20 một chút — chặn đúng ở 20 nghĩa là lane thứ 21 vừa thêm một dòng đã bị đỏ và phải chạy một lượt
cắt. Cổng đóng phiên báo `HANDOFF_QUA_DAY` khi vượt.

### ⑵ Trần độ dài MỘT MỤC — chặn ở đầu vào

Một mục nhật ký có trần byte, khai ở `handoff.tran_byte_moi_muc`. Cổng chặn **đúng mục bạn vừa
thêm**, không chặn mục cũ — chặn cả file là mọi lane đỏ ngay lập tức vì chữ của người khác.

Vượt trần thì hỏi *"phần thừa thuộc về ADR, sổ nợ, hay brief?"* rồi chuyển sang đó kèm con trỏ —
**đừng cắt chữ cho vừa**.

**Đây là vế chặn file phình mà KHÔNG cần ai phán đoán**, và đó là lý do nó phải sống cạnh vế ⑶.

### ⑶ Lọc theo NỘI DUNG — tiêu chí cho lượt sàng lọc có người/AI xem

Máy cắt theo số; **người quyết cái gì đáng mang theo**. Hai việc khác nhau, không mâu thuẫn.

- **Ở lại:** một mục còn nói về thứ **chưa đóng** — việc còn mở, quyết định còn hiệu lực, trạng
  thái chưa bị mục sau thay.
- **Đi:** mọi thứ mục đó nhắc tới **đã đóng trọn**.
- **Lượt sàng lọc phải CÓ NGƯỜI/AI XEM.** Đo 06/09: bộ đếm của bảng tính một mục là *đã đóng* chỉ
  vì tiêu đề mở đầu bằng chữ "Đóng". Máy nhận diện sai được, và archive nhầm một mục còn mở là mất
  đúng thứ lược đồ này tồn tại để giữ. Máy **gợi ý**; người **quyết**.
- **Không chắc thì GIỮ.** Giữ thừa tốn token; dời nhầm làm phiên sau không tìm ra thứ họ cần. Hai
  cái giá đó không ngang nhau.

**Trước khi phần cũ bị dời đi, việc còn mở trong đó đáng được nhắc lại một dòng ở mục mới.** Đó là
cách hai vế ⑴ và ⑶ sống chung: máy cắt đều đặn, người mang theo cái còn dở.

### ⑷ Xoay theo tháng — công cụ còn, nhưng KHÔNG phải cơ chế chính

`--rotate <file>` vẫn là đường sang tháng mới, và mốc tháng khai bằng một dòng trong file (không
suy từ ngày trong tiêu đề — xem bất biến ⑵).

## Vế đã chết

- **0011 ⑵ — *"xoay theo THÁNG, bỏ hẳn việc cắt định kỳ"*.** Chết 09/09. Đo cùng ngày: cả 60 mục
  của `HANDOFF.md` gốc đều mang mốc `2026-09`, nên `--rotate` dời **0 dòng** rồi in một câu nghe
  như thành công. Xoay theo tháng **không chặn được phình trong một tháng**.
- **0012 — câu *"Tuổi KHÔNG phải tiêu chí"*.** Chết 09/09: máy cắt theo 20 mục cuối, mà cắt theo
  vị trí thì trên thực tế là cắt theo tuổi. Phần còn sống của 0012 là **tiêu chí ⑶** ở trên.

## Hệ quả

**Được:** ước tính **38.000–89.000 token mỗi phiên**, tức bỏ khoảng 86% khối lượng bốn file đó —
gấp 13–31 lần tổng mọi cách tiết kiệm khác cộng lại. Đo thật 09/09 ở `HANDOFF.md` gốc: **2.033 →
589 dòng**. Và nó chặn được **đà tăng**, không chỉ hạ mức hiện tại.

**Mất:** lịch sử xa hơn 20 mục không còn nằm trên đường đọc mặc định; ai cần phải mở thêm một
file. Chấp nhận được **chỉ nhờ bất biến ⑴** — chữ vẫn còn nguyên, chỉ đổi chỗ.

**Chỗ dễ hỏng, đo được, ghi ra để đừng làm ẩu — bốn file có HAI hình dạng khác nhau:** hai file
dùng mục `##` mỗi lượt; hai file kia (**to nhất**, 252KB và 186KB) dùng **gạch đầu dòng trong một
mục `## Log`** và gần như không có mục `##` nào để cắt theo. Một phép cắt chỉ biết mục `##` sẽ
chạy qua chúng, **báo thành công, và không cắt được gì** — đúng loại xanh giả repo này đã gặp
nhiều lần.

**Chưa quyết:** nhịp sàng lọc theo nội dung. Không gắn với lịch — gắn với một dấu hiệu đo được.

## Trạng thái

Accepted.
