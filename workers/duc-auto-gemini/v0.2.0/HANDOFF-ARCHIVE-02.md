# HANDOFF-ARCHIVE-02 — `workers/duc-auto-gemini/v0.2.0/HANDOFF.md`

> **Bản dài nguyên văn của các mục đã được viết ngắn trong `HANDOFF.md` cạnh file này.**
> Đổi chỗ ngày 2026-09-06 theo [ADR-0011](../../../docs/adr/0011-handoff-chan-o-dau-vao-va-xoay-theo-thang.md)
> mục ⑶ (Đức duyệt) và [ADR-0012](../../../docs/adr/0012-handoff-loc-theo-noi-dung-khong-loc-theo-ngay.md),
> phiên `claude-codex-ngan`.
>
> **Nguyên văn, không sửa một chữ, không xoá một dòng.** Viết ngắn là **đổi chỗ chi tiết**, không
> phải xoá: mọi số đo, mọi vòng audit, mọi lần tác giả tự đính chính kết luận sai đều ở đây. Các
> mục xếp theo đúng thứ tự chúng vốn nằm trong file gốc.
>
> SHA-256 của `HANDOFF.md` **trước** lượt đổi chỗ: `9a76e562777b125684155fc406d9b9990b71ba852e60af6472f238bd5a5dee8c`.
> SHA-256 của phần thân dưới đây: `a6202ae77bbe5082b98b7492e4c777b6f0aeafa1c7a3447a9fe9d26436a05057`.
> Ghép phần thân đó vào đúng chỗ các mục tương ứng trong `HANDOFF.md` là dựng lại được bản gốc
> **giống hệt từng byte** — đã đo, không phải lời hứa.
>
> **Chỉ đọc.** Ghi Log mới thì ghi vào `HANDOFF.md`, đừng ghi vào đây.

<!-- ARCHIVE-BODY-START -->
## Log

## 2026-09-02 — `claude-y05`: viết lại chữ operator cho mắt Đức đọc (không đụng code)

Phép kiểm **B15** mới (luật vàng 5) bắt `next_step` của gói này viết không dấu. Đã viết lại
`next_step` và `current_focus` thành tiếng Việt có dấu, bỏ thuật ngữ mà người ngoài không hiểu.

**Đổi ranh giới trường, quan trọng hơn cả việc thêm dấu:** `next_step` cũ trộn cả việc của Đức
(*nạp lại tiện ích, đặt tên hồ sơ*) lẫn việc của AI (*gọi `bridge.sessions` đối chiếu*). Việc
của Đức nay nằm ở trường riêng `human_action`, nên `next_step` chỉ còn **việc của phiên AI kế
tiếp**. Đừng nhập lại hai thứ đó.

Nội dung kỹ thuật không đổi một chữ — chỉ đổi cách viết. **Không đụng một dòng code nào.**
- 2026-09-02 · `claude-bridge-multiprofile` · **Nút "Lưu tên" — báo danh NGAY, Đức chốt 02/09.**
  Message mới `DAC_BRIDGE_LABEL_SET` trong transport (đi qua `queuePairingWork` như PAIRING_SET):
  sanitize → lưu label → `closeSocket()` + `connectHost()` của ĐÚNG profile đó → lần nối mới
  báo danh tên mới tức thì. Không đụng host, không reload extension, profile khác vô can.
  Panel: nút Lưu tên cạnh ô nhập; cả change-event lẫn nút đi cùng một đường. Test ghim
  `bridge-profile-label-save-smoke.mjs` (label bẩn có ký tự điều khiển → lưu bản sạch, socket
  cũ bị thay, auth mới mang tên mới, token nguyên vẹn); 3/3 mutation đỏ (bỏ cycle / bỏ lưu /
  bỏ sanitize). Suite 85/85. NỢ PORT: gg-flow-video + chatgpt đang có chủ phiên khác —
  đắp cùng khuôn khi họ trả quyền (transport handler + nút panel + test, y hệt).
