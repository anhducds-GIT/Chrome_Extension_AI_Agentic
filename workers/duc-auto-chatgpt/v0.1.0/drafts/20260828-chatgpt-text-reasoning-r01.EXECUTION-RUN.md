# 20260828-chatgpt-text-reasoning-r01 — Execution Run

## 1. Identity

- Run ID: `20260828-chatgpt-text-reasoning-r01`
- Owner: Đức
- Lead / executor: Codex (`codex-chatgpt-text-reasoning-1`)
- Auditor: independent sub-agent using `ops-multistep-acceptance-auditor-v1`

## 2. DPP

- Goal: make Duc Auto ChatGPT support ordinary text reasoning as a first-class job type without breaking its image-generation path, and repair the pre-send artifact filename verification failure.
- Scope: ChatGPT worker UI, runner/content dispatch, XLSX ledger, Bridge job schemas, Result/audit persistence, deterministic tests, README/schema docs and handoff.
- Out of scope: new permissions, live pilot execution, retry/halt policy changes, selector guessing, B-22 abort race, protected pilot/evidence edits, Gemini worker and root platform files.
- Definition of Done: canonical `task_type`; text output captured into a verified Result XLSX checkpoint; no image processing for text; Bridge add/update/proposal support; legacy image default; atomic Downloads verification; full regression green; independent Pass B.
- Risk: high around post-submit duplicate prevention and persistence; medium around backward compatibility; low around UI/docs.

## 3. Source of truth

1. Root and package `AGENTS.md`, package `HANDOFF.md`, `decisions.md`, `BACKLOG.md`.
2. Current source at HEAD `08304749b24664b5cc7503992c9c60503a7ef70a` plus actual working-tree diff.
3. Reproducible Node tests and independent acceptance audit.

## 4. Completeness check

- Required field missing: none for static implementation.
- Filled from source: existing exact-once phases, retry semantics, output/checkpoint contract, Bridge schemas, current failure evidence.
- Safe assumptions: legacy jobs without `task_type` remain `image_generation`; Quick Prompt may default to `text_reasoning` because the owner described reasoning as the active workflow.
- Owner decisions still required: permission to run one live text trial after extension reload.
- Result: COMPLETE for implementation; live acceptance remains gated.

## 5. Gate matrix

- GREEN: read-only inspection, scoped source/tests/docs, static verification.
- YELLOW: package source-of-truth edits and handoff; authorized by the owner's fix/build request.
- RED: new permission, live pilot, safety-policy change, delete/publish/force push; none executed.
- Hard approval phrase: explicit owner approval for a new live text trial.

## 6. Phase graph and results

### P1 — Atomic artifact persistence

- Objective: remove the split expect-name/download race that surfaced as `PERSISTENCE_FILENAME_MISMATCH` before send.
- Output: `DAC_DOWNLOAD_ARTIFACT` background transaction validates requested name, starts the download, waits for completion and verifies physical filename/bytes before returning.
- Verification: dedicated regression plus existing filename determiner test.
- Result: PASS.

### P2 — Typed job contract

- Objective: carry `image_generation|text_reasoning` through Quick Prompt, XLSX, runner, Bridge direct/update/proposal and queue reads.
- Output: typed UI, schema normalization, legacy image default, task-aware proposal/queue display.
- Verification: `text-reasoning-mode-smoke.mjs`, Quick Prompt and Bridge regressions.
- Result: PASS.

### P3 — Text execution and verified result

- Objective: submit through the same reservation/send boundary, capture stable assistant text, persist before success, never use image reconciliation/download for text.
- Output: `DAC_RUN_TEXT_JOB`, `finishTextOutput`, exact response ledger fields, response hash/count audit fields, post-submit fail-closed halt, text-aware resume proof.
- Verification: pure text contract tests, static route checks, resume reopen test, full worker suite.
- Result: PASS (static); live owner-profile check not run.

### P4 — Documentation and handoff

- Objective: make the mixed workflow understandable and reproducible.
- Output: README, XLSX contract, package file map and HANDOFF log.
- Verification: review commands and session gate.
- Result: PASS for implementation/handoff; independent Pass B refresh pending.

## 7. Acceptance Contract (Pass A)

- Persistence PASS: atomic name/download/verification path; UUID filenames rejected; zero submission when pre-send persistence fails.
- Type PASS: canonical enum throughout Quick UI, XLSX, Bridge and runner; missing legacy field defaults to image.
- Text PASS: exact Unicode/newline response in Result XLSX, `output_type=text`, count/hash, verified checkpoint before success.
- Safety PASS: no image download/attribution/reconciliation for text; any unresolved post-submit text result halts without resend.
- Compatibility PASS: image path and manifest/permissions unchanged; protected evidence untouched.
- Secrecy PASS: full response absent from Bridge reads, audit and console; pairing/token absent from repository.
- Live PASS: requires an owner-approved, post-reload text trial. Without it the honest ceiling is static PASS / live unverified.

## 8. Run ledger

- Current state: HANDOFF_REQUESTED
- Current phase: owner requested stop and handoff to Claude Code while refreshed Pass B was running
- Completed phases: P1, P2, P3 static implementation, P4 docs/handoff, full regression
- Pending phases: restart independent Pass B from the final diff; live owner-profile acceptance remains separately gated
- Blockers: live trial lacks owner approval; unrelated dirty Flow/root work must remain untouched
- Approved gates: GREEN/YELLOW scoped package changes
- Artifacts/evidence: changed package files; behavioral filename/zero-send and text-transition/no-resend tests; `npm.cmd test` worker 94/94 plus root suites green; launcher files outside repo
- Acceptance status: Pass A contract locked; Pass B returned REVISE on AC-01/02/03, all three remediated; refreshed audit was interrupted solely because Đức requested handoff
- Next transition: HANDOFF_REQUESTED → Claude claims package → refreshed independent Pass B

## 9. Verify package (to be finalized)

- Final state: pending refreshed Pass B; static implementation complete, live unverified
- Files/states changed: ChatGPT package plus required `.agents/claims.json` bookkeeping; two Bridge launchers outside repository
- Evidence: worker/full test output, behavioral harnesses, syntax/diff checks, session-check, auditor reports
- Out-of-plan changes: none intended
- Remaining assumptions: live ChatGPT DOM behavior cannot be certified by Node tests
- Auditor verdict: first Pass B REVISE (test depth + missing handoff only); remediation complete; refreshed audit interrupted before verdict at owner request
- NEXT ACTION: Claude claims the package, reads the dedicated handoff, and obtains a fresh independent Pass B; do not run live without owner approval.
