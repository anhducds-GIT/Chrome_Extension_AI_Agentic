---
status: Accepted
adr: 0007
decides: [0007, 0009, 0010, 0013, 0016, 0020]
date: 2026-09-06
last_reviewed: 2026-09-09
deciders: Đức
---

# ADR-0007 — Scouter: bộ đồ nghề dựng extension

> **File chủ đề.** Mang quyết định **0007** (06/09, Observer là cửa bằng chứng — đã bị 0009 thay),
> **0009** (06/09, Observer thành Scouter tương tác), **0010** (06/09, dừng ở SEED v0.1), **0013**
> (06/09, ra nhà riêng có khoá riêng), **0016** (07/09, được ghi xuống đĩa) và **0020** (07/09,
> thang phiên bản + ranh giới seed/pilot). Gộp 09/09.

## Bối cảnh

06/09 bắt đầu là "Observer" — một extension chỉ đọc, để **mọi AI** nhìn vào bên trong một trang.
Cùng ngày Đức mở rộng phạm vi: nó thành **Scouter**, tương tác đầy đủ quyền, tự hoàn thiện qua
từng vòng. Nó **không** mang tiền tố `duc-auto-` vì nó không tự động hoá nhà cung cấp nào — chủ ý,
không phải quên.

## Quyết định

### ⑴ Quyền: `<all_urls>` — quyết định có ý thức

Cộng `debugger` · `scripting` · `tabs` · `storage` · nối `127.0.0.1`. Đức chốt **sau khi** được
trình bày phương án hẹp hơn (danh sách trắng theo tab) và **từ chối** nó.

> **Bất biến số một, đọc trước khi thêm bất kỳ chức năng nào:**
> **Scouter nhận một BỘ TỪ VỰNG CỐ ĐỊNH các phép dò. Nó KHÔNG BAO GIỜ nhận biểu thức tự do từ
> bên ngoài.** Thêm chức năng nghĩa là thêm một mục vào từ vựng, **mỗi mục một phép ghim** —
> không bao giờ nghĩa là nới kênh cho linh hoạt hơn. Bản Observer đầu chỉ read-only nhờ **đúng
> một biểu thức gõ cứng** trong `Runtime.evaluate`; mở kênh cho AI truyền biểu thức vào là giết
> read-only trong một dòng code.

### ⑵ Ba tầng, mỗi tầng nhân bản khác nhau

| Tầng | Có mấy bản | Chứa gì |
|---|---|---|
| **Seed** | **đúng một, dùng chung** | năng lực đúng với mọi trang |
| **Adapter** | mỗi URL một cái | selector · thứ tự thao tác · dấu hiệu "xong" · lỗi riêng của trang |
| **Ghi chép** | mỗi lượt một cái | nguyên liệu để sinh ra adapter |

**Không clone seed.** Clone rồi sửa bản clone là bệnh [ADR-0001](0001-ranh-gioi-bo-khung.md) đã
ghi: nhiều bản trôi khác nhau, và lần "đồng bộ ngược" không bao giờ xảy ra. Luật đi kèm: **adapter
nào sửa ra thứ không riêng của trang nào thì thứ đó phải được đưa lên seed.**

**Seed đầy đủ NĂNG LỰC từ đầu, không đầy đủ HIỂU BIẾT VỀ TRANG.** Seed mỏng năng lực thì mỗi
adapter tự chế lại cùng một thứ, mỗi lần một kiểu. Năng lực (xếp hàng việc · dừng khẩn · luật thử
lại · không làm hai lần · quy trách nhiệm · ghi bằng chứng · bảng mã lỗi · cửa Bridge · chế độ
phát triển) vào seed ngay. **Selector thì không bao giờ.**

### ⑶ Một Scouter một URL

Không chạy nhiều cái cùng lúc. Việc này bỏ luôn bài toán tranh tab: Chrome chỉ cho **một debugger
cắm vào một tab tại một thời điểm**.

### ⑷ Vòng tự cải tiến, hình dạng thật

Một extension **không tự ghi đè được code của chính nó** — Chrome không có cửa nào cho việc đó.
Chân chạy nằm ở Bridge:

> Scouter quan sát và ghi chép → **Bridge ghi code mới xuống đĩa** → `chrome.runtime.reload()`
> nạp lại chính nó → vòng tiếp theo.

Nên **seed** đúng nghĩa là bộ nhỏ nhất biết ba việc: **quan sát · báo cáo qua Bridge · tự nạp lại
mình**. AI viết code đứng ở ngoài, và **không nhất thiết là Claude**.

### ⑸ Phạm vi: hết `SEED v0.1` thì DỪNG

Đức chốt 06/09: *"chốt SEED v0.1 đi, làm tới đó thôi."* **23 mục `SEED v1` vẫn đóng** — muốn mở
phải có ADR riêng.

