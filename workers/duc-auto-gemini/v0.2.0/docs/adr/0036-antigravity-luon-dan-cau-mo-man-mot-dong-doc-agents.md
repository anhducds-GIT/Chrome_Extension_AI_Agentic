---
status: Accepted
adr: 0036
date: 2026-08-26
deciders: Đức + Claude đề xuất
source_section: 2026-08-26 — Bộ luật đa-AI: luật tự nạp, quy trình mở khi cần (owner: Đức)
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0036 — Antigravity: luôn dán câu mở màn một dòng — *"Đọc AGENTS.md ở gốc repo trước khi…

## Bối cảnh

Thử live 26/08: Antigravity đọc `AGENTS.md`, tự lần ra `.agents/claims.json`, trả lời đúng chủ sở hữu, và **tự suy ra hệ quả không ai hỏi**: "package này đang có chủ nên tôi chỉ có quyền đọc". Luật không chỉ đọc được mà dùng được. Nhưng câu hỏi thử có nhắc tên file, nên **chưa chứng minh được nó TỰ nạp lúc mở phiên**. Không xây hệ thống mà tính đúng đắn phụ thuộc vào một hành vi chưa kiểm chứng của công cụ bên thứ ba — hành vi đó còn có thể đổi giữa các bản. Câu mở màn tốn 3 giây, miễn nhiễm với mọi thay đổi phiên bản, và nếu nó vốn đã tự nạp thì câu đó chỉ là thừa vô hại.

Nhóm trong bản ghi gốc: 2026-08-26 — Bộ luật đa-AI: luật tự nạp, quy trình mở khi cần (owner: Đức).

## Quyết định

**Antigravity: luôn dán câu mở màn một dòng** — *"Đọc AGENTS.md ở gốc repo trước khi làm gì."* — bất kể nó có tự nạp hay không.

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có ba cột (Quyết định · Vì sao · Ai chốt), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-26. Người chốt: Đức + Claude đề xuất.

Nguồn gốc: không ghi lại

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
