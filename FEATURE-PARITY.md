# Bảng tính năng hai nhánh — GPT ↔ Gemini

> Đo ngày **2026-08-26** bởi phiên `claude-chatgpt-3`. Đức yêu cầu một bảng để hai nhánh
> biết mình có gì / thiếu gì.
>
> **Ở gốc repo có chủ đích** (Đức chốt 2026-08-26): nó nói về CẢ HAI nhánh, nên không thuộc
> package nào. Phiên nào sửa file này thì phải đang giữ `_root` trong `.agents/claims.json`.
>
> **Sửa lần 2 — 2026-08-26, phiên `claude-gemini-4`** (Đức duyệt mượn `_root` trong chat):
> hạ hai dòng `[DÒ]` xuống bằng cách **đọc thẳng thân hàm**, đúng như mục cảnh báo bên dưới dặn.
> Một dòng sai (`tryBeginRun`), một dòng thiếu hẳn (nhận dạng ảnh theo byte).
> Cả hai đều là **bẫy [DÒ] lần thứ ba và thứ tư** trong cùng một ngày.

## Đọc bảng này thế nào

Ba loại dòng, độ tin cậy KHÁC NHAU. Đừng đọc lẫn:

| Ký hiệu | Nghĩa | Tin được tới đâu |
|---|---|---|
| **[ĐO]** | Máy đếm được, không qua tay người | Chắc |
| **[ĐỌC]** | Tôi mở code đọc thẳng hàm đó | Chắc |
| **[DÒ]** | Tìm theo tên hàm/hằng số | **Có thể sai** — xem cảnh báo |

**Cảnh báo về dòng [DÒ]:** tìm theo tên chỉ cho biết *cùng một cách làm* có mặt hay không,
**không** cho biết *tính năng* có hay không. Hôm nay tôi dính đúng bẫy này hai lần:
`referencesAdd` báo "cả hai đều thiếu" (thật ra pattern của tôi sai hoa thường), và
`assertTrialDevMode` báo "Gemini thiếu" (thật ra Gemini có, tên khác, nằm ở
`dev-trial-core.js` với mã `DEV_MODE_OFF`). **Dòng [DÒ] phải kiểm lại trước khi hành động.**

**Cập nhật cùng ngày — dính thêm hai lần nữa, tổng cộng bốn:** `tryBeginRun` báo "Gemini thiếu"
(thật ra Gemini **có**, dựng thẳng trong `run()` chứ không tách thành hàm riêng), và **nhận dạng
ảnh theo byte** không có dòng nào cả vì không ai nghĩ ra để dò. Bốn lần trong một ngày, cùng một
nguyên nhân: **dò theo tên chỉ tìm được thứ mình đã biết tên.** Đó là lý do mục 5 đề xuất sinh
bảng này bằng máy thay vì gõ tay.

---

## 1. Method của Bridge — **[ĐO]**

Đếm trực tiếp từ `registryEntry({ name: ... })` trong `bridge-core.js` hai bên.

<!-- AUTO:BRIDGE START -->
**GPT 22 · Gemini 19.**

| Method | GPT | Gemini |
|---|---:|---:|
| `chat.reload` | ✅ | ✅ |
| `diagnostics.dom_probe` | ✅ | ✅ |
| `jobs.add` | ✅ | ✅ |
| `jobs.remove` | ✅ | ✅ |
| `jobs.reorder` | ✅ | ✅ |
| `jobs.update` | ✅ | ✅ |
| `ledger.read` | ✅ | ✅ |
| `output.configure` | ✅ | ✅ |
| `output.set_folder_hint` | ✅ | ❌ |
| `profiles.remove` | ✅ | ❌ |
| `queue.list` | ✅ | ✅ |
| `queue.proposal.get` | ✅ | ✅ |
| `queue.proposal.withdraw` | ✅ | ❌ |
| `queue.propose` | ✅ | ✅ |
| `references.add` | ✅ | ✅ |
| `run.status` | ✅ | ✅ |
| `run.stop` | ✅ | ✅ |
| `run.trial` | ✅ | ✅ |
| `run_settings.configure` | ✅ | ✅ |
| `session.hello` | ✅ | ✅ |
| `system.capabilities` | ✅ | ✅ |
| `system.ping` | ✅ | ✅ |

