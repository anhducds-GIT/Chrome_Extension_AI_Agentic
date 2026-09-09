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

- 2026-09-07 · Claude (`claude-tran-900`) · **Trần `run.trial` lên 900 giây — Đức chốt (ADR-0015). `run.start` VẪN CẤM, không đổi một chữ. B-17 đóng.**
  - **Vì sao 900:** đó là `timeout` của chính workbook Pilot-08 Đức đang dùng thật, không phải số tròn chọn cho đẹp. Đo live 26/08: gửi → phát hiện ảnh mất 40s (1 ảnh) · 61s (2 ảnh) · **68s (4 ảnh)** với prompt *ngắn*; job thật là 4 ảnh + prompt 3.825 ký tự. Trần 90 giây không bảo vệ ai khỏi cái gì — nó chỉ đẩy đúng những job thật sang tay Đức.
  - **Vế thứ hai, quan trọng ngang vế thứ nhất:** `POLICY.prohibited_methods` nguyên vẹn. Công tắc Chế độ phát triển, nắp 30 job, cooldown 5 phút, sàn 15 giây: nguyên.
  - **Điều kiện ① — trần khai ở ĐÚNG MỘT CHỖ:** `LIMITS.trial_timeout_cap_sec` trong `bridge-core.js`. Trước lượt này con số 90 nằm rải ở **bốn** nơi (mặc định `capTrialTimeouts`, chỗ gọi ở `sidepanel.js`, trường audit, trường reservation). Nay cả bốn dẫn xuất; phép ghim **từ chối mọi chữ số** ở những chỗ đó.
  - **Điều kiện ② — ĐO TRƯỚC KHI XÂY: đường báo đã có sẵn.** `run.trial` vốn trả reservation ngay rồi chỉ sang `run.status`. Thiếu là **đồng hồ** — nó chỉ trả tên chặng, nên hai lần hỏi cách nhau 5 phút cùng trả "GENERATING" thì không phân biệt được đang-chạy với đã-treo. Vá bằng ba con số panel **vốn đã đếm** cho đồng hồ trên màn hình: `job_elapsed_sec` · `stage_elapsed_sec` · `stage_budget_sec`. Không cơ chế mới.
  - **Ghim:** `tests/trial-timeout-cap-adr0015-smoke.mjs` — canh **cả hai chiều** (900 nhận **và 901 từ chối**; thiếu vế sau là bỏ trần, không phải nới trần). Vế ② **không grep chữ**: cắt `elapsedSecSince` + `bridgeRunStatus` đã ship ra và **chạy** trong `node:vm`, đòi `stage_elapsed_sec` **bò lên**.
  - **Số đo:** suite gói **115/115 xanh**. **10/10 đột biến bị bắt**, gồm gỡ `run.start` khỏi danh sách cấm, đổi 900→200, gõ con số lại vào chỗ gọi, và "đồng hồ còn chữ mà số đứng yên".
  - **Trần tuyên bố: TĨNH + suite, CHƯA chạy live.** Nghiệm thu thật cần **Đức reload extension** ở `chrome://extensions` rồi chạy một trial với job dài hơn 90 giây.

- 2026-09-07 · Claude (`claude-b36-vaA`) · **B-36: vá cả (A) và (D) theo ADR-0049. Mục VẪN MỞ — chưa nghiệm thu live, và điều kiện đóng LÀ lượt live đó.**
  - **Một phép đo BÁC một câu trong bối cảnh ADR-0049.** ADR ghi *"không chỗ nào lưu handle vào IndexedDB"* — sai, `output-profile-core.js` lưu từ đầu. Nên **(D) nhỏ hơn ADR hình dung nhiều**: chỗ thiếu là `resolveOutputProfile()` cần `profile_id` từ config workbook, mà workbook bootstrap có config **rỗng**. ADR bất biến nên không sửa; đính chính + bài học ở mục `B-36` của `BACKLOG.md`.
  - **(A):** settings do máy dựng mang dấu `autoDefaulted`; đường ghi giữ sổ trong `state.auditEvents`. Luật quy trách nhiệm **không bị nới** — sổ vẫn ghi trước khi mutation có tác dụng, chỉ chậm ra file. Dây nhận `audit_durable: false` kèm câu tiếng Việt; luật vận hành ở `AI-OPERATOR-GUIDE.md`.
  - **(D):** nhận lại thư mục đã cấp quyền khi có **đúng MỘT** cái. Nhiều hơn một thì KHÔNG chọn hộ — chọn hộ là đem bằng chứng run này ghi vào hồ sơ run khác. Không nhận thì phiên vẫn chạy, vì (A) đỡ.
  - **Ghim:** `tests/b36-bootstrap-audit-held-smoke.mjs` — HÀNH VI, chạy `sidepanel.js` thật trong `node:vm`, stub download trả GUID **đúng như đã đo live**. Mười bất biến. `bridge-attention-static.mjs` phải viết lại **lần thứ hai** vì nó ghim cú pháp một dòng của chính chỗ phải sửa.
  - **Số đo:** suite **115/115** · thử phá **15/17**, hai con lọt đều tương đương hành vi và được ghi lại thay vì bày phép ghim giả. Thử phá còn lộ ra một dòng **mã chết** và một **lỗi thứ tự thật** — cả hai ở `BACKLOG.md`.
  - **KHÔNG sinh lại bảng:** cây làm việc đang mang việc chưa commit của lane Scouter, mà bộ sinh đọc STATUS ở cây làm việc. Để lane sau sinh.
  - **Trần tuyên bố: SUITE, CHƯA LIVE.** Đóng khi: Đức chọn một thư mục → đóng/mở panel → `jobs.add` qua Bridge → không có `audit_durable: false`, tên file đúng → **và số file tên-GUID trong `Downloads` KHÔNG TĂNG** (mốc 39). Bước cuối mới là bước chốt: 04/09 bốn bước trên đã xanh mà file rác vẫn tăng.
  - **Đẩy bằng `--carry`, và đây là tên hai lane bị cuốn theo** (ADR-0005 bắt kể tên): `claude-bang-vung-chac` (2 commit — `_code`, bộ sinh đối chiếu) và `claude-scouter-s06` (4 commit — gói Scouter). Tôi **không** thực hiện việc của họ và không biết họ đã xong chưa; commit của họ đã nằm sẵn trong nhánh lúc tôi đẩy.

