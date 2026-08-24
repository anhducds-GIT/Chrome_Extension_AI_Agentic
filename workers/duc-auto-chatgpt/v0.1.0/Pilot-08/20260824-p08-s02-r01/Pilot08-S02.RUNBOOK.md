# Pilot 8 · S1_02 Magic Inventor · Runbook

## Status and boundary

- Status: `READY_FOR_OWNER_REVIEW`
- Boundary: `PREPARE_INPUT_ONLY`
- Live Extension/GPT submissions: `0`
- Google Flow runs: `0`
- Google Sheet writes: `0`
- Source: spreadsheet `12YwXGi3zeTt-tyVJtIhtEQQRoVD1vKoGvLOBBlmYOS0`, sheetId `26081722`
- Source snapshot SHA-256: `44E685BD43252B4196A31737CD4847EAEC3BB61D2E7A4A0552F86FD8FD0A333A`

## Package

- `Pilot08-S02.IMAGE-QUEUE.xlsx`
- `Pilot08-S02.SOURCE.csv`
- `Pilot08-S02.PACKAGE-SPEC.json`
- `references/` with four canonical identity-only files
- Queue: `66 = 6 concepts + 20 source videos × 3 stills`

## New wardrobe lock

Magic Inventor workshop-makers: compact rounded workwear with flat pockets and secure closures for tabletop invention tests; no apron ties, loose cords, tools, bags or sharp hardware.

- Meo: Five-year-old Vietnamese girl; identity-reference-faithful face; twin low pigtails with matte tangerine bands; apricot short-sleeve crew T-shirt under a turquoise sleeveless maker romper with rounded bib seam, fitted waist, two flat stitched gear-shaped pockets and cuffed mid-thigh shorts; sunflower ankle socks; cream-and-turquoise Velcro sneakers with mustard heel tabs and gum soles. No copied reference/source clothing or loose accessory.
- Bố: Vietnamese father; identity-reference-faithful face; short black side-parted hair and small black-rimmed rectangular glasses; burnt-orange short-sleeve collarless snap-front workshop overshirt over an ivory crew T-shirt, flat rectangular chest pockets; deep-pine straight work trousers with flat knee panels; cream-and-mustard low-top sneakers with burnt-orange heel tabs. No copied reference/source clothing, apron, loose cord, bag or tool.
- Palette: Meo apricot, turquoise, sunflower and cream; Bố burnt orange, ivory, deep pine, mustard and cream.
- Identity references do not authorize clothing. The written outfit above overrides reference garments and old source wardrobe lines.

## Load sequence after owner approval

1. Load `Pilot08-S02.IMAGE-QUEUE.xlsx` in Duc Auto ChatGPT.
2. Select all four exact files in `references/`.
3. Run `Check Plan` only and confirm 66 jobs, four references, max four references/job, and `Downloads/Duc Auto ChatGPT/Pilot-08/S1-02`.
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
- Visual style: Polished warm 3D cartoon workshop fantasy with rounded wooden forms, tactile paper-and-foam materials, soft magical pulses, cinematic yet child-safe lighting, identity-faithful faces, and no photorealism.

