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
| O3 | Cây trợ năng (vai trò + tên) | `scout.a11y` | **ĐÃ CHỨNG MINH** | Udin 12/09: phân biệt "Agent" / "Manual Gen" mà class không phân biệt được. **Thu hẹp 16/09 khi làm `W5`:** câu ấy đúng hẹp hơn nó nghe — class KHÔNG nói được *cái nào là Agent*, nhưng `.active` nói được *cái nào đang chọn*, và đó mới là thứ `W5` cần. `W5` nay chạy bằng `O4`+`O8`. **Và `scout.a11y` không có trên dây của gói `udin-optic`** (12 method) — đừng khai nó là "Cần" cho một workflow của gói ấy | |
| O4 | Đếm phần tử khớp selector | `scout.query` | **ĐÃ CHỨNG MINH** | Udin 13/09 | |
| O5 | Chụp màn hình phần đang thấy, **và cả trang dài** | `scout.shot` | **ĐÃ CHỨNG MINH** | Udin 12/09. `full_page` + `scale` thêm 14/09 (`T27`): chụp cả tài liệu rồi thu nhỏ trong chính lượt chụp. Trần 25 triệu điểm ảnh, từ chối TRƯỚC khi dựng ảnh — `dom.snapshot` đã chết vì đúng chỗ đó. **Chạy thật 14/09** trên một trang cao 3.002px: khung nhìn 64 KB → cả trang 273 KB → cả trang ở tỉ lệ 0,25 chỉ **43 KB**, tức **bốn lần diện tích với hai phần ba số byte** | |
| O6 | Chờ có / hết / **bấm được thật** | `scout.wait` | **ĐÃ CHỨNG MINH** | Udin 13/09, `G-28` `G-30` | |
| O7 | Đọc thuộc tính trạng thái (`disabled`, `aria-*`…) | `scout.query` | **ĐÃ CHỨNG MINH** | Udin 13/09 `G-29`: nút Send mất `disabled` sau khi gõ | |
| O8 | **Đọc chữ trên trang** (câu trả lời, thông báo lỗi) | `scout.text` | **ĐÃ CHỨNG MINH** | [ADR-0006](adr/0006-chinh-sach-che-va-cua-hep-doc-chu.md) · Udin 14/09 (`G-57`): đọc màn chắn ra *"User Limit Reached…"*, `div` khớp 146 thì **từ chối**. 10 khối ghim · 6 đột biến tay. Trần 5.000 ký tự **không** chặn được việc đọc cả trang nhỏ (`G-58`) — giới hạn đã khai trong ADR | |
| O13 | **Đang nhìn phần nào của trang** (độ cuộn · khung nhìn · cỡ trang · còn bao nhiêu để cuộn · thu phóng) | `scout.view` | **ĐÃ CHỨNG MINH** | Làm 14/09, [ADR-0007](adr/0007-nhom-nhin-va-di-lai-va-uy-quyen-mo-rong.md). Là phép ĐỌC của cả nhóm *nhìn & đi lại*, và là thứ DUY NHẤT kiểm được `scout.scroll` — ba lệnh ghi chỉ hứa *đã bắn sự kiện*. Đọc bằng đơn vị CSS, và nói ra đã dùng đơn vị nào. **Chạy thật 14/09** trên ba trang: Udin `1090×783` không cuộn được (artboard vẽ trong khung cố định), bảng bên `404×3002` cuộn được, trang thử đo được **đúng 1.972 điểm ảnh** một lượt cuộn — tức là nó làm được đúng việc nó sinh ra để làm: **kiểm một lệnh ghi bằng trang** | |
| O9 | Phần tử trong iframe / shadow DOM | — | **CHƯA ĐO** | Chưa trang nào cần | |
| O12 | **Thu phóng trang** để nhìn toàn cảnh | `scout.shot` (`full_page` + `scale`) | **MỘT PHẦN** | Đức nêu 14/09 cho **layout dạng artboard** (Udin, Vizcom). Hai cái được, và cái thứ hai mới là lý do thật: ⑴ ảnh chụp khung nhìn phủ được cả artboard mà **ít byte hơn** ảnh cả trang — quan trọng vì tầng vận chuyển rớt quanh 65 KB (`G-63`); ⑵ ứng dụng canvas có thể **vẽ thêm phần tử** khi thu nhỏ, tức là Scouter *nhìn được nhiều hơn* chứ không chỉ *chụp gọn hơn* — **CHƯA ĐO**, xem `G-65`. Làm 14/09: **nửa ⑴ xong** bằng `scout.shot full_page + scale` — cả artboard trong một ảnh nhỏ, không cần `Emulation.*` nào. **Nửa ⑵ CHƯA**, và lý do là kiến trúc chứ không phải thiếu tham số: `scouter-engine.js` gắn rồi THÁO debugger quanh **từng lượt gọi**, mà `Emulation.setDeviceMetricsOverride` sống theo phiên debugger — xem `G-69` | |
| O10 | Chụp DOM + bố cục một lượt | ~~`scout.snapshot`~~ | **ĐÃ BỎ 08/09** | Làm chết service worker trên 2/3 trang lớn. Đừng mở lại nếu chưa có cách khác | |

