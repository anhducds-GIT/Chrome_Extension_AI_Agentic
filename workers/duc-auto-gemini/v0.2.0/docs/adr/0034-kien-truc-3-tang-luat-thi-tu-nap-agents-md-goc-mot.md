---
status: Accepted
adr: 0034
date: 2026-08-26
deciders: Đức
source_section: 2026-08-26 — Bộ luật đa-AI: luật tự nạp, quy trình mở khi cần (owner: Đức)
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0034 — Kiến trúc 3 tầng: luật thì tự nạp (AGENTS.md gốc — một bản, ba cửa vào), quy trình…

## Bối cảnh

Đức lo "mỗi lần triển khai phải check skill thì tốn thời gian" — lo đúng, nhưng gốc rễ khác: repo không hề có `AGENTS.md`/`CLAUDE.md` ở gốc, nên Codex và Antigravity mở phiên được nạp con số không. Nguyên tắc: **thứ AI phải đi tìm là thứ AI sẽ quên** — nên luật không được phép nằm trong skill.

Nhóm trong bản ghi gốc: 2026-08-26 — Bộ luật đa-AI: luật tự nạp, quy trình mở khi cần (owner: Đức).

## Quyết định

Kiến trúc 3 tầng: **luật thì tự nạp** (`AGENTS.md` gốc — một bản, ba cửa vào), **quy trình thì mở khi cần** (các guide package đã có), **cổng máy kiểm** (`scripts/session-check.mjs`) là tầng cưỡng chế. Không làm "bộ skill phải đi check" như ý tưởng ban đầu của Đức.

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có ba cột (Quyết định · Vì sao · Ai chốt), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-26. Người chốt: Đức.

Nguồn gốc: không ghi lại

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
