# Pilot 8 · S1_07 Shadow Trail · Runbook

## Status and boundary

- Status: `READY_FOR_OWNER_REVIEW`
- Boundary: `PREPARE_INPUT_ONLY`
- Live Extension/GPT submissions: `0`
- Google Flow runs: `0`
- Google Sheet writes: `0`
- Source: spreadsheet `12YwXGi3zeTt-tyVJtIhtEQQRoVD1vKoGvLOBBlmYOS0`, sheetId `26081727`
- Source snapshot SHA-256: `803C459691B88DC7A8FC5A9A0A5810592F6C237DF7B2F38C5F4C1BF35ACFE570`

## Package

- `Pilot08-S07.IMAGE-QUEUE.xlsx`
- `Pilot08-S07.SOURCE.csv`
- `Pilot08-S07.PACKAGE-SPEC.json`
- `references/` with four canonical identity-only files
- Queue: `66 = 6 concepts + 20 source videos × 3 stills`

## New wardrobe lock

Shadow Trail twilight explorers: gentle high-contrast trail clothing with reflective-like piping and warm accents for silhouette readability; no eerie costume, hood over face, cape, dangling lantern, bag or loose strap.

- Meo: Five-year-old Vietnamese girl; identity-reference-faithful face; twin low pigtails with matte amber bands; plum short-sleeve trail top with dusty-teal shoulder panels and thin amber piping; cream tailored knee shorts with flat plum pockets; amber ankle socks; dusty-teal-and-plum Velcro sneakers with cream soles. No copied reference/source clothing, hood, cape, dangling lantern or loose strap.
- Bố: Vietnamese father; identity-reference-faithful face; short black side-parted hair and small black-rimmed rectangular glasses; deep-indigo short-sleeve trail overshirt with flat amber piping over a warm-gray crew T-shirt; forest-teal straight trousers; cream-and-rust low-top trail sneakers. No copied reference/source clothing, eerie costume, hood, cape, bag, lantern or loose strap.
- Palette: Meo plum, amber, dusty teal and cream; Bố deep indigo, warm gray, amber, forest teal and rust.
- Identity references do not authorize clothing. The written outfit above overrides reference garments and old source wardrobe lines.

## Load sequence after owner approval

1. Load `Pilot08-S07.IMAGE-QUEUE.xlsx` in Duc Auto ChatGPT.
2. Select all four exact files in `references/`.
3. Run `Check Plan` only and confirm 66 jobs, four references, max four references/job, and `Downloads/Duc Auto ChatGPT/Pilot-08/S1-07`.
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
- Visual style: Gentle cinematic 3D cartoon twilight fantasy with expressive animal-shaped shadows, warm lantern-like rim light, soft non-threatening contrast, rounded environments, identity-faithful faces, and no horror or photorealism.

