# V0 Trial Pilot — Frozen Source Baseline

Status: **FROZEN BASELINE · CORE BROWSER RUNTIME PASS · NOT REFACTORED**

## Canonical source snapshot

- Repository: `anhducds-GIT/Chrome_Extension_AI_Agentic`
- Branch: `main`
- Source path: `pilots/v0-trial/source/`
- Baseline code commit: `91537d0d701679d67f82e10eef3c82afb3d695a2`
- Source package provenance: `duc-auto-chatgpt-v0.zip`
- Source package SHA-256: `93d13b266ee5d06dd776f2570f19c8893d5589b15b8e16c48f6003c96e8f16ed`

The code under the baseline commit is the exact V0 Trial Pilot source archived from the package used for the pilot. No refactor, feature addition, selector change, or logic change is authorized as part of this archive step.

## Canonical source files and SHA-256

- `manifest.json` — `365ebb0bf984a8f505f4e1035a9d1f6e292e6540f97057916131fef5a3bfa7c2`
- `background.js` — `f874ea30c6a8846ad08eb4b53768e893c3a02aa8d5963a4bc9d91a1630827bd9`
- `content.js` — `a9eaab0b98838f31f209d6ddb4dc9bc11db3cffa938acefc49b3c07499f5e729`
- `sidepanel.html` — `948f141b9b3512d58bd458cd2d4cb6e0241e969840cef91d5310fcbb5bf4c3e6`
- `sidepanel.css` — `4f73794b85fcd0c5cb84fdb3a95d19df62a4ba20809c40e162c747e2d6f21c85`
- `sidepanel.js` — `85b6b19ce2cc5437878aae082b20ce4c2135dab4fb7088dc68edd061a15ec4b9`

## Verification state

- Repository source directory verified to contain all 6 canonical implementation files.
- Static validation re-run on the archived package: `background.js`, `content.js`, and `sidepanel.js` pass `node --check`; `manifest.json` parses successfully.
- Browser pilot evidence is recorded in `TEST_REPORT.md` and `TEST_PROMPTS.md`.
- Canonical three-step browser sequence passed in order: `TEST 01 PASS` → `84` → `TEST 03 COMPLETE`.

## Audit rule

Claude and Codex should audit the baseline commit above as immutable evidence. Any future implementation change must occur outside this frozen snapshot or in a successor version/branch; do not silently edit this baseline and still call it V0 Trial PASS.
