# CHUỖI VIỆC — Udin Optic

> **File này sinh ra để sống sót qua một lượt compact.** Nó KHÔNG kể chuyện đã qua (`HANDOFF.md`),
> KHÔNG chép luật (`AGENTS.md`). Nó trả lời đúng một câu: **việc kế tiếp là gì, và làm xong thì
> biết bằng cách nào.**

## ⓪ Đức đảo thứ tự 15/09 — **tôi đồng ý**, và đây là đường ranh làm nó an toàn

> *"Tôi thấy B làm xong, rồi apply vào Scout & đóng nó lại thì hay hơn chứ nhỉ?"*

**Đúng, và nó đúng vì một lý do đã thành luật ở repo này**: [ADR-0007](../../duc-scouter/v0.1.0/docs/adr/0007-scouter.md)
— *mỗi nấc mở bằng một VIỆC THẬT chứ không bằng một danh sách*. Udin có việc thật; Scouter là bộ
đồ nghề. Làm ở Udin trước thì Scouter **chỉ nhận thứ đã sống sót qua một lượt dùng thật**, thay vì
nhận một danh sách tính năng nghe hợp lý.

**Nhưng chiều đi không tự do, và đây là chỗ dễ hỏng nhất của cả kế hoạch.** Gói này có **bảy tệp
chép bị ghim so từng byte** (`AGENTS.md` ⑶) — chúng là bộ máy gắn debugger, tổng hợp phím chuột,
và **cái phanh**. Nên:

| tính năng đụng tới | làm ở đâu TRƯỚC | vì sao |
|---|---|---|
| `sidepanel.*` · `manifest.json` · `bridge-core.mjs` · `background.js` — **4 tệp CỐ Ý KHÁC** | **Udin**, rồi mang về Scouter | không tệp nào bị ghim; đây đúng là chỗ Đức nói UI sẽ đổi |
| 7 tệp chép (`probes` · `actions-core` · `seed-core` · `transport` · `engine` · `journal` · `file-core`) | **Scouter**, rồi chép xuống Udin | sửa ở Udin trước là **làm gãy phép so byte trên đúng tệp chứa cái phanh** |

**Phép thử một câu, dùng trước mỗi việc:** *tính năng này có cần một method Bridge MỚI không?*
· **Không** → làm ở Udin. · **Có** → nó là việc của seed, làm ở Scouter, và **thêm method là đổi
luật an toàn → hỏi Đức** (luật gói số 4).

## Đo trước khi bàn — "giống như Extension khác" nghĩa là gì

| gói | `sidepanel.html` |
|---|---:|
| `duc-auto-chatgpt` · `duc-auto-gemini` · `duc-auto-gg-flow-video` | **676 · 649 · 646 dòng** |
| `duc-scouter` · `udin-optic` | **188 dòng** |
| `hnx-fetch` | 65 dòng |

Ba gói `duc-auto-*` có sẵn: thu phóng 80–120%, `Choose Folder` + bộ chọn thư mục thật, nối/ngắt
ghép cặp, mẫu tên tệp, quản lý hàng đợi. Udin hiện có: cửa Bridge · hồ sơ ghế · năng lực · sổ hoạt
động · tiến độ · danh sách tab. **Thiếu đúng những thứ Đức nêu.**

## Bốn tính năng Đức nêu — phân loại, và một ngã ba phải chốt

| | tính năng | nằm ở tệp nào | method Bridge mới? | mang về Scouter? |
|---|---|---|---|---|
| **U1** | **Zoom UI** (chữ bảng bên to/nhỏ) | `sidepanel.css` + `.js` | **không** | có |
| **U2** | **Zoom web** (thu phóng trang) | `sidepanel.js` → `chrome.tabs.setZoom` | **không** — Chrome API gọi thẳng từ bảng bên | có |
| **U3** | **Check kết nối** | `sidepanel.js` | **không** — gọi lại đường đã có | có |
| **U4** | **Chọn thư mục ra** | **NGÃ BA ↓** | tuỳ đường | tuỳ đường |

**U2 có một thứ phải ĐO TRƯỚC KHI VIẾT:** `chrome.tabs.setZoom` cần quyền `tabs`, **hoặc** host
permission của chính tab đó là đủ. Udin có `vinfast.udinbv.com` nhưng **không** có `tabs`
(`duc-auto-gemini` có). Đo bằng một lượt gọi thật; nếu thiếu thì thêm `tabs` vào manifest là **nới
quyền** → nói ra, đừng thêm lặng lẽ.

