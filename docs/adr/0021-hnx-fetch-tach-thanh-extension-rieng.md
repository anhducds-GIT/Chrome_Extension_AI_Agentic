---
status: Accepted
superseded_clause: "⑵ trần một gói sống nâng lên HAI" — dead, ADR-0024 removed the cap
adr: 0021
date: 2026-09-08
deciders: Đức
---

# ADR-0021 — HNX Fetch tách thành extension riêng, và trần "một gói sống" nâng lên hai

> **⚠ MỘT PHẦN CỦA ADR NÀY ĐÃ CHẾT — đọc khối này trước phần Quyết định.**
>
> **Vế ⑵ (*"trần một gói sống nâng lên HAI"*) ĐÃ CHẾT.**
> [ADR-0024](0024-mo-bang-toan-bo-nam-goi.md) ngày 08/09 bỏ hẳn trần số gói: cả năm gói đều
> sống. Ai đọc vế ⑵ mà không đọc tiếp sẽ tưởng repo còn giới hạn hai gói.
> 
> **Vế ⑴, ⑶, ⑷ vẫn sống** — HNX Fetch vẫn là extension riêng, có khoá riêng, không có quyền
> `debugger`.
>
> Rà soát bộ luật 2026-09-09 ([ADR-0026](0026-adr-records-are-editable.md)). Phần còn lại của
> ADR này vẫn có hiệu lực.

## Bối cảnh

Ngày 07–08/09, pilot `hnx-phai-sinh` chạy trong gói `duc-scouter` và cho ra sản phẩm thật:
216 tệp PDF và một tệp CSV SSOT 368 hàng trong thư mục dữ liệu của Đức trên Drive. Việc đó
chạy hằng ngày, vào dữ liệu thật, và Đức sẽ giao cho **một AI khác không phải Claude Code** vận
hành.

Đức chốt 08/09: *"sau này ta sẽ dùng scouter đi scout trang khác, còn HNX thành 1 extension
độc lập chạy riêng cho web HNX Fetch."*

Chỗ vướng: [giới hạn ①](../../AGENTS.md) khai **một gói sống một lúc**, và giới hạn ② cấm **cài
một tính năng hai lần**. Ba gói `duc-auto-*` là fork của nhau — mỗi lỗi phải sửa ba lần — nên
phản xạ đúng khi nghe *"tách thành extension riêng"* là hỏi: ta có đang đẻ ra fork thứ tư không?

## Phép đo trả lời câu đó trước khi chép một dòng nào

Đếm xem tầng lấy dữ liệu HNX thật sự gọi những lệnh nào của extension:

```
grep -ohE '"(scout|file)\.[a-z]+"' du-lieu/*.mjs | sort | uniq -c
      4 "scout.fetch"
      1 "file.write"
      1 "file.list"
```

**Một lệnh.** Và `scout.fetch` không dùng `chrome.debugger`: nó là `fetch()` của chính service
worker, không cần `target_id`, không gắn vào tab nào. Hai lệnh `file.*` nằm ở **máy chủ Bridge**,
không nằm trong extension.

## Quyết định

**⑴ HNX Fetch là extension riêng: `workers/hnx-fetch/`, khoá riêng cùng tên, giao thức riêng
`hnx-fetch.bridge`.**

**⑵ Trần "một gói sống" nâng lên HAI**: `workers/duc-scouter` và `workers/hnx-fetch`. Ba gói
`duc-auto-*` vẫn đóng băng.

**⑶ Cắt chứ không tắt.** `bridge-core.mjs` và `fetch-core.mjs` bị **xoá** 11 lệnh, không phải
chặn bằng cờ. Manifest **không khai quyền `debugger`**, và vùng đích hẹp về `hnx.vn` +
`127.0.0.1` thay cho `<all_urls>`.

**⑷ Hai tệp chép nguyên văn** (`transport.mjs` · `journal-core.mjs`) có phép ghim so **từng
byte** với bản gốc bên Scouter.

## Vì sao đây KHÔNG phải fork thứ tư

Fork là **hai bản của một thứ**. Đây là **hai thứ khác nhau**:

| | Scouter | HNX Fetch |
|---|---|---|
| quyền `debugger` | có | **không** |
| bấm · gõ · cây DOM · ảnh chụp | có | **không có** |
| vùng đích | `<all_urls>` | `hnx.vn` + máy chủ tại chỗ |
| lệnh Bridge | 15 | **4** |
| việc | dò trang bất kỳ | lấy dữ liệu một trang, mỗi ngày |

