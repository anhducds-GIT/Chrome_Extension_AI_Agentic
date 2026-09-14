# CAPABILITIES — Scouter làm được gì, chứng minh tới đâu, còn thiếu gì

> **Viết cho Đức đọc.** Đức chốt mô hình ngày 13/09. Mọi ô "ĐÃ CHỨNG MINH" đều trỏ tới bằng chứng
> chạy thật. Không có bằng chứng thì ô đó chưa được xanh.
> Danh sách 25 mục phạm vi `SEED v0.1` vẫn nằm ở `docs/studies/SCOUTER-CAPABILITY-INVENTORY-V1.md`
> (gốc repo). File này **không thay** danh sách đó: nó đo theo **tay chân của trình duyệt**.

## 1. Mô hình — hai thứ khác nhau, đừng gộp

**Code vẫn ba lớp như cũ:** Seed (tay chân chung) → Adapter (hiểu biết riêng từng trang) → Record (bằng chứng).

**Đo tiến độ theo ba cấp:**

| Cấp | Câu hỏi | Đo bằng | Ở đâu |
|---|---|---|---|
| **1 · Capability** | Scouter có tay chân nào? | bảng §2 | Seed |
| **2 · Workflow** | Trên trang X, nó làm xong được việc gì? | hợp đồng §4 | Adapter |
| **3 · Site Mastery** | Việc bắt buộc của trang X đã đủ chưa? | **tính ra từ cấp 2**, không lưu riêng | — |

- **Không có con số % tổng** kiểu "Scouter 83%". Chỉ có hai phân số độc lập: Seed và từng trang.
- **8 mốc ở bảng bên (`MOC_THUAN_HOA`) giữ nguyên.** Chúng là 8 dòng đầu của cấp 1, không bị xoá.
- **Phép chia Seed hay Adapter:** đổi trang mà tên và ý nghĩa lệnh vẫn giữ nguyên thì vào Seed.
  `kéo(A, B)` là Seed. "Kéo clip 2 lên trước clip 1" là Adapter.

## 2. Cấp 1 — bảng năng lực

**Trạng thái:** `CHƯA CÓ` · `CÓ` (có mã và phép ghim) · `ĐÃ CHỨNG MINH` (chạy trên trình duyệt thật:
trang thật, hoặc Chrome riêng của `npm run scouter:action-probe`).
Test xanh mà chưa chạy thật thì chỉ là `CÓ`. S-23 là ví dụ: test xanh hết, bấm thật vẫn hỏng.

**Cột "Duyệt":** ✋ = cần Đức duyệt trước khi làm, vì mở lệnh Bridge mới, method CDP mới, hoặc quyền mới
(luật gói 4 và 5).

### A · Nhìn

| Mã | Năng lực | Lệnh | Trạng thái | Bằng chứng / ghi chú | Duyệt |
|---|---|---|---|---|---|
| O1 | Thông tin trang + phần tử bấm được | `scout.page` | **ĐÃ CHỨNG MINH** | `hnx.vn` 07/09 · Udin 12/09 (`TRIALS.md`) | |
| O2 | Cây DOM | `scout.tree` | **ĐÃ CHỨNG MINH** | Udin 12/09 | |
| O3 | Cây trợ năng (vai trò + tên) | `scout.a11y` | **ĐÃ CHỨNG MINH** | Udin 12/09: phân biệt "Agent" / "Manual Gen" mà class không phân biệt được | |
| O4 | Đếm phần tử khớp selector | `scout.query` | **ĐÃ CHỨNG MINH** | Udin 13/09 | |
| O5 | Chụp màn hình phần đang thấy | `scout.shot` | **ĐÃ CHỨNG MINH** | Udin 12/09. Chụp cả trang dài: CHƯA CÓ | |
| O6 | Chờ có / hết / **bấm được thật** | `scout.wait` | **ĐÃ CHỨNG MINH** | Udin 13/09, `G-28` `G-30` | |
| O7 | Đọc thuộc tính trạng thái (`disabled`, `aria-*`…) | `scout.query` | **ĐÃ CHỨNG MINH** | Udin 13/09 `G-29`: nút Send mất `disabled` sau khi gõ | |
| O8 | **Đọc chữ trên trang** (câu trả lời, thông báo lỗi) | `scout.text` | **ĐÃ CHỨNG MINH** | [ADR-0006](adr/0006-chinh-sach-che-va-cua-hep-doc-chu.md) · Udin 14/09 (`G-57`): đọc màn chắn ra *"User Limit Reached…"*, `div` khớp 146 thì **từ chối**. 10 khối ghim · 6 đột biến tay. Trần 5.000 ký tự **không** chặn được việc đọc cả trang nhỏ (`G-58`) — giới hạn đã khai trong ADR | |
| O9 | Phần tử trong iframe / shadow DOM | — | **CHƯA ĐO** | Chưa trang nào cần | |
| O10 | Chụp DOM + bố cục một lượt | ~~`scout.snapshot`~~ | **ĐÃ BỎ 08/09** | Làm chết service worker trên 2/3 trang lớn. Đừng mở lại nếu chưa có cách khác | |

