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
| **ASSISTANT PILOT** — 20–30 câu hỏi thật của Đức, trên chính repo này | ⏳ **đang chạy** |
| **PORTABLE FREEZE → TEMPLATE** | ⛔ **khoá**, chờ pilot đạt |

Brief promote đã **park**: [`../briefs/BRIEF-ASSISTANT-PROMOTE-01.md`](../briefs/BRIEF-ASSISTANT-PROMOTE-01.md).
Nội dung kỹ thuật trong đó vẫn dùng được khi mở lại — đừng viết lại từ đầu.

## 3. Vì sao chưa promote, dù bốn năng lực đều chạy thật

Cả bốn mới được chứng minh **từng cái một**, mỗi cái đúng một lần. Chưa cái nào chạy qua nhiều
**câu hỏi thật liên tiếp** của Đức — đơn vị đo của mốc pilot là câu hỏi, không phải vòng việc
(mục 4) — nên chưa biết gói này có **trơn** hay không, và trơn mới là thứ quyết
định nó có đáng nhân bản sang repo khác. Nhân bản một thứ chưa trơn là nhân bản cả chỗ vướng
của nó, sang những repo mà không ai ở đó biết vì sao nó vướng.

## 4. Pilot — điều kiện đạt, đo bằng CÂU HỎI THẬT của Đức

Đơn vị đo là **câu hỏi**, không phải vòng việc — vì Đức chốt 04/09 rằng trọng tâm v0.1 là
**phản hồi theo câu hỏi**, không phải tự chọn việc (luật đầy đủ: [`ORCHESTRATOR.md`](ORCHESTRATOR.md)
mục 0b). Đo cái không còn là trọng tâm thì con số đẹp cũng không chứng minh gì.

Kiểm **20–30 câu hỏi thật của Đức**, rải qua vài ngày. Mỗi câu chấm **đúng một nhãn**:

| Nhãn | Nghĩa |
|---|---|
| `ANSWERED` | trả lời được ngay từ repo, không phải hỏi lại Đức, không phải đoán |
| `UNKNOWN` | repo không nói — Assistant trả lời thẳng là không biết |
| `STATE-DRIFT` | **Đức** là người bắt ra một sai lệch trạng thái |
| `ROLE-DRIFT` | Assistant đi code / debug product / đề xuất patch |
| `DASHBOARD-STALE` | bảng không phản ánh quyết định đã phát sinh |

**Đạt khi đủ cả năm:**

1. **≥90% câu `ANSWERED`** — trả lời được ngay từ repo.
2. **Không lần nào `STATE-DRIFT`** — tức không sai lệch nào **Đức** phải là người bắt.
3. **Không lần nào `ROLE-DRIFT`**.
4. **Không lần nào `DASHBOARD-STALE`** — bảng phản ánh đúng các quyết định đã phát sinh.
5. **Assistant không tự kéo Đức sang việc Đức chưa hỏi** — không lượt nào tự mở topic.

Hai chỗ đếm sai rất dễ, và cả hai làm con số vô nghĩa:

- **`UNKNOWN` KHÔNG phải thất bại.** Repo không nói thì "không biết" là câu trả lời **đúng** —
  đoán mới là lỗi. Nhưng nó **đếm riêng, không gộp vào `ANSWERED`**. Gộp là làm đẹp số bằng
  cách xoá mất tín hiệu duy nhất cho biết repo đang thiếu chỗ nào.
- **`STATE-DRIFT` chỉ tính khi ĐỨC là người bắt.** Assistant tự thấy trước, hoặc
  `state-check.mjs` thấy, thì **không tính** — đó chính là cơ chế chạy đúng. Tiêu chí này cố ý
  gắt: ngày 04/09 Đức phải tự bắt **hai** sai lệch, và đó là lý do có mốc pilot này.

**Gặp lỗi thì không dừng pilot** — ghi defect, giao executor sửa, chạy tiếp. Chính cách
`ROLE-DRIFT-01` và `STATE-DRIFT-01` đã ra đời. Lỗi tìm được trong pilot là giá trị của pilot,
không phải thất bại của nó.

### Defect phụ — không phải trọng tâm đóng gói

`EXEC-CRASH-01` (phiên executor chết giữa chừng, mất việc chưa commit) là **supporting
defect**: chỉ sửa **khi nó cản vòng hỏi–đáp**, không nằm trong điều kiện đạt ở trên. Cách
sống chung đang dùng và đủ dùng: **commit ngay sau mỗi việc nhỏ xong**, đừng dồn một lượt.

## 5. Đếm câu hỏi ở đâu

Ở `HANDOFF.md` gốc, mỗi phiên một dòng Log như thường lệ, ghi kèm số câu và nhãn đã chấm.
**Không lập sổ đếm riêng** — một nguồn sự thật thứ hai cho cùng một việc là đúng cái bệnh cả
repo này đang chữa.
