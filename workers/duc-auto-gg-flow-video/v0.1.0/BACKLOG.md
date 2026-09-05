# BACKLOG — Duc Auto GG Flow Video (`F-xx`)

> Việc còn mở của nhánh này. Mỗi dòng gắn nhãn nguồn: [ĐO] máy đếm · [ĐỌC] đọc thẳng
> code · [DÒ] tìm theo tên (phải kiểm lại trước khi hành động). Mới nhất thêm xuống cuối.

## P1 — chặn đường

> **RÀ SOÁT 02/09 (`claude-f18-evidence`) — backlog này đang nói dối, và đây là phần đã kiểm.**
> Các mục F-01…F-08 là việc dựng nền từ 27/08 và không mục nào từng được đánh dấu, nên ai mở
> file này hôm nay sẽ tưởng gói chưa có adapter. Tôi **chỉ đánh dấu những mục kiểm chứng được
> bằng máy**, phần còn lại để nguyên kèm ghi "chưa rà" — đánh dấu bừa là lặp lại đúng cái bệnh.
>
> - **F-01 XONG** — 9 file `evidence/F1-snapshot-*.json`.
> - **F-02 XONG** — `provider-adapter.js` trỏ `labs.google` ở 5 chỗ, SELECTORS/TIMING là của
>   Flow, đã chạy live nhiều lượt.
> - **F-04 XONG** — `MAX_TRIAL_JOBS = 7` (trần 30 của nhánh ảnh đã bỏ; con số 7 nay tính theo
>   ngân sách một tài khoản, xem F-22).
> - **F-05 XONG** — không còn chỗ nào `bootstrap_locked` trong router.
> - **F-06 XONG CẢ HAI NỬA** (05/09 + 06/09) — nửa "Gemini → Flow" và nửa "ảnh → video"
>   đều đã đóng, mỗi nửa có phép kiểm canh. Xem chính mục F-06.
> - **F-03, F-07, F-08, F-10: CHƯA RÀ.**

- **F-01** · **XONG 02/09** (9 file `evidence/F1-snapshot-*.json`) — Chụp bằng chứng DOM trang Flow (4 snapshot: nghỉ / đang sinh / có video /
  màn nhập prompt) qua `diagnostics.dom_probe`, lưu `evidence/`. [ĐỌC] — dom_probe là
  generic, không phụ thuộc selector Gemini (content.js, nhánh `DAC_DOM_PROBE`).
- **F-02** · **XONG 02/09** (`provider-adapter.js` trỏ `labs.google`, SELECTORS/TIMING là của Flow, đã chạy live nhiều lượt) — Viết lại `provider-adapter.js` từ bằng chứng F-01: SELECTORS, TIMING
  (video tính bằng phút), surface Flow thật, tín hiệu "video xong". Kèm test ghim.
- **F-03** · Thay `image-evidence-core.js` bằng lớp bằng chứng video (URL, poster,
  duration; chính sách đề xuất: chỉ ghi URL + metadata, không tự tải file video).
- **F-04** · **XONG 02/09** (`MAX_TRIAL_JOBS = 7`; trần 30 của nhánh ảnh đã bỏ, con số 7 tính theo ngân sách một tài khoản — xem F-22) — Hạ trần `dev-trial-core.js` xuống **≤3 job** cho nhánh này (Đức chốt 27/08:
  3 video × 15 credit = 45, giới hạn free; hiện code còn trần 30 của nhánh ảnh [ĐỌC]) —
  làm TRƯỚC khi gỡ khoá bootstrap.

## P2 — trước pilot live

- **F-05** · **XONG 02/09** (không còn chỗ nào `bootstrap_locked` trong router) — Gỡ khoá bootstrap Bridge sau khi F-02+F-04 xong (ghi decisions.md).
  **Kèm bắt buộc:** khôi phục kỳ vọng gốc của 5 test router đã đổi sang
  `FORBIDDEN/bootstrap_locked` (failure-semantics, loopback-integration,
  mv3-reconnect, references-add, router-smoke) — đặc biệt là coverage
  idempotent-retry của queue.propose trong loopback-integration [ĐỌC diff Codex 27/08].