### B · Đi và chọn tab

| Mã | Năng lực | Lệnh | Trạng thái | Bằng chứng / ghi chú | Duyệt |
|---|---|---|---|---|---|
| N1 | Liệt kê tab | `scout.targets` | **ĐÃ CHỨNG MINH** | mọi lượt thật | |
| N2 | Chọn tab làm việc | `target_id` trong từng lệnh | **ĐÃ CHỨNG MINH** | `targetId` đổi sau điều hướng, phải hỏi lại | |
| N3 | Đi tới URL | `scout.navigate` | **ĐÃ CHỨNG MINH** | 08/09, `T3` | |
| N4 | Tải lại trang | `scout.navigate` cùng URL | **ĐÃ CHỨNG MINH** | `T3` / `S-19` đóng | |
| N5 | Quay lại / tiến tới | — | **CHƯA CÓ** | cần `Page.navigateToHistoryEntry` | ✋ |
| N6 | Biết trang tải xong | `scout.navigate` chờ đọc được | **MỘT PHẦN** | trang SPA tải tiếp sau đó: dùng `scout.wait` | |
| N7 | Nhiều URL **lần lượt**, một tab | `scout.navigate` + `scout.wait` | **CHƯA ĐO** | ADR ⑶ "một Scouter một URL" giữ nguyên. Chạy đồng thời nhiều tab: **không làm** | |
| N8 | Mở / đóng tab | — | **CHƯA CÓ** | cần `Target.createTarget`, đụng ADR ⑶ | ✋ |

### C · Tay người

| Mã | Năng lực | Lệnh | Trạng thái | Bằng chứng / ghi chú | Duyệt |
|---|---|---|---|---|---|
| I1 | Bấm chuột trái | `scout.click` | **ĐÃ CHỨNG MINH** | Chrome riêng 11/11 (kể cả phải cuộn, `S-23`) · Udin 13/09. **`S-22` còn mở** | |
| I2 | Gõ chữ | `scout.type` | **ĐÃ CHỨNG MINH** | Udin 13/09 `G-29` | |
| I3 | Nhấn phím có tên (Enter, Tab, Esc, mũi tên…) | `scout.key` | **ĐÃ CHỨNG MINH** | Chrome riêng. Ghế Đức: dính `S-22` | |
| I4 | **Xoá chữ trong ô** (Ctrl+A rồi Delete) | — | **CHƯA CÓ** | `scout.type` không xoá chữ cũ; `gui-prompt.mjs` phải từ chối khi ô có chữ. Cần phím tổ hợp: method CDP đã có, chỉ mở rộng bảng phím | ✋ |
| I5 | Cuộn tự do (bánh xe chuột) | — | **CHƯA CÓ** | Bấm đã tự cuộn tới phần tử. Cuộn danh sách dài để tải thêm thì chưa. Method CDP đã có, cần lệnh Bridge mới | ✋ |
| I6 | Rê chuột (hover) | — | **CHƯA CÓ** | menu chỉ hiện khi rê chuột. Method CDP đã có, cần lệnh Bridge mới | ✋ |
| I7 | Bấm đúp / bấm phải | — | **CHƯA CÓ** | Method CDP đã có, cần thêm tham số | ✋ |
| I8 | Kéo thả A → B | — | **CHƯA CÓ** | toạ độ đích cũng phải suy từ **phần tử đích** (luật gói 7). Cần lệnh Bridge mới | ✋ |
| I9 | Tải file lên (upload) | — | **CHƯA CÓ** | cần `DOM.setFileInputFiles`; file phải lấy từ vùng ghi Bridge, không lấy tuỳ ý trên máy | ✋ |
| I10 | Đưa tiêu điểm vào ô | trong `scout.type` | **CÓ** | không có lệnh riêng; chưa cần | |

