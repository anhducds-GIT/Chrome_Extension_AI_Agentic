# Duc Auto Gemini (Platform) V0.2.0

> Extension Chrome MV3 cá nhân, chạy kế hoạch XLSX để **tạo ảnh trên Gemini**
> (`https://gemini.google.com`), ngay trong trình duyệt của Đức, không gửi gì ra máy chủ lạ.
> Bản này là **nhánh nền tảng**: mang thêm Agent Bridge để AI gọi việc qua RPC cục bộ.

> **SỬA 03/09 — file này từng là bản chép nguyên từ gói ChatGPT.** 27 dòng ghi "ChatGPT"
> trong khi gói này chạy trên Gemini, và bảng trạng thái đã hiện chữ sai đó cho Đức đọc.
>
> Phiên `claude-dashboard` sửa **từng chỗ một, mỗi chỗ một bằng chứng**: tên lấy từ
> `manifest.json`, tên miền từ mã nguồn, tên script từ `scripts/`, đường dẫn pairing đọc
> thẳng trong script cài. Chỗ nặng nhất: README ghi thư mục tải về mặc định là
> `Duc Auto ChatGPT` còn mã nguồn ghi `Duc Auto Gemini` — đọc README là đi tìm sai chỗ.
>
> **Những chỗ còn nhắc "ChatGPT" là ĐÚNG, đừng sửa:** gói này thật sự chứa
> `templates/Duc-Auto-ChatGPT-Template.xlsx` và `pilot-04/Duc-Auto-ChatGPT-Pilot-04.xlsx`
> (đồ thừa kế lúc fork, tên file đúng là vậy), cộng câu miễn trừ bản quyền ở cuối file.
> Find-replace mù sẽ làm sai chính những câu đang đúng — đã thử và bắt được.
>
> Việc còn lại: soát phần dưới mục cài đặt từng dòng, và dọn hai script ChatGPT còn nằm
> trong `scripts/`. Ghi ở `BACKLOG.md`. Tin `STATUS.md` trước file này.

Before touching this project, read [AGENTS.md](AGENTS.md) (roles, golden rules, file map) and [HANDOFF.md](HANDOFF.md) (current state, Log).

## V1 XLSX run-plan protocol

New orchestrator workbooks should follow [DAC_XLSX_RUN_PLAN_V1.md](DAC_XLSX_RUN_PLAN_V1.md). XLSX declaratively imports routine run/output configuration; browser handles, permissions, Gemini readiness, security checks, output detection, persistence proof, and exact-once runtime state remain local browser authority. `pilot-04/Duc-Auto-ChatGPT-Pilot-04.xlsx` is the controlled import fixture; do not run it live without the owner trial sequence.

## V0 scope

- Side Panel UI.
- Open one local `.xlsx` workbook, validate it, then run its jobs strictly in order.
- Optional local reference images, resolved by filename from the selected image files.
- Detect the generated image in the new assistant message and download it automatically.
- Update the loaded workbook's `jobs` worksheet with status/result data and download that updated XLSX.
- Configurable delay and timeout using optional workbook `config` values.
- Visible, editable current-run output settings for generated images and the result XLSX.
- Explicit Chrome Downloads destinations or a user-authorized local folder; no hidden Downloads fallback when a selected folder loses permission.
- Stage-aware duplicate-submission protection, observable post-output Gemini readiness, bounded recovery controls, and XLSX-backed execution provenance.
- No separate login, no backend/server, no extension-side quota, no paid API.

## Explicitly out of scope

- Bypassing Gemini limits, paywalls, account restrictions, or third-party extension licensing.
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
5. Select this package folder (the one holding `manifest.json`).
6. Open or reload `https://gemini.google.com/` once after installation.
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

**Start every new pilot from `templates/Duc-Auto-ChatGPT-Template.xlsx`, never from a prior Result XLSX.** A Result checkpoint (`*__results__vNN.xlsx`) accumulates 30+ runtime columns (`status`, `attempt_id`, `detection_diagnostics`, ...) that only the runner writes; opening one and typing new prompts over its old rows is how Pilot-07 ended up looking like it needed all of that filled in. The template has only `id`/`prompt` (highlighted, mandatory) and `reference_images` (highlighted, optional) on the `jobs` sheet, plus an empty `config` sheet — every other column above is optional and is populated by the extension itself.

