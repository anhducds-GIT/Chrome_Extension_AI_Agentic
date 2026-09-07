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

**ĐO 07/09 (`claude-gemini-nghiem-thu`) — nạp lại tiện ích là CHƯA ĐỦ, cần BỐN thứ trên CÙNG
một hồ sơ Chrome.** Phiên đó mở được Bridge, nhưng không hồ sơ nào hội đủ điều kiện nên
**không mở lượt live nào** (0 credit). Đo được: `anhducds` panel ĐÓNG + còn ôm code trước 06/09
trong RAM (19 method, thiếu 4 method của 06/09); `kaito` code mới (23 method) + panel MỞ nhưng
**không có tab hội thoại Gemini đang hoạt động** để `bindRunTab()` khoá vào.

Bốn điều kiện, phải đủ cả bốn trên **một** hồ sơ: ⑴ nạp lại tiện ích ở `chrome://extensions`
· ⑵ mở tab `gemini.google.com/app` (hoặc `/images`) và **để nó là tab đang hoạt động**
· ⑶ mở side panel · ⑷ bật công tắc **"Chế độ phát triển"**.

Điều kiện ⑷ **không kiểm được từ xa**: lệnh duy nhất soi được nó là `run.trial`, mà `run.trial`
chính là lệnh tiêu tiền — không dùng nó làm phép thử. Ba điều kiện đầu thì kiểm được miễn phí:
`ledger.read` (`WORKBOOK_NOT_LOADED` = panel mở · `EXECUTOR_UNAVAILABLE` = panel đóng) ·
`diagnostics.dom_probe` (báo `"Open a normal Gemini conversation in the active tab."` = chưa có tab)
· `capabilities` **đếm method** (19 = code cũ, 23 = code HEAD; **đừng đọc cờ `legacy`** — cả hai
hồ sơ đều `legacy:false`). Bằng chứng: `evidence-multiprofile-nghiem-thu-20260907/`.

Cùng lượt đó đã loại được một nghi ngờ tưởng là chặn: `run.status` timeout 5/6 lượt liên tiếp,
nhìn như hỏng riêng — nhưng xen kẽ ba method thì lỗi đóng theo THỜI GIAN (cửa sổ đánh thức
service worker), không theo method. **Không chặn `G-01`:** vòng poll 10 giây lúc chạy tự giữ
kênh ấm, nên lúc cần canh để bấm dừng thì `run.status` tin được.

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

**ĐO 07/09 — nửa "điền tên hồ sơ" ĐÃ XONG, nửa "chạy một lượt" vẫn chờ.** Đức đã đặt tên cả hai
hồ sơ (`anhducds`, `kaito`) và `bridge.sessions` đọc ra đúng, `count: 2`. Bốn điều kiện còn lại
cho lượt chạy giống hệt `G-01` ở trên — **gộp được vào MỘT lượt Đức bấm**: cùng một run, bấm
sang tab khác giữa chừng (nghiệm thu `G-02`) rồi bấm dừng (nghiệm thu `G-01`).

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

### ~~G-03~~ · Dòng tiêu đề README dẫn sai tên nhánh — **ĐÓNG 03/09** ✅

Dòng đầu từng ghi *"Duc Auto ChatGPT V0.3"*. Phiên `claude-dashboard` sửa ngày 03/09; nay nó
ghi `# Duc Auto Gemini (Platform) V0.2.0`. **Mục này để ngỏ thêm ba ngày sau khi đã xong** —
rà lại 06/09 mới phát hiện, nên bộ đếm nợ tính dư một việc suốt thời gian đó.

### ~~G-04~~ · Nợ method Bridge — **ĐÓNG 06/09** ✅ · 4/4

**Sổ này ghi BA, máy đếm được BỐN.** Khối `AUTO:DEBT-METHODS` của `FEATURE-PARITY.md` liệt kê
`chat.read` · `output.set_folder_hint` · `profiles.remove` · `queue.proposal.withdraw`. Chữ ở đây
lạc hậu, con số máy sinh mới đúng — đúng như dòng cảnh báo ngay dưới đã dặn.

