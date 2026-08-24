# Duc Auto Gemini — Claude Code Handoff

## Mission

Receive the GPT Web audit for Duc Auto Gemini, independently verify repository state, and either preserve the accepted package unchanged or implement only a concrete bounded revision. Begin read-only. Do not modify code merely because the task says “review”, “optimize”, “debug” or “audit”.

- Initial operating mode: `READ_ONLY_AUDIT`.

## Repository identity

- Workspace: `C:\WORKING ZONE\Chrome_Extension_AI_Agentic`
- Remote: `https://github.com/anhducds-GIT/Chrome_Extension_AI_Agentic.git`
- Branch: `main` only
- Package: `workers/duc-auto-gemini/v0.1.0/**`
- Accepted 90% SHA: `e6408451d4105ed56c60934269fefbebdc8d2712`
- Page-only preflight SHA: `8d23bc9d26c70efea9abf991452b3b75944a4b39`
- Handoff package SHA: `7d0e787dea1576cbcc2101d79886747e63199b8b`
- Run ID: `20260824-dag-v01-000-090-r01`
- Current status: GPT-DAG-001/002 bounded fixes implemented; GPT Web re-audit pending
- Live status: `LIVE_RUNTIME_UNVERIFIED / OWNER_PILOT_PENDING`

The handoff artifacts may be committed after the page-preflight SHA. Resolve the current immutable handoff commit from the operator message and verify its ancestry; do not replace the accepted implementation SHA with an unverified moving `main`.

## Read-only bootstrap

Run these commands in PowerShell before any edit:

```powershell
Set-Location -LiteralPath 'C:\WORKING ZONE\Chrome_Extension_AI_Agentic'
git status --short --branch
git fetch origin
git rev-parse HEAD
git rev-parse origin/main
git merge-base --is-ancestor 8d23bc9d26c70efea9abf991452b3b75944a4b39 origin/main
git diff --name-only --cached
git log --oneline --decorate -12
```

Required bootstrap conclusions:

- Confirm exact `HEAD`, `origin/main`, ancestry and staged-index state.
- Inventory current dirty/untracked paths before touching anything.
- Expect unrelated active work under `workers/duc-auto-chatgpt/v0.1.0/**`; the exact list can drift. It belongs to another writer.
- Never use `git stash`, `git reset`, `git clean`, checkout-based discard, force push, `git add .` or `git add -A`.
- If Gemini paths are unexpectedly dirty, stop with `NEED_OWNER_INPUT`; do not overwrite them.

## Source-of-truth order

1. The exact Git commit supplied by the operator.
2. `Duc-Auto-Gemini.HANDOFF-MANIFEST.json`.
3. `Duc-Auto-Gemini.RUN-LEDGER.md`.
4. `evidence/20260824-dag-v01-000-090-r01/20260824-dag-v01-000-090-r01.ACCEPTANCE-HANDOFF.md`.
5. `evidence/20260824-dag-v01-000-090-r01/20260824-dag-v01-000-090-r01.TEST-REPORT.md`.
6. `evidence/20260824-dag-v01-000-090-r01/20260824-dag-owner-pilot-preflight-page-r01.LIVE-PAGE-EVIDENCE.md`.
7. `evidence/20260824-dag-v01-000-090-r01/20260824-dag-gpt-bounded-fix-r01.EVIDENCE.md`.
8. `Duc-Auto-Gemini.PILOT-RUNBOOK.md`.
9. The GPT Web verdict and evidence matrix; findings are inputs to verify, not authority by themselves.

If two sources conflict, use exact committed code/test evidence and report the contradiction. Never silently reconcile a mismatch.

## Architecture map

| Area | Authoritative files |
| --- | --- |
| MV3/permissions/load order | `manifest.json` |
| Provider state/output attribution | `provider-core.js` |
| Cross-context identity/restart | `runtime-core.js` |
| Attempt-to-tab binding | `binding-core.js`, `background.js` |
| Extension-wide submit exclusion | `lease-core.js`, `background.js` |
| Whole-batch continuation/hard stops | `batch-core.js`, `sidepanel.js` |
| Upload/send/blocker decisions | `content-decision-core.js`, `content.js` |
| Queue/settings/audit/checkpoint | `run-core.js`, `sidepanel.js` |
| XLSX read/write boundary | `xlsx-codec.js` |
| Operator UI | `sidepanel.html`, `sidepanel.css`, `sidepanel.js` |
| Deterministic verification | `tests/**`, `fixtures/**` |

## Non-negotiable invariants

