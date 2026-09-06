# HANDOFF — Duc Auto GG Flow Video

> Trạng thái mới nhất ở CUỐI file. Log chỉ thêm dòng.

## Trạng thái hiện tại (2026-08-27)

- Package khai sinh theo `drafts/FLOW-EXT-COORDINATION-PLAN.md` (FLOW-00 đã chốt cả 3 điều).
- Fork bootstrap từ `workers/duc-auto-gemini/v0.2.0`: runtime + tests + scripts +
  templates + host source. KHÔNG mang theo pilot/evidence/sổ sách của Gemini
  (riêng `pilot-04/`, `pilot-05/` chỉ giữ 2 file XLSX làm fixture test).
- Việc tiếp theo (1): FLOW-01 — bằng chứng DOM trang Flow qua `dom_probe`.
- Rủi ro đang mở: UI Flow là dạng project editor, có thể khác chat UI nhiều hơn dự
  kiến → reuse content.js có thể thấp hơn kỳ vọng; chỉ biết chắc sau F-01.

## Log

<!-- HANDOFF-CUT-POINTER: ADR-0008 -->
> **Lịch sử cũ hơn đã dời sang [`HANDOFF-ARCHIVE-01.md`](HANDOFF-ARCHIVE-01.md)** — cùng thư mục
> này, nguyên văn, không mất chữ nào. Cắt 2026-09-06 theo ADR-0008 (phiên `claude-handoff-cat`):
> file này giữ **20 mục cuối theo vị trí trong file**, 183 mục trước đó nằm ở file lưu trữ.
> Cần đào lịch sử xa hơn thì mở file đó; ghi Log mới thì vẫn ghi vào cuối file này.
<!-- /HANDOFF-CUT-POINTER -->

## 2026-09-02 — `claude-f18-evidence` (lượt 18): F-14 xong hẳn; F-26 hỏng ở chỗ tôi giả định trạng thái

**Bằng chứng:** [`evidence/F26-KET-QUA-luot1.md`](evidence/F26-KET-QUA-luot1.md) · **0 credit.**

- **NỬA SAU CỦA F-14: CHỨNG MINH ĐƯỢC.** Job khởi đầu ở chế độ Image với chip `x3`. Sổ cái ghi
  `output_chip.label_before: "Video · 360p · 8s crop_16_9 x3"` — nhãn **Video**. Nghĩa là bản vá
  F-11 nhận đúng nhãn Image biến thể, **và** `pressFlowControl` bấm được `videocam Video` để
  **chuyển mode thật**. Đây là thứ F-14 treo từ 28/08. **F-14 đóng hoàn toàn.**
- **F-26 hỏng, 0 credit, fail-closed đúng** (`count_before: 3` → `count_after: 3`, chưa gõ,
  không video).
- **Chẩn đoán bằng hai phép đo, không bằng suy luận.** Sổ cái lượt đó không phân biệt được
  "không tìm thấy nút" với "bấm rồi mà không ăn". Nên tôi chạy `mode_probe` (0 credit) ngay sau:
  `opened: false`, `appeared_labels: []` — trong khi lần trước là `opened: true` với 17 nhãn.
  Ghép lại: **sau khi chuyển mode, bảng cấu hình VẪN ĐANG MỞ.**
  `pressFlowControl` trên chip là **công tắc bật/tắt**, nên cú bấm "để mở" của tôi đã **đóng** nó;
  tìm `x1` không thấy; cú bấm "để đóng" lại **mở** ra và bỏ đó cho lệnh sau.
- **Sai của tôi, gọn một câu: giả định trạng thái thay vì đo nó.** Đã vá bằng
  `settingsPanelOpen()` — đo qua sự có mặt của bốn nút `x1`…`x4`, thứ **chỉ tồn tại khi bảng mở**.
  Nay: đo trước, chỉ bấm khi cần, và **trả bảng về đúng trạng thái ban đầu**.
- **Sổ cái ghi thêm bước trung gian** (`panel_was_open`, `option_found`, `option_pressed`,
  `panel_restored`): một chẩn đoán không phân biệt được "không tìm thấy" với "bấm không ăn" thì
  không dẫn ai tới đâu.
- **Harness test sai theo cùng một kiểu** — chỉ hiện nút `x{n}` khi kịch bản khai `offerOutputX1`,
  nên bộ dò trạng thái bị mù. Trang thật **luôn** lộ cả bốn nút khi bảng mở. Đã sửa cho giống.
- **Đo:** suite **94/94** · mutation **5/5**, gồm đột biến dựng lại **đúng lỗi vừa gặp**.
- **Việc kế tiếp:** reload rồi chạy lại đúng một job như lượt này (Image + `x3`). Hỏng nữa thì
  vẫn **0 credit**, và lần này sổ cái nói ra hỏng ở bước nào.

## 2026-09-04 — `claude-dieu-phoi`: F-25 bước ② — chuỗi chết không còn im lặng được

**Đức chốt làm ngay, và chốt đảo thứ tự.** Backlog định ①→②→③; tôi đề xuất **② trước ①** vì ②
không cần Đức, không cần credit, và nó biến bước ① từ "ngồi chờ 22 phút mới biết có gãy" thành
"một phút". Đức đồng ý.

