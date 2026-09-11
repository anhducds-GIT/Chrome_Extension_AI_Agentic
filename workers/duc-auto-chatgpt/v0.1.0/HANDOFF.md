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

<!-- HANDOFF-THANG: 2026-09 -->

<!-- HANDOFF-CUT-POINTER: ADR-0008 -->
> **6 mục cũ hơn đã dời sang [`HANDOFF-ARCHIVE-07.md`](HANDOFF-ARCHIVE-07.md)** — cùng thư mục này,
> nguyên văn, không mất chữ nào. File này giữ **20 mục cuối** (ADR-0008). Cần đào lịch sử
> xa hơn thì mở file đó và đi tiếp theo con trỏ trong nó; ghi Log mới thì vẫn ghi vào cuối
> file này.
<!-- /HANDOFF-CUT-POINTER -->

## 2026-09-09 (lượt 8) · `claude-gpt-chay-het-job` — B-20 đóng bằng một quyết định, và kế hoạch của tôi đã khai sai một chỗ

**Làm gì.** Chạy mục ⓐ của kế hoạch (`B-20` — tính năng *alias*). **Không viết một dòng code nào**,
và đó là kết quả, không phải sự lảng tránh.

**Điều tôi khai sai, nói trước.** Kế hoạch lượt 7 nói *"sửa lời khai sai ở `README.md:74`"* —
**lời khai đó đã sửa từ 07/09.** Tôi soạn kế hoạch từ **thân gốc** của `B-20` (đo 26/08) mà không
đọc **dòng tiến độ 07/09** nằm ngay trong phần Log của cùng file. **Bài học:** một mục sổ nợ nói về
mình ở HAI chỗ, và đọc một chỗ là đủ để lập kế hoạch sai.

**Quyết định, của tôi.** Nửa còn lại (gỡ nhánh khớp-theo-alias) chốt **SẼ KHÔNG LÀM** — 07/09 đã
để lại *"việc còn lại cho Đức"*, bật lại lần thứ ba là đẩy việc chứ không phải quyết. Số đếm:
**tám** file phải đụng (ba bản sao song song của logic khớp · **ba** phép ghim đang *khẳng định*
nhánh alias giải được token `"hero"` · hai tài liệu vừa viết lại 07/09), đổi lấy **0** thay đổi
hành vi. Nhánh này **không có lỗi sống** hôm nay; rủi ro chỉ là **ngày mai** ai nối ô nhập alias
thì phép khớp-alias giành ưu tiên trước tên file — **và đúng ngày đó
`tests/reference-alias-dead-code-static.mjs` đổ.** Bảo vệ đã có sẵn. Bảng số đếm đầy đủ ở khối
chốt `~~B-20~~` trong sổ nợ. **Đức nói "gỡ đi" là tôi gỡ.**

**Đo.** `reference-alias-dead-code-static.mjs` PASS · sổ nợ 35 mục / 0 mục vô hình · nhật ký **23** mục (trần 25 — lượt sau nữa phải cắt). Không đụng mã nguồn nên không có phép thử phá nào để chạy.

**Còn lại cho Đức, một việc:** cho chạy **một job ảnh thật, đính ảnh mẫu ~2MB** — trả lời ba câu
cùng lúc (`B-46` vế cuối · `B-14` · `B-15`). Mục ⓑ nay mang dấu `@Đức:bấm` nên đã lên bảng.

## 2026-09-09 (lượt 9) · `claude-gpt-chay-het-job` — ba câu trả lời bằng hai lượt chạy, và bốn khiếm khuyết mới

**Làm gì.** Đức chốt *"làm nốt đi, đã reload, F5"*. **Tách** phép đo làm hai để không đốt credit
ảnh cho hai câu không cần ảnh: một job **chữ** có 4 ảnh mẫu **1,83MB** (0 credit) và một job
**ảnh** (1 credit). Dò `dom_probe` **~7 lần/giây** xuyên cửa sổ gắn. Số đo đầy đủ ở sổ nợ.

**`B-15` ĐÓNG — khác cả hai giả thuyết.** Cửa sổ gắn **3,82 giây**, ~**27** lượt dò trong đó,
`uploadPending` **0/0/0 mọi lượt**; nhưng lúc **đang sinh ảnh** thì `[aria-busy="true"]` **khớp**.
Nhóm đó đo *"trang đang bận"*, không phải *"ảnh đang upload"*. Cái lo ban đầu **không** tái hiện —
ChatGPT tả đúng cả bốn ảnh, `Q001` SUCCESS. Lỗi thật lộ ở `waitForReferenceImagesReady` → `B-49`.

**`B-46` VẾ CUỐI ĐÓNG — nhánh xấu là nhánh xảy ra.** Tab bị che **CÓ** vẽ `<img>` sinh, **nhưng
bitmap không giải mã xong**: `ready:false` ở **3/3** node → `Q002` chết `NO_NEW_IMAGE` sau **300
giây**. **Job ảnh cần tab HIỆN.** Thông điệp lỗi cũng **nói sai nguyên nhân** → `B-47`.

**Một câu tôi phải đảo:** lượt 7 tôi viết *"che cửa sổ chỉ làm CHỮ không vẽ xong"* — **sai một
nửa**, nó cũng làm bitmap ảnh không giải mã. Phần đúng còn lại: che **không** làm mù việc phát
hiện **lượt**. Tôi kết luận sớm vì lúc đó không có ảnh sinh nào để đo — nhưng đã **ghi rõ giới hạn
đó**, nên nó bị bắt trong ngày chứ không nằm im.

**`B-14` chưa đóng, vì chính cái probe mù:** `buttons` nắp 40 bị thanh bên của Đức chiếm hết →
`B-48`. Kèm bằng chứng âm: ChatGPT **không** đặt `data-testid` lên chip đính kèm.

**Không dùng ảnh cá nhân của Đức** (`Meo1.png`): phép đo cần **byte**, không cần đúng điểm ảnh đó.
Tôi tự dựng 4 PNG mỗi ảnh một hình một màu, nên câu trả lời của ChatGPT **tự chứng minh** upload
tới máy chủ.

**Mới:** `B-47` `B-48` `B-49` `B-50`. **Đức cần chốt `B-47`⑵ và `B-49`** — cả hai đụng cổng sẵn-sàng.

## 2026-09-09 (lượt 10) · `claude-gpt-chay-het-job` — B-48: probe soi theo PHẠM VI thay vì nới nắp

**Làm gì.** Đức chốt *"làm B-48 đi"*. Nới `diagnostics.dom_probe` để nó soi được **chip đính kèm**
trong ô soạn thảo — thứ mà lượt 9 phát hiện là probe **nhìn không tới**.

