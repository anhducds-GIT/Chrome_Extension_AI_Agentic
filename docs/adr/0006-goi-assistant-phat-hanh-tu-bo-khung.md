---
status: Accepted
adr: 0006
date: 2026-09-05
deciders: Đức
---

# ADR-0006 — Gói Assistant phát hành từ bộ khung; repo này thành người tiêu thụ

## Bối cảnh

Gói Assistant (vai điều phối) được xây và chứng minh ở **repo này** trong hai ngày 04–05/09:
bản đồ việc, cổng nhất quán trạng thái, sổ tay vai kèm hàng rào vai cứng, và suite ghim đi kèm.

Ngày 05/09 Đức chốt đưa gói sang bộ khung `Ark_Repo_Harness`, chia hai chặng. Cả hai đã xong:

- **Chặng A** — bóc mọi định danh riêng của repo này khỏi gói, chứng minh trên một fixture repo
  dựng khác hẳn (tên vùng khác, không đơn vị con, thiếu cả ba sổ, **không có remote**).
- **Chặng B** — đúc vào `template/` và cắt bản phát hành **1.3.0**.

Phép thử cuối đã chạy thật, lần đầu tiên: dựng một repo mới từ bản vừa phát, **không sửa một
dòng nào**, cổng nhất quán trạng thái chạy được ngay và trả `UNKNOWN` (không có remote) — **không
trả `OK`**. Suite ghim 52 phép xanh ở repo mới, xanh trên cả hai kiểu xuống dòng.

Từ lúc đó, **cùng một gói tồn tại ở hai nơi**. Không quyết định thì mỗi nơi sẽ tự đi một hướng,
và cả hai đều tự xưng là bản chuẩn.

## Quyết định

**Bộ khung là nơi phát hành gói Assistant. Repo này là người tiêu thụ.**

Mọi cải tiến gói — `what-next.mjs`, `state-check.mjs`, `ORCHESTRATOR.md`, suite ghim của chúng —
**làm ở bộ khung trước**, phát hành ở đó, rồi mới về repo này. Không làm ngược.

Quan hệ này ghi vào bảng "Sổ tay mở khi cần" của `AGENTS.md`, vì đó là chỗ mọi AI đọc trước khi
đụng vào việc.

## Hệ quả

**Được:** một bản chuẩn duy nhất, có đánh số phiên bản và có sổ phát hành. Repo thứ ba, thứ tư
dựng từ bộ khung sẽ có sẵn gói mà không ai phải chép tay — và chép tay là cách chắc chắn nhất
để hai bản lệch nhau.

**Mất:** cải tiến gói **chậm hơn** ở repo này. Trước đây sửa tại chỗ là xong; nay phải sang bộ
khung, sửa, phát hành, rồi nâng cấp về. Với một sửa nhỏ thì đó là ba bước thay vì một.

**Cám dỗ phải chống, nói thẳng ra đây vì nó sẽ đến:** khi gấp, cách nhanh nhất luôn là sửa thẳng
ở repo này rồi *"đồng bộ ngược sau"*. Lần nào cũng có lý do chính đáng, và **lần đồng bộ ngược
đó sẽ không bao giờ xảy ra** — đó là cách mọi bản fork bắt đầu. Gặp tình huống đó thì hỏi Đức,
đừng tự quyết.

**Hai chỗ chưa xong, biết trước để không tưởng đã có:**

- **Chưa có cơ chế nâng cấp ngược.** Bộ khung có lệnh nâng cấp cho repo dựng từ nó, nhưng repo
  này **không** được dựng từ bộ khung — nó có trước. Nên "về repo này" hiện là việc tay, chưa ai
  đo xem nó tốn bao nhiêu.
- **Hai bản gói hiện đang lệch nhau ở chỗ đã biết:** bản ở bộ khung đã bóc hết định danh riêng
  và đã vá bẫy kiểu xuống dòng; bản ở repo này **chưa**. Chúng khác nhau **có chủ ý** — bản kia
  là bản portable. Nhưng khác nhau thì sớm muộn cũng phải quyết xem có gộp không, và **chưa ai
  quyết**.

## Trạng thái

Accepted