### Vấn đề, nói lại cho gọn

Một chuỗi **đang chờ nhịp 90 giây** và một chuỗi **đã chết âm thầm** trả về **cùng một câu trả
lời**: `state: RUNNING`, `running: 0`, `halt: null`. `run.status` cũ chỉ chụp **trạng thái**, mà
trạng thái không phân biệt được hai ca đó. Thứ phân biệt là **thời gian**: chuỗi sống thì có cái
gì đó nhích đều.

### Điểm dễ làm sai nhất, và tôi suýt làm sai

Cách hiển nhiên là một `setInterval` trong panel ghi mốc thời gian mỗi giây. **Sai.** Lúc chuỗi
gãy ngày 02/09, **panel VẪN SỐNG** — chính nó trả lời `run.status`. Một đồng hồ riêng sẽ tích tắc
vui vẻ và không phát hiện được gì. Nhịp tim phải do **chính vòng lặp chạy job** đập ra, nên nó im
đúng lúc vòng lặp im. Đã ghim bằng một khẳng định phủ định: `setInterval` gần `dapNhip` là ĐỎ.

### Đã làm

- `run-liveness-core.js` — hàm **thuần**, `now` là tham số. Vì sao quan trọng: một phép kiểm về
  thời gian mà tự đọc `Date.now()` thì **không dựng được ca "đã 22 phút"** — và ca đó chính là ca
  phải ghim. `danhGia()` trả `alive · stalled · heartbeat_age_ms · expected_next_ms · stage · reason`.
- **Mỗi giai đoạn tự khai trần chờ**, không dùng một trần chung. Trần chung phải lấy theo giai
  đoạn dài nhất (chờ video, hàng phút), nên nó sẽ mù suốt những bước đáng ra chỉ vài giây — tức
  chậm phát hiện đúng ở chỗ rẻ nhất để phát hiện. `WAITING_JOB` cố ý **không** có trần mặc định:
  trần của nó LÀ timeout thật của job, và hàm **NÉM** nếu bên gọi quên đưa.
- Bốn nhịp trong `run()` (`QUEUE_ADVANCE` ×2 · `GATE_CHECK` · `WAITING_JOB`) + mỗi giây trong
  `countdown()`. Nhịp đầu đập **ngay cạnh** `state.running = true` — nếu để vòng lặp tự đập nhịp
  đầu thì có một khoảnh khắc "đang chạy mà chưa có nhịp", và fail-closed sẽ báo động oan ngay giây
  đầu mỗi lượt chạy.
- `bridgeRunStatus()` trả khối `loop`. Nó nói cả **bước nào** lẫn **đứng yên bao lâu** — bài học
  F-26 lượt 18: một chẩn đoán không chỉ ra bước thì không dẫn ai tới đâu.

### Fail-closed, và ranh giới của nó

Đang chạy mà **không có nhịp nào** → coi là chết (im lặng ở đây là im lặng đúng kiểu đã mất 22
phút). Nhưng **người tạm dừng thì KHÔNG phải chết** — nó đang chờ NGƯỜI, và người không có trần
thời gian; báo động ở đây là báo động oan mỗi lần Đức đi uống nước. Và đồng hồ chạy lùi (đổi giờ
hệ thống, máy ngủ rồi thức) cho tuổi **âm** — để nguyên thì nó **luôn "sống"**, tức fail-OPEN,
đúng hướng hỏng nguy hiểm. Kẹp về 0.

### Số, và ba lượt thử phá THOÁT

Suite **95/95** (94 → 95). Thử phá **25/25** bị bắt: 10 ca lõi + 15 ca chỗ nối.

Nhưng **ba lượt đầu THOÁT**, và đáng ghi lại: khẳng định chỗ nối viết
`/async function countdown[\s\S]*?dapNhip\(/` — `[\s\S]*?` **chạy tiếp ra ngoài thân hàm** để tìm
`dapNhip(` ở một hàm khác phía sau, nên xoá nhịp khỏi `countdown` vẫn xanh. Đúng loại phép kiểm
xanh một cách vô nghĩa mà repo này đã bắt được ba lần. Đã siết: cắt đúng thân hàm rồi mới khẳng
định, ghim từng nhịp vào **đúng vị trí** của nó, và đếm số nhịp (thêm/bớt thì phải sửa phép kiểm
một cách có ý thức). Hai lượt sau đó cũng thoát vì cùng một bệnh — đòi "hàm `run` có nhịp nào đó"
thì xoá một nhịp vẫn còn ba nhịp khác.

### Sai lệch trạng thái đã sửa — Đức là người bắt được, và đó là lỗi của tôi

`STATUS.md` của gói này đang nói **sai về chính nó**: ghi F-14 "nửa sau chưa chứng minh" và F-26
"cần Đức chốt", trong khi Log lượt 18 (02/09) nói **F-14 đóng hoàn toàn** và **F-26 XONG** (Đức đã
chốt, đã vá `settingsPanelOpen()`). Nên `next_step` của gói ưu tiên #1 đang mô tả hai việc đã
xong — và bản đồ việc ở gốc repo cũng hiển thị sai theo, vì nó đọc `STATUS.md`. Đã viết lại cả ba
trường, có dấu (luật vàng 5), và thêm `human_action`.