**Chỉ GPT có (3):** `output.set_folder_hint` · `profiles.remove` · `queue.proposal.withdraw`.

**Chỉ Gemini có (0):** không có.
<!-- AUTO:BRIDGE END -->

**GPT đang đi trước ở method Bridge** — đó là *diễn giải* của người về bảng trên, nên nó nằm
ngoài khối AUTO. Câu này từng bị mất một lần: lúc đặt marker ngày 27/08 nó nằm chung dòng với
con số máy đo, và bị nuốt theo. Đúng kiểu mất mát âm thầm mà marker sinh ra để chống — nên
**đừng viết văn của người chung dòng với số của máy.**

> **Đính chính 26/08 (phiên `claude-gemini-4`):** câu "Gemini có mà GPT thiếu đã rỗng" chỉ đúng cho
> *method Bridge*. Ở bảng **hành vi** (mục 2) thì không rỗng — Gemini có **nhận dạng ảnh theo byte**
> mà GPT chưa có.

`references.add` mới cân bằng hôm nay (port sang GPT, xác minh live ở Pilot-14).

**Backlog B-07 đã lạc hậu:** nó ghi Gemini còn thiếu `run.stop` / `chat.reload`. Đo lại thì
**Gemini đã có cả hai**. Đây chính là lý do bảng gõ tay sẽ mục — xem mục 5.

## 2. Tính năng hành vi — loại quan trọng nhất, và khó đo nhất

| Tính năng | GPT | Gemini | Loại | Bằng chứng |
|---|---|---|---|---|
| Khoá tab lúc Run (B-01) | ✅ | ❌ | **[ĐỌC]** | Gemini `sidepanel.js:2414` `activeTab()` vẫn `chrome.tabs.query({active:true})` **mỗi lần gửi** |
| Khoá hội thoại `/c/<id>` | ✅ | ❌ | **[ĐỌC]** | cùng chỗ trên; Gemini chỉ kiểm origin |
| Đọc `tab.url \|\| tab.pendingUrl` | ✅ | ❌ | [DÒ] | `pendingUrl` GPT 1 file, Gemini 0 |
| `DETECTION_BLIND` — mù thì dừng, không retry | ✅ | ❌ | [DÒ] | hằng số riêng, GPT 3 file, Gemini 0 |
| Ledger khai thật `landed_as_requested` (B-13b) | ✅ | ❌ | [DÒ] | GPT 2 file, Gemini 0 |
| Chốt khởi động run (không nuốt lệnh dừng) | ✅ | ✅ | **[ĐỌC]** | **cách làm khác nhau**: GPT `tryBeginRun` trong `approval-persistence-core.js`; Gemini dựng thẳng trong `run()` — dòng 9 là `if (state.running \|\| state.runStarting \|\| state.queueMutationRunning)`, và `stopRequested` được xoá TRƯỚC `await` đầu tiên. Ghim bởi `tests/bridge-run-stop-chat-reload-smoke.mjs` |
| Nhiều ảnh một job | ✅ | ❌ | [DÒ] | `maxImages` GPT 3 file, Gemini 0 |
| Cổng Chế độ phát triển cho `run.trial` | ✅ | ✅ | **[ĐỌC]** | **cách làm khác nhau**: GPT `assertTrialDevMode`, Gemini `dev-trial-core.js` + `DEV_MODE_OFF` |
| Trần 90 giây của `run.trial` | ✅ | ✅ | [ĐO] | cả hai khai trong registry |
| AI tự đặt thư mục Downloads | ✅ | ✅ | [ĐO] | `output_downloads_subfolder` GPT 4 file, Gemini 3 |
| Poll A/B "thích ảnh nào hơn" | ✅ | ❌ | [ĐO] | `ab-poll-core.js` chỉ có ở GPT |
| Khoảng nghỉ giữa job KHÔNG bị Chrome bóp | ✅ | ❌ | **[ĐỌC]** | Gemini `sidepanel.js:4314` `countdown()` vẫn `await sleep(1000)` mỗi nhịp — **cùng bug đã đo ×24 bên GPT 28/08**; GPT vá bằng `interjob-delay-core.js` (mốc thời gian + `chrome.alarms`) |
| Lớp ổn định kết nối Bridge (hạn chờ ACK · backoff trần 5s · hạn bắt tay) | ✅ | ✅ | **[ĐỌC]** | Gemini vá 28/08 (`3514aa5`), GPT port 02/09 (`ab8ab2a`). **Cùng thiết kế nhưng KHÔNG chép đè** — đắp lên bắt tay riêng của từng nhánh (GPT có thêm `auth_challenge`/`auth_proof` HMAC). Trước đó cả hai gửi `keepalive` mà không bao giờ kiểm host có trả lời không, nên kết nối đứt vẫn hiện **Connected**. **`duc-auto-gg-flow-video` CHƯA có** — `grep armKeepaliveDeadline` ở đó ra 0. Port sang nhánh ba còn nợ: ngày 02/09 package đó đang chạy trial live FLOW-04 nên không đụng vào |
| Nhận dạng ảnh theo BYTE, không tin nhãn MIME | ❌ | ✅ | **[ĐỌC]** | Gemini `content.js` có `sniffImageType` đọc byte đầu file thật (PNG `89 50 4E 47`, JPEG `FF D8 FF`, GIF, WebP, AVIF). GPT: quét `content.js` + `background.js` tìm mọi dấu hiệu đọc byte (`0x89`, `ffd8`, `Uint8Array`, `sniff`, `magic`) → **0 kết quả**. Đây là món **Gemini có mà GPT thiếu** |

