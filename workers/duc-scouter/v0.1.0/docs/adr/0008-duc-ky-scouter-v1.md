---
status: Accepted
adr: 0008
date: 2026-09-16
deciders: Đức
---

# ADR-0008 — Đức ký `Scouter v1`: bộ đồ nghề này dùng được, và nó hứa đúng những gì nó làm

## Bối cảnh

Ngày 16/09, sau khi chuỗi `S1`–`S3` đóng, Đức ký. Chữ ký này là **một tuyên bố phiên bản**,
không phải một lượt chạy xanh — nên nó phải là chữ ký của người, không phải kết quả của một cái
cổng. Đó là lý do nó được để thành điểm dừng DUY NHẤT của cả chuỗi.

Thứ tự cũng là một phần của quyết định. Đức đã chọn **sửa trước, rồi mới ký**, và lý do anh nhận
thì ngắn: ký `v1` là đóng dấu *“bộ đồ nghề này chạy được”*, mà cho tới sáng 16/09 đường ghi
**chưa giữ được lời hứa đó** — `scout.type` trả về số phím nó GỬI ĐI, và báo ĐẠT cho một việc có
thể chưa xảy ra. Ký trước là đóng dấu lên một lời hứa chưa ai giữ.

## Quyết định

`Scouter` seed là **`v1`**. `manifest.json` khai `1.0.0`; `STATUS.md` chuyển `lifecycle` từ
`building` sang `active`.

**Thư mục vẫn là `v0.1.0`, cố ý.** Tên thư mục là một **đường dẫn**, không phải một phiên bản:
nó nằm trong mười phép ghim so từng byte, trong `package.json`, và trong bộ khởi động **ngoài
repo** mà Đức bấm. Đổi nó là bắt Đức gỡ và nạp lại extension để lấy một cái tên đẹp hơn. Repo này
đã có tiền lệ: `duc-auto-chatgpt/v0.1.0` khai `manifest 0.3.0`, và không phép kiểm nào so hai thứ.

## `v1` HỨA GÌ

1. **Từ vựng cố định 24 method**, là hợp đồng `deepEqual` trong phép ghim — thêm hay bớt một chữ
   thì suite đỏ.
2. **Đường ghi tự kiểm.** `scout.type` đọc lại ô nhập; không thấy chữ thì **ĐỎ**
   (`WRITE_NOT_OBSERVED`), không phải “đạt kèm ghi chú”. `scout.click` **khai thẳng** là nó chưa
   kiểm được, và kiểm được khi người gọi đưa `wait_for`.
3. **Ba trạng thái, không phải hai**: khớp · lệch (ném) · **không đọc được** (khai thật). Ô che
   nội dung và bản đọc bị cắt rơi vào trạng thái thứ ba — báo “lệch” ở đó là một lời buộc tội sai.
4. **Cái phanh vẫn ở tay người.** Mọi lệnh bấm/gõ đóng mặc định, chỉ Đức mở, trần 200 lượt mỗi
   lần mở, phanh khẩn `Ctrl+Shift+X`.
5. **Danh sách method CDP không nới.** `v1` đóng dấu lên đúng bề mặt an toàn đang có.

## `v1` KHÔNG hứa gì

- **Không hứa “trang đã phản ứng” cho một cú bấm trần.** Một cú bấm không có dấu vết chung; nếu
  người gọi không đưa `wait_for` thì kết quả tự khai `da_kiem: false`. Đọc câu đó, đừng bỏ qua.
- **Không hứa đọc lại được MỌI ô.** Ô che nội dung trả về dấu che; bản đọc quá dài bị cắt ở trần.
  Cả hai khai là *chưa kiểm được*, và người gọi phải tự quyết làm gì với câu đó.
- **Không hứa `scout.clear` đã xoá sạch ô.** Lệnh đó **chưa** vào đường tự kiểm — nó vẫn chỉ kể
  việc mình làm (`steps: ["Ctrl+A","Delete"]`). Nợ `S-27` ở `BACKLOG.md`.
- **Không hứa chạy trên máy Mac.** `scout.clear` gõ cứng `Ctrl+A`; trên macOS phím ấy là `Cmd+A`.

## Bằng chứng đứng sau chữ ký

Suite hai gói xanh · **đột biến 0 sống sót**: 160 con ở bộ chính (17 trong số đó, `TK1`–`TK17`,
sinh ra riêng cho đường ghi tự kiểm) và 17 con ở bộ phép dò · một lượt đo trên Chrome sạch cho
bốn loại ô nhập · và một lượt **E2E thật** trên
trang Udin ngày 16/09: `W1`→`W2`→`W3`→JPG→`W4` trọn vẹn, 4 tệp JPEG thật, cỡ khớp **từng byte**
với báo cáo. Trên chính lượt đó, `scout.type` trả `da_kiem: true`.

Ba nhánh của `scout.click` cũng đo **trên dây thật**, không qua đồ giả: mốc có thật → `da_kiem:
true` (2 ms) · mốc không tới → `CLICK_NOT_OBSERVED` (1018 ms) · bấm trần → tự khai chưa kiểm.

## Hệ quả

- Gói nào sinh ra từ seed này **thừa hưởng cả năm lời hứa ở trên**, và phải giữ chúng — mười tệp
  ghim so từng byte là thứ bắt nó giữ.
- Một bản vá làm mất bất kỳ lời hứa nào ở mục **HỨA GÌ** là một **thay đổi phiên bản**, không
  phải một bản vá. Nó cần một ADR mới và một chữ ký mới.
- Mục **KHÔNG hứa gì** là nơi duy nhất được phép dài ra mà không cần chữ ký — thêm một giới hạn
  đã biết vào đó là nói thật hơn, không phải hứa ít đi.