An optional `config` worksheet may contain `key` / `value` rows. Supported keys: `timeout_sec` (15–900, default 180), legacy `delay_sec`, `delay_min_sec`, `delay_max_sec` (1–120; defaults 12 and 24), `continue_on_error` (default true), `output_folder` (default `Duc Auto Gemini`), `max_input_images` (default 5), and `rerun_done` (default false).

V0.3 also accepts `max_retries` (0–5, default 2) and `safety_cooldown_sec` (0–120). `safety_cooldown_sec` accepts either one fixed integer (`8`) or an inclusive integer range (`6-9`, the default); one value is selected from the range for each readiness gate, then READY is checked again after that cooldown. `max_input_images` now defaults to **5** (hard maximum 10). Optional per-job `timeout_sec`, `max_retries`, `safety_cooldown_sec`, and `output_folder` override the effective current-run setting for that job. Explicit workbook values remain authoritative; the Side Panel exposes local runtime overrides for both inter-job bounds and the safety-cooldown value/range.

## Operational controls

- **Continue Existing Run** opens a prior Result XLSX as the recovery ledger. The panel classifies each row as `SAFE_COMPLETE`, `SAFE_PENDING`, `SAFE_FAILED_PRE_SUBMIT`, or `AMBIGUOUS_SUBMITTED`. Completed verified outputs stay skipped forever; any submitted/unverified outcome blocks the Continue button and requires manual review. The normal Gemini readiness gate still runs before every eligible new submission.
- **Manual recovery for `AMBIGUOUS_SUBMITTED`:** automatic continuation and resubmission remain blocked. The Resume Plan deliberately exposes **exactly one** operator decision for a blocked job — **Recreate Image** — behind an explicit duplicate-risk confirmation. Approval first appends the prior forensic evidence, saves the next immutable Result checkpoint, and only then starts one deliberate new attempt with a new attempt ID. Any failed recreate, pre-submit or post-submit, exposes Recreate Image again and nothing else. Each additional recreate requires a new confirmation and appends its evidence. (`sidepanel.js` still carries an unwired `resolveExistingOutput` read-only attribution path from an earlier two-action design. It has no button and cannot run; the single-action design is asserted by `tests/recreate-core-smoke.mjs`. Do not document or rely on it until it is deliberately wired.) Only verified attribution, verified image persistence, and a verified next immutable Result checkpoint make the job `SAFE_COMPLETE`; otherwise it remains `AMBIGUOUS_SUBMITTED`. There is no automatic retry, resend, ignore-blocker, or force-complete path. `DAC_WAIT_CHAT_READY` remains the authority before any later safe-pending job is submitted.
- **XLSX CONTRACT V1 UNCHANGED.** Manual recovery uses runner-owned additive `recreate_*` and `audit_chain_*` ledger fields plus existing runner-persisted attempt/detector evidence; it adds no source XLSX schema or config keys.
- Result ledgers carry a stable human-readable `run_id`; old ledgers without one load with deterministic legacy provenance. Every verified Result XLSX checkpoint is immutable and versioned as `<base>__results__vNN.xlsx` (two digits; a run reaches a handful of checkpoints, not hundreds). Resuming `v03` preserves the run ID and writes `v04`. A recreate example is `v01` (ambiguous attempt) → `v02` (operator approval and preserved history) → `v03` (successful recreate). Checkpoints written under the earlier three-digit convention still parse and resume; a legacy `v001` simply continues as `v02`. Profile resume scans strict matching names, validates the highest numeric checkpoint (never mtime), and blocks rather than falling back when that newest checkpoint is corrupt (`RESUME_LATEST_CHECKPOINT_INVALID`) or belongs to another run (`RESUME_RUN_ID_MISMATCH`). An existing exact next name blocks with `CHECKPOINT_VERSION_CONFLICT`; checkpoints are never uniquified or overwritten. Chrome Downloads cannot safely append an existing audit JSONL, so audit-enabled continuation requires the authorized run folder.
- **Audit continuity on Resume:** Check Plan verifies that the recorded prior audit JSONL in an authorized result directory is present, readable, and non-empty before Run or Recreate. A missing audit blocks with `RESUME_AUDIT_CHAIN_MISSING`, never exposes a browser `NotFoundError`, and never bypasses automatically. The operator may explicitly choose **Continue with new audit segment**: Result XLSX remains authoritative; the runner records `audit_chain_status=GAP_ACKNOWLEDGED` and the expected missing filename, writes `AUDIT_CHAIN_GAP` as the first event of the configured new segment, checkpoints that provenance, then allows the normal explicit recovery flow. Existing audits keep their normal append behavior; historical audit data is never fabricated.
- `output_folder_hint` is optional XLSX guidance only. It can be copied in the profile UI, but cannot authorize a directory or satisfy Check Plan by itself.

