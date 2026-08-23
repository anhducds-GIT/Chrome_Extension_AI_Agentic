# Duc Auto Gemini — Owner Pilot Runbook

## Purpose

Close the final 10% with live evidence. This pilot is not permission to bypass Gemini limits, CAPTCHA, unusual-activity warnings, policy blocks or account restrictions.

## Preflight

1. Confirm the unpacked extension path and version `0.1.0`.
2. Open exactly `https://gemini.google.com/images` in the intended account.
3. Confirm no CAPTCHA, security warning, quota message or generation already in progress.
4. Open the Side Panel and load `fixtures/Duc-Auto-Gemini.SYNTHETIC-QUEUE.xlsx` plus three benign reference images named exactly as the fixture expects.
5. Run **Check Plan** only. Confirm three jobs and 0/1/3 reference thumbnails.

## Controlled pilot sequence

1. Run only `DAG-0`. Confirm exactly one prompt submission, attributable output, completed download and Result XLSX checkpoint.
2. Reopen the Side Panel and verify `DAG-0` remains complete and non-runnable.
3. Run only `DAG-1`. Confirm the selected reference preview is ready before Send.
4. Run only `DAG-M` after confirming the current account accepts three references.
5. During a separate disposable job, close/reopen the panel after `SUBMITTED`. Confirm the job becomes owner-review/ambiguous and is not resent.
6. Test a wrong route such as Library; Check Plan must fail closed.
7. Revoke output/download permission or interrupt the target tab; verify a visible failure with no next submission.

## Immediate hard stops

- CAPTCHA, verify-human, unusual activity or suspicious activity.
- Quota/limit or policy block.
- Two prompt submissions for one attempt ID.
- Output selected from templates, input previews or an earlier attempt.
- Any later job starts while the prior attempt is ambiguous.

## Pilot evidence to retain

- Extension version and Git SHA.
- Result XLSX checkpoints and audit JSONL.
- Job/attempt IDs and actual downloaded filenames.
- Submit count per job.
- Exact blocker/error text when a case stops.
- Account/model/locale context without email, cookies, tokens or other PII.

## Pilot verdict

- `PASS`: 0/1/multi-reference jobs each submit exactly once, persist attributable output and resume safely.
- `REVISE`: local DOM/UX defect with no duplicate submission or wrong attribution.
- `REJECT`: duplicate submission, wrong-output attribution, security bypass or loss of submitted state.
