---
status: Proposed
adr: 0024
date: 2026-09-08
deciders: Đức
---

# ADR-0024 — Mở băng toàn bộ: cả năm gói extension đều sống trở lại

## Bối cảnh

Ngày 07/09 Đức chốt đóng băng ba gói `duc-auto-*` (`chatgpt` · `gemini` · `gg-flow-video`) và
giữ **một** gói sống. Ngày 08/09 nâng lên **hai** ([ADR-0021](0021-hnx-fetch-tach-thanh-extension-rieng.md)).
Chiều 08/09 Đức mở băng toàn bộ, nguyên văn: *"tôi mở băng để chuẩn bị làm các extension đó."*

**Lý do đóng băng, và nó có còn đúng không.** Số đo dựng nên quyết định 07/09: bảy ngày, **738
commit**, trong đó chỉ **78 (11%)** chạm mã extension chạy thật, còn **468 (63%)** chạm tài liệu
và sổ nợ. Kết luận rút ra hồi đó: *hệ đang tự bảo trì chính nó*, nên cắt số gói sống là cắt số
mặt phải bảo trì.

Số đó **không sai**, nhưng nó đo một giai đoạn: giai đoạn dựng bộ máy. Đóng băng là **cái phanh
tạm**, không phải cái đích — mục tiêu của repo này chưa bao giờ là ít extension, mà là extension
chạy được. Đức mở băng vì đã tới lúc làm đúng việc đó.

**Ba gói này khác gói mới ở một chỗ đắt:** chúng là **fork của nhau** — 82.252 dòng, ba file
`sidepanel.js` riêng dài 6.451 · 5.230 · 5.206 dòng. Mở băng không xoá sự thật đó.

## Quyết định

**⑴ Cả năm gói đều SỐNG.** Không còn trần số gói. Giới hạn ① của `AGENTS.md` — *"HAI gói sống"* —
đi ra.

**⑵ Cơ chế đóng băng Ở LẠI, danh sách để rỗng.** `frozen` trong `.repo-structure.json` thành `[]`,
**không** bị gỡ khỏi cấu hình và **không** bị gỡ khỏi mã. Ba chỗ đọc nó — cổng đóng phiên (bỏ
suite), bản đồ việc (mục `B2 · ĐÃ ĐÓNG BĂNG`), phép ghim `tests/frozen-suite-smoke.mjs` — giữ
nguyên. Đóng băng là **công tắc**, và Đức bật lại được bằng một dòng cấu hình.

**⑶ Việc gánh thay trần vừa bỏ là giới hạn ⑥ và ②, không phải một trần mới.**
Giới hạn ⑥ (tối đa **2 chat** song song) chặn số việc chạy cùng lúc. Giới hạn ② (cấm cài một tính
năng hai lần) chặn ba fork phình tiếp. **Không nới thêm cái nào trong hai** — chúng vừa nhận thêm
tải.

## Hệ quả

**Được.** Đức làm được việc mình muốn làm. Ba gói có **25 mục nợ đang mở** (22 · 3 · 0) nay hiện
trở lại trên bản đồ việc thay vì nằm ở mục *"chỉ được ĐỌC"*.

**Mất — nói thẳng:**

**⑴ Trần số gói là thứ DUY NHẤT chặn số mặt phải bảo trì, và nó vừa biến mất.** Số đo 07/09 vẫn
đúng: 63% commit là tài liệu và sổ nợ. Mở băng ba gói là mở lại ba sổ nợ, ba `HANDOFF.md`, ba
`STATUS.md`. Nếu bảy ngày tới tỉ lệ đó không giảm thì cái phanh này phải quay lại, và lần đó phải
kèm số chứ không kèm cảm giác.

**⑵ Suite của bốn bản gói quay lại chuỗi cổng.** Đo 07/09: **52,4 giây** mỗi lượt tuần tự cho
**330 phép kiểm**. Bộ chạy song song (`N-43`) đã hấp thụ phần lớn chi phí đó, nhưng nó **không
hấp thụ được rủi ro**: một phép kiểm mục ruỗng trong ba gói ấy nay chặn được lane đang làm gói
khác — thứ mà đóng băng sinh ra để cắt.

**⑶ Ba fork sống lại cùng lúc nghĩa là mỗi lỗi chung phải sửa BA LẦN.** Đã xảy ra thật 07/09 với
phép kiểm zoom di sản (`N-14`). Đường ra đã có sẵn — `workers/_shared/` — nhưng nó chỉ có tác
dụng nếu người sửa dùng nó **trước** khi chép sang gói thứ hai.

## Chỗ dễ làm sai, ghi ra để lượt sau đừng vấp

- **Đừng gỡ khối `frozen` khỏi cấu hình cho "sạch".** Rỗng ≠ thừa. Gỡ đi rồi dựng lại là viết lại
  cả cơ chế lần thứ hai, và lần đó sẽ thiếu vài chốt của lần đầu.
- **Đừng đọc mở băng thành "ba gói này lại là ưu tiên".** Nó chỉ nói *được phép*. Thứ tự ưu tiên
  vẫn đọc ở `priority_rank` của từng `STATUS.md`.
- **Hai gói `duc-auto-*` đang có lane giữ khoá lúc mở băng** (`gg-flow-video`, `gemini`, cùng
  27 giờ). Mở băng **không** trả khoá hộ ai — luật mục 1 vẫn nguyên: ba đường hợp lệ để một khoá
  được trả, không có đường thứ tư.

## Trạng thái

Proposed
