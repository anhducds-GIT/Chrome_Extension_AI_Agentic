# AGENTS — Duc Scouter

CORE của gói này. Đọc `AGENTS.md` gốc repo trước, rồi file này, rồi `HANDOFF.md` (cuối file =
mới nhất). Luật nào không ghi khác ở đây thì áp y như `AGENTS.md` gốc repo.

Khoá của gói: **`workers/duc-scouter`**. Nhận bằng
`node scripts/claim.mjs --take workers/duc-scouter --as <phiên> --task "..."`.

## Scouter là gì, và nó khác ba worker kia chỗ nào

Ba gói `duc-auto-*` tự động hoá **một nhà cung cấp** theo một workbook XLSX. Scouter thì không:
nó là **bộ khung tương tác tự hoàn thiện** — nó dò một trang, báo cáo cho AI qua Bridge, rồi
AI viết code mới xuống đĩa và bảo nó nạp lại chính nó. Vì thế tên nó không mang tiền tố
`duc-auto-`; đó là chủ ý, không phải quên ([ADR-0013](../../../docs/adr/0013-scouter-ra-nha-rieng-co-khoa-rieng.md)).

Ba tầng của Scouter ([ADR-0009](../../../docs/adr/0009-scouter-thay-observer-cua-tuong-tac.md) mục ⑵):

| Tầng | Có mấy bản | Chứa gì |
|---|---|---|
| **Seed** | **đúng một, dùng chung** | năng lực đúng với mọi trang — **gói này** |
| **Adapter** | mỗi URL một cái | selector · thứ tự thao tác · dấu hiệu "xong" — **chưa có cái nào** |
| **Ghi chép** | mỗi lượt một cái | nguyên liệu để sinh ra adapter |

## Luật vàng riêng của gói

1. **Selector KHÔNG BAO GIỜ được gõ vào seed.** Thấy mình đang gõ một selector vào một file
   trong gói này thì dừng lại — đó là chỗ ranh giới seed/adapter chết. Năng lực vào seed, hiểu
   biết về một trang cụ thể vào adapter.
2. **Đừng clone seed rồi sửa bản clone.** [ADR-0006](../../../docs/adr/0006-goi-assistant-phat-hanh-tu-bo-khung.md)
   đã ghi cái giá: năm bản trôi khác nhau, và lần "đồng bộ ngược" không bao giờ xảy ra. Adapter
   nào sửa ra thứ **không riêng của trang nào** thì thứ đó phải được đưa lên seed.
3. **ĐƯỢC ghi ghi chép xuống đĩa** — Đức chốt 07/09,
   [ADR-0016](../../../docs/adr/0016-scouter-duoc-ghi-ghi-chep-xuong-dia.md), gỡ điều chặn của
   ADR-0010. Lý do của Đức phân định phạm vi chứ không chỉ cho phép: Scouter **không phải một
   extension chạy sản xuất**, nó là bộ đồ nghề dựng ra extension khác. Ba giới hạn giữ nguyên,
   và cả ba đều là luật có sẵn: không ghi vào `evidence/` · `pilot-*/` · `Batch-*/` (đó là bằng
   chứng vận hành, không phải đồ làm việc) · không bao giờ để token / mật khẩu / tệp ghép cặp
   vào repo · **chạy trên trang thật vẫn phải hỏi Đức** — ADR-0016 gỡ chỗ chặn về *ghi*, không
   gỡ chỗ chặn về *chạy ở đâu*.
4. **Cấm chạy trên trang thật** khi chưa hỏi Đức (`AGENTS.md` gốc mục 2). Trang thử tự tạo thì được.
5. **Từ vựng cố định.** Cửa Bridge nhận một bộ tên method đóng, không bao giờ nhận biểu thức tự
   do từ ngoài dây. Thêm một method là **đổi luật an toàn** → hỏi Đức.
