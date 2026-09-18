# VIZCOM PHASE 2 — LỘ TRÌNH WRITE E2E

**Viết:** 2026-09-18 · **Phiên:** `claude-universal-scouter` · **Trạng thái:** LỘ TRÌNH, chưa làm
**Nền:** [`UNIVERSAL-SCOUTER.md`](UNIVERSAL-SCOUTER.md) · Phase 1 ĐẠT, sổ `G-100`…`G-107`

> File này tồn tại để phiên sau **không phải đọc lại chat**. Mọi số trong đây là đo được ngày
> 18/09; chỗ nào chưa đo thì ghi **CHƯA ĐO**, đừng đọc thành một phép đo.

---

## 0. MỤC TIÊU MỘT CÂU

Chứng minh **một lượt GHI nhỏ nhất** chạy được trên đúng Vizcom của `anhducds`, verify bằng
bằng chứng đọc từ trang, và **hai tài khoản kia có 0 lượt ghi** — có bộ đếm, không phải lời hứa.

---

## 1. TRẠNG THÁI ĐẦU VÀO (đo 18/09)

| Ghế (`instance_id`) | Nhãn | Vizcom | Email marker |
|---|---|---|---|
| `5ba67fd2-701f-489a-bfd1-8bedb0df3153` | *(rỗng)* | `C39F1D99…` | **`anhducds@gmail.com`** |
| `b5f89960-4fd4-46d0-86eb-09c6c18bf185` | *(rỗng)* | `8CF657F4…` | `v.tuanvv4@vinfast.vn` |
| `c8568b34-…` | `Scouter_blank` | — | — |
| `f3f7264e-…` | `Dummy_Scout` | — | — |

> ~~**Tài khoản thứ BA chưa online.** `Profile 10` (vfsct01@gmail.com) có cài Vizcom nhưng chưa
> thấy ghế Scouter nào của nó trên dây.~~ **SAI, đo lại chiều 18/09 (`G-108`).** Đủ **3/3**, và
> chân thứ ba là **`vf.styling01@vinfast.vn`** ở ghế `c8568b34` (`Scouter_blank`) — **không phải**
> `vfsct01@gmail.com`. Bảng trên là ảnh chụp lúc sáng; buổi chiều ghế `c8568b34` có 1 target
> Vizcom. Gạch tại chỗ chứ không xoá, vì một dòng *"đang chờ Đức làm X"* là thứ không ai đọc lại,
> và tôi đã suýt lập kế hoạch tiếp trên nó.

Đã quét: `app.vizcom.com/files/<org>/recent` = **trình duyệt tệp**, 23 phần tử tương tác.
**CHƯA quét:** `/workbench/…` — bề mặt sinh ảnh. Đi tới đó cần lệnh GHI.

---

## 2. BỐN CHẶNG, THEO THỨ TỰ PHỤ THUỘC

### Chặng ① — Đổi danh tính chính sang EMAIL *(Node-side, không đụng extension)*

Đức chốt: *"identity chính ưu tiên email/account marker; workspace/plan chỉ supplementary"*.

- `adapters/vizcom.mjs`: `danh_tinh` → `{ a11y_chua: "anhducds@gmail.com" }`.
- Workspace/plan xuống `danh_tinh_phu` — **chỉ để in ra cho người đọc**, không tham gia quyết định.
- Phép ghim phải ĐỎ nếu ai đổi ngược lại: một khối dựng hai ứng viên cùng workspace khác email.

**Rẻ nhất, không phụ thuộc gì.** Làm trước.

### Chặng ② — `scout.song` *(ĐỤNG EXTENSION — đọc kỹ §3)*

Phép dò sống read-only, gửi đúng **một** lệnh `Page.getLayoutMetrics`, hạn **1.500ms**,
trả `{ song: bool, ms }`, không bao giờ ném.

Số 1.500ms **đã sống sót phép đo** (`G-107`): sống ≤ **282ms** (11 target, p50 28ms),
chết ~**20.020ms** (6 target). Hai cực cách **70×**.

**`song: true` KHÔNG có nghĩa trang dựng xong.** Ba trạng thái giữ riêng, và Vizcom đã chứng
minh trạng thái giữa tồn tại (`G-101`: ở 74ms renderer trả lời mà DOM rỗng):

```
scout.song (1.5s) → false → DỪNG, TARGET_KHONG_PHAN_HOI
                  → true  → scout.wait(selector danh tính) → chưa thoả → TRANG_CHUA_DUNG_XONG
                                                            → thoả     → kiểm danh tính → mới được đi tiếp
```

