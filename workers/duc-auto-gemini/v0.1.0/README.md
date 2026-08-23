# Duc Auto Gemini V0.1

Local-only Manifest V3 Side Panel extension for sequential XLSX-driven image jobs on Gemini Images.

## Delivered boundary

- `STATIC_PASS`: manifest, syntax, namespace, UI and source guards.
- `FIXTURE_PASS`: deterministic 0/1/multi-reference queue, exact-once state, stale/ambiguous output rejection, blockers, checkpoint restart and output collision policy.
- `LIVE_DOM_VERIFIED`: current empty `https://gemini.google.com/images` composer and Upload & tools affordance were mapped read-only.
- `LIVE_RUNTIME_UNVERIFIED`: the extension has not submitted a prompt, uploaded a file or downloaded a generated Gemini image.
- `OWNER_PILOT_PENDING`: live generation, output DOM attribution, locale/account/model variants and subjective output quality.

The 90% package is intentionally fail-closed. It does not claim that deterministic tests prove live generation.

## Install unpacked

1. Use Chrome 116 or later and open `chrome://extensions`.
2. Enable Developer mode.
3. Choose Load unpacked.
4. Select `workers/duc-auto-gemini/v0.1.0`.
5. Open or reload `https://gemini.google.com/images`.
6. Click the Duc Auto Gemini toolbar action to open the Side Panel.
7. Use **Check Plan**, select a queue row, then use **Run Selected** for the owner pilot. **Run Pending** runs every currently runnable row sequentially.

## Workbook contract

The `.xlsx` workbook must contain a `jobs` worksheet with `id` and `prompt` headers. Optional `reference_images` uses `|` separators and preserves token order. Optional `config` keys are:

| Key | Range/default |
| --- | --- |
| `timeout_sec` | 15–900; default 240 |
| `max_retries` | 0–5; default 1; pre-submit only |
| `max_input_images` | 0–10; default 5; owner pilot must confirm the live account limit |
| `continue_on_error` | true/false; default true |
| `delay_min_sec`, `delay_max_sec` | 0–120; defaults 8 and 15 |
| `output_folder` | default `Duc Auto Gemini` |

The source workbook is never overwritten. A completed/stopped run downloads a new `__results__v01.xlsx`; every critical transition updates `dag.active_checkpoint.v1` and a durable attempt record.

## Runtime invariants

- One submit-critical job at a time.
- Every attempt is bound to one exact `/images` tab; later wait/advance/abort messages cannot switch tabs or attempt identity.
- `PRE_SUBMIT → SUBMITTED` is irreversible.
- `SUBMITTED` is persisted before the Send click. Reopening the panel converts any unresolved submitted/output stage to non-runnable `OWNER_REVIEW`.
- A timeout or ambiguity after `SUBMITTED` becomes `OWNER_REVIEW` or `INTERRUPTED`; it is never automatically requeued.
- Output must be fresh relative to the immutable pre-submit image boundary, inside a model-response container, visible and usable.
- Template-gallery, input/reference, stale and multiple ambiguous images are rejected.
- CAPTCHA, unusual activity, security, quota and policy signals fail closed.
- Upload exposure guards run before both trigger/menu clicks; only the specific file-input timeout may advance to the menu branch, while blockers, operator aborts and unknown errors propagate immediately.
- `OWNER_REVIEW`, `INTERRUPTED`, security/quota/policy, and attempt/tab identity failures hard-stop the active batch even when `continue_on_error=true`; that setting applies only to ordinary exhausted pre-submit failures.
- References must resolve uniquely and show ready previews before send.
- Audit stores a prompt hash, not prompt text.

## Architecture

```text
Side Panel
  ├─ xlsx-codec.js       source/result workbook boundary
  ├─ run-core.js         queue, references, checkpoints, audit
  ├─ batch-core.js       whole-queue hard-stop policy
  └─ runtime-core.js     identity validation and restart recovery
          │
          ▼
background.js            exact-tab binding, durable attempts, downloads
  └─ binding-core.js     run/job/attempt ↔ tab/window invariant
          │
          ▼
content.js               live DOM adapter
  ├─ provider-core.js    selectors, blockers, response-bound attribution
  └─ content-decision-core.js  testable upload/send/wait decisions
```

## Permission rationale

| Permission | Use |
| --- | --- |
| `storage` | Local checkpoint/audit and session terminal attempt retention |
| `sidePanel` | Operator UI beside Gemini |
| `downloads` | Save generated image and record Chrome's actual collision-resolved filename |
| `https://gemini.google.com/*` | Inject the Gemini content adapter only on the provider origin |

There is no `<all_urls>`, externally-connectable origin, remote code, backend, API key, account automation or store publication.

## Tests

```powershell
node workers/duc-auto-gemini/v0.1.0/tests/run-all.mjs
npm test
git diff --check
```

## Recovery and rollback

- Side Panel close/reopen: reload the same source workbook, run **Check Plan**, and compare the visible queue with `dag.active_checkpoint.v1`. Any durable unresolved `SUBMITTED`/output stage becomes `OWNER_REVIEW` and remains non-runnable.
- Lost receiver or DOM drift: reload the exact Gemini tab once; if readiness remains unknown, stop and update the adapter/fixture rather than clicking generically.
- Disable/rollback: turn off or remove only **Duc Auto Gemini** at `chrome://extensions`. It is independent from Duc Auto ChatGPT.

See `Duc-Auto-Gemini.PILOT-RUNBOOK.md` for the remaining owner trial.
