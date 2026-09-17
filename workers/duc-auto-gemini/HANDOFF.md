
## 2026-09-17 · `claude-scouter-udine` — gỡ một dòng luật chết ở file AI đọc ĐẦU TIÊN

`AGENTS.md` dặn *"Đọc file này cùng `README.md` và `HANDOFF.md` … **trước khi làm bất cứ việc
gì**"*. Câu ấy chết từ **09/09**: `ADR-0034` chuyển `HANDOFF.md` sang **nạp theo yêu cầu**,
`ADR-0035` gom cửa mở phiên của một gói về `PHIEN.md`. Nó vẫn nằm đó **tám ngày**, ở đúng file
mở phiên đọc trước tiên — một phiên làm theo nó trả thêm **~12.000 token** trước dòng code đầu
tiên. Nay dòng đầu trỏ `PHIEN.md`; câu cũ để lại nguyên văn kèm ngày chết, không xoá.

**Và không gói nào đang đóng băng** — `frozen` là `[]`, Đức mở băng toàn bộ từ **08/09**
(`ADR-0024` ⑴). Tôi vẫn đẩy cho Đức câu *"mở băng hay bỏ?"*, và anh trả lời *"vẫn cứ phải mở
băng để sửa cho chuẩn chỉnh, bởi vì các extension đó tôi vẫn làm việc bình thường."* Câu trả lời
đúng, câu hỏi thì thừa — nó đã được chốt chín ngày trước.

**Một chỗ nữa, chưa sửa con số, mới sửa lời khai (`N-67`):** `AGENTS.md` gọi khối máy sinh ở
`decisions.md` là *"danh sách đầy đủ"*. Đo 17/09: bộ sinh thấy **38** trong khoảng **67** ADR của
gói — **25 cái vô hình** vì chúng không khai `nhom:` ở frontmatter. Hôm nay chưa quyết định nào
mất, vì 14 bảng gõ tay ở cuối `decisions.md` còn phủ đúng 25 số hiệu ấy — nhưng đó là **hai
nguồn cho một sự thật**. Cùng họ `A3`, và đó đúng là chỗ `A3` bỏ sót: nó chỉ làm 20 ADR gốc repo.
