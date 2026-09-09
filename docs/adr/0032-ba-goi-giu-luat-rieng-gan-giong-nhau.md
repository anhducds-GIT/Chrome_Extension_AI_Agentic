---
status: Accepted
adr: 0032
decides: [0032]
date: 2026-09-09
deciders: Đức (uỷ quyền nén và tái tổ chức kiến trúc luật) · claude-nen-luat (đo và chốt)
nhom: pham-vi-va-ky-luat
---

# ADR-0032 — Ba gói `duc-auto-*` giữ luật vàng RIÊNG, cố ý gần giống nhau

## Bối cảnh

Ba gói `duc-auto-gemini`, `duc-auto-chatgpt`, `duc-auto-gg-flow-video` là fork của nhau. Mục *Luật
vàng* của hai gói lớn giống nhau tới mức bộ biên dịch luật nêu **ba cặp** ở phép ③ `LUAT_TRUNG`.

Câu trả lời cho ba cặp đó đã được viết **hai lần, mỗi lần ~1.100 ký tự, ngay trong chính hai file
mà mọi phiên đụng gói phải nạp**. Tức là lời giải thích *vì sao hai file giống nhau* tự nó cũng bị
chép đôi — và nó là **chuyện kể**, đúng loại [ADR-0031](0031-tran-do-bang-ky-tu.md) ⑷ nói phải
chuyển xuống ADR.

## Quyết định

### ⑴ Giữ ba bản riêng. KHÔNG gộp vào một file dùng chung.

Một phiên làm ở một gói đọc `AGENTS.md` gốc repo rồi đọc `AGENTS.md` của **đúng gói đó** —
**không bao giờ đọc file của gói kia**. Gộp phần chung vào một file thứ ba là bắt **mọi** phiên nạp
thêm một file nữa, để tiết kiệm cho một phiên **không tồn tại** (phiên đọc cả hai gói).

Và lý do nặng hơn: **hai bản PHẢI được phép lệch nhau.** Luật về `run.trial` và về harness khác
nhau giữa hai nhánh **một cách đúng đắn**, vì hai sản phẩm khác nhau. Một file chung sẽ ép chúng
bằng nhau, tức là ép một trong hai nói sai.

### ⑵ Ngoại lệ: luật nào đúng cho MỌI extension thì về `workers/_shared/AGENTS.md`

Ba luật đã chuyển: *không làm yếu một lớp bảo vệ đã có* · *sửa `.js` thì nhắc Đức reload* ·
*preview pane cấm, harness Chrome thật thì được*. Tiêu chí để một luật được chuyển: **nó không thể
lệch giữa hai sản phẩm.** Nếu có thể lệch, nó ở lại gói.

### ⑶ Phép ③ kêu ở đây là nó ĐANG CHẠY ĐÚNG — cái LỆCH mới là bệnh

Ngày 09/09 phép ③ lôi ra được, ở nhánh Gemini:

- **Luật 8 đã chết từ 24/08 mà vẫn nằm trong bản hiệu lực 16 ngày** — đúng cái luật mà nhánh
  ChatGPT đã sửa từ 24/08.
- **Luật 7 thiếu hẳn một method tiêu tiền.** Bốn quyết định của Đức (25/08) về `run.trial` chưa
  bao giờ đi vào luật vàng của gói, nên ai chỉ đọc file đó sẽ tin Bridge không chạy được gì.
- **Danh sách thư mục bằng chứng gõ tay bảo vệ nhầm chỗ:** nó liệt kê `pilot-03/`, `pilot-05/`,
  `pilot-06/`, `pilot-06B/` — **ba trong bốn cái đó không tồn tại trong gói Gemini**, chúng là của
  nhánh ChatGPT, chép sang lúc fork. Cùng lúc `pilot-04/`, `Batch-SX-01/`, `Pilot-G2-01/`,
  `Pilot-REF-01/` có thật thì không được nêu. **Nay viết theo hình dạng tên** (`pilot-*/` ·
  `Pilot-*/` · `Batch-*/` · `evidence-*/`) — hình dạng thì không mục được.

### ⑷ Câu trả lời cho phép ③ ghi Ở ĐÂY, không ghi lại trong từng gói

`docs/protocols/RULE-COMPILER.md` mục 4 đòi mỗi nhóm ở phép ③ phải chọn **gộp · trỏ · hoặc nói vì
sao giữ cả hai**. Vế thứ ba nay được trả lời **một lần** bằng chính ADR này; mỗi gói giữ **một dòng
cộng một liên kết**, không chép lại lý lẽ.

## Hệ quả

**Được.** Bỏ ~2.200 ký tự chuyện kể khỏi hai file mà mọi phiên đụng gói phải nạp, mà không mất một
lời giải thích nào — nó chỉ chuyển sang chỗ nạp-theo-yêu-cầu.

**Mất, và biết trước.** Ai đọc `AGENTS.md` của một gói và thấy nó giống gói kia sẽ phải **mở thêm
một file** mới biết đó là cố ý. Đổi lại: người đó là người *đang định gộp hai file*, tức là đúng
người nên đọc kỹ trước khi làm.

**Chỗ chưa với tới:** ⑵ nói tiêu chí chuyển sang `_shared`, nhưng **không có phép kiểm máy nào**
canh việc một luật chung bị chép ngược trở lại vào gói. Phép ③ sẽ kêu nếu điều đó xảy ra — đó là
lớp canh duy nhất, và nó chỉ ở mức vàng.

## Trạng thái

Accepted.