### Ngã ba `U4` — chỗ duy nhất tôi không tự quyết được

Ảnh Udin đi xuống đĩa qua **máy chủ Bridge** (`file.write`), và máy chủ khoá cứng một **vùng ghi**
— nó còn **từ chối khởi động** nếu vùng ghi chứa tệp ghép cặp. Ba gói `duc-auto-*` thì đi đường
khác hẳn: `window.showDirectoryPicker()`, trình duyệt ghi thẳng, **không qua máy chủ**.

| | đường | được | mất |
|---|---|---|---|
| **⒜** | Ô nhập **thư mục con** dưới vùng ghi | rẻ nhất, giữ NGUYÊN mọi chốt an toàn của máy chủ | không chọn được ổ đĩa khác |
| **⒝** | `showDirectoryPicker` như `duc-auto-*` | Đức chọn bất kỳ thư mục nào, giống hệt ba gói kia | **bỏ qua hẳn máy chủ Bridge** — mất chốt vùng-ghi, và ảnh không còn đi qua đường đã được ghim |
| **⒞** | Nút mở thư mục + đổi `--root` lúc bật máy chủ | đã chạy được rồi, chỉ thiếu UI | phải tắt/bật lại máy chủ |

**Tôi khuyên ⒜ + ⒞**, và không phải vì lười: đường ⒝ vứt bỏ đúng lớp bảo vệ mà `T21` vừa chứng
minh là chạy được. Nhưng nếu Đức muốn cảm giác *"bấm một nút, hiện hộp thoại Windows"* thì đó là
⒝ và tôi làm — **nói một câu là chốt**.

## Các chặng, mỗi chặng DỪNG ĐƯỢC và KIỂM ĐƯỢC

**U0 · Đo `chrome.tabs.setZoom` trên ghế thật.** Một lượt gọi. *Đóng khi:* biết chắc cần hay
không cần thêm quyền `tabs`. *Vì sao đứng đầu:* nó quyết định `U2` có phải đụng manifest không, và
đụng manifest là nới quyền.

**U1 · Zoom UI.** Một biến CSS trên `:root` + một khoá `chrome.storage.local` + hàng nút 80…120%.
*Đóng khi:* đổi cỡ ăn ngay, sống qua một lượt đóng/mở bảng bên, và có phép ghim đọc DOM canh hàng
nút tồn tại (mẫu: `sidepanel-dom-smoke.mjs` bên Scouter).

**U2 · Zoom web.** Theo kết quả `U0`. *Đóng khi:* bấm 120% thì `scout.view` **đọc ra** thu phóng
đã đổi — kiểm bằng trang, không bằng lời báo của nút (cùng kỷ luật `G-73`).

**U3 · Check kết nối.** Một nút chạy đúng sáu bước của `kiem-cai-dat.mjs` **nhưng từ trong bảng
bên**. *Đóng khi:* rút máy chủ ra thì nó nói đúng *"Bridge chưa chạy"*, không nói *"lỗi"*.
*Cái bẫy đã biết:* bước ① phải hỏi `bridge.sessions`, KHÔNG hỏi `system.ping` — `G-91`.

**U4 · Chọn thư mục ra.** Chờ Đức chốt ngã ba. *Đóng khi:* một lượt E2E ghi vào đúng thư mục vừa
chọn, kiểm bằng ĐĨA.

**U5 · Mang về Scouter, rồi ĐÓNG `v1`.** Chỉ mang **thứ đã dùng thật ở Udin**. `U1` `U3` gần như
chép thẳng; `U2` phải xem lại vì Scouter mở `<all_urls>` còn Udin một trang. *Đóng khi:* suite hai
bên xanh · bộ đột biến Scouter 0 sống sót · cổng XANH TOÀN BỘ · rồi Đức ký `Scouter v1`.

## Thứ KHÔNG làm trong chuỗi này

**Đừng chép cả 650 dòng bảng bên của `duc-auto-*` sang.** Phần lớn là hàng đợi job và checkpoint —
Udin không có hai thứ đó. Chép về là mang theo mã chết, đúng bệnh mà `bridge-core` vừa cắt bỏ 12
lệnh để tránh.

**`T29` (`scout.upload` → `W8`) vẫn là việc của Scouter**, không phải của chuỗi này: nó cần một
method Bridge mới. Nó đứng SAU `U5`, hoặc chạy song song ở một phiên khác.
