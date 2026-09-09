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
> **6 mục cũ hơn đã dời sang [`HANDOFF-ARCHIVE-05.md`](HANDOFF-ARCHIVE-05.md)** — cùng thư mục này,
> nguyên văn, không mất chữ nào. File này giữ **20 mục cuối** (ADR-0008). Cần đào lịch sử
> xa hơn thì mở file đó và đi tiếp theo con trỏ trong nó; ghi Log mới thì vẫn ghi vào cuối
> file này.
<!-- /HANDOFF-CUT-POINTER -->

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

**Ba lỗi của tôi trong lượt này** — mép chống tiêm đòi sai chỗ · bộ lọc chú thích để văn của
chính tôi khớp vào phép kiểm · sân khấu giả truyền sai đối số nên một mép đỏ vì lý do sai: ghi đủ
kèm lý do từng chỗ ở mục **Trạng thái** của [ADR-0053](docs/adr/0053-loi-nha-cung-cap-la-mot-nguon-doi-soat-cau-chua-lay-tu-ma-cua-ta.md).

**Một lỗ hạ tầng nổ thật, đã gộp vào `N-59` của lane khác thay vì mở mục thứ hai** — cùng một
lỗi, nó cắn hai chiều trong một ngày. Số đo và cách dọn ở `BACKLOG.md` gốc, mục N-59.

**Còn mở:** B-41 ⑵ (`DETECTION_BLIND`) · B-42 (cần brief Đức duyệt) · vế live của ADR-0053 cần
một lỗi thật của nhà cung cấp, **tôi không giả lập**.

## 2026-09-09 (tệp đẩy ⒊) · `claude-gpt-chay-het-job` — có cuốn theo lane khác

Lượt đẩy đóng B-40 dùng `--carry` và **cuốn theo 8 commit của lane `claude-nen-luat`** (đợt nén Bản
đồ file và ADR-0034 *mở phiên đọc STATUS.md, không đọc HANDOFF.md*). Ghi ra vì
[ADR-0005](../../../docs/adr/0005-lam-viec-song-song.md) ⑶ bỏ cửa hỏi Đức cho `--carry`, nên tên
lane bị cuốn theo là dấu vết duy nhất còn lại.

**Cổng đóng phiên còn MỘT mục đỏ, và nó KHÔNG phải của phiên này:** `NAP_MOI_PHIEN_PHINH` lệch
**2 ký tự** (6.710 so với thước 6.708) vì commit của lane `claude-nen-luat` chạm `AGENTS.md` — họ
nâng thước lên 6.708 rồi chính bản sửa sau đó vượt thêm 2. Tôi **không sửa chữ luật đang dở của
lane khác**, và cũng không nâng thước hộ họ: nâng thước là một quyết định phải kèm lý do trong
nhật ký của người nâng. Mọi phép kiểm còn lại XANH; suite gói **124/124**.

## 2026-09-09 (lượt 5) · `claude-gpt-chay-het-job` — B-41 ⑵ và B-42

**B-41 ⑵ đóng.** `DETECTION_BLIND` nay đối soát trước; gửi lại là lối ra **cuối**. Thứ tự là
phần an toàn: đọc trước (chưa F5) → không thấy lượt hỏi của mình thì **dừng hẳn và KHÔNG F5** →
thấy rồi mới F5 → dò lại có nắp → mới tự kiểm. Phép khẳng định đòi **ba vế**; vế chịu tải là
*"có ≥ 1 lượt trả lời ở đâu đó trong hội thoại"* — thiếu nó thì một selector trợ lý bị mục sẽ
**khẳng định SAI** là máy chủ không tạo gì rồi gửi lại một prompt **đã có** kết quả.
`DETECTION_BLIND` **giữ nguyên** trong `HARD_STOP_FAILURE_TYPES`; `canRetry()` và
`submissionMayExist()` không đổi một chữ. Số nguồn khẳng định **âm tính 1 → 2**, đổi bằng tay.

**Một vế của ADR-0050 ⒞ KHÔNG thi hành được** — F5 xoá bằng chứng quy thuộc ảnh, nên hôm nay một
job mà ảnh **đã có sẵn** vẫn phải người xem. Đã ghi vào **chính ADR-0050** và tách thành
**`B-45`**; nó cần Đức chốt vì là một luật **quy thuộc** mới.

