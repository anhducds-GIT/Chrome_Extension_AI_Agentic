# Duc Auto ChatGPT V0.3

Personal Chrome extension for **local-only XLSX-driven image generation** on ChatGPT.

## V1 XLSX run-plan protocol

New orchestrator workbooks should follow [DAC_XLSX_RUN_PLAN_V1.md](DAC_XLSX_RUN_PLAN_V1.md). XLSX declaratively imports routine run/output configuration; browser handles, permissions, ChatGPT readiness, security checks, output detection, persistence proof, and exact-once runtime state remain local browser authority. `pilot-04/Duc-Auto-ChatGPT-Pilot-04.xlsx` is the controlled import fixture; do not run it live without the owner trial sequence.

## V0 scope

- Side Panel UI.
- Open one local `.xlsx` workbook, validate it, then run its jobs strictly in order.
- Optional local reference images, resolved by filename from the selected image files.
- Detect the generated image in the new assistant message and download it automatically.
- Update the loaded workbook's `jobs` worksheet with status/result data and download that updated XLSX.
- Configurable delay and timeout using optional workbook `config` values.
- Visible, editable current-run output settings for generated images and the result XLSX.
- Explicit Chrome Downloads destinations or a user-authorized local folder; no hidden Downloads fallback when a selected folder loses permission.
- Stage-aware duplicate-submission protection, observable post-output ChatGPT readiness, bounded recovery controls, and XLSX-backed execution provenance.
- No separate login, no backend/server, no extension-side quota, no paid API.

## Explicitly out of scope

- Bypassing ChatGPT limits, paywalls, account restrictions, or third-party extension licensing.
- Copying proprietary source code from another extension.
- Non-XLSX queue formats (TXT/CSV).
- Multi-tab concurrency.
- Cloud synchronization.
- Automatic recovery across a closed side panel while a response is in-flight.

## Install (Load unpacked)

1. Extract this folder somewhere permanent on your Windows PC.
2. Open `chrome://extensions`.
3. Turn on **Developer mode**.
4. Click **Load unpacked**.
5. Select the extracted `duc-auto-chatgpt-v0` folder.
6. Open or reload `https://chatgpt.com/` once after installation.
7. Click the extension icon; the side panel should open.
8. Select a workbook and optional reference images, then press **Validate** before **Run**.

## Workbook contract

The workbook must have a worksheet named `jobs` with these header columns:

| Column | Required | Meaning |
| --- | --- | --- |
| `id` | Yes | Unique stable job identifier. |
| `prompt` | Yes | Image-generation prompt. |
| `reference_images` | No | One or more references separated by `|`; tokens may be basenames or exact filenames. |
| `reference_image` | No | Legacy single-reference compatibility column. |
| `status`, `result_file`, `result_download_id`, `output_saved_at`, `attempt_phase`, `failure_type`, `last_error`, `error`, `completed_at` | No | Ledger fields written or updated by the runner. |
| `effective_image_output`, `effective_result_xlsx`, `effective_image_naming` | No | Current-run destination/config snapshot written to the ledger. |

An optional `config` worksheet may contain `key` / `value` rows. Supported keys: `timeout_sec` (15–900, default 180), legacy `delay_sec`, `delay_min_sec`, `delay_max_sec` (1–120), `continue_on_error` (default true), `output_folder` (default `Duc Auto ChatGPT`), `max_input_images` (default 5), and `rerun_done` (default false).

V0.3 also accepts `max_retries` (0–5, default 2) and `safety_cooldown_sec` (0–120, default 0). `max_input_images` now defaults to **5** (hard maximum 10). Optional per-job `timeout_sec`, `max_retries`, `safety_cooldown_sec`, and `output_folder` override the effective current-run setting for that job.

## Operational controls