- ~~`queue.proposal.withdraw`~~ **XONG 06/09** ✅ — không phải chép thẳng: bảng trạng thái của gói
  này chưa biết trạng thái "đã rút" nên `transition()` sẽ ném. Ghim:
  `tests/proposal-withdraw-behavior.mjs`, thử phá 10/10 bị bắt.
- ~~`chat.read`~~ **XONG 06/09** ✅ — `readTurns()` port sang, giữ nguyên tính thuần nên phép ghim
  chạy chính đoạn mã thật. Ghim: `tests/chat-read-turns.mjs`, thử phá 9/9 bị bắt.
- ~~`output.set_folder_hint`~~ và ~~`profiles.remove`~~ **XONG 06/09** ✅ — và đúng như dự đoán,
  **không phải port**: phải thêm `list` / `setHint` / `remove` vào `output-profile-core.js` trước.
  Hai hàm sau dùng **đọc-sửa-ghi trong MỘT giao dịch** — một phát hiện audit của Codex, port kèm
  code: tách ra hai giao dịch riêng có thể **hồi sinh một handle cũ** đè lên một `bind()` chạy
  song song.

  **Hai thứ nhánh kia gọi mà gói này không có** (`probeBridgePersistence`, `renderBridgeAttention`)
  là cửa vào **cả một hệ giao diện "việc cần chú ý"**. Cố ý **không** port: hai lệnh này chỉ cần
  vẽ lại thẻ đầu ra, và gói này đã có `renderOutput()` làm đúng việc đó. Kéo cả một hệ giao diện
  sang chỉ để gọi một dòng là vượt xa đề bài.

  Ba chốt từ chối được ghim riêng: **nhiều hồ sơ mà không nêu tên thì TỪ CHỐI** (đoán ở đây là ghi
  đường dẫn của pilot này lên pilot khác) · **hồ sơ đang dùng thì không gỡ được** (gỡ là để lỗi nổ
  giữa một lượt ghi ảnh) · **câu trả lời tự khai `disk_files_deleted: false`** — một lệnh tên
  `remove` phải nói rõ nó xoá cái gì. Ghim: `tests/output-profile-commands.mjs`, đột biến 10/10.

  Cả hai đã có mặt trong CLI (`set-folder-hint`, `profiles-remove`) — thêm lệnh mà không gọi được
  từ dòng lệnh thì bằng không. Đột biến CLI 5/5.
- **đóng khi:** `node scripts/feature-parity.mjs --check` xanh và khối `AUTO:DEBT-METHODS` khai
  "Gemini nợ GPT (0)".

**Đừng gõ lại con số vào đây** — số hiện tại luôn nằm ở khối `AUTO:DEBT-METHODS` trong
[`FEATURE-PARITY.md`](../../../FEATURE-PARITY.md), do máy sinh. Dòng này chỉ để biết *có nợ*.

### ~~G-05~~ · Nhiều ảnh một job — **NGỦ ĐÔNG 06/09, Đức chốt** · có BẪY canh ✅

> **Đức chốt 06/09:** *"case này tôi chưa gặp, bao giờ gặp ta sẽ capture và vá."* Đức đã chạy
> Gemini hàng trăm lượt qua Pilot-04, Pilot-07, Batch-SX-01 — **chưa lần nào** thấy Gemini trả
> hai ảnh trong một câu trả lời. Nên **không xây tính năng**: bên nhánh ChatGPT nó sinh ra vì
> ChatGPT thật sự làm thế, còn xây cho một tình huống chưa ai thấy bao giờ là **tự thêm nợ, không
> phải trả nợ**. Mục này gộp luôn gạch đầu dòng "Nhiều ảnh một job" của `G-06` — một việc, không
> phải hai.
>
> **Nhưng "bao giờ gặp ta sẽ vá" chỉ đúng nếu có thứ gì đó BÁO ĐƯỢC là đã gặp — và trước 06/09
> thì không.** Nếu Gemini trả hai ảnh trong một lượt, job dừng an toàn với
> `AMBIGUOUS_POST_TURN_IMAGE`; nhưng mã đó **cũng** nổ khi có hai lượt riêng, mỗi lượt một ảnh.
> Sổ cái ghi `fresh.eligible: 2` ở **cả hai ca**. Hai nguyên nhân khác hẳn nhau mà nhìn giống
> hệt, nên ca đầu có xảy ra cũng **trôi qua không ai nhận ra**.
>
> **Đã đặt bẫy (06/09):** sổ cái nay ghi thêm `new_assistant_image_counts` — số ảnh **của từng
> lượt**. `[2]` là ca đang chờ bắt · `[1, 1]` là chuyện khác. Ghim:
> `tests/multi-image-tripwire.mjs`, đột biến 5/5 bị bắt. Fail-closed giữ nguyên: mờ thì dừng.
>
> - **mở lại khi:** một file trong `evidence/` có `new_assistant_image_counts` chứa số ≥ 2.
>   Lúc đó mới đọc tiếp phần đo bên dưới — nó vẫn đúng và vẫn dùng được.

