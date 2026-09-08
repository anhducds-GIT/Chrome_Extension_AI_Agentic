---
status: Proposed
adr: 0025
date: 2026-09-08
deciders: Đức
---

# ADR-0025 — Khoá mức file: giữ ngắn, trả ngay; chỉ đọc thì không khoá

## Bối cảnh

Đức nêu 2026-09-08, nguyên văn:

> *"AI Assistant chỉ giữ khóa đúng ở file mà AI đó đang sửa, các file khác không giữ, khóa được
> giữ và trả ngay trước và sau khi AI sửa … Nếu chỉ đọc ko cần giữ khóa. → giảm thời gian giữ
> khóa hàng tiếng nếu tác vụ dài xuống chỉ còn vài phút khi nào cần sửa."*

**Số đo — và tôi đo vì linh cảm ban đầu của tôi NGƯỢC LẠI.** Nhìn bảng *"file bị hai lane chạm
nhiều nhất trong 24h"* thì bốn cái đầu là `HANDOFF.md` (30) · `BACKLOG.md` (29) ·
`.agents/claims.json` (28) · `AGENTS.md` (24) — mà **ba trong bốn cái đó vốn đã miễn khoá**, nên
thoạt trông khoá mịn hơn chẳng gỡ được gì.

Đếm đủ thì ngược lại. Bảy ngày (`--since=2026-09-01`, 895 commit, 456 commit có nhãn `Lane:`):

| Đo | Số |
|---|---|
| Cặp commit **khác lane**, cách nhau **≤ 1 giờ**, **cùng vùng** | **2.628** |
| ├ trong đó **dùng chung ít nhất một FILE** — khoá file không gỡ được | 789 (**30%**) |
| └ trong đó **khác file hoàn toàn** — khoá file GỠ ĐƯỢC | **1.839 (70%)** |
| File / commit: trung vị · p90 · p99 | 2 · 7 · 18 |

**Bảy phần mười lượt chặn hôm nay là chặn oan.** Và chi phí phía bên kia thấp: một lượt sửa
thường chạm 2 file, p90 là 7 — nên `--sua` nhận cả mẻ trong một lệnh là đủ.

Luật *"nhận ngay TRƯỚC lượt ghi đầu tiên, không phải lúc mở phiên"* **đã có** trong `AGENTS.md`
mục 1 từ trước. Không ai theo, và **không gì đo nó** — đúng hình dạng một luật-là-chữ. Bằng chứng
cùng ngày: hai lane giữ khoá gói **27 giờ** liền trong khi cả hai gói đó đang đóng băng.

## Quyết định

**⑴ Mặc định là khoá FILE.** `--sua <đường-dẫn>… --as <phiên>` trước lượt ghi,
`--xong --het --as <phiên>` ngay sau. Khoá vùng vẫn còn, dùng khi thật sự sửa khắp vùng.

**⑵ Chỉ đọc thì không khoá gì.** Không đổi luật — chỉ nói lại cho rõ, và nay có đường thay thế
đủ rẻ để không ai còn cớ nhận cả vùng "cho chắc".

**⑶ Chứa nhau HAI CHIỀU.** Vùng có chủ khác → khoá file bị từ chối (giữ cả vùng là được ghi mọi
file trong đó). Bên trong còn khoá file của người khác → nhận cả vùng bị từ chối. Thiếu một
chiều là hai lane cùng tin mình được ghi, và không lớp nào kêu.

**⑷ Cổng đóng phiên ĐỎ nếu bạn còn treo khoá file.** Mốc là *hết phiên*, **không** phải *đã đẩy*
— và đây là chỗ khác khoá vùng, đừng lẫn. Khoá vùng trả sau khi đẩy vì commit chưa đẩy trong một
vùng vô chủ để lại mục đỏ cho phiên sau. Khoá file **không mang trách nhiệm truy nguồn** — nhãn
`Lane:` mang. Nên nó chỉ cần biến mất khi bạn ngừng gõ.

