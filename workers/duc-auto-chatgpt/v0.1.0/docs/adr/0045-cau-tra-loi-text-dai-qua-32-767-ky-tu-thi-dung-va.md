---
status: Accepted
adr: 0045
date: 2026-08-28
deciders: Đức
source_section: Roadmap tự hành (chốt sau audit 2026-08-24)
migrated_from: workers/duc-auto-chatgpt/v0.1.0/decisions.md
---

# ADR-0045 — Câu trả lời text dài quá 32.767 ký tự thì DỪNG và KHÔNG lưu gì cả

## Bối cảnh

Thà dừng còn hơn lưu thiếu mà người đọc không biết; và 1% giới hạn thì chưa đáng viết thêm code

Nhóm trong bản ghi gốc: Roadmap tự hành (chốt sau audit 2026-08-24).

## Quyết định

**2026-08-28 — Câu trả lời text dài quá 32.767 ký tự thì DỪNG và KHÔNG lưu gì cả. Giữ nguyên, không cắt bớt, không tách file.** Excel giới hạn cứng một ô 32.767 ký tự; `text-output-core.js` `capture()` ném `TEXT_RESPONSE_TOO_LARGE` và job thành INTERRUPTED, halt cả batch. Claude trình bày ba phương án cho Đức: (A) giữ nguyên, (B) cắt và ghi rõ đã cắt, (C) lưu đầy đủ ra `.txt` riêng, ô Excel trỏ tên file. **Đức chọn (A).** Cơ sở đo được: ba job trial live 28/08 dài 180/178/177 ký tự — **chưa tới 1%** giới hạn — vì prompt của Đức có `BUDGET: 35 w`. Nên đây là vấn đề lý thuyết với cách dùng hiện tại, và thêm code cho nó là thêm chỗ để sai. **Điều phải nói thẳng về cái giá:** ChatGPT đã tốn một lượt sinh ra câu trả lời đó rồi, và nó mất trắng — không cắt, không lưu tạm đâu cả. Đổi lại: không bao giờ có chuyện Đức đọc một ô Excel tưởng là đầy đủ mà thực ra thiếu đuôi. **Khi nào Đức bỏ giới hạn độ dài trong prompt thì mở lại và làm (C)** — xem B-27.

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-chatgpt/v0.1.0/decisions.md` chỉ có bốn cột (Quyết định · Vì sao · Ai chốt · Nguồn), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-28. Người chốt: Đức.

Nguồn gốc: Phiên 2026-08-28, sau trial live `Quick-2026-08-28T02-46`

> ADR này được TÁCH RA từ `workers/duc-auto-chatgpt/v0.1.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
