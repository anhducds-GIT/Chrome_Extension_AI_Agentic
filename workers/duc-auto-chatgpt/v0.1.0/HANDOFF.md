# Coordinator / Auditor handoff

Roles, golden rules, and the #01/#02 templates below now live in [AGENTS.md](AGENTS.md) as the canonical copy — this file keeps them here too so existing links don't break, but AGENTS.md is authoritative if they ever diverge. See also [decisions.md](decisions.md) for major decisions extracted from the Log below.

## #01 — Claude Coordinator review

```text
#01

PROJECT: Duc Auto ChatGPT V0
ROLE: Claude = Coordinator / Architecture Reviewer
IMPLEMENTER: GPT Web
CODE PACKAGE: duc-auto-chatgpt-v0

SCOPE LOCK:
- Chrome Manifest V3 personal extension
- local-only Text Batch Automation on chatgpt.com
- no separate login
- no backend/server
- no extension quota
- no image/file automation
- no multi-tab concurrency
- no bypass of ChatGPT/account limits
- clean-room implementation; do not copy proprietary extension source

TASK:
1. Read README.md, AUDIT.md, manifest.json, background.js, sidepanel.js, content.js.
2. Audit architecture and state machine before proposing changes.
3. Focus on DOM robustness, queue sequencing, stop/pause semantics, Chrome MV3 permissions, and failure recovery.
4. Identify only material issues for V0. Do not expand scope.
5. Return PASS / CONDITIONAL PASS / FAIL with ranked findings.
6. For each blocking finding, provide an exact acceptance criterion for GPT Web to repair.

GUARDRAIL:
Do not implement code unless explicitly authorized. Coordinator/auditor only.
```

## #02 — Codex code audit

```text
#02

PROJECT: Duc Auto ChatGPT V0
ROLE: Codex = Independent Code Auditor
IMPLEMENTER: GPT Web

AUDIT TARGET:
- manifest.json
- background.js
- sidepanel.html
- sidepanel.css
- sidepanel.js
- content.js

V0 CONTRACT:
Sequential text prompts only. Side Panel -> content script -> ChatGPT DOM -> wait for completion -> next prompt.
No server, no login, no quota logic, no image/file automation, no concurrency, no paywall/rate-limit bypass.

AUDIT:
1. Static correctness / JS errors.
2. MV3/API correctness and least-privilege permissions.
3. Race conditions in Start/Pause/Stop and message passing.
4. Duplicate-send risk.
5. False completion / timeout risk.
6. Composer input compatibility (textarea/contenteditable/ProseMirror).
7. Persistence behavior if side panel closes/reopens.
8. Security/privacy: confirm no external network/exfiltration.

OUTPUT:
RESULT: PASS | CONDITIONAL PASS | FAIL
BLOCKERS: numbered list
NON_BLOCKERS: max 5
REPAIR_INSTRUCTIONS: exact and bounded
TESTS_REQUIRED: concrete manual/static checks

Do not rewrite the extension wholesale. Preserve V0 scope.
```

## Log

<!-- HANDOFF-CUT-POINTER: ADR-0008 -->
> **Lịch sử cũ hơn đã dời sang [`HANDOFF-ARCHIVE-01.md`](HANDOFF-ARCHIVE-01.md)** — cùng thư mục
> này, nguyên văn, không mất chữ nào. Cắt 2026-09-06 theo ADR-0008 (phiên `claude-handoff-cat`):
> file này giữ **20 mục cuối theo vị trí trong file**, 124 mục trước đó nằm ở file lưu trữ.
> Cần đào lịch sử xa hơn thì mở file đó; ghi Log mới thì vẫn ghi vào cuối file này.
<!-- /HANDOFF-CUT-POINTER -->