- **Check Plan** validates workbook, aliases/references, effective settings, output destinations, permission, retry budget, and result filename without submitting a Gemini prompt. Run validates again authoritatively.
- The Side Panel exposes current-run overrides for timeout, retries, cooldown, error continuation, maximum references, and rerun-DONE behavior. They are recorded in result provenance; source XLSX is never overwritten.
- References have a compact gallery with editable aliases and remove controls. Tokens resolve alias first, then exact filename, then extensionless basename; aliases are case-insensitive and duplicates fail validation.
- Every attempt is phase-aware and identity-bound: each Side Panel submission carries its own `job_id` + `attempt_id` through `PRE_SUBMIT`, `SUBMITTED`, `OUTPUT_DETECTED`, `OUTPUT_SAVED`, `CHAT_READY`, and `SUCCESS`. Automatic retry is allowed only for a confirmed pre-submit failure. A post-submit timeout or ambiguity enters bounded reconciliation against the original conversation boundary; a remaining uncertain result becomes `INTERRUPTED` and halts the queue without another prompt submission. A stale/mismatched identity fails closed and cannot reconcile or submit another job.
- A saved image is checkpointed immediately in the result workbook (`result_file`, `result_download_id`, `output_saved_at`, and `attempt_phase=OUTPUT_SAVED`). A later readiness failure preserves that checkpoint and becomes `INTERRUPTED`; it never resubmits the prompt.
- Before each new job the runner requires an idle, reachable Gemini composer. If a prior generation is still unresolved, it reconciles/waits or halts safely; it does not start the next job.
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

This backlog is intentionally isolated from the proven prompt submission, image-detection, attempt-identity, and Gemini-readiness sequencing paths.

- Replace random/UUID artifact filenames with a configured, human-readable image filename pattern. The Side Panel must show a non-writing preview for the selected job before Run; result XLSX and audit JSONL names must likewise be deterministic and visible.
- Add an explicit collision policy: `overwrite`, `uniquify`, or `fail`. It must apply before each write and the effective policy/final path must be recorded in provenance.
- Add independent current-run toggles for **Auto download generated images**, **Auto save result XLSX**, and **Auto save audit JSONL**.
- With image auto-download disabled, attributable output detection still completes and the job may reach `SUCCESS`; no image file write is attempted, and the result ledger records `detected_not_downloaded` together with attribution and detection diagnostics.
- A later implementation must use deterministic tests for filename preview/pattern validation, each collision policy, every toggle combination, disabled-image-write success, and unchanged exact-once submission/detection/sequencing regressions.

## Important behavior

- The current active tab must be a normal Gemini conversation.
- Stop asks the content script to cancel its wait loop; it intentionally does **not** click Gemini's Stop-generation button.
- The runner never overwrites the source workbook. The result XLSX is written to the visible, current-run Result XLSX location with its editable filename.
- Existing `DONE` rows are skipped by default. Set `rerun_done=true` only when deliberate regeneration is desired.
- Ordinary job failures are recorded and continue when `continue_on_error=true`; Stop, receiver loss, or validation failure prevents later submissions.
- Gemini is a changing web app. If its DOM changes, `content.js` selectors may need a small adapter update.

## Running the tests

From the repository root:

```bash
npm test
```

Every test is a dependency-free Node script. `npm test` runs all worker tests plus the root observer smoke test and prints one pass/fail summary. `npm run test:worker` runs only this worker. There is nothing to install, and the suite uses no shell builtins, so it behaves identically in PowerShell and Git Bash.

## Quick validation

1. Open a normal Gemini conversation.
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
Content Script on gemini.google.com (content.js)
        |
        +--> locate composer
        +--> insert prompt
        +--> click Send
        +--> observe assistant/generation DOM
        +--> return completion/error