### D · Thấy trang đã đổi

| Mã | Năng lực | Lệnh | Trạng thái | Bằng chứng / ghi chú | Duyệt |
|---|---|---|---|---|---|
| D1 | Nghe mạng (không header, không nội dung) | `scout.network` | **ĐÃ CHỨNG MINH** | 30 lượt gọi trên một lượt tải trang (`HANDOFF`) | |
| D2 | Request hỏng (mã lỗi) | `scout.network` | **CÓ** | có trường status; chưa dùng trong workflow nào | |
| D3 | Lấy file / ảnh về đĩa | `scout.fetch` · `scout.grab` + `file.write` | **ĐÃ CHỨNG MINH** với `hnx.vn` | Ảnh Udin: `scout.fetch` **KHÔNG dùng được** (403, URL ký sẵn). Đường đúng là `scout.grab` — xem O11 | |
| O11 | Lấy tệp sau một **URL ký sẵn** mà không để chữ ký ra ngoài | `scout.grab` | **MỘT PHẦN** | Đức chốt `S-24` đường ⒜ 14/09. Đã nạp vào extension và **đã gọi thật** trên Udin: đọc `src` đầy đủ bên trong, gọi mạng, trả mã trạng thái (`G-52`). **Chưa có lượt 200 → byte → đĩa**, vì mọi ảnh trên trang đã quá hạn 900s (`G-51`). Chờ một lượt Udin rảnh chỗ. 11 khối ghim · đột biến 128/128 | |
| D4 | So trước / sau một thao tác | — (adapter tự làm) | **CHƯA CÓ** (adapter tự làm) | `gui-prompt.mjs` so tập `src` ảnh. Lặp ở trang thứ hai thì đưa lên seed (luật gói 2) | ✋ |
| D5 | Lỗi console / lỗi JS của trang | — | **CHƯA CÓ** | cần `Log.enable`; `Runtime.*` bị cấm | ✋ |

### E · An toàn và vận hành

| Mã | Năng lực | Lệnh / chỗ | Trạng thái | Bằng chứng / ghi chú | Duyệt |
|---|---|---|---|---|---|
| R1 | Công tắc đường ghi, mặc định ĐÓNG | bảng bên | **ĐÃ CHỨNG MINH** | phanh chặn thật 08/09 giữa lượt tải | |
| R2 | Dừng khẩn | Ctrl+Shift+X | **CÓ** | chưa có lượt thật ghi lại | |
| R3 | Trần 200 lượt mỗi lần mở | lõi ghi | **CÓ** | ghim `P1..P12` | |
| R4 | Mã lỗi nói thật (không báo ĐẠT giả) | hai lõi | **MỘT PHẦN** | `CLICK_HIT_TEST_FAILED` bắt được `S-23`. `S-22` vẫn báo ok giả — nay là **giới hạn đã khai** trong `README`, không phải lỗi chờ vá | |
| R5 | Nhật ký lượt chạy + ghi đĩa | `scouter-journal-core` + `file.*` | **ĐÃ CHỨNG MINH** | T7 12/09 | |
| R6 | Tự nạp lại code mới | `scout.reload` | **ĐÃ CHỨNG MINH** | mọi phiên | |
| R7 | Thử lại / chạy tiếp khi đứt | — | **CHƯA CÓ** | nhóm B của danh sách 25 mục | |

