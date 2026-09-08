---
status: Accepted
adr: 0027
decides: [0027]
date: 2026-09-09
last_reviewed: 2026-09-09
deciders: Đức
---

# ADR-0027 — Bộ biên dịch luật: luật vào bằng cửa nào, ra bằng cửa nào

> Sổ tay thi hành: `docs/protocols/RULE-COMPILER.md`. Bộ đo: `scripts/rule-compile.mjs`.

## Bối cảnh

Đức chốt 09/09, sau khi tự đọc lại bản đồ nơi chứa luật:

> *"Cần một bộ rule compiler, đảm bảo các rules được consistent và ổn định, không phình… mọi
> rule mới được append vào ledger, nhưng KHÔNG append trực tiếp vào active rules."*

Con số làm rõ vấn đề: một hệ thống chạy hai năm có thể có **800 luật trong lịch sử** nhưng chỉ
cần **25–50 luật đang sống** cho một việc. Hai con số đó nằm chung một chỗ thì mỗi phiên nạp 800
để dùng 40 — và tệ hơn, **luật thứ 700 mâu thuẫn với luật thứ 30 mà không ai thấy.**

Repo này đã trả giá đúng như thế, đo được ngay lượt chạy đầu của bộ biên dịch ngày 09/09:
`AGENTS.md` mục 7 và `ORCHESTRATOR.md` mục 0d đều đang **dạy một mô hình Đức đã chốt ngược lại
từ 07/09** (mô hình *một cửa* của quyết định 0004, bị 0017 thay). Không ai cố tình. Luật mới
được *thêm vào*; luật cũ không được *lấy ra*.

Trước quyết định này repo đã có **hai nửa** của cơ chế mà **không có mối nối**: sổ cái chỉ-thêm
với B12 canh cho không quyết định nào biến mất, và một bản hiệu lực có thước cóc chống phình.
Không gì kiểm rằng bản hiệu lực **đúng với** sổ cái.

## Quyết định

### ⑴ Hai tầng, và chỉ một tầng được nạp

```
SỔ CÁI (docs/adr/**)  ──  append → merge → supersede → trim → compile  ──▶  BẢN HIỆU LỰC
lịch sử đầy đủ, chỉ thêm                                                  thứ AI thật sự nạp
```

**Luật mới không được viết thẳng vào bản hiệu lực.** Nó vào sổ cái trước rồi mới biên dịch
xuống. Nơi chứa luật khai ở `.repo-structure.json` → `luat.ra_soat`; **khai thiếu một nơi là nơi
đó vô hình với bộ biên dịch.** Đo 09/09: **18 nơi, 3.650 dòng bản hiệu lực trên 5.769 dòng sổ cái.**

### ⑵ Sáu bước — và bốn trong sáu bước là việc của NGƯỜI

`normalize → deduplicate → subsume → conflict → trim → compile`. Máy làm được bước ① (vân tay)
và nêu ứng viên cho ②; **③ subsume và ④ conflict thì không**. Thứ tự ưu tiên khi hai luật đá
nhau: **bất biến cứng > luật theo phạm vi > thói quen làm việc > luật lịch sử**; hai bất biến
cứng ngang cấp đá nhau thì **DỪNG và hỏi Đức**, không suy diễn.

**Trim không phải xoá.** Luật rời bản hiệu lực thì xuống mục `Vế đã chết` của ADR, **kèm tên
quyết định đã thay nó**. Xoá thẳng là làm mất một quyết định, và B12 chặn.

### ⑶ Bốn phép đo, và chỉ MỘT phép được đỏ

`TRICH_VE_CHET` (đỏ) · `QUYET_DINH_MO_COI` · `LUAT_TRUNG` · `CHUA_RA_SOAT`.

Chỉ ① đỏ vì nó là một câu **sai sự thật** — file luật đang bảo người đọc làm một việc Đức đã
chốt ngược lại, không có cách đọc nào khiến nó đúng. Ba cái kia là **mùi**: một quyết định mồ
côi có thể chỉ là bối cảnh; hai dòng giống nhau có thể cố ý nhắc lại ở hai tầng. **Một cổng đỏ
vì mùi là một cổng sẽ bị tắt** — và lúc đó nó không còn bắt được ① nữa. Cùng lý lẽ với thước cóc
ở giới hạn ③: máy không canh thẳng con số lý tưởng.