**Còn mở:**
- **Bước ①** — đo cái gì giết vòng lặp. Nay rẻ hơn hẳn nhờ ②.
- **Bước ③ CẦN ĐỨC CHỐT** — cho vòng chạy job sống ở service worker thay vì side panel. Đổi lớn.
- **Cần Đức:** nạp lại tiện ích rồi chạy **một** job (Image + chip `x3`). Một lượt đó kiểm cả
  F-26 lẫn khối `loop` mới. Hỏng thì vẫn **0 credit**.
- Khối `loop` **chưa được kiểm live** — mọi khẳng định trên đây là test + đọc code, chưa có bằng
  chứng từ trang thật.

## 2026-09-05 — `claude-flow-no`: F-06 nửa đầu đóng, và đột biến kiểm bắt được một bẫy xuống dòng

**Nối lại một phiên bị ngắt.** Phiên trước cùng tên để lại 18 file sửa dở cho F-06 (rebrand chữ
hiển thị) kèm một câu: *"96/96 green. Now the mutation check for F-06."*

**Câu đó sai.** Chạy lại suite: **95/96**. Chính phép kiểm quét-chuỗi mà phiên trước vừa viết đang
đỏ, vì `halt-instructions-core.js` còn đúng một chỗ: nửa tiếng Anh của `SECURITY_HARD_STOP` đã đổi
sang "Open the Flow tab" nhưng nửa tiếng Việt trong cùng chuỗi vẫn nói "Mở đúng tab Gemini". Sửa
một chỗ, xanh 96/96. **Đây là lý do luật vàng 4 tồn tại** — báo cáo "xong" của một phiên AI khác
(kể cả phiên trước của chính mình) không phải bằng chứng.

### F-06 nửa "Gemini → Flow": XONG

Commit `914643b`. 11 file nguồn + 7 file test. Chữ "Gemini" còn lại trong gói **chỉ ở chú thích** —
đó là lịch sử nhánh và đúng chỗ của nó; phép kiểm cố ý chỉ soi chuỗi.

Phần đáng đọc nhất không phải việc đổi chữ, mà là phiên trước **đã đọc lại và sửa một hiểu sai
của bản 02/09**: bản cũ tin rằng cụm `image generation limit` là thứ giữ phán quyết hết-credit,
nên ghim cứng nguyên câu tiếng Anh. Đọc lại từng chỗ ném thì **không phải** — cả 8 đường đều gắn
tiền tố `LIMIT_STOP:`, và `LIMIT_STOP` là nhánh ĐẦU TIÊN của `classifyFailure`. Chuỗi trần chưa
bao giờ tới bộ phân loại một mình. Phép kiểm nay canh **cả 8 đường ném**, có đếm số, thay vì canh
một từ trong một câu mẫu. Chặt hơn bản cũ.

**Còn mở: nửa "ảnh → video".** [ĐO 05/09] 46 chuỗi JS + 10 lần trong `sidepanel.html`. Không phải
tất cả đều là nợ — ảnh **tham chiếu đầu vào** trên Flow vẫn đúng là ảnh, nên phải đọc từng chỗ,
đừng thay hàng loạt. Chi tiết ở mục F-06 của `BACKLOG.md`.

### Đột biến kiểm: 6/6 bị bắt

| # | Phá gì | Kết quả |
|---|---|---|
| M1 | `sidepanel.js`: "Flow must be reachable" → "Gemini…" | ĐỎ |
| M2 | `sidepanel.html`: nhãn "Flow connection" → "Gemini connection" | ĐỎ |
| M3 | `content.js`: bỏ tiền tố `LIMIT_STOP:` ở một chỗ ném | ĐỎ |
| M4 | Từ điển: "Waiting for Flow ready" → "…Gemini ready" | ĐỎ (3 phép kiểm) |
| M5 | Từ điển: "phần tạo video" → "phần tạo ảnh" (nửa ảnh→video) | ĐỎ |
| M6 | `content.js`: bỏ `\|\| remoteVerifiedResult` ở dòng `ready` | ĐỎ |

### Cái bẫy mà đột biến kiểm lôi ra — và nó không liên quan gì tới F-06

Bước khôi phục sau mỗi lượt phá là `git checkout -- <file>`. Sau lượt M3, suite **đỏ ở một phép
kiểm tôi chưa hề chạm** (`content-image-static.mjs`), và `git diff` nói **không có gì đổi**.

Gốc bệnh: blob của `content.js` trong git là **CRLF**, còn bản trên đĩa của các phiên cũ là **LF**.
`git checkout` trả về CRLF. Phép kiểm đó đòi `,\n` sát nhau, nên nó **xanh ở máy đang làm dở** mà
**đỏ ngay sau một `git checkout`** — hoặc trên một bản clone mới. Không dòng mã nào đổi, chỉ xuống
dòng đổi.

Đo cho hết: ép CRLF **cả gói** rồi chạy suite → đúng **một** phép kiểm đỏ. Đã nới thành `\r?\n`
(commit `b5bf0e1`), chạy lại suite **cả hai chiều** — 96/96 mỗi chiều — rồi đột biến kiểm lại
(M6 ở trên) để chắc việc nới không làm mất răng.

