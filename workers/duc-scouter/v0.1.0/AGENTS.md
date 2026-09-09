# AGENTS — Duc Scouter

CORE của gói này. Đọc `AGENTS.md` gốc repo trước, rồi file này, rồi `HANDOFF.md` (cuối file =
mới nhất). Luật nào không ghi khác ở đây thì áp y như `AGENTS.md` gốc repo.

Khoá của gói: **`workers/duc-scouter`**. Nhận bằng
`node scripts/claim.mjs --take workers/duc-scouter --as <phiên> --task "..."`.

## Scouter là gì, và nó khác ba worker kia chỗ nào

Ba gói `duc-auto-*` tự động hoá **một nhà cung cấp** theo một workbook XLSX. Scouter thì không:
nó là **bộ khung tương tác tự hoàn thiện** — nó dò một trang, báo cáo cho AI qua Bridge, rồi
AI viết code mới xuống đĩa và bảo nó nạp lại chính nó. Vì thế tên nó không mang tiền tố
`duc-auto-`; đó là chủ ý, không phải quên ([ADR-0013](../../../docs/adr/0007-scouter.md)).

Ba tầng của Scouter ([ADR-0009](../../../docs/adr/0007-scouter.md) mục ⑵):

| Tầng | Có mấy bản | Chứa gì |
|---|---|---|
| **Seed** | **đúng một, dùng chung** | năng lực đúng với mọi trang — **gói này** |
| **Adapter** | mỗi URL một cái | selector · thứ tự thao tác · dấu hiệu "xong" — **chưa có cái nào** |
| **Ghi chép** | mỗi lượt một cái | nguyên liệu để sinh ra adapter |

## Luật vàng riêng của gói

1. **Selector KHÔNG BAO GIỜ được gõ vào seed.** Thấy mình đang gõ một selector vào một file
   trong gói này thì dừng lại — đó là chỗ ranh giới seed/adapter chết. Năng lực vào seed, hiểu
   biết về một trang cụ thể vào adapter.
2. **Đừng clone seed rồi sửa bản clone.** [ADR-0006](../../../docs/adr/0001-ranh-gioi-bo-khung.md)
   đã ghi cái giá: năm bản trôi khác nhau, và lần "đồng bộ ngược" không bao giờ xảy ra. Adapter
   nào sửa ra thứ **không riêng của trang nào** thì thứ đó phải được đưa lên seed.
3. **ĐƯỢC ghi ghi chép xuống đĩa** — Đức chốt 07/09,
   [ADR-0016](../../../docs/adr/0007-scouter.md), gỡ điều chặn của
   ADR-0010. Lý do của Đức phân định phạm vi chứ không chỉ cho phép: Scouter **không phải một
   extension chạy sản xuất**, nó là bộ đồ nghề dựng ra extension khác. Ba giới hạn giữ nguyên,
   và cả ba đều là luật có sẵn: không ghi vào `evidence/` · `pilot-*/` · `Batch-*/` (đó là bằng
   chứng vận hành, không phải đồ làm việc) · không bao giờ để token / mật khẩu / tệp ghép cặp
   vào repo · **chạy trên trang thật vẫn phải hỏi Đức** — ADR-0016 gỡ chỗ chặn về *ghi*, không
   gỡ chỗ chặn về *chạy ở đâu*.
4. **Cấm chạy trên trang thật** khi chưa hỏi Đức (`AGENTS.md` gốc mục 3, *Phải hỏi Đức trước*). Trang thử tự tạo thì được.
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
   nó. Trần 200 lượt mỗi lần mở khoá (Đức nâng từ 50 ngày 08/09, ADR-0005), gõ cứng trong mã. Hai chỗ đừng đảo lại vì cả hai đều
   trông thừa cho tới lúc cần: **hỏng thì ĐÓNG** (đọc không ra công tắc ≠ được bấm — khác hẳn
   trần nạp lại nằm ngay bên cạnh, cái đó hỏng thì mở) và **trừ trước, bấm sau** (lượt bấm
   hỏng vẫn tốn ngân sách, nếu không thì vòng lặp hỏng quay mãi). Mười hai con `P1..P12` canh
   khối này. Lý do đầy đủ: [ADR-0001](docs/adr/0001-phanh-cho-duong-ghi-va-quyen-alarms.md).
10. Mỗi fix một phép ghim. Sửa `.js` → nhắc Đức nạp lại extension.

## Bản đồ file

> **Chỉ khai thứ CẤP CAO, mỗi hàng MỘT mệnh đề** — đó là thứ luật vàng 4 đòi và thứ cổng đọc
> (`session-check.mjs` so **tên cấp cao**). Rút gọn 09/09,
> [ADR-0031](../../../docs/adr/0031-tran-do-bang-ky-tu.md) ⑷.
>
> **Một luật chung, thay cho bảy lần nhắc lại trong bảng:** mỗi lõi `.mjs` mở đầu bằng một **khối
> bất biến** — `observer-probes`, `scouter-actions-core`, `scouter-transport-loopback`,
> `scouter-journal-core`, `bridge/file-core`, `mutation-runner`. **Đọc khối đó trước khi sửa một ký
> tự trong file đó.** Chuyện dài của từng file ở chính file đó, không ở đây.

