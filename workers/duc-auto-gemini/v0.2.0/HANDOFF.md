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
> file này giữ **20 mục cuối theo vị trí trong file**, 113 mục trước đó nằm ở file lưu trữ.
> Cần đào lịch sử xa hơn thì mở file đó; ghi Log mới thì vẫn ghi vào cuối file này.
<!-- /HANDOFF-CUT-POINTER -->

- 2026-08-28 (chiều) · Claude (`claude-gemini-bridge-stability`) · **Đã KIỂM CHỨNG LIVE bản vá sáng nay, rồi Đức chốt hạ trần chờ 30s → 5s. Bản trần 5 giây đã commit nhưng CHƯA đo live.**
  - **Kiểm chứng live, hai cú tắt/bật host** (Đức reload extension trước). Bằng chứng đầy đủ:
    `evidence-transport-liveness-20260828/`. Hai nửa:
    · **mắt Đức:** tab BRIDGE báo **Mất kết nối** cả hai lần — không còn đứng **Connected** giả;
    · **máy đo:** tự nối lại sau **22,5 giây** và **27,7 giây**.
  - **Hai con số đó được DỰ ĐOÁN trước khi đo, và khớp trong vòng 1 giây.** Thang chờ cũ là
    1→2→5→10→30 nên extension thử lại ở giây 1, 3, 8, 18, 48, 78; thời gian chờ chỉ là khoảng
    cách từ lúc host sống lại tới lần thử kế tiếp. Cú 1: host tắt 57s → dự đoán 21,0s, đo 22,5s.
    Cú 2: host tắt 19s → dự đoán 28,8s, đo 27,7s. Khớp hai lần cũng **chứng minh service worker
    MV3 vẫn thức suốt cú đứt** — nếu nó ngủ thì đồng hồ chết theo và thang không chạy tới giây 78.
  - **Tôi đã nói sai một chỗ và đã đính chính với Đức:** trước khi đo tôi bảo "nối lại trong
    ~1 giây". Đó chỉ đúng với cú đứt chớp nhoáng. Với đúng kịch bản tắt/bật host, bản vá sáng
    **không làm nối lại nhanh hơn bản cũ** (trước là alarm 30s, sau là trần thang cũng 30s).
    Cái nó thật sự chữa nằm ở ba chỗ khác — kết nối chết lặng, socket kẹt lúc nối, host không
    trả lời auth — và **không tái hiện được bằng cách tắt cửa sổ host**, nên không nằm trong
    bằng chứng này; chúng được ghim bằng test.
  - **Đức chốt (sau khi hỏi cụ thể về pin và tài nguyên): trần 5 giây, và thang nhường lại cho
    alarm 30 giây sau ~2 phút.** Lý do: host nằm ngay trên `127.0.0.1` nên "lùi để khỏi nện"
    không còn lý do; còn cái thật sự tốn pin là **extension phải thức**, mà số đo cho thấy nó
    **đã thức sẵn** ngay ở trần 30 giây. Nên hạ trần gần như không thêm giá, mà cắt thời gian
    chờ xuống 6 lần. Thang mới: 1→2→5 lặp, **26 lần thử trong 123 giây** rồi im, để alarm lo —
    tức host tắt cả đêm thì tốn đúng bằng bây giờ.
  - **Audit độc lập vòng tiếp: FAIL ×3 → CONDITIONAL PASS, oracle 3 MET.** Bảy phát hiện, đều
    thật, đều đã vá: ACK không mời mà đến vẫn nạp lại ngân sách · độ trễ bằng 0 là nấc miễn phí
    nên cửa sổ không bao giờ đóng · `Infinity` lọt vào cửa sổ · `Infinity` lọt vào ba núm thời
    gian · lỗ hổng trong mảng thành nấc `NaN` · cửa sổ hữu hạn quá lớn · ép kiểu hai lần.
    **Cả bảy chỉ tới được qua tham số tiêm vào, mà production gọi `create()` không truyền gì
    (`background.js:5`)** — nên là siết khe test, không phải lỗi sản phẩm. Vẫn vá, vì một khe
    im lặng nhận `Infinity` thì trả về một transport không còn giới hạn nào.
  - **Một sự cố đáng ghi, vì nó suýt lọt:** máy phá thử bị cắt giữa chừng để lại đột biến M22
    trên đĩa; lần chạy sau thấy baseline đỏ nên thoát **trước** khối `finally` nên không hoàn
    nguyên — đột biến bị **bake vào source thật**. Suite bắt được ngay. Đã khôi phục, đã đối
    chiếu `git diff` với HEAD (bản đã audit) để chứng minh không sót gì khác, và máy phá thử
    giờ hoàn nguyên bằng `atexit` nên không tái diễn được.
  - Phá thử **36/39**. Ba cái thoát vẫn là ba guard lớp hai không tới được (`G-10`).
    Suite **82/82**, `npm test` gốc xanh, `git diff --check` sạch.
- **Next:** Đức bấm ⟳ reload extension lần nữa, rồi tắt/bật host **một lần** để xác nhận bản
  trần 5 giây: chờ phải **dưới 5 giây** thay vì 22–28 giây. Xong thì thêm một file bằng chứng
  mới (`G-11`), **không sửa file bằng chứng cũ**. G-01 trial live vẫn giữ nguyên, chưa đụng.

- 2026-08-28 (chiều, tiếp) · Claude (`claude-gemini-bridge-stability`) · **G-11 ĐÓNG: bản trần 5 giây đo live được 1,0 giây.**
  - Đức reload extension rồi tắt/bật host một lần. Máy đo: host tắt 16,1 giây, **nối lại sau
    1,0 giây**. Bản trần 30 giây sáng nay đo 22,5s và 27,7s.
  - **Dự đoán viết trước khi đo, khớp lần thứ ba liên tiếp:** thang mới thử lại ở giây 1, 3, 8,
    13, 18… Host sống lại ở giây 17 → lần thử kế tiếp là giây 18. Đo đúng giây 18.
  - Bằng chứng: `evidence-transport-liveness-5s-20260828/`. Thư mục buổi sáng **không bị sửa** —
    luật bằng chứng chỉ cho thêm mới — nên `STATUS.md` là con trỏ chuẩn, nay trỏ sang thư mục mới.
  - **Đọc con số cho đúng:** 1,0 giây là may (host sống lại sát một mốc thử). Cái được bảo đảm
    là **trần 5 giây**.
  - **Còn một nhánh chưa đo thật:** tắt host quá 2 phút → thang bỏ cuộc → alarm 30 giây lo tiếp.
    Hiện chỉ ghim bằng test, đã ghi rõ trong bằng chứng và trong `BACKLOG.md`.
- **Next:** Không còn việc mở của lớp vận chuyển. `G-01` trial live vẫn giữ nguyên, chưa đụng.

