# Pilot 8 · S1_01 Tiny World · Runbook

## Status and boundary

- Status: `READY_FOR_OWNER_REVIEW`
- Boundary: `PREPARE_INPUT_ONLY`
- Live Extension/GPT submissions: `0`
- Google Flow runs: `0`
- Google Sheet writes: `0`
- Source: spreadsheet `12YwXGi3zeTt-tyVJtIhtEQQRoVD1vKoGvLOBBlmYOS0`, sheetId `26081721`
- Source snapshot SHA-256: `94FF7B20A8BA1DD209872E9CF2127793FBD5561F2017D00151DD9124BB7848EB`

## Package

- `Pilot08-S01-R03.IMAGE-QUEUE.xlsx` — authoritative repaired queue
- `Pilot08-S01.IMAGE-QUEUE.xlsx` — superseded revision retained because it was locked by another process during repair; do not load it for this run
- `Pilot08-S01.SOURCE.csv`
- `Pilot08-S01.PACKAGE-SPEC.json`
- `references/` with four canonical identity-only files
- Queue: `66 = 6 concepts + 20 source videos × 3 stills`

## New wardrobe lock

Tiny World maker-explorer: fitted, movement-friendly clothing for safely operating oversized soft toy mechanisms; flat pockets and closed fasteners; no loose straps, scarves, bags, tools or dangling accessories.

- Meo: Five-year-old Vietnamese girl; identity-reference-faithful face; twin low pigtails with matte coral fabric bands; coral-red short-sleeve crew-neck T-shirt under sea-green short utility overalls with rounded bib, two flat stitched patch pockets, closed side fasteners and cuffed mid-thigh legs; sunflower-yellow ankle socks; cream-and-teal Velcro low-top sneakers with flexible gum soles. No copied reference/source clothing and no dangling accessory.
- Bố: Vietnamese father; identity-reference-faithful face; short black side-parted hair; small black-rimmed rectangular glasses; warm-ochre short-sleeve utility overshirt buttoned over an ivory crew-neck T-shirt, two flat square chest pockets; deep-teal straight utility trousers with reinforced knee panels and flat side pockets; cream-and-rust low-top sneakers with flexible gum soles. No copied reference/source clothing, loose strap, scarf, tie, bag or tool.
- Palette: Meo coral red, sea green, sunflower yellow and cream; Bố warm ochre, ivory, deep teal, rust and cream.
- Identity references do not authorize clothing. The written outfit above overrides reference garments and old source wardrobe lines.

## Load sequence after owner approval

1. Load `Pilot08-S01-R03.IMAGE-QUEUE.xlsx` in Duc Auto ChatGPT.
2. Select all four exact files in `references/`.
3. Run `Check Plan` only and confirm 66 jobs, four references, max four references/job, and `Downloads/Duc Auto ChatGPT/Pilot-08/S1-01`.
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
- Visual style: Polished cinematic 3D cartoon concept art for a warm child-friendly animated series, with rounded shapes, soft tactile materials, gentle global illumination, warm color harmony, expressive identity-faithful faces, and no photorealism.
