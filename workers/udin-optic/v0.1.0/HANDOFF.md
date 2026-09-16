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