- 2026-09-02 · `claude-bridge-multiprofile` · **Audit nút Lưu tên: 2 vòng.** Vòng 1 FAIL đúng:
  sanitize quét chuỗi TRƯỚC khi chặn độ dài (kẻ gửi label 1 triệu ký tự bắt SW trả giá O(input))
  và C1 controls (U+0080–U+009F) lọt lưới. Vá cả BA bản sao trong gói (transport, panel, host):
  slice(0,256) trước regex, lớp lọc thêm C1, và quét surrogate mồ côi (LOW vòng 2: nấc cắt
  256/64 có thể chém đôi emoji). Test thêm 4 ca thù địch + ghim HÀNH VI cho cả bản sao của host;
  fixture đầu tiên của tôi bị chính mutation tố là trang trí (đệm x bị nấc 64 cắt trước) —
  đổi sang đệm ký tự điều khiển đúng repro của Codex, giờ S1/S2 ĐỎ thật. Suite 85/85.
  Ghi chú trung thực: THỨ TỰ chặn-trước-quét không ghim được bằng outcome test (mutation đổi
  thứ tự cho cùng kết quả) — điểm này dựa trên xác nhận tĩnh của audit vòng 2.

---

## Log — 2026-09-03, `claude-dashboard` · README+AGENTS của gói này là bản chép từ gói ChatGPT

**Vì sao tới đây:** bảng trạng thái hiện **chữ sai tên extension** cho Đức đọc. Truy ra `README.md` mở đầu bằng "# Duc Auto ChatGPT V0.3" và mô tả ChatGPT. 27 dòng README ghi "ChatGPT" trong khi gói này chạy trên `gemini.google.com`. `AGENTS.md` — **file AI đọc đầu tiên mỗi phiên** — cũng mang tiêu đề "Duc Auto ChatGPT".

**Cách sửa: từng chỗ một, mỗi chỗ một bằng chứng.** Không find-replace. Tên ← `manifest.json` · tên miền ← `content.js` + `sidepanel.js` · tên script ← `scripts/` · đường dẫn pairing ← đọc thẳng dòng 25–26 của chính script cài.

**Chỗ nặng nhất:** README ghi `output_folder` mặc định là `Duc Auto ChatGPT`, còn mã nguồn ghi `Duc Auto Gemini` (đo 4 chỗ). Đức đọc README rồi đi tìm thư mục tải về là **tìm sai chỗ**.

**Ba chỗ tôi TƯỞNG sai nhưng ĐÚNG, giữ nguyên:** `templates/Duc-Auto-ChatGPT-Template.xlsx` và `pilot-04/Duc-Auto-ChatGPT-Pilot-04.xlsx` **có thật** trong gói này; hai khối prompt `#01`/`#02` cuối `AGENTS.md` là **bản ghi lịch sử** của dự án ChatGPT. Find-replace mù sẽ làm sai chính ba câu đang đúng — đã dán nhãn tại chỗ thay vì sửa.

**PHÁT HIỆN NGOÀI DỰ TÍNH, và nó là cái đáng giá nhất của phiên này.** Sửa tài liệu làm ĐỎ `tests/bridge-migration-closure-smoke.mjs`: test đó ghim README phải nhắc `Uninstall-DucAutoChatGPTLoopbackBridgeV1`. Trước khi sửa test, đo hai script:

| Script | Cổng | Gốc cài |
|---|---|---|
| `Install-DucAutoGeminiBridgeV1.ps1` | **32148** | `C:\WORKING ZONE\Chrome Extension Bridge\duc-auto-gemini` |
| `Install-DucAutoChatGPTLoopbackBridgeV1.ps1` | **32147** | `%LOCALAPPDATA%\DucAutoChatGPT\BridgeV1` |

Gói ChatGPT **thật** cũng dùng 32147. Nên bản ChatGPT nằm trong gói này là **đồ thừa lúc fork**, và chạy nó là **đâm cổng** với Bridge của gói ChatGPT. Triệu chứng sẽ là "nối mãi không được", không phải một lỗi rõ ràng.

