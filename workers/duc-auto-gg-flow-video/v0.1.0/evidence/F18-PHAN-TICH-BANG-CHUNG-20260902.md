# F-18 — Đọc lại bằng chứng đã có, không chạy thêm lượt nào

> Phiên `claude-f18-evidence`, 2026-09-02. **0 credit. Không mở trang Flow.
> Không đụng `typeIntoFlowComposer`.** Toàn bộ kết luận dưới đây rút ra từ file
> đã nằm sẵn trong `evidence/` và từ `content.js` tại HEAD `db04eba`.

Việc được giao: *"đọc `detection.typing_path` của lượt F4R2"* (BACKLOG F-18,
`claims.json`). Kết quả: **con số đó chưa bao giờ được ghi.** Và khi đi tìm lý
do, hai chỗ khác trong hồ sơ F-18 cũng sai theo.

---

## 1. `detection.typing_path` của F4R2 không tồn tại

**Đo:**

```
grep -rn "detection" evidence/F4R2-*   →  0 dòng
```

**Vì sao:** trong `runPrompt`, thứ tự ở HEAD `db04eba` là

| # | Bước | Dòng |
|---|---|---|
| 1 | `typing = await typeIntoFlowComposer(...)` | `content.js:1076` |
| 2 | `await waitForSendButtonReady()` | `content.js:1085` ← **lượt F4R2 NÉM ở đây** |
| 3 | ghi `detection: { … typing_path: typing.path … }` | `content.js:1089` |

Bước 3 nằm **sau** bước 2. Lượt nào chết ở cổng gửi thì không bao giờ chạy tới
chỗ ghi số đo. Nói cách khác: **số đo về đường gõ chỉ được lưu ở những lượt
KHÔNG cần tới nó.**

Và nó còn hụt thêm một tầng nữa: `recordDetection()` thay sạch
`attempt.detection` khi vòng dò kết quả xong, chỉ giữ lại các trường khai trong
`CARRIED_DIAGNOSTICS` — mà `typing_path` **không** nằm trong danh sách đó. Nên
kể cả một lượt **thành công** cũng về sổ cái với `typing_path` rỗng.

> Đây là lý do F-18 đứng yên hai phiên: thông tin cần thiết **được tính ra
> trong bộ nhớ ngay lúc chạy**, rồi bị vứt đi hai lần.

---

## 2. `valueLen: 172` KHÔNG chứng minh "chữ đã vào composer"

Đây là con số cả F-18 dựng lên: *"chữ ĐÃ vào DOM (valueLen 172) mà nút vẫn
disabled"*. Nó không đứng vững.

**Đo — bảng dưới lấy từ chính các snapshot F1 ngày 27/08, ngày mọi thứ CHẠY ĐƯỢC:**

| Snapshot | Giờ | composer `valueLen` | `arrow_forward Create` |
|---|---|---:|---|
| F1-snapshot-3-textboxes | 14:54:28 | **28** | `disabled: true` |
| F1-snapshot-5a-during-generation | 15:07:46 | **28** | `disabled: true` |
| F1-snapshot-5b-during-generation | 15:07:51 | **28** | `disabled: true` |
| F1-snapshot-5c-during-generation | 15:07:56 | **28** | `disabled: true` |
| F1-snapshot-6-after-new-video | 15:08:57 | **28** | `disabled: true` |

Mốc thời gian quan trọng, lấy từ `F1-EVIDENCE-NOTES.md`: dry_run gõ prompt lúc
**15:07:17**, bấm Create lúc **15:07:42**, video thật sinh ra sau đó.

Vậy con số 28 **không nhúc nhích** qua cả ba trạng thái: trước khi gõ (14:54),
4 giây sau khi submit (15:07:46), và sau khi video đã xong (15:08:57). Một con
số đứng yên trong khi prompt được gõ vào rồi gửi đi thì **không phải prompt**.
Nó là phần `textContent` cố định của chính phần tử đó (`valueLen` được đo bằng
`(element.value ?? element.textContent ?? "").length` — `content.js:1374`).

