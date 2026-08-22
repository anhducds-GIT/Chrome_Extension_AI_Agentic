# Coordinator / Auditor handoff

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

- 2026-08-22 · Claude · Independent audit of HEAD `54fff5d`. Verdict REVISE. Protected invariants (exact-once, attribution, readiness, retry, security hard-stop) all confirmed intact. Four artifact-truthfulness defects found, all reproduced in the committed Pilot-05 evidence.
- 2026-08-22 · Claude · Đức assigned implementation. Fixed in one pass, no commit:
  - `xlsx-codec.js` `updateConfigSnapshot` appended duplicate config rows reusing the same `@r` numbers (Pilot-05 v005: 64 rows / 44 distinct, 40 duplicate cell refs), freezing a stale first copy of every key. Rows are now pushed back into the captured `rows` array.
  - `DacRunnerCore.basename()` (a lossy image-reference helper) was lower-casing artifact filenames into recorded provenance. New `DacOutputLocation.artifactLeaf()` preserves case; 9 call sites moved over.
  - `saveAuditLog` never cleared `state.auditEvents` after a verified append, so a second flush re-emitted persisted events (`AUDIT_CHAIN_GAP` written twice). Buffer now cleared after the verified directory write only.
  - Four `innerHTML` sinks fed chatgpt.com-sourced image URLs and workbook text into the privileged side panel. All renderers now build nodes; image sources are restricted to `https:` / `data:image/`.
  - Also: persisted byte count is verified against the written blob (directory) and against `fileSize`/`exists` (Downloads); `overwrite` policy no longer reports a first write as `overwritten`; `safeRelativeFolder` no longer admits `*` and `"`; `PERSISTENCE_VERIFICATION_FAILED` added to `FAILURE_TYPES`; a verified recreate whose continuation is blocked no longer displays "RECREATE BLOCKED".
  - Tests: 33 pass (was 31). New `xlsx-config-snapshot-smoke`, `artifact-integrity-smoke`; `pilot-05-checkpoint-fixture` no longer shells out to `tar`. `npm test` added at repo root.
  - Pilot-03 / Pilot-05 artifacts deliberately untouched; they remain the operator evidence for these defects.
- **Next:** Đức runs the live acceptance pass (see README "Running the tests" for the deterministic suite). Live-only items: recreate banner wording, queue/output list rendering after the DOM rewrite, and a fresh continued run producing a v00N checkpoint whose `config` sheet has no duplicate keys.
