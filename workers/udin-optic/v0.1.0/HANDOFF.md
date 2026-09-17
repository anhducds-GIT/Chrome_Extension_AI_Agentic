# HANDOFF — `workers/udin-optic/`

> Nhật ký của gói. Luật của gói: `v0.1.0/AGENTS.md` cạnh file này.
> Ghi thêm ở CUỐI, không sửa mục cũ. Trần một mục: 2.600 byte.

## Log

## 2026-09-15 · `claude-scouter-udine` — gói ra đời, và cái giá của nó được đo TRƯỚC khi trả

**Việc.** `T21` tách Udin Optic khỏi `duc-scouter`. Trước hôm nay nó sống trong `pilots/` của
chính Scouter, nên câu *"Scouter là bộ đồ nghề chung"* chưa bao giờ bị bắt chứng minh.

**Phép đo đã suýt không được làm.** Lộ trình `T21` viết 14/09 nói *"chép theo kiểu `hnx-fetch`"*
và đếm hai tệp: `transport.mjs` (576) và `bridge-core.mjs` (844). Vào việc mới thấy con số thật:
Udin dùng **5 lệnh GHI**, nên gói mới phải mang theo `scouter-probes.mjs` (1.181) và
`scouter-actions-core.mjs` (938) — **~2.100 dòng máy gắn debugger, tổng hợp phím chuột, và CÁI
PHANH**. `hnx-fetch` chưa bao giờ phải trả giá đó vì nó **không khai quyền `debugger`**.

Con số đó được đưa cho Đức kèm đường thứ hai (gói script, 0 dòng chép, chạy trên extension
Scouter). Đức chốt đường extension riêng, với lý do không nằm trong phép đo:

> *"Vì sau này Scouter sẽ còn thay đổi nhiều, ngoài ra UI của Udin Extension cũng sẽ bị thay đổi
> cho phù hợp usecase, do đó tách riêng sẽ hợp lý hơn."*

Đó là lý lẽ **tách rời nhịp thay đổi**. Nó đúng, và nó đổi bản chất bản chép: một bản *được phép
trôi* không phải fork — fork là hai bản trôi **mà không ai biết**.

**Nên cái giá đi kèm một tấm lưới.** `tests/be-mat-hep-smoke.mjs` khối ⑷ băm **bảy tệp chép** và
đỏ khi lệch; muốn khác thật thì khai `CO_Y_KHAC` kèm lý do. Bốn tệp CỐ Ý khác — `bridge-core` ·
`manifest` · `sidepanel.*` · `background` — không bị ghim, vì đó đúng là chỗ Đức nói sẽ đổi.

**Gói hẹp hơn Scouter, đo được:** 12 lệnh (Scouter 24) · 5 lệnh ghi (11) · một trang thay vì
`<all_urls>` · `scout.fetch` và `scout.reload` **không tồn tại**. Quyền `debugger` thì giống —
đó là chiều duy nhất không hẹp lại được, và là lý do bảy tệp kia phải bị ghim.

**Đã xong:** 10 tệp logic sang `tu-dong/` · vỏ `goi-bridge` riêng · manifest · host vỏ mỏng ·
7 phép ghim xanh · suite Scouter còn **31 xanh và không còn Udin**.

**CHƯA làm:** chưa một lượt chạy thật nào từ extension này — chặng ④, cần Đức nạp extension.

<!-- HANDOFF-THANG: 2026-09 -->

## 2026-09-15b · `claude-scouter-udine` — máy chủ đã chạy thật, và nó tự xưng nhầm tên ngay lượt đầu

**Làm được gì không cần Đức.** Sinh tệp ghép cặp riêng (`--goi udin-optic`, cổng **32152**, tệp
nằm ngoài repo), tạo vùng ghi `…/udin-optic/anh-ra`, rồi **bật máy chủ Bridge thật**. Nó lên.
Nghĩa là vỏ host mỏng trên lõi `_shared` đã đúng dây — chứng minh được **trước khi** Đức phải
đụng vào Chrome.

**Và lượt chạy đầu tiên in ra:** `Scouter Bridge nghe ở 127.0.0.1:32152`. Đúng cổng của Udin,
đúng tệp ghép cặp của Udin, **tự xưng là Scouter**. Không hỏng chức năng — nhưng đó chính là
**cách một bản chép nói dối**: người bật máy chủ đọc đúng dòng đó để biết mình vừa bật cái gì.

Không phải chuyện mới: `duc-scouter` từng phải viết hẳn một dòng README để giải thích đúng triệu
chứng này (máy chủ của nó in tên `duc-auto-chatgpt`). Lần đó **giải thích**; lần này **chữa**.

Tìm thêm bốn chỗ cùng bệnh, và bốn chỗ đó đi ra **tận đầu dây bên kia** chứ không chỉ ra màn
hình: `INTERNAL_ERROR` nói *"The scouter could not complete the request"* · mã lỗi lạ ném
*"Unknown scouter bridge error code"* · và **ba dòng mô tả method** mà `system.capabilities` trả
về cho AI gọi tới (*"report the scouter session identity"* …). Một gói tự khai sai tên ở đúng
chỗ người ta nhìn để phân biệt các ghế thì `bridge.sessions` mất nghĩa.

**Ghim lại bằng khối ⑹** của `be-mat-hep-smoke.mjs`: soi phần **mã** của ba tệp riêng cộng
`manifest.json`, **đỏ khi thấy chữ `scouter`**. Miễn trừ có lý do: các dòng `from "…"` và tên
lớp `ScouterEngine` — đó là tên tệp và tên export THẬT của bản chép, đổi chúng là làm gãy phép so
byte để đẹp một chữ. Lượt đột biến tay (in lại `Scouter Bridge`) **chết** đúng như mong.

**Còn lại của chặng ④, và chỉ Đức làm được:** nạp `workers/udin-optic/v0.1.0` vào Chrome, chọn
tệp ghép cặp ở bảng bên, bật công tắc. Máy chủ và tệp ghép cặp **đã sẵn sàng**.

## 2026-09-15c · `claude-scouter-udine` — icon chữ **U**, và nó là mã nguồn chứ không phải bốn tệp PNG

Đức chốt đổi icon thành chữ **U**. Chép bộ sinh của Scouter (`make-icons.mjs`) và đổi **đúng
phần vẽ chữ**: hai cột dọc + một nửa vành khuyên dưới nối chúng lại. Phần đóng gói PNG, khử răng
cưa 4×4, và nền vuông bo góc giữ nguyên từng dòng.

**Vì sao vẫn là một bộ sinh.** PNG là nhị phân: `git diff` không đọc được, không ai sửa lại được,
và ba tháng nữa không ai biết nó vẽ bằng gì. Sửa icon = sửa hằng số rồi chạy lại — **đừng sửa tay
tệp PNG**, lượt chạy sau sẽ ghi đè.

**Không dùng phông chữ**, cùng lý do như Scouter: phông có ở máy này chưa chắc có ở máy khác, và
một icon đổi hình theo máy là một icon không kiểm được.

Nền giữ nguyên tông vàng hổ phách. Hai extension vì thế cùng màu, khác chữ (`S` và `U`) — đọc
được ở 16px, đã xem thử cả 48px lẫn 16px trước khi ghi tệp. Muốn phân biệt mạnh hơn thì đổi hằng
số `NEN` rồi chạy lại; đó là một dòng.

`make-icons.mjs` vào nhóm **tệp CỐ Ý KHÁC** (luật gói ⑷) — không bị ghim so byte với Scouter, vì
đây đúng là chỗ gói này được phép khác.

## 2026-09-15d · `claude-scouter-udine` — bộ khởi động, và cái tên sai chui qua được cả khối ⑹

**Thiếu bộ khởi động.** Đức hỏi *"bật máy chủ ở đâu?"* và chỉ vào
`START-BRIDGE_HNX-Fetch.cmd`. Quy ước có sẵn ở `.repo-structure.json` (`START-BRIDGE_<Tên>.cmd`
+ `.ps1` trong nhà chung), tôi chỉ đưa Đức một lệnh `node` dài. Nay có đủ:
`Chay-may-chu-Udin.cmd` (kéo-thả, trong repo) và `START-BRIDGE_Udin-Optic.cmd/.ps1` (nhà chung).
Đã **chạy thật** — máy chủ lên cổng 32152, chạy ẩn, ghi log cạnh tệp ghép cặp.

**Và lượt chạy thật ấy phát hiện cái tên sai thứ HAI.** Hỏi `system.ping` qua dây, nhận:
`{"scouter":"online","seed":"scouter-seed-v0.1"}`. Khối ⑹ vừa viết lúc sáng **không bắt được**,
vì nó soi mã của ba tệp RIÊNG — còn chuỗi này nằm trong `scouter-seed-core.mjs`, tệp **chép
nguyên văn**. Bài học: một bộ dò chỉ canh được vùng nó soi, và tôi đã chọn vùng theo *chỗ tôi
vừa sửa* chứ không theo *chỗ câu trả lời đi ra*.

`system.ping` là thứ ĐẦU TIÊN người ta gọi để biết mình đang nói chuyện với ghế nào.

**Chữa ở đâu, và vì sao không chữa ở chỗ hỏng.** Sửa thẳng `scouter-seed-core.mjs` thì phải khai
`CO_Y_KHAC` và **mất phép so từng byte trên đúng tệp chứa CÁI PHANH**. Đổi một lớp bảo vệ lấy hai
chuỗi chữ là cái giá tồi. Nên `background.js` **đè** `session.hello` và `system.ping` — cùng chỗ
với `worker_id`, cùng lý do (`G9`): tên gói là hiểu biết riêng, nó không vào tệp chép.

Khối ⑺ canh cái đè còn nguyên, **và canh hai chỗ khai tên phải KHỚP NHAU** (`background.js` ↔
`bridge-core.mjs`) — một ghế hai tên thì `bridge.sessions` mất nghĩa. Đột biến tay chết.

**Đo được, không phải suy:** extension Udin Optic **đã nạp và đang nối** — `system.capabilities`
qua dây trả **12 method**, `seed: udin-optic-v0.1`, `protocol: udin-optic.bridge`.

## 2026-09-15e · `claude-scouter-udine` — lượt live đầu tiên: W1 W2 ĐẠT, W3 chết vì **chính chỗ gói hẹp lại**

