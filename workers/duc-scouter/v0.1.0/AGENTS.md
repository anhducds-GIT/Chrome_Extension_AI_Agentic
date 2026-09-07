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
3. **Cấm ghi nội dung trang xuống đĩa.** Chính sách che dữ liệu treo từ
   [ADR-0007](../../../docs/adr/0007-observer-la-cua-bang-chung-cho-ai.md), Đức chưa chốt.
4. **Cấm chạy trên trang thật** khi chưa hỏi Đức (`AGENTS.md` gốc mục 2). Trang thử tự tạo thì được.
5. **Từ vựng cố định.** Cửa Bridge nhận một bộ tên method đóng, không bao giờ nhận biểu thức tự
   do từ ngoài dây. Thêm một method là **đổi luật an toàn** → hỏi Đức.
6. **Quyền đã duyệt là TRẦN, không phải sàn.** ADR-0009 duyệt tới `<all_urls>` · `debugger` ·
   `scripting` · `tabs` · `storage` · nối `127.0.0.1`; Đức duyệt thêm `alarms` ngày 07/09
   ([ADR-0001](docs/adr/0001-phanh-cho-duong-ghi-va-quyen-alarms.md) của gói). `manifest.json`
   hôm nay khai **`debugger` · `storage` · `alarms` · `http://127.0.0.1/*`** — đúng thứ đang
   dùng. Khai thêm khi thật sự dùng tới, đừng khai trước. Xin ra ngoài danh sách trên thì phải
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
   triển nằm trong popup, và **không method Bridge nào bật được nó** — đó là cả ý nghĩa của
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
| `scouter-background.js` | **Dây thật**: bơm `chrome` vào ba lõi, và giữ lưới đỡ `chrome.alarms` (S-02). CỐ Ý mỏng và cố ý không có phép ghim riêng — thêm một dòng logic vào đây là thêm một dòng không ai canh |
| `observer-engine.js` | Gắn/tháo `chrome.debugger`, gọi lõi phép dò **và lõi hành động**. Tám con `W1..W4` + `A1..A5` canh đúng file này |
| `popup.html` · `popup.css` · `popup.js` | Popup: chọn tệp ghép cặp Bridge, quét/quan sát thủ công, và **công tắc cho đường ghi** — chỗ DUY NHẤT bật được nó |
| `scripts/observer-probes.mjs` | **Bốn phép dò read-only**, thuần logic. Ba chốt bất biến ghi ở đầu file |
| `scripts/scouter-bridge-core.mjs` | Giao thức + **từ vựng method cố định** + bộ điều phối. Không biết `chrome` là gì |
| `scripts/scouter-seed-core.mjs` | Ba khả năng nối vào từ vựng: quan sát · báo cáo · tự nạp lại · **và ba hành động ghi (S-01)** |
| `scripts/scouter-actions-core.mjs` | **Đường GHI**: bấm và gõ như tay người. Danh sách method CDP RIÊNG, bốn chốt riêng. Đọc khối đầu file trước khi sửa |
| `scripts/scouter-transport-loopback.mjs` | Dây WebSocket tới `127.0.0.1`, **bắt tay hai chiều**. Đọc khối đầu file trước khi sửa |
| `scripts/mutation-runner.mjs` | Bộ máy đột biến kiểm, dùng chung. Ba cái bẫy đã trả giá ghi ở đầu file |
| `scripts/observer-mutation-check.mjs` | 14 con đột biến cho bốn phép dò |
| `scripts/scouter-mutation-check.mjs` | 58 con đột biến cho khung seed, đường ghi, cái phanh và bề mặt quyền |
| `scripts/scouter-input-trust-probe.mjs` | **Phép đo ①** (06/09, ĐẠT): cú bấm qua `chrome.debugger` có `isTrusted: true` |
| `scripts/scouter-action-reality-probe.mjs` | **Phép đo ②** (07/09, ĐẠT 11/11 trên Chrome 152): nạp CHÍNH lõi hành động thật vào một extension thử rồi bấm trên trang tự dựng. Khác ① ở chỗ ① đo *đường đi*, còn cái này đo *code của Scouter*. Mã thoát 2 = phép đo KHÔNG CHẠY được |
| `scripts/scouter-bridge-live-check.mjs` | Nối thử với **máy chủ Bridge THẬT**, không phải bản giả. Mã thoát 2 = không chạy được, khác hẳn "không đạt" |
| `tests/scouter-action-reality-smoke.mjs` | Ghim LUẬT CHẤM của phép đo ②, không cần trình duyệt. 15 ca hỏng, mỗi ca phải đỏ ĐÚNG tiêu chí của nó |
| `tests/scouter-write-gate-smoke.mjs` | Ghim CÁI PHANH (S-05) và bề mặt quyền manifest (S-02). Ghim cả hai chiều — khối ② là chiều "mở khoá thì bấm được thật" |
| `docs/adr/` | Quyết định của Đức riêng cho gói này. ADR đã `Accepted` là bất biến |
| `tests/run-all.mjs` | Chạy hết phép ghim của gói. `package.json` gốc chỉ gọi file này — thêm phép ghim mới **không cần khoá `_root`** |
| `ROADMAP.md` | **Đi tới đâu, đang ở đâu, thứ tự nào** — 25 mục `SEED v0.1` xếp thành bốn bước. Đọc file này TRƯỚC khi hỏi "việc kế là gì". Không chép danh sách 25 mục, chỉ xếp thứ tự |
| `STATUS.md` | Trạng thái vận hành 1 trang (máy đọc frontmatter sinh DASHBOARD) |
| `HANDOFF.md` | Trạng thái + Log (chỉ thêm dòng ở cuối) |
| `BACKLOG.md` | Việc còn mở, đánh số `S-xx` |

## Một chỗ đã trả giá, đừng làm lại

Ba worker có **năm file `bridge-*.js`**, và chỉ **một** file giống hệt cả ba (`bridge-pairing-core.js`).
Quan trọng hơn: **chỉ nhánh ChatGPT bắt tay hai chiều** — máy chủ phải chứng minh nó biết token
trước, rồi extension mới đưa token ra. Gemini và Flow đưa token ngay khi socket mở, tức là đưa
cho bất kỳ tiến trình nào chiếm cổng trước. Seed dùng bản ChatGPT.

**Hệ quả phải biết:** seed này CHỈ nối được với máy chủ bản ChatGPT. Đấu với hai bản host cũ thì
`auth_challenge` bị coi là khung lạ và socket đứt — nhìn ra ngoài giống "Bridge không lên". Đó là
hỏng AN TOÀN, và nó cố ý. Con đột biến `D1` canh đúng chỗ này.
