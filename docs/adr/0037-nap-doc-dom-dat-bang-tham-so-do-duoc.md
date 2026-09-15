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

Từ 15/09 AI local đọc hội thoại GPT qua `chat.read`. Chữ đọc về vào context của AI gọi, nên
mỗi lượt đọc là một khoản chi — và bốn số đo cùng ngày cho thấy khoản đó **vô hình**.

⑴ **Xin ít không bao giờ báo lỗi** (Đức nêu). DOM hội thoại dài có hàng trăm nghìn ký tự, nên
mọi mức nắp đều trả về kết quả trông đầy đủ như nhau. Nắp là **van tiêu tiền**, không phải cửa
đúng/sai — nên một con số để mỗi phiên tự chọn sẽ luôn được chọn cao hơn.

⑵ **Leo thang là gửi lại TỪ ĐẦU.** `max_chars` cắt `slice(0, n)`, `limit` lấy đuôi — không trục
nào có offset. Nên đặt nắp thấp rồi leo thang **đắt hơn** đặt đúng ngay lần đầu.

⑶ **Hai lượt không dùng chung hạn mức.** Câu hỏi ngắn không nhường phần thừa, nên `2 × 3.000`
thực chất là *"trả lời GPT tối đa 3.000"*. Đo được một lượt **3.058** ký tự đã bị cắt.

⑷ **`BUDGET: xxx w` là lời khai, và nó lệch** — khai `380 w`, viết `3.058` ký tự. Bản nháp đầu
lấy budget × 8 làm nắp đọc, tức để một con số **GPT tự chọn và tự vi phạm** điều khiển ngân sách
phía đọc. GPT Web chỉ đúng chỗ: budget chi phối bên **viết**, `limit`/`max_chars` chi phối bên **đọc**.

Thêm một bẫy có số từ 10/09: `generating: false` **không** chứng minh đã xong — 3/4 lượt báo
`false` khi DOM mới có 48–173 ký tự, reload ra 2.934–3.450.

## Quyết định

**Nắp đọc đặt từ số đo trong payload, không từ lời khai của bên viết.**

```
Mặc định   limit 2 × max_chars_per_turn 3000   → trần 6.000, thường tiêu ~3.500
Thiếu      tăng MỘT lần, tổng ≤ 12.000 / câu hỏi. Chạm trần thì hỏi Đức.
GPT        BUDGET 250 w mọi mode. Audit dài thì CHIA VÙNG, vẫn 250 w.
Ít chữ     chat-reload, đọc lại tham số CŨ — đừng tăng nắp (⑷).
```

`limit` trần 50, chỉ lấy lượt mới nhất, **không lùi được**, chỉ đọc tab đang mở. Header
`[MODE: … | BUDGET: … w]` đếm ra **số vòng reasoning** — `limit` chỉ đếm khung, 4 khung ≈ 2 vòng.

**Không có file protocol riêng.** `docs/` sát trần dòng, và `.repo-structure.json` dặn: văn xuôi
của repo này thì **xoá hoặc chuyển sang ADR**, không nâng trần. `adr/` không tính trần.

## Hệ quả

**Được:** trần xấu nhất 12.000 ký tự (~3.000 token) một câu hỏi, biết trước, không phụ thuộc
hành vi GPT.

**Mất:** GPT phải viết ngắn hơn hiện nay ~35%. `Audit` không còn dài tuỳ ý — chia vùng, một vùng
một lượt. Nới nắp cho một mode là mở đường cho mọi mode, đúng cơ chế đã ăn mòn mọi trần khác ở đây.

**Chưa chắc:** quy đổi 7–8 ký tự/word dựng trên **n = 2** — đủ để đặt 250 w dưới nắp 3.000 có
biên, chưa đủ để siết tiếp. Và chưa đo DOM có giữ **hết** lượt với hội thoại dài không; chưa đo
thì đừng coi trần 50 là ràng buộc thật.

## Trạng thái

Accepted