**Còn mở, không phải việc của gói này:** repo không có `.gitattributes` cho `.js`, nên
`core.autocrlf=true` quyết tất. Vá đúng chỗ là ở gốc repo (khoá `_root`) và nó viết lại xuống dòng
của **mọi** file — **cần Đức chốt**. Hai gói kia chưa được soi; cách soi rẻ nhất là ép CRLF cả gói
rồi chạy suite.

### Chưa làm

**F-08** (đo và đặt lại timeout runner cho video — hiện kế thừa 90s/job của nhánh Gemini, video
cần nhiều phút) **chưa động tới**. Vẫn nguyên trong `BACKLOG.md`.


## 2026-09-06 — `claude-flow-b`: F-06 nửa sau đóng — "ảnh" thành "video", trừ chỗ đúng là ảnh

**F-06 XONG TRỌN.** Nửa sau là đổi danh từ **đầu ra** từ "ảnh" sang "video". Nghe như sửa chính
tả; không phải, vì gói này **sinh video TỪ ảnh mẫu** — nên chữ "ảnh" đúng ở một nửa số chỗ và sai
ở nửa kia, và không có cách nào biết chỗ nào là chỗ nào ngoài đọc từng chỗ một.

### Con số, đo được

| Đo gì | Trước | Sau |
|---|---|---|
| Chữ "ảnh" đứng riêng, 8 file nguồn có chữ operator | 78 | 29 |
| → trong đó: **đổi thành "video"** | — | **49** |
| → **cố ý giữ "ảnh"** — chuỗi operator sống, đều nói về **ảnh tham chiếu đầu vào** | — | **16** |
| → **cố ý giữ "ảnh"** — nằm trong chú thích (lịch sử nhánh) | — | **13** |
| Chữ `image` tiếng Anh nằm CÙNG MỘT CÂU song ngữ với chỗ vừa đổi | 22 | 0 |

16 chỗ giữ chữ "ảnh" là: `MAX_INPUT_IMAGES` · `MISSING_REFERENCES` · `AMBIGUOUS_REFERENCES` ·
`DUPLICATE_REFERENCE` · `DUPLICATE_ALIASES` · `UNUSED_REFERENCES` · câu "so sánh output với ảnh
input/reference" trong bảng hướng dẫn dừng · dòng từ điển "video cũ hoặc **ảnh tham chiếu** không
được xem là đầu ra mới" · thông báo Bridge nạp ảnh tham chiếu · nút "Thêm ảnh tham chiếu".

**Vì sao đụng cả chữ tiếng Anh:** các câu này song ngữ trong **đúng một chuỗi** (`"… (…)"`) hoặc
**đúng một dòng giao diện** (`<span>English<span lang="vi">Việt</span></span>`). Để nửa Anh nói
"image" cạnh nửa Việt nói "video" trong cùng một câu là tự mâu thuẫn ngay trước mắt người đọc.
Chữ `image` **ngoài** các câu đó thì KHÔNG đụng — xem "Chưa làm".

### Ghim thế nào — và nó khác gì phép kiểm cấm chữ "Gemini"

Cấm sạch một từ thì dễ; ở đây không cấm sạch được. Nên phần thứ hai của
`tests/error-strings-load-bearing.mjs` làm ngược lại: khai một danh sách **cụm đầu-vào được phép
giữ chữ "ảnh"**, gỡ các cụm đó ra khỏi câu, rồi **cấm chữ "ảnh" ở phần còn lại**. Thêm một câu
operator mới có chữ "ảnh" là ĐỎ, và người viết buộc phải tự quyết: đầu vào thì khai vào danh sách
kèm lý do, đầu ra thì đổi thành "video". Im lặng trôi qua chính là thứ đã để lại 49 chỗ lần trước.

Ba chỗ cố ý làm chặt hơn:

1. **Đọc giá trị thật, không tách chuỗi bằng regex.** Ba từ điển (`operator-messages` ·
   `halt-instructions` · `operator-glossary`) được **nạp module rồi duyệt giá trị** — 200 chuỗi.
   Bộ tách chuỗi bằng regex của phép kiểm cũ **có điểm mù thật**: một chuỗi backtick nhiều dòng
   nuốt luôn vùng sau nó, nên có chuỗi nó chưa bao giờ nhìn thấy.
2. **Canh ngược danh sách miễn.** Cụm miễn nào không còn khớp chỗ nào thì ĐỎ — dòng miễn chết là
   một lỗ mở sẵn cho chữ cũ mọc lại mà không ai để ý. **Phép kiểm này bắt thật ngay trong lượt
   viết nó:** cụm `"ảnh trùng tên"` đã bị loại vì nó chỉ khớp trong `sidepanel.js`, mà file đó
   không nằm trong vùng quét.
3. **Ghim đếm số cho từng câu** ngoài ba từ điển (14 câu ở `sidepanel.js` · `content.js` ·
   `orchestrator-review-core.js` · `plan-diagnostics-core.js`). Hỏi "còn nguyên", không hỏi
   "có tồn tại".