<!-- HANDOFF-THANG: 2026-09 -->

## 2026-09-08 · `claude-ext-mobang` — gạch ba mã đã đóng mà chưa gạch

**Làm gì:** `B-29` · `B-16` · `B-18` tự khai `**ĐÃ ĐÓNG**` trong tiêu đề nhưng không gạch
`~~mã~~`, nên bản đồ việc ở gốc repo phải đoán và nó báo *"đã đóng nhưng KHÔNG gạch ngang"*
mỗi lượt chạy. Chỉ sửa **hình dạng tiêu đề**, không đổi một chữ nội dung nào.

**Vì sao tới hôm nay mới làm được:** gói này đang đóng băng, tức file cấm sửa. Đức mở băng
chiều 08/09 ([ADR-0024] ở gốc repo) nên cửa đã mở.

**Kết quả:** cảnh báo của bản đồ việc **4 mã → 1 mã**. Còn lại `G-14` ở gói `gemini` — lane
`claude-gemini-crlf` đang giữ khoá, không đụng. Suite gói xanh 115/115.

## 2026-09-08 · `claude-gpt-no-ky-thuat` — dọn nợ kỹ thuật: 22 → 12 mục mở, hai bản vá thật

**Làm gì.** Đức chốt "đóng hết nợ kỹ thuật trước". Ba việc mở băng trong bản giao việc **đã xong
từ trước** (ADR-0024 có thật, khối `frozen` rỗng, giới hạn ① đã ghi năm gói) — kiểm rồi bỏ qua.

**Kết quả số**, đo bằng chính `parseBacklog()`, không tin lời sổ:

- **Sổ nợ 22 → 12 mục mở.** Tám mục là sổ **nói thật trở lại**, không phải việc mới xong: mục
  `## Đã đóng` viết `- **2026-09-07** (B-25) — **ĐÓNG.**` mà bộ đếm chỉ nhận `- **ĐÓNG <mã>**`.
  Từng mục kiểm lại **bằng đọc mã**, không tin tiêu đề. Lý do đầy đủ của cả tám: `BACKLOG.md`,
  mục "Đóng bằng dòng ở cuối sổ".
- **`B-10` ĐÓNG bằng bản vá thật** — `run.status` thôi khai job của run trước khi đang rảnh.
  8/8 đột biến đỏ.
- **`B-28` ĐÓNG sau BA vòng audit độc lập** — nút "Tiếp tục" ăn ngay; cooldown thử lại thôi trôi.
  **Vòng 1 của tôi có một lỗi thật** (bell dùng chung rò rỉ ~240 reaction mỗi phút tạm dừng) **mà
  phép ghim vẫn xanh** vì nó so *danh tính* promise. 10/11 đỏ. Ba vòng ghi ở `BACKLOG.md`.
- **`B-14`/`B-15` xong nửa tài liệu, VẪN MỞ** — `provider-adapter.js` nay ghi `CHƯA TỪNG KHỚP`
  cạnh 7 selector chưa từng khớp trên trang thật. Phần nặng là phép đo DOM → cần Đức.

**Suite 117/117.** Lượt đầu báo 2 đỏ ở `bridge-multiprofile-transport-async` +
`bridge-profile-label-save`; chạy riêng hai lần đều xanh — con flake dưới tải đã ghi, lúc đó có
lane khác cùng ghi vào một cây git.

**Còn mở.** `B-08` là mục cuối AI làm được không cần Đức; chưa làm vì nó chạm 4 chỗ gọi trong
`content.js` và tôi không rút gọn một refactor ở cuối phiên. Chờ Đức: `B-36` (chặn MVP, cần lượt
live) · `B-09` · `B-15` · `B-20`. Cần brief riêng: `B-06` `B-07` `B-31` `B-33` `B-34` `B-35`.

**Trần tuyên bố cho cả hai bản vá: SUITE, CHƯA LIVE.** Ba phép nghiệm thu 0 credit ở `STATUS.md`.
Lượt commit đầu của phiên bị lane khác cuốn theo — ghi ở `BACKLOG.md` gốc repo, mục `N-40`.

## 2026-09-08 (tiếp) · `claude-gpt-no-ky-thuat` — nghiệm thu LIVE qua Bridge: (A) đạt, (D) hỏng

**Làm gì.** Đức nạp lại tiện ích và mở Bridge; tôi lái qua `bridge-cli`. Lượt chạy thật đầu tiên
của gói sau khi mở băng. Bảng số đầy đủ, bằng chứng từng dòng, và `đóng khi:` của mọi mục mới:
`BACKLOG.md`, mục "Nghiệm thu live 2026-09-08".

**Kết quả số.**

- **Sáu nợ nghiệm thu CŨ nay có bằng chứng live**, không phải việc hôm nay: chặn chạy từ trang chủ
  cả hai chiều (02/09) · trần `run.trial` 900 giây và đồng hồ tiến độ **bò lên** (07/09) ·
  `run.start` vẫn không có trong 23 lệnh · **B-10** (hôm nay) · **B-16** (06/09).