### Đếm cấp 1 (đếm lại tay khi sửa bảng)

**ĐÃ CHỨNG MINH 20 · MỘT PHẦN 2 · CÓ 5 · CHƯA CÓ / CHƯA ĐO 13 · ĐÃ BỎ 1.** Tổng 41 dòng.
**Seed Coverage = 20 / 40** (không tính dòng ĐÃ BỎ; MỘT PHẦN không tính là đạt). O11 thêm 14/09 và
đang ở `CÓ`: có mã, có ghim, **chưa có lượt chạy thật** — đúng định nghĩa ở đầu §2.

> ⚠️ **Con số này gõ tay và KHÔNG có máy nào soát.** Không dòng mã nào trong repo đọc file này
> (kiểm 14/09: `grep -rl CAPABILITIES --include=*.mjs` → rỗng). Nên một ô khai `ĐÃ CHỨNG MINH`
> mà không có lượt chạy thật thì **không có cổng nào đỏ**. Đó là nợ `T17` ở §5 — và nó ngược
> đúng luật chung của repo: *bảng là thứ SINH RA, không phải thứ gõ vào*.
>
> **Năm chữ trạng thái, không được chế thêm:** `CHƯA CÓ` · `CHƯA ĐO` · `CÓ` · `MỘT PHẦN` ·
> `ĐÃ CHỨNG MINH` (+ `ĐÃ BỎ <ngày>` cho dòng chết). Trước 14/09 bảng này chạy 8 cách viết cho 3
> trạng thái — hai trong số đó (`ĐÃ CHỨNG MINH một phần`, `CHƯA CÓ ở seed`) đã gộp lại.

## 3. Checklist bổ sung cho Seed — theo thứ tự việc thật cần

Mỗi mục đi đủ 4 bước: ☐ ghi `CHƯA` trong `GIA-THUYET.md` → ☐ mã + phép ghim + đột biến → ☐ đạt trên
Chrome riêng (probe) → ☐ đạt trên trang thật. Bước 4 xong thì sửa ô ở §2 thành `ĐÃ CHỨNG MINH`.

| Ưu tiên | Mã | Vì sao trước | Duyệt |
|---|---|---|---|
| ~~—~~ | ~~`S-22`~~ | **ĐÓNG 14/09 bằng lời khai trong `README`**, không bằng bản vá. Đừng mở lại điều tra | |
| 1 | `T13` nối `lay-anh.mjs` sang `scout.grab` | Đóng W3, và cho `scout.grab` lượt chạy thật đầu tiên | |
| ~~2~~ | ~~O8 đọc chữ~~ | **XONG 14/09** — `scout.text` | |
| 3 | I4 xoá ô nhập · I9 upload | Hai mục cuối của **danh sách đóng băng** §5.2 — phải xong TRƯỚC khi tách Udin | ✋ |
| 4 | I6 hover · I5 cuộn · I7 bấm đúp/phải | Menu ẩn, danh sách dài, trình soạn thảo. Bảo hiểm cho trang thứ hai | ✋ |
| 5 | I8 kéo thả | **Ngoài** danh sách đóng băng: Udin không cần. Chỉ khi có trang timeline thật | ✋ |
| 6 | D5 lỗi console · N5 back/forward · O9 iframe | Làm khi có trang cần | ✋ |
| 7 | D4 so trước/sau lên seed | Chỉ khi trang thứ hai lặp lại đúng mẫu đó | ✋ |

