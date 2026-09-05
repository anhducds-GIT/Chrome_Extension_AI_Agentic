# Backlog — Duc Auto Gemini (Platform)

Nơi chứa mọi việc phát sinh mà **không** thuộc checkpoint của phiên đang chạy.

Luật (Đức chốt 2026-08-26): mỗi phiên chỉ đóng **một** checkpoint. Ý tưởng mới nảy ra giữa
chừng thì ghi vào đây, không mở rộng phiên đang làm.

Cách đọc: `P1` = chặn việc khác, làm trước. `P2` = nên làm sớm. `P3` = khi rảnh.
Mục nào xong thì chuyển xuống mục **Đã đóng** kèm số commit.

**Đánh số `G-xx`** để không lẫn với `B-xx` của nhánh ChatGPT. Hai sổ, hai nhánh, hai dãy số.

> **Sổ này lập ngày 2026-08-27** (`opus-platform-2`, GPT chốt thứ tự việc). Trước đó nhánh
> Gemini **không có nơi canonical để giữ việc mở** — chúng nằm rải trong `HANDOFF.md` hoặc
> nằm nhờ ở sổ của nhánh ChatGPT, tức là một chiều. Đó chính là lỗ vận hành sổ này bịt.

## Đọc mỗi dòng cho đúng độ tin cậy

Kế thừa quy ước của [`FEATURE-PARITY.md`](../../../FEATURE-PARITY.md):

| Ký hiệu | Nghĩa | Tin được tới đâu |
|---|---|---|
| **[ĐO]** | Máy đếm được | Chắc |
| **[ĐỌC]** | Đã mở code đọc thẳng hàm đó | Chắc |
| **[DÒ]** | Tìm theo tên hàm/hằng số | **Có thể sai** |

**Dòng [DÒ] phải kiểm lại TRƯỚC khi hành động.** Dò theo tên đã cho kết luận sai **bốn lần
trong một ngày** ở repo này, và lần đắt nhất là một tính năng không ai nghĩ ra để dò.

---

## P1 — Chặn vòng tự hành

### G-01 · Lệnh dừng chỉ ăn ở mốc ngắt, prompt vẫn bay sau khi đã báo dừng — **[ĐỌC]**

Trial live 2026-08-26 ghi sổ cái: `BRIDGE_RUN_STOPPED` lúc 14:20:36 với
`STOP_REQUESTED_BEFORE_SUBMIT`, rồi **`PROMPT_SUBMITTED` lúc 14:20:37** — đúng một giây sau.
Cờ dừng chỉ được đọc ở các mốc ngắt, nên job đang chạy đi nốt tới chỗ gửi.

Đã vá **lời nhắn** (trước đó nó trấn an "Không job nào bị gửi thêm", và câu đó sai).
Bằng chứng: `evidence-stop-reload-20260826/README.md`.

**CẬP NHẬT 27/08 — Đức Go trong chat, HÀNH VI ĐÃ VÁ TĨNH:** root cause chứng minh bằng test
tái hiện đúng thứ tự message (`tests/content-abort-race-behavior.mjs` đỏ trên code cũ, xanh
sau vá) — `content.js` mở đầu `runPrompt()` bằng xoá cờ huỷ nên `DAC_ABORT` tới trước job bị
nuốt. Vá theo hướng B-refined: `DAC_ABORT` mang `job_id`+`attempt_id`, cờ chỉ giữ cho đúng
attempt bị huỷ; kèm recheck cờ dừng sau `await gateNextJob` trong runner
(`tests/sidepanel-stop-before-submit-static.mjs`). 6 phép phá thử đều bị bắt.

**Còn mở — chưa được đóng mục này:** trial live sau khi Đức reload extension, đọc sổ cái
chứng minh không còn chuỗi `STOP_REQUESTED_BEFORE_SUBMIT → PROMPT_SUBMITTED`, ghi bằng chứng
vào `evidence-stop-*/` rồi cập nhật `STATUS.md`. Cùng lỗi bên nhánh ChatGPT: **B-22**.

### G-02 · Khoá tab và khoá hội thoại — **ĐÃ VÁ TĨNH 2026-09-04**, chờ Đức reload để nghiệm thu — **[ĐỌC]**

Lỗi gốc: `activeTab()` gọi `chrome.tabs.query({active:true})` **mỗi lần gửi**, và chỉ kiểm
origin. Đổi tab hoặc đổi hội thoại giữa chừng là runner âm thầm gõ sang chỗ khác.