Và **ba câu ném thật** được ghim thêm phán quyết `classifyFailure` (luật F-20): đổi lời văn mà
tuột sang nhánh khác là đổi hành vi retry, không phải sửa chính tả.

### Đột biến kiểm: 8/8 bị bắt

| # | Phá gì | Kết quả |
|---|---|---|
| M1 | Từ điển: `"phần tạo video"` → `"phần tạo ảnh"` | ĐỎ |
| M2 | Từ điển: `"File video đã được ghi"` → `"File ảnh…"` | ĐỎ |
| M3 | Từ điển: `"ĐÈ LÊN video cũ"` → `"ĐÈ LÊN ảnh cũ"` | ĐỎ |
| M4 | `sidepanel.html`: `"Giữ video cũ — video mới"` → `"Giữ ảnh cũ — ảnh mới"` | ĐỎ |
| M5 | Ghim đếm: `sidepanel.js` `"đã tạo video mới và lưu xong."` | ĐỎ |
| M6 | Ghim đếm: `content.js` `"video trên trang đang là blob:"` | ĐỎ |
| M7 | Ghim đếm ngoài `sources`: `orchestrator-review-core.js` | ĐỎ |
| M8 | **F-20**: thêm chữ `download` vào câu ném `RERUN_PERSISTENCE_REQUIRED` | ĐỎ |

M8 là lượt đáng giá nhất: nó chứng minh phần ghim phán quyết không phải trang trí — thêm đúng
một từ tiếng Anh vào một câu tiếng Việt là đã đổi `OTHER` thành `DOWNLOAD_FAILED`.

**Khôi phục bằng cách ghi lại đúng bytes gốc, KHÔNG dùng `git checkout`** — phiên 05/09 đã mất
nửa buổi vì lệnh khôi phục đó âm thầm đổi xuống dòng LF → CRLF và làm đỏ một phép kiểm không liên
quan. Đã đọc bài đó trước khi bắt đầu.

### Xuống dòng: đo cả hai chiều, không tin một chiều

Suite **96/96** ở bản trên đĩa. Rồi chép cả gói ra chỗ khác, **ép CRLF toàn bộ** → 96/96; **ép LF
toàn bộ** → 96/96. Phép kiểm mới cố ý không dùng neo `^`/`$` và không đòi `
` sát nhau, nên nó
miễn nhiễm với chỗ này.

### Chưa làm

1. **Vùng quét-cấm không phủ `sidepanel.js` và `content.js`.** Hai file đó trộn chú thích tiếng
   Việt (có chữ "ảnh" đúng chỗ, là lịch sử nhánh) với chuỗi, mà bộ tách chuỗi bằng regex thì có
   điểm mù — quét bừa sẽ báo đỏ oan ở chú thích. Chữ đã đổi ở hai file đó **được giữ bằng bảng
   ghim đếm số**, nên hồi quy thì đỏ; nhưng **câu MỚI** nói "ảnh" về đầu ra ở hai file đó thì chưa
   ai canh. Ghi vào `BACKLOG.md`.
2. **Chữ `image` tiếng Anh còn khắp gói (~540 lần)** — nhưng phần lớn là **tên định danh và mã
   lỗi** (`saveImages`, `imagePattern`, `image_url`, `NO_NEW_IMAGE`, `MAX_INPUT_IMAGES`), đổi
   chúng là đổi hợp đồng message/schema. Nhãn tiếng Anh **Đức nhìn thấy** mà còn nói ảnh:
   `Download generated images` · `Max input references` · `📁 Images folder`. Việc riêng, cần tách
   nhãn "định danh" khỏi "văn xuôi" trước khi đụng.
3. **F-08** (timeout runner cho video, hiện kế thừa 90s/job của nhánh Gemini) — chưa động tới,
   như phiên trước.

## 2026-09-06 — `claude-handoff-cat`: cắt đuôi file này theo ADR-0008

Giữ **20 lượt cuối**, **183 lượt cũ** dời sang `HANDOFF-ARCHIVE-01.md` cạnh file này. Cắt theo
**vị trí trong file**, không theo ngày (bất biến ⑵). Tìm được **203 mục** (178 gạch đầu dòng + 25 tiêu đề `##`).
**122,9 KB → 20,1 KB** (lưu trữ 104,3 KB). Không xoá một chữ, không sửa một chữ — chỉ dời chỗ.

**Bất biến ⑴ đo bằng máy:** ghép phần sau dấu `ARCHIVE-BODY-START` của file lưu trữ vào đúng chỗ con trỏ
trong file này dựng lại bản gốc **giống hệt từng byte** — SHA-256
`93b18197e65738031ae6281febb9b4fd6c229240cefe6816d6258847a6d93a10` cả hai chiều, và khớp luôn với `git show HEAD:`.

Đã khai `HANDOFF-ARCHIVE-01.md` vào Bản đồ file của `AGENTS.md` (bất biến ⑷). `STATUS.md` `ref_handoff`
**vẫn đúng** — file này vẫn là nơi giữ trạng thái. Không đụng `scripts/`, `docs/`, `HANDOFF.md` gốc repo;
**không sinh lại artifact máy** (phiên điều phối sinh một lượt cho cả ba lane).

