---
kind: study
status: superseded
ttl_days: 180
---

# Audit + brief — Gate #7 "Sự thật máy sinh còn tươi"

> **Yêu cầu bởi:** GPT, 2026-08-27 — *chưa implement gate, audit ngữ nghĩa concurrency trước.*
> **Người viết:** Claude (`opus-platform-2`). **Trạng thái:** chờ Đức + GPT chốt.
> Nâng `EXPECTED_CHECKS` 6 → 7 là **đổi hiến pháp cổng**. Không tự làm.

## 1. Giả thuyết của GPT — ĐÚNG, và đây là bằng chứng đo được

GPT lo rằng hai `--check` đọc toàn bộ working tree, nên việc làm dở của phiên khác sẽ chặn oan
phiên hiện tại — đúng loại chặn oan mà `session-check.mjs` đã cố ý thiết kế để tránh.

**Thử thật 2026-08-27:** tạo một file `.js` chưa commit trong package Gemini (giả lập phiên
khác đang làm dở), rồi chạy hai cổng. **Cả hai đỏ:**

| Cổng | Kết quả | Đỏ vì |
|---|---|---|
| `build-dashboard --check` | exit 1 | cột "Code đổi sau kiểm chứng?" đổi `KHÔNG` → `CÓ (1 file đang sửa dở, CHƯA commit)` |
| `feature-parity --check` | exit 1 | số file module Gemini `33` → `34` |

Một phiên đang làm **ChatGPT** sẽ bị chặn bởi việc của phiên đang làm **Gemini**. Không phải
suy đoán — đo được, lặp lại được.

**Mở rộng thêm một đường GPT chưa nêu:** cả hai cổng cũng đỏ vì *chính việc chưa commit của
bạn*, kể cả trong package bạn sở hữu. Nghĩa là gate #7 chạy trên working tree sẽ **luôn đỏ**
suốt lúc đang làm, và chỉ xanh ở đúng khoảnh khắc cây sạch. Cổng chỉ có nghĩa **sau commit**.

## 2. Phát hiện thứ hai — lỗi của tôi ở V0.2-A, và nó chặn đường gate #7

Cột **"Code đổi sau kiểm chứng?"** hiện ghi được chuỗi `CÓ (N file đang sửa dở, CHƯA commit)`
**vào chính `DASHBOARD.md`** — một file được commit.

Câu đó đúng **đúng một khoảnh khắc**: lúc sinh trang. Ngay khi commit, những file "đang sửa
dở" ấy **đã được commit**, và câu đó thành sai — nằm lại trong repo cho tới lần sinh sau.

Đây là **"sai ngay khi ghi ra"**, cùng họ với lỗi dấu HEAD tự tham chiếu. Nó do tôi thêm vào ở
V0.2-A và không vòng audit nào bắt được, vì lúc đó chỉ có file `.md` bị bẩn nên cột luôn hiện
`KHÔNG`. Phép thử ở mục 1 mới làm nó lộ ra.

**Hệ quả kiến trúc:** cột này khiến gate #7 **không thể** so bản-sinh-từ-HEAD với bản-đã-commit,
vì tại HEAD không có gì "đang sửa dở" — hai bên luôn khác nhau. Tín hiệu dirty và một cổng
dựa trên HEAD **loại trừ nhau**.

### Đề xuất, và tôi nghiêng hẳn về phương án A

**A. Đưa tín hiệu dirty ra khỏi file, chuyển thành cảnh báo in ra màn hình.**
Artifact được commit **chỉ ghi sự thật đã commit**. Còn "anh đang có 2 file `.js` sửa dở chưa
commit trong package này" là *cảnh báo lúc chạy*, in ra stdout — hữu ích y hệt, và không bao
giờ mục vì không được lưu.
Sửa cả lỗi tự-nói-sai lẫn mở đường cho gate #7. Mất mát: người đọc `DASHBOARD.md` trên GitHub
không thấy tín hiệu đó — nhưng tín hiệu đó vốn **không đúng** trên GitHub, nên không mất gì thật.

**B.** Giữ cột, loại nó khỏi phép so của `--check` bằng mốc ổn định (như `STAMP_PREFIX`).
Rẻ hơn, nhưng để lại một câu sai trong file — trái nguyên tắc 2 của platform.

## 3. Ngữ nghĩa đề xuất cho Gate #7

**Tên:** "Sự thật máy sinh còn tươi". **Một phép kiểm, gọi cả hai `--check`.**