- **B-36: nửa (A) ĐẠT ở đúng chỗ 04/09 đã hỏng, nửa (D) HỎNG — mục VẪN MỞ.** Tệp tên-GUID trong
  `Downloads` **39 trước, 39 sau**, đo bốn lần, kể cả sau một lượt chạy đã tới cửa lưu rồi chết.
  Sau khi Đức chọn thư mục: `checkpoint.verified: true`, tên tệp đúng, `audit_durable` biến mất.
  (D) **không nhận lại** thư mục đã cấp quyền sau khi đóng/mở panel — Đức phải bấm lần hai.
- **Sổ nợ gói 12 → 15.** Ba mục mới đều sinh từ lượt chạy này: `B-37` (P1) · `B-38` (P1) ·
  `B-39` (P2). Nợ tăng, và đúng: việc của một lượt chạy thật là tìm ra chỗ hỏng.

**Còn mở.** `B-14`/`B-15` **chưa đo được lần thứ hai** — cửa sổ gắn ảnh quá sớm so với 1–2 giây bắt
tay CLI; **đừng đọc các con `0` trong `attachmentPreview` thành "selector chết"**, không có ảnh đang
gắn thì `0` là câu trả lời đúng. Đầu mối mới và một trần cứng (ảnh 2MB **không** qua Bridge được,
nắp 700KB mỗi ảnh) đều ghi ở `BACKLOG.md`.

**Tôi làm sai một chỗ, ghi ra để lượt sau không lặp.** `Q003` tiêu một lượt sinh mà không thu được
gì, và **lỗi là của tôi, không phải của mã**: tôi chạy job tạo ảnh trong hội thoại Đức đang mở, mà
hội thoại đó có chỉ thị riêng buộc trả lời ngắn — nên ChatGPT không tạo ảnh nào. Extension xử đúng
mọi bước và **không gửi lại**. Luật lượt sau: job ảnh chạy trong hội thoại **TRỐNG**, và đọc
`chat.read` **trước** khi chạy.

## 2026-09-08 (tiếp) · `claude-gpt-mvp-3fix` — vá ba chỗ chặn vòng CC ↔ GPT, và tìm ra chỗ thứ tư

**Làm gì.** Đức chốt "làm A": vá ba chỗ hở tìm ra ở lượt nghiệm thu live cùng ngày. Chi tiết từng
mục, lý do các lựa chọn **cố ý không làm**, và ba đường chọn của `B-40`: `BACKLOG.md`.

**Kết quả số.**

- **`B-38` ĐÓNG, nghiệm thu LIVE.** Lượt GHI qua CLI nay bắt buộc khai `--request-id`, câu chặn
  kèm khoá gợi ý tiền định. Nửa còn lại của điều kiện đóng **đã có sẵn** —
  `tests/bridge-core-smoke.mjs:143` ghim `handlerCalls === 1` cho cùng khoá; lớp replay của host
  chưa bao giờ hỏng, thứ hỏng là CLI không cho nó cơ hội khớp.
- **`B-37` và `B-39` ĐÓNG ở mức suite.** Câu báo *"chưa có thư mục"* tách thành **bốn** câu theo
  bốn nguyên nhân, kèm số hồ sơ đếm được. `run.status` nay trả `last_failure`.
- **Suite 117 → 119. Thử phá 15/15 đỏ, 0 mỏ neo hỏng.** Vòng đầu chỉ **10/15**, và cả 5 con thoát
  đều là **lỗ thật trong phép ghim của tôi**: kiểm hàm lá mà không kiểm **dây nối**. Bịt cả năm
  rồi chạy lại.
- **Sổ nợ gói 16 → 13.**

**Còn mở, cần Đức.** `B-40` (P1, mới) mới là chỗ thật sự chặn vòng tự chạy, và **không phải lỗi
trong mã**: tool tạo ảnh của ChatGPT lỗi tạm, ChatGPT nói rõ cách chữa **bằng chữ**, extension xếp
`POST_SUBMIT_UNCERTAIN` đúng ADR-0047 — vòng lặp dead-end trong khi `chat.read` đọc được câu chữa.
Đức tự gõ `render lại` thì ra kết quả đúng. Mục này **chạm ADR-0047 nên tôi không tự vá**; đề xuất
đường ⒜ (chỉ BÁO, không đổi luật retry).

**Cần Đức nạp lại tiện ích** để `B-37`/`B-39` được nghiệm thu live — lượt chạy 08/09 trả
`last_failure: null` vì tiện ích đang chạy mã cũ, đúng như phải vậy. `B-38` không cần: nó ở CLI,
đã chép sang thư mục Bridge và đã thử live.

**Hai lỗi của tôi trong buổi** (prompt gửi qua Bridge viết không dấu; ảnh mẫu là ảnh nhiễu
dựng để đo cửa sổ upload) khiến tôi **quy sai nguyên nhân hai lần** trước khi đo ra nguyên nhân
thật. Cả hai đã ghi đầy đủ ở `BACKLOG.md`, mục hai lượt đính chính.

## 2026-09-08 (tiếp) · `claude-gpt-chay-het-job` — ADR-0050 Accepted, thi hành mục ⒠

**Làm gì.** Đức đặt hướng: *"AI phải tương tác được mới là Assistant… phải chạy được đến hết Job,
trừ khi bị halt bởi Captcha"*, chốt hai case (loạt ảnh tự chủ · chat reasoning nhiều lượt), hạ nắp
chờ xuống 90 giây, và duyệt đường chat thẳng. Ghi thành
[ADR-0050](docs/adr/0050-chay-het-job-tru-ba-loai-dung-han.md), viết `Proposed` rồi đổi `Accepted`
ở lượt riêng (luật B12).

