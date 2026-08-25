# AGENTS — Duc Auto ChatGPT

CORE của project này. Đọc file này cùng `README.md` (đóng vai design_brief —
project là gì, kiến trúc, phạm vi) và `HANDOFF.md` (trạng thái, việc tiếp
theo, Log) trước khi làm bất cứ việc gì. File này chỉ tổng hợp luật đã có sẵn
rải rác trong lịch sử — không đặt luật mới nào ngoài những gì đã được Đức
chốt.

## Vai từng bên

| Vai | Ai/gì | Được làm | Không được làm |
|---|---|---|---|
| Chủ dự án / chốt duy nhất | Đức | Duyệt mọi thay đổi, quyết định commit, chọn hướng roadmap | — |
| Coordinator / Architecture Reviewer | Claude | Đọc code, audit kiến trúc, đề xuất sửa, implement khi Đức giao | Tự commit/push khi chưa hỏi |
| Independent Code Auditor / Implementer | Codex | Audit độc lập, implement theo brief | Tự ý mở rộng phạm vi ngoài brief |
| Implementer gốc | GPT Web | Đã dựng V0 ban đầu | — |
| AI ngoài qua Agent Bridge | Bất kỳ agent nào gọi qua Bridge (kể cả Claude/Codex khi chạy qua CLI) | Đọc trạng thái (`ping`, `capabilities`, `queue-list`, `run-status`, `ledger-read`), gửi 1 đề xuất (`propose`) vào vùng cách ly | Không bao giờ tự chạy Run, pause, resume; không bỏ qua bước Đức duyệt trong side panel |

Template lệnh chính thức cho vai Coordinator/Auditor nằm ở cuối file này
(mục "Template COUNCIL"), copy từ `HANDOFF.md`.

## Luật vàng của project này

1. **Không sửa/xoá/regenerate bất cứ gì trong `pilot-03/`, `pilot-05/`,
   `pilot-06/`, `pilot-06B/`.** Đây là bằng chứng vận hành (evidence) của các
   lỗi đã tìm ra và đã sửa — ghi đè lên là xoá mất bằng chứng.
2. **Không bao giờ gán `.innerHTML` / `.outerHTML` / `insertAdjacentHTML`.**
   Đây là yêu cầu bảo mật — nội dung ảnh/text từ chatgpt.com đi vào side panel
   có quyền cao, phải build DOM node, không được ghép chuỗi HTML.
   `tests/artifact-integrity-smoke.mjs` chặn build nếu có.
3. **Không làm yếu bất kỳ cơ chế bảo vệ nào đã có:** exact-once submission,
   attribution, readiness gating, retry semantics, persistence verification,
   checkpoint protocol, security hard-stop. Sửa bug được, nhưng không được
   "sửa" bằng cách bỏ bớt một trong các lớp bảo vệ này.
4. **Chữ operator nhìn thấy luôn tiếng Việt** (`operator-messages-core.js`,
   `halt-instructions-core.js`...); **mã lỗi (CODE) luôn tiếng Anh** vì nó là
   định danh trong audit JSONL, Result ledger, và test. Không bao giờ để một
   test bảo mật assert vào câu chữ hiển thị (caption/label) — chỉ assert vào
   logic/wiring.
5. **Sửa bất kỳ file `.js` nào → phải nói Đức reload extension ở
   `chrome://extensions` trước khi test.** Không giả định thay đổi đã có hiệu
   lực.
6. **Commit: AI được tự commit (kể cả main) từ 2026-08-24** — quyết định của
   Đức, ghi trong `decisions.md`. Bốn điều kiện bắt buộc: test xanh trước khi
   commit; không bao giờ `push --force`/rewrite history; mỗi commit có 1 dòng
   Log trong `HANDOFF.md`; xoá file / sửa pilot evidence / thay đổi ranh giới
   Run vẫn phải hỏi Đức.
7. **Agent Bridge: `run.start` / `run.pause` / `run.resume` không tồn tại và
   sẽ không bao giờ được thêm vào mà không có quyết định mới, ghi lại trong
   `decisions.md`.** Bridge là ingress + observability, không phải remote
   execution. Side panel luôn là executor duy nhất; đóng panel → mọi lệnh
   Bridge liên quan Queue/workbook trả `EXECUTOR_UNAVAILABLE`, không có runner
   nền nào thay thế. *Exception duy nhất (Đức chốt 2026-08-25, xem
   `decisions.md`): một method **trial run** riêng, có nắp cứng (dev-toggle
   BẬT, ≤2 job, cách nhau ≥5–6 phút, nhãn audit `bridge_dev`) — chưa
   implement trong package này; `run.start` thật vẫn cấm vĩnh viễn.*
8. **In-app preview pane vẫn cấm dùng để "xem" UI** (chặn script, bỏ
   stylesheet — xem `README.md`/`NEXT-SESSION-BRIEF.md`). **Nhưng từ
   2026-08-24, harness bằng Chrome THẬT được phép** (quyết định của Đức trong
   `decisions.md`): Playwright/CDP chạy extension thật với trang chatgpt.com
   giả lập là công cụ verify hợp lệ. Việc xem bằng mắt của Đức chỉ còn cần
   cho những gì harness không chạm được (OS folder picker, chatgpt.com thật).