- **2026-09-02 · `s5-adr`** — **Tách 67 quyết định trong `decisions.md` thành 67 ADR bất biến**
  (`docs/adr/`, chuẩn Nygard bốn mục). Phiên S5 ở gốc repo, xem `docs/briefs/BRIEF-S5.md`.
  - **`decisions.md` KHÔNG bị xoá** — nó thành **mục lục** trỏ sang từng ADR, giữ nguyên nhóm cũ.
    Nội dung gốc vẫn đọc nguyên vẹn bằng `git show 181c06e:workers/duc-auto-gemini/v0.2.0/decisions.md`.
  - **Chỉ đổi HÌNH DẠNG, không đổi một chữ.** Chứng minh bằng máy, không bằng lời hứa: bộ tách
    đối chiếu **từng ô** của bảng cũ phải xuất hiện NGUYÊN VĂN trong ADR tương ứng — 227/227 ô
    khớp, 0 sai lệch (227 chứ không phải 268 vì 14 bảng của file này chỉ có ba cột — không có
    cột Nguồn). Đây là bằng chứng mạnh hơn chép tay, vì chép tay 67 dòng không ai soát lại được.
  - **Mục "Hệ quả" của mọi ADR chuyển đổi đều ghi `không ghi lại`** — bảng gốc không có cột đó.
    Bịa cho đủ bốn mục thì bản ghi lịch sử hết đáng tin.
  - **Số quyết định thật là 67, không phải 18 như BRIEF-S5 ghi** — brief đếm tiêu đề `##` (là
    NHÓM) chứ không đếm dòng bảng (là QUYẾT ĐỊNH). Đã đếm lại bằng hai cách độc lập, khớp nhau.
  - Từ nay **đừng thêm dòng vào `decisions.md`**; chép `docs/_TEMPLATE-adr.md` thành ADR mới,
    đánh số tiếp từ `0068`. ADR đã `Accepted` là bất biến — phép kiểm **B12** cưỡng chế.
- **Next:** không đổi việc đang mở của gói này.
- 2026-09-02 · `claude-bridge-multiprofile` · **PORT MULTI-PROFILE BRIDGE — xong, suite 83/83,
  10/10 mutation đỏ.** Port từ gg-flow-video (mẫu 6c59266, đã audit PASS + kiểm live 3 profile).
  Host = chép nguyên bản mới (host hai nhánh vốn giống từng byte). Transport: khối `instance`
  nạp TRONG handler `open` có guard — giữ nguyên bất biến "giữ socket trước await" của bản vá
  stability 3514aa5, không đụng keepalive-deadline/backoff. Panel: ô "Tên hồ sơ Chrome này".
  CLI: lệnh `sessions` + cờ `--target`; `scripts/bridge-rpc.mjs` thêm `--target`.
  Chốt ghim sửa theo hành vi mới: mv3-reconnect (auth mang instance, gửi trễ 1 microtask),
  transport-liveness (thêm 1 `await settle()`), test multi-profile mới (bản gg-flow đổi worker id).
  Host mới ĐÃ deploy sang thư mục Bridge + khởi động lại (host cũ idle, executor unavailable,
  không có run đang bay); live thấy 1 kết nối legacy (extension chưa reload — tay Đức).
  Việc mở: Đức reload extension từng profile + đặt tên; live-check ambiguous/target như gg-flow.
- 2026-09-02 · `claude-bridge-multiprofile` · **Audit Codex vòng 1 cho port: FAIL — và nó ĐÚNG.**
  Phát hiện HIGH: vì auth giờ gửi SAU lần đọc identity async, transport có thể nhận `auth_ok`
  TRƯỚC khi mình gửi auth — tự đánh dấu authenticated và huỷ deadline bắt tay với con số 0
  khung đã gửi. Vá: cờ `authSent` chỉ bật sau khi khung auth thật sự rời socket; `auth_ok`
  thiếu `authSent` → đóng socket fail-closed. Phát hiện MED (test chưa ép ranh giới async):
  thêm `tests/bridge-multiprofile-transport-async-smoke.mjs` — ghim (1) auth_ok đến sớm bị
  từ chối, (2) socket bị thay giữa lúc đọc identity KHÔNG BAO GIỜ nhận khung auth. 2 mutation
  mới (bỏ cổng authSent, bỏ guard sau await) đều làm test ĐỎ. Hệ quả phụ: các test cũ bắn
  auth_ok ngay sau open phải chờ 1 nhịp (`settle()`/tick) — sửa mv3-reconnect + liveness.
  Suite 84/84.
- 2026-09-02 · `claude-bridge-multiprofile` · Đóng gói: `evidence-multiprofile-port-20260902/` (2 vòng audit Codex nguyên văn + mutation 13/13 đỏ), fixture cô lập vế identity của guard sau await, khai bản đồ file. Suite 84/84. Còn tay Đức: reload extension từng profile + đặt tên (ô ở tab BRIDGE).

- 2026-09-02 · Claude (`claude-stabilizing-bridge`) · **Vá một lỗi của chính lớp ổn định này, do audit phát hiện khi port sang nhánh ChatGPT.**
  - **Lỗi:** cửa sổ bỏ cuộc 120 giây chỉ đếm thời gian chờ **giữa** các lần thử, không đếm hạn bắt
    tay 10 giây nằm **trong** mỗi vòng. Với host chấp nhận kết nối rồi im lặng, mỗi vòng tốn
    5 giây chờ + 10 giây bắt tay nhưng chỉ bị trừ 5 — nên thang chạy **~6,5 phút** thay vì 2 phút,
    và giữ service worker thức suốt thời gian đó. Đúng cái mà cửa sổ sinh ra để tránh.
  - **Vá:** hạn bắt tay tự trừ thời gian của nó vào ngân sách trước khi buông socket. Một dòng.
  - Ghim bằng ca mới: mọi socket đều mở rồi im, nên mỗi vòng tốn cả độ trễ lẫn hạn bắt tay —
    cửa sổ 20ms mua được **hai** lần thử chứ không phải bốn. Đỏ trước, xanh sau.
  - Suite **84/84**. Không đụng gì khác trong package này.
- **Next:** không có việc mở của lớp vận chuyển. Số đo live 28/08 vẫn đúng — bản vá này chỉ đổi
  hành vi ở nhánh host-im-lặng-kéo-dài, không đổi đường bật/tắt host thường.

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

## 2026-09-02 — `claude-y03`: khai `human_action` (một dòng, không đụng code)

Lược đồ trạng thái có trường mới `human_action` — **việc đang chờ tay Đức**, tách khỏi
`next_step` (việc của phiên AI kế tiếp). Trước đó việc chờ Đức nằm lẫn trong câu mô tả nên
bảng trạng thái phải đoán từ chữ, mà luật vàng 1 cấm đoán.

Gói này đã khai: *"Mở từng hồ sơ Chrome đang dùng cho Gemini, nạp lại tiện ích, rồi điền tên
hồ sơ vào ô trong bảng điều khiển."* — viết tiếng Việt có dấu, không thuật ngữ, vì Đức đọc câu
này rồi đi làm luôn.

**Không đụng một dòng code nào của gói.** Chi tiết trường: `STATUS.template.md` ở gốc repo.
Giai đoạn 2 (chuyển thành bắt buộc) ghi ở Y-03 trong `IDEAS.md`.

## 2026-09-02 — `claude-y05`: viết lại chữ operator cho mắt Đức đọc (không đụng code)

**Làm gì.** Viết lại `next_step` và `current_focus` thành tiếng Việt có dấu (phép kiểm **B15**),
và tách việc của Đức sang trường riêng `human_action` — `next_step` từ nay chỉ còn việc của phiên
AI kế tiếp. Không đụng một dòng code. Cùng mục còn hai lượt của `claude-bridge-multiprofile`:
nút **"Lưu tên"** báo danh ngay (Đức chốt 02/09) và bộ vá sanitize label sau hai vòng audit.

**Kết quả.** Suite gói **85/85**. `bridge-profile-label-save-smoke.mjs`: 3/3 đột biến đỏ.
Audit vòng 1 FAIL đúng — sanitize quét chuỗi **trước** khi chặn độ dài, và ký tự điều khiển C1
(U+0080–U+009F) lọt lưới; đã vá cả **ba** bản sao trong gói (transport · panel · host).

**Còn mở.** Nợ port nút "Lưu tên" sang `gg-flow-video` và `chatgpt`. Thứ tự "chặn trước, quét
sau" **không ghim được bằng outcome test** — đột biến đổi thứ tự cho cùng kết quả; điểm này chỉ
dựa trên xác nhận tĩnh của audit vòng 2. Đừng nhập lại `human_action` vào `next_step`.