- **Continue Existing Run** opens a prior Result XLSX as the recovery ledger. The panel classifies each row as `SAFE_COMPLETE`, `SAFE_PENDING`, `SAFE_FAILED_PRE_SUBMIT`, or `AMBIGUOUS_SUBMITTED`. Completed verified outputs stay skipped forever; any submitted/unverified outcome blocks the Continue button and requires manual review. The normal ChatGPT readiness gate still runs before every eligible new submission.
- **Manual recovery for `AMBIGUOUS_SUBMITTED`:** automatic continuation and resubmission remain blocked. The operator may choose **Resolve Existing Output** only when a recorded submitted boundary exists; it inspects the current conversation without sending a prompt and matches the persisted original `run_id`, `job_id`, `attempt_id`, submission time, immutable image boundary, and recorded selected attribution against one unique visible, loaded, non-input image. Or the operator may choose **Recreate Image** and explicitly accept the duplicate-risk confirmation. Approval first appends the prior forensic evidence, saves the next immutable Result checkpoint, and only then starts one deliberate new attempt with a new attempt ID. A failed or ambiguous post-submit recreate exposes both recovery actions again; a pre-submit recreate failure exposes only Recreate Image. Each additional recreate requires a new confirmation and appends its evidence. Only verified attribution, verified image persistence, and a verified next immutable Result checkpoint make the job `SAFE_COMPLETE`; otherwise it remains `AMBIGUOUS_SUBMITTED`. There is no automatic retry, resend, ignore-blocker, or force-complete path. `DAC_WAIT_CHAT_READY` remains the authority before any later safe-pending job is submitted.
- **XLSX CONTRACT V1 UNCHANGED.** Manual recovery uses runner-owned additive `recreate_*` ledger fields and existing runner-persisted attempt/detector evidence; it adds no source XLSX schema or config keys.
- Result ledgers carry a stable human-readable `run_id`; old ledgers without one load with deterministic legacy provenance. Every verified Result XLSX checkpoint is immutable and versioned as `<base>__results__vNNN.xlsx`; resuming `v003` preserves the run ID and writes `v004`. A recreate example is `v001` (ambiguous attempt) → `v002` (operator approval and preserved history) → `v003` (successful recreate). Profile resume scans strict matching names, validates the highest numeric checkpoint (never mtime), and blocks rather than falling back when that newest checkpoint is corrupt (`RESUME_LATEST_CHECKPOINT_INVALID`) or belongs to another run (`RESUME_RUN_ID_MISMATCH`). An existing exact next name blocks with `CHECKPOINT_VERSION_CONFLICT`; checkpoints are never uniquified or overwritten. Chrome Downloads cannot safely append an existing audit JSONL, so audit-enabled continuation requires the authorized run folder.
- `output_folder_hint` is optional XLSX guidance only. It can be copied in the profile UI, but cannot authorize a directory or satisfy Check Plan by itself.

- **Check Plan** validates workbook, aliases/references, effective settings, output destinations, permission, retry budget, and result filename without submitting a ChatGPT prompt. Run validates again authoritatively.
- The Side Panel exposes current-run overrides for timeout, retries, cooldown, error continuation, maximum references, and rerun-DONE behavior. They are recorded in result provenance; source XLSX is never overwritten.
- References have a compact gallery with editable aliases and remove controls. Tokens resolve alias first, then exact filename, then extensionless basename; aliases are case-insensitive and duplicates fail validation.
- Every attempt is phase-aware and identity-bound: each Side Panel submission carries its own `job_id` + `attempt_id` through `PRE_SUBMIT`, `SUBMITTED`, `OUTPUT_DETECTED`, `OUTPUT_SAVED`, `CHAT_READY`, and `SUCCESS`. Automatic retry is allowed only for a confirmed pre-submit failure. A post-submit timeout or ambiguity enters bounded reconciliation against the original conversation boundary; a remaining uncertain result becomes `INTERRUPTED` and halts the queue without another prompt submission. A stale/mismatched identity fails closed and cannot reconcile or submit another job.
- A saved image is checkpointed immediately in the result workbook (`result_file`, `result_download_id`, `output_saved_at`, and `attempt_phase=OUTPUT_SAVED`). A later readiness failure preserves that checkpoint and becomes `INTERRUPTED`; it never resubmits the prompt.
- Before each new job the runner requires an idle, reachable ChatGPT composer. If a prior generation is still unresolved, it reconciles/waits or halts safely; it does not start the next job.
- Each run writes one stable `<base>__audit.jsonl` alongside its result location. Events contain attempt phase/status, reference aliases, output filename, target URL when available, and a prompt hash/length rather than duplicating prompt text. A profile-folder continuation reads and appends that existing audit before replacing it only after persistence verification. Image collision policy remains limited to images.
- **Run All**, **Run Pending**, **Run Failed**, and **Retry Selected** are side-panel recovery controls only; there is no durable background queue.