**Chỗ quan trọng nhất tìm ra khi đọc lại ADR-0047 — nó làm nhẹ hẳn phần việc.** Luật đó nguyên văn
là *"chỉ được gửi lại khi đối soát **khẳng định được** là lượt gửi đó không tạo ra kết quả nào"* —
**ngoại lệ đã nằm sẵn trong luật**, và nó thu về "chặn hẳn" chỉ vì lúc ấy đo ra **0 ca** khẳng định
được. Nên cho phép gửi lại khi nhà cung cấp TỰ nói nó không tạo được gì là **thi hành** ADR-0047,
không phải nới. Thứ thật sự cần quyết định mới chỉ là đổi nhóm năm hard stop.

**Một phát hiện làm bớt việc:** mục ⒜ của ADR-0050 **không cần làm gì** — `classifyFailure()` đã xếp
`captcha`, `unusual activity`, `security/interstitial` vào cùng `SECURITY_HARD_STOP`, và
`GENERATION_LIMIT_REACHED` vốn đã là hard stop. Ba loại Đức muốn dừng hẳn **đang dừng hẳn sẵn**.

**Kết quả số.** Thi hành **mục ⒠**: nắp chờ 5 phút → 90 giây. Suite **119 → 120**. Thử phá **5/5**.

**Bản ghim đầu của tôi chỉ TĨNH và cho 3/5** — hai con thoát là lỗ thật (gõ cứng số giây;
`if (false)` mở toang cửa chặn). Viết lại thành **hành vi**, chạy `bridgeRunTrial()` đã ship. Chi
tiết bảy mép ở dòng Bản đồ file của phép ghim.

**Còn mở, và đây là phần lớn nhất.** ADR-0050 mới thi hành **một trong năm mục**. Bốn mục còn
lại ghi thành `B-41` (P1, tự chữa để chạy hết job) và `B-42` (P1, đường chat thẳng cho case 2 —
**là quyền mới cho extension** nên phải hỏi Đức ở mức thiết kế trước khi viết mã). Ràng buộc kiến
trúc và điều kiện đóng của cả hai: `BACKLOG.md`.

**Sổ nợ gói 13 → 15.** Nợ tăng, và đúng: một quyết định đã chốt mà không ai ghi thành việc thì nó
nằm im.

## 2026-09-09 · `claude-gpt-chay-het-job` — B-41 ⑴: hai hard stop thành chữa được

**Làm gì.** Thi hành **mục ⒝** của [ADR-0050](docs/adr/0050-chay-het-job-tru-ba-loai-dung-han.md):
`RECEIVER_LOST` và `WRONG_SURFACE` thôi dừng hẳn, thành điều kiện chữa được. Chữa bằng **đúng một**
trong hai việc — F5 tab, hoặc đưa tab về hội thoại của chính run này — rồi trả về vòng chạy thử lại
từ cổng. Không mở tab mới, không tự chọn hội thoại.

**Cửa `mayRepair()` đứng TRƯỚC `canRetry()`, và không sửa vào trong nó.** `canRetry()` cùng
`submissionMayExist()` giữ nguyên từng chữ — chúng vẫn là chỗ duy nhất trả lời *"lượt gửi này có
thể đã bay chưa"*, và đảo-mặc-định của ADR-0047 còn nguyên. Nắp **3 lần theo TỪNG loại trong một
run**; hết nắp thì rơi về `INTERRUPTED` như trước.

**Hai chỗ đã ghi đầy đủ ở `BACKLOG.md`, đọc trước khi làm ⑵⑶.** ⑴ Tôi cố ý **lệch** khỏi chữ của
ADR-0050 ⒝ theo hướng chặt hơn: ADR viết hai loại này *"xảy ra trước khi gửi"*, nhưng `activeTab()`
ném `RECEIVER_LOST` ở **bất kỳ** đâu, kể cả sau khi prompt đã bay — chữa lúc đó là F5 đè lên một
lượt đang chạy, đúng cái `chat.reload` từ chối làm. ⑵ Một số đo **ngược với kỳ vọng**:
`WRONG_SURFACE` phần lớn **vẫn dừng hẳn**, vì ca nó tới được cổng là ca run chưa gắn hội thoại nào,
và lúc đó không có đích để về.

**Kết quả số.** Suite gói **120 → 121**. Thử phá **12/12**, 0 con thoát, trên cả hai file nguồn.

**Vòng chờ tách ra thành `waitTabComposer()` dùng chung** — giới hạn ② cấm hai bản sao của một
vòng chờ; lý do ở dòng bản đồ file của phép ghim.

**Còn mở.** B-41 mới xong **1 trong 3 phần**: ⑵ `DETECTION_BLIND` (đối soát trước, không gửi lại)
và ⑶ lời nhà cung cấp tự khẳng định là nguồn đối soát vẫn còn. Con số *"0 nguồn khẳng định"* trong
`post-submit-no-resend-smoke.mjs` **vẫn đúng** — phần ⑴ không nối thêm nguồn nào. Chi tiết và điều
kiện đóng: `BACKLOG.md`.

**Việc Đức.** Nạp lại tiện ích để bản này có hiệu lực, rồi chạy một loạt job và thử đóng tab ChatGPT
giữa chừng — đúng ca `RECEIVER_LOST` mà bản vá này nhắm tới.

## 2026-09-09 (tiếp) · `claude-gpt-chay-het-job` — ADR-0051: vòng chat 0 cú bấm chạy được