**⑸ `--soat --as <phiên>` là bắt buộc trước `git commit`.** Nó liệt kê file đã dàn mà bạn không
có quyền ghi. Xem "Hệ quả ⑵".

**⑹ Dấu niêm phong phủ cả khối khoá file, nhưng KHÔNG đổi dấu khi khối rỗng.** Băm thẳng
`{claims, tam}` là làm mọi bảng đang tồn tại báo `DAU_VO` ngay lượt sau — một cải tiến không được
phép làm cổng của người khác đỏ vì chuyện họ không liên quan.

## Hệ quả

**Được.** Thời gian giữ khoá tụt từ *hàng giờ* xuống *vài phút*, và 70% lượt chặn hôm nay biến
mất. Đo lại sau bảy ngày bằng đúng phép đếm ở mục Bối cảnh.

**Mất — hai cái, cái thứ hai nặng hơn:**

**⑴ Nhiều thao tác hơn.** Trung vị 2 file/commit nghĩa là hai lệnh thêm mỗi lượt ghi. `--sua`
nhận cả mẻ và `--xong --het` trả cả mẻ để bù, nhưng nó vẫn là hai dịp để quên. Cổng đóng phiên
bắt được vế quên-trả; **không gì bắt được vế quên-nhận** — chỗ đó vẫn là kỷ luật.

**⑵ KHOÁ KHÔNG GIỮ FILE — GIT GIỮ, và khoá file làm chỗ đó XẤU ĐI.** Hai lane dùng chung MỘT cây
làm việc. `git commit -a` của lane này cuốn file đã dàn của lane kia (`N-40`, nổ thật 07/09:
commit `27a88ce7` chứa 6 file của lane khác); `git commit -o <file>` cuốn sửa đổi của lane kia
trên chính file đó (`N-05`, nổ hai lần trong một buổi 06/09). Trước đây khoá vùng *serial hoá*
hai lane nên hai lỗi này ít có dịp nổ. Khoá file bỏ đúng sự serial hoá ấy — **số người ghi đồng
thời tăng, nên hai lỗi ấy nổ dày hơn.**

Đây là cái giá thật của quyết định này, không phải một ghi chú phòng thân. `--soat` là thứ mua
lại nó, và nó **chỉ là một lệnh, không phải một cổng**: cổng đóng phiên chạy lúc index đã rỗng
nên nó không nhìn thấy gì. Ai bỏ bước soát thì không lớp nào chặn.

## Chỗ dễ làm sai, ghi ra để lượt sau đừng vấp

- **Đừng cho khoá file tự hết hạn.** Ngày 06/09 một khoá bị nhả hộ vì có người đọc dòng *"chưa
  thấy dấu vết trong repo"* thành *"phiên kia đang rảnh"*, và lane kia phải hoàn nguyên việc đã
  xong. Tự hết hạn là tự động hoá đúng vụ đó, lần này không ai kịp thấy. Cổng **nêu tên** khoá
  quá 30 phút của lane khác — nêu để bạn HỎI, không phải để nhả hộ.
- **Đừng nhét khoá file vào khối `claims`.** Hàng ở đó là vùng sở hữu, vĩnh viễn; `session-check`
  có bất biến *"mỗi khoá vùng gốc phải có thư mục khai steward, và ngược lại"* — một đường dẫn
  file nằm đó làm bất biến ấy đỏ. Khoá file ở khối `tam`, và **trả xong thì xoá hàng**.
- **Đừng đọc ⑷ thành "khoá vùng cũng trả trước khi đẩy".** Hai loại khoá, hai mốc.
- **Đừng dùng `Date.parse` trần cho mốc trong bảng.** Mốc là `2026-09-08T11:51`, thiếu chữ `Z`,
  nên nó bị đọc là giờ địa phương và lệch đúng bằng múi giờ. Bản đầu báo một khoá vừa nhận 1 phút
  là *"420 phút — quên trả?"*. Repo đã có `mocMs()` xử đúng; dùng lại nó.

## Trạng thái

Proposed
