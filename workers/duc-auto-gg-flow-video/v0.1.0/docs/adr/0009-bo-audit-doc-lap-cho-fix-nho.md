---
status: Accepted
adr: 0009
date: 2026-09-02
deciders: Đức
source_section: "2026-09-02 — Bỏ audit độc lập cho fix nhỏ (Đức chốt trong chat)"
migrated_from: workers/duc-auto-gg-flow-video/v0.1.0/decisions.md
---

# ADR-0009 — Bỏ audit độc lập cho fix nhỏ

## Bối cảnh

**Vì sao (lời Đức):** audit rất chậm và tốn thời gian; Đức muốn tăng tốc.

## Quyết định

**Chốt:** với các sửa nhỏ, **không chạy audit độc lập nữa** — làm thẳng, gặp bug thì sửa thẳng.

**Điều này ĐI NGƯỢC `AGENTS.md` gốc mục 2**, chỗ đang ghi điều kiện push cho code là *"đã qua
audit độc lập"*. Ghi lại đây để phiên sau không tưởng là tôi quên luật. **Chưa sửa `AGENTS.md`**
— sửa hiến pháp repo là việc riêng, cần Đức chốt câu chữ (nhất là ranh giới "fix nhỏ" là gì).

**Ranh giới đang áp dụng, chờ Đức xác nhận nếu thấy sai:**

- **Bỏ audit** — sửa đường bằng chứng/log, sửa chữ hiển thị, sửa phép kiểm, đổi tài liệu,
  vá nhỏ có test ghim + mutation.
- **VẪN audit** — đụng lớp an toàn Đức đã liệt ở `AGENTS.md` mục 2 (retry, halt, attribution,
  persistence, exact-once), đụng đường tiêu credit, hay đổi bắt tay Bridge.

Lý do giữ nhóm sau: đó đúng là chỗ audit đã bắt được lỗi thật trong ngày 02/09 — một chữ trong
câu báo lỗi làm `classifyFailure` đổi `OTHER` → `RECEIVER_LOST` và dừng cả mẻ job (F-20).
Phần còn lại thì test ghim + mutation đã đủ, và nhanh hơn nhiều.

**Vẫn giữ nguyên, không đổi:** suite phải xanh, cổng `session-check.mjs` phải xanh, mỗi fix
một test ghim, và push bằng `safe-push.mjs`.

## Hệ quả

**Chỗ chưa đóng, tính tới 09/09 — bảy ngày sau khi chốt:** `AGENTS.md` gốc **mục 2** vẫn ghi
nguyên điều kiện *"với code thì đã qua audit độc lập"*, và **quyết định này chỉ nằm trong sổ của
MỘT gói**. Nghĩa là hiến pháp repo và chốt của Đức đang nói ngược nhau, và ai chỉ đọc hiến pháp
sẽ không biết.

Đây đúng là ca mà `docs/protocols/RULE-COMPILER.md` bước ④ bảo phải **DỪNG và hỏi Đức**: một
chốt của Đức đá với một bất biến cứng đang có, và ranh giới *"fix nhỏ"* thì chưa ai chốt câu chữ.
Không tự sửa hiến pháp ở lượt tách ADR này.

## Trạng thái

Accepted.

> Tách ra từ `workers/duc-auto-gg-flow-video/v0.1.0/decisions.md` ngày 2026-09-09 (N-55).
> Chỉ đổi HÌNH DẠNG, không đổi một chữ nội dung quyết định.