- 2026-09-02 (tiếp) · Claude (`claude-stabilizing-bridge`) · **Cửa sổ bỏ cuộc nay trừ cả kỳ thử và hạn chờ ACK — áp cho cả ba nhánh cùng lúc.**
  - Audit khi port sang `duc-auto-gg-flow-video` chỉ ra: host **xác thực xong rồi im lặng** lặp một
    chu kỳ ~30 giây (kỳ thử + hạn chờ ACK) nhưng chỉ bị trừ độ trễ reconnect, nên cửa sổ 2 phút
    kéo ra nhiều phút và giữ service worker thức. Nay chu kỳ đó tự trừ vào ngân sách, giống hạn
    bắt tay đã làm.
  - **Phép trừ là cận trên, không phải đồng hồ thật** — ghi rõ trong code. Sau một ACK về muộn,
    chu kỳ kế bị trừ trọn một kỳ dù thực tế trôi ít hơn; lệch về phía **bỏ cuộc sớm hơn**, tức
    phía tiết kiệm pin. Auditor nêu, tôi chấp nhận có chủ đích.
  - Sửa **một dòng** ở nhánh này, giữ ba nhánh không lệch nhau. Phép ghim đặt ở `gg-flow-video`
    (nơi phát hiện ra). Suite nhánh này vẫn xanh toàn bộ.

## 2026-09-02 — `claude-surface-fix`: vá lỗ hổng surface (Đức giao gói)

**Làm gì.** Đức nêu: chạy từ trang chủ `chatgpt.com/` thì hỏng. Sổ tay ghi **sai** nguyên nhân;
đọc code thì là hai lỗi tầm thường hơn — `surface()` trả `CONVERSATION` cho **mọi** url
chatgpt.com kể cả trang chủ, và `surfaceAllowed` được gọi đúng **một** chỗ (dòng in ra của
`dom_probe`), tức có luật mà không nối dây. Đây là lỗ hổng **ngang hàng**: cả `gemini` lẫn
`gg-flow-video` đã nối dây này từ 25/08, nhánh này là cái duy nhất còn hở. Vá bằng cách **port,
không sáng chế**: chỉ `/c/<id>` và `/g/<gpt>/c/<id>` là hội thoại, còn lại `LAUNCHER`, và ném
`WRONG_SURFACE` **trước tác dụng phụ đầu tiên**.

**Kết quả.** Suite **98/98**; đột biến 8 lượt, 1 thoát rồi được vá. Phát hiện đáng giá nhất:
**suite đang ghim chính cái lỗi** — có sẵn dòng khẳng định `surfaceAllowed("https://chatgpt.com/")`
là `true`. Lỗi sống dai không phải vì không ai kiểm, mà vì phép kiểm khẳng định hành vi sai. Đo
live sau khi Đức reload cho thấy **vòng 1 chưa đủ**: `ping` vẫn trả `READY` ở trang chủ vì đường
của `ping` không đi qua chỗ vừa nối. Vòng 2 vá ba mắt xích còn thiếu, trong đó mắt quan trọng
nhất là **luật phân loại** trong `runner-core.js` — thiếu nó thì `WRONG_SURFACE` rơi xuống
`OTHER`, mà `OTHER` **được retry**, nên khai "hard stop" thành vô nghĩa.

**Còn mở.** **Chưa nghiệm thu live vòng 2** — cần Đức reload extension rồi F5 tab; nghiệm thu
không tốn credit: để tab ở trang chủ, `ping` phải trả `failure_type: WRONG_SURFACE` thay vì
`READY`. Mọi đường dẫn chatgpt.com **ngoài** `/c/` bị xếp `LAUNCHER` là mức **[DÒ]**, chưa đo —
gặp dạng hội thoại không có `/c/` thì nới **kèm probe chứng minh**. Bài học lặp lại ba lần trong
một phiên: khai một luật ở một chỗ rồi tưởng là xong; `ping`, `runPrompt`, `dom_probe` là ba
đường khác nhau và không dùng chung mã.