6. **Quyền đã duyệt là TRẦN, không phải sàn.** ADR-0009 duyệt tới `<all_urls>` · `debugger` ·
   `scripting` · `tabs` · `storage` · nối `127.0.0.1`; Đức duyệt thêm `alarms` và `sidePanel`
   ngày 07/09 ([ADR-0001](docs/adr/0001-phanh-cho-duong-ghi-va-quyen-alarms.md) ·
   [ADR-0002](docs/adr/0002-vo-giao-dien-la-bang-ben-khong-phai-popup.md)). `manifest.json`
   hôm nay khai **`debugger` · `storage` · `alarms` · `sidePanel` · `http://127.0.0.1/*`** —
   đúng thứ đang dùng. **`downloads` thì KHÔNG**: Đức chốt 07/09 rằng file đi qua Bridge, không
   qua Chrome Downloads. Khai thêm khi thật sự dùng tới, đừng khai trước. Xin ra ngoài danh sách trên thì phải
   hỏi Đức. Con `Q1` `Q2` canh đúng dòng đó trong manifest.
7. **Đọc và GHI đi qua hai lõi khác nhau, và đừng gộp chúng.** `scripts/observer-probes.mjs`
   chứng minh được là read-only vì kênh ghi **không có mặt trong file đó** — không phải vì ai
   hứa. Muốn Scouter làm được một việc mới có tính GHI thì thêm vào `scouter-actions-core.mjs`
   với danh sách method riêng của nó. Thêm `Input.*` vào lõi đọc là làm yếu một lớp bảo vệ
   đang có (luật vàng 3 của repo), và hai con `M1` `M2` sẽ ĐỎ đúng lúc đó.
8. **Toạ độ không bao giờ nhận từ ngoài dây.** Mọi lượt bấm suy toạ độ từ hộp của đúng phần tử
   đã khớp, và selector phải khớp **đúng một**. Đây là chốt đắt nhất của gói; con `H4` và `H5`
   canh nó.
9. **Đường ghi ĐÓNG MẶC ĐỊNH, và cái phanh chỉ mở được bằng tay người.** Công tắc chế độ phát
   triển nằm trong bảng bên, và **không method Bridge nào bật được nó** — đó là cả ý nghĩa của
   nó. Trần 50 lượt mỗi lần mở khoá, gõ cứng trong mã. Hai chỗ đừng đảo lại vì cả hai đều
   trông thừa cho tới lúc cần: **hỏng thì ĐÓNG** (đọc không ra công tắc ≠ được bấm — khác hẳn
   trần nạp lại nằm ngay bên cạnh, cái đó hỏng thì mở) và **trừ trước, bấm sau** (lượt bấm
   hỏng vẫn tốn ngân sách, nếu không thì vòng lặp hỏng quay mãi). Mười hai con `P1..P12` canh
   khối này. Lý do đầy đủ: [ADR-0001](docs/adr/0001-phanh-cho-duong-ghi-va-quyen-alarms.md).
10. Mỗi fix một phép ghim. Sửa `.js` → nhắc Đức nạp lại extension.

## Bản đồ file