## 3. Module — **[ĐO]**

<!-- AUTO:MODULES START -->
GPT 34 file `.js` · Gemini 33.

**7 file giống hệt sau khi chuẩn hoá CRLF/LF:**

`attempt-identity-core.js` · `attempt-telemetry-core.js` · `audit-chain-core.js` · `bridge-pairing-core.js` · `reconciliation-core.js` · `recreate-core.js` · `run-state-core.js`

**Chỉ một bên có:**

| File | Bên nào |
|---|---|
| `ab-poll-core.js` | GPT |
| `content-decision-core.js` | Gemini |
| `dev-trial-core.js` | Gemini |
| `interjob-delay-core.js` | GPT |
| `text-output-core.js` | GPT |

**24 file có ở cả hai nhưng khác nội dung** (xếp theo chênh lệch số dòng giảm dần):

| File | GPT (dòng) | Gemini (dòng) | Chênh lệch |
|---|---:|---:|---:|
| `sidepanel.js` | 6014 | 5058 | 956 |
| `checkpoint-core.js` | 226 | 69 | 157 |
| `bridge-core.js` | 954 | 799 | 155 |
| `runner-core.js` | 289 | 203 | 86 |
| `background.js` | 246 | 167 | 79 |
| `image-evidence-core.js` | 145 | 66 | 79 |
| `output-profile-core.js` | 96 | 45 | 51 |
| `provider-adapter.js` | 228 | 187 | 41 |
| `approval-persistence-core.js` | 61 | 25 | 36 |
| `bridge-transport-loopback.js` | 548 | 514 | 34 |
| `output-location-core.js` | 389 | 373 | 16 |
| `halt-instructions-core.js` | 147 | 133 | 14 |
| `resume-core.js` | 133 | 122 | 11 |
| `content.js` | 1072 | 1079 | 7 |
| `xlsx-codec.js` | 371 | 364 | 7 |
| `bridge-proposal-core.js` | 380 | 374 | 6 |
| `chat-readiness-core.js` | 26 | 20 | 6 |
| `bridge-router-core.js` | 68 | 70 | 2 |
| `operator-glossary-core.js` | 28 | 28 | 0 |
| `operator-messages-core.js` | 80 | 80 | 0 |
| `orchestrator-review-core.js` | 120 | 120 | 0 |
| `plan-diagnostics-core.js` | 195 | 195 | 0 |
| `sidepanel-ui-semantics.js` | 128 | 128 | 0 |
| `xlsx-run-plan-core.js` | 60 | 60 | 0 |
<!-- AUTO:MODULES END -->

**Ghi chú mô tả do người giữ — không nằm trong khối AUTO:**