**B-42 đã ship** (Đức: *"bạn chủ động làm tôi approve"*). `chat.say` — một lượt nhắn thẳng,
không job, không dòng Excel. Hai số đo **ngược với chính chữ của B-42**: nó **không phải quyền
mới**, và nó **không chờ câu trả lời** (CLI bỏ ngang ở 40 giây, nên chờ lâu là bị cắt **sau khi**
tin nhắn đã bay). Đã **tách** nắp chờ 90 giây ra một hàm **dùng chung** với `run.trial`: hai
bản sao là **hai ngân sách**, tức nới phanh mà không ai thấy trong diff.

**Số đo:** suite **126/126** · hai ghim mới **cắt hàm đã ship ra chạy thật** · thử phá **0 thoát**.

**Bốn phép ghim cũ đỏ, MỘT trong bốn là lỗi thật** (`ReferenceError` từ sân khấu `vm` sau
khi tách hàm), cộng **ba lỗi trong đồ nghề của tôi** và **một mũi thử phá quá tù**. Nguyên văn cả
tám chỗ ở `BACKLOG.md`, mục tiến độ B-41 ⑵ và B-42 — ở đó vì mục nhật ký này chạm trần.

**Còn mở, và cả bốn đều cần Đức:** `B-45` · `B-36` (nút cấp lại quyền) · vế **audit độc
lập** của B-42 · vế **live** của ADR-0053. Tôi không tự ký nghiệm thu bản sửa của chính mình, và
không giả lập một lỗi nhà cung cấp.

## 2026-09-09 (lượt 6) · `claude-gpt-chay-het-job` — AUDIT ĐẢO LẠI HAI BẢN VÁ CỦA LƯỢT 5

**`chat.say` chạy live, PASS:** 349 ký tự, xác nhận **0,9 giây**, `17 × 23 = 391` đúng,
**0** dòng Excel. Đọc lần đầu (cửa sổ bị che) **17 ký tự** đứng yên; **135** sau khi tôi tự F5 —
cơ chế B-43 y nguyên, ở đường mới.

**AUDIT CODEX (Đức yêu cầu): hai vòng, CẢ HAI FAIL, cả hai bắt lỗi THẬT.** Tôi dựng lại từng ca
trên chính hàm đã ship trước khi nhận. Hai điều một phiên sau **không được undo**:

⑴ **Phép neo lượt hỏi phải DUY NHẤT.** Bản cũ so 160 ký tự đầu rồi lấy lượt khớp cuối; workbook
ảnh của Đức có đoạn mở đầu chung 173 ký tự → hai job **cùng khoá** → ghi **câu trả lời của job
khác** vào sổ với dấu `persistence_verified`. Nay: khoá **đầu+đuôi**, trùng khoá là
**không kết luận được**.

⑵ **Không có cửa gửi lại nào sau đối soát mù.** Không thể khẳng định *"máy chủ không tạo gì"* từ
DOM — "chưa vẽ", "không có" và "selector mục một phần" trông y hệt nhau. Vế đó của ADR-0050 ⒞ là
**không thi hành được**; số nguồn khẳng định **trở lại 0**.

Cộng ba mục HIGH của `chat.say`: *"đã gửi"* nay là **bằng chứng** chứ không phải *"đã bấm
nút"* · lỗi lấp lửng **không thử lại được** · sổ ghi **trước** lượt gửi.

**Số đo:** suite **126/126** · thử phá **8/8** và **9/9**, **0 thoát**.

**Chỗ tôi sai, và nó là bài học lớn hơn con bug:** sáng cùng ngày tôi đã **ghim chính ca ⑴ thành
"giới hạn đã biết"** rồi cho là chấp nhận được. Tôi ghi ra cái giới hạn mà **không ghi ra cái
giá**. Một "giới hạn đã biết" không thành an toàn chỉ vì đã được ghi ra.

**Đức chốt lượt này:** `B-45` để tôi chọn → **đóng, sẽ không làm**, mở `B-46` hẹp hơn ·
`B-36` **tạm chưa cần** · audit **giao Codex** (đã chạy) · **ADR-0053 hạ mức** — Đức chỉ ra
rằng có AI đang nhìn thì `chat.read`+`chat.say` là đủ, và Đức đúng.

Số đo đầy đủ, cả hai chuỗi sự kiện, và hai lỗi trong đồ nghề của tôi: `BACKLOG.md` khối
**AUDIT ĐỘC LẬP 09/09** — ở đó vì mục nhật ký này chạm trần.

## 2026-09-09 · `claude-nen-luat` — gói này nay mở phiên bằng `PHIEN.md`