> Bản dài nguyên văn: [`HANDOFF-ARCHIVE-02.md`](HANDOFF-ARCHIVE-02.md).

---

## 2026-09-02 · phiên `claude-y02-probe-article` — `dom_probe` thôi mù chữ trên trang

**Mục này gộp nhiều lượt của nhiều phiên**; dưới đây chỉ là **trạng thái**.

**Còn mở.**
- `B-36` **P1** — chẩn đoán **đã lật**: determiner có khớp và có gọi `suggest({filename})`
  (`{patched: 'function', tickets: []}`) mà **Chrome bỏ qua** đề xuất, nên lỗi **không** nằm
  trong logic khớp của extension. Việc kế là **một phép đo đọc-thuần**: tạo blob **ngay trong
  service worker** rồi xem tên có dính — **không vá tiếp trước khi có con số đó**. Đi vòng được:
  chọn thư mục đích trong Side Panel thì đường ghi không qua Chrome Downloads.
- `B-33` — ba nhánh kia có cùng lỗi selector chết không. Chưa soi.
- `B-34` (gom control queue) · `B-35` (N run đồng thời, cần brief + audit riêng). Thứ tự Đức
  chốt: pilot GPT ổn trước, rồi mới migrate Gemini/Flow.
- **Phiên theo tab (ADR-0046) bước 1 ĐÓNG BĂNG** sau 6 vòng audit (GPT chốt PASS). Việc kế là
  **pilot vận hành thật — phải Đức duyệt trước**. Theo dõi một flake:
  `bridge-multiprofile-transport-async-smoke` đỏ **một** lần dưới tải, 8 lượt sau xanh.
- `chat.read` nắp tổ hợp · `B-22` · `B-23` · `B-16` — đã vá, chỉ thiếu nghiệm thu live.
  `B-07` · `B-27` vẫn mở thật.

**Cần Đức.** **Reload extension** ở `chrome://extensions` — reload **tab là không đủ**. Ba phép
nghiệm thu **không tốn credit**: `B-22` bấm Stop ngay trước khi job đầu được gửi (phải ghi
`STOP_REQUESTED_BEFORE_SUBMIT` mà **không** có `PROMPT_SUBMITTED`) · `B-23` sửa một chữ trong ô
câu trả lời của Result XLSX, giữ nguyên số ký tự, nạp lại làm ledger resume rồi Check Plan (phải
thấy `RESUME_RESPONSE_HASH_MISMATCH`) · `B-16` gọi `jobs.add` với token ảnh chưa nạp (phải thấy
`VALIDATION_FAILED`, không phải `INTERNAL_ERROR`).

**Ba cái bẫy.** ⑴ Ghế Bridge **bám tab**, run **bám hội thoại** — thiết kế đã chốt (ADR-0046).
⑵ Đường **gửi** đã có: `jobs.add` → `run.trial` → `chat.read` — không cần XLSX, không cần
`chat.send`; trần 90 giây đủ (đo 41s · 49s), cooldown 5 phút giữa hai trial là thật.
⑶ `matched` trong `dom_probe` **không phải** số lượt — đếm lượt thì đọc `assistantCount`.

> Bản dài nguyên văn: [`HANDOFF-ARCHIVE-02.md`](HANDOFF-ARCHIVE-02.md).


## 2026-09-06 — `claude-dau-worker`: đặt dấu @Đức cho khối "Cần Đức" trên bảng

Lượt 2 của đề bài `BANG-CAN-DUC-01`. Khối "Cần Đức" trên bảng nay **suy từ một dấu đặt ngay
trên dòng của mục** (`@Đức:bấm` / `@Đức:chốt`), không đọc trường `human_action` nữa. Chưa có
dấu thì mục không lên bảng, nên lượt này chỉ đi điền dấu — **không sửa code, không sửa hành vi**.

**Đã đánh dấu trong gói này:** B-09 (bấm) · B-36 (bấm) · B-17 (chốt) · B-27 (chốt).