### B · Đi và chọn tab

| Mã | Năng lực | Lệnh | Trạng thái | Bằng chứng / ghi chú | Duyệt |
|---|---|---|---|---|---|
| N1 | Liệt kê tab | `scout.targets` | **ĐÃ CHỨNG MINH** | mọi lượt thật | |
| N2 | Chọn tab làm việc | `target_id` trong từng lệnh | **ĐÃ CHỨNG MINH** | mọi lượt thật từ 07/09. `targetId` đổi sau điều hướng, phải hỏi lại (`T7`) | |
| N3 | Đi tới URL | `scout.navigate` | **ĐÃ CHỨNG MINH** | 08/09, `T3` | |
| N4 | Tải lại trang | `scout.navigate` cùng URL | **ĐÃ CHỨNG MINH** | `T3` / `S-19` đóng | |
| N5 | Quay lại / tiến tới | `scout.history` | **ĐÃ CHỨNG MINH** | Làm 14/09, [ADR-0007]. Đi đúng MỘT bước; người gọi nói hướng, `entryId` tính ở trong — mở một tham số `entry_id` là biến lệnh lùi thành con trỏ tự do vào lịch sử duyệt web của Đức. Hết đường thì `HISTORY_AT_END`, không im lặng. **Chạy thật 14/09**: đi từ Udin sang trang thử rồi `back` về đúng Udin (`entry 3/4`, `arrivedBy: new_document`), hai lượt liền | |
| N6 | Biết trang tải xong | `scout.navigate` chờ đọc được | **MỘT PHẦN** | trang SPA tải tiếp sau đó: dùng `scout.wait` | |
| N7 | Nhiều URL **lần lượt**, một tab | `scout.navigate` + `scout.wait` | **CHƯA ĐO** | ADR ⑶ "một Scouter một URL" giữ nguyên. Chạy đồng thời nhiều tab: **không làm** | |
| N8 | Mở / đóng tab | — | **CHƯA CÓ** | cần `Target.createTarget`, đụng ADR ⑶ | ✋ |

### C · Tay người

