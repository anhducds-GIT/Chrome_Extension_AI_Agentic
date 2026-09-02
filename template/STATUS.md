---
schema: extension-status/v2
id: repo-goc
name: Đổi thành tên repo của bạn
lifecycle: idea
owner: chua-khai
priority_rank: 1
next_step: "Sửa .repo-structure.json cho khớp repo này, rồi chạy cổng kiểm cấu trúc lần đầu"
version_source: package.json
current_focus: "Repo vừa khởi tạo từ bộ khung; chưa khai gì thêm"
ref_readme: README.md
ref_handoff: HANDOFF.md
---

# Trạng thái — gốc repo

> **Đây là file KHAI BẰNG TAY.** Bảng điều hành đọc phần đầu file này; đừng gõ tay số nào mà
> máy đo được. Khuôn đầy đủ và luật: `STATUS.template.md`.

Repo vừa được khởi tạo từ bộ khung, chưa có việc thật nào.

**Ba việc đầu tiên, theo đúng thứ tự:**

1. Sửa `.repo-structure.json` — khối `units` (đơn vị của bạn nằm đâu) và `areas` (mỗi thư mục
   top-level một dòng).
2. Chạy `npm run dashboard` để sinh cổng vào máy đọc. **Trước bước này, phép kiểm điều hướng
   sẽ báo vàng vì chưa có gì để đi từ đó** — đúng, không phải lỗi.
3. Chạy `npm run bootstrap` để biết repo đang nợ những gì.

Sửa xong ba bước trên thì thay toàn bộ nội dung file này bằng trạng thái thật.