- **F-06** · **XONG CẢ HAI NỬA.** — **Nửa "Gemini → Flow": XONG 05/09** (`claude-flow-no`, `914643b`). Mọi chuỗi
  operator nhìn thấy đã hết chữ "Gemini" — 11 file nguồn + 7 file test. Chữ "Gemini" còn lại
  trong gói **chỉ nằm ở chú thích** (lịch sử nhánh, đúng chỗ của nó), và phép kiểm cố ý chỉ
  soi chuỗi chứ không soi chú thích.
  **Canh bằng** `tests/error-strings-load-bearing.mjs`: quét chuỗi ở 10 file mang chữ operator
  cộng cả `sidepanel.html`; một chuỗi nói "Gemini" là ĐỎ. Cùng lượt đó phép kiểm này được viết
  lại theo hướng **cấu trúc**: bản 02/09 tin rằng cụm `image generation limit` giữ phán quyết
  hết-credit, đọc lại từng chỗ ném thì **không phải** — cả 8 đường đều gắn tiền tố `LIMIT_STOP:`
  và đó mới là thứ chịu tải. Nay canh cả 8 đường, có đếm số. Suite 96/96, đột biến kiểm **6/6**.
  **NỬA "ảnh → video": XONG 06/09** (`claude-flow-b`). Đọc từng chỗ một, không thay hàng loạt.
  [ĐO 06/09] trong 8 file nguồn có chữ operator: **78 lần "ảnh" → còn 29**, tức **đổi 49**.
  Kèm theo **22 chữ `image` tiếng Anh** nằm CÙNG MỘT CÂU song ngữ với chỗ vừa đổi
  (`halt-instructions-core.js` 8 · `sidepanel.html` 11 · `sidepanel.js` 3) — để nửa Anh nói
  "image" cạnh nửa Việt nói "video" trong đúng một câu là tự mâu thuẫn.
  **29 lần CỐ Ý GIỮ "ảnh"**, chia hai loại: **16 chuỗi operator sống** đều nói về **ảnh tham
  chiếu đầu vào** (gói này sinh video TỪ ảnh mẫu, nên đó là chữ đúng — `MAX_INPUT_IMAGES`,
  `MISSING_REFERENCES`, `AMBIGUOUS_REFERENCES`, `DUPLICATE_REFERENCE`, `DUPLICATE_ALIASES`,
  `UNUSED_REFERENCES`, mục "so sánh output với ảnh input/reference", nút "Thêm ảnh tham
  chiếu"), và **13 lần trong chú thích** — lịch sử nhánh, đúng chỗ của nó.
  **Canh bằng** phần thứ hai của `tests/error-strings-load-bearing.mjs`: một danh sách
  **cụm đầu-vào được phép giữ chữ "ảnh"**, rồi cấm chữ "ảnh" ở mọi chỗ còn lại. Quét trên
  **giá trị thật** của ba từ điển (`operator-messages` · `halt-instructions` ·
  `operator-glossary`, 200 chuỗi) cộng cả `sidepanel.html` — không qua bộ tách chuỗi bằng
  regex, vì bộ tách đó có điểm mù thật. Danh sách miễn còn bị canh ngược: **cụm miễn nào
  không còn khớp chỗ nào thì ĐỎ**, để dòng miễn chết không nằm lại làm lỗ cho chữ cũ mọc lại
  (phép kiểm này đã bắt thật một dòng như thế ngay trong lượt viết nó).
  Suite 96/96 · chạy lại **cả hai chiều xuống dòng** (ép CRLF cả gói · ép LF cả gói) đều
  96/96 · đột biến kiểm **8/8 bị bắt**.
  **CÒN MỞ, nhỏ:** vùng quét-cấm **không phủ `sidepanel.js` và `content.js`** — hai file đó
  trộn chú thích tiếng Việt (có chữ "ảnh" đúng chỗ) với chuỗi, mà bộ tách chuỗi bằng regex
  thì có điểm mù. Chữ đã đổi ở hai file đó được giữ bằng **bảng ghim đếm số** từng câu, nên
  hồi quy thì ĐỎ; nhưng **câu MỚI** thêm vào hai file đó nói "ảnh" về đầu ra thì chưa ai canh.
  **CÒN MỞ, lớn hơn:** chữ **`image` tiếng Anh** ngoài các câu song ngữ trên vẫn còn khắp gói
  (~540 lần), nhưng phần lớn là **tên định danh và mã lỗi** (`saveImages`, `imagePattern`,
  `image_url`, `NO_NEW_IMAGE`, `MAX_INPUT_IMAGES`) chứ không phải chữ operator — đổi chúng là
  đổi hợp đồng message/schema, việc riêng, cần tách nhãn "định danh" khỏi "văn xuôi" trước.
  Nhãn tiếng Anh còn nói ảnh mà Đức nhìn thấy: `Download generated images`,
  `Max input references`, `📁 Images folder`.
  **Đọc `F-20` trước khi chạm bất kỳ câu báo lỗi nào ở nửa này.**
- **F-07** · Mở rộng schema XLSX cho video (duration, model, aspect ratio…) — sửa
  `DAC_XLSX_RUN_PLAN_V1.md` thành bản V2 có cột video, giữ tương thích cột cũ.
- **F-08** · Đo và đặt lại timeout runner cho video (Gemini: 90s/job — video cần
  nhiều phút [ĐỌC comment TIMING]).

## P3 — sau khi chạy được

- **F-09** · [ĐO 28/08] Flow chưa lộ số dư số học trong probe, nhưng khi hết credit thì
  `Create` biến mất và có 2 nút `Upgrade` visible/enabled. Matcher + test đã ghim
  `GENERATION_LIMIT_REACHED`, zero click/retry; còn cần reload và live verify bản vá.
- **F-10** · FEATURE-PARITY: nhánh này sẽ vào bảng parity khi có method Bridge chạy thật.
- **F-11** · **XONG 02/09 — và nó nổ thật trước khi kịp vá.** Đức chuyển sang chế độ Image để
  kiểm F-14/F-26, và probe cho thấy nhãn thật là `🍌 Nano Banana 2 **Lite** crop_16_9 x3`:
  đổi model, đổi tỉ lệ, đổi số lượng so với chuỗi duy nhất đã đo 28/08. Bản cũ khớp **chính xác**
  nên `generationMode()` trả `unknown` → **mọi job dừng ở `WRONG_GENERATION_MODE`**. Fail-closed
  đúng, nhưng nó biến **một thay đổi cấu hình bình thường của Đức** thành một cú dừng máy.
  **Vá:** nhận theo **cấu trúc** (`emoji + tên model + crop_* + x{n}`), y hệt cách nhãn Video vốn
  đã làm từ đầu. Hai điểm đo làm bằng chứng — bản 28/08 và bản 02/09 — nên đây không phải suy đoán.
  **Ghim cả hai chiều:** nhận đúng hai biến thể đã đo, **và từ chối** `🍌 rác` (chỉ có emoji),
  thiếu `x{n}`, thiếu `crop_*`. Nới lỏng pattern này không mất credit ngay, nhưng nó làm hệ thống
  tin nhầm một trang lạ là 'đang ở chế độ Image', và mọi quyết định sau đó dựa trên tiền đề sai.
  Suite 94/94 · mutation **4/4**. Bằng chứng: `evidence/F26-probe-BEFORE-imagemode-20260902.json`.
  ~~[ĐỌC 28/08, do audit Codex nêu] Nhãn Image mode trong `provider-adapter.js`~~
  đang khớp CHÍNH XÁC đúng một chuỗi đã đo: `🍌 Nano Banana 2 crop_9_16 x2`. Đổi model
  ảnh, đổi tỉ lệ, hay đổi số lượng (`x3`) → `generationMode()` trả `unknown` → job dừng
  `WRONG_GENERATION_MODE` trước khi gõ. Đây là fail-closed CỐ Ý (chưa có bằng chứng DOM
  cho dạng tổng quát, luật vàng 1 cấm đoán selector), KHÔNG phải bug — nhưng Đức sẽ gặp
  nó thật nếu đổi cấu hình ảnh. Nới ra thì phải đo trước: chụp `dom_probe` vài cấu hình
  Image khác nhau, rồi mới ghim pattern có cấu trúc như đã làm cho nhãn Video.
- **F-12** · [ĐỌC 28/08, audit Codex vòng 3] Composer giờ được lấy SAU mọi bước làm
  thay đổi DOM (đổi mode, gắn ảnh) và ngay trước khi gõ. Còn một khe hẹp chưa đo:
  nếu Flow remount composer trong khoảng GIỮA lúc gõ xong và lúc bấm Create
  (`confirmReferences`), chữ vừa gõ sẽ mất. Hiện khe này được chặn gián tiếp — composer
  rỗng thì Flow gỡ/khoá nút Create nên `waitForSendButtonReady()` hết giờ và zero click.
  Muốn chặn thẳng thì phải thêm phép kiểm "prompt còn nguyên trong composer" ngay trước
  click; CHƯA làm vì cách đọc chữ khỏi editor Lexical chưa được đo đủ chắc, đặt nhầm
  ngưỡng sẽ chặn oan cả job lành. Đo trước (dom_probe `textboxes[].valueLen`), rồi mới ghim.
- **F-13** · [ĐỌC 28/08, audit nêu] **Chưa đo được độ trễ mount của nút `arrow_forward Create`.**
  Sau khi gõ prompt, trạng thái "có chữ + không có Create + có Upgrade" vừa có thể là tường hết
  credit, vừa có thể là nút chưa kịp hiện. Hiện phân biệt bằng THỜI GIAN: hết hạn chờ
  (`sendReadyTimeoutMs`, đang 5s) mà vẫn vậy thì kết luận hết credit. Đó là đánh đổi có ý thức,
  không phải phép đo — nút mount chậm hơn 5s sẽ bị báo oan. Chọn hướng dừng vì an toàn credit,
  và lời nhắn cho Đức đã viết ở dạng "nhiều khả năng", không khẳng định. **Việc cần làm:** đo
  thật độ trễ mount qua vài lần gõ (dom_probe liên tiếp, đếm ms tới khi nút hiện), rồi đặt
  ngưỡng từ số đo. Trước khi có số, đừng nới/siết ngưỡng theo cảm tính.
- **F-14** · **RÀ LẠI 02/09 — mục này đang mô tả sai thực trạng.** Nó viết như thể bản vá chưa
  tồn tại và đề xuất "thêm một lệnh chẩn đoán bắn `pointerdown`+`mousedown`+…". **Bản vá ĐÃ CÓ:**
  `pressFlowControl()` trong `content.js:575` bắn đủ chuỗi `pointerdown` → `mousedown` →
  `pointerup` → `mouseup` → `click`, có dựng `PointerEvent` thật và lùi về `Event` khi không
  dựng được. `ensureFlowVideoMode` dùng nó cho cả chip lẫn tuỳ chọn Video.
  **Cái THẬT SỰ còn thiếu là KIỂM CHỨNG LIVE** — chưa lượt nào đi qua đường chuyển mode trên
  trang thật, vì Đức luôn đặt Video mode bằng tay trước khi chạy.
  **Hai cách kiểm, chọn theo giá:**
  ① *6 credit* — Đức đặt chip về **Image**, chạy 1 job; nếu `pressFlowControl` chạy thì mode tự
  chuyển sang Video rồi job đi tiếp bình thường. Rẻ về công, tốn credit, và cho câu trả lời dứt
  khoát.
  ② *0 credit, tốn công* — thêm `diagnostics.mode_probe`: chỉ mở bảng cấu hình rồi probe xem nó
  có mở không, không bao giờ gõ, không bao giờ bấm Create. Dùng lại được mãi, nhưng phải thêm
  method Bridge (registry + validator + handler + test) và một lần reload.
  **Đức chốt cách ② 02/09, ĐÃ LÀM XONG phần code.** Thêm method Bridge
  `diagnostics.mode_probe`: bấm chip cấu hình đúng một lần bằng `pressFlowControl`, báo lại bảng
  **có mở ra không**, rồi **đóng lại trả trang về nguyên trạng**. Suite 94/94, mutation **6/6**.
  **Giới hạn cứng, đã ghim** (`tests/mode-probe-is-zero-credit.mjs`): không bao giờ chạm nút
  Create · không bao giờ gõ · **không bao giờ bấm một tuỳ chọn mode** (bấm là đổi cấu hình của
  Đức sau lưng) · mở được thì phải đóng lại. Mutation dựng lại cả bốn vi phạm đó đều bị bắt.
  **Nó trả lời dứt khoát hai giả thuyết:** `opened: true` → nhóm nút nghe sự kiện pointer, đường
  chuyển mode **tự động được** và Đức thôi phải đặt tay mỗi phiên; `opened: false` → chúng đòi
  sự kiện thật, chuyển mode mãi mãi là việc của người và nên ngừng đổ công vào đó.
  **Và nó đáng giá gấp đôi:** trường `appeared_labels` là **bằng chứng DOM** để thêm nhãn tuỳ
  chọn Video cho locale khác (**F-24**) mà không phải dịch tay — đúng luật vàng 1.
  **ĐÃ CHẠY 02/09, 0 CREDIT — `opened: true`.** Bảng cấu hình **mở ra**. Nhóm nút của Flow **có**
  nghe sự kiện pointer tổng hợp; giả thuyết `isTrusted` **sai**. Trang trả về nguyên trạng
  (`panel_closed_again: true`). Kết luận cũ *"`element.click()` không tác dụng nên chuyển mode
  phải do người"* **đã hết hạn** — `pressFlowControl` làm được việc mà `click()` trần không làm được.
  ⚠️ **Nửa còn lại chưa chứng minh:** phép đo này chứng minh **mở được bảng**, chưa chứng minh
  **bấm `videocam Video` sẽ đổi mode** — đó là cú bấm khác, và lệnh probe **cố ý không bấm**.
  Kiểm nốt bằng cách rẻ nhất: Đức đặt chip về Image rồi chạy **một** job.
  Bằng chứng: `evidence/F14-KET-QUA.md` · `evidence/F14-mode-probe-vi-20260902.json`.
  ~~[ĐO 28/08, hai lần] **`element.click()` KHÔNG có tác dụng lên nhóm nút cấu hình~~
  của Flow.** Chứng minh hai lượt, cả hai 0 credit: (Q001) bấm chip mode → bảng không mở;
  (Q002) bảng đang mở sẵn, runner TÌM THẤY và BẤM đúng `videocam Video` → mode vẫn Image, bảng
  vẫn mở. Đối chiếu: cũng `element.click()` đó **bấm được `arrow_forward Create`** — Q003 submit
  thành công bằng đúng đường ấy. Nhóm nút hỏng đều mang class `flow_tab_slider_trigger`.
  **Giả thuyết (CHƯA chứng minh):** chúng nghe `pointerdown`/`mousedown`, mà `.click()` chỉ bắn
  mỗi `click` — cùng họ với bài học editor Lexical. Khả năng còn lại chưa loại trừ: component
  đòi sự kiện thật (`isTrusted`). **Cách phân biệt, rẻ và 0 credit:** thêm một lệnh chẩn đoán
  chỉ-thử-mở-bảng, bắn `pointerdown`+`mousedown`+`mouseup`+`click` rồi probe xem bảng có mở
  không. Mở được = giả thuyết 1, sửa luôn. Không mở = giả thuyết 2, và khi đó chuyển mode phải
  do người làm. **Hệ quả hiện tại:** Đức phải tự đặt Video mode trước mỗi phiên chạy; khi mode
  đã là Video thì `ensureFlowVideoMode` thoát sớm và đường tự động không bị ảnh hưởng.
- **F-15** · **XONG 02/09** (`claude-f18-evidence`). Cổng tự động: đọc `x{n}` từ nhãn chip
  (`outputCountFromSummary`) và **từ chối trước khi gõ, trước mọi cú bấm** nếu không phải `x1` —
  nên mọi đường thoát đều **0 credit**. Kiểm ở **cả hai** nhánh: khi mode đã là Video, và **sau
  khi chuyển Ảnh→Video** (chip Image vốn là `x2`, nên kiểm trước lúc chuyển sẽ chặn nhầm mọi job
  ảnh→video — tôi đặt sai chỗ lần đầu và test bắt được). Suite 93/93, mutation 4/6.
  **Hai đột biến lọt lưới, nói rõ chứ không giấu:** cả hai nằm trên nhánh "không đọc được số
  lượng", một lớp phòng thủ thứ hai **hiện chưa thể tới được** vì `VIDEO_MODE_SUMMARY_PATTERN`
  đã đòi hậu tố `x{n}` mới nhận là chip Video. Cố ý **không** viết test giả vờ phủ nó.
  ~~[ĐO 28/08] Chip cấu hình có ô **số lượng output**~~ (`x1`…`x4`). Đặt `x2` trở lên là
  Flow sinh nhiều video một lượt → luật gán "đúng 1 id mới" sẽ trả `OUTPUT_AMBIGUOUS`, không
  nhận cái nào, **mà credit thì đã tiêu**. Lần này bắt được trước khi chạy nhờ đọc chip, nhưng
  runner hiện KHÔNG tự kiểm điều đó. Nên thêm tiền kiểm: nếu chip không phải `x1` thì từ chối
  trước khi gõ, kèm lời nhắn bảo Đức đổi về `x1`. (Cẩn thận: đọc `x{n}` từ nhãn chip là selector
  mới → phải có bằng chứng DOM, đã có trong `F4-trial-success-live-20260828.json`.)
- **F-16** · [Thiết kế 28/08, rủi ro có thật] Copy nguyên thư mục profile Chrome sẽ nhân đôi
  `instance_id` trong `chrome.storage.local` → hai profile thay nhau chiếm ghế CỦA NHAU trên
  host (khoanh trong một cặp, các profile khác không bị vạ). Cần nút **"Tạo danh tính mới"**
  trong side panel để đổi `instance_id` tại chỗ. Dấu hiệu nhận biết: `bridge.sessions` thấy một
  entry có `connected_at` nhảy liên tục.
- **F-17** · [V2 của design multi-profile §5.4] Panel/transport gửi kèm chuỗi `runtime_contract`
  trong `auth` để MỘT lệnh `bridge.sessions` thấy độ tươi của mọi profile. Hiện tại phải
  `dom_probe --target` từng đích (2 lệnh) — vẫn đủ dùng, chưa gấp.

- **F-18** · [ĐO 02/09, lượt trial F4R2] **Chữ vào được composer nhưng nút gửi không bao giờ
  enable → job chết ở `PRE_SUBMIT`.** Đo thật trên hồ sơ `kaito`: sau khi runner gõ, composer
  `[contenteditable="true"][role="textbox"]` có `valueLen: 172` (không rỗng), nhưng
  `arrow_forward Create` vẫn `disabled: true`, nên `waitForSendButtonReady()` hết giờ và ledger
  ghi `Send button did not become ready`. **0 credit, 0 retry, số video không đổi** — fail-closed
  đúng. Nghi: đường gõ ở `content.js` (`execCommand insertText` → `beforeinput`/`input` →
  `ClipboardEvent paste`, dòng ~253–275) ghi được ký tự vào DOM nhưng Flow (React/Lexical) không
  ghi nhận vào state, nên Create không mở. **Đính chính bảng lỗi dòng 150 của
  `AI-OPERATOR-GUIDE.md`:** kết luận cũ "nút disabled nghĩa là chưa gõ được chữ" chưa đủ — chữ
  ĐÃ vào DOM. **Chưa giải thích:** prompt 145 ký tự mà composer đo 172, lệch 27; lượt sau phải
  lưu probe TRƯỚC khi chạy để có mốc so. **Đức đã biết lỗi này, chốt 02/09 để debug sau** —
  đừng tự sửa mù. Bằng chứng: `evidence/F4R2-KET-QUA.md`.

  **PHẢN CHỨNG — đọc trước khi đụng vào `content.js`, 03/09.** Câu "nghi đường gõ" ở trên
  **mâu thuẫn với bằng chứng đã có**. FLOW-01 ngày 27/08 gõ THÀNH CÔNG vào **đúng selector
  composer đó** và nút Create **đã sáng**: `evidence/F1-EVIDENCE-NOTES.md` ghi
  `typing_path: "input_events"`, `create_button: "enabled"`, rồi submit và sinh ra video thật.
  Vậy đường gõ **không phải chưa bao giờ chạy được** — nó **đã chạy được rồi và hỏng về sau**.
  F-18 là một **hồi quy**, không phải một bài chưa giải.

  Hệ quả cho phiên sửa: **đừng viết lại `typeIntoFlowComposer`.** Việc đầu tiên là tìm cái gì
  đã khác đi giữa hai lượt. Bốn ứng viên, chưa loại được cái nào:

  | Khác biệt | 27/08 (chạy được) | 02/09 (hỏng) |
  |---|---|---|
  | Đường gọi | `evidence_submit` (dry_run) | runner `jobs` / `run.trial` |
  | Hồ sơ Chrome | không ghi lại | `kaito` |
  | Trang Flow | bản 27/08 | bản 02/09 — **cách nhau 5 ngày**, Flow có thể đã đổi |
  | Composer lúc bắt đầu | không ghi lại | **có sẵn 27 ký tự thừa** (145 nạp vào, đo ra 172) |

  Ứng viên thứ tư là đáng ngờ nhất và cũng rẻ nhất để loại: `typeIntoFlowComposer` gọi
  `focusAndSelectAll()` rồi mới chèn, nên chữ cũ đáng lẽ bị thay. Nếu composer vẫn dôi ra 27
  ký tự thì `selectNodeContents` **không phủ hết** nội dung Lexical — và một composer chứa
  nội dung lai có thể là lý do React từ chối mở nút.

  ~~**Số liệu tự do nhất, không tốn credit, không cần mở trang:** lượt F4R2 CÓ ghi
  `detection.typing_path`…~~ **SAI — đã kiểm 02/09, xem ngay dưới.**

  **ĐÃ ĐỌC LẠI BẰNG CHỨNG, 02/09 (`claude-f18-evidence`) — 0 credit, không mở trang Flow.**
  Toàn văn: [`evidence/F18-PHAN-TICH-BANG-CHUNG-20260902.md`](evidence/F18-PHAN-TICH-BANG-CHUNG-20260902.md).
  Ba điều, mỗi điều đổi việc phải làm tiếp:

  1. **`detection.typing_path` của F4R2 KHÔNG TỒN TẠI.** `grep -rn "detection" evidence/F4R2-*`
     ra 0 dòng. Lý do: chỗ ghi số đo nằm **sau** `waitForSendButtonReady` — đúng cái cổng đã
     ném ở lượt đó. Số đo về đường gõ vì thế chỉ được lưu ở những lượt KHÔNG cần tới nó. Thêm
     một tầng hụt nữa: `typing_path` không nằm trong `CARRIED_DIAGNOSTICS`, nên lượt **thành
     công** cũng về sổ cái với trường rỗng. **Đã vá cả hai** (thuần bằng chứng, không đụng
     `typeIntoFlowComposer`; pin `tests/typing-path-survives-send-gate-static.mjs`, 8/8 đột
     biến bị bắt).
  2. **Bỏ câu "chữ ĐÃ vào DOM mà nút vẫn disabled".** `valueLen` không đo cái ta tưởng. Ngày
     27/08 — ngày MỌI THỨ CHẠY ĐƯỢC — composer đọc ra **28** ở cả năm snapshot: trước khi gõ
     (14:54), 4 giây sau khi submit (15:07:46), và sau khi video đã xong (15:08:57). Một con
     số đứng yên trong khi prompt được gõ rồi gửi đi thì **không phải prompt**; nó là phần
     `textContent` cố định của phần tử.
  3. **Ứng viên số 4 (27 ký tự thừa) — LOẠI.** `145 + 27 = 172` (02/09) và `0 + 28 = 28`
     (27/08): phần dôi ra có mặt ở **cả hai** ngày, kể cả ngày chạy được. Không phải rác của
     lượt trước; đi soi `selectNodeContents` là sai đường. Đọc ngược lại thì `172` còn nói
     prompt **đã vào thật**.
     **Ứng viên số 1 (đường gọi) — LOẠI phần lớn:** dry_run lọc `textareas` theo `isVisible`, mà
     `<textarea>` duy nhất trên trang là `g-recaptcha-response` `visible:false` ở cả hai ngày →
     dry_run cũng rơi về `findComposer()`, **cùng một phần tử**. Và ở lượt F4R2 thì
     `ensureFlowVideoMode()` (mode đã đúng do Đức đặt tay) lẫn `stageReferences([])` đều
     **return ngay** — hai bước "khác biệt" ấy là no-op.
     **Còn sống: ứng viên 2 (hồ sơ) và 3 (bản Flow đổi sau 5 ngày) — số 3 nay mạnh nhất.**
     Và lượt F4R2 **đã chờ đủ**, không phải chờ hụt: `typeIntoFlowComposer` tự chờ 2×2500 ms,
     rồi `waitForSendButtonReady` chờ tiếp trọn `sendReadyTimeoutMs`.

  **ĐÍNH CHÍNH LỚN 02/09 sau lượt live F4R3 — đọc trước khi tin ba gạch đầu dòng ngay trên.**
  Kết luận "ứng viên số 4 đã LOẠI" ở trên là **SAI**, và tôi là người kết luận sai. Đo trực
  tiếp hôm nay: composer rỗng đọc ra **28**, nhưng gõ 141 ký tự thì đọc ra **141** — hằng số 28
  **bị THAY THẾ khi gõ đúng cách, không cộng thêm**. Vậy lượt F4R2 đọc ra `172` cho prompt 145
  ký tự là **dôi 27 ký tự bất thường thật** → composer ở trạng thái **lai**, đúng như ứng viên
  số 4 mô tả. **Ứng viên 4 sống lại và nay mạnh nhất.** Chỗ sai: cả năm snapshot 27/08 đều chụp
  lúc composer RỖNG, tôi ngoại suy sang trạng thái có chữ mà không có số đo cho trạng thái đó —
  *năm lần đo cùng một trạng thái vẫn là một điểm dữ liệu.*

  **VÀ F-18 KHÔNG TÁI HIỆN.** Lượt F4R3 (02/09, `kaito`, cùng prompt) chạy **trọn vẹn**: video
  thật `c81af2c5…`, quy gán đúng 1 ứng viên, 0 retry. Đường gõ đo được `typing_path:
  "input_events"` + `create_button: "enabled"` (0 credit, qua `dry_run`) — **trùng khít 27/08**.
  Nên F-18 **hạ khỏi P1**: đường gõ không hỏng. Câu hỏi còn lại hẹp hơn nhiều — *vì sao lượt
  F4R2 để composer ở trạng thái lai* — và **đừng sửa mù**: chờ nó xuất hiện lại, lúc đó
  `composer_len_before_typing` (bản vá `be17e75`) sẽ nói ngay ô có sạch trước khi gõ hay không.
  Bằng chứng: `evidence/F4R3-KET-QUA.md`.

  **Việc kế tiếp của F-18 (vẫn chờ Đức bật panel + Dev Mode + Video mode trên `kaito`):** chạy
  `run.trial` **x1**, có lưu `dom_probe` TRƯỚC khi chạy. Hỏng thì vẫn 0 credit, nhưng sổ cái
  lần này có `typing_path` + `composer_len_before/after` → kết luận được ngay, không cần lượt
  thứ ba. Bảng đọc kết quả ở mục 5 của file phân tích. **Nhớ reload extension** — đã sửa `.js`.
- **F-21** · **XONG 02/09, đã xác nhận trên trang thật (lượt F4R4).** Vá: thêm
  `mergeDetection()` vào `attempt-telemetry-core.js`, nhánh video gọi nó thay cho
  `JSON.stringify` thẳng. Sổ cái lượt F4R4 nay có đủ `typing_path="input_events"`,
  `typing_ok=true`, `prompt_len=145`, `composer_len_before_typing=28`,
  `composer_len_after_typing=145`, `attach=null` — **và lần ghi kết quả không mất gì**.
  Suite 89/89, 6/6 đột biến bị bắt. Pin: `tests/video-ledger-keeps-attempt-detection.mjs`.
  Bằng chứng: `evidence/F4R4-KET-QUA.md`.
  **CÒN MỞ (nhỏ, chưa gặp thật):** nhánh **ảnh** (`sidepanel.js:4523`) cũng không trải bản cũ —
  nó mang tay đúng ba trường `attach`/`blob_conversion`/`image_url_dropped`, nên trường
  tiền-submit nào khác cũng sẽ rơi y như nhánh video từng rơi. Cố ý chưa sửa: nhánh ảnh đang
  chạy được và tôi không kiểm live được nó.

- **F-21-cu** · [ĐO 02/09, lượt F4R3 live] **Trên đường VIDEO, `attempt.detection` KHÔNG tới được
  sổ cái.** `sidepanel.js:4697` gọi `applyAttemptTelemetry` ghi `detection_diagnostics` từ
  `attempt.detection`; rồi `finishDetectedOutput` chạy sau và nhánh video ở `sidepanel.js:4512`
  ghi **thay trắng** `JSON.stringify({...result.detection, video_id, video_url, detected_at})`.
  Nhánh ảnh (`:4523`) có mang theo `attach`/`blob_conversion`/`image_url_dropped`; nhánh video
  **không mang gì**. Bằng chứng: sổ cái lượt F4R3 mất **cả** `typing_path` **lẫn** `attach` —
  mà `attach` đã ở trong `CARRIED_DIAGNOSTICS` từ trước, nên **lỗ này có sẵn, không do bản vá
  `be17e75`**; chỉ là chưa ai đọc `attach` trên đường video nên chưa lộ. Sửa: nhánh video trải
  lại `item.detection_diagnostics` đang có trước khi chồng trường video lên. Xác nhận thì cần
  một lượt live nữa (15 credit) → **hỏi Đức trước**. Bằng chứng: `evidence/F4R3-KET-QUA.md`.

- **F-22** · **XONG 05/09** (`claude-flow-no`). Trần chuỗi trial nay **suy từ chip cấu hình**:
  `videoCreditsFromSummary()` trong `provider-adapter.js` đọc độ phân giải + thời lượng + số
  lượng output từ đúng cái nhãn chip đã có bằng chứng DOM, tra bảng giá **đo thật**
  (360p 8s = 6 · 360p 10s = 7 · 720p 10s = 15, mỗi ô kèm trích nguồn), rồi
  `trialJobCeiling()` trong `dev-trial-core.js` chia ngân sách 50 credit ra trần.
  Kết quả: 360p x1 → 7 · 720p x1 → **3** · 360p x3 → **2**.
  **Trần chỉ được HẠ, không bao giờ nâng:** `MAX_TRIAL_JOBS = 7` vẫn là trần tuyệt đối và
  phép kiểm quét toàn dải giá 1..100 × 1..4 output để cưỡng chế điều đó — nới một cổng chi
  tiêu là đổi luật an toàn, phải hỏi Đức. **Tổ hợp chưa đo giá (ví dụ 720p 8s) trả `null`,
  không nội suy**, và không đọc được chip thì lấy **cấu hình đắt nhất đã đo** (15) chứ không
  lấy rẻ nhất — đoán rẻ là lập kế hoạch 7 job rồi chết ở job thứ 4.
  Ghim: `tests/trial-cap-follows-config-chip.mjs` (8/8 đột biến bị bắt, gồm cả đột biến dựng
  lại đúng lỗi cũ). **Chưa kiểm live** — con số 3 ở 720p suy từ giá đo được, chưa chạy thật.
  Đề bài gốc: **Trần chuỗi trial đang khoá cứng ở 7, mà 7 chỉ đúng với 360p.**
  Phép tính: tài khoản free 50 credit ÷ 7 credit/video (360p) = 7 video (49/50). Ở **720p** một
  video tốn 15 → một tài khoản chỉ đủ **3**, và job thứ 4 trở đi của một chuỗi đầy sẽ chạm tường
  credit. Hỏng an toàn (`GENERATION_LIMIT_REACHED` = dừng cứng, 0 chi) nhưng mất công lập kế
  hoạch. **Việc cần làm:** đọc độ phân giải từ chip cấu hình (`Video · 360p · 10s crop_16_9 x1`
  — đã có bằng chứng DOM) rồi suy ra trần thay vì khoá cứng. Cẩn thận: đọc `360p` từ nhãn chip
  là **selector mới**, phải có bằng chứng DOM trước, đúng luật vàng 1.

- **F-24** · **ĐÓNG 02/09 — BÁO ĐỘNG GIẢ, đã đo lại.** Tôi ghi mục này bằng **suy đoán**:
  thấy `arrow_forward Create` bị dịch thành `arrow_forward Tạo` nên kết luận `videocam Video`
  "gần chắc" cũng bị dịch. **Sai.** Đo thật trên giao diện tiếng Việt: `videocam Video`
  **giữ nguyên** (vì "Video" trong tiếng Việt cũng là "Video"), và
  `video_option_found_by_english_label: true`.
  **Nhưng rủi ro chuyển chỗ, không biến mất:** `image Hình ảnh` **bị dịch thật** — nên nhãn
  **Image mode** mới là chỗ đáng lo (thuộc **F-11**), không phải Video.
  **Bài học ghi lại:** một quả mìn suy ra bằng loại suy cần một phép đo trước khi được coi là
  mìn — và cũng cần một phép đo trước khi được coi là an toàn.
  ~~[QUÉT 02/09, chưa gặp thật, hỏng an toàn] Quả mìn locale còn lại duy nhất:~~
  `findVideoModeOption()` trong `provider-adapter.js` so khớp **chính xác** chuỗi tiếng Anh
  `"videocam Video"`. Trên giao diện tiếng Việt nhãn đó gần chắc bị dịch (cùng probe đã thấy
  `videocam Xem video` ở thanh bên), nên hàm sẽ trả `null`.
  **Vì sao chưa cắn:** nó chỉ được gọi khi `ensureFlowVideoMode()` thấy mode **không phải**
  video và cần tự chuyển. Hiện Đức đặt Video mode bằng tay, và F-14 đã đo rằng `element.click()`
  không tác dụng lên nhóm nút cấu hình đó — nên đường tự chuyển vốn đang không dùng được.
  **Hỏng an toàn:** trả `null` → `FLOW_VIDEO_MODE_ERROR` → dừng trước khi gõ, 0 credit. Không
  bao giờ bấm nhầm.
  **Cách sửa, đúng luật vàng 1 — đừng dịch tay:** mở bảng chọn mode trên một hồ sơ tiếng Việt,
  chạy `dom_probe`, đọc nhãn THẬT, lưu probe vào `evidence/`, rồi mới thêm nhãn kèm trích nguồn
  — y như đã làm cho `CREATE_BUTTON_LABELS` ở F-23.
  **Đã kiểm và KHÔNG phải mìn:** chuỗi `"arrow_forward Create"` ở `content.js:1291` nằm trong
  **comment**; đường `dry_run` gọi qua `ADAPTER.findCreateButton` nên đã được F-23 sửa. Nhãn
  chip `IMAGE_MODE_SUMMARY_LABEL` là tên sản phẩm + tham số, rủi ro thấp, và đã có nợ riêng F-11.

- **F-25** · [ĐO 02/09, lượt F4R8 live] **Vòng chạy job chết theo side panel — và nâng nhịp làm
  điểm gãy này nguy hiểm gấp đôi.** Chuỗi 7 job dừng sau Q004 và **đứng yên 22 phút**:
  `queue.list` cho Q005–Q007 `PENDING`, `run.status` cho `state: RUNNING` / `running: 0` /
  **`halt: null`**, trong khi `system.ping` báo mọi lớp đều sống (`executor: available`,
  `state: READY`, composer tìm thấy, không generating). Chi tiết chốt hạ: **`run.stop` trả
  `ok:true` mà trạng thái không đổi** → không có ai tiêu thụ cả yêu cầu dừng. Vòng lặp chạy job
  nằm trong `sidepanel.js`, nên panel đóng/mất là chuỗi chết âm thầm — **không lỗi, không halt,
  không dấu hiệu gì ngoài việc số đếm ngừng nhích.**
  **Vì sao nay mới đau:** nâng nhịp đưa một chuỗi 7 job từ ~9 phút lên **~20+ phút**, tức hơn
  gấp đôi thời gian phơi ra trước điểm gãy. Nhịp chậm là đúng cho mục tiêu không bị chặn, nhưng
  nó biến **độ bền của chuỗi** thành nút thắt mới.
  **BƯỚC ② XONG 2026-09-04** (`claude-dieu-phoi`, Đức chốt làm ngay). `run.status` nay trả thêm
  khối `loop`: `alive` · `stalled` · `heartbeat_age_ms` · `expected_next_ms` · `stage` · `reason`.
  Nhịp tim do **chính vòng lặp chạy job** đập ra tại bốn mốc (`QUEUE_ADVANCE` ×2 · `GATE_CHECK` ·
  `WAITING_JOB`) cộng mỗi giây trong `countdown` — **không** dùng `setInterval`, vì lúc chuỗi gãy
  02/09 thì panel VẪN SỐNG (chính nó trả lời `run.status`), nên một đồng hồ riêng sẽ tích tắc vui
  vẻ mà không thấy gì. Mỗi giai đoạn **tự khai trần chờ**; `WAITING_JOB` lấy trần từ timeout thật
  của job. Logic nằm ở `run-liveness-core.js` (hàm thuần, `now` là tham số — nên ca "đã 22 phút"
  dựng được bằng test). Suite 95/95 · thử phá **25/25** bị bắt, trong đó **ba lượt đầu THOÁT** vì
  khẳng định chỗ nối dùng `[\s\S]*?` chạy ra ngoài thân hàm; đã siết bằng cách cắt đúng thân hàm.
  **Thứ tự ①② đã đảo có chủ đích:** làm ② trước vì nó không cần Đức, không cần credit, và nó biến
  bước ① từ "ngồi chờ 22 phút mới biết có gãy" thành "một phút". Bước ③ vẫn **cần Đức chốt**.

  **Việc cần làm, theo thứ tự:** ① tìm ra chính xác cái gì giết vòng lặp (panel đóng? cửa sổ đổi?
  service worker ngủ kéo panel theo?) — chưa đo được, đừng đoán; ② cho `run.status` phân biệt
  được "đang chờ nhịp" với "không còn ai chạy" (ví dụ một mốc thời gian nhích đều), để AI điều
  phối phát hiện trong một phút thay vì hai mươi; ③ cân nhắc cho vòng lặp sống ở service worker
  thay vì panel — **đổi lớn, cần Đức chốt**.
  Bằng chứng: `evidence/F4R8-KET-QUA.md`.

- **F-26** · **XONG 02/09** (Đức chốt: *"cho runner tự đặt x1 và tự đọc cấu hình"*). Runner nay
  **tự mở bảng cấu hình, tự bấm `x1`, rồi ĐỌC LẠI CHIP để kết luận** — không tin cú bấm.
  `findOutputCountOption` nhận nút theo **nhãn chính xác** đã đo (`"x1"`), đòi **đúng một** ứng
  viên, và từ chối nếu mờ: bảng này còn có `360p`/`720p`, bấm nhầm không mất credit ngay nhưng
  **đổi đơn giá mỗi video** — mờ ở đây là mờ về tiền.
  **Cổng từ chối của F-15 GIỮ NGUYÊN làm lớp cuối.** Tự sửa được thì đi tiếp; sửa không được thì
  vẫn từ chối, và **luôn đóng bảng lại** trước khi từ chối.
  **Ghi vào sổ cái trường `output_chip`** (`label_before`, `count_before`, `fix_attempted`,
  `count_after`, `fixed`): một thay đổi cấu hình do AI tự làm mà không để lại dấu vết thì Đức
  không còn cách nào biết. `fixed` là **kết luận đọc từ chip**, không phải "tôi đã bấm".
  Suite 94/94 · mutation **7/7**. Bằng chứng nhãn: `evidence/F14-mode-probe-vi-20260902.json`.
  **CÒN LẠI:** chưa kiểm live. Và F-22 (đọc độ phân giải để suy trần chuỗi) vẫn mở — nay đã có
  `findOutputCountOption` làm mẫu, cùng cách làm.
  ~~[ĐO 02/09, kèm theo F-14] Bảng cấu hình LIỆT KÊ ĐƯỢC~~ — ba việc đang treo có
  đường đi rẻ hơn hẳn.** `diagnostics.mode_probe` cho thấy 17 nhãn, gồm **toàn bộ** nút cấu hình
  rời: `360p` `720p` · `4s` `6s` `8s` `10s` · `16:9` `9:16` · **`x1` `x2` `x3` `x4`**.
  Hệ quả: **F-15** hiện *từ chối* khi chip không phải `x1` — với bảng này runner có thể **tự đặt
  về `x1`** (vẫn giữ cổng từ chối làm lớp cuối). **F-22** cần độ phân giải để suy trần chuỗi —
  nay đọc được trực tiếp. Và thời lượng `8s` vs `10s`, thứ quyết định 6 hay 7 credit mỗi video,
  cũng đọc được.
  **CHƯA LÀM GÌ — cần Đức chốt.** Mỗi cú bấm vào các nút đó là **đổi cấu hình của Đức**; đó là
  quyết định của anh ấy chứ không phải việc AI tự tiện. Bằng chứng: `evidence/F14-KET-QUA.md`.

### LUẬT, KHÔNG PHẢI VIỆC — sửa chữ báo lỗi là sửa hành vi runtime (mã cũ: `F-20`)

> Đây là một **luật đã ghim**, không phải một việc còn nợ. Trước 05/09 nó nằm lẫn trong danh
> sách `F-xx` nên bộ đếm nợ tính nó là một việc chưa làm — chữ giữ nguyên, chỉ đổi chỗ đứng.
> Code và test còn trỏ về mã cũ `F-20`, nên mã đó giữ lại ở đây để tra được.

**Đọc trước khi sửa BẤT KỲ chữ báo lỗi nào trong gói này.**
`classifyFailure` (`runner-core.js:88-103`) quyết định một thất bại có được thử lại hay dừng
cả mẻ, và nó **dò từ khoá trên TOÀN BỘ câu báo lỗi**, không phải trên tiền tố. Nên **sửa lời
văn là sửa hành vi runtime.** Phiên 02/09 đã dính: thêm chữ `composer` vào câu ở cổng gửi làm
`OTHER` (thử lại được) thành `RECEIVER_LOST` (dừng cứng cả mẻ) — audit độc lập bắt được trước
khi push. Từ khoá phải né: `receiver` · `composer` · `chatgpt tab` · `session integrity` ·
`limit` · `captcha` · `timed out`/`timeout` · `ambiguous` · `no attributable`/`no output` ·
`reference`/`attachment`/`upload` · `download`/`fetch`/`write` · `validation`/`invalid`.
Cổng gửi đã có `tests/send-gate-error-classification.mjs` canh; **các câu báo lỗi khác trong
gói thì CHƯA ai canh** — phần chưa canh đó nay là một phần của nợ rebrand **F-06**.

- **F-19** · **XONG một phần 02/09** (`claude-f18-evidence`): câu ở cổng gửi — câu operator gặp
  nhiều nhất — đã đổi thành *"The prompt may never have been accepted by the page, or the Flow
  DOM changed"*, và mang theo `typing_path`. (Bản đầu viết "The Flow composer…" và **đã gây ra
  một hồi quy phân loại thật** — xem **F-20**.) Ghim ở mục 6 của
  `tests/typing-path-survives-send-gate-static.mjs` và toàn bộ
  `tests/send-gate-error-classification.mjs`. **Còn lại:** các chuỗi "Gemini" khác trong
  gói, thuộc nợ rebrand **F-06**. · [ĐO 02/09] Chữ lỗi trả về operator còn nói **"Gemini DOM may have changed"** trên
  một trang Google Flow — đồ thừa kế từ nhánh Gemini, thuộc nợ rebrand **F-06**. Nhỏ, nhưng
  người đọc ledger sẽ đi tìm nhầm chỗ.

