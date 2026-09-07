---
status: Accepted
adr: 0018
date: 2026-09-07
deciders: Đức
amends: 0017
---

# ADR-0018 — Đính chính ADR-0017: chỉ-thêm không cấp được quyền độc quyền; dùng ref git làm nguyên thuỷ nguyên tử

## Bối cảnh

[ADR-0017](0017-hai-vai-assistant-thay-the-mot-cua.md) mục ⑶ chốt rằng nguồn điều phối đổi sang
**sổ chỉ thêm**, và biện luận bằng câu:

> *"Hai lượt thêm không bao giờ ghi đè nhau."*

**Câu đó đúng về mất-cập-nhật và SAI về cấp quyền độc quyền.** Phiên Codex chỉ ra ca này, và nó
đúng:

1. A và B cùng đọc thấy vùng trống.
2. A thêm sự kiện *"A nhận quyền"*.
3. B thêm sự kiện *"B nhận quyền"*.
4. **Cả hai đều nhận thông báo thành công.**

Không dòng nào bị ghi đè. Nhưng hai bên cùng tưởng mình có quyền. Đọc gộp rồi chọn người cuối
**không thu hồi được thông báo thành công đã gửi** — và bên kia đã bắt đầu ghi.

Nói gọn: **chỉ-thêm chữa MẤT CẬP NHẬT, không chữa CUỘC ĐUA trên một ràng buộc độc quyền.** Sổ sự
kiện giữ lịch sử; nó không thay cơ chế phân xử. ADR-0017 gộp hai chuyện đó làm một.

**ADR-0017 cũng gộp hai nguyên nhân khác nhau ở phần bằng chứng.** Nó dẫn vụ lệch khoá `_code`
giữa đĩa và `origin/main` làm bằng chứng cho rủi ro ghi-đè-đồng-thời. Đo lại: nguyên nhân là **lượt
trả quyền chưa được công bố**, không phải hai lượt ghi chen nhau. Vụ đó vẫn là bằng chứng thật cho
*"bản địa phương và bản chung nói khác nhau"* — vế quan trọng với thiết kế hai checkout — nhưng
**nó không chứng minh có ghi đè đồng thời.**

Và `claim.mjs` hiện đọc–sửa–ghi **rồi đọc lại để kiểm**. Lượt đọc lại đó **không bắt được mọi cuộc
đua**: A có thể đọc lại thành công **trước khi** B ghi.

ADR đã `Accepted` là bất biến và phép kiểm B12 cưỡng chế điều đó, nên đính chính đi bằng ADR này
chứ không sửa vào ADR-0017.

## Quyết định

**Ba vế. Vế ⑵ là vế trả lời câu Codex đặt ra.**

### ⑴ Đính chính ADR-0017 mục ⑶

Sổ chỉ thêm **được giữ**, nhưng vai của nó hẹp lại và khai đúng:

- **Sổ chỉ thêm giữ LỊCH SỬ quyền** — ai nhận, ai trả, ai thu hồi, lúc nào, vì sao. Nó xoá bỏ
  đọc–sửa–ghi, nên nó **thật sự** chữa được vụ ghi đè im lặng 02/09.
- **Sổ chỉ thêm KHÔNG cấp quyền.** Cấp quyền cần một cơ chế phân xử riêng, ở vế ⑵.
- Câu *"thêm cuối thì không bao giờ đụng nhau"* trong ADR-0017 chỉ đúng cho **nội dung**, không
  đúng cho **ràng buộc độc quyền**. Đọc nó theo nghĩa thứ hai là đọc sai.

### ⑵ Nguyên thuỷ nguyên tử là **một ref git**, không phải một cơ chế mới

Yêu cầu của Codex có ba vế: **kiểm điều kiện và cấp quyền trong cùng một thao tác nguyên tử · có
thứ tự xác định · chỉ báo thành công sau khi lưu bền vững.**

Git đã cho đủ cả ba, và ta đang dùng git:

**`git push` tới một ref là một phép so-và-đổi (compare-and-swap).** Push không fast-forward thì
**bị từ chối**. Nên:

- **Nhận quyền** = thêm một sự kiện vào sổ, rồi **đẩy**. Đẩy được → có quyền. Bị từ chối → **mất
  cuộc đua**, đọc lại rồi thử lại. Hai bên cùng xin thì **remote chọn đúng một người**, và người
  kia biết ngay.
- **Thứ tự xác định** = lịch sử của ref.
- **Chỉ báo thành công sau khi lưu bền vững** = báo thành công **sau khi remote nhận**, không phải
  sau khi ghi xuống đĩa.