**Hệ quả 1 — bỏ câu "chữ đã vào DOM mà nút vẫn disabled".** Ngày 27/08, một
composer đọc ra `28` **cũng** đi kèm nút disabled, và lúc đó chẳng có gì hỏng cả.

**Hệ quả 2 — ứng viên số 4 gần như bị loại.** BACKLOG ghi ứng viên "composer có
sẵn 27 ký tự thừa" là **đáng ngờ nhất và rẻ nhất để loại**. Nhưng:

```
145 (prompt F4R2) + 27  =  172 (đo được 02/09)
  0 (ô trống)     + 28  =   28 (đo được 27/08, ngày chạy được)
```

Phần dôi ra ~27–28 ký tự **có mặt ở cả hai ngày**, kể cả ngày mọi thứ chạy
được. Nó là hằng số của phần tử, không phải rác còn sót của lượt trước. Đi soi
`selectNodeContents` là đi sai đường.

**Và đọc ngược lại thì 172 nói điều tử tế hơn:** 145 + hằng số ≈ 172 nghĩa là
prompt **đã vào** thật. Cái hỏng nằm ở chỗ Flow không mở nút, chứ không phải ở
chỗ chữ không tới nơi.

---

## 3. Bốn ứng viên trong BACKLOG: hai cái đã loại được, tại chỗ

BACKLOG F-18 liệt bốn khác biệt giữa lượt 27/08 (chạy được) và 02/09 (hỏng).
Đọc code là loại được hai:

| # | Ứng viên | Phán quyết |
|---|---|---|
| 1 | **Đường gọi khác nhau** (`evidence_submit` dry_run ↔ runner) | **LOẠI phần lớn.** dry_run lấy đích bằng `textareas[0] \|\| findComposer()` — nghe như đích khác. Nhưng `textareas` đã lọc `isVisible`, và `<textarea>` duy nhất trên trang là `g-recaptcha-response`, `visible: false` ở **cả hai** ngày. Nên dry_run cũng rơi về `findComposer()`: **cùng một phần tử**. Hai đường còn khác ở chỗ runner chạy thêm `ensureFlowVideoMode()` + `stageReferences()` trước khi gõ — nhưng lượt F4R2 Đức đã đặt Video mode bằng tay (mode đã đúng → `ensureFlowVideoMode` **return ngay**) và không có ảnh tham chiếu (`stageReferences([])` → `return null` ngay, `content.js:696`). **Cả hai đều là no-op ở lượt đó.** |
| 2 | Hồ sơ Chrome (`kaito`) | **Còn sống.** Chưa có cách loại mà không chạy lượt mới. |
| 3 | Bản Flow đổi (cách nhau 5 ngày) | **Còn sống, và nay là ứng viên mạnh nhất** — vì ba cái kia đã yếu đi. |
| 4 | 27 ký tự thừa trong composer | **LOẠI** — xem mục 2. |

Một điều nữa cần nói cho công bằng: lượt F4R2 **đã chờ đủ**. `typeIntoFlowComposer`
tự chờ nút sáng 2500 ms sau mỗi tầng, rồi `waitForSendButtonReady` chờ tiếp trọn
`sendReadyTimeoutMs`. Nút **thật sự không bao giờ sáng**, không phải chờ hụt.

---

## 4. Đã sửa gì trong phiên này (thuần bằng chứng, không đụng đường gõ)

Đức chốt 02/09: **F-18 debug sau, đừng tự sửa mù.** Phiên này giữ đúng —
`typeIntoFlowComposer` **không bị chạm một dòng nào**. Chỉ vá đường bằng chứng,
để lượt live kế tiếp tự nói ra câu trả lời thay vì phải đoán tiếp:

1. `typing_path`, `typing_ok`, `prompt_len`, `composer_len_before_typing`,
   `composer_len_after_typing` được ghi bằng `carryDiagnostic` **ngay sau khi
   gõ**, trước mọi cổng có thể ném.
