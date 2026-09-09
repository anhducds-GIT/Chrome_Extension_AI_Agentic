---
status: Accepted
adr: 0031
decides: [0031]
date: 2026-09-09
deciders: Đức (đặt câu hỏi + uỷ quyền) · claude-luat-rasoat (đo và chốt)
nhom: pham-vi-va-ky-luat
---

# ADR-0031 — Trần đo bằng KÝ TỰ, và đo cái MỘT PHIÊN TRẢ

## Bối cảnh

Đức hỏi 09/09: *"Giờ ta quyết định trần là bao nhiêu thì phù hợp, tôi thấy hiện tại trần của
chúng ta vẫn lớn hơn rất nhiều so với lời khuyên và chuẩn của các hãng recommend."*

**Không có con số chuẩn nào của hãng để dẫn.** Anthropic khuyên `CLAUDE.md` giữ ngắn và người đọc
được, nhưng không công bố trần dòng. Dựng một con số rồi gán cho *"chuẩn của hãng"* là bịa, nên
quyết định này suy trần từ **số đo của chính repo** và từ **lời Đức**.

**Linh cảm của Đức đúng, và đo được.** Ba thước đang có (`AGENTS.md` theo dòng · `docs/` theo dòng
· bề mặt luật theo dòng) đều sai **hai** chỗ cùng lúc:

**Sai ĐƠN VỊ.** Cùng ngày 09/09, một lượt nén `duc-auto-gemini/AGENTS.md` giảm **32% số dòng** mà
chỉ giảm **7% số ký tự** — phần cắt là chữ ngắn (bản mẫu prompt), phần thêm là chữ đặc. Cùng đo
được: `chatgpt/AGENTS.md` **123 ký tự một dòng**, gấp rưỡi `AGENTS.md` gốc (79), nên thước dòng
đếm thiếu nó một phần ba. **Dòng nói dối; ký tự thì không.**

**Sai CHỖ.** Thước "bề mặt luật" đo **19 nơi chứa luật cộng lại = 3.807 dòng**. Không phiên nào
trả con số đó. Hoá đơn thật, đo 09/09:

| Ai trả | Ký tự | ~token |
|---|---:|---:|
| **Mọi phiên** (`CLAUDE.md` + `AGENTS.md`) | 20.530 | **~9.300** |
| Phiên đụng gói nặng nhất (thêm `chatgpt/AGENTS.md`) | 64.313 | **~29.200** |

~2,2 ký tự = 1 token với tiếng Việt có dấu (tệ hơn tiếng Anh ~4).

## Quyết định

### ⑴ Đơn vị là KÝ TỰ, và thước đo CÁI MỘT PHIÊN TRẢ

Hai con số, khai ở `.repo-structure.json` → `luat.nap`:

- **`tran_ky_tu_moi_phien`** — `CLAUDE.md` + `AGENTS.md`, thứ nạp trước cả khi phiên biết mình
  sắp làm gì. Danh sách file khai ở `nap.moi_phien`, không gõ cứng vào script.
- **`tran_ky_tu_mot_goi`** — `AGENTS.md` **nặng nhất** trong các gói. Đo cái xấu nhất, không đo
  trung bình: trung bình không ai trả.

**Bỏ `agents.tran_dong`.** Giữ hai thước cho một file sau khi đã chứng minh một trong hai nói dối
là giữ một cái đèn báo sai. Thước ký tự phủ `AGENTS.md` — nó chiếm 98% con số nạp-mọi-phiên.
**Bỏ luôn `luat.tran_dong_ban_hieu_luc`**, thước dòng dựng cùng ngày và đo sai chỗ.

`docs.tran_dong_khong_ke_adr` **ở lại**: nó đo một thứ KHÁC — kho chữ phình, chứ không phải hoá
đơn nạp. Một thước cho một câu hỏi.

### ⑵ ĐÍCH suy từ chính lời Đức, không từ một con số vay mượn

Đức đặt đích trong bản thiết kế gốc: *"Một hệ thống chạy 2 năm có thể có 800 historical rules
nhưng chỉ **25–50 active rules** cho một task."*

Một luật viết đúng chuẩn là **một câu + một liên kết ADR** ≈ **150 ký tự**. Nên:

```
50 luật × 150 ký tự ≈ 7.500 ký tự  ≈  3.400 token
```

**ĐÍCH: 8.000 ký tự** cho mọi phiên, và **8.000 ký tự** cho một gói. Hôm nay: **20.530** và
**43.783** — tức **2,6× và 5,5× quá đích**.

### ⑶ ĐÍCH tách khỏi THƯỚC, y như giới hạn ③

Máy canh **thước** (con số hôm nay), không canh **đích**. Lý do đã trả giá và ghi ở
[ADR-0027](0027-bo-bien-dich-luat.md) ⑶: một cổng đỏ với mọi phiên trong nhiều tuần là một cổng
sẽ bị gỡ, và lúc đó nó không canh được gì nữa.

### ⑷ Cửa ra rẻ nhất: chuyển KỂ CHUYỆN sang ADR

Đo được vì sao bản hiệu lực nặng: `AGENTS.md` có **47 dòng luật trên 9.137 token** — **~194 token
một luật**, gấp ba đến năm lần cái một câu luật cần. Phần thừa là **câu chuyện**: đo được bao
nhiêu, ai vấp, ngày nào.

Câu chuyện đó **có giá trị thật** — nó là thứ ngăn người sau xoá nhầm một luật, và repo đã trả giá
để học. Nên **không xoá, mà chuyển**: xuống ADR. **ADR nạp theo yêu cầu nên nó miễn phí với mọi
phiên.** Ở bản hiệu lực giữ một câu luật cộng một liên kết.

Đây chính là hình dạng mà [ADR-0030](0030-rule-compiler-v1.md) đã chốt cho bước ⑥, nay có con số
đứng sau nó.

## Hệ quả

**Được.** Câu hỏi *"trần bao nhiêu thì phù hợp"* trả lời được bằng một con số **suy từ số đo**,
và cổng đo đúng cái người ta trả. Thước mới bắt được ngay lượt sửa đầu tiên sau khi dựng — chính
lượt viết giới hạn ④ này, +379 ký tự.

**Mất, và biết trước.** Ký tự khó hình dung hơn dòng: không ai nhìn một bản vá mà nhẩm được nó
thêm bao nhiêu ký tự. Đổi lại là một con số không lừa được. Cổng in kèm ước lượng token để còn
hình dung.

**Chỗ chưa với tới:** ~2,2 ký tự/token là **ước lượng**, không phải bộ tách token thật. Nó đủ để
so sánh và để đặt thước; đừng dùng nó để hứa một con số token chính xác với ai.

**Việc còn lại, và nó lớn:** đi từ 20.530 xuống 8.000 là bỏ **61%** khỏi thứ mọi phiên nạp. Không
làm trong một lượt. Nó là một làn riêng trong `ROADMAP.md`.

## Trạng thái

Accepted.
