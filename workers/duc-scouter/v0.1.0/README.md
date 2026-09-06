# Duc Scouter — bản nền v0.1

Một extension Chrome **cục bộ**, dùng riêng. Nó không tự động hoá một trang cụ thể nào. Việc của
nó là: **dò một trang · báo cáo cho AI qua Bridge · tự nạp lại chính nó** khi AI đã ghi code mới
xuống đĩa. Đó là vòng tự cải tiến mô tả ở [ADR-0009](../../../docs/adr/0009-scouter-thay-observer-cua-tuong-tac.md).

Phạm vi lượt này dừng ở `SEED v0.1`, 25 mục năng lực, chốt ở
[ADR-0010](../../../docs/adr/0010-scouter-dung-o-seed-v01.md). Không đi tiếp lên `SEED v1` nếu
chưa có một ADR mới.

## Cài và chạy

1. Chrome → `chrome://extensions` → bật **Developer mode** → **Load unpacked** → chọn thư mục
   `workers/duc-scouter/v0.1.0`.
   *Nếu trước đây đã nạp bản ở gốc repo thì gỡ bản đó đi — nó không còn nữa (ADR-0013).*
2. Bật máy chủ Bridge (bản trong `workers/duc-auto-chatgpt/v0.1.0/duc-auto-chatgpt-loopback-bridge-host-v1/`).
3. Bấm biểu tượng extension → mục **Cửa Bridge** → chọn tệp ghép cặp do bộ cài Bridge tạo.
   Dòng trạng thái đổi thành *Đã nối Bridge.*

Chrome sẽ hiện dải băng *"… đang gỡ lỗi trình duyệt này"* ở tab nào Scouter cắm vào. Không giấu
được, và không nên giấu.

## AI ở đầu dây gọi được gì

Tám method, **từ vựng đóng**. Gọi `system.capabilities` để lấy danh sách kèm mô tả và lược đồ
tham số — đó là câu trả lời có thẩm quyền, đừng chép danh sách ra chỗ khác.

| Method | Ghi | Làm gì |
|---|---|---|
| `session.hello` · `system.ping` · `system.capabilities` | không | bắt tay, kiểm còn sống, đọc bề mặt |
| `scout.targets` | không | liệt kê và phân loại các target debug của Chrome |
| `scout.page` | không | metadata trang + kiểm kê phần tử tương tác, có phân trang |
| `scout.query` | không | một selector khớp mấy phần tử, và chúng là gì |
| `scout.tree` | không | cây DOM tới độ sâu N, thuộc tính đã che |
| `scout.reload` | **có** | nạp lại chính extension. Trả lời trước, khởi động lại sau. Trần 10 giây một lượt |

`scout.page` · `scout.query` · `scout.tree` **bắt buộc** có `target_id` — lấy từ `scout.targets`.
Không có đường "tab đang mở": nhánh Flow đã trả giá cho đường đó.

## Tự kiểm

```bash
npm run test:scouter          # 5 phép ghim
npm run scouter:mutation      # 24 con đột biến
npm run scouter:bridge-live   # nối thử với máy chủ Bridge THẬT
npm run scouter:input-probe   # phép đo ①: cú bấm của máy có được coi là của người không
```

Luật của gói: `AGENTS.md`. Trạng thái: `STATUS.md`. Nhật ký: `HANDOFF.md`. Việc còn mở: `BACKLOG.md`.
