# XLSX TEMPLATE GOVERNANCE — Duc Auto ChatGPT

Status: SSOT instruction for GPT-maintained source workbooks.
Canonical template: `Duc-Auto-ChatGPT-Template-V1.xlsx`
Protocol: `DAC_XLSX_RUN_PLAN_V1`

## Ownership
- GPT OWNS source XLSX templates, Pilot workbooks, Google Drive XLSX SSOT, naming/config reasoning, and workbook QA.
- Codex OWNS code/runtime/parser/validator/tests and technical code documentation.
- Runtime Result XLSX/checkpoints are generated artifacts; they are NEVER source templates.

## Mandatory rules
1. AI MUST NOT create a Duc Auto ChatGPT workbook from memory.
2. Every new Pilot/source workbook MUST begin from the canonical template.
3. GPT may edit only operator-owned source fields and job rows.
4. `run_id`, `checkpoint_version`, `checkpoint_filename`, `checkpoint_created_at`,
   `previous_checkpoint_filename`, persistence evidence, submission state, and other runtime state
   MUST NOT be prefilled in a source workbook.
5. `result_filename_pattern` for resumable runs MUST contain `{version}`.
6. Result checkpoint naming MUST use `<base>__results__vNNN.xlsx`.
7. Audit naming remains one stable `<base>__audit.jsonl` per run.
8. Image naming follows `image_filename_pattern` and the configured image collision policy.
9. New Pilot workbook creation MUST replace template-specific:
   - job IDs/prompts/reference tokens
   - `output_profile_id`
   - `output_folder_hint`
   - `result_filename_pattern`
   - `audit_filename`
10. Delay range is configured explicitly; current baseline is random `5–12s`.
11. Unknown config keys MUST NOT be added by an AI.
12. If template, protocol, and actual parser/runtime disagree: STOP. Treat as schema drift; do not guess.
13. A protocol/schema change is not complete until code/protocol/template/Pilot fixtures are synchronized.
14. Historical checkpoint/result files MUST NOT be renamed or reused as template sources.

## Create a new Pilot
COPY TEMPLATE → RENAME → EDIT ALLOWED FIELDS → VERIFY CONFIG/NAMING → USE IN EXTENSION

Example:
- Source: `Duc-Auto-ChatGPT-Pilot-06.xlsx`
- Profile: `pilot-06`
- Result pattern: `Duc-Auto-ChatGPT-Pilot-06__results__v{version}.xlsx`
- Audit: `Duc-Auto-ChatGPT-Pilot-06__audit.jsonl`
- `run_id`: absent in source XLSX

## Template versioning
- Breaking workbook schema change => create Template-V2.
- Backward-compatible clarification may update V1 only when current parser remains compatible.
