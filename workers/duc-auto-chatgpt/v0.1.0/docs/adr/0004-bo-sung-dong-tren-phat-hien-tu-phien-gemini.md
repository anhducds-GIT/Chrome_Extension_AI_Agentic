---
status: Accepted
adr: 0004
date: 2026-08-25
deciders: Đức (chỉ đạo trực tiếp, dẫn phát hiện từ phiên Gemini)
source_section: Kiến trúc & Agent Bridge
migrated_from: workers/duc-auto-chatgpt/v0.1.0/decisions.md
---

# ADR-0004 — BỔ SUNG dòng trên (phát hiện từ phiên Gemini)

## Bối cảnh

Extension không đọc được folder local nhưng AI đọc được — AI là người cung cấp đường dẫn; kênh Downloads-relative xoá nốt cú click folder trong vòng tự hành

Nhóm trong bản ghi gốc: Kiến trúc & Agent Bridge.

## Quyết định

**2026-08-25 — BỔ SUNG dòng trên (phát hiện từ phiên Gemini):** AI **được** tự nạp vị trí output qua Bridge khi đó là **thư mục con tương đối dưới Downloads** (`output.configure` nhận `output_downloads_subfolder`, đi qua `chrome.downloads` — không cần cử chỉ người). Phiên bootstrap mặc định chế độ Downloads (đúng hình dạng Quick Prompt). Ranh giới vật lý còn lại: bind folder **tuyệt đối** (ngoài Downloads, ví dụ `C:\WORKING ZONE\DucAuto_GPT-Output`) vẫn cần Đức bấm picker — không có cách code nào vượt qua. Base folder output GPT do Đức đặt tên: `DucAuto_GPT-Output` (phân biệt với Gemini)

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-chatgpt/v0.1.0/decisions.md` chỉ có bốn cột (Quyết định · Vì sao · Ai chốt · Nguồn), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-25. Người chốt: Đức (chỉ đạo trực tiếp, dẫn phát hiện từ phiên Gemini).

Nguồn gốc: Phiên 2026-08-25; supersedes một phần ràng buộc "output.configure fail closed / không mặc định Downloads" trong `drafts/AGENT-BRIDGE-TIER1-HANDOFF.md` §1

> ADR này được TÁCH RA từ `workers/duc-auto-chatgpt/v0.1.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