> Bản dài nguyên văn: [`HANDOFF-ARCHIVE-02.md`](HANDOFF-ARCHIVE-02.md).

---

## Log — 2026-09-03, `claude-dashboard` · README+AGENTS của gói này là bản chép từ gói ChatGPT

**Làm gì.** `README.md` và `AGENTS.md` của gói là bản chép từ gói ChatGPT — 27 dòng ghi "ChatGPT"
trong khi gói này chạy trên `gemini.google.com`, và bảng trạng thái hiện chữ sai cho Đức đọc.
Sửa từng chỗ một kèm bằng chứng, không find-replace. Đức chốt 03/09 xoá hai script Bridge thừa
của ChatGPT nằm nhầm trong gói → `G-13` đóng.

**Kết quả.** Suite gói 84/1 → **85/0**. Hai script thừa là chuyện **đâm cổng**, không phải rác:
bản Gemini dùng cổng **32148**, bản ChatGPT thừa dùng **32147** — trùng đúng cổng Bridge của gói
ChatGPT thật, nên chạy nó sẽ hỏng theo kiểu "nối mãi không được". Trước khi xoá đã chuyển **15**
phép ghim an toàn của `bridge-install-static.mjs` sang bộ Gemini; cả 15 đạt. Nợ gói 11 → 13
(thêm G-12, G-13), rồi G-13 đóng.

**Còn mở.** `G-12` — soát nốt README từ mục cài đặt trở xuống. Và một cái bẫy: **ba chỗ mang chữ
"ChatGPT" trong gói này là ĐÚNG** (hai file XLSX mẫu có thật, hai khối prompt `#01`/`#02` là bản
ghi lịch sử) — đã dán nhãn tại chỗ, đừng thay hàng loạt.

> Bản dài nguyên văn: [`HANDOFF-ARCHIVE-02.md`](HANDOFF-ARCHIVE-02.md).

---

## Log — 2026-09-04, `claude-exec-g02b` · G-02 khoá tab và khoá hội thoại

**Làm gì.** Nối nốt việc dở của phiên `claude-exec-g02` (chết giữa chừng, Đức chốt giữ việc dở).
Core `tab-lock-core.js` đã đúng nhưng mới xong một nửa, và nửa thiếu làm extension chết hẳn:
thiếu thẻ `<script>` trong `sidepanel.html` (nên `activeTab()` ném TypeError ở **mọi** lần gửi),
và `bindRunTab()`/`releaseRunTab()` được định nghĩa mà **không chỗ nào gọi**.

**Kết quả.** Suite gói 85 → **86 file, 86/0**. `tests/tab-lock-behavior.mjs`: 17 khẳng định,
trong đó mục 12–16 ghim đúng nửa **wiring** — vì "core đúng mà không ai gọi thì bằng không có",
và không test cũ nào bắt được loại lỗi đó. Đột biến vòng 1 **10/15** (4 lượt SKIP là lỗi của
script đột biến: `git checkout` trả file về CRLF), vòng 2 **15/15**. Nhánh Gemini chỉ có **một**
chỗ khoá, khác nhánh ChatGPT (hai chỗ) — đã ghim để không ai "port cho đủ".

**Còn mở.** `G-02` **chưa nghiệm thu live**. Cần Đức reload extension rồi chạy một run và giữa
chừng bấm sang tab khác: prompt phải vẫn đi vào tab đã khoá; đổi hội thoại hoặc đóng tab phải
dừng cứng `RECEIVER_LOST`, không thử lại. Nợ nhỏ đã cân, ghi ở `BACKLOG.md` mục G-02: thông điệp
lỗi vẫn nhúng *origin*, nên một origin chứa chữ bẫy vẫn lái được nhãn lỗi.

> Bản dài nguyên văn: [`HANDOFF-ARCHIVE-02.md`](HANDOFF-ARCHIVE-02.md).

---

## Log — 2026-09-05, `claude-gemini-no` · G-09 `npm test` ở gốc repo không chạy suite Gemini

**Làm gì.** `npm test` ở gốc báo xanh mà chưa mở tới hai phần ba số file test. Vá hai lớp:
`scripts.test` nay gọi **cả bốn** suite worker, và thêm một phép ghim tự đọc hình dạng repo từ
`.repo-structure.json` để worker mới không lọt ra ngoài lần nữa.

**Kết quả.** `npm test` ở gốc: **120/321 file (37%) → 322/322 (100%), exit 0**. Đây **không**
phải nợ sửa code — chạy riêng thì cả ba suite bỏ sót đã xanh sẵn (19/0 · 86/0 · 96/0); nó thuần
là lỗ phủ. Phép ghim mới `tests/root-suite-covers-workers-static.mjs`: 3 khẳng định, đột biến
3/3 đỏ. Suite gói 86 → 87 file.

**Còn mở.** Phép ghim đó **đang ở sai nhà** — chỗ đúng là `tests/` gốc, nhưng lúc vá khoá
`_code` do phiên khác giữ. Hệ quả đã cân và ghi ở `BACKLOG.md` mục G-09: ai xoá đúng dòng gọi
suite Gemini khỏi `scripts.test` thì `npm test` không chạy tới file này nữa (cổng đóng phiên vẫn
bắt, vì nó gọi thẳng `run-all.mjs`). `G-01` và `G-10` chưa động tới trong lượt đó.

> Bản dài nguyên văn: [`HANDOFF-ARCHIVE-02.md`](HANDOFF-ARCHIVE-02.md).

---

## Log — 2026-09-06, `claude-gemini-b` · G-10 ghim ba guard lớp hai + G-11 ghi sai dấu đóng

**Làm gì.** `G-11` bị bộ đếm tính là còn mở dù đã đóng từ 28/08, vì dấu đóng nằm **giữa** tiêu
đề — viết lại tiêu đề cho khớp luật của `isDone`, **không sửa bộ đếm** (luật đó cố ý lệch về phía
báo thừa nợ). `G-10`: ba guard lớp hai của `bridge-transport-loopback.js` nay có phép ghim ở
**mức nguồn**.

**Kết quả.** Nợ gói **11 → 9**. Suite gói 87 → **88 file, 88/0**. Phép ghim mới
`tests/bridge-transport-depth-guards-static.mjs`: 4 khẳng định, cắt thân hàm bằng đếm ngoặc và
soi bằng `indexOf` — **không một regex nào** (`\b` không khớp cạnh chữ Việt, và file là CRLF nên
neo `^`/`$` báo "không khớp" trông y hệt "không có gì phải sửa"). Khẳng định thứ tư **đếm số mỏ
neo và đòi đúng 12**. Đột biến 3/3 đỏ. Kiểm chứng lại lời phiên trước thay vì tin luôn: đem đúng
ba đột biến đó chạy với suite **hành vi** thì xanh cả 3/3 — nên ghim ở mức nguồn là đúng, và đó
là số đo chứ không phải suy đoán.

**Còn mở.** `G-01` (trial live — luật mục 2 bắt hỏi Đức trước) và `G-02` (chờ Đức reload
extension để nghiệm thu khoá tab / khoá hội thoại). Ghi để phiên sau khỏi hoang mang:
`debtByUnit` đọc qua `git show HEAD:<path>`, **không đọc cây làm việc**, nên số nợ chỉ nhúc nhích
sau khi commit.

> Bản dài nguyên văn: [`HANDOFF-ARCHIVE-02.md`](HANDOFF-ARCHIVE-02.md).