| Mã | Năng lực | Lệnh | Trạng thái | Bằng chứng / ghi chú | Duyệt |
|---|---|---|---|---|---|
| I1 | Bấm chuột trái | `scout.click` | **ĐÃ CHỨNG MINH** | Chrome riêng 11/11 (kể cả phải cuộn, `S-23`) · Udin 13/09. **`S-22` còn mở** | |
| I2 | Gõ chữ | `scout.type` | **ĐÃ CHỨNG MINH** | Udin 13/09 `G-29` | |
| I3 | Nhấn phím có tên (Enter, Tab, Esc, mũi tên…) | `scout.key` | **ĐÃ CHỨNG MINH** | Chrome riêng. Ghế Đức: dính `S-22` | |
| I4 | **Xoá chữ trong ô** (Ctrl+A rồi Delete) | `scout.clear` | **ĐÃ CHỨNG MINH** | Làm 14/09. Phím `A` và phím bổ trợ `Ctrl` **gõ cứng trong lõi ghi** — không mở tham số `modifiers`, vì `Ctrl` + phím tuỳ ý chạm tới lệnh của trình duyệt. ~~**CHƯA CHẠY THẬT**~~ → **CHẠY THẬT 16/09** (`S-27`): trên trang Udin qua ghế Scouter, cả ba nhánh — xoá ô **đang có 14 ký tự** (`da_kiem: true`, *“hai phím đã tới trang”*) · xoá lại ô **đã rỗng** (`da_kiem: true` kèm câu KHÁC: *“vốn đã rỗng — không chứng minh hai phím đã tới trang”*) · và nhánh **ĐỎ** trên Chrome sạch với ô `readonly` (`CLEAR_NOT_OBSERVED`). **Từ 16/09 nó TỰ KIỂM**: đọc lại ô, ĐỎ khi còn chữ. **Kiểm được cả ô mật khẩu** — dấu che ở lượt xoá nghĩa là *còn chữ*, một câu trả lời chứ không phải một ô mù; `scout.type` thì không kiểm được ở đó. Không xoá được trên macOS (ở đó là `Cmd+A`) | |
| I5 | Cuộn tới một phần tử, không bấm | `scout.scroll` | **ĐÃ CHỨNG MINH** | Làm 14/09, [ADR-0007]. **Cuộn theo SỐ ĐIỂM ẢNH thì KHÔNG**, và đó là một giới hạn đo được chứ không phải chưa làm: `Input.dispatchMouseEvent` kiểu `mouseWheel` **không bao giờ trả lời** trên trang thật, và lượt treo đó **giữ debugger cắm vào tab** nên khoá mọi lệnh sau — kẹt 120 giây thật, phải `scout.reload` mới gỡ (`G-72`). Đối chứng làm kết luận chắc: `scout.hover` chạy trọn trên đúng tab ấy, cùng method. **Chạy thật 14/09**: trang thử cuộn **1.972 điểm ảnh**, `conLai` từ 1.971 xuống 0, đo bằng `scout.view`. Và nó **miễn nhiễm với `S-22`**: `DOM.scrollIntoViewIfNeeded` là lệnh DOM, không đi qua đường sự kiện chuột — nên nó là lệnh ghi DUY NHẤT của nhóm này chứng minh được trên ghế Đức | |
| I6 | Rê chuột (hover) | `scout.hover` | **CÓ** | Làm 14/09, [ADR-0007]. Chạy trên Udin: lệnh **hoàn tất** 5,2 giây, hỏi-điểm trả `descendant`. **Nhưng thế KHÔNG phải chứng minh trang đã nhận** — tôi đã trót khai `ĐÃ CHỨNG MINH` rồi rút lại trong cùng ngày, vì trên ghế Đức **không sự kiện chuột nào tới trang** (`S-22`, Đức chốt ngừng điều tra 14/09): trang thử không đếm được lấy một lượt `mousedown` nào, kể cả của một lượt bấm thường. Cái ĐÃ chứng minh: lệnh chạy trọn, hỏi-điểm đúng, không treo. Vẫn hỏi-điểm trước khi bắn (`S-17`, khác loại sự kiện) | |
| I7 | Bấm đúp / bấm phải | `scout.click` (`button` · `click_count`) | **CÓ** | Làm 14/09: thêm THAM SỐ, **không thêm method** — mọi thứ đắt giá của lượt bấm (khớp đúng một · đưa vào tầm nhìn · hỏi-điểm) là y hệt, và tách ra là chép ba cái chốt ấy sang chỗ thứ hai. Không khai gì thì cư xử y như trước. Chạy trên trang thử 14/09: **lệnh hoàn tất, trang không đếm được sự kiện nào** — đó là `S-22`, không phải lỗi của hai tham số này. Ghế nào không dính `S-22` thì đây là chỗ đo lại | |
| I8 | Kéo thả A → B | — | **CHƯA CÓ** | toạ độ đích cũng phải suy từ **phần tử đích** (luật gói 7). Cần lệnh Bridge mới | ✋ |
| I9 | Tải file lên (upload) | — | **CHƯA CÓ** | cần `DOM.setFileInputFiles`; file phải lấy từ vùng ghi Bridge, không lấy tuỳ ý trên máy | ✋ |
| I10 | Đưa tiêu điểm vào ô | trong `scout.type` | **CÓ** | không có lệnh riêng; chưa cần | |

### D · Thấy trang đã đổi

