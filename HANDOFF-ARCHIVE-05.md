# HANDOFF lưu trữ — HANDOFF.md, 1 mục cũ

> **Đây là phần đuôi đã cắt của [`HANDOFF.md`](HANDOFF.md) cạnh file này.**
> Sinh bằng `node scripts/handoff.mjs --cat HANDOFF.md --giu 20` theo
> [ADR-0008](docs/adr/0008-nhat-ky-phien.md) — cắt ngày 2026-09-09.
>
> Cắt theo **vị trí trong file**, không theo ngày (bất biến ⑵ của ADR): file kia giữ **20
> mục cuối**, 1 mục trước đó nằm ở đây — **nguyên văn, không sửa một chữ**.
>
> **Dựng lại bản gốc:** thay khối con trỏ trong `HANDOFF.md` (phần giữa dòng `## Log` và
> tiêu đề `##` đầu tiên) bằng toàn bộ phần dưới dấu `ARCHIVE-BODY-START` ở đây — ra đúng bản
> gốc **từng byte**. SHA-256 bản gốc trước khi cắt: `d77e945121b06fc6f2402a6fcc3bc883f58dd5f09ba2db114e4be23482c9f5b4`.
>
> **Chỉ đọc.** Ghi Log mới thì ghi vào `HANDOFF.md`, đừng ghi vào đây.

<!-- ARCHIVE-BODY-START -->

<!-- HANDOFF-THANG: 2026-09 -->

<!-- HANDOFF-CUT-POINTER: ADR-0008 -->
> **1 mục cũ hơn đã dời sang [`HANDOFF-ARCHIVE-04.md`](HANDOFF-ARCHIVE-04.md)** — cùng thư mục này,
> nguyên văn, không mất chữ nào. File này giữ **20 mục cuối** (ADR-0008). Cần đào lịch sử
> xa hơn thì mở file đó và đi tiếp theo con trỏ trong nó; ghi Log mới thì vẫn ghi vào cuối
> file này.
<!-- /HANDOFF-CUT-POINTER -->

## 2026-09-08 · `claude-scouter-s06` — bảng hiện DANH TÍNH từng extension

Đức đặt: *"cập nhật vào dashboard danh tính của 2 extension, cả chức năng, khả năng… protocol
sử dụng cũng nên được đưa vào. Đơn giản, dễ hiểu, cô đọng."*

**Sửa NGUỒN, không sửa bảng.** `DASHBOARD.md` là máy sinh — gõ tay vào đó thì mất ở lần sinh
sau, và trong lúc chưa mất thì nó nói sai. Nên: ba trường **tuỳ chọn** trong `STATUS.md`
(`lam_duoc` · `khong_lam_duoc` · `dung_the_nao`) + `ref_runbook` trỏ sổ tay, rồi hai bộ sinh đọc.

- `DASHBOARD.md` → **khối C** mới, mỗi extension ba dòng.
- Trang HTML → khối *"Nó là cái gì"* trong thẻ từng extension (tầng **Việc**).

**Chỉ vẽ đơn vị NÀO CÓ KHAI.** Bốn gói cũ không khai nên không hiện dòng nào — một danh sách
nửa là *"chưa khai"* thì người đọc học cách bỏ qua cả khối.

**Dòng KHÔNG LÀM ĐƯỢC đứng ngang hàng dòng làm được**, cố ý: hai extension này khác nhau chủ
yếu ở chỗ chúng **không** làm gì. HNX Fetch không bấm được — đó là tính năng, không phải thiếu
sót, và là lý do gói đó tồn tại riêng.

**Một lỗ suýt mở lại.** Ba trường mới là chữ tự do hiện thẳng lên bảng, mà bộ dò *"số của máy"*
chỉ soi frontmatter theo **danh sách tên** — nên trường mới **không tự được soi**. Quên thêm tên
là gõ tay được *"4 lệnh Bridge"* vào bảng và không gì đỏ lên. Đã thêm vào danh sách và ghim cả
hai chiều: gõ tay số máy-đo thì **bị bắt**, còn số kiểm chứng (`25/25`) và giới hạn an toàn
(`trần 200 lượt`) thì **được tha**.

> Kèm một chỗ tự sửa: chú thích đầu tiên tôi viết nhắc hàm `luatSoMayGiu()` — **không tồn tại**.
> Tên thật là `detectStatusMachineOwnedFacts()`.

**Đo.** Suite gốc repo **379** · dashboard smoke **102** (trước 100) · overview smoke **36**
(trước 35) · `check-bootstrap` 0 đỏ.

