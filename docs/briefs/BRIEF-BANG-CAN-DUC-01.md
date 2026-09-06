---
kind: brief
status: active
ttl_days: 60
---

# BRIEF `BANG-CAN-DUC-01` — Khối "Cần Đức" phải được SUY RA, không được gõ tay

Đức nêu ngày 06/09: khối *"Cần Đức"* trên bảng **"đã không hiệu quả và không chính xác nữa"**,
và yêu cầu một cách nuôi hợp lý hơn — gom theo **chuỗi việc**, và **tự cập nhật thường xuyên**.

## 1. Chẩn đoán — bốn chỗ hỏng, đều là hỏng thiết kế

Nguồn hiện tại: **đúng một trường `human_action` trong mỗi `STATUS.md`** (đọc ở
`scripts/build-overview.mjs` khoảng dòng 166).

**⑴ Số dòng là số file, không phải số việc.** Repo có 4 `STATUS.md` → khối vĩnh viễn hiện tối
đa 4 dòng. Ngày 06/09 Đức đang có 8 việc chờ. Không có chỗ chứa cái thứ năm.

**⑵ Chữ gõ tay thì mục.** `STATUS.md` ở gốc repo lúc này vẫn ghi *"Quyết định Extension
Observer V0: nuôi tiếp hay cho nghỉ"* — Đức **đã quyết sáng 06/09**
([ADR-0009](../adr/0009-scouter-thay-observer-cua-tuong-tac.md)). Bảng vẫn hỏi lại.

**⑶ Trộn hai loại việc khác hẳn nhau.** *"Nạp lại tiện ích"* là **bấm**, 30 giây.
*"Có cho chuyển vòng chạy job sang service worker không"* là **chốt**, cần Đức nghĩ. Xếp chung
thì cái nào cũng trông như nhau.

**⑷ Việc chờ Đức thật thì nằm chỗ khác và không có đường lên bảng.** `B-19` · `B-11` · `Y-16` ·
`Y-17` · ba câu về Scouter — tất cả nằm trong `BACKLOG.md` và `IDEAS.md`.

**Gốc bệnh, một câu:** khối đó là **bản chép tay của sự thật nằm nơi khác**. `ORCHESTRATOR.md`
mục 0b đã có luật cho đúng chuyện này — *bảng là cái gương, không phải cơ sở dữ liệu thứ hai*.
Khối này đang vi phạm chính luật đó.

## 2. Đức đã chốt hình dạng

Gom theo **chuỗi việc**, trong mỗi chuỗi tách **BẤM** và **CHỐT**.

| Loại | Là gì | Vì sao tách |
|---|---|---|
| **BẤM** | nạp lại tiện ích · chạy một lượt nghiệm thu | gom được thành **một buổi**, đóng cả cụm |
| **CHỐT** | đổi luật · thêm quyền · chọn phạm vi | mỗi cái một lượt nghĩ, không gom được |

**Chuỗi việc thì đã có sẵn, không được đẻ thêm sổ mới.** Mỗi việc lớn đã có một brief trong
`docs/briefs/`; brief nào `status: active` là một chuỗi đang chạy. Dùng cái đó.

> **Cấm tuyệt đối:** tạo một file "danh sách chuỗi việc" phải nuôi bằng tay. Đó là tái phát
> đúng bệnh vừa chẩn ở mục 1, chỉ đổi chỗ.

## 3. Bốn yêu cầu bắt buộc

**⑴ Đánh dấu tại nguồn, máy quét.** Mục cần Đức ở `BACKLOG.md` · `IDEAS.md` · `STATUS.md` mang
một dấu máy đọc được; bộ sinh quét cả ba sổ. **Bạn thiết kế dấu đó** — nó là hợp đồng dữ liệu,
không phải bản vá, nên tôi không áp cách làm. Ràng buộc: người viết sổ phải đặt được dấu mà
không cần đọc tài liệu, và lane đóng mục thì dấu **biến mất theo**, không phải nhớ đi xoá.