| Mã | Năng lực | Lệnh | Trạng thái | Bằng chứng / ghi chú | Duyệt |
|---|---|---|---|---|---|
| D1 | Nghe mạng (không header, không nội dung) | `scout.network` | **ĐÃ CHỨNG MINH** | 30 lượt gọi trên một lượt tải trang (`HANDOFF`) | |
| D2 | Request hỏng (mã lỗi) | `scout.network` | **CÓ** | có trường status; chưa dùng trong workflow nào | |
| D3 | Lấy file / ảnh về đĩa | `scout.fetch` · `scout.grab` + `file.write` | **ĐÃ CHỨNG MINH** | `hnx.vn` 07/09. Ảnh Udin: `scout.fetch` **KHÔNG dùng được** (403, URL ký sẵn) — đường đúng là `scout.grab`, xem O11 | |
| O11 | Lấy tệp sau một **URL ký sẵn** mà không để chữ ký ra ngoài | `scout.grab` | **ĐÃ CHỨNG MINH** | Udin 14/09: **hai ảnh thật xuống đĩa**, 330.270 và 290.214 byte, kiểm bằng kích thước thật trên đĩa. Tệp lớn hơn một phong bì thì trả theo khúc 64 KiB (`G-63`) — một ảnh ≈ **16 khúc = 16 đơn vị trần ghi**. 12 khối ghim | |
| D4 | So trước / sau một thao tác | — | **CHƯA CÓ** | Adapter tự làm: `gui-prompt.mjs` so tập `src` ảnh. Lặp ở trang thứ hai thì đưa lên seed (luật gói 2) | ✋ |
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

**ĐÃ CHỨNG MINH 25 · MỘT PHẦN 3 · CÓ 6 · CHƯA CÓ / CHƯA ĐO 8 · ĐÃ BỎ 1.** Tổng 43 dòng.
**Seed Coverage = 25 / 42** (không tính dòng ĐÃ BỎ; MỘT PHẦN không tính là đạt).

Ngày 14/09 thêm sáu dòng cùng một lượt (`O13` `N5` `I5` `I6` `I7`, và `O5` mở rộng), rồi **chạy thật
cả sáu trong cùng ngày**. Bốn lên `ĐÃ CHỨNG MINH` — `O13` `N5` `I5` `O5`. **Hai dừng ở `CÓ`, và
đúng hai cái đó bắn SỰ KIỆN CHUỘT**: `I6` rê chuột, `I7` bấm phải / bấm đúp. Trên ghế Đức không sự
kiện chuột nào tới trang (`S-22`, Đức chốt ngừng điều tra 14/09), nên lượt chạy chỉ chứng minh được
*lệnh hoàn tất*, không chứng minh được *trang đã nhận*.

Đường chia ấy **không phải ngẫu nhiên, và nó là thứ đáng nhớ nhất của cả lượt này**: mọi năng lực
đi qua lệnh DOM đều chứng minh được trên ghế này; mọi năng lực đi qua đường sự kiện chuột thì
không. `scout.scroll` nằm bên đúng phía **vì bản sửa `G-72`** — bản bánh xe (sự kiện chuột) treo và
khoá cả tab; bản `scrollIntoViewIfNeeded` (lệnh DOM) cuộn được **1.972 điểm ảnh** đo bằng
`scout.view`. Bỏ một cơ chế chưa chứng minh để lấy một cơ chế đã chứng minh, và phần thưởng là nó
miễn nhiễm luôn với `S-22`.

Tôi đã trót khai `I6` là `ĐÃ CHỨNG MINH` rồi **rút lại trong cùng ngày** — "lệnh chạy xong" không
phải "trang đã nhận", và đó chính là ranh giới mà `README` đã ghi sau `S-22`.

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
| ~~1~~ | ~~`T13` nối `lay-anh.mjs` sang `scout.grab`~~ | **XONG 14/09** — W3 ĐẠT, hai ảnh xuống đĩa | |
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

### Udin Optic — **`workers/udin-optic/` (GÓI RIÊNG từ 15/09)**

**Dọn nhà 15/09 (`T21`).** Udin không còn là pilot của Scouter; nó là **extension riêng** — giao
thức `udin-optic.bridge`, tệp ghép cặp và cổng riêng, **12 method thay vì 24**, quyền hẹp về một
trang thay vì `<all_urls>`. Mọi hàng dưới đây nay đo **gói đó**, không đo Scouter.

Bảng này ở lại sổ của Scouter vì nó là **bằng chứng seed dùng chung được**: bốn chặng E2E ĐẠT từ
extension khác **mà `git status workers/duc-scouter` SẠCH** (15/09). Việc mới của Udin thì ghi ở
`workers/udin-optic/v0.1.0/`.