- `ab-poll-core.js` — chính sách trả lời poll A/B.
- `content-decision-core.js` — chưa đọc, chưa dám mô tả.
- `dev-trial-core.js` — cổng dev-mode cho `run.trial`.

`image-evidence-core` lệch hơn hai lần — đó là lớp quy ảnh về job, tức là lớp **an toàn**.
Chênh lệch ở đây đáng lo hơn chênh lệch ở UI.

## 4. Tóm cho Đức: ai nợ ai

<!-- AUTO:DEBT-METHODS START -->
**Nợ method Bridge — [ĐO]:**

- **Gemini nợ GPT (3):** `output.set_folder_hint` · `profiles.remove` · `queue.proposal.withdraw`.
- **GPT nợ Gemini (0):** không có.
<!-- AUTO:DEBT-METHODS END -->

**Nợ hành vi — [KHAI]:** Gemini nợ GPT (nhiều): khoá tab + khoá hội thoại,
`DETECTION_BLIND`, ledger khai thật, latch dừng, nhiều ảnh một job và poll A/B (xem bằng
chứng từng dòng ở mục 2). GPT nợ Gemini một món đã biết: **nhận dạng ảnh theo BYTE** — Gemini
có `sniffImageType` đọc byte đầu file thật, GPT quét ra 0 kết quả (mục 2, dòng **[ĐỌC]**).

Nói cách khác: **hai nhánh vẫn lệch hai chiều**, chỉ là rất không cân — Gemini nợ nhiều,
GPT nợ đúng một món đã biết.

> **Sửa 27/08 (`opus-platform-2`, GPT audit chỉ ra).** Mục này trước đây viết "GPT nợ Gemini:
> không còn gì" và "Gemini đang tụt lại một chiều", **mâu thuẫn thẳng với mục 2** vốn ghi rõ
> nhận dạng ảnh theo byte là món Gemini có mà GPT thiếu. Đính chính đã có ở mục 1 nhưng
> **không ai sửa mục 4** — mà mục 4 mới là mục tên "Tóm cho Đức", tức là mục Đức thật sự đọc.
> Bài học: đính chính đặt ở chỗ khác với chỗ nói sai thì coi như chưa đính chính.

## 5. Vì sao bảng gõ tay này sẽ mục, và cách chữa

Bảng này đã **sai ngay khi tôi mở ra đo**: B-07 nói Gemini thiếu `run.stop`/`chat.reload`,
thực tế đã có. Không ai cố tình ghi sai — phiên kia port xong, và không có gì buộc backlog
phải cập nhật theo.

Ba loại dòng ở đầu file cũng nói lên điều đó: chỉ **[ĐO]** là tự đúng. **[ĐỌC]** đúng ở thời
điểm đọc. **[DÒ]** thì tôi đã tự bắt mình sai hai lần trong một buổi.

**Đề xuất, và tôi KHÔNG tự làm vì nó ở gốc repo:** biến mục 1 và mục 3 thành **script sinh ra**,
không gõ tay — `scripts/feature-parity.mjs`, gắn vào `session-check.mjs`. Máy tự đếm registry và
tự so hash module thì không thể lạc hậu, và nó **đỏ** khi có lệch mới. Chỉ mục 2 (hành vi) mới
cần khai bằng tay, và mỗi dòng nên trỏ tới **tên test ghim** nó — như vậy dòng nào không có test
là dòng chưa đáng tin.

Đây đúng là bước 1 và bước 2 của **B-06**, nay đã có số liệu thật để làm.

## 6. Việc cần Đức quyết

1. ~~Dời file này về gốc repo~~ — **XONG 2026-08-26**, Đức chốt.
2. **Gemini chưa có `BACKLOG.md`.** Nên B-06/B-07 chỉ tồn tại ở phía GPT — một chiều, đúng
   vấn đề Đức đang muốn giải. Cần phiên nào giữ package Gemini dựng sổ riêng cho nó.
3. **Có xây `scripts/feature-parity.mjs` không** (mục 5) — biến mục 1 và 3 thành số máy tự
   đếm, gắn vào cổng kiểm. Đây là bước 1–2 của B-06, nay đã có số thật để làm.