### Cửa sổ bỏ cuộc là cận trên, không phải đồng hồ thật — **[ĐỌC]**, chấp nhận có chủ đích

`bridge-transport-loopback.js` trừ vào ngân sách bỏ cuộc **những khoảng chờ chính nó hẹn** (độ trễ
giữa các lần thử, hạn bắt tay, kỳ thử + hạn chờ ACK). Nó **không** đọc đồng hồ thật, nên sau một
ACK về muộn, chu kỳ kế bị trừ trọn một kỳ dù thực tế trôi ít hơn.

Hệ quả: thang **bỏ cuộc sớm hơn** 2 phút một chút trong tình huống đó — lệch về phía tiết kiệm
pin, đúng mục đích của cửa sổ. Auditor độc lập nêu 02/09; **chấp nhận, không sửa**, vì đọc đồng hồ
thật sẽ làm mọi hạn chờ trong file này không test được bằng đồng hồ tiêm vào.

Chỉ mở lại nếu có bằng chứng thật là extension nhường alarm quá sớm và gây phiền.

- **F-23** · **XONG 02/09** (`claude-f18-evidence`, Đức duyệt quyền). **URL Flow có đoạn locale
  không được nhận.** Đo trên hồ sơ `Bình`: `labs.google/fx/**vi/**tools/flow/project/<id>` không
  khớp `manifest.json` → Chrome không tiêm content script → panel `composer_found: false` →
  triệu chứng là **`RECEIVER_LOST`**, chỉ thẳng vào một chỗ không hề sai. Đã thêm
  `fx/*/tools/flow/*` vào manifest và cho adapter nhận **đúng một** đoạn dạng mã ngôn ngữ.
  Suite 93/93, 5/5 đột biến bị bắt. Xem `decisions.md` (mục cấp quyền) và
  `tests/flow-locale-url-static.mjs`.
  **NỬA THỨ HAI, cũng đã xong:** giao diện tiếng Việt còn **dịch cả nhãn nút** —
  `arrow_forward Create` → `arrow_forward **Tạo**`, `add_2 Create` → `add_2 **Tạo**`. Sửa URL
  xong vẫn không chạy được: `composer_scope_resolved: false`, `sendFound: false`. Đã thêm nhãn
  tiếng Việt vào `CREATE_BUTTON_LABELS` **kèm trích nguồn bằng chứng**.
  **Đã thử một cách gọn hơn và BỎ:** so khớp theo tiền tố ligature (`^arrow_forward\s+\S`) —
  ligature Material Symbols không bị dịch nên nó nhận đúng cả hai locale và loại đúng `add_2`
  ở cả hai. Nhưng nó nuốt luôn near-miss `arrow_forward Recreate` mà `provider-adapter-static.mjs`
  cố ý chặn. **Nới một cổng chi tiêu credit để đỡ phải thêm nhãn cho từng ngôn ngữ là đổi sai
  chiều.** Giữ danh sách chính xác; thiếu nhãn thì hệ thống TỪ CHỐI chạy — hướng hỏng đúng.
  Thêm ngôn ngữ mới: chạy `dom_probe`, lưu probe vào `evidence/`, rồi mới thêm nhãn (luật vàng 1).
  Có phép kiểm đòi mỗi nhãn phải kèm trích nguồn, và mutation T4 (thêm nhãn không bằng chứng)
  bị bắt.

  **Còn mở, nhỏ:** các worker khác (`duc-auto-gemini`, `duc-auto-chatgpt`) chưa được soi xem có
  dính cùng bẫy locale không — chưa gặp thật, và mỗi gói có chủ riêng.