| Mã | Workflow | Cần | Trạng thái | Hợp đồng / bằng chứng |
|---|---|---|---|---|
| W1 | Vượt màn "User Limit Reached" | O4 O6 I1 | **ĐẠT** 13/09 | `qua-man-cho.mjs` · trước: màn chắn có · thao tác: chờ nút `usable` → bấm · thành công: màn chắn hết + ô prompt `usable` · thất bại: màn chắn còn sau 15 giây · `G-28` |
| W2 | Gửi prompt, chờ xong, có ảnh mới | O4 O6 O7 I1 I2 | **ĐẠT** 13/09, 3 lượt | `gui-prompt.mjs` · trước: không đang chạy + ô trống · thao tác: gõ → Send mở khoá → bấm · thành công: nút thành Stop rồi tắt + có `src` ảnh mới · thất bại: Send vẫn khoá / không chạy / không có ảnh mới / quá 5 phút · `G-29` `G-30` |
| W3 | Lấy ảnh kết quả về đĩa | O11 | **ĐẠT** 14/09 | `lay-anh.mjs` · trước: có ảnh mới của lượt này · thao tác: chọn selector duy nhất → grab từng khúc → `file.write` + `file.append` · thành công: **kích thước thật trên đĩa** khớp `bytes_total` · thất bại: selector không duy nhất · tệp đổi giữa chừng · đĩa nhận thiếu. Bằng chứng: hai ảnh 330.270 + 290.214 byte, `TRIALS` 14/09 |
| W4 | Đọc câu trả lời chữ của agent | O8 | **ĐẠT** 14/09 | `doc-tra-loi.mjs` · trước: một lượt đã chạy xong · thao tác: hỏi lại trang từng ứng viên selector → cái khớp đúng MỘT → `scout.text` · thành công: chữ khác rỗng, không bị cắt, **và khác câu đọc được trước lượt gửi** · thất bại: không ứng viên nào khớp đúng một (khớp 0 = agent chưa đáp; khớp nhiều = trang đổi hình dạng) · chữ rỗng · chữ cụt ở trần 5.000 · chữ y hệt lượt trước. Bằng chứng `G-76`: đọc đúng câu trả lời cho prompt vừa gửi, 251 ký tự |
| W5 | Chọn chế độ Agent / Manual Gen | ~~O3 I1~~ → **O4 O8 I1** | **ĐẠT** 16/09 | **Cột "Cần" khai SAI, gạch tại chỗ.** Hàng cũ chỉ tới `O3` (`scout.a11y`), mà `scout.a11y` **không có trên dây của gói Udin** (12 method) — một hàng chỉ tới lệnh gói không gọi được là hàng không ai chạy được. Đo lại: class **CÓ** phân biệt cái đang chọn (`create-mode-btn active`); phần đúng của lời khai 12/09 chỉ là class không nói được *cái nào là Agent* — tên lấy bằng `scout.text`. Và **lý do hoãn cũng sai**: `S-22` không bít nó, cú bấm tới trang **ba lần liên tiếp** hôm nay. · `chon-che-do.mjs` · trước: tab đã qua màn chờ · thao tác: đọc bảng nút (nhãn + nút nào `active`) → **xin đúng chế độ đang bật thì KHÔNG bấm** → bấm nút mang đúng nhãn, chờ chính nó có `.active` → đọc lại · thành công: **`active` chuyển từ nút cũ sang đúng nút xin**, đo thật Agent→Manual Gen→Agent · thất bại: nhãn lạ · không nút nào mang nhãn ấy · số nút ngoài 2…8 · **trước khi bấm mà không có đúng một nút `active`** · bấm xong `active` không sang · nhãn ở vị trí ấy đổi giữa chừng. **Chốt là VỊ TRÍ nút đang `active`, KHÔNG phải số nút mang `.active`**: con số ấy bằng 1 ở cả nhánh chạy đúng lẫn nhánh cú bấm không tới trang, nên nó không phân biệt được gì (`assertion-must-distinguish-branches`) |
| W6 | ~~Đưa một ảnh kết quả vào canvas~~ → **Thêm một KHUNG vào canvas** | I1 | **ĐẠT** 16/09 | **Lời khai 13/09 SAI, gạch tại chỗ.** Đo lại: ảnh kết quả **đã nằm trên canvas rồi** (một lưới bốn ô `.canvas-image-container.is-batch-grid`), và nút *Add to canvas* là nút **mở MENU** bốn mục `Frame` · `Image` · `Video` · `3D Model` — thêm một đối tượng MỚI, RỖNG. Không có nút riêng trên từng ảnh (đếm trọn 54 nút của trang). **Và lý do hoãn cũng sai**: `S-22` không bít nó — cú bấm tới trang **bốn lần liên tiếp** hôm nay. · `them-khung.mjs` · trước: tab đã qua màn chờ, KHÔNG cần lượt sinh ảnh nào · thao tác: đếm khung → mở menu → **hỏi lại trang từng mục để tìm đúng NHÃN** → bấm → đếm lại · thành công: số khung **tăng đúng 1** (đo thật 8 → 9) · thất bại: loại lạ · loại cần tệp · nút khớp ≠ 1 · không mục nào mang nhãn ấy · menu không hiện/không tắt · **menu tắt mà khung không tăng**. Ba mục `Image`/`Video`/`3D Model` **bị từ chối theo RỦI RO, không phải đã đo**: chúng gần như chắc chắn mở hộp thoại chọn tệp của hệ điều hành, thứ treo Chrome cho tới khi có người bấm tay — chúng thuộc `W8`/`T29` |
| W7 | Gửi prompt lần hai trên cùng ô | I4 | **ĐẠT** 14/09 | `gui-prompt.mjs` cờ `xoaOCu` · trước: ô prompt CÓ chữ sẵn (nút Send đã mở) · thao tác: `scout.clear` → **chờ nút Send khoá lại** → gõ prompt mới · thành công: chữ gõ ra không dính một mẩu nào của lượt trước · thất bại: không xin `xoaOCu` thì **vẫn từ chối như cũ** (lời từ chối là lớp bảo vệ, không phải thiếu sót); xoá xong mà Send vẫn mở thì ĐỎ và **không bấm lần nào**. Bằng chứng `G-77` |
| W8 | Tải ảnh tham chiếu lên | I9 | **HOÃN CÓ CHỦ Ý** 16/09 | ~~**CHẶN**~~ — chữ *“chặn”* sai: không có gì chặn nó, `T29` **làm được ngay** và phần khó nhất (`trongGoc` kiểm đường dẫn ở máy chủ) đã xây xong và đã ghim. Nó **chưa được mở**, và đó là một quyết định — `D4` chốt 16/09. Đếm bằng đúng thước đã đóng `T6`: **0 việc đang chạy cần đưa tệp vào trang**, và `W8` vốn xếp NGOÀI danh sách `W` bắt buộc từ 14/09. Cửa này là cửa **đầu tiên đi từ đĩa ra một trang web**, nên không mở vì *“sắp tới chắc sẽ cần”*. **Mốc mở:** ngày Đức cần đưa một **ảnh tham chiếu** vào Udin — lúc đó còn một dòng khai `DOM.setFileInputFiles` và một lượt chạy thật |
| **E2E** | Mở trang → W1 → W2 → W3 → W4 | | **ĐẠT** 14/09 · **ĐẠT LẠI TỪ GÓI RIÊNG** 15/09 | 14/09 (`T33`, còn là pilot): 4/4 ảnh, 9 đơn vị trần ghi, `G-76` `G-78`. **15/09 (`T21` chặng ④, từ extension `udin-optic`)**: 4/4 ảnh — 786.870 · 959.068 · 964.148 · 943.476 byte, mỗi ảnh 3 khúc, đầu tệp `RIFF…WEBP` hợp lệ; W4 đọc đúng câu trả lời cho prompt vừa gửi. **Và vế chứng minh: `git status workers/duc-scouter` SẠCH.** Cần hai lượt live để đóng — lượt đầu đẻ ra `G-94` (ảnh nằm trên S3 chứ không trên trang làm việc, nên `host_permissions` vừa thu hẹp làm `scout.grab` chết) |