## Log — 2026-09-06, `claude-handoff-cat` · cắt đuôi file này theo ADR-0008

Giữ **20 lượt cuối**, **113 lượt cũ** dời sang `HANDOFF-ARCHIVE-01.md` cạnh file này. Cắt theo
**vị trí trong file**, không theo ngày (bất biến ⑵). Tìm được **133 mục** (127 gạch đầu dòng + 6 tiêu đề `##`).
**181,7 KB → 34,6 KB** (lưu trữ 148,7 KB). Không xoá một chữ, không sửa một chữ — chỉ dời chỗ.

**Bất biến ⑴ đo bằng máy:** ghép phần sau dấu `ARCHIVE-BODY-START` của file lưu trữ vào đúng chỗ con trỏ
trong file này dựng lại bản gốc **giống hệt từng byte** — SHA-256
`8e587bd8256bff82bb7523284c5c41613d15934de9a2d1576b2aef0731227971` cả hai chiều, và khớp luôn với
`git show HEAD:` (file này toàn LF nên không dính bộ lọc CRLF như gói ChatGPT).

Đã khai `HANDOFF-ARCHIVE-01.md` vào Bản đồ file của `AGENTS.md` (bất biến ⑷). `STATUS.md` `ref_handoff`
**vẫn đúng** — file này vẫn là nơi giữ trạng thái. Không đụng `scripts/`, `docs/`, `HANDOFF.md` gốc repo;
**không sinh lại artifact máy** (phiên điều phối sinh một lượt cho cả ba lane).

**Còn mở:** như lượt trước — G-01 và G-02 vẫn chờ Đức reload extension. Lượt này không đụng code.


## 2026-09-06 — `claude-dau-worker`: đặt dấu @Đức cho khối "Cần Đức" trên bảng

Lượt 2 của đề bài `BANG-CAN-DUC-01`. Khối "Cần Đức" trên bảng nay **suy từ một dấu đặt ngay
trên dòng của mục** (`@Đức:bấm` / `@Đức:chốt`), không đọc trường `human_action` nữa. Chưa có
dấu thì mục không lên bảng, nên lượt này chỉ đi điền dấu — **không sửa code, không sửa hành vi**.

**Đã đánh dấu trong gói này:** G-01 (bấm) · G-02 (bấm).

- Hai mục cùng cần một lần nạp lại tiện ích rồi một lượt chạy thật, nên chúng gom được thành một buổi của Đức.

**Kiểm chứng:** sinh lại bảng, khối "Cần Đức" đếm **10 việc · 6 bấm · 4 chốt** trên cả ba gói —
khớp đúng 10 dấu đã đặt. Đóng mục thì dấu mất theo, không phải nhớ đi xoá.

**Còn mở:** không đụng `scripts/`, `docs/`, `HANDOFF.md` gốc repo; không sinh lại artifact máy.

## 2026-09-06 — `claude-don-so`: quét sổ nợ gói này tìm chỗ "sổ nói sai về chính nó" — **không tìm được chỗ nào**

**Không sửa gì trong gói này.** Ghi lại để phiên sau khỏi quét lại.

Lượt này đi dọn ba chỗ mà văn xuôi trong sổ nợ mâu thuẫn với nhật ký hoặc git (hai chỗ ở
`gg-flow-video`, một ở `chatgpt`). Gói Gemini nằm trong phạm vi quét. **Chín mục đang mở** —
`G-01` `G-02` `G-03` `G-04` `G-05` `G-06` `G-07` `G-08` `G-12` — đối chiếu từng mục với
`HANDOFF.md` của gói và với `git log --grep`:

- `G-01` và `G-02` **khớp**: cả tiêu đề lẫn thân đều nói *chờ Đức reload để nghiệm thu*, và Log
  hai lượt gần nhất nói đúng chữ đó. `G-02` còn được một phiên trước cảnh báo sẵn ngay trong Log
  (*"trông như đã đóng (`ĐÃ VÁ TĨNH 2026-09-04`) nhưng là việc mở thật"*) — đúng loại bẫy mà lượt
  này đi tìm, và ở đây nó **đã được xử lý rồi**.
- `G-04` và `G-08` **cố ý không gõ số vào sổ** mà trỏ sang khối máy sinh trong
  `FEATURE-PARITY.md`. Đó là cách duy nhất một con số trong văn xuôi không bị lạc hậu.
- `G-03` `G-05` `G-06` `G-07` `G-12`: không có commit nào và không có dòng Log nào nói chúng đã
  xong hay đã đổi trạng thái.

**Không mục nào bị đếm sai, không tiêu đề nào lạc hậu.** Nợ gói giữ nguyên **9**, đo bằng chính
`debtByUnit` của bộ sinh bảng. Nói thẳng là không tìm được, chứ không bịa thêm cho đủ số.

## 2026-09-06 — `claude-codex-ngan`: viết ngắn 5 mục nhật ký cũ, bản dài sang `HANDOFF-ARCHIVE-02.md`

**Làm gì.** Việc ④ của [`BRIEF-HANDOFF-TRAN-01`](../../../docs/briefs/BRIEF-HANDOFF-TRAN-01.md),
Đức duyệt ở ADR-0011 mục ⑶. Gọi Codex CLI rà từng mục vượt trần 2.600 byte rồi viết lại theo
hình dạng ở [`docs/protocols/HANDOFF.md`](../../../docs/protocols/HANDOFF.md) mục 1 (làm gì ·
kết quả số · còn gì mở), sau đó tôi tự đọc lại và biên tập cho mắt Đức đọc — bản Codex đúng
về dữ kiện nhưng đặc như sổ tay máy.

**Kết quả.** File này **39.444 → 27.603 byte**; 5 mục vượt trần → **0**, mục dài nhất còn **1.668**.
**Không mất một byte:** ghép phần thân của `HANDOFF-ARCHIVE-02.md` vào đúng chỗ 5 mục đó
dựng lại bản gốc **giống hệt từng byte** — SHA-256 `9a76e562777b125684155fc406d9b9990b71ba852e60af6472f238bd5a5dee8c`, đã đo bằng máy chứ
không phải lời hứa. Mỏ neo khớp **5/5** mục, không lượt nào ra 0.

**Còn mở.** Không có gì của gói này. Hai việc còn lại của brief **không làm được trong lượt này**:
`HANDOFF.md` ở gốc repo (24 mục, dài nhất 6.325 byte) vì lane khác đang giữ `_root`; và gói
**GG Flow Video** — bản viết ngắn 4 mục **đã xong và đã kiểm** nhưng khoá của gói bị lane
`claude-flow-active` nhận mất lúc đang làm, nên tôi đã **trả vùng đó về HEAD** (luật mục 1: vùng
có chủ khác thì chỉ được đọc). Bản đã làm giữ ngoài repo, áp lại được bằng một lệnh — **cần Đức
chốt** ai giữ khoá đó.

## 2026-09-06 — `claude-gemini-hoan-thien`: hai lớp an toàn nhánh kia có, nhánh này không

Đức chốt đích: gói này về **không còn việc mở**. Việc đầu là **đọc để bớt việc** — một trong "bốn hành vi
nghi thiếu" **đã có sẵn** (đọc địa chỉ tab lúc đang tải, do đợt khoá tab 04/09), và "79 dòng chênh" của lớp bằng chứng ảnh là **một tính năng**, trùng khít với một hành vi
khác trong cùng danh sách. Chín việc thật ra ít hơn chín.

**① Mù thì dừng cứng** (`DETECTION_BLIND`, port từ nhánh ChatGPT). Hết giờ mà **không còn một khối
phản hồi nào** → dừng cứng, không thử lại, kèm hướng dẫn tiếng Việt. Nhánh kia thêm lớp này ngày
26/08 sau khi một lượt live **đốt 6 lượt tạo ảnh thật**; nhánh này chưa có.

