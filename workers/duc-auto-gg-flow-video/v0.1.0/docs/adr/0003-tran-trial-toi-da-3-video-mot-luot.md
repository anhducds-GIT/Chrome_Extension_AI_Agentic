---
status: Accepted
adr: 0003
date: 2026-08-27
deciders: Đức
source_section: "2026-08-27 — Đức chốt trần trial nhánh video: TỐI ĐA 3 VIDEO một lượt"
migrated_from: workers/duc-auto-gg-flow-video/v0.1.0/decisions.md
nhom: an-toan-khi-chay
---

# ADR-0003 — Trần trial nhánh video: tối đa 3 video một lượt

## Bối cảnh

Kế hoạch FLOW đề xuất ≤2 job ([ADR-0002](0002-luat-an-toan-nhanh-video.md)). Đức đo lại theo
ngân sách gói free của Google Flow và chốt con số khác.

## Quyết định

Đức chốt trong chat (27/08): *"trial chỉ tạo tối đa 3 Video 15 credit thôi nhé, tổng là
45 credit, đó là giới hạn free."* → Trần cứng cho `run.trial` của nhánh này là **3 job/chuỗi**
(thay đề xuất ≤2 trong kế hoạch FLOW). 15 credit/video là số đo hiện tại của gói free —
con số credit có thể đổi theo Google, trần 3 video thì không tự đổi. Code hoá ở F-04
(`dev-trial-core.js`) trước khi gỡ khoá bootstrap.

## Hệ quả

không ghi lại — bản ghi gốc không có mục Hệ quả.

## Vế đã chết

- **0003 — trần cứng 3 job một chuỗi.** Chết **05/09** ở F-22 (lane `claude-flow-no`): trần chuỗi trial nay **suy từ
  chip cấu hình đang hiển thị** — ngân sách một tài khoản free là 50 credit chia cho đơn giá
  đọc được trên chip (360p x1 được 7 · 720p x1 chỉ 3 · 360p x3 chỉ 2). `MAX_TRIAL_JOBS = 7`
  trong `dev-trial-core.js` là **trần tuyệt đối**, chip chỉ được HẠ xuống, không bao giờ nâng.
  Luật đang sống ở `AGENTS.md` của gói, **luật vàng 2**.

  **Cái KHÔNG chết:** nguyên tắc *"video trừ credits thật nên trần phải suy từ ngân sách, không
  thừa kế nhánh ảnh"* — F-22 làm đúng nguyên tắc đó chặt hơn, không bỏ nó.

  > Ghi 09/09: con số 3 này còn nằm trong `AGENTS.md` luật 3 của gói tới tận hôm nay — **hai con
  > số an toàn khác nhau trong cùng một file**. Đã sửa cùng lượt tách ADR này.

## Trạng thái

Accepted.

> Tách ra từ `workers/duc-auto-gg-flow-video/v0.1.0/decisions.md` ngày 2026-09-09 (N-55).
> Chỉ đổi HÌNH DẠNG, không đổi một chữ nội dung quyết định.