**Đức đặt lại hướng giữa phiên:** *"tôi ko muốn chọn thư mục, cũng ko muốn mở workbook… tôi muốn
UX đơn giản nhất với người dùng phải vận hành được trước."* Đọc lại luồng thì **hai trong ba yêu
cầu đã chạy được sẵn**: `jobs.add` là cửa mồi tự dựng phiên trong bộ nhớ, và Downloads là đích
mặc định. Chỗ tắc chỉ có một — Chrome bỏ qua tên tệp, `verifyDownloadedFilename()` so tên rồi ném.

**[ADR-0051](docs/adr/0051-nhan-ten-chrome-dat-thay-vi-doi-ten-phai-khop.md)** (Đức chốt sau khi
đọc cả cái giá): nhận tên Chrome đặt. Nó **lật một điểm** của ADR-0049 — ADR đó đã cân đúng
phương án này và **loại** nó; lý do vẫn đúng, Đức đổi ưu tiên. Ghi thẳng ra trong ADR mới.

**Chỗ làm quyết định rẻ hơn nó trông, đầy đủ ở ADR:** `verifyCompletedDownload()` đã kiểm ba thứ
độc lập với tên, và cả ba còn nguyên. Ca `ket-qua (1).xlsx` **vẫn bị chặn**.

**Nghiệm thu live: vòng lặp Đức mô tả chạy được, 0 cú bấm, 2 lượt qua lại.** Không workbook,
không chọn thư mục, prompt giữ nguyên dấu (235 ký tự), đọc câu trả lời về, phân tích, gửi tiếp.

**Nhưng lượt live đó bắt được `B-43`, và nó nặng hơn thứ vừa vá.** Máy ghi **6 ký tự** vào sổ
trong khi trang giữ **237**, và báo `SUCCESS`. Báo-thành-công-giả, vô hiệu hoá case 2. **Cố ý
chưa vá:** hai giả thuyết đòi hai bản vá khác hẳn, cần một phép đo `dom_probe` tách chúng. Số đo
và điều kiện đóng ở `BACKLOG.md`.

**Hai phát hiện khác của cùng lượt chạy, cả hai đã ghi lại:**
- Hội thoại thuộc **Project** (`/g/g-p-…/c/<id>`) bị `conversationIdOf` đọc thành `null` trong
  khi adapter nói đó LÀ hội thoại → `boundConversationId` rỗng → cửa chống trôi-hội-thoại **tắt
  lặng lẽ** trên mọi phiên Project, tức mọi phiên Đức thật sự dùng. Đã vá tận gốc: một luật, một
  bản, ở adapter.
- Chrome bỏ qua **cả thư mục**, không chỉ tên, và công cụ dọn rác không nhìn vào đó → `B-44`.

**Kết quả số.** Suite **121/121**. Thử phá: ADR-0051 **9/9** · hội thoại Project **5/5** ·
ADR-0050 ⒝ **12/12**. Sổ nợ gói thêm `B-43` (P0).

## 2026-09-09 (tệp đẩy) · `claude-gpt-chay-het-job` — có cuốn theo lane khác

Lượt đẩy này dùng `--carry` và **cuốn theo 3 commit của lane `claude-adr-gop`** (đợt gộp và đọc
lại số hiệu ADR ở `docs/adr/`). Ghi ra vì [ADR-0005](../../../docs/adr/0005-duyet-thuong-truc-cho-push-va-carry.md)
bỏ cửa hỏi Đức cho `--carry`, và tên lane bị cuốn theo là **thứ duy nhất còn lại để truy**.
Cổng đóng phiên XANH TOÀN BỘ trước khi đẩy, và suịte 26/26 chạy trên cây có cả việc của hai lane.

## 2026-09-09 · `claude-gpt-chay-het-job` — B-43 vòng hai: chờ lâu hơn, và đọc lại khi câu bị cắt

Đức nêu hai việc sau khi vòng một đã chặn được báo-thành-công-giả: *"giãn thời gian chờ đọc dài
hơn"* và *"đọc mà thấy bị ngắt thì cần đọc lại"*. Nắp chờ chữ-đứng-yên **1,5 → 6 giây**, và chốt
chỉ được đóng khi chữ **không trông như bị cắt** (`looksTruncated`: ngoặc lệch · kết bằng một dấu
nối treo). Hết giờ mà còn dở thì báo `TEXT_INCOMPLETE` kèm 60 ký tự cuối, thôi một câu "hết giờ"
trơn.

**Vùng `workers/duc-auto-chatgpt` đổi tay theo chốt của Đức 09/09** (*"bạn lấy khoá đi"*). Vùng
đang do `claude-luat-rasoat` giữ — nó lấy hợp lệ bằng một chốt khác của Đức cùng ngày và tự khoanh
"CHỈ TÀI LIỆU"; phần tài liệu của nó đã commit ở `cc470037`. Hai vùng `gemini` và `gg-flow-video`
**giữ nguyên cho nó**. Câu chốt ghi **vào bảng quyền**, không chỉ nói trong chat.

**Thử phá 16 mũi → 14 bắt, 2 thoát, và hai con thoát cho ra hai cách xử khác nhau:**
- **Lỗ ghim thật:** bỏ nhánh "kết bằng dấu nối treo" vẫn xanh với cả 10 mép — ba nhánh luật mà
  chỉ ghim một. Thêm mép ⑴f (đứt ngay sau một tiêu đề mục: ngoặc đóng đủ, chữ trông tròn trịa,
  chỉ nhánh thứ ba thấy). **10 → 11 mép.**
- **Mã chết, không phải lỗ ghim:** `if (!value.trim()) return true;` không đường nào tới được vì
  `assistantMessageText()` đã `.trim()`. Thêm phép kiểm cho nó thì ghim **niềm tin**, không phải
  hành vi — đúng cái giới hạn ⑹ cấm. **Xoá**, kèm lý do tại chỗ.

