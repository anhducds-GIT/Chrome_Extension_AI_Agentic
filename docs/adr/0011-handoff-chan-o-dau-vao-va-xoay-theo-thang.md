---
status: Accepted in part — clause ⑵ dead, see block below
superseded_clause: "⑵ xoay theo tháng, bỏ hẳn việc cắt định kỳ" — dead, ADR-0008 governs
adr: 0011
date: 2026-09-06
deciders: Đức
---

# ADR-0011 — `HANDOFF.md`: chặn ở đầu vào, và xoay file theo tháng thay vì cắt định kỳ

> **⚠ MỘT PHẦN CỦA ADR NÀY ĐÃ CHẾT — đọc khối này trước phần Quyết định.**
>
> **Vế ⑵ (*"xoay theo THÁNG, bỏ hẳn việc cắt định kỳ"*) ĐÃ CHẾT.** Đức chốt 2026-09-09:
> `HANDOFF.md` cắt theo **SỐ MỤC**, giữ 20 mục cuối — tức cơ chế của
> [ADR-0008](0008-cat-duoi-handoff-giu-hai-muoi-luot.md), thứ mà vế ⑵ này định bỏ.
> 
> Đo 09/09: cả 60 mục của `HANDOFF.md` gốc đều mang mốc `2026-09`, nên `--rotate` xoay theo
> tháng dời **0 dòng** — cơ chế xoay không chặn được phình TRONG một tháng.
> 
> **Vế ⑴ (trần byte một mục) vẫn sống** và cổng đóng phiên đang cưỡng chế nó.
> **Vế ⑶ và ⑷ vẫn sống.** Lệnh `--rotate` **không bị gỡ** — nó vẫn là đường sang tháng mới.
>
> Rà soát bộ luật 2026-09-09 ([ADR-0026](0026-adr-records-are-editable.md)). Phần còn lại của
> ADR này vẫn có hiệu lực.

## Bối cảnh

[ADR-0008](0008-cat-duoi-handoff-giu-hai-muoi-luot.md) cắt đuôi bốn `HANDOFF.md` ngày 06/09 và
để ngỏ câu *"có tự động hoá việc cắt định kỳ không"*, với ước tính "sáu tuần nữa mới phải cắt
lại".

Đo lại cùng ngày: ước tính đó **sai một bậc**. `HANDOFF.md` gốc tăng trung bình **44 KB mỗi
ngày**; cắt xong còn 67 KB thì khoảng **năm ngày** là về chỗ cũ. Và nó không tăng theo đồng hồ
mà theo **số lượt đóng phiên** — đo được ~8.900 byte mỗi lượt lane đóng.

Rà lại cơ chế trước khi quyết, và số đo chỉ ra bệnh nằm chỗ khác hẳn:

| | Byte | Mục | **Trung bình mỗi mục** |
|---|---|---|---|
| Mục cũ (đã lưu trữ) | 228 KB | 117 | **1.950** |
| Mục mới | 78 KB | 25 | **3.120** |
| Gói ChatGPT | 57 KB | 11 | **5.193** |
| Gói Flow Video | 28 KB | 24 | **1.158** |

**File không phình vì nhiều mục — nó phình vì mỗi mục béo lên 60%.** Và cùng một loại việc, hai
gói chênh **4,5 lần**: không có chuẩn nào cho một mục nhật ký chứa gì.

Trong khi đó luật mục 7 của hiến pháp đã ghi từ lâu một mục cần đúng ba thứ: *làm gì · kết quả
số · còn gì mở*. Thực tế mỗi mục là một bài 3–5 KB kể cả lý do, cách đo, bẫy gặp phải — mà
những thứ đó **đã có nhà riêng**: ADR, sổ nợ, brief, thông điệp commit.

## Quyết định

Đức chốt 06/09, bốn phần:

**⑴ Chặn ở ĐẦU VÀO, không chặn ở đầu ra.** Một mục nhật ký có **trần độ dài**, cưỡng chế bằng
máy ở cổng đóng phiên. Trần khai trong `.repo-structure.json`, không gõ cứng trong script.

**⑵ Xoay file theo THÁNG, bỏ hẳn việc cắt định kỳ.** `HANDOFF.md` chỉ chứa tháng hiện tại. Hết
tháng, nội dung thành file lưu trữ của tháng đó và `HANDOFF.md` bắt đầu lại với một con trỏ.

Điều này **không vi phạm bất biến ⑵ của ADR-0008** (*cắt theo vị trí, không theo ngày*): việc
xoay quyết định ở **lúc ghi**, không phải lúc quét, nên nó không cần các mục xếp theo thứ tự
thời gian — mà đo được là chúng **không** xếp theo thứ tự đó.

**⑶ Codex CLI rà lại và viết ngắn các mục hiện có.** Đây là câu duyệt của Đức cho việc viết lại
chữ cũ của phiên khác — việc mà luật mục 1 không miễn. **Bản dài phải còn đọc được ở file lưu
trữ**; viết ngắn là **đổi chỗ chi tiết, không phải xoá**.

**⑷ Mục tiêu của `HANDOFF.md` là AI nắm trạng thái gần nhất.** Lịch sử xa là việc của file lưu
trữ.

## Hệ quả

**Được.** Nếu mỗi mục về lại ~1.200 byte như gói Flow Video **đang làm được**, đà tăng giảm
khoảng **bốn lần**, và câu hỏi "cắt tự động hay không" lùi từ *năm ngày nữa* sang *nhiều tháng
nữa*. Xoay theo tháng thì không còn "lượt cắt" nào để quên.

**Mất — nói thẳng, và đây là rủi ro thật.** Các bản báo cáo dài trong ngày 06/09 **đã cho thông
tin thật**: chính chúng giúp bắt được nhiều chỗ báo sai. Ép ngắn mà phần lý do **bốc hơi** thay
vì chuyển sang ADR/brief/sổ nợ thì đây là lỗ, không phải lãi — đúng luật ở
`BRIEF-TOKEN-PROTOCOL-01` mục 3. Trần độ dài chỉ đúng **kèm điều kiện** phần lý do có nhà.

**Một cỗ máy đọc GỘP cả file, đừng làm hỏng nó.** Bộ đếm sự cố trên bảng đọc mọi mục, không chỉ
mục cuối. Ngày 06/09 lượt cắt làm bốn dòng sự cố biến mất, số đếm về 0, và cổng đỏ với **mọi**
lane. Đã vá bằng cách cho bộ đếm đi theo con trỏ lưu trữ. **Mọi lược đồ lưu trữ sau này phải
giữ chuỗi con trỏ đi được** — "0 sự cố" đọc y hệt "sạch sẽ" trong khi thật ra là "mù".

**Chưa quyết:** con số trần cụ thể. Nó phải đo rồi chốt, không đoán — xem protocol.

## Trạng thái

Superseded in part by ADR-0012 — phần ⑵ (xoay file theo tháng) bị thay bằng lọc theo nội dung. Ba phần còn lại giữ nguyên.
