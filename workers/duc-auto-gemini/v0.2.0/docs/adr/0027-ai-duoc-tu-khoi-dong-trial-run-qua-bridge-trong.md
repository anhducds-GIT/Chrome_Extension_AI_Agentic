---
status: Accepted
adr: 0027
date: 2026-08-25
deciders: Đức (đề xuất) + Claude (phân tích, đồng thuận với 4 hàng rào)
source_section: 2026-08-25 — Development trial-run exception (owner: Đức)
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0027 — AI được TỰ khởi động "trial run" qua Bridge trong giai đoạn phát triển, qua một…

## Bối cảnh

Bridge đã cho AI đọc toàn bộ trạng thái; mảnh thiếu duy nhất của vòng self-develop là quyền chạy thử nhỏ. Vòng debug thực tế (lỗi quota giả 25/08) mất ~1 giờ chờ phối hợp cho 5 phút chẩn đoán. Trial 1–2 ảnh nhịp chậm: rủi ro thực tế không đáng kể; rủi ro thật là vòng lặp mất kiểm soát nên chặn bằng trần cứng + công tắc trong tay owner.

Nhóm trong bản ghi gốc: 2026-08-25 — Development trial-run exception (owner: Đức).

## Quyết định

AI được TỰ khởi động "trial run" qua Bridge trong giai đoạn phát triển, qua một phương thức riêng (không phải run.start), với trần cứng trong code: công tắc "Chế độ phát triển" trong panel phải BẬT; ≤2 job/trial; timeout ≤90s; delay 20–30s giữa job; ≤6 trial/giờ; audit gắn nhãn nguồn bridge_dev; hard-stop security/quota giữ nguyên. Run sản xuất (batch dài, >2 job, hoặc công tắc TẮT) vĩnh viễn chỉ do người bấm; `run.start` vẫn bị cấm trong giao thức.

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có ba cột (Quyết định · Vì sao · Ai chốt), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-25. Người chốt: Đức (đề xuất) + Claude (phân tích, đồng thuận với 4 hàng rào).

Nguồn gốc: không ghi lại

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
