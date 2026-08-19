# Duc Auto ChatGPT V0.3

Personal Chrome extension for **local-only XLSX-driven image generation** on ChatGPT.

## V0 scope

- Side Panel UI.
- Open one local `.xlsx` workbook, validate it, then run its jobs strictly in order.
- Optional local reference images, resolved by filename from the selected image files.
- Detect the generated image in the new assistant message and download it automatically.
- Update the loaded workbook's `jobs` worksheet with status/result data and download that updated XLSX.
- Configurable delay and timeout using optional workbook `config` values.
- Visible, editable current-run output settings for generated images and the result XLSX.
- Explicit Chrome Downloads destinations or a user-authorized local folder; no hidden Downloads fallback when a selected folder loses permission.
- Observable post-output ChatGPT readiness, bounded retry/recovery controls, and XLSX-backed execution provenance.
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
| `status`, `result_file`, `result_download_id`, `error`, `completed_at` | No | Ledger fields written or updated by the runner. |
| `effective_image_output`, `effective_result_xlsx`, `effective_image_naming` | No | Current-run destination/config snapshot written to the ledger. |

An optional `config` worksheet may contain `key` / `value` rows. Supported keys: `timeout_sec` (15–900, default 180), legacy `delay_sec`, `delay_min_sec`, `delay_max_sec` (1–120), `continue_on_error` (default true), `output_folder` (default `Duc Auto ChatGPT`), `max_input_images` (default 5), and `rerun_done` (default false).

V0.3 also accepts `max_retries` (0–5, default 2) and `safety_cooldown_sec` (0–120, default 0). `max_input_images` now defaults to **5** (hard maximum 10). Optional per-job `timeout_sec`, `max_retries`, `safety_cooldown_sec`, and `output_folder` override the effective current-run setting for that job.

## Operational controls

- **Check Plan** validates workbook, aliases/references, effective settings, output destinations, permission, retry budget, and result filename without submitting a ChatGPT prompt. Run validates again authoritatively.
- The Side Panel exposes current-run overrides for timeout, retries, cooldown, error continuation, maximum references, and rerun-DONE behavior. They are recorded in result provenance; source XLSX is never overwritten.
- References have a compact gallery with editable aliases and remove controls. Tokens resolve alias first, then exact filename, then extensionless basename; aliases are case-insensitive and duplicates fail validation.
- After a verified image save, the runner waits for observable ChatGPT readiness (not generating, usable composer/send, no blocker) before another job. `delay_*` stays parse-compatible but is not the completion signal.
- Ordinary `TIMEOUT`, `NO_OUTPUT`, `DOWNLOAD_FAILED`, and generic failures retry up to `max_retries`; security/interstitial, receiver integrity, validation, attachment, ambiguity, and user Stop never retry automatically. Ledger fields retain `attempt_count`, `retry_count`, `failure_type`, and `last_error`.
- **Run All**, **Run Pending**, **Run Failed**, and **Retry Selected** are side-panel recovery controls only; there is no durable background queue.

## Output locations

After opening an XLSX, the Side Panel shows an **OUTPUT LOCATION** card and a **RUN PLAN** before Run. `output_folder` remains the default and is displayed as `Downloads/<output_folder>`; it is never hidden inside workbook config.

- **Choose Image Folder** / **Change Folder** use Chrome's directory picker and require explicit read-write authorization. Generated images are written there directly.
- **Use Source Folder** opens that same picker for the user to confirm the directory containing the source workbook. Browser file selection intentionally does not expose a source file's parent path automatically.
- Result XLSX may use the same image location, a separate explicit Chrome Downloads folder, or a separately authorized folder. Its filename is editable for the current run.
- Before Validate/Run, the extension checks every selected directory handle for read-write permission. A missing or revoked permission produces `OUTPUT_LOCATION` validation failure; it does not redirect files to Downloads.
- Images use `<job-id>.<actual-extension>`. If that name exists, the runner writes `<job-id>__attempt-01.<ext>` (then higher deterministic attempts) instead of overwriting. Result XLSX files likewise use a unique attempt suffix when written to an authorized folder.

The effective source workbook, image destination, result-XLSX destination, and naming pattern are written to the result ledger and, when the workbook has a valid `config` sheet, appended there as a config snapshot.

Basenames ignore the image extension. If multiple selected files share that basename, validation fails rather than guessing. Multiple references are attached as one bounded batch and each must show a ready attachment preview before prompt send.

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
8. Place a file with the first job's expected name in the image folder; verify the generated image uses `__attempt-01` rather than overwriting it.
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