Chạy lại **15/15 bắt, 0 thoát**. Vòng một cũng được xác nhận lại: mũi "nới sang cả đường ảnh"
trước đây đi lọt vì sân khấu giả thiếu `window.DacImageEvidence` — mép ⑹ ném `window is not
defined` và **xanh vì lý do sai**. Sau khi thêm stub, mũi đó bị bắt.

**Kết quả số.** Suite **122/122**. Thử phá B-43 **15/15**. **Còn mở:** nghiệm thu live — hai lượt
chat với tab để ở NỀN, số ký tự ghi vào sổ phải **bằng** số trên trang.

## 2026-09-09 (tệp đẩy) · `claude-gpt-chay-het-job` — có cuốn theo lane khác

Lượt đẩy này dùng `--carry` và **cuốn theo 8 commit của lane `claude-luat-rasoat`** — đợt rà luật
ba gói `duc-auto-*` (N-55 · N-56 · N-57: dựng `docs/adr/` cho gói video, sửa liên kết chết trên
bảng, gỡ các vế luật đã chết trong ba `AGENTS.md`). Ghi ra vì
[ADR-0005](../../../docs/adr/0005-lam-viec-song-song.md) ⑶ bỏ cửa hỏi Đức cho `--carry`, và **tên
lane bị cuốn theo là thứ duy nhất còn lại để truy**. Cổng đóng phiên XANH TOÀN BỘ trước khi đẩy.


## 2026-09-09 — `claude-luat-rasoat`: bản hiệu lực của gói nay MANG sổ cái của nó (N-58)

Không sửa một dòng mã nào — chỉ `AGENTS.md`. Đức chuyển khoá sau khi lane `claude-gpt-chay-het-job`
dừng.

**41/51 quyết định của gói là mồ côi** — `AGENTS.md` không trích số hiệu nào của sổ cái chính nó.
Nghĩa là ai chỉ đọc luật vàng sẽ không biết những thứ này tồn tại. Ba cái đáng kể nhất, đều là
luật **đang ràng buộc**:

- **ADR-0042 — việc thật KHÔNG chạy qua `run.trial`.** Đo được: phát hiện ảnh mất 40–68 giây.
- **ADR-0045 — câu trả lời text quá 32.767 ký tự thì DỪNG và KHÔNG lưu gì.** Không cắt, không
  tách file. Giới hạn cứng một ô Excel.
- **ADR-0004** — AI **được** tự nạp vị trí output khi đó là thư mục con dưới `Downloads`; nó là
  ngoại lệ có kiểm soát của ADR-0003, và thiếu nó thì luật đọc ra chặt hơn thực tế.

Nay `AGENTS.md` có mục **Sổ cái của gói** trỏ tới **37 luật đang sống**, nhóm theo chủ đề. Hai mục
còn lại (0010 gỡ API cũ ở WP-4 · 0029 mốc commit Tầng 1) là **bản ghi một lượt đổi đã xong** — khai
ở `.repo-structure.json` → `luat.mo_coi_co_y`, dạng nhóm, kèm lý do.

**Hai vế đánh dấu CHẾT** đúng khuôn máy đọc được: `0027` (*"không tự ý commit"*, bị 0028/0033 thay)
và `0032` (dọn checkpoint bản 24/08, bị **0043** thay — đừng trích 0032 nữa).

**Một chỗ ⚠ ghi ra chứ không giấu:** `ADR-0036` bắt cross-check độc lập trước khi đưa Đức thao tác.
Vế đó **đã hẹp lại 02/09** khi Đức bỏ audit độc lập cho *fix nhỏ*, nhưng **ranh giới "fix nhỏ" chưa
ai chốt câu chữ**. Đã ghi ngay tại dòng trích; gặp ca xám thì hỏi Đức, đừng suy diễn.

Cùng lượt: sửa dòng *"ADR đã Accepted thì KHÔNG sửa, B12 cưỡng chế"* — chết 09/09 bởi ADR-0026 ⑵.

Phép ② của cả repo: **100 → 0**. Suite gói không chạm.

## 2026-09-09 · `claude-gpt-chay-het-job` — B-43 ĐÓNG: vòng chat chạy trọn với cửa sổ bị che

Đức nêu điều kiện vận hành thật: *"99% thời gian cửa sổ GPT bị che, tôi thường reload, F5 rồi sang
Claude làm việc."* Nên hai vòng vá trước — chặn báo-thành-công-giả — chỉ đổi một lần nói dối thành
một lần **dừng hẳn**, tức vòng chat 0-cú-bấm không bao giờ hoàn tất. [ADR-0052](docs/adr/0052-tab-bi-che-thi-doc-lai-sau-f5-thay-vi-dung-han.md)
cài nửa còn lại Đức nhờ từ đầu: **đọc lại**. Hết giờ → đối soát → F5 → dò tới khi chữ hiện → chốt.

**Nghiệm thu live, ba lượt, cửa sổ để nguyên bị che** (`visibility=hidden`, `docFocused=false`):

| lượt | ghi vào sổ | sau F5 (trọng tài) | kết |
|---|---|---|---|
| ⑴ | 27 | 1.917 | trượt — cửa tắt tin `looksTruncated` để phán DOM đáng tin |
| ⑵ | không ghi | 2.117 | trượt nhưng trung thực — đọc một nhát sau F5 được 0 ký tự |
| ⑶ | **2.228** | **2.228** | **ĐẠT** — `SUCCESS`, `persistence_verified: true` |