**Không làm:** chạy đồng thời nhiều tab (N8 đồng thời) · lệnh kiểu `addBlock()` / `generateImage()`
trong seed (đó là việc của adapter) · máy tổng hợp mastery trước khi có trang thứ hai.

## 4. Cấp 2 — hợp đồng workflow

Mỗi workflow của một adapter khai đủ 5 phần. Không có phần 3 và 4 thì không được gọi là ĐẠT:

```
Điều kiện trước → Thao tác → Dấu hiệu THÀNH CÔNG (đọc trên trang) → Dấu hiệu THẤT BẠI → Bằng chứng
```

**Trạng thái:** `CHƯA` · `ĐẠT` · `HỎNG` · `CHẶN` (thiếu năng lực seed) · `N/A`.
**Bằng chứng tối thiểu:** ngày · adapter · điều kiện trước quan sát được · thao tác đã chạy · dấu hiệu
thành công quan sát được. Không cần chụp màn hình từng cú bấm; bằng chứng phải chứng minh **kết quả**.

### Udin Optic — `pilots/udin-optic/` (danh sách đề xuất, **Đức chốt mục nào bắt buộc**)

| Mã | Workflow | Cần | Trạng thái | Hợp đồng / bằng chứng |
|---|---|---|---|---|
| W1 | Vượt màn "User Limit Reached" | O4 O6 I1 | **ĐẠT** 13/09 | `qua-man-cho.mjs` · trước: màn chắn có · thao tác: chờ nút `usable` → bấm · thành công: màn chắn hết + ô prompt `usable` · thất bại: màn chắn còn sau 15 giây · `G-28` |
| W2 | Gửi prompt, chờ xong, có ảnh mới | O4 O6 O7 I1 I2 | **ĐẠT** 13/09, 3 lượt | `gui-prompt.mjs` · trước: không đang chạy + ô trống · thao tác: gõ → Send mở khoá → bấm · thành công: nút thành Stop rồi tắt + có `src` ảnh mới · thất bại: Send vẫn khoá / không chạy / không có ảnh mới / quá 5 phút · `G-29` `G-30` |
| W3 | Lấy ảnh kết quả về đĩa | O11 | **CHƯA — mã xong, chờ một lượt chạy thật** | `lay-anh.mjs` đã nối sang `scout.grab` (14/09), 21 khối ghim, 4 con đột biến tay giết được. **Chặn bởi:** `scout.grab` chưa nạp vào extension (Bridge khai 17 method) + cần công tắc ghi. Mỗi ảnh tiêu **1** đơn vị trần ghi |
| W4 | Đọc câu trả lời chữ của agent | O8 | **CHẶN** | chờ Đức chốt chính sách che |
| W5 | Chọn chế độ Agent / Manual Gen | O3 I1 | **CHƯA** | |
| W6 | Đưa một ảnh kết quả vào canvas | I1 | **CHƯA** | nút "Add to canvas" có trong DOM 13/09 |
| W7 | Gửi prompt lần hai trên cùng ô | I4 | **CHẶN** | |
| W8 | Tải ảnh tham chiếu lên | I9 | **CHẶN** | |
| **E2E** | Mở trang → W1 → W2 → W3 | | **CHƯA** | `e2e.mjs`: mã + 5 khối ghim. Cố ý chưa chạy — chờ `T13` xong, không thì tốn credit rồi ngã ở chặng ba (`G-34`) |

### Cấp 3 — Udin đang ở đâu (tính từ bảng trên)

Chưa có danh sách bắt buộc Đức chốt, nên chỉ đếm được: **2 / 8 workflow ĐẠT · 4 CHẶN · E2E CHẶN**.
Mức: **PARTIAL**. Chỉ được gọi **MASTERED** khi mọi workflow bắt buộc ĐẠT, không còn CHẶN, và E2E ĐẠT.

## 5. Lộ trình — viết lại 14/09 quanh MỘT câu hỏi của Đức