- B-36: nghiệm thu live 04/09 ĐÃ CHẠY và THẤT BẠI, nên dấu không đặt cho "chạy nghiệm thu" mà cho phép đo trong console service worker — đó mới là thứ đang chờ Đức. Tiêu đề mục B-36 vẫn ghi "CHỜ NGHIỆM THU LIVE", đã lạc hậu; để nguyên vì sửa văn mục là việc khác.
- B-19 đã đóng 06/09 nên KHÔNG đánh dấu.

**Kiểm chứng:** sinh lại bảng, khối "Cần Đức" đếm **10 việc · 6 bấm · 4 chốt** trên cả ba gói —
khớp đúng 10 dấu đã đặt. Đóng mục thì dấu mất theo, không phải nhớ đi xoá.

**Còn mở:** không đụng `scripts/`, `docs/`, `HANDOFF.md` gốc repo; không sinh lại artifact máy.

## 2026-09-06 — `claude-don-so`: `B-36` — tiêu đề nói "chờ nghiệm thu", nghiệm thu đã chạy và đã hỏng

**Làm gì.** Không sửa một dòng mã nào — lượt này chỉ làm cho sổ khớp sự thật. Tiêu đề `B-36` ghi
*"ĐÃ VÁ 2026-09-04, CHỜ NGHIỆM THU LIVE"*, nên đọc lướt là tưởng chưa ai thử; thực tế nghiệm thu
**đã chạy đúng ngày 04/09 và THẤT BẠI**, rồi một phép đo trong console cùng ngày còn **lật ngược
chẩn đoán**. Thân mục ghi đủ cả hai chuyện; chỉ tiêu đề lạc hậu — mà tiêu đề là thứ duy nhất lọt
lên bảng. Đã viết lại tiêu đề cho khớp cả bốn sự kiện và thêm một khối "đọc một dòng cho nhanh",
**giữ nguyên toàn bộ thân mục** kể cả hai giả thuyết đã bị bác.

**Kết quả.** Nợ gói ChatGPT giữ nguyên **22** (không đóng mục nào), đo bằng chính `debtByUnit`.
Thêm `B-36` vào ô `current_focus` của `STATUS.md` — ô đó liệt kê việc còn mở mà **thiếu hẳn**
đúng cái mục P1 chặn mọi mutation Bridge, nên gói trông nhẹ hơn thực tế. Dấu `@Đức` của `B-36`
giữ nguyên loại **BẤM**: nó đặt cho *phép đo trong console service worker*, không cho lượt nghiệm
thu đã chạy xong.

**Còn mở.** `B-36` vẫn **mở, vẫn P1**. Bản vá được **giữ lại** vì nó bịt hai đường mất tên thật
có trong mã, nhưng **đừng đọc nó thành đã sửa B-36**. Việc còn lại là một phép đo đọc-thuần, và
**không vá tiếp trước khi có con số đó**. `B-19` · `B-27` · `B-07` **trông giống đã đóng nhưng là
việc mở thật** — lượt `claude-gpt-b` ngày 06/09 đã soi, lượt này đọc lại và xác nhận, không lật.

> Bản dài nguyên văn: [`HANDOFF-ARCHIVE-02.md`](HANDOFF-ARCHIVE-02.md).

## 2026-09-06 — `claude-codex-ngan`: viết ngắn 3 mục nhật ký cũ, bản dài sang `HANDOFF-ARCHIVE-02.md`

**Làm gì.** Việc ④ của [`BRIEF-HANDOFF-TRAN-01`](../../../docs/briefs/BRIEF-HANDOFF-TRAN-01.md),
Đức duyệt ở ADR-0011 mục ⑶. Gọi Codex CLI rà từng mục vượt trần 2.600 byte rồi viết lại theo
hình dạng ở [`docs/protocols/HANDOFF.md`](../../../docs/protocols/HANDOFF.md) mục 1 (làm gì ·
kết quả số · còn gì mở), sau đó tôi tự đọc lại và biên tập cho mắt Đức đọc — bản Codex đúng
về dữ kiện nhưng đặc như sổ tay máy.

