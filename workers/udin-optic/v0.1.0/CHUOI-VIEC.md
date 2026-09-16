# CHUỖI VIỆC — Udin Optic

> **File này sinh ra để sống sót qua một lượt compact.** Nó KHÔNG kể chuyện đã qua (`HANDOFF.md`),
> KHÔNG chép luật (`AGENTS.md`). Nó trả lời đúng một câu: **việc kế tiếp là gì, và làm xong thì
> biết bằng cách nào.**
>
> **Chuỗi này chốt 15/09 để CHẠY MỘT MẠCH.** Mọi chỗ lẽ ra phải dừng hỏi Đức đều đã được quyết
> trước và ghi lý do ngay tại chỗ. Còn đúng **hai** điểm dừng, và cả hai đều nằm ở cuối.

## ⓪ Đức đảo thứ tự 15/09 — làm ở Udin trước, rồi mang về Scouter

> *"Tôi thấy B làm xong, rồi apply vào Scout & đóng nó lại thì hay hơn chứ nhỉ?"*

**Đúng**, và đúng vì một luật đã có: [ADR-0007](../../duc-scouter/v0.1.0/docs/adr/0007-scouter.md)
— *mỗi nấc mở bằng một VIỆC THẬT chứ không bằng một danh sách*. Udin có việc thật; Scouter là bộ
đồ nghề. Làm ở Udin trước thì Scouter **chỉ nhận thứ đã sống sót qua một lượt dùng thật**.

**Chiều đi KHÔNG tự do — đây là chỗ dễ hỏng nhất của cả chuỗi.** Gói này có **chín tệp chép bị ghim
so từng byte** (`AGENTS.md` ⑶), trong đó có **cái phanh**.

| việc đụng tới | làm ở đâu TRƯỚC | vì sao |
|---|---|---|
| `sidepanel.*` · `manifest.json` · `bridge-core.mjs` · `background.js` · `tu-dong/*` | **Udin** → mang về Scouter | không tệp nào bị ghim; đây đúng chỗ Đức nói UI sẽ đổi |
| 9 tệp chép (`probes` · `actions-core` · `seed-core` · `transport` · `engine` · `journal` · `file-core` · **`zoom-core`** · **`kiem-nhanh`**) | **Scouter** → chép xuống Udin | sửa ở Udin trước là **làm gãy phép so byte trên đúng tệp chứa cái phanh** |

**Phép thử một câu, chạy trước MỖI việc:** *cái này có cần một method Bridge MỚI không?*
· **Không** → làm ở Udin, chạy tiếp, đừng hỏi. · **Có** → dừng, vì thêm method là đổi luật an toàn
(luật gói ⑴ ⑷) → hỏi Đức.

## ⓪b Đức chốt `U4` 15/09 — và câu trả lời làm đường ⒝ **chết**

> *"Tôi phải chọn folder, hoặc AI local tạo thư mục và chọn cho tôi. Vì các project, job khác nhau
> sẽ có kết xuất khác nhau."*

Nhu cầu thật là **tách kết xuất theo project/job**, KHÔNG phải *"ghi vào ổ đĩa bất kỳ"*. Hai thứ
đó khác nhau, và chỉ thứ hai mới đòi bỏ máy chủ Bridge.

**Nên chốt: hai tầng, và mỗi tầng đổi theo một nhịp khác nhau.**

| tầng | là gì | ai đặt | đổi mấy lần |
|---|---|---|---|
| **vùng ghi** (`--root`) | ổ đĩa + thư mục gốc | Đức, **một lần cho cả máy** | gần như không bao giờ |
| **thư mục con** | `<du-an>/<lượt-chạy>` | **AI đặt theo từng job** | mỗi lượt |

Cả hai **vẫn nằm sau máy chủ Bridge**, nên giữ nguyên chốt *"vùng ghi không được chứa tệp ghép
cặp"* và trần tệp — đúng lớp bảo vệ mà `T21` vừa chứng minh là chạy được. Muốn đổi sang ổ `D:` thì
sửa **một dòng** trong tệp cấu hình cạnh bộ khởi động, không đụng một dòng mã nào.

