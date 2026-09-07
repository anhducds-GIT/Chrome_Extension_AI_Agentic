# Bảng đối chiếu hai nhánh — phần MÁY SINH

> **File này do máy sinh TOÀN BỘ. Đừng sửa tay — lần sinh sau mất trắng.**
> Sinh lại: `node scripts/feature-parity.mjs` · chỉ kiểm: `node scripts/feature-parity.mjs --check`
>
> **Chữ của NGƯỜI nằm ở `FEATURE-PARITY.md`** — mục 2 (tính năng hành vi, có bằng chứng
> **[ĐỌC]**), các ghi chú mô tả module, và phần "ai nợ ai" viết tay. Đọc hai file cùng nhau
> mới đủ bức tranh; file này chỉ chứa số máy đếm được, tức toàn bộ là dòng **[ĐO]**.
>
> **Vì sao tách ([ADR-0014](docs/adr/0014-tach-khoi-may-sinh-cua-bang-doi-chieu.md)):** file
> này **miễn khoá**, nên một lane chỉ giữ khoá gói của mình vẫn sinh lại được và đẩy được.
> `FEATURE-PARITY.md` vẫn đòi `_root` vì nó là chữ của người.

## 1. Method của Bridge — **[ĐO]**

Đếm trực tiếp từ `registryEntry({ name: ... })` trong `bridge-core.js` hai bên.

<!-- AUTO:BRIDGE START -->
**GPT 23 · Gemini 23.**

| Method | GPT | Gemini |
|---|---:|---:|
| `chat.read` | ✅ | ✅ |
| `chat.reload` | ✅ | ✅ |
| `diagnostics.dom_probe` | ✅ | ✅ |
| `jobs.add` | ✅ | ✅ |
| `jobs.remove` | ✅ | ✅ |
| `jobs.reorder` | ✅ | ✅ |
| `jobs.update` | ✅ | ✅ |
| `ledger.read` | ✅ | ✅ |
| `output.configure` | ✅ | ✅ |
| `output.set_folder_hint` | ✅ | ✅ |
| `profiles.remove` | ✅ | ✅ |
| `queue.list` | ✅ | ✅ |
| `queue.proposal.get` | ✅ | ✅ |
| `queue.proposal.withdraw` | ✅ | ✅ |
| `queue.propose` | ✅ | ✅ |
| `references.add` | ✅ | ✅ |
| `run.status` | ✅ | ✅ |
| `run.stop` | ✅ | ✅ |
| `run.trial` | ✅ | ✅ |
| `run_settings.configure` | ✅ | ✅ |
| `session.hello` | ✅ | ✅ |
| `system.capabilities` | ✅ | ✅ |
| `system.ping` | ✅ | ✅ |

**Chỉ GPT có (0):** không có.

**Chỉ Gemini có (0):** không có.
<!-- AUTO:BRIDGE END -->

## 3. Module — **[ĐO]**

<!-- AUTO:MODULES START -->
GPT 35 file `.js` · Gemini 34.

**7 file giống hệt sau khi chuẩn hoá CRLF/LF:**

`attempt-identity-core.js` · `attempt-telemetry-core.js` · `audit-chain-core.js` · `bridge-pairing-core.js` · `reconciliation-core.js` · `recreate-core.js` · `run-state-core.js`

**Chỉ một bên có:**

| File | Bên nào |
|---|---|
| `ab-poll-core.js` | GPT |
| `bridge-workspace-core.js` | GPT |
| `content-decision-core.js` | Gemini |
| `dev-trial-core.js` | Gemini |
| `interjob-delay-core.js` | GPT |
| `tab-lock-core.js` | Gemini |
| `text-output-core.js` | GPT |

**24 file có ở cả hai nhưng khác nội dung** (xếp theo chênh lệch số dòng giảm dần):

| File | GPT (dòng) | Gemini (dòng) | Chênh lệch |
|---|---:|---:|---:|
| `sidepanel.js` | 6451 | 5230 | 1221 |
| `bridge-transport-loopback.js` | 946 | 516 | 430 |
| `bridge-core.js` | 1038 | 864 | 174 |
| `checkpoint-core.js` | 226 | 69 | 157 |
| `runner-core.js` | 316 | 223 | 93 |
| `background.js` | 293 | 202 | 91 |
| `image-evidence-core.js` | 145 | 66 | 79 |
| `resume-core.js` | 189 | 122 | 67 |
| `approval-persistence-core.js` | 61 | 25 | 36 |
| `provider-adapter.js` | 228 | 210 | 18 |
| `output-location-core.js` | 389 | 373 | 16 |
| `content.js` | 1186 | 1197 | 11 |
| `bridge-proposal-core.js` | 380 | 387 | 7 |
| `halt-instructions-core.js` | 147 | 140 | 7 |
| `xlsx-codec.js` | 371 | 364 | 7 |
| `chat-readiness-core.js` | 26 | 20 | 6 |
| `output-profile-core.js` | 96 | 100 | 4 |
| `bridge-router-core.js` | 68 | 70 | 2 |
| `operator-glossary-core.js` | 28 | 28 | 0 |
| `operator-messages-core.js` | 80 | 80 | 0 |
| `orchestrator-review-core.js` | 120 | 120 | 0 |
| `plan-diagnostics-core.js` | 195 | 195 | 0 |
| `sidepanel-ui-semantics.js` | 128 | 128 | 0 |
| `xlsx-run-plan-core.js` | 60 | 60 | 0 |
<!-- AUTO:MODULES END -->

## 4. Nợ method Bridge — **[ĐO]**

<!-- AUTO:DEBT-METHODS START -->
**Nợ method Bridge — [ĐO]:**

- **Gemini nợ GPT (0):** không có.
- **GPT nợ Gemini (0):** không có.
<!-- AUTO:DEBT-METHODS END -->
