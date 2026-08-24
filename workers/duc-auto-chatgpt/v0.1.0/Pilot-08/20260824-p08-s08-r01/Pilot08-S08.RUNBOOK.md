# Pilot 8 · S1_08 Sound Garden · Runbook

## Status and boundary

- Status: `READY_FOR_OWNER_REVIEW`
- Boundary: `PREPARE_INPUT_ONLY`
- Live Extension/GPT submissions: `0`
- Google Flow runs: `0`
- Google Sheet writes: `0`
- Source: spreadsheet `12YwXGi3zeTt-tyVJtIhtEQQRoVD1vKoGvLOBBlmYOS0`, sheetId `26081728`
- Source snapshot SHA-256: `30A4B48F73F58CCDB4086E28B6BB64053516C1A73B12CAFF8CE73DEFF66CA5A2`

## Package

- `Pilot08-S08.IMAGE-QUEUE.xlsx`
- `Pilot08-S08.SOURCE.csv`
- `Pilot08-S08.PACKAGE-SPEC.json`
- `references/` with four canonical identity-only files
- Queue: `66 = 6 concepts + 20 source videos × 3 stills`

## New wardrobe lock

Sound Garden botanical listeners: breathable fitted garden clothing with leaf-and-note seam motifs and clear hands/feet for sound mechanisms; no loose necklace, hanging bell, scarf, bag, gardening tool or dangling vine.

- Meo: Five-year-old Vietnamese girl; identity-reference-faithful face; twin low pigtails with matte poppy-coral bands; mint-leaf short-sleeve top with a small stitched note-shaped chest seam under lilac short overalls with rounded bib, flat leaf pockets and cuffed mid-thigh legs; cream ankle socks; coral-and-mint Velcro sneakers. No copied reference/source clothing, skirt, jewelry, hanging bell or loose vine accessory.
- Bố: Vietnamese father; identity-reference-faithful face; short black side-parted hair and small black-rimmed rectangular glasses; moss-green short-sleeve collarless garden overshirt over a warm-ivory crew T-shirt, flat teal leaf-seam pockets; deep-teal straight trousers; cream-and-terracotta low-top sneakers. No copied reference/source clothing, gardening tool, scarf, bag, hanging bell or dangling vine.
- Palette: Meo mint leaf, poppy coral, lilac and cream; Bố moss green, warm ivory, teal, terracotta and cream.
- Identity references do not authorize clothing. The written outfit above overrides reference garments and old source wardrobe lines.

## Load sequence after owner approval

1. Load `Pilot08-S08.IMAGE-QUEUE.xlsx` in Duc Auto ChatGPT.
2. Select all four exact files in `references/`.
3. Run `Check Plan` only and confirm 66 jobs, four references, max four references/job, and `Downloads/Duc Auto ChatGPT/Pilot-08/S1-08`.
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
- Visual style: Lush child-friendly 3D cartoon botanical fantasy with rounded flowers, visible sound ripples and soft tactile leaves, warm musical lighting, identity-faithful faces, and no photorealism.

