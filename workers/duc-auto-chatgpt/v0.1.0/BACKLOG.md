# Backlog — Duc Auto ChatGPT

Nơi chứa mọi việc phát sinh mà **không** thuộc checkpoint của phiên đang chạy.

Luật (Đức chốt 2026-08-26): mỗi phiên chỉ đóng **một** checkpoint. Ý tưởng mới
nảy ra giữa chừng thì ghi vào đây, không mở rộng phiên đang làm. Claude là người
chủ động chặn và ghi, không chờ Đức nhắc.

Cách đọc: `P1` = chặn việc khác, làm trước. `P2` = nên làm sớm. `P3` = khi rảnh.
Mục nào xong thì chuyển xuống mục **Đã đóng** kèm số commit.

---

## P1 — Chặn vòng tự hành

### ~~B-01 · Khoá tab lúc Run, không giải lại mỗi lần gửi~~ — ĐÃ ĐÓNG 2026-08-26
`sidepanel.js` `activeTab()` gọi `chrome.tabs.query({active: true, currentWindow: true})`
**mỗi lần gửi message**. Đổi tab giữa chừng là runner âm thầm gõ sang tab khác.
**Có ở CẢ HAI extension** (Gemini `sidepanel.js:2268` giống hệt) → sửa như lỗi lõi chung.
Cần: bind đúng 1 tab id lúc bấm Run, mọi message sau đó chỉ gửi tới tab đó, tab
biến mất thì báo `RECEIVER_LOST` rõ ràng thay vì lặng lẽ đổi mục tiêu.

**Đã làm bên GPT:** `state.boundTabId` + `bindRunTab()` (idempotent, chọn tab MỘT lần,
gọi TRƯỚC `authoritativeValidate()` ở cả `run()` lẫn `bridgeRunTrial()`) + `releaseRunTab()`
trên mọi đường thoát. Audit Antigravity moi thêm **hai lỗ nữa, đều đã vá**:
- **Trôi hội thoại:** cùng tab id nhưng đổi sang `/c/<id>` khác thì chỉ kiểm origin sẽ
  cho qua → gõ prompt vào chat người khác. Nay khoá luôn `boundConversationId`; id chưa
  đặt thì *nhận* hội thoại do chính run tạo ra (`chatgpt.com/` → `/c/<id>` là hợp lệ),
  đặt rồi mà đổi — kể cả quay về trang chat mới — là `RECEIVER_LOST`.
- **Báo động giả lúc đang chuyển trang:** giữa lúc commit, Chrome trả `tab.url` rỗng và
  để đích ở `pendingUrl`. Kiểm origin trên chuỗi rỗng sẽ dừng cứng đúng lúc trang điều
  hướng — mà đó chính là lúc gửi prompt đầu tiên. Nay đọc `tab.url || tab.pendingUrl`,
  và chưa biết địa chỉ thì hoãn phán xét cho ping của content script.
**Bên Gemini vẫn nguyên lỗi** (`sidepanel.js:2268`) → đã ghi vào B-07.

### ~~B-22 · Cùng race G-01 của Gemini: huỷ tới trước job bị `runPrompt()` xoá trắng~~ — **ĐÃ ĐÓNG 2026-09-05, commit `b8ce8ec`**

**Đã vá theo hướng của Gemini nhưng viết lại cho nhánh này:** `STATE.abortedAttempt` nhớ
attempt nào vừa bị dừng; dòng reset đầu `runPrompt()` nay giữ cờ CHỈ khi lệnh huỷ nhắm đúng
attempt đó. Thêm một cửa huỷ ngay đầu khối `try` — huỷ trước là huỷ HẲN, chưa gõ chữ vào
composer. `DAC_ABORT` trần giữ nguyên ngữ nghĩa cũ, và `abortRequested` vẫn dựng lên TOÀN
CỤC nên lệnh dừng lệch danh tính VẪN dừng attempt đang bay (fail-closed). Side panel:
`stop()` và `bridgeRunStop()` gửi kèm `job_id`+`attempt_id`; `run()` kiểm lại
`state.stopRequested` ngay sau `await gateNextJob` và settle trung thực `USER_STOP`.

**Không chép nguyên xi, đúng như cảnh báo cũ:** nhánh này có `flushRunCheckpoint` giữ chỗ
trước khi gửi, nên bất biến "chỉ một `await` từ RUNNING tới send" của Gemini không áp được.
Thay bằng bất biến THỨ TỰ: `attempt_id` + `setCurrent` phải xong trước khoảng flush, để một
Stop rơi vào đó vẫn nêu tên ĐÚNG attempt sắp gửi.

Ghim: `tests/content-abort-race-behavior.mjs` (nạp `content.js` thật trong `node:vm`, DOM giả
dựng theo selector đọc từ chính `provider-adapter.js`, đếm `sendButton.click`, 6 ca) và
`tests/sidepanel-stop-before-submit-static.mjs` (3 nhóm bất biến wiring). Đột biến **9/10 đỏ**.
Ghi trung thực: mutation bỏ dòng dọn `abortedAttempt` trong `finally` **không đỏ** — `attempt_id`
có phần ngẫu nhiên nên không bao giờ lặp, dòng đó là phòng xa và không quan sát được ở ranh
giới này. Giữ lại cho khớp nhánh Gemini, không viết test giả cho nó.

<details><summary>Đề bài gốc</summary>

`content.js:703` mở đầu `runPrompt()` bằng `STATE.abortRequested = false` — **nguyên văn cái
dòng đã gây ra vụ 26/08 bên Gemini** (sổ cái: `STOP_REQUESTED_BEFORE_SUBMIT` 14:20:36 →
`PROMPT_SUBMITTED` 14:20:37). Một `DAC_ABORT` tới TRƯỚC `DAC_RUN_IMAGE_JOB` sẽ bị xoá và
prompt vẫn bay. Đã đọc thẳng dòng code 2026-08-27, không phải dò theo tên.

Gemini đã vá 27/08 (hướng B-refined, Đức duyệt): huỷ theo attempt — `DAC_ABORT` mang
`job_id`+`attempt_id`, `runPrompt()` chỉ giữ cờ cho đúng attempt bị huỷ; kèm recheck
`stopRequested` sau `await gateNextJob` trong runner. Test mẫu:
`workers/duc-auto-gemini/v0.2.0/tests/content-abort-race-behavior.mjs` (nạp content.js thật,
đếm click) và `tests/sidepanel-stop-before-submit-static.mjs`.

**Đừng chép nguyên xi:** nhánh này có `createQueueRunLock`/`tryBeginRun` mà Gemini không có
— chốt khởi động run khác nhau (xem bài học port B-04). Viết lại test race cho DOM ChatGPT
trước, thấy đỏ rồi mới vá.

</details>

### B-28 · Còn HAI đồng hồ nữa vẫn bị Chrome bóp: "Tiếp tục" và cooldown thử lại — **[ĐỌC]**

Cùng gốc bệnh với khoảng nghỉ giữa job (đã vá 2026-08-28), khác vòng lặp. Đọc thẳng code,
không dò tên:

- `sidepanel.js` · `waitWhilePaused()` — `while (state.pauseRequested && !state.stopRequested)
  await sleep(250)`. Panel bị che thì Chrome chỉ đánh thức ~1 lần/phút, nên bấm **"Tiếp tục"**
  có thể mất tới khoảng một phút mới ăn. Không mất dữ liệu, nhưng Đức sẽ tưởng nút chết.
- `sidepanel.js` · `resolveJobFailure()` — `await sleep(retryCooldownMs)`, một giấc dài duy
  nhất. Panel bị che thì nó **dài hơn** cấu hình (bị dồn tới nhịp thức kế tiếp), không ngắn
  hơn — nên KHÔNG phá luật an toàn, chỉ làm dòng "next retry in" hiển thị sai.

Cách vá đã có sẵn và đã kiểm: `interjob-delay-core.js` + `tests/interjob-delay-core-smoke.mjs`.
Vòng "Tiếp tục" thì đúng hơn là **đánh thức bằng sự kiện** (nút bấm resolve một promise) chứ
không phải hẹn giờ — vì thời điểm không đoán trước được.

### ~~B-29~~ · **ĐÃ ĐÓNG 2026-08-28** — đồng hồ chờ trong content script: ĐÃ ĐO 28/08, KHÔNG bị bóp, không cần vá

`content.js:679` — `if (safetyCooldownSec > 0) await sleep(safetyCooldownSec * 1000);` — nghỉ
an toàn 6–9 giây nằm trong **content script của tab chatgpt.com**, không phải trong panel.
Cửa sổ Chrome bị cửa sổ khác che thì trang đó cũng thành "hidden" (Windows có phát hiện
occlusion) → cùng kiểu bóp. `waitForChatReady()` được gọi **hai lần mỗi job** (trước khi gửi
và sau khi có kết quả), nên mỗi job có thể ăn thêm tới ~2 nhịp thức.

Tin được phần nào: mọi vòng dò trong `content.js` (dòng 191, 399, 477, 520, 659) đã dùng
**mốc `Date.now()`**, nên chúng không bao giờ chờ lâu hơn `timeout_sec` — chỉ dò thưa hơn.
Riêng dòng 679 là một giấc ngủ trần, không có mốc.

**ĐÃ ĐO 28/08, và câu trả lời là KHÔNG cần vá — hạ xuống P3.** Trial `trial-e99addeb` chạy với
cửa sổ Chrome **bị che suốt** (Đức xác nhận): nghỉ an toàn cấu hình 6 giây đo được **6,3 giây**.
Không bị bóp.

**Vì sao:** Chrome bóp nặng **chuỗi timer nối nhau** (nesting cao) — đúng hình dạng vòng lặp
12 nhịp `await sleep(1000)` của khoảng nghỉ cũ. Dòng 679 là **một `sleep()` đơn lẻ** gọi từ trong
một message handler, nesting thấp, nên chỉ chịu mức kẹp nhẹ.

**Bài học đáng giữ hơn cả kết luận:** đừng lấy "cooldown vẫn đúng giờ" làm bằng chứng "không bị
bóp" — hai loại timer bị đối xử khác nhau, và chính điều đó làm bug khoảng nghỉ ẩn được lâu.

### B-02 · Selector ChatGPT phải có bằng chứng, không kế thừa
**Đã làm một phần** (`c1e7d04`, `f418bc1`): `assistantMessage`/`userMessage` đã
sửa theo bằng chứng đo được, `conversationRoot` đã bỏ phụ thuộc tên.
**ĐÃ ĐO LẠI TRÊN TRANG THẬT 2026-08-26 — ĐẠT:** `assistantCount` 5,
`imageCandidateCount` **3 → 15** trên trang có đúng 15 ảnh hội thoại (5 ảnh sinh).
Ba nhóm `assistantMessage` / `userMessage` / `conversationRoot` coi như xong.
**Đo tiếp 2026-08-26 GIỮA LÚC một trial đang chạy** (`trial-09c93cd4`) — xác minh thêm:
- `composer` — `#prompt-textarea` => 1, và prompt gửi được thật. **Xong.**
- `stop` — đo đúng lúc đang sinh ảnh: `button[data-testid="stop-button"]` => 1. **Xong.**
  (`button[aria-label="Stop generating"]` => 0 — ChatGPT đã đổi label, entry đó giờ chỉ là dự phòng.)
- `send` / `sendInForm` — **không bao giờ chụp được bằng probe**, kể cả giữa lúc chạy:
  ChatGPT chỉ hiện nút gửi khi ô nhập có chữ, rồi đổi ngay sang nút dừng khi bắt đầu sinh.
  Probe read-only không gõ được nên không bắt được khoảnh khắc đó. **Bằng chứng thay thế:
  trial gửi prompt thành công**, tức `findSendButton()` đã trả về nút thật. Dấu hiệu nhóm
  này chết là **submit thất bại**, KHÔNG phải probe đếm ra 0.

**ĐÃ ĐO 2026-08-26 (Pilot-14, 3/3 SUCCESS) — nhóm cuối cùng đã có bằng chứng, một phần:**
- `attachmentPreview` — **CÒN SỐNG, nhưng chỉ 1 trong 5 mục bắt được.**
  `button[aria-label*="Remove file"]` khớp `=> 2` ở job 2 ảnh và `=> 4` ở job 4 ảnh — số khớp
  **đúng bằng** số ảnh, nên là tín hiệu thật chứ không phải khớp bừa. Bốn mục còn lại
  (`[data-testid*="attachment"]`, `[data-testid*="file-upload"]`, `[data-testid*="upload-preview"]`,
  `button[aria-label*="Remove attachment"]`) **không khớp lần nào** → xem B-14.
- `uploadPending` — **KHÔNG bắt được lần nào**, cả 3 mục, qua 52 lần dò có ảnh đính kèm đang
  hiện trên trang. **Vẫn là mảng chưa đo** → xem B-15.
- `ATTACHING_REFS` — runtime stage lần đầu quan sát được.
- Bằng chứng: `Pilot-14_RefFeatureTest/evidence/watch-run-20260826-1411.jsonl` (976 lần dò)
  và `RESULT-PILOT-14.md`.

### ~~B-03 · Cảnh báo sớm khi selector chết~~ — ĐÃ ĐÓNG `55b47e3`
Vòng 2026-08-26 đốt 6 lượt quota vì retry mù: gửi prompt → không thấy gì → retry
→ lặp lại. Cần một chốt chặn: nếu attempt kết thúc mà `assistant_count_after == 0`
(tức là trang **không có lấy một tin nhắn trả lời nào**), đó không phải "ảnh chưa
ra" mà là "bộ dò đã mù" → dừng cả batch bằng một failure type riêng
(`DETECTION_BLIND` hoặc tương tự), **không retry**. Retry chỉ đúng khi ta có bằng
chứng là trang vẫn đang hoạt động bình thường.

---

### ~~B-13 · Ảnh KHÔNG theo `output_downloads_subfolder`~~ — ĐÃ ĐÓNG 2026-08-26, xác minh live
**Bắt được live 2026-08-26** trong trial `trial-6e73dad2` (2/2 SUCCESS). Đã gọi
`output.configure {output_downloads_subfolder: "DucAuto_GPT-Output/Pilot-11_BoundTab"}`:
- Checkpoint XLSX + audit JSONL → **đúng** thư mục đã cấu hình.
- Ảnh `Q001.png` / `Q002.png` → **sai**, rơi vào `Downloads\Duc Auto ChatGPT\` (mặc định cũ).

**Nguyên nhân, đã truy ra dòng:** `sidepanel.js:4858`
```js
return effectiveOutput.image.kind === "downloads"
  ? window.DacOutputLocation.downloadsLocation(item.settings.output_folder)   // <-- config CŨ
  : effectiveOutput.image;
