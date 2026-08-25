# G1 snapshot 4 — "Upload & tools" menu OPEN (no file picked), /app conversation surface

- Captured 2026-08-25 ~07:12 (+07) via probe v2 with the plus/upload menu popped open.

## Finding 1 — transient file inputs DO appear when the menu opens

Two `input[type="file"]` (multiple, connected) exist only while the menu is open:
- inside `images-files-uploader[uploader-images-files-button-advanced] > div.upload-menu-item` (the "Files" row)
- inside `uploader > … > mat-card.card-container` within the `cdk-overlay-container` (menu overlay)

So the v0.1.0 `exposeFileInput` strategy is structurally right, with corrections:
- ONE click (the "Upload & tools" button) is enough — the input exists as soon as the menu opens;
  no second menu-item click required to materialize it.
- The menu rows are NOT `[role="menuitem"]` (menuitems probe = 0) — they are buttons with visible text
  ("Files", "Avatar", "Drive", "Photos", "Notebooks") inside `mat-card` in a CDK overlay. The old
  v0.1.0 menu-item lookup regex would have found the "Files" button anyway, but the input-first path
  makes that click unnecessary.

## Finding 2 — TRAP: the accept list contains NO image extensions

`accept=".txt,.pdf,.doc,…,.xlsx,.zip"` — documents/code/data only; no .png/.jpg/.webp — despite the
component being named `images-files-uploader`, and despite the owner having successfully attached a PNG
by hand earlier (on the /images surface). Interpretation options (to verify live via the extension's own
diagnostics, not more owner probes):
- accept is a picker-side UI filter only; programmatic `input.files = DataTransfer.files` + change event
  may be processed fine regardless (accept never validates programmatic assignment);
- or the image path differs on the /images surface (this probe ran on /app), or images arrive via the
  drop pipeline (`file-drop-indicator` exists at all times).

Adapter decision: primary = open menu → assign files to the transient input → change event → close menu;
fallback = synthetic `drop` (DataTransfer) on the composer/`file-drop-indicator`. Instrument both with
the attachment fingerprint so the first live run tells us which path Gemini honored.

## Bonus facts

- Menu components: `images-files-uploader`, `drive-uploader`, `photos-uploader`, `notebooks-import`,
  `toolbox-drawer-item`, `personalization-toggle` (menu also hosts tool toggles — do NOT blind-click rows).
- Second generation in the conversation confirms result-image shape is stable: both outputs are 708×708,
  `https://lh3.googleusercontent.com/gg-dl/…`, alt ", AI generated".
- G1 capture set is now complete: idle+attached (1, 1b), during generation (2), after result (3), upload
  menu open (4).
