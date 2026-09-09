---
status: Accepted
adr: 0028
decides: [0028]
date: 2026-09-02
last_reviewed: 2026-09-09
deciders: Đức
---

# ADR-0028 — Chọn nhãn cấu hình trên trang là việc của AI, và bốn luật cho nó

> Ghi thành ADR ngày **09/09**, bảy ngày sau khi Đức chốt. Chậm là có lý do đã khai sẵn:
> `workers/duc-auto-gg-flow-video/v0.1.0/AGENTS.md` để lại một dòng **NỢ** nói rằng luật này
> áp cho mọi extension nhưng chỉ viết được trong một gói, *"vì `docs/adr/` ở gốc repo cần
> quyền `_root` mà phiên khác đang giữ"*. Đó là một món nợ **tự khai đúng cách** — nó nói cả
> việc còn thiếu lẫn điều kiện để làm. Đây là lượt trả.

## Bối cảnh

Đức chốt 2026-09-02: **chọn nhãn cấu hình là việc AI nên tự làm được**, và **không riêng gói
`duc-auto-gg-flow-video`** — mọi extension trong repo. Trước đó Đức phải tự đặt Video mode và
tự sửa chip `x{n}` mỗi phiên.

Đường đã chứng minh chạy được (F-14/F-26, bằng chứng
`workers/duc-auto-gg-flow-video/v0.1.0/evidence/F14-mode-probe-vi-20260902.json`):

1. `pressFlowControl(chip)` — bắn chuỗi `pointerdown` → `mousedown` → `pointerup` → `mouseup` →
   `click`. **`element.click()` trần KHÔNG mở được bảng cấu hình của Flow.**
2. Bảng mở ra thì **liệt kê được** toàn bộ nút cấu hình rời (`360p` `720p` · `4s`…`10s` ·
   `16:9` `9:16` · `x1`…`x4`).
3. Bấm nút cần, rồi **ĐỌC LẠI nhãn tóm tắt** để kết luận.

## Quyết định

**AI được tự chọn nhãn cấu hình trên trang**, ở mọi extension, dưới **bốn luật rút ra từ chỗ đã
trả giá**:

1. **Nhãn phải có bằng chứng DOM, không dịch tay.** `arrow_forward Create` bị dịch thành
   `arrow_forward Tạo`; nhưng `videocam Video` thì KHÔNG bị dịch. Suy từ ca này sang ca kia đã
   sai một lần (F-24 là báo động giả của chính AI). Đo trước, ghi probe vào `evidence/`, rồi mới
   thêm nhãn kèm trích nguồn.
2. **Mờ là từ chối.** Đòi **đúng một** ứng viên khớp **chính xác** nhãn. Bảng cấu hình nằm cạnh
   những nút đổi đơn giá (720p tốn gấp đôi 360p) — mờ ở đó là **mờ về tiền**.
3. **Cú bấm không phải bằng chứng; nhãn tóm tắt mới là bằng chứng.** Bấm xong phải đọc lại. Một
   hàm trả về phán quyết mà nó không tự đọc được là code nói dối.
4. **Mở bảng thì phải đóng lại, và phải GHI LẠI vào sổ cái.** Một thay đổi cấu hình do AI tự làm
   mà không để dấu vết thì Đức không còn cách nào biết. Xem trường `output_chip`.

Luật này **không** mở thêm cửa nào của `AGENTS.md` gốc mục 3 (*Phải hỏi Đức trước*): nó nói AI
được bấm nút cấu hình sẵn có trên trang, không nói AI được thêm quyền, chạy pilot live, hay nới
một trần an toàn.

## Hệ quả

**Được:** Đức thôi phải đặt tay Video mode và chip `x{n}` mỗi phiên. Và luật thoát khỏi một gói
— gói `duc-auto-gemini` và `duc-auto-chatgpt` nay có căn cứ để làm cùng việc mà không phải đọc
sổ của nhánh video.

**Mất, và biết trước:** luật 2 (*mờ là từ chối*) sẽ làm AI **dừng và hỏi** ở những trang có nhãn
gần giống nhau, kể cả khi con người nhìn là biết ngay. Đó là đổi tốc độ lấy an toàn về tiền, và
đổi có chủ ý: một lượt bấm nhầm `720p` thành `360p` không báo lỗi, nó chỉ **tiêu gấp đôi**.

**Chỗ chưa với tới:** ba bằng chứng DOM hiện chỉ có cho trang Flow. Hai gói kia muốn dùng thì
phải tự đo trang của mình — luật 1 cấm suy từ trang này sang trang khác, và đó chính là chỗ
F-24 đã vấp.

## Trạng thái

Accepted.