```

## Agent Bridge V1

Agent Bridge V1 thay thế hoàn toàn Worker API localhost cũ. Một Node host không phụ thuộc npm chỉ lắng nghe tại `127.0.0.1`, từ chối browser `Origin`, và yêu cầu token 32-byte trong pairing file có ACL dành cho Windows user hiện tại. Extension không còn `externally_connectable` hay `onMessageExternal`; đường riêng `DAC_DOWNLOAD_IMAGE` vẫn được giữ cho sản phẩm.

### Cài host và pair extension

Từ thư mục này, chạy PowerShell bằng user hiện tại (không cần Admin, không ghi Registry):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\Install-DucAutoGeminiBridgeV1.ps1
```

Sau khi cài, vào `chrome://extensions`, reload **Duc Auto Gemini (Platform)**, mở side panel, bấm **Kết nối Agent Bridge**, rồi chọn file được script in ra:

```text
C:\WORKING ZONE\Chrome Extension Bridge\duc-auto-gemini\duc-auto-gemini-bridge-pairing-v1.json
```

Pairing chỉ làm một lần cho token hiện tại. Token không được đưa vào XLSX, audit JSONL, URL, console hay bridge response.

### Trạng thái khi side panel đóng

Host và MV3 router có thể vẫn online, nên `ping`/`capabilities` ở lớp router còn trả lời. Nhưng side panel là executor duy nhất: khi panel đóng, `queue-list`, `run-status`, `ledger-read`, `proposal-get` và `propose` dừng fail-closed với `EXECUTOR_UNAVAILABLE`. Bridge không tự chạy nền và không biến lỗi transport thành lỗi của một job. Nếu đang Run mà đóng panel, áp dụng cùng quy tắc an toàn hiện có của app; mở lại panel, kiểm tra workbook/checkpoint rồi mới tiếp tục.

### CLI

Installer chép CLI tới cùng thư mục host. Ví dụ:

```powershell
$bridgeRoot = 'C:\WORKING ZONE\Chrome Extension Bridge\duc-auto-gemini'
node (Join-Path $bridgeRoot 'bridge-cli.mjs') ping
node (Join-Path $bridgeRoot 'bridge-cli.mjs') capabilities
node (Join-Path $bridgeRoot 'bridge-cli.mjs') queue-list --limit 25
node (Join-Path $bridgeRoot 'bridge-cli.mjs') ledger-read --limit 25 --include-removed
node (Join-Path $bridgeRoot 'bridge-cli.mjs') proposal-get --proposal-id proposal-id-from-response
node (Join-Path $bridgeRoot 'bridge-cli.mjs') propose --params-file .\proposal-params.json
```

`proposal-params.json` chứa đúng object `params` của `queue.propose`: `if_ledger_etag`, nhãn tùy chọn, và 1–100 job. Dùng `--include-prompt` chỉ khi thật sự cần vì mặc định các lệnh đọc trả fingerprint thay cho prompt đầy đủ.

`propose` chỉ đưa đề xuất vào vùng cách ly. Đức phải xem đúng prompt/tham chiếu trong thẻ **ĐỀ XUẤT TỪ AGENT** và bấm **Duyệt & ghi checkpoint**. Duyệt chỉ thêm vào Queue và ghi checkpoint; **không bắt đầu Run, không gửi prompt tới Gemini**. V1 cố ý không có `run.start`, `run.pause`, hay `run.resume`.

### Xoay token, gỡ và cài lại

Xoay token khi nghi ngờ pairing bị lộ; host cũ bị dừng và token cũ mất hiệu lực ngay:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\Install-DucAutoGeminiBridgeV1.ps1 -RotateToken
```

Sau đó reload extension và pair lại bằng file mới. Cài lại không có `-RotateToken` sẽ giữ token hợp lệ hiện có. Gỡ mặc định xóa cả pairing; thêm `-KeepPairing` nếu cần giữ pairing an toàn để cài lại:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\Uninstall-DucAutoGeminiBridgeV1.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\Uninstall-DucAutoGeminiBridgeV1.ps1 -KeepPairing
```

## License

This implementation is a clean-room personal prototype created from public Chrome extension APIs and observed product behavior. It does not include source code from ChatGPT Automation - Auto ChatGPT.