9. **Một việc một lúc, không overbuild.** Không thêm tính năng/abstraction
   ngoài phạm vi được giao trong cùng 1 lượt sửa.

## Core / Companion của project này

CORE (đọc mỗi lần):
- `README.md` — project là gì, kiến trúc, phạm vi (đóng vai design_brief).
- `AGENTS.md` — file này: vai, luật vàng, bản đồ file, template COUNCIL.
- `HANDOFF.md` — trạng thái hiện tại, việc tiếp theo, Log (chỉ thêm dòng, đọc
  đầu tiên trước khi bắt tay vào việc, ghi cuối cùng sau khi xong).

COMPANION (đọc khi cần):
- `decisions.md` — quyết định lớn đã chốt | vì sao | nguồn.
- `DAC_XLSX_RUN_PLAN_V1.md` — hợp đồng schema XLSX (jobs/config) cho mọi
  workbook mới.
- `NEXT-SESSION-BRIEF.md` — brief chi tiết cho phiên làm việc tiếp theo khi có
  (không phải lúc nào cũng còn hiệu lực — kiểm tra ngày trước khi dùng).
- `AUDIT.md`, `TEST_REPORT.md` — kết quả audit/test đã chạy.
- `drafts/` — nháp, spec thiết kế, roadmap chưa chốt. Agent chỉ được tự ghi
  vào đây (đúng luật CLAUDE.md gốc của Đức).

## Bản đồ file

| File | Vai trò |
|---|---|
| `README.md` | Tổng quan project, kiến trúc, cài đặt, Agent Bridge (kỹ thuật) |
| `AGENTS.md` | File này |
| `HANDOFF.md` | Trạng thái + Log lịch sử đầy đủ |
| `decisions.md` | Quyết định lớn đã chốt, có nguồn dẫn |
| `DAC_XLSX_RUN_PLAN_V1.md` | Hợp đồng schema workbook XLSX |
| `NEXT-SESSION-BRIEF.md` | Brief phiên làm việc tiếp theo (khi còn hiệu lực) |
| `AUDIT.md` | Kết quả audit kiến trúc |
| `TEST_REPORT.md` | Kết quả test |
| `drafts/AGENT-BRIDGE-DESIGN-V1.md` | Thiết kế gốc của Agent Bridge (WP-0) |
| `drafts/AGENT-BRIDGE-HANDOFF.md` | Handoff kỹ thuật WP-1..WP-4 cho Codex |
| `drafts/AGENT-BRIDGE-ROADMAP-AND-GUIDE-V1.md` | Roadmap + use case Bridge cho Đức (không kỹ thuật) — **một phần đã lỗi thời sau Tầng 1, xem audit 2026-08-24** |
| `drafts/AGENT-BRIDGE-TIER1-HANDOFF.md` | Brief Tầng 1 (6 method ghi trực tiếp + tab BRIDGE) giao cho Codex |
| `drafts/AUDIT-SYSTEM-EFFECTIVENESS-2026-08-24.md` | Audit độc lập toàn hệ thống + roadmap 5 giai đoạn tiến tới tự hành (Đức đã chốt cả 5 điểm 2026-08-24) |
| `drafts/GIAI-DOAN-1-SAFETY-HANDOFF.md` | Brief Giai đoạn 1 (8 fix an toàn nhóm A) giao Codex, kèm bằng chứng sống cho fix A1 |
| `drafts/GIAI-DOAN-2A-AGENT-BRIDGE-HANDOFF.md` | Brief Giai đoạn 2A (run.trial + 6 nâng cấp Bridge chuẩn agent) giao Codex |
| `ab-poll-core.js` | Chính sách trả lời poll A/B của ChatGPT (`ab_poll_action`) — module lõi thuần, dùng chung cho content script và side panel |
| `templates/Duc-Auto-ChatGPT-Template.xlsx` | Workbook trống chuẩn để bắt đầu pilot mới |
| `scripts/create-pilot-NN.mjs` | Script tạo workbook cho từng pilot |
| `pilot-03/`, `pilot-05/`, `pilot-06/`, `pilot-06B/` | Bằng chứng vận hành — **không sửa/xoá** |
| `Pilot-07/`, `Pilot-08/`, `Pilot-09.../` | Pilot đang hoạt động, có thể có dữ liệu mới |

Thêm file/thư mục mới cấp cao → phải thêm 1 dòng vào bảng này. Không khai báo
= không tồn tại (luật CLAUDE.md gốc).

## Template COUNCIL

Hai template lệnh chính thức, copy nguyên văn từ đầu `HANDOFF.md` để tái sử
dụng khi cần một vòng review Coordinator/Auditor mới. `HANDOFF.md` không lặp
lại nội dung này nữa — chỉ trỏ về đây.

### #01 — Claude Coordinator review

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

### #02 — Codex code audit

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