**Đường `showDirectoryPicker` của ba gói `duc-auto-*` CHẾT ở đây**, và ghi lại lý do để đừng ai mở
lại: nó bắt trình duyệt ghi thẳng, tức **vứt bỏ cả đường ghi đã có phép ghim** (`scout.grab` +
`file.write`) để đổi lấy một hộp thoại — trong khi nhu cầu thật đã được đáp bằng hai tầng trên.

## ⓪c Ba quyết định đã LẤY TRƯỚC, để chuỗi không phải dừng

**⑴ ĐÃ ĐO 16/09 — KHÔNG cần `tabs`, mục này khép lại.** `npm run udin:zoom-probe` nạp chính gói này (manifest nguyên vẹn) vào Chrome sạch: `setZoom`/`getZoom` **chạy đúng** mà không cần quyền `tabs`. Nên `U2` **không đụng `manifest.json`** và không đụng hợp đồng `deepEqual` khối ②.
*Nhưng phép đo đổi một thứ khác, và `U2` phải viết theo:* `setZoom` **không** bị `host_permissions` chặn — nó phóng to được cả tab lạ. Thứ chặn là **`tab.url` bị giấu** ở tab ngoài quyền. Lớp an toàn nằm trên đường **ĐỌC**: không đọc được `url` thì **khóa nút**, tuyệt đối không được "đoán" là tab Udin rồi zoom đại. Chi tiết: `G-95`.

**⑵ `U2` KHÔNG được thêm `scout.view` để tự kiểm.** Đo 15/09: `scout.view` **không nằm trong 12
method** của gói này. Thêm nó lại là thêm một method → phải hỏi Đức → chuỗi dừng. Nên `U2` kiểm
bằng `chrome.tabs.getZoom` (sai số `ZOOM_EPSILON = 0.015`, **không** phải 0,01 — đếm lại trong mã ba gói `duc-auto-*` 16/09; đo thực thì Chrome trả về **đúng y** 1.2 và 0.8, không trôi), và **nói thẳng giới hạn**: nó chứng minh *Chrome đã nhận lệnh thu
phóng*, KHÔNG chứng minh *trang đã vẽ lại*. Với một tiện ích giao diện thì thế là đủ; muốn mạnh
hơn thì đó là một việc riêng, bàn cùng lúc với `v1`.

**⑶ Nạp lại extension gộp thành ĐÚNG MỘT lần**, sau `U4`. Luật chuỗi của Scouter số 5: nạp lại là
việc Đức nhìn thấy — báo trước, gộp một lần ở cuối, đừng rải.

## Đo trước khi bàn — "giống như Extension khác" nghĩa là gì

| bảng bên của | dài |
|---|---:|
| `duc-auto-chatgpt` · `duc-auto-gemini` · `duc-auto-gg-flow-video` | **676 · 649 · 646 dòng** |
| **`duc-scouter` · `udin-optic`** | **188 dòng** |

Ba gói kia có sẵn: thu phóng 80–120%, `Choose Folder`, nối/ngắt ghép cặp, mẫu tên tệp, hàng đợi.
Udin đang có: cửa Bridge · hồ sơ ghế · năng lực · sổ hoạt động · tiến độ · danh sách tab.

## Sáu chặng, chạy liền — mỗi chặng DỪNG ĐƯỢC và KIỂM ĐƯỢC

**U0 · ĐO `chrome.tabs.setZoom` — ✅ XONG 16/09, kết quả: KHÔNG cần `tabs` (`G-95`).**
~~Một lượt gọi, không viết mã~~ — đo bằng Chrome sạch chứ không bằng ghế Đức, vì **không có đường chạy mã trong extension đang nạp mà không bắt Đức nạp lại** — tức đúng thứ `U0` sinh ra để tránh. Để lại `scripts/do-quyen-zoom.mjs` để đo lại khi Chrome đổi phiên bản.
*Đóng khi:* biết chắc có cần `tabs` không. *Vì sao đứng đầu:* nó quyết định `U2` có phải đụng
manifest không, và đụng manifest là đụng hợp đồng quyền.

**U1 · Zoom UI — ✅ XONG 16/09.** — chữ bảng bên to/nhỏ. Một biến CSS trên `:root` + một khoá `chrome.storage.local`
+ hàng nút 80…120%, mẫu: `duc-auto-gemini/v0.2.0/sidepanel.js` khoá `dac_ui_zoom`.
*Đóng khi:* phép ghim DOM canh hàng nút tồn tại và khoá lưu đúng tên (mẫu `sidepanel-dom-smoke.mjs`
bên Scouter) · cỡ chữ sống qua một lượt đóng/mở bảng bên.

