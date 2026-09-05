---
status: Accepted
adr: 0008
date: 2026-09-06
deciders: Đức
---

# ADR-0008 — Cắt đuôi `HANDOFF.md`, giữ 20 lượt gần nhất, phần cũ sang file lưu trữ

## Bối cảnh

Đo ngày 06/09 (`docs/studies/TOKEN-DIET-V0.md`): luật mục 0 bắt mọi phiên đọc `HANDOFF.md` của
gói mình sắp đụng. Bốn file đó cộng lại là **276.862 token**. Phiên điều phối, vì phải nhìn cả
repo, nạp khoảng **137.800 token** chỉ để mở phiên.

Luật viết "đọc **phần cuối**". Đó là lời khuyên cho **người**: một AI mở file bằng công cụ đọc
file sẽ nạp trọn. Không có cơ chế nào cắt hộ.

`HANDOFF.md` gốc ra đời 02/09 và hôm nay đã **93.837 token**, tăng khoảng **23.000 token mỗi
ngày**. Cứ đà đó thì năm ngày nữa vượt 200.000 — một file, cho một lần mở phiên.

Đức duyệt 06/09: cắt.

## Quyết định

**Mỗi `HANDOFF.md` giữ 20 lượt Log gần nhất tại chỗ. Phần cũ hơn dời sang file lưu trữ cạnh
nó, và ở lại một con trỏ nói rõ lịch sử nằm đâu.**

Đây là lần đầu repo cho phép **viết lại chữ cũ của phiên khác**. Luật mục 1 miễn `HANDOFF.md`
khỏi cơ chế khoá **chỉ khi chỉ thêm dòng ở cuối**; dời dòng cũ **không** nằm trong miễn trừ đó,
nên nó cần đúng một câu duyệt của Đức, và câu đó là ADR này.

**Bốn bất biến, và chúng là điều kiện để việc này được phép làm:**

1. **Không mất một byte nào.** Nối file lưu trữ với phần còn lại phải dựng lại được bản gốc
   **giống hệt từng byte**. Đây là bất biến duy nhất khiến việc này khác với xoá.
2. **Cắt theo VỊ TRÍ trong file, không theo NGÀY.** Đo được: trong `HANDOFF.md` của gói ChatGPT,
   các dòng Log **không xếp theo thứ tự thời gian** — `2026-08-22` rồi `2026-08-24` rồi
   `2026-08-22` lại. "20 lượt gần nhất theo ngày" là một câu **không xác định được**;
   "20 mục cuối theo thứ tự trong file" thì xác định được.
3. **Con trỏ ở lại, đặt chỗ đọc được.** Phiên sau phải biết lịch sử ở đâu mà không cần hỏi ai.
4. **File lưu trữ phải khai vào Bản đồ file** (luật mục 4). Không khai = không tồn tại.

## Hệ quả

**Được:** ước tính **38.000–89.000 token mỗi phiên**, tức bỏ khoảng 86% khối lượng bốn file đó.
Gấp 13–31 lần tổng mọi cách tiết kiệm khác cộng lại. Và nó chặn được đà tăng, không chỉ hạ mức
hiện tại.

**Mất:** lịch sử xa hơn 20 lượt **không còn nằm trên đường đọc mặc định**. Ai cần nó phải mở
thêm một file. Đó là cái giá thật, và nó chấp nhận được **chỉ vì** bất biến ⑴ — chữ vẫn còn
nguyên, chỉ đổi chỗ.

**Chỗ dễ hỏng, đo được, ghi ra để đừng làm ẩu — bốn file có HAI hình dạng khác nhau:**

| File | Hình dạng | Số mục |
|---|---|---|
| `HANDOFF.md` gốc | mục `##` mỗi lượt | 55 |
| `workers/duc-auto-gg-flow-video/…` | mục `##` mỗi lượt | 27 |
| `workers/duc-auto-chatgpt/…` | **gạch đầu dòng `-` trong một mục `## Log`** | 5 mục `##` |
| `workers/duc-auto-gemini/…` | như trên | 9 mục `##` |

Hai file cuối là **hai file to nhất** (252KB và 186KB) mà **gần như không có mục `##` nào để
cắt theo**. Một phép cắt chỉ biết mục `##` sẽ chạy qua chúng, báo thành công, và **không cắt
được gì** — đúng loại xanh giả repo này đã gặp nhiều lần. Phép cắt phải xử lý **cả hai hình
dạng**, và phải **chứng minh bằng số** là nó cắt thật ở cả bốn file.

**Chưa quyết:** có tự động hoá việc cắt định kỳ không. Lượt này làm tay một lần. Nếu đà tăng
23.000 token/ngày giữ nguyên thì sáu tuần nữa sẽ phải cắt lại — lúc đó mới đáng bàn công cụ.

## Trạng thái

Accepted
