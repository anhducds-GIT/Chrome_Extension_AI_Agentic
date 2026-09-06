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

- **Chờ Đức:** nạp lại tiện ích rồi chạy một lượt thật, bấm dừng giữa chừng — sau lệnh dừng không được có prompt nào bay đi nữa. @Đức:bấm

### G-02 · Khoá tab và khoá hội thoại — **CÒN MỞ**, chờ Đức reload để nghiệm thu — **[ĐỌC]**

> **Tiêu đề mục này từng bắt đầu bằng "ĐÃ VÁ TĨNH 2026-09-04", và cụm đó làm bảng đếm SAI.**
> `scripts/what-next.mjs` có một lưới hứng mục-đóng-mà-quên-gạch-ngang
> (`/(ĐÃ ĐÓNG|ĐÓNG|ĐÃ XONG|XONG|ĐÃ VÁ)/`, dựng ra để hứng `G-11`). Cụm đó trúng lưới, nên mục
> **P1 duy nhất còn hành vi chưa nghiệm thu** bị **gỡ khỏi danh sách việc mở**: bảng báo gói này
> có 8 việc trong khi thật ra là 9. Đức đọc bảng để quyết việc. Đã đổi chữ ở đây để bảng đếm
> đúng. **Lưới hứng bắt oan vẫn còn** — vá nó là sửa `scripts/`, cần khoá `_code`, đã ghi vào
> `BACKLOG.md` gốc repo.

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

- **Chờ Đức:** nạp lại tiện ích và điền tên hồ sơ, rồi chạy một lượt và giữa chừng bấm sang tab khác — prompt phải vẫn đi đúng tab đã khoá. @Đức:bấm

~~**Nợ nhỏ còn lại (không chặn):** thông điệp lỗi vẫn nhúng *origin*…~~ — **ĐÓNG 2026-09-06**
(`claude-gemini-hoan-thien`). Đúng cái cách mục này đã chỉ ra: `classifyFailure()` nay đọc
**tiền tố** `RECEIVER_LOST:` trước khi dò từ khoá. Làm được rẻ vì cùng lượt đã phải thêm một
luật tiền tố y hệt cho `DETECTION_BLIND` (xem G-06) — cùng một hàm, cùng một dòng.

Lượt đó cũng đo lại và **kết luận cũ hơi nhẹ tay**: mục này viết "không origin thật nào trong
luồng này dính", nhưng luật `/timed out|timeout/` đứng **trên** luật `/receiver/`, nên chỉ cần
chữ `timeout` xuất hiện **bất kỳ đâu** trong câu là nhãn tuột — mà cả câu, không riêng origin,
là thứ bị dò. Ghim: `tests/detection-blind-hard-stop.mjs` (nửa cuối), đột biến xoá dòng tiền
tố → ĐỎ.

## P2 — Nên làm sớm

### G-03 · `README.md` của package này là bản chép từ nhánh ChatGPT — **[ĐỌC]**

Dòng tiêu đề vẫn ghi *"Duc Auto ChatGPT V0.3"*. Ai đọc README để hiểu nhánh Gemini bị dẫn sai
tên **ngay dòng đầu**. So hai file thì chúng chỉ khác đúng một mục (`references.add`).

Đây là lỗi tài liệu rẻ nhất trong sổ này và cũng dễ gây hiểu nhầm nhất cho người mới.

### G-04 · Nợ method Bridge — **[ĐO]** · 2/4 XONG 06/09

**Sổ này ghi BA, máy đếm được BỐN.** Khối `AUTO:DEBT-METHODS` của `FEATURE-PARITY.md` liệt kê
`chat.read` · `output.set_folder_hint` · `profiles.remove` · `queue.proposal.withdraw`. Chữ ở đây
lạc hậu, con số máy sinh mới đúng — đúng như dòng cảnh báo ngay dưới đã dặn.

- ~~`queue.proposal.withdraw`~~ **XONG 06/09** ✅ — không phải chép thẳng: bảng trạng thái của gói
  này chưa biết trạng thái "đã rút" nên `transition()` sẽ ném. Ghim:
  `tests/proposal-withdraw-behavior.mjs`, thử phá 10/10 bị bắt.
