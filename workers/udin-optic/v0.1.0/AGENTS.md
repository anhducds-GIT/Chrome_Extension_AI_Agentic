# AGENTS.md — gói `udin-optic`

> Đọc `AGENTS.md` ở gốc repo trước. File này chỉ nói phần riêng của gói.
> Khoá của gói: `workers/udin-optic`.

## Gói này là gì

Extension Chrome cục bộ chạy việc sinh ảnh trên `vinfast.udinbv.com`: vượt màn chờ → gửi prompt
→ đợi ảnh mới → lấy ảnh về đĩa. Tách khỏi `duc-scouter` ngày 15/09 (`T21`).

**Đức đã KÝ `Udin v1`** ([ADR-0001](docs/adr/0001-duc-ky-udin-v1.md)): gói này **chạy được việc
thật**, và nó **khai đúng chỗ nó không làm được**. Vế sau mới là vế đắt — mọi lượt mở năng lực
sau chữ ký phải giữ nguyên danh sách "không làm được" ấy cho đúng.

## Luật vàng — tám điều riêng của gói này, đừng đảo lại

**⑴ Từ vựng ĐÓNG ở mười hai lệnh.** `session.hello` · `system.capabilities` · `system.ping` ·
`scout.targets` · `scout.query` · `scout.text` · `scout.wait` · `scout.click` · `scout.type` ·
`scout.clear` · `scout.grab` · `scout.navigate`. Mười hai lệnh còn lại của Scouter phải là lệnh
**KHÔNG TỒN TẠI** (`METHOD_NOT_FOUND`), không phải lệnh tồn tại mà đang bị chặn — cái sau thì bật
lại được bằng một dòng cờ. Thêm một lệnh là **đổi luật an toàn** → phải hỏi Đức.

**⑵ Vùng đích là ĐÚNG MỘT TRANG, và đó là lời hứa lớn nhất của gói.**
`host_permissions` chỉ có `vinfast.udinbv.com` + `127.0.0.1`. Scouter mở `<all_urls>` vì nó dò
trang bất kỳ; gói này không. Nới dòng đó là xoá sạch chỗ hẹp hơn duy nhất khiến việc chép
~2.100 dòng máy bấm/gõ là đáng. `be-mat-hep-smoke.mjs` khối ⑵ canh nó.

**⑶ BẢY TỆP CHÉP PHẢI CÒN GIỐNG SCOUTER** (bảng `CẶP` ở khối ⑷ của `be-mat-hep-smoke.mjs` liệt
kê đủ). Đó là bộ máy gắn debugger, tổng hợp phím chuột, và **cái phanh**. Khối ⑷ băm từng tệp và
**đỏ khi lệch**; muốn khác thật thì khai `CO_Y_KHAC` kèm lý do — không có đường thứ ba. Tên tệp
giữ tiền tố `scouter-` cố ý: nó nói ra xuất xứ, và phép so byte khỏi cần bảng đổi tên.

**⑷ Năm tệp CỐ Ý khác và được phép đổi tự do:** `scripts/bridge-core.mjs` (chỗ gói hẹp lại) ·
`manifest.json` · `sidepanel.*` · `background.js` · `scripts/make-icons.mjs`. Đức chốt 15/09 rằng
**UI sẽ đổi theo usecase** — đó là lý do gói này tồn tại, đừng ghim nó lại.

Icon là chữ **U** mận sẫm trên nền **hồng pastel** (`#FFD1DC`), Đức chốt 15/09. Nó sinh bằng `make-icons.mjs` chứ không dán bốn
tệp PNG vào: PNG là nhị phân, `git diff` không đọc được, và ba tháng nữa không ai biết nó vẽ bằng
gì. Sửa icon = sửa hằng số rồi chạy lại, **đừng sửa tay tệp PNG**.

**⑸ Tệp ghép cặp RIÊNG, cổng RIÊNG, giao thức RIÊNG** (`udin-optic.bridge`). Dùng chung với
Scouter thì mọi lượt gọi không nêu đích trả `TARGET_AMBIGUOUS`; khai lệch tên hai đầu thì "im
lặng" — `hnx-fetch` mất một buổi vì đúng chuyện đó ngày 08/09.

