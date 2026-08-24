# Pilot 8 · S1_10 Moonlight Painter · Runbook

## Status and boundary

- Status: `READY_FOR_OWNER_REVIEW`
- Boundary: `PREPARE_INPUT_ONLY`
- Live Extension/GPT submissions: `0`
- Google Flow runs: `0`
- Google Sheet writes: `0`
- Source: spreadsheet `12YwXGi3zeTt-tyVJtIhtEQQRoVD1vKoGvLOBBlmYOS0`, sheetId `26081730`
- Source snapshot SHA-256: `AE8F2EEA50AE3752449B6955D32970F1751696E9B483FE33EC90DE7A588F9F99`

## Package

- `Pilot08-S10.IMAGE-QUEUE.xlsx`
- `Pilot08-S10.SOURCE.csv`
- `Pilot08-S10.PACKAGE-SPEC.json`
- `references/` with four canonical identity-only files
- Queue: `66 = 6 concepts + 20 source videos × 3 stills`

## New wardrobe lock

Moonlight Painter studio explorers: secure smock-inspired layers with flat side tabs and luminous piping for paint-and-light mechanisms; no loose apron ties, brush loops, scarf, bag, wet paint container or dangling tools.

- Meo: Five-year-old Vietnamese girl; identity-reference-faithful face; twin low pigtails with matte lavender bands; indigo short-sleeve smock-inspired top with moon-silver piping and closed flat side tabs over lavender fitted mid-thigh shorts; cream ankle socks; silver-and-indigo Velcro sneakers with lavender soles. No copied reference/source clothing, skirt, apron tie, brush loop, bag or dangling tool.
- Bố: Vietnamese father; identity-reference-faithful face; short black side-parted hair and small black-rimmed rectangular glasses; midnight-teal short-sleeve studio overshirt with flat silver edge piping over a warm-ivory crew T-shirt; plum straight trousers with closed flat pockets; cream-and-rust low-top sneakers. No copied reference/source clothing, apron tie, scarf, paint container, bag or dangling tool.
- Palette: Meo indigo, moon-silver, lavender and cream; Bố midnight teal, warm ivory, silver, plum and rust.
- Identity references do not authorize clothing. The written outfit above overrides reference garments and old source wardrobe lines.

## Load sequence after owner approval

1. Load `Pilot08-S10.IMAGE-QUEUE.xlsx` in Duc Auto ChatGPT.
2. Select all four exact files in `references/`.
3. Run `Check Plan` only and confirm 66 jobs, four references, max four references/job, and `Downloads/Duc Auto ChatGPT/Pilot-08/S1-10`.
4. Review concept jobs 1–6 and the first/middle/last storyboard prompts.
5. Start a sequential live run only after separate owner approval; do not reorder jobs.

## Safety and recovery

Stop immediately for CAPTCHA, unusual-activity/security warning, unresolved or mismatched reference, ambiguous submission state, or output-persistence failure. Never resend across an ambiguous submitted boundary. Do not start from a Result/checkpoint workbook unless using the runner's explicit continuation flow.

## Source and prompt rules

- Preserve exact source story, camera, mechanism and end state.
- Use the detected complete timing schema; never mix partial schemas.
- Keep Part A unresolved and Part B resolved.
- Preserve source-authorized named supporting characters only; no unapproved extra characters.
- Every job requests one image, contains no at-sign character, and prohibits text/collage/duplicates.
- Visual style: Luminous cinematic 3D cartoon moon-painting fantasy with soft indigo nights, silver light strokes, rounded safe studio props, warm expressive identity-faithful faces, and no photorealism.

