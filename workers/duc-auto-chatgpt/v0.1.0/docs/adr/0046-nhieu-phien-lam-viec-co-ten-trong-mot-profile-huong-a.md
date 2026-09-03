---
status: Accepted
adr: 0046
date: 2026-09-03
deciders: Đức
source_section: MULTI-SESSION-PER-PROFILE-DESIGN-V1 (docs/studies/, gốc repo)
---

# ADR-0046 — Nhiều phiên làm việc có tên trong MỘT profile Chrome: hướng A, trần 3, cả hai chiều, ChatGPT trước

## Bối cảnh

Đức chạy nhiều luồng reasoning song song trên nhiều tab GPT Web của CÙNG một
tài khoản, và muốn gọi từng luồng bằng tên qua Bridge — không phải mở thêm
profile Chrome (nặng máy, thêm lần đăng nhập). Bản thiết kế
`MULTI-SESSION-PER-PROFILE-DESIGN-V1.md` (gốc repo, `docs/studies/`) cân ba
phương án và đặt 4 câu hỏi. Đức trả lời ngày 03/09.

## Quyết định

**Đức chốt cả 4 điểm (2026-09-03):**

1. **Hướng A**: mỗi tab được gắn tên thành một "workspace"; extension mở một
   kết nối Bridge riêng cho mỗi workspace với danh tính dẫn xuất
   (`instance_id` = mã phiên, `label` = tên Đức đặt). **Host không sửa một
   dòng nào** — với host, workspace y hệt một profile. Điều kiện Đức nêu rõ:
   đặt tên có hiệu lực NGAY sau khi bấm lưu, kết nối + làm việc được luôn,
   không reset/restart gì.
2. **ChatGPT trước.** Gemini và GG Flow **chưa làm vội** — tối ưu và debug
   xong trên GPT rồi mới migrate sang.
3. **Trần 3** phiên song song trong một profile.
4. **Làm cả hai chiều** (đọc và ghi) — "khả năng tương tác y hệt như hiện
   tại, chỉ đơn giản là thêm profile ID để tách thành 3 nhánh cùng lúc làm
   việc" — không chia hai giai đoạn phê duyệt A1/A2 như bản thiết kế đề xuất.

## Hệ quả

- Bước 1 (commit `54160a2`): ghế workspace + toàn bộ method surface; các
  method chạm tab (`dom_probe`, `system.ping`, `chat.reload`, `run.trial`)
  bind vào tab CỦA phiên gọi. **Khoá một-run-một-lúc giữ nguyên** — ba phiên
  cùng đọc/đề xuất song song được, nhưng vẫn chỉ một run chạy tại một thời
  điểm; muốn N run đồng thời phải tách hàng đợi/ledger theo phiên (việc riêng,
  brief + audit riêng, vẫn thuộc phạm vi "cả hai chiều" đã duyệt).
- Tab đóng hay rời ChatGPT → socket của phiên tự ngắt (host trả
  `TARGET_NOT_CONNECTED`) — tên không bao giờ trôi sang tab khác.
- Luật an toàn không đổi: bắt tay challenge → proof → auth nguyên vẹn cho
  từng ghế; phiên không đọc được danh tính thì bị từ chối auth (không có ghế
  vô danh).

## Trạng thái

Accepted — chốt ngày 2026-09-03. Người chốt: Đức.