**⑹ Gói TỰ KHAI TÊN MÌNH ở lớp nối dây, không ở tệp chép.** `scouter-seed-core.mjs` gõ cứng
`"scouter-seed-v0.1"` vào `session.hello` và `system.ping`, nên `background.js` **đè** hai handler
đó. Đừng sửa tệp chép cho gọn — mất phép so byte trên đúng tệp chứa cái phanh. Khối ⑺ canh cái đè
và canh hai chỗ khai tên phải KHỚP nhau.

**⑻ Ảnh gốc `.webp` KHÔNG BAO GIỜ bị xoá.** Lượt đổi sang JPG chỉ **thêm** tệp. Xoá dữ liệu gốc
là việc phải hỏi Đức (luật gốc), và chính máy chủ Bridge cũng cố ý không có `file.delete` vì đúng
lý do đó. Và đừng tin lời khai của bộ đổi: mỗi tệp ra phải được đọc lại và kiểm **ba byte đầu
`FF D8 FF`** — "xong" mà không kiểm đĩa là một xanh giả.

**⑺ Cái phanh không được đụng.** Công tắc mặc định TẮT, trần 200 lượt mỗi lần bật, chỉ tay Đức
mở lại được. Phím phanh `Ctrl+Shift+U` — **khác Scouter cố ý**: hai extension xin cùng một tổ hợp
thì Chrome chỉ trao cho một, và cái mất phím là cái không còn phanh lúc bảng bên đóng.

## Bản đồ file

Đường dẫn tính từ thư mục chứa file này (`workers/udin-optic/v0.1.0/`).