### ⑷ Máy TỐ GIÁC, không tự sửa

Đức chốt rõ: *"tôi không khuyến nghị AI tự tiện sửa/xóa rules."* AI **đề xuất** (so sánh, nêu
chỗ trùng, nêu chỗ nên gộp), người **quyết**, máy **tố giác**. Bộ đo **cố ý không có cờ `--fix`**
— thêm một cờ như thế là mở đúng cánh cửa Đức vừa đóng. Cùng lý lẽ với `state-check.mjs`, vốn
in ra lệnh sửa chứ không tự chạy.

### ⑸ Bộ nhớ và protocol của chính AI cũng theo luật này

Đức chốt cùng ngày: *"ngay cả memory, protocol của AI Assistant cũng cần được rà soát và tuân
thủ flow này, để ta có được 1 trí thông minh trọn vẹn không confuse."*

Kho nhớ của một phiên AI **có cùng hình dạng bệnh**: chỉ thêm vào, không bao giờ lấy ra, và mục
nhớ thứ 40 mâu thuẫn với mục thứ 3 mà không ai thấy. Cùng sáu bước: một mục = một sự thật · mục
mới phủ nhận mục cũ thì **sửa mục cũ** chứ đừng viết mục thứ hai · mục đã thành phép kiểm máy
trong repo thì **rời kho nhớ** vì repo giữ hộ rồi · mục sai thì **xoá**.

**Vế này KHÔNG được cưỡng chế và nói thẳng ra như vậy:** kho nhớ nằm ngoài repo nên
`rule-compile.mjs` không soi được. Nó là **kỷ luật của phiên**, và lượt rà hằng tuần phải kể cả nó.

## Hệ quả

**Được.** Câu hỏi *"bản luật đang có mâu thuẫn nào không"* trả lời được bằng một lệnh, thay vì
bằng một lượt đọc 3.650 dòng. Ngay lượt chạy đầu nó tìm ra **hai chỗ đang dạy mô hình đã chết**
và **12 nhóm câu luật lặp giữa hai file**. Và giới hạn ⑨ (*rà hằng tuần*) từ chỗ là **chữ**
thành ra có máy đếm — trước đó nó không có cách nào biết mình bị bỏ qua.

**Mất, và biết trước:** ba trong bốn phép chỉ là **mùi**, nên chúng phụ thuộc vào việc có người
thật sự đọc. Phép ④ đo *ngày khai trong cấu hình*, không đo *đã đọc hay chưa* — đặt ngày cho
xong là tắt được máy canh mà không ai phát hiện. Đây là chỗ hở cố ý: cách chữa duy nhất là bắt
máy đo chất lượng một lượt đọc, và không có cách nào làm việc đó.

**Còn nợ:** `LUAT_TRUNG` bắt theo **vân tay tập từ**, nên hai câu cùng nghĩa mà khác từ vựng thì
nó không thấy. Nó là phép **sàng**, không phải phép **phán** — nêu ứng viên cho người đọc quyết.

**Chỗ dễ làm sai, đã làm sai thật, ghi lại để đừng làm lần hai:**

- **Số vế đứng SAU cái đuôi liên kết** — `[ADR-0005](…) ⑴`, không phải `ADR-0005 ⑴`. Bản đầu chỉ
  bắt hình dạng thứ hai nên bỏ sót **mọi** lượt trích theo vế mà vẫn báo SẠCH. Phép ghim bắt được
  ngay lượt chạy đầu tiên.
- **Số hiệu có PHẠM VI** — `docs/adr/0001` khác `workers/duc-scouter/v0.1.0/docs/adr/0001`. Bỏ
  qua vế này thì bộ biên dịch báo hàng chục lỗi giả, và phép kiểm báo lỗi giả bị tắt trong một ngày.
- **Tên file KHÔNG phải số hiệu** — sau lượt gộp 09/09, `0007-scouter.md` mang sáu quyết định và
  số dẫn của nó (0007) **đã chết**. Trích `ADR-0007` để nói về Scouter là trích một vế đã chết.

## Trạng thái

Accepted.
