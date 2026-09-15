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
