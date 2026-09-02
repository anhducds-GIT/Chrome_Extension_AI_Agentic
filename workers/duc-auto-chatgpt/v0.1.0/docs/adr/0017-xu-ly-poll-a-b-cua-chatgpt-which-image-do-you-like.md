---
status: Accepted
adr: 0017
date: 2026-08-25
deciders: Đức (chính sách random 1/2) + bằng chứng sống 2026-08-25
source_section: Quy ước dữ liệu / workbook
migrated_from: workers/duc-auto-chatgpt/v0.1.0/decisions.md
---

# ADR-0017 — Xử lý poll A/B của ChatGPT ("Which image do you like more?")

## Bối cảnh

Poll ép tương tác, chặn vòng tự hành; Đức thử gõ "1"+Enter trực tiếp và không gửi được

Nhóm trong bản ghi gốc: Quy ước dữ liệu / workbook.

## Quyết định

**2026-08-25 — Xử lý poll A/B của ChatGPT ("Which image do you like more?"):** khi 1 lượt sinh 2 ảnh + poll bắt chọn, extension **tự CLICK** trả lời — mặc định random ảnh 1/2 (config: `click_1`/`click_2`/`skip` — link Skip có thật, chữ nhỏ góc phải khối poll). Phương án trả lời bằng cách GÕ vào composer đã bị **bác bằng thử nghiệm sống**: composer khoá Enter khi poll treo. Poll chưa trả lời = blocker readiness (job kế sẽ treo WAITING_READY). Cả 2 ảnh của lượt đó đều được lưu (`__variant-01/02`) theo khái niệm "1 job có thể nhiều ảnh"

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-chatgpt/v0.1.0/decisions.md` chỉ có bốn cột (Quyết định · Vì sao · Ai chốt · Nguồn), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-25. Người chốt: Đức (chính sách random 1/2) + bằng chứng sống 2026-08-25.

Nguồn gốc: Screenshot + thử nghiệm của Đức trong phiên chatgpt-package; **ĐÃ IMPLEMENT 2026-08-25** (wave A/B-poll)

> ADR này được TÁCH RA từ `workers/duc-auto-chatgpt/v0.1.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