Nên test đang ghim **tên cũ đã sai**, không phải tôi làm hỏng nó. Sửa test theo hướng **mạnh hơn**, không nới: giữ nguyên ý đồ (README phải khai lệnh xoá), đổi tên script cho đúng gói, **và thêm một khẳng định mới** — README gói này KHÔNG được chỉ Đức chạy script của gói ChatGPT. Bản cũ chỉ đòi README nhắc một tên script nào đó, nên nó vẫn xanh khi README dẫn Đức chạy đúng cái script gây đâm cổng. Đột biến: trả README về tên cũ → bắt được.

**Còn mở:** `G-12` soát nốt README từ mục cài đặt trở xuống · `G-13` xoá hai script ChatGPT thừa trong `scripts/` — **cần Đức chốt**, luật gốc không cho xoá file khi chưa hỏi. Sổ nợ gói này 11 → 13.

**Suite gói này:** 85 passed, 0 failed sau khi sửa (trước đó 84/1).

### Tiếp — Đức chốt xoá hai script thừa (03/09)

Đã xoá `scripts/Install-DucAutoChatGPTLoopbackBridgeV1.ps1` và `Uninstall-DucAutoChatGPTLoopbackBridgeV1.ps1`. `G-13` đóng.

**Không xoá thẳng, và đây là lý do.** `tests/bridge-install-static.mjs` ghim **mười lăm tính chất an toàn** của script cài — siết ACL, không ghi registry, không bao giờ in token, hành vi `-KeepPairing` — và chúng ghim vào **bộ ChatGPT**. Xoá thẳng là mất trắng mười lăm lớp bảo vệ, luật vàng 3 cấm.

Nên chuyển chỗ ghim sang bộ Gemini **trước**, rồi chạy thử: **bộ Gemini chịu được cả mười lăm**. Xoá xong suite vẫn 85/0.

Điều đáng ghi hơn cả việc xoá: mười lăm lớp bảo vệ đó **trước đây kiểm trên một file không ai nên chạy**, còn script thật thì không ai kiểm. Nay chúng ghim vào script đang dùng — mạnh hơn trước, không phải nới lỏng. Kèm phép ghim chặn hai file mọc lại (đột biến: mang một file về → bắt được).

---

## Log — 2026-09-04, `claude-exec-g02b` · G-02 khoá tab và khoá hội thoại

**Kế thừa việc dở của một phiên đã chết.** Phiên `claude-exec-g02` bắt đầu G-02 rồi chết giữa
chừng (stall watchdog), để lại `tab-lock-core.js` (103 dòng, chưa commit) và một patch
`sidepanel.js`. Đức chốt giữ việc dở. **Tôi đọc rồi GIỮ, không viết lại** — logic của nó đúng,
và ba chỗ nó tách khỏi bản ChatGPT đều có lý do đúng (xem bảng trong `BACKLOG.md` mục G-02).

**Nhưng nó mới xong một nửa, và nửa thiếu làm extension chết hẳn.** Hai lỗ, cùng một loại:

1. `tab-lock-core.js` **không có thẻ `<script>` trong `sidepanel.html`**. Hậu quả không phải
   "khoá tab không chạy" — mà là `window.DacTabLockCore` undefined, nên `activeTab()` ném
   TypeError ở **mọi** lần gửi. Không gửi được job nào.
2. `bindRunTab()` và `releaseRunTab()` được **định nghĩa nhưng không chỗ nào gọi**. Nên
   `boundTabId` vĩnh viễn null, `resolveBoundTab` luôn rơi về nhánh "chưa khoá", và cái khoá
   không tồn tại.

Bài học đáng ghi: **core đúng mà không ai gọi thì bằng không có**, và không test nào trong gói
này bắt được điều đó — vì test cũ chỉ soi hành vi của core. Nên nửa WIRING của test mới
(`tests/tab-lock-behavior.mjs`, mục 12–16) tồn tại đúng để bắt loại lỗi này.

**Đã nối:** thẻ script trước `sidepanel.js` · `bindRunTab()` trong `run()` **trước**
`authoritativeValidate` (validate có await, và đó đúng là khoảng người vận hành hay đổi tab sau
khi bấm Run) · `releaseRunTab()` trên **cả ba** đường thoát (validate hỏng · hàng đợi rỗng ·
`finally`). Gỡ `boundTabUrl` và tham số `preferredTab` — không ai đọc chúng.

