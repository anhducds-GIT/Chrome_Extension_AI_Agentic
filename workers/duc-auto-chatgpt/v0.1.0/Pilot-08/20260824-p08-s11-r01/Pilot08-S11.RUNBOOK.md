# Pilot 8 · S1_11 Anime Princess Portal · Runbook

## Status and boundary

- Status: `READY_FOR_OWNER_REVIEW`
- Boundary: `PREPARE_INPUT_ONLY`
- Live Extension/GPT submissions: `0`
- Google Flow runs: `0`
- Google Sheet writes: `0`
- Source: spreadsheet `12YwXGi3zeTt-tyVJtIhtEQQRoVD1vKoGvLOBBlmYOS0`, sheetId `26081731`
- Source snapshot SHA-256: `2E0B5FD870FDA578906E7D8AEA348AC7BF1A2F4B7E41B943C0F258ED087B6B59`

## Package

- `Pilot08-S11.IMAGE-QUEUE.xlsx`
- `Pilot08-S11.SOURCE.csv`
- `Pilot08-S11.PACKAGE-SPEC.json`
- `references/` with four canonical identity-only files
- Queue: `66 = 6 concepts + 20 source videos × 3 stills`

## New wardrobe lock

Original anime portal-adventurers: clean cel-readable color blocks, fitted page-travel layers and secure flat closures distinct from Princess Liora; no franchise cues, cape, sailor uniform, school emblem, weapon, bag or dangling ribbon.

- Meo: Five-year-old Vietnamese girl; identity-reference-faithful face translated into original clean 2D cel shading; twin low pigtails with matte cherry-red bands; turquoise short-sleeve portal jacket with ivory rounded collar and concealed flat snaps over a golden-yellow crew top; cherry-red tailored mid-thigh shorts with flat turquoise edge panels; ivory ankle socks; turquoise-and-cherry Velcro sneakers. No copied reference/source clothing, franchise cue, cape, sailor uniform, school emblem, weapon or dangling ribbon.
- Bố: Vietnamese father; identity-reference-faithful face translated into original clean 2D cel shading; short black side-parted hair and small black-rimmed rectangular glasses; deep-cobalt short-sleeve portal overshirt with copper piping over a warm-ivory crew T-shirt; charcoal-teal straight trousers with flat cobalt knee panels; white-and-copper low-top sneakers. No copied reference/source clothing, franchise cue, cape, uniform, emblem, weapon, bag or dangling ribbon.
- Palette: Meo cherry red, turquoise, ivory and golden yellow; Bố deep cobalt, warm ivory, charcoal teal, copper and white.
- Identity references do not authorize clothing. The written outfit above overrides reference garments and old source wardrobe lines.

## Load sequence after owner approval

1. Load `Pilot08-S11.IMAGE-QUEUE.xlsx` in Duc Auto ChatGPT.
2. Select all four exact files in `references/`.
3. Run `Check Plan` only and confirm 66 jobs, four references, max four references/job, and `Downloads/Duc Auto ChatGPT/Pilot-08/S1-11`.
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
- Visual style: Original anime-inspired 2D fantasy with clean cel shading, crisp manga-inspired linework, expressive identity-faithful faces, controlled screen-tone accents and readable paper-panel depth; no existing copyrighted character, franchise imitation or photorealism.