```
`effectiveOutput.image` đã mang đúng subfolder (do `fromWorkbook` dựng từ
`output_downloads_subfolder`), nhưng dòng này **ghi đè** bằng `item.settings.output_folder` —
khoá `output_folder` đời cũ trong runner config, mặc định `"Duc Auto ChatGPT"`.

**Vì sao đáng sửa sớm:** đây chính là tính năng "AI tự đặt nơi lưu ảnh" của `da3ae83` —
thứ đã bỏ được cú click chọn thư mục ra khỏi vòng tự hành. Nó đang chỉ hoạt động cho
artifact, còn ảnh — thứ Đức thật sự cần — thì không. Mỗi pilot sẽ trộn ảnh vào một
thư mục dùng chung thay vì thư mục riêng của pilot đó.

**Ledger KHÔNG nói dối:** nó ghi đúng đường dẫn thật nơi ảnh nằm. Đây là lỗi "đi sai chỗ",
không phải lỗi "báo cáo sai chỗ" — nhẹ hơn một bậc, nhưng vẫn phá ý đồ.

**ĐÃ SỬA + XÁC MINH LIVE (`trial-5d8abec0`, Pilot-12, 2/2 SUCCESS):**
- **B-13a** `imageLocationFor()` chỉ ghi đè khi **job tự khai** `output_folder` (đọc từ dòng
  XLSX gốc — chỉ dòng đó phân biệt được "job yêu cầu" với "job thừa hưởng mặc định"). Điều kiện
  kiểm khớp **nguyên văn** `runner-core.perJobSettings()` để hai chỗ không trôi khác nhau.
- **B-13b** `write_outcome` giờ so **tên file**, chính xác từng ký tự — đúng vì `conflictAction`
  của Chrome chỉ đổi được tên file, không đổi được thư mục. Thêm trường **mới** `landed_as_requested`
  trả lời riêng câu "có vào đúng chỗ không", khai rõ trong code là **phép so đuôi đường dẫn**
  chứ không phải bằng chứng đường dẫn đã phân giải (Chrome không cho biết thư mục Downloads gốc).
- **`overwritten` không còn tồn tại ở đường Downloads.** Tải xong với chính sách ghi đè chỉ chứng
  minh Chrome *được phép* ghi đè, không chứng minh có file nào bị thay — khai một lần ghi đầu tiên
  thành "đã phá bằng chứng cũ" là cùng loại nói dối. Đường ghi thư mục dò trước được nên vẫn giữ
  `overwritten`; đường này không dò được nên không nói. Bất đối xứng có chủ đích.
- Đo được sau khi sửa: ảnh nằm đúng `Pilot-12_OutputRouting`, audit ghi
  `write_outcome=written; landed_as_requested=true` (trước đó luôn là `uniquified` sai).
- Audit Codex 3 vòng, PASS. Hai vòng đầu ép tách `overwritten` và tách hai sự thật ra hai trường.


### B-14 · `attachmentPreview` đang đứng trên MỘT mục, và mục đó là nhãn tiếng Anh
Đo live 2026-08-26 (Pilot-14): trong 5 mục của nhóm, chỉ `button[aria-label*="Remove file"]`
khớp. Bốn mục `data-testid` **không khớp lần nào** — chúng là di sản kế thừa, không phải
bằng chứng. Nên nhóm này thực chất là một selector, và nó dựa vào `aria-label` **tiếng Anh**:
ChatGPT đổi nhãn, hoặc Đức đổi ngôn ngữ giao diện, là mù.

Đã có tiền lệ y hệt trong repo này: `button[aria-label="Stop generating"]` từng chết và phải
đổi sang `data-testid="stop-button"`.

Cần: đo lại bằng `dom_probe` **giữa lúc gắn ảnh** để tìm một mục neo theo cấu trúc (không theo
chữ), rồi thêm vào nhóm. Đừng xoá mục đang chạy được. Bốn mục chết thì giữ làm dự phòng cũng
vô hại, nhưng phải ghi rõ trong `provider-adapter.js` là chúng **chưa từng khớp trên trang thật**,
để phiên sau không tưởng nhóm này có 5 lớp bảo vệ trong khi thật ra có 1.

Lưu ý giảm nhẹ: lớp chặn "ảnh tham chiếu bị nhận nhầm thành ảnh sinh" **không** phụ thuộc riêng
mục này — `content.js:237` còn hai tín hiệu độc lập (`role === "user"`, khớp theo tên file), và
`attachmentContainer` dùng `form` trần nên miễn nhiễm với đổi nhãn. Nên đây là rủi ro *chẩn đoán*,
không phải rủi ro *an toàn*.

### B-15 · `uploadPending` chưa từng khớp — có thể nó không tồn tại
Đo live 2026-08-26 (Pilot-14): cả 3 mục (`[data-testid*="uploading"]`, `[aria-busy="true"]`,
`[role="progressbar"]`) **không khớp lần nào** qua 52 lần dò có ảnh đính kèm đang hiện.

Chưa kết luận được là "selector chết" hay "ChatGPT không có dấu hiệu upload-đang-chạy".
Hai khả năng cần phân biệt vì cách xử lý khác nhau:
1. Ảnh nhỏ (11–28KB) upload xong quá nhanh để dò kịp → thử lại với ảnh 2MB (như ảnh thật của
   Pilot-08) sẽ có cửa sổ dài hơn.
2. DOM không có dấu hiệu nào như vậy → nhóm này nên bị bỏ, và chỗ nào dựa vào nó phải đổi sang
   chờ `attachmentPreview` đủ số ảnh.

**Đừng viết code dựa trên nhóm này** cho tới khi phân biệt được. Hiện nó là niềm tin, không phải
bằng chứng.

### ~~B-16~~ · **ĐÃ ĐÓNG 2026-09-06** — `MISSING_REFERENCE` bị bọc thành `INTERNAL_ERROR`
Bắt được live 2026-08-26: gọi `jobs.add` với token ảnh chưa có file trả về
`INTERNAL_ERROR` / `retryable: false`, còn nguyên nhân thật
(`MISSING_REFERENCE: Q001 requires 'REF-A-RED-CIRCLE.png'`) chỉ hiện trong `details.debug` —
mà debug chỉ bật khi Chế độ phát triển đang BẬT.

"Chưa nạp ảnh tham chiếu" là **điều kiện người sửa được**, đúng ra phải là `VALIDATION_FAILED`
kèm câu chỉ đường tới `references.add`. Cùng họ với **B-11** (`run.trial` không có workbook).
Sửa chung một lượt thì hợp lý: cả hai đều là `prepare()` nổ bên trong mutation rồi bị bọc.

**ĐÃ VÁ 2026-09-06 — một chỗ, không phải mỗi handler một chỗ.** Đo lại thì cả hai đúng là chung
gốc: gốc là `bridgeError()` trong `sidepanel.js` chỉ nhận ra `BridgeProtocolError` và
`ProposalError`, còn lại giặt hết thành `INTERNAL_ERROR`. Vá ở đúng chỗ đó —
`classifyPlainFailure()` trong `bridge-core.js`, gọi TRƯỚC nhánh giặt trắng.

**Vá cả họ, không vá mỗi cái backlog gọi tên.** `prepare()` ném ra SÁU lỗi cùng hình dạng và
cùng đường đi: `MISSING_REFERENCE` · `AMBIGUOUS_REFERENCE` · `DUPLICATE_REFERENCE` ·
`DUPLICATE_ALIAS` · `MAX_INPUT_IMAGES` · `INVALID_TASK_TYPE`. Vá đúng một cái là để năm anh em
còn lại nguyên bệnh.

**KHÔNG đụng `retryable`.** `INTERNAL_ERROR` và `VALIDATION_FAILED` đều `retryable:false`, nên
bản vá chỉ đổi *mã và câu chỉ đường*. Danh sách sáu mã là **liệt kê từng cái**, cố ý: luật
"cứ `CHỮ_HOA:` là lỗi người sửa được" sẽ gắn nhãn người-sửa-được cho một bug nội bộ thật và đẩy
chữ nội bộ tuỳ ý ra dây.

**Ghim:** `tests/bridge-plain-failure-classification-smoke.mjs` — **không grep mã**, nó CẮT chính
hàm `bridgeError()` đã ship ra khỏi `sidepanel.js` rồi CHẠY trong `node:vm`, ở **cả hai** trạng
thái công tắc Chế độ phát triển (vá mà chỉ chạy khi công tắc BẬT là không vá gì cả — người vận
hành thật chạy với công tắc TẮT). Suite **108/108 xanh**. **8/8 đột biến đỏ**, gồm cả cái độc
nhất: **dời lời gọi xuống SAU nhánh giặt trắng** — chữ còn nguyên, hành vi chết. Đột biến đầu tiên
tôi thử (dời lên trên `console.error`) **lọt lưới**, và đúng: nó không phá gì cả. Ghi lại vì một
lượt "đột biến xanh" đọc gần y hệt một lượt "ghim yếu".

### ~~B-18~~ · **ĐÃ ĐÓNG 2026-08-26** — `references.add` buộc gọi 3 bước: đã cân nhắc, CHỌN giữ nguyên
Audit Antigravity 2026-08-26 nêu: trên GPT phải gọi `jobs.add` → `references.add` → `jobs.update`,
trong khi Gemini cho `references.add` → `jobs.add`. Đã phân tích và **quyết định giữ nguyên**;
audit vòng 2 đồng ý.

Vì sao không sửa: `executeBridgeDirectMutation` của GPT **checkpoint mọi direct mutation**, còn
`DacXlsx.createWorkbook` đòi tối thiểu 1 job — nên `references.add` không thể tự dựng session mà
không bịa ra một job giả. Gemini làm được chỉ vì handler của nó **không** nằm trong transaction
checkpoint.

Lý do mạnh nhất để KHÔNG bắt chước Gemini (của auditor, mạnh hơn lập luận ban đầu của tôi):
miễn checkpoint thì agent nạp được tới 5 ảnh (~3,5MB), nhận `ok: true`, mà **không có dòng audit
nào** — panel reload là ảnh bay mất, không dấu vết. Đổi một lần gọi RPC bằng việc phá tính đồng
nhất của lớp bảo vệ là lỗ.

Đã ghi thứ tự gọi vào `README.md`. Nếu sau này 3 bước gây khó thật, hướng đúng là **làm cho
session chưa có job vẫn checkpoint được**, KHÔNG phải miễn checkpoint cho method này.

### ~~B-17 · Trần 90 giây của `run.trial` KHÔNG đủ cho việc thật~~ — **ĐÃ ĐÓNG 2026-09-07**
Đo live 2026-08-26 (Pilot-14): thời gian gửi → phát hiện ảnh tăng theo số ảnh tham chiếu —
**40 giây** (1 ảnh), **61 giây** (2 ảnh), **68 giây** (4 ảnh), với prompt *ngắn* (~200–300 ký tự).

Job thật của Pilot-08 là **4 ảnh + prompt 3.825 ký tự**. 68 giây đã chỉ còn dư 22 giây.
Khả năng cao vượt 90.

Hệ quả vận hành, không phải bug: **việc thật không chạy được qua `run.trial`**, vì
`capTrialTimeouts` từ chối mọi giá trị trên 90 (`bridge-core.js`, `capSec > 90` throw). Việc
thật phải do Đức bấm Run với `timeout` của workbook (Pilot-08 đặt 900).

Cần cho AI Control trọn vẹn: một đường để AI mở run **không bị cap 90 giây**. Đây là
**đổi luật an toàn** (`run.start` đang nằm trong `POLICY.prohibited_methods`) → **phải hỏi Đức**,
không tự làm. Ghi ở đây để không trôi.

Trong lúc chưa có: khi báo cáo một job chết ở mốc ~90 giây qua `run.trial`, phải nói rõ đó là
**giới hạn đường trial**, đừng để nó bị đọc thành lỗi tính năng.

- ~~**Chờ Đức chốt:** có mở một đường cho AI tự khởi động run mà không bị trần 90 giây không — đây là đổi luật an toàn nên AI không tự quyết.~~ **Đức đã chốt 2026-09-07 ([ADR-0015](../../../docs/adr/0015-nang-tran-duong-thu-len-900-giay.md)): nâng trần `run.trial` lên 900 giây, `run.start` VẪN CẤM.** Nới đúng cái đo được — 900 là timeout của chính workbook Pilot-08 — chứ không mở đường cho AI tự tiêu credit. Chi tiết ở mục "Đã đóng" cuối file.

### ~~B-19 · "Thử lại" KHÔNG chỉ giới hạn ở lỗi trước lúc gửi — cần Đức chốt luật~~ — **ĐÃ ĐÓNG 2026-09-06**

> **Đức chốt 06/09, nguyên văn:** *"Sau khi đã gửi, chỉ được gửi lại khi đối soát khẳng định
> được là lượt gửi đó không tạo ra kết quả nào. Không khẳng định được thì DỪNG và hỏi người."*
> Đức bác cả hai phương án cũ trong sổ ("giữ nguyên" và "chặn hẳn") vì cả hai hành động mà
> không cần biết sự thật.
>
> **ĐÃ ĐO trước khi vá** — chính chỗ mục này để ngỏ: lớp đối soát trong run
> (`reconcileSubmittedAttempt` → `DAC_RECONCILE_IMAGE_JOB` → `waitForCompletion` lần hai) có
> **đúng một** phán quyết dương, *"có ảnh quy được về attempt này"*, và phán quyết đó rẽ thẳng
> sang `finishDetectedOutput()` chứ không bao giờ tới đường thử lại. Ba lối ra còn lại —
> transport chết (đối soát **không chạy**) · lệch danh tính (đối soát **từ chối** chạy) · hết
> giờ không thấy gì — đều là "không chứng minh được". `verifyExistingOutput()`, hàm duy nhất
> phán được *"ảnh này thuộc lượt gửi kia"*, có **0** chỗ gọi trên đường chạy tự động; nó chỉ
> chạy khi người vận hành bấm nút. **Số ca đối soát khẳng định được: 0** → luật của Đức thu
> về đúng "chặn hẳn sau khi đã gửi", và brief đã ghi sẵn tình huống này nên không hỏi lại.
>
> **Đã làm:** `submissionMayExist()` trong `runner-core.js` là chỗ duy nhất trả lời *"lượt gửi
> này có thể đã bay chưa"* (phase đã sau lúc gửi, **hoặc** cờ `submission_uncertain` còn bật);
> `canRetry()` từ chối khi nó đúng; `resolveJobFailure()` cho những ca đó vào nhánh
> `markInterrupted` + dừng batch, **không** phải `FAILED` (resume-core đọc `FAILED` là
> `SAFE_FAILED` = bỏ qua an toàn). Vòng chạy **bật** cờ ở mốc đặt chỗ gửi — ghi trước khi
> prompt có thể bay — và chỉ **tắt** khi receiver trả lời đúng danh tính attempt này và nói
> nó chưa gửi: đó là chỗ đảo mặc định từ "không biết thì gửi lại" sang "không biết thì DỪNG".
> Lỗi **trước** lúc gửi không đổi một chữ. Ghim:
> `tests/post-submit-no-resend-smoke.mjs`, 8/8 đột biến đỏ. Quyết định: ADR-0047.

### B-19 (nguyên văn mục cũ, giữ để tra bối cảnh)
Phát hiện 2026-08-26 khi đối chiếu bảng tính năng trên dashboard với code.

Dashboard (và cả cảm nhận chung) ghi: *"sau khi gửi thì không bao giờ tự gửi lại"*.
Đọc code thì **không đúng**. `canRetry` (`runner-core.js:134`) chỉ loại
`HARD_STOP_FAILURE_TYPES` (4 loại) + `USER_STOP`. Nên `TIMEOUT_AFTER_SUBMIT`,
`POST_SUBMIT_UNCERTAIN`, `OUTPUT_AMBIGUOUS` **đều retry được**, và `resolveJobFailure`
khi retry đặt lại `attempt_phase: "PRE_SUBMIT"` + `status: "PENDING"` → **prompt bay lần nữa**.

**Bằng chứng mạnh nhất nằm trong chính comment của code** (`runner-core.js:115`):
`DETECTION_BLIND` phải tách thành hard stop riêng vì bộ dò mù *"luôn CŨNG trông như timeout,
và xếp nó thành timeout sẽ đẩy nó trở lại đúng đường retry mà nó tồn tại để chặn"*. Tức đường
retry-sau-khi-gửi là **có thật**, và B-03 chỉ bịt đúng một cửa của nó.

**Chưa truy hết, nói rõ:** chưa lần đủ để biết reconciliation có chặn phần lớn ca post-submit
trước khi tới retry hay không. Nên **không gọi đây là bug**. Có thể "gửi lại một job mất trắng"
là đánh đổi có chủ đích và `max_retries` là dây cương.

Việc cần làm: **Đức chốt**, vì đây là *đổi luật an toàn* (mục 2.4 của `AGENTS.md`). Hai đường:
giữ nguyên và ghi rõ thành luật, hay chặn hẳn retry sau khi đã gửi. Không tự làm.

### B-20 · Tính năng "tên gọi ngắn cho ảnh mẫu" (alias) là CODE CHẾT ở cả hai worker
Đo 2026-08-26. `alias` được gán ở **đúng hai chỗ** trong toàn bộ worker GPT, và **cả hai đều
gán chuỗi rỗng**: `sidepanel.js:2888` (đường picker) và `sidepanel.js:2998` (`references.add`).

- `renderReferenceGallery` chỉ dựng `<img>` + nút xoá — **không có ô nhập alias**;
  `file.alias` chỉ được *đọc* làm tooltip.
- **Không có cột alias** trong schema XLSX.
- Nhánh khớp theo alias trong `resolveReferences` đòi `key &&` khác rỗng → **không bao giờ chạy**.
- Gemini cũng không có UI đặt alias.

**`README.md:74` khai sai:** "gallery with **editable aliases** and remove controls".

Hai đường: **bỏ** (xoá nhánh alias khỏi `resolveReferences` + sửa README + sửa schema doc), hay
**nối** (thêm ô nhập vào gallery). Bỏ thì rẻ và làm code nói thật; nối thì thêm tính năng thật.
Dashboard đã sửa ô này thành "chưa có" ở cả hai bên.

### B-21 · `DAC_XLSX_RUN_PLAN_V1.md` còn tả HAI đường cứu, thực tế chỉ nối MỘT
Đo 2026-08-26. Dòng 34 của file đó mô tả `AMBIGUOUS_SUBMITTED` có hai đường thoát:
**Resolve Existing Output** hoặc **Recreate Image**.

Thực tế: `resolveExistingOutput` khai một lần ở `sidepanel.js:3797`, **không ai gọi**, và
`sidepanel.html` có **0** nút cho nó. `README.md:66` đã ghi rõ nó là code chết từ thiết kế
hai-nút cũ và dặn "đừng tài liệu hoá hay dựa vào nó cho tới khi được nối lại có chủ đích".

Nên `DAC_XLSX_RUN_PLAN_V1.md` là **hợp đồng schema đang nói sai** — nguy hơn README nói sai, vì
nó là file mà `AGENTS.md` chỉ AI đọc để hiểu schema. Sửa: hoặc ghi rõ đường thứ hai chưa nối,
hoặc bỏ khỏi hợp đồng.

### ~~B-27 · Câu trả lời text dài hơn một ô Excel~~ — **ĐÃ ĐÓNG 2026-09-06, Đức chốt KHÔNG CẦN**
Đức đã chốt (A) giữ nguyên ngày 2026-08-28: vượt 32.767 ký tự thì dừng batch và **không lưu gì**.
Đo được: trial live dài 180/178/177 ký tự — **dưới 1%** giới hạn, vì prompt của Đức có `BUDGET: 35 w`.

**Đừng tự làm sớm.** Chỉ mở lại khi Đức bỏ giới hạn độ dài trong prompt và thật sự cần câu trả lời dài.
Khi đó làm phương án (C), KHÔNG phải (B): lưu đầy đủ ra một file `.txt` riêng, ô Excel ghi tên file đó.
Lý do chọn (C) chứ không cắt bớt: một ô Excel nhìn như đầy đủ mà thiếu đuôi là đúng kiểu lỗi mà
project này cấm — người đọc không có cách nào biết. Kèm theo: file `.txt` sinh thêm thì cần luật
dọn giống B-26, đừng quên phần đó khi ước lượng công.

**ĐÓNG 2026-09-06.** Hỏi Đức đúng câu ở trên. Đức trả lời: **"không cần"** — không có ý định bỏ
dòng giới hạn số từ trong prompt. Nên hành vi hiện tại (vượt trần thì dừng cả mẻ, không lưu gì)
**giữ nguyên**, và mục này đóng **không viết một dòng code nào**.

Đóng vì **chưa từng xảy ra**, không phải vì đã sửa: giới hạn 32.767 ký tự, câu trả lời thật đo được
177–180 ký tự — cách xa **180 lần**. Làm phương án (C) lúc này là viết mã cho một ca chưa tồn tại.

Toàn bộ thân mục ở trên **giữ nguyên từng chữ**, kể cả lý do chọn (C) chứ không chọn (B). Ngày nào
Đức bỏ dòng giới hạn số từ thì mở lại mục này — chữ đã có sẵn, không phải nghĩ lại từ đầu. Điều kiện
mở lại, viết ra để đo được: **prompt của Đức không còn dòng giới hạn số từ**, hoặc một lượt chạy thật
gặp câu trả lời vượt 32.767 ký tự.

### ~~B-26 · Mỗi job đẻ ra 3 file XLSX — cần luật DỌN, không phải bớt checkpoint~~ — **ĐÃ ĐÓNG 2026-08-28**

> **Đã làm:** `checkpoint_retention` (mặc định 2). Sau mỗi checkpoint đã ghi VÀ đã xác minh, các bản cũ hơn N bản mới nhất bị xoá. Mở lại side panel thì đọc lại lịch sử tải của Chrome, nên rác của phiên trước cũng được dọn — nhưng CHỈ khi phiên mới thật sự ghi thêm một checkpoint; mở lên rồi không chạy gì thì không dọn gì. Đức chốt phương án xoá thật, thay cho luật `superseded/` ngày 24/08 — xem `decisions.md`. Ghi chú đo được bên dưới giữ nguyên vì nó giải thích VÌ SAO không được ghi ít checkpoint đi.
Đức phát hiện khi chạy trial thật: thư mục output đầy file `__results__vNN.xlsx`.

**Đo thật** trên run `Quick-2026-08-28T02-46` (3 job text, đều SUCCESS): **10 file XLSX**.
Đọc `__audit.jsonl`, đúng **3 checkpoint mỗi job**, cộng 1 bản lưu cuối lúc kết thúc run:

| # | Vì sao ghi | File |
|---|---|---|
| 1 | `Pre-send reservation for Q001` | `v01` |
| 2 | `Text response checkpoint for Q001` | `v02` |
| 3 | `Completion interval reached after Q001` | `v03` |

Quy mô: pilot 66 job → khoảng **200 file**. Đó là con số cần nhìn trước khi bàn.

**Cái bẫy — đã kiểm, đừng rơi vào:** phản xạ đầu tiên là nâng `checkpoint_interval_jobs` cho bớt
file thứ 3. **SAI.** Mở v02 và v03 ra so:

```
v02  Q001  status=RUNNING  attempt_phase=OUTPUT_SAVED  persistence_verified=false
v03  Q001  status=SUCCESS  attempt_phase=SUCCESS       persistence_verified=true
```

`v03` là file **đầu tiên trên đĩa** nói job đã xong và đã xác minh. Bỏ nó thì có một cửa sổ thời
gian mà đĩa vẫn khai job đang chạy dở — Chrome sập đúng lúc đó, resume sẽ xếp
`AMBIGUOUS_SUBMITTED` và mời operator "tạo lại" một câu trả lời đã nằm an toàn trên đĩa.
**Cả ba checkpoint đều mang trạng thái khác nhau. Không cái nào thừa.**

Nên đây **không phải bug**, mà là hệ quả của một luật an toàn đang chạy đúng: mỗi checkpoint là
một file mới, bất biến (`immutable_result_checkpoints` là FEATURE Bridge công bố;
`assertCheckpointVersionAvailable` chủ động từ chối ghi đè một version cũ). Bất biến là để một
lần ghi hỏng giữa chừng không bao giờ phá bản tốt trước đó.

Cũng đã kiểm và **bác** một hướng nữa: bind thư mục thật (thay vì Downloads) **không** giúp gì —
`persistLedgerCandidate` bump version rồi mới ghi, ở **cả hai** chế độ. Vẫn ra `vNN`.

**Việc cần làm là luật GIỮ/DỌN (retention), không phải bớt checkpoint:** giữ N bản mới nhất, xoá
những bản đã bị một bản mới hơn *đã xác minh* thay thế. Câu phải trả lời khi làm: resume/scan có
cần bản cũ không, hay chỉ cần bản version cao nhất — chưa kiểm, đừng đoán.

**CHƯA LÀM, và phải hỏi Đức trước** vì đụng đúng hai luật của chính Đức: (a) *"Đổi luật an toàn
(… persistence …)"* — mục 2 `AGENTS.md` gốc; (b) *"Xóa file"* — luật gốc `CLAUDE.md`.

### ~~B-23 · `response_sha256` được GHI nhưng KHÔNG bao giờ được KIỂM~~ — **ĐÃ ĐÓNG 2026-09-05, commit `c9829f9`**

**Đã vá, nhưng KHÔNG bằng cách đổi cả chuỗi hàm sang async** như mục này dự báo: `plan()` được
gọi từ 14 chỗ trong `sidepanel.js`, đổi hết là một diện tích rủi ro lớn cho một phép so sánh nhỏ.
Thay vào đó băm TRƯỚC một lượt (`DacResumeCore.verifyResponseHashes(workbook, hashText)`,
bất đồng bộ), cất phán quyết vào một `WeakMap` khoá theo chính workbook, rồi
`validSavedAttribution`/`classify` đồng bộ đọc lại phán quyết đó. Hash LỆCH luôn trượt, kèm mã
riêng `RESUME_RESPONSE_HASH_MISMATCH`.

**WeakMap chứ không phải một trường trên job, và đó là điểm mấu chốt:** trường trên job có thể bị
codec ghi ngược ra XLSX, và lúc đó người sửa file chỉ cần thêm một cột để tự cấp cho mình dấu đạt.

Cửa gánh nằm ở `authoritativeValidate()` — chỗ hẹp nhất mà MỌI đường chạy đi qua (nút Run **và**
`run.trial` của Bridge), đặt TRƯỚC phép kiểm blocker nên một ô bị sửa rớt theo đúng đường
`RESUME_BLOCKED` sẵn có, không thêm cổng thứ hai. Cùng phép băm ở Check Plan để bảng không nói
"xanh" rồi nút Run mới nói "chặn".

**Phạm vi nói thật:** khi CHƯA băm lại, nhánh text rơi về phép kiểm hình dạng cũ (đủ cho bảng hiển
thị) — không run nào khởi động được trên hàng text chưa băm lại, vì cửa trên là bắt buộc. Nhánh
**ảnh vẫn không** có kiểm toàn vẹn nội dung (nó chỉ so tên file xin với tên file nhận); đây không
phải bước lùi, và cũng không phải việc của lượt này.

Ghim: `tests/resume-response-hash-verification.mjs` — nạp `resume-core.js` **và** `bridge-core.js`
thật vào `vm` với WebCrypto thật của Node, băm bằng CHÍNH `DacBridgeCore.hashText`. 6 nhóm, đột
biến **7/7 đỏ**.

<details><summary>Đề bài gốc</summary>

Tìm ra bởi Pass B độc lập 2026-08-28 (F-1), đã kiểm chứng lại bằng mắt trong code.

`resume-core.js` (nhánh `text_reasoning` của `validSavedAttribution`) chỉ kiểm **hình dạng**
của chuỗi hash (`/^sha256:[A-Za-z0-9_-]{20,}$/`), không hề băm lại `response_text` để so.
Nghĩa là: nếu ai đó mở Result XLSX bằng Excel, sửa một chữ trong ô câu trả lời mà **giữ nguyên
số ký tự**, hàng đó vẫn được xếp `SAFE_COMPLETE`. Hash nằm đó như một con số trang trí.

**Chưa sửa trong phiên 28/08, và đây là lựa chọn có chủ ý:** SHA-256 trong trình duyệt là hàm
**bất đồng bộ**, còn `validSavedAttribution`/`classify` là hàm **đồng bộ** và được gọi từ rất
nhiều chỗ. Sửa cho đúng phải đổi cả chuỗi hàm đó sang async — đó là việc riêng, không phải việc
nhét kèm vào bản vá text.

Cần nói cho công bằng: nhánh ảnh **cũng không** có kiểm toàn vẹn nội dung (nó chỉ so tên file
xin với tên file nhận). Nên đây **không phải là bước lùi** so với ảnh, và Acceptance Contract của
run 28/08 cũng chỉ yêu cầu *ghi* trường count/hash chứ không yêu cầu kiểm lúc resume.
Tóm lại: `response_sha256` hiện là **dấu vân tay để đối chiếu về sau**, KHÔNG phải chốt chống sửa.
Đừng viết tài liệu nào nói ngược lại.

</details>

### B-24 · `resolveExistingOutput()` là code chết, và nếu nối lại sẽ phá hợp đồng text
Pass B 2026-08-28 (F-7), đã tự kiểm: `grep` ra **đúng 1 lần** trong `sidepanel.js` (chính dòng
định nghĩa nó) và **0 lần** trong `sidepanel.html` — không ai gọi.

Hàm này là đường đối chiếu ảnh thủ công: nó gọi `saveGeneratedImage` và
`DAC_MANUAL_RECONCILE_EXISTING_OUTPUT` mà **không hề kiểm `task_type`**. Hôm nay vô hại vì chết.
Nhưng ngày nào có người nối lại nút bấm vào nó, một job text sẽ bị đánh dấu SUCCESS kèm một
`result_file` ảnh — âm thầm phá đúng cái luật mà bản vá 28/08 vừa dựng lên.
Có sẵn từ trước, không phải do bản vá này sinh ra. Sửa: hoặc xoá hẳn (quyền của Đức), hoặc chèn
một chốt `task_type === "text_reasoning" → throw` ngay bây giờ, trước khi ai đó nối lại.

### B-25 · Câu lỗi lúc recreate vẫn là tiếng Anh — luật vàng số 4 nói phải tiếng Việt
Pass B 2026-08-28 (F-4, phần chưa sửa hết). Phiên 28/08 đã sửa cho mấy câu này **đúng loại việc**
(text thì nói "text response", ảnh thì nói "image"), nhưng vẫn để **tiếng Anh**:
`RECREATE_PERSISTENCE_REQUIRED`, `RECREATE_COMPLETION_UNVERIFIED`, `OUTPUT_LOCATION`.

Luật vàng số 4 của package: chữ operator nhìn thấy phải tiếng Việt, chỉ mã lỗi (CODE) mới tiếng
Anh. Không sửa trong phiên 28/08 vì **toàn bộ hàng xóm xung quanh cũng đang tiếng Anh** — sửa lẻ
một chỗ thì thành chắp vá, mà sửa hết là một việc riêng. Nên gom thành một lượt: rà hết câu lỗi
`throw new Error("CODE: ...")` mà operator thật sự đọc được, dịch phần sau dấu hai chấm.

---

## P2 — Vận hành & đồng bộ

### B-06 · Cơ chế đồng bộ & cross-check GPT ↔ Gemini
Đo 2026-08-26: **86% code chung**, nhưng lệch sai chỗ ở `bridge-core.js` (84%),
`image-evidence-core.js` (52%), `checkpoint-core.js` (79%), `output-profile-core.js` (62%).
Hai bridge đang thiếu method của nhau (GPT thiếu `references.add`; Gemini thiếu
`output.set_folder_hint`, `profiles.remove`, `queue.proposal.withdraw`).
Ba bước, tăng dần, **không gộp hai extension làm một**:
1. Một file spec hợp đồng bridge v1 + test conformance chạy cho **cả hai** worker.
   Lệch mà không khai báo ngoại lệ → test đỏ.
2. Báo cáo lệch tự động: in bảng % chung mỗi lần chạy test, cảnh báo có tên khi
   một file lõi chung tụt dưới ngưỡng. **Lưu ý kỹ thuật: GPT dùng LF, Gemini dùng
   CRLF** — script phải chuẩn hoá xuống dòng, nếu không mọi file đều báo lệch 100%.
3. Dời dần lõi chung vào `workers/_shared/`, bắt đầu bằng **8 file đang giống hệt
   nhau 100%** (rủi ro bằng không vì không sửa dòng logic nào).

### B-07 · Port ngược sang Gemini — danh sách chờ
Ghi ngày để không trôi:
- **2026-08-25** wave A/B-poll + multi-image (`image-evidence-core.js` hai bên đang
  52% giống nhau vì wave đó chỉ làm bên GPT). Gemini sớm muộn cũng gặp nhiều ảnh một lượt.
- **2026-08-26** `DETECTION_BLIND` — Gemini cũng retry mù được y hệt.
- **2026-08-26** `run.stop` + `chat.reload` — **wave đã xong bên GPT, sẵn sàng port.**
  Kèm cảnh báo về lỗi nuốt lệnh dừng (xem `decisions.md`). **Đã kiểm, KHÔNG phải
  copy y nguyên:** `approval-persistence-core.js` của Gemini chưa có `tryBeginRun`
  (chưa có lớp latch A6), và `sidepanel.js:4341` của nó xoá `stopRequested` ngay
  cùng dòng đặt `running = true`. Tức là bản vá của GPT không dán thẳng sang được
  — phiên nào port phải tự phân tích cửa sổ await của Gemini trước. (Gemini đang
  có chủ là phiên `claude-gemini`; phiên này chỉ đọc, không sửa.)
- **2026-08-26** khoá tab B-01 — Gemini dính y hệt (`activeTab()` giải lại mỗi lần gửi).
  Kèm cả hai lỗ audit tìm thêm: khoá hội thoại, và `pendingUrl` lúc đang chuyển trang.
- ~~Chiều ngược lại: GPT còn thiếu `references.add` của Gemini.~~ — **ĐÃ ĐÓNG 2026-08-26**,
  port sang GPT và **xác minh live** (Pilot-14, 3/3 SUCCESS). Không dán y nguyên: GPT giữ
  `workbookRequired: true` (máy `executeBridgeDirectMutation` của GPT đòi có session) và khai
  **không idempotent** (gọi lại cùng tên là *thay thế* ảnh). Trần và tên trường audit copy
  đúng Gemini để bước 1 của B-06 không phải hoà giải gì.

---

## P3 — Dọn dẹp

### B-10 · `run.status` cũng đang trả `current` cũ khi rảnh
Phát hiện 2026-08-26 khi sửa `run.stop` (cùng gốc, lỗi có sẵn từ trước, **không phải
do wave này gây ra**). `state.currentItem` chỉ bị xoá lúc nạp workbook và lúc nạp
resume — **không bao giờ xoá khi run kết thúc**. Nên `bridgeRunStatus` trả
`state: "IDLE"` nhưng vẫn kèm `current: {job_id, phase…}` của run trước.
**BẮT ĐƯỢC TẬN TAY 2026-08-26** sau khi `run.stop` dừng `trial-09c93cd4`: cùng một thời
điểm, `run.status` trả `state: "IDLE"` nhưng vẫn kèm
`current: {job_id: "Q001", phase: "SUBMITTED", runtime_stage: "GENERATING"}`, còn `run.stop`
(đã vá) trả sạch `null`. Hai method đọc cùng một biến, một cái nói sai một cái nói đúng.
Đỡ nguy hiểm hơn `run.stop` (trường `state` vẫn nói đúng, bên gọi đọc kỹ thì không
sai), nên chưa sửa trong wave này. Hai cách: gộp theo `state.running` ngay trong
`bridgeRunStatus` (1 dòng, an toàn), hoặc xoá `state.currentItem` lúc run kết thúc
(sạch hơn nhưng **phải kiểm UI trước** — `queueElapsed` và `renderRuntime` đang đọc
nó để hiển thị job vừa xong).

### B-12 · Cổng kiểm KHÔNG chặn commit lẫn file của phiên khác — (việc ở GỐC REPO)
**Không sửa được từ package này** (`_root` đang do phiên `claude-gemini` giữ) → ghi ở đây
để Đức và phiên giữ gốc thấy.

Xảy ra thật 2026-08-26: Claude chạy `git add -A` và cuốn 3 file đang sửa dở của
`workers/duc-auto-gemini` vào commit của mình. `session-check.mjs` vẫn báo **XANH TOÀN BỘ**,
vì nó chỉ *loại* package của phiên khác khỏi phần đánh giá ("KHÔNG tính cho bạn") mà **không
kiểm nội dung commit**. Đã tự phát hiện và sửa (`reset --soft` + `restore --staged`, chưa
push nên không ảnh hưởng ai; hash file của Gemini xác minh nguyên vẹn).

`safe-push` bắt đúng chuyện này ở tầng push — nhưng đó là **chốt cuối**. Nếu Đức đồng ý
`--carry` cho một lý do khác thì file lẫn kia sẽ đi luôn mà không ai thấy.
Đề xuất thêm 1 phép kiểm vào cổng: **commit của phiên này không được chứa đường dẫn thuộc
package có chủ khác** (đọc `.agents/claims.json`, so với `git show --name-only` các commit
chưa push của mình). Rẻ, và đúng loại "luật nào không kiểm được bằng máy thì sớm muộn cũng bị
bỏ qua".

### B-30 · Cổng kiểm bắt oan phiên này vì **file rác ở gốc repo của phiên khác** — (việc ở GỐC REPO)

Gặp thật 2026-08-28. Phiên `claude-chatgpt-interjob-delay` chỉ sửa trong package của mình,
nhưng cổng kiểm vẫn **ĐỎ** mục "Phạm vi trách nhiệm":

> File gốc repo bị sửa nhưng không ai đứng tên.

Thủ phạm là 4 file **chưa track** ở gốc, do phiên khác để lại và có từ trước khi phiên này
mở: `drafts/ORCH-01-EVIDENCE.md`, `drafts/ORCH-01B-EVIDENCE.md`,
`drafts/PLATFORM-AI-ORCHESTRATOR-STUDY-V2.md`, `drafts/PLATFORM-AI-ORCHESTRATOR-STUDY-V3.md`.

Bế tắc là thật, không phải lười: muốn xanh thì phải **claim `_root`** (cần Đức duyệt) hoặc
**xoá file người khác** (luật cấm). Nên một phiên hoàn toàn ngoan vẫn không thể đóng phiên
đúng luật.

Cùng họ với B-12 (cổng phân trách nhiệm theo package nhưng gộp mọi file gốc thành một rổ).
Đề xuất: `rootTouched` **chỉ tính file đã track bị sửa**, còn file chưa track ở gốc thì báo
riêng thành cảnh báo có tên phiên nghi vấn — chứ không chặn. Lý do: một phiên không thể chịu
trách nhiệm cho file nó không tạo và không được xoá.

### B-31 · Harness "chatgpt.com giả lập" để đo đường chạy END-TO-END — việc RIÊNG, đừng nhét vào fix nhỏ

Luật vàng số 8 đã cho phép harness Chrome thật với trang chatgpt.com giả lập. Phiên 28/08 đã
dựng được **một nửa**: nạp extension thật vào Chrome thật bằng CDP (`Extensions.loadUnpacked`
— lưu ý `--load-extension` đã **chết** ở Chrome 151, phải dùng CDP kèm
`--enable-unsafe-extension-debugging`), mở `sidepanel.html` thật thành tab ẩn, và gọi thẳng
module trong đó. Script còn ở scratchpad của phiên; hình dạng đã kiểm.

Còn thiếu để đo end-to-end: chặn `https://chatgpt.com/*` bằng `Fetch.enable` và trả về DOM
giả khớp selector của `provider-adapter.js`, nạp workbook, cấu hình output. Đó là **một
checkpoint riêng**, không phải phần phụ của một fix nhỏ — dựng nửa vời sẽ nuốt trọn một phiên.
Giá trị: đo được khoảng nghỉ + cooldown + phát hiện kết quả trên đường chạy thật mà không
tốn lượt ChatGPT và không cần tay Đức.

