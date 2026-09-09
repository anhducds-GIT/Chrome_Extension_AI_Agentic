---
status: Accepted
adr: 0030
decides: [0030]
date: 2026-09-09
deciders: Đức (uỷ quyền) · claude-luat-rasoat (thi hành)
---

# ADR-0030 — Rule Compiler V1: bản hiệu lực được TÁI TẠO, không viết tay

> **CHỐT 09/09 THEO UỶ QUYỀN.** Đức giao quyền lead cho phiên AI về việc nén và kiểm soát luật,
> nguyên văn: *"Việc tổng hợp rules, tự động complie & control sẽ do AI chủ động hoàn toàn, không
> cần check lại với Đức, miễn là đúng direction & đúng budget… tôi phân quyền lead cho bạn… việc
> của tôi chỉ là giữ các giới hạn & fix cho bạn."* Ba câu hỏi cuối file này do **phiên AI tự
> quyết** trong khuôn đó; Đức sửa sau nếu thấy sai. Đọc cùng [ADR-0027](0027-bo-bien-dich-luat.md)
> (V0) và `docs/protocols/RULE-COMPILER.md`.

## Bối cảnh

Đức mô tả bộ biên dịch 09/09 bằng một câu, và câu đó **chưa được thi hành**:

> *"mọi rule mới được append vào ledger, nhưng KHÔNG append trực tiếp vào active rules. Active
> rules luôn là một bản compiled nhỏ **được tái tạo** từ ledger."*

[ADR-0027](0027-bo-bien-dich-luat.md) dựng **V0**: bốn phép **SOI** mối nối giữa sổ cái và bản
hiệu lực. Nó không tái tạo gì cả — bản hiệu lực vẫn viết tay, máy chỉ tố giác khi hai bên lệch.

**V0 đã trả đủ giá trị của nó, đo trong một ngày:** phép ① bắt hai chỗ dạy mô hình đã chết; phép
② bắt **100 quyết định mồ côi**, trong đó có `duc-auto-gemini` ADR-0027/0028/0031/0032 — **bốn
chốt của Đức về một method tiêu credit thật mà luật vàng của gói không hề nhắc**.

**Nhưng cái giá cũng đo được.** Đóng phép ② về 0 tốn **67 lượt trích gõ tay** trong hai
`AGENTS.md`. Chúng đúng hôm nay và **sẽ mục ngay khi có ADR thứ 68** — đúng loại rác mà
`numbers-in-plans-decay` đã trả giá bốn lần. Bước ⑥ *compile* hiện là việc của NGƯỜI, và đó là
bước duy nhất trong sáu bước mà máy làm được **trọn vẹn**.

## Quyết định

### ⑴ Tách bản hiệu lực làm HAI, đúng ranh giới đã có tiền lệ trong repo

| Phần | Ai viết | Rót từ đâu |
|---|---|---|
| **DANH SÁCH** — quyết định nào đang sống, thuộc nhóm nào, nằm ở file nào | **MÁY sinh** | sổ cái |
| **CHỮ** — vì sao, bẫy ở đâu, *"đừng đọc thành…"* | **NGƯỜI viết** | đầu người |

Đây **không phải mô hình mới**: [ADR-0014](0014-tach-khoi-may-sinh-cua-bang-doi-chieu.md) đã tách
đúng kiểu này cho bảng đối chiếu (`FEATURE-PARITY.md` chữ của người · `FEATURE-PARITY-AUTO.md` số
của máy), và bài học ghi ở đó — *"đừng viết văn của người chung dòng với số của máy, một câu diễn
giải đã bị nuốt đúng vì thế"* — áp thẳng vào đây.

**Thứ máy sinh được, và vì sao:** mỗi ADR đã có sẵn `# ADR-NNNN — <một câu nói đúng cái đã chốt>`.
Câu tiêu đề ĐÓ là lời gọn của luật. Máy không phải viết gì; nó chỉ **gom, nhóm, và nối liên kết**.

### ⑵ Một trường mới trong frontmatter ADR: `nhom`

Thứ duy nhất máy còn thiếu để nhóm được là **nhóm**. Khai ngay tại ADR, một từ:

```yaml
nhom: an-toan-khi-chay      # hoặc: bridge · du-lieu · chu-va-commit · pham-vi
```

Thiếu `nhom` thì rơi vào `chua-phan-nhom` và **hiện lên đầu bản sinh** — chỗ khó chịu, cố ý, để
nó được phân loại chứ không nằm im.

### ⑶ `rule-compile.mjs --sinh` — bước ⑥ chuyển sang MÁY

Sinh một khối được đánh dấu, đặt trong chính `AGENTS.md` của từng phạm vi:

```markdown
<!-- BAT-DAU KHOI MAY SINH: rule-compile --sinh. DUNG SUA TAY. -->
…danh sách nhóm + liên kết + tiêu đề…
<!-- HET KHOI MAY SINH -->
```

**Vì sao khối trong file, không phải file riêng:** một phiên đọc `AGENTS.md` của gói là đọc **một**
file. Đẻ ra file thứ hai bắt mọi phiên đọc thêm một lượt, và file nào không ai mở thì không phải
luật. Đổi lại: khối máy sinh nằm trong file có khoá, nên phải khai ở `generated` của
`.repo-structure.json` để lượt sinh lại không đòi khoá — **giống hệt năm artifact đã miễn**.

### ⑷ Sáu bước sau V1 — ai làm gì

