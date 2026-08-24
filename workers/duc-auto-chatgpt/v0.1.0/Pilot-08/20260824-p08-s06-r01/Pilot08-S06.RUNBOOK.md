# Pilot 8 · S1_06 Zero Gravity Picnic · Runbook

## Status and boundary

- Status: `READY_FOR_OWNER_REVIEW`
- Boundary: `PREPARE_INPUT_ONLY`
- Live Extension/GPT submissions: `0`
- Google Flow runs: `0`
- Google Sheet writes: `0`
- Source: spreadsheet `12YwXGi3zeTt-tyVJtIhtEQQRoVD1vKoGvLOBBlmYOS0`, sheetId `26081726`
- Source snapshot SHA-256: `4392D9E346EDBF3C62E4112171490883AA89BF06C9BBF56F8B278850686345E3`

## Package

- `Pilot08-S06.IMAGE-QUEUE.xlsx`
- `Pilot08-S06.SOURCE.csv`
- `Pilot08-S06.PACKAGE-SPEC.json`
- `references/` with four canonical identity-only files
- Queue: `66 = 6 concepts + 20 source videos × 3 stills`

## New wardrobe lock

Zero Gravity Picnic anti-float outfits: close-fitting stretch layers, secure zips, flat pockets and Velcro footwear so every hem stays controlled in floating scenes; no skirt, open jacket, scarf, loose lace, bag or dangling utensil.

- Meo: Five-year-old Vietnamese girl; identity-reference-faithful face; twin low pigtails with compact matte coral bands; mint fitted short-sleeve raglan top under a coral zip-front short flight romper with cobalt shoulder panels, flat sealed hip pockets and fitted mid-thigh legs; cream ankle socks; cobalt-and-mint Velcro sneakers with coral soles. No copied reference/source clothing, skirt, open layer, loose lace or dangling accessory.
- Bố: Vietnamese father; identity-reference-faithful face; short black side-parted hair and small black-rimmed rectangular glasses; cobalt fitted short-sleeve zip overshirt over a warm-gray crew T-shirt, flat deep-teal chest panels; deep-teal tapered stretch trousers with closed ankle cuffs; cream-and-coral Velcro low-top sneakers. No copied reference/source clothing, open hem, scarf, bag, loose lace or dangling utensil.
- Palette: Meo mint, coral, cobalt and cream; Bố cobalt, warm gray, deep teal, coral and cream.
- Identity references do not authorize clothing. The written outfit above overrides reference garments and old source wardrobe lines.

## Load sequence after owner approval

1. Load `Pilot08-S06.IMAGE-QUEUE.xlsx` in Duc Auto ChatGPT.
2. Select all four exact files in `references/`.
3. Run `Check Plan` only and confirm 66 jobs, four references, max four references/job, and `Downloads/Duc Auto ChatGPT/Pilot-08/S1-06`.
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
- Visual style: Bright cinematic 3D cartoon zero-gravity fantasy with soft floating picnic objects, clear depth and contact cues, rounded child-safe forms, warm diffuse lighting, identity-faithful faces, and no photorealism.

