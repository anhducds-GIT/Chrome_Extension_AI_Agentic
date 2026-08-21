# DAC_XLSX_RUN_PLAN_V1

`jobs` is required. Its required columns are `id` and `prompt`; optional `reference_images` holds `|`-separated aliases or filenames. Job IDs must be unique filename-safe tokens (`A-Z`, `a-z`, `0-9`, `.`, `_`, `-`) and must not contain path traversal.

`config` is optional and must have `key` / `value` columns. Supported declarative keys are:

| Group | Keys |
| --- | --- |
| Run | `timeout_sec`, `max_retries`, `delay_min_sec`, `delay_max_sec`, `safety_cooldown_sec`, `max_input_images`, `continue_on_error`, `rerun_done` |
| Output | `output_destination_mode` (`downloads` or `profile`), `output_downloads_subfolder`, `output_profile_id`, `output_folder_hint`, `image_filename_pattern`, `collision_policy`, `save_images`, `save_result_xlsx`, `save_audit_jsonl` |
| Advanced output | `separate_result_destination`, `result_destination_mode`, `result_downloads_subfolder`, `result_output_profile_id`, `result_filename_pattern`, legacy `result_filename`, `audit_filename`, `run_id` (runner-persisted) |
| Checkpoint metadata | `checkpoint_version`, `checkpoint_filename`, `checkpoint_created_at`, `previous_checkpoint_filename` (runner-persisted; do not prefill) |

`output_downloads_subfolder` is a safe relative path below Chrome Downloads. `output_profile_id` is only a lowercase logical slug (for example `pilot-04`): it never grants filesystem access or encodes an absolute path. A profile is usable only after the user binds a Directory Handle locally and Chrome grants read/write permission.

`output_folder_hint` is optional operator guidance such as `C:\Users\MAYTEST_12\Downloads\Duc Auto ChatGPT\Pilot04`. It is displayed only for profile destination mode and can be copied. It never grants permission, is never treated as an authorized directory, never stores a `FileSystemDirectoryHandle`, and cannot make Check Plan ready. When the profile is unbound, copy the hint, choose that folder through Chrome's picker, then Check Plan again.

Allowed image-pattern tokens are `{job_id}`, `{attempt}`, and `{index}`. `result_filename_pattern` accepts the Result-only `{version}` token; new run plans should use `<base>__results__v{version}.xlsx`. Result names are normalized to `.xlsx`; audit names are safe leaf filenames. Booleans are `true` or `false`. Unknown config keys create warnings; invalid supported values block Check Plan. XLSX cannot control browser permission, handles, active tab, readiness, security, timers, detected output, persistence proof, or exact-once state.

## Continue Existing Run

The Result XLSX is the recovery ledger. `run_id` is generated once as a human-readable token (for example `20260821-0307-pilot04`) and persisted into its config snapshot. Reopening the same ledger keeps it unchanged. Older ledgers without `run_id` use a deterministic `legacy-*` identity and are labelled as legacy provenance.

Canonical names are `<workbook-base>.xlsx`, `<workbook-base>__results__vNNN.xlsx`, `<workbook-base>__audit.jsonl`, and the effective `{job_id}` image pattern with its real extension. Every durable Result XLSX write creates the exact next immutable version (`v001`, `v002`, ...); it never overwrites or uniquifies a checkpoint. The persisted checkpoint carries `run_id`, numeric version, filename, creation time, and (when present) its previous checkpoint filename. A failed write/verification leaves the authoritative version unchanged. `audit_filename` remains one stable JSONL filename; image collision policy applies only to generated images. Legacy non-versioned `__results.xlsx` ledgers remain openable for Pilot-03/04 recovery, but their next checkpoint uses the versioned protocol.

Recovery classification is fail-closed: `SAFE_COMPLETE` requires verified persistence plus valid artifact attribution and is always skipped; `SAFE_PENDING` has no submitted boundary; `SAFE_FAILED_PRE_SUBMIT` follows normal failed-job rules only when a pre-submit failure is proven. Any submitted, interrupted, unknown, or unverified outcome is `AMBIGUOUS_SUBMITTED` and blocks automatic continuation with `RESUME_AMBIGUOUS_SUBMISSION`.

`AMBIGUOUS_SUBMITTED` has two explicit fail-closed operator routes: **Resolve Existing Output** or **Recreate Image**. Resolve Existing Output is read-only conversation inspection and must match persisted original `run_id`, `job_id`, `attempt_id`, `submitted_at`, immutable pre-submit image boundary, and recorded selected attribution. The current candidate must be uniquely attributable, absent from the original boundary, visible, fully loaded, and not an input/reference image. Recreate Image requires a fresh duplicate-risk confirmation for the exact blocked job. The runner appends the prior/recreate forensic history, checkpoints that approval, then starts one deliberate new attempt with a new attempt ID. A failed or ambiguous post-submit recreate remains blocked, preserves all evidence, and exposes both explicit recovery actions again; it never silently resubmits. Only after attribution or recreate image persistence verification and the next immutable Result XLSX checkpoint all succeed does the job become `SAFE_COMPLETE`; otherwise it remains `AMBIGUOUS_SUBMITTED`. `DAC_WAIT_CHAT_READY` remains the authority before any later `SAFE_PENDING` job can submit.

**XLSX CONTRACT V1 UNCHANGED.** This recovery flow uses existing attempt/detector fields plus runner-owned additive `recreate_*` ledger fields; it introduces no source XLSX schema or config keys.

For example, an ambiguous run can produce `v001`, then an explicit recreate approval produces `v002`, and a successful recreate produces `v003`. Failed approval persistence never advances the checkpoint, and every later recreate needs a new explicit confirmation.

For profile runs the authorized result directory is scanned only for strict matching checkpoint filenames; numeric version, not modification time, orders them. The highest discovered version is opened and must have a valid ledger/schema, `run_id`, and checkpoint metadata. A corrupt highest candidate blocks with `RESUME_LATEST_CHECKPOINT_INVALID`—the runner never silently falls back. A different `run_id` blocks with `RESUME_RUN_ID_MISMATCH`. If the exact next version already exists, persistence blocks with `CHECKPOINT_VERSION_CONFLICT`. Chrome Downloads cannot read a historic audit log for safe append, so a continuation that saves audit JSONL requires its authorized run folder (`RESUME_AUDIT_APPEND_UNAVAILABLE`). No path string is used for automatic filesystem access.