### Cấp 3 — Udin đang ở đâu (tính từ bảng trên)

Chưa có danh sách bắt buộc Đức chốt, nên chỉ đếm được: **7 / 8 workflow ĐẠT · 1 CHẶN (`W8`) · E2E ĐẠT**.
**Còn đúng MỘT hàng chưa ĐẠT trong cả bảng, và nó là `W8`** — tức `T29` `scout.upload`, thứ cần
một method CDP mới nên phải hỏi Đức.

**Vòng tự cải tiến (`T7`) — KHÉP 14/09.** Đây là năng lực mà cả gói sinh ra để có, và nó không
nằm trong bảng `W` vì nó không phải một workflow của một trang: nó là *dò một trang chưa biết →
sinh adapter → chạy adapter*. Chạy thật trên Udin: báo cáo 288 KB ⟶ `pilots/t7-tu-sinh/` rút
selector từ báo cáo bằng ba luật không biết gì về Udin ⟶ **4 ảnh mới trong 39 giây**. Ba selector
nó tự rút ra trùng bản làm tay `udin-optic/`. `G-84` `G-85` `G-86` `G-87`.
Mức: **PARTIAL**. Chỉ được gọi **MASTERED** khi mọi workflow bắt buộc ĐẠT, không còn CHẶN, và E2E ĐẠT.