**Chỉ MỘT chỗ khoá, khác nhánh ChatGPT (hai chỗ):** `bridgeRunTrial` của Gemini gọi thẳng
`run("selected")`, cùng đường với nút của người vận hành, không có runner thứ hai. Đã ghim để
không ai "port cho đủ" bằng cách dán thêm một lần khoá nữa.

**Test: 17 khẳng định. Đột biến vòng 1: 10/15 bắt được — báo số thật.** Bốn lượt "SKIP" là lỗi
của script đột biến chứ không phải của test (`git checkout` trả file về CRLF nên mọi mẫu có
`\n` bị trượt từ lần restore đầu tiên). **Một lượt THOÁT THẬT:** thay `isProviderUrl` bằng phép
kiểm origin trần vẫn xanh, vì ca "tab trôi sang `/settings`" có `boundConversationId` đã đặt
nên phép kiểm hội thoại cũng chặn được. Thêm ca chạy với `boundConversationId = null` (run bắt
đầu ở `/images`) — khi đó `isProviderUrl` là lớp **duy nhất** còn lại. Vòng 2: **15/15**.

**Một test cũ đỏ theo, và nó đỏ ĐÚNG:** `tests/provider-adapter-static.mjs` đếm số chỗ ủy
quyền `DacProviderAdapter.isProviderUrl` và đòi đúng 2; nay có 3 vì `activeTab()` bơm predicate
vào core. Không nới: hai dòng `doesNotMatch` (cấm tự chế regex origin — đó mới là lớp bảo vệ
thật) giữ nguyên, con số lên 3 kèm **tên ba chỗ** để lần sau nó thôi là số ma, và **thêm một
khẳng định mới** ghim đúng hình dạng của chỗ bơm vào.

**Suite gói này: 86 passed, 0 failed** (85 → 86, thêm `tab-lock-behavior.mjs`).

**CẦN ĐỨC LÀM — chưa đóng được G-02 nếu thiếu:** reload extension ở `chrome://extensions`
(có sửa `.js` và `.html`), rồi chạy một run và **giữa chừng bấm sang tab khác** — prompt phải
vẫn đi vào tab đã khoá. Đổi hội thoại hoặc đóng tab thì phải dừng cứng `RECEIVER_LOST`, không
thử lại. Chưa chạy live lần nào: luật mục 2 bắt hỏi Đức trước.

**Còn mở:** nợ nhỏ đã cân và ghi trong `BACKLOG.md` mục G-02 — thông điệp lỗi vẫn nhúng
*origin*, nên một origin chứa chữ bẫy vẫn lái được nhãn lỗi. Bịt hẳn thì phải sửa
`runner-core.classifyFailure()` cho mọi loại lỗi, ngoài phạm vi G-02.

---

## Log — 2026-09-05, `claude-gemini-no` · G-09 `npm test` ở gốc repo không chạy suite Gemini

**Đo trước khi sửa, vì "xanh giả" phải chứng minh bằng số.** `npm test` ở gốc chạy **120 trong
321 file test — 37%**: 107 file của gói ChatGPT, cộng 13 file test gốc dưới `tests/`. Ba suite
worker còn lại **không chạy một dòng nào**: `duc-auto-gemini/v0.1.0` (19 file),
`duc-auto-gemini/v0.2.0` (**86 file — của gói này**), `duc-auto-gg-flow-video/v0.1.0` (96 file).

Chạy riêng cả ba thì **cả ba đã xanh sẵn** (19/0 · 86/0 · 96/0). Nên đây
không phải nợ sửa code — nó thuần là **lỗ phủ**: bảng báo xanh mà chưa mở tới hai phần ba số
file. Ai chỉ chạy `npm test` sẽ tin nhầm.

**Gốc bệnh không phải "quên Gemini".** Danh sách suite trong `scripts.test` được **gõ tay**, gọi
đích danh đúng một worker. Thêm worker mới là nó lại lọt ra ngoài, im lặng, y hệt lần này —
và repo này đã có ba worker rồi. Nên vá hai lớp, không vá một:

1. `scripts.test` nay gọi **cả bốn** suite worker (thêm 30 giây vào một lượt `npm test`).
2. Phép ghim mới `tests/root-suite-covers-workers-static.mjs` — 3 khẳng định. Nó **không** giữ
   một danh sách thứ hai: nó đọc hình dạng repo từ `.repo-structure.json` qua
   `unitsFrom`/`unitDirsUnder` của `scripts/repo-structure.mjs`, rồi đòi **mọi** thư mục đơn vị
   có `tests/run-all.mjs` phải có tên trong `scripts.test`. Đỏ thì in ra đúng dòng cần dán vào.

**Cố ý dùng lại `repo-structure.mjs` chứ không tự chế `^workers/`** — repo này đã trả giá một
lần vì ba script cùng "biết" hình dạng repo bằng ba đoạn code chép tay, và hai trong ba đã lệch
nhau thật (26/08).

**Đột biến kiểm: 3/3 bắt được.** ① bỏ dòng gg-flow-video khỏi `scripts.test` → đỏ. ② bỏ dòng
gemini v0.2.0 → đỏ. ③ dựng một thư mục worker mới có `tests/run-all.mjs` mà không nối → đỏ.
Khôi phục xong xanh lại cả ba khẳng định.

**Suite gói này: 86 → 87 file.** `npm test` ở gốc: **120/321 (37%) → 322/322 (100%), exit 0**
— số lấy thẳng từ dòng tổng của chính lượt chạy (107 · 19 · 87 · 96 · 13), không tự đếm.
(Bản đo đầu phiên ghi 117/318; ba lane khác thêm test trong ngày nên đã đo lại lúc commit.)

**Một chỗ phải nói thẳng, không giấu: phép ghim này ĐANG Ở SAI NHÀ.** Chỗ đúng của nó là
`tests/` gốc. Lúc vá, khoá `_code` do phiên `claude-moc-da-xong` giữ, và luật mục 1 cấm ghi vào
vùng người khác — nên nó tạm trú trong gói Gemini. Hệ quả đã cân: nếu ai xoá đúng dòng gọi suite
**Gemini** khỏi `scripts.test` thì `npm test` không chạy tới file này nữa nên không bắt được.
Cổng đóng phiên vẫn bắt (`session-check` gọi thẳng `run-all.mjs` của gói, không đi qua
`scripts.test`), và ba dòng còn lại thì `npm test` bắt ngay. Đã ghi nợ vào `BACKLOG.md` mục G-09.

**Còn mở:** G-01 (trial live sau khi Đức reload — luật mục 2 bắt hỏi Đức trước) và G-10 (ba
guard lớp hai chưa có phép ghim) chưa động tới trong lượt này.

---

## Log — 2026-09-06, `claude-gemini-b` · G-10 ghim ba guard lớp hai + G-11 ghi sai dấu đóng

**Việc 1 — `G-11` bị đếm là còn mở dù đã đóng từ 28/08.** Tiêu đề viết
`Đo live bản trần 5 giây — **ĐÓNG 28/08** ✅`, tức dấu đóng nằm **giữa câu**. Đọc thẳng `isDone`
và `debtByUnit` trong `scripts/build-overview.mjs` (chỉ ĐỌC — `scripts/` là vùng `_code` của
phiên khác): dấu đóng chỉ tính khi nó là chữ **đầu tiên** của tiêu đề, hoặc khi tiêu đề bị
`~~gạch ngang~~`. Luật đó cố ý lệch về phía **báo thừa** nợ, nên không đụng vào nó — sửa chỗ ghi.
Tiêu đề nay là `**ĐÓNG 28/08** ✅ — Đo live bản trần 5 giây`, mọi chữ giải thích giữ nguyên.