**Còn mở:** F-06 phần nhãn tiếng Anh, F-08 — như lượt trước, lượt này không đụng code.


## 2026-09-06 — `claude-dau-worker`: đặt dấu @Đức cho khối "Cần Đức" trên bảng

Lượt 2 của đề bài `BANG-CAN-DUC-01`. Khối "Cần Đức" trên bảng nay **suy từ một dấu đặt ngay
trên dòng của mục** (`@Đức:bấm` / `@Đức:chốt`), không đọc trường `human_action` nữa. Chưa có
dấu thì mục không lên bảng, nên lượt này chỉ đi điền dấu — **không sửa code, không sửa hành vi**.

**Đã đánh dấu trong gói này:** F-09 (bấm) · F-26 (bấm) · F-25 bước ③ (chốt) trong sổ nợ, và ghế legacy không tên (chốt) trong hồ sơ trạng thái.

- F-14 KHÔNG đánh dấu: Log lượt 18 (02/09) nói nó đóng hoàn toàn. Mục F-14 trong sổ nợ vẫn viết như còn treo — đã lạc hậu, để nguyên vì sửa văn mục là việc khác.

**Kiểm chứng:** sinh lại bảng, khối "Cần Đức" đếm **10 việc · 6 bấm · 4 chốt** trên cả ba gói —
khớp đúng 10 dấu đã đặt. Đóng mục thì dấu mất theo, không phải nhớ đi xoá.

**Còn mở:** không đụng `scripts/`, `docs/`, `HANDOFF.md` gốc repo; không sinh lại artifact máy.

## 2026-09-06 — `claude-don-so`: ba chỗ sổ nói sai về chính nó, hai chỗ trong gói này

**Việc của lượt này không phải sửa code.** Là làm cho sổ khớp sự thật — vì Đức đọc bảng để ra
quyết định, mà bảng chỉ chiếu lại thứ sổ viết. Sổ sai thì bảng sai theo một cách **không ai bắt
được**: nó vẫn xanh, vẫn đủ cột, chỉ nói nhầm.

**① `F-14` — đóng, bốn ngày sau khi nhật ký đã nói nó đóng.** Log lượt 18 (02/09) viết đúng chữ
*"F-14 đóng hoàn toàn"*, và `STATUS.md` cũng đã sửa theo từ 04/09. Nhưng **tiêu đề mục trong
`BACKLOG.md` vẫn đọc như còn treo** (`RÀ LẠI 02/09 — mục này đang mô tả sai thực trạng`), nên bộ
đếm nợ vẫn tính nó là một việc chưa làm. Kiểm lại bằng bằng chứng chứ không tin nhật ký: nửa đầu
ở `evidence/F14-KET-QUA.md` (`opened: true`, 17 nhãn, `panel_closed_again: true`), nửa sau ở
`evidence/F26-KET-QUA-luot1.md` (`output_chip.label_before: "Video · 360p · 8s crop_16_9 x3"` —
nhãn **Video** sau khi job khởi đầu ở chế độ Image, tức `pressFlowControl` bấm được
`videocam Video` và mode **đổi thật**). Cả hai 0 credit. Viết lại tiêu đề thành `XONG 02/09`,
**giữ nguyên toàn bộ thân mục** kể cả đoạn cảnh báo *"nửa còn lại chưa chứng minh"* — đoạn đó nay
gạch ngang kèm câu chỉ sang bằng chứng, chứ không xoá: một mục đã hai lần kết luận sai rồi tự
sửa thì chính chỗ sai là phần đáng đọc nhất.

**② `F-18` — mục xin "một lượt nữa để kết luận", trong khi lượt đó đã chạy 12 lần.** Đây là chỗ
tự quét ra, không có trong đề bài. Chữ của mục dừng ở lượt F4R3 (02/09) và kết bằng *"chạy
`run.trial` x1 … không cần lượt thứ ba"*. Đọc `git log --grep F-18` và thư mục `evidence/` thì
trong **cùng ngày 02/09** còn bốn chuỗi live nữa mà mục không hề ghi: F4R4 (1 job) · F4R5
(3 job) · F4R8+F4R9 (7 job). Hai điều bị bỏ sót, và cả hai **đổi việc phải làm tiếp**:

- **Giả thuyết mạnh nhất còn lại đã BỊ BÁC.** F4R5 dựng đúng điều kiện "job sau gõ vào ô job
  trước vừa dùng" bằng ba prompt dài khác hẳn nhau (129/208/122) — job 2 và 3 vẫn `before = 28`.
  Chuỗi nhiều job **không** phải cơ chế gây trạng thái lai.
- **12 lượt gõ sạch liên tiếp, `after − prompt_len = 0` mọi lượt**, kể cả chuỗi 7 job nối nhau.
  Trạng thái lai của F4R2 không tái hiện một lần nào.

Nên việc kế tiếp của F-18 **không còn là "chạy thêm một lượt"** — lượt thứ mười ba sẽ cho đúng
con số như mười hai lượt trước. Đã viết lại phần việc kế: giữ mục **mở** nhưng ở mức thấp, chờ nó
tái hiện, và `composer_len_before_typing` (bản vá `be17e75`) sẽ tự tố ngay dòng đầu sổ cái.