2. Năm trường đó được thêm vào `CARRIED_DIAGNOSTICS` để `recordDetection` không
   xoá — lượt **thành công** cũng phải để lại số đo, nếu không thì không có gì
   để so với lượt hỏng.
3. `composer_len_before_typing` là **mốc so** mà lượt F4R2 thiếu và đã phải ghi
   thành nợ. Nay đo trước khi gõ.
4. Câu báo lỗi ở cổng gửi mang theo đường gõ:
   `Send button did not become ready (typing_path=…, typing_ok=…, text_len N->M, prompt_len=…)`.
   Tiện thể trả nợ **F-19**: câu cũ nói *"Gemini DOM may have changed"* trên một
   trang Google Flow.

**KHÔNG làm, và có chủ đích:** không fail-fast theo `typing.ok`. Tầng dự phòng
cuối (`paste_event`) trả về mà **chưa chờ React một nhịp nào**, nên `ok:false` ở
đó không có nghĩa lượt gõ đã hỏng — chặn theo nó là giết đúng tầng đang đỡ. Có
test ghim cấm điều này (mục 7 của pin).

### Audit độc lập BẮT ĐƯỢC MỘT LỖI THẬT do chính bản vá này gây ra

Đây là phần đáng ghi nhất của phiên, và nó phủ định chính câu tôi vừa viết ở
trên ("thuần bằng chứng, không đổi hành vi").

Câu báo lỗi bản đầu là: *"…The **Flow composer** may never have accepted the
prompt…"*, kèm chú thích `composer_len 27->172`. Nghe vô hại. Nhưng
`classifyFailure` trong `runner-core.js:102` phân loại thất bại bằng cách **dò
từ khoá trên TOÀN BỘ câu**, không phải trên tiền tố:

```js
if (/receiver|composer|chatgpt tab|session integrity/i.test(text)) return "RECEIVER_LOST";
```

`RECEIVER_LOST` nằm trong `HARD_STOP_FAILURE_TYPES` → `canRetry` trả về false →
**cả mẻ job bị dừng**. Đo thật, chạy qua bộ phân loại thật:

| Câu báo lỗi | Phân loại | Được thử lại? |
|---|---|---|
| Bản cũ (trước phiên này) | `OTHER` | có |
| **Bản đầu của tôi** | **`RECEIVER_LOST`** | **KHÔNG — dừng cả mẻ** |
| Bản sau khi sửa | `OTHER` | có |

**Một thay đổi được khai là "chỉ sửa chữ để người đọc" đã lặng lẽ đổi hành vi
runtime.** Bộ đột biến 8/8 của tôi không bắt được, vì **không mutation nào chạm
tới bộ phân loại** — đúng bài học đã ghi sẵn trong bộ nhớ dự án: *mutation-test
cái DÂY NỐI, không chỉ cái luật.*

**Sửa:** đổi lời văn (`The prompt may never have been accepted by the page…`) và
đổi tên trường trong chú thích `composer_len` → `text_len`. Tên trường trong
`detection` giữ nguyên `composer_len_*` — chỗ đó không đi vào câu báo lỗi.

**Ghim:** `tests/send-gate-error-classification.mjs` **không ghim chữ**. Nó ĐỌC
câu thật ra khỏi `content.js`, dựng lại đúng câu runtime sẽ ném cho cả năm giá
trị `typing_path`, rồi chạy qua `classifyFailure` THẬT và đòi `OTHER` +
`canRetry`. Nó còn đòi bản cũ vẫn phải ra `RECEIVER_LOST` — một phép kiểm không
chứng minh được là nó biết đỏ thì không chứng minh được gì.

Audit cũng nêu một lỗ thứ hai: `typeIntoFlowComposer` **tự nó cũng ném được**
(abort, `HARD_STOP`, focus hỏng), và khi đó lại không có gì để ghi — đúng cái
bệnh F-18. Đã bọc để ghi `typing_path: "threw"` rồi **ném lại nguyên lỗi cũ**
(bọc lại hay đổi chữ là mất luôn cú dừng cứng, vì hard stop cũng phân loại bằng
chữ).