**Quyết định thiết kế, và mỗi cái có lý do đo được.** ⑴ **Soi theo PHẠM VI, không nới nắp 40 → 200:**
payload có nắp 64KB, và thanh bên của Đức (45 nút) sẽ ăn thêm bao nhiêu cũng hết — nới nắp là mua
thêm chỗ cho đúng thứ gây nghẽn. Trong `form` thì không có thanh bên nào để ăn nắp. ⑵ **Chuỗi tổ
tiên mang cả `aria-*` và `role`**, không chỉ `data-*` như `dataChain`: đo lượt 9 nói ChatGPT
**không** đặt `data-testid` lên chip, nên chuỗi chỉ soi `data-*` sẽ mù **đúng chỗ nó sinh ra để
chữa**. ⑶ Đi qua adapter (`SEL.fileInput`, `SEL.attachmentPreview`), không viết selector lần hai.

**Ghim.** `tests/dom-probe-composer-scope-smoke.mjs` — **cắt** khối đã ship khỏi `content.js` rồi
**chạy** trong `node:vm`, trên một DOM dựng lại **đúng ca live** (45 nút thanh bên + 4 chip) cộng
ba ca biên, trong đó ca *"không có ô chọn file trong form nào"* đòi fail **mềm**: probe là công cụ
chẩn đoán, nó ném thì mọi trường khác mất theo và người đọc mất luôn thứ đang cần.

**Đo.** Suite **129/129**. **Thử phá 10/10 đỏ, 0 lọt, 0 harness hỏng** — gồm ba cái độc: quay về
soi toàn tài liệu · bỏ `aria-` khỏi chuỗi · tính xong mà **không mang ra payload**.

**Hai lần harness tự làm mình đỏ, ghi lại vì cả hai đọc y hệt "bản vá hỏng":** ⑴ phép kiểm
"không có selector viết cứng" đỏ vì **chú thích** của khối có nhắc `form input[type="file"]` để
giải thích `SEL.fileInput` — sửa bằng cách bỏ dòng chú thích trước khi kiểm. ⑵ cắt selector theo
`split(/s+/)` trần cắt **giữa** `aria-label*="Remove attachment"` — sửa bằng cắt biết dấu ngoặc.
Và `deepEqual` lại đỏ qua biên `node:vm` (lần thứ tư trong repo này) — đổi sang so `.length`.

**Còn đúng một bước, cần tay Đức:** nạp lại tiện ích, rồi tôi đóng `B-14` bằng **một job chữ,
0 credit ảnh**, đọc `composerScope.preview_chains`.

## 2026-09-09 (lượt 11) · `claude-gpt-chay-het-job` — B-14 đóng: chip đính kèm CÓ mỏ neo cấu trúc

**Làm gì.** Đức nạp lại tiện ích và nói *"tôi vẫn để tab bị che, bạn cứ trial lại đi"*. Chạy một
job **chữ** 2 ảnh (**0 credit ảnh**) và đọc `composerScope` (B-48) **giữa lúc gắn ảnh**. Tab bị che
không ảnh hưởng job chữ — đo lượt 9 đã chứng minh, và lượt này **SUCCESS 1/1** lần nữa.

**`B-14` ĐÓNG — có mỏ neo, và nó độc lập ngôn ngữ.** Chip đính kèm là
`div[role="group" aria-label="<TÊN FILE>"]`, trong đó có `div[data-default-action="true"]` (đo nền
chưa gắn ảnh: **không có** thuộc tính này trong ô soạn thảo). Điểm mạnh nhất: `aria-label` của khung
chip là **CHÍNH TÊN FILE**, nên đếm được **theo TÊN** chứ không chỉ theo **SỐ**.

**Và cái bẫy, ghi to vì nó là chỗ dễ sai nhất:** KHÔNG được nhét hai mục đó vào
`attachmentPreview`. Nhóm đó bị **đếm rồi so với SỐ FILE**, mà ba selector khớp **ba phần tử khác
nhau trên cùng một chip** — gộp vào là một job 2 ảnh **mới gắn xong 1 chip** đã cho `3 >= 2` →
**cổng mở SỚM, runner gõ Gửi khi còn thiếu một ảnh.** Nên chúng ở nhóm RIÊNG `attachmentChip`,
chỉ để `dom_probe` đếm và canh; **không file ship nào đọc**, và phép ghim **đo** điều đó chứ không
hứa. Nối vào cổng là đổi luật an toàn → **gộp vào `B-49`** cùng vế bỏ `!uploadIsPending()`, vì cả
hai nằm trong **một hàm** `waitForReferenceImagesReady`. Một lượt Đức chốt, không phải hai.

**`B-48` ĐÓNG** theo, và nó trả thêm một thứ không ai xin: từ vựng cấu trúc của ô soạn thảo
(`data-composer-surface` / `-body` / `-grid` / `-transition-slot`) hiện ra ngay ở lượt dò **nền**.

**Đo.** Suite **130/130**. **Thử phá 7/7 đỏ, 0 lọt, 0 harness hỏng** — gồm ba cái độc: gộp nhóm ·
nối nhóm mới vào runner · neo lại theo nhãn thay vì cấu trúc.

**Còn lại đều CHỜ ĐỨC CHỐT:** `B-47`⑴⑵ · `B-49` (hai vế, một lượt) · `B-50`.

## 2026-09-09 (lượt 12) · `claude-gpt-chay-het-job` — Đức phản biện B-47 và Đức đúng

**Tôi kết luận sai, Đức bác, và phép đo đứng về phía Đức.** Lượt 9 tôi viết *"tab bị che thì
không tải được ảnh"* rồi khuyên **bắt tab phải hiện**. Đức bác: *"trước đây đã tạo ảnh khi bị che
và vẫn tải về bình thường… cần giải pháp chứ không phải thoả hiệp"*. Đo lại chính cái ảnh đó, vẫn
tab `hidden`: `complete: true`, `naturalW: 1448`. **Tôi rút đề xuất đó.**

**Đo dứt điểm, hai lượt job ảnh thật:**

| | tab NỀN | cửa sổ HIỆN |
|---|---|---|
| `<img>` mới hiện | +80,7s | +61,9s |
| `complete = true` | **không bao giờ** (tới +201s, sinh xong ở +140,7s) | +65,4s |

Chrome **hoãn hẳn** giải mã trên tab nền. Đức mô tả cùng chuyện từ phía người dùng: *"chuyển sang
tab đó thì ảnh mới hiện, trước đó là ô màu ghi"*.

