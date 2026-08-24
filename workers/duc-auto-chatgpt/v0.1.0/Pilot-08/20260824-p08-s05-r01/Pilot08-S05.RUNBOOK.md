# Pilot 8 · S1_05 Dream Train · Runbook

## Status and boundary

- Status: `READY_FOR_OWNER_REVIEW`
- Boundary: `PREPARE_INPUT_ONLY`
- Live Extension/GPT submissions: `0`
- Google Flow runs: `0`
- Google Sheet writes: `0`
- Source: spreadsheet `12YwXGi3zeTt-tyVJtIhtEQQRoVD1vKoGvLOBBlmYOS0`, sheetId `26081725`
- Source snapshot SHA-256: `F31E44F7785F68C5C4A6CAB52FBE708D201C5284DBB8CC919A6E014521BA4D8D`

## Package

- `Pilot08-S05.IMAGE-QUEUE.xlsx`
- `Pilot08-S05.SOURCE.csv`
- `Pilot08-S05.PACKAGE-SPEC.json`
- `references/` with four canonical identity-only files
- Queue: `66 = 6 concepts + 20 source videos × 3 stills`

## New wardrobe lock

Dream Train night travelers: cozy streamlined conductor-inspired layers with crescent and rail piping, secure hems and soft travel-ready shoes; no long coats, dangling watches, loose scarves, luggage or sharp badges.

- Meo: Five-year-old Vietnamese girl; identity-reference-faithful face; twin low pigtails with matte lilac bands; midnight-blue cropped conductor-style jacket with rounded silver piping and concealed snaps over a lilac crew T-shirt; rose-plum tailored mid-thigh shorts with flat crescent pockets; cream ankle socks; lilac-and-midnight Velcro sneakers with silver heel tabs. No copied reference/source clothing, skirt, long coat, scarf or loose accessory.
- Bố: Vietnamese father; identity-reference-faithful face; short black side-parted hair and small black-rimmed rectangular glasses; deep-teal short conductor-inspired cardigan jacket with flat moon-silver piping over a warm-ivory crew T-shirt; plum straight travel trousers; cream-and-rust low-top sneakers with teal soles. No copied reference/source clothing, long coat, dangling watch, scarf, luggage or sharp badge.
- Palette: Meo midnight blue, lilac, rose, silver and cream; Bố deep teal, warm ivory, plum, moon-silver and rust.
- Identity references do not authorize clothing. The written outfit above overrides reference garments and old source wardrobe lines.

## Load sequence after owner approval

1. Load `Pilot08-S05.IMAGE-QUEUE.xlsx` in Duc Auto ChatGPT.
2. Select all four exact files in `references/`.
3. Run `Check Plan` only and confirm 66 jobs, four references, max four references/job, and `Downloads/Duc Auto ChatGPT/Pilot-08/S1-05`.
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
- Visual style: Dreamlike cinematic 3D cartoon night-train fantasy with velvety clouds, lantern glow, rounded carriages, soft moonlit gradients, warm identity-faithful faces, and no photorealism.

