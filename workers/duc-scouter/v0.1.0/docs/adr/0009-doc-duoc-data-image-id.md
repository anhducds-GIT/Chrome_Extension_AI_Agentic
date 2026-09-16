---
status: Accepted
adr: 0009
date: 2026-09-17
deciders: Đức
---

# ADR-0009 — Thêm `data-image-id` vào danh sách trắng của `de-xuat-chat-v1`

## Bối cảnh

Chính sách che `de-xuat-chat-v1` ([ADR-0006](0006-chinh-sach-che-va-cua-hep-doc-chu.md)) trả
**danh sách trắng** thuộc tính, và cắt mọi giá trị ở **200 ký tự** (`MAX_ATTR_LENGTH`). Thuộc
tính ngoài danh sách chỉ hiện TÊN, không hiện giá trị.

Vòng việc thật của Đức trên Udin cần biết **ảnh nào là ảnh nào** trên canvas — Đức nói rõ cái
giá: *"nếu bạn apply 1 cho 2 mà không xác định được đâu là 1, đâu là 2 thì sẽ không còn chính
xác nữa."* Đó là loại sai **không báo lỗi**: Udin vẫn chạy, vẫn ra ảnh, chỉ là lấy style của B
áp lên A.

Hai bản trước lấy một **CÁI TÊN** làm danh tính, và cả hai hỏng cùng một kiểu:

| bản | danh tính | hỏng thế nào |
|---|---|---|
| 16/09 | tên tệp | canvas giữ một bản KHÁC của cùng tấm ảnh — khớp **0/8** |
| 17/09 sáng | `src` | Udin **mã hoá lại** ảnh thả vào thành `data:image/webp;base64,…`; lõi đọc cắt ở 200 ký tự, và hai ảnh khác hẳn nhau cho ra **hai chuỗi 200 ký tự y hệt** |

Phép đo 17/09 trên trang thật: một lượt thả làm canvas mọc **18 → 20**, mà phép so `src` thấy
**0 ảnh mới**, rồi lệnh báo *"trang chưa nhận"* — một câu **sai nguyên nhân**. Nó báo đỏ chứ
không trỏ nhầm, nên không ai mất ảnh; nhưng nó khoá hẳn ca ⒝ của Đức (*gửi một ảnh từ ngoài vào
rồi xin Udin improve*) mỗi khi canvas đã có sẵn một ảnh thả.

Trang **tự khai** một mã ổn định cho từng chỗ đặt: `data-image-id`. Nó nằm ngoài danh sách
trắng nên giá trị bị che.

## Quyết định

**Đức chốt 17/09: thêm đúng `data-image-id` vào `SAFE_ATTRIBUTES`.** Mọi điều khoản khác của
`de-xuat-chat-v1` giữ nguyên.

Ba chỗ **không** đổi, và cả ba đều là chỗ giữ cho lượt nới này hẹp:

1. **`MAX_ATTR_LENGTH` vẫn 200.** Nới trần là đường sửa duy nhất khác, và nó kéo cả `data:` URI
   vào nhật ký. Không chọn.
2. **Vẫn là danh sách TRẮNG.** Không mở cho họ `data-*`. Một bản vá lười kiểu ấy làm mọi phép
   ghim của lượt này xanh y hệt — nên bộ đo có hai con đột biến, `M12` canh cái đã khai đọc
   được thật, `M13` canh lượt nới không lan ra cả họ.
3. **Nới danh sách này vẫn là đổi luật an toàn**, ngang với thêm một method: phải hỏi Đức.

## Vì sao nó hẹp

`data-image-id` cùng hình dạng với `data-testid` / `data-qa` đã có trong danh sách từ 07/09:
một mã do **ứng dụng tự sinh** cho một đối tượng trên màn hình. Nó không phải dữ liệu của người
dùng, không phải chữ ký, không phải token. Nó không mở thêm đường đọc nào — `scout.query` vẫn
chỉ trả những phần tử khớp selector người gọi đưa.

Cái nó mua về thì lớn hơn một lượt vá: `src` định danh **TẤM ẢNH**, `data-image-id` định danh
**CHỖ ĐẶT**. Một tấm ảnh nằm 5 chỗ trên canvas (đo thật 16/09) thì đường cũ phải TỪ CHỐI cả
lượt vì không nói được chỗ nào; đường mới trỏ đích danh từng chỗ.

## Giá phải trả, nói trước

- **Trang có thể đổi tên thuộc tính.** Khi ấy `idTrenCanvas()` TỪ CHỐI cả lượt kèm câu chỉ
  đường, chứ không lặng lẽ bỏ qua hộp thiếu mã — bỏ qua nghĩa là phép so trước/sau đếm thiếu,
  và ta quay lại đúng câu *"canvas không mọc thêm ảnh nào"* cho một lượt thả thành công.
- **Đây là thuộc tính của MỘT trang cụ thể** nằm trong một danh sách dùng chung cho mọi trang.
  Nó vô hại ở trang khác (không có thì không đọc ra gì), nhưng danh sách này không được thành
  chỗ chứa mọi thuộc tính của mọi trang — cái sau phải là một đường khai theo trang, và đó là
  một quyết định khác, chưa cần.
- **Cần Đức nạp lại extension một lần**: `scouter-probes.mjs` là tệp của extension. Mã gọi đã
  biết tự khai chuyện đó thành câu đọc được.

## Hệ quả

- `SAFE_ATTRIBUTES` 25 → 26 tên. `scouter-probes.mjs` của `duc-scouter`, chép từng byte sang
  `udin-optic`.
- `chon-tham-chieu.mjs` đổi danh tính sang `data-image-id`: `hopTheoId` · `idTrenCanvas` ·
  `idTheoSrc` thay `hopCuaAnh`; `chonTheoThuTu` nhận mã thay vì `src`.
- `vong-tham-chieu.mjs` học danh tính ảnh vừa thả bằng phần chênh của tập mã.
- `src` còn đúng một việc: tìm hộ Đức khi anh gõ `canvas:<mẩu src>` — và phép tìm ấy để
  **Chrome** khớp CSS (`img[src*="…"]`), vì chuỗi `src` phía Node đã bị cắt.
