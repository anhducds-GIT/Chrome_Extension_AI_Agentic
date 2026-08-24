# Pilot 08 S1_01 Pre-repair Audit

## Verdict

`REVISE`

The existing S1_01 package is structurally runner-compatible and its queue validates at 66 jobs, but the reusable process is not yet safe for the complete S1_01-S1_11 range.

## Verified baseline

- Live tab: `S1_01 Tiny World`, sheet ID `26081721`.
- Local snapshot: 20 source videos, 23 columns, 20 unique IDs, A/B topology 10/10.
- Live/local prompt samples match for `I001-S1-01A`, `I001-S1-06A`, and `I001-S1-10B`.
- Source snapshot SHA-256: `94FF7B20A8BA1DD209872E9CF2127793FBD5561F2017D00151DD9124BB7848EB`.
- Existing queue: 6 concept jobs + 60 storyboard jobs = 66 jobs.
- Existing package validator: PASS.
- Existing wardrobe validator: PASS.
- Current runner smoke tests for run-plan/config snapshot: PASS.
- Current runner contract accepts the package keys and `reference_images` format.
- Canonical references exist; dimensions and SHA-256 are recorded.
- The S1_01 wardrobe already follows the owner's new-clothing direction.

## Required revisions

1. Replace the S1_01-hardcoded package builder with a tab-parameterized builder.
2. Support both the standard `0–2 / 2–7 / 7–9 / 9–10` timing schema and the sanctioned S1_08 alternate `0–2 / 2–5 / 5–8 / 8–10` schema.
3. Change the negative rule from “no extra characters” to “no unapproved extra characters”; repeat source-authorized supporting-character locks where present.
4. Make visual style a per-tab lock so S1_11 can use original anime-inspired 2D cel shading without copyrighted characters or franchises.
5. Make new full wardrobe design per tab mandatory; identity reference clothing must be ignored.
6. Add explicit source/ref hashes, live snapshot time, source-timing schema, supporting-character policy, and owner override records to the package contract.

## Repair boundary

Keep the verified S1_01 story actions and source snapshot unchanged. Repair provenance, genericity, policy wording, reproducibility, and workbook evidence only.