> **Câu hỏi đặt lại lộ trình:** *"hoàn thiện nốt phần Scouter, sau đó mới tách Udin Optic riêng,
> như vậy sẽ không phải sửa quá sâu vào code Scouter."*
>
> Vậy thước đo của cả lộ trình này **không** còn là "Seed Coverage bao nhiêu phần trăm". Nó là:
> **cái gì phải đúng TRƯỚC khi tách, để sau khi tách không bao giờ phải mở lại Scouter nữa.**

### 5.1 Vì sao thêm một method SAU khi tách thì đắt

Thêm một lệnh Bridge không phải sửa một file. Đo thật trên `scout.grab` ngày 14/09 — phải sửa tay
**sáu** chỗ trước khi cổng xanh lại:

`ACTION_NAMES` · `WRITE_CDP_METHODS` · `METHOD_REGISTRY` · ba danh sách ghim
(`scouter-actions-smoke` · `scouter-bridge-smoke` · `EXPECTED_WRITE_METHODS`) · bảng lệnh trong
`README` · **số đếm method** trong `README` · số đột biến trong `scouter-mutation-check`.

Cộng thêm một lượt audit độc lập và một lượt Đức nạp lại extension. **Đó chính là "sửa sâu vào
Scouter" mà Đức muốn tránh.** Nên luật của lộ trình này là:

> **Mọi năng lực mà adapter sẽ cần, phải có TRƯỚC khi tách. Sau khi tách, Scouter đóng băng.**

### 5.2 DANH SÁCH ĐÓNG BĂNG — thứ phải xong trước khi tách

Rút ra từ bảng `W` ở §4: bảy trong tám workflow của Udin hiện **CHƯA hoặc CHẶN**, và bốn cái
chặn vì **seed thiếu tay chân**, không vì adapter viết chưa xong.

| | Năng lực | Chặn workflow nào | Vì sao không hoãn được |
|---|---|---|---|
| ~~**O8**~~ | ~~đọc chữ trên trang~~ | — | **XONG 14/09** — `scout.text`, chạy thật trên Udin (`G-57`) |
| **I4** | xoá chữ trong ô | `W7` gửi prompt lần hai | Một phiên làm việc thật là **nhiều** lượt prompt, không phải một |
| **I9** | tải file lên | `W8` ảnh tham chiếu | Udin là công cụ ảnh; không upload được thì một nửa công cụ nằm ngoài tầm |
| **I5 I6 I7** | cuộn · rê chuột · bấm đúp/phải | chưa chặn `W` nào của Udin | Bảo hiểm cho **trang thứ hai**. Mở sau khi tách thì trả lại đúng sáu chỗ ở §5.1 |
| ~~chính sách che~~ | ~~`de-xuat-chat-v1`~~ | — | **ĐÃ KÝ 14/09** — [ADR-0006](adr/0006-chinh-sach-che-va-cua-hep-doc-chu.md), đường ⒝: ký nguyên bản + cửa hẹp `scout.text`. `O8` hết chặn |

**`I8` kéo thả nằm NGOÀI danh sách** — Udin không cần (nút *"Add to canvas"* là một cú bấm
thường, `W6`). Chỉ mở khi có trang timeline thật, và lúc đó chấp nhận mở lại Scouter một lần.

### 5.3 Các chặng