### ~~B-11 · `run.trial` không có workbook bị bọc thành `INTERNAL_ERROR`~~ — **ĐÃ ĐÓNG 2026-09-06**

> **Đức chốt 06/09: CHO thử lại.** `run.trial` gọi khi chưa nạp workbook thì agent được phép
> thử lại (`retryable: true`, giống `run.status`) — vì đây là lỗi người sửa trong năm giây.
> **Đã làm:** một lời gọi `requireBridgeWorkbook()` (helper có sẵn) đặt ngay TRƯỚC
> `authoritativeValidate()` trong `bridgeRunTrial()`. `WORKBOOK_NOT_LOADED` vốn đã khai
> `retryable: true`, nên không mã mới, không luật mới. Đặt SAU `bindRunTab(...)` là cố ý: cửa
> lease của phiên-theo-tab phải trả lời trước. Câu chữ người vận hành thấy ở nút Chạy không
> đổi. Ghim: `tests/run-trial-workbook-not-loaded-smoke.mjs`, 2/2 đột biến đỏ. ADR-0048.

### B-11 (nguyên văn mục cũ, giữ để tra bối cảnh)
Đo 2026-08-26: gọi `run.trial` khi chưa nạp workbook trả về `INTERNAL_ERROR` /
`retryable: false`, còn nguyên nhân thật ("Open an XLSX workbook first" từ
`authoritativeValidate`) chỉ hiện trong `details.debug` — mà debug chỉ bật khi Chế độ phát
triển đang BẬT. Đây là **điều kiện người sửa được**, đúng ra phải là `WORKBOOK_NOT_LOADED` /
retryable như `run.status` đang làm. Cùng hạng với phát hiện cũ "RUN_ACTIVE bị gắn retryable
cho trạng thái chỉ người sửa được". `jobs.add` đã có đường bootstrap nên không dính;
`run.trial` thì chưa.

**ĐO LẠI 2026-09-06 — CÙNG GỐC VỚI B-16 MỘT NỬA, VÀ CHỜ ĐỨC CHỐT NỬA CÒN LẠI.**

*Cùng gốc:* đúng, cả hai đều là `Error` trần rơi vào **cùng một chỗ giặt trắng** —
`bridgeError()` trong `sidepanel.js`. Chỗ đó **đã vá** cùng lượt với B-16, nên cơ chế nhận
diện đã có sẵn, không phải dựng lại.

*Không cùng gốc:* hai chỗ khác nhau ở hai điểm, nên **một dòng bảng không đóng được B-11**.
1. Lỗi của B-16 mang tiền tố mã (`MISSING_REFERENCE:`); câu của B-11 là
   `"Open an XLSX workbook first."` — **không có mã nào để nhận ra**, phải gắn mã ở chỗ ném
   (`sidepanel.js:4432`, trong `authoritativeValidate` — mà hàm này còn phục vụ cả nút Chạy
   của panel, không riêng Bridge).
2. **Đây mới là chỗ chặn thật:** mã đúng theo chính mục này là `WORKBOOK_NOT_LOADED`, và mã đó
   `retryable: true`. Hôm nay `run.trial` trả `retryable: false`. Nên vá B-11 là **lật
   `retryable` false → true trên dây** — chạm **luật retry**, mà `AGENTS.md` gốc mục 2 bắt
   **hỏi Đức trước**. B-16 không dính vì `VALIDATION_FAILED` và `INTERNAL_ERROR` cùng
   `retryable: false`.

Không tự lật. Câu cần Đức chốt, một câu: *`run.trial` gọi khi chưa nạp workbook thì agent được
phép thử lại (`retryable: true`, giống `run.status` đang làm) — đúng hay không?* Chốt rồi thì
phần code còn lại là nhỏ, cơ chế đã đứng sẵn.

### B-08 · Chuyển text anchor của poll A/B vào adapter
`ab-poll-core.js` đang giữ cả *chính sách* (random/click_1/... — trung tính) lẫn
*text anchor* của ChatGPT (riêng nhà cung cấp). Anchor nên nằm trong
`provider-adapter.js`, chính sách ở lại. Hoãn tới sau khi selector đã xác minh
xong, để lần bóc tách này vẫn là "không đổi hành vi".

### B-09 · Rác test trong thư mục output — **ĐÃ CÓ PROTOCOL 2026-09-06**, chờ tay Đức bấm @Đức:bấm

**Đức yêu cầu 06/09:** *"bạn cứ lập protocol xoá cho tôi, sau này tôi cũng không biết là gì rồi nó
chất đống ở đấy."* Đã làm: `scripts/don-rac-tai-xuong.mjs` + `tests/don-rac-tai-xuong-smoke.mjs`.
Luật vận hành: mục **Protocol dọn rác tên-GUID** trong [`AI-OPERATOR-GUIDE.md`](AI-OPERATOR-GUIDE.md).

**Đo thật 06/09** trên thư mục Tải xuống của Đức — **39 file tên GUID / 170 file**, chia ba nhóm
theo **độ chắc của bằng chứng chủ sở hữu**, không theo hình dạng tên:

| Nhóm | Số | Là gì |
|---|---:|---|
| ① chứng minh được là của gói | **16** (187,8 KB) | sổ audit và file đo — nội dung mang cả `timestamp` lẫn `event`, hoặc khoá `probe` |
| ② không chứng minh được chủ | **21** (27,0 MB) | ảnh `.png` và workbook `.xlsx` — đúng hình dạng đầu ra, nhưng ảnh PNG nào cũng là PNG. Đòi một cờ riêng |
| ③ được bảo vệ, không cờ nào xoá được | **2** | một `.pdf` và một `.jpg` — **là file THẬT của Đức** |

Hai file ở nhóm ③ là **lý do công cụ này không lọc theo tên**: trang web nào tải blob về cũng được
Chrome đặt tên GUID, nên một bộ lọc khớp tên sẽ xoá chúng, và xoá là không hoàn lại được.

**Còn chờ Đức:** chính lúc bấm xoá. AI không tự xoá file — luật gốc của Đức. Công cụ **mặc định
chỉ xem**, chạy bao nhiêu lần cũng không đụng file nào.

**Ba bug thật bị bắt trước khi Đức chạy**, ghi ra vì cả ba cùng một họ với bài học `B-36`:

1. Bốn khẳng định **tĩnh** trên mã nguồn báo **ĐỎ OAN** — chúng thấy chữ `khong-phai` nằm gần
   `unlinkSync` và kết luận nhóm ③ ở trong đường xoá, trong khi đó là dòng *báo cáo*. Đã đổi sang
   kiểm **hành vi**: chạy công cụ thật vào thư mục tạm rồi xem file nào còn trên đĩa.
2. Phép ghim hành vi bắt được ngay: `main()` **không bao giờ chạy** từ dòng lệnh, vì mốc
   `import.meta.url` ghép chuỗi tay mà đường dẫn repo có **dấu cách** (`%20` so với dấu cách thật).
   Bốn khẳng định tĩnh vừa bị thay thế thì không thấy gì cả.
3. Lượt chạy thật đầu tiên bắt được: dòng đầu của một sổ audit **dài hơn** đoạn đầu file được đọc,
   nên `JSON.parse` ném và **12 sổ audit thật** bị xếp vào nhóm được bảo vệ — nhóm ① chỉ còn 4 thay
   vì 16. Hỏng an toàn, nhưng nó vô hiệu hoá cả công cụ. Đã đổi sang nhận theo **chữ ký**, miễn
   nhiễm với việc chuỗi bị cắt.

**Thử phá: 7/9 bị bắt.** Hai lượt thoát là **tương đương hành vi** — mỗi cái bị lớp còn lại chặn —
và **lượt gộp cả hai thì ĐỎ**. Ghi trung thực thay vì làm tròn thành 9/9.
`Downloads\Phai sinh\DucAuto_GPT-Output\Pilot-10_Trial-Tu-Hanh` còn checkpoint và
audit của các phiên hỏng (`Bridge-2026-08-25T07-25*`, `Bridge-2026-08-26T01-56*`).
Xoá là quyền của Đức — **AI không tự xoá file**.

---

## Câu hỏi còn treo, chưa đủ dữ kiện để quyết

- ~~**Q-01 · Ảnh ChatGPT "không hiển rõ & tốt"**~~ — **ĐÃ TRẢ LỜI 2026-08-26.**
  `dom_probe` đo được: `complete: true`, `naturalWidth: 1254`, render 600×600.
  Ảnh hoàn toàn bình thường, không liên quan tới lỗi dò. Loại khỏi diện nghi vấn.
- **Q-02 · Ngưỡng 90 giây của trial có còn hợp lý không?** Vòng 2026-08-26 mỗi
  attempt chạy ~150 giây (90s dò + ~60s reconcile) mới chịu thua. Chưa biết ChatGPT
  thật sự sinh ảnh mất bao lâu vì bộ dò mù suốt. Đo lại sau khi selector đã đúng.

---

## Phiên kế tiếp

1. **Chạy pilot thật đầu tiên** (không phải trial 2 job nữa). Toàn bộ nền đã xác minh live:
   selector đúng, tab+hội thoại khoá, ảnh vào đúng thư mục, ledger không nói dối,
   `DETECTION_BLIND` chặn retry mù, `run.stop`/`chat.reload` để cứu. Giữ `max_retries: 0`
   cho lần đo đầu, rồi mới nới. — bước 4 trong thứ tự Đức đã chốt, và giờ mới
   thật sự an toàn để chạy: selector đã đo đúng, `DETECTION_BLIND` chặn retry mù,
   `run.stop`/`chat.reload` có sẵn để cứu, và tab đã bị khoá nên không gõ nhầm chat.
   **Cần một lần reload extension trước.**
3. **B-06 — đồng bộ GPT ↔ Gemini** (bước 2 của Đức, bị hoãn hai lần). **Lưu ý về quyền:**
   việc này đụng file ở GỐC REPO và cả package Gemini — cả hai đang do phiên
   `claude-gemini` giữ. Phải hỏi Đức điều phối hai phiên, hoặc chờ phiên kia trả package.
   Đây chính là lý do phiên 26/08 (tối) làm B-01 trước thay vì B-06.
4. Dọn: B-09 (rác test — quyền xoá của Đức), B-11, B-10, B-08.

**Rác của phiên 2026-08-26 (chiều)** — ở `Downloads\Phai sinh\DucAuto_GPT-Output\Trial-RunStop-20260826`:
checkpoint `Bridge-2026-08-26T06-32__results__v01..` + audit của `trial-09c93cd4`. Job Q001
mang trạng thái `INTERRUPTED` là **đúng thiết kế** (prompt đã gửi rồi mới dừng), không phải lỗi.
Gộp vào B-09 khi Đức muốn dọn.

## P2 — Còn mở sau phiên 2026-09-02

### ~~B-32 · Nghiệm thu `messageSample` trên trang thật~~ — ĐÃ ĐÓNG 2026-09-02
Đức reload extension xong, chạy lại `dom-probe` trên `anhducds_multi work flow`:
`messageSampleDiag.status: "OK"` · `matched: 10` · `with_text: 4` · `txtHead` có chữ tiếng
Việt có dấu của trang · trường cũ `articleSample` đã biến mất khỏi payload · `served_by`
xác nhận đúng nhãn. Bằng chứng thô: `evidence-dom-probe-message-sample-20260902/`.

Còn **hai** profile chưa nghiệm thu (`Bình`, `kaito`) — cùng một extension nên cùng bản mã,
không coi là việc mở. Ai chạy tiếp thì probe thêm, tốn 0 credit.

### B-33 · Ba nhánh kia có cùng lỗi selector chết trong `dom_probe` không?
Lỗi #5 là **hai bản copy của một selector trôi xa nhau** — một dạng lỗi không đặc thù
ChatGPT. Worker `duc-auto-gemini` và `duc-auto-gg-flow-video` cũng có `diagnostics.dom_probe`
học từ cùng một khuôn. Chưa kiểm. Ngoài phạm vi phiên này (gói khác, chủ khác).
Việc cần làm: với mỗi nhánh, tìm trường nào trong payload có **chữ của trang**, rồi kiểm
xem selector dựng nó có còn khớp gì trên trang thật hay không.

### B-34 · (P3) Gom điều khiển transport về MỘT hàng đợi điều khiển / transportEpoch
Gợi ý MED của GPT (audit 03/09, sau khi đọc thiết kế workspace): pairing change, reconnect,
đổi nhãn, gắn/gỡ phiên đều chạm cùng vòng đời socket, hiện được trị bằng BỐN hàng đợi +
đóng-đồng-bộ tại chỗ (`pairingWork`, `workspaceWork`, `instanceWork`, per-seat state) — mỗi
race đã có pin riêng (22 mutation đỏ + 3 vòng audit Codex xác nhận). Một `controlQueue` +
`transportEpoch` thống nhất sẽ ĐẸP hơn về kiến trúc nhưng là viết lại file transport đã tôi
luyện — làm khi có lý do mạnh hơn "gọn", và làm như một brief riêng có audit riêng. KHÔNG
nhét vào fix nhỏ.

### B-35 · (P2) N run đồng thời theo phiên — tách hàng đợi / run-state / ledger
ADR-0046 đã duyệt "cả hai chiều", nhưng miếng exact-once này cần brief + test ghim + audit
riêng (đúng ghi chú trong chính ADR). Gồm: mỗi phiên một RUN_ACTIVE + ledger namespace,
attribution gắn theo tab, GPT invariant "page-scoped vs session-scoped" (mục 6 sổ tay) sẽ
đổi nghĩa khi đó. Làm xong trên GPT rồi mới nghĩ tới migrate.

### B-36 · (P1) `PERSISTENCE_FILENAME_MISMATCH` chặn MỌI mutation Bridge khi đích ghi là Chrome Downloads — **VẪN MỞ. Đã vá cả (A) và (D) ngày 07/09 theo ADR-0049 (suite 115/115, thử phá 15/17) · CHƯA NGHIỆM THU LIVE, và điều kiện đóng là lượt live đó · lần vá 04/09 đã nghiệm thu và THẤT BẠI, đừng đọc lần này thành xong**

> **Đọc một dòng cho nhanh (viết 06/09, `claude-don-so`).** Mục này **vẫn mở, vẫn P1.** Đã thử vá
> 04/09, đã nghiệm thu live 04/09, và **bản vá không giữ được** — file thứ 37 vẫn ra tên GUID.
> Rồi một phép đo trong console service worker cùng ngày lật ngược chẩn đoán: phiếu giữ tên **đã
> bị tiêu**, tức determiner có khớp và có đề xuất, mà **Chrome bỏ qua đề xuất**. Lỗi nằm **ngoài**
> logic khớp của extension. Bản vá **giữ lại** (nó bịt hai đường mất tên thật có trong mã, 8/8
> mutation ghim) nhưng **đừng đọc nó thành đã sửa B-36**. Việc còn lại: **một phép đo đọc-thuần**
> mô tả ở cuối mục — tạo blob ngay trong service worker để biết `filename` có được tôn trọng
> không. **Không vá tiếp trước khi có con số đó.**
>
> *Tiêu đề mục này ghi "ĐÃ VÁ … CHỜ NGHIỆM THU LIVE" cho tới 06/09, tức đọc lướt là tưởng chưa ai
> thử. Nghiệm thu đã chạy hai ngày trước đó và đã hỏng. Thân mục bên dưới giữ nguyên toàn bộ —
> cả bản vá, cả hai giả thuyết đã bị bác, cả lần tôi kết luận sai.*

**Triệu chứng.** `jobs.add` qua Bridge trả `INTERNAL_ERROR`, stack:

```
PERSISTENCE_FILENAME_MISMATCH: requested 'Bridge-2026-09-03T12-46__audit.jsonl'
  but Chrome reported 'bd00d527-e43a-4806-bb1b-df5c59f6aa19'.
  verifyDownloadedFilename (output-location-core.js:223)
  saveAuditLog (sidepanel.js:5230)
  persist_audit (sidepanel.js:1642)
  execute (approval-persistence-core.js:13)
```

**Phạm vi rộng hơn nó trông.** `persist_audit` nằm trong `approval-persistence-core` — tức
**mọi** mutation Bridge ghi sổ audit TRƯỚC khi có tác dụng (luật "quy trách nhiệm"). Nên khi
đích ghi rơi về Chrome Downloads, không chỉ `jobs.add` chết mà cả `jobs.update` ·
`jobs.remove` · `queue.propose` · `output.configure`… Đo được: sau lỗi này `queue.list` trả
`WORKBOOK_NOT_LOADED`, tức job **không** vào hàng đợi — fail-closed đúng, không mất dữ liệu.

