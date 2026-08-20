# DAC_XLSX_RUN_PLAN_V1

`jobs` is required. Its required columns are `id` and `prompt`; optional `reference_images` holds `|`-separated aliases or filenames. Job IDs must be unique filename-safe tokens (`A-Z`, `a-z`, `0-9`, `.`, `_`, `-`) and must not contain path traversal.

`config` is optional and must have `key` / `value` columns. Supported declarative keys are:

| Group | Keys |
| --- | --- |
| Run | `timeout_sec`, `max_retries`, `delay_min_sec`, `delay_max_sec`, `safety_cooldown_sec`, `max_input_images`, `continue_on_error`, `rerun_done` |
| Output | `output_destination_mode` (`downloads` or `profile`), `output_downloads_subfolder`, `output_profile_id`, `image_filename_pattern`, `collision_policy`, `save_images`, `save_result_xlsx`, `save_audit_jsonl` |
| Advanced output | `separate_result_destination`, `result_destination_mode`, `result_downloads_subfolder`, `result_output_profile_id`, `result_filename`, `audit_filename` |

`output_downloads_subfolder` is a safe relative path below Chrome Downloads. `output_profile_id` is only a lowercase logical slug (for example `pilot-04`): it never grants filesystem access or encodes an absolute path. A profile is usable only after the user binds a Directory Handle locally and Chrome grants read/write permission.

Allowed image-pattern tokens are `{job_id}`, `{attempt}`, and `{index}`. Result XLSX names are normalized to `.xlsx`; audit names are safe leaf filenames. Booleans are `true` or `false`. Unknown config keys create warnings; invalid supported values block Check Plan. XLSX cannot control browser permission, handles, active tab, readiness, security, timers, detected output, persistence proof, or exact-once state.