**Phần đo cũ, giữ nguyên để lúc mở lại khỏi đo lại từ đầu:**

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

### ~~G-06~~ · Bốn hành vi nhánh ChatGPT có mà Gemini chưa — **ĐÓNG 06/09** ✅

> Hai cái thiếu thật đã port · một cái **báo oan** (gói này đã có sẵn) · một cái **ngủ đông** theo
> chốt của Đức và nằm ở `G-05`. Không còn gạch đầu dòng nào chờ việc.

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
- ~~**Nhiều ảnh một job**~~ **NGỦ ĐÔNG 06/09, Đức chốt** — thiếu thật, nhưng Gemini **chưa bao
  giờ** làm thế. Đây **cùng một việc** với `G-05`, không phải hai. Đã đặt bẫy để lúc nó xảy ra
  thì sổ cái tự khai; chi tiết và điều kiện mở lại ghi ở `G-05`, đừng làm hai lần.
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

### ~~G-07~~ · Poll A/B "thích ảnh nào hơn" — **NGỦ ĐÔNG 06/09, cùng lý do với `G-05`**

`ab-poll-core.js` chỉ có ở nhánh ChatGPT. **Đức chốt 06/09: chưa bao giờ thấy Gemini hỏi lại
kiểu đó.**

**Hai mục này cùng MỘT tiền đề, và đó là lý do một câu trả lời đóng được cả hai.** Chú thích đầu
`ab-poll-core.js` nói thẳng: *ChatGPT đôi khi trả lời MỘT prompt ảnh bằng HAI ảnh cộng một câu
hỏi "bạn thích ảnh nào hơn"; câu hỏi chưa trả lời thì KHOÁ ô soạn, nên job sau treo vĩnh viễn
trong `WAITING_READY`.* Tức "nhiều ảnh một job" và "poll A/B" là **cùng một hành vi trang nhìn từ
hai phía**. Gemini không làm thế thì cả hai đều không có đối tượng.

- **mở lại khi:** hoặc bẫy của `G-05` bắt được `new_assistant_image_counts` ≥ 2, hoặc một job
  treo ở `WAITING_READY` mà `diagnostics.dom_probe` cho thấy nút bấm lạ trong khối `buttons`.
  Cả hai đường đều **0 credit** và đều tự khai — không phải ngồi canh.

### G-08 · Tám module giống hệt từng byte giữa hai nhánh — **[ĐO]**

> **SỬA 07/09 (`claude-gemini-g08`): con số đúng là BẢY, không phải tám.** Đo lại bằng máy — xem dòng đóng ở cuối sổ này.

Danh sách hiện tại ở khối `AUTO:MODULES` trong `FEATURE-PARITY.md`. Dời chúng vào
`workers/_shared/` thì **rủi ro bằng không** và hết cảnh sửa một chỗ quên chỗ kia.

Đây là việc **chung cả hai nhánh**, nên phải giữ `_root` mới làm được — không thuộc riêng sổ
này, ghi lại để không quên.

---

## P2 — Dọn nợ fork (mở 03/09)

### ~~G-12~~ · Soát nốt README từ mục cài đặt trở xuống — **ĐÓNG 06/09** ✅