**Kết quả.** File này **57.123 → 12.321 byte**; 3 mục vượt trần → **0**, mục dài nhất còn **2.599**.
**Không mất một byte:** ghép phần thân của `HANDOFF-ARCHIVE-02.md` vào đúng chỗ 3 mục đó
dựng lại bản gốc **giống hệt từng byte** — SHA-256 `e068861a47229370b35148f3037af87a42484d0a11dfc444fd0c30dad5866764`, đã đo bằng máy chứ
không phải lời hứa. Mỏ neo khớp **3/3** mục, không lượt nào ra 0.

**Còn mở.** Không có gì của gói này. Hai việc còn lại của brief **không làm được trong lượt này**:
`HANDOFF.md` ở gốc repo (24 mục, dài nhất 6.325 byte) vì lane khác đang giữ `_root`; và gói
**GG Flow Video** — bản viết ngắn 4 mục **đã xong và đã kiểm** nhưng khoá của gói bị lane
`claude-flow-active` nhận mất lúc đang làm, nên tôi đã **trả vùng đó về HEAD** (luật mục 1: vùng
có chủ khác thì chỉ được đọc). Bản đã làm giữ ngoài repo, áp lại được bằng một lệnh — **cần Đức
chốt** ai giữ khoá đó.


## 2026-09-06 — `claude-hang-doi`: B-36 đo dứt điểm sau 8 tuần, B-27 đóng, protocol dọn rác

**Làm gì.** Ba phép đo 0 credit trên máy Đức (Đức dán vào console, tôi đọc kết quả) đóng lại chẩn
đoán `B-36`. Đóng `B-27` theo câu chốt của Đức. Dựng protocol dọn rác theo yêu cầu của Đức.

**Kết quả số.**

- **`B-36` — đo trực tiếp, không còn suy.** Phép đo quyết định đi bằng đường thật của mã
  (`DAC_DOWNLOAD_ARTIFACT`, có trồng phiếu): xin `B36-probe-ticket__audit.jsonl`, Chrome đặt
  `d31c629e-…`, nội dung **đúng nguyên vẹn 22 byte**. Nên **Chrome Downloads không đặt tên nổi
  artifact của gói**. Kết luận 04/09 chỉ suy từ phiếu-đã-bị-tiêu.
- Hai phép đo trước **không phân biệt được** — một bất khả (service worker MV3 không có
  `URL.createObjectURL`), một bị nhiễu vì không trồng phiếu. Lý do đầy đủ trong mục `B-36`.
- Đức chốt **(D) kèm (A)** → [ADR-0049](docs/adr/0049-luu-ben-thu-muc-da-cap-quyen-thay-cho-mac-dinh-downloads.md), đã khai vào `decisions.md`.
- **`B-27` đóng**, **không viết một dòng code nào** — đóng vì chưa từng xảy ra (trần 32.767 ký tự,
  câu trả lời thật 177–180). Nợ gói **22 → 21**, đo bằng predicate của chính bộ đếm.
- **`B-09` có protocol:** `scripts/don-rac-tai-xuong.mjs` + phép ghim **36 khẳng định** (gồm 3 lượt
  chạy công cụ thật vào thư mục tạm). Đo thật **39 file tên GUID / 170**: ① 16 chứng minh được ·
  ② 21 không chứng minh được chủ · ③ **đúng 2 được bảo vệ** — một `.pdf` và một `.jpg` **là file
  THẬT của Đức**. Thử phá **7/9**; hai lượt thoát tương đương hành vi, **lượt gộp thì ĐỎ**.

**Còn gì mở.**