| File | Vai trò |
|---|---|
| `manifest.json` | **RIÊNG** — quyền hẹp về một trang, phím phanh `Ctrl+Shift+U` |
| `background.js` | **RIÊNG** — lớp nối dây, khai `worker_id: "udin-optic"` |
| `scripts/bridge-core.mjs` | **RIÊNG** — từ vựng 12 lệnh, giao thức `udin-optic.bridge` |
| `sidepanel.html` · `sidepanel.js` · `sidepanel.css` | **RIÊNG** — bảng bên; chỗ Đức sẽ đổi theo usecase |
| `bridge/udin-optic-host.mjs` | **RIÊNG** — vỏ mỏng trên lõi `../../_shared/bridge-host/` |
| `bridge/Chay-may-chu-Udin.cmd` | **RIÊNG** — kéo-thả tệp ghép cặp vào đây là máy chủ chạy |
| `scouter-engine.js` | chép NGUYÊN VĂN từ Scouter — bơm `chrome.debugger` vào hai lõi |
| `scripts/scouter-probes.mjs` | chép NGUYÊN VĂN — bốn phép dò chỉ đọc |
| `scripts/scouter-actions-core.mjs` | chép NGUYÊN VĂN — **hành động GHI**: bấm, gõ như tay người |
| `scripts/scouter-seed-core.mjs` | chép NGUYÊN VĂN — handler + **CÁI PHANH** (trần 200 lượt mỗi lần mở) |
| `scripts/tu-kiem-ghi.mjs` | chép NGUYÊN VĂN — phần PHÁN của đường ghi tự kiểm (`S1`/`S2`) |
| `scripts/scouter-transport-loopback.mjs` | chép NGUYÊN VĂN — dây WebSocket, bắt tay hai chiều |
| `scripts/scouter-journal-core.mjs` | chép NGUYÊN VĂN — sổ công việc |
| `bridge/vung-ghi.mjs` | **RIÊNG** — VÙNG GHI nằm ở đâu. MỘT luật cho **cả hai** bộ khởi động, và một trong hai bộ nằm NGOÀI repo |
| `bridge/file-core.mjs` | chép NGUYÊN VĂN — `file.*` chạy ở máy chủ, không ở extension |
| `scripts/make-icons.mjs` | **RIÊNG** — sinh bộ icon chữ **U**. Icon là MÃ NGUỒN, không phải cục nhị phân mồ côi |
| `scripts/zoom-core.mjs` | chép NGUYÊN VĂN từ Scouter — lõi thuần của hai hàng nút phóng to |
| `scripts/kiem-nhanh.mjs` | chép NGUYÊN VĂN — năm bước *Kiểm tra kết nối* từ trong bảng bên |
| `scripts/do-quyen-zoom.mjs` | **RIÊNG** — phép đo `U0`: `setZoom` có đòi quyền `tabs` không. Chrome sạch, không đụng ghế Đức (`G-95`) |
| `icons/icon-16.png` | biểu tượng, **máy sinh** — đừng sửa tay, chạy lại `make-icons.mjs` |
| `icons/icon-32.png` | biểu tượng, máy sinh |
| `icons/icon-48.png` | biểu tượng, máy sinh |
| `icons/icon-128.png` | biểu tượng, máy sinh |
| `tests/be-mat-hep-smoke.mjs` | **bề mặt hẹp**: từ vựng · quyền · giao thức hai đầu · chín tệp chép |
| `tests/bridge-pairing-path-static.mjs` | bảng bên hiện ĐÚNG đường tệp ghép cặp của gói này |
| `tests/vung-ghi-smoke.mjs` | thứ tự `--root` › `vung-ghi.txt` › `anh-ra` · vùng ghi không được trùm lên tệp ghép cặp · bộ khởi động không được giữ bản riêng của luật |
| `tests/zoom-smoke.mjs` | hai hàng nút phóng to: lõi thuần · ghim tĩnh HTML/CSS · **chạy khối thật trong** `node:vm` |
| `tests/kiem-nhanh-smoke.mjs` | nút *Kiểm tra kết nối*: năm bước · từng câu *“làm gì tiếp”* · `engine` giả **áp đúng chữ ký** |
| `tests/run-all.mjs` | suite của gói; cổng đóng phiên TỰ TÌM tệp này theo hình dạng |
| `CHUOI-VIEC.md` | **việc kế tiếp là gì** — chuỗi `U0..U5` (UI) và đường ranh Udin↔Scouter |
| `STATUS.md` | trạng thái một trang — máy đọc, `DASHBOARD` lấy số từ đây |
| `PHIEN.md` | **cửa vào MỘT FILE** cho phiên sau. Máy sinh, đừng gõ tay (`rule-compile --sinh`) |
| `AGENTS.md` | file này — luật riêng của gói |
| `README.md` | đường cài đặt cho người ngoài: ba lệnh, rồi một lượt chạy |
| `HANDOFF.md` | nhật ký gói. Ghi thêm ở CUỐI, trần một mục 2.600 byte |
| `../tu-dong/*.mjs` | **năm chặng việc** W1..W4 + e2e. Script Node gọi Bridge từ dòng lệnh |
| `../tu-dong/thu-muc-du-an.mjs` | tên project → thư mục ra. **Từ chối tên xấu kèm lý do, KHÔNG tự sửa lén**. Đức chốt 15/09 |
| `../tu-dong/doi-sang-jpg.mjs` | đổi ảnh vừa tải sang **JPG** (chặng cuối của E2E). Đức chốt 15/09 |
| `../tu-dong/doi-sang-jpg.ps1` | bộ đổi thật, chạy bằng **WIC của Windows** — không thêm dependency nào |
| `tests/tai-len-smoke.mjs` | Ghim phần MÁY CHỦ của `scout.upload`: ghép đường dẫn, **ghi đè** giá trị người gọi tự điền, tệp phải có thật. Phần LÕI GHI ghim ở gói `duc-scouter` — tệp ở đó, và ghim chéo thì đột biến mổ bản gốc mà phép ghim đọc bản chép |
| `evidence/2026-09-17-vong-tham-chieu-tron-ven.md` **(mới 17/09)** | **Trang bằng chứng cho `last_verified`** trong `STATUS.md`. Viết cho ĐỨC mở ra kiểm bằng tay, không viết cho máy: đường thư mục ảnh ra, bốn tên tệp, hai mã `data-image-id`, và câu Udin tự viết ở `W4`. Nó khai cả **PHẠM VI** — thứ nó KHÔNG chứng minh — vì một trang bằng chứng không nói giới hạn thì sẽ bị trích cho những việc nó chưa từng đo |
| `docs/adr/0001-duc-ky-udin-v1.md` **(mới 17/09)** | **Chữ ký `Udin v1` của Đức.** Nói ba điều và chỉ ba: gói làm được gì (mỗi dòng có một lượt chạy thật đứng sau) · **KHÔNG hứa gì** · cái phanh giữ nguyên, không nới một chốt nào cho lượt ký. Nó **không** nâng `T7` — vòng tự cải tiến vẫn `PARTIAL`, đó là việc của Scouter và phụ thuộc `R2` |
| `tests/huong-dan-smoke.mjs` **(mới 17/09)** | Ghim thẻ **Hướng dẫn** của bảng bên. Chốt: hướng dẫn **không được là chữ đứng một mình** — mỗi dòng việc mang `data-lenh`, và phép ghim đối chiếu tập ấy với các tệp CHẠY ĐƯỢC thật trong `tu-dong/` theo **cả hai chiều**. Thêm lệnh mà quên viết → đỏ; hướng dẫn trỏ vào lệnh không tồn tại → cũng đỏ. Kèm ba chốt nữa: dòng việc phải nói ra NGHĨA (tên tệp thì Đức đọc không ra việc) · chỉ được có MỘT bản hướng dẫn · khối GIỚI HẠN phải đứng ngang hàng với khối năng lực |
| `../tu-dong/chon-ghe.mjs` · `tests/ten-ghe-smoke.mjs` **(mới 17/09)** | **Tách ghế khi mở nhiều cửa sổ.** Đức mở hai cửa sổ cùng cắm Udin và nói trước cái sắp hỏng: trùng tên gọi. Phép kiểm trùng **phải đứng ở phía gọi**, không ở bảng bên — `G-96` đo được là extension chỉ TRẢ LỜI, nó không hỏi được máy chủ *"còn ghế nào mang tên này"*. Lệnh in ra nhãn · Profile ID · dòng `UDIN_GHE=`, và **đánh dấu CẢ HAI** ghế trùng tên (đánh dấu một cái thì người đọc tưởng cái kia là cái đúng, mà gọi tên ấy không trúng cái nào). Ghế **chưa đặt tên thì KHÔNG tính là trùng** — chưa ai gọi chúng bằng tên nên chưa hỏng gì. Bảng bên thêm nút **Tên riêng theo Profile ID**; nó chỉ ĐIỀN vào ô, không tự lưu, vì lưu tên là **cắt dây nối**. Công thức tên viết ở HAI nơi (Node và trang extension, không import được của nhau) — khối ⓓ của phép ghim **chạy thẳng bản trong `sidepanel.js`** để buộc hai bên khớp |
| `bridge/udin-optic-host.mjs` **(đổi 16/09)** | Máy chủ nay có **móc sửa tham số trước khi chuyển tiếp**, và nó chỉ chạm `scout.upload`: ghép `path` tương đối vào vùng ghi bằng `trongGoc`, **GHI ĐÈ** `path_tuyet_doi` người gọi tự điền, và bắt tệp **phải có thật** (Chrome không canh chỗ đó — đo 16/09) |
| `../tu-dong/chon-che-do.mjs` | **`W5`** — chọn chế độ *Agent* / *Manual Gen*. Chốt là **VỊ TRÍ** nút đang mang `.active`, **không** phải số nút mang nó: con số ấy bằng 1 ở cả lượt đúng lẫn lượt hỏng. Xin đúng chế độ đang bật thì **không bấm lần nào** |
| `../tu-dong/them-khung.mjs` | **`W6`** — thêm một KHUNG vào canvas qua menu *Add to canvas*. Đọc khối đầu file trước: tiền đề cũ của `W6` **sai**, và ba mục cần tệp bị **từ chối theo rủi ro** |
| ~~`../tu-dong/vong-style.mjs`~~ **XOÁ 17/09** | Đức chốt xoá. Nó làm đúng việc `vong-tham-chieu.mjs` làm, nhưng đính kèm bằng `scout.upload --mo-bang` — tức **vẫn còn một lối bật hộp thoại `Open` lên màn hình Đức**, và không có `@1` / `@2`. Giữ hai lệnh chạy vòng nghĩa là một ngày nào đó có người chạy nhầm bản cũ. Bản mới làm được mọi thứ bản cũ làm và không còn cú Cancel nào |
| **NĂM đường đưa ảnh vào Udin** (Đức + máy đo 16/09) | ⓪ **KHÔNG CẦN ĐƯỜNG NÀO: ảnh Udin tự sinh ra TỰ VÀO CANVAS.** Đo thật: một lượt sinh 4 ảnh thì canvas tăng đúng 4. Ảnh trên canvas mang URL `persistent/…/img/<mốc>-<mã>.webp`, **KHÁC hẳn** ảnh trong khung chat (`ephemeral/…/generated/batch-…webp`) — khớp 0/8 theo tên, nên **đừng đối chiếu bằng tên**: chụp tập `src` của canvas TRƯỚC và SAU rồi lấy phần chênh. Hệ quả: vòng *“lấy ảnh Udin đã tạo, xin style khác”* của Đức **không cần tải lên lần nào**; tải lên chỉ cần khi đưa ảnh từ NGOÀI vào | ⑴ nút `+` → `Image`: **thêm được NHIỀU ảnh một lượt**, ảnh vào thẳng **CANVAS**; ảnh nào được **chọn** thì thành một *reference* trong prompt — tức mô hình của trang là *chọn trên canvas → thành tham chiếu*, không phải *đính kèm vào ô chữ*. Đây là đường `scout.upload` đang dùng, và nó **bật hộp thoại `Open` của Windows**. ⑵ **kéo-thả từ Explorer vào canvas: ĐƯỢC**, và không dựng hộp thoại nào — kéo tệp là gửi **đường dẫn tệp** chứ không phải một link ảnh. ⑶ **dán từ clipboard hệ điều hành: KHÔNG** — Udin bỏ qua cả tệp lẫn ảnh bitmap. ⑷ **copy–paste trong NỘI BỘ canvas: ĐƯỢC** — tính năng riêng của ứng dụng, không phải đường nhập tệp. |
| **`scout.tha` — đường đưa ảnh NGOÀI vào, KHÔNG hộp thoại** (mới 16/09 khuya) | Kéo-thả một tệp vào một phần tử, đúng thao tác Đức lôi ảnh từ Explorer vào canvas. Thay `scout.upload` cho mọi lượt đưa ảnh từ ngoài: `scout.upload` bật hộp thoại `Open` lên màn hình Đức mỗi lượt (đo 16/09, Đức gửi ảnh chụp), đường này **không đi qua hộp thoại nào cả**. Cùng cổng vùng ghi ở máy chủ — `path` tương đối, máy chủ ghép thành tuyệt đối, tệp phải có thật. **Ảnh của Đức nằm ngoài vùng ghi thì phải CHÉP vào trước** (ví dụ `udin-optic/vao/`), bản gốc không bị đụng. **CHẠY THẬT 17/09:** canvas `17 → 18`, **0 hộp thoại**. Thả vào **`#root`** — Udin không có lớp canvas riêng nào đọc được (`.canvas-viewport` · `.canvas-container` · `main` đều khớp 0). **Sửa tệp máy chủ thì phải KHỞI ĐỘNG LẠI TIẾN TRÌNH máy chủ**, nạp lại extension không đủ — từ 17/09 làm bằng MỘT lệnh: chạy `START-BRIDGE_Udin-Optic.ps1 -KhoiDongLai` trong thư mục Bridge của gói. Không có cờ ấy thì bộ khởi động **tự thoát** khi cổng đang có người nghe, và máy chủ cũ vẫn chạy mã cũ — triệu chứng là một lệnh mới trả `INVALID_PARAMS`, đọc không ra nguyên nhân |
| `../tu-dong/vong-tham-chieu.mjs` **(mới 17/09)** | **MỘT lệnh chạy trọn việc thật, có `@1` / `@2`.** Làm cả hai ca Đức nêu: ảnh Udin tự sinh (đã sẵn trên canvas, dùng `canvas:<mẩu src>`) và ảnh của Đức từ ngoài (thả vào bằng `scout.tha`). **Danh tính ảnh vừa thả học bằng PHẦN CHÊNH của canvas, không bằng tên tệp** — canvas giữ một bản khác, khớp 0/8 theo tên. Một lượt thả mà canvas mọc thêm ≠ 1 ảnh thì **TỪ CHỐI**, không đoán. Thứ tự `@N` theo thứ tự `--anh`, và **đọc ngược lại từ huy hiệu trên trang**. Bảy chặng `W1 → NGUỒN → CHỌN → W2 → W3 → JPG → W4`; `W4` (đọc câu Udin viết) đứng CUỐI, sau lượt ghi đĩa — nên một chặng đọc đỏ không bao giờ làm mất ảnh đã tải về |
| `../tu-dong/chon-tham-chieu.mjs` **(mới 16/09 · danh tính đổi 17/09)** | **Chọn ảnh tham chiếu THEO THỨ TỰ**, để prompt gọi được `@1` / `@2`. Chốt của cả file: **có huy hiệu ≠ đúng số** — nó **đọc lại con số** trang gán cho từng ảnh, lệch một chỗ là ném. Đức nêu đúng cái giá: chọn nhầm thứ tự thì Udin vẫn chạy, vẫn ra ảnh, chỉ là lấy style của B áp lên A — không một dòng đỏ nào. **Danh tính là `data-image-id`** (Đức chốt 17/09, [ADR-0009](../../duc-scouter/v0.1.0/docs/adr/0009-doc-duoc-data-image-id.md)): `src` bị lõi đọc cắt ở 200 ký tự, và Udin mã hoá lại ảnh thả vào thành `data:…base64` nên **hai ảnh khác hẳn nhau cho ra hai chuỗi y hệt** — đo thật canvas mọc 18 → 20 mà phép so thấy 0 ảnh mới. `src` nay chỉ dùng để **tìm hộ** (`canvas:<mẩu>`), và phép tìm ấy để **Chrome** khớp CSS chứ không so chuỗi trong Node. Canvas là mặt phẳng kéo được nên *có trong DOM* còn xa mới là *bấm được*: đo thật **6/12** ảnh bấm được, số còn lại `no_hit_test` |
| `../tu-dong/goi-bridge.mjs` | vỏ năm dòng khai danh tính gói; thân ở `../../_shared/goi-bridge/` |
| `../tu-dong/tests/*.mjs` | phép ghim của tầng chạy việc — `run-all.mjs` tự quét cả thư mục, **đừng gõ số ở đây** |
| `../../_shared/bridge-host/` | **LÕI DÙNG CHUNG** — máy chủ Bridge. Luật của vùng: `workers/_shared/AGENTS.md` |
| `../../_shared/goi-bridge/` | **LÕI DÙNG CHUNG** — bên gọi Bridge từ dòng lệnh |

## Chạy

```
node workers/_shared/bridge-host/tao-tep-ghep-cap.mjs --goi udin-optic
node workers/udin-optic/v0.1.0/bridge/udin-optic-host.mjs --pairing <tệp.json> --root <thư-mục-ghi>
UDIN_GHE=<instance_id> node workers/udin-optic/tu-dong/e2e.mjs "một prompt CHƯA DÙNG BAO GIỜ"
```

Mỗi lượt chạy thật tiêu credit của Đức, nên **prompt phải mới mỗi lượt** — luật repo, không có
ngoại lệ.
