# Duc Scouter — bản nền v0.1

Một extension Chrome **cục bộ**, dùng riêng. Nó không tự động hoá một trang cụ thể nào. Việc của
nó là: **dò một trang · báo cáo cho AI qua Bridge · tự nạp lại chính nó** khi AI đã ghi code mới
xuống đĩa. Đó là vòng tự cải tiến mô tả ở [ADR-0009](../../../docs/adr/0007-scouter.md).

Phạm vi lượt này dừng ở `SEED v0.1`, 25 mục năng lực, chốt ở
[ADR-0010](../../../docs/adr/0007-scouter.md). Không đi tiếp lên `SEED v1` nếu
chưa có một ADR mới.

## Cài và chạy

1. Chrome → `chrome://extensions` → bật **Developer mode** → **Load unpacked** → chọn thư mục
   `workers/duc-scouter/v0.1.0`.
   *Nếu trước đây đã nạp bản ở gốc repo thì gỡ bản đó đi — nó không còn nữa (ADR-0013).*
2. Bật máy chủ Bridge (bản trong `workers/duc-auto-chatgpt/v0.1.0/duc-auto-chatgpt-loopback-bridge-host-v1/`).
3. Bấm biểu tượng extension → **bảng bên mở ra ở cạnh phải** → mục **Cửa Bridge** → chọn tệp
   ghép cặp do bộ cài Bridge tạo. Dòng trạng thái đổi thành *Đã nối Bridge.*
4. **Muốn Scouter bấm và gõ thì bật *Chế độ phát triển* trong bảng bên.** Tắt thì nó chỉ nhìn
   được. Mỗi lần bật cho 200 lượt; hết thì tắt rồi bật lại.

Chrome sẽ hiện dải băng *"… đang gỡ lỗi trình duyệt này"* ở tab nào Scouter cắm vào. Không giấu
được, và không nên giấu.

## AI ở đầu dây gọi được gì

**Mười bảy** method, **từ vựng đóng**. Gọi `system.capabilities` để lấy danh sách kèm mô tả và lược đồ
tham số — đó là câu trả lời có thẩm quyền, đừng chép danh sách ra chỗ khác.

| Method | Ghi | Làm gì |
|---|---|---|
| `session.hello` · `system.ping` · `system.capabilities` | không | bắt tay, kiểm còn sống, đọc bề mặt |
| `scout.targets` | không | liệt kê và phân loại các target debug của Chrome |
| `scout.page` | không | metadata trang + kiểm kê phần tử tương tác, có phân trang |
| `scout.query` | không | một selector khớp mấy phần tử, và chúng là gì |
| `scout.tree` | không | cây DOM tới độ sâu N, thuộc tính đã che |
| `scout.a11y` | không | cây trợ năng — cái mà trình đọc màn hình thấy, không phải cái mắt thấy |
| `scout.shot` | không | ảnh chụp trang, trả về base64 |
| `scout.wait` | không | chờ NGAY TRONG trình duyệt tới khi một selector khớp (`present`), thôi khớp (`absent`), hoặc **thật sự bấm được** (`usable`), rồi trả lời một lần. Hết giờ trả `satisfied: false`, không phải lỗi |
| `scout.network` | không | nghe trang nói chuyện với máy chủ trong N giây: mỗi lượt gọi một dòng — cách gọi, đường dẫn, mã trạng thái, kiểu nội dung, số byte, mất bao lâu. **Không bao giờ** trả header, nội dung gửi lên, hay nội dung phản hồi |
| `scout.click` | **có** | bấm một phần tử bằng **chuột thật của trình duyệt** (trang thấy `isTrusted: true`). Kiểm điểm sắp bấm thuộc về ai TRƯỚC khi bắn; có thứ chắn thì từ chối `CLICK_OBSCURED` |
| `scout.type` | **có** | gõ một chuỗi bằng **bàn phím thật**, từng phím một. Không xoá nội dung cũ |
| `scout.key` | **có** | gõ một phím có tên: Enter · Tab · Escape · Backspace · Delete · bốn mũi tên · Home · End |
| `scout.fetch` | **có** | gọi một URL http(s) bằng **chồng mạng của chính trình duyệt**. Trả văn bản; `as: "base64"` cho thân nhị phân như PDF. Không kèm cookie trừ khi khai `with_credentials` |
| `scout.navigate` | **có** | đi sang trang khác rồi đợi tới nơi — **kể cả đi tới đúng trang đang mở, tức là F5**. Trả về `reloaded` và `arrivedBy` (`new_document` hay `url_change`). Đổi trang là điều khiển trang, nên nó là lệnh GHI |
| `scout.reload` | **có** | nạp lại chính extension. Trả lời trước, khởi động lại sau. Trần 10 giây một lượt |