**U2 · Zoom web — ✅ XONG 16/09, không đụng manifest.** — thu phóng trang Udin. `chrome.tabs.setZoom` gọi thẳng từ bảng bên, **không qua
Bridge**, nên không có method mới.
*Đóng khi:* đặt 120% rồi `chrome.tabs.getZoom` đọc lại đúng 1.2 (sai số 0,01, mẫu `ZOOM_EPSILON`
bên Gemini) · nút bị **khoá lại kèm lý do** khi không có tab Udin nào — *"nút zoom hỏng" không
chẩn đoán được từ xa nếu nó chỉ im lặng*.

**U3 · Check kết nối — ✅ XONG 16/09, nhưng KHÁC bản đã viết ở đây.**
Chặng này viết là *"chạy đúng sáu bước của `kiem-cai-dat.mjs`, bước ① hỏi `bridge.sessions`"*. **Đo 16/09: không làm được** — extension chỉ TRẢ LỜI, nó không phát đi được một yêu cầu nào ra dây (`G-96`). Nên bộ kiểm hỏi cùng những câu ấy **từ phía bên kia**, năm bước, trong `scripts/kiem-nhanh.mjs`. Tiêu chí đóng giữ nguyên và đã đạt: tắt máy chủ rồi bấm thì nó nói *"chưa nối được máy chủ Bridge"* kèm đúng tệp cần chạy, **khác hẳn** câu *"chưa chọn tệp ghép cặp"*.

**U4 · Thư mục ra theo project/job — ✅ MÃ XONG 16/09, chờ một lượt E2E thật để nghiệm thu.**
 · `e2e.mjs --du-an "<tên>"` → ảnh vào `<vùng-ghi>/udin-optic/<tên>/<lượt-chạy>/`.
   Không đưa `--du-an` thì giữ nguyên hình dạng cũ, nên lượt chạy cũ không gãy.
 · cuối lượt in **đường dẫn đầy đủ**; `--mo` mở luôn thư mục bằng `explorer.exe`.
 · **Vùng ghi: MỘT luật, ở `bridge/vung-ghi.mjs`** — thứ tự `--root` › `vung-ghi.txt`
   cạnh tệp ghép cặp › `anh-ra`. Đức đổi sang ổ `D:` bằng đúng một dòng trong
   `vung-ghi.txt`, tệp đó nằm **ngoài repo** nên git không đụng tới.

