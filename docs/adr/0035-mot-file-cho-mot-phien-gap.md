---
status: Accepted
adr: 0035
decides: [0035]
date: 2026-09-09
deciders: Đức (đặt trần 2.000–3.000 token và gọi tên mục tiêu của việc compile) · claude-nen-luat (thi hành)
nhom: pham-vi-va-ky-luat
---

# ADR-0035 — Một file cho một phiên gói, và trần CỨNG chặn ở lượt sinh

## Bối cảnh

Đức chốt 09/09, sau hai lượt nén chưa đủ: *"các extension có lượng load token bị lớn hơn cần thiết
rất nhiều, đó là các phiên làm việc **chuyên môn & focus vào trạng thái latest**… từ 2000-3000 token
là max rồi, và **phải luôn duy trì ở số nhỏ như vậy là mục tiêu của việc compile**."*

Đo ra thì **nén tay không tới được**:

| Nạp cái gì | Token |
|---|---:|
| `CLAUDE.md` toàn cục (ngoài repo, của Đức) | 852 |
| `CLAUDE.md` repo + `AGENTS.md` gốc (tự nạp qua `@AGENTS.md`) | 3.049 |
| `AGENTS.md` của gói | 3.395–5.884 |
| `STATUS.md` của gói | 2.055–3.110 |
| **Một phiên đụng gói** | **9.351–12.497** |

**Riêng phần nền đã 3.901 token** — vượt trần trước khi chạm tới gói. Chỗ rò lớn nhất là
`@AGENTS.md` trong `CLAUDE.md`: nó nạp **cả hiến pháp** vào **mọi** phiên, kể cả một phiên chỉ sửa
một selector trong một gói. Một phiên chuyên môn không cần bảng chỉ đường điều phối, không cần
`ROADMAP`, không cần bộ máy đa-lane đầy đủ.

## Quyết định

### ⑴ Hai cửa vào, mỗi cửa MỘT file

`CLAUDE.md` **bỏ `@AGENTS.md`** và trở thành bộ định tuyến:

- **Đụng một gói** → `workers/<gói>/<phiên-bản>/PHIEN.md`, **máy sinh, tự chứa.**
- **Việc luật · điều phối · hạ tầng repo** → `AGENTS.md`.

Mất mát biết trước: `AGENTS.md` không còn được **cơ chế** nạp, nó được **luật** nạp. Đổi lại, một
phiên gói không còn trả 2.976 token cho thứ nó không mở. Với phiên luật thì `AGENTS.md` là file
đầu tiên nó đọc — không có đường nào bỏ sót.

### ⑵ `PHIEN.md` do MÁY sinh, ba nguồn

`rule-compile.mjs --sinh` ghép: **lõi luật** (`workers/_shared/LUAT-CORE.md` — phần mọi phiên gói
phải biết) + **`## Luật vàng` của chính gói** + **bản chắt trạng thái** (`lifecycle`,
`last_verified`, `next_step`, `human_action` lấy từ frontmatter `STATUS.md`).

Sửa ở nguồn, không sửa `PHIEN.md`. Đây là bước ⑥ *compile* của
[ADR-0027](0027-bo-bien-dich-luat.md) áp cho bó mở phiên, không chỉ cho sổ cái.

### ⑶ Dedupe theo VÂN TAY

Luật gói trùng nghĩa với một dòng của lõi thì bị bỏ khỏi bản sinh, dùng chính `vanTay()` mà phép ③
`LUAT_TRUNG` đang dùng. Hôm nay nó bỏ 0 dòng — lõi vừa được viết lại nên vân tay chưa khớp. **Nó là
lưới cho lượt sau**, khi ai đó chép một luật lõi vào gói.

### ⑷ Trần CỨNG — chặn ở lượt SINH, không cảnh báo

`luat.phien_goi.tran_ky_tu = 6600` (~3.000 token). Vượt là bộ sinh **TỪ CHỐI ghi** và thoát 1.

**Đây là chỗ khác mọi thước trước đó trong repo này.** Thước cóc (`tran_ky_tu_moi_phien`,
`docs.tran_dong_khong_ke_adr`) báo đỏ rồi ai đó nâng nó lên — hôm nay chính tôi nâng một cái, có lý
do, nhưng vẫn là nâng. Trần này không có đường đó: **muốn thêm một luật vào bó mở phiên thì phải bỏ
một luật khác ra.** Đó là cách duy nhất giữ được vế *"phải luôn duy trì ở số nhỏ"* của Đức, và nó
biến giới hạn ⑧ của `AGENTS.md` (*một luật vào thì một luật ra*) từ chữ thành cơ chế.

## Hệ quả

**Được.** Ba gói sinh ra ở **2.724 · 2.922 · 2.985 token** — trong dải Đức đặt. Phía repo, một phiên
gói trả `CLAUDE.md` (~120) + `PHIEN.md` (~2.900) ≈ **3.020 token**, so với 9.351–12.497 trước đó.

**Mất, và biết trước.** Ba thứ:

1. `AGENTS.md` gốc mất cơ chế tự nạp (vế ⑴).
2. `PHIEN.md` là **file máy sinh nằm trong vùng có chủ** — phải giữ khoá vùng mới sinh lại được, y
   như khối sổ cái ([ADR-0030](0030-rule-compiler-v1.md)).
3. **Gói `duc-auto-chatgpt` KHÔNG sinh được**: 3.668 token, quá trần 668. Phần thừa đã biết chính
   xác — khối biện minh *"cố ý giống gói Gemini"* mà [ADR-0032](0032-ba-goi-giu-luat-rieng-gan-giong-nhau.md)
   đã nhận về, nhưng vùng đó đang có lane khác giữ nên chưa gỡ được. Trần đang làm đúng việc của
   nó: **từ chối, chứ không im lặng cho qua.**

**Chỗ chưa với tới:** `CLAUDE.md` toàn cục của Đức (852 token, mọi project) nằm ngoài repo. Cộng vào
thì một phiên gói là ~3.870 token. Phần đó Đức quyết.

## Trạng thái

Accepted.