### Chặng ③ — Resolver: re-check danh tính trước MỖI lượt ghi và sau MỖI lần điều hướng

Đức chốt. Hình dạng: một hàm `khoaDanhTinh(target_id, adapter)` trả `{ ok, bang_chung }`, và
mọi bước GHI **bắt buộc** gọi nó ngay trước. Mất/đổi/nhập nhằng → **DỪNG fail-closed**.

Lý do không phải lo xa: `G-102` đo được `target_id` **sống qua điều hướng SPA cùng nguồn** —
tức URL đổi mà id không đổi. Nên *"vẫn đúng target"* **không** kéo theo *"vẫn đúng tài khoản"*:
một cú bấm sang workspace khác giữ nguyên id.

### Chặng ④ — Pilot ghi

1. `scout.navigate` hoặc `scout.click` vào `/workbench/…` của **đúng** `anhducds`.
2. **Quét trước** (`scout.page` + `scout.a11y`) — không đoán selector, không dùng hash
   styled-components (hợp đồng luật ⑸; mọi `class` của Vizcom là hash đổi theo mỗi lượt build).
3. Chọn **một** lượt ghi nhỏ, **đảo ngược được**, **không tiêu credit**.
   Ứng viên theo thứ tự ưu tiên, **tất cả CHƯA ĐO**, phải quét rồi mới chốt:
   ⒜ gõ chữ vào ô tìm tệp rồi `scout.clear` — đảo ngược hoàn toàn, không chạm dữ liệu;
   ⒝ đổi một công tắc hiển thị (lưới/danh sách) rồi bấm lại;
   ⒞ đổi tên một tệp nháp rồi đổi về.
   **KHÔNG:** bấm generate · upload · xoá · mời người · đổi thanh toán.
4. Verify bằng **đọc lại trang**, không tin lời báo của lệnh bấm
   (`scout.click` chỉ hứa *"đã bắn chuột"*, không hứa *"trang đã nhận"* — `S-22`).
5. In bộ đếm lượt ghi **tách theo từng target**.

---

## 3. CHỖ ĐẮT NHẤT, VÀ NÓ KHÔNG PHẢI CODE

`scout.song` phải thêm vào **ba** tệp: `scripts/scouter-bridge-core.mjs` ·
`scripts/scouter-probes.mjs` · `scripts/scouter-seed-core.mjs`.

**Hai trong ba tệp đó giống `udin-optic` TỪNG BYTE**, và `udin-optic/v0.1.0/tests/be-mat-hep-smoke.mjs`
khối ⑷ ghim đúng điều đó. Khối ấy **không cấm hai bản khác nhau — nó cấm chúng khác nhau MÀ
KHÔNG AI BIẾT**, và có sẵn lối ra: khai vào `CO_Y_KHAC` kèm lý do.

Ba đường, phải **chốt trước khi gõ dòng đầu**:

| Đường | Giá | Hệ quả |
|---|---|---|
| ⒜ chép sang **cả hai** gói | 2 lượt sửa, suite hai bên xanh | Udin nhận một method nó không dùng |
| ⒝ chỉ sửa Scouter, khai `CO_Y_KHAC` | 1 lượt sửa + một dòng lý do có chữ ký | Bản chép bắt đầu trôi, **có khai báo** |
| ⒞ hoãn `scout.song` | 0 | Chặng ①③④ vẫn chạy được — cả hai ứng viên Vizcom đang SỐNG |

**Đề xuất: ⒝.** `scout.song` là năng lực của *bộ đồ nghề*, không phải của trang Udin; và `G-93`
đã ghi lý do Đức tách hai gói là **tách nhịp thay đổi**. Nhưng đây là **quyết định của Đức**,
không phải của tôi — nó đụng một phép ghim an toàn đang có.

**Và: thêm một method là ĐỔI LUẬT AN TOÀN** (luật gói mục 4). Đức đã cho phép trong đề bài
Phase 2; ghi lại ở đây để phiên sau không tưởng là tôi tự thêm.

---

## 4. HAI VIỆC CHỈ ĐỨC LÀM ĐƯỢC — CHẶN CỨNG

