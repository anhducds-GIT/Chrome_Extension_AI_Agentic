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

**Chiều đi KHÔNG tự do — đây là chỗ dễ hỏng nhất của cả chuỗi.** Gói này có **bảy tệp chép bị ghim
so từng byte** (`AGENTS.md` ⑶), trong đó có **cái phanh**.

| việc đụng tới | làm ở đâu TRƯỚC | vì sao |
|---|---|---|
| `sidepanel.*` · `manifest.json` · `bridge-core.mjs` · `background.js` · `tu-dong/*` | **Udin** → mang về Scouter | không tệp nào bị ghim; đây đúng chỗ Đức nói UI sẽ đổi |
| 7 tệp chép (`probes` · `actions-core` · `seed-core` · `transport` · `engine` · `journal` · `file-core`) | **Scouter** → chép xuống Udin | sửa ở Udin trước là **làm gãy phép so byte trên đúng tệp chứa cái phanh** |

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

**U4 · Thư mục ra theo project/job.** Ba việc nhỏ, không việc nào cần method mới:
 · `e2e.mjs --du-an "<tên>"` → ảnh vào `<vùng-ghi>/<tên>/<lượt-chạy>/`. Không đưa `--du-an` thì
   giữ nguyên hình dạng hôm nay, để lượt chạy cũ không gãy.
 · sau lượt chạy, in **đường dẫn đầy đủ**, và `--mo` thì mở luôn thư mục bằng `explorer.exe`.
 · `START-BRIDGE_Udin-Optic.ps1` đọc **vùng ghi** từ một tệp cấu hình cạnh nó nếu có; không có thì
   dùng `anh-ra` như cũ. Đây là chỗ Đức đổi sang ổ `D:` bằng một dòng.
*Đóng khi:* một lượt E2E thật ghi vào **đúng** thư mục project vừa đặt, kiểm bằng **ĐĨA** · tên
project có ký tự lạ (`..`, `/`, dấu tiếng Việt) **bị từ chối chứ không bị lặng lẽ đổi** · suite gói
xanh.

**→ ĐIỂM DỪNG ①: Đức nạp lại extension một lần.** Gộp `U1 U2 U3 U4` vào đúng một lượt nạp. Sau đó
AI chạy một lượt E2E thật để nghiệm thu cả bốn.

**U5 · Mang về Scouter, rồi ĐÓNG `v1`.** Chỉ mang thứ **đã dùng thật** ở Udin. `U1` `U3` gần như
chép thẳng; `U2` phải xem lại vì Scouter mở `<all_urls>` còn Udin một trang; `U4` sang Scouter là
tuỳ — Scouter không sinh ảnh.
*Đóng khi:* suite hai bên xanh · `npm run scouter:mutation` **0 sống sót** · cổng XANH TOÀN BỘ.

**→ ĐIỂM DỪNG ②: Đức ký `Scouter v1`.** Đây là tuyên bố phiên bản, và nó là chữ ký của Đức chứ
không phải một lượt chạy xanh.

## Thứ KHÔNG làm trong chuỗi này

**Đừng chép cả 650 dòng bảng bên của `duc-auto-*` sang.** Phần lớn là hàng đợi job và checkpoint —
Udin không có hai thứ đó. Chép về là mang theo mã chết, đúng bệnh mà `bridge-core` vừa cắt 12 lệnh
để tránh.

**`T29` (`scout.upload` → `W8`) là việc của Scouter**, không phải của chuỗi này: nó cần một method
Bridge mới. Nó đứng SAU `U5`, hoặc chạy ở một phiên khác.

**Đừng mở lại `showDirectoryPicker`.** Lý do đã ghi ở ⓪b.
