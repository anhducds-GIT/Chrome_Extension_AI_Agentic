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