Bẫy: câu báo lỗi **tự nó chứa chữ "timeout"** nên thứ tự luật là load-bearing. Cùng lượt đóng lỗ
**cùng loại** đã ghi sẵn trong thân G-02 — chi tiết cả hai ở mục G-02 của `BACKLOG.md`.

**② Sổ cái thôi nói đã ghi đè lên bằng chứng cũ của Đức.** Đường Downloads so đường dẫn **tuyệt
đối** với đường dẫn **tương đối**, nên phép so **không bao giờ đúng một lần nào**: mọi lượt lưu bị
ghi `uniquified`, và dưới chính sách ghi đè thì ghi **`overwritten`** — khai với nhật ký kiểm toán
rằng bằng chứng cũ đã bị thay thế, trên những lần ghi đầu tiên, mọi lần. Nhánh này đã chốt đúng
nguyên tắc đó từ trước nhưng **chỉ cho bộ ghi thư mục** (nó dò được trước khi ghi). Thêm
`landed_as_requested`: file bị Chrome đẩy ra Downloads gốc **vẫn giữ nguyên tên**, nên trường cũ
vẫn đọc "written".

**Số.** Suite 88 → **90**, 90/90 xanh. Thử phá **13/13** bị bắt. Một phép kiểm tôi tự viết đã **bị
bỏ**: đột biến chứng minh nó không bao giờ đỏ được.

**Còn mở.** Việc ③ (nhiều ảnh một job) chưa làm — chi tiết và điều kiện đóng ở `G-05`. Hai việc
P1 chờ **tay Đức**, gộp được một lượt. Lưới hứng bắt oan trong `what-next.mjs` vẫn còn: vá nó cần
khoá `_code`, đã ghi ra `BACKLOG.md` gốc repo.

## 2026-09-06 — `claude-gemini-hoan-thien`: nút CHAT ZOOM hỏi nhầm câu hỏi

Đức báo nút phóng to hỏng. Lane `claude-flow-active` đã vá **phần chẩn đoán** ở gói Flow cùng ngày
và ghi rõ *"chưa phải bản vá gốc bệnh"*. Đọc lại ở gói này thì **tìm ra gốc bệnh**, và nó là di
sản fork, đúng một dòng.

**Cổng của nút phóng to hỏi câu hỏi của RUNNER.** `isProviderUrl` trả lời *"một run có được phép
gõ vào tab này không"*, nên nó đòi đúng mặt `/app` hoặc `/images` — chặt là đúng, vì sai chỗ đó là
gõ prompt nhầm chỗ. Nhưng nút phóng to chỉ gọi `chrome.tabs.setZoom`: **không gửi gì, không gõ
gì.** Hỏi nhầm câu làm nó tự xám trên mọi trang Gemini khác.

**Đo được: 6 trên 10** hình dạng địa chỉ Gemini thường gặp bị chặn — trang gốc, một Gem, hội thoại
chia sẻ, trang cài đặt. Nhánh ChatGPT, nơi nút này chạy tốt, hỏi đúng câu origin. Vá: thêm
`isProviderOrigin` vào adapter (danh sách host ở **một** chỗ, không gõ cứng regex vào
`sidepanel.js`) rồi cho cổng hỏi câu đó. Vẫn đòi `https` + đúng host.

**Bệnh thứ hai, port từ lane kia:** nút xám có **bốn** nguyên nhân khác hẳn nhau, cả bốn chui qua
`catch (_) {}` rồi cho ra một kết quả câm — đó là lý do không ai chẩn đoán được từ xa. Nay mỗi
nguyên nhân tự khai vào tooltip, gắn lên **cả cụm lẫn từng nút**.

**Phép kiểm zoom cũ là đồ chết, chứng minh bằng máy:** nó tự viết lại logic bằng regex của
**ChatGPT** ngay trong file test, và **xanh cả 9** lượt đột biến vào `sidepanel.js`. Thay bằng
`tests/zoom-control-smoke.mjs` — trích thân hàm thật rồi chạy; đột biến **11/11** bị bắt. Chi tiết
và cái bẫy tự dính lúc viết nó: `N-14` ở `BACKLOG.md` gốc repo.

**NGHIỆM THU 06/09:** Đức nạp lại tiện ích và xác nhận **nút bấm được**. Đây là phép đo duy nhất
kết luận được chuyện này — suite không chạm Chrome thật. File test chết **đã xoá**, Đức duyệt cùng
lượt; suite 91 → 90.

**Gói Flow Video:** Đức báo nút bên đó **cũng dùng được**. Đo lại `origin/main` thì gốc bệnh vẫn
còn nguyên (chỉ có bản vá chẩn đoán) — nó cho qua đúng trang công cụ Flow mà Đức dùng, và chỉ cắn
ở trang `labs.google` khác. Đã **hạ mức** `N-13` ở `BACKLOG.md` gốc repo kèm số đo.

## 2026-09-06 — `claude-gemini-hoan-thien`: đẩy kèm, và một lượt ghi lấn vùng đã được Đức duyệt

**Ghi lấn vùng — Đức duyệt giữ.** Tôi ghi hai dòng đếm số máy sinh vào `FEATURE-PARITY.md` trong
khi `claude-assistant` giữ `_root`. Lệnh `claim.mjs --take` **đã từ chối đúng**, nhưng tôi nối nó
vào một ống, mà mã thoát của ống là mã thoát của lệnh cuối (`tail`) — luôn 0 — nên `&&` phía sau
vẫn chạy. Lớp bảo vệ chạy hoàn hảo rồi bị **một ký tự `|` nuốt mất**. Đã ghi thành `N-15` ở
`BACKLOG.md` gốc repo.

Đức chốt 06/09: **giữ**, vì nội dung nằm trọn trong khối máy sở hữu (không chạm chữ của người,
không ai mất việc), còn gỡ ra thì bảng đối chiếu lệch với code và cổng xuất bản chặn **mọi** phiên
— kể cả phiên đang giữ chính khoá đó.

**Đẩy kèm — kể tên đủ, theo luật `--carry` (ADR-0005).** Lượt đẩy này cuốn theo **7 commit của hai
lane khác**:

| Lane | Số commit | Việc |
|---|---|---|
| `claude-hang-doi` | 4 | `B-36` đo đường ghi Chrome Downloads · đóng `B-27` · `Y-15` |
| `claude-assistant` | 3 | `N-10` cấm nhả khoá hộ lane khác · `N-06` sửa brief Scouter |

Cả bảy đều **có nhãn `Lane:`** nên quy thuộc được; không commit nào vô chủ. Đức duyệt tường minh
06/09 dù luật đã miễn hỏi từ 05/09 — tôi vẫn hỏi vì lần này đông bất thường.

## 2026-09-06 — `claude-gemini-hoan-thien`: hai lệnh Bridge, và một lỗ trong chính phép ghim của tôi

**`queue.proposal.withdraw`** — agent rút lại đề xuất của chính nó khi Đức chưa bấm duyệt. Không
phải chép thẳng: bảng trạng thái gói này **chưa biết** trạng thái "đã rút" nên `transition()` sẽ
ném. Hai chốt, và **thứ tự của chúng là load-bearing**: chốt chủ sở hữu phải chạy **trước** chốt
trạng thái — đảo lại thì một agent lạ dò được đề xuất của agent khác đang ở trạng thái nào, chỉ
bằng cách đọc mã lỗi khác nhau. `"APPROVING"` cố ý **không** rút được: lúc đó một lượt ghi
checkpoint đang bay.

