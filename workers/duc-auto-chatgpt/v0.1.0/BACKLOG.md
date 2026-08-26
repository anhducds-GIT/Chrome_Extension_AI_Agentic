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

### B-16 · `MISSING_REFERENCE` bị bọc thành `INTERNAL_ERROR`
Bắt được live 2026-08-26: gọi `jobs.add` với token ảnh chưa có file trả về
`INTERNAL_ERROR` / `retryable: false`, còn nguyên nhân thật
(`MISSING_REFERENCE: Q001 requires 'REF-A-RED-CIRCLE.png'`) chỉ hiện trong `details.debug` —
mà debug chỉ bật khi Chế độ phát triển đang BẬT.

"Chưa nạp ảnh tham chiếu" là **điều kiện người sửa được**, đúng ra phải là `VALIDATION_FAILED`
kèm câu chỉ đường tới `references.add`. Cùng họ với **B-11** (`run.trial` không có workbook).
Sửa chung một lượt thì hợp lý: cả hai đều là `prepare()` nổ bên trong mutation rồi bị bọc.

### B-18 · `references.add` buộc gọi 3 bước — đã cân nhắc, CHỌN giữ nguyên
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

### B-17 · Trần 90 giây của `run.trial` KHÔNG đủ cho việc thật
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

### B-19 · "Thử lại" KHÔNG chỉ giới hạn ở lỗi trước lúc gửi — cần Đức chốt luật
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

### B-11 · `run.trial` không có workbook bị bọc thành `INTERNAL_ERROR`
Đo 2026-08-26: gọi `run.trial` khi chưa nạp workbook trả về `INTERNAL_ERROR` /
`retryable: false`, còn nguyên nhân thật ("Open an XLSX workbook first" từ
`authoritativeValidate`) chỉ hiện trong `details.debug` — mà debug chỉ bật khi Chế độ phát
triển đang BẬT. Đây là **điều kiện người sửa được**, đúng ra phải là `WORKBOOK_NOT_LOADED` /
retryable như `run.status` đang làm. Cùng hạng với phát hiện cũ "RUN_ACTIVE bị gắn retryable
cho trạng thái chỉ người sửa được". `jobs.add` đã có đường bootstrap nên không dính;
`run.trial` thì chưa.

### B-08 · Chuyển text anchor của poll A/B vào adapter
`ab-poll-core.js` đang giữ cả *chính sách* (random/click_1/... — trung tính) lẫn
*text anchor* của ChatGPT (riêng nhà cung cấp). Anchor nên nằm trong
`provider-adapter.js`, chính sách ở lại. Hoãn tới sau khi selector đã xác minh
xong, để lần bóc tách này vẫn là "không đổi hành vi".

### B-09 · Rác test trong thư mục output
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