**Ba câu tôi nói ẩu mà Đức chặn, cộng điều kiện nghiệm thu đầu của tôi cũng sai** (*"sổ ==
trang"* — cả hai cùng đọc 27 nên nó báo ĐẠT; hai vế cùng sai thì bằng nhau): ghi đủ kèm lý do
từng chỗ ở mục **Trạng thái** của [ADR-0052](docs/adr/0052-tab-bi-che-thi-doc-lai-sau-f5-thay-vi-dung-han.md).

**Khoá đổi tay hai lượt trong phiên**, cả hai theo chốt của Đức ghi **vào bảng quyền**: lấy lại
lần đầu (*"bạn lấy khoá đi"*), bị `claude-luat-rasoat` lấy với bản ghi *"bên kia đã dừng rồi"*
(sai — phiên này chưa dừng), rồi Đức định tuyến lại (*"bạn làm tiếp đi"*). Không tự giành lần nào.

**Kết quả số.** Suite **123/123**. Thử phá: B-43 vòng hai **15/15** · vòng ba **13/13**. Ghim mới
`text-reconcile-after-reload-smoke.mjs` 16 mép. **Còn mở:** `B-44` (dọn rác không thấy thư mục con
Chrome ghi vào) · `B-36` (điều kiện đóng cần đối chiếu lại sau lượt chạy hôm nay) · B-41 ⑵⑶.

## 2026-09-09 (tệp đẩy ⒉) · `claude-gpt-chay-het-job` — có cuốn theo lane khác

Lượt đẩy đóng B-43 dùng `--carry` và **cuốn theo 4 commit của lane `claude-luat-rasoat`** (đợt
N-58: gỡ các quyết định mồ côi khỏi sổ cái, và sửa một phép ghim đang cưỡng chế chính luật đã
chết). Ghi ra vì [ADR-0005](../../../docs/adr/0005-lam-viec-song-song.md) ⑶ bỏ cửa hỏi Đức cho
`--carry`, nên tên lane bị cuốn theo là dấu vết duy nhất còn lại. Cổng XANH TOÀN BỘ trước khi đẩy.

## 2026-09-09 (tiếp) · `claude-gpt-chay-het-job` — ĐÓNG B-44, đo lại B-36, dựng hàng rào cho B-41

**B-44 đóng.** Công cụ dọn rác nay **chỉ ra** chỗ Chrome thật sự ghi mà **không nới bán kính xoá**:
hàm mới không đọc nội dung, không phân loại, không xoá gì trong thư mục con — nó đếm rồi in ra câu
lệnh để người chạy. Tìm ra ngay `Downloads/Phai sinh` (132 tệp) mà trước đó nó chưa từng thấy.
Chạy thật: **81 tệp chứng minh được là của gói → đã xoá** · 51 tệp chưa chứng minh được chủ →
**giữ** · thư mục con `Manga concept Meo` (54 ảnh, việc thật của Đức) → **không đụng**.

Thử phá 10 mũi: 9 bắt được, 1 **không còn diễn đạt được**, 0 thoát. Hai con thoát ban đầu cho hai
cách xử khác nhau — một lỗ ghim thật (không mép nào đọc **con số**, nên đổi phép đếm thành
`trong.length` vẫn xanh), và một đột biến tương đương mà tôi **giết cả lớp bằng thiết kế**: một
`Map` đuôi → hàm chứng minh, thay cho một `Set` cộng mấy nhánh `if`, nên *khai một đuôi mà không
kèm cách chứng minh chủ* thành không khai được. Kiểm luôn dạng mới: nối `.pdf` vào cả ba phép
chứng minh đều **an toàn**, vì mọi phép đều kiểm chữ ký nội dung.

**B-36 — đo được vế còn ngỏ.** Payload trả *"đếm được 3 hồ sơ, **0 còn quyền**"* → không phải ca
nhiều-hồ-sơ, là ca không hồ sơ nào còn quyền; lấy lại thì `requestPermission()` **bắt buộc có một
cú bấm**. Cộng ADR-0051 bỏ hẳn nhu cầu chọn thư mục → **B-36 thôi chặn MVP**, hạ xuống một mục UX.
`STATUS.md` đang nói sai về chính hôm nay (*"MVP bị chặn ở B-36"*) — đã viết lại theo số đo.

**Hàng rào cho B-41.** Bước chuẩn bị mà chính mục đó đặt ra: phép kiểm không-gửi-lại nay **đếm số
nguồn** thay cho một câu `0` trơn, và tách hai loại khẳng định — **dương** (2 nguồn, chỉ chốt) và
**âm** (0 nguồn, loại duy nhất mở cửa gửi lại). Thử phá 3/3. **⑵⑶ cố ý để mở:** ⑶ mở cửa gửi lại
và điều kiện đóng đòi một lượt live — đẩy nó đi mà chưa có lượt live là đúng bài học hôm nay.

**Kết quả số.** Suite **123/123**. Thử phá: B-44 **9/10 bắt + 1 bất khả** · phần đếm nguồn **3/3**.

## 2026-09-09 (đóng) · `claude-gpt-chay-het-job` — B-43 ĐÓNG, đo trong hội thoại Project

Vế cuối của điều kiện đóng đòi **một lượt live trong hội thoại thuộc Project**, và tôi không nới
điều kiện của chính mình. Đã đo: URL `chatgpt.com/g/g-p-6a6aa6fb…-sin/c/6aa03cbf-…`, **cửa sổ để
nguyên bị che** suốt 18 lượt dò (`visibility=hidden`, `docFocused=false`).

**Sổ ghi 1.867 ký tự · máy chủ giữ 1.867 · `SUCCESS`, `persistence_verified: true`.** Đọc lại ba
lần đều ra 1.867 với `generating: false`; câu trọn vẹn (ngoặc cân 1/1, kết bằng dấu chấm, có mục
hành động).

**Vế Project đáng nhất, không phải hình thức.** Phép đo phụ: `conversationId('…/g/g-p-…/c/<id>')`
trả `6aa03cbf-…`, **không** phải `null` → cửa chống trôi-hội-thoại **đang BẬT** trên phiên Project.
Chính chỗ đó từng tắt lặng lẽ trên mọi phiên Đức thật sự dùng.

Đường đi đầy đủ, cả bốn bước: hết hạn 180 giây → đối soát đọc, thấy lượt hỏi của chính job → F5 →
dò tới khi chữ hiện → chốt qua đúng đường `finishTextOutput()` cũ.

**Hai lỗi của tôi trong lượt này, cùng một họ với bốn lỗi trước trong ngày:**
- Tôi **nhờ Đức bấm F5** trong khi `chat.reload` là method tôi đã dùng cả ngày. Tôi đọc câu trong
  `halt_instruction` — câu viết cho người vận hành — rồi đọc lại cho Đức. Đức bắt đúng: *"bạn tự
  F5 được sao phải tôi bấm?"* Chuyển tiếp thay vì hành động.
- Tôi đo `conversationId` ra `null` và suýt báo con bug quay lại. Phép đo hỏng: quên đưa `URL` vào
  ngữ cảnh `vm` nên hàm ném lỗi và trả `null`. Mã hoàn toàn đúng.

Cả hai là **đọc một tín hiệu rồi kể chuyện quanh nó** thay vì kiểm nguồn tín hiệu. Khác biệt: chỗ
thứ hai tôi kiểm TRƯỚC khi nói ra.

**Kết quả số.** Suite **123/123**. B-43 và B-44 đóng. **Còn mở:** B-41 ⑵⑶ (cố ý — ⑶ mở cửa gửi
lại, cần một lượt live) · B-42 (cần brief Đức duyệt) · B-36 hạ xuống một mục UX.

## 2026-09-09 (tiếp) · `claude-gpt-chay-het-job` — ĐÓNG B-40 đường ⒝ và B-41 ⑶

Đức chốt: *"phương án 2. cần đảm bảo flow chạy từ đầu tới cuối cho đến hết, trừ khi bị captcha
hoặc báo hết credit."* → [ADR-0053](docs/adr/0053-loi-nha-cung-cap-la-mot-nguon-doi-soat-cau-chua-lay-tu-ma-cua-ta.md).

**Sổ nợ gọi ⒝ là *"cho gửi lại"* — cách gọi đó SAI.** Đức viết *"chỉ bằng đúng câu nó yêu cầu"*,
nên thứ máy gửi là **câu chữa**, không phải prompt gốc. Prompt gốc vẫn bay **đúng một lần**; câu
chữa tối đa **2 lần/job**. `submissionMayExist()` và `canRetry()` không bị sửa một dòng.

**Rủi ro lớn nhất, sổ nợ chưa nêu:** đọc câu *"nhắn X"* rồi gõ X nghĩa là **trang quyết định máy
gõ gì** — cửa tiêm lệnh, ở đúng chỗ tệ nhất là một cửa vừa được cấp quyền gõ. Câu chữa nằm trong
một **hằng của adapter**; chữ nhà cung cấp chỉ dùng để **nhận dạng**. Ba lớp, cố ý dư một lớp.

**Số đo.** Suite **124/124** · ghim 15 mép · thử phá **10/11 bắt, 0 thoát** · kiểm hồi quy live:
sổ **1.761** = máy chủ **1.761** (tôi vừa sửa thẳng vào cửa đối soát đang chạy tốt, nên phải đo).

**Hai con thoát ở vòng đầu, cả hai ở chỗ chịu tải:** không tăng bộ đếm nắp (nắp không bao giờ cắn
→ vòng lặp tiêu quota) và bỏ qua `run.stop`. Cả hai lọt vì mọi mép chỉ kiểm **cấu trúc** — cấu
trúc không với tới hành vi. Bịt bằng ba mép **cắt hàm đã ship ra chạy thật**.

**Ba lỗi của tôi trong lượt này, ghi ra vì cả ba là lỗi tôi:**
- Mép chống tiêm ban đầu **đòi sai chỗ** — nó bắt bộ phân loại từ chối một câu chữa nằm *trong*
  một yêu cầu dài hơn. Tính chất đáng giữ là *"thứ sắp gõ là đúng một phần tử danh sách trắng"*, và
  nó đứng vững; ca kia chỉ tốn **một lượt quota vô ích**. Đã ghi thành **giới hạn đã biết**.
- Bộ lọc chú thích theo **tiền tố dòng** không cắt nổi khối `/* … */` mà dòng tiếp bắt đầu bằng
  chữ, nên **văn của chính tôi** khớp vào phép kiểm và mép chống tiêm **đỏ oan**. Sửa ở **cả ba**
  phép ghim tôi viết hôm nay.
- Sân khấu giả truyền sai đối số nên mép nắp **đỏ vì lý do sai**. Sáng nay một mép khác **xanh** vì
  lý do sai. Cùng một họ, và đó là lý do luôn chạy thử phá thay vì tin suite xanh.

**Một lỗ hạ tầng nổ thật, đã gộp vào `N-59` của lane khác thay vì mở mục thứ hai:** một lượt
`--restamp` để lấy khoá đã dán câu chốt của Đức lên **5 vùng** mà lane kia vừa **TRẢ**. Cả 5 đều
`owner: null` nên không khoá sống nào bị lấy, nhưng bản ghi xuất xứ thì sai. Dọn bằng cách hoàn
nguyên bốn trường từ `git show HEAD:` — **không** đụng trường `owner`.

**Còn mở:** B-41 ⑵ (`DETECTION_BLIND`) · B-42 (cần brief Đức duyệt) · vế live của ADR-0053 cần
một lỗi thật của nhà cung cấp, **tôi không giả lập**.
