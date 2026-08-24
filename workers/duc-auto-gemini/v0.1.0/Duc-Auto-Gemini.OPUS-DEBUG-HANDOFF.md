# Duc Auto Gemini — Opus 5 Debug Handoff

## Purpose

Owner Pilot (first live run, Pilot-01) is hitting a reproducible bug that Claude Code (Sonnet 5) traced but did not fully root-cause. This doc hands the investigation to a stronger-reasoning session. Everything below is verified from actual source and actual audit-log evidence — no guessing was reported as fact.

## Repository facts

- Workspace: `C:\WORKING ZONE\Chrome_Extension_AI_Agentic`
- Branch: `main`, HEAD at time of writing: `7f7f9d7c40f2d7261a1b580ffa4d4910c5aca91f`
- Package: `workers/duc-auto-gemini/v0.1.0/**` only. Do not touch `workers/duc-auto-chatgpt/v0.1.0/**` — it belongs to another active writer and has its own uncommitted work in progress.
- Uncommitted local changes right now (not yet reviewed/pushed):
  - `manifest.json` — added `icons`/`action.default_icon` (unrelated cosmetic change, already verified, not part of this bug)
  - `sidepanel.js` — **bug #1 fix**, see below
  - `tests/run-core-smoke.mjs`, `tests/sidepanel-static.mjs` — regression tests for bug #1
  - `Pilot-01/` (new, untracked) — owner pilot workbook + 3 synthetic benign reference images
  - `icons/` (new, untracked) — extension icon assets, unrelated
- Full protocol/invariants this package must keep obeying: read `Duc-Auto-Gemini.CLAUDE-CODE-HANDOFF.md` in this same folder before making any change. Key points: writes are scoped to `workers/duc-auto-gemini/v0.1.0/**` only; no `git add -A`/`.`; add an executable regression test for every semantic fix; do not claim live-runtime acceptance — this is still `LIVE_RUNTIME_UNVERIFIED / OWNER_PILOT_PENDING`; never attempt to drive the live Gemini page yourself, all live evidence comes from the owner's own pilot run.

## Bug #1 — FIXED, verified, not the current blocker

`Runner.prepare()` in `run-core.js` returns `Object.freeze({ settings, queue })`. In `sidepanel.js`'s `checkPlan()`, on the **first-ever** Check Plan for a workbook (no matching stored checkpoint yet, so the `else` branch at the checkpoint-restore `if` never reassigns `state.plan`), a later line used to do `state.plan.queue = state.plan.queue.map(...)` — a direct mutation of a frozen object's property — which throws `TypeError: Cannot assign to read only property 'queue' of object '#<Object>'` in strict mode. Fixed by reassigning `state.plan` via spread instead of mutating `.queue` in place (matching the pattern already used one line above for the checkpoint-restore branch). Regression tests added in both `run-core-smoke.mjs` (proves `Runner.prepare()`'s output really is frozen and pins the correct replace-via-spread pattern) and `sidepanel-static.mjs` (pins the exact fixed source line, fails if someone reverts to direct mutation). Full suite verified: Gemini 18/18, repo 62/63 (the 1 failure is the pre-existing unrelated `bridge-install-static.mjs` in the ChatGPT worker's WIP).

This bug fully explained the first round of `TARGET_MISSING` failures (Check Plan crashed before ever calling `DAG_RESOLVE_TARGET`, so the receiver badge never turned green, yet Run buttons were still clickable and ran against an unverified target). After the fix, `checkPlan()` correctly reaches the target-resolution step, and the badge does turn "Gemini Images sẵn sàng" once the Gemini tab is genuinely on `https://gemini.google.com/images`. Not the current problem.

## Bug #2 — OPEN, this is what needs solving

### Symptom

Owner ran **Run Selected** on job `DAG-1` twice (two separate attempts, same symptom both times, fully reproducible):