- `B-36` **chưa vá**. Thứ tự: (A) trước, (D) sau, **đừng gộp**. (A) không được đọc thành đã sửa B-36.
- Phép đo còn nợ, 0 credit: đọc `expectedDownloadNames.size` sau một lượt tải → determiner **có nổ**
  hay **không nổ cho blob URL**. Không chặn việc; nếu "không nổ" thì cả cơ chế đó là mã chết.
- `B-09` chờ **tay Đức bấm xoá** — AI không tự xoá file. Công cụ mặc định chỉ xem.
- Ba bug bị bắt trước khi Đức chạy, cùng họ với bài học `B-36` (kiểm **tĩnh** không phân biệt được
  hai nhánh). Chi tiết ở mục `B-09`.

- 2026-09-07 · Claude (`claude-gpt-don-no`) · **Dọn 4 mục nợ: một phép kiểm không ghim gì, hai chỗ code chết, một câu lỗi sai ngôn ngữ.**
  - **N-14 (phần gói ChatGPT) — ĐÓNG.** Gói này có đúng cùng phép kiểm chết như gói Gemini: nửa hành vi của `tests/chatgpt-zoom-control-smoke.mjs` tự định nghĩa lại `isChatGPTUrl` / `simulateZoomSync` / `simulateSetZoom` ngay trong file test. Thay bằng `tests/zoom-control-smoke.mjs` — trích thân hàm thật từ `sidepanel.js` rồi chạy trong `node:vm`. **13/13 đột biến đỏ**, 0 mỏ neo hỏng. Cái bẫy N-14 dặn đã dính thật: 2 đột biến lọt lưới vòng đầu vì sân khấu thiếu ca "nút ĐANG BẬT rồi mới rời sang tab lạ". File chết **chưa xoá** — chờ Đức duyệt, đầu file đã ghi rõ.
  - **B-25 — ĐÓNG.** 9 câu lỗi trong `confirmRecreate()` + 5 câu `detail:` của `output-location-core.js` (đuôi của `OUTPUT_LOCATION:` nằm ở đó, dịch ở `sidepanel.js` là dịch hụt) nay tiếng Việt có dấu, mã lỗi giữ tiếng Anh.
  - **B-24 — ĐÓNG bằng đường thứ hai của chính mục đó** (chốt `RECONCILE_IMAGE_ONLY` đứng trước mọi tác dụng phụ), **không xoá hàm**: mục tự ghi xoá là quyền của Đức, và hàm đang bị hai phép ghim neo vào — `post-submit-no-resend-smoke.mjs` đếm cửa đối soát phải bằng đúng 1 (phép đo đứng sau ADR-0047) và `recreate-core-smoke.mjs` dùng tên hàm làm mỏ neo cắt đoạn.
  - **B-20 — ĐÓNG nửa "làm code nói thật", không gỡ nhánh alias.** Xác nhận alias chết bằng đọc code; sửa 3 dòng `README.md` + 1 dòng `DAC_XLSX_RUN_PLAN_V1.md`. Không gỡ vì logic khớp alias có **ba bản sao song song**, và gỡ cả ba là phải bỏ `DUPLICATE_ALIAS` — một trong sáu mã `bridge-plain-failure-classification-smoke.mjs` ghim cho B-16.
  - **B-21 — ĐÓNG.** Kiểm code trước khi sửa chữ: 0 nút cho Resolve Existing Output. Hợp đồng schema nay đánh dấu đường thứ hai là NOT WIRED.
  - **Số đo:** suite gói **114/114 xanh**. Ba phép ghim mới, **28/28 đột biến bị bắt** (13 + 7 + 8).
  - **Chờ Đức quyết:** ⑴ xoá `tests/chatgpt-zoom-control-smoke.mjs`; ⑵ xoá hẳn `resolveExistingOutput()` hay giữ kèm chốt; ⑶ alias — bỏ hẳn khỏi ba module hay nối thật một ô nhập.

<!-- HANDOFF-THANG: 2026-09 -->