| # | Việc | Chặn gì | Vì sao AI không làm được |
|---|---|---|---|
| 1 | **Nạp lại extension Scouter** ở ghế `5ba67fd2…` sau khi thêm `scout.song` | Chặng ② | Bản đang chạy trong Chrome là bản lúc nạp; sửa tệp trên đĩa **không** đổi bản đang chạy |
| 2 | **Bật công tắc đường ghi** trên bảng bên của đúng ghế đó | Chặng ④ | Luật gói mục 8: công tắc chỉ tay người mở được, **không method Bridge nào bật được nó**. Trần 200 lượt mỗi lần mở |

Không có ⑵ thì Phase 2 dừng ở *"đã chứng minh sẵn sàng ghi"*, không tới *"đã ghi"*.

---

## 5. TIÊU CHÍ ĐẠT

1. Resolver trả **UNIQUE** `anhducds`, danh tính chính là **email**.
2. `scout.song` trả `song:true` + `ms` cho target sống, `false` cho target chết, **và** một
   phép ghim chứng minh `song:true` **không** tự cho phép đi tiếp.
3. Một lượt ghi chạy trên đúng target ấy, **đảo ngược được**, không tiêu credit.
4. Danh tính đọc lại **trước và sau** lượt ghi, cả hai lần in ra bằng chứng.
5. Bộ đếm lượt ghi theo từng target: `anhducds` > 0 · **hai tài khoản kia = 0**.
6. `npm run test:scouter` xanh; nếu đi đường ⒜ thì `npm run udin:test` cũng phải xanh.

---

## 6. ĐỦ BA CHÂN — ĐO ĐƯỢC, KHÔNG SUY RA

Đề bài đòi *"verify cả 3 Vizcom accounts đều online/có thể discover"*. **ĐẠT 3/3**, đo bằng
`pilots/vizcom-anhducds/kiem-ke-tai-khoan.mjs` chiều 18/09:

| Ghế | Target | Org UUID | Email |
|---|---|---|---|
| `c8568b34…` (`Scouter_blank`) | `0A65DC0A1F…` | `fc25a65d…` | `vf.styling01@vinfast.vn` |
| `5ba67fd2…` *(không nhãn)* | `C39F1D994F…` | `ca2ab962…` | **`anhducds@gmail.com`** |
| `b5f89960…` *(không nhãn)* | `8CF657F436…` | `799fc2a1…` | `v.tuanvv4@vinfast.vn` |

Ba ghế khác nhau, ba org khác nhau, ba email khác nhau. **8 lượt gọi, 0 lệnh GHI**, đếm theo
từng target.

Bộ lọc dùng **hình dạng** email (`/[^@\s]+@[^@\s]+\.[a-z]{2,}/`), không phải danh sách ba địa
chỉ. Gõ cứng ba địa chỉ thì file chỉ tìm thấy thứ tôi đã tin là có — và một tài khoản thứ tư
sẽ vô hình.

~~§6 cũ: "Hiện 2/3 … phải khai rõ là 2/3, không được viết thành 3/3."~~ Câu đó đúng lúc viết và
sai hai tiếng sau. Xem `G-108`.

---

## 7. THỨ TỰ CHẠY

```
① đổi danh tính sang email        (Node, rẻ, không chặn bởi ai)
③ re-check trước/sau ghi          (Node, rẻ)
   ── tới đây đã đo lại được isolation với 2 chân ──
② scout.song                      (cần Đức chốt đường ⒜/⒝/⒞, rồi NẠP LẠI extension)
④ pilot ghi                       (cần Đức BẬT CÔNG TẮC)
```

①③ làm được ngay và không cần Đức. ② và ④ mỗi cái chặn bởi **một** hành động tay người.

---

## 8. ĐÃ LÀM — 18/09 chiều, Đức chốt đường ⒝

| Chặng | Trạng thái | Ở đâu |
|---|---|---|
| ① danh tính chính = email | **XONG** | `_shared/adapters/vizcom.mjs` — `danh_tinh` = `{a11y_chua:"anhducds@gmail.com"}`, workspace/gói xuống `danh_tinh_phu`. Ghim: `hop-dong-smoke` ⓙ · `giai-target-smoke` ⓞ/ⓞ′ |
| ③ khoá danh tính trước/sau | **XONG** | `_shared/goi-bridge/giai-target.mjs` → `khoaDanhTinh()`. Ghim ⓟ–ⓣ, cả bốn đã thử **đột biến** và đều ĐỎ |
| ② `scout.song` | **CHẠY THẬT, ĐO XONG** | Đức nạp lại 2/4 ghế 18/09. Vizcom `anhducds` **20·84·85·10·4 ms** · `tuanvv4` **2·3·3·2·3 ms**, `song:true` 10/10 — cách hạn 1.500ms ≥17×. Hai ghế chưa nạp vẫn `METHOD_NOT_FOUND`. Sửa thêm `ly_do` tách **từ chối nhanh** khỏi **treo** (`G-111`). Đường TREO chưa đo được trên máy thật |
| ④ pilot ghi | **ĐẠT MỘT PHẦN** | Đức bật công tắc 18/09. Lượt ghi chạy thật trên đúng `anhducds`, 3 lệnh GHI, hai tài khoản kia **0**. **Không vào được `/workbench/…`** — xem dưới |