**Và đây là chỗ câu hỏi ⓪ của Đức đã tự trả gần hết.** Đề xuất bắt buộc là `W1 W2 W3 W4 W7` +
E2E — **cả sáu nay đều ĐẠT**. ~~Ba `W` còn lại đúng là ba cái đề xuất để NGOÀI: `W5` `W6` dính
`S-22`, `W8` cần `T29`.~~ **Sai hai phần ba, gạch tại chỗ 16/09:** `W5` và `W6` **không** dính
`S-22` — cả hai đã ĐẠT trên đúng ghế ấy, cú bấm tới trang mọi lượt. Còn lại đúng `W8`, cần `T29`. Nên ⓪ không còn định cỡ phần còn lại nữa; nó chỉ còn là một chữ ký xác
nhận rằng **điều kiện tách Udin đã đủ**, hoặc một câu nói Đức muốn thêm gì vào danh sách.

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

Viết lại 14/09 sau một ngày làm việc. **Danh sách này gần cạn** — và đó là tin quan trọng nhất
của bảng: thứ còn lại chặn việc tách Udin **không còn là năng lực của seed** mà là **workflow của
adapter**. Bốn dòng `W` từng `CHẶN` nay chỉ còn `W8` chặn thật.

| | Năng lực | Chặn workflow nào | Vì sao không hoãn được |
|---|---|---|---|
| ~~**O8**~~ | ~~đọc chữ trên trang~~ | — | **XONG 14/09** — `scout.text`, chạy thật trên Udin (`G-57`) |
| ~~**I4**~~ | ~~xoá chữ trong ô~~ | — | **XONG 14/09** — `scout.clear`. `W7` hết chặn |
| **I9** | tải file lên | `W8` ảnh tham chiếu | **DÒNG NĂNG LỰC CUỐI CÙNG còn chặn thật.** Udin là công cụ ảnh; không upload được thì một nửa công cụ nằm ngoài tầm. Làm ở `T29` |
| ~~**I5 I6 I7**~~ | ~~cuộn · rê chuột · bấm đúp/phải~~ | — | **XONG 14/09.** `I5` **ĐÃ CHỨNG MINH** (cuộn 1.972 điểm ảnh); `I6` `I7` dừng ở `CÓ` vì `S-22` — lệnh hoàn tất, trang không nhận (`G-74`) |
| **O12** | thu phóng trang | mọi trang **dạng artboard** (Vizcom, Figma-like) | **NỬA ⑴ XONG 14/09** — `scout.shot full_page + scale`. **Nửa ⑵ còn mở và nó là câu của Đức**: một lượt thu phóng THẬT (trang dựng lại, có thể vẽ thêm phần tử) đòi một `Emulation` override sống qua nhiều lượt gọi, mà `scouter-engine` tháo debugger sau mỗi lượt — xem `G-69`. Nếu câu trả lời là *không đổi kiến trúc* thì dòng này **đóng ở nửa ⑴** và ra khỏi danh sách |
| ~~**S-25**~~ | ~~tầng vận chuyển khai dối cỡ phong bì~~ | — | **XONG 14/09.** Gốc là **một dòng** (`G-67`): bộ giải khung ném ở mọi mảnh nối, mà Chrome cắt mảnh mọi tin vượt ~64 KiB. Một ca **chưa viết**, không phải một lớp bảo vệ — bản sửa thuần thêm vào. Và ba gói "đóng băng" **không dùng chung** file này: mỗi gói giữ một bản sao riêng, nên chúng KHÔNG bị chạm (và cũng vẫn mang con bệnh) |
| ~~chính sách che~~ | ~~`de-xuat-chat-v1`~~ | — | **ĐÃ KÝ 14/09** — [ADR-0006](adr/0006-chinh-sach-che-va-cua-hep-doc-chu.md), đường ⒝: ký nguyên bản + cửa hẹp `scout.text`. `O8` hết chặn |

**`I8` kéo thả nằm NGOÀI danh sách** — Udin không cần (nút *"Add to canvas"* là một cú bấm
thường, `W6`). Chỉ mở khi có trang timeline thật, và lúc đó chấp nhận mở lại Scouter một lần.

### 5.3 Các chặng — viết lại 14/09 (lượt hai, sau khi chặng ① và ② đóng)