| File / thư mục | Vai trò |
|---|---|
| `manifest.json` | MV3; service worker `scouter-background.js`, kiểu `module` |
| `scouter-background.js` | **Dây thật**: bơm `chrome` vào ba lõi, lưới đỡ `chrome.alarms` (S-02), mở bảng bên khi bấm icon, và giữ **PHANH KHẨN `Ctrl+Shift+X`** — phanh phải với tới được cả khi bảng đã đóng. **Cố ý mỏng, cố ý không có phép ghim riêng**, và **không được có nhánh chết** (khối ⑯ từ chối mọi `if (false)`) — thêm một dòng logic vào đây là thêm một dòng không ai canh |
| `observer-engine.js` | Gắn/tháo `chrome.debugger`; gọi lõi phép dò **và lõi hành động** |
| `sidepanel.html` · `.css` · `.js` | **Bảng bên**, ba tab, mặc định *Tiến độ* ([ADR-0002](docs/adr/0002-vo-giao-dien-la-bang-ben-khong-phai-popup.md)). Giữ **công tắc đường ghi — chỗ DUY NHẤT bật được nó** — và chọn tệp ghép cặp. **Không con số nào gõ tay:** đếm từ `capabilities()` và sổ công việc |
| `scripts/scouter-journal-core.mjs` | **SỔ CÔNG VIỆC** — nguồn sự thật duy nhất của khối tiến độ; đứng NGOÀI đường đi của phong bì. Một cuốn sổ sai tệ hơn không có sổ, vì nó sai một cách có thẩm quyền |
| `scripts/observer-probes.mjs` | **Bảy phép dò read-only**, thuần logic. Ranh giới đọc / điều khiển nằm ở danh sách CDP: **`Page.captureScreenshot` CÓ, `Page.navigate` KHÔNG** |
| `scripts/scouter-bridge-core.mjs` | Giao thức + **từ vựng method cố định** + điều phối. Không biết `chrome` là gì |
| `scripts/scouter-seed-core.mjs` | Bốn khả năng nối vào từ vựng: quan sát · báo cáo · tự nạp lại · **ba hành động ghi (S-01)** |
| `scripts/scouter-actions-core.mjs` | **Đường GHI** — bấm và gõ như tay người. Danh sách CDP riêng, bốn chốt riêng |
| `scripts/scouter-transport-loopback.mjs` | Dây WebSocket tới `127.0.0.1`, **bắt tay hai chiều** |
| `bridge/file-core.mjs` | **Tầng ba của [ADR-0009](../../../docs/adr/0007-scouter.md)** — ghi ghi chép xuống đĩa. **Chỗ nguy hiểm nhất của cả gói.** Cố ý **KHÔNG có đường xoá/đổi tên**, và phép ghim cưỡng chế điều đó |
| `bridge/scouter-bridge-host.mjs` | **HOST RIÊNG, MỎNG** — Bridge của Scouter là một **lớp đứng trước**, không phải bản thứ tư ([ADR-0004](docs/adr/0004-bridge-rieng-cho-scouter-la-mot-lop-dung-truoc.md)): khai tên giao thức · cắm nhóm `file.*` · canh vùng ghi. **Đừng chép lõi vào đây** — ba gói `duc-auto-*` đã chép và ba bản đã lệch nhau |
| `../../_shared/bridge-host/` | **LÕI DÙNG CHUNG** — khung WebSocket, cửa HTTP, bắt tay hai chiều, định tuyến nhiều hồ sơ. Luật của vùng: `workers/_shared/AGENTS.md` |
| `tests/` | Phép ghim của gói. **Mỗi phép tự khai ở docblock đầu file nó** — tra bằng `grep -l "S-05" tests/*.mjs`. Chạy hết: `tests/run-all.mjs` (gốc repo chỉ gọi file này) |
| `scripts/mutation-runner.mjs` · `*-mutation-check.mjs` · `*-probe.mjs` · `scouter-bridge-live-check.mjs` | Bộ máy **đột biến kiểm** và các **phép đo** (① tin cậy cú bấm · ② hành động có thật · nối thử máy chủ Bridge THẬT). `mutation-runner` có **hai lớp chống nhiễm độc mã nguồn**: khoá file và nhật ký hồi phục trên đĩa — bắt tín hiệu KHÔNG đủ, Windows không có tín hiệu thật |
| `icons/` · `scripts/make-icons.mjs` | Icon extension, sinh bằng script |
| `docs/PROMPT-thiet-ke-bang-ben.md` | Câu Đức dán cho GPT web. Chứa bản khai **năng lực thật** — Scouter đổi thì **sửa mục đó trước khi dán** |
| `docs/TRIALS.md` | Sổ các trang đã thử: trang nào · thử gì · kết quả |
| `docs/adr/` | Quyết định của Đức riêng cho gói này |
| `../pilots/<tên>/` | **PILOT nằm NGOÀI thư mục phiên bản, cố ý** ([ADR-0020](../../../docs/adr/0007-scouter.md)). **Selector không bao giờ được gõ vào seed** |
| `ROADMAP.md` · `STATUS.md` · `HANDOFF.md` · `HANDOFF-ARCHIVE-01.md` · `BACKLOG.md` | Thứ tự đi · trạng thái một trang cho Đức (frontmatter sinh `DASHBOARD.md`) · nhật ký (**thêm ở cuối**) · đuôi đã cắt, chỉ đọc · việc còn mở `S-xx` |

Thêm file/thư mục mới **cấp cao** → thêm 1 dòng. Không khai = không tồn tại. **Một mệnh đề thôi.**

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
