# Pilot 08 S1_01-S1_11 Master Runbook

- Run: `20260824-p08-s01-s11-r01`
- Boundary: `PREPARE_INPUT_ONLY`
- Queue: `726` jobs = `66` character concepts + `660` storyboard stills
- Live actions completed by preparation run: `0`

## Owner load order

Run one package at a time and preserve this order:

| Order | Source tab | Package | Authoritative workbook | Reference folder |
| --- | --- | --- | --- | --- |
| 1 | S1_01 Tiny World | `20260823-p08-s01-r01` | `Pilot08-S01-R03.IMAGE-QUEUE.xlsx` | `references/` |
| 2 | S1_02 Magic Inventor | `20260824-p08-s02-r01` | `Pilot08-S02.IMAGE-QUEUE.xlsx` | `references/` |
| 3 | S1_03 Living Storybook | `20260824-p08-s03-r01` | `Pilot08-S03.IMAGE-QUEUE.xlsx` | `references/` |
| 4 | S1_04 Impossible Missions | `20260824-p08-s04-r01` | `Pilot08-S04.IMAGE-QUEUE.xlsx` | `references/` |
| 5 | S1_05 Dream Train | `20260824-p08-s05-r01` | `Pilot08-S05.IMAGE-QUEUE.xlsx` | `references/` |
| 6 | S1_06 Zero Gravity Picnic | `20260824-p08-s06-r01` | `Pilot08-S06.IMAGE-QUEUE.xlsx` | `references/` |
| 7 | S1_07 Shadow Trail | `20260824-p08-s07-r01` | `Pilot08-S07.IMAGE-QUEUE.xlsx` | `references/` |
| 8 | S1_08 Sound Garden | `20260824-p08-s08-r01` | `Pilot08-S08.IMAGE-QUEUE.xlsx` | `references/` |
| 9 | S1_09 Paper City | `20260824-p08-s09-r01` | `Pilot08-S09.IMAGE-QUEUE.xlsx` | `references/` |
| 10 | S1_10 Moonlight Painter | `20260824-p08-s10-r01` | `Pilot08-S10.IMAGE-QUEUE.xlsx` | `references/` |
| 11 | S1_11 Anime Princess Portal | `20260824-p08-s11-r01` | `Pilot08-S11.IMAGE-QUEUE.xlsx` | `references/` |

The old `Pilot08-S01.IMAGE-QUEUE.xlsx` is preserved because another process locked it during repair. Do not load it; S01 R03 above is authoritative.

## Per-package preflight

1. Open the package's `Pilot08-SNN.RUNBOOK.md` and confirm the source tab, source hash and new wardrobe.
2. Load the authoritative XLSX into Duc Auto ChatGPT.
3. Attach the four exact files from that package's `references/` folder. Do not substitute the originals or files from another tab, even though the identity pixels are canonical.
4. Run `Check Plan` only. Confirm `66` jobs, `4` references and the output folder `Duc Auto ChatGPT/Pilot-08/S1-NN`.
5. Confirm the first six jobs are character concepts and the remaining sixty jobs are three storyboard stills for each of twenty source videos.
6. Wait for separate owner authorization before any live submission.

## Runtime invariants

- Run one prompt at a time in workbook order.
- Each prompt creates exactly one image.
- Reference images control identity only. The written new tab wardrobe is clothing authority.
- Preserve source-authorized supporting characters only where the package spec maps them.
- Stop on CAPTCHA, security warning, missing reference, ambiguous submission state or persistence failure.
- Do not silently skip, reorder or mark a job complete without accepted output evidence.

## Evidence

- Package inventory and hashes: `Pilot08-S01-S11.PACKAGE-INDEX.json`
- Aggregate internal QC: `Pilot08-S01-S11.FINAL-QC.json`
- Orchestrator phase record: `Pilot08-S01-S11.ORCHESTRATOR-LEDGER.md`
- Rendered previews and inspection evidence: `../outputs/20260824-p08-s01-s11-r01/.work/`
