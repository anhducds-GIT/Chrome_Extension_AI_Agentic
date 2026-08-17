# Coordinator / Auditor Handoff — V0 Trial Pilot

Status: reusable review prompts for the archived V0 baseline.

## #01 — Claude Coordinator review

```text
#01

PROJECT: Duc Auto ChatGPT V0 Trial Pilot
ROLE: Claude = Coordinator / Architecture Reviewer
IMPLEMENTER: GPT Web
REPO: anhducds-GIT/Chrome_Extension_AI_Agentic
PILOT DOCS: pilots/v0-trial/

VERIFIED PILOT BASELINE:
- Chrome Load unpacked installation succeeded.
- Three sequential text prompts executed successfully in a live ChatGPT conversation.
- Expected outputs observed in order: TEST 01 PASS -> 84 -> TEST 03 COMPLETE.

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
1. Read pilots/v0-trial/README.md, TEST_REPORT.md, AUDIT.md and implementation files when they are promoted into the repo.
2. Audit architecture and state machine before proposing changes.
3. Focus on DOM robustness, queue sequencing, stop/pause semantics, Chrome MV3 permissions, and failure recovery.
4. Identify only material issues for V0. Do not expand scope.
5. Return PASS / CONDITIONAL PASS / FAIL with ranked findings.
6. For each blocking finding, provide an exact acceptance criterion for GPT Web to repair.

GUARDRAIL:
Do not implement code unless explicitly authorized. Coordinator/auditor only.

RETURN TO GPT:
End with a concise copy-ready handoff containing verdict, blockers, acceptance criteria, and recommended next work package.
```

## #02 — Codex independent code audit

```text
#02

PROJECT: Duc Auto ChatGPT V0 Trial Pilot
ROLE: Codex = Independent Code Auditor
IMPLEMENTER: GPT Web
REPO: anhducds-GIT/Chrome_Extension_AI_Agentic
PILOT DOCS: pilots/v0-trial/

VERIFIED PILOT BASELINE:
- Load unpacked succeeded.
- Core three-prompt sequential runtime path passed.

V0 CONTRACT:
Sequential text prompts only. Side Panel -> content script -> ChatGPT DOM -> wait for completion -> next prompt.
No server, no login, no quota logic, no image/file automation, no concurrency, no paywall/rate-limit bypass.

AUDIT:
1. Static correctness / JS errors.
2. MV3/API correctness and least-privilege permissions.
3. Race conditions in Start/Pause/Stop and message passing.
4. Duplicate-send risk.
5. False completion / timeout risk.
6. Composer input compatibility: textarea/contenteditable/ProseMirror.
7. Persistence behavior if side panel closes/reopens.
8. Security/privacy: confirm no external network/exfiltration.

OUTPUT:
RESULT: PASS | CONDITIONAL PASS | FAIL
BLOCKERS: numbered list
NON_BLOCKERS: max 5
REPAIR_INSTRUCTIONS: exact and bounded
TESTS_REQUIRED: concrete manual/static checks

Do not rewrite the extension wholesale. Preserve V0 scope.

RETURN TO GPT:
End your response with one copy-ready block labeled RETURN TO GPT containing only the audit verdict, blocker IDs, exact repair instructions, and tests required for GPT Web to continue implementation.
```
