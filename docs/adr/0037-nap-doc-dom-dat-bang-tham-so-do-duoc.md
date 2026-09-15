---
status: Accepted
adr: 0037
decides: [0037]
date: 2026-09-15
deciders: Đức (chốt nắp TỔNG 6.000 = 2 × 3.000, và "đừng dùng BUDGET làm giới hạn") · GPT Web (nêu tách hai mặt phẳng) · Claude Opus 5 (đo và soạn)
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

1. Mặc định `limit = 2`, `max_chars_per_turn = 3000` (trần 6.000). Tăng **một lần** khi thiếu.
2. **Trần tổng 12.000 ký tự một câu hỏi.** Chạm trần thì báo Đức, không tự nới.
3. Đọc ra ít chữ bất thường là *trang chưa vẽ* → `chat-reload`, đọc lại tham số cũ.
   Không tăng nắp — tăng nắp không chữa được cái đó.
4. **`BUDGET 250 w` cho MỌI mode**, một con số chứ không phải sáu. Audit dài là bài toán
   **chia vùng**, không phải bài toán nới nắp.

### Cách làm, đủ để thi hành — không có file protocol riêng

`docs/` đang sát trần dòng và `.repo-structure.json` dặn rõ: văn xuôi của repo này thêm vào
`docs/` thì **xoá hoặc chuyển sang ADR**, không nâng trần. `adr/` không tính trần, nên phần
thi hành nằm ngay đây.

```
Mặc định   limit 2 × max_chars_per_turn 3000      → trần 6.000, thường tiêu ~3.500
Thiếu      tăng MỘT lần, tổng ≤ 12.000 / câu hỏi. Chạm trần thì hỏi Đức.
GPT        BUDGET 250 w mọi mode. Audit dài thì CHIA VÙNG, vẫn 250 w.
Ít chữ     chat-reload rồi đọc lại tham số CŨ — đừng tăng nắp.
```

`limit` trần 50, luôn lấy lượt mới nhất, **không lùi được**, và chỉ đọc đúng tab đang mở.
Cần giữ tri thức qua nhiều phiên thì **chốt vào file**, đừng nới nắp đọc.

GPT mở đầu mọi câu trả lời bằng `[MODE: … | BUDGET: … w | RULES: ✓]`. Đếm dòng đó ra **số
vòng reasoning** đã đọc — `limit` chỉ đếm khung, 4 khung thường là 2 vòng.

## Hệ quả

**Được:** trần xấu nhất 12.000 ký tự (~3.000 token) cho một câu hỏi, biết trước, không
phụ thuộc hành vi của GPT. Mức tiêu thường gặp ~3.500, vì nắp là TRẦN chứ không phải hạn
mức luôn tiêu.

**Mất — và đây là cái giá thật:** hai lượt **không dùng chung hạn mức**. Câu hỏi ngắn không
nhường phần thừa, nên `2 × 3.000` thực chất là *"câu trả lời GPT được tối đa 3.000"*. Đo
15/09, một lượt 3.058 ký tự **đã bị cắt**. Vì vậy **GPT phải viết ngắn hơn hiện nay ~35%**.

**Ai phải làm khác đi:** GPT xuống `250 w` cho mọi mode. `Audit` không còn được viết dài
tuỳ ý — chia theo vùng, một vùng một lượt. Nới nắp cho một mode là mở đường cho mọi mode,
đây chính là cơ chế đã ăn mòn mọi trần khác trong repo này.

**Mặt xấu chưa gỡ:** quy đổi 7–8 ký tự/word dựng trên **n = 2**. Đủ để đặt 250 w dưới nắp
3.000 có biên, chưa đủ để ai đó siết tiếp. Muốn siết thì đo thêm trước.

**Một nhắc nhở cho phiên sau:** `chat.read` **không bao giờ báo lỗi vì xin ít**. DOM hội
thoại dài có hàng trăm nghìn ký tự, nên mọi mức nắp đều trả về kết quả trông đầy đủ như
nhau. Nắp là **van tiêu tiền**, không phải cửa đúng/sai — nên đọc thừa hoàn toàn vô hình,
và một con số để mỗi phiên tự chọn sẽ luôn được chọn cao hơn.

## Trạng thái

Accepted