> **SỮA MỘT LửI KHAI SAI CỦA CHÍNH TÔI (16/09).** Tôi báo với Đức rằng
> `START-BRIDGE_Udin-Optic.ps1` *không tồn tại*. **Nó có** — nó nằm **ngoài repo**, tại
> `C:\WORKING ZONE\Chrome Extension Bridge\udin-optic\`, và nó chính là thứ Đức bấm. Lệnh tìm
> của tôi chỉ quét trong repo nên không thấy, và tôi đã kết luận từ một lượt tìm hẹp hơn câu hỏi.
> Hậu quả thật: bản `U4` đầu tiên vá vào **nhầm tệp** — vào bộ kéo-thả trong repo, không
> vào bộ Đức dùng. **Bài học đặt thẳng vào đây:** hạ tầng của một gói **không nằm trọn trong
> repo** — tệp ghép cặp, bộ khởi động và vùng ghi đều ở ngoài, **cố ý**. Trước khi khai một
> tệp là *không tồn tại*, phải tìm cả **nhà chung của Bridge**, không chỉ tìm trong kho mã.
>
> Và sửa đúng gốc chứ không chỉ vá thêm một bản nữa: luật về hẳn `bridge/vung-ghi.mjs`
> trong repo, **hai** bộ khởi động chỉ còn gọi vào. Một bản của luật nằm ngoài repo là một bản
> git không thấy và không phép ghim nào canh được.

*Đã đạt:* tên project chứa `..`, `/`, `\`, dấu tiếng Việt, dấu cách, tên cấm của
Windows (`CON`, `NUL`, `COM1`…), dấu chấm cuối, khoảng trắng đầu/cuối, quá dài — **bị từ chối
kèm lý do RIÊNG, và đỏ khi CHƯA gọi một lệnh nào** (chưa tốn credit) · máy chủ **khởi động thật**
bốn kiểu cấu hình, mỗi kiểu ra đúng một dòng đọc được, không ra stack trace.
*✅ **NGHIỆM THU ĐẠT 16/09, kiểm bằng ĐĨA**:* một lượt E2E thật với `--du-an "xe-dien-2026"` →
4 tệp `.jpg` mở đầu `FF D8 FF` (JPEG thật), kích thước khớp từng byte với báo cáo · 4 bản
`.webp` gốc vẫn nguyên · **lượt chạy cũ 15/09 vẫn ở hình dạng cũ** `udin-optic/<lượt>/`, không gãy ·
ba tên project xấu (dấu tiếng Việt · `../` · `CON`) **đỏ trước khi chạm dây**, prompt chưa hề được gửi.
*Chưa đo được:* cờ `--mo` (một dòng `spawn("explorer.exe")`). **Giá nếu nó hỏng:** đường dẫn
vẫn được in ra đầy đủ, Đức chép dán thay vì có cửa sổ tự mở — không mất gì.

**→ ĐIỂM DỪNG ① — ✅ QUA 16/09.** Đức nạp lại, AI đo ghế: **12 lệnh · 5 lệnh ghi · seed
`udin-optic-v0.1`** — đúng bản mới đã nạp. Lượt E2E thật chạy trọn W1→W2→W3→JPG→W4.

**U5 · Mang về Scouter — ✅ MÃ XONG 16/09.**
Mang `U1` (cỡ chữ) · `U2` (thu phóng trang) · `U3` (nút *Kiểm tra kết nối*). `U4` **không mang**: Scouter không sinh ảnh, nên nó không có kết xuất để chia theo project.

Hai lõi — `scripts/zoom-core.mjs` và `scripts/kiem-nhanh.mjs` — được làm **trung tính với gói**
(không tên gói, không tên miền, không số lệnh, không câu chỉ dẫn riêng — tất cả vào bằng **tham số**),
rồi chép nguyên văn và **vào bảng so từng byte**. Từ nay **bản gốc là bản bên Scouter**, dù chúng
sinh ra ở đây — Scouter là bộ đồ nghề chung, mọi bản chép phải chỉ về cùng một chỗ.

> **MỘT KHÁC BIỆT THẬT, ĐỪNG “SỬA” NÓ CHO GIỐNG NHAU.** Udin truyền tên miền vào `xetTabDangXem`;
> Scouter truyền `null`. Lý do nằm ở `G-95`: lớp an toàn của Udin là việc Chrome **giấu** `tab.url`
> của tab ngoài quyền. Scouter mở `<all_urls>` nên nó đọc được url của **mọi** tab — cái khoá ấy
> **không tồn tại ở bên đó**. Thứ còn lại cho Scouter: chỉ thu phóng trang `http(s)`, và chỉ tab
> ĐANG XEM trong chính cửa sổ đó. **Đừng nới thêm**, và đừng chép câu chặn của Udin sang đó rồi
> tưởng mình đã có cùng một lớp bảo vệ.

*Đã đạt:* suite hai bên xanh (Udin 12 · Scouter 33) · `npm run scouter:mutation` **14/14 giết được,
0 sống sót** · phép so từng byte phủ cả hai lõi mới (đo bằng một đột biến thử: ĐỎ).
*Còn chờ:* cổng XANH TOÀN BỘ, rồi đến chữ ký của Đức.

**→ ĐIỂM DỪNG ②: Đức ký `Scouter v1`.** Đây là tuyên bố phiên bản, và nó là chữ ký của Đức chứ
không phải một lượt chạy xanh.

## Thứ KHÔNG làm trong chuỗi này

**Đừng chép cả 650 dòng bảng bên của `duc-auto-*` sang.** Phần lớn là hàng đợi job và checkpoint —
Udin không có hai thứ đó. Chép về là mang theo mã chết, đúng bệnh mà `bridge-core` vừa cắt 12 lệnh
để tránh.

**`T29` (`scout.upload` → `W8`) là việc của Scouter**, không phải của chuỗi này: nó cần một method
Bridge mới. Nó đứng SAU `U5`, hoặc chạy ở một phiên khác.

**Đừng mở lại `showDirectoryPicker`.** Lý do đã ghi ở ⓪b.
