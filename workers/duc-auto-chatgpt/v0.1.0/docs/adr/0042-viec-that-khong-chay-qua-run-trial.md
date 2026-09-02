---
status: Accepted
adr: 0042
date: 2026-08-26
deciders: Đức quyết sau
source_section: Roadmap tự hành (chốt sau audit 2026-08-24)
migrated_from: workers/duc-auto-chatgpt/v0.1.0/decisions.md
---

# ADR-0042 — Việc thật KHÔNG chạy qua run.trial

## Bối cảnh

Cap 90s là chốt an toàn của đường dev, không phải chỗ để nới cho tiện

Nhóm trong bản ghi gốc: Roadmap tự hành (chốt sau audit 2026-08-24).

## Quyết định

**2026-08-26 — Việc thật KHÔNG chạy qua `run.trial`.** Đo được: gửi → phát hiện ảnh mất 40s (1 ảnh) / 61s (2 ảnh) / 68s (4 ảnh) với prompt ngắn. `run.trial` chặn cứng 90s/job và `capTrialTimeouts` từ chối mọi giá trị trên 90. Job thật Pilot-08 là 4 ảnh + prompt 3.825 ký tự → rất có thể vượt. Việc thật phải do Đức bấm Run với timeout của workbook. Muốn AI mở run không bị cap thì phải sửa `POLICY.prohibited_methods` — **chưa làm, chờ Đức** (B-17).

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-chatgpt/v0.1.0/decisions.md` chỉ có bốn cột (Quyết định · Vì sao · Ai chốt · Nguồn), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-26. Người chốt: Đức quyết sau.

Nguồn gốc: Pilot-14

> ADR này được TÁCH RA từ `workers/duc-auto-chatgpt/v0.1.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