**Vì sao phép kiểm hiện có không bắt.** Có ba file test nhắc tới determiner
(`download-name-determiner-static.mjs` · `persistence-download-filename-regression.mjs` ·
`bridge-workspace-lease-race-smoke.mjs`) nhưng cái canh đúng chỗ này là **test TĨNH**: nó
`assert.match` hình dạng mã — determiner có đăng ký, có khớp `expectedDownloadNames.get(item.url)`,
có `suggest({filename, conflictAction})`. **Hình dạng vẫn đúng nguyên** mà GUID vẫn lọt. Đúng
bài học lỗi #5 của sổ tay: trường quan trọng được canh bằng thứ không phân biệt được hai nhánh.

**Cơ chế, đọc ra từ mã (03/09) — hẹp hơn "determiner hỏng":** nó nổ ở ĐÚNG cửa bootstrap.
`bridgeJobsAdd` (`sidepanel.js:1716`) đặt `persistenceRequired: !bootstrap` — chủ ý là lần gọi
đầu chưa có đích ghi nên đừng đòi. **Nhưng cái cờ đó chỉ đi vào `bridgeDirectLock`, tức chỉ tắt
một phép KIỂM TRƯỚC; nó không tắt việc ghi.** `DacApprovalPersistence.execute` vẫn chạy
`persist_audit` (`:1641`) vô điều kiện. Cộng với `:1629` — session bootstrap tự mặc định
`outputSettings` về **chế độ Downloads** (quyết định của Đức 25/08) — nên lần gọi đầu tiên luôn
đi qua đúng nhánh Chrome Downloads, tức đúng nhánh cần determiner. Determiner trượt → GUID →
`verifyDownloadedFilename` ném.

Nói cách khác: **tên cờ nói "không cần ghi bền", hành vi là "vẫn ghi, và ghi vào nhánh mong
manh nhất".** Đó là chỗ phải sửa, không phải chỗ nào khác.

**BẰNG CHỨNG TRÊN ĐĨA — nó CHƯA TỪNG hoạt động.** Đếm file tên-GUID trong thư mục Downloads
của Đức, 03/09: **36 file**, rải từ 09/07 tới 00:29 ngày 04/09. Gồm cả ba loại đầu ra của
extension: ảnh `.png`, checkpoint `.xlsx`, và sổ audit (không đuôi, vì Chrome không biết
`application/jsonl`). Có file ngày **28/08 — SAU khi B-13 được ghi vào "Đã đóng" là đã vá**.
Đọc nội dung `bd00d527-e43a-4806-bb1b-df5c59f6aa19` (793 byte): JSONL audit hoàn toàn đúng,
`event: BRIDGE_JOB_ADDED_DIRECT`, `run_id: 20260903-1246-…`. **Nội dung luôn đúng; chỉ cái tên
bị Chrome tự đặt.** Nên đây không phải lỗi mới của phiên này, mà là một lỗi sống 8 tuần bị ba
phép kiểm TĨNH che: chúng `assert.match` rằng *mã có chứa dòng đăng ký determiner*, không chứng
minh determiner **chạy**. `?.addListener` còn làm im lặng luôn trường hợp API không tồn tại.

**Còn hai giả thuyết cho việc determiner trượt** (cần console service worker, tức cần Đức):
0. ~~API không tồn tại nên `?.` bỏ qua êm.~~ **ĐÃ LOẠI, đo 03/09** — Đức chạy trong console
   service worker: `{api: 'object', listener: true}`. API có, listener CÓ đăng ký. Nên determiner
   chạy mà **trượt lúc khớp**, không phải không chạy. Giữ dòng này lại để không ai đi kiểm lại.
1. `item.byExtensionId` không bằng `chrome.runtime.id` khi download do CHÍNH service worker
   khởi tạo → nhánh `suggest()` trần chạy → Chrome dùng tên mặc định = GUID của blob URL.
2. `item.url` lúc determiner chạy khác chuỗi blob URL dùng làm khoá Map → `get` trả undefined
   → cùng nhánh `suggest()` trần.

**Vòng tròn kẹt trong UI, đo 03/09:** đường đi vòng là chọn thư mục đích, nhưng panel ghi
"Open an XLSX to set locations" — không có session thì không chọn được thư mục, mà `jobs.add`
(cửa dựng session qua Bridge) thì đang chết vì chính lỗi này. Lối ra duy nhất không cần sửa mã
là **Quick Prompt** trên panel (`:3554` cũng gọi `createWorkbook`), nó dựng session bằng tay
để mở khoá ô chọn thư mục.

Comment ở `background.js:25` đã ghi số đo 2026-08-25: "Chrome trên máy này bỏ qua `filename`
cho blob URL". Bản vá là determiner. Nay determiner có mà GUID vẫn qua → **bản vá có lỗ**,
không phải Chrome đổi hành vi.

**Đường đi vòng KHÔNG cần sửa mã** (đã dùng để mở nghẽn 03/09): Đức chọn một thư mục đích
trong Side Panel. Khi đó `saveAuditLog` đi nhánh `writeFileWithPolicy(location.handle, …)` —
File System Access, không qua Chrome Downloads, determiner không nằm trên đường. Đây cũng là
cấu hình mà chính mã khuyến nghị ("Continue using the authorized run folder").

**ĐÃ VÁ 2026-09-04 — và cách phát biểu bản vá quan trọng hơn bản vá.** Tôi *không* đo được
Chrome đang kích nhánh nào; đo được là **mã có HAI nhánh im lặng mất tên**, và cả hai đều dựng
nổi ca hỏng. Nên không cần biết Chrome cư xử ra sao mới gọi cả hai là lỗi: im lặng mất tên của
một download do chính mình khởi tạo là lỗi ở cả hai nhánh.

Bản vá đổi **bằng chứng sở hữu**: từ `item.byExtensionId` sang **phiếu giữ tên**. Phiếu khớp URL
là bằng chứng mạnh hơn — chỉ extension này tạo nổi một blob URL trên origin của nó, và phiếu chỉ
được trồng ngay trước `downloads.download`, trong cùng một lượt. Tra phiếu TRƯỚC, nhường chỉ khi
không có phiếu dùng được. Thêm một nhánh đi vòng hẹp cho trường hợp Chrome báo lại URL lệch: chỉ
nhận khi đủ ba điều — blob trên origin của chính mình, còn đúng MỘT phiếu còn hạn, phiếu cũng
trỏ vào origin ấy. Nhiều phiếu thì nhường, vì đoán là gán tên của job này cho file của job kia.

**Một phép kiểm cũ phải viết lại, và đó là bài học riêng.** `download-name-determiner-static.mjs`
khẳng định determiner PHẢI chứa `item.byExtensionId !== chrome.runtime.id` — nó ghim CÁCH LÀM, mà
cách làm chính là con bug. Vá xong là nó đỏ: **một phép kiểm khẳng định sự tồn tại của bug là một
bức tường chặn đường sửa bug.** Đã viết lại thành bất biến sống được qua bản vá (sở hữu do phiếu
quyết định · phải còn đường nhường · KHÔNG được quay lại gác bằng `byExtensionId`), và dời phần
kiểm KẾT QUẢ sang phép kiểm hành vi. Suite 103 → **104/104**, 8/8 mutation đỏ.

**NGHIỆM THU LIVE 2026-09-04: BẢN VÁ KHÔNG GIỮ ĐƯỢC. VẪN HỎNG.** Đức reload, panel về trạng
thái trống nên `jobs.add` tự mặc định về chế độ Chrome Downloads — đúng nhánh cần đo. Kết quả:

```
PERSISTENCE_FILENAME_MISMATCH: requested 'Bridge-2026-09-03T18-41__audit.jsonl'
  but Chrome reported '16f87e2b-3d75-4a5d-9cee-884f1c7b732a'
```

Số file GUID trong Downloads: **36 → 37**. Nội dung file vẫn đúng (793 byte, `run_id`
`20260903-1841-…`). Nên hai giả thuyết tôi mô hình hoá (byExtensionId trống · khoá URL lệch)
**không phải nguyên nhân**, hoặc không phải nguyên nhân duy nhất.

Bản vá vẫn giữ, vì nó bịt hai đường im lặng mất tên **thật có** trong mã và có 8/8 mutation
ghim — nhưng nó **không** là bản vá cho B-36. Đừng đọc nó thành đã sửa.

**Ba khả năng còn lại, và một phép đo đọc-thuần phân biệt được cả ba** (chạy trong console
service worker, không tạo file mới, không tác dụng phụ):

```js
({ patched: typeof takeExpectedDownloadName,
   tickets: [...expectedDownloadNames].map(([u, v]) => [u, v.filename]) })
```

| Kết quả | Nghĩa |
|---|---|
| `patched: "undefined"` | reload không nạp mã mới → phép đo live vừa rồi vô nghĩa, đo lại |
| `patched: "function"`, `tickets: []` | phiếu ĐÃ bị tiêu → determiner có khớp, có đề xuất, **mà Chrome bỏ qua đề xuất**. Lớp lỗi hoàn toàn khác: nghi determiner của một extension khác (Gemini / Flow, cùng mã) thắng theo luật "extension cài sau thắng", hoặc Chrome không nhận đề xuất cho blob URL |
| `patched: "function"`, `tickets` còn 1 dòng | determiner **chưa bao giờ khớp** → nó không được gọi cho download này |

**ĐO XONG 2026-09-04 — Ô THỨ HAI: `{patched: 'function', tickets: []}`.**

Mã đang chạy LÀ bản vá, và phiếu giữ tên **đã bị tiêu** trong khi file trên đĩa mang tên
`16f87e2b-…`. Phiếu bị tiêu chỉ có thể nghĩa là determiner đã khớp và đã gọi
`suggest({filename})`. Nên: **determiner được gọi, có đề xuất, và Chrome BỎ QUA đề xuất.**

Lỗi không nằm trong logic khớp của extension. Nó nằm ngoài.

**Một câu SAI trong mã là thứ đã nuôi bug này 8 tuần.** `background.js` ghi *"A filename
determiner has final say"*. Số đo bác bỏ. Câu đó chỉ determiner ra làm chỗ sửa, nên một file
GUID trên đĩa đọc thành *"determiner cần chỉnh"* thay vì *"determiner không được tuân"*. Đã
thay bằng số đo, và ghi rõ lý do giữ nguyên đoạn đính chính: người sau thấy GUID không được
phải suy lại từ đầu.

**Ứng viên nguyên nhân còn lại, và phép đo phân biệt nó.** Blob được tạo ở **side panel**
(`sidepanel.js:5221`) rồi CHUỖI url được truyền sang service worker, nơi `downloads.download`
chạy. Blob URL gắn với ngữ cảnh tạo ra nó. Nội dung file vẫn đúng nên blob giải được — nhưng
việc ĐẶT TÊN có thể không. Đo bằng cách tạo blob NGAY TRONG service worker (không trồng phiếu,
để determiner nhường, cô lập đúng hành vi của tham số `filename`):

```js
const url = URL.createObjectURL(new Blob(["{}
"], { type: "application/jsonl" }));
const id = await chrome.downloads.download({ url, filename: "B36-probe__audit.jsonl", conflictAction: "overwrite", saveAs: false });
await new Promise((r) => setTimeout(r, 1500));
(await chrome.downloads.search({ id }))[0].filename
```

| Kết quả | Nghĩa | Việc phải làm |
|---|---|---|
| kết thúc bằng `B36-probe__audit.jsonl` | blob tạo TRONG service worker thì `filename` được tôn trọng | **Vá được, và hẹp:** truyền BYTES sang service worker thay vì chuỗi blob URL; tạo blob tại đó |
| lại là GUID | `filename` bị bỏ qua cho mọi blob URL, và determiner cũng bị bỏ qua → **Chrome Downloads không đặt tên nổi artifact của extension này** | Thôi phụ thuộc Chrome Downloads cho artifact. Đường File System Access đã đo là chạy (`checkpoint.verified: true`). Nhưng đổi mặc định bootstrap (`sidepanel.js:1629`) là đổi một quyết định Đức chốt 25/08 → **hỏi Đức** |

**Không vá tiếp trước khi có con số đó.** Vá mò lần nữa là thêm mã vào chỗ không hỏng — đã làm
đúng chuyện đó một lần ở vòng này rồi.

**Làm xong nghĩa là gì.** Một phép kiểm **hành vi** (không phải tĩnh) dựng nổi cả hai giả
thuyết: fake `chrome.downloads` phát `onDeterminingFilename` với `byExtensionId` sai, và với
`item.url` lệch — cả hai phải làm test ĐỎ trước khi vá. Harness đã có sẵn:
`bridge-workspace-lease-race-smoke.mjs` chạy `sidepanel.js` thật trong vm.

**PHÉP ĐO ĐÃ CHẠY 2026-09-06 — và nó BÁC hàng thứ nhất của bảng trên. Đọc trước khi vá.**

Đức dán đoạn đo vào console service worker. Kết quả:

```
TypeError: URL.createObjectURL is not a function
```

**Không phải gõ sai, không phải phép đo hỏng.** Service worker của Manifest V3 **không có**
`URL.createObjectURL`. Nên hàng thứ nhất của bảng ngay trên — *"truyền BYTES sang service
worker thay vì chuỗi blob URL; tạo blob tại đó"* — **không thực hiện được**, không phải "chưa
làm". Giữ nguyên bảng đó ở trên để thấy tôi đã dự đoán sai chỗ nào; đừng đi theo hàng một.

Hệ quả: `sidepanel.js:5254` tạo blob ở side panel **vì đó là chỗ duy nhất tạo được**, không
phải vì ai chọn sai chỗ. Kiến trúc hiện tại bị ép, không phải bị lơ là.

**Một quan sát khớp với triệu chứng, chưa phải kết luận** — hai tên rác đã ghi nhận
(`bd00d527-e43a-4806-bb1b-df5c59f6aa19` và `16f87e2b-3d75-4a5d-9cee-884f1c7b732a`) có **đúng
hình dạng đoạn cuối của một blob URL**. Tức Chrome có thể đang lấy đoạn cuối địa chỉ blob làm
tên file, thay vì dùng `filename`. [DÒ] — phải kiểm lại trước khi hành động.

**Phép đo kế, thay cho phép đo đã bị bác — cùng đoạn mã, chạy ở CONSOLE CỦA SIDE PANEL.**
Chỗ đó có DOM nên `URL.createObjectURL` tồn tại. Nó phân biệt được điều mà phép đo cũ định
phân biệt, bằng một trục khác: **gọi `downloads.download` từ CHÍNH ngữ cảnh tạo ra blob**,
thay vì chuyển chuỗi địa chỉ sang service worker rồi gọi ở đó.

```js
(async () => {
  const want = "B36-probe-panel__audit.jsonl";
  const url = URL.createObjectURL(new Blob(['{"probe":"B36-panel"}'], { type: "application/jsonl" }));
  const id = await chrome.downloads.download({ url, filename: want, conflictAction: "overwrite", saveAs: false });
  await new Promise((r) => setTimeout(r, 1500));
  const item = (await chrome.downloads.search({ id }))[0];
  console.log("KET QUA: xin =", want, "| Chrome dat =", item.filename);
  return item.filename;
})()
```

| Kết quả | Nghĩa | Việc phải làm |
|---|---|---|
| tên đúng như đã xin | `filename` **được tôn trọng khi gọi từ cùng ngữ cảnh** với blob. Đường chuyển-chuỗi-sang-service-worker mới là chỗ hỏng | **Vá được và hẹp:** gọi `downloads.download` ngay trong side panel, bỏ chặng chuyển tiếp `DAC_DOWNLOAD_ARTIFACT`. Cẩn thận: determiner vẫn phải trồng phiếu như cũ, và `waitForCompletedDownload` đang ở service worker |
| lại là tên rác | `filename` bị bỏ qua cho **mọi** blob URL của extension, ở mọi ngữ cảnh → **thư mục Tải xuống không đặt tên nổi artifact của gói này** | Thôi phụ thuộc Chrome Downloads cho artifact. Đường File System Access đã đo là chạy (`checkpoint.verified: true`). Đổi mặc định bootstrap (`sidepanel.js:1629`) là đổi quyết định Đức chốt 25/08 → **hỏi Đức** |

**Bài học đáng giữ hơn cả số đo:** phép đo cũ được thiết kế để phân biệt hai giả thuyết, và nó
thất bại vì **một giả thuyết không tồn tại được**. Một bảng "nếu A thì…, nếu B thì…" không có
hàng cho "A bất khả" thì nó sẽ đọc thành "phép đo hỏng" và người sau đi đo lại.

**PHÉP ĐO SIDE PANEL ĐÃ CHẠY 2026-09-06 — CHẠY ĐƯỢC, nhưng BỊ NHIỄU. Đọc kỹ chỗ này.**

Kết quả thô, console `/sidepanel.html`:

```
KET QUA: xin = B36-probe-panel__audit.jsonl
         | Chrome dat = ...\Downloads\05a491ce-623c-4d7a-bb81-f677686cf7ec
```

**Nhưng phép đo này KHÔNG phân biệt được điều nó định phân biệt.** Nó **không trồng phiếu giữ
tên**, nên determiner ở `background.js:89-92` không tìm thấy phiếu và rơi vào nhánh
`if (!expected) { suggest(); return; }`. Chú thích ngay trên hàm đó **đã ghi sẵn** rằng
`suggest()` trần nghĩa là "tôi không có ý kiến" nên Chrome dùng tên mặc định, và tên mặc định
của một blob URL **LÀ** cái GUID.

Nên nó đo lại đúng một nhánh **đã biết từ 04/09**. Đóng góp thật của nó chỉ là **mẫu GUID thứ ba**
(`05a491ce-…`, sau `bd00d527-…` và `16f87e2b-…`) — ba mẫu đều đúng hình dạng đoạn cuối blob URL,
nên quan sát [DÒ] cũ nay đủ mạnh để đọc là [ĐO]: **tên mặc định của blob URL là GUID của nó.**

**Lỗi thiết kế phép đo, ghi ra để không lặp:** cả hai đoạn đo (service worker và side panel) được
viết TRƯỚC khi đọc kỹ `background.js`. Ba dòng cần biết nằm ngay ở đó. Một phép đo đi xuyên qua
determiner mà không khai là nó đi xuyên qua determiner thì **không cô lập gì cả** — nó chỉ đổi
ngữ cảnh gọi, trong khi biến quyết định là **có phiếu hay không có phiếu**.

**PHÉP ĐO ĐÚNG — đi bằng CHÍNH đường thật của mã, nên không còn chỗ nhiễu.**
`DAC_DOWNLOAD_ARTIFACT` trồng phiếu rồi mới tải (`background.js:121-133`), nên determiner sẽ
tìm thấy phiếu và gọi `suggest({filename})` — đúng nhánh mà kết luận 04/09 dựa vào, và lần này
đọc kết quả **trực tiếp** thay vì suy từ việc phiếu đã bị tiêu.

```js
(async () => {
  const want = "B36-probe-ticket__audit.jsonl";
  const blob = new Blob(['{"probe":"B36-ticket"}'], { type: "application/jsonl" });
  const url = URL.createObjectURL(blob);
  const r = await chrome.runtime.sendMessage({
    type: "DAC_DOWNLOAD_ARTIFACT",
    url, filename: want, conflictAction: "overwrite", expectedBytes: blob.size
  });
  console.log("KET QUA:", JSON.stringify(r));
})()
```

| `filename` trong kết quả | Nghĩa | Việc phải làm |
|---|---|---|
| kết thúc bằng `B36-probe-ticket__audit.jsonl` | `suggest({filename})` **ĐƯỢC tuân**. Kết luận 04/09 ("Chrome bỏ qua đề xuất") **SAI** — nó suy từ phiếu-đã-bị-tiêu chứ không đọc tên. Hỏng thật là **phiếu không khớp trong luồng thật** | Đo tiếp: vì sao phiếu trượt ở luồng thật mà khớp ở đây. So `item.url` Chrome báo lại với chuỗi dùng làm khoá. **Vá được, hẹp** |
| lại là GUID | `suggest({filename})` **KHÔNG được tuân**, xác nhận trực tiếp lần đầu | Thôi phụ thuộc Chrome Downloads cho artifact. Đường File System Access đã đo chạy. Đổi mặc định bootstrap (`sidepanel.js:1629`) là đổi quyết định Đức chốt 25/08 → **hỏi Đức** |

**KẾT LUẬN 2026-09-06 — ĐO TRỰC TIẾP, ĐI BẰNG ĐƯỜNG THẬT CỦA MÃ. Hàng 2 xác nhận.**

`DAC_DOWNLOAD_ARTIFACT` (trồng phiếu rồi tải — đúng đường mọi mutation Bridge đi), console
`/sidepanel.html`:

```
{"ok":true,"download_id":658,
 "filename":"...\Downloads\d31c629e-39e1-4a96-ae61-dde336b91792",
 "requested_filename":"B36-probe-ticket__audit.jsonl",
 "persisted_bytes":22}
```

Đức gửi kèm cả file. Nội dung: `{"probe":"B36-ticket"}` — **đúng nguyên vẹn, 22 byte**. Chỉ cái
tên bị Chrome đặt.

**Nên: Chrome Downloads KHÔNG đặt tên nổi artifact của gói này, và điều đó nay đo trực tiếp
chứ không suy.** Kết luận 04/09 suy từ *phiếu đã bị tiêu*; lần này đọc thẳng cả tên xin lẫn tên
Chrome đặt, trong cùng một phản hồi, trên đúng đường mã thật.

**Một điều CHƯA phân biệt được, và nó không đổi việc phải làm.** Phản hồi trên không nói được
determiner có nổ hay không:

- (a) determiner nổ, gọi `suggest({filename})`, Chrome **bỏ qua đề xuất**; hoặc
- (b) `onDeterminingFilename` **không nổ cho blob URL**, và `filename` truyền cho
  `downloads.download` cũng bị bỏ qua.

Cả hai đường dẫn tới **cùng một hành động**, nên đừng chặn việc để đo. Phép đo phân biệt rẻ và
0 credit, gộp vào lượt sau: sau khi tải, đọc `expectedDownloadNames.size` trong console service
worker — rỗng nghĩa là phiếu bị tiêu, tức (a). Đáng đo vì nếu là (b) thì **cả cơ chế determiner
là mã chết** cho artifact, và một luật không bao giờ nổ vẫn tốn mọi phiên đọc nó về sau.

**Vòng tròn kẹt, nay hiểu đủ để mô tả bằng bốn dòng mã.** `executeBridgeDirectMutation`
(`sidepanel.js:1644`) mặc định phiên bootstrap về **chế độ Downloads** — quyết định của Đức
25/08, và đúng vào lúc đó. Nhưng `DacApprovalPersistence.execute` ghi sổ audit **vô điều kiện**
trước khi mutation có tác dụng, nên phiên bootstrap **luôn** đi qua đúng nhánh vừa được chứng
minh là không đặt tên nổi → `verifyDownloadedFilename` ném → **mọi** mutation Bridge chết:
`jobs.add` · `jobs.update` · `jobs.remove` · `queue.propose` · `output.configure`.

Và cửa ra bị chặn bởi chính cửa vào: chọn thư mục đích cần một phiên, mà cửa dựng phiên qua
Bridge (`jobs.add`) thì đang chết vì lỗi này.

**Thêm một dữ kiện đo được, nó quyết định việc chọn phương án:** thư mục đã cấp quyền **KHÔNG
được lưu bền**. `showDirectoryPicker` xuất hiện ở `sidepanel.js:4207/4231/4335`, không chỗ nào
lưu handle vào IndexedDB. Nên handle chỉ sống trong bộ nhớ side panel — **đóng panel là mất**,
và Đức phải chọn lại thư mục mỗi lần mở. Đó chính là lý do mặc định Downloads tồn tại; nó không
phải sự lơ là.

**CẦN ĐỨC CHỐT MỘT CÂU — bốn phương án, xếp theo khuyến nghị.**