## Output locations

After opening an XLSX, the Side Panel shows an **OUTPUT LOCATION** card and a **RUN PLAN** before Run. `output_folder` remains the default and is displayed as `Downloads/<output_folder>`; it is never hidden inside workbook config.

- **Choose Image Folder** / **Change Folder** use Chrome's directory picker and require explicit read-write authorization. Generated images are written there directly.
- **Use Source Folder** opens that same picker for the user to confirm the directory containing the source workbook. Browser file selection intentionally does not expose a source file's parent path automatically.
- Result XLSX may use the same image location, a separate explicit Chrome Downloads folder, or a separately authorized folder. Its checkpoint pattern is editable for the current run and uses `{version}`; each verified write is an immutable next version.
- Before Validate/Run, the extension checks every selected directory handle for read-write permission. A missing or revoked permission produces `OUTPUT_LOCATION` validation failure; it does not redirect files to Downloads.
- In an authorized custom folder, images use `<job-id>.<actual-extension>` and deterministic `__attempt-01` suffixes on collision; result XLSX files follow the same non-overwrite rule. In Chrome Downloads, Chrome owns collision naming (`conflictAction="uniquify"`), so the ledger records the completed DownloadItem's actual final filename/path rather than predicting a `__attempt-*` suffix.

The effective source workbook, image destination, result-XLSX destination, and naming pattern are written to the result ledger and, when the workbook has a valid `config` sheet, appended there as a config snapshot. For a custom-folder result XLSX collision, the chosen final filename is inserted into that workbook before it is written. For a Chrome Downloads result XLSX, Chrome only exposes its final collision name after the workbook is created, so the UI/log reports the actual DownloadItem filename while the workbook records its requested destination.

Basenames ignore the image extension. If multiple selected files share that basename, validation fails rather than guessing. Multiple references are attached as one bounded batch and each must show a ready attachment preview before prompt send.

## V1 Closure backlog — output controls (not implemented)

This backlog is intentionally isolated from the proven prompt submission, image-detection, attempt-identity, and ChatGPT-readiness sequencing paths.

- Replace random/UUID artifact filenames with a configured, human-readable image filename pattern. The Side Panel must show a non-writing preview for the selected job before Run; result XLSX and audit JSONL names must likewise be deterministic and visible.
- Add an explicit collision policy: `overwrite`, `uniquify`, or `fail`. It must apply before each write and the effective policy/final path must be recorded in provenance.
- Add independent current-run toggles for **Auto download generated images**, **Auto save result XLSX**, and **Auto save audit JSONL**.
- With image auto-download disabled, attributable output detection still completes and the job may reach `SUCCESS`; no image file write is attempted, and the result ledger records `detected_not_downloaded` together with attribution and detection diagnostics.
- A later implementation must use deterministic tests for filename preview/pattern validation, each collision policy, every toggle combination, disabled-image-write success, and unchanged exact-once submission/detection/sequencing regressions.

## Important behavior