**Đã làm** (`claude-exec-g02b`, kế thừa việc dở của `claude-exec-g02`):
`tab-lock-core.js` mới + `state.boundTabId` / `state.boundConversationId` +
`bindRunTab()` / `releaseRunTab()` trong `sidepanel.js`.
Ghim: `tests/tab-lock-behavior.mjs` — 17 khẳng định, 15/15 đột biến bị bắt.

**Ba chỗ Gemini KHÁC nhánh ChatGPT** (đây là lý do không chép nguyên xi):

| | ChatGPT (B-01) | Gemini (G-02) |
|---|---|---|
| Chỗ khoá | hai: `run()` **và** `bridgeRunTrial()` | **một**: chỉ `run()` — `bridgeRunTrial` của Gemini gọi thẳng `run("selected")`, không có runner riêng |
| Id hội thoại | `/c/<id>` | `/app/<id>`, và phải bỏ tiền tố tài khoản `/u/<n>` |
| Phép kiểm địa chỉ | chỉ origin | `isProviderUrl` (mặt + origin) — Gemini có HAI mặt hợp lệ (`/images`, `/app`), nên `gemini.google.com/settings` đúng origin mà vẫn phải là mất receiver |
| Thông điệp lỗi | nhúng 80 ký tự đầu của địa chỉ | **chỉ nhúng origin** — `classifyFailure()` dò `/timeout/` TRƯỚC `/receiver/`, nên một đường dẫn lạ chứa chữ "timeout" sẽ lái lỗi sang nhãn TIMEOUT, mà TIMEOUT thì **được thử lại** |

**Còn mở — chưa đóng được mục này:** Đức reload extension ở `chrome://extensions`, rồi chạy
một run và giữa chừng bấm sang tab khác — prompt phải vẫn đi vào tab đã khoá. Đổi hội thoại
hoặc đóng tab thì phải dừng cứng `RECEIVER_LOST`, không thử lại.

**Nợ nhỏ còn lại (không chặn):** thông điệp lỗi vẫn nhúng *origin*. Một origin chứa đúng chữ
bẫy (`timeout`, `captcha`, `ambiguous`…) vẫn lái được nhãn lỗi. Đã cân và bỏ qua: đường dẫn
là thứ Google hay nhét chữ vào (`?continue=…`), origin thì không — không origin thật nào
trong luồng này dính. Muốn bịt hẳn thì cho `classifyFailure()` đọc tiền tố `RECEIVER_LOST:`
trước khi dò chữ, nhưng đó là sửa `runner-core.js` cho mọi loại lỗi, ngoài phạm vi G-02.

## P2 — Nên làm sớm

### G-03 · `README.md` của package này là bản chép từ nhánh ChatGPT — **[ĐỌC]**

Dòng tiêu đề vẫn ghi *"Duc Auto ChatGPT V0.3"*. Ai đọc README để hiểu nhánh Gemini bị dẫn sai
tên **ngay dòng đầu**. So hai file thì chúng chỉ khác đúng một mục (`references.add`).

Đây là lỗi tài liệu rẻ nhất trong sổ này và cũng dễ gây hiểu nhầm nhất cho người mới.

### G-04 · Nợ ba method Bridge — **[ĐO]**

`output.set_folder_hint` · `profiles.remove` · `queue.proposal.withdraw`.

**Đừng gõ lại con số vào đây** — số hiện tại luôn nằm ở khối `AUTO:DEBT-METHODS` trong
[`FEATURE-PARITY.md`](../../../FEATURE-PARITY.md), do máy sinh. Dòng này chỉ để biết *có nợ*.

### G-05 · `image-evidence-core.js` nhỏ hơn nhánh kia hơn hai lần — **[ĐO]**

145 dòng bên ChatGPT, 66 bên Gemini. Đây là **lớp quy ảnh về job** — tức là lớp **an toàn**,
không phải UI. Chênh lệch ở đây đáng lo hơn chênh lệch ở giao diện.

Chưa ai đọc để biết 79 dòng đó làm gì. **Việc đầu tiên là ĐỌC, không phải port.**

### G-06 · Bốn hành vi nhánh ChatGPT có mà Gemini chưa — **[DÒ], phải kiểm lại**

