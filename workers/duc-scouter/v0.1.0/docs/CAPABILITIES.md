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
| O8 | **Đọc chữ trên trang** (câu trả lời, thông báo lỗi) | — | **CHƯA CÓ** | Chính sách che dữ liệu `de-xuat-chat-v1` cấm trả chữ, và **Đức chưa chốt** chính sách đó. Chặn mọi workflow cần đọc kết quả bằng chữ | ✋ |
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
| D3 | Lấy file / ảnh về đĩa | `scout.fetch` + `file.write` | **ĐÃ CHỨNG MINH** với `hnx.vn` | Ảnh Udin: **CHƯA ĐO** (việc kế) | |
| D4 | So trước / sau một thao tác | — (adapter tự làm) | **CHƯA CÓ ở seed** | `gui-prompt.mjs` so tập `src` ảnh. Lặp ở trang thứ hai thì đưa lên seed (luật gói 2) | ✋ |
| D5 | Lỗi console / lỗi JS của trang | — | **CHƯA CÓ** | cần `Log.enable`; `Runtime.*` bị cấm | ✋ |

### E · An toàn và vận hành

| Mã | Năng lực | Lệnh / chỗ | Trạng thái | Bằng chứng / ghi chú | Duyệt |
|---|---|---|---|---|---|
| R1 | Công tắc đường ghi, mặc định ĐÓNG | bảng bên | **ĐÃ CHỨNG MINH** | phanh chặn thật 08/09 giữa lượt tải | |
| R2 | Dừng khẩn | Ctrl+Shift+X | **CÓ** | chưa có lượt thật ghi lại | |
| R3 | Trần 200 lượt mỗi lần mở | lõi ghi | **CÓ** | ghim `P1..P12` | |
| R4 | Mã lỗi nói thật (không báo ĐẠT giả) | hai lõi | **ĐÃ CHỨNG MINH một phần** | `CLICK_HIT_TEST_FAILED` bắt được `S-23`. `S-22` vẫn báo ok giả | |
| R5 | Nhật ký lượt chạy + ghi đĩa | `scouter-journal-core` + `file.*` | **ĐÃ CHỨNG MINH** | T7 12/09 | |
| R6 | Tự nạp lại code mới | `scout.reload` | **ĐÃ CHỨNG MINH** | mọi phiên | |
| R7 | Thử lại / chạy tiếp khi đứt | — | **CHƯA CÓ** | nhóm B của danh sách 25 mục | |

### Đếm cấp 1 (đếm lại tay khi sửa bảng)

**ĐÃ CHỨNG MINH 19 · MỘT PHẦN 2 · CÓ 4 · CHƯA CÓ / CHƯA ĐO 14 · ĐÃ BỎ 1.** Tổng 40 dòng.
**Seed Coverage = 19 / 39** (không tính dòng ĐÃ BỎ; MỘT PHẦN không tính là đạt).

## 3. Checklist bổ sung cho Seed — theo thứ tự việc thật cần

Mỗi mục đi đủ 4 bước: ☐ ghi `CHƯA` trong `GIA-THUYET.md` → ☐ mã + phép ghim + đột biến → ☐ đạt trên
Chrome riêng (probe) → ☐ đạt trên trang thật. Bước 4 xong thì sửa ô ở §2 thành `ĐÃ CHỨNG MINH`.

| Ưu tiên | Mã | Vì sao trước | Duyệt |
|---|---|---|---|
| 1 | `S-22` | Lệnh bấm báo ok mà trang không phản ứng. Mọi năng lực tay người đứng trên nó | |
| 2 | D3 với ảnh Udin | Workflow W3; không cần lệnh mới | |
| 3 | O8 đọc chữ | Không đọc được kết quả bằng chữ thì không kiểm được phần lớn workflow | ✋ chốt chính sách che |
| 4 | I4 xoá ô nhập | Gửi prompt lần hai trên cùng ô | ✋ |
| 5 | I6 hover · I5 cuộn · I7 bấm đúp/phải | Menu ẩn, danh sách dài, trình soạn thảo | ✋ |
| 6 | I8 kéo thả · I9 upload | Canvas, timeline, ảnh tham chiếu | ✋ |
| 7 | D5 lỗi console · N5 back/forward · O9 iframe | Làm khi có trang cần | ✋ |
| 8 | D4 so trước/sau lên seed | Chỉ khi trang thứ hai lặp lại đúng mẫu đó | ✋ |

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
| W3 | Lấy ảnh kết quả về đĩa | D3 | **CHƯA** | `lay-anh.mjs` 14/09: mã + 15 khối ghim + 14 đột biến tay chết + audit độc lập 3 vòng (vòng 3 CONDITIONAL PASS). **Chưa chạy thật lần nào** — cần Bridge bật và ghế Udin mở. Ba câu chưa biết ở `GIA-THUYET` G-31 G-32 G-33 |
| W4 | Đọc câu trả lời chữ của agent | O8 | **CHẶN** | chờ Đức chốt chính sách che |
| W5 | Chọn chế độ Agent / Manual Gen | O3 I1 | **CHƯA** | |
| W6 | Đưa một ảnh kết quả vào canvas | I1 | **CHƯA** | nút "Add to canvas" có trong DOM 13/09 |
| W7 | Gửi prompt lần hai trên cùng ô | I4 | **CHẶN** | |
| W8 | Tải ảnh tham chiếu lên | I9 | **CHẶN** | |
| **E2E** | Mở trang → W1 → W2 → W3 | | **CHƯA** | `e2e.mjs` 14/09: mã + 5 khối ghim. Chưa chạy thật (`G-34`). Prompt là tham số **bắt buộc**: mỗi lượt tiêu credit một chữ mới |

### Cấp 3 — Udin đang ở đâu (tính từ bảng trên)

Chưa có danh sách bắt buộc Đức chốt, nên chỉ đếm được: **2 / 8 workflow ĐẠT · 3 CHẶN · E2E chưa chạy**.
Mức: **PARTIAL**. Chỉ được gọi **MASTERED** khi mọi workflow bắt buộc ĐẠT, không còn CHẶN, và E2E ĐẠT.

## 5. Lộ trình triển khai

| Chặng | Việc | Xong khi |
|---|---|---|
| **P0** · 13/09 | Chốt mô hình, viết file này | Đức duyệt bảng §2 và danh sách W của Udin |
| **P1** | Đóng `S-22` · W3 lấy ảnh Udin về đĩa · E2E Udin lần đầu | E2E Udin ĐẠT trên ghế thật |
| **P2** | Đức chốt các mục ✋ ưu tiên 3–5 → làm theo checklist §3 | O8 I4 I5 I6 I7 ĐÃ CHỨNG MINH |
| **P3** | Tách Udin thành **gói adapter riêng**, điều khiển seed qua Bridge. **Không chép seed** (ADR-0006) | các W bắt buộc ĐẠT từ gói mới |
| **P4** | Trang thứ hai **khác loại** (node editor / timeline / CRUD) | có W ĐẠT mà **không sửa seed riêng cho trang đó** |
| **P5** | Lúc này mới xét: đóng Udin thành extension riêng · máy đếm mastery tự động · I8 I9 | Đức chọn |

**Nhiều URL:** chỉ làm **lần lượt, một tab một lúc** (N7). Chạy đồng thời phải có ADR mới.
