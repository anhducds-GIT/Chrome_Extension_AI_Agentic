---
status: Accepted
adr: 0041
date: 2026-08-26
deciders: Đức
source_section: Roadmap tự hành (chốt sau audit 2026-08-24)
migrated_from: workers/duc-auto-chatgpt/v0.1.0/decisions.md
---

# ADR-0041 — references.add cho GPT: hiện thực hoá nguyên tắc "AI là bộ não, người dùng là cánh…

## Bối cảnh

Điểm chặn nào bỏ được thao tác người thì bỏ; nhưng không được tạo đường song song

Nhóm trong bản ghi gốc: Roadmap tự hành (chốt sau audit 2026-08-24).

## Quyết định

**2026-08-26 — `references.add` cho GPT: hiện thực hoá nguyên tắc "AI là bộ não, người dùng là cánh tay", KHÔNG phải luật mới.** Đức bác lập luận "AI không đưa được ảnh tham chiếu" của Claude và chỉ sang worker Gemini. Đúng: Gemini đã có method đó, GPT thiếu, và nó vốn đã nằm trong B-07 như một port chưa làm. Claude đã trình bày một port thành một bức tường — sai ở chỗ đó. Ảnh do Bridge nạp phải **giống từng trường** ảnh do picker nạp, để không sinh ra đường gắn ảnh thứ hai mà run thật của Đức không bao giờ chạm.

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-chatgpt/v0.1.0/decisions.md` chỉ có bốn cột (Quyết định · Vì sao · Ai chốt · Nguồn), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-26. Người chốt: Đức.

Nguồn gốc: `ad61685`; xác minh live Pilot-14

> ADR này được TÁCH RA từ `workers/duc-auto-chatgpt/v0.1.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
