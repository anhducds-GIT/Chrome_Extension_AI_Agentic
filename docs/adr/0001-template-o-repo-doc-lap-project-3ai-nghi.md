---
status: Accepted
adr: 0001
date: 2026-09-02
deciders: Đức
---

# ADR-0001 — Template ở một repo độc lập; Project 3AI kết thúc vai trò

## Bối cảnh

Ngày 2026-09-01, quyết định **K0 số 1** chốt **huỷ** repo `repo-template` độc lập: bộ chuẩn đã
kiểm chứng sẽ promote vào **Kho (Project-3)** ở tier `SEED` của `sync_manifest.json`. Lý do ghi
lại lúc đó: *dựng một repo template riêng tạo nguồn sự thật thứ hai bên cạnh Kho.*

Quyết định K0 **chưa bao giờ được ghi thành ADR** — nó chỉ sống dưới dạng văn xuôi ở
`docs/studies/ROADMAP-CLEAN-AND-TEMPLATE-V1.md` mục 1, kèm hồ sơ
`evidence/20260901-harness-audit-r01/`.

Ngày 2026-09-02, Đức bổ sung hai dữ kiện làm nền của K0 số 1 không còn đứng được:

1. **Project 3AI (gốc của Kho) đã lâu không còn được triển khai.** Đức: *"repo đó đã xong nhiệm
   vụ của nó rồi"*, và **sau này archive cũng không ảnh hưởng**.
2. **Template không thuộc về dự án nào.** Nó là sản phẩm dùng độc lập, còn được nâng cấp qua
   nhiều phiên bản.

Nỗi lo của K0 là **hai tác giả cùng khai "chuẩn là gì"**. Nếu Kho nghỉ thì nỗi lo đó biến mất
theo — vì khi ấy chỉ còn **một** nơi giữ chuẩn, chính là repo template.

Số đo ủng hộ việc tách: `AGENTS.md` có 161 dòng luật, **chỉ 14 dòng mang tên dự án**, và 13
trong số đó nằm gọn ở mục 6 (Bản đồ file) — vốn dĩ là bản đồ địa phương, đáng lẽ không đi theo
template. Tách luật ra khỏi dự án là **cắt một mục**, không phải viết lại.

## Quyết định

**Template sống ở một repo độc lập, không thuộc dự án nào.**

**Project 3AI kết thúc vai trò.** Nó có thể được archive; không cần sửa `sync_manifest.json`,
không cần hoàn tất K-MIGRATE.

**Hệ thống mới xoay quanh template**, và template phải mang đủ tám thứ: harness · rules ·
structure · folder · dashboard · protocol audit · protocol migrate · khởi tạo mới.

Quyết định này **thay thế K0 số 1**. Vì K0 chưa từng là ADR, không có ADR nào để chuyển sang
`Superseded`; thay vào đó mục 1 của roadmap được gắn dấu trỏ về đây.

## Hệ quả

**Được:**

- **S9 hết bị chặn.** Nó đang chờ K-MIGRATE; nay không promote vào Kho nữa nên điều kiện tiên
  quyết biến mất.
- **Làn B nghỉ hẳn** — K-MIGRATE · K2 (công cụ đo lệch) · K3 (chụp mốc) · K5 (rải chuẩn qua
  manifest) đều dựng trên giả định Kho đang sống. Bốn mốc rời khỏi lộ trình.
- Chỉ còn **một** nơi giữ chuẩn, nên không còn khả năng hai chỗ nói khác nhau.

**Mất, và phải nói thẳng:**

- **Mất cơ chế phát hành đã có.** `sync_manifest.json` dù hỏng vẫn là một thiết kế phát hành
  hoàn chỉnh. Bỏ nó thì phải dựng cơ chế mới — hướng đã bàn là **kéo về + ghim phiên bản**
  (mỗi repo khai `harness_version`), rẻ hơn nhưng **chưa có dòng code nào**.
- **Hai trong tám thứ template phải mang thì CHƯA TỒN TẠI**, không phải trích ra là có:

  | Thành phần | Trạng thái hôm nay |
  |---|---|
  | harness · rules · structure · folder | **Có, đã chứng minh** — trích ra là dùng được |
  | dashboard | **Có nền máy sinh**, thiếu lớp hiển thị cho người |
  | **protocol audit** | **CHƯA CÓ.** Chỉ có `docs/briefs/AUDIT-PROMPT-S2-GPT.md` — một prompt cho một phiên, không phải quy trình. Kỷ luật audit hiện nằm trong luật vàng 4 và trong thói quen, chưa thành văn |
  | **protocol migrate · khởi tạo mới** | **CHƯA CÓ.** Không tài liệu, không script. `scripts/` có 5 file, không file nào làm việc này |

- **Phải thu hoạch Project 3AI trước khi archive.** Archive rồi mới phát hiện trong đó có thứ
  đáng giữ thì đã muộn. Việc này thuộc GPT — Claude Code không đọc được repo khác.

## Trạng thái

Accepted
