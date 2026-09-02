---
status: Accepted
adr: 0035
date: 2026-08-25
deciders: Đức (chốt trong phiên Gemini, mở rộng sang package này cùng ngày)
source_section: Roadmap tự hành (chốt sau audit 2026-08-24)
migrated_from: workers/duc-auto-chatgpt/v0.1.0/decisions.md
---

# ADR-0035 — EXCEPTION có kiểm soát cho dòng "Run là của Đức" ở trên, CHỈ trong phát triển

## Bối cảnh

Bridge đã cho AI đọc toàn bộ; một kênh trial có nắp rút chu kỳ debug từ hàng giờ xuống phút với rủi ro thực không đáng kể (1–2 ảnh, nhịp như người)

Nhóm trong bản ghi gốc: Roadmap tự hành (chốt sau audit 2026-08-24).

## Quyết định

**2026-08-25 — EXCEPTION có kiểm soát cho dòng "Run là của Đức" ở trên, CHỈ trong phát triển:** AI được tự kích hoạt **trial run** để test & bắt tín hiệu, với hàng rào cứng ghi trong code (không phải quy ước): (1) công tắc "Chế độ phát triển" trên panel phải BẬT (Đức kiểm soát, có badge hiển thị; TẮT = từ chối); (2) mỗi trial tối đa 2 job, timeout ≤90s; (3) khoảng cách tối thiểu **5–6 phút** giữa các trial (Đức xác nhận quota ảnh dồi dào — nhịp độ là hàng rào, không phải số lượng); (4) mọi trial có nhãn nguồn gốc riêng (`bridge_dev`) trong audit; hard-stop bảo mật/quota giữ nguyên. **Run sản xuất (batch dài, >2 job, hoặc công tắc TẮT) mãi mãi là click của con người; `run.start` vẫn bị cấm trong giao thức — trial là method riêng có nắp.** Implementation cho package này: hạng mục Giai đoạn 2.

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-chatgpt/v0.1.0/decisions.md` chỉ có bốn cột (Quyết định · Vì sao · Ai chốt · Nguồn), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-25. Người chốt: Đức (chốt trong phiên Gemini, mở rộng sang package này cùng ngày).

Nguồn gốc: Memory dùng chung `dev-trial-run-exception`; gốc: `workers/duc-auto-gemini/v0.2.0/decisions.md` (commit `6cf90fd`)

> ADR này được TÁCH RA từ `workers/duc-auto-chatgpt/v0.1.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