- ~~`chat.read`~~ **XONG 06/09** ✅ — `readTurns()` port sang, giữ nguyên tính thuần nên phép ghim
  chạy chính đoạn mã thật. Ghim: `tests/chat-read-turns.mjs`, thử phá 9/9 bị bắt.
- **`output.set_folder_hint` và `profiles.remove` CÒN MỞ, và chúng KHÔNG phải port.** Gói này
  thiếu hẳn lớp dưới: `DacOutputProfiles` chỉ xuất `{ DB_NAME, STORE, profileId, get, bind,
  resolve }` — **không có `list`, không có `setHint`, không có `remove`**. Và `sidepanel.js`
  không có `probeBridgePersistence` lẫn `renderBridgeAttention`, hai thứ cả hai lệnh đều gọi.
  Tức đây là dựng một phần hệ hồ sơ đầu ra, không phải chép hai hàm.
- **đóng khi:** `node scripts/feature-parity.mjs --check` xanh và khối `AUTO:DEBT-METHODS` khai
  "Gemini nợ GPT (0)".

**Đừng gõ lại con số vào đây** — số hiện tại luôn nằm ở khối `AUTO:DEBT-METHODS` trong
[`FEATURE-PARITY.md`](../../../FEATURE-PARITY.md), do máy sinh. Dòng này chỉ để biết *có nợ*.

### G-05 · `image-evidence-core.js` nhỏ hơn nhánh kia hơn hai lần — **[ĐO]**

145 dòng bên ChatGPT, 66 bên Gemini. Đây là **lớp quy ảnh về job** — tức là lớp **an toàn**,
không phải UI. Chênh lệch ở đây đáng lo hơn chênh lệch ở giao diện.

~~Chưa ai đọc để biết 79 dòng đó làm gì.~~ **ĐÃ ĐỌC 2026-09-06** (`claude-gemini-hoan-thien`).

**79 dòng đó không phải 79 việc — nó là ĐÚNG MỘT tính năng: nhiều ảnh trong một job.** Cụ thể:
`selectAttributableImages` (bản nhiều ảnh) + `sameTurn` + trần `maxImages` + mã
`TOO_MANY_NEW_IMAGES`, cộng `settledForImages` + `imageSignature` (đồng hồ chờ, để một lượt
trả ảnh nhỏ giọt không bị cắt ngang khi mới có ảnh đầu). Ngoài chỗ đó ra, hai file **giống
nhau về hành vi** — kể cả `completionForImage` từng chữ.

Tức mục này và gạch đầu dòng "Nhiều ảnh một job" của **G-06 là CÙNG MỘT VIỆC**, không phải hai.

**Và port thẳng vào sẽ ra code chết trông như tính năng.** `sameTurn()` đọc `candidate.turn_id`;
`content.js` của nhánh này **không hề gán `turn_id`** cho ứng viên ảnh nào. Chép nguyên xi thì
`turns` luôn là `Set([""])` → `sameTurn` luôn `false` → nhánh nhiều-ảnh **không bao giờ nhận**,
im lặng, mà suite vẫn xanh. Đúng cái bệnh dòng **[DÒ]** ở đầu sổ này cảnh báo.

**Việc kế, và nó KHÔNG cần bằng chứng DOM mới:** nhánh này đã sẵn có `responseKey(container)`
làm danh tính lượt, và nó **đang gánh việc thật** — `newAssistantMessages()` dùng chính nó để
quyết lượt nào là mới. `imageDecision()` cũng đã duyệt qua từng khối phản hồi rồi mới gộp ảnh
lại, nên chỗ đóng dấu danh tính lượt lên ứng viên là có sẵn, không phải đi dò selector mới.
- **đóng khi:** `selectAttributableImages` + `settledForImages` chạy được ở nhánh này với
  `turn_id` thật, có phép ghim canh **cả hai chiều** (nhận đúng một lượt · từ chối ảnh rải
  trên hai lượt khác nhau), và đột biến xoá `sameTurn` làm suite ĐỎ.

### G-06 · Bốn hành vi nhánh ChatGPT có mà Gemini chưa — **ĐÃ KIỂM LẠI 2026-09-06, còn 1**