| # | Luật | Vì sao |
|---|---|---|
| 1 | **Chỉ đọc tuyệt đối.** Không ghi file, không stash, không `git checkout`, không đụng working tree | Cổng mà sửa cây thì nó phá đúng thứ nó đang canh |
| 2 | **So HEAD với HEAD.** Dựng model từ nội dung `git show HEAD:<path>` + `git ls-tree HEAD`, rồi so với `git show HEAD:DASHBOARD.md` / `:FEATURE-PARITY.md` | Đây là mấu chốt. Không đọc working tree thì **không thể** đỏ vì việc làm dở của ai — của mình hay của người khác |
| 3 | **Chạy sau commit, trước `safe-push`** | Trước commit thì cây còn bẩn, cổng vô nghĩa |
| 4 | **`--quick` KHÔNG được bỏ qua** | `--quick` sinh ra để bỏ chạy test (chậm). Phép kiểm này chỉ đọc vài file — rẻ |
| 5 | **Đỏ phải nói rõ sửa bằng lệnh nào** | `node scripts/build-dashboard.mjs && node scripts/feature-parity.mjs`, rồi `git commit --amend` hoặc thêm một commit |

**Vì sao "so HEAD với HEAD" giải quyết luôn cả hai lo ngại của GPT (mục 2 và 3 trong yêu cầu):**
nó không cần biết package nào của ai. Foreign dirty work **không tồn tại** dưới góc nhìn HEAD.
Không cần logic phân vùng trách nhiệm riêng cho gate #7 — và ít logic hơn thì ít chỗ sai hơn.

## 4. Vòng lặp `claims` ↔ dashboard — có thật, nhưng nhỏ

`DASHBOARD.md` có cột "Đang giữ (claims)". Nên **mỗi lần claim/release là dashboard đổi**. Với
gate #7 so HEAD–HEAD, hệ quả là: **commit nào đụng `claims.json` thì phải sinh lại dashboard
trong chính commit đó.**

Tôi đã va vào đúng chỗ này ba lần hôm nay, nên nó không phải rủi ro lý thuyết.

Hai đường:
- **B1 — giữ cột, ghi thành luật** trong `PLATFORM.md` mục 4 và có test ghim. Giữ được giá trị
  cho người đọc (*"ai đang giữ cái này?"* là câu Đức hay hỏi).
- **B2 — bỏ cột khỏi dashboard.** Claims là *trạng thái phiên*, không phải *trạng thái
  extension*; bỏ đi thì vòng lặp biến mất hẳn.

**Tôi nghiêng về B1.** Cột đó trả lời một câu Đức thật sự hỏi, và cái giá chỉ là một lệnh sinh
lại trong commit vốn đã phải viết. Nhưng đây là quyết định của Đức, không phải của tôi.

## 5. Test bắt buộc trước khi được nâng 6 → 7

1. **Foreign dirty → KHÔNG chặn oan.** Dựng file `.js` chưa commit trong package **không**
   thuộc phiên hiện tại → gate #7 vẫn **XANH**. Đây là ca GPT yêu cầu, và là ca quan trọng
   nhất của cả patch.
2. **Own dirty → cũng không chặn.** Cùng cách, nhưng trong package của chính phiên → vẫn xanh,
   vì cổng so HEAD.
3. **Artifact commit bị cũ thật → ĐỎ.** Sửa `DASHBOARD.md` đã commit rồi commit tiếp → đỏ,
   thông báo nêu lệnh sửa.
4. **Cổng chỉ đọc.** Chạy gate #7 hai lần, `git status --porcelain` và HEAD **không đổi**.
5. **`--quick` vẫn chạy phép kiểm này** — assert nó không nằm trong nhánh `skipped`.
6. **`EXPECTED_CHECKS` = 7** và cổng vẫn tự tố nếu số phép kiểm lệch (cơ chế chống-sửa-cổng
   sẵn có phải còn nguyên).
7. **Commit đụng `claims.json` mà không sinh lại dashboard → ĐỎ** (nếu chốt B1).

## 6. Việc cần Đức chốt trước khi code

1. **Tín hiệu dirty: phương án A hay B?** (mục 2). Ảnh hưởng tới `DASHBOARD.md`, nên phải chốt trước.
2. **Cột claims: B1 hay B2?** (mục 4).
3. **Đồng ý nâng `EXPECTED_CHECKS` 6 → 7 không?** Đây là đổi hiến pháp cổng — `AGENTS.md` mục 0
   nói thẳng *"không được tự sửa cổng kiểm cho nó xanh"*, nên sửa cổng theo chiều nào cũng phải
   có Đức duyệt.

Chốt xong ba câu đó thì phần code còn lại nhỏ và thẳng.