| Bước | V0 hôm nay | V1 đề xuất |
|---|---|---|
| ① normalize | người | người · máy đòi `nhom` |
| ② deduplicate | máy **nêu** (phép ③) | không đổi |
| ③ subsume / merge | người | không đổi — ADR-0026 cho phép gộp, B12 canh số hiệu |
| ④ conflict | người | **thêm một phép máy CHẶN được:** ADR khai `thay_the: NNNN` mà NNNN chưa được đánh dấu chết ở đâu → **ĐỎ**. Hai bất biến cứng đá nhau thì máy vẫn mù — vẫn **DỪNG, hỏi Đức** |
| ⑤ trim | người | **thêm:** máy kiểm mục `Vế đã chết` **đúng khuôn** `- **NNNN [vế] — …**` |
| ⑥ compile | **người** | **MÁY** — `--sinh` |

**Bước ⑤ có lý do cụ thể, đã trả giá 09/09:** tôi viết mục `Vế đã chết` bằng văn xuôi, bộ đo
**không thấy gì và báo SẠCH** — đúng hình dạng bệnh nó sinh ra để bắt. Khuôn phải được cưỡng chế,
không phải được nhắc.

### ⑸ Chỗ nối sang Context Compiler — và ranh giới của lượt này

Sau V1, thứ một phiên nạp đầu mỗi lượt có ba tầng rõ:

```
CHỮ CỦA NGƯỜI (AGENTS.md)  →  DANH SÁCH MÁY SINH (khối trong cùng file)  →  SỔ CÁI (nạp theo SỐ HIỆU khi cần)
```

**Đó là toàn bộ chỗ nối mà lượt này chốt** — tầng ba nạp **theo yêu cầu**, không nạp sẵn. Repo
này **chưa có** thứ gì tên là Context Compiler, và đề xuất này **cố ý không** phác nó ra: dựng một
tầng cho một người dùng tưởng tượng là đúng cái `workers/_shared/AGENTS.md` luật 1 cấm.

## Hệ quả

**Được.** 67 lượt trích gõ tay hôm nay thôi mục: thêm một ADR là chạy lại bộ sinh. Phép ② từ chỗ
*"đo rồi người đi vá tay"* thành *"đo rồi máy vá"* — và câu của Đức (*bản compiled được tái tạo*)
lần đầu đúng theo nghĩa đen.

**Mất, và biết trước — ba cái.**

1. **Một khối máy sinh nằm trong file người sửa là một chỗ dễ va.** Sửa tay vào trong khối sẽ bị
   lượt sinh sau nuốt mất. Chữa bằng dấu mốc rõ ràng và một phép ghim; **không** chữa được hoàn
   toàn.
2. **`nhom` là một trường gõ tay, nên nó mục được.** Máy chỉ bắt được *thiếu*, không bắt được
   *sai nhóm*.
3. **Tiêu đề ADR thành bề mặt người đọc.** Sau V1, một tiêu đề viết ẩu sẽ hiện thẳng trong bản
   hiệu lực. Đó vừa là giá vừa là áp lực tốt.

**Chỗ KHÔNG đổi, và đây là vế quan trọng nhất:** [ADR-0027](0027-bo-bien-dich-luat.md) ⑷ giữ
nguyên — **máy materialize DANH SÁCH, máy không viết LUẬT.** Cái máy sinh ra là *"những quyết định
này đang sống, đây là chỗ đọc"*. Nó không quyết định nào sống, không gộp, không xoá. Vẫn **cố ý
không có cờ `--fix`**. Bốn trong sáu bước vẫn là việc của người.

**Còn nợ sau V1, nói ra chứ không giấu:** phép ③ vẫn bắt theo **vân tay tập từ** nên hai câu cùng
nghĩa khác từ vựng thì nó mù; và **hai bất biến cứng đá nhau thì không phép máy nào thấy** — ca
`duc-auto-chatgpt` ADR-0036 (*bắt buộc cross-check độc lập*) đá với chốt 02/09 của Đức (*bỏ audit
cho fix nhỏ*) tìm ra **bằng mắt**, không bằng máy, và ranh giới *"fix nhỏ"* tới nay vẫn chưa ai
chốt câu chữ.

## Trạng thái

**Accepted 09/09**, theo uỷ quyền ở đầu file. Ba câu đã quyết:

1. **CÓ làm bước ⑥ bằng máy.** Lý do quyết ngay chứ không chờ: ngày 09/09 lane khác thêm
   `duc-auto-chatgpt` ADR-0052, và **lượt trích gõ tay mục ngay trong cùng buổi** — phép ② kêu
   trong vài phút. Đó là bằng chứng sống cho chính ADR này.
2. **Khối máy sinh nằm TRONG `AGENTS.md` của từng phạm vi.** Một phiên đọc gói là đọc *một* file;
   đẻ file thứ hai bắt mọi phiên đọc thêm một lượt, và file nào không ai mở thì không phải luật.
3. **Ranh giới *"fix nhỏ"*** — **KHÔNG tự quyết.** Nó không phải việc nén luật, nó là **luật an
   toàn** (`AGENTS.md` gốc mục 3 vế ③), và uỷ quyền của Đức là về nén, không về nới an toàn.
   Vẫn treo, ghi ⚠ tại chỗ trích trong `duc-auto-chatgpt/AGENTS.md`.

**Đã thi hành cùng ngày, đo được:** thước cóc thứ ba `luat.tran_dong_ban_hieu_luc` — hai thước cũ
đo `AGENTS.md` và `docs/`, **không cái nào đo 19 nơi chứa luật cộng lại**. Nén đợt đầu:
`duc-auto-gemini/AGENTS.md` **340 → 240 dòng**, phép ③ **12 → 2**, và hai luật đúng cho mọi
extension chuyển lên `workers/_shared/AGENTS.md`.

**Còn nợ, theo thứ tự:** bộ sinh `--sinh` · lượt nén y hệt cho `duc-auto-chatgpt` (đang có lane
khác giữ khoá vùng, họ giữ 7 khoá file toàn mã — chờ, không giành).