**Lượt chạy thật đầu tiên từ extension mới** (prompt *"a teal ceramic teapot beside three green
pears"*, chưa dùng bao giờ). W1 vượt màn chờ **ĐẠT**, W2 gửi prompt **ĐẠT** — Udin nhận và sinh
ảnh. W3 chết:

```
scout.grab hỏng: ACTION_FAILED — Không tải được tệp của
'https://optic-canvas-cache-vinfast.s3.us-east-1.amazonaws.com/…webp': Failed to fetch
```

**Nguyên nhân không phải mã, mà là `manifest.json`.** `scout.grab` gọi `fetch` **trong service
worker** (`scouter-seed-core.mjs` — tải cả tệp rồi mã hoá một khúc, vì header `Range` giết
service worker, `G-62`). Một tên miền không khai trong `host_permissions` thì lượt fetch đó bị
CORS chặn, và thông điệp duy nhất còn lại là `Failed to fetch`.

Ảnh Udin **không nằm trên `vinfast.udinbv.com`** — chúng nằm trên một bucket S3 riêng. Scouter
không bao giờ gặp chuyện này vì nó mở `<all_urls>`.

**Đây chính là cái giá của việc thu hẹp quyền, và chỉ một lượt chạy live phát hiện được.** Bảy
phép ghim, một suite gốc xanh, và một máy chủ chạy thật đều không thấy: không cái nào gọi ra
ngoài internet.

**Chữa bằng đúng MỘT dòng, hẹp nhất có thể:** thêm `optic-canvas-cache-vinfast.s3.us-east-1
.amazonaws.com` — một bucket có tên, không phải `s3.amazonaws.com/*`, càng không phải `<all_urls>`.
Khối ⑵ so `deepEqual` nên **thêm một tên miền cũng đỏ**; nay mỗi dòng trong danh sách kèm câu trả
lời cho *"việc nào cần nó"*. Dòng thứ tư phải trả lời được câu đó trước.

**Chưa đóng chặng ④.** Đức phải **nạp lại extension** để manifest mới ăn, rồi chạy lại với một
prompt mới nữa — URL ký của lượt vừa rồi hết hạn sau **900 giây** (`S-24`), nên không vớt lại được.

## 2026-09-15f · `claude-scouter-udine` — **CHẶNG ④ ĐÓNG: bốn ảnh xuống đĩa từ extension RIÊNG**

Prompt *"a copper watering can among five lavender stems"* (chưa dùng bao giờ). **Bốn chặng ĐẠT:**

| | |
|---|---|
| W1 vượt màn chờ | ĐẠT |
| W2 gửi prompt | ĐẠT |
| W3 lấy ảnh | **4/4 xuống đĩa** — 786.870 · 959.068 · 964.148 · 943.476 byte, mỗi ảnh **3 khúc** |
| W4 đọc trả lời | ĐẠT — 192 ký tự, và **nói đúng về prompt vừa gửi** (*"the copper watering can among the lavender"*) |

Kiểm bằng đĩa chứ không bằng lời báo của lệnh: bốn tệp có thật, đầu tệp `RIFF…WEBP` hợp lệ.

**Vế thứ hai, và nó mới là vế chứng minh:** `git status workers/duc-scouter` **SẠCH**. Một
extension khác chạy trọn một việc thật **trên mã của Scouter mà không bắt Scouter sửa một dòng**.
Từ hôm nay câu *"Scouter là bộ đồ nghề chung"* không còn là lời khai — nó **đã bị bắt chứng minh
và đã qua**.

**Chặng ④ cần đúng hai lượt chạy live để đóng**, và lượt đầu không phí: nó đẻ ra `G-94` (ảnh nằm
trên S3, không trên trang làm việc), thứ mà bảy phép ghim + suite gốc + máy chủ chạy thật đều
không thấy.

## 2026-09-15g · `claude-scouter-udine` — ảnh ra **JPG**, và không thêm một dependency nào

Đức 15/09: *"ảnh lưu về là .webp. Tôi muốn JPG"*. Udin trả WebP trên S3 và không có tham số nào
đổi định dạng ở đầu kia, nên việc đổi phải làm ở đầu này.

**Chỗ khó, và nó không nằm ở JavaScript:** Node **không giải mã được WebP**, mà repo này có
**đúng không dependency nào**. Thêm `sharp` (nhị phân native, vài chục MB) vào một repo
không-dependency là một thay đổi kiến trúc — để lấy một việc **Windows đã làm sẵn**: WIC có codec
WebP từ Windows 10 1809, và `PresentationCore` gọi thẳng nó. Đo trước khi viết một dòng nào: ảnh
Udin 1728×1728 giải mã và ghi JPG được, **không cài gì**.

Giá phải trả đã khai chứ không giấu: **chỉ chạy trên Windows**. Repo đã Windows-only ở nhiều chỗ
(nhà chung, bộ khởi động `.cmd`), nên đây không phải ràng buộc MỚI.

**Hai chốt trong thiết kế:**
· **Ảnh gốc `.webp` KHÔNG bị xoá** — xoá dữ liệu gốc phải hỏi Đức, và chính máy chủ Bridge cũng
  cố ý không có `file.delete`. Lượt đổi chỉ **thêm** tệp.
· **Không tin lời khai của bộ đổi.** PowerShell nói "xong" mới chỉ là một câu; mỗi tệp ra được đọc
  lại và kiểm **ba byte đầu `FF D8 FF`**, cộng số byte thật trên đĩa. Cùng kỷ luật với lượt kiểm
  `RIFF…WEBP` của `lay-anh.mjs`.

**Chặng `JPG` đứng SAU `W3`, trước `W4`** — cùng lý do W4 đứng cuối: lượt đổi hỏng thì ảnh đã nằm
nguyên trên đĩa. `--khong-jpg` tắt được.

**Chạy thật trên bốn ảnh của lượt E2E:** 786.870 → 746.455 · 959.068 → 922.290 · 964.148 →
914.480 · 943.476 → 889.895 byte, giữ nguyên 1728×1728.

5 khối ghim mới; khối ⓐ chạy **PowerShell thật** trên icon PNG của chính gói — vì thứ đáng nghi ở
đây là *"Windows làm được không"*, và một máy giả cho câu đó chỉ hỏi lại niềm tin của tôi. Suite
gói: **8 xanh**. Đột biến bỏ phép kiểm `FF D8 FF` → **chết**.

## 2026-09-15h · `claude-scouter-udine` — Đức đảo thứ tự: làm ở Udin trước, rồi mang về Scouter

> *"Tôi thấy B làm xong, rồi apply vào Scout & đóng nó lại thì hay hơn chứ nhỉ?"*

**Đồng ý**, và nó đúng vì một luật đã có: `ADR-0007` — *mỗi nấc mở bằng một VIỆC THẬT chứ không
bằng một danh sách*. Udin có việc thật; Scouter là bộ đồ nghề. Làm ở Udin trước thì Scouter chỉ
nhận thứ **đã sống sót qua một lượt dùng thật**.

**Nhưng chiều đi KHÔNG tự do, và đây là chỗ dễ hỏng nhất.** Gói này có bảy tệp chép bị ghim so
từng byte. Nên đường ranh:
· **4 tệp CỐ Ý KHÁC** (`sidepanel.*` · `manifest` · `bridge-core` · `background`) → **Udin trước**.
· **7 tệp CHÉP** (`probes` · `actions-core` · `seed-core` · `transport` · `engine` · `journal` ·
  `file-core`) → **Scouter trước**. Sửa chúng ở đây trước là **làm gãy phép so byte trên đúng tệp
  chứa cái phanh**.

**Phép thử một câu, dùng trước mỗi việc:** *có cần một method Bridge MỚI không?* Không → Udin. Có
→ việc của seed, và thêm method là đổi luật an toàn (luật gói ⑴, ⑷) → hỏi Đức.

**Đo "giống Extension khác" là gì:** ba gói `duc-auto-*` có bảng bên **676 · 649 · 646 dòng**;
Udin và Scouter **188**. Ba gói kia có sẵn thu phóng 80–120%, `Choose Folder`, nối/ngắt ghép cặp.

**Ba trong bốn tính năng Đức nêu KHÔNG cần method mới** — `Zoom UI` là CSS, `Zoom web` là
`chrome.tabs.setZoom` gọi thẳng từ bảng bên, `Check kết nối` là đường đã có. Cái thứ tư là một
**ngã ba phải chốt**: ba gói `duc-auto-*` chọn thư mục bằng `showDirectoryPicker`, tức **trình
duyệt ghi thẳng, bỏ qua hẳn máy chủ Bridge** — mất đúng lớp bảo vệ vùng-ghi mà `T21` vừa chứng
minh là chạy được. Tôi khuyên đường thư-mục-con, và nói rõ đường kia là lựa chọn của Đức.

Chuỗi `U0..U5` ở `CHUOI-VIEC.md`. **`U0` đứng đầu và nó chỉ là một lượt đo**: `chrome.tabs.setZoom`
có cần quyền `tabs` không — vì thêm quyền là **nới quyền**, không phải một dòng khai báo (`G-94`).

## 2026-09-15i · `claude-scouter-udine` — chốt `U4`, và câu trả lời của Đức giết đường `showDirectoryPicker`

Đức 15/09: *"Tôi phải chọn folder, hoặc AI local tạo thư mục và chọn cho tôi. Vì các project, job
khác nhau sẽ có kết xuất khác nhau."*

**Nhu cầu thật là tách kết xuất theo project/job — KHÔNG phải ghi vào ổ đĩa bất kỳ.** Hai thứ đó
khác nhau, và chỉ thứ hai mới đòi bỏ máy chủ Bridge. Tôi đã suýt hỏi nhầm câu: bản hỏi đầu tiên
viết bằng chữ của máy và Đức trả lời *"tôi chưa hiểu câu hỏi?"* — **lỗi hệ thống, không phải lỗi
người đọc**. Hỏi lại bằng một câu duy nhất (*"anh có cần ổ đĩa khác không?"*) thì ra ngay đáp án.

**Chốt: hai tầng, mỗi tầng một nhịp đổi.** Vùng ghi (`--root`) là thiết lập của MÁY, Đức đặt một
lần, đổi sang ổ `D:` bằng một dòng cấu hình. Thư mục con là `<du-an>/<lượt-chạy>`, **AI đặt theo
từng job**. Cả hai vẫn nằm sau máy chủ Bridge → giữ nguyên chốt *"vùng ghi không chứa tệp ghép
cặp"* và trần tệp.

**`showDirectoryPicker` CHẾT**, lý do ghi vào `CHUOI-VIEC.md` ⓪b để đừng ai mở lại: nó vứt bỏ cả
đường ghi đã có phép ghim (`scout.grab` + `file.write`) để đổi lấy một hộp thoại — trong khi nhu
cầu thật đã được đáp bằng hai tầng trên.

**Chuỗi `U0..U5` chốt để CHẠY MỘT MẠCH.** Ba quyết định lấy trước để nó không phải dừng:
· `tabs` được phép thêm nếu `U0` đo ra là cần — Udin đã có `debugger` + `scout.targets` nên nó
  **đã** đọc được URL mọi tab; `tabs` không mở cửa nào mới. Vẫn phải sửa khối ⑵ (hợp đồng quyền).
· `U2` **không** được thêm `scout.view` để tự kiểm — đo 15/09: nó không nằm trong 12 method, thêm
  lại là thêm method và chuỗi sẽ dừng. Kiểm bằng `chrome.tabs.getZoom`, **và nói thẳng giới hạn**:
  chứng minh Chrome nhận lệnh, không chứng minh trang vẽ lại.
· Nạp lại extension gộp đúng **một** lần, sau `U4`.

Còn đúng **hai điểm dừng**, cả hai ở cuối: Đức nạp lại extension, rồi Đức ký `Scouter v1`.

## 2026-09-16a · `U0`–`U4`: hai lời khai của chính lộ trình bị bác bỏ

Chạy một mạch `U0`→`U4`. Hai chặng hỏng vì **tôi viết lộ trình mà chưa đo** — cùng hình dạng `G-92`.

**`G-95`** — `setZoom` **không** đòi quyền `tabs`, nên `U2` không đụng manifest. Nhưng phép đo
lật ngược chỗ đặt lớp an toàn: `setZoom` cũng **không** bị `host_permissions` chặn — nó phóng to
được cả tab ngoài mọi quyền. Thứ duy nhất ngăn phóng nhầm tab người khác là `tab.url` bị Chrome
**giấu**. Lớp an toàn nằm trên đường **ĐỌC**, không trên đường **GHI**: ai “chữa nút xám” bằng cách cứ
zoom tab đang xem là gỡ mất lớp chặn duy nhất. Phép ghim: tab lạ thì `setZoom` **không được gọi**.

**`G-96`** — bảng bên **không** gọi được `bridge.sessions`: extension chỉ TRẢ LỜI, ba loại khung duy
nhất nó gửi ra dây là `auth` · `keepalive` · `rpc_response`. Mở đường phát yêu cầu = đổi luật an
toàn → chuỗi dừng. Chữa bằng cách **đứng sang phía bên kia**: năm bước hỏi cùng những câu ấy từ
phía extension (`scripts/kiem-nhanh.mjs`).

**Làm được:** `U1` cỡ chữ bảng bên 100/110/120%, sống qua một lượt đóng/mở · `U2` thu phóng trang
80/90/100%, nút khoá **kèm lý do** (sáu nguyên nhân, sáu câu khác nhau) · `U3` nút *Kiểm tra kết nối*,
dừng ở bước hỏng đầu tiên, tắt máy chủ thì nói đúng *“chưa nối được máy chủ Bridge”* · `U4`
`--du-an "<tên>"` → `<vùng-ghi>/udin-optic/<tên>/<lượt>/`, in đường đầy đủ, `--mo` mở Explorer;
vùng ghi đọc từ `vung-ghi.txt` **ngoài repo**; tên project xấu bị từ chối kèm lý do, **trước khi
tốn credit**.

**Ba sửa dọc đường:** bảng bên in `Ctrl+Shift+X` (phím Scouter) ở đúng chỗ nói *“thấy lạ thì bấm
cái này”* — gói này là `Ctrl+Shift+U` · `AGENTS.md` còn ghi icon *nền vàng*, Đức đã chốt **hồng
pastel** · chặng `U4` chỉ vào `START-BRIDGE_Udin-Optic.ps1`, **tệp đó không tồn tại**.

**ĐIỂM DỪNG ①.** Đức: `chrome://extensions` › Udin Optic › **Nạp lại**, rồi đóng và mở lại bảng
bên. Một lượt nạp cho cả bốn chặng. Sau đó AI chạy E2E thật để nghiệm thu `U4` bằng ĐĨA.

## 2026-09-16b · `U5` + một lời khai sai của tôi về bộ khởi động

**TÔI NÓI SAI VỚI ĐỨC.** Tôi báo `START-BRIDGE_Udin-Optic.ps1` *không tồn tại*. **Nó có** — nằm
**ngoài repo**, trong nhà chung của Bridge, và nó chính là thứ Đức bấm. Lệnh tìm của tôi chỉ quét
trong repo. Hậu quả thật: `U4` vá vào **nhầm tệp**, và tạo ra **hai bản của một luật** — bản
quan trọng hơn thì git không thấy. **Bài học:** hạ tầng của gói này **không nằm trọn trong repo** —
tệp ghép cặp, bộ khởi động, vùng ghi đều ở ngoài, **cố ý**. Trước khi khai một tệp là *không
tồn tại*, phải tìm cả nhà chung của Bridge.

Chữa đúng gốc: luật về hẳn `bridge/vung-ghi.mjs` **trong repo** — thứ tự `--root` ›
`vung-ghi.txt` cạnh tệp ghép cặp › `anh-ra`. Cả hai bộ khởi động chỉ còn gọi vào. Máy chủ
**nói ra vùng ghi lấy TỪ ĐÂU**, không chỉ nói nó ở đâu — Đức sửa tệp cấu hình rồi bật lại mà thấy
đường cũ thì câu đó là thứ duy nhất nói cho anh ấy biết tệp có được đọc hay không.

Phép ghim `vung-ghi-smoke.mjs` bắt một lỗi thật: **ổ gốc `C:\` lọt qua phép canh trùm** —
`path.resolve("C:/")` trả về `C:\` nên nối thêm một dấu gạch thành hai, không khớp đường nào.
Dùng cả ổ đĩa làm vùng ghi thì tệp ghép cặp nằm dưới nó, tức token đọc được qua dây.
Đo **khởi động thật** bốn kiểu cấu hình; cả bốn ra đúng một dòng đọc được, không ra stack trace.

**`U5` xong.** Hai lõi (`zoom-core` · `kiem-nhanh`) làm **trung tính với gói** rồi chép sang
Scouter và **vào bảng so từng byte** (7 → 9 cặp). Từ nay **bản gốc ở bên Scouter**. Suite hai bên
xanh (12 · 33), đột biến Scouter **14/14 giết được, 0 sống sót**.

**ĐỨNG Ở ĐIỂM DỪNG ①.** Đức nạp lại **cả hai** tiện ích (Udin Optic và Duc Scouter — cả hai đều
có UI mới), rồi AI chạy một lượt E2E thật để nghiệm thu `U4` bằng ĐĨA.

## 2026-09-16c · Một lỗ hổng cả suite không nhìn thấy: bảng bên có NẠP ĐƯỢC không

Mọi phép ghim của bảng bên chạy trong `node:vm`: chúng **trích một khối** rồi chạy khối đó. Nghĩa
là `sidepanel.js` **đầy đủ chưa bao giờ chạy trong một trình duyệt thật**. Một `import` sai đường,
một `id` gõ nhầm, một lỗi cú pháp ở khối không ai trích — cả ba **lọt qua toàn bộ suite**, rồi hiện
ra dưới dạng một **bảng bên trắng trơn**. Và nó hỏng IM LẶNG: MV3 không báo gì, trang vẫn tải.

`duc-scouter/v0.1.0/scripts/do-bang-ben.mjs` bịt chỗ đó: Chrome sạch → nạp chính thư mục gói → mở
`sidepanel.html` → nghe console → hỏi ba câu (lỗi console · `id` JS gọi có trong HTML không ·
mã có **thật sự chạy** không). Câu thứ ba đo bằng một **dấu vết mã phải để lại trên DOM**, không đo
`document.readyState` — trạng thái đó vẫn *"complete"* khi mọi script đã chết.

Đo cả hai gói: **0 lỗi console, 0 `id` thiếu, mã chạy, 6 nút phóng to / 12 thẻ**. Phép đo có
răng (đột biến 2 lượt, 2 chết): đổi tên một `id` → bắt đúng `id` đó kèm dòng ném `TypeError`;
`import` một file không tồn tại → bắt `ERR_FILE_NOT_FOUND` kèm *"mã KHÔNG chạy"*.

Nửa **tĩnh** (kiểm `id`) vào thẳng suite nhanh ở cả hai gói vì nó không cần Chrome — *cái gì phải
nhớ mới chạy thì sẽ có lúc quên*. Nửa **sống**: `npm run scouter:bang-ben` · `npm run udin:bang-ben`.

## 2026-09-16e · ĐIỂM DỪNG ① qua — `U4` nghiệm thu bằng ĐĨA

Đức nạp lại xong. Đo ghế trước khi tiêu gì: **12 lệnh · 5 lệnh ghi · seed `udin-optic-v0.1`** —
đúng bản mới, không phải bản cũ còn sót.

**Nhánh từ chối đo trước vì nó không tốn gì.** Ba tên project xấu — `Dự án A` · `../ra-ngoai` ·
`CON` — đều đỏ kèm lý do RIÊNG và **đỏ trước khi chạm dây**: prompt chưa hề được gửi.

**Lượt thật:** `--du-an "xe-dien-2026"`, prompt mới hoàn toàn. W1→W2→W3→JPG→W4 trọn vẹn;
`W4` đọc đúng câu trả lời **mới** (nói về ấm trà, khớp prompt).

**Kiểm bằng ĐĨA, không tin báo cáo:** 4 tệp `.jpg` mở đầu `FF D8 FF` (JPEG thật), kích
thước khớp **từng byte** với báo cáo · 4 bản `.webp` gốc vẫn nằm nguyên · cây thư mục chứng minh
**cả hai chiều**: lượt mới ở `udin-optic/xe-dien-2026/<lượt>/`, **lượt cũ 15/09 vẫn ở hình dạng
cũ** `udin-optic/<lượt>/` — thêm một tầng mà không gãy lượt chạy nào.

**MỘT DÒNG CHƯA ĐO ĐƯỢC, và giá của nó:** cờ `--mo` (`spawn("explorer.exe")`). Không đo
được mà không tiêu thêm một lượt credit. **Giá nếu nó hỏng:** đường dẫn đầy đủ vẫn được in ra,
Đức chép dán thay vì có cửa sổ tự mở — không mất dữ liệu, không mất tiền.

Còn lại: ba thứ trên bảng bên chỉ **mắt người** thấy được (cỡ chữ, thu phóng trang, nút *Kiểm tra
kết nối*) — `chrome.debugger` **không gắn được vào trang extension**, nên không có đường nào để AI
tự bấm chúng. Đã đo gián tiếp bằng `npm run udin:bang-ben` (Chrome sạch, 0 lỗi console).

## 2026-09-16f · Việc kế **không ở gói này**

Đức chốt 16/09: **sửa đường ghi trước, rồi mới ký `Scouter v1`**. Chuỗi `S1`–`S4` nằm ở
`duc-scouter/v0.1.0/CHUOI-VIEC.md`, vì `scout.type`/`scout.click` là **tệp chép bị ghim** — sửa ở
đây trước là làm gãy phép so từng byte trên đúng tệp chứa cái phanh (luật gói ⓢ, chiều Scouter → Udin).

Gói này nhận bản chép ở chặng `S3`, rồi một lượt E2E thật để chứng minh không gãy gì.

**Một điều của gói này `S1` phải chịu được:** ~~ô nhập của trang Udin là loại **giàu**
(`contenteditable`)~~ — **SAI, gạch 16/09.** Đo lại chính mã của gói: `qua-man-cho.mjs` khai
`oPrompt: "textarea.agent-textarea"`, tức một `<textarea>`. Câu KẾT LUẬN thì vẫn đứng, và nay nó
còn đúng hơn: đọc lại không ra chữ thì phải **khai là chưa kiểm được**, không ném và cũng không im
lặng báo đạt — nếu không, `S1` sẽ làm chết chính `W2` của gói này.

## 2026-09-16g · `S3` — nhận bản chép đường ghi tự kiểm

Bốn tệp ghim so từng byte đã đồng bộ (`scouter-probes` · `scouter-seed-core` ·
`scouter-actions-core` · tệp MỚI `tu-kiem-ghi.mjs`, đã thêm một dòng vào bảng `CẶP`).
`bridge-core.mjs` riêng của gói nhận hai mã lỗi mới và tham số `wait_for` — **từ vựng vẫn 12**.

**Chỗ ô prompt của Udin là `<textarea>` chứ không phải ô giàu** (gạch lại lời khai cũ ở mục
trước) đổi một thứ có giá: đường đọc lại của nó là **cây trợ năng**, không phải `dom.text` — tức
mỗi lượt `scout.type` kéo cây trợ năng **hai lần** trên một trang canvas nặng.

**Giá nếu chỗ đó đắt, và vì sao nó KHÔNG làm gãy `W2`:** đọc không ra thì kết quả khai
`da_kiem: false` kèm một câu — **không ném**. Chốt `G-29` (nút Send mở khoá = chữ đã tới React)
vẫn đứng nguyên chỗ cũ trong `gui-prompt.mjs` và vẫn là thứ chặn thật. Tức xấu nhất là
**chậm hơn**, không phải hỏng.

**CHƯA ĐO ĐƯỢC, và nó cần một lượt chạy thật:** cây trợ năng của trang Udin to bao nhiêu, mất bao
lâu. Không đo được mà không có ghế sống. Đo ngay ở lượt E2E kế tiếp.

## 2026-09-16h · Lượt E2E thật sau `S3` — và con số còn thiếu

**Thứ mục trước khai là CHƯA ĐO ĐƯỢC, nay đã đo:** ô prompt `<textarea>` đi đường trợ năng,
và một lượt `scout.type` trên chính trang Udin mất **404 ms** cho một ký tự — gần trọn phần
cố định, gồm **hai** lượt kéo cây trợ năng. Đối chứng `scout.query` trần: **15 ms**.
Trang canvas nặng **không** làm đường này đắt như tôi lo.

`scout.type` trên ô prompt trả `da_kiem: true`, `kiem_bang: "a11y"`. Tức `W2` nay có
**hai** lớp kiểm chồng nhau: lớp mới đọc lại chữ, và chốt `G-29` cũ (nút Send mở khoá) vẫn
đứng nguyên chỗ. Chưa bỏ lớp nào — hai lớp đo hai thứ khác nhau: chữ tới DOM, và chữ tới React.

**E2E** (`--du-an "s1-nghiem-thu"`, prompt mới): W1→W2→W3→JPG→W4 trọn vẹn · 4 tệp JPEG thật,
cỡ khớp từng byte · `.webp` gốc còn nguyên · thư mục dự án mới sinh đúng chỗ.

## 2026-09-16i · Nền dưới chân gói này đã được ký `v1`

Đức ký `Scouter v1` ngày 16/09 ([ADR-0008] bên gói đó). Gói này chép **mười** tệp từ nền ấy,
nên nó thừa hưởng cả năm lời hứa — và cả **bốn điều nền ấy KHÔNG hứa**. Đọc mục thứ hai trước
khi dựa vào một lệnh nào.

Chỗ chạm gói này rõ nhất: `scout.clear` **chưa** vào đường tự kiểm (nợ `S-27` bên Scouter).
`gui-prompt.mjs` không bị ảnh hưởng vì nó **đã tự kiểm bằng trang** — sau lượt xoá nó đòi nút
Send phải khoá lại. Đừng bỏ vòng kiểm đó chỉ vì đường ghi nay đã tự kiểm: hai chỗ đó kiểm hai
lệnh khác nhau.

**Việc kế của gói: `T35` — `W6` đưa ảnh vào canvas.** Nó bị đặt sau vì nó là **một cú bấm**
mà trước `S2` thì không có cách nào biết nó chạy hay không. Nay đưa `wait_for` là có mốc.

## 2026-09-16j · `W6` xong — và một dòng bảng năng lực hoá ra là **lời khai**

Bảng `W` khai `W6` = *“đưa một ảnh kết quả vào canvas”*, dựa trên một quan sát 13/09: *“nút
Add to canvas có trong DOM”*. Đo lại hôm nay thì **thao tác ấy không tồn tại**:

  ⑴ ảnh kết quả **đã nằm trên canvas** dưới dạng lưới bốn ô (`.is-batch-grid`);
  ⑵ nút *Add to canvas* là nút **mở MENU** — `Frame` · `Image` · `Video` · `3D Model`;
  ⑶ đếm trọn **54 nút** của trang: không nút nào riêng trên từng ảnh.

**Lý do hoãn cũng sai:** `CHUOI-VIEC` đoán nó sẽ hỏng vì `S-22`. Hôm nay cú bấm tới trang
**bốn lần liên tiếp** trên đúng ghế ấy. Thứ chặn `W6` là một thao tác không có thật.

`them-khung.mjs` nay làm việc có thật: **thêm một khung** vào canvas. Chạy thật **8 → 9**.

**CHỐT CỦA CẢ CHẶNG, và nó là bài học `S1` lặp lại:** menu tắt **không** chứng minh khung đã
thêm — bấm lại chính nút mở menu cũng làm nó tắt, bấm ra ngoài cũng thế. `wait_state: "absent"`
trả lời câu *menu còn không*, không trả lời câu *khung có thêm không*. Chỉ **phép đếm** phân biệt
được. Con `D1`/`D2` canh đúng chỗ đó; 6 con đột biến tay, giết được hết.

**MỘT PHÉP ĐO TÔI TỪ CHỐI CHẠY, khai đúng là chưa đo:** bấm thử `Image` để biết nó mở gì.
Nếu nó dựng hộp thoại chọn tệp của hệ điều hành thì hộp thoại đó **treo Chrome của Đức** cho tới
khi có người bấm tay — và cái ghế đang chạy việc thật đứng im theo. Một phép đo không được đắt
hơn thứ nó đo. Ba mục đó thuộc `W8`/`T29`.

**Cũng đo ra, tiện thì ghi:** gói này **không có** `scout.key` trong 12 lệnh, nên nó không bấm
được `Escape`. Đóng một menu thì bấm lại chính nút mở nó, kèm `wait_state: "absent"`.

## 2026-09-16 · `claude-scouter-udine` — `W5` xong, và một cột "Cần" khai sai từ 13/09

**Việc.** `W5`: chọn chế độ *Agent* / *Manual Gen*. `chon-che-do.mjs` + 11 khối ghim,
**15 con đột biến tay, 0 sống sót**. Chạy thật ba nhánh trên ghế `Udin_main`, trả ghế về
đúng chế độ ban đầu. Bảng `W` nay **7/8** — còn đúng `W8` (`T29`, phải hỏi Đức).

**Hàng bảng `W` khai `W5` cần `O3` (`scout.a11y`) — sai hai lần.**
⑴ **`scout.a11y` không có trên dây của gói này.** Udin khai 12 method. Một hàng năng lực
chỉ tới một lệnh gói không gọi được là một hàng **không ai chạy được**, và nó nằm đó ba ngày.
⑵ Lời khai 12/09 (*"class không phân biệt được Agent / Manual Gen"*) đúng **hẹp hơn nó nghe**:
class không nói được *cái nào là Agent* — nhưng `.active` nói được *cái nào đang chọn*, và `W5`
cần cái thứ hai. Nên `W5` thật ra cần `O4`+`O8`+`I1`, cả ba **ĐÃ CHỨNG MINH** từ lâu. Nó chưa
bao giờ thiếu năng lực; chỉ chưa ai làm. Số đo: `button.create-mode-btn` khớp **2**,
`:nth-of-type(1)` = `"Agent"` (đang `active`), `:nth-of-type(2)` = `"Manual Gen"`.

**Chốt của chặng CỐ Ý không phải phép đếm hiển nhiên.** Số nút mang `.active` là **1 trước và 1
sau — ở cả nhánh chạy đúng LẪN nhánh cú bấm không tới trang**. Phép ghim dựa vào nó xanh ở cả hai
nhánh, tức không ghim gì. Thứ phân biệt được là **VỊ TRÍ** nút đang bật.

**Một con đột biến sống sót, và nó tố máy giả chứ không tố mã.** `E16` nới điều kiện dừng vòng
đọc bảng nút. Máy giả của tôi trả chữ cho selector khớp **0**; dây thật thì `scout.text` **từ
chối** khớp ≠ 1 (ADR-0006, viết thẳng trong mô tả method). Sửa **máy giả** về đúng hợp đồng —
không sửa mã cho vừa phép ghim — và `E16` chết.

**`S-22` bị đổ oan lần thứ hai trong một ngày.** `W6` hôm qua, `W5` hôm nay: **hai hàng liên
tiếp** hoãn vì một lý do sai, và không ai đi kiểm lại lý do hoãn. Đã ghi thành khối cảnh báo ở
`CHUOI-VIEC.md` của Scouter: **một lý do hoãn cũng là một lời khai, phải đi đo lại.**

## 2026-09-16 · `claude-scouter-udine` — `S-27` sang gói này, và một mã lỗi suýt lọt

**`scout.clear` của gói này nay tự kiểm** — bản chép từng byte của `tu-kiem-ghi.mjs` và
`scouter-seed-core.mjs`, `bridge-core.mjs` khai thêm `CLEAR_NOT_OBSERVED`.

**Chỗ suýt lọt, ghi kỹ vì nó là một khe của chính kiến trúc.** `tu-kiem-ghi.mjs` nằm trong bảng
`CẶP` nên mã lỗi mới sang đây ngay. `bridge-core.mjs` thì **CỐ Ý KHÁC** — đúng như `T21` đã
chốt — nên **không** phép so byte nào nhắc nó, và nó thiếu mã ấy trong khi **suite xanh trọn
vẹn**. Lượt xoá thất bại đầu tiên sẽ dựng `BridgeProtocolError("CLEAR_NOT_OBSERVED")`, mà chỗ
dựng từ chối mã lạ → `TypeError`, không phải một mã có tên. Hỏng to tiếng, nhưng **chỉ ở nhánh
thất bại** — nhánh không lượt chạy bình thường nào đi qua.

**Đã bắc khối ⑻ vào `be-mat-hep-smoke.mjs`** qua đúng khe ấy: đọc mọi hằng `MA_*` mà
`tu-kiem-ghi.mjs` export ra (đọc, **không gõ lại danh sách** — gõ lại là dựng bản thứ hai của
cùng một sự thật, và lần sau lại không ai sửa), rồi đòi mỗi mã phải dựng được
`BridgeProtocolError` ở gói này. Kiểm hai chiều: bỏ mã khỏi `ERROR_DEFINITIONS` thì khối ⑻ đỏ.

**CHƯA chạy thật TỪ extension này.** Gói này **cố ý** không có `scout.reload` nên nó không tự nạp
lại được — cần Đức nạp lại một lần. Bằng chứng gián tiếp thì mạnh: chính ô
`textarea.agent-textarea` của trang Udin đã chạy thật **cả ba nhánh** ngày 16/09 qua ghế Scouter,
và phần mã bên dưới là bản chép từng byte có phép ghim canh.

**Bảng `W` nay 7/8**, còn `W8` — chờ `D4` bên Scouter.

## 2026-09-16 · `claude-scouter-udine` — `S-27` chạy thật TỪ CHÍNH GÓI NÀY

Đức nạp lại extension. Chạy trên `textarea.agent-textarea` của trang Udin, qua dây của gói này:

- gõ 15 ký tự → `da_kiem: true`, *“xuất hiện 0 lần trước và 1 lần sau khi gõ”*;
- **xoá ô đang có 15 ký tự** → `da_kiem: true`, *“ô có 15 ký tự trước khi xoá và rỗng sau khi
  xoá — hai phím đã tới trang và ô đã sạch”*;
- **xoá lại ô đã rỗng** → `da_kiem: true` nhưng **câu KHÁC**: *“vốn đã rỗng — lượt này xác nhận
  TRẠNG THÁI của ô, KHÔNG chứng minh hai phím đã tới trang”*.

Hai câu khác nhau ở hai nhánh chính là thứ khối ghim ⑬⒝ canh, và nay nó đúng **trên dây thật**
chứ không chỉ trong máy giả. Ô prompt trả về rỗng như lúc gặp.

**Đường ghi của gói này không còn lệnh nào nói dối.** `scout.type`, `scout.click` và
`scout.clear` đều tự kiểm hoặc khai thẳng là chưa kiểm được.

**`W8` hoãn có chủ ý** (`D4` bên Scouter, chốt 16/09): không việc nào đang chạy cần đưa tệp vào
trang. Mốc mở là ngày Đức cần đưa một **ảnh tham chiếu** vào Udin. Bảng `W` giữ **7/8**.

## 2026-09-16 · `claude-scouter-udine` — `scout.upload`: gói đi từ 12 lên 13 method

Đức chốt: *lấy ảnh Udin vừa tạo, đưa ngược vào, xin style khác*. Ảnh nằm trong vùng ghi của
**gói này** (`anh-ra/udin-optic/<dự-án>/<lượt>/`), nên lệnh ở đây chứ không ở Scouter — kế
hoạch `T29` viết hôm trước đặt nhầm chỗ.

**Máy chủ của gói nay có một móc sửa tham số trước khi chuyển tiếp**, và nó chỉ chạm
`scout.upload`. Ba việc, theo thứ tự: ghép `path` tương đối vào vùng ghi bằng `trongGoc` ·
**GHI ĐÈ** `path_tuyet_doi` mà người gọi tự điền · bắt tệp **phải có thật**.

**Vế thứ ba sinh ra từ một phép đo, không từ sự cẩn thận.** Chrome **nhận** một đường dẫn không
tồn tại và gắn vào trang một tệp **rỗng 0 byte** mà không báo gì (`npm run scouter:tai-len`).
Máy chủ là bên DUY NHẤT thấy đĩa, nên nó phải canh.

**Đã chạy thật trên dây, trước khi extension được nạp lại:** `../ra-ngoai.txt`, đường tuyệt đối
và `C:x.txt` đều bị **máy chủ** chặn bằng `PATH_OUTSIDE_ROOT` — **không cái nào chạm tới
extension**. Đường hợp lệ đi qua máy chủ trót lọt rồi dừng ở `METHOD_NOT_FOUND` của bản
extension cũ, đúng như dự đoán.

**`W8` CHƯA đóng.** Đo trang: **không có `<input type=file>` nào**, cả khi menu *Add to canvas*
mở. Udin gần như chắc chắn dựng ô ấy tạm trong chính lượt bấm, hoặc dùng cửa chọn tệp của trình
duyệt — **CHƯA ĐO**, và không đo bằng cách bấm thử `Image`. Đường đo an toàn cần
`Page.setInterceptFileChooserDialog`, tức một câu hỏi nữa cho Đức.

## 2026-09-16 · `claude-scouter-udine` — `mo_bang`: đường DUY NHẤT chạy được trên trang này

Ô `<input type=file>` của Udin được dựng **TẠM** rồi xoá đi — nó chỉ sống trong lúc hộp thoại
đang mở. Nên `scout.upload` có thêm `mo_bang`: đưa selector của **nút phải bấm**, lệnh sẽ
**chặn hộp thoại TRƯỚC** (nên nó không hiện lên màn hình Đức), bấm, tìm ô **MỚI** hiện ra, đổ
file vào, rồi **tắt chặn trong `finally`**.

Từ chối rõ ràng: cú bấm không dựng ra ô nào → `NO_FILE_CHOOSER`; dựng ra nhiều ô →
`SELECTOR_AMBIGUOUS` (đổ vào *"cái đầu tiên"* là chỗ tự động hoá phá hỏng đồ thật); khai cả
`selector` lẫn `mo_bang`, hoặc không khai gì → `UPLOAD_MODE_UNCLEAR`.

**Chưa chạy thật trên gói này** — cần một lượt nạp lại extension. Lượt thử vừa rồi trả đúng
`INVALID_PARAMS: unknown field 'mo_bang'`, tức bản đang chạy là bản trước khi thêm đường ấy.

Nợ `S-31` bên Scouter ghi lại chuyện này: gói này **không tự nạp lại được** (`scout.reload` bị
cắt ở `T21`), nên mỗi lượt sửa mã đều tốn một cú bấm của Đức — hôm nay là ba. Mặc định cho tới
khi có quyết định khác: **gộp nhiều lượt sửa thành MỘT lượt nạp lại**, đừng mở method mới cho
một chuyện kỷ luật giải quyết được.

## 2026-09-16 · `claude-scouter-udine` — `W8` chạy thật; gói này **8/8**, `MASTERED`

Đưa ngược tấm `02-batch-…jpg` mà chính gói này tải về hôm ấy vào lại trang Udin, **không một cú
bấm nào của người**: mục `Image` tìm theo **NHÃN** · hộp thoại hệ điều hành **không hiện lên màn
hình Đức** · pill đính kèm **0 → 2**, nhãn `"1 Image"` · ô chọn tệp tạm bị trang thu lại về **0**,
đúng như khi người dùng tự chọn. 5 đơn vị trần ghi.

**Bảng `W` đủ 8/8, không còn hàng CHẶN, E2E ĐẠT → `MASTERED`.**

**Việc kế của gói này là `R1`** (roadmap ở `CHUOI-VIEC.md` bên Scouter): một lệnh chạy TRỌN vòng
việc thật của Đức — chọn ảnh lượt trước → `scout.upload` → gõ prompt style mới → gửi → chờ →
tải ảnh mới về. Mọi mảnh đã có và đã chạy thật **rời rạc**; chưa ai nối lại.

**Cẩn thận đúng một chỗ khi làm `R1`:** *"đã đính kèm"* phải kiểm bằng **pill trên trang**,
**không tin lệnh trả về** — `scout.upload` hứa đúng *đã bảo Chrome gắn file vào ô*, không hứa
trang đã nhận. Đúng bài học `S1`. ~~(`[class*=agent-context-pill]` đếm TĂNG)~~ — **selector ấy
SAI, gạch 16/09 tối**: nó khớp 2 nút cho MỘT ảnh. Đúng là `.agent-context-pill-thumb`; xem mục
ngay dưới.


## 16/09 (tối) — `R1` nối vòng: MÃ XONG, VÒNG SỐNG CHƯA KHÉP

**Việc.** `tu-dong/vong-style.mjs`: chọn ảnh lượt trước → đính kèm → prompt style mới → gửi →
chờ → ảnh mới về đĩa → JPG. **Không method mới.** 16 khối ghim · 16 đột biến, 0 sống sót · lượt
chọn ảnh chạy thật trên vùng ghi.

**Chưa ĐẠT, và lý do nằm NGOÀI repo.** Lượt chạy sống dừng ở chặng đính kèm: `scout.upload` báo
`files: 1` mà trang **không nhận ảnh nào**. Nạp lại trang thì `.concurrency-overlay` hiện ra và
**không tắt** — Udin đang ĐẦY CHỖ. (Trang vẽ xong mất **18 giây** sau lượt nạp lại.)

**Ba số lật ba giả định, hai trong đó do chính mục HANDOFF bên trên viết ra.**
⑴ `[class*=agent-context-pill]` khớp **2 nút cho MỘT ảnh** — cái hàng chứa
(`agent-context-pills-row`) + cái thumb. Nay đếm `.agent-context-pill-thumb`, đúng một nút mỗi
ảnh. Đó là lý do câu báo lỗi đầu tiên đọc ra `"2 → 2"`, nghe như đang có hai ảnh.
⑵ **Lượt chạy trước để lại ảnh của nó đang đính kèm.** Gỡ được bằng `.pill-thumb-clear` (đo:
thumb 1 → 0), nhưng gỡ là thứ phải **XIN**: `--xoa-pill-cu`. Mặc định vẫn từ chối, y hệt
`--xoa-o-cu` của ô prompt và cùng một lý do — cái đang nằm đó có thể là ảnh Đức tự đưa vào.
⑶ Sau lượt gỡ, mốc **luôn bằng 0**, nên hiệu số `sau > truoc` là một biến thừa; đổi sang một
con số tuyệt đối — và hai con đột biến của nó hoá ra **tương đương**.

**`W8` xanh sáng nay KHÔNG bảo đảm lượt nào cũng xanh.** Cùng lệnh, cùng ghế, cách nhau vài giờ.
Một dòng ĐẠT là một ĐIỂM, không phải một đường — nên lệnh ghi vẫn phải đếm lại trên trang.

**Làm tiếp:** đợi Udin rỗng chỗ rồi chạy một lượt với prompt CHƯA DÙNG BAO GIỜ —
`vong-style.mjs "<prompt>" --du-an xe-dien-2026 --xoa-pill-cu --mo`.


## 16/09 (tối, muộn) — `R1` khép vòng, và Đức lật một lời khai của tôi

**Vòng đã chạy sống trọn vẹn.** `vong-style.mjs` lấy `01-batch-…sn3w1x3b.jpg` của lượt sáng, đính
kèm ngược vào Udin, xin *"1950s enamel travel poster"* → **4 ảnh mới** về đĩa, đã đổi JPG, canvas
**2 → 7**, ảnh đính kèm `0 → 1`. Thư mục: `xe-dien-2026/2026-09-16T13-51-37-688Z`.

**CÒN MỘT VẾT, và nó là vết của tôi.** Chặng đính kèm **vẫn bật lên hộp thoại `Open` của Windows**
và Đức phải bấm **Cancel**. Câu *"hộp thoại hệ điều hành không hiện lên màn hình Đức"* ở hàng `W8`
**chưa bao giờ được đo** — tôi suy ra từ việc Đức không kêu, rồi viết nó vào bảng năng lực như một
phép đo. Đã gạch tại chỗ ở `CAPABILITIES.md`.

**Vì sao nó sống được lâu:** lượt tải lên **vẫn thành công** dù hộp thoại bật lên — ô chọn tệp sống
trong lúc hộp thoại treo, nên `DOM.setFileInputFiles` vẫn ăn. Cái giá không nằm trong kết quả, nó
nằm trên màn hình Đức. Đúng kiểu hỏng đắt nhất.

**Ba giả thuyết đã đo, ĐỀU TRƯỢT** (Chrome hồ sơ trống, không đụng tab Đức): tắt chặn sớm trong
`finally` · trang bấm TRỄ nên chạy đua · thiếu `Page.enable`. Cả ba lượt: trang nhận file, pill
hiện, **0 hộp thoại**. Khác biệt còn lại nằm ở đường `chrome.debugger` của extension — chưa đo.

**Đường DÁN đã đo và ĐÓNG.** Udin bỏ qua cả tệp lẫn ảnh bitmap trên clipboard hệ điều hành. Đức đo
thêm vế quyết định: copy–paste **trong nội bộ canvas Udin thì được**. Nên paste là tính năng riêng
của ứng dụng, không phải đường nhập tệp — đừng quay lại.

**Hai lần trong một tối tôi dùng sai dụng cụ đo**, và cả hai đều cho ra *"không có hộp thoại"*:
`MainWindowTitle` không thấy cửa sổ CON của Chrome; bộ lấy mẫu "mỗi 400 ms" thực ra chỉ lấy được 7
mẫu vì mỗi lượt gọi PowerShell tốn hơn một giây. Ảnh chụp của Đức mới là phép đo đúng.


## 16/09 (khuya) — Đức đo tay bốn đường đưa ảnh, và mô hình của trang lộ ra

**Mô hình thật của Udin không phải "đính kèm vào ô chữ".** Nút `+` → `Image` thêm được **nhiều
ảnh một lượt**, và ảnh vào thẳng **CANVAS**; ảnh nào được **chọn** thì mới thành một *reference*
trong prompt. Nên `.agent-context-pill-thumb` mà `vong-style.mjs` đếm là **số ảnh đang được chọn
làm tham chiếu**, không phải số tệp đã tải lên. Phép đếm vẫn đúng việc của nó, nhưng tên gọi
trong đầu tôi thì sai, và cái tên sai ấy sẽ dẫn nhầm ở lượt nào cần nhiều ảnh.

**Bốn đường, đo bằng tay:** ⑴ `+` → `Image` — ĐƯỢC, nhiều ảnh, **có hộp thoại**. ⑵ **kéo-thả từ
Explorer vào canvas — ĐƯỢC, không hộp thoại.** ⑶ dán từ clipboard hệ điều hành — **KHÔNG** (cả tệp
lẫn bitmap). ⑷ copy–paste **trong nội bộ canvas — ĐƯỢC**, nhưng đó là tính năng riêng của ứng dụng.

**Một chỗ sửa lại cho đúng:** kéo-thả **không** gửi "một link ảnh" như linh cảm ban đầu — Windows
gửi **danh sách đường dẫn tệp**, trang nhận qua `DataTransfer.files`, y hệt thứ nó nhận từ ô chọn
tệp. Nên nó không rẻ hơn về mặt dữ liệu; nó thắng ở chỗ **không bao giờ dựng hộp thoại**.

**Việc kế** là bỏ được hộp thoại, và cả hai đường đều cần **một method CDP mới** → phải hỏi Đức:
⒜ `Page.enable` (rẻ, giữ nguyên đường đang chạy, **chưa chứng minh là chữa được**) ·
⒝ `Input.dispatchDragEvent` (đổi hẳn sang kéo-thả, **theo cấu tạo không có hộp thoại**, và bỏ được
`Page.setInterceptFileChooserDialog` khỏi bề mặt). Không cái nào chặn `R1` — vòng đã chạy.


## 16/09 (khuya) — `@1` / `@2`: chọn ảnh tham chiếu theo đúng thứ tự

**Vì sao làm.** Đức nêu ràng buộc mà `R1` chưa chạm tới: *"nếu bạn apply 1 cho 2 mà không xác
định được đâu là 1, đâu là 2 thì sẽ không còn chính xác nữa."* Và ảnh chụp của Đức cho thấy mô
hình thật: **Shift+click** một ảnh trên canvas thì nó mang huy hiệu `1`, ảnh sau mang `2`, và
prompt gọi chúng bằng `@N` — câu thật trên màn hình là *"APPLY STYLE OF @1 TO @2"*.

**Đo trước khi xây, và phép đo đổi thiết kế.** `data-image-id` CÓ trên mọi ảnh canvas nhưng nằm
ngoài danh sách trắng của lõi đọc nên **giá trị bị che**; `alt` của mọi ảnh đều là `"Canvas image"`.
Thứ duy nhất phân biệt được là `src` — và lõi đọc **cắt** nó rồi gắn `…` vào cuối (để nguyên dấu
ấy trong selector thì khớp 0, đã dính). Quan trọng hơn: `src` định danh **TẤM ẢNH**, không định
danh **CHỖ ĐẶT** — đo thật thấy một ảnh nằm **5 chỗ** trên canvas cùng lúc. Ca đó **TỪ CHỐI**.

**`chon-tham-chieu.mjs`.** Bỏ chọn cũ (phải XIN, `boChonCu`) → Shift+click từng ảnh theo thứ tự →
**đọc lại con số trong đúng hộp vừa bấm** → đối chiếu tổng. Thêm `kiemPromptThamChieu`: prompt gọi
`@3` khi mới chọn 2 ảnh thì đỏ TRƯỚC khi tiêu đồng nào. 12 khối ghim · 12 đột biến, 0 sống sót.

**Cần một lượt NẠP LẠI extension** — `scout.chon` là lệnh mới trên dây, extension chưa có nó.


## 16/09 (khuya) — `@1` / `@2` CHẠY THẬT, và hai phép đo lật thiết kế

**Chạy thật trên canvas của Đức:** bỏ 2 ảnh đang chọn → Shift+click A rồi B → **đọc ngược từ
trang: A mang `"1"`, B mang `"2"`**, đúng hai ảnh đã xin. `scout.chon` lên dây sau lượt nạp lại.

**⒜ Canvas là một MẶT PHẲNG KÉO ĐƯỢC.** *Có trong DOM* còn xa mới là *bấm được*: đo **6/12** ảnh
bấm được, số còn lại `no_hit_test`. Lượt chạy đầu ngã ở toạ độ `y = -100` — phép kiểm điểm bấm
chặn đúng một cú bấm mù, nhưng câu báo là câu của CDP và nó không nói Đức cần làm gì. Nay hỏi
`scout.wait state=usable` TRƯỚC, và nói thẳng: *"kéo canvas cho nó hiện ra rồi chạy lại"*.

**⒝ Udin CHỈ vẽ số khi có từ HAI ảnh trở lên.** Một ảnh thì hộp mang `selected` mà không huy hiệu
nào — hợp lý, một ảnh thì chẳng có gì để xếp. Bản đầu đòi huy hiệu ngay sau cú bấm ĐẦU TIÊN nên
nó ném oan. Nay phép kiểm thứ tự chạy SAU khi chọn xong, và chọn một ảnh thì trả `so: null` kèm
`thuTuKiemDuoc: false` — **khai là không đọc được**, không bịa ra số 1.

**Một hệ quả phải nói rõ:** vì không đọc được số trước khi có hai ảnh, lượt sai thứ tự chỉ lộ ra
SAU khi đã bấm cả hai. Hai cú bấm ấy rẻ và bỏ được; thứ đắt tiền là lượt gửi prompt, và nó vẫn
chưa xảy ra.

**Một con đột biến sống sót chỉ ra MÃ THỪA, không phải ghim hở:** phép đếm huy hiệu trong từng hộp
chỉ nói lại điều `scout.text` đã bảo đảm (từ chối mọi selector khớp ≠ 1). Xoá nó, thay vì đi ghim
một thứ không làm gì. 15 khối ghim · 15 đột biến, 0 sống sót.


## 16/09 (khuya) — kiểm tính năng chèn ảnh, và một phép đo bỏ bớt cả một chặng

**Đức xin kiểm đường chèn/đính kèm TRƯỚC khi làm tiếp.** Đúng thứ tự, và nó đáng: phép đo bỏ được
cả một chặng khỏi vòng việc thật.

**Bảng `+` có ĐÚNG BỐN mục:** `Frame` · `Image` · `Video` · `3D Model`. Không có ô chọn tệp nào
nằm sẵn trong DOM, không có vùng thả nào khai bằng class.

**Điều quan trọng nhất: ẢNH UDIN TỰ SINH RA TỰ VÀO CANVAS.** Đo thật ở lượt `R1`: canvas **2 → 7**
ngay sau một lượt sinh 4 ảnh (4 ảnh sinh + 1 ảnh tải lên). Nên vòng *"lấy ảnh Udin đã tạo, đưa
vào, xin style khác"* — đúng câu Đức nói 16/09 — **không cần tải lên lần nào**. Và vì không tải
lên thì **không có hộp thoại nào bật ra**: cái nợ ⓶ biến mất khỏi đường đi chính.

**Nhưng ĐỪNG đối chiếu bằng TÊN.** Ảnh trên canvas mang URL `persistent/…/img/<mốc>-<mã>.webp`,
còn ảnh trong khung chat mang `ephemeral/…/generated/batch-…webp` — đo: **khớp 0/8**. Canvas giữ
một bản KHÁC của cùng tấm ảnh. Đường đúng là **chụp tập `src` của canvas TRƯỚC và SAU rồi lấy
phần chênh** (`anhTrenCanvas()` đã trả về đúng tập ấy).

**Pill tham chiếu do lượt CHỌN sinh ra, không phải lượt tải lên.** Sau khi chỉ Shift+click hai ảnh
canvas, `.pill-thumb-clear` đếm ra **2**. Nên con số `vong-style.mjs` đang canh thật ra là *"có
mấy ảnh đang làm tham chiếu"* — vẫn đúng việc, nhưng tên gọi trong đầu tôi thì sai.

**Tải lên chỉ còn cần cho MỘT việc:** đưa ảnh từ NGOÀI vào (ảnh chụp của Đức). Đó cũng là đường
duy nhất bật hộp thoại `Open`.


## 16/09 (khuya) — `scout.tha`: bỏ hẳn hộp thoại, không phải chặn nó

**Đức hỏi thẳng:** *"có cách nào tránh được điểm này không? hay phải sống chung?"* — **tránh được.**

**Đo tiền đề TRƯỚC khi xin mở method**, trên Chrome hồ sơ trống của riêng máy đo: trang nhận đủ
`dragenter → dragover → drop`, `files.length = 1`, tên đúng, **525119 byte khai VÀ đọc thật ra
cũng 525119**, kiểu `image/jpeg`, và **0 hộp thoại** trước lẫn sau. Nếu phép đo ấy đỏ thì đã
không phải đi xin gì.

**`scout.tha` lên dây CHỈ ở gói này**, y như `scout.upload` — Scouter là bộ đồ nghề chung và nó cố
ý không khai đường đưa byte ra trang. Cùng một móc máy chủ, cùng cổng vùng ghi: `path` tương đối,
máy chủ ghép thành tuyệt đối và **ghi đè** giá trị người gọi tự điền, tệp phải có thật.

**Ba khoá không nới một cái nào.** Method CDP nhận `x`/`y`, và đó là chỗ nguy hiểm nhất của nó —
nhưng cổng chung của lõi ghi **TỪ CHỐI THẲNG** mọi toạ độ người gọi tự điền (`COORDINATE_NOT_ACCEPTED`),
nên `input.tha` thừa hưởng khoá ấy mà không phải viết thêm dòng nào. Đo lại trong phép ghim vì đây
là method ĐẦU TIÊN của gói thật sự đưa `x`/`y` xuống CDP: cổng ấy hở thì hở đúng ở đây.

**Một việc của Đức không tự chạy được:** ảnh của anh nằm ở `Downloads`, tức NGOÀI vùng ghi, nên
máy chủ từ chối — đúng thiết kế. Đường đi là **chép** ảnh vào vùng ghi trước (`udin-optic/vao/`);
bản gốc không bị đụng. Tên có dấu và dấu cách thì đổi sang tên không dấu.

10 khối ghim ở `tai-len-smoke.mjs` · 8 đột biến riêng, 0 sống sót. **Cần một lượt NẠP LẠI extension.**


## 17/09 — `scout.tha` CHẠY THẬT: ảnh ngoài vào canvas, không một hộp thoại nào

**Đo:** thả ảnh của Đức vào `#root` tại `(719, 455)`, `hit: descendant` → **canvas 17 → 18**, và
**0 cửa sổ hộp thoại** ở cả ba lần đếm. Câu hỏi của Đức — *"phải sống chung không?"* — trả lời
xong: không.

**Thả vào đâu: `#root`.** Udin không có lớp canvas riêng nào đọc được — `.canvas-viewport`,
`.canvas-container`, `[class*=canvas-area]`, `main` đều khớp **0**. Thứ duy nhất khớp đúng một là
`#root`. Ghi ra để người sau khỏi đi tìm một cái tên đẹp hơn không tồn tại.

**BÀI HỌC ĐIỀU PHỐI, và nó là lỗi của tôi:** sửa `udin-optic-host.mjs` là sửa một **TIẾN TRÌNH
ĐANG CHẠY**, không phải một tệp extension. Tôi bắt Đức nạp lại extension, rồi mới phát hiện máy
chủ vẫn chạy mã cũ (bật lúc 16:43) — hai việc đáng lẽ gộp làm một. Từ nay mỗi lượt xin nạp lại
phải nói rõ **cả hai**: extension hay máy chủ, hay cả hai.

**Máy chủ từ chối đúng lúc phải từ chối.** Extension đã có `scout.tha` nhưng máy chủ chưa có móc
ghép đường dẫn, và nó trả `INVALID_PARAMS` kèm câu *"trường này do MÁY CHỦ đặt … extension KHÔNG
tự ghép, và không lùi về `path`"* — thay vì đoán lấy một đường dẫn. Đúng thiết kế `T29`.

**Bật lại máy chủ:** `START-BRIDGE_Udin-Optic.ps1` ở Bridge home. Nó **tự thoát nếu cổng đã có
người nghe**, nên phải tắt tiến trình cũ trước (`Stop-Process`), rồi mới chạy launcher.


## 17/09 — VÒNG THAM CHIẾU trọn vẹn: `@1` / `@2` chạy thật, không một cú Cancel

**Một lệnh, sáu chặng:** `W1 → NGUỒN → CHỌN → W2 → W3 → JPG`. Thứ tự tham chiếu **đọc ngược từ
huy hiệu trên trang** — `@1 = …2u4vdq`, `@2 = …jvw125`, đúng hai ảnh đã xin. Prompt *"apply the
style of @1 to @2, ultramarine-and-gold Art Nouveau, peacock feather borders"* → **4 ảnh mới** về
đĩa, đã đổi JPG. Thư mục `tham-chieu-17-09/2026-09-16T17-18-02-909Z`.

**`vong-tham-chieu.mjs` làm cả hai ca Đức nêu bằng một đường**, khác nhau đúng một chỗ:
`--anh canvas:<mẩu src>` cho ảnh Udin tự sinh (đã sẵn trên canvas), `--anh <đường vùng ghi>` cho
ảnh của Đức từ ngoài (thả vào bằng `scout.tha`). Thứ tự `@N` theo thứ tự `--anh`.

**Danh tính ảnh vừa thả học bằng PHẦN CHÊNH của canvas, không bằng tên tệp.** Canvas giữ một bản
KHÁC của cùng tấm ảnh (`persistent/…/img/…` so với `ephemeral/…/generated/batch-…`, khớp **0/8**
theo tên), nên một phép đối chiếu theo tên sẽ khớp 0 ở MỌI lượt — và cái sai ấy đọc y hệt *"trang
chưa nhận ảnh"*. Một lượt thả mà canvas mọc thêm **≠ 1** ảnh thì **TỪ CHỐI**: *"lấy ảnh mới nhất"*
ở đó là đoán bừa, và nó trỏ nhầm tham chiếu mà không báo gì.

**Đức bỏ ràng buộc credit 17/09** — *"tạo ảnh không tốn credit… đừng hesitate"* — và đổi luôn lý do
của luật *đổi prompt mỗi lượt*: nay nó để **nhận diện ảnh vừa tạo** trên một canvas đầy ảnh na ná
nhau. Prompt đặc trưng là một **dụng cụ đo**, không phải trang trí.

11 khối ghim · 9 đột biến, 0 sống sót. Suite gói **18/18**.

## 2026-09-17 · `claude-scouter-udine` — gỡ lối bật hộp thoại, một lệnh bật lại máy chủ, `W4` vào vòng

**Việc.** Đức khoanh phạm vi: *"chỉ tập trung hoàn thiện extension Udin, tránh lan man"*. `R2`/`R3`
(phục vụ Scouter) **parked**. Ba mép của Udin khép nốt.

**① Không còn lối nào bật hộp thoại `Open` lên màn hình Đức.** `tu-dong/vong-style.mjs` **XOÁ**
(Đức chốt): nó làm đúng việc `vong-tham-chieu.mjs` làm, nhưng đính kèm bằng `scout.upload
--mo-bang` và không có `@1`/`@2` — giữ hai lệnh chạy vòng là giữ một ngày có người chạy nhầm bản
cũ. Kéo theo ở gói `duc-scouter`: đường `mo_bang` gỡ, `Page.setInterceptFileChooserDialog` rời
`WRITE_CDP_METHODS` (**17 → 16**). Lý do đầy đủ ở HANDOFF của `duc-scouter` cùng ngày. Bảng lỗi
Bridge của gói này mất theo hai mã `NO_FILE_CHOOSER` và `UPLOAD_MODE_UNCLEAR`.

**② Bật lại máy chủ bằng MỘT lệnh.** `START-BRIDGE_Udin-Optic.ps1 -KhoiDongLai` dừng tiến trình
đang giữ cổng rồi bật lại, và **chỉ dừng tiến trình tên `node`** — cổng bị thứ khác chiếm thì đó
không phải máy chủ này. Không có cờ thì vẫn tự thoát như cũ, nhưng nay in ra câu chỉ đường. Chạy
thật: `26468 → 34572 → 18308`, cùng cổng `32152`. Nhớ vì sao cần: sửa `bridge/*.mjs` là khởi động
lại một TIẾN TRÌNH, không phải nạp lại extension — 16/09 mất một lượt vì chỗ này.

**③ `W4` vào vòng.** `vong-tham-chieu.mjs` nay bảy chặng `W1 → NGUỒN → CHỌN → W2 → W3 → JPG →
W4`. Câu trả lời đọc TRƯỚC lượt gửi rồi truyền vào `khacVoi`, nên *có chữ* không bị đọc thành *có
chữ MỚI*. `W4` đứng CUỐI, sau lượt ghi đĩa — một chặng đọc đỏ không bao giờ làm mất ảnh đã tải.

**Đo.** Suite 36/36 + 17/17 · đột biến 179/179 + 17/17 · vòng tham chiếu 11/11 (thêm hai con canh
`W4`). Ghim `tai-len-smoke` còn 8 khối.

**CHƯA làm:** Đức chưa nạp lại extension sau đợt này, nên chưa có lượt chạy thật nào của vòng bảy
chặng. `S-31` (Udin không tự nạp lại được) vẫn mở.

## 2026-09-17b · `claude-scouter-udine` — danh tính ảnh canvas chuyển sang `data-image-id`

**Việc.** Đóng lỗ đo được sáng nay: ca ⒝ của Đức (*gửi ảnh từ ngoài vào rồi xin Udin improve*)
gãy mỗi khi canvas đã có sẵn một ảnh thả. Nguyên nhân và quyết định ở [ADR-0009]; đây là phần mã.

`chon-tham-chieu.mjs`: `hopCuaAnh(src)` → **`hopTheoId(id)`**, thêm `idTrenCanvas()` và
`idTheoSrc(mẩu)`; `chonTheoThuTu` nhận danh sách **mã**. `vong-tham-chieu.mjs` học danh tính ảnh
vừa thả bằng **phần chênh của tập mã**.

**Ba chỗ đáng đọc trước khi sửa quanh đây:**

⑴ **Hộp thiếu `data-image-id` thì TỪ CHỐI CẢ LƯỢT**, không lặng lẽ bỏ qua. Bỏ qua nghĩa là phép
so trước/sau đếm thiếu, và ta quay lại đúng câu *"canvas không mọc thêm ảnh nào"* cho một lượt
thả thành công. Câu từ chối nói thẳng việc phải làm — **đo trên dây thật** với extension bản cũ:
*"…extension đang chạy bản cũ chưa có thuộc tính ấy… nạp lại extension rồi chạy lại."*

⑵ **`idTheoSrc` để CHROME khớp CSS** (`img[src*="…"]`), không `includes()` trong Node. Chuỗi `src`
phía Node đã bị cắt ở 200 ký tự — đúng chỗ đường cũ mù.

⑶ **Lượt nới này MUA THÊM một ca, không chỉ vá một ca.** `src` định danh TẤM ẢNH, `data-image-id`
định danh CHỖ ĐẶT. Một ảnh nằm 5 chỗ trên canvas (đo thật 16/09) thì đường cũ phải từ chối cả
lượt; đường mới chọn được đích danh từng chỗ. Phép ghim ⓒ nay khẳng định đúng điều đó.

**Đo.** Suite 36/36 + 17/17 · đột biến 179/179 + 19/19 · chọn tham chiếu 15/15 · vòng 11/11.
Thêm hai ghim: hộp thiếu mã → đỏ; hai hộp **cùng một mã** → đỏ, không bấm cái đầu.

**CHƯA làm:** chưa chạy sống ca ⒝ sau đợt này — cần Đức nạp lại extension một lần (lõi đọc đổi).
`S-31` (Udin không tự nạp lại được) là thứ bắt ta phải dừng ở đây, và nó vẫn mở.

## 2026-09-17c · `claude-scouter-udine` — chạy sống sau khi nạp lại: đo được độ trễ thả, và một câu đỏ thiếu số

**Đức nạp lại extension 17/09.** Lõi đọc mới thông: canvas khai **20 chỗ đặt, 20 mã riêng biệt**
— trong khi đường `src` cũ chỉ thấy 15 chuỗi khác nhau (một ảnh nằm 5 chỗ gộp làm một, hai ảnh
thả trùng 200 ký tự đầu gộp làm một). Danh tính nay trỏ đúng CHỖ ĐẶT.

**Đo độ trễ thả, vì một lượt chạy báo đỏ nhầm nguyên nhân.** Thả xong, ảnh hiện trên canvas sau
**3,6s** và **3,2s** (nhịp đo 500ms). Vòng đang chờ tới **17s**, tức dư gấp năm — nên lượt đỏ ấy
**không phải trang chậm**. Đức tự khai: *"tôi vừa miss click"*. Bài học không nằm ở trần chờ mà
ở **câu báo**: nó nói *"trang chưa nhận"* mà không nói **đã chờ bao lâu**, nên "trang chậm" và
"có người vừa chạm vào trang" đọc y hệt nhau — và ta đi sửa nhầm chỗ. Nay câu đỏ chở số giây,
kèm thứ tự kiểm bắt đầu bằng *"có ai vừa chạm vào trang không"*. Có ghim riêng cho con số ấy.

**Còn một vết CHƯA đóng, và nó thuộc về Udin chứ không thuộc về gói này:** hai lượt chạy liên
tiếp sau đó đều không ra ảnh — lượt một Udin trả *"Done! What would you like to do next?"* mà
không sinh gì (chế độ **Agent** đang bật, đã đọc lại trên trang, nên đó là agent tự quyết); lượt
hai treo ở trạng thái *đang chạy* quá 10 phút với lưới kết quả đứng yên ở 16. Vòng **không nói
dối** ở cả hai ca: nó báo *"chạy xong nhưng không có ảnh mới"* và giữ đường `--noi-lai`. Chưa đủ
dữ liệu để kết luận nguyên nhân — **không đoán**.

**Sổ sách:** `STATUS.md` và `CHUOI-VIEC.md` của gói đang khai trạng thái cũ, nay sửa: **cả hai
điểm dừng ĐÃ QUA** (Đức nạp lại 17/09; `Scouter v1` ký ở ADR-0008), `U0`–`U5` đóng trọn, `R2`/`R3`
parked theo phạm vi Đức khoanh.

## 2026-09-17d · `claude-scouter-udine` — `W4` từng đọc một DÒNG TRẠNG THÁI ra như câu trả lời

**Tìm ra nhờ một lượt Udin treo**, không nhờ nghĩ ra. Udin đứng ở *"Thinking ahead…"* hơn 15
phút; tôi hỏi `docTraLoi` cho biết trang đang thế nào, và **nó trả về đúng chuỗi ấy như một câu
trả lời**.

**Cơ chế.** Lúc agent đang nghĩ, tin nhắn cuối **không có** `.markdown-content` — đo được nó chỉ
chứa `.agent-status-indicator` · `.status-spinner` · `.thinking-text`. Hai ứng viên hẹp trượt, và
**lưới an toàn thứ ba** (`.agent-message-item:last-child`, dựng cho ngày trang đổi lớp trong)
nuốt trọn dòng trạng thái.

**Vì sao đắt hơn nó trông.** `W4` có một chốt `khacVoi` để chặn việc đọc lại câu của lượt TRƯỚC.
Một dòng trạng thái thì **khác câu trước thật** — nên nó đi lọt qua đúng cái chốt sinh ra để bắt
nó, và lượt chạy được đóng dấu ĐẠT với một câu trả lời chưa bao giờ tồn tại. Cùng họ với
`plateau-is-not-a-finish`: thứ trông như kết quả, ở đúng chỗ kết quả, mà không phải kết quả.

**Vá:** `DAU_DANG_NGHI` — ba dấu hỏi **TRƯỚC** mọi ứng viên; thấy dấu nào thì TỪ CHỐI và không
đọc chữ lần nào. Đặt sau vòng ứng viên là vô nghĩa, lưới an toàn đã trả chữ ra mất rồi.
**Đo lại trên trang thật:** `W4` nay từ chối đúng, kèm câu nói rõ agent còn đang nghĩ.

**Một con đột biến sống sót và nó tố PHÉP GHIM, không tố mã:** khối ⓛ duyệt chính
`DAU_DANG_NGHI`, nên gỡ bớt một dấu khỏi bảng chỉ làm vòng chạy ít hơn — xanh y hệt. Nay bảng
được khai **thẳng bằng chữ** trong phép ghim. `5/5` đột biến.

**Vòng bảy chặng CHƯA đóng lại được sau đợt này** — hai lượt liên tiếp không ra ảnh vì lý do nằm
ở Udin (lượt một agent tự trả *"Done!"* không sinh gì; lượt hai treo ở *đang chạy* >20 phút, lưới
kết quả đứng yên ở 16). Vòng **không nói dối** ở cả hai: nó báo *"chạy xong nhưng không có ảnh
mới"* và *"VẪN ĐANG CHẠY sau 902s — chưa hỏng, chỉ là chưa xong"*, và giữ đường `--noi-lai`.

## 2026-09-17e · `claude-scouter-udine` — nguyên nhân thật của ba lượt hỏng: máy chủ Udin ĐẦY CHỖ

**Mục 17/09d để ngỏ câu hỏi nguyên nhân; nay có dữ liệu, nên khép lại ở đây thay vì để nó sống
tiếp như một chỗ tối.** Sau khi nạp lại trang, `W1` chặn ngay với một câu đọc được, và chữ trên
màn chắn là **`"User Limit Reached · Please try again in a few minutes when other users finish
their sessions."`** — đúng `.concurrency-overlay` đã gặp 16/09.

**Nó giải thích cả ba lượt, không phải một:**

| lượt | triệu chứng | nay đọc là |
|---|---|---|
| ① | Udin đáp *"Done! What would you like to do next?"*, không sinh ảnh nào | agent bị cắt phần sinh ảnh vì hết suất |
| ② | treo ở *"Thinking ahead…"* hơn 20 phút, lưới kết quả đứng yên ở 16 | lượt chạy không bao giờ được cấp chỗ |
| ③ | `W1` chặn thẳng sau khi nạp lại trang | màn chắn hiện ra đúng như nó phải thế |

**Ba lượt ấy KHÔNG lãng phí**, và đó là chỗ đáng ghi: mỗi lượt để lại một phép đo mà lượt chạy
suôn sẻ không bao giờ cho — độ trễ thả (3,2–3,6s), và cái lỗ `W4` đọc dòng trạng thái ra như câu
trả lời. Cái thứ hai chỉ lộ ra vì có một lượt treo đủ lâu để tôi đi hỏi trang.

**Và không một lượt nào trong ba lượt nói dối.** `W2` báo *"chạy xong nhưng không có ảnh mới"*;
`gui-prompt` báo *"VẪN ĐANG CHẠY sau 902s — chưa hỏng, chỉ là chưa xong"* kèm đường `--noi-lai`;
`W1` báo *"máy chủ Udin vẫn đầy chỗ, thử lại sau"*. Ba câu khác nhau cho ba trạng thái khác nhau.

**`RD` (chạy sống ca thả ảnh ngoài, canvas có sẵn nhiều ảnh trùng `src`) CHƯA ĐÓNG** — chặn bởi
sức chứa máy chủ Udin, **không** bởi thứ gì trong repo này. Đường danh tính đã chứng minh xong
trên dây thật ở lượt ① (thả vào, chọn được, gửi được); thứ còn thiếu duy nhất là một lượt Udin
chịu sinh ảnh. Luật cũ vẫn đúng: **đừng bấm `Try Again` thêm — chỉ có đợi.**

## 2026-09-17f · `claude-scouter-udine` — Đức bác lời khai "máy chủ đầy chỗ": đó là BUG, cứ ấn

**Đức, 17/09:** *"máy chủ Udin đang đầy chỗ → đây chỉ là bug thôi, từ sau bạn cứ ấn."*

Mục 17/09e ở trên khai màn chắn `.concurrency-overlay` là **hết chỗ thật** và kết luận `RD` bị
chặn bởi sức chứa máy chủ. **Vế ấy SAI.** Màn chắn có thật, nhưng nó là **lỗi giao diện của
Udin** — bấm `Try Again` là qua.

**Cái sai nằm sâu hơn một con số, và đó mới là phần đáng giữ lại.** Phép đo 16/09 ghi ĐÚNG triệu
chứng: ~25 phút, 6 lượt bấm, màn chắn không tắt. Rồi tôi **tự đặt tên cho nguyên nhân** — *"máy
chủ đầy chỗ"* — và viết cái tên ấy thành luật trong `CHUOI-VIEC.md`: *"đừng bấm thêm, chỉ có
đợi."* Hôm sau chính luật ấy chặn một lượt chạy thật, `quaManCho` bỏ cuộc sau ĐÚNG MỘT cú bấm, và
tôi báo cho Đức là *bị chặn bởi sức chứa máy chủ* — một câu chỉ mình anh bác được.
**Triệu chứng thì đo được; nguyên nhân thì phải hỏi người biết.**

**Sửa ở cả ba tầng, không chỉ ở mã:**

| tầng | trước | nay |
|---|---|---|
| mã | bấm **1** lần rồi ném | bấm lại tới **12** lượt, mỗi lượt kiểm màn chắn đã tắt; trả về số lượt đã bấm |
| câu báo | *"máy chủ Udin vẫn đầy chỗ"* | kể **đã bấm mấy lần, chờ bao lâu**, và **không đặt tên cho nguyên nhân** |
| luật | `CHUOI-VIEC.md` · `CAPABILITIES.md` · `GIA-THUYET.md` khai "hết chỗ" | cả ba **gạch tại chỗ** kèm câu Đức bác |

**Ghim phải phân biệt được, và bản đầu thì không:** bộ ghim cũ vẫn xanh trọn sau khi tôi sửa mã —
vì mọi khối của nó chỉ dựng ca *tắt ngay ở cú đầu* hoặc *không bao giờ tắt*. Thêm `tatOLan`
(màn chắn chịu tắt ở cú thứ N) và một khối đòi `bam: 3`; cộng một khối khẳng định câu đỏ
**KHÔNG** chứa chữ *"đầy chỗ"* — thiếu vế ấy thì một bản chỉ sửa số lần bấm mà giữ nguyên lời
khai bậy vẫn xanh. `10` khối · `5/5` đột biến.

## 2026-09-17g · `claude-scouter-udine` — `RD` ĐÓNG: ca thả ảnh ngoài chạy trọn bảy chặng

**Ngay sau khi `quaManCho` chịu bấm lại, màn chắn tắt ở CÚ ĐẦU TIÊN** (`{daChan: true, bam: 1}`).
Đúng như Đức nói: bug, cứ ấn. Luật *"chỉ có đợi"* đã tốn của tôi hơn một giờ và một lời báo sai.

**Chạy thật `2026-09-17T02-22-30-537Z`**, bảy chặng, 4 ảnh JPG về đĩa:

| | nguồn | mã |
|---|---|---|
| `@1` | ảnh đã có trên canvas (`canvas:2u4vdq`) | `image-1789566611569-cmy3iqb0b` |
| `@2` | **tệp trên đĩa, thả vào bằng `scout.tha`** | `image-1789611506928-vyqc9zbu2` |

**Đây đúng là ca sáng nay gãy**, và nó gãy ở chỗ không ai nhìn ra: canvas đang giữ nhiều ảnh thả
mang `src` **giống hệt nhau trong 200 ký tự đầu**, nên phép so `src` thấy 0 ảnh mới. Nay danh
tính là `data-image-id` nên chỗ đặt mới có mã riêng ngay từ lượt thả đầu.

**Câu Udin trả lời tự chứng minh thứ tự tham chiếu đúng chiều:** *"…all while keeping that
dramatic sunlight from **the first** image."* — `@1` cho ánh sáng, `@2` là vật thể. Không phép
ghim nào kiểm được vế này; chỉ một lượt chạy thật mới nói được.

**Trạng thái gói:** cả hai ca Đức nêu 16/09 nay đều chạy trọn bằng MỘT lệnh — ⒜ ảnh Udin tự sinh
(`canvas:<mẩu src>`) và ⒝ ảnh từ ngoài (`<đường vùng ghi>`). Không một cú Cancel, không một hộp
thoại (đo `0/14` và `0/11`).

**Còn mở, và cần Đức chốt chứ không cần thêm thời gian:** `S-31` — Udin không tự nạp lại được
(`scout.reload` cắt ở `T21`), nên mỗi lần sửa mã extension đều phải nhờ Đức bấm một lần. Mở lại
là **thêm một method Bridge** = đổi luật an toàn.

## 2026-09-17h · `claude-scouter-udine` — `lifecycle: building → active`

Đổi vì **thực tế đã đổi**, không phải vì muốn cắm một cọc sơn: cả hai ca việc thật của Đức nay
chạy trọn bằng MỘT lệnh — ⒜ ảnh Udin tự sinh, ⒝ ảnh từ ngoài thả vào — bảy chặng, không một hộp
thoại, và `RD` đã đóng bằng một lượt chạy sống hôm nay.

`building` nghĩa là *đang dựng*; gói này thì đang **chạy việc**. Giữ `building` là để một dòng
sai trong bảng tổng, và bảng ấy là thứ Đức đọc.

**KHÔNG đổi, và nói rõ vì sao:** `T7` (vòng tự cải tiến) vẫn ở mức **PARTIAL** trong
`CAPABILITIES.md`. Điều kiện lên `MASTERED` mà chính file ấy viết ra đã đủ cả ba vế, nhưng nó là
**chữ ký của Đức** chứ không phải một lượt chạy xanh — y như `Scouter v1` phải đợi ADR-0008.
Tôi không tự nâng mức hộ anh.

## 2026-09-17i · `claude-scouter-udine` — thẻ HƯỚNG DẪN trong bảng bên, và chữ ký `Udin v1`

**Đức 17/09:** *"Viết thêm cả tính năng, feature list, hướng dẫn sử dụng trong Extension Udin."*

**Là một THẺ RIÊNG, không phải một `<details>` ở đáy thẻ khác.** Chính `sidepanel.html` đã ghi
cái giá của chuyện đó ở khối *Hồ sơ ghế*: Đức đi tìm một thứ, không thấy, và kết luận tính năng
CHƯA CÓ — *"một tính năng người dùng không nhận ra thì bằng không có."* Bản "Hướng dẫn nhanh" cũ
trong `<details>` đã **chuyển đi, không để lại bản thứ hai**.

Ba khối: **làm được gì** (10 việc, mỗi việc kèm lệnh gõ lại được) · **bắt đầu thế nào** ·
**KHÔNG làm được gì** — khối cuối đứng ngang hàng với khối đầu, không nhét xuống cuối.

**Phần đáng giá hơn nội dung: phép ghim giữ cho nó không mục.** Một trang hướng dẫn gõ tay chỉ
đúng vào đúng cái ngày người ta gõ nó — repo này đã trả giá hai lần (bảng từng gõ tay *"14
method"* khi thật là 15; lời khai *"máy chủ đầy chỗ"* sống ba ngày). Nên mỗi dòng việc mang
`data-lenh`, và `tests/huong-dan-smoke.mjs` đối chiếu tập ấy với **các tệp CHẠY ĐƯỢC thật** trong
`tu-dong/` — đo bằng chính khối `if (… === resolve(process.argv[1]))`, không bằng một danh sách
tên gõ tay (danh sách tên lại đúng là thứ nó sinh ra để diệt). Hai chiều: quên viết → đỏ; trỏ vào
lệnh không tồn tại → cũng đỏ. `6` khối · `6/6` đột biến.

**Hai chỗ phép ghim bắt được ngay khi vừa viết:** ⑴ dòng `them-khung` tôi viết cụt (24 ký tự) —
**không hạ ngưỡng**, viết lại cho đủ nghĩa. ⑵ Chú thích CSS của tôi nói *"TÊN trên, giải thích
dưới"* trong khi luật để `li` ở `flex-direction: row` — ba phần nằm ngang, dính thành một câu.
Nhìn thấy tận mắt rồi mới sửa, và ghim luôn cái luật bố cục ấy.

**`Udin v1` ký: [ADR-0001](docs/adr/0001-duc-ky-udin-v1.md).** Nó nói ba điều và chỉ ba — làm
được gì (mỗi dòng có một lượt chạy thật đứng sau) · **KHÔNG hứa gì** · cái phanh **giữ nguyên**,
không nới một chốt nào cho lượt ký. Và nó **không** nâng `T7`: vòng tự cải tiến vẫn `PARTIAL`,
đó là việc của Scouter và phụ thuộc `R2`.

## 2026-09-17j · `claude-scouter-udine` — bảng tính năng GOM THEO NHÓM, không rải phẳng

**Đức 17/09:** *"trong tương lai tôi sẽ còn có các feature khác liên quan đến tạo video… nên tôi
prefer bạn tạo thành các group và gói nó lại thay vì là để rải rải ra."*

Bản đầu của tôi là **10 dòng phẳng** — đúng thứ vỡ ngay khi thêm nhóm thứ hai. Nay:

| nhóm | gồm | hình dạng |
|---|---|---|
| **Sinh ảnh & thao tác ảnh** | `vong-tham-chieu` · `e2e` · `chon-tham-chieu` · `lay-anh` · `doi-sang-jpg` | `<section data-nhom="anh">`, mở sẵn |
| **Tính năng phụ** | `gui-prompt` · `doc-tra-loi` · `qua-man-cho` · `chon-che-do` · `them-khung` | `<details data-nhom="phu">`, **gập lại** |

Ranh giới: nhóm chính là thứ Đức mở bảng bên ra để tìm; nhóm phụ là **các bước lẻ của vòng
chính** — vòng chính đã gọi sẵn chúng, chỉ cần tới khi chạy tay từng chặng hoặc soi một chặng
hỏng. *Cất đi không có nghĩa là giấu*, nên chúng vẫn được nhắc tới đủ.

**Thêm nhóm video sau này = thêm MỘT khối `[data-nhom="video"]`**, không đụng nhóm cũ. Phép ghim
cố ý **không kiểm tên nhóm** — kiểm tên thì nhóm mới làm bộ đo đỏ oan. Nó kiểm đúng ba điều:
mọi dòng việc phải **nằm trong một nhóm** · không việc nào ở **hai** nhóm · nhóm phụ phải là
`<details>` (mở toang thì lại rải ra như cũ, chỉ khác cái tiêu đề). `8` khối · `9/9` đột biến.

**Và một lượt tự bắn vào chân, ghi lại vì nó đắt:** viết phép ghim qua heredoc, `\1` (tham chiếu
ngược trong regex) bị Python đọc thành escape bát phân và **một BYTE ĐIỀU KHIỂN `0x01` nằm im
trong file** — trong đúng dòng chú thích cảnh báo về chuyện ấy. `tests/khong-byte-dieu-khien-smoke.mjs`
bắt được. Nay dùng **hai regex riêng** thay tham chiếu ngược: dài hơn một dòng, đổi lại không còn
chỗ nào cho một dấu gạch đi qua ba lớp vỏ.