- One submit-critical job at a time.
- The background global lease is persisted in `chrome.storage.session` and admits only one routed submit-critical attempt across simultaneous Side Panels/tabs and MV3 service-worker restarts.
- Persist `SUBMITTED` before Send; never auto-resend a submitted/ambiguous/restarted attempt.
- Bind every attempt to exact `run_id/job_id/attempt_id` plus its original Gemini Images tab/window.
- Reject cross-job/cross-attempt responses.
- Accept output only from one new attributable model-response container after the submit boundary.
- Reject templates, input previews, stale/old containers and ambiguous multiple outputs.
- Hard-stop the active batch on owner review, interruption, security/quota/policy and identity/binding failure.
- Restrict continue-on-error to ordinary exhausted pre-submit failures.
- Recover only from exact `FILE_INPUT_NOT_EXPOSED`; propagate blocker/abort/unknown errors without another click.
- Re-read `abortRequested` after durable `SUBMITTED` and immediately before Send.
- Preserve least privilege: `storage`, `sidePanel`, `downloads`, Gemini host only.
- Never overwrite the source workbook.

## Verification commands

```powershell
node workers/duc-auto-gemini/v0.1.0/tests/run-all.mjs
npm test
git diff --check -- workers/duc-auto-gemini/v0.1.0
```

Baseline at the accepted snapshot:

- Gemini suite: `16 passed, 0 failed`.
- Gemini suite after adding the handoff-integrity test: `17 passed, 0 failed`.
- Gemini suite after GPT-DAG-001/002 regression tests: `18 passed, 0 failed`.
- Repository suite: `63 passed, 0 failed`; observer PASS.
- Syntax, JSON and secret scans: PASS.

Repository-wide test totals may increase because another writer is active. A lower count or any failure requires investigation; do not normalize it away.

## Pilot inputs and explicit owner dependency

- Included workbook: `fixtures/Duc-Auto-Gemini.SYNTHETIC-QUEUE.xlsx`.
- Jobs: `DAG-0`, `DAG-1`, `DAG-M` with 0/1/3 references.
- The following benign reference files are intentionally not committed and must be supplied by the owner:
  - `reference-one.png`
  - `reference-two.jpg`
  - `reference-three.webp`
- Do not substitute personal/confidential images or guess filenames.

## GPT verdict routing

### If GPT returns PASS

- Verify the cited SHA/files and tests read-only.
- Make no code changes.
- Report `NO CODE CHANGE` and route the owner to `Duc-Auto-Gemini.PILOT-RUNBOOK.md`.

### If GPT returns REVISE

- Verify every finding against the exact code before editing.
- Reject findings based only on stale files, guessed runtime state or unexecuted assumptions.
- Before authorized writes, run `git pull --ff-only origin main` and recheck ancestry/status.
- Modify only the smallest paths under `workers/duc-auto-gemini/v0.1.0/**` needed to close verified findings.
- Add an executable regression test for each semantic defect.
- Do not start live generation unless the owner separately initiates the pilot.

### If GPT returns REJECT or BLOCKED

- Do not patch speculatively.
- Report the exact blocker/evidence and one owner action.

## Publication protocol for an authorized revision

```powershell
git status --short --branch
git diff --check -- workers/duc-auto-gemini/v0.1.0
git add -- <exact Gemini paths only>
git diff --cached --name-only
git diff --cached --check
git commit -m "<bounded Gemini change>"
git push origin main
git ls-remote origin refs/heads/main
```

Before committing, prove every staged path begins with `workers/duc-auto-gemini/v0.1.0/`. Preserve all ChatGPT/Pilot-08 work. After pushing, report the immutable SHA, push range, remote readback, changed paths, tests, unresolved risks and rollback/owner action.

## Live-runtime boundary

Claude Code may inspect and change repository files, but must not claim extension runtime acceptance from static tests or page-only DOM evidence. Do not attempt to view the Side Panel through unsupported browser automation. CAPTCHA, security, quota and policy warnings are hard stops. Actual prompt submission, upload, download and subjective output quality remain owner-pilot evidence.

## Required Claude Code handoff response

1. Verdict: `ALIGN`, `ALIGN_WITH_FIX`, `REJECT`, or `BLOCKED`.
2. Exact audited SHA and ancestry/readback.
3. Dirty-tree containment statement.
4. GPT finding-by-finding verification.
5. Changed paths, or `NO CODE CHANGE`.
6. Verification commands and results.
7. Live status and blockers.
8. Commit/push SHA if changes were authorized.
9. Exactly one next owner action.