Cả bốn từng là **[DÒ]** — chỉ dò theo tên hằng số/thuộc tính. Đã mở code đọc từng cái
(`claude-gemini-hoan-thien`), nên bốn dòng dưới nay là **[ĐỌC]**. **Một trong bốn là báo oan** —
lần thứ ba nhánh này bị báo oan "thiếu", đúng như cảnh báo ở đầu sổ.

- ~~`DETECTION_BLIND` — mù thì dừng cứng, không thử lại~~ **XONG 06/09** ✅ — thiếu thật, đã port.
  Hết giờ mà **không còn một khối phản hồi nào** → dừng cứng. Luật tiền tố phải đứng **trên**
  luật `/timed out|timeout/`: câu báo lỗi tự nó chứa chữ "timeout", đặt sai chỗ là mã này thành
  TIMEOUT, **mà TIMEOUT thì được thử lại** — tức lớp bảo vệ im lặng không chạy.
  Ghim: `tests/detection-blind-hard-stop.mjs`, thử phá 7/7 bị bắt.
- ~~Ledger khai thật `landed_as_requested`~~ **XONG 06/09** ✅ — thiếu thật, đã port, và lượt đọc
  còn lòi ra một lỗi nặng hơn ở ngay cạnh: `write_outcome` so đường dẫn **tuyệt đối** với đường
  dẫn **tương đối** nên **không bao giờ đúng một lần nào**, và dưới chính sách ghi đè thì nó khai
  `overwritten` — tức nói với nhật ký kiểm toán rằng bằng chứng cũ của Đức **đã bị thay thế**,
  trên những lần ghi đầu tiên, mọi lần. Ghim: `tests/landed-as-requested.mjs`, thử phá 6/6 bị bắt.
- **Nhiều ảnh một job** — thiếu thật, **CÒN MỞ**. Đây **cùng một việc** với `G-05`, không phải hai:
  79 dòng chênh của `image-evidence-core.js` chính là tính năng này. Chi tiết và điều kiện đóng
  ghi ở `G-05`, đừng làm hai lần.
- ~~Đọc `tab.url || tab.pendingUrl`~~ **BÁO OAN** — nhánh này **ĐÃ CÓ**, ở `tab-lock-core.js`, do
  đợt khoá tab 04/09 (`G-02`) mang vào. Mục này viết trước đợt đó và không ai rà lại.

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

### ~~G-10~~ · **ĐÓNG 06/09** ✅ — Ba guard lớp hai chưa có phép ghim — **[ĐỌC]**

**Đã ghim 06/09** bằng `tests/bridge-transport-depth-guards-static.mjs` — ghim ở **mức nguồn**,
vì mức hành vi là bất khả (xem đoạn dưới). Đột biến kiểm **3/3 đỏ**: xoá `|| reconnectTimer`
khỏi guard sớm của `scheduleReconnect` (dòng 215) → đỏ; xoá dòng `socket !== targetSocket`
trong callback hạn chờ ACK (dòng 178) → đỏ; xoá dòng `sequence !== statusSequence` trong
`publishStatus` (dòng 124) → đỏ.

**Kiểm chứng lại lời của phiên trước, không tin luôn (luật vàng 4):** chạy đúng ba đột biến đó
với `tests/bridge-transport-liveness-smoke.mjs` — suite **hành vi** xanh cả **3/3**. Tức câu
"không còn đường nào tới được chúng" là đo được, không phải suy đoán, và đó chính là lý do phép
ghim này phải soi mã nguồn.

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

### ~~G-11~~ · **ĐÓNG 28/08** ✅ — Đo live bản trần 5 giây

Đo được **1,0 giây** (bản trước: 22,5s và 27,7s). Bằng chứng:
`evidence-transport-liveness-5s-20260828/`. Khớp dự đoán viết trước khi đo, lần thứ ba liên tiếp.

Còn một nhánh **chưa đo thật**, ghi lại để không tưởng là đã phủ: tắt host **quá 2 phút** thì
thang bỏ cuộc và alarm 30 giây lo tiếp. Hiện chỉ ghim bằng test.