**⑵ Không còn trần số dòng.** Bao nhiêu mục có dấu thì hiện bấy nhiêu.

**⑶ Mỗi dòng có "treo bao lâu rồi", ĐO BẰNG GIT.** Không gõ tay, và **không đọc đồng hồ hệ
thống** — bảng phải suy hoàn toàn từ HEAD. Nếu nó phụ thuộc giờ thì sang ngày mới là **mọi lane
bị chặn đẩy** dù không dữ liệu nào đổi. Luật này đã ghi ở `AGENTS.md` mục 6.

**⑷ Mỗi dòng nói rõ chốt nó thì mở khoá được chuỗi nào.** Đó là toàn bộ lý do Đức chọn hình
dạng này.

## 4. Chia làm HAI lượt — đừng gộp

**Lượt 1 (việc này): cơ chế.** Khoá `_code`. Dấu · bộ quét · cách hiện trên bảng · phép ghim.
Chưa mục nào có dấu thì khối hiện rỗng kèm một câu nói rõ là chưa mục nào được đánh dấu —
**không được im lặng hiện rỗng**, vì rỗng-vì-chưa-làm và rỗng-vì-hết-việc là hai chuyện khác
nhau mà Đức không phân biệt được nếu bảng không nói.

**Lượt 2 (lượt sau, brief riêng): điền dấu vào các mục đang chờ.** Việc đó chạm `BACKLOG.md`
của ba gói cộng `IDEAS.md` và `STATUS.md` ở gốc — **năm khoá khác nhau**. Gộp vào lượt 1 là tự
tạo một lượt cần năm khoá, và nó sẽ chặn cả repo.

## 5. Luật của bảng — vi phạm là hỏng nghiệm thu

- **Chữ operator thấy: tiếng Việt CÓ DẤU.** Phép kiểm `B15` cưỡng chế. Mã lỗi thì tiếng Anh.
- Trong trang **cấm**: SHA · đường dẫn · phần trăm · lời máy tự khen.
- Bảng **chỉ chiếu** sổ nguồn. Không được ghi thẳng bất cứ thứ gì vào bảng.
- Hai lượt sinh trên cùng HEAD phải ra **kết quả giống hệt**.

## 6. Kiểm chứng

1. Phép ghim: có dấu → lên bảng; gỡ dấu → biến khỏi bảng.
2. Phép ghim: "treo bao lâu" không đổi khi đồng hồ hệ thống đổi.
3. Sinh hai lần trên cùng HEAD → hai file giống hệt từng byte.
4. **Đếm số chỗ mỏ neo của bạn khớp. Ra 0 thì DỪNG** — đó là công cụ đo hỏng, không phải
   "không có gì phải sửa". Repo này đã bị cắn nhiều lần đúng kiểu đó, gần nhất sáng 06/09 với
   một bộ đo mù 3/10 con vì mỏ neo viết bằng `\n` mà file là CRLF.
5. Cổng đóng phiên XANH TOÀN BỘ.

## 7. Khoá và đóng phiên

```
node scripts/claim.mjs --take _code --as <tên-phiên> --task "khoi Can Duc: suy ra tu dau, gom theo chuoi viec"
```

`_code` đang có chủ thì **chờ**, đừng giành. Commit phải có dòng cuối `Lane: <tên-phiên>`. Dùng
`git commit -o <đường-dẫn>`. Cổng phải XANH TOÀN BỘ. Đẩy bằng `safe-push.mjs`. **Trả khoá SAU
khi đẩy.** Ghi Log vào `HANDOFF.md` gốc.

## 8. Cấm

- Cấm tạo sổ mới phải nuôi bằng tay.
- Cấm để bảng phụ thuộc đồng hồ hệ thống.
- Cấm gõ tay bất cứ nội dung nào vào bảng.
- Cấm sửa nội dung `human_action` hiện có trong lượt này — đó là lượt 2.