```
Attempt a007 — 2026-08-24T07:03:19.491Z ATTEMPT_PREPARED (DAG-1, retry_count 1)
             — 2026-08-24T07:03:39.890Z ATTEMPT_FAILED failure_type=ATTEMPT_ID_MISMATCH phase=OWNER_REVIEW  (20.4s later)
             — BATCH_HARD_STOP hard_stop_reason=ATTEMPT_ID_MISMATCH

Attempt a008 — 2026-08-24T07:08:47.669Z ATTEMPT_PREPARED (DAG-1, retry_count 1)
             — 2026-08-24T07:09:08.026Z ATTEMPT_FAILED failure_type=ATTEMPT_ID_MISMATCH phase=OWNER_REVIEW  (20.4s later)
             — BATCH_HARD_STOP hard_stop_reason=ATTEMPT_ID_MISMATCH
```

Both times: ~20.4 seconds between prepare and failure, single isolated job run (not a batch race — `mode:"selected"`, one job only), always lands in `OWNER_REVIEW` with the exact same `failure_type`. This is deterministic enough to not be a random race.

Owner's on-screen observation at the time: the Gemini "Create images" page showed the reference image thumbnail attached in the composer, but the "Describe your image" textbox was empty and no generation appeared to run. **Caveat: this does not prove the prompt was never sent** — most chat UIs (including Gemini's) clear the composer immediately after a message is sent, so an empty box after ~20s is equally consistent with a successful submission whose UI already reset.

### Code trace (confirmed by reading source, not guessed)

`sidepanel.js` `executeAttempt(item)` (~line 129-134):
```js
const response = await message({ type: "DAG_ROUTE_RUN", run_id: state.runId, job_id: item.job.id, attempt_id: item.attempt_id, prompt: item.job.prompt, references: [...], timeout_ms: state.plan.settings.timeout_sec * 1000 });
const outcome = Runtime.responseOutcome(response, item);
```
`DAG_ROUTE_RUN` → `background.js` `routeRun()` → `chrome.tabs.sendMessage(tab, {..., type:"DAG_RUN_IMAGE_JOB"})` → this **awaits full completion** of `content.js`'s `runImageJob()` (attach references, set composer text, click Send, wait for output up to `timeout_ms`) before responding. So the whole round trip time (20.4s) is the real duration of one attempt of `runImageJob()` inside the Gemini tab, not a background/messaging delay.

`runtime-core.js` `responseOutcome(response, expected)` (this is what fired):
```js
function responseOutcome(response, expected) {
    if (response?.attempt && !matchesAttempt(response.attempt, expected)) return { ok: false, phase: "OWNER_REVIEW", failure_type: "ATTEMPT_ID_MISMATCH", last_error: "Response attempt identity did not match the requested job." };
    ...
```
This is the **first** check in the function, evaluated **before** looking at `response.ok` at all. The exact `phase`/`failure_type`/`last_error` values in the audit log match this branch's literals exactly — so we know for certain this is the branch that fired. Whether `content.js` actually succeeded (`response.ok === true`, meaning **a real image may have been generated in the owner's live Gemini account**) or failed for some other reason is currently unknown, because this identity check short-circuits before that would be inspected.

`matchesAttempt(actual, expected)` (`runtime-core.js`):
```js
function identity(value = {}) { return { run_id: String(value.run_id || ""), job_id: String(value.job_id || value.job?.id || ""), attempt_id: String(value.attempt_id || "") }; }
function matchesAttempt(actual, expected) { const left = identity(actual); const right = identity(expected); return Boolean(left.run_id && left.run_id === right.run_id && left.job_id === right.job_id && left.attempt_id === right.attempt_id); }
```
`expected` is the `item` object closed over by `executeAttempt`, read *after* the 20s await resolves. `actual` is `response.attempt`, which originates from `content.js`'s own `state.activeAttempt` (built via `Core.createAttempt({runId: message.run_id, jobId: message.job_id, attemptId: message.attempt_id, ...})`, i.e. built from the exact identity fields `background.js` forwarded, which in turn came from `item.attempt_id` etc. at the moment the request was sent).