Audit vòng 2 trả **CONDITIONAL PASS** — không còn lỗi hành vi, chỉ còn góp ý làm
chặt phép kiểm. Đã làm hết trước khi push: phủ thêm nhánh `native_setter`; đòi
**đúng một** chỗ khớp cho câu ném và cho lời gọi; và `render()` trong phép kiểm
nay **ném** khi gặp ô nội suy lạ thay vì lặng lẽ thay bằng chữ vô hại — nếu mai
này ai nhét một trường động mới vào câu báo lỗi, phép kiểm bắt phải khai giá trị
mẫu chứ không tự trung hoà rồi báo xanh.

**Và bộ đột biến mở rộng còn tìm ra HAI lỗ ghim nữa, cùng một gốc bệnh.**
`composer_len_before_typing` được ghi ở **cả hai** nhánh (thành công và ném), nên
một phép kiểm hỏi "chuỗi này có xuất hiện đâu đó trong `runPrompt` không" vẫn
XANH khi **một trong hai** nhánh bị xoá sạch — lọt lưới một lần cho mỗi nhánh.
Nay ghim theo **đoạn**: nhánh catch kiểm trong thân catch, đường thành công kiểm
trong khúc từ sau khối try/catch tới cổng gửi. Cùng đúng bài học S7:
**ghim ĐÚNG chỗ, đừng ghim GẦN chỗ đúng.**

**Đo cuối:** suite **88/88** xanh (86 → +2 file pin) · **15/15 đột biến bị bắt**,
gồm bốn mutation gieo lại từ khoá vào câu báo lỗi (`composer`, `composer_len`,
`timed out`, `upload`), một mutation bọc lại lỗi trong nhánh catch (mất hard
stop), và một mutation thêm trường động mới để thử bẫy `render()`.
Pin: `tests/typing-path-survives-send-gate-static.mjs` ·
`tests/send-gate-error-classification.mjs`.

Có sửa một pin cũ: `tests/flow-video-job-static.mjs` dò `waitForSendButtonReady()`
bằng cặp ngoặc **rỗng**, nên vỡ ngay khi lời gọi được thêm tham số. Thứ nó bảo
vệ là **thứ tự**, và thứ tự không đổi — đã đổi chỗ dò thành `waitForSendButtonReady(`
và ghi lý do ngay tại đó.

---

## 5. Lượt live kế tiếp phải trả về gì

Vẫn dừng ở `PRE_SUBMIT` thì **0 credit** như lượt F4R2. Nhưng lần này sổ cái sẽ
có đủ số để kết luận, không cần lượt thứ ba:

| Đọc thấy | Nghĩa là |
|---|---|
| `typing_path: "execCommand"` hoặc `"input_events"` | Nút ĐÃ sáng lúc gõ rồi tắt lại sau đó → soi thứ gì chạy **sau** khi gõ, không phải đường gõ |
| `typing_path: "paste_event"` | Cả hai tầng trên đều bị Flow từ chối → đây mới đúng là hồi quy đường gõ |
| `typing_path: "all_failed"` | Ngay cả `DataTransfer` cũng ném → nghi trang chặn, không phải logic |
| `composer_len_before_typing` ≈ 27–28 và `after` ≈ `before + prompt_len` | Xác nhận mục 2: hằng số là của phần tử, prompt vào được |
| `composer_len_after_typing` ≈ `prompt_len` (không có hằng số) | Bản Flow 02/09 đã đổi cấu trúc composer → ứng viên 3 thành sự thật |

**Điều kiện chạy:** cần tay Đức bật panel + Dev Mode + Video mode trên hồ sơ
`kaito`, rồi `run.trial` **x1**. Không cần nạp workbook (`jobs.add` tự tạo).
Và lần này **lưu `dom_probe` TRƯỚC khi chạy** — nợ lượt trước đã ghi.

⚠️ **Sửa `.js` rồi thì phải reload extension** thì bản vá này mới có hiệu lực.