**Nợ gói Gemini: 11 → 10.** (Rồi 10 → **9** sau khi đóng G-10 ở việc 2.) Một chỗ đáng ghi để
phiên sau khỏi hoang mang: `debtByUnit` đọc qua `git show HEAD:<path>`, **không đọc thư mục làm
việc** — nên con số chỉ nhúc nhích sau khi commit. Lúc chưa commit thì đo bằng cách đếm tiêu đề
`OPEN` trực tiếp; hai cách cho cùng một số.

**Không đụng `G-02`** — nó trông như đã đóng (`ĐÃ VÁ TĨNH 2026-09-04`) nhưng là việc **mở thật**,
đang chờ Đức reload extension để nghiệm thu. Bộ đếm hiện vẫn tính nó là mở, và như thế là đúng.

**Việc 2 — `G-10`: ba guard lớp hai của `bridge-transport-loopback.js` nay có phép ghim.**
Ba guard: (a) `|| reconnectTimer` trong guard sớm của `scheduleReconnect` (dòng 215),
(b) `if (socket !== targetSocket) return;` trong callback hạn chờ ACK (dòng 178),
(c) `if (sequence !== statusSequence) return;` trong `publishStatus` (dòng 124).

**Kiểm chứng lại lời phiên trước thay vì tin luôn (luật vàng 4).** Phiên trước nói cả ba
"không còn đường nào tới được" nên test hành vi là bất khả. Đo thật: đem đúng ba đột biến đó
chạy với `tests/bridge-transport-liveness-smoke.mjs` — suite **hành vi xanh cả 3/3**. Vậy lời
đó đúng, và nó là **số đo**, không phải suy đoán. Đó là căn cứ để ghim ở **mức nguồn**.

Phép ghim mới: `tests/bridge-transport-depth-guards-static.mjs`, 4 khẳng định. Nó cắt thân từng
hàm bằng **đếm ngoặc** (thứ tự khai báo đổi được, cặp ngoặc thì không), rồi soi bằng `indexOf`
chuỗi nguyên văn — **không một regex nào**. Lý do rất cụ thể, cả hai bẫy đều đã trả giá ở repo
này: `\b` không khớp cạnh chữ tiếng Việt, và file này là **CRLF** nên neo `^`/`$` báo "không
khớp" trông y hệt "không có gì để sửa". Ba guard được ghim cả **sự tồn tại** lẫn **vị trí**
(kiểm danh tính phải đứng TRƯỚC `abandonSocket`; phép kiểm bản cũ phải nằm TRONG hàng đợi và
TRƯỚC lượt ghi storage) — guard đúng chữ mà sai chỗ thì bằng không có.

**Và một khẳng định thứ tư, đề phòng đúng cái bẫy mà bộ đo đột biến hay mắc:** file **đếm số
neo khớp** và đòi đúng 12. Neo trượt hết thì số về 0, và một lượt chạy 0 neo mà vẫn xanh đọc
gần y hệt một lượt xanh thật.

**Đột biến kiểm: 3/3 đỏ.** Xoá `|| reconnectTimer` → đỏ. Xoá dòng guard (b) → đỏ. Xoá dòng
guard (c) → đỏ. Mỗi lượt khôi phục lại từ bản sao ngoài repo (không dùng `git checkout` — nó sẽ
cuốn theo việc chưa commit), và `git diff` của file sau cùng **rỗng**. Bộ đo đột biến tự nó
cũng có chốt: nếu chuỗi cần sửa khớp **khác 1 dòng** thì nó **dừng hẳn**, không sửa bừa — chốt
này đã nổ thật một lần, vì chuỗi guard (b) xuất hiện ở **hai** hàm khác nhau; phải khoanh theo
tên hàm mới đúng chỗ.

**Suite gói này: 87 → 88 file, 88 passed / 0 failed.**

**Không đụng gì ngoài gói này** — `scripts/` chỉ đọc, không sửa; không sinh lại artifact máy
(phiên điều phối giữ `_root` và sẽ sinh một lượt cho cả ba lane).

**Còn mở:** G-01 (cần trial live sau khi Đức reload — luật mục 2 bắt hỏi Đức trước) và G-02
(chờ Đức reload extension để nghiệm thu khoá tab / khoá hội thoại).