**Hình dạng phần còn lại ĐÃ ĐỔI, và đây là chỗ đáng đọc kỹ nhất của cả tài liệu.** Tới sáng 14/09,
thứ chặn việc tách Udin là **năng lực của seed**: đọc chữ, xoá ô, lấy tệp, cuộn, thu phóng, và một
lỗi vận chuyển. Tới tối cùng ngày, gần như cả danh sách ấy đã đóng. Thứ còn chặn bây giờ là
**workflow của adapter** — `W4` `W5` `W6` `W7` đều *hết chặn mà chưa ai làm*.

Nghĩa là thước đo cũng đổi theo: từ đây, *"Scouter còn thiếu gì"* không còn là câu hỏi dẫn đường.
Câu dẫn đường là **"`W` nào bắt buộc phải ĐẠT trước khi tách"** — và bảng `W` ở §4 vẫn ghi *"Đức
chốt mục nào bắt buộc"*, tức là câu đó **chưa ai trả lời**. Nó quyết định phần còn lại dài bao
nhiêu, nên nó đứng trước mọi việc khác trong bảng dưới.

| Chặng | Việc | Xong khi | Chờ ai |
|---|---|---|---|
| ~~P0…P2a · ① · ②~~ | mô hình đo · `T13` · `S-22` · `O8` · `T24` `S-25` · `T31` · nhìn & đi lại · `T32` chạy thật | **XONG 12–14/09** | — |
| **⓪** | **Chốt `W` nào BẮT BUỘC** trước khi tách | có một danh sách `W` đóng, ghi vào §4 | **Đức** |
| ~~**②c**~~ | ~~`T33` chạy lại **E2E trọn vẹn**~~ | **XONG 14/09** — 4/4 ảnh, 9 đơn vị trần ghi | — |
| **②d** | ~~`T34` `W4`~~ **XONG** · ~~`T36` `W7`~~ **XONG** · ~~`T7` vòng tự cải tiến~~ **KHÉP 14/09** · `T35` `W6` thêm ảnh vào canvas | mỗi `W` có hợp đồng ⟨trước · thao tác · thành công · thất bại⟩ và một lượt chạy thật | không ai |
| **②e** | `T29` `scout.upload` (`I9`) → `W8` | một ảnh từ vùng ghi vào được trang; `..` bị từ chối ở **máy chủ** | không ai |
| **③** | **ĐÓNG BĂNG SEED** — `T8` đổi tên · `T9` gói `v1` | không method mới nào thêm sau mốc này mà không có ADR | ⓪ ②c ②d ②e |
| **④** | **`T21` tách Udin** thành gói riêng | các `W` bắt buộc ĐẠT **từ gói mới**, và **không một dòng Scouter nào phải sửa** | ③ |
| **⑤** | Trang thứ hai khác loại (artboard: Vizcom / node editor / timeline) | có `W` ĐẠT mà không sửa seed | ④ |

~~**Hai thứ `S-22` ĐANG che khuất, nói trước khi ai đó tưởng là lỗi mới.** `W5` và `W6` đều là *một
cú bấm*, và trên ghế này **không lượt bấm nào tới trang** (`G-74`). Nên hai `W` đó có thể viết
xong mà vẫn không ĐẠT được **trên ghế này**.~~ **LỜI CẢNH BÁO NÀY SAI, đo lại 16/09.** `W6` bấm
tới trang bốn lần liên tiếp, `W5` ba lần, trên đúng ghế ấy — cả hai ĐẠT. Thứ chặn hai hàng đó
chưa bao giờ là `S-22`: `W6` bị chặn bởi **một thao tác không tồn tại**, `W5` bởi **một cột
"Cần" khai sai**. Giữ đoạn này lại để nhớ một chuyện: **một lý do hoãn cũng là một lời khai, và
nó cũng phải đi đo lại** — không ai đi kiểm lại lý do hoãn, nên nó sống lâu hơn mọi lời khai khác.

**Vì sao `T33` đứng trước mọi việc mới:** nó không viết thêm dòng nào. Nó chỉ chạy lại thứ đã có
trên một nền đã đổi — trần khúc 512 KiB làm một ảnh tốn 2 đơn vị thay vì 14 — và nó trả lời một
câu mà không phép ghim nào trả lời được: *cả chuỗi Udin có đi trọn trong một lần mở khoá không*.
Rẻ nhất, và nó là điều kiện để tin phần còn lại.

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