**`chat.read`** — AI vận hành tự đọc được hội thoại thay vì nhờ mắt Đức. Ba trạng thái trả về
phải phân biệt được, và đó là chỗ đáng canh nhất: *selector đã chết* khác hẳn *hội thoại trống* —
một cái bảo chờ thêm, một cái bảo đi sửa selector. Lấy **ĐUÔI** chứ không phải đầu: `slice(0, n)`
bỏ mất đúng câu vừa tới trong khi payload **vẫn trông đầy đủ**, đủ trường, đủ số lượt, không lỗi.

**Lỗ trong phép ghim của tôi, đo được và đã vá.** Bỏ dòng ghi *"ai đã rút"* mà test vẫn **xanh** —
vì tôi chỉ kiểm ở tầng lõi, mà lõi thì giữ đúng thứ được đưa vào; chỗ quên đưa nằm ở tầng xử lý.
Phát hiện nhờ chạy đột biến, không nhờ đọc lại. Đây là lần thứ hai trong ngày một phép kiểm tôi
vừa viết bị chính đột biến bắt lỗi.

**Số.** Suite 90 → **92**, xanh hết. Thử phá **19/19** bị bắt (10 + 9).

**Còn mở.** Hai lệnh cuối (`output.set_folder_hint`, `profiles.remove`) **không phải port**: gói
này thiếu hẳn lớp dưới — `DacOutputProfiles` không có `list`/`setHint`/`remove`, và `sidepanel.js`
không có hai hàm mà cả hai lệnh đều gọi. Đã ghi rõ vào `G-04`.

## 2026-09-06 — `claude-gemini-hoan-thien`: soát README bằng cách đối chiếu code, không đọc suông

Hai mục README đóng cùng lượt. Một trong hai **đã xong từ 03/09 mà không ai đánh dấu**, nên bộ
đếm nợ tính dư một việc suốt ba ngày.

**Ba chỗ sai thật.** Nặng nhất: README viết *"`npm run test:worker` runs only this worker"* —
lệnh đó trỏ vào suite gói **ChatGPT**. Tin nó là chạy nhầm suite rồi kết luận nhánh Gemini xanh
**trong khi nó chưa chạy một dòng nào**; cùng con bệnh *xanh giả về mặt phủ* của `G-09`. Hai chỗ
kia nhẹ hơn: một số phiên bản của nhánh khác (`V0.3` — gói này là `0.2.0`), và một câu đòi dọn
hai script đã bị xoá từ 03/09.

**Ba chỗ nghi sai mà hoá ra ĐÚNG — và đây mới là phần đáng kể.** Tên hai file mẫu mang chữ
"ChatGPT" là **tên thật** của chúng. Tám giá trị cấu hình **khớp `runner-core.js` từng cái một**.
Và các lệnh CLI viết bằng gạch nối là **đúng** — đó là tên lệnh CLI, khác tên method Bridge viết
bằng dấu chấm. Cả ba đều suýt bị tôi "sửa" thành sai. Phân biệt được chỉ vì đo trước khi sửa.

**Việc phát sinh, làm luôn.** Hai lệnh Bridge tôi thêm sáng nay **chưa có trong CLI** — thêm rồi
mà không gọi được từ dòng lệnh thì Đức và AI vận hành không dùng tới. Đã thêm, kèm một bộ đọc số
có trần riêng: bộ dùng chung chặn cứng ở **100**, nên `--max-chars 8000` bị từ chối **oan** — và
lỗi đó **chỉ nổ khi người dùng gõ đúng thứ tài liệu bảo họ gõ**, vì gọi trần thì giá trị mặc định
đi qua nhánh khác. Đã ghim riêng một ca cho đúng chỗ đó.

**Số.** Nợ gói **9 → 7**. Suite 92/92 xanh. Thử phá **7/7** bị bắt.

**Còn mở, ghi ra `BACKLOG.md` gốc repo:** `N-17` — `npm run test:worker` mang tên nghe như dùng
chung nhưng trỏ cứng vào một gói. Đo phạm vi rồi mới ghi: chỉ **hai** README nhắc tới nó, và với
gói ChatGPT thì câu đó **đúng**. Lỗ hẹp, không phải bốn chỗ hỏng. Sửa `package.json` cần `_root`.

## 2026-09-06 — `claude-gemini-hoan-thien`: không xây tính năng, đặt một cái bẫy

Đức trả lời câu hỏi chặn hai việc lớn nhất: **Gemini chưa bao giờ trả hai ảnh trong một câu trả
lời, và chưa bao giờ hỏi lại "thích ảnh nào hơn"** — *"case này tôi chưa gặp, bao giờ gặp ta sẽ
capture và vá."*

**Hai mục cùng MỘT tiền đề, nên một câu trả lời đóng cả hai.** Chú thích đầu `ab-poll-core.js`
của nhánh kia nói thẳng: ChatGPT đôi khi trả một prompt ảnh bằng **hai ảnh cộng một câu hỏi
chọn**, và câu hỏi chưa trả lời thì **khoá ô soạn** làm job sau treo vĩnh viễn. Tức "nhiều ảnh
một job" và "poll A/B" là **cùng một hành vi trang nhìn từ hai phía**. Gemini không làm thế thì
cả hai đều không có đối tượng — xây cho một tình huống chưa ai thấy bao giờ là **tự thêm nợ**.

**Nhưng "bao giờ gặp ta sẽ vá" chỉ đúng nếu có thứ gì đó BÁO ĐƯỢC là đã gặp — và không có.**
Nếu Gemini trả hai ảnh trong một lượt, job dừng an toàn với `AMBIGUOUS_POST_TURN_IMAGE`; nhưng
mã đó **cũng** nổ khi có hai lượt riêng mỗi lượt một ảnh, và sổ cái ghi `fresh.eligible: 2` ở
**cả hai ca**. Hai nguyên nhân khác hẳn nhau mà nhìn giống hệt.

**Đặt bẫy thay vì xây tính năng.** Sổ cái nay ghi số ảnh **của từng lượt**: `[2]` là ca đang chờ
bắt, `[1, 1]` là chuyện khác. Đúng hai dòng, không đổi một hành vi nào.

**Và cái bẫy suýt thành đồ trang trí.** Bản đầu đếm đúng nhưng **không tới được sổ cái** — dòng
ghi nhận liệt kê từng trường một, nên trường mới không tự đi theo. Bắt được vì tôi hỏi "nó có
thật sự tới nơi không" chứ không phải vì đọc lại. Đã ghim riêng một khẳng định cho đúng chỗ đó.

**Số.** Nợ gói **7 → 5**. Suite 93/93. Thử phá **5/5** bị bắt.

**Đẩy kèm — kể tên đủ, theo luật `--carry` (ADR-0005).** Lượt đẩy cuối cuốn theo **11 commit của
hai lane khác**: `claude-flow-active` (7 — gói Flow Video) và `claude-scouter-seed` (4 — chuyển
Scouter ra gói riêng, chạm `_root`/`_docs`/`_code`). Cả 11 đều có nhãn `Lane:`, không commit nào
vô chủ.

**Còn mở.** Hai lệnh Bridge cuối (dựng một phần hệ hồ sơ đầu ra, không phải chép code) là việc
lớn nhất tôi tự làm được. Hai mục P1 chờ **một buổi Đức ngồi bấm**. Một mục cần khoá gốc repo.

## 2026-09-06 — `claude-gemini-hoan-thien`: hai lệnh Bridge cuối; gói còn ba việc, không việc nào AI làm được