| File / thư mục | Vai trò |
|---|---|
| `manifest.json` | MV3. Service worker là `scouter-background.js`, kiểu `module` |
| `icons/` · `scripts/make-icons.mjs` | Icon extension: chữ **S tối trên nền vàng**. Bốn file PNG là **máy sinh** — sửa màu ở hai hằng số đầu bộ sinh rồi chạy `node scripts/make-icons.mjs`, đừng sửa PNG bằng tay. Chrome KHÔNG nhận SVG làm icon, đừng đổi. `--preview` in hình ra màn hình để xem trước |
| `scouter-background.js` | **Dây thật**: bơm `chrome` vào ba lõi, giữ lưới đỡ `chrome.alarms` (S-02), mở bảng bên khi bấm icon (ADR-0002), và giữ **PHANH KHẨN** `Ctrl+Shift+X` — từ khi có `<all_urls>` thì cái phanh phải với tới được cả khi bảng đã đóng. **Không được có nhánh chết** — khối ⑯ của phép ghim từ chối mọi `if (false)` trong file này. CỐ Ý mỏng và cố ý không có phép ghim riêng — thêm một dòng logic vào đây là thêm một dòng không ai canh |
| `observer-engine.js` | Gắn/tháo `chrome.debugger`, gọi lõi phép dò **và lõi hành động**. Tám con `W1..W4` + `A1..A5` canh đúng file này |
| `sidepanel.html` · `sidepanel.css` · `sidepanel.js` | **Bảng bên** (đổi từ popup 07/09, [ADR-0002](docs/adr/0002-vo-giao-dien-la-bang-ben-khong-phai-popup.md)). Dựng lại 07/09 theo bản vẽ v1 của GPT web: **ba tab** (Tiến độ · Hoạt động · Hệ thống), tab mặc định là **Tiến độ**. Giữ hai vai gốc — công tắc đường ghi (chỗ DUY NHẤT bật được nó) và chọn tệp ghép cặp. **Không con số nào gõ tay**: số lệnh đếm từ `capabilities()`, tiến độ tính từ sổ công việc |
| `scripts/scouter-journal-core.mjs` | **SỔ CÔNG VIỆC** — nguồn sự thật duy nhất của khối "tiến độ thuần hoá" trên bảng bên. Bọc `dispatch`, đứng NGOÀI đường đi của phong bì. Ba bất biến ghi ở đầu file; **đọc chúng trước khi sửa một ký tự** — một cuốn sổ sai tệ hơn không có sổ, vì nó sai một cách có thẩm quyền |
| `tests/scouter-journal-smoke.mjs` | Ghim sổ công việc, 9 khối. Khối ⑦ đo **bản ghi thô trong kho**, không đo qua `doc()` — đo qua `doc()` thì không phân biệt được "chặn lúc ghi" với "chặn lúc đọc", và đã để một con đột biến sống sót |
| `tests/sidepanel-dom-smoke.mjs` | Ghim bảng bên ở ba kiểu hỏng **IM LẶNG**: JS gọi `#id` mà HTML không có · `<script>` nội tuyến (MV3 chặn, trang vẫn tải) · gán `innerHTML`. **Bỏ chú thích trước khi đo** ở cả hai file — không bỏ thì nó báo oan, và tệ hơn là gật đầu cho một `id` chỉ tồn tại trong chú thích |
| `scripts/observer-probes.mjs` | **Bảy phép dò read-only**, thuần logic. Ba chốt bất biến ghi ở đầu file. Ba cái mở thêm 07/09 theo hồ sơ năng lực: **`a11y.tree`** (đọc theo vai trò+tên — thuốc cho luật vàng 1) · **`dom.snapshot`** (cả trang MỘT lượt) · **`page.shot`** (ảnh, mặc định jpeg vì PNG hay vượt phong bì). Danh sách CDP nới từ 5 → 9 — **`Page.captureScreenshot` CÓ, `Page.navigate` KHÔNG**, và khoảng cách đó là ranh giới đọc/điều-khiển |
| `scripts/scouter-bridge-core.mjs` | Giao thức + **từ vựng method cố định** + bộ điều phối. Không biết `chrome` là gì |
| `scripts/scouter-seed-core.mjs` | Ba khả năng nối vào từ vựng: quan sát · báo cáo · tự nạp lại · **và ba hành động ghi (S-01)** |
| `scripts/scouter-actions-core.mjs` | **Đường GHI**: bấm và gõ như tay người. Danh sách method CDP RIÊNG, bốn chốt riêng. Đọc khối đầu file trước khi sửa |
| `scripts/scouter-transport-loopback.mjs` | Dây WebSocket tới `127.0.0.1`, **bắt tay hai chiều**. Đọc khối đầu file trước khi sửa |
| `scripts/mutation-runner.mjs` | Bộ máy đột biến kiểm, dùng chung. Các cái bẫy đã trả giá ghi ở đầu file. **Hai lớp chống nhiễm độc mã nguồn (07/09)**: một **khóa file** chống hai lượt chạy cùng lúc (tự nhận lại khi chủ cũ đã chết), và một **nhật ký hồi phục trên đĩa** cứu lượt bị chém ngang. Bắt tín hiệu KHÔNG đủ — Windows không có tín hiệu thật, đã đo |
| `scripts/observer-mutation-check.mjs` | 14 con đột biến cho bốn phép dò |
| `scripts/scouter-mutation-check.mjs` | 93 con đột biến: khung seed, đường ghi, cái phanh, bề mặt quyền, lệnh gọi mạng (`F1..F6`) **vùng ghi** (`G1..G3`, `H1..H3`) **sổ công việc** (`J1..J10`) và **lõi dùng chung** (`X1..X4`, trong đó `X3` canh cái bắt tay hai chiều). Con số này mục theo code — đếm lại bằng chính bộ đo, đừng tin dòng này |
| `scripts/scouter-input-trust-probe.mjs` | **Phép đo ①** (06/09, ĐẠT): cú bấm qua `chrome.debugger` có `isTrusted: true` |
| `scripts/scouter-action-reality-probe.mjs` | **Phép đo ②** (07/09, ĐẠT 11/11 trên Chrome 152): nạp CHÍNH lõi hành động thật vào một extension thử rồi bấm trên trang tự dựng. Khác ① ở chỗ ① đo *đường đi*, còn cái này đo *code của Scouter*. Mã thoát 2 = phép đo KHÔNG CHẠY được |
| `scripts/scouter-bridge-live-check.mjs` | Nối thử với **máy chủ Bridge THẬT**, không phải bản giả. Mã thoát 2 = không chạy được, khác hẳn "không đạt" |
| `tests/scouter-action-reality-smoke.mjs` | Ghim LUẬT CHẤM của phép đo ②, không cần trình duyệt. 15 ca hỏng, mỗi ca phải đỏ ĐÚNG tiêu chí của nó |
| `tests/scouter-write-gate-smoke.mjs` | Ghim CÁI PHANH (S-05) và bề mặt quyền manifest (S-02). Ghim cả hai chiều — khối ② là chiều "mở khoá thì bấm được thật" |
| `bridge/file-core.mjs` | **Tầng thứ ba của ADR-0009**: ghi ghi chép xuống đĩa. Thuần, không mở cổng, không đọc `argv`. **Chỗ nguy hiểm nhất của cả gói** — đọc khối đầu file trước khi sửa một ký tự. Cố ý KHÔNG có đường xoá/đổi tên, và khối ‑ của phép ghim cưỡng chế điều đó |
| `bridge/scouter-bridge-host.mjs` | **HOST RIÊNG của Scouter, MỎNG** (Đức chốt 07/09, thay ADR-0004). Chỉ làm ba việc: khai tên giao thức `duc-scouter.bridge` · cắm nhóm `file.*` vào móc `methodTaiCho` · canh vùng ghi. Mọi hành vi chung nằm ở lõi `workers/_shared/bridge-host/`. **Đừng chép lõi vào đây** — ba gói `duc-auto-*` đã chép và ba bản đã lệch nhau |
| `../../_shared/bridge-host/` | **LÕI DÙNG CHUNG** — khung WebSocket, cửa HTTP, **bắt tay hai chiều**, định tuyến nhiều hồ sơ. Nhân bản seed sang extension khác thì viết một host mỏng nữa gọi vào đây. Luật của vùng: `workers/_shared/AGENTS.md` |
| `tests/scouter-file-core-smoke.mjs` | Ghim **vùng ghi**: `..`, đường tuyệt đối ba dạng, thư mục anh em trùng tiền tố, và liên kết mềm trỏ ra ngoài. Chạy trên thư mục tạm THẬT, không giả `fs` |
| `tests/scouter-bridge-host-smoke.mjs` | Ghim phần RIÊNG của Scouter: nhóm `file.*` (chạy được **cả khi chưa có extension nào nối**), vùng ghi, hai cổng vào, và cái chặn *vùng ghi không được chứa tệp ghép cặp*. Máy chủ THẬT trên loopback. Hành vi chung của lõi thì ghim ở `_shared/bridge-host/tests/` |
| `docs/PROMPT-thiet-ke-bang-ben.md` | **Câu Đức dán cho GPT web** để brainstorm bố cục bảng bên (07/09). Chứa bản khai **sự thật về năng lực** — Scouter đổi thì **sửa mục đó trước khi dán**, không thì GPT thiết kế cho một giói đồ không tồn tại |
| `../pilots/<tên>/` | **PILOT — ngoài thư mục phiên bản, cố ý** ([ADR-0020](../../../docs/adr/0020-thang-phien-ban-scouter-va-ranh-gioi-seed-pilot.md) mục ⑶a). Pilot không phải một phiên bản của seed; để chung thì lượt nâng phiên bản sau kéo theo cả pilot. Suite của pilot vẫn chạy qua `tests/run-all.mjs` — nó quét theo HÌNH DẠNG `pilots/*/tests/*.mjs`, không gõ cứng tên pilot nào |
| `docs/TRIALS.md` | **Sổ các trang đã thử** — trang nào · thử gì · kết quả · **dạy seed được gì**. Cột cuối là lý do nó tồn tại: nó là đường ray của luật chiều-ngược ở ADR-0009 mục ⑵. Đây là SỔ, không phải hàng rào |
| `tests/seed-purity-smoke.mjs` | Canh **mã CHẠY** của seed không chứa tên trang thật (hằng số · mặc định · nhánh rẽ theo hostname). **Cố ý KHÔNG canh** `tests/` `docs/` `pilots/` — Đức chốt 07/09 *"nhiễm cũng được… trừ khi nó ảnh hưởng quá"*. Bản đầu siết cả `tests/` và đỏ 9 chỗ vô hại; hàng rào hẹp mà sống lâu hơn hàng rào rộng mà bị gỡ |
| `docs/adr/` | Quyết định của Đức riêng cho gói này. ADR đã `Accepted` là bất biến |
| `tests/run-all.mjs` | Chạy hết phép ghim của gói. `package.json` gốc chỉ gọi file này — thêm phép ghim mới **không cần khoá `_root`** |
| `ROADMAP.md` | **Đi tới đâu, đang ở đâu, thứ tự nào** — 25 mục `SEED v0.1` xếp thành bốn bước. Đọc file này TRƯỚC khi hỏi "việc kế là gì". Không chép danh sách 25 mục, chỉ xếp thứ tự |
| `STATUS.md` | Trạng thái vận hành 1 trang (máy đọc frontmatter sinh DASHBOARD) |
| `HANDOFF.md` | Trạng thái + Log (chỉ thêm dòng ở cuối) |
| `BACKLOG.md` | Việc còn mở, đánh số `S-xx` |

