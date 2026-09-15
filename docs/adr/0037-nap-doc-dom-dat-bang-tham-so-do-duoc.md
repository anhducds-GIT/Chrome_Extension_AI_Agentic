---
status: Accepted
adr: 0037
decides: [0037]
date: 2026-09-15
deciders: Đức (chốt nắp lần đầu 6.000 và "đừng dùng BUDGET làm giới hạn") · GPT Web (nêu tách hai mặt phẳng) · Claude Opus 5 (đo và soạn)
nhom: bridge
---

# ADR-0037 — Nắp đọc DOM qua Bridge đặt bằng THAM SỐ ĐO ĐƯỢC, không bằng budget GPT tự khai

## Bối cảnh

Từ 15/09 AI local đọc thẳng hội thoại GPT qua `chat.read` để phản biện. Chữ đọc về đi
vào context của AI gọi, nên **mỗi lượt đọc là một khoản chi**, và khoản đó vô hình:
không có gì đỏ khi đọc thừa.

Ba số đo cùng ngày định hình luật này.

**⑴ Leo thang là GỬI LẠI TỪ ĐẦU.** `max_chars_per_turn` cắt bằng `slice(0, n)` và `limit`
lấy phần đuôi — cả hai trục đều không có offset. Xin 3.000 rồi thấy thiếu, xin 6.000 thì
3.000 đầu **đi qua dây lần thứ hai**. Hệ quả ngược trực giác: **đặt nắp thấp rồi leo thang
ĐẮT HƠN đặt nắp đúng ngay từ đầu.** Điểm hoà vốn của bậc đôi là tỉ lệ trúng ngay 83%.

**⑵ Nắp thời gian chặt hơn nắp dung lượng.** Lượt gọi `12 × 16.000` (= 192.000, **dưới**
trần 200.000 của `bridge-core.js`) trả `REQUEST_TIMEOUT`. `4 × 6.000` chạy. Tức trần giấy
tờ không phải ràng buộc thật.

**⑶ `BUDGET: xxx w` là lời khai, và nó lệch.** GPT khai `380 w`, lượt đó đo được **3.058**
ký tự ≈ 400 w. Một bản nháp trước của luật này lấy budget khai × 8 làm nắp đọc — tức để
một con số **GPT tự chọn và tự vi phạm** điều khiển ngân sách context của phía đọc. GPT Web
chỉ ra đúng chỗ đó: budget và nắp đọc là **hai mặt phẳng điều khiển khác nhau**, một cái
chi phối bên viết, một cái chi phối bên đọc.

Thêm một bẫy đã có số từ 10/09: `generating: false` **không** chứng minh câu trả lời đã
xong — 3/4 lượt báo `false` khi DOM mới có 48–173 ký tự, reload ra 2.934–3.450. Một luật
leo thang không phân biệt "nắp chật" với "trang chưa vẽ" sẽ đốt một lượt gọi vào đúng chỗ
nó không chữa được gì.

## Quyết định

**Nắp đọc đặt từ số đo trả về trong payload, không từ lời khai của bên viết.**

1. Mặc định `limit = 2`, `max_chars_per_turn = 6000`. Tăng **một lần** khi thiếu.
2. **Trần tổng 20.000 ký tự một câu hỏi.** Chạm trần thì báo Đức, không tự nới.
3. Đọc ra ít chữ bất thường là *trang chưa vẽ* → `chat-reload`, đọc lại tham số cũ.
   Không tăng nắp — tăng nắp không chữa được cái đó.
4. Budget 6 mode của GPT cố định, đặt **để reply lọt nắp**: `Explain` 250 w · `Plan` 300 w ·
   `Handoff` 350 w · `Research` 400 w · `Implement` 400 w · `Audit` 500 w **một vùng**.
   Audit dài là bài toán **chia vùng**, không phải bài toán nới nắp.

Luật thi hành ở [docs/protocols/BRIDGE-READ.md](../protocols/BRIDGE-READ.md).

## Hệ quả

**Được:** trần xấu nhất 20.000 ký tự (~5.000 token) cho một câu hỏi, biết trước, không
phụ thuộc hành vi của GPT. Bản nháp trước chưa sửa cho phép 96.000.

**Mất:** mặc định 12.000 ký tự **đắt hơn** một mặc định 6.000 ở những câu hỏi chỉ cần liếc.
Đây là đánh đổi có chủ ý theo ⑴ — đọc thừa một lần rẻ hơn đọc thiếu rồi đọc lại.

**Ai phải làm khác đi:** `Audit` không còn được viết dài tuỳ ý. Audit dài là bài toán
**chia theo vùng**, một vùng một lượt. Nới nắp cho một mode là mở đường cho mọi mode —
đây chính là cơ chế đã ăn mòn mọi trần khác trong repo này.

**Mặt xấu chưa gỡ:** bảng quy đổi 7–8 ký tự/word dựng trên **n = 2**. Nó đủ để đặt biên
33–67%, nhưng chưa đủ để ai đó siết biên xuống. Muốn siết thì đo thêm trước.

## Trạng thái

Accepted