**③ `AI-OPERATOR-GUIDE.md` — hai dòng bảng lỗi vẫn sai việc Đức phải làm.** Bảng lỗi là thứ AI
vận hành đọc trước khi hỏi Đức, nên sai ở đây tốn **thời gian của người**, không phải của máy.
Hai dòng đã hết hạn từ 02/09 mà vẫn còn:

- Dòng `WRONG_GENERATION_MODE` bảo *"nhờ Đức tự đặt Video mode bằng tay"* — F-14 đã chứng minh
  runner tự chuyển được. Sửa thành: runner tự làm; còn gặp lỗi thì nghi **F-11** (nhãn Image
  biến thể) hoặc chưa reload, chẩn đoán bằng `diagnostics.mode_probe` 0 credit.
- Dòng chip `x2`/`x3`/`x4` bảo *"Runner chưa tự kiểm việc này (F-15)"* — F-15 **XONG** (từ chối
  trước khi gõ, 0 credit) và F-26 **XONG** (tự đặt `x1` rồi đọc lại chip). Sửa thành đúng thế.

**Kiểm chứng.** Nợ gói GG Flow Video **13 → 12**, đúng bằng một mục đóng, đo bằng chính
`debtByUnit` của bộ sinh bảng. Không đóng F-18 (vẫn là việc mở thật), không đụng F-24 — thân nó
cũng nhắc lại kết luận `.click()` cũ, nhưng đó là **lịch sử của một mục đã đóng**, sửa vào đấy là
viết lại chữ cũ chứ không phải đính chính.

**Còn mở, cố ý không đụng:** `F-10` nói *"nhánh này sẽ vào bảng parity khi có method Bridge chạy
thật"* — điều kiện đó **nay đã đủ** (nhánh chạy live nhiều lượt), nhưng đưa nhánh ba vào
`FEATURE-PARITY.md` là một việc thật, phải giữ khoá `_root`, và mục 2 của file đó là chữ của
người. Để nguyên, ghi ra đây để không trôi.

## 2026-09-06 — `claude-flow-active`: F-08 đóng — trần chờ video chỉ còn biên 5 giây

F-08 xin đo lại trần chờ, lý do ghi là *"Gemini 90s/job"*. Con số đó **không tồn tại ở đâu**;
nhưng mục vẫn đúng ở chỗ nặng hơn: `DEFAULTS.timeout_sec` là **180 giây**, còn ca xấu nhất đo
được trên 9 job live là **175 giây**. Biên năm giây. Chín lượt vừa qua không nổ chỉ vì workbook
có khai `timeout_sec: 300`.

Trần này áp lên giai đoạn sau cú bấm Create, tức credit **đã tiêu** — nên hết trần sớm là vứt
một video đã trả tiền, và `TIMEOUT_AFTER_SUBMIT` dừng cả mẻ. Hướng đúng là nới.

**Vá:** `timeout_sec` 180 → 600 · `perJobTimeoutMs` 300000 → 600000. **Ghim:**
`tests/flow-video-timeout-budget.mjs`. Suite **99/99**, đột biến **4/4 bị bắt**.
Số đo từng job, cách đo, và lý do chọn 600 → **F-08** trong `BACKLOG.md`.

**Mở F-27:** giai đoạn `SENDING` đo 51–144 giây trong khi hai khoảng nghỉ có trần cộng lại tối
đa ~25 giây — còn 60–120 giây mỗi job không có tên và không trần nào canh. Chi tiết ở `BACKLOG.md`.

**Một lỗi của tôi:** `git checkout .agents/claims.json` xoá trắng bốn khoá chưa commit của hai
phiên khác. Khôi phục đủ trong một phút, dấu niêm phong đóng lại, `--list` khớp bản cũ. Đã ghi
nợ hạ tầng vào `BACKLOG.md` gốc repo.

**Chưa làm:** gói vẫn `building`, chưa khai `last_verified`. Việc kế là lượt live một job
(Image + chip x3) kiểm F-26 — **cần Đức bấm**.

<!-- HANDOFF-THANG: 2026-09 -->

**Đẩy kèm `--carry`** (ADR-0005, Đức duyệt thường trực). Ba commit của lane khác bị cuốn theo,
kể tên đủ: **`claude-n07`** · **`claude-codex-ngan`** · **`claude-assistant`**. Lượt đẩy cuối gồm 8
commit, 4 của tôi, 4 của ba lane trên (`373b325..9dd4cbd`).

## 2026-09-06 — `claude-flow-active`: nút CHAT ZOOM xám — chưa biết vì sao, nên bắt nó tự khai

Đức báo nút **CHAT ZOOM** xám không bấm được. Đã loại bằng cách đọc code, không đoán: quyền
`tabs` **có** trong manifest · `syncZoomState` **có** chạy lúc mở panel · ba sự kiện
(`onActivated`, `onUpdated`, `onZoomChange`) **đều có** · bộ khớp URL **khớp cả 5 URL Flow thật**
lấy từ `evidence/` (kể cả bản có locale `/vi/`). Và hàm dò tab **giống hệt từng chữ** ở cả ba gói,
trong đó hai gói kia đang dùng tốt.