**Thứ tự bắt buộc:** năng lực xếp hạng số một — *bấm và gõ như tay người* — phải được **đo tận
mắt trước mọi thứ khác**. Nếu Chrome vẫn đánh dấu cú bấm đó là "không phải người" thì món đắt nhất
trong danh sách sụp và thứ tự 24 mục còn lại đổi theo. *(Phép đo đã chạy 06/09 và ĐẠT trên Chrome
152: bấm qua `chrome.debugger` cho `isTrusted: true`; `element.click()` thì không.)*

### ⑹ Hai chữ "v1" KHÔNG cùng nghĩa — chỗ dễ ra quyết định sai nhất

| Chữ | Nghĩa |
|---|---|
| `SEED v1` | **23 mục năng lực** còn lại trong bảng kiểm kê — **vẫn đóng** |
| **Scouter v1** | **bản đóng gói phát hành được** của seed đang có |

Đức nói *"hoàn thiện đóng gói v1"* = cột dưới. Đọc nhầm sang cột trên là mở một phạm vi Đức chưa
duyệt, và hai thứ đó khác nhau hàng tuần công.

**Thang phiên bản, mỗi nấc mở bằng một VIỆC THẬT chứ không bằng một danh sách:** v1 đóng khi seed
đủ để người ngoài lấy về dùng được (kéo bởi pilot `hnx.vn`) · v2 khi v1 chạy trọn một job lớn hơn
và cái học được đã vào seed · v3+ mỗi trang mới là một lượt.

**Việc thật đi trước danh sách** — không phải lời văn: 07/09 thứ tự 25 mục được xếp theo *"gói này
là gì"*, rồi phải đảo ngay khi Đức nêu pilot thật; bốn mục được khuyên hoãn hoá ra là bốn mục
pilot bắt buộc phải có.

### ⑺ Nhà riêng, khoá riêng

`workers/duc-scouter/v0.1.0/`, khoá `workers/duc-scouter`. **Cả ba nhóm file đều chuyển**, kể cả
bốn phép dò và hai phép ghim — chuyển nửa vời là giữ nguyên bệnh: gói vẫn phải xin `_code` mỗi lần
sửa một phép dò.

### ⑻ Scouter ĐƯỢC ghi ghi chép xuống đĩa

Đức chốt 07/09: *"Scouter hoàn toàn được ghi chứ. Vì Scouter chính là bản phát triển đầu tiên của
bất kỳ extension nào."* Nó **không phải extension chạy sản xuất** — nó là bộ đồ nghề dựng ra
extension khác, và bắt bộ đồ nghề quan sát mà cấm nó ghi lại thứ nó quan sát được là bỏ đi công
dụng của nó.

Ba giới hạn đi kèm, **suy từ luật sẵn có chứ không đẻ luật mới**: không ghi vào vùng cấm
(`evidence/` · `pilot-*/` · `Batch-*/` chỉ được THÊM bằng một lượt pilot thật) · không bao giờ để
token/mật khẩu/tệp ghép cặp lọt vào repo · **chạy trên trang thật vẫn phải hỏi Đức** — vế này gỡ
chỗ chặn về *ghi*, **không** gỡ chỗ chặn về *chạy ở đâu*.

## Vế đã chết

- **0007 — *"Observer là công cụ read-only"*.** Chết ngay trong ngày: 0009 đổi cả bản chất sang
  tương tác đầy đủ quyền.
- **0010 — điều chặn *"không được ghi xuống đĩa"*.** Chết 07/09 với gói `duc-scouter` (vế ⑻).
  Phạm vi 25 mục `SEED v0.1` của 0010 thì **vẫn sống**.

## Hệ quả

**Được.** Scouter làm được việc thật: nó tương tác, nó học một trang, nó để lại adapter dùng lại
được. Vòng tự cải tiến biến *"AI dò selector"* từ một lượt thủ công thành một cơ chế. Phạm vi hữu
hạn và đếm được: 25 mục, có danh sách, có tiêu chuẩn nghiệm thu — không có chỗ cho câu *"làm nốt
cái này nữa rồi thôi"*, thứ đã làm mọi việc lớn trong repo này phình ra.

**Mất, và đây là cái mất lớn nhất:** bản Observer **không thể gây hại**; Scouter thì có. Nó gắn
vào bất kỳ target nào và đọc được DOM của bất kỳ trang nào đang mở, kể cả trang Đức đang đăng
nhập. Bất biến ⑴ là thứ duy nhất đứng giữa.

**Mất, cụ thể hơn:** 23 mục `SEED v1` gồm những thứ thật sự có giá — checkpoint, tiếp tục lần chạy
dở, chẩn đoán kế hoạch trước khi tốn credit, bền hoá phê duyệt. v0.1 **không có chúng**, và sẽ có
lúc thấy thiếu. Đó là cái giá của việc có một điểm dừng.

**Chưa quyết, và nó sẽ chặn:** chính sách **che dữ liệu** khi ghi nội dung trang xuống đĩa. Treo
từ 0007, chưa gỡ. DOM của một trang đang đăng nhập là dữ liệu riêng tư, mà repo thì cấm để bí mật
lọt vào file.

## Trạng thái

Accepted.