Mọi method chạm trang **bắt buộc** có `target_id` — lấy từ `scout.targets`. Không có đường
"tab đang mở": nhánh Flow đã trả giá cho đường đó.

### `present` khác `usable` ở đâu, và vì sao chỗ đó đắt

`present` trả lời *"selector này có khớp không"*. Nó KHÔNG trả lời *"bấm vào có ăn không"* —
một hộp thoại hay tấm chắn phủ lên trên thì cả cây DOM vẫn nằm nguyên bên dưới và mọi selector
vẫn khớp. Đo thật ngày 12/09: một lượt chờ trả `satisfied` sau **36 mili giây** trong khi màn
hình đang bị phủ kín.

`usable` đo thêm một bước: lấy điểm giữa của phần tử rồi hỏi Chrome *điểm đó thuộc về ai*.
Thuộc về chính nó, hoặc con cháu nó (nút biểu tượng là `<button><svg><path>`, điểm giữa rơi
vào `<path>`) thì tính là dùng được; thứ khác chắn thì không.

Kết quả trả về **cả hai con số**, và cặp đáng giá nhất là `matchCount: 1, usableCount: 0` —
*"nó có đấy, nhưng đang bị chắn"*. Phần tử nằm ngoài màn hình cũng tính là **chưa** dùng được:
phép dò cố ý không cuộn trang, vì cuộn là sửa thứ mình đang quan sát.

`scout.click` dùng **đúng phép hỏi đó** ngay trước mỗi lượt bắn chuột. Nên `usable` không phải
một phép đo xấp xỉ cho lượt bấm — nó là cùng một câu hỏi, hỏi sớm hơn.

**Ba method ghi ĐÓNG MẶC ĐỊNH.** Chưa bật *Chế độ phát triển* trong bảng bên thì chúng trả về
`WRITE_BLOCKED` và **không hề chạm tới trang** — không gắn debugger, không gửi khung nào. Bật
một lần được 200 lượt, hết thì tắt rồi bật lại. Không method Bridge nào bật được công tắc đó, nên
AI ở đầu dây không tự mở khoá cho chính nó. Lý do từng chốt:
[ADR-0001](docs/adr/0001-phanh-cho-duong-ghi-va-quyen-alarms.md) của gói.

**Ba method ghi không nhận toạ độ.** Chúng nhận một `selector`, và **từ chối nếu selector không
khớp đúng một phần tử**. Toạ độ do Scouter tự tính từ hộp của phần tử đó. Nhận toạ độ từ ngoài
là bấm được vào bất kỳ đâu trên màn hình, và cổng selector thành đồ trang trí.

`scout.type` **từ chối ký tự điều khiển**: Enter và Tab đi qua `scout.key`. Một ký tự xuống dòng
lọt vào giữa chuỗi là một lượt gửi biểu mẫu mà không ai yêu cầu.

## Tự kiểm

```bash
npm run test:scouter          # 8 phép ghim
npm run scouter:mutation      # 58 con đột biến
npm run scouter:bridge-live   # nối thử với máy chủ Bridge THẬT
npm run scouter:input-probe   # phép đo ①: cú bấm của máy có được coi là của người không
npm run scouter:action-probe  # phép đo ②: ba lệnh ghi có làm đúng việc trên trang thật không
```

Luật của gói: `AGENTS.md`. Trạng thái: `STATUS.md`. Nhật ký: `HANDOFF.md`. Việc còn mở: `BACKLOG.md`.