### Xuống dòng CRLF làm vỡ phép kiểm tĩnh — **[ĐO 05/09]**, đã vá ở gói này, còn mở ở gói khác

Blob của `content.js` trong git là **CRLF**; bản trên đĩa của các phiên cũ là **LF**. Nên một
phép kiểm tĩnh đòi `,\n` sát nhau sẽ **XANH ở máy đang làm dở** mà **ĐỎ ngay sau một
`git checkout content.js`** — hoặc trên một bản clone mới. Không dòng mã nào đổi, chỉ xuống dòng.

Gặp thật trong lượt đột biến kiểm F-06: câu lệnh khôi phục biến bốn file thành CRLF và suite đỏ.
Ép CRLF cả gói thì đúng **một** phép kiểm đỏ — `content-image-static.mjs` dòng 130 — đã nới thành
`\r?\n` và chạy lại suite **cả hai chiều**, 96/96 mỗi chiều.

**Còn mở, không phải việc của gói này:** gốc bệnh là repo không có `.gitattributes` cho `.js`
(chỉ có một dòng cho `DASHBOARD.md`), nên `core.autocrlf=true` quyết định tất cả. Vá đúng chỗ là
thêm `* text=auto eol=lf` ở gốc — mà đó là khoá `_root`, và nó sẽ **viết lại xuống dòng của mọi
file trong repo**, nên phải để Đức chốt. Hai gói kia (`duc-auto-gemini`, `duc-auto-chatgpt`) chưa
được soi xem có phép kiểm nào cùng bệnh không; cách soi rẻ nhất là ép CRLF cả gói rồi chạy suite.
