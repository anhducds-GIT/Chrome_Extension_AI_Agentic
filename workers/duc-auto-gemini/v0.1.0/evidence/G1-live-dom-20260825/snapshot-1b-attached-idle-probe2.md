# G1 snapshot 1b — probe v2 run, still attached + idle (Send not yet clicked)

- Captured 2026-08-25 ~06:59 (+07), ~7 min after snapshot 1. Same state: attachment staged, prompt typed, not sent.

New facts on top of snapshot 1:
- **Attachment preview src is `blob:https://gemini.google.com/<uuid>`** — confirms the blob:-scheme trap is real on Gemini (ChatGPT worker's `background.js` download path rejects blob:; keep the gemini v0.1.0 blob→dataURL conversion).
- Preview img carries `alt="attachment"` — extra stable marker.
- Full preview chain: `uploader-file-preview > div.file-preview-container > gem-media-attachment > mat-basic-chip > … > img.gem-attachment-style-img`.
- Zero-state template gallery imgs are all `https://www.gstatic.com/...` with `data-test-id="image-card-image"` inside `image-card` — exclude by any of those three signals.
- `busyScoped` (input-container / chat-window) is false while idle-with-attachment — scoped busy check is clean; upload had settled.
- Still `input[type="file"]` = 0 anywhere; no menuitems open.

Still missing: DURING-generation snapshot (real Stop button) and AFTER-result snapshot (real response container + result img scheme). Owner to click Send and re-run probe v2 twice.
