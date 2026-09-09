---
status: Accepted
adr: 0004
decides: [0004, 0017]
date: 2026-09-05
last_reviewed: 2026-09-09
deciders: Đức
---

# ADR-0004 — Mấy phiên Assistant, và chia việc giữa chúng thế nào

> **File chủ đề.** Mang quyết định **0004** (05/09, một cửa Assistant — đã chết) và **0017**
> (07/09, hai vai song song, thứ thay nó). Gộp 09/09.

## Bối cảnh

05/09 Đức làm việc qua **một** phiên Assistant cho mỗi repo. Hai ngày chạy mô hình đó trả ba cái
giá đo được: một điểm chết duy nhất · một nút cổ chai thông lượng · và **không nhắn được cho
executor đang chạy** (trả giá 04/09: Đức bổ sung phạm vi giữa chừng mà không chuyển vào được,
phải chờ xong rồi giao vòng hai). Ngày 07/09 thay mô hình.

## Quyết định

### ⑴ Hai vai chạy song song, mỗi vai tự thực thi trong phạm vi của mình

**Thay hẳn mô hình một cửa của quyết định 0004.**

Vai là của **PHIÊN**, không của hãng; một phiên đóng đúng một vai cho tới khi đóng phiên. Chia
theo **trách nhiệm trước, đường dẫn sau** — vẽ ranh giới bằng thư mục (`docs/` cho bên này,
`workers/` cho bên kia) là sai, vì tài liệu yêu cầu và kiến trúc sản phẩm phải thuộc về bên sở
hữu sản phẩm. Không thì bên kia lại thành **cửa bắt buộc cho mọi lượt sửa tài liệu** — đúng cái
cửa quyết định này sinh ra để phá.

| | Assistant **HỆ THỐNG** | Assistant **SẢN PHẨM** |
|---|---|---|
| Chịu trách nhiệm | bộ khung, công cụ, môi trường, năng lực vận hành của cả đội | kế hoạch, phát triển, debug, nghiệm thu sản phẩm |
| Sở hữu | cổng kiểm, bộ sinh, bảng, luật chung, hạ tầng đa phiên | mã sản phẩm, **và tài liệu yêu cầu + kiến trúc của sản phẩm** |
| Viết luật chung | **có** | đề xuất qua ADR |

`HARD ROLE FIREWALL` không đổi: vai điều phối rẽ nhánh và điều phối, **không tự code**.

> **ĐÃ CHỐT 09/09 — cặp này đứng ở repo Extension.**
> Từ 08/09 `AGENTS.md` mục 6 chạy một cặp **khác** (**Giữ lõi / Phát & thu**) mà không quyết định
> nào ghi lại. Đức chốt 09/09: giữ **Hệ thống / Sản phẩm**, kèm ba điều bảng trên chưa có — **cả
> hai vai đều code được**, **Sản phẩm giữ mã xuyên suốt chạy và debug + kiến trúc của chính nó**,
> và *"Phát & thu"* thuộc repo bộ khung chứ không thuộc đây — [ADR-0029](0029-hai-vai-o-repo-extension.md).

### ⑵ Mỗi vai một checkout riêng

Checkout chung thử được giao tiếp nhưng **không chứng minh được thực thi độc lập** — mà độc lập
mới là điều kiến trúc này tồn tại để đạt. Thử trên checkout chung là chứng minh sai câu hỏi.

**Checkout riêng KHÔNG phải sandbox.** Nó giảm nhiễu chéo do vô tình; nó **không** ngăn một vai
truy cập checkout của vai kia, và **không** tự chữa cổng chung đỏ sau tích hợp.

### ⑶ và ⑷ — nguồn điều phối và cửa tích hợp

Hai vế này của quyết định 0017 đã được quyết định **0018** và **0019** chỉnh lại, và nay nằm ở
[ADR-0005](0005-lam-viec-song-song.md) — file chủ đề về làm việc song song. **Đọc file đó để biết
cái gì đang chạy thật.** Tóm tắt để không phải mở:

- Sổ chỉ thêm giữ **lịch sử** quyền, **không cấp** quyền. Câu *"thêm cuối thì không bao giờ đụng
  nhau"* đúng với **nội dung**, không đúng với **ràng buộc độc quyền**.