`G-04` đóng — 4/4 lệnh. Và đúng như dự đoán, hai lệnh cuối **không phải port**: phải thêm `list` /
`setHint` / `remove` vào lớp kho hồ sơ đầu ra trước. Hai hàm sau dùng **đọc-sửa-ghi trong MỘT giao
dịch** — một phát hiện audit của Codex, port kèm code: tách ra hai giao dịch riêng có thể **hồi
sinh một handle cũ** đè lên một `bind()` chạy song song.

**Cố ý KHÔNG port hai thứ nhánh kia gọi:** chúng là cửa vào **cả một hệ giao diện "việc cần chú
ý"** mà gói này không có. Hai lệnh này chỉ cần vẽ lại thẻ đầu ra, và `renderOutput()` đã làm đúng
việc đó.

**Ba chốt TỪ CHỐI được ghim riêng, vì cả ba đều dính tới nơi ảnh của Đức được ghi xuống:** nhiều
hồ sơ mà không nêu tên thì **từ chối và kể tên chúng ra** (đoán ở đây là ghi đường dẫn của pilot
này lên pilot khác, và cái sai chỉ lộ ra lúc ảnh đã nằm sai chỗ) · **hồ sơ đang dùng thì không gỡ
được** (gỡ là để lỗi nổ giữa một lượt ghi ảnh chứ không nổ ở đây) · câu trả lời **tự khai**
`disk_files_deleted: false` — một lệnh tên `remove` phải nói rõ nó xoá cái gì.

**Tôi tự dính đúng cái mình đang đi cấm.** Bộ kiểm đường dẫn chặn ký tự vô hình và ký tự đổi
chiều — thứ làm một đường dẫn **hiện ra khác hẳn đường dẫn được copy**. Nhưng heredoc nuốt mất dấu
thoát, nên các mã `\uXXXX` **biến thành ký tự thô nằm trong mã nguồn**: git sẽ coi file là nhị
phân và giấu diff vĩnh viễn. Rồi tôi lặp lại y hệt trong chính file test. Đã sửa cả hai và **ghim
một khẳng định cấm byte thô** trong mã nguồn.

**Số.** Nợ gói **5 → 3**. Suite 94/94. Thử phá lượt này **15/15** bị bắt (10 lệnh + 5 CLI).

**Còn lại đúng ba việc, và không việc nào tôi làm tiếp được.** Hai mục P1 chờ **một lượt Đức ngồi
bấm** — bấm dừng giữa chừng, và bấm sang tab khác giữa chừng; gộp được vào một lượt. Việc thứ ba
(gộp 8 module trùng nhau) cần khoá gốc repo. `STATUS.md` đã viết lại theo đúng thực trạng này.

## 2026-09-07 — `claude-gemini-g08`: sổ nói "tám", máy đếm "bảy" — và cái thứ tám đã trôi dạt mười ngày trước

**Việc đầu là ĐO LẠI, không phải sửa.** Nhãn **[ĐO]** chỉ nói con số từng được máy đếm — không
nói đếm hôm nào. Đếm lại md5 từng file `.js`: **bảy** module còn giống hệt, không phải tám.

**Cái thứ tám là `xlsx-codec.js`, và nó trôi dạt ngày 28/08.** Truy bằng lịch sử khối máy sinh
trong `FEATURE-PARITY.md`: bản 27/08 ghi 8 và kể tên nó, bản 28/08 ghi 7 và tên nó biến mất. Nay
lệch 7 dòng (371 GPT / 364 Gemini). **Bộ sinh làm đúng việc của nó** — ghi lại sự trôi dạt, ngay
hôm sau. Chỉ là không ai đọc. Một con số trong tài liệu không phải cái chuông.

**Nên tôi dựng cái chuông:** `tests/shared-modules-no-drift-static.mjs`. Bảy module lệch một byte
là ĐỎ ngay. **Không gộp file nào** — đó là quyết định kiến trúc,
không phải một lượt dọn dẹp, và chép bản này đè bản kia chính là cách bản trôi dạt ra đời.

**Ba chọn lựa đã cân, ghi lại để phiên sau khỏi cân lại:**
① *Ghim mọi file trùng tên* — không. 24 file khác nhau **có chủ đích** (hai nhà cung cấp, hai
DOM), ghim hết là đỏ vĩnh viễn, mà đỏ vĩnh viễn thì người ta tắt.
② *So byte trần* — không. Máy đặt `core.autocrlf=true`, nên một lượt `git checkout` đổi kiểu
xuống dòng là đỏ oan dù không dòng code nào đổi. So sau khi chuẩn hoá CRLF→LF, cùng cách bộ sinh đo.
③ *Ghi test vào gói ChatGPT* — không, gói đó đang do `claude-gpt-don-no` giữ; phép ghim **chỉ đọc** sang đó.

**Đếm mỏ neo, vì "không tìm thấy" phải ĐỎ chứ không được thành SKIP:** đếm số cặp mở được, thiếu
một cặp là đỏ. Thư mục phiên bản nhánh kia đọc từ đĩa, không gõ cứng `v0.1.0`.

**Thử phá 4/4 đúng như thiết kế:** đổi một byte ở hai file khác nhau → ĐỎ · xoá một file một bên →
ĐỎ · **chuyển sang CRLF → vẫn XANH**, cố ý, đó là nhiễu chứ không phải trôi dạt.

**Số.** Suite gói 95/95. Nửa *chống trôi dạt* của G-08 đã xong; nửa *gộp vào `workers/_shared/`*
vẫn mở — cần khoá `_root` và cần Đức chốt.

## 2026-09-07 — `claude-gemini-nghiem-thu`: lớp nhiều hồ sơ ĐẠT bằng 0 credit; lượt live G-01 dừng trước khi tiêu đồng nào

**Việc miễn phí xong trọn.** Bốn bảo đảm của lớp nối nhiều hồ sơ đều ĐẠT, đo qua Bridge thật với
hai hồ sơ thật: kể đúng hồ sơ kèm tên Đức đặt · quên `--target` thì `TARGET_AMBIGUOUS` chứ
**không tự chọn** · đích lạ thì `TARGET_NOT_CONNECTED` · `served_by` đúng đích ở **mọi** lượt.

**`legacy: false` KHÔNG có nghĩa "đang chạy code mới nhất".** Hai hồ sơ cùng `legacy:false`,
cùng `extension_version: 0.2.0`, mà một cái thiếu đúng bốn lệnh thêm 06/09 — nó còn ôm bản cũ
trong RAM. Muốn biết thì **đối chiếu bộ lệnh `capabilities`**.

**Một phép đo suýt thành báo cáo sai — phần đắt nhất của phiên.** `run.status` timeout **5 trong
6** lượt liên tiếp trong khi `ledger.read` cùng hồ sơ trả lời 6/6 — cùng context, cùng deadline,
cùng đường dispatch. Kết luận gọn: *"`run.status` hỏng riêng"* — mà đó là camera canh lúc bấm
dừng, nên nếu đúng thì nó **chặn cả G-01**. Nó sai. Phép đo tách được là **xen kẽ ba method và
in giờ từng lượt**: lỗi đóng theo **THỜI GIAN**, không theo **METHOD** — ba lượt đầu timeout
(mỗi method đúng một lượt) rồi 15 lượt sau xanh trong 4 giây. Cửa sổ đánh thức service worker.
Gọi liên tiếp MỘT method thì hai nguyên nhân nhìn giống hệt nhau.

**Lượt live KHÔNG chạy, và đó là quyết định chứ không phải sự cố.** Không hồ sơ nào hội đủ điều
kiện: một cái panel đóng + code cũ; cái kia code mới + panel mở nhưng **không có tab hội thoại
Gemini đang hoạt động** để `bindRunTab()` khoá vào. Giao thức **cố ý không có** lệnh mở tab, nên
đây là việc Đức bấm. Đã dừng, **0 credit**, không sửa một dòng code nào.