**Không có runtime mới, không có tiến trình điều phối mới.** Ta đổi *chỗ* quyết định từ "đĩa của
tôi" sang "remote", và remote vốn đã là chỗ duy nhất cả hai checkout đều thấy.

### ⑶ Cửa tích hợp đi qua **cùng một chỗ tuần tự hoá**

Codex chỉ đúng lỗ thứ hai: kiểm *"thế hệ còn hợp lệ"* rồi tích hợp **sau đó** thì quyền có thể bị
thu hồi **giữa hai bước**.

Vá bằng cách bỏ hai bước: **lượt đổi quyền và lượt cập nhật trạng thái chung đều là một lượt đẩy
tới cùng một chỗ.** Git tuần tự hoá chúng — chúng **không chen nhau được**. Kết quả mang thế hệ cũ
thì lượt đẩy của nó **không fast-forward** so với lượt thu hồi đã vào trước, nên bị từ chối tại
cửa, không phải bị phát hiện sau khi đã ghi.

Đây là chỗ **duy nhất** được NGĂN. Mọi chỗ khác vẫn là phát hiện, đúng như ADR-0017.

## Hệ quả

**Được.** Ba ca đua mà Codex đòi phải vượt đều được chính git phân xử, không phải bằng mã ta viết:
hai bên xin đồng thời · phiên cũ quay lại · thu hồi xảy ra đúng lúc tích hợp.

**Mất — và đây là cái giá thật, nói rõ:**

**Nhận quyền thành một lượt đi mạng.** Hôm nay `--take` là thao tác cục bộ, tức thời. Sau quyết
định này nó phụ thuộc mạng — và **mạng đã hỏng một lần trong chính ngày 07/09**: lượt đẩy đầu của
lane tinh gọn trượt vì `github.com:443` không nối được, lượt hai mới xong.

Nên câu thứ tư trong bốn câu của Codey — *"không đọc được nguồn đó thì hành động nào phải dừng"* —
có đáp án thẳng: **không tới được remote thì KHÔNG nhận được quyền, nên phải dừng.** Fail-closed,
và nó đúng: một quyền cấp bằng phỏng đoán tệ hơn không có quyền.

Đổi lại, quyền chỉ được nhận vài lần mỗi phiên, còn **đúng đắn thì đáng hơn tức thời** ở chỗ này.

**Chỗ dễ hiểu nhầm:** ADR này **không** nói mọi thao tác phải đi mạng. Đọc quyền vẫn đọc bản địa
phương được — nhưng bản địa phương là **bản nhớ tạm**, không phải nguồn thẩm quyền. Ghi thì phải
qua remote.

## Nghiệm thu

Ba ca, và cả ba phải chạy được trước khi hồ sơ vai được chuyển sang mô hình mới:

1. **Hai bên xin đồng thời** → đúng một bên nhận được quyền, bên kia nhận **từ chối** chứ không
   nhận thành công.
2. **Phiên cũ quay lại ghi bằng quyền cũ** → bị từ chối **tại cửa tích hợp**, kèm câu nói rõ quyền
   đã bị thu hồi lúc nào và vì sao.
3. **Thu hồi xảy ra đúng lúc tích hợp** → không lọt kết quả mang quyền cũ.

**Xây ở `Ark_Repo_Harness` trước**, đúng [ADR-0006](0006-goi-assistant-phat-hanh-tu-bo-khung.md):
bộ khung là nơi phát hành, repo này là người tiêu thụ. Một lát cắt dọc gồm **nguồn quyền có thẩm
quyền + cấp quyền nguyên tử + cửa tích hợp**, rồi mới chuyển hồ sơ vai và các con trỏ.

**Nháp hai hồ sơ vai đi song song được, nhưng KHÔNG chuyển quy trình đang dùng trước khi lõi mới
vượt ba ca trên.** Chuyển trước là để hai mô hình cùng sống — đúng thứ ADR-0017 cấm.

## Chỗ dễ làm sai

- **Đừng dùng lượt "đọc lại sau khi ghi" làm bằng chứng an toàn.** Nó bắt được sửa tay, không bắt
  được cuộc đua.
- **Đừng gọi sổ chỉ thêm là cơ chế cấp quyền.** Nó là lịch sử. Xem vế ⑴.
- **Đừng tách lượt đổi quyền khỏi lượt cập nhật trạng thái chung.** Tách ra là mở lại đúng lỗ ⑶.
- **Đừng thay `git push` bằng một khoá file cục bộ cho nhanh.** Khoá cục bộ chạy được vì hai
  checkout đang ở cùng một máy — nhưng nó không cho lịch sử, và nó im lặng sai ngay khi có
  checkout thứ ba ở máy khác.

## Trạng thái

Accepted