**Ba chỗ pilot sửa lại lộ trình này** — ghi ra vì lộ trình là một lời khai, không phải một sự thật:

1. **§6 sai**: 3/3 chứ không phải 2/3, và sai luôn địa chỉ chân thứ ba (`G-108`).
2. **§3 đắt hơn thực tế**: `scout.song` **không** cần đụng `scouter-probes.mjs` — nó chạy lại
   `page.view`, tức đúng một `Page.getLayoutMetrics` đã mở từ 14/09. Nên chỉ **1** tệp lệch
   khỏi bản chép Udin, không phải 2, và **không cửa CDP nào mới** (`G-109`).
3. **Khai `CO_Y_KHAC` chưa đủ**: nó làm `continue`, tức tắt hẳn phép ghim byte trên cả tệp.
   Đã đổi sang **neo bằng băm hai bên** — và nó bắt thật một lượt sửa của chính tôi ngay
   trong phiên (`G-110`).


---

## 9. CHẶNG ④ — ĐÃ CHẠY, 18/09

**Ghế** `5ba67fd2…` · **target** `BF727D93DD12C7BDDBEEA4B899E6DE49` · **tài khoản** `anhducds@gmail.com`
(bằng chứng đầy đủ: `pilots/vizcom-anhducds/ket-qua-ghi-2026-09-18.txt`)

| Bước | Kết quả |
|---|---|
| giải target | 4 ghế được hỏi · 1 ứng viên · danh tính chính = email |
| `scout.song` | `song:true`, **8ms** |
| khoá danh tính | **4 lượt** — trước khi đo · trước `type` · trước `clear` · trước `Escape`. Cả 4 ĐẠT |
| lượt ghi | `scout.type` 17 ký tự → `scout.clear` → `scout.key Escape` |
| bằng chứng đọc | cây trợ năng **98 → 100 → 96**. Chuỗi thử xuất hiện rồi biến mất; bảng gợi ý đóng lại |
| khôi phục | **96 tên node, đúng bằng ảnh chụp trước lượt ghi đầu tiên** |
| bộ đếm | `anhducds` **3 ghi** · `v.tuanvv4` **0** · `vf.styling01` **0** |
| ngân sách | `used 3 / cap 200 / remaining 197` |

### Vì sao KHÔNG vào `/workbench/…` — và đó là luật STOP chạy đúng

`a[href^="/workbench/"]` khớp **đúng 1** phần tử trên trang `/files/<org>/recent`, và nó là nút
**`Create new file`**. Thẻ tệp trong danh sách là `<button>` không có `href`, nên cũng không có
URL nào để `scout.navigate` tới. Tức đường duy nhất sang `/workbench/` là **tạo một tệp** — chỉ
xoá mới đảo ngược, mà xoá bị cấm thẳng. Đề bài nói: *"Nếu action khả dụng duy nhất sẽ tiêu
credit hoặc gây thay đổi khó đảo ngược: STOP trước action và báo Đức"*. Pilot dừng đúng đó.

**Đức muốn vào `/workbench/` thì chọn một trong hai, và cả hai đều cần Đức:**
⒜ tự mở sẵn một tệp Vizcom ở cửa sổ đó rồi bảo tôi chạy lại — pilot sẽ thấy `/workbench/…`
   ngay từ lượt giải target và không phải tạo gì;
⒝ cho phép tạo **một** tệp nháp rồi Đức tự xoá — tôi không tự xoá.

### Khoảng trống còn lại

`scout.key` **không** trả `da_kiem` (khác `scout.type`/`scout.clear`). Lượt `Escape` được kiểm
bằng một phép đọc riêng, không bằng lời tự khai của lệnh. Ghi ở `G-114`.

---

## 10. BỀ MẶT `/workbench/<uuid>` — BẢN ĐỒ ĐO THẬT 18/09, VÀ MỘT LƯỢT DỪNG

