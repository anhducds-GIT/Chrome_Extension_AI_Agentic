# Pilot 8 · S1_09 Paper City · Runbook

## Status and boundary

- Status: `READY_FOR_OWNER_REVIEW`
- Boundary: `PREPARE_INPUT_ONLY`
- Live Extension/GPT submissions: `0`
- Google Flow runs: `0`
- Google Sheet writes: `0`
- Source: spreadsheet `12YwXGi3zeTt-tyVJtIhtEQQRoVD1vKoGvLOBBlmYOS0`, sheetId `26081729`
- Source snapshot SHA-256: `EAE5F3918317DEE8CC85EA3F7A5B45A83DF7C3C7D71EED0FDFDC1B9C85E5F08E`

## Package

- `Pilot08-S09.IMAGE-QUEUE.xlsx`
- `Pilot08-S09.SOURCE.csv`
- `Pilot08-S09.PACKAGE-SPEC.json`
- `references/` with four canonical identity-only files
- Queue: `66 = 6 concepts + 20 source videos × 3 stills`

## New wardrobe lock

Paper City urban folders: crisp geometric color blocks, folded-edge panels and flexible fitted construction that reads against papercraft architecture; no sharp paper edges, long flap, tie, bag, loose belt or dangling tab.

- Meo: Five-year-old Vietnamese girl; identity-reference-faithful face; twin low pigtails with matte coral geometric bands; cyan short-sleeve crew top under a white folded-panel romper with coral edge piping, lemon flat square pockets and cuffed mid-thigh shorts; lemon ankle socks; white-and-cyan Velcro sneakers with coral soles. No copied reference/source clothing, skirt, sharp fold, loose paper flap or dangling tab.
- Bố: Vietnamese father; identity-reference-faithful face; short black side-parted hair and small black-rimmed rectangular glasses; navy short-sleeve geometric overshirt with brick-red folded-look chest panels over a warm-white crew T-shirt; kraft-tan straight trousers with cyan flat side panels; white-and-brick low-top sneakers. No copied reference/source clothing, tie, bag, loose belt, sharp fold or dangling tab.
- Palette: Meo cyan, coral, lemon and white; Bố navy, warm white, brick red, cyan and kraft tan.
- Identity references do not authorize clothing. The written outfit above overrides reference garments and old source wardrobe lines.

## Load sequence after owner approval

1. Load `Pilot08-S09.IMAGE-QUEUE.xlsx` in Duc Auto ChatGPT.
2. Select all four exact files in `references/`.
3. Run `Check Plan` only and confirm 66 jobs, four references, max four references/job, and `Downloads/Duc Auto ChatGPT/Pilot-08/S1-09`.
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
- Visual style: Graphic cinematic 3D papercraft cartoon world with clean folded geometry, soft safe paper edges, saturated color blocks, readable mechanisms, identity-faithful faces, and no photorealism.