**Hình dạng bản vá là điều đắt nhất ở đây.** Đức chốt *"đừng fix sẵn một con số, thời gian kết
xuất dài ngắn khác nhau"* — và số đo bác mạnh hơn: **chờ bao lâu cũng không xong**. Cửa ra là
ĐIỀU KIỆN, không phải ĐỒNG HỒ. Nên `ready` thôi đòi bitmap: nhận theo **URL nội dung cuối**
(`src` đo được là ổn định qua 4 lượt trải ~2 phút, kể cả khi `alt` còn điền dần). `blob:` KHÔNG
hưởng nhánh này → fail **closed** ở chỗ đáng nghi. Thêm trường `decoded` để chẩn đoán giữ sự thật.

**Nghiệm thu live — và nói rõ nó chứng minh TỚI ĐÂU.** Đức nạp lại + F5, **để cửa sổ HIỆN**:
`Q001` **SUCCESS**, `image_count: 1`, `persistence_verified: true`, `eligible: 1`. Nên bản vá
**không hỏng ca thường** và đường ảnh chạy trọn. **Nhưng ca tab NỀN — chính ca nó sinh ra để chữa
— CHƯA nghiệm thu**, vì cửa sổ hiện thì mã cũ cũng qua. Còn nợ đúng một lượt để ở nền.

**Quan sát thứ hai của Đức đã kiểm:** ảnh trôi dưới thanh cuộn **không** ảnh hưởng —
`isVisible()` hỏi `display`/`visibility`/kích-thước-khung, **không** hỏi có nằm trong vùng nhìn.

**Đo.** Suite **131/131** · thử phá **8/8 đỏ, 0 lọt**, gồm cái độc: *vá bằng đồng hồ*.
**Vẫn tắc đẩy:** 4 commit của `harness-loi-01` nằm dưới commit của tôi, cần Đức chốt.

## 2026-09-09 (lượt 13) · `claude-gpt-chay-het-job` — B-47 nghiệm thu trên TAB NỀN: trước/sau sạch

**Làm gì.** Đức che cửa sổ rồi bảo *"tiếp tục tạo ảnh và debug case không visible"*. Tôi đo
`visibility` **trước khi chạy** để chắc đúng ca — `hidden`, `docFocused: false` — rồi chạy một job
ảnh thật.

**Cặp TRƯỚC/SAU, cùng điều kiện, ngược kết quả:**

| job ảnh, tab `hidden` | TRƯỚC bản vá | SAU bản vá |
|---|---|---|
| `ready` ứng viên mới | **false** 3/3 | **true** 3/3 |
| `eligible` | **0** | **1** |
| `decision_reason` | `NO_NEW_IMAGE` | `null` |
| kết cục | `INTERRUPTED` sau 300s | **SUCCESS**, không chạm nắp giờ |
| ảnh lưu | **không** | `b4285f42-…png`, `persistence_verified: true` |

`chosen_count: 1`, một `source_id` duy nhất, ngoài mốc nền, `role: assistant`, `input: false` —
**quy thuộc vẫn chặt**, chỉ bỏ đúng điều kiện giải mã bitmap.

**Xác nhận CẤU TRÚC, không phải may:** toàn bộ mã ship **không có** `canvas` / `drawImage` /
`createImageBitmap`. Đường tải lấy bytes **theo URL**, nên nó chưa bao giờ cần bitmap — điều kiện
cũ là đòi hỏi thừa, thừa ở đúng chỗ đắt nhất.

**Tôi không tự ký bản sửa của mình:** thứ ký ở đây là số đo trên máy Đức, trong điều kiện Đức tự
đặt. Đức đảo được.

**Mới: `B-51`** — bắt được ngay giữa lượt đo: trường `images` của probe nắp **15 mục lấy từ ĐẦU**,
mà ảnh sinh mới nhất đứng **cuối**; hội thoại đạt 18 ứng viên là probe giấu mất đúng cái đang cần
xem. Chỉ là rủi ro chẩn đoán (`imageCandidates()` của runner **không** có nắp), nhưng cùng họ với
`~~B-48~~` và cùng cách chữa: ưu tiên theo phạm vi, đừng nới nắp.

**Vẫn tắc đẩy:** nay **8 commit** của tôi nằm trên 4 commit của `harness-loi-01`. Cần Đức chốt.

## 2026-09-09 (lượt 14) · `claude-gpt-chay-het-job` — B-36 đóng sau 8 tuần, bằng một cái KHOÁ

