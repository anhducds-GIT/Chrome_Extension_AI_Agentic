# Bảng tính năng hai nhánh — GPT ↔ Gemini

> Đo ngày **2026-08-26** bởi phiên `claude-chatgpt-3`. Đức yêu cầu một bảng để hai nhánh
> biết mình có gì / thiếu gì.
>
> **Ở gốc repo có chủ đích** (Đức chốt 2026-08-26): nó nói về CẢ HAI nhánh, nên không thuộc
> package nào. Phiên nào sửa file này thì phải đang giữ `_root` trong `.agents/claims.json`.

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

---

## 1. Method của Bridge — **[ĐO]**

Đếm trực tiếp từ `registryEntry({ name: ... })` trong `bridge-core.js` hai bên.

**GPT 22 · Gemini 19.** Sau hôm nay **GPT đi trước**, và "Gemini có mà GPT thiếu" đã rỗng.

| Method | GPT | Gemini |
|---|---|---|
| `session.hello` · `system.ping` · `system.capabilities` | ✅ | ✅ |
| `queue.list` · `ledger.read` · `run.status` | ✅ | ✅ |
| `jobs.add` · `jobs.update` · `jobs.remove` · `jobs.reorder` | ✅ | ✅ |
| `references.add` | ✅ | ✅ |
| `output.configure` · `run_settings.configure` | ✅ | ✅ |
| `queue.propose` · `queue.proposal.get` | ✅ | ✅ |
| `run.trial` · `run.stop` · `chat.reload` | ✅ | ✅ |
| `diagnostics.dom_probe` | ✅ | ✅ |
| `output.set_folder_hint` | ✅ | ❌ |
| `profiles.remove` | ✅ | ❌ |
| `queue.proposal.withdraw` | ✅ | ❌ |

**Gemini còn thiếu 3 method** ở trên.

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
| Latch `tryBeginRun` (không nuốt lệnh dừng) | ✅ | ❌ | [DÒ] | GPT 2 file, Gemini 0 |
| Nhiều ảnh một job | ✅ | ❌ | [DÒ] | `maxImages` GPT 3 file, Gemini 0 |
| Cổng Chế độ phát triển cho `run.trial` | ✅ | ✅ | **[ĐỌC]** | **cách làm khác nhau**: GPT `assertTrialDevMode`, Gemini `dev-trial-core.js` + `DEV_MODE_OFF` |
| Trần 90 giây của `run.trial` | ✅ | ✅ | [ĐO] | cả hai khai trong registry |
| AI tự đặt thư mục Downloads | ✅ | ✅ | [ĐO] | `output_downloads_subfolder` GPT 4 file, Gemini 3 |
| Poll A/B "thích ảnh nào hơn" | ✅ | ❌ | [ĐO] | `ab-poll-core.js` chỉ có ở GPT |

## 3. Module — **[ĐO]**

GPT 32 file `.js` · Gemini 33. **Đã chuẩn hoá xuống dòng** (GPT dùng LF, Gemini dùng CRLF —
không chuẩn hoá thì mọi file báo lệch 100%).

**8 file GIỐNG HỆT từng byte** — rủi ro bằng không nếu dời vào `workers/_shared/`:

`attempt-identity-core` · `attempt-telemetry-core` · `audit-chain-core` ·
`bridge-pairing-core` · `reconciliation-core` · `recreate-core` · `run-state-core` · `xlsx-codec`

**Chỉ một bên có:**

| File | Bên nào | Là gì |
|---|---|---|
| `ab-poll-core.js` | GPT | chính sách trả lời poll A/B |
| `content-decision-core.js` | Gemini | — chưa đọc, chưa dám mô tả |
| `dev-trial-core.js` | Gemini | cổng dev-mode cho `run.trial` |

**Lệch nhiều nhất** (23 file có ở cả hai nhưng khác nhau), đáng chú ý:

| File | GPT | Gemini |
|---|---|---|
| `sidepanel.js` | 5.679 dòng | 4.987 dòng |
| `bridge-core.js` | 933 | 799 |
| `image-evidence-core.js` | 145 | **66** |
| `output-profile-core.js` | 96 | **45** |
| `checkpoint-core.js` | 101 | **69** |
| `approval-persistence-core.js` | 61 | **25** |

`image-evidence-core` lệch hơn hai lần — đó là lớp quy ảnh về job, tức là lớp **an toàn**.
Chênh lệch ở đây đáng lo hơn chênh lệch ở UI.

## 4. Tóm cho Đức: ai nợ ai

**Gemini nợ GPT** (nhiều): khoá tab + khoá hội thoại, `DETECTION_BLIND`, ledger khai thật,
latch dừng, nhiều ảnh một job, poll A/B, và 3 method bridge.

**GPT nợ Gemini:** hiện tại **không còn gì đã biết**. `references.add` là món cuối, trả hôm nay.

Nói cách khác: **hai nhánh KHÔNG lệch hai chiều nữa — Gemini đang tụt lại một chiều.**
Điều này làm việc đồng bộ dễ hơn nhiều so với những gì backlog đang mô tả.

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
