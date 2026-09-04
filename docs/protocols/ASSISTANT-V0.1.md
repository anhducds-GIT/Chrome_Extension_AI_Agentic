---
kind: protocol
status: active
ttl_days: 365
---

# ASSISTANT v0.1 — mục lục gói, và mốc pilot

> **Đây là NHÃN, không phải nơi chứa.** Không file nào bị di chuyển để làm ra trang này.
> Gói Assistant vẫn sống nguyên chỗ cũ; trang này chỉ nói **gói gồm những gì** và **đang ở
> mốc nào**. Chi tiết luật ở [`ORCHESTRATOR.md`](ORCHESTRATOR.md) — đừng chép sang đây.

## 1. Gói gồm sáu thành phần

| Thành phần | Sống ở đâu | Phép ghim |
|---|---|---|
| Sổ tay vai điều phối + Hard Role Firewall | `docs/protocols/ORCHESTRATOR.md` | `tests/role-firewall-smoke.mjs` |
| Bản đồ việc (song song được gì · ai giữ gì · chờ Đức gì) | `scripts/what-next.mjs` | `tests/what-next-smoke.mjs` |
| Cổng nhất quán trạng thái trước khi báo cáo | `scripts/state-check.mjs` | `tests/state-check-smoke.mjs` |
| Cửa vào cho Đức | `PROMPTS.md` mục 0 · 0b · 9 | — |
| Mẫu bàn giao brief → executor | `ORCHESTRATOR.md` mục 4b + `docs/briefs/BRIEF-*.md` | — |
| Hợp đồng máy đọc được | frontmatter `ORCHESTRATOR.md` (`role_scope` · `product_debug` · `product_code`) | `tests/role-firewall-smoke.mjs` |

Hai lệnh đều **chỉ đọc, không đòi khoá nào** — nên phiên điều phối chạy được cả khi mọi vùng
đang có chủ. Đó là điều kiện để vai này luôn rảnh cho Đức hỏi.

## 2. Mốc — đang ở đâu

| Mốc | Trạng thái |
|---|---|
| **V0.1 PACKAGE** — đóng nhãn bundle, không di chuyển file | ✅ **xong** 2026-09-04 |
| **EXTENSION PILOT** — vận hành thật nhiều vòng trên chính repo này | ⏳ **đang chạy** |
| **PORTABLE FREEZE → TEMPLATE** | ⛔ **khoá**, chờ pilot đạt |

Brief promote đã **park**: [`../briefs/BRIEF-ASSISTANT-PROMOTE-01.md`](../briefs/BRIEF-ASSISTANT-PROMOTE-01.md).
Nội dung kỹ thuật trong đó vẫn dùng được khi mở lại — đừng viết lại từ đầu.

## 3. Vì sao chưa promote, dù bốn năng lực đều chạy thật

Cả bốn mới được chứng minh **từng cái một**, mỗi cái đúng một lần. Chưa cái nào chạy qua nhiều
vòng việc liên tiếp, nên chưa biết gói này có **trơn** hay không — và trơn mới là thứ quyết
định nó có đáng nhân bản sang repo khác. Nhân bản một thứ chưa trơn là nhân bản cả chỗ vướng
của nó, sang những repo mà không ai ở đó biết vì sao nó vướng.

## 4. Pilot — điều kiện đạt, đo bằng cái đếm được

Chạy Assistant thật trên repo này **5–10 vòng việc**, và phải đi qua đủ các loại tình huống —
một vòng suôn sẻ lặp lại năm lần không chứng minh gì:

`giao việc` · `gặp blocker` · `nhiều executor cùng lúc` · `nhận một báo cáo sai hoặc thiếu` ·
`chờ Đức` · `việc hoàn tất trọn vẹn`

**Đạt khi cả ba đúng:**

1. **Không lần nào trượt vai** — không có vòng nào phiên điều phối đi code hay debug.
2. **Không sai lệch trạng thái nào ĐỨC phải là người bắt.** Assistant tự thấy trước, hoặc
   `state-check` thấy. Đây là tiêu chí gắt nhất, và cố ý gắt: ngày 04/09 Đức phải tự bắt **hai**
   sai lệch, và đó chính là lý do có mốc pilot này.
3. Chạy ổn qua nhiều vòng liên tiếp, không phải một vòng đẹp rồi dừng.

**Gặp lỗi thì không dừng pilot** — ghi defect, giao executor sửa, chạy tiếp. Chính cách
`ROLE-DRIFT-01` và `STATE-DRIFT-01` đã ra đời. Lỗi tìm được trong pilot là giá trị của pilot,
không phải thất bại của nó.

## 5. Đếm vòng ở đâu

Ở `HANDOFF.md` gốc, mỗi vòng một dòng Log như thường lệ. **Không lập sổ đếm riêng** — một
nguồn sự thật thứ hai cho cùng một việc là đúng cái bệnh cả repo này đang chữa.