- `DETECTION_BLIND` — mù thì dừng cứng, không thử lại (chốt dựng ra sau khi đốt 6 lượt quota ngày 25/08)
- Ledger khai thật `landed_as_requested`
- Nhiều ảnh một job
- Đọc `tab.url || tab.pendingUrl`

Cả bốn đều là **[DÒ]** — chỉ mới dò theo tên hằng số/thuộc tính. **Kiểm lại bằng cách đọc code
trước khi kết luận là thiếu.** Nhánh Gemini đã hai lần bị báo oan "thiếu" trong khi nó **có**,
chỉ là làm theo cách khác và đặt tên khác (`tryBeginRun`, `assertTrialDevMode`).

### ~~G-09~~ · `npm test` ở gốc repo KHÔNG chạy suite Gemini — **ĐÓNG 05/09** ✅

`package.json` gốc chạy `workers/duc-auto-chatgpt/.../run-all.mjs` rồi 13 test gốc. Suite Gemini
**không nằm trong đó**. Cổng `session-check.mjs` thì có chạy, nên luật vẫn được canh —
nhưng ai chỉ chạy `npm test` sẽ tưởng nhánh Gemini đã xanh mà thật ra chưa chạy dòng nào.

**Đo trước khi vá (05/09, `claude-gemini-no`):** `npm test` chạy **120 trong 321 file test (37%)**
— 107 của gói ChatGPT + 13 file test gốc. Ba suite worker **không chạy một dòng nào**:
`duc-auto-gemini/v0.1.0` (19 file) · `duc-auto-gemini/v0.2.0` (**86 file**) ·
`duc-auto-gg-flow-video/v0.1.0` (96 file). Cả ba đều đã xanh sẵn — tức đây thuần là **xanh giả**
về mặt phủ, không phải nợ sửa code.

**Gốc bệnh không phải "quên Gemini" mà là danh sách suite GÕ TAY** — thêm worker mới là nó lại
lọt ra ngoài, im lặng, y hệt lần này. Nên vá cả hai lớp:

1. `scripts.test` gốc nay gọi **cả bốn** suite worker.
2. Phép ghim mới `tests/root-suite-covers-workers-static.mjs`: đọc hình dạng repo từ
   `.repo-structure.json` (dùng lại `unitsFrom`/`unitDirsUnder`, **không tự chế `^workers/`**)
   và đòi **mọi** thư mục đơn vị có `tests/run-all.mjs` phải có tên trong `scripts.test`.
   Đột biến kiểm **3/3 bắt được**: bỏ dòng gg-flow-video · bỏ dòng gemini v0.2.0 ·
   dựng một worker mới chưa nối.

Sau vá: `npm test` chạy **322/322 file (100%), exit 0**, suite gói này 86 → **87**.

**Nợ nhỏ còn lại (không chặn):** phép ghim đó **đáng lẽ nằm ở `tests/` gốc**, nhưng lúc vá,
khoá `_code` do phiên khác giữ, nên nó tạm trú trong gói Gemini. Hệ quả: nếu ai xoá đúng dòng
gọi suite **Gemini** khỏi `scripts.test` thì `npm test` không chạy tới nó nữa. Cổng đóng phiên
vẫn bắt (`session-check` gọi thẳng `run-all.mjs` của gói), và ba dòng kia thì `npm test` bắt
ngay. Chuyển về `tests/root-suite-covers-workers-static.mjs` khi có `_code` là đóng hẳn lỗ này.

### G-10 · Ba guard lớp hai chưa có phép ghim — **[ĐỌC]**

Trong `bridge-transport-loopback.js`: (a) điều kiện `reconnectTimer` trong `scheduleReconnect`,
(b) phép kiểm danh tính `socket !== targetSocket` trong callback hạn chờ ACK, (c) phép kiểm
"đã bị bản mới hơn vượt qua" trong `publishStatus`. Phá thử 39 chiều (28/08) bắt được 36, thoát
đúng ba cái này — **vì không còn đường nào tới được chúng** sau khi guard lớp một được vá:
`connectHost` gỡ **mọi** timer của socket bị thay, và ghi trạng thái đã được xếp thứ tự.
Auditor độc lập xác nhận cả ba là phòng thủ chiều sâu đúng đắn, không phải lỗi.

Giữ lại. Nếu sau này ai gỡ một guard lớp một, ba cái này thành đường sống — nên **đừng xoá vì
thấy test không đụng tới**.

## P3 — Khi rảnh

