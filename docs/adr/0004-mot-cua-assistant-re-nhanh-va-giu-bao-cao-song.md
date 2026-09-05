---
status: Accepted
adr: 0004
date: 2026-09-05
deciders: Đức
---

# ADR-0004 — Đức làm việc qua MỘT phiên Assistant; phiên đó rẽ nhánh, điều phối, và giữ khu báo cáo sống trên bảng

## Bối cảnh

Trước quyết định này Đức tự mở nhiều cửa sổ chat, mỗi cửa sổ một việc. Đo trên lịch sử thật
ngày 04–05/09, **18 lane chạm repo**:

| Nhóm | Số lane | Số commit |
|---|---|---|
| Executor do phiên điều phối tự tạo | 9 | 46 |
| Phiên Đức mở tay | 6 | 25 |
| Phiên điều phối | 1 | 44 |

Khác biệt không nằm ở số commit, mà ở **số lần Đức bị hỏi**:

- **9 executor do phiên điều phối tạo: hỏi Đức 0 câu.** Chúng nhận đề bài đủ ràng buộc, tự nhận
  khoá, tự đóng phiên, tự trả khoá.
- **Các phiên Đức mở tay: chặn nhau 3 lần trong một ngày**, lần nào cũng phải Đức vào gỡ. Lần
  cuối một phiên giữ **cả ba khoá gốc** và không nhận tin nhắn từ phiên khác, nên phiên điều
  phối **không tới được nó** — Đức phải tự dừng phiên đó.

Đức nói đúng chỗ đau: *"các cửa sổ lại hỏi tôi về quyền rồi khoá."* Bảng quyền chặn đúng, nhưng
nó **chỉ chặn được, không quyết hộ ai nhường ai** — nên nhiều cửa sổ song song làm mọi người
cùng chậm, và người phải phân xử là Đức.

Đồng thời Đức muốn nhìn được **đang có mấy việc chạy, việc nào ở đâu** mà không phải hỏi.

## Quyết định

**Đức làm việc qua một phiên Assistant duy nhất cho mỗi repo.** Phiên đó tự rẽ nhánh thành nhiều
executor, điều phối chúng, và **giữ khu báo cáo sống trên bảng cho Đức đọc**.

Nhiệm vụ giữ khu báo cáo là **của Assistant, không phải của bảng**: bảng vẫn suy hoàn toàn từ
HEAD, không phụ thuộc giờ đồng hồ, không thăm dò gì. Nó tươi vì **mỗi lượt Assistant báo cáo là
một lượt sinh lại bảng** — không phải vì nó tự chạy.

Kèm theo, **đảo lại một quyết định của chính Đức ngày 04/09**: tên lane quay lại bảng. Hôm đó
Đức bỏ tên chủ khoá vì nó đổi liên tục làm bảng mục. Lý do đó **đã được giải quyết** bằng cơ chế
lọc dòng khoá khỏi phép so độ tươi, nên nay hiện tên lane được mà bảng không mục. Ghi ra đây để
sau này không ai tưởng nó lọt vào do sơ ý.

`HARD ROLE FIREWALL` **không đổi**: Assistant rẽ nhánh và điều phối, **không tự code**.

## Hệ quả

**Được:** Đức có đúng một chỗ để hỏi, và không còn bị hỏi về quyền hay khoá. Việc phân xử ai
nhường ai chuyển từ Đức sang Assistant — mà Assistant có bản đồ việc và bảng quyền trong tay,
còn Đức thì không.

**Mất — ba thứ, nói thẳng:**

1. **Một điểm hỏng duy nhất.** Phiên Assistant chết là mất control plane. Cái cứu là: **trạng
   thái sống trong file repo, không sống trong chat** — bảng quyền, `HANDOFF.md`, `IDEAS.md`,
   brief. Điều đó đã đúng từ trước, và ADR này biến nó từ thói quen tốt thành điều kiện sống còn.
2. **Assistant thành nút cổ chai thông lượng.** Mọi việc xếp hàng sau lượt trả lời của một
   phiên. Nhiều cửa sổ chậm vì giẫm chân; một cửa sổ chậm vì tuần tự. Đổi một loại chậm lấy một
   loại chậm — nhưng loại sau **không lấy attention của Đức**, và đó là thứ đang khan hiếm.
3. **Không nhắn được cho executor đang chạy.** Build hiện tại chỉ có một chiều: giao lúc đầu,
   nghe lúc cuối. Đã trả giá một lần ngày 04/09 — Đức bổ sung phạm vi giữa chừng mà không chuyển
   vào được, phải chờ xong rồi giao vòng hai.

**Khu báo cáo sống KHÔNG nhìn thấy hai thứ, biết trước để đừng tin nhầm:**

- **Luồng ở repo khác.** Bảng của repo này không thấy executor đang chạy ở repo bộ khung. Đây
  đúng là `IDEAS.md` mục `Y-13` phần 2, và nay nó không còn là ý tưởng — nó là chỗ thiếu thật
  của thứ vừa được đặt hàng.
- **Luồng chưa nhận khoá.** Executor vừa giao mà chưa kịp nhận khoá thì chưa có dấu vết nào
  trong repo, nên khu đó thấy nó chậm vài phút.

**Phải làm khác đi từ nay:**

- Assistant **sinh lại bảng ở mỗi lượt báo cáo có sự thật đổi**. Nội dung không đổi thì bộ sinh
  không ghi gì, nên không đẻ ra commit rỗng.
- Đức mở phiên tay ở cùng một repo thì **báo cho Assistant biết**, hoặc chấp nhận rằng phiên đó
  nằm ngoài điều phối và có thể chặn. Không cấm — nhưng ADR này nói rõ nó phá mô hình.

## Trạng thái

Accepted