Đức mở sẵn `Car trial 1` (`/workbench/5c805df7…`). Target **giữ nguyên id qua lượt điều hướng
SPA** — `G-102` lại đúng lần nữa. **0 lệnh GHI trong toàn bộ lượt này, cả ba tài khoản.**

### 10.1 Bản đồ bề mặt — 25 phần tử tương tác

| Neo | Khớp | Ghi chú |
|---|---|---|
| `textarea[placeholder="What are you creating?"]` | **2** | ô prompt, mỗi phần tử canvas một ô |
| `[data-testid="asset-library-toolbar-button"]` | 1 | thư viện tài nguyên |
| `a[href="/settings/account/profile"]` | 1 | đường sang hồ sơ |
| `iframe#intercom-frame` | 1 | khung hỗ trợ |
| `button[aria-expanded]` | 2 | menu thả xuống |
| `button[disabled]` | 2 | đang tắt |

**13/25 có neo ngữ nghĩa · 12/25 chỉ có hash styled-components.** Nhóm 12 gồm cả thanh công cụ
trái và các nút `Render` / `Generate`. Hợp đồng luật ⑸ cấm neo vào hash, nên **12 nút đó hiện
không có đường gọi hợp lệ** — không phải vì Scouter thiếu năng lực, mà vì trang không khai tên.

Tên đọc được từ cây trợ năng: `Export` · `Share` · `Render` · `Generate` · `Describe` · `LEGACY`
· `EN` · `Car trial 1` · `Đ` · `89%` · `100%`.

### 10.2 ACTION GUIDELINE — xác nhận được gì, ở đâu

| Năng lực | `/files/<org>/recent` | `/workbench/<uuid>` |
|---|---|---|
| giải target theo tài khoản | **ĐƯỢC** — email trong a11y | **KHÔNG** — xem 10.3 |
| `scout.song` | ĐƯỢC (8ms) | ĐƯỢC |
| kiểm kê bề mặt (`scout.page`) | ĐƯỢC — 23 phần tử | ĐƯỢC — 25 phần tử |
| đọc cây trợ năng | ĐƯỢC | ĐƯỢC — 50 node |
| khoá danh tính trước ghi | **ĐƯỢC** | **KHÔNG** |
| lượt ghi đảo ngược được | **ĐƯỢC** — gõ/xoá ô tìm tệp | **KHÔNG** — xem 10.3 |

### 10.3 VÌ SAO DỪNG Ở READ-ONLY — hai lý do độc lập, mỗi cái tự đủ

**⑴ Canvas không phơi danh tính** (`G-115`). 50 tên node: không email, không workspace, không
gói cước. Thứ duy nhất dính tới người dùng là chữ `"Đ"` của avatar — một ký tự không do ai
khai, trùng với mọi tài khoản bắt đầu bằng chữ đó. `khoaDanhTinh` trả `DANH_TINH_LECH`
**4/4 lượt, đều ~100ms**: dấu hiệu KHÔNG TỒN TẠI, chứ không phải trang chưa dựng xong. Điều
kiện ⑼ của đề bài — *khoá danh tính ngay trước write* — vì thế **không thoả được**.

**⑵ Hai ô prompt đang giữ chữ thật của Đức** (`G-116`): `"Elegan nice coupe silver car"` và
`"Racing morden car colorful"`. Lượt ghi *gõ rồi xoá* — thứ chạy sạch ở `/files/…` — ở đây sẽ
**xoá mất chữ của người dùng**. Và selector khớp **2**, trong khi luật gói số 7 đòi đúng một.

> Tính đảo ngược là thuộc tính của **trạng thái**, không phải của **lệnh**. Cùng một `scout.clear`:
> vô hại trên ô trống, phá hoại trên ô đầy.

### 10.4 PRIMITIVE CÒN THIẾU — và chỉ đúng một cái là thật

**Danh tính theo TỪNG BỀ MẶT.** `danh_tinh` hôm nay là một dấu hiệu cho cả site; thực tế mỗi
route phơi một bộ khác nhau. Hợp đồng adapter cần `danh_tinh` khai được theo bề mặt, và
`khoaDanhTinh` chọn bộ theo URL hiện tại.

Nhưng **đó chưa phải việc gõ code**: phải ĐO ra trước một dấu hiệu vừa ổn định vừa phân biệt
được trên canvas. Hiện chưa có. Ba đường đã loại, kèm lý do:

| Đường | Vì sao loại |
|---|---|
| org UUID trong `srcRoute=` của URL | vết của lượt điều hướng vừa rồi, mất sau một lượt tải lại |
| chữ `"Đ"` của avatar | một ký tự, không do ai khai |
| mở menu avatar để lộ email | mở menu là một lệnh GHI — cần danh tính trước, mà danh tính là thứ đang đi tìm |

**Không thiếu primitive nào khác.** `scout.song`, `scout.page`, `scout.a11y`, `scout.query`,
`scout.type`, `scout.clear`, `scout.key` đều đủ; chỗ gãy nằm ở **hợp đồng danh tính**, không ở
từ vựng.

### 10.5 BẤT BIẾN MỚI — có máy canh, không chỉ có chữ

> **Sau mỗi lượt nối lại Bridge/phiên: KHÔNG dùng lại `target_id` cũ.** Giải lại từ adapter +
> danh tính tài khoản, mỗi lượt chạy.

Đo 18/09 (`G-118`): host tắt rồi bật lại, ghế tự nối lại, **mọi `target_id` cũ chết**. Nguy hiểm
không nằm ở lượt chết — nằm ở khả năng Chrome cấp lại đúng chuỗi ấy cho một tab **khác**.

Khối **ⓤ** của `giai-target-smoke.mjs` quét mã thật của mọi pilot và ĐỎ nếu thấy một chuỗi 32
hex gõ cứng. Đã thử đột biến: gõ một id vào `ghi.mjs` → ĐỎ đúng dòng.

---

## 11. PHÉP ĐO MENU AVATAR — 18/09 tối, CHƯA TRỌN

Đức mở menu avatar rồi bảo đo diff mở-vs-đóng. **Chưa lấy được mẫu "mở"**: lúc tôi đọc, cửa sổ
đã về `/files/…` và `scout.page` đếm **23 phần tử tương tác** — đúng bằng nền lúc menu đóng.
**7 lượt đọc, 0 lệnh GHI.**

### 11.1 Nhưng dữ liệu cũ đã trả lời phần lớn câu hỏi

| Bề mặt | `total_nodes` | có email |
|---|---|---|
| `/files` (menu đóng) | 275, trả về 131, `truncated:false` | **có** |
| `/workbench` sau khi panel Settings từng mở | 143 | **có** ×2 |
| `/workbench` canvas sạch | 50 | **không** |

Ba dòng này đọc chung nói một câu khác hẳn câu §10.3 viết: dấu hiệu danh tính trên route
`/workbench/` **không THƯỜNG TRÚ, nhưng GẮN ĐƯỢC**. Nó vào cây khi có thứ gắn nó vào — và
gắn nó lại cần một lệnh GHI. `G-115` đã sửa tại chỗ.

**Vòng luẩn quẩn giữ nguyên, lý do thì khác:** không phải *"Vizcom không cho biết đang là ai"*
mà là *"Vizcom chỉ nói khi được hỏi, mà hỏi là một lệnh ghi"*.

### 11.2 Một lỗi tiềm ẩn tìm thấy trên đường đi — CHƯA VÁ

`scout.a11y` có `limit` (mặc định **400**, trần 1500) và một cờ **`truncated`**.
**`docDanhTinh` của resolver không truyền `limit` và không đọc cờ đó.**

Trang nào có hơn 400 node hữu ích sẽ đẩy dấu hiệu danh tính ra ngoài cửa sổ trả về, và bộ giải
báo `DANH_TINH_LECH` cho **đúng** tài khoản. Fail-closed nên an toàn — nhưng đó là một lượt
**từ chối sai mà không ai biết lý do**, và nó sẽ đọc y hệt kết luận §10.3.

Đo lại `/files` hôm nay: `truncated:false`, nên mọi kết luận đã công bố vẫn đứng. Bản vá
(kiểm `truncated`, ném nếu bị cắt) **chưa làm** — Đức chưa cho sửa code lượt này. `G-119`.

### 11.3 CÒN THIẾU ĐÚNG MỘT PHÉP ĐO

Workbench mở **và** menu avatar mở **cùng lúc**, đọc trong lúc đó. Nếu email xuất hiện → dấu
hiệu tồn tại, và primitive cần thêm là *"mở menu rồi đọc"* (một lệnh ghi, phải giải bài toán
danh tính-trước-ghi bằng cách khác). Nếu không xuất hiện → route workbench thật sự không mang
danh tính, và đường duy nhất là chốt danh tính ở `/files` rồi khoá lại bằng một bất biến khác.