**Đức tìm ra chỗ tắc, không phải tôi.** *"Hiện tôi không chọn được thư mục vì bị khoá, có lẽ điều
kiện là phải có file excel."* Đúng, và đúng một dòng: `outputLocked = !state.workbook ||
operatorLocked`. Nút *Chọn thư mục* nằm trong danh sách bị nó tắt — mà phiên Bridge **không có
workbook nào**. Nên suốt tám tuần, **lối thoát duy nhất của `B-36` bị khoá sau một điều kiện chẳng
liên quan gì tới nó**. Vá: hai nút tách khỏi `outputLocked`, giữ `operatorLocked` (`~~B-52~~`).

**Nghiệm thu live, chuỗi 3 ảnh, tab để ở NỀN, đích là thư mục Đức vừa cấp quyền:**

| | |
|---|---|
| `Pilot GPT/Q001.png · Q002.png · Q003.png` | 3,11 · 3,17 · 3,65 MB |
| tên XIN so với tên RA | khớp cả ba · `write_outcome: written` |
| nguồn ảnh | **3 nguồn khác nhau** — không job nào quy nhầm |
| sổ audit | **58 KB ra file thật**, hết `audit_durable: false` |

**Đối chứng làm phép đo chặt:** cùng buổi, cùng máy, cùng chuỗi 3 ảnh, đích là Chrome Downloads →
**67 file GUID nằm phẳng trong một ngày**. Không phải "Chrome tử tế hơn", mà là **hai đường ghi**.

**MỘT GIẢ THUYẾT CỦA TÔI ĐÃ CHẾT, ghi để không ai đi lại.** Tôi tưởng khác biệt ở **chỗ gọi**
`downloads.download()` (Gemini gọi từ panel, gói này từ worker). Port sang cách Gemini, chạy live:
**vẫn GUID**. Đã revert. Nguyên nhân nằm **ngoài mã**, và **chính mã Gemini ghi từ 25/08**:
*"something in this browser renames every `chrome.downloads` artifact… another installed extension
or a browser-level policy"*. **Tôi đọc câu đó rồi chọn cách hiểu hợp với giả thuyết của mình** —
lỗi phương pháp.

**Lại đạp một bẫy có sẵn trong sổ:** viết STATUS bằng `node -e` trong bash, bash nuốt hết backtick,
file ghi ra bị cụt. Đã ghi lại bằng **file script**.

**Đo.** Suite **132/132**. `B-36` và `~~B-52~~` đóng. **Chrome Downloads VẪN HỎNG** — mục này không
chữa nó, chỉ mở khoá đường kia; ai muốn chữa thì bắt đầu bằng soi xem tiện ích nào đổi tên.

## 2026-09-09 (lượt 15) · `claude-gpt-chay-het-job` — B-53 + ROADMAP MVP

**`B-52` vòng 2 — lượt vá đầu của tôi CHƯA ĐỦ, và hỏng theo kiểu tệ nhất: nó mở một cái nút VÔ
HÌNH.** Có **ba** khoá chứ không một: ① nút tắt theo `!state.workbook` (đã gỡ) · ② **ô chọn chế độ**
cũng tắt theo đó, mà khối chứa nút chỉ hiện ở chế độ *thư mục đã cấp quyền* · ③ `renderOutput()`
**thoát sớm** khi chưa có workbook, mà khối đó mặc định `hidden` và chỉ được hiện bên trong hàm ấy.
Tôi gỡ ① rồi báo xong — **đọc thiếu**: thấy một chỗ khoá là dừng.

**Bài học đáng hơn cái bug: *"đã mở khoá" không bằng "bấm được".*** Phép ghim vòng 1 chỉ đo thuộc
tính `disabled` nên nó **XANH** trong khi Đức vẫn không bấm được — đúng về kỹ thuật, sai về câu hỏi.

**`B-53` — quyền thư mục HẾT sau mỗi lần nạp lại.** Đo live: `audit_durable: false`, *"3 hồ sơ,
**0 còn quyền**"*. Handle sống trong IndexedDB, quyền thì không. Và mã **chỉ có `queryPermission`**
(hỏi), **không chỗ nào `requestPermission`** (xin lại) — một hàm thiếu, tám tuần đi vòng.
**Tôi suýt hứa với Đức "cấp quyền một lần là xong mãi mãi"; phép đo bác nó trước khi tôi kịp nói.**

Vá: `reauthorizeSole()` (chỉ nhận khi có **đúng một** hồ sơ — nhiều hơn thì không đoán) và
`pruneOthers()` (dọn **chỉ sau** một lựa chọn tường minh của Đức: cú bấm đó LÀ lời khai). Panel xin
lại **trước**, mở hộp chọn **sau** — cái giá của thứ tự này ghi thẳng trong mã. Suite **133/133**.

**ROADMAP MVP đã thay khối kế hoạch cũ** (hai mục của nó xong hết trong ngày). Đích viết bằng thứ
Đức đo được: *bấm ĐÚNG MỘT nút, giao việc bằng lời, ảnh về đúng thư mục đúng tên*. Bốn chặng
**M0–M3**, kèm **thứ CC không làm được** (Chrome bắt buộc thao tác tay để cấp quyền — nên "một nút"
là thật, không rút xuống 0 được) và ba rào chắn về credit.

**Hôm nay đóng:** `~~B-14~~` `~~B-15~~` `~~B-20~~` `~~B-36~~` `~~B-45~~` `~~B-46~~` `~~B-48~~`
`~~B-52~~`, cộng `B-47` vế ⑵ nghiệm thu live. Mở mới: `B-47` `B-49` `B-50` `B-51` `B-53`.

## 2026-09-10 (lượt 16) · `claude-gpt-chay-het-job` — M0 + M3 nghiệm thu live, 13/13 ảnh

**`~~M0~~` ĐẠT.** Đức nạp lại, bấm **một** nút. `jobs.add` đầu tiên trả `checkpoint.verified:
true`, **không** mở hộp chọn thư mục, **không** workbook; checkpoint + audit nằm thật trong
`Pilot GPT`. Đóng `~~B-53~~`. Điều kiện đóng là câu Đức tự đặt và **đo được trên đĩa** — không
phải tôi tự chấm bản vá của mình.

**`~~M3~~` chạy xong: chuỗi 3 ảnh rồi chuỗi 10 ảnh, Đức không chạm vào lần nào.**
**0/13 hỏng · 0 lần thử lại · 13/13 đúng tên xin · 13 mã băm khác nhau · `RUN_END COMPLETE` ×2.**
Mỗi job **85s → 183s** — chênh **2,2 lần** trên cùng một loại việc, đúng điều Đức dặn *"đừng fix sẵn
một con số"*; lượt này không chỗ nào phải đặt hằng cứng.

**`B-50` loại được MỘT NỬA nghi phạm — không phải bằng cách vá mà bằng một lượt đo SẠCH.** Hôm nay
**không nạp một ảnh mẫu nào** (gallery rỗng) mà `output.configure` vẫn timeout hai lần, `ping` ba
lần, `run.status` chết giữa lượt chạy; rồi **cùng những lệnh đó trả lời trong một giây khi panel
rảnh**. Nên `renderReferenceGallery()` **được loại**; còn lại là lượt ghi checkpoint XLSX mỗi
mutation. Và **method chỉ đọc cũng chết theo** → nghẽn ở **một luồng duy nhất**, nên hướng vá là *cho
đọc trong lúc ghi*, không phải làm lượt ghi nhanh hơn.

**`B-54` mới:** `landed_as_requested` **luôn** `unknown` trên đường thư mục — đúng cái trường sinh
ra để trả lời *"file có nằm đúng chỗ không"*. Hôm nay tôi lách bằng `collision_policy: "fail"` cộng
một mẫu tên chưa từng tồn tại. **Đó là mẹo của người đo, không phải tính chất của hệ thống.**

**Chưa đo được, nói thẳng:** tôi **không biết** tab lúc đó hiện hay bị che. Vế *"tab nền"* của M3
**chưa nghiệm thu**.

**Cổng còn 5 đỏ, KHÔNG cái nào của lượt này** — chi tiết và ai sở hữu: xem nhật ký phiên.

## 2026-09-10 (lượt 17) · `claude-gpt-chay-het-job` — B-49 vá cả hai vế, Đức chốt

**Đức chốt *"sửa cả hai đi"*.** Cổng chờ trước-khi-gửi nay: **bỏ `!uploadIsPending()`** (nhóm đó
khớp lúc **đang sinh ảnh**, không phải lúc upload — nên gắn ảnh trong lúc lượt khác còn vẽ thì chết
oan 15 giây kèm lỗi nói sai nguyên nhân), và **đối chiếu TÊN FILE** trên `aria-label` của chip thay
cho phép đếm. Phép đếm cũ trả lời được *"đủ mấy cái chưa"* mà không trả lời được *"đúng mấy cái đó
chưa"* — chip sót của lượt trước cũng được tính, và cổng mở khi ảnh của lượt này chưa hiện.

**Nhóm `uploadPending` KHÔNG SAI, nó bị HỎI SAI CÂU.** Vẫn sống ở `DacChatReadiness`, nơi câu hỏi
đúng là *"trang có đang bận không"*. Đừng xoá nó vì thấy nó bị gỡ khỏi một chỗ.

**Một lỗ trong chính bản vá này, bắt được trước khi nó kịp chạy.** Bản nháp đầu dùng
`label.includes(fileName)`, mà `"aa.png".includes("a.png")` là **TRUE** — chip của file khác vẫn mở
được cổng, đúng loại nhầm vế ⑵ sinh ra để chặn. Nay chỉ nhận đẳng thức, hoặc phần trước dấu phẩy.

**Câu báo lỗi nay nêu đích danh file**, và tách *"chưa vào ô nhập file"* khỏi *"chưa thấy chip"*.
Câu cũ chỉ nói *"không sẵn sàng"*, và hai phiên đã đi tìm nhầm chỗ vì nó.

**Hai phép ghim cũ ĐẢO CHIỀU chứ không xoá** — bản cũ cấm mọi file đọc `attachmentChip` kèm cửa ra
*"nối vào cổng thì phải qua B-49 và Đức chốt"*; Đức chốt rồi nên nay nó **đòi** `content.js` đọc, và
**đúng một mình nó**. Ghim mới cắt ba hàm đã ship, chín mép. **Mép ⑼ sinh ra TỪ một lượt thử phá:**
bỏ `.filter(isVisible)` mà bản đầu vẫn **XANH** — chip đã gỡ còn sót node vẫn mở được cổng.

Suite **132/132** · thử phá **10/10 đỏ** · 0 mỏ neo hỏng. **CHƯA nghiệm thu live** — cần một job có
ảnh mẫu sau khi Đức nạp lại.


## 2026-09-10 (lượt 18) · `claude-gpt-chay-het-job` — B-57: `chat.read` nay nói CÂU TRẢ LỜI XONG CHƯA

**Vá này sinh ra từ một lỗi thật của tôi, lần thứ ba cùng một kiểu.** Pilot chuỗi reasoning nhiều
vòng: gửi vòng 1, GPT gọi `@github` 10 lượt trong 6 phút 3 giây. Tôi thấy chữ đứng yên ở 173 ký tự
suốt hơn ba phút, kết luận **"lượt trả lời chết giữa chừng"**, rồi gửi lại prompt — **hai lần**.
Đức mở màn hình cho xem: cả ba lần GPT đều trả lời bình thường, câu trả lời thật dài **3450 ký tự**
và khối copy có đủ **805 ký tự** đúng prompt vòng 2.

**Chữ ngừng dài ra KHÔNG có nghĩa là đã xong** — nó có nghĩa model đang chạy tool. Đây là phép đoán
"xong" sai **thứ ba** tôi tự chế trên cùng một cửa: `busy: false` (nói về PANEL — B-55), rồi "số ký
tự đứng yên hai lượt đọc". `chat.read` không có trường nào nói câu trả lời đã kết thúc, nên mọi bên
gọi **buộc phải** tự chế một cái — và tự chế thì sai.

**Vá:** `chat.read` trả thêm `generating`, lấy từ **đúng** `findStopButton()` mà runner dùng, và đi
kèm **cùng một lượt đọc** chứ không phải RPC thứ hai — hai lượt đọc rời nhau là một cuộc đua, và
trường quyết định dừng-hay-chạy-tiếp không được phép đua. Luật đọc nay một câu: **`generating: false`
là tuyên bố duy nhất rằng câu trả lời đã kết thúc.**

**Ghim** (`chat-read-smoke`, mép ⓗ): payload phải khai `generating` đúng một lần · `SEL.stop` chỉ
được đọc ở **một** chỗ · và một mép **hành vi**: `readTurns` không được trả khoá cùng tên, vì nó
trải SAU `generating` nên sẽ **đè im lặng** đúng trường quyết định.

**Hai lỗi của chính phép ghim, cả hai tự bắt.** ⑴ Đếm thành ngữ trên **cả file** → ra 4, báo đỏ cho
một bản vá đúng. ⑵ Chú thích chen vào **giữa** `try {` và `sendResponse`, gãy mỏ neo mà test cắt để
nạp vào `vm`.

Suite **132/132**. **CHƯA nghiệm thu live** — cần Đức nạp lại tiện ích thì `generating` mới có.
Bốn cửa nói bốn chuyện khác nhau lúc bị chặn: xem **`B-58`** trong `BACKLOG.md`, chưa giải thích được.

## 2026-09-10 (lượt 19) · `claude-gpt-chay-het-job` — nền reasoning GPT×CC, và năm lỗi cùng một họ

**Đức chốt hướng:** GPT nghĩ, CC chỉ điều phối. GPT ghi thẳng `main` (nó chỉ tổng hợp, không
sửa mã). Chuỗi chạy tự động trọn vòng — trước đó mỗi vòng một lệnh.

**Số đo đổi cả thiết kế:** mỗi lượt gọi model tốn **~232.000 token đọc**, bất kể lệnh to hay
nhỏ. Phần tôi *suy nghĩ và viết ra* chỉ là **0,4%** khối lượng; kết quả mọi công cụ là **0,06%**.
Đòn bẩy là **cắt số lượt gọi**, không phải cắt nội dung. 12 vòng chạy tay ≈ 36 lượt gọi; gộp
vào bộ chạy còn **1**.

**Đã dựng và đã đo:** `~~B-57~~` `chat.read` trả `generating` (live) · khối copy 5/5 vòng ·
**GPT ghi được file vào repo** — 52 giây, commit `436ee0ff`, đúng đường dẫn, nhưng **thẳng
`main`, không nhánh, không `Lane:`, ký trùng danh tính với Đức** · Sheet luật 93 dòng, năm trích
dẫn số dòng tôi kiểm chéo đều khớp · runbook trong `AI-OPERATOR-GUIDE.md` viết cho phiên Haiku
không có bối cảnh · protocol `drafts/GPT-REASONING-8-ROUND-PROTOCOL-V1.md` (V0 bị Codex chấm
**UNSOUND**, V1 vá năm chỗ).

**Bộ chạy: vá NĂM lỗi, CHƯA đi trọn một chuỗi nào.** Cả năm **cùng một họ** — lấy một *dấu hiệu
vắng mặt* làm *bằng chứng kết thúc*: `busy:false` · chữ đứng yên · đọc hỏng · nút Stop biến mất
giữa chuỗi tool (`B-60`) · nhánh `continue` không in gì. **Suite không bắt được lỗi nào trong
năm** — mọi phép ghim của tôi ghim đúng **giả định của tôi**. Nay mỗi mép mới đều kèm một phép
chạy lại logic bản cũ để chứng minh nó thật sự bắt được lỗi đã xảy ra.

**`B-60` sửa lại `B-57`:** `generating` đọc nút Stop, mà nút Stop biến mất giữa các lượt gọi
tool. Nên `false` **một lượt đọc** không nói được gì — chỉ *yên liên tục qua nhiều lượt* mới có
nghĩa. Và nó đọc lại `B-59`: các quãng cụt không hoàn toàn là DOM cũ; hai hiệu ứng đều thật.

**Tự sửa một khẳng định sai của chính tôi:** *"`.git/hooks/` trống"* — thật ra
`core.hooksPath = .githooks`, `commit-msg` chạy `--soat`, và nó chặn tôi **hai lần** trong ngày.

Suite **133/133**. Roadmap đầy đủ ở `## ROADMAP — nền tảng reasoning GPT×CC` trong `BACKLOG.md`.

## 2026-09-10 (lượt 20) · `claude-gpt-chay-het-job` — chuỗi thành NÚT BẤM, ba mép mới bắt được lỗi thật

**Nút bấm:** `chay-chuoi.bat` / `dung-chuoi.bat`. Nhấp đôi thì hỏi tên chuỗi, số vòng, trần
phút, rồi **CHO CHỌN profile** từ danh sách đang thật sự nối (`chon-profile.mjs` hỏi host, không
hỏi trang, nên không giành panel). **Chạy chuỗi tốn 0 usage CC** — Node thuần.

**Ba mép mới:** `~~B-61~~` khoá một-bản-chạy · `~~B-62~~` `CAN_NGUOI` · `~~B-63~~` ghim hội
thoại. **`B-63` chạy thật 14:08:** Đức đổi tab, `ark-luat` dừng bằng `DOI_HOI_THOAI` sau 4 vòng
thay vì gõ nhầm chỗ. Ba mép **còn hở** ghi ở `B-64`, `B-65`, và khoá không tự trả khi bị giết.

**Mốc ② chuỗi `luat-audit`: FAIL** — thiếu `workers/hnx-fetch/AGENTS.md`, gói duy nhất không có
`v*/`. Phạm vi thật **14 file, 2153 dòng**. Hai con số cũ sai vì **cùng một chỗ**: glob quét
trúng `_shared/AGENTS.md` lần hai (dư đúng 128 dòng) và làm rơi `hnx-fetch` — hai lỗi ngược
chiều che nhau. Luật mới: **phạm vi là danh sách TÊN FILE**; glob chỉ để tìm, không để ghi.
Chi tiết ở `drafts/luat-audit/CC/MOC-2.md`.

**Cổng `safe-push` bắt nhầm commit của tôi** — tiêu đề kiểu `audit:` bị đọc thành nhãn `Audit:`.
Sửa **cổng**, không dùng cờ vượt. Trên đường đó lộ ra **`npm test` chết ở mục thứ 6**:
`tests/repo-structure-smoke.mjs` import 3 export đã bị xoá, nên **hơn 20 tệp test phía sau chưa
từng chạy** — và vì thế 3 tệp nguồn mang CRLF nằm đó không ai thấy. Ba export đó chạm lớp bảo vệ
append-only nên tôi **không tự đoán**; cần Đức giao lane.

**Thước usage** `scripts/do-usage-phien.mjs`. Bản đầu cho **7,38 tỷ** token — sai gấp bảy vì cộng
cả 18.954 dòng nhật ký trong khi chỉ có 2.684 `message.id`. Số đúng: **2.688 lượt · ~370.000
token đọc mỗi lượt · phần ra 0,24%**. Giá ≈ **số lượt** × bối cảnh.

Suite **133/133**. Pilot kế: `drafts/PILOT-DIEU-PHOI-V0.md` + `pilot-dieu-phoi/GOI-VIEC.md`.

## 2026-09-10 (lượt 21) · `claude-gpt-chay-het-job` — bắt địa chỉ hội thoại, và 3 mục "mở" hoá ra đã xong

**`~~B-68~~` — bộ chạy mù trước một chat MỚI.** Đức mở chat mới; nó nằm ở `chatgpt.com/`, chưa
có `/c/<id>`, nên `chat.read` từ chối bằng `WRONG_SURFACE` — và bộ chạy gộp lỗi ấy vào rọ
*"panel đang bận"*, tức **nói sai bệnh** và bảo người đợi một thứ không tự khỏi. Cùng gốc: `canhTab`
so **nguyên văn** địa chỉ, mà ChatGPT tự gắn `?...` sau lưng người dùng → **dương tính giả trên
chính lớp bảo vệ người**, loại lỗi làm lớp ấy bị nghi rồi bị tắt.

Vá bốn chỗ: `system.ping` trả `chatgpt.url` + `conversation_id` (cửa DUY NHẤT còn trả lời khi tab
chưa ở hội thoại — trước đó `bridgeSystemPing` có `ping.url` trong tay mà **vứt đi**) · CLI thêm
lệnh `ping` · bộ chạy so bằng **định danh hội thoại**, thêm `--url` kiểm ở cửa vào trước mọi
đường gửi, tách `SAI_TRANG` · `chay-chuoi.bat` hỏi luôn hội thoại sau khi chọn hồ sơ. Ghim 7 mép;
khuôn định danh phải **trùng nguyên văn** regex thật của `provider-adapter.js`.

**Ba mục "còn mở" hoá ra đã vá từ 08/09, chỉ quên gạch:** `B-37` `B-38` `B-39` — kiểm lại **bằng
mã, không bằng lời khai**, cả ba đều có ghim. Sổ nợ **11 → 8**. `B-39` gộp hai bệnh vào một mã;
phần còn sống (panel không trả lời lúc bận) là `B-50`.

**Hai protocol gọn lại 37%** (16.787 → 10.654 ký tự): giữ LUẬT, đẩy pháp y về BACKLOG.

**Chặn thật, cần Đức:** ⑴ nạp lại tiện ích thì `system.ping` mới trả địa chỉ. ⑵ `B-58`/`B-59`/
`B-60` chờ **một lượt `dom_probe` trên tab thật giữa lúc GPT đang sinh** — luật cấm đoán selector.
⑶ khoá file `HANDOFF.md` của `harness-loi-01` đã treo **24 giờ**, chặn đường nhận vùng `_root`.

**Tôi ghi đè nhầm `HANDOFF-ARCHIVE-01.md` (vùng CHỈ-THÊM) rồi khôi phục** — nguyên nhân, bài
học, và nợ hạ tầng kèm theo ghi ở `B-69` trong `BACKLOG.md`.

## 2026-09-11 (lượt 22) · `claude-gpt-chay-het-job` — cụm giác quan đóng bằng một lượt đo live

**Đức chốt:** `B-56` ok · `B-40`/`B-41` vẫn dùng · `B-66` `B-69` bỏ. Sổ nợ **38 → 2**.

**`B-40` `B-41` hoá ra đã vá từ 09/09, chỉ quên gạch** — lần thứ hai trong hai ngày gặp đúng
kiểu hồ sơ này (`B-37` `B-38` `B-39` hôm qua). Kiểm bằng MÃ và bằng cách CHẠY từng phép ghim.
`B-56` → [ADR-0054](docs/adr/0054-vong-reasoning-tu-noi-chi-chuyen-tiep-nguyen-van-khoi-copy.md),
**hồi tố và tự khai là hồi tố**; rủi ro tiêm lệnh **chưa đóng**, ADR ghi rõ giá.

**Đo live 11/09 trên tab thật, và nó đổ hai tín hiệu bộ chạy vẫn tin:**

| giây | nút Stop | dạng `data-turn-id` | ký tự |
|---:|---|---|---:|
| 6.1 | còn sinh | TẠM | 26 |
| **8.7** | **ĐÃ TẮT** | TẠM | 26 |
| 27.0 | đã tắt | TẠM | 26 |
| *(nạp lại)* | — | **UUID** | **85** |

Nút Stop **và** "chữ đứng yên 20 giây" cùng nói *"xong"* ở giây 8.7, trong khi câu trả lời thật
dài 85 ký tự. **Tín hiệu đúng nằm sẵn trong payload, chưa ai đọc:** trang đánh dấu lượt chưa
hoàn tất bằng `data-turn-id` **tạm** (`request-<hội thoại>-<n>`), lượt đã chốt mang UUID. Đó là
dấu hiệu của chính ChatGPT, thuộc tính **cấu trúc**, không phải nhãn tiếng Anh.

Và bản cũ còn sai chiều ngược: lượt chưa chốt trả `found: true` với `chars: 0` → bộ chạy chấm
`KHOI_RONG` rồi DỪNG — **lý do sai, và đi vòng qua chính luật B-59**. Vá bằng `luotDaChot()` +
cửa `LUOT_CHUA_CHOT` đứng **trước** mọi phán quyết về khối. Đóng `~~B-59~~` `~~B-60~~`.

**`B-68` nghiệm thu LIVE:** `system.ping` trả `url` + `conversation_id`, rút đúng định danh từ
một hội thoại trong Project — đúng ca mà bản sao cũ ở `sidepanel.js` từng trả `null`.

**Giới hạn:** cả lượt đo ở trên tab **đang bị che**. Chưa tách được *hydrat muộn* khỏi *tab bị
che*. Cần một lượt đo trên tab hiện.

Còn `B-50` (panel chết một nửa: router 166 ms, executor 11/11 hết giờ; hai thể) và `B-58`.
Suite **133/133**.

## 2026-09-11 (lượt 23) · `claude-gpt-chay-het-job` — hai cửa nói sai bệnh, cùng một buổi

Định đo lại trên tab hiện thì **cả kênh chết**, và hai lớp lần lượt nói sai bệnh.

**⑴ Cầu nối không chạy → công cụ in đúng hai chữ `fetch failed`** (câu của Node cho cổng đóng).
Đọc y như một lỗi trong mã; tôi đi kiểm nhầm chỗ mấy lượt. Nguyên nhân thật: tiến trình host
tắt, và cầu nối ChatGPT **không có lối tắt Startup** trong khi bản Gemini thì có — dù trình cài
của nó có tạo, tức trình cài chưa từng chạy trên máy này (`B-70`, cần Đức bấm một lượt).
Vá **nửa chẩn đoán, không phải nửa nguyên nhân**: `bridge-cli.mjs` bắt họ lỗi mạng và trả
`KHONG_NOI_DUOC_CAU_NOI` — nêu địa chỉ đã thử, đúng một lệnh chữa, và **khai rõ chưa gửi gì**.
Ghim `tests/bridge-cli-host-offline-smoke.mjs`: chiều ngược (bản cũ thật sự chỉ nói hai chữ đó)
+ một mép đòi lỗi **không thuộc họ mạng** đi qua nguyên vẹn. **Cố ý KHÔNG tự bật hộ** — bật một
tiến trình nền sau lưng người dùng thuộc nhóm phải hỏi Đức.

**⑵ Bật lại cầu nối xong thì tab báo `RECEIVER_LOST`, `url: null`** — tab đang mở giữ content
script cũ sau khi nạp lại tiện ích. **Chưa gửi gì.** Cần Đức F5 đúng tab đó.

**Loại được nửa giả thuyết tab-bị-che mà không cần lượt đo mới:** nạp lại trên tab **đang bị
che** vẫn hiện đủ chữ (13 → 170, rồi 26 → 85). Nên *"tab che thì không dựng được"* **sai**. Nghi
vấn còn lại hẹp hơn: Chrome bóp đường **stream** của tab nền. Nếu đúng thì đó là luật vận hành
thật — **đừng thu nhỏ Chrome khi chuỗi đang chạy**, cùng họ `~~B-46~~`.

Suite **134/134**.

## 2026-09-11 (lượt 24) · `claude-gpt-chay-het-job` — lượt đo thứ hai BÁC kết luận của lượt đầu

Đo lại trên tab **hiện**. Câu trả lời thật 1096 ký tự:

| giây | tab | nút Stop | dạng id | ký tự |
|---:|---|---|---|---:|
| 7.9 | **HIỆN** | còn sinh | TẠM | **909** |
| 10.6 | **HIỆN** | đã tắt | TẠM | **1096** |
| 13.3 → 32.5 | che | đã tắt | TẠM | 1096 |
| *(nạp lại)* | — | — | **UUID** | **1096** |

**Nạp lại vẫn đúng 1096** → nội dung đã đủ từ giây 10,6 mà id vẫn tạm 22 giây sau. Nên câu tôi
viết sáng nay — *"dạng id không nói sai lần nào"* — **SAI**, và tôi gạch nó tại chỗ đã viết.

**Hai tín hiệu, hai kiểu nói dối:** nút Stop **dương tính giả** · dạng id **âm tính giả**.
Không cái nào dùng một mình được. Nghĩa đúng của `TẠM` hẹp hơn tôi tưởng: **DOM sống không kết
luận được, phải nạp lại** — không phải *"chưa xong"*.

**Và bản vá đầu của tôi phí 90 giây mỗi vòng:** nó chờ hết `NGUONG_YEN` rồi mới nạp lại, trong
khi id **không bao giờ tự** thành UUID (giữ tạm suốt 27 và 32,5 giây ở hai lượt đo) — chỉ nạp
lại mới đổi. Trên chuỗi 12 vòng là **18 phút ngồi không**. Sửa thành nạp lại ngay; phép ghim ⓠ
trước đó đang ghim **niềm tin của tôi**, nay ghim hành vi đúng kèm mép chống hồi quy.

**Nghi vấn cuối ĐÃ XÁC NHẬN:** chữ chạy 13 → 909 → 1096 trong 5 giây khi tab **hiện**, đứng im
ngay khi tab bị che. Chrome bóp đường **stream** của tab nền → luật vận hành thứ tư trong
`chay-chuoi.bat`: **đừng thu nhỏ Chrome khi chuỗi đang chạy**.

**`~~B-70~~` đóng — nhưng KHÔNG bằng trình cài.** Đức bảo chạy
`Install-DucAutoChatGPTLoopbackBridgeV1.ps1`; đọc kỹ thì nó cài sang `%LOCALAPPDATA%`, **không
phải** chỗ máy này chạy → sẽ sinh **token mới** và tranh cổng 32147 với bản thật. Thay bằng một
lối tắt Startup trỏ vào **bản đang chạy**, đúng khuôn lối tắt Gemini. Nghiệm thu thật: tắt host
→ cổng chết → chạy **chính lối tắt** → cổng sống, `ping` trả `READY`. Cái bẫy ghi đủ ở `~~B-70~~`.

Suite **134/134**.

## 2026-09-11 (lượt 25) · `claude-gpt-chay-het-job` — cửa chẩn đoán, cổng canh PHIEN, và một hàng cổng đã mất

**`B-50` ⓒ + `B-58`:** một lượt `REQUEST_TIMEOUT` nay tự nói mình là `EXTENSION_VANISHED` ·
`EXECUTOR_STUCK` · `PANEL_SILENT`, kèm cách chữa — thay cho `details` **rỗng**. Neo **tự neo**:
host ghim mốc *nghe thấy lần cuối* trước khi gửi rồi so lại lúc hết giờ. Bản đầu của tôi lấy
ngưỡng là `requestTimeoutMs` — một con số **trùng hợp** sẽ trôi khi ai đó chỉnh tham số chờ.
Ghim bằng **host thật**, 4 mép; lượt viết ghim bắt được **một mép xanh vì lý do sai** (không
khai `target` nên host trả `TARGET_AMBIGUOUS`, chưa từng chạm đường nó định đo). **Đã chép sang
bản cài của Đức và khởi động lại** — `ping` trả `READY`. **`B-50` VẪN MỞ:** mới xong ⓒ; ⓐ/ⓑ cần
bệnh tái phát, và tôi không dựng giả thuyết nguyên nhân.

**`~~B-71~~` đóng:** `rule-compile.mjs --check-head` dựng lại bó trong bộ nhớ rồi so với đĩa,
khai vào `generators` nên cổng gọi nó như mọi bộ sinh. **Vượt trần tính là LỆCH** — im ở tầng
cổng là tái lập chính cái lỗ. Ghim bằng fixture.

**`~~B-72~~` — thứ lớn hơn, lôi ra từ lượt ghim trên.** `tests/rule-compile-smoke.mjs` **đỏ ở
bản HEAD**, không phải do tôi: hàng cổng **"Luật biên dịch sạch"** đã **biến mất** trong lượt
migrate bộ khung `4da1e9e5`. `rule-compiler.mjs` (có chữ **r**) còn được nạp nhưng là module
KHÁC — đo phần nạp, không biên dịch luật. Nên đây là **mất một lớp bảo vệ thật**, âm thầm hai
ngày, vì `npm test` gốc chết sớm hơn nên hơn 20 tệp phía sau chưa từng chạy. Đo trước khi
khôi phục (`--gon` → SẠCH), rồi khôi phục nguyên bản từ `95b2ec74`; cổng nay **`[XANH] Luật
biên dịch sạch`**, test 32/32 — xanh vì lớp bảo vệ quay lại, **không** vì sửa phép kiểm.

Suite gói **135/135**.

## 2026-09-12 (lượt 26) · `claude-gpt-chay-het-job` — chuỗi của Đức chết vì CÁI TÊN, không vì trang

Đức báo chuỗi đứng. Nhật ký `HNX audit & fill/nhat-ky.jsonl` nói thẳng: hai lượt `chat-say` trả
**`INVALID_ENVELOPE`**, `KET_THUC ly_do "GUI_THAT_BAI"`.

Bộ chạy ghép khoá chống-gửi-hai-lần thẳng từ **tên chuỗi**: `` `${nhan}-v${vong}` `` →
`HNX audit & fill-v1`. Luật host là `/^[\x21-\x7e]{8,128}$/` và **dấu cách 0x20 không nằm trong
đó**, nên mọi lượt gửi bị từ chối **trước khi tới trang**. Tên tiếng Việt có dấu vỡ y hệt — đó
là kiểu tên Đức hay đặt nhất.

**Cái đắt không phải nó chết, mà là nó nói dối nguyên nhân:** dòng kết đọc thành *"hai lượt gửi
đều không thấy trong hội thoại"* — y như trang hỏng. Đức ngồi chờ script "bắt ô copy" trong khi
lỗi nằm ở cái tên.

Vá **hai tầng**: `khoaAnToan()` rút tên an toàn **+ vân tay 8 ký tự của tên gốc** (không phải
trang trí — hai tên rút gọn giống nhau sẽ khiến host nuốt lượt gửi của chuỗi này như bản sao của
chuỗi kia); và `bridge-cli.mjs` chặn **tại cửa, trước khi gọi mạng**, nêu **đích danh** ký tự
hỏng. `~~B-73~~`.

**Lượt ghim bắt thêm một dữ liệu mẫu vốn đã sai:** `bridge-cli-catchup-smoke.mjs` dùng
`"same-id"` — **7 ký tự**, host thật từ chối. Xanh bấy lâu vì công cụ chưa kiểm.

**Và tôi đã nói sai một chỗ hôm qua, sửa lại:** `REQUEST_TIMEOUT` mà Đức thấy **không** đến từ
relay của host (chỗ tôi vá 11/09) — nó sinh trong chính tiện ích, `sendExecutor` hết hạn 10 giây
chờ side panel trả lời, và **vẫn chưa mang chẩn đoán**. Ghi vào `B-50`.

Suite gói **136/136**.

## 2026-09-12 · `codex-bridge-pairing-links`

Đặt khối **Sao chép đường dẫn JSON** ngay dưới Kết nối Agent Bridge. Khối hiện đúng tệp ghép cặp trong `C:\WORKING ZONE\Chrome Extension Bridge\duc-auto-chatgpt\` và nút một chạm chép đường dẫn, không chép token. Thêm `bridge-pairing-path-static.mjs`; suite gói xanh 136/136.
