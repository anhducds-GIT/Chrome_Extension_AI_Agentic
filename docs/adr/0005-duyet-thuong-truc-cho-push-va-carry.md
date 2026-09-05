---
status: Accepted
adr: 0005
date: 2026-09-05
deciders: Đức
---

# ADR-0005 — Duyệt thường trực cho push và carry-push; và hai luật báo cáo để Đức không hiểu nhầm là việc đang chạy

## Bối cảnh

`AGENTS.md` mục 2 cho phép AI tự commit và push, nhưng giữ lại **một ngoại lệ**: khi `safe-push`
từ chối vì sắp cuốn theo commit của phiên khác, phải hỏi Đức rồi mới `--carry`. Ngoại lệ đó ra
đời 26/08 sau một lượt push trần cuốn theo hai commit chưa duyệt.

Mô hình làm việc đã đổi hẳn từ khi có [ADR-0004](0004-mot-cua-assistant-re-nhanh-va-giu-bao-cao-song.md):
Đức làm việc qua **một** phiên Assistant, và các lane chưa push gần như luôn là **executor do
chính phiên đó giao**. Ngoại lệ trên vì thế biến thành **thuế cố định**: trong hai ngày 04–05/09
nó chặn **sáu lượt push**, lần nào Đức cũng duyệt, và lần nào cũng mất một vòng hỏi–đáp.

Đức nói thẳng lý do đổi: *"tôi không muốn block bất cứ flow làm việc nào của bạn."*

Đồng thời Đức chỉ ra một chỗ hỏng trong cách phiên điều phối báo cáo: những dòng *"đang chạy
ngầm"* làm Đức tưởng việc vẫn đang tiến, **trong khi thực tế phiên đã dừng và không triển khai
gì** — nên việc nằm im mà không ai biết. Đó là một loại trễ do báo cáo gây ra, không do kỹ thuật.

## Quyết định

**1. Duyệt thường trực cho `safe-push`, kể cả `--carry`.** Phiên điều phối không phải hỏi Đức
từng lượt nữa. Ba điều kiện của `AGENTS.md` mục 2 **vẫn nguyên**: việc đã hoàn tất trọn vẹn ·
cổng đóng phiên XANH TOÀN BỘ · đẩy bằng `safe-push.mjs`, không bao giờ `git push` trần. Mọi lượt
`--carry` phải **kể tên lane bị cuốn theo** trong nhật ký phiên.

Hai ngoại lệ **không** nằm trong duyệt này và vẫn phải hỏi: **force-push, sửa lịch sử, merge
nhánh vào `main`**.

**2. Mỗi lượt trả lời phải kết bằng hàng đợi việc** — còn bao nhiêu việc, đang ở đâu. Đức phải
đọc được độ dài chuỗi việc mà không cần hỏi.

**3. Hết việc thì nói thẳng là hết.** Không để một dòng "đang chạy" đứng lại khi không còn gì
chạy. Nếu phiên dừng mà chưa xong việc, phải nói rõ **nó dừng**, không mô tả như đang tiến.

## Hệ quả

**Được:** hết một vòng hỏi–đáp cho mỗi lượt push. Đo trên hai ngày gần nhất: sáu lượt, mà không
lần nào Đức từ chối — tức cửa đó chặn 100% và lọc 0%. Một cổng không lọc được gì thì nó không
phải cổng, nó là thuế.

**Mất — và đây là cái mất thật, ghi ra để đừng quên:** ngoại lệ `--carry` sinh ra từ một tai nạn
có thật. Bỏ nó đi là **bỏ luôn lớp chắn cuối** trước việc đẩy nhầm commit của người khác lên
remote. Cái còn giữ lại chỉ có hai thứ: `safe-push` vẫn **liệt kê rõ** sắp đẩy gì của ai trước
khi đẩy, và mọi lượt cuốn theo phải được **kể tên trong nhật ký**. Không còn ai chặn nữa — chỉ
còn dấu vết để truy.

Điều kiện làm cho việc bỏ chắn này chấp nhận được là mô hình một cửa: các lane chưa push là
executor do chính phiên điều phối giao, nên nó **biết** mình đang cuốn theo cái gì. **Nếu mô
hình một cửa bị phá** — Đức lại mở nhiều phiên tay cùng lúc — thì tiền đề này mất, và ADR này
phải được xem lại.

**Về hai luật báo cáo:** chúng chống một loại trễ mà không cổng kỹ thuật nào bắt được, vì nó
không nằm trong repo mà nằm trong đầu người đọc. Giá phải trả là mỗi lượt trả lời dài thêm vài
dòng — rẻ hơn nhiều so với một việc nằm im vì Đức tưởng nó đang chạy.

## Trạng thái

Accepted
