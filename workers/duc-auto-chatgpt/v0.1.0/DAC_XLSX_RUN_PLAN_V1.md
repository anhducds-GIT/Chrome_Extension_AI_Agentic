# DAC_XLSX_RUN_PLAN_V1

`jobs` is required. Its required columns are `id` and `prompt`; optional `reference_images` holds `|`-separated aliases or filenames. Job IDs must be unique filename-safe tokens (`A-Z`, `a-z`, `0-9`, `.`, `_`, `-`) and must not contain path traversal.

`config` is optional and must have `key` / `value` columns. Supported declarative keys are:

| Group | Keys |
| --- | --- |
| Run | `timeout_sec`, `max_retries`, `delay_min_sec`, `delay_max_sec`, `safety_cooldown_sec`, `max_input_images`, `continue_on_error`, `rerun_done` |
| Output | `output_destination_mode` (`downloads` or `profile`), `output_downloads_subfolder`, `output_profile_id`, `output_folder_hint`, `image_filename_pattern`, `collision_policy`, `save_images`, `save_result_xlsx`, `save_audit_jsonl` |
| Advanced output | `separate_result_destination`, `result_destination_mode`, `result_downloads_subfolder`, `result_output_profile_id`, `result_filename`, `audit_filename`, `run_id` (runner-persisted) |

`output_downloads_subfolder` is a safe relative path below Chrome Downloads. `output_profile_id` is only a lowercase logical slug (for example `pilot-04`): it never grants filesystem access or encodes an absolute path. A profile is usable only after the user binds a Directory Handle locally and Chrome grants read/write permission.

`output_folder_hint` is optional operator guidance such as `C:\Users\MAYTEST_12\Downloads\Duc Auto ChatGPT\Pilot04`. It is displayed only for profile destination mode and can be copied. It never grants permission, is never treated as an authorized directory, never stores a `FileSystemDirectoryHandle`, and cannot make Check Plan ready. When the profile is unbound, copy the hint, choose that folder through Chrome's picker, then Check Plan again.

Allowed image-pattern tokens are `{job_id}`, `{attempt}`, and `{index}`. Result XLSX names are normalized to `.xlsx`; audit names are safe leaf filenames. Booleans are `true` or `false`. Unknown config keys create warnings; invalid supported values block Check Plan. XLSX cannot control browser permission, handles, active tab, readiness, security, timers, detected output, persistence proof, or exact-once state.

## Continue Existing Run

The Result XLSX is the recovery ledger. `run_id` is generated once as a human-readable token (for example `20260821-0307-pilot04`) and persisted into its config snapshot. Reopening the same ledger keeps it unchanged. Older ledgers without `run_id` use a deterministic `legacy-*` identity and are labelled as legacy provenance.

Canonical names are `<workbook-base>.xlsx`, `<workbook-base>__results.xlsx`, `<workbook-base>__audit.jsonl`, and the effective `{job_id}` image pattern with its real extension. Existing recorded names always win during recovery; historical files are never renamed.

Recovery classification is fail-closed: `SAFE_COMPLETE` requires verified persistence plus valid artifact attribution and is always skipped; `SAFE_PENDING` has no submitted boundary; `SAFE_FAILED_PRE_SUBMIT` follows normal failed-job rules only when a pre-submit failure is proven. Any submitted, interrupted, unknown, or unverified outcome is `AMBIGUOUS_SUBMITTED` and blocks automatic continuation with `RESUME_AMBIGUOUS_SUBMISSION`.

For profile runs the selected directory is checked only for the selected Result XLSX and matching run identity. A mismatch blocks with `RESUME_OUTPUT_MISMATCH`; malformed/duplicate ledgers use `RESUME_LEDGER_INVALID`. Chrome Downloads cannot read a historic audit log for safe append, so a continuation that saves audit JSONL requires its authorized run folder (`RESUME_AUDIT_APPEND_UNAVAILABLE`). No path string is used for automatic filesystem access.
