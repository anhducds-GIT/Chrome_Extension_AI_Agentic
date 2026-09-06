---
status: Accepted
adr: 0012
date: 2026-09-06
deciders: Đức
---

# ADR-0012 — `HANDOFF.md` lọc theo NỘI DUNG, không lọc theo thời gian

> Thay phần ⑵ của [ADR-0011](0011-handoff-chan-o-dau-vao-va-xoay-theo-thang.md) (xoay file theo
> tháng). Ba phần còn lại của ADR-0011 **giữ nguyên**.

## Bối cảnh

`ADR-0011` chốt xoay `HANDOFF.md` theo tháng: hết tháng thì nội dung cũ thành file lưu trữ.

Cùng ngày Đức nêu một đặc điểm thật của các dự án của mình, và nó phá vỡ giả định của lược đồ đó:

> *"Các dự án thường bị bỏ đi một thời gian rồi mới quay lại làm. Một dự án bỏ đi hai tháng và
> tôi quay lại làm tiếp thì sẽ rất khó để catch up."*

Xoay theo tháng tối ưu cho **kích thước file**, nhưng **mù với giá trị**. Dự án ngủ hai tháng
rồi mở lại: `HANDOFF.md` rỗng hoặc chỉ còn tháng vừa rồi, trong khi thứ người quay lại cần —
**việc nào còn đang mở** — nằm trong file lưu trữ của hai tháng trước. Đúng lúc cần nhất thì nó
biến mất khỏi đường đọc mặc định.

## Quyết định

**Sàng lọc `HANDOFF.md` theo NỘI DUNG, không theo thời gian.** Đức chốt 06/09:

> *"Thay vì filter theo ngày, ta filter theo content."*

**Tiêu chí ở lại — một câu:** một mục ở lại chừng nào nó còn nói về thứ **chưa đóng**. Việc còn
mở, quyết định còn hiệu lực, trạng thái chưa bị mục sau thay thế.

**Tiêu chí dời đi:** mọi thứ mục đó nhắc tới **đã đóng trọn**, và không còn gì đứng lại từ nó.

**Tuổi KHÔNG phải tiêu chí.** Một mục ba tháng tuổi mà còn nói về việc đang mở thì **ở lại**;
một mục hôm qua mà mọi thứ trong đó đã đóng thì **đi**.

**Lượt sàng lọc là một lượt CÓ NGƯỜI/AI XEM, không phải cổng tự chạy.** Lý do đo được ngày
06/09: bộ đếm của bảng tính một mục là *đã đóng* **chỉ vì tiêu đề mở đầu bằng chữ "Đóng"**. Máy
nhận diện "đã đóng" sai được, và archive nhầm một mục còn mở là mất đúng thứ lược đồ này tồn
tại để giữ. Máy **gợi ý** ứng viên; người/AI **quyết**.

**Khi không chắc thì GIỮ.** Giữ thừa tốn token; dời nhầm làm phiên sau không tìm ra thứ họ cần.
Hai cái giá đó không ngang nhau.

## Hệ quả

**Được.** Người quay lại sau hai tháng mở `HANDOFF.md` là thấy **đúng thứ còn dang dở**, không
phải "nhật ký tháng Chín". Và vấn đề thứ tự biến mất: `ADR-0008` bất biến ⑵ cấm cắt theo ngày vì
các mục Log **không xếp theo thứ tự thời gian** — lọc theo nội dung **không cần thứ tự nào**.

**Mất — và đây là lý do một phần của `ADR-0011` phải sống tiếp.** Xoay theo tháng có đúng một
cái lợi mà lược đồ này **không** có: nó chặn file phình **mà không cần ai phán đoán**. Giai
đoạn bận rộn mà mọi việc đều còn mở thì lọc theo nội dung dời được **0 mục**, và file cứ thế
lớn.

Nên **hai cơ chế phải đi cùng nhau, bỏ cái nào cũng hỏng**:

| Cơ chế | Chặn cái gì | Nguồn |
|---|---|---|
| **Trần độ dài mỗi mục** | file phình | `ADR-0011` ⑴ — **giữ nguyên** |
| **Lọc theo nội dung** | xác nằm lại | ADR này |

**Chưa quyết:** nhịp sàng lọc. Không gắn với lịch — gắn với một dấu hiệu đo được (ví dụ: số mục
vượt ngưỡng). Đề xuất rồi mới chốt.

## Trạng thái

Accepted