`README.md` và `AGENTS.md` của gói này là **bản chép nguyên từ gói ChatGPT** lúc fork. Ngày 03/09 phiên `claude-dashboard` sửa những chỗ **có bằng chứng**: tên lấy từ `manifest.json`, tên miền từ mã nguồn, tên script từ `scripts/`, đường dẫn pairing đọc thẳng trong script cài.

Chỗ nặng nhất đã sửa: README ghi thư mục tải về mặc định là `Duc Auto ChatGPT`, còn mã nguồn ghi `Duc Auto Gemini` (đo 4 chỗ) — Đức đọc README là đi tìm sai chỗ.

~~**Còn nợ:** phần README từ mục cài đặt trở xuống chưa soát từng dòng.~~ **XONG 06/09**
(`claude-gemini-hoan-thien`) — soát từng dòng và **đối chiếu với code**, không đọc suông.

**Ba chỗ sai thật, đã sửa:**
1. *"V0.3 also accepts `max_retries`…"* — `V0.3` là số phiên bản của **nhánh ChatGPT**; gói này
   là `0.2.0`. Người đọc sẽ đi tìm một bản Gemini không tồn tại.
2. *"`npm run test:worker` runs only this worker"* — **SAI**. Lệnh đó trỏ vào suite gói ChatGPT.
   Tin nó là chạy nhầm suite rồi kết luận nhánh Gemini xanh trong khi nó chưa chạy dòng nào —
   cùng con bệnh *xanh giả về mặt phủ* của `G-09`. Ghi ra `N-17` ở `BACKLOG.md` gốc repo.
3. Câu *"còn phải dọn hai script ChatGPT trong `scripts/`"* — lạc hậu, `G-13` đã xoá chúng 03/09.

**Ba chỗ nghi sai mà hoá ra ĐÚNG, cố ý không đụng** (đo rồi mới kết luận):
- Tên `templates/Duc-Auto-ChatGPT-Template.xlsx` và `pilot-04/Duc-Auto-ChatGPT-Pilot-04.xlsx` —
  hai file đó **thật sự tên như vậy**, đã `ls` để kiểm.
- Tám giá trị cấu hình (`timeout_sec` 15–900 mặc định 180 · `delay_*` 1–120 mặc định 12/24 ·
  `max_retries` 0–5 mặc định 2 · `safety_cooldown_sec` 0–120 mặc định `6-9` · `max_input_images`
  mặc định 5 trần 10 · `output_folder` mặc định `Duc Auto Gemini` · `continue_on_error` true ·
  `rerun_done` false) — **khớp `runner-core.js` từng cái một.**
- Lệnh CLI viết bằng gạch nối (`queue-list`, `ledger-read`…) — đúng, đó là tên **lệnh CLI**, khác
  tên method Bridge viết bằng dấu chấm. Suýt "sửa" một câu đang đúng.

**Việc phát sinh, đã làm luôn:** hai lệnh Bridge thêm hôm nay (`chat.read`,
`queue.proposal.withdraw`) **chưa có trong CLI**, nên không gọi được từ dòng lệnh. Đã thêm, kèm
một bộ đọc số có trần riêng — bộ dùng chung chặn cứng ở 100 nên `--max-chars 8000` bị từ chối
oan, mà lỗi đó **chỉ nổ khi người dùng gõ đúng thứ tài liệu bảo họ gõ**. Ghim thêm vào
`tests/bridge-cli-smoke.mjs`, đột biến 7/7 bị bắt.

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

- **G-08 · 07/09 (`claude-gemini-g08`) — nửa CHỐNG TRÔI DẠT đã xong, nửa GỘP VÀO `workers/_shared/` vẫn mở.** Đo lại bằng máy: chỉ còn **bảy** module giống hệt (không phải tám) — `xlsx-codec.js` đã **trôi dạt ngày 28/08** và mười ngày không ai hay, đúng cái bệnh mục này nói tới. Đã dựng phép ghim `tests/shared-modules-no-drift-static.mjs`: bảy module lệch một byte là ĐỎ ngay (đột biến 3/3 bị bắt; đổi kiểu xuống dòng CRLF/LF **cố ý** không bị coi là trôi dạt). Việc gộp vào `workers/_shared/` là quyết định kiến trúc chạm cả hai nhánh, cần khoá `_root` và cần Đức chốt — **chưa làm**.
