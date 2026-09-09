---
status: Accepted
adr: 0034
decides: [0034]
date: 2026-09-09
deciders: Đức (đặt trần 9–10k token cho một phiên đụng gói) · claude-nen-luat (đo và chốt)
nhom: pham-vi-va-ky-luat
---

# ADR-0034 — Mở phiên đọc `STATUS.md`, KHÔNG đọc `HANDOFF.md`

## Bối cảnh

Đức hỏi 09/09: *"tôi vẫn thấy các phiên extension lượng token phải nạp là quá lớn… tối đa trần là
9-10k token được không? các extension vì sao lại tốn nhiều token load như vậy?"*

Đo thật, đơn vị **token** (~2,2 ký tự = 1 token, tiếng Việt có dấu):

| Nạp cái gì | Token | % hoá đơn |
|---|---:|---:|
| `CLAUDE.md` toàn cục của Đức (ngoài repo) | ~1.070 | 4% |
| `CLAUDE.md` repo + `AGENTS.md` gốc | ~2.990 | 10% |
| `AGENTS.md` của gói | 3.400–5.900 | 14% |
| **`HANDOFF.md` của gói** | **14.600–22.100** | **~70%** |
| **Một phiên đụng gói** | **24.000–30.500** | |

**Cả một ngày nén luật tấn công đúng 14% hoá đơn và chưa hề chạm 70%.** Thước ký tự dựng cùng ngày
([ADR-0031](0031-tran-do-bang-ky-tu.md), [ADR-0033](0033-tran-co-bien-va-bay-cho-mau-thuan-trong-ban-hieu-luc.md) ⑵)
cũng chỉ đo `AGENTS.md`, nên nó báo *"8.900 token, dưới trần"* trong khi phiên thật trả **30.500**.
Đó là đúng bệnh **đo sai chỗ** mà ADR-0031 sinh ra để chữa, lặp lại ở một tầng thấp hơn.

**Vì sao `HANDOFF.md` to, và vì sao đó KHÔNG phải lỗi của nó:** trần của nó là 2.600 byte/mục ×
25 mục ≈ 23.600 token. Chính cái trần đó cho phép một file 20k token tồn tại **hợp lệ**. `AGENTS.md`
mục 1 lại bảo *"đọc cuối `HANDOFF.md`"* — nhưng **không có gì cưỡng chế "chỉ đọc cuối"**, nên thực
tế nó được nạp cả quyển.

## Quyết định

### ⑴ Mở phiên đọc `STATUS.md`, không đọc `HANDOFF.md`

`STATUS.md` **vốn đã được thiết kế** đúng cho việc này: trạng thái vận hành **một trang**
(2.000–3.100 token), khai `lifecycle` · `last_verified` + bằng chứng · `next_step` · `human_action`.
Đó chính xác là thứ một phiên cần lúc mở. `HANDOFF.md` chuyển sang **nạp theo yêu cầu** — mở khi cần
biết *phiên trước vấp gì*, đúng mô hình Tầng 2 của [ADR-0033](0033-tran-co-bien-va-bay-cho-mau-thuan-trong-ban-hieu-luc.md) ⑶.

Cộng lại: **24.000–30.500 → ~7.800 token**, dưới trần 9–10k Đức đặt.

### ⑵ KHÔNG hạ trần 2.600 byte/mục — và đây là lý do rút lại

Phản xạ đầu của tôi là hạ 2.600 → 1.200 byte và 20 → 8 mục. **Sai, và cấu hình nói thẳng vì sao.**
Con số 2.600 **được đo**, không được đoán: nó nằm trong một **khoảng trống của phân bố** (không mục
nào rơi vào giữa 2.593 và 2.831 byte), nên xê dịch ±200 byte không đổi kết quả. Hạ xuống 1.200 chặn
phần lớn hình dạng mục đang có, và `handoff.md` protocol mục 5 cấm đúng việc đó:

> *"Cấm nói trần để cho mục của chính mình lọt. Vượt trần thì hỏi 'phần thừa thuộc về ADR, sổ nợ,
> hay brief' rồi chuyển sang đó kèm con trỏ — **đừng cắt chữ cho vừa**."*

**Đè một con số đã đo bằng một con số đoán là làm hỏng phép đo, không phải nén.**

### ⑶ CHƯA đổi trần số mục (25 chặn / 20 đích) — để đo được một biến

Vế ⑴ bỏ toàn bộ `HANDOFF.md` khỏi hoá đơn mở phiên, nên số mục **không còn ảnh hưởng** tới con số
Đức hỏi. Đổi cả hai cùng lúc thì không quy được kết quả cho vế nào. Đo lại sau vế ⑴; còn đắt thì
mới cắt số mục.

### ⑷ Thước phải đo BÓ MỞ PHIÊN, không đo `AGENTS.md`

`luat.nap.mot_goi` đổi nghĩa lần nữa: bó = `moi_phien` + `AGENTS.md` của gói + **`STATUS.md`** của
gói. Đó là danh sách file mục 1 thật sự bắt đọc. Thước nào không đo đúng danh sách ở mục 1 thì lượt
nén sau lại tối ưu nhầm chỗ — đã xảy ra hai lần trong một ngày.

## Hệ quả

**Được.** Hoá đơn mở phiên giảm **~74%**, và lần này thước đo đúng thứ mục 1 bắt đọc.

**Mất, và biết trước.** Một phiên mở gói **không còn tự động biết phiên trước vấp gì**. Đổi lại,
`STATUS.md` có trường `next_step` và `human_action` — nếu phiên trước ghi đủ vào đó thì mất mát bằng
không; nếu không, `HANDOFF.md` cách một lệnh `Read`. **Điều này biến `STATUS.md` thành file phải giữ
tươi** — nó vốn đã là nguồn của `DASHBOARD.md`, nên đã có người canh.

**Chỗ chưa với tới:** `CLAUDE.md` toàn cục của Đức (~1.070 token, nạp trong **mọi** project) chép
lại kha khá thứ `AGENTS.md` repo này đã nói. Nó nằm **ngoài repo** và là file của Đức — không tự
sửa; đã báo để Đức quyết.

## Trạng thái

Accepted.