**Nên gốc bệnh không nằm trong thứ đọc được từ code — và đó chính là bệnh thứ hai.** Nút xám có
**bốn** nguyên nhân khác hẳn nhau, mà cả bốn đều đi qua `catch (_) {}` rồi cho ra đúng một kết
quả câm. Không có gì để đọc, nên không ai chẩn đoán được từ xa.

**Vá:** mỗi nguyên nhân tự khai vào tooltip của cụm nút — chưa có API tab · đọc tab lỗi · tab
đang xem không phải trang Flow (**kèm URL thật**) · Chrome từ chối đọc mức phóng to (kèm câu lỗi).
Đường tốt thì dọn lý do cũ đi, để Đức không đọc phải một câu đã hết hạn.

**Ghim:** `tests/flow-zoom-control-reason.mjs`, 6 ca. Nó **trích hàm thật** ra khỏi `sidepanel.js`
rồi chạy, chứ không chép logic sang test. Suite **98/98**, đột biến **5/5 bị bắt**.

**Mở F-28:** phép kiểm zoom cũ là di sản fork — nó kiểm một bản sao logic ChatGPT viết trong
chính file test, nên đột biến vào `sidepanel.js` không làm nó đỏ. Neo chú thích của nó còn ghi
*"Gemini origin"* tới hôm nay; đã sửa thành `Flow origin`, phần còn lại ghi vào sổ nợ.

**Chưa xong:** đây mới là bản vá CHẨN ĐOÁN, chưa phải bản vá gốc bệnh. Việc kế cần Đức: nạp lại
tiện ích, rê chuột lên cụm nút CHAT ZOOM, đọc câu hiện ra rồi gửi lại. 0 credit, không cần Bridge.

**Đẩy kèm `--carry`** (ADR-0005). Lượt `b0eb683..961c936`, 10 commit, 2 của tôi; ba lane bị
cuốn theo: **`claude-assistant`** · **`claude-gemini-hoan-thien`** · **`claude-hang-doi`**.

## 2026-09-06 — `claude-flow-active`: Google dời Flow sang domain riêng, extension đang chết hẳn

Đức báo nút CHAT ZOOM xám. Bản vá chẩn đoán lượt trước bắt nó tự khai lý do, và câu nó khai là
*"tab đang xem không phải trang Flow"* kèm địa chỉ thật. Địa chỉ đó là **`flow.google.com/project/<id>`**.

Khác **cả tên miền lẫn đường dẫn** so với `labs.google/fx/tools/flow/project/<id>`. Nút zoom chỉ
là triệu chứng nhìn thấy đầu tiên: `content_scripts.matches` cũng trượt, nên **Chrome không tiêm
content script** — không gõ được, không bấm được, không đọc được gì. Lượt live một job mà tôi
định xin Đức bấm hôm nay sẽ hỏng ngay bước đầu.

**Đức duyệt 06/09, nguyên văn:** *"thêm domain mới, GIỮ luôn domain cũ"*. Thêm quyền cho
extension là việc phải hỏi, nên tôi dừng lại hỏi trước khi sửa.

**Vá:** `manifest.json` thêm `https://flow.google.com/*` (quyền + tiêm script) · `ORIGIN` nay
hai nhánh · `surface()` nhận cả hai nhà · ba câu báo lỗi chỉ về nhà mới.

**Ranh giới hai lớp của F-23 giữ nguyên và nay đáng giá hơn hẳn** — mẫu mới buộc phải cho lọt
cả domain, nên adapter là lớp duy nhất chặn được. Lý lẽ đầy đủ nằm trong chính phép kiểm:
`tests/flow-locale-url-static.mjs`.

Suite **98/98**, đột biến **7/7 bị bắt** (bỏ domain khỏi hai chỗ trong manifest · nới manifest
rộng hơn mức duyệt · bỏ khỏi `ORIGIN.hosts` · adapter thôi siết · `surface()` quên nhà mới ·
câu báo lỗi tụt về địa chỉ cũ). Ba câu báo lỗi ghim thêm phán quyết `classifyFailure` theo luật
F-20: cả trước lẫn sau đều `RECEIVER_LOST`, tức đổi địa chỉ không đổi hành vi retry.

**Mở F-29 (P1) và F-30.** F-29 là chỗ duy nhất còn gắn cứng địa chỉ cũ: `videoIdFromSrc` chỉ
nhận file video ở `labs.google/fx/api/trpc/...`. Cố ý không đoán. Nó khác mọi cửa từ chối khác
của gói: hàm này chạy **sau** cú bấm Create, nên nếu địa chỉ đã đổi thì **credit tiêu mà không
thu được video**. Đo được bằng `dom_probe` trên một dự án đã có video sẵn, 0 credit.

**Chưa xong:** phải đo F-29 TRƯỚC lượt live, không phải sau.

**Day kem `--carry`** (ADR-0005). Luot `86f150d..9d584da`, 15 commit, 2 cua toi; lane bi cuon theo: `claude-assistant` · `claude-gemini-hoan-thien` · `claude-hang-doi`.