| | Phương án | Được | Mất |
|---|---|---|---|
| **(A)** ⭐ | Phiên bootstrap **không ghi sổ ra FILE** cho tới khi có thư mục đích thật; giữ sổ trong bộ nhớ bền rồi xả ra file ở lần ghi thật đầu tiên | Phá vòng tròn kẹt · **giữ được quyền tự chủ của AI** (đúng mục tiêu Y-01/Y-15) · không nới lớp bảo vệ nào: sổ **vẫn** được ghi trước khi mutation có tác dụng, chỉ chậm ra *file* | Sổ chưa ra file thì không sống qua việc đóng panel. Phải nói thẳng điều đó cho AI vận hành, không được im |
| **(B)** | Bootstrap **từ chối** kèm câu chỉ đường "chọn thư mục đích trước" | Diff nhỏ nhất · fail-closed · không đụng gì | Đức phải bấm **một lần mỗi lần mở panel** (vì handle không lưu bền) · **AI mất quyền tự dựng phiên** |
| **(D)** | Lưu bền handle thư mục vào IndexedDB → Đức chọn thư mục **một lần**, mở lại thì `queryPermission` xin lại êm | Chữa gốc: Downloads thôi cần thiết cho artifact · vòng tròn kẹt tan · giữ quyền tự chủ | Việc thật, cần brief riêng · Chrome có thể vẫn đòi một cú bấm sau khi khởi động lại máy |
| **(C)** | Thôi kiểm tên, chấp nhận GUID | — | **Không nên.** Bằng chứng vận hành mất tên là bằng chứng không tra được. 36 file GUID trong máy Đức là hậu quả của đúng cái đó |

Khuyến nghị: **(A) ngay bây giờ để mở đường, (D) là hướng đúng về sau.** (A) không mâu thuẫn (D)
— làm (A) rồi làm (D) thì (A) thành nhánh dự phòng, không phải mã phải xoá.

**ĐỨC ĐÃ CHỐT 2026-09-06 — phương án (D), kèm (A) làm miếng nhỏ.**
Quyết định bất biến: [ADR-0049](docs/adr/0049-luu-ben-thu-muc-da-cap-quyen-thay-cho-mac-dinh-downloads.md).

Tiêu chí Đức nêu, nguyên văn: *"phương án nào thì có thể làm cho AI prompt code làm việc smoothly
và xuyên suốt với ChatGPT thì tôi sẽ làm phương án đó."* Đức uỷ quyền chọn theo đúng tiêu chí đó.

Chiếu tiêu chí: **(A) một mình là trơn GIẢ** — nó mở cửa bootstrap nhưng AI vẫn ghi vào chỗ không
đặt tên nổi, nên chỉ đẩy chỗ vấp ra xa: vấp lại ở ảnh `.png`, ở checkpoint `.xlsx`, ở lần xả sổ
đầu tiên. **(B) trái tiêu chí** — AI mất quyền tự dựng phiên. **(C) bị loại.** **(D)** là đường
duy nhất: đường ghi đặt tên đúng **đã có và đã đo là chạy**, cái thiếu chỉ là giữ được quyền qua
các lần mở panel.

**Trần cứng, ghi ra để không hứa quá:** không phải "một cú bấm mãi mãi". Sau khi khởi động lại
máy, Chrome có thể xin xác nhận lại quyền (`requestPermission` cần cử chỉ người dùng). Chính xác
là **một cú bấm mỗi lần khởi động lại máy** — trần của trình duyệt, không nới được bằng mã.

**Việc, theo thứ tự, và ĐỪNG gộp:**

- **(A) trước** — phiên bootstrap qua Bridge thôi mặc định về Downloads; chưa có thư mục thật thì
  giữ sổ trong bộ nhớ, xả ra file ở lần ghi thật đầu tiên. Diff nhỏ, mở được vòng tròn kẹt.
  **(A) KHÔNG được đọc thành đã sửa B-36** — nó chỉ mở đường.
- **(D) sau, brief riêng, audit riêng** — lưu bền handle vào IndexedDB, `queryPermission` lúc mở
  lại panel, và đường xin lại quyền khi mất. Cần phép ghim cho ca **handle còn đó mà quyền đã
  mất** — đó là ca sẽ gặp thật sau mỗi lần khởi động lại máy, không phải ca lý thuyết.

**ĐỨC NÊU THÊM 2026-09-06, và nó LÀM NHẸ hệ quả ④ của [ADR-0049](docs/adr/0049-luu-ben-thu-muc-da-cap-quyen-thay-cho-mac-dinh-downloads.md).**
Không sửa ADR — ADR đã `Accepted` là bất biến (phép kiểm B12). Ghi ở đây, trỏ về đó.

Đức nói: trong lúc AI vận hành, nội dung **đã đi vào và đi ra qua Claude Code rồi**, nên mấy file
tên-GUID đó *"có thể quên ngay lập tức… giá trị của chúng là một lần và đã được full fill nhiệm vụ."*

**Đúng, và nó đúng ở đâu:** hệ quả ④ của ADR-0049 lo rằng sổ audit của phiên bootstrap giữ trong
bộ nhớ thì không sống qua việc đóng panel. Lý lẽ của Đức làm cái lo đó **nhỏ hẳn lại**, vì nội
dung ở *đúng thời điểm đó* gần như vô giá trị: một phiên vừa được dựng, chưa job nào chạy. Nên
(A) không phải là đánh đổi độ bền lấy sự tiện — nó là **thôi đánh nhau để đặt tên cho một file
không đáng có tên**. Đó là lý do mạnh hơn lý do tôi viết trong ADR.

**Nhưng KHÔNG suy rộng ra được, và đây là chỗ phải giữ:** lý lẽ đó **chỉ áp cho phần nội dung
một-lần**, không áp cho:

1. **Sổ audit và sổ cái của một run thật** — đó là lớp **quy trách nhiệm**, thứ chứng minh job
   nào đã chạy, chạy mấy lần, kết quả ở đâu. Ngữ cảnh của một phiên Claude Code **chết theo
   phiên**; còn GPT audit qua GitHub connector, tức đọc **repo**, không đọc ngữ cảnh CC. Nên
   "CC đã thấy rồi" không thay thế được một bản ghi bền. Luật vàng 3 cấm nới lớp này.
2. **Sản phẩm thật** — ảnh `.png` và workbook kết quả. Mất tên là Đức không dùng được, và đó
   chính là thứ Đức đặt hàng.

Nên phân biệt **ba loại**, đừng gộp: nội dung một-lần (quên được) · bản ghi trách nhiệm (phải
bền, phải có tên) · sản phẩm (phải có tên). `B-36` chặn cả ba, và (D) vẫn cần đúng như đã chốt.

**36 file GUID đang nằm trong `Downloads` của Đức: Đức xác nhận là rác, quên được.** AI không tự
xoá file (luật gốc của Đức) — nên việc xoá vẫn thuộc `B-09`, chờ tay Đức. Ghi thêm ở đây rằng
Đức **đã xác nhận chúng vô giá trị**, để phiên sau không phải hỏi lại câu đó.

---

## ĐÃ VÁ CẢ (A) VÀ (D) — 2026-09-07, `claude-b36-vaA`. **Chưa nghiệm thu live.**

**Đọc dòng này trước:** mục vẫn **MỞ**. Mã đã vá theo đúng chẩn đoán mới, suite 115/115, thử phá
15/17 — nhưng **chưa ai chạy nó trên máy Đức**. Ngày 04/09 mục này từng ghi *"ĐÃ VÁ … CHỜ NGHIỆM
THU"* và đọc lướt thành "xong", trong khi nghiệm thu đã chạy và đã **hỏng**. Đừng để lặp: dưới
đây là *đã vá*, không phải *đã hết*.

### Một phép đo của tôi BÁC một câu trong bối cảnh ADR-0049

Bối cảnh ADR ghi: *"`showDirectoryPicker` gọi ở `sidepanel.js:4207/4231/4335`, không chỗ nào lưu
handle vào IndexedDB."* Đo lại 07/09: **sai**. `output-profile-core.js` lưu handle vào IndexedDB
từ đầu (`bind()` ghi `directory_handle`), `resolve()` đã gọi `queryPermission` rồi trả bốn trạng
thái, và đường dò lúc mở panel đã đọc lại kho đó rồi báo `FOLDER_REAUTH_NEEDED` kèm đường dẫn dán
được. Phép đo cũ chỉ soi **ba lời gọi picker** mà không lần xem chúng làm gì tiếp.

Nên (D) **nhỏ hơn ADR hình dung nhiều**. Chỗ thật sự thiếu, hẹp: `resolveOutputProfile()` cần một
`profile_id`, mà id đó đến từ config của workbook — phiên bootstrap dùng workbook **do máy dựng
với config RỖNG**, nên nó không có id, không gọi `resolve`, và **không lối nào nhận lại** thư mục
Đức đã cấp quyền. Đó là toàn bộ chỗ hỏng của (D).

ADR-0049 đã `Accepted` nên **không sửa** (phép kiểm B12). Đính chính nằm ở đây, và bài học chung:
*một phép đo soi chỗ GỌI mà không lần theo chỗ nó gọi tới thì kết luận "không có" là kết luận
"tôi chưa nhìn tới đó".*

### (A) — phiên bootstrap thôi ghi artifact qua Chrome Downloads

Bộ settings mặc định do máy dựng nay mang dấu `autoDefaulted`, và đường ghi của nó **giữ sổ trong
`state.auditEvents`** thay vì tải xuống. `saveAuditLog` dựng lại TOÀN BỘ payload từ mảng đó ở mỗi
lượt, nên lần ghi đầu vào thư mục thật **xả hết** — không cần bộ đệm thứ hai.

Luật quy trách nhiệm **không bị nới**: sổ VẪN được ghi trước khi mutation có tác dụng, chỉ chậm
ra *file*. Cái giá nói thẳng ra dây: `audit_durable: false` + một câu tiếng Việt giải thích.