**Mở phiên ở gói này: đọc `PHIEN.md`, một file, xong** (ADR-0035). Máy sinh, tự chứa: lõi luật
chung + `## Luật vàng` của gói + bản chắt trạng thái từ `STATUS.md`. **2.463 token** — trước hôm
nay là 29.826. Đừng nạp `AGENTS.md` hay file nhật ký này lúc mở; chúng là **nguồn** của `PHIEN.md`,
mở khi cần đào sâu.

`## Luật vàng` 4.265 → 2.187 ký tự. **Không luật nào bị xoá:** khối biện minh ADR-0032 còn một
dòng + một liên kết · bốn luật trùng lõi trỏ về lõi · bản kể tên lại bốn luật đó bỏ hẳn, vì trong
`PHIEN.md` chúng in ngay phía trên. Nắp `run.trial` và bảy lớp bảo vệ **giữ nguyên**.

**Sửa `AGENTS.md` hay `STATUS.md` của gói thì PHẢI chạy `node scripts/rule-compile.mjs --sinh`** —
cổng nay có phép kiểm canh (`PHIEN_CU`), và vượt trần 6.600 ký tự thì bộ sinh **từ chối ghi**.

*(Bản nén `AGENTS.md` nằm trong commit `1702ae5d` mang nhãn `claude-gpt-chay-het-job`: một lượt
`git add` không giới hạn đường dẫn trên cây làm việc dùng chung đã cuốn theo. Nội dung đúng, chỉ
nhãn nguồn gốc sai — không sửa vì sửa nhãn là viết lại lịch sử.)*

## 2026-09-09 (lượt 7) · `claude-gpt-chay-het-job` — B-46 đo xong, và MỘT LƯỢT GHI SỔ CỦA TÔI ĐÃ TRƯỢT

**B-46 đóng: ĐÃ ĐO, TIỀN ĐỀ SAI, 0 credit.** Đức chốt *"chạy B-46 đi"*; tôi chạy bằng
`diagnostics.dom_probe` — chỉ đọc. Trên tab **đang bị che thật** (`visibility: hidden`,
`docFocused: false`): `assistantCount` = **3**. Và `assistantCount` **chính là**
`assistantMessages().length` — cùng hàm, cùng adapter selector mà điều kiện mù dùng. Nên
`blind = (3 === 0)` = **false**: **che cửa sổ KHÔNG làm bộ dò mù.** `DETECTION_BLIND` cần
selector **mục thật** hoặc tab **không ở trên hội thoại** — hai ca mà đọc-lại-sớm không giúp gì.
Che cửa sổ chỉ làm **chữ** không vẽ xong — B-43 đã xử. Số đo đủ ở BACKLOG.md, mục B-46.

**LỖI CỦA TÔI, và nó tệ hơn con bug:** lượt ghi sổ ở lượt 6 **trượt lặng lẽ**. Một dòng trong
script của tôi hoá ra là `s.replace(tieuDeMoi, "")` — nó **xoá đúng tiêu đề vừa đặt**, nên hai
lệnh `.replace()` sau đó thành **no-op**. Kết quả: thân `B-45` **mồ côi** (bị gán lặng lẽ
vào mục B-41 phía trên), khối chốt B-45 **không vào**, `B-46` **không vào**. Script vẫn in
"xong" vì dòng in là **vô điều kiện**, và `backlog-check` vẫn xanh (34 mục, 0 mục vô hình).
**Và tôi đã báo cả ba việc đó là đã xong với Đức, kèm trong thông điệp commit `a7a218c4`.**

**Cách chặn, đã áp từ lượt này:** mọi script ghi sổ phải **đọc LẠI TỪ ĐĨA rồi `assert`** từng
khối vừa ghi. Một dòng in "xong" không chứng minh gì. Đã dùng cho cả `BACKLOG.md` lẫn
`STATUS.md` lượt này, cộng một phép kiểm rằng frontmatter STATUS **còn parse được** (17
trường, 0 lỗi) chứ không tin mắt thường.

**Hai mục cổng đỏ của lượt 6 nay đã đóng — bởi lane `claude-nen-luat`, không phải tôi:**
`PHIEN.md` đã track, và `drafts/` đã sửa quy thuộc (N-64). Tôi đã không sửa hộ, và đó là
quyết định đúng.

**Còn để mở, tự trả lời miễn phí:** tab bị che có vẽ xong một `<img>` **sinh ra** hay không.
Hội thoại lúc đo không có ảnh sinh nào. Lượt chạy ảnh thật tới nào cũng trả lời; probe đã ghi sẵn
`imageCandidateCount` và `generatedChains`. **Tôi không đốt một credit chỉ để hỏi.**

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
