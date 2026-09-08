---
status: Accepted
adr: 0015
decides: [0015]
last_reviewed: 2026-09-09
date: 2026-09-07
deciders: Đức
---

# ADR-0015 — Nâng trần `run.trial` lên 900 giây; `run.start` vẫn cấm

## Bối cảnh

Đo live 26/08 (Pilot-14), gói ChatGPT: thời gian từ lúc gửi tới lúc phát hiện ảnh **tăng theo số
ảnh tham chiếu** — 40 giây (1 ảnh) · 61 giây (2 ảnh) · **68 giây (4 ảnh)**, với prompt *ngắn*
(~200–300 ký tự).

Job thật của Pilot-08 là **4 ảnh + prompt 3.825 ký tự**. Ở 68 giây đã chỉ còn dư 22 giây, và
prompt dài hơn một bậc.

Trần đường thử là **90 giây**, cưỡng chế trong `bridge-core.js` (`capTrialTimeouts` ném lỗi khi
`capSec > 90`). Hệ quả vận hành, không phải bug: **việc thật của Đức không chạy được qua đường
AI.** Nó phải do Đức tự bấm Run với `timeout` của workbook — Pilot-08 đặt **900**.

Nên trần 90 giây không bảo vệ ai khỏi cái gì. Nó chỉ đẩy đúng những job thật sang tay Đức, và
biến mọi báo cáo "job chết ở mốc ~90 giây" thành một câu dễ đọc nhầm là lỗi tính năng.

Đây là **đổi luật an toàn** (`AGENTS.md` mục 2), nên AI không tự quyết. Đức chốt 07/09.

## Quyết định

**Trần của `run.trial` lên 900 giây. `run.start` vẫn nằm trong `POLICY.prohibited_methods`.**

Hai vế, và vế thứ hai quan trọng ngang vế thứ nhất:

- **Nới đúng cái đo được.** 900 là con số workbook của Đức đang dùng thật, không phải một số
  tròn chọn cho đẹp. Không bỏ trần — bỏ trần là bỏ luôn thứ chặn một vòng lặp hỏng chạy vô hạn.
- **Không mở đường cho AI tự khởi động run thật.** Đức nói rõ ở lượt chốt: nới đường thử cho
  khớp việc thật, **không** trao cho AI khả năng tự tiêu credit. `run.start` giữ nguyên trạng
  thái cấm.

## Hệ quả

**Được.** Việc thật chạy được qua đường AI, nên vòng debug khép lại được: AI mở job, đọc kết quả,
sửa, chạy lại — mà không phải nhờ Đức bấm giữa mỗi vòng. Và các báo cáo "chết ở mốc 90 giây"
biến mất khỏi sổ, vì cái sinh ra chúng biến mất.

**Mất — đây là chỗ phải nhìn thẳng.** Trần 90 giây, dù không bảo vệ ai khỏi việc tiêu tiền, vẫn
là một **cái phanh về thời gian**: một job hỏng chỉ giữ đường thử 90 giây. Nay nó giữ tới 15
phút. Với một lane chạy đêm, đó là 15 phút một job hỏng nằm chiếm chỗ mà không ai thấy.

Nên hai điều kiện đi kèm, và chúng là phần của quyết định này, không phải lời khuyên:

1. **`run.trial` phải báo tiến độ, không im tới lúc hết giờ.** Một đường 900 giây mà im lặng thì
   không phân biệt được "đang chạy" với "đã treo" — đúng cái bệnh mà chính hôm nay Đức đã chỉ ra
   ở vai điều phối: *chờ và làm trông giống hệt nhau*.
2. **Trần khai ở một chỗ, không gõ cứng ở hai nơi.** `capTrialTimeouts` là chỗ cưỡng chế; con số
   phải đọc từ cấu hình. Hai bản sao của một con số đã trả hai câu khác nhau trong repo này rồi.

**Chỗ dễ hiểu nhầm:** ADR này **không** nói job thật nên chạy qua `run.trial`. Nó nói đường thử
không được **hẹp hơn** việc thật tới mức vô dụng. Ranh giới giữa `trial` và `start` vẫn nguyên.

## Trạng thái

Accepted