Traced and ruled out so far:
- `Core.transition()` (`provider-core.js`) preserves `run_id/job_id/attempt_id` via `{...attempt, ...values, phase: next, ...}` — an ordinary phase transition inside `content.js` cannot silently change identity.
- `run-core.js`'s `prepare()` always builds brand-new `item` objects on every `checkPlan()` call — it never mutates a previously-live `item` reference, so a concurrent `checkPlan()` click during the 20s window should not be able to reach into the in-flight `executeAttempt`'s closed-over `item` and change its `attempt_id`.
- The global submit lease (`lease-core.js`) should prevent two concurrent `DAG_ROUTE_RUN`s from both reaching `content.js` at once, so this doesn't look like the classic double-route race that GPT-DAG-002 already closed — but this has **not** been re-verified against this specific failure mode; worth re-checking that the lease's `run_id|job_id|attempt_id` key can't collide/alias across the retry (`retry_count: 1`) reusing the same `job_id` with a new `attempt_id`.

### Leading hypothesis (unconfirmed — needs live evidence, not more static reading)

~20s is a plausible real Gemini image-generation latency, not a pre-submit timeout (all pre-submit waits in this codebase are ≤7s; the only longer timeout is the 60s `timeout_sec` from the Pilot-01 workbook config, which this didn't hit). It's plausible that `content.js` actually completed a real attempt — successfully or not — and the identity captured in `response.attempt` diverges from what `sidepanel.js` expects for some reason not yet located. If the underlying attempt actually reached `Send`, **the owner's Gemini account may have a real generated image sitting in that conversation that the extension never downloaded or recorded**, because this mismatch check discards the response before ever looking at `response.ok`/`response.output`.

### Owner action needed right now (independent of the code fix)

**Đức: please open the actual Gemini tab/conversation and check whether an image was actually generated for the "Create a simple layout inspired by the selected reference." prompt (DAG-1).** If yes, that changes the risk picture (an untracked live generation happened) and should be reported back before any retry. If no image exists there, that also narrows the hypothesis (points more toward a genuine pre-submit-side identity bug rather than a late/successful response being misclassified).

### Fastest path to a confirmed root cause

Static reading has narrowed this to one specific comparison (`matchesAttempt(response.attempt, item)` inside `responseOutcome`), but not yet to *which* field diverges or *why*. The fastest way to close this is a **single temporary diagnostic log**, one live pilot attempt, then remove the log:

```js
// runtime-core.js, top of responseOutcome(), temporary:
console.log("DAG_DEBUG responseOutcome", { actual: response?.attempt, expected: { run_id: expected?.run_id, job_id: expected?.job?.id, attempt_id: expected?.attempt_id } });
```
Read via the Side Panel's own devtools console (right-click the panel → Inspect) for one more `Run Selected` on `DAG-1`. Whatever differs between `actual` and `expected` there is the real bug (e.g. an empty `run_id`, a stale `attempt_id` from a previous retry, a `job_id` vs `job.id` shape mismatch, etc.). Please remove the temporary log before shipping any fix, or replace it with something quieter if it's worth keeping for future diagnosis.

### What a valid fix needs (per this package's established discipline)

- Bounded change inside `workers/duc-auto-gemini/v0.1.0/**` only.
- An executable regression test reproducing the exact mismatch condition once it's identified (existing `tests/` suite has good precedent for this — e.g. `global-submit-lease-smoke.mjs`, `runtime-behavior-smoke.mjs` — dependency-free Node scripts using `node:assert/strict`).
- Full suite must stay green: `node workers/duc-auto-gemini/v0.1.0/tests/run-all.mjs` and `npm test` from repo root (expect 62/63 with the one pre-existing unrelated ChatGPT failure; investigate anew if that count changes).
- Do not commit/push — leave that decision to Claude Code / the owner once verified, per the repo's approval rule on `git push`.

---

# RESOLUTION — Opus 5 session, 2026-08-24

Status: **Bug #2 root-caused and fixed. A second, independent bug (#3) is now unmasked and needs live DOM evidence.**

## Bug #2 — root cause (proven, not hypothesised)

`Runner.prepare()` builds queue items with exactly these keys:

```
job, index, references, phase, retry_count, result_file, failure_type, last_error
```

There is **no `run_id`**. `sidepanel.js` passed that bare `item` as the `expected` argument to
`Runtime.responseOutcome(response, item)` and `Runtime.matchesAttempt(attempt, item)`.

`runtime-core.js` `identity()` reads `run_id` with no fallback:

```js
run_id: String(value.run_id || "")   // always "" for a queue item
```

`matchesAttempt` then evaluates `left.run_id && left.run_id === right.run_id`. The response side always
carries a real `run_id` (`content.js` builds it via `Core.createAttempt({ runId: message.run_id, ... })`),
so the comparison was `"20260824..." === ""` -> **false, unconditionally**.

Because `responseOutcome()` tests identity *first*, **every** response from `content.js` was discarded as
`ATTEMPT_ID_MISMATCH` — including a fully successful one. `ATTEMPT_ID_MISMATCH` is in `batch-core.js`
`HARD_FAILURES`, so it forced `OWNER_REVIEW` + `BATCH_HARD_STOP` every time. Deterministic, 100%
reproducible, exactly matching the a007/a008 audit records.

Verified empirically against the real `Runner.prepare()` output:

```
identity(item)     : {"run_id":"","job_id":"DAG-1","attempt_id":"20260824070319-abc123:DAG-1:a007"}
identity(response) : {"run_id":"20260824070319-abc123","job_id":"DAG-1","attempt_id":"20260824070319-abc123:DAG-1:a007"}
matchesAttempt     : false
outcome for a REAL SUCCESSFUL generation:
  {"ok":false,"phase":"OWNER_REVIEW","failure_type":"ATTEMPT_ID_MISMATCH", ...}
```

### Why the suite stayed green

`tests/runtime-behavior-smoke.mjs` fixtures (`jobA`, `jobB`) declare a synthetic `run_id: "run"` field
that a real queue item never has. The tests exercised an identity shape that production never produces.

### Fix applied

`sidepanel.js` now derives a complete expected identity from the live run instead of the queue item:

```js
function expectedIdentity(item) { return { run_id: state.runId, job_id: item?.job?.id || item?.job_id || "", attempt_id: item?.attempt_id || "" }; }
```

Applied at all five comparison sites: `applyAttempt`, `advance`, `executeAttempt` (run + ready) and `stop`.
`state.runId` is the single source of truth, so the identity cannot drift the way a copied field would.
`runtime-core.js` is unchanged — its fail-closed comparison was correct; the caller was supplying an
incomplete identity.

### Regression tests

- `tests/attempt-identity-smoke.mjs` (new) — builds a queue through the real `Runner.prepare()`, pins that a
  bare item rejects its own attempt, that a `run_id`-complete identity accepts it, that a genuine
  `ATTACHMENT_NOT_READY` is no longer masked, and that cross-run / cross-job / stale-attempt responses are
  still rejected. Also covers the `job_id`-shaped checkpoint-restored item.
- `tests/sidepanel-static.mjs` — pins the helper and fails on any reversion to a bare-`item` comparison.
  Verified to fail against the pre-fix source.

Suites: Gemini **19 passed, 0 failed**; repository **63 passed, 0 failed**, observer PASS.
(The repo total moved 62 -> 63 because the other writer's `bridge-install-static.mjs` now passes. Count rose,
nothing regressed.)

## Owner risk question — answered: no image was generated

The handoff's leading hypothesis (a real generation was produced and silently discarded) is **wrong**.
Evidence:

- `timeout_sec` in `Pilot-01/Duc-Auto-Gemini-Pilot-01.xlsx` is **60**, so the 60s output wait cannot
  produce a 20.4s failure.
- The only 20s bound reachable in `DAG_ROUTE_RUN` is `content.js:125`,
  `waitUntil(..., 20000, "ATTACHMENT_NOT_READY")`. Every other bound is 3s, 7s, 30s or 60s.
- a007 lasted 20.399s and a008 lasted 20.357s — **42 ms apart**. That is a fixed timeout, not variable
  image-generation latency.
- `attachReferences()` runs *before* `setComposerText()`. It threw, so the prompt was never typed and
  Send was never clicked — which is exactly what Đức saw: thumbnail attached, textbox empty, no generation.

So the attempt never crossed the submit boundary. **Nothing was sent to the live Gemini account and no
untracked image exists.**

### Decisive confirmation available without a new pilot run

`background.js` already persisted the true final phase. In the **Side Panel** devtools console:

```js
chrome.storage.local.get("dag.durable_attempts.v1").then(r =>
  console.table(Object.values(r["dag.durable_attempts.v1"] || {})
    .map(a => ({ attempt_id: a.attempt_id, phase: a.phase, failure_type: a.failure_type, last_error: a.last_error }))));
```

Expect a007/a008 as `FAILED_PRE_SUBMIT` / `ATTACHMENT_NOT_READY`. The temporary `console.log` proposed in
the original handoff is no longer needed and was never added.

## Bug #3 — OPEN, newly unmasked: attachment preview is never detected

`provider-core.js` `SELECTORS.attachmentPreview` is a set of guesses at Gemini's internal attributes:

```js
'[data-test-id*="attachment" i]', '[data-test-id*="upload" i] img',
'button[aria-label*="Remove" i] img', 'button[aria-label*="Xóa" i] img'
```

`attachmentReady(before, expected, { after, busy })` requires `after >= before + expected`. If none of those
selectors match Gemini's real preview element, `after` stays 0 and the 20s timeout fires even though the
thumbnail is plainly visible. Alternatively `attachmentPending()` may be latching `busy` true.

**Do not guess replacement selectors.** This needs one read-only DOM probe. With a reference attached by
hand in the Gemini Images composer, run in the **Gemini tab** console:

```js
['[data-test-id*="attachment" i]','[data-test-id*="upload" i] img','button[aria-label*="Remove" i] img','button[aria-label*="Xóa" i] img']
  .map(s => [s, document.querySelectorAll(s).length]);
```

All zero confirms the selector gap. Then capture the real element:

```js
[...document.querySelectorAll('img')]
  .filter(i => { const r = i.getBoundingClientRect(); return r.width && r.width < 200 && r.height < 200; })
  .map(i => ({ testid: i.closest('[data-test-id]')?.getAttribute('data-test-id'),
               aria: i.closest('[aria-label]')?.getAttribute('aria-label'),
               cls: String(i.parentElement?.className).slice(0, 80) }));
```

Also check the busy latch:

```js
document.querySelectorAll('[aria-busy="true"][data-test-id*="upload" i], [data-test-id*="upload" i] [role="progressbar"], [class*="upload"] [role="progressbar"]').length;
```

### Behaviour change to expect on the next pilot

With Bug #2 fixed, `ATTACHMENT_NOT_READY` now reports itself honestly: `FAILED_PRE_SUBMIT`, retried once
(`max_retries: 1`), then continued rather than hard-stopping the batch (`continue_on_error: true`). The Side
Panel will show the real failure name instead of `ATTEMPT_ID_MISMATCH`. `DAG-0` (zero references) should now
run end-to-end, because `attachReferences()` returns immediately when there are no references — that is the
cleanest way to confirm the identity fix on live runtime while Bug #3 is still open.

## Scope and status

- Changed: `sidepanel.js`, `tests/sidepanel-static.mjs`, `tests/attempt-identity-smoke.mjs` (new).
- No changes to `runtime-core.js`, `run-core.js`, `content.js`, `background.js`, `provider-core.js`.
- Nothing under `workers/duc-auto-chatgpt/v0.1.0/**` was touched.
- Not committed and not pushed — per the repo approval rule, that decision is Đức's.
- Live status remains `LIVE_RUNTIME_UNVERIFIED / OWNER_PILOT_PENDING`.

---

# ROUND 2 — owner re-test, 2026-08-24

Owner report after the Bug #2 fix: *"extension đóng ngay sau khi khởi chạy, có add ảnh nhưng mà không add
text và prompt một chút nào."*

This confirms the Bug #3 prediction exactly — the reference image attaches, then `attachReferences()` throws
before `setComposerText()` ever runs, so the composer stays empty. It also surfaced a fourth, separate defect.

## Bug #4 — FIXED: the side panel unloaded itself on every run

`sidepanel.js` `downloadBlob()` created an `<a download href="blob:…">` and called `anchor.click()`. It runs
in the `finally` of `runQueue()`, i.e. the instant any run ends — and with Bug #2 that was ~20 s in. In a
Chrome side panel a programmatic anchor click on a blob URL can be treated as a panel navigation, which
unloads `sidepanel.html` and destroys the running UI. That is the "extension đóng" symptom.

Fixed by downloading through `chrome.downloads.download({ url, filename, conflictAction: "uniquify",
saveAs: false })`. The `downloads` permission was already declared, so **no manifest change and the
least-privilege invariant is preserved**. No anchor is constructed anywhere in the panel any more.

Pinned in `tests/sidepanel-static.mjs`: asserts the `chrome.downloads.download` call and asserts the source
contains neither `anchor.click()` nor `document.createElement("a")`.

## Bug #3 — instrumented so the next run diagnoses itself

Rather than guess Gemini's DOM, `content.js` now captures a fingerprint at the moment
`ATTACHMENT_NOT_READY` fires:

```js
function attachmentFingerprint(before, expected, input) // -> { before, expected, input_files, busy, selectors, thumbs }
```

- `selectors` — each configured `attachmentPreview` selector with its live match count.
- `thumbs` — up to 6 small on-screen images with their nearest `data-test-id`, `aria-label` and parent class.
- `input_files` — whether `input.files` was actually populated, separating "upload never happened" from
  "upload happened but was not detected".
- `busy` — whether `attachmentPending()` is latching.

The payload rides in the error message, so it lands in `item.last_error`. `failure_type` stays the clean
`ATTACHMENT_NOT_READY` (`detail.failure_type` is read first in the catch), so `classifyFailure()` and
`retryDecision()` keep working unchanged.

`sidepanel.js` now records `last_error` on the `ATTEMPT_FAILED` audit event, and `updateWorkbook()` already
writes `last_error` into the results workbook. **The owner therefore gets the diagnosis by opening the
auto-downloaded `__results__` file — no devtools session required.**

Pinned in `tests/content-static.mjs` (fingerprint present, clean `failure_type`, `input_files` reported).

## Reference extension — assessed, not adopted

"Automation for Google Gemini" v1.2.5 (`jlhacppkbcmonaanlkbgipimelfbjgpb`) requests **"Access the page
debugger backend"**, i.e. the `debugger` permission / Chrome DevTools Protocol. That is how it drives the
composer and file input with trusted events (`Input.insertText`, `DOM.setFileInputFiles`) instead of
synthetic DOM events.

**Recommendation: do not adopt it yet.** The evidence says our attachment *action* already works — Đức sees
the thumbnail appear. Only the *verification* step is broken. CDP would not fix a selector gap. Adopting it
would break the least-privilege invariant, force a "DevTools is debugging this browser" banner onto the page
on every run, and is a large architectural change. Revisit only if the fingerprint proves the upload itself
is failing (`input_files: 0`).

Note `setComposerText()` already uses `document.execCommand("insertText")` after focusing and selecting the
contenteditable, with a `textContent` + `InputEvent` fallback — the standard non-CDP approach for
framework-backed rich text editors. It has never actually executed on a live run, so it remains unverified.

## Status after round 2

- Changed this round: `content.js`, `sidepanel.js`, `tests/content-static.mjs`, `tests/sidepanel-static.mjs`.
- `manifest.json` remains dirty from the owner's own icon work; permissions untouched:
  `["storage", "sidePanel", "downloads"]` + the Gemini host only.
- Suites: Gemini **19 passed, 0 failed**; repository **63 passed, 0 failed**, observer PASS.
- Still not committed and not pushed.
- Bug #3 remains OPEN pending the fingerprint from one live run.

## Antigravity delegation attempt — 2026-08-24, failed (no work lost)

The owner asked whether Antigravity could take the load/reload/verify pass. It was invoked for real through
its CLI (`agy -p`, model Gemini 3.1 Pro High). The channel authenticates and returns text, but **every shell
command is auto-denied in print mode** — its permission gate requires an interactive approver and there is
none in background mode. It failed at the first command, before opening Chrome or running any test.

Working-tree integrity was verified byte-for-byte against a pre-invocation backup: `sidepanel.js`,
`content.js` and all three touched test files are unchanged, and the suite is still 19 passed, 0 failed.
Antigravity changed nothing.

Escalating with `--dangerously-skip-permissions` would grant unrestricted command execution and file writes;
the owner declined and chose to run the pilot himself. Delegate to Antigravity only as a prompt the owner
pastes into the IDE, where he approves each step.

## ROUND 3 — Codex second opinion, 2026-08-24

Antigravity could not run (permission gate denies every command in headless print mode). Codex first
attempt could not run either (`windows sandbox: helper_unknown_error: apply deny-read ACLs` on every read).
Codex succeeded only when the relevant source was pasted inline into the prompt, removing its need for
file access. Neither agent modified anything; the working tree was verified byte-for-byte against a backup.

### Codex finding (accepted, acted on)

The readiness model was structurally defective independently of whether the selectors are correct:

- Four overlapping `attachmentPreview` selectors were SUMMED, so one preview could count several times.
- Counting ran across the whole document, not the composer.
- Decisive case: a placeholder replaced IN PLACE by the finished thumbnail produces no numerical increase,
  so `after >= before + expected` stays false while the page has in fact rendered the attachment.

### Changes

- `content-decision-core.js` — new `addedSince(before, after)`: counts unique NEW nodes, so an in-place
  swap is correctly recognised as one arrival.
- `content.js` — `attachmentScope()` narrows observation to the composer; `attachmentNodes()` collects
  unique preview nodes into a Set and adds a brand-agnostic fallback (a small `img` inside the composer),
  so the check survives Google renaming its internals; `attachmentPending(scope)` is now scoped, so an
  unrelated page-wide spinner can no longer latch busy forever.
- `content.js` — staging and confirmation split (`stageReferences` / `confirmReferences`) with the prompt
  typed BETWEEN them. Confirmation still gates Send, so the submit invariant is unchanged, but the
  composer-typing path finally executes on a live page instead of being unreachable behind the failure.

### Tests

- `tests/content-decision-behavior-smoke.mjs` — pins the replacement model, including the exact case the
  old summed comparison rejected: `attachmentReady(1, 1, { after: 1 })` is false while the new model is true.
- `tests/content-static.mjs` — pins the scoped observation, the scoped busy latch, the ordering
  stage -> type -> confirm -> Send, and fails if the summed `reduce` model returns.

Suites: Gemini 19 passed, 0 failed; repository 70 passed, 0 failed (the other writer added tests; count
rose from 63, nothing regressed). Still not committed, not pushed. Bug #3 remains unconfirmed on live
runtime until the owner reports whether the prompt now appears and whether the attachment check passes.

## ROUND 4 — Independent audit, 2026-08-24 (debugging PAUSED by owner)

Owner paused live debugging and requested a full independent audit of both workers plus a port-feasibility
verdict ("reuse the proven ChatGPT worker, swap only the Gemini input layer?"). Audit completed — no code
was changed in this round. Full report (Vietnamese, for the owner):
`drafts/AUDIT-DOC-LAP-2026-08-24.md` (new file, declared here). Headline findings: the Gemini worker is a
from-scratch rewrite, not a port; ~85–90% of the ChatGPT worker is reusable via a Provider Adapter split
(7 identified change points, incl. the latent blob:-scheme trap at chatgpt background.js:37); the sole
systemic weakness is unverified Gemini DOM selectors (open Bug #3); recommendation is a 5-phase roadmap
(freeze/commit → live DOM evidence → platform unification → pilot → autonomous improve loop). Waiting on
the owner's direction choice (A: unified platform from ChatGPT worker — recommended; B: keep patching the
standalone Gemini worker).

## DECISION — 2026-08-25: owner chose Direction A

Đức chose Direction A (unified platform extracted from the ChatGPT worker; each provider becomes a thin
adapter). G0 executed: full working tree committed as `e73e220` (gemini fixes) + `0a3498c` (chatgpt WIP
checkpoint); tree clean, 70/70 green at freeze point. Not pushed — push requires separate owner approval.
Execution plan: `drafts/PLATFORM-ADAPTER-PLAN.md` (new file, declared here). G1 (live Gemini DOM capture)
is the current critical path and needs the owner.