- Nguyên thuỷ nguyên tử là **một ref git** (`git push` là compare-and-swap), không phải cơ chế mới.
- Cửa tích hợp là **chỗ duy nhất được NGĂN**; mọi chỗ khác chỉ phát hiện. Lý do: kiểm sau khi ghi
  không cứu được dữ liệu đã bị ghi đè.
- **Tài nguyên dùng chung ngoài git** — Chrome profile, Bridge, debugger, thư mục đầu ra — **không**
  được cửa đó bảo vệ, và chưa quyết định nào giải chúng.

### ⑸ Luật nhường — ba quyết định tách rời

1. **Quyền ghi** theo trách nhiệm ở ⑴.
2. **Thứ tự xử lý** theo ưu tiên Đức giao, **không theo tên vai**. Một luật kiểu *"sản phẩm luôn
   thắng"* mâu thuẫn ngay với chỉ thị hiện hành của Đức, vốn xếp việc kiến trúc **trên** việc sản phẩm.
3. **Chuyển quyền chỉ tại điểm bàn giao an toàn** — không giật quyền giữa thao tác.

Bốn ca cụ thể: Sản phẩm cần sửa hạ tầng → **gửi yêu cầu**, không tự lấy vùng · việc ưu tiên cao
đến khi Hệ thống đang ghi → **bàn giao tại điểm an toàn** · hai việc cùng ưu tiên → theo thứ tự
nhận, **có cơ chế chống chờ mãi** · phiên im lặng → **không suy ra đã chết**; thu hồi được, nhưng
phải qua cửa tích hợp.

## Vế đã chết

> Cặp vai *Giữ lõi / Phát & thu* của `AGENTS.md` mục 6 (08/09) cũng chết 09/09, nhưng nó **không
> có số hiệu** — không quyết định nào từng ghi nó lại — nên nó không đứng được trong danh sách
> máy đọc dưới đây. Thứ thay nó: [ADR-0029](0029-hai-vai-o-repo-extension.md).

- **0004 — mô hình MỘT cửa Assistant cho mỗi repo.** Chết 07/09: 0017 vế ⑴ thay hẳn bằng
  hai vai chạy song song. Phần 0004 để lại và vẫn đúng — *trạng thái sống trong file repo,
  không sống trong chat* — nằm ở mục **Hệ quả** bên dưới, không phải ở đây.
- **0017 ⑶ — nguồn điều phối bản đầu.** Chết 08/09: 0018 chỉnh lại, nay ở
  [ADR-0005](0005-lam-viec-song-song.md).
- **0017 ⑷ — cửa tích hợp bản đầu.** Chết 08/09: 0019 chỉnh lại, nay ở
  [ADR-0005](0005-lam-viec-song-song.md). *(Viết tách ra 09/09: gộp "⑶ và ⑷" một dòng thì bộ đo
  chỉ đọc được ⑶, nên ⑷ chết mà máy không biết.)*

## Hệ quả

**Được so với mô hình một cửa:** thực thi độc lập, không còn một control plane để mất, và không
còn hàng đợi sau lượt trả lời của một phiên.

**Giữ lại từ mô hình một cửa, vì nó đúng:** trạng thái sống trong **file repo, không sống trong
chat** — bảng quyền, `HANDOFF.md`, `IDEAS.md`, brief. Quyết định 0004 biến điều đó từ thói quen
tốt thành **điều kiện sống còn**, và điều đó vẫn đúng. Bảng tươi vì **mỗi lượt báo cáo là một
lượt sinh lại bảng**, không phải vì nó tự chạy; nó vẫn suy hoàn toàn từ HEAD, không phụ thuộc giờ.

**Cái giá của 0004 mà hai vai KHÔNG gỡ được:**

- **Không nhắn được cho executor đang chạy.** Giao lúc đầu, nghe lúc cuối.
- **Khu báo cáo sống không thấy hai thứ:** luồng ở repo khác, và luồng vừa được giao mà chưa nhận
  khoá — repo chưa có dấu vết nào của nó trong vài phút đầu.
- Đức mở phiên tay ở cùng repo thì **báo cho Assistant**, hoặc chấp nhận phiên đó nằm ngoài điều
  phối và có thể chặn. Không cấm, nhưng nó phá mô hình.

## Trạng thái

Accepted, riêng chỗ hai bản chia vai ở ⑴ còn chờ Đức.
