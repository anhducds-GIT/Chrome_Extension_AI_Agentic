---
status: Accepted
adr: 0010
date: 2026-09-06
deciders: Đức
---

# ADR-0010 — Scouter dừng ở `SEED v0.1`: 25 năng lực, không đi tiếp `SEED v1`

## Bối cảnh

[ADR-0009](0009-scouter-thay-observer-cua-tuong-tac.md) mục ⑺ đặt một cổng: **kiểm kê trước khi
xây**, để Đức cân Scouter với nợ cũ **trên một danh sách đếm được, không phải trên ước lượng
của AI**.

Cổng đó đã qua. `docs/studies/SCOUTER-CAPABILITY-INVENTORY-V1.md` đo ngày 06/09: ba worker dùng
**khoảng một phần năm** bề mặt Chrome mà một tác nhân duyệt web với tới được — 7/34 vùng API
extension, 3/27 miền giao thức debug. 65 dòng năng lực được phân loại: **25 `SEED v0.1`** · 23
`SEED v1` · 6 `ADAPTER` · 14 `KHÔNG CẦN`.

Đối trọng lúc chốt: **58 mục nợ đang mở** và 22 việc đang chờ chính Đức.

## Quyết định

**Scouter làm tới hết `SEED v0.1` rồi DỪNG.** Đức chốt 06/09: *"chốt SEED v0.1 đi, làm tới đó
thôi."*

23 mục `SEED v1` **không nằm trong phạm vi lượt này**. Chúng ở lại bảng kiểm kê làm hồ sơ; muốn
mở phải có một ADR mới.

**Thứ tự bắt buộc, và nó không phải chuyện tuỳ chọn.** Năng lực xếp hạng số một của bảng kiểm kê
— *bấm và gõ như tay người* — nằm trong `SEED v0.1` và **chưa ai đo tận mắt**. Nếu Chrome vẫn
đánh dấu cú bấm đó là "không phải người" thì món đắt nhất trong danh sách sụp, và thứ tự 24 mục
còn lại đổi theo. Nên **phép đo đó là dòng code đầu tiên của Scouter**, trước mọi thứ khác.

## Hệ quả

**Được.** Phạm vi hữu hạn và đếm được: 25 mục, có danh sách, có tiêu chuẩn nghiệm thu. Không có
chỗ cho câu "làm nốt cái này nữa rồi thôi" — thứ đã làm mọi việc lớn trong repo này phình ra.
Và nợ cũ không bị bỏ rơi: 58 mục vẫn là việc song song, không phải việc sau.

**Mất — nói thẳng.** 23 mục `SEED v1` gồm những thứ thật sự có giá: checkpoint, tiếp tục lần
chạy dở, chẩn đoán kế hoạch trước khi tốn credit, bền hoá phê duyệt. Scouter v0.1 sẽ **không có
chúng**, và sẽ có lúc thấy thiếu. Đó là cái giá của việc có một điểm dừng.

**Chưa quyết, và nó sẽ chặn:** chính sách che dữ liệu khi ghi báo cáo xuống đĩa, treo từ
ADR-0007 và chưa được gỡ. Chừng nào chưa chốt thì Scouter **không được ghi nội dung trang xuống
đĩa**. Phần đầu của `SEED v0.1` không cần nó, nên việc chạy được ngay — nhưng nó sẽ tới.

## Trạng thái

Accepted