- The current active tab must be a normal ChatGPT conversation.
- Stop asks the content script to cancel its wait loop; it intentionally does **not** click ChatGPT's Stop-generation button.
- The runner never overwrites the source workbook. The result XLSX is written to the visible, current-run Result XLSX location with its editable filename.
- Existing `DONE` rows are skipped by default. Set `rerun_done=true` only when deliberate regeneration is desired.
- Ordinary job failures are recorded and continue when `continue_on_error=true`; Stop, receiver loss, or validation failure prevents later submissions.
- ChatGPT is a changing web app. If its DOM changes, `content.js` selectors may need a small adapter update.

## Quick validation

1. Open a normal ChatGPT conversation.
2. Select a workbook with two trivial `jobs` rows; optionally select its referenced images.
3. Press **Validate**; expect a successful idle-composer check.
4. Press **Run**.
5. Verify job #2 is not sent until job #1 produces/downloads an attributable image and the visible countdown completes.
6. Verify the Run Plan names the source XLSX, generated-image destination, result-XLSX destination, and naming pattern.
7. Choose a custom output folder, then revoke/rechoose its permission; Validate must fail rather than use Downloads.
8. In a custom folder, place a file with the first job's expected name; verify `__attempt-01` is used rather than overwriting it. In Chrome Downloads, verify the ledger's `result_file` records Chrome's actual final collision-resolved filename.
9. Test an image-only response, a Retry/error UI with a visible image, references, and Stop during generation; no later job may begin after Stop.

## Architecture

```text
Chrome Side Panel (sidepanel.html/js)
        |
        | chrome.tabs.sendMessage
        v
Content Script on chatgpt.com (content.js)
        |
        +--> locate composer
        +--> insert prompt
        +--> click Send
        +--> observe assistant/generation DOM
        +--> return completion/error
```

## WP2 localhost Worker API

The service worker also accepts external messages only from `http://localhost/*` and `http://127.0.0.1/*`. The private `DAC_*` messages remain between `background.js` and `content.js`.

Public message shapes:

```js
{ operation: "ping" }
{ operation: "job.submit", job_id: "job-001", task_type: "text_prompt", prompt: "...", timeout_ms: 180000 }
{ operation: "job.status", job_id: "job-001" }
{ operation: "job.abort", job_id: "job-001" }
```

Only one job may be active and no queue exists. A repeated `job_id` returns the stored Job Record with `duplicate: true`; it does not resend the prompt. Statuses are `accepted`, `running`, `done`, `failed`, or `aborted`. Job state is in-memory and is lost if Chrome terminates the MV3 worker.

For a completed `text_prompt`, `job.result` is a canonical text result:

```js
{
  type: "text",
  text: "new assistant response",
  char_count: 22,
  assistant_message_index: 3,
  assistant_count_before: 3,
  assistant_count_after: 4,
  completion: { generation_seen: true, reason: "stable_text", poll_count: 9 }
}
```

`job.target` records the selected `tab_id`, `tab_url`, `window_id`, and `conversation_url`; the Job Record also exposes `created_at`, `started_at`, and `completed_at`. The result is accepted only from the first assistant message after the pre-send assistant-count boundary; the extension does not blindly return the latest assistant message.

Terminal Job Records are also retained in `chrome.storage.session` (newest 10 only), so `job.status` remains available after the MV3 service worker sleeps during the same browser/extension session. This retention stores no original prompt and is cleared by browser restart, extension reload, update, or disable. It does not resume jobs or provide durable idempotency. If retaining a terminal record fails, the completed execution remains `done`/`failed`/`aborted` and exposes `retention_error` while its in-memory record remains available.

For a manual localhost test, run `python -m http.server 8123` from this folder, visit `http://localhost:8123/worker-api-test.html`, enter the unpacked extension ID, and use the four API buttons. The test page has no server-side logic.

## License

This implementation is a clean-room personal prototype created from public Chrome extension APIs and observed product behavior. It does not include source code from ChatGPT Automation - Auto ChatGPT.
