# Bằng chứng: Phiên làm việc theo tab (workspace seats) — 2026-09-03

> Thư mục bằng chứng — CHỈ THÊM, không sửa, không xoá (luật mục 4 AGENTS.md gốc).

## Cái gì được ship

ADR-0046 (Đức chốt 4 điểm 03/09): một profile Chrome gắn tên tối đa 3 tab ChatGPT,
mỗi tab một ghế Bridge riêng (instance_id = mã phiên, label = tên Đức đặt), host
không sửa một dòng nào. Ba commit code:

| Commit | Nội dung |
|---|---|
| `54160a2` | Bước 1: bridge-workspace-core.js + tách transport thành ghế + panel + test |
| `821eefa` | Đóng 6 phát hiện audit Codex vòng 1 (4 HIGH, 1 MED, 1 LOW) |
| `a7a5201` | Đóng 3 HIGH audit Codex vòng 2 |

## Ba vòng audit Codex (kênh auditmin, bypass-sandbox, thư mục cách ly)

- **Vòng 1** (`AUDIT-r1-*.md`): FAIL — 4 HIGH thật: (1) rollover pairing có thể gửi
  token MỚI cho host chỉ mới chứng minh token CŨ; (2) tab_id tái sử dụng sau khi
  Chrome khởi động lại → tên phiên trôi sang tab lạ; (3) workspace_id nhái
  instance_id của profile (store độc hại) → hai ghế đá nhau trên host; (4) thiếu
  `tabs.onReplaced`. +1 MED (đọc identity song song lúc chưa có bản ghi có thể mint
  2 id) +2 LOW (thiếu pin hồi quy; file test chứa byte điều khiển thô → git coi là
  binary). Tất cả được chấp nhận và vá ở `821eefa`.
- **Vòng 2** (`AUDIT-r2-*.md`): FAIL — xác nhận các vá vòng 1 nhưng bắt thêm 3 HIGH
  trong chính lớp vá: (1) `loadPairingNow` đổi pairing trên đĩa mà không đóng ghế
  cũ; (2) dấu phiên trồng TRƯỚC khi vô hiệu liên kết (không crash-consistent) +
  fail-open khi thiếu storage.session; (3) đóng ghế khi tab chết đi qua hàng đợi —
  hàng đợi nghẽn là ghế chết sống thêm. Vá ở `a7a5201`.
- **Vòng 3** (`AUDIT-r3-*.md`): **PASS** — cả 3 mục FIXED, "no new functional
  defect", file đính kèm khớp byte với commit `a7a5201`.

## Mutation (3 harness đính kèm, chạy trên cây đã commit)

- `mutation-workspace.mjs`: 13/13 đỏ (M1…M13 — tab guard, onRemoved, onUpdated,
  workspace-trên-port, ghế-vô-danh, trần 3, trùng tên, trùng tab, cycle khi đổi
  tên, cổng UPSERT, trần normalizeStore, fail-closed panel, bind run theo phiên).
- `mutation-audit-fixes.mjs`: 5/5 đỏ (đóng-đồng-bộ khi PAIRING_SET, onReplaced,
  vô hiệu theo phiên trình duyệt, mã nhái, serialize identity).
- `mutation-round2.mjs`: 4/4 đỏ (rollover qua loadPairing, thứ tự vô-hiệu-trước-
  dấu-sau, onReplaced đồng bộ, fail-closed khi vắng storage.session).

**Tổng: 22/22 mutation đỏ.** Suite 101/101 xanh (chạy lặp 8 lần sau cùng).

## Ghi nhận trung thực

1. Chốt epoch `pairingAtProof` trong handshake là **phòng thủ tầng hai không ghim
   được bằng outcome-test**: với đóng-đồng-bộ đứng trước, không còn interleaving
   nào chạm được nhánh đó. Đã xác nhận tĩnh ở audit vòng 2 (finding 1) và vòng 3.
2. Một lần duy nhất `bridge-multiprofile-transport-async-smoke.mjs` đỏ khi chạy
   cả suite ngay sau loạt mutation (máy đang tải nặng); chạy lại 8 lần liên tiếp
   đều xanh, chạy đơn lẻ xanh. Nghi flake nhịp 5ms của fake-timer dưới tải — đã
   ghi vào HANDOFF là việc mở, chưa đủ bằng chứng để sửa test.
3. Commit `54160a2` chứa file test còn byte điều khiển thô nên diff hiển thị
   "Binary files differ" — không sửa được hồi tố; từ `821eefa` file đã sạch và
   diff đọc được (audit vòng 2 finding 4, chấp nhận).