Dấu nằm **trên object settings**, không trên `state` — chỗ đặt là phần của quyết định: thử phá vòng
đầu cho 4/9, và **hai con thoát lưới đều là hệ quả của việc đặt cờ trên `state`** ("không xoá khi
Đức mở workbook thật" và "rollback làm mất dấu"). Chuyển lên settings thì cả hai lớp lỗi **không
còn xảy ra được** thay vì được canh bằng hai phép ghim nữa.

### (D) — phiên bootstrap nhận lại thư mục đã cấp quyền

`adoptAuthorizedOutputProfile()` đọc kho profile, `resolve` từng cái, và nhận **khi có đúng MỘT**
cái còn quyền. Nhiều hơn một thì **KHÔNG chọn hộ** — cùng luật với bộ đặt tên download (nhiều hơn
một phiếu còn hạn thì NHƯỜNG) và cùng lý do: chọn hộ một trong mấy thư mục pilot của Đức là đem
bằng chứng run này ghi vào hồ sơ run khác. Không nhận thì phiên **vẫn chạy** — đó chính là việc
(A) làm, và là lý do ADR bắt làm (A) trước.

### Phép ghim: `tests/b36-bootstrap-audit-held-smoke.mjs`

HÀNH VI, không tĩnh — chạy `sidepanel.js` thật trong `node:vm`, stub download trả **GUID đúng như
đã đo live**. Mười bất biến, sáu cho (A) và bốn cho (D); danh sách đầy đủ ở `AGENTS.md`.

**Một phép kiểm cũ phải viết lại, và đó là lần thứ hai chuyện này xảy ra.**
`bridge-attention-static.mjs` khẳng định `state.outputSettings = fromWorkbook({}, …)` phải viết
trên **đúng một dòng** — nên vá là nó đỏ. Ý định của nó vẫn đúng (bootstrap phải dựng được
settings, không rơi vào `preflight(null)`); chỉ cái regex ghim **cú pháp**. Đã viết lại thành bất
biến và **thêm** bất biến mới. Đúng câu mục này đã ghi hồi 04/09: *một phép kiểm khẳng định sự
tồn tại của bug là một bức tường chặn đường sửa bug.* Nó vừa dựng bức tường thứ hai.

### Thử phá lộ ra hai thứ phép ghim không lộ được

1. `delete state.outputSettings.autoDefaulted` là **mã chết** — dấu chỉ được đặt khi nhận **thất
   bại**, nên lúc nhận thành công chẳng có gì để xoá. Gỡ, không viết phép ghim canh một dòng vô
   tác dụng.
2. Một **lỗi thứ tự thật**: tôi gọi `bindBootstrapOutput()` **trước** lượt phục hồi
   `previouslyBound`, nên chốt "đã có thư mục thật" không bao giờ nổ và lượt phục hồi luôn thắng.
   Hậu quả: `image` là thư mục Đức bind trong khi `outputProfileState` trỏ vào profile vừa nhận —
   **hai trường nói hai chuyện**. Đảo thứ tự, và ca ⑩ + một khẳng định thứ tự ghim lại.

Hai con lọt lưới (15/17) đều **tương đương hành vi**, ghi lại thay vì bày phép ghim giả: đọc
predicate lại ở từng chặng cần một lượt bind xen vào giữa `apply` và `persist_audit` — không mối
nối nào cho phép; còn gọi `bindBootstrapOutput()` thêm một lần trước lượt phục hồi thì lần gọi sau
chỉnh lại.

### ĐÓNG KHI — và đây là điều kiện duy nhất

**Một lượt nghiệm thu live trên máy Đức, 0 credit** (không cần prompt ChatGPT nào):

1. Đức mở Side Panel, chọn **một** thư mục đích (đường profile). Một cú bấm.
2. Đóng panel, mở lại.
3. AI gọi `jobs.add` qua Bridge — phiên bootstrap, không workbook.
4. Đòi: mutation **thành công**, **không** có `audit_durable: false` trong câu trả về, và sổ
   audit + checkpoint nằm trong **thư mục Đức chọn** với **tên đúng** (không GUID).
5. Đếm lại số file tên-GUID trong `Downloads`: phải **không tăng**. Mốc đối chứng: 37 (04/09) →
   39 (06/09, gồm hai file của phép đo). Lệnh đếm: `node scripts/don-rac-tai-xuong.mjs`.

Bước 5 là bước thật sự chốt. Bốn bước trên có thể xanh mà file rác vẫn tăng nếu còn một đường ghi
nào lọt về Downloads — và **chính xác chuyện đó đã xảy ra ngày 04/09**.

**Còn nợ một phép đo, 0 credit, KHÔNG chặn việc gì** — gộp vào lượt nghiệm thu trên: đọc
`expectedDownloadNames.size` trong console service worker ngay sau một lượt tải, để biết determiner
**có nổ** hay **không nổ cho blob URL**. Hai kết quả dẫn tới cùng một hành động nên nó không chặn;
nhưng nếu "không nổ" thì cả cơ chế determiner là **mã chết** và nên gỡ — và cái đó thì đáng biết.

**Phép đo còn nợ, rẻ và 0 credit, gộp vào lượt sau:** đọc `expectedDownloadNames.size` trong
console service worker ngay sau một lượt tải, để biết determiner **có nổ** (phiếu bị tiêu) hay
**không nổ cho blob URL**. Không chặn việc — cả hai đường dẫn tới cùng một hành động. Nhưng nếu
là "không nổ" thì **cả cơ chế determiner là mã chết** cho artifact, và một luật không bao giờ nổ
vẫn tốn mọi phiên đọc nó về sau.

## Đã đóng

- **2026-08-26 · `d53a7e7`** — `provider-adapter.js` + `diagnostics.dom_probe` cho GPT,
  học cấu trúc từ worker Gemini. Kèm `tests/provider-adapter-static.mjs` làm hàng rào.
- **2026-08-26 · `5be8160`** — `BACKLOG.md` + subcommand `dom-probe` cho CLI.
- **2026-08-26 · `55b47e3`** (B-03) — `DETECTION_BLIND`: mù thì dừng, không retry.
- **2026-08-26 · `adbd87d`** — `dom_probe` trả giá trị attribute + chuỗi tổ tiên của ảnh.
- **2026-08-26 · `c1e7d04`** (B-02, một phần) — lượt assistant dùng `data-turn`, không
  còn `data-message-author-role`.
- **2026-08-26 · `f418bc1`** (B-02, một phần) — gốc quét là tổ tiên chung của các lượt,
  không khớp theo tên nữa.
- **2026-08-26** (B-01) — khoá tab + khoá hội thoại. Audit Antigravity PASS sau 2 vòng.
- **2026-08-26** (B-13) — ảnh theo đúng thư mục đã cấu hình; `write_outcome` thôi nói dối;
  thêm `landed_as_requested`. Audit Codex PASS sau 3 vòng. Xác minh live `trial-5d8abec0` 2/2.
- **2026-08-26** (B-04) — `run.stop`: dừng run qua bridge, **đi vòng qua khoá
  `RUN_ACTIVE`** (dừng là giảm rủi ro), idempotent, trả về phase để bên gọi biết
  prompt đã bay hay chưa. Kèm một lỗi ngoài gói việc, tìm ra nhờ test cái bẫy mà
  gói việc dặn phải kiểm chứng: cờ `stopRequested` bị xoá sau lần await đầu của
  `run()` nên lệnh dừng rơi vào cửa sổ khởi động sẽ bị nuốt âm thầm — đã chuyển
  chỗ xoá lên khoá `tryBeginRun`. Xem `decisions.md`.
- **2026-08-26** (B-05) — `chat.reload`: F5 tab qua bridge, **bị `RUN_ACTIVE`
  chặn** khi đang có run (bảo vệ "gửi đúng một lần"), đợi trang trả lời rồi mới
  báo `ready`, và nói rõ đã reload tab nào.
- **2026-09-07** (B-25) — **ĐÓNG.** Câu lỗi lúc recreate nay là tiếng Việt có dấu, mã lỗi giữ tiếng Anh (luật vàng 4). Sửa 9 câu trong `confirmRecreate()` của `sidepanel.js` + 5 câu `detail:` của `output-location-core.js` (đuôi của `OUTPUT_LOCATION:` đến từ đó, nên dịch ở `sidepanel.js` là dịch hụt). Ghim: `tests/manual-recovery-guards-static.mjs` — nó bắt MỌI chuỗi dạng `MÃ: đuôi` trong hàm đó chứ không kiểm theo danh sách chép tay, nên câu mới thêm cũng bị canh. `tests/output-location-core-smoke.mjs` phải sửa theo (nó đang khẳng định nguyên văn "permission is denied"); nay neo vào chữ "Quyền ghi" **và** trạng thái thô `denied` của Permissions API. 7/7 đột biến đỏ.
- **2026-09-07** (B-24) — **ĐÓNG bằng đường thứ hai của chính mục này** (chèn chốt), KHÔNG xoá hàm. `resolveExistingOutput()` nay ném `RECONCILE_IMAGE_ONLY` nếu `taskType(item.job) !== "image_generation"`, chốt đứng **trước mọi tác dụng phụ**. Vì sao không xoá hẳn: mục này tự ghi "xoá hẳn là **quyền của Đức**", và đo được hàm này đang bị **hai phép ghim neo vào**: `tests/post-submit-no-resend-smoke.mjs` đếm cửa đối soát thủ công phải bằng **đúng 1** (xoá hàm → 0 → đỏ, và con số đó là phép đo đứng sau ADR-0047), còn `tests/recreate-core-smoke.mjs` dùng chính tên hàm làm mỏ neo cắt đoạn. Xoá hàm là phải sửa cả hai — tức là chạm phép đo của một ADR đã `Accepted`. **Việc còn lại cho Đức:** chốt xoá hay giữ. Ghim: `tests/manual-recovery-guards-static.mjs`.
- **2026-09-07** (B-20) — **ĐÓNG nửa "làm code nói thật", KHÔNG gỡ nhánh alias.** Đã xác nhận bằng đọc code: cả hai đường nạp ảnh mẫu ghi `alias: ""`, không có ô nhập alias, nhánh alias không bao giờ chạy. Đã sửa **chỗ nói sai**: `README.md` (3 dòng, gồm dòng 77 hứa "editable aliases") và `DAC_XLSX_RUN_PLAN_V1.md` dòng 3. **Không gỡ nhánh alias**, và đây là lý do đo được, không phải ngại việc: logic khớp alias có **BA bản sao song song** (`runner-core` · `plan-diagnostics-core` · `bridge-proposal-core`); gỡ một cái thôi thì Kiểm tra kế hoạch và lượt chạy thật sẽ nói khác nhau, mà gỡ cả ba là phải bỏ luôn `DUPLICATE_ALIAS` — một trong **sáu** mã mà `tests/bridge-plain-failure-classification-smoke.mjs` đang ghim cho B-16. Thay vào đó dựng cái chuông: `tests/reference-alias-dead-code-static.mjs` (8/8 đột biến đỏ) đỏ ngay ngày ai đó nối ô nhập alias, buộc mở lại mục này. **Việc còn lại cho Đức:** chốt bỏ hẳn hay nối thật.
- **2026-09-07** (B-21) — **ĐÓNG.** Đã kiểm chứng bằng đọc code trước khi sửa chữ: `sidepanel.html` có nút Recreate, **0 nút** cho Resolve Existing Output, và `resolveExistingOutput` xuất hiện đúng 1 lần trong `sidepanel.js` (chính dòng định nghĩa). `DAC_XLSX_RUN_PLAN_V1.md` nay nói rõ **chỉ MỘT đường được nối**, đánh dấu đường thứ hai là **NOT WIRED** kèm con trỏ sang B-21/B-24 và phép ghim đo nó; sửa luôn câu "exposes both explicit recovery actions again" ở cuối đoạn — nó sai cùng một kiểu.
- **2026-09-07** (B-17) — **ĐÓNG. Đức chốt nâng trần `run.trial` lên 900 giây; `run.start` VẪN CẤM** ([ADR-0015](../../../docs/adr/0015-nang-tran-duong-thu-len-900-giay.md)). 900 không phải số tròn chọn cho đẹp: nó là `timeout` của chính workbook Pilot-08 Đức đang dùng thật, và số đo đứng sau nó là đo live 26/08 — gửi → phát hiện ảnh mất 40s (1 ảnh) · 61s (2 ảnh) · **68s (4 ảnh)** với prompt *ngắn*, còn job thật là 4 ảnh + prompt 3.825 ký tự. Trần 90 giây không bảo vệ ai khỏi cái gì; nó chỉ đẩy đúng những job thật sang tay Đức. **Vế thứ hai quan trọng ngang vế thứ nhất: `POLICY.prohibited_methods` không đổi một chữ** — nới đường thử cho khớp việc thật, không trao cho AI khả năng tự tiêu credit. Công tắc Chế độ phát triển, nắp 30 job, cooldown 5 phút, sàn 15 giây: nguyên. **Hai điều kiện ADR ghi rõ là phần của quyết định, đã làm cả hai:** ① trần khai ở **đúng một chỗ** — `LIMITS.trial_timeout_cap_sec` trong `bridge-core.js`; trước đó con số 90 nằm rải ở **bốn** nơi (mặc định của `capTrialTimeouts`, chỗ gọi trong `sidepanel.js`, trường audit `bridge_trial_timeout_cap_sec`, trường reservation `timeout_cap_sec`) và bốn bản sao của một luật là bốn cơ hội để chúng nói khác nhau; ② `run.trial` **báo tiến độ** — đường báo vốn đã có (trả reservation ngay rồi hỏi lại bằng `run.status`) nhưng nó chỉ trả TÊN chặng, nên `run.status` nay trả thêm ba con số panel **vốn đã đếm** cho đồng hồ trên màn hình: `job_elapsed_sec` · `stage_elapsed_sec` · `stage_budget_sec`. Không cơ chế mới, không đẩy sự kiện, không nhịp hẹn giờ — đọc lại đúng thứ đã có. Ghim: `tests/trial-timeout-cap-adr0015-smoke.mjs`, canh **cả hai chiều** (900 được nhận **và** 901 bị từ chối — thiếu vế sau là bỏ trần chứ không phải nới trần), và vế ② **không grep chữ**: cắt `elapsedSecSince` + `bridgeRunStatus` đã ship ra khỏi `sidepanel.js` rồi **chạy** trong `node:vm` với đồng hồ do harness cầm, đòi `stage_elapsed_sec` bò lên giữa hai lần hỏi. **10/10 đột biến đỏ**, gồm gỡ `run.start` khỏi danh sách cấm và "đồng hồ còn nguyên chữ mà số đứng yên". **Trần tuyên bố: TĨNH + suite, CHƯA chạy live** — nghiệm thu thật cần Đức reload extension ở `chrome://extensions` rồi chạy một trial với job dài hơn 90 giây.

## Đóng bằng dòng ở cuối sổ — 2026-09-08, `claude-gpt-no-ky-thuat`

> Tám dòng dưới đây **không đóng thêm việc nào bằng tay**. Chúng chỉ nói lại — bằng đúng
> cú pháp mà bộ đếm chính thức đọc được — những gì đã đóng thật từ trước. Vì sao cần:
> mục `## Đã đóng` phía trên viết `- **2026-09-07** (B-25) — **ĐÓNG.**`, mà predicate của
> `parseBacklog()` chỉ nhận `- **ĐÓNG <mã>**` ở đầu dòng. Nên năm mục đã vá, đã ghim và đã
> commit vẫn bị đếm là MỞ suốt hai ngày. Đo trước khi sửa: **22 mục mở**; đo lại sau: **14**.
> Không sửa một khối cũ nào — luật sổ nợ, cửa ra phải rẻ ngang cửa vào.

- **ĐÓNG B-02** · Phạm vi của chính mục này đã cạn, không phải bỏ dở. Ba nhóm `assistantMessage` / `userMessage` / `conversationRoot` đo live 26/08 ĐẠT (`assistantCount` 5, `imageCandidateCount` 3 → 15 trên trang có đúng 15 ảnh). `composer` (`#prompt-textarea` => 1) và `stop` (`button[data-testid="stop-button"]` => 1) đo giữa lúc `trial-09c93cd4` đang chạy, cả hai Xong. `send`/`sendInForm` **không bao giờ chụp được bằng probe read-only** (ChatGPT chỉ hiện nút gửi khi ô nhập có chữ rồi đổi ngay sang nút dừng) — bằng chứng thay thế là trial gửi prompt thành công, và dấu hiệu nhóm này chết là submit thất bại, KHÔNG phải probe đếm ra 0. Hai nhóm còn chưa có bằng chứng **không mất đi**: chúng có mục riêng — `B-14` (`attachmentPreview` đứng trên một mục, và mục đó là nhãn tiếng Anh) và `B-15` (`uploadPending` chưa từng khớp). Giữ `B-02` mở cạnh hai mục đó là **đếm một việc hai lần**, đúng cái bệnh mà dòng này chữa.
- **ĐÓNG B-11** · Mục thật đã đóng 06/09 và tiêu đề nó đã gạch (`~~B-11~~ · **ĐÃ ĐÓNG 2026-09-06**`, dòng 618). Bộ đếm vẫn thấy MỞ vì có **tiêu đề thứ hai** cùng mã ở dòng 628 — bản `(nguyên văn mục cũ, giữ để tra bối cảnh)`, cố ý giữ lại và không gạch. Xác minh bản vá còn sống trong mã, không tin lời sổ: `sidepanel.js` ném `WORKBOOK_NOT_LOADED` trên đường `run.trial`, ghim ở `tests/run-trial-workbook-not-loaded-smoke.mjs` (2/2 đột biến đỏ). Dòng này không đóng việc mới — nó chỉ khiến bản chép-để-tra-cứu thôi bị tính là nợ.
- **ĐÓNG B-12** · **Không đóng vì đã sửa — đóng vì việc này không thuộc sổ của gói.** Mục tự khai `(việc ở GỐC REPO)` từ ngày ghi 26/08, lúc gốc repo **chưa có** `BACKLOG.md` (sổ đó mở 06/09). Nay việc đã có nhà đúng, và có hai mã riêng: `N-05` (`git commit -o <file>` không chặn được việc cuốn sửa đổi của lane khác trên CÙNG file) và `N-40` (`git commit -a` của một lane cuốn theo file ĐÃ DÀN của lane khác, nổ thật 07/09 ở commit `27a88ce7`). Đề xuất trong mục này — *"commit của phiên này không được chứa đường dẫn thuộc package có chủ khác"* — đã **được dựng thật** thành `node scripts/claim.mjs --soat` (`soatDanHang()`, `scripts/claim.mjs:462`), nay bắt buộc trước mọi `git commit`. Nợ **không biến mất**, nó nằm ở `N-05` + `N-40`; giữ thêm một bản ở đây là đếm hai lần một việc mà gói này không có quyền sửa.
- **ĐÓNG B-19** · Cùng hình dạng với `B-11`: mục thật đã đóng 06/09 theo [ADR-0047](docs/adr/0047-sau-khi-da-gui-thi-khong-gui-lai-tru-khi-doi-soat-khang-dinh-duoc.md) và tiêu đề đã gạch (dòng 299), nhưng bản `(nguyên văn mục cũ, giữ để tra bối cảnh)` ở dòng 326 mang lại cùng mã và không gạch, nên bộ đếm thấy MỞ. Xác minh trong mã: `resolveJobFailure()` sau khi đã gửi thì trả `INTERRUPTED` + dừng batch, ghim ở `tests/post-submit-no-resend-smoke.mjs` (8/8 đột biến đỏ, gồm "tắt cờ vô điều kiện" và "bật cờ sau lời gọi gửi").
- **ĐÓNG B-21** · Đã đóng thật 07/09; dòng này chỉ đổi sang cú pháp máy đọc được. Kiểm lại bằng đọc mã, không tin sổ: `DAC_XLSX_RUN_PLAN_V1.md:38` nay ghi thẳng *"exactly ONE wired fail-closed operator route: Recreate Image"* và đánh dấu đường thứ hai là **NOT WIRED**, kèm con trỏ sang `B-21`/`B-24` và sang phép ghim đo nó. Hợp đồng schema thôi nói sai — mà đây là tệp `AGENTS.md` chỉ AI đọc để hiểu schema, nên nói sai ở đây đắt hơn nói sai ở `README.md`.
- **ĐÓNG B-24** · Đã đóng thật 07/09 bằng **đường thứ hai mà chính mục này đề ra** (chèn chốt, không xoá hàm). Kiểm lại trong mã: `sidepanel.js:4239` ném `RECONCILE_IMAGE_ONLY` khi `taskType(item.job) !== "image_generation"`, và chốt đó đứng **trước mọi tác dụng phụ** — `tests/manual-recovery-guards-static.mjs:95` canh đúng thứ tự đó, không chỉ canh sự có mặt của chuỗi. Vì sao không xoá hàm: mục tự ghi *"xoá hẳn là quyền của Đức"*, và hàm đang bị hai phép ghim neo vào (`post-submit-no-resend-smoke.mjs` đếm cửa đối soát phải bằng đúng 1 — con số đó là phép đo đứng sau một ADR đã `Accepted`; `recreate-core-smoke.mjs` dùng tên hàm làm mỏ neo cắt đoạn). **Còn lại cho Đức, và là việc cosmetic:** xoá hàm hay giữ kèm chốt.
- **ĐÓNG B-25** · Đã đóng thật 07/09; dòng này chỉ đổi cú pháp. Kiểm lại trong mã: `sidepanel.js:4116` và `:4127` — `RECREATE_PERSISTENCE_REQUIRED` và `RECREATE_COMPLETION_UNVERIFIED` nay có đuôi tiếng Việt **có dấu**, mã lỗi giữ tiếng Anh (luật vàng 4 của gói). Năm câu `detail:` của `output-location-core.js` sửa cùng lượt, vì đuôi của `OUTPUT_LOCATION:` sinh ở đó — dịch ở `sidepanel.js` là dịch hụt. Ghim bắt **MỌI** chuỗi dạng `MÃ: đuôi` trong hàm đó chứ không so với danh sách chép tay, nên câu mới thêm cũng bị canh.
- **ĐÓNG B-30** · Cùng lý do `B-12`: mục tự khai `(việc ở GỐC REPO)`, ghi 28/08 khi gốc repo chưa có sổ. Nay có mã riêng ở đó: `N-33` (cổng đóng phiên trả kết quả ĐỎ SAI khi nhiều lane cùng ghi file gốc repo) — kèm số đo 07/09 lúc sáu lane cùng chạy: chạy `session-check.mjs` năm lượt liên tiếp thì số mục đỏ **nhấp nháy giữa 1 và 2**, và phép kiểm đỏ nào cũng XANH khi chạy riêng ngay sau đó. Đó chính là "bắt oan" mà mục này tả, đo được và ở đúng nhà. Nợ không mất, chỉ thôi bị đếm hai lần.
- **ĐÓNG B-10** · Đã vá 2026-09-08, `claude-gpt-no-ky-thuat`, bằng **đường thứ nhất mà chính mục này đề ra** (gộp theo `state.running` ngay trong `bridgeRunStatus`), không đi đường thứ hai. `sidepanel.js` nay dựng `const current = state.running ? state.currentItem : null;` trước khối `return`, và payload đọc `current` chứ không đọc `state.currentItem`. Đây là chốt **thứ ba cùng khuôn** — `bridgeRunStop()` (dòng ~886) và `stop()` (dòng ~6067) đã có từ trước; cố ý **không** gom cả ba thành helper, vì hai chỗ kia là đường an toàn đã tôi luyện và mỗi chỗ mang một khối chú giải riêng, rewire chúng để bớt một dòng là đổi rủi ro thật lấy vẻ gọn. **Vì sao không đi đường thứ hai** (xoá `state.currentItem` lúc run kết thúc, đường mục này gọi là "sạch hơn"): `queueElapsed` và `renderRuntime` đang ĐỌC biến đó để hiện job vừa xong trên màn hình — đúng cái mục này dặn "phải kiểm UI trước". Xoá là làm hỏng UI để chữa một trường Bridge. **Một thứ phát sinh, đã xử ngay trong lượt:** chốt này làm `current` thành `null` cả trong ca `HALTED`, mà khối `halt` trước đó **không hề mang `job_id`** — nên agent sẽ mất hẳn cách biết job nào đang chặn hàng đợi. Đã thêm `halt.job_id`, lấy từ **hàng đợi** (`halted.job.id`) chứ không từ `currentItem`, vì hai cái đó khác nhau sau khi panel mở lại. Ghim: `tests/run-status-stale-current-smoke.mjs` — cắt khối `elapsedSecSince`…`bridgeRunStatus` đã ship ra và **CHẠY** trong `node:vm`, ghim bốn mép (rảnh → null · đang chạy → có · **tạm dừng → có**, nên bản vá gate theo `paused` sẽ đỏ · HALTED → null nhưng `halt.job_id` phải nêu đúng job bị chặn, sân khấu cố ý cho `currentItem` là Q001 và job chặn là Q007). **8/8 đột biến đỏ, 0 mỏ neo hỏng** — gồm gỡ chốt, đảo chốt, gate sai cờ, mù hẳn, gỡ `halt.job_id`, và "chốt còn nguyên mà payload vẫn đọc `state.currentItem`". Suite gói **116/116**.
- **ĐÓNG B-28** · Đã vá 2026-09-08, `claude-gpt-no-ky-thuat`, **cả hai đồng hồ mục này nêu**, bằng đúng hai cách mục này gợi ý — và hai cách đó khác nhau, cố ý. **Phần ① "Tiếp tục" (đây là phần Đức thấy được):** vòng chờ `waitWhilePaused()` nay đua **chuông** với lưới đỡ — `await Promise.race([controlWakePromise(), sleep(250)])` — và ba đường điều khiển đều rung chuông: `togglePause()`, `stop()` của panel, `bridgeRunStop()` của Bridge. Đánh thức bằng **sự kiện** chứ không phải hẹn giờ, vì thời điểm người bấm không đoán trước được (đúng điều mục này ghi). `sleep(250)` **giữ lại làm lưới đỡ**: ngày nào có một đường đặt `stopRequested` mà quên rung chuông thì vòng chờ vẫn thoát được, chỉ chậm. Dùng **một** promise chia sẻ, không phải một promise mỗi lượt chờ — `Promise.race` để promise thua ở lại treo, nên cấp mới mỗi 250ms là rò rỉ ~240 resolver mỗi phút tạm dừng. **Phần ② cooldown thử lại:** thay `await sleep(retryCooldownMs)` (một giấc dài duy nhất, Chrome hoãn được) bằng `waitRetryCooldown()` — **dùng lại đúng `interjob-delay-core.js`**, module đã chữa khoảng nghỉ giữa hai job, nơi MỐC là thẩm quyền và `chrome.alarms` chỉ để hỏi lại. Nó bảo đảm **không bao giờ ngắn hơn** cấu hình, nên cooldown vẫn là cooldown; chỉ hết trôi. Không mượn `state.interJobCountdown` / `state.selectedInterJobDelay` — hai trường đó là chữ hiện trên màn hình cho khoảng nghỉ, mượn chúng là báo sai loại chờ. **Hai chỗ CỐ Ý không làm, nói rõ để phiên sau đừng tưởng bỏ sót:** ⑴ **không** truyền `shouldStop` cho cooldown thử lại — cho Stop cắt ngắn cooldown là đổi HÀNH VI trên luật thử lại (`AGENTS.md` gốc mục 2 bắt hỏi Đức), không gộp vào một bản vá về độ chính xác; hôm nay Stop vẫn chờ hết cooldown, đúng như trước. ⑵ **không** gom ba chỗ rung chuông thành một lớp trừu tượng. Ghim: `tests/pause-resume-wake-smoke.mjs` (HÀNH VI, `sleep` không bao giờ giải quyết — bản cũ treo mãi ở đó). **Ba phép ghim CÓ SẴN đã đỏ và đã được sửa cho đúng, không phải nới:** `pause-resume-static.mjs` neo vào **một dòng mã** (`while (…) await sleep(250);`) trong khi điều nó bảo vệ là bất biến *"Stop luôn thoát được khỏi tạm dừng"* — nay neo vào **điều kiện** vòng lặp và **cộng thêm ba khẳng định** chặt hơn cái cũ, gồm đếm đúng **ba** chỗ rung chuông; `v1-ui-ux-closure-static.mjs` neo vào biểu thức `retryCooldownMs`, nay neo biểu thức mới **cộng** hai khẳng định mới (phải đi qua `waitRetryCooldown`, và **không** được quay về `sleep` trần) — và khẳng định "không quay về" phải **lọc dòng chú giải trước khi soi**, vì chuỗi cũ cố ý còn nằm trong chú giải kể lại bản cũ, đúng cái bẫy đã làm nó đỏ oan ở lượt đầu; `post-submit-no-resend-smoke.mjs` **chạy** `resolveJobFailure()` thật nên cần stub `waitRetryCooldown`, ghi vào CÙNG bộ đếm và CÙNG đơn vị để khẳng định *"vẫn phải chờ cooldown"* vẫn đo đúng cái nó đo. **Số đo: suite 116/116 → 117/117 · 10/10 đột biến đỏ, 0 mỏ neo hỏng** (gồm gỡ chuông, gỡ lưới đỡ, `togglePause` không rung, chuông không bao giờ reo, rò rỉ resolver, gỡ điều kiện `stopRequested`, cooldown về giấc dài, bỏ hẳn cooldown, và cooldown không đặt mốc). **Trần tuyên bố: SUITE, CHƯA LIVE.** Nghiệm thu **không tốn credit**: Đức reload extension → chạy một run → bấm Tạm dừng → **thu nhỏ hoặc che side panel ~2 phút** → mở lại và bấm "Tiếp tục" → job kế tiếp phải chạy trong khoảng một giây, không phải sau một phút.
- **ĐÓNG B-28 — bản vá vòng 2 sau audit độc lập, đọc dòng này thay cho dòng ĐÓNG B-28 ở trên** · Vòng 1 (ghi ở dòng trên) **có một lỗi thật do chính tôi đưa vào**, và audit độc lập bắt đúng nó — ghi lại đây vì bài học đắt hơn bản vá. Vòng 1 dùng **một promise chuông dùng chung** và tự khai *"nhiều nhất một resolver treo một lúc"*. **Sai.** `Promise.race([bell, sleep])` đính một reaction vào `bell` **mỗi vòng lặp**, và việc dùng chung một promise **không dọn** những reaction ấy — chúng tích luỹ trên đúng cái promise đó. Đo lại bằng tay để không tin lời ai: đính 10.000 reaction vào một bell, reo **một** lần thì **cả 10.000 đều chạy**. Ở nhịp 250ms đó là ~240 reaction mỗi phút tạm dừng, mỗi cái giữ một closure. **Và phép ghim vòng 1 XANH trong khi vẫn rò rỉ**, vì mép ⑷ của nó so **danh tính** promise — một thứ bản rò rỉ thoả mãn hoàn hảo. Đây đúng là bài học `AI-OPERATOR-GUIDE.md` lỗi #2 đã dặn: *lỗi sống dai không phải vì không ai kiểm, mà vì phép kiểm khẳng định hành vi sai.* **Vòng 2:** chuông nay là một **tập resolver** — mỗi lượt chờ cấp promise riêng, ghi tên vào tập, và **xoá tên trong `finally`** dù thắng bằng chuông hay bằng lưới đỡ; promise của lượt đó thành rác ngay sau vòng lặp, mang theo reaction của nó. Mép ⑷ viết lại để **đo số resolver sống** (≤ 1 qua 400 nhịp) chứ không so danh tính, cộng mép ⑸ mới: reo lúc không ai chờ không được để lại "chuông còn reo" giải oan lượt chờ tới sau. **Đột biến 10/11 đỏ** — trong đó con quan trọng nhất là **dựng lại y nguyên thiết kế rò rỉ của vòng 1, và nó ĐỎ**. Con thoát duy nhất (bỏ `controlWaiters.clear()`) là **tương đương hành vi**: mỗi lượt chờ tự xoá tên mình trong `finally` nên tập vẫn rỗng; giữ `clear()` để lời gọi reo là một thao tác trọn vẹn, và ghi lại con thoát thay vì bày một phép ghim giả. **Một mục audit nêu mà tôi KHÔNG vá, và nói rõ vì sao:** chờ theo MỐC thì một cú **nhảy đồng hồ về phía trước** có thể kết thúc cooldown thử lại sớm, còn `sleep()` theo thời lượng thì không. Nhận có chủ đích, ba lý do ghi ngay trong `sidepanel.js` cạnh chỗ vá: khoảng nghỉ giữa hai job — thứ bảo vệ rate-limit THẬT — đã chạy trên đúng module này từ 28/08, nên để hai đồng hồ cạnh nhau dùng hai cơ chế là để lại cái bẫy đắt hơn cái nó tránh · ca nhảy đồng hồ thường gặp nhất là máy ngủ rồi thức, và lúc đó thời gian thật ĐÃ trôi nên mốc trả lời **đúng** còn `sleep()` mới sai · ca còn lại là hiệu chỉnh NTP, sai số bị chặn bởi chính độ hiệu chỉnh. **Cần Đức chốt một câu nếu muốn khác:** ưu tiên *"không bao giờ ngắn hơn"* kể cả khi đổi đồng hồ thì lối ra là đọc thêm một mốc đơn điệu (`performance.now()`) và lấy cái chậm hơn — chưa làm vì nó chạm **luật thử lại**, thứ `AGENTS.md` gốc mục 2 bắt hỏi Đức. Hai mục audit nêu mà **đo ra là không có thật**: `wholeSeconds()` làm tròn xuống phần thập phân **không tới được** — `retryCooldown()` dựng từ `Math.min`/`Math.max`/`Math.floor` trên số nguyên nên luôn trả số nguyên (đã đọc `runner-core.js`, không suy); và lo "reo lúc không ai chờ gây kẹt" thì mép ⑸ nay ghim thẳng là vô hại. **Suite 117/117.**
- **ĐÓNG B-28 — vòng 3, khép lại sau vòng audit độc lập thứ hai. Đọc dòng này thay cho hai dòng ĐÓNG B-28 ở trên** · Vòng audit thứ hai trả **CONDITIONAL PASS, không blocker nào**, nhưng chỉ đúng **một lỗ còn lại nằm trong chính phép ghim** — và lỗ đó đáng ghi vì nó là cùng một họ với lỗi của vòng 1. Mép ⑷ đo **số tên trong tập resolver**; cái rò rỉ thật là **số reaction đính vào một promise chưa settle**. Hai thứ đó KHÁC NHAU: một bản **hybrid** vừa giữ đúng sổ `Set` + `finally` (nên qua được mọi khẳng định cấu trúc *và* qua được mép ⑷) vừa dùng chung một bell sẽ có `size ≤ 1` **và vẫn rò rỉ**. Nói cách khác: đột biến "dựng lại y nguyên thiết kế vòng 1" đỏ chỉ vì **mỏ neo cấu trúc**, không vì phép đo — nên nó **không** chứng minh phép ghim thấy được con rò rỉ. Đã vá bằng **mép ⑥: đếm thẳng số lần `then` đính vào mỗi promise**, bằng một lớp `Promise` con truyền vào sân khấu qua vm. **Đo thật, không suy:** bản hybrid đạt **400 reaction sau 400 lượt và ĐỎ đúng ở mép ⑥**; bản hiện tại đạt **1**. Cộng một đính chính cho chính lời tôi ghi ở vòng 2: con thoát `controlWaiters.clear()` tôi gọi là *"tương đương hành vi"* — chính xác hơn là **cùng kết quả nhưng không cùng mọi khoảnh khắc quan sát được**, vì ngay sau khi reo, các resolver đã settle còn nằm trong tập cho tới khi `finally` của từng lượt chờ chạy. Không mất cú đánh thức nào (Promise gốc không chạy continuation đồng bộ), nên vẫn giữ `clear()` — để lượt reo là một thao tác trọn vẹn — và vẫn ghi con thoát. **Hai điều audit đòi mà tôi không cấp được:** nó không đọc được repo (`apply deny-read ACLs`, đúng bệnh sandbox đã biết) nên chỉ soi được đoạn mã tôi dán, và lượt dán của tôi **cắt cụt** thân `raceControlWake()` — nên chữ *"CONDITIONAL"* trong phán quyết là **thật**, không phải khách sáo. Ai muốn nâng lên PASS trọn vẹn thì dán đủ thân hàm đó cộng khối gating của B-10. **Suite 117/117.**
- **GHI CHÚ B-14 + B-15 — làm xong nửa tài liệu, HAI MỤC VẪN MỞ** (2026-09-08, `claude-gpt-no-ky-thuat`) · Cố ý **không** đóng, và nói rõ vì sao: phần nặng của cả hai mục là **một phép đo trên trang thật**, mà theo luật vàng 1 thì selector phải có bằng chứng DOM thật — nên phần đó cần tay Đức, không AI nào làm hộ được. Nửa đã làm là nửa mà chính `B-14` yêu cầu bằng chữ (*"phải ghi rõ trong `provider-adapter.js` là chúng chưa từng khớp trên trang thật, để phiên sau không tưởng nhóm này có 5 lớp bảo vệ trong khi thật ra có 1"*): `provider-adapter.js` nay ghi số đo ngay cạnh từng dòng selector — bốn mục `attachmentPreview` mang nhãn `CHƯA TỪNG KHỚP` (đo 26/08, **976 lượt dò**, `Pilot-14_RefFeatureTest/evidence/watch-run-20260826-1411.jsonl`), mục duy nhất còn sống `button[aria-label*="Remove file"]` khớp `=> 2` ở job 2 ảnh và `=> 4` ở job 4 ảnh nên là tín hiệu thật; cả **ba** mục `uploadPending` mang nhãn `CHƯA TỪNG KHỚP` (52 lượt dò có ảnh đính kèm đang hiện). **Không đổi một dòng hành vi nào** — không xoá mục chết, không thêm mục mới, không đoán selector. Kèm ghi nhận giảm nhẹ để phiên sau không hoảng: lớp chặn *"ảnh tham chiếu bị nhận nhầm thành ảnh sinh"* **không** chỉ dựa vào nhóm này (`content.js:237` còn hai tín hiệu độc lập: `role === "user"` và khớp theo tên file; `attachmentContainer` dùng `form` trần nên miễn nhiễm với đổi nhãn) — nên đây là rủi ro **chẩn đoán**, không phải rủi ro **an toàn**. **Cần Đức, hai phép đo, không tốn credit:** ⑴ `dom_probe` **giữa lúc đang gắn ảnh** để tìm một mục neo theo CẤU TRÚC (không theo chữ) rồi thêm vào `attachmentPreview` — đóng B-14; ⑵ gắn một ảnh **~2MB** như ảnh thật của Pilot-08 rồi dò: cửa sổ upload dài hơn nên nếu vẫn không mục nào khớp thì `uploadPending` là selector CHẾT và phải bỏ nhóm đó, còn nếu khớp thì nó sống và chỉ là ảnh nhỏ upload quá nhanh — đóng B-15. Hai phép đo này phân biệt hai khả năng mà hôm nay không ai phân biệt được, và cách xử lý của hai khả năng khác nhau.

## Nghiệm thu live 2026-09-08 · `claude-gpt-no-ky-thuat` — Đức mở Bridge, tôi lái

> Lượt chạy thật đầu tiên của gói này sau khi mở băng. Mọi con số dưới đây **đo trực tiếp qua
> Bridge**, không suy. Ghi cả chỗ ĐẠT, chỗ HỎNG, và chỗ **tôi làm sai** — vì lượt sau đọc lại
> mà không biết tôi đã sai chỗ nào thì sẽ sai y hệt.

### ĐẠT — sáu thứ, tất cả đều là nợ nghiệm thu cũ

| Kiểm | Nợ từ | Bằng chứng live |
|---|---|---|
| Chặn chạy từ trang chủ, **cả hai chiều** | 02/09 | trang chủ đưa `failure_type: WRONG_SURFACE`; hội thoại thật đưa `READY`, `surface: CONVERSATION`, `surface_allowed: true` |
| Trần `run.trial` = 900 giây | 07/09 | `capabilities` và reservation đều trả `timeout_cap_sec: 900` |
| `run.start` vẫn bị cấm | — | không có trong 23 lệnh Bridge |
| **Đồng hồ tiến độ BÒ LÊN** (ADR-0015 vế ②) | 07/09 | `job=119s stage=45s` rồi `job=120s stage=46s` giữa hai lượt hỏi liên tiếp. Trước đó chỉ có tên chặng |
| **B-10** — rảnh thì `current` phải `null` | hôm nay | đúng lúc `state` đổi RUNNING sang IDLE, `current` đổi sang `null` trong cùng một chuỗi hỏi |
| **B-16** — lỗi người sửa được không bị giặt trắng | 06/09 | `jobs.add` với ảnh mẫu chưa nạp đưa `VALIDATION_FAILED` kèm câu tiếng Việt chỉ đúng việc phải làm, KHÔNG phải `INTERNAL_ERROR` |

Thêm hai bất biến an toàn **tự chứng minh trong lúc chạy**, không phải phép kiểm nào cả:
**ADR-0047** — job không quy được kết quả thì thành `INTERRUPTED` + `POST_SUBMIT_UNCERTAIN`, **không
gửi lại**; và **lớp chống nhận nhầm ảnh mẫu thành ảnh sinh** — ảnh mẫu `do-lon.png` nằm ngay trên
trang lúc đối soát mà **không** bị quy thành đầu ra (`generatedChains` rỗng).

### B-36 — nửa (A) ĐẠT, nửa (D) HỎNG. **MỤC VẪN MỞ.**

**(A) đạt, và đạt ở đúng chỗ 04/09 đã hỏng.** Số tệp tên-GUID trong `Downloads`: **39 trước,
39 sau** — đo bốn lần, kể cả **sau một lượt chạy đã tới cửa lưu rồi chết**. Ngày 04/09 chính bước
này làm tăng. Khi chưa có thư mục, mutation vẫn **thành công** và nói thẳng `audit_durable: false`
kèm câu tiếng Việt giải thích; **không tệp nào rơi ra**. Sau khi Đức bấm chọn thư mục:
`audit_durable` **biến mất khỏi payload** (tức sổ đã bền), `checkpoint.verified: true`, tên tệp
`Bridge-2026-09-08T15-04__results__v06.xlsx` — **tên đúng, không GUID**.

**(D) hỏng — và đây là việc còn lại của mục này.** Đức **đã** chọn một thư mục TRƯỚC lúc đóng/mở
panel. Sau khi mở lại, `jobs.add` vẫn trả câu *"phiên này chưa có thư mục nào Đức cấp quyền"*. Tức
lượt **nhận lại thư mục đã cấp quyền không xảy ra**, và Đức phải bấm chọn lần thứ hai. Đó đúng là
thứ (D) tồn tại để làm.

- **đóng khi:** Đức bấm chọn thư mục, đóng panel, mở lại, rồi `jobs.add` qua Bridge **không** trả
  `audit_durable: false` mà **không cần bấm lại**. Kèm: số tệp tên-GUID không tăng (mốc **39**).
- **Chưa loại được một khả năng**, và nó quyết định đây là lỗi hay là hành vi đúng: (D) cố ý
  **không chọn hộ khi có NHIỀU HƠN MỘT** thư mục đã cấp quyền. Nếu máy Đức đang có hai hồ sơ trở
  lên thì (D) đang chạy **đúng luật**, và mục này chỉ còn là chuyện *thông báo*. Không phân biệt
  được từ Bridge — xem mục dưới.

### B-37 · (P1) `audit_durable: false` gộp BA nguyên nhân vào một câu, và Bridge không đọc ra được

Một AI lái từ xa nhận đúng một câu *"phiên này chưa có thư mục nào Đức cấp quyền"* cho **ba** tình
huống cần ba hành động khác nhau: một là chưa ai từng cấp quyền, phải nhờ người bấm; hai là đã cấp
**hai cái trở lên** nên (D) từ chối chọn hộ, phải nhờ người chọn cái nào; ba là handle còn mà quyền
đã mất, phải nhờ cấp lại. Không lệnh Bridge nào đọc được hồ sơ thư mục (23 lệnh, không có lệnh đọc
`output` hay `profiles`; `profiles.remove` chỉ xoá, `output.set_folder_hint` chỉ ghi). Nên hôm nay
tôi **không kết luận được** (D) là lỗi hay là luật — đúng cái bẫy `AI-OPERATOR-GUIDE.md` lỗi số 2
đã dặn: một câu báo không phân biệt được hai nguyên nhân thì nó không giúp chẩn đoán.
- **đóng khi:** payload nói rõ **số hồ sơ đã cấp quyền** (không có, một, hay nhiều), hoặc có một
  lệnh Bridge chỉ-đọc trả về danh sách hồ sơ; và một phép ghim đòi ba nguyên nhân ra ba câu khác nhau.

### B-38 · (P1) Lượt ghi bị `REQUEST_TIMEOUT` VẪN có tác dụng, và công cụ tự phá lớp chống ghi-hai-lần

Đo được: `references.add` trả `REQUEST_TIMEOUT`; tôi thử lại **đúng như câu lỗi dặn** (nguyên văn
*"retry the identical idempotency key"*) và lượt hai trả `added` rỗng kèm câu *"thay thế 2 ảnh
trùng tên"*, checkpoint nhảy **v2 lên v3**. Tức lượt đầu **đã ghi xong** rồi mới hết giờ ở đường
trả lời. Sổ lên **v3 cho 2 lượt ghi có ý định**, và có hai sự kiện audit cho một ý định.
Gốc bệnh **không** nằm ở lớp replay — `bridge-core.js` khai `idempotent: true` đúng cho việc này —
mà ở chỗ **`bridge-cli.mjs` sinh `request_id` MỚI mỗi lần gọi**, nên lượt thử lại trông như một
yêu cầu khác và lớp replay không có gì để khớp. Câu lỗi dặn giữ nguyên khoá, còn công cụ mặc định
thì đổi khoá.
- **đóng khi:** CLI sinh `request_id` **dẫn xuất từ nội dung tham số cộng phiên** (hoặc bắt buộc
  phải truyền tay cho mọi mutation), và một phép ghim chứng minh hai lượt gọi liên tiếp cùng tham
  số chỉ làm checkpoint tăng **một** bậc.

### B-39 · (P2) Panel không trả lời Bridge trong lúc bận, và `run.status` không nói vì sao run chết

Hai triệu chứng, một gốc. Một: suốt buổi, lời gọi Bridge phải thử lại **1 tới 6 lần**, luôn là
`REQUEST_TIMEOUT` rồi tự khỏi; dày nhất **ngay sau mutation** và **trong lúc run đang chạy** — dấu
hiệu panel đơn luồng không kịp trả lời khi đang ghi checkpoint hoặc đang lái run. Hai: `run.trial`
trả `accepted: true` kèm lời dặn *"cứ hỏi `run.status`"*, nhưng khi job chết thì `run.status` chỉ
trả `IDLE` với `current: null` và **không một chữ nào** về nguyên nhân; tôi dò **22 lượt** rồi mới
hiểu ra bằng cách đi đọc `queue.list` để lấy `failure_type`. Một AI lái từ xa làm đúng như tài liệu
dặn sẽ ngồi chờ mãi.
- **đóng khi:** `run.status` mang trường nói job vừa kết thúc ra sao (`last_failure` hoặc tương
  đương) để một mình nó đủ lái vòng chạy; và một phép ghim đòi trường đó xuất hiện sau một lượt
  `INTERRUPTED`.

### B-14 và B-15 — CHƯA đo được, lần thứ hai. Nhưng có một đầu mối THẬT.

**Chưa đo được, nói rõ:** cửa sổ gắn ảnh xảy ra **rất sớm** trong lượt chạy, mà mỗi lời gọi CLI mất
một tới hai giây bắt tay, nên lượt dò đầu tiên của tôi đã rơi vào lúc `job=119s` — quá muộn. Mọi
lượt dò đều trả `attachmentPending: false` và `attachmentPreview` toàn 0; **đừng đọc mấy con 0
đó thành "selector chết"** — không có ảnh đang gắn thì 0 là câu trả lời đúng.

**Đầu mối, có bằng chứng DOM live:** sau khi gắn, ảnh mẫu nằm trên trang dưới dạng
`img[alt="do-lon.png"]` với `src` là `https://chatgpt.com/backend-api/estuary/content?id=file_…`,
và `naturalW` bằng 0, `rect` rộng 0 cao 0. Hai thứ đáng giá ở đó: **`alt` mang đúng tên tệp** (một
mỏ neo theo *thuộc tính*, ổn định hơn nhãn tiếng Anh `Remove file`), và tiền tố
`backend-api/estuary/content` (một mỏ neo theo *đường dẫn*). Cả hai **chưa được thêm vào nhóm** —
luật vàng 1 đòi bằng chứng đo giữa lúc gắn, mà lượt này chưa bắt được cửa sổ đó.

**B-15 có một trần cứng vừa phát hiện:** phép đo mà mục đó tự đề ra — *"thử lại với ảnh 2MB"* —
**không đi qua Bridge được**: `LIMITS.max_reference_data_url_bytes` là **700KB** mỗi ảnh
(`bridge-core.js`). Ảnh lớn nhất tôi gửi được là **433KB**. Nên phép đo 2MB **bắt buộc** cần Đức
kéo tay ảnh vào ô soạn, hoặc nạp qua hộp chọn tệp của panel — không AI nào làm hộ được. Ghi vào
đây để lượt sau không dựng lại cả bộ đồ rồi mới phát hiện.

### TÔI LÀM SAI MỘT CHỖ — ghi ra để lượt sau không lặp

Lượt chạy `Q003` tiêu một lượt sinh mà **không thu được gì**, và **lỗi là của tôi, không phải của
mã**. Tôi chạy một job **tạo ảnh** trong chính hội thoại Đức đang mở — mà hội thoại đó có chỉ thị
riêng buộc trả lời ngắn dạng giải thích (dòng đầu mỗi câu trả lời là một khối `MODE / BUDGET /
RULES`). Nên ChatGPT nhận prompt, trả về một lượt gần rỗng (13 chữ), **không tạo ảnh nào** —
`generatedChains` rỗng, và ảnh duy nhất trên trang là ảnh mẫu của chính tôi. Extension xử đúng ở
mọi bước: gửi, chờ, không quy được đầu ra, xếp `INTERRUPTED` và **không gửi lại**.
**Luật cho lượt sau: job tạo ảnh phải chạy trong một hội thoại TRỐNG, không có chỉ thị riêng.** Đọc
`chat.read` **trước** khi chạy — một lượt trả lời cũ mang khối `MODE` là dấu hiệu đủ để dừng lại.

### ĐÍNH CHÍNH mục trên — tôi đã quy SAI nguyên nhân cho `Q003` (Đức chỉ ra 2026-09-08)

Mục ngay trên kết luận `Q003` hỏng vì **chỉ thị riêng của hội thoại**. Kết luận đó **chưa được
xác lập**, và tôi phải rút lại: có một nguyên nhân thứ hai **do chính tôi gây ra**, và từ bằng
chứng đang có thì **không tách được hai cái**.

**Prompt tôi gửi bị viết tiếng Việt KHÔNG DẤU.** Nguyên văn: *"Tao mot bang mau gom dung ba o
vuong nam ngang…"*. Đức chỉ ra ngay, và Đức đúng — đây không phải lỗi hình thức, nó là lỗi
**nghĩa**: bỏ dấu làm câu mơ hồ ngay ở động từ đầu tiên (*"tạo"* = làm ra, hay *"tao"* = đại từ),
và *"bang mau"* đọc được thành *"bảng màu"* hoặc *"băng mẫu"*. Một prompt như thế có thể tự nó
làm ChatGPT trả về gần rỗng, hoàn toàn độc lập với chỉ thị của hội thoại.

**Không có lý do kỹ thuật nào để bỏ dấu** — đã đo lại: dấu đi qua trọn đường truyền (tệp tham số
UTF-8 → `JSON.parse` → `JSON.stringify` của envelope) **nguyên vẹn 39 ký tự có dấu, không BOM**.
Tôi bỏ dấu vì cẩn thận sai chỗ, không vì công cụ bắt.

**Nên trạng thái thật của `Q003`:** lượt chạy hỏng, và có **hai** nguyên nhân ứng viên —
⑴ prompt của tôi bị bỏ dấu nên tối nghĩa, ⑵ hội thoại có chỉ thị riêng buộc trả lời ngắn. Bằng
chứng đang có (một lượt chạy, prompt lỗi, hội thoại có chỉ thị) **không phân biệt được hai cái**.
Phép đo tách chúng ra thì rẻ: gửi lại **đúng ý đó, viết có dấu tử tế**, trong cùng hội thoại. Ra
ảnh thì nguyên nhân là ⑴; vẫn rỗng thì nghiêng về ⑵.

**Bài học, và nó lớn hơn lượt chạy này:** phần *"extension xử đúng ở mọi bước"* vẫn đứng vững —
nó dựa trên `generatedChains` rỗng và trên việc ảnh mẫu không bị quy thành đầu ra, không dựa
trên chuyện vì sao ChatGPT im. Nhưng phần *"vì hội thoại có chỉ thị riêng"* là tôi **đoán một
nguyên nhân rồi ghi nó như kết luận**, trong khi tôi đang cầm một nguyên nhân khác do mình tạo
ra. Đó đúng loại lỗi mà cột **[ĐO] · [ĐỌC] · [DÒ]** của `FEATURE-PARITY.md` tồn tại để chặn.

**Luật bổ sung cho lượt sau, cộng vào luật "hội thoại trống" ở mục trên:** prompt gửi qua Bridge
là **chữ gửi cho một AI khác đọc**, nên phải **tiếng Việt có dấu**. Viết tệp tham số bằng công cụ
ghi tệp trực tiếp (đường đó đã đo là giữ dấu), đừng dựng bằng heredoc của shell, và **đọc lại
tệp trước khi gửi**.

### ĐÍNH CHÍNH LẦN HAI — nguyên nhân thật của `Q003`/`Q004`, và tôi đã đoán sai HAI LẦN

Hai mục trên tôi lần lượt quy nguyên nhân cho ⑴ chỉ thị riêng của hội thoại, rồi ⑵ prompt tôi
viết không dấu. **Cả hai đều sai.** Nguyên nhân thật, do chính ChatGPT nói ra bằng chữ, hai lần:

> *"Không tạo được ảnh vì tool generate ảnh vừa báo lỗi hệ thống trong lúc render. Đây là lỗi từ
> backend tạo ảnh, không phải do mô tả của bạn."*

Và cho lượt prompt **có dấu** tử tế:

> *"Mô tả của bạn đã đủ rõ. Lỗi này là từ tool, không phải do prompt."*

**Phép đo tách được ba nguyên nhân, và nó rẻ:** tôi gửi lại **đúng một ý** bằng prompt có dấu
(`Q004`) trong **cùng** hội thoại. Kết quả y hệt — `POST_SUBMIT_UNCERTAIN`, `generatedChains`
rỗng. Nên prompt không dấu **không phải** nguyên nhân (dù nó vẫn là lỗi của tôi, xem đính chính
lần một), và chỉ thị hội thoại **không** chặn tạo ảnh. Cái nó chặn là **tự thử lại**.

**Đức tự gõ `render lại` và ChatGPT trả về ĐÚNG KẾT QUẢ.** Nên cả đường ống chạy được: gửi được,
gắn ảnh mẫu được, ChatGPT tạo ảnh được. Thiếu đúng **một tin nhắn thử lại**.

**Còn một nguyên nhân thứ ba do tôi tạo ra, Đức chỉ ra:** ảnh mẫu `do-lon.png` tôi dùng là
**ảnh nhiễu ngẫu nhiên** — tôi sinh 380×380 pixel random để có tệp 433KB mà zlib không nén được,
phục vụ phép đo cửa sổ upload. Dùng nó làm ảnh mẫu cho một prompt *"vẽ lại hoa văn trong ảnh
mẫu"* là một yêu cầu vô nghĩa, và không loại trừ được nó góp phần làm tool bên kia lỗi. **Hai
mục đích phải dùng hai ảnh khác nhau:** ảnh **to** (nhiễu) để đo cửa sổ upload · ảnh **có nghĩa**
(hình khối, màu phẳng, mốc đối chiếu) để kiểm đường chạy. Luật vàng của gói vốn đã dặn ảnh mẫu
phải *"tự tố cáo"* — tôi bỏ qua chính dòng đó.

### B-40 · (P1) Lỗi CHỮA ĐƯỢC của nhà cung cấp nằm ngay trong chữ hội thoại, mà lớp phân loại lỗi không đọc

**Đây là chỗ thật sự chặn vòng CC ↔ GPT tự chạy**, và nó không phải một lỗi trong mã — mọi lớp
đều xử đúng. Chuỗi sự kiện đo được 08/09:

1. Extension gửi prompt, gắn ảnh mẫu, chờ. Đúng.
2. Tool tạo ảnh của ChatGPT **lỗi hệ thống** — lỗi tạm, phía nhà cung cấp.
3. ChatGPT trả về một lượt **chữ** nói rõ: không tạo được ảnh, lỗi từ tool, **và chỉ đúng cách
   chữa** — *"Hãy nhắn 'render lại' để tôi chạy lại từ đầu."*
4. Extension không quy được ảnh nào về attempt này → `POST_SUBMIT_UNCERTAIN` → `INTERRUPTED`,
   **không gửi lại**. Đúng luật ADR-0047, và đúng cách fail-closed.
5. Một người gõ `render lại` → ra kết quả đúng.

Nên một AI lái từ xa **dừng ở bước 4 vĩnh viễn**, trong khi câu chữa nằm sẵn ở bước 3 và
`chat.read` đọc được nó. Toàn bộ thông tin cần thiết có trên dây; không gì nối nó vào quyết định.

**Mục này chạm ADR-0047, nên KHÔNG được tự vá — phải Đức chốt.** Và nó chạm đúng chỗ ADR đó để
ngỏ. Phép đo đứng sau ADR-0047 (ghi trong `tests/post-submit-no-resend-smoke.mjs`) nói: lớp đối
soát có **một** phán quyết dương, ba lối ra còn lại đều là *"không chứng minh được"*, nên số ca
hệ khẳng định được *"lượt gửi đó KHÔNG tạo ra kết quả"* là **0** — và **vì 0** nên luật thu về
*"chặn hẳn"*. Chính phép ghim đó dặn: *"ai nối một nguồn khẳng định mới vào vòng chạy thì test đỏ
và phép đo phải làm lại trước khi nới luật."*

**Hôm nay xuất hiện đúng một nguồn như thế:** chữ của nhà cung cấp nói thẳng *"không tạo được
ảnh"*. Đó là một **khẳng định âm tính tường minh**, loại bằng chứng mà phép đo cũ đếm được 0 ca.
Nên con số 0 ấy **không còn đúng**, và cửa mà ADR-0047 đóng vì "không có bằng chứng" nay có bằng
chứng để cân lại.

**Ba đường Đức chọn, xếp theo mức đụng vào luật an toàn:**

- **⒜ Không đổi luật, chỉ BÁO cho người.** `run.status` (và `last_failure` vừa thêm ở B-39) mang
  thêm trích đoạn chữ của trợ lý cùng cờ *"nhà cung cấp nói có thể thử lại"*. Người/AI thấy, rồi
  **người** gõ `render lại`. Không sửa một dòng luật retry nào. Rẻ nhất, an toàn nhất, và đã đủ
  để vòng lặp không còn dead-end im lặng.
- **⒝ Cho gửi lại, nhưng CHỈ khi nhà cung cấp khẳng định âm tính**, và chỉ bằng đúng câu nó yêu
  cầu, có nắp số lần. Đây là **nới ADR-0047**, nên phải làm lại phép đo trước, và phải có ADR mới
  trỏ hai chiều với ADR-0047.
- **⒞ Giữ nguyên hoàn toàn.** Chấp nhận mỗi lỗi tạm của nhà cung cấp là một job phải người dọn.

Tôi đề xuất **⒜**: nó lấy gần hết giá trị mà **không** chạm luật an toàn nào, và nó là điều kiện
cần cho ⒝ về sau (không báo được thì cũng không nới an toàn được).

- **đóng khi:** Đức chốt một trong ba đường trên; nếu là ⒜ thì `run.status` trả kèm trích đoạn
  chữ trợ lý + cờ "có thể thử lại theo lời nhà cung cấp", và một phép ghim dựng đúng cảnh 08/09
  (tool lỗi, chữ nói cách chữa, không ảnh nào) rồi đòi hai trường đó xuất hiện — **không** đòi
  bất kỳ lượt gửi lại tự động nào.

- **ĐÓNG B-38** · Vá 2026-09-08, `claude-gpt-mvp-3fix`, và **nghiệm thu LIVE trên bản đã triển khai**. Chọn đường thứ hai mà chính mục này đề ra — *"bắt buộc phải truyền tay cho mọi mutation"* — chứ **không** tự dẫn xuất khoá, và lý do là một cái bẫy thật: `bridge-core.js` tự ghi *"a deliberate second upload carries a NEW request_id"*, nên một lượt gọi lại **có chủ ý** với cùng tham số (thêm hai job giống nhau, thay một ảnh mẫu bằng đúng ảnh đó) là việc hợp lệ, và khoá dẫn xuất tự động sẽ **nuốt nó thành replay**. Công cụ không đoán được hai lượt đó là MỘT ý định hay HAI, và đoán sai kiểu nào cũng mất dữ liệu — nên người gọi phải quyết. Đổi lại, câu chặn kèm **khoá gợi ý tiền định** (băm từ method + tham số) để lượt chạy lại chỉ việc dán. `READ_ONLY_METHODS` cho lượt chỉ đọc đi qua tự do: gọi lại `run.status` mười lần là chuyện bình thường. **Nửa thứ hai của điều kiện đóng — *"phép ghim chứng minh hai lượt gọi cùng tham số chỉ làm checkpoint tăng một bậc"* — ĐÃ CÓ SẴN, không phải tôi viết:** `tests/bridge-core-smoke.mjs:143` ghim `handlerCalls === 1` cho cùng `client_id` + `request_id` (*"replay does not invoke the proposal handler twice"*), cộng `REQUEST_ID_REUSED` ở dòng 147. Lớp replay của host **chưa bao giờ hỏng**; thứ hỏng là CLI không cho nó cơ hội khớp. Ghim mới: `tests/bridge-cli-mutation-key-smoke.mjs` — ba mép, trong đó mép đắt nhất là **đối chiếu danh sách chỉ-đọc của CLI với `read_only` trong `METHOD_REGISTRY` của host**, vì một luật nằm ở hai bản sao thì sớm muộn nói hai chuyện khác nhau; nó **bắt được hai chỗ lệch thật ngay lượt chạy đầu** (`session.hello` và `bridge.sessions`, cả hai hoá ra hợp lệ và nay được khai tường minh kèm phép kiểm ngược). **Nghiệm thu live:** bản đã chép sang thư mục Bridge của Đức chặn đúng `jobs.remove` thiếu khoá và vẫn cho `run.status` đi qua. **15/15 đột biến đỏ** trên cả ba bản vá.
- **ĐÓNG B-37** · Vá 2026-09-08, `claude-gpt-mvp-3fix`. `adoptAuthorizedOutputProfile()` nay ghi **lý do** kèm hai con số đếm được vào `state.outputAdoptDiag` ở **từng** đường trả `null`, và câu báo dựng từ đó — bốn nhánh, bốn câu khác nhau: chưa có settings · **không hồ sơ nào còn quyền** (kèm số hồ sơ tìm thấy và số còn quyền) · **có từ hai hồ sơ trở lên** nên cố ý không chọn hộ (kèm con số, và chỉ đường ra bằng `output.configure`) · **kho hồ sơ không đọc được** (nói rõ *bấm cũng không chữa*, vì nhánh này dễ bị nhập nhèm nhất). **Không đổi một nhánh quyết định nào** — vẫn nhận khi và chỉ khi có đúng một hồ sơ được cấp quyền. Xoá luôn hằng `AUDIT_HELD_NOTE` vì nó thành mã chết; để lại là một bản sao thứ hai của cùng câu báo, và hai bản sao sẽ lệch nhau. Ghim: `tests/output-adopt-reason-smoke.mjs` — **chín mép**, và bốn mép cuối là **dây nối**: chạy chính `adoptAuthorizedOutputProfile()` với kho hồ sơ giả để đòi nó THẬT SỰ ghi chẩn đoán. Bốn mép đó sinh ra vì thử phá vòng đầu cho thấy phần kiểm hàm-lá **để lọt** việc xoá hẳn lượt ghi chẩn đoán — hàm dựng câu đúng mà không ai điền dữ liệu thì câu vẫn sai. Mép ⑼ còn phải viết lại lần hai: bản đầu bắt đầu với chẩn đoán `null` nên xoá hẳn dòng dọn vẫn xanh; nay bắt đầu bằng một chẩn đoán CŨ, đúng cảnh thật. **Trần tuyên bố: SUITE + đột biến, CHƯA LIVE** — cần Đức nạp lại tiện ích rồi gọi `jobs.add` lúc chưa bind thư mục.
- **ĐÓNG B-39** · Vá 2026-09-08, `claude-gpt-mvp-3fix`. `run.status` nay trả `last_failure` — job nào, attempt nào, `INTERRUPTED` hay `FAILED`, mã lỗi, câu lỗi, `retry_count`, `run_id`, mốc thời gian. Ghi ở **đúng hai cửa settle cuối** (`markInterrupted` và nhánh FAILED của `resolveJobFailure`), và **xoá lúc bắt đầu run mới**. **Cố ý KHÔNG ghi ở đường thử lại:** một job thử lại rồi thành công thì lượt lỗi giữa đường không phải kết cục, khai nó ra sẽ làm agent kết luận run hỏng trong khi nó xong sạch. **Cố ý KHÔNG tích luỹ qua nhiều run:** câu hỏi trường này trả lời là *"run vừa rồi kết thúc thế nào"*, không phải *"kể hết lịch sử lỗi"* — lịch sử nằm ở sổ audit và ledger; giữ lại là mời agent đọc một lỗi cũ rồi tưởng nó vừa xảy ra. Ghim: mở rộng `tests/run-status-stale-current-smoke.mjs` từ 4 lên **tám mép** — cộng `last_failure` đi qua payload, mép ngược `null` khi chưa có lỗi, **chạy `markInterrupted` thật** để đòi nó ghi đúng `INTERRUPTED` (không phải `FAILED`), và một khẳng định **tĩnh, có khai là tĩnh** cho lượt xoá đầu run. Ba mép sau sinh ra vì thử phá vòng đầu để lọt cả ba. **Trần tuyên bố: SUITE + đột biến, CHƯA LIVE** — lượt chạy live 08/09 trả `last_failure: null` vì tiện ích đang chạy mã cũ, đúng như phải vậy.

### B-41 · (P1) Thi hành ADR-0050 mục ⒝⒞⒟ — tự chữa để chạy hết job

[ADR-0050](docs/adr/0050-chay-het-job-tru-ba-loai-dung-han.md) đã `Accepted` 08/09, nhưng mới thi
hành **mục ⒠** (hạ nắp chờ xuống 90 giây, đã ghim
`tests/trial-cooldown-adr0050-smoke.mjs`, 5/5 đột biến đỏ). Bốn mục còn lại chưa có một dòng mã
nào. Mục này tồn tại để một quyết định đã chốt không nằm im.

Ghi rõ cái đã xong để phiên sau không làm lại: **⒜ không cần làm gì** — `classifyFailure()` đã xếp
`captcha`, `unusual activity` và `security/interstitial` vào cùng `SECURITY_HARD_STOP`, và
`GENERATION_LIMIT_REACHED` vốn đã là hard stop. Ba loại Đức muốn dừng hẳn **đang dừng hẳn sẵn**.

**Việc thật, ba phần, làm theo đúng thứ tự này:**

**⑴ `RECEIVER_LOST` và `WRONG_SURFACE` thành điều kiện chữa được** (ADR-0050 ⒝). Cả hai xảy ra
**trước khi gửi**, nên chữa xong chạy tiếp không tốn lượt nào — đây là phần rẻ nhất và an toàn
nhất, làm trước. Cách chữa đã có sẵn công cụ: nạp lại tab (`chat.reload` đã là một method Bridge)
cho cái thứ nhất; đưa tab về một hội thoại cho cái thứ hai. **Bắt buộc kèm NẮP SỐ LẦN CHỮA trong
một run** — ADR-0050 ghi rõ mặt xấu này: một điều kiện chữa mãi không khỏi mà không có nắp thì ⒝
biến một lần dừng thành **vòng lặp vô hạn**, tệ hơn hẳn cái nó thay.

**⑵ `DETECTION_BLIND` thành điều kiện chữa được, nhưng ĐỐI SOÁT TRƯỚC, không gửi lại** (ADR-0050
⒞). Chữa xong thì hỏi *"kết quả có sẵn trên trang không"* — thấy thì quy về job và xong; khẳng
định được là không có thì mới gửi lại; vẫn không chắc thì `INTERRUPTED` như hôm nay. Đây là phần
dễ làm hỏng nhất: một bộ dò mù **sau khi gửi** rất có thể đang mù trước một kết quả ĐÃ CÓ, và gửi
lại lúc đó là đốt lượt thứ hai cho việc đã xong.

**⑶ Lời nhà cung cấp tự khẳng định là một nguồn đối soát** (ADR-0050 ⒟, và nó đóng luôn `B-40`).
Khi ChatGPT nói bằng chữ rằng nó không tạo được gì, đó là *"đối soát khẳng định được"* theo đúng
chữ ADR-0047 — nên **thi hành**, không phải nới. Nguồn chữ đã đọc được qua `chat.read`.

**Ràng buộc kiến trúc, đừng vi phạm:** `submissionMayExist()` và `canRetry()` **giữ nguyên vai** —
chúng vẫn là chỗ duy nhất trả lời *"lượt gửi này có thể đã bay chưa"*. ⑵ và ⑶ **thêm một cửa đối
soát đứng TRƯỚC** chúng, không sửa vào trong. Sửa thẳng hai hàm đó là bỏ mất cái đảo-mặc-định mà
ADR-0047 dựng, và đó là lớp bảo vệ đắt nhất của cả gói.

**Phép đo phải làm lại trước khi vá.** `tests/post-submit-no-resend-smoke.mjs` đang đếm **0 nguồn
khẳng định** và kết luận "chặn hẳn"; chính nó dặn *"ai nối một nguồn khẳng định mới vào vòng chạy
thì test đỏ và phép đo phải làm lại trước khi nới luật."* Nay có nguồn thứ nhất, nên con số 0 sai.
Viết lại để nó **đếm số nguồn** và ghim rằng mỗi nguồn đi qua đúng một cửa đối soát — đừng nới nó
cho xanh.

- **đóng khi:** ⑴⑵⑶ đã vá, mỗi phần một phép ghim HÀNH VI (chạy hàm đã ship, không grep chữ);
  `post-submit-no-resend-smoke.mjs` viết lại và đếm đúng số nguồn khẳng định; nắp số lần chữa có
  ghim riêng chứng minh hết nắp thì rơi về `INTERRUPTED`; thử phá 0 con thoát; và **một lượt chạy
  live** cho thấy một loạt job đi qua được ít nhất một lần tự chữa.

### B-42 · (P1) Case 2 — đường chat thẳng cho reasoning nhiều lượt

Đức chốt 08/09 khi chọn hướng: *"thêm đường chat thẳng là ý kiến hay & chủ động thao tác được
xuyên suốt hơn, đặc biệt là cho các case reasoning."*

**Vì sao đường job hiện có không dùng được cho việc này** (đo 08/09): mỗi lượt gửi qua Bridge phải
đi qua `jobs.add` → `run.trial`, tức mỗi câu trong hội thoại **đẻ ra một job và một dòng Excel** —
sổ sách đầy rác hội thoại. Hạ nắp chờ xuống 90 giây đã đỡ phần chờ, nhưng không đỡ phần **hình
dạng sai**: reasoning nhiều bước không phải một hàng đợi công việc.

Việc Đức mô tả: phiên dài, chờ lâu, nhiều bước, nhiệm vụ đa dạng (Google Sheet, GitHub, suy luận
nhiều bước tới kết luận cuối).

**Ba chỗ phải cân trước khi viết dòng mã đầu tiên:**
- **Đây là quyền mới cho extension** theo `AGENTS.md` gốc mục 2 → phải hỏi Đức lần nữa ở mức thiết
  kế, không chỉ ở mức "có nên làm không".
- **`run.start` vẫn cấm vĩnh viễn.** Một `chat.send` tự do là đường vòng quanh chính lệnh cấm đó
  nếu nó gửi được prompt tuỳ ý không giới hạn. Phải khai rõ nó khác `run.start` ở chỗ nào, và
  chốt an toàn nào thay thế.
- **Vẫn phải có sổ.** Đường job ghi audit và checkpoint; một đường chat bỏ qua hết là mất dấu vết
  đúng lúc phiên dài nhất và khó nhớ nhất. Tối thiểu: mỗi lượt gửi một dòng audit.

- **đóng khi:** có brief riêng được Đức duyệt (khai rõ ba chỗ trên), rồi mới tới mã + ghim + audit
  độc lập. **Đừng gộp vào `B-41`** — một cái là sửa luật hỏng trên đường có sẵn, một cái là mở
  đường mới.

- **TIẾN ĐỘ B-41 ⑴ (09/09)** · Phần ⑴ đã vá và đã ghim: `RECEIVER_LOST` và `WRONG_SURFACE` nay là
  điều kiện chữa được, cửa `mayRepair()` đứng **trước** `canRetry()` trong `runner-core.js`, nắp 3
  lần **theo từng loại trong một run**, `canRetry()` và `submissionMayExist()` không đổi một chữ.
  Ghim `tests/workspace-repair-adr0050b-smoke.mjs` (10 mép, chạy hàm đã ship) và phần 2b mở rộng
  của `tests/post-submit-no-resend-smoke.mjs`; thử phá **12/12 đỏ**. Suite gói 120 → 121.
  **Một chỗ tôi cố ý LỆCH khỏi chữ của ADR-0050 ⒝, và lệch theo hướng chặt hơn:** ADR viết hai
  loại này "xảy ra trước khi gửi", nhưng `activeTab()` ném `RECEIVER_LOST` ở **bất kỳ** đâu, kể cả
  sau khi prompt đã bay — chữa lúc đó là F5 đè lên một lượt đang chạy, đúng cái `chat.reload` từ
  chối làm. Nên cửa chữa đòi `submissionMayExist()` phải là false, không có ngoại lệ.
  **Một số đo ngược với kỳ vọng, ghi ra để không ai đọc bảng rồi tưởng loại đó tự khỏi:**
  `WRONG_SURFACE` **trên thực tế phần lớn vẫn dừng hẳn**. Nó chỉ tới được cổng khi
  `boundConversationId` là null (run bắt đầu ngay trên trang phóng), và lúc đó **không có đích để
  về** — đoán lấy một hội thoại là đúng cái `bindRunTab()` sinh ra để chặn. Ca chữa được chỉ là ca
  hiếm "tab đang điều hướng dở lúc cổng chạy". Muốn chữa thật thì phải cho phép **mở hội thoại
  mới**, và đó là một quyết định khác, cần Đức.
  **Còn lại của B-41:** ⑵ `DETECTION_BLIND` (đối soát trước, không gửi lại) và ⑶ lời nhà cung cấp
  tự khẳng định là nguồn đối soát. Điều kiện đóng ở khối B-41 giữ nguyên; con số "0 nguồn khẳng
  định" trong `post-submit-no-resend-smoke.mjs` **vẫn đúng cho tới khi làm ⑶** — phần ⑴ không nối
  thêm nguồn đối soát nào.

### B-43 · (P0) Job hỏi–đáp bằng chữ ghi lại MỘT MẨU câu trả lời rồi báo THÀNH CÔNG — đo live 09/09

**Đây là "báo thành công giả", loại lỗi tệ nhất trong gói:** không có gì đỏ, không có gì để người
vận hành nhìn thấy, và dữ liệu sai đi thẳng vào sổ cái. Nó vô hiệu hoá case 2 của Đức (hội thoại
reasoning nhiều lượt) hoàn toàn, vì thứ ghi được không phải câu trả lời.

**Số đo, hai lượt gửi thật qua Bridge, 0 credit lãng phí** (`run_id 20260908-1936-…`):

| | lượt 1 | lượt 2 |
|---|---|---|
| Máy ghi vào sổ | **6 ký tự** — `Gửi nh` | **28 ký tự** — `Khóa tab + conversation ID —` |
| Trên trang, đọc lại sau ~2 phút | **237 ký tự**, đủ ba ý đã hỏi | 28 ký tự (không mọc thêm) |
| Trạng thái | `SUCCESS`, `persistence_verified: true` | `SUCCESS` |
| `submitted_at` → `output_saved_at` | 19:36:24 → 19:36:36, **12 giây** | ~12 giây |

Lượt 1 **chứng minh được** là ghi hụt: cùng một lượt trả lời, sổ ghi 6 ký tự còn trang giữ 237.
Ký tự ghi được là **tiền tố** của câu đầy đủ, nên đây là bắt hụt lúc đang chảy chữ, không phải
đọc nhầm chỗ.

**Chỗ ra quyết định** (`content.js`, `waitForCompletion`, nhánh chữ):

```js
if (resultMessage && !stopButton) {
  …
  if (stableText && Date.now() - stableSince >= 1500) return { type: "text", … };
}
```

Luật hiện tại là *"không thấy nút Dừng, và chữ đứng yên 1,5 giây"*. Cả hai vế đều hụt trong một
phiên có chỉ dẫn riêng của Project: ChatGPT hiện một pha suy nghĩ, chữ đứng yên lâu hơn 1,5 giây,
và nút Dừng **không khớp** trong pha đó.

**HAI giả thuyết, và chúng đòi hai bản vá KHÁC HẲN — đừng vá trước khi đo:**
- ⑴ Nút Dừng **chưa từng** khớp trong cả lượt. Nếu vậy, `generationSeen` — biến đã được tính ở
  ngay trên và **hiện đang bị bỏ không dùng** — là lớp chặn sẵn có: đòi `generationSeen === true`
  trước khi nhận `stable_text`. Một dòng.
- ⑵ Nút Dừng **có** khớp lúc đầu rồi biến mất trong pha suy nghĩ. Nếu vậy `generationSeen` vô
  dụng, và phải đổi sang một tín hiệu khác (ví dụ nắp chữ tối thiểu, hoặc chờ lâu hơn khi chữ
  còn ngắn bất thường so với độ dài prompt).

**Phép đo tách được hai giả thuyết:** `diagnostics.dom_probe` nhắm vào nhóm selector nút Dừng,
chạy **giữa lúc** một job chữ đang chảy trong một hội thoại thuộc Project. Đếm số khớp theo thời
gian. Đây đúng là kiểu phép đo mà `AI-OPERATOR-GUIDE.md` lỗi #5 dựng ra để làm.

**Đừng nới ngưỡng 1,5 giây lên cho "chắc"** — nó không phải nguyên nhân, và nới nó chỉ làm mọi
job chậm thêm mà vẫn hụt ở một pha suy nghĩ dài hơn.

- **đóng khi:** có số đo `dom_probe` nói rõ giả thuyết nào đúng; bản vá theo đúng giả thuyết đó,
  kèm một phép ghim HÀNH VI (chạy `waitForCompletion` đã ship trên DOM giả có pha suy nghĩ, chứng
  minh nó KHÔNG nhận mẩu chữ đầu); thử phá 0 con thoát; và **một lượt live** trong một hội thoại
  thuộc Project cho thấy số ký tự ghi vào sổ **bằng** số ký tự đọc lại được trên trang.

### B-44 · (P1) Công cụ dọn rác KHÔNG nhìn thấy chỗ Chrome thật sự ghi — đo live 09/09

Đức yêu cầu *"chat xong xoá tất cả file rác bị tải về"*. Vế xoá hiện **hụt đúng chỗ quan trọng**.

**Số đo 09/09, sau lượt chạy nghiệm thu ADR-0051:** gói xin ghi vào `Downloads/Duc Auto ChatGPT`.
Chrome ghi vào **`Downloads/Phai sinh`** — thư mục tải mặc định của Đức — dưới tên GUID. Tức
Chrome bỏ qua **cả đường dẫn thư mục**, không chỉ phần tên tệp; đây là số đo MỚI, ADR-0051 mới
chỉ ghi được vế tên. Đếm được **105 tệp** trong thư mục đó.

`scripts/don-rac-tai-xuong.mjs` **chỉ quét tầng ngoài cùng** của thư mục Tải xuống, nên nó không
bao giờ thấy đống này. Quét hôm nay ra 16 tệp xoá được ở tầng ngoài — và **0** trong số đó là của
lượt chạy vừa rồi.

**Đừng làm nó quét đệ quy cả cây Tải xuống.** Thư mục Tải xuống của Đức có tài liệu thật (đã đo:
một `.pdf` và một `.jpg` của Đức lọt vào nhóm được bảo vệ đúng nhờ luật "không lọc theo tên").
Mở rộng phạm vi quét là mở rộng bán kính của một thao tác xoá không hoàn lại được.

**Hướng an toàn hơn, cần đo trước khi chọn:** hỏi thẳng `chrome.downloads` những tệp **do chính
extension này tải về** — API đó trả `id`, đường dẫn thật và cả `byExtensionId`. Đó là bằng chứng
chủ sở hữu mạnh hơn hẳn cách đoán theo nội dung đang dùng, và nó không cần quét thư mục nào cả.

- **đóng khi:** dọn được các tệp lượt chạy 09/09 sinh ra ở `Downloads/Phai sinh`; phạm vi xoá
  **không** rộng ra ngoài tệp chứng minh được là của gói; phép ghim hành vi chạy công cụ thật vào
  thư mục tạm có cả tệp giả của người dùng và chứng minh chúng còn nguyên; thử phá 0 con thoát.

- **ĐO XONG PHÉP ĐO CỦA `B-43` (09/09) · KẾT QUẢ BÁC BỎ GIẢ THUYẾT RẺ, và đổi cả chẩn đoán.**
  `dom_probe` chạy vòng trong lúc một job chữ đang chạy (`Q003`, 200 lượt dò):

  | mốc | quan sát |
  |---|---|
  | +0s … +23s | `stopFound=false`, 4 selector nút Dừng đều `=> 0` |
  | **+24s** (đúng lúc gửi) | `stopFound=true`, `button[data-testid="stop-button"] => 1` và `button[aria-label^="Stop"] => 1`, số lượt trợ lý 5 → 6 |
  | +24s … +31s | nút Dừng **hiện liên tục 8 giây** |
  | **+32s** | nút Dừng **biến mất** |
  | +34s (`output_saved_at` 20:31:21) | máy chốt kết quả, ghi **27 ký tự** |

  **⑴ Giả thuyết rẻ SAI.** Nút Dừng **có** khớp, nên `generationSeen` là `true` và bản vá một
  dòng *"đòi `generationSeen` trước khi nhận"* **sẽ không chặn được gì**. Đây đúng là lý do phải
  đo trước khi vá — nó vừa chặn một bản vá sai.

  **⑵ Một phát hiện KHÁC HẲN, và nó có thể mới là nguyên nhân chính.** Hội thoại này chạy model
  `gpt-5-6-thinking` (đọc từ `data-message-model-slug`) **bên trong một Project có chỉ dẫn riêng**,
  và chỉ dẫn đó bắt mỗi câu trả lời mở đầu bằng một dòng tiêu đề dạng
  `[MODE: … | BUDGET: … | RULES: …]`. Ba lượt gần nhất, đọc lại trang **nhiều phút sau khi chạy
  xong**, cho thấy lượt trả lời của trợ lý **đúng bằng dòng tiêu đề đó và không có gì thêm**:
  27 · 35 · 27 ký tự. Tức phần lớn cái trông như "ghi hụt" thật ra là **ChatGPT chỉ trả về dòng
  tiêu đề** — không phải extension đọc thiếu.

  **⑶ Nhưng vẫn còn MỘT ca ghi hụt thật, và nó chưa được giải thích.** Lượt đầu của vòng chat:
  máy ghi **6 ký tự** (`Gửi nh`), đọc lại trang sau đó ra **237 ký tự** đầy đủ ba ý. Cùng một hàm
  đọc, hai kết quả — nên ở ca đó extension **đã chốt trước khi trang xong**.

  **Phép đo tiếp theo, rẻ và tách được hai thứ đang lẫn vào nhau:** chạy đúng một prompt như vậy
  trong **một hội thoại THƯỜNG, ngoài Project**. Nếu ở đó câu trả lời đầy đủ và máy ghi đúng số
  ký tự → phần lớn `B-43` là chỉ dẫn của Project, không phải lỗi mã, và việc còn lại chỉ là ca ⑶.
  Nếu ở đó vẫn hụt → lỗi nằm trong luật chốt kết quả, và bản vá phải nhắm vào khoảng lặng giữa
  dòng tiêu đề và phần thân.

  **Đừng vá trước khi có số đo đó.** Giả thuyết rẻ vừa bị bác, và bác bằng số đo chứ không bằng
  suy luận — lần này đừng thay nó bằng một giả thuyết đắt chưa được đo.