### G-07 · Poll A/B "thích ảnh nào hơn" — **[ĐO]**

`ab-poll-core.js` chỉ có ở nhánh ChatGPT. Không phải lớp an toàn, nên xếp P3.

### G-08 · Tám module giống hệt từng byte giữa hai nhánh — **[ĐO]**

Danh sách hiện tại ở khối `AUTO:MODULES` trong `FEATURE-PARITY.md`. Dời chúng vào
`workers/_shared/` thì **rủi ro bằng không** và hết cảnh sửa một chỗ quên chỗ kia.

Đây là việc **chung cả hai nhánh**, nên phải giữ `_root` mới làm được — không thuộc riêng sổ
này, ghi lại để không quên.

---

## P2 — Dọn nợ fork (mở 03/09)

### G-12 · Soát nốt README từ mục cài đặt trở xuống — **[ĐỌC]**

`README.md` và `AGENTS.md` của gói này là **bản chép nguyên từ gói ChatGPT** lúc fork. Ngày 03/09 phiên `claude-dashboard` sửa những chỗ **có bằng chứng**: tên lấy từ `manifest.json`, tên miền từ mã nguồn, tên script từ `scripts/`, đường dẫn pairing đọc thẳng trong script cài.

Chỗ nặng nhất đã sửa: README ghi thư mục tải về mặc định là `Duc Auto ChatGPT`, còn mã nguồn ghi `Duc Auto Gemini` (đo 4 chỗ) — Đức đọc README là đi tìm sai chỗ.

**Còn nợ:** phần README từ mục cài đặt trở xuống chưa soát từng dòng.

**Một cái bẫy, ghi lại để phiên sau đừng mắc:** ĐỪNG find-replace `ChatGPT` thành `Gemini`. Gói này **thật sự chứa** `templates/Duc-Auto-ChatGPT-Template.xlsx` và `pilot-04/Duc-Auto-ChatGPT-Pilot-04.xlsx` — tên file đúng là vậy, thay là làm sai một câu đang đúng. Hai khối prompt `#01` / `#02` ở cuối `AGENTS.md` cũng cố ý giữ: đó là bản ghi lịch sử của dự án ChatGPT, sửa là viết lại lịch sử. Đã dán nhãn tại chỗ.

### ~~G-13~~ · Hai script Bridge của ChatGPT còn nằm trong `scripts/` — **ĐÓNG 03/09** ✅

`scripts/` của gói này có **cả hai bộ**: `Install-DucAutoGeminiBridgeV1.ps1` + `Uninstall-DucAutoGeminiBridgeV1.ps1` (bộ đúng), và `Install-DucAutoChatGPTLoopbackBridgeV1.ps1` + `Uninstall-DucAutoChatGPTLoopbackBridgeV1.ps1` (đồ thừa lúc fork).

Rủi ro thật: hai script cài vào **hai thư mục khác nhau**, nên chạy nhầm là dựng Bridge ở chỗ extension không tìm tới. Triệu chứng sẽ là "nối mãi không được" chứ không phải một lỗi rõ ràng. README nay đã trỏ đúng bộ Gemini, nhưng file kia vẫn nằm đó và vẫn chạy được.

**ĐÃ XOÁ 03/09, Đức chốt.** Trước khi xoá đã kiểm: `tests/bridge-install-static.mjs` ghim mười lăm tính chất an toàn của script cài, và chúng ghim vào **bộ ChatGPT** — xoá thẳng là mất trắng mười lăm lớp bảo vệ (luật vàng 3). Nên chuyển chúng sang bộ Gemini trước và chạy thử: **bộ Gemini chịu được cả mười lăm**. Giờ lớp bảo vệ ghim vào script THẬT SỰ đang dùng, mạnh hơn trước. Có phép ghim chặn hai file mọc lại.

## Đã đóng

### G-11 · Đo live bản trần 5 giây — **ĐÓNG 28/08** ✅

Đo được **1,0 giây** (bản trước: 22,5s và 27,7s). Bằng chứng:
`evidence-transport-liveness-5s-20260828/`. Khớp dự đoán viết trước khi đo, lần thứ ba liên tiếp.

Còn một nhánh **chưa đo thật**, ghi lại để không tưởng là đã phủ: tắt host **quá 2 phút** thì
thang bỏ cuộc và alarm 30 giây lo tiếp. Hiện chỉ ghim bằng test.
