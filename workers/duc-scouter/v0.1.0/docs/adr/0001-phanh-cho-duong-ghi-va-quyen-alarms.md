---
status: Accepted
adr: 0001
date: 2026-09-07
deciders: Đức
---

# ADR-0001 — Đường ghi của Scouter đóng mặc định, mở bằng tay, và có trần; quyền `alarms` được thêm làm lưới đỡ

## Bối cảnh

Ngày 06–07/09, `S-01` mở đường ghi cho Scouter: `scout.click` · `scout.type` · `scout.key`
gửi sự kiện chuột và bàn phím qua `chrome.debugger`, nên trang thấy `isTrusted: true` và mở
được những cổng mà `element.click()` không mở được. Đó là năng lực xếp hạng số một của bảng
kiểm kê, và nó đã chạy được.

Nhưng khi `S-01` đóng lại thì **thứ duy nhất đứng giữa một AI và một cú bấm là một câu văn**:
`AGENTS.md` của gói, luật 4, "cấm chạy trên trang thật khi chưa hỏi Đức". Đó là luật viết cho
người vận hành đọc. Một AI đọc hụt câu đó thì không có gì chặn nó — và chính Scouter là gói mà
AI được phép sai khiến qua Bridge.

Ba gói `duc-auto-*` đã gặp bài toán này rồi và đã có lời giải đang chạy: một công tắc chế độ
phát triển, mặc định TẮT, cộng một trần cho mỗi lượt chạy thử.

Câu thứ hai đến từ `S-02`: tầng nối lại của Bridge chạy bằng `setTimeout` trong service worker,
mà Chrome cho service worker ngủ. Máy chủ Bridge tắt lâu thì Scouter chỉ tỉnh lại lúc tình cờ
có việc khác đánh thức nó — nhìn ra ngoài giống hệt "extension hỏng". Ba worker kia dùng
`chrome.alarms`, nhưng quyền đó không nằm trong danh sách [ADR-0009](../../../../../docs/adr/0007-scouter.md)
đã duyệt, mà thêm quyền là việc phải hỏi Đức (`AGENTS.md` gốc, mục 2).

## Quyết định

Đức chốt ngày 07/09, hai câu:

**⑴ Đường ghi dùng đúng khuôn ba gói `duc-auto-*`: một công tắc chế độ phát triển, mặc định
TẮT, kèm trần 50 lượt ghi mỗi lần mở khoá.** Không đẻ khái niệm mới. Danh sách trắng URL đã
được cân và bỏ: Scouter sinh ra để dò trang **lạ**, nên một danh sách phải khai trước sẽ chống
lại chính việc của nó.

Năm chỗ đã cân, ghi lại vì mỗi chỗ đều có một lựa chọn khác nghe hợp lý hơn:

- Cái phanh đứng ở `runAction()` — cửa duy nhất cả ba lệnh ghi đi qua — chứ không ở từng
  method. Lệnh ghi thứ tư mai sau bị chặn mà không ai phải nhớ thêm một dòng.
- **Hỏng thì ĐÓNG**, ngược hẳn với trần chống bão nạp lại nằm ngay bên cạnh trong cùng file.
  Đọc không ra trạng thái công tắc nghĩa là không biết Đức đã mở chưa, và "không biết" xử như
  "chưa mở". Một cái phanh mở ra khi hỏng thì không phải phanh.
- **Trừ trước, bấm sau.** Lượt bấm hỏng vẫn tốn ngân sách. Nếu chỉ trừ khi bấm thành công thì
  một vòng lặp gõ sai selector quay được vô hạn lần mà trần không bao giờ chạm tới.
- Trần **gõ cứng** trong mã, không đọc từ kho lưu và không nhận từ tham số. Trần mà kẻ bị chặn
  ghi được thì không phải trần.
- Trần đếm theo **mỗi lần mở khoá**, không theo đời service worker. Đếm theo đời service worker
  là trần giả: Chrome cho worker ngủ vài phút một lần, và mỗi lần tỉnh là một bộ đếm mới tinh.

Công tắc chỉ bật được **từ popup**. Không method Bridge nào bật được nó, nên một AI ở đầu dây
không tự mở khoá cho chính nó.

**⑵ Thêm quyền `alarms` vào `manifest.json`.** Danh sách quyền của gói nay là
`debugger` · `storage` · `alarms`, cộng host `http://127.0.0.1/*`.

Một điều đo được phải ghi kèm, vì nó làm hẹp phạm vi của chính quyết định này: **`chrome.alarms`
không thay được tầng thử-lại nhanh.** Chrome ép sàn 30 giây một lượt hẹn, còn tầng kia thử lại
sau 1s/2s/5s. Nên `alarms` chỉ làm một việc: **đánh thức service worker đã ngủ**, nhịp một phút.
Hai cơ chế ở hai chỗ — cái nhanh trong `scouter-transport-loopback.mjs`, cái lưới trong
`scouter-background.js` — và cố ý không gộp.

## Hệ quả

**Được:** Scouter không bấm được gì cho tới khi Đức bật công tắc trong popup, và mỗi lần bật chỉ
mở ra 50 lượt. Vòng lặp hỏng của một AI dừng ở lượt thứ 50 thay vì quay mãi. Bridge tự nối lại
sau khi service worker ngủ, không cần Đức bấm tay.

**Mất:** thêm một bước tay cho Đức trước mỗi lượt làm việc thật, và một bước nữa khi hết 50
lượt. Đó là cái giá cố ý — cái phanh luôn quay về tay người, đó chính là điều làm nó là phanh.
Trần 50 là **con số đoán**, chưa có lượt chạy thật nào để hiệu chỉnh; nó đặt bằng ước lượng
20–40 thao tác cho một adapter, và sẽ phải đo lại sau `S-06`.

**Ai phải làm gì khác đi:** Đức **nạp lại extension trong Chrome** — manifest đổi thì bản đang
chạy không tự cập nhật quyền. Từ nay, muốn Scouter bấm thì mở popup, bật *Chế độ phát triển*.

**Điều ADR này KHÔNG giải quyết:** cái phanh chặn theo **số lượt**, không chặn theo **trang**.
Công tắc bật rồi thì Scouter bấm được trên bất kỳ tab nào có `target_id`. Luật "cấm chạy trên
trang thật" vẫn là luật cho người vận hành, và vẫn chưa có chốt nào trong mã cưỡng chế nó.

## Trạng thái

Accepted