**Cần BỐN thứ trên MỘT hồ sơ:** nạp lại tiện ích · mở tab `/app` và **để nó là tab đang hoạt
động** · mở side panel · bật **Chế độ phát triển**. Cái thứ tư **không kiểm được từ xa**: lệnh
duy nhất soi nó là `run.trial` — chính là lệnh tiêu tiền.

**Số.** Suite gói 95/95. Bằng chứng: `evidence-multiprofile-nghiem-thu-20260907/`.
`G-01`/`G-02` vẫn MỞ — gộp được vào **một** lượt Đức bấm.

<!-- HANDOFF-THANG: 2026-09 -->

## 2026-09-07 — `claude-gemini-crlf`: soi bệnh CRLF cả gói, đúng hai phép kiểm đỏ, đã nới

**Đo trước khi vá.** Đếm trước: suite **95/95**. Trên đĩa **229/229** file text là LF, trong git
**251/251** LF — đĩa và kho đều sạch, nên ở gói này bệnh là *tiềm ẩn*, không phải đang phát.

**Ép CRLF cả gói thì đúng HAI phép kiểm đỏ**, cùng một lý do: mỏ neo viết `
` trần.
`content-image-static.mjs:127` (`\|\| remoteVerifiedResult,
\s+ready:`) và
`landed-as-requested.mjs:38` (`function downloadLeaf[\s\S]*?
}

function pathTailMatches`).
Nới thành `?
`, **không nới rộng hơn**. Suite **95/95 mỗi chiều**.

**Đột biến 8/8 bị bắt, và chạy LẠI ĐỦ 8 con ở CHIỀU CRLF** — cái phải chứng minh không phải "mỏ
neo còn răng ở LF" mà "nới xong vẫn còn răng ở chiều mới nhận". Con quan trọng nhất là con thử
nới quá tay: chèn một hàm lạ giữa `downloadLeaf` và `pathTailMatches` — **vẫn ĐỎ**.

**Hoàn nguyên cố ý KHÔNG dùng `git checkout`:** chụp sha256 cả gói, ép, ép ngược, đối chiếu —
**229/229 khớp từng byte**. `git checkout` xoá việc chưa commit của lane khác.

**Một bẫy đã mắc thật:** bộ đột biến hoàn nguyên bằng `git checkout`, và **một lượt không ăn** —
con M7 (`pathTailMatches` luôn `return true`) nằm lại, làm suite đỏ *sau khi đã xong*. Nhìn tưởng
bản vá hỏng. Bài học: **`git status` ngay trước lượt chạy kết luận**.

**Phát hiện phụ, có giá:** gốc bệnh **ĐÃ VÁ 06/09** — gốc repo nay có `.gitattributes` với
`* text=auto eol=lf` (khối `Y-17`). Mục `F-27` của gói Flow (viết 05/09) vẫn ghi gốc bệnh là
*còn mở, cần Đức chốt*; nó **lạc hậu**.

**Số.** Suite 95/95 → 95/95. Hai file test sửa, không file mã nguồn nào.
**Còn mở:** gói `duc-auto-chatgpt` **chưa soi** — khoá do `claude-b36-vaA` giữ; câu lệnh soi và
điều kiện đóng ở `G-14` của `BACKLOG.md`.

## 2026-09-09 — `claude-luat-rasoat`: ba vế đã chết trong `AGENTS.md`, không đụng mã

Lượt rà luật đầu tiên của gói này (N-57). **Không sửa một dòng mã nào** — chỉ `AGENTS.md`.

**Luật 8 cấm harness đã chết từ 24/08 và nằm đây 16 ngày.** ADR-0022 của chính gói tên là
*"Sửa luật 8 AGENTS.md: cho phép xây harness test bằng Chrome THẬT"* — một chỉ thị sửa đúng dòng
đó. Nhánh ChatGPT sửa ngay hôm ấy; nhánh này thì không. Nay luật 8 nói đúng: **preview pane vẫn
cấm, harness Chrome thật thì được**, kèm liên kết ADR-0022.

**Luật 7 thiếu HẲN `run.trial`.** Gói có method này thật (`MAX_TRIAL_JOBS = 30` trong
`dev-trial-core.js`) và nó **tiêu credit thật**, nhưng luật vàng chỉ nói `run.start`/pause/resume
không tồn tại. Ai chỉ đọc file này sẽ tin Bridge không chạy được gì. Đã ghi đủ bốn nắp cứng kèm
bốn ADR của Đức: 0027 (cho phép) · 0032 (≤30 job) · 0028 (cách nhau ≥5 phút) · 0031 (một chuỗi
liên tục). Trần thật vẫn khai ở **đúng một chỗ** trong mã.

**Luật 1 bảo vệ ba thư mục KHÔNG tồn tại trong gói này** — `pilot-03/`, `pilot-06/`, `pilot-06B/`
là của nhánh ChatGPT, chép sang lúc fork; còn `pilot-04/`, `Batch-SX-01/`, `Pilot-G2-01/`,
`Pilot-REF-01/` có thật thì không được nêu. Viết lại theo **hình dạng tên** (`pilot-*/` …), không
theo danh sách gõ tay. Hai dòng bản đồ file cũng vậy.

**Bảng vai** nói Claude *"không được tự commit/push"*, đá với luật 6 của chính file và với
`AGENTS.md` gốc mục 2. Đã sửa, và ghi rõ điều thật sự bị cấm là `git push` trần.

**Mười nhóm câu luật lặp với nhánh ChatGPT là CỐ Ý** — ghi lý do ngay tại hai mục *Luật vàng* và
*Core / Companion*: một phiên làm ở gói này không bao giờ đọc file gói kia, và hai bản **phải**
được phép lệch nhau. Cái lệch mới là bệnh, không phải cái giống — chính phép ③ lôi ra ba vế trên.

Suite gói: **95/95 xanh** (không chạm mã). Khoá vùng do Đức mở: *"tất cả tôi đều mở freeze khóa
để triển khai nếu bạn cần."* Còn mở: **59/67 quyết định của gói mồ côi** → `N-58` ở sổ nợ gốc.

## 2026-09-09 — `claude-luat-rasoat` (lượt 2): bản hiệu lực nay MANG sổ cái của gói (N-58)

**59/67 quyết định của gói là mồ côi** — `AGENTS.md` không trích số hiệu nào của sổ cái chính nó.
Soi từng cái, không lấp bằng cửa miễn trừ:

- **30 luật đang sống** → mục mới **Sổ cái của gói** trong `AGENTS.md`, nhóm theo chủ đề. Hai cái
  đáng kể mà ai chỉ đọc luật vàng sẽ không biết: **ADR-0046** ghim **CẤM dựng lại** hai ngõ cụt đã
  bị bằng chứng bác bỏ (chờ blob đổi sang `lh3`, và cuộn ảnh vào tầm mắt), và **ADR-0051** bất đối
  xứng **cố ý** giữa `run.stop` và `chat.reload`.
- **25 bản ghi lịch sử** → khai `.repo-structure.json` → `luat.mo_coi_co_y`, **ba nhóm**, mỗi nhóm
  một lý do thật: đã lên bản hiệu lực gốc repo · một lượt đổi đã xong · bản ghi chẩn đoán.
- **4 thật sự đã chết** → đánh dấu `Vế đã chết` đúng khuôn máy đọc được: `0019` (bị 0020/0025
  thay) và `0038`/`0039`/`0040` (phép chờ blob, bị **0041** THÁO ngay cùng ngày).

Phép ② của gói: **59 → 0**. Không chạm mã; suite gói không đổi.
