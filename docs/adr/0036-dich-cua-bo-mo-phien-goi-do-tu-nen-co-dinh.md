---
status: Accepted
adr: 0036
decides: [0036]
date: 2026-09-09
deciders: Đức (chốt "phương án b") · claude-nen-luat (đo và đề xuất)
nhom: pham-vi-va-ky-luat
---

# ADR-0036 — ĐÍCH của bó mở phiên gói suy từ NỀN CỐ ĐỊNH, không từ tỉ lệ phần trăm

## Bối cảnh

[ADR-0033](0033-tran-co-bien-va-bay-cho-mau-thuan-trong-ban-hieu-luc.md) ⑴ đặt một luật chung cho
mọi thước: **đích = 60–70% của trần tuyệt đối**. Áp cho bó mở phiên của gói
([ADR-0035](0035-mot-file-cho-mot-phien-gap.md)) ra `bien_ky_tu_mot_goi = 4.400` trên trần 6.600.

Đo ngày 09/09, sau khi cả bốn gói đã qua lượt nén: **không gói nào với tới 4.400, và không phải vì
lười.** Bó của một gói có một phần **không nén được bởi gói đó**:

| Phần | Ký tự | Ai đổi được |
|---|---:|---|
| `CLAUDE.md` (định tuyến) | 565 | phiên luật |
| Đầu đề `PHIEN.md` (máy sinh) | ~410 | bộ sinh |
| `workers/_shared/LUAT-CORE.md` | 2.064 | phiên luật, và cắt 1 tính bằng **4** |
| **NỀN CỐ ĐỊNH** | **3.039** | |

Nền chiếm **46–51%** mỗi bó. Đích 4.400 để lại **1.361 ký tự** cho *luật riêng của gói + trạng
thái* — trong khi riêng luật vàng của gói mỏng nhất, sau nén, đã là **2.010**.

Nói thẳng: **4.400 là một con số không đường nào tới.** Và một đích không ai chạm được thì vô dụng
đúng như một thước cóc không ai giữ — cùng một bệnh, ngược dấu. Cái thứ nhất bị bỏ qua vì bất khả;
cái thứ hai bị nâng lên vì bất tiện.

## Quyết định

### ⑴ `bien_ky_tu_mot_goi` = **5.600**. Đức chốt 09/09, chọn "phương án b"

Hai đường đã đặt lên bàn: **⒜** hạ `LUAT-CORE.md` cho vừa đích cũ, **⒝** nêu lại đích. Đức chọn
**⒝**, và đó là đường đúng: ⒜ đổi một con số lấy việc **mọi** phiên đụng gói biết ít luật an toàn
hơn — trả bằng lớp bảo vệ để mua một chỉ số.

5.600 = nền 3.039 + **2.561** cho luật riêng và trạng thái. Đạt được: gói nhẹ nhất hôm nay dùng
2.679 cho hai phần đó, tức còn cách 118 ký tự. **Chưa gói nào đạt** — đó là điều đúng cho một
ĐÍCH. Số phải giữ hằng ngày là **thước cóc**, không phải đích.

### ⑵ Với thước này, ĐÍCH đo từ NỀN — không đo bằng phần trăm của trần

ADR-0033 ⑴ vẫn giữ nguyên cho `nap_moi_phien` (5.200 / 8.000 = 65%). Nó **không** áp cho bó gói,
vì tỉ lệ phần trăm giả định cả cái bó đều nén được. Ở bó gói thì không: một nửa là nền dùng chung.

Điều kiện thay thế, ghim ở `check-bootstrap-smoke`:

- `bien` phải **trên nền × 1,6** — đích phải chừa ít nhất 60% của nền cho nội dung thật của gói,
  nếu không thì nó bất khả ngay từ lúc viết ra.
- `bien` phải **dưới trần × 0,90** — vẫn phải có khoảng cách thật với trần tuyệt đối.

Ưu điểm so với một con số gõ cứng: **hạ được `LUAT-CORE.md` thì nền tụt, và sàn của đích tụt
theo.** Phép ghim tự biết, không ai phải nhớ đi sửa nó.

### ⑶ Thước cóc hạ 6.530 → **6.368**

Thước cóc là "số hôm nay". Lượt nén này đưa bó nặng nhất xuống 6.368, nên thước đi theo. **Thước
đi xuống là việc bình thường; đi lên thì phải nói vì sao trong nhật ký** (ADR-0033 ⑴).

## Hệ quả

**Được.** Đích nay là thứ có thể lập kế hoạch để tới. Và nó tự sửa mình: mọi lượt nén lõi đều hạ
sàn hợp lệ của đích, nên không ai phải nhớ đồng bộ hai con số.

**Mất, và biết trước.** Repo nay có **hai** cách đặt đích cho hai thước — phần trăm cho
`nap_moi_phien`, nền-cộng-phần-thật cho bó gói. Hai công thức là hai chỗ để lệch. Đổi lại: công
thức thứ hai nói đúng hình dạng của thứ nó đo, còn công thức thứ nhất thì không.

**Chỗ chưa với tới.** Không phép kiểm nào canh *nền* tự nó phình. `LUAT-CORE.md` to ra 300 ký tự
là cả bốn bó cùng to ra 300, và chỉ thước cóc bắt được — sau khi việc đã rồi.

## Trạng thái

Accepted.