Gói mới **hẹp hơn** gói cũ ở mọi chiều đo được. Ba gói `duc-auto-*` thì ngược lại: chúng có
cùng bề mặt, cùng năng lực, và khác nhau chỉ ở những chỗ đã trôi mất đồng bộ.

**Cái được lớn nhất, và nó chỉ có nhờ tách:** một extension không có `debugger` thì **không ai
bắt nó bấm được** — kể cả AI vận hành nó, kể cả khi có người viết lại mã, vì Chrome từ chối ở
tầng hệ thống. Với thứ chạy hằng ngày vào dữ liệu thật của Đức, đó là hàng rào đáng giá hơn
mọi câu văn trong tài liệu. Kèm theo: **không còn dải băng *"đang gỡ lỗi trình duyệt này"***
trên tab của Đức.

**Vì sao cắt chứ không tắt bằng cờ:** một lệnh không tồn tại thì không ai bật lại được. Một
lệnh còn đó mà bị chặn bằng cờ thì **cái cờ là thứ duy nhất đứng giữa**, và cờ thì sửa được.
`scout.click` gọi vào HNX Fetch trả `METHOD_NOT_FOUND`.

## Cái mất, nói thẳng

**⑴ Hai bản của `transport.mjs` và `journal-core.mjs` nằm trên đĩa.** Đó là chi phí thật, và nó
là cùng loại chi phí đã sinh ra `S-11` (hai bridge cũ nhận token trần vì bản vá bắt tay hai
chiều chỉ tới được một bản).

Cái bịt: phép ghim so **từng byte**. Nó **không cấm** hai bản khác nhau — nó cấm chúng khác
nhau **mà không ai biết**. Muốn khác thật thì khai vào `CO_Y_KHAC` kèm lý do, và lúc đó nó là
một quyết định có chữ ký chứ không phải một vệt trôi. `duc-auto-*` không có gì tương đương, và
đó chính là chỗ chúng trôi.

**⑵ Trần gói sống nay là hai, và trần nới một lần thì dễ nới lần nữa.** Nên mục ① của
`AGENTS.md` viết rõ: trần là *số gói CÓ LÝ DO sống*, lý do phải viết được thành một ADR, và gói
thứ ba phải hỏi Đức.

**⑶ Vùng đích hẹp sẽ vỡ nếu HNX phục vụ tệp từ một tên miền khác.** Hôm nay đo được mọi địa chỉ
trong tầng dữ liệu đều là `hnx.vn`, và `https://*.hnx.vn/*` phủ các tên miền con. Vỡ thì lượt
gọi bị Chrome chặn với một câu rõ ràng — hỏng ồn ào, không hỏng im lặng.

## Kèm theo: `PROTOCOL.md`

Đức đặt hàng riêng: *"mô tả về cách tôi muốn fetch dữ liệu về, so sánh, kiểm tra dữ liệu, đảm
bảo tính toàn vẹn… đầy đủ hoàn thiện. protocol này sẽ còn được maintain độc lập."*

`workers/hnx-fetch/PROTOCOL.md` là sổ tay **tự đứng một mình** cho một AI chưa từng đọc repo
này. Mục dài nhất là **mục 4 — đối chiếu và kiểm toàn vẹn**, và đó là chủ ý: Đức giữ việc này
cho AI thay vì làm thành một nút bấm **vì** phần đó. Lấy được dữ liệu là việc dễ; biết dữ liệu
có đúng không mới là việc cần người.

## Đo

| Chỗ | Kiểm bằng |
|---|---|
| Từ vựng đóng ở 4 lệnh, không lệnh bấm nào | `be-mat-hep-smoke.mjs` khối ⑴ |
| Manifest không có `debugger`, không có `<all_urls>` | khối ⑵ |
| Cái phanh còn nguyên, trần 200 gõ cứng | khối ⑶ |
| Hai tệp chép chưa trôi khỏi bản gốc | khối ⑷ |
| Tầng dữ liệu chạy đúng ở vị trí mới | 5 phép ghim trong `du-lieu/tests/` |

## Còn nợ

Thư mục cũ `workers/duc-scouter/pilots/hnx-phai-sinh/` **chưa xoá** — xoá tệp là việc phải hỏi
Đức. Nó đã được dán bảng *ĐÃ CHUYỂN NHÀ* ở đầu `AGENTS.md` của nó.

Và **chưa lượt nào chạy qua chính extension mới** (`H-01` trong `workers/hnx-fetch/BACKLOG.md`).

## Trạng thái

Accepted
