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
| ② `scout.song` | **CODE XONG, CHƯA CHẠY ĐƯỢC** | `scouter-bridge-core.mjs` (bảng method) + `scouter-seed-core.mjs` (xử lý + `SONG_HAN_MS`). Ghim ⑳. **Chặn bởi lượt nạp lại extension** — đo thật lúc 18/09: `METHOD_NOT_FOUND` sau **22ms** |
| ④ pilot ghi | **CHƯA** | Chặn bởi công tắc đường ghi |

**Ba chỗ pilot sửa lại lộ trình này** — ghi ra vì lộ trình là một lời khai, không phải một sự thật:

1. **§6 sai**: 3/3 chứ không phải 2/3, và sai luôn địa chỉ chân thứ ba (`G-108`).
2. **§3 đắt hơn thực tế**: `scout.song` **không** cần đụng `scouter-probes.mjs` — nó chạy lại
   `page.view`, tức đúng một `Page.getLayoutMetrics` đã mở từ 14/09. Nên chỉ **1** tệp lệch
   khỏi bản chép Udin, không phải 2, và **không cửa CDP nào mới** (`G-109`).
3. **Khai `CO_Y_KHAC` chưa đủ**: nó làm `continue`, tức tắt hẳn phép ghim byte trên cả tệp.
   Đã đổi sang **neo bằng băm hai bên** — và nó bắt thật một lượt sửa của chính tôi ngay
   trong phiên (`G-110`).
