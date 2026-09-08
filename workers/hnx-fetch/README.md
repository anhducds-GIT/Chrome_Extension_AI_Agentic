# HNX Fetch — bản v0.1

Extension Chrome **cục bộ**, dùng riêng. Nó lấy dữ liệu phái sinh của Sở Giao dịch Chứng khoán
Hà Nội theo ngày, rồi đổ vào thư mục dữ liệu của Đức trên Drive.

**Vận hành hằng ngày thì đọc [`PROTOCOL.md`](PROTOCOL.md).** File này chỉ nói cách cài lần đầu.

## Nó làm được gì, và cố ý không làm gì

Bốn lệnh, hết:

| Lệnh | Làm gì |
|---|---|
| `session.hello` · `system.ping` · `system.capabilities` | bắt tay, kiểm còn sống, tự khai năng lực |
| `scout.fetch` | gọi một URL bằng chồng mạng của **chính trình duyệt** |

**Không bấm, không gõ, không mở tab, không đọc DOM, không chụp màn hình.** Extension **không
khai quyền `debugger`**, nên Chrome từ chối những việc đó ở tầng hệ thống — kể cả khi có ai đó
viết lại mã.

Hệ quả anh nhìn thấy: **không có dải băng *"đang gỡ lỗi trình duyệt này"*** trên tab nào.

Cần bấm nút trên một trang? Đó là việc của `duc-scouter`, không phải của gói này.

## Cài và chạy

1. Chrome → `chrome://extensions` → bật **Developer mode** → **Load unpacked** → chọn thư mục
   `workers/hnx-fetch/v0.1.0`.
2. Bật **máy chủ Bridge CỦA GÓI NÀY** — nhấp đúp `v0.1.0/bridge/Chay-may-chu-HNX.cmd`, hoặc kéo
   thả tệp ghép cặp vào nó.

   > Máy chủ của Scouter **không dùng được** cho extension này: hai bên nói hai tên giao thức
   > khác nhau, và bắt tay sẽ hỏng **im lặng** — bảng bên chỉ báo *"Mất kết nối"*, giống hệt lúc
   > chưa bật máy chủ. Dùng chung một tệp ghép cặp thì được, miễn đừng chạy hai máy chủ cùng lúc
   > trên cùng một cổng.
3. Bấm biểu tượng extension → **bảng bên mở ra ở cạnh phải** → mục **Kết nối Bridge** → chọn
   tệp ghép cặp do bộ cài Bridge tạo. Dòng trạng thái đổi thành *Đã nối máy chủ Bridge trên máy này.*
4. Bật công tắc **"Cho phép lấy dữ liệu"** ở đầu bảng bên. Tắt thì mọi lượt gọi bị từ chối.
   Mỗi lần bật cho **200 lượt**; hết thì tắt rồi bật lại.

**Phanh khẩn: `Ctrl+Shift+H`** — tắt công tắc ngay, dùng được cả khi bảng bên đã đóng. Nó chỉ
tắt chứ không bật được.

## Lấy dữ liệu

Hai lệnh, chạy trong `du-lieu/`. Câu lệnh đầy đủ kèm giải thích nằm ở
[`PROTOCOL.md` mục 3](PROTOCOL.md).

```bash
node tai-ket-qua.mjs --pairing <tệp> --master "<đường dẫn SSOT .csv>" --tu 2026-09-01 --den 2026-09-08
node tai-pdf.mjs     --pairing <tệp> --thu-muc "<thư mục Drive>" --thang 09/2026
```

Thêm `--thu-xem` để **chỉ liệt kê, không ghi gì**.

Chạy lại cùng một khoảng ngày là **vô hại**: ngày đã có thì không lấy lại, tệp đã có thì không
ghi đè.

## Không có token nào trong kho mã

Tệp ghép cặp chứa cổng và token của máy chủ Bridge. Nó **không bao giờ** nằm trong repo — mọi
lệnh nhận đường dẫn tới nó qua cờ `--pairing`.

## Tự kiểm

```bash
node du-lieu/tests/bang-ket-qua-smoke.mjs && node du-lieu/tests/master-smoke.mjs && node du-lieu/tests/nguon-hnx-smoke.mjs && node du-lieu/tests/nguon-thong-ke-smoke.mjs && node du-lieu/tests/vong-lay-smoke.mjs && node v0.1.0/tests/be-mat-hep-smoke.mjs
```

## Đọc tiếp

| Cần gì | Mở file |
|---|---|
| Chạy việc hằng ngày, đối chiếu, kiểm toàn vẹn, bảng mã lỗi | [`PROTOCOL.md`](PROTOCOL.md) |
| Luật của gói, bản đồ file | [`AGENTS.md`](AGENTS.md) |
| Phiên trước làm tới đâu | [`HANDOFF.md`](HANDOFF.md) |
| Việc còn nợ | [`BACKLOG.md`](BACKLOG.md) |
