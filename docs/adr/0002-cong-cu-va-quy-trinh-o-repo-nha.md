---
status: Accepted
adr: 0002
date: 2026-09-03
deciders: Đức (uỷ quyền cho phiên hoàn thiện bộ khung)
---

# ADR-0002 — Công cụ đo/khởi tạo và hai quy trình ở REPO NHÀ, không đi theo bản trích

## Bối cảnh

ADR-0001 chốt: *"template phải mang đủ tám thứ: harness · rules · structure · folder · dashboard
· protocol audit · protocol migrate · khởi tạo mới."*

Khi làm tới hai món cuối, một mâu thuẫn lộ ra:

- `scripts/assess.mjs` (đo một repo cách chuẩn bao xa) và `scripts/init-repo.mjs` (dựng repo mới)
  **đều cần biết "chuẩn" là gì**, và nguồn duy nhất của chuẩn là bộ sinh `build-template.mjs`.
- Bộ sinh **cố ý không đi theo bản trích** — luật trích đã ghi từ K1: *bộ máy và bộ luật thì ĐI;
  bản đồ địa phương, trạng thái, trang máy sinh thì Ở LẠI*. Bộ sinh template thuộc nhóm ở lại,
  vì nó là thứ **tạo ra** bản trích, không phải thứ bản trích cần để sống.

Nên nếu chép hai công cụ đó sang mọi repo, chúng sẽ không chạy được ở đó. Còn nếu chép cả bộ
sinh sang, thì **mỗi repo trở thành một nguồn chuẩn thứ hai** — đúng nỗi lo đã dùng để huỷ
quyết định K0 số 1, và đúng cái bệnh cả chương trình này sinh ra để chữa.

## Quyết định

**Tám món của ADR-0001 là yêu cầu với HỆ THỐNG quanh bộ khung, không phải với từng bản sao.**

Chia làm hai nhóm, theo một câu hỏi duy nhất: *"repo đích có cần thứ này để tự sống không?"*

| Ở REPO NHÀ | ĐI THEO BẢN TRÍCH |
|---|---|
| `scripts/assess.mjs` — đo một repo khác | 5 công cụ vận hành (sinh trang · hai cổng · đẩy an toàn · đọc cấu hình) |
| `scripts/init-repo.mjs` — dựng repo mới | Luật ba tầng + bản mẫu |
| `scripts/build-template.mjs` — nguồn của chuẩn | Suite hạt giống |
| `docs/protocols/KIEM-MOT-REPO.md` | Cấu hình hình dạng repo |
| `docs/protocols/CHUYEN-REPO-LEN-CHUAN.md` | |

**Lý do gọn trong một câu:** repo đích cần *sống theo chuẩn*, không cần *phát hành chuẩn*.

**Hệ quả thực dụng:** đo và migrate luôn chạy **từ repo nhà, trỏ sang repo đích**. Không có
lệnh nào để chạy bên trong repo đích, và đó là chủ ý.

## Cái giá, nói thẳng

Repo nhà trở thành **điểm chết một mối**: mất nó thì không ai đo hay dựng repo mới được nữa.
Chấp nhận, vì hai lẽ:

1. Repo nhà là một repo git — nhân bản là chuyện của `git clone`, không cần cơ chế riêng.
2. Cái mất khi có **N nguồn chuẩn** lớn hơn nhiều: chúng lệch nhau âm thầm, và lúc lệch thì
   không ai biết tin bản nào. Bệnh đó đã xảy ra hai lần trong repo này ở quy mô nhỏ hơn nhiều
   (hai bản regex quy chủ, 26/08; hai hàm quy vùng, 02/09) và cả hai lần đều **im lặng**.

## Điều này KHÔNG quyết

Không nói repo đích vĩnh viễn không được có công cụ đo. Nếu sau này cần một phép tự-kiểm chạy
tại chỗ, cách đúng là để bộ sinh **phát kèm một bản kê chuẩn** (danh sách file + vân tay) để
repo đích tự so — chứ không phải chép bộ sinh đi. Lúc đó viết một ADR thay thế.