| Chặng | Việc | Xong khi | Chờ ai |
|---|---|---|---|
| ~~P0~~ | Chốt mô hình đo | **XONG 13/09** | — |
| ~~P1b~~ | ~~`T14` đóng `S-22` bằng chẩn đoán~~ | **ĐÓNG 14/09 bằng LỜI KHAI**, không bằng bản vá — `README` khai `scout.click` không hứa *"trang đã nhận"*. Lý do dừng: năm lượt điều tra cùng một giả thuyết | — |
| **P1a** | `T13` — `lay-anh.mjs` đi bằng `scout.grab`, chạy thật | một ảnh Udin nằm trên đĩa, và `scout.grab` có lượt chạy thật đầu tiên | **không ai** |
| **P1c** | `T15` — E2E Udin (`W1→W2→W3`) | ba chặng chạy một mạch trên ghế thật | P1a |
| ~~P2a~~ | ~~`O8` đọc chữ qua `scout.text`~~ | **XONG 14/09** — method chạy thật trên Udin (`G-57`). Còn `W4` (đọc câu trả lời của agent) chờ một lượt Udin rảnh chỗ | — |
| **P2b** | `I4` xoá ô · `I9` upload | `W7` `W8` ĐẠT trên trang thật | ✋ Đức chốt từng mục |
| **P2c** | `I5` cuộn · `I6` rê chuột · `I7` bấm đúp/phải | ĐÃ CHỨNG MINH trên Chrome riêng | ✋ Đức chốt gộp một lượt |
| **P2d** | `T17` — **máy sinh bảng §2**, thay cho gõ tay | một ô khai `ĐÃ CHỨNG MINH` không có dòng `TRIALS` thì cổng ĐỎ | không ai |
| **P3** | **ĐÓNG BĂNG SEED** — `T8` đổi tên `observer`→`scouter`, `T9` đóng gói `v1` | không method mới nào được thêm sau mốc này mà không có ADR | P2a–P2d |
| **P4** | **Tách Udin** thành gói riêng, điều khiển seed qua Bridge (không chép seed) | các `W` bắt buộc ĐẠT **từ gói mới**, và **không một dòng nào của Scouter phải sửa** | P3 |
| **P5** | Trang thứ hai khác loại (node editor / timeline / CRUD) | có `W` ĐẠT mà không sửa seed | P4 |

**Đổi so với bản sáng 14/09:** tách Udin từ **P3 lùi xuống P4**, và đứng sau một mốc đóng băng.
Bản cũ cho tách trước khi mở `O8` `I4` `I9` — tức là đã hẹn sẵn ba lượt mở lại Scouter sau khi
tách. Đó đúng là thứ Đức bảo tránh.

### 5.4 Rủi ro và nợ đang mở

**Không còn câu hỏi chính sách nào treo.** `de-xuat-chat-v1` đã ký 14/09 ([ADR-0006](adr/0006-chinh-sach-che-va-cua-hep-doc-chu.md)),
`D3` trả lời KHÔNG, `S-24` chốt đường ⒜. Thứ duy nhất còn cần tay Đức là **`H1`** — nạp lại
extension ghế `Dummy_Scout` và bật công tắc ghi, để `T13` có lượt chạy thật đầu tiên.

**`D3` (`scout.focus`) — Đức trả lời 14/09: KHÔNG.** Cửa sổ extension chạy **ẩn bên dưới**, chỉ
vài ca ngoại lệ mới lên trên. Không mở `scout.focus` làm đường mặc định. Kéo theo: mọi adapter
phải chạy được trên **tab nền** — và đó là trạng thái đã đo: `G-40` `G-41` `G-42` đều cho thấy
tab nền / cửa sổ thu nhỏ / tab chưa từng hiện **vẫn nhận đủ** cú bấm.

**Nợ kỹ thuật, đừng để rơi:**
· `T16` — dấu chẩn đoán của trang thử đọc được bằng **giá trị** (hai kết luận ngược sinh ra từ đây)
· `scout.grab` chưa có phép ghim đi **qua lõi seed** (mới ghim ở lõi hành động + kiểm mã nguồn)
· `O11` mang mã nhóm **A** nhưng nằm trong nhóm **D** — sửa khi nào có lượt đụng `HANDOFF`
· **§4 là nội dung của ADAPTER đang nằm trong tài liệu của SEED.** Nó phải dọn sang
  `pilots/udin-optic/` **trong lúc làm P4**, không phải trước — dọn sớm thì Đức mất trang xem
  Udin đang ở đâu mà chẳng đổi được gì.

**Nhiều URL:** chỉ làm **lần lượt, một tab một lúc** (N7). Chạy đồng thời phải có ADR mới.