## Hai chỗ đã trả giá, đừng làm lại

### ⑴ Trang extension KHÔNG chạy được script nội tuyến

CSP mặc định của MV3 là `script-src 'self'`, và nó chặn hẳn mọi `<script>` có thân ngay trong
HTML — kể cả `type="module"`. Trang lên bình thường, **không lỗi nào hiện ra ngoài**, mã chỉ
đơn giản không bao giờ chạy; triệu chứng nhìn từ ngoài giống hệt "chờ quá hạn". Mất một lượt
chạy vì chỗ này ngày 07/09 khi dựng phép đo ②. Script phải nằm ở **file `.js` riêng**.
(Phép đo ① không vấp vì trang extension của nó không có script nào.)

### ⑵ Ba worker có năm file `bridge-*.js`, và chỉ MỘT file giống hệt cả ba

Chỉ `bridge-pairing-core.js` giống hệt ở cả ba worker.
Quan trọng hơn: **chỉ nhánh ChatGPT bắt tay hai chiều** — máy chủ phải chứng minh nó biết token
trước, rồi extension mới đưa token ra. Gemini và Flow đưa token ngay khi socket mở, tức là đưa
cho bất kỳ tiến trình nào chiếm cổng trước. Seed dùng bản ChatGPT.

**Hệ quả phải biết:** seed này CHỈ nối được với máy chủ bản ChatGPT. Đấu với hai bản host cũ thì
`auth_challenge` bị coi là khung lạ và socket đứt — nhìn ra ngoài giống "Bridge không lên". Đó là
hỏng AN TOÀN, và nó cố ý. Con đột biến `D1` canh đúng chỗ này.
