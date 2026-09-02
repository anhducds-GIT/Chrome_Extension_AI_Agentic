---
status: Accepted
adr: 0067
date: 2026-08-27
deciders: Claude xử lý; hành vi fail-closed giữ theo hợp đồng mục 6
source_section: 2026-08-27 — G-01: sửa hành vi "dừng nhận trước lúc gửi ⇒ không gửi" (owner: Đức, Go trong chat)
migrated_from: workers/duc-auto-gemini/v0.2.0/decisions.md
---

# ADR-0067 — Audit Codex vòng 1: FAIL, 3 phát hiện. (1) HIGH "huỷ lệch danh tính giết attempt…

## Bối cảnh

Luật vàng 4: kiểm chứng độc lập mọi báo cáo — phát hiện 2 tôi tự đọc lại code xác nhận THẬT trước khi sửa; phát hiện 1 tôi bác một nửa có lý do và ghim quyết định bằng test để đời sau khỏi cãi lại từ đầu.

Nhóm trong bản ghi gốc: 2026-08-27 — G-01: sửa hành vi "dừng nhận trước lúc gửi ⇒ không gửi" (owner: Đức, Go trong chat).

## Quyết định

**Audit Codex vòng 1: FAIL, 3 phát hiện.** (1) HIGH "huỷ lệch danh tính giết attempt đang bay" → **giữ nguyên hành vi, ghim làm CHỦ ĐÍCH** (ca 6 của test race): lệnh dừng của người vận hành không bao giờ được bỏ qua im lặng — danh tính chỉ để chống dòng reset xoá lệnh huỷ tới trước, không phải để attempt sống sót qua lệnh dừng; hành vi này cũng chính là hành vi CŨ (mọi abort giữa run đều dừng run), bỏ nó đi mới là làm yếu lớp bảo vệ. (2) MED "break trần sau gate bỏ rơi dòng sổ ở RECONCILING và vẫn đếm terminal" → **sửa thật**: settle job thành `STOPPED/USER_STOP` với lời khai "Stopped by user before submission." rồi mới break, ghim vào test tĩnh. (3) LOW thiếu ca interleaving → thêm ca 6.

## Hệ quả

không ghi lại — bảng gốc trong `workers/duc-auto-gemini/v0.2.0/decisions.md` chỉ có ba cột (Quyết định · Vì sao · Ai chốt), không có mục Hệ quả.
Không bịa thêm: đây là bản ghi lịch sử, không phải bài viết lại.

## Trạng thái

Accepted — chốt ngày 2026-08-27. Người chốt: Claude xử lý; hành vi fail-closed giữ theo hợp đồng mục 6.

Nguồn gốc: không ghi lại

> ADR này được TÁCH RA từ `workers/duc-auto-gemini/v0.2.0/decisions.md` trong phiên S5 (2026-09-02). Chỉ đổi HÌNH DẠNG, không
> đổi một chữ nội dung. Đã Accepted nên **bất biến** — đổi ý thì viết ADR mới và trỏ hai
> chiều, xem `docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md`.
